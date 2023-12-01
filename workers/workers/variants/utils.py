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
