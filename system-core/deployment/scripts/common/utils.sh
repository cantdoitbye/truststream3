#!/bin/bash

# TrustStream v4.2 Deployment Utilities
# Common utility functions for deployment scripts
# Author: MiniMax Agent

# Check if script is being sourced
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    echo "Error: This script should be sourced, not executed directly"
    exit 1
fi

# Utility functions

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Wait for command to succeed with timeout
wait_for_command() {
    local command="$1"
    local timeout="${2:-300}"  # Default 5 minutes
    local interval="${3:-10}"  # Default 10 seconds
    local elapsed=0
    
    while [[ $elapsed -lt $timeout ]]; do
        if eval "$command" >/dev/null 2>&1; then
            return 0
        fi
        sleep "$interval"
        elapsed=$((elapsed + interval))
    done
    
    return 1
}

# Retry command with exponential backoff
retry_command() {
    local command="$1"
    local max_attempts="${2:-3}"
    local base_delay="${3:-1}"
    local max_delay="${4:-60}"
    
    local attempt=1
    local delay="$base_delay"
    
    while [[ $attempt -le $max_attempts ]]; do
        if eval "$command"; then
            return 0
        fi
        
        if [[ $attempt -lt $max_attempts ]]; then
            echo "Command failed (attempt $attempt/$max_attempts), retrying in ${delay}s..."
            sleep "$delay"
            delay=$((delay * 2))
            if [[ $delay -gt $max_delay ]]; then
                delay="$max_delay"
            fi
        fi
        
        attempt=$((attempt + 1))
    done
    
    return 1
}

# Check if URL is accessible
check_url() {
    local url="$1"
    local expected_status="${2:-200}"
    local timeout="${3:-10}"
    
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$timeout" "$url" 2>/dev/null)
    
    [[ "$status" == "$expected_status" ]]
}

# Wait for URL to be accessible
wait_for_url() {
    local url="$1"
    local expected_status="${2:-200}"
    local timeout="${3:-300}"
    local interval="${4:-10}"
    
    local elapsed=0
    
    while [[ $elapsed -lt $timeout ]]; do
        if check_url "$url" "$expected_status" 10; then
            return 0
        fi
        sleep "$interval"
        elapsed=$((elapsed + interval))
    done
    
    return 1
}

# Generate random string
generate_random_string() {
    local length="${1:-32}"
    openssl rand -hex "$((length / 2))"
}

# Get timestamp
get_timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

# Get ISO timestamp
get_iso_timestamp() {
    date -u '+%Y-%m-%dT%H:%M:%SZ'
}

# Parse YAML file
parse_yaml() {
    local file="$1"
    local key="$2"
    
    if command_exists yq; then
        yq eval "$key" "$file"
    else
        echo "Error: yq not found. Please install yq to parse YAML files."
        return 1
    fi
}

# Substitute environment variables in string
substitute_variables() {
    local input="$1"
    echo "$input" | envsubst
}

# Check if running in container
is_container() {
    [[ -f /.dockerenv ]] || [[ -n "${KUBERNETES_SERVICE_HOST:-}" ]]
}

# Check if running in Azure
is_azure() {
    [[ -n "${AZURE_CLIENT_ID:-}" ]] || curl -s -f -m 2 "http://169.254.169.254/metadata/instance" -H "Metadata:true" >/dev/null 2>&1
}

# Get Azure instance metadata
get_azure_metadata() {
    local key="$1"
    curl -s -f "http://169.254.169.254/metadata/instance/$key?api-version=2021-02-01" -H "Metadata:true" 2>/dev/null
}

# Validate JSON
validate_json() {
    local json="$1"
    echo "$json" | jq . >/dev/null 2>&1
}

# Validate YAML
validate_yaml() {
    local yaml_file="$1"
    
    if command_exists yq; then
        yq eval '.' "$yaml_file" >/dev/null 2>&1
    else
        python3 -c "import yaml; yaml.safe_load(open('$yaml_file'))" 2>/dev/null
    fi
}

# Get file hash
get_file_hash() {
    local file="$1"
    local algorithm="${2:-sha256}"
    
    if command_exists "${algorithm}sum"; then
        "${algorithm}sum" "$file" | cut -d' ' -f1
    else
        echo "Error: ${algorithm}sum not found"
        return 1
    fi
}

