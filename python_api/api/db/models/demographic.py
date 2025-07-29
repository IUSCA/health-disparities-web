from api.db import get_connection


def get_demographics_by_cohort(cohort_id: int) -> list[dict]:
    """
    For each subject in the cohort, get the demographic information.

    Number of rows in the result set is equal to the number of subjects in the cohort.
    Each dict in the result set has the following keys:
    - sid: int
    - age:
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT d.*, (select count(*) from encounter e where e.sid = c.sid) as num_encounters
            FROM cohort c
            JOIN demographic d ON d.sid = c.sid 
            WHERE c.cohort_definition_id = ?
            """,
            (cohort_id,),
        )
        return [dict(row) for row in cursor]
    finally:
        conn.close()
