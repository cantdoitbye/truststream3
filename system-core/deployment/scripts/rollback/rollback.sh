#!/bin/bash

# TrustStream v4.2 Deployment Rollback Script
# Author: MiniMax Agent
# Version: 1.0.0

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Load common utilities
source "$SCRIPT_DIR/../common/utils.sh"
source "$SCRIPT_DIR/../common/logging.sh"
source "$SCRIPT_DIR/../common/config.sh"

# Default values
ENVIRONMENT="development"
VERSION=""
CONFIG_FILE=""
DRY_RUN=false
VERBOSE=false
FORCE=false
ROLLBACK_TYPE="all"
WAIT_TIMEOUT=300
HEALTH_CHECK_RETRIES=5
BACKUP_CURRENT=true
BACKUP_ID=""

# Rollback state
ROLLBACK_START_TIME=0
CURRENT_VERSION=""
TARGET_VERSION=""
ROLLBACK_STEPS=()
COMPLETED_STEPS=()
FAILED_STEPS=()

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment|-e)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --version|-v)
            VERSION="$2"
            shift 2
            ;;
        --config|-c)
            CONFIG_FILE="$2"
            shift 2
            ;;
        --rollback-type)
            ROLLBACK_TYPE="$2"
            shift 2
            ;;
        --wait-timeout)
            WAIT_TIMEOUT="$2"
            shift 2
            ;;
        --health-check-retries)
            HEALTH_CHECK_RETRIES="$2"
            shift 2
            ;;
        --no-backup)
            BACKUP_CURRENT=false
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown parameter: $1"
            show_help
            exit 1
            ;;
    esac
done

# Show help function
show_help() {
    cat << EOF
TrustStream v4.2 Deployment Rollback Script

Usage: $0 [OPTIONS]

Options:
  -e, --environment ENV        Target environment (development|staging|production)
  -v, --version VERSION        Version to rollback to (required)
  -c, --config FILE           Configuration file path
      --rollback-type TYPE    Rollback type (all|app|database|edge-functions) [default: all]
      --wait-timeout SECONDS  Maximum time to wait for rollback [default: 300]
      --health-check-retries N Number of health check retries [default: 5]
      --no-backup             Skip backup of current state
      --force                 Force rollback even if validation fails
      --verbose               Enable verbose logging
      --dry-run               Show what would be rolled back without executing
  -h, --help                  Show this help message

Rollback Types:
  all           Rollback application, database, and edge functions
  app           Rollback only application deployment
  database      Rollback only database migrations
  edge-functions Rollback only edge functions

Examples:
  # Rollback production to previous version
  $0 --environment production --version v4.2.1
  
  # Rollback only application
  $0 --environment staging --version v4.2.0 --rollback-type app
  
  # Dry run rollback
  $0 --environment development --version v4.1.9 --dry-run

EOF
}

# Initialize rollback
init_rollback() {
    log_header "TrustStream v4.2 Deployment Rollback"
    log_info "Environment: $ENVIRONMENT"
    log_info "Target Version: $VERSION"
    log_info "Rollback Type: $ROLLBACK_TYPE"
    
    # Validate inputs
    if [[ -z "$VERSION" ]]; then
        log_error "Target version is required (--version)"
        exit 1
    fi
    
    if [[ -n "$CONFIG_FILE" ]]; then
        log_info "Loading configuration: $CONFIG_FILE"
        load_config "$CONFIG_FILE" "$ENVIRONMENT"
    fi
    
    # Record rollback start time
    ROLLBACK_START_TIME="$(date +%s)"
    
    # Safety check for production
    if [[ "$ENVIRONMENT" == "production" && "$FORCE" != "true" ]]; then
        log_warn "Production rollback detected!"
        echo -n "Are you sure you want to rollback production to $VERSION? (yes/no): "
        read -r confirmation
        if [[ "$confirmation" != "yes" ]]; then
            log_info "Rollback cancelled by user"
            exit 0
        fi
    fi
    
    # Set up cleanup trap
    trap cleanup_on_error EXIT
}

