/**
 * @fileoverview Core health monitoring interfaces for governance agents
 * @version 1.0.0
 * @author TrustStream Health Monitoring System
 * @description Foundational TypeScript interfaces for comprehensive health monitoring,
 * auto-recovery, and performance analytics in the governance agent ecosystem.
 */

/**
 * Enumeration of metric types for comprehensive system monitoring
 */
export enum MetricType {
  CPU_USAGE = 'cpu_usage',
  MEMORY_USAGE = 'memory_usage',
  TASK_LATENCY = 'task_latency',
  ERROR_RATE = 'error_rate',
  THROUGHPUT = 'throughput',
  RESPONSE_TIME = 'response_time',
  QUEUE_LENGTH = 'queue_length',
  RESOURCE_UTILIZATION = 'resource_utilization'
}

/**
 * Enumeration of health status levels
 */
export enum HealthLevel {
  CRITICAL = 'critical',
  WARNING = 'warning',
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNKNOWN = 'unknown'
}

/**
 * Enumeration of alert severity levels
 */
export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Enumeration of recovery procedure types
 */
export enum RecoveryType {
  RESTART_AGENT = 'restart_agent',
  SCALE_RESOURCES = 'scale_resources',
  CLEAR_CACHE = 'clear_cache',
  RESET_CONNECTIONS = 'reset_connections',
  ROLLBACK_DEPLOYMENT = 'rollback_deployment',
  FAILOVER = 'failover',
  THROTTLE_REQUESTS = 'throttle_requests',
  CUSTOM_SCRIPT = 'custom_script'
}

/**
 * Interface for individual metric data points
 * Represents a single measurement collected from a governance agent or system component
 */
export interface IMetric {
  /** Unique identifier for the metric */
  id: string;
  
  /** Type of metric being measured */
  type: MetricType;
  
  /** Numerical value of the metric */
  value: number;
  
  /** Unit of measurement (e.g., 'percent', 'milliseconds', 'bytes') */
  unit: string;
  
  /** Timestamp when the metric was collected (ISO 8601 format) */
  timestamp: string;
  
  /** Identifier of the agent or component that generated this metric */
  agentId: string;
  
  /** Additional contextual metadata for the metric */
  metadata?: Record<string, any>;
  
  /** Optional tags for categorization and filtering */
  tags?: string[];
  
  /** Threshold values for this metric type */
  thresholds?: {
    warning: number;
    critical: number;
  };
}

/**
 * Interface for comprehensive health status representation
 * Provides a complete picture of an agent's or system's current health state
 */
export interface IHealthStatus {
  /** Unique identifier for the health status record */
  id: string;
  
  /** Identifier of the monitored agent or component */
  agentId: string;
  
  /** Overall health level assessment */
  level: HealthLevel;
  
  /** Numerical health score (0-100, where 100 is optimal health) */
  score: number;
  
  /** Timestamp of the health assessment (ISO 8601 format) */
  timestamp: string;
  
  /** Detailed breakdown of health metrics by category */
  metrics: {
    cpu: IMetric;
    memory: IMetric;
    latency: IMetric;
    errorRate: IMetric;
  };
  
  /** List of active issues or anomalies detected */
  issues: Array<{
    type: string;
    severity: AlertSeverity;
    description: string;
    firstDetected: string;
  }>;
  
  /** Predicted health trend for the next assessment period */
  predictedTrend?: {
    direction: 'improving' | 'stable' | 'declining';
    confidence: number;
    timeframe: string;
  };
  
  /** Performance recommendations based on current metrics */
  recommendations?: Array<{
    priority: 'low' | 'medium' | 'high';
    action: string;
    expectedImpact: string;
  }>;
  
  /** Duration since the last health check */
  timeSinceLastCheck: number;
  
  /** Additional contextual information */
  context?: Record<string, any>;
}

/**
 * Interface for intelligent alerting system
 * Manages notifications and escalations for health monitoring events
 */
