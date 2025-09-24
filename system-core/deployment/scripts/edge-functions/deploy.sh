#!/bin/bash

# TrustStream v4.2 Edge Functions Deployment Script
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
FUNCTIONS_DIR="$ROOT_DIR/supabase/functions"
DRY_RUN=false
VERBOSE=false
FORCE=false
PARALLEL_DEPLOYMENT=true
MAX_PARALLEL_JOBS=5
DEPLOYMENT_TIMEOUT=600
HEALTH_CHECK_TIMEOUT=300
FUNCTIONS_TO_DEPLOY="all"
SKIP_TESTS=false

# Deployment state
DEPLOYED_FUNCTIONS=()
FAILED_FUNCTIONS=()
SKIPPED_FUNCTIONS=()
DEPLOYMENT_START_TIME=0

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
        --functions-dir|-f)
            FUNCTIONS_DIR="$2"
            shift 2
            ;;
        --functions)
            FUNCTIONS_TO_DEPLOY="$2"
            shift 2
            ;;
        --deployment-timeout)
            DEPLOYMENT_TIMEOUT="$2"
            shift 2
            ;;
        --health-check-timeout)
            HEALTH_CHECK_TIMEOUT="$2"
            shift 2
            ;;
        --max-parallel-jobs)
            MAX_PARALLEL_JOBS="$2"
            shift 2
            ;;
        --no-parallel)
            PARALLEL_DEPLOYMENT=false
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
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
TrustStream v4.2 Edge Functions Deployment Script

Usage: $0 [OPTIONS]

Options:
  -e, --environment ENV           Target environment (development|staging|production) [default: development]
  -c, --config FILE              Configuration file path
  -f, --functions-dir DIR        Functions directory [default: supabase/functions]
      --functions LIST           Comma-separated list of functions to deploy (default: all)
      --deployment-timeout SEC   Deployment timeout in seconds [default: 600]
      --health-check-timeout SEC Health check timeout in seconds [default: 300]
      --max-parallel-jobs NUM    Maximum parallel deployment jobs [default: 5]
      --no-parallel             Deploy functions sequentially
      --skip-tests              Skip function testing
      --force                   Force deployment even if tests fail
  -v, --verbose                 Enable verbose logging
      --dry-run                 Show what would be deployed without executing
  -h, --help                    Show this help message

Available Functions:
  - ai-leader-accountability-agent
  - ai-leader-quality-agent
  - ai-leader-transparency-agent
  - ai-leader-efficiency-agent
  - ai-leader-innovation-agent
  - agent-coordinator-v4
  - ai-orchestration-engine
  - ai-memory-manager
  - ai-performance-monitoring

Examples:
  # Deploy all functions to development
  $0 --environment development
  
  # Deploy specific functions to production
  $0 --environment production --functions "ai-leader-quality-agent,agent-coordinator-v4"
  
  # Dry run deployment
  $0 --environment staging --dry-run

EOF
}

# Initialize deployment
init_deployment() {
    log_header "TrustStream v4.2 Edge Functions Deployment"
    log_info "Environment: $ENVIRONMENT"
    log_info "Functions Directory: $FUNCTIONS_DIR"
    log_info "Functions to Deploy: $FUNCTIONS_TO_DEPLOY"
    log_info "Parallel Deployment: $PARALLEL_DEPLOYMENT"
    
    if [[ -n "$CONFIG_FILE" ]]; then
        log_info "Loading configuration: $CONFIG_FILE"
        load_config "$CONFIG_FILE" "$ENVIRONMENT"
    fi
    
    # Validate functions directory
    if [[ ! -d "$FUNCTIONS_DIR" ]]; then
        log_error "Functions directory not found: $FUNCTIONS_DIR"
        exit 1
    fi
    
    # Record deployment start time
    DEPLOYMENT_START_TIME="$(date +%s)"
    
    # Set up cleanup trap
    trap cleanup_on_error EXIT
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."
    
    # Check Supabase CLI
    if ! command_exists supabase; then
        log_error "Supabase CLI is not installed"
        log_error "Install it from: https://supabase.com/docs/guides/cli"
        exit 1
    fi
    
    # Check Deno (required for edge functions)
    if ! command_exists deno; then
        log_error "Deno is not installed"
        log_error "Install it from: https://deno.land/"
        exit 1
    fi
    
    # Check required environment variables
    local required_vars=("SUPABASE_PROJECT_REF" "SUPABASE_ACCESS_TOKEN")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log_error "Required environment variable '$var' is not set"
            exit 1
        fi
    done
    
    # Test Supabase authentication
    if [[ "$DRY_RUN" != "true" ]]; then
        log_info "Testing Supabase authentication..."
        if supabase projects list >/dev/null 2>&1; then
            log_success "Supabase authentication successful"
        else
            log_error "Supabase authentication failed"
            log_error "Make sure SUPABASE_ACCESS_TOKEN is valid"
            exit 1
        fi
    fi
    
    log_success "Prerequisites check passed"
}

