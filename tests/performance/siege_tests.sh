#!/bin/bash

# TrustStram v4.4 Siege Performance Tests
# Advanced HTTP load testing with realistic user simulation

set -e

# Configuration
BASE_URL="${TEST_BASE_URL:-http://localhost:3000}"
RESULTS_DIR="tests/performance/results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RESULT_FILE="${RESULTS_DIR}/siege_results_${TIMESTAMP}.txt"
URL_FILE="${RESULTS_DIR}/siege_urls.txt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create results directory
mkdir -p "$RESULTS_DIR"

echo -e "${BLUE}🏰 TrustStram v4.4 Siege Performance Tests${NC}"
echo "================================================================"
echo "Base URL: $BASE_URL"
echo "Results will be saved to: $RESULT_FILE"
echo "Started at: $(date)"
echo "================================================================"

# Initialize results file
{
    echo "# TrustStram v4.4 Siege Performance Test Results"
    echo "Generated: $(date)"
    echo "Base URL: $BASE_URL"
    echo ""
} > "$RESULT_FILE"

# Create URL list for siege testing
echo -e "\n${BLUE}📝 Creating URL test list...${NC}"
cat > "$URL_FILE" << EOF
${BASE_URL}/api/v44/health
${BASE_URL}/api/v44/status
${BASE_URL}/api/v44/features
${BASE_URL}/api/v44/metrics
${BASE_URL}/api/v44/config
${BASE_URL}/api/v44/feature-flags
${BASE_URL}/api/v44/multi-cloud/deployments
${BASE_URL}/api/v44/multi-cloud/cost-optimization
EOF

echo -e "${GREEN}✅ URL list created with $(wc -l < "$URL_FILE") endpoints${NC}"

# Function to run siege test
run_siege_test() {
    local test_name="$1"
    local users="$2"
    local time="$3"
    local delay="$4"
    local url_file="$5"
    local extra_params="$6"
    
    echo -e "\n${YELLOW}🏰 Testing: $test_name${NC}"
    echo "   Users: $users"
    echo "   Duration: $time"
    echo "   Delay: $delay seconds"
    
    # Build siege command
    local siege_cmd="siege"
    
    if [[ -n "$users" ]]; then
        siege_cmd="$siege_cmd -c $users"
    fi
    
    if [[ -n "$time" ]]; then
        siege_cmd="$siege_cmd -t $time"
    fi
    
    if [[ -n "$delay" ]]; then
        siege_cmd="$siege_cmd -d $delay"
    fi
    
    if [[ -n "$extra_params" ]]; then
        siege_cmd="$siege_cmd $extra_params"
    fi
    
    # Add URL file or specific URL
    if [[ -n "$url_file" ]]; then
        siege_cmd="$siege_cmd -f $url_file"
    fi
    
    echo "   Command: $siege_cmd"
    
    # Run the test and capture output
    local start_time=$(date +%s)
    if output=$(eval "$siege_cmd" 2>&1); then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        echo -e "   ${GREEN}✅ Test completed in ${duration}s${NC}"
        
        # Extract key metrics from siege output
        local transactions=$(echo "$output" | grep "Transactions:" | awk '{print $2}')
        local availability=$(echo "$output" | grep "Availability:" | awk '{print $2}')
        local elapsed_time=$(echo "$output" | grep "Elapsed time:" | awk '{print $3}')
        local data_transferred=$(echo "$output" | grep "Data transferred:" | awk '{print $3 " " $4}')
        local response_time=$(echo "$output" | grep "Response time:" | awk '{print $3}')
        local transaction_rate=$(echo "$output" | grep "Transaction rate:" | awk '{print $3}')
        local throughput=$(echo "$output" | grep "Throughput:" | awk '{print $2}')
        local concurrency=$(echo "$output" | grep "Concurrency:" | awk '{print $2}')
        local successful_transactions=$(echo "$output" | grep "Successful transactions:" | awk '{print $3}')
        local failed_transactions=$(echo "$output" | grep "Failed transactions:" | awk '{print $3}')
        local longest_transaction=$(echo "$output" | grep "Longest transaction:" | awk '{print $3}')
        local shortest_transaction=$(echo "$output" | grep "Shortest transaction:" | awk '{print $3}')
        
        echo "   Transactions: $transactions"
        echo "   Availability: $availability"
        echo "   Response time: ${response_time}s"
        echo "   Transaction rate: $transaction_rate trans/sec"
        echo "   Throughput: $throughput MB/sec"
        
        # Append to results file
        {
            echo "## $test_name"
            echo "**Test Configuration:**"
            echo "- Users: $users"
            echo "- Duration: $time"
            echo "- Delay: $delay seconds"
            echo "- Command: \`$siege_cmd\`"
            echo ""
            echo "**Results:**"
            echo "- **Transactions:** $transactions"
            echo "- **Availability:** $availability"
            echo "- **Elapsed Time:** $elapsed_time"
            echo "- **Data Transferred:** $data_transferred"
            echo "- **Response Time:** ${response_time}s"
            echo "- **Transaction Rate:** $transaction_rate trans/sec"
            echo "- **Throughput:** $throughput MB/sec"
            echo "- **Concurrency:** $concurrency"
            echo "- **Successful Transactions:** $successful_transactions"
            echo "- **Failed Transactions:** $failed_transactions"
            echo "- **Longest Transaction:** ${longest_transaction}s"
            echo "- **Shortest Transaction:** ${shortest_transaction}s"
            echo ""
            echo "### Detailed Output"
            echo "\`\`\`"
            echo "$output"
            echo "\`\`\`"
            echo ""
        } >> "$RESULT_FILE"
        
        # Store metrics for analysis
        echo "${test_name},${users},${time},${transactions},${availability},${response_time},${transaction_rate},${throughput}" >> "${RESULTS_DIR}/siege_metrics.csv"
        
    else
        echo -e "   ${RED}❌ Test failed${NC}"
        echo "   Error: $output"
        
        # Append error to results file
        {
            echo "## $test_name - FAILED"
            echo "**Error:** $output"
            echo ""
        } >> "$RESULT_FILE"
    fi
}

