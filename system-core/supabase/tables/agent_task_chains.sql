CREATE TABLE agent_task_chains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_type TEXT NOT NULL,
    total_tasks INTEGER NOT NULL,
    status TEXT DEFAULT 'created',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_context JSONB,
    chain_data JSONB
);