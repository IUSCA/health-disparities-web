#!/bin/bash
set -e

# This script is used to split, left-align, reorder and index the vcf files
# First argument is the directory where the vcf files are located
# Second argument is the output directory where the split and left-aligned vcf files will be stored
# The third argument is the path to the reference genome
# The fourth argument is the path to the sample mapping file

# Example usage:
# ./split_left_adj.sh /path/to/vcfs /path/to/output /path/to/reference_genome.fa /path/to/sample_mapping.tab

# echo "splitting chr-2" && 
# bcftools norm -m-both -o INDIANA-CHALASANI_Freeze_Two.2.GL.split.vcf INDIANA-CHALASANI_Freeze_Two.2.GL.vcf.gz && 
# echo "left-adj chr-2" && 
# bcftools norm -f /N/project/biobank/phi_ingest_biobank_regeneron_KEEPTRXyunlong/WES/FASTA/genome.fa -o INDIANA-CHALASANI_Freeze_Two.2.GL.split.left_adj.vcf INDIANA-CHALASANI_Freeze_Two.2.GL.split.vcf && 
# echo "bgzip chr-2" && bgzip INDIANA-CHALASANI_Freeze_Two.2.GL.split.left_adj.vcf && 
# rm -f INDIANA-CHALASANI_Freeze_Two.2.GL.split.vcf INDIANA-CHALASANI_Freeze_Two.2.GL.split.left_adj.vcf
# echo "reheader chr-2" &&
# bcftools reheader -s SAMPLEFILE.tab -o INDIANA-CHALASANI_Freeze_Two.2.GL.split.reorder.left_adj.vcf.gz INDIANA-CHALASANI_Freeze_Two.2.GL.split.left_adj.vcf.gz
# echo "indexing chr-2" && 
# tabix -p vcf INDIANA-CHALASANI_Freeze_Two.2.GL.split.reorder.left_adj.vcf.gz


# Check if the number of arguments is correct
if [ "$#" -ne 4 ]; then
    echo "Illegal number of parameters"
    echo "Usage: $0 <input_dir> <output_dir> <reference_genome> <sample_mapping>"
    exit 1
fi

# Check if the input directory exists
if [ ! -d "$1" ]; then
    echo "Input directory does not exist"
    exit 1
fi

# Check if the output directory exists else create it
if [ ! -d "$2" ]; then
    mkdir -p $2
fi

# create an intermediate directory to store the split vcf files
tmp="$2/tmp"
if [ ! -d "$tmp" ]; then
    mkdir -p $tmp
fi

# Get the path to the reference genome and the sample mapping file
REFERENCE_GENOME=$3
SAMPLE_MAPPING=$4

# Check if the reference genome exists
if [ ! -f "$REFERENCE_GENOME" ]; then
    echo "Reference genome does not exist"
    exit 1
fi

# Check if the sample mapping file exists
if [ ! -f "$SAMPLE_MAPPING" ]; then
    echo "Sample mapping file does not exist"
    exit 1
fi

# Loop through all the vcf files in the input directory
for file in $1/*.vcf.gz; do
    # Get the filename without the extension
    filename=$(basename -- "$file")
    filename="${filename%.*}"

    # Split the vcf file
    echo "splitting $filename"
    bcftools norm -m-both -o $tmp/$filename.split.vcf $file
    
    # Left-align the vcf file
    echo "left-adj $filename"
    bcftools norm -f $REFERENCE_GENOME -o $tmp/$filename.split.left_adj.vcf $tmp/$filename.split.vcf

    # remove the intermediate split vcf file
    rm -f $tmp/$filename.split.vcf
    
    # Compress the vcf file
    echo "bgzip $filename"
    bgzip $tmp/$filename.split.left_adj.vcf

    # remove the intermediate left-adj vcf file
    rm -f $tmp/$filename.split.left_adj.vcf

    # Reheader the vcf file
    echo "reheader $filename"
    bcftools reheader -s $SAMPLE_MAPPING -o $2/$filename.split.left_adj.reheader.vcf.gz $tmp/$filename.split.left_adj.vcf.gz

    # Remove the intermediate zipped vcf file
    rm -f $tmp/$filename.split.left_adj.vcf.gz

    # Index the vcf file
    echo "indexing $filename"
    tabix -p vcf $2/$filename.split.left_adj.reheader.vcf.gz


done

# Remove the intermediate directory
rmdir $tmp