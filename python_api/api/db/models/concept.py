import sqlite3

from api.db import get_connection
from api.utils import batched


def find_many(params: list[dict], conn: sqlite3.Connection = None, batch_size=1000) -> list[dict]:
    """
    Find many concepts by code, code_system, and type
    :param batch_size: The number of parameters to query at once
    :param params: list of dicts like {"code": "1234", "code_system": "ICD-10", "type": "dx"}
    :param conn:
    :return:
    """
    _conn = conn or get_connection()
    # Prepare the query with a list of tuples for all parameters
    if not params:
        return []
    try:
        cursor = _conn.cursor()
        results = []
        for batch in batched(params, batch_size):
            placeholders = ', '.join(['(?, ?, ?)'] * len(batch))
            query = f"""
                SELECT * FROM concept WHERE (code, code_system, type) IN ({placeholders})
            """
            query_params = []
            for param in batch:
                query_params.extend((param["code"], param["code_system"], param["type"]))
            cursor.execute(query, query_params)
            rows = cursor.fetchall()
            results.extend(dict(row) for row in rows)
        return results
    finally:
        if not conn:
            _conn.close()


def insert_many(concepts):
    conn = get_connection()
    try:
        with conn:
            cursor = conn.cursor()
            cursor.executemany("""
                INSERT INTO concept (type, name, code, code_system)
                VALUES (?, ?, ?, ?)
            """, ((concept["type"], concept["name"], concept["code"], concept["code_system"]) for concept in concepts))
    finally:
        conn.close()
