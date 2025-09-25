#!/bin/bash

# TrustStram v4.4 Enterprise Production Deployment Pipeline
# Author: TrustStram Enterprise Team
# Version: 4.4.0
# Description: Comprehensive production deployment automation with enterprise features

set -euo pipefail

# Global Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOYMENT_DIR="$ROOT_DIR/deployment"
LOG_DIR="$ROOT_DIR/logs/deployment"
CONFIG_DIR="$DEPLOYMENT_DIR/config"

# Create log directory
mkdir -p "$LOG_DIR"

# Logging functions
log_info() { echo "[$(date +'%Y-%m-%d %H:%M:%S')] [INFO] $*" | tee -a "$LOG_DIR/deployment.log"; }
log_warn() { echo "[$(date +'%Y-%m-%d %H:%M:%S')] [WARN] $*" | tee -a "$LOG_DIR/deployment.log"; }
log_error() { echo "[$(date +'%Y-%m-%d %H:%M:%S')] [ERROR] $*" | tee -a "$LOG_DIR/deployment.log" >&2; }
log_success() { echo "[$(date +'%Y-%m-%d %H:%M:%S')] [SUCCESS] $*" | tee -a "$LOG_DIR/deployment.log"; }

# Default Configuration
ENVIRONMENT="production"
CLOUD_PROVIDER="aws"
DEPLOYMENT_STRATEGY="blue-green"
VERSION="4.4.0"
BUILD_NUMBER="$(date +%Y%m%d-%H%M%S)"
DEPLOYMENT_ID="deploy-${BUILD_NUMBER}"
CONFIG_FILE="$CONFIG_DIR/production-config.yaml"
NAMESPACE="truststream-production"
DRY_RUN=false
VERBOSE=false
SKIP_TESTS=false
ENABLE_MONITORING=true
ENABLE_SECURITY_HARDENING=true
ENABLE_AI_FEATURES=true
AUTO_ROLLBACK=true
MAX_UNAVAILABLE="25%"
MAX_SURGE="25%"
HEALTH_CHECK_TIMEOUT=300
ROLLOUT_TIMEOUT=1200

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment|-e)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --cloud|-c)
            CLOUD_PROVIDER="$2"
            shift 2
            ;;
        --strategy|-s)
            DEPLOYMENT_STRATEGY="$2"
            shift 2
            ;;
        --version|-v)
            VERSION="$2"
            shift 2
            ;;
        --build-number|-b)
            BUILD_NUMBER="$2"
            shift 2
            ;;
        --config)
            CONFIG_FILE="$2"
            shift 2
            ;;
        --namespace|-n)
            NAMESPACE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --disable-monitoring)
            ENABLE_MONITORING=false
            shift
            ;;
        --disable-security)
            ENABLE_SECURITY_HARDENING=false
            shift
            ;;
        --disable-ai)
            ENABLE_AI_FEATURES=false
            shift
            ;;
        --no-auto-rollback)
            AUTO_ROLLBACK=false
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

# Help function
show_help() {
    cat << EOF
TrustStram v4.4 Enterprise Production Deployment Pipeline

Usage: $0 [OPTIONS]

Options:
  -e, --environment ENV      Target environment (development|staging|production) [default: production]
  -c, --cloud PROVIDER       Cloud provider (aws|azure|gcp|on-premise) [default: aws]
  -s, --strategy STRATEGY    Deployment strategy (rolling|blue-green|canary) [default: blue-green]
  -v, --version VERSION      Application version to deploy [default: 4.4.0]
  -b, --build-number BUILD   Build number for tagging [default: auto-generated]
      --config FILE          Configuration file path
  -n, --namespace NS         Kubernetes namespace [default: truststream-production]
      --dry-run              Preview deployment without executing
      --verbose              Enable verbose logging
      --skip-tests           Skip validation tests
      --disable-monitoring   Disable monitoring setup
      --disable-security     Disable security hardening
      --disable-ai           Disable AI features
      --no-auto-rollback     Disable automatic rollback on failure
  -h, --help                 Show this help message

Examples:
  # Standard production deployment
  $0 --environment production --cloud aws
  
  # Blue-green deployment with monitoring
  $0 --strategy blue-green --enable-monitoring
  
  # Canary deployment with 10% traffic
  $0 --strategy canary --canary-percent 10
  
  # Dry run to preview changes
  $0 --dry-run --verbose

Environment Variables:
  AWS_REGION                 AWS deployment region
  AZURE_RESOURCE_GROUP       Azure resource group
  GCP_PROJECT_ID             GCP project ID
  KUBECONFIG                 Kubernetes configuration file
  SUPABASE_PROJECT_REF       Supabase project reference
  MONITORING_SLACK_WEBHOOK   Slack webhook for notifications
  SECURITY_VAULT_TOKEN       HashiCorp Vault token

EOF
}

