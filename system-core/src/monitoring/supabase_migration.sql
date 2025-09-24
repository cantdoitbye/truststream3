-- ========================================================================
-- Enhanced Monitoring and Analytics System - Supabase Schema Migration
-- ========================================================================
-- This migration creates all necessary tables for the monitoring system
-- Run this SQL in your Supabase SQL editor or through migrations

-- ========================================================================
-- 1. MONITORING LOGS TABLE
-- ========================================================================

CREATE TABLE IF NOT EXISTS monitoring_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'critical')),
    event_type TEXT NOT NULL CHECK (event_type IN (
        'agent_start', 'agent_complete', 'agent_error', 'agent_tool_use',
        'model_inference', 'model_error', 'model_latency',
        'system_health', 'resource_usage', 'api_request',
        'anomaly_detected', 'prediction_generated', 'alert_triggered'
    )),
    message TEXT NOT NULL,
    
    -- Context fields
    agent_id TEXT,
    user_id TEXT,
    session_id TEXT,
    request_id TEXT,
    
    -- Performance data
    duration INTEGER, -- in milliseconds
    model_name TEXT,
    token_count INTEGER,
    
    -- System data
    memory_usage REAL, -- percentage 0-100
    cpu_usage REAL,    -- percentage 0-100
    
    -- Flexible data storage
    metadata JSONB,
    tags JSONB,
    
    -- Error information
    error JSONB,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================================
-- 2. PERFORMANCE METRICS TABLE
-- ========================================================================

CREATE TABLE IF NOT EXISTS monitoring_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    metric_type TEXT NOT NULL CHECK (metric_type IN ('counter', 'gauge', 'histogram', 'timer')),
    name TEXT NOT NULL,
    value REAL NOT NULL,
    unit TEXT,
    
    -- Context fields
    agent_id TEXT,
    model_name TEXT,
    user_id TEXT,
    session_id TEXT,
    
    -- Dimensions for grouping
    dimensions JSONB,
    
    -- Flexible data storage
    metadata JSONB,
    tags JSONB,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================================
-- 3. ANOMALIES TABLE
-- ========================================================================

CREATE TABLE IF NOT EXISTS monitoring_anomalies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    metric TEXT NOT NULL,
    value REAL NOT NULL,
    expected_value REAL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    description TEXT NOT NULL,
    context JSONB,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================================
-- 4. ALERTS TABLE
-- ========================================================================

CREATE TABLE IF NOT EXISTS monitoring_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    source TEXT NOT NULL,
    
    -- Alert conditions
    condition JSONB NOT NULL,
    
    -- Alert state
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
    acknowledged_by TEXT,
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    
    -- Flexible data storage
    metadata JSONB,
    tags JSONB,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================================
-- 5. PREDICTIONS TABLE
-- ========================================================================

CREATE TABLE IF NOT EXISTS monitoring_predictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    forecast_period INTEGER NOT NULL, -- in minutes
    predictions JSONB NOT NULL, -- array of {timestamp, value, confidenceInterval}
    confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    model TEXT NOT NULL,
    metadata JSONB,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================================
-- 6. SYSTEM HEALTH TABLE
-- ========================================================================

