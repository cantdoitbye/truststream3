-- Migration: seed_trust_analytics_data
-- Created at: 1757798171

-- Seed Trust Analytics Data Migration
-- Created: Phase 1 Critical System Fix - Replace Mock Data

-- Insert sample trust network analytics data
INSERT INTO trust_network_analytics (
  user_id,
  trust_score,
  network_size,
  influence_score,
  community_count,
  cross_vertical_connections,
  dao_governance_weight,
  last_updated
) VALUES 
  ((SELECT id FROM profiles LIMIT 1 OFFSET 0), 0.89, 156, 245.67, 3, 12, 0.234, NOW()),
  ((SELECT id FROM profiles LIMIT 1 OFFSET 1), 0.76, 89, 178.45, 2, 8, 0.156, NOW()),
  ((SELECT id FROM profiles LIMIT 1 OFFSET 2), 0.94, 234, 456.78, 5, 18, 0.423, NOW()),
  ((SELECT id FROM profiles LIMIT 1 OFFSET 3), 0.63, 45, 89.12, 1, 4, 0.089, NOW()),
  ((SELECT id FROM profiles LIMIT 1 OFFSET 4), 0.82, 127, 198.34, 3, 11, 0.287, NOW())
ON CONFLICT (user_id) DO UPDATE SET 
  trust_score = EXCLUDED.trust_score,
  network_size = EXCLUDED.network_size,
  influence_score = EXCLUDED.influence_score,
  community_count = EXCLUDED.community_count,
  cross_vertical_connections = EXCLUDED.cross_vertical_connections,
  dao_governance_weight = EXCLUDED.dao_governance_weight,
  last_updated = NOW();

-- Insert some AI agents if the table is empty
INSERT INTO ai_agents (
  name,
  agent_type,
  layer,
  community_id,
  status,
  current_task,
  last_activity,
  configuration,
  performance_metrics
) VALUES 
  ('Community Leader Alpha', 'community_leader', 'layer_1', 'default-community', 'active', 'Monitoring community engagement', NOW() - INTERVAL '2 hours', '{"priority": "high", "auto_respond": true}', '{"response_rate": 0.94, "accuracy": 0.87, "engagement": 0.91}'),
  ('Trust Validator Beta', 'trust_validator', 'layer_2', 'default-community', 'active', 'Validating user trust scores', NOW() - INTERVAL '1 hour', '{"threshold": 0.8, "verification_mode": "strict"}', '{"validation_accuracy": 0.96, "false_positive_rate": 0.03, "throughput": 0.89}'),
  ('Marketing Agent Gamma', 'marketing', 'layer_3', 'default-community', 'active', 'Analyzing campaign performance', NOW() - INTERVAL '30 minutes', '{"campaign_focus": "engagement", "target_demographics": "young_professionals"}', '{"conversion_rate": 0.78, "reach_efficiency": 0.84, "roi": 0.92}'),
  ('Analytics Agent Delta', 'analytics', 'layer_2', 'default-community', 'inactive', null, NOW() - INTERVAL '8 hours', '{"data_sources": ["user_activity", "trust_metrics"], "refresh_rate": "hourly"}', '{"data_processing_speed": 0.88, "accuracy": 0.93, "uptime": 0.79}'),
  ('Fraud Detection Epsilon', 'fraud_detection', 'layer_1', 'default-community', 'active', 'Scanning for anomalous behavior', NOW() - INTERVAL '15 minutes', '{"sensitivity": "medium", "alert_threshold": 0.7}', '{"detection_rate": 0.91, "false_alarm_rate": 0.05, "response_time": 0.97}')
ON CONFLICT (name) DO UPDATE SET 
  status = EXCLUDED.status,
  last_activity = EXCLUDED.last_activity,
  performance_metrics = EXCLUDED.performance_metrics;

