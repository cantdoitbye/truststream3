/**
 * AI Model Management System - Core Types and Interfaces
 */

export interface AIModel {
  id: string;
  provider_id: string;
  model_name: string;
  model_version?: string;
  context_length: number;
  max_tokens: number;
  supports_functions: boolean;
  supports_vision: boolean;
  supports_streaming: boolean;
  cost_per_1k_input_tokens: number;
  cost_per_1k_output_tokens: number;
  status: 'active' | 'inactive' | 'deprecated';
  created_at: string;
  updated_at: string;
}

export interface ModelLifecycle {
  id: string;
  model_id: string;
  lifecycle_stage: 'development' | 'testing' | 'staging' | 'production' | 'deprecated' | 'archived' | 'retired';
  version_tag: string;
  deployment_config: any;
  performance_requirements: any;
  resource_allocation: any;
  approval_status: 'pending' | 'approved' | 'rejected' | 'conditional';
  approved_by?: string;
  approval_date?: string;
  deployment_date?: string;
  rollback_plan: any;
  monitoring_config: any;
  created_at: string;
  updated_at: string;
}

export interface ModelDeployment {
  id: string;
  lifecycle_id: string;
  deployment_name: string;
  environment: 'development' | 'staging' | 'production' | 'testing';
  deployment_type: 'blue-green' | 'canary' | 'rolling' | 'direct';
  endpoint_url?: string;
  health_check_url?: string;
  status: 'deploying' | 'healthy' | 'unhealthy' | 'failed' | 'terminated';
  traffic_percentage: number;
  load_balancer_config: any;
  scaling_config: any;
  security_config: any;
  deployment_metadata: any;
  deployed_at?: string;
  last_health_check?: string;
  created_at: string;
  updated_at: string;
}

export interface PerformanceMetric {
  id: string;
  deployment_id: string;
  metric_type: 'latency' | 'throughput' | 'accuracy' | 'error_rate' | 'resource_usage' | 'cost' | 'user_satisfaction';
  metric_value: number;
  metric_unit?: string;
  measurement_context: any;
  benchmark_comparison: any;
  alert_threshold_breached: boolean;
  recorded_at: string;
  aggregation_period: string;
}

