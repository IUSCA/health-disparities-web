import json

from api.db import conn


def create(cohort_id: int, intervention_id: int, result: dict, analysis_type: str) -> int:
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
        conn.commit()
        return result_id
