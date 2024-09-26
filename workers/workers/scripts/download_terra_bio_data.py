import csv
from pathlib import Path
from urllib.parse import urlparse

from google.cloud import storage

path_keys = ['bge_single_sample_vcf_index_path',
             'bge_single_sample_vcf_md5_path',
             'bge_single_sample_vcf_path',
             'exome_gvcf_index_path',
             'exome_gvcf_md5_path',
             'exome_gvcf_path',
             'genome_crai_path',
             'genome_cram_md5_path',
             'genome_cram_path']


def get(bucket_name, blob_name, download_path):
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(blob_name)
    blob.download_to_filename(download_path)  # does integrity check?


def download_files(row: dict, download_root_dir: Path):
    id = row['entity:sample_id']
    download_dir = download_root_dir / id
    download_dir.mkdir(exist_ok=True)

    for key in path_keys:
        url = row.get(key, '').trim()
        if url:
            try:
                parsed_url = urlparse(url)
                bucket_name = parsed_url.netloc
                blob_name = parsed_url.path
                download_path = download_dir / Path(blob_name).name
                print(f'Downloading {url} to {download_path}')
                get(bucket_name, blob_name, download_path)
            except Exception as e:
                print(e)


def read_tsv(file_path):
    rows = []
    with open(file_path, newline='') as csvfile:
        reader = csv.DictReader(csvfile, delimiter='\t')
        for row in reader:
            rows.append(row)
    return rows


if __name__ == '__main__':
    download_root_dir = Path('/N/project/biobank/broad/2024-08/terra_bio_data/')
    download_root_dir.mkdir(exist_ok=True, parents=True)
    tsv_path = Path('/N/project/biobank/broad/2024-08/terra_bio_data.tsv')
    rows = read_tsv(tsv_path)
    # for row in rows:
    #     download_files(row, download_root_dir)
    download_files(rows[0], download_root_dir)
    print('Downloaded files.')
