#!/bin/bash

# TrustStream v4.0 Deployment Verification Script
# Usage: ./verify-deployment.sh --url https://app-url.com --check-deps

set -e

# Default values
APP_URL=""
CHECK_DEPS=false
CHECK_INTEGRATION=false
VERBOSE=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_check() {
    echo -e "${BLUE}[CHECK]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_CHECKS++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_CHECKS++))
}

# Increment total checks
count_check() {
    ((TOTAL_CHECKS++))
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --url)
            APP_URL="$2"
            shift 2
            ;;
        --check-deps)
            CHECK_DEPS=true
            shift
            ;;
        --check-integration)
            CHECK_INTEGRATION=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --url URL           Application URL to verify"
            echo "  --check-deps        Check system dependencies"
            echo "  --check-integration Run integration tests"
            echo "  --verbose           Verbose output"
            echo "  --help             Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown parameter: $1"
            exit 1
            ;;
    esac
done

log_info "Starting TrustStream v4.0 deployment verification..."

# Check system dependencies
check_dependencies() {
    log_check "Checking system dependencies..."
    
    # Check Node.js
    count_check
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        log_pass "Node.js installed: $NODE_VERSION"
    else
        log_fail "Node.js is not installed"
    fi
    
    # Check NPM
    count_check
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        log_pass "NPM installed: $NPM_VERSION"
    else
        log_fail "NPM is not installed"
    fi
    
    # Check Deno
    count_check
    if command -v deno &> /dev/null; then
        DENO_VERSION=$(deno --version | head -n1)
        log_pass "Deno installed: $DENO_VERSION"
    else
        log_fail "Deno is not installed"
    fi
    
    # Check Docker
    count_check
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version)
        log_pass "Docker installed: $DOCKER_VERSION"
        
        # Check if Docker daemon is running
        count_check
        if docker info &> /dev/null; then
            log_pass "Docker daemon is running"
        else
            log_fail "Docker daemon is not running"
        fi
    else
        log_fail "Docker is not installed"
    fi
    
    # Check Azure CLI
    count_check
    if command -v az &> /dev/null; then
        AZ_VERSION=$(az --version | head -n1)
        log_pass "Azure CLI installed: $AZ_VERSION"
        
        # Check Azure login status
        count_check
        if az account show &> /dev/null; then
            ACCOUNT=$(az account show --query name -o tsv)
            log_pass "Logged into Azure: $ACCOUNT"
        else
            log_fail "Not logged into Azure (run 'az login')"
        fi
    else
        log_fail "Azure CLI is not installed"
    fi
    
    # Check kubectl
    count_check
    if command -v kubectl &> /dev/null; then
        KUBECTL_VERSION=$(kubectl version --client --short 2>/dev/null || kubectl version --client | head -n1)
        log_pass "kubectl installed: $KUBECTL_VERSION"
    else
        log_warn "kubectl is not installed (required for AKS deployment)"
    fi
    
    # Check Python
    count_check
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version)
        log_pass "Python installed: $PYTHON_VERSION"
    else
        log_fail "Python 3 is not installed"
    fi
    
    # Check Git
    count_check
    if command -v git &> /dev/null; then
        GIT_VERSION=$(git --version)
        log_pass "Git installed: $GIT_VERSION"
    else
        log_fail "Git is not installed"
    fi
}

# Check environment configuration
check_environment() {
    log_check "Checking environment configuration..."
    
    # Check .env file
    count_check
    if [[ -f ".env" ]]; then
        log_pass ".env file exists"
        
        # Check required environment variables
        source .env 2>/dev/null || true
        
        required_vars=("SUPABASE_URL" "SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY")
        for var in "${required_vars[@]}"; do
            count_check
            if [[ -n "${!var}" && "${!var}" != "your-*-here" ]]; then
                log_pass "$var is configured"
            else
                log_fail "$var is not configured or using placeholder value"
            fi
        done
    else
        log_fail ".env file not found"
    fi
    
    # Check package.json
    count_check
    if [[ -f "package.json" ]]; then
        log_pass "package.json exists"
        
        # Check if node_modules exists
        count_check
        if [[ -d "node_modules" ]]; then
            log_pass "node_modules directory exists"
        else
            log_fail "node_modules directory not found (run 'npm install')"
        fi
    else
        log_warn "package.json not found"
    fi
}

