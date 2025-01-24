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
    cursor.execute('select id, upper(ib_id) from participant')
    return {row[1]: row[0] for row in cursor}


def fetch_all_gt_idx(cursor) -> dict[int, int]:
    """
    Returns a dict of participant_id -> genotype_idx
    """
    cursor.execute('select id, genotype_idx from participant')
    return {row[0]: row[1] for row in cursor}


def update_many_idx(cursor, updates: list[dict[str, int]]):
    """
    Update genotype_idx for participants

    @param cursor: cursor
    @param updates: list of dict of participant_id -> genotype_idx ex: [{'id': pid, 'genotype_idx': idx}, ...]
    """
    update_query = 'UPDATE participant SET genotype_idx = %(genotype_idx)s WHERE id = %(id)s'
    cursor.executemany(update_query, updates)
