from collections import namedtuple
from pathlib import Path

from dataclasses import dataclass, asdict
from pathlib import Path

from workers.variants.database import conn

Site = namedtuple('Site', ('chrom', 'pos', 'ref', 'alt'))


@dataclass
class Annotation:
    chr: int
    position: int
    ref: str
    alt: str
    func: str = None
    genes: list[str] = None
    exonic_func: str = None
    aa_change: str = None
    af_afr: float = None
    af_amr: float = None
    af_asj: float = None
    af_eas: float = None
    af_fin: float = None
    af_nfe: float = None
    af_sas: float = None
    af_oth: float = None
    cadd_phred: float = None
    revel_max: float = None
    polyphen_max: float = None
    sift_max: float = None
    cln_allele_id: int = None
    cln_dis_db: str = None
    cln_dn: str = None
    cln_hgvs: str = None
    cln_rev_stat: str = None
    cln_sig: str = None
    cln_vc: str = None
    cln_vcso: str = None
    cln_geneinfo: str = None
    cln_mc: str = None

    @classmethod
    @property
    def insert_query(cls):
        keys = cls.__annotations__.keys()
        return f'INSERT INTO ANNOTATION ({", ".join(keys)}) VALUES ({", ".join(["%s" for _ in keys])}) ' \
               f'ON CONFLICT DO NOTHING'

    # f'ON CONFLICT (chr, "position", ref, alt) UPDATE SET ' \
    # f'{", ".join([f"{k} = EXCLUDED.{k}" for k in keys])}'


def create_many(rows: list[Annotation]):
    with conn.cursor() as cursor:
        insert_query = Annotation.insert_query
        try:
            ins_data = [tuple(asdict(r).values()) for r in rows]
            # print(insert_query, ins_data)
            cursor.executemany(insert_query, ins_data)
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e


def get_missing(chromosome: int = None):
    q = """
        SELECT v.chr, v."position", v."ref", v.alt 
        FROM variant v 
        LEFT JOIN annotation a ON a.chr = v.chr AND a."position" = v."position" AND a."ref" = v."ref" AND a.alt = v.alt 
        """
    params = []

    if chromosome is not None:
        q += "WHERE v.chr = %s AND a.chr IS NULL"
        params.append(chromosome)
    else:
        q += "WHERE a.chr IS NULL"

    with conn.cursor() as cursor:
        cursor.execute(q, params)
        for row in cursor:
            yield Site(chrom=int(row[0]), pos=int(row[1]), ref=row[2], alt=row[3])


def count_missing(chromosome: int = None):
    q = """
        SELECT count(*) 
        FROM variant v 
        LEFT JOIN annotation a ON a.chr = v.chr AND a."position" = v."position" AND a."ref" = v."ref" AND a.alt = v.alt 
        """
    params = []

    if chromosome is not None:
        q += "WHERE v.chr = %s AND a.chr IS NULL"
        params.append(chromosome)
    else:
        q += "WHERE a.chr IS NULL"

    with conn.cursor() as cursor:
        cursor.execute(q, params)
        return cursor.fetchone()[0]


def update_many(rows: list[Annotation], update_columns: set[str] = None):
    update_query = f'UPDATE ANNOTATION SET {", ".join([f"{c} = %s" for c in update_columns])} ' \
                   f'WHERE chr = %s AND "position" = %s AND ref = %s AND alt = %s'

    with conn.cursor() as cursor:
        try:
            update_data = [
                tuple(asdict(r)[k] for k in update_columns) + (r.chr, r.position, r.ref, r.alt)
                for r in rows
            ]
            # print(update_query, update_data)
            cursor.executemany(update_query, update_data)
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e


def get_all_sites(chromosome: int = None):
    q = """
        SELECT * 
        FROM annotation
        """
    params = []

    if chromosome is not None:
        q += " WHERE chr = %s"
        params.append(chromosome)

    with conn.cursor() as cursor:
        cursor.execute(q, params)
        for row in cursor:
            yield Site(chrom=int(row[0]), pos=int(row[1]), ref=row[2], alt=row[3])


def total_count(chromosome: int = None) -> int:
    q = """
            SELECT count(*) 
            FROM annotation
            """
    params = []

    if chromosome is not None:
        q += " WHERE chr = %s"
        params.append(chromosome)

    with conn.cursor() as cursor:
        print(q, params)
        cursor.execute(q, params)
        return cursor.fetchone()[0]


def copy_data(csv_file: str | Path):
    """
    Copy data from a CSV file to VARIANT table.
    @param csv_file:
    @return:
    """
    with conn.cursor() as cursor:
        copy_query = """
                    COPY ANNOTATION (chr,position,ref,alt,func,genes,exonic_func,aa_change,af_afr,af_amr,af_asj,af_eas,af_fin,af_nfe,af_sas,af_oth,cadd_phred,revel_max,polyphen_max,sift_max,cln_allele_id,cln_dis_db,cln_dn,cln_hgvs,cln_rev_stat,cln_sig,cln_vc,cln_vcso,cln_geneinfo,cln_mc)
                    FROM STDIN DELIMITER ',' CSV HEADER NULL 'null'
                """
        with open(csv_file, 'r') as f:
            cursor.copy_expert(copy_query, f)
            conn.commit()
