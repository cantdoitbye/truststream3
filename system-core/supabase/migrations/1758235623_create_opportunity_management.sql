-- Migration: create_opportunity_management
-- Created at: 1758235623

CREATE TABLE opportunity_management (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id VARCHAR(100) UNIQUE NOT NULL,
    opportunity_type VARCHAR(30) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    requirements JSONB NOT NULL DEFAULT '{}',
    compensation JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    source_platform VARCHAR(50),
    curator_agent_id VARCHAR(50) NOT NULL,
    matched_members JSONB NOT NULL DEFAULT '[]',
    dao_integration JSONB NOT NULL DEFAULT '{}',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);;