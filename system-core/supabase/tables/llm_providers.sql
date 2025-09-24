CREATE TABLE llm_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name VARCHAR(100) NOT NULL,
    api_endpoint VARCHAR(500),
    model_names TEXT[],
    pricing_per_1k_tokens DECIMAL(10,6),
    regional_availability JSONB,
    performance_metrics JSONB,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);