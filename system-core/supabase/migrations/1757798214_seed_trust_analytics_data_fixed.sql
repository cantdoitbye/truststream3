-- Migration: seed_trust_analytics_data_fixed
-- Created at: 1757798214

-- Seed Trust Analytics Data Migration (Fixed)
-- Created: Phase 1 Critical System Fix - Replace Mock Data

-- First, check if we have any profiles to work with, if not create some basic test data
DO $$
BEGIN
  -- Insert sample profiles if none exist
  IF NOT EXISTS (SELECT 1 FROM profiles LIMIT 1) THEN
    INSERT INTO profiles (id, email, username, full_name, user_role, trust_score)
    VALUES 
      (gen_random_uuid(), 'demo1@example.com', 'demo_user_1', 'Demo User One', 'user', 89),
      (gen_random_uuid(), 'demo2@example.com', 'demo_user_2', 'Demo User Two', 'user', 76),
      (gen_random_uuid(), 'demo3@example.com', 'demo_user_3', 'Demo User Three', 'user', 94),
      (gen_random_uuid(), 'demo4@example.com', 'demo_user_4', 'Demo User Four', 'user', 63),
      (gen_random_uuid(), 'demo5@example.com', 'demo_user_5', 'Demo User Five', 'user', 82);
  END IF;
END $$;

-- Insert sample trust network analytics data (delete existing first to avoid duplicates)
DELETE FROM trust_network_analytics WHERE user_id IN (SELECT id FROM profiles LIMIT 5);

INSERT INTO trust_network_analytics (
  user_id,
  trust_score,
  network_size,
  influence_score,
  community_count,
  cross_vertical_connections,
  dao_governance_weight,
  last_updated
) 
SELECT 
  id,
  CASE 
    WHEN username = 'demo_user_1' THEN 0.89
    WHEN username = 'demo_user_2' THEN 0.76  
    WHEN username = 'demo_user_3' THEN 0.94
    WHEN username = 'demo_user_4' THEN 0.63
    ELSE 0.82
  END,
  CASE 
    WHEN username = 'demo_user_1' THEN 156
    WHEN username = 'demo_user_2' THEN 89
    WHEN username = 'demo_user_3' THEN 234
    WHEN username = 'demo_user_4' THEN 45
    ELSE 127
  END,
  CASE 
    WHEN username = 'demo_user_1' THEN 245.67
    WHEN username = 'demo_user_2' THEN 178.45
    WHEN username = 'demo_user_3' THEN 456.78
    WHEN username = 'demo_user_4' THEN 89.12
    ELSE 198.34
  END,
  CASE 
    WHEN username = 'demo_user_3' THEN 5
    WHEN username = 'demo_user_1' THEN 3
    WHEN username = 'demo_user_5' THEN 3
    WHEN username = 'demo_user_2' THEN 2
    ELSE 1
  END,
  CASE 
    WHEN username = 'demo_user_3' THEN 18
    WHEN username = 'demo_user_1' THEN 12
    WHEN username = 'demo_user_5' THEN 11
    WHEN username = 'demo_user_2' THEN 8
    ELSE 4
  END,
  CASE 
    WHEN username = 'demo_user_3' THEN 0.423
    WHEN username = 'demo_user_5' THEN 0.287
    WHEN username = 'demo_user_1' THEN 0.234
    WHEN username = 'demo_user_2' THEN 0.156
    ELSE 0.089
  END,
  NOW()
FROM profiles 
ORDER BY username 
LIMIT 5;

