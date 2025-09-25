#!/bin/bash

# TrustStream v4.2 Configuration Management
# Author: MiniMax Agent

# Check if script is being sourced
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    echo "Error: This script should be sourced, not executed directly"
    exit 1
fi

# Global configuration variables
CONFIG_LOADED=false
CONFIG_FILE=""
CONFIG_ENVIRONMENT=""
CONFIG_CACHE_DIR="/tmp/truststream-config-cache"

# Configuration validation functions
validate_environment() {
    local env="$1"
    
    case "$env" in
        development|staging|production)
            return 0
            ;;
        *)
            log_error "Invalid environment: $env"
            log_error "Valid environments: development, staging, production"
            return 1
            ;;
    esac
}

validate_config_file() {
    local config_file="$1"
    
    if [[ ! -f "$config_file" ]]; then
        log_error "Configuration file not found: $config_file"
        return 1
    fi
    
    if ! validate_yaml "$config_file"; then
        log_error "Invalid YAML syntax in configuration file: $config_file"
        return 1
    fi
    
    # Check required sections
    local required_sections=("environments" "pipeline" "azure" "container")
    for section in "${required_sections[@]}"; do
        if ! yq eval "has(\"$section\")" "$config_file" | grep -q "true"; then
            log_error "Missing required section '$section' in configuration file"
            return 1
        fi
    done
    
    log_debug "Configuration file validation passed: $config_file"
    return 0
}

# Load configuration from file
load_config() {
    local config_file="$1"
    local environment="$2"
    
    log_info "Loading configuration..."
    log_debug "Config file: $config_file"
    log_debug "Environment: $environment"
    
    # Validate inputs
    validate_environment "$environment" || return 1
    validate_config_file "$config_file" || return 1
    
    # Set global variables
    CONFIG_FILE="$config_file"
    CONFIG_ENVIRONMENT="$environment"
    
    # Create cache directory
    mkdir -p "$CONFIG_CACHE_DIR" 2>/dev/null || true
    
    # Cache parsed configuration
    local cache_file="$CONFIG_CACHE_DIR/config-$environment-$(get_file_hash "$config_file" sha256).yaml"
    
    if [[ ! -f "$cache_file" || "$config_file" -nt "$cache_file" ]]; then
        log_debug "Parsing and caching configuration..."
        
        # Parse configuration with environment substitution
        yq eval ".environments.$environment" "$config_file" > "$cache_file.env" 2>/dev/null
        yq eval '.pipeline' "$config_file" > "$cache_file.pipeline" 2>/dev/null
        yq eval '.azure' "$config_file" > "$cache_file.azure" 2>/dev/null
        yq eval '.container' "$config_file" > "$cache_file.container" 2>/dev/null
        yq eval '.database' "$config_file" > "$cache_file.database" 2>/dev/null
        yq eval '.edgeFunctions' "$config_file" > "$cache_file.edgeFunctions" 2>/dev/null
        yq eval '.monitoring' "$config_file" > "$cache_file.monitoring" 2>/dev/null
        yq eval '.rollback' "$config_file" > "$cache_file.rollback" 2>/dev/null
        yq eval '.security' "$config_file" > "$cache_file.security" 2>/dev/null
        yq eval '.validation' "$config_file" > "$cache_file.validation" 2>/dev/null
        yq eval '.notifications' "$config_file" > "$cache_file.notifications" 2>/dev/null
        yq eval '.backup' "$config_file" > "$cache_file.backup" 2>/dev/null
        
        touch "$cache_file"
    fi
    
    CONFIG_LOADED=true
    log_success "Configuration loaded successfully"
    
    return 0
}

