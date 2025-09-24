#!/bin/bash

# TrustStream v4.2 - Azure Deployment Script with Blue-Green Strategy
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
    exit 1
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
BUILD_NUMBER="${BUILD_NUMBER:-$(date +%Y%m%d-%H%M%S)}"
GIT_COMMIT="${GIT_COMMIT:-$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')}"
FORCE_DEPLOY="${FORCE_DEPLOY:-false}"
SKIP_TESTS="${SKIP_TESTS:-false}"
DEPLOYMENT_TIMEOUT="${DEPLOYMENT_TIMEOUT:-600}"

# Load environment configuration
if [[ -f "/workspace/config/${ENVIRONMENT}.env" ]]; then
    source "/workspace/config/${ENVIRONMENT}.env"
else
    error "Environment configuration not found. Please run setup-environment.sh first."
fi

# Deployment state
CURRENT_SLOT=""
TARGET_SLOT=""
PREVIOUS_VERSION=""
DEPLOYMENT_START_TIME=""
ROLLBACK_REQUIRED=false

# Initialize deployment
init_deployment() {
    log "Initializing deployment for environment: $ENVIRONMENT"
    
    DEPLOYMENT_START_TIME=$(date +%s)
    
    # Verify prerequisites
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed"
    fi
    
    if ! command -v helm &> /dev/null; then
        error "helm is not installed"
    fi
    
    if ! az account show &> /dev/null; then
        error "Azure CLI not logged in"
    fi
    
    # Set kubectl context
    az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER_NAME --overwrite-existing
    kubectl config set-context --current --namespace=$NAMESPACE
    
    # Determine current and target slots for blue-green deployment
    determine_deployment_slots
    
    success "Deployment initialization completed"
}

# Determine blue-green deployment slots
determine_deployment_slots() {
    log "Determining deployment slots..."
    
    # Check current active slot
    CURRENT_SLOT=$(kubectl get service truststream-service -o jsonpath='{.spec.selector.slot}' 2>/dev/null || echo "")
    
    if [[ -z "$CURRENT_SLOT" || "$CURRENT_SLOT" == "blue" ]]; then
        TARGET_SLOT="green"
        CURRENT_SLOT="blue"
    else
        TARGET_SLOT="blue"
        CURRENT_SLOT="green"
    fi
    
    # Get previous version info
    PREVIOUS_VERSION=$(kubectl get deployment truststream-$CURRENT_SLOT -o jsonpath='{.metadata.labels.version}' 2>/dev/null || echo "none")
    
    info "Current slot: $CURRENT_SLOT (version: $PREVIOUS_VERSION)"
    info "Target slot: $TARGET_SLOT (version: $BUILD_NUMBER)"
}

# Build and push container images
build_and_push_images() {
    log "Building and pushing container images..."
    
    # Login to ACR
    az acr login --name $ACR_NAME
    
    # Build main application image
    log "Building main application image..."
    docker build -t $ACR_LOGIN_SERVER/truststream-app:$BUILD_NUMBER \
        -t $ACR_LOGIN_SERVER/truststream-app:latest \
        -f $PROJECT_ROOT/docker/Dockerfile.app \
        $PROJECT_ROOT
    
    # Build worker image
    log "Building worker image..."
    docker build -t $ACR_LOGIN_SERVER/truststream-worker:$BUILD_NUMBER \
        -t $ACR_LOGIN_SERVER/truststream-worker:latest \
        -f $PROJECT_ROOT/docker/Dockerfile.worker \
        $PROJECT_ROOT
    
    # Build nginx image
    log "Building nginx image..."
    docker build -t $ACR_LOGIN_SERVER/truststream-nginx:$BUILD_NUMBER \
        -t $ACR_LOGIN_SERVER/truststream-nginx:latest \
        -f $PROJECT_ROOT/docker/Dockerfile.nginx \
        $PROJECT_ROOT
    
    # Push images
    log "Pushing images to ACR..."
    docker push $ACR_LOGIN_SERVER/truststream-app:$BUILD_NUMBER
    docker push $ACR_LOGIN_SERVER/truststream-app:latest
    docker push $ACR_LOGIN_SERVER/truststream-worker:$BUILD_NUMBER
    docker push $ACR_LOGIN_SERVER/truststream-worker:latest
    docker push $ACR_LOGIN_SERVER/truststream-nginx:$BUILD_NUMBER
    docker push $ACR_LOGIN_SERVER/truststream-nginx:latest
    
    # Scan images for vulnerabilities
    log "Scanning images for security vulnerabilities..."
    az acr task run --registry $ACR_NAME --name security-scan || warning "Security scan failed"
    
    success "Container images built and pushed successfully"
}

