#!/bin/bash

# TrustStream v4.2 Deployment Validation Script
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
CONFIG_FILE=""
FORCE=false
VERBOSE=false
DRY_RUN=false
TIMEOUT=300
RETRIES=3
STRICT_MODE=false
TEST_SUITES="all"
OUTPUT_FORMAT="text"
REPORT_FILE=""

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0
TEST_RESULTS=()

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment|-e)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --config|-c)
            CONFIG_FILE="$2"
            shift 2
            ;;
        --timeout|-t)
            TIMEOUT="$2"
            shift 2
            ;;
        --retries|-r)
            RETRIES="$2"
            shift 2
            ;;
        --test-suites)
            TEST_SUITES="$2"
            shift 2
            ;;
        --output-format)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        --report-file)
            REPORT_FILE="$2"
            shift 2
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --strict)
            STRICT_MODE=true
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
TrustStream v4.2 Deployment Validation Script

Usage: $0 [OPTIONS]

Options:
  -e, --environment ENV       Target environment (development|staging|production) [default: development]
  -c, --config FILE          Configuration file path
  -t, --timeout SECONDS     Test timeout in seconds [default: 300]
  -r, --retries COUNT        Number of retries for failed tests [default: 3]
      --test-suites SUITES   Test suites to run (all|health|database|api|edge-functions|security) [default: all]
      --output-format FORMAT Output format (text|json|junit) [default: text]
      --report-file FILE     Save test report to file
      --force                Continue testing even if critical tests fail
      --strict               Fail on any test failure (including warnings)
  -v, --verbose              Enable verbose logging
      --dry-run              Show what tests would be run without executing
  -h, --help                 Show this help message

Test Suites:
  health          Basic health checks (connectivity, response time)
  database        Database connectivity and schema validation
  api             API endpoint testing
  edge-functions  Supabase edge function testing
  security        Security configuration validation
  performance     Performance and load testing
  integration     End-to-end integration testing
  all             Run all test suites

Examples:
  # Validate development deployment
  $0 --environment development --config config/pipeline-config.yaml
  
  # Run only health and API tests
  $0 --environment production --test-suites "health,api" --strict
  
  # Generate JSON report
  $0 --environment staging --output-format json --report-file validation-report.json

EOF
}

# Initialize validation
init_validation() {
    log_header "TrustStream v4.2 Deployment Validation"
    log_info "Environment: $ENVIRONMENT"
    log_info "Test Suites: $TEST_SUITES"
    log_info "Output Format: $OUTPUT_FORMAT"
    
    if [[ -n "$CONFIG_FILE" ]]; then
        log_info "Loading configuration: $CONFIG_FILE"
        load_config "$CONFIG_FILE" "$ENVIRONMENT"
    fi
    
    # Create report directory if needed
    if [[ -n "$REPORT_FILE" ]]; then
        local report_dir
        report_dir="$(dirname "$REPORT_FILE")"
        mkdir -p "$report_dir" 2>/dev/null || true
    fi
}

# Record test result
record_test_result() {
    local test_name="$1"
    local status="$2"
    local message="$3"
    local duration="${4:-0}"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    case "$status" in
        "PASS")
            PASSED_TESTS=$((PASSED_TESTS + 1))
            log_success "✓ $test_name: $message"
            ;;
        "FAIL")
            FAILED_TESTS=$((FAILED_TESTS + 1))
            log_error "✗ $test_name: $message"
            ;;
        "SKIP")
            SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
            log_warn "- $test_name: $message (SKIPPED)"
            ;;
    esac
    
    # Store result for reporting
    TEST_RESULTS+=("$test_name|$status|$message|$duration")
    
    if [[ "$VERBOSE" == "true" ]]; then
        log_debug "Test: $test_name, Status: $status, Duration: ${duration}s"
    fi
}

