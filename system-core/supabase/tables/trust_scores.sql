CREATE TABLE trust_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    trust_score NUMERIC NOT NULL,
    factor_breakdown JSONB,
    calculation_method TEXT,
    confidence_level NUMERIC DEFAULT 0.5,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);