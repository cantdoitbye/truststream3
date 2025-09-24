-- Migration: create_autonomous_agent_ecosystem
-- Created at: 2025-09-20 08:29:54
-- Revolutionary Autonomous Agent Ecosystem Infrastructure

-- Enhanced Communities Table for Hierarchical Structure
CREATE TABLE IF NOT EXISTS communities_enhanced (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_community_id UUID REFERENCES communities_enhanced(id),
    name VARCHAR(255) NOT NULL,
    bio TEXT,
    purpose TEXT NOT NULL,
    mission TEXT NOT NULL,
    vision TEXT NOT NULL,
    values JSONB DEFAULT '[]',
    community_type VARCHAR(50) DEFAULT 'primary' CHECK (community_type IN ('primary', 'daughter', 'specialized')),
    hierarchy_level INTEGER DEFAULT 1,
    autonomy_level VARCHAR(20) DEFAULT 'standard' CHECK (autonomy_level IN ('basic', 'standard', 'advanced', 'autonomous')),
    auto_creation_source JSONB DEFAULT '{}',
    okr_framework JSONB DEFAULT '{}',
    governance_config JSONB DEFAULT '{}',
    knowledge_sharing_enabled BOOLEAN DEFAULT true,
    ai_leader_id UUID,
    compliance_agent_id UUID,
    created_by_user_id UUID,
    created_by_ai_leader UUID,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Instances Enhanced for Autonomous Operations
CREATE TABLE IF NOT EXISTS agent_instances_enhanced (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    community_id UUID REFERENCES communities_enhanced(id),
    parent_agent_id UUID REFERENCES agent_instances_enhanced(id),
    agent_type VARCHAR(100) NOT NULL,
    agent_name VARCHAR(255) NOT NULL,
    role_type VARCHAR(50) DEFAULT 'specialist' CHECK (role_type IN ('ai_leader', 'compliance_agent', 'specialist', 'coordinator')),
    autonomy_level VARCHAR(20) DEFAULT 'standard' CHECK (autonomy_level IN ('basic', 'standard', 'advanced', 'autonomous')),
    spawning_reason JSONB DEFAULT '{}',
    okr_inherited JSONB DEFAULT '{}',
    decision_authority JSONB DEFAULT '{}',
    collaboration_scope JSONB DEFAULT '{}',
    efficiency_metrics JSONB DEFAULT '{}',
    quality_metrics JSONB DEFAULT '{}',
    agent_config JSONB DEFAULT '{}',
    agent_status VARCHAR(50) DEFAULT 'initializing',
    health_score DECIMAL(3,2) DEFAULT 1.0,
    performance_history JSONB DEFAULT '[]',
    spawned_by_user_id UUID,
    spawned_by_ai_leader UUID,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    deployment_template_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Primary Request Analysis System
CREATE TABLE IF NOT EXISTS request_analysis_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    original_request TEXT NOT NULL,
    analysis_result JSONB NOT NULL,
    recommended_community_structure JSONB NOT NULL,
    complexity_score DECIMAL(3,2) NOT NULL,
    estimated_agents_needed INTEGER DEFAULT 1,
    specialized_skills_required JSONB DEFAULT '[]',
    priority_level VARCHAR(20) DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high', 'critical')),
    auto_approve_threshold DECIMAL(3,2) DEFAULT 0.8,
    human_approval_required BOOLEAN DEFAULT false,
    analysis_confidence DECIMAL(3,2) NOT NULL,
    processing_time_ms INTEGER,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'implemented', 'rejected')),
    implemented_community_id UUID REFERENCES communities_enhanced(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community Genesis Tracking
CREATE TABLE IF NOT EXISTS community_genesis_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_analysis_id UUID REFERENCES request_analysis_sessions(id),
    community_id UUID REFERENCES communities_enhanced(id),
    genesis_type VARCHAR(50) DEFAULT 'user_request' CHECK (genesis_type IN ('user_request', 'ai_spawned', 'daughter_community')),
    ai_leader_deployment JSONB DEFAULT '{}',
    compliance_agent_deployment JSONB DEFAULT '{}',
    initial_bio_generated TEXT,
    okr_framework_created JSONB DEFAULT '{}',
    genesis_success BOOLEAN DEFAULT false,
    genesis_duration_ms INTEGER,
    error_details JSONB DEFAULT '{}',
    created_by_user_id UUID,
    created_by_ai_leader UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- OKR Framework Evolution
CREATE TABLE IF NOT EXISTS okr_evolution_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    community_id UUID REFERENCES communities_enhanced(id),
    agent_id UUID REFERENCES agent_instances_enhanced(id),
    okr_version INTEGER DEFAULT 1,
    previous_okrs JSONB DEFAULT '{}',
    updated_okrs JSONB NOT NULL,
    evolution_trigger VARCHAR(100) NOT NULL,
    user_input_influence JSONB DEFAULT '{}',
    ai_reasoning TEXT,
    confidence_score DECIMAL(3,2) DEFAULT 0.7,
    impact_assessment JSONB DEFAULT '{}',
    approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'auto_approved')),
    approved_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Autonomous Agent Spawning Decisions
