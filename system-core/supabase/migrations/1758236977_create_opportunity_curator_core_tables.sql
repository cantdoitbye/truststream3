-- Migration: create_opportunity_curator_core_tables
-- Created at: 1758236977

-- Create DAO projects table
CREATE TABLE IF NOT EXISTS dao_projects (
    id SERIAL PRIMARY KEY,
    project_name VARCHAR(255) NOT NULL,
    project_description TEXT,
    required_roles JSONB,
    governance_structure JSONB,
    token_economics JSONB,
    project_timeline JSONB,
    creator_id VARCHAR(255),
    complexity_score DECIMAL(5,4) DEFAULT 0,
    governance_score DECIMAL(5,4) DEFAULT 0,
    viability_score DECIMAL(5,4) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'forming',
    member_count INTEGER DEFAULT 1,
    funding_status VARCHAR(50) DEFAULT 'unfunded',
    created_by_agent VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create opportunity tokens for NFT tokenization
CREATE TABLE IF NOT EXISTS opportunity_tokens (
    id SERIAL PRIMARY KEY,
    opportunity_id INTEGER,
    token_metadata JSONB,
    tokenization_type VARCHAR(100),
    creator_id VARCHAR(255),
    token_standard VARCHAR(50) DEFAULT 'ERC-721',
    minting_status VARCHAR(50) DEFAULT 'pending',
    blockchain_network VARCHAR(100) DEFAULT 'ethereum',
    created_by_agent VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create opportunity performance tracking
CREATE TABLE IF NOT EXISTS opportunity_performance (
    id SERIAL PRIMARY KEY,
    opportunity_id INTEGER,
    metric_type VARCHAR(100),
    metric_value DECIMAL(10,4),
    recorded_by_agent VARCHAR(100),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create opportunity interactions tracking
CREATE TABLE IF NOT EXISTS opportunity_interactions (
    id SERIAL PRIMARY KEY,
    opportunity_id INTEGER,
    user_id VARCHAR(255),
    interaction_type VARCHAR(100),
    interaction_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create opportunity applications
CREATE TABLE IF NOT EXISTS opportunity_applications (
    id SERIAL PRIMARY KEY,
    opportunity_id INTEGER,
    applicant_id VARCHAR(255),
    application_data JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    skill_match_score DECIMAL(5,4),
    trust_score_at_application DECIMAL(5,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);;