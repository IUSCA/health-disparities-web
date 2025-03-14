#!/bin/bash

# File to modify
FILE="clients/bash/biobank-client"

# Backup the original file
cp "$FILE" "${FILE}.bak"

# Use `awk` to modify only the call_downloadCohortFile function if the code is not already present
awk '
BEGIN { in_function = 0; added = 0 }
/^call_downloadCohortFile\(\) \{$/ { in_function = 1 }
in_function && /if \[\[ "\$print_curl" = true ]]; then/ {
    if (added == 0) {
        # Check if the code block is already there — skip if found
        if (match($0, "-J") || match($0, "-O")) {
            added = 1
        } else {
            print "    # Add -J and -O to curl arguments if not already present"
            print "    # Manually addition start"
            print "    if [[ ! \"$curl_arguments\" =~ \"-J\" ]]; then"
            print "      curl_arguments+=\" -J\""
            print "    fi"
            print "    if [[ ! \"$curl_arguments\" =~ \"-O\" ]]; then"
            print "      curl_arguments+=\" -O\""
            print "    fi"
            print "    # Manually addition end"
            added = 1
        }
    }
}
{ print }
/^}$/ { if (in_function) in_function = 0 }
' "$FILE" > "${FILE}.tmp" && mv "${FILE}.tmp" "$FILE"

# Confirm changes
echo "Modifications applied to $FILE"
