/**
 * AI Leader Quality Agent - Type Definitions
 * 
 * Defines interfaces and types for the Quality Agent following
 * the orchestration-first architecture patterns.
 */

// Import base interfaces
export interface AgentConfig {
  agentId?: string;
  environment: 'development' | 'staging' | 'production';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  database: DatabaseConfig;
  orchestrator: OrchestratorConfig;
  monitoring: MonitoringConfig;
}

export interface DatabaseConfig {
  type: 'postgresql' | 'supabase' | 'mongodb';
  connectionString: string;
  poolSize: number;
  retryAttempts: number;
}

export interface OrchestratorConfig {
  endpoint: string;
  authToken: string;
  heartbeatInterval: number;
  maxRetries: number;
}

export interface MonitoringConfig {
  metricsEndpoint: string;
  alertingEndpoint: string;
  logAggregationEndpoint: string;
  enableTracing: boolean;
}

// Quality Agent specific interfaces
export interface QualityAgentInterface {
  // Quality assessment
  assessOutputQuality(content: any, context: QualityContext): Promise<QualityScore>;
  validateComplianceStandards(): Promise<ComplianceReport>;
  
  // Quality monitoring
  monitorQualityTrends(): Promise<QualityTrends>;
  identifyQualityDeviations(): Promise<QualityDeviation[]>;
  
  // Quality improvement
  recommendQualityImprovements(): Promise<QualityImprovement[]>;
  enforceQualityStandards(): Promise<EnforcementResult>;
  
  // Benchmarking
  benchmarkAgainstIndustryStandards(): Promise<BenchmarkResult>;
  setQualityThresholds(agent: string, thresholds: QualityThresholds): Promise<void>;
}

