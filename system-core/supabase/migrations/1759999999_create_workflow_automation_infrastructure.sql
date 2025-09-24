-- TrustStream v4.2 - Workflow Automation Infrastructure
-- Creates tables and functions for automated governance workflows
-- Author: MiniMax Agent
-- Created: 2025-09-20

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create workflow automation rules table
CREATE TABLE IF NOT EXISTS workflow_automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(200) NOT NULL,
    rule_type VARCHAR(100) NOT NULL,
    trigger_conditions JSONB NOT NULL DEFAULT '{}',
    decision_logic JSONB NOT NULL DEFAULT '{}',
    actions JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    confidence_threshold DECIMAL(3,2) DEFAULT 0.70,
    escalation_rules JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    success_rate DECIMAL(5,2) DEFAULT 0.0,
    usage_count INTEGER DEFAULT 0,
    created_by UUID NOT NULL,
    last_modified_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_confidence_threshold CHECK (confidence_threshold >= 0.0 AND confidence_threshold <= 1.0),
    CONSTRAINT chk_success_rate CHECK (success_rate >= 0.0 AND success_rate <= 100.0),
    CONSTRAINT chk_usage_count CHECK (usage_count >= 0)
);

-- Create automated decisions history table
CREATE TABLE IF NOT EXISTS automated_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES agent_workflows(id),
    rule_id UUID REFERENCES workflow_automation_rules(id),
    trigger_data JSONB NOT NULL,
    decision_made JSONB NOT NULL,
    confidence_score DECIMAL(5,2) DEFAULT 0.0,
    human_override BOOLEAN DEFAULT false,
    outcome VARCHAR(100) DEFAULT 'pending',
    error_message TEXT,
    execution_time_ms INTEGER DEFAULT 0,
    user_id UUID,
    community_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_confidence_score CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    CONSTRAINT chk_execution_time CHECK (execution_time_ms >= 0),
    CONSTRAINT chk_outcome CHECK (outcome IN ('pending', 'success', 'failure', 'escalated', 'cancelled'))
);

-- Create policy automation executions table
CREATE TABLE IF NOT EXISTS policy_automation_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID,
    automation_type VARCHAR(100) NOT NULL,
    trigger_event JSONB NOT NULL,
    actions_taken JSONB NOT NULL DEFAULT '[]',
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    execution_time_ms INTEGER DEFAULT 0,
    compliance_checked BOOLEAN DEFAULT false,
    audit_trail JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_execution_time_policy CHECK (execution_time_ms >= 0)
);

-- Create automation performance metrics table
CREATE TABLE IF NOT EXISTS automation_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type VARCHAR(100) NOT NULL,
    metric_period VARCHAR(50) NOT NULL,
    total_decisions INTEGER DEFAULT 0,
    successful_decisions INTEGER DEFAULT 0,
    escalated_decisions INTEGER DEFAULT 0,
    avg_confidence DECIMAL(5,2) DEFAULT 0.0,
    avg_execution_time_ms INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.0,
    escalation_rate DECIMAL(5,2) DEFAULT 0.0,
    community_id UUID,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_total_decisions CHECK (total_decisions >= 0),
    CONSTRAINT chk_successful_decisions CHECK (successful_decisions >= 0),
    CONSTRAINT chk_escalated_decisions CHECK (escalated_decisions >= 0),
    CONSTRAINT chk_avg_confidence CHECK (avg_confidence >= 0.0 AND avg_confidence <= 1.0),
    CONSTRAINT chk_success_rate_metrics CHECK (success_rate >= 0.0 AND success_rate <= 100.0),
    CONSTRAINT chk_escalation_rate CHECK (escalation_rate >= 0.0 AND escalation_rate <= 100.0),
    CONSTRAINT chk_period_order CHECK (period_start <= period_end)
);

-- Create workflow automation logs table
CREATE TABLE IF NOT EXISTS workflow_automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_rule_id UUID REFERENCES workflow_automation_rules(id),
    workflow_id UUID REFERENCES agent_workflows(id),
    log_level VARCHAR(20) NOT NULL DEFAULT 'INFO',
    log_message TEXT NOT NULL,
    log_data JSONB DEFAULT '{}',
    user_id UUID,
    community_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_log_level CHECK (log_level IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'))
);

-- Alter existing agent_workflows table to add automation columns
ALTER TABLE agent_workflows 
ADD COLUMN IF NOT EXISTS automation_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS auto_trigger_conditions JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS success_criteria JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS escalation_rules JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS automation_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_automation_run TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS automation_success_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS automation_failure_count INTEGER DEFAULT 0;

