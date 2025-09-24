CREATE TABLE agent_conflict_resolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conflict_type TEXT NOT NULL,
    involved_agents TEXT[] NOT NULL,
    resolution_strategy TEXT NOT NULL,
    context_data JSONB,
    status TEXT DEFAULT 'resolved',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);