-- Insert some workflow coordination tasks
INSERT INTO agent_coordination (
  agent_type,
  community_id,
  task_type,
  task_description,
  status,
  priority,
  assigned_at,
  performance_score,
  context_data
) VALUES 
  ('community_leader', 'default-community', 'community_moderation', 'Review and moderate community discussions for quality and adherence to guidelines', 'running', 8, NOW() - INTERVAL '3 hours', 0.92, '{"discussion_count": 12, "violations_found": 2, "actions_taken": 3}'),
  ('trust_validator', 'default-community', 'trust_calculation', 'Recalculate trust scores for users with recent activity changes', 'completed', 7, NOW() - INTERVAL '6 hours', 0.89, '{"users_processed": 156, "score_changes": 23, "validation_time": "45min"}'),
  ('marketing', 'default-community', 'campaign_analysis', 'Analyze the effectiveness of recent community engagement campaigns', 'pending', 5, NOW() - INTERVAL '1 hour', null, '{"campaigns_analyzed": 3, "metrics_collected": ["engagement", "conversion", "reach"]}'),
  ('analytics', 'default-community', 'performance_report', 'Generate weekly community performance analytics report', 'running', 6, NOW() - INTERVAL '2 hours', 0.87, '{"data_points_collected": 2847, "report_sections": 8, "completion_percentage": 75}'),
  ('fraud_detection', 'default-community', 'anomaly_detection', 'Scan for unusual patterns in user behavior and trust scores', 'completed', 9, NOW() - INTERVAL '4 hours', 0.94, '{"users_scanned": 1204, "anomalies_detected": 3, "false_positives": 1}'),
  ('community_leader', 'default-community', 'governance_review', 'Review pending governance proposals and provide recommendations', 'pending', 7, NOW() - INTERVAL '30 minutes', null, '{"proposals_pending": 2, "review_required": true, "estimated_completion": "2hours"}'),
  ('trust_validator', 'default-community', 'network_analysis', 'Analyze trust network topology and identify influential nodes', 'running', 6, NOW() - INTERVAL '1.5 hours', 0.78, '{"nodes_analyzed": 567, "network_density": 0.34, "influential_users_identified": 15}')
ON CONFLICT DO NOTHING;

-- Insert some community debate threads and replies
INSERT INTO community_debate_threads (
  title,
  content,
  author_id,
  community_id,
  status
) VALUES 
  ('Should we implement stricter AI agent oversight?', 
   'With the increasing reliance on AI agents for community decisions, I believe we need more robust oversight mechanisms. What are your thoughts on implementing mandatory human review for critical decisions?',
   'system-user', 'default-community', 'active'),
  ('Community fund allocation for Q1 2025',
   'We have 50,000 trust coins available for community initiatives. I propose allocating 60% to infrastructure improvements and 40% to educational programs. Open to discussion and alternative proposals.',
   'system-user', 'default-community', 'active'),
  ('Trust score calculation transparency',
   'Several community members have raised concerns about the opacity of trust score calculations. Should we make the algorithm more transparent or provide detailed breakdowns?',
   'system-user', 'default-community', 'active')
ON CONFLICT DO NOTHING;

-- Insert some replies to debates
INSERT INTO debate_replies (
  thread_id,
  content,
  author_id
) VALUES 
  ((SELECT id FROM community_debate_threads WHERE title LIKE '%AI agent oversight%' LIMIT 1),
   'I strongly agree. Human oversight is essential for maintaining community trust and ensuring ethical decisions.',
   'community-member-001'),
  ((SELECT id FROM community_debate_threads WHERE title LIKE '%AI agent oversight%' LIMIT 1),
   'While I understand the concern, too much oversight might slow down the efficiency that makes AI agents valuable. Perhaps we need a balanced approach?',
   'community-member-002'),
  ((SELECT id FROM community_debate_threads WHERE title LIKE '%fund allocation%' LIMIT 1),
   'The 60-40 split sounds reasonable, but could we allocate a small portion (10%) specifically for community events and social activities?',
   'community-member-003'),
  ((SELECT id FROM community_debate_threads WHERE title LIKE '%Trust score%' LIMIT 1),
   'Transparency would definitely help build more trust in the system. Even a high-level explanation would be beneficial.',
   'community-member-004')
ON CONFLICT DO NOTHING;

-- Insert some governance proposals
INSERT INTO governance_proposals (
  title,
  description,
  proposal_type,
  status,
  voting_deadline,
  created_by,
  votes_for,
  votes_against,
  votes_abstain
) VALUES 
  ('Increase AI Agent Trust Threshold',
   'Proposal to increase the minimum trust score requirement for AI agents making critical community decisions from 0.75 to 0.85.',
   'policy_change',
   'active',
   NOW() + INTERVAL '7 days',
   'governance-committee',
   89, 34, 12),
  ('Community Education Fund Establishment',
   'Establish a dedicated fund for community education initiatives with an initial allocation of 25,000 trust coins.',
   'resource_allocation',
   'active', 
   NOW() + INTERVAL '10 days',
   'education-team',
   156, 23, 8),
  ('New Member Onboarding Process',
   'Implement a structured 7-day onboarding process for new community members including mentorship and orientation sessions.',
   'community_decision',
   'pending',
   NOW() + INTERVAL '14 days',
   'community-development',
   67, 12, 5)
