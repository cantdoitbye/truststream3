-- AI Leader Accountability Agent Schema
-- Database migration for accountability tracking, ethics monitoring, and governance
-- Created: 2025-09-20 15:12:08

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table for tracking responsibility assignments
CREATE TABLE IF NOT EXISTS responsibility_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id VARCHAR(255) UNIQUE NOT NULL,
    action_id VARCHAR(255) NOT NULL,
    responsible_agent VARCHAR(255) NOT NULL,
    assigned_by VARCHAR(255) NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scope JSONB NOT NULL DEFAULT '{}',
    accountability JSONB NOT NULL DEFAULT '{}',
    delegation JSONB,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'transferred', 'escalated', 'cancelled')),
    escalation JSONB NOT NULL DEFAULT '{}',
    completed_at TIMESTAMP WITH TIME ZONE,
    outcome JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for accountability metrics tracking
CREATE TABLE IF NOT EXISTS accountability_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    responsibility_metrics JSONB NOT NULL DEFAULT '{}',
    ethics_metrics JSONB NOT NULL DEFAULT '{}',
    bias_metrics JSONB NOT NULL DEFAULT '{}',
    governance_metrics JSONB NOT NULL DEFAULT '{}',
    overall_score DECIMAL(3,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for ethics compliance reports
CREATE TABLE IF NOT EXISTS ethics_compliance_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id VARCHAR(255) UNIQUE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    framework VARCHAR(255) NOT NULL DEFAULT 'truststream-ethics-v1',
    principles JSONB NOT NULL DEFAULT '[]',
    violations JSONB NOT NULL DEFAULT '[]',
    compliance JSONB NOT NULL DEFAULT '{}',
    score DECIMAL(3,2) DEFAULT 0.0,
    status VARCHAR(50) DEFAULT 'compliant' CHECK (status IN ('compliant', 'non-compliant', 'under-review')),
    recommendations JSONB DEFAULT '[]',
    remediation JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for ethics violations tracking
CREATE TABLE IF NOT EXISTS ethics_violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    violation_id VARCHAR(255) UNIQUE NOT NULL,
    principle VARCHAR(255) NOT NULL,
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    context JSONB NOT NULL DEFAULT '{}',
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reported_by VARCHAR(255) NOT NULL,
    investigation JSONB DEFAULT '{}',
    resolution JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'reported' CHECK (status IN ('reported', 'investigating', 'resolved', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for bias analysis results
CREATE TABLE IF NOT EXISTS bias_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id VARCHAR(255) UNIQUE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    context JSONB NOT NULL DEFAULT '{}',
    detected BOOLEAN DEFAULT false,
    severity VARCHAR(50) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    types JSONB DEFAULT '[]',
    metrics JSONB DEFAULT '[]',
    evidence JSONB DEFAULT '[]',
    impact JSONB DEFAULT '{}',
    mitigation JSONB DEFAULT '{}',
    recommendations JSONB DEFAULT '[]',
    target_agent_type VARCHAR(255),
    target_agent_instance_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for enforcement results
CREATE TABLE IF NOT EXISTS enforcement_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enforcement_id VARCHAR(255) UNIQUE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scope VARCHAR(255) NOT NULL,
    violations JSONB NOT NULL DEFAULT '[]',
    actions JSONB NOT NULL DEFAULT '[]',
    outcomes JSONB NOT NULL DEFAULT '[]',
    effectiveness DECIMAL(3,2) DEFAULT 0.0,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'successful', 'partial', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for escalation results
CREATE TABLE IF NOT EXISTS escalation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escalation_id VARCHAR(255) UNIQUE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    issues JSONB NOT NULL DEFAULT '[]',
    escalations JSONB NOT NULL DEFAULT '[]',
    resolutions JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'in-progress' CHECK (status IN ('in-progress', 'resolved', 'pending', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for comprehensive accountability reports
CREATE TABLE IF NOT EXISTS accountability_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id VARCHAR(255) UNIQUE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    summary JSONB NOT NULL DEFAULT '{}',
    metrics JSONB NOT NULL DEFAULT '{}',
    ethics JSONB NOT NULL DEFAULT '{}',
    bias JSONB NOT NULL DEFAULT '{}',
    enforcement JSONB NOT NULL DEFAULT '{}',
    improvements JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for governance audits
CREATE TABLE IF NOT EXISTS governance_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id VARCHAR(255) UNIQUE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scope VARCHAR(255) NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    decisions JSONB NOT NULL DEFAULT '[]',
    compliance JSONB NOT NULL DEFAULT '{}',
    accountability JSONB NOT NULL DEFAULT '{}',
    findings JSONB NOT NULL DEFAULT '[]',
    recommendations JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for governance decisions (if not exists)
CREATE TABLE IF NOT EXISTS governance_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    decision_id VARCHAR(255) UNIQUE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    decision_type VARCHAR(100),
    priority VARCHAR(50) CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    impact VARCHAR(50) CHECK (impact IN ('minimal', 'moderate', 'significant', 'major')),
    stakeholders JSONB DEFAULT '[]',
    decision_data JSONB DEFAULT '{}',
    outcome JSONB DEFAULT '{}',
    made_by VARCHAR(255),
    made_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for governance actions (if not exists)
CREATE TABLE IF NOT EXISTS governance_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_id VARCHAR(255) UNIQUE,
    action_type VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    description TEXT NOT NULL,
    priority VARCHAR(50) CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    impact VARCHAR(50) CHECK (impact IN ('minimal', 'moderate', 'significant', 'major')),
    stakeholders JSONB DEFAULT '[]',
    requirements JSONB DEFAULT '[]',
    constraints JSONB DEFAULT '[]',
    timeline JSONB DEFAULT '{}',
    can_delegate BOOLEAN DEFAULT false,
    requires_approval BOOLEAN DEFAULT false,
    compliance_requirements JSONB DEFAULT '[]',
    initiated_by VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for agent outputs (if not exists)
CREATE TABLE IF NOT EXISTS agent_outputs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_type VARCHAR(255) NOT NULL,
    agent_instance_id VARCHAR(255),
    output_type VARCHAR(100),
    output_data JSONB NOT NULL DEFAULT '{}',
    context JSONB DEFAULT '{}',
    quality_score DECIMAL(3,2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_responsibility_assignments_agent ON responsibility_assignments(responsible_agent);
CREATE INDEX IF NOT EXISTS idx_responsibility_assignments_status ON responsibility_assignments(status);
CREATE INDEX IF NOT EXISTS idx_responsibility_assignments_assigned_at ON responsibility_assignments(assigned_at);

CREATE INDEX IF NOT EXISTS idx_accountability_metrics_timestamp ON accountability_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_accountability_metrics_period ON accountability_metrics(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_ethics_compliance_reports_timestamp ON ethics_compliance_reports(timestamp);
CREATE INDEX IF NOT EXISTS idx_ethics_compliance_reports_status ON ethics_compliance_reports(status);
CREATE INDEX IF NOT EXISTS idx_ethics_compliance_reports_score ON ethics_compliance_reports(score);

CREATE INDEX IF NOT EXISTS idx_ethics_violations_severity ON ethics_violations(severity);
CREATE INDEX IF NOT EXISTS idx_ethics_violations_status ON ethics_violations(status);
CREATE INDEX IF NOT EXISTS idx_ethics_violations_detected_at ON ethics_violations(detected_at);

CREATE INDEX IF NOT EXISTS idx_bias_analyses_detected ON bias_analyses(detected);
CREATE INDEX IF NOT EXISTS idx_bias_analyses_severity ON bias_analyses(severity);
CREATE INDEX IF NOT EXISTS idx_bias_analyses_agent_type ON bias_analyses(target_agent_type);
CREATE INDEX IF NOT EXISTS idx_bias_analyses_timestamp ON bias_analyses(timestamp);

CREATE INDEX IF NOT EXISTS idx_enforcement_results_status ON enforcement_results(status);
CREATE INDEX IF NOT EXISTS idx_enforcement_results_effectiveness ON enforcement_results(effectiveness);
CREATE INDEX IF NOT EXISTS idx_enforcement_results_timestamp ON enforcement_results(timestamp);

CREATE INDEX IF NOT EXISTS idx_escalation_results_status ON escalation_results(status);
CREATE INDEX IF NOT EXISTS idx_escalation_results_timestamp ON escalation_results(timestamp);

CREATE INDEX IF NOT EXISTS idx_accountability_reports_timestamp ON accountability_reports(timestamp);
CREATE INDEX IF NOT EXISTS idx_accountability_reports_period ON accountability_reports(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_governance_audits_timestamp ON governance_audits(timestamp);
CREATE INDEX IF NOT EXISTS idx_governance_audits_scope ON governance_audits(scope);
CREATE INDEX IF NOT EXISTS idx_governance_audits_status ON governance_audits(status);

CREATE INDEX IF NOT EXISTS idx_governance_decisions_priority ON governance_decisions(priority);
CREATE INDEX IF NOT EXISTS idx_governance_decisions_status ON governance_decisions(status);
CREATE INDEX IF NOT EXISTS idx_governance_decisions_made_at ON governance_decisions(made_at);

CREATE INDEX IF NOT EXISTS idx_governance_actions_priority ON governance_actions(priority);
CREATE INDEX IF NOT EXISTS idx_governance_actions_status ON governance_actions(status);
CREATE INDEX IF NOT EXISTS idx_governance_actions_created_at ON governance_actions(created_at);

CREATE INDEX IF NOT EXISTS idx_agent_outputs_agent_type ON agent_outputs(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_outputs_created_at ON agent_outputs(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_outputs_quality_score ON agent_outputs(quality_score);

-- Create RLS (Row Level Security) policies for secure access
ALTER TABLE responsibility_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ethics_compliance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ethics_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bias_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enforcement_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_outputs ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access (used by edge functions)
CREATE POLICY "Service role can access responsibility_assignments" ON responsibility_assignments
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can access accountability_metrics" ON accountability_metrics
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can access ethics_compliance_reports" ON ethics_compliance_reports
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can access ethics_violations" ON ethics_violations
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can access bias_analyses" ON bias_analyses
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can access enforcement_results" ON enforcement_results
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can access escalation_results" ON escalation_results
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can access accountability_reports" ON accountability_reports
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can access governance_audits" ON governance_audits
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can access governance_decisions" ON governance_decisions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can access governance_actions" ON governance_actions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can access agent_outputs" ON agent_outputs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Create triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_responsibility_assignments_updated_at BEFORE UPDATE
    ON responsibility_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ethics_compliance_reports_updated_at BEFORE UPDATE
    ON ethics_compliance_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ethics_violations_updated_at BEFORE UPDATE
    ON ethics_violations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bias_analyses_updated_at BEFORE UPDATE
    ON bias_analyses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enforcement_results_updated_at BEFORE UPDATE
    ON enforcement_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escalation_results_updated_at BEFORE UPDATE
    ON escalation_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accountability_reports_updated_at BEFORE UPDATE
    ON accountability_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_governance_audits_updated_at BEFORE UPDATE
    ON governance_audits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_governance_decisions_updated_at BEFORE UPDATE
    ON governance_decisions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_governance_actions_updated_at BEFORE UPDATE
    ON governance_actions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_outputs_updated_at BEFORE UPDATE
    ON agent_outputs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE responsibility_assignments IS 'Tracks responsibility assignments for governance actions with accountability frameworks';
COMMENT ON TABLE accountability_metrics IS 'Stores comprehensive accountability metrics for system monitoring';
COMMENT ON TABLE ethics_compliance_reports IS 'Ethics compliance monitoring reports with violation tracking';
COMMENT ON TABLE ethics_violations IS 'Detailed tracking of identified ethics violations and their resolution';
COMMENT ON TABLE bias_analyses IS 'AI-powered bias detection and analysis results';
COMMENT ON TABLE enforcement_results IS 'Results of accountability standards enforcement actions';
COMMENT ON TABLE escalation_results IS 'Tracking of escalated accountability issues and their resolutions';
COMMENT ON TABLE accountability_reports IS 'Comprehensive accountability reports for governance oversight';
COMMENT ON TABLE governance_audits IS 'Audit results for governance decisions and processes';
COMMENT ON TABLE governance_decisions IS 'Record of governance decisions made within the system';
COMMENT ON TABLE governance_actions IS 'Governance actions requiring accountability tracking';
COMMENT ON TABLE agent_outputs IS 'Agent outputs for bias detection and quality analysis';
