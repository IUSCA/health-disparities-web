import itertools
from pathlib import Path

import fire
import numpy as np
from celery import Celery
from celery.utils.log import get_task_logger
from cyvcf2 import VCF
from sca_rhythm import Workflow
from sca_rhythm.progress import Progress

from workers.config import config, celeryconfig
from workers.exceptions import IngestionFailed
from workers.utils import batched
from workers.variants.database import conn
from workers.variants.models import variant, participant
from workers.variants.models.variant import Variant

logger = get_task_logger(__name__)

app = Celery("tasks")
app.config_from_object(celeryconfig)


def count_records(vcf_file_path: str) -> int:
    """
    Count the number of records in a VCF file.
    """
    vcf = VCF(str(vcf_file_path))
    return sum(1 for _ in vcf)


def encode_genotype(genotype: tuple[int, int, bool]) -> int | None:
    """
    :param genotype: ex: (0,0,False)
    :return:

    ./. - -1
    ./0 - -1
    ./1 - -1
    0/0 - 0
    0/1 - 1
    1/0 - 1
    1/1 - 2

    .|. - -1
    .|1 - -1
    1|. - -1
    0|0 - 0
    0|1 - 1
    1|0 - 2
    1|1 - 3

    """
    a, b, phased = genotype
    if a == -1 or b == -1:
        return -1
    if not phased:
        return a + b
    else:
        if a == 0 and b == 0:
            return 0
        if a == 0 and b == 1:
            return 1
        if a == 1 and b == 0:
            return 2
        if a == 1 and b == 1:
            return 3


def encode_chromosome(chrom: str) -> int:
    try:
        if chrom.upper() in ['X', 'XX']:
            return 23
        if chrom.upper() in ['Y', 'YY']:
            return 24
        if chrom.isnumeric():
            if 1 <= int(chrom) <= 22:
                return int(chrom)
    except Exception as e:
        print('error in encoding chromosome', e)
        raise IngestionFailed(f'Unable to encode chromosome value {chrom}')
    raise IngestionFailed(f'Unable to encode chromosome value {chrom}')


def infer_phase(vcf_file_path: str) -> bool:
    """
    Infer the phase of the genotype data in a VCF file. 
    Assumes that the first variant is a representative of the entire file.
    """
    vcf = VCF(str(vcf_file_path))
    var = next(vcf)

    # check the phase of first variant in the first variant
    return bool(var.gt_phases[0])


