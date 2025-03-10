import logging
import time

import fire

from workers.variants.database import conn


# Configure logging
logging.basicConfig(
  format='%(asctime)s - %(levelname)s - %(message)s',
  level=logging.INFO
)

def fix(chrom: int):
  with conn.cursor() as cursor:
    conn.autocommit = True
    chrom_str = str(chrom).zfill(2)
    query = f"vacuum full variant_chromosome_{chrom_str}"
    cursor.execute(query)

    query = f"analyze variant_chromosome_{chrom_str}"
    cursor.execute(query)


def main(start, end=None):
  end = end if end else start
  for chrom in range(start, end+1):
    start_time = time.time()
    logging.info(f"Starting vacuum for chromosome {chrom}")
    fix(chrom)

    end_time = time.time()
    elapsed_time = end_time - start_time
    hours, remainder = divmod(elapsed_time, 3600)
    minutes, seconds = divmod(remainder, 60)
    logging.info(f"Vacuum for chromosome {chrom} took {int(hours)} hours, {int(minutes)} minutes, and {int(seconds)} seconds")


def main2():
  with conn.cursor() as cursor:
    conn.autocommit = True
    query = f"vacuum full variant"
    cursor.execute(query)

    query = f"analyze variant"
    cursor.execute(query)

if __name__ == '__main__':
  fire.Fire(main2)