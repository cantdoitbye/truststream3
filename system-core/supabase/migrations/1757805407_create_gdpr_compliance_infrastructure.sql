-- GDPR Compliance Infrastructure
-- Comprehensive database schema for GDPR compliance and data protection

-- User Consents Table
CREATE TABLE IF NOT EXISTS user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL,
    consent_type VARCHAR NOT NULL CHECK (consent_type IN ('essential', 'analytics', 'marketing', 'data_processing', 'third_party')),
    consent_status BOOLEAN NOT NULL DEFAULT FALSE,
    consent_version VARCHAR DEFAULT '1.0',
    granted_at TIMESTAMP WITH TIME ZONE,
    withdrawn_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    consent_details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_user_consents_user_id (user_id),
    INDEX idx_user_consents_type (consent_type),
    INDEX idx_user_consents_status (consent_status),
    INDEX idx_user_consents_created (created_at)
);

-- Data Processing Logs Table (GDPR Article 30 compliance)
CREATE TABLE IF NOT EXISTS data_processing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR,
    action_type VARCHAR NOT NULL CHECK (action_type IN ('create', 'read', 'update', 'delete', 'export', 'consent_update', 'data_access', 'data_deletion')),
    table_name VARCHAR NOT NULL,
    record_id VARCHAR,
    data_category VARCHAR CHECK (data_category IN ('personal_info', 'usage_data', 'technical_data', 'communication_data', 'preference_data')),
    legal_basis VARCHAR CHECK (legal_basis IN ('consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests')),
    performed_by VARCHAR NOT NULL,
    purpose VARCHAR NOT NULL,
    retention_period_days INTEGER,
    anonymization_applied BOOLEAN DEFAULT FALSE,
    ip_address INET,
    user_agent TEXT,
    processing_details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_data_processing_logs_user_id (user_id),
    INDEX idx_data_processing_logs_action (action_type),
    INDEX idx_data_processing_logs_table (table_name),
    INDEX idx_data_processing_logs_created (created_at),
    INDEX idx_data_processing_logs_category (data_category)
);

-- Data Subject Rights Requests Table
CREATE TABLE IF NOT EXISTS data_rights_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL,
    request_type VARCHAR NOT NULL CHECK (request_type IN ('access', 'rectification', 'erasure', 'portability', 'restriction', 'objection', 'automated_decision_opt_out')),
    status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected', 'partial')),
    request_data JSONB DEFAULT '{}',
    response_data JSONB DEFAULT '{}',
    legal_basis VARCHAR,
    rejection_reason TEXT,
    fulfilled_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_data_rights_requests_user_id (user_id),
    INDEX idx_data_rights_requests_type (request_type),
    INDEX idx_data_rights_requests_status (status),
    INDEX idx_data_rights_requests_created (created_at)
);

-- Data Retention Policies Table
CREATE TABLE IF NOT EXISTS data_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_category VARCHAR NOT NULL,
    table_name VARCHAR NOT NULL,
    retention_period_days INTEGER NOT NULL,
    deletion_method VARCHAR DEFAULT 'soft_delete' CHECK (deletion_method IN ('soft_delete', 'hard_delete', 'anonymize')),
    legal_basis VARCHAR NOT NULL,
    policy_description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique policy per category/table
    UNIQUE(data_category, table_name),
    
    -- Indexes
    INDEX idx_retention_policies_category (data_category),
    INDEX idx_retention_policies_table (table_name),
    INDEX idx_retention_policies_active (is_active)
);

-- Data Breach Incidents Table (GDPR Article 33-34 compliance)
CREATE TABLE IF NOT EXISTS data_breach_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id VARCHAR UNIQUE NOT NULL,
    breach_type VARCHAR NOT NULL CHECK (breach_type IN ('confidentiality', 'integrity', 'availability')),
    severity VARCHAR NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    affected_data_categories TEXT[] DEFAULT '{}',
    affected_users_count INTEGER DEFAULT 0,
    breach_description TEXT NOT NULL,
    containment_actions TEXT,
    remediation_actions TEXT,
    notification_required BOOLEAN DEFAULT FALSE,
    authority_notified_at TIMESTAMP WITH TIME ZONE,
    users_notified_at TIMESTAMP WITH TIME ZONE,
    discovered_at TIMESTAMP WITH TIME ZONE NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    reported_by VARCHAR NOT NULL,
    incident_details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_breach_incidents_severity (severity),
    INDEX idx_breach_incidents_type (breach_type),
    INDEX idx_breach_incidents_discovered (discovered_at),
    INDEX idx_breach_incidents_resolved (resolved_at)
);

