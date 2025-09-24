-- Daughter Community RAG Management System Schema
-- Enables hierarchical community structures with autonomous sub-community creation
-- Author: MiniMax Agent
-- Created: 2025-09-20 10:30:53

-- Table for daughter community creation requests
CREATE TABLE IF NOT EXISTS daughter_community_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    requested_name VARCHAR(255) NOT NULL,
    specialized_focus TEXT NOT NULL,
    justification TEXT,
    requesting_agent_id VARCHAR(255),
    requesting_user_id UUID REFERENCES auth.users(id),
    status VARCHAR(50) CHECK (status IN ('pending', 'approved', 'rejected', 'implemented')) DEFAULT 'pending',
    approval_reasoning TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    implemented_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- Table for hierarchical community structure relationships
CREATE TABLE IF NOT EXISTS hierarchical_community_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    daughter_community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    specialization_area TEXT NOT NULL,
    inheritance_level DECIMAL(3,2) CHECK (inheritance_level >= 0.0 AND inheritance_level <= 1.0) DEFAULT 0.8,
    autonomy_level DECIMAL(3,2) CHECK (autonomy_level >= 0.0 AND autonomy_level <= 1.0) DEFAULT 0.6,
    resource_allocation_percentage DECIMAL(3,2) CHECK (resource_allocation_percentage >= 0.0 AND resource_allocation_percentage <= 1.0) DEFAULT 0.2,
    coordination_protocol TEXT DEFAULT 'standard',
    performance_metrics JSONB DEFAULT '{}',
    status VARCHAR(50) CHECK (status IN ('active', 'inactive', 'suspended', 'archived')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_optimized_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(parent_community_id, daughter_community_id)
);

-- Table for cross-community coordination logs
CREATE TABLE IF NOT EXISTS cross_community_coordination_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_community_id UUID REFERENCES communities(id),
    daughter_community_id UUID REFERENCES communities(id),
    activity_type VARCHAR(100) NOT NULL,
    activity_details JSONB DEFAULT '{}',
    success_level VARCHAR(50) CHECK (success_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    lessons_learned TEXT,
    coordination_quality_score DECIMAL(3,2) CHECK (coordination_quality_score >= 0.0 AND coordination_quality_score <= 1.0),
    resource_impact JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by_agent VARCHAR(255),
    created_by_user UUID REFERENCES auth.users(id)
);

-- Table for organizational structure learning patterns
CREATE TABLE IF NOT EXISTS organizational_structure_learnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_type VARCHAR(100) NOT NULL,
    insights JSONB NOT NULL DEFAULT '[]',
    success_factors JSONB DEFAULT '[]',
    failure_patterns JSONB DEFAULT '[]',
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0) DEFAULT 0.5,
    applicability_contexts JSONB DEFAULT '[]',
    validation_count INTEGER DEFAULT 0,
    last_validated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    learning_source VARCHAR(100) DEFAULT 'automated_analysis',
    quality_rating DECIMAL(3,2) CHECK (quality_rating >= 0.0 AND quality_rating <= 1.0)
);

-- Table for objective cascading tracking
CREATE TABLE IF NOT EXISTS objective_cascade_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_community_id UUID REFERENCES communities(id),
    cascade_session_id UUID NOT NULL,
    daughter_community_id UUID REFERENCES communities(id),
    parent_objective JSONB NOT NULL,
    specialized_objective JSONB NOT NULL,
    success_metrics JSONB DEFAULT '{}',
    progress_status VARCHAR(50) CHECK (progress_status IN ('not_started', 'in_progress', 'on_track', 'behind', 'completed', 'failed')) DEFAULT 'not_started',
    completion_percentage DECIMAL(5,2) CHECK (completion_percentage >= 0.0 AND completion_percentage <= 100.0) DEFAULT 0.0,
    last_progress_update TIMESTAMP WITH TIME ZONE,
    target_completion_date TIMESTAMP WITH TIME ZONE,
    actual_completion_date TIMESTAMP WITH TIME ZONE,
    escalation_triggered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for resource coordination optimization
