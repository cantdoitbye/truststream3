-- Migration: create_production_monitoring_infrastructure
-- Created at: 1757812694

-- Production Monitoring Infrastructure
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
    user_id UUID REFERENCES auth.users(id),
    session_id VARCHAR(100),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    category VARCHAR(20) NOT NULL CHECK (category IN ('authentication', 'database', 'api', 'ui', 'integration', 'security')),
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
    error_id UUID REFERENCES error_logs(id),
    service_name VARCHAR(100),
    escalation_time INTEGER, -- seconds until escalation
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
    acknowledged_by VARCHAR(100),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Error Statistics Table for Analytics
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

-- System Maintenance Log
CREATE TABLE IF NOT EXISTS maintenance_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    maintenance_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    impact_level VARCHAR(20) CHECK (impact_level IN ('none', 'low', 'medium', 'high', 'critical')),
    affected_services TEXT[],
    performed_by VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incident Response Log
CREATE TABLE IF NOT EXISTS incident_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    incident_title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'mitigating', 'monitoring', 'resolved', 'closed')),
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    root_cause TEXT,
    resolution_summary TEXT,
    affected_services TEXT[],
    assigned_to VARCHAR(100),
    escalated_to VARCHAR(100),
    customer_impact BOOLEAN DEFAULT FALSE,
    external_communication TEXT,
    lessons_learned TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_service ON system_metrics(service_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_health_checks_timestamp ON health_checks(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_service_severity ON error_logs(service_name, severity, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_status ON error_logs(status, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_category ON error_logs(category, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alert_notifications_status ON alert_notifications(status, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_connection_metrics_timestamp ON connection_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_log_status ON maintenance_log(status, scheduled_start);
CREATE INDEX IF NOT EXISTS idx_incident_log_status ON incident_log(status, detected_at DESC);

-- Create a function to automatically update occurrence count
CREATE OR REPLACE FUNCTION update_error_occurrence()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for error_logs updates
CREATE TRIGGER trigger_update_error_logs_timestamp
    BEFORE UPDATE ON error_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_error_occurrence();

-- Function to get connection info (placeholder)
CREATE OR REPLACE FUNCTION get_connection_info()
RETURNS TABLE(
    active_connections INTEGER,
    max_connections INTEGER,
    connection_utilization DECIMAL
) AS $$
BEGIN
    -- This is a placeholder function
    -- In a real implementation, this would query pg_stat_activity
    RETURN QUERY SELECT 
        50 as active_connections,
        200 as max_connections,
        25.0 as connection_utilization;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Enable Row Level Security
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_log ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (admin access)
CREATE POLICY "Authenticated users can view monitoring data" ON system_metrics
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage monitoring data" ON system_metrics
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view health checks" ON health_checks
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage health checks" ON health_checks
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view error logs" ON error_logs
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage error logs" ON error_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view alerts" ON alert_notifications
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage alerts" ON alert_notifications
    FOR ALL USING (auth.role() = 'service_role');

-- Similar policies for other tables
CREATE POLICY "Service role full access error_statistics" ON error_statistics FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access connection_metrics" ON connection_metrics FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access performance_baselines" ON performance_baselines FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access maintenance_log" ON maintenance_log FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access incident_log" ON incident_log FOR ALL USING (auth.role() = 'service_role');

-- Grant access to authenticated users for read operations
GRANT SELECT ON system_metrics TO authenticated;
GRANT SELECT ON health_checks TO authenticated;
GRANT SELECT ON error_logs TO authenticated;
GRANT SELECT ON alert_notifications TO authenticated;
GRANT SELECT ON error_statistics TO authenticated;
GRANT SELECT ON connection_metrics TO authenticated;
GRANT SELECT ON performance_baselines TO authenticated;
GRANT SELECT ON maintenance_log TO authenticated;
GRANT SELECT ON incident_log TO authenticated;

-- Grant full access to service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;;