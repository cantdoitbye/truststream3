-- Migration: AI Model Management System
-- Created at: 1758420000
-- Comprehensive AI model lifecycle, deployment, monitoring, and optimization system

-- Model Lifecycle Management
CREATE TABLE IF NOT EXISTS ai_model_lifecycle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE,
    lifecycle_stage TEXT NOT NULL CHECK (lifecycle_stage IN ('development', 'testing', 'staging', 'production', 'deprecated', 'archived', 'retired')),
    version_tag TEXT NOT NULL,
    deployment_config JSONB DEFAULT '{}',
    performance_requirements JSONB DEFAULT '{}',
    resource_allocation JSONB DEFAULT '{}',
    approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'conditional')),
    approved_by UUID,
    approval_date TIMESTAMP WITH TIME ZONE,
    deployment_date TIMESTAMP WITH TIME ZONE,
    rollback_plan JSONB DEFAULT '{}',
    monitoring_config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(model_id, version_tag)
);

-- Model Deployments
CREATE TABLE IF NOT EXISTS ai_model_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lifecycle_id UUID REFERENCES ai_model_lifecycle(id) ON DELETE CASCADE,
    deployment_name TEXT NOT NULL,
    environment TEXT NOT NULL CHECK (environment IN ('development', 'staging', 'production', 'testing')),
    deployment_type TEXT NOT NULL CHECK (deployment_type IN ('blue-green', 'canary', 'rolling', 'direct')),
    endpoint_url TEXT,
    health_check_url TEXT,
    status TEXT NOT NULL DEFAULT 'deploying' CHECK (status IN ('deploying', 'healthy', 'unhealthy', 'failed', 'terminated')),
    traffic_percentage INTEGER DEFAULT 0 CHECK (traffic_percentage >= 0 AND traffic_percentage <= 100),
    load_balancer_config JSONB DEFAULT '{}',
    scaling_config JSONB DEFAULT '{}',
    security_config JSONB DEFAULT '{}',
    deployment_metadata JSONB DEFAULT '{}',
    deployed_at TIMESTAMP WITH TIME ZONE,
    last_health_check TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Performance Metrics
CREATE TABLE IF NOT EXISTS ai_model_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id UUID REFERENCES ai_model_deployments(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL CHECK (metric_type IN ('latency', 'throughput', 'accuracy', 'error_rate', 'resource_usage', 'cost', 'user_satisfaction')),
    metric_value DECIMAL(15,6) NOT NULL,
    metric_unit TEXT,
    measurement_context JSONB DEFAULT '{}',
    benchmark_comparison JSONB DEFAULT '{}',
    alert_threshold_breached BOOLEAN DEFAULT false,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    aggregation_period TEXT DEFAULT 'real-time'
);

-- A/B Tests
CREATE TABLE IF NOT EXISTS ai_ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_name TEXT NOT NULL UNIQUE,
    description TEXT,
    model_a_deployment_id UUID REFERENCES ai_model_deployments(id),
    model_b_deployment_id UUID REFERENCES ai_model_deployments(id),
    traffic_split_percentage INTEGER DEFAULT 50 CHECK (traffic_split_percentage >= 0 AND traffic_split_percentage <= 100),
    test_criteria JSONB NOT NULL,
    success_metrics JSONB NOT NULL,
    statistical_significance_threshold DECIMAL(3,3) DEFAULT 0.05,
    minimum_sample_size INTEGER DEFAULT 1000,
    test_duration_hours INTEGER,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'terminated')),
    preliminary_results JSONB DEFAULT '{}',
    final_results JSONB DEFAULT '{}',
    winner_model_id UUID,
    confidence_level DECIMAL(3,2),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- A/B Test Results
CREATE TABLE IF NOT EXISTS ai_ab_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ab_test_id UUID REFERENCES ai_ab_tests(id) ON DELETE CASCADE,
    variant TEXT NOT NULL CHECK (variant IN ('A', 'B')),
    user_session_id TEXT,
    request_id TEXT,
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(15,6),
    response_quality_score DECIMAL(3,2),
    user_feedback_score DECIMAL(3,2),
    latency_ms INTEGER,
    error_occurred BOOLEAN DEFAULT false,
    context_metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Fine-Tuning Jobs (extending existing training infrastructure)
CREATE TABLE IF NOT EXISTS ai_fine_tuning_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_model_id UUID REFERENCES ai_models(id),
    training_dataset_id UUID REFERENCES ai_training_datasets(id),
    validation_dataset_id UUID REFERENCES ai_training_datasets(id),
    job_name TEXT NOT NULL,
    fine_tuning_objective TEXT NOT NULL,
    hyperparameters JSONB DEFAULT '{}',
    training_config JSONB DEFAULT '{}',
    optimization_strategy TEXT DEFAULT 'adam',
    learning_rate DECIMAL(10,8) DEFAULT 0.0001,
    batch_size INTEGER DEFAULT 32,
    epochs INTEGER DEFAULT 10,
    early_stopping_config JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    current_epoch INTEGER DEFAULT 0,
    best_validation_loss DECIMAL(15,6),
    training_logs JSONB DEFAULT '{}',
    resource_usage JSONB DEFAULT '{}',
    estimated_completion TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    output_model_path TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Optimization Recommendations
