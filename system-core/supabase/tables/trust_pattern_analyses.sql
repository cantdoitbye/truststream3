CREATE TABLE trust_pattern_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_scope TEXT NOT NULL,
    time_window TEXT NOT NULL,
    pattern_data JSONB NOT NULL,
    trust_health TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);