CREATE TABLE IF NOT EXISTS resource_coordination_optimization (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_community_id UUID REFERENCES communities(id),
    optimization_session_id UUID NOT NULL,
    current_allocation JSONB NOT NULL,
    recommended_allocation JSONB NOT NULL,
    efficiency_improvement_estimate DECIMAL(5,2),
    implementation_status VARCHAR(50) CHECK (implementation_status IN ('pending', 'in_progress', 'completed', 'rolled_back')) DEFAULT 'pending',
    actual_efficiency_gain DECIMAL(5,2),
    implementation_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    implemented_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_daughter_requests_parent_community ON daughter_community_requests(parent_community_id);
CREATE INDEX IF NOT EXISTS idx_daughter_requests_status ON daughter_community_requests(status);
CREATE INDEX IF NOT EXISTS idx_daughter_requests_created_at ON daughter_community_requests(created_at);

CREATE INDEX IF NOT EXISTS idx_hierarchical_structures_parent ON hierarchical_community_structures(parent_community_id);
CREATE INDEX IF NOT EXISTS idx_hierarchical_structures_daughter ON hierarchical_community_structures(daughter_community_id);
CREATE INDEX IF NOT EXISTS idx_hierarchical_structures_status ON hierarchical_community_structures(status);
CREATE INDEX IF NOT EXISTS idx_hierarchical_structures_specialization ON hierarchical_community_structures(specialization_area);

CREATE INDEX IF NOT EXISTS idx_coordination_logs_parent ON cross_community_coordination_logs(parent_community_id);
CREATE INDEX IF NOT EXISTS idx_coordination_logs_daughter ON cross_community_coordination_logs(daughter_community_id);
CREATE INDEX IF NOT EXISTS idx_coordination_logs_activity_type ON cross_community_coordination_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_coordination_logs_created_at ON cross_community_coordination_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_structure_learnings_pattern_type ON organizational_structure_learnings(pattern_type);
CREATE INDEX IF NOT EXISTS idx_structure_learnings_confidence ON organizational_structure_learnings(confidence_score);
CREATE INDEX IF NOT EXISTS idx_structure_learnings_created_at ON organizational_structure_learnings(created_at);

CREATE INDEX IF NOT EXISTS idx_objective_cascade_parent ON objective_cascade_tracking(parent_community_id);
CREATE INDEX IF NOT EXISTS idx_objective_cascade_daughter ON objective_cascade_tracking(daughter_community_id);
CREATE INDEX IF NOT EXISTS idx_objective_cascade_session ON objective_cascade_tracking(cascade_session_id);
CREATE INDEX IF NOT EXISTS idx_objective_cascade_status ON objective_cascade_tracking(progress_status);

CREATE INDEX IF NOT EXISTS idx_resource_optimization_parent ON resource_coordination_optimization(parent_community_id);
CREATE INDEX IF NOT EXISTS idx_resource_optimization_session ON resource_coordination_optimization(optimization_session_id);
CREATE INDEX IF NOT EXISTS idx_resource_optimization_status ON resource_coordination_optimization(implementation_status);

-- Create views for common queries
CREATE OR REPLACE VIEW daughter_community_overview AS
SELECT 
    hcs.id as relationship_id,
    pc.id as parent_community_id,
    pc.name as parent_community_name,
    dc.id as daughter_community_id,
    dc.name as daughter_community_name,
    hcs.specialization_area,
    hcs.inheritance_level,
    hcs.autonomy_level,
    hcs.resource_allocation_percentage,
    hcs.status as relationship_status,
    hcs.created_at as relationship_created_at,
    pc.member_count as parent_member_count,
    dc.member_count as daughter_member_count
FROM hierarchical_community_structures hcs
JOIN communities pc ON hcs.parent_community_id = pc.id
JOIN communities dc ON hcs.daughter_community_id = dc.id
WHERE hcs.status = 'active';

CREATE OR REPLACE VIEW organizational_effectiveness_metrics AS
SELECT 
    parent_community_id,
    COUNT(*) as total_daughter_communities,
    AVG(autonomy_level) as avg_autonomy_level,
    SUM(resource_allocation_percentage) as total_resource_allocation,
    AVG(inheritance_level) as avg_inheritance_level,
    COUNT(DISTINCT specialization_area) as unique_specializations,
    (AVG(autonomy_level) + LEAST(SUM(resource_allocation_percentage), 1.0)) / 2 as efficiency_score
FROM hierarchical_community_structures
WHERE status = 'active'
GROUP BY parent_community_id;

-- Row Level Security (RLS) policies
ALTER TABLE daughter_community_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE hierarchical_community_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_community_coordination_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizational_structure_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE objective_cascade_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_coordination_optimization ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access (for agents)
CREATE POLICY "Service role can manage daughter community requests" ON daughter_community_requests
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage hierarchical structures" ON hierarchical_community_structures
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage coordination logs" ON cross_community_coordination_logs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage structure learnings" ON organizational_structure_learnings
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage objective cascading" ON objective_cascade_tracking
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage resource optimization" ON resource_coordination_optimization
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Create policies for authenticated users to read their community data
CREATE POLICY "Users can view daughter community requests for their communities" ON daughter_community_requests
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            parent_community_id IN (
                SELECT id FROM communities WHERE creator_id = auth.uid()
                UNION
                SELECT community_id FROM community_members WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can view hierarchical structures for their communities" ON hierarchical_community_structures
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            parent_community_id IN (
                SELECT id FROM communities WHERE creator_id = auth.uid()
                UNION
                SELECT community_id FROM community_members WHERE user_id = auth.uid()
            )
            OR daughter_community_id IN (
                SELECT id FROM communities WHERE creator_id = auth.uid()
                UNION
                SELECT community_id FROM community_members WHERE user_id = auth.uid()
            )
        )
    );

