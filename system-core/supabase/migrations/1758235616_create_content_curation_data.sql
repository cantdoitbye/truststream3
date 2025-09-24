-- Migration: create_content_curation_data
-- Created at: 1758235616

CREATE TABLE content_curation_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id VARCHAR(100) UNIQUE NOT NULL,
    content_type VARCHAR(20) NOT NULL,
    category VARCHAR(20) NOT NULL,
    trust_score NUMERIC(3,2) NOT NULL DEFAULT 0.0,
    quality_score NUMERIC(3,2) NOT NULL DEFAULT 0.0,
    engagement_metrics JSONB NOT NULL DEFAULT '{}',
    source_platform VARCHAR(50),
    curator_agent_id VARCHAR(50) NOT NULL,
    content_data JSONB NOT NULL DEFAULT '{}',
    moderation_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);;