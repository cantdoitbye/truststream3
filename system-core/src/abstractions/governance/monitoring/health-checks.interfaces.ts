/**
 * @fileoverview Automated health checks and intelligent alerting interfaces
 * @version 1.0.0
 * @author TrustStream Health Monitoring System
 * @description Comprehensive interfaces for automated health monitoring, intelligent alerting,
 * and proactive issue detection in the governance agent ecosystem.
 */

import { IMetric, MetricType, AlertSeverity, HealthLevel, IAlert } from './health.interfaces';
import { IPredictionResult } from './predictive.interfaces';

/**
 * Enumeration of health check types
 */
export enum HealthCheckType {
  BASIC_CONNECTIVITY = 'basic_connectivity',
  PERFORMANCE_METRICS = 'performance_metrics',
  RESOURCE_UTILIZATION = 'resource_utilization',
  FUNCTIONAL_TESTING = 'functional_testing',
  DEPENDENCY_VERIFICATION = 'dependency_verification',
  SECURITY_VALIDATION = 'security_validation',
  DATA_INTEGRITY = 'data_integrity',
  CUSTOM_SCRIPT = 'custom_script',
  SYNTHETIC_TRANSACTION = 'synthetic_transaction',
  HEARTBEAT = 'heartbeat'
}

/**
 * Enumeration of check execution strategies
 */
export enum CheckExecutionStrategy {
  IMMEDIATE = 'immediate',
  SCHEDULED = 'scheduled',
  TRIGGERED = 'triggered',
  CONTINUOUS = 'continuous',
  ON_DEMAND = 'on_demand',
  ADAPTIVE = 'adaptive'
}

/**
 * Interface for health check definition and configuration
 * Defines individual health checks with their execution parameters
 */
export interface IHealthCheck {
  /** Unique identifier for the health check */
  id: string;
  
  /** Human-readable name for the check */
  name: string;
  
  /** Type of health check */
  type: HealthCheckType;
  
  /** Detailed description of what this check validates */
  description: string;
  
  /** Agent or component this check applies to */
  target: {
    /** Agent ID to check */
    agentId: string;
    
    /** Specific component within the agent */
    component?: string;
    
    /** Service endpoint or interface to check */
    endpoint?: string;
  };
  
  /** Check execution configuration */
  execution: {
    /** Execution strategy */
    strategy: CheckExecutionStrategy;
    
    /** Schedule configuration (for scheduled checks) */
    schedule?: {
      /** Cron expression for scheduling */
      cronExpression: string;
      
      /** Time zone for schedule */
      timezone: string;
      
      /** Whether to run immediately on start */
      runOnStart: boolean;
    };
    
    /** Trigger configuration (for triggered checks) */
    triggers?: Array<{
      /** Event type that triggers the check */
      eventType: string;
      
      /** Conditions that must be met */
      conditions: Record<string, any>;
      
      /** Delay before executing after trigger */
      delaySeconds?: number;
    }>;
    
    /** Timeout for check execution */
    timeoutSeconds: number;
    
    /** Retry configuration for failed checks */
    retry: {
      maxAttempts: number;
      backoffStrategy: 'linear' | 'exponential' | 'fixed';
      baseDelaySeconds: number;
      maxDelaySeconds: number;
    };
    
    /** Parallel execution settings */
    concurrency: {
      /** Maximum concurrent executions of this check */
      maxConcurrent: number;
      
      /** Whether to queue or skip if max concurrent reached */
      queueWhenBusy: boolean;
    };
  };
  
  /** Check implementation details */
  implementation: {
    /** Check method */
    method: 'http_request' | 'tcp_connect' | 'script_execution' | 'metric_validation' | 'custom';
    
    /** Method-specific configuration */
    config: Record<string, any>;
    
    /** Expected response or result */
    expectedResult?: {
      /** Expected status code or return value */
      status?: any;
      
      /** Expected response content patterns */
      contentPatterns?: string[];
      
      /** Performance thresholds */
      performanceThresholds?: {
        maxResponseTime: number;
        minThroughput?: number;
      };
    };
    
    /** Validation rules for check results */
    validation: Array<{
      /** Field to validate */
      field: string;
      
      /** Validation operator */
      operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'regex';
      
      /** Expected value */
      value: any;
      
      /** Severity if validation fails */
      severity: AlertSeverity;
      
      /** Custom error message */
      errorMessage?: string;
    }>;
  };
  
