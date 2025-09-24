CREATE TABLE trust_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    information_id TEXT NOT NULL,
    information_type TEXT NOT NULL,
    validation_results JSONB NOT NULL,
    overall_reliability NUMERIC NOT NULL,
    confidence_level NUMERIC DEFAULT 0.5,
    validation_flags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);