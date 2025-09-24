CREATE TABLE llm_usage_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    provider_name VARCHAR(100) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    tokens_used INTEGER NOT NULL,
    cost_amount DECIMAL(10,6) NOT NULL,
    request_type VARCHAR(50) NOT NULL,
    response_time_ms INTEGER NOT NULL,
    quality_score DECIMAL(3,2),
    region_code VARCHAR(10) NOT NULL,
    trust_score_used DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_id UUID
);