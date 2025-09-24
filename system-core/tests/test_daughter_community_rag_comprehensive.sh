#!/bin/bash

# Daughter Community RAG Agent - Comprehensive Test Script
# Executes the full test suite for the Daughter Community RAG Management System
# Author: MiniMax Agent
# Created: 2025-09-20 10:30:53

set -e  # Exit on any error

echo "=============================================================="
echo "DAUGHTER COMMUNITY RAG AGENT - COMPREHENSIVE TEST EXECUTION"
echo "=============================================================="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SUPABASE_URL="https://etretluugvclmydzlfte.supabase.co"
TEST_SCRIPT="/workspace/truststream-v4.1-production/tests/daughter_community_rag_comprehensive_test.py"
RESULTS_FILE="/workspace/truststream-v4.1-production/tests/daughter_community_rag_test_results.json"
MIGRATION_FILE="/workspace/truststream-v4.1-production/supabase/migrations/20250920103053_daughter_community_schema.sql"

# Function to print colored output
print_status() {
    case $2 in
        "INFO")
            echo -e "${BLUE}[INFO]${NC} $1"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[SUCCESS]${NC} $1"
            ;;
        "WARNING")
            echo -e "${YELLOW}[WARNING]${NC} $1"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $1"
            ;;
        *)
            echo "$1"
            ;;
    esac
}

