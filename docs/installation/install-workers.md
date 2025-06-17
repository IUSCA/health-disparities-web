# Install Workers

## Setup Workers Environment
Install python 3.10
Install poetry 1.8.5
cd workers
poetry install --no-root
  this should create a virtual environment in workers/.venv


cd ..
run this `docker compose exec api node src/scripts/issue_token.js svc_tasks` and copy the token to workers/.env to set the `APP_API_TOKEN` variable.

## Ingest genotype data
- copy vcf files to data/genotype
- install bcftools and tabix

```
cd workers
poetry shell
```
Run the following commands in the workers virtual environment: (under poetry shell)

```
python -m workers.variants.resolve_samples \
  --data_dir ../data/genotype \
  --snapshot_id 1 \
  --source_id 1 \
  --output_dir data_ingestion/test \
  --set_name test
```

```
python -m workers.variants.resolve_samples \
  --data_dir ../data/genotype \
  --snapshot_id 1 \
  --source_id 1 \
  --output_dir data_ingestion/test \
  --set_name test \
  --mapping data_ingestion/test/new_participants.csv
```

```
./workers/scripts/genotype_data_ingestion/reheader.sh ../data/genotype ../data/genotype/reheader data_ingestion/test/sample_mapping.tab
```

```
python -m workers.variants.ingest_vcf \
  --data_dir ../data/genotype/reheader \
  --source_id 1 \
  --no_celery \
  --is_fresh
```
