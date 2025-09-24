CREATE TABLE user_context_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    profile_data JSONB NOT NULL,
    completeness_score NUMERIC DEFAULT 0.5,
    effectiveness_score NUMERIC DEFAULT 0.5,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);