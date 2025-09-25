#!/bin/bash

# TrustStream v4.2 Production Deployment Pipeline
# Author: MiniMax Agent
# Version: 1.0.0
# Usage: ./deploy.sh --environment production --strategy blue-green

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOYMENT_DIR="$ROOT_DIR/deployment"

# Load common utilities
source "$SCRIPT_DIR/common/utils.sh"
source "$SCRIPT_DIR/common/logging.sh"
source "$SCRIPT_DIR/common/config.sh"

# Default values
ENVIRONMENT="development"
STRATEGY="rolling"
SKIP_TESTS=false
SKIP_MIGRATION=false
FORCE_DEPLOY=false
VERBOSE=false
DRY_RUN=false
ROLLBACK_VERSION=""
CONFIG_FILE="$DEPLOYMENT_DIR/config/pipeline-config.yaml"
BUILD_NUMBER="$(date +%Y%m%d-%H%M%S)"
DEPLOYMENT_ID="deploy-$BUILD_NUMBER"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment|-e)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --strategy|-s)
            STRATEGY="$2"
            shift 2
            ;;
        --config|-c)
            CONFIG_FILE="$2"
            shift 2
            ;;
        --build-number|-b)
            BUILD_NUMBER="$2"
            shift 2
            ;;
        --rollback-version|-r)
            ROLLBACK_VERSION="$2"
            shift 2
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-migration)
            SKIP_MIGRATION=true
            shift
            ;;
        --force)
            FORCE_DEPLOY=true
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
TrustStream v4.2 Production Deployment Pipeline

Usage: $0 [OPTIONS]

Options:
  -e, --environment ENV     Target environment (development|staging|production) [default: development]
  -s, --strategy STRATEGY   Deployment strategy (rolling|blue-green|canary) [default: rolling]
  -c, --config FILE        Configuration file path [default: deployment/config/pipeline-config.yaml]
  -b, --build-number NUM   Build number for tagging [default: auto-generated]
  -r, --rollback-version   Version to rollback to
      --skip-tests         Skip validation tests
      --skip-migration     Skip database migration
      --force              Force deployment even if health checks fail
  -v, --verbose            Enable verbose logging
      --dry-run            Show what would be deployed without executing
  -h, --help               Show this help message

Examples:
  # Deploy to development
  $0 --environment development
  
  # Deploy to production with blue-green strategy
  $0 --environment production --strategy blue-green
  
  # Rollback to previous version
  $0 --environment production --rollback-version v4.2.1
  
  # Dry run deployment
  $0 --environment staging --dry-run

Environment Variables:
  AZURE_SUBSCRIPTION_ID     Azure subscription ID
  AZURE_RESOURCE_GROUP      Azure resource group
  SUPABASE_PROJECT_REF      Supabase project reference
  SUPABASE_ACCESS_TOKEN     Supabase access token
  SLACK_WEBHOOK_URL         Slack webhook for notifications
  PAGERDUTY_INTEGRATION_KEY PagerDuty integration key

EOF
}

# Validate environment
validate_environment() {
    log_info "Validating environment: $ENVIRONMENT"
    
    case $ENVIRONMENT in
        development|staging|production)
            log_success "Environment '$ENVIRONMENT' is valid"
            ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT"
            log_error "Valid environments: development, staging, production"
            exit 1
            ;;
    esac
}

# Validate deployment strategy
validate_strategy() {
    log_info "Validating deployment strategy: $STRATEGY"
    
    case $STRATEGY in
        rolling|blue-green|canary)
            log_success "Strategy '$STRATEGY' is valid"
            ;;
        *)
            log_error "Invalid deployment strategy: $STRATEGY"
            log_error "Valid strategies: rolling, blue-green, canary"
            exit 1
            ;;
    esac
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking deployment prerequisites..."
    
    # Check required tools
    local required_tools=("az" "docker" "kubectl" "yq" "curl" "jq")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "Required tool '$tool' is not installed"
            exit 1
        fi
    done
    
    # Check Azure CLI authentication
    if ! az account show &> /dev/null; then
        log_error "Not authenticated with Azure CLI. Run 'az login' first."
        exit 1
    fi
    
    # Check configuration file
    if [[ ! -f "$CONFIG_FILE" ]]; then
        log_error "Configuration file not found: $CONFIG_FILE"
        exit 1
    fi
    
    # Check required environment variables
    local required_vars=("AZURE_SUBSCRIPTION_ID" "SUPABASE_PROJECT_REF")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log_error "Required environment variable '$var' is not set"
            exit 1
        fi
    done
    
    log_success "Prerequisites check passed"
}

