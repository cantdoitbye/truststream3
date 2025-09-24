-- Migration: enhance_coordination_sessions_table
-- Created at: 1758230585

-- Enhance existing agent_coordination_sessions table for Inter-Layer Management System

-- Add missing columns to agent_coordination_sessions
ALTER TABLE agent_coordination_sessions 
ADD COLUMN IF NOT EXISTS session_id VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS coordinator_agent_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS participant_agents TEXT[],
ADD COLUMN IF NOT EXISTS coordination_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS session_context JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS governance_rules JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS outcome_summary JSONB DEFAULT '{}';

-- Update existing records to populate the new fields
UPDATE agent_coordination_sessions 
SET session_id = COALESCE(session_id, 'legacy_' || id::text),
    coordinator_agent_id = COALESCE(coordinator_agent_id, 'system_coordinator'),
    participant_agents = COALESCE(participant_agents, agents),
    coordination_type = COALESCE(coordination_type, strategy, 'legacy_coordination'),
    session_context = COALESCE(session_context, coordination_data, '{}'),
    governance_rules = COALESCE(governance_rules, '{}'),
    started_at = COALESCE(started_at, created_at),
    outcome_summary = COALESCE(outcome_summary, '{}')
WHERE session_id IS NULL;;