import datetime

YEAR = datetime.datetime.now().year

config = {
    'app_id': 'biobank.sca.iu.edu',
    'api': {
        'base_url': 'https://biobank.sca.iu.edu/api/',  # trailing slash is required
    },
    'paths': {
        'scratch': '/N/scratch/biouser/biobank/production/scratch',
        'RAW_DATA': {
            'archive': f'production/{YEAR}/raw_data',
            'stage': '/N/scratch/biouser/biobank/production/stage/raw_data',
        },
        'DATA_PRODUCT': {
            'archive': f'production/{YEAR}/data_products',
            'stage': '/N/scratch/biouser/biobank/production/stage/data_products',
        },
        'download_dir': '/N/scratch/biouser/biobank/production/download',
        'root': '/N/scratch/biouser/'
    },
    'registration': {
        'DATA_PRODUCT': {
            'source_dir': '/N/project/biobank/phi_ingest_biobank_regeneron_KEEPTRXyunlong/WES/originalData/regeneron_grouped'
        },
    },
    'paths': {
        'scratch': '/N/scratch/scadev/bioloop/dev/scratch',
        'RAW_DATA': {
            'archive': f'dev/{YEAR}/raw_data',
            'stage': '/N/scratch/scadev/bioloop/dev/staged/raw_data',
        },
        'DATA_PRODUCT': {
            'archive': f'dev/{YEAR}/data_products',
            'stage': '/N/scratch/scadev/bioloop/dev/staged/data_products',
        },
        'download_dir': '/N/scratch/scadev/bioloop/dev/downloads',
        'root': '/N/scratch/scadev/'
    },
    'registration': {
        'RAW_DATA': {
            'source_dir': '/N/scratch/scadev/bioloop/dev/source/raw_data',
        },
        'DATA_PRODUCT': {
            'source_dir': '/N/scratch/scadev/bioloop/dev/source/data_products',
        },
        'recency_threshold_seconds': 10*60,
        'wait_between_stability_checks_seconds': 45
    },
    'service_user': 'scadev',
    'celery': {
        'queue': {
            'username': 'celery_dev',
            'url': 'commons3.sca.iu.edu:5672/celery_dev',
        },
        'mongo': {
            'username': 'celery_dev',
            'url': 'commons3.sca.iu.edu:27017/celery_dev?authSource=celery_dev',
        }
    },
    'variant_database': {
        'database': 'biobank',
        'user': 'biobank',
        'host': 'biobank-pg1.sca.iu.edu',
    }
}
