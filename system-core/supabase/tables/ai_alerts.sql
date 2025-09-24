-- AI Alerts Table
-- Stores AI-specific alerts with enhanced metadata

CREATE TABLE ai_alerts (
    alert_id VARCHAR(255) PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
        'performance', 'accuracy', 'resource', 'anomaly', 'prediction'
    )),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('agent', 'model', 'system')),
    entity_id VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    metrics JSONB DEFAULT '{}',
    threshold_config JSONB,
    correlation_id VARCHAR(255),
    parent_alert_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by VARCHAR(255),
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(255),
    resolution TEXT,
    escalated_at TIMESTAMPTZ,
    escalated_to VARCHAR(255),
    escalation_level INTEGER DEFAULT 0,
    suppressed BOOLEAN DEFAULT FALSE,
    suppression_reason TEXT,
    actions_taken TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    notification_sent BOOLEAN DEFAULT FALSE,
    notification_channels TEXT[] DEFAULT '{}',
    false_positive BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_ai_alerts_parent FOREIGN KEY (parent_alert_id) REFERENCES ai_alerts(alert_id) ON DELETE SET NULL,
    
    -- Indexes
    INDEX idx_ai_alerts_alert_type (alert_type),
    INDEX idx_ai_alerts_severity (severity),
    INDEX idx_ai_alerts_entity_type (entity_type),
    INDEX idx_ai_alerts_entity_id (entity_id),
    INDEX idx_ai_alerts_created_at (created_at),
    INDEX idx_ai_alerts_acknowledged_at (acknowledged_at),
    INDEX idx_ai_alerts_resolved_at (resolved_at),
    INDEX idx_ai_alerts_correlation_id (correlation_id),
    INDEX idx_ai_alerts_escalation_level (escalation_level),
    INDEX idx_ai_alerts_active (resolved_at) WHERE resolved_at IS NULL,
    INDEX idx_ai_alerts_unacknowledged (acknowledged_at) WHERE acknowledged_at IS NULL
);

-- Row Level Security
ALTER TABLE ai_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read access for all users" ON ai_alerts
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON ai_alerts
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON ai_alerts
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ai_alerts_updated_at
    BEFORE UPDATE ON ai_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_alerts_updated_at();

-- Function to auto-escalate alerts
CREATE OR REPLACE FUNCTION auto_escalate_alerts()
RETURNS void AS $$
BEGIN
    -- Escalate critical alerts that are unacknowledged for more than 5 minutes
    UPDATE ai_alerts 
    SET 
        escalated_at = NOW(),
        escalation_level = escalation_level + 1,
        actions_taken = array_append(actions_taken, 'Auto-escalated due to no acknowledgment')
    WHERE 
        severity = 'critical' 
        AND acknowledged_at IS NULL 
        AND resolved_at IS NULL
        AND escalated_at IS NULL
        AND created_at < NOW() - INTERVAL '5 minutes';
    
    -- Escalate high alerts that are unacknowledged for more than 15 minutes
    UPDATE ai_alerts 
    SET 
        escalated_at = NOW(),
        escalation_level = escalation_level + 1,
        actions_taken = array_append(actions_taken, 'Auto-escalated due to no acknowledgment')
    WHERE 
        severity = 'high' 
        AND acknowledged_at IS NULL 
        AND resolved_at IS NULL
        AND escalated_at IS NULL
        AND created_at < NOW() - INTERVAL '15 minutes';
END;
$$ LANGUAGE plpgsql;

-- Function to get alert statistics
CREATE OR REPLACE FUNCTION get_alert_statistics(
    start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '24 hours',
    end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    total_alerts BIGINT,
    by_severity JSONB,
    by_type JSONB,
    by_entity_type JSONB,
    avg_resolution_time INTERVAL,
    escalation_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_alerts,
        jsonb_object_agg(severity, severity_count) as by_severity,
        jsonb_object_agg(alert_type, type_count) as by_type,
        jsonb_object_agg(entity_type, entity_count) as by_entity_type,
        AVG(resolved_at - created_at) FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution_time,
        ROUND(
            (COUNT(*) FILTER (WHERE escalation_level > 0)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 
            2
        ) as escalation_rate
    FROM (
        SELECT 
            severity,
            alert_type,
            entity_type,
            escalation_level,
            created_at,
            resolved_at,
            COUNT(*) OVER (PARTITION BY severity) as severity_count,
            COUNT(*) OVER (PARTITION BY alert_type) as type_count,
            COUNT(*) OVER (PARTITION BY entity_type) as entity_count
        FROM ai_alerts 
        WHERE created_at BETWEEN start_date AND end_date
    ) stats;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE ai_alerts IS 'Stores AI-specific alerts with enhanced metadata and processing information';
COMMENT ON COLUMN ai_alerts.alert_id IS 'Unique identifier for the alert';
COMMENT ON COLUMN ai_alerts.alert_type IS 'Type of alert (performance, accuracy, etc.)';
COMMENT ON COLUMN ai_alerts.severity IS 'Severity level of the alert';
COMMENT ON COLUMN ai_alerts.entity_type IS 'Type of entity the alert relates to';
COMMENT ON COLUMN ai_alerts.entity_id IS 'ID of the entity the alert relates to';
COMMENT ON COLUMN ai_alerts.title IS 'Short descriptive title of the alert';
COMMENT ON COLUMN ai_alerts.description IS 'Detailed description of the alert';
COMMENT ON COLUMN ai_alerts.metrics IS 'JSON object containing relevant metrics';
COMMENT ON COLUMN ai_alerts.threshold_config IS 'Configuration of thresholds that triggered the alert';
COMMENT ON COLUMN ai_alerts.correlation_id IS 'ID for correlating related alerts';
COMMENT ON COLUMN ai_alerts.parent_alert_id IS 'ID of parent alert if this is a child alert';
COMMENT ON COLUMN ai_alerts.acknowledged_at IS 'When the alert was acknowledged';
COMMENT ON COLUMN ai_alerts.acknowledged_by IS 'Who acknowledged the alert';
COMMENT ON COLUMN ai_alerts.resolved_at IS 'When the alert was resolved';
COMMENT ON COLUMN ai_alerts.resolved_by IS 'Who resolved the alert';
COMMENT ON COLUMN ai_alerts.resolution IS 'Description of how the alert was resolved';
COMMENT ON COLUMN ai_alerts.escalated_at IS 'When the alert was escalated';
COMMENT ON COLUMN ai_alerts.escalated_to IS 'Who or what the alert was escalated to';
COMMENT ON COLUMN ai_alerts.escalation_level IS 'Current escalation level (0 = not escalated)';
COMMENT ON COLUMN ai_alerts.suppressed IS 'Whether the alert is suppressed';
COMMENT ON COLUMN ai_alerts.suppression_reason IS 'Reason for alert suppression';
COMMENT ON COLUMN ai_alerts.actions_taken IS 'Array of actions taken on this alert';
COMMENT ON COLUMN ai_alerts.tags IS 'Array of tags for categorization';
COMMENT ON COLUMN ai_alerts.notification_sent IS 'Whether notification has been sent';
COMMENT ON COLUMN ai_alerts.notification_channels IS 'Channels where notifications were sent';
COMMENT ON COLUMN ai_alerts.false_positive IS 'Whether this alert was identified as a false positive';
