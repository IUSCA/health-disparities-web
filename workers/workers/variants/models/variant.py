from workers.variants.database import conn


# Variant = named_tuple('Variant', )


def find_one(chromosome, position, reference, alternate):
    with conn.cursor() as cursor:
        select_query = f"SELECT * FROM VARIANT WHERE chromosome = %s and position = %s and reference = %s and " \
                       f"alternate = %s"
        cursor.execute(select_query, (chromosome, position, reference, alternate))
        return cursor.fetchone()


def create_one(chromosome, position, reference, alternate, genotypes):
    cursor = conn.cursor()
    insert_query = f"INSERT INTO VARIANT (chromosome, position, reference, alternate, genotype) VALUES (" \
                   f"%s, %s, %s, %s, %s) RETURNING *"
    cursor.execute(insert_query, (chromosome, position, reference, alternate, genotypes))
    created_record = cursor.fetchone()
    conn.commit()
    return created_record


def update(chromosome, position, reference, alternate, genotypes: list[int]):
    with conn.cursor() as cursor:
        update_query = f'UPDATE VARIANT SET genotype = %s WHERE chromosome = %s and position = %s and reference = %s ' \
                       f'and alternate = %s'
        cursor.execute(update_query, (genotypes, chromosome, position, reference, alternate))
        conn.commit()


def find_many(params) -> dict:
    """

    @param params:
    @return: variant_id to row mapping
    """
    with conn.cursor() as cursor:
        select_query = f"SELECT chromosome, position, reference, alternate FROM VARIANT" \
                       f" WHERE (chromosome, position, reference, alternate) IN %s"
        cursor.execute(select_query, (params,))
        rows = cursor.fetchall()

        # Populate the result dictionary
        result_dict = {}
        for row in rows:
            key = (row[0], row[1], row[2], row[3])
            result_dict[key] = row
        return result_dict


def create_many(data) -> None:
    with conn.cursor() as cursor:
        insert_query = f"INSERT INTO VARIANT (chromosome, position, reference, alternate, genotype) VALUES (" \
                       f"%s, %s, %s, %s, %s)"
        try:
            cursor.executemany(insert_query, data)
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e


def update_many(data) -> None:
    with conn.cursor() as cursor:
        update_query = f'UPDATE VARIANT SET genotype[%d:%d] = %s WHERE chromosome = %s and position = %s ' \
                       f'and reference = %s and alternate = %s'
        try:
            cursor.exexecutemanyecute(update_query, data)
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
