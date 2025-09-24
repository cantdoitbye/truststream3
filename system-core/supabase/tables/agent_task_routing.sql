CREATE TABLE agent_task_routing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_type TEXT NOT NULL,
    assigned_agent TEXT NOT NULL,
    routing_score NUMERIC NOT NULL,
    priority TEXT DEFAULT 'medium',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_context JSONB
);