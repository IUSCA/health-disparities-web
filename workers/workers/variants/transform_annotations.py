import csv
import pickle
from dataclasses import asdict
from enum import Enum
from pathlib import Path
from typing import Iterable

import fire
import vcf
from celery import Celery
from sca_rhythm import Workflow
from sca_rhythm.progress import Progress
from vcf.model import _Record

from workers.config import config, celeryconfig
from workers.utils import batched
from workers.variants import utils
from workers.variants.models import annotation
from workers.variants.models.annotation import Annotation, Site

app = Celery("tasks")
app.config_from_object(celeryconfig)


class VCF4:
    """
    Wrapper around vcf.Reader to fetch variants by chromosome, position, reference and alternate.
    """

    def __init__(self, filepath: Path | str, compressed: bool = None, mono_chrom: bool = True):
        """
        :param filepath: Path to the VCF file.
        :param compressed: Whether the file is compressed. If None, it is inferred from the file extension.
        """
        filepath = Path(filepath).resolve()
        if compressed is None:
            compressed = filepath.suffix in ['.gz', '.bgz']

        self.vcf_reader = vcf.Reader(filename=str(filepath), compressed=compressed)
        self.mono_chrom = mono_chrom
        if mono_chrom:
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
        Fetch a variant by site. Only the pos, ref and alt are used to fetch the variant.
        The vcf is assumed to be chromosome specific, i.e. only one chromosome is present in the file.
        The specific representation of chromosome if inferred from the first variant in the file.
        
        :param site: Site to fetch variant for.
        :return: vcf.model._Record object or None if not found.
        """
        chrom = self.chromosome if self.mono_chrom else utils.decode_chromosome(site.chrom)
        for var in self.vcf_reader.fetch(chrom, start=site.pos - 1, end=site.pos):
            # print(var.POS, var.REF, var.ALT[0].sequence, site.ref, site.alt)
            if var.REF == site.ref:
                alt = var.ALT[0].sequence if (len(var.ALT) > 0 and var.ALT[0] is not None) else None
                if alt is not None and alt == site.alt:
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
        """
        Get the file name for the given chromosome.

        example: 23 -> gnomad.genomes.v4.0.sites.chrX.vcf.bgz

        @param chrom: Chromosome number. 1-24
        @return: Path to the VCF file for the chromosome.
        """
        chrom_str = utils.decode_chromosome(chrom)
        return self.root_dir / f'gnomad.genomes.v4.0.sites.chr{chrom_str}.vcf.bgz'

    def fetch(self, site: Site):
        """
        Fetch annotations for a given site by opening a VCF file for the chromosome 
        and fetching the variant entry (random access).

        The keys in the returned dictionary are from GnomAD dataset (VCF headers)
        except for 'CHROM', 'POS', 'REF', 'ALT' which are from the site tuple.
        
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


class ClinVarAnnotations:
    def __init__(self, vcf_path):
        self.vcf = VCF4(vcf_path, compressed=True, mono_chrom=False)
        self.keys = [
            'ALLELEID', 'CLNDISDB', 'CLNDN', 'CLNHGVS', 'CLNREVSTAT', 'CLNSIG', 'CLNVC', 'CLNVCSO', 'GENEINFO', 'MC'
        ]

    def fetch(self, site: Site):
        var = self.vcf.fetch(site)
        if var is not None:
            data = {}
            for k in self.keys:
                val = var.INFO.get(k)
                # some values are lists, join them into a string using '|' as delimiter
                # some lists have None values, remove them
                # if the list is empty, set the value to None
                if isinstance(val, list):
                    val = [v for v in val if v is not None]
                    val = '|'.join(val) if len(val) > 0 else None
                data[k] = val
            return data


class GeneAnnotations:
    def __init__(self, root_dir):
        self.sources: dict[int, dict] = {}
        self.root_dir = Path(root_dir).resolve()
        assert self.root_dir.exists()

    def get_file_name(self, chrom: int):
        return self.root_dir / f'gene_info_chr{chrom}.pkl'

    def fetch(self, site: Site) -> dict | None:
        if site.chrom not in self.sources:
            fname = self.get_file_name(site.chrom)
            if not fname.exists():
                return None
            with open(fname, 'rb') as f:
                self.sources[site.chrom] = pickle.load(f)
        gene_info_dict = self.sources[site.chrom]
        return gene_info_dict.get(site, None)