CREATE TABLE IF NOT EXISTS monitoring_system_health (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    overall TEXT NOT NULL CHECK (overall IN ('healthy', 'degraded', 'unhealthy')),
    components JSONB NOT NULL, -- array of component health data
    metrics JSONB NOT NULL,    -- system-level metrics
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================================
-- 7. INDEXES FOR PERFORMANCE
-- ========================================================================

-- Logs table indexes
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_timestamp ON monitoring_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_level ON monitoring_logs (level);
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_event_type ON monitoring_logs (event_type);
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_agent_id ON monitoring_logs (agent_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_user_id ON monitoring_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_session_id ON monitoring_logs (session_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_model_name ON monitoring_logs (model_name);
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_composite ON monitoring_logs (timestamp DESC, level, event_type);

-- Metrics table indexes
CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_timestamp ON monitoring_metrics (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_name ON monitoring_metrics (name);
CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_agent_id ON monitoring_metrics (agent_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_model_name ON monitoring_metrics (model_name);
CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_user_id ON monitoring_metrics (user_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_composite ON monitoring_metrics (timestamp DESC, name, metric_type);

-- Anomalies table indexes
CREATE INDEX IF NOT EXISTS idx_monitoring_anomalies_timestamp ON monitoring_anomalies (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_anomalies_metric ON monitoring_anomalies (metric);
CREATE INDEX IF NOT EXISTS idx_monitoring_anomalies_severity ON monitoring_anomalies (severity);

-- Alerts table indexes
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_timestamp ON monitoring_alerts (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_status ON monitoring_alerts (status);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_severity ON monitoring_alerts (severity);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_source ON monitoring_alerts (source);

-- Predictions table indexes
CREATE INDEX IF NOT EXISTS idx_monitoring_predictions_timestamp ON monitoring_predictions (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_predictions_metric ON monitoring_predictions (metric);

-- System health table indexes
CREATE INDEX IF NOT EXISTS idx_monitoring_system_health_timestamp ON monitoring_system_health (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_system_health_overall ON monitoring_system_health (overall);

-- ========================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================================

-- Enable RLS on all tables
ALTER TABLE monitoring_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_system_health ENABLE ROW LEVEL SECURITY;

-- Allow service role to access all data (for backend operations)
CREATE POLICY "Service role can manage logs" ON monitoring_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage metrics" ON monitoring_metrics
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage anomalies" ON monitoring_anomalies
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage alerts" ON monitoring_alerts
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage predictions" ON monitoring_predictions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage system health" ON monitoring_system_health
    FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to read their own data
CREATE POLICY "Users can read own logs" ON monitoring_logs
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can read own metrics" ON monitoring_metrics
    FOR SELECT USING (auth.uid()::text = user_id);

-- Allow authenticated users to read alerts and system health (public monitoring data)
CREATE POLICY "Users can read alerts" ON monitoring_alerts
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can read system health" ON monitoring_system_health
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can read anomalies" ON monitoring_anomalies
    FOR SELECT TO authenticated USING (true);

-- ========================================================================
-- 9. AUTOMATED CLEANUP FUNCTION
-- ========================================================================

-- Function to clean up old monitoring data
CREATE OR REPLACE FUNCTION cleanup_monitoring_data()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    retention_days INTEGER := 30; -- Default retention period
    cutoff_date TIMESTAMPTZ;
    deleted_count INTEGER := 0;
    temp_count INTEGER;
BEGIN
    -- Calculate cutoff date
    cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;
    
    -- Clean up logs
    DELETE FROM monitoring_logs WHERE created_at < cutoff_date;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Clean up metrics
    DELETE FROM monitoring_metrics WHERE created_at < cutoff_date;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Clean up anomalies (keep longer - 60 days)
    DELETE FROM monitoring_anomalies WHERE created_at < (NOW() - '60 days'::INTERVAL);
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Clean up resolved alerts (keep 90 days)
    DELETE FROM monitoring_alerts 
    WHERE status = 'resolved' 
    AND resolved_at < (NOW() - '90 days'::INTERVAL);
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Clean up old predictions
    DELETE FROM monitoring_predictions WHERE created_at < cutoff_date;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Clean up old system health (keep 7 days of detailed data)
    DELETE FROM monitoring_system_health WHERE created_at < (NOW() - '7 days'::INTERVAL);
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    RETURN deleted_count;
END;
$$;

-- ========================================================================
-- 10. USEFUL VIEWS FOR ANALYTICS
-- ========================================================================

-- Recent system performance view
CREATE OR REPLACE VIEW recent_system_performance AS
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    AVG(CASE WHEN name = 'cpu_usage' THEN value END) as avg_cpu_usage,
    AVG(CASE WHEN name = 'memory_usage' THEN value END) as avg_memory_usage,
    AVG(CASE WHEN name = 'model_latency' THEN value END) as avg_model_latency,
    COUNT(CASE WHEN name = 'agent_errors' THEN 1 END) as error_count
FROM monitoring_metrics 
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY hour DESC;

-- Agent performance summary view
CREATE OR REPLACE VIEW agent_performance_summary AS
SELECT 
    agent_id,
    COUNT(*) as total_events,
    COUNT(CASE WHEN level = 'error' THEN 1 END) as error_count,
    AVG(duration) as avg_duration,
    MAX(duration) as max_duration,
    SUM(token_count) as total_tokens,
    DATE_TRUNC('day', MAX(timestamp)) as last_activity
FROM monitoring_logs 
WHERE agent_id IS NOT NULL
AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY agent_id
ORDER BY total_events DESC;

-- Critical alerts view
CREATE OR REPLACE VIEW critical_alerts AS
SELECT 
    id,
    title,
    description,
    severity,
    status,
    timestamp,
    EXTRACT(EPOCH FROM (NOW() - timestamp))/3600 as hours_since_created
FROM monitoring_alerts 
WHERE severity IN ('critical', 'error')
AND status IN ('active', 'acknowledged')
ORDER BY timestamp DESC;

-- ========================================================================
-- 11. SCHEDULED CLEANUP (USING PG_CRON IF AVAILABLE)
-- ========================================================================

-- Note: This requires the pg_cron extension to be enabled
-- Uncomment the following line if you have pg_cron enabled:
-- SELECT cron.schedule('cleanup-monitoring-data', '0 2 * * *', 'SELECT cleanup_monitoring_data();');

-- ========================================================================
-- MIGRATION COMPLETE
-- ========================================================================

-- Insert a test record to verify the setup
INSERT INTO monitoring_logs (
    level, event_type, message, 
    agent_id, metadata
) VALUES (
    'info', 'system_health', 'Monitoring system initialized successfully',
    'system', '{"version": "1.0.0", "setup": "complete"}'::jsonb
);

-- Output success message
DO $$
BEGIN
    RAISE NOTICE 'Enhanced Monitoring and Analytics System schema created successfully!';
    RAISE NOTICE 'Tables created: monitoring_logs, monitoring_metrics, monitoring_anomalies, monitoring_alerts, monitoring_predictions, monitoring_system_health';
    RAISE NOTICE 'Indexes and policies configured for optimal performance and security';
    RAISE NOTICE 'Ready to start monitoring AI applications!';
END $$;
