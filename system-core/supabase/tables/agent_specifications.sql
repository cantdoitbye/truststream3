CREATE TABLE agent_specifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES ai_agents(id),
    specification_name VARCHAR(255) NOT NULL,
    version VARCHAR(50) DEFAULT '1.0.0',
    constraints JSONB NOT NULL DEFAULT '{}',
    success_metrics JSONB NOT NULL DEFAULT '{}',
    error_handling JSONB NOT NULL DEFAULT '{}',
    workflow_steps JSONB NOT NULL DEFAULT '[]',
    validation_rules JSONB NOT NULL DEFAULT '{}',
    training_data_sources JSONB DEFAULT '[]',
    performance_thresholds JSONB DEFAULT '{}',
    created_by UUID REFERENCES profiles(id),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft',
    'active',
    'deprecated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);