-- Agent Performance Metrics Table
-- Stores aggregated performance metrics for AI agents

CREATE TABLE agent_performance_metrics (
    agent_id VARCHAR(255) PRIMARY KEY,
    agent_name VARCHAR(255) NOT NULL,
    agent_type VARCHAR(100) NOT NULL,
    response_time_avg DECIMAL(10,3) DEFAULT 0,
    response_time_p95 DECIMAL(10,3) DEFAULT 0,
    response_time_p99 DECIMAL(10,3) DEFAULT 0,
    success_rate DECIMAL(5,4) DEFAULT 0 CHECK (success_rate >= 0 AND success_rate <= 1),
    error_rate DECIMAL(5,4) DEFAULT 0 CHECK (error_rate >= 0 AND error_rate <= 1),
    throughput DECIMAL(10,3) DEFAULT 0,
    resource_utilization DECIMAL(5,4) DEFAULT 0 CHECK (resource_utilization >= 0 AND resource_utilization <= 1),
    quality_score DECIMAL(5,4) DEFAULT 0 CHECK (quality_score >= 0 AND quality_score <= 1),
    accuracy_score DECIMAL(5,4) DEFAULT 0 CHECK (accuracy_score >= 0 AND accuracy_score <= 1),
    user_satisfaction DECIMAL(5,4) DEFAULT 0 CHECK (user_satisfaction >= 0 AND user_satisfaction <= 1),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_agent_performance_agent FOREIGN KEY (agent_id) REFERENCES ai_agents(agent_id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_agent_performance_agent_type (agent_type),
    INDEX idx_agent_performance_last_updated (last_updated),
    INDEX idx_agent_performance_success_rate (success_rate),
    INDEX idx_agent_performance_quality_score (quality_score)
);

-- Row Level Security
ALTER TABLE agent_performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read access for all users" ON agent_performance_metrics
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON agent_performance_metrics
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON agent_performance_metrics
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_agent_performance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_agent_performance_updated_at
    BEFORE UPDATE ON agent_performance_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_performance_updated_at();

-- Comments
COMMENT ON TABLE agent_performance_metrics IS 'Aggregated performance metrics for AI agents';
COMMENT ON COLUMN agent_performance_metrics.agent_id IS 'Unique identifier for the agent';
COMMENT ON COLUMN agent_performance_metrics.agent_name IS 'Human-readable name of the agent';
COMMENT ON COLUMN agent_performance_metrics.agent_type IS 'Type/category of the agent';
COMMENT ON COLUMN agent_performance_metrics.response_time_avg IS 'Average response time in milliseconds';
COMMENT ON COLUMN agent_performance_metrics.response_time_p95 IS '95th percentile response time in milliseconds';
COMMENT ON COLUMN agent_performance_metrics.response_time_p99 IS '99th percentile response time in milliseconds';
COMMENT ON COLUMN agent_performance_metrics.success_rate IS 'Success rate as a decimal (0-1)';
COMMENT ON COLUMN agent_performance_metrics.error_rate IS 'Error rate as a decimal (0-1)';
COMMENT ON COLUMN agent_performance_metrics.throughput IS 'Throughput in requests per minute';
COMMENT ON COLUMN agent_performance_metrics.resource_utilization IS 'Resource utilization as a decimal (0-1)';
COMMENT ON COLUMN agent_performance_metrics.quality_score IS 'Quality score as a decimal (0-1)';
COMMENT ON COLUMN agent_performance_metrics.accuracy_score IS 'Accuracy score as a decimal (0-1)';
COMMENT ON COLUMN agent_performance_metrics.user_satisfaction IS 'User satisfaction score as a decimal (0-1)';
