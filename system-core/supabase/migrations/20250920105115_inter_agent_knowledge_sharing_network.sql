-- Inter-Agent Knowledge Sharing Network Schema
-- Revolutionary collective intelligence backbone for TrustStream RAG agents
-- Enables seamless knowledge sharing, consultation networks, and collaborative intelligence
-- Author: MiniMax Agent
-- Created: 2025-09-20 10:51:15

-- Enhanced Agent Knowledge Registry
CREATE TABLE IF NOT EXISTS agent_knowledge_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_type VARCHAR(255) NOT NULL,
    agent_instance_id UUID,
    specialization_domains JSONB DEFAULT '[]', -- Areas of expertise
    knowledge_capabilities JSONB DEFAULT '{}', -- What this agent can teach
    learning_preferences JSONB DEFAULT '{}', -- What this agent wants to learn
    expertise_level DECIMAL(3,2) CHECK (expertise_level >= 0.0 AND expertise_level <= 1.0) DEFAULT 0.5,
    consultation_availability BOOLEAN DEFAULT TRUE,
    sharing_reputation DECIMAL(4,2) DEFAULT 0.0,
    total_knowledge_shared INTEGER DEFAULT 0,
    total_knowledge_received INTEGER DEFAULT 0,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Collective Intelligence Knowledge Vault
CREATE TABLE IF NOT EXISTS collective_intelligence_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_pattern_id VARCHAR(255) UNIQUE NOT NULL, -- Unique identifier for pattern
    pattern_type VARCHAR(100) NOT NULL, -- classification, optimization, problem_solving, etc.
    domain_area VARCHAR(100) NOT NULL, -- marketing, technical, community, management, etc.
    knowledge_title TEXT NOT NULL,
    knowledge_content JSONB NOT NULL, -- The actual knowledge/pattern
    success_metrics JSONB DEFAULT '{}', -- Metrics showing effectiveness
    applicability_contexts JSONB DEFAULT '[]', -- Where this knowledge applies
    quality_score DECIMAL(3,2) CHECK (quality_score >= 0.0 AND quality_score <= 1.0) DEFAULT 0.5,
    confidence_level DECIMAL(3,2) CHECK (confidence_level >= 0.0 AND confidence_level <= 1.0) DEFAULT 0.5,
    usage_frequency INTEGER DEFAULT 0,
    success_rate DECIMAL(3,2) DEFAULT 0.0,
    contributed_by_agent_type VARCHAR(255),
    contributed_by_instance_id UUID,
    validation_count INTEGER DEFAULT 0,
    last_validated_at TIMESTAMP WITH TIME ZONE,
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Consultation Network
CREATE TABLE IF NOT EXISTS agent_consultation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requesting_agent_type VARCHAR(255) NOT NULL,
    requesting_instance_id UUID,
    target_agent_type VARCHAR(255), -- Specific agent type or null for broadcast
    target_instance_id UUID, -- Specific instance or null for any
    consultation_type VARCHAR(100) NOT NULL, -- expertise_request, problem_solving, pattern_validation, etc.
    domain_area VARCHAR(100) NOT NULL,
    request_title TEXT NOT NULL,
    request_details JSONB NOT NULL,
    context_data JSONB DEFAULT '{}',
    urgency_level VARCHAR(50) CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    max_response_time_hours INTEGER DEFAULT 24,
    status VARCHAR(50) CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'expired', 'cancelled')) DEFAULT 'pending',
    assigned_to_agent_type VARCHAR(255),
    assigned_to_instance_id UUID,
    response_data JSONB,
    consultation_outcome JSONB DEFAULT '{}',
    satisfaction_rating DECIMAL(3,2) CHECK (satisfaction_rating >= 0.0 AND satisfaction_rating <= 5.0),
    knowledge_gained JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Cross-Domain Knowledge Transfer Sessions
