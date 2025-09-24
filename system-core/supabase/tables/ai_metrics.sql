-- AI Metrics Table
-- Stores all AI-related metrics for comprehensive monitoring

CREATE TABLE ai_metrics (
    metric_id VARCHAR(255) PRIMARY KEY,
    agent_id VARCHAR(255),
    model_id VARCHAR(255),
    metric_name VARCHAR(255) NOT NULL,
    metric_value DECIMAL(15,6) NOT NULL,
    metric_unit VARCHAR(50),
    metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('performance', 'accuracy', 'latency', 'throughput', 'resource', 'quality')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    context JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    correlation_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_ai_metrics_agent FOREIGN KEY (agent_id) REFERENCES ai_agents(agent_id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_ai_metrics_timestamp (timestamp),
    INDEX idx_ai_metrics_agent_id (agent_id),
    INDEX idx_ai_metrics_model_id (model_id),
    INDEX idx_ai_metrics_metric_name (metric_name),
    INDEX idx_ai_metrics_metric_type (metric_type),
    INDEX idx_ai_metrics_correlation_id (correlation_id)
);

-- Row Level Security
ALTER TABLE ai_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read access for all users" ON ai_metrics
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON ai_metrics
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON ai_metrics
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Partitioning by timestamp for better performance
CREATE TABLE ai_metrics_y2025m01 PARTITION OF ai_metrics
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE ai_metrics_y2025m02 PARTITION OF ai_metrics
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE TABLE ai_metrics_y2025m03 PARTITION OF ai_metrics
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

-- Add more partitions as needed

-- Comments
COMMENT ON TABLE ai_metrics IS 'Stores all AI-related performance and quality metrics';
COMMENT ON COLUMN ai_metrics.metric_id IS 'Unique identifier for the metric';
COMMENT ON COLUMN ai_metrics.agent_id IS 'ID of the AI agent (if applicable)';
COMMENT ON COLUMN ai_metrics.model_id IS 'ID of the AI model (if applicable)';
COMMENT ON COLUMN ai_metrics.metric_name IS 'Name of the metric being measured';
COMMENT ON COLUMN ai_metrics.metric_value IS 'Numerical value of the metric';
COMMENT ON COLUMN ai_metrics.metric_unit IS 'Unit of measurement (e.g., ms, %, MB)';
COMMENT ON COLUMN ai_metrics.metric_type IS 'Category of the metric';
COMMENT ON COLUMN ai_metrics.context IS 'Additional contextual information';
COMMENT ON COLUMN ai_metrics.tags IS 'Array of tags for categorization';
COMMENT ON COLUMN ai_metrics.correlation_id IS 'ID for correlating related metrics';
