def find_many(cursor, ib_ids: list[str]) -> dict[str, int]:
    if not ib_ids:
        return {}
    select_query = 'SELECT id, ib_id FROM participant WHERE ib_id IN %s'
    cursor.execute(select_query, (tuple(ib_ids),))
    result = cursor.fetchall()
    return {row[1]: row[0] for row in result}


def create_many(cursor, ib_ids: list[str], snapshot_id: int):
    if ib_ids:
        insert_query = "INSERT INTO participant (ib_id, enroll_snapshot_id) VALUES (%s, %s) ON CONFLICT DO NOTHING"
        cursor.executemany(insert_query, [(d, snapshot_id) for d in ib_ids])


def fetch_all(cursor):
    """
    Returns a dict of ib_id -> participant_id
    """
    cursor.execute('select id, ib_id from participant')
    return {row[1]: row[0] for row in cursor}
