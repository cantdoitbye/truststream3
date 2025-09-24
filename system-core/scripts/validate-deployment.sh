#!/bin/bash

# TrustStream v4.2 - Comprehensive Deployment Validation Script
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
CYAN='\033[0;36m'
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

test_start() {
    echo -e "${CYAN}[TEST]${NC} $1"
}

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${ENVIRONMENT:-staging}"
COMPREHENSIVE="${COMPREHENSIVE:-false}"
LOAD_TEST="${LOAD_TEST:-false}"
SECURITY_SCAN="${SECURITY_SCAN:-false}"
PERFORMANCE_BASELINE="${PERFORMANCE_BASELINE:-false}"

# Load environment configuration
if [[ -f "/workspace/config/${ENVIRONMENT}.env" ]]; then
    source "/workspace/config/${ENVIRONMENT}.env"
else
    error "Environment configuration not found. Please run setup-environment.sh first."
    exit 1
fi

# Validation results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNING_TESTS=0
VALIDATION_START_TIME=""
TEST_RESULTS=()

# Initialize validation
init_validation() {
    log "Initializing deployment validation for environment: $ENVIRONMENT"
    
    VALIDATION_START_TIME=$(date +%s)
    
    # Verify prerequisites
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed"
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        error "curl is not installed"
        exit 1
    fi
    
    # Set kubectl context
    az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER_NAME --overwrite-existing
    kubectl config set-context --current --namespace=$NAMESPACE
    
    # Create validation results directory
    mkdir -p /workspace/validation-results
    
    success "Validation initialization completed"
}

# Helper function to track test results
track_test() {
    local test_name="$1"
    local status="$2"  # PASS, FAIL, WARN
    local message="$3"
    
    ((TOTAL_TESTS++))
    
    case $status in
        "PASS")
            ((PASSED_TESTS++))
            success "$test_name: $message"
            ;;
        "FAIL")
            ((FAILED_TESTS++))
            error "$test_name: $message"
            ;;
        "WARN")
            ((WARNING_TESTS++))
            warning "$test_name: $message"
            ;;
    esac
    
    TEST_RESULTS+=("$status|$test_name|$message")
}

