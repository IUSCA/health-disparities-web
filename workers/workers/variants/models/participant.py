from workers.utils import merge
from workers.variants.database import conn


def find_one(domain_id):
    with conn.cursor() as cursor:
        select_query = f"SELECT * FROM SUBJECT WHERE domain_id = %s"
        cursor.execute(select_query, (domain_id,))
        return cursor.fetchone()


def create_one(domain_id):
    with conn.cursor() as cursor:
        insert_query = "INSERT INTO subject (domain_id) VALUES (%s) returning *"
        cursor.execute(insert_query, (domain_id,))
        created_record = cursor.fetchone()
        conn.commit()
        return created_record


def find_or_create(domain_id: str) -> (int, str):
    existing_record = find_one(domain_id)
    if existing_record:
        return existing_record
    else:
        return create_one(domain_id)


def find_many(domain_ids: list[str]) -> dict[str, int]:
    if not domain_ids:
        return {}
    with conn.cursor() as cursor:
        select_query = 'SELECT * FROM SUBJECT WHERE domain_id IN %s'
        cursor.execute(select_query, (tuple(domain_ids),))
        result = cursor.fetchall()
        return {row[1]: row[0] for row in result}


def create_many(domain_ids: list[str]):
    if domain_ids:
        with conn.cursor() as cursor:
            insert_query = "INSERT INTO subject (domain_id) VALUES (%s)"
            cursor.executemany(insert_query, [(d,) for d in domain_ids])
            conn.commit()


def find_or_create_many(domain_ids) -> dict[str, int]:
    existing_subjects = find_many(domain_ids)

    missing_domain_ids = list(set(domain_ids) - set(existing_subjects.keys()))
    create_many(missing_domain_ids)

    new_subjects = find_many(missing_domain_ids)

    return merge(existing_subjects, new_subjects)