# Compare versions
version_compare() {
    local version1="$1"
    local version2="$2"
    local operation="${3:-eq}"  # eq, ne, lt, le, gt, ge
    
    local v1_parts=()
    local v2_parts=()
    
    IFS='.' read -ra v1_parts <<< "$version1"
    IFS='.' read -ra v2_parts <<< "$version2"
    
    # Pad arrays to same length
    local max_length
    max_length=$(( ${#v1_parts[@]} > ${#v2_parts[@]} ? ${#v1_parts[@]} : ${#v2_parts[@]} ))
    
    while [[ ${#v1_parts[@]} -lt $max_length ]]; do
        v1_parts+=(0)
    done
    
    while [[ ${#v2_parts[@]} -lt $max_length ]]; do
        v2_parts+=(0)
    done
    
    # Compare versions
    for ((i=0; i<max_length; i++)); do
        if [[ ${v1_parts[i]} -lt ${v2_parts[i]} ]]; then
            case $operation in
                "lt"|"le"|"ne") return 0 ;;
                *) return 1 ;;
            esac
        elif [[ ${v1_parts[i]} -gt ${v2_parts[i]} ]]; then
            case $operation in
                "gt"|"ge"|"ne") return 0 ;;
                *) return 1 ;;
            esac
        fi
    done
    
    # Versions are equal
    case $operation in
        "eq"|"le"|"ge") return 0 ;;
        *) return 1 ;;
    esac
}

# Create temporary directory
create_temp_dir() {
    local prefix="${1:-truststream}"
    local temp_dir
    temp_dir=$(mktemp -d -t "${prefix}-XXXXXXXX")
    echo "$temp_dir"
}

# Cleanup temporary directory
cleanup_temp_dir() {
    local temp_dir="$1"
    if [[ -n "$temp_dir" && -d "$temp_dir" ]]; then
        rm -rf "$temp_dir"
    fi
}

# Lock file operations
acquire_lock() {
    local lock_file="$1"
    local timeout="${2:-300}"  # 5 minutes
    local wait_interval="${3:-5}"
    local elapsed=0
    
    while [[ $elapsed -lt $timeout ]]; do
        if (set -C; echo $$ > "$lock_file") 2>/dev/null; then
            return 0
        fi
        
        # Check if lock is stale (process doesn't exist)
        if [[ -f "$lock_file" ]]; then
            local lock_pid
            lock_pid=$(cat "$lock_file" 2>/dev/null)
            if [[ -n "$lock_pid" ]] && ! kill -0 "$lock_pid" 2>/dev/null; then
                echo "Removing stale lock file: $lock_file"
                rm -f "$lock_file"
                continue
            fi
        fi
        
        sleep "$wait_interval"
        elapsed=$((elapsed + wait_interval))
    done
    
    return 1
}

release_lock() {
    local lock_file="$1"
    if [[ -f "$lock_file" ]]; then
        rm -f "$lock_file"
    fi
}

# Process management
is_process_running() {
    local pid="$1"
    kill -0 "$pid" 2>/dev/null
}

wait_for_process() {
    local pid="$1"
    local timeout="${2:-300}"
    local interval="${3:-5}"
    local elapsed=0
    
    while [[ $elapsed -lt $timeout ]]; do
        if ! is_process_running "$pid"; then
            return 0
        fi
        sleep "$interval"
        elapsed=$((elapsed + interval))
    done
    
    return 1
}

# Network utilities
get_available_port() {
    local start_port="${1:-8000}"
    local end_port="${2:-9000}"
    
    for ((port=start_port; port<=end_port; port++)); do
        if ! netstat -ln 2>/dev/null | grep -q ":$port "; then
            echo "$port"
            return 0
        fi
    done
    
    return 1
}

is_port_open() {
    local host="$1"
    local port="$2"
    local timeout="${3:-5}"
    
    timeout "$timeout" bash -c "</dev/tcp/$host/$port" 2>/dev/null
}

# Azure utilities
get_azure_access_token() {
    local resource="${1:-https://management.azure.com/}"
    az account get-access-token --resource "$resource" --query accessToken -o tsv
}

# Kubernetes utilities
get_k8s_namespace() {
    local environment="$1"
    echo "truststream-$environment"
}

k8s_namespace_exists() {
    local namespace="$1"
    kubectl get namespace "$namespace" >/dev/null 2>&1
}

create_k8s_namespace() {
    local namespace="$1"
    if ! k8s_namespace_exists "$namespace"; then
        kubectl create namespace "$namespace"
    fi
}

# Configuration utilities
merge_configs() {
    local base_config="$1"
    local override_config="$2"
    local output_config="$3"
    
    if command_exists yq; then
        yq eval-all 'select(fileIndex == 0) * select(fileIndex == 1)' "$base_config" "$override_config" > "$output_config"
    else
        echo "Error: yq not found. Cannot merge configurations."
        return 1
    fi
}

# Validation utilities
validate_email() {
    local email="$1"
    [[ "$email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]
}

validate_url() {
    local url="$1"
    [[ "$url" =~ ^https?://[a-zA-Z0-9.-]+(:[0-9]+)?(/.*)?$ ]]
}

validate_semver() {
    local version="$1"
    [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$ ]]
}

# Export all functions
export -f command_exists wait_for_command retry_command check_url wait_for_url
export -f generate_random_string get_timestamp get_iso_timestamp parse_yaml
export -f substitute_variables is_container is_azure get_azure_metadata
export -f validate_json validate_yaml get_file_hash version_compare
export -f create_temp_dir cleanup_temp_dir acquire_lock release_lock
export -f is_process_running wait_for_process get_available_port is_port_open
export -f get_azure_access_token get_k8s_namespace k8s_namespace_exists create_k8s_namespace
export -f merge_configs validate_email validate_url validate_semver