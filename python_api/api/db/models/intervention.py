from api.db import get_connection


def create(name, category, concept_ids, description=None):
    conn = get_connection()
    with conn:
        cursor = conn.cursor()
        date_iso_str = cursor.execute("SELECT datetime('now')").fetchone()[0]
        cursor.execute(
            """
            INSERT INTO "intervention" (name, description, category, created_at) VALUES (?, ?, ?, ?) RETURNING id
            """,
            (name, description, category, date_iso_str),
        )
        # fetch the intervention id of the newly created intervention.
        # fethchone() returns a tuple ex: (1,); so we need to get the first element of the tuple.
        intervention_id = cursor.fetchone()[0]

        cursor.executemany(
            """
            INSERT INTO "intervention_concept" (intervention_id, concept_id) VALUES (?, ?)
            """,
            [(intervention_id, cid) for cid in concept_ids]
        )
        cursor.close()
        return intervention_id


def fetch_one(intervention_id):
    conn = get_connection()
    with conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT * FROM "intervention" WHERE id = ?
            """,
            (intervention_id,)
        )
        row = cursor.fetchone()
        if row is None:
            return None
        intervention = dict(row)

        cursor.execute(
            """
            SELECT c.* 
            FROM "intervention_concept" ic
            JOIN "concept" c ON ic.concept_id = c.id
            WHERE intervention_id = ?
            """,
            (intervention_id,)
        )
        concepts = [dict(row) for row in cursor.fetchall()]
        intervention['concepts'] = concepts
        return intervention


def fetch_all(search_query=None, category=None, sort_by='created_at', sort_order='desc'):
    conn = get_connection()
    with conn:
        cursor = conn.cursor()
        query = """
            SELECT *, (SELECT COUNT(*) FROM "intervention_concept" WHERE intervention_id = "intervention".id) AS concept_count 
            FROM "intervention"
        """
        params = []

        if search_query and category:
            query += " WHERE (upper(name) LIKE ? OR upper(description) LIKE ?) AND category = ?"
            params.extend([f"%{search_query.upper()}%", f"%{search_query.upper()}%", category])
        elif search_query:
            query += " WHERE upper(name) LIKE ? OR upper(description) LIKE ?"
            params.extend([f"%{search_query.upper()}%", f"%{search_query.upper()}%"])
        elif category:
            query += " WHERE category = ?"
            params.append(category)

        query += f" ORDER BY {sort_by} {sort_order}"

        cursor.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]