# Initialize CSV file for metrics
echo "Test Name,Users,Duration,Transactions,Availability,Response Time,Transaction Rate,Throughput" > "${RESULTS_DIR}/siege_metrics.csv"

# Basic Load Tests
echo -e "\n${BLUE}📊 Running Basic Load Tests...${NC}"
run_siege_test "Light Load Test" "10" "30s" "1" "$URL_FILE"
run_siege_test "Medium Load Test" "25" "60s" "2" "$URL_FILE"
run_siege_test "Heavy Load Test" "50" "120s" "1" "$URL_FILE"

# Stress Tests
echo -e "\n${BLUE}💪 Running Stress Tests...${NC}"
run_siege_test "High Concurrency Test" "100" "60s" "0" "$URL_FILE"
run_siege_test "Peak Load Test" "200" "30s" "0" "$URL_FILE"
run_siege_test "Extreme Load Test" "500" "60s" "0" "$URL_FILE"

# Endurance Tests
echo -e "\n${BLUE}⏱️ Running Endurance Tests...${NC}"
run_siege_test "5-Minute Endurance" "25" "300s" "2" "$URL_FILE"
run_siege_test "10-Minute Endurance" "50" "600s" "3" "$URL_FILE"

# Realistic User Simulation
echo -e "\n${BLUE}👥 Running Realistic User Simulations...${NC}"
run_siege_test "Realistic User Pattern 1" "15" "180s" "5" "$URL_FILE"
run_siege_test "Realistic User Pattern 2" "30" "300s" "8" "$URL_FILE"
run_siege_test "Peak Hour Simulation" "75" "600s" "3" "$URL_FILE"

# Individual Endpoint Tests
echo -e "\n${BLUE}🎯 Running Individual Endpoint Tests...${NC}"

# Health endpoint specific tests
run_siege_test "Health Endpoint - High Load" "100" "60s" "0" "" "${BASE_URL}/api/v44/health"
run_siege_test "Status Endpoint - Medium Load" "50" "60s" "1" "" "${BASE_URL}/api/v44/status"
run_siege_test "Features Endpoint - Light Load" "25" "60s" "2" "" "${BASE_URL}/api/v44/features"
run_siege_test "Metrics Endpoint - Light Load" "20" "60s" "3" "" "${BASE_URL}/api/v44/metrics"

# Burst Tests
echo -e "\n${BLUE}💥 Running Burst Tests...${NC}"
run_siege_test "Quick Burst Test" "200" "15s" "0" "$URL_FILE"
run_siege_test "Medium Burst Test" "150" "30s" "0" "$URL_FILE"
run_siege_test "Sustained Burst" "100" "120s" "0" "$URL_FILE"

# Benchmark Tests (for comparison)
echo -e "\n${BLUE}📈 Running Benchmark Tests...${NC}"
run_siege_test "Benchmark - No Delay" "50" "60s" "0" "$URL_FILE"
run_siege_test "Benchmark - 1s Delay" "50" "60s" "1" "$URL_FILE"
run_siege_test "Benchmark - 5s Delay" "50" "60s" "5" "$URL_FILE"

