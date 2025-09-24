-- Enhanced Database Schema for RAG-based Agent Ecosystem
-- Extends existing TrustStream infrastructure for dynamic agent learning
-- Author: MiniMax Agent
-- Created: 2025-09-20 08:45:18

-- RAG Agent Knowledge Bases (Enhanced)
CREATE TABLE IF NOT EXISTS rag_agent_knowledge_bases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_type VARCHAR(100) NOT NULL,
    agent_instance_id UUID,
    knowledge_domain VARCHAR(100) NOT NULL,
    knowledge_version INTEGER DEFAULT 1,
    embedding_model VARCHAR(100) DEFAULT 'text-embedding-ada-002',
    vector_dimensions INTEGER DEFAULT 1536,
    total_documents INTEGER DEFAULT 0,
    total_chunks INTEGER DEFAULT 0,
    avg_chunk_size INTEGER DEFAULT 512,
    knowledge_quality_score DECIMAL(3,2) DEFAULT 0.5,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    update_frequency VARCHAR(50) DEFAULT 'adaptive',
    retention_policy JSONB DEFAULT '{"max_age_days": 90, "min_relevance_score": 0.3}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RAG Knowledge Chunks with Embeddings
CREATE TABLE IF NOT EXISTS rag_knowledge_chunks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    knowledge_base_id UUID REFERENCES rag_agent_knowledge_bases(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    chunk_metadata JSONB DEFAULT '{}',
    source_document_id VARCHAR(255),
    source_type VARCHAR(50) DEFAULT 'learned_experience',
    chunk_index INTEGER,
    embedding VECTOR(1536), -- Assuming pgvector extension
    relevance_score DECIMAL(3,2) DEFAULT 0.5,
    usage_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    quality_rating DECIMAL(3,2) DEFAULT 0.5,
    learning_context JSONB DEFAULT '{}',
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Learning Sessions
CREATE TABLE IF NOT EXISTS agent_learning_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_type VARCHAR(100) NOT NULL,
    agent_instance_id UUID,
    session_type VARCHAR(50) DEFAULT 'experience_learning',
    learning_trigger VARCHAR(100) NOT NULL,
    input_data JSONB NOT NULL,
    processing_result JSONB NOT NULL,
    feedback_received JSONB DEFAULT '{}',
    performance_metrics JSONB DEFAULT '{}',
    knowledge_extracted JSONB DEFAULT '{}',
    improvements_identified JSONB DEFAULT '[]',
    confidence_before DECIMAL(3,2) DEFAULT 0.5,
    confidence_after DECIMAL(3,2) DEFAULT 0.5,
    learning_success BOOLEAN DEFAULT false,
    processing_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Capability Registry
CREATE TABLE IF NOT EXISTS agent_capability_registry (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_type VARCHAR(100) NOT NULL,
    capability_name VARCHAR(100) NOT NULL,
    capability_description TEXT,
    input_schema JSONB NOT NULL,
    output_schema JSONB NOT NULL,
    performance_metrics JSONB DEFAULT '{}',
    usage_examples JSONB DEFAULT '[]',
    confidence_threshold DECIMAL(3,2) DEFAULT 0.7,
    average_response_time_ms INTEGER,
    success_rate DECIMAL(3,2) DEFAULT 0.0,
    last_improvement TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_type, capability_name)
);

-- Inter-Agent Communication Log
CREATE TABLE IF NOT EXISTS inter_agent_communications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_agent_type VARCHAR(100) NOT NULL,
    sender_instance_id UUID,
    receiver_agent_type VARCHAR(100) NOT NULL,
    receiver_instance_id UUID,
    communication_type VARCHAR(50) NOT NULL,
    request_data JSONB NOT NULL,
    response_data JSONB DEFAULT '{}',
    communication_success BOOLEAN DEFAULT false,
    response_time_ms INTEGER,
    quality_rating DECIMAL(3,2),
    follow_up_required BOOLEAN DEFAULT false,
    context_shared JSONB DEFAULT '{}',
    learning_value DECIMAL(3,2) DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ
);