CREATE TABLE IF NOT EXISTS autonomous_spawning_decisions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    community_id UUID REFERENCES communities_enhanced(id),
    ai_leader_id UUID REFERENCES agent_instances_enhanced(id),
    spawning_decision JSONB NOT NULL,
    reasoning TEXT NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL,
    estimated_value_add JSONB DEFAULT '{}',
    resource_requirements JSONB DEFAULT '{}',
    approval_level_required VARCHAR(20) DEFAULT 'auto' CHECK (approval_level_required IN ('auto', 'ai_review', 'human_approval')),
    spawned_agent_id UUID REFERENCES agent_instances_enhanced(id),
    spawning_success BOOLEAN DEFAULT false,
    performance_tracking JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daughter Community Creation Log
CREATE TABLE IF NOT EXISTS daughter_community_creation (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_community_id UUID REFERENCES communities_enhanced(id),
    daughter_community_id UUID REFERENCES communities_enhanced(id),
    creating_ai_leader_id UUID REFERENCES agent_instances_enhanced(id),
    creation_rationale TEXT NOT NULL,
    specialized_purpose TEXT NOT NULL,
    inheritance_config JSONB DEFAULT '{}',
    autonomy_granted JSONB DEFAULT '{}',
    governance_relationship JSONB DEFAULT '{}',
    success_criteria JSONB DEFAULT '{}',
    creation_success BOOLEAN DEFAULT false,
    performance_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inter-Community Knowledge Sharing
CREATE TABLE IF NOT EXISTS knowledge_sharing_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    initiating_community_id UUID REFERENCES communities_enhanced(id),
    target_community_id UUID REFERENCES communities_enhanced(id),
    knowledge_type VARCHAR(100) NOT NULL,
    shared_knowledge JSONB NOT NULL,
    sharing_context TEXT,
    bilateral_exchange BOOLEAN DEFAULT false,
    received_knowledge JSONB DEFAULT '{}',
    value_assessment JSONB DEFAULT '{}',
    integration_success BOOLEAN DEFAULT false,
    follow_up_actions JSONB DEFAULT '[]',
    created_by_agent_id UUID REFERENCES agent_instances_enhanced(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Efficiency vs Quality Governance Decisions
CREATE TABLE IF NOT EXISTS governance_balance_decisions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    community_id UUID REFERENCES communities_enhanced(id),
    ai_leader_decision JSONB DEFAULT '{}',
    compliance_agent_input JSONB DEFAULT '{}',
    decision_context VARCHAR(200) NOT NULL,
    efficiency_factors JSONB DEFAULT '{}',
    quality_factors JSONB DEFAULT '{}',
    final_decision JSONB NOT NULL,
    balance_score DECIMAL(3,2) NOT NULL, -- 0 = pure efficiency, 1 = pure quality, 0.5 = balanced
    decision_rationale TEXT NOT NULL,
    stakeholder_impact JSONB DEFAULT '{}',
    success_metrics JSONB DEFAULT '{}',
    implementation_status VARCHAR(20) DEFAULT 'pending' CHECK (implementation_status IN ('pending', 'implementing', 'completed', 'failed')),
    outcome_assessment JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Communication Network
CREATE TABLE IF NOT EXISTS agent_communication_network (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_agent_id UUID REFERENCES agent_instances_enhanced(id),
    receiver_agent_id UUID REFERENCES agent_instances_enhanced(id),
    communication_type VARCHAR(50) NOT NULL CHECK (communication_type IN ('collaboration', 'consultation', 'knowledge_sharing', 'coordination', 'escalation')),
    message_content JSONB NOT NULL,
    context_data JSONB DEFAULT '{}',
    urgency_level VARCHAR(20) DEFAULT 'normal' CHECK (urgency_level IN ('low', 'normal', 'high', 'critical')),
    response_required BOOLEAN DEFAULT false,
    response_deadline TIMESTAMPTZ,
    response_content JSONB DEFAULT '{}',
    communication_success BOOLEAN DEFAULT true,
    follow_up_actions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ
);

-- Autonomous Ecosystem Performance Metrics
CREATE TABLE IF NOT EXISTS ecosystem_performance_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    measurement_period VARCHAR(20) NOT NULL CHECK (measurement_period IN ('hourly', 'daily', 'weekly', 'monthly')),
    total_communities INTEGER DEFAULT 0,
    total_active_agents INTEGER DEFAULT 0,
    autonomous_decisions_made INTEGER DEFAULT 0,
    human_interventions_required INTEGER DEFAULT 0,
    knowledge_sharing_sessions INTEGER DEFAULT 0,
    daughter_communities_created INTEGER DEFAULT 0,
    average_response_time_ms INTEGER,
    system_efficiency_score DECIMAL(3,2),
    quality_satisfaction_score DECIMAL(3,2),
    user_satisfaction_score DECIMAL(3,2),
    autonomous_success_rate DECIMAL(3,2),
    error_rate DECIMAL(3,2),
    resource_utilization JSONB DEFAULT '{}',
    scaling_indicators JSONB DEFAULT '{}',
    measurement_timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_communities_enhanced_parent ON communities_enhanced(parent_community_id);
CREATE INDEX IF NOT EXISTS idx_communities_enhanced_type ON communities_enhanced(community_type, status);
CREATE INDEX IF NOT EXISTS idx_agent_instances_enhanced_community ON agent_instances_enhanced(community_id, agent_status);
CREATE INDEX IF NOT EXISTS idx_agent_instances_enhanced_role ON agent_instances_enhanced(role_type, autonomy_level);
CREATE INDEX IF NOT EXISTS idx_request_analysis_status ON request_analysis_sessions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_okr_evolution_community ON okr_evolution_log(community_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spawning_decisions_community ON autonomous_spawning_decisions(community_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_sharing_communities ON knowledge_sharing_sessions(initiating_community_id, target_community_id);
CREATE INDEX IF NOT EXISTS idx_governance_decisions_community ON governance_balance_decisions(community_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_communication_sender ON agent_communication_network(sender_agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ecosystem_metrics_period ON ecosystem_performance_metrics(measurement_period, measurement_timestamp DESC);

-- Update foreign key references for existing tables
ALTER TABLE communities_enhanced ADD CONSTRAINT fk_ai_leader FOREIGN KEY (ai_leader_id) REFERENCES agent_instances_enhanced(id);
ALTER TABLE communities_enhanced ADD CONSTRAINT fk_compliance_agent FOREIGN KEY (compliance_agent_id) REFERENCES agent_instances_enhanced(id);

-- Create initial ecosystem performance baseline
INSERT INTO ecosystem_performance_metrics (
    measurement_period, 
    total_communities, 
    total_active_agents, 
    system_efficiency_score, 
    quality_satisfaction_score, 
    autonomous_success_rate,
    measurement_timestamp
) VALUES (
    'daily',
    0,
    0,
    0.0,
    0.0,
    0.0,
    NOW()
);

-- Add helpful comments
COMMENT ON TABLE communities_enhanced IS 'Enhanced communities table supporting hierarchical autonomous agent ecosystems';
COMMENT ON TABLE agent_instances_enhanced IS 'Enhanced agent instances with autonomous spawning and OKR inheritance capabilities';
COMMENT ON TABLE request_analysis_sessions IS 'Primary request analysis engine for automatic community creation';
COMMENT ON TABLE community_genesis_logs IS 'Tracking community creation from user requests and AI decisions';
COMMENT ON TABLE okr_evolution_log IS 'Evolution tracking for OKR frameworks in autonomous communities';
COMMENT ON TABLE autonomous_spawning_decisions IS 'AI leader decisions for spawning specialized agents';
COMMENT ON TABLE daughter_community_creation IS 'Tracking creation of daughter communities by AI leaders';
COMMENT ON TABLE knowledge_sharing_sessions IS 'Inter-community knowledge sharing and consultation tracking';
COMMENT ON TABLE governance_balance_decisions IS 'Efficiency vs quality governance decision tracking';
COMMENT ON TABLE agent_communication_network IS 'Agent-to-agent communication network for collaboration';
COMMENT ON TABLE ecosystem_performance_metrics IS 'Performance metrics for the autonomous agent ecosystem';