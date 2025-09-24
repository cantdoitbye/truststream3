-- Migration: create_local_llm_infrastructure_fixed
-- Created at: 1758422827

-- Local LLM Serving Infrastructure Database Schema
-- Author: MiniMax Agent
-- Created: 2025-09-21
-- Supports vLLM, Ollama, TGI model serving with advanced optimization

-- Create schema for LLM infrastructure
CREATE SCHEMA IF NOT EXISTS llm_serving;

-- Model Registry Table
CREATE TABLE llm_serving.model_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('text-generation', 'chat', 'instruct', 'code', 'embedding')),
    base_model VARCHAR(255) NOT NULL,
    model_size VARCHAR(20) NOT NULL,
    quantization VARCHAR(20),
    supported_frameworks JSONB NOT NULL DEFAULT '[]',
    model_path VARCHAR(500),
    config JSONB NOT NULL DEFAULT '{}',
    capabilities JSONB NOT NULL DEFAULT '{}',
    performance_metrics JSONB DEFAULT '{}',
    resource_requirements JSONB DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'loading', 'loaded', 'error', 'disabled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Model Server Instances Table
CREATE TABLE llm_serving.server_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    framework VARCHAR(20) NOT NULL CHECK (framework IN ('vllm', 'ollama', 'tgi')),
    endpoint_url VARCHAR(500) NOT NULL,
    api_type VARCHAR(20) NOT NULL DEFAULT 'openai' CHECK (api_type IN ('openai', 'ollama', 'tgi', 'custom')),
    models_loaded JSONB NOT NULL DEFAULT '[]',
    max_concurrent_requests INTEGER DEFAULT 100,
    current_load INTEGER DEFAULT 0,
    health_status VARCHAR(20) NOT NULL DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'unhealthy', 'unknown', 'maintenance')),
    last_health_check TIMESTAMP WITH TIME ZONE,
    gpu_memory_total BIGINT,
    gpu_memory_used BIGINT,
    cpu_usage_percent DECIMAL(5,2),
    response_time_avg_ms DECIMAL(10,2),
    config JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'starting', 'stopping', 'error')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Model Deployments Table
CREATE TABLE llm_serving.model_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES llm_serving.model_registry(id) ON DELETE CASCADE,
    server_id UUID NOT NULL REFERENCES llm_serving.server_instances(id) ON DELETE CASCADE,
    deployment_name VARCHAR(255) NOT NULL,
    framework_config JSONB DEFAULT '{}',
    resource_allocation JSONB DEFAULT '{}',
    auto_scaling JSONB DEFAULT '{}',
    load_balancing JSONB DEFAULT '{}',
    deployment_status VARCHAR(20) NOT NULL DEFAULT 'deploying' CHECK (deployment_status IN ('deploying', 'deployed', 'failed', 'stopping', 'stopped')),
    deployment_start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deployment_end_time TIMESTAMP WITH TIME ZONE,
    last_accessed TIMESTAMP WITH TIME ZONE,
    request_count BIGINT DEFAULT 0,
    error_count BIGINT DEFAULT 0,
    total_tokens_processed BIGINT DEFAULT 0,
    performance_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(model_id, server_id, deployment_name)
);

-- Performance Metrics Table
CREATE TABLE llm_serving.performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id UUID REFERENCES llm_serving.model_deployments(id) ON DELETE CASCADE,
    server_id UUID REFERENCES llm_serving.server_instances(id) ON DELETE CASCADE,
    model_id UUID REFERENCES llm_serving.model_registry(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,
    metric_value DECIMAL(15,6) NOT NULL,
    metric_unit VARCHAR(20) NOT NULL,
    aggregation_type VARCHAR(20) NOT NULL DEFAULT 'instant' CHECK (aggregation_type IN ('instant', 'average', 'min', 'max', 'p50', 'p95', 'p99')),
    window_start TIMESTAMP WITH TIME ZONE,
    window_end TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Request Logs Table
CREATE TABLE llm_serving.request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255),
    deployment_id UUID REFERENCES llm_serving.model_deployments(id) ON DELETE SET NULL,
    model_name VARCHAR(255) NOT NULL,
    endpoint VARCHAR(100) NOT NULL,
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    response_time_ms INTEGER,
    cost_estimate DECIMAL(10,6),
    success BOOLEAN NOT NULL,
    error_message TEXT,
    request_metadata JSONB DEFAULT '{}',
    response_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_model_registry_name ON llm_serving.model_registry(name);
CREATE INDEX idx_model_registry_status ON llm_serving.model_registry(status);
CREATE INDEX idx_server_instances_framework ON llm_serving.server_instances(framework);
CREATE INDEX idx_server_instances_status ON llm_serving.server_instances(status);
CREATE INDEX idx_model_deployments_model ON llm_serving.model_deployments(model_id);
CREATE INDEX idx_model_deployments_server ON llm_serving.model_deployments(server_id);
CREATE INDEX idx_performance_metrics_deployment ON llm_serving.performance_metrics(deployment_id);
CREATE INDEX idx_request_logs_request_id ON llm_serving.request_logs(request_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA llm_serving TO public;
GRANT SELECT ON ALL TABLES IN SCHEMA llm_serving TO public;;