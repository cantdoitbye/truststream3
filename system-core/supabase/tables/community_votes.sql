CREATE TABLE community_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    proposal_id UUID NOT NULL,
    vote_choice VARCHAR(20) NOT NULL,
    vote_weight DECIMAL(10,2) DEFAULT 1.0,
    voter_trust_score DECIMAL(5,2) NOT NULL,
    reasoning TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);