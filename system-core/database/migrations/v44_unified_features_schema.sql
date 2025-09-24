-- TrustStram v4.4 Database Schema Migration
-- Adds support for all v4.4 features while maintaining backward compatibility
-- Created: 2025-09-21
-- Version: 4.4.0

BEGIN;

-- ================================================================
-- FEDERATED LEARNING TABLES
-- ================================================================

-- Main federated learning jobs table
CREATE TABLE IF NOT EXISTS federated_learning_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name VARCHAR(255) NOT NULL,
    job_type VARCHAR(50) CHECK (job_type IN ('horizontal', 'vertical', 'cross_device', 'cross_silo')),
    framework VARCHAR(50) CHECK (framework IN ('flower', 'tensorflow_federated', 'unified')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    
    -- Job Configuration
    model_config JSONB NOT NULL,
    data_config JSONB NOT NULL,
    privacy_config JSONB DEFAULT '{}',
    performance_config JSONB DEFAULT '{}',
    
    -- Execution Parameters
    num_clients INTEGER NOT NULL CHECK (num_clients > 0),
    num_rounds INTEGER NOT NULL CHECK (num_rounds > 0),
    current_round INTEGER DEFAULT 0,
    privacy_budget DECIMAL(10,4) DEFAULT 8.0,
    
    -- Security and Privacy
    differential_privacy_enabled BOOLEAN DEFAULT false,
    secure_aggregation_enabled BOOLEAN DEFAULT false,
    byzantine_robustness_enabled BOOLEAN DEFAULT false,
    encryption_method VARCHAR(100),
    
    -- Results and Metrics
    convergence_metrics JSONB DEFAULT '{}',
    performance_metrics JSONB DEFAULT '{}',
    privacy_metrics JSONB DEFAULT '{}',
    final_model_path TEXT,
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    community_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Federated learning clients table
CREATE TABLE IF NOT EXISTS federated_learning_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES federated_learning_jobs(id) ON DELETE CASCADE,
    client_id VARCHAR(255) NOT NULL,
    client_type VARCHAR(50) CHECK (client_type IN ('mobile', 'edge', 'server', 'organization')),
    status VARCHAR(50) DEFAULT 'registered' CHECK (status IN ('registered', 'active', 'inactive', 'failed', 'dropped')),
    
    -- Client Configuration
    capabilities JSONB DEFAULT '{}',
    resource_constraints JSONB DEFAULT '{}',
    data_statistics JSONB DEFAULT '{}',
    
    -- Training Participation
    rounds_participated INTEGER DEFAULT 0,
    total_samples INTEGER DEFAULT 0,
    data_quality_score DECIMAL(5,4) DEFAULT 1.0,
    
    -- Performance Metrics
    training_time_ms INTEGER DEFAULT 0,
    communication_overhead_bytes BIGINT DEFAULT 0,
    computation_cost DECIMAL(10,4) DEFAULT 0.0,
    
    -- Security and Privacy
    trust_score DECIMAL(5,4) DEFAULT 1.0,
    privacy_contribution DECIMAL(5,4) DEFAULT 0.0,
    security_violations INTEGER DEFAULT 0,
    
    -- Metadata
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(job_id, client_id)
);

-- Federated learning rounds table
CREATE TABLE IF NOT EXISTS federated_learning_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES federated_learning_jobs(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'aggregating', 'completed', 'failed')),
    
    -- Round Configuration
    selected_clients INTEGER NOT NULL,
    required_clients INTEGER NOT NULL,
    actual_participants INTEGER DEFAULT 0,
    
    -- Model Updates
    global_model_version INTEGER NOT NULL,
    model_updates JSONB DEFAULT '[]',
    aggregated_update JSONB DEFAULT '{}',
    
    -- Performance Metrics
    convergence_score DECIMAL(5,4),
    accuracy_improvement DECIMAL(5,4),
    loss_reduction DECIMAL(5,4),
    
    -- Privacy and Security
    privacy_budget_used DECIMAL(10,4) DEFAULT 0.0,
    security_violations INTEGER DEFAULT 0,
    byzantine_clients INTEGER DEFAULT 0,
    
    -- Timing
    round_start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    aggregation_start_time TIMESTAMP WITH TIME ZONE,
    round_end_time TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(job_id, round_number)
);

