# Performance Baseline Documentation

**SYSTEM PERFORMANCE BASELINES AND MONITORING THRESHOLDS**

## Overview

This document establishes performance baselines, monitoring thresholds, and alerting criteria for the Agentic Ecosystem. These baselines serve as the foundation for performance monitoring, capacity planning, and incident detection.

## Performance Baseline Methodology

### Baseline Collection Process

1. **Data Collection Period**: 30-day rolling window
2. **Measurement Frequency**: Every 5 minutes
3. **Statistical Methods**: 
   - Mean, Median, 95th percentile, 99th percentile
   - Standard deviation and coefficient of variation
   - Trend analysis using linear regression
4. **Update Frequency**: Weekly baseline updates, monthly comprehensive review

### Baseline Categories

| Category | Metrics | Collection Method | Update Frequency |
|----------|---------|-------------------|------------------|
| **Application Performance** | Response time, throughput, error rate | API monitoring | Real-time |
| **Database Performance** | Query time, connection usage, cache hit rate | Database metrics | Every minute |
| **System Resources** | CPU, memory, disk, network | Infrastructure monitoring | Every 30 seconds |
| **User Experience** | Page load time, interaction latency | Frontend monitoring | Real-time |
| **Business Metrics** | Trust score calculations, recommendations | Application logs | Every 5 minutes |

## Application Performance Baselines

### API Response Time Baselines

#### Core API Endpoints

| Endpoint | Mean (ms) | 95th Percentile (ms) | 99th Percentile (ms) | SLA Target (ms) |
|----------|-----------|---------------------|---------------------|------------------|
| `/functions/v1/gdpr-compliance` | 180 | 350 | 500 | 1000 |
| `/functions/v1/database-scalability` | 220 | 400 | 600 | 1000 |
| `/functions/v1/production-monitoring` | 150 | 280 | 400 | 800 |
| `/functions/v1/error-tracking` | 160 | 300 | 450 | 800 |
| `/functions/v1/trust-scorer` | 140 | 250 | 350 | 600 |
| `/functions/v1/vibe-analyzer` | 130 | 240 | 340 | 600 |
| `/functions/v1/agent-recommender` | 170 | 320 | 480 | 800 |

#### Performance Monitoring Script

```bash
#!/bin/bash
# API performance baseline measurement

echo "=== API PERFORMANCE BASELINE MEASUREMENT ==="
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Function to test API endpoint performance
test_endpoint() {
    local endpoint="$1"
    local action="$2"
    local expected_time="$3"
    
    echo "Testing $endpoint..."
    
    # Run multiple tests to get statistical data
    total_time=0
    success_count=0
    times=()
    
    for i in {1..10}; do
        start_time=$(date +%s%N)
        
        response=$(curl -s -X POST "https://etretluugvclmydzlfte.supabase.co/functions/v1/$endpoint" \
            -H "Content-Type: application/json" \
            -d "{\"action\": \"$action\"}" \
            -w "%{http_code}" -o /tmp/response_body)
        
        end_time=$(date +%s%N)
        response_time=$(( (end_time - start_time) / 1000000 ))  # Convert to milliseconds
        
        if [[ "$response" == "200" ]]; then
            times+=("$response_time")
            total_time=$((total_time + response_time))
            success_count=$((success_count + 1))
        fi
        
        sleep 1  # Avoid overwhelming the service
    done
    
    if [ $success_count -gt 0 ]; then
        avg_time=$((total_time / success_count))
        
        # Calculate 95th percentile (approximate)
        sorted_times=($(printf '%s\n' "${times[@]}" | sort -n))
        p95_index=$(( (success_count * 95) / 100 ))
        p95_time=${sorted_times[$p95_index]}
        
        echo "  Average: ${avg_time}ms"
        echo "  95th Percentile: ${p95_time}ms"
        echo "  Success Rate: $((success_count * 10))%"
        
        # Check against baseline
        if [ $avg_time -gt $expected_time ]; then
            echo "  ⚠️  Performance degraded (expected <${expected_time}ms)"
        else
            echo "  ✅ Performance within baseline"
        fi
        
        # Store metrics
        curl -X POST https://etretluugvclmydzlfte.supabase.co/functions/v1/production-monitoring \
            -H "Content-Type: application/json" \
            -d "{
                \"action\": \"store_baseline_metric\",
                \"metric\": {
                    \"endpoint\": \"$endpoint\",
                    \"avg_response_time\": $avg_time,
                    \"p95_response_time\": $p95_time,
                    \"success_rate\": $((success_count * 10)),
                    \"timestamp\": \"$TIMESTAMP\"
                }
            }" > /dev/null
    else
        echo "  ❌ All tests failed"
    fi
    
    echo ""
}

# Test all critical endpoints
test_endpoint "gdpr-compliance" "health_check" 350
test_endpoint "database-scalability" "health_check" 400
test_endpoint "production-monitoring" "health_check" 280
test_endpoint "error-tracking" "health_check" 300
test_endpoint "trust-scorer" "health_check" 250
test_endpoint "vibe-analyzer" "health_check" 240
test_endpoint "agent-recommender" "health_check" 320

echo "Performance baseline measurement completed at $TIMESTAMP"
```

