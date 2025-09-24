CREATE TABLE agent_communication_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_name VARCHAR(100) NOT NULL,
    channel_type VARCHAR(20) DEFAULT 'direct',
    participants TEXT[] NOT NULL,
    message_schema JSONB,
    routing_rules JSONB,
    priority_levels JSONB,
    persistence_policy VARCHAR(20) DEFAULT 'temporary',
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);