# Run database migrations
run_database_migrations() {
    log "Running database migrations..."
    
    # Get database credentials from Key Vault
    DB_PASSWORD=$(az keyvault secret show --vault-name $KEYVAULT_NAME --name "postgres-password" --query value -o tsv)
    
    # Create migration job
    cat > /tmp/migration-job.yaml <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: truststream-migration-$BUILD_NUMBER
  namespace: $NAMESPACE
  labels:
    app: truststream
    component: migration
    version: $BUILD_NUMBER
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: migration
        image: $ACR_LOGIN_SERVER/truststream-app:$BUILD_NUMBER
        command: ["npm", "run", "migrate"]
        env:
        - name: DATABASE_URL
          value: "postgresql://truststream_admin:$DB_PASSWORD@$POSTGRES_SERVER_NAME.postgres.database.azure.com:5432/truststream"
        - name: ENVIRONMENT
          value: "$ENVIRONMENT"
      backoffLimit: 3
EOF
    
    kubectl apply -f /tmp/migration-job.yaml
    
    # Wait for migration to complete
    log "Waiting for database migration to complete..."
    kubectl wait --for=condition=complete job/truststream-migration-$BUILD_NUMBER --timeout=300s
    
    if ! kubectl get job truststream-migration-$BUILD_NUMBER -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}' | grep -q "True"; then
        error "Database migration failed"
    fi
    
    success "Database migration completed successfully"
}

# Deploy to target slot
deploy_to_target_slot() {
    log "Deploying to $TARGET_SLOT slot..."
    
    # Get secrets from Key Vault
    DB_PASSWORD=$(az keyvault secret show --vault-name $KEYVAULT_NAME --name "postgres-password" --query value -o tsv)
    JWT_SECRET=$(az keyvault secret show --vault-name $KEYVAULT_NAME --name "jwt-secret" --query value -o tsv)
    APP_INSIGHTS_KEY=$(az keyvault secret show --vault-name $KEYVAULT_NAME --name "app-insights-key" --query value -o tsv)
    
    # Create deployment manifests
    cat > /tmp/truststream-$TARGET_SLOT-deployment.yaml <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: truststream-$TARGET_SLOT
  namespace: $NAMESPACE
  labels:
    app: truststream
    slot: $TARGET_SLOT
    version: $BUILD_NUMBER
spec:
  replicas: 3
  selector:
    matchLabels:
      app: truststream
      slot: $TARGET_SLOT
  template:
    metadata:
      labels:
        app: truststream
        slot: $TARGET_SLOT
        version: $BUILD_NUMBER
    spec:
      containers:
      - name: app
        image: $ACR_LOGIN_SERVER/truststream-app:$BUILD_NUMBER
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "$ENVIRONMENT"
        - name: DATABASE_URL
          value: "postgresql://truststream_admin:$DB_PASSWORD@$POSTGRES_SERVER_NAME.postgres.database.azure.com:5432/truststream"
        - name: JWT_SECRET
          value: "$JWT_SECRET"
        - name: APPINSIGHTS_INSTRUMENTATIONKEY
          value: "$APP_INSIGHTS_KEY"
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
        image: $ACR_LOGIN_SERVER/truststream-nginx:$BUILD_NUMBER
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
  name: truststream-$TARGET_SLOT-service
  namespace: $NAMESPACE
  labels:
    app: truststream
    slot: $TARGET_SLOT
spec:
  selector:
    app: truststream
    slot: $TARGET_SLOT
  ports:
  - name: http
    port: 80
    targetPort: 80
  - name: app
    port: 3000
    targetPort: 3000
EOF
    
    # Apply deployment
    kubectl apply -f /tmp/truststream-$TARGET_SLOT-deployment.yaml
    
    # Wait for deployment to be ready
    log "Waiting for $TARGET_SLOT deployment to be ready..."
    kubectl wait --for=condition=available deployment/truststream-$TARGET_SLOT --timeout=${DEPLOYMENT_TIMEOUT}s
    
    # Wait for all pods to be ready
    kubectl wait --for=condition=ready pod -l app=truststream,slot=$TARGET_SLOT --timeout=300s
    
    success "$TARGET_SLOT deployment completed successfully"
}