# Response Time Tests
echo -e "\n${BLUE}⚡ Running Response Time Tests...${NC}"
run_siege_test "Response Time - Single User" "1" "60s" "0" "$URL_FILE"
run_siege_test "Response Time - 10 Users" "10" "60s" "0" "$URL_FILE"
run_siege_test "Response Time - 100 Users" "100" "60s" "0" "$URL_FILE"

# Internet Simulation (with higher delays)
echo -e "\n${BLUE}🌐 Running Internet Simulation Tests...${NC}"
run_siege_test "Slow Internet Simulation" "25" "180s" "10" "$URL_FILE"
run_siege_test "Mobile Internet Simulation" "15" "300s" "15" "$URL_FILE"

# Generate comprehensive analysis
echo -e "\n${BLUE}📊 Generating Comprehensive Analysis...${NC}"

# Analyze CSV data and generate summary
if [[ -f "${RESULTS_DIR}/siege_metrics.csv" ]]; then
    echo "\n## Performance Analysis" >> "$RESULT_FILE"
    echo "" >> "$RESULT_FILE"
    
    # Calculate averages and find best/worst performance
    awk -F',' 'NR>1 {
        if($4 != "" && $4 != "Failed") {
            trans_sum += $4; trans_count++;
        }
        if($5 != "" && $5 != "0.00%") {
            avail_sum += substr($5,1,length($5)-1); avail_count++;
        }
        if($6 != "" && $6 != "0.00") {
            resp_sum += $6; resp_count++;
            if(resp_min == "" || $6 < resp_min) resp_min = $6;
            if(resp_max == "" || $6 > resp_max) resp_max = $6;
        }
        if($7 != "" && $7 != "0.00") {
            rate_sum += $7; rate_count++;
            if(rate_max == "" || $7 > rate_max) rate_max = $7;
        }
    }
    END {
        if(trans_count > 0) print "- **Average Transactions:** " trans_sum/trans_count;
        if(avail_count > 0) print "- **Average Availability:** " avail_sum/avail_count "%";
        if(resp_count > 0) {
            print "- **Average Response Time:** " resp_sum/resp_count "s";
            print "- **Best Response Time:** " resp_min "s";
            print "- **Worst Response Time:** " resp_max "s";
        }
        if(rate_count > 0) {
            print "- **Average Transaction Rate:** " rate_sum/rate_count " trans/sec";
            print "- **Peak Transaction Rate:** " rate_max " trans/sec";
        }
    }' "${RESULTS_DIR}/siege_metrics.csv" >> "$RESULT_FILE"
    
    echo "" >> "$RESULT_FILE"
    
    # Performance targets analysis
    echo "### Performance Targets Analysis" >> "$RESULT_FILE"
    echo "" >> "$RESULT_FILE"
    echo "| Metric | Target | Best Achieved | Status |" >> "$RESULT_FILE"
    echo "|--------|--------|---------------|--------|" >> "$RESULT_FILE"
    
    # Extract best response time and transaction rate
    best_response=$(awk -F',' 'NR>1 && $6 != "" && $6 != "0.00" { if(min=="" || $6<min) min=$6 } END { if(min!="") print min }' "${RESULTS_DIR}/siege_metrics.csv")
    peak_rate=$(awk -F',' 'NR>1 && $7 != "" && $7 != "0.00" { if(max=="" || $7>max) max=$7 } END { if(max!="") print max }' "${RESULTS_DIR}/siege_metrics.csv")
    
    if [[ -n "$best_response" ]]; then
        response_ms=$(echo "$best_response * 1000" | bc -l | cut -d'.' -f1)
        if [[ $response_ms -lt 35 ]]; then
            echo "| API Response Time | <35ms | ${response_ms}ms | ✅ PASS |" >> "$RESULT_FILE"
        else
            echo "| API Response Time | <35ms | ${response_ms}ms | ❌ FAIL |" >> "$RESULT_FILE"
        fi
    fi
    
    if [[ -n "$peak_rate" ]]; then
        rate_int=$(echo "$peak_rate" | cut -d'.' -f1)
        if [[ $rate_int -gt 52000 ]]; then
            echo "| Transaction Rate | >52,000 trans/sec | $rate_int trans/sec | ✅ PASS |" >> "$RESULT_FILE"
        else
            echo "| Transaction Rate | >52,000 trans/sec | $rate_int trans/sec | ❌ FAIL |" >> "$RESULT_FILE"
        fi
    fi
    
    # Average availability
    avg_availability=$(awk -F',' 'NR>1 && $5 != "" && $5 != "0.00%" { sum += substr($5,1,length($5)-1); count++ } END { if(count>0) print sum/count }' "${RESULTS_DIR}/siege_metrics.csv")
    if [[ -n "$avg_availability" ]]; then
        avail_int=$(echo "$avg_availability" | cut -d'.' -f1)
        if [[ $avail_int -ge 99 ]]; then
            echo "| System Availability | >99% | ${avail_int}% | ✅ PASS |" >> "$RESULT_FILE"
        else
            echo "| System Availability | >99% | ${avail_int}% | ❌ FAIL |" >> "$RESULT_FILE"
        fi
    fi
    
    echo "" >> "$RESULT_FILE"
