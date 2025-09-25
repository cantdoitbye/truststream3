#!/bin/bash

# TrustStram v4.4 Apache Bench Performance Tests
# Comprehensive HTTP load testing using Apache Bench

set -e

# Configuration
BASE_URL="${TEST_BASE_URL:-http://localhost:3000}"
RESULTS_DIR="tests/performance/results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RESULT_FILE="${RESULTS_DIR}/ab_results_${TIMESTAMP}.txt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create results directory
mkdir -p "$RESULTS_DIR"

echo -e "${BLUE}🚀 TrustStram v4.4 Apache Bench Performance Tests${NC}"
echo "================================================================"
echo "Base URL: $BASE_URL"
echo "Results will be saved to: $RESULT_FILE"
echo "Started at: $(date)"
echo "================================================================"

# Initialize results file
{
    echo "# TrustStram v4.4 Apache Bench Performance Test Results"
    echo "Generated: $(date)"
    echo "Base URL: $BASE_URL"
    echo ""
} > "$RESULT_FILE"

# Function to run Apache Bench test
run_ab_test() {
    local endpoint="$1"
    local requests="$2"
    local concurrency="$3"
    local description="$4"
    local method="${5:-GET}"
    local data_file="$6"
    
    echo -e "\n${YELLOW}📊 Testing: $description${NC}"
    echo "   Endpoint: $endpoint"
    echo "   Requests: $requests, Concurrency: $concurrency"
    
    # Build ab command
    local ab_cmd="ab -n $requests -c $concurrency"
    
    # Add method and data if POST
    if [[ "$method" == "POST" && -n "$data_file" ]]; then
        ab_cmd="$ab_cmd -p $data_file -T application/json"
    fi
    
    # Add the URL
    ab_cmd="$ab_cmd ${BASE_URL}${endpoint}"
    
    echo "   Command: $ab_cmd"
    
    # Run the test and capture output
    local start_time=$(date +%s)
    if output=$(eval "$ab_cmd" 2>&1); then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        echo -e "   ${GREEN}✅ Test completed in ${duration}s${NC}"
        
        # Extract key metrics
        local time_per_request=$(echo "$output" | grep "Time per request:" | head -1 | awk '{print $4}')
        local requests_per_second=$(echo "$output" | grep "Requests per second:" | awk '{print $4}')
        local failed_requests=$(echo "$output" | grep "Failed requests:" | awk '{print $3}')
        
        echo "   Time per request: ${time_per_request}ms"
        echo "   Requests per second: $requests_per_second"
        echo "   Failed requests: $failed_requests"
        
        # Append to results file
        {
            echo "## $description"
            echo "**Endpoint:** $endpoint"
            echo "**Method:** $method"
            echo "**Requests:** $requests"
            echo "**Concurrency:** $concurrency"
            echo "**Duration:** ${duration}s"
            echo "**Time per request:** ${time_per_request}ms"
            echo "**Requests per second:** $requests_per_second"
            echo "**Failed requests:** $failed_requests"
            echo ""
            echo "### Detailed Results"
            echo "\`\`\`"
            echo "$output"
            echo "\`\`\`"
            echo ""
        } >> "$RESULT_FILE"
        
    else
        echo -e "   ${RED}❌ Test failed${NC}"
        echo "   Error: $output"
        
        # Append error to results file
        {
            echo "## $description - FAILED"
            echo "**Error:** $output"
            echo ""
        } >> "$RESULT_FILE"
    fi
}

# Create test data files for POST requests
echo -e "\n${BLUE}📝 Creating test data files...${NC}"
mkdir -p "$RESULTS_DIR/data"

# Federated Learning test data
cat > "$RESULTS_DIR/data/federated_learning.json" << 'EOF'
{
  "model_config": {
    "architecture": "simple_cnn",
    "input_shape": [28, 28, 1],
    "num_classes": 10
  },
  "data_config": {
    "dataset": "mnist",
    "batch_size": 32
  },
  "num_clients": 10,
  "num_rounds": 3,
  "scenario_type": "cross_device"
}
EOF

# AI Explainability test data
cat > "$RESULTS_DIR/data/explainability.json" << 'EOF'
{
  "model_id": "test-model-001",
  "input_data": {
    "feature1": 0.5,
    "feature2": 0.3,
    "feature3": 0.8
  },
  "explanation_type": "shap",
  "stakeholder_type": "end_user"
}
EOF

# Quantum Encryption test data
cat > "$RESULTS_DIR/data/quantum_encryption.json" << 'EOF'
{
  "operation": "encrypt",
  "algorithm": "ML-KEM-768",
  "data": "Hello, quantum world! This is a test message for encryption."
}
EOF

