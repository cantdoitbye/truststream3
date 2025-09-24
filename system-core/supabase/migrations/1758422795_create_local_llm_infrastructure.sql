-- Migration: create_local_llm_infrastructure
-- Created at: 1758422795

-- Local LLM Serving Infrastructure Database Schema
-- Author: MiniMax Agent
-- Created: 2025-09-21
-- Supports vLLM, Ollama, TGI model serving with advanced optimization

-- Create schema for LLM infrastructure
CREATE SCHEMA IF NOT EXISTS llm_serving;

-- Model Registry Table
CREATE TABLE IF NOT EXISTS llm_serving.model_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('text-generation', 'chat', 'instruct', 'code', 'embedding')),
    base_model VARCHAR(255) NOT NULL,
    model_size VARCHAR(20) NOT NULL, -- e.g., '7B', '13B', '70B'
    quantization VARCHAR(20), -- e.g., 'fp16', 'int8', 'int4', 'gguf'
    supported_frameworks JSONB NOT NULL DEFAULT '[]', -- ['vllm', 'ollama', 'tgi']
    model_path VARCHAR(500), -- Local path or HuggingFace model ID
    config JSONB NOT NULL DEFAULT '{}', -- Model-specific configuration
    capabilities JSONB NOT NULL DEFAULT '{}', -- Supported features
    performance_metrics JSONB DEFAULT '{}', -- Benchmark results
    resource_requirements JSONB DEFAULT '{}', -- GPU memory, CPU requirements
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'loading', 'loaded', 'error', 'disabled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Model Server Instances Table
CREATE TABLE IF NOT EXISTS llm_serving.server_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    framework VARCHAR(20) NOT NULL CHECK (framework IN ('vllm', 'ollama', 'tgi')),
    endpoint_url VARCHAR(500) NOT NULL,
    api_type VARCHAR(20) NOT NULL DEFAULT 'openai' CHECK (api_type IN ('openai', 'ollama', 'tgi', 'custom')),
    models_loaded JSONB NOT NULL DEFAULT '[]', -- Array of model IDs currently loaded
    max_concurrent_requests INTEGER DEFAULT 100,
    current_load INTEGER DEFAULT 0,
    health_status VARCHAR(20) NOT NULL DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'unhealthy', 'unknown', 'maintenance')),
    last_health_check TIMESTAMP WITH TIME ZONE,
    gpu_memory_total BIGINT, -- in bytes
    gpu_memory_used BIGINT,
    cpu_usage_percent DECIMAL(5,2),
    response_time_avg_ms DECIMAL(10,2),
    config JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'starting', 'stopping', 'error')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Model Deployments Table (which models are deployed on which servers)
CREATE TABLE IF NOT EXISTS llm_serving.model_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES llm_serving.model_registry(id) ON DELETE CASCADE,
    server_id UUID NOT NULL REFERENCES llm_serving.server_instances(id) ON DELETE CASCADE,
    deployment_name VARCHAR(255) NOT NULL,
    framework_config JSONB DEFAULT '{}', -- Framework-specific configuration
    resource_allocation JSONB DEFAULT '{}', -- GPU/CPU allocation for this deployment
    auto_scaling JSONB DEFAULT '{}', -- Auto-scaling configuration
    load_balancing JSONB DEFAULT '{}', -- Load balancing settings
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
CREATE TABLE IF NOT EXISTS llm_serving.performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id UUID REFERENCES llm_serving.model_deployments(id) ON DELETE CASCADE,
    server_id UUID REFERENCES llm_serving.server_instances(id) ON DELETE CASCADE,
    model_id UUID REFERENCES llm_serving.model_registry(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL, -- 'latency', 'throughput', 'gpu_usage', 'memory_usage', etc.
    metric_value DECIMAL(15,6) NOT NULL,
    metric_unit VARCHAR(20) NOT NULL, -- 'ms', 'tokens/sec', 'GB', '%', etc.
    aggregation_type VARCHAR(20) NOT NULL DEFAULT 'instant' CHECK (aggregation_type IN ('instant', 'average', 'min', 'max', 'p50', 'p95', 'p99')),
    window_start TIMESTAMP WITH TIME ZONE,
    window_end TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Request Logs Table
CREATE TABLE IF NOT EXISTS llm_serving.request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255),
    deployment_id UUID REFERENCES llm_serving.model_deployments(id) ON DELETE SET NULL,
    model_name VARCHAR(255) NOT NULL,
    endpoint VARCHAR(100) NOT NULL, -- 'chat', 'completion', 'embedding'
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