# Get configuration value
get_config() {
    local key_path="$1"
    local default_value="${2:-}"
    local config_section="${3:-}"
    
    if [[ "$CONFIG_LOADED" != "true" ]]; then
        log_error "Configuration not loaded. Call load_config() first."
        return 1
    fi
    
    local cache_file_base="$CONFIG_CACHE_DIR/config-$CONFIG_ENVIRONMENT-$(get_file_hash "$CONFIG_FILE" sha256)"
    local cache_file
    
    # Determine which cached file to use
    if [[ -n "$config_section" ]]; then
        cache_file="${cache_file_base}.${config_section}"
    else
        # Try to determine section from key path
        case "$key_path" in
            .replicas|.resources.*|.healthCheck.*)
                cache_file="${cache_file_base}.env"
                ;;
            .strategy|.timeout|.healthCheckRetries.*)
                cache_file="${cache_file_base}.pipeline"
                ;;
            .resourceGroup|.location|.containerRegistry.*)
                cache_file="${cache_file_base}.azure"
                ;;
            .image|.tag|.ports.*)
                cache_file="${cache_file_base}.container"
                ;;
            .migrations.*)
                cache_file="${cache_file_base}.database"
                ;;
            .supabase.*)
                cache_file="${cache_file_base}.edgeFunctions"
                ;;
            .healthChecks.*|.metrics.*|.alerts.*)
                cache_file="${cache_file_base}.monitoring"
                ;;
            .enabled|.maxVersionsToKeep.*)
                cache_file="${cache_file_base}.rollback"
                ;;
            .secretsManagement.*|.networkPolicies.*)
                cache_file="${cache_file_base}.security"
                ;;
            .tests.*)
                cache_file="${cache_file_base}.validation"
                ;;
            .channels.*)
                cache_file="${cache_file_base}.notifications"
                ;;
            .schedule|.retention.*)
                cache_file="${cache_file_base}.backup"
                ;;
            *)
                # Default to environment config
                cache_file="${cache_file_base}.env"
                ;;
        esac
    fi
    
    if [[ ! -f "$cache_file" ]]; then
        if [[ -n "$default_value" ]]; then
            echo "$default_value"
            return 0
        else
            log_error "Configuration cache file not found: $cache_file"
            return 1
        fi
    fi
    
    local value
    value="$(yq eval "$key_path" "$cache_file" 2>/dev/null)"
    
    if [[ "$value" == "null" || -z "$value" ]]; then
        if [[ -n "$default_value" ]]; then
            echo "$default_value"
        else
            log_error "Configuration key not found: $key_path"
            return 1
        fi
    else
        # Substitute environment variables
        echo "$value" | envsubst
    fi
}

# Set configuration value (for runtime overrides)
set_config() {
    local key_path="$1"
    local value="$2"
    local config_section="${3:-env}"
    
    if [[ "$CONFIG_LOADED" != "true" ]]; then
        log_error "Configuration not loaded. Call load_config() first."
        return 1
    fi
    
    local cache_file_base="$CONFIG_CACHE_DIR/config-$CONFIG_ENVIRONMENT-$(get_file_hash "$CONFIG_FILE" sha256)"
    local cache_file="${cache_file_base}.${config_section}"
    
    if [[ ! -f "$cache_file" ]]; then
        log_error "Configuration cache file not found: $cache_file"
        return 1
    fi
    
    # Update the cached configuration
    yq eval "$key_path = \"$value\"" -i "$cache_file"
    
    log_debug "Configuration updated: $key_path = $value"
}

# Get environment-specific configuration
get_env_config() {
    local key="$1"
    local default_value="${2:-}"
    
    get_config ".$key" "$default_value" "env"
}

# Get pipeline configuration
get_pipeline_config() {
    local key="$1"
    local default_value="${2:-}"
    
    get_config ".$key" "$default_value" "pipeline"
}

# Get Azure configuration
get_azure_config() {
    local key="$1"
    local default_value="${2:-}"
    
    local value
    value="$(get_config ".$key" "$default_value" "azure")"
    
    # Substitute environment in Azure resource names
    echo "$value" | sed "s/{ENVIRONMENT}/$CONFIG_ENVIRONMENT/g"
}

# Get container configuration
get_container_config() {
    local key="$1"
    local default_value="${2:-}"
    
    get_config ".$key" "$default_value" "container"
}

