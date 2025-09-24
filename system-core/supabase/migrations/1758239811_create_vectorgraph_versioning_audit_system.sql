-- Migration: create_vectorgraph_versioning_audit_system
-- Created at: 1758239811

-- TrustStream v4.0 VectorGraph Versioning Audit System
-- Complete versioning and audit infrastructure for memory objects, agent interactions, and trust modifications
-- Author: MiniMax Agent
-- Created: 2025-09-19

-- =====================================================
-- 1. COMPREHENSIVE AUDIT LOG SYSTEM
-- =====================================================

-- Central audit log for all VectorGraph operations
CREATE TABLE IF NOT EXISTS vectorgraph_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id VARCHAR(100) UNIQUE NOT NULL,
    operation_type VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'access', 'transfer', 'mint', 'trust_update'
    entity_type VARCHAR(50) NOT NULL, -- 'memory_object', 'memory_zone', 'nft_token', 'trust_score', 'agent_interaction'
    entity_id VARCHAR(100) NOT NULL,
    agent_id VARCHAR(50) REFERENCES agent_registry(agent_id),
    user_id UUID,
    session_id VARCHAR(100),
    before_state JSONB,
    after_state JSONB,
    operation_metadata JSONB DEFAULT '{}',
    trust_score_before DECIMAL(5,2),
    trust_score_after DECIMAL(5,2),
    approval_required BOOLEAN DEFAULT false,
    approval_status VARCHAR(20) DEFAULT 'approved',
    approval_history JSONB DEFAULT '{}',
    operation_result VARCHAR(20) DEFAULT 'success',
    error_details TEXT,
    blockchain_tx_hash VARCHAR(66),
    ipfs_backup_hash VARCHAR(59),
    integrity_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Memory object detailed version history
CREATE TABLE IF NOT EXISTS memory_object_version_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id VARCHAR(100) UNIQUE NOT NULL,
    memory_object_id UUID REFERENCES vectorgraph_memory_objects(id),
    parent_version_id VARCHAR(100),
    version_number INTEGER NOT NULL,
    version_type VARCHAR(50) NOT NULL, -- 'major', 'minor', 'patch', 'rollback'
    content_before JSONB,
    content_after JSONB,
    content_diff JSONB,
    metadata_before JSONB,
    metadata_after JSONB,
    trust_score_before DECIMAL(5,2),
    trust_score_after DECIMAL(5,2),
    embedding_vector_before JSONB,
    embedding_vector_after JSONB,
    change_description TEXT,
    change_reason VARCHAR(100),
    change_category VARCHAR(50),
    auto_generated BOOLEAN DEFAULT false,
    created_by_agent VARCHAR(50) REFERENCES agent_registry(agent_id),
    created_by_user UUID,
    approval_workflow_id VARCHAR(100),
    rollback_point BOOLEAN DEFAULT false,
    content_hash_before VARCHAR(64),
    content_hash_after VARCHAR(64),
    integrity_verified BOOLEAN DEFAULT false,
    verification_timestamp TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Agent interaction versioning and audit
CREATE TABLE IF NOT EXISTS agent_interaction_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interaction_id VARCHAR(100) UNIQUE NOT NULL,
    agent_id VARCHAR(50) REFERENCES agent_registry(agent_id),
    interaction_type VARCHAR(50) NOT NULL,
    target_entity_type VARCHAR(50) NOT NULL,
    target_entity_id VARCHAR(100) NOT NULL,
    interaction_context JSONB DEFAULT '{}',
    input_data JSONB,
    output_data JSONB,
    trust_score_impact DECIMAL(5,2) DEFAULT 0.0,
    performance_metrics JSONB DEFAULT '{}',
    success_status BOOLEAN DEFAULT true,
    error_details TEXT,
    session_metadata JSONB DEFAULT '{}',
    coordination_session_id VARCHAR(100),
    memory_access_pattern JSONB DEFAULT '{}',
    computational_cost DECIMAL(10,6),
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Trust score modification audit trail
CREATE TABLE IF NOT EXISTS trust_score_audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id VARCHAR(100) UNIQUE NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'agent', 'memory_object', 'user', 'memory_zone'
    entity_id VARCHAR(100) NOT NULL,
    trust_component VARCHAR(20) NOT NULL, -- 'iq', 'appeal', 'social', 'humanity', 'overall'
    score_before DECIMAL(5,2),
    score_after DECIMAL(5,2),
    score_delta DECIMAL(5,2),
    modification_reason VARCHAR(100),
    modification_source VARCHAR(50), -- 'automatic', 'manual', 'algorithm', 'community_vote'
    algorithm_version VARCHAR(20),
    confidence_score DECIMAL(5,2),
    evidence_data JSONB DEFAULT '{}',
    review_required BOOLEAN DEFAULT false,
    review_status VARCHAR(20) DEFAULT 'approved',
    reviewer_agent_id VARCHAR(50),
    community_consensus_score DECIMAL(5,2),
    blockchain_anchored BOOLEAN DEFAULT false,
    blockchain_tx_hash VARCHAR(66),
    modified_by_agent VARCHAR(50) REFERENCES agent_registry(agent_id),
    modified_by_user UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- 2. AUTOMATED BACKUP AND ROLLBACK SYSTEM
