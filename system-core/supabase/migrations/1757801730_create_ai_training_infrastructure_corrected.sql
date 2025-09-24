-- Migration: create_ai_training_infrastructure_corrected
-- Created at: 1757801730

-- Migration: AI Training & Learning System Infrastructure - Corrected
-- Created at: 1757798001
-- Phase 3: AI Training Pipeline, Model Fine-Tuning, and Specialized Agents

-- ============================================================================
-- TRAINING DATA MANAGEMENT
-- ============================================================================

-- AI Training Datasets - Metadata for training data collections
CREATE TABLE IF NOT EXISTS ai_training_datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    dataset_type TEXT NOT NULL CHECK (dataset_type IN (
        'text_generation', 'conversation', 'classification', 'sentiment_analysis',
        'code_completion', 'reasoning', 'creative_writing', 'data_analysis',
        'technical_writing', 'community_moderation', 'trust_evaluation'
    )),
    source_type TEXT NOT NULL CHECK (source_type IN ('synthetic', 'user_generated', 'mixed', 'curated')),
    total_samples INTEGER DEFAULT 0,
    train_split_ratio DECIMAL(3,2) DEFAULT 0.8 CHECK (train_split_ratio > 0 AND train_split_ratio < 1),
    validation_split_ratio DECIMAL(3,2) DEFAULT 0.1,
    test_split_ratio DECIMAL(3,2) DEFAULT 0.1,
    quality_score DECIMAL(3,2) CHECK (quality_score >= 0 AND quality_score <= 5),
    preprocessing_status TEXT DEFAULT 'pending' CHECK (preprocessing_status IN (
        'pending', 'processing', 'completed', 'failed', 'needs_review'
    )),
    training_metadata JSONB DEFAULT '{}',
    data_lineage JSONB DEFAULT '{}',
    privacy_level TEXT DEFAULT 'internal' CHECK (privacy_level IN ('public', 'internal', 'restricted')),
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    archived_at TIMESTAMP WITH TIME ZONE
);

-- Training Data Samples - Individual training examples
CREATE TABLE IF NOT EXISTS training_data_samples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID REFERENCES ai_training_datasets(id) ON DELETE CASCADE,
    sample_index INTEGER NOT NULL,
    split_type TEXT NOT NULL CHECK (split_type IN ('train', 'validation', 'test')),
    input_data JSONB NOT NULL,
    expected_output JSONB NOT NULL,
    sample_metadata JSONB DEFAULT '{}',
    quality_indicators JSONB DEFAULT '{}',
    difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    domain_tags TEXT[] DEFAULT '{}',
    validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN (
        'pending', 'approved', 'rejected', 'needs_review'
    )),
    validated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(dataset_id, sample_index)
);

-- Data Quality Metrics - Quality assessment and validation
CREATE TABLE IF NOT EXISTS data_quality_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID REFERENCES ai_training_datasets(id) ON DELETE CASCADE,
    sample_id UUID REFERENCES training_data_samples(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL CHECK (metric_type IN (
        'coherence', 'relevance', 'diversity', 'bias_detection', 'toxicity',
        'factual_accuracy', 'linguistic_quality', 'task_alignment'
    )),
    metric_score DECIMAL(5,4) NOT NULL CHECK (metric_score >= 0 AND metric_score <= 1),
    metric_details JSONB DEFAULT '{}',
    evaluation_method TEXT,
    evaluated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- MODEL TRAINING & FINE-TUNING
-- ============================================================================

-- Training Jobs - Manage training/fine-tuning operations
CREATE TABLE IF NOT EXISTS ai_training_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name TEXT NOT NULL,
    dataset_id UUID REFERENCES ai_training_datasets(id),
    base_model_provider TEXT REFERENCES ai_providers(id),
    base_model_name TEXT NOT NULL,
    training_type TEXT NOT NULL CHECK (training_type IN (
        'fine_tuning', 'few_shot_learning', 'reinforcement_learning',
        'transfer_learning', 'adapter_training', 'lora_training'
    )),
    training_objective TEXT NOT NULL,
    hyperparameters JSONB DEFAULT '{}',
    training_config JSONB DEFAULT '{}',
    status TEXT DEFAULT 'queued' CHECK (status IN (
        'queued', 'running', 'paused', 'completed', 'failed', 'cancelled'
    )),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
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
    status TEXT DEFAULT 'training' CHECK (status IN (
        'training', 'ready', 'deployed', 'deprecated', 'archived'
    )),
    deployment_url TEXT,
    resource_requirements JSONB DEFAULT '{}',
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(model_name, version_number)
);

