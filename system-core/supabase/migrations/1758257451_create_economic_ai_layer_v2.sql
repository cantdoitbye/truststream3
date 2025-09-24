-- Migration: create_economic_ai_layer_v2
-- Created at: 1758257451

-- Economic AI Layer with DAO Formation and TrustCoin Integration v2
-- Created for TrustStream v4.0
-- This migration creates the complete economic infrastructure for agent interactions
-- Using 'economic_' prefix to distinguish from existing tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Economic Trust Scores Table (agent-focused)
-- Manages reputation scores for agents based on their behavior and performance
CREATE TABLE IF NOT EXISTS economic_trust_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agent_registry(id) ON DELETE CASCADE,
    current_score NUMERIC(10,2) NOT NULL DEFAULT 100.00,
    score_history JSONB DEFAULT '[]'::JSONB,
    factors JSONB DEFAULT '{}'::JSONB,
    performance_metrics JSONB DEFAULT '{}'::JSONB,
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT economic_trust_scores_score_range CHECK (current_score >= 0 AND current_score <= 1000),
    CONSTRAINT economic_trust_scores_agent_unique UNIQUE (agent_id)
);

-- TrustCoin Transactions Table
-- Tracks all TrustCoin transactions including minting, transfers, rewards, and penalties
CREATE TABLE IF NOT EXISTS trust_coin_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_agent_id UUID REFERENCES agent_registry(id) ON DELETE SET NULL,
    to_agent_id UUID REFERENCES agent_registry(id) ON DELETE SET NULL,
    amount NUMERIC(15,2) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    blockchain_hash VARCHAR(128),
    gas_fee NUMERIC(15,8),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT trust_coin_valid_type CHECK (transaction_type IN ('mint', 'transfer', 'burn', 'reward', 'penalty', 'stake', 'unstake')),
    CONSTRAINT trust_coin_positive_amount CHECK (amount > 0),
    CONSTRAINT trust_coin_valid_status CHECK (status IN ('pending', 'confirmed', 'failed', 'cancelled')),
    CONSTRAINT trust_coin_transfer_agents CHECK (
        (transaction_type = 'transfer' AND from_agent_id IS NOT NULL AND to_agent_id IS NOT NULL) OR
        (transaction_type = 'mint' AND from_agent_id IS NULL AND to_agent_id IS NOT NULL) OR
        (transaction_type = 'burn' AND from_agent_id IS NOT NULL AND to_agent_id IS NULL) OR
        (transaction_type IN ('reward', 'penalty', 'stake', 'unstake'))
    )
);