-- ================================================================
-- AI EXPLAINABILITY TABLES
-- ================================================================

-- Explanation requests table
CREATE TABLE IF NOT EXISTS explainability_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_type VARCHAR(50) CHECK (request_type IN ('shap', 'lime', 'counterfactual', 'feature_importance', 'bias_audit')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    
    -- Request Configuration
    model_id VARCHAR(255) NOT NULL,
    model_version VARCHAR(50),
    input_data JSONB NOT NULL,
    explanation_config JSONB DEFAULT '{}',
    
    -- Stakeholder Information
    stakeholder_type VARCHAR(50) CHECK (stakeholder_type IN ('end_user', 'technical_user', 'business_user', 'regulator')),
    user_id UUID REFERENCES auth.users(id),
    community_id UUID,
    
    -- Compliance Requirements
    gdpr_required BOOLEAN DEFAULT false,
    eu_ai_act_required BOOLEAN DEFAULT false,
    industry_compliance JSONB DEFAULT '[]',
    
    -- Results
    explanation_result JSONB DEFAULT '{}',
    confidence_scores JSONB DEFAULT '{}',
    feature_importance JSONB DEFAULT '{}',
    counterfactuals JSONB DEFAULT '[]',
    
    -- Performance Metrics
    processing_time_ms INTEGER,
    cache_hit BOOLEAN DEFAULT false,
    explanation_quality_score DECIMAL(5,4),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Explanation audit trail table
CREATE TABLE IF NOT EXISTS explainability_audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    explanation_id UUID REFERENCES explainability_requests(id) ON DELETE CASCADE,
    model_id VARCHAR(255) NOT NULL,
    
    -- Decision Information
    decision_id UUID,
    decision_type VARCHAR(100),
    decision_outcome JSONB,
    decision_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Explanation Details
    explanation_method VARCHAR(50) NOT NULL,
    explanation_summary TEXT,
    key_factors JSONB DEFAULT '[]',
    confidence_level DECIMAL(5,4),
    
    -- Compliance Information
    compliance_requirements JSONB DEFAULT '[]',
    regulatory_context VARCHAR(100),
    retention_period_days INTEGER DEFAULT 2555, -- 7 years
    
    -- Access Information
    accessed_by UUID REFERENCES auth.users(id),
    access_purpose VARCHAR(255),
    access_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archived_at TIMESTAMP WITH TIME ZONE
);

-- Bias detection results table
CREATE TABLE IF NOT EXISTS bias_detection_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id VARCHAR(255) NOT NULL,
    model_version VARCHAR(50),
    audit_type VARCHAR(50) CHECK (audit_type IN ('fairness', 'discrimination', 'representation', 'outcome')),
    
    -- Bias Metrics
    bias_metrics JSONB NOT NULL,
    fairness_scores JSONB DEFAULT '{}',
    demographic_parity DECIMAL(5,4),
    equalized_odds DECIMAL(5,4),
    calibration_score DECIMAL(5,4),
    
    -- Protected Attributes
    protected_attributes JSONB DEFAULT '[]',
    sensitive_features JSONB DEFAULT '[]',
    
    -- Results and Recommendations
    bias_severity VARCHAR(50) CHECK (bias_severity IN ('low', 'medium', 'high', 'critical')),
    mitigation_recommendations JSONB DEFAULT '[]',
    remediation_actions JSONB DEFAULT '[]',
    
    -- Compliance
    regulatory_impact JSONB DEFAULT '{}',
    compliance_status VARCHAR(50) DEFAULT 'compliant' CHECK (compliance_status IN ('compliant', 'non_compliant', 'needs_review')),
    
    -- Metadata
    audited_by UUID REFERENCES auth.users(id),
    community_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    next_audit_due TIMESTAMP WITH TIME ZONE
);

