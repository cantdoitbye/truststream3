-- Migration: create_marketing_tables
-- Created at: 1758236146

-- Create marketing campaigns table
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    platforms JSONB,
    target_audience VARCHAR(255),
    content_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    duration_days INTEGER DEFAULT 30,
    budget_allocation JSONB,
    creator_id VARCHAR(255),
    created_by_agent VARCHAR(100),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    performance_metrics JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create content optimizations table for tracking optimization history
CREATE TABLE IF NOT EXISTS content_optimizations (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES marketing_campaigns(id),
    platform VARCHAR(50),
    optimization_type VARCHAR(100),
    engagement_prediction DECIMAL(5,4),
    trust_impact DECIMAL(5,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create campaign performance tracking
CREATE TABLE IF NOT EXISTS campaign_performance (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES marketing_campaigns(id),
    platform VARCHAR(50),
    date_recorded DATE,
    reach INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,4) DEFAULT 0,
    trust_weighted_engagement DECIMAL(5,4) DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);;