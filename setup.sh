#!/bin/bash

# TrustStream v4.5 - Quick Setup Script
# This script sets up the complete TrustStream v4.5 environment

set -e

echo "🚀 TrustStream v4.5 Setup Script"
echo "=================================="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check prerequisites
echo "🔍 Checking prerequisites..."
echo

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_status "Node.js found: $NODE_VERSION"
else
    print_error "Node.js is required. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

# Check pnpm
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm --version)
    print_status "pnpm found: $PNPM_VERSION"
else
    print_warning "pnpm not found. Installing pnpm..."
    npm install -g pnpm
    print_status "pnpm installed"
fi

# Check Python
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    print_status "Python found: $PYTHON_VERSION"
else
    print_error "Python 3.8+ is required for MCP server"
    exit 1
fi

# Check Supabase CLI
if command -v supabase &> /dev/null; then
    SUPABASE_VERSION=$(supabase --version)
    print_status "Supabase CLI found: $SUPABASE_VERSION"
else
    print_warning "Supabase CLI not found. Installing..."
    npm install -g supabase
    print_status "Supabase CLI installed"
fi

echo
echo "📦 Setting up project components..."
echo

# Setup Frontend
print_info "Setting up Frontend (React Dashboard)..."
cd frontend
if [ -f "package.json" ]; then
    pnpm install
    print_status "Frontend dependencies installed"
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        cat > .env << EOF
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
EOF
        print_warning "Created .env file in frontend/ - Please update with your credentials"
    fi
else
    print_error "Frontend package.json not found"
fi
cd ..

# Setup MCP Server
print_info "Setting up MCP Server (Chat-to-RAG)..."
cd mcp-server
if [ -f "requirements.txt" ]; then
    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        python3 -m venv venv
        print_status "Python virtual environment created"
    fi
    
    # Activate virtual environment and install dependencies
    source venv/bin/activate
    pip install -r requirements.txt
    print_status "MCP Server dependencies installed"
    
    # Make run script executable
    chmod +x run.sh
    print_status "MCP Server run script made executable"
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        cat > .env << EOF
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
QDRANT_URL=your_qdrant_url_here
QDRANT_API_KEY=your_qdrant_api_key_here
EOF
        print_warning "Created .env file in mcp-server/ - Please update with your AI service credentials"
    fi
    deactivate
else
    print_warning "MCP Server requirements.txt not found, skipping Python setup"
fi
cd ..

# Setup Backend (Supabase)
print_info "Setting up Backend (Supabase)..."
cd backend
if [ -f "functions" ] || [ -d "functions" ]; then
    # Create .env file for Supabase functions
    if [ ! -f ".env" ]; then
        cat > .env << EOF
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
QDRANT_URL=your_qdrant_url_here
QDRANT_API_KEY=your_qdrant_api_key_here
EOF
        print_warning "Created .env file in backend/ - Please update with your service credentials"
    fi
    print_status "Backend environment configured"
else
    print_warning "Backend functions directory not found"
fi
cd ..

echo
echo "🎯 Project structure overview:"
echo "├── frontend/     → React Dashboard (Port 5173)"
echo "├── backend/      → Supabase Edge Functions"
echo "├── mcp-server/   → Chat-to-RAG MCP Server (Port 8000)"
echo "└── docs/         → Complete documentation"
echo

echo "📝 Configuration files created:"
echo "├── frontend/.env      → Frontend environment variables"
echo "├── backend/.env       → Backend environment variables"
echo "└── mcp-server/.env    → MCP Server environment variables"
echo

print_warning "IMPORTANT: Please update all .env files with your actual credentials before starting the services"
echo

echo "🚀 Quick start commands:"
echo
echo "1. Start Supabase locally:"
echo "   cd backend && supabase start"
echo
echo "2. Deploy Supabase functions:"
echo "   cd backend && supabase functions deploy"
echo
echo "3. Start frontend development server:"
echo "   cd frontend && pnpm run dev"
echo
echo "4. Start MCP server:"
echo "   cd mcp-server && ./run.sh"
echo

print_status "Setup completed successfully!"
print_info "Check README.md for detailed instructions and troubleshooting"

echo
echo "🎉 TrustStream v4.5 is ready to deploy!"
echo "   Visit the docs/ folder for comprehensive documentation"
echo "   Run tests in the tests/ folder to verify installation"
echo