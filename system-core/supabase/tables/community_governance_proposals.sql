CREATE TABLE community_governance_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_title VARCHAR(500) NOT NULL,
    proposal_description TEXT NOT NULL,
    proposal_type VARCHAR(100) NOT NULL,
    proposed_by UUID NOT NULL,
    voting_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    voting_end TIMESTAMP WITH TIME ZONE,
    vote_threshold DECIMAL(3,2) DEFAULT 0.51,
    current_votes_for INTEGER DEFAULT 0,
    current_votes_against INTEGER DEFAULT 0,
    current_votes_abstain INTEGER DEFAULT 0,
    total_eligible_voters INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    implementation_details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);