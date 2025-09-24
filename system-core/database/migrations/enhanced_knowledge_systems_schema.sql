-- Enhanced Knowledge Systems Schema
-- Extends existing VectorGraph architecture with advanced knowledge management
-- Author: MiniMax Agent
-- Date: 2025-09-21

-- =====================================================
-- 1. KNOWLEDGE GRAPH ENHANCEMENTS
-- =====================================================

-- Enhanced knowledge graph edges table
CREATE TABLE IF NOT EXISTS knowledge_graph_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edge_id VARCHAR(100) UNIQUE NOT NULL,
    graph_id VARCHAR(100) NOT NULL,
    source_node_id VARCHAR(100) NOT NULL,
    target_node_id VARCHAR(100) NOT NULL,
    relationship_type VARCHAR(100) NOT NULL,
    weight DECIMAL(5,4) DEFAULT 0.0,
    confidence DECIMAL(5,4) DEFAULT 0.0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints with existing VectorGraph
    CONSTRAINT fk_source_node FOREIGN KEY (source_node_id) REFERENCES vectorgraph_memory_objects(memory_id),
    CONSTRAINT fk_target_node FOREIGN KEY (target_node_id) REFERENCES vectorgraph_memory_objects(memory_id)
);

-- Semantic search optimization indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_edges_source ON knowledge_graph_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_edges_target ON knowledge_graph_edges(target_node_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_edges_relationship ON knowledge_graph_edges(relationship_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_edges_weight ON knowledge_graph_edges(weight DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_edges_confidence ON knowledge_graph_edges(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_edges_graph ON knowledge_graph_edges(graph_id);

-- =====================================================
-- 2. CROSS-COMMUNITY KNOWLEDGE SYNCHRONIZATION
-- =====================================================

-- Community knowledge profiles for governance
CREATE TABLE IF NOT EXISTS community_knowledge_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id VARCHAR(100) UNIQUE NOT NULL,
    knowledge_domains JSONB DEFAULT '[]',
    trust_standards JSONB NOT NULL DEFAULT '{
        "min_iq_score": 0.5,
        "min_appeal_score": 0.5,
        "min_social_score": 0.5,
        "min_humanity_score": 0.5
    }',
    governance_policies JSONB NOT NULL DEFAULT '{
        "auto_accept_threshold": 0.8,
        "require_expert_review": false,
        "community_vote_required": false
    }',
    knowledge_preferences JSONB NOT NULL DEFAULT '{
        "preferred_content_types": ["text", "concept"],
        "language_preferences": ["en"],
        "cultural_sensitivity_level": 0.7
    }',
    sync_restrictions JSONB NOT NULL DEFAULT '{
        "blacklisted_sources": [],
        "restricted_domains": [],
        "max_sync_frequency": 24
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge synchronization results tracking
CREATE TABLE IF NOT EXISTS knowledge_sync_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_id VARCHAR(100) UNIQUE NOT NULL,
    source_community VARCHAR(100) NOT NULL,
    target_communities JSONB NOT NULL,
    synced_nodes JSONB DEFAULT '[]',
    synced_relationships JSONB DEFAULT '[]',
    conflicts_detected JSONB DEFAULT '[]',
    sync_metrics JSONB DEFAULT '{}',
    validation_status JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Knowledge conflict tracking and resolution
CREATE TABLE IF NOT EXISTS knowledge_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conflict_id VARCHAR(100) UNIQUE NOT NULL,
    conflict_type VARCHAR(50) NOT NULL,
    source_community VARCHAR(100) NOT NULL,
    target_community VARCHAR(100) NOT NULL,
    conflicting_node_ids JSONB NOT NULL,
    conflict_analysis JSONB DEFAULT '{}',
    resolution_suggestions JSONB DEFAULT '[]',
    resolution_result JSONB,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending'
);

-- Knowledge transformations for cross-community adaptation
CREATE TABLE IF NOT EXISTS knowledge_transformations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transformation_id VARCHAR(100) UNIQUE NOT NULL,
    source_node_id VARCHAR(100) NOT NULL,
    target_node_id VARCHAR(100) NOT NULL,
    transformation_type VARCHAR(50) NOT NULL,
    transformation_metadata JSONB DEFAULT '{}',
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    success_metrics JSONB DEFAULT '{}',
    
    -- Foreign key to existing memory objects
    CONSTRAINT fk_transformation_source FOREIGN KEY (source_node_id) REFERENCES vectorgraph_memory_objects(memory_id),
    CONSTRAINT fk_transformation_target FOREIGN KEY (target_node_id) REFERENCES vectorgraph_memory_objects(memory_id)
);

-- =====================================================
-- 3. ADVANCED SEMANTIC SEARCH INFRASTRUCTURE
-- =====================================================

