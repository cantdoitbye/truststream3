CREATE TABLE prompt_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID NOT NULL,
    user_id UUID NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    use_case_context JSONB,
    effectiveness_score INTEGER CHECK (effectiveness_score >= 1 AND effectiveness_score <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);