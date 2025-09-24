-- Migration: seed_phase4_llm_nexus_data_fixed
-- Created at: 1757786439

-- Seed data for Phase 4 LLM Nexus and Multi-Agent Orchestration

-- Insert LLM Providers
INSERT INTO llm_providers (provider_name, api_endpoint, model_names, pricing_per_1k_tokens, regional_availability, performance_metrics, status) VALUES
('OpenAI', 'https://api.openai.com/v1', ARRAY['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'], 0.015, 
 '{"regions": ["us-east", "us-west", "eu-west", "asia-pacific"], "latency_ms": {"us-east": 120, "eu-west": 150, "asia-pacific": 200}}'::jsonb,
 '{"response_time_ms": 1200, "reliability_score": 0.99, "quality_rating": 4.8}'::jsonb, 'active'),

('Anthropic', 'https://api.anthropic.com/v1', ARRAY['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'], 0.012,
 '{"regions": ["us-east", "us-west", "eu-west"], "latency_ms": {"us-east": 100, "eu-west": 140, "asia-pacific": 180}}'::jsonb,
 '{"response_time_ms": 1000, "reliability_score": 0.98, "quality_rating": 4.9}'::jsonb, 'active'),

('Google', 'https://generativelanguage.googleapis.com/v1', ARRAY['gemini-1.5-pro', 'gemini-1.5-flash'], 0.008,
 '{"regions": ["us-east", "us-west", "eu-west", "asia-pacific"], "latency_ms": {"us-east": 90, "eu-west": 120, "asia-pacific": 80}}'::jsonb,
 '{"response_time_ms": 800, "reliability_score": 0.97, "quality_rating": 4.7}'::jsonb, 'active'),

('Cohere', 'https://api.cohere.ai/v1', ARRAY['command-r-plus', 'command-r'], 0.010,
 '{"regions": ["us-east", "us-west", "eu-west"], "latency_ms": {"us-east": 110, "eu-west": 130, "asia-pacific": 220}}'::jsonb,
 '{"response_time_ms": 900, "reliability_score": 0.96, "quality_rating": 4.6}'::jsonb, 'active');

-- Insert LLM Routing Rules
INSERT INTO llm_routing_rules (rule_name, task_complexity_range, cost_optimization_weight, performance_weight, availability_weight, region_preferences, status) VALUES
('High Performance Tasks', '{"min_complexity": 8, "max_complexity": 10, "task_types": ["reasoning", "coding", "analysis"]}'::jsonb, 0.2, 0.6, 0.2, '{"preferred": ["us-east", "us-west"], "acceptable": ["eu-west"]}'::jsonb, 'active'),

('Cost Optimized Tasks', '{"min_complexity": 1, "max_complexity": 5, "task_types": ["simple_chat", "summarization", "classification"]}'::jsonb, 0.7, 0.2, 0.1, '{"preferred": ["asia-pacific"], "acceptable": ["us-east", "eu-west"]}'::jsonb, 'active'),

('Balanced Tasks', '{"min_complexity": 5, "max_complexity": 8, "task_types": ["content_generation", "translation", "qa"]}'::jsonb, 0.4, 0.4, 0.2, '{"preferred": ["us-east"], "acceptable": ["us-west", "eu-west"]}'::jsonb, 'active'),

('Ultra Low Latency', '{"min_complexity": 1, "max_complexity": 10, "requirements": ["real_time", "interactive"]}'::jsonb, 0.1, 0.2, 0.7, '{"preferred": ["us-east"], "fallback": ["us-west"]}'::jsonb, 'active');

-- Insert Sample Prompt Library Entries
INSERT INTO prompt_library (prompt_name, category, description, prompt_template, input_variables, output_format, tags, is_public) VALUES
('Multi-Agent Workflow Coordinator', 'Orchestration', 'Coordinates complex multi-agent workflows with dependency management', 
 'You are a workflow coordinator managing a multi-agent system. Your task is to orchestrate the following workflow: {workflow_definition}. Current step: {current_step}. Available agents: {available_agents}. Dependencies: {dependencies}. Please coordinate the next actions ensuring all dependencies are met.',
 '["workflow_definition", "current_step", "available_agents", "dependencies"]'::jsonb,
 '{"type": "json", "schema": {"next_actions": "array", "dependencies_met": "boolean", "estimated_completion": "timestamp"}}'::jsonb,
 ARRAY['orchestration', 'workflow', 'coordination'], true),