// Quality context and assessment types
export interface QualityContext {
  sourceAgent: string;
  requestType: string;
  userContext: {
    userId?: string;
    userType: 'anonymous' | 'authenticated' | 'premium';
    preferences?: Record<string, any>;
  };
  requirements: {
    accuracy: number;
    relevance: number;
    completeness: number;
    clarity: number;
    timeliness: number;
  };
  constraints: {
    maxResponseTime: number;
    maxLength?: number;
    format?: string;
    language?: string;
  };
  domain: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface QualityScore {
  scoreId: string;
  timestamp: Date;
  content: any;
  context: QualityContext;
  metrics: QualityMetrics;
  overallScore: number;
  issues: QualityIssue[];
  recommendations: string[];
}

export interface QualityMetrics {
  accuracy: number;      // Factual correctness (0-1)
  relevance: number;     // Context appropriateness (0-1)
  completeness: number;  // Coverage of requirements (0-1)
  clarity: number;       // Communication effectiveness (0-1)
  consistency: number;   // Alignment with standards (0-1)
  timeliness: number;    // Response speed appropriateness (0-1)
}

export interface QualityIssue {
  issueId: string;
  type: 'accuracy' | 'relevance' | 'completeness' | 'clarity' | 'consistency' | 'timeliness';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: string;
  suggestion: string;
  impact: number;
}

// Compliance types
export interface ComplianceReport {
  reportId: string;
  timestamp: Date;
  period: {
    start: Date;
    end: Date;
  };
  standards: ComplianceStandard[];
  violations: ComplianceViolation[];
  recommendations: ComplianceRecommendation[];
  overallCompliance: number;
  status: 'compliant' | 'mostly-compliant' | 'partially-compliant' | 'non-compliant';
}

export interface ComplianceStandard {
  standardId: string;
  name: string;
  version: string;
  description: string;
  requirements: ComplianceRequirement[];
  lastAudit: Date;
  compliance: number;
  status: 'pass' | 'fail' | 'warning';
}

export interface ComplianceRequirement {
  requirementId: string;
  description: string;
  category: string;
  mandatory: boolean;
  compliance: boolean;
  evidence?: string;
  lastChecked: Date;
}

export interface ComplianceViolation {
  violationId: string;
  standardId: string;
  requirementId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detected: Date;
  status: 'open' | 'acknowledged' | 'resolved' | 'deferred';
  remediation?: RemediationPlan;
}

export interface RemediationPlan {
  planId: string;
  actions: RemediationAction[];
  timeline: Date;
  responsible: string;
  cost?: number;
  risk?: string;
}

export interface RemediationAction {
  actionId: string;
  description: string;
  type: 'immediate' | 'short-term' | 'long-term';
  status: 'planned' | 'in-progress' | 'completed' | 'deferred';
  deadline: Date;
  progress: number;
}

export interface ComplianceRecommendation {
  recommendationId: string;
  type: 'preventive' | 'corrective' | 'improvement';
  description: string;
  justification: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  priority: number;
  implementationGuide?: string;
}

// Quality trends and analysis types
export interface QualityTrends {
  timestamp: Date;
  period: {
    start: Date;
    end: Date;
  };
  overallTrend: TrendAnalysis;
  metricTrends: {
    accuracy: TrendAnalysis;
    relevance: TrendAnalysis;
    completeness: TrendAnalysis;
    clarity: TrendAnalysis;
    consistency: TrendAnalysis;
    timeliness: TrendAnalysis;
  };
  statistics: QualityStatistics;
  forecast: QualityForecast;
}

export interface TrendAnalysis {
  direction: 'improving' | 'stable' | 'degrading';
  magnitude: number;
  confidence: number;
  timeframe: number;
  inflectionPoints: Date[];
  seasonality?: SeasonalPattern;
}

export interface SeasonalPattern {
  pattern: 'daily' | 'weekly' | 'monthly';
  amplitude: number;
  phase: number;
  confidence: number;
}

export interface QualityStatistics {
  sampleSize: number;
  mean: QualityMetrics;
  median: QualityMetrics;
  standardDeviation: QualityMetrics;
  percentiles: {
    p25: QualityMetrics;
    p75: QualityMetrics;
    p90: QualityMetrics;
    p95: QualityMetrics;
    p99: QualityMetrics;
  };
  correlations: MetricCorrelation[];
}

export interface MetricCorrelation {
  metric1: string;
  metric2: string;
  correlation: number;
  significance: number;
}

export interface QualityForecast {
  forecastId: string;
  horizon: number; // hours
  predictions: QualityPrediction[];
  confidence: number;
  methodology: string;
  assumptions: string[];
}

export interface QualityPrediction {
  metric: string;
  current: number;
  predicted: number;
  confidence: number;
  volatility: number;
  factors: PredictionFactor[];
}

export interface PredictionFactor {
  factor: string;
  influence: number;
  description: string;
  confidence: number;
}

// Quality deviation types
export interface QualityDeviation {
  deviationId: string;
  timestamp: Date;
  type: 'sudden-drop' | 'gradual-decline' | 'anomaly' | 'threshold-breach';
  metric: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  currentValue: number;
  expectedValue: number;
  deviation: number;
  duration: number;
  cause?: DeviationCause;
  impact: DeviationImpact;
  status: 'active' | 'investigating' | 'resolved';
}

export interface DeviationCause {
  category: 'system' | 'data' | 'user' | 'external' | 'unknown';
  description: string;
  confidence: number;
  evidence: string[];
}

export interface DeviationImpact {
  userExperience: number;
  systemPerformance: number;
  businessMetrics: number;
  compliance: number;
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
}

// Quality improvement types
export interface QualityImprovement {
  improvementId: string;
  type: 'process' | 'technology' | 'training' | 'policy' | 'monitoring';
  category: 'accuracy' | 'relevance' | 'completeness' | 'clarity' | 'consistency' | 'timeliness' | 'general';
  description: string;
  justification: string;
  expectedBenefit: ImprovementBenefit;
  implementation: ImplementationPlan;
  metrics: SuccessMetrics;
  priority: number;
  status: 'proposed' | 'approved' | 'in-progress' | 'completed' | 'cancelled';
}

export interface ImprovementBenefit {
  qualityIncrease: number;
  costReduction?: number;
  riskReduction?: number;
  userSatisfaction?: number;
  efficiency?: number;
  compliance?: number;
}

export interface ImplementationPlan {
  phases: ImplementationPhase[];
  timeline: Date;
  resources: ResourceRequirement[];
  dependencies: string[];
  risks: ImplementationRisk[];
}

export interface ImplementationPhase {
  phaseId: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  deliverables: string[];
  milestones: Milestone[];
  status: 'planned' | 'active' | 'completed' | 'delayed';
}

export interface Milestone {
  milestoneId: string;
  name: string;
  date: Date;
  criteria: string[];
  status: 'pending' | 'achieved' | 'missed';
}

export interface ResourceRequirement {
  type: 'human' | 'technology' | 'financial' | 'infrastructure';
  description: string;
  quantity: number;
  duration: number;
  cost?: number;
}

export interface ImplementationRisk {
  riskId: string;
  description: string;
  probability: number;
  impact: number;
  mitigation: string;
  owner: string;
}

export interface SuccessMetrics {
  primary: MetricDefinition[];
  secondary: MetricDefinition[];
  baseline: Record<string, number>;
  targets: Record<string, number>;
  measurement: MeasurementPlan;
}

export interface MetricDefinition {
  name: string;
  description: string;
  unit: string;
  formula?: string;
  threshold: number;
  direction: 'increase' | 'decrease' | 'maintain';
}

export interface MeasurementPlan {
  frequency: 'daily' | 'weekly' | 'monthly';
  duration: number;
  method: string;
  automation: boolean;
  reporting: ReportingPlan;
}

export interface ReportingPlan {
  frequency: 'daily' | 'weekly' | 'monthly';
  format: 'dashboard' | 'report' | 'alert';
  recipients: string[];
  escalation: EscalationRule[];
}

export interface EscalationRule {
  condition: string;
  action: 'notify' | 'escalate' | 'auto-remediate';
  targets: string[];
  timeout: number;
}

// Enforcement types
export interface EnforcementResult {
  enforcementId: string;
  timestamp: Date;
  actions: EnforcementAction[];
  violations: QualityViolation[];
  remediation: RemediationResult[];
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
}

export interface EnforcementAction {
  actionId: string;
  type: 'warning' | 'correction' | 'suspension' | 'escalation';
  target: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  executed: Date;
  result: 'success' | 'failure' | 'partial';
  remediation?: RemediationResult;
}

export interface QualityViolation {
  violationId: string;
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  threshold: number;
  actualValue: number;
  source: string;
  detected: Date;
  resolved?: Date;
}

export interface RemediationResult {
  resultId: string;
  action: string;
  outcome: string;
  effectiveness: number;
  timeToResolve: number;
  cost?: number;
  followUp?: string[];
}

// Benchmarking types
export interface BenchmarkResult {
  benchmarkId: string;
  timestamp: Date;
  standards: IndustryStandard[];
  comparisons: BenchmarkComparison[];
  overallRanking: number;
  gaps: BenchmarkGap[];
  recommendations: BenchmarkRecommendation[];
}

export interface IndustryStandard {
  standardId: string;
  name: string;
  organization: string;
  version: string;
  domain: string;
  metrics: StandardMetric[];
  benchmarks: StandardBenchmark[];
}

export interface StandardMetric {
  metricId: string;
  name: string;
  description: string;
  unit: string;
  category: string;
  weight: number;
}

export interface StandardBenchmark {
  metricId: string;
  percentile25: number;
  percentile50: number;
  percentile75: number;
  percentile90: number;
  bestPractice: number;
  industryAverage: number;
}

export interface BenchmarkComparison {
  standardId: string;
  metricComparisons: MetricComparison[];
  overallScore: number;
  ranking: number;
  gap: number;
}

export interface MetricComparison {
  metricId: string;
  ourValue: number;
  industryAverage: number;
  bestPractice: number;
  percentileRanking: number;
  gap: number;
  status: 'leading' | 'meeting' | 'lagging' | 'poor';
}

export interface BenchmarkGap {
  gapId: string;
  metric: string;
  currentValue: number;
  targetValue: number;
  gap: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
}

export interface BenchmarkRecommendation {
  recommendationId: string;
  type: 'quick-win' | 'strategic' | 'foundational';
  description: string;
  rationale: string;
  expectedImpact: number;
  implementationEffort: number;
  timeframe: string;
  dependencies: string[];
}

// Configuration types
export interface QualityThresholds {
  accuracy: ThresholdRange;
  relevance: ThresholdRange;
  completeness: ThresholdRange;
  clarity: ThresholdRange;
  consistency: ThresholdRange;
  timeliness: ThresholdRange;
  overall: ThresholdRange;
}

export interface ThresholdRange {
  excellent: number;  // > excellent
  good: number;      // > good
  acceptable: number; // > acceptable
  poor: number;      // <= poor
}

export interface QualityConfig {
  monitoring: {
    interval: number;
    retentionPeriod: number;
    thresholds: QualityThresholds;
    alerting: AlertingConfig;
  };
  assessment: {
    enableRealTime: boolean;
    batchSize: number;
    timeout: number;
    retryAttempts: number;
  };
  compliance: {
    auditPeriod: number;
    standards: string[];
    automaticChecks: boolean;
    reportingFrequency: number;
  };
  analysis: {
    trendWindow: number;
    deviationWindow: number;
    forecastHorizon: number;
    confidenceThreshold: number;
  };
  improvements: {
    maxRecommendations: number;
    priorityThreshold: number;
    autoApproval: boolean;
    reviewPeriod: number;
  };
  enforcement: {
    autoEnforcement: boolean;
    escalationLevels: number;
    remediationTimeout: number;
    maxRetries: number;
  };
  benchmarking: {
    frequency: number;
    standards: string[];
    compareAgainst: string[];
    reportingLevel: string;
  };
  reporting: {
    period: number;
    distributionList: string[];
    format: string[];
    automation: boolean;
  };
  retention: {
    qualityScoresRetention: number;
    complianceHistoryRetention: number;
    alertRetention: number;
    reportRetention: number;
  };
}

export interface AlertingConfig {
  enableAlerts: boolean;
  channels: string[];
  severityLevels: string[];
  escalationMatrix: EscalationMatrix;
  suppressionRules: SuppressionRule[];
}

export interface EscalationMatrix {
  levels: EscalationLevel[];
  timeouts: number[];
  recipients: string[][];
}

export interface EscalationLevel {
  level: number;
  name: string;
  criteria: string;
  actions: string[];
  timeout: number;
}

export interface SuppressionRule {
  ruleId: string;
  condition: string;
  duration: number;
  reason: string;
  active: boolean;
}

// Reporting types
export interface QualityReport {
  reportId: string;
  timestamp: Date;
  period: {
    start: Date;
    end: Date;
  };
  summary: QualitySummary;
  trends: QualityTrends;
  compliance: ComplianceReport;
  improvements: QualityImprovement[];
  benchmarks: BenchmarkResult;
  alerts: QualityAlert[];
}

export interface QualitySummary {
  totalAssessments: number;
  averageQuality: QualityMetrics;
  qualityDistribution: QualityDistribution;
  topIssues: QualityIssue[];
  achievements: Achievement[];
  keyInsights: string[];
}

export interface QualityDistribution {
  excellent: number;
  good: number;
  acceptable: number;
  poor: number;
}

export interface Achievement {
  type: string;
  description: string;
  metric: string;
  improvement: number;
  date: Date;
}

export interface QualityAlert {
  alertId: string;
  type: 'threshold-breach' | 'trend-deviation' | 'compliance-violation' | 'system-issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  source: string;
  timestamp: Date;
  acknowledged: boolean;
  resolved: boolean;
  resolution?: AlertResolution;
}

export interface AlertResolution {
  resolvedBy: string;
  resolvedAt: Date;
  action: string;
  notes?: string;
}
