-- CreateTable
CREATE TABLE "genotype_stats" (
    "chr" SMALLINT NOT NULL,
    "position" BIGINT NOT NULL,
    "ref" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "source_id" INTEGER NOT NULL,
    "snapshot_id" INTEGER NOT NULL,
    "protocol_id" INTEGER NOT NULL,
    "missing" INTEGER NOT NULL,
    "c0" INTEGER NOT NULL,
    "c1" INTEGER NOT NULL,
    "c2" INTEGER NOT NULL,
    "c3" INTEGER NOT NULL,
    "allele_number" INTEGER NOT NULL,
    "allele_count" INTEGER NOT NULL,
    "allele_freq" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "genotype_stats_pkey" PRIMARY KEY ("chr","position","ref","alt","source_id","snapshot_id","protocol_id")
) PARTITION BY RANGE (snapshot_id);

/* Python script to create  partitions sql code for each snapshot partition
   chr 23 is XX and chr 24 is XY
*/
/*
snapshot_id = 1

print(f'CREATE TABLE IF NOT EXISTS genotype_stats_snapshot_{snapshot_id} PARTITION OF genotype_stats FOR VALUES FROM ({snapshot_id}) to ({snapshot_id+1}) partition by LIST (chr);')
for _chr in range(1,25):
    print(f'CREATE TABLE IF NOT EXISTS genotype_stats_snapshot_{snapshot_id}_chr_{_chr} partition of genotype_stats_snapshot_{snapshot_id} for values in ({_chr});')

*/


CREATE TABLE IF NOT EXISTS genotype_stats_snapshot_1 PARTITION OF genotype_stats FOR VALUES FROM (1) to (2) partition by LIST (chr);
CREATE TABLE IF NOT EXISTS genotype_stats_snapshot_1_chr_1 partition of genotype_stats_snapshot_1 for values in (1);
CREATE TABLE IF NOT EXISTS genotype_stats_snapshot_1_chr_2 partition of genotype_stats_snapshot_1 for values in (2);
CREATE TABLE IF NOT EXISTS genotype_stats_snapshot_1_chr_3 partition of genotype_stats_snapshot_1 for values in (3);
CREATE TABLE IF NOT EXISTS genotype_stats_snapshot_1_chr_4 partition of genotype_stats_snapshot_1 for values in (4);
CREATE TABLE IF NOT EXISTS genotype_stats_snapshot_1_chr_5 partition of genotype_stats_snapshot_1 for values in (5);
CREATE TABLE IF NOT EXISTS genotype_stats_snapshot_1_chr_6 partition of genotype_stats_snapshot_1 for values in (6);
CREATE TABLE IF NOT EXISTS genotype_stats_snapshot_1_chr_7 partition of genotype_stats_snapshot_1 for values in (7);
CREATE TABLE IF NOT EXISTS genotype_stats_snapshot_1_chr_8 partition of genotype_stats_snapshot_1 for values in (8);
CREATE TABLE IF NOT EXISTS genotype_stats_snapshot_1_chr_9 partition of genotype_stats_snapshot_1 for values in (9);
CREATE TABLE IF NOT EXISTS genotype_stats_snapshot_1_chr_10 partition of genotype_stats_snapshot_1 for values in (10);
CREATE TABLE IF NOT EXISTS genotype_stats_snapshot_1_chr_11 partition of genotype_stats_snapshot_1 for values in (11);
CREATE TABLE IF NOT EXISTS genotype_stats_snapshot_1_chr_12 partition of genotype_stats_snapshot_1 for values in (12);
CREATE TABLE IF NOT EXISTS genotype_stats_snapshot_1_chr_13 partition of genotype_stats_snapshot_1 for values in (13);
CREATE TABLE IF NOT EXISTS genotype_stats_snapshot_1_chr_14 partition of genotype_stats_snapshot_1 for values in (14);
CREATE TABLE IF NOT EXISTS genotype_stats_snapshot_1_chr_15 partition of genotype_stats_snapshot_1 for values in (15);
CREATE TABLE IF NOT EXISTS genotype_stats_snapshot_1_chr_16 partition of genotype_stats_snapshot_1 for values in (16);
CREATE TABLE IF NOT EXISTS genotype_stats_snapshot_1_chr_17 partition of genotype_stats_snapshot_1 for values in (17);
CREATE TABLE IF NOT EXISTS genotype_stats_snapshot_1_chr_18 partition of genotype_stats_snapshot_1 for values in (18);
CREATE TABLE IF NOT EXISTS genotype_stats_snapshot_1_chr_19 partition of genotype_stats_snapshot_1 for values in (19);
CREATE TABLE IF NOT EXISTS genotype_stats_snapshot_1_chr_20 partition of genotype_stats_snapshot_1 for values in (20);
CREATE TABLE IF NOT EXISTS genotype_stats_snapshot_1_chr_21 partition of genotype_stats_snapshot_1 for values in (21);
CREATE TABLE IF NOT EXISTS genotype_stats_snapshot_1_chr_22 partition of genotype_stats_snapshot_1 for values in (22);
CREATE TABLE IF NOT EXISTS genotype_stats_snapshot_1_chr_23 partition of genotype_stats_snapshot_1 for values in (23);
CREATE TABLE IF NOT EXISTS genotype_stats_snapshot_1_chr_24 partition of genotype_stats_snapshot_1 for values in (24);