export interface ABTest {
  id: string;
  test_name: string;
  description?: string;
  model_a_deployment_id: string;
  model_b_deployment_id: string;
  traffic_split_percentage: number;
  test_criteria: any;
  success_metrics: any;
  statistical_significance_threshold: number;
  minimum_sample_size: number;
  test_duration_hours?: number;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'terminated';
  preliminary_results: any;
  final_results: any;
  winner_model_id?: string;
  confidence_level?: number;
  started_at?: string;
  completed_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ABTestResult {
  id: string;
  ab_test_id: string;
  variant: 'A' | 'B';
  user_session_id?: string;
  request_id?: string;
  metric_name: string;
  metric_value?: number;
  response_quality_score?: number;
  user_feedback_score?: number;
  latency_ms?: number;
  error_occurred: boolean;
  context_metadata: any;
  recorded_at: string;
}

export interface FineTuningJob {
  id: string;
  base_model_id: string;
  training_dataset_id: string;
  validation_dataset_id?: string;
  job_name: string;
  fine_tuning_objective: string;
  hyperparameters: any;
  training_config: any;
  optimization_strategy: string;
  learning_rate: number;
  batch_size: number;
  epochs: number;
  early_stopping_config: any;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress_percentage: number;
  current_epoch: number;
  best_validation_loss?: number;
  training_logs: any;
  resource_usage: any;
  estimated_completion?: string;
  started_at?: string;
  completed_at?: string;
  output_model_path?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface OptimizationRecommendation {
  id: string;
  deployment_id: string;
  recommendation_type: 'performance' | 'cost' | 'accuracy' | 'scaling' | 'security';
  priority: 'low' | 'medium' | 'high' | 'critical';
  recommendation_title: string;
  recommendation_description: string;
  implementation_steps: any;
  expected_impact: any;
  estimated_effort?: string;
  risk_assessment: any;
  status: 'open' | 'in_progress' | 'implemented' | 'dismissed' | 'expired';
  implemented_by?: string;
  implemented_at?: string;
  auto_generated: boolean;
  confidence_score?: number;
  created_at: string;
  updated_at: string;
}

export interface ModelUsageAnalytics {
  id: string;
  deployment_id: string;
  user_id?: string;
  request_id?: string;
  input_tokens: number;
  output_tokens: number;
  total_cost: number;
  latency_ms?: number;
  success: boolean;
  error_type?: string;
  error_message?: string;
  user_agent?: string;
  ip_address?: string;
  request_metadata: any;
  response_metadata: any;
  quality_score?: number;
  requested_at: string;
}

export interface ModelAlert {
  id: string;
  deployment_id?: string;
  alert_type: 'performance_degradation' | 'high_error_rate' | 'resource_exhaustion' | 'cost_spike' | 'security_incident' | 'availability_issue';
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  title: string;
  description: string;
  trigger_conditions: any;
  current_values: any;
  threshold_values: any;
  status: 'open' | 'acknowledged' | 'resolved' | 'dismissed';
  assigned_to?: string;
  escalation_level: number;
  escalated_at?: string;
  resolved_at?: string;
  resolution_notes?: string;
  triggered_at: string;
  created_at: string;
  updated_at: string;
}

// Service Operation Interfaces
export interface DeploymentOptions {
  environment: ModelDeployment['environment'];
  deployment_type: ModelDeployment['deployment_type'];
  traffic_percentage?: number;
  scaling_config?: any;
  security_config?: any;
  monitoring_config?: any;
}

export interface FineTuningOptions {
  training_dataset_id: string;
  validation_dataset_id?: string;
  hyperparameters?: any;
  optimization_strategy?: string;
  learning_rate?: number;
  batch_size?: number;
  epochs?: number;
  early_stopping_config?: any;
}

export interface ABTestOptions {
  model_a_deployment_id: string;
  model_b_deployment_id: string;
  traffic_split_percentage?: number;
  test_criteria: any;
  success_metrics: any;
  statistical_significance_threshold?: number;
  minimum_sample_size?: number;
  test_duration_hours?: number;
}

export interface ModelMetrics {
  latency_avg: number;
  latency_p95: number;
  latency_p99: number;
  throughput: number;
  error_rate: number;
  accuracy?: number;
  cost_per_request: number;
  user_satisfaction?: number;
  uptime_percentage: number;
}

export interface ModelOptimizationSuggestion {
  type: OptimizationRecommendation['recommendation_type'];
  priority: OptimizationRecommendation['priority'];
  title: string;
  description: string;
  expected_improvement: string;
  implementation_complexity: 'low' | 'medium' | 'high';
  estimated_impact_percentage: number;
}

export interface ModelHealthStatus {
  deployment_id: string;
  overall_health: 'healthy' | 'degraded' | 'critical' | 'unknown';
  health_score: number; // 0-100
  last_check: string;
  issues: Array<{
    type: string;
    severity: ModelAlert['severity'];
    message: string;
    since: string;
  }>;
  performance_summary: ModelMetrics;
  resource_utilization: {
    cpu_percentage: number;
    memory_percentage: number;
    gpu_percentage?: number;
    storage_percentage: number;
  };
}

export interface ModelComparisonResult {
  model_a: {
    deployment_id: string;
    metrics: ModelMetrics;
    sample_size: number;
  };
  model_b: {
    deployment_id: string;
    metrics: ModelMetrics;
    sample_size: number;
  };
  statistical_significance: {
    is_significant: boolean;
    confidence_level: number;
    p_value: number;
  };
  winner?: 'A' | 'B' | 'tie';
  recommendations: string[];
}

export interface ModelVersionInfo {
  version_tag: string;
  deployment_environment: string;
  performance_score: number;
  deployment_date: string;
  traffic_percentage: number;
  status: ModelDeployment['status'];
}

// Event types for real-time updates
export interface ModelEvent {
  type: 'deployment' | 'performance' | 'alert' | 'optimization' | 'ab_test';
  deployment_id: string;
  event_data: any;
  timestamp: string;
}

// Configuration interfaces
export interface ModelManagementConfig {
  default_monitoring_interval: number; // seconds
  performance_alert_thresholds: {
    latency_ms: number;
    error_rate_percentage: number;
    cost_spike_percentage: number;
  };
  auto_optimization_enabled: boolean;
  ab_test_defaults: {
    significance_threshold: number;
    minimum_sample_size: number;
    default_duration_hours: number;
  };
  deployment_settings: {
    max_concurrent_deployments: number;
    default_rollback_timeout: number;
    canary_traffic_increment: number;
  };
}
