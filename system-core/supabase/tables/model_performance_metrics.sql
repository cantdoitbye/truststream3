-- Model Performance Metrics Table
-- Stores aggregated performance metrics for AI models

CREATE TABLE model_performance_metrics (
    model_id VARCHAR(255) PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL,
    model_version VARCHAR(100) NOT NULL,
    inference_latency_avg DECIMAL(10,3) DEFAULT 0,
    inference_latency_p95 DECIMAL(10,3) DEFAULT 0,
    tokens_per_second DECIMAL(10,3) DEFAULT 0,
    gpu_utilization DECIMAL(5,4) DEFAULT 0 CHECK (gpu_utilization >= 0 AND gpu_utilization <= 1),
    memory_usage DECIMAL(12,3) DEFAULT 0,
    cache_hit_rate DECIMAL(5,4) DEFAULT 0 CHECK (cache_hit_rate >= 0 AND cache_hit_rate <= 1),
    accuracy_metrics JSONB DEFAULT '{}',
    cost_per_request DECIMAL(10,6) DEFAULT 0,
    error_rate DECIMAL(5,4) DEFAULT 0 CHECK (error_rate >= 0 AND error_rate <= 1),
    drift_score DECIMAL(5,4) DEFAULT 0 CHECK (drift_score >= 0 AND drift_score <= 1),
    performance_trend VARCHAR(50) DEFAULT 'stable' CHECK (performance_trend IN ('improving', 'stable', 'degrading')),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_model_performance_model_name (model_name),
    INDEX idx_model_performance_model_version (model_version),
    INDEX idx_model_performance_last_updated (last_updated),
    INDEX idx_model_performance_inference_latency (inference_latency_avg),
    INDEX idx_model_performance_drift_score (drift_score),
    INDEX idx_model_performance_performance_trend (performance_trend)
);

-- Row Level Security
ALTER TABLE model_performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read access for all users" ON model_performance_metrics
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON model_performance_metrics
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON model_performance_metrics
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_model_performance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_model_performance_updated_at
    BEFORE UPDATE ON model_performance_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_model_performance_updated_at();

-- Comments
COMMENT ON TABLE model_performance_metrics IS 'Aggregated performance metrics for AI models';
COMMENT ON COLUMN model_performance_metrics.model_id IS 'Unique identifier for the model';
COMMENT ON COLUMN model_performance_metrics.model_name IS 'Human-readable name of the model';
COMMENT ON COLUMN model_performance_metrics.model_version IS 'Version of the model';
COMMENT ON COLUMN model_performance_metrics.inference_latency_avg IS 'Average inference latency in milliseconds';
COMMENT ON COLUMN model_performance_metrics.inference_latency_p95 IS '95th percentile inference latency in milliseconds';
COMMENT ON COLUMN model_performance_metrics.tokens_per_second IS 'Throughput in tokens per second';
COMMENT ON COLUMN model_performance_metrics.gpu_utilization IS 'GPU utilization as a decimal (0-1)';
COMMENT ON COLUMN model_performance_metrics.memory_usage IS 'Memory usage in MB';
COMMENT ON COLUMN model_performance_metrics.cache_hit_rate IS 'Cache hit rate as a decimal (0-1)';
COMMENT ON COLUMN model_performance_metrics.accuracy_metrics IS 'JSON object containing various accuracy metrics';
COMMENT ON COLUMN model_performance_metrics.cost_per_request IS 'Cost per request in dollars';
COMMENT ON COLUMN model_performance_metrics.error_rate IS 'Error rate as a decimal (0-1)';
COMMENT ON COLUMN model_performance_metrics.drift_score IS 'Model drift score as a decimal (0-1)';
COMMENT ON COLUMN model_performance_metrics.performance_trend IS 'Overall performance trend';
