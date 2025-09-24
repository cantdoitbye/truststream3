#!/bin/bash

# TrustStream v4.2 - Emergency Rollback Script
# Author: MiniMax Agent
# Version: 1.0
# Date: 2025-09-20

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

info() {
    echo -e "${PURPLE}[INFO]${NC} $1"
}

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${ENVIRONMENT:-staging}"
TARGET_VERSION="${TARGET_VERSION:-}"
ROLLBACK_REASON="${ROLLBACK_REASON:-Emergency rollback}"
FORCE_ROLLBACK="${FORCE_ROLLBACK:-false}"
SKIP_CONFIRMATION="${SKIP_CONFIRMATION:-false}"
ROLLBACK_DATABASE="${ROLLBACK_DATABASE:-false}"

# Load environment configuration
if [[ -f "/workspace/config/${ENVIRONMENT}.env" ]]; then
    source "/workspace/config/${ENVIRONMENT}.env"
else
    error "Environment configuration not found. Please run setup-environment.sh first."
    exit 1
fi

# Rollback state
CURRENT_SLOT=""
ROLLBACK_SLOT=""
CURRENT_VERSION=""
ROLLBACK_VERSION=""
ROLLBACK_START_TIME=""
AVAILABLE_VERSIONS=()

# Initialize rollback
init_rollback() {
    log "Initializing emergency rollback for environment: $ENVIRONMENT"
    
    ROLLBACK_START_TIME=$(date +%s)
    
    # Verify prerequisites
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed"
        exit 1
    fi
    
    if ! az account show &> /dev/null; then
        error "Azure CLI not logged in"
        exit 1
    fi
    
    # Set kubectl context
    az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER_NAME --overwrite-existing
    kubectl config set-context --current --namespace=$NAMESPACE
    
    success "Rollback initialization completed"
}

# Analyze current deployment state
analyze_current_state() {
    log "Analyzing current deployment state..."
    
    # Get current active slot
    CURRENT_SLOT=$(kubectl get service truststream-service -o jsonpath='{.spec.selector.slot}' 2>/dev/null || echo "")
    
    if [[ -z "$CURRENT_SLOT" ]]; then
        error "Cannot determine current active slot"
        exit 1
    fi
    
    # Get current version
    CURRENT_VERSION=$(kubectl get deployment truststream-$CURRENT_SLOT -o jsonpath='{.metadata.labels.version}' 2>/dev/null || echo "unknown")
    
    # Determine rollback slot
    if [[ "$CURRENT_SLOT" == "blue" ]]; then
        ROLLBACK_SLOT="green"
    else
        ROLLBACK_SLOT="blue"
    fi
    
    # Get available versions from deployment records
    mapfile -t AVAILABLE_VERSIONS < <(kubectl get configmaps -l deployment-record=true -o jsonpath='{.items[*].data.version}' | tr ' ' '\n' | sort -u)
    
    info "Current active slot: $CURRENT_SLOT (version: $CURRENT_VERSION)"
    info "Rollback slot: $ROLLBACK_SLOT"
    info "Available versions: ${AVAILABLE_VERSIONS[*]}"
}

# Select rollback target
select_rollback_target() {
    log "Selecting rollback target..."
    
    if [[ -n "$TARGET_VERSION" ]]; then
        # Use specified version
        ROLLBACK_VERSION="$TARGET_VERSION"
        info "Using specified rollback version: $ROLLBACK_VERSION"
    else
        # Check if previous deployment exists
        local previous_version=$(kubectl get deployment truststream-$ROLLBACK_SLOT -o jsonpath='{.metadata.labels.version}' 2>/dev/null || echo "")
        
        if [[ -n "$previous_version" && "$previous_version" != "$CURRENT_VERSION" ]]; then
            ROLLBACK_VERSION="$previous_version"
            info "Using previous deployment version: $ROLLBACK_VERSION"
        else
            # Find the most recent version that's not current
            for version in "${AVAILABLE_VERSIONS[@]}"; do
                if [[ "$version" != "$CURRENT_VERSION" ]]; then
                    ROLLBACK_VERSION="$version"
                    break
                fi
            done
            
            if [[ -z "$ROLLBACK_VERSION" ]]; then
                error "No suitable rollback version found"
                exit 1
            fi
            
            info "Selected rollback version: $ROLLBACK_VERSION"
        fi
    fi
}

