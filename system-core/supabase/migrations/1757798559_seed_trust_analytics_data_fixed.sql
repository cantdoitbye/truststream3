-- Migration: seed_trust_analytics_data_fixed
-- Created at: 1757798559

-- Fixed Seed Trust Analytics Data Migration
-- Created: Phase 1 Critical System Fix - Replace Mock Data
-- This migration properly seeds the database with sample data for testing

-- Insert sample trust network analytics data for existing users
-- First, check if any users exist, if not create sample users
DO $$
BEGIN
  -- Only create sample profiles if none exist
  IF NOT EXISTS (SELECT 1 FROM profiles LIMIT 1) THEN
    -- Insert sample profiles with proper UUIDs
    INSERT INTO profiles (id, email, username, full_name, user_role, trust_score, created_at)
    VALUES 
      ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'demo1@example.com', 'demo_user_1', 'Demo User One', 'user', 89, NOW()),
      ('f47ac10b-58cc-4372-a567-0e02b2c3d480', 'demo2@example.com', 'demo_user_2', 'Demo User Two', 'user', 76, NOW()),
      ('f47ac10b-58cc-4372-a567-0e02b2c3d481', 'demo3@example.com', 'demo_user_3', 'Demo User Three', 'user', 94, NOW()),
      ('f47ac10b-58cc-4372-a567-0e02b2c3d482', 'demo4@example.com', 'demo_user_4', 'Demo User Four', 'user', 63, NOW()),
      ('f47ac10b-58cc-4372-a567-0e02b2c3d483', 'demo5@example.com', 'demo_user_5', 'Demo User Five', 'user', 82, NOW());
  END IF;
END $$;

-- Get the first 5 users (whether existing or newly created)
WITH sample_users AS (
  SELECT id, username, ROW_NUMBER() OVER (ORDER BY created_at) as rn 
  FROM profiles 
  LIMIT 5
)
-- Insert trust network analytics for these users
INSERT INTO trust_network_analytics (
  user_id, trust_score, network_size, influence_score, community_count, 
  cross_vertical_connections, dao_governance_weight, last_updated
)
SELECT 
  id,
  CASE rn
    WHEN 1 THEN 0.89
    WHEN 2 THEN 0.76
    WHEN 3 THEN 0.94
    WHEN 4 THEN 0.63
    ELSE 0.82
  END,
  CASE rn
    WHEN 1 THEN 156
    WHEN 2 THEN 89
    WHEN 3 THEN 234
    WHEN 4 THEN 45
    ELSE 127
  END,
  CASE rn
    WHEN 1 THEN 245.67
    WHEN 2 THEN 178.45
    WHEN 3 THEN 456.78
    WHEN 4 THEN 89.12
    ELSE 198.34
  END,
  CASE rn
    WHEN 3 THEN 5
    WHEN 1 THEN 3
    WHEN 5 THEN 3
    WHEN 2 THEN 2
    ELSE 1
  END,
  CASE rn
    WHEN 3 THEN 18
    WHEN 1 THEN 12
    WHEN 5 THEN 11
    WHEN 2 THEN 8
    ELSE 4
  END,
  CASE rn
    WHEN 3 THEN 0.423
    WHEN 5 THEN 0.287
    WHEN 1 THEN 0.234
    WHEN 2 THEN 0.156
    ELSE 0.089
  END,
  NOW()
FROM sample_users
WHERE NOT EXISTS (
  SELECT 1 FROM trust_network_analytics tna WHERE tna.user_id = sample_users.id
);

-- Insert AI agents with proper enum casting
DO $$
BEGIN
  -- Insert agents only if they don't exist
  IF NOT EXISTS (SELECT 1 FROM ai_agents WHERE name = 'Community Leader Alpha') THEN
    INSERT INTO ai_agents (name, agent_type, layer, community_id, status, current_task, last_activity, configuration, performance_metrics)
    VALUES ('Community Leader Alpha', 'community_leader'::ai_agent_type, 'layer_1', 'default-community', 'active', 'Monitoring community engagement', NOW() - INTERVAL '2 hours', '{"priority": "high", "auto_respond": true}', '{"response_rate": 0.94, "accuracy": 0.87, "engagement": 0.91}');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM ai_agents WHERE name = 'Trust Validator Beta') THEN
    INSERT INTO ai_agents (name, agent_type, layer, community_id, status, current_task, last_activity, configuration, performance_metrics)
    VALUES ('Trust Validator Beta', 'trust_manager'::ai_agent_type, 'layer_2', 'default-community', 'active', 'Validating user trust scores', NOW() - INTERVAL '1 hour', '{"threshold": 0.8, "verification_mode": "strict"}', '{"validation_accuracy": 0.96, "false_positive_rate": 0.03, "throughput": 0.89}');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM ai_agents WHERE name = 'Marketing Agent Gamma') THEN
    INSERT INTO ai_agents (name, agent_type, layer, community_id, status, current_task, last_activity, configuration, performance_metrics)
    VALUES ('Marketing Agent Gamma', 'marketing'::ai_agent_type, 'layer_3', 'default-community', 'active', 'Analyzing campaign performance', NOW() - INTERVAL '30 minutes', '{"campaign_focus": "engagement", "target_demographics": "young_professionals"}', '{"conversion_rate": 0.78, "reach_efficiency": 0.84, "roi": 0.92}');
  END IF;
END $$;

-- Insert workflow coordination tasks
INSERT INTO agent_coordination (
  agent_type, community_id, task_type, task_description, status, priority, assigned_at, performance_score, context_data
) 
SELECT 
  'community_leader'::ai_agent_type, 'default-community', 'community_moderation', 
  'Review and moderate community discussions for quality and adherence to guidelines', 
  'running', 8, NOW() - INTERVAL '3 hours', 0.92, 
  '{"discussion_count": 12, "violations_found": 2, "actions_taken": 3}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM agent_coordination 
  WHERE agent_type = 'community_leader'::ai_agent_type 
  AND task_type = 'community_moderation'
)
UNION ALL
SELECT 
  'trust_manager'::ai_agent_type, 'default-community', 'trust_calculation', 
  'Recalculate trust scores for users with recent activity changes', 
  'completed', 7, NOW() - INTERVAL '6 hours', 0.89, 
  '{"users_processed": 156, "score_changes": 23, "validation_time": "45min"}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM agent_coordination 
  WHERE agent_type = 'trust_manager'::ai_agent_type 
  AND task_type = 'trust_calculation'
)
UNION ALL
SELECT 
  'marketing'::ai_agent_type, 'default-community', 'campaign_analysis', 
  'Analyze the effectiveness of recent community engagement campaigns', 
  'pending', 5, NOW() - INTERVAL '1 hour', null, 
  '{"campaigns_analyzed": 3, "metrics_collected": ["engagement", "conversion", "reach"]}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM agent_coordination 
  WHERE agent_type = 'marketing'::ai_agent_type 
  AND task_type = 'campaign_analysis'
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Trust analytics seed data migration completed successfully';
END $$;;