-- Privacy Settings Table (User privacy preferences)
CREATE TABLE IF NOT EXISTS privacy_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR UNIQUE NOT NULL,
    marketing_emails BOOLEAN DEFAULT FALSE,
    analytics_tracking BOOLEAN DEFAULT FALSE,
    personalization BOOLEAN DEFAULT FALSE,
    data_sharing_third_party BOOLEAN DEFAULT FALSE,
    profile_visibility VARCHAR DEFAULT 'private' CHECK (profile_visibility IN ('public', 'private', 'limited')),
    data_export_format VARCHAR DEFAULT 'json' CHECK (data_export_format IN ('json', 'csv', 'xml')),
    communication_preferences JSONB DEFAULT '{}',
    last_privacy_review TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Index
    INDEX idx_privacy_settings_user_id (user_id),
    INDEX idx_privacy_settings_last_review (last_privacy_review)
);

-- Data Processing Activities Table (GDPR Article 30 Records of Processing)
CREATE TABLE IF NOT EXISTS data_processing_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_name VARCHAR NOT NULL,
    controller_name VARCHAR NOT NULL DEFAULT 'Agentic Ecosystem',
    controller_contact TEXT,
    processing_purposes TEXT[] NOT NULL,
    data_categories TEXT[] NOT NULL,
    data_subject_categories TEXT[] NOT NULL,
    recipient_categories TEXT[] DEFAULT '{}',
    third_country_transfers BOOLEAN DEFAULT FALSE,
    transfer_safeguards TEXT,
    retention_schedule TEXT NOT NULL,
    security_measures TEXT[] DEFAULT '{}',
    legal_basis VARCHAR NOT NULL,
    legitimate_interests TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_processing_activities_active (is_active),
    INDEX idx_processing_activities_legal_basis (legal_basis)
);

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_processing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_rights_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_breach_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_processing_activities ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies (Basic user access control)
CREATE POLICY "Users can view their own consents" ON user_consents
    FOR SELECT USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

CREATE POLICY "Users can insert their own consents" ON user_consents
    FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims')::json->>'sub');

CREATE POLICY "Users can view their own processing logs" ON data_processing_logs
    FOR SELECT USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

CREATE POLICY "Users can view their own rights requests" ON data_rights_requests
    FOR SELECT USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

CREATE POLICY "Users can insert their own rights requests" ON data_rights_requests
    FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims')::json->>'sub');

CREATE POLICY "Users can view their own privacy settings" ON privacy_settings
    FOR SELECT USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

CREATE POLICY "Users can update their own privacy settings" ON privacy_settings
    FOR UPDATE USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- Admin policies (service role can access all)
CREATE POLICY "Service role can access all consents" ON user_consents
    FOR ALL USING (current_setting('request.jwt.claims')::json->>'role' = 'service_role');

CREATE POLICY "Service role can access all processing logs" ON data_processing_logs
    FOR ALL USING (current_setting('request.jwt.claims')::json->>'role' = 'service_role');

CREATE POLICY "Service role can access all rights requests" ON data_rights_requests
    FOR ALL USING (current_setting('request.jwt.claims')::json->>'role' = 'service_role');

CREATE POLICY "Service role can access all retention policies" ON data_retention_policies
    FOR ALL USING (current_setting('request.jwt.claims')::json->>'role' = 'service_role');

CREATE POLICY "Service role can access all breach incidents" ON data_breach_incidents
    FOR ALL USING (current_setting('request.jwt.claims')::json->>'role' = 'service_role');

CREATE POLICY "Service role can access all privacy settings" ON privacy_settings
    FOR ALL USING (current_setting('request.jwt.claims')::json->>'role' = 'service_role');

CREATE POLICY "Service role can access all processing activities" ON data_processing_activities
    FOR ALL USING (current_setting('request.jwt.claims')::json->>'role' = 'service_role');