('LLM Provider Selection', 'Routing', 'Intelligently selects the optimal LLM provider based on task requirements',
 'Analyze the following task requirements and select the optimal LLM provider: Task: {task_description}, Complexity: {complexity_score}/10, Budget: {budget_constraint}, Latency requirement: {latency_requirement}ms, Quality requirement: {quality_requirement}/5. Available providers: {available_providers}. Provide selection reasoning.',
 '["task_description", "complexity_score", "budget_constraint", "latency_requirement", "quality_requirement", "available_providers"]'::jsonb,
 '{"type": "json", "schema": {"selected_provider": "string", "confidence": "number", "reasoning": "string", "cost_estimate": "number"}}'::jsonb,
 ARRAY['routing', 'optimization', 'provider-selection'], true),

('Agent Communication Protocol', 'Communication', 'Structures inter-agent communication with proper protocols',
 'Format an inter-agent message following the communication protocol. Sender: {sender_agent}, Recipient: {recipient_agent}, Message Type: {message_type}, Content: {message_content}, Priority: {priority_level}, Requires Response: {requires_response}. Ensure proper formatting and routing.',
 '["sender_agent", "recipient_agent", "message_type", "message_content", "priority_level", "requires_response"]'::jsonb,
 '{"type": "json", "schema": {"formatted_message": "object", "routing_info": "object", "delivery_confirmation": "boolean"}}'::jsonb,
 ARRAY['communication', 'protocol', 'messaging'], true),

('Community Prompt Optimizer', 'Community', 'Optimizes prompts based on community feedback and usage patterns',
 'Analyze this prompt for optimization: {original_prompt}. Community feedback: {feedback_data}. Usage patterns: {usage_patterns}. Success rate: {success_rate}. Suggest improvements considering effectiveness, clarity, and community needs.',
 '["original_prompt", "feedback_data", "usage_patterns", "success_rate"]'::jsonb,
 '{"type": "json", "schema": {"optimized_prompt": "string", "improvements": "array", "expected_impact": "string"}}'::jsonb,
 ARRAY['optimization', 'community', 'feedback'], true),

('Workflow Error Handler', 'Error Management', 'Handles and recovers from workflow execution errors',
 'A workflow error has occurred: {error_details}. Workflow context: {workflow_context}. Failed step: {failed_step}. Available recovery options: {recovery_options}. Determine the best recovery strategy and provide implementation steps.',
 '["error_details", "workflow_context", "failed_step", "recovery_options"]'::jsonb,
 '{"type": "json", "schema": {"recovery_strategy": "string", "implementation_steps": "array", "risk_assessment": "string"}}'::jsonb,
 ARRAY['error-handling', 'recovery', 'workflow'], true);

-- Insert Sample Agent Communication Channels
INSERT INTO agent_communication_channels (channel_name, channel_type, participants, message_schema, routing_rules, priority_levels) VALUES
('Global Coordination Channel', 'broadcast', ARRAY['community-ai-leader-enhanced', 'governance-vote-agent', 'rag-agent', 'recommendation-engine-enhanced', 'trust-scoring-enhanced', 'visual-content-system'], 
 '{"message_types": ["coordination", "status", "alert"], "required_fields": ["sender", "type", "content", "timestamp"]}'::jsonb,
 '{"delivery_mode": "all", "acknowledgment_required": true, "ttl_seconds": 3600}'::jsonb,
 '{"critical": 1, "high": 2, "normal": 3, "low": 4}'::jsonb),

('Workflow Execution Channel', 'workflow', ARRAY['workflow-orchestrator', 'step-executor'], 
 '{"message_types": ["step_complete", "step_failed", "dependency_met", "workflow_status"], "required_fields": ["workflow_id", "step_id", "status"]}'::jsonb,
 '{"delivery_mode": "direct", "acknowledgment_required": true, "ttl_seconds": 1800}'::jsonb,
 '{"urgent": 1, "normal": 2}'::jsonb),

('LLM Selection Channel', 'routing', ARRAY['llm-router', 'cost-optimizer', 'performance-monitor'], 
 '{"message_types": ["provider_request", "provider_response", "performance_update"], "required_fields": ["request_id", "task_requirements"]}'::jsonb,
 '{"delivery_mode": "round_robin", "acknowledgment_required": false, "ttl_seconds": 300}'::jsonb,
 '{"real_time": 1, "batch": 3}'::jsonb),

('Community Governance Channel', 'governance', ARRAY['community-ai-leader-enhanced', 'governance-vote-agent'], 
 '{"message_types": ["proposal_created", "vote_cast", "governance_decision"], "required_fields": ["proposal_id", "action_type"]}'::jsonb,
 '{"delivery_mode": "all", "acknowledgment_required": true, "ttl_seconds": 86400}'::jsonb,
 '{"constitutional": 1, "important": 2, "routine": 3}'::jsonb);

