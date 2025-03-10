#!/bin/bash

# Get the current date in YYYYMMDD format
date_str=$(date +%Y%m%d)

# Create log directory if it doesn't exist
log_dir="logs/$date_str"
mkdir -p "$log_dir"

# Loop through chromosomes 1 to 24
for chr in {1..22}; do
    echo "Processing chromosome $chr..."
    node src/scripts/populate_genotype_stats.js --snapshot_id 1 --protocol_id 1 --chr "$chr" --source_id 3 > "$log_dir/chr$chr.log" 2>&1 &
done

echo "All processes started."
