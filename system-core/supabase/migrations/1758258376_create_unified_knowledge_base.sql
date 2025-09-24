-- Migration: create_unified_knowledge_base
-- Created at: 1758258376

-- Unified Knowledge Base with Intelligent Research Triggering
-- Created for TrustStream v4.0
-- This migration creates the comprehensive knowledge management infrastructure

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Knowledge Entries Table
-- Central repository for all knowledge across four ecosystem layers
CREATE TABLE knowledge_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    ecosystem_layer VARCHAR(20) NOT NULL,
    domain VARCHAR(100) NOT NULL,
    complexity_level VARCHAR(20) NOT NULL DEFAULT 'basic',
    knowledge_type VARCHAR(50) NOT NULL,
    tags TEXT[],
    source_url TEXT,
    source_type VARCHAR(50),
    author_agent_id UUID REFERENCES agent_registry(id),
    embedding vector(1536), -- OpenAI embedding dimension
    quality_score NUMERIC(5,2) DEFAULT 0.00,
    confidence_score NUMERIC(5,2) DEFAULT 0.00,
    freshness_score NUMERIC(5,2) DEFAULT 100.00,
    relevance_weight NUMERIC(5,2) DEFAULT 1.00,
    validation_status VARCHAR(20) DEFAULT 'pending',
    validation_metadata JSONB DEFAULT '{}',
    knowledge_metadata JSONB DEFAULT '{}',
    version_number INTEGER DEFAULT 1,
    parent_knowledge_id UUID REFERENCES knowledge_entries(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    validated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT knowledge_valid_ecosystem_layer CHECK (ecosystem_layer IN ('meta_ai', 'community_ai', 'engagement_ai', 'economic_ai')),
    CONSTRAINT knowledge_valid_complexity CHECK (complexity_level IN ('basic', 'intermediate', 'complex', 'expert')),
    CONSTRAINT knowledge_valid_type CHECK (knowledge_type IN ('fact', 'procedure', 'concept', 'template', 'example', 'reference', 'analysis', 'insight')),
    CONSTRAINT knowledge_valid_quality CHECK (quality_score >= 0 AND quality_score <= 100),
    CONSTRAINT knowledge_valid_confidence CHECK (confidence_score >= 0 AND confidence_score <= 100),
    CONSTRAINT knowledge_valid_freshness CHECK (freshness_score >= 0 AND freshness_score <= 100),
    CONSTRAINT knowledge_valid_validation CHECK (validation_status IN ('pending', 'validated', 'rejected', 'outdated', 'under_review'))
);

-- Knowledge Correlations Table
-- Manages relationships between knowledge entries across layers
CREATE TABLE knowledge_correlations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    primary_knowledge_id UUID NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
    related_knowledge_id UUID NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
    correlation_type VARCHAR(30) NOT NULL,
    correlation_strength NUMERIC(5,2) NOT NULL DEFAULT 0.50,
    correlation_metadata JSONB DEFAULT '{}',
    auto_detected BOOLEAN DEFAULT false,
    validated_by_agent_id UUID REFERENCES agent_registry(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT knowledge_correlation_valid_type CHECK (correlation_type IN ('prerequisite', 'dependent', 'related', 'similar', 'conflicting', 'complementary', 'alternative')),
    CONSTRAINT knowledge_correlation_valid_strength CHECK (correlation_strength >= 0 AND correlation_strength <= 1),
    CONSTRAINT knowledge_correlation_not_self CHECK (primary_knowledge_id != related_knowledge_id),
    CONSTRAINT knowledge_correlation_unique UNIQUE (primary_knowledge_id, related_knowledge_id, correlation_type)
);

-- Research Triggers Table
-- Manages intelligent research automation triggers
CREATE TABLE research_triggers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trigger_name VARCHAR(200) NOT NULL,
    trigger_description TEXT,
    trigger_conditions JSONB NOT NULL,
    target_domains TEXT[],
    complexity_threshold VARCHAR(20) DEFAULT 'intermediate',
    required_ecosystem_layers TEXT[],
    trigger_priority INTEGER DEFAULT 5,
    research_template JSONB DEFAULT '{}',
    trigger_metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_by_agent_id UUID REFERENCES agent_registry(id),
    last_triggered TIMESTAMPTZ,
    trigger_count INTEGER DEFAULT 0,
    success_rate NUMERIC(5,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT research_trigger_valid_complexity CHECK (complexity_threshold IN ('basic', 'intermediate', 'complex', 'expert')),
    CONSTRAINT research_trigger_valid_priority CHECK (trigger_priority >= 1 AND trigger_priority <= 10),
    CONSTRAINT research_trigger_valid_success_rate CHECK (success_rate >= 0 AND success_rate <= 100)
);