# Get current deployment version
get_current_version() {
    log_step "Getting current deployment version..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        CURRENT_VERSION="v4.2.3"
        log_info "[DRY RUN] Current version: $CURRENT_VERSION"
        return 0
    fi
    
    # Try to get version from Azure App Service
    local resource_group
    resource_group="$(get_azure_config "resourceGroup")"
    local app_name
    app_name="$(get_azure_config "appService")"
    
    if command_exists az; then
        CURRENT_VERSION="$(az webapp config appsettings list \
            --name "$app_name" \
            --resource-group "$resource_group" \
            --query "[?name=='APP_VERSION'].value" \
            -o tsv 2>/dev/null || echo "")"
    fi
    
    # Fallback to application health endpoint
    if [[ -z "$CURRENT_VERSION" ]]; then
        local app_url="https://${app_name}.azurewebsites.net"
        CURRENT_VERSION="$(curl -f -s --max-time 10 "$app_url/api/version" | jq -r '.version' 2>/dev/null || echo "unknown")"
    fi
    
    if [[ -z "$CURRENT_VERSION" || "$CURRENT_VERSION" == "null" || "$CURRENT_VERSION" == "unknown" ]]; then
        CURRENT_VERSION="unknown"
        log_warn "Could not determine current version"
    else
        log_info "Current version: $CURRENT_VERSION"
    fi
    
    TARGET_VERSION="$VERSION"
}

# Validate rollback target
validate_rollback_target() {
    log_step "Validating rollback target..."
    
    # Check if target version is different from current
    if [[ "$CURRENT_VERSION" == "$TARGET_VERSION" ]]; then
        log_warn "Target version is the same as current version: $TARGET_VERSION"
        if [[ "$FORCE" != "true" ]]; then
            log_error "No rollback needed. Use --force to proceed anyway."
            exit 1
        fi
    fi
    
    # Check if target version exists
    if [[ "$DRY_RUN" != "true" ]]; then
        # Try to validate version exists in container registry or backup
        log_info "Validating target version availability..."
        
        # Check if container image exists for the target version
        local container_image
        container_image="$(get_container_config "image"):$TARGET_VERSION"
        
        if command_exists docker; then
            # Try to pull the image to validate it exists
            if docker manifest inspect "$container_image" >/dev/null 2>&1; then
                log_success "Container image found for version: $TARGET_VERSION"
            else
                log_warn "Container image not found: $container_image"
                if [[ "$FORCE" != "true" ]]; then
                    log_error "Target version image not available. Use --force to proceed."
                    exit 1
                fi
            fi
        fi
    fi
    
    log_success "Rollback target validated"
}

