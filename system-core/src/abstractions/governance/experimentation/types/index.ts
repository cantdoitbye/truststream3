/**
 * A/B Testing Framework Types for TrustStream Governance
 * Provides comprehensive typing for experiment management, traffic splitting,
 * statistical analysis, feature flags, and canary deployments.
 */

// Common types
export type UUID = string;
export type Timestamp = number;
export type AgentId = string;
export type UserId = string;
export type PolicyId = string;

// Experiment Status Enums
export enum ExperimentStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  TERMINATED = 'terminated',
  ANALYZING = 'analyzing'
}

export enum VariantType {
  CONTROL = 'control',
  TREATMENT = 'treatment'
}

export enum ExperimentMetricType {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  GUARDRAIL = 'guardrail'
}

export enum DeploymentStrategy {
  CANARY = 'canary',
  BLUE_GREEN = 'blue-green',
  ROLLING = 'rolling',
  FEATURE_FLAG = 'feature-flag'
}

export enum StatisticalTestType {
  T_TEST = 't-test',
  CHI_SQUARE = 'chi-square',
  MANN_WHITNEY = 'mann-whitney',
  BINOMIAL = 'binomial',
  BAYESIAN = 'bayesian'
}

// Core Experiment Types
export interface Experiment {
  id: UUID;
  name: string;
  description: string;
  hypotheses: string[];
  status: ExperimentStatus;
  targetType: 'agent' | 'policy' | 'algorithm' | 'workflow';
  targetId: string;
  variants: ExperimentVariant[];
  trafficAllocation: TrafficAllocation;
  metrics: ExperimentMetric[];
  startDate: Timestamp;
  endDate?: Timestamp;
  confidence: number;
  power: number;
  minimumSampleSize: number;
  createdBy: UserId;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  metadata: Record<string, any>;
}

export interface ExperimentVariant {
  id: UUID;
  name: string;
  type: VariantType;
  configuration: Record<string, any>;
  isControl: boolean;
  allocation: number; // Percentage (0-100)
  deploymentConfig?: DeploymentConfig;
}

export interface DeploymentConfig {
  strategy: DeploymentStrategy;
  canaryConfig?: CanaryConfig;
  rollbackCriteria?: RollbackCriteria[];
  gradualRolloutPlan?: GradualRolloutPlan;
}

export interface CanaryConfig {
  initialTraffic: number;
  increments: number[];
  promotionCriteria: PromotionCriteria[];
  monitoringMetrics: string[];
  automaticPromotion: boolean;
  rollbackThresholds: Record<string, number>;
}

export interface PromotionCriteria {
  metric: string;
  threshold: number;
  comparison: 'greater_than' | 'less_than' | 'equals';
  window: number; // Time window in seconds
}

export interface RollbackCriteria {
  metric: string;
  threshold: number;
  comparison: 'greater_than' | 'less_than' | 'equals';
  automatic: boolean;
}

export interface GradualRolloutPlan {
  phases: RolloutPhase[];
  advancementCriteria: PromotionCriteria[];
  rollbackPolicy: RollbackPolicy;
}

export interface RolloutPhase {
  phase: number;
  trafficPercentage: number;
  duration: number; // in seconds
  requiredMetrics: string[];
}

export interface RollbackPolicy {
  automatic: boolean;
  manual: boolean;
  criteria: RollbackCriteria[];
  preserveData: boolean;
}

// Traffic Splitting Types
export interface TrafficAllocation {
  algorithm: 'random' | 'deterministic' | 'hash-based' | 'segment-based';
  segments?: TrafficSegment[];
  stickiness: boolean;
  stickyDuration?: number; // in seconds
  filters?: TrafficFilter[];
}

export interface TrafficSegment {
  id: UUID;
  name: string;
  criteria: SegmentCriteria[];
  allocation: number;
  variantId: UUID;
}

export interface SegmentCriteria {
  field: string;
  operator: 'equals' | 'contains' | 'in' | 'greater_than' | 'less_than';
  value: any;
}

export interface TrafficFilter {
  field: string;
  operator: 'equals' | 'contains' | 'in' | 'greater_than' | 'less_than' | 'regex';
  value: any;
  include: boolean;
}

export interface TrafficSplit {
  experimentId: UUID;
  userId: UserId;
  agentId?: AgentId;
  variantId: UUID;
  assignedAt: Timestamp;
  sessionId?: string;
  metadata: Record<string, any>;
}

// Metrics and Analytics Types
export interface ExperimentMetric {
  id: UUID;
  name: string;
  description: string;
  type: ExperimentMetricType;
  dataType: 'numeric' | 'boolean' | 'categorical';
  aggregation: 'sum' | 'average' | 'count' | 'rate' | 'percentage';
  statisticalTest: StatisticalTestType;
  targetValue?: number;
  expectedChange?: number;
  guardrailThresholds?: GuardrailThreshold[];
}