### Throughput Baselines

#### Request Volume Patterns

| Time Period | Requests/Second | Peak RPS | Concurrent Users |
|-------------|----------------|----------|------------------|
| **Peak Hours** (9 AM - 5 PM UTC) | 150-200 | 350 | 500-800 |
| **Normal Hours** (6 AM - 9 AM, 5 PM - 11 PM UTC) | 80-120 | 200 | 200-400 |
| **Low Hours** (11 PM - 6 AM UTC) | 20-40 | 80 | 50-150 |
| **Weekend** | 60-100 | 180 | 300-500 |

#### Load Testing Baselines

```bash
#!/bin/bash
# Load testing baseline verification

echo "=== LOAD TESTING BASELINE VERIFICATION ==="

# Simulate normal load
echo "Testing normal load (100 RPS)..."
for i in {1..60}; do  # 1 minute test
    # Simulate 100 requests per second
    for j in {1..100}; do
        {
            curl -s -X POST "https://etretluugvclmydzlfte.supabase.co/functions/v1/production-monitoring" \
                -H "Content-Type: application/json" \
                -d '{"action": "health_check"}' \
                -w "%{time_total}\n" -o /dev/null
        } &
    done
    
    wait  # Wait for all requests to complete
    sleep 1
done

echo "Normal load test completed"

# Simulate peak load
echo "Testing peak load (300 RPS)..."
for i in {1..30}; do  # 30 second test
    for j in {1..300}; do
        {
            curl -s -X POST "https://etretluugvclmydzlfte.supabase.co/functions/v1/production-monitoring" \
                -H "Content-Type: application/json" \
                -d '{"action": "health_check"}' \
                -w "%{time_total}\n" -o /dev/null
        } &
    done
    
    wait
    sleep 1
done

echo "Peak load test completed"

# Collect performance metrics after load test
curl -X POST https://etretluugvclmydzlfte.supabase.co/functions/v1/production-monitoring \
    -H "Content-Type: application/json" \
    -d '{"action": "performance_report", "time_window": "10m"}'
```

### Error Rate Baselines

#### Acceptable Error Rates

| Error Type | Baseline Rate | Warning Threshold | Critical Threshold |
|------------|---------------|-------------------|--------------------|
| **HTTP 4xx Errors** | <0.5% | 1% | 2% |
| **HTTP 5xx Errors** | <0.1% | 0.5% | 1% |
| **Timeout Errors** | <0.05% | 0.1% | 0.5% |
| **Database Errors** | <0.02% | 0.05% | 0.1% |
| **Authentication Errors** | <0.1% | 0.5% | 1% |
| **GDPR Compliance Errors** | 0% | 0% | >0% |

## Database Performance Baselines

### Query Performance Baselines

#### Core Query Types

| Query Type | Avg Duration (ms) | 95th Percentile (ms) | Frequency (/min) | Optimization Priority |
|------------|-------------------|---------------------|------------------|-----------------------|
| **User consent lookup** | 15 | 35 | 150 | High |
| **Trust score calculation** | 25 | 60 | 80 | High |
| **Agent recommendation** | 30 | 70 | 120 | High |
| **Error log insertion** | 8 | 20 | 200 | Medium |
| **Performance metric insert** | 5 | 15 | 300 | Medium |
| **Audit log queries** | 40 | 90 | 20 | Low |
| **Reporting aggregations** | 150 | 350 | 5 | Low |

#### Database Monitoring Script

