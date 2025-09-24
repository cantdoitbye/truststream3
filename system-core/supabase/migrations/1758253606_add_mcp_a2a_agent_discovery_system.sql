-- Migration: add_mcp_a2a_agent_discovery_system
-- Created at: 1758253606

-- TrustStream v4.0 MCP/A2A Agent Discovery and Communication System
-- Database Schema Extensions
-- Author: MiniMax Agent
-- Created: 2025-09-19

-- ====================================
-- 1. AGENT DISCOVERY SERVICES TABLES
-- ====================================

-- Agent Discovery Registry (extends existing agent_registry)
CREATE TABLE IF NOT EXISTS agent_discovery_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id VARCHAR(255) NOT NULL,
    agent_registry_id UUID REFERENCES agent_registry(id),
    discovery_endpoint TEXT NOT NULL,
    capability_manifest JSONB DEFAULT '{}',
    service_description TEXT,
    api_version VARCHAR(50) DEFAULT 'v1.0',
    supported_protocols TEXT[] DEFAULT ARRAY['mcp', 'a2a', 'http'],
    availability_schedule JSONB DEFAULT '{}',
    load_capacity INTEGER DEFAULT 100,
    current_load INTEGER DEFAULT 0,
    health_check_endpoint TEXT,
    last_health_check TIMESTAMPTZ,
    health_status VARCHAR(50) DEFAULT 'unknown',
    discovery_tags TEXT[],
    authentication_methods JSONB DEFAULT '{}',
    rate_limits JSONB DEFAULT '{}',
    geographic_location JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id)
);

-- Agent Capability Index for fast capability matching
CREATE TABLE IF NOT EXISTS agent_capability_index (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id VARCHAR(255) NOT NULL,
    capability_name VARCHAR(255) NOT NULL,
    capability_type VARCHAR(100) NOT NULL,
    proficiency_score DECIMAL(3,2) DEFAULT 0.0,
    specialization_level VARCHAR(50) DEFAULT 'basic',
    domain_expertise TEXT[],
    performance_benchmarks JSONB DEFAULT '{}',
    last_validated TIMESTAMPTZ DEFAULT NOW(),
    validation_source VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, capability_name)
);

-- Agent Health Monitoring
CREATE TABLE IF NOT EXISTS agent_health_monitoring (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id VARCHAR(255) NOT NULL,
    health_check_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    response_time_ms INTEGER,
    health_data JSONB DEFAULT '{}',
    error_details TEXT,
    check_timestamp TIMESTAMPTZ DEFAULT NOW(),
    alert_threshold_exceeded BOOLEAN DEFAULT FALSE,
    recovery_actions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================
-- 2. MCP/A2A PROTOCOL SUPPORT TABLES
-- ====================================

-- MCP Protocol Messages
CREATE TABLE IF NOT EXISTS mcp_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id VARCHAR(255) NOT NULL UNIQUE,
    protocol_version VARCHAR(20) DEFAULT 'mcp-1.0',
    from_agent_id VARCHAR(255) NOT NULL,
    to_agent_id VARCHAR(255) NOT NULL,
    message_type VARCHAR(100) NOT NULL,
    method VARCHAR(100),
    params JSONB DEFAULT '{}',
    headers JSONB DEFAULT '{}',
    body JSONB DEFAULT '{}',
    request_id VARCHAR(255),
    correlation_id VARCHAR(255),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    delivery_status VARCHAR(50) DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    error_details JSONB DEFAULT '{}',
    ttl_seconds INTEGER DEFAULT 3600,
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour',
    priority INTEGER DEFAULT 5,
    routing_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- A2A Communication Sessions
CREATE TABLE IF NOT EXISTS a2a_communication_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL UNIQUE,
    session_type VARCHAR(100) NOT NULL,
    initiator_agent_id VARCHAR(255) NOT NULL,
    participant_agents TEXT[] NOT NULL,
    session_state VARCHAR(50) DEFAULT 'active',
    session_context JSONB DEFAULT '{}',
    communication_protocol VARCHAR(50) DEFAULT 'mcp',
    security_config JSONB DEFAULT '{}',
    message_count INTEGER DEFAULT 0,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    session_duration_seconds INTEGER,
    outcome_summary JSONB DEFAULT '{}',
    quality_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Authentication & Authorization
CREATE TABLE IF NOT EXISTS agent_auth_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id VARCHAR(255) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    token_type VARCHAR(50) DEFAULT 'bearer',
    scope TEXT[] DEFAULT ARRAY['read', 'write'],
    permissions JSONB DEFAULT '{}',
    issuer VARCHAR(255),
    subject VARCHAR(255),
    audience TEXT[],
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    last_used TIMESTAMPTZ,
    usage_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message Routing Rules
CREATE TABLE IF NOT EXISTS message_routing_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rule_name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50) NOT NULL,
    source_pattern VARCHAR(255),
    destination_pattern VARCHAR(255),
    message_type_filter VARCHAR(100),
    priority INTEGER DEFAULT 5,
    routing_logic JSONB NOT NULL,
    load_balancing_strategy VARCHAR(50) DEFAULT 'round_robin',
    failover_config JSONB DEFAULT '{}',
    rate_limiting JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================