class VCFIngestor:
    def __init__(self, vcf_file_path: str, source_id: int, batch_size: int = 100, celery_task=None):
        """
        Variants and genotype data is append-only.

        Before ingesting the genotype data, participants in the VCF are looked up:
        - Case-A: All new participants - creates participants
        - Case-B: All existing participants - does nothing
        - Case-C: Mix of new and existing participants - creates participants

        For each variant in the VCF:
        - Case-1: new variant and case-A,B,C - creates a new row with genotype data
        - Case-2: existing variant
            - Case A: updates genotype array
            - Case B: Assertion error / does nothing
            - Case C: Assertion error / skip existing participants and updates genotype array for new participants

        SQL creates for new variants
        SQL updates for existing variants and new participants

        Participant look up is performed using ib_id
        Variant look up is performed using (chr, pos, ref, alt, source_id)

        @param celery_task:
        @param vcf_file_path:
        @param source_id:
        @param batch_size:
        """
        self.vcf_file_path = vcf_file_path

        self.celery_task = celery_task
        self.source_id = source_id
        self.batch_size = batch_size

        self.idx_arr = np.array([])  # list of genotype array indices for each participant
        self.max_idx = None
        self.new_idx_arr = np.array([])
        self.new_idx_start, self.new_idx_end = None, None
        self.new_idx_mask = None

        try:
            self.vcf = VCF(vcf_file_path)
            self.samples = [int(s) for s in self.vcf.samples]
            self.phase = infer_phase(self.vcf_file_path)
        except Exception as e:
            message = f'Unable to open vcf at {vcf_file_path}'
            print(message, e)
            raise IngestionFailed(message)

        self.num_records = count_records(self.vcf_file_path)
        self.progress = None
        if self.celery_task:
            self.progress = Progress(celery_task=self.celery_task,
                                     name='ingest',
                                     units='variants',
                                     throttle_time=5,
                                     total=self.num_records)

    def log_progress(self, update):
        if self.progress:
            self.progress.update(update)
        else:
            print('progress: {} of {} ({}%)', update, self.num_records, round(100 * update / self.num_records))

    def resolve_gt_idx(self):
        """
        Resolve genotype index for each participant.
        """
        with conn.cursor() as cursor:
            pid_idx = participant.fetch_all_gt_idx(cursor)

        # last used index from the current participants in the db
        _max_idx = max([idx for idx in pid_idx.values() if idx is not None], default=0)

        # infinite generator for new indexes, next index starts from max_idx + 1
        new_idx_gen = itertools.count(start=_max_idx + 1)

        self.new_idx_mask = np.array([pid_idx[pid] is None for pid in self.samples])
        self.idx_arr = np.array([pid_idx[pid] or next(new_idx_gen) for pid in self.samples])
        self.new_idx_arr = self.idx_arr[self.new_idx_mask]
        self.new_idx_start, self.new_idx_end = min(self.new_idx_arr, default=None), max(self.new_idx_arr, default=None)
        self.max_idx = max(self.idx_arr, default=None)

        x = len(self.new_idx_arr)
        print(f'samples: {len(self.samples)}, curr: {len(self.samples) - x}, new: {x}')

    def update_participants(self):
        with conn.cursor() as cursor:
            try:
                updates = [
                    {'id': pid, 'genotype_idx': idx}
                    for pid, idx, is_new in zip(self.samples, self.idx_arr.tolist(), self.new_idx_mask)
                    if is_new
                ]
                participant.update_many_idx(cursor, updates=updates)
                conn.commit()
            except Exception as e:
                conn.rollback()
                raise e

    def make_create_params(self, genotype_vals: list[int]) -> list[int]:
        """
        Case: New Variant and (all new participants / mixed / all current participants)

        create a new array to use in insert variant row command

        ex:
        - idx:           [3, 7, 1, 5]
        - genotype_vals: [1, 0, 1,-1]
        - max_idx:       7

        reorganizing genotype values with idx as one-based indices:

        returns np.array([1, None, 1, None, -1, None, 0])

        @param genotype_vals: list of encoded genotype values in the same order as samples in VCF
        @return: numpy array of encoded genotype values reorganized by idx as one-based index
        """

        # create an empty array
        genotype_arr = np.array([None] * self.max_idx)

        # convert idx_arr to zero based indices
        _ids = self.idx_arr - 1

        # set genotype values by its id position
        genotype_arr[_ids] = genotype_vals

        return genotype_arr.tolist()

    def make_update_params(self, genotype_vals: list[int]) -> list[int]:
        """
        Case: Existing Variant and (all new participants / mixed)

        Create a subarray of genotype values for new participants, and rearrange it by their resolved (new) indices.

        The return value is used for a partial update of the genotype array in the database, 
        i.e. update values in the array only from start index to end index of the new participants.
        """
        new_genotype_vals = np.array(genotype_vals)[self.new_idx_mask]

        # create an empty array
        genotype_arr = np.array([None] * len(new_genotype_vals))

        # convert new idx to zero based indices
        _ids = self.new_idx_arr - self.new_idx_start

        # set genotype values by its id position
        genotype_arr[_ids] = new_genotype_vals

        return genotype_arr.tolist()

    def ingest(self):
        num_processed, num_updates, num_creates = 0, 0, 0

        for batch in batched(self.vcf, self.batch_size):
            # fetch all variant rows for the batch at once
            var_ids = [
                Variant(encode_chromosome(var.CHROM), var.POS, var.REF, var.ALT[0], self.source_id)
                for var in batch]
            curr_variants = set(variant.find_many(var_ids))

            # accumulate updates and create separately
            updates = []
            creates = []
            for var in batch:
                variant_id = Variant(encode_chromosome(var.CHROM), var.POS, var.REF, var.ALT[0], self.source_id)
                genotype_vals = [encode_genotype(gt) for gt in var.genotypes]

                if variant_id in curr_variants:  # variant exists in db
                    if len(self.new_idx_arr) > 0:
                        # add genotype data of new ids to the existing variant
                        genotype_arr = self.make_update_params(genotype_vals)
                        updates.append({
                            'lower_bound': self.new_idx_start,
                            'upper_bound': self.new_idx_end,
                            'genotype': genotype_arr,
                            'variant': variant_id
                        })
                else:  # new variant
                    genotype_arr = self.make_create_params(genotype_vals)
                    creates.append({
                        'variant': variant_id,
                        'phase': self.phase,
                        'genotype': genotype_arr
                    })

            # do updateMany and createMany
            if updates:
                variant.update_many(updates)
            if creates:
                variant.create_many(creates)

            num_processed += len(batch)
            num_updates += len(updates)
            num_creates += len(creates)
            self.log_progress(num_processed)

        return {
            'num_participants': len(self.vcf.samples),
            'new_participants': len(self.new_idx_arr),
            'num_records': self.num_records,
            'num_processed': num_processed,
            'num_updates': num_updates,
            'num_creates': num_creates
        }


