import numpy as np
from cyvcf2 import VCF

from workers.exceptions import IngestionFailed


def merge_genotype_arrays(previous_genotype: list[int],
                          participant_ids: list[int],
                          max_participant_id: int,
                          genotype_vals: list[int]):
    """

    @param previous_genotype: array of {0,1,2} where position in array corresponds to participant_id
    @param participant_ids: participant_ids from current vcf
    @param max_participant_id:
    @param genotype_vals: genotypes from current vcf
    @return:
    """
    n = len(previous_genotype)

    # create an array so that it fits all available subject_ids
    x = np.array([None] * max(n, max_participant_id))

    # set first n elements with previous values
    x[np.arange(n)] = np.array(previous_genotype)

    # convert subject_ids to zero based indices
    _ids = np.array(participant_ids) - 1

    # set values at these indices - existing values will get overwritten
    x[_ids] = genotype_vals
    return x


def count_records(vcf_file_path: str) -> int:
    """
    Count the number of records in a VCF file.
    """
    vcf = VCF(str(vcf_file_path))
    return sum(1 for _ in vcf)


def decode_chromosome(chrom: int) -> str:
    """
    Decode chromosome number to string.

    :param chrom: Chromosome number.
    :return: Chromosome string.
    """
    assert 1 <= chrom < 25
    if chrom <= 22:
        return str(chrom)
    elif chrom == 23:
        return 'X'
    else:
        return 'Y'


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
