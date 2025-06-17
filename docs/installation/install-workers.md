<!-- cspell: ignore htslib reheadered -->
# Installing Biobank Workers

This guide will walk you through setting up the Biobank Workers environment from scratch. Each step is explained for beginners, with links to further resources.



## 1. Prerequisites

### Install Python 3.10

Biobank Workers requires Python 3.10.  
- [Download Python 3.10](https://www.python.org/downloads/release/python-3100/)
- Verify installation:
  ```bash
  python3 --version
  ```

### Install Poetry (version 1.8.5)

Poetry is used for Python dependency management.  
- [Poetry Installation Guide](https://python-poetry.org/docs/#installation)
- To install a specific version:
  ```bash
  curl -sSL https://install.python-poetry.org | python3 - --version 1.8.5
  ```
- Verify installation:
  ```bash
  poetry --version
  ```



## 2. Set Up the Workers Environment

1. **Navigate to the workers directory:**
   ```bash
   cd workers
   ```

2. **Install dependencies:**
   ```bash
   poetry install --no-root
   ```
   This will create a virtual environment in `workers/.venv`.



## 3. Configure API Token

The workers need an API token to communicate with the main API.

1. **Navigate back to the project root:**
   ```bash
   cd ..
   ```

2. **Issue a new API token:**
   ```bash
   docker compose exec api node src/scripts/issue_token.js svc_tasks
   ```
   - This command requires that application is set up and API service is running. see [Installation Guide](./install-docker.md) for details.

3. **Copy the generated token** and add it to `workers/.env` as the value for `APP_API_TOKEN`:
   ```
   APP_API_TOKEN=your_generated_token_here
   ```

   `.env` file should already exist if you followed the [Installation Guide](./install-docker.md). If it doesn't exist, create it with the following command:

   ```bash
   cp workers/.env.example workers/.env
   ```



## 4. Ingest Genotype Data

### Step 1: Prepare Genotype Data

- Copy your VCF files to the `data/genotype` directory. Create the directory if it doesn't exist:
  ```bash
  mkdir -p data/genotype
  ```

data directory is ignored by git, so you can safely copy your data there without worrying about it being tracked.

### Step 2: Install Required Tools

- **bcftools**: [Installation instructions](http://www.htslib.org/download/)
- **tabix**: [Installation instructions](http://www.htslib.org/doc/tabix.html)

#### Install with Homebrew on macOS

If you are using macOS, you can install both `bcftools` and `tabix` using [Homebrew](https://brew.sh/):

```bash
brew install bcftools htslib
```

- `tabix` is included as part of the `htslib` package.
- After installation, verify the tools are available:

```bash
bcftools --version
tabix --version
```


## 5. Activate the Python Environment

1. **Enter the workers directory:**
   ```bash
   cd workers
   ```

2. **Activate the Poetry shell:**
   ```bash
   poetry shell
   ```
   - This ensures all Python commands use the correct environment.



## 6. Run Data Processing Commands

Run the following commands inside the Poetry shell.

### a. Resolve Samples

This step resolves sample names in the VCF files and prepares them for ingestion.
  ```bash
  python -m workers.variants.resolve_samples \
    --data_dir ../data/genotype \
    --snapshot_id 1 \
    --source_id 1 \
    --output_dir data_ingestion/test \
    --set_name test
  ```

- **With mapping file:**
  ```bash
  python -m workers.variants.resolve_samples \
    --data_dir ../data/genotype \
    --snapshot_id 1 \
    --source_id 1 \
    --output_dir data_ingestion/test \
    --set_name test \
    --mapping data_ingestion/test/new_participants.csv
  ```

### b. Reheader VCF Files

- Run the reheader script:
  ```bash
  ./workers/scripts/genotype_data_ingestion/reheader.sh \
    ../data/genotype \
    ../data/genotype/reheader \
    data_ingestion/test/sample_mapping.tab
  ```
  - Make sure the script is executable: `chmod +x ./workers/scripts/genotype_data_ingestion/reheader.sh`

### c. Ingest VCF Data

- Ingest the reheadered VCF files:
  ```bash
  python -m workers.variants.ingest_vcf \
    --data_dir ../data/genotype/reheader \
    --source_id 1 \
    --no_celery \
    --is_fresh
  ```
