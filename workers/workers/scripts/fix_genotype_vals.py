import logging
from workers.variants.database import conn

# Configure logging
logging.basicConfig(
  format='%(asctime)s - %(levelname)s - %(message)s',
  level=logging.INFO
)

def fix(chrom: int):
  with conn.cursor() as cursor:
    query = """
      update variant
      set genotype = array_replace(genotype, 2, 1)
      where 2 = any(genotype) and chr = %s
    """
    logging.info(f"Executing update for chromosome {chrom}")
    cursor.execute(query, (chrom,))
    val = cursor.rowcount
    logging.info(f"Rows updated for chromosome {chrom}: {val}")
    conn.commit()
    logging.info(f"Update committed for chromosome {chrom}")

    # analyze table
    chrom_str = str(chrom).zfill(2)
    # logging.info(f"Analyzing table variant_chromosome_{chrom_str}")
    cursor.execute(f"analyze variant_chromosome_{chrom_str}")
    logging.info(f"Analysis complete for table variant_chromosome_{chrom_str}")

def main():
  for chrom in range(23, 0, -1):
    logging.info(f"Starting fix for chromosome {chrom}")
    fix(chrom)
    logging.info(f"Completed fix for chromosome {chrom}\n")

if __name__ == '__main__':
  main()
