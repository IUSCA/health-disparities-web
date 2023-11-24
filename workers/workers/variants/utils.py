import numpy as np


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


def encode_genotype(genotype: tuple[int, int, bool]) -> int | None:
    """
    assumptions:
    - unphased data
    - all values of genotypes should be either 0 or 1

    :param genotype:
    :return:

    ./. - -1
    ./0 - -1 ?
    ./1 - -1 ?
    0/0 - 0
    0/1 - 1
    1/0 - 1
    1/1 - 2

    .|. - -1
    .|* - -1 ?
    *|. - -1 ?
    0|0 - 0
    0|1 - 1
    1|0 - 2
    1|1 - 3

    """
    a, b = genotype[:2]
    if a is None or b is None:
        return None
    assert 0 <= a <= 1 and 0 <= b <= 1, f'a={a}, b={b} should be either 0 or 1'
    return a + b


def decode_genotype(enc_genotype) -> tuple[int, int, int]:
    pass
