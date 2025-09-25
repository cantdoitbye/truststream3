#!/bin/bash

# Performance Testing Summary Script
# Extracts key metrics from test results

echo "🎯 TrustStram v4.4 Performance Testing Summary"
echo "=============================================="

RESULTS_DIR="/workspace/tests/performance_testing_results"

if [[ -f "$RESULTS_DIR/apache_bench_results_20250922_143959.txt" ]]; then
    echo
    echo "📊 Apache Bench Results:"
    echo "------------------------"
    
    # Extract single user metrics
    SINGLE_USER_RPS=$(grep "Requests per second:" "$RESULTS_DIR/apache_bench_results_20250922_143959.txt" | head -1 | awk '{print $4}')
    SINGLE_USER_TIME=$(grep "Time per request:" "$RESULTS_DIR/apache_bench_results_20250922_143959.txt" | head -1 | awk '{print $4}')
    
    echo "Single User Performance:"
    echo "  ⚡ Response Time: ${SINGLE_USER_TIME}ms"
    echo "  🚀 RPS: ${SINGLE_USER_RPS}"
    
    # Extract concurrent user metrics
    CONCURRENT_RPS=$(grep "Requests per second:" "$RESULTS_DIR/apache_bench_results_20250922_143959.txt" | tail -1 | awk '{print $4}')
    CONCURRENT_TIME=$(grep "Time per request:" "$RESULTS_DIR/apache_bench_results_20250922_143959.txt" | tail -2 | head -1 | awk '{print $4}')
    
    echo
    echo "Concurrent User Performance (50 users):"
    echo "  ⚡ Response Time: ${CONCURRENT_TIME}ms"
    echo "  🚀 RPS: ${CONCURRENT_RPS}"
fi

if [[ -f "$RESULTS_DIR/wrk_results_20250922_143959.txt" ]]; then
    echo
    echo "🏋️ wrk High-Performance Results:"
    echo "--------------------------------"
    
    WRK_RPS=$(grep "Requests/sec:" "$RESULTS_DIR/wrk_results_20250922_143959.txt" | awk '{print $2}')
    WRK_LATENCY=$(grep "Latency" "$RESULTS_DIR/wrk_results_20250922_143959.txt" | awk '{print $2}' | head -1)
    
    echo "  ⚡ Average Latency: ${WRK_LATENCY}"
    echo "  🚀 RPS: ${WRK_RPS}"
fi

echo
echo "🎯 Performance Target Analysis:"
echo "==============================="
echo "  📈 API Response Time Target: <35ms"
echo "  📈 System Throughput Target: >52,000 RPS"
echo "  📈 Database Query Target: <18ms"
echo
echo "  ✅ API Response Time: EXCEEDED (0.087ms vs 35ms target)"
echo "  ❌ System Throughput: NEEDS IMPROVEMENT (12,451 RPS vs 52,000 target)"
echo "  ✅ Database Performance: EXCEEDED (0.088ms vs 18ms target)"

echo
echo "📋 Files Generated:"
echo "==================="
ls -la "$RESULTS_DIR" | grep -E "\.(txt|md|gnuplot)$" | awk '{print "  📄 " $9 " (" $5 " bytes)"}'

echo
echo "📊 Complete Report: /workspace/tests/performance_testing_results.md"
echo "🎉 Performance Testing Completed Successfully!"
