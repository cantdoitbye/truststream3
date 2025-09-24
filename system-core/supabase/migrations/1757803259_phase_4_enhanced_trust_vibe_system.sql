-- Migration: phase_4_enhanced_trust_vibe_system
-- Created at: 1757803259

-- Migration: phase_4_enhanced_trust_vibe_system
-- Created at: 2025-09-14 06:37:27
-- Phase 4: Enhanced Trust-Vibe System Implementation (0.00-5.00 Scale)

-- ===========================================
-- PHASE 4: ENHANCED TRUST-VIBE SYSTEM
-- Precise 0.00-5.00 Trust Scoring with Advanced Analytics
-- ===========================================

-- Create comprehensive trust scoring system with 0.00-5.00 precision
CREATE TABLE IF NOT EXISTS phase4_trust_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    
    -- Primary Trust Score (0.00-5.00 with 2 decimal precision)
    overall_trust_score DECIMAL(3,2) DEFAULT 2.50 CHECK (overall_trust_score >= 0.00 AND overall_trust_score <= 5.00),
    
    -- Component Trust Factors (matching Phase 4 requirements)
    response_quality_score DECIMAL(3,2) DEFAULT 2.50 CHECK (response_quality_score >= 0.00 AND response_quality_score <= 5.00), -- 30% weight
    user_satisfaction_score DECIMAL(3,2) DEFAULT 2.50 CHECK (user_satisfaction_score >= 0.00 AND user_satisfaction_score <= 5.00), -- 25% weight
    interaction_success_score DECIMAL(3,2) DEFAULT 2.50 CHECK (interaction_success_score >= 0.00 AND interaction_success_score <= 5.00), -- 20% weight
    historical_reliability_score DECIMAL(3,2) DEFAULT 2.50 CHECK (historical_reliability_score >= 0.00 AND historical_reliability_score <= 5.00), -- 15% weight
    vibe_alignment_score DECIMAL(3,2) DEFAULT 2.50 CHECK (vibe_alignment_score >= 0.00 AND vibe_alignment_score <= 5.00), -- 10% weight
    
    -- Trust Trend Analysis
    trust_trend DECIMAL(4,2) DEFAULT 0.00, -- -5.00 to +5.00 change indicator
    trust_stability_factor DECIMAL(3,2) DEFAULT 3.00 CHECK (trust_stability_factor >= 0.00 AND trust_stability_factor <= 5.00),
    confidence_level DECIMAL(3,2) DEFAULT 3.00 CHECK (confidence_level >= 0.00 AND confidence_level <= 5.00),
    
    -- Context and Metadata
    interaction_context TEXT DEFAULT 'general',
    trust_category TEXT DEFAULT 'general' CHECK (trust_category IN ('general', 'technical', 'creative', 'analytical', 'conversational', 'specialized')),
    calculation_version TEXT DEFAULT 'phase4_v1.0',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_interaction_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create advanced vibe tracking system
CREATE TABLE IF NOT EXISTS phase4_vibe_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    interaction_id UUID, -- Reference to specific interaction
    
    -- Vibe Measurements (0.00-5.00 precision)
    emotional_sentiment_score DECIMAL(3,2) DEFAULT 2.50 CHECK (emotional_sentiment_score >= 0.00 AND emotional_sentiment_score <= 5.00),
    engagement_level DECIMAL(3,2) DEFAULT 2.50 CHECK (engagement_level >= 0.00 AND engagement_level <= 5.00),
    satisfaction_indicator DECIMAL(3,2) DEFAULT 2.50 CHECK (satisfaction_indicator >= 0.00 AND satisfaction_indicator <= 5.00),
    conversation_tone_score DECIMAL(3,2) DEFAULT 2.50 CHECK (conversation_tone_score >= 0.00 AND conversation_tone_score <= 5.00),
    
    -- Vibe Analysis Results
    vibe_category TEXT DEFAULT 'neutral' CHECK (vibe_category IN ('very_negative', 'negative', 'neutral', 'positive', 'very_positive')),
    emotional_state TEXT DEFAULT 'balanced' CHECK (emotional_state IN ('frustrated', 'confused', 'balanced', 'satisfied', 'delighted')),
    interaction_quality TEXT DEFAULT 'average' CHECK (interaction_quality IN ('poor', 'below_average', 'average', 'good', 'excellent')),
    
    -- Contextual Information
    interaction_duration INTEGER DEFAULT 0, -- seconds
    message_complexity_score DECIMAL(3,2) DEFAULT 2.50,
    user_effort_level DECIMAL(3,2) DEFAULT 2.50,
    
    -- AI Analysis Results
    sentiment_analysis_raw JSONB DEFAULT '{}',
    nlp_confidence_score DECIMAL(3,2) DEFAULT 2.50,
    vibe_prediction_accuracy DECIMAL(3,2) DEFAULT 2.50,
    
    -- Timestamps
    interaction_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trust-based agent recommendations system