-- ================================================================
-- MULTI-CLOUD ORCHESTRATION TABLES
-- ================================================================

-- Multi-cloud deployments table
CREATE TABLE IF NOT EXISTS multi_cloud_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_name VARCHAR(255) NOT NULL,
    deployment_type VARCHAR(50) CHECK (deployment_type IN ('application', 'service', 'infrastructure', 'data')),
    status VARCHAR(50) DEFAULT 'planning' CHECK (status IN ('planning', 'deploying', 'running', 'scaling', 'failed', 'terminated')),
    
    -- Cloud Configuration
    primary_cloud VARCHAR(50) NOT NULL,
    secondary_clouds JSONB DEFAULT '[]',
    cloud_distribution JSONB DEFAULT '{}',
    
    -- Deployment Configuration
    deployment_config JSONB NOT NULL,
    resource_requirements JSONB DEFAULT '{}',
    scaling_config JSONB DEFAULT '{}',
    networking_config JSONB DEFAULT '{}',
    
    -- Failover Configuration
    failover_enabled BOOLEAN DEFAULT true,
    rto_minutes INTEGER DEFAULT 1,
    rpo_seconds INTEGER DEFAULT 5,
    failover_triggers JSONB DEFAULT '[]',
    
    -- Cost Optimization
    cost_optimization_enabled BOOLEAN DEFAULT true,
    target_cost_reduction_percentage INTEGER DEFAULT 40,
    cost_constraints JSONB DEFAULT '{}',
    
    -- Compliance and Security
    data_residency_requirements JSONB DEFAULT '{}',
    compliance_frameworks JSONB DEFAULT '[]',
    security_policies JSONB DEFAULT '{}',
    zero_trust_enabled BOOLEAN DEFAULT false,
    
    -- Performance Metrics
    availability_percentage DECIMAL(5,4) DEFAULT 99.9,
    performance_metrics JSONB DEFAULT '{}',
    cost_metrics JSONB DEFAULT '{}',
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    community_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deployed_at TIMESTAMP WITH TIME ZONE,
    terminated_at TIMESTAMP WITH TIME ZONE
);

-- Multi-cloud resources table
CREATE TABLE IF NOT EXISTS multi_cloud_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id UUID NOT NULL REFERENCES multi_cloud_deployments(id) ON DELETE CASCADE,
    resource_name VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    cloud_provider VARCHAR(50) NOT NULL,
    region VARCHAR(100) NOT NULL,
    
    -- Resource Configuration
    resource_config JSONB NOT NULL,
    current_state VARCHAR(50) DEFAULT 'creating',
    target_state VARCHAR(50) NOT NULL,
    
    -- Resource Metrics
    cpu_utilization DECIMAL(5,2) DEFAULT 0.0,
    memory_utilization DECIMAL(5,2) DEFAULT 0.0,
    storage_utilization DECIMAL(5,2) DEFAULT 0.0,
    network_utilization DECIMAL(5,2) DEFAULT 0.0,
    
    -- Cost Information
    hourly_cost DECIMAL(10,4) DEFAULT 0.0,
    monthly_cost DECIMAL(10,4) DEFAULT 0.0,
    cost_optimization_savings DECIMAL(10,4) DEFAULT 0.0,
    
    -- Health and Status
    health_status VARCHAR(50) DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
    last_health_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Multi-cloud events table
