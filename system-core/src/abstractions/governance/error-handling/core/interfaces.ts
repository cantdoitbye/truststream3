/**
 * TrustStream v4.2 - Error Handling Core Interfaces
 * Comprehensive error handling and recovery interfaces for governance agents
 */

import { GovernanceAgentType, AgentStatus } from '../../orchestrator/governance-orchestrator';

// ===== ERROR CLASSIFICATION =====

export interface ErrorContext {
  error_id: string;
  agent_id: string;
  agent_type: GovernanceAgentType;
  timestamp: Date;
  session_id?: string;
  task_id?: string;
  user_id?: string;
  community_id?: string;
  request_id?: string;
  correlation_id?: string;
  stack_trace?: string;
  environment: {
    node_version: string;
    memory_usage: number;
    cpu_usage: number;
    active_connections: number;
  };
  metadata: Record<string, any>;
}

export interface ErrorClassification {
  error_type: ErrorType;
  severity: ErrorSeverity;
  category: ErrorCategory;
  subcategory: string;
  is_retryable: boolean;
  is_transient: boolean;
  requires_immediate_attention: boolean;
  estimated_recovery_time: number; // in milliseconds
  impact_scope: ImpactScope;
  confidence_score: number; // 0-1, classifier confidence
}

export type ErrorType = 
  | 'system_error'
  | 'validation_error'
  | 'authentication_error'
  | 'authorization_error'
  | 'rate_limit_error'
  | 'timeout_error'
  | 'network_error'
  | 'database_error'
  | 'dependency_error'
  | 'configuration_error'
  | 'resource_exhaustion'
  | 'business_logic_error'
  | 'data_corruption_error'
  | 'protocol_error'
  | 'agent_coordination_error';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical' | 'emergency';

export type ErrorCategory = 
  | 'infrastructure'
  | 'application'
  | 'data'
  | 'security'
  | 'performance'
  | 'business'
  | 'integration'
  | 'coordination';

export type ImpactScope = 
  | 'single_request'
  | 'single_agent'
  | 'agent_cluster'
  | 'system_wide'
  | 'cross_system';

// ===== RECOVERY STRATEGIES =====

export interface RecoveryStrategy {
  strategy_id: string;
  name: string;
  description: string;
  applicable_error_types: ErrorType[];
  applicable_severities: ErrorSeverity[];
  priority: number; // Higher number = higher priority
  max_attempts: number;
  timeout_ms: number;
  success_criteria: SuccessCriteria;
  prerequisites: RecoveryPrerequisite[];
  rollback_strategy?: RollbackStrategy;
  estimated_recovery_time: number;
}

export interface RecoveryAction {
  action_id: string;
  type: RecoveryActionType;
  description: string;
  parameters: Record<string, any>;
  timeout_ms: number;
  rollback_action?: RecoveryAction;
  dependencies: string[]; // Other action IDs this depends on
}

export type RecoveryActionType =
  | 'restart_agent'
  | 'restart_service'
  | 'clear_cache'
  | 'reset_connections'
  | 'fallback_mode'
  | 'load_balancer_redirect'
  | 'circuit_breaker_open'
  | 'circuit_breaker_close'
  | 'scale_up'
  | 'scale_down'
  | 'data_repair'
  | 'configuration_reload'
  | 'manual_intervention_required'
  | 'graceful_shutdown'
  | 'emergency_stop';

export interface SuccessCriteria {
  health_check_passes: boolean;
  response_time_threshold: number;
  error_rate_threshold: number;
  success_rate_threshold: number;
  custom_checks: Array<{
    name: string;
    description: string;
    validator: (context: any) => Promise<boolean>;
  }>;
}

export interface RecoveryPrerequisite {
  type: 'system_check' | 'dependency_check' | 'resource_check' | 'permission_check';
  description: string;
  validator: (context: ErrorContext) => Promise<boolean>;
  timeout_ms: number;
}

export interface RollbackStrategy {
  strategy_id: string;
  description: string;
  actions: RecoveryAction[];
  timeout_ms: number;
  verification_steps: Array<{
    name: string;
    validator: (context: any) => Promise<boolean>;
  }>;
}

// ===== CIRCUIT BREAKER =====

export interface CircuitBreakerConfig {
  failure_threshold: number;
  recovery_timeout: number;
  test_request_volume: number;
  rolling_window_size: number;
  minimum_throughput: number;
  error_threshold_percentage: number;
}

export interface CircuitBreakerState {
  state: CircuitState;
  failure_count: number;
  success_count: number;
  last_failure_time: Date | null;
  last_success_time: Date | null;
  next_attempt_time: Date | null;
  rolling_window: CircuitBreakerMetric[];
}

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerMetric {
  timestamp: Date;
  success: boolean;
  response_time: number;
  error_type?: ErrorType;
}

// ===== GRACEFUL DEGRADATION =====

