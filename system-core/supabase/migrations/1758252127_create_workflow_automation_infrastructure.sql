-- Migration: create_workflow_automation_infrastructure
-- Created at: 1758252127

-- TrustStream v4.0 Workflow Automation Infrastructure
-- Author: MiniMax Agent
-- Created: 2025-09-19

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Community Templates for CommunitySeeder
CREATE TABLE IF NOT EXISTS community_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(255) NOT NULL,
    template_type VARCHAR(100) NOT NULL CHECK (template_type IN ('basic', 'business', 'academic', 'social', 'governance')),
    template_config JSONB NOT NULL DEFAULT '{}',
    sections_config JSONB NOT NULL DEFAULT '{"people": true, "content": true, "community": true, "product": false, "diary": true}',
    agent_deployment_config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.0,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Community Deployments tracking
CREATE TABLE IF NOT EXISTS community_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL,
    template_id UUID REFERENCES community_templates(id),
    deployment_status VARCHAR(50) DEFAULT 'initializing' CHECK (deployment_status IN ('initializing', 'deploying_structure', 'deploying_agents', 'seeding_content', 'completed', 'failed')),
    deployment_config JSONB DEFAULT '{}',
    sections_created JSONB DEFAULT '{}',
    agents_deployed JSONB DEFAULT '[]',
    content_seeded INTEGER DEFAULT 0,
    deployment_progress DECIMAL(5,2) DEFAULT 0.0,
    error_logs JSONB DEFAULT '[]',
    initiated_by UUID,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- 3. Agent Deployment Templates
CREATE TABLE IF NOT EXISTS agent_deployment_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(255) NOT NULL,
    agent_type VARCHAR(100) NOT NULL CHECK (agent_type IN ('ai_leader', 'marketing', 'compliance', 'opportunity', 'context_manager', 'content_seeder')),
    deployment_config JSONB NOT NULL DEFAULT '{}',
    resource_requirements JSONB DEFAULT '{}',
    integration_points JSONB DEFAULT '[]',
    success_criteria JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    deployment_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.0,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Agent Instances (extending existing if needed)
CREATE TABLE IF NOT EXISTS agent_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL,
    agent_type VARCHAR(100) NOT NULL,
    agent_name VARCHAR(255) NOT NULL,
    deployment_template_id UUID REFERENCES agent_deployment_templates(id),
    agent_status VARCHAR(50) DEFAULT 'initializing' CHECK (agent_status IN ('initializing', 'active', 'paused', 'error', 'terminated')),
    agent_config JSONB DEFAULT '{}',
    performance_metrics JSONB DEFAULT '{}',
    resource_usage JSONB DEFAULT '{}',
    last_activity TIMESTAMP WITH TIME ZONE,
    health_score DECIMAL(5,2) DEFAULT 1.0,
    deployed_by UUID,
    deployed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    terminated_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- 5. Content Sources for ContentSeeder
CREATE TABLE IF NOT EXISTS content_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name VARCHAR(255) NOT NULL,
    source_type VARCHAR(100) NOT NULL CHECK (source_type IN ('api', 'rss', 'web_search', 'manual', 'ai_generated')),
    source_url TEXT,
    source_config JSONB DEFAULT '{}',
    content_categories JSONB DEFAULT '["trust", "debate", "fun", "opportunity"]',
    fetch_frequency INTEGER DEFAULT 3600, -- seconds
    last_fetch TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    quality_score DECIMAL(5,2) DEFAULT 0.5,
    content_count INTEGER DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Content Queue with embeddings for similarity detection
CREATE TABLE IF NOT EXISTS content_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES content_sources(id),
    content_title VARCHAR(500) NOT NULL,
    content_body TEXT,
    content_url TEXT,
    content_type VARCHAR(100) DEFAULT 'article',
    content_category VARCHAR(100),
    embedding vector(1536), -- OpenAI embeddings
    similarity_threshold DECIMAL(5,2) DEFAULT 0.8,
    processing_status VARCHAR(50) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'approved', 'rejected', 'duplicate', 'published')),
    ai_analysis JSONB DEFAULT '{}',
    moderation_result JSONB DEFAULT '{}',
    duplicate_of UUID,
    priority_score DECIMAL(5,2) DEFAULT 0.5,
    target_community_id UUID,
    scheduled_publish TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE
);

