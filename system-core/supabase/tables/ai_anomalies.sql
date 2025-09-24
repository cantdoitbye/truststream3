-- AI Anomalies Table
-- Stores detected anomalies in AI systems

CREATE TABLE ai_anomalies (
    anomaly_id VARCHAR(255) PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('agent', 'model', 'system')),
    entity_id VARCHAR(255) NOT NULL,
    anomaly_type VARCHAR(100) NOT NULL CHECK (anomaly_type IN (
        'performance_degradation', 'accuracy_drop', 'resource_spike', 
        'latency_increase', 'error_rate_increase'
    )),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolution TEXT,
    metrics JSONB DEFAULT '{}',
    predicted_impact TEXT,
    recommended_actions TEXT[] DEFAULT '{}',
    confidence_score DECIMAL(5,4) DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
    false_positive BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_ai_anomalies_entity_type (entity_type),
    INDEX idx_ai_anomalies_entity_id (entity_id),
    INDEX idx_ai_anomalies_anomaly_type (anomaly_type),
    INDEX idx_ai_anomalies_severity (severity),
    INDEX idx_ai_anomalies_detected_at (detected_at),
    INDEX idx_ai_anomalies_resolved_at (resolved_at),
    INDEX idx_ai_anomalies_unresolved (resolved_at) WHERE resolved_at IS NULL
);

-- Row Level Security
ALTER TABLE ai_anomalies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read access for all users" ON ai_anomalies
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON ai_anomalies
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON ai_anomalies
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_anomalies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ai_anomalies_updated_at
    BEFORE UPDATE ON ai_anomalies
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_anomalies_updated_at();

-- Comments
COMMENT ON TABLE ai_anomalies IS 'Stores detected anomalies in AI systems';
COMMENT ON COLUMN ai_anomalies.anomaly_id IS 'Unique identifier for the anomaly';
COMMENT ON COLUMN ai_anomalies.entity_type IS 'Type of entity where anomaly was detected';
COMMENT ON COLUMN ai_anomalies.entity_id IS 'ID of the entity where anomaly was detected';
COMMENT ON COLUMN ai_anomalies.anomaly_type IS 'Type of anomaly detected';
COMMENT ON COLUMN ai_anomalies.severity IS 'Severity level of the anomaly';
COMMENT ON COLUMN ai_anomalies.description IS 'Detailed description of the anomaly';
COMMENT ON COLUMN ai_anomalies.detected_at IS 'Timestamp when anomaly was detected';
COMMENT ON COLUMN ai_anomalies.resolved_at IS 'Timestamp when anomaly was resolved';
COMMENT ON COLUMN ai_anomalies.resolution IS 'Description of how the anomaly was resolved';
COMMENT ON COLUMN ai_anomalies.metrics IS 'JSON object containing relevant metrics';
COMMENT ON COLUMN ai_anomalies.predicted_impact IS 'Predicted impact of the anomaly';
COMMENT ON COLUMN ai_anomalies.recommended_actions IS 'Array of recommended actions';
COMMENT ON COLUMN ai_anomalies.confidence_score IS 'Confidence score of the anomaly detection';
COMMENT ON COLUMN ai_anomalies.false_positive IS 'Whether this was identified as a false positive';
