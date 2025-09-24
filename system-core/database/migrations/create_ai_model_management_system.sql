-- AI Model Management System - Comprehensive Schema
-- Enhanced model lifecycle, deployment, monitoring, and optimization

-- Model Lifecycle Management
CREATE TABLE IF NOT EXISTS ai_model_lifecycle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE,
    lifecycle_stage TEXT NOT NULL CHECK (lifecycle_stage IN (
        'development', 'testing', 'staging', 'production', 
        'deprecated', 'archived', 'retired'
    )),
    version_tag TEXT NOT NULL,
    deployment_config JSONB DEFAULT '{}',
    performance_requirements JSONB DEFAULT '{}',
    resource_allocation JSONB DEFAULT '{}',
    approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN (
        'pending', 'approved', 'rejected', 'conditional'
    )),
    approved_by UUID REFERENCES auth.users(id),
    approval_date TIMESTAMP WITH TIME ZONE,
    deployment_date TIMESTAMP WITH TIME ZONE,
    rollback_plan JSONB DEFAULT '{}',
    monitoring_config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(model_id, version_tag)
);

-- Model Deployments - Track active deployments
CREATE TABLE IF NOT EXISTS ai_model_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lifecycle_id UUID REFERENCES ai_model_lifecycle(id) ON DELETE CASCADE,
    deployment_name TEXT NOT NULL,
    environment TEXT NOT NULL CHECK (environment IN (
        'development', 'staging', 'production', 'testing'
    )),
    deployment_type TEXT NOT NULL CHECK (deployment_type IN (
        'blue-green', 'canary', 'rolling', 'direct'
    )),
    endpoint_url TEXT,
    health_check_url TEXT,
    status TEXT DEFAULT 'deploying' CHECK (status IN (
        'deploying', 'healthy', 'unhealthy', 'failed', 'terminated'
    )),
    traffic_percentage DECIMAL(5,2) DEFAULT 0.00 CHECK (traffic_percentage >= 0 AND traffic_percentage <= 100),
    load_balancer_config JSONB DEFAULT '{}',
    scaling_config JSONB DEFAULT '{}',
    security_config JSONB DEFAULT '{}',
    deployment_metadata JSONB DEFAULT '{}',
    deployed_at TIMESTAMP WITH TIME ZONE,
    last_health_check TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Model Performance Monitoring
CREATE TABLE IF NOT EXISTS ai_model_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id UUID REFERENCES ai_model_deployments(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL CHECK (metric_type IN (
        'latency', 'throughput', 'accuracy', 'error_rate', 
        'resource_usage', 'cost', 'user_satisfaction'
    )),
    metric_value DECIMAL(15,6) NOT NULL,
    metric_unit TEXT,
    measurement_context JSONB DEFAULT '{}',
    benchmark_comparison JSONB DEFAULT '{}',
    alert_threshold_breached BOOLEAN DEFAULT false,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    aggregation_period TEXT DEFAULT 'real-time'
);

