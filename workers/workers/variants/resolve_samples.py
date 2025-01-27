import csv
import textwrap
from pathlib import Path

import fire
from cyvcf2 import VCF

from workers import api, utils
from workers.variants.database import conn
from workers.variants.models import participant

CSV_HEADER_SAMPLE = 'sample'
CSV_HEADER_IBID = 'ib_id'
CSV_MAPPING_FILE_NAME = 'new_participants.csv'
TAB_MAPPING_FILE_NAME = 'sample_mapping.tab'


def read_sample_mapping(sample_mapping_path: str) -> dict:
    p = Path(sample_mapping_path).resolve()
    if not p.exists():
        raise Exception(f'Sample Mapping file is not found at {p}')

    with open(p, newline='') as csvfile:
        reader = csv.reader(csvfile)
        header = next(reader)
        expected_header = [CSV_HEADER_SAMPLE, CSV_HEADER_IBID]
        if header != expected_header:
            raise Exception(f'Unexpected header {header}. excepted: {expected_header}')

    d = {}
    with open(p, newline='') as csvfile:
        reader = csv.DictReader(csvfile)
        for idx, row in enumerate(reader):
            sample = row[CSV_HEADER_SAMPLE]
            ib_id = row[CSV_HEADER_IBID]

            if not sample or not ib_id:
                raise Exception(f'Empty value at line {idx + 2}')

            d[sample] = ib_id

    return d


def write_sample_mapping(mapping, filename, header=True, delimiter=','):
    with open(filename, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile, delimiter=delimiter)
        if header:
            writer.writerow([CSV_HEADER_SAMPLE, CSV_HEADER_IBID])

        for sample, _id in mapping.items():
            writer.writerow([sample, _id])


def get_file_metadata(f: Path):
    file_size = f.lstat().st_size
    hex_digest = utils.checksum(f)
    return {
        'name': f.name,
        'path': str(f),
        'md5': hex_digest,
        'size': file_size,
    }


def create_genotype_set(data_dir: Path, snapshot_id, source_id, name):
    d = {
        'path': str(data_dir),
    }
    name = name or data_dir.name
    row = api.create_genotype_set(name=name, snapshot_id=snapshot_id, source_id=source_id, data=d)
    return row['id']


def create_sample_mappings(sample_pid_map, set_id):
    data = []
    for [sample, participant_id] in sample_pid_map.items():
        data.append({
            'sample': sample,
            'participant_id': participant_id,
            'set_id': set_id
        })
    api.create_sample_mappings(data)