-- Training Metrics Timeline - Track metrics over training epochs
CREATE TABLE IF NOT EXISTS training_metrics_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_job_id UUID REFERENCES ai_training_jobs(id) ON DELETE CASCADE,
    epoch_number INTEGER NOT NULL,
    step_number INTEGER DEFAULT 0,
    metrics JSONB NOT NULL,
    validation_metrics JSONB DEFAULT '{}',
    learning_rate DECIMAL(12,10),
    batch_size INTEGER,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(training_job_id, epoch_number, step_number)
);

-- ============================================================================
-- SPECIALIZED AI AGENTS
-- ============================================================================

-- Specialized AI Agents - Custom trained agents for specific domains
CREATE TABLE IF NOT EXISTS specialized_ai_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT NOT NULL,
    specialization_domain TEXT NOT NULL CHECK (specialization_domain IN (
        'code_analysis', 'technical_writing', 'data_analysis', 'creative_content',
        'community_moderation', 'trust_evaluation', 'research_assistance',
        'educational_support', 'business_strategy', 'customer_support'
    )),
    base_model_version_id UUID REFERENCES ai_model_versions(id),
    capabilities JSONB NOT NULL,
    performance_benchmarks JSONB DEFAULT '{}',
    deployment_status TEXT DEFAULT 'development' CHECK (deployment_status IN (
        'development', 'testing', 'staging', 'production', 'maintenance', 'retired'
    )),
    api_endpoint TEXT,
    usage_statistics JSONB DEFAULT '{}',
    last_performance_evaluation TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Agent Specializations - Define domain-specific capabilities
CREATE TABLE IF NOT EXISTS agent_specializations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES specialized_ai_agents(id) ON DELETE CASCADE,
    skill_category TEXT NOT NULL,
    skill_name TEXT NOT NULL,
    proficiency_level TEXT NOT NULL CHECK (proficiency_level IN (
        'novice', 'competent', 'proficient', 'expert', 'master'
    )),
    proficiency_score DECIMAL(3,2) CHECK (proficiency_score >= 0 AND proficiency_score <= 5),
    evaluation_method TEXT,
    last_assessed TIMESTAMP WITH TIME ZONE,
    assessment_details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(agent_id, skill_category, skill_name)
);

-- Agent Performance Benchmarks - Track performance against standards
CREATE TABLE IF NOT EXISTS agent_performance_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES specialized_ai_agents(id) ON DELETE CASCADE,
    benchmark_name TEXT NOT NULL,
    benchmark_category TEXT NOT NULL,
    test_dataset_id UUID REFERENCES ai_training_datasets(id),
    performance_score DECIMAL(5,4) NOT NULL CHECK (performance_score >= 0),
    comparison_baseline DECIMAL(5,4),
    improvement_percentage DECIMAL(5,2),
    test_conditions JSONB DEFAULT '{}',
    detailed_results JSONB DEFAULT '{}',
    tested_at TIMESTAMP WITH TIME ZONE NOT NULL,
    tested_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- LEARNING & OPTIMIZATION SYSTEM
-- ============================================================================

-- User Feedback Logs - Capture user preferences and satisfaction
CREATE TABLE IF NOT EXISTS user_feedback_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    agent_id UUID REFERENCES specialized_ai_agents(id),
    interaction_context TEXT NOT NULL,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN (
        'rating', 'preference', 'correction', 'suggestion', 'complaint', 'compliment'
    )),
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

-- Performance Optimization Logs - Track continuous improvement cycles
CREATE TABLE IF NOT EXISTS performance_optimization_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES specialized_ai_agents(id),
    optimization_type TEXT NOT NULL CHECK (optimization_type IN (
        'hyperparameter_tuning', 'architecture_modification', 'training_data_augmentation',
        'prompt_optimization', 'fine_tuning_adjustment', 'inference_optimization'
    )),
    baseline_metrics JSONB NOT NULL,
    optimization_config JSONB NOT NULL,
    result_metrics JSONB DEFAULT '{}',
    improvement_achieved BOOLEAN,
    improvement_percentage DECIMAL(5,2),
    optimization_insights JSONB DEFAULT '{}',
    implementation_status TEXT DEFAULT 'proposed' CHECK (implementation_status IN (
        'proposed', 'testing', 'validated', 'deployed', 'rejected', 'reverted'
    )),
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    implemented_at TIMESTAMP WITH TIME ZONE
);