Source = Enum('Source', ['GNOMAD', 'GENE', 'CLINVAR'])


class Loader:
    """
    Load annotations from gnomAD (and others) into the database for a given list of sites.
    Each site is a tuple of (chrom, pos, ref, alt).
    """

    GNOMAD_COLUMNS = {'AF_afr', 'AF_amr', 'AF_asj', 'AF_eas', 'AF_fin', 'AF_nfe', 'AF_sas', 'AF_oth', 'cadd_phred',
                      'revel_max', 'polyphen_max', 'sift_max'}
    GENE_COLUMNS = {'func', 'genes', 'exonic_func', 'aa_change'}
    CLINVAR_COLUMNS = {'cln_allele_id', 'cln_dis_db', 'cln_dn', 'cln_hgvs', 'cln_rev_stat', 'cln_sig', 'cln_vc',
                       'cln_vcso', 'cln_geneinfo', 'cln_mc'}

    def __init__(self, gnomad_root_dir, gene_root_dir, clinvar_vcf_path, batch_size):
        """
        :param gnomad_root_dir: Path to the directory containing the gnomAD VCF files.
        :param batch_size: Number of annotations to write into database in a single batch.
        """
        self.batch_size = batch_size
        self.sources = []
        if gnomad_root_dir is not None:
            self.gnomadAnnotations = GnomadAnnotations(root_dir=gnomad_root_dir)
            self.sources.append(Source.GNOMAD)
        if gene_root_dir is not None:
            self.geneAnnotations = GeneAnnotations(root_dir=gene_root_dir)
            self.sources.append(Source.GENE)
        if clinvar_vcf_path is not None:
            self.clinvarAnnotations = ClinVarAnnotations(vcf_path=clinvar_vcf_path)
            self.sources.append(Source.CLINVAR)

    def fetch_annotations(self, sites: Iterable[Site]) -> Iterable[Annotation]:
        """
        For each given site, annotation data is fetched from various sources and
        transformed into an Annotation object.
        If no annotation is found, the returned object will have just chr, position, ref, and alt set
        with others as null.
        

        :param sites: Iterable of sites to fetch annotations for.
        return: Iterable of Annotation objects.

        """
        for s in sites:
            ann = Annotation(
                chr=s.chrom,
                position=s.pos,
                ref=s.ref,
                alt=s.alt
            )
            if Source.GNOMAD in self.sources:
                _ann = None
                try:
                    _ann = self.gnomadAnnotations.fetch(s)
                except Exception as e:
                    print('Unable to fetch gnomAD annotations for', s, e)
                # print(s, _ann)
                if _ann is not None:
                    ann.af_afr = _ann['AF_afr']
                    ann.af_amr = _ann['AF_amr']
                    ann.af_asj = _ann['AF_asj']
                    ann.af_eas = _ann['AF_eas']
                    ann.af_fin = _ann['AF_fin']
                    ann.af_nfe = _ann['AF_nfe']
                    ann.af_sas = _ann['AF_sas']
                    ann.af_oth = (_ann['AF_ami'] + _ann['AF_mid'])
                    ann.cadd_phred = _ann['cadd_phred']
                    ann.revel_max = _ann['revel_max']
                    ann.polyphen_max = _ann['polyphen_max']
                    ann.sift_max = _ann['sift_max']

            if Source.GENE in self.sources:
                _gene = None
                try:
                    _gene = self.geneAnnotations.fetch(s)
                except Exception as e:
                    print('Unable to fetch gene annotations for', s, e)
                if _gene is not None:
                    ann.func = _gene['Func.refGene']
                    ann.genes = _gene['Gene.refGene']
                    ann.exonic_func = _gene['ExonicFunc.refGene']
                    ann.aa_change = _gene['AAChange.refGene']

            if Source.CLINVAR in self.sources:
                _clinvar = None
                try:
                    _clinvar = self.clinvarAnnotations.fetch(s)
                except Exception as e:
                    print('Unable to fetch clinvar annotations for', s, e)
                if _clinvar is not None:
                    ann.cln_allele_id = _clinvar['ALLELEID']
                    ann.cln_dis_db = _clinvar['CLNDISDB']
                    ann.cln_dn = _clinvar['CLNDN']
                    ann.cln_hgvs = _clinvar['CLNHGVS']
                    ann.cln_rev_stat = _clinvar['CLNREVSTAT']
                    ann.cln_sig = _clinvar['CLNSIG']
                    ann.cln_vc = _clinvar['CLNVC']
                    ann.cln_vcso = _clinvar['CLNVCSO']
                    ann.cln_geneinfo = _clinvar['GENEINFO']
                    ann.cln_mc = _clinvar['MC']

            yield ann


