-- Migration: truststream_v4_vectorgraph_architecture
-- Created at: 1758232902

-- TrustStream v4.0 VectorGraph Architecture
-- Enhanced Memory and Context Management System
-- Building upon existing vector embeddings infrastructure

-- =====================================================
-- 1. MCP-DRIVEN CONTEXT INJECTION SYSTEM
-- =====================================================

-- Enhanced Context Sessions with MCP Protocol Support
CREATE TABLE IF NOT EXISTS mcp_context_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100) UNIQUE NOT NULL,
    agent_id VARCHAR(50) REFERENCES agent_registry(agent_id),
    context_type VARCHAR(50) NOT NULL,
    session_metadata JSONB DEFAULT '{}',
    active_context_objects UUID[],
    trust_filter_config JSONB DEFAULT '{}',
    priority_levels JSONB DEFAULT '{}',
    injection_history JSONB DEFAULT '{}',
    session_status VARCHAR(20) DEFAULT 'active',
    last_injection_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- Context Injection Tracking and Performance Metrics
CREATE TABLE IF NOT EXISTS context_injection_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    injection_id VARCHAR(100) UNIQUE NOT NULL,
    session_id VARCHAR(100) REFERENCES mcp_context_sessions(session_id),
    agent_id VARCHAR(50) REFERENCES agent_registry(agent_id),
    context_objects_injected UUID[],
    injection_type VARCHAR(50) NOT NULL,
    context_size_bytes INTEGER,
    retrieval_time_ms INTEGER,
    trust_score_threshold DECIMAL(5,2),
    relevance_score DECIMAL(5,2),
    injection_success BOOLEAN DEFAULT true,
    performance_metrics JSONB DEFAULT '{}',
    injected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    trace_id VARCHAR(100),
    metadata JSONB DEFAULT '{}'
);

-- Agent Context Tags and Preferences
CREATE TABLE IF NOT EXISTS agent_context_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(50) REFERENCES agent_registry(agent_id),
    tag_category VARCHAR(50) NOT NULL,
    tag_name VARCHAR(100) NOT NULL,
    tag_weight DECIMAL(5,2) DEFAULT 1.0,
    trust_influence DECIMAL(5,2) DEFAULT 0.0,
    context_priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- 2. TRUST-SCORED MEMORY RETRIEVAL ENGINE
-- =====================================================

-- Enhanced Memory Objects with Trust Scoring
CREATE TABLE IF NOT EXISTS vectorgraph_memory_objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id VARCHAR(100) UNIQUE NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    content_data JSONB NOT NULL,
    embedding_vector_id UUID REFERENCES vector_embeddings(id),
    trust_score_4d JSONB NOT NULL DEFAULT '{"iq": 0, "appeal": 0, "social": 0, "humanity": 0}',
    vibe_score DECIMAL(5,2) DEFAULT 0.0,
    relevance_baseline DECIMAL(5,2) DEFAULT 0.0,
    community_validation_score DECIMAL(5,2) DEFAULT 0.0,
    access_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 100.0,
    memory_zone_id UUID,
    creator_agent_id VARCHAR(50) REFERENCES agent_registry(agent_id),
    memory_status VARCHAR(20) DEFAULT 'active',
    quality_score DECIMAL(5,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- Trust Reranker Configuration and Metrics
CREATE TABLE IF NOT EXISTS trust_reranker_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id VARCHAR(100) UNIQUE NOT NULL,
    reranker_name VARCHAR(100) NOT NULL,
    trust_weight_config JSONB NOT NULL,
    relevance_weight_config JSONB NOT NULL,
    vibe_weight_config JSONB NOT NULL,
    community_weight_config JSONB NOT NULL,
    algorithm_version VARCHAR(20) NOT NULL,
    performance_metrics JSONB DEFAULT '{}',
    accuracy_score DECIMAL(5,2) DEFAULT 0.0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'
);