CREATE TABLE IF NOT EXISTS phase4_trust_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recommended_agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    
    -- Recommendation Scores
    recommendation_confidence DECIMAL(3,2) DEFAULT 2.50 CHECK (recommendation_confidence >= 0.00 AND recommendation_confidence <= 5.00),
    trust_compatibility_score DECIMAL(3,2) DEFAULT 2.50 CHECK (trust_compatibility_score >= 0.00 AND trust_compatibility_score <= 5.00),
    predicted_user_satisfaction DECIMAL(3,2) DEFAULT 2.50 CHECK (predicted_user_satisfaction >= 0.00 AND predicted_user_satisfaction <= 5.00),
    
    -- Recommendation Context
    recommendation_reason TEXT,
    use_case_category TEXT DEFAULT 'general',
    user_preference_match DECIMAL(3,2) DEFAULT 2.50,
    
    -- Performance Tracking
    recommendation_accepted BOOLEAN DEFAULT FALSE,
    actual_satisfaction_score DECIMAL(3,2),
    recommendation_accuracy_score DECIMAL(3,2),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    used_at TIMESTAMP WITH TIME ZONE
);

-- Create comprehensive reputation tracking system
CREATE TABLE IF NOT EXISTS phase4_reputation_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL, -- Can reference users or agents
    entity_type TEXT NOT NULL CHECK (entity_type IN ('user', 'agent', 'system')),
    
    -- Multi-dimensional Reputation Scores (0.00-5.00)
    technical_reputation DECIMAL(3,2) DEFAULT 2.50 CHECK (technical_reputation >= 0.00 AND technical_reputation <= 5.00),
    social_reputation DECIMAL(3,2) DEFAULT 2.50 CHECK (social_reputation >= 0.00 AND social_reputation <= 5.00),
    creative_reputation DECIMAL(3,2) DEFAULT 2.50 CHECK (creative_reputation >= 0.00 AND creative_reputation <= 5.00),
    analytical_reputation DECIMAL(3,2) DEFAULT 2.50 CHECK (analytical_reputation >= 0.00 AND analytical_reputation <= 5.00),
    reliability_reputation DECIMAL(3,2) DEFAULT 2.50 CHECK (reliability_reputation >= 0.00 AND reliability_reputation <= 5.00),
    
    -- Overall Reputation Metrics
    overall_reputation_score DECIMAL(3,2) DEFAULT 2.50 CHECK (overall_reputation_score >= 0.00 AND overall_reputation_score <= 5.00),
    reputation_stability DECIMAL(3,2) DEFAULT 3.00,
    reputation_growth_trend DECIMAL(4,2) DEFAULT 0.00,
    
    -- Credibility Validation
    validation_level TEXT DEFAULT 'basic' CHECK (validation_level IN ('basic', 'verified', 'expert', 'authoritative')),
    peer_validation_count INTEGER DEFAULT 0,
    system_validation_score DECIMAL(3,2) DEFAULT 2.50,
    
    -- Performance Metrics
    total_interactions INTEGER DEFAULT 0,
    successful_interactions INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_validation_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trust score history for trend analysis
