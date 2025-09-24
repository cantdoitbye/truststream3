-- Migration: economic_ai_integration_tables
-- Created at: 1758370000

-- Economic AI Integration Tables
-- Extends existing economic infrastructure with governance-specific tracking

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Governance Economic Impact Tracking Table
-- Tracks economic impact of governance decisions over time
CREATE TABLE IF NOT EXISTS governance_economic_impact (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    decision_id UUID NOT NULL,
    decision_type VARCHAR(50) NOT NULL,
    impact_type VARCHAR(50) NOT NULL,
    economic_value NUMERIC(15,2),
    baseline_metrics JSONB DEFAULT '{}'::JSONB,
    current_metrics JSONB DEFAULT '{}'::JSONB,
    impact_metadata JSONB DEFAULT '{}'::JSONB,
    measurement_period VARCHAR(20),
    confidence_score NUMERIC(3,2) DEFAULT 0.50,
    measured_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT governance_impact_valid_type CHECK (impact_type IN (
        'economic_analysis', 'cost_benefit', 'roi_tracking', 'risk_assessment',
        'transaction_impact', 'trust_score_impact', 'participation_impact'
    )),
    CONSTRAINT governance_impact_valid_decision_type CHECK (decision_type IN (
        'proposal_approval', 'agent_incentive', 'fee_adjustment', 'system_upgrade',
        'governance_change', 'economic_policy', 'resource_allocation'
    )),
    CONSTRAINT governance_impact_confidence_range CHECK (confidence_score >= 0 AND confidence_score <= 1)
);

-- Governance Fees Table
-- Tracks all governance-related fee payments and processing
CREATE TABLE IF NOT EXISTS governance_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agent_registry(id) ON DELETE CASCADE,
    fee_type VARCHAR(30) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'usd',
    payment_intent_id VARCHAR(255),
    stripe_payment_status VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    governance_context JSONB DEFAULT '{}'::JSONB,
    payment_metadata JSONB DEFAULT '{}'::JSONB,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT governance_fees_valid_type CHECK (fee_type IN (
        'proposal_submission', 'voting_priority', 'implementation_cost',
        'transparency_fee', 'appeal_fee', 'expedited_processing'
    )),
    CONSTRAINT governance_fees_positive_amount CHECK (amount > 0),
    CONSTRAINT governance_fees_valid_status CHECK (status IN (
        'pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'
    )),
    CONSTRAINT governance_fees_valid_currency CHECK (currency IN ('usd', 'eur', 'gbp'))
);

-- Economic Decision Tracking Table
-- Long-term tracking of economic impacts from governance decisions
CREATE TABLE IF NOT EXISTS economic_decision_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    decision_id UUID NOT NULL,
    decision_type VARCHAR(50) NOT NULL,
    tracking_period VARCHAR(20) NOT NULL,
    tracking_status VARCHAR(20) DEFAULT 'active',
    baseline_date TIMESTAMPTZ NOT NULL,
    tracking_end_date TIMESTAMPTZ,
    metrics_to_track TEXT[] DEFAULT ARRAY[]::TEXT[],
    baseline_metrics JSONB DEFAULT '{}'::JSONB,
    current_metrics JSONB DEFAULT '{}'::JSONB,
    impact_summary JSONB DEFAULT '{}'::JSONB,
    tracking_config JSONB DEFAULT '{}'::JSONB,
    last_measurement_at TIMESTAMPTZ,
    next_measurement_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT tracking_valid_status CHECK (tracking_status IN (
        'active', 'completed', 'paused', 'cancelled'
    )),
    CONSTRAINT tracking_valid_period CHECK (tracking_period ~ '^\d+[dmwy]$'), -- Format: 30d, 12m, 1y
    CONSTRAINT tracking_end_after_start CHECK (tracking_end_date > baseline_date)
);

-- Economic Integration Reports Table
-- Stores generated economic reports and analysis
CREATE TABLE IF NOT EXISTS economic_integration_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_type VARCHAR(50) NOT NULL,
    report_title VARCHAR(200) NOT NULL,
    time_range VARCHAR(20),
    filters JSONB DEFAULT '{}'::JSONB,
    report_format VARCHAR(20) DEFAULT 'comprehensive',
    report_content JSONB NOT NULL,
    data_sources TEXT[] DEFAULT ARRAY[]::TEXT[],
    data_completeness NUMERIC(3,2) DEFAULT 1.00,
    generated_by VARCHAR(100) DEFAULT 'economic-ai-integration',
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    access_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::JSONB,
    
    -- Constraints
    CONSTRAINT reports_valid_type CHECK (report_type IN (
        'governance_impact', 'trustcoin_analysis', 'cost_efficiency',
        'roi_analysis', 'risk_assessment', 'trend_analysis', 'comprehensive'
    )),
    CONSTRAINT reports_valid_format CHECK (report_format IN (
        'summary', 'standard', 'comprehensive', 'executive', 'technical'
    )),
    CONSTRAINT reports_completeness_range CHECK (data_completeness >= 0 AND data_completeness <= 1)
);

