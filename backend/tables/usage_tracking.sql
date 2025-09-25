-- Usage Tracking Table
-- Monitors resource consumption and workflow execution metrics
CREATE TABLE usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    workflow_id UUID NOT NULL,
    workflow_run_id UUID NOT NULL,
    
    -- Workflow information
    workflow_name VARCHAR(255) NOT NULL,
    workflow_version VARCHAR(50) DEFAULT '1.0',
    node_count INTEGER DEFAULT 0,
    complexity_score INTEGER DEFAULT 1,
    
    -- Resource consumption (actual usage)
    actual_cpu_cores DECIMAL(8,4) DEFAULT 0,
    actual_memory_mb INTEGER DEFAULT 0,
    actual_gpu_cores DECIMAL(8,4) DEFAULT 0,
    actual_storage_mb INTEGER DEFAULT 0,
    execution_time_seconds INTEGER DEFAULT 0,
    
    -- Estimated vs actual comparison
    estimated_cost DECIMAL(12,6) NOT NULL,
    actual_cost DECIMAL(12,6) NOT NULL,
    cost_variance DECIMAL(12,6) GENERATED ALWAYS AS (actual_cost - estimated_cost) STORED,
    cost_variance_percent DECIMAL(8,4) GENERATED ALWAYS AS (
        CASE 
            WHEN estimated_cost > 0 THEN (actual_cost - estimated_cost) / estimated_cost * 100
            ELSE 0
        END
    ) STORED,
    
    -- Execution results
    execution_status VARCHAR(20) DEFAULT 'running' CHECK (execution_status IN (
        'queued', 'running', 'completed', 'failed', 'cancelled', 'timeout'
    )),
    error_code VARCHAR(50),
    error_message TEXT,
    
    -- Performance metrics
    queue_time_seconds INTEGER DEFAULT 0,
    startup_time_seconds INTEGER DEFAULT 0,
    processing_time_seconds INTEGER DEFAULT 0,
    cleanup_time_seconds INTEGER DEFAULT 0,
    
    -- Resource efficiency metrics
    cpu_utilization_percent DECIMAL(5,2) DEFAULT 0,
    memory_utilization_percent DECIMAL(5,2) DEFAULT 0,
    gpu_utilization_percent DECIMAL(5,2) DEFAULT 0,
    
    -- Network and I/O metrics
    network_bytes_in BIGINT DEFAULT 0,
    network_bytes_out BIGINT DEFAULT 0,
    disk_reads_mb INTEGER DEFAULT 0,
    disk_writes_mb INTEGER DEFAULT 0,
    
    -- AI/LLM specific metrics
    ai_tokens_consumed INTEGER DEFAULT 0,
    ai_api_calls INTEGER DEFAULT 0,
    ai_model_usage JSONB DEFAULT '{}',
    
    -- Geographic and system info
    execution_region VARCHAR(50),
    compute_node_id VARCHAR(100),
    container_id VARCHAR(100),
    
    -- Timestamps
    queued_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying and analytics
CREATE INDEX idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX idx_usage_tracking_workflow_id ON usage_tracking(workflow_id);
CREATE INDEX idx_usage_tracking_created_at ON usage_tracking(created_at DESC);
CREATE INDEX idx_usage_tracking_status ON usage_tracking(execution_status);
CREATE INDEX idx_usage_tracking_cost ON usage_tracking(actual_cost DESC);
CREATE INDEX idx_usage_tracking_variance ON usage_tracking(cost_variance_percent DESC);
CREATE INDEX idx_usage_tracking_user_date ON usage_tracking(user_id, created_at DESC);

-- Indexes for analytics queries
CREATE INDEX idx_usage_tracking_daily_stats ON usage_tracking(user_id, DATE(created_at));
CREATE INDEX idx_usage_tracking_workflow_perf ON usage_tracking(workflow_id, execution_status, created_at);

-- Comments for documentation
COMMENT ON TABLE usage_tracking IS 'Detailed tracking of workflow executions and resource consumption';
COMMENT ON COLUMN usage_tracking.cost_variance IS 'Difference between actual and estimated cost (auto-calculated)';
COMMENT ON COLUMN usage_tracking.ai_model_usage IS 'Details of AI model usage (model names, token counts, etc.)';