# Multi-Cloud test data
cat > "$RESULTS_DIR/data/multi_cloud.json" << 'EOF'
{
  "deployment_config": {
    "application": "truststream-test",
    "version": "4.4.0"
  },
  "target_clouds": ["azure", "aws"],
  "cost_optimization": true
}
EOF

echo -e "${GREEN}✅ Test data files created${NC}"

# Basic Health and Status Tests
echo -e "\n${BLUE}🏥 Running Basic Health Tests...${NC}"
run_ab_test "/api/v44/health" 1000 10 "Health Endpoint - Light Load"
run_ab_test "/api/v44/health" 5000 50 "Health Endpoint - Medium Load"
run_ab_test "/api/v44/health" 10000 100 "Health Endpoint - Heavy Load"

run_ab_test "/api/v44/status" 1000 10 "Status Endpoint - Light Load"
run_ab_test "/api/v44/status" 2000 25 "Status Endpoint - Medium Load"

run_ab_test "/api/v44/features" 1000 10 "Features Endpoint - Light Load"
run_ab_test "/api/v44/metrics" 500 10 "Metrics Endpoint - Light Load"

# API Response Time Tests (Target: <35ms)
echo -e "\n${BLUE}⚡ Running API Response Time Tests...${NC}"
run_ab_test "/api/v44/health" 10000 1 "Single User Response Time Test"
run_ab_test "/api/v44/status" 5000 1 "Status Response Time Test"
run_ab_test "/api/v44/features" 5000 1 "Features Response Time Test"

# System Throughput Tests (Target: 52K+ RPS)
echo -e "\n${BLUE}🔥 Running System Throughput Tests...${NC}"
run_ab_test "/api/v44/health" 50000 100 "Throughput Test - 100 concurrent"
run_ab_test "/api/v44/health" 100000 200 "Throughput Test - 200 concurrent"
run_ab_test "/api/v44/health" 150000 300 "Throughput Test - 300 concurrent"
run_ab_test "/api/v44/health" 200000 500 "Throughput Test - 500 concurrent"

# Configuration and Feature Flag Tests
echo -e "\n${BLUE}⚙️ Running Configuration Tests...${NC}"
run_ab_test "/api/v44/config" 1000 10 "Configuration Endpoint"
run_ab_test "/api/v44/feature-flags" 1000 10 "Feature Flags Endpoint"

# POST Request Tests
echo -e "\n${BLUE}📮 Running POST Request Tests...${NC}"

# Test Federated Learning endpoint
run_ab_test "/api/v44/federated-learning/train" 100 5 "Federated Learning Training" "POST" "$RESULTS_DIR/data/federated_learning.json"

# Test AI Explainability endpoint
run_ab_test "/api/v44/explainability/explain" 100 5 "AI Explainability" "POST" "$RESULTS_DIR/data/explainability.json"

# Test Quantum Encryption endpoint
run_ab_test "/api/v44/quantum-encryption/encrypt" 50 3 "Quantum Encryption" "POST" "$RESULTS_DIR/data/quantum_encryption.json"

# Multi-Cloud Tests
echo -e "\n${BLUE}☁️ Running Multi-Cloud Tests...${NC}"
run_ab_test "/api/v44/multi-cloud/deployments" 200 10 "Multi-Cloud Deployments Query"
run_ab_test "/api/v44/multi-cloud/cost-optimization" 100 5 "Cost Optimization Query"

# Stress Tests
echo -e "\n${BLUE}💪 Running Stress Tests...${NC}"
run_ab_test "/api/v44/health" 25000 50 "Sustained Load Test - 5 minutes" 
run_ab_test "/api/v44/health" 100000 1000 "Peak Load Test - 1000 concurrent"
run_ab_test "/api/v44/health" 200000 1500 "Extreme Load Test - 1500 concurrent"

# Memory Pressure Tests
echo -e "\n${BLUE}🧠 Running Memory Pressure Tests...${NC}"
run_ab_test "/api/v44/status" 10000 100 "Memory Pressure - Status Endpoint"
run_ab_test "/api/v44/metrics" 5000 50 "Memory Pressure - Metrics Endpoint"

# Error Rate Tests
echo -e "\n${BLUE}⚠️ Running Error Rate Tests...${NC}"
run_ab_test "/api/v44/nonexistent" 1000 10 "404 Error Rate Test"
run_ab_test "/api/v44/health/invalid" 500 5 "Invalid Endpoint Test"

# Generate summary
echo -e "\n${BLUE}📊 Generating Test Summary...${NC}"

# Extract and analyze results
echo "\n## Performance Summary" >> "$RESULT_FILE"
echo "" >> "$RESULT_FILE"

