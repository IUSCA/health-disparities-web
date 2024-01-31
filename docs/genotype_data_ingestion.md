### Introduction

### Mapping samples to paritcipants
Assumption: VCFs for each chromosome in the given directory will have the same sample set (same header)

Mode-1: Without mapping
In this mode, the program attempts to resolve each sample in the VCF file to an "ib_id" (Identifier). Multiple strategies are employed for this resolution. If the program is unable to determine an "ib_id" for any given sample, it will generate a new_participants.csv file containing the problematic samples along with suggested "ib_id" values. The utility then exits, allowing users to manually update the "ib_id" values in the CSV file. Subsequent execution of the program with the mapping file provided will incorporate the corrected information.

<img src="assets/data_ingestion/resolve_samples_mode_1.png" >

Mode-2: With mapping
This mode is designed to handle scenarios where a mapping file is available or has been manually created. The program creates new participant entries if required, creates a genotype_set entry, and generates genotype_sample entries for all samples in the database. Additionally, it creates a genotype_set.txt file, containing the id of the created genotype_set entry in the db. A 'sample_mapping.tab' file is also generated, which is a tab-separated file providing information about samples and their corresponding participant_ids. This mapping file is intended for use in the reheader script.

<img src="assets/data_ingestion/resolve_samples_mode_2.png" >

```bash
cd /opt/sca/biobank/workers
poetry shell
python -m workers.variants.resolve_samples --data_dir /path/to/vcfs

vi sample_mapping.csv

python -m workers.variants.resolve_samples \
      --data_dir /path/to/vcfs \
      --mapping sample_mapping.csv \
      --snapshot_id <snapshot_id>
      --source_id <source_id> \
      --out_dir /path/to/output
```



### Environment Setup

```bash
module unload gcc python
module load gcc/9.3.0 python/3.9.8 bcftools tabix
```

### VCF Processing
Step 1 - Split 
Step 2 - Left Adjust
Step 3 - bzip
Step-4 - Reheader
Step-5 - Build Index

```bash
/opt/sca/biobank/workers/scripts/split_left_adj_reorder_index.sh \
    /path/to/vcf_dir \
    /path/to/output_dir \
    /path/to/reference_genome.fa \
    /path/to/sample_mapping.tab
```

### VCF Data Ingestion

```bash
cd /opt/sca/biobank/workers
poetry shell
python -m workers.variants.ingest_vcf
```


### Annotation Data Ingestion