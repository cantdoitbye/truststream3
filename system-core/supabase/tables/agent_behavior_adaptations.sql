CREATE TABLE agent_behavior_adaptations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL,
    user_id UUID NOT NULL,
    adaptation_data JSONB NOT NULL,
    confidence_score NUMERIC DEFAULT 0.5,
    interaction_goal TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);