from dataclasses import dataclass, asdict

from workers.variants.database import conn


@dataclass
class Annotation:
    chr: int
    position: int
    ref: str
    alt: str
    af_afr: float
    af_amr: float
    af_eas: float
    af_nfe: float
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