-- A/B Testing Framework
CREATE TABLE IF NOT EXISTS ai_ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_name TEXT NOT NULL UNIQUE,
    description TEXT,
    model_a_deployment_id UUID REFERENCES ai_model_deployments(id),
    model_b_deployment_id UUID REFERENCES ai_model_deployments(id),
    traffic_split_percentage DECIMAL(5,2) DEFAULT 50.00,
    test_criteria JSONB NOT NULL,
    success_metrics JSONB NOT NULL,
    statistical_significance_threshold DECIMAL(5,4) DEFAULT 0.05,
    minimum_sample_size INTEGER DEFAULT 1000,
    test_duration_hours INTEGER,
    status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft', 'running', 'paused', 'completed', 'terminated'
    )),
    preliminary_results JSONB DEFAULT '{}',
    final_results JSONB DEFAULT '{}',
    winner_model_id UUID,
    confidence_level DECIMAL(5,4),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
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
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Model Fine-tuning Jobs
CREATE TABLE IF NOT EXISTS ai_model_finetuning_jobs (
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
    status TEXT DEFAULT 'queued' CHECK (status IN (
        'queued', 'running', 'completed', 'failed', 'cancelled'
    )),
    progress_percentage INTEGER DEFAULT 0,
    current_epoch INTEGER DEFAULT 0,
    best_validation_loss DECIMAL(15,8),
    training_logs JSONB DEFAULT '{}',
    resource_usage JSONB DEFAULT '{}',
    estimated_completion TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    output_model_path TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Model Optimization Recommendations
CREATE TABLE IF NOT EXISTS ai_model_optimization_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id UUID REFERENCES ai_model_deployments(id),
    recommendation_type TEXT NOT NULL CHECK (recommendation_type IN (
        'performance', 'cost', 'accuracy', 'scaling', 'security'
    )),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    recommendation_title TEXT NOT NULL,
    recommendation_description TEXT NOT NULL,
    implementation_steps JSONB DEFAULT '{}',
    expected_impact JSONB DEFAULT '{}',
    estimated_effort TEXT,
    risk_assessment JSONB DEFAULT '{}',
    status TEXT DEFAULT 'open' CHECK (status IN (
        'open', 'in_progress', 'implemented', 'dismissed', 'expired'
    )),
    implemented_by UUID REFERENCES auth.users(id),
    implemented_at TIMESTAMP WITH TIME ZONE,
    auto_generated BOOLEAN DEFAULT true,
    confidence_score DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Model Usage Analytics
CREATE TABLE IF NOT EXISTS ai_model_usage_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id UUID REFERENCES ai_model_deployments(id) ON DELETE CASCADE,
    user_id UUID,
    request_id TEXT,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_cost DECIMAL(10,6) DEFAULT 0,
    latency_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_type TEXT,
    error_message TEXT,
    user_agent TEXT,
    ip_address INET,
    request_metadata JSONB DEFAULT '{}',
    response_metadata JSONB DEFAULT '{}',
    quality_score DECIMAL(3,2),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Model Alerts and Incidents
CREATE TABLE IF NOT EXISTS ai_model_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id UUID REFERENCES ai_model_deployments(id),
    alert_type TEXT NOT NULL CHECK (alert_type IN (
        'performance_degradation', 'high_error_rate', 'resource_exhaustion',
        'cost_spike', 'security_incident', 'availability_issue'
    )),
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical', 'emergency')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    trigger_conditions JSONB DEFAULT '{}',
    current_values JSONB DEFAULT '{}',
    threshold_values JSONB DEFAULT '{}',
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
    assigned_to UUID REFERENCES auth.users(id),
    escalation_level INTEGER DEFAULT 1,
    escalated_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_model_lifecycle_stage_status ON ai_model_lifecycle(lifecycle_stage, approval_status);
CREATE INDEX IF NOT EXISTS idx_ai_model_deployments_env_status ON ai_model_deployments(environment, status);
CREATE INDEX IF NOT EXISTS idx_ai_model_performance_deployment_metric ON ai_model_performance_metrics(deployment_id, metric_type, recorded_at);
CREATE INDEX IF NOT EXISTS idx_ai_ab_tests_status ON ai_ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_ai_ab_test_results_test_variant ON ai_ab_test_results(ab_test_id, variant);
CREATE INDEX IF NOT EXISTS idx_ai_finetuning_jobs_status ON ai_model_finetuning_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ai_model_usage_deployment_time ON ai_model_usage_analytics(deployment_id, requested_at);
CREATE INDEX IF NOT EXISTS idx_ai_model_alerts_deployment_severity ON ai_model_alerts(deployment_id, severity, status);

-- Enable RLS
ALTER TABLE ai_model_lifecycle ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_ab_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_finetuning_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_optimization_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_alerts ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (authenticated users can read, admins can write)
CREATE POLICY "Allow authenticated read access" ON ai_model_lifecycle FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON ai_model_deployments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON ai_model_performance_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON ai_ab_tests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON ai_ab_test_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON ai_model_finetuning_jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON ai_model_optimization_recommendations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON ai_model_usage_analytics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON ai_model_alerts FOR SELECT TO authenticated USING (true);

-- Admin write policies
CREATE POLICY "Allow admin write access" ON ai_model_lifecycle FOR ALL TO authenticated 
    USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' IN (
        SELECT email FROM profiles WHERE role IN ('admin', 'ai_manager')
    ));

CREATE POLICY "Allow admin write access" ON ai_model_deployments FOR ALL TO authenticated 
    USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' IN (
        SELECT email FROM profiles WHERE role IN ('admin', 'ai_manager')
    ));

CREATE POLICY "Allow admin write access" ON ai_ab_tests FOR ALL TO authenticated 
    USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' IN (
        SELECT email FROM profiles WHERE role IN ('admin', 'ai_manager')
    ));

CREATE POLICY "Allow admin write access" ON ai_model_finetuning_jobs FOR ALL TO authenticated 
    USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' IN (
        SELECT email FROM profiles WHERE role IN ('admin', 'ai_manager')
    ));

-- Allow users to insert their own usage analytics and optimization recommendations
CREATE POLICY "Allow usage analytics insertion" ON ai_model_usage_analytics FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow optimization recommendations insertion" ON ai_model_optimization_recommendations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow alert insertion" ON ai_model_alerts FOR INSERT TO authenticated WITH CHECK (true);
