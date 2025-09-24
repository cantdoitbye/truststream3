CREATE TABLE consolidated_community_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consolidation_type TEXT NOT NULL,
    memory_data JSONB NOT NULL,
    consolidation_score NUMERIC DEFAULT 0.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);