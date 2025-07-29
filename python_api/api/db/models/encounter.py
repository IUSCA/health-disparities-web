from api.db import get_connection


def get_counts_by_race_ethnicity(cohort_id) -> list[dict]:
    """
    For each subject in the cohort, get the number of emergency, inpatient, and outpatient encounters and the subject's
    race_ethnicity.

    Number of rows in the result set is equal to the number of subjects in the cohort.
    Each dict in the result set has the following keys:
    - race_ethnicity: str
    - sid: int
    - emergency: int
    - inpatient: int
    - outpatient: int

    :param cohort_id:
    :return:
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            WITH encounter_counts AS (
                SELECT e.sid, 
                    SUM(CASE WHEN e.TYPE = 'Emergency' THEN 1 ELSE 0 END) AS emergency,
                    SUM(CASE WHEN e.TYPE = 'Inpatient' THEN 1 ELSE 0 END) AS inpatient,
                    SUM(CASE WHEN e.TYPE = 'Outpatient' THEN 1 ELSE 0 END) AS outpatient
                FROM cohort c
                JOIN encounter e ON e.sid = c.sid 
                WHERE c.cohort_definition_id = ?
                GROUP BY e.sid
            )
            SELECT d.race_ethnicity, ec.*
            FROM cohort c
            JOIN demographic d ON d.sid = c.sid 
            JOIN encounter_counts ec ON ec.sid = c.sid
            WHERE c.cohort_definition_id = ?
            AND d.race_ethnicity != 'Other'
            """,
            (cohort_id, cohort_id),
        )
        return [dict(row) for row in cursor]
    finally:
        conn.close()
