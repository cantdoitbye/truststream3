/**
 * Agent Health Monitoring and Auto-Recovery System - Core Interfaces
 * 
 * Comprehensive type definitions for the governance agent monitoring system
 * providing real-time metrics, predictive analytics, and automated recovery.
 */

// ===== CORE CONFIGURATION INTERFACES =====

export interface MonitoringSystemConfig {
  systemId: string;
  environment: 'development' | 'staging' | 'production';
  metrics: MetricsConfig;
  analytics: AnalyticsConfig;
  alerting: AlertingConfig;
  recovery: RecoveryConfig;
  dashboard: DashboardConfig;
  storage: StorageConfig;
}

export interface MetricsConfig {
  collectionInterval: number;           // Milliseconds between collections
  batchSize: number;                   // Number of metrics per batch
  retentionPeriod: string;             // e.g., '7d', '30d', '1y'
  enableStreaming: boolean;            // Real-time streaming enabled
  streamingPort: number;               // WebSocket port for streaming
  compressionEnabled: boolean;         // Metric compression
  aggregationRules: AggregationRule[];
}

export interface AnalyticsConfig {
  enablePredictiveAnalytics: boolean;
  modelUpdateInterval: number;
  anomalyDetection: AnomalyDetectionConfig;
  performancePrediction: PerformancePredictionConfig;
  trendAnalysis: TrendAnalysisConfig;
}

export interface AlertingConfig {
  enableAlerting: boolean;
  severityThresholds: SeverityThresholds;
  notificationChannels: NotificationChannel[];
  escalationRules: EscalationRule[];
  suppressionRules: SuppressionRule[];
  acknowledgmentTimeout: number;
}

export interface RecoveryConfig {
  enableAutoRecovery: boolean;
  maxRetryAttempts: number;
  retryBackoffStrategy: 'linear' | 'exponential' | 'fixed';
  escalationTimeout: number;
  failoverEnabled: boolean;
  rollbackEnabled: boolean;
  emergencyProtocols: EmergencyProtocol[];
}

export interface DashboardConfig {
  enableDashboard: boolean;
  port: number;
  theme: 'light' | 'dark' | 'auto';
  refreshInterval: number;
  maxDisplayedAlerts: number;
  enableExports: boolean;
  customizations: DashboardCustomization[];
}

export interface StorageConfig {
  type: 'postgresql' | 'timescaledb' | 'influxdb' | 'elasticsearch';
  connectionString: string;
  replicationFactor: number;
  partitionStrategy: string;
  compressionLevel: number;
}

// ===== HEALTH MONITORING INTERFACES =====

export interface AgentHealthStatus {
  agentId: string;
  timestamp: Date;
  overallHealth: HealthLevel;
  components: ComponentHealth[];
  metrics: HealthMetrics;
  alerts: ActiveAlert[];
  lastHeartbeat: Date;
  uptime: number;
  version: string;
}

export interface ComponentHealth {
  componentId: string;
  name: string;
  type: ComponentType;
  status: HealthLevel;
  metrics: ComponentMetrics;
  dependencies: string[];
  lastChecked: Date;
  checkInterval: number;
}

export interface HealthMetrics {
  performance: PerformanceMetrics;
  resource: ResourceMetrics;
  governance: GovernanceMetrics;
  system: SystemMetrics;
  custom: Record<string, any>;
}

export interface PerformanceMetrics {
  responseTime: MetricValue;
  throughput: MetricValue;
  errorRate: MetricValue;
  successRate: MetricValue;
  latency: LatencyMetrics;
  availability: MetricValue;
}

export interface ResourceMetrics {
  cpu: ResourceUtilization;
  memory: ResourceUtilization;
  disk: ResourceUtilization;
  network: NetworkMetrics;
  connections: ConnectionMetrics;
}

export interface GovernanceMetrics {
  decisionQuality: MetricValue;
  complianceScore: MetricValue;
  auditTrailIntegrity: MetricValue;
  stakeholderSatisfaction: MetricValue;
  ethicsCompliance: MetricValue;
  transparencyScore: MetricValue;
}

export interface SystemMetrics {
  processCount: number;
  threadCount: number;
  fileDescriptors: number;
  databaseConnections: number;
  cacheHitRate: MetricValue;
  queueDepth: number;
}

