CREATE TABLE llm_routing_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    prompt_id UUID,
    selected_provider VARCHAR(100) NOT NULL,
    selection_reasoning JSONB DEFAULT '{}',
    trust_score_factor DECIMAL(3,2) NOT NULL,
    cost_factor DECIMAL(3,2) NOT NULL,
    performance_factor DECIMAL(3,2) NOT NULL,
    regional_factor DECIMAL(3,2) DEFAULT 1.0,
    total_score DECIMAL(5,2) NOT NULL,
    execution_time_ms INTEGER,
    response_quality_score DECIMAL(3,2),
    cost_actual DECIMAL(10,6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);