-- Search intent analysis cache
CREATE TABLE IF NOT EXISTS search_intent_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key VARCHAR(100) UNIQUE NOT NULL,
    query_text TEXT NOT NULL,
    intent_analysis JSONB NOT NULL,
    extracted_entities JSONB DEFAULT '[]',
    query_expansions JSONB DEFAULT '[]',
    confidence_score DECIMAL(5,4) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour')
);

-- User search contexts and personalization
CREATE TABLE IF NOT EXISTS user_search_contexts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    session_id VARCHAR(100) NOT NULL,
    domain_preferences JSONB DEFAULT '[]',
    trust_profile JSONB NOT NULL DEFAULT '{
        "min_trust_threshold": 0.5,
        "preferred_sources": [],
        "validation_requirements": []
    }',
    personalization_factors JSONB NOT NULL DEFAULT '{
        "expertise_level": "intermediate",
        "preferred_complexity": "moderate",
        "learning_style": "textual"
    }',
    search_history JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced search results with analytics
CREATE TABLE IF NOT EXISTS enhanced_search_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    search_id VARCHAR(100) UNIQUE NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    query_text TEXT NOT NULL,
    query_embedding VECTOR(1536), -- Assuming OpenAI embedding dimension
    primary_results JSONB DEFAULT '[]',
    related_concepts JSONB DEFAULT '[]',
    knowledge_pathways JSONB DEFAULT '[]',
    fact_verification JSONB DEFAULT '[]',
    search_analytics JSONB DEFAULT '{}',
    suggested_refinements JSONB DEFAULT '[]',
    knowledge_gaps JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Multi-modal search support
CREATE TABLE IF NOT EXISTS multimodal_search_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    search_id VARCHAR(100) UNIQUE NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    text_query TEXT,
    image_analysis JSONB,
    audio_transcription TEXT,
    document_content TEXT,
    combined_embedding VECTOR(1536),
    modality_weights JSONB DEFAULT '{}',
    search_results JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. INTELLIGENT KNOWLEDGE SYNTHESIS
-- =====================================================

-- Knowledge synthesis requests and results
CREATE TABLE IF NOT EXISTS knowledge_synthesis_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    synthesis_id VARCHAR(100) UNIQUE NOT NULL,
    requester_id VARCHAR(100) NOT NULL,
    source_node_ids JSONB NOT NULL,
    synthesis_type VARCHAR(50) NOT NULL,
    target_domain VARCHAR(100),
    quality_requirements JSONB NOT NULL,
    synthesis_params JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS knowledge_synthesis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    synthesis_id VARCHAR(100) NOT NULL,
    synthesized_node_id VARCHAR(100) NOT NULL,
    source_analysis JSONB DEFAULT '[]',
    confidence_metrics JSONB NOT NULL,
    validation_requirements JSONB NOT NULL,
    ai_model_used VARCHAR(100),
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign keys
    CONSTRAINT fk_synthesis_request FOREIGN KEY (synthesis_id) REFERENCES knowledge_synthesis_requests(synthesis_id),
    CONSTRAINT fk_synthesized_node FOREIGN KEY (synthesized_node_id) REFERENCES vectorgraph_memory_objects(memory_id)
);

-- Knowledge validation and review processes
CREATE TABLE IF NOT EXISTS knowledge_validation_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    validation_id VARCHAR(100) UNIQUE NOT NULL,
    knowledge_node_id VARCHAR(100) NOT NULL,
    validation_type VARCHAR(50) NOT NULL,
    validator_id VARCHAR(100),
    validation_criteria JSONB NOT NULL,
    validation_result JSONB,
    confidence_score DECIMAL(5,4),
    validation_notes TEXT,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending',
    
    -- Foreign key to memory objects
    CONSTRAINT fk_validation_node FOREIGN KEY (knowledge_node_id) REFERENCES vectorgraph_memory_objects(memory_id)
);

-- =====================================================
-- 5. PERFORMANCE OPTIMIZATION EXTENSIONS
-- =====================================================

-- Enhanced indexes for existing VectorGraph tables
CREATE INDEX IF NOT EXISTS idx_vectorgraph_semantic_tags ON vectorgraph_memory_objects USING GIN((metadata->'semantic_tags'));
CREATE INDEX IF NOT EXISTS idx_vectorgraph_knowledge_domain ON vectorgraph_memory_objects((metadata->>'knowledge_domain'));
CREATE INDEX IF NOT EXISTS idx_vectorgraph_community_namespace ON vectorgraph_memory_objects((metadata->>'community_namespace'));
CREATE INDEX IF NOT EXISTS idx_vectorgraph_quality_trust ON vectorgraph_memory_objects(quality_score DESC, ((trust_score_4d->>'iq')::numeric + (trust_score_4d->>'appeal')::numeric + (trust_score_4d->>'social')::numeric + (trust_score_4d->>'humanity')::numeric) / 4 DESC);