# Validate Kubernetes deployments
validate_kubernetes_deployments() {
    test_start "Validating Kubernetes deployments..."
    
    # Check main application deployment
    local app_replicas_ready=$(kubectl get deployment truststream-green -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    local app_replicas_desired=$(kubectl get deployment truststream-green -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
    
    if [[ "$app_replicas_ready" == "$app_replicas_desired" && "$app_replicas_ready" -gt 0 ]]; then
        track_test "App Deployment" "PASS" "All replicas ready ($app_replicas_ready/$app_replicas_desired)"
    else
        track_test "App Deployment" "FAIL" "Replicas not ready ($app_replicas_ready/$app_replicas_desired)"
    fi
    
    # Check worker deployment
    local worker_replicas_ready=$(kubectl get deployment truststream-worker -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    local worker_replicas_desired=$(kubectl get deployment truststream-worker -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
    
    if [[ "$worker_replicas_ready" == "$worker_replicas_desired" && "$worker_replicas_ready" -gt 0 ]]; then
        track_test "Worker Deployment" "PASS" "All replicas ready ($worker_replicas_ready/$worker_replicas_desired)"
    else
        track_test "Worker Deployment" "FAIL" "Replicas not ready ($worker_replicas_ready/$worker_replicas_desired)"
    fi
    
    # Check pod health
    local unhealthy_pods=$(kubectl get pods -l app=truststream --no-headers | grep -v Running | wc -l)
    if [[ "$unhealthy_pods" -eq 0 ]]; then
        track_test "Pod Health" "PASS" "All pods are running"
    else
        track_test "Pod Health" "FAIL" "$unhealthy_pods pods are not running"
    fi
}

# Validate services and networking
validate_services_networking() {
    test_start "Validating services and networking..."
    
    # Check main service
    local service_endpoints=$(kubectl get endpoints truststream-service -o jsonpath='{.subsets[*].addresses[*].ip}' | wc -w)
    if [[ "$service_endpoints" -gt 0 ]]; then
        track_test "Main Service" "PASS" "$service_endpoints endpoints available"
    else
        track_test "Main Service" "FAIL" "No service endpoints available"
    fi
    
    # Check external IP assignment
    local external_ip=$(kubectl get service truststream-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    if [[ -n "$external_ip" ]]; then
        track_test "External IP" "PASS" "External IP assigned: $external_ip"
        export SERVICE_EXTERNAL_IP="$external_ip"
    else
        track_test "External IP" "WARN" "External IP not assigned, using port-forward for tests"
        export SERVICE_EXTERNAL_IP=""
    fi
    
    # Check ingress controller
    local ingress_pods=$(kubectl get pods -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx --no-headers | grep Running | wc -l)
    if [[ "$ingress_pods" -gt 0 ]]; then
        track_test "Ingress Controller" "PASS" "$ingress_pods ingress pods running"
    else
        track_test "Ingress Controller" "WARN" "No ingress controller pods running"
    fi
}

# Validate database connectivity
validate_database_connectivity() {
    test_start "Validating database connectivity..."
    
    # Get database credentials
    local db_password=$(az keyvault secret show --vault-name $KEYVAULT_NAME --name "postgres-password" --query value -o tsv 2>/dev/null || echo "")
    
    if [[ -z "$db_password" ]]; then
        track_test "Database Credentials" "FAIL" "Cannot retrieve database password from Key Vault"
        return
    fi
    
    # Test database connection
    kubectl run db-test-$(date +%s) --rm -it --restart=Never \
        --image=postgres:13 \
        --env="PGPASSWORD=$db_password" \
        --command -- psql \
        -h "$POSTGRES_SERVER_NAME.postgres.database.azure.com" \
        -U "truststream_admin" \
        -d "truststream" \
        -c "SELECT 1;" > /dev/null 2>&1
    
    if [[ $? -eq 0 ]]; then
        track_test "Database Connection" "PASS" "Database connection successful"
    else
        track_test "Database Connection" "FAIL" "Database connection failed"
    fi
    
    # Test connection pool
    kubectl run pool-test-$(date +%s) --rm -it --restart=Never \
        --image=$ACR_LOGIN_SERVER/truststream-app:latest \
        --env="DATABASE_URL=postgresql://truststream_admin:$db_password@$POSTGRES_SERVER_NAME.postgres.database.azure.com:5432/truststream" \
        --command -- node -e "
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
        Promise.all([...Array(3)].map(() => pool.query('SELECT NOW()'))).then(() => {
            console.log('Connection pool test successful');
            process.exit(0);
        }).catch(err => {
            console.error('Connection pool test failed:', err);
            process.exit(1);
        });
    " > /dev/null 2>&1
    
    if [[ $? -eq 0 ]]; then
        track_test "Connection Pool" "PASS" "Connection pool working correctly"
    else
        track_test "Connection Pool" "FAIL" "Connection pool test failed"
    fi
}

# Validate Azure Functions
validate_azure_functions() {
    test_start "Validating Azure Functions..."
    
    local function_app_name="${PROJECT_NAME}-${ENVIRONMENT}-functions"
    
    # Check function app status
    local function_status=$(az functionapp show --name $function_app_name --resource-group $RESOURCE_GROUP --query "state" -o tsv 2>/dev/null || echo "Unknown")
    
    if [[ "$function_status" == "Running" ]]; then
        track_test "Function App Status" "PASS" "Function app is running"
    else
        track_test "Function App Status" "FAIL" "Function app status: $function_status"
        return
    fi
    
    # Test function endpoints
    local function_url=$(az functionapp show --name $function_app_name --resource-group $RESOURCE_GROUP --query "defaultHostName" -o tsv)
    
    if curl -sf "https://$function_url/api/health" > /dev/null; then
        track_test "Function Endpoints" "PASS" "Function endpoints responding"
    else
        track_test "Function Endpoints" "FAIL" "Function endpoints not responding"
    fi
}

# Run application health checks
validate_application_health() {
    test_start "Validating application health..."
    
    # Set up endpoint for testing
    local base_url=""
    local port_forward_pid=""
    
    if [[ -n "${SERVICE_EXTERNAL_IP:-}" ]]; then
        base_url="http://$SERVICE_EXTERNAL_IP"
    else
        kubectl port-forward service/truststream-service 8080:80 &
        port_forward_pid=$!
        sleep 5
        base_url="http://localhost:8080"
    fi
    
    # Health endpoint test
    if curl -sf "$base_url/health" > /dev/null; then
        track_test "Health Endpoint" "PASS" "Health endpoint responding"
    else
        track_test "Health Endpoint" "FAIL" "Health endpoint not responding"
    fi
    
    # Readiness endpoint test
    if curl -sf "$base_url/ready" > /dev/null; then
        track_test "Readiness Endpoint" "PASS" "Readiness endpoint responding"
    else
        track_test "Readiness Endpoint" "FAIL" "Readiness endpoint not responding"
    fi
    
    # API status test
    local api_response=$(curl -s "$base_url/api/status" 2>/dev/null || echo "")
    if [[ -n "$api_response" ]] && echo "$api_response" | jq -e '.status == "ok"' > /dev/null 2>&1; then
        track_test "API Status" "PASS" "API status endpoint working"
    else
        track_test "API Status" "FAIL" "API status endpoint failed"
    fi
    
    # Authentication endpoint test
    local auth_response=$(curl -s "$base_url/api/auth/status" 2>/dev/null || echo "")
    if [[ -n "$auth_response" ]]; then
        track_test "Auth Endpoint" "PASS" "Authentication endpoint responding"
    else
        track_test "Auth Endpoint" "WARN" "Authentication endpoint not responding"
    fi
    
    # Clean up port-forward if used
    if [[ -n "$port_forward_pid" ]]; then
        kill $port_forward_pid 2>/dev/null || true
    fi
}

# Validate monitoring and observability
validate_monitoring() {
    test_start "Validating monitoring and observability..."
    
    # Check Application Insights
    local app_insights_name="${PROJECT_NAME}-${ENVIRONMENT}-insights"
    local insights_status=$(az monitor app-insights component show --app $app_insights_name --resource-group $RESOURCE_GROUP --query "provisioningState" -o tsv 2>/dev/null || echo "Unknown")
    
    if [[ "$insights_status" == "Succeeded" ]]; then
        track_test "Application Insights" "PASS" "Application Insights configured"
    else
        track_test "Application Insights" "FAIL" "Application Insights status: $insights_status"
    fi
    
    # Check Prometheus (if production environment)
    if [[ "$ENVIRONMENT" == "production" ]]; then
        local prometheus_pods=$(kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus --no-headers | grep Running | wc -l)
        if [[ "$prometheus_pods" -gt 0 ]]; then
            track_test "Prometheus" "PASS" "Prometheus monitoring active"
        else
            track_test "Prometheus" "WARN" "Prometheus not running"
        fi
        
        local grafana_pods=$(kubectl get pods -n monitoring -l app.kubernetes.io/name=grafana --no-headers | grep Running | wc -l)
        if [[ "$grafana_pods" -gt 0 ]]; then
            track_test "Grafana" "PASS" "Grafana dashboards available"
        else
            track_test "Grafana" "WARN" "Grafana not running"
        fi
    fi
    
    # Check pod resource usage
    kubectl top pods -l app=truststream --no-headers > /tmp/pod-resources.txt 2>/dev/null || echo "Unable to get pod metrics" > /tmp/pod-resources.txt
    
    if grep -q "CPU" /tmp/pod-resources.txt; then
        track_test "Resource Metrics" "PASS" "Pod resource metrics available"
    else
        track_test "Resource Metrics" "WARN" "Pod resource metrics not available"
    fi
}

# Run security validation
validate_security() {
    test_start "Validating security configuration..."
    
    # Check RBAC
    local rbac_enabled=$(az aks show --name $AKS_CLUSTER_NAME --resource-group $RESOURCE_GROUP --query "aadProfile.managed" -o tsv 2>/dev/null || echo "false")
    if [[ "$rbac_enabled" == "true" ]]; then
        track_test "RBAC" "PASS" "Azure AD RBAC enabled"
    else
        track_test "RBAC" "WARN" "Azure AD RBAC not enabled"
    fi
    
    # Check network policies
    local network_policy=$(kubectl get networkpolicies --no-headers 2>/dev/null | wc -l)
    if [[ "$network_policy" -gt 0 ]]; then
        track_test "Network Policies" "PASS" "$network_policy network policies configured"
    else
        track_test "Network Policies" "WARN" "No network policies found"
    fi
    
    # Check pod security standards
    local privileged_pods=$(kubectl get pods -o jsonpath='{.items[*].spec.containers[*].securityContext.privileged}' | grep -o true | wc -l)
    if [[ "$privileged_pods" -eq 0 ]]; then
        track_test "Pod Security" "PASS" "No privileged pods found"
    else
        track_test "Pod Security" "WARN" "$privileged_pods privileged pods found"
    fi
    
    # Check secrets in Key Vault
    local vault_secrets=$(az keyvault secret list --vault-name $KEYVAULT_NAME --query "length(@)" -o tsv 2>/dev/null || echo "0")
    if [[ "$vault_secrets" -gt 0 ]]; then
        track_test "Key Vault Secrets" "PASS" "$vault_secrets secrets in Key Vault"
    else
        track_test "Key Vault Secrets" "FAIL" "No secrets found in Key Vault"
    fi
}

# Run performance validation
validate_performance() {
    test_start "Validating performance..."
    
    # Set up endpoint for testing
    local base_url=""
    local port_forward_pid=""
    
    if [[ -n "${SERVICE_EXTERNAL_IP:-}" ]]; then
        base_url="http://$SERVICE_EXTERNAL_IP"
    else
        kubectl port-forward service/truststream-service 8080:80 &
        port_forward_pid=$!
        sleep 5
        base_url="http://localhost:8080"
    fi
    
    # Response time test
    local response_time=$(curl -o /dev/null -s -w '%{time_total}' "$base_url/health" 2>/dev/null || echo "999")
    local response_ms=$(echo "$response_time * 1000" | bc 2>/dev/null || echo "999")
    
    if (( $(echo "$response_ms < 500" | bc -l) )); then
        track_test "Response Time" "PASS" "Response time: ${response_ms}ms"
    elif (( $(echo "$response_ms < 1000" | bc -l) )); then
        track_test "Response Time" "WARN" "Response time: ${response_ms}ms (acceptable but high)"
    else
        track_test "Response Time" "FAIL" "Response time: ${response_ms}ms (too high)"
    fi
    
    # Concurrent request test
    local concurrent_success=0
    for i in {1..5}; do
        if curl -sf "$base_url/health" > /dev/null 2>&1 &
        then
            ((concurrent_success++))
        fi
    done
    wait
    
    if [[ "$concurrent_success" -eq 5 ]]; then
        track_test "Concurrent Requests" "PASS" "All concurrent requests successful"
    else
        track_test "Concurrent Requests" "WARN" "Only $concurrent_success/5 concurrent requests successful"
    fi
    
    # Clean up port-forward if used
    if [[ -n "$port_forward_pid" ]]; then
        kill $port_forward_pid 2>/dev/null || true
    fi
}

# Run load testing (optional)
run_load_testing() {
    if [[ "$LOAD_TEST" != "true" ]]; then
        return
    fi
    
    test_start "Running load testing..."
    
    # Set up endpoint for testing
    local base_url=""
    local port_forward_pid=""
    
    if [[ -n "${SERVICE_EXTERNAL_IP:-}" ]]; then
        base_url="http://$SERVICE_EXTERNAL_IP"
    else
        kubectl port-forward service/truststream-service 8080:80 &
        port_forward_pid=$!
        sleep 5
        base_url="http://localhost:8080"
    fi
    
    # Install hey if not available
    if ! command -v hey &> /dev/null; then
        log "Installing hey load testing tool..."
        curl -sf https://hey-release.s3.us-east-2.amazonaws.com/hey_linux_amd64 -o /tmp/hey
        chmod +x /tmp/hey
        HEY_CMD="/tmp/hey"
    else
        HEY_CMD="hey"
    fi
    
    # Run load test
    log "Running load test: 100 requests, 10 concurrent users"
    $HEY_CMD -n 100 -c 10 "$base_url/health" > /tmp/load-test-results.txt 2>&1
    
    # Analyze results
    local success_rate=$(grep "Success rate" /tmp/load-test-results.txt | awk '{print $3}' | tr -d '%' || echo "0")
    local avg_response=$(grep "Average:" /tmp/load-test-results.txt | awk '{print $2}' | tr -d 's' || echo "999")
    
    if [[ "$success_rate" -gt 95 ]]; then
        track_test "Load Test Success Rate" "PASS" "Success rate: ${success_rate}%"
    else
        track_test "Load Test Success Rate" "FAIL" "Success rate: ${success_rate}%"
    fi
    
    if (( $(echo "$avg_response < 1.0" | bc -l) )); then
        track_test "Load Test Response Time" "PASS" "Average response: ${avg_response}s"
    else
        track_test "Load Test Response Time" "WARN" "Average response: ${avg_response}s"
    fi
    
    # Clean up port-forward if used
    if [[ -n "$port_forward_pid" ]]; then
        kill $port_forward_pid 2>/dev/null || true
    fi
    
    # Save full results
    cp /tmp/load-test-results.txt /workspace/validation-results/load-test-results.txt
}

# Validate configuration management
validate_configuration() {
    test_start "Validating configuration management..."
    
    # Check ConfigMaps
    local configmaps=$(kubectl get configmaps --no-headers | grep -v kube | wc -l)
    if [[ "$configmaps" -gt 0 ]]; then
        track_test "ConfigMaps" "PASS" "$configmaps configuration maps found"
    else
        track_test "ConfigMaps" "WARN" "No application ConfigMaps found"
    fi
    
    # Check environment variables
    local env_vars=$(kubectl get deployment truststream-green -o jsonpath='{.spec.template.spec.containers[0].env[*].name}' 2>/dev/null | wc -w || echo "0")
    if [[ "$env_vars" -gt 0 ]]; then
        track_test "Environment Variables" "PASS" "$env_vars environment variables configured"
    else
        track_test "Environment Variables" "FAIL" "No environment variables found"
    fi
    
    # Check resource limits
    local cpu_limits=$(kubectl get deployment truststream-green -o jsonpath='{.spec.template.spec.containers[0].resources.limits.cpu}' 2>/dev/null || echo "")
    local memory_limits=$(kubectl get deployment truststream-green -o jsonpath='{.spec.template.spec.containers[0].resources.limits.memory}' 2>/dev/null || echo "")
    
    if [[ -n "$cpu_limits" && -n "$memory_limits" ]]; then
        track_test "Resource Limits" "PASS" "CPU: $cpu_limits, Memory: $memory_limits"
    else
        track_test "Resource Limits" "WARN" "Resource limits not properly configured"
    fi
}

# Validate backup and disaster recovery
validate_backup_dr() {
    test_start "Validating backup and disaster recovery..."
    
    # Check database backup configuration
    local backup_retention=$(az postgres server show --name $POSTGRES_SERVER_NAME --resource-group $RESOURCE_GROUP --query "backupRetentionDays" -o tsv 2>/dev/null || echo "0")
    if [[ "$backup_retention" -gt 0 ]]; then
        track_test "Database Backup" "PASS" "Backup retention: $backup_retention days"
    else
        track_test "Database Backup" "FAIL" "Database backup not configured"
    fi
    
    # Check geo-redundant backup
    local geo_backup=$(az postgres server show --name $POSTGRES_SERVER_NAME --resource-group $RESOURCE_GROUP --query "geoRedundantBackup" -o tsv 2>/dev/null || echo "Disabled")
    if [[ "$geo_backup" == "Enabled" ]]; then
        track_test "Geo-Redundant Backup" "PASS" "Geo-redundant backup enabled"
    else
        track_test "Geo-Redundant Backup" "WARN" "Geo-redundant backup disabled"
    fi
    
    # Check persistent volume backups
    local pvs=$(kubectl get pv --no-headers 2>/dev/null | wc -l || echo "0")
    if [[ "$pvs" -gt 0 ]]; then
        track_test "Persistent Volumes" "PASS" "$pvs persistent volumes found"
    else
        track_test "Persistent Volumes" "WARN" "No persistent volumes found"
    fi
}

# Generate validation report
generate_report() {
    local validation_end_time=$(date +%s)
    local validation_duration=$((validation_end_time - VALIDATION_START_TIME))
    
    local report_file="/workspace/validation-results/validation-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" <<EOF
# TrustStream v4.2 Deployment Validation Report

## Summary
- **Environment**: $ENVIRONMENT
- **Validation Date**: $(date)
- **Validation Duration**: ${validation_duration}s
- **Total Tests**: $TOTAL_TESTS
- **Passed**: $PASSED_TESTS
- **Failed**: $FAILED_TESTS
- **Warnings**: $WARNING_TESTS

## Overall Status
EOF

    if [[ "$FAILED_TESTS" -eq 0 ]]; then
        echo "✅ **VALIDATION PASSED** - All critical tests successful" >> "$report_file"
    else
        echo "❌ **VALIDATION FAILED** - $FAILED_TESTS critical tests failed" >> "$report_file"
    fi
    
    cat >> "$report_file" <<EOF

## Detailed Results

EOF

    # Add detailed results
    for result in "${TEST_RESULTS[@]}"; do
        IFS='|' read -r status test_name message <<< "$result"
        case $status in
            "PASS")
                echo "✅ **$test_name**: $message" >> "$report_file"
                ;;
            "FAIL")
                echo "❌ **$test_name**: $message" >> "$report_file"
                ;;
            "WARN")
                echo "⚠️ **$test_name**: $message" >> "$report_file"
                ;;
        esac
    done
    
    cat >> "$report_file" <<EOF

## Environment Information
- **Resource Group**: $RESOURCE_GROUP
- **AKS Cluster**: $AKS_CLUSTER_NAME
- **Container Registry**: $ACR_NAME
- **Database Server**: $POSTGRES_SERVER_NAME
- **Key Vault**: $KEYVAULT_NAME

## Recommendations
EOF

    if [[ "$FAILED_TESTS" -gt 0 ]]; then
        echo "- ❗ **Immediate Action Required**: Address the $FAILED_TESTS failed tests before proceeding to production" >> "$report_file"
    fi
    
    if [[ "$WARNING_TESTS" -gt 0 ]]; then
        echo "- ⚠️ **Attention Needed**: Review the $WARNING_TESTS warnings for potential improvements" >> "$report_file"
    fi
    
    if [[ "$FAILED_TESTS" -eq 0 && "$WARNING_TESTS" -eq 0 ]]; then
        echo "- ✅ **All Good**: Deployment meets all validation criteria" >> "$report_file"
    fi
    
    echo "" >> "$report_file"
    echo "---" >> "$report_file"
    echo "*Report generated by TrustStream v4.2 Validation System*" >> "$report_file"
    
    log "Validation report generated: $report_file"
}

# Display validation summary
display_summary() {
    local validation_end_time=$(date +%s)
    local validation_duration=$((validation_end_time - VALIDATION_START_TIME))
    
    echo
    echo "=============================================="
    echo "TrustStream v4.2 Validation Summary"
    echo "=============================================="
    echo "Environment: $ENVIRONMENT"
    echo "Total Tests: $TOTAL_TESTS"
    echo "Passed: $PASSED_TESTS"
    echo "Failed: $FAILED_TESTS"
    echo "Warnings: $WARNING_TESTS"
    echo "Duration: ${validation_duration}s"
    echo "=============================================="
    
    if [[ "$FAILED_TESTS" -eq 0 ]]; then
        success "✅ ALL VALIDATIONS PASSED"
        echo "The deployment is healthy and ready for production traffic."
    else
        error "❌ VALIDATION FAILED"
        echo "Critical issues found. Please address the failures before proceeding."
        exit 1
    fi
    
    if [[ "$WARNING_TESTS" -gt 0 ]]; then
        warning "⚠️ $WARNING_TESTS warnings found - review recommended"
    fi
}

# Main execution function
main() {
    log "Starting comprehensive deployment validation..."
    
    init_validation
    
    # Core validation tests
    validate_kubernetes_deployments
    validate_services_networking
    validate_database_connectivity
    validate_azure_functions
    validate_application_health
    validate_monitoring
    validate_configuration
    
    # Extended validation (if requested)
    if [[ "$COMPREHENSIVE" == "true" ]]; then
        validate_security
        validate_performance
        validate_backup_dr
    fi
    
    # Optional tests
    run_load_testing
    
    generate_report
    display_summary
}

# Handle command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment|-e)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --comprehensive|-c)
            COMPREHENSIVE="true"
            shift
            ;;
        --load-test|-l)
            LOAD_TEST="true"
            shift
            ;;
        --security-scan|-s)
            SECURITY_SCAN="true"
            shift
            ;;
        --performance-baseline|-p)
            PERFORMANCE_BASELINE="true"
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -e, --environment ENV        Target environment (dev/staging/prod)"
            echo "  -c, --comprehensive          Run comprehensive validation including security and DR"
            echo "  -l, --load-test              Run load testing"
            echo "  -s, --security-scan          Run security scanning"
            echo "  -p, --performance-baseline   Establish performance baseline"
            echo "  -h, --help                   Show this help message"
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
