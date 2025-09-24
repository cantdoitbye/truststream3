-- Migration: create_ai_training_infrastructure_simple
-- Created at: 1757801801

-- Migration: AI Training & Learning System Infrastructure - Simple
-- Created at: 1757798002
-- Phase 3: AI Training Pipeline, Model Fine-Tuning, and Specialized Agents

-- AI Training Datasets - Metadata for training data collections
CREATE TABLE IF NOT EXISTS ai_training_datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    dataset_type TEXT NOT NULL,
    source_type TEXT NOT NULL,
    total_samples INTEGER DEFAULT 0,
    quality_score DECIMAL(3,2) CHECK (quality_score >= 0 AND quality_score <= 5),
    preprocessing_status TEXT DEFAULT 'pending',
    training_metadata JSONB DEFAULT '{}',
    privacy_level TEXT DEFAULT 'internal',
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Training Data Samples - Individual training examples
CREATE TABLE IF NOT EXISTS training_data_samples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID REFERENCES ai_training_datasets(id) ON DELETE CASCADE,
    sample_index INTEGER NOT NULL,
    split_type TEXT NOT NULL,
    input_data JSONB NOT NULL,
    expected_output JSONB NOT NULL,
    sample_metadata JSONB DEFAULT '{}',
    quality_indicators JSONB DEFAULT '{}',
    difficulty_level TEXT,
    domain_tags TEXT[] DEFAULT '{}',
    validation_status TEXT DEFAULT 'pending',
    validated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(dataset_id, sample_index)
);

-- Training Jobs - Manage training/fine-tuning operations
CREATE TABLE IF NOT EXISTS ai_training_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name TEXT NOT NULL,
    dataset_id UUID REFERENCES ai_training_datasets(id),
    base_model_provider TEXT,
    base_model_name TEXT NOT NULL,
    training_type TEXT NOT NULL,
    training_objective TEXT NOT NULL,
    hyperparameters JSONB DEFAULT '{}',
    training_config JSONB DEFAULT '{}',
    status TEXT DEFAULT 'queued',
    progress_percentage INTEGER DEFAULT 0,
    training_metrics JSONB DEFAULT '{}',
    resource_usage JSONB DEFAULT '{}',
    estimated_completion TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Model Versions - Version control for trained models
CREATE TABLE IF NOT EXISTS ai_model_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_job_id UUID REFERENCES ai_training_jobs(id),
    model_name TEXT NOT NULL,
    version_number TEXT NOT NULL,
    base_model TEXT NOT NULL,
    specialization_domain TEXT NOT NULL,
    model_size TEXT,
    performance_metrics JSONB DEFAULT '{}',
    deployment_config JSONB DEFAULT '{}',
    model_artifacts_path TEXT,
    status TEXT DEFAULT 'training',
    deployment_url TEXT,
    resource_requirements JSONB DEFAULT '{}',
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(model_name, version_number)
);

-- Specialized AI Agents - Custom trained agents for specific domains
CREATE TABLE IF NOT EXISTS specialized_ai_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT NOT NULL,
    specialization_domain TEXT NOT NULL,
    base_model_version_id UUID REFERENCES ai_model_versions(id),
    capabilities JSONB NOT NULL,
    performance_benchmarks JSONB DEFAULT '{}',
    deployment_status TEXT DEFAULT 'development',
    api_endpoint TEXT,
    usage_statistics JSONB DEFAULT '{}',
    last_performance_evaluation TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- User Feedback Logs - Capture user preferences and satisfaction
CREATE TABLE IF NOT EXISTS user_feedback_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    agent_id UUID REFERENCES specialized_ai_agents(id),
    interaction_context TEXT NOT NULL,
    feedback_type TEXT NOT NULL,
    feedback_score DECIMAL(3,2) CHECK (feedback_score >= 0 AND feedback_score <= 5),
    feedback_details JSONB NOT NULL,
    user_input JSONB,
    agent_response JSONB,
    preferred_response JSONB,
    response_quality_aspects JSONB DEFAULT '{}',
    learning_insights JSONB DEFAULT '{}',
    processed_for_training BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Training Analytics - Overall training system insights
CREATE TABLE IF NOT EXISTS training_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name TEXT NOT NULL,
    metric_category TEXT NOT NULL,
    metric_value DECIMAL(15,6) NOT NULL,
    metric_unit TEXT,
    time_period TEXT NOT NULL,
    aggregation_method TEXT,
    context_filters JSONB DEFAULT '{}',
    benchmark_comparison JSONB DEFAULT '{}',
    trend_direction TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(metric_name, time_period, recorded_at)
);

-- Agent Comparison Results - A/B testing and performance comparisons
CREATE TABLE IF NOT EXISTS agent_comparison_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comparison_name TEXT NOT NULL,
    agent_a_id UUID REFERENCES specialized_ai_agents(id),
    agent_b_id UUID REFERENCES specialized_ai_agents(id),
    test_dataset_id UUID REFERENCES ai_training_datasets(id),
    comparison_metrics JSONB NOT NULL,
    winner_agent_id UUID,
    confidence_level DECIMAL(3,2),
    sample_size INTEGER,
    test_duration_hours INTEGER,
    detailed_analysis JSONB DEFAULT '{}',
    recommendations TEXT,
    comparison_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE ai_training_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_data_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_training_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialized_ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_comparison_results ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Allow authenticated read access" ON ai_training_datasets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON training_data_samples FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON ai_training_jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON ai_model_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON specialized_ai_agents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON user_feedback_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON training_analytics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON agent_comparison_results FOR SELECT TO authenticated USING (true);;