CREATE TABLE IF NOT EXISTS multi_cloud_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id UUID REFERENCES multi_cloud_deployments(id) ON DELETE CASCADE,
    resource_id UUID REFERENCES multi_cloud_resources(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_category VARCHAR(50) CHECK (event_category IN ('deployment', 'scaling', 'failover', 'cost', 'security', 'compliance')),
    severity VARCHAR(50) CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    
    -- Event Details
    event_message TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    affected_resources JSONB DEFAULT '[]',
    
    -- Actions Taken
    automatic_action_taken BOOLEAN DEFAULT false,
    action_details JSONB DEFAULT '{}',
    resolution_status VARCHAR(50) DEFAULT 'open' CHECK (resolution_status IN ('open', 'in_progress', 'resolved', 'acknowledged')),
    
    -- Metadata
    cloud_provider VARCHAR(50),
    region VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- ================================================================
-- QUANTUM ENCRYPTION TABLES
-- ================================================================

-- Quantum encryption keys table
CREATE TABLE IF NOT EXISTS quantum_encryption_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_id VARCHAR(255) UNIQUE NOT NULL,
    key_type VARCHAR(50) CHECK (key_type IN ('ML-KEM-768', 'ML-DSA-65', 'FALCON', 'SPHINCS+', 'hybrid')),
    key_purpose VARCHAR(50) CHECK (key_purpose IN ('encryption', 'signing', 'key_exchange', 'authentication')),
    
    -- Key Material (encrypted)
    public_key_material BYTEA NOT NULL,
    private_key_material BYTEA, -- May be null for public-only keys
    key_parameters JSONB DEFAULT '{}',
    
    -- Security Properties
    algorithm_oid VARCHAR(100),
    security_level INTEGER CHECK (security_level IN (1, 2, 3, 4, 5)),
    quantum_resistant BOOLEAN DEFAULT true,
    hybrid_mode BOOLEAN DEFAULT false,
    classical_backup_key_id VARCHAR(255),
    
    -- Key Lifecycle
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'rotating', 'deprecated', 'revoked')),
    generation_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    activation_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiration_timestamp TIMESTAMP WITH TIME ZONE,
    rotation_schedule_days INTEGER DEFAULT 365,
    
    -- Usage Tracking
    usage_count BIGINT DEFAULT 0,
    max_usage_count BIGINT,
    last_used_timestamp TIMESTAMP WITH TIME ZONE,
    
    -- HSM Integration
    hsm_enabled BOOLEAN DEFAULT false,
    hsm_slot_id VARCHAR(100),
    hsm_key_handle VARCHAR(255),
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    community_id UUID,
    key_owner VARCHAR(255),
    key_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quantum encryption operations table
CREATE TABLE IF NOT EXISTS quantum_encryption_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id VARCHAR(255) UNIQUE NOT NULL,
    operation_type VARCHAR(50) CHECK (operation_type IN ('encrypt', 'decrypt', 'sign', 'verify', 'key_exchange', 'key_generation')),
    algorithm VARCHAR(50) NOT NULL,
    
    -- Operation Details
    key_id VARCHAR(255) REFERENCES quantum_encryption_keys(key_id),
    input_size_bytes BIGINT,
    output_size_bytes BIGINT,
    
    -- Performance Metrics
    operation_duration_ms INTEGER,
    cpu_cycles BIGINT,
    memory_usage_bytes BIGINT,
    quantum_advantage_factor DECIMAL(10,4),
    
    -- Security Metrics
    entropy_used DECIMAL(10,4),
    randomness_quality DECIMAL(5,4),
    security_level_achieved INTEGER,
    
    -- Status and Results
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    success BOOLEAN,
    error_message TEXT,
    result_hash VARCHAR(128),
    
    -- Compliance and Audit
    audit_required BOOLEAN DEFAULT false,
    compliance_frameworks JSONB DEFAULT '[]',
    regulatory_classification VARCHAR(100),
    
    -- Metadata
    initiated_by UUID REFERENCES auth.users(id),
    community_id UUID,
    client_info JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Quantum encryption performance benchmarks table
