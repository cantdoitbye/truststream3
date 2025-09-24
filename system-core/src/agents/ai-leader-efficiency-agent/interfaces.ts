/**
 * AI Leader Efficiency Agent - Type Definitions
 * 
 * Defines interfaces and types for the Efficiency Agent following
 * the orchestration-first architecture patterns.
 */

// Base interfaces from architecture
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

// Efficiency Agent specific interfaces
export interface EfficiencyAgentInterface {
  // Performance monitoring
  monitorSystemPerformance(): Promise<PerformanceMetrics>;
  identifyBottlenecks(): Promise<BottleneckAnalysis>;
  
  // Optimization actions
  optimizeResourceAllocation(): Promise<OptimizationResult>;
  accelerateLearning(targetAgent: string): Promise<LearningAcceleration>;
  
  // Predictive analytics
  predictPerformanceTrends(): Promise<PerformanceForecast>;
  recommendPreventiveMeasures(): Promise<PreventiveMeasure[]>;
  
  // Governance coordination
  coordinateEfficiencyGovernance(): Promise<GovernanceDecision>;
  reportEfficiencyMetrics(): Promise<EfficiencyReport>;
}

// Performance monitoring types
export interface PerformanceMetrics {
  timestamp: Date;
  responseTime: number;
  throughput: number;
  resourceUtilization: ResourceUtilization;
  errorRate: number;
  availability: number;
  agentSpecific: {
    efficiencyScore: number;
    optimizationOpportunities: OptimizationOpportunity[];
  };
}

export interface ResourceUtilization {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  database: {
    connections: number;
    queryTime: number;
    lockTime: number;
  };
}

export interface OptimizationOpportunity {
  type: 'cpu' | 'memory' | 'disk' | 'network' | 'database' | 'algorithm';
  description: string;
  currentValue: number;
  targetValue: number;
  estimatedImpact: number;
  complexity: 'low' | 'medium' | 'high';
  priority: number;
}

// Bottleneck analysis types
export interface BottleneckAnalysis {
  timestamp: Date;
  bottlenecks: Bottleneck[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendations: Recommendation[];
  estimatedImpact: ImpactEstimation;
}

export interface Bottleneck {
  id: string;
  type: 'cpu' | 'memory' | 'disk' | 'network' | 'database' | 'algorithm';
  location: string;
  description: string;
  severity: number;
  metrics: {
    current: number;
    threshold: number;
    baseline: number;
  };
  timeDetected: Date;
  frequency: number;
}

export interface Recommendation {
  id: string;
  type: 'immediate' | 'short-term' | 'long-term';
  action: string;
  description: string;
  estimatedEffort: number;
  estimatedImpact: number;
  priority: number;
  dependencies: string[];
  risks: Risk[];
}

export interface Risk {
  type: 'performance' | 'stability' | 'security' | 'compliance';
  description: string;
  probability: number;
  impact: number;
  mitigation: string;
}

export interface ImpactEstimation {
  performanceImprovement: number;
  costReduction: number;
  resourceSavings: ResourceSavings;
  timeToImplementation: number;
  confidenceLevel: number;
}

export interface ResourceSavings {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  cost: number;
}

// Optimization types
export interface OptimizationResult {
  optimizationId: string;
  timestamp: Date;
  type: 'resource-allocation' | 'algorithm-optimization' | 'infrastructure-scaling';
  actions: OptimizationAction[];
  results: {
    before: PerformanceMetrics;
    after: PerformanceMetrics;
    improvement: number;
  };
  status: 'planned' | 'in-progress' | 'completed' | 'failed' | 'rolled-back';
  metadata: {
    executionTime: number;
    resourcesUsed: ResourceUtilization;
    rollbackPlan: string;
  };
}

export interface OptimizationAction {
  actionId: string;
  type: string;
  description: string;
  target: string;
  parameters: Record<string, any>;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  result?: any;
}

// Learning acceleration types
export interface LearningAcceleration {
  targetAgent: string;
  accelerationType: 'performance-based' | 'data-driven' | 'algorithm-optimization';
  optimizations: LearningOptimization[];
  expectedImprovement: number;
  timestamp: Date;
}

export interface LearningOptimization {
  type: 'model-tuning' | 'data-preprocessing' | 'feature-engineering' | 'architecture-optimization';
  description: string;
  parameters: Record<string, any>;
  expectedImpact: number;
  implementationEffort: number;
}

// Predictive analytics types
export interface PerformanceForecast {
  forecastId: string;
  timestamp: Date;
  timeHorizon: number; // in hours
  predictions: PerformancePrediction[];
  confidence: number;
  methodology: string;
  assumptions: string[];
}

export interface PerformancePrediction {
  metric: string;
  currentValue: number;
  predictedValue: number;
  trend: 'improving' | 'stable' | 'degrading';
  confidence: number;
  timeToThreshold?: number;
  factors: PredictionFactor[];
}

export interface PredictionFactor {
  factor: string;
  influence: number;
  description: string;
}

export interface PreventiveMeasure {
  measureId: string;
  type: 'scaling' | 'optimization' | 'maintenance' | 'monitoring';
  description: string;
  trigger: {
    metric: string;
    threshold: number;
    condition: 'above' | 'below' | 'equals';
  };
  action: {
    type: string;
    parameters: Record<string, any>;
    rollbackPlan: string;
  };
  priority: number;
  estimatedImpact: number;
  implementationTime: number;
}

// Governance types
export interface GovernanceDecision {
  decisionId: string;
  agentId: string;
  decisionType: 'efficiency-optimization' | 'resource-reallocation' | 'performance-scaling';
  context: {
    metrics: PerformanceMetrics;
    bottlenecks: BottleneckAnalysis;
    forecast: PerformanceForecast;
  };
  decision: {
    action: string;
    parameters: Record<string, any>;
    justification: string;
  };
  reasoning: string;
  timestamp: Date;
  requiresConsensus: boolean;
  consensusResult?: ConsensusResult;
  executionStatus?: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';
}

export interface ConsensusResult {
  proposalId: string;
  votes: Vote[];
  result: 'approved' | 'rejected' | 'pending';
  timestamp: Date;
  threshold: number;
  actualVotes: number;
}

export interface Vote {
  agentId: string;
  vote: 'approve' | 'reject' | 'abstain';
  reasoning?: string;
  timestamp: Date;
}

// Reporting types
export interface EfficiencyReport {
  reportId: string;
  agentId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    averageResponseTime: number;
    peakThroughput: number;
    resourceEfficiency: number;
    optimizationCount: number;
    performanceImprovements: number;
  };
  optimizations: OptimizationResult[];
  trends: PerformanceForecast;
  recommendations: PreventiveMeasure[];
  alerts: Alert[];
  timestamp: Date;
}

