#!/bin/sh
# STDIO mode startup script for Chat-to-RAG MCP Server
set -e

# Change to script directory
cd "$(dirname "$0")"

echo "Starting Chat-to-RAG Agent Creation MCP Server..." >&2

# Check required environment variables
if [ -z "$OPENAI_API_KEY" ]; then
    echo "Warning: OPENAI_API_KEY environment variable not set" >&2
    echo "Please set required environment variables before startup" >&2
fi

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "Warning: Supabase configuration environment variables not set" >&2
    echo "Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY" >&2
fi

# Create independent virtual environment (if it doesn't exist)
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..." >&2
    uv venv
    echo "Installing dependencies..." >&2
    echo "Note: Dependency installation may take several minutes. Please wait..." >&2
    uv sync
fi

# Start STDIO mode MCP server
echo "Launching MCP server in STDIO mode..." >&2
uv run server.py --transport stdio
