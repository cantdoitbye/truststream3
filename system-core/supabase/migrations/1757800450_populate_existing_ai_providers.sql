-- Migration: populate_existing_ai_providers
-- Created at: 1757800450

-- Insert AI providers using existing schema
INSERT INTO ai_providers (id, name, type, api_endpoint, status, cost_per_1k_tokens, capabilities, api_key_configured) VALUES
('openai-1', 'openai', 'llm', 'https://api.openai.com/v1/chat/completions', 'active', 30.00, 
 ARRAY['text_generation', 'conversation', 'code_generation'], true),

('anthropic-1', 'anthropic', 'llm', 'https://api.anthropic.com/v1/messages', 'active', 15.00,
 ARRAY['text_generation', 'analysis', 'creative_writing'], false),

('google-1', 'google', 'llm', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', 'active', 0.25,
 ARRAY['reasoning', 'math', 'analysis'], false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  api_endpoint = EXCLUDED.api_endpoint,
  status = EXCLUDED.status,
  cost_per_1k_tokens = EXCLUDED.cost_per_1k_tokens,
  capabilities = EXCLUDED.capabilities,
  api_key_configured = EXCLUDED.api_key_configured,
  updated_at = CURRENT_TIMESTAMP;;