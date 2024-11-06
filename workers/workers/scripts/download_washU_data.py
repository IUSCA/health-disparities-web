import csv
import logging
import subprocess
import sys
from pathlib import Path

# Configure the logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


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


def download_files(sample_id: str, download_root_dir: Path):
    cmd = ['gsutil', '-u', 'in-mmge-indiana-biobank', '-m', 'cp', '-r',
           f'gs://fc-secure-65eb240a-fda1-4c9b-90ff-2476751bc967/{sample_id}', download_root_dir]

    try:
        logger.info(cmd)
        execute(cmd)
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
    download_root_dir = sys.argv[1]
    download_root_dir = Path(download_root_dir).resolve()
    logger.info(f'download_root_dir: {download_root_dir}')
    
    download_root_dir.mkdir(exist_ok=True, parents=True)

    samples_txt_file = '/N/project/biobank/AnVIL_CCDG_WashU_CVD_Indiana_WGS/missing_samples.txt'
    with open(samples_txt_file) as f:
        samples = f.readlines()

    logger.info(f'number of samples: {len(samples)}')
    for i, row in enumerate(samples):
        logger.info(f'downloading sample #{i} {row}')
        download_files(row, download_root_dir)
        logger.info('downloaded.\n\n\n')
    logger.info('Downloaded files.')
