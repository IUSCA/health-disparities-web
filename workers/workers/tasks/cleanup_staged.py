import shutil
from pathlib import Path

from celery import Celery

import workers.api as api
import workers.config.celeryconfig as celeryconfig
from workers.dataset import get_bundle_staged_path

app = Celery("tasks")
app.config_from_object(celeryconfig)


def cleanup_staged(celery_task, dataset_id, **kwargs):
    dataset = api.get_dataset(dataset_id=dataset_id, bundle=True)
    staged_path = Path(dataset['staged_path'])
    bundle_path = Path(get_bundle_staged_path(dataset=dataset))

    if staged_path.exists():
        shutil.rmtree(staged_path)
    if bundle_path.exists():
        bundle_path.unlink()

    update_data = {
        'is_staged': False,
        'staged_path': None
    }

    api.update_dataset(dataset_id=dataset['id'], update_data=update_data)
    api.add_state_to_dataset(dataset_id=dataset['id'], state='PURGED')
    return dataset_id,