# Load deployment configuration
load_config() {
    log_info "Loading deployment configuration..."
    
    # Load configuration using yq
    export DEPLOY_CONFIG="$(yq eval ".environments.$ENVIRONMENT" "$CONFIG_FILE")"
    export PIPELINE_CONFIG="$(yq eval ".pipeline" "$CONFIG_FILE")"
    export AZURE_CONFIG="$(yq eval ".azure" "$CONFIG_FILE")"
    
    # Set derived variables
    export AZURE_RESOURCE_GROUP="$(echo "$AZURE_CONFIG" | yq eval '.resourceGroup' - | sed "s/{ENVIRONMENT}/$ENVIRONMENT/g")"
    export AZURE_LOCATION="$(echo "$AZURE_CONFIG" | yq eval '.location' -)"
    export CONTAINER_IMAGE="$(yq eval '.container.image' "$CONFIG_FILE"):$BUILD_NUMBER"
    export REPLICAS="$(echo "$DEPLOY_CONFIG" | yq eval '.replicas' -)"
    
    log_success "Configuration loaded successfully"
    
    if [[ "$VERBOSE" == "true" ]]; then
        log_info "Deployment configuration:"
        echo "  Environment: $ENVIRONMENT"
        echo "  Strategy: $STRATEGY"
        echo "  Resource Group: $AZURE_RESOURCE_GROUP"
        echo "  Location: $AZURE_LOCATION"
        echo "  Container Image: $CONTAINER_IMAGE"
        echo "  Replicas: $REPLICAS"
        echo "  Build Number: $BUILD_NUMBER"
        echo "  Deployment ID: $DEPLOYMENT_ID"
    fi
}

# Create deployment backup
create_backup() {
    log_info "Creating deployment backup..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would create backup for environment: $ENVIRONMENT"
        return 0
    fi
    
    # Run backup script
    if [[ -f "$SCRIPT_DIR/backup/create-backup.sh" ]]; then
        "$SCRIPT_DIR/backup/create-backup.sh" --environment "$ENVIRONMENT" --type "pre-deployment"
    else
        log_warn "Backup script not found, skipping backup creation"
    fi
}

# Build and push container image
build_and_push_image() {
    log_info "Building and pushing container image..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would build and push image: $CONTAINER_IMAGE"
        return 0
    fi
    
    # Run container build script
    "$SCRIPT_DIR/container/build-and-push.sh" \
        --environment "$ENVIRONMENT" \
        --image "$CONTAINER_IMAGE" \
        --build-number "$BUILD_NUMBER"
}

# Deploy database migrations
deploy_migrations() {
    if [[ "$SKIP_MIGRATION" == "true" ]]; then
        log_info "Skipping database migration (--skip-migration flag set)"
        return 0
    fi
    
    log_info "Deploying database migrations..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would deploy database migrations for environment: $ENVIRONMENT"
        return 0
    fi
    
    # Run migration script
    "$SCRIPT_DIR/database/migrate.sh" \
        --environment "$ENVIRONMENT" \
        --config "$CONFIG_FILE"
}

# Deploy edge functions
deploy_edge_functions() {
    log_info "Deploying edge functions..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would deploy edge functions for environment: $ENVIRONMENT"
        return 0
    fi
    
    # Run edge function deployment script
    "$SCRIPT_DIR/edge-functions/deploy.sh" \
        --environment "$ENVIRONMENT" \
        --config "$CONFIG_FILE"
}

# Deploy application based on strategy
deploy_application() {
    log_info "Deploying application using $STRATEGY strategy..."
    
    case $STRATEGY in
        "rolling")
            "$SCRIPT_DIR/strategies/rolling-deploy.sh" \
                --environment "$ENVIRONMENT" \
                --image "$CONTAINER_IMAGE" \
                --config "$CONFIG_FILE" \
                $([ "$DRY_RUN" == "true" ] && echo "--dry-run")
            ;;
        "blue-green")
            "$SCRIPT_DIR/strategies/blue-green-deploy.sh" \
                --environment "$ENVIRONMENT" \
                --image "$CONTAINER_IMAGE" \
                --config "$CONFIG_FILE" \
                $([ "$DRY_RUN" == "true" ] && echo "--dry-run")
            ;;
        "canary")
            "$SCRIPT_DIR/strategies/canary-deploy.sh" \
                --environment "$ENVIRONMENT" \
                --image "$CONTAINER_IMAGE" \
                --config "$CONFIG_FILE" \
                $([ "$DRY_RUN" == "true" ] && echo "--dry-run")
            ;;
    esac
}

