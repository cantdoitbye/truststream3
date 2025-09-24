-- Migration: add_vector_embeddings_table
-- Created at: 1758244855

CREATE TABLE IF NOT EXISTS policy_embeddings (
    id SERIAL PRIMARY KEY,
    policy_id UUID REFERENCES policy_documents(id),
    content_chunk TEXT NOT NULL,
    embedding vector(1536),
    chunk_index INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS policy_embeddings_policy_id_idx ON policy_embeddings(policy_id);
CREATE INDEX IF NOT EXISTS policy_embeddings_embedding_idx ON policy_embeddings USING ivfflat (embedding vector_cosine_ops);;