import csv
import itertools
import time
from pathlib import Path

import fire
import numpy as np
from celery import Celery
from celery.utils.log import get_task_logger
from cyvcf2 import VCF
from sca_rhythm import Workflow
from sca_rhythm.progress import Progress
from tqdm import tqdm

from workers.config import celeryconfig, config
from workers.exceptions import IngestionFailed
from workers.utils import batched
from workers.variants.database import conn
from workers.variants.models import participant, variant
from workers.variants.models.variant import Variant, copy_data
from workers.variants.utils import encode_chromosome, encode_value

logger = get_task_logger(__name__)

app = Celery("tasks")
app.config_from_object(celeryconfig)


# def count_records(vcf_file_path: str) -> int:
#     """
#     Count the number of records in a VCF file.
#     """
#     vcf = VCF(str(vcf_file_path))
#     return sum(1 for _ in vcf)


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
    1/1 - 3

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
    if a == 0 and b == 0:
        return 0
    if a == 0 and b == 1:
        return 1
    if a == 1 and b == 0:
        return 2
    if a == 1 and b == 1:
        return 3
    return None


def encode_genotype_vectorized(genotypes: np.ndarray) -> np.ndarray:
    """
    Vectorized version of encoding genotypes.

    :param genotypes: A 2D NumPy array of shape (n_samples, 3)
                      where each row is (a, b, phased).
    :return: A 1D NumPy array of encoded genotypes.
    """
    a = genotypes[:, 0]
    b = genotypes[:, 1]

    # Initialize an output array with the same shape as the number of rows
    output = np.full(a.shape, fill_value=np.nan, dtype=genotypes.dtype)

    # Conditions for the encoding
    mask_missing = (a == -1) | (b == -1)
    output[mask_missing] = -1

    mask_00 = (a == 0) & (b == 0)
    output[mask_00] = 0

    mask_01 = (a == 0) & (b == 1)
    output[mask_01] = 1

    mask_10 = (a == 1) & (b == 0)
    output[mask_10] = 2

    mask_11 = (a == 1) & (b == 1)
    output[mask_11] = 3

    return output


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
    def __init__(
        self,
        vcf_file_path: str,
        source_id: int,
        batch_size: int,
        celery_task=None,
        phase=None,
        is_imputed=None,
        include_dosage=False,
        **kwargs,
    ):
        """
        Variants and genotype data is append-only.

        Before ingesting the genotype data, participants in the VCF are looked up:
        - Case-A: All new participants - assigns new indexes to new participant
        - Case-B: All existing participants - does nothing
        - Case-C: Mix of new and existing participants - assigns new indexes to new participant

        For each variant in the VCF:
        - Case-1: new variant and case-A,B,C - creates a new row with genotype data
        - Case-2: existing variant
            - Case A: updates (extend) genotype array
            - Case B: does nothing
            - Case C: skip existing participants and updates (extend) genotype array for new participants

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
        self.include_dosage = include_dosage
        self.idx_arr = np.array(
            []
        )  # list of genotype array indices for each participant
        self.max_idx = None
        self.new_idx_arr = np.array([])
        self.new_idx_start, self.new_idx_end = None, None
        self.new_idx_mask = None

        self.is_imputed = is_imputed

        try:
            self.vcf = VCF(vcf_file_path)
            # list of participant ids
            # VCF is expected to have samples as participant ids - reheader step
            self.samples = [int(s) for s in self.vcf.samples]

            if phase is None:
                self.phase: bool = infer_phase(self.vcf_file_path)
            else:
                self.phase = phase
        except Exception as e:
            message = f"Unable to open vcf at {vcf_file_path}"
            print(message, e)
            raise IngestionFailed(message)

        self.num_records = self.vcf.num_records
        self.progress = None
        if self.celery_task:
            self.progress = Progress(
                celery_task=self.celery_task,
                name="ingest",
                units="variants",
                throttle_time=5,
                total=self.num_records,
            )
        else:
            self.t = tqdm(
                total=self.num_records,
                desc="Ingesting VCF",
                unit="variants",
                dynamic_ncols=True,
            )

    def log_progress(self, num_processed: int):
        if self.progress:
            self.progress.update(num_processed)
        else:
            # TODO: use tqdm to show progress
            # print(
            #     "progress: {} of {} ({}%)".format(
            #         num_processed, self.num_records, round(100 * num_processed / self.num_records)
            #     )
            # )
            increment = num_processed - self.t.n
            self.t.update(increment)

    def resolve_gt_idx(self):
        """
        Resolve genotype index for each participant in the VCF.
        """
        with conn.cursor() as cursor:
            pid_idx: dict[int, int] = participant.fetch_all_gt_idx(
                cursor, self.source_id
            )

        # last used index from the current participants in the db
        _max_idx = max([idx for idx in pid_idx.values() if idx is not None], default=0)

        # infinite generator for new indexes, next index starts from max_idx + 1
        new_idx_gen = itertools.count(start=_max_idx + 1)

        # new_idx_mask - True if participant never had a genotype index before
        self.new_idx_mask = np.array([pid_idx.get(pid) is None for pid in self.samples])

        # idx_arr - ndarray of genotype array indices for each participant
        self.idx_arr = np.array(
            [pid_idx.get(pid) or next(new_idx_gen) for pid in self.samples]
        )

        # new_idx_arr - genotype array indices for new participants
        self.new_idx_arr = self.idx_arr[self.new_idx_mask]

        # max and min indexes of new participants
        self.new_idx_start, self.new_idx_end = min(self.new_idx_arr, default=None), max(
            self.new_idx_arr, default=None
        )
        self.max_idx = max(self.idx_arr, default=None)

        x = len(self.new_idx_arr)
        print(f"samples: {len(self.samples)}, curr: {len(self.samples) - x}, new: {x}")

    def update_participants(self):
        with conn.cursor() as cursor:
            try:
                data = [
                    {
                        "participant_id": pid,
                        "genotype_idx": idx,
                        "source_id": self.source_id,
                    }
                    for pid, idx, is_new in zip(
                        self.samples, self.idx_arr.tolist(), self.new_idx_mask
                    )
                    if is_new
                ]
                if data:
                    participant.create_many_idx(cursor, data=data)
                    conn.commit()
            except Exception as e:
                conn.rollback()
                raise e

    def make_create_params(self, genotype_vals) -> list[int]:
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

    def make_update_params(self, genotype_vals) -> list[int]:
        """
        Case: Existing Variant and (all new participants / mixed)

        Create a sub array of genotype values for new participants, and rearrange it by their resolved (new) indices.

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
        """
        WARNING: Does not handle is_imputed, default phase, or dosage columns
        @return:
        """
        num_processed, num_updates, num_creates = 0, 0, 0
        print("ingestion start")
        batch_start_time = time.perf_counter()
        for batch in batched(self.vcf, self.batch_size):
            print(
                f"batch read time: {time.perf_counter() - batch_start_time:.3f} - num_processed: {num_processed}"
            )
            # fetch all variant rows for the batch at once
            var_ids = [
                Variant(
                    encode_chromosome(var.CHROM),
                    var.POS,
                    var.REF,
                    var.ALT[0],
                    self.source_id,
                )
                for var in batch
            ]
            query_start = time.perf_counter()
            curr_variants = set(variant.find_many(var_ids))
            print(f"query time: {time.perf_counter() - query_start:.3f}")

            # accumulate updates and create separately
            updates = []
            creates = []
            for var in batch:
                variant_id = Variant(
                    encode_chromosome(var.CHROM),
                    var.POS,
                    var.REF,
                    var.ALT[0],
                    self.source_id,
                )
                # genotype_vals = [encode_genotype(gt) for gt in var.genotypes]
                genotype_vals = encode_genotype_vectorized(
                    var.genotype.array()
                )  # vectorized encoding

                if variant_id in curr_variants:  # variant exists in db
                    if len(self.new_idx_arr) > 0:
                        # add genotype data of new ids to the existing variant
                        genotype_arr = self.make_update_params(genotype_vals)
                        updates.append(
                            {
                                "lower_bound": self.new_idx_start,
                                "upper_bound": self.new_idx_end,
                                "genotype": genotype_arr,
                                "variant": variant_id,
                            }
                        )
                else:  # new variant
                    genotype_arr = self.make_create_params(genotype_vals)
                    creates.append(
                        {
                            "variant": variant_id,
                            "phase": self.phase,
                            "genotype": genotype_arr,
                        }
                    )

            # do updateMany and createMany
            if updates:
                variant.update_many(updates)
            if creates:
                start_time = time.perf_counter()
                variant.create_many(creates)
                print(f"createMany time: {time.perf_counter() - start_time:.3f}")

            num_processed += len(batch)
            num_updates += len(updates)
            num_creates += len(creates)
            self.log_progress(num_processed)
            batch_start_time = time.perf_counter()

        return {
            "num_participants": len(self.vcf.samples),
            "new_participants": len(self.new_idx_arr),
            "num_records": self.num_records,
            "num_processed": num_processed,
            "num_updates": num_updates,
            "num_creates": num_creates,
        }

    def transform(self):
        """
        Transform the VCF data into csv format suitable for ingestion.
        """
        num_processed = 0

        csv_file_path = Path(self.vcf_file_path).with_suffix(".csv")
        column_names = [
            "chr",
            "pos",
            "ref",
            "alt",
            "source_id",
            "phase",
            "genotype",
            "is_imputed",
            "dosage",
        ]

        with open(csv_file_path, "w", newline="") as csvfile:
            csvWriter = csv.DictWriter(csvfile, fieldnames=column_names)
            csvWriter.writeheader()
            for batch in batched(self.vcf, self.batch_size):
                # batch_start_time = time.perf_counter()
                rows = []
                for var in batch:
                    if self.is_imputed == "infer":
                        is_imputed = var.INFO.get("IMPUTED", None) == "GLIMPSE"
                    else:
                        is_imputed = bool(self.is_imputed)

                    genotype_vals = encode_genotype_vectorized(
                        var.genotype.array()
                    )  # vectorized encoding

                    # when phase is False, replace 1|0 or 1/0 represented as 2 with 0/1 represented as 1
                    if not self.phase:
                        genotype_vals = np.where(genotype_vals == 2, 1, genotype_vals)

                    genotype_arr = self.make_create_params(genotype_vals)

                    # replace None with 'NULL' for postgres
                    genotype_arr = ["NULL" if x is None else x for x in genotype_arr]

                    d = {
                        "chr": encode_chromosome(var.CHROM),
                        "pos": var.POS,
                        "ref": var.REF,
                        "alt": var.ALT[0],
                        "source_id": self.source_id,
                        "phase": self.phase,
                        "is_imputed": is_imputed,
                        "genotype": genotype_arr,
                    }

                    if self.include_dosage:
                        if "DS" in var.FORMAT:
                            ds = var.format("DS")
                            dosage = (ds.reshape(-1) * 1000).astype(int).tolist()
                            d["dosage"] = dosage
                    else:
                        d["dosage"] = []

                    encoded_row = {key: encode_value(value) for key, value in d.items()}
                    rows.append(encoded_row)
                csvWriter.writerows(rows)
                num_processed += len(batch)
                # print(
                #     f"batch read time: {time.perf_counter() - batch_start_time:.3f} - num_processed: {num_processed}"
                # )
                self.log_progress(num_processed)

        # close the tqdm progress bar if it exists
        if not self.celery_task:
            self.t.close()
        return csv_file_path


