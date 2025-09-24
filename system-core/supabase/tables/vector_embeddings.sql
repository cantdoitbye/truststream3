CREATE TABLE vector_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID,
    content_type TEXT NOT NULL,
    embedding_vector NUMERIC[],
    metadata JSONB,
    trust_score NUMERIC DEFAULT 0.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);