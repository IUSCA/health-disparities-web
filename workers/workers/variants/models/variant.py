from collections import namedtuple

from psycopg2 import sql

from workers.variants.database import conn

Variant = namedtuple('Variant', ['chr', 'position', 'ref', 'alt', 'source_id'])


def find_many(variants: list[Variant]) -> list[Variant]:
    """

    @param variants: list of Variants to search
    @return: found Variants
    """
    with conn.cursor() as cursor:
        query = sql.SQL(
            "SELECT chr, position, ref, alt, source_id FROM VARIANT WHERE (chr, position, ref, alt, source_id) IN ({})"
        ).format(sql.SQL(',').join(map(sql.Literal, variants)))
        cursor.execute(query)
        rows = cursor.fetchall()
        return [Variant(*r) for r in rows]


def create_many(data: list[dict]) -> None:
    """

    @param data: data of rows to create - list of dicts with following structure:
    {
        'variant': Variant,
        'phase': Bool,
        'genotype': list[int]
    }
    @return: None
    """
    with conn.cursor() as cursor:
        insert_query = f"INSERT INTO VARIANT (chr, position, ref, alt, source_id, phase, genotype)" \
                       f"VALUES (%s, %s, %s, %s, %s, %s, %s)"
        try:
            ins_data = [(*d['variant'], d['phase'], d['genotype']) for d in data]
            cursor.executemany(insert_query, ins_data)
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e


def update_many(data: list[dict]) -> None:
    """

    @param data: data of rows to update - list of dicts with following structure
    {
        'lower_bound': int,
        'upper_bound': int,
        'genotype': list[int],
        'variant': Variant,
    }
    @return: None
    """
    with conn.cursor() as cursor:
        update_query = f'UPDATE VARIANT SET genotype[%s:%s] = %s WHERE chr = %s and position = %s ' \
                       f'and ref = %s and alt = %s and source_id = %s'
        try:
            up_data = [(d['lower_bound'], d['upper_bound'], d['genotype'], *d['variant']) for d in data]
            print(up_data)
            cursor.executemany(update_query, up_data)
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