-- Insert default data retention policies
INSERT INTO data_retention_policies (data_category, table_name, retention_period_days, legal_basis, policy_description) VALUES
    ('personal_info', 'user_profiles', 2555, 'consent', 'User personal information retained for 7 years as per consent'),
    ('usage_data', 'usage_analytics', 1095, 'legitimate_interests', 'Usage analytics data retained for 3 years for service improvement'),
    ('technical_data', 'system_logs', 365, 'legitimate_interests', 'Technical logs retained for 1 year for system maintenance'),
    ('communication_data', 'messages', 1825, 'contract', 'Communication data retained for 5 years as per service contract'),
    ('preference_data', 'user_preferences', 1095, 'consent', 'User preferences retained for 3 years based on consent');

-- Insert default processing activities
INSERT INTO data_processing_activities (
    activity_name, 
    processing_purposes, 
    data_categories, 
    data_subject_categories, 
    retention_schedule, 
    legal_basis
) VALUES
    ('User Account Management', 
     ARRAY['Account creation', 'Authentication', 'Profile management'], 
     ARRAY['personal_info', 'technical_data'], 
     ARRAY['Users', 'Customers'], 
     'Retained until account deletion + 30 days', 
     'contract'),
    ('Analytics and Performance', 
     ARRAY['Service improvement', 'Usage analytics', 'Performance monitoring'], 
     ARRAY['usage_data', 'technical_data'], 
     ARRAY['Users', 'Visitors'], 
     'Anonymized after 90 days, aggregated data retained 3 years', 
     'legitimate_interests'),
    ('Trust and Safety', 
     ARRAY['Fraud prevention', 'Security monitoring', 'Compliance'], 
     ARRAY['usage_data', 'technical_data'], 
     ARRAY['Users', 'Suspicious actors'], 
     'Security logs retained 1 year, fraud cases 7 years', 
     'legitimate_interests');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_user_consents_updated_at BEFORE UPDATE ON user_consents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_rights_requests_updated_at BEFORE UPDATE ON data_rights_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_retention_policies_updated_at BEFORE UPDATE ON data_retention_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_breach_incidents_updated_at BEFORE UPDATE ON data_breach_incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_privacy_settings_updated_at BEFORE UPDATE ON privacy_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_processing_activities_updated_at BEFORE UPDATE ON data_processing_activities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for reporting and analytics
CREATE VIEW gdpr_compliance_dashboard AS
SELECT 
    'consent_overview' as metric_type,
    consent_type,
    COUNT(*) as total_records,
    COUNT(CASE WHEN consent_status = true THEN 1 END) as granted_count,
    COUNT(CASE WHEN consent_status = false THEN 1 END) as withdrawn_count,
    ROUND((COUNT(CASE WHEN consent_status = true THEN 1 END)::decimal / COUNT(*)) * 100, 2) as consent_rate
FROM user_consents 
GROUP BY consent_type

UNION ALL

SELECT 
    'rights_requests' as metric_type,
    request_type as consent_type,
    COUNT(*) as total_records,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as granted_count,
    COUNT(CASE WHEN status IN ('rejected', 'partial') THEN 1 END) as withdrawn_count,
    ROUND((COUNT(CASE WHEN status = 'completed' THEN 1 END)::decimal / COUNT(*)) * 100, 2) as consent_rate
FROM data_rights_requests 
GROUP BY request_type

UNION ALL

SELECT 
    'processing_activity' as metric_type,
    legal_basis as consent_type,
    COUNT(*) as total_records,
    COUNT(CASE WHEN is_active = true THEN 1 END) as granted_count,
    COUNT(CASE WHEN is_active = false THEN 1 END) as withdrawn_count,
    ROUND((COUNT(CASE WHEN is_active = true THEN 1 END)::decimal / COUNT(*)) * 100, 2) as consent_rate
FROM data_processing_activities
GROUP BY legal_basis;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- Comments for documentation
COMMENT ON TABLE user_consents IS 'GDPR Article 7 - Records of consent for lawful data processing';
COMMENT ON TABLE data_processing_logs IS 'GDPR Article 30 - Records of processing activities audit trail';
COMMENT ON TABLE data_rights_requests IS 'GDPR Articles 15-22 - Data subject rights request management';
COMMENT ON TABLE data_retention_policies IS 'GDPR Article 5 - Data retention and storage limitation policies';
COMMENT ON TABLE data_breach_incidents IS 'GDPR Articles 33-34 - Personal data breach notification records';
COMMENT ON TABLE privacy_settings IS 'User privacy preferences and consent granularity';
COMMENT ON TABLE data_processing_activities IS 'GDPR Article 30 - Records of processing activities register';