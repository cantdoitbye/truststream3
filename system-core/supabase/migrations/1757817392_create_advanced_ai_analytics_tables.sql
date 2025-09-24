-- Migration: create_advanced_ai_analytics_tables
-- Created at: 1757817392

-- AI Predictive Analytics Tables
CREATE TABLE IF NOT EXISTS ai_predictive_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name VARCHAR(255) NOT NULL,
  model_type VARCHAR(100) NOT NULL, -- 'user_behavior', 'trust_evolution', 'community_dynamics', 'system_performance'
  model_version VARCHAR(50) NOT NULL,
  model_config JSONB NOT NULL DEFAULT '{}',
  training_data_source VARCHAR(255),
  accuracy_score DECIMAL(5,4),
  last_trained_at TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'training', 'deprecated'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL,
  prediction_type VARCHAR(100) NOT NULL,
  target_entity_id VARCHAR(255), -- user_id, community_id, etc.
  target_entity_type VARCHAR(100), -- 'user', 'community', 'system'
  prediction_data JSONB NOT NULL,
  confidence_score DECIMAL(5,4),
  prediction_horizon VARCHAR(50), -- '1d', '7d', '30d', '90d'
  predicted_at TIMESTAMPTZ DEFAULT NOW(),
  validated_at TIMESTAMPTZ,
  actual_outcome JSONB,
  accuracy_score DECIMAL(5,4)
);

CREATE TABLE IF NOT EXISTS ai_pattern_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_type VARCHAR(100) NOT NULL, -- 'anomaly_detection', 'trend_analysis', 'pattern_recognition'
  entity_type VARCHAR(100) NOT NULL, -- 'user', 'community', 'system', 'global'
  entity_id VARCHAR(255),
  pattern_data JSONB NOT NULL,
  significance_score DECIMAL(5,4),
  pattern_strength DECIMAL(5,4),
  time_window_start TIMESTAMPTZ,
  time_window_end TIMESTAMPTZ,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adaptive Learning Tables
CREATE TABLE IF NOT EXISTS ai_feedback_collection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id VARCHAR(255),
  interaction_id VARCHAR(255),
  feedback_type VARCHAR(100) NOT NULL, -- 'satisfaction', 'quality', 'relevance', 'accuracy'
  feedback_value DECIMAL(5,2), -- Rating score (1-5 or 1-10)
  feedback_text TEXT,
  context_data JSONB DEFAULT '{}',
  ai_provider VARCHAR(100),
  ai_model VARCHAR(100),
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_learning_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_name VARCHAR(255) NOT NULL,
  experiment_type VARCHAR(100) NOT NULL, -- 'ab_test', 'parameter_tuning', 'model_comparison'
  configuration_a JSONB NOT NULL,
  configuration_b JSONB,
  target_metric VARCHAR(100) NOT NULL, -- 'response_time', 'satisfaction', 'accuracy'
  status VARCHAR(50) DEFAULT 'running', -- 'running', 'completed', 'paused'
  participant_count INTEGER DEFAULT 0,
  results_summary JSONB DEFAULT '{}',
  statistical_significance DECIMAL(5,4),
  winner_configuration VARCHAR(10), -- 'A', 'B', 'inconclusive'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ai_adaptation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adaptation_type VARCHAR(100) NOT NULL, -- 'routing_adjustment', 'parameter_tuning', 'model_selection'
  component_name VARCHAR(255) NOT NULL, -- 'ai-orchestrator', 'ai-memory-manager', etc.
  old_configuration JSONB,
  new_configuration JSONB NOT NULL,
  performance_before JSONB,
  performance_after JSONB,
  improvement_score DECIMAL(5,4),
  adaptation_reason TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- Advanced NLP Tables
