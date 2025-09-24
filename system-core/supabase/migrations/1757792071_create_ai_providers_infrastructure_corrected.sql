-- Migration: create_ai_providers_infrastructure_corrected
-- Created at: 1757792071

-- Migration: create_ai_providers_table
-- Created at: 1757794000

-- AI Providers table for Multi-AI management
CREATE TABLE IF NOT EXISTS ai_providers (
    id TEXT PRIMARY KEY, -- Using text ID for custom identifiers like 'openai-gpt4'
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('openai', 'anthropic', 'google', 'cohere', 'stability')),
    api_endpoint TEXT NOT NULL,
    status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error')),
    cost_per_1k_tokens DECIMAL(10,6) DEFAULT 0.0,
    avg_response_time_ms INTEGER DEFAULT 0,
    success_rate DECIMAL(5,4) DEFAULT 0.0 CHECK (success_rate >= 0.0 AND success_rate <= 1.0),
    capabilities TEXT[] DEFAULT '{}',
    api_key_configured BOOLEAN DEFAULT false,
    last_health_check TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- AI Models table to track specific models within each provider
CREATE TABLE IF NOT EXISTS ai_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id TEXT REFERENCES ai_providers(id) ON DELETE CASCADE,
    model_name TEXT NOT NULL,
    model_version TEXT,
    context_length INTEGER DEFAULT 4096,
    max_tokens INTEGER DEFAULT 2048,
    supports_functions BOOLEAN DEFAULT false,
    supports_vision BOOLEAN DEFAULT false,
    supports_streaming BOOLEAN DEFAULT true,
    cost_per_1k_input_tokens DECIMAL(10,6) DEFAULT 0.0,
    cost_per_1k_output_tokens DECIMAL(10,6) DEFAULT 0.0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deprecated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(provider_id, model_name)
);

-- API Keys table for secure credential management
CREATE TABLE IF NOT EXISTS ai_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id TEXT REFERENCES ai_providers(id) ON DELETE CASCADE,
    key_name TEXT NOT NULL,
    encrypted_key TEXT NOT NULL, -- Store encrypted API keys
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(provider_id, key_name)
);

-- Insert default AI providers
INSERT INTO ai_providers (id, name, type, api_endpoint, status, cost_per_1k_tokens, avg_response_time_ms, success_rate, capabilities) VALUES
('openai-gpt4', 'OpenAI GPT-4', 'openai', 'https://api.openai.com/v1/chat/completions', 'inactive', 0.030, 2500, 0.98, ARRAY['text-generation', 'conversation', 'code-completion', 'analysis']),
('openai-gpt35', 'OpenAI GPT-3.5 Turbo', 'openai', 'https://api.openai.com/v1/chat/completions', 'inactive', 0.002, 1800, 0.97, ARRAY['text-generation', 'conversation', 'code-completion']),
('anthropic-claude', 'Anthropic Claude', 'anthropic', 'https://api.anthropic.com/v1/messages', 'inactive', 0.025, 3000, 0.97, ARRAY['analysis', 'reasoning', 'writing', 'research']),
('google-gemini', 'Google Gemini Pro', 'google', 'https://generativelanguage.googleapis.com/v1beta/models', 'inactive', 0.020, 2000, 0.96, ARRAY['multimodal', 'image-analysis', 'text-generation', 'translation']),
('cohere-embed', 'Cohere Embed', 'cohere', 'https://api.cohere.ai/v1/embed', 'inactive', 0.010, 1500, 0.99, ARRAY['embeddings', 'search', 'classification', 'clustering']),
('stability-ai', 'Stability AI SDXL', 'stability', 'https://api.stability.ai/v1/generation', 'inactive', 0.050, 8000, 0.94, ARRAY['image-generation', 'image-editing', 'style-transfer'])
ON CONFLICT (id) DO NOTHING;

-- Insert default models for each provider
INSERT INTO ai_models (provider_id, model_name, model_version, context_length, max_tokens, supports_functions, cost_per_1k_input_tokens, cost_per_1k_output_tokens) VALUES
-- OpenAI Models
('openai-gpt4', 'gpt-4', '0125', 128000, 4096, true, 0.010, 0.030),
('openai-gpt4', 'gpt-4-turbo-preview', 'latest', 128000, 4096, true, 0.010, 0.030),
('openai-gpt35', 'gpt-3.5-turbo', '0125', 16000, 4096, true, 0.0005, 0.0015),
-- Anthropic Models
('anthropic-claude', 'claude-3-opus', 'latest', 200000, 4096, false, 0.015, 0.075),
('anthropic-claude', 'claude-3-sonnet', 'latest', 200000, 4096, false, 0.003, 0.015),
-- Google Models
('google-gemini', 'gemini-pro', 'latest', 32000, 8192, true, 0.0005, 0.0015),
('google-gemini', 'gemini-pro-vision', 'latest', 16000, 2048, false, 0.0005, 0.0015),
-- Cohere Models
('cohere-embed', 'embed-english-v3.0', 'v3.0', 2048, 0, false, 0.0001, 0.0000),
('cohere-embed', 'embed-multilingual-v3.0', 'v3.0', 2048, 0, false, 0.0001, 0.0000),
-- Stability AI Models
('stability-ai', 'stable-diffusion-xl-1024-v1-0', 'v1.0', 0, 0, false, 0.040, 0.000),
('stability-ai', 'stable-diffusion-v1-6', 'v1.6', 0, 0, false, 0.020, 0.000)
ON CONFLICT (provider_id, model_name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_providers_type_status ON ai_providers(type, status);
CREATE INDEX IF NOT EXISTS idx_ai_providers_status ON ai_providers(status);
CREATE INDEX IF NOT EXISTS idx_ai_models_provider_status ON ai_models(provider_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_api_keys_provider_active ON ai_api_keys(provider_id, is_active);

-- Enable RLS (Row Level Security)
ALTER TABLE ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_providers (allow all authenticated users to read, only admins to write)
CREATE POLICY "Allow authenticated users to view AI providers" ON ai_providers
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admins to manage AI providers" ON ai_providers
    FOR ALL TO authenticated 
    USING (auth.jwt() ->> 'email' IN (
        SELECT email FROM profiles WHERE is_admin = true
    ));

-- RLS Policies for ai_models
CREATE POLICY "Allow authenticated users to view AI models" ON ai_models
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admins to manage AI models" ON ai_models
    FOR ALL TO authenticated 
    USING (auth.jwt() ->> 'email' IN (
        SELECT email FROM profiles WHERE is_admin = true
    ));

-- RLS Policies for ai_api_keys (only admins can manage)
CREATE POLICY "Allow admins to manage API keys" ON ai_api_keys
    FOR ALL TO authenticated 
    USING (auth.jwt() ->> 'email' IN (
        SELECT email FROM profiles WHERE is_admin = true
    ));;