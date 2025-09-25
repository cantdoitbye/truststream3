-- Workflow Cost Estimates Table
-- Stores pre-calculated cost estimates for workflows (from workflow_parser.py)
CREATE TABLE workflow_cost_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Workflow identification
    workflow_name VARCHAR(255) NOT NULL,
    workflow_version VARCHAR(50) DEFAULT '1.0',
    workflow_hash VARCHAR(64), -- Hash of workflow JSON for change detection
    
    -- Basic workflow metrics from parser
    node_count INTEGER DEFAULT 0,
    supported_node_count INTEGER DEFAULT 0,
    complexity_score INTEGER DEFAULT 1,
    
    -- Resource estimates from workflow_parser ResourceEstimate class
    estimated_cpu_cores DECIMAL(8,4) DEFAULT 0.5,
    estimated_memory_mb INTEGER DEFAULT 512,
    estimated_gpu_cores DECIMAL(8,4) DEFAULT 0.0,
    estimated_storage_mb INTEGER DEFAULT 100,
    estimated_cost_per_run DECIMAL(12,6) DEFAULT 0.01,
    
    -- Cost breakdown
    base_cost DECIMAL(12,6) DEFAULT 0.001,
    complexity_cost DECIMAL(12,6) DEFAULT 0,
    ai_cost DECIMAL(12,6) DEFAULT 0,
    integration_cost DECIMAL(12,6) DEFAULT 0,
    storage_cost DECIMAL(12,6) DEFAULT 0,
    
    -- Node type analysis
    ai_nodes_count INTEGER DEFAULT 0,
    code_nodes_count INTEGER DEFAULT 0,
    integration_nodes_count INTEGER DEFAULT 0,
    webhook_nodes_count INTEGER DEFAULT 0,
    
    -- Cost multipliers and adjustments
    user_tier_multiplier DECIMAL(5,4) DEFAULT 1.0,
    volume_discount DECIMAL(5,4) DEFAULT 0,
    region_multiplier DECIMAL(5,4) DEFAULT 1.0,
    
    -- Validation and security
    validation_status VARCHAR(20) DEFAULT 'pending' CHECK (validation_status IN (
        'pending', 'valid', 'invalid', 'needs_review'
    )),
    security_score INTEGER DEFAULT 100, -- 0-100, lower is more risky
    security_issues JSONB DEFAULT '[]',
    validation_warnings JSONB DEFAULT '[]',
    validation_errors JSONB DEFAULT '[]',
    
    -- Performance predictions
    estimated_execution_time_seconds INTEGER DEFAULT 60,
    estimated_queue_time_seconds INTEGER DEFAULT 10,
    estimated_success_probability DECIMAL(5,4) DEFAULT 0.95,
    
    -- Historical accuracy tracking
    actual_runs_count INTEGER DEFAULT 0,
    average_actual_cost DECIMAL(12,6) DEFAULT 0,
    cost_prediction_accuracy DECIMAL(5,4) DEFAULT 0, -- 0-1 (1 = perfect prediction)
    last_actual_cost DECIMAL(12,6) DEFAULT 0,
    
    -- Metadata and categorization
    workflow_category VARCHAR(50), -- 'ai_assistant', 'data_processing', 'integration', etc.
    workflow_tags JSONB DEFAULT '[]',
    optimization_suggestions JSONB DEFAULT '[]',
    
    -- Status and lifecycle
    estimate_status VARCHAR(20) DEFAULT 'active' CHECK (estimate_status IN (
        'active', 'outdated', 'deprecated', 'archived'
    )),
    is_cached BOOLEAN DEFAULT true,
    cache_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_validation_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_run_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT chk_cost_components CHECK (
        estimated_cost_per_run >= (base_cost + complexity_cost + ai_cost + integration_cost + storage_cost)
    ),
    CONSTRAINT chk_multipliers CHECK (
        user_tier_multiplier > 0 AND 
        volume_discount >= 0 AND volume_discount <= 1 AND
        region_multiplier > 0
    )
);

-- Indexes for efficient querying
CREATE INDEX idx_workflow_estimates_workflow_id ON workflow_cost_estimates(workflow_id);
CREATE INDEX idx_workflow_estimates_user_id ON workflow_cost_estimates(user_id);
CREATE INDEX idx_workflow_estimates_status ON workflow_cost_estimates(estimate_status);
CREATE INDEX idx_workflow_estimates_validation ON workflow_cost_estimates(validation_status);
CREATE INDEX idx_workflow_estimates_cost ON workflow_cost_estimates(estimated_cost_per_run DESC);
CREATE INDEX idx_workflow_estimates_complexity ON workflow_cost_estimates(complexity_score DESC);
CREATE INDEX idx_workflow_estimates_cache ON workflow_cost_estimates(cache_expires_at) WHERE is_cached = true;
CREATE INDEX idx_workflow_estimates_updated ON workflow_cost_estimates(updated_at DESC);
CREATE INDEX idx_workflow_estimates_hash ON workflow_cost_estimates(workflow_hash) WHERE workflow_hash IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX idx_workflow_estimates_user_active ON workflow_cost_estimates(user_id, estimate_status) 
WHERE estimate_status = 'active';
CREATE INDEX idx_workflow_estimates_workflow_latest ON workflow_cost_estimates(workflow_id, created_at DESC);

-- Comments for documentation
COMMENT ON TABLE workflow_cost_estimates IS 'Pre-calculated cost estimates for workflows based on workflow_parser.py analysis';
COMMENT ON COLUMN workflow_cost_estimates.workflow_hash IS 'SHA-256 hash of workflow JSON to detect changes';
COMMENT ON COLUMN workflow_cost_estimates.cost_prediction_accuracy IS 'Accuracy of cost predictions vs actual usage (0-1 scale)';
COMMENT ON COLUMN workflow_cost_estimates.optimization_suggestions IS 'Automated suggestions for reducing workflow costs';