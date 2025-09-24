-- Enhanced Trust Scoring Database Schema Migration
-- TrustStream v4.2 - Governance Metrics Integration
-- Author: MiniMax Agent
-- Date: 2025-09-20

-- ================================================================
-- PHASE 1: ENHANCED GOVERNANCE CONTEXT FIELDS
-- ================================================================

-- Add enhanced governance fields to existing vectorgraph_memory_objects table
ALTER TABLE vectorgraph_memory_objects 
ADD COLUMN IF NOT EXISTS governance_trust_score FLOAT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS governance_risk_score FLOAT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS collaborative_governance_score FLOAT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS governance_metrics JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS risk_assessment JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS stakeholder_feedback JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS governance_version VARCHAR(10) DEFAULT '4.1',
ADD COLUMN IF NOT EXISTS enhanced_modifiers JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS trust_pyramid_scores JSONB DEFAULT '{}';

-- ================================================================
-- PHASE 2: PERFORMANCE INDEXES
-- ================================================================

-- Create indexes for enhanced governance queries
CREATE INDEX IF NOT EXISTS idx_governance_trust_score 
ON vectorgraph_memory_objects (governance_trust_score) 
WHERE governance_trust_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_governance_risk_score 
ON vectorgraph_memory_objects (governance_risk_score) 
WHERE governance_risk_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_governance_version 
ON vectorgraph_memory_objects (governance_version);

CREATE INDEX IF NOT EXISTS idx_enhanced_governance_composite 
ON vectorgraph_memory_objects (governance_version, governance_trust_score, governance_risk_score) 
WHERE governance_trust_score IS NOT NULL AND governance_risk_score IS NOT NULL;

-- ================================================================
-- PHASE 3: ENHANCED GOVERNANCE ZONES
-- ================================================================

-- Enhanced governance memory zones table
CREATE TABLE IF NOT EXISTS enhanced_governance_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id VARCHAR(255) REFERENCES vectorgraph_memory_zones(zone_id),
  enhancement_level VARCHAR(50) DEFAULT 'basic',
  governance_features JSONB DEFAULT '{}',
  risk_thresholds JSONB DEFAULT '{}',
  collaborative_settings JSONB DEFAULT '{}',
  performance_settings JSONB DEFAULT '{}',
  feature_flags JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for enhanced governance zones
CREATE INDEX IF NOT EXISTS idx_enhanced_governance_zones_zone_id 
ON enhanced_governance_zones (zone_id);

CREATE INDEX IF NOT EXISTS idx_enhanced_governance_zones_level 
ON enhanced_governance_zones (enhancement_level);

-- ================================================================
-- PHASE 4: FEATURE FLAGS SYSTEM
-- ================================================================

-- Feature flags for gradual rollout
CREATE TABLE IF NOT EXISTS trust_scoring_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name VARCHAR(100) UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT false,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  eligible_communities TEXT[] DEFAULT '{}',
  configuration JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default feature flags
INSERT INTO trust_scoring_feature_flags (feature_name, enabled, rollout_percentage, configuration) 
VALUES 
  ('enhanced_governance_scoring', false, 0, '{"version": "4.2-enhanced", "backend_compatible": true}'),
  ('governance_risk_assessment', false, 0, '{"risk_calculation_enabled": true, "risk_mitigation_suggestions": true}'),
  ('collaborative_governance_scoring', false, 0, '{"multi_agent_consensus": true, "cross_community_scoring": true}'),
  ('trust_pyramid_architecture', false, 0, '{"pyramid_layers": 4, "governance_weights": {"accountability": 0.25, "transparency": 0.3, "compliance": 0.2, "ethics": 0.25}}')
ON CONFLICT (feature_name) DO NOTHING;

-- ================================================================
-- PHASE 5: PERFORMANCE MONITORING TABLES
-- ================================================================

-- Trust scoring performance metrics
CREATE TABLE IF NOT EXISTS trust_scoring_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id VARCHAR(255),
  scoring_version VARCHAR(20),
  execution_time_ms INTEGER,
  memory_usage_mb FLOAT,
  features_enabled JSONB DEFAULT '{}',
  error_details JSONB DEFAULT NULL,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Index for performance monitoring
CREATE INDEX IF NOT EXISTS idx_trust_scoring_performance_version 
ON trust_scoring_performance (scoring_version);

CREATE INDEX IF NOT EXISTS idx_trust_scoring_performance_timestamp 
ON trust_scoring_performance (timestamp);

-- ================================================================
-- PHASE 6: STAKEHOLDER FEEDBACK SYSTEM
-- ================================================================

-- Stakeholder feedback for governance decisions
CREATE TABLE IF NOT EXISTS governance_stakeholder_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  governance_decision_id VARCHAR(255),
  stakeholder_id VARCHAR(255),
  feedback_type VARCHAR(50), -- 'satisfaction', 'impact_assessment', 'suggestion'
  satisfaction_score FLOAT CHECK (satisfaction_score >= 0 AND satisfaction_score <= 1),
  impact_rating INTEGER CHECK (impact_rating >= 1 AND impact_rating <= 5),
  feedback_text TEXT,
  feedback_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for stakeholder feedback
