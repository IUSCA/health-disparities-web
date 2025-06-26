import traceback
from abc import ABC, abstractmethod
from datetime import datetime
from pathlib import Path

import fire
import pandas as pd

from workers import utils
from workers.clinical_data import participants
from workers.variants.database import conn

# cSpell: ignore encounterid_de OUTPATIENTMESSAGE

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
        if self.is_marked_done():
            return
        df = pd.read_csv(self.csv_file, encoding='ISO-8859-1', dtype='str', encoding_errors='replace')
        df2 = self.transform(df.copy(), self.ib_id_map)
        print(df2.head())
        # df.to_csv(self.out_csv, index=False)
        valid_idx = self.filter(df2)
        valid_df, invalid_df = df2[valid_idx], df2[~valid_idx]

        num_valid, num_invalid = valid_df.shape[0], invalid_df.shape[0]
        print(f'{self.csv_file.stem}: transformed rows: {num_valid}. error rows: {num_invalid}')

        if num_valid:
            valid_df.to_csv(self.out_csv, index=False)
        if num_invalid:
            invalid_df.to_csv(self.error_csv, index=False)
        if (not self.dry_run) and (not self.is_marked_done()):
            self.load(self.out_csv)
            self.mark_as_done()

            # data = self.get_file_metadata()
            # data['snapshot_id'] = self.enroll_snapshot_id
            # api.create_phenotype_file(data)

    def mark_as_done(self):
        self.marker.touch()

    def is_marked_done(self):
        return self.marker.exists()


# model demographic {
#   id             Int         @id @default(autoincrement())
#   gender         String
#   race           String
#   ethnicity      String
#   race_ethnicity String
#   age            Int
#   participant_id Int
# }

# csv columns: sid,age,gender,race,ethnicity,Language

class Demographics(PhenotypeDataLoader):
    table_name = 'demographic'
    columns = ['age', 'gender', 'race', 'ethnicity', 'race_ethnicity', 'participant_id']
    non_null_columns = ['participant_id']

    def transform(self, df, ib_id_map):
        df['participant_id'] = df['sid'].map(ib_id_map)

        df['race'] = df['race'].replace({'Black or African American': 'Black'})
        df['ethnicity'] = df['ethnicity'].replace({
            'Not Hispanic or Latino': 'Not Hispanic',
            'Hispanic or Latino': 'Hispanic'
        })
        df.loc[df['race'] == 'Black', 'race_ethnicity'] = 'Black'
        df.loc[df['race'] != 'Black', 'race_ethnicity'] = 'Other'
        df.loc[df['race'] == 'White', 'race_ethnicity'] = 'White'
        df.loc[df['ethnicity'] == 'Hispanic', 'race_ethnicity'] = 'Hispanic'
        print(df.columns, self.columns)
        return df[self.columns]

# model dx {
#   id             Int         @id @default(autoincrement())
#   encounter_id   Int
#   name           String
#   date           DateTime?
#   code           String
#   code_system    String
#   type           String?
#   participant_id Int
# }

# csv columns: SID,encounterid_de,dx_id,dx_priority,DX_code,dx_name,DX_system,DX_type

class Dx(PhenotypeDataLoader):
    table_name = 'dx'
    columns = ['encounter_id', 'participant_id', 'code', 'name', 'code_system', 'type']
    non_null_columns = ['participant_id', 'encounter_id', 'name']

    def transform(self, df, ib_id_map):
        # remove duplicates
        df = df.groupby(['SID', 'encounterid_de', 'dx_id']).first().reset_index()

        df['participant_id'] = df['SID'].map(ib_id_map)
        df.rename(columns={
            'encounterid_de': 'encounter_id',
            'DX_code': 'code',
            'dx_name': 'name',
            'DX_system': 'code_system',
            'DX_type': 'type',
        }, inplace=True)
        return df[self.columns]

# model encounter {
#   id             Int         @id @default(autoincrement())
#   type           String
#   year           Int
#   site           String?
#   specialty      String?
#   los            Int?
#   insurance      String?
#   participant_id Int
# }

# csv columns:
# SID,encounterid_de,site,SPECIALTY,enc_type,LOS,year,insurance

class Encounter(PhenotypeDataLoader):
    table_name = 'encounter'
    columns = ['id', 'type', 'year', 'participant_id']
    non_null_columns = ['id', 'participant_id']

    def transform(self, df, ib_id_map):
        df['participant_id'] = df['SID'].map(ib_id_map)
        df.loc[df['enc_type'] == 'Emergency', 'type'] = 'Emergency'
        df.loc[df['enc_type'] != 'Emergency', 'type'] = 'Other'
        df.loc[
            df['enc_type'].isin(['OUTPATIENTMESSAGE', 'Outpatient Pre-reg', 'Outpatient in a Bed']), 'type'] = 'Outpatient'
        df.loc[df['enc_type'] == 'Inpatient', 'type'] = 'Inpatient'

        df.rename(columns={
            'encounterid_de': 'id',
            'SPECIALTY': 'specialty',
            'LOS': 'los',
        }, inplace=True)
        return df[self.columns]


# model procedure {
#   id             Int         @id @default(autoincrement())
#   encounter_id   Int
#   code           String
#   name           String
#   system         String
#   participant_id Int
# }

# csv columns: SID,encounterid_de,procedure_code,procedure_name,procedure_system

class Procedure(PhenotypeDataLoader):
    table_name = 'procedure'
    columns = ['encounter_id', 'participant_id', 'code', 'name', 'system']
    non_null_columns = ['participant_id', 'encounter_id']

    def transform(self, df, ib_id_map):
        # remove duplicates
        # df = df.groupby(['SID', 'encounterid_de', 'procedure_code']).first().reset_index()
        df['participant_id'] = df['SID'].map(ib_id_map)
        df.rename(columns={
            'encounterid_de': 'encounter_id',
            'procedure_code': 'code',
            'procedure_name': 'name',
            'procedure_system': 'system',
        }, inplace=True)
        return df[self.columns]

# Create a dictionary that maps stems to loader classes
loaders = {
    'demo': Demographics,
    'dxs': Dx,
    'encounters': Encounter,
    'procedures': Procedure,
}


def main(data_dir,
         enroll_snapshot_id,
         out_dir=f'{datetime.now().strftime("%Y%m%d")}_results',
         glob='*.csv',
         dry_run=False,
         ):
    """
    Load phenotype data from csv files into the database.
    """
    data_dir = Path(data_dir).resolve()
    out_dir = Path(out_dir).resolve()
    out_dir.mkdir(exist_ok=True)

    # out_csv = out_dir / 'participants.csv'
    # participants.create_participants_csv(data_dir, enroll_snapshot_id, out_csv)
    # if not dry_run:
    #     participants.load_participants(out_csv)

    ib_id_map = participants.fetch_all()

    for csv_file in data_dir.glob(glob):
        # Find the loader class for the current file
        for stem, Loader in loaders.items():
            if stem in csv_file.stem.lower():
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
            traceback.print_exc()



if __name__ == '__main__':
    fire.Fire(main)
