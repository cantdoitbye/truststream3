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
    gpu_memory_total_gb DECIMAL(10,2),
    gpu_memory_used_gb DECIMAL(10,2) DEFAULT 0,
    cpu_cores INTEGER,
    memory_gb DECIMAL(10,2),
    optimization_config JSONB DEFAULT '{}', -- vLLM/TGI specific optimizations
    health_status VARCHAR(20) NOT NULL DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'unhealthy', 'unknown', 'maintenance')),
    last_health_check TIMESTAMP WITH TIME ZONE,
    performance_stats JSONB DEFAULT '{}', -- Performance metrics
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Model Deployments (many-to-many between models and servers)
CREATE TABLE IF NOT EXISTS llm_serving.model_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES llm_serving.model_registry(id) ON DELETE CASCADE,
    server_id UUID NOT NULL REFERENCES llm_serving.server_instances(id) ON DELETE CASCADE,
    deployment_config JSONB DEFAULT '{}', -- Deployment-specific config
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'deploying', 'active', 'failed', 'stopping')),
    deployment_time TIMESTAMP WITH TIME ZONE,
    last_used TIMESTAMP WITH TIME ZONE,
    request_count BIGINT DEFAULT 0,
    total_tokens_processed BIGINT DEFAULT 0,
    avg_response_time_ms DECIMAL(10,2),
    error_count BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(model_id, server_id)
);

-- LLM Request Logs
CREATE TABLE IF NOT EXISTS llm_serving.request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(255) NOT NULL,
    deployment_id UUID REFERENCES llm_serving.model_deployments(id),
    user_id VARCHAR(255),
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    response_time_ms INTEGER,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'error', 'timeout', 'rate_limited')),
    error_message TEXT,
    cost_estimate DECIMAL(10,6), -- Estimated cost based on tokens
    model_name VARCHAR(255),
    framework VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Model Performance Benchmarks
CREATE TABLE IF NOT EXISTS llm_serving.performance_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES llm_serving.model_registry(id) ON DELETE CASCADE,
    server_id UUID NOT NULL REFERENCES llm_serving.server_instances(id) ON DELETE CASCADE,
    benchmark_type VARCHAR(50) NOT NULL, -- 'throughput', 'latency', 'quality'
    metrics JSONB NOT NULL DEFAULT '{}',
    test_config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Model Cache Management
CREATE TABLE IF NOT EXISTS llm_serving.model_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES llm_serving.model_registry(id) ON DELETE CASCADE,
    server_id UUID NOT NULL REFERENCES llm_serving.server_instances(id) ON DELETE CASCADE,
    cache_key VARCHAR(255) NOT NULL,
    cache_size_bytes BIGINT,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    access_count BIGINT DEFAULT 0,
    cache_type VARCHAR(20) NOT NULL CHECK (cache_type IN ('model_weights', 'kv_cache', 'tokenizer', 'config')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(cache_key, server_id)
);

-- Create indexes for performance
CREATE INDEX idx_model_registry_status ON llm_serving.model_registry(status);
CREATE INDEX idx_model_registry_framework ON llm_serving.model_registry USING GIN(supported_frameworks);
CREATE INDEX idx_server_instances_health ON llm_serving.server_instances(health_status);
CREATE INDEX idx_server_instances_framework ON llm_serving.server_instances(framework);
CREATE INDEX idx_model_deployments_status ON llm_serving.model_deployments(status);
CREATE INDEX idx_request_logs_created_at ON llm_serving.request_logs(created_at);
CREATE INDEX idx_request_logs_model ON llm_serving.request_logs(model_name);
CREATE INDEX idx_model_cache_accessed ON llm_serving.model_cache(last_accessed);

