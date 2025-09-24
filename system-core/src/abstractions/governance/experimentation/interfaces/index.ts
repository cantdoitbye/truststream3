/**
 * Core Interfaces for TrustStream A/B Testing Framework
 * Defines contracts for experiment management, traffic splitting, 
 * statistical analysis, feature flags, and canary deployments.
 */

import {
  Experiment,
  ExperimentConfig,
  ExperimentEvent,
  ExperimentReport,
  ExperimentResult,
  ExperimentStatus,
  FeatureFlag,
  FeatureFlagEvaluation,
  FeatureFlagRule,
  MetricValue,
  StatisticalResult,
  TrafficSplit,
  UUID,
  UserId,
  AgentId,
  CanaryEvent,
  DeploymentConfig,
  ExperimentationError,
  VariantComparison
} from '../types';

// Experiment Management Interface
export interface IExperimentManager {
  /**
   * Create a new experiment
   */
  createExperiment(experiment: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Experiment>;

  /**
   * Update an existing experiment
   */
  updateExperiment(id: UUID, updates: Partial<Experiment>): Promise<Experiment>;

  /**
   * Get experiment by ID
   */
  getExperiment(id: UUID): Promise<Experiment | null>;

  /**
   * List experiments with optional filtering
   */
  listExperiments(filter?: ExperimentFilter): Promise<Experiment[]>;

  /**
   * Start an experiment
   */
  startExperiment(id: UUID): Promise<void>;

  /**
   * Pause an experiment
   */
  pauseExperiment(id: UUID): Promise<void>;

  /**
   * Resume a paused experiment
   */
  resumeExperiment(id: UUID): Promise<void>;

  /**
   * Complete an experiment
   */
  completeExperiment(id: UUID): Promise<ExperimentReport>;

  /**
   * Terminate an experiment
   */
  terminateExperiment(id: UUID, reason: string): Promise<void>;

  /**
   * Validate experiment configuration
   */
  validateExperiment(experiment: Experiment): Promise<ValidationResult>;

  /**
   * Clone an experiment
   */
  cloneExperiment(id: UUID, name: string): Promise<Experiment>;

  /**
   * Archive an experiment
   */
  archiveExperiment(id: UUID): Promise<void>;
}

export interface ExperimentFilter {
  status?: ExperimentStatus[];
  targetType?: string[];
  createdBy?: UserId[];
  startDate?: {
    from?: number;
    to?: number;
  };
  tags?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Traffic Splitting Interface
export interface ITrafficSplitter {
  /**
   * Assign a user to a variant
   */
  assignVariant(experimentId: UUID, userId: UserId, agentId?: AgentId, context?: Record<string, any>): Promise<TrafficSplit>;

  /**
   * Get current assignment for a user
   */
  getAssignment(experimentId: UUID, userId: UserId): Promise<TrafficSplit | null>;

  /**
   * Update traffic allocation for an experiment
   */
  updateTrafficAllocation(experimentId: UUID, allocation: Record<UUID, number>): Promise<void>;

  /**
   * Remove user from experiment
   */
  removeUserFromExperiment(experimentId: UUID, userId: UserId): Promise<void>;

  /**
   * Get traffic distribution for an experiment
   */
  getTrafficDistribution(experimentId: UUID): Promise<TrafficDistribution>;

  /**
   * Validate traffic allocation
   */
  validateTrafficAllocation(allocation: Record<UUID, number>): ValidationResult;

  /**
   * Rebalance traffic across variants
   */
  rebalanceTraffic(experimentId: UUID): Promise<void>;
}

export interface TrafficDistribution {
  experimentId: UUID;
  totalUsers: number;
  variants: VariantDistribution[];
  lastUpdated: number;
}

export interface VariantDistribution {
  variantId: UUID;
  userCount: number;
  percentage: number;
}

// Statistical Analysis Interface
export interface IStatisticalAnalyzer {
  /**
   * Calculate statistical significance for an experiment
   */
  calculateSignificance(experimentId: UUID): Promise<StatisticalResult[]>;

  /**
   * Analyze specific metric across variants
   */
  analyzeMetric(experimentId: UUID, metricId: UUID): Promise<StatisticalResult>;

  /**
   * Get real-time experiment metrics
   */
  getExperimentMetrics(experimentId: UUID): Promise<ExperimentMetrics>;

  /**
   * Calculate required sample size
   */
  calculateSampleSize(
    expectedEffect: number,
    confidence: number,
    power: number,
    baselineRate?: number
  ): Promise<number>;

  /**
   * Detect anomalies in experiment data
   */
  detectAnomalies(experimentId: UUID): Promise<Anomaly[]>;

  /**
   * Generate experiment insights
   */
  generateInsights(experimentId: UUID): Promise<ExperimentInsights>;

  /**
   * Validate metric definitions
   */
  validateMetrics(metrics: any[]): ValidationResult;