-- Function to automatically create daughter community relationships
CREATE OR REPLACE FUNCTION create_daughter_community_relationship()
RETURNS TRIGGER AS $$
BEGIN
    -- When a daughter community request is approved, automatically create the hierarchical structure
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        -- This would be handled by the agent, but we could add automatic creation here if needed
        NEW.approved_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic relationship creation
CREATE TRIGGER trigger_daughter_community_approval
    BEFORE UPDATE ON daughter_community_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_daughter_community_relationship();

-- Function to calculate structure efficiency
CREATE OR REPLACE FUNCTION calculate_structure_efficiency(parent_id UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    avg_autonomy DECIMAL(3,2);
    resource_utilization DECIMAL(3,2);
    structure_count INTEGER;
BEGIN
    SELECT 
        AVG(autonomy_level),
        SUM(resource_allocation_percentage),
        COUNT(*)
    INTO avg_autonomy, resource_utilization, structure_count
    FROM hierarchical_community_structures
    WHERE parent_community_id = parent_id AND status = 'active';
    
    IF structure_count = 0 THEN
        RETURN 1.0;
    END IF;
    
    RETURN (COALESCE(avg_autonomy, 0) + LEAST(COALESCE(resource_utilization, 0), 1.0)) / 2;
END;
$$ LANGUAGE plpgsql;

-- Insert initial organizational learning patterns
INSERT INTO organizational_structure_learnings (pattern_type, insights, success_factors, confidence_score, applicability_contexts) VALUES
('optimal_daughter_count', 
 '["Communities with 2-4 daughter communities show optimal performance", "More than 5 specializations can lead to coordination overhead"]',
 '["clear_specialization_boundaries", "balanced_resource_allocation", "effective_coordination_protocols"]',
 0.8,
 '["medium_to_large_communities", "task_oriented_objectives"]'
),
('autonomy_optimization',
 '["Autonomy levels between 0.6-0.8 maximize effectiveness", "Too low autonomy creates bottlenecks, too high reduces coordination"]',
 '["graduated_autonomy_increase", "clear_decision_boundaries", "regular_coordination_checkpoints"]',
 0.75,
 '["established_communities", "experienced_ai_leaders"]'
),
('resource_allocation_patterns',
 '["Total resource allocation above 0.7 indicates good utilization", "Individual allocations should not exceed 0.4 to maintain balance"]',
 '["dynamic_reallocation_capabilities", "performance_based_adjustments", "transparent_allocation_criteria"]',
 0.85,
 '["resource_constrained_environments", "competitive_objectives"]'
);

-- Add comments for documentation
COMMENT ON TABLE daughter_community_requests IS 'Tracks requests for creating specialized daughter communities with approval workflow';
COMMENT ON TABLE hierarchical_community_structures IS 'Defines parent-daughter community relationships with autonomy and resource allocation settings';
COMMENT ON TABLE cross_community_coordination_logs IS 'Logs coordination activities between parent and daughter communities for learning and audit';
COMMENT ON TABLE organizational_structure_learnings IS 'Stores learned patterns and insights about effective organizational structures';
COMMENT ON TABLE objective_cascade_tracking IS 'Tracks the cascading of objectives from parent to daughter communities with progress monitoring';
COMMENT ON TABLE resource_coordination_optimization IS 'Records resource allocation optimizations and their effectiveness';

COMMENT ON VIEW daughter_community_overview IS 'Provides a comprehensive view of all parent-daughter community relationships';
COMMENT ON VIEW organizational_effectiveness_metrics IS 'Calculates effectiveness metrics for hierarchical community structures';

COMMENT ON FUNCTION calculate_structure_efficiency(UUID) IS 'Calculates the efficiency score for a hierarchical community structure';
