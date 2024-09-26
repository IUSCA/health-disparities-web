import hashlib
import sys
from multiprocessing import Pool
from pathlib import Path
from tqdm import tqdm


def checksum(fname: Path | str):
    m = hashlib.md5()
    with open(str(fname), "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            m.update(chunk)
    return m.hexdigest()


def validate_checksums(d: Path):
    # find .gvcf.gz  and .gvcf.gz.md5sum files
    files = list(d.iterdir())
    gvcf = next((f for f in files if f.suffix == '.gvcf.gz'), None)
    md5sum = next((f for f in files if f.suffix == '.gvcf.gz.md5sum'), None)
    if gvcf and md5sum:
        # validate checksum
        with open(md5sum, 'r') as f:
            _checksum = f.read().strip()
        if _checksum != checksum(gvcf):
            print(f'Checksum mismatch for {gvcf}')

    # find .cram and .cram.md5 files
    cram = next((f for f in files if f.suffix == '.cram'), None)
    md5 = next((f for f in files if f.suffix == '.cram.md5'), None)
    if cram and md5:
        # validate checksum
        with open(md5, 'r') as f:
            _checksum = f.read().strip()
        if _checksum != checksum(cram):
            print(f'Checksum mismatch for {cram}')


if __name__ == '__main__':
    donwload_dir = sys.argv[1]
    download_dir = Path(donwload_dir).resolve()
    print(f'starting computations on 24 cores')

    dirs = list(download_dir.iterdir())
    with Pool(24) as pool:
        pool.map(validate_checksums, tqdm(dirs))
    # for d in download_dir.iterdir():
    #     validate_checksums(d)
