# This script defines a custom wrapper function for the `curl` command.
# The wrapper allows for additional argument processing before invoking the actual `curl` command.
#
# Functionality:
# - Adds support for custom flags:
#   - `--text`: Adds the header `Accept: text/plain` to the request.
#   - `--json`: Adds the header `Accept: application/json` to the request.
# - Passes all other arguments directly to the real `curl` command.
#
# Usage:
# - Use `--text` or `--json` to specify the desired `Accept` header.
# - All other arguments are forwarded to the original `curl` command.
#
# Example:
#   curl --json -X GET https://api.example.com/resource
#   This will send a GET request with the `Accept: application/json` header.
curl() {
    local args=()
    
    # Process arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --text)
                args+=("-H" "Accept: text/plain")
                shift
                ;;
            --json)
                args+=("-H" "Accept: application/json")
                shift
                ;;
            *)
                args+=("$1")
                shift
                ;;
        esac
    done

    # Call the real curl with modified arguments
    command curl "${args[@]}"
}

# Add biobank-client to PATH
export PATH="$PATH:/soft/biobank"

# Add bash completion for biobank-client
if [ -f /opt/sca/biobank-client.bash-completion ]; then
    . /opt/sca/biobank-client.bash-completion
fi

# set environment variables from .env file
if [ -f ~/.env ]; then
    set -a # automatically export all variables
    source ~/.env # load environment variables
    set +a # stop exporting
fi