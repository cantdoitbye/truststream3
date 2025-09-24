-- Migration: create_content_seeder_tables
-- Created at: 1758236705

-- Create curated content table
CREATE TABLE IF NOT EXISTS curated_content (
    id SERIAL PRIMARY KEY,
    content TEXT,
    source_url VARCHAR(500),
    creator_id VARCHAR(255),
    content_type VARCHAR(100),
    primary_category VARCHAR(100),
    secondary_categories JSONB,
    trust_score DECIMAL(5,4) DEFAULT 0,
    engagement_potential DECIMAL(5,4) DEFAULT 0,
    quality_score DECIMAL(5,4) DEFAULT 0,
    knowledge_value DECIMAL(5,4) DEFAULT 0,
    debate_potential DECIMAL(5,4) DEFAULT 0,
    fun_factor DECIMAL(5,4) DEFAULT 0,
    opportunity_relevance DECIMAL(5,4) DEFAULT 0,
    engagement_goals JSONB,
    creator_trust_score DECIMAL(5,4) DEFAULT 0,
    curation_algorithm VARCHAR(50),
    curated_by_agent VARCHAR(100),
    status VARCHAR(50) DEFAULT 'curated',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create content seeding campaigns table
CREATE TABLE IF NOT EXISTS content_seeding_campaigns (
    id SERIAL PRIMARY KEY,
    strategy VARCHAR(100),
    target_categories JSONB,
    community_needs JSONB,
    seeding_plan JSONB,
    status VARCHAR(50) DEFAULT 'active',
    created_by_agent VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create content performance tracking
CREATE TABLE IF NOT EXISTS content_performance (
    id SERIAL PRIMARY KEY,
    content_id INTEGER REFERENCES curated_content(id),
    metric_type VARCHAR(100),
    metric_value DECIMAL(10,4),
    measurement_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create content engagement tracking
CREATE TABLE IF NOT EXISTS content_engagements (
    id SERIAL PRIMARY KEY,
    content_id INTEGER REFERENCES curated_content(id),
    user_id VARCHAR(255),
    engagement_type VARCHAR(100), -- like, comment, share, view
    engagement_value INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);;