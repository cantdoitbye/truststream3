-- Migration: create_enterprise_ai_infrastructure
-- Created at: 1757791281

-- AI Usage Tracking and Cost Management
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    cost_estimate DECIMAL(10,6) DEFAULT 0,
    task_type TEXT,
    user_id UUID REFERENCES auth.users(id),
    response_time_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Agent Training History for Specialized AI Development
CREATE TABLE IF NOT EXISTS agent_training_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_type TEXT NOT NULL,
    training_data JSONB,
    ai_analysis JSONB,
    performance_benchmark TEXT DEFAULT 'standard',
    improvement_metrics JSONB,
    specialized_capabilities TEXT[],
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    trained_by UUID REFERENCES auth.users(id)
);

-- Enhanced Trust-Vibe Scores (0.00-5.00 scale)
CREATE TABLE IF NOT EXISTS trust_vibe_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    community_id UUID REFERENCES communities(id),
    content_hash TEXT,
    trust_score DECIMAL(3,2) CHECK (trust_score >= 0.00 AND trust_score <= 5.00),
    vibe_score DECIMAL(3,2) CHECK (vibe_score >= 0.00 AND vibe_score <= 5.00),
    combined_score DECIMAL(3,2) CHECK (combined_score >= 0.00 AND combined_score <= 5.00),
    ai_analysis JSONB,
    calculation_method TEXT DEFAULT 'ai_enhanced',
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now() + interval '30 days')
);

-- Synthetic Data Generation Tracking
CREATE TABLE IF NOT EXISTS synthetic_data_generation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_type TEXT NOT NULL,
    provider TEXT NOT NULL,
    generated_data JSONB NOT NULL,
    quality_score DECIMAL(3,2),
    usage_purpose TEXT,
    validation_status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);

-- AI Provider Performance Metrics
CREATE TABLE IF NOT EXISTS ai_provider_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    task_type TEXT NOT NULL,
    avg_response_time_ms DECIMAL(8,2),
    success_rate DECIMAL(5,4),
    quality_score DECIMAL(3,2),
    cost_per_token DECIMAL(10,8),
    total_requests INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ooumph Integration Tracking
CREATE TABLE IF NOT EXISTS ooumph_integration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    ooumph_user_id TEXT,
    sync_status TEXT DEFAULT 'pending',
    data_payload JSONB,
    sync_direction TEXT CHECK (sync_direction IN ('to_ooumph', 'from_ooumph', 'bidirectional')),
    error_message TEXT,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Multi-AI Task Queue for Batch Processing
CREATE TABLE IF NOT EXISTS ai_task_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_type TEXT NOT NULL,
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    assigned_provider TEXT,
    task_data JSONB NOT NULL,
    requirements JSONB,
    status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'retrying')),
    result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3
);

-- Update existing Enhanced Profiles to support 0.00-5.00 trust scores
ALTER TABLE enhanced_profiles 
ADD COLUMN IF NOT EXISTS trust_score_v2 DECIMAL(3,2) DEFAULT 3.00 CHECK (trust_score_v2 >= 0.00 AND trust_score_v2 <= 5.00),
ADD COLUMN IF NOT EXISTS vibe_score DECIMAL(3,2) DEFAULT 3.00 CHECK (vibe_score >= 0.00 AND vibe_score <= 5.00),
ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trust_calculation_method TEXT DEFAULT 'legacy';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_provider_timestamp ON ai_usage_logs(provider, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trust_vibe_scores_user_community ON trust_vibe_scores(user_id, community_id);
CREATE INDEX IF NOT EXISTS idx_ai_task_queue_status_priority ON ai_task_queue(status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_synthetic_data_type_created ON synthetic_data_generation(data_type, created_at DESC);;