# Validation functions
validate_environment() {
    log_info "Validating deployment environment: $ENVIRONMENT"
    
    case $ENVIRONMENT in
        development|staging|production)
            log_success "Environment '$ENVIRONMENT' is valid"
            ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT. Valid options: development, staging, production"
            exit 1
            ;;
    esac
}

validate_cloud_provider() {
    log_info "Validating cloud provider: $CLOUD_PROVIDER"
    
    case $CLOUD_PROVIDER in
        aws|azure|gcp|on-premise)
            log_success "Cloud provider '$CLOUD_PROVIDER' is supported"
            ;;
        *)
            log_error "Unsupported cloud provider: $CLOUD_PROVIDER. Valid options: aws, azure, gcp, on-premise"
            exit 1
            ;;
    esac
}

validate_deployment_strategy() {
    log_info "Validating deployment strategy: $DEPLOYMENT_STRATEGY"
    
    case $DEPLOYMENT_STRATEGY in
        rolling|blue-green|canary)
            log_success "Deployment strategy '$DEPLOYMENT_STRATEGY' is valid"
            ;;
        *)
            log_error "Invalid deployment strategy: $DEPLOYMENT_STRATEGY. Valid options: rolling, blue-green, canary"
            exit 1
            ;;
    esac
}

# Prerequisites check
check_prerequisites() {
    log_info "Checking deployment prerequisites..."
    
    # Check required tools
    local required_tools=("kubectl" "helm" "docker" "yq" "jq" "curl")
    
    case $CLOUD_PROVIDER in
        aws) required_tools+=("aws") ;;
        azure) required_tools+=("az") ;;
        gcp) required_tools+=("gcloud") ;;
    esac
    
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "Required tool '$tool' is not installed"
            exit 1
        fi
    done
    
    # Check Kubernetes connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Check KUBECONFIG."
        exit 1
    fi
    
    # Check configuration file
    if [[ ! -f "$CONFIG_FILE" ]]; then
        log_error "Configuration file not found: $CONFIG_FILE"
        exit 1
    fi
    
    # Validate Kubernetes namespace
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_info "Creating namespace: $NAMESPACE"
        if [[ "$DRY_RUN" == "false" ]]; then
            kubectl create namespace "$NAMESPACE"
        fi
    fi
    
    log_success "Prerequisites check completed successfully"
}

# Load configuration
load_configuration() {
    log_info "Loading deployment configuration..."
    
    # Export configuration variables
    export TRUSTSTREAM_VERSION="$VERSION"
    export TRUSTSTREAM_BUILD="$BUILD_NUMBER"
    export TRUSTSTREAM_ENVIRONMENT="$ENVIRONMENT"
    export TRUSTSTREAM_NAMESPACE="$NAMESPACE"
    export DEPLOYMENT_TIMESTAMP="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
    
    # Load cloud-specific configuration
    case $CLOUD_PROVIDER in
        aws)
            export AWS_REGION="${AWS_REGION:-us-west-2}"
            export ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
            ;;
        azure)
            export AZURE_LOCATION="${AZURE_LOCATION:-eastus}"
            export ACR_REGISTRY="${ACR_NAME}.azurecr.io"
            ;;
        gcp)
            export GCP_ZONE="${GCP_ZONE:-us-central1-a}"
            export GCR_REGISTRY="gcr.io/${GCP_PROJECT_ID}"
            ;;
    esac
    
    log_success "Configuration loaded successfully"
    
    if [[ "$VERBOSE" == "true" ]]; then
        log_info "Deployment Configuration:"
        echo "  Environment: $ENVIRONMENT"
        echo "  Cloud Provider: $CLOUD_PROVIDER"
        echo "  Strategy: $DEPLOYMENT_STRATEGY"
        echo "  Version: $VERSION"
        echo "  Build: $BUILD_NUMBER"
        echo "  Namespace: $NAMESPACE"
        echo "  Deployment ID: $DEPLOYMENT_ID"
    fi
}