export interface IAlert {
  /** Unique identifier for the alert */
  id: string;
  
  /** Type/category of the alert */
  type: string;
  
  /** Severity level of the alert */
  severity: AlertSeverity;
  
  /** Human-readable alert title */
  title: string;
  
  /** Detailed description of the alert condition */
  description: string;
  
  /** Identifier of the affected agent or component */
  agentId: string;
  
  /** Timestamp when the alert was first triggered (ISO 8601 format) */
  triggeredAt: string;
  
  /** Current status of the alert */
  status: 'active' | 'acknowledged' | 'resolved' | 'suppressed';
  
  /** The metric or condition that triggered this alert */
  triggerMetric: IMetric;
  
  /** Threshold that was breached to trigger the alert */
  threshold: {
    operator: '>' | '<' | '==' | '!=' | '>=' | '<=';
    value: number;
    duration?: number; // Time in seconds the condition must persist
  };
  
  /** Alert escalation configuration */
  escalation: {
    level: number;
    nextEscalationAt?: string;
    maxLevel: number;
    escalationIntervals: number[]; // Minutes between escalation levels
  };
  
  /** Notification channels and recipients */
  notifications: Array<{
    channel: 'email' | 'slack' | 'webhook' | 'sms';
    recipients: string[];
    sent: boolean;
    sentAt?: string;
  }>;
  
  /** Related alerts that may be connected to this issue */
  relatedAlerts?: string[];
  
  /** Automatic recovery procedures that were triggered */
  recoveryProcedures?: string[];
  
  /** Manual actions taken in response to this alert */
  actions?: Array<{
    action: string;
    performedBy: string;
    performedAt: string;
    result: string;
  }>;
  
  /** Additional metadata for alert correlation and analysis */
  metadata?: Record<string, any>;
}

/**
 * Interface for auto-recovery procedure definitions
 * Defines automated responses to specific health conditions and alert types
 */
export interface RecoveryProcedure {
  /** Unique identifier for the recovery procedure */
  id: string;
  
  /** Human-readable name for the procedure */
  name: string;
  
  /** Type of recovery action this procedure performs */
  type: RecoveryType;
  
  /** Detailed description of what the procedure does */
  description: string;
  
  /** Conditions that must be met to trigger this procedure */
  trigger: {
    /** Alert types that can trigger this procedure */
    alertTypes: string[];
    
    /** Minimum severity level required to trigger */
    minSeverity: AlertSeverity;
    
    /** Health level conditions that must be met */
    healthConditions?: Array<{
      metric: MetricType;
      operator: '>' | '<' | '==' | '!=' | '>=' | '<=';
      value: number;
    }>;
    
    /** Time-based conditions (e.g., only during business hours) */
    timeConstraints?: {
      allowedHours?: Array<{ start: string; end: string }>;
      allowedDays?: string[];
      timezone?: string;
    };
    
    /** Cooldown period between procedure executions (in seconds) */
    cooldownPeriod: number;
  };
  
  /** Sequence of steps to execute during recovery */
  steps: Array<{
    /** Order of execution (1-based) */
    order: number;
    
    /** Type of action to perform */
    action: 'command' | 'api_call' | 'script' | 'notification';
    
    /** Configuration specific to the action type */
    config: Record<string, any>;
    
    /** Maximum time to wait for step completion (seconds) */
    timeout: number;
    
    /** Whether to continue if this step fails */
    continueOnFailure: boolean;
    
    /** Rollback action if this step needs to be undone */
    rollback?: Record<string, any>;
  }>;
  
  /** Success criteria to determine if recovery was effective */
  successCriteria: Array<{
    metric: MetricType;
    operator: '>' | '<' | '==' | '!=' | '>=' | '<=';
    value: number;
    checkAfterSeconds: number;
  }>;
  
  /** Actions to take if recovery procedure fails */
  fallbackProcedures?: string[];
  