def transform_annotations(celery_task, chromosome,
                          gnomad_root_dir=None,
                          gene_root_dir=None,
                          clinvar_vcf_path=None,
                          output_dir=None,
                          batch_size=1000, **kwargs):
    if chromosome is None:
        print('chromosome is not provided')
        return
    sites = annotation.get_missing(chromosome)
    num_records = annotation.count_missing(chromosome)
    print(f'Found {num_records} missing annotations for chromosome {chromosome}')

    output_dir_path = Path(output_dir or '.').resolve()
    output_dir_path.mkdir(parents=True, exist_ok=True)
    csv_file_path = (output_dir_path / Path(f'annotations_chr{chromosome}.csv')).resolve()
    column_names = Annotation.__annotations__.keys()

    loader = Loader(gnomad_root_dir, gene_root_dir, clinvar_vcf_path, batch_size)
    progress = Progress(celery_task=celery_task,
                        name='ingest',
                        units='annotations',
                        throttle_time=10,
                        total=num_records)
    annotations = loader.fetch_annotations(progress(sites))
    with open(csv_file_path, 'w', newline='') as csvfile:
        csvWriter = csv.DictWriter(csvfile, fieldnames=column_names)
        csvWriter.writeheader()
        for batch in batched(annotations, batch_size):
            rows = [asdict(row) for row in batch]
            for row in rows:
                for key, value in row.items():
                    if value is None:
                        if key == 'genes':
                            row[key] = '{}'
                        else:
                            row[key] = 'null'
            csvWriter.writerows(rows)

    return chromosome,


def launch_wfs(gnomad_root_dir, gene_root_dir, clinvar_vcf_path, output_dir, batch_size=100):
    gnomad_root_dir = Path(gnomad_root_dir).resolve()
    assert gnomad_root_dir.exists(), f'{gnomad_root_dir} does not exist'

    vcf_paths = list(gnomad_root_dir.glob('*.vcf.bgz'))
    assert len(vcf_paths) > 0, f'No .vcf.bgz files in {gnomad_root_dir}'

    for chromosome in range(1,4):
        steps = [{
            'name': 'transform_annotations',
            'task': 'transform_annotations',
            'queue': f'{config["app_id"]}.q',
            'kwargs': {
                'gnomad_root_dir': str(gnomad_root_dir),
                'gene_root_dir': gene_root_dir,
                'clinvar_vcf_path': clinvar_vcf_path,
                'batch_size': batch_size,
                'output_dir': str(output_dir)
            },
        }]

        wf_body = {
            'name': f'Annotations-Chr{chromosome}',
            'app_id': config['app_id'],
            'steps': steps
        }

        int_wf = Workflow(celery_app=app, **wf_body)
        int_wf.start(chromosome)


def main(
    gnomad_root_dir: str = None,
    gene_root_dir: str = None,
    clinvar_vcf_path: str = None,
    output_dir: str = None,
    batch_size: int = 1000):
    """
    Load annotations from gnomAD (and others) into the database for a given list of sites.

    @param output_dir:
    @param clinvar_vcf_path: Path to the ClinVar VCF file.
    @param gene_root_dir: Path to the directory containing the gene_info_chr*.pkl files.
    @param gnomad_root_dir: Path to the directory containing the gnomAD VCF files.
    @param batch_size: Number of annotations to write into the database in a single batch. Defaults to 100.
    """
    launch_wfs(gnomad_root_dir, gene_root_dir, clinvar_vcf_path, output_dir, batch_size)


if __name__ == '__main__':
    fire.Fire(main)
