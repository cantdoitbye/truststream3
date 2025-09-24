-- Migration: Add Governance LLM Integration Infrastructure
-- Description: Creates tables and views for integrating governance agents with LLM Nexus
-- Author: TrustStream v4.2 Integration
-- Date: 2025-09-20

-- Governance LLM Performance Tracking
CREATE TABLE IF NOT EXISTS governance_llm_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(100) NOT NULL,
    governance_type VARCHAR(50) NOT NULL CHECK (governance_type IN ('efficiency', 'quality', 'transparency', 'accountability', 'innovation')),
    provider_name VARCHAR(100) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    request_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    response_time_ms INTEGER NOT NULL CHECK (response_time_ms >= 0),
    cost_actual DECIMAL(10,6) NOT NULL CHECK (cost_actual >= 0),
    quality_score DECIMAL(3,2) CHECK (quality_score >= 0 AND quality_score <= 1),
    satisfaction_rating DECIMAL(3,2) CHECK (satisfaction_rating >= 0 AND satisfaction_rating <= 1),
    context_data JSONB DEFAULT '{}',
    prompt_complexity DECIMAL(3,2) CHECK (prompt_complexity >= 0 AND prompt_complexity <= 1),
    trust_score_used DECIMAL(3,2) CHECK (trust_score_used >= 0 AND trust_score_used <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_governance_llm_performance_agent ON governance_llm_performance(agent_id);
CREATE INDEX IF NOT EXISTS idx_governance_llm_performance_type ON governance_llm_performance(governance_type);
CREATE INDEX IF NOT EXISTS idx_governance_llm_performance_provider ON governance_llm_performance(provider_name, model_name);
CREATE INDEX IF NOT EXISTS idx_governance_llm_performance_timestamp ON governance_llm_performance(request_timestamp);
CREATE INDEX IF NOT EXISTS idx_governance_llm_performance_composite ON governance_llm_performance(governance_type, request_timestamp);

-- Governance Provider Feedback
CREATE TABLE IF NOT EXISTS governance_provider_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name VARCHAR(100) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    governance_type VARCHAR(50) NOT NULL CHECK (governance_type IN ('efficiency', 'quality', 'transparency', 'accountability', 'innovation')),
    feedback_type VARCHAR(50) NOT NULL CHECK (feedback_type IN ('performance', 'quality', 'cost_efficiency', 'trust', 'comprehensive')),
    rating DECIMAL(3,2) NOT NULL CHECK (rating >= 0 AND rating <= 1),
    feedback_data JSONB DEFAULT '{}',
    submitted_by VARCHAR(100) NOT NULL,
    performance_rating DECIMAL(3,2) CHECK (performance_rating >= 0 AND performance_rating <= 1),
    cost_effectiveness DECIMAL(3,2) CHECK (cost_effectiveness >= 0 AND cost_effectiveness <= 1),
    quality_rating DECIMAL(3,2) CHECK (quality_rating >= 0 AND quality_rating <= 1),
    satisfaction_score DECIMAL(3,2) CHECK (satisfaction_score >= 0 AND satisfaction_score <= 1),
    recommendations TEXT,
    issues TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for feedback
CREATE INDEX IF NOT EXISTS idx_governance_feedback_provider ON governance_provider_feedback(provider_name, model_name);
CREATE INDEX IF NOT EXISTS idx_governance_feedback_type ON governance_provider_feedback(governance_type);
CREATE INDEX IF NOT EXISTS idx_governance_feedback_rating ON governance_provider_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_governance_feedback_created ON governance_provider_feedback(created_at);

-- Governance LLM Configuration
CREATE TABLE IF NOT EXISTS governance_llm_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    governance_type VARCHAR(50) NOT NULL UNIQUE CHECK (governance_type IN ('efficiency', 'quality', 'transparency', 'accountability', 'innovation')),
    default_trust_requirement DECIMAL(3,2) DEFAULT 0.8 CHECK (default_trust_requirement >= 0 AND default_trust_requirement <= 1),
    default_max_cost DECIMAL(10,6) CHECK (default_max_cost >= 0),
    default_max_latency INTEGER DEFAULT 10000 CHECK (default_max_latency > 0),
    required_capabilities JSONB DEFAULT '[]',
    quality_thresholds JSONB DEFAULT '{}',
    performance_targets JSONB DEFAULT '{}',
    config_data JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    updated_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default configurations for each governance type
INSERT INTO governance_llm_config (governance_type, default_trust_requirement, default_max_cost, default_max_latency, required_capabilities, quality_thresholds, performance_targets, config_data) VALUES
('efficiency', 0.85, 0.05, 8000, '["reasoning", "optimization", "analysis"]', '{"accuracy": 0.85, "relevance": 0.90, "timeliness": 0.95}', '{"response_time": 5000, "cost_per_request": 0.02}', '{"priority_weighting": {"cost": 0.4, "speed": 0.4, "accuracy": 0.2}}'),
('quality', 0.95, 0.08, 10000, '["text-analysis", "reasoning", "evaluation"]', '{"accuracy": 0.95, "completeness": 0.90, "consistency": 0.92}', '{"response_time": 8000, "cost_per_request": 0.05}', '{"priority_weighting": {"accuracy": 0.5, "trust": 0.3, "completeness": 0.2}}'),
('transparency', 0.90, 0.06, 12000, '["reasoning", "explanation", "audit-trail"]', '{"clarity": 0.90, "completeness": 0.95, "traceability": 0.98}', '{"response_time": 10000, "cost_per_request": 0.04}', '{"priority_weighting": {"trust": 0.4, "clarity": 0.3, "traceability": 0.3}}'),
('accountability', 0.98, 0.10, 15000, '["reasoning", "ethics", "compliance", "audit"]', '{"accuracy": 0.98, "ethics_score": 0.95, "compliance": 0.99}', '{"response_time": 12000, "cost_per_request": 0.07}', '{"priority_weighting": {"trust": 0.5, "ethics": 0.3, "compliance": 0.2}}'),
('innovation', 0.80, 0.12, 20000, '["creativity", "reasoning", "strategic-planning"]', '{"novelty": 0.80, "feasibility": 0.85, "impact": 0.75}', '{"response_time": 15000, "cost_per_request": 0.08}', '{"priority_weighting": {"creativity": 0.4, "feasibility": 0.3, "impact": 0.3}}') 
ON CONFLICT (governance_type) DO NOTHING;

-- Enhanced LLM Routing Decisions with Governance Context
ALTER TABLE llm_routing_decisions 
ADD COLUMN IF NOT EXISTS governance_context JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS governance_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS agent_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS governance_priority VARCHAR(20),
ADD COLUMN IF NOT EXISTS governance_complexity DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS governance_satisfaction DECIMAL(3,2);

-- Create governance-specific index
CREATE INDEX IF NOT EXISTS idx_llm_routing_governance ON llm_routing_decisions(governance_type, agent_id);

-- Governance-Enhanced Provider Scoring View
CREATE OR REPLACE VIEW governance_enhanced_provider_scores AS
SELECT 
    p.id,
    p.provider_name,
    p.model_name,
    p.trust_score_weighting,
    p.reliability_score,
    p.cost_per_1k_tokens,
    p.response_time_avg_ms,
    p.capabilities,
    
    -- Governance-specific metrics from performance tracking
    COALESCE(AVG(gp.quality_score), 0.8) as governance_quality_avg,
    COALESCE(AVG(gp.satisfaction_rating), 0.8) as governance_satisfaction_avg,
    COALESCE(AVG(gp.response_time_ms), p.response_time_avg_ms) as governance_response_time_avg,
    COUNT(gp.id) as governance_request_count,
    
    -- Governance-specific metrics from feedback
    COALESCE(AVG(gf.rating), 0.8) as governance_feedback_avg,
    COALESCE(AVG(gf.performance_rating), 0.8) as governance_performance_rating,
    COALESCE(AVG(gf.cost_effectiveness), 0.8) as governance_cost_effectiveness,
    COUNT(gf.id) as governance_feedback_count,
    
    -- Enhanced scoring calculation with governance factors
    (
        (p.trust_score_weighting * 0.30) +                                    -- Trust: 30%
        (p.reliability_score * 0.20) +                                        -- Reliability: 20%
        (CASE WHEN p.cost_per_1k_tokens > 0 
              THEN LEAST(1.0, 0.01 / p.cost_per_1k_tokens) 
              ELSE 0.5 END * 0.15) +                                           -- Cost: 15%
        (COALESCE(AVG(gp.quality_score), 0.8) * 0.15) +                      -- Governance Quality: 15%
        (COALESCE(AVG(gp.satisfaction_rating), 0.8) * 0.10) +                -- Governance Satisfaction: 10%
        (COALESCE(AVG(gf.cost_effectiveness), 0.8) * 0.10)                   -- Cost Effectiveness: 10%
    ) as enhanced_governance_score,
    
    -- Governance type breakdown
    jsonb_object_agg(
        COALESCE(gp.governance_type, 'general'),
        jsonb_build_object(
            'avg_quality', COALESCE(AVG(gp.quality_score), 0.8),
            'avg_satisfaction', COALESCE(AVG(gp.satisfaction_rating), 0.8),
            'avg_response_time', COALESCE(AVG(gp.response_time_ms), p.response_time_avg_ms),
            'request_count', COUNT(gp.id)
        )
    ) FILTER (WHERE gp.governance_type IS NOT NULL) as governance_type_metrics,
    
    p.created_at,
    p.updated_at,
    p.is_active
    
FROM llm_providers_v4 p
LEFT JOIN governance_llm_performance gp ON p.provider_name = gp.provider_name AND p.model_name = gp.model_name
    AND gp.request_timestamp >= NOW() - INTERVAL '30 days'  -- Only last 30 days
LEFT JOIN governance_provider_feedback gf ON p.provider_name = gf.provider_name AND p.model_name = gf.model_name
    AND gf.created_at >= NOW() - INTERVAL '30 days'  -- Only last 30 days
WHERE p.is_active = true
GROUP BY 
    p.id, p.provider_name, p.model_name, p.trust_score_weighting, 
    p.reliability_score, p.cost_per_1k_tokens, p.response_time_avg_ms, 
    p.capabilities, p.created_at, p.updated_at, p.is_active
ORDER BY enhanced_governance_score DESC;

-- Governance Performance Summary View
CREATE OR REPLACE VIEW governance_performance_summary AS
SELECT 
    gp.governance_type,
    gp.agent_id,
    DATE_TRUNC('day', gp.request_timestamp) as date,
    
    -- Request metrics
    COUNT(*) as total_requests,
    AVG(gp.response_time_ms) as avg_response_time,
    SUM(gp.cost_actual) as total_cost,
    AVG(gp.cost_actual) as avg_cost,
    
    -- Quality metrics
    AVG(gp.quality_score) as avg_quality_score,
    AVG(gp.satisfaction_rating) as avg_satisfaction,
    AVG(gp.trust_score_used) as avg_trust_score,
    
    -- Performance distribution
    COUNT(*) FILTER (WHERE gp.response_time_ms <= 5000) as fast_requests,
    COUNT(*) FILTER (WHERE gp.response_time_ms > 5000 AND gp.response_time_ms <= 10000) as medium_requests,
    COUNT(*) FILTER (WHERE gp.response_time_ms > 10000) as slow_requests,
    
    -- Quality distribution
    COUNT(*) FILTER (WHERE gp.quality_score >= 0.9) as high_quality_requests,
    COUNT(*) FILTER (WHERE gp.quality_score >= 0.7 AND gp.quality_score < 0.9) as medium_quality_requests,
    COUNT(*) FILTER (WHERE gp.quality_score < 0.7) as low_quality_requests,
    
    -- Provider distribution
    jsonb_object_agg(
        CONCAT(gp.provider_name, ':', gp.model_name),
        COUNT(*)
    ) as provider_distribution
    
FROM governance_llm_performance gp
WHERE gp.request_timestamp >= NOW() - INTERVAL '90 days'
GROUP BY 
    gp.governance_type, 
    gp.agent_id, 
    DATE_TRUNC('day', gp.request_timestamp)
ORDER BY 
    date DESC, 
    governance_type, 
    agent_id;

-- Governance LLM Alerts View
CREATE OR REPLACE VIEW governance_llm_alerts AS
SELECT 
    'performance' as alert_type,
    gp.governance_type,
    gp.agent_id,
    CONCAT(gp.provider_name, ':', gp.model_name) as provider,
    'High response time detected' as alert_message,
    AVG(gp.response_time_ms) as metric_value,
    'ms' as metric_unit,
    'warning' as severity,
    MAX(gp.request_timestamp) as last_occurrence,
    COUNT(*) as occurrence_count
FROM governance_llm_performance gp
WHERE gp.request_timestamp >= NOW() - INTERVAL '24 hours'
  AND gp.response_time_ms > 15000  -- Alert for responses over 15 seconds
GROUP BY gp.governance_type, gp.agent_id, gp.provider_name, gp.model_name
HAVING COUNT(*) >= 3  -- At least 3 occurrences

UNION ALL

SELECT 
    'quality' as alert_type,
    gp.governance_type,
    gp.agent_id,
    CONCAT(gp.provider_name, ':', gp.model_name) as provider,
    'Low quality score detected' as alert_message,
    AVG(gp.quality_score) as metric_value,
    'score' as metric_unit,
    CASE 
        WHEN AVG(gp.quality_score) < 0.5 THEN 'critical'
        WHEN AVG(gp.quality_score) < 0.7 THEN 'warning'
        ELSE 'info'
    END as severity,
    MAX(gp.request_timestamp) as last_occurrence,
    COUNT(*) as occurrence_count
FROM governance_llm_performance gp
WHERE gp.request_timestamp >= NOW() - INTERVAL '24 hours'
  AND gp.quality_score IS NOT NULL
  AND gp.quality_score < 0.8  -- Alert for quality below 0.8
GROUP BY gp.governance_type, gp.agent_id, gp.provider_name, gp.model_name
HAVING COUNT(*) >= 2  -- At least 2 occurrences

UNION ALL

SELECT 
    'cost' as alert_type,
    gp.governance_type,
    gp.agent_id,
    CONCAT(gp.provider_name, ':', gp.model_name) as provider,
    'High cost detected' as alert_message,
    AVG(gp.cost_actual) as metric_value,
    'USD' as metric_unit,
    'warning' as severity,
    MAX(gp.request_timestamp) as last_occurrence,
    COUNT(*) as occurrence_count
FROM governance_llm_performance gp
WHERE gp.request_timestamp >= NOW() - INTERVAL '24 hours'
  AND gp.cost_actual > 0.10  -- Alert for costs over $0.10 per request
GROUP BY gp.governance_type, gp.agent_id, gp.provider_name, gp.model_name
HAVING COUNT(*) >= 1  -- Any occurrence

ORDER BY last_occurrence DESC;

-- Row Level Security (RLS) for governance tables
ALTER TABLE governance_llm_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_provider_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_llm_config ENABLE ROW LEVEL SECURITY;

-- Create policies for governance tables (assuming service role access)
CREATE POLICY "governance_llm_performance_policy" ON governance_llm_performance
    FOR ALL USING (true);  -- Allow all operations for now, can be restricted later

CREATE POLICY "governance_provider_feedback_policy" ON governance_provider_feedback
    FOR ALL USING (true);

CREATE POLICY "governance_llm_config_policy" ON governance_llm_config
    FOR ALL USING (true);

-- Add comments for documentation
COMMENT ON TABLE governance_llm_performance IS 'Tracks LLM usage and performance metrics for governance agents';
COMMENT ON TABLE governance_provider_feedback IS 'Stores feedback from governance agents about LLM provider performance';
COMMENT ON TABLE governance_llm_config IS 'Configuration settings for LLM usage by governance type';
COMMENT ON VIEW governance_enhanced_provider_scores IS 'Enhanced provider scoring including governance-specific metrics';
COMMENT ON VIEW governance_performance_summary IS 'Daily summary of governance LLM performance metrics';
COMMENT ON VIEW governance_llm_alerts IS 'Real-time alerts for governance LLM performance issues';

-- Create function to update governance LLM statistics
CREATE OR REPLACE FUNCTION update_governance_llm_stats()
RETURNS trigger AS $$
BEGIN
    -- Update provider statistics when new performance data is added
    IF TG_TABLE_NAME = 'governance_llm_performance' THEN
        -- Update the provider's governance metrics in a summary table if needed
        -- This could be implemented to maintain real-time statistics
        NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic statistics updates
CREATE TRIGGER governance_llm_performance_stats_trigger
    AFTER INSERT OR UPDATE ON governance_llm_performance
    FOR EACH ROW EXECUTE FUNCTION update_governance_llm_stats();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON governance_llm_performance TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON governance_provider_feedback TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON governance_llm_config TO postgres, service_role;
GRANT SELECT ON governance_enhanced_provider_scores TO postgres, service_role, anon;
GRANT SELECT ON governance_performance_summary TO postgres, service_role, anon;
GRANT SELECT ON governance_llm_alerts TO postgres, service_role, anon;