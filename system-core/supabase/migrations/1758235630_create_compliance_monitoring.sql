-- Migration: create_compliance_monitoring
-- Created at: 1758235630

CREATE TABLE compliance_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monitoring_id VARCHAR(100) UNIQUE NOT NULL,
    compliance_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(30) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    compliance_status VARCHAR(20) NOT NULL DEFAULT 'compliant',
    violation_details JSONB NOT NULL DEFAULT '{}',
    risk_level VARCHAR(20) NOT NULL DEFAULT 'low',
    monitoring_agent_id VARCHAR(50) NOT NULL,
    resolution_status VARCHAR(20) DEFAULT 'pending',
    escalation_level INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);;