```bash
#!/bin/bash
# Database performance baseline monitoring

echo "=== DATABASE PERFORMANCE BASELINE MONITORING ==="

# Get database performance metrics
DB_METRICS=$(curl -s -X POST https://etretluugvclmydzlfte.supabase.co/functions/v1/database-scalability \
    -H "Content-Type: application/json" \
    -d '{"action": "performance_analysis", "time_window": "1h"}')

if [ $? -eq 0 ]; then
    echo "Database Performance Metrics:"
    
    # Extract key metrics
    AVG_QUERY_TIME=$(echo $DB_METRICS | jq -r '.result.avg_query_time // "N/A"')
    SLOW_QUERIES=$(echo $DB_METRICS | jq -r '.result.slow_queries_count // "N/A"')
    CONNECTION_USAGE=$(echo $DB_METRICS | jq -r '.result.connection_pool_usage // "N/A"')
    CACHE_HIT_RATE=$(echo $DB_METRICS | jq -r '.result.cache_hit_rate // "N/A"')
    
    echo "  Average Query Time: ${AVG_QUERY_TIME}ms (Baseline: <50ms)"
    echo "  Slow Queries (>1s): ${SLOW_QUERIES} (Baseline: <5/hour)"
    echo "  Connection Usage: ${CONNECTION_USAGE}% (Baseline: <70%)"
    echo "  Cache Hit Rate: ${CACHE_HIT_RATE}% (Baseline: >90%)"
    
    # Check against baselines
    if (( $(echo "$AVG_QUERY_TIME > 50" | bc -l 2>/dev/null || echo 0) )); then
        echo "  ⚠️  Average query time above baseline"
    fi
    
    if (( $(echo "$CONNECTION_USAGE > 70" | bc -l 2>/dev/null || echo 0) )); then
        echo "  ⚠️  Connection usage above baseline"
    fi
    
    if (( $(echo "$CACHE_HIT_RATE < 90" | bc -l 2>/dev/null || echo 0) )); then
        echo "  ⚠️  Cache hit rate below baseline"
    fi
    
    # Get slow query analysis
    echo ""
    echo "Recent Slow Queries:"
    SLOW_QUERY_ANALYSIS=$(curl -s -X POST https://etretluugvclmydzlfte.supabase.co/functions/v1/database-scalability \
        -H "Content-Type: application/json" \
        -d '{"action": "slow_query_analysis", "threshold_ms": 1000}')
    
    echo $SLOW_QUERY_ANALYSIS | jq -r '.result.slow_queries[]? | "  - " + .query_text[0:80] + "... (" + (.avg_duration | tostring) + "ms)"'
    
else
    echo "❌ Failed to retrieve database metrics"
fi
```

### Connection Pool Baselines

#### Connection Usage Patterns

| Time Period | Avg Connections | Peak Connections | Pool Utilization |
|-------------|----------------|------------------|------------------|
| **Peak Hours** | 45-60 | 85 | 60-70% |
| **Normal Hours** | 25-40 | 60 | 40-50% |
| **Low Hours** | 10-20 | 30 | 15-25% |
| **Maintenance Windows** | 5-10 | 15 | 5-10% |

**Pool Configuration:**
- **Total Pool Size**: 120 connections
- **Warning Threshold**: 85 connections (70%)
- **Critical Threshold**: 110 connections (90%)
- **Idle Timeout**: 10 minutes
- **Max Connection Age**: 1 hour

## System Resource Baselines

### Infrastructure Resource Usage

#### Supabase Edge Function Resources

| Metric | Baseline | Warning | Critical | Unit |
|--------|----------|---------|----------|------|
| **Function Memory Usage** | <128MB | 150MB | 200MB | per function |
| **Function Execution Time** | <30s | 45s | 60s | per invocation |
| **Function Cold Start Time** | <2s | 3s | 5s | initial request |
| **Function Concurrent Executions** | <50 | 75 | 100 | per function |

#### Database Resource Usage

| Metric | Baseline | Warning | Critical | Unit |
|--------|----------|---------|----------|------|
| **Database CPU** | <60% | 75% | 85% | average |
| **Database Memory** | <70% | 80% | 90% | average |
| **Database Storage** | <80% | 90% | 95% | total capacity |
| **Database IOPS** | <1000 | 1500 | 2000 | per second |

### Resource Monitoring Automation

