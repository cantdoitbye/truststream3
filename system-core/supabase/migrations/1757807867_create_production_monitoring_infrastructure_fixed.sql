-- Migration: create_production_monitoring_infrastructure_fixed
-- Created at: 1757807867

-- Production Monitoring Infrastructure - Fixed
-- Creates tables for APM, error tracking, and operational monitoring

-- System Metrics Table for APM
CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    service_name VARCHAR(100) NOT NULL,
    response_time_ms INTEGER,
    status_code INTEGER,
    error_message TEXT,
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    database_connections INTEGER,
    request_count INTEGER DEFAULT 1,
    user_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Health Checks Table
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_service ON system_metrics(service_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_health_checks_timestamp ON health_checks(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_service_severity ON error_logs(service_name, severity, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_status ON error_logs(status, timestamp DESC);

-- Insert initial performance baselines
INSERT INTO performance_baselines (service_name, metric_name, baseline_value, threshold_warning, threshold_critical, measurement_unit) VALUES
('trust-scorer', 'response_time_ms', 1500, 3000, 5000, 'milliseconds'),
('vibe-analyzer', 'response_time_ms', 2000, 4000, 6000, 'milliseconds'),
('agent-recommender', 'response_time_ms', 2500, 5000, 8000, 'milliseconds'),
('multi-ai-orchestrator', 'response_time_ms', 3000, 6000, 10000, 'milliseconds'),
('database', 'connection_count', 50, 150, 180, 'connections'),
('system', 'error_rate_percent', 0.5, 2.0, 5.0, 'percent'),
('system', 'uptime_percent', 99.9, 99.0, 95.0, 'percent')
ON CONFLICT (service_name, metric_name, valid_from) DO NOTHING;;