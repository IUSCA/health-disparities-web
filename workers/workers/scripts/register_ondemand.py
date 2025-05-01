from pathlib import Path

import fire
from sca_rhythm import Workflow

import workers.api as api
import workers.workflow_utils as wf_utils
from workers.celery_app import app as celery_app
from workers.api import DatasetAlreadyExistsError


class Registration:
    def __init__(self, dataset_type):
        self.dataset_type = dataset_type
        self.wf_body = wf_utils.get_wf_body(wf_name='integrated')

    def register_candidate(self, dataset_name, dataset_path):
        print(f'registering {self.dataset_type} {dataset_name}')
        print(f'Dataset path: {dataset_path}')

        wf = Workflow(celery_app=celery_app, **self.wf_body)
        dataset_payload = {
            'name': dataset_name,
            'type': self.dataset_type,
            'workflow_id': wf.workflow['_id'],
            'origin_path': dataset_path,
        }

        # HTTP POST
        try:
            created_dataset = api.create_dataset(dataset_payload)
            wf.start(created_dataset['id'])
        except api.DatasetAlreadyExistsError:
            print(f'{dataset_name} already exists')
            return


if __name__ == '__main__':
    # argument parser
    parser = argparse.ArgumentParser(
        description='Register a dataset - kicks off a full workflow')
    parser.add_argument('dataset_name', type=str, help='Dataset Name')
    parser.add_argument('dataset_path', type=str, help='Dataset Path')
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('-r', '--raw-data', action='store_true', help="register raw_data dataset")
    group.add_argument('-d', '--data-product', action='store_true', help="register data_product dataset")

    @param path: full path to dataset
    @param data_product:
    @param raw_data:
    @param name: dataset name, default is directory name
    @return:
    """

    dataset_path = Path(args.dataset_path)
    dataset_name = args.dataset_name

    print(f'Dataset type: {dataset_type}')
    print(f'Dataset name: {dataset_name}')
    print(f'Dataset path: {str(dataset_path)}')

    dataset_path = Path(path).resolve()
    assert dataset_path.exists() and dataset_path.is_dir(), 'Invalid path'

    dataset_name = name or dataset_path.name
    reg = Registration(dataset_type)
    reg.register_candidate(dataset_name, str(dataset_path))


if __name__ == '__main__':
    fire.Fire(main)