# Deploy worker services
deploy_workers() {
    log "Deploying worker services..."
    
    cat > /tmp/truststream-worker-deployment.yaml <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: truststream-worker
  namespace: $NAMESPACE
  labels:
    app: truststream-worker
    version: $BUILD_NUMBER
spec:
  replicas: 2
  selector:
    matchLabels:
      app: truststream-worker
  template:
    metadata:
      labels:
        app: truststream-worker
        version: $BUILD_NUMBER
    spec:
      containers:
      - name: worker
        image: $ACR_LOGIN_SERVER/truststream-worker:$BUILD_NUMBER
        env:
        - name: NODE_ENV
          value: "$ENVIRONMENT"
        - name: DATABASE_URL
          value: "postgresql://truststream_admin:$(az keyvault secret show --vault-name $KEYVAULT_NAME --name "postgres-password" --query value -o tsv)@$POSTGRES_SERVER_NAME.postgres.database.azure.com:5432/truststream"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
EOF
    
    kubectl apply -f /tmp/truststream-worker-deployment.yaml
    kubectl wait --for=condition=available deployment/truststream-worker --timeout=300s
    
    success "Worker services deployed successfully"
}

# Deploy Azure Functions
deploy_azure_functions() {
    log "Deploying Azure Functions..."
    
    FUNCTION_APP_NAME="${PROJECT_NAME}-${ENVIRONMENT}-functions"
    
    # Build functions package
    cd $PROJECT_ROOT/functions
    npm install
    npm run build
    
    # Create deployment package
    zip -r ../functions-$BUILD_NUMBER.zip . -x "node_modules/@types/*" "*.test.js" "*.spec.js"
    cd ..
    
    # Deploy to Azure Functions
    az functionapp deployment source config-zip \
        --resource-group $RESOURCE_GROUP \
        --name $FUNCTION_APP_NAME \
        --src functions-$BUILD_NUMBER.zip
    
    # Update application settings
    az functionapp config appsettings set \
        --resource-group $RESOURCE_GROUP \
        --name $FUNCTION_APP_NAME \
        --settings \
        "ENVIRONMENT=$ENVIRONMENT" \
        "DATABASE_URL=postgresql://truststream_admin:$(az keyvault secret show --vault-name $KEYVAULT_NAME --name "postgres-password" --query value -o tsv)@$POSTGRES_SERVER_NAME.postgres.database.azure.com:5432/truststream" \
        "APPINSIGHTS_INSTRUMENTATIONKEY=$(az keyvault secret show --vault-name $KEYVAULT_NAME --name "app-insights-key" --query value -o tsv)"
    
    success "Azure Functions deployed successfully"
}

