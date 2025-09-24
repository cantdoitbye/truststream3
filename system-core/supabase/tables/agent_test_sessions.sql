CREATE TABLE agent_test_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL,
    test_input JSONB NOT NULL,
    test_output JSONB,
    test_status VARCHAR(50) DEFAULT 'pending',
    performance_metrics JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);