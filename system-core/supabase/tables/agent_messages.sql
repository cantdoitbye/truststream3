CREATE TABLE agent_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL,
    sender_agent VARCHAR(100) NOT NULL,
    recipient_agents TEXT[],
    message_type VARCHAR(50),
    content JSONB NOT NULL,
    priority INTEGER DEFAULT 3,
    requires_acknowledgment BOOLEAN DEFAULT false,
    correlation_id UUID,
    response_to UUID,
    ttl_seconds INTEGER DEFAULT 3600,
    status VARCHAR(20) DEFAULT 'sent',
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE
);