-- Insert AI agents (only if they don't exist)
INSERT INTO ai_agents (name, agent_type, layer, community_id, status, current_task, last_activity, configuration, performance_metrics)
SELECT 'Community Leader Alpha', 'community_leader', 'layer_1', 'default-community', 'active', 'Monitoring community engagement', NOW() - INTERVAL '2 hours', '{"priority": "high", "auto_respond": true}', '{"response_rate": 0.94, "accuracy": 0.87, "engagement": 0.91}'
WHERE NOT EXISTS (SELECT 1 FROM ai_agents WHERE name = 'Community Leader Alpha')
UNION ALL
SELECT 'Trust Validator Beta', 'trust_validator', 'layer_2', 'default-community', 'active', 'Validating user trust scores', NOW() - INTERVAL '1 hour', '{"threshold": 0.8, "verification_mode": "strict"}', '{"validation_accuracy": 0.96, "false_positive_rate": 0.03, "throughput": 0.89}'
WHERE NOT EXISTS (SELECT 1 FROM ai_agents WHERE name = 'Trust Validator Beta')
UNION ALL
SELECT 'Marketing Agent Gamma', 'marketing', 'layer_3', 'default-community', 'active', 'Analyzing campaign performance', NOW() - INTERVAL '30 minutes', '{"campaign_focus": "engagement", "target_demographics": "young_professionals"}', '{"conversion_rate": 0.78, "reach_efficiency": 0.84, "roi": 0.92}'
WHERE NOT EXISTS (SELECT 1 FROM ai_agents WHERE name = 'Marketing Agent Gamma')
UNION ALL
SELECT 'Analytics Agent Delta', 'analytics', 'layer_2', 'default-community', 'inactive', null, NOW() - INTERVAL '8 hours', '{"data_sources": ["user_activity", "trust_metrics"], "refresh_rate": "hourly"}', '{"data_processing_speed": 0.88, "accuracy": 0.93, "uptime": 0.79}'
WHERE NOT EXISTS (SELECT 1 FROM ai_agents WHERE name = 'Analytics Agent Delta')
UNION ALL
SELECT 'Fraud Detection Epsilon', 'fraud_detection', 'layer_1', 'default-community', 'active', 'Scanning for anomalous behavior', NOW() - INTERVAL '15 minutes', '{"sensitivity": "medium", "alert_threshold": 0.7}', '{"detection_rate": 0.91, "false_alarm_rate": 0.05, "response_time": 0.97}'
WHERE NOT EXISTS (SELECT 1 FROM ai_agents WHERE name = 'Fraud Detection Epsilon');

-- Insert workflow coordination tasks (clear old test data first)
DELETE FROM agent_coordination WHERE community_id = 'default-community' AND user_id IS NULL;

INSERT INTO agent_coordination (
  agent_type, community_id, task_type, task_description, status, priority, assigned_at, performance_score, context_data
) VALUES 
  ('community_leader', 'default-community', 'community_moderation', 'Review and moderate community discussions for quality and adherence to guidelines', 'running', 8, NOW() - INTERVAL '3 hours', 0.92, '{"discussion_count": 12, "violations_found": 2, "actions_taken": 3}'),
  ('trust_validator', 'default-community', 'trust_calculation', 'Recalculate trust scores for users with recent activity changes', 'completed', 7, NOW() - INTERVAL '6 hours', 0.89, '{"users_processed": 156, "score_changes": 23, "validation_time": "45min"}'),
  ('marketing', 'default-community', 'campaign_analysis', 'Analyze the effectiveness of recent community engagement campaigns', 'pending', 5, NOW() - INTERVAL '1 hour', null, '{"campaigns_analyzed": 3, "metrics_collected": ["engagement", "conversion", "reach"]}'),
  ('analytics', 'default-community', 'performance_report', 'Generate weekly community performance analytics report', 'running', 6, NOW() - INTERVAL '2 hours', 0.87, '{"data_points_collected": 2847, "report_sections": 8, "completion_percentage": 75}'),
  ('fraud_detection', 'default-community', 'anomaly_detection', 'Scan for unusual patterns in user behavior and trust scores', 'completed', 9, NOW() - INTERVAL '4 hours', 0.94, '{"users_scanned": 1204, "anomalies_detected": 3, "false_positives": 1}'),
  ('community_leader', 'default-community', 'governance_review', 'Review pending governance proposals and provide recommendations', 'pending', 7, NOW() - INTERVAL '30 minutes', null, '{"proposals_pending": 2, "review_required": true, "estimated_completion": "2hours"}'),
  ('trust_validator', 'default-community', 'network_analysis', 'Analyze trust network topology and identify influential nodes', 'running', 6, NOW() - INTERVAL '1.5 hours', 0.78, '{"nodes_analyzed": 567, "network_density": 0.34, "influential_users_identified": 15}');;