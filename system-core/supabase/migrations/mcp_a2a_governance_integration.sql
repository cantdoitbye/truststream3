-- MCP/A2A Governance Integration Database Migration
-- Migration: Create MCP governance integration tables and enhance existing schemas
-- Date: 2025-09-20
-- Version: 1.0.0

-- Begin transaction
BEGIN;

-- Create governance contexts table for shared state management
CREATE TABLE IF NOT EXISTS governance_contexts (
    context_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_type VARCHAR(50) NOT NULL CHECK (context_type IN ('decision', 'policy', 'standard', 'metric', 'audit', 'accountability_action', 'bias_analysis', 'error_context')),
    source_agent VARCHAR(100) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    data JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    scope TEXT[] DEFAULT '{}',
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    expiration TIMESTAMPTZ,
    dependencies TEXT[] DEFAULT '{}',
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create governance decision sessions for coordination
CREATE TABLE IF NOT EXISTS governance_decision_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL,
    proposer_agent VARCHAR(100) NOT NULL,
    session_type VARCHAR(50) NOT NULL DEFAULT 'consensus',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'failed', 'timeout')),
    participants TEXT[] DEFAULT '{}',
    required_approvals JSONB NOT NULL DEFAULT '{}',
    votes JSONB DEFAULT '[]',
    consensus_reached BOOLEAN DEFAULT FALSE,
    decision_data JSONB DEFAULT '{}',
    execution_result JSONB,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    deadline TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create inter-agent communication logs
CREATE TABLE IF NOT EXISTS governance_communications (
    communication_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_agent VARCHAR(100) NOT NULL,
    target_agent VARCHAR(100) NOT NULL,
    message_type VARCHAR(50) NOT NULL DEFAULT 'request',
    protocol VARCHAR(50) DEFAULT 'mcp-governance',
    content JSONB NOT NULL,
    context_id UUID REFERENCES governance_contexts(context_id) ON DELETE SET NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'normal', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'processed', 'failed', 'timeout')),
    acknowledgment JSONB,
    response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ
);

-- Create governance workflow executions
CREATE TABLE IF NOT EXISTS governance_workflow_executions (
    execution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id VARCHAR(100) NOT NULL,
    workflow_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'timeout')),
    context JSONB DEFAULT '{}',
    current_step INTEGER DEFAULT 0,
    total_steps INTEGER DEFAULT 0,
    steps_results JSONB DEFAULT '[]',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    execution_summary JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create governance coordination sessions