-- Economic DAO Members Table
-- Manages DAO membership and voting power for agents
CREATE TABLE IF NOT EXISTS economic_dao_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agent_registry(id) ON DELETE CASCADE,
    join_date TIMESTAMPTZ DEFAULT NOW(),
    voting_power NUMERIC(10,2) DEFAULT 1.00,
    reputation_level VARCHAR(20) DEFAULT 'bronze',
    stake_amount NUMERIC(15,2) DEFAULT 0.00,
    total_proposals_submitted INTEGER DEFAULT 0,
    total_votes_cast INTEGER DEFAULT 0,
    governance_participation_score NUMERIC(5,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT economic_dao_members_agent_unique UNIQUE (agent_id),
    CONSTRAINT economic_dao_members_valid_reputation CHECK (reputation_level IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
    CONSTRAINT economic_dao_members_positive_voting_power CHECK (voting_power >= 0),
    CONSTRAINT economic_dao_members_positive_stake CHECK (stake_amount >= 0),
    CONSTRAINT economic_dao_members_valid_participation CHECK (governance_participation_score >= 0 AND governance_participation_score <= 100)
);

-- Economic DAO Proposals Table
-- Manages governance proposals within the economic DAO
CREATE TABLE IF NOT EXISTS economic_dao_proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposer_id UUID NOT NULL REFERENCES agent_registry(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    proposal_type VARCHAR(30) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    voting_start TIMESTAMPTZ,
    voting_end TIMESTAMPTZ,
    execution_date TIMESTAMPTZ,
    required_quorum NUMERIC(5,2) DEFAULT 50.00,
    required_majority NUMERIC(5,2) DEFAULT 60.00,
    votes_for INTEGER DEFAULT 0,
    votes_against INTEGER DEFAULT 0,
    votes_abstain INTEGER DEFAULT 0,
    total_voting_power_for NUMERIC(15,2) DEFAULT 0.00,
    total_voting_power_against NUMERIC(15,2) DEFAULT 0.00,
    total_voting_power_abstain NUMERIC(15,2) DEFAULT 0.00,
    proposal_data JSONB DEFAULT '{}'::JSONB,
    execution_result JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT economic_dao_proposals_valid_type CHECK (proposal_type IN (
        'parameter_change', 'fund_allocation', 'member_addition', 'member_removal', 
        'treasury_management', 'system_upgrade', 'partnership', 'other'
    )),
    CONSTRAINT economic_dao_proposals_valid_status CHECK (status IN (
        'draft', 'active', 'passed', 'rejected', 'expired', 'executed', 'cancelled'
    )),
    CONSTRAINT economic_dao_proposals_valid_voting_period CHECK (voting_end > voting_start),
    CONSTRAINT economic_dao_proposals_valid_quorum CHECK (required_quorum >= 0 AND required_quorum <= 100),
    CONSTRAINT economic_dao_proposals_valid_majority CHECK (required_majority >= 0 AND required_majority <= 100)
);

-- Economic DAO Votes Table
-- Records individual votes on economic DAO proposals
CREATE TABLE IF NOT EXISTS economic_dao_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID NOT NULL REFERENCES economic_dao_proposals(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES agent_registry(id) ON DELETE CASCADE,
    vote_choice VARCHAR(10) NOT NULL,
    voting_power_used NUMERIC(10,2) NOT NULL,
    vote_metadata JSONB DEFAULT '{}'::JSONB,
    vote_signature VARCHAR(256),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT economic_dao_votes_valid_choice CHECK (vote_choice IN ('for', 'against', 'abstain')),
    CONSTRAINT economic_dao_votes_positive_power CHECK (voting_power_used > 0),
    CONSTRAINT economic_dao_votes_unique_vote UNIQUE (proposal_id, voter_id)
);

-- Regional Pricing Tiers Table
-- Manages regional pricing strategies for different markets
CREATE TABLE IF NOT EXISTS regional_pricing_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_code VARCHAR(3) NOT NULL,
    region_name VARCHAR(100) NOT NULL,
    base_multiplier NUMERIC(5,4) NOT NULL DEFAULT 1.0000,
    currency_code VARCHAR(3) NOT NULL,
    service_type VARCHAR(20) NOT NULL,
    price_per_unit NUMERIC(10,4) NOT NULL,
    price_per_compute_hour NUMERIC(10,4),
    price_per_storage_gb NUMERIC(10,4),
    price_per_bandwidth_gb NUMERIC(10,4),
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    pricing_metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT regional_pricing_valid_service CHECK (service_type IN ('basic', 'premium', 'enterprise', 'developer', 'research')),
    CONSTRAINT regional_pricing_positive_multiplier CHECK (base_multiplier > 0),
    CONSTRAINT regional_pricing_positive_price CHECK (price_per_unit > 0),
    CONSTRAINT regional_pricing_valid_period CHECK (effective_until IS NULL OR effective_until > effective_from),
    CONSTRAINT regional_pricing_unique_active UNIQUE (region_code, service_type, effective_from)
);

