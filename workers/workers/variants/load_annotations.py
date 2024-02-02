import csv
from pathlib import Path
from typing import Iterable

import fire
import vcf
from tqdm import tqdm
from vcf.model import _Record

from workers.utils import batched
from workers.variants.models import annotation
from workers.variants.models.annotation import Annotation, Site


class VCF4:
    """
    Wrapper around vcf.Reader to fetch variants by chromosome, position, reference and alternate.
    """

    def __init__(self, filepath: Path | str, compressed: bool = None):
        """
        :param filepath: Path to the VCF file.
        :param compressed: Whether the file is compressed. If None, it is inferred from the file extension.
        """
        filepath = Path(filepath).resolve()
        if compressed is None:
            compressed = filepath.suffix in ['.gz', '.bgz']

        self.vcf_reader = vcf.Reader(filename=str(filepath), compressed=compressed)
        self.chromosome = self.infer_chromosome()

    def infer_chromosome(self) -> str:
        """
        Infer the chromosome from the first variant in the VCF file.
        This is a workaround for the fact that the VCF file does not contain the chromosome number. 
        Once inferred, the same chromosome is used for all subsequent variant fetches in this file.

        :return: Chromosome number.
        """
        var = next(self.vcf_reader)
        return var.CHROM

    def fetch(self, site: Site) -> _Record | None:
        """
        Fetch a variant by site.
        
        :param site: Site to fetch variant for.
        :return: vcf.model._Record object or None if not found.
        """
        for var in self.vcf_reader.fetch(self.chromosome, start=site.pos - 1, end=site.pos):
            # print(var.POS, var.REF, var.ALT[0].sequence, site.ref, site.alt)
            if var.REF == site.ref and var.ALT[0].sequence == site.alt:
                return var


class GnomadAnnotations:
    """
    Fetch annotations from gnomAD VCF files. 
    The VCF files for all chromosomes are expected to be in the ``root_dir``.
    The annotations are fetched by chromosome, position, reference and alternate.

    Only selected fields are returned and their names are in self.fieldnames
    """

    def __init__(self, root_dir):
        """
        :param root_dir: Path to the directory containing the gnomAD VCF files.
        """
        self.root_dir = Path(root_dir).resolve()
        assert self.root_dir.exists()
        self.vcfs: dict[int, VCF4] = {}

        self.allele_frequencies = ['AF_afr', 'AF_ami', 'AF_amr', 'AF_asj', 'AF_eas', 'AF_fin', 'AF_mid', 'AF_nfe',
                                   'AF_sas']
        self.functional_info = ['cadd_phred', 'revel_max', 'polyphen_max', 'sift_max']
        self.fieldnames = ['CHROM', 'POS', 'REF', 'ALT'] + self.allele_frequencies + self.functional_info

    def get_file_name(self, chrom: int):
        chrom_str = self.decode_chromosome(chrom)
        return self.root_dir / f'gnomad.genomes.v4.0.sites.chr{chrom_str}.vcf.bgz'

    def fetch(self, site: Site):
        """
        Fetch annotations for a given site by opening a VCF file for the chromosome 
        and fetching the variant entry (random access).

        The keys in the returned dictionary are from GnomAD dataset (VCF headers)
        except for 'CHROM', 'POS', 'REF', 'ALT'
        
        :param site: Site to fetch annotations for.
        :return: Dictionary of annotations.
        """
        if site.chrom not in self.vcfs:
            self.vcfs[site.chrom] = VCF4(filepath=self.get_file_name(site.chrom))
        _vcf = self.vcfs[site.chrom]
        var = _vcf.fetch(site)
        if var is not None:
            return self.transform_variant(var)

    def transform_variant(self, var: _Record) -> dict:
        """
        Transform a vcf.model._Record object into a dictionary of annotations.
        
        :param var: vcf.model._Record object.
        :return: Dictionary of annotations.
        """
        d = {
            'CHROM': var.CHROM,
            'POS': var.POS,
            'REF': var.REF,
            'ALT': var.ALT[0].sequence
        }
        for x in self.allele_frequencies:
            d[x] = var.INFO.get(x)[0]

        for x in self.functional_info:
            d[x] = var.INFO.get(x)

        return d

    @staticmethod
    def decode_chromosome(chrom: int) -> str:
        """
        Decode chromosome number to string.
        
        :param chrom: Chromosome number.
        :return: Chromosome string.
        """
        assert 1 < chrom < 25
        if chrom <= 22:
            return str(chrom)
        elif chrom == 23:
            return 'X'
        else:
            return 'Y'


