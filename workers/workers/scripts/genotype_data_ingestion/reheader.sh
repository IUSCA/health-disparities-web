#!/bin/bash

# This script is used to reheader and index the vcf files

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

# Reheader the vcf and vcf.gz files
for file in $1/*.{vcf,vcf.gz}; do
  if [ -f "$file" ]; then
    filename=$(basename -- "$file")

    # Handle the .vcf.gz files specifically
    if [[ "$filename" == *.vcf.gz ]]; then
        # Separate the .vcf.gz case
        base="${filename%.vcf.gz}"   # Remove .vcf.gz
        extension="vcf.gz"          # Set extension
    else
        # Handle the .vcf case
        base="${filename%.vcf}"     # Remove .vcf
        extension="vcf"             # Set extension
    fi
    

    # Construct the output file path
    output_file="$2/$base.reheader.$extension"

    echo "Processing: $file -> $output_file"
    bcftools reheader -s $SAMPLE_MAPPING -o $output_file $file

    # Index the vcf file
    echo "indexing $filename"
    tabix -p vcf $output_file
  fi
done
