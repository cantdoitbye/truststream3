CREATE TABLE data_access_requests (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    request_type VARCHAR(50) DEFAULT 'full_export',
    status VARCHAR(50) DEFAULT 'pending',
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    export_file_url TEXT,
    expiry_date TIMESTAMPTZ
);