from pathlib import Path

import fire

from workers.variants.database import conn


def refresh_mat_views():
    with conn.cursor() as cursor:
        cursor.execute('REFRESH MATERIALIZED VIEW concept_metadata')
        cursor.execute('REFRESH MATERIALIZED VIEW concept_synonym_metadata')
        conn.commit()


def load(table_name, csv_file):
    copy_data_sql = f"""
    COPY {table_name} 
    FROM STDIN DELIMITER ',' CSV HEADER
    """

    try:
        with conn.cursor() as cursor:
            with open(csv_file, 'r') as f:
                cursor.copy_expert(
                    sql=copy_data_sql,
                    file=f)

            conn.commit()
    except Exception as e:
        conn.rollback()
        raise e


def main(data_dir):
    data = Path(data_dir).resolve()
    print('Loading concept data')
    load('concept', data / 'concept.csv')

    print('Loading concept_relationship data')
    load('concept_relationship', data / 'concept_relationship.csv')

    print('Loading concept_synonym data')
    load('concept_synonym', data / 'concept_synonym.csv')
    refresh_mat_views()


if __name__ == '__main__':
    fire.Fire(main)
