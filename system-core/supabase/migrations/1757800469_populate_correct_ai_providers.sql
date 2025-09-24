-- Migration: populate_correct_ai_providers
-- Created at: 1757800469

-- Insert AI providers with correct types
INSERT INTO ai_providers (id, name, type, api_endpoint, status, cost_per_1k_tokens, success_rate, capabilities, api_key_configured) VALUES
('openai-1', 'OpenAI GPT-4', 'openai', 'https://api.openai.com/v1/chat/completions', 'active', 30.00, 0.95,
 ARRAY['text_generation', 'conversation', 'code_generation'], true),

('openai-2', 'OpenAI GPT-3.5-Turbo', 'openai', 'https://api.openai.com/v1/chat/completions', 'active', 1.50, 0.93,
 ARRAY['text_generation', 'conversation', 'analysis'], true),

('anthropic-1', 'Claude 3 Opus', 'anthropic', 'https://api.anthropic.com/v1/messages', 'active', 15.00, 0.97,
 ARRAY['text_generation', 'analysis', 'creative_writing'], false),

('anthropic-2', 'Claude 3 Sonnet', 'anthropic', 'https://api.anthropic.com/v1/messages', 'active', 3.00, 0.96,
 ARRAY['analysis', 'summarization', 'creative_writing'], false),

('google-1', 'Gemini Pro', 'google', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', 'active', 0.25, 0.90,
 ARRAY['reasoning', 'math', 'analysis'], false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  api_endpoint = EXCLUDED.api_endpoint,
  status = EXCLUDED.status,
  cost_per_1k_tokens = EXCLUDED.cost_per_1k_tokens,
  success_rate = EXCLUDED.success_rate,
  capabilities = EXCLUDED.capabilities,
  api_key_configured = EXCLUDED.api_key_configured,
  updated_at = CURRENT_TIMESTAMP;;