-- Training Hyperparameters - Track parameter tuning experiments
CREATE TABLE IF NOT EXISTS training_hyperparameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_job_id UUID REFERENCES ai_training_jobs(id) ON DELETE CASCADE,
    parameter_set_name TEXT NOT NULL,
    learning_rate DECIMAL(12,10),
    batch_size INTEGER,
    num_epochs INTEGER,
    warmup_steps INTEGER,
    weight_decay DECIMAL(8,6),
    dropout_rate DECIMAL(3,2),
    optimizer TEXT,
    scheduler TEXT,
    custom_parameters JSONB DEFAULT '{}',
    final_performance_metrics JSONB DEFAULT '{}',
    training_time_minutes INTEGER,
    resource_cost_usd DECIMAL(10,2),
    effectiveness_score DECIMAL(3,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- ANALYTICS & MONITORING
-- ============================================================================

-- Training Analytics - Overall training system insights
CREATE TABLE IF NOT EXISTS training_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name TEXT NOT NULL,
    metric_category TEXT NOT NULL CHECK (metric_category IN (
        'dataset_quality', 'training_efficiency', 'model_performance',
        'user_satisfaction', 'cost_optimization', 'system_health'
    )),
    metric_value DECIMAL(15,6) NOT NULL,
    metric_unit TEXT,
    time_period TEXT NOT NULL,
    aggregation_method TEXT,
    context_filters JSONB DEFAULT '{}',
    benchmark_comparison JSONB DEFAULT '{}',
    trend_direction TEXT CHECK (trend_direction IN ('improving', 'stable', 'declining', 'unknown')),
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

-- ============================================================================
-- INDEXES AND PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Training Datasets
CREATE INDEX IF NOT EXISTS idx_training_datasets_type_status ON ai_training_datasets(dataset_type, preprocessing_status);
CREATE INDEX IF NOT EXISTS idx_training_datasets_created_by ON ai_training_datasets(created_by);
CREATE INDEX IF NOT EXISTS idx_training_datasets_quality ON ai_training_datasets(quality_score DESC);

-- Training Data Samples
CREATE INDEX IF NOT EXISTS idx_training_samples_dataset_split ON training_data_samples(dataset_id, split_type);
CREATE INDEX IF NOT EXISTS idx_training_samples_validation ON training_data_samples(validation_status);
CREATE INDEX IF NOT EXISTS idx_training_samples_difficulty ON training_data_samples(difficulty_level);

-- Training Jobs
CREATE INDEX IF NOT EXISTS idx_training_jobs_status ON ai_training_jobs(status);
CREATE INDEX IF NOT EXISTS idx_training_jobs_created_by ON ai_training_jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_training_jobs_completion ON ai_training_jobs(completed_at DESC);

-- Specialized Agents
CREATE INDEX IF NOT EXISTS idx_specialized_agents_domain ON specialized_ai_agents(specialization_domain);
CREATE INDEX IF NOT EXISTS idx_specialized_agents_status ON specialized_ai_agents(deployment_status);

-- User Feedback
CREATE INDEX IF NOT EXISTS idx_user_feedback_agent_user ON user_feedback_logs(agent_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON user_feedback_logs(feedback_type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_score ON user_feedback_logs(feedback_score DESC);

-- Analytics
CREATE INDEX IF NOT EXISTS idx_training_analytics_category_time ON training_analytics(metric_category, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_comparisons_agents ON agent_comparison_results(agent_a_id, agent_b_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE ai_training_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_data_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_training_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_metrics_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialized_ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_optimization_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_hyperparameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_comparison_results ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for authenticated users
CREATE POLICY "Allow authenticated read access" ON ai_training_datasets
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON training_data_samples
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON data_quality_metrics
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON ai_training_jobs
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON ai_model_versions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON training_metrics_timeline
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON specialized_ai_agents
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON agent_specializations
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON agent_performance_benchmarks
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON user_feedback_logs
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON performance_optimization_logs
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON training_hyperparameters
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON training_analytics
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON agent_comparison_results
    FOR SELECT TO authenticated USING (true);;