ON CONFLICT DO NOTHING;

-- Insert visual content gallery items
INSERT INTO visual_content_gallery (
  content_type,
  title,
  content_data,
  community_id,
  status,
  performance_metrics
) VALUES 
  ('infographics', 'Community Growth Statistics Q4 2024', 
   '{"chart_type": "bar_chart", "data_points": ["new_members", "engagement_rate", "trust_scores"], "color_scheme": ["#3B82F6", "#10B981", "#F59E0B"], "call_to_action": "Join our growing community today!"}',
   'default-community', 'featured',
   '{"views": 1247, "shares": 89, "engagement_rate": 0.73}'),
  ('community_highlights', 'Top Contributors of the Month',
   '{"featured_users": ["alice_contributor", "bob_helper", "charlie_innovator"], "achievements": ["Most Helpful", "Innovation Award", "Community Spirit"], "color_scheme": ["#8B5CF6", "#EC4899", "#06B6D4"]}',
   'default-community', 'trending',
   '{"views": 892, "likes": 156, "comments": 23}'),
  ('governance_visuals', 'Proposal Voting Results Visualization',
   '{"chart_type": "pie_chart", "voting_data": {"for": 156, "against": 34, "abstain": 12}, "color_scheme": ["#10B981", "#EF4444", "#6B7280"]}',
   'default-community', 'active',
   '{"views": 567, "downloads": 34, "useful_votes": 45}')
ON CONFLICT DO NOTHING;

-- Add some user vibe ratings for community contribution calculations
INSERT INTO user_vibe_ratings (
  rater_id,
  ratee_id,
  vibe_id,
  rating,
  context
) VALUES 
  ((SELECT id FROM profiles LIMIT 1 OFFSET 0), (SELECT id FROM profiles LIMIT 1 OFFSET 1), (SELECT id FROM vibes WHERE name = 'Helpful' LIMIT 1), 5, 'Excellent community support'),
  ((SELECT id FROM profiles LIMIT 1 OFFSET 1), (SELECT id FROM profiles LIMIT 1 OFFSET 0), (SELECT id FROM vibes WHERE name = 'Professional' LIMIT 1), 4, 'Very professional interactions'),
  ((SELECT id FROM profiles LIMIT 1 OFFSET 2), (SELECT id FROM profiles LIMIT 1 OFFSET 0), (SELECT id FROM vibes WHERE name = 'Inspiring' LIMIT 1), 5, 'Great leadership qualities'),
  ((SELECT id FROM profiles LIMIT 1 OFFSET 0), (SELECT id FROM profiles LIMIT 1 OFFSET 2), (SELECT id FROM vibes WHERE name = 'Creative' LIMIT 1), 4, 'Innovative problem solving'),
  ((SELECT id FROM profiles LIMIT 1 OFFSET 3), (SELECT id FROM profiles LIMIT 1 OFFSET 1), (SELECT id FROM vibes WHERE name = 'Wise' LIMIT 1), 5, 'Excellent advice and guidance'),
  ((SELECT id FROM profiles LIMIT 1 OFFSET 4), (SELECT id FROM profiles LIMIT 1 OFFSET 2), (SELECT id FROM vibes WHERE name = 'Amazing' LIMIT 1), 5, 'Outstanding community contribution')
ON CONFLICT (rater_id, ratee_id, vibe_id) DO UPDATE SET 
  rating = EXCLUDED.rating,
  context = EXCLUDED.context;

-- Insert RAG query logs for search history
INSERT INTO rag_query_logs (
  query,
  query_type,
  response_summary,
  timestamp
) VALUES 
  ('What are the main governance challenges facing our community?', 
   'question_answer',
   'Analysis reveals three key challenges: decision-making speed, member participation rates, and trust score transparency.',
   NOW() - INTERVAL '2 hours'),
  ('Show me community engagement trends over the last month',
   'pattern_analysis',
   'Engagement has increased by 23% with highest activity in governance discussions and trust-building activities.',
   NOW() - INTERVAL '5 hours'),
  ('How can we improve AI agent performance metrics?',
   'insight_generation',
   'Recommendations include enhanced training data, clearer performance thresholds, and regular calibration cycles.',
   NOW() - INTERVAL '1 day'),
  ('What debates are currently generating the most discussion?',
   'context_search',
   'Top debates: AI oversight (156 comments), fund allocation (89 comments), and trust transparency (67 comments).',
   NOW() - INTERVAL '3 hours')
ON CONFLICT DO NOTHING;;