# Run validation tests
run_validation_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log_info "Skipping validation tests (--skip-tests flag set)"
        return 0
    fi
    
    log_info "Running deployment validation tests..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would run validation tests for environment: $ENVIRONMENT"
        return 0
    fi
    
    # Run validation script
    "$SCRIPT_DIR/validation/validate-deployment.sh" \
        --environment "$ENVIRONMENT" \
        --config "$CONFIG_FILE" \
        $([ "$FORCE_DEPLOY" == "true" ] && echo "--force")
}

# Send deployment notification
send_notification() {
    local status="$1"
    local message="$2"
    
    log_info "Sending deployment notification..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would send notification: $status - $message"
        return 0
    fi
    
    # Run notification script
    if [[ -f "$SCRIPT_DIR/notifications/send-notification.sh" ]]; then
        "$SCRIPT_DIR/notifications/send-notification.sh" \
            --type "deployment" \
            --status "$status" \
            --environment "$ENVIRONMENT" \
            --message "$message" \
            --deployment-id "$DEPLOYMENT_ID"
    fi
}

# Handle rollback
handle_rollback() {
    if [[ -n "$ROLLBACK_VERSION" ]]; then
        log_info "Performing rollback to version: $ROLLBACK_VERSION"
        
        if [[ "$DRY_RUN" == "true" ]]; then
            log_info "[DRY RUN] Would rollback to version: $ROLLBACK_VERSION"
            return 0
        fi
        
        # Run rollback script
        "$SCRIPT_DIR/rollback/rollback.sh" \
            --environment "$ENVIRONMENT" \
            --version "$ROLLBACK_VERSION" \
            --config "$CONFIG_FILE"
        
        send_notification "success" "Rollback to $ROLLBACK_VERSION completed successfully"
        return 0
    fi
}

# Cleanup on exit
cleanup() {
    local exit_code=$?
    
    if [[ $exit_code -ne 0 ]]; then
        log_error "Deployment failed with exit code: $exit_code"
        send_notification "failed" "Deployment failed at $(date)"
        
        # Auto-rollback on failure if enabled
        if [[ "$ENVIRONMENT" == "production" && "$FORCE_DEPLOY" != "true" ]]; then
            log_warn "Production deployment failed, initiating automatic rollback..."
            # Get previous version and rollback
            local previous_version
            previous_version="$($SCRIPT_DIR/rollback/get-previous-version.sh --environment "$ENVIRONMENT")"
            if [[ -n "$previous_version" ]]; then
                ROLLBACK_VERSION="$previous_version"
                handle_rollback
            fi
        fi
    fi
    
    # Cleanup temporary files
    if [[ -d "/tmp/truststream-deploy-$DEPLOYMENT_ID" ]]; then
        rm -rf "/tmp/truststream-deploy-$DEPLOYMENT_ID"
    fi
}

# Set trap for cleanup
trap cleanup EXIT

# Main deployment function
main() {
    log_header "TrustStream v4.2 Production Deployment Pipeline"
    log_info "Starting deployment..."
    log_info "Deployment ID: $DEPLOYMENT_ID"
    log_info "Timestamp: $(date)"
    
    # Handle rollback if requested
    handle_rollback
    
    # Validation phase
    validate_environment
    validate_strategy
    check_prerequisites
    load_config
    
    # Pre-deployment phase
    create_backup
    
    # Build phase
    build_and_push_image
    
    # Deployment phase
    deploy_migrations
    deploy_edge_functions
    deploy_application
    
    # Validation phase
    run_validation_tests
    
    # Success notification
    send_notification "success" "Deployment completed successfully at $(date)"
    
    log_success "Deployment completed successfully!"
    log_info "Environment: $ENVIRONMENT"
    log_info "Strategy: $STRATEGY"
    log_info "Build Number: $BUILD_NUMBER"
    log_info "Container Image: $CONTAINER_IMAGE"
    
    if [[ "$DRY_RUN" != "true" ]]; then
        log_info "Application URL: https://truststream-v42-$ENVIRONMENT-app.azurewebsites.net"
        log_info "Health Check: https://truststream-v42-$ENVIRONMENT-app.azurewebsites.net/health"
    fi
}

# Run main function
main "$@"