from api.db import get_connection


def search_name(name: str) -> list[dict]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
                SELECT id, name, code, code_system 
                FROM concept 
                WHERE 
                    lower(name) like lower('%' || ? || '%')  AND 
                    type = 'procedure'
            """,
            (name,),
        )
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()
