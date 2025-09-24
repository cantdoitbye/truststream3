CREATE TABLE privacy_settings (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    email_notifications BOOLEAN DEFAULT true,
    data_processing_consent BOOLEAN DEFAULT false,
    third_party_sharing BOOLEAN DEFAULT false,
    marketing_consent BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);