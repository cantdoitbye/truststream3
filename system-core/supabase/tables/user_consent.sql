CREATE TABLE user_consent (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    necessary BOOLEAN DEFAULT true,
    functional BOOLEAN DEFAULT false,
    analytics BOOLEAN DEFAULT false,
    marketing BOOLEAN DEFAULT false,
    consent_method VARCHAR(100),
    consent_timestamp TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);