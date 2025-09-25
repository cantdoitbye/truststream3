CREATE TABLE system_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(255) NOT NULL,
    metric_category VARCHAR(100) CHECK (metric_category IN ('performance',
    'security',
    'compliance',
    'ai_agents',
    'system_health')),
    metric_value DECIMAL(10,4) NOT NULL,
    metric_unit VARCHAR(50),
    target_value DECIMAL(10,4),
    status VARCHAR(50) DEFAULT 'normal' CHECK (status IN ('normal',
    'warning',
    'critical')),
    metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);