-- 7. Debate Automation
CREATE TABLE IF NOT EXISTS debate_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL,
    debate_id UUID REFERENCES community_debates(id),
    automation_type VARCHAR(100) NOT NULL CHECK (automation_type IN ('ai_post_generation', 'rag_summarization', 'vote_execution', 'moderation')),
    automation_config JSONB DEFAULT '{}',
    trigger_conditions JSONB DEFAULT '{}',
    ai_leader_involved BOOLEAN DEFAULT false,
    automation_status VARCHAR(50) DEFAULT 'active' CHECK (automation_status IN ('active', 'paused', 'completed', 'error')),
    execution_count INTEGER DEFAULT 0,
    last_execution TIMESTAMP WITH TIME ZONE,
    next_execution TIMESTAMP WITH TIME ZONE,
    performance_metrics JSONB DEFAULT '{}',
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Compliance Triggers
CREATE TABLE IF NOT EXISTS compliance_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger_name VARCHAR(255) NOT NULL,
    trigger_type VARCHAR(100) NOT NULL CHECK (trigger_type IN ('policy_violation', 'content_report', 'trust_score_drop', 'community_threshold', 'manual')),
    trigger_conditions JSONB NOT NULL DEFAULT '{}',
    webhook_url TEXT,
    automation_workflow JSONB DEFAULT '{}',
    escalation_rules JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    trigger_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.0,
    last_triggered TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Compliance Actions
CREATE TABLE IF NOT EXISTS compliance_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger_id UUID REFERENCES compliance_triggers(id),
    community_id UUID,
    user_id UUID,
    content_id UUID,
    action_type VARCHAR(100) NOT NULL CHECK (action_type IN ('warning', 'content_removal', 'temporary_ban', 'permanent_ban', 'review_required', 'escalate')),
    action_reason TEXT,
    policy_reference JSONB DEFAULT '{}',
    governance_analysis JSONB DEFAULT '{}',
    action_status VARCHAR(50) DEFAULT 'pending' CHECK (action_status IN ('pending', 'executed', 'appealed', 'reversed', 'expired')),
    automated BOOLEAN DEFAULT true,
    executed_by UUID,
    reviewed_by UUID,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    appeal_deadline TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- 10. Workflow Monitoring
CREATE TABLE IF NOT EXISTS workflow_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_type VARCHAR(100) NOT NULL,
    workflow_instance_id UUID,
    community_id UUID,
    monitoring_data JSONB DEFAULT '{}',
    performance_metrics JSONB DEFAULT '{}',
    health_status VARCHAR(50) DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'warning', 'critical', 'failed')),
    alert_conditions JSONB DEFAULT '{}',
    last_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    next_check TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_deployments_status ON community_deployments(deployment_status, started_at);
CREATE INDEX IF NOT EXISTS idx_agent_instances_community ON agent_instances(community_id, agent_status);
CREATE INDEX IF NOT EXISTS idx_content_queue_status ON content_queue(processing_status, created_at);
CREATE INDEX IF NOT EXISTS idx_content_queue_embedding ON content_queue USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_debate_automations_community ON debate_automations(community_id, automation_status);
CREATE INDEX IF NOT EXISTS idx_compliance_triggers_active ON compliance_triggers(is_active, trigger_type);
CREATE INDEX IF NOT EXISTS idx_compliance_actions_status ON compliance_actions(action_status, executed_at);
CREATE INDEX IF NOT EXISTS idx_workflow_monitoring_health ON workflow_monitoring(health_status, last_check);

-- Create RPC function for content similarity detection
CREATE OR REPLACE FUNCTION detect_content_similarity(
    query_embedding vector(1536),
    similarity_threshold float DEFAULT 0.8,
    limit_results int DEFAULT 10
)
RETURNS TABLE (
    id uuid,
    content_title varchar(500),
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cq.id,
        cq.content_title,
        1 - (cq.embedding <=> query_embedding) as similarity
    FROM content_queue cq
    WHERE 
        cq.embedding IS NOT NULL
        AND 1 - (cq.embedding <=> query_embedding) > similarity_threshold
    ORDER BY cq.embedding <=> query_embedding
    LIMIT limit_results;
END;
$$;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, anon;
GRANT EXECUTE ON FUNCTION detect_content_similarity TO authenticated, anon;;