# Confirm rollback operation
confirm_rollback() {
    if [[ "$SKIP_CONFIRMATION" == "true" ]]; then
        return
    fi
    
    echo
    echo "=============================================="
    echo "EMERGENCY ROLLBACK CONFIRMATION"
    echo "=============================================="
    echo "Environment: $ENVIRONMENT"
    echo "Current Version: $CURRENT_VERSION (slot: $CURRENT_SLOT)"
    echo "Rollback Version: $ROLLBACK_VERSION (slot: $ROLLBACK_SLOT)"
    echo "Reason: $ROLLBACK_REASON"
    echo "Database Rollback: $ROLLBACK_DATABASE"
    echo "=============================================="
    echo
    
    if [[ "$FORCE_ROLLBACK" != "true" ]]; then
        read -p "Are you sure you want to proceed with the rollback? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log "Rollback cancelled by user"
            exit 0
        fi
    fi
    
    warning "Proceeding with emergency rollback..."
}

# Create rollback deployment
create_rollback_deployment() {
    log "Creating rollback deployment for version $ROLLBACK_VERSION..."
    
    # Get secrets from Key Vault
    local db_password=$(az keyvault secret show --vault-name $KEYVAULT_NAME --name "postgres-password" --query value -o tsv)
    local jwt_secret=$(az keyvault secret show --vault-name $KEYVAULT_NAME --name "jwt-secret" --query value -o tsv)
    local app_insights_key=$(az keyvault secret show --vault-name $KEYVAULT_NAME --name "app-insights-key" --query value -o tsv)
    
    # Create rollback deployment manifest
    cat > /tmp/rollback-deployment.yaml <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: truststream-$ROLLBACK_SLOT
  namespace: $NAMESPACE
  labels:
    app: truststream
    slot: $ROLLBACK_SLOT
    version: $ROLLBACK_VERSION
    rollback: "true"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: truststream
      slot: $ROLLBACK_SLOT
  template:
    metadata:
      labels:
        app: truststream
        slot: $ROLLBACK_SLOT
        version: $ROLLBACK_VERSION
        rollback: "true"
    spec:
      containers:
      - name: app
        image: $ACR_LOGIN_SERVER/truststream-app:$ROLLBACK_VERSION
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "$ENVIRONMENT"
        - name: DATABASE_URL
          value: "postgresql://truststream_admin:$db_password@$POSTGRES_SERVER_NAME.postgres.database.azure.com:5432/truststream"
        - name: JWT_SECRET
          value: "$jwt_secret"
        - name: APPINSIGHTS_INSTRUMENTATIONKEY
          value: "$app_insights_key"
        - name: ROLLBACK_MODE
          value: "true"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
      - name: nginx
        image: $ACR_LOGIN_SERVER/truststream-nginx:$ROLLBACK_VERSION
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
---
apiVersion: v1
kind: Service
metadata:
  name: truststream-$ROLLBACK_SLOT-service
  namespace: $NAMESPACE
  labels:
    app: truststream
    slot: $ROLLBACK_SLOT
    rollback: "true"
spec:
  selector:
    app: truststream
    slot: $ROLLBACK_SLOT
  ports:
  - name: http
    port: 80
    targetPort: 80
  - name: app
    port: 3000
    targetPort: 3000
EOF
    
    # Apply rollback deployment
    kubectl apply -f /tmp/rollback-deployment.yaml
    
    # Wait for rollback deployment to be ready
    log "Waiting for rollback deployment to be ready..."
    kubectl wait --for=condition=available deployment/truststream-$ROLLBACK_SLOT --timeout=300s
    
    # Wait for all pods to be ready
    kubectl wait --for=condition=ready pod -l app=truststream,slot=$ROLLBACK_SLOT --timeout=180s
    
    success "Rollback deployment created and ready"
}

# Rollback database (if requested)
rollback_database() {
    if [[ "$ROLLBACK_DATABASE" != "true" ]]; then
        info "Skipping database rollback"
        return
    fi
    
    log "Rolling back database..."
    
    warning "Database rollback is a dangerous operation!"
    
    if [[ "$FORCE_ROLLBACK" != "true" ]]; then
        read -p "Are you absolutely sure you want to rollback the database? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log "Database rollback cancelled"
            return
        fi
    fi
    
    # Get rollback script from deployment record
    local rollback_sql=$(kubectl get configmap deployment-$ROLLBACK_VERSION -o jsonpath='{.data.rollback-sql}' 2>/dev/null || echo "")
    
    if [[ -z "$rollback_sql" ]]; then
        warning "No database rollback script found for version $ROLLBACK_VERSION"
        return
    fi
    
    # Create database rollback job
    cat > /tmp/db-rollback-job.yaml <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: truststream-db-rollback-$(date +%s)
  namespace: $NAMESPACE
  labels:
    app: truststream
    component: db-rollback
    version: $ROLLBACK_VERSION
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: db-rollback
        image: postgres:13
        env:
        - name: PGPASSWORD
          value: "$(az keyvault secret show --vault-name $KEYVAULT_NAME --name "postgres-password" --query value -o tsv)"
        command:
        - /bin/bash
        - -c
        - |
          echo "$rollback_sql" | psql -h $POSTGRES_SERVER_NAME.postgres.database.azure.com -U truststream_admin -d truststream
      backoffLimit: 1
EOF
    
    kubectl apply -f /tmp/db-rollback-job.yaml
    
    # Wait for rollback to complete
    local job_name=$(kubectl get jobs -l component=db-rollback --sort-by=.metadata.creationTimestamp -o jsonpath='{.items[-1].metadata.name}')
    kubectl wait --for=condition=complete job/$job_name --timeout=300s
    
    if kubectl get job $job_name -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}' | grep -q "True"; then
        success "Database rollback completed"
    else
        error "Database rollback failed"
        exit 1
    fi
}