  /**
   * Calculate power analysis
   */
  calculatePowerAnalysis(experimentId: UUID): Promise<PowerAnalysis>;
}

export interface ExperimentMetrics {
  experimentId: UUID;
  variants: VariantMetrics[];
  overallMetrics: OverallMetrics;
  calculatedAt: number;
}

export interface VariantMetrics {
  variantId: UUID;
  sampleSize: number;
  metrics: Record<string, number>;
  conversionRates: Record<string, number>;
}

export interface OverallMetrics {
  totalSampleSize: number;
  duration: number; // in seconds
  confidence: number;
  power: number;
}

export interface Anomaly {
  type: 'outlier' | 'trend_change' | 'variance_increase' | 'sample_ratio_mismatch';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedVariants: UUID[];
  detectedAt: number;
  recommendations: string[];
}

export interface ExperimentInsights {
  experimentId: UUID;
  winningVariant?: UUID;
  confidence: number;
  recommendations: Recommendation[];
  keyFindings: string[];
  nextSteps: string[];
}

export interface Recommendation {
  type: 'continue' | 'stop' | 'extend' | 'scale' | 'investigate';
  priority: 'low' | 'medium' | 'high';
  description: string;
  reasoning: string;
}

export interface PowerAnalysis {
  experimentId: UUID;
  currentPower: number;
  requiredSampleSize: number;
  timeToSignificance?: number; // in days
  recommendations: string[];
}

// Feature Flags Interface
export interface IFeatureFlagManager {
  /**
   * Create a new feature flag
   */
  createFlag(flag: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeatureFlag>;

  /**
   * Update a feature flag
   */
  updateFlag(id: UUID, updates: Partial<FeatureFlag>): Promise<FeatureFlag>;

  /**
   * Get feature flag by ID or key
   */
  getFlag(identifier: UUID | string): Promise<FeatureFlag | null>;

  /**
   * List feature flags
   */
  listFlags(filter?: FeatureFlagFilter): Promise<FeatureFlag[]>;

  /**
   * Evaluate a feature flag for a user/agent
   */
  evaluateFlag(
    flagKey: string,
    userId: UserId,
    agentId?: AgentId,
    context?: Record<string, any>
  ): Promise<FeatureFlagEvaluation>;

  /**
   * Bulk evaluate multiple feature flags
   */
  evaluateFlags(
    flagKeys: string[],
    userId: UserId,
    agentId?: AgentId,
    context?: Record<string, any>
  ): Promise<Record<string, FeatureFlagEvaluation>>;

  /**
   * Toggle a feature flag
   */
  toggleFlag(id: UUID, enabled: boolean): Promise<void>;

  /**
   * Update flag rollout percentage
   */
  updateRollout(id: UUID, percentage: number): Promise<void>;

  /**
   * Add rule to feature flag
   */
  addRule(flagId: UUID, rule: Omit<FeatureFlagRule, 'id'>): Promise<FeatureFlagRule>;

  /**
   * Update feature flag rule
   */
  updateRule(flagId: UUID, ruleId: UUID, updates: Partial<FeatureFlagRule>): Promise<FeatureFlagRule>;

  /**
   * Remove rule from feature flag
   */
  removeRule(flagId: UUID, ruleId: UUID): Promise<void>;

  /**
   * Archive a feature flag
   */
  archiveFlag(id: UUID): Promise<void>;

  /**
   * Get flag evaluation history
   */
  getEvaluationHistory(flagId: UUID, userId?: UserId): Promise<FeatureFlagEvaluation[]>;
}

export interface FeatureFlagFilter {
  enabled?: boolean;
  environment?: string[];
  targetType?: string[];
  tags?: string[];
}

// Canary Deployment Interface
export interface ICanaryDeploymentManager {
  /**
   * Start a canary deployment
   */
  startCanaryDeployment(config: DeploymentConfig): Promise<CanaryDeployment>;

  /**
   * Update canary deployment configuration
   */
  updateCanaryDeployment(deploymentId: UUID, config: Partial<DeploymentConfig>): Promise<CanaryDeployment>;

  /**
   * Get canary deployment status
   */
  getCanaryDeployment(deploymentId: UUID): Promise<CanaryDeployment | null>;

  /**
   * List active canary deployments
   */
  listCanaryDeployments(filter?: CanaryFilter): Promise<CanaryDeployment[]>;

  /**
   * Promote canary to next phase
   */
  promoteCanary(deploymentId: UUID): Promise<void>;

  /**
   * Rollback canary deployment
   */
  rollbackCanary(deploymentId: UUID, reason: string): Promise<void>;

  /**
   * Complete canary deployment
   */
  completeCanaryDeployment(deploymentId: UUID): Promise<void>;

  /**
   * Monitor canary health
   */
  monitorCanaryHealth(deploymentId: UUID): Promise<CanaryHealthStatus>;

  /**
   * Get canary metrics
   */
  getCanaryMetrics(deploymentId: UUID): Promise<CanaryMetrics>;