// ===== METRICS AND MEASUREMENT INTERFACES =====

export interface MetricValue {
  current: number;
  average: number;
  min: number;
  max: number;
  trend: TrendDirection;
  unit: string;
  timestamp: Date;
}

export interface ResourceUtilization {
  used: number;
  total: number;
  percentage: number;
  trend: TrendDirection;
  threshold: UtilizationThreshold;
}

export interface LatencyMetrics {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  mean: number;
  unit: 'ms' | 'μs' | 'ns';
}

export interface NetworkMetrics {
  bytesIn: MetricValue;
  bytesOut: MetricValue;
  packetsIn: MetricValue;
  packetsOut: MetricValue;
  errors: MetricValue;
  dropped: MetricValue;
}

export interface ConnectionMetrics {
  active: number;
  idle: number;
  waiting: number;
  poolSize: number;
  maxConnections: number;
  connectionErrors: number;
}

// ===== ANALYTICS AND PREDICTION INTERFACES =====

export interface PredictiveAnalysis {
  analysisId: string;
  agentId: string;
  timestamp: Date;
  predictions: PerformancePrediction[];
  anomalies: AnomalyDetection[];
  recommendations: AnalyticsRecommendation[];
  confidence: number;
  modelVersion: string;
}

export interface PerformancePrediction {
  metric: string;
  timeHorizon: string;
  predictedValue: number;
  confidenceInterval: [number, number];
  trend: TrendDirection;
  factors: PredictionFactor[];
}

export interface AnomalyDetection {
  anomalyId: string;
  type: AnomalyType;
  severity: SeverityLevel;
  metric: string;
  observedValue: number;
  expectedValue: number;
  deviation: number;
  confidence: number;
  context: AnomalyContext;
}

export interface AnalyticsRecommendation {
  recommendationId: string;
  type: RecommendationType;
  priority: PriorityLevel;
  description: string;
  actions: RecommendedAction[];
  expectedImpact: ImpactAssessment;
  effort: EffortLevel;
}

// ===== ALERTING SYSTEM INTERFACES =====

export interface Alert {
  alertId: string;
  agentId: string;
  type: AlertType;
  severity: SeverityLevel;
  title: string;
  description: string;
  metric?: string;
  threshold?: number;
  actualValue?: number;
  timestamp: Date;
  status: AlertStatus;
  acknowledgments: AlertAcknowledgment[];
  escalations: AlertEscalation[];
  resolution?: AlertResolution;
  tags: string[];
}

export interface ActiveAlert extends Alert {
  duration: number;
  ackRequired: boolean;
  escalationDeadline?: Date;
  suppressedUntil?: Date;
  relatedAlerts: string[];
}

export interface AlertAcknowledgment {
  acknowledgedBy: string;
  acknowledgedAt: Date;
  comment?: string;
  action?: string;
}

export interface AlertEscalation {
  level: number;
  escalatedTo: string;
  escalatedAt: Date;
  reason: string;
  deadline: Date;
}

export interface AlertResolution {
  resolvedBy: string;
  resolvedAt: Date;
  resolution: string;
  actions: string[];
  preventiveMeasures?: string[];
}

// ===== RECOVERY SYSTEM INTERFACES =====

export interface RecoveryProcedure {
  procedureId: string;
  name: string;
  description: string;
  triggers: RecoveryTrigger[];
  steps: RecoveryStep[];
  prerequisites: string[];
  rollbackSteps: RecoveryStep[];
  successCriteria: SuccessCriteria[];
  timeout: number;
  maxAttempts: number;
}

export interface RecoveryExecution {
  executionId: string;
  procedureId: string;
  agentId: string;
  triggeredBy: string;
  startTime: Date;
  endTime?: Date;
  status: RecoveryStatus;
  steps: RecoveryStepExecution[];
  result: RecoveryResult;
  logs: RecoveryLog[];
}

export interface RecoveryStep {
  stepId: string;
  name: string;
  type: RecoveryStepType;
  action: string;
  parameters: Record<string, any>;
  timeout: number;
  retryPolicy: RetryPolicy;
  rollbackAction?: string;
  dependencies: string[];
}

