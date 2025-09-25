CREATE TABLE trust_scores_4d (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    iq_score DECIMAL(5,4) DEFAULT 0.0,
    appeal_score DECIMAL(5,4) DEFAULT 0.0,
    social_score DECIMAL(5,4) DEFAULT 0.0,
    humanity_score DECIMAL(5,4) DEFAULT 0.0,
    overall_trust_score DECIMAL(5,4) DEFAULT 0.0,
    score_metadata JSONB DEFAULT '{}',
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);