-- Alter existing agent_coordination_sessions table to add automation columns
ALTER TABLE agent_coordination_sessions 
ADD COLUMN IF NOT EXISTS automation_level VARCHAR(50) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS decision_history JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS performance_metrics JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS auto_resolution_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS automation_confidence DECIMAL(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS escalation_triggered BOOLEAN DEFAULT false;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_automation_rules_type_active ON workflow_automation_rules(rule_type, is_active);
CREATE INDEX IF NOT EXISTS idx_automation_rules_created_at ON workflow_automation_rules(created_at);
CREATE INDEX IF NOT EXISTS idx_automated_decisions_workflow_id ON automated_decisions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_automated_decisions_rule_id ON automated_decisions(rule_id);
CREATE INDEX IF NOT EXISTS idx_automated_decisions_created_at ON automated_decisions(created_at);
CREATE INDEX IF NOT EXISTS idx_automated_decisions_outcome ON automated_decisions(outcome);
CREATE INDEX IF NOT EXISTS idx_automated_decisions_community ON automated_decisions(community_id);
CREATE INDEX IF NOT EXISTS idx_policy_executions_type_success ON policy_automation_executions(automation_type, success);
CREATE INDEX IF NOT EXISTS idx_policy_executions_created_at ON policy_automation_executions(created_at);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_period ON automation_performance_metrics(metric_period, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_automation_logs_level_created ON workflow_automation_logs(log_level, created_at);
CREATE INDEX IF NOT EXISTS idx_automation_logs_rule_id ON workflow_automation_logs(automation_rule_id);

-- Create functions for automation support

-- Function to update automation rule usage statistics
CREATE OR REPLACE FUNCTION update_automation_rule_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update usage count and success rate for the rule
    UPDATE workflow_automation_rules 
    SET 
        usage_count = usage_count + 1,
        success_rate = (
            SELECT COALESCE(
                (COUNT(*) FILTER (WHERE outcome = 'success') * 100.0 / COUNT(*)), 
                0
            )
            FROM automated_decisions 
            WHERE rule_id = NEW.rule_id
        ),
        updated_at = NOW()
    WHERE id = NEW.rule_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automation rule statistics
CREATE TRIGGER trigger_update_automation_rule_stats
    AFTER INSERT ON automated_decisions
    FOR EACH ROW
    EXECUTE FUNCTION update_automation_rule_stats();

-- Function to calculate automation performance metrics
CREATE OR REPLACE FUNCTION calculate_automation_metrics(
    p_period_hours INTEGER DEFAULT 24,
    p_community_id UUID DEFAULT NULL
)
RETURNS TABLE (
    total_decisions BIGINT,
    successful_decisions BIGINT,
    escalated_decisions BIGINT,
    avg_confidence NUMERIC,
    avg_execution_time NUMERIC,
    success_rate NUMERIC,
    escalation_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_decisions,
        COUNT(*) FILTER (WHERE outcome = 'success') as successful_decisions,
        COUNT(*) FILTER (WHERE outcome = 'escalated') as escalated_decisions,
        COALESCE(AVG(confidence_score), 0) as avg_confidence,
        COALESCE(AVG(execution_time_ms), 0) as avg_execution_time,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                (COUNT(*) FILTER (WHERE outcome = 'success') * 100.0 / COUNT(*))
            ELSE 0 
        END as success_rate,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                (COUNT(*) FILTER (WHERE outcome = 'escalated') * 100.0 / COUNT(*))
            ELSE 0 
        END as escalation_rate
    FROM automated_decisions
    WHERE 
        created_at >= NOW() - INTERVAL '1 hour' * p_period_hours
        AND (p_community_id IS NULL OR community_id = p_community_id);
END;
$$ LANGUAGE plpgsql;

-- Function to get automation rule performance
CREATE OR REPLACE FUNCTION get_rule_performance(p_rule_id UUID)
RETURNS TABLE (
    rule_name VARCHAR,
    usage_count BIGINT,
    success_count BIGINT,
    failure_count BIGINT,
    escalation_count BIGINT,
    avg_confidence NUMERIC,
    success_rate NUMERIC,
    last_used TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.rule_name,
        COUNT(d.id) as usage_count,
        COUNT(d.id) FILTER (WHERE d.outcome = 'success') as success_count,
        COUNT(d.id) FILTER (WHERE d.outcome = 'failure') as failure_count,
        COUNT(d.id) FILTER (WHERE d.outcome = 'escalated') as escalation_count,
        COALESCE(AVG(d.confidence_score), 0) as avg_confidence,
        CASE 
            WHEN COUNT(d.id) > 0 THEN 
                (COUNT(d.id) FILTER (WHERE d.outcome = 'success') * 100.0 / COUNT(d.id))
            ELSE 0 
        END as success_rate,
        MAX(d.created_at) as last_used
    FROM workflow_automation_rules r
    LEFT JOIN automated_decisions d ON r.id = d.rule_id
    WHERE r.id = p_rule_id
    GROUP BY r.id, r.rule_name;
END;
$$ LANGUAGE plpgsql;

-- Function to log automation events
CREATE OR REPLACE FUNCTION log_automation_event(
    p_rule_id UUID,
    p_workflow_id UUID,
    p_log_level VARCHAR,
    p_message TEXT,
    p_data JSONB DEFAULT '{}',
    p_user_id UUID DEFAULT NULL,
    p_community_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO workflow_automation_logs (
        automation_rule_id,
        workflow_id,
        log_level,
        log_message,
        log_data,
        user_id,
        community_id
    ) VALUES (
        p_rule_id,
        p_workflow_id,
        p_log_level,
        p_message,
        p_data,
        p_user_id,
        p_community_id
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old automation data
CREATE OR REPLACE FUNCTION cleanup_automation_data(p_retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Clean up old automated decisions
    DELETE FROM automated_decisions 
    WHERE created_at < NOW() - INTERVAL '1 day' * p_retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up old policy executions
    DELETE FROM policy_automation_executions 
    WHERE created_at < NOW() - INTERVAL '1 day' * p_retention_days;
    
    -- Clean up old logs (keep shorter retention for logs)
    DELETE FROM workflow_automation_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * (p_retention_days / 3);
    
    -- Clean up old performance metrics
    DELETE FROM automation_performance_metrics 
    WHERE calculated_at < NOW() - INTERVAL '1 day' * p_retention_days;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create RLS (Row Level Security) policies

-- Enable RLS on automation tables
ALTER TABLE workflow_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automated_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_automation_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for workflow_automation_rules
CREATE POLICY "Users can view active automation rules" ON workflow_automation_rules
    FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can create automation rules" ON workflow_automation_rules
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Rule creators can update their rules" ON workflow_automation_rules
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Admins can manage all automation rules" ON workflow_automation_rules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_app_meta_data->>'role' = 'admin'
        )
    );

-- RLS policies for automated_decisions
CREATE POLICY "Users can view their automated decisions" ON automated_decisions
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_app_meta_data->>'role' IN ('admin', 'moderator')
        )
    );

CREATE POLICY "System can insert automated decisions" ON automated_decisions
    FOR INSERT WITH CHECK (true);

-- RLS policies for policy_automation_executions
CREATE POLICY "Admins can view policy executions" ON policy_automation_executions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_app_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "System can insert policy executions" ON policy_automation_executions
    FOR INSERT WITH CHECK (true);

-- RLS policies for automation_performance_metrics
CREATE POLICY "Authenticated users can view performance metrics" ON automation_performance_metrics
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert performance metrics" ON automation_performance_metrics
    FOR INSERT WITH CHECK (true);

-- RLS policies for workflow_automation_logs
CREATE POLICY "Admins can view automation logs" ON workflow_automation_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_app_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "System can insert automation logs" ON workflow_automation_logs
    FOR INSERT WITH CHECK (true);

-- Insert default automation rules

-- Content moderation automation rule
INSERT INTO workflow_automation_rules (
    rule_name,
    rule_type,
    trigger_conditions,
    decision_logic,
    actions,
    confidence_threshold,
    created_by,
    metadata
) VALUES (
    'Basic Content Moderation',
    'content_moderation',
    '{"content_type": {"operator": "equals", "value": "post"}, "flagged_count": {"operator": "greater_than", "value": 2}}',
    '{"type": "rule_based", "rules": [{"condition": "flagged_count > 2", "action": "review", "confidence": 0.8, "priority": 1}]}',
    '[{"type": "review", "parameters": {"priority": "high"}, "requires_confirmation": false}]',
    0.75,
    '00000000-0000-0000-0000-000000000000',
    '{"category": "content_safety", "business_impact": "medium", "tags": ["moderation", "safety"]}'
) ON CONFLICT DO NOTHING;

-- Member onboarding automation rule
INSERT INTO workflow_automation_rules (
    rule_name,
    rule_type,
    trigger_conditions,
    decision_logic,
    actions,
    confidence_threshold,
    created_by,
    metadata
) VALUES (
    'Auto Member Approval',
    'member_management',
    '{"verification_score": {"operator": "greater_than", "value": 0.8}, "risk_flags": {"operator": "equals", "value": 0}}',
    '{"type": "rule_based", "rules": [{"condition": "verification_score > 0.8 AND risk_flags == 0", "action": "approve", "confidence": 0.9, "priority": 1}]}',
    '[{"type": "approve", "parameters": {"welcome_message": true}, "requires_confirmation": false}]',
    0.85,
    '00000000-0000-0000-0000-000000000000',
    '{"category": "member_management", "business_impact": "low", "tags": ["onboarding", "automation"]}'
) ON CONFLICT DO NOTHING;

-- Policy violation automation rule
INSERT INTO workflow_automation_rules (
    rule_name,
    rule_type,
    trigger_conditions,
    decision_logic,
    actions,
    confidence_threshold,
    created_by,
    metadata
) VALUES (
    'Policy Violation Response',
    'policy_enforcement',
    '{"violation_severity": {"operator": "equals", "value": "minor"}, "repeat_offender": {"operator": "equals", "value": false}}',
    '{"type": "rule_based", "rules": [{"condition": "violation_severity == minor AND repeat_offender == false", "action": "warn", "confidence": 0.85, "priority": 1}]}',
    '[{"type": "notify", "parameters": {"message": "warning", "escalate_after": "3_violations"}, "requires_confirmation": false}]',
    0.80,
    '00000000-0000-0000-0000-000000000000',
    '{"category": "policy_enforcement", "business_impact": "medium", "tags": ["policy", "enforcement"]}'
) ON CONFLICT DO NOTHING;

-- Create views for easier automation monitoring

-- View for automation dashboard
CREATE OR REPLACE VIEW automation_dashboard AS
SELECT 
    COUNT(*) FILTER (WHERE is_active = true) as active_rules,
    COUNT(*) as total_rules,
    COUNT(DISTINCT rule_type) as rule_types,
    AVG(confidence_threshold) as avg_confidence_threshold,
    AVG(success_rate) as avg_success_rate,
    SUM(usage_count) as total_usage
FROM workflow_automation_rules;

-- View for recent automation activity
CREATE OR REPLACE VIEW recent_automation_activity AS
SELECT 
    ad.id,
    ad.created_at,
    wr.rule_name,
    wr.rule_type,
    ad.outcome,
    ad.confidence_score,
    ad.human_override,
    ad.execution_time_ms
FROM automated_decisions ad
JOIN workflow_automation_rules wr ON ad.rule_id = wr.id
WHERE ad.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY ad.created_at DESC;

-- View for rule performance summary
CREATE OR REPLACE VIEW rule_performance_summary AS
SELECT 
    wr.id as rule_id,
    wr.rule_name,
    wr.rule_type,
    wr.is_active,
    wr.confidence_threshold,
    wr.usage_count,
    wr.success_rate,
    COUNT(ad.id) as recent_usage,
    COUNT(ad.id) FILTER (WHERE ad.outcome = 'success') as recent_successes,
    AVG(ad.confidence_score) as avg_recent_confidence,
    MAX(ad.created_at) as last_used
FROM workflow_automation_rules wr
LEFT JOIN automated_decisions ad ON wr.id = ad.rule_id 
    AND ad.created_at >= NOW() - INTERVAL '7 days'
GROUP BY wr.id, wr.rule_name, wr.rule_type, wr.is_active, 
         wr.confidence_threshold, wr.usage_count, wr.success_rate
ORDER BY wr.usage_count DESC;

-- Add comments for documentation
COMMENT ON TABLE workflow_automation_rules IS 'Stores automation rules for governance workflows';
COMMENT ON TABLE automated_decisions IS 'Logs all automated decisions made by the system';
COMMENT ON TABLE policy_automation_executions IS 'Tracks policy-driven automation executions';
COMMENT ON TABLE automation_performance_metrics IS 'Stores calculated performance metrics for automation';
COMMENT ON TABLE workflow_automation_logs IS 'Detailed logs for automation debugging and monitoring';

COMMENT ON FUNCTION calculate_automation_metrics IS 'Calculates automation performance metrics for a given time period';
COMMENT ON FUNCTION get_rule_performance IS 'Gets detailed performance statistics for a specific automation rule';
COMMENT ON FUNCTION log_automation_event IS 'Logs automation events for debugging and monitoring';
COMMENT ON FUNCTION cleanup_automation_data IS 'Cleans up old automation data based on retention policy';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;