# Calculate average response times
echo "### Key Metrics Analysis" >> "$RESULT_FILE"
echo "" >> "$RESULT_FILE"

# Search for key metrics in the results
if health_rps=$(grep -A 10 "Health Endpoint - Heavy Load" "$RESULT_FILE" | grep "Requests per second:" | head -1 | awk '{print $4}' | cut -d'[' -f1); then
    echo "- **Health Endpoint RPS (Heavy Load):** $health_rps" >> "$RESULT_FILE"
fi

if single_user_time=$(grep -A 10 "Single User Response Time Test" "$RESULT_FILE" | grep "Time per request:" | head -1 | awk '{print $4}'); then
    echo "- **Single User Response Time:** ${single_user_time}ms" >> "$RESULT_FILE"
fi

if throughput_rps=$(grep -A 10 "Throughput Test - 500 concurrent" "$RESULT_FILE" | grep "Requests per second:" | head -1 | awk '{print $4}' | cut -d'[' -f1); then
    echo "- **Maximum Throughput (500 concurrent):** $throughput_rps RPS" >> "$RESULT_FILE"
fi

echo "" >> "$RESULT_FILE"
echo "### Target Comparison" >> "$RESULT_FILE"
echo "" >> "$RESULT_FILE"
echo "| Metric | Target | Achieved | Status |" >> "$RESULT_FILE"
echo "|--------|--------|----------|--------|" >> "$RESULT_FILE"

# Compare against targets
if [[ -n "$single_user_time" ]]; then
    if (( $(echo "$single_user_time < 35" | bc -l) )); then
        echo "| API Response Time | <35ms | ${single_user_time}ms | ✅ PASS |" >> "$RESULT_FILE"
    else
        echo "| API Response Time | <35ms | ${single_user_time}ms | ❌ FAIL |" >> "$RESULT_FILE"
    fi
fi

if [[ -n "$throughput_rps" ]]; then
    if (( $(echo "$throughput_rps > 52000" | bc -l) )); then
        echo "| System Throughput | >52,000 RPS | $throughput_rps RPS | ✅ PASS |" >> "$RESULT_FILE"
    else
        echo "| System Throughput | >52,000 RPS | $throughput_rps RPS | ❌ FAIL |" >> "$RESULT_FILE"
    fi
fi

echo "" >> "$RESULT_FILE"
echo "### Recommendations" >> "$RESULT_FILE"
echo "" >> "$RESULT_FILE"

# Generate recommendations based on results
if [[ -n "$single_user_time" && $(echo "$single_user_time > 35" | bc -l) -eq 1 ]]; then
    echo "- **API Optimization Needed:** Response times exceed 35ms target" >> "$RESULT_FILE"
    echo "  - Implement response caching" >> "$RESULT_FILE"
    echo "  - Optimize database queries" >> "$RESULT_FILE"
    echo "  - Review critical path performance" >> "$RESULT_FILE"
fi

if [[ -n "$throughput_rps" && $(echo "$throughput_rps < 52000" | bc -l) -eq 1 ]]; then
    echo "- **Throughput Optimization Needed:** RPS below 52,000 target" >> "$RESULT_FILE"
    echo "  - Implement horizontal scaling" >> "$RESULT_FILE"
    echo "  - Optimize connection handling" >> "$RESULT_FILE"
    echo "  - Review application architecture" >> "$RESULT_FILE"
fi

echo "- **Monitoring:** Implement continuous performance monitoring" >> "$RESULT_FILE"
echo "- **Scaling:** Plan for auto-scaling based on load patterns" >> "$RESULT_FILE"
echo "- **Optimization:** Regular performance tuning and optimization" >> "$RESULT_FILE"

echo "" >> "$RESULT_FILE"
echo "---" >> "$RESULT_FILE"
echo "*Apache Bench testing completed on $(date)*" >> "$RESULT_FILE"

echo -e "\n${GREEN}✅ Apache Bench testing completed!${NC}"
echo "Results saved to: $RESULT_FILE"
echo -e "\n${BLUE}📊 Summary:${NC}"
if [[ -n "$single_user_time" ]]; then
    echo "   API Response Time: ${single_user_time}ms (target: <35ms)"
fi
if [[ -n "$throughput_rps" ]]; then
    echo "   Maximum Throughput: $throughput_rps RPS (target: >52,000 RPS)"
fi
echo "   Detailed results: $RESULT_FILE"

echo -e "\n${YELLOW}💡 Next Steps:${NC}"
echo "   1. Review detailed results in $RESULT_FILE"
echo "   2. Run additional tests: siege and custom Node.js tests"
echo "   3. Analyze bottlenecks and implement optimizations"
echo "   4. Re-run tests to validate improvements"