CREATE TABLE IF NOT EXISTS governance_coordination_sessions (
    coordination_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coordination_type VARCHAR(50) NOT NULL DEFAULT 'consensus',
    initiator_agent VARCHAR(100) NOT NULL,
    participants TEXT[] NOT NULL DEFAULT '{}',
    proposal JSONB,
    responses JSONB DEFAULT '[]',
    result JSONB,
    consensus_reached BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    deadline TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create cross-agent learning patterns
CREATE TABLE IF NOT EXISTS governance_learning_patterns (
    pattern_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_type VARCHAR(50) NOT NULL,
    source_agents TEXT[] NOT NULL,
    target_agents TEXT[] NOT NULL,
    correlation_score DECIMAL(5,4),
    pattern_data JSONB NOT NULL,
    actionable BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    applied BOOLEAN DEFAULT FALSE,
    effectiveness_score DECIMAL(5,4),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    applied_at TIMESTAMPTZ
);

-- Create governance events table
CREATE TABLE IF NOT EXISTS governance_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    category VARCHAR(50) DEFAULT 'governance',
    source_agent VARCHAR(100) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    data JSONB NOT NULL,
    recipients TEXT[] DEFAULT '{}',
    acknowledgment_required BOOLEAN DEFAULT FALSE,
    acknowledgments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create governance metrics table
CREATE TABLE IF NOT EXISTS governance_metrics (
    metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type VARCHAR(50) NOT NULL,
    source_agent VARCHAR(100) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    values JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhance existing agent_registry table with MCP capabilities
DO $$
BEGIN
    -- Add MCP capability columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_registry' AND column_name = 'mcp_capabilities') THEN
        ALTER TABLE agent_registry ADD COLUMN mcp_capabilities JSONB DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_registry' AND column_name = 'governance_role') THEN
        ALTER TABLE agent_registry ADD COLUMN governance_role VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_registry' AND column_name = 'communication_protocols') THEN
        ALTER TABLE agent_registry ADD COLUMN communication_protocols TEXT[] DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_registry' AND column_name = 'last_mcp_heartbeat') THEN
        ALTER TABLE agent_registry ADD COLUMN last_mcp_heartbeat TIMESTAMPTZ;
    END IF;
END $$;

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_governance_contexts_type ON governance_contexts(context_type);
CREATE INDEX IF NOT EXISTS idx_governance_contexts_agent ON governance_contexts(source_agent);
CREATE INDEX IF NOT EXISTS idx_governance_contexts_timestamp ON governance_contexts(timestamp);
CREATE INDEX IF NOT EXISTS idx_governance_contexts_priority ON governance_contexts(priority);
CREATE INDEX IF NOT EXISTS idx_governance_contexts_expiration ON governance_contexts(expiration) WHERE expiration IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_governance_communications_agents ON governance_communications(source_agent, target_agent);
CREATE INDEX IF NOT EXISTS idx_governance_communications_timestamp ON governance_communications(created_at);
CREATE INDEX IF NOT EXISTS idx_governance_communications_status ON governance_communications(status);
CREATE INDEX IF NOT EXISTS idx_governance_communications_priority ON governance_communications(priority);
CREATE INDEX IF NOT EXISTS idx_governance_communications_context ON governance_communications(context_id) WHERE context_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_governance_decision_sessions_status ON governance_decision_sessions(status);
CREATE INDEX IF NOT EXISTS idx_governance_decision_sessions_proposer ON governance_decision_sessions(proposer_agent);
CREATE INDEX IF NOT EXISTS idx_governance_decision_sessions_timestamp ON governance_decision_sessions(created_at);

CREATE INDEX IF NOT EXISTS idx_governance_workflow_status ON governance_workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_governance_workflow_id ON governance_workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_governance_workflow_timestamp ON governance_workflow_executions(created_at);

CREATE INDEX IF NOT EXISTS idx_governance_coordination_type ON governance_coordination_sessions(coordination_type);
CREATE INDEX IF NOT EXISTS idx_governance_coordination_initiator ON governance_coordination_sessions(initiator_agent);
CREATE INDEX IF NOT EXISTS idx_governance_coordination_timestamp ON governance_coordination_sessions(created_at);

CREATE INDEX IF NOT EXISTS idx_governance_learning_correlation ON governance_learning_patterns(correlation_score);
CREATE INDEX IF NOT EXISTS idx_governance_learning_actionable ON governance_learning_patterns(actionable);
CREATE INDEX IF NOT EXISTS idx_governance_learning_applied ON governance_learning_patterns(applied);

CREATE INDEX IF NOT EXISTS idx_governance_events_type ON governance_events(event_type);
CREATE INDEX IF NOT EXISTS idx_governance_events_source ON governance_events(source_agent);
CREATE INDEX IF NOT EXISTS idx_governance_events_timestamp ON governance_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_governance_events_severity ON governance_events(severity);

CREATE INDEX IF NOT EXISTS idx_governance_metrics_type ON governance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_governance_metrics_source ON governance_metrics(source_agent);
CREATE INDEX IF NOT EXISTS idx_governance_metrics_timestamp ON governance_metrics(timestamp);

CREATE INDEX IF NOT EXISTS idx_agent_registry_governance ON agent_registry(governance_role) WHERE governance_role IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_registry_mcp_heartbeat ON agent_registry(last_mcp_heartbeat) WHERE last_mcp_heartbeat IS NOT NULL;

-- Create functions for governance context management
CREATE OR REPLACE FUNCTION update_governance_context_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_governance_contexts_timestamp ON governance_contexts;
CREATE TRIGGER update_governance_contexts_timestamp
    BEFORE UPDATE ON governance_contexts
    FOR EACH ROW
    EXECUTE FUNCTION update_governance_context_timestamp();

-- Function to clean up expired contexts
CREATE OR REPLACE FUNCTION cleanup_expired_governance_contexts()
RETURNS INTEGER AS $$
DECLARE
    cleanup_count INTEGER;
BEGIN
    DELETE FROM governance_contexts 
    WHERE expiration IS NOT NULL AND expiration < NOW();
    
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get governance agent statistics
CREATE OR REPLACE FUNCTION get_governance_agent_stats()
RETURNS TABLE (
    total_agents INTEGER,
    active_agents INTEGER,
    governance_agents INTEGER,
    mcp_enabled_agents INTEGER,
    last_update TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_agents,
        COUNT(CASE WHEN current_status = 'active' THEN 1 END)::INTEGER as active_agents,
        COUNT(CASE WHEN governance_role IS NOT NULL THEN 1 END)::INTEGER as governance_agents,
        COUNT(CASE WHEN mcp_capabilities IS NOT NULL AND mcp_capabilities != '{}' THEN 1 END)::INTEGER as mcp_enabled_agents,
        NOW() as last_update
    FROM agent_registry;
END;
$$ LANGUAGE plpgsql;

-- Function to get governance communication metrics
CREATE OR REPLACE FUNCTION get_governance_communication_metrics(timeframe_hours INTEGER DEFAULT 24)
RETURNS TABLE (
    total_communications INTEGER,
    successful_communications INTEGER,
    failed_communications INTEGER,
    average_response_time_ms INTEGER,
    communications_by_priority JSONB
) AS $$
DECLARE
    start_time TIMESTAMPTZ;
BEGIN
    start_time := NOW() - (timeframe_hours || ' hours')::INTERVAL;
    
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_communications,
        COUNT(CASE WHEN status IN ('delivered', 'processed') THEN 1 END)::INTEGER as successful_communications,
        COUNT(CASE WHEN status IN ('failed', 'timeout') THEN 1 END)::INTEGER as failed_communications,
        COALESCE(AVG(EXTRACT(EPOCH FROM (responded_at - created_at)) * 1000)::INTEGER, 0) as average_response_time_ms,
        json_build_object(
            'low', COUNT(CASE WHEN priority = 'low' THEN 1 END),
            'normal', COUNT(CASE WHEN priority IN ('normal', 'medium') THEN 1 END),
            'high', COUNT(CASE WHEN priority = 'high' THEN 1 END),
            'critical', COUNT(CASE WHEN priority = 'critical' THEN 1 END)
        ) as communications_by_priority
    FROM governance_communications
    WHERE created_at >= start_time;
END;
$$ LANGUAGE plpgsql;

-- Function to get governance decision effectiveness
CREATE OR REPLACE FUNCTION get_governance_decision_effectiveness(timeframe_hours INTEGER DEFAULT 168)
RETURNS TABLE (
    total_sessions INTEGER,
    successful_sessions INTEGER,
    consensus_rate DECIMAL(5,4),
    average_duration_minutes INTEGER,
    sessions_by_type JSONB
) AS $$
DECLARE
    start_time TIMESTAMPTZ;
BEGIN
    start_time := NOW() - (timeframe_hours || ' hours')::INTERVAL;
    
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_sessions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::INTEGER as successful_sessions,
        CASE 
            WHEN COUNT(*) > 0 THEN COUNT(CASE WHEN consensus_reached THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL
            ELSE 0::DECIMAL
        END as consensus_rate,
        COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 60)::INTEGER, 0) as average_duration_minutes,
        (
            SELECT json_object_agg(session_type, type_count)
            FROM (
                SELECT session_type, COUNT(*) as type_count
                FROM governance_decision_sessions
                WHERE created_at >= start_time
                GROUP BY session_type
            ) type_stats
        ) as sessions_by_type
    FROM governance_decision_sessions
    WHERE created_at >= start_time;
END;
$$ LANGUAGE plpgsql;

-- Create views for governance monitoring
CREATE OR REPLACE VIEW governance_agent_activity AS
SELECT 
    ar.agent_id,
    ar.agent_name,
    ar.governance_role,
    ar.current_status,
    ar.last_mcp_heartbeat,
    COUNT(gc.communication_id) as recent_communications,
    COUNT(gds.session_id) as recent_decision_sessions,
    COUNT(CASE WHEN gc.status = 'failed' THEN 1 END) as failed_communications
FROM agent_registry ar
LEFT JOIN governance_communications gc ON (ar.agent_id = gc.source_agent OR ar.agent_id = gc.target_agent)
    AND gc.created_at >= NOW() - INTERVAL '24 hours'
LEFT JOIN governance_decision_sessions gds ON ar.agent_id = gds.proposer_agent
    AND gds.created_at >= NOW() - INTERVAL '24 hours'
WHERE ar.governance_role IS NOT NULL
GROUP BY ar.agent_id, ar.agent_name, ar.governance_role, ar.current_status, ar.last_mcp_heartbeat;

-- Create view for governance context overview
CREATE OR REPLACE VIEW governance_context_overview AS
SELECT 
    context_type,
    COUNT(*) as total_contexts,
    COUNT(CASE WHEN expiration IS NULL OR expiration > NOW() THEN 1 END) as active_contexts,
    COUNT(CASE WHEN priority = 'critical' THEN 1 END) as critical_contexts,
    AVG(EXTRACT(EPOCH FROM (NOW() - timestamp)) / 3600) as avg_age_hours,
    array_agg(DISTINCT source_agent) as contributing_agents
FROM governance_contexts
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY context_type;

-- Update existing governance agents with MCP capabilities
UPDATE agent_registry 
SET 
    mcp_capabilities = jsonb_build_object(
        'protocols', ARRAY['governance-context', 'governance-decision', 'governance-event'],
        'version', '1.0.0',
        'governance_specializations', CASE governance_role
            WHEN 'accountability_agent' THEN ARRAY['ethics_monitoring', 'responsibility_tracking', 'bias_detection']
            WHEN 'quality_agent' THEN ARRAY['quality_assessment', 'standards_enforcement', 'performance_monitoring']
            WHEN 'transparency_agent' THEN ARRAY['audit_trails', 'decision_transparency', 'reporting']
            WHEN 'efficiency_agent' THEN ARRAY['performance_optimization', 'resource_allocation', 'learning_acceleration']
            WHEN 'innovation_agent' THEN ARRAY['innovation_evaluation', 'technology_assessment', 'strategic_planning']
            ELSE ARRAY['general_governance']
        END,
        'coordination_patterns', ARRAY['consensus', 'collaboration', 'escalation'],
        'context_types', ARRAY['decision', 'policy', 'standard', 'metric', 'audit']
    ),
    communication_protocols = ARRAY['governance-context', 'governance-decision', 'governance-event'],
    last_mcp_heartbeat = NOW()
WHERE agent_type IN ('accountability_agent', 'quality_agent', 'transparency_agent', 'efficiency_agent', 'innovation_agent')
   OR governance_role IS NOT NULL;

-- Insert initial governance workflow templates
INSERT INTO governance_workflow_executions (workflow_id, workflow_name, status, context, total_steps)
VALUES 
    ('comprehensive_governance_assessment', 'Comprehensive Governance Assessment', 'pending', 
     '{"type": "template", "description": "Complete governance evaluation across all dimensions"}', 6),
    ('ethics_violation_response', 'Ethics Violation Response Protocol', 'pending',
     '{"type": "template", "description": "Standardized response to ethics violations"}', 4),
    ('cross_agent_learning_sync', 'Cross-Agent Learning Synchronization', 'pending',
     '{"type": "template", "description": "Coordinate learning across governance agents"}', 3)
ON CONFLICT (workflow_id) DO NOTHING;

-- Create sample governance contexts for testing
INSERT INTO governance_contexts (context_type, source_agent, data, metadata, scope, priority)
VALUES 
    ('policy', 'system_admin', 
     '{"policy_name": "governance_coordination_policy", "version": "1.0", "effective_date": "2025-09-20"}',
     '{"description": "Initial governance coordination policy"}',
     ARRAY['all_governance_agents'], 'high'),
    ('standard', 'quality_agent',
     '{"standard_name": "mcp_communication_standard", "version": "1.0", "requirements": ["message_authentication", "response_timeout", "error_handling"]}',
     '{"description": "Standard for MCP communication between governance agents"}',
     ARRAY['all_governance_agents'], 'medium')
ON CONFLICT DO NOTHING;

-- Create RLS (Row Level Security) policies for governance tables
ALTER TABLE governance_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_decision_sessions ENABLE ROW LEVEL SECURITY;

-- Policy for governance agents to access their own contexts
CREATE POLICY governance_context_agent_access ON governance_contexts
    FOR ALL TO authenticated
    USING (
        source_agent = current_setting('app.current_agent_id', true) OR
        current_setting('app.current_agent_id', true) = ANY(scope) OR
        (permissions->>'read')::jsonb ? current_setting('app.current_agent_id', true) OR
        (permissions->>'read')::jsonb ? '*'
    );

-- Policy for governance communications
CREATE POLICY governance_communication_agent_access ON governance_communications
    FOR ALL TO authenticated
    USING (
        source_agent = current_setting('app.current_agent_id', true) OR
        target_agent = current_setting('app.current_agent_id', true)
    );

-- Policy for governance decision sessions
CREATE POLICY governance_decision_agent_access ON governance_decision_sessions
    FOR ALL TO authenticated
    USING (
        proposer_agent = current_setting('app.current_agent_id', true) OR
        current_setting('app.current_agent_id', true) = ANY(participants)
    );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Create notification function for real-time updates
CREATE OR REPLACE FUNCTION notify_governance_event()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'governance_events',
        json_build_object(
            'table', TG_TABLE_NAME,
            'action', TG_OP,
            'id', NEW.context_id
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for real-time notifications
DROP TRIGGER IF EXISTS governance_context_notify ON governance_contexts;
CREATE TRIGGER governance_context_notify
    AFTER INSERT OR UPDATE ON governance_contexts
    FOR EACH ROW
    EXECUTE FUNCTION notify_governance_event();

DROP TRIGGER IF EXISTS governance_communication_notify ON governance_communications;
CREATE TRIGGER governance_communication_notify
    AFTER INSERT OR UPDATE ON governance_communications
    FOR EACH ROW
    EXECUTE FUNCTION notify_governance_event();

-- Commit transaction
COMMIT;

-- Verify migration success
DO $$
DECLARE
    table_count INTEGER;
    index_count INTEGER;
    function_count INTEGER;
BEGIN
    -- Check tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'governance_contexts', 'governance_communications', 'governance_decision_sessions',
        'governance_workflow_executions', 'governance_coordination_sessions',
        'governance_learning_patterns', 'governance_events', 'governance_metrics'
    );
    
    -- Check indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname LIKE 'idx_governance_%';
    
    -- Check functions
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name IN (
        'cleanup_expired_governance_contexts',
        'get_governance_agent_stats',
        'get_governance_communication_metrics',
        'get_governance_decision_effectiveness'
    );
    
    RAISE NOTICE 'Migration verification:';
    RAISE NOTICE 'Tables created: % of 8 expected', table_count;
    RAISE NOTICE 'Indexes created: % governance indexes', index_count;
    RAISE NOTICE 'Functions created: % of 4 expected', function_count;
    
    IF table_count = 8 AND function_count = 4 THEN
        RAISE NOTICE 'MCP/A2A Governance Integration migration completed successfully!';
    ELSE
        RAISE WARNING 'Migration may be incomplete. Please verify manually.';
    END IF;
END $$;
