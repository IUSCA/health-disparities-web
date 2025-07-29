import logging
from contextlib import closing
from pathlib import Path

import pandas as pd
from fire import Fire
from tqdm import tqdm

import api.db.preprocessing as preprocess
from api.db import get_connection
from api.db.models import concept

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def create_missing_subjects(sids: list[int]) -> None:
    """
    Create missing subjects in the database
    :param sids:
    :return:
    """

    conn = get_connection()
    with closing(conn.cursor()) as cur:
        cur.execute('SELECT * FROM subject')
        existing_sids = {row['id'] for row in cur}

    missing_sids = set(sids) - existing_sids

    if missing_sids:
        with conn:
            cursor = conn.executemany(
                '''
                INSERT INTO subject (id)
                VALUES (?)
                ''',
                [(sid,) for sid in missing_sids]
            )
            rows_inserted = cursor.rowcount
            logger.info(f'Created {rows_inserted} missing subjects')
    conn.close()


def load_demographics(csvfile: Path):
    df = pd.read_csv(csvfile, encoding='ISO-8859-1')
    df = preprocess.demographics(df)

    # create missing subjects
    sids = df['sid'].unique().tolist()
    create_missing_subjects(sids)

    # change columns to match the database
    df.drop(columns='Language', inplace=True, errors='ignore')

    conn = get_connection()
    with conn:
        # num_rows_written = df.to_sql('demographic', conn, if_exists='append', index=False)
        # logger.info(f'Wrote {num_rows_written} rows to demographic table')
        cursor = conn.executemany(
            '''
            INSERT INTO demographic (sid, age, gender, race, ethnicity, race_ethnicity)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT (sid) DO NOTHING
            ''',
            tqdm(df.itertuples(index=False, name=None), total=len(df), desc='Loading Demographics', mininterval=1)
        )
        rows_inserted = cursor.rowcount
        logger.info(f'Created {rows_inserted} demographic records')
    conn.close()


def load_encounters(csvfile: Path):
    df = pd.read_csv(csvfile, encoding='ISO-8859-1')
    df = preprocess.encounters(df)

    # change columns to match the database
    df.rename(columns={'SID': 'sid', 'encounterid_de': 'id'}, inplace=True)
    df = df[['id', 'type', 'year', 'sid']]

    # create missing subjects
    sids = df['sid'].unique().tolist()
    create_missing_subjects(sids)

    conn = get_connection()
    with conn:
        cursor = conn.executemany(
            '''
            INSERT INTO encounter (id, type, year, sid)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (id) DO NOTHING
            ''',
            tqdm(df.itertuples(index=False, name=None), total=len(df), desc='Loading Encounters', mininterval=1)
        )
        rows_inserted = cursor.rowcount
        logger.info(f'Created {rows_inserted} encounter records')
    conn.close()


def load_diagnoses(csvfile: Path):
    df = pd.read_csv(csvfile, encoding='ISO-8859-1')
    df = preprocess.dx(df)

    # change columns to match the database
    df.rename(columns={'SID': 'sid', 'encounterid_de': 'encounter_id', 'DX_code': 'code', 'dx_name': 'name',
                       'DX_system': 'code_system'},
              inplace=True)
    df = df[['name', 'code', 'code_system', 'sid', 'encounter_id']]
    df.dropna(inplace=True)

    # create missing subjects
    sids = df['sid'].unique().tolist()
    create_missing_subjects(sids)

    # concepts
    concepts_df = df.groupby(['code', 'code_system']).first().reset_index()[['name', 'code', 'code_system']]
    concepts_df['type'] = 'dx'
    existing_concepts = concept.find_many(concepts_df.to_dict(orient='records'))
    existing_concept_set = {(row['code'], row['code_system']) for row in existing_concepts}
    new_concepts = concepts_df[
        ~concepts_df.apply(lambda x: (x['code'], x['code_system']) in existing_concept_set, axis=1)
    ]
    concept.insert_many(new_concepts.to_dict(orient='records'))
    logger.info(f'Created {len(new_concepts)} new concepts')

    # fetch all concepts and create a mapping from code, code_system to id
    concepts = concept.find_many(concepts_df.to_dict(orient='records'))
    concepts_map = {(row['code'], row['code_system']): row['id'] for row in concepts}

    # create a multiindex series from the code and code_system columns
    concepts_index = pd.MultiIndex.from_tuples(concepts_map.keys(), names=['code', 'code_system'])
    concepts_series = pd.Series(concepts_map.values(), index=concepts_index)

    # map the code and code_system columns to the concept_id column
    df['concept_id'] = df.set_index(['code', 'code_system']).index.map(concepts_series)
    df = df[['sid', 'encounter_id', 'concept_id']]

    conn = get_connection()
    with conn:
        cursor = conn.executemany(
            '''
            INSERT INTO dx (sid, encounter_id, concept_id)
            VALUES (?, ?, ?)
            ON CONFLICT DO NOTHING
            ''',
            tqdm(df.itertuples(index=False, name=None), total=len(df), desc='Loading Diagnoses', mininterval=1)
        )
        rows_inserted = cursor.rowcount
        logger.info(f'Created {rows_inserted} diagnosis records')
    conn.close()