  /** Result interpretation and scoring */
  scoring: {
    /** How to calculate the health score from this check */
    scoreCalculation: 'binary' | 'weighted' | 'performance_based' | 'custom';
    
    /** Weight of this check in overall health score */
    weight: number;
    
    /** Performance scoring configuration */
    performanceScoring?: {
      /** Optimal performance threshold */
      optimal: number;
      
      /** Acceptable performance threshold */
      acceptable: number;
      
      /** Critical performance threshold */
      critical: number;
    };
    
    /** Custom scoring function configuration */
    customScoring?: {
      /** Algorithm to use */
      algorithm: string;
      
      /** Algorithm parameters */
      parameters: Record<string, any>;
    };
  };
  
  /** Alerting configuration for this check */
  alerting: {
    /** Whether to generate alerts from this check */
    enabled: boolean;
    
    /** Alert severity mapping */
    severityMapping: Record<string, AlertSeverity>;
    
    /** Alert suppression rules */
    suppression: {
      /** Minimum time between alerts for the same issue */
      minIntervalMinutes: number;
      
      /** Maximum number of alerts per time period */
      maxAlertsPerHour: number;
      
      /** Conditions for alert suppression */
      suppressionConditions?: Array<{
        condition: string;
        duration: number;
      }>;
    };
    
    /** Alert escalation rules */
    escalation: {
      /** Escalation levels and timing */
      levels: Array<{
        level: number;
        delayMinutes: number;
        recipients: string[];
        channels: string[];
      }>;
      
      /** Auto-escalation conditions */
      autoEscalation: {
        enabled: boolean;
        conditions: string[];
      };
    };
  };
  
  /** Check metadata and status */
  metadata: {
    /** Check category for organization */
    category: string;
    
    /** Tags for filtering and grouping */
    tags: string[];
    
    /** Check priority level */
    priority: 'low' | 'medium' | 'high' | 'critical';
    
    /** Whether this check is currently enabled */
    enabled: boolean;
    
    /** Check ownership information */
    owner: {
      team: string;
      contact: string;
    };
    
    /** Documentation links */
    documentation?: {
      runbook?: string;
      troubleshooting?: string;
      escalation?: string;
    };
  };
  
  /** Execution history and statistics */
  statistics: {
    /** Total executions */
    totalExecutions: number;
    
    /** Success rate */
    successRate: number;
    
    /** Average execution time */
    averageExecutionTime: number;
    
    /** Last execution details */
    lastExecution?: {
      timestamp: string;
      status: 'success' | 'failure' | 'timeout' | 'error';
      duration: number;
      result?: any;
    };
    
    /** Performance trends */
    trends: {
      /** Success rate trend */
      successRateTrend: 'improving' | 'stable' | 'declining';
      
      /** Performance trend */
      performanceTrend: 'improving' | 'stable' | 'declining';
      
      /** Recent failure patterns */
      failurePatterns?: Array<{
        pattern: string;
        frequency: number;
        lastOccurrence: string;
      }>;
    };
  };
}

/**
 * Interface for health check execution results
 * Contains detailed results from health check executions
 */
export interface IHealthCheckResult {
  /** Unique identifier for this execution result */
  id: string;
  
  /** Health check that was executed */
  checkId: string;
  
  /** Execution metadata */
  execution: {
    /** When the check started */
    startedAt: string;
    
    /** When the check completed */
    completedAt: string;
    
    /** Total execution duration */
    durationMs: number;
    
    /** Execution status */
    status: 'success' | 'failure' | 'timeout' | 'error' | 'cancelled';
    
    /** Execution attempt number (for retries) */
    attemptNumber: number;
    
    /** Maximum attempts allowed */
    maxAttempts: number;
  };
  
  /** Check result details */
  result: {
    /** Overall result status */
    passed: boolean;
    
    /** Health score from this check (0-100) */
    healthScore: number;
    
    /** Raw result data from the check */
    rawData: Record<string, any>;
    
    /** Performance metrics collected during check */
    performanceMetrics: {
      responseTime?: number;
      throughput?: number;
      errorCount?: number;
      resourceUsage?: Record<string, number>;
    };
    
    /** Validation results */
    validationResults: Array<{
      field: string;
      expected: any;
      actual: any;
      passed: boolean;
      message?: string;
    }>;
  };
  
  /** Issues and findings */
  findings: Array<{
    /** Type of finding */
    type: 'error' | 'warning' | 'info' | 'anomaly';
    
    /** Severity level */
    severity: AlertSeverity;
    
    /** Finding description */
    description: string;
    
    /** Specific component or area affected */
    component?: string;
    
    /** Recommended actions */
    recommendations?: string[];
    
    /** Additional context */
    context?: Record<string, any>;
  }>;
  
