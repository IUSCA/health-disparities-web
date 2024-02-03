from pathlib import Path

import fire
from sca_rhythm import Workflow

import workers.api as api
import workers.workflow_utils as wf_utils
from workers.celery_app import app as celery_app


class Registration:
    def __init__(self, dataset_type):
        self.dataset_type = dataset_type
        self.wf_body = wf_utils.get_wf_body(wf_name='integrated')

    def register_candidate(self, dataset_name, dataset_path):
        print(f'registering {self.dataset_type} {dataset_name}')
        wf = Workflow(celery_app=celery_app, **self.wf_body)
        dataset = {
            'name': dataset_name,
            'type': self.dataset_type,
            'workflow_id': wf.workflow['_id'],
            'origin_path': dataset_path
        }
        # HTTP POST
        created_dataset = api.create_dataset(dataset)
        wf.start(created_dataset['id'])


def main(path, raw_data=False, data_product=False, name=None):
    """
    Register a dataset - kicks off a full workflow

    @param path: full path to dataset
    @param data_product:
    @param raw_data:
    @param name: dataset name, default is directory name
    @return:
    """

    assert raw_data ^ data_product, 'At least one or only one of raw_data or data_product should be provided'
    dataset_type = 'RAW_DATA' if raw_data else 'DATA_PRODUCT'

    dataset_path = Path(path).resolve()
    assert dataset_path.exists() and dataset_path.is_dir(), 'Invalid path'

    dataset_name = name or dataset_path.name
    reg = Registration(dataset_type)
    reg.register_candidate(dataset_name, str(dataset_path))


if __name__ == '__main__':
    fire.Fire(main)
