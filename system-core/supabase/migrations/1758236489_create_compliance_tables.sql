-- Migration: create_compliance_tables
-- Created at: 1758236489

-- Create compliance reports table
CREATE TABLE IF NOT EXISTS compliance_reports (
    id SERIAL PRIMARY KEY,
    report_type VARCHAR(100) DEFAULT 'monitoring',
    report_data JSONB,
    compliance_score DECIMAL(5,4) DEFAULT 0,
    violations_count INTEGER DEFAULT 0,
    risk_level VARCHAR(50) DEFAULT 'low',
    created_by_agent VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create policy violations tracking
CREATE TABLE IF NOT EXISTS policy_violations (
    id SERIAL PRIMARY KEY,
    activity_id VARCHAR(255),
    user_id VARCHAR(255),
    violation_type VARCHAR(100),
    severity_level VARCHAR(50),
    confidence_score DECIMAL(5,4),
    content_excerpt TEXT,
    recommended_action VARCHAR(100),
    status VARCHAR(50) DEFAULT 'detected',
    detected_by_agent VARCHAR(100),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create violation escalations
CREATE TABLE IF NOT EXISTS violation_escalations (
    id SERIAL PRIMARY KEY,
    violation_id INTEGER REFERENCES policy_violations(id),
    escalation_reason TEXT,
    urgency_level VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending_review',
    escalated_by_agent VARCHAR(100),
    escalated_at TIMESTAMP WITH TIME ZONE,
    requires_human_review BOOLEAN DEFAULT true,
    escalation_priority INTEGER DEFAULT 3,
    resolved_by VARCHAR(255),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create regulatory knowledge base
CREATE TABLE IF NOT EXISTS regulatory_knowledge (
    id SERIAL PRIMARY KEY,
    regulation_text TEXT,
    source VARCHAR(255),
    category VARCHAR(100),
    effective_date TIMESTAMP WITH TIME ZONE,
    embedding_generated BOOLEAN DEFAULT false,
    keywords TEXT[],
    created_by_agent VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create community agent interactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS community_agent_interactions (
    id SERIAL PRIMARY KEY,
    agent_id VARCHAR(100),
    member_id VARCHAR(255),
    interaction_type VARCHAR(100),
    context TEXT,
    guidance_provided TEXT,
    trust_weighted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);;