-- Enable Row Level Security
ALTER TABLE llm_serving.model_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_serving.server_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_serving.model_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_serving.request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_serving.performance_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_serving.model_cache ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated access
CREATE POLICY "Allow authenticated users to read model registry" ON llm_serving.model_registry
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role to manage model registry" ON llm_serving.model_registry
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow authenticated users to read server instances" ON llm_serving.server_instances
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role to manage server instances" ON llm_serving.server_instances
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role to manage deployments" ON llm_serving.model_deployments
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role to manage request logs" ON llm_serving.request_logs
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role to manage benchmarks" ON llm_serving.performance_benchmarks
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role to manage cache" ON llm_serving.model_cache
    FOR ALL TO service_role USING (true);

-- Insert sample model configurations
INSERT INTO llm_serving.model_registry (name, display_name, model_type, base_model, model_size, quantization, supported_frameworks, model_path, config, capabilities, resource_requirements) VALUES
('llama-3.1-8b-instruct', 'Llama 3.1 8B Instruct', 'chat', 'meta-llama/Meta-Llama-3.1-8B-Instruct', '8B', 'fp16', '["vllm", "ollama", "tgi"]', 'meta-llama/Meta-Llama-3.1-8B-Instruct', 
 '{"max_seq_length": 8192, "temperature": 0.7, "top_p": 0.9}', 
 '{"function_calling": true, "streaming": true, "chat_template": true}',
 '{"gpu_memory_gb": 16, "min_gpu_memory_gb": 12, "cpu_cores": 4, "memory_gb": 32}'),

('llama-3.1-70b-instruct', 'Llama 3.1 70B Instruct', 'chat', 'meta-llama/Meta-Llama-3.1-70B-Instruct', '70B', 'fp16', '["vllm", "tgi"]', 'meta-llama/Meta-Llama-3.1-70B-Instruct',
 '{"max_seq_length": 8192, "temperature": 0.7, "top_p": 0.9}',
 '{"function_calling": true, "streaming": true, "chat_template": true, "advanced_reasoning": true}',
 '{"gpu_memory_gb": 140, "min_gpu_memory_gb": 120, "cpu_cores": 8, "memory_gb": 128}'),

('qwen2.5-72b-instruct', 'Qwen 2.5 72B Instruct', 'chat', 'Qwen/Qwen2.5-72B-Instruct', '72B', 'fp16', '["vllm", "tgi"]', 'Qwen/Qwen2.5-72B-Instruct',
 '{"max_seq_length": 32768, "temperature": 0.7, "top_p": 0.8}',
 '{"function_calling": true, "streaming": true, "multilingual": true, "coding": true, "math": true}',
 '{"gpu_memory_gb": 144, "min_gpu_memory_gb": 128, "cpu_cores": 8, "memory_gb": 128}'),

('qwen2.5-32b-instruct', 'Qwen 2.5 32B Instruct', 'chat', 'Qwen/Qwen2.5-32B-Instruct', '32B', 'fp16', '["vllm", "ollama", "tgi"]', 'Qwen/Qwen2.5-32B-Instruct',
 '{"max_seq_length": 32768, "temperature": 0.7, "top_p": 0.8}',
 '{"function_calling": true, "streaming": true, "multilingual": true, "coding": true}',
 '{"gpu_memory_gb": 64, "min_gpu_memory_gb": 56, "cpu_cores": 8, "memory_gb": 64}'),

('mistral-8x7b-instruct', 'Mistral 8x7B Instruct v0.1', 'chat', 'mistralai/Mixtral-8x7B-Instruct-v0.1', '8x7B', 'fp16', '["vllm", "tgi"]', 'mistralai/Mixtral-8x7B-Instruct-v0.1',
 '{"max_seq_length": 32768, "temperature": 0.7, "top_p": 0.9}',
 '{"function_calling": true, "streaming": true, "moe_architecture": true}',
 '{"gpu_memory_gb": 90, "min_gpu_memory_gb": 80, "cpu_cores": 8, "memory_gb": 96}'),

('codellama-34b-instruct', 'CodeLlama 34B Instruct', 'code', 'codellama/CodeLlama-34b-Instruct-hf', '34B', 'fp16', '["vllm", "ollama", "tgi"]', 'codellama/CodeLlama-34b-Instruct-hf',
 '{"max_seq_length": 16384, "temperature": 0.1, "top_p": 0.9}',
 '{"code_generation": true, "streaming": true, "fill_in_middle": true}',
 '{"gpu_memory_gb": 68, "min_gpu_memory_gb": 60, "cpu_cores": 8, "memory_gb": 64}');

