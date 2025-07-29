from api.db import get_connection


def search_name(name: str) -> list[dict]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
                SELECT c.id, c.name, c.code, c.code_system, COALESCE(cc.participant_count, 0) as participant_count
                FROM concept c
                LEFT JOIN concept_counts cc ON c.id = cc.concept_id
                WHERE 
                    lower(c.name) like lower('%' || ? || '%')  AND 
                    c.type = 'procedure'
                ORDER BY COALESCE(cc.participant_count, 0) DESC
                LIMIT 500
            """,
            (name,),
        )
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()