# Perform health checks on rollback deployment
health_check_rollback() {
    log "Performing health checks on rollback deployment..."
    
    # Basic health check
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log "Health check attempt $attempt/$max_attempts"
        
        if kubectl exec deployment/truststream-$ROLLBACK_SLOT -- curl -sf http://localhost:3000/health > /dev/null; then
            success "Rollback health check passed"
            break
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            error "Rollback health checks failed after $max_attempts attempts"
            exit 1
        fi
        
        sleep 10
        ((attempt++))
    done
    
    # Extended health checks
    log "Running extended health checks..."
    
    # Database connectivity
    if kubectl exec deployment/truststream-$ROLLBACK_SLOT -- node -e "
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        pool.query('SELECT 1').then(() => process.exit(0)).catch(() => process.exit(1));
    "; then
        success "Database connectivity check passed"
    else
        error "Database connectivity check failed"
        exit 1
    fi
    
    success "All rollback health checks passed"
}

# Switch traffic to rollback deployment
switch_traffic_to_rollback() {
    log "Switching traffic to rollback deployment..."
    
    # Update main service to point to rollback slot
    kubectl patch service truststream-service -p '{"spec":{"selector":{"slot":"'$ROLLBACK_SLOT'"}}}'
    
    # Wait for service to update
    sleep 10
    
    # Verify traffic switch
    local new_slot=$(kubectl get service truststream-service -o jsonpath='{.spec.selector.slot}')
    if [[ "$new_slot" != "$ROLLBACK_SLOT" ]]; then
        error "Traffic switch to rollback failed"
        exit 1
    fi
    
    success "Traffic switched to rollback deployment ($ROLLBACK_SLOT slot)"
}

# Run post-rollback validation
post_rollback_validation() {
    log "Running post-rollback validation..."
    
    # Wait a bit for traffic to settle
    sleep 30
    
    # Test external endpoint
    local external_ip=$(kubectl get service truststream-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    
    if [[ -n "$external_ip" ]]; then
        if curl -sf "http://$external_ip/health" > /dev/null; then
            success "External endpoint responding correctly"
        else
            error "External endpoint not responding"
            exit 1
        fi
    else
        # Use port-forward for testing
        kubectl port-forward service/truststream-service 8080:80 &
        local port_forward_pid=$!
        sleep 5
        
        if curl -sf "http://localhost:8080/health" > /dev/null; then
            success "Service responding correctly via port-forward"
        else
            error "Service not responding"
            exit 1
        fi
        
        kill $port_forward_pid 2>/dev/null || true
    fi
    
    success "Post-rollback validation completed"
}

# Clean up failed deployment
cleanup_failed_deployment() {
    log "Cleaning up failed deployment..."
    
    # Scale down current (failed) deployment
    kubectl scale deployment truststream-$CURRENT_SLOT --replicas=0
    
    # Label for potential debugging
    kubectl label deployment truststream-$CURRENT_SLOT failed-deployment=true --overwrite
    kubectl label service truststream-$CURRENT_SLOT-service failed-deployment=true --overwrite
    
    success "Failed deployment cleanup completed"
}

# Record rollback event
record_rollback_event() {
    log "Recording rollback event..."
    
    # Create rollback record
    cat > /tmp/rollback-record.yaml <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: rollback-$(date +%s)
  namespace: $NAMESPACE
  labels:
    app: truststream
    rollback-record: "true"
data:
  environment: "$ENVIRONMENT"
  rollback-from-version: "$CURRENT_VERSION"
  rollback-to-version: "$ROLLBACK_VERSION"
  rollback-reason: "$ROLLBACK_REASON"
  rollback-at: "$(date -Iseconds)"
  rollback-by: "$(whoami)"
  rollback-duration: "$(($(date +%s) - ROLLBACK_START_TIME))s"
  database-rollback: "$ROLLBACK_DATABASE"
  active-slot: "$ROLLBACK_SLOT"
  failed-slot: "$CURRENT_SLOT"
EOF
    
    kubectl apply -f /tmp/rollback-record.yaml
    
    # Send notification (if configured)
    send_rollback_notification
    
    success "Rollback event recorded"
}

# Send rollback notifications
send_rollback_notification() {
    log "Sending rollback notifications..."
    
    # Log to Application Insights
    local app_insights_key=$(az keyvault secret show --vault-name $KEYVAULT_NAME --name "app-insights-key" --query value -o tsv 2>/dev/null || echo "")
    
    if [[ -n "$app_insights_key" ]]; then
        # Send custom event to Application Insights
        curl -X POST "https://dc.services.visualstudio.com/v2/track" \
            -H "Content-Type: application/json" \
            -d '{
                "name": "Microsoft.ApplicationInsights.Event",
                "time": "'$(date -Iseconds)'",
                "iKey": "'$app_insights_key'",
                "data": {
                    "baseType": "EventData",
                    "baseData": {
                        "name": "Emergency Rollback",
                        "properties": {
                            "environment": "'$ENVIRONMENT'",
                            "fromVersion": "'$CURRENT_VERSION'",
                            "toVersion": "'$ROLLBACK_VERSION'",
                            "reason": "'$ROLLBACK_REASON'",
                            "databaseRollback": "'$ROLLBACK_DATABASE'"
                        }
                    }
                }
            }' > /dev/null 2>&1
    fi
    
    success "Notifications sent"
}