# Get list of functions to deploy
get_functions_list() {
    log_step "Getting functions list..."
    
    local functions_list=()
    
    if [[ "$FUNCTIONS_TO_DEPLOY" == "all" ]]; then
        # Get all function directories
        while IFS= read -r -d '' dir; do
            local func_name
            func_name="$(basename "$dir")"
            
            # Skip shared directory and hidden directories
            if [[ "$func_name" != "_shared" && "$func_name" != .* ]]; then
                functions_list+=("$func_name")
            fi
        done < <(find "$FUNCTIONS_DIR" -maxdepth 1 -type d -print0)
    else
        # Parse comma-separated list
        IFS=',' read -ra functions_list <<< "$FUNCTIONS_TO_DEPLOY"
    fi
    
    # Validate functions exist
    local valid_functions=()
    for func in "${functions_list[@]}"; do
        # Trim whitespace
        func="$(echo "$func" | tr -d '[:space:]')"
        
        if [[ -d "$FUNCTIONS_DIR/$func" ]]; then
            valid_functions+=("$func")
        else
            log_warn "Function directory not found: $func"
            SKIPPED_FUNCTIONS+=("$func")
        fi
    done
    
    FUNCTIONS_LIST=("${valid_functions[@]}")
    
    log_info "Found ${#FUNCTIONS_LIST[@]} functions to deploy"
    
    if [[ "$VERBOSE" == "true" ]]; then
        for func in "${FUNCTIONS_LIST[@]}"; do
            log_debug "  - $func"
        done
    fi
    
    if [[ ${#FUNCTIONS_LIST[@]} -eq 0 ]]; then
        log_warn "No functions to deploy"
        return 0
    fi
}

# Prepare function for deployment
prepare_function() {
    local function_name="$1"
    local function_dir="$FUNCTIONS_DIR/$function_name"
    
    log_debug "Preparing function: $function_name"
    
    # Check for required files
    if [[ ! -f "$function_dir/index.ts" ]]; then
        log_error "Function index.ts not found: $function_name"
        return 1
    fi
    
    # Check for deno.json or deno.jsonc
    if [[ ! -f "$function_dir/deno.json" && ! -f "$function_dir/deno.jsonc" ]]; then
        log_debug "Creating default deno.json for $function_name"
        
        cat > "$function_dir/deno.json" << 'EOF'
{
  "tasks": {
    "start": "deno run --allow-all index.ts"
  },
  "imports": {
    "std/": "https://deno.land/std@0.208.0/",
    "cors": "https://deno.land/x/cors@v1.2.2/mod.ts"
  }
}
EOF
    fi
    
    # Validate TypeScript syntax
    if [[ "$DRY_RUN" != "true" ]]; then
        log_debug "Validating TypeScript syntax for $function_name"
        if ! deno check "$function_dir/index.ts" >/dev/null 2>&1; then
            log_error "TypeScript validation failed for $function_name"
            return 1
        fi
    fi
    
    return 0
}

# Test function locally
test_function() {
    local function_name="$1"
    
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log_debug "Skipping tests for $function_name"
        return 0
    fi
    
    log_debug "Testing function: $function_name"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_debug "[DRY RUN] Would test function: $function_name"
        return 0
    fi
    
    # Start local Supabase if not running
    if ! supabase status | grep -q "supabase_edge_runtime.*RUNNING"; then
        log_debug "Starting local Supabase for testing..."
        supabase start --workdir "$ROOT_DIR" >/dev/null 2>&1 || true
    fi
    
    # Deploy function locally for testing
    log_debug "Deploying function locally for testing: $function_name"
    
    cd "$ROOT_DIR"
    if supabase functions deploy "$function_name" --local >/dev/null 2>&1; then
        # Test function with a simple request
        local test_url="http://localhost:54321/functions/v1/$function_name"
        
        log_debug "Testing function endpoint: $test_url"
        
        # Simple health check
        local response
        response="$(curl -f -s --max-time 10 \
            -X POST "$test_url" \
            -H "Authorization: Bearer $(supabase status | grep 'anon key' | awk '{print $3}')" \
            -H "Content-Type: application/json" \
            -d '{"test": true}' 2>/dev/null || echo "")"
        
        if [[ -n "$response" ]]; then
            log_debug "Function test passed: $function_name"
            return 0
        else
            log_warn "Function test failed (no response): $function_name"
            return 1
        fi
    else
        log_warn "Failed to deploy function locally for testing: $function_name"
        return 1
    fi
}

# Deploy single function
deploy_function() {
    local function_name="$1"
    
    log_info "Deploying function: $function_name"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would deploy function: $function_name"
        DEPLOYED_FUNCTIONS+=("$function_name")
        return 0
    fi
    
    local start_time
    start_time="$(date +%s)"
    
    # Prepare function
    if ! prepare_function "$function_name"; then
        log_error "Failed to prepare function: $function_name"
        FAILED_FUNCTIONS+=("$function_name")
        return 1
    fi
    
    # Test function
    if ! test_function "$function_name"; then
        if [[ "$FORCE" == "true" ]]; then
            log_warn "Function test failed, but continuing due to --force flag: $function_name"
        else
            log_error "Function test failed: $function_name"
            FAILED_FUNCTIONS+=("$function_name")
            return 1
        fi
    fi
    
    # Deploy to Supabase
    log_debug "Deploying to Supabase: $function_name"
    
    cd "$ROOT_DIR"
    
    # Set project reference
    if ! supabase link --project-ref "$SUPABASE_PROJECT_REF" >/dev/null 2>&1; then
        log_error "Failed to link Supabase project: $function_name"
        FAILED_FUNCTIONS+=("$function_name")
        return 1
    fi
    
    # Deploy function with timeout
    local deploy_output
    if deploy_output="$(timeout "$DEPLOYMENT_TIMEOUT" supabase functions deploy "$function_name" 2>&1)"; then
        local end_time
        end_time="$(date +%s)"
        local duration=$((end_time - start_time))
        
        DEPLOYED_FUNCTIONS+=("$function_name")
        log_success "Function deployed successfully in ${duration}s: $function_name"
        
        if [[ "$VERBOSE" == "true" ]]; then
            log_debug "Deploy output: $deploy_output"
        fi
        
        return 0
    else
        local exit_code=$?
        log_error "Function deployment failed: $function_name"
        
        if [[ "$VERBOSE" == "true" ]]; then
            log_error "Deploy output: $deploy_output"
        fi
        
        FAILED_FUNCTIONS+=("$function_name")
        return $exit_code
    fi
}

# Health check deployed function
health_check_function() {
    local function_name="$1"
    
    log_debug "Health checking function: $function_name"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_debug "[DRY RUN] Would health check function: $function_name"
        return 0
    fi
    
    # Get function URL
    local function_url
    if [[ -n "${SUPABASE_URL:-}" ]]; then
        function_url="$SUPABASE_URL/functions/v1/$function_name"
    else
        function_url="https://$SUPABASE_PROJECT_REF.supabase.co/functions/v1/$function_name"
    fi
    
    log_debug "Health checking: $function_url"
    
    # Wait for function to be available and perform health check
    local health_check_start
    health_check_start="$(date +%s)"
    
    while true; do
        local current_time
        current_time="$(date +%s)"
        local elapsed=$((current_time - health_check_start))
        
        if [[ $elapsed -ge $HEALTH_CHECK_TIMEOUT ]]; then
            log_warn "Health check timeout for function: $function_name"
            return 1
        fi
        
        # Perform health check request
        local response
        response="$(curl -f -s --max-time 10 \
            -X POST "$function_url" \
            -H "Authorization: Bearer ${SUPABASE_ANON_KEY:-${SUPABASE_SERVICE_ROLE_KEY:-}}" \
            -H "Content-Type: application/json" \
            -d '{"test": true}' 2>/dev/null || echo "")"
        
        if [[ -n "$response" ]]; then
            log_debug "Health check passed: $function_name"
            return 0
        fi
        
        # Wait before retry
        sleep 5
    done
}

# Deploy functions in parallel
deploy_functions_parallel() {
    log_step "Deploying functions in parallel..."
    
    local pids=()
    local active_jobs=0
    local function_index=0
    
    for function_name in "${FUNCTIONS_LIST[@]}"; do
        # Wait if we've reached max parallel jobs
        while [[ $active_jobs -ge $MAX_PARALLEL_JOBS ]]; do
            wait_for_job_completion pids active_jobs
        done
        
        # Start deployment in background
        log_debug "Starting parallel deployment: $function_name"
        (
            deploy_function "$function_name"
            echo $? > "/tmp/deploy_result_$function_name"
        ) &
        
        local pid=$!
        pids+=($pid)
        active_jobs=$((active_jobs + 1))
        
        # Progress indicator
        function_index=$((function_index + 1))
        log_progress "$function_index" "${#FUNCTIONS_LIST[@]}" "Starting deployments"
    done
    
    # Wait for all jobs to complete
    log_info "Waiting for all deployments to complete..."
    wait
    
    # Collect results
    for function_name in "${FUNCTIONS_LIST[@]}"; do
        local result_file="/tmp/deploy_result_$function_name"
        if [[ -f "$result_file" ]]; then
            local exit_code
            exit_code="$(cat "$result_file")"
            rm -f "$result_file"
            
            if [[ $exit_code -ne 0 ]]; then
                log_debug "Parallel deployment failed: $function_name (exit code: $exit_code)"
            fi
        fi
    done
}

# Deploy functions sequentially
deploy_functions_sequential() {
    log_step "Deploying functions sequentially..."
    
    local function_index=0
    
    for function_name in "${FUNCTIONS_LIST[@]}"; do
        function_index=$((function_index + 1))
        log_progress "$function_index" "${#FUNCTIONS_LIST[@]}" "Deploying functions"
        
        deploy_function "$function_name"
    done
}

# Wait for job completion (helper for parallel deployment)
wait_for_job_completion() {
    local -n pids_ref=$1
    local -n active_jobs_ref=$2
    
    # Check if any job has completed
    local new_pids=()
    for pid in "${pids_ref[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            new_pids+=("$pid")
        else
            active_jobs_ref=$((active_jobs_ref - 1))
        fi
    done
    
    pids_ref=("${new_pids[@]}")
    
    # If no jobs completed, wait a bit
    if [[ ${#new_pids[@]} -eq ${#pids_ref[@]} ]]; then
        sleep 1
    fi
}

# Health check all deployed functions
health_check_all_functions() {
    if [[ ${#DEPLOYED_FUNCTIONS[@]} -eq 0 ]]; then
        log_info "No functions deployed, skipping health checks"
        return 0
    fi
    
    log_step "Performing health checks on deployed functions..."
    
    local health_check_failures=()
    
    for function_name in "${DEPLOYED_FUNCTIONS[@]}"; do
        if health_check_function "$function_name"; then
            log_success "Health check passed: $function_name"
        else
            log_warn "Health check failed: $function_name"
            health_check_failures+=("$function_name")
        fi
    done
    
    if [[ ${#health_check_failures[@]} -gt 0 ]]; then
        log_warn "Health check failures detected for ${#health_check_failures[@]} functions"
        
        if [[ "$FORCE" != "true" ]]; then
            log_error "Health check failures detected. Use --force to ignore."
            return 1
        fi
    else
        log_success "All deployed functions passed health checks"
    fi
}

# Generate deployment report
generate_deployment_report() {
    log_section "Edge Functions Deployment Summary"
    
    local end_time
    end_time="$(date +%s)"
    local total_duration=$((end_time - DEPLOYMENT_START_TIME))
    
    log_info "Environment: $ENVIRONMENT"
    log_info "Total Duration: ${total_duration}s"
    log_info "Functions Deployed: ${#DEPLOYED_FUNCTIONS[@]}"
    log_info "Functions Failed: ${#FAILED_FUNCTIONS[@]}"
    log_info "Functions Skipped: ${#SKIPPED_FUNCTIONS[@]}"
    
    if [[ "$VERBOSE" == "true" ]]; then
        if [[ ${#DEPLOYED_FUNCTIONS[@]} -gt 0 ]]; then
            log_info "Successfully Deployed:"
            for func in "${DEPLOYED_FUNCTIONS[@]}"; do
                log_info "  ✓ $func"
            done
        fi
        
        if [[ ${#FAILED_FUNCTIONS[@]} -gt 0 ]]; then
            log_info "Failed Deployments:"
            for func in "${FAILED_FUNCTIONS[@]}"; do
                log_info "  ✗ $func"
            done
        fi
        
        if [[ ${#SKIPPED_FUNCTIONS[@]} -gt 0 ]]; then
            log_info "Skipped Functions:"
            for func in "${SKIPPED_FUNCTIONS[@]}"; do
                log_info "  - $func"
            done
        fi
    fi
    
    # Show function URLs
    if [[ ${#DEPLOYED_FUNCTIONS[@]} -gt 0 && "$DRY_RUN" != "true" ]]; then
        log_info "Function URLs:"
        for func in "${DEPLOYED_FUNCTIONS[@]}"; do
            local function_url
            if [[ -n "${SUPABASE_URL:-}" ]]; then
                function_url="$SUPABASE_URL/functions/v1/$func"
            else
                function_url="https://$SUPABASE_PROJECT_REF.supabase.co/functions/v1/$func"
            fi
            log_info "  $func: $function_url"
        done
    fi
}

# Cleanup on error
cleanup_on_error() {
    local exit_code=$?
    
    if [[ $exit_code -ne 0 ]]; then
        log_error "Edge functions deployment failed with exit code: $exit_code"
        
        # Kill any remaining background jobs
        jobs -p | xargs -r kill 2>/dev/null || true
        
        # Clean up temporary files
        rm -f /tmp/deploy_result_* 2>/dev/null || true
    fi
    
    # Remove trap to avoid recursion
    trap - EXIT
}

# Main function
main() {
    init_deployment
    check_prerequisites
    get_functions_list
    
    if [[ ${#FUNCTIONS_LIST[@]} -gt 0 ]]; then
        # Deploy functions
        if [[ "$PARALLEL_DEPLOYMENT" == "true" && ${#FUNCTIONS_LIST[@]} -gt 1 ]]; then
            deploy_functions_parallel
        else
            deploy_functions_sequential
        fi
        
        # Health check deployed functions
        health_check_all_functions
        
        # Generate report
        generate_deployment_report
        
        # Determine exit code
        if [[ ${#FAILED_FUNCTIONS[@]} -gt 0 ]]; then
            if [[ "$FORCE" == "true" ]]; then
                log_warn "Deployment completed with failures, but continuing due to --force flag"
                log_success "Edge functions deployment completed!"
            else
                log_error "Edge functions deployment failed for ${#FAILED_FUNCTIONS[@]} functions"
                exit 1
            fi
        else
            log_success "All edge functions deployed successfully!"
        fi
    else
        log_info "No functions to deploy"
    fi
}

# Run main function
main "$@"