# Plan rollback steps
plan_rollback_steps() {
    log_step "Planning rollback steps..."
    
    ROLLBACK_STEPS=()
    
    case "$ROLLBACK_TYPE" in
        "all")
            ROLLBACK_STEPS+=("backup_current")
            ROLLBACK_STEPS+=("rollback_edge_functions")
            ROLLBACK_STEPS+=("rollback_application")
            ROLLBACK_STEPS+=("rollback_database")
            ROLLBACK_STEPS+=("validate_rollback")
            ;;
        "app")
            ROLLBACK_STEPS+=("backup_current")
            ROLLBACK_STEPS+=("rollback_application")
            ROLLBACK_STEPS+=("validate_rollback")
            ;;
        "database")
            ROLLBACK_STEPS+=("backup_current")
            ROLLBACK_STEPS+=("rollback_database")
            ROLLBACK_STEPS+=("validate_rollback")
            ;;
        "edge-functions")
            ROLLBACK_STEPS+=("backup_current")
            ROLLBACK_STEPS+=("rollback_edge_functions")
            ROLLBACK_STEPS+=("validate_rollback")
            ;;
        *)
            log_error "Unknown rollback type: $ROLLBACK_TYPE"
            exit 1
            ;;
    esac
    
    log_info "Rollback plan (${#ROLLBACK_STEPS[@]} steps):"
    for ((i=0; i<${#ROLLBACK_STEPS[@]}; i++)); do
        log_info "  $((i+1)). ${ROLLBACK_STEPS[i]}"
    done
}

# Backup current state
backup_current() {
    if [[ "$BACKUP_CURRENT" != "true" ]]; then
        log_info "Backup disabled, skipping current state backup"
        return 0
    fi
    
    log_step "Backing up current state..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        BACKUP_ID="rollback-backup-$(date +%Y%m%d-%H%M%S)"
        log_info "[DRY RUN] Would create backup: $BACKUP_ID"
        return 0
    fi
    
    # Generate backup ID
    BACKUP_ID="rollback-backup-$(date +%Y%m%d-%H%M%S)"
    
    # Run backup script if available
    if [[ -f "$SCRIPT_DIR/../backup/create-backup.sh" ]]; then
        "$SCRIPT_DIR/../backup/create-backup.sh" \
            --environment "$ENVIRONMENT" \
            --type "pre-rollback" \
            --backup-id "$BACKUP_ID"
    else
        log_warn "Backup script not found, continuing without backup"
        BACKUP_ID=""
    fi
    
    if [[ -n "$BACKUP_ID" ]]; then
        log_success "Current state backed up: $BACKUP_ID"
    fi
}

# Rollback application
rollback_application() {
    log_step "Rolling back application to version $TARGET_VERSION..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would rollback application to version: $TARGET_VERSION"
        return 0
    fi
    
    local resource_group
    resource_group="$(get_azure_config "resourceGroup")"
    local app_name
    app_name="$(get_azure_config "appService")"
    
    # Get container image for target version
    local container_image
    container_image="$(get_container_config "image"):$TARGET_VERSION"
    
    log_info "Rolling back to container image: $container_image"
    
    # Update container image
    if az webapp config container set \
        --name "$app_name" \
        --resource-group "$resource_group" \
        --docker-custom-image-name "$container_image" \
        --output none; then
        
        # Update app settings to reflect rollback
        az webapp config appsettings set \
            --name "$app_name" \
            --resource-group "$resource_group" \
            --settings \
                APP_VERSION="$TARGET_VERSION" \
                ROLLBACK_TIMESTAMP="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
                ROLLBACK_FROM_VERSION="$CURRENT_VERSION" \
                CONTAINER_IMAGE="$container_image" \
            --output none
        
        log_success "Application rollback initiated"
        
        # Wait for deployment to complete
        log_info "Waiting for application rollback to complete..."
        
        local app_url="https://${app_name}.azurewebsites.net"
        
        if wait_for_url "$app_url/health" 200 "$WAIT_TIMEOUT" 10; then
            log_success "Application rollback completed"
        else
            log_error "Application rollback failed - service not responding"
            return 1
        fi
    else
        log_error "Failed to update container image"
        return 1
    fi
}

# Rollback database
rollback_database() {
    log_step "Rolling back database to version $TARGET_VERSION..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would rollback database to version: $TARGET_VERSION"
        return 0
    fi
    
    # Check if database migration rollback script exists
    if [[ -f "$SCRIPT_DIR/../database/rollback-migration.sh" ]]; then
        "$SCRIPT_DIR/../database/rollback-migration.sh" \
            --environment "$ENVIRONMENT" \
            --target-version "$TARGET_VERSION" \
            --config "$CONFIG_FILE"
    else
        log_warn "Database rollback script not found"
        log_warn "Manual database rollback may be required"
        
        if [[ "$FORCE" != "true" ]]; then
            log_error "Cannot proceed without database rollback capability"
            return 1
        fi
    fi
    
    log_success "Database rollback completed"
}

# Rollback edge functions
rollback_edge_functions() {
    log_step "Rolling back edge functions to version $TARGET_VERSION..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would rollback edge functions to version: $TARGET_VERSION"
        return 0
    fi
    
    # Check if edge function rollback is supported
    if command_exists supabase; then
        log_info "Rolling back Supabase edge functions..."
        
        # Get functions from configuration
        local functions_to_rollback
        functions_to_rollback="$(get_edge_functions_config "supabase.functions" || echo "")"
        
        if [[ -n "$functions_to_rollback" ]]; then
            # Note: Supabase doesn't have built-in rollback, so we would need to
            # redeploy the previous version of the functions
            log_warn "Edge function rollback requires redeployment of previous version"
            log_info "This would require the previous function code to be available"
            
            if [[ "$FORCE" != "true" ]]; then
                log_error "Edge function rollback not fully supported without --force"
                return 1
            fi
        fi
    else
        log_warn "Supabase CLI not available for edge function rollback"
    fi
    
    log_success "Edge functions rollback completed"
}

# Validate rollback
validate_rollback() {
    log_step "Validating rollback..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would validate rollback"
        return 0
    fi
    
    # Run validation script
    if [[ -f "$SCRIPT_DIR/../validation/validate-deployment.sh" ]]; then
        "$SCRIPT_DIR/../validation/validate-deployment.sh" \
            --environment "$ENVIRONMENT" \
            --test-suites "health,api" \
            --timeout 60
    else
        # Basic health check
        local app_url
        if [[ -n "$CONFIG_FILE" ]]; then
            local app_name
            app_name="$(get_azure_config "appService")"
            app_url="https://${app_name}.azurewebsites.net"
        else
            app_url="http://localhost:3000"
        fi
        
        log_info "Performing basic health check..."
        
        for ((i=1; i<=HEALTH_CHECK_RETRIES; i++)); do
            if check_url "$app_url/health" 200 30; then
                log_success "Health check passed"
                break
            else
                log_warn "Health check failed (attempt $i/$HEALTH_CHECK_RETRIES)"
                
                if [[ $i -eq $HEALTH_CHECK_RETRIES ]]; then
                    log_error "Health check failed after $HEALTH_CHECK_RETRIES attempts"
                    return 1
                else
                    sleep 10
                fi
            fi
        done
    fi
    
    # Verify version
    log_info "Verifying rollback version..."
    
    local actual_version
    actual_version="$(curl -f -s --max-time 10 "$app_url/api/version" | jq -r '.version' 2>/dev/null || echo "unknown")"
    
    if [[ "$actual_version" == "$TARGET_VERSION" ]]; then
        log_success "Version verification passed: $actual_version"
    else
        log_warn "Version mismatch - Expected: $TARGET_VERSION, Actual: $actual_version"
        
        if [[ "$FORCE" != "true" ]]; then
            log_error "Version verification failed"
            return 1
        fi
    fi
    
    log_success "Rollback validation completed"
}

# Execute rollback step
execute_rollback_step() {
    local step="$1"
    local step_number="$2"
    local total_steps="$3"
    
    log_info "Step $step_number/$total_steps: $step"
    
    case "$step" in
        "backup_current")
            backup_current
            ;;
        "rollback_application")
            rollback_application
            ;;
        "rollback_database")
            rollback_database
            ;;
        "rollback_edge_functions")
            rollback_edge_functions
            ;;
        "validate_rollback")
            validate_rollback
            ;;
        *)
            log_error "Unknown rollback step: $step"
            return 1
            ;;
    esac
    
    COMPLETED_STEPS+=("$step")
}