export interface GuardrailThreshold {
  metric: string;
  lowerBound?: number;
  upperBound?: number;
  action: 'warn' | 'pause' | 'terminate';
}

export interface MetricValue {
  experimentId: UUID;
  variantId: UUID;
  metricId: UUID;
  value: number;
  timestamp: Timestamp;
  userId?: UserId;
  agentId?: AgentId;
  metadata: Record<string, any>;
}

export interface StatisticalResult {
  metricId: UUID;
  variantComparison: VariantComparison[];
  significance: number;
  pValue: number;
  confidenceInterval: [number, number];
  effectSize: number;
  sampleSize: number;
  testType: StatisticalTestType;
  calculatedAt: Timestamp;
}

export interface VariantComparison {
  variantId: UUID;
  mean: number;
  variance: number;
  sampleSize: number;
  conversionRate?: number;
}

// Feature Flags Types
export interface FeatureFlag {
  id: UUID;
  name: string;
  description: string;
  key: string;
  enabled: boolean;
  targetType: 'agent' | 'policy' | 'algorithm' | 'workflow' | 'global';
  targetId?: string;
  variants?: FeatureFlagVariant[];
  rules: FeatureFlagRule[];
  rolloutPercentage: number;
  environments: string[];
  createdBy: UserId;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  metadata: Record<string, any>;
}

export interface FeatureFlagVariant {
  id: UUID;
  name: string;
  value: any;
  allocation: number;
  configuration?: Record<string, any>;
}

export interface FeatureFlagRule {
  id: UUID;
  name: string;
  conditions: FeatureFlagCondition[];
  variant?: UUID;
  enabled: boolean;
  rolloutPercentage: number;
  priority: number;
}

export interface FeatureFlagCondition {
  field: string;
  operator: 'equals' | 'contains' | 'in' | 'greater_than' | 'less_than' | 'regex';
  value: any;
}

export interface FeatureFlagEvaluation {
  flagId: UUID;
  userId: UserId;
  agentId?: AgentId;
  enabled: boolean;
  variant?: FeatureFlagVariant;
  rule?: UUID;
  evaluatedAt: Timestamp;
  context: Record<string, any>;
}

// Configuration Types
export interface ExperimentConfig {
  defaultConfidence: number;
  defaultPower: number;
  maxExperimentDuration: number; // in days
  minSampleSize: number;
  statsdConfig?: StatsdConfig;
  analyticsConfig?: AnalyticsConfig;
  featureFlagConfig?: FeatureFlagConfig;
  canaryConfig?: GlobalCanaryConfig;
}

export interface StatsdConfig {
  host: string;
  port: number;
  prefix: string;
}

export interface AnalyticsConfig {
  batchSize: number;
  flushInterval: number; // in seconds
  retentionDays: number;
}

export interface FeatureFlagConfig {
  defaultRolloutPercentage: number;
  evaluationCacheSize: number;
  evaluationCacheTtl: number; // in seconds
}

export interface GlobalCanaryConfig {
  defaultIncrements: number[];
  defaultPromotionDelay: number; // in seconds
  defaultRollbackThreshold: number;
  monitoringInterval: number; // in seconds
}

// Event Types
export interface ExperimentEvent {
  id: UUID;
  experimentId: UUID;
  type: 'created' | 'started' | 'paused' | 'resumed' | 'completed' | 'terminated' | 'variant_assigned' | 'metric_recorded';
  data: Record<string, any>;
  timestamp: Timestamp;
  userId?: UserId;
  agentId?: AgentId;
}

export interface CanaryEvent {
  id: UUID;
  deploymentId: UUID;
  type: 'started' | 'promoted' | 'rolled_back' | 'completed' | 'failed';
  phase?: number;
  trafficPercentage?: number;
  metrics?: Record<string, number>;
  timestamp: Timestamp;
  triggeredBy: 'automatic' | 'manual';
}

// Results and Reporting Types
export interface ExperimentReport {
  experimentId: UUID;
  generatedAt: Timestamp;
  status: ExperimentStatus;
  duration: number;
  totalSampleSize: number;
  results: ExperimentResult[];
  recommendations: string[];
  summary: string;
}

export interface ExperimentResult {
  metricId: UUID;
  metricName: string;
  statisticalResult: StatisticalResult;
  recommendation: 'continue' | 'stop' | 'extend' | 'increase_sample';
  significance: 'significant' | 'not_significant' | 'inconclusive';
}

// Error Types
export interface ExperimentationError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Timestamp;
  experimentId?: UUID;
  variantId?: UUID;
}

// Webhook and Integration Types
export interface WebhookConfig {
  url: string;
  events: string[];
  headers?: Record<string, string>;
  timeout: number;
  retryCount: number;
}

export interface IntegrationConfig {
  type: 'webhook' | 'kafka' | 'redis' | 'custom';
  config: Record<string, any>;
  enabled: boolean;
}