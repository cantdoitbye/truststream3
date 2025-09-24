CREATE TABLE governance_activity_logs (
    id SERIAL PRIMARY KEY,
    activity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    user_id UUID,
    details JSON,
    timestamp TIMESTAMP DEFAULT NOW()
);