CREATE INDEX IF NOT EXISTS idx_governance_stakeholder_feedback_decision 
ON governance_stakeholder_feedback (governance_decision_id);

CREATE INDEX IF NOT EXISTS idx_governance_stakeholder_feedback_stakeholder 
ON governance_stakeholder_feedback (stakeholder_id);

-- ================================================================
-- PHASE 7: COLLABORATIVE SCORING TABLES
-- ================================================================

-- Multi-agent collaborative scoring
CREATE TABLE IF NOT EXISTS collaborative_trust_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_object_id VARCHAR(255),
  agent_id VARCHAR(255),
  agent_type VARCHAR(100),
  trust_score_contribution JSONB,
  consensus_weight FLOAT DEFAULT 1.0,
  scoring_timestamp TIMESTAMP DEFAULT NOW(),
  community_id VARCHAR(255)
);

-- Index for collaborative scores
CREATE INDEX IF NOT EXISTS idx_collaborative_trust_scores_memory_object 
ON collaborative_trust_scores (memory_object_id);

CREATE INDEX IF NOT EXISTS idx_collaborative_trust_scores_agent 
ON collaborative_trust_scores (agent_id);

-- ================================================================
-- PHASE 8: RISK ASSESSMENT TABLES
-- ================================================================

-- Risk assessment details
CREATE TABLE IF NOT EXISTS governance_risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_object_id VARCHAR(255),
  risk_category VARCHAR(100),
  risk_score FLOAT CHECK (risk_score >= 0 AND risk_score <= 1),
  risk_factors JSONB DEFAULT '{}',
  mitigation_recommendations TEXT[],
  assessment_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for risk assessments
CREATE INDEX IF NOT EXISTS idx_governance_risk_assessments_memory_object 
ON governance_risk_assessments (memory_object_id);

CREATE INDEX IF NOT EXISTS idx_governance_risk_assessments_category 
ON governance_risk_assessments (risk_category);

-- ================================================================
-- PHASE 9: AUDIT AND ROLLBACK SUPPORT
-- ================================================================

-- Trust scoring audit log
CREATE TABLE IF NOT EXISTS trust_scoring_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_object_id VARCHAR(255),
  scoring_version VARCHAR(20),
  previous_scores JSONB,
  new_scores JSONB,
  calculation_method VARCHAR(100),
  rollback_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for audit log
CREATE INDEX IF NOT EXISTS idx_trust_scoring_audit_log_memory_object 
ON trust_scoring_audit_log (memory_object_id);

CREATE INDEX IF NOT EXISTS idx_trust_scoring_audit_log_version 
ON trust_scoring_audit_log (scoring_version);

-- ================================================================
-- PHASE 10: VIEWS FOR ENHANCED QUERIES
-- ================================================================

-- Enhanced trust scoring view
CREATE OR REPLACE VIEW enhanced_trust_scoring_view AS
SELECT 
  vmo.id,
  vmo.memory_id,
  vmo.trust_score_4d,
  vmo.governance_trust_score,
  vmo.governance_risk_score,
  vmo.collaborative_governance_score,
  vmo.governance_version,
  vmo.enhanced_modifiers,
  vmo.trust_pyramid_scores,
  egz.enhancement_level,
  egz.governance_features,
  egz.feature_flags
FROM vectorgraph_memory_objects vmo
LEFT JOIN enhanced_governance_zones egz ON vmo.memory_zone_id = egz.zone_id
WHERE vmo.governance_version IS NOT NULL;

-- Performance monitoring view
CREATE OR REPLACE VIEW trust_scoring_performance_summary AS
SELECT 
  scoring_version,
  COUNT(*) as total_requests,
  AVG(execution_time_ms) as avg_execution_time_ms,
  MAX(execution_time_ms) as max_execution_time_ms,
  AVG(memory_usage_mb) as avg_memory_usage_mb,
  COUNT(CASE WHEN error_details IS NOT NULL THEN 1 END) as error_count,
  (COUNT(CASE WHEN error_details IS NOT NULL THEN 1 END) * 100.0 / COUNT(*)) as error_rate_percentage
FROM trust_scoring_performance
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY scoring_version;

-- ================================================================
-- MIGRATION COMPLETION LOG
-- ================================================================

-- Log migration completion
INSERT INTO trust_scoring_audit_log (
  memory_object_id, 
  scoring_version, 
  calculation_method, 
  new_scores
) VALUES (
  'schema_migration', 
  '4.2-enhanced', 
  'database_schema_migration', 
  '{"migration_completed": true, "migration_date": "2025-09-20", "version": "4.2-enhanced"}'
);

-- Grant necessary permissions (adjust based on your role structure)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