-- Functions for model management
CREATE OR REPLACE FUNCTION llm_serving.update_model_status(model_id UUID, new_status VARCHAR(20))
RETURNS VOID AS $$
BEGIN
    UPDATE llm_serving.model_registry 
    SET status = new_status, updated_at = NOW()
    WHERE id = model_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION llm_serving.log_request(
    p_request_id VARCHAR(255),
    p_deployment_id UUID,
    p_user_id VARCHAR(255),
    p_prompt_tokens INTEGER,
    p_completion_tokens INTEGER,
    p_response_time_ms INTEGER,
    p_status VARCHAR(20),
    p_error_message TEXT DEFAULT NULL,
    p_model_name VARCHAR(255) DEFAULT NULL,
    p_framework VARCHAR(20) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO llm_serving.request_logs (
        request_id, deployment_id, user_id, prompt_tokens, completion_tokens,
        total_tokens, response_time_ms, status, error_message, model_name, framework
    ) VALUES (
        p_request_id, p_deployment_id, p_user_id, p_prompt_tokens, p_completion_tokens,
        COALESCE(p_prompt_tokens, 0) + COALESCE(p_completion_tokens, 0),
        p_response_time_ms, p_status, p_error_message, p_model_name, p_framework
    ) RETURNING id INTO log_id;
    
    -- Update deployment statistics
    UPDATE llm_serving.model_deployments
    SET 
        request_count = request_count + 1,
        total_tokens_processed = total_tokens_processed + COALESCE(p_prompt_tokens, 0) + COALESCE(p_completion_tokens, 0),
        last_used = NOW(),
        avg_response_time_ms = CASE 
            WHEN avg_response_time_ms IS NULL THEN p_response_time_ms
            ELSE (avg_response_time_ms * request_count + p_response_time_ms) / (request_count + 1)
        END,
        error_count = error_count + CASE WHEN p_status = 'error' THEN 1 ELSE 0 END,
        updated_at = NOW()
    WHERE id = p_deployment_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION llm_serving.get_optimal_deployment(
    p_model_name VARCHAR(255),
    p_framework VARCHAR(20) DEFAULT NULL
)
RETURNS TABLE (
    deployment_id UUID,
    server_id UUID,
    endpoint_url VARCHAR(500),
    api_type VARCHAR(20),
    current_load INTEGER,
    max_concurrent_requests INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        md.id as deployment_id,
        si.id as server_id,
        si.endpoint_url,
        si.api_type,
        si.current_load,
        si.max_concurrent_requests
    FROM llm_serving.model_deployments md
    JOIN llm_serving.model_registry mr ON md.model_id = mr.id
    JOIN llm_serving.server_instances si ON md.server_id = si.id
    WHERE mr.name = p_model_name
        AND md.status = 'active'
        AND si.health_status = 'healthy'
        AND (p_framework IS NULL OR si.framework = p_framework)
        AND si.current_load < si.max_concurrent_requests
    ORDER BY 
        (si.current_load::FLOAT / si.max_concurrent_requests) ASC,
        md.avg_response_time_ms ASC NULLS LAST
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION llm_serving.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_model_registry_updated_at BEFORE UPDATE ON llm_serving.model_registry
    FOR EACH ROW EXECUTE FUNCTION llm_serving.update_updated_at_column();

CREATE TRIGGER update_server_instances_updated_at BEFORE UPDATE ON llm_serving.server_instances
    FOR EACH ROW EXECUTE FUNCTION llm_serving.update_updated_at_column();

CREATE TRIGGER update_model_deployments_updated_at BEFORE UPDATE ON llm_serving.model_deployments
    FOR EACH ROW EXECUTE FUNCTION llm_serving.update_updated_at_column();

COMMIT;