-- Insert Sample Workflow Definitions
INSERT INTO agent_workflows (workflow_name, description, workflow_definition, execution_mode, dependency_graph, error_handling_strategy, retry_policies) VALUES
('Complete Community Analysis', 'Comprehensive analysis of community health, sentiment, and recommendations',
 '{
   "steps": [
     {"id": 1, "name": "sentiment_analysis", "agent": "community-ai-leader-enhanced", "action": "analyze_sentiment", "timeout": 30},
     {"id": 2, "name": "trust_calculation", "agent": "trust-scoring-enhanced", "action": "calculate_community_trust", "timeout": 45, "depends_on": [1]},
     {"id": 3, "name": "content_recommendations", "agent": "recommendation-engine-enhanced", "action": "generate_recommendations", "timeout": 60, "depends_on": [1, 2]},
     {"id": 4, "name": "governance_analysis", "agent": "governance-vote-agent", "action": "analyze_proposals", "timeout": 30, "depends_on": [2]},
     {"id": 5, "name": "visual_content", "agent": "visual-content-system", "action": "generate_summary_visual", "timeout": 90, "depends_on": [1, 2, 3, 4]}
   ]
 }'::jsonb,
 'parallel_with_dependencies',
 '{"1": [], "2": [1], "3": [1, 2], "4": [2], "5": [1, 2, 3, 4]}'::jsonb,
 '{"on_step_failure": "retry_with_fallback", "on_workflow_failure": "human_escalation", "max_retries_per_step": 3}'::jsonb,
 '{"initial_delay_ms": 1000, "backoff_multiplier": 2, "max_delay_ms": 30000}'::jsonb),

('Intelligent Content Curation', 'Multi-agent content curation with quality scoring and community feedback',
 '{
   "steps": [
     {"id": 1, "name": "content_discovery", "agent": "rag-agent", "action": "discover_content", "timeout": 60},
     {"id": 2, "name": "quality_assessment", "agent": "trust-scoring-enhanced", "action": "assess_content_quality", "timeout": 30, "depends_on": [1]},
     {"id": 3, "name": "community_fit", "agent": "recommendation-engine-enhanced", "action": "assess_community_fit", "timeout": 45, "depends_on": [1]},
     {"id": 4, "name": "moderation_check", "agent": "community-ai-leader-enhanced", "action": "moderate_content", "timeout": 30, "depends_on": [2, 3]},
     {"id": 5, "name": "visual_enhancement", "agent": "visual-content-system", "action": "enhance_content", "timeout": 120, "depends_on": [4]}
   ]
 }'::jsonb,
 'sequential',
 '{"1": [], "2": [1], "3": [1], "4": [2, 3], "5": [4]}'::jsonb,
 '{"on_step_failure": "skip_and_continue", "on_workflow_failure": "partial_completion", "max_retries_per_step": 2}'::jsonb,
 '{"initial_delay_ms": 500, "backoff_multiplier": 1.5, "max_delay_ms": 15000}'::jsonb),

('Democratic LLM Provider Selection', 'Community-driven process for selecting and configuring LLM providers',
 '{
   "steps": [
     {"id": 1, "name": "provider_analysis", "agent": "rag-agent", "action": "analyze_provider_options", "timeout": 120},
     {"id": 2, "name": "cost_benefit_analysis", "agent": "recommendation-engine-enhanced", "action": "cost_benefit_analysis", "timeout": 60, "depends_on": [1]},
     {"id": 3, "name": "governance_proposal", "agent": "governance-vote-agent", "action": "create_provider_proposal", "timeout": 30, "depends_on": [2]},
     {"id": 4, "name": "community_voting", "agent": "governance-vote-agent", "action": "conduct_voting", "timeout": 86400, "depends_on": [3]},
     {"id": 5, "name": "implementation", "agent": "community-ai-leader-enhanced", "action": "implement_decision", "timeout": 300, "depends_on": [4]}
   ]
 }'::jsonb,
 'sequential_with_human_approval',
 '{"1": [], "2": [1], "3": [2], "4": [3], "5": [4]}'::jsonb,
 '{"on_step_failure": "human_escalation", "on_workflow_failure": "rollback_to_previous", "max_retries_per_step": 1}'::jsonb,
 '{"initial_delay_ms": 2000, "backoff_multiplier": 1, "max_delay_ms": 5000}'::jsonb);;