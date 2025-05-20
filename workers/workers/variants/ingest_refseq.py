import csv
from datetime import datetime
from pathlib import Path

import fire

from workers.variants.database import conn
from workers.variants.utils import encode_chromosome


def load_data(csv_file: Path):
    with conn.cursor() as cursor:
        with open(csv_file, 'r') as f:
            cursor.copy_expert(
                sql='COPY "ncbiRefSeqCurated"(name,chr,strand,"txStart","txEnd","cdsStart","cdsEnd","exonCount",'
                    '"exonStarts","exonEnds",score,"name2","cdsStartStat","cdsEndStat","exonFrames",build) FROM STDIN '
                    'DELIMITER \',\' CSV HEADER',
                file=f)
        conn.commit()


def parse(refSeqData, build):
    bad_lines = []
    rows = []
    for line in refSeqData:
        data = line.split('\t')
        try:
            chrom = encode_chromosome(data[2][3:])

            exonStarts = data[9]
            if exonStarts[-1] == ',':
                exonStarts = exonStarts[:-1]

            exonEnds = data[10]
            if exonEnds[-1] == ',':
                exonEnds = exonEnds[:-1]

            exonFrames = data[15]
            if exonFrames[-1] == ',':
                exonFrames = exonFrames[:-1]

            rows.append(
                [data[1], chrom] + data[3:9] +
                ['{' + exonStarts + '}'] +
                ['{' + exonEnds + '}'] +
                data[11:15] +
                ['{' + exonFrames + '}'] +
                [build]
            )
        except Exception as e:
            line = line + f'\t{e}'
            bad_lines.append(line)
    return rows, bad_lines


def main(data_path: str, build: str):
    refSeqDataFile = Path(data_path).resolve()
    with open(refSeqDataFile, 'r') as f:
        refSeqData = f.read().split('\n')

    rows, bad_lines = parse(refSeqData, build)

    header = ['name', 'chr', 'strand', 'txStart', 'txEnd', 'cdsStart', 'cdsEnd', 'exonCount', 'exonStarts', 'exonEnds',
              'score', 'name2', 'cdsStartStat', 'cdsEndStat', 'exonFrames', 'build']

    tmp_dir = Path(f'tmp_refseq_{datetime.now().strftime("%Y%m%d%H%M%S")}')
    tmp_dir.mkdir(parents=True, exist_ok=True)
    csv_file = Path(tmp_dir) / f'refseq_{build}.csv'
    with open(csv_file, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile, delimiter=',')
        writer.writerow(header)
        writer.writerows(rows)

    with open(Path(tmp_dir) / f'refseq_bad_lines_{build}.txt', 'w', newline='') as txt_file:
        for bad_line in bad_lines:
            txt_file.write(bad_line + '\n')

    load_data(csv_file)


if __name__ == '__main__':
    fire.Fire(main)
