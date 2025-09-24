CREATE TABLE specialized_agents_v4 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_type VARCHAR(100) NOT NULL,
    agent_name VARCHAR(200) NOT NULL,
    region_code VARCHAR(10) NOT NULL,
    capabilities JSONB DEFAULT '{}',
    configuration JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'active',
    trust_score DECIMAL(5,2) DEFAULT 0.0,
    performance_metrics JSONB DEFAULT '{}',
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);