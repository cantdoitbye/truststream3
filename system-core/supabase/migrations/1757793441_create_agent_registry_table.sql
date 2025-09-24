-- Migration: create_agent_registry_table
-- Created at: 1757793441

-- Create agent registry table for coordination
CREATE TABLE IF NOT EXISTS agent_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT UNIQUE NOT NULL,
    agent_type TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    capabilities TEXT[] DEFAULT '{}',
    performance_metrics JSONB DEFAULT '{}',
    coordination_metadata JSONB DEFAULT '{}',
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE agent_registry ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users
CREATE POLICY "Enable all for authenticated users" ON agent_registry
FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS agent_registry_agent_id_idx ON agent_registry(agent_id);
CREATE INDEX IF NOT EXISTS agent_registry_status_idx ON agent_registry(status);
CREATE INDEX IF NOT EXISTS agent_registry_type_idx ON agent_registry(agent_type);;