# Check application URL
check_application() {
    if [[ -z "$APP_URL" ]]; then
        log_warn "No application URL provided, skipping application checks"
        return
    fi
    
    log_check "Checking application at $APP_URL..."
    
    # Check if URL is reachable
    count_check
    if curl -s --max-time 10 "$APP_URL" > /dev/null; then
        log_pass "Application URL is reachable"
    else
        log_fail "Application URL is not reachable"
        return
    fi
    
    # Check health endpoint
    count_check
    HEALTH_URL="$APP_URL/health"
    if curl -s --max-time 10 "$HEALTH_URL" > /dev/null; then
        log_pass "Health endpoint is accessible"
    else
        log_warn "Health endpoint not accessible (this may be normal if not implemented)"
    fi
    
    # Check admin interfaces
    admin_interfaces=("llm-nexus" "vectorgraph" "mcp-a2a" "knowledge-base")
    for interface in "${admin_interfaces[@]}"; do
        count_check
        ADMIN_URL="$APP_URL/admin/$interface"
        if curl -s --max-time 10 "$ADMIN_URL" > /dev/null; then
            log_pass "Admin interface $interface is accessible"
        else
            log_warn "Admin interface $interface not accessible"
        fi
    done
}

# Check Supabase connectivity
check_supabase() {
    log_check "Checking Supabase connectivity..."
    
    # Load environment variables
    if [[ -f ".env" ]]; then
        source .env
    fi
    
    if [[ -z "$SUPABASE_URL" || "$SUPABASE_URL" == "your-*-here" ]]; then
        log_fail "SUPABASE_URL not configured"
        return
    fi
    
    # Test Supabase connection
    count_check
    if curl -s --max-time 10 "$SUPABASE_URL" > /dev/null; then
        log_pass "Supabase URL is reachable"
    else
        log_fail "Supabase URL is not reachable"
        return
    fi
    
    # Test edge function endpoints
    if [[ -n "$SUPABASE_ANON_KEY" && "$SUPABASE_ANON_KEY" != "your-*-here" ]]; then
        test_endpoints=(
            "unified-knowledge-base/summary"
            "cross-layer-knowledge-correlation/correlations"
            "knowledge-quality-assessment/dashboard"
        )
        
        for endpoint in "${test_endpoints[@]}"; do
            count_check
            ENDPOINT_URL="$SUPABASE_URL/functions/v1/$endpoint"
            if curl -s --max-time 10 \
                -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
                -H "apikey: $SUPABASE_ANON_KEY" \
                "$ENDPOINT_URL" > /dev/null; then
                log_pass "Edge function $endpoint is accessible"
            else
                log_warn "Edge function $endpoint not accessible"
            fi
        done
    else
        log_warn "SUPABASE_ANON_KEY not configured, skipping edge function tests"
    fi
}

# Run integration tests
run_integration_tests() {
    log_check "Running integration tests..."
    
    if [[ ! -f "tests/integration_test_suite.py" ]]; then
        log_warn "Integration test suite not found"
        return
    fi
    
    count_check
    cd tests
    if python3 integration_test_suite.py > /tmp/integration_test_output.log 2>&1; then
        SUCCESS_RATE=$(grep "Success Rate:" /tmp/integration_test_output.log | tail -n1 | grep -o '[0-9]*\.[0-9]*%')
        if [[ -n "$SUCCESS_RATE" ]]; then
            log_pass "Integration tests completed with $SUCCESS_RATE success rate"
            
            # Check if 100% success rate
            if [[ "$SUCCESS_RATE" == "100.0%" ]]; then
                log_pass "Perfect 100% integration test success rate achieved!"
            else
                log_warn "Integration test success rate below 100%"
            fi
        else
            log_pass "Integration tests completed"
        fi
    else
        log_fail "Integration tests failed"
        if [[ "$VERBOSE" == true ]]; then
            log_error "Integration test output:"
            cat /tmp/integration_test_output.log
        fi
    fi
    cd ..
}

