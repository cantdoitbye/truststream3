#!/bin/bash

# TrustStream v4.2 Blue-Green Deployment Strategy
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
IMAGE=""
CONFIG_FILE=""
DRY_RUN=false
VERBOSE=false
FORCE=false
WAIT_TIMEOUT=600
HEALTH_CHECK_RETRIES=10
TRAFFIC_SPLIT_PERCENTAGE=100
WARMUP_TIME=60

# Deployment state
CURRENT_SLOT=""
TARGET_SLOT=""
DEPLOYMENT_ID=""
ROLLBACK_REQUIRED=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment|-e)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --image|-i)
            IMAGE="$2"
            shift 2
            ;;
        --config|-c)
            CONFIG_FILE="$2"
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
        --traffic-split)
            TRAFFIC_SPLIT_PERCENTAGE="$2"
            shift 2
            ;;
        --warmup-time)
            WARMUP_TIME="$2"
            shift 2
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --verbose|-v)
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
TrustStream v4.2 Blue-Green Deployment Strategy

Usage: $0 [OPTIONS]

Options:
  -e, --environment ENV           Target environment (development|staging|production)
  -i, --image IMAGE              Container image to deploy
  -c, --config FILE              Configuration file path
      --wait-timeout SECONDS     Maximum time to wait for deployment [default: 600]
      --health-check-retries NUM  Number of health check retries [default: 10]
      --traffic-split PERCENT     Percentage of traffic to route to new version [default: 100]
      --warmup-time SECONDS       Time to warm up new deployment before checks [default: 60]
      --force                     Force deployment even if health checks fail
  -v, --verbose                   Enable verbose logging
      --dry-run                   Show what would be deployed without executing
  -h, --help                      Show this help message

Blue-Green Deployment Process:
  1. Identify current active slot (blue or green)
  2. Deploy new version to inactive slot
  3. Perform health checks on new deployment
  4. Switch traffic to new slot
  5. Monitor new deployment
  6. Clean up old deployment

Examples:
  # Deploy to production with blue-green strategy
  $0 --environment production --image myregistry/app:v1.2.0
  
  # Deploy with gradual traffic split
  $0 --environment staging --image app:latest --traffic-split 50
  
  # Dry run deployment
  $0 --environment development --image app:test --dry-run

EOF
}

# Initialize deployment
init_deployment() {
    log_header "TrustStream v4.2 Blue-Green Deployment"
    log_info "Environment: $ENVIRONMENT"
    log_info "Image: $IMAGE"
    log_info "Traffic Split: ${TRAFFIC_SPLIT_PERCENTAGE}%"
    
    # Validate inputs
    if [[ -z "$IMAGE" ]]; then
        log_error "Container image is required (--image)"
        exit 1
    fi
    
    if [[ -n "$CONFIG_FILE" ]]; then
        load_config "$CONFIG_FILE" "$ENVIRONMENT"
    fi
    
    # Generate deployment ID
    DEPLOYMENT_ID="bg-$(date +%Y%m%d-%H%M%S)"
    log_info "Deployment ID: $DEPLOYMENT_ID"
    
    # Set up cleanup trap
    trap cleanup_on_error EXIT
}

# Determine current and target slots
determine_slots() {
    log_step "Determining deployment slots..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        CURRENT_SLOT="blue"
        TARGET_SLOT="green"
        log_info "[DRY RUN] Current slot: $CURRENT_SLOT, Target slot: $TARGET_SLOT"
        return 0
    fi
    
    # For Azure App Service with slots
    local resource_group
    resource_group="$(get_azure_config "resourceGroup")"
    local app_name
    app_name="$(get_azure_config "appService")"
    
    # Get current production slot
    local current_slot_info
    current_slot_info="$(az webapp show --name "$app_name" --resource-group "$resource_group" --query 'siteConfig.metadata[?name==`CURRENT_SLOT`].value' -o tsv 2>/dev/null || echo "blue")"
    
    if [[ "$current_slot_info" == "green" ]]; then
        CURRENT_SLOT="green"
        TARGET_SLOT="blue"
    else
        CURRENT_SLOT="blue"
        TARGET_SLOT="green"
    fi
    
    log_info "Current active slot: $CURRENT_SLOT"
    log_info "Target deployment slot: $TARGET_SLOT"
}

