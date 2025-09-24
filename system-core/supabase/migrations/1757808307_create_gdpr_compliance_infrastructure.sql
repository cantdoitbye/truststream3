-- Migration: create_gdpr_compliance_infrastructure
-- Created at: 1757808307

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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for user_consents
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents (user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_type ON user_consents (consent_type);
CREATE INDEX IF NOT EXISTS idx_user_consents_status ON user_consents (consent_status);
CREATE INDEX IF NOT EXISTS idx_user_consents_created ON user_consents (created_at);

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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for data_processing_logs
CREATE INDEX IF NOT EXISTS idx_data_processing_logs_user_id ON data_processing_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_data_processing_logs_action ON data_processing_logs (action_type);
CREATE INDEX IF NOT EXISTS idx_data_processing_logs_table ON data_processing_logs (table_name);
CREATE INDEX IF NOT EXISTS idx_data_processing_logs_created ON data_processing_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_data_processing_logs_category ON data_processing_logs (data_category);

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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for data_rights_requests
CREATE INDEX IF NOT EXISTS idx_data_rights_requests_user_id ON data_rights_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_data_rights_requests_type ON data_rights_requests (request_type);
CREATE INDEX IF NOT EXISTS idx_data_rights_requests_status ON data_rights_requests (status);
CREATE INDEX IF NOT EXISTS idx_data_rights_requests_created ON data_rights_requests (created_at);

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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint and indexes for data_retention_policies
CREATE UNIQUE INDEX IF NOT EXISTS idx_retention_policies_unique ON data_retention_policies (data_category, table_name);
CREATE INDEX IF NOT EXISTS idx_retention_policies_category ON data_retention_policies (data_category);
CREATE INDEX IF NOT EXISTS idx_retention_policies_table ON data_retention_policies (table_name);
CREATE INDEX IF NOT EXISTS idx_retention_policies_active ON data_retention_policies (is_active);

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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for data_breach_incidents
CREATE INDEX IF NOT EXISTS idx_breach_incidents_severity ON data_breach_incidents (severity);
CREATE INDEX IF NOT EXISTS idx_breach_incidents_type ON data_breach_incidents (breach_type);
CREATE INDEX IF NOT EXISTS idx_breach_incidents_discovered ON data_breach_incidents (discovered_at);
CREATE INDEX IF NOT EXISTS idx_breach_incidents_resolved ON data_breach_incidents (resolved_at);

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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for privacy_settings
CREATE INDEX IF NOT EXISTS idx_privacy_settings_user_id ON privacy_settings (user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_settings_last_review ON privacy_settings (last_privacy_review);

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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for data_processing_activities
CREATE INDEX IF NOT EXISTS idx_processing_activities_active ON data_processing_activities (is_active);
CREATE INDEX IF NOT EXISTS idx_processing_activities_legal_basis ON data_processing_activities (legal_basis);;