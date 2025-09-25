CREATE TABLE ai_governance_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name VARCHAR(255) NOT NULL,
    agent_type VARCHAR(100) CHECK (agent_type IN ('efficiency',
    'quality',
    'transparency',
    'accountability',
    'innovation')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active',
    'inactive',
    'maintenance')),
    trust_score DECIMAL(5,4) DEFAULT 1.0,
    success_rate DECIMAL(5,4) DEFAULT 0.0,
    response_time_ms INTEGER DEFAULT 0,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    performance_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);