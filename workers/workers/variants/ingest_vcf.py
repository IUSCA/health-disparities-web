from cyvcf2 import VCF
from sca_rhythm.progress import Progress

from workers.utils import batched
from workers.variants.models import subject, variant
from workers.variants.utils import encode_genotype, merge_genotype_arrays


def ingest_vcf(celery_task, vcf_file_path, batch_size=100, **kwargs):
    vcf = VCF(str(vcf_file_path), strict_gt=True)

    # get list of subject domain_ids and find_or_create_many
    subject_map = subject.find_or_create_many(vcf.samples)
    subject_ids = [subject_map[s] for s in vcf.samples]
    max_subject_id = max(subject_ids)

    n_samples = len(vcf.samples)
    n_pos = 0

    progress = Progress(celery_task=celery_task, units='positions')
    for batch in batched(vcf, batch_size):

        # fetch all rows for the batch at once
        params = [(var.CHR, var.POS, var.REF, var.ALT[0]) for var in batch]
        result_dict = variant.find_many(params)

        # accumulate updates and create separately
        updates = []
        creates = []
        for var in batch:
            key = (var.CHR, var.POS, var.REF, var.ALT[0])
            var_row = result_dict[key] if key in result_dict else None
            existing_genotype = var_row[4] if var_row else []
            genotype_vals = [encode_genotype(gt) for gt in var.genotypes]
            merged_genotype_arr = merge_genotype_arrays(existing=existing_genotype,
                                                        subject_ids=subject_ids,
                                                        max_subject_id=max_subject_id,
                                                        genotype_vals=genotype_vals)
            if var_row:
                # updates: [(genotypes, chromosome, position, reference, alternate)]
                updates.append((merged_genotype_arr.tolist(), *key))
            else:
                # creates: [(chromosome, position, reference, alternate, genotype)]
                creates.append((*key, merged_genotype_arr.tolist()))

        # do updateMany and createMany
        if updates:
            variant.update_many(updates)
        if creates:
            variant.create_many(creates)

        n_pos += len(batch)
        progress.update(n_pos)

    print(f'Samples: {n_samples}')
    print(f'Positions: {n_pos}')
