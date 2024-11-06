from pathlib import Path

import fire
from celery import Celery
from celery.utils.log import get_task_logger
from sca_rhythm import Workflow

from workers.config import config, celeryconfig
from workers.variants.models.variant import copy_data

logger = get_task_logger(__name__)

app = Celery("tasks")
app.config_from_object(celeryconfig)


def done_file(csv_path):
    return csv_path.with_suffix('.done')


def copy_vcf(celery_task, dummy, csv_path=None, **kwargs):
    copy_data(csv_path)
    return dummy,


def main(csv_path, no_celery=False):
    """
    sequentially run COPY VARIANT for all .csv files in data_dir

    @param csv_path: path to .csv file
    @param no_celery: run without celery
    @return:
    """
    _csv_path = Path(csv_path).resolve()
    assert _csv_path.exists(), f'{_csv_path} does not exist'

    if no_celery:
        if done_file(_csv_path).exists():
            print(f'{_csv_path} already processed. Skipping.')
        copy_data(_csv_path)
        done_file(_csv_path).touch()

    else:
        steps = [{
            'name': csv_path.name,
            'task': 'copy_vcf',
            'queue': f'{config["app_id"]}.q',
            'kwargs': {
                'csv_file_path': str(csv_path),
            },
        }]

        wf_body = {
            'name': 'Copy VCF',
            'app_id': config['app_id'],
            'steps': steps
        }

        int_wf = Workflow(celery_app=app, **wf_body)
        int_wf.start(None)


if __name__ == '__main__':
    fire.Fire(main)