# Pre-deployment backup
create_backup() {
    log_info "Creating pre-deployment backup..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would create backup for environment: $ENVIRONMENT"
        return 0
    fi
    
    local backup_script="$SCRIPT_DIR/../backup/create-backup.sh"
    if [[ -f "$backup_script" ]]; then
        "$backup_script" --environment "$ENVIRONMENT" --type "pre-deployment" --tag "$DEPLOYMENT_ID"
    else
        log_warn "Backup script not found, skipping backup creation"
    fi
}

# Build and push container images
build_and_push_images() {
    log_info "Building and pushing container images..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would build and push images for version: $VERSION"
        return 0
    fi
    
    local build_script="$SCRIPT_DIR/../container/build-and-push.sh"
    "$build_script" \
        --environment "$ENVIRONMENT" \
        --version "$VERSION" \
        --build-number "$BUILD_NUMBER" \
        --cloud "$CLOUD_PROVIDER"
}

# Deploy database migrations
deploy_database_migrations() {
    log_info "Deploying database migrations..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would deploy database migrations"
        return 0
    fi
    
    local migration_script="$SCRIPT_DIR/../database/migrate.sh"
    "$migration_script" \
        --environment "$ENVIRONMENT" \
        --version "$VERSION" \
        --namespace "$NAMESPACE"
}

# Deploy edge functions
deploy_edge_functions() {
    log_info "Deploying Supabase edge functions..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would deploy edge functions"
        return 0
    fi
    
    local edge_functions_script="$SCRIPT_DIR/../edge-functions/deploy.sh"
    "$edge_functions_script" \
        --environment "$ENVIRONMENT" \
        --version "$VERSION"
}

# Deploy application using specified strategy
deploy_application() {
    log_info "Deploying application using $DEPLOYMENT_STRATEGY strategy..."
    
    local strategy_script="$SCRIPT_DIR/../strategies/${DEPLOYMENT_STRATEGY}-deploy.sh"
    
    if [[ ! -f "$strategy_script" ]]; then
        log_error "Strategy script not found: $strategy_script"
        exit 1
    fi
    
    "$strategy_script" \
        --environment "$ENVIRONMENT" \
        --version "$VERSION" \
        --build-number "$BUILD_NUMBER" \
        --namespace "$NAMESPACE" \
        --cloud "$CLOUD_PROVIDER" \
        --config "$CONFIG_FILE" \
        $([ "$DRY_RUN" == "true" ] && echo "--dry-run") \
        $([ "$VERBOSE" == "true" ] && echo "--verbose")
}

# Setup monitoring and observability
setup_monitoring() {
    if [[ "$ENABLE_MONITORING" == "false" ]]; then
        log_info "Monitoring setup disabled"
        return 0
    fi
    
    log_info "Setting up monitoring and observability..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would setup monitoring infrastructure"
        return 0
    fi
    
    local monitoring_script="$SCRIPT_DIR/../monitoring/setup-monitoring.sh"
    "$monitoring_script" \
        --environment "$ENVIRONMENT" \
        --namespace "$NAMESPACE" \
        --cloud "$CLOUD_PROVIDER"
}

# Configure security hardening
setup_security() {
    if [[ "$ENABLE_SECURITY_HARDENING" == "false" ]]; then
        log_info "Security hardening disabled"
        return 0
    fi
    
    log_info "Configuring security hardening..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would configure security hardening"
        return 0
    fi
    
    local security_script="$SCRIPT_DIR/../security/setup-security.sh"
    "$security_script" \
        --environment "$ENVIRONMENT" \
        --namespace "$NAMESPACE" \
        --cloud "$CLOUD_PROVIDER"
}