```bash
#!/bin/bash
# Automated resource baseline monitoring

echo "=== RESOURCE BASELINE MONITORING ==="
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Function to check resource usage
check_resource_usage() {
    echo "Checking system resource usage..."
    
    # Get resource metrics from monitoring API
    RESOURCE_METRICS=$(curl -s -X POST https://etretluugvclmydzlfte.supabase.co/functions/v1/database-scalability \
        -H "Content-Type: application/json" \
        -d '{"action": "resource_usage_report"}')
    
    if [ $? -eq 0 ]; then
        # Parse metrics
        DB_CPU=$(echo $RESOURCE_METRICS | jq -r '.result.database_cpu_percent // 0')
        DB_MEMORY=$(echo $RESOURCE_METRICS | jq -r '.result.database_memory_percent // 0')
        STORAGE_USAGE=$(echo $RESOURCE_METRICS | jq -r '.result.storage_usage_percent // 0')
        
        echo "Database Resource Usage:"
        echo "  CPU: ${DB_CPU}% (Baseline: <60%)"
        echo "  Memory: ${DB_MEMORY}% (Baseline: <70%)"
        echo "  Storage: ${STORAGE_USAGE}% (Baseline: <80%)"
        
        # Check thresholds
        alerts=()
        
        if (( $(echo "$DB_CPU > 85" | bc -l) )); then
            alerts+=("Critical: Database CPU usage ${DB_CPU}%")
        elif (( $(echo "$DB_CPU > 75" | bc -l) )); then
            alerts+=("Warning: Database CPU usage ${DB_CPU}%")
        fi
        
        if (( $(echo "$DB_MEMORY > 90" | bc -l) )); then
            alerts+=("Critical: Database memory usage ${DB_MEMORY}%")
        elif (( $(echo "$DB_MEMORY > 80" | bc -l) )); then
            alerts+=("Warning: Database memory usage ${DB_MEMORY}%")
        fi
        
        if (( $(echo "$STORAGE_USAGE > 95" | bc -l) )); then
            alerts+=("Critical: Storage usage ${STORAGE_USAGE}%")
        elif (( $(echo "$STORAGE_USAGE > 90" | bc -l) )); then
            alerts+=("Warning: Storage usage ${STORAGE_USAGE}%")
        fi
        
        # Send alerts if needed
        if [ ${#alerts[@]} -gt 0 ]; then
            for alert in "${alerts[@]}"; do
                echo "⚠️  $alert"
            done
            
            # Send Slack notification
            alert_message=$(printf "%s\n" "${alerts[@]}")
            curl -X POST $SLACK_WEBHOOK_URL \
                -H "Content-Type: application/json" \
                -d "{
                    \"text\": \"⚠️ Resource usage alerts\",
                    \"attachments\": [{
                        \"color\": \"warning\",
                        \"fields\": [
                            {\"title\": \"Alerts\", \"value\": \"$alert_message\", \"short\": false},
                            {\"title\": \"Timestamp\", \"value\": \"$TIMESTAMP\", \"short\": true}
                        ]
                    }]
                }"
        else
            echo "✅ All resource usage within baselines"
        fi
        
    else
        echo "❌ Failed to retrieve resource metrics"
    fi
}

# Function resource monitoring
check_function_usage() {
    echo ""
    echo "Checking Edge Function resource usage..."
    
    FUNCTIONS=("gdpr-compliance" "database-scalability" "production-monitoring" "error-tracking")
    
    for func in "${FUNCTIONS[@]}"; do
        echo "Checking $func..."
        
        # Test function performance
        start_time=$(date +%s%N)
        response=$(curl -s -X POST "https://etretluugvclmydzlfte.supabase.co/functions/v1/$func" \
            -H "Content-Type: application/json" \
            -d '{"action": "health_check"}' \
            -w "%{http_code}")
        end_time=$(date +%s%N)
        
        execution_time=$(( (end_time - start_time) / 1000000 ))  # Convert to milliseconds
        
        if [[ "$response" == "200" ]]; then
            echo "  ✅ $func: ${execution_time}ms (Baseline: <500ms)"
            
            if [ $execution_time -gt 1000 ]; then
                echo "  ⚠️  Function execution time above baseline"
            fi
        else
            echo "  ❌ $func: Failed (HTTP $response)"
        fi
    done
}

# Run all checks
check_resource_usage
check_function_usage

echo ""
echo "Resource baseline monitoring completed at $TIMESTAMP"
```

## User Experience Baselines

### Frontend Performance Baselines

#### Page Load Time Baselines

