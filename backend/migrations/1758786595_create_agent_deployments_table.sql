-- Migration: create_agent_deployments_table
-- Created at: 1758786595

-- Agent Deployments Table
-- Manages deployed AI agents from n8n workflows
CREATE TABLE agent_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    workflow_id UUID NOT NULL,
    
    -- Agent identification
    agent_name VARCHAR(255) NOT NULL,
    agent_id VARCHAR(255) NOT NULL,
    
    -- Deployment configuration
    deployment_type VARCHAR(50) NOT NULL CHECK (deployment_type IN ('container', 'serverless', 'edge')),
    container_name VARCHAR(255),
    deployment_status VARCHAR(50) DEFAULT 'pending' CHECK (deployment_status IN (
        'pending', 'deploying', 'deployed', 'failed', 'updating', 'removing'
    )),
    
    -- Runtime configuration
    deployment_url TEXT,
    health_check_url TEXT,
    instance_config JSONB DEFAULT '{}',
    resource_limits JSONB DEFAULT '{}',
    environment_vars JSONB DEFAULT '[]',
    
    -- Status and health
    status VARCHAR(50) DEFAULT 'stopped' CHECK (status IN (
        'stopped', 'starting', 'running', 'stopping', 'restarting', 'error', 'unknown'
    )),
    health_status VARCHAR(20) DEFAULT 'unknown' CHECK (health_status IN (
        'healthy', 'unhealthy', 'unknown'
    )),
    auto_restart BOOLEAN DEFAULT true,
    
    -- Deployment logs and debugging
    deployment_logs JSONB DEFAULT '[]',
    deployment_error TEXT,
    last_error TEXT,
    error_count INTEGER DEFAULT 0,
    
    -- Usage tracking
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    total_cost DECIMAL(12,6) DEFAULT 0,
    
    -- Timestamps
    deployed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_started_at TIMESTAMP WITH TIME ZONE,
    last_stopped_at TIMESTAMP WITH TIME ZONE,
    last_health_check TIMESTAMP WITH TIME ZONE,
    last_request_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, agent_name)
);

-- Indexes for efficient querying
CREATE INDEX idx_agent_deployments_user_id ON agent_deployments(user_id);
CREATE INDEX idx_agent_deployments_workflow_id ON agent_deployments(workflow_id);
CREATE INDEX idx_agent_deployments_status ON agent_deployments(status);
CREATE INDEX idx_agent_deployments_deployment_status ON agent_deployments(deployment_status);
CREATE INDEX idx_agent_deployments_health ON agent_deployments(health_status);
CREATE INDEX idx_agent_deployments_deployed_at ON agent_deployments(deployed_at DESC);
CREATE INDEX idx_agent_deployments_updated_at ON agent_deployments(updated_at DESC);

-- Composite indexes for common queries
CREATE INDEX idx_agent_deployments_user_status ON agent_deployments(user_id, status);
CREATE INDEX idx_agent_deployments_user_deployed_at ON agent_deployments(user_id, deployed_at DESC);;