  /** Configuration for automatic rollback if recovery fails */
  rollbackConfig?: {
    enabled: boolean;
    timeoutSeconds: number;
    maxAttempts: number;
  };
  
  /** Execution history and statistics */
  statistics?: {
    totalExecutions: number;
    successRate: number;
    averageExecutionTime: number;
    lastExecuted?: string;
    lastResult?: 'success' | 'failure' | 'partial';
  };
  
  /** Whether this procedure is currently enabled */
  enabled: boolean;
  
  /** Priority level for procedure selection when multiple procedures match */
  priority: number;
  
  /** Additional metadata for procedure management */
  metadata?: Record<string, any>;
  
  /** Audit information */
  audit: {
    createdBy: string;
    createdAt: string;
    lastModifiedBy: string;
    lastModifiedAt: string;
    version: string;
  };
}

/**
 * Interface for health monitoring configuration
 * Defines system-wide settings for the health monitoring subsystem
 */
export interface IHealthMonitoringConfig {
  /** Global monitoring settings */
  global: {
    /** How often to collect metrics (in seconds) */
    metricsCollectionInterval: number;
    
    /** How often to perform health assessments (in seconds) */
    healthCheckInterval: number;
    
    /** How long to retain historical data (in days) */
    dataRetentionDays: number;
    
    /** Maximum number of concurrent health checks */
    maxConcurrentChecks: number;
  };
  
  /** Default thresholds for metric types */
  defaultThresholds: Record<MetricType, {
    warning: number;
    critical: number;
  }>;
  
  /** Alert configuration */
  alerting: {
    /** Whether alerting is enabled globally */
    enabled: boolean;
    
    /** Default escalation intervals (in minutes) */
    defaultEscalationIntervals: number[];
    
    /** Maximum number of alerts per agent per hour */
    rateLimits: Record<AlertSeverity, number>;
  };
  
  /** Auto-recovery configuration */
  autoRecovery: {
    /** Whether auto-recovery is enabled globally */
    enabled: boolean;
    
    /** Maximum number of recovery attempts per incident */
    maxRecoveryAttempts: number;
    
    /** Minimum time between recovery attempts (in seconds) */
    recoveryBackoffTime: number;
  };
}

/**
 * Interface for predictive analytics configuration and results
 * Supports forecasting and anomaly detection capabilities
 */
export interface IPredictiveAnalytics {
  /** Configuration for prediction models */
  config: {
    /** Time window for historical data analysis (in hours) */
    lookbackHours: number;
    
    /** Prediction horizon (in hours) */
    forecastHours: number;
    
    /** Minimum confidence threshold for predictions */
    minConfidence: number;
    
    /** Models enabled for different metric types */
    enabledModels: Record<MetricType, string[]>;
  };
  
  /** Current prediction results */
  predictions: Array<{
    /** Metric type being predicted */
    metricType: MetricType;
    
    /** Agent ID for the prediction */
    agentId: string;
    
    /** Predicted values with timestamps */
    forecast: Array<{
      timestamp: string;
      predictedValue: number;
      confidenceInterval: {
        lower: number;
        upper: number;
      };
    }>;
    
    /** Confidence score for the entire prediction */
    confidence: number;
    
    /** Model used for this prediction */
    model: string;
    
    /** When the prediction was generated */
    generatedAt: string;
  }>;
  
  /** Detected anomalies */
  anomalies: Array<{
    /** Metric that exhibited anomalous behavior */
    metric: IMetric;
    
    /** Type of anomaly detected */
    type: 'spike' | 'drop' | 'trend_change' | 'pattern_break';
    
    /** Severity of the anomaly */
    severity: AlertSeverity;
    
    /** Confidence that this is a true anomaly */
    confidence: number;
    
    /** Expected value based on historical patterns */
    expectedValue: number;
    
    /** Description of the anomaly */
    description: string;
  }>;
}