CREATE TABLE IF NOT EXISTS phase4_trust_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    
    -- Historical Trust Data
    trust_score_snapshot DECIMAL(3,2) CHECK (trust_score_snapshot >= 0.00 AND trust_score_snapshot <= 5.00),
    trust_change_delta DECIMAL(4,2), -- Change from previous score
    change_reason TEXT,
    interaction_trigger_id UUID,
    
    -- Context
    calculation_method TEXT DEFAULT 'phase4_comprehensive',
    confidence_level DECIMAL(3,2) DEFAULT 2.50,
    
    -- Timestamps
    snapshot_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user feedback integration system
CREATE TABLE IF NOT EXISTS phase4_trust_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    target_entity_id UUID NOT NULL, -- user or agent
    entity_type TEXT NOT NULL CHECK (entity_type IN ('user', 'agent')),
    
    -- Feedback Scores (0.00-5.00)
    trust_rating DECIMAL(3,2) CHECK (trust_rating >= 0.00 AND trust_rating <= 5.00),
    reliability_rating DECIMAL(3,2) CHECK (reliability_rating >= 0.00 AND reliability_rating <= 5.00),
    quality_rating DECIMAL(3,2) CHECK (quality_rating >= 0.00 AND quality_rating <= 5.00),
    satisfaction_rating DECIMAL(3,2) CHECK (satisfaction_rating >= 0.00 AND satisfaction_rating <= 5.00),
    
    -- Textual Feedback
    feedback_text TEXT,
    feedback_sentiment DECIMAL(4,2) DEFAULT 0.00, -- -5.00 to +5.00
    feedback_category TEXT DEFAULT 'general',
    
    -- Feedback Processing
    processed BOOLEAN DEFAULT FALSE,
    impact_on_trust_score DECIMAL(4,2) DEFAULT 0.00,
    validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validated', 'disputed', 'ignored')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_phase4_trust_scores_user_id ON phase4_trust_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_phase4_trust_scores_agent_id ON phase4_trust_scores(agent_id);
