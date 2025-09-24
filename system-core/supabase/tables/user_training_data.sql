CREATE TABLE user_training_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('debate_argument',
    'community_post',
    'visual_content',
    'user_interaction')),
    source_id UUID NOT NULL,
    community_id UUID REFERENCES communities(id),
    user_id UUID REFERENCES profiles(id),
    data_content TEXT NOT NULL,
    data_metadata JSONB DEFAULT '{}',
    quality_score DECIMAL(3,2) DEFAULT 0,
    processed_at TIMESTAMP WITH TIME ZONE,
    used_for_training BOOLEAN DEFAULT false,
    training_context JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);