-- =====================================================

-- Backup snapshots for rollback capabilities
CREATE TABLE IF NOT EXISTS vectorgraph_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id VARCHAR(100) UNIQUE NOT NULL,
    snapshot_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'emergency', 'scheduled'
    snapshot_scope VARCHAR(50) NOT NULL, -- 'global', 'zone', 'agent', 'memory_object'
    scope_entity_id VARCHAR(100),
    snapshot_data JSONB NOT NULL,
    metadata_snapshot JSONB DEFAULT '{}',
    trust_scores_snapshot JSONB DEFAULT '{}',
    agent_states_snapshot JSONB DEFAULT '{}',
    memory_count INTEGER DEFAULT 0,
    total_data_size BIGINT DEFAULT 0,
    compression_ratio DECIMAL(5,2),
    integrity_hash VARCHAR(64) NOT NULL,
    ipfs_hash VARCHAR(59),
    blockchain_anchor_tx VARCHAR(66),
    created_by_agent VARCHAR(50) REFERENCES agent_registry(agent_id),
    auto_generated BOOLEAN DEFAULT true,
    retention_policy VARCHAR(50) DEFAULT 'standard',
    expires_at TIMESTAMP WITH TIME ZONE,
    restored_count INTEGER DEFAULT 0,
    last_restored_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Rollback operations tracking
CREATE TABLE IF NOT EXISTS vectorgraph_rollback_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rollback_id VARCHAR(100) UNIQUE NOT NULL,
    target_snapshot_id VARCHAR(100) REFERENCES vectorgraph_snapshots(snapshot_id),
    rollback_scope VARCHAR(50) NOT NULL,
    scope_entity_id VARCHAR(100),
    rollback_reason TEXT NOT NULL,
    affected_entities JSONB DEFAULT '{}',
    entities_count INTEGER DEFAULT 0,
    rollback_type VARCHAR(50) NOT NULL, -- 'full', 'partial', 'selective'
    preview_mode BOOLEAN DEFAULT false,
    pre_rollback_snapshot_id VARCHAR(100),
    rollback_success BOOLEAN DEFAULT false,
    rollback_errors JSONB DEFAULT '{}',
    verification_results JSONB DEFAULT '{}',
    initiated_by_agent VARCHAR(50) REFERENCES agent_registry(agent_id),
    initiated_by_user UUID,
    approved_by JSONB DEFAULT '{}',
    emergency_rollback BOOLEAN DEFAULT false,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    processing_time_seconds INTEGER,
    metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- 3. CONFLICT DETECTION AND RESOLUTION
-- =====================================================

-- Enhanced conflict detection system
CREATE TABLE IF NOT EXISTS vectorgraph_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conflict_id VARCHAR(100) UNIQUE NOT NULL,
    conflict_type VARCHAR(50) NOT NULL, -- 'version_conflict', 'trust_dispute', 'access_violation', 'data_inconsistency'
    conflict_severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    affected_entities JSONB NOT NULL,
    conflict_description TEXT NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    detection_algorithm VARCHAR(50),
    evidence_data JSONB DEFAULT '{}',
    automatic_resolution_attempted BOOLEAN DEFAULT false,
    resolution_strategy VARCHAR(50),
    resolution_result JSONB DEFAULT '{}',
    human_review_required BOOLEAN DEFAULT true,
    resolution_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'resolved', 'escalated', 'ignored'
    assigned_to_agent VARCHAR(50) REFERENCES agent_registry(agent_id),
    community_consensus_required BOOLEAN DEFAULT false,
    voting_session_id VARCHAR(100),
    resolution_confidence DECIMAL(5,2),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Conflict resolution workflows
