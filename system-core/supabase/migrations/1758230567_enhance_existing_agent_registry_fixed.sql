-- Migration: enhance_existing_agent_registry_fixed
-- Created at: 1758230567

-- Enhance existing agent_registry table for Inter-Layer Management System
-- Add missing columns needed for the new management capabilities

-- Add missing columns to agent_registry
ALTER TABLE agent_registry 
ADD COLUMN IF NOT EXISTS agent_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS layer_assignment INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS capability_vector JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS trust_score_4d JSONB DEFAULT '{"iq": 0, "appeal": 0, "social": 0, "humanity": 0}',
ADD COLUMN IF NOT EXISTS current_status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS governance_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS specialization_tags TEXT[],
ADD COLUMN IF NOT EXISTS memory_version VARCHAR(20) DEFAULT 'v1.0.0',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Update existing records to have proper values
UPDATE agent_registry 
SET agent_name = COALESCE(agent_name, agent_id),
    layer_assignment = COALESCE(layer_assignment, 1),
    capability_vector = COALESCE(capability_vector, '{}'),
    trust_score_4d = COALESCE(trust_score_4d, '{"iq": 50, "appeal": 50, "social": 50, "humanity": 50}'),
    current_status = COALESCE(current_status, status, 'active'),
    governance_level = COALESCE(governance_level, 1),
    specialization_tags = COALESCE(specialization_tags, ARRAY[agent_type]),
    memory_version = COALESCE(memory_version, 'v1.0.0'),
    metadata = COALESCE(metadata, '{}')
WHERE agent_name IS NULL OR capability_vector IS NULL;;