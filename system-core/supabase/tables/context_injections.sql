CREATE TABLE context_injections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    agent_id TEXT NOT NULL,
    interaction_type TEXT NOT NULL,
    context_data JSONB NOT NULL,
    context_strength NUMERIC DEFAULT 0.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);