# Get database configuration
get_database_config() {
    local key="$1"
    local default_value="${2:-}"
    
    get_config ".$key" "$default_value" "database"
}

# Get edge functions configuration
get_edge_functions_config() {
    local key="$1"
    local default_value="${2:-}"
    
    get_config ".$key" "$default_value" "edgeFunctions"
}

# Get monitoring configuration
get_monitoring_config() {
    local key="$1"
    local default_value="${2:-}"
    
    get_config ".$key" "$default_value" "monitoring"
}

# Get rollback configuration
get_rollback_config() {
    local key="$1"
    local default_value="${2:-}"
    
    get_config ".$key" "$default_value" "rollback"
}

# Get security configuration
get_security_config() {
    local key="$1"
    local default_value="${2:-}"
    
    get_config ".$key" "$default_value" "security"
}

# Get validation configuration
get_validation_config() {
    local key="$1"
    local default_value="${2:-}"
    
    get_config ".$key" "$default_value" "validation"
}

# Get notifications configuration
get_notifications_config() {
    local key="$1"
    local default_value="${2:-}"
    
    get_config ".$key" "$default_value" "notifications"
}

# Get backup configuration
get_backup_config() {
    local key="$1"
    local default_value="${2:-}"
    
    get_config ".$key" "$default_value" "backup"
}

# List all configuration keys in a section
list_config_keys() {
    local config_section="${1:-env}"
    
    if [[ "$CONFIG_LOADED" != "true" ]]; then
        log_error "Configuration not loaded. Call load_config() first."
        return 1
    fi
    
    local cache_file_base="$CONFIG_CACHE_DIR/config-$CONFIG_ENVIRONMENT-$(get_file_hash "$CONFIG_FILE" sha256)"
    local cache_file="${cache_file_base}.${config_section}"
    
    if [[ ! -f "$cache_file" ]]; then
        log_error "Configuration cache file not found: $cache_file"
        return 1
    fi
    
    yq eval 'keys | .[]' "$cache_file" 2>/dev/null
}

# Export configuration as environment variables
export_config_as_env() {
    local prefix="${1:-TRUSTSTREAM}"
    local config_section="${2:-env}"
    
    if [[ "$CONFIG_LOADED" != "true" ]]; then
        log_error "Configuration not loaded. Call load_config() first."
        return 1
    fi
    
    log_info "Exporting configuration as environment variables with prefix: $prefix"
    
    local cache_file_base="$CONFIG_CACHE_DIR/config-$CONFIG_ENVIRONMENT-$(get_file_hash "$CONFIG_FILE" sha256)"
    local cache_file="${cache_file_base}.${config_section}"
    
    if [[ ! -f "$cache_file" ]]; then
        log_error "Configuration cache file not found: $cache_file"
        return 1
    fi
    
    # Get all keys and values
    while IFS= read -r key; do
        local value
        value="$(yq eval ".$key" "$cache_file" 2>/dev/null)"
        
        if [[ "$value" != "null" && -n "$value" ]]; then
            # Convert key to uppercase and replace dots/dashes with underscores
            local env_var_name
            env_var_name="${prefix}_$(echo "$key" | tr '[:lower:].-' '[:upper:]__')"
            
            # Export the variable
            export "$env_var_name"="$value"
            log_debug "Exported: $env_var_name=$value"
        fi
    done < <(yq eval 'keys | .[]' "$cache_file" 2>/dev/null)
}

# Merge configuration files
merge_config_files() {
    local base_config="$1"
    local override_config="$2"
    local output_config="$3"
    
    log_info "Merging configuration files..."
    log_debug "Base: $base_config"
    log_debug "Override: $override_config"
    log_debug "Output: $output_config"
    
    # Validate input files
    validate_config_file "$base_config" || return 1
    
    if [[ -f "$override_config" ]]; then
        validate_config_file "$override_config" || return 1
        merge_configs "$base_config" "$override_config" "$output_config"
    else
        log_warn "Override config file not found: $override_config"
        cp "$base_config" "$output_config"
    fi
    
    log_success "Configuration files merged successfully"
}

