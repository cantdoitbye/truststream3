CREATE TABLE agent_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_name VARCHAR(200) NOT NULL,
    workflow_type VARCHAR(100) NOT NULL,
    trigger_conditions JSONB DEFAULT '{}',
    agent_sequence JSONB DEFAULT '[]',
    execution_rules JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    success_rate DECIMAL(5,2) DEFAULT 0.0,
    avg_execution_time_ms INTEGER DEFAULT 0,
    last_executed TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);