CREATE TABLE IF NOT EXISTS conflict_resolution_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id VARCHAR(100) UNIQUE NOT NULL,
    conflict_id VARCHAR(100) REFERENCES vectorgraph_conflicts(conflict_id),
    workflow_type VARCHAR(50) NOT NULL, -- 'automatic', 'manual', 'community_vote', 'expert_review'
    workflow_steps JSONB NOT NULL,
    current_step INTEGER DEFAULT 1,
    step_history JSONB DEFAULT '{}',
    participants JSONB DEFAULT '{}',
    voting_results JSONB DEFAULT '{}',
    expert_opinions JSONB DEFAULT '{}',
    final_decision JSONB DEFAULT '{}',
    workflow_status VARCHAR(20) DEFAULT 'active',
    timeout_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- 4. INTEGRITY VERIFICATION SYSTEM
-- =====================================================

-- Cryptographic integrity verification
CREATE TABLE IF NOT EXISTS vectorgraph_integrity_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_id VARCHAR(100) UNIQUE NOT NULL,
    check_type VARCHAR(50) NOT NULL, -- 'full_scan', 'incremental', 'spot_check', 'emergency'
    check_scope VARCHAR(50) NOT NULL,
    scope_entity_ids TEXT[],
    verification_algorithm VARCHAR(50) NOT NULL,
    expected_hashes JSONB NOT NULL,
    actual_hashes JSONB NOT NULL,
    integrity_status VARCHAR(20) NOT NULL, -- 'passed', 'failed', 'partial', 'corrupted'
    failed_entities JSONB DEFAULT '{}',
    corruption_details JSONB DEFAULT '{}',
    auto_repair_attempted BOOLEAN DEFAULT false,
    repair_results JSONB DEFAULT '{}',
    blockchain_verification BOOLEAN DEFAULT false,
    blockchain_results JSONB DEFAULT '{}',
    ipfs_verification BOOLEAN DEFAULT false,
    ipfs_results JSONB DEFAULT '{}',
    check_duration_ms INTEGER,
    entities_checked INTEGER DEFAULT 0,
    errors_found INTEGER DEFAULT 0,
    repairs_successful INTEGER DEFAULT 0,
    triggered_by VARCHAR(50),
    scheduled_check BOOLEAN DEFAULT false,
    check_performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- 5. PERFORMANCE OPTIMIZATION AND INDEXING
-- =====================================================

