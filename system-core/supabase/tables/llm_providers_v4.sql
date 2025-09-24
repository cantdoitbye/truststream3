CREATE TABLE llm_providers_v4 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name VARCHAR(100) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    api_endpoint VARCHAR(500) NOT NULL,
    cost_per_1k_tokens DECIMAL(10,6) NOT NULL,
    regional_availability JSONB DEFAULT '{}',
    capabilities JSONB DEFAULT '{}',
    max_context_length INTEGER DEFAULT 4096,
    response_time_avg_ms INTEGER DEFAULT 1000,
    reliability_score DECIMAL(3,2) DEFAULT 0.95,
    trust_score_weighting DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);