CREATE TABLE IF NOT EXISTS ai_nlp_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id VARCHAR(255),
  content_type VARCHAR(100), -- 'message', 'document', 'conversation', 'comment'
  original_text TEXT NOT NULL,
  language_detected VARCHAR(10),
  sentiment_score DECIMAL(5,4), -- -1 to 1 (negative to positive)
  sentiment_confidence DECIMAL(5,4),
  emotion_analysis JSONB DEFAULT '{}', -- joy, anger, fear, sadness, etc.
  intent_classification JSONB DEFAULT '{}',
  entities_extracted JSONB DEFAULT '[]',
  topics_identified JSONB DEFAULT '[]',
  complexity_score DECIMAL(5,4),
  readability_score DECIMAL(5,4),
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_content_generation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_type VARCHAR(100) NOT NULL, -- 'summary', 'response', 'recommendation', 'translation'
  input_data JSONB NOT NULL,
  generated_content TEXT NOT NULL,
  generation_model VARCHAR(100),
  quality_score DECIMAL(5,4),
  user_feedback_score DECIMAL(5,2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_language_support (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_language VARCHAR(10) NOT NULL,
  target_language VARCHAR(10),
  original_text TEXT NOT NULL,
  translated_text TEXT,
  translation_confidence DECIMAL(5,4),
  translation_model VARCHAR(100),
  user_id UUID,
  session_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Performance Monitoring Tables
CREATE TABLE IF NOT EXISTS ai_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type VARCHAR(100) NOT NULL, -- 'response_time', 'accuracy', 'cost', 'throughput', 'error_rate'
  component_name VARCHAR(255) NOT NULL, -- 'ai-orchestrator', 'openai', 'anthropic', 'google'
  metric_value DECIMAL(10,4) NOT NULL,
  metric_unit VARCHAR(50), -- 'ms', 'seconds', 'usd', 'percentage', 'count'
  measurement_context JSONB DEFAULT '{}',
  benchmark_value DECIMAL(10,4),
  threshold_exceeded BOOLEAN DEFAULT FALSE,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_cost_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(100) NOT NULL, -- 'openai', 'anthropic', 'google'
  model_name VARCHAR(100) NOT NULL,
  usage_type VARCHAR(100) NOT NULL, -- 'input_tokens', 'output_tokens', 'requests'
  usage_amount INTEGER NOT NULL,
  cost_per_unit DECIMAL(10,8),
  total_cost DECIMAL(10,4),
  user_id UUID,
  session_id VARCHAR(255),
  request_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_anomaly_detection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anomaly_type VARCHAR(100) NOT NULL, -- 'performance_degradation', 'cost_spike', 'error_surge', 'unusual_pattern'
  component_affected VARCHAR(255) NOT NULL,
  severity_level VARCHAR(50) NOT NULL, -- 'low', 'medium', 'high', 'critical'
  anomaly_score DECIMAL(5,4) NOT NULL,
  baseline_value DECIMAL(10,4),
  observed_value DECIMAL(10,4),
  deviation_percentage DECIMAL(5,2),
  anomaly_description TEXT,
  resolution_status VARCHAR(50) DEFAULT 'open', -- 'open', 'investigating', 'resolved', 'false_positive'
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_predictions_model_id ON ai_predictions(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_type ON ai_predictions(prediction_type);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_entity ON ai_predictions(target_entity_id, target_entity_type);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_user_id ON ai_feedback_collection(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_type ON ai_feedback_collection(feedback_type);
CREATE INDEX IF NOT EXISTS idx_ai_nlp_content_type ON ai_nlp_analysis(content_type);
CREATE INDEX IF NOT EXISTS idx_ai_performance_component ON ai_performance_metrics(component_name);
CREATE INDEX IF NOT EXISTS idx_ai_performance_type ON ai_performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_ai_cost_provider ON ai_cost_tracking(provider);
CREATE INDEX IF NOT EXISTS idx_ai_anomaly_component ON ai_anomaly_detection(component_affected);
CREATE INDEX IF NOT EXISTS idx_ai_anomaly_severity ON ai_anomaly_detection(severity_level);

-- Create a view for real-time AI system health
CREATE OR REPLACE VIEW ai_system_health AS
SELECT 
  component_name,
  AVG(CASE WHEN metric_type = 'response_time' THEN metric_value END) as avg_response_time,
  AVG(CASE WHEN metric_type = 'accuracy' THEN metric_value END) as avg_accuracy,
  AVG(CASE WHEN metric_type = 'error_rate' THEN metric_value END) as avg_error_rate,
  SUM(CASE WHEN metric_type = 'cost' THEN metric_value END) as total_cost_24h,
  COUNT(*) as total_measurements,
  MAX(recorded_at) as last_measurement
FROM ai_performance_metrics 
WHERE recorded_at > NOW() - INTERVAL '24 hours'
GROUP BY component_name;;