CREATE TABLE IF NOT EXISTS ai_optimization_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id UUID REFERENCES ai_model_deployments(id) ON DELETE CASCADE,
    recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('performance', 'cost', 'accuracy', 'scaling', 'security')),
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    recommendation_title TEXT NOT NULL,
    recommendation_description TEXT NOT NULL,
    implementation_steps JSONB NOT NULL,
    expected_impact JSONB NOT NULL,
    estimated_effort TEXT,
    risk_assessment JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'implemented', 'dismissed', 'expired')),
    implemented_by UUID,
    implemented_at TIMESTAMP WITH TIME ZONE,
    auto_generated BOOLEAN DEFAULT false,
    confidence_score DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Model Usage Analytics
CREATE TABLE IF NOT EXISTS ai_model_usage_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id UUID REFERENCES ai_model_deployments(id) ON DELETE CASCADE,
    user_id UUID,
    request_id TEXT UNIQUE NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_cost DECIMAL(10,6) NOT NULL DEFAULT 0,
    latency_ms INTEGER,
    success BOOLEAN NOT NULL DEFAULT true,
    error_type TEXT,
    error_message TEXT,
    user_agent TEXT,
    ip_address INET,
    request_metadata JSONB DEFAULT '{}',
    response_metadata JSONB DEFAULT '{}',
    quality_score DECIMAL(3,2),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Model Alerts
CREATE TABLE IF NOT EXISTS ai_model_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id UUID REFERENCES ai_model_deployments(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('performance_degradation', 'high_error_rate', 'resource_exhaustion', 'cost_spike', 'security_incident', 'availability_issue')),
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical', 'emergency')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    trigger_conditions JSONB NOT NULL,
    current_values JSONB NOT NULL,
    threshold_values JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
    assigned_to UUID,
    escalation_level INTEGER DEFAULT 1,
    escalated_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_model_lifecycle_model_stage ON ai_model_lifecycle(model_id, lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_ai_model_deployments_lifecycle_env ON ai_model_deployments(lifecycle_id, environment);
CREATE INDEX IF NOT EXISTS idx_ai_model_deployments_status ON ai_model_deployments(status);
CREATE INDEX IF NOT EXISTS idx_ai_performance_metrics_deployment_type ON ai_model_performance_metrics(deployment_id, metric_type);
CREATE INDEX IF NOT EXISTS idx_ai_performance_metrics_recorded_at ON ai_model_performance_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_ab_tests_status ON ai_ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_ai_ab_test_results_test_variant ON ai_ab_test_results(ab_test_id, variant);
CREATE INDEX IF NOT EXISTS idx_ai_fine_tuning_jobs_status ON ai_fine_tuning_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ai_optimization_recommendations_deployment_priority ON ai_optimization_recommendations(deployment_id, priority);
CREATE INDEX IF NOT EXISTS idx_ai_usage_analytics_deployment_time ON ai_model_usage_analytics(deployment_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_model_alerts_deployment_status ON ai_model_alerts(deployment_id, status);

-- Enable Row Level Security
ALTER TABLE ai_model_lifecycle ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_ab_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_fine_tuning_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_optimization_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- AI Model Lifecycle
CREATE POLICY "Allow authenticated users to view model lifecycle" ON ai_model_lifecycle
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage model lifecycle" ON ai_model_lifecycle
    FOR ALL TO authenticated USING (true);

-- AI Model Deployments
CREATE POLICY "Allow authenticated users to view deployments" ON ai_model_deployments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage deployments" ON ai_model_deployments
    FOR ALL TO authenticated USING (true);

-- Performance Metrics
CREATE POLICY "Allow authenticated users to view performance metrics" ON ai_model_performance_metrics
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow system to record performance metrics" ON ai_model_performance_metrics
    FOR INSERT TO authenticated WITH CHECK (true);

-- A/B Tests
CREATE POLICY "Allow authenticated users to view A/B tests" ON ai_ab_tests
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage A/B tests" ON ai_ab_tests
    FOR ALL TO authenticated USING (true);

-- A/B Test Results
CREATE POLICY "Allow authenticated users to view A/B test results" ON ai_ab_test_results
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow system to record A/B test results" ON ai_ab_test_results
    FOR INSERT TO authenticated WITH CHECK (true);

-- Fine-Tuning Jobs
CREATE POLICY "Allow authenticated users to view fine-tuning jobs" ON ai_fine_tuning_jobs
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage fine-tuning jobs" ON ai_fine_tuning_jobs
    FOR ALL TO authenticated USING (true);

-- Optimization Recommendations
CREATE POLICY "Allow authenticated users to view optimization recommendations" ON ai_optimization_recommendations
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow system to create optimization recommendations" ON ai_optimization_recommendations
    FOR INSERT TO authenticated WITH CHECK (true);

-- Usage Analytics
CREATE POLICY "Allow authenticated users to view usage analytics" ON ai_model_usage_analytics
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow system to record usage analytics" ON ai_model_usage_analytics
    FOR INSERT TO authenticated WITH CHECK (true);

-- Model Alerts
CREATE POLICY "Allow authenticated users to view model alerts" ON ai_model_alerts
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow system to create model alerts" ON ai_model_alerts
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage model alerts" ON ai_model_alerts
    FOR UPDATE TO authenticated USING (true);