-- 3. RELIABILITY SCORING TABLES
-- ====================================

-- Agent Reliability Metrics
CREATE TABLE IF NOT EXISTS agent_reliability_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id VARCHAR(255) NOT NULL,
    metric_type VARCHAR(100) NOT NULL,
    metric_category VARCHAR(50) NOT NULL,
    metric_value DECIMAL(10,4) NOT NULL,
    measurement_period VARCHAR(50) NOT NULL,
    measurement_start TIMESTAMPTZ NOT NULL,
    measurement_end TIMESTAMPTZ NOT NULL,
    data_points INTEGER DEFAULT 1,
    confidence_score DECIMAL(3,2) DEFAULT 0.0,
    trend_direction VARCHAR(20),
    baseline_value DECIMAL(10,4),
    deviation_percentage DECIMAL(5,2),
    quality_indicators JSONB DEFAULT '{}',
    measurement_context JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, metric_type, metric_category, measurement_period, measurement_start)
);

-- Agent Reputation System
CREATE TABLE IF NOT EXISTS agent_reputation_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id VARCHAR(255) NOT NULL,
    reputation_category VARCHAR(100) NOT NULL,
    score DECIMAL(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
    confidence_level DECIMAL(3,2) DEFAULT 0.0,
    review_count INTEGER DEFAULT 0,
    last_review_date TIMESTAMPTZ,
    peer_evaluations JSONB DEFAULT '{}',
    performance_history JSONB DEFAULT '{}',
    improvement_trend DECIMAL(5,2) DEFAULT 0.0,
    reputation_factors JSONB DEFAULT '{}',
    validation_status VARCHAR(50) DEFAULT 'pending',
    last_calculated TIMESTAMPTZ DEFAULT NOW(),
    calculation_version VARCHAR(20) DEFAULT 'v1.0',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, reputation_category)
);

-- Performance Analytics
CREATE TABLE IF NOT EXISTS agent_performance_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id VARCHAR(255) NOT NULL,
    analysis_period VARCHAR(50) NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    success_rate DECIMAL(5,2) DEFAULT 0.0,
    failure_rate DECIMAL(5,2) DEFAULT 0.0,
    average_response_time_ms INTEGER DEFAULT 0,
    throughput_requests_per_minute DECIMAL(8,2) DEFAULT 0.0,
    error_distribution JSONB DEFAULT '{}',
    performance_benchmarks JSONB DEFAULT '{}',
    quality_scores JSONB DEFAULT '{}',
    availability_percentage DECIMAL(5,2) DEFAULT 0.0,
    reliability_index DECIMAL(5,2) DEFAULT 0.0,
    efficiency_metrics JSONB DEFAULT '{}',
    comparative_rankings JSONB DEFAULT '{}',
    improvement_recommendations JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, analysis_period, period_start)
);

-- ====================================
-- 4. KNOWLEDGE TRANSFER TABLES
-- ====================================