export interface RecoveryStepExecution {
  stepId: string;
  startTime: Date;
  endTime?: Date;
  status: StepStatus;
  attempts: number;
  output?: any;
  error?: string;
  rollbackExecuted: boolean;
}

// ===== DASHBOARD INTERFACES =====

export interface DashboardData {
  timestamp: Date;
  overview: SystemOverview;
  agents: AgentSummary[];
  alerts: AlertSummary;
  performance: PerformanceSummary;
  trends: TrendSummary;
  recovery: RecoverySummary;
}

export interface SystemOverview {
  totalAgents: number;
  healthyAgents: number;
  unhealthyAgents: number;
  criticalAgents: number;
  overallHealthScore: number;
  systemUptime: number;
  lastUpdate: Date;
}

export interface AgentSummary {
  agentId: string;
  name: string;
  type: string;
  health: HealthLevel;
  uptime: number;
  activeAlerts: number;
  lastSeen: Date;
  key_metrics: Record<string, number>;
}

export interface AlertSummary {
  total: number;
  critical: number;
  warning: number;
  info: number;
  acknowledged: number;
  recent: Alert[];
}

// ===== ENUMS AND TYPE DEFINITIONS =====

export type HealthLevel = 'healthy' | 'degraded' | 'unhealthy' | 'critical' | 'unknown';
export type ComponentType = 'core' | 'service' | 'database' | 'external' | 'cache' | 'queue';
export type TrendDirection = 'up' | 'down' | 'stable' | 'volatile';
export type SeverityLevel = 'info' | 'warning' | 'critical' | 'emergency';
export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';
export type AlertType = 'threshold' | 'anomaly' | 'availability' | 'performance' | 'security' | 'compliance';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'suppressed' | 'escalated';
export type RecoveryStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'rolledback';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'retrying';
export type RecoveryStepType = 'restart' | 'reconfigure' | 'failover' | 'rollback' | 'scale' | 'diagnose';
export type AnomalyType = 'point' | 'contextual' | 'collective' | 'seasonal';
export type RecommendationType = 'optimization' | 'scaling' | 'configuration' | 'maintenance' | 'security';
export type EffortLevel = 'low' | 'medium' | 'high' | 'very_high';

// ===== SUPPORTING INTERFACES =====

export interface AggregationRule {
  metric: string;
  function: 'avg' | 'sum' | 'min' | 'max' | 'count' | 'median';
  interval: string;
  retention: string;
}

export interface AnomalyDetectionConfig {
  enabled: boolean;
  algorithm: 'statistical' | 'ml' | 'hybrid';
  sensitivity: number;
  lookbackWindow: string;
  minDataPoints: number;
}

export interface PerformancePredictionConfig {
  enabled: boolean;
  horizons: string[];
  updateInterval: string;
  accuracy_threshold: number;
}

export interface TrendAnalysisConfig {
  enabled: boolean;
  window: string;
  sensitivity: number;
  seasonality: boolean;
}

export interface SeverityThresholds {
  warning: number;
  critical: number;
  emergency: number;
}

export interface NotificationChannel {
  id: string;
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'pagerduty';
  config: Record<string, any>;
  enabled: boolean;
  severityFilter: SeverityLevel[];
}

export interface EscalationRule {
  ruleId: string;
  condition: string;
  delay: number;
  target: string;
  action: string;
}

export interface SuppressionRule {
  ruleId: string;
  condition: string;
  duration: number;
  reason: string;
}

export interface EmergencyProtocol {
  protocolId: string;
  name: string;
  trigger: string;
  actions: EmergencyAction[];
  contacts: EmergencyContact[];
}

export interface EmergencyAction {
  actionId: string;
  type: 'shutdown' | 'isolate' | 'notify' | 'backup' | 'failover';
  parameters: Record<string, any>;
  timeout: number;
}

export interface EmergencyContact {
  contactId: string;
  name: string;
  role: string;
  methods: ContactMethod[];
  availability: string;
}

export interface ContactMethod {
  type: 'phone' | 'email' | 'sms';
  value: string;
  priority: number;
}

export interface DashboardCustomization {
  id: string;
  type: 'widget' | 'layout' | 'theme' | 'filter';
  config: Record<string, any>;
}

export interface ComponentMetrics {
  [key: string]: MetricValue;
}

