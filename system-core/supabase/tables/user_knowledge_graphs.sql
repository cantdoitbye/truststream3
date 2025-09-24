CREATE TABLE user_knowledge_graphs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    graph_data JSONB NOT NULL,
    node_count INTEGER DEFAULT 0,
    relationship_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);