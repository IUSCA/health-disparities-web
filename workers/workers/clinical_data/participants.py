from pathlib import Path

import pandas as pd

from workers.variants.database import conn


def fetch_all():
    """
    Returns a dict of ib_id -> participant_id
    """
    with conn.cursor() as cursor:
        cursor.execute('select id, ib_id from participant')
        return {row[1]: str(row[0]) for row in cursor}


def create_participants_csv(data_dir: Path, enroll_snapshot_id, out_file='participants.csv', glob='*.csv'):
    """
    Create a csv file with ib_id and enroll_snapshot_id columns to be imported into the participant table.
    Read csv files from data_dir and extract unique ib_ids.
    Merge these mappings into a single dictionary and write to out_file.
    """
    unique_ids = set()
    for csv_file in data_dir.glob(glob):
        print(f'processing {csv_file}')
        df = pd.read_csv(csv_file, encoding='ISO-8859-1', dtype=str, encoding_errors='replace')
        sid_col = next((col for col in df.columns if col.lower() == 'sid'), None)
        if sid_col:
            unique_ids.update(df[sid_col].unique().tolist())

    participant_df = pd.DataFrame({'ib_id': list(unique_ids), 'enroll_snapshot_id': enroll_snapshot_id})
    participant_df.to_csv(out_file, index=False)
    return participant_df


def load_participants(csv_file):
    create_table_sql = """
    CREATE TEMP TABLE tmp_table 
    (LIKE participant INCLUDING DEFAULTS)
    ON COMMIT DROP;
    """

    copy_data_sql = """
    COPY tmp_table(ib_id,enroll_snapshot_id) 
    FROM STDIN DELIMITER ',' CSV HEADER
    """

    insert_data_sql = """
    INSERT INTO participant
    SELECT *
    FROM tmp_table
    ON CONFLICT DO NOTHING;
    """

    # conn.autocommit = False
    try:
        with conn.cursor() as cursor:

            cursor.execute(create_table_sql)

            with open(csv_file, 'r') as f:
                cursor.copy_expert(
                    sql=copy_data_sql,
                    file=f)

            cursor.execute(insert_data_sql)
            conn.commit()
    except Exception as e:
        print(e)
        conn.rollback()
