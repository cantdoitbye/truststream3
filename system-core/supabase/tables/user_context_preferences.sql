CREATE TABLE user_context_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    preference_type TEXT NOT NULL,
    preference_data JSONB NOT NULL,
    update_source TEXT DEFAULT 'user',
    confidence_score NUMERIC DEFAULT 0.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);