CREATE TABLE data_deletion_requests (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    request_type VARCHAR(50) NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    compliance_deadline TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    processor_notes TEXT
);