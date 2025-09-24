CREATE TABLE rag_ai_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    agent_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    configuration JSONB DEFAULT '{}',
    n8n_workflow_id VARCHAR(255),
    langchain_config JSONB DEFAULT '{}',
    rag_knowledge_base_id UUID,
    real_time_thinking BOOLEAN DEFAULT false,
    conversation_memory JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);