# Run a single test with retry logic
run_test() {
    local test_name="$1"
    local test_command="$2"
    local retry_count="${3:-$RETRIES}"
    local timeout="${4:-$TIMEOUT}"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would run test: $test_name"
        record_test_result "$test_name" "SKIP" "Dry run mode" "0"
        return 0
    fi
    
    local start_time
    start_time="$(date +%s)"
    
    for ((attempt=1; attempt<=retry_count; attempt++)); do
        log_debug "Running test: $test_name (attempt $attempt/$retry_count)"
        
        local test_result=0
        local test_output
        
        # Run test with timeout
        if test_output="$(timeout "$timeout" bash -c "$test_command" 2>&1)"; then
            local end_time
            end_time="$(date +%s)"
            local duration=$((end_time - start_time))
            
            record_test_result "$test_name" "PASS" "Test passed" "$duration"
            return 0
        else
            test_result=$?
            
            if [[ $test_result -eq 124 ]]; then
                # Timeout
                log_warn "Test '$test_name' timed out (attempt $attempt/$retry_count)"
            else
                log_warn "Test '$test_name' failed with exit code $test_result (attempt $attempt/$retry_count)"
            fi
            
            if [[ "$VERBOSE" == "true" && -n "$test_output" ]]; then
                log_debug "Test output: $test_output"
            fi
            
            # Wait before retry (except on last attempt)
            if [[ $attempt -lt $retry_count ]]; then
                local wait_time=$((attempt * 5))
                log_debug "Waiting ${wait_time}s before retry..."
                sleep "$wait_time"
            fi
        fi
    done
    
    # All attempts failed
    local end_time
    end_time="$(date +%s)"
    local duration=$((end_time - start_time))
    
    local failure_message="Test failed after $retry_count attempts"
    if [[ -n "$test_output" ]]; then
        failure_message="$failure_message: $test_output"
    fi
    
    record_test_result "$test_name" "FAIL" "$failure_message" "$duration"
    
    # Check if we should stop on failure
    if [[ "$STRICT_MODE" == "true" && "$FORCE" != "true" ]]; then
        log_error "Strict mode enabled: stopping validation due to test failure"
        return 1
    fi
    
    return 1
}

# Health check tests
run_health_tests() {
    log_section "Health Check Tests"
    
    # Basic connectivity test
    local app_url
    if [[ -n "$CONFIG_FILE" ]]; then
        # Try to get URL from config or environment
        app_url="https://truststream-v42-$ENVIRONMENT-app.azurewebsites.net"
    else
        app_url="http://localhost:3000"
    fi
    
    run_test "health_endpoint" \
        "curl -f -s --max-time 10 '$app_url/health' | grep -q 'ok'"
    
    run_test "health_response_time" \
        "test \$(curl -f -s -w '%{time_total}' -o /dev/null '$app_url/health' | cut -d. -f1) -lt 5"
    
    run_test "health_status_code" \
        "test \$(curl -f -s -o /dev/null -w '%{http_code}' '$app_url/health') -eq 200"
    
    # Memory and CPU usage checks (if accessible)
    run_test "memory_usage" \
        "curl -f -s '$app_url/health' | jq -r '.memory.used' | awk '{if(\$1 < 80) exit 0; else exit 1}'"
    
    run_test "disk_space" \
        "curl -f -s '$app_url/health' | jq -r '.disk.usage' | awk '{if(\$1 < 90) exit 0; else exit 1}'"
}

# Database connectivity tests
run_database_tests() {
    log_section "Database Connectivity Tests"
    
    local app_url
    if [[ -n "$CONFIG_FILE" ]]; then
        app_url="https://truststream-v42-$ENVIRONMENT-app.azurewebsites.net"
    else
        app_url="http://localhost:3000"
    fi
    
    run_test "database_connection" \
        "curl -f -s --max-time 30 '$app_url/api/health/database' | grep -q 'connected'"
    
    run_test "database_query_performance" \
        "test \$(curl -f -s -w '%{time_total}' -o /dev/null '$app_url/api/health/database' | cut -d. -f1) -lt 10"
    
    run_test "database_schema_validation" \
        "curl -f -s '$app_url/api/health/database' | jq -r '.schema_version' | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$'"
    
    # Test critical tables exist
    run_test "critical_tables_exist" \
        "curl -f -s '$app_url/api/health/database' | jq -r '.tables[]' | grep -q 'ai_agents'"
}

