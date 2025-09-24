CREATE TABLE agent_coordination_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID,
    strategy TEXT NOT NULL,
    agents TEXT[] NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    coordination_data JSONB
);