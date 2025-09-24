#!/bin/bash

# Local LLM Serving Infrastructure Deployment Script
# Author: MiniMax Agent
# Created: 2025-09-21
# 
# Automated deployment script for setting up the complete local LLM serving infrastructure
# Includes database setup, edge function deployment, and initial configuration

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="truststream-llm-infrastructure"
SUPABASE_PROJECT_ID=""
SUPABASE_API_URL=""
SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check for required commands
    local missing_commands=()
    
    if ! command_exists "supabase"; then
        missing_commands+=("supabase")
    fi
    
    if ! command_exists "curl"; then
        missing_commands+=("curl")
    fi
    
    if ! command_exists "jq"; then
        missing_commands+=("jq")
    fi
    
    if ! command_exists "psql"; then
        missing_commands+=("postgresql-client")
    fi
    
    if [ ${#missing_commands[@]} -ne 0 ]; then
        print_error "Missing required commands: ${missing_commands[*]}"
        print_status "Please install the missing dependencies:"
        echo "  - Supabase CLI: https://supabase.com/docs/guides/cli"
        echo "  - curl: Usually pre-installed"
        echo "  - jq: https://stedolan.github.io/jq/download/"
        echo "  - PostgreSQL client: https://www.postgresql.org/download/"
        exit 1
    fi
    
    print_success "All prerequisites are installed"
}

# Function to prompt for configuration
prompt_configuration() {
    print_status "Configuring deployment..."
    
    # Check if supabase is logged in
    if ! supabase status >/dev/null 2>&1; then
        print_status "Please log in to Supabase:"
        supabase login
    fi
    
    # Check for existing project
    if [ -f "supabase/config.toml" ]; then
        print_status "Found existing Supabase configuration"
        SUPABASE_PROJECT_ID=$(grep 'project_id' supabase/config.toml | cut -d'"' -f2)
        print_status "Using project ID: $SUPABASE_PROJECT_ID"
    else
        # Prompt for project creation or selection
        echo "Do you want to:"
        echo "1) Create a new Supabase project"
        echo "2) Use an existing project"
        read -p "Enter your choice (1 or 2): " choice
        
        case $choice in
            1)
                read -p "Enter organization ID: " org_id
                read -p "Enter project name [$PROJECT_NAME]: " project_name
                project_name=${project_name:-$PROJECT_NAME}
                read -p "Enter database password: " -s db_password
                echo
                read -p "Enter region [us-east-1]: " region
                region=${region:-us-east-1}
                
                print_status "Creating new Supabase project..."
                supabase projects create "$project_name" --org-id "$org_id" --db-password "$db_password" --region "$region"
                SUPABASE_PROJECT_ID=$(supabase projects list | grep "$project_name" | awk '{print $1}')
                ;;
            2)
                print_status "Available projects:"
                supabase projects list
                read -p "Enter project ID: " SUPABASE_PROJECT_ID
                ;;
            *)
                print_error "Invalid choice"
                exit 1
                ;;
        esac
        
        # Link the project
        print_status "Linking to Supabase project..."
        supabase link --project-ref "$SUPABASE_PROJECT_ID"
    fi
    
    # Get project details
    print_status "Retrieving project configuration..."
    PROJECT_INFO=$(supabase projects api-keys --project-ref "$SUPABASE_PROJECT_ID" --output json)
    
    SUPABASE_API_URL="https://$SUPABASE_PROJECT_ID.supabase.co"
    SUPABASE_ANON_KEY=$(echo "$PROJECT_INFO" | jq -r '.anon')
    SUPABASE_SERVICE_ROLE_KEY=$(echo "$PROJECT_INFO" | jq -r '.service_role')
    
    print_success "Configuration completed"
}

