CREATE TABLE gdpr_audit_log (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    consent_details JSONB,
    deletion_type VARCHAR(50),
    reason TEXT,
    status VARCHAR(50)
);