CREATE INDEX IF NOT EXISTS idx_phase4_trust_scores_overall ON phase4_trust_scores(overall_trust_score DESC);
CREATE INDEX IF NOT EXISTS idx_phase4_trust_scores_updated ON phase4_trust_scores(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_phase4_vibe_analytics_user_id ON phase4_vibe_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_phase4_vibe_analytics_agent_id ON phase4_vibe_analytics(agent_id);
CREATE INDEX IF NOT EXISTS idx_phase4_vibe_analytics_timestamp ON phase4_vibe_analytics(interaction_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_phase4_trust_recommendations_user_id ON phase4_trust_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_phase4_trust_recommendations_confidence ON phase4_trust_recommendations(recommendation_confidence DESC);
CREATE INDEX IF NOT EXISTS idx_phase4_trust_recommendations_expires ON phase4_trust_recommendations(expires_at);

CREATE INDEX IF NOT EXISTS idx_phase4_reputation_entity ON phase4_reputation_tracking(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_phase4_reputation_overall ON phase4_reputation_tracking(overall_reputation_score DESC);

CREATE INDEX IF NOT EXISTS idx_phase4_trust_history_user ON phase4_trust_history(user_id, snapshot_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_phase4_trust_feedback_target ON phase4_trust_feedback(target_entity_id, entity_type);

-- Create RLS (Row Level Security) policies
ALTER TABLE phase4_trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase4_vibe_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase4_trust_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase4_reputation_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase4_trust_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase4_trust_feedback ENABLE ROW LEVEL SECURITY;

-- Trust scores: Users can view their own trust scores and scores they've given
CREATE POLICY "Users can view their own trust scores" ON phase4_trust_scores
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = target_user_id);

CREATE POLICY "Users can insert their own trust evaluations" ON phase4_trust_scores
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trust evaluations" ON phase4_trust_scores
    FOR UPDATE USING (auth.uid() = user_id);

-- Vibe analytics: Users can view and insert their own vibe data
CREATE POLICY "Users can view their own vibe analytics" ON phase4_vibe_analytics
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = target_user_id);

CREATE POLICY "Users can insert their own vibe data" ON phase4_vibe_analytics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trust recommendations: Users can view their own recommendations
CREATE POLICY "Users can view their own trust recommendations" ON phase4_trust_recommendations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert trust recommendations" ON phase4_trust_recommendations
    FOR INSERT WITH CHECK (true); -- Allow system to insert recommendations

CREATE POLICY "Users can update their recommendation responses" ON phase4_trust_recommendations
    FOR UPDATE USING (auth.uid() = user_id);

-- Reputation tracking: Public read, system write
CREATE POLICY "Public can view reputation data" ON phase4_reputation_tracking
    FOR SELECT USING (true);

CREATE POLICY "System can manage reputation data" ON phase4_reputation_tracking
    FOR ALL USING (true); -- System-managed table

-- Trust history: Users can view their own history
CREATE POLICY "Users can view their own trust history" ON phase4_trust_history
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = target_user_id);

CREATE POLICY "System can insert trust history" ON phase4_trust_history
    FOR INSERT WITH CHECK (true);

-- Trust feedback: Users can manage their own feedback
CREATE POLICY "Users can view relevant feedback" ON phase4_trust_feedback
    FOR SELECT USING (auth.uid() = user_id OR (entity_type = 'user' AND target_entity_id = auth.uid()));

CREATE POLICY "Users can insert their own feedback" ON phase4_trust_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback" ON phase4_trust_feedback
    FOR UPDATE USING (auth.uid() = user_id);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_phase4_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_phase4_trust_scores_updated_at BEFORE UPDATE ON phase4_trust_scores FOR EACH ROW EXECUTE FUNCTION update_phase4_updated_at_column();
CREATE TRIGGER update_phase4_reputation_tracking_updated_at BEFORE UPDATE ON phase4_reputation_tracking FOR EACH ROW EXECUTE FUNCTION update_phase4_updated_at_column();

-- Insert seed data for Phase 4 trust system
INSERT INTO phase4_reputation_tracking (entity_id, entity_type, technical_reputation, social_reputation, creative_reputation, analytical_reputation, reliability_reputation, overall_reputation_score)
SELECT 
    id as entity_id,
    'agent' as entity_type,
    ROUND((RANDOM() * 2 + 3)::numeric, 2) as technical_reputation,
    ROUND((RANDOM() * 2 + 3)::numeric, 2) as social_reputation,
    ROUND((RANDOM() * 2 + 3)::numeric, 2) as creative_reputation,
    ROUND((RANDOM() * 2 + 3)::numeric, 2) as analytical_reputation,
    ROUND((RANDOM() * 2 + 3)::numeric, 2) as reliability_reputation,
    ROUND((RANDOM() * 2 + 3)::numeric, 2) as overall_reputation_score
FROM ai_agents 
WHERE id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Add sample trust scores for existing users and agents
INSERT INTO phase4_trust_scores (
    user_id, 
    agent_id, 
    overall_trust_score,
    response_quality_score,
    user_satisfaction_score,
    interaction_success_score,
    historical_reliability_score,
    vibe_alignment_score,
    trust_category
)
SELECT 
    u.id as user_id,
    a.id as agent_id,
    ROUND((RANDOM() * 3 + 1.5)::numeric, 2) as overall_trust_score,
    ROUND((RANDOM() * 3 + 1.5)::numeric, 2) as response_quality_score,
    ROUND((RANDOM() * 3 + 1.5)::numeric, 2) as user_satisfaction_score,
    ROUND((RANDOM() * 3 + 1.5)::numeric, 2) as interaction_success_score,
    ROUND((RANDOM() * 3 + 1.5)::numeric, 2) as historical_reliability_score,
    ROUND((RANDOM() * 3 + 1.5)::numeric, 2) as vibe_alignment_score,
    CASE 
        WHEN RANDOM() < 0.2 THEN 'technical'
        WHEN RANDOM() < 0.4 THEN 'creative'
        WHEN RANDOM() < 0.6 THEN 'analytical'
        WHEN RANDOM() < 0.8 THEN 'conversational'
        ELSE 'general'
    END as trust_category
FROM auth.users u
CROSS JOIN (SELECT id FROM ai_agents LIMIT 10) a
WHERE u.id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Phase 4 Trust-Vibe System successfully created with 0.00-5.00 precision scaling
-- All tables include proper constraints, indexes, RLS policies, and seed data
-- Ready for advanced trust calculation and vibe analysis implementation;