-- Economic Analytics Table
-- Tracks economic metrics and system health
CREATE TABLE IF NOT EXISTS economic_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_type VARCHAR(50) NOT NULL,
    metric_value NUMERIC(20,6) NOT NULL,
    metric_metadata JSONB DEFAULT '{}'::JSONB,
    aggregation_period VARCHAR(20),
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT economic_analytics_valid_type CHECK (metric_type IN (
        'total_trustcoin_supply', 'total_transactions', 'average_trust_score',
        'dao_participation_rate', 'proposal_success_rate', 'revenue_per_region',
        'compute_utilization', 'storage_utilization', 'bandwidth_utilization'
    )),
    CONSTRAINT economic_analytics_valid_period CHECK (aggregation_period IN ('hourly', 'daily', 'weekly', 'monthly', 'yearly'))
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_economic_trust_scores_agent_id ON economic_trust_scores(agent_id);
CREATE INDEX IF NOT EXISTS idx_economic_trust_scores_current_score ON economic_trust_scores(current_score DESC);
CREATE INDEX IF NOT EXISTS idx_economic_trust_scores_last_calculated ON economic_trust_scores(last_calculated_at);

CREATE INDEX IF NOT EXISTS idx_trust_coin_from_agent ON trust_coin_transactions(from_agent_id);
CREATE INDEX IF NOT EXISTS idx_trust_coin_to_agent ON trust_coin_transactions(to_agent_id);
CREATE INDEX IF NOT EXISTS idx_trust_coin_type ON trust_coin_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_trust_coin_status ON trust_coin_transactions(status);
CREATE INDEX IF NOT EXISTS idx_trust_coin_created_at ON trust_coin_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_economic_dao_members_agent_id ON economic_dao_members(agent_id);
CREATE INDEX IF NOT EXISTS idx_economic_dao_members_active ON economic_dao_members(is_active);
CREATE INDEX IF NOT EXISTS idx_economic_dao_members_reputation ON economic_dao_members(reputation_level);
CREATE INDEX IF NOT EXISTS idx_economic_dao_members_voting_power ON economic_dao_members(voting_power DESC);

CREATE INDEX IF NOT EXISTS idx_economic_dao_proposals_proposer ON economic_dao_proposals(proposer_id);
CREATE INDEX IF NOT EXISTS idx_economic_dao_proposals_status ON economic_dao_proposals(status);
CREATE INDEX IF NOT EXISTS idx_economic_dao_proposals_type ON economic_dao_proposals(proposal_type);
CREATE INDEX IF NOT EXISTS idx_economic_dao_proposals_voting_period ON economic_dao_proposals(voting_start, voting_end);

CREATE INDEX IF NOT EXISTS idx_economic_dao_votes_proposal ON economic_dao_votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_economic_dao_votes_voter ON economic_dao_votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_economic_dao_votes_choice ON economic_dao_votes(vote_choice);

CREATE INDEX IF NOT EXISTS idx_regional_pricing_region ON regional_pricing_tiers(region_code);
CREATE INDEX IF NOT EXISTS idx_regional_pricing_service ON regional_pricing_tiers(service_type);
CREATE INDEX IF NOT EXISTS idx_regional_pricing_active ON regional_pricing_tiers(is_active);
CREATE INDEX IF NOT EXISTS idx_regional_pricing_effective ON regional_pricing_tiers(effective_from, effective_until);

CREATE INDEX IF NOT EXISTS idx_economic_analytics_type ON economic_analytics(metric_type);
CREATE INDEX IF NOT EXISTS idx_economic_analytics_recorded ON economic_analytics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_economic_analytics_period ON economic_analytics(aggregation_period);

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE economic_trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE economic_dao_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE economic_dao_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE economic_dao_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE regional_pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE economic_analytics ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (can be customized based on security requirements)
CREATE POLICY "Enable read access for all users" ON economic_trust_scores FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON trust_coin_transactions FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON economic_dao_members FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON economic_dao_proposals FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON economic_dao_votes FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON regional_pricing_tiers FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON economic_analytics FOR SELECT USING (true);

