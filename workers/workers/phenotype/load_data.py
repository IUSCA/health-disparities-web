from abc import ABC, abstractmethod
from datetime import datetime
from pathlib import Path

import fire
import numpy as np
import pandas as pd

from workers import api
from workers import utils
from workers.phenotype import participants
from workers.variants.database import conn


def parse_date(date_string):
    """
    Parse date string to datetime object.
    """
    if date_string is None or type(date_string) is not str:
        return None
    try:
        date_format = "%d%b%Y:%H:%M:%S"
        return datetime.strptime(date_string, date_format)
    except Exception as e:
        print(f'unable to parse date value {date_string} \t', e)


class PhenotypeDataLoader(ABC):
    """
    Base class for loading phenotype data from csv files into the database.
    """
    table_name = None
    columns = None
    non_null_columns = None

    def __init__(self, csv_file, ib_id_map, out_dir, enroll_snapshot_id, dry_run):
        if self.table_name is None:
            raise NotImplementedError("Subclasses must set 'table_name'.")
        if self.columns is None:
            raise NotImplementedError("Subclasses must set 'columns'.")
        if self.non_null_columns is None:
            self.non_null_columns = self.columns

        self.csv_file = csv_file
        self.ib_id_map = ib_id_map
        self.out_dir = out_dir
        self.dry_run = dry_run
        self.enroll_snapshot_id = enroll_snapshot_id
        self.out_csv = self.out_dir / f'transformed_{self.csv_file.stem}.csv'
        self.error_csv = self.out_dir / f'error_{self.csv_file.stem}.csv'
        self.marker = self.out_dir / f'{self.csv_file.stem}.done'

    @abstractmethod
    def transform(self, df, ib_id_map):
        pass

    def filter(self, df):
        # rows with null/na in one or more given columns
        invalid_idx = df[self.non_null_columns].isna().any(axis=1)

        return ~invalid_idx

    def load(self, csv_file):
        copy_data_sql = f"""
        COPY {self.table_name}({','.join(self.columns)}) 
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

    def get_file_metadata(self):
        file_size = self.csv_file.lstat().st_size
        hex_digest = utils.checksum(self.csv_file)
        return {
            'name': self.csv_file.name,
            'path': str(self.csv_file),
            'md5': hex_digest,
            'size': file_size,
        }

    def run(self):
        """
        1. read csv file
        2. transform data to match db schema
        3. filter invalid rows
        4. load valid rows into db
        5. register phenotype_file in db
        """
        df = pd.read_csv(self.csv_file)
        df2 = self.transform(df, self.ib_id_map)
        valid_idx = self.filter(df2)
        valid_df, invalid_df = df2[valid_idx], df[~valid_idx]

        num_valid, num_invalid = valid_df.shape[0], invalid_df.shape[0]
        print(f'{self.csv_file.stem}: transformed rows: {num_valid}. error rows: {num_invalid}')

        if num_valid:
            valid_df.to_csv(self.out_csv, index=False)
        if num_invalid:
            invalid_df.to_csv(self.error_csv, index=False)
        if (not self.dry_run) and (not self.is_marked_done()):
            self.load(self.out_csv)
            self.mark_as_done()

            data = self.get_file_metadata()
            data['snapshot_id'] = self.enroll_snapshot_id
            api.create_phenotype_file(data)

    def mark_as_done(self):
        self.marker.touch()

    def is_marked_done(self):
        return self.marker.exists()


class CovidTest(PhenotypeDataLoader):
    table_name = 'covid_test'
    columns = ['name', 'date', 'result', 'participant_id']

    def transform(self, df, ib_id_map):
        df['date'] = df['DEID_TEST_DATE'].map(parse_date)
        df['participant_id'] = df['IB_ID'].map(ib_id_map)
        df.rename(columns={'RESULTS': 'result', 'COVID_TEST': 'name'}, inplace=True)
        return df[self.columns]


class CovidVax(PhenotypeDataLoader):
    table_name = 'covid_vax'
    columns = ['name', 'date', 'manufacturer', 'dose_number', 'series_doses', 'is_booster', 'participant_id']

    def transform(self, df, ib_id_map):
        df['date'] = df['DEID_IM_DATE'].map(parse_date)
        df['participant_id'] = df['IB_ID'].map(ib_id_map)
        df['SERIES_DOSES'] = np.floor(pd.to_numeric(df['SERIES_DOSES'], errors='coerce')).astype('Int64')
        df['DOSE_NUMBER'] = np.floor(pd.to_numeric(df['DOSE_NUMBER'], errors='coerce')).astype('Int64')
        df.rename(columns={
            'DOSE_NUMBER': 'dose_number',
            'VACCINE_TEXT': 'name',
            'MANUFACTURER_SHORT': 'manufacturer',
            'SERIES_DOSES': 'series_doses',
            'IS_BOOSTER_YN': 'is_booster'
        }, inplace=True)
        return df[self.columns]


class Demographics(PhenotypeDataLoader):
    table_name = 'demographic'
    columns = ['gender', 'race', 'ethnicity', 'max_enc_date', 'chs_flag', 'dob', 'enroll_date', 'participant_id']

    def transform(self, df, ib_id_map):
        df['max_enc_date'] = df['DEID_MAX_ENC_DATE'].map(parse_date)
        df['participant_id'] = df['IB_ID'].map(ib_id_map)
        df['dob'] = df['DEID_DOB'].map(parse_date)
        df['enroll_date'] = df['DEID_ENROLL_DATE'].map(parse_date)
        df['CHS_FLAG'] = np.floor(pd.to_numeric(df['CHS_FLAG'], errors='coerce')).astype('Int64')
        df.rename(columns={
            'GENDER': 'gender',
            'RACE': 'race',
            'ETHNICITY': 'ethnicity',
            'CHS_FLAG': 'chs_flag'
        }, inplace=True)
        return df[self.columns]


class Dx(PhenotypeDataLoader):
    table_name = 'dx'
    columns = ['name', 'date', 'code', 'code_system', 'participant_id']

    def transform(self, df, ib_id_map):
        df['date'] = df['DEID_DX_DATE'].map(parse_date)
        df['participant_id'] = df['IB_ID'].map(ib_id_map)
        df.rename(columns={
            'DX_NAME': 'name',
            'DX_CODE': 'code',
            'DX_CODE_SYSTEM': 'code_system'
        }, inplace=True)
        return df[self.columns]


class Hospital(PhenotypeDataLoader):
    table_name = 'hospital'
    columns = ['enc_id', 'admit_date', 'discharge_date', 'dx_code', 'dx_code_system', 'participant_id']
    non_null_columns = ['enc_id', 'admit_date', 'dx_code', 'dx_code_system', 'participant_id']

    def transform(self, df, ib_id_map):
        df['admit_date'] = df['DEID_ADMIT'].map(parse_date)
        df['participant_id'] = df['IB_ID_LONG'].map(ib_id_map)
        df['discharge_date'] = df['DEID_DISCHARGE'].map(parse_date)
        df.rename(columns={
            'ENC_ID': 'enc_id',
            'DX_CODE': 'dx_code',
            'DX_CODE_SYSTEM': 'dx_code_system'
        }, inplace=True)
        return df[self.columns]


class Lab(PhenotypeDataLoader):
    table_name = 'lab'
    columns = ['name', 'date', 'category', 'result', 'unit', 'participant_id']

    def transform(self, df, ib_id_map):
        df['date'] = df['DEID_LABDATE'].map(parse_date)
        df['participant_id'] = df['IB_ID'].map(ib_id_map)
        df['result'] = np.floor(pd.to_numeric(df['NUMERIC_RESULT'], errors='coerce')).astype('Int64')
        df.rename(columns={
            'LAB_NAME': 'name',
            'CATEGORY': 'category',
            'UNIT': 'unit'
        }, inplace=True)
        return df[self.columns]


class Medication(PhenotypeDataLoader):
    table_name = 'medication'
    columns = ['name', 'category', 'start_date', 'dispense_qty', 'dispense_qty_unit', 'nbr_refills', 'strength_dose',
               'strength_dose_unit', 'participant_id']
    non_null_columns = ['name', 'category', 'start_date', 'participant_id']

    def transform(self, df, ib_id_map):
        df['start_date'] = df['DEID_START_DATE'].map(parse_date)
        df['participant_id'] = df['IB_ID'].map(ib_id_map)
        df['dispense_qty'] = pd.to_numeric(df['DISPENSEQTY'], errors='coerce').astype('Float64')
        df['nbr_refills'] = np.floor(pd.to_numeric(df['NBRREFILLS'], errors='coerce')).astype('Int64')
        df['strength_dose'] = pd.to_numeric(df['STRENGTHDOSE'].str.replace(',', ''), errors='coerce').astype('Float64')
        df.rename(columns={
            'DRUG_NAME': 'name',
            'DRUG_CATEGORY': 'category',
            'DISPENSEQTYUNIT': 'dispense_qty_unit',
            'STRENGTHDOSEUNIT': 'strength_dose_unit'
        }, inplace=True)
        return df[self.columns]


# Create a dictionary that maps stems to loader classes
loaders = {
    'covid_test': CovidTest,
    'covid_vax': CovidVax,
    'demo': Demographics,
    'dx': Dx,
    'hosp': Hospital,
    'lab': Lab,
    'meds': Medication
}


def main(data_dir,
         enroll_snapshot_id,
         out_dir=f'{datetime.now().strftime("%Y%m%d_%H%M%S")}_results',
         glob='*.csv',
         dry_run=False,
         ):
    """
    Load phenotype data from csv files into the database.
    """
    data_dir = Path(data_dir).resolve()
    out_dir = Path(out_dir).resolve()
    out_dir.mkdir(exist_ok=True)

    out_csv = out_dir / 'participants.csv'
    participants.create_participants_csv(data_dir, enroll_snapshot_id, out_csv)
    if not dry_run:
        participants.load_participants(out_csv)

    ib_id_map = participants.fetch_all()

    for csv_file in data_dir.glob(glob):
        # Find the loader class for the current file
        for stem, Loader in loaders.items():
            if stem in csv_file.stem:
                loader = Loader(csv_file, ib_id_map, out_dir, enroll_snapshot_id, dry_run)
                break
        else:
            # this runs when the above loop ends without encountering a break statement
            print(f'unknown file {csv_file}')
            continue
        try:
            loader.run()
        except Exception as e:
            print('Error while processing', csv_file)
            print(e)


if __name__ == '__main__':
    fire.Fire(main)