# Check file integrity
check_file_integrity() {
    log_check "Checking file integrity..."
    
    # Check Supabase functions
    count_check
    if [[ -d "supabase/functions" ]]; then
        FUNCTION_COUNT=$(find supabase/functions -name "index.ts" | wc -l)
        if [[ $FUNCTION_COUNT -gt 100 ]]; then
            log_pass "Supabase edge functions found: $FUNCTION_COUNT"
        else
            log_warn "Low number of edge functions found: $FUNCTION_COUNT"
        fi
    else
        log_fail "Supabase functions directory not found"
    fi
    
    # Check admin interfaces
    count_check
    if [[ -d "admin-interfaces" ]]; then
        INTERFACE_COUNT=$(find admin-interfaces -maxdepth 1 -type d | wc -l)
        if [[ $INTERFACE_COUNT -gt 3 ]]; then
            log_pass "Admin interfaces found: $((INTERFACE_COUNT-1))"
        else
            log_warn "Admin interfaces directory exists but may be incomplete"
        fi
    else
        log_warn "Admin interfaces directory not found"
    fi
    
    # Check documentation
    count_check
    if [[ -d "docs" ]]; then
        log_pass "Documentation directory exists"
    else
        log_warn "Documentation directory not found"
    fi
    
    # Check scripts
    count_check
    if [[ -d "scripts" ]]; then
        SCRIPT_COUNT=$(find scripts -name "*.sh" | wc -l)
        if [[ $SCRIPT_COUNT -gt 2 ]]; then
            log_pass "Deployment scripts found: $SCRIPT_COUNT"
        else
            log_warn "Some deployment scripts may be missing"
        fi
    else
        log_fail "Scripts directory not found"
    fi
}

# Generate verification report
generate_report() {
    log_info "Generating verification report..."
    
    REPORT_FILE="verification_report_$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$REPORT_FILE" << EOF
TrustStream v4.0 Deployment Verification Report
Generated: $(date)

=== SUMMARY ===
Total Checks: $TOTAL_CHECKS
Passed: $PASSED_CHECKS
Failed: $FAILED_CHECKS
Success Rate: $(echo "scale=1; $PASSED_CHECKS * 100 / $TOTAL_CHECKS" | bc -l)%

=== SYSTEM INFORMATION ===
Operating System: $(uname -s)
Kernel Version: $(uname -r)
Architecture: $(uname -m)
Hostname: $(hostname)

=== VERIFICATION DETAILS ===
Dependency Checks: $(echo "$CHECK_DEPS" | tr '[:lower:]' '[:upper:]')
Application URL: ${APP_URL:-"Not provided"}
Integration Tests: $(echo "$CHECK_INTEGRATION" | tr '[:lower:]' '[:upper:]')

=== RECOMMENDATIONS ===
EOF
    
    if [[ $FAILED_CHECKS -gt 0 ]]; then
        cat >> "$REPORT_FILE" << EOF
- Review failed checks and resolve issues before deployment
- Ensure all required dependencies are installed
- Verify environment configuration is complete
EOF
    else
        cat >> "$REPORT_FILE" << EOF
- All checks passed successfully
- System is ready for production deployment
- Consider setting up monitoring and alerts
EOF
    fi
    
    log_info "Verification report saved to: $REPORT_FILE"
}

# Main verification flow
main() {
    # Run checks based on options
    if [[ "$CHECK_DEPS" == true ]]; then
        check_dependencies
    fi
    
    check_environment
    check_file_integrity
    
    if [[ -n "$APP_URL" ]]; then
        check_application
    fi
    
    check_supabase
    
    if [[ "$CHECK_INTEGRATION" == true ]]; then
        run_integration_tests
    fi
    
    # Generate final report
    generate_report
    
    # Summary
    log_info "Verification completed!"
    log_info "Results: $PASSED_CHECKS/$TOTAL_CHECKS checks passed"
    
    if [[ $FAILED_CHECKS -eq 0 ]]; then
        log_info "All checks passed! System is ready for deployment."
        exit 0
    else
        log_warn "$FAILED_CHECKS checks failed. Please review and resolve issues."
        exit 1
    fi
}

# Install bc for percentage calculation if not available
if ! command -v bc &> /dev/null; then
    if command -v apt-get &> /dev/null; then
        sudo apt-get install -y bc
    elif command -v yum &> /dev/null; then
        sudo yum install -y bc
    elif command -v brew &> /dev/null; then
        brew install bc
    fi
fi

# Run main function
main
