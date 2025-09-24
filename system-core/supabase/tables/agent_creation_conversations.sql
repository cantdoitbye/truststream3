CREATE TABLE agent_creation_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL,
    user_id UUID NOT NULL,
    message_text TEXT NOT NULL,
    message_role VARCHAR(50) NOT NULL,
    ai_thinking_process TEXT,
    suggestions JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);