# Function to set up database
setup_database() {
    print_status "Setting up database schema..."
    
    # Check if migration file exists
    local migration_file="supabase/migrations/1758425000_create_local_llm_infrastructure.sql"
    
    if [ ! -f "$migration_file" ]; then
        print_error "Migration file not found: $migration_file"
        print_status "Please ensure you're running this script from the project root directory"
        exit 1
    fi
    
    # Apply migration
    print_status "Applying database migration..."
    if supabase db push; then
        print_success "Database schema applied successfully"
    else
        print_error "Failed to apply database migration"
        exit 1
    fi
    
    # Verify schema creation
    print_status "Verifying database setup..."
    local verification_query="SELECT schemaname FROM pg_tables WHERE schemaname = 'llm_serving' LIMIT 1;"
    
    if supabase db reset --linked; then
        supabase db push
        print_success "Database verification completed"
    else
        print_warning "Database verification could not be completed automatically"
    fi
}

# Function to deploy edge functions
deploy_edge_functions() {
    print_status "Deploying edge functions..."
    
    local functions_dir="supabase/functions"
    local functions=("llm-gateway" "llm-model-manager" "llm-health-monitor" "llm-deployment-automation")
    
    # Check if functions directory exists
    if [ ! -d "$functions_dir" ]; then
        print_error "Functions directory not found: $functions_dir"
        exit 1
    fi
    
    # Deploy each function
    for func in "${functions[@]}"; do
        local func_path="$functions_dir/$func"
        
        if [ -d "$func_path" ]; then
            print_status "Deploying function: $func"
            
            if supabase functions deploy "$func" --project-ref "$SUPABASE_PROJECT_ID"; then
                print_success "Successfully deployed: $func"
            else
                print_error "Failed to deploy: $func"
                exit 1
            fi
        else
            print_warning "Function directory not found: $func_path"
        fi
    done
    
    print_success "All edge functions deployed successfully"
}

# Function to configure environment variables
configure_environment() {
    print_status "Configuring environment variables..."
    
    # Create .env file if it doesn't exist
    local env_file=".env.local"
    
    cat > "$env_file" << EOF
# Local LLM Serving Infrastructure Configuration
# Generated by deployment script on $(date)

# Supabase Configuration
SUPABASE_PROJECT_ID=$SUPABASE_PROJECT_ID
SUPABASE_URL=$SUPABASE_API_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

# API Endpoints
LLM_GATEWAY_URL=$SUPABASE_API_URL/functions/v1/llm-gateway
MODEL_MANAGER_URL=$SUPABASE_API_URL/functions/v1/llm-model-manager
HEALTH_MONITOR_URL=$SUPABASE_API_URL/functions/v1/llm-health-monitor
DEPLOYMENT_AUTOMATION_URL=$SUPABASE_API_URL/functions/v1/llm-deployment-automation

# Default Configuration
DEFAULT_MODEL=llama-3.1-8b-instruct
DEFAULT_FRAMEWORK=vllm
MAX_TOKENS=2048
TEMPERATURE=0.7

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=100
RATE_LIMIT_TOKENS_PER_MINUTE=50000

# Optimization
ENABLE_CACHING=true
OPTIMIZATION_LEVEL=medium
ENABLE_AUTO_SCALING=true

# Monitoring
HEALTH_CHECK_INTERVAL_SECONDS=30
METRICS_RETENTION_DAYS=30
ALERT_THRESHOLD_RESPONSE_TIME_MS=5000
ALERT_THRESHOLD_ERROR_RATE_PERCENT=5.0
EOF
    
    print_success "Environment configuration saved to $env_file"
}