  /** Comparison with previous results */
  comparison?: {
    /** Previous execution result */
    previousResult: {
      id: string;
      timestamp: string;
      healthScore: number;
      status: string;
    };
    
    /** Change indicators */
    changes: {
      /** Health score change */
      healthScoreChange: number;
      
      /** Performance change */
      performanceChange: number;
      
      /** New issues detected */
      newIssues: number;
      
      /** Resolved issues */
      resolvedIssues: number;
    };
    
    /** Trend analysis */
    trends: {
      /** Short-term trend (last few executions) */
      shortTerm: 'improving' | 'stable' | 'declining';
      
      /** Long-term trend (last day/week) */
      longTerm: 'improving' | 'stable' | 'declining';
    };
  };
  
  /** Actions triggered by this result */
  triggeredActions: Array<{
    /** Type of action triggered */
    actionType: 'alert' | 'recovery' | 'notification' | 'escalation';
    
    /** Action identifier */
    actionId: string;
    
    /** When the action was triggered */
    triggeredAt: string;
    
    /** Action status */
    status: 'pending' | 'completed' | 'failed';
  }>;
  
  /** Additional result metadata */
  metadata: {
    /** Check configuration version at execution time */
    checkVersion: string;
    
    /** Environment information */
    environment: Record<string, string>;
    
    /** Execution context */
    executionContext?: Record<string, any>;
  };
}

/**
 * Interface for intelligent alerting engine
 * Manages smart alert generation, correlation, and notification
 */
export interface IIntelligentAlertingEngine {
  /** Engine identifier */
  id: string;
  
  /** Engine configuration */
  config: {
    /** Alert correlation settings */
    correlation: {
      /** Enable alert correlation */
      enabled: boolean;
      
      /** Time window for correlating alerts */
      correlationWindow: number; // minutes
      
      /** Correlation algorithms to use */
      algorithms: Array<{
        name: string;
        weight: number;
        parameters: Record<string, any>;
      }>;
      
      /** Minimum correlation score to group alerts */
      minCorrelationScore: number;
    };
    
    /** Alert prioritization */
    prioritization: {
      /** Factors used for priority calculation */
      factors: Array<{
        factor: 'severity' | 'impact' | 'urgency' | 'history' | 'prediction' | 'business_value';
        weight: number;
      }>;
      
      /** Business impact scoring */
      businessImpact: {
        /** Service criticality scores */
        serviceCriticality: Record<string, number>;
        
        /** Time-based impact modifiers */
        timeModifiers: Array<{
          timeRange: string;
          modifier: number;
        }>;
      };
    };
    
    /** Alert suppression and deduplication */
    suppression: {
      /** Enable smart suppression */
      enabled: boolean;
      
      /** Suppression strategies */
      strategies: Array<{
        name: 'duplicate' | 'flapping' | 'storm' | 'maintenance' | 'dependency';
        enabled: boolean;
        parameters: Record<string, any>;
      }>;
      
      /** Maximum alerts per source per time period */
      rateLimits: Record<string, {
        maxAlerts: number;
        timeWindowMinutes: number;
      }>;
    };
    
    /** Notification routing */
    routing: {
      /** Default notification channels */
      defaultChannels: string[];
      
      /** Routing rules based on alert properties */
      rules: Array<{
        name: string;
        conditions: Array<{
          field: string;
          operator: string;
          value: any;
        }>;
        channels: string[];
        recipients: string[];
        priority: number;
      }>;
      
      /** Escalation matrix */
      escalationMatrix: Array<{
        level: number;
        delayMinutes: number;
        channels: string[];
        recipients: string[];
        conditions?: string[];
      }>;
    };
  };
  
  /** Current engine state */
  state: {
    /** Engine operational status */
    status: 'active' | 'degraded' | 'error' | 'maintenance';
    
    /** Currently active alerts */
    activeAlerts: number;
    
    /** Suppressed alerts */
    suppressedAlerts: number;
    
    /** Alerts in escalation */
    escalatingAlerts: number;
    
    /** Processing queue status */
    queueStatus: {
      pending: number;
      processing: number;
      failed: number;
    };
  };
  