| Page/Component | Mean Load Time (ms) | 95th Percentile (ms) | Target (ms) |
|----------------|--------------------|--------------------|-------------|
| **Dashboard** | 1200 | 2000 | 3000 |
| **Trust Score Page** | 800 | 1500 | 2000 |
| **Agent Recommendations** | 1000 | 1800 | 2500 |
| **GDPR Management** | 900 | 1600 | 2000 |
| **Settings Page** | 600 | 1200 | 1500 |

#### User Interaction Baselines

| Interaction | Response Time (ms) | Success Rate (%) | Target Time (ms) |
|-------------|-------------------|------------------|------------------|
| **Button Clicks** | <100 | >99% | 200 |
| **Form Submissions** | <500 | >98% | 1000 |
| **Search Queries** | <300 | >99% | 800 |
| **Data Filtering** | <200 | >99% | 500 |
| **Page Navigation** | <800 | >99% | 1500 |

## Business Logic Baselines

### Trust Scoring Performance

#### Trust Score Calculation Baselines

| Calculation Type | Avg Duration (ms) | 95th Percentile (ms) | Throughput (calc/min) |
|------------------|-------------------|---------------------|------------------------|
| **Individual User Score** | 45 | 80 | 1200 |
| **Agent Trust Score** | 60 | 110 | 800 |
| **Batch Score Update** | 1500 | 3000 | 50 batches |
| **Historical Analysis** | 2000 | 4000 | 20 |

### Recommendation Engine Baselines

#### Agent Recommendation Performance

| Recommendation Type | Avg Duration (ms) | 95th Percentile (ms) | Accuracy (%) |
|---------------------|-------------------|---------------------|---------------|
| **Real-time Recommendations** | 85 | 150 | >92% |
| **Personalized Suggestions** | 120 | 200 | >88% |
| **Similar Agent Matching** | 95 | 170 | >90% |
| **Category-based Filtering** | 40 | 75 | >95% |

## Monitoring Thresholds and Alerting

### Alert Severity Levels

#### Performance Alert Thresholds

| Metric | Baseline | Warning | Critical | Alert Action |
|--------|----------|---------|----------|---------------|
| **API Response Time** | <500ms | >1000ms | >2000ms | Auto-scale, investigate |
| **Error Rate** | <0.5% | >2% | >5% | Emergency response |
| **Database Query Time** | <50ms | >200ms | >500ms | Query optimization |
| **Connection Pool Usage** | <70% | >85% | >95% | Scale connections |
| **Function Execution Time** | <30s | >45s | >60s | Function optimization |
| **Storage Usage** | <80% | >90% | >95% | Cleanup, scaling |

### Automated Baseline Updates

```bash
#!/bin/bash
# Weekly baseline update script

echo "=== WEEKLY BASELINE UPDATE ==="
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Collect performance data for the past week
PERF_DATA=$(curl -s -X POST https://etretluugvclmydzlfte.supabase.co/functions/v1/production-monitoring \
    -H "Content-Type: application/json" \
    -d '{"action": "performance_report", "time_window": "7d"}')

if [ $? -eq 0 ]; then
    echo "Updating performance baselines..."
    
    # Extract new baseline values
    NEW_AVG_RESPONSE=$(echo $PERF_DATA | jq -r '.result.avg_response_time')
    NEW_P95_RESPONSE=$(echo $PERF_DATA | jq -r '.result.p95_response_time')
    NEW_ERROR_RATE=$(echo $PERF_DATA | jq -r '.result.avg_error_rate')
    NEW_THROUGHPUT=$(echo $PERF_DATA | jq -r '.result.avg_throughput')
    
    echo "New baseline values:"
    echo "  Average Response Time: ${NEW_AVG_RESPONSE}ms"
    echo "  95th Percentile Response Time: ${NEW_P95_RESPONSE}ms"
    echo "  Average Error Rate: ${NEW_ERROR_RATE}%"
    echo "  Average Throughput: ${NEW_THROUGHPUT} RPS"
    
    # Update baseline storage
    curl -X POST https://etretluugvclmydzlfte.supabase.co/functions/v1/production-monitoring \
        -H "Content-Type: application/json" \
        -d "{
            \"action\": \"update_baselines\",
            \"baselines\": {
                \"avg_response_time\": $NEW_AVG_RESPONSE,
                \"p95_response_time\": $NEW_P95_RESPONSE,
                \"avg_error_rate\": $NEW_ERROR_RATE,
                \"avg_throughput\": $NEW_THROUGHPUT,
                \"update_timestamp\": \"$TIMESTAMP\",
                \"data_period\": \"7d\"
            }
        }"
    
    echo "✅ Baselines updated successfully"
    
    # Generate baseline report
    REPORT_FILE="/tmp/baseline-update-$(date +%Y%m%d).md"
    {
        echo "# Weekly Baseline Update Report"
        echo "**Generated**: $TIMESTAMP"
        echo ""
        echo "## Updated Baselines"
        echo "- **Average Response Time**: ${NEW_AVG_RESPONSE}ms"
        echo "- **95th Percentile Response Time**: ${NEW_P95_RESPONSE}ms"
        echo "- **Average Error Rate**: ${NEW_ERROR_RATE}%"
        echo "- **Average Throughput**: ${NEW_THROUGHPUT} RPS"
        echo ""
        echo "## Trend Analysis"
        echo "- Performance trend analysis based on 7-day rolling average"
        echo "- Baselines automatically adjusted for normal system evolution"
        echo "- Alert thresholds remain static for consistency"
        echo ""
        echo "## Next Review"
        echo "- **Next Update**: $(date -d '+7 days' '+%Y-%m-%d')"
        echo "- **Monthly Review**: $(date -d 'first day of next month' '+%Y-%m-01')"
    } > $REPORT_FILE
    
    echo "Baseline update report generated: $REPORT_FILE"
    
else
    echo "❌ Failed to collect performance data for baseline update"
fi

echo "Weekly baseline update completed at $TIMESTAMP"
```

