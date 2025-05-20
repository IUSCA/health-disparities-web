import datetime

YEAR = datetime.datetime.now().year

# Production overrides

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
            'bundle': {
                'generate': '/N/scratch/biouser/biobank/production/bundles/raw_data',
                'stage': '/N/scratch/biouser/biobank/production/bundles/raw_data',
            },
        },
        'DATA_PRODUCT': {
            'archive': f'production/{YEAR}/data_products',
            'stage': '/N/scratch/biouser/biobank/production/stage/data_products',
            'bundle': {
                'generate': '/N/scratch/biouser/biobank/production/bundles/data_products',
                'stage': '/N/scratch/biouser/biobank/production/bundles/data_products',
            },
        },
        'download_dir': '/N/scratch/biouser/biobank/production/download',
        'root': '/N/scratch/biouser/'
    },
    'registration': {
        'DATA_PRODUCT': {
            # cSpell: disable-next-line
            'source_dir': '/N/project/biobank/AnVIL_CCDG_WashU_CVD_Indiana_WGS/crams'
        },
    },
    'variant_database': {
        'database': 'biobank',
        'user': 'biobank',
        'host': 'biobank-pg1.sca.iu.edu',
    }
}