  /** Alert processing metrics */
  metrics: {
    /** Processing performance */
    performance: {
      /** Average alert processing time */
      averageProcessingTime: number;
      
      /** Alert throughput (alerts per minute) */
      throughput: number;
      
      /** Processing latency percentiles */
      latencyPercentiles: Record<string, number>;
    };
    
    /** Alert quality metrics */
    quality: {
      /** True positive rate */
      truePositiveRate: number;
      
      /** False positive rate */
      falsePositiveRate: number;
      
      /** Alert resolution time */
      averageResolutionTime: number;
      
      /** Correlation accuracy */
      correlationAccuracy: number;
    };
    
    /** Notification delivery metrics */
    delivery: {
      /** Successful deliveries */
      successfulDeliveries: number;
      
      /** Failed deliveries */
      failedDeliveries: number;
      
      /** Average delivery time */
      averageDeliveryTime: number;
      
      /** Delivery success rate by channel */
      successRateByChannel: Record<string, number>;
    };
  };
  
  /** Alert correlation results */
  correlations: Array<{
    /** Correlation group identifier */
    groupId: string;
    
    /** Alerts in this correlation group */
    alertIds: string[];
    
    /** Correlation confidence score */
    confidenceScore: number;
    
    /** Root cause analysis */
    rootCause?: {
      /** Identified root cause */
      cause: string;
      
      /** Confidence in root cause identification */
      confidence: number;
      
      /** Contributing factors */
      factors: Array<{
        factor: string;
        impact: number;
      }>;
    };
    
    /** Correlation metadata */
    metadata: {
      /** When correlation was detected */
      detectedAt: string;
      
      /** Correlation algorithm used */
      algorithm: string;
      
      /** Additional correlation data */
      data?: Record<string, any>;
    };
  }>;
}

/**
 * Interface for adaptive health monitoring
 * Implements machine learning-driven adaptive monitoring strategies
 */
export interface IAdaptiveHealthMonitoring {
  /** Adaptive monitoring configuration */
  config: {
    /** Learning algorithms to use */
    algorithms: Array<{
      name: 'reinforcement_learning' | 'online_learning' | 'feedback_learning';
      enabled: boolean;
      parameters: Record<string, any>;
    }>;
    
    /** Adaptation triggers */
    adaptationTriggers: {
      /** Performance-based adaptation */
      performance: {
        /** Minimum accuracy threshold for adaptation */
        minAccuracyThreshold: number;
        
        /** Evaluation window for performance assessment */
        evaluationWindow: number; // hours
      };
      
      /** Time-based adaptation */
      temporal: {
        /** Regular adaptation interval */
        adaptationInterval: number; // hours
        
        /** Force adaptation regardless of performance */
        forceAdaptation: boolean;
      };
      
      /** Event-driven adaptation */
      events: Array<{
        eventType: string;
        adaptationStrength: number; // 0-1
      }>;
    };
    
    /** Adaptation scope */
    scope: {
      /** What can be adapted */
      adaptableComponents: Array<'thresholds' | 'schedules' | 'checks' | 'alerts' | 'priorities'>;
      
      /** Constraints on adaptation */
      constraints: {
        /** Maximum change per adaptation cycle */
        maxChangePerCycle: number;
        
        /** Minimum time between adaptations */
        minTimeBetweenAdaptations: number; // minutes
        
        /** Safety bounds for critical parameters */
        safetyBounds: Record<string, { min: number; max: number }>;
      };
    };
  };
  
  /** Current adaptation state */
  adaptationState: {
    /** Learning model state */
    modelState: Record<string, any>;
    
    /** Recent adaptations made */
    recentAdaptations: Array<{
      timestamp: string;
      component: string;
      change: string;
      reason: string;
      impact: string;
    }>;
    
    /** Adaptation performance */
    performance: {
      /** Accuracy improvement from adaptations */
      accuracyImprovement: number;
      
      /** Alert noise reduction */
      noiseReduction: number;
      
      /** Detection sensitivity improvement */
      sensitivityImprovement: number;
    };
    
    /** Current learning phase */
    learningPhase: 'initialization' | 'exploration' | 'exploitation' | 'refinement';
  };
  
  /** Feedback integration */
  feedback: {
    /** Human feedback on alerts and detections */
    humanFeedback: Array<{
      alertId: string;
      feedback: 'true_positive' | 'false_positive' | 'not_actionable' | 'too_late';
      timestamp: string;
      providedBy: string;
      confidence: number;
    }>;
    
    /** System feedback from recovery actions */
    systemFeedback: Array<{
      actionId: string;
      outcome: 'successful' | 'failed' | 'partial';
      effectiveness: number; // 0-1
      timestamp: string;
    }>;
    
    /** Feedback processing status */
    processingStatus: {
      /** Pending feedback items */
      pendingItems: number;
      
      /** Last processing timestamp */
      lastProcessed: string;
      
      /** Feedback integration success rate */
      integrationSuccessRate: number;
    };
  };
}