CREATE TABLE IF NOT EXISTS cross_domain_knowledge_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL, -- Links related transfers
    source_domain VARCHAR(100) NOT NULL,
    target_domain VARCHAR(100) NOT NULL,
    source_agent_type VARCHAR(255) NOT NULL,
    target_agent_type VARCHAR(255) NOT NULL,
    knowledge_pattern_id VARCHAR(255) REFERENCES collective_intelligence_vault(knowledge_pattern_id),
    transfer_type VARCHAR(100) NOT NULL, -- adaptation, inspiration, direct_application, hybrid
    original_knowledge JSONB NOT NULL,
    adapted_knowledge JSONB NOT NULL,
    adaptation_rationale TEXT,
    transfer_success_probability DECIMAL(3,2) DEFAULT 0.0,
    actual_success_rate DECIMAL(3,2),
    implementation_notes TEXT,
    validation_results JSONB DEFAULT '{}',
    lessons_learned JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    validated_at TIMESTAMP WITH TIME ZONE
);

-- Collaborative Problem Solving Sessions
CREATE TABLE IF NOT EXISTS collaborative_problem_solving (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    problem_title TEXT NOT NULL,
    problem_description JSONB NOT NULL,
    problem_domain VARCHAR(100) NOT NULL,
    complexity_level VARCHAR(50) CHECK (complexity_level IN ('simple', 'moderate', 'complex', 'expert')) DEFAULT 'moderate',
    initiating_agent_type VARCHAR(255) NOT NULL,
    initiating_instance_id UUID,
    participating_agents JSONB DEFAULT '[]', -- Array of agent info
    solution_approaches JSONB DEFAULT '[]', -- Different approaches suggested
    consensus_solution JSONB,
    implementation_plan JSONB DEFAULT '{}',
    session_status VARCHAR(50) CHECK (session_status IN ('active', 'solution_found', 'consensus_reached', 'escalated', 'archived')) DEFAULT 'active',
    quality_metrics JSONB DEFAULT '{}',
    outcome_assessment JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Intelligence Pattern Recognition Engine
CREATE TABLE IF NOT EXISTS ecosystem_intelligence_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_name VARCHAR(255) NOT NULL,
    pattern_category VARCHAR(100) NOT NULL, -- emergence, optimization, coordination, learning, etc.
    pattern_scope VARCHAR(100) NOT NULL, -- single_agent, multi_agent, community, ecosystem
    pattern_data JSONB NOT NULL,
    detection_algorithm VARCHAR(255),
    statistical_significance DECIMAL(4,3),
    sample_size INTEGER,
    confidence_interval JSONB DEFAULT '{}',
    impact_assessment JSONB DEFAULT '{}',
    actionable_insights JSONB DEFAULT '[]',
    related_patterns JSONB DEFAULT '[]',
    validation_status VARCHAR(50) CHECK (validation_status IN ('detected', 'validated', 'active', 'deprecated')) DEFAULT 'detected',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    validated_at TIMESTAMP WITH TIME ZONE,
    last_observed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge Quality Assessment Framework
CREATE TABLE IF NOT EXISTS knowledge_quality_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_pattern_id VARCHAR(255) REFERENCES collective_intelligence_vault(knowledge_pattern_id),
    assessment_type VARCHAR(100) NOT NULL, -- accuracy, applicability, novelty, impact, etc.
    assessor_agent_type VARCHAR(255),
    assessor_instance_id UUID,
    quality_dimensions JSONB NOT NULL, -- accuracy, relevance, completeness, clarity, etc.
    overall_score DECIMAL(3,2) CHECK (overall_score >= 0.0 AND overall_score <= 1.0),
    detailed_feedback JSONB DEFAULT '{}',
    usage_context VARCHAR(255),
    success_indicators JSONB DEFAULT '{}',
    improvement_suggestions JSONB DEFAULT '[]',
    assessment_confidence DECIMAL(3,2) DEFAULT 0.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Real-Time Knowledge Network Status
CREATE TABLE IF NOT EXISTS knowledge_network_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_type VARCHAR(255) NOT NULL,
    agent_instance_id UUID,
    network_role VARCHAR(100) NOT NULL, -- provider, consumer, facilitator, specialist, generalist
    current_load DECIMAL(3,2) DEFAULT 0.0, -- 0.0 = idle, 1.0 = fully utilized
    expertise_availability JSONB DEFAULT '{}', -- domains and availability
    active_consultations INTEGER DEFAULT 0,
    pending_requests INTEGER DEFAULT 0,
    response_time_avg_minutes INTEGER DEFAULT 0,
    quality_rating DECIMAL(3,2) DEFAULT 0.0,
    last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) CHECK (status IN ('online', 'busy', 'offline', 'maintenance')) DEFAULT 'online',
    capabilities_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Learning Effectiveness Tracking