-- Vector similarity search optimization
CREATE INDEX IF NOT EXISTS idx_vector_embeddings_model ON vector_embeddings(model_used);
CREATE INDEX IF NOT EXISTS idx_vector_embeddings_namespace ON vector_embeddings(community_namespace);

-- Search performance indexes
CREATE INDEX IF NOT EXISTS idx_search_intent_expires ON search_intent_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_search_results_user_time ON enhanced_search_results(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_multimodal_search_user ON multimodal_search_queries(user_id, created_at DESC);

-- Sync and conflict indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_sync_source ON knowledge_sync_results(source_community, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_conflicts_status ON knowledge_conflicts(status, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_transformations_type ON knowledge_transformations(transformation_type, applied_at DESC);

-- Synthesis and validation indexes
CREATE INDEX IF NOT EXISTS idx_synthesis_requests_status ON knowledge_synthesis_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_validation_tasks_status ON knowledge_validation_tasks(status, assigned_at DESC);

-- =====================================================
-- 6. ENHANCED TRIGGERS AND FUNCTIONS
-- =====================================================

-- Function to update knowledge graph statistics
CREATE OR REPLACE FUNCTION update_knowledge_graph_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update node count in memory zones
    IF TG_OP = 'INSERT' THEN
        UPDATE vectorgraph_memory_zones 
        SET memory_object_count = memory_object_count + 1,
            updated_at = NOW()
        WHERE zone_id = NEW.memory_zone_id;
        
        -- Update semantic tags index if new tags are added
        IF NEW.metadata->>'semantic_tags' IS NOT NULL THEN
            INSERT INTO knowledge_semantic_tags_index (tag, node_id, created_at)
            SELECT 
                jsonb_array_elements_text(NEW.metadata->'semantic_tags'),
                NEW.memory_id,
                NEW.created_at
            ON CONFLICT (tag, node_id) DO NOTHING;
        END IF;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE vectorgraph_memory_zones 
        SET memory_object_count = memory_object_count - 1,
            updated_at = NOW()
        WHERE zone_id = OLD.memory_zone_id;
        
        -- Remove from semantic tags index
        DELETE FROM knowledge_semantic_tags_index WHERE node_id = OLD.memory_id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for knowledge graph statistics
CREATE TRIGGER trigger_update_knowledge_stats
    AFTER INSERT OR DELETE ON vectorgraph_memory_objects
    FOR EACH ROW EXECUTE FUNCTION update_knowledge_graph_stats();

-- Function to clean expired search cache
CREATE OR REPLACE FUNCTION clean_expired_search_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM search_intent_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Also clean old search results (older than 30 days)
    DELETE FROM enhanced_search_results WHERE created_at < NOW() - INTERVAL '30 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. SEMANTIC TAGS INDEX FOR FAST LOOKUPS
-- =====================================================

-- Dedicated table for semantic tag indexing
CREATE TABLE IF NOT EXISTS knowledge_semantic_tags_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag VARCHAR(200) NOT NULL,
    node_id VARCHAR(100) NOT NULL,
    tag_weight DECIMAL(5,4) DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(tag, node_id),
    CONSTRAINT fk_semantic_tag_node FOREIGN KEY (node_id) REFERENCES vectorgraph_memory_objects(memory_id) ON DELETE CASCADE
);

-- Indexes for semantic tag searches
CREATE INDEX IF NOT EXISTS idx_semantic_tags_tag ON knowledge_semantic_tags_index(tag);
CREATE INDEX IF NOT EXISTS idx_semantic_tags_weight ON knowledge_semantic_tags_index(tag_weight DESC);
CREATE INDEX IF NOT EXISTS idx_semantic_tags_node ON knowledge_semantic_tags_index(node_id);

-- =====================================================
-- 8. MATERIALIZED VIEWS FOR PERFORMANCE
-- =====================================================

-- Materialized view for knowledge domain statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS knowledge_domain_stats AS
SELECT 
    metadata->>'knowledge_domain' as domain,
    metadata->>'community_namespace' as community,
    COUNT(*) as node_count,
    AVG(quality_score) as avg_quality_score,
    AVG(((trust_score_4d->>'iq')::numeric + 
         (trust_score_4d->>'appeal')::numeric + 
         (trust_score_4d->>'social')::numeric + 
         (trust_score_4d->>'humanity')::numeric) / 4) as avg_trust_score,
    COUNT(DISTINCT creator_agent_id) as unique_creators,
    MAX(created_at) as latest_update
FROM vectorgraph_memory_objects 
WHERE memory_status = 'active'
AND metadata->>'knowledge_domain' IS NOT NULL
GROUP BY metadata->>'knowledge_domain', metadata->>'community_namespace';

-- Index on materialized view
CREATE INDEX IF NOT EXISTS idx_knowledge_domain_stats_domain ON knowledge_domain_stats(domain);
CREATE INDEX IF NOT EXISTS idx_knowledge_domain_stats_community ON knowledge_domain_stats(community);

-- Materialized view for cross-community knowledge overlap
CREATE MATERIALIZED VIEW IF NOT EXISTS cross_community_knowledge_overlap AS
WITH community_domains AS (
    SELECT 
        metadata->>'community_namespace' as community,
        metadata->>'knowledge_domain' as domain,
        COUNT(*) as node_count
    FROM vectorgraph_memory_objects 
    WHERE memory_status = 'active'
    AND metadata->>'community_namespace' IS NOT NULL
    AND metadata->>'knowledge_domain' IS NOT NULL
    GROUP BY metadata->>'community_namespace', metadata->>'knowledge_domain'
)
SELECT 
    cd1.community as community1,
    cd2.community as community2,
    cd1.domain as shared_domain,
    cd1.node_count as community1_nodes,
    cd2.node_count as community2_nodes,
    LEAST(cd1.node_count, cd2.node_count) as overlap_potential
FROM community_domains cd1
JOIN community_domains cd2 ON cd1.domain = cd2.domain
WHERE cd1.community < cd2.community; -- Avoid duplicate pairs

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

-- Grant permissions for the new tables
GRANT SELECT, INSERT, UPDATE, DELETE ON knowledge_graph_edges TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON community_knowledge_profiles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON knowledge_sync_results TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON knowledge_conflicts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON knowledge_transformations TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON search_intent_cache TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_search_contexts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON enhanced_search_results TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON multimodal_search_queries TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON knowledge_synthesis_requests TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON knowledge_synthesis_results TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON knowledge_validation_tasks TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON knowledge_semantic_tags_index TO anon, authenticated;

-- Grant permissions for materialized views
GRANT SELECT ON knowledge_domain_stats TO anon, authenticated;
GRANT SELECT ON cross_community_knowledge_overlap TO anon, authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION update_knowledge_graph_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION clean_expired_search_cache() TO anon, authenticated;

-- =====================================================
-- 10. INITIAL DATA SEEDING
-- =====================================================

-- Insert default community knowledge profile for main community
INSERT INTO community_knowledge_profiles (
    community_id,
    knowledge_domains,
    trust_standards,
    governance_policies,
    knowledge_preferences,
    sync_restrictions
) VALUES (
    'default',
    '["general", "technology", "science", "governance"]',
    '{
        "min_iq_score": 0.5,
        "min_appeal_score": 0.5,
        "min_social_score": 0.5,
        "min_humanity_score": 0.5
    }',
    '{
        "auto_accept_threshold": 0.8,
        "require_expert_review": false,
        "community_vote_required": false
    }',
    '{
        "preferred_content_types": ["text", "concept", "document"],
        "language_preferences": ["en"],
        "cultural_sensitivity_level": 0.7
    }',
    '{
        "blacklisted_sources": [],
        "restricted_domains": [],
        "max_sync_frequency": 24
    }'
) ON CONFLICT (community_id) DO NOTHING;

