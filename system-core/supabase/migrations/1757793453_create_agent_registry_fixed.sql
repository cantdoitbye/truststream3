-- Migration: create_agent_registry_fixed
-- Created at: 1757793453

-- Create agent registry table for coordination
CREATE TABLE agent_registry (
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

-- Create policy to allow all operations
CREATE POLICY "Enable all for authenticated" ON agent_registry
FOR ALL USING (true);

-- Add indexes for performance
CREATE INDEX agent_registry_agent_id_idx ON agent_registry(agent_id);
CREATE INDEX agent_registry_status_idx ON agent_registry(status);
CREATE INDEX agent_registry_type_idx ON agent_registry(agent_type);;