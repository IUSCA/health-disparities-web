#!/bin/bash

# This script is used to reheader the vcf files

# First argument is the directory where the vcf files are located
# Second argument is the output directory where the split and left-aligned vcf files will be stored
# The third argument is the path to the sample mapping file

# Example usage:
# ./reheader.sh /path/to/vcfs /path/to/output /path/to/sample_mapping.tab

# Check if the number of arguments is correct
if [ "$#" -ne 3 ]; then
    echo "Illegal number of parameters"
    echo "Usage: $0 <input_dir> <output_dir> <sample_mapping>"
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
    echo "created output directory: $2"
fi


# Get the path to the sample mapping file
SAMPLE_MAPPING=$3

# Check if the sample mapping file exists
if [ ! -f "$SAMPLE_MAPPING" ]; then
    echo "Sample mapping file does not exist"
    exit 1
fi

# Reheader the vcf files
for file in $1/*.vcf.gz; do
    filename=$(basename -- "$file")
    filename="${filename%.vcf.gz}"
    echo "processing $filename"
    bcftools reheader -s $SAMPLE_MAPPING -o $2/$filename.reheader.vcf.gz $file
done