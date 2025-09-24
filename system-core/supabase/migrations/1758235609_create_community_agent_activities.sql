-- Migration: create_community_agent_activities
-- Created at: 1758235609

CREATE TABLE community_agent_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(50) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    activity_details JSONB NOT NULL DEFAULT '{}',
    community_impact JSONB NOT NULL DEFAULT '{}',
    trust_impact JSONB NOT NULL DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'
);;