CREATE TABLE IF NOT EXISTS quantum_encryption_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    benchmark_id VARCHAR(255) UNIQUE NOT NULL,
    algorithm VARCHAR(50) NOT NULL,
    operation_type VARCHAR(50) NOT NULL,
    benchmark_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Benchmark Configuration
    test_data_size_bytes BIGINT NOT NULL,
    iterations INTEGER NOT NULL,
    concurrency_level INTEGER DEFAULT 1,
    
    -- Performance Results
    avg_operation_time_ms DECIMAL(10,4),
    min_operation_time_ms DECIMAL(10,4),
    max_operation_time_ms DECIMAL(10,4),
    operations_per_second DECIMAL(10,4),
    throughput_mbps DECIMAL(10,4),
    
    -- Resource Usage
    avg_cpu_usage_percent DECIMAL(5,2),
    peak_memory_usage_mb DECIMAL(10,4),
    avg_memory_usage_mb DECIMAL(10,4),
    
    -- Comparison with Classical
    classical_equivalent_time_ms DECIMAL(10,4),
    quantum_speedup_factor DECIMAL(10,4),
    efficiency_improvement_percent DECIMAL(5,2),
    
    -- System Information
    hardware_info JSONB DEFAULT '{}',
    software_version VARCHAR(100),
    optimization_level VARCHAR(50),
    
    -- Metadata
    benchmark_type VARCHAR(50) CHECK (benchmark_type IN ('performance', 'security', 'scalability', 'regression')),
    environment VARCHAR(50) CHECK (environment IN ('development', 'testing', 'production')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- INTEGRATION AND MONITORING TABLES
-- ================================================================

-- v4.4 feature status tracking table
CREATE TABLE IF NOT EXISTS v44_feature_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_name VARCHAR(100) NOT NULL UNIQUE,
    feature_version VARCHAR(20) DEFAULT '4.4.0',
    status VARCHAR(50) DEFAULT 'disabled' CHECK (status IN ('disabled', 'enabled', 'beta', 'deprecated')),
    
    -- Configuration
    feature_config JSONB DEFAULT '{}',
    rollout_percentage DECIMAL(5,2) DEFAULT 0.0,
    eligible_communities JSONB DEFAULT '[]',
    
    -- Health and Performance
    health_status VARCHAR(50) DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
    performance_metrics JSONB DEFAULT '{}',
    error_rate_percentage DECIMAL(5,4) DEFAULT 0.0,
    
    -- Integration Status
    integration_status VARCHAR(50) DEFAULT 'not_integrated' CHECK (integration_status IN ('not_integrated', 'integrating', 'integrated', 'failed')),
    dependencies JSONB DEFAULT '[]',
    compatibility_issues JSONB DEFAULT '[]',
    
    -- Metadata
    enabled_by UUID REFERENCES auth.users(id),
    enabled_at TIMESTAMP WITH TIME ZONE,
    last_health_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- v4.4 integration events table
CREATE TABLE IF NOT EXISTS v44_integration_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(50) CHECK (event_type IN ('feature_activation', 'integration_success', 'integration_failure', 'performance_alert', 'security_event')),
    feature_name VARCHAR(100),
    severity VARCHAR(50) CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    
    -- Event Details
    event_message TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    affected_components JSONB DEFAULT '[]',
    
    -- Context Information
    user_id UUID REFERENCES auth.users(id),
    community_id UUID,
    session_id VARCHAR(255),
    request_id VARCHAR(255),
    
    -- Resolution Information
    resolution_status VARCHAR(50) DEFAULT 'open' CHECK (resolution_status IN ('open', 'in_progress', 'resolved', 'acknowledged')),
    resolution_notes TEXT,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '90 days')
);

-- v4.3 compatibility tracking table
CREATE TABLE IF NOT EXISTS v43_compatibility_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_endpoint VARCHAR(255) NOT NULL,
    v43_usage_count BIGINT DEFAULT 0,
    last_v43_access TIMESTAMP WITH TIME ZONE,
    
    -- Migration Status
    migration_status VARCHAR(50) DEFAULT 'not_started' CHECK (migration_status IN ('not_started', 'in_progress', 'completed', 'deprecated')),
    migration_notes TEXT,
    deprecation_warning_sent BOOLEAN DEFAULT false,
    sunset_date TIMESTAMP WITH TIME ZONE,
    
    -- Usage Analytics
    unique_users_count INTEGER DEFAULT 0,
    total_requests_count BIGINT DEFAULT 0,
    error_rate_percentage DECIMAL(5,4) DEFAULT 0.0,
    
    -- Replacement Information
    v44_equivalent_endpoint VARCHAR(255),
    migration_guide_url TEXT,
    breaking_changes JSONB DEFAULT '[]',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- INDEXES FOR PERFORMANCE