-- Create functions for automatic timestamp updates (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_economic_trust_scores_updated_at ON economic_trust_scores;
CREATE TRIGGER update_economic_trust_scores_updated_at BEFORE UPDATE ON economic_trust_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_economic_dao_members_updated_at ON economic_dao_members;
CREATE TRIGGER update_economic_dao_members_updated_at BEFORE UPDATE ON economic_dao_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_economic_dao_proposals_updated_at ON economic_dao_proposals;
CREATE TRIGGER update_economic_dao_proposals_updated_at BEFORE UPDATE ON economic_dao_proposals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_regional_pricing_updated_at ON regional_pricing_tiers;
CREATE TRIGGER update_regional_pricing_updated_at BEFORE UPDATE ON regional_pricing_tiers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for analytics and reporting
DROP VIEW IF EXISTS economic_dao_governance_summary;
CREATE VIEW economic_dao_governance_summary AS
SELECT 
    COUNT(*) as total_members,
    AVG(voting_power) as avg_voting_power,
    SUM(stake_amount) as total_staked,
    AVG(governance_participation_score) as avg_participation
FROM economic_dao_members 
WHERE is_active = true;

DROP VIEW IF EXISTS economic_proposal_statistics;
CREATE VIEW economic_proposal_statistics AS
SELECT 
    proposal_type,
    status,
    COUNT(*) as count,
    AVG(votes_for + votes_against + votes_abstain) as avg_total_votes,
    AVG(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) as success_rate
FROM economic_dao_proposals 
GROUP BY proposal_type, status;

DROP VIEW IF EXISTS economic_trust_score_distribution;
CREATE VIEW economic_trust_score_distribution AS
SELECT 
    CASE 
        WHEN current_score >= 900 THEN 'Excellent (900-1000)'
        WHEN current_score >= 750 THEN 'Good (750-899)'
        WHEN current_score >= 500 THEN 'Average (500-749)'
        WHEN current_score >= 250 THEN 'Poor (250-499)'
        ELSE 'Critical (0-249)'
    END as score_range,
    COUNT(*) as agent_count,
    AVG(current_score) as avg_score
FROM economic_trust_scores
GROUP BY 
    CASE 
        WHEN current_score >= 900 THEN 'Excellent (900-1000)'
        WHEN current_score >= 750 THEN 'Good (750-899)'
        WHEN current_score >= 500 THEN 'Average (500-749)'
        WHEN current_score >= 250 THEN 'Poor (250-499)'
        ELSE 'Critical (0-249)'
    END;

DROP VIEW IF EXISTS economic_health_dashboard;
CREATE VIEW economic_health_dashboard AS
SELECT 
    (SELECT COUNT(*) FROM economic_dao_members WHERE is_active = true) as active_dao_members,
    (SELECT COUNT(*) FROM economic_dao_proposals WHERE status = 'active') as active_proposals,
    (SELECT COALESCE(SUM(amount), 0) FROM trust_coin_transactions WHERE transaction_type = 'mint' AND status = 'confirmed') as total_minted_coins,
    (SELECT COUNT(*) FROM trust_coin_transactions WHERE created_at >= NOW() - INTERVAL '24 hours') as daily_transactions,
    (SELECT COALESCE(AVG(current_score), 0) FROM economic_trust_scores) as avg_trust_score;

-- Comments for documentation
COMMENT ON TABLE economic_trust_scores IS 'Reputation scores for agents based on behavior and performance in the economic layer';
COMMENT ON TABLE trust_coin_transactions IS 'All TrustCoin transactions including minting, transfers, rewards, and penalties';
COMMENT ON TABLE economic_dao_members IS 'Economic DAO membership and voting power for agents';
COMMENT ON TABLE economic_dao_proposals IS 'Governance proposals within the economic DAO';
COMMENT ON TABLE economic_dao_votes IS 'Individual votes on economic DAO proposals';
COMMENT ON TABLE regional_pricing_tiers IS 'Regional pricing strategies for different markets';
COMMENT ON TABLE economic_analytics IS 'Economic metrics and system health tracking';

-- Success message
SELECT 'Economic AI Layer schema created successfully!' as status;;