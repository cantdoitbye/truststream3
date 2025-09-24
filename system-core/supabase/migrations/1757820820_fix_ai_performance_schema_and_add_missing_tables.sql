-- Migration: fix_ai_performance_schema_and_add_missing_tables
-- Created at: 1757820820

-- Add missing columns to ai_performance_metrics table
ALTER TABLE ai_performance_metrics 
  ADD COLUMN IF NOT EXISTS response_time_ms INTEGER,
  ADD COLUMN IF NOT EXISTS quality_score NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS cost_estimate NUMERIC(10,6),
  ADD COLUMN IF NOT EXISTS provider VARCHAR(50),
  ADD COLUMN IF NOT EXISTS model_used VARCHAR(100),
  ADD COLUMN IF NOT EXISTS user_satisfaction NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS error_occurred BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS request_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create learning_feedback table
CREATE TABLE IF NOT EXISTS learning_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  interaction_id VARCHAR(255) NOT NULL,
  feedback_type VARCHAR(50) NOT NULL CHECK (feedback_type IN ('satisfaction', 'quality', 'usefulness', 'accuracy')),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comments TEXT,
  context JSONB,
  sentiment_analysis JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  metadata JSONB
);

-- Create ab_test_configs table
CREATE TABLE IF NOT EXISTS ab_test_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name VARCHAR(255) NOT NULL UNIQUE,
  test_type VARCHAR(100) NOT NULL CHECK (test_type IN ('model_comparison', 'parameter_tuning', 'routing_strategy')),
  variant_a JSONB NOT NULL,
  variant_b JSONB NOT NULL,
  sample_size INTEGER NOT NULL DEFAULT 100,
  required_sample_size INTEGER,
  success_metrics JSONB,
  confidence_level NUMERIC(3,2) DEFAULT 0.95,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  results_a JSONB DEFAULT '{"samples": 0, "metrics": {}, "conversions": 0}'::jsonb,
  results_b JSONB DEFAULT '{"samples": 0, "metrics": {}, "conversions": 0}'::jsonb,
  statistical_significance BOOLEAN DEFAULT FALSE,
  p_value NUMERIC(10,8),
  confidence_interval JSONB,
  winner VARCHAR(10),
  effect_size NUMERIC(6,4)
);

-- Create ab_test_tracking table
CREATE TABLE IF NOT EXISTS ab_test_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES ab_test_configs(id),
  traffic_split NUMERIC(3,2) DEFAULT 0.5,
  allocation_method VARCHAR(50) DEFAULT 'random_hash',
  tracking_events JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create optimization_history table
CREATE TABLE IF NOT EXISTS optimization_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target VARCHAR(100) NOT NULL,
  scope VARCHAR(100),
  old_config JSONB,
  new_config JSONB,
  expected_improvement NUMERIC(6,4),
  ai_rationale TEXT,
  confidence NUMERIC(3,2),
  applied BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analysis_history table  
CREATE TABLE IF NOT EXISTS analysis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_type VARCHAR(100) NOT NULL,
  time_range VARCHAR(50),
  metrics_count INTEGER,
  feedback_count INTEGER,
  ai_analysis JSONB,
  raw_summary JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trained_models table
CREATE TABLE IF NOT EXISTS trained_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type VARCHAR(100) NOT NULL,
  training_data_size INTEGER,
  training_examples INTEGER,
  status VARCHAR(50) DEFAULT 'training_initiated',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  performance_metrics JSONB,
  model_id VARCHAR(255)
);

-- Create behavior_predictions table
CREATE TABLE IF NOT EXISTS behavior_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  prediction_type VARCHAR(100) NOT NULL,
  time_horizon VARCHAR(50),
  predictions JSONB NOT NULL,
  interaction_history_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  validation_date TIMESTAMP WITH TIME ZONE
);

-- Create routing_history table
CREATE TABLE IF NOT EXISTS routing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  old_config JSONB,
  new_config JSONB,
  strategy VARCHAR(100),
  performance_data JSONB,
  applied BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ai_system_config table
CREATE TABLE IF NOT EXISTS ai_system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routing_strategy VARCHAR(100) DEFAULT 'performance_based',
  model_weights JSONB DEFAULT '{"openai": 0.6, "anthropic": 0.3, "google": 0.1}'::jsonb,
  timeout_settings JSONB DEFAULT '{"primary": 30000, "fallback": 15000}'::jsonb,
  quality_thresholds JSONB DEFAULT '{"min_acceptable": 0.7}'::jsonb,
  routing_rules JSONB,
  fallback_strategy JSONB,
  caching_enabled BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE
);

-- Create nlp_analysis_results table
CREATE TABLE IF NOT EXISTS nlp_analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text_content TEXT NOT NULL,
  analysis_type VARCHAR(100) NOT NULL,
  sentiment_analysis JSONB,
  intent_recognition JSONB,
  entity_extraction JSONB,
  language_detection JSONB,
  content_generation JSONB,
  translation_results JSONB,
  comprehensive_analysis JSONB,
  confidence_score NUMERIC(3,2),
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID,
  session_id VARCHAR(255)
);

-- Create predictive_models table (renamed from prediction_models to match function expectations)
CREATE TABLE IF NOT EXISTS predictive_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name VARCHAR(255) NOT NULL UNIQUE,
  model_type VARCHAR(100) NOT NULL,
  target_variable VARCHAR(100),
  features JSONB,
  hyperparameters JSONB,
  performance_metrics JSONB,
  training_data_info JSONB,
  model_version VARCHAR(50) DEFAULT '1.0.0',
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'training', 'deprecated')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_trained TIMESTAMP WITH TIME ZONE,
  accuracy_score NUMERIC(5,4),
  confidence_threshold NUMERIC(3,2) DEFAULT 0.7
);

-- Create user_interactions table for behavior prediction
CREATE TABLE IF NOT EXISTS user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  interaction_type VARCHAR(100) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rating INTEGER,
  feedback_type VARCHAR(50),
  session_duration INTEGER,
  query_complexity VARCHAR(50),
  satisfaction_score NUMERIC(3,2),
  context JSONB
);

-- Insert default system configuration
INSERT INTO ai_system_config (routing_strategy, model_weights, timeout_settings, quality_thresholds, active)
VALUES (
  'performance_based',
  '{"openai": 0.6, "anthropic": 0.3, "google": 0.1}'::jsonb,
  '{"primary": 30000, "fallback": 15000}'::jsonb,
  '{"min_acceptable": 0.7}'::jsonb,
  true
) ON CONFLICT DO NOTHING;

-- Insert sample predictive models
INSERT INTO predictive_models (model_name, model_type, target_variable, features, status, accuracy_score)
VALUES 
  ('user_behavior_predictor', 'classification', 'user_engagement', '["session_duration", "query_frequency", "satisfaction_scores"]'::jsonb, 'active', 0.85),
  ('trust_evolution_model', 'regression', 'trust_score_change', '["interaction_history", "community_feedback", "reputation_metrics"]'::jsonb, 'active', 0.78),
  ('community_dynamics_model', 'clustering', 'community_health', '["member_engagement", "content_quality", "growth_metrics"]'::jsonb, 'active', 0.82),
  ('system_performance_model', 'time_series', 'performance_metrics', '["response_times", "error_rates", "resource_usage"]'::jsonb, 'active', 0.91)
ON CONFLICT (model_name) DO NOTHING;;