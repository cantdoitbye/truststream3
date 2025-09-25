#!/bin/bash

# TrustStram v4.4 Load Testing Framework - Quick Setup Script
# This script sets up the complete load testing environment

set -e

echo "🚀 TrustStram v4.4 Load Testing Framework Setup"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is required but not installed.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Python 3 found${NC}"

# Create directory structure
echo -e "${BLUE}📁 Creating directory structure...${NC}"
mkdir -p tests/load_stress_testing/results
mkdir -p tests/load_stress_testing/logs
mkdir -p tests/load_stress_testing/configs
mkdir -p tests/load_stress_testing/data

# Create requirements.txt if it doesn't exist
cat > tests/load_stress_testing/requirements.txt << 'EOF'
aiohttp>=3.8.0
psutil>=5.8.0
matplotlib>=3.5.0
jinja2>=3.0.0
pyyaml>=6.0
websockets>=10.0
numpy>=1.21.0
requests>=2.25.0
EOF

echo -e "${BLUE}📦 Installing Python dependencies...${NC}"
python3 -m pip install -r tests/load_stress_testing/requirements.txt

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Python dependencies installed successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Some dependencies may have failed to install${NC}"
fi

# Check for JMeter
echo -e "${BLUE}🔍 Checking for JMeter...${NC}"
if command -v jmeter &> /dev/null; then
    echo -e "${GREEN}✅ JMeter found${NC}"
else
    echo -e "${YELLOW}⚠️  JMeter not found. Install JMeter for additional HTTP testing capabilities.${NC}"
    echo "   Download from: https://jmeter.apache.org/download_jmeter.cgi"
fi

# Make scripts executable
echo -e "${BLUE}🔧 Making scripts executable...${NC}"
chmod +x tests/load_stress_testing/run_comprehensive_tests.py
chmod +x tests/load_stress_testing/setup.sh

# Create a simple config file for quick testing
cat > tests/load_stress_testing/quick_test_config.yaml << 'EOF'
name: "TrustStram v4.4 Quick Load Test"
description: "Quick validation test for development environments"

target_system:
  base_url: "http://localhost:3000"
  environment: "development"

execution:
  total_duration_seconds: 300  # 5 minutes
  ramp_up_seconds: 60
  max_concurrent_users: 50

scenarios:
  api_endpoints:
    health_check:
      users: 10
      duration: 180
    status_check:
      users: 15
      duration: 240
  
  ai_agents:
    concurrent_requests: 20
    duration: 200
  
  federated_learning:
    cross_device_simulation:
      num_clients: 100
      num_rounds: 3

thresholds:
  max_response_time: 5.0
  max_error_rate: 10.0
  min_throughput: 50.0
  max_cpu_usage: 90.0
  max_memory_usage: 90.0
EOF

echo -e "${GREEN}✅ Quick test configuration created${NC}"

# Test the framework
echo -e "${BLUE}🧪 Testing framework...${NC}"
python3 tests/load_stress_testing/run_comprehensive_tests.py --check-prereqs

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Framework setup completed successfully!${NC}"
else
    echo -e "${RED}❌ Framework setup encountered issues${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 TrustStram v4.4 Load Testing Framework is ready!${NC}"
echo ""
echo "Quick Start Commands:"
echo -e "${BLUE}  # Run a quick 5-minute test${NC}"
echo "  python3 tests/load_stress_testing/run_comprehensive_tests.py --quick"
echo ""
echo -e "${BLUE}  # Run with custom configuration${NC}"
echo "  python3 tests/load_stress_testing/run_comprehensive_tests.py --config tests/load_stress_testing/quick_test_config.yaml"
echo ""
echo -e "${BLUE}  # Run specific test suites${NC}"
echo "  python3 tests/load_stress_testing/run_comprehensive_tests.py --tests api,agents --duration 600"
echo ""
echo -e "${BLUE}  # Full enterprise stress test${NC}"
echo "  python3 tests/load_stress_testing/run_comprehensive_tests.py --stress"
echo ""
echo "Documentation: tests/load_stress_testing_results.md"
echo "Configuration: tests/load_stress_testing/load_test_config.yaml"
echo ""
echo "Happy testing! 🚀"
