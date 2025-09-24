-- Migration: create_missing_multi_ai_tables
-- Created at: 1757798934

-- Phase 2: Create Missing Multi-AI Infrastructure Tables
-- Only create tables that don't exist yet

-- AI Orchestration Requests (NEW)
CREATE TABLE IF NOT EXISTS ai_orchestration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    request_type VARCHAR(50) NOT NULL, -- 'text_generation', 'synthetic_data', 'comparison'
    task_category VARCHAR(100), -- 'creative_writing', 'data_analysis', 'code_generation'  
    input_data JSONB NOT NULL, -- the actual request data
    routing_strategy VARCHAR(50) DEFAULT 'optimal', -- 'optimal', 'cost_effective', 'fastest', 'specific_provider'
    selected_providers TEXT[] DEFAULT '{}', -- array of provider names to use
    orchestration_config JSONB DEFAULT '{}'::jsonb, -- routing configuration
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    total_cost DECIMAL(10,6) DEFAULT 0,
    processing_time_ms INTEGER,
    error_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- AI Provider Responses (NEW)
CREATE TABLE IF NOT EXISTS ai_provider_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orchestration_request_id UUID NOT NULL REFERENCES ai_orchestration_requests(id) ON DELETE CASCADE,
    provider_name TEXT NOT NULL, -- reference to ai_providers.name
    model_used TEXT, -- which model was used
    response_data JSONB NOT NULL,
    quality_score DECIMAL(4,3), -- AI response quality rating 0-1
    latency_ms INTEGER NOT NULL,
    token_usage JSONB, -- input_tokens, output_tokens, total_tokens
    cost DECIMAL(10,6),
    status VARCHAR(50) NOT NULL, -- 'success', 'error', 'timeout'
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced Synthetic Data Jobs (NEW)
CREATE TABLE IF NOT EXISTS synthetic_data_jobs (
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

-- AI Provider Analytics (NEW)
CREATE TABLE IF NOT EXISTS ai_provider_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name TEXT NOT NULL, -- reference to ai_providers.name
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
    UNIQUE(provider_name, date)
);

-- Training Data Collections (NEW)
CREATE TABLE IF NOT EXISTS training_data_collections (
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

-- Training Data Items (NEW)
CREATE TABLE IF NOT EXISTS training_data_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES training_data_collections(id) ON DELETE CASCADE,
    synthetic_data_id UUID, -- reference to existing synthetic_data_items.id
    item_data JSONB NOT NULL,
    quality_score DECIMAL(4,3),
    validation_status VARCHAR(50) DEFAULT 'pending',
    validation_feedback JSONB DEFAULT '{}'::jsonb,
    is_approved BOOLEAN DEFAULT false,
    source_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Multi-AI Comparison Sessions (NEW)
CREATE TABLE IF NOT EXISTS multi_ai_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    session_name VARCHAR(200),
    prompt_text TEXT NOT NULL,
    comparison_criteria JSONB DEFAULT '{}'::jsonb, -- criteria for evaluation
    total_responses INTEGER DEFAULT 0,
    best_response_id UUID, -- reference to ai_provider_responses.id
    user_preference VARCHAR(100), -- which provider user preferred
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_orchestration_requests_user ON ai_orchestration_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_orchestration_requests_status ON ai_orchestration_requests(status);
CREATE INDEX IF NOT EXISTS idx_orchestration_requests_created ON ai_orchestration_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_provider_responses_request ON ai_provider_responses(orchestration_request_id);
CREATE INDEX IF NOT EXISTS idx_provider_responses_provider ON ai_provider_responses(provider_name);
CREATE INDEX IF NOT EXISTS idx_synthetic_jobs_user ON synthetic_data_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_synthetic_jobs_status ON synthetic_data_jobs(status);
CREATE INDEX IF NOT EXISTS idx_provider_analytics_date ON ai_provider_analytics(provider_name, date);
CREATE INDEX IF NOT EXISTS idx_training_collections_type ON training_data_collections(data_type);
CREATE INDEX IF NOT EXISTS idx_training_items_collection ON training_data_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_multi_ai_comparisons_user ON multi_ai_comparisons(user_id);

-- Enable RLS
ALTER TABLE ai_orchestration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_provider_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE synthetic_data_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_provider_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_data_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_data_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE multi_ai_comparisons ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can manage their own requests
CREATE POLICY "Users manage own orchestration requests" ON ai_orchestration_requests 
  FOR ALL USING (auth.uid() = user_id);

-- Users can view responses to their requests
CREATE POLICY "Users view own provider responses" ON ai_provider_responses 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM ai_orchestration_requests r WHERE r.id = orchestration_request_id AND r.user_id = auth.uid())
  );

-- Users can manage their own synthetic data jobs
CREATE POLICY "Users manage own synthetic jobs" ON synthetic_data_jobs 
  FOR ALL USING (auth.uid() = user_id);

-- Anyone can view analytics (read-only)
CREATE POLICY "Anyone can view provider analytics" ON ai_provider_analytics FOR SELECT USING (true);

-- Users can manage their own training data
CREATE POLICY "Users manage own training collections" ON training_data_collections 
  FOR ALL USING (auth.uid() = created_by);
CREATE POLICY "Users manage own training items" ON training_data_items 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM training_data_collections c WHERE c.id = collection_id AND c.created_by = auth.uid())
  );

-- Users can manage their own comparison sessions
CREATE POLICY "Users manage own comparisons" ON multi_ai_comparisons 
  FOR ALL USING (auth.uid() = user_id);

-- Service role has full access to all tables
CREATE POLICY "Service role full access orchestration_requests" ON ai_orchestration_requests FOR ALL USING (true);
CREATE POLICY "Service role full access provider_responses" ON ai_provider_responses FOR ALL USING (true);
CREATE POLICY "Service role full access synthetic_jobs" ON synthetic_data_jobs FOR ALL USING (true);
CREATE POLICY "Service role full access provider_analytics" ON ai_provider_analytics FOR ALL USING (true);
CREATE POLICY "Service role full access training_collections" ON training_data_collections FOR ALL USING (true);
CREATE POLICY "Service role full access training_items" ON training_data_items FOR ALL USING (true);
CREATE POLICY "Service role full access multi_ai_comparisons" ON multi_ai_comparisons FOR ALL USING (true);;