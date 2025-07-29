import json
from typing import Optional

from api.db import get_connection


def create_cohort(name: str, query: dict, sids: list[int], description: str = "") -> dict:
    conn = get_connection()
    with conn:
        cursor = conn.cursor()
        # create cohort definition
        date_iso_str = cursor.execute("SELECT datetime('now')").fetchone()[0]
        cursor.execute(
            "INSERT INTO cohort_definition (name, description, query, created_at) VALUES (?, ?, ?, ?) RETURNING id",
            (name, description, json.dumps(query), date_iso_str),
        )
        # fetch the cohort definition id
        cohort_id = cursor.fetchone()[0]

        # create cohort subject associations
        cursor.executemany(
            "INSERT INTO cohort (cohort_definition_id, sid) VALUES (?, ?)",
            [(cohort_id, sid) for sid in sids],
        )
        cursor.close()
        return {
            "id": cohort_id,
            "name": name,
            "description": description,
            "query": query,
            "sids": sids,
        }


def get_cohort(cohort_id: int) -> dict:
    conn = get_connection()
    with conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM cohort_definition WHERE id = ?",
            (cohort_id,),
        )
        cohort = dict(cursor.fetchone())
        cursor.execute(
            "SELECT sid FROM cohort WHERE cohort_definition_id = ?",
            (cohort_id,),
        )
        sids = [row['sid'] for row in cursor.fetchall()]
        cursor.close()

        cohort['query'] = json.loads(cohort['query'])
        cohort['sids'] = sids
        return cohort 

def fetch_all(sort_by: str, sort_order: str, search_query: Optional[str] = None):
    assert sort_by in ['name', 'created_at']
    assert sort_order in ['asc', 'desc']
    
    conn = get_connection()
    with conn:
        cursor = conn.cursor()
        query = f"""
            SELECT *, (SELECT COUNT(*) FROM "cohort" WHERE cohort_definition_id = "cohort_definition".id) AS size 
            FROM "cohort_definition"
        """
        params = []

        if search_query:
            query += " WHERE upper(name) LIKE ? OR upper(description) LIKE ?"
            params.extend([f"%{search_query.upper()}%", f"%{search_query.upper()}%"])

        query += f" ORDER BY {sort_by} {sort_order}"
        cursor.execute(query, params)
        cohorts = [dict(row) for row in cursor.fetchall()]
        cursor.close()
        for cohort in cohorts:
          try:
            cohort['query'] = json.loads(cohort['query'])
          except json.JSONDecodeError:
            cohort['query_str'] = cohort['query']
            cohort['query'] = None
        return cohorts