-- Cross-Domain Knowledge Patterns
CREATE TABLE IF NOT EXISTS cross_domain_knowledge_patterns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pattern_id VARCHAR(255) NOT NULL UNIQUE,
    pattern_name VARCHAR(255) NOT NULL,
    domain_source VARCHAR(100) NOT NULL,
    domain_target VARCHAR(100) NOT NULL,
    knowledge_type VARCHAR(100) NOT NULL,
    pattern_definition JSONB NOT NULL,
    transfer_rules JSONB DEFAULT '{}',
    applicability_conditions JSONB DEFAULT '{}',
    success_metrics JSONB DEFAULT '{}',
    validation_criteria JSONB DEFAULT '{}',
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.0,
    last_used TIMESTAMPTZ,
    pattern_version VARCHAR(20) DEFAULT 'v1.0',
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge Transfer Sessions
CREATE TABLE IF NOT EXISTS knowledge_transfer_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL UNIQUE,
    transfer_type VARCHAR(100) NOT NULL,
    source_agent_id VARCHAR(255) NOT NULL,
    target_agent_ids TEXT[] NOT NULL,
    knowledge_pattern_id UUID REFERENCES cross_domain_knowledge_patterns(id),
    transfer_status VARCHAR(50) DEFAULT 'initiated',
    knowledge_payload JSONB NOT NULL,
    transfer_context JSONB DEFAULT '{}',
    validation_results JSONB DEFAULT '{}',
    adaptation_requirements JSONB DEFAULT '{}',
    success_indicators JSONB DEFAULT '{}',
    quality_assessment JSONB DEFAULT '{}',
    conflict_resolutions JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    transfer_duration_seconds INTEGER,
    effectiveness_score DECIMAL(5,2),
    learning_outcomes JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Knowledge Registry
CREATE TABLE IF NOT EXISTS agent_knowledge_registry (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id VARCHAR(255) NOT NULL,
    knowledge_domain VARCHAR(100) NOT NULL,
    knowledge_item_id VARCHAR(255) NOT NULL,
    knowledge_type VARCHAR(100) NOT NULL,
    expertise_level DECIMAL(3,2) DEFAULT 0.0,
    knowledge_source VARCHAR(100),
    acquisition_method VARCHAR(100),
    knowledge_metadata JSONB DEFAULT '{}',
    validation_status VARCHAR(50) DEFAULT 'pending',
    last_accessed TIMESTAMPTZ,
    usage_frequency INTEGER DEFAULT 0,
    sharing_permissions JSONB DEFAULT '{}',
    quality_rating DECIMAL(3,2) DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, knowledge_domain, knowledge_item_id)
);

-- ====================================
-- 5. COORDINATION & MONITORING TABLES
-- ====================================

-- Agent Coordination Tasks (extends existing coordination_sessions)
CREATE TABLE IF NOT EXISTS mcp_coordination_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id VARCHAR(255) NOT NULL UNIQUE,
    coordination_session_id UUID REFERENCES agent_coordination_sessions(id),
    task_type VARCHAR(100) NOT NULL,
    task_priority INTEGER DEFAULT 5,
    assigned_agents TEXT[] NOT NULL,
    coordinator_agent_id VARCHAR(255),
    task_specification JSONB NOT NULL,
    execution_plan JSONB DEFAULT '{}',
    progress_tracking JSONB DEFAULT '{}',
    resource_requirements JSONB DEFAULT '{}',
    dependencies TEXT[],
    conflict_resolution_strategy VARCHAR(100),
    escalation_rules JSONB DEFAULT '{}',
    task_status VARCHAR(50) DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    estimated_completion TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    task_outcome JSONB DEFAULT '{}',
    performance_metrics JSONB DEFAULT '{}',
    lessons_learned JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Real-time Agent Status Tracking
CREATE TABLE IF NOT EXISTS agent_realtime_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id VARCHAR(255) NOT NULL UNIQUE,
    current_status VARCHAR(50) NOT NULL,
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    active_sessions TEXT[],
    current_workload JSONB DEFAULT '{}',
    available_capacity INTEGER DEFAULT 100,
    processing_queue_size INTEGER DEFAULT 0,
    response_time_average_ms INTEGER DEFAULT 0,
    error_rate_last_hour DECIMAL(5,2) DEFAULT 0.0,
    health_indicators JSONB DEFAULT '{}',
    network_connectivity VARCHAR(50) DEFAULT 'unknown',
    resource_utilization JSONB DEFAULT '{}',
    maintenance_mode BOOLEAN DEFAULT FALSE,
    alert_conditions JSONB DEFAULT '{}',
    location_context JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================