-- Memory Retrieval Logs with Trust Scoring
CREATE TABLE IF NOT EXISTS memory_retrieval_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    retrieval_id VARCHAR(100) UNIQUE NOT NULL,
    agent_id VARCHAR(50) REFERENCES agent_registry(agent_id),
    query_text TEXT NOT NULL,
    query_embedding_vector JSONB,
    retrieved_memory_ids UUID[],
    trust_scores JSONB DEFAULT '{}',
    relevance_scores JSONB DEFAULT '{}',
    reranker_config_id VARCHAR(100) REFERENCES trust_reranker_configs(config_id),
    final_ranking JSONB DEFAULT '{}',
    retrieval_time_ms INTEGER,
    accuracy_feedback DECIMAL(5,2),
    retrieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_id VARCHAR(100),
    trace_id VARCHAR(100),
    metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- 3. COMMUNITY-BASED MEMORY ZONES
-- =====================================================

-- Memory Zone Definitions with Governance Integration
CREATE TABLE IF NOT EXISTS vectorgraph_memory_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id VARCHAR(100) UNIQUE NOT NULL,
    zone_name VARCHAR(200) NOT NULL,
    zone_type VARCHAR(50) NOT NULL, -- 'public', 'private', 'community', 'dao'
    zone_description TEXT,
    governance_policy_id VARCHAR(100),
    access_control_config JSONB NOT NULL DEFAULT '{}',
    read_permissions JSONB DEFAULT '{}',
    write_permissions JSONB DEFAULT '{}',
    admin_permissions JSONB DEFAULT '{}',
    trust_requirements JSONB DEFAULT '{}',
    memory_object_count INTEGER DEFAULT 0,
    total_size_bytes BIGINT DEFAULT 0,
    zone_status VARCHAR(20) DEFAULT 'active',
    creator_agent_id VARCHAR(50) REFERENCES agent_registry(agent_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Memory Zone Access Control and Audit
CREATE TABLE IF NOT EXISTS memory_zone_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    access_id VARCHAR(100) UNIQUE NOT NULL,
    zone_id VARCHAR(100) REFERENCES vectorgraph_memory_zones(zone_id),
    agent_id VARCHAR(50) REFERENCES agent_registry(agent_id),
    access_type VARCHAR(50) NOT NULL, -- 'read', 'write', 'admin', 'delete'
    memory_object_id UUID,
    access_granted BOOLEAN NOT NULL,
    denial_reason VARCHAR(200),
    governance_check_result JSONB DEFAULT '{}',
    trust_verification_result JSONB DEFAULT '{}',
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_id VARCHAR(100),
    trace_id VARCHAR(100),
    metadata JSONB DEFAULT '{}'
);

-- Community Governance for Memory Zones
CREATE TABLE IF NOT EXISTS memory_zone_governance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    governance_id VARCHAR(100) UNIQUE NOT NULL,
    zone_id VARCHAR(100) REFERENCES vectorgraph_memory_zones(zone_id),
    governance_type VARCHAR(50) NOT NULL, -- 'voting', 'consensus', 'admin', 'dao'
    governance_rules JSONB NOT NULL,
    voting_mechanism JSONB DEFAULT '{}',
    decision_history JSONB DEFAULT '{}',
    current_proposals JSONB DEFAULT '{}',
    governance_status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- 4. TOKENIZED MEMORY OBJECTS (NFT INTEGRATION)
-- =====================================================

-- NFT Memory Tokenization with ERC Standards
CREATE TABLE IF NOT EXISTS memory_nft_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id VARCHAR(100) UNIQUE NOT NULL,
    memory_object_id UUID REFERENCES vectorgraph_memory_objects(id),
    nft_standard VARCHAR(20) NOT NULL, -- 'ERC-721', 'ERC-1155'
    contract_address VARCHAR(42),
    blockchain_network VARCHAR(50) DEFAULT 'ethereum',
    token_metadata JSONB NOT NULL,
    ownership_history JSONB DEFAULT '{}',
    current_owner_address VARCHAR(42),
    royalty_config JSONB DEFAULT '{}',
    monetization_settings JSONB DEFAULT '{}',
    dao_integration_config JSONB DEFAULT '{}',
    token_status VARCHAR(20) DEFAULT 'active',
    minted_at TIMESTAMP WITH TIME ZONE,
    last_transfer_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Blockchain Anchoring and Integrity Verification