# Validate configuration for environment
validate_config_for_environment() {
    local environment="$1"
    
    if [[ "$CONFIG_LOADED" != "true" ]]; then
        log_error "Configuration not loaded. Call load_config() first."
        return 1
    fi
    
    log_info "Validating configuration for environment: $environment"
    
    # Check if environment exists in config
    if ! yq eval "has(\"environments.$environment\")" "$CONFIG_FILE" | grep -q "true"; then
        log_error "Environment '$environment' not found in configuration"
        return 1
    fi
    
    # Validate required environment configuration
    local required_env_keys=("replicas" "resources" "healthCheck")
    for key in "${required_env_keys[@]}"; do
        if ! yq eval "has(\"environments.$environment.$key\")" "$CONFIG_FILE" | grep -q "true"; then
            log_error "Missing required configuration key for environment '$environment': $key"
            return 1
        fi
    done
    
    # Validate resource specifications
    local cpu_request
    cpu_request="$(get_env_config "resources.requests.cpu")"
    if [[ -z "$cpu_request" ]]; then
        log_error "CPU request not specified for environment: $environment"
        return 1
    fi
    
    local memory_request
    memory_request="$(get_env_config "resources.requests.memory")"
    if [[ -z "$memory_request" ]]; then
        log_error "Memory request not specified for environment: $environment"
        return 1
    fi
    
    # Validate health check configuration
    local health_check_path
    health_check_path="$(get_env_config "healthCheck.path")"
    if [[ -z "$health_check_path" ]]; then
        log_error "Health check path not specified for environment: $environment"
        return 1
    fi
    
    log_success "Configuration validation passed for environment: $environment"
    return 0
}

# Clean configuration cache
clean_config_cache() {
    if [[ -d "$CONFIG_CACHE_DIR" ]]; then
        log_info "Cleaning configuration cache..."
        rm -rf "$CONFIG_CACHE_DIR"
        log_success "Configuration cache cleaned"
    fi
}

# Show current configuration
show_config() {
    local config_section="${1:-all}"
    
    if [[ "$CONFIG_LOADED" != "true" ]]; then
        log_error "Configuration not loaded. Call load_config() first."
        return 1
    fi
    
    log_info "Current Configuration:"
    echo "  Environment: $CONFIG_ENVIRONMENT"
    echo "  Config File: $CONFIG_FILE"
    echo ""
    
    local cache_file_base="$CONFIG_CACHE_DIR/config-$CONFIG_ENVIRONMENT-$(get_file_hash "$CONFIG_FILE" sha256)"
    
    if [[ "$config_section" == "all" ]]; then
        local sections=("env" "pipeline" "azure" "container" "database" "edgeFunctions" "monitoring" "rollback" "security" "validation" "notifications" "backup")
        for section in "${sections[@]}"; do
            local cache_file="${cache_file_base}.${section}"
            if [[ -f "$cache_file" ]]; then
                echo "[$section]"
                yq eval '.' "$cache_file" | sed 's/^/  /'
                echo ""
            fi
        done
    else
        local cache_file="${cache_file_base}.${config_section}"
        if [[ -f "$cache_file" ]]; then
            echo "[$config_section]"
            yq eval '.' "$cache_file" | sed 's/^/  /'
        else
            log_error "Configuration section not found: $config_section"
            return 1
        fi
    fi
}

# Export all functions
export -f validate_environment validate_config_file load_config get_config set_config
export -f get_env_config get_pipeline_config get_azure_config get_container_config
export -f get_database_config get_edge_functions_config get_monitoring_config
export -f get_rollback_config get_security_config get_validation_config
export -f get_notifications_config get_backup_config list_config_keys
export -f export_config_as_env merge_config_files validate_config_for_environment
export -f clean_config_cache show_config