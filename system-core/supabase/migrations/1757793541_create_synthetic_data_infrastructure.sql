-- Migration: create_synthetic_data_infrastructure
-- Created at: 1757793541

-- Create synthetic data storage tables
CREATE TABLE IF NOT EXISTS synthetic_data_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_type TEXT NOT NULL,
    generated_count INTEGER NOT NULL,
    quality_score DECIMAL(3,2),
    requirements JSONB DEFAULT '{}',
    generation_metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS synthetic_data_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES synthetic_data_batches(id) ON DELETE CASCADE,
    data_type TEXT NOT NULL,
    content JSONB NOT NULL,
    quality_indicators JSONB DEFAULT '{}',
    validation_status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI training data tables
CREATE TABLE IF NOT EXISTS ai_training_datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    dataset_type TEXT NOT NULL, -- 'community_interactions', 'trust_scenarios', etc.
    source_type TEXT NOT NULL, -- 'synthetic', 'real', 'mixed'
    total_samples INTEGER DEFAULT 0,
    quality_score DECIMAL(3,2),
    training_metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_training_samples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID REFERENCES ai_training_datasets(id) ON DELETE CASCADE,
    input_data JSONB NOT NULL,
    expected_output JSONB,
    sample_metadata JSONB DEFAULT '{}',
    quality_score DECIMAL(3,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Specialized agent models
CREATE TABLE IF NOT EXISTS specialized_ai_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    agent_type TEXT NOT NULL,
    specialization TEXT NOT NULL,
    model_config JSONB DEFAULT '{}',
    training_datasets UUID[] DEFAULT '{}',
    performance_metrics JSONB DEFAULT '{}',
    status TEXT DEFAULT 'training', -- 'training', 'active', 'retired'
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced trust-vibe system (0.00-5.00 scale)
CREATE TABLE IF NOT EXISTS trust_vibe_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    community_id UUID REFERENCES communities(id),
    trust_score DECIMAL(3,2) NOT NULL CHECK (trust_score >= 0.00 AND trust_score <= 5.00),
    vibe_score DECIMAL(3,2) NOT NULL CHECK (vibe_score >= 0.00 AND vibe_score <= 5.00),
    calculation_method TEXT DEFAULT 'ai_enhanced',
    contributing_factors JSONB DEFAULT '{}',
    confidence_level DECIMAL(3,2) DEFAULT 0.80,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Ooumph integration framework
CREATE TABLE IF NOT EXISTS ooumph_integration_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_type TEXT NOT NULL,
    api_endpoints JSONB DEFAULT '{}',
    sync_settings JSONB DEFAULT '{}',
    data_mapping JSONB DEFAULT '{}',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ooumph_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_type TEXT NOT NULL,
    operation TEXT NOT NULL, -- 'import', 'export', 'sync'
    records_processed INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    sync_metadata JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Enable RLS on all new tables
ALTER TABLE synthetic_data_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE synthetic_data_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_training_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_training_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialized_ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_vibe_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE ooumph_integration_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ooumph_sync_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated access
CREATE POLICY "Enable all for authenticated users" ON synthetic_data_batches FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON synthetic_data_items FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON ai_training_datasets FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON ai_training_samples FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON specialized_ai_agents FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON trust_vibe_scores FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON ooumph_integration_config FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON ooumph_sync_logs FOR ALL USING (true);

-- Add indexes for performance
CREATE INDEX synthetic_data_batches_type_idx ON synthetic_data_batches(data_type);
CREATE INDEX synthetic_data_items_batch_idx ON synthetic_data_items(batch_id);
CREATE INDEX ai_training_datasets_type_idx ON ai_training_datasets(dataset_type);
CREATE INDEX ai_training_samples_dataset_idx ON ai_training_samples(dataset_id);
CREATE INDEX specialized_agents_type_idx ON specialized_ai_agents(agent_type);
CREATE INDEX trust_vibe_scores_user_idx ON trust_vibe_scores(user_id);
CREATE INDEX trust_vibe_scores_community_idx ON trust_vibe_scores(community_id);
CREATE INDEX ooumph_sync_logs_type_idx ON ooumph_sync_logs(integration_type);;