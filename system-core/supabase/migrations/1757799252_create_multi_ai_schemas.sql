-- Migration: create_multi_ai_schemas
-- Created at: 1757799252

-- AI Providers table
CREATE TABLE ai_providers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    api_base_url TEXT NOT NULL,
    supported_models TEXT[] NOT NULL,
    rate_limits JSONB,
    pricing JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Models table
CREATE TABLE ai_models (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER REFERENCES ai_providers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200),
    model_type VARCHAR(50), -- 'chat', 'completion', 'image', 'embedding', etc.
    max_tokens INTEGER,
    supports_streaming BOOLEAN DEFAULT false,
    cost_per_token_input DECIMAL(10, 8),
    cost_per_token_output DECIMAL(10, 8),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, name)
);

-- AI API Keys table (encrypted storage)
CREATE TABLE ai_api_keys (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER REFERENCES ai_providers(id) ON DELETE CASCADE,
    key_name VARCHAR(100) NOT NULL,
    encrypted_key TEXT NOT NULL, -- Encrypted API key
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(provider_id, key_name)
);

-- AI Request Logs table
CREATE TABLE ai_request_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID, -- References auth.users but not enforced for flexibility
    provider_name VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    task_type VARCHAR(50) NOT NULL,
    request_data JSONB,
    response_data JSONB,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'cancelled'
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    estimated_cost DECIMAL(10, 6) DEFAULT 0,
    execution_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Synthetic Data Generations table
CREATE TABLE synthetic_data_generations (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    generation_type VARCHAR(50) NOT NULL, -- 'text', 'structured', 'conversation', 'scenario'
    prompt TEXT NOT NULL,
    generated_data JSONB NOT NULL,
    quality_score DECIMAL(3, 2), -- 0.00 to 1.00
    provider_name VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    generation_params JSONB, -- Temperature, max_tokens, etc.
    tokens_used INTEGER DEFAULT 0,
    cost DECIMAL(10, 6) DEFAULT 0,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP WITH TIME ZONE
);

-- AI Model Comparisons table
CREATE TABLE ai_model_comparisons (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    task_description TEXT NOT NULL,
    prompt TEXT NOT NULL,
    comparison_results JSONB NOT NULL, -- Array of results from different providers
    performance_metrics JSONB, -- Response time, quality scores, etc.
    user_preference VARCHAR(50), -- Which provider/model the user preferred
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_ai_request_logs_user_id ON ai_request_logs(user_id);
CREATE INDEX idx_ai_request_logs_created_at ON ai_request_logs(created_at);
CREATE INDEX idx_ai_request_logs_provider_model ON ai_request_logs(provider_name, model_name);
CREATE INDEX idx_synthetic_data_user_id ON synthetic_data_generations(user_id);
CREATE INDEX idx_synthetic_data_type ON synthetic_data_generations(generation_type);
CREATE INDEX idx_ai_model_comparisons_user_id ON ai_model_comparisons(user_id);

-- Enable RLS for security
ALTER TABLE ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE synthetic_data_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_comparisons ENABLE ROW LEVEL SECURITY;

-- Create policies (initially permissive for development)
CREATE POLICY "Allow read access to ai_providers" ON ai_providers FOR SELECT USING (true);
CREATE POLICY "Allow read access to ai_models" ON ai_models FOR SELECT USING (true);
CREATE POLICY "Allow full access to ai_request_logs" ON ai_request_logs USING (true);
CREATE POLICY "Allow full access to synthetic_data_generations" ON synthetic_data_generations USING (true);
CREATE POLICY "Allow full access to ai_model_comparisons" ON ai_model_comparisons USING (true);

-- Restrict api_keys to admin only (for now, no access policy = admin only via service role);