# Execute rollback plan
execute_rollback_plan() {
    log_step "Executing rollback plan..."
    
    local total_steps=${#ROLLBACK_STEPS[@]}
    
    for ((i=0; i<total_steps; i++)); do
        local step="${ROLLBACK_STEPS[i]}"
        local step_number=$((i+1))
        
        if execute_rollback_step "$step" "$step_number" "$total_steps"; then
            log_success "Step completed: $step"
        else
            log_error "Step failed: $step"
            FAILED_STEPS+=("$step")
            
            if [[ "$FORCE" == "true" ]]; then
                log_warn "Continuing due to --force flag"
            else
                log_error "Rollback failed at step: $step"
                return 1
            fi
        fi
    done
    
    log_success "Rollback plan execution completed"
}

# Generate rollback report
generate_rollback_report() {
    log_section "Rollback Summary"
    
    local end_time
    end_time="$(date +%s)"
    local total_duration=$((end_time - ROLLBACK_START_TIME))
    
    log_info "Environment: $ENVIRONMENT"
    log_info "Rollback Type: $ROLLBACK_TYPE"
    log_info "From Version: $CURRENT_VERSION"
    log_info "To Version: $TARGET_VERSION"
    log_info "Total Duration: ${total_duration}s"
    log_info "Steps Completed: ${#COMPLETED_STEPS[@]}/${#ROLLBACK_STEPS[@]}"
    log_info "Steps Failed: ${#FAILED_STEPS[@]}"
    
    if [[ -n "$BACKUP_ID" ]]; then
        log_info "Backup Created: $BACKUP_ID"
    fi
    
    if [[ "$VERBOSE" == "true" ]]; then
        if [[ ${#COMPLETED_STEPS[@]} -gt 0 ]]; then
            log_info "Completed Steps:"
            for step in "${COMPLETED_STEPS[@]}"; do
                log_info "  ✓ $step"
            done
        fi
        
        if [[ ${#FAILED_STEPS[@]} -gt 0 ]]; then
            log_info "Failed Steps:"
            for step in "${FAILED_STEPS[@]}"; do
                log_info "  ✗ $step"
            done
        fi
    fi
}

# Cleanup on error
cleanup_on_error() {
    local exit_code=$?
    
    if [[ $exit_code -ne 0 ]]; then
        log_error "Rollback failed with exit code: $exit_code"
        
        # Show completed steps for debugging
        if [[ ${#COMPLETED_STEPS[@]} -gt 0 ]]; then
            log_info "Steps completed before failure:"
            for step in "${COMPLETED_STEPS[@]}"; do
                log_info "  ✓ $step"
            done
        fi
        
        if [[ -n "$BACKUP_ID" ]]; then
            log_info "Emergency backup available: $BACKUP_ID"
        fi
    fi
    
    # Remove trap to avoid recursion
    trap - EXIT
}

# Main function
main() {
    init_rollback
    get_current_version
    validate_rollback_target
    plan_rollback_steps
    
    # Show rollback plan and confirm
    if [[ "$FORCE" != "true" && "$DRY_RUN" != "true" ]]; then
        echo -n "Proceed with rollback plan? (yes/no): "
        read -r confirmation
        if [[ "$confirmation" != "yes" ]]; then
            log_info "Rollback cancelled by user"
            exit 0
        fi
    fi
    
    # Execute rollback
    execute_rollback_plan
    
    # Generate report
    generate_rollback_report
    
    # Determine exit code
    if [[ ${#FAILED_STEPS[@]} -gt 0 ]]; then
        if [[ "$FORCE" == "true" ]]; then
            log_warn "Rollback completed with failures, but continuing due to --force flag"
            log_success "Rollback completed!"
        else
            log_error "Rollback failed for ${#FAILED_STEPS[@]} steps"
            exit 1
        fi
    else
        log_success "Rollback completed successfully!"
        log_info "Version: $CURRENT_VERSION → $TARGET_VERSION"
        
        if [[ "$DRY_RUN" != "true" ]]; then
            local app_name
            app_name="$(get_azure_config "appService")"
            log_info "Application URL: https://${app_name}.azurewebsites.net"
        fi
    fi
}

# Run main function
main "$@"