fi

# Performance recommendations
echo "### Performance Recommendations" >> "$RESULT_FILE"
echo "" >> "$RESULT_FILE"

# Analyze failed tests
failed_tests=$(grep -c "FAILED" "$RESULT_FILE" || echo "0")
if [[ $failed_tests -gt 0 ]]; then
    echo "#### Critical Issues (${failed_tests} failed tests)" >> "$RESULT_FILE"
    echo "- **Immediate Action Required:** $failed_tests tests failed" >> "$RESULT_FILE"
    echo "- Review failed test details above" >> "$RESULT_FILE"
    echo "- Check system resources during failed tests" >> "$RESULT_FILE"
    echo "- Implement error handling and retry mechanisms" >> "$RESULT_FILE"
    echo "" >> "$RESULT_FILE"
fi

# General recommendations
echo "#### Optimization Recommendations" >> "$RESULT_FILE"
echo "" >> "$RESULT_FILE"

# Response time recommendations
if [[ -n "$best_response" ]] && [[ $(echo "$best_response > 0.035" | bc -l) -eq 1 ]]; then
    echo "- **Response Time Optimization:**" >> "$RESULT_FILE"
    echo "  - Implement caching strategies" >> "$RESULT_FILE"
    echo "  - Optimize database queries" >> "$RESULT_FILE"
    echo "  - Review application code for bottlenecks" >> "$RESULT_FILE"
    echo "" >> "$RESULT_FILE"
fi

# Transaction rate recommendations
if [[ -n "$peak_rate" ]] && [[ $(echo "$peak_rate < 52000" | bc -l) -eq 1 ]]; then
    echo "- **Throughput Optimization:**" >> "$RESULT_FILE"
    echo "  - Implement horizontal scaling" >> "$RESULT_FILE"
    echo "  - Optimize connection pooling" >> "$RESULT_FILE"
    echo "  - Consider load balancing improvements" >> "$RESULT_FILE"
    echo "" >> "$RESULT_FILE"
fi

echo "- **Monitoring & Alerting:**" >> "$RESULT_FILE"
echo "  - Implement real-time performance monitoring" >> "$RESULT_FILE"
echo "  - Set up alerts for performance degradation" >> "$RESULT_FILE"
echo "  - Create performance dashboards" >> "$RESULT_FILE"
echo "" >> "$RESULT_FILE"

echo "- **Capacity Planning:**" >> "$RESULT_FILE"
echo "  - Plan for auto-scaling based on load patterns" >> "$RESULT_FILE"
echo "  - Reserve capacity for peak loads" >> "$RESULT_FILE"
echo "  - Regular capacity testing and planning" >> "$RESULT_FILE"
echo "" >> "$RESULT_FILE"

echo "" >> "$RESULT_FILE"
echo "---" >> "$RESULT_FILE"
echo "*Siege testing completed on $(date)*" >> "$RESULT_FILE"
echo "*Total tests run: $(wc -l < "${RESULTS_DIR}/siege_metrics.csv") (excluding header)*" >> "$RESULT_FILE"

echo -e "\n${GREEN}✅ Siege testing completed!${NC}"
echo "Results saved to: $RESULT_FILE"
echo "Metrics CSV: ${RESULTS_DIR}/siege_metrics.csv"

# Display summary
echo -e "\n${BLUE}📊 Test Summary:${NC}"
echo "   Total Tests: $(($(wc -l < "${RESULTS_DIR}/siege_metrics.csv") - 1))"
echo "   Failed Tests: $failed_tests"
if [[ -n "$best_response" ]]; then
    echo "   Best Response Time: $(echo "$best_response * 1000" | bc -l | cut -d'.' -f1)ms"
fi
if [[ -n "$peak_rate" ]]; then
    echo "   Peak Transaction Rate: $(echo "$peak_rate" | cut -d'.' -f1) trans/sec"
fi
if [[ -n "$avg_availability" ]]; then
    echo "   Average Availability: $(echo "$avg_availability" | cut -d'.' -f1)%"
fi

echo -e "\n${YELLOW}💡 Next Steps:${NC}"
echo "   1. Review detailed results in $RESULT_FILE"
echo "   2. Analyze failed tests and performance bottlenecks"
echo "   3. Run database-specific performance tests"
echo "   4. Implement recommended optimizations"
echo "   5. Re-run tests to validate improvements"