# API endpoint tests
run_api_tests() {
    log_section "API Endpoint Tests"
    
    local app_url
    if [[ -n "$CONFIG_FILE" ]]; then
        app_url="https://truststream-v42-$ENVIRONMENT-app.azurewebsites.net"
    else
        app_url="http://localhost:3000"
    fi
    
    # Test public endpoints
    run_test "api_health" \
        "curl -f -s --max-time 10 '$app_url/api/health' | grep -q 'ok'"
    
    run_test "api_version" \
        "curl -f -s '$app_url/api/version' | jq -r '.version' | grep -E '^4\.2\.[0-9]+$'"
    
    # Test rate limiting
    run_test "rate_limiting" \
        "for i in {1..110}; do curl -s -o /dev/null -w '%{http_code}' '$app_url/api/health'; done | grep -q '429'"
    
    # Test CORS headers
    run_test "cors_headers" \
        "curl -f -s -H 'Origin: https://example.com' -I '$app_url/api/health' | grep -q 'Access-Control-Allow-Origin'"
    
    # Test security headers
    run_test "security_headers" \
        "curl -f -s -I '$app_url/' | grep -q 'X-Content-Type-Options: nosniff'"
}

# Edge functions tests
run_edge_functions_tests() {
    log_section "Edge Functions Tests"
    
    local supabase_url
    if [[ -n "${SUPABASE_URL:-}" ]]; then
        supabase_url="$SUPABASE_URL"
    else
        log_warn "SUPABASE_URL not set, skipping edge function tests"
        record_test_result "edge_functions_config" "SKIP" "SUPABASE_URL not configured" "0"
        return 0
    fi
    
    # Test edge function endpoints
    local functions=("ai-leader-quality-agent" "ai-leader-accountability-agent" "agent-coordinator-v4")
    
    for func in "${functions[@]}"; do
        run_test "edge_function_$func" \
            "curl -f -s --max-time 30 -X POST '$supabase_url/functions/v1/$func' -H 'Authorization: Bearer ${SUPABASE_ANON_KEY:-}' -H 'Content-Type: application/json' -d '{\"test\": true}' | jq -r '.status' | grep -qE '(ok|success)'"
    done
    
    # Test function performance
    run_test "edge_function_performance" \
        "test \$(curl -f -s -w '%{time_total}' -o /dev/null -X POST '$supabase_url/functions/v1/ai-leader-quality-agent' -H 'Authorization: Bearer ${SUPABASE_ANON_KEY:-}' -H 'Content-Type: application/json' -d '{\"test\": true}' | cut -d. -f1) -lt 30"
}

# Security tests
run_security_tests() {
    log_section "Security Tests"
    
    local app_url
    if [[ -n "$CONFIG_FILE" ]]; then
        app_url="https://truststream-v42-$ENVIRONMENT-app.azurewebsites.net"
    else
        app_url="http://localhost:3000"
    fi
    
    # Test HTTPS redirect
    if [[ "$app_url" == "https://"* ]]; then
        local http_url="${app_url/https/http}"
        run_test "https_redirect" \
            "test \$(curl -s -o /dev/null -w '%{http_code}' '$http_url/health') -eq 301"
    fi
    
    # Test security headers
    run_test "security_header_xss" \
        "curl -f -s -I '$app_url/' | grep -q 'X-XSS-Protection'"
    
    run_test "security_header_frame" \
        "curl -f -s -I '$app_url/' | grep -q 'X-Frame-Options'"
    
    run_test "security_header_content_type" \
        "curl -f -s -I '$app_url/' | grep -q 'X-Content-Type-Options'"
    
    # Test for common vulnerabilities
    run_test "no_server_header_disclosure" \
        "! curl -f -s -I '$app_url/' | grep -i 'server:' | grep -qE '(nginx|apache)/[0-9]'"
    
    run_test "no_sensitive_data_in_headers" \
        "! curl -f -s -I '$app_url/' | grep -qE '(password|token|key|secret)'"
}

