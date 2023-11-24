from pathlib import Path

import numpy as np
import numpy.typing as npt
from cyvcf2 import VCF
from sca_rhythm.progress import Progress

from workers.config import config
from workers.utils import batched
from workers.variants.models import variant, participant
from workers.variants.utils import encode_genotype


def ingest_data(data_dir, study_id, snapshot_id, batch_size=100):
    """
    Ingests the data in VCFs in data_dir and associate with snapshot_id and study_id.

    Launches a sequential workflow with as many steps as VCFs in the data_dir.

    Each step creates participants and variants if not already in the DB and updates corresponding genotype data.
    It also computes the allele counts and allele number after the genotype update using the full data.

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

    Another SQL query is used to calculate and update allele count and allele numbers. Computation is performed on DB.

    Participant look up is performed using (ib_id, study_id)

    Variant look up is performed using (chr, pos, ref, alt)

    @param data_dir: path to directory with VCFs
    @param study_id: study_id of the participants in VCF
    @param snapshot_id: new participants are created using this snapshot_id
    @param batch_size:
    @return: None
    """
    data_dir = Path(data_dir)
    assert data_dir.exists(), f'{data_dir} does not exist'

    vcf_paths = list(data_dir.glob('*.vcf.gz'))

    wf_body = {
        'name': 'Ingest VCFs',
        'app_id': config['app_id']
    }
    steps = []

    for vcf_path in vcf_paths:
        steps.append({
            'name': 'await stability',
            'task': 'await_stability',
            'queue': f'{config["app_id"]}.q',
            'args': {
                'vcf_file_path': str(vcf_path),
                'study_id': study_id,
                'snapshot_id': snapshot_id,
                'batch_size': batch_size
            },
        }, )

    wf_body['steps'] = steps


class VCFIngestor:
    def __init__(self, celery_task, vcf_file_path, study_id, snapshot_id, batch_size=100):
        self.celery_task = celery_task
        self.study_id = study_id
        self.snapshot_id = snapshot_id
        self.batch_size = batch_size

        self.vcf = VCF(vcf_file_path)
        self.samples = list(self.vcf.samples)

        self.curr_ib_ids, self.new_ib_ids = self.split_ids()

        # create missing participants
        participant.create_many(self.new_ib_ids, self.study_id, self.snapshot_id)

        # create ib_id to participant id mapping
        self.ib_id_pid_map = participant.find_many(ib_id_study_ids=[(ib_id, study_id) for ib_id in self.samples])

        # participant_ids in the same order as of samples from VCF
        self.participant_ids = [self.ib_id_pid_map[s] for s in self.samples]
        self.max_pid = max(self.participant_ids)

        # participant ids of newly created in the same order as of samples from VCF
        self.new_participant_ids = [self.ib_id_pid_map[_id] for _id in self.new_ib_ids]
        self.min_new_pid, self.max_new_pid = min(self.new_participant_ids), max(self.new_participant_ids)
        self.new_participants_mask = np.array([s in set(self.new_ib_ids) for s in self.samples])

    def split_ids(self) -> tuple[list[str], list[str]]:
        """
        From the given samples, return two lists,
        curr_ib_ids - in the database participants table
        new_ib_ids - not in the database participants table

        These two lists maintain the order of ids same as the samples

        @return: tuple
        """
        # find unregistered and registered participants, given samples
        ib_id_pid_map = participant.find_many(ib_id_study_ids=[(ib_id, self.study_id) for ib_id in self.samples])
        curr_ib_ids = []
        new_ib_ids = []

        for s in self.samples:
            if s in ib_id_pid_map:
                curr_ib_ids.append(s)
            else:
                new_ib_ids.append(s)

        return curr_ib_ids, new_ib_ids

    def make_create_params(self, genotype_vals: list[int]) -> npt.NDArray:
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

        return genotype_arr

    def make_update_params(self, genotype_vals: list[int]) -> npt.NDArray:
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

        return genotype_arr

    def ingest(self):
        n_pos = 0
        progress = Progress(celery_task=self.celery_task, units='positions')
        for batch in batched(self.vcf, self.batch_size):
            # fetch all rows for the batch at once
            params = [(var.CHR, var.POS, var.REF, var.ALT[0]) for var in batch]
            variant_id_db_row_map = variant.find_many(params)

            # accumulate updates and create separately
            updates = []
            creates = []
            for var in batch:
                variant_id = (var.CHR, var.POS, var.REF, var.ALT[0])
                genotype_vals = [encode_genotype(gt) for gt in var.genotypes]
                var_row = variant_id_db_row_map.get(variant_id, None)

                if var_row:
                    # variant exists in db
                    genotype_arr = self.make_update_params(genotype_vals)
                    updates.append((self.min_new_pid, self.max_new_pid, genotype_arr, *variant_id))
                else:
                    # new variant
                    genotype_arr = self.make_create_params(genotype_vals)
                    creates.append((*variant_id, genotype_arr))

            # do updateMany and createMany
            if updates:
                variant.update_many(updates)
            if creates:
                variant.create_many(creates)

            n_pos += len(batch)
            progress.update(n_pos)

        print(f'Samples: {len(self.samples)}')
        print(f'Positions: {n_pos}')


def ingest_vcf(celery_task, vcf_file_path=None, study_id=None, snapshot_id=None, batch_size=100, **kwargs):
    VCFIngestor(celery_task, vcf_file_path, study_id, snapshot_id, batch_size).ingest()
