CREATE TABLE debate_arguments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debate_id UUID REFERENCES community_debates(id),
    user_id UUID REFERENCES profiles(id),
    argument_text TEXT NOT NULL,
    argument_type VARCHAR(50) DEFAULT 'support' CHECK (argument_type IN ('support',
    'oppose',
    'neutral',
    'question')),
    parent_argument_id UUID REFERENCES debate_arguments(id),
    evidence_links JSONB DEFAULT '[]',
    trust_score_impact DECIMAL(3,2) DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,
    ai_quality_score DECIMAL(3,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);