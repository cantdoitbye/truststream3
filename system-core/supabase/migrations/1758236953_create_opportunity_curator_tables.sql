-- Migration: create_opportunity_curator_tables
-- Created at: 1758236953

-- Create opportunity tokens for NFT tokenization
CREATE TABLE IF NOT EXISTS opportunity_tokens (
    id SERIAL PRIMARY KEY,
    opportunity_id INTEGER REFERENCES curated_opportunities(id),
    token_metadata JSONB,
    tokenization_type VARCHAR(100),
    creator_id VARCHAR(255),
    token_standard VARCHAR(50) DEFAULT 'ERC-721',
    minting_status VARCHAR(50) DEFAULT 'pending',
    blockchain_network VARCHAR(100) DEFAULT 'ethereum',
    created_by_agent VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);\n\n-- Create DAO projects table\nCREATE TABLE IF NOT EXISTS dao_projects (\n    id SERIAL PRIMARY KEY,\n    project_name VARCHAR(255) NOT NULL,\n    project_description TEXT,\n    required_roles JSONB,\n    governance_structure JSONB,\n    token_economics JSONB,\n    project_timeline JSONB,\n    creator_id VARCHAR(255),\n    complexity_score DECIMAL(5,4) DEFAULT 0,\n    governance_score DECIMAL(5,4) DEFAULT 0,\n    viability_score DECIMAL(5,4) DEFAULT 0,\n    status VARCHAR(50) DEFAULT 'forming',\n    member_count INTEGER DEFAULT 1,\n    funding_status VARCHAR(50) DEFAULT 'unfunded',\n    created_by_agent VARCHAR(100),\n    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n);\n\n-- Create opportunity performance tracking\nCREATE TABLE IF NOT EXISTS opportunity_performance (\n    id SERIAL PRIMARY KEY,\n    opportunity_id INTEGER REFERENCES curated_opportunities(id),\n    metric_type VARCHAR(100),\n    metric_value DECIMAL(10,4),\n    recorded_by_agent VARCHAR(100),\n    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n);\n\n-- Create opportunity interactions tracking\nCREATE TABLE IF NOT EXISTS opportunity_interactions (\n    id SERIAL PRIMARY KEY,\n    opportunity_id INTEGER REFERENCES curated_opportunities(id),\n    user_id VARCHAR(255),\n    interaction_type VARCHAR(100), -- view, apply, bookmark, share\n    interaction_data JSONB,\n    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n);\n\n-- Create opportunity applications\nCREATE TABLE IF NOT EXISTS opportunity_applications (\n    id SERIAL PRIMARY KEY,\n    opportunity_id INTEGER REFERENCES curated_opportunities(id),\n    applicant_id VARCHAR(255),\n    application_data JSONB,\n    status VARCHAR(50) DEFAULT 'pending',\n    skill_match_score DECIMAL(5,4),\n    trust_score_at_application DECIMAL(5,4),\n    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n);\n\n-- Add foreign key reference from curated_opportunities to dao_projects\nALTER TABLE curated_opportunities \nADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES dao_projects(id);";