-- Research Sessions Table
-- Tracks intelligent research automation sessions
CREATE TABLE research_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_title VARCHAR(300) NOT NULL,
    trigger_id UUID REFERENCES research_triggers(id),
    requested_by_agent_id UUID REFERENCES agent_registry(id),
    assigned_researcher_agent_id UUID REFERENCES agent_registry(id),
    research_scope TEXT NOT NULL,
    target_domains TEXT[],
    complexity_level VARCHAR(20) NOT NULL,
    session_status VARCHAR(20) DEFAULT 'queued',
    priority_score INTEGER DEFAULT 5,
    estimated_cost NUMERIC(10,2),
    actual_cost NUMERIC(10,2),
    research_metadata JSONB DEFAULT '{}',
    findings_summary TEXT,
    knowledge_entries_created INTEGER DEFAULT 0,
    quality_assessment JSONB DEFAULT '{}',
    session_results JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT research_session_valid_complexity CHECK (complexity_level IN ('basic', 'intermediate', 'complex', 'expert')),
    CONSTRAINT research_session_valid_status CHECK (session_status IN ('queued', 'in_progress', 'completed', 'failed', 'cancelled', 'on_hold')),
    CONSTRAINT research_session_valid_priority CHECK (priority_score >= 1 AND priority_score <= 10)
);

-- Knowledge Quality Assessments Table
-- Tracks AI-powered quality scoring and validation
CREATE TABLE knowledge_quality_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    knowledge_id UUID NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
    assessment_type VARCHAR(30) NOT NULL,
    assessor_agent_id UUID REFERENCES agent_registry(id),
    assessment_model VARCHAR(50),
    quality_dimensions JSONB NOT NULL,
    overall_score NUMERIC(5,2) NOT NULL,
    detailed_feedback TEXT,
    improvement_suggestions TEXT[],
    validation_checks JSONB DEFAULT '{}',
    assessment_metadata JSONB DEFAULT '{}',
    assessment_timestamp TIMESTAMPTZ DEFAULT NOW(),
    is_current BOOLEAN DEFAULT true,
    
    -- Constraints
    CONSTRAINT quality_assessment_valid_type CHECK (assessment_type IN ('automated', 'peer_review', 'expert_validation', 'fact_check', 'freshness_check')),
    CONSTRAINT quality_assessment_valid_score CHECK (overall_score >= 0 AND overall_score <= 100)
);

-- Knowledge Access Patterns Table
-- Tracks knowledge usage for intelligent prioritization
CREATE TABLE knowledge_access_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    knowledge_id UUID NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
    accessing_agent_id UUID REFERENCES agent_registry(id),
    access_type VARCHAR(20) NOT NULL,
    access_context VARCHAR(100),
    task_complexity VARCHAR(20),
    ecosystem_layer VARCHAR(20),
    access_metadata JSONB DEFAULT '{}',
    success_rating INTEGER,
    access_duration_ms INTEGER,
    accessed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT access_pattern_valid_type CHECK (access_type IN ('search', 'reference', 'template', 'analysis', 'validation')),
    CONSTRAINT access_pattern_valid_complexity CHECK (task_complexity IN ('basic', 'intermediate', 'complex', 'expert')),
    CONSTRAINT access_pattern_valid_ecosystem CHECK (ecosystem_layer IN ('meta_ai', 'community_ai', 'engagement_ai', 'economic_ai')),
    CONSTRAINT access_pattern_valid_rating CHECK (success_rating IS NULL OR (success_rating >= 1 AND success_rating <= 5))
);

-- Knowledge Conflicts Table
-- Manages knowledge conflicts and resolution
CREATE TABLE knowledge_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    primary_knowledge_id UUID NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
    conflicting_knowledge_id UUID NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
    conflict_type VARCHAR(30) NOT NULL,
    conflict_severity VARCHAR(20) DEFAULT 'medium',
    conflict_description TEXT NOT NULL,
    detected_by VARCHAR(20) DEFAULT 'automated',
    detector_agent_id UUID REFERENCES agent_registry(id),
    resolution_status VARCHAR(20) DEFAULT 'pending',
    resolution_method VARCHAR(30),
    resolver_agent_id UUID REFERENCES agent_registry(id),
    resolution_notes TEXT,
    conflict_metadata JSONB DEFAULT '{}',
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT conflict_valid_type CHECK (conflict_type IN ('factual', 'procedural', 'conceptual', 'temporal', 'source', 'quality')),
    CONSTRAINT conflict_valid_severity CHECK (conflict_severity IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT conflict_valid_detection CHECK (detected_by IN ('automated', 'agent', 'user', 'system')),
    CONSTRAINT conflict_valid_status CHECK (resolution_status IN ('pending', 'in_review', 'resolved', 'escalated', 'archived')),
    CONSTRAINT conflict_valid_method CHECK (resolution_method IS NULL OR resolution_method IN ('merge', 'version', 'deprecate', 'escalate', 'manual_review')),
    CONSTRAINT conflict_not_self CHECK (primary_knowledge_id != conflicting_knowledge_id)
);