# used to register celery task
def ingest_vcf(celery_task, dummy, vcf_file_path=None, source_id=None, batch_size=100, **kwargs):
    """
    Ingest VCF data into the database.

    Args:
      celery_task (object): The Celery task object.
      dummy: Dummy positional argument.
      vcf_file_path (str): Path to the VCF file.
      source_id (int): ID of the data source.
      batch_size (int, optional): Batch size for ingestion. Defaults to 100.
      **kwargs: Additional keyword arguments.

    Returns:
      tuple: A tuple containing the dummy argument and statistics of the ingestion process.
    """
    vcfIngestor = VCFIngestor(vcf_file_path, source_id, batch_size, celery_task)
    vcfIngestor.resolve_gt_idx()
    vcfIngestor.update_participants()
    stats = vcfIngestor.ingest()
    return dummy, stats


# used to either launch a workflow to run task 'ingest_vcf' on every vcf
# or directly run code to ingest data from command line based on no_celery falg
def ingest_data(data_dir, source_id, batch_size=100, no_celery=False):
    """
    Ingests the data in VCFs in data_dir.

    Launches a sequential workflow with as many steps as VCFs in the data_dir.
    Each step creates participants and variants if not already in the DB and updates corresponding genotype data.

    @param data_dir: path to directory with VCFs
    @param source_id: the database id of the data source to associate with variants
    @param batch_size: size of the batch create or updates issued to database
    @param no_celery:
    @return: None
    """
    data_dir = Path(data_dir).resolve()
    assert data_dir.exists(), f'{data_dir} does not exist'

    vcf_paths = list(data_dir.glob('*.vcf.gz'))
    assert len(vcf_paths) > 0, f'No .vcf.gz files in {data_dir}'

    if not no_celery:
        steps = []
        for vcf_path in vcf_paths:
            steps.append({
                'name': vcf_path.name,
                'task': 'ingest_vcf',
                'queue': f'{config["app_id"]}.q',
                'kwargs': {
                    'vcf_file_path': str(vcf_path),
                    'source_id': source_id,
                    'batch_size': batch_size
                },
            }, )

        wf_body = {
            'name': 'Ingest VCFs',
            'app_id': config['app_id'],
            'steps': steps
        }

        int_wf = Workflow(celery_app=app, **wf_body)
        int_wf.start(None)
    else:
        for vcf_path in vcf_paths:
            print('Ingesting', vcf_path)
            vcfIngestor = VCFIngestor(str(vcf_path), source_id, batch_size)
            vcfIngestor.resolve_gt_idx()
            vcfIngestor.update_participants()
            stats = vcfIngestor.ingest()
            print(stats)


if __name__ == '__main__':
    fire.Fire(ingest_data)