-- Economic Incentive Distributions Table
-- Tracks distribution of economic incentives to agents
CREATE TABLE IF NOT EXISTS economic_incentive_distributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distribution_type VARCHAR(50) NOT NULL,
    distribution_name VARCHAR(200),
    total_amount NUMERIC(15,2) NOT NULL,
    recipient_count INTEGER NOT NULL,
    successful_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    distribution_criteria JSONB DEFAULT '{}'::JSONB,
    governance_context JSONB DEFAULT '{}'::JSONB,
    transaction_ids UUID[] DEFAULT ARRAY[]::UUID[],
    distribution_status VARCHAR(20) DEFAULT 'pending',
    error_details JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT distribution_valid_type CHECK (distribution_type IN (
        'performance_reward', 'participation_bonus', 'quality_incentive',
        'innovation_reward', 'governance_reward', 'risk_compensation'
    )),
    CONSTRAINT distribution_positive_amount CHECK (total_amount > 0),
    CONSTRAINT distribution_positive_recipients CHECK (recipient_count > 0),
    CONSTRAINT distribution_valid_status CHECK (distribution_status IN (
        'pending', 'processing', 'completed', 'partial', 'failed'
    ))
);

-- Economic Alert Configurations Table
-- Manages economic alerts and monitoring thresholds
CREATE TABLE IF NOT EXISTS economic_alert_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_name VARCHAR(100) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    threshold_value NUMERIC(15,4) NOT NULL,
    threshold_operator VARCHAR(10) NOT NULL, -- >, <, >=, <=, =, !=
    alert_severity VARCHAR(20) DEFAULT 'medium',
    is_active BOOLEAN DEFAULT true,
    notification_channels TEXT[] DEFAULT ARRAY['system']::TEXT[],
    alert_conditions JSONB DEFAULT '{}'::JSONB,
    last_triggered_at TIMESTAMPTZ,
    trigger_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT alert_valid_type CHECK (alert_type IN (
        'threshold', 'trend', 'anomaly', 'pattern', 'comparison'
    )),
    CONSTRAINT alert_valid_operator CHECK (threshold_operator IN (
        '>', '<', '>=', '<=', '=', '!='
    )),
    CONSTRAINT alert_valid_severity CHECK (alert_severity IN (
        'low', 'medium', 'high', 'critical'
    ))
);

-- Economic Alert History Table
-- Tracks triggered alerts and their resolution
CREATE TABLE IF NOT EXISTS economic_alert_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_config_id UUID NOT NULL REFERENCES economic_alert_configurations(id) ON DELETE CASCADE,
    alert_name VARCHAR(100) NOT NULL,
    triggered_value NUMERIC(15,4),
    threshold_value NUMERIC(15,4),
    severity VARCHAR(20) NOT NULL,
    alert_message TEXT,
    alert_data JSONB DEFAULT '{}'::JSONB,
    resolution_status VARCHAR(20) DEFAULT 'open',
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT alert_history_valid_severity CHECK (severity IN (
        'low', 'medium', 'high', 'critical'
    )),
    CONSTRAINT alert_history_valid_resolution CHECK (resolution_status IN (
        'open', 'acknowledged', 'resolved', 'false_positive', 'ignored'
    ))
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_governance_economic_impact_decision ON governance_economic_impact(decision_id);
CREATE INDEX IF NOT EXISTS idx_governance_economic_impact_type ON governance_economic_impact(impact_type);
CREATE INDEX IF NOT EXISTS idx_governance_economic_impact_measured ON governance_economic_impact(measured_at);

