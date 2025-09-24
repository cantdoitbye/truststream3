#!/bin/bash

# Economic AI Integration Test Runner
# Tests the integration between governance agents and economic systems

echo "=========================================="
echo "Economic AI Integration Test Suite"
echo "=========================================="
echo "Starting tests at $(date)"
echo ""

# Set script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# Check if required packages are available
python3 -c "import requests" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "Installing required packages..."
    pip3 install requests
fi

# Set environment variables for testing
export SUPABASE_URL="${SUPABASE_URL:-http://localhost:54321}"
export SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-test-anon-key}"
export SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-test-service-role-key}"

echo "Configuration:"
echo "  Supabase URL: $SUPABASE_URL"
echo "  Test Mode: Comprehensive"
echo ""

# Run the Python test suite
cd "$PROJECT_ROOT"
python3 tests/economic_ai_integration_test.py

# Capture the exit code
TEST_EXIT_CODE=$?

echo ""
echo "=========================================="
echo "Test Suite Completed at $(date)"
echo "Exit Code: $TEST_EXIT_CODE"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ All tests passed successfully!"
else
    echo "❌ Some tests failed. Check the output above for details."
fi

echo "=========================================="

exit $TEST_EXIT_CODE