export interface UtilizationThreshold {
  warning: number;
  critical: number;
  emergency: number;
}

export interface PredictionFactor {
  factor: string;
  importance: number;
  direction: 'positive' | 'negative';
}

export interface AnomalyContext {
  relatedMetrics: string[];
  timeContext: string;
  seasonalPattern?: string;
  externalFactors?: string[];
}

export interface RecommendedAction {
  actionId: string;
  type: string;
  description: string;
  parameters: Record<string, any>;
  automation: boolean;
}

export interface ImpactAssessment {
  performance: number;
  stability: number;
  cost: number;
  risk: number;
}

export interface RecoveryTrigger {
  triggerId: string;
  type: 'metric' | 'alert' | 'manual' | 'schedule';
  condition: string;
  threshold?: number;
  operator?: string;
}

export interface SuccessCriteria {
  criteriaId: string;
  metric: string;
  operator: string;
  threshold: number;
  timeout: number;
}

export interface RecoveryResult {
  success: boolean;
  message: string;
  metrics: Record<string, any>;
  duration: number;
  stepsCompleted: number;
  stepsTotal: number;
}

export interface RecoveryLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, any>;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier?: number;
}

export interface PerformanceSummary {
  averageResponseTime: number;
  totalRequests: number;
  errorRate: number;
  throughput: number;
  topPerformers: AgentSummary[];
  underPerformers: AgentSummary[];
}

export interface TrendSummary {
  performance: TrendDirection;
  availability: TrendDirection;
  errorRate: TrendDirection;
  resourceUtilization: TrendDirection;
  predictions: string[];
}

export interface RecoverySummary {
  totalRecoveries: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  averageRecoveryTime: number;
  recentRecoveries: RecoveryExecution[];
}

// ===== MAIN MONITORING INTERFACE =====

export interface IAgentHealthMonitor {
  // Core monitoring operations
  startMonitoring(): Promise<void>;
  stopMonitoring(): Promise<void>;
  pauseMonitoring(): Promise<void>;
  resumeMonitoring(): Promise<void>;
  
  // Agent management
  registerAgent(agentId: string, config: any): Promise<void>;
  unregisterAgent(agentId: string): Promise<void>;
  getAgentHealth(agentId: string): Promise<AgentHealthStatus>;
  getAllAgentsHealth(): Promise<AgentHealthStatus[]>;
  
  // Metrics operations
  collectMetrics(agentId: string): Promise<HealthMetrics>;
  streamMetrics(agentId: string, callback: (metrics: HealthMetrics) => void): Promise<void>;
  getMetricsHistory(agentId: string, timeRange: string): Promise<HealthMetrics[]>;
  
  // Analytics operations
  runPredictiveAnalysis(agentId: string): Promise<PredictiveAnalysis>;
  detectAnomalies(agentId: string): Promise<AnomalyDetection[]>;
  generateRecommendations(agentId: string): Promise<AnalyticsRecommendation[]>;
  
  // Alerting operations
  createAlert(alert: Omit<Alert, 'alertId' | 'timestamp'>): Promise<Alert>;
  acknowledgeAlert(alertId: string, acknowledgedBy: string, comment?: string): Promise<void>;
  resolveAlert(alertId: string, resolvedBy: string, resolution: string): Promise<void>;
  getActiveAlerts(agentId?: string): Promise<ActiveAlert[]>;
  
  // Recovery operations
  triggerRecovery(agentId: string, procedureId: string, triggeredBy: string): Promise<RecoveryExecution>;
  executeRecoveryStep(executionId: string, stepId: string): Promise<RecoveryStepExecution>;
  rollbackRecovery(executionId: string): Promise<void>;
  getRecoveryStatus(executionId: string): Promise<RecoveryExecution>;
  
  // Dashboard operations
  getDashboardData(): Promise<DashboardData>;
  getSystemOverview(): Promise<SystemOverview>;
  exportMetrics(format: 'json' | 'csv' | 'prometheus'): Promise<string>;
  
  // Configuration operations
  updateConfig(config: Partial<MonitoringSystemConfig>): Promise<void>;
  getConfig(): MonitoringSystemConfig;
  validateConfig(config: MonitoringSystemConfig): boolean;
}