-- Knowledge Update Queue Table
-- Manages autonomous knowledge updates across layers
CREATE TABLE knowledge_update_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    knowledge_id UUID REFERENCES knowledge_entries(id) ON DELETE CASCADE,
    update_type VARCHAR(30) NOT NULL,
    update_trigger VARCHAR(30) NOT NULL,
    update_priority INTEGER DEFAULT 5,
    proposed_changes JSONB NOT NULL,
    change_justification TEXT,
    triggering_agent_id UUID REFERENCES agent_registry(id),
    ecosystem_layer VARCHAR(20),
    estimated_impact_score NUMERIC(5,2),
    update_metadata JSONB DEFAULT '{}',
    queue_status VARCHAR(20) DEFAULT 'pending',
    assigned_processor_id UUID REFERENCES agent_registry(id),
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT update_valid_type CHECK (update_type IN ('content', 'metadata', 'quality', 'correlation', 'validation', 'deprecation')),
    CONSTRAINT update_valid_trigger CHECK (update_trigger IN ('scheduled', 'event_driven', 'agent_request', 'quality_check', 'conflict_resolution')),
    CONSTRAINT update_valid_priority CHECK (update_priority >= 1 AND update_priority <= 10),
    CONSTRAINT update_valid_ecosystem CHECK (ecosystem_layer IS NULL OR ecosystem_layer IN ('meta_ai', 'community_ai', 'engagement_ai', 'economic_ai')),
    CONSTRAINT update_valid_status CHECK (queue_status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled'))
);

-- Indexes for performance optimization
CREATE INDEX idx_knowledge_entries_ecosystem_layer ON knowledge_entries(ecosystem_layer);
CREATE INDEX idx_knowledge_entries_complexity ON knowledge_entries(complexity_level);
CREATE INDEX idx_knowledge_entries_domain ON knowledge_entries(domain);
CREATE INDEX idx_knowledge_entries_quality_score ON knowledge_entries(quality_score DESC);
CREATE INDEX idx_knowledge_entries_active ON knowledge_entries(is_active);
CREATE INDEX idx_knowledge_entries_embedding ON knowledge_entries USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_knowledge_entries_tags ON knowledge_entries USING gin(tags);
CREATE INDEX idx_knowledge_entries_created_at ON knowledge_entries(created_at);

CREATE INDEX idx_knowledge_correlations_primary ON knowledge_correlations(primary_knowledge_id);
CREATE INDEX idx_knowledge_correlations_related ON knowledge_correlations(related_knowledge_id);
CREATE INDEX idx_knowledge_correlations_type ON knowledge_correlations(correlation_type);
CREATE INDEX idx_knowledge_correlations_strength ON knowledge_correlations(correlation_strength DESC);

CREATE INDEX idx_research_triggers_active ON research_triggers(is_active);
CREATE INDEX idx_research_triggers_priority ON research_triggers(trigger_priority DESC);
CREATE INDEX idx_research_triggers_complexity ON research_triggers(complexity_threshold);

CREATE INDEX idx_research_sessions_status ON research_sessions(session_status);
CREATE INDEX idx_research_sessions_priority ON research_sessions(priority_score DESC);
CREATE INDEX idx_research_sessions_created_at ON research_sessions(created_at);

CREATE INDEX idx_quality_assessments_knowledge ON knowledge_quality_assessments(knowledge_id);
CREATE INDEX idx_quality_assessments_current ON knowledge_quality_assessments(is_current);
CREATE INDEX idx_quality_assessments_score ON knowledge_quality_assessments(overall_score DESC);

CREATE INDEX idx_access_patterns_knowledge ON knowledge_access_patterns(knowledge_id);
CREATE INDEX idx_access_patterns_agent ON knowledge_access_patterns(accessing_agent_id);
CREATE INDEX idx_access_patterns_accessed_at ON knowledge_access_patterns(accessed_at);

CREATE INDEX idx_conflicts_status ON knowledge_conflicts(resolution_status);
CREATE INDEX idx_conflicts_severity ON knowledge_conflicts(conflict_severity);
CREATE INDEX idx_conflicts_detected_at ON knowledge_conflicts(detected_at);

CREATE INDEX idx_update_queue_status ON knowledge_update_queue(queue_status);
CREATE INDEX idx_update_queue_priority ON knowledge_update_queue(update_priority DESC);
CREATE INDEX idx_update_queue_created_at ON knowledge_update_queue(created_at);

