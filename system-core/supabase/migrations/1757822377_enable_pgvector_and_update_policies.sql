-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to policy_documents table
ALTER TABLE policy_documents 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create index on embedding column for faster similarity search
CREATE INDEX IF NOT EXISTS policy_documents_embedding_idx 
ON policy_documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create a function to search policy documents by vector similarity
CREATE OR REPLACE FUNCTION match_policy_documents (
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_types text[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  document_type text,
  authority_level text,
  status text,
  created_at timestamptz,
  created_by uuid,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pd.id,
    pd.title,
    pd.content,
    pd.document_type,
    pd.authority_level,
    pd.status,
    pd.created_at,
    pd.created_by,
    1 - (pd.embedding <=> query_embedding) as similarity
  FROM policy_documents pd
  WHERE 
    pd.status = 'active' 
    AND pd.embedding IS NOT NULL
    AND (filter_types IS NULL OR pd.document_type = ANY(filter_types))
    AND 1 - (pd.embedding <=> query_embedding) > match_threshold
  ORDER BY pd.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create a more general search function that combines text and vector search
CREATE OR REPLACE FUNCTION search_policies (
  query_embedding vector(1536) DEFAULT NULL,
  search_text text DEFAULT NULL,
  match_count int DEFAULT 10,
  filter_types text[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  document_type text,
  authority_level text,
  status text,
  created_at timestamptz,
  created_by uuid,
  similarity float,
  search_method text
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- If we have an embedding, use vector search
  IF query_embedding IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      pd.id,
      pd.title,
      pd.content,
      pd.document_type,
      pd.authority_level,
      pd.status,
      pd.created_at,
      pd.created_by,
      1 - (pd.embedding <=> query_embedding) as similarity,
      'vector'::text as search_method
    FROM policy_documents pd
    WHERE 
      pd.status = 'active' 
      AND pd.embedding IS NOT NULL
      AND (filter_types IS NULL OR pd.document_type = ANY(filter_types))
    ORDER BY pd.embedding <=> query_embedding
    LIMIT match_count;
  -- Otherwise, use text search if available
  ELSIF search_text IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      pd.id,
      pd.title,
      pd.content,
      pd.document_type,
      pd.authority_level,
      pd.status,
      pd.created_at,
      pd.created_by,
      0.5::float as similarity,  -- Default similarity score for text search
      'text'::text as search_method
    FROM policy_documents pd
    WHERE 
      pd.status = 'active'
      AND (filter_types IS NULL OR pd.document_type = ANY(filter_types))
      AND (
        pd.title ILIKE '%' || search_text || '%' OR
        pd.content ILIKE '%' || search_text || '%'
      )
    ORDER BY 
      CASE 
        WHEN pd.title ILIKE '%' || search_text || '%' THEN 1
        ELSE 2
      END,
      pd.created_at DESC
    LIMIT match_count;
  -- Fallback: return most recent policies
  ELSE
    RETURN QUERY
    SELECT 
      pd.id,
      pd.title,
      pd.content,
      pd.document_type,
      pd.authority_level,
      pd.status,
      pd.created_at,
      pd.created_by,
      0.3::float as similarity,
      'fallback'::text as search_method
    FROM policy_documents pd
    WHERE 
      pd.status = 'active'
      AND (filter_types IS NULL OR pd.document_type = ANY(filter_types))
    ORDER BY pd.created_at DESC
    LIMIT match_count;
  END IF;
END;
$$;

-- Grant execute permissions on the new functions
GRANT EXECUTE ON FUNCTION match_policy_documents TO authenticated, anon;
GRANT EXECUTE ON FUNCTION search_policies TO authenticated, anon;

-- Add comment for documentation
COMMENT ON FUNCTION match_policy_documents IS 'Search policy documents using vector similarity with configurable threshold and filters';
COMMENT ON FUNCTION search_policies IS 'Flexible search function supporting both vector and text search with automatic fallback';