# Performance tests
run_performance_tests() {
    log_section "Performance Tests"
    
    local app_url
    if [[ -n "$CONFIG_FILE" ]]; then
        app_url="https://truststream-v42-$ENVIRONMENT-app.azurewebsites.net"
    else
        app_url="http://localhost:3000"
    fi
    
    # Test response times
    run_test "response_time_health" \
        "test \$(curl -f -s -w '%{time_total}' -o /dev/null '$app_url/health' | cut -d. -f1) -lt 2"
    
    run_test "response_time_api" \
        "test \$(curl -f -s -w '%{time_total}' -o /dev/null '$app_url/api/health' | cut -d. -f1) -lt 5"
    
    # Test concurrent requests
    run_test "concurrent_requests" \
        "for i in {1..10}; do (curl -f -s '$app_url/health' > /dev/null) & done; wait"
    
    # Test large payload handling
    run_test "large_payload_handling" \
        "curl -f -s --max-time 30 -X POST '$app_url/api/test' -H 'Content-Type: application/json' -d '\$(head -c 1048576 /dev/zero | tr '\\0' 'x')' > /dev/null"
}

# Integration tests
run_integration_tests() {
    log_section "Integration Tests"
    
    local app_url
    if [[ -n "$CONFIG_FILE" ]]; then
        app_url="https://truststream-v42-$ENVIRONMENT-app.azurewebsites.net"
    else
        app_url="http://localhost:3000"
    fi
    
    # Test full user workflow (if auth is available)
    run_test "user_workflow_test" \
        "curl -f -s '$app_url/api/test/workflow' | jq -r '.status' | grep -q 'success'"
    
    # Test AI agent coordination
    run_test "ai_agent_coordination" \
        "curl -f -s '$app_url/api/agents/test' | jq -r '.agents_responding' | awk '{if(\$1 > 0) exit 0; else exit 1}'"
    
    # Test governance system
    run_test "governance_system" \
        "curl -f -s '$app_url/api/governance/health' | jq -r '.status' | grep -q 'active'"
    
    # Test memory system
    run_test "memory_system" \
        "curl -f -s '$app_url/api/memory/health' | jq -r '.status' | grep -q 'connected'"
}

# Generate test report
generate_report() {
    log_section "Test Results Summary"
    
    local success_rate=0
    if [[ $TOTAL_TESTS -gt 0 ]]; then
        success_rate=$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))
    fi
    
    log_info "Total Tests: $TOTAL_TESTS"
    log_info "Passed: $PASSED_TESTS"
    log_info "Failed: $FAILED_TESTS"
    log_info "Skipped: $SKIPPED_TESTS"
    log_info "Success Rate: ${success_rate}%"
    
    # Generate report file if requested
    if [[ -n "$REPORT_FILE" ]]; then
        case "$OUTPUT_FORMAT" in
            "json")
                generate_json_report
                ;;
            "junit")
                generate_junit_report
                ;;
            *)
                generate_text_report
                ;;
        esac
        
        log_info "Report saved to: $REPORT_FILE"
    fi
    
    # Determine exit code
    if [[ $FAILED_TESTS -gt 0 ]]; then
        if [[ "$FORCE" == "true" ]]; then
            log_warn "Validation completed with failures, but continuing due to --force flag"
            return 0
        else
            log_error "Validation failed with $FAILED_TESTS test failures"
            return 1
        fi
    else
        log_success "All validation tests passed!"
        return 0
    fi
}