-- Indexes for audit system performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type_time ON vectorgraph_audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_agent_time ON vectorgraph_audit_logs(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operation_time ON vectorgraph_audit_logs(operation_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_version_history_object_version ON memory_object_version_history(memory_object_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_memory_version_history_rollback_points ON memory_object_version_history(rollback_point, created_at DESC) WHERE rollback_point = true;
CREATE INDEX IF NOT EXISTS idx_agent_interaction_audit_agent_time ON agent_interaction_audit(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trust_score_audit_entity_time ON trust_score_audit_trail(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vectorgraph_snapshots_type_time ON vectorgraph_snapshots(snapshot_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vectorgraph_conflicts_status_severity ON vectorgraph_conflicts(resolution_status, conflict_severity);
CREATE INDEX IF NOT EXISTS idx_integrity_checks_scope_time ON vectorgraph_integrity_checks(check_scope, check_performed_at DESC);

-- Materialized view for audit analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_analytics_summary AS
SELECT 
    DATE_TRUNC('hour', created_at) as time_bucket,
    operation_type,
    entity_type,
    COUNT(*) as operation_count,
    COUNT(CASE WHEN operation_result = 'success' THEN 1 END) as success_count,
    COUNT(CASE WHEN operation_result = 'error' THEN 1 END) as error_count,
    AVG(CASE WHEN trust_score_after IS NOT NULL THEN trust_score_after END) as avg_trust_score,
    COUNT(DISTINCT agent_id) as unique_agents,
    COUNT(DISTINCT session_id) as unique_sessions
FROM vectorgraph_audit_logs 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('hour', created_at), operation_type, entity_type;

-- Create refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_audit_analytics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW audit_analytics_summary;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. INTEGRATION WITH EXISTING SYSTEMS
-- =====================================================

-- Link audit logs to existing systems
ALTER TABLE vectorgraph_audit_logs 
ADD COLUMN IF NOT EXISTS memory_zone_id UUID REFERENCES vectorgraph_memory_zones(id);

ALTER TABLE vectorgraph_audit_logs 
ADD COLUMN IF NOT EXISTS nft_token_id VARCHAR(100) REFERENCES memory_nft_tokens(token_id);

-- Link version history to NFT tokens
ALTER TABLE memory_object_version_history 
ADD COLUMN IF NOT EXISTS nft_token_id VARCHAR(100) REFERENCES memory_nft_tokens(token_id);

-- Link snapshots to memory zones
ALTER TABLE vectorgraph_snapshots 
ADD COLUMN IF NOT EXISTS memory_zone_id UUID REFERENCES vectorgraph_memory_zones(id);

-- Add audit trails to existing tables
ALTER TABLE vectorgraph_memory_objects 
ADD COLUMN IF NOT EXISTS last_audit_id VARCHAR(100) REFERENCES vectorgraph_audit_logs(audit_id);

ALTER TABLE vectorgraph_memory_zones 
ADD COLUMN IF NOT EXISTS last_audit_id VARCHAR(100) REFERENCES vectorgraph_audit_logs(audit_id);

ALTER TABLE memory_nft_tokens 
ADD COLUMN IF NOT EXISTS last_audit_id VARCHAR(100) REFERENCES vectorgraph_audit_logs(audit_id);

-- =====================================================
-- 7. AUTOMATED TRIGGERS FOR AUDIT LOGGING
-- =====================================================

-- Function to generate audit log entry
CREATE OR REPLACE FUNCTION log_vectorgraph_audit(
    p_operation_type VARCHAR(50),
    p_entity_type VARCHAR(50),
    p_entity_id VARCHAR(100),
    p_agent_id VARCHAR(50) DEFAULT NULL,
    p_before_state JSONB DEFAULT NULL,
    p_after_state JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS VARCHAR(100) AS $$
DECLARE
    v_audit_id VARCHAR(100);
    v_integrity_hash VARCHAR(64);
BEGIN
    v_audit_id := 'audit_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 8);
    v_integrity_hash := encode(sha256((v_audit_id || p_operation_type || p_entity_type || p_entity_id)::bytea), 'hex');
    
    INSERT INTO vectorgraph_audit_logs (
        audit_id, operation_type, entity_type, entity_id, agent_id,
        before_state, after_state, operation_metadata, integrity_hash
    ) VALUES (
        v_audit_id, p_operation_type, p_entity_type, p_entity_id, p_agent_id,
        p_before_state, p_after_state, p_metadata, v_integrity_hash
    );
    
    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for memory object changes
CREATE OR REPLACE FUNCTION audit_memory_object_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_operation_type VARCHAR(50);
    v_before_state JSONB;
    v_after_state JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_operation_type := 'create';
        v_before_state := NULL;
        v_after_state := to_jsonb(NEW);
        
        PERFORM log_vectorgraph_audit(
            v_operation_type, 'memory_object', NEW.id::text, 
            NEW.creator_agent_id, v_before_state, v_after_state
        );
        
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        v_operation_type := 'update';
        v_before_state := to_jsonb(OLD);
        v_after_state := to_jsonb(NEW);
        
        PERFORM log_vectorgraph_audit(
            v_operation_type, 'memory_object', NEW.id::text,
            COALESCE(NEW.creator_agent_id, OLD.creator_agent_id), v_before_state, v_after_state
        );
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        v_operation_type := 'delete';
        v_before_state := to_jsonb(OLD);
        v_after_state := NULL;
        
        PERFORM log_vectorgraph_audit(
            v_operation_type, 'memory_object', OLD.id::text,
            OLD.creator_agent_id, v_before_state, v_after_state
        );
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for audit logging
CREATE TRIGGER audit_memory_objects_trigger
    AFTER INSERT OR UPDATE OR DELETE ON vectorgraph_memory_objects
    FOR EACH ROW EXECUTE FUNCTION audit_memory_object_changes();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON vectorgraph_audit_logs TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON memory_object_version_history TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON agent_interaction_audit TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON trust_score_audit_trail TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON vectorgraph_snapshots TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON vectorgraph_rollback_operations TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON vectorgraph_conflicts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON conflict_resolution_workflows TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON vectorgraph_integrity_checks TO anon, authenticated;
GRANT SELECT ON audit_analytics_summary TO anon, authenticated;;