# Create or update deployment slots
setup_deployment_slots() {
    log_step "Setting up deployment slots..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would setup deployment slots"
        return 0
    fi
    
    local resource_group
    resource_group="$(get_azure_config "resourceGroup")"
    local app_name
    app_name="$(get_azure_config "appService")"
    
    # Create target slot if it doesn't exist
    if ! az webapp deployment slot list --name "$app_name" --resource-group "$resource_group" --query "[?name=='$TARGET_SLOT']" -o tsv | grep -q "$TARGET_SLOT"; then
        log_info "Creating deployment slot: $TARGET_SLOT"
        az webapp deployment slot create \
            --name "$app_name" \
            --resource-group "$resource_group" \
            --slot "$TARGET_SLOT" \
            --configuration-source "$app_name" \
            --output none
    else
        log_info "Deployment slot '$TARGET_SLOT' already exists"
    fi
}

# Deploy to target slot
deploy_to_target_slot() {
    log_step "Deploying to target slot: $TARGET_SLOT"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would deploy image '$IMAGE' to slot '$TARGET_SLOT'"
        return 0
    fi
    
    local resource_group
    resource_group="$(get_azure_config "resourceGroup")"
    local app_name
    app_name="$(get_azure_config "appService")"
    
    # Update container image for target slot
    log_info "Updating container image for slot '$TARGET_SLOT'..."
    az webapp config container set \
        --name "$app_name" \
        --resource-group "$resource_group" \
        --slot "$TARGET_SLOT" \
        --docker-custom-image-name "$IMAGE" \
        --output none
    
    # Update app settings with deployment metadata
    az webapp config appsettings set \
        --name "$app_name" \
        --resource-group "$resource_group" \
        --slot "$TARGET_SLOT" \
        --settings \
            DEPLOYMENT_ID="$DEPLOYMENT_ID" \
            DEPLOYMENT_TIMESTAMP="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
            CONTAINER_IMAGE="$IMAGE" \
            DEPLOYMENT_SLOT="$TARGET_SLOT" \
        --output none
    
    log_success "Deployment to slot '$TARGET_SLOT' initiated"
}

# Wait for deployment to be ready
wait_for_deployment() {
    log_step "Waiting for deployment to be ready..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would wait for deployment to be ready"
        return 0
    fi
    
    local resource_group
    resource_group="$(get_azure_config "resourceGroup")"
    local app_name
    app_name="$(get_azure_config "appService")"
    
    # Get slot URL
    local slot_url="https://${app_name}-${TARGET_SLOT}.azurewebsites.net"
    
    log_info "Slot URL: $slot_url"
    log_info "Warming up deployment for ${WARMUP_TIME}s..."
    
    # Wait for warmup period
    sleep "$WARMUP_TIME"
    
    # Wait for the deployment to be responsive
    log_info "Waiting for deployment to be responsive..."
    
    if ! wait_for_url "$slot_url/health" 200 "$WAIT_TIMEOUT" 10; then
        log_error "Deployment failed to become responsive within ${WAIT_TIMEOUT}s"
        ROLLBACK_REQUIRED=true
        return 1
    fi
    
    log_success "Deployment is responsive"
}

# Perform health checks
perform_health_checks() {
    log_step "Performing health checks on target slot..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would perform health checks"
        return 0
    fi
    
    local resource_group
    resource_group="$(get_azure_config "resourceGroup")"
    local app_name
    app_name="$(get_azure_config "appService")"
    local slot_url="https://${app_name}-${TARGET_SLOT}.azurewebsites.net"
    
    local health_check_failed=false
    
    # Basic health check
    for ((i=1; i<=HEALTH_CHECK_RETRIES; i++)); do
        log_info "Health check attempt $i/$HEALTH_CHECK_RETRIES..."
        
        if check_url "$slot_url/health" 200 30; then
            log_success "Health check passed"
            break
        else
            log_warn "Health check failed (attempt $i/$HEALTH_CHECK_RETRIES)"
            
            if [[ $i -eq $HEALTH_CHECK_RETRIES ]]; then
                health_check_failed=true
            else
                sleep 10
            fi
        fi
    done
    
    if [[ "$health_check_failed" == "true" ]]; then
        log_error "Health checks failed after $HEALTH_CHECK_RETRIES attempts"
        
        if [[ "$FORCE" == "true" ]]; then
            log_warn "Continuing deployment despite health check failures (--force flag)"
        else
            ROLLBACK_REQUIRED=true
            return 1
        fi
    fi
    
    # Additional health checks
    log_info "Running additional health checks..."
    
    # Check database connectivity
    if ! check_url "$slot_url/api/health/database" 200 60; then
        log_error "Database connectivity check failed"
        if [[ "$FORCE" != "true" ]]; then
            ROLLBACK_REQUIRED=true
            return 1
        fi
    fi
    
    # Check external service connectivity
    if ! check_url "$slot_url/api/health/supabase" 200 30; then
        log_error "Supabase connectivity check failed"
        if [[ "$FORCE" != "true" ]]; then
            ROLLBACK_REQUIRED=true
            return 1
        fi
    fi
    
    log_success "All health checks passed"
    return 0
}

