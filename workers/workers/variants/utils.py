import numpy as np


def merge_genotype_arrays(existing: list[int], subject_ids: list[int], max_subject_id: int,
                          genotype_vals: list[int]):
    ne = len(existing)

    # create an array so that it fits all available subject_ids
    x = np.array([None] * max(ne, max_subject_id))

    # set first ne elements with existing values
    x[np.arange(ne)] = np.array(existing)

    # convert subject_ids to zero based indices
    _ids = np.array(subject_ids) - 1

    # set values at these indices - existing values will get overwritten
    x[_ids] = genotype_vals
    return x


def encode_genotype(genotype: tuple[int, int, bool]) -> int:
    """
    all values of genotypes should be either 0 or 1 - not validated

    :param genotype:
    :return:

    0/0 - 0
    0/1 - 1 (+3) = 4
    1/0 - 1 (+3) = 4
    1/1 - 3 (+3) = 6

    0|0 - 0
    0|1 - 1
    1|0 - 2
    1|1 - 3

    """
    phase = genotype[2]
    a, b = genotype[:2]
    if phase == 0:
        if a == 0 and b == 0:
            return 0
        elif a + b == 1:
            return 4
        else:
            return 6
    else:
        if a == 0 and b == 0:
            return 0
        else:
            return a * 2 + b


def decode_genotype(enc_genotype) -> tuple[int, int, int]:
    pass