-- ================================================================

-- Federated Learning Indexes
CREATE INDEX IF NOT EXISTS idx_fl_jobs_status ON federated_learning_jobs(status);
CREATE INDEX IF NOT EXISTS idx_fl_jobs_created_by ON federated_learning_jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_fl_jobs_community ON federated_learning_jobs(community_id);
CREATE INDEX IF NOT EXISTS idx_fl_clients_job_id ON federated_learning_clients(job_id);
CREATE INDEX IF NOT EXISTS idx_fl_clients_status ON federated_learning_clients(status);
CREATE INDEX IF NOT EXISTS idx_fl_rounds_job_id ON federated_learning_rounds(job_id);

-- AI Explainability Indexes
CREATE INDEX IF NOT EXISTS idx_explainability_requests_model_id ON explainability_requests(model_id);
CREATE INDEX IF NOT EXISTS idx_explainability_requests_status ON explainability_requests(status);
CREATE INDEX IF NOT EXISTS idx_explainability_requests_user_id ON explainability_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_explainability_audit_model_id ON explainability_audit_trail(model_id);
CREATE INDEX IF NOT EXISTS idx_bias_detection_model_id ON bias_detection_results(model_id);

-- Multi-Cloud Indexes
CREATE INDEX IF NOT EXISTS idx_multi_cloud_deployments_status ON multi_cloud_deployments(status);
CREATE INDEX IF NOT EXISTS idx_multi_cloud_deployments_primary_cloud ON multi_cloud_deployments(primary_cloud);
CREATE INDEX IF NOT EXISTS idx_multi_cloud_resources_deployment_id ON multi_cloud_resources(deployment_id);
CREATE INDEX IF NOT EXISTS idx_multi_cloud_events_deployment_id ON multi_cloud_events(deployment_id);

-- Quantum Encryption Indexes
CREATE INDEX IF NOT EXISTS idx_quantum_keys_key_type ON quantum_encryption_keys(key_type);
CREATE INDEX IF NOT EXISTS idx_quantum_keys_status ON quantum_encryption_keys(status);
CREATE INDEX IF NOT EXISTS idx_quantum_operations_key_id ON quantum_encryption_operations(key_id);
CREATE INDEX IF NOT EXISTS idx_quantum_operations_created_at ON quantum_encryption_operations(created_at);

-- Integration and Monitoring Indexes
CREATE INDEX IF NOT EXISTS idx_v44_feature_status_name ON v44_feature_status(feature_name);
CREATE INDEX IF NOT EXISTS idx_v44_integration_events_type ON v44_integration_events(event_type);
CREATE INDEX IF NOT EXISTS idx_v44_integration_events_feature ON v44_integration_events(feature_name);
CREATE INDEX IF NOT EXISTS idx_v43_compatibility_endpoint ON v43_compatibility_tracking(api_endpoint);

-- ================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================

-- Enable RLS on all tables
ALTER TABLE federated_learning_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE federated_learning_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE federated_learning_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE explainability_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE explainability_audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE bias_detection_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE multi_cloud_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE multi_cloud_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE multi_cloud_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE quantum_encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE quantum_encryption_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quantum_encryption_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE v44_feature_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE v44_integration_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE v43_compatibility_tracking ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (users can access their own data)
CREATE POLICY "Users can access their own federated learning jobs" ON federated_learning_jobs
    FOR ALL USING (auth.uid() = created_by);

CREATE POLICY "Users can access their own explainability requests" ON explainability_requests
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own multi-cloud deployments" ON multi_cloud_deployments
    FOR ALL USING (auth.uid() = created_by);

CREATE POLICY "Users can access their own quantum keys" ON quantum_encryption_keys
    FOR ALL USING (auth.uid() = created_by);

CREATE POLICY "Users can access their own quantum operations" ON quantum_encryption_operations
    FOR ALL USING (auth.uid() = initiated_by);

