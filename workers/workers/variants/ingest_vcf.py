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
    vcf = VCF(str(vcf_file_path))
    var = next(vcf)

    # check the phase of first sample in the first variant
    return bool(var.gt_phases[0])


class VCFIngestor:
    def __init__(self, celery_task, vcf_file_path: str, source_id: int, snapshot_id: int, batch_size: int = 100):
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
        @param snapshot_id:
        @param batch_size:
        """
        self.vcf_file_path = vcf_file_path

        self.celery_task = celery_task
        self.source_id = source_id
        self.snapshot_id = snapshot_id
        self.batch_size = batch_size

        self.ib_id_pid_map = {}
        self.new_ib_ids = []

        self.participant_ids = []
        self.max_pid = None
        self.new_participant_ids = []
        self.min_new_pid, self.max_new_pid = None, None
        self.new_participants_mask = None

        try:
            self.vcf = VCF(vcf_file_path)
            self.samples = list(self.vcf.samples)
            self.phase = infer_phase(self.vcf_file_path)
        except Exception as e:
            message = f'Unable to open vcf at {vcf_file_path}'
            print(message, e)
            raise IngestionFailed(message)

    def setup_participant_helper_data(self):
        # participant_ids in the same order as samples in the VCF
        self.participant_ids = [self.ib_id_pid_map[s] for s in self.samples]
        self.max_pid = max(self.participant_ids)

        # participant ids of newly created in the same order as samples in the VCF
        self.new_participant_ids = [self.ib_id_pid_map[_id] for _id in self.new_ib_ids]
        self.min_new_pid = min(self.new_participant_ids, default=None)
        self.max_new_pid = max(self.new_participant_ids, default=None)
        new_ib_ids_set = set(self.new_ib_ids)
        self.new_participants_mask = np.array([s in new_ib_ids_set for s in self.samples])

    def create_new_participants(self):
        with conn.cursor() as cursor:
            try:

                # find unregistered and registered participants, given samples
                ib_id_pid_map = participant.find_many(cursor, self.samples)
                curr_ib_ids, new_ib_ids = [], []

                for s in self.samples:
                    if s in ib_id_pid_map:
                        curr_ib_ids.append(s)
                    else:
                        new_ib_ids.append(s)

                print(f'samples: {len(self.samples)}, curr_ib_ids: {len(curr_ib_ids)}, new_ib_ids: {len(new_ib_ids)}')
                # create missing participants
                participant.create_many(cursor, new_ib_ids, self.snapshot_id)

                # create ib_id to participant id mapping
                self.ib_id_pid_map = participant.find_many(cursor, self.samples)
                self.new_ib_ids = new_ib_ids

                conn.commit()

            except Exception as e:
                # Rollback the transaction if an exception occurs
                conn.rollback()
                print(f"Error while creating participants, rolling back changes")
                raise e

        self.setup_participant_helper_data()

    def make_create_params(self, genotype_vals: list[int]) -> list[int]:
        """
        ex:
        - ib_id_pid_map: {'IB_A': 2, 'IB_B': 3, 'IB_D': 5, 'IB_F': 7}
        - samples:       ['IB_F', 'IB_B', 'IB_A', 'IB_D']
        - genotype_vals: [1,       0,      1,      -1]

        samples correspond to these ids: [7, 3, 2,  5]

        reorganizing genotype values with ids as one-based index:

        returns np.array([None, 1, 0, None, -1, None, 1])


        @param genotype_vals: list of encoded genotype values in the same order as samples in VCF
        @return: numpy array of encoded genotype values reorganized by participant id as one-based index
        """

        # create an empty array
        genotype_arr = np.array([None] * self.max_pid)

        # convert participant_ids to zero based indices
        _ids = np.array(self.participant_ids) - 1

        # set genotype values by its id position
        genotype_arr[_ids] = genotype_vals

        return genotype_arr.tolist()

    def make_update_params(self, genotype_vals: list[int]) -> list[int]:
        """
        ex:
        - ib_id_pid_map: {'IB_A': 2, 'IB_B': 3, 'IB_D': 5, 'IB_E': 6, 'IB_F': 7}
        - new_ib_ids:       ['IB_F', 'IB_D', 'IB_E']
        - genotype_vals: [1, 0, 1, 1, -1]

        samples correspond to these ids: [7, 5, 6]

        returns np.array([-1, 1, 1])


        @param genotype_vals: list of encoded genotype values in the same order as samples in VCF
        @return:
        """
        new_genotype_vals = np.array(genotype_vals)[self.new_participants_mask]

        size = self.max_new_pid - self.min_new_pid + 1

        # create an empty array
        genotype_arr = np.array([None] * size)

        # convert participant_ids to zero based indices
        _ids = np.array(self.new_participant_ids) - self.max_new_pid

        # set genotype values by its id position
        genotype_arr[_ids] = new_genotype_vals

        return genotype_arr.tolist()

    def ingest(self):
        num_records = count_records(self.vcf_file_path)
        num_processed, num_updates, num_creates = 0, 0, 0
        progress = Progress(celery_task=self.celery_task,
                            name='ingest',
                            units='variants',
                            throttle_time=5,
                            total=num_records)
        for batch in batched(self.vcf, self.batch_size):
            # fetch all rows for the batch at once
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

                if variant_id in curr_variants:
                    # variant exists in db
                    if len(self.new_ib_ids) > 0:
                        # add genotype data of new ids to the existing variant
                        genotype_arr = self.make_update_params(genotype_vals)
                        updates.append({
                            'lower_bound': self.min_new_pid,
                            'upper_bound': self.max_new_pid,
                            'genotype': genotype_arr,
                            'variant': variant_id
                        })
                else:
                    # new variant
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
            progress.update(num_processed)

        return {
            'num_participants': len(self.vcf.samples),
            'new_participants': len(self.new_ib_ids),
            'num_records': num_records,
            'num_processed': num_processed,
            'num_updates': num_updates,
            'num_creates': num_creates
        }


def ingest_vcf(celery_task, dummy, vcf_file_path=None, source_id=None, snapshot_id=None, batch_size=100, **kwargs):
    """
    Ingest VCF data into the database.

    Args:
      celery_task (object): The Celery task object.
      dummy: Dummy positional argument.
      vcf_file_path (str): Path to the VCF file.
      source_id (int): ID of the data source.
      snapshot_id (int): ID of the snapshot.
      batch_size (int, optional): Batch size for ingestion. Defaults to 100.
      **kwargs: Additional keyword arguments.

    Returns:
      tuple: A tuple containing the dummy argument and statistics of the ingestion process.
    """
    vcfIngestor = VCFIngestor(celery_task, vcf_file_path, source_id, snapshot_id, batch_size)
    vcfIngestor.create_new_participants()
    stats = vcfIngestor.ingest()
    return dummy, stats


def ingest_data(data_dir, source_id, snapshot_id, batch_size=100):
    """
    Ingests the data in VCFs in data_dir and associate with snapshot_id.

    Launches a sequential workflow with as many steps as VCFs in the data_dir.
    Each step creates participants and variants if not already in the DB and updates corresponding genotype data.

    @param data_dir: path to directory with VCFs
    @param source_id: the database id of the data source to associate with variants
    @param snapshot_id: new participants are created using this snapshot_id
    @param batch_size: size of the batch create or updates issued to database
    @return: None
    """
    data_dir = Path(data_dir).resolve()
    assert data_dir.exists(), f'{data_dir} does not exist'

    vcf_paths = list(data_dir.glob('*.vcf.gz'))

    assert len(vcf_paths) > 0, f'No .vcf.gz files in {data_dir}'

    steps = []
    for vcf_path in vcf_paths:
        steps.append({
            'name': vcf_path.name,
            'task': 'ingest_vcf',
            'queue': f'{config["app_id"]}.q',
            'kwargs': {
                'vcf_file_path': str(vcf_path),
                'source_id': source_id,
                'snapshot_id': snapshot_id,
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


if __name__ == '__main__':
    fire.Fire(ingest_data)