# Run health checks on target slot
run_health_checks() {
    log "Running health checks on $TARGET_SLOT slot..."
    
    # Get service endpoint
    EXTERNAL_IP=$(kubectl get service truststream-$TARGET_SLOT-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    
    if [[ -z "$EXTERNAL_IP" ]]; then
        # Use port-forward for testing
        kubectl port-forward service/truststream-$TARGET_SLOT-service 8080:80 &
        PORT_FORWARD_PID=$!
        sleep 5
        HEALTH_URL="http://localhost:8080/health"
    else
        HEALTH_URL="http://$EXTERNAL_IP/health"
    fi
    
    # Health check with retries
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log "Health check attempt $attempt/$max_attempts"
        
        if curl -sf "$HEALTH_URL" > /dev/null; then
            success "Health check passed"
            break
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            error "Health checks failed after $max_attempts attempts"
        fi
        
        sleep 10
        ((attempt++))
    done
    
    # Clean up port-forward if used
    if [[ -n "${PORT_FORWARD_PID:-}" ]]; then
        kill $PORT_FORWARD_PID 2>/dev/null || true
    fi
    
    # Run extended health checks
    run_extended_health_checks
}

# Run extended health checks
run_extended_health_checks() {
    log "Running extended health checks..."
    
    # Database connectivity test
    kubectl run health-check-db-$BUILD_NUMBER --rm -it --restart=Never \
        --image=$ACR_LOGIN_SERVER/truststream-app:$BUILD_NUMBER \
        --command -- node -e "
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        pool.query('SELECT 1').then(() => {
            console.log('Database connection successful');
            process.exit(0);
        }).catch(err => {
            console.error('Database connection failed:', err);
            process.exit(1);
        });
    " || error "Database connectivity test failed"
    
    # API functionality test
    kubectl run health-check-api-$BUILD_NUMBER --rm -it --restart=Never \
        --image=curlimages/curl \
        --command -- curl -sf "http://truststream-$TARGET_SLOT-service/api/status" || error "API functionality test failed"
    
    success "Extended health checks passed"
}

# Switch traffic to target slot (blue-green switch)
switch_traffic() {
    log "Switching traffic to $TARGET_SLOT slot..."
    
    # Update main service to point to target slot
    kubectl patch service truststream-service -p '{"spec":{"selector":{"slot":"'$TARGET_SLOT'"}}}'
    
    # Wait for service to update
    sleep 10
    
    # Verify traffic switch
    local new_slot=$(kubectl get service truststream-service -o jsonpath='{.spec.selector.slot}')
    if [[ "$new_slot" != "$TARGET_SLOT" ]]; then
        error "Traffic switch failed"
    fi
    
    success "Traffic switched to $TARGET_SLOT slot successfully"
}

# Run smoke tests
run_smoke_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        warning "Skipping smoke tests as requested"
        return
    fi
    
    log "Running smoke tests..."
    
    # Get external IP for testing
    EXTERNAL_IP=$(kubectl get service truststream-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    
    if [[ -z "$EXTERNAL_IP" ]]; then
        kubectl port-forward service/truststream-service 8080:80 &
        PORT_FORWARD_PID=$!
        sleep 5
        BASE_URL="http://localhost:8080"
    else
        BASE_URL="http://$EXTERNAL_IP"
    fi
    
    # Run basic smoke tests
    local tests_passed=0
    local total_tests=3
    
    # Test 1: Homepage
    if curl -sf "$BASE_URL/" > /dev/null; then
        ((tests_passed++))
        success "Homepage test passed"
    else
        warning "Homepage test failed"
    fi
    
    # Test 2: API health
    if curl -sf "$BASE_URL/api/health" > /dev/null; then
        ((tests_passed++))
        success "API health test passed"
    else
        warning "API health test failed"
    fi
    
    # Test 3: Authentication endpoint
    if curl -sf "$BASE_URL/api/auth/status" > /dev/null; then
        ((tests_passed++))
        success "Auth status test passed"
    else
        warning "Auth status test failed"
    fi
    
    # Clean up port-forward if used
    if [[ -n "${PORT_FORWARD_PID:-}" ]]; then
        kill $PORT_FORWARD_PID 2>/dev/null || true
    fi
    
    if [[ $tests_passed -lt $total_tests ]]; then
        error "Smoke tests failed ($tests_passed/$total_tests passed)"
    fi
    
    success "All smoke tests passed ($tests_passed/$total_tests)"
}

# Clean up old deployment
cleanup_old_deployment() {
    log "Cleaning up old $CURRENT_SLOT deployment..."
    
    # Keep the old deployment for potential rollback
    kubectl label deployment truststream-$CURRENT_SLOT rollback=true --overwrite
    
    # Scale down old deployment
    kubectl scale deployment truststream-$CURRENT_SLOT --replicas=1
    
    success "Old deployment cleanup completed"
}

# Update deployment metadata
update_deployment_metadata() {
    log "Updating deployment metadata..."
    
    # Create deployment record
    cat > /tmp/deployment-record.yaml <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: deployment-$BUILD_NUMBER
  namespace: $NAMESPACE
  labels:
    app: truststream
    deployment-record: "true"
data:
  environment: "$ENVIRONMENT"
  version: "$BUILD_NUMBER"
  git-commit: "$GIT_COMMIT"
  deployed-at: "$(date -Iseconds)"
  deployed-by: "$(whoami)"
  active-slot: "$TARGET_SLOT"
  previous-slot: "$CURRENT_SLOT"
  previous-version: "$PREVIOUS_VERSION"
EOF
    
    kubectl apply -f /tmp/deployment-record.yaml
    
    success "Deployment metadata updated"
}

# Rollback function
rollback_deployment() {
    if [[ "$ROLLBACK_REQUIRED" == "true" ]]; then
        error "Deployment failed, initiating rollback..."
        
        log "Rolling back to $CURRENT_SLOT slot (version: $PREVIOUS_VERSION)..."
        
        # Switch traffic back to current slot
        kubectl patch service truststream-service -p '{"spec":{"selector":{"slot":"'$CURRENT_SLOT'"}}}'
        
        # Scale up previous deployment
        kubectl scale deployment truststream-$CURRENT_SLOT --replicas=3
        
        # Delete failed deployment
        kubectl delete deployment truststream-$TARGET_SLOT --ignore-not-found=true
        kubectl delete service truststream-$TARGET_SLOT-service --ignore-not-found=true
        
        error "Rollback completed. Deployment failed."
    fi
}

# Trap function for cleanup
cleanup_on_exit() {
    local exit_code=$?
    
    if [[ $exit_code -ne 0 ]]; then
        ROLLBACK_REQUIRED=true
        rollback_deployment
    fi
    
    # Clean up temporary files
    rm -f /tmp/migration-job.yaml
    rm -f /tmp/truststream-*-deployment.yaml
    rm -f /tmp/deployment-record.yaml
    rm -f functions-$BUILD_NUMBER.zip
    
    # Kill any background processes
    if [[ -n "${PORT_FORWARD_PID:-}" ]]; then
        kill $PORT_FORWARD_PID 2>/dev/null || true
    fi
}

# Display deployment summary
display_summary() {
    local deployment_end_time=$(date +%s)
    local deployment_duration=$((deployment_end_time - DEPLOYMENT_START_TIME))
    
    echo
    echo "=============================================="
    echo "TrustStream v4.2 Deployment Summary"
    echo "=============================================="
    echo "Environment: $ENVIRONMENT"
    echo "Version: $BUILD_NUMBER"
    echo "Git Commit: $GIT_COMMIT"
    echo "Active Slot: $TARGET_SLOT"
    echo "Previous Slot: $CURRENT_SLOT (version: $PREVIOUS_VERSION)"
    echo "Deployment Duration: ${deployment_duration}s"
    echo "Deployed At: $(date)"
    echo "=============================================="
    echo
    success "Deployment completed successfully!"
    
    echo "Next steps:"
    echo "1. Monitor the application: kubectl get pods -l app=truststream"
    echo "2. Check logs: kubectl logs -l app=truststream,slot=$TARGET_SLOT"
    echo "3. Run validation: ./validate-deployment.sh"
    echo "4. Monitor Azure portal for metrics and alerts"
}

# Main execution function
main() {
    log "Starting TrustStream v4.2 deployment..."
    
    # Set up cleanup trap
    trap cleanup_on_exit EXIT
    
    # Deployment steps
    init_deployment
    build_and_push_images
    run_database_migrations
    deploy_to_target_slot
    deploy_workers
    deploy_azure_functions
    run_health_checks
    switch_traffic
    run_smoke_tests
    cleanup_old_deployment
    update_deployment_metadata
    
    display_summary
}

# Handle command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment|-e)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --build-number|-b)
            BUILD_NUMBER="$2"
            shift 2
            ;;
        --force|-f)
            FORCE_DEPLOY="true"
            shift
            ;;
        --skip-tests)
            SKIP_TESTS="true"
            shift
            ;;
        --timeout|-t)
            DEPLOYMENT_TIMEOUT="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -e, --environment ENV    Target environment (dev/staging/prod)"
            echo "  -b, --build-number NUM   Build number for versioning"
            echo "  -f, --force              Force deployment even if health checks fail"
            echo "  --skip-tests             Skip smoke tests"
            echo "  -t, --timeout SECONDS    Deployment timeout (default: 600)"
            echo "  -h, --help               Show this help message"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Run main function
main "$@"