# Generate JSON report
generate_json_report() {
    local timestamp
    timestamp="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
    
    cat > "$REPORT_FILE" << EOF
{
  "timestamp": "$timestamp",
  "environment": "$ENVIRONMENT",
  "summary": {
    "total": $TOTAL_TESTS,
    "passed": $PASSED_TESTS,
    "failed": $FAILED_TESTS,
    "skipped": $SKIPPED_TESTS,
    "success_rate": $(( (PASSED_TESTS * 100) / TOTAL_TESTS ))
  },
  "tests": [
EOF
    
    local first=true
    for result in "${TEST_RESULTS[@]}"; do
        IFS='|' read -r name status message duration <<< "$result"
        
        if [[ "$first" == "true" ]]; then
            first=false
        else
            echo "," >> "$REPORT_FILE"
        fi
        
        cat >> "$REPORT_FILE" << EOF
    {
      "name": "$name",
      "status": "$status",
      "message": "$message",
      "duration": $duration
    }EOF
    done
    
    echo "" >> "$REPORT_FILE"
    echo "  ]" >> "$REPORT_FILE"
    echo "}" >> "$REPORT_FILE"
}

# Generate text report
generate_text_report() {
    local timestamp
    timestamp="$(date)"
    
    cat > "$REPORT_FILE" << EOF
TrustStream v4.2 Deployment Validation Report
=============================================

Timestamp: $timestamp
Environment: $ENVIRONMENT
Test Suites: $TEST_SUITES

Summary:
--------
Total Tests: $TOTAL_TESTS
Passed: $PASSED_TESTS
Failed: $FAILED_TESTS
Skipped: $SKIPPED_TESTS
Success Rate: $(( (PASSED_TESTS * 100) / TOTAL_TESTS ))%

Detailed Results:
----------------
EOF
    
    for result in "${TEST_RESULTS[@]}"; do
        IFS='|' read -r name status message duration <<< "$result"
        printf "%-40s %-6s %s (%.2fs)\n" "$name" "$status" "$message" "$duration" >> "$REPORT_FILE"
    done
}

# Generate JUnit XML report
generate_junit_report() {
    local timestamp
    timestamp="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
    
    cat > "$REPORT_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="TrustStream v4.2 Validation" tests="$TOTAL_TESTS" failures="$FAILED_TESTS" skipped="$SKIPPED_TESTS" time="0" timestamp="$timestamp">
  <testsuite name="Deployment Validation" tests="$TOTAL_TESTS" failures="$FAILED_TESTS" skipped="$SKIPPED_TESTS" time="0">
EOF
    
    for result in "${TEST_RESULTS[@]}"; do
        IFS='|' read -r name status message duration <<< "$result"
        
        echo "    <testcase name=\"$name\" time=\"$duration\">" >> "$REPORT_FILE"
        
        case "$status" in
            "FAIL")
                echo "      <failure message=\"$message\"/>" >> "$REPORT_FILE"
                ;;
            "SKIP")
                echo "      <skipped message=\"$message\"/>" >> "$REPORT_FILE"
                ;;
        esac
        
        echo "    </testcase>" >> "$REPORT_FILE"
    done
    
    cat >> "$REPORT_FILE" << EOF
  </testsuite>
</testsuites>
EOF
}

# Main function
main() {
    init_validation
    
    # Determine which test suites to run
    local suites_to_run=()
    
    if [[ "$TEST_SUITES" == "all" ]]; then
        suites_to_run=("health" "database" "api" "edge-functions" "security" "performance" "integration")
    else
        IFS=',' read -ra suites_to_run <<< "$TEST_SUITES"
    fi
    
    # Run selected test suites
    for suite in "${suites_to_run[@]}"; do
        case "$suite" in
            "health")
                run_health_tests
                ;;
            "database")
                run_database_tests
                ;;
            "api")
                run_api_tests
                ;;
            "edge-functions")
                run_edge_functions_tests
                ;;
            "security")
                run_security_tests
                ;;
            "performance")
                run_performance_tests
                ;;
            "integration")
                run_integration_tests
                ;;
            *)
                log_warn "Unknown test suite: $suite"
                ;;
        esac
    done
    
    # Generate report and determine exit code
    generate_report
}

# Run main function
main "$@"