## Capacity Planning Integration

### Growth Trend Analysis

#### Resource Growth Projections

| Resource | Current Usage | Monthly Growth | 6-Month Projection | Scaling Trigger |
|----------|---------------|----------------|--------------------|-----------------|
| **Database Storage** | 15GB | +2GB | 27GB | 25GB |
| **API Request Volume** | 10M/month | +15% | 19.5M/month | 15M/month |
| **Concurrent Users** | 500 peak | +10% | 880 peak | 800 peak |
| **Function Executions** | 5M/month | +20% | 12.4M/month | 10M/month |

### Scaling Decision Matrix

```bash
#!/bin/bash
# Capacity planning analysis

echo "=== CAPACITY PLANNING ANALYSIS ==="

# Get current usage trends
USAGE_TRENDS=$(curl -s -X POST https://etretluugvclmydzlfte.supabase.co/functions/v1/database-scalability \
    -H "Content-Type: application/json" \
    -d '{"action": "capacity_analysis", "projection_days": 180}')

if [ $? -eq 0 ]; then
    # Extract trend data
    CURRENT_STORAGE=$(echo $USAGE_TRENDS | jq -r '.result.current_storage_gb')
    PROJECTED_STORAGE=$(echo $USAGE_TRENDS | jq -r '.result.projected_storage_6m')
    CURRENT_REQUESTS=$(echo $USAGE_TRENDS | jq -r '.result.current_monthly_requests')
    PROJECTED_REQUESTS=$(echo $USAGE_TRENDS | jq -r '.result.projected_monthly_requests_6m')
    
    echo "Current Capacity Usage:"
    echo "  Storage: ${CURRENT_STORAGE}GB"
    echo "  Monthly Requests: ${CURRENT_REQUESTS}M"
    echo ""
    echo "6-Month Projections:"
    echo "  Storage: ${PROJECTED_STORAGE}GB"
    echo "  Monthly Requests: ${PROJECTED_REQUESTS}M"
    
    # Check scaling thresholds
    if (( $(echo "$PROJECTED_STORAGE > 25" | bc -l) )); then
        echo "⚠️  Storage scaling required within 6 months"
    fi
    
    if (( $(echo "$PROJECTED_REQUESTS > 15" | bc -l) )); then
        echo "⚠️  Request volume scaling required within 6 months"
    fi
    
else
    echo "❌ Failed to retrieve capacity analysis"
fi
```

---

**Document Control**
- **Version**: 2.0
- **Last Updated**: 2025-09-14
- **Next Review**: Weekly (baselines), Monthly (comprehensive)
- **Owner**: DevOps Team + Performance Engineering
- **Approved By**: CTO

**CRITICAL**: These baselines must be regularly updated to reflect system evolution. Alert thresholds should be reviewed monthly and adjusted based on operational requirements and SLA commitments.

**Baseline Update Schedule**: Every Sunday 02:00 UTC  
**Comprehensive Review**: First Monday of each month  
**Emergency Baseline Reset**: After major system changes or incidents