-- INDEXES FOR PERFORMANCE
-- ====================================

-- Discovery and search indexes
CREATE INDEX IF NOT EXISTS idx_agent_discovery_profiles_agent_id ON agent_discovery_profiles(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_discovery_profiles_tags ON agent_discovery_profiles USING GIN(discovery_tags);
CREATE INDEX IF NOT EXISTS idx_agent_capability_index_capability ON agent_capability_index(capability_name, capability_type);
CREATE INDEX IF NOT EXISTS idx_agent_capability_index_agent ON agent_capability_index(agent_id);

-- Communication indexes
CREATE INDEX IF NOT EXISTS idx_mcp_messages_correlation ON mcp_messages(correlation_id);
CREATE INDEX IF NOT EXISTS idx_mcp_messages_from_agent ON mcp_messages(from_agent_id);
CREATE INDEX IF NOT EXISTS idx_mcp_messages_to_agent ON mcp_messages(to_agent_id);
CREATE INDEX IF NOT EXISTS idx_mcp_messages_timestamp ON mcp_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_a2a_sessions_participants ON a2a_communication_sessions USING GIN(participant_agents);

-- Performance and monitoring indexes
CREATE INDEX IF NOT EXISTS idx_agent_reliability_metrics_agent ON agent_reliability_metrics(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_reputation_scores_agent ON agent_reputation_scores(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_realtime_status_heartbeat ON agent_realtime_status(last_heartbeat);

-- Knowledge transfer indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_patterns_domains ON cross_domain_knowledge_patterns(domain_source, domain_target);
CREATE INDEX IF NOT EXISTS idx_knowledge_transfer_sessions_source ON knowledge_transfer_sessions(source_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_registry_domain ON agent_knowledge_registry(agent_id, knowledge_domain);

-- ====================================
-- TRIGGERS FOR AUTO-UPDATING
-- ====================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_agent_discovery_profiles_updated_at 
    BEFORE UPDATE ON agent_discovery_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_reputation_scores_updated_at 
    BEFORE UPDATE ON agent_reputation_scores 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cross_domain_knowledge_patterns_updated_at 
    BEFORE UPDATE ON cross_domain_knowledge_patterns 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_knowledge_registry_updated_at 
    BEFORE UPDATE ON agent_knowledge_registry 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_routing_rules_updated_at 
    BEFORE UPDATE ON message_routing_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================
-- INITIAL DATA SEEDING
-- ====================================

-- Insert default message routing rules
INSERT INTO message_routing_rules (
    rule_name, 
    rule_type, 
    routing_logic,
    load_balancing_strategy
) VALUES 
(
    'Default MCP Routing',
    'mcp_protocol',
    '{"routing_type": "capability_based", "fallback_strategy": "round_robin"}',
    'capability_weighted'
),
(
    'Emergency Escalation',
    'emergency',
    '{"routing_type": "priority_based", "escalation_threshold": 0.9}',
    'priority_first'
),
(
    'Knowledge Transfer Routing',
    'knowledge_transfer',
    '{"routing_type": "expertise_based", "domain_matching": true}',
    'expertise_weighted'
);

-- Insert default cross-domain knowledge patterns
INSERT INTO cross_domain_knowledge_patterns (
    pattern_id,
    pattern_name,
    domain_source,
    domain_target,
    knowledge_type,
    pattern_definition
) VALUES 
(
    'governance_to_moderation',
    'Governance Rules to Content Moderation',
    'governance',
    'content_moderation',
    'policy_translation',
    '{"transfer_method": "rule_mapping", "adaptation_strategy": "context_aware"}'
),
(
    'performance_to_optimization',
    'Performance Metrics to System Optimization',
    'performance_monitoring',
    'system_optimization',
    'metric_analysis',
    '{"transfer_method": "pattern_recognition", "optimization_targets": ["response_time", "throughput"]}'
),
(
    'community_to_engagement',
    'Community Insights to Engagement Strategy',
    'community_analysis',
    'engagement_optimization',
    'behavioral_patterns',
    '{"transfer_method": "behavioral_modeling", "personalization_level": "high"}'
);;