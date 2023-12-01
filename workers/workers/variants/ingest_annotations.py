from pathlib import Path

import fire
import pandas as pd

from workers.variants.database import conn

column_mapper = {
    'Chr': 'chr',
    'Start': 'position',
    'Ref': 'ref',
    'Alt': 'alt',
    'Func.refGene': 'func',
    'Gene.refGene': 'genes',
    'ExonicFunc.refGene': 'exonic_func',
    'AAChange.refGene': 'aa_change',
    'AF_afr': 'af_afr',
    'AF_sas': 'af_sas',
    'AF_amr': 'af_amr',
    'AF_eas': 'af_eas',
    'AF_nfe': 'af_nfe',
    'AF_fin': 'af_fin',
    'AF_asj': 'af_asj',
    'AF_oth': 'af_oth',
    'CLNALLELEID': 'cln_allele_id',
    'CLNDN': 'cln_cond',
    'CLNDISDB': 'cln_dis_db',
    'CLNREVSTAT': 'cln_rev_stat',
    'CLNSIG': 'cln_sig'
}

int_columns = ['chr', 'position', 'cln_allele_id', 'source_id']

columns_ordered = ['chr', 'position', 'ref', 'alt', 'source_id', 'func', 'genes', 'exonic_func', 'aa_change', 'af_afr',
                   'af_sas', 'af_amr', 'af_eas', 'af_nfe', 'af_fin', 'af_asj', 'af_oth', 'cln_allele_id', 'cln_cond',
                   'cln_dis_db', 'cln_rev_stat', 'cln_sig']


def transform_annotations(p: Path, source_id: int, out_dir: Path):
    df = pd.read_csv(str(p), sep='\t', low_memory=False, na_values=['.'])
    df2 = df.rename(columns=column_mapper)
    df2 = df2[list(column_mapper.values())]

    df2['chr'] = df2['chr'].replace('XX', 23).replace('XY', 24)
    df2['source_id'] = source_id

    for col in int_columns:
        df2[col] = pd.to_numeric(df2[col], errors='coerce').astype('Int64')

    # rearrange columns
    df2 = df2[columns_ordered]

    out_file = out_dir / f'{p.stem}_table.csv'
    df2.to_csv(out_file, index=False)
    return out_file


def load_data(csv_file: Path):
    # copy_sql = f"""
    #     COPY annotation FROM '{str(csv_file)}' DELIMITER ',' CSV HEADER;
    # """
    with conn.cursor() as cursor:
        with open(csv_file, 'r') as f:
            cursor.copy_expert(sql="COPY annotation FROM STDIN DELIMITER ',' CSV HEADER", file=f)
        conn.commit()


def main(ann_dir: str, source_id: int, out_dir: str):
    """

    @param ann_dir: path to directory to annotation files (*.txt)
    @param source_id: id of the source to associate the data with
    @param out_dir: path to store intermediate csv files
    @return:
    """
    ann_dir = Path(ann_dir).resolve()
    assert ann_dir.exists()

    out_dir = Path(out_dir).resolve()
    out_dir.mkdir(exist_ok=True)

    # p = Path('/Users/deduggi/Documents/SCA/biobank/annotations/biAllelic_afr_chr1.hg19_multianno.txt')
    for p in ann_dir.glob('*.txt'):
        print(p.name)
        out_file = transform_annotations(p, source_id, out_dir)
        load_data(out_file)


if __name__ == '__main__':
    fire.Fire(main)