# Function to check if Supabase key is provided
check_supabase_key() {
    if [[ -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
        print_status "SUPABASE_SERVICE_ROLE_KEY environment variable not set" "ERROR"
        print_status "Please export your Supabase service role key:" "INFO"
        print_status "export SUPABASE_SERVICE_ROLE_KEY=\"your_key_here\"" "INFO"
        exit 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..." "INFO"
    
    # Check if Python is available
    if ! command -v python3 &> /dev/null; then
        print_status "Python 3 is required but not installed" "ERROR"
        exit 1
    fi
    
    # Check if required Python packages are available
    python3 -c "import requests, json, time, uuid" 2>/dev/null || {
        print_status "Installing required Python packages..." "INFO"
        pip3 install requests
    }
    
    # Check if test script exists
    if [[ ! -f "$TEST_SCRIPT" ]]; then
        print_status "Test script not found: $TEST_SCRIPT" "ERROR"
        exit 1
    fi
    
    # Check if migration file exists
    if [[ ! -f "$MIGRATION_FILE" ]]; then
        print_status "Migration file not found: $MIGRATION_FILE" "WARNING"
        print_status "The database schema may not be set up correctly" "WARNING"
    fi
    
    print_status "Prerequisites check completed" "SUCCESS"
}

# Function to apply database migration if needed
apply_migration() {
    print_status "Checking database schema..." "INFO"
    
    if [[ -f "$MIGRATION_FILE" ]]; then
        print_status "Applying daughter community schema migration..." "INFO"
        
        # Use Supabase CLI if available, otherwise provide instructions
        if command -v supabase &> /dev/null; then
            cd /workspace/truststream-v4.1-production
            supabase db push || {
                print_status "Failed to apply migration automatically" "WARNING"
                print_status "Please apply the migration manually in your Supabase dashboard" "INFO"
                print_status "Migration file: $MIGRATION_FILE" "INFO"
            }
        else
            print_status "Supabase CLI not found. Please apply migration manually:" "WARNING"
            print_status "1. Go to your Supabase dashboard" "INFO"
            print_status "2. Navigate to SQL Editor" "INFO"
            print_status "3. Execute the contents of: $MIGRATION_FILE" "INFO"
            print_status "4. Press Enter to continue when done..." "INFO"
            read -r
        fi
    fi
}

# Function to deploy the daughter community agent if needed
deploy_agent() {
    print_status "Checking if Daughter Community RAG Agent is deployed..." "INFO"
    
    # Test if the agent endpoint is available
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
        -d '{"action":"test"}' \
        "$SUPABASE_URL/functions/v1/daughter-community-rag-agent" || echo "000")
    
    if [[ "$response" == "200" ]] || [[ "$response" == "500" ]]; then
        print_status "Daughter Community RAG Agent is deployed and responding" "SUCCESS"
    else
        print_status "Daughter Community RAG Agent not responding (HTTP: $response)" "WARNING"
        print_status "Please ensure the agent is deployed to Supabase Edge Functions" "INFO"
        print_status "Agent source: /workspace/truststream-v4.1-production/supabase/functions/daughter-community-rag-agent/" "INFO"
    fi
}

# Function to run the comprehensive test suite
run_tests() {
    print_status "Starting comprehensive test execution..." "INFO"
    echo
    
    # Update the test script with the actual Supabase key
    sed -i "s/your_supabase_service_role_key_here/$SUPABASE_SERVICE_ROLE_KEY/g" "$TEST_SCRIPT"
    
    # Run the test suite
    if python3 "$TEST_SCRIPT"; then
        print_status "Test execution completed successfully" "SUCCESS"
        
        # Parse results if available
        if [[ -f "$RESULTS_FILE" ]]; then
            print_status "Analyzing test results..." "INFO"
            
            # Extract key metrics from JSON results
            total_tests=$(python3 -c "import json; data=json.load(open('$RESULTS_FILE')); print(data.get('total_tests', 0))")
            passed_tests=$(python3 -c "import json; data=json.load(open('$RESULTS_FILE')); print(data.get('passed_tests', 0))")
            success_rate=$(python3 -c "import json; data=json.load(open('$RESULTS_FILE')); print(f\"{data.get('overall_success_rate', 0):.1f}\")")
            status=$(python3 -c "import json; data=json.load(open('$RESULTS_FILE')); print(data.get('status', 'UNKNOWN'))")
            production_ready=$(python3 -c "import json; data=json.load(open('$RESULTS_FILE')); print(data.get('production_readiness', False))")
            
            echo
            print_status "=== TEST RESULTS SUMMARY ===" "INFO"
            print_status "Total Tests: $total_tests" "INFO"
            print_status "Passed Tests: $passed_tests" "INFO"
            print_status "Success Rate: $success_rate%" "INFO"
            print_status "Status: $status" "INFO"
            print_status "Production Ready: $production_ready" "INFO"
            
            if [[ "$status" == "PASS" ]]; then
                if [[ "$production_ready" == "True" ]]; then
                    print_status "🚀 DAUGHTER COMMUNITY RAG AGENT IS PRODUCTION READY!" "SUCCESS"
                else
                    print_status "✅ Agent is functional but may need optimization" "SUCCESS"
                fi
                return 0
            else
                print_status "❌ Agent needs attention before production deployment" "ERROR"
                return 1
            fi
        fi
        
    else
        print_status "Test execution failed" "ERROR"
        return 1
    fi
}

# Function to generate test report
generate_report() {
    print_status "Generating test report..." "INFO"
    
    if [[ -f "$RESULTS_FILE" ]]; then
        # Create a human-readable report
        REPORT_FILE="/workspace/truststream-v4.1-production/tests/daughter_community_rag_test_report.md"
        
        cat > "$REPORT_FILE" << EOF
# Daughter Community RAG Management Agent - Test Report

**Generated:** $(date)
**Test Suite:** Comprehensive Hierarchical Community Management Tests

## Overview

This report summarizes the test results for the Daughter Community RAG Management Agent, which enables AI Leaders to autonomously spawn and manage specialized sub-communities within TrustStream.

## Test Results

EOF
        
        # Add JSON results to markdown
        python3 -c "
import json
with open('$RESULTS_FILE', 'r') as f:
    data = json.load(f)
    
print(f'- **Total Tests:** {data.get(\"total_tests\", 0)}')
print(f'- **Passed Tests:** {data.get(\"passed_tests\", 0)}')
print(f'- **Failed Tests:** {data.get(\"failed_tests\", 0)}')
print(f'- **Overall Success Rate:** {data.get(\"overall_success_rate\", 0):.1f}%')
print(f'- **Core Functionality Success Rate:** {data.get(\"core_functionality_success_rate\", 0):.1f}%')
print(f'- **Advanced Capabilities Success Rate:** {data.get(\"advanced_capabilities_success_rate\", 0):.1f}%')
print(f'- **Execution Time:** {data.get(\"execution_time\", 0):.2f} seconds')
print(f'- **Status:** {data.get(\"status\", \"UNKNOWN\")}')
print(f'- **Production Ready:** {data.get(\"production_readiness\", False)}')
print()
print('## Success Criteria Analysis')
print()
criteria = data.get('success_criteria_met', {})
for criterion, met in criteria.items():
    status = '✅' if met else '❌'
    print(f'- {status} **{criterion}**')
print()
print('## Detailed Test Results')
print()
for result in data.get('details', []):
    status = '✅ PASS' if result['success'] else '❌ FAIL'
    print(f'### {result[\"test_name\"]}')
    print(f'- **Status:** {status}')
    if result.get('details'):
        print(f'- **Details:** {result[\"details\"]}')
    print()
" >> "$REPORT_FILE"
        
        print_status "Test report generated: $REPORT_FILE" "SUCCESS"
    else
        print_status "No test results file found to generate report" "WARNING"
    fi
}

# Function to cleanup
cleanup() {
    print_status "Performing cleanup..." "INFO"
    
    # Restore the test script to original state
    sed -i "s/$SUPABASE_SERVICE_ROLE_KEY/your_supabase_service_role_key_here/g" "$TEST_SCRIPT" 2>/dev/null || true
    
    print_status "Cleanup completed" "SUCCESS"
}

# Main execution
main() {
    echo "Starting Daughter Community RAG Agent comprehensive testing..."
    echo
    
    # Trap to ensure cleanup on exit
    trap cleanup EXIT
    
    # Execute test workflow
    check_supabase_key
    check_prerequisites
    apply_migration
    deploy_agent
    
    echo
    print_status "All prerequisites checked. Starting tests..." "INFO"
    echo
    
    if run_tests; then
        generate_report
        echo
        print_status "🎉 Testing completed successfully!" "SUCCESS"
        print_status "The Daughter Community RAG Agent has passed comprehensive testing" "SUCCESS"
        
        # Show next steps
        echo
        print_status "=== NEXT STEPS ===" "INFO"
        print_status "1. Review detailed results in: $RESULTS_FILE" "INFO"
        print_status "2. Check the test report: daughter_community_rag_test_report.md" "INFO"
        print_status "3. Deploy to production environment" "INFO"
        print_status "4. Set up monitoring and alerting" "INFO"
        
        exit 0
    else
        echo
        print_status "❌ Testing failed. Please review the results and fix issues." "ERROR"
        print_status "Detailed results available in: $RESULTS_FILE" "INFO"
        
        exit 1
    fi
}

# Show usage if no arguments
if [[ $# -eq 0 ]]; then
    echo "Usage: $0 [options]"
    echo
    echo "Options:"
    echo "  --help, -h        Show this help message"
    echo "  --skip-migration  Skip database migration check"
    echo "  --skip-deploy     Skip agent deployment check"
    echo
    echo "Environment variables:"
    echo "  SUPABASE_SERVICE_ROLE_KEY  Required: Your Supabase service role key"
    echo
    echo "Example:"
    echo "  export SUPABASE_SERVICE_ROLE_KEY=\"your_key_here\""
    echo "  $0"
    exit 0
fi

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            echo "Daughter Community RAG Agent - Comprehensive Test Script"
            echo
            echo "This script executes a comprehensive test suite for the Daughter Community"
            echo "RAG Management Agent, validating hierarchical community management,"
            echo "objective cascading, and organizational learning capabilities."
            echo
            echo "Usage: $0 [options]"
            echo
            echo "Options:"
            echo "  --help, -h        Show this help message"
            echo "  --skip-migration  Skip database migration check"
            echo "  --skip-deploy     Skip agent deployment check"
            echo
            echo "Environment variables:"
            echo "  SUPABASE_SERVICE_ROLE_KEY  Required: Your Supabase service role key"
            echo
            echo "Test Categories:"
            echo "  - Daughter Community Creation"
            echo "  - Hierarchical Structure Analysis"
            echo "  - Objective Cascading"
            echo "  - Resource Coordination"
            echo "  - Organizational Learning"
            echo "  - Cross-Community Coordination"
            echo "  - Structure Optimization"
            echo "  - Performance Monitoring"
            exit 0
            ;;
        --skip-migration)
            SKIP_MIGRATION=true
            shift
            ;;
        --skip-deploy)
            SKIP_DEPLOY=true
            shift
            ;;
        *)
            print_status "Unknown option: $1" "ERROR"
            exit 1
            ;;
    esac
done

# Execute main function
main