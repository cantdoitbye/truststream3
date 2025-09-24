CREATE TABLE llm_routing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(255) NOT NULL,
    task_complexity_range JSONB,
    cost_optimization_weight DECIMAL(3,2) DEFAULT 0.5,
    performance_weight DECIMAL(3,2) DEFAULT 0.3,
    availability_weight DECIMAL(3,2) DEFAULT 0.2,
    preferred_providers UUID[] DEFAULT ARRAY[]::UUID[],
    fallback_providers UUID[] DEFAULT ARRAY[]::UUID[],
    region_preferences JSONB,
    created_by UUID,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);