# Enable AI features
setup_ai_features() {
    if [[ "$ENABLE_AI_FEATURES" == "false" ]]; then
        log_info "AI features disabled"
        return 0
    fi
    
    log_info "Enabling AI features and integrations..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would enable AI features"
        return 0
    fi
    
    local ai_script="$SCRIPT_DIR/../ai/setup-ai-features.sh"
    "$ai_script" \
        --environment "$ENVIRONMENT" \
        --namespace "$NAMESPACE" \
        --version "$VERSION"
}

# Run validation tests
run_validation_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log_info "Validation tests skipped"
        return 0
    fi
    
    log_info "Running post-deployment validation tests..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would run validation tests"
        return 0
    fi
    
    local validation_script="$SCRIPT_DIR/../validation/run-validation.sh"
    "$validation_script" \
        --environment "$ENVIRONMENT" \
        --namespace "$NAMESPACE" \
        --timeout "$HEALTH_CHECK_TIMEOUT"
}

# Send deployment notifications
send_notifications() {
    log_info "Sending deployment notifications..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would send deployment notifications"
        return 0
    fi
    
    local notification_script="$SCRIPT_DIR/../notifications/send-notifications.sh"
    if [[ -f "$notification_script" ]]; then
        "$notification_script" \
            --status "success" \
            --environment "$ENVIRONMENT" \
            --version "$VERSION" \
            --deployment-id "$DEPLOYMENT_ID"
    fi
}

# Cleanup temporary resources
cleanup() {
    log_info "Cleaning up temporary resources..."
    
    # Remove temporary files
    find "$LOG_DIR" -name "*.tmp" -delete 2>/dev/null || true
    
    # Clean up old deployments (keep last 5)
    kubectl get deployments -n "$NAMESPACE" -o name | \
        grep "truststream-" | \
        sort -V | \
        head -n -5 | \
        xargs -r kubectl delete -n "$NAMESPACE" 2>/dev/null || true
}

# Error handling and rollback
handle_error() {
    local exit_code=$?
    log_error "Deployment failed with exit code: $exit_code"
    
    if [[ "$AUTO_ROLLBACK" == "true" && "$DRY_RUN" == "false" ]]; then
        log_info "Initiating automatic rollback..."
        local rollback_script="$SCRIPT_DIR/../emergency/rollback.sh"
        if [[ -f "$rollback_script" ]]; then
            "$rollback_script" --environment "$ENVIRONMENT" --namespace "$NAMESPACE" --immediate
        fi
    fi
    
    # Send failure notification
    if [[ -f "$SCRIPT_DIR/../notifications/send-notifications.sh" ]]; then
        "$SCRIPT_DIR/../notifications/send-notifications.sh" \
            --status "failure" \
            --environment "$ENVIRONMENT" \
            --deployment-id "$DEPLOYMENT_ID" \
            --error-code "$exit_code"
    fi
    
    cleanup
    exit $exit_code
}

# Set up error handling
trap 'handle_error' ERR

# Main deployment pipeline
main() {
    log_info "Starting TrustStram v4.4 Enterprise Deployment Pipeline"
    log_info "Deployment ID: $DEPLOYMENT_ID"
    
    # Validation phase
    validate_environment
    validate_cloud_provider
    validate_deployment_strategy
    check_prerequisites
    load_configuration
    
    # Pre-deployment phase
    create_backup
    
    # Build phase
    build_and_push_images
    
    # Deployment phase
    deploy_database_migrations
    deploy_edge_functions
    deploy_application
    
    # Post-deployment configuration
    setup_monitoring
    setup_security
    setup_ai_features
    
    # Validation phase
    run_validation_tests
    
    # Finalization
    send_notifications
    cleanup
    
    log_success "TrustStram v4.4 deployment completed successfully!"
    log_info "Deployment ID: $DEPLOYMENT_ID"
    log_info "Version: $VERSION"
    log_info "Environment: $ENVIRONMENT"
    log_info "Namespace: $NAMESPACE"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "This was a dry run. No actual changes were made."
    fi
}

# Execute main function
main "$@"