CREATE TABLE IF NOT EXISTS memory_blockchain_anchors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anchor_id VARCHAR(100) UNIQUE NOT NULL,
    memory_object_id UUID REFERENCES vectorgraph_memory_objects(id),
    blockchain_network VARCHAR(50) NOT NULL,
    transaction_hash VARCHAR(66),
    block_number BIGINT,
    contract_address VARCHAR(42),
    anchor_type VARCHAR(50) NOT NULL, -- 'creation', 'update', 'transfer', 'deletion'
    content_hash VARCHAR(64) NOT NULL,
    cryptographic_signature TEXT,
    verification_status VARCHAR(20) DEFAULT 'pending',
    gas_cost_wei BIGINT,
    anchored_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- DAO Monetization and Economic Integration
CREATE TABLE IF NOT EXISTS memory_dao_economics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    economic_id VARCHAR(100) UNIQUE NOT NULL,
    memory_object_id UUID REFERENCES vectorgraph_memory_objects(id),
    token_id VARCHAR(100) REFERENCES memory_nft_tokens(token_id),
    economic_model VARCHAR(50) NOT NULL, -- 'revenue_share', 'staking', 'licensing', 'auction'
    revenue_streams JSONB DEFAULT '{}',
    staking_rewards JSONB DEFAULT '{}',
    licensing_terms JSONB DEFAULT '{}',
    dao_treasury_allocation DECIMAL(5,2) DEFAULT 0.0,
    community_rewards DECIMAL(5,2) DEFAULT 0.0,
    creator_royalties DECIMAL(5,2) DEFAULT 0.0,
    total_revenue_generated DECIMAL(18,6) DEFAULT 0.0,
    active_stakeholders JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- 5. ADVANCED VERSIONING & AUDIT SYSTEM
-- =====================================================

-- Memory Object Versioning with Cryptographic Integrity
CREATE TABLE IF NOT EXISTS memory_object_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id VARCHAR(100) UNIQUE NOT NULL,
    memory_object_id UUID REFERENCES vectorgraph_memory_objects(id),
    version_number INTEGER NOT NULL,
    parent_version_id VARCHAR(100),
    content_hash VARCHAR(64) NOT NULL,
    content_diff JSONB,
    change_description TEXT,
    change_type VARCHAR(50) NOT NULL, -- 'creation', 'update', 'metadata_change', 'trust_update'
    cryptographic_hash VARCHAR(64) NOT NULL,
    ipfs_hash VARCHAR(59),
    ipfs_url TEXT,
    version_creator_id VARCHAR(50) REFERENCES agent_registry(agent_id),
    approval_status VARCHAR(20) DEFAULT 'pending',
    approval_history JSONB DEFAULT '{}',
    version_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- IPFS Integration and Distributed Storage
CREATE TABLE IF NOT EXISTS memory_ipfs_storage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    storage_id VARCHAR(100) UNIQUE NOT NULL,
    memory_object_id UUID REFERENCES vectorgraph_memory_objects(id),
    version_id VARCHAR(100) REFERENCES memory_object_versions(version_id),
    ipfs_hash VARCHAR(59) NOT NULL,
    ipfs_url TEXT NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT,
    storage_tier VARCHAR(20) DEFAULT 'standard', -- 'hot', 'warm', 'cold', 'archive'
    replication_factor INTEGER DEFAULT 3,
    pin_status BOOLEAN DEFAULT true,
    storage_cost_estimate DECIMAL(10,6),
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    stored_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- Multi-Modal Memory Support
CREATE TABLE IF NOT EXISTS memory_multimodal_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id VARCHAR(100) UNIQUE NOT NULL,
    memory_object_id UUID REFERENCES vectorgraph_memory_objects(id),
    content_modality VARCHAR(50) NOT NULL, -- 'text', 'image', 'audio', 'video', 'document'
    content_format VARCHAR(50) NOT NULL,
    content_url TEXT,
    content_embeddings JSONB,
    embedding_model VARCHAR(100),
    processing_metadata JSONB DEFAULT '{}',
    quality_metrics JSONB DEFAULT '{}',
    content_size_bytes BIGINT,
    duration_seconds INTEGER,
    dimensions JSONB,
    content_status VARCHAR(20) DEFAULT 'active',
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Memory Conflict Resolution System
CREATE TABLE IF NOT EXISTS memory_conflict_resolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conflict_id VARCHAR(100) UNIQUE NOT NULL,
    conflicting_memory_ids UUID[],
    conflict_type VARCHAR(50) NOT NULL, -- 'content_duplicate', 'trust_score_dispute', 'ownership_claim'
    conflict_description TEXT,
    resolution_strategy VARCHAR(50) NOT NULL,
    trust_score_analysis JSONB DEFAULT '{}',
    community_consensus_data JSONB DEFAULT '{}',
    automated_resolution_result JSONB DEFAULT '{}',
    human_review_required BOOLEAN DEFAULT false,
    resolution_status VARCHAR(20) DEFAULT 'pending',
    resolved_memory_id UUID,
    conflict_detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_confidence DECIMAL(5,2),
    metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- 6. PERFORMANCE OPTIMIZATION AND INDEXING