-- Create initial semantic tags from existing memory objects
INSERT INTO knowledge_semantic_tags_index (tag, node_id, created_at)
SELECT 
    DISTINCT jsonb_array_elements_text(metadata->'semantic_tags') as tag,
    memory_id as node_id,
    created_at
FROM vectorgraph_memory_objects 
WHERE metadata->'semantic_tags' IS NOT NULL
AND jsonb_typeof(metadata->'semantic_tags') = 'array'
ON CONFLICT (tag, node_id) DO NOTHING;

-- Refresh materialized views
REFRESH MATERIALIZED VIEW knowledge_domain_stats;
REFRESH MATERIALIZED VIEW cross_community_knowledge_overlap;

-- =====================================================
-- 11. MAINTENANCE PROCEDURES
-- =====================================================

-- Procedure to refresh knowledge statistics
CREATE OR REPLACE FUNCTION refresh_knowledge_statistics()
RETURNS VOID AS $$
BEGIN
    -- Refresh materialized views
    REFRESH MATERIALIZED VIEW knowledge_domain_stats;
    REFRESH MATERIALIZED VIEW cross_community_knowledge_overlap;
    
    -- Clean expired cache entries
    PERFORM clean_expired_search_cache();
    
    -- Update zone statistics
    UPDATE vectorgraph_memory_zones 
    SET 
        memory_object_count = (
            SELECT COUNT(*) 
            FROM vectorgraph_memory_objects 
            WHERE memory_zone_id = vectorgraph_memory_zones.id
            AND memory_status = 'active'
        ),
        updated_at = NOW();
        
    RAISE NOTICE 'Knowledge statistics refreshed successfully';
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION refresh_knowledge_statistics() TO anon, authenticated;

COMMIT;