export interface DegradationLevel {
  level: number; // 0 = full service, higher = more degraded
  name: string;
  description: string;
  enabled_features: string[];
  disabled_features: string[];
  performance_limits: {
    max_concurrent_requests: number;
    max_request_size: number;
    timeout_ms: number;
    rate_limit_per_minute: number;
  };
  fallback_strategies: FallbackStrategy[];
}

export interface FallbackStrategy {
  strategy_id: string;
  name: string;
  description: string;
  trigger_conditions: TriggerCondition[];
  fallback_action: RecoveryAction;
  quality_score: number; // 0-1, quality of fallback vs normal operation
  estimated_performance_impact: number; // 0-1, 0 = no impact, 1 = severe impact
}

export interface TriggerCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'contains';
  threshold: any;
  window_size_ms: number;
}

// ===== ROOT CAUSE ANALYSIS =====

export interface RootCauseAnalysisResult {
  analysis_id: string;
  error_id: string;
  root_causes: RootCause[];
  contributing_factors: ContributingFactor[];
  correlation_analysis: CorrelationResult[];
  timeline: EventTimeline[];
  recommendations: Recommendation[];
  confidence_score: number;
  analysis_duration_ms: number;
}

export interface RootCause {
  cause_id: string;
  description: string;
  evidence: Evidence[];
  confidence_score: number;
  severity_impact: number;
  probability: number;
  category: RootCauseCategory;
}

export type RootCauseCategory = 
  | 'code_defect'
  | 'configuration_issue'
  | 'infrastructure_failure'
  | 'data_inconsistency'
  | 'dependency_failure'
  | 'resource_exhaustion'
  | 'security_breach'
  | 'human_error'
  | 'environmental_factor';

export interface ContributingFactor {
  factor_id: string;
  description: string;
  weight: number; // 0-1, how much this contributed
  evidence: Evidence[];
}

export interface Evidence {
  type: 'log_entry' | 'metric_anomaly' | 'correlation' | 'pattern_match';
  description: string;
  data: any;
  timestamp: Date;
  relevance_score: number;
}

export interface CorrelationResult {
  correlation_id: string;
  events: string[];
  correlation_strength: number; // 0-1
  time_window: {
    start: Date;
    end: Date;
  };
  pattern_type: 'causal' | 'coincidental' | 'cascading';
}

export interface EventTimeline {
  timestamp: Date;
  event_type: string;
  description: string;
  agent_id?: string;
  severity: ErrorSeverity;
  correlation_ids: string[];
}

export interface Recommendation {
  recommendation_id: string;
  type: RecommendationType;
  priority: number;
  description: string;
  implementation_effort: 'low' | 'medium' | 'high' | 'critical';
  expected_impact: number; // 0-1
  implementation_steps: string[];
  verification_criteria: string[];
}

export type RecommendationType = 
  | 'immediate_action'
  | 'preventive_measure'
  | 'monitoring_improvement'
  | 'code_fix'
  | 'configuration_change'
  | 'infrastructure_upgrade'
  | 'process_improvement'
  | 'training_required';

// ===== RECOVERY COORDINATION =====

export interface RecoveryCoordinationSession {
  session_id: string;
  initiator_agent_id: string;
  participating_agents: string[];
  error_context: ErrorContext;
  coordination_strategy: CoordinationStrategy;
  status: CoordinationStatus;
  started_at: Date;
  completed_at?: Date;
  recovery_plan: RecoveryPlan;
  execution_log: CoordinationEvent[];
}

export type CoordinationStatus = 
  | 'initializing'
  | 'planning'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'aborted';

export interface CoordinationStrategy {
  strategy_type: 'centralized' | 'distributed' | 'hierarchical' | 'consensus';
  leader_election_method?: 'fixed' | 'dynamic' | 'voting';
  decision_threshold?: number; // For consensus-based strategies
  timeout_ms: number;
  retry_policy: RetryPolicy;
}

export interface RecoveryPlan {
  plan_id: string;
  phases: RecoveryPhase[];
  dependencies: PhaseDependency[];
  rollback_plan: RollbackPlan;
  estimated_duration_ms: number;
  success_criteria: SuccessCriteria;
}

export interface RecoveryPhase {
  phase_id: string;
  name: string;
  description: string;
  assigned_agents: string[];
  actions: RecoveryAction[];
  timeout_ms: number;
  success_criteria: SuccessCriteria;
  can_rollback: boolean;
}

export interface PhaseDependency {
  phase_id: string;
  depends_on: string[];
  dependency_type: 'sequential' | 'parallel' | 'conditional';
  condition?: string; // For conditional dependencies
}

export interface RollbackPlan {
  phases: RollbackPhase[];
  timeout_ms: number;
  verification_steps: VerificationStep[];
}

export interface RollbackPhase {
  phase_id: string;
  original_phase_id: string;
  actions: RecoveryAction[];
  timeout_ms: number;
}

