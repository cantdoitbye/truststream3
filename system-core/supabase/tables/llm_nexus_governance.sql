CREATE TABLE llm_nexus_governance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_type VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    target_provider_id UUID,
    configuration_changes JSONB,
    voting_power_snapshot JSONB,
    votes_for INTEGER DEFAULT 0,
    votes_against INTEGER DEFAULT 0,
    votes_abstain INTEGER DEFAULT 0,
    quorum_threshold INTEGER DEFAULT 100,
    voting_deadline TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'draft',
    execution_data JSONB,
    proposed_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);