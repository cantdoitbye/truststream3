CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL,
    initiated_by UUID,
    execution_context JSONB,
    current_step INTEGER DEFAULT 0,
    total_steps INTEGER,
    execution_status VARCHAR(20) DEFAULT 'running',
    results JSONB,
    error_logs JSONB,
    performance_metrics JSONB,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    estimated_completion TIMESTAMP WITH TIME ZONE
);