-- Agent Performance Evolution
CREATE TABLE IF NOT EXISTS agent_performance_evolution (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_type VARCHAR(100) NOT NULL,
    agent_instance_id UUID,
    performance_metric VARCHAR(100) NOT NULL,
    measurement_value DECIMAL(10,4) NOT NULL,
    baseline_value DECIMAL(10,4),
    improvement_percentage DECIMAL(5,2),
    measurement_context JSONB DEFAULT '{}',
    contributing_factors JSONB DEFAULT '[]',
    measurement_period VARCHAR(20) DEFAULT 'point_in_time',
    measured_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Request Analysis Patterns (Learning from user requests)
CREATE TABLE IF NOT EXISTS request_analysis_patterns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pattern_name VARCHAR(200) NOT NULL,
    pattern_description TEXT,
    request_characteristics JSONB NOT NULL,
    optimal_community_structure JSONB NOT NULL,
    success_indicators JSONB DEFAULT '{}',
    failure_indicators JSONB DEFAULT '{}',
    pattern_confidence DECIMAL(3,2) DEFAULT 0.5,
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(3,2) DEFAULT 0.0,
    last_successful_use TIMESTAMPTZ,
    learning_source VARCHAR(100) DEFAULT 'agent_experience',
    validation_status VARCHAR(20) DEFAULT 'unvalidated',
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community Structure Templates (Learned from successful implementations)
CREATE TABLE IF NOT EXISTS learned_community_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_name VARCHAR(200) NOT NULL,
    template_description TEXT,
    use_case_category VARCHAR(100) NOT NULL,
    community_structure JSONB NOT NULL,
    agent_configuration JSONB NOT NULL,
    okr_framework_template JSONB DEFAULT '{}',
    success_metrics JSONB DEFAULT '{}',
    implementation_complexity DECIMAL(3,2) DEFAULT 0.5,
    average_setup_time_hours INTEGER,
    success_rate DECIMAL(3,2) DEFAULT 0.0,
    usage_count INTEGER DEFAULT 0,
    learning_confidence DECIMAL(3,2) DEFAULT 0.5,
    validation_data JSONB DEFAULT '{}',
    last_successful_implementation TIMESTAMPTZ,
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rag_knowledge_bases_agent_type ON rag_agent_knowledge_bases(agent_type, knowledge_domain);
CREATE INDEX IF NOT EXISTS idx_rag_knowledge_chunks_knowledge_base ON rag_knowledge_chunks(knowledge_base_id);
CREATE INDEX IF NOT EXISTS idx_rag_knowledge_chunks_embedding ON rag_knowledge_chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_agent_learning_sessions_type ON agent_learning_sessions(agent_type, session_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_capability_registry_type ON agent_capability_registry(agent_type, is_active);
CREATE INDEX IF NOT EXISTS idx_inter_agent_communications_sender ON inter_agent_communications(sender_agent_type, sender_instance_id);
CREATE INDEX IF NOT EXISTS idx_inter_agent_communications_receiver ON inter_agent_communications(receiver_agent_type, receiver_instance_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_evolution_type ON agent_performance_evolution(agent_type, performance_metric, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_analysis_patterns_confidence ON request_analysis_patterns(pattern_confidence DESC, usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_learned_community_templates_category ON learned_community_templates(use_case_category, success_rate DESC);

-- Create triggers for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rag_agent_knowledge_bases_updated_at BEFORE UPDATE ON rag_agent_knowledge_bases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rag_knowledge_chunks_updated_at BEFORE UPDATE ON rag_knowledge_chunks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_capability_registry_updated_at BEFORE UPDATE ON agent_capability_registry FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_request_analysis_patterns_updated_at BEFORE UPDATE ON request_analysis_patterns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_learned_community_templates_updated_at BEFORE UPDATE ON learned_community_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial capability registry for Primary Request Analysis Agent
INSERT INTO agent_capability_registry (
    agent_type,
    capability_name,
    capability_description,
    input_schema,
    output_schema,
    performance_metrics,
    usage_examples,
    confidence_threshold
) VALUES (
    'primary_request_analysis_agent',
    'analyze_user_request',
    'Analyzes user requests to determine optimal community structure and agent deployment strategy',
    '{
        "type": "object",
        "required": ["user_request", "user_id"],
        "properties": {
            "user_request": {"type": "string", "minLength": 10},
            "user_id": {"type": "string"},
            "context": {"type": "object"},
            "auto_approve": {"type": "boolean", "default": false}
        }
    }',
    '{
        "type": "object",
        "properties": {
            "analysis_result": {"type": "object"},
            "complexity_assessment": {"type": "object"},
            "recommended_structure": {"type": "object"},
            "confidence_score": {"type": "number", "minimum": 0, "maximum": 1},
            "processing_time_ms": {"type": "integer"},
            "learning_applied": {"type": "boolean"}
        }
    }',
    '{
        "accuracy_rate": {"target": 0.85, "current": 0.0},
        "response_time_ms": {"target": 2000, "current": 0},
        "user_satisfaction": {"target": 0.8, "current": 0.0},
        "learning_improvement_rate": {"target": 0.1, "current": 0.0}
    }',
    '[
        {
            "scenario": "Marketing Campaign Request",
            "input": {"user_request": "Help me create a comprehensive marketing campaign for a new SaaS product"},
            "expected_output": {"recommended_structure": {"community_type": "marketing_specialized", "agent_count": 5}}
        }
    ]',
    0.75
) ON CONFLICT (agent_type, capability_name) DO UPDATE SET
    updated_at = NOW(),
    capability_description = EXCLUDED.capability_description;

-- Insert initial request analysis patterns
INSERT INTO request_analysis_patterns (
    pattern_name,
    pattern_description,
    request_characteristics,
    optimal_community_structure,
    pattern_confidence,
    tags
) VALUES 
(
    'Marketing Campaign Pattern',
    'User requests related to marketing campaigns, promotion, and brand awareness',
    '{
        "keywords": ["marketing", "campaign", "promotion", "brand", "social media", "advertising"],
        "complexity_indicators": ["multi-channel", "comprehensive", "strategic"],
        "typical_length": {"min": 50, "max": 300}
    }',
    '{
        "community_type": "specialized",
        "hierarchy_needed": true,
        "recommended_agents": [
            {"type": "ai_leader", "capabilities": ["strategy", "coordination"]},
            {"type": "content_specialist", "capabilities": ["content_creation", "copywriting"]},
            {"type": "social_media_agent", "capabilities": ["social_platforms", "engagement"]},
            {"type": "analytics_agent", "capabilities": ["data_analysis", "reporting"]},
            {"type": "compliance_agent", "capabilities": ["brand_guidelines", "quality_control"]}
        ],
        "estimated_timeline": "2-4 weeks",
        "success_criteria": ["engagement_metrics", "conversion_rates", "brand_awareness"]
    }',
    0.8,
    '["marketing", "content", "social_media", "analytics"]'
),
(
    'Data Analysis Pattern',
    'User requests involving data analysis, reporting, and insights generation',
    '{
        "keywords": ["data", "analysis", "analytics", "insights", "reporting", "dashboard", "metrics"],
        "complexity_indicators": ["big data", "machine learning", "predictive", "real-time"],
        "typical_length": {"min": 40, "max": 250}
    }',
    '{
        "community_type": "technical_specialized",
        "hierarchy_needed": true,
        "recommended_agents": [
            {"type": "ai_leader", "capabilities": ["project_management", "technical_coordination"]},
            {"type": "data_scientist_agent", "capabilities": ["statistical_analysis", "modeling"]},
            {"type": "data_engineer_agent", "capabilities": ["data_pipeline", "etl"]},
            {"type": "visualization_agent", "capabilities": ["dashboard_creation", "chart_design"]},
            {"type": "compliance_agent", "capabilities": ["data_privacy", "accuracy_validation"]}
        ],
        "estimated_timeline": "1-3 weeks",
        "success_criteria": ["data_accuracy", "insight_quality", "stakeholder_satisfaction"]
    }',
    0.85,
    '["data", "analytics", "technical", "insights"]'
) ON CONFLICT DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE rag_agent_knowledge_bases IS 'RAG-based knowledge storage for intelligent agents with vector embeddings';
COMMENT ON TABLE rag_knowledge_chunks IS 'Individual knowledge chunks with embeddings for semantic search and retrieval';
COMMENT ON TABLE agent_learning_sessions IS 'Tracking agent learning from experiences and feedback';
COMMENT ON TABLE agent_capability_registry IS 'Registry of agent capabilities with performance metrics and schemas';
COMMENT ON TABLE inter_agent_communications IS 'Log of communication between agents for collaboration tracking';
COMMENT ON TABLE agent_performance_evolution IS 'Historical tracking of agent performance improvements over time';
COMMENT ON TABLE request_analysis_patterns IS 'Learned patterns for analyzing user requests and determining optimal responses';
COMMENT ON TABLE learned_community_templates IS 'Successful community structure templates learned from implementations';