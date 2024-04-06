import logging
import pickle
from pathlib import Path

from cyvcf2 import VCF
from fire import Fire
from tqdm import tqdm

from workers.variants.models.annotation import Site
from workers.variants.models.gene import create_many, fetch_all

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class GeneInfo:
    def __init__(self, vcf_file_path, outfile=None, initfile=None):
        """
        Extract gene information from a VCF file and save it as a pickle file.
        If initfile is provided, the gene information will be updated with the new information.
        Creates new genes in the database if they do not exist.

        @param vcf_file_path: Path to the VCF file containing gene information.
        @param outfile: Path to the output pickle file.
        @param initfile: Path to the initial pickle file containing gene information.
        """
        self.gene_idx_map = {}
        self.vcf_file_path = Path(vcf_file_path).resolve()

        self.outfile = outfile
        self.gene_data = {}
        if initfile is not None:
            initfile = Path(initfile).resolve()
            with open(initfile, 'rb') as f:
                self.gene_data = pickle.load(f)
            if self.outfile is None:
                self.outfile = initfile
        assert self.outfile is not None

    def _transform_vcf(self):
        vcf = VCF(str(self.vcf_file_path))
        gene_data = {}
        genes_agg = set()

        for var in tqdm(vcf):
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
            s = Site(chrom=int(var.CHROM), pos=int(var.POS), ref=var.REF, alt=var.ALT[0])
            gene_data[s] = val

        return gene_data, genes_agg

    def extract(self):
        logger.info(f'Extracting gene information from VCF file: {self.vcf_file_path}')
        self.gene_idx_map = fetch_all()

        logger.info('Transforming VCF file to gene information pickle.')
        gene_data, genes_agg = self._transform_vcf()

        logger.info('Creating new genes in the database.')
        new_genes = genes_agg - set(self.gene_idx_map.keys())
        create_many(list(new_genes))

        # fetch the gene_idx_map again to include the new genes
        self.gene_idx_map = fetch_all()

        # transform gene names to gene idx and update self.gene_data
        for k, v in gene_data.items():
            v['Gene.refGene'] = [self.gene_idx_map[g] for g in v['Gene.refGene']]
            self.gene_data[k] = v

        # Save the dictionary as a pickle file
        with open(self.outfile, 'wb') as f:
            pickle.dump(self.gene_data, f)


if __name__ == '__main__':
    Fire(GeneInfo)
