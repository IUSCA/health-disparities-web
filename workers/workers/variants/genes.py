import csv
import logging
import pickle
from pathlib import Path

from cyvcf2 import VCF
from fire import Fire
from tqdm import tqdm
from workers.variants.models.annotation import Site
from workers.variants.models.gene import create_many, fetch_all
from workers.variants.utils import encode_chromosome

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def count_lines(filepath):
    with open(filepath, 'rb') as file:
        return sum(1 for line in file)


class GeneInfo:
    def __init__(self, file_path, outfile=None, init_file=None):
        """
        Extract gene information from a VCF / TXT file and save it as a pickle file.
        If init_file is provided, the gene information will be updated with the new information.
        Creates new genes in the database if they do not exist.

        @param file_path: Path to the VCF / TXT file containing gene information.
        @param outfile: Path to the output pickle file.
        @param init_file: Path to the initial pickle file containing gene information.
        """
        self.genes_curr = set()
        self.file_path = Path(file_path).resolve()

        self.outfile = outfile
        self.gene_data = {}
        if init_file is not None:
            init_file = Path(init_file).resolve()
            with open(init_file, 'rb') as f:
                self.gene_data = pickle.load(f)
            if self.outfile is None:
                self.outfile = init_file
        assert self.outfile is not None

    def _transform_vcf(self) -> tuple[dict[Site, dict[str, str]], set[str]]:
        """
        Transform the VCF file to a dictionary of gene information.
        @return: genes_dict: Dictionary of gene information.
        @return: genes_agg: Set of all genes in the VCF file.

        genes_dict: {
            Site(chrom, pos, ref, alt): {
                'Func.refGene': str,
                'Gene.refGene': List[str],
                'GeneDetail.refGene': str,
                'ExonicFunc.refGene': str,
                'AAChange.refGene': str
            }
        """

        vcf = VCF(str(self.file_path))
        genes_dict = {}
        genes_agg = set()

        for var in tqdm(vcf, total=vcf.num_records, min_interval=5):
            genes = var.INFO.get('Gene.refGene').split('\\x3b')
            genes_agg.update(set(genes))
            # genes_mapped = [self.gene_idx_map[g] for g in genes]
            distances = var.INFO.get('GeneDetail.refGene').replace('\\x3d', '=', -1).replace('\\x3b', ';')
            exonic = var.INFO.get('ExonicFunc.refGene')
            aa_change = var.INFO.get('AAChange.refGene')
            val = {
                'Func.refGene': var.INFO.get('Func.refGene'),
                'Gene.refGene': genes,
                'GeneDetail.refGene': distances,
                'ExonicFunc.refGene': None if exonic == '.' else exonic,
                'AAChange.refGene': None if aa_change == '.' else aa_change
            }
            s = Site(chrom=encode_chromosome(var.CHROM), pos=int(var.POS), ref=var.REF, alt=var.ALT[0])
            genes_dict[s] = val

        return genes_dict, genes_agg

    def _transform_text(self) -> tuple[dict[Site, dict[str, str]], set[str]]:
        """
        Transform the txt file to a dictionary of gene information.
        @return: genes_dict: Dictionary of gene information.
        @return: genes_agg: Set of all genes in the txt file.

        genes_dict: {
            Site(chrom, pos, ref, alt): {
                'Func.refGene': str,
                'Gene.refGene': List[str],
                'GeneDetail.refGene': str,
                'ExonicFunc.refGene': str,
                'AAChange.refGene': str
            }
        """
        genes_dict = {}
        genes_agg = set()
        with open(self.file_path, newline='') as csvfile:
            reader = csv.DictReader(csvfile, delimiter='\t')
            for row in tqdm(reader, total=count_lines(self.file_path) - 1, min_interval=5):
                genes = [g for g in row['Gene.refGene'].split(';') if (g != '.' and g != '')]
                genes_agg.update(set(genes))

                func = row.get('Func.refGene', '.')
                distances = row.get('GeneDetail.refGene', '.')
                exonic = row.get('ExonicFunc.refGene', '.')
                aa_change = row.get('AAChange.refGene', '.')
                val = {
                    'Func.refGene': None if func == '.' else func,
                    'Gene.refGene': genes,
                    'GeneDetail.refGene': None if distances == '.' else distances,
                    'ExonicFunc.refGene': None if exonic == '.' else exonic,
                    'AAChange.refGene': None if aa_change == '.' else aa_change
                }

                s = Site(
                    chrom=encode_chromosome(row['Chr']),
                    pos=int(row['Start']),
                    ref=row['Ref'],
                    alt=row['Alt']
                )
                genes_dict[s] = val
        return genes_dict, genes_agg

    def extract(self):
        logger.info(f'Extracting gene information from file: {self.file_path}')
        self.genes_curr = fetch_all()

        logger.info('Transforming file to gene information pickle.')
        is_txt = self.file_path.suffix == '.txt'
        genes_dict, genes_agg = self._transform_text() if is_txt else self._transform_vcf()

        new_genes = genes_agg - self.genes_curr
        if new_genes:
            logger.info(f'Creating {len(new_genes)} new genes in the database.')
            create_many(list(new_genes))

        # update the gene data with the new information
        self.gene_data.update(genes_dict)

        # Save the dictionary as a pickle file
        with open(self.outfile, 'wb') as f:
            pickle.dump(self.gene_data, f)


if __name__ == '__main__':
    Fire(GeneInfo)