CREATE INDEX IF NOT EXISTS idx_governance_fees_agent ON governance_fees(agent_id);
CREATE INDEX IF NOT EXISTS idx_governance_fees_type ON governance_fees(fee_type);
CREATE INDEX IF NOT EXISTS idx_governance_fees_status ON governance_fees(status);
CREATE INDEX IF NOT EXISTS idx_governance_fees_payment_intent ON governance_fees(payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_economic_decision_tracking_decision ON economic_decision_tracking(decision_id);
CREATE INDEX IF NOT EXISTS idx_economic_decision_tracking_status ON economic_decision_tracking(tracking_status);
CREATE INDEX IF NOT EXISTS idx_economic_decision_tracking_next_measurement ON economic_decision_tracking(next_measurement_at);

CREATE INDEX IF NOT EXISTS idx_economic_reports_type ON economic_integration_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_economic_reports_generated ON economic_integration_reports(generated_at);
CREATE INDEX IF NOT EXISTS idx_economic_reports_expires ON economic_integration_reports(expires_at);

CREATE INDEX IF NOT EXISTS idx_incentive_distributions_type ON economic_incentive_distributions(distribution_type);
CREATE INDEX IF NOT EXISTS idx_incentive_distributions_status ON economic_incentive_distributions(distribution_status);
CREATE INDEX IF NOT EXISTS idx_incentive_distributions_created ON economic_incentive_distributions(created_at);

CREATE INDEX IF NOT EXISTS idx_alert_configs_active ON economic_alert_configurations(is_active);
CREATE INDEX IF NOT EXISTS idx_alert_configs_type ON economic_alert_configurations(alert_type);
CREATE INDEX IF NOT EXISTS idx_alert_configs_metric ON economic_alert_configurations(metric_name);

CREATE INDEX IF NOT EXISTS idx_alert_history_config ON economic_alert_history(alert_config_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_triggered ON economic_alert_history(triggered_at);
CREATE INDEX IF NOT EXISTS idx_alert_history_resolution ON economic_alert_history(resolution_status);

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE governance_economic_impact ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE economic_decision_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE economic_integration_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE economic_incentive_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE economic_alert_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE economic_alert_history ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (can be customized based on security requirements)
CREATE POLICY "Enable read access for authenticated users" ON governance_economic_impact FOR SELECT USING (true);
CREATE POLICY "Enable read access for authenticated users" ON governance_fees FOR SELECT USING (true);
CREATE POLICY "Enable read access for authenticated users" ON economic_decision_tracking FOR SELECT USING (true);
CREATE POLICY "Enable read access for authenticated users" ON economic_integration_reports FOR SELECT USING (true);
CREATE POLICY "Enable read access for authenticated users" ON economic_incentive_distributions FOR SELECT USING (true);
CREATE POLICY "Enable read access for authenticated users" ON economic_alert_configurations FOR SELECT USING (true);
CREATE POLICY "Enable read access for authenticated users" ON economic_alert_history FOR SELECT USING (true);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_governance_fees_updated_at ON governance_fees;
CREATE TRIGGER update_governance_fees_updated_at BEFORE UPDATE ON governance_fees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_economic_decision_tracking_updated_at ON economic_decision_tracking;
CREATE TRIGGER update_economic_decision_tracking_updated_at BEFORE UPDATE ON economic_decision_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_economic_alert_configurations_updated_at ON economic_alert_configurations;
CREATE TRIGGER update_economic_alert_configurations_updated_at BEFORE UPDATE ON economic_alert_configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for economic integration analytics
DROP VIEW IF EXISTS economic_governance_dashboard;
CREATE VIEW economic_governance_dashboard AS
SELECT 
    'fees' as metric_category,
    COUNT(*) as total_count,
    SUM(amount) as total_value,
    AVG(amount) as average_value,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as daily_count
FROM governance_fees
UNION ALL
SELECT 
    'impact_tracking' as metric_category,
    COUNT(*) as total_count,
    NULL as total_value,
    NULL as average_value,
    COUNT(CASE WHEN tracking_status = 'active' THEN 1 END) as completed_count,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as daily_count
FROM economic_decision_tracking
UNION ALL
SELECT 
    'incentive_distributions' as metric_category,
    COUNT(*) as total_count,
    SUM(total_amount) as total_value,
    AVG(total_amount) as average_value,
    COUNT(CASE WHEN distribution_status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as daily_count
FROM economic_incentive_distributions;

-- View for economic impact summary
DROP VIEW IF EXISTS economic_impact_summary;
CREATE VIEW economic_impact_summary AS
SELECT 
    decision_type,
    impact_type,
    COUNT(*) as measurement_count,
    AVG(economic_value) as avg_economic_value,
    AVG(confidence_score) as avg_confidence,
    COUNT(CASE WHEN measured_at >= NOW() - INTERVAL '7 days' THEN 1 END) as recent_measurements
FROM governance_economic_impact
GROUP BY decision_type, impact_type;

-- View for fee collection summary
DROP VIEW IF EXISTS governance_fee_summary;
CREATE VIEW governance_fee_summary AS
SELECT 
    fee_type,
    COUNT(*) as fee_count,
    SUM(amount) as total_collected,
    AVG(amount) as average_fee,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_collections,
    ROUND(
        (COUNT(CASE WHEN status = 'completed' THEN 1 END)::NUMERIC / COUNT(*)) * 100, 
        2
    ) as success_rate_percentage
FROM governance_fees
GROUP BY fee_type;

-- View for active alerts summary
DROP VIEW IF EXISTS economic_alerts_summary;
CREATE VIEW economic_alerts_summary AS
SELECT 
    alert_type,
    alert_severity,
    COUNT(*) as active_alerts,
    COUNT(CASE WHEN last_triggered_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as recent_triggers,
    AVG(trigger_count) as avg_trigger_count
FROM economic_alert_configurations
WHERE is_active = true
GROUP BY alert_type, alert_severity;

-- Comments for documentation
COMMENT ON TABLE governance_economic_impact IS 'Tracks economic impact of governance decisions over time';
COMMENT ON TABLE governance_fees IS 'Manages all governance-related fee payments and processing';
COMMENT ON TABLE economic_decision_tracking IS 'Long-term tracking of economic impacts from governance decisions';
COMMENT ON TABLE economic_integration_reports IS 'Stores generated economic reports and analysis';
COMMENT ON TABLE economic_incentive_distributions IS 'Tracks distribution of economic incentives to agents';
COMMENT ON TABLE economic_alert_configurations IS 'Manages economic alerts and monitoring thresholds';
COMMENT ON TABLE economic_alert_history IS 'Historical record of triggered economic alerts';

-- Success message
SELECT 'Economic AI Integration tables created successfully!' as status;
