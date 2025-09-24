CREATE TABLE community_learning_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_data JSONB NOT NULL,
    time_window TEXT NOT NULL,
    pattern_strength NUMERIC DEFAULT 0.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);