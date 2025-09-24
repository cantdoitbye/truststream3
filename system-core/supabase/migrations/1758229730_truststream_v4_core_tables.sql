-- Migration: truststream_v4_core_tables
-- Created at: 1758229730

-- TrustStream v4.0 Inter-Layer Management System - Core Tables
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
    layer_assignment INTEGER NOT NULL,
    capability_vector JSONB NOT NULL DEFAULT '{}',
    trust_score_4d JSONB NOT NULL DEFAULT '{"iq": 0, "appeal": 0, "social": 0, "humanity": 0}',
    current_status VARCHAR(20) DEFAULT 'active',
    governance_level INTEGER DEFAULT 1,
    specialization_tags TEXT[],
    memory_version VARCHAR(20) NOT NULL DEFAULT 'v1.0.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Agent Memory & Version Control
CREATE TABLE IF NOT EXISTS agent_memory_versions (
    id SERIAL PRIMARY KEY,
    agent_id VARCHAR(50),
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
    coordinator_agent_id VARCHAR(50),
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
    agent_id VARCHAR(50),
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
    task_complexity_score INTEGER,
    assigned_agent_id VARCHAR(50),
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
    agent_id VARCHAR(50),
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
    agent_id VARCHAR(50),
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
    agent_id VARCHAR(50),
    violation_type VARCHAR(100) NOT NULL,
    severity_level VARCHAR(20) NOT NULL,
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
    agent_id VARCHAR(50),
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
    intent_complexity_score INTEGER,
    route_decision JSONB NOT NULL,
    selected_agent_id VARCHAR(50),
    routing_confidence DECIMAL(5,2),
    alternative_routes JSONB DEFAULT '{}',
    processing_chain TEXT[],
    routed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    routing_success BOOLEAN,
    feedback_score INTEGER
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
    routing_id VARCHAR(100),
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
    escalation_level INTEGER NOT NULL,
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
    escalation_workflow_id VARCHAR(100),
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
    source_layer INTEGER,
    target_layer INTEGER,
    source_agent_id VARCHAR(50),
    target_agent_id VARCHAR(50),
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
);;