CREATE TABLE IF NOT EXISTS agent_learning_effectiveness (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_type VARCHAR(255) NOT NULL,
    agent_instance_id UUID,
    learning_session_id UUID,
    knowledge_source VARCHAR(255), -- direct_transfer, consultation, observation, experimentation
    knowledge_pattern_id VARCHAR(255),
    pre_learning_metrics JSONB DEFAULT '{}',
    post_learning_metrics JSONB DEFAULT '{}',
    performance_improvement DECIMAL(4,2),
    learning_efficiency DECIMAL(3,2), -- how quickly agent learned
    knowledge_retention DECIMAL(3,2), -- how well agent retained learning
    application_success DECIMAL(3,2), -- how successfully agent applied learning
    adaptation_quality DECIMAL(3,2), -- how well agent adapted learning to context
    time_to_competency_hours INTEGER,
    follow_up_needed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    validated_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_profiles_type ON agent_knowledge_profiles(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_profiles_domains ON agent_knowledge_profiles USING GIN(specialization_domains);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_profiles_availability ON agent_knowledge_profiles(consultation_availability);

CREATE INDEX IF NOT EXISTS idx_collective_vault_pattern_type ON collective_intelligence_vault(pattern_type);
CREATE INDEX IF NOT EXISTS idx_collective_vault_domain ON collective_intelligence_vault(domain_area);
CREATE INDEX IF NOT EXISTS idx_collective_vault_quality ON collective_intelligence_vault(quality_score);
CREATE INDEX IF NOT EXISTS idx_collective_vault_usage ON collective_intelligence_vault(usage_frequency);
CREATE INDEX IF NOT EXISTS idx_collective_vault_tags ON collective_intelligence_vault USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_consultation_requests_status ON agent_consultation_requests(status);
CREATE INDEX IF NOT EXISTS idx_consultation_requests_domain ON agent_consultation_requests(domain_area);
CREATE INDEX IF NOT EXISTS idx_consultation_requests_urgency ON agent_consultation_requests(urgency_level);
CREATE INDEX IF NOT EXISTS idx_consultation_requests_expires ON agent_consultation_requests(expires_at);

CREATE INDEX IF NOT EXISTS idx_cross_domain_transfers_session ON cross_domain_knowledge_transfers(session_id);
CREATE INDEX IF NOT EXISTS idx_cross_domain_transfers_domains ON cross_domain_knowledge_transfers(source_domain, target_domain);

CREATE INDEX IF NOT EXISTS idx_collaborative_sessions_status ON collaborative_problem_solving(session_status);
CREATE INDEX IF NOT EXISTS idx_collaborative_sessions_domain ON collaborative_problem_solving(problem_domain);

CREATE INDEX IF NOT EXISTS idx_intelligence_patterns_category ON ecosystem_intelligence_patterns(pattern_category);
CREATE INDEX IF NOT EXISTS idx_intelligence_patterns_scope ON ecosystem_intelligence_patterns(pattern_scope);
CREATE INDEX IF NOT EXISTS idx_intelligence_patterns_status ON ecosystem_intelligence_patterns(validation_status);

CREATE INDEX IF NOT EXISTS idx_knowledge_quality_pattern ON knowledge_quality_metrics(knowledge_pattern_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_quality_score ON knowledge_quality_metrics(overall_score);

CREATE INDEX IF NOT EXISTS idx_network_status_type ON knowledge_network_status(agent_type);
CREATE INDEX IF NOT EXISTS idx_network_status_role ON knowledge_network_status(network_role);
CREATE INDEX IF NOT EXISTS idx_network_status_status ON knowledge_network_status(status);
CREATE INDEX IF NOT EXISTS idx_network_status_heartbeat ON knowledge_network_status(last_heartbeat);

CREATE INDEX IF NOT EXISTS idx_learning_effectiveness_agent ON agent_learning_effectiveness(agent_type, agent_instance_id);
CREATE INDEX IF NOT EXISTS idx_learning_effectiveness_pattern ON agent_learning_effectiveness(knowledge_pattern_id);
CREATE INDEX IF NOT EXISTS idx_learning_effectiveness_session ON agent_learning_effectiveness(learning_session_id);

-- Create views for common queries
CREATE OR REPLACE VIEW agent_expertise_directory AS
SELECT 
    akp.agent_type,
    akp.agent_instance_id,
    akp.specialization_domains,
    akp.expertise_level,
    akp.sharing_reputation,
    akp.consultation_availability,
    kns.current_load,
    kns.response_time_avg_minutes,
    kns.quality_rating,
    kns.status as network_status
FROM agent_knowledge_profiles akp
LEFT JOIN knowledge_network_status kns ON akp.agent_type = kns.agent_type 
    AND akp.agent_instance_id = kns.agent_instance_id
WHERE akp.consultation_availability = TRUE AND kns.status IN ('online', 'busy');

CREATE OR REPLACE VIEW knowledge_pattern_rankings AS
SELECT 
    civ.knowledge_pattern_id,
    civ.pattern_type,
    civ.domain_area,
    civ.knowledge_title,
    civ.quality_score,
    civ.usage_frequency,
    civ.success_rate,
    civ.validation_count,
    AVG(kqm.overall_score) as avg_quality_assessment,
    COUNT(kqm.id) as total_assessments
FROM collective_intelligence_vault civ
LEFT JOIN knowledge_quality_metrics kqm ON civ.knowledge_pattern_id = kqm.knowledge_pattern_id
GROUP BY civ.id, civ.knowledge_pattern_id, civ.pattern_type, civ.domain_area, 
         civ.knowledge_title, civ.quality_score, civ.usage_frequency, 
         civ.success_rate, civ.validation_count
ORDER BY civ.quality_score DESC, civ.usage_frequency DESC;

CREATE OR REPLACE VIEW cross_domain_innovation_opportunities AS
SELECT 
    source_domain,
    target_domain,
    COUNT(*) as transfer_count,
    AVG(actual_success_rate) as avg_success_rate,
    array_agg(DISTINCT knowledge_pattern_id) as successful_patterns
FROM cross_domain_knowledge_transfers
WHERE actual_success_rate > 0.7
GROUP BY source_domain, target_domain
HAVING COUNT(*) >= 3
ORDER BY avg_success_rate DESC, transfer_count DESC;

CREATE OR REPLACE VIEW ecosystem_intelligence_dashboard AS
SELECT 
    (SELECT COUNT(*) FROM agent_knowledge_profiles WHERE consultation_availability = TRUE) as available_experts,
    (SELECT COUNT(*) FROM collective_intelligence_vault WHERE quality_score > 0.8) as high_quality_patterns,
    (SELECT COUNT(*) FROM agent_consultation_requests WHERE status = 'pending') as pending_consultations,
    (SELECT COUNT(*) FROM collaborative_problem_solving WHERE session_status = 'active') as active_collaborations,
    (SELECT AVG(satisfaction_rating) FROM agent_consultation_requests WHERE satisfaction_rating IS NOT NULL) as avg_satisfaction,
    (SELECT COUNT(DISTINCT domain_area) FROM collective_intelligence_vault) as knowledge_domains,
    (SELECT COUNT(*) FROM cross_domain_knowledge_transfers WHERE actual_success_rate > 0.7) as successful_transfers,
    (SELECT COUNT(*) FROM ecosystem_intelligence_patterns WHERE validation_status = 'active') as active_patterns;

-- Row Level Security (RLS) policies
ALTER TABLE agent_knowledge_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE collective_intelligence_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_consultation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_domain_knowledge_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborative_problem_solving ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecosystem_intelligence_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_network_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_learning_effectiveness ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access (for agents)
CREATE POLICY "Service role can manage knowledge profiles" ON agent_knowledge_profiles
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage intelligence vault" ON collective_intelligence_vault
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage consultation requests" ON agent_consultation_requests
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage knowledge transfers" ON cross_domain_knowledge_transfers
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage collaborative solving" ON collaborative_problem_solving
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage intelligence patterns" ON ecosystem_intelligence_patterns
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage quality metrics" ON knowledge_quality_metrics
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage network status" ON knowledge_network_status
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage learning effectiveness" ON agent_learning_effectiveness
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Functions for advanced intelligence operations
CREATE OR REPLACE FUNCTION find_expert_agents(domain_filter TEXT, min_expertise DECIMAL DEFAULT 0.7)
RETURNS TABLE (
    agent_type VARCHAR(255),
    agent_instance_id UUID,
    expertise_level DECIMAL,
    specialization_domains JSONB,
    current_load DECIMAL,
    response_time_avg_minutes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        aed.agent_type,
        aed.agent_instance_id,
        aed.expertise_level,
        aed.specialization_domains,
        aed.current_load,
        aed.response_time_avg_minutes
    FROM agent_expertise_directory aed
    WHERE aed.expertise_level >= min_expertise
      AND (domain_filter IS NULL OR aed.specialization_domains ? domain_filter)
      AND aed.network_status = 'online'
    ORDER BY aed.expertise_level DESC, aed.current_load ASC, aed.response_time_avg_minutes ASC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_knowledge_network_health()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    total_agents INTEGER;
    active_agents INTEGER;
    avg_response_time DECIMAL;
    knowledge_diversity INTEGER;
    collaboration_rate DECIMAL;
BEGIN
    SELECT COUNT(*) INTO total_agents FROM agent_knowledge_profiles;
    SELECT COUNT(*) INTO active_agents FROM knowledge_network_status WHERE status = 'online';
    SELECT AVG(response_time_avg_minutes) INTO avg_response_time FROM knowledge_network_status WHERE status = 'online';
    SELECT COUNT(DISTINCT domain_area) INTO knowledge_diversity FROM collective_intelligence_vault;
    
    SELECT 
        CASE 
            WHEN total_agents > 0 THEN 
                (SELECT COUNT(*) FROM collaborative_problem_solving WHERE created_at > NOW() - INTERVAL '24 hours')::DECIMAL / total_agents
            ELSE 0
        END INTO collaboration_rate;
    
    result := jsonb_build_object(
        'total_agents', total_agents,
        'active_agents', active_agents,
        'availability_rate', CASE WHEN total_agents > 0 THEN active_agents::DECIMAL / total_agents ELSE 0 END,
        'avg_response_time_minutes', COALESCE(avg_response_time, 0),
        'knowledge_domains', knowledge_diversity,
        'collaboration_rate_24h', collaboration_rate,
        'network_health_score', LEAST(1.0, (
            CASE WHEN total_agents > 0 THEN active_agents::DECIMAL / total_agents ELSE 0 END * 0.3 +
            CASE WHEN avg_response_time <= 30 THEN 1.0 WHEN avg_response_time <= 60 THEN 0.8 ELSE 0.5 END * 0.3 +
            LEAST(1.0, knowledge_diversity::DECIMAL / 10) * 0.2 +
            LEAST(1.0, collaboration_rate * 10) * 0.2
        )),
        'calculated_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update knowledge vault usage stats
CREATE OR REPLACE FUNCTION update_knowledge_usage_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.knowledge_pattern_id IS NOT NULL THEN
        UPDATE collective_intelligence_vault 
        SET usage_frequency = usage_frequency + 1,
            updated_at = NOW()
        WHERE knowledge_pattern_id = NEW.knowledge_pattern_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_knowledge_usage
    AFTER INSERT ON cross_domain_knowledge_transfers
    FOR EACH ROW
    EXECUTE FUNCTION update_knowledge_usage_stats();

CREATE TRIGGER trigger_update_consultation_knowledge_usage
    AFTER INSERT ON agent_consultation_requests
    FOR EACH ROW
    WHEN (NEW.response_data IS NOT NULL AND NEW.response_data ? 'knowledge_pattern_id')
    EXECUTE FUNCTION update_knowledge_usage_stats();

-- Insert initial knowledge patterns for the network
INSERT INTO collective_intelligence_vault (knowledge_pattern_id, pattern_type, domain_area, knowledge_title, knowledge_content, success_metrics, applicability_contexts, quality_score, confidence_level) VALUES
('network_initialization_pattern', 'initialization', 'system', 'Agent Network Initialization Best Practices', 
 '{"practices": ["register_expertise_profile", "establish_heartbeat", "declare_learning_preferences", "set_consultation_availability"], "success_factors": ["clear_specialization_declaration", "responsive_communication", "quality_knowledge_sharing"], "common_pitfalls": ["overstating_expertise", "poor_response_times", "low_quality_contributions"]}',
 '{"network_adoption_rate": 0.95, "agent_satisfaction": 0.88, "knowledge_flow_efficiency": 0.82}',
 '["new_agent_onboarding", "network_expansion", "quality_assurance"]',
 0.9, 0.95),

('cross_domain_adaptation_pattern', 'adaptation', 'general', 'Cross-Domain Knowledge Adaptation Framework',
 '{"framework": {"identify_core_principles": "extract universal concepts", "assess_domain_constraints": "understand target limitations", "adapt_methodology": "modify approach for context", "validate_effectiveness": "test in target domain"}, "success_indicators": ["concept_transferability", "implementation_feasibility", "performance_improvement"], "adaptation_strategies": ["direct_transfer", "analogical_reasoning", "hybrid_approach", "incremental_adaptation"]}',
 '{"adaptation_success_rate": 0.73, "knowledge_retention": 0.86, "performance_improvement": 0.65}',
 '["marketing_to_technical", "technical_to_marketing", "community_to_business", "research_to_application"]',
 0.85, 0.8),

('collective_problem_solving_pattern', 'collaboration', 'general', 'Multi-Agent Collaborative Problem Solving Protocol',
 '{"protocol": {"problem_decomposition": "break complex problems into manageable components", "expertise_matching": "assign components to best-suited agents", "solution_synthesis": "combine individual solutions into coherent whole", "consensus_building": "achieve agreement on final approach"}, "roles": ["problem_owner", "domain_experts", "synthesis_coordinator", "quality_validator"], "success_metrics": ["solution_quality", "time_to_resolution", "participant_satisfaction", "knowledge_creation"]}',
 '{"problem_resolution_rate": 0.91, "solution_quality_score": 0.87, "participant_satisfaction": 0.89, "knowledge_generation": 0.78}',
 '["complex_technical_challenges", "strategic_planning", "optimization_problems", "innovation_initiatives"]',
 0.88, 0.92);

-- Insert initial agent profiles for existing agents
INSERT INTO agent_knowledge_profiles (agent_type, specialization_domains, knowledge_capabilities, learning_preferences, expertise_level, consultation_availability) VALUES
('rag_primary_request_analysis_agent', 
 '["request_analysis", "pattern_recognition", "user_intent_classification", "complexity_assessment"]',
 '{"request_categorization": "expert", "user_behavior_analysis": "advanced", "complexity_evaluation": "expert", "recommendation_generation": "advanced"}',
 '{"domain_expansion": ["advanced_nlp", "semantic_analysis"], "collaboration_areas": ["community_management", "user_experience"]}',
 0.85, true),

('daughter_community_rag_agent',
 '["hierarchical_management", "organizational_design", "resource_allocation", "community_optimization"]',
 '{"organizational_structure_design": "expert", "resource_optimization": "advanced", "hierarchy_management": "expert", "autonomy_balancing": "advanced"}',
 '{"domain_expansion": ["large_scale_coordination", "adaptive_systems"], "collaboration_areas": ["strategic_planning", "performance_optimization"]}',
 0.82, true),

('community_ai_leader_enhanced',
 '["community_leadership", "engagement_strategies", "conflict_resolution", "growth_management"]',
 '{"community_engagement": "expert", "leadership_strategies": "advanced", "conflict_mediation": "expert", "growth_optimization": "advanced"}',
 '{"domain_expansion": ["psychological_insights", "behavioral_economics"], "collaboration_areas": ["organizational_psychology", "decision_making"]}',
 0.87, true);

-- Insert initial network status for agents
INSERT INTO knowledge_network_status (agent_type, network_role, current_load, expertise_availability, status) VALUES
('rag_primary_request_analysis_agent', 'specialist', 0.3, '{"request_analysis": true, "pattern_recognition": true, "complexity_assessment": true}', 'online'),
('daughter_community_rag_agent', 'specialist', 0.2, '{"hierarchical_management": true, "organizational_design": true, "resource_allocation": true}', 'online'),
('community_ai_leader_enhanced', 'facilitator', 0.4, '{"community_leadership": true, "engagement_strategies": true, "conflict_resolution": true}', 'online');

-- Add comments for documentation
COMMENT ON TABLE agent_knowledge_profiles IS 'Comprehensive profiles of agent expertise, capabilities, and learning preferences';
COMMENT ON TABLE collective_intelligence_vault IS 'Central repository for validated knowledge patterns and insights from across the agent ecosystem';
COMMENT ON TABLE agent_consultation_requests IS 'Manages requests for specialized expertise and consultation between agents';
COMMENT ON TABLE cross_domain_knowledge_transfers IS 'Tracks knowledge adaptation and transfer between different domains and agent types';
COMMENT ON TABLE collaborative_problem_solving IS 'Coordinates multi-agent collaborative sessions for complex problem solving';
COMMENT ON TABLE ecosystem_intelligence_patterns IS 'Identifies and tracks emergent patterns across the entire agent ecosystem';
COMMENT ON TABLE knowledge_quality_metrics IS 'Comprehensive quality assessment framework for knowledge patterns and insights';
COMMENT ON TABLE knowledge_network_status IS 'Real-time status and availability tracking for the knowledge sharing network';
COMMENT ON TABLE agent_learning_effectiveness IS 'Measures and tracks effectiveness of knowledge transfer and learning across agents';

COMMENT ON VIEW agent_expertise_directory IS 'Directory of available expert agents with their specializations and current status';
COMMENT ON VIEW knowledge_pattern_rankings IS 'Ranked list of knowledge patterns by quality, usage, and effectiveness';
COMMENT ON VIEW cross_domain_innovation_opportunities IS 'Identifies successful cross-domain knowledge transfer patterns for innovation';
COMMENT ON VIEW ecosystem_intelligence_dashboard IS 'Real-time dashboard metrics for the overall health and activity of the knowledge network';

COMMENT ON FUNCTION find_expert_agents(TEXT, DECIMAL) IS 'Finds expert agents in specified domains with minimum expertise level';
COMMENT ON FUNCTION calculate_knowledge_network_health() IS 'Calculates comprehensive health metrics for the knowledge sharing network';