def load_procedures(csvfile: Path):
    df = pd.read_csv(csvfile, encoding='ISO-8859-1')
    df = preprocess.procedures(df)

    # change columns to match the database
    df.rename(
        columns={'SID': 'sid', 'encounterid_de': 'encounter_id', 'procedure_code': 'code', 'procedure_name': 'name',
                 'procedure_system': 'code_system'},
        inplace=True)
    df = df[['name', 'code', 'code_system', 'sid', 'encounter_id']]
    df.dropna(inplace=True)

    # create missing subjects
    sids = df['sid'].unique().tolist()
    create_missing_subjects(sids)

    # concepts
    concepts_df = df.groupby(['code', 'code_system']).first().reset_index()[['name', 'code', 'code_system']]
    concepts_df['type'] = 'procedure'
    existing_concepts = concept.find_many(concepts_df.to_dict(orient='records'))
    existing_concept_set = {(row['code'], row['code_system']) for row in existing_concepts}
    new_concepts = concepts_df[
        ~concepts_df.apply(lambda x: (x['code'], x['code_system']) in existing_concept_set, axis=1)
    ]
    concept.insert_many(new_concepts.to_dict(orient='records'))
    logger.info(f'Created {len(new_concepts)} new concepts')

    # fetch all concepts and create a mapping from code, code_system to id
    concepts = concept.find_many(concepts_df.to_dict(orient='records'))
    concepts_map = {(row['code'], row['code_system']): row['id'] for row in concepts}

    # create a multiindex series from the code and code_system columns
    concepts_index = pd.MultiIndex.from_tuples(concepts_map.keys(), names=['code', 'code_system'])
    concepts_series = pd.Series(concepts_map.values(), index=concepts_index)

    # map the code and code_system columns to the concept_id column
    df['concept_id'] = df.set_index(['code', 'code_system']).index.map(concepts_series)
    df = df[['sid', 'encounter_id', 'concept_id']]

    conn = get_connection()
    with conn:
        cursor = conn.executemany(
            '''
            INSERT INTO procedure (sid, encounter_id, concept_id)
            VALUES (?, ?, ?)
            ON CONFLICT DO NOTHING
            ''',
            tqdm(df.itertuples(index=False, name=None), total=len(df), desc='Loading Procedures', mininterval=1)
        )
        rows_inserted = cursor.rowcount
        logger.info(f'Created {rows_inserted} procedure records')
    conn.close()


def main(data_dir='data'):
    data_dir = Path(data_dir).resolve()

    # demographics
    load_demographics(data_dir / 'RDRP4355-IU-demo.csv')
    load_encounters(data_dir / 'RDRP4355-IU-encounters.csv')
    load_diagnoses(data_dir / 'RDRP4355-IU-DXs.csv')
    load_procedures(data_dir / 'RDRP4355-IU-procedures.csv')


if __name__ == '__main__':
    Fire(main)
