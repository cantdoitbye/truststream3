-- Migration: create_multi_ai_infrastructure
-- Created at: 1757798857

-- Phase 2: Multi-AI Provider Integration & Orchestration System
-- Database Schema for Enterprise-Grade Multi-AI Platform

-- AI Providers Registry
CREATE TABLE ai_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    provider_type VARCHAR(50) NOT NULL, -- 'openai', 'anthropic', 'google', 'custom'
    api_endpoint TEXT NOT NULL,
    model_families JSONB DEFAULT '[]'::jsonb, -- ['gpt-4', 'gpt-3.5', 'dall-e']
    capabilities JSONB DEFAULT '[]'::jsonb, -- ['text_generation', 'image_generation', 'embeddings']
    pricing_info JSONB DEFAULT '{}'::jsonb, -- cost per token, request limits
    rate_limits JSONB DEFAULT '{}'::jsonb, -- requests per minute/hour
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'maintenance'
    health_status VARCHAR(20) DEFAULT 'unknown', -- 'healthy', 'degraded', 'offline'
    last_health_check TIMESTAMPTZ DEFAULT NOW(),
    configuration JSONB DEFAULT '{}'::jsonb, -- provider-specific settings
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Models Registry  
CREATE TABLE ai_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
    model_name VARCHAR(200) NOT NULL,
    model_version VARCHAR(50),
    model_type VARCHAR(50) NOT NULL, -- 'text', 'image', 'audio', 'multimodal'
    context_window INTEGER, -- max tokens/context length
    cost_per_input_token DECIMAL(10,8), -- pricing
    cost_per_output_token DECIMAL(10,8),
    max_output_tokens INTEGER,
    capabilities JSONB DEFAULT '[]'::jsonb, -- specific model capabilities
    performance_metrics JSONB DEFAULT '{}'::jsonb, -- latency, accuracy scores
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider_id, model_name, model_version)
);

-- AI Orchestration Requests
CREATE TABLE ai_orchestration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    request_type VARCHAR(50) NOT NULL, -- 'text_generation', 'synthetic_data', 'comparison'
    task_category VARCHAR(100), -- 'creative_writing', 'data_analysis', 'code_generation'
    input_data JSONB NOT NULL, -- the actual request data
    routing_strategy VARCHAR(50) DEFAULT 'optimal', -- 'optimal', 'cost_effective', 'fastest', 'specific_provider'
    selected_providers UUID[] DEFAULT '{}', -- array of provider IDs to use
    orchestration_config JSONB DEFAULT '{}'::jsonb, -- routing configuration
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    total_cost DECIMAL(10,6) DEFAULT 0,
    processing_time_ms INTEGER,
    error_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- AI Provider Responses
CREATE TABLE ai_provider_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orchestration_request_id UUID NOT NULL REFERENCES ai_orchestration_requests(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES ai_providers(id),
    model_id UUID REFERENCES ai_models(id),
    response_data JSONB NOT NULL,
    quality_score DECIMAL(4,3), -- AI response quality rating 0-1
    latency_ms INTEGER NOT NULL,
    token_usage JSONB, -- input_tokens, output_tokens, total_tokens
    cost DECIMAL(10,6),
    status VARCHAR(50) NOT NULL, -- 'success', 'error', 'timeout'
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Synthetic Data Generation Jobs
CREATE TABLE synthetic_data_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    job_name VARCHAR(200) NOT NULL,
    data_type VARCHAR(50) NOT NULL, -- 'user_profiles', 'conversations', 'scenarios', 'training_examples'
    generation_config JSONB NOT NULL, -- parameters for data generation
    target_quantity INTEGER NOT NULL, -- how many items to generate
    generated_quantity INTEGER DEFAULT 0,
    provider_strategy JSONB DEFAULT '{}'::jsonb, -- which providers to use
    quality_thresholds JSONB DEFAULT '{}'::jsonb, -- minimum quality scores
    status VARCHAR(50) DEFAULT 'queued', -- 'queued', 'running', 'completed', 'failed', 'paused'
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2) DEFAULT 0,
    error_details JSONB,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated Synthetic Data
CREATE TABLE synthetic_data_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES synthetic_data_jobs(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES ai_providers(id),
    data_content JSONB NOT NULL, -- the actual generated data
    quality_score DECIMAL(4,3), -- quality rating 0-1
    validation_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    validation_notes TEXT,
    generation_metadata JSONB DEFAULT '{}'::jsonb, -- model used, cost, etc.
    is_training_ready BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Provider Performance Analytics
CREATE TABLE ai_provider_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES ai_providers(id),
    date DATE NOT NULL,
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    total_cost DECIMAL(12,4) DEFAULT 0,
    avg_latency_ms INTEGER,
    avg_quality_score DECIMAL(4,3),
    uptime_percentage DECIMAL(5,2),
    error_rate DECIMAL(5,2),
    throughput_rpm INTEGER, -- requests per minute average
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider_id, date)
);

-- API Key Management (encrypted)
CREATE TABLE ai_provider_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES ai_providers(id),
    key_name VARCHAR(100) NOT NULL,
    encrypted_key TEXT NOT NULL, -- encrypted API key
    key_status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'expired'
    usage_limit_daily INTEGER, -- daily request limit for this key
    usage_count_today INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider_id, key_name)
);