  /**
   * Validate canary configuration
   */
  validateCanaryConfig(config: DeploymentConfig): ValidationResult;
}

export interface CanaryDeployment {
  id: UUID;
  experimentId?: UUID;
  config: DeploymentConfig;
  status: CanaryStatus;
  currentPhase: number;
  currentTrafficPercentage: number;
  startedAt: number;
  lastPromotedAt?: number;
  events: CanaryEvent[];
  metrics: CanaryMetrics;
}

export enum CanaryStatus {
  STARTING = 'starting',
  ACTIVE = 'active',
  PROMOTING = 'promoting',
  COMPLETED = 'completed',
  ROLLING_BACK = 'rolling_back',
  ROLLED_BACK = 'rolled_back',
  FAILED = 'failed'
}

export interface CanaryFilter {
  status?: CanaryStatus[];
  experimentId?: UUID[];
}

export interface CanaryHealthStatus {
  deploymentId: UUID;
  overall: 'healthy' | 'warning' | 'critical';
  metrics: Record<string, CanaryMetricHealth>;
  recommendations: string[];
  lastChecked: number;
}

export interface CanaryMetricHealth {
  name: string;
  value: number;
  threshold: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface CanaryMetrics {
  deploymentId: UUID;
  errorRate: number;
  responseTime: number;
  throughput: number;
  successRate: number;
  customMetrics: Record<string, number>;
  collectedAt: number;
}

// Event System Interface
export interface IExperimentEventSystem {
  /**
   * Emit an experiment event
   */
  emit(event: Omit<ExperimentEvent, 'id' | 'timestamp'>): Promise<void>;

  /**
   * Subscribe to experiment events
   */
  subscribe(
    experimentId: UUID | 'all',
    eventTypes: string[],
    callback: (event: ExperimentEvent) => void
  ): Promise<string>; // Returns subscription ID

  /**
   * Unsubscribe from experiment events
   */
  unsubscribe(subscriptionId: string): Promise<void>;

  /**
   * Get event history for an experiment
   */
  getEventHistory(experimentId: UUID, filter?: EventFilter): Promise<ExperimentEvent[]>;

  /**
   * Process metric events
   */
  processMetricEvent(experimentId: UUID, variantId: UUID, metric: MetricValue): Promise<void>;
}

export interface EventFilter {
  eventTypes?: string[];
  startDate?: number;
  endDate?: number;
  userId?: UserId;
  agentId?: AgentId;
}

// Configuration Interface
export interface IExperimentationConfigManager {
  /**
   * Get experiment configuration
   */
  getConfig(): Promise<ExperimentConfig>;

  /**
   * Update experiment configuration
   */
  updateConfig(updates: Partial<ExperimentConfig>): Promise<ExperimentConfig>;

  /**
   * Validate configuration
   */
  validateConfig(config: ExperimentConfig): ValidationResult;

  /**
   * Reset configuration to defaults
   */
  resetToDefaults(): Promise<ExperimentConfig>;
}

// Reporting Interface
export interface IExperimentReporter {
  /**
   * Generate experiment report
   */
  generateReport(experimentId: UUID): Promise<ExperimentReport>;

  /**
   * Get experiment summary
   */
  getExperimentSummary(experimentId: UUID): Promise<ExperimentSummary>;

  /**
   * Export experiment data
   */
  exportExperimentData(experimentId: UUID, format: 'csv' | 'json' | 'xlsx'): Promise<Buffer>;

  /**
   * Generate insights report
   */
  generateInsightsReport(experimentIds: UUID[]): Promise<InsightsReport>;

  /**
   * Get dashboard data
   */
  getDashboardData(filter?: DashboardFilter): Promise<DashboardData>;
}

export interface ExperimentSummary {
  experimentId: UUID;
  name: string;
  status: ExperimentStatus;
  duration: number;
  sampleSize: number;
  significantMetrics: number;
  winningVariant?: UUID;
  confidence: number;
  estimatedValue: number;
}

export interface InsightsReport {
  generatedAt: number;
  experiments: ExperimentSummary[];
  overallInsights: string[];
  recommendations: Recommendation[];
  trends: TrendAnalysis[];
}

export interface TrendAnalysis {
  metric: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  changeRate: number;
  significance: number;
}

export interface DashboardFilter {
  timeRange?: {
    from: number;
    to: number;
  };
  status?: ExperimentStatus[];
  targetType?: string[];
}

export interface DashboardData {
  summary: {
    totalExperiments: number;
    activeExperiments: number;
    completedExperiments: number;
    totalUsers: number;
  };
  recentExperiments: ExperimentSummary[];
  performanceMetrics: Record<string, number>;
  alerts: Alert[];
}

export interface Alert {
  id: UUID;
  type: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  experimentId?: UUID;
  createdAt: number;
  resolved: boolean;
}

// Integration Interface
export interface IExperimentationIntegrations {
  /**
   * Integrate with external analytics platforms
   */
  integrateAnalytics(config: AnalyticsIntegration): Promise<void>;

  /**
   * Send webhook notifications
   */
  sendWebhook(event: ExperimentEvent): Promise<void>;

  /**
   * Sync with feature flag services
   */
  syncFeatureFlags(service: string, config: any): Promise<void>;

  /**
   * Export to business intelligence tools
   */
  exportToBITool(tool: string, experimentIds: UUID[]): Promise<void>;
}

export interface AnalyticsIntegration {
  platform: string;
  config: Record<string, any>;
  events: string[];
  enabled: boolean;
}