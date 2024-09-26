from pathlib import Path

from celery import Celery
from celery.utils.log import get_task_logger

import workers.api as api
import workers.config.celeryconfig as celeryconfig
import workers.workflow_utils as wf_utils
from workers.config import config
from workers.tasks.stage import extract_tarfile

app = Celery("tasks")
app.config_from_object(celeryconfig)
logger = get_task_logger(__name__)


def stage(celery_task, dataset, stage_root: str) -> str:
    sda_bundle_path = dataset['archive_path']
    bundle_download_path = Path(config['paths']['scratch']) / dataset["bundle"]["name"]
    dataset_type = dataset['type']
    staging_dir = Path(stage_root or config['paths'][dataset_type]['stage']).resolve() / dataset["name"]

    wf_utils.download_file_from_sda(sda_file_path=sda_bundle_path,
                                    local_file_path=bundle_download_path,
                                    celery_task=celery_task)

    # extract the tar file to stage directory
    logger.info(f'extracting tar {bundle_download_path} to {staging_dir}')
    extract_tarfile(tar_path=bundle_download_path, target_dir=staging_dir, override_arcname=True)
    return str(staging_dir)


def stage_dataset(celery_task, dataset_id, stage_root_dir=None, **kwargs):
    dataset = api.get_dataset(dataset_id=dataset_id, bundle=True)
    staged_path = stage(celery_task, dataset, stage_root_dir)

    update_data = {
        'staged_path': staged_path,
    }
    api.update_dataset(dataset_id=dataset_id, update_data=update_data)
    api.add_state_to_dataset(dataset_id=dataset_id, state='FETCHED')
    return dataset_id,