# Switch traffic to target slot
switch_traffic() {
    log_step "Switching traffic to target slot..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would switch ${TRAFFIC_SPLIT_PERCENTAGE}% traffic to slot '$TARGET_SLOT'"
        return 0
    fi
    
    local resource_group
    resource_group="$(get_azure_config "resourceGroup")"
    local app_name
    app_name="$(get_azure_config "appService")"
    
    if [[ "$TRAFFIC_SPLIT_PERCENTAGE" -eq 100 ]]; then
        # Full traffic switch (traditional blue-green)
        log_info "Performing full traffic switch to '$TARGET_SLOT'..."
        
        az webapp deployment slot swap \
            --name "$app_name" \
            --resource-group "$resource_group" \
            --slot "$TARGET_SLOT" \
            --target-slot production \
            --output none
        
        # Update metadata to track current slot
        az webapp config appsettings set \
            --name "$app_name" \
            --resource-group "$resource_group" \
            --settings CURRENT_SLOT="$TARGET_SLOT" \
            --output none
        
        log_success "Traffic switched to slot '$TARGET_SLOT'"
    else
        # Gradual traffic split
        log_info "Implementing gradual traffic split: ${TRAFFIC_SPLIT_PERCENTAGE}% to '$TARGET_SLOT'..."
        
        # Set traffic routing rules
        az webapp traffic-routing set \
            --name "$app_name" \
            --resource-group "$resource_group" \
            --distribution "$TARGET_SLOT"="$TRAFFIC_SPLIT_PERCENTAGE" \
            --output none
        
        log_success "Traffic split configured: ${TRAFFIC_SPLIT_PERCENTAGE}% to '$TARGET_SLOT'"
    fi
}

# Monitor new deployment
monitor_deployment() {
    log_step "Monitoring new deployment..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would monitor deployment for 5 minutes"
        return 0
    fi
    
    local app_url
    if [[ "$TRAFFIC_SPLIT_PERCENTAGE" -eq 100 ]]; then
        # Full switch - monitor production URL
        local app_name
        app_name="$(get_azure_config "appService")"
        app_url="https://${app_name}.azurewebsites.net"
    else
        # Gradual split - monitor slot URL
        local app_name
        app_name="$(get_azure_config "appService")"
        app_url="https://${app_name}-${TARGET_SLOT}.azurewebsites.net"
    fi
    
    log_info "Monitoring deployment at: $app_url"
    
    # Monitor for 5 minutes
    local monitor_duration=300
    local monitor_interval=30
    local monitor_start
    monitor_start="$(date +%s)"
    
    local consecutive_failures=0
    local max_consecutive_failures=3
    
    while true; do
        local current_time
        current_time="$(date +%s)"
        local elapsed=$((current_time - monitor_start))
        
        if [[ $elapsed -ge $monitor_duration ]]; then
            log_success "Monitoring completed successfully"
            break
        fi
        
        # Perform health check
        if check_url "$app_url/health" 200 10; then
            log_info "Health check passed (${elapsed}s elapsed)"
            consecutive_failures=0
        else
            consecutive_failures=$((consecutive_failures + 1))
            log_warn "Health check failed (failure $consecutive_failures/$max_consecutive_failures)"
            
            if [[ $consecutive_failures -ge $max_consecutive_failures ]]; then
                log_error "Multiple consecutive health check failures detected"
                ROLLBACK_REQUIRED=true
                return 1
            fi
        fi
        
        sleep "$monitor_interval"
    done
    
    return 0
}