# Display rollback summary
display_summary() {
    local rollback_end_time=$(date +%s)
    local rollback_duration=$((rollback_end_time - ROLLBACK_START_TIME))
    
    echo
    echo "=============================================="
    echo "EMERGENCY ROLLBACK COMPLETED"
    echo "=============================================="
    echo "Environment: $ENVIRONMENT"
    echo "Rolled back from: $CURRENT_VERSION (slot: $CURRENT_SLOT)"
    echo "Rolled back to: $ROLLBACK_VERSION (slot: $ROLLBACK_SLOT)"
    echo "Reason: $ROLLBACK_REASON"
    echo "Database rollback: $ROLLBACK_DATABASE"
    echo "Rollback duration: ${rollback_duration}s"
    echo "Completed at: $(date)"
    echo "=============================================="
    echo
    success "🚨 EMERGENCY ROLLBACK SUCCESSFUL 🚨"
    echo
    echo "Next steps:"
    echo "1. Investigate the root cause of the failure"
    echo "2. Monitor the rolled-back version for stability"
    echo "3. Prepare a hotfix or proper rollback to latest"
    echo "4. Review and update deployment procedures"
    echo "5. Check Application Insights for rollback events"
    
    warning "Remember: This is a temporary fix. Address the underlying issue!"
}

# Cleanup function
cleanup_on_exit() {
    local exit_code=$?
    
    # Clean up temporary files
    rm -f /tmp/rollback-deployment.yaml
    rm -f /tmp/db-rollback-job.yaml
    rm -f /tmp/rollback-record.yaml
    
    # Kill any background processes
    if [[ -n "${PORT_FORWARD_PID:-}" ]]; then
        kill $PORT_FORWARD_PID 2>/dev/null || true
    fi
    
    if [[ $exit_code -ne 0 ]]; then
        error "Rollback failed with exit code: $exit_code"
    fi
}

# Main execution function
main() {
    log "🚨 STARTING EMERGENCY ROLLBACK 🚨"
    
    # Set up cleanup trap
    trap cleanup_on_exit EXIT
    
    # Rollback steps
    init_rollback
    analyze_current_state
    select_rollback_target
    confirm_rollback
    rollback_database
    create_rollback_deployment
    health_check_rollback
    switch_traffic_to_rollback
    post_rollback_validation
    cleanup_failed_deployment
    record_rollback_event
    
    display_summary
}

# Handle command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment|-e)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --version|-v)
            TARGET_VERSION="$2"
            shift 2
            ;;
        --reason|-r)
            ROLLBACK_REASON="$2"
            shift 2
            ;;
        --force|-f)
            FORCE_ROLLBACK="true"
            shift
            ;;
        --skip-confirmation)
            SKIP_CONFIRMATION="true"
            shift
            ;;
        --rollback-database)
            ROLLBACK_DATABASE="true"
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -e, --environment ENV     Target environment (dev/staging/prod)"
            echo "  -v, --version VERSION     Specific version to rollback to"
            echo "  -r, --reason REASON       Reason for rollback"
            echo "  -f, --force               Force rollback without additional confirmations"
            echo "  --skip-confirmation       Skip rollback confirmation prompt"
            echo "  --rollback-database       Also rollback database (DANGEROUS)"
            echo "  -h, --help                Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 --environment production --reason 'Critical bug in payment system'"
            echo "  $0 --environment staging --version v1.2.3 --force"
            echo "  $0 --environment production --rollback-database --reason 'Data corruption'"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main "$@"