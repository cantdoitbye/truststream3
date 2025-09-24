CREATE TABLE rag_knowledge_bases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL,
    knowledge_base_name VARCHAR(200) NOT NULL,
    vector_store_config JSONB DEFAULT '{}',
    embedding_model VARCHAR(100) DEFAULT 'text-embedding-ada-002',
    chunk_size INTEGER DEFAULT 1000,
    chunk_overlap INTEGER DEFAULT 200,
    retrieval_config JSONB DEFAULT '{}',
    trust_filtering_enabled BOOLEAN DEFAULT true,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    document_count INTEGER DEFAULT 0,
    total_chunks INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);