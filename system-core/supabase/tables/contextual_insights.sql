CREATE TABLE contextual_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope TEXT NOT NULL,
    time_window TEXT NOT NULL,
    insight_data JSONB NOT NULL,
    confidence_score NUMERIC DEFAULT 0.5,
    actionable_items INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);