export interface VerificationStep {
  step_id: string;
  description: string;
  validator: (context: any) => Promise<boolean>;
  timeout_ms: number;
}

export interface CoordinationEvent {
  event_id: string;
  timestamp: Date;
  agent_id: string;
  event_type: CoordinationEventType;
  phase_id?: string;
  action_id?: string;
  data: any;
  status: 'started' | 'completed' | 'failed' | 'skipped';
}

export type CoordinationEventType = 
  | 'session_started'
  | 'agent_joined'
  | 'agent_left'
  | 'phase_started'
  | 'phase_completed'
  | 'action_executed'
  | 'rollback_initiated'
  | 'session_completed'
  | 'session_failed';

// ===== MAIN INTERFACES =====

export interface IErrorClassifier {
  classifyError(error: Error, context: ErrorContext): Promise<ErrorClassification>;
  updateClassificationRules(rules: ClassificationRule[]): Promise<void>;
  getClassificationHistory(errorId: string): Promise<ErrorClassification[]>;
}

export interface ClassificationRule {
  rule_id: string;
  pattern: RegExp | string;
  error_type: ErrorType;
  severity: ErrorSeverity;
  category: ErrorCategory;
  confidence: number;
  priority: number;
}

export interface IRecoveryManager {
  executeRecovery(error: ErrorContext, classification: ErrorClassification): Promise<RecoveryResult>;
  getAvailableStrategies(classification: ErrorClassification): Promise<RecoveryStrategy[]>;
  registerStrategy(strategy: RecoveryStrategy): Promise<void>;
  getRecoveryHistory(agentId: string): Promise<RecoveryAttempt[]>;
}

export interface RecoveryResult {
  success: boolean;
  strategy_used: RecoveryStrategy;
  actions_executed: RecoveryAction[];
  duration_ms: number;
  error_resolved: boolean;
  side_effects: string[];
  rollback_required: boolean;
}

export interface RecoveryAttempt {
  attempt_id: string;
  error_id: string;
  strategy_id: string;
  started_at: Date;
  completed_at?: Date;
  result: RecoveryResult;
}

export interface ICircuitBreaker {
  call<T>(operation: () => Promise<T>, context: ErrorContext): Promise<T>;
  getState(): CircuitBreakerState;
  reset(): void;
  forceOpen(): void;
  forceClose(): void;
}

export interface IDegradationManager {
  getCurrentLevel(): DegradationLevel;
  escalateDegradation(trigger: TriggerCondition): Promise<void>;
  recoverDegradation(): Promise<void>;
  isFeatureEnabled(feature: string): boolean;
  getAvailableFallbacks(feature: string): FallbackStrategy[];
}

export interface IRootCauseAnalyzer {
  analyzeError(error: ErrorContext): Promise<RootCauseAnalysisResult>;
  correlateEvents(events: EventTimeline[]): Promise<CorrelationResult[]>;
  generateRecommendations(analysis: RootCauseAnalysisResult): Promise<Recommendation[]>;
  updateAnalysisModel(feedback: AnalysisFeedback): Promise<void>;
}

export interface AnalysisFeedback {
  analysis_id: string;
  accuracy_score: number; // 0-1
  useful_recommendations: string[];
  missed_root_causes: string[];
  false_positives: string[];
  comments: string;
}

export interface IRecoveryCoordinator {
  initiateRecovery(error: ErrorContext, participatingAgents: string[]): Promise<RecoveryCoordinationSession>;
  joinRecoverySession(sessionId: string, agentId: string): Promise<void>;
  executeCoordinatedRecovery(sessionId: string): Promise<RecoveryResult>;
  monitorRecoveryProgress(sessionId: string): Promise<CoordinationEvent[]>;
  abortRecoverySession(sessionId: string, reason: string): Promise<void>;
}

export interface IErrorMonitor {
  recordError(error: ErrorContext): Promise<void>;
  getErrorMetrics(timeRange: TimeRange): Promise<ErrorMetrics>;
  getErrorTrends(agentId?: string): Promise<ErrorTrend[]>;
  alertOnPatterns(patterns: AlertPattern[]): Promise<void>;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface ErrorMetrics {
  total_errors: number;
  errors_by_type: Record<ErrorType, number>;
  errors_by_severity: Record<ErrorSeverity, number>;
  errors_by_agent: Record<string, number>;
  resolution_rate: number;
  average_resolution_time: number;
  recurring_errors: number;
  critical_errors: number;
}

export interface ErrorTrend {
  timestamp: Date;
  error_count: number;
  severity_distribution: Record<ErrorSeverity, number>;
  resolution_rate: number;
  average_resolution_time: number;
}

export interface AlertPattern {
  pattern_id: string;
  name: string;
  description: string;
  conditions: AlertCondition[];
  severity: ErrorSeverity;
  notification_channels: string[];
  cooldown_period_ms: number;
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  window_size_ms: number;
}
