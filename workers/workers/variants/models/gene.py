from workers.variants.database import conn


def fetch_all() -> set[str]:
    q = '''select name from gene'''
    with conn.cursor() as cursor:
        cursor.execute(q)
        return set(row[0] for row in cursor.fetchall())


def create_many(genes: list[str]):
    with conn.cursor() as cursor:
        insert_query = 'INSERT INTO GENE("name") VALUES(%s) ON CONFLICT DO NOTHING'
        try:
            ins_data = [(g,) for g in genes]
            # print(insert_query, ins_data)
            cursor.executemany(insert_query, ins_data)
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
