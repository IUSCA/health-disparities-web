import json

from api.db import get_connection


def create(cohort_id: int, intervention_id: int, result: dict, analysis_type: str) -> int:
    conn = get_connection()
    with conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO "analysis_result" (cohort_id, intervention_id, result, analysis_type) VALUES (?, ?, ?, ?)
            RETURNING id
            """,
            (cohort_id, intervention_id, json.dumps(result), analysis_type),
        )
        result_id = cursor.fetchone()[0]
        return result_id


def fetch_all(cohort_id=None, intervention_id=None, analysis_type=None):
    conn = get_connection()
    with conn:
        cursor = conn.cursor()

        # Start building the base query
        query = "SELECT * FROM analysis_result WHERE 1=1"  # Always true, useful to append conditions

        # Collect the filter values and corresponding placeholders
        filters = []

        if cohort_id is not None:
            query += " AND cohort_id = ?"
            filters.append(cohort_id)

        if intervention_id is not None:
            query += " AND intervention_id = ?"
            filters.append(intervention_id)

        if analysis_type is not None:
            query += " AND analysis_type = ?"
            filters.append(analysis_type)

        # Execute the query with the dynamically created filters
        cursor.execute(query, tuple(filters))

        # Fetch the result
        rows = cursor.fetchall()  # Changed to fetchall to retrieve all results, not just the first one.
        cursor.close()
        results = []
        for row in rows:
            r = dict(row)
            try:
                r['result'] = json.loads(r['result'])
            except json.JSONDecodeError:
                r['result_str'] = r['result']
                r['result'] = None
            results.append(r)
        return results


def fetch_one(result_id: int):
    conn = get_connection()
    with conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT * FROM "analysis_result" WHERE id = ?
            """,
            (result_id,)
        )
        row = cursor.fetchone()
        if row is None:
            return None
        r = dict(row)
        try:
            r['result'] = json.loads(r['result'])
        except json.JSONDecodeError:
            r['result_str'] = r['result']
            r['result'] = None
        return r