-- Enable Row Level Security
ALTER TABLE knowledge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_correlations ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_quality_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_access_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_update_queue ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for access control
CREATE POLICY "Enable read access for all users" ON knowledge_entries FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON knowledge_correlations FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON research_triggers FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON research_sessions FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON knowledge_quality_assessments FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON knowledge_access_patterns FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON knowledge_conflicts FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON knowledge_update_queue FOR SELECT USING (true);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_knowledge_entries_updated_at BEFORE UPDATE ON knowledge_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_correlations_updated_at BEFORE UPDATE ON knowledge_correlations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_research_triggers_updated_at BEFORE UPDATE ON research_triggers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_research_sessions_updated_at BEFORE UPDATE ON research_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for analytics and monitoring
CREATE VIEW knowledge_base_summary AS
SELECT 
    ecosystem_layer,
    domain,
    complexity_level,
    knowledge_type,
    COUNT(*) as entry_count,
    AVG(quality_score) as avg_quality_score,
    AVG(freshness_score) as avg_freshness_score,
    COUNT(CASE WHEN validation_status = 'validated' THEN 1 END) as validated_count
FROM knowledge_entries 
WHERE is_active = true
GROUP BY ecosystem_layer, domain, complexity_level, knowledge_type;

CREATE VIEW research_automation_metrics AS
SELECT 
    rt.trigger_name,
    rt.complexity_threshold,
    rt.trigger_count,
    rt.success_rate,
    COUNT(rs.id) as total_sessions,
    COUNT(CASE WHEN rs.session_status = 'completed' THEN 1 END) as completed_sessions,
    AVG(rs.actual_cost) as avg_session_cost,
    AVG(rs.knowledge_entries_created) as avg_knowledge_created
FROM research_triggers rt
LEFT JOIN research_sessions rs ON rt.id = rs.trigger_id
WHERE rt.is_active = true
GROUP BY rt.id, rt.trigger_name, rt.complexity_threshold, rt.trigger_count, rt.success_rate;

CREATE VIEW knowledge_quality_dashboard AS
SELECT 
    ke.ecosystem_layer,
    COUNT(*) as total_entries,
    AVG(ke.quality_score) as avg_quality,
    COUNT(CASE WHEN ke.validation_status = 'validated' THEN 1 END) as validated_entries,
    COUNT(CASE WHEN kqa.assessment_type = 'automated' THEN 1 END) as automated_assessments,
    COUNT(CASE WHEN kqa.assessment_type = 'peer_review' THEN 1 END) as peer_reviews,
    COUNT(kc.id) as active_conflicts
FROM knowledge_entries ke
LEFT JOIN knowledge_quality_assessments kqa ON ke.id = kqa.knowledge_id AND kqa.is_current = true
LEFT JOIN knowledge_conflicts kc ON (ke.id = kc.primary_knowledge_id OR ke.id = kc.conflicting_knowledge_id) 
    AND kc.resolution_status = 'pending'
WHERE ke.is_active = true
GROUP BY ke.ecosystem_layer;

CREATE VIEW cross_layer_knowledge_map AS
SELECT 
    kc.correlation_type,
    ke1.ecosystem_layer as primary_layer,
    ke2.ecosystem_layer as related_layer,
    COUNT(*) as correlation_count,
    AVG(kc.correlation_strength) as avg_strength
FROM knowledge_correlations kc
JOIN knowledge_entries ke1 ON kc.primary_knowledge_id = ke1.id
JOIN knowledge_entries ke2 ON kc.related_knowledge_id = ke2.id
WHERE ke1.is_active = true AND ke2.is_active = true
GROUP BY kc.correlation_type, ke1.ecosystem_layer, ke2.ecosystem_layer;

-- Comments for documentation
COMMENT ON TABLE knowledge_entries IS 'Central repository for all knowledge across four ecosystem layers with vector embeddings';
COMMENT ON TABLE knowledge_correlations IS 'Manages relationships between knowledge entries across layers';
COMMENT ON TABLE research_triggers IS 'Intelligent research automation triggers for complex knowledge gaps';
COMMENT ON TABLE research_sessions IS 'Tracks automated research sessions and their outcomes';
COMMENT ON TABLE knowledge_quality_assessments IS 'AI-powered quality scoring and validation tracking';
COMMENT ON TABLE knowledge_access_patterns IS 'Usage tracking for intelligent prioritization';
COMMENT ON TABLE knowledge_conflicts IS 'Knowledge conflicts detection and resolution management';
COMMENT ON TABLE knowledge_update_queue IS 'Autonomous knowledge update queue across layers';

-- Success message
SELECT 'Unified Knowledge Base schema created successfully!' as status;;