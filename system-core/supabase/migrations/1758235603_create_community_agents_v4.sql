-- Migration: create_community_agents_v4
-- Created at: 1758235603

CREATE TABLE community_agents_v4 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(50) UNIQUE NOT NULL,
    agent_name VARCHAR(100) NOT NULL,
    agent_type VARCHAR(50) NOT NULL,
    capabilities JSONB NOT NULL DEFAULT '[]',
    configuration JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    trust_score_4d JSONB NOT NULL DEFAULT '{"iq": 0, "appeal": 0, "social": 0, "humanity": 0}',
    performance_metrics JSONB NOT NULL DEFAULT '{}',
    operational_data JSONB NOT NULL DEFAULT '{}',
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);;