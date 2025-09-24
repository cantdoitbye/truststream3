CREATE TABLE agent_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    agent_id TEXT,
    memory_type TEXT NOT NULL,
    memory_data JSONB NOT NULL,
    confidence_score NUMERIC DEFAULT 0.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);