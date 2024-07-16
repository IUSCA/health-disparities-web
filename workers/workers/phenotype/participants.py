import fire
import pandas as pd

from workers.variants.database import conn


def get_participants_from_csv(csv_file):
    """
    1. Read ib_id and study_id columns from csv file.
    2. If ib_id or study_id is missing or empty, the row is considered invalid and is returned in a separate dataframe.
    3. Transform IB ID to uppercase
    4. Group by ib_id and consider only the last study_id for each ib_id.
   
    Return a dataframe of ib_id and study_id columns and a dataframe of invalid rows.
    """
    df = pd.read_csv(csv_file)
    ib_id_col = next(col for col in df.columns if col in ['IB_ID', 'IB_ID_LONG'])
    study_id_col = next(col for col in df.columns if col in ['STUDY_ID', 'STUDYID'])

    valid_idx = df[ib_id_col].notna() & (df[ib_id_col] != '') & df[study_id_col].notna() & (df[study_id_col] != '')
    valid_df, invalid_df = df[valid_idx], df[~valid_idx]

    valid_df[ib_id_col] = valid_df[ib_id_col].str.upper()
    participant_df = df[valid_idx].groupby(ib_id_col)[study_id_col].last().reset_index().set_index(ib_id_col)

    participant_df.rename(columns={ib_id_col: 'IB_ID', study_id_col: 'STUDY_ID'}, inplace=True)

    return participant_df, invalid_df


def create_participants_csv(data_dir, enroll_snapshot_id, out_file='participants.csv'):
    """
    Create a csv file with ib_id, study_id, and enroll_snapshot_id columns to be imported into the participant table.
    Read phenotypes csv files from data_dir and extract unique ib_id and associated study_id columns.
    Merge these mappings into a single dictionary and write to out_file.
    """
    ib_id_map = fetch_all()
    pids = {}
    for csv_file in data_dir.glob('*.csv'):
        print(f'processing {csv_file}')
        key = csv_file.stem
        participant_df, invalid_df = get_participants_from_csv(csv_file)

        for ib_id, study_id in participant_df['STUDY_ID'].items():
            if ib_id not in ib_id_map:
                pids[ib_id] = study_id

        num_invalid = invalid_df.shape[0]
        print(key, 'num_invalid', num_invalid)
        if num_invalid:
            invalid_df.to_csv(f'error_{key}.csv', index=False)

    p_df = pd.DataFrame(pids.items(), columns=['ib_id', 'study_id'])
    p_df['enroll_snapshot_id'] = enroll_snapshot_id
    p_df.to_csv(out_file, index=False)
    return p_df


def load_participants(csv_file):
    create_table_sql = """
    CREATE TEMP TABLE tmp_table 
    (LIKE participant INCLUDING DEFAULTS)
    ON COMMIT DROP;
    """

    copy_data_sql = """
    COPY tmp_table(ib_id,study_id,enroll_snapshot_id) 
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


def fetch_all():
    """
    Returns a dict of ib_id -> participant_id
    """
    with conn.cursor() as cursor:
        cursor.execute('select id, ib_id from participant')
        return {row[1]: row[0] for row in cursor}


def main(data_dir, enroll_snapshot_id, out_csv, import_into_db=False):
    """
    Compute unique participants from phenotypes csv files in data_dir and import into participant table.
    """

    create_participants_csv(data_dir, enroll_snapshot_id, out_csv)
    if import_into_db:
        load_participants(out_csv)


if __name__ == '__main__':
    fire.Fire(main)