-- Training Data Infrastructure (Phase 3 preparation)
CREATE TABLE training_data_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_name VARCHAR(200) NOT NULL,
    description TEXT,
    data_type VARCHAR(50) NOT NULL, -- 'conversation', 'user_behavior', 'synthetic'
    source_type VARCHAR(50) NOT NULL, -- 'user_generated', 'synthetic', 'imported'
    quality_threshold DECIMAL(4,3) DEFAULT 0.8,
    total_items INTEGER DEFAULT 0,
    approved_items INTEGER DEFAULT 0,
    training_ready_items INTEGER DEFAULT 0,
    created_by UUID REFERENCES profiles(id),
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'archived', 'processing'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training Data Items
CREATE TABLE training_data_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES training_data_collections(id) ON DELETE CASCADE,
    synthetic_data_id UUID REFERENCES synthetic_data_items(id), -- if sourced from synthetic data
    item_data JSONB NOT NULL,
    quality_score DECIMAL(4,3),
    validation_status VARCHAR(50) DEFAULT 'pending',
    validation_feedback JSONB DEFAULT '{}'::jsonb,
    is_approved BOOLEAN DEFAULT false,
    source_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX idx_ai_providers_status ON ai_providers(status);
CREATE INDEX idx_ai_providers_health ON ai_providers(health_status);
CREATE INDEX idx_ai_models_provider ON ai_models(provider_id);
CREATE INDEX idx_ai_models_type ON ai_models(model_type);
CREATE INDEX idx_orchestration_requests_user ON ai_orchestration_requests(user_id);
CREATE INDEX idx_orchestration_requests_status ON ai_orchestration_requests(status);
CREATE INDEX idx_orchestration_requests_created ON ai_orchestration_requests(created_at);
CREATE INDEX idx_provider_responses_request ON ai_provider_responses(orchestration_request_id);
CREATE INDEX idx_provider_responses_provider ON ai_provider_responses(provider_id);
CREATE INDEX idx_synthetic_jobs_user ON synthetic_data_jobs(user_id);
CREATE INDEX idx_synthetic_jobs_status ON synthetic_data_jobs(status);
CREATE INDEX idx_synthetic_items_job ON synthetic_data_items(job_id);
CREATE INDEX idx_synthetic_items_quality ON synthetic_data_items(quality_score);
CREATE INDEX idx_provider_analytics_date ON ai_provider_analytics(provider_id, date);
CREATE INDEX idx_training_collections_type ON training_data_collections(data_type);
CREATE INDEX idx_training_items_collection ON training_data_items(collection_id);

-- Enable RLS (Row Level Security)
ALTER TABLE ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;  
ALTER TABLE ai_orchestration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_provider_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE synthetic_data_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE synthetic_data_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_provider_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_provider_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_data_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_data_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view public provider info
CREATE POLICY "Anyone can view ai providers" ON ai_providers FOR SELECT USING (true);
CREATE POLICY "Anyone can view ai models" ON ai_models FOR SELECT USING (true);

-- Users can manage their own orchestration requests
CREATE POLICY "Users can view own orchestration requests" ON ai_orchestration_requests 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create orchestration requests" ON ai_orchestration_requests 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view responses to their requests
CREATE POLICY "Users can view own provider responses" ON ai_provider_responses 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM ai_orchestration_requests r WHERE r.id = orchestration_request_id AND r.user_id = auth.uid())
  );

-- Users can manage their own synthetic data jobs
CREATE POLICY "Users can manage own synthetic jobs" ON synthetic_data_jobs 
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own synthetic data items" ON synthetic_data_items 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM synthetic_data_jobs j WHERE j.id = job_id AND j.user_id = auth.uid())
  );

-- Users can view analytics (read-only)
CREATE POLICY "Anyone can view provider analytics" ON ai_provider_analytics FOR SELECT USING (true);

-- Only admins can manage API keys  
CREATE POLICY "Only admins can manage api keys" ON ai_provider_keys FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_role = 'super_admin')
);

-- Users can manage their own training data
CREATE POLICY "Users can manage own training collections" ON training_data_collections 
  FOR ALL USING (auth.uid() = created_by);
CREATE POLICY "Users can manage own training items" ON training_data_items 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM training_data_collections c WHERE c.id = collection_id AND c.created_by = auth.uid())
  );

-- Service role has full access
CREATE POLICY "Service role full access ai_providers" ON ai_providers FOR ALL USING (true);
CREATE POLICY "Service role full access ai_models" ON ai_models FOR ALL USING (true);
CREATE POLICY "Service role full access orchestration_requests" ON ai_orchestration_requests FOR ALL USING (true);
CREATE POLICY "Service role full access provider_responses" ON ai_provider_responses FOR ALL USING (true);
CREATE POLICY "Service role full access synthetic_jobs" ON synthetic_data_jobs FOR ALL USING (true);
CREATE POLICY "Service role full access synthetic_items" ON synthetic_data_items FOR ALL USING (true);
CREATE POLICY "Service role full access provider_analytics" ON ai_provider_analytics FOR ALL USING (true);
CREATE POLICY "Service role full access provider_keys" ON ai_provider_keys FOR ALL USING (true);
CREATE POLICY "Service role full access training_collections" ON training_data_collections FOR ALL USING (true);
CREATE POLICY "Service role full access training_items" ON training_data_items FOR ALL USING (true);;