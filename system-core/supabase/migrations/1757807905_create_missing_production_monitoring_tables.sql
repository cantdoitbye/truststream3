-- Migration: create_missing_production_monitoring_tables
-- Created at: 1757807905

-- Create missing production monitoring tables

-- Health Checks Table (if not exists)
CREATE TABLE IF NOT EXISTS health_checks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    overall_health_percent DECIMAL(5,2) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'degraded', 'critical', 'error')),
    check_details JSONB,
    total_check_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Error Logs Table for Centralized Error Tracking
CREATE TABLE IF NOT EXISTS error_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    service_name VARCHAR(100) NOT NULL,
    error_type VARCHAR(200) NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    request_data JSONB,
    user_id UUID,
    session_id VARCHAR(100),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    category VARCHAR(50) NOT NULL CHECK (category IN ('authentication', 'database', 'api', 'ui', 'integration', 'security')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    resolution TEXT,
    first_occurrence TIMESTAMPTZ DEFAULT NOW(),
    occurrence_count INTEGER DEFAULT 1,
    environment VARCHAR(20) DEFAULT 'production',
    user_agent TEXT,
    ip_address INET,
    resolved_at TIMESTAMPTZ,
    assigned_to VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert Notifications Table
CREATE TABLE IF NOT EXISTS alert_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    error_id UUID,
    service_name VARCHAR(100),
    escalation_time INTEGER,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
    acknowledged_by VARCHAR(100),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Error Statistics Table
CREATE TABLE IF NOT EXISTS error_statistics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    category VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date, category, severity)
);

-- Connection Pool Monitoring
CREATE TABLE IF NOT EXISTS connection_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    active_connections INTEGER NOT NULL,
    idle_connections INTEGER NOT NULL,
    max_connections INTEGER NOT NULL,
    connection_pool_utilization DECIMAL(5,2),
    query_queue_length INTEGER,
    avg_query_time_ms DECIMAL(10,2),
    slow_queries_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Baselines
CREATE TABLE IF NOT EXISTS performance_baselines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    baseline_value DECIMAL(10,2) NOT NULL,
    threshold_warning DECIMAL(10,2),
    threshold_critical DECIMAL(10,2),
    measurement_unit VARCHAR(20),
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(service_name, metric_name, valid_from)
);

-- GDPR Compliance Tables
CREATE TABLE IF NOT EXISTS user_consents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    consent_type VARCHAR(50) NOT NULL,
    consent_status BOOLEAN NOT NULL DEFAULT FALSE,
    consent_version VARCHAR(20) NOT NULL,
    granted_at TIMESTAMPTZ,
    withdrawn_at TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT,
    consent_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, consent_type, consent_version)
);

CREATE TABLE IF NOT EXISTS data_processing_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    action_type VARCHAR(50) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    data_category VARCHAR(50),
    legal_basis VARCHAR(50),
    performed_by UUID,
    purpose TEXT,
    retention_period_days INTEGER,
    anonymization_applied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_retention_policies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    data_category VARCHAR(50) NOT NULL,
    retention_period_days INTEGER NOT NULL,
    deletion_method VARCHAR(50) NOT NULL,
    legal_basis TEXT,
    policy_version VARCHAR(20),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(data_category, policy_version)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_health_checks_timestamp ON health_checks(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_service_severity ON error_logs(service_name, severity, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_status ON error_logs(status, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alert_notifications_status ON alert_notifications(status, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_connection_metrics_timestamp ON connection_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id, consent_type);
CREATE INDEX IF NOT EXISTS idx_data_processing_logs_user_id ON data_processing_logs(user_id, created_at DESC);

-- Insert initial performance baselines
INSERT INTO performance_baselines (service_name, metric_name, baseline_value, threshold_warning, threshold_critical, measurement_unit) VALUES
('trust-scorer', 'response_time_ms', 1500, 3000, 5000, 'milliseconds'),
('vibe-analyzer', 'response_time_ms', 2000, 4000, 6000, 'milliseconds'),
('agent-recommender', 'response_time_ms', 2500, 5000, 8000, 'milliseconds'),
('multi-ai-orchestrator', 'response_time_ms', 3000, 6000, 10000, 'milliseconds'),
('database', 'connection_count', 50, 150, 180, 'connections'),
('system', 'error_rate_percent', 0.5, 2.0, 5.0, 'percent'),
('system', 'uptime_percent', 99.9, 99.0, 95.0, 'percent')
ON CONFLICT (service_name, metric_name, valid_from) DO NOTHING;

-- Insert initial data retention policies
INSERT INTO data_retention_policies (data_category, retention_period_days, deletion_method, legal_basis, policy_version) VALUES
('user_profile', 2555, 'soft_delete', 'Legitimate interest for service provision', '1.0'),
('user_activity', 1095, 'hard_delete', 'Analytics and service improvement', '1.0'),
('error_logs', 365, 'anonymize', 'Technical operation and debugging', '1.0'),
('system_metrics', 730, 'aggregate_delete', 'System monitoring and optimization', '1.0'),
('audit_logs', 2555, 'archive', 'Legal compliance and security', '1.0')
ON CONFLICT (data_category, policy_version) DO NOTHING;;