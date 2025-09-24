-- Migration: create_ooumph_integration_tables
-- Created at: 1757791449

-- Cross-Platform Recommendations
CREATE TABLE IF NOT EXISTS cross_platform_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    ecosystem_to_ooumph JSONB,
    ooumph_to_ecosystem JSONB,
    match_scores JSONB,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now() + interval '7 days')
);

-- Viral Mechanisms Configuration
CREATE TABLE IF NOT EXISTS viral_mechanisms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    mechanism_config JSONB NOT NULL,
    performance_metrics JSONB,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Webhook Configurations
CREATE TABLE IF NOT EXISTS webhook_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    events TEXT[] NOT NULL,
    secret TEXT NOT NULL,
    ooumph_webhook_id TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_triggered TIMESTAMP WITH TIME ZONE
);

-- Add Ooumph user ID to profiles if not exists
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS ooumph_user_id TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cross_platform_recommendations_user_id ON cross_platform_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_viral_mechanisms_user_status ON viral_mechanisms(user_id, status);
CREATE INDEX IF NOT EXISTS idx_webhook_configurations_active ON webhook_configurations(active);
CREATE INDEX IF NOT EXISTS idx_profiles_ooumph_user_id ON profiles(ooumph_user_id) WHERE ooumph_user_id IS NOT NULL;;