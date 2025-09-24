CREATE TABLE regional_pricing_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name VARCHAR(100) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    region_code VARCHAR(10) NOT NULL,
    cost_per_1k_input_tokens DECIMAL(10,6) NOT NULL,
    cost_per_1k_output_tokens DECIMAL(10,6) NOT NULL,
    cost_per_image DECIMAL(10,6) DEFAULT 0,
    daily_usage_limit INTEGER DEFAULT -1,
    monthly_cost_cap DECIMAL(10,2) DEFAULT -1,
    effective_date DATE NOT NULL,
    expires_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);