class Loader:
    """
    Load annotations from gnomAD (and others) into the database for a given list of sites.
    Each site is a tuple of (chrom, pos, ref, alt).
    """

    def __init__(self, gnomad_root_dir, batch_size):
        """
        :param gnomad_root_dir: Path to the directory containing the gnomAD VCF files.
        :param batch_size: Number of annotations to write into database in a single batch.
        """
        self.batch_size = batch_size
        self.gnomadAnnotations = GnomadAnnotations(root_dir=gnomad_root_dir)

    def fetch_annotations(self, sites: Iterable[Site]) -> Iterable[Annotation]:
        """
        For each given site annotation data is fetched from various sources and 
        transformed into an Annotation object.
        

        :param sites: Iterable of sites to fetch annotations for.
        return: Iterable of Annotation objects.
        """
        for s in sites:
            _ann = self.gnomadAnnotations.fetch(s)
            # print(s, _ann)
            if _ann is not None:
                ann = Annotation(
                    chr=s.chrom,
                    position=_ann['POS'],
                    ref=_ann['REF'],
                    alt=_ann['ALT'],
                    af_afr=_ann['AF_afr'],
                    af_amr=_ann['AF_amr'],
                    af_asj=_ann['AF_asj'],
                    af_eas=_ann['AF_eas'],
                    af_fin=_ann['AF_fin'],
                    af_nfe=_ann['AF_nfe'],
                    af_sas=_ann['AF_sas'],
                    af_oth=(_ann['AF_ami'] + _ann['AF_mid']),
                    cadd_phred=_ann['cadd_phred'],
                    revel_max=_ann['revel_max'],
                    polyphen_max=_ann['polyphen_max'],
                    sift_max=_ann['sift_max']
                )
                yield ann

    def load(self, sites: Iterable[Site]) -> None:
        """
        Fetch annotations for the given sites and write them into the database.

        :param sites: Iterable of sites to fetch annotations for.
        """
        annotations = self.fetch_annotations(sites)
        for batch in batched(annotations, self.batch_size):
            annotation.create_many(batch)


# def create_many(batch):
#     print(batch)

def read_from_csv(sites_csv: Path | str) -> Iterable[Site]:
    with open(sites_csv, 'r') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            yield Site(chrom=int(row['chr']), pos=int(row['position']), ref=row['ref'], alt=row['alt'])


def main(gnomad_root_dir: str, batch_size: int = 100, mode: str = 'db', sites_csv: str = None, chromosome: int = None):
    """
    Load annotations from gnomAD (and others) into the database for a given list of sites.

    @param sites_csv: Path to the CSV file containing the sites information with header: chr, position, ref, alt.
    @param gnomad_root_dir: Path to the directory containing the gnomAD VCF files.
    @param batch_size: Number of annotations to write into the database in a single batch. Defaults to 100.
    @param mode: If csv, sites are read from the csv file. If db, sites in variant table but not in annotation table
    are read from the database. Default: db
    @param chromosome: when in db mode, add missing annotations only for this chromosome. int, 1-22,23(X), 24(Y)
    """
    if mode == 'csv':
        assert sites_csv, 'sites_csv is required in csv mode'
        sites = read_from_csv(sites_csv)
    else:
        sites = annotation.get_missing(chromosome)
    loader = Loader(gnomad_root_dir, batch_size)
    loader.load(tqdm(sites))


if __name__ == '__main__':
    fire.Fire(main)
