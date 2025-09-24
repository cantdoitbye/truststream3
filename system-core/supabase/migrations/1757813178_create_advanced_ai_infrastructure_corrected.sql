-- Migration: create_advanced_ai_infrastructure_corrected
-- Created at: 1757813178

-- Migration: Advanced AI Features - Phase 1 Core Infrastructure (Corrected)
-- Created at: 1757811901
-- Description: Create database schema for advanced AI orchestration, memory, collaboration, and security

-- ================================================================================
-- 1. AI ORCHESTRATION TABLES
-- ================================================================================

-- AI Orchestration Requests - tracks intelligent routing decisions
CREATE TABLE IF NOT EXISTS ai_orchestration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    request_type TEXT NOT NULL CHECK (request_type IN ('text_generation', 'image_generation', 'embeddings', 'analysis', 'reasoning', 'code_generation')),
    task_category TEXT NOT NULL,
    input_data JSONB NOT NULL,
    routing_strategy TEXT DEFAULT 'optimal' CHECK (routing_strategy IN ('optimal', 'cost_effective', 'fastest', 'specific_provider', 'comparison')),
    selected_providers TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    total_cost DECIMAL(10,6) DEFAULT 0.0,
    processing_time_ms INTEGER,
    quality_score DECIMAL(5,4),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_details JSONB
);

-- AI Provider Responses - detailed responses from each provider
CREATE TABLE IF NOT EXISTS ai_provider_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orchestration_request_id UUID REFERENCES ai_orchestration_requests(id) ON DELETE CASCADE,
    provider_name TEXT NOT NULL,
    model_used TEXT,
    response_data JSONB NOT NULL,
    quality_score DECIMAL(5,4),
    latency_ms INTEGER,
    token_usage JSONB,
    cost DECIMAL(10,6) DEFAULT 0.0,
    status TEXT DEFAULT 'success' CHECK (status IN ('success', 'error', 'timeout')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- AI Routing Analytics - learn from routing decisions
CREATE TABLE IF NOT EXISTS ai_routing_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name TEXT NOT NULL,
    request_type TEXT NOT NULL,
    task_category TEXT NOT NULL,
    success_rate DECIMAL(5,4),
    avg_latency_ms INTEGER,
    avg_cost DECIMAL(10,6),
    avg_quality_score DECIMAL(5,4),
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ================================================================================
-- 2. AI MEMORY SYSTEM TABLES
-- ================================================================================

-- AI Conversation Memory - persistent conversation context
CREATE TABLE IF NOT EXISTS ai_conversation_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id TEXT NOT NULL,
    session_id TEXT,
    message_type TEXT NOT NULL CHECK (message_type IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    importance_score DECIMAL(5,4) DEFAULT 0.5,
    context_tags TEXT[] DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- AI Knowledge Graph - structured knowledge from conversations
CREATE TABLE IF NOT EXISTS ai_knowledge_graph (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('concept', 'fact', 'preference', 'skill', 'goal', 'relationship')),
    entity_name TEXT NOT NULL,
    entity_value JSONB NOT NULL,
    confidence_score DECIMAL(5,4) DEFAULT 0.5,
    source_conversations TEXT[] DEFAULT '{}',
    related_entities UUID[] DEFAULT '{}',
    last_referenced TIMESTAMP WITH TIME ZONE,
    reference_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, entity_name, entity_type)
);

-- AI Memory Analytics - track memory usage patterns
CREATE TABLE IF NOT EXISTS ai_memory_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_count INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    knowledge_entities INTEGER DEFAULT 0,
    avg_conversation_length INTEGER DEFAULT 0,
    memory_retrieval_accuracy DECIMAL(5,4),
    most_active_topics TEXT[] DEFAULT '{}',
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ================================================================================
-- 3. MULTI-AGENT COLLABORATION TABLES
-- ================================================================================

