-- Migration: create_curated_opportunities_table
-- Created at: 1758237000

-- Create curated opportunities table for the Opportunity Curator Agent
CREATE TABLE IF NOT EXISTS curated_opportunities (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    opportunity_type VARCHAR(100),
    skills_required JSONB,
    compensation_data JSONB,
    deadline TIMESTAMP WITH TIME ZONE,
    source_url VARCHAR(500),
    curator_id VARCHAR(255),
    difficulty_level VARCHAR(50),
    quality_score DECIMAL(5,4) DEFAULT 0,
    match_potential DECIMAL(5,4) DEFAULT 0,
    urgency_level VARCHAR(50),
    market_value DECIMAL(10,2) DEFAULT 0,
    trust_requirements DECIMAL(5,4) DEFAULT 0.5,
    curator_trust_score DECIMAL(5,4) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    curation_algorithm VARCHAR(50),
    curated_by_agent VARCHAR(100),
    view_count INTEGER DEFAULT 0,
    application_count INTEGER DEFAULT 0,
    project_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);;