def main(data_dir: str,
         snapshot_id: int,
         source_id: int,
         mapping: str = None,
         output_dir: str = None,
         set_name=None,
         use_custom_transform=False):
    """
    A program to resolve samples in VCF to participants

    Mode-1: Without mapping
    In this mode, the program attempts to resolve each sample in the VCF file to an "ib_id" (Identifier).
    Multiple strategies are employed for this resolution. If the program is unable to determine an "ib_id" for any
    given sample, it will generate a new_participants.csv file containing the problematic samples along with suggested
    "ib_id" values. The utility then exits, allowing users to manually update the "ib_id" values in the CSV file.
    Subsequent execution of the program with the mapping file provided will incorporate the corrected information.

    Mode-2: With mapping
    This mode is designed to handle scenarios where a mapping file is available or has been manually created.
    The program creates new participant entries if required, creates a genotype_set entry,
    and generates genotype_sample entries for all samples in the database.
    Additionally, it creates a genotype_set.txt file, containing the id of the created genotype_set entry in the db.
    A 'sample_mapping.tab' file is also generated, which is a tab-separated file providing information about samples
    and their corresponding participant_ids. This mapping file is intended for use in the reheader script.
    """
    # When sample_mapping_path is provided, snapshot_id and source_id must be provided as well
    sample_mapping_path = mapping

    output_dir = Path(output_dir or '').resolve()
    output_dir.mkdir(exist_ok=True, parents=True)
    csv_mapping_file_path = output_dir / CSV_MAPPING_FILE_NAME
    tab_mapping_file_path = output_dir / TAB_MAPPING_FILE_NAME

    data_dir = Path(data_dir).resolve()
    vcf_files = list(data_dir.glob('*.vcf.gz')) + list(data_dir.glob('*.vcf'))
    print(f'found {len(vcf_files)} vcfs')
    if len(vcf_files) == 0:
        return

    # Fetch
    # 1. ib_id_map:         IB_ID -> participant_id mapping from participant table
    # 2. sample_map:        sample -> participant_id mapping from genotype_sample table
    # 3. user_sample_map:   sample -> IB_ID mapping from csv file provided by users
    # 4. sample_ids:        List of samples among all VCFs in the data_dir
    with conn.cursor() as cursor:
        ib_id_map = participant.fetch_all(cursor)
    print(f'fetched {len(ib_id_map)} IB_ID to participant id mappings.')

    sample_map = {row['sample']: row['participant_id'] for row in api.get_distinct_genotype_samples()}
    print(f'fetched {len(sample_map)} previous sample to participant id mappings.')

    user_sample_map = {}
    if sample_mapping_path:
        user_sample_map = read_sample_mapping(sample_mapping_path)  # sample to ib id map
        print(f'fetched {len(user_sample_map)} sample to IB_ID mappings from the provided file.')

    samples = set()
    for vcf_file in vcf_files:
        vcf = VCF(str(vcf_file))
        samples.update(set(vcf.samples))
    print(f'\nresolving {len(samples)} samples from VCFs ...')

    # resolve these sample_ids
    sample_pid_map, unmatched, new_sample_map = resolve_sample_ids(
        samples,
        ib_id_map,
        sample_map,
        user_sample_map,
        custom_transform=custom_sample_id_transform if use_custom_transform else None
    )
    print(textwrap.dedent(f'''\
        resolved:           {len(sample_pid_map)}
        unresolved:         {len(unmatched)}
        new participants:   {len(new_sample_map)}
        
        '''))

    # If there are unmatched samples, merge unmatched and user_sample_map and write to file
    # Program exits
    if len(unmatched) > 0:
        for k, v in unmatched.items():
            user_sample_map[k] = v
        write_sample_mapping(user_sample_map, csv_mapping_file_path)
        print(textwrap.dedent(f'''\
            Writing the unmatched samples with their suggested IB_IDs along with user provided sample mappings 
            to {csv_mapping_file_path}
            After reviewing, rerun this program with these flags:
            
            --mapping <path_to_csv> --snapshot_id <number> --source_id <number>
            '''))
        return

    # If there are no unmatched samples,
    # it means all sample_ids are resolved into either existing participants and new participants to create
    if len(new_sample_map) > 0:
        try:
            with conn.cursor() as cursor:
                new_ib_ids = list(new_sample_map.values())
                participant.create_many(cursor, new_ib_ids, snapshot_id)
                # after creation, get ids of newly created participants and update sample_pid_map
                created_ibid_pid_map = participant.find_many(cursor, new_ib_ids)
                conn.commit()
                print(f'created {len(new_ib_ids)} participants in the database')
        except Exception as e:
            conn.rollback()
            raise e

        for s, ib_id in new_sample_map.items():
            pid = created_ibid_pid_map[ib_id]
            sample_pid_map[s] = pid

        print(f'Resolved samples after creating participants: {len(sample_pid_map)}')

    # create genotype_set
    set_id = create_genotype_set(data_dir, snapshot_id, source_id, set_name)
    print(f'created genotype_set. id: {set_id}')

    # create genotype_sample entries
    create_sample_mappings(sample_pid_map, set_id)
    print(f'created genotype_sample entries')

    # write to tab separated file to be used in the reheader script
    write_sample_mapping(sample_pid_map, filename=tab_mapping_file_path, header=False, delimiter='\t')
    print(f'created mapping file {tab_mapping_file_path}')


def custom_sample_id_transform(sample_id: str) -> str:
    """
    Transform sample id to ib_id for regeneron samples. Split by '_' and return the second part.
    To be used with regeneron samples.

    @param sample_id:
    @return:
    """
    parts = sample_id.split('_')
    if 2 <= len(parts) <= 3:
        return parts[1]


def resolve_sample_ids(sample_ids,
                       ib_id_map,
                       gt_sample_map,
                       user_provided,
                       custom_transform=None) -> tuple[dict[str, int], dict[str, str], dict[str, str]]:
    """
    :param sample_ids: list of sample ids from the vcf file
    :param ib_id_map: map of ib_id to participant_id
    :param gt_sample_map: map of sample to participant_id previously resolved from genotype_sample table
    :param user_provided: map of sample to ib_id
    :param custom_transform: function to transform sample id to ib_id

    :return: sample_pid_map, unmatched, new_participants

    sample_pid_map: map of sample to participant_id
    unmatched: map of sample to a recommended ib_id
    new_participants: map of sample to ib_ids that are not in the participant table
    """
    unmatched: dict[str, str] = {}
    sample_pid_map: dict[str, int] = {}
    new_participants: dict[str, str] = {}

    for s in sample_ids:
        s_canon = s.upper()
        s_user = user_provided.get(s, None)
        s_transformed = None

        # check if the sample (uppercase) is one of the ib ids in the participant table
        # check if the sample (no transformation) is one of the samples in the genotype_sample table
        pid = ib_id_map.get(s_canon, None) or gt_sample_map.get(s, None)

        # check if user provided id is one of the ib ids in the participant table
        if pid is None and s_user is not None:
            pid = ib_id_map.get(s_user, None)

        # check if the sample after transformation is one of the ib ids in the participant table
        if custom_transform is not None and pid is None:
            s_transformed = custom_transform(s)
            if s_transformed is not None:
                pid = ib_id_map.get(s_transformed, None)

        if pid is not None:
            # pid is found
            sample_pid_map[s] = pid
        elif s in user_provided:
            # pid is not found but user has provided an ib_id
            new_participants[s] = s_user
        else:
            # pid is not found and user has not provided an ib_id
            if s_transformed is not None:
                unmatched[s] = s_transformed
            else:
                unmatched[s] = s_canon

    return sample_pid_map, unmatched, new_participants


if __name__ == '__main__':
    fire.Fire(main)
