from collections import namedtuple
from dataclasses import dataclass, asdict

from workers.variants.database import conn

Site = namedtuple('Site', ('chrom', 'pos', 'ref', 'alt'))


@dataclass
class Annotation:
    chr: int
    position: int
    ref: str
    alt: str
    af_afr: float
    af_amr: float
    af_asj: float
    af_eas: float
    af_fin: float
    af_nfe: float
    af_sas: float
    af_oth: float
    cadd_phred: float
    revel_max: float
    polyphen_max: float
    sift_max: float

    @classmethod
    @property
    def insert_query(cls):
        keys = cls.__annotations__.keys()
        return f'INSERT INTO ANNOTATION ({", ".join(keys)}) VALUES ({", ".join(["%s" for _ in keys])}) ' \
               f'ON CONFLICT DO NOTHING'


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
