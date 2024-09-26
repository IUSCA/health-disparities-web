import csv
import logging
import subprocess
import sys
from pathlib import Path

from google.cloud import storage

# Configure the logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

path_keys = [
    'exome_gvcf_index_path',
    'exome_gvcf_md5_path',
    'exome_gvcf_path',
    'genome_crai_path',
    'genome_cram_md5_path',
    'genome_cram_path'
]


class SubprocessError(Exception):
    pass


def execute(cmd: list[str], **kwargs) -> tuple[str, str]:
    """
    returns stdout, stderr (strings)
    if the return code is not zero, SubprocessError is raised with a dict of
    {
        'return_code': 1,
        'stdout': '',
        'stderr': '',
        'args': []
    }
    """
    kwargs.pop('capture_output', None)
    kwargs.pop('text', None)
    p = subprocess.run(cmd, capture_output=True, text=True, **kwargs)
    if p.returncode != 0:
        msg = {
            'return_code': p.returncode,
            'stdout': p.stdout,
            'stderr': p.stderr,
            'args': p.args
        }
        raise SubprocessError(msg)
    return p.stdout, p.stderr


def get(bucket_name, blob_name, download_path):
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(blob_name)
    blob.download_to_filename(download_path)  # does integrity check?


def download_files(row: dict, download_root_dir: Path):
    sample_id = row['entity:sample_id']
    download_dir = download_root_dir / sample_id
    download_dir.mkdir(exist_ok=True)

    urls = [url for key in path_keys if (url := row.get(key, '').strip())]

    try:
        logger.info(f'Downloading {download_dir}')
        execute(['gsutil', '-m', 'cp'] + urls + [str(download_dir)])
    except Exception as e:
        logger.error(e)


def read_tsv(file_path):
    rows = []
    with open(file_path, newline='') as csvfile:
        reader = csv.DictReader(csvfile, delimiter='\t')
        for row in reader:
            rows.append(row)
    return rows


if __name__ == '__main__':
    start_idx, end_idx, download_root_dir = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
    download_root_dir = Path(download_root_dir).resolve()
    logger.info(f'start_idx: {start_idx}, end_idx: {end_idx}, download_root_dir: {download_root_dir}')

    # download_root_dir = Path('/N/project/biobank/broad/2024-08/terra_bio_data/')
    download_root_dir.mkdir(exist_ok=True, parents=True)
    tsv_path = Path('/N/project/biobank/broad/2024-08/terra_bio_data.tsv')
    rows = read_tsv(tsv_path)
    logger.info(f'number of samples: {len(rows)}')
    # start_idx = 2097
    for i, row in enumerate(rows[start_idx:end_idx]):
        logger.info(f'downloading sample #{start_idx + i}')
        download_files(row, download_root_dir)
        logger.info('downloaded.\n\n\n')
    # download_files(rows[0], download_root_dir)
    logger.info('Downloaded files.')
