from workers.variants.database import conn

cur = conn.cursor()
create_annotation_table_sql = """
CREATE TABLE IF NOT EXISTS annotation (
  chr smallint NOT NULL,
  position BIGINT NOT NULL,
  ref TEXT NOT NULL,
  alt TEXT NOT NULL,
  func TEXT,
  genes TEXT,
  exonic_func TEXT,
  aa_change TEXT,
  af_afr FLOAT,
  af_sas FLOAT,
  af_amr FLOAT,
  af_eas FLOAT,
  af_nfe FLOAT,
  af_fin FLOAT,
  af_asj FLOAT,
  af_oth FLOAT,
  cln_allele_id INT,
  cln_cond TEXT,
  cln_dis_db TEXT,
  cln_rev_stat TEXT,
  cln_sig TEXT
)
"""
cur.execute(create_annotation_table_sql)

# Commit the changes and close the cursor and connection
conn.commit()
cur.close()
conn.close()
