from workers.variants.database import conn

# Create a cursor
cur = conn.cursor()

# SQL statements to create the parent table and partitions
create_parent_table_sql = """
CREATE TABLE IF NOT EXISTS variant (
    chromosome smallint NOT NULL,
    position bigint NOT NULL,
    reference char(1) NOT NULL,
    alternate char(1) NOT NULL,
    genotype smallint[],
    PRIMARY KEY (chromosome, position, reference, alternate)
) PARTITION BY LIST (chromosome);
"""

create_default_partition_sql = """
CREATE TABLE IF NOT EXISTS variant_default_partition PARTITION OF variant
    DEFAULT;
"""

# Execute the SQL statements to create the parent table and default partition
cur.execute(create_parent_table_sql)
cur.execute(create_default_partition_sql)

# Create partitions for chromosome values 1 to 23
for chromosome_value in range(1, 24):
    chromosome_num_str = f'{chromosome_value}'.zfill(2)
    create_partition_sql = f"""
    CREATE TABLE IF NOT EXISTS variant_chromosome_{chromosome_num_str} PARTITION OF variant
        FOR VALUES IN ({chromosome_value});
    """
    cur.execute(create_partition_sql)

# Commit the changes and close the cursor and connection
conn.commit()
cur.close()
conn.close()
