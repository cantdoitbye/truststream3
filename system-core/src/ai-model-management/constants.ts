/**
 * AI Model Management System - Constants
 * Shared constants used across the system
 */

// Default performance thresholds
export const DEFAULT_PERFORMANCE_THRESHOLDS = {
  latency_ms: 500,
  error_rate_percentage: 1.0,
  cost_spike_percentage: 50,
  throughput_minimum: 50,
  availability_target: 99.9
} as const;

// Deployment environments
export const DEPLOYMENT_ENVIRONMENTS = [
  'development',
  'staging', 
  'production',
  'testing'
] as const;

// Deployment types
export const DEPLOYMENT_TYPES = [
  'blue-green',
  'canary',
  'rolling',
  'direct'
] as const;

// Metric types
export const METRIC_TYPES = [
  'latency',
  'throughput',
  'accuracy',
  'error_rate',
  'resource_usage',
  'cost',
  'user_satisfaction'
] as const;

// Alert severities
export const ALERT_SEVERITIES = [
  'info',
  'warning',
  'critical',
  'emergency'
] as const;

// Lifecycle stages
export const LIFECYCLE_STAGES = [
  'development',
  'testing',
  'staging',
  'production',
  'deprecated',
  'archived',
  'retired'
] as const;

// Approval statuses
export const APPROVAL_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'conditional'
] as const;

// Deployment statuses
export const DEPLOYMENT_STATUSES = [
  'deploying',
  'healthy',
  'unhealthy',
  'failed',
  'terminated'
] as const;

// Fine-tuning job statuses
export const FINE_TUNING_STATUSES = [
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled'
] as const;

// A/B test statuses
export const AB_TEST_STATUSES = [
  'draft',
  'running',
  'paused',
  'completed',
  'terminated'
] as const;

// Optimization recommendation types
export const RECOMMENDATION_TYPES = [
  'performance',
  'cost',
  'accuracy',
  'scaling',
  'security'
] as const;

// Recommendation priorities
export const RECOMMENDATION_PRIORITIES = [
  'low',
  'medium',
  'high',
  'critical'
] as const;

// Alert types
export const ALERT_TYPES = [
  'performance_degradation',
  'high_error_rate',
  'resource_exhaustion',
  'cost_spike',
  'security_incident',
  'availability_issue'
] as const;

// Health status levels
export const HEALTH_STATUSES = [
  'healthy',
  'degraded',
  'critical',
  'unknown'
] as const;

// Optimization strategies for fine-tuning
export const OPTIMIZATION_STRATEGIES = [
  'adam',
  'adamw',
  'sgd',
  'rmsprop',
  'adagrad'
] as const;

// Time ranges for analytics
export const TIME_RANGES = {
  '1h': { label: 'Last Hour', seconds: 3600 },
  '24h': { label: 'Last 24 Hours', seconds: 86400 },
  '7d': { label: 'Last 7 Days', seconds: 604800 },
  '30d': { label: 'Last 30 Days', seconds: 2592000 },
  '90d': { label: 'Last 90 Days', seconds: 7776000 }
} as const;

// Default configuration values
export const DEFAULT_CONFIG = {
  monitoring_interval: 30, // seconds
  alert_check_interval: 60, // seconds
  metrics_retention_days: 90,
  max_concurrent_deployments: 5,
  default_rollback_timeout: 300, // seconds
  canary_traffic_increment: 10, // percentage
  ab_test_minimum_sample_size: 1000,
  ab_test_significance_threshold: 0.05,
  ab_test_default_duration_hours: 168, // 1 week
  fine_tuning_default_batch_size: 32,
  fine_tuning_default_learning_rate: 0.0001,
  fine_tuning_default_epochs: 10
} as const;

// API response codes
export const API_RESPONSE_CODES = {
  SUCCESS: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

// Error codes
export const ERROR_CODES = {
  DEPLOYMENT_ERROR: 'DEPLOYMENT_ERROR',
  MONITORING_ERROR: 'MONITORING_ERROR',
  AB_TEST_ERROR: 'AB_TEST_ERROR',
  FINE_TUNING_ERROR: 'FINE_TUNING_ERROR',
  OPTIMIZATION_ERROR: 'OPTIMIZATION_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED'
} as const;

// Event types for real-time updates
export const EVENT_TYPES = {
  DEPLOYMENT_CREATED: 'deployment_created',
  DEPLOYMENT_UPDATED: 'deployment_updated',
  DEPLOYMENT_FAILED: 'deployment_failed',
  METRICS_RECORDED: 'metrics_recorded',
  ALERT_TRIGGERED: 'alert_triggered',
  ALERT_RESOLVED: 'alert_resolved',
  AB_TEST_STARTED: 'ab_test_started',
  AB_TEST_COMPLETED: 'ab_test_completed',
  FINE_TUNING_STARTED: 'fine_tuning_started',
  FINE_TUNING_COMPLETED: 'fine_tuning_completed',
  OPTIMIZATION_GENERATED: 'optimization_generated',
  LIFECYCLE_UPDATED: 'lifecycle_updated'
} as const;

// Metric units
export const METRIC_UNITS = {
  MILLISECONDS: 'ms',
  SECONDS: 's',
  PERCENTAGE: 'percentage',
  REQUESTS_PER_SECOND: 'requests/second',
  USD: 'usd',
  BYTES: 'bytes',
  COUNT: 'count',
  SCORE: 'score'
} as const;

// Chart colors for dashboard
export const CHART_COLORS = {
  PRIMARY: '#3b82f6',
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  ERROR: '#ef4444',
  INFO: '#6366f1',
  SECONDARY: '#6b7280'
} as const;

// Dashboard refresh intervals
export const REFRESH_INTERVALS = {
  REAL_TIME: 5000,   // 5 seconds
  FAST: 15000,       // 15 seconds
  NORMAL: 30000,     // 30 seconds
  SLOW: 60000        // 1 minute
} as const;

// Maximum values for validation
export const MAX_VALUES = {
  TRAFFIC_PERCENTAGE: 100,
  BATCH_SIZE: 1024,
  EPOCHS: 1000,
  LEARNING_RATE: 1.0,
  CONFIDENCE_LEVEL: 1.0,
  SAMPLE_SIZE: 1000000
} as const;

// Minimum values for validation
export const MIN_VALUES = {
  TRAFFIC_PERCENTAGE: 0,
  BATCH_SIZE: 1,
  EPOCHS: 1,
  LEARNING_RATE: 0.000001,
  CONFIDENCE_LEVEL: 0.01,
  SAMPLE_SIZE: 100
} as const;