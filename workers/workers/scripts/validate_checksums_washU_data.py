import hashlib
import logging
import os
import sys
from multiprocessing import Pool
from pathlib import Path

from tqdm import tqdm


def setup_logger(process_id: int, _log_dir: Path) -> logging.Logger:
    """Sets up a logger that writes to a log file for each process."""
    log_file = _log_dir / f"process_{process_id}.log"
    logger = logging.getLogger(f"process_{process_id}")
    logger.setLevel(logging.INFO)

    # Avoid adding multiple handlers in each process by clearing them first
    if logger.hasHandlers():
        logger.handlers.clear()

    # Create file handler which logs to the process-specific file
    fh = logging.FileHandler(log_file)
    fh.setLevel(logging.INFO)

    # Create formatter and add it to the handlers
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    fh.setFormatter(formatter)

    # Add the handler to the logger
    logger.addHandler(fh)

    return logger


def checksum(fname: Path | str):
    m = hashlib.md5()
    with open(str(fname), "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            m.update(chunk)
    return m.hexdigest()


def read_checksum(fname: Path):
    with open(fname, 'r') as f:
        return f.read().strip().split()[0]


def validate_checksums(d: Path, _log_dir: Path):
    process_id = os.getpid()
    logger = setup_logger(process_id, _log_dir)

    # find .gvcf.gz  and .gvcf.gz.md5sum files
    files = list(d.iterdir())

    # find .cram and .cram.md5 files
    cram = next((f for f in files if f.suffix == '.cram'), None)
    md5 = next((f for f in files if f.suffix == '.md5'), None)
    if cram and md5:
        # validate checksum
        _checksum = read_checksum(md5)
        if _checksum != checksum(cram):
            logger.error(f'mismatch - {cram}')
        else:
            logger.info(f'match - {cram}')
    else:
        logger.warning(f'No cram or md5 file found for {d}')


if __name__ == '__main__':
    download_dir = sys.argv[1]
    download_dir = Path(download_dir).resolve()
    n_cpu = 12

    # Create a directory for logs (or use a dedicated log directory)
    log_dir = download_dir / "logs"
    log_dir.mkdir(exist_ok=True)

    print(f'starting computations on {n_cpu} cores')

    dirs = [p for p in download_dir.iterdir() if p.is_dir() and p.name.startswith('TWCJ-INB')]  # cSpell: ignore TWCJ-INB
    with Pool(n_cpu) as pool:
        pool.starmap(validate_checksums, [(d, log_dir) for d in tqdm(dirs)])