# used to register celery task
def ingest_vcf(celery_task, dummy, **kwargs):
    """
    Ingest VCF data into the database.

    Args:
      celery_task (object): The Celery task object.
      dummy: Dummy positional argument.
      **kwargs: Additional keyword arguments.

    Returns:
      tuple: A tuple containing the dummy argument and statistics of the ingestion process.
    """
    vcfIngestor = VCFIngestor(celery_task=celery_task, **kwargs)
    vcfIngestor.resolve_gt_idx()
    vcfIngestor.update_participants()
    if not kwargs.get("is_fresh", False):
        stats = vcfIngestor.ingest()
        print(stats)
    else:
        csv_path = vcfIngestor.transform()
        print("Transformed to", csv_path)
        copy_data(csv_path)
        print("Copied to database")
        # delete csv file
        csv_path.unlink()
    return (dummy,)


# used to either launch a workflow to run task 'ingest_vcf' on every vcf
# or directly run code to ingest data from command line based on no_celery flag
def ingest_data(
    data_dir: str,
    source_id: int,
    batch_size: int = 1000,
    no_celery: bool = False,
    is_fresh: bool = False,
    phase: bool = None,
    is_imputed: bool = False,
    include_dosage: bool = False,
):
    """
    Ingests the data in VCFs in data_dir.

    Launches a sequential workflow with as many steps as VCFs in the data_dir.
    Each step creates participants and variants if not already in the DB and updates corresponding genotype data.

    @param data_dir: path to directory with VCFs
    @param source_id: the database id of the data source to associate with variants
    @param batch_size: size of the batch create or updates issued to database
    @param no_celery:
    @param is_fresh: if True, transform VCFs to CSVs and copy to database which is faster than batch create
    @param is_imputed: Always uses IMPUTED flag from VCF INFO field if available else uses the boolean flag passed here
    @param phase: If None, infer phase from the first variant in the VCF
    @return: None
    """
    # print all parameters one per line
    print("Ingesting data with parameters:")
    for key, value in locals().items():
        print(f"{key}: {value}")

    data_dir = Path(data_dir).resolve()
    assert data_dir.exists(), f"{data_dir} does not exist"

    vcf_paths = list(data_dir.glob("*.vcf.gz"))
    assert len(vcf_paths) > 0, f"No .vcf.gz files in {data_dir}"

    if not no_celery:
        for vcf_path in vcf_paths:
            steps = [
                {
                    "name": "ingest_vcf",
                    "task": "ingest_vcf",
                    "queue": f'{config["app_id"]}.q',
                    "kwargs": {
                        "vcf_file_path": str(vcf_path),
                        "source_id": source_id,
                        "batch_size": batch_size,
                        "is_fresh": is_fresh,
                        "phase": phase,
                        "is_imputed": is_imputed,
                        "include_dosage": include_dosage,
                    },
                }
            ]

            wf_body = {
                "name": f"Ingest VCF - {vcf_path.name}",
                "app_id": config["app_id"],
                "steps": steps,
            }

            int_wf = Workflow(celery_app=app, **wf_body)
            int_wf.start(None)
    else:
        for vcf_path in vcf_paths:
            ingest_vcf(
                None,
                None,
                vcf_file_path=str(vcf_path),
                source_id=source_id,
                batch_size=batch_size,
                is_fresh=is_fresh,
                phase=phase,
                is_imputed=is_imputed,
                include_dosage=include_dosage,
            )


if __name__ == "__main__":
    fire.Fire(ingest_data)