export interface Alert {
  alertId: string;
  type: 'performance' | 'resource' | 'error' | 'availability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolution?: string;
}

// Configuration types specific to Efficiency Agent
export interface EfficiencyConfig {
  monitoring: {
    interval: number;
    retentionPeriod: number;
    thresholds: PerformanceThresholds;
  };
  optimization: {
    autoOptimization: boolean;
    optimizationInterval: number;
    maxConcurrentOptimizations: number;
    rollbackThreshold: number;
  };
  prediction: {
    modelType: 'linear' | 'polynomial' | 'neural-network';
    trainingDataWindow: number;
    predictionHorizon: number;
    confidenceThreshold: number;
  };
  governance: {
    consensusThreshold: number;
    decisionTimeout: number;
    escalationRules: EscalationRule[];
  };
  reporting: {
    period: number;
    historyLimit: number;
    distributionList: string[];
  };
  retention: {
    metricsRetention: number;
    optimizationHistoryRetention: number;
    alertRetention: number;
  };
}

export interface PerformanceThresholds {
  responseTime: {
    warning: number;
    critical: number;
  };
  throughput: {
    minimum: number;
    target: number;
  };
  errorRate: {
    warning: number;
    critical: number;
  };
  resourceUtilization: {
    cpu: { warning: number; critical: number; };
    memory: { warning: number; critical: number; };
    disk: { warning: number; critical: number; };
  };
}

export interface EscalationRule {
  condition: string;
  action: 'notify' | 'escalate' | 'auto-resolve';
  targets: string[];
  timeout: number;
}

// Event types for inter-agent communication
export interface EfficiencyEvent {
  eventId: string;
  eventType: 'performance-alert' | 'optimization-completed' | 'forecast-updated' | 'bottleneck-detected';
  source: string;
  timestamp: Date;
  data: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  targets?: string[];
}

// Analysis window types
export interface AnalysisWindow {
  start: Date;
  end: Date;
  size: number;
  granularity: 'minute' | 'hour' | 'day';
}

// Machine learning model types
export interface MLModelConfig {
  modelType: string;
  hyperparameters: Record<string, any>;
  trainingData: {
    features: string[];
    target: string;
    windowSize: number;
  };
  performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
}
