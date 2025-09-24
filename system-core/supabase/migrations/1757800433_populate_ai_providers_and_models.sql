-- Migration: populate_ai_providers_and_models
-- Created at: 1757800433

-- Insert AI providers
INSERT INTO ai_providers (name, api_base_url, supported_models, rate_limits, pricing, is_active) VALUES
('openai', 'https://api.openai.com/v1', 
 ARRAY['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo-preview'],
 '{"requests_per_minute": 500, "tokens_per_minute": 10000}',
 '{"gpt-4": {"prompt": 0.03, "completion": 0.06}, "gpt-3.5-turbo": {"prompt": 0.0015, "completion": 0.002}}',
 true),

('anthropic', 'https://api.anthropic.com/v1',
 ARRAY['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
 '{"requests_per_minute": 50, "tokens_per_minute": 4000}',
 '{"claude-3-opus-20240229": {"prompt": 0.015, "completion": 0.075}, "claude-3-sonnet-20240229": {"prompt": 0.003, "completion": 0.015}}',
 true),

('google', 'https://generativelanguage.googleapis.com/v1beta',
 ARRAY['gemini-pro', 'gemini-pro-vision'],
 '{"requests_per_minute": 60, "tokens_per_minute": 32000}',
 '{"gemini-pro": {"prompt": 0.00025, "completion": 0.0005}}',
 true)
ON CONFLICT (name) DO UPDATE SET
  api_base_url = EXCLUDED.api_base_url,
  supported_models = EXCLUDED.supported_models,
  rate_limits = EXCLUDED.rate_limits,
  pricing = EXCLUDED.pricing,
  updated_at = CURRENT_TIMESTAMP;

-- Insert AI models for OpenAI
INSERT INTO ai_models (provider_id, name, display_name, model_type, max_tokens, supports_streaming, cost_per_token_input, cost_per_token_output, is_active) 
SELECT 
  p.id,
  'gpt-4',
  'GPT-4',
  'chat',
  8192,
  true,
  0.00003,
  0.00006,
  true
FROM ai_providers p WHERE p.name = 'openai'
ON CONFLICT (provider_id, name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  max_tokens = EXCLUDED.max_tokens,
  cost_per_token_input = EXCLUDED.cost_per_token_input,
  cost_per_token_output = EXCLUDED.cost_per_token_output;

INSERT INTO ai_models (provider_id, name, display_name, model_type, max_tokens, supports_streaming, cost_per_token_input, cost_per_token_output, is_active)
SELECT 
  p.id,
  'gpt-3.5-turbo',
  'GPT-3.5 Turbo',
  'chat',
  4096,
  true,
  0.0000015,
  0.000002,
  true
FROM ai_providers p WHERE p.name = 'openai'
ON CONFLICT (provider_id, name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  max_tokens = EXCLUDED.max_tokens,
  cost_per_token_input = EXCLUDED.cost_per_token_input,
  cost_per_token_output = EXCLUDED.cost_per_token_output;

-- Insert AI models for Anthropic
INSERT INTO ai_models (provider_id, name, display_name, model_type, max_tokens, supports_streaming, cost_per_token_input, cost_per_token_output, is_active)
SELECT 
  p.id,
  'claude-3-opus-20240229',
  'Claude 3 Opus',
  'chat',
  200000,
  false,
  0.000015,
  0.000075,
  true
FROM ai_providers p WHERE p.name = 'anthropic'
ON CONFLICT (provider_id, name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  max_tokens = EXCLUDED.max_tokens,
  cost_per_token_input = EXCLUDED.cost_per_token_input,
  cost_per_token_output = EXCLUDED.cost_per_token_output;

INSERT INTO ai_models (provider_id, name, display_name, model_type, max_tokens, supports_streaming, cost_per_token_input, cost_per_token_output, is_active)
SELECT 
  p.id,
  'claude-3-sonnet-20240229',
  'Claude 3 Sonnet',
  'chat',
  200000,
  false,
  0.000003,
  0.000015,
  true
FROM ai_providers p WHERE p.name = 'anthropic'
ON CONFLICT (provider_id, name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  max_tokens = EXCLUDED.max_tokens,
  cost_per_token_input = EXCLUDED.cost_per_token_input,
  cost_per_token_output = EXCLUDED.cost_per_token_output;

-- Insert AI models for Google
INSERT INTO ai_models (provider_id, name, display_name, model_type, max_tokens, supports_streaming, cost_per_token_input, cost_per_token_output, is_active)
SELECT 
  p.id,
  'gemini-pro',
  'Gemini Pro',
  'chat',
  32768,
  false,
  0.00000025,
  0.0000005,
  true
FROM ai_providers p WHERE p.name = 'google'
ON CONFLICT (provider_id, name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  max_tokens = EXCLUDED.max_tokens,
  cost_per_token_input = EXCLUDED.cost_per_token_input,
  cost_per_token_output = EXCLUDED.cost_per_token_output;;