-- Agent Collaboration Sessions - manage collaborative tasks
CREATE TABLE IF NOT EXISTS agent_collaboration_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_name TEXT NOT NULL,
    initiator_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    task_description TEXT NOT NULL,
    task_complexity TEXT DEFAULT 'medium' CHECK (task_complexity IN ('low', 'medium', 'high', 'critical')),
    participating_agents TEXT[] NOT NULL,
    session_status TEXT DEFAULT 'active' CHECK (session_status IN ('planning', 'active', 'completed', 'failed', 'cancelled')),
    task_decomposition JSONB,
    collaboration_strategy TEXT DEFAULT 'parallel' CHECK (collaboration_strategy IN ('sequential', 'parallel', 'hierarchical', 'democratic')),
    progress_percentage DECIMAL(5,2) DEFAULT 0.0,
    estimated_completion TIMESTAMP WITH TIME ZONE,
    actual_completion TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Agent Task Assignments - individual agent responsibilities
CREATE TABLE IF NOT EXISTS agent_task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collaboration_session_id UUID REFERENCES agent_collaboration_sessions(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    task_id TEXT NOT NULL,
    task_description TEXT NOT NULL,
    task_priority INTEGER DEFAULT 5 CHECK (task_priority >= 1 AND task_priority <= 10),
    task_status TEXT DEFAULT 'assigned' CHECK (task_status IN ('assigned', 'in_progress', 'completed', 'failed', 'blocked')),
    dependencies TEXT[] DEFAULT '{}',
    estimated_duration_minutes INTEGER,
    actual_duration_minutes INTEGER,
    result_data JSONB,
    quality_metrics JSONB,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Agent Communication Log - inter-agent messages
CREATE TABLE IF NOT EXISTS agent_communication_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collaboration_session_id UUID REFERENCES agent_collaboration_sessions(id) ON DELETE CASCADE,
    from_agent TEXT NOT NULL,
    to_agent TEXT,
    message_type TEXT NOT NULL CHECK (message_type IN ('task_request', 'result_share', 'question', 'notification', 'coordination')),
    message_content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    response_required BOOLEAN DEFAULT false,
    response_id UUID REFERENCES agent_communication_log(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Agent Performance Metrics - track collaboration effectiveness
CREATE TABLE IF NOT EXISTS agent_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name TEXT NOT NULL,
    collaboration_session_id UUID REFERENCES agent_collaboration_sessions(id) ON DELETE CASCADE,
    tasks_completed INTEGER DEFAULT 0,
    tasks_failed INTEGER DEFAULT 0,
    avg_task_duration_minutes DECIMAL(10,2),
    quality_score DECIMAL(5,4),
    collaboration_score DECIMAL(5,4),
    communication_effectiveness DECIMAL(5,4),
    reliability_score DECIMAL(5,4),
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ================================================================================
-- 4. AI SECURITY AND FRAUD DETECTION TABLES
-- ================================================================================

-- User Behavior Analytics - track user interaction patterns
CREATE TABLE IF NOT EXISTS user_behavior_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    behavior_type TEXT NOT NULL CHECK (behavior_type IN ('login', 'ai_interaction', 'trust_action', 'content_creation', 'navigation')),
    behavior_data JSONB NOT NULL,
    risk_score DECIMAL(5,4) DEFAULT 0.0,
    anomaly_flags TEXT[] DEFAULT '{}',
    geolocation JSONB,
    user_agent TEXT,
    ip_address INET,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Security Threat Detection - automated threat identification
CREATE TABLE IF NOT EXISTS security_threat_detection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    threat_type TEXT NOT NULL CHECK (threat_type IN ('manipulation_attempt', 'trust_fraud', 'ai_abuse', 'account_takeover', 'data_exfiltration', 'anomalous_behavior')),
    severity_level TEXT NOT NULL CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
    target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    source_ip INET,
    threat_indicators JSONB NOT NULL,
    confidence_score DECIMAL(5,4) NOT NULL,
    status TEXT DEFAULT 'detected' CHECK (status IN ('detected', 'investigating', 'confirmed', 'false_positive', 'resolved')),
    automatic_action_taken TEXT,
    investigation_notes TEXT,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Fraud Detection Rules - configurable detection patterns
CREATE TABLE IF NOT EXISTS fraud_detection_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name TEXT NOT NULL UNIQUE,
    rule_description TEXT NOT NULL,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('pattern_matching', 'statistical_anomaly', 'machine_learning', 'behavioral_analysis')),
    rule_configuration JSONB NOT NULL,
    threshold_values JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    severity_if_triggered TEXT NOT NULL CHECK (severity_if_triggered IN ('low', 'medium', 'high', 'critical')),
    automatic_actions TEXT[] DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Security Event Log - comprehensive security event tracking
CREATE TABLE IF NOT EXISTS security_event_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    event_category TEXT NOT NULL CHECK (event_category IN ('authentication', 'authorization', 'data_access', 'ai_interaction', 'trust_manipulation', 'system_security')),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_data JSONB NOT NULL,
    risk_assessment JSONB,
    source_ip INET,
    user_agent TEXT,
    session_id TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ================================================================================
-- INDEXES FOR PERFORMANCE
-- ================================================================================

-- AI Orchestration indexes
CREATE INDEX IF NOT EXISTS idx_ai_orchestration_requests_user_status ON ai_orchestration_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_orchestration_requests_type_strategy ON ai_orchestration_requests(request_type, routing_strategy);
CREATE INDEX IF NOT EXISTS idx_ai_provider_responses_orchestration ON ai_provider_responses(orchestration_request_id);
CREATE INDEX IF NOT EXISTS idx_ai_routing_analytics_provider_type ON ai_routing_analytics(provider_name, request_type);

-- AI Memory indexes
CREATE INDEX IF NOT EXISTS idx_ai_conversation_memory_user_conversation ON ai_conversation_memory(user_id, conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_memory_session ON ai_conversation_memory(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_memory_created ON ai_conversation_memory(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_graph_user_type ON ai_knowledge_graph(user_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_graph_entity_name ON ai_knowledge_graph(entity_name);

-- Agent Collaboration indexes
CREATE INDEX IF NOT EXISTS idx_agent_collaboration_sessions_status ON agent_collaboration_sessions(session_status);
CREATE INDEX IF NOT EXISTS idx_agent_collaboration_sessions_user ON agent_collaboration_sessions(initiator_user_id);
CREATE INDEX IF NOT EXISTS idx_agent_task_assignments_session_agent ON agent_task_assignments(collaboration_session_id, agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_task_assignments_status ON agent_task_assignments(task_status);
CREATE INDEX IF NOT EXISTS idx_agent_communication_log_session ON agent_communication_log(collaboration_session_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_agent ON agent_performance_metrics(agent_name);

-- Security indexes
CREATE INDEX IF NOT EXISTS idx_user_behavior_analytics_user_type ON user_behavior_analytics(user_id, behavior_type);
CREATE INDEX IF NOT EXISTS idx_user_behavior_analytics_timestamp ON user_behavior_analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_behavior_analytics_risk_score ON user_behavior_analytics(risk_score);
CREATE INDEX IF NOT EXISTS idx_security_threat_detection_severity_status ON security_threat_detection(severity_level, status);
CREATE INDEX IF NOT EXISTS idx_security_threat_detection_user ON security_threat_detection(target_user_id);
CREATE INDEX IF NOT EXISTS idx_security_threat_detection_detected ON security_threat_detection(detected_at);
CREATE INDEX IF NOT EXISTS idx_fraud_detection_rules_active ON fraud_detection_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_security_event_log_user_category ON security_event_log(user_id, event_category);
CREATE INDEX IF NOT EXISTS idx_security_event_log_timestamp ON security_event_log(timestamp);

-- ================================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================================

-- Enable RLS on all tables
ALTER TABLE ai_orchestration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_provider_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_routing_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversation_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_knowledge_graph ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_memory_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_collaboration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_communication_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavior_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_threat_detection ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_detection_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_event_log ENABLE ROW LEVEL SECURITY;

-- AI Orchestration RLS Policies
CREATE POLICY "Users can view their own orchestration requests" ON ai_orchestration_requests
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create orchestration requests" ON ai_orchestration_requests
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all orchestration data" ON ai_orchestration_requests
    FOR ALL TO service_role USING (true);

CREATE POLICY "Service role can manage provider responses" ON ai_provider_responses
    FOR ALL TO service_role USING (true);

CREATE POLICY "Admins can view routing analytics" ON ai_routing_analytics
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- AI Memory RLS Policies
CREATE POLICY "Users can manage their own conversation memory" ON ai_conversation_memory
    FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own knowledge graph" ON ai_knowledge_graph
    FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own memory analytics" ON ai_memory_analytics
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all memory data" ON ai_conversation_memory
    FOR ALL TO service_role USING (true);

CREATE POLICY "Service role can manage knowledge graph" ON ai_knowledge_graph
    FOR ALL TO service_role USING (true);

-- Agent Collaboration RLS Policies
CREATE POLICY "Users can view collaboration sessions they initiated" ON agent_collaboration_sessions
    FOR SELECT TO authenticated USING (auth.uid() = initiator_user_id);

CREATE POLICY "Users can create collaboration sessions" ON agent_collaboration_sessions
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = initiator_user_id);

CREATE POLICY "Service role can manage all collaboration data" ON agent_collaboration_sessions
    FOR ALL TO service_role USING (true);

CREATE POLICY "Service role can manage task assignments" ON agent_task_assignments
    FOR ALL TO service_role USING (true);

CREATE POLICY "Service role can manage communication log" ON agent_communication_log
    FOR ALL TO service_role USING (true);

CREATE POLICY "Admins can view performance metrics" ON agent_performance_metrics
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- Security RLS Policies
CREATE POLICY "Users can view their own behavior analytics" ON user_behavior_analytics
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all behavior data" ON user_behavior_analytics
    FOR ALL TO service_role USING (true);

CREATE POLICY "Security admins can manage threat detection" ON security_threat_detection
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

CREATE POLICY "Security admins can manage fraud rules" ON fraud_detection_rules
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

CREATE POLICY "Security admins can view security events" ON security_event_log
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

CREATE POLICY "Service role can manage all security data" ON security_threat_detection
    FOR ALL TO service_role USING (true);

CREATE POLICY "Service role can log security events" ON security_event_log
    FOR ALL TO service_role USING (true);

-- ================================================================================
-- SEED DEFAULT FRAUD DETECTION RULES
-- ================================================================================

INSERT INTO fraud_detection_rules (rule_name, rule_description, rule_type, rule_configuration, threshold_values, severity_if_triggered, automatic_actions) VALUES
('rapid_trust_score_increase', 'Detect abnormally rapid increases in trust scores', 'statistical_anomaly', 
'{"metric": "trust_score_change", "time_window": "1h", "threshold_type": "standard_deviation"}', 
'{"max_increase_per_hour": 0.5, "std_dev_multiplier": 3}', 
 'high', ARRAY['flag_for_review', 'temporary_score_freeze']),

('suspicious_ai_usage_pattern', 'Detect unusual AI interaction patterns', 'behavioral_analysis',
'{"metrics": ["request_frequency", "request_types", "response_quality"], "analysis_window": "24h"}',
'{"max_requests_per_hour": 100, "unusual_pattern_threshold": 0.8}',
 'medium', ARRAY['log_detailed_tracking']),

('trust_manipulation_attempt', 'Detect potential trust score manipulation', 'pattern_matching',
'{"patterns": ["circular_trust_giving", "bot_like_behavior", "coordinated_actions"]}',
'{"confidence_threshold": 0.7, "min_evidence_points": 3}',
 'critical', ARRAY['immediate_investigation', 'suspend_trust_actions']),

('account_takeover_indicators', 'Detect potential account takeover attempts', 'behavioral_analysis',
'{"factors": ["location_change", "device_change", "behavior_deviation", "rapid_setting_changes"]}',
'{"risk_score_threshold": 0.8, "immediate_action_threshold": 0.9}',
 'critical', ARRAY['require_additional_auth', 'lock_sensitive_actions'])

ON CONFLICT (rule_name) DO NOTHING;;