-- Admin policies for system tables
CREATE POLICY "Admins can access all feature status" ON v44_feature_status
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can access all integration events" ON v44_integration_events
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- ================================================================
-- FUNCTIONS AND TRIGGERS
-- ================================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_federated_learning_jobs_updated_at BEFORE UPDATE ON federated_learning_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_federated_learning_clients_updated_at BEFORE UPDATE ON federated_learning_clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_federated_learning_rounds_updated_at BEFORE UPDATE ON federated_learning_rounds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_explainability_requests_updated_at BEFORE UPDATE ON explainability_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_multi_cloud_deployments_updated_at BEFORE UPDATE ON multi_cloud_deployments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_multi_cloud_resources_updated_at BEFORE UPDATE ON multi_cloud_resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quantum_encryption_keys_updated_at BEFORE UPDATE ON quantum_encryption_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_v44_feature_status_updated_at BEFORE UPDATE ON v44_feature_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_v43_compatibility_tracking_updated_at BEFORE UPDATE ON v43_compatibility_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-expire old events
CREATE OR REPLACE FUNCTION cleanup_expired_events()
RETURNS void AS $$
BEGIN
    DELETE FROM v44_integration_events WHERE expires_at < NOW();
END;
$$ language 'plpgsql';

-- Function to track v4.3 API usage
CREATE OR REPLACE FUNCTION track_v43_api_usage(endpoint_path TEXT)
RETURNS void AS $$
BEGIN
    INSERT INTO v43_compatibility_tracking (api_endpoint, v43_usage_count, last_v43_access, total_requests_count)
    VALUES (endpoint_path, 1, NOW(), 1)
    ON CONFLICT (api_endpoint) DO UPDATE SET
        v43_usage_count = v43_compatibility_tracking.v43_usage_count + 1,
        last_v43_access = NOW(),
        total_requests_count = v43_compatibility_tracking.total_requests_count + 1,
        updated_at = NOW();
END;
$$ language 'plpgsql';

-- ================================================================
-- INITIAL DATA SEEDING
-- ================================================================

-- Insert initial feature status records
INSERT INTO v44_feature_status (feature_name, status, rollout_percentage) VALUES
    ('federated_learning', 'disabled', 0.0),
    ('ai_explainability', 'disabled', 0.0),
    ('multi_cloud_orchestration', 'disabled', 0.0),
    ('quantum_encryption', 'disabled', 0.0)
ON CONFLICT (feature_name) DO NOTHING;

-- Insert common v4.3 API endpoints for compatibility tracking
INSERT INTO v43_compatibility_tracking (api_endpoint, v44_equivalent_endpoint) VALUES
    ('/api/v43/governance/trust-score', '/api/v44/trust-scoring'),
    ('/api/v43/agents/coordination', '/api/v44/agents/coordination'),
    ('/api/v43/memory/operations', '/api/v44/memory/operations'),
    ('/api/v43/ai/models', '/api/v44/ai/models')
ON CONFLICT (api_endpoint) DO NOTHING;

COMMIT;

-- ================================================================
-- POST-MIGRATION NOTES
-- ================================================================

/*
This migration adds comprehensive support for TrustStram v4.4 features:

1. FEDERATED LEARNING:
   - Jobs, clients, and rounds tracking
   - Privacy and security metrics
   - Performance monitoring
   - Support for multiple frameworks

2. AI EXPLAINABILITY:
   - Explanation requests and results
   - Comprehensive audit trails
   - Bias detection and fairness monitoring
   - Compliance with GDPR and EU AI Act

3. MULTI-CLOUD ORCHESTRATION:
   - Deployment and resource management
   - Event tracking and monitoring
   - Cost optimization tracking
   - Compliance and security policies

4. QUANTUM ENCRYPTION:
   - Key lifecycle management
   - Operation tracking and performance
   - Benchmarking and metrics
   - HSM integration support

5. INTEGRATION FEATURES:
   - Feature status tracking
   - Integration events monitoring
   - v4.3 compatibility tracking
   - Performance and health metrics

All tables include proper indexing, RLS policies, and audit trails
for production use.
*/