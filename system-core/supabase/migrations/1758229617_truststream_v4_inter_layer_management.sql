-- Migration: truststream_v4_inter_layer_management
-- Created at: 1758229617

-- TrustStream v4.0 Inter-Layer Management System
-- Migration: Enhanced Agent Coordination Infrastructure
-- Created: 2025-09-19

-- =====================================================
-- 1. AGENT COORDINATOR INFRASTRUCTURE
-- =====================================================

-- Agent Registry & Governance
CREATE TABLE IF NOT EXISTS agent_registry (
    id SERIAL PRIMARY KEY,
    agent_id VARCHAR(50) UNIQUE NOT NULL,
    agent_name VARCHAR(100) NOT NULL,
    agent_type VARCHAR(50) NOT NULL,
    layer_assignment INTEGER NOT NULL CHECK (layer_assignment BETWEEN 1 AND 4),
    capability_vector JSONB NOT NULL DEFAULT '{}',
    trust_score_4d JSONB NOT NULL DEFAULT '{"iq": 0, "appeal": 0, "social": 0, "humanity": 0}',
    current_status VARCHAR(20) DEFAULT 'active',
    governance_level INTEGER DEFAULT 1 CHECK (governance_level BETWEEN 1 AND 5),
    specialization_tags TEXT[],
    memory_version VARCHAR(20) NOT NULL DEFAULT 'v1.0.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Agent Memory & Version Control
CREATE TABLE IF NOT EXISTS agent_memory_versions (
    id SERIAL PRIMARY KEY,
    agent_id VARCHAR(50) REFERENCES agent_registry(agent_id),
    version VARCHAR(20) NOT NULL,
    memory_snapshot JSONB NOT NULL,
    capability_updates JSONB DEFAULT '{}',
    performance_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT false,
    rollback_available BOOLEAN DEFAULT true
);

-- Agent Coordination Sessions
CREATE TABLE IF NOT EXISTS agent_coordination_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    coordinator_agent_id VARCHAR(50) REFERENCES agent_registry(agent_id),
    participant_agents TEXT[] NOT NULL,
    coordination_type VARCHAR(50) NOT NULL,
    session_context JSONB NOT NULL DEFAULT '{}',
    governance_rules JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    outcome_summary JSONB DEFAULT '{}'
);

-- =====================================================
-- 2. LOAD BALANCER AI SYSTEM
-- =====================================================

