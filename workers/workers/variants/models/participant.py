from psycopg2 import extras


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


def fetch_all_gt_idx(cursor, source_id) -> dict[int, int]:
    """
    Returns a dict of participant_id -> genotype_idx
    """
    query = """select p.id, pg.genotype_idx 
        from participant p
        join participant_genotype pg on pg.participant_id = p.id
        where pg.source_id = %s;
    """
    cursor.execute(query, (source_id,))
    return {row[0]: row[1] for row in cursor}


def create_many_idx(cursor, data: list[dict[str, int]]):
    """
    create genotype_idx for participants

    @param cursor: cursor
    @param data: list of dicts ex: [{'participant_id': pid, 'genotype_idx': idx, 'source_id': sid}, ...]
    """
    insert_query = """
        INSERT INTO participant_genotype (participant_id, source_id, genotype_idx)
        VALUES %s
    """
    ins_data = [(d['participant_id'], d['source_id'], d['genotype_idx']) for d in data]
    extras.execute_values(cursor, insert_query, ins_data)