-- Optimization Profiles Table
CREATE TABLE IF NOT EXISTS llm_serving.optimization_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    target_models JSONB DEFAULT '[]', -- Array of model patterns
    optimization_settings JSONB NOT NULL DEFAULT '{}',
    performance_targets JSONB DEFAULT '{}',
    resource_constraints JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-scaling Rules Table
CREATE TABLE IF NOT EXISTS llm_serving.autoscaling_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(255) NOT NULL UNIQUE,
    deployment_id UUID REFERENCES llm_serving.model_deployments(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL, -- 'cpu_usage', 'gpu_usage', 'queue_length', 'response_time'
    threshold_up DECIMAL(10,4) NOT NULL,
    threshold_down DECIMAL(10,4) NOT NULL,
    scale_up_action JSONB NOT NULL DEFAULT '{}',
    scale_down_action JSONB NOT NULL DEFAULT '{}',
    cooldown_period_seconds INTEGER DEFAULT 300,
    min_instances INTEGER DEFAULT 1,
    max_instances INTEGER DEFAULT 10,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_model_registry_name ON llm_serving.model_registry(name);
CREATE INDEX IF NOT EXISTS idx_model_registry_status ON llm_serving.model_registry(status);
CREATE INDEX IF NOT EXISTS idx_model_registry_type ON llm_serving.model_registry(model_type);

CREATE INDEX IF NOT EXISTS idx_server_instances_framework ON llm_serving.server_instances(framework);
CREATE INDEX IF NOT EXISTS idx_server_instances_status ON llm_serving.server_instances(status);
CREATE INDEX IF NOT EXISTS idx_server_instances_health ON llm_serving.server_instances(health_status);

CREATE INDEX IF NOT EXISTS idx_model_deployments_model ON llm_serving.model_deployments(model_id);
CREATE INDEX IF NOT EXISTS idx_model_deployments_server ON llm_serving.model_deployments(server_id);
CREATE INDEX IF NOT EXISTS idx_model_deployments_status ON llm_serving.model_deployments(deployment_status);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_deployment ON llm_serving.performance_metrics(deployment_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON llm_serving.performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created ON llm_serving.performance_metrics(created_at);

CREATE INDEX IF NOT EXISTS idx_request_logs_request_id ON llm_serving.request_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_user_id ON llm_serving.request_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_created ON llm_serving.request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_request_logs_deployment ON llm_serving.request_logs(deployment_id);

-- Enable Row Level Security
ALTER TABLE llm_serving.model_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_serving.server_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_serving.model_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_serving.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_serving.request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_serving.optimization_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_serving.autoscaling_rules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public access (adjust based on security requirements)
CREATE POLICY IF NOT EXISTS "Enable read access for all users" ON llm_serving.model_registry FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Enable read access for all users" ON llm_serving.server_instances FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Enable read access for all users" ON llm_serving.model_deployments FOR SELECT USING (true);

-- Create policies for authenticated users to manage models
CREATE POLICY IF NOT EXISTS "Enable insert for authenticated users" ON llm_serving.model_registry FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Enable update for authenticated users" ON llm_serving.model_registry FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Enable delete for authenticated users" ON llm_serving.model_registry FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Enable insert for authenticated users" ON llm_serving.server_instances FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Enable update for authenticated users" ON llm_serving.server_instances FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Enable delete for authenticated users" ON llm_serving.server_instances FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Enable insert for authenticated users" ON llm_serving.model_deployments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Enable update for authenticated users" ON llm_serving.model_deployments FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Enable delete for authenticated users" ON llm_serving.model_deployments FOR DELETE USING (auth.role() = 'authenticated');

-- Performance and request logs can be inserted by service role or authenticated users
CREATE POLICY IF NOT EXISTS "Enable insert for performance metrics" ON llm_serving.performance_metrics FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Enable read for performance metrics" ON llm_serving.performance_metrics FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Enable insert for request logs" ON llm_serving.request_logs FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Enable read for request logs" ON llm_serving.request_logs FOR SELECT USING (true);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION llm_serving.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_model_registry_updated_at
    BEFORE UPDATE ON llm_serving.model_registry
    FOR EACH ROW
    EXECUTE FUNCTION llm_serving.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_server_instances_updated_at
    BEFORE UPDATE ON llm_serving.server_instances
    FOR EACH ROW
    EXECUTE FUNCTION llm_serving.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_model_deployments_updated_at
    BEFORE UPDATE ON llm_serving.model_deployments
    FOR EACH ROW
    EXECUTE FUNCTION llm_serving.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_optimization_profiles_updated_at
    BEFORE UPDATE ON llm_serving.optimization_profiles
    FOR EACH ROW
    EXECUTE FUNCTION llm_serving.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_autoscaling_rules_updated_at
    BEFORE UPDATE ON llm_serving.autoscaling_rules
    FOR EACH ROW
    EXECUTE FUNCTION llm_serving.update_updated_at_column();

-- Insert some default optimization profiles
INSERT INTO llm_serving.optimization_profiles (name, description, optimization_settings, performance_targets) VALUES
('low_latency', 'Optimized for minimal response time', 
 '{"batch_size": 1, "max_concurrent_requests": 50, "cache_enabled": true, "quantization": "fp16"}',
 '{"max_latency_ms": 200, "min_throughput_tokens_per_sec": 50}'),
('high_throughput', 'Optimized for maximum throughput',
 '{"batch_size": 8, "max_concurrent_requests": 200, "cache_enabled": true, "quantization": "int8"}',
 '{"min_throughput_tokens_per_sec": 200, "max_latency_ms": 1000}'),
('balanced', 'Balanced latency and throughput',
 '{"batch_size": 4, "max_concurrent_requests": 100, "cache_enabled": true, "quantization": "fp16"}',
 '{"max_latency_ms": 500, "min_throughput_tokens_per_sec": 100}'),
('resource_efficient', 'Optimized for minimal resource usage',
 '{"batch_size": 2, "max_concurrent_requests": 25, "cache_enabled": true, "quantization": "int4"}',
 '{"max_gpu_memory_gb": 8, "max_cpu_usage_percent": 70}')
ON CONFLICT (name) DO UPDATE SET
    optimization_settings = EXCLUDED.optimization_settings,
    performance_targets = EXCLUDED.performance_targets,
    updated_at = NOW();

-- Create a view for easy model deployment status
CREATE OR REPLACE VIEW llm_serving.deployment_status AS
SELECT 
    mr.name as model_name,
    mr.display_name,
    mr.model_type,
    mr.model_size,
    si.name as server_name,
    si.framework,
    si.endpoint_url,
    md.deployment_name,
    md.deployment_status,
    si.health_status as server_health,
    md.request_count,
    md.error_count,
    md.last_accessed,
    md.created_at as deployed_at
FROM llm_serving.model_registry mr
JOIN llm_serving.model_deployments md ON mr.id = md.model_id
JOIN llm_serving.server_instances si ON md.server_id = si.id
ORDER BY md.created_at DESC;

-- Create a view for performance summary
CREATE OR REPLACE VIEW llm_serving.performance_summary AS
SELECT 
    ds.model_name,
    ds.server_name,
    ds.framework,
    AVG(CASE WHEN pm.metric_type = 'latency' THEN pm.metric_value END) as avg_latency_ms,
    AVG(CASE WHEN pm.metric_type = 'throughput' THEN pm.metric_value END) as avg_throughput,
    AVG(CASE WHEN pm.metric_type = 'gpu_usage' THEN pm.metric_value END) as avg_gpu_usage_percent,
    AVG(CASE WHEN pm.metric_type = 'memory_usage' THEN pm.metric_value END) as avg_memory_usage_gb,
    COUNT(rl.id) as total_requests,
    SUM(CASE WHEN rl.success = true THEN 1 ELSE 0 END) as successful_requests,
    AVG(rl.response_time_ms) as avg_response_time_ms
FROM llm_serving.deployment_status ds
LEFT JOIN llm_serving.performance_metrics pm ON ds.deployment_name = (
    SELECT deployment_name FROM llm_serving.model_deployments WHERE id = pm.deployment_id
)
LEFT JOIN llm_serving.request_logs rl ON ds.deployment_name = (
    SELECT deployment_name FROM llm_serving.model_deployments WHERE id = rl.deployment_id
)
WHERE pm.created_at >= NOW() - INTERVAL '1 hour' OR pm.created_at IS NULL
AND (rl.created_at >= NOW() - INTERVAL '1 hour' OR rl.created_at IS NULL)
GROUP BY ds.model_name, ds.server_name, ds.framework;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA llm_serving TO public;
GRANT SELECT ON ALL TABLES IN SCHEMA llm_serving TO public;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA llm_serving TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA llm_serving TO authenticated;;