-- Agent Workload Tracking
CREATE TABLE IF NOT EXISTS agent_workload_metrics (
    id SERIAL PRIMARY KEY,
    agent_id VARCHAR(50) REFERENCES agent_registry(agent_id),
    current_tasks INTEGER DEFAULT 0,
    max_capacity INTEGER NOT NULL DEFAULT 10,
    utilization_percentage DECIMAL(5,2) DEFAULT 0.00,
    response_time_avg_ms INTEGER DEFAULT 0,
    success_rate_percentage DECIMAL(5,2) DEFAULT 100.00,
    trust_score_impact DECIMAL(5,2) DEFAULT 0.00,
    last_task_assigned_at TIMESTAMP WITH TIME ZONE,
    performance_trend VARCHAR(20) DEFAULT 'stable',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Load Distribution History
CREATE TABLE IF NOT EXISTS load_distribution_logs (
    id SERIAL PRIMARY KEY,
    distribution_id VARCHAR(100) UNIQUE NOT NULL,
    balancer_algorithm VARCHAR(50) NOT NULL,
    task_type VARCHAR(100) NOT NULL,
    task_complexity_score INTEGER CHECK (task_complexity_score BETWEEN 1 AND 10),
    assigned_agent_id VARCHAR(50) REFERENCES agent_registry(agent_id),
    alternative_agents TEXT[],
    distribution_reasoning JSONB NOT NULL,
    trust_score_factor DECIMAL(5,2),
    load_factor DECIMAL(5,2),
    regional_cost_factor DECIMAL(5,2),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    performance_outcome JSONB DEFAULT '{}'
);

-- Dynamic Capacity Management
CREATE TABLE IF NOT EXISTS agent_capacity_adjustments (
    id SERIAL PRIMARY KEY,
    agent_id VARCHAR(50) REFERENCES agent_registry(agent_id),
    previous_capacity INTEGER NOT NULL,
    new_capacity INTEGER NOT NULL,
    adjustment_reason VARCHAR(200),
    performance_justification JSONB DEFAULT '{}',
    adjusted_by VARCHAR(50) DEFAULT 'load_balancer_ai',
    adjusted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_temporary BOOLEAN DEFAULT false,
    revert_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- 3. AUDIT TRACKER AI INFRASTRUCTURE
-- =====================================================

-- Comprehensive Agent Activity Audit
CREATE TABLE IF NOT EXISTS agent_activity_audit (
    id SERIAL PRIMARY KEY,
    audit_id VARCHAR(100) UNIQUE NOT NULL,
    agent_id VARCHAR(50) REFERENCES agent_registry(agent_id),
    activity_type VARCHAR(100) NOT NULL,
    activity_category VARCHAR(50) NOT NULL,
    activity_description TEXT,
    input_data JSONB DEFAULT '{}',
    output_data JSONB DEFAULT '{}',
    processing_duration_ms INTEGER,
    trust_score_impact JSONB DEFAULT '{}',
    compliance_status VARCHAR(20) DEFAULT 'compliant',
    risk_level VARCHAR(20) DEFAULT 'low',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    trace_id VARCHAR(100),
    metadata JSONB DEFAULT '{}'
);

-- Compliance Violation Tracking
CREATE TABLE IF NOT EXISTS compliance_violations (
    id SERIAL PRIMARY KEY,
    violation_id VARCHAR(100) UNIQUE NOT NULL,
    agent_id VARCHAR(50) REFERENCES agent_registry(agent_id),
    violation_type VARCHAR(100) NOT NULL,
    severity_level VARCHAR(20) NOT NULL CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
    violation_description TEXT NOT NULL,
    detection_method VARCHAR(50),
    auto_remediated BOOLEAN DEFAULT false,
    remediation_actions JSONB DEFAULT '{}',
    impact_assessment JSONB DEFAULT '{}',
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'open'
);

-- Performance Anomaly Detection
CREATE TABLE IF NOT EXISTS performance_anomalies (
    id SERIAL PRIMARY KEY,
    anomaly_id VARCHAR(100) UNIQUE NOT NULL,
    agent_id VARCHAR(50) REFERENCES agent_registry(agent_id),
    anomaly_type VARCHAR(100) NOT NULL,
    expected_behavior JSONB NOT NULL,
    actual_behavior JSONB NOT NULL,
    deviation_percentage DECIMAL(5,2),
    confidence_score DECIMAL(5,2),
    detection_algorithm VARCHAR(50),
    impact_severity VARCHAR(20),
    auto_corrected BOOLEAN DEFAULT false,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    investigation_notes TEXT
);

-- =====================================================
-- 4. INTENT ROUTER AI ENGINE
-- =====================================================

-- Intent Classification & Routing
CREATE TABLE IF NOT EXISTS intent_routing_logs (
    id SERIAL PRIMARY KEY,
    routing_id VARCHAR(100) UNIQUE NOT NULL,
    original_intent TEXT NOT NULL,
    parsed_intent_structure JSONB NOT NULL,
    intent_category VARCHAR(100),
    intent_complexity_score INTEGER CHECK (intent_complexity_score BETWEEN 1 AND 10),
    semantic_embedding VECTOR(1536),
    route_decision JSONB NOT NULL,
    selected_agent_id VARCHAR(50) REFERENCES agent_registry(agent_id),
    routing_confidence DECIMAL(5,2),
    alternative_routes JSONB DEFAULT '{}',
    processing_chain TEXT[],
    routed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    routing_success BOOLEAN,
    feedback_score INTEGER CHECK (feedback_score BETWEEN 1 AND 5)
);

-- Semantic Intent Patterns
CREATE TABLE IF NOT EXISTS intent_pattern_registry (
    id SERIAL PRIMARY KEY,
    pattern_id VARCHAR(100) UNIQUE NOT NULL,
    pattern_name VARCHAR(200) NOT NULL,
    intent_signature JSONB NOT NULL,
    recommended_agents TEXT[],
    routing_rules JSONB NOT NULL,
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    usage_count INTEGER DEFAULT 0,
    pattern_confidence DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Intent Processing Context
CREATE TABLE IF NOT EXISTS intent_processing_context (
    id SERIAL PRIMARY KEY,
    context_id VARCHAR(100) UNIQUE NOT NULL,
    routing_id VARCHAR(100) REFERENCES intent_routing_logs(routing_id),
    user_context JSONB DEFAULT '{}',
    conversation_history JSONB DEFAULT '{}',
    environmental_factors JSONB DEFAULT '{}',
    business_rules_applied JSONB DEFAULT '{}',
    context_influence_score DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. FALLBACK & ESCALATION AI SYSTEM
-- =====================================================

-- Escalation Workflows
CREATE TABLE IF NOT EXISTS escalation_workflows (
    id SERIAL PRIMARY KEY,
    workflow_id VARCHAR(100) UNIQUE NOT NULL,
    trigger_event VARCHAR(100) NOT NULL,
    escalation_level INTEGER NOT NULL CHECK (escalation_level BETWEEN 1 AND 5),
    current_stage VARCHAR(50) NOT NULL,
    assigned_agents TEXT[],
    human_involved BOOLEAN DEFAULT false,
    human_assignee VARCHAR(100),
    priority_level VARCHAR(20) DEFAULT 'medium',
    escalation_reason TEXT,
    context_data JSONB DEFAULT '{}',
    auto_resolution_attempts INTEGER DEFAULT 0,
    max_auto_attempts INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active',
    resolution_summary JSONB DEFAULT '{}'
);

-- Human-in-the-Loop Integration
CREATE TABLE IF NOT EXISTS human_intervention_requests (
    id SERIAL PRIMARY KEY,
    intervention_id VARCHAR(100) UNIQUE NOT NULL,
    escalation_workflow_id VARCHAR(100) REFERENCES escalation_workflows(workflow_id),
    intervention_type VARCHAR(100) NOT NULL,
    urgency_level VARCHAR(20) NOT NULL,
    request_description TEXT NOT NULL,
    agent_context JSONB NOT NULL,
    recommended_actions JSONB DEFAULT '{}',
    human_assignee VARCHAR(100),
    assignment_method VARCHAR(50) DEFAULT 'auto',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    human_decision JSONB DEFAULT '{}',
    feedback_provided TEXT,
    status VARCHAR(20) DEFAULT 'pending'
);

-- Fallback Strategy Registry
CREATE TABLE IF NOT EXISTS fallback_strategies (
    id SERIAL PRIMARY KEY,
    strategy_id VARCHAR(100) UNIQUE NOT NULL,
    strategy_name VARCHAR(200) NOT NULL,
    trigger_conditions JSONB NOT NULL,
    fallback_sequence JSONB NOT NULL,
    success_criteria JSONB NOT NULL,
    timeout_settings JSONB DEFAULT '{}',
    retry_logic JSONB DEFAULT '{}',
    escalation_thresholds JSONB DEFAULT '{}',
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    average_resolution_time_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- =====================================================
-- 6. SYSTEM INTEGRATION & MONITORING
-- =====================================================

-- Inter-Layer Communication Logs
CREATE TABLE IF NOT EXISTS inter_layer_communications (
    id SERIAL PRIMARY KEY,
    communication_id VARCHAR(100) UNIQUE NOT NULL,
    source_layer INTEGER CHECK (source_layer BETWEEN 1 AND 4),
    target_layer INTEGER CHECK (target_layer BETWEEN 1 AND 4),
    source_agent_id VARCHAR(50) REFERENCES agent_registry(agent_id),
    target_agent_id VARCHAR(50) REFERENCES agent_registry(agent_id),
    message_type VARCHAR(100) NOT NULL,
    message_payload JSONB NOT NULL,
    processing_status VARCHAR(20) DEFAULT 'pending',
    response_payload JSONB DEFAULT '{}',
    latency_ms INTEGER,
    trust_verification BOOLEAN DEFAULT true,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    trace_context JSONB DEFAULT '{}'
);

-- System Health Monitoring
CREATE TABLE IF NOT EXISTS system_health_metrics (
    id SERIAL PRIMARY KEY,
    metric_id VARCHAR(100) UNIQUE NOT NULL,
    component_name VARCHAR(100) NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    metric_value DECIMAL(10,2),
    threshold_config JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'healthy',
    alert_level VARCHAR(20) DEFAULT 'none',
    measured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- 7. INDEXES FOR PERFORMANCE OPTIMIZATION
-- =====================================================

-- Agent Registry Indexes
CREATE INDEX IF NOT EXISTS idx_agent_registry_agent_id ON agent_registry(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_registry_type_layer ON agent_registry(agent_type, layer_assignment);
CREATE INDEX IF NOT EXISTS idx_agent_registry_status ON agent_registry(current_status);

-- Workload Metrics Indexes
CREATE INDEX IF NOT EXISTS idx_workload_metrics_agent_id ON agent_workload_metrics(agent_id);
CREATE INDEX IF NOT EXISTS idx_workload_metrics_utilization ON agent_workload_metrics(utilization_percentage);

-- Audit Indexes
CREATE INDEX IF NOT EXISTS idx_activity_audit_agent_timestamp ON agent_activity_audit(agent_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_audit_type ON agent_activity_audit(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_audit_compliance ON agent_activity_audit(compliance_status);

-- Intent Routing Indexes
CREATE INDEX IF NOT EXISTS idx_intent_routing_category ON intent_routing_logs(intent_category);
CREATE INDEX IF NOT EXISTS idx_intent_routing_agent ON intent_routing_logs(selected_agent_id);
CREATE INDEX IF NOT EXISTS idx_intent_routing_timestamp ON intent_routing_logs(routed_at);

-- Escalation Indexes
CREATE INDEX IF NOT EXISTS idx_escalation_status ON escalation_workflows(status);
CREATE INDEX IF NOT EXISTS idx_escalation_priority ON escalation_workflows(priority_level);
CREATE INDEX IF NOT EXISTS idx_escalation_human ON escalation_workflows(human_involved);

-- Inter-layer Communication Indexes
CREATE INDEX IF NOT EXISTS idx_inter_layer_source_target ON inter_layer_communications(source_layer, target_layer);
CREATE INDEX IF NOT EXISTS idx_inter_layer_timestamp ON inter_layer_communications(sent_at);

-- =====================================================
-- 8. RLS POLICIES FOR SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE agent_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_coordination_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_workload_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_distribution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_capacity_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_activity_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE intent_routing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE intent_pattern_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE intent_processing_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE human_intervention_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE fallback_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE inter_layer_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_metrics ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for authenticated users
CREATE POLICY "Allow authenticated read access" ON agent_registry FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON agent_workload_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON agent_activity_audit FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON intent_routing_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON escalation_workflows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON system_health_metrics FOR SELECT TO authenticated USING (true);

-- Service role full access
CREATE POLICY "Allow service role full access" ON agent_registry FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role full access" ON agent_memory_versions FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role full access" ON agent_coordination_sessions FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role full access" ON agent_workload_metrics FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role full access" ON load_distribution_logs FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role full access" ON agent_capacity_adjustments FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role full access" ON agent_activity_audit FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role full access" ON compliance_violations FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role full access" ON performance_anomalies FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role full access" ON intent_routing_logs FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role full access" ON intent_pattern_registry FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role full access" ON intent_processing_context FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role full access" ON escalation_workflows FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role full access" ON human_intervention_requests FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role full access" ON fallback_strategies FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role full access" ON inter_layer_communications FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role full access" ON system_health_metrics FOR ALL TO service_role USING (true);;