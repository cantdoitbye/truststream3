-- Migration: add_economic_layer_schema
-- Created at: 1758257127

-- TrustStream v4.0 Economic AI Layer Database Schema
-- Comprehensive economic incentive system with DAO formation and TrustCoin integration

-- 1. TrustScore System Tables
CREATE TABLE IF NOT EXISTS trust_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    agent_id VARCHAR,
    current_score NUMERIC(10,2) DEFAULT 0,
    lifetime_score NUMERIC(15,2) DEFAULT 0,
    decay_rate NUMERIC(3,4) DEFAULT 0.001,
    last_decay_applied TIMESTAMP WITH TIME ZONE DEFAULT now(),
    score_tier VARCHAR CHECK (score_tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
    trust_level INTEGER DEFAULT 1,
    validation_status VARCHAR DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validated', 'flagged')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trust_score_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    agent_id VARCHAR,
    event_type VARCHAR NOT NULL CHECK (event_type IN ('shared_prompt', 'community_work', 'abuse_penalty', 'ai_service_use', 'dao_participation', 'governance_vote')),
    points_awarded NUMERIC(6,2) NOT NULL,
    event_context JSONB DEFAULT '{}',
    source_system VARCHAR, -- 'llm_nexus', 'community_agent', 'governance', etc.
    transaction_hash VARCHAR, -- for blockchain-verified events
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. TrustCoin Tokenization System Tables
CREATE TABLE IF NOT EXISTS trustcoin_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    wallet_address VARCHAR UNIQUE,
    network VARCHAR DEFAULT 'polygon' CHECK (network IN ('polygon', 'solana', 'ethereum')),
    balance NUMERIC(20,8) DEFAULT 0,
    staked_balance NUMERIC(20,8) DEFAULT 0,
    pending_balance NUMERIC(20,8) DEFAULT 0,
    wallet_type VARCHAR DEFAULT 'custodial' CHECK (wallet_type IN ('custodial', 'self_custody', 'multi_sig')),
    private_key_encrypted TEXT, -- encrypted storage
    public_key VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trustcoin_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_hash VARCHAR UNIQUE NOT NULL,
    from_wallet_id UUID REFERENCES trustcoin_wallets(id),
    to_wallet_id UUID REFERENCES trustcoin_wallets(id),
    amount NUMERIC(20,8) NOT NULL,
    transaction_type VARCHAR CHECK (transaction_type IN ('mint', 'transfer', 'stake', 'unstake', 'burn', 'reward', 'penalty')),
    network VARCHAR NOT NULL,
    gas_fee NUMERIC(15,8),
    block_number BIGINT,
    confirmation_status VARCHAR DEFAULT 'pending' CHECK (confirmation_status IN ('pending', 'confirmed', 'failed')),
    trust_score_event_id UUID REFERENCES trust_score_events(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reputation_stakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    staked_amount NUMERIC(20,8) NOT NULL,
    stake_type VARCHAR CHECK (stake_type IN ('community_leadership', 'ai_service_provider', 'governance_participation', 'dao_membership')),
    stake_duration_days INTEGER DEFAULT 30,
    stake_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
    stake_end TIMESTAMP WITH TIME ZONE,
    yield_rate NUMERIC(5,4) DEFAULT 0.05, -- 5% annual yield
    reputation_multiplier NUMERIC(3,2) DEFAULT 1.0,
    slashing_conditions JSONB DEFAULT '{}',
    status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'unstaking', 'slashed', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. DAO Formation and Management Tables
CREATE TABLE IF NOT EXISTS dao_communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_name VARCHAR NOT NULL,
    community_id VARCHAR UNIQUE NOT NULL,
    dao_status VARCHAR DEFAULT 'forming' CHECK (dao_status IN ('forming', 'proposed', 'voting', 'approved', 'active', 'dissolved')),
    maturity_score NUMERIC(5,2) DEFAULT 0,
    member_count INTEGER DEFAULT 0,
    trust_score_threshold NUMERIC(10,2) DEFAULT 1000,
    formation_requirements JSONB DEFAULT '{}',
    ai_leader_proposal JSONB,
    governance_structure JSONB DEFAULT '{}',
    treasury_address VARCHAR,
    voting_power_distribution JSONB DEFAULT '{}',
    compliance_region VARCHAR,
    legal_entity_type VARCHAR, -- 'LLP', 'DAO', 'Cooperative'
    formation_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dao_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dao_id UUID REFERENCES dao_communities(id),
    proposer_id UUID NOT NULL,
    proposal_type VARCHAR CHECK (proposal_type IN ('formation', 'governance_change', 'treasury_allocation', 'member_admission', 'dissolution')),
    title VARCHAR NOT NULL,
    description TEXT,
    proposal_data JSONB DEFAULT '{}',
    voting_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
    voting_end TIMESTAMP WITH TIME ZONE,
    quorum_required NUMERIC(5,2) DEFAULT 51.0, -- percentage
    approval_threshold NUMERIC(5,2) DEFAULT 66.7, -- percentage
    current_votes_for INTEGER DEFAULT 0,
    current_votes_against INTEGER DEFAULT 0,
    total_eligible_voters INTEGER DEFAULT 0,
    status VARCHAR DEFAULT 'active' CHECK (status IN ('draft', 'active', 'passed', 'rejected', 'executed')),
    execution_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dao_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID REFERENCES dao_proposals(id),
    voter_id UUID NOT NULL,
    vote_choice VARCHAR CHECK (vote_choice IN ('for', 'against', 'abstain')),
    voting_power NUMERIC(15,2) DEFAULT 1.0,
    vote_weight NUMERIC(15,2) DEFAULT 1.0, -- weighted by trust score/tokens
    vote_reason TEXT,
    transaction_hash VARCHAR, -- blockchain verification
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(proposal_id, voter_id)
);

-- 4. Smart Contract Integration Tables
CREATE TABLE IF NOT EXISTS smart_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_name VARCHAR NOT NULL,
    contract_type VARCHAR CHECK (contract_type IN ('dao_formation', 'token_management', 'governance', 'treasury', 'compliance')),
    network VARCHAR NOT NULL,
    contract_address VARCHAR NOT NULL,
    abi JSONB NOT NULL,
    deployment_hash VARCHAR,
    deployer_address VARCHAR,
    dao_id UUID REFERENCES dao_communities(id),
    version VARCHAR DEFAULT '1.0.0',
    audit_status VARCHAR DEFAULT 'pending' CHECK (audit_status IN ('pending', 'in_progress', 'passed', 'failed')),
    security_score NUMERIC(3,1), -- out of 10
    gas_optimization_level VARCHAR DEFAULT 'standard' CHECK (gas_optimization_level IN ('basic', 'standard', 'optimized')),
    upgrade_proxy_address VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contract_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES smart_contracts(id),
    user_id UUID NOT NULL,
    function_name VARCHAR NOT NULL,
    input_parameters JSONB DEFAULT '{}',
    transaction_hash VARCHAR UNIQUE,
    gas_used BIGINT,
    gas_price NUMERIC(20,8),
    execution_status VARCHAR DEFAULT 'pending' CHECK (execution_status IN ('pending', 'success', 'failed', 'reverted')),
    error_message TEXT,
    block_number BIGINT,
    event_logs JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Regional Economics and Ooumph Coin Tables
CREATE TABLE IF NOT EXISTS regional_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_code VARCHAR(10) NOT NULL UNIQUE, -- ISO country codes + custom regions
    region_name VARCHAR NOT NULL,
    economic_tier INTEGER CHECK (economic_tier IN (1, 2, 3, 4, 5)), -- 1=highest cost, 5=lowest cost
    base_pricing_multiplier NUMERIC(4,3) DEFAULT 1.000,
    ooumph_coin_exchange_rate NUMERIC(10,6) DEFAULT 1.000000,
    local_currency VARCHAR(3), -- ISO currency codes
    purchasing_power_index NUMERIC(6,3),
    inflation_adjustment NUMERIC(5,4) DEFAULT 0.0000,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ooumph_coin_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    balance NUMERIC(15,2) DEFAULT 0,
    earned_total NUMERIC(20,2) DEFAULT 0,
    spent_total NUMERIC(20,2) DEFAULT 0,
    community_boost_multiplier NUMERIC(3,2) DEFAULT 1.0,
    tier_multiplier NUMERIC(3,2) DEFAULT 1.0,
    region_code VARCHAR(10) REFERENCES regional_pricing(region_code),
    last_earning_event TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ooumph_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    transaction_type VARCHAR CHECK (transaction_type IN ('earn', 'spend', 'transfer', 'bonus', 'penalty')),
    amount NUMERIC(15,2) NOT NULL,
    service_type VARCHAR, -- 'ai_service', 'premium_feature', 'marketplace_item'
    service_id VARCHAR,
    community_boost NUMERIC(15,2) DEFAULT 0,
    region_adjustment NUMERIC(15,2) DEFAULT 0,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS premium_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR NOT NULL,
    service_type VARCHAR CHECK (service_type IN ('ai_model_access', 'advanced_features', 'priority_support', 'custom_integrations')),
    base_price_ooumph NUMERIC(15,2) NOT NULL,
    regional_pricing JSONB DEFAULT '{}', -- region-specific pricing
    trustcoin_price NUMERIC(20,8),
    access_requirements JSONB DEFAULT '{}', -- trust score, dao membership, etc.
    availability_regions VARCHAR[] DEFAULT '{}',
    service_tier VARCHAR DEFAULT 'standard' CHECK (service_tier IN ('basic', 'standard', 'premium', 'enterprise')),
    description TEXT,
    features JSONB DEFAULT '[]',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_trust_scores_user_id ON trust_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_trust_score_events_user_id ON trust_score_events(user_id);
CREATE INDEX IF NOT EXISTS idx_trust_score_events_created_at ON trust_score_events(created_at);
CREATE INDEX IF NOT EXISTS idx_trustcoin_wallets_user_id ON trustcoin_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_trustcoin_transactions_hash ON trustcoin_transactions(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_dao_communities_status ON dao_communities(dao_status);
CREATE INDEX IF NOT EXISTS idx_dao_proposals_dao_id ON dao_proposals(dao_id);
CREATE INDEX IF NOT EXISTS idx_dao_votes_proposal_id ON dao_votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_smart_contracts_dao_id ON smart_contracts(dao_id);
CREATE INDEX IF NOT EXISTS idx_ooumph_balances_user_id ON ooumph_coin_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_ooumph_transactions_user_id ON ooumph_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_regional_pricing_region_code ON regional_pricing(region_code);;