# Complete traffic switch (if gradual deployment)
complete_traffic_switch() {
    if [[ "$TRAFFIC_SPLIT_PERCENTAGE" -ne 100 ]]; then
        log_step "Completing traffic switch to 100%..."
        
        if [[ "$DRY_RUN" == "true" ]]; then
            log_info "[DRY RUN] Would complete traffic switch to 100%"
            return 0
        fi
        
        # Perform full swap
        local resource_group
        resource_group="$(get_azure_config "resourceGroup")"
        local app_name
        app_name="$(get_azure_config "appService")"
        
        az webapp deployment slot swap \
            --name "$app_name" \
            --resource-group "$resource_group" \
            --slot "$TARGET_SLOT" \
            --target-slot production \
            --output none
        
        # Clear traffic routing rules
        az webapp traffic-routing clear \
            --name "$app_name" \
            --resource-group "$resource_group" \
            --output none
        
        # Update metadata
        az webapp config appsettings set \
            --name "$app_name" \
            --resource-group "$resource_group" \
            --settings CURRENT_SLOT="$TARGET_SLOT" \
            --output none
        
        log_success "Traffic switch completed"
    fi
}

# Cleanup old deployment
cleanup_old_deployment() {
    log_step "Cleaning up old deployment..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would cleanup old deployment in slot '$CURRENT_SLOT'"
        return 0
    fi
    
    # Note: In blue-green deployment, we typically keep the old slot
    # for quick rollback capability. Cleanup can be done later or
    # in the next deployment cycle.
    
    log_info "Old deployment in slot '$CURRENT_SLOT' kept for rollback capability"
    log_info "Old slot will be reused in the next deployment"
}

# Rollback deployment
rollback_deployment() {
    log_error "Rolling back deployment..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would rollback deployment"
        return 0
    fi
    
    local resource_group
    resource_group="$(get_azure_config "resourceGroup")"
    local app_name
    app_name="$(get_azure_config "appService")"
    
    # If traffic was already switched, switch it back
    if [[ "$TRAFFIC_SPLIT_PERCENTAGE" -eq 100 ]]; then
        # Check if swap occurred by comparing current metadata
        local current_deployment_slot
        current_deployment_slot="$(az webapp config appsettings list --name "$app_name" --resource-group "$resource_group" --query "[?name=='CURRENT_SLOT'].value" -o tsv 2>/dev/null || echo "")"
        
        if [[ "$current_deployment_slot" == "$TARGET_SLOT" ]]; then
            log_info "Swapping back to original slot..."
            az webapp deployment slot swap \
                --name "$app_name" \
                --resource-group "$resource_group" \
                --slot "$TARGET_SLOT" \
                --target-slot production \
                --output none
            
            # Restore metadata
            az webapp config appsettings set \
                --name "$app_name" \
                --resource-group "$resource_group" \
                --settings CURRENT_SLOT="$CURRENT_SLOT" \
                --output none
        fi
    else
        # Clear traffic routing to revert to original
        log_info "Clearing traffic routing rules..."
        az webapp traffic-routing clear \
            --name "$app_name" \
            --resource-group "$resource_group" \
            --output none
    fi
    
    log_error "Deployment rolled back to slot '$CURRENT_SLOT'"
}

# Cleanup on error
cleanup_on_error() {
    local exit_code=$?
    
    if [[ $exit_code -ne 0 || "$ROLLBACK_REQUIRED" == "true" ]]; then
        log_error "Deployment failed or rollback required"
        
        if [[ "$DRY_RUN" != "true" ]]; then
            rollback_deployment
        fi
    fi
    
    # Remove trap to avoid recursion
    trap - EXIT
}

# Main function
main() {
    init_deployment
    
    # Blue-Green deployment process
    determine_slots
    setup_deployment_slots
    deploy_to_target_slot
    wait_for_deployment
    
    if perform_health_checks; then
        switch_traffic
        
        if monitor_deployment; then
            complete_traffic_switch
            cleanup_old_deployment
            
            log_success "Blue-green deployment completed successfully!"
            log_info "Active slot: $TARGET_SLOT"
            log_info "Deployment ID: $DEPLOYMENT_ID"
            
            if [[ "$DRY_RUN" != "true" ]]; then
                local app_name
                app_name="$(get_azure_config "appService")"
                log_info "Application URL: https://${app_name}.azurewebsites.net"
            fi
        else
            log_error "Deployment monitoring failed"
            exit 1
        fi
    else
        log_error "Health checks failed"
        exit 1
    fi
}

# Run main function
main "$@"