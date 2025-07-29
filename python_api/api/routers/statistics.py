from fastapi import APIRouter

from api.db import get_connection


def stats() -> dict:
    conn = get_connection()
    with conn:
        cursor = conn.cursor()
        sql = """
    select
      (select count(*) from subject s) as subjects,
      (select count(*) from "dx" d) as diagnoses,
      (select count(*) from "procedure" p) as procedures,
      (select count(*) from encounter e) as encounters
    """
        cursor.execute(sql)
        return dict(cursor.fetchone())


router = APIRouter(
    prefix="/statistics",
    tags=["statistics"],
)


@router.get("/")
def get_statistics():
    return stats()