-- =====================================================

-- Update memory zone reference in vectorgraph_memory_objects
ALTER TABLE vectorgraph_memory_objects 
ADD CONSTRAINT fk_memory_zone 
FOREIGN KEY (memory_zone_id) REFERENCES vectorgraph_memory_zones(id);

-- Indexes for Performance Optimization
CREATE INDEX IF NOT EXISTS idx_mcp_context_sessions_agent_status ON mcp_context_sessions(agent_id, session_status);
CREATE INDEX IF NOT EXISTS idx_context_injection_logs_session_time ON context_injection_logs(session_id, injected_at);
CREATE INDEX IF NOT EXISTS idx_memory_objects_trust_score ON vectorgraph_memory_objects USING GIN(trust_score_4d);
CREATE INDEX IF NOT EXISTS idx_memory_objects_zone_status ON vectorgraph_memory_objects(memory_zone_id, memory_status);
CREATE INDEX IF NOT EXISTS idx_memory_retrieval_logs_agent_time ON memory_retrieval_logs(agent_id, retrieved_at);
CREATE INDEX IF NOT EXISTS idx_memory_zones_type_status ON vectorgraph_memory_zones(zone_type, zone_status);
CREATE INDEX IF NOT EXISTS idx_memory_access_logs_zone_agent ON memory_zone_access_logs(zone_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_memory_nft_tokens_owner ON memory_nft_tokens(current_owner_address);
CREATE INDEX IF NOT EXISTS idx_memory_versions_object_number ON memory_object_versions(memory_object_id, version_number);
CREATE INDEX IF NOT EXISTS idx_memory_ipfs_hash ON memory_ipfs_storage(ipfs_hash);
CREATE INDEX IF NOT EXISTS idx_multimodal_content_modality ON memory_multimodal_content(content_modality, content_status);

-- =====================================================
-- 7. INTEGRATION WITH EXISTING SYSTEMS
-- =====================================================

-- Link memory objects to existing trust_context_embeddings
ALTER TABLE vectorgraph_memory_objects 
ADD COLUMN IF NOT EXISTS trust_context_embedding_id UUID REFERENCES trust_context_embeddings(id);

-- Link memory zones to existing agent coordination
ALTER TABLE vectorgraph_memory_zones 
ADD COLUMN IF NOT EXISTS coordination_session_id VARCHAR(100) REFERENCES agent_coordination_sessions(session_id);

-- Enhanced integration with existing vector embeddings
ALTER TABLE vector_embeddings 
ADD COLUMN IF NOT EXISTS memory_object_id UUID REFERENCES vectorgraph_memory_objects(id);

-- Integration with existing audit system
ALTER TABLE context_injection_logs 
ADD COLUMN IF NOT EXISTS audit_log_id VARCHAR(100);

ALTER TABLE memory_retrieval_logs 
ADD COLUMN IF NOT EXISTS audit_log_id VARCHAR(100);

ALTER TABLE memory_zone_access_logs 
ADD COLUMN IF NOT EXISTS audit_log_id VARCHAR(100);;