# Function to create sample model server configuration
create_sample_config() {
    print_status "Creating sample configuration files..."
    
    # Create sample server configuration
    local config_dir="config/llm-servers"
    mkdir -p "$config_dir"
    
    # vLLM server configuration
    cat > "$config_dir/vllm-server-example.json" << 'EOF'
{
  "name": "vllm-production-1",
  "framework": "vllm",
  "endpoint_url": "http://your-vllm-server:8000",
  "gpu_memory_gb": 80,
  "cpu_cores": 16,
  "memory_gb": 128,
  "max_concurrent_requests": 100,
  "optimization_config": {
    "enable_tensor_parallelism": true,
    "tensor_parallel_size": 2,
    "gpu_memory_utilization": 0.9,
    "max_model_len": 8192,
    "enable_chunked_prefill": true,
    "max_num_batched_tokens": 4096,
    "max_num_seqs": 128
  }
}
EOF
    
    # Ollama server configuration
    cat > "$config_dir/ollama-server-example.json" << 'EOF'
{
  "name": "ollama-development-1",
  "framework": "ollama",
  "endpoint_url": "http://your-ollama-server:11434",
  "gpu_memory_gb": 24,
  "cpu_cores": 8,
  "memory_gb": 64,
  "max_concurrent_requests": 50
}
EOF
    
    # TGI server configuration
    cat > "$config_dir/tgi-server-example.json" << 'EOF'
{
  "name": "tgi-enterprise-1",
  "framework": "tgi",
  "endpoint_url": "http://your-tgi-server:8080",
  "gpu_memory_gb": 80,
  "cpu_cores": 16,
  "memory_gb": 128,
  "max_concurrent_requests": 128,
  "optimization_config": {
    "num_shard": 2,
    "max_concurrent_requests": 128,
    "max_batch_prefill_tokens": 4096,
    "max_batch_total_tokens": 8192,
    "quantize": "bitsandbytes"
  }
}
EOF
    
    # Create deployment script
    cat > "scripts/deploy-model-servers.sh" << 'EOF'
#!/bin/bash

# Deploy model servers from configuration files
# Usage: ./scripts/deploy-model-servers.sh [config-file]

set -e

CONFIG_DIR="config/llm-servers"
API_KEY="${SUPABASE_SERVICE_ROLE_KEY}"
API_URL="${DEPLOYMENT_AUTOMATION_URL}"

if [ -z "$API_KEY" ] || [ -z "$API_URL" ]; then
    echo "Please set SUPABASE_SERVICE_ROLE_KEY and DEPLOYMENT_AUTOMATION_URL environment variables"
    exit 1
fi

deploy_server() {
    local config_file="$1"
    echo "Deploying server from: $config_file"
    
    local server_config=$(cat "$config_file")
    
    local payload=$(jq -n \
        --argjson server_config "$server_config" \
        '{
            "action": "deploy_server",
            "server_config": $server_config
        }')
    
    local response=$(curl -s -X POST "$API_URL" \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json" \
        -d "$payload")
    
    if echo "$response" | jq -e '.data.result.server_id' > /dev/null; then
        local server_id=$(echo "$response" | jq -r '.data.result.server_id')
        echo "✅ Server deployed successfully with ID: $server_id"
    else
        echo "❌ Failed to deploy server:"
        echo "$response" | jq '.'
        return 1
    fi
}

if [ "$#" -eq 1 ]; then
    # Deploy specific server
    deploy_server "$1"
else
    # Deploy all servers in config directory
    for config_file in "$CONFIG_DIR"/*.json; do
        if [ -f "$config_file" ]; then
            deploy_server "$config_file"
        fi
    done
fi
EOF
    
    chmod +x "scripts/deploy-model-servers.sh"
    
    print_success "Sample configuration files created in $config_dir"
}

# Function to run initial tests
run_initial_tests() {
    print_status "Running initial tests..."
    
    # Test health endpoint
    print_status "Testing health endpoint..."
    local health_url="$SUPABASE_API_URL/functions/v1/llm-health-monitor/metrics"
    
    if curl -s -f -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" "$health_url" > /dev/null; then
        print_success "Health monitor endpoint is accessible"
    else
        print_warning "Health monitor endpoint test failed (this is normal if no servers are registered yet)"
    fi
    
    # Test models endpoint
    print_status "Testing models endpoint..."
    local models_url="$SUPABASE_API_URL/functions/v1/llm-gateway/v1/models"
    
    if response=$(curl -s -f -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" "$models_url"); then
        local model_count=$(echo "$response" | jq '.data.data | length')
        print_success "Models endpoint accessible. Found $model_count available models"
    else
        print_warning "Models endpoint test failed"
    fi
    
    print_success "Initial tests completed"
}

# Function to generate API documentation
generate_api_docs() {
    print_status "Generating API documentation..."
    
    local docs_dir="docs/api"
    mkdir -p "$docs_dir"
    
    # Create OpenAPI specification
    cat > "$docs_dir/openapi.yaml" << EOF
openapi: 3.0.3
info:
  title: Local LLM Serving Infrastructure API
  description: Enterprise-grade local LLM serving with OpenAI-compatible endpoints
  version: 1.0.0
  contact:
    name: API Support
    url: $SUPABASE_API_URL

servers:
  - url: $SUPABASE_API_URL/functions/v1
    description: Production server

security:
  - bearerAuth: []

paths:
  /llm-gateway/v1/chat/completions:
    post:
      summary: Create chat completion
      description: Creates a completion for a chat conversation
      operationId: createChatCompletion
      requestBody:
        required: true
        content:
          application/json:
            schema:
              \$ref: '#/components/schemas/ChatCompletionRequest'
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                \$ref: '#/components/schemas/ChatCompletionResponse'

  /llm-gateway/v1/models:
    get:
      summary: List available models
      description: Lists all available models
      operationId: listModels
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                \$ref: '#/components/schemas/ModelsResponse'

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    ChatCompletionRequest:
      type: object
      required:
        - model
        - messages
      properties:
        model:
          type: string
          example: llama-3.1-8b-instruct
        messages:
          type: array
          items:
            \$ref: '#/components/schemas/ChatMessage'
        max_tokens:
          type: integer
          minimum: 1
          maximum: 4096
          default: 512
        temperature:
          type: number
          minimum: 0
          maximum: 2
          default: 0.7
        stream:
          type: boolean
          default: false
        preferred_framework:
          type: string
          enum: [vllm, ollama, tgi]
        enable_caching:
          type: boolean
          default: true

    ChatMessage:
      type: object
      required:
        - role
        - content
      properties:
        role:
          type: string
          enum: [system, user, assistant]
        content:
          type: string

    ChatCompletionResponse:
      type: object
      properties:
        data:
          type: object
          properties:
            id:
              type: string
            object:
              type: string
              example: chat.completion
            created:
              type: integer
            model:
              type: string
            choices:
              type: array
              items:
                \$ref: '#/components/schemas/ChatChoice'
            usage:
              \$ref: '#/components/schemas/Usage'
            gateway_metadata:
              \$ref: '#/components/schemas/GatewayMetadata'

    ChatChoice:
      type: object
      properties:
        index:
          type: integer
        message:
          \$ref: '#/components/schemas/ChatMessage'
        finish_reason:
          type: string
          enum: [stop, length, function_call]

    Usage:
      type: object
      properties:
        prompt_tokens:
          type: integer
        completion_tokens:
          type: integer
        total_tokens:
          type: integer

    GatewayMetadata:
      type: object
      properties:
        server_id:
          type: string
        deployment_id:
          type: string
        framework:
          type: string
        response_time_ms:
          type: number
        optimization_applied:
          type: boolean
        cache_hit:
          type: boolean
        performance_score:
          type: number
        cost_estimate:
          type: number

    ModelsResponse:
      type: object
      properties:
        data:
          type: object
          properties:
            object:
              type: string
              example: list
            data:
              type: array
              items:
                \$ref: '#/components/schemas/Model'

    Model:
      type: object
      properties:
        id:
          type: string
        object:
          type: string
          example: model
        owned_by:
          type: string
          example: local
        display_name:
          type: string
        model_type:
          type: string
        model_size:
          type: string
        supported_frameworks:
          type: array
          items:
            type: string
        capabilities:
          type: object
EOF
    
    # Create Postman collection
    cat > "$docs_dir/postman-collection.json" << EOF
{
  "info": {
    "name": "Local LLM Serving Infrastructure",
    "description": "Enterprise-grade local LLM serving API",
    "version": "1.0.0"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{API_KEY}}",
        "type": "string"
      }
    ]
  },
  "variable": [
    {
      "key": "BASE_URL",
      "value": "$SUPABASE_API_URL/functions/v1"
    },
    {
      "key": "API_KEY",
      "value": "your-api-key-here"
    }
  ],
  "item": [
    {
      "name": "Chat Completion",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "url": {
          "raw": "{{BASE_URL}}/llm-gateway/v1/chat/completions",
          "host": ["{{BASE_URL}}"],
          "path": ["llm-gateway", "v1", "chat", "completions"]
        },
        "body": {
          "mode": "raw",
          "raw": "{\n  \"model\": \"llama-3.1-8b-instruct\",\n  \"messages\": [\n    {\"role\": \"user\", \"content\": \"Hello! How are you today?\"}\n  ],\n  \"max_tokens\": 512,\n  \"temperature\": 0.7\n}"
        }
      }
    },
    {
      "name": "List Models",
      "request": {
        "method": "GET",
        "url": {
          "raw": "{{BASE_URL}}/llm-gateway/v1/models",
          "host": ["{{BASE_URL}}"],
          "path": ["llm-gateway", "v1", "models"]
        }
      }
    },
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": {
          "raw": "{{BASE_URL}}/llm-health-monitor/metrics",
          "host": ["{{BASE_URL}}"],
          "path": ["llm-health-monitor", "metrics"]
        }
      }
    }
  ]
}
EOF
    
    print_success "API documentation generated in $docs_dir"
}

# Function to display deployment summary
display_summary() {
    print_success "\n🎉 Local LLM Serving Infrastructure Deployment Complete! 🎉\n"
    
    echo "📋 Deployment Summary:"
    echo "  Project ID: $SUPABASE_PROJECT_ID"
    echo "  API URL: $SUPABASE_API_URL"
    echo "  Environment: .env.local"
    echo ""
    
    echo "🔗 API Endpoints:"
    echo "  LLM Gateway: $SUPABASE_API_URL/functions/v1/llm-gateway"
    echo "  Model Manager: $SUPABASE_API_URL/functions/v1/llm-model-manager"
    echo "  Health Monitor: $SUPABASE_API_URL/functions/v1/llm-health-monitor"
    echo "  Deployment Automation: $SUPABASE_API_URL/functions/v1/llm-deployment-automation"
    echo ""
    
    echo "📚 Next Steps:"
    echo "  1. Set up your model servers (vLLM, Ollama, or TGI)"
    echo "  2. Register servers using: ./scripts/deploy-model-servers.sh"
    echo "  3. Load models using the model manager API"
    echo "  4. Start making requests to the LLM Gateway"
    echo ""
    
    echo "📖 Documentation:"
    echo "  📄 Complete Guide: docs/local_llm_serving_infrastructure_guide.md"
    echo "  🔧 API Docs: docs/api/openapi.yaml"
    echo "  📮 Postman Collection: docs/api/postman-collection.json"
    echo ""
    
    echo "🧪 Quick Test:"
    echo "  curl -X GET '$SUPABASE_API_URL/functions/v1/llm-gateway/v1/models' \\"
    echo "       -H 'Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY'"
    echo ""
    
    echo "🚀 Happy deploying!"
}

# Main deployment function
main() {
    echo "🚀 Local LLM Serving Infrastructure Deployment"
    echo "================================================"
    echo ""
    
    # Run deployment steps
    check_prerequisites
    prompt_configuration
    setup_database
    deploy_edge_functions
    configure_environment
    create_sample_config
    run_initial_tests
    generate_api_docs
    
    # Display summary
    display_summary
}

# Handle script arguments
case "${1:-}" in
    "--help" | "-h")
        echo "Local LLM Serving Infrastructure Deployment Script"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --check        Check prerequisites only"
        echo "  --config       Configure environment only"
        echo "  --database     Set up database only"
        echo "  --functions    Deploy edge functions only"
        echo "  --test         Run tests only"
        echo ""
        echo "Environment Variables:"
        echo "  SUPABASE_PROJECT_ID    Supabase project ID (optional)"
        echo "  SKIP_TESTS            Skip initial tests (optional)"
        echo ""
        exit 0
        ;;
    "--check")
        check_prerequisites
        exit 0
        ;;
    "--config")
        prompt_configuration
        configure_environment
        exit 0
        ;;
    "--database")
        setup_database
        exit 0
        ;;
    "--functions")
        deploy_edge_functions
        exit 0
        ;;
    "--test")
        run_initial_tests
        exit 0
        ;;
    "")
        # Run full deployment
        main
        ;;
    *)
        print_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac