/**
 * @fileoverview Auto-recovery system interfaces for governance agents
 * @version 1.0.0
 * @author TrustStream Health Monitoring System
 * @description Comprehensive interfaces for automated recovery procedures, trigger systems,
 * and self-healing capabilities in the governance agent ecosystem.
 */

import { IMetric, MetricType, AlertSeverity, HealthLevel, RecoveryProcedure, RecoveryType } from './health.interfaces';
import { IAlert } from './health.interfaces';
import { IHealthCheckResult } from './health-checks.interfaces';

/**
 * Enumeration of recovery execution states
 */
export enum RecoveryExecutionState {
  PENDING = 'pending',
  EVALUATING = 'evaluating',
  APPROVED = 'approved',
  EXECUTING = 'executing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  ROLLING_BACK = 'rolling_back',
  ROLLED_BACK = 'rolled_back'
}

/**
 * Enumeration of recovery trigger types
 */
export enum RecoveryTriggerType {
  METRIC_THRESHOLD = 'metric_threshold',
  HEALTH_DEGRADATION = 'health_degradation',
  ALERT_SEVERITY = 'alert_severity',
  ERROR_PATTERN = 'error_pattern',
  PERFORMANCE_ANOMALY = 'performance_anomaly',
  DEPENDENCY_FAILURE = 'dependency_failure',
  RESOURCE_EXHAUSTION = 'resource_exhaustion',
  CUSTOM_CONDITION = 'custom_condition',
  MANUAL_TRIGGER = 'manual_trigger',
  SCHEDULED = 'scheduled'
}

/**
 * Interface for recovery trigger definition and configuration
 * Defines conditions that initiate automated recovery procedures
 */
export interface IRecoveryTrigger {
  /** Unique identifier for the trigger */
  id: string;
  
  /** Human-readable name for the trigger */
  name: string;
  
  /** Type of recovery trigger */
  type: RecoveryTriggerType;
  
  /** Detailed description of the trigger condition */
  description: string;
  
  /** Trigger condition configuration */
  condition: {
    /** Primary condition that must be met */
    primary: {
      /** Source of the condition (metric, alert, health check, etc.) */
      source: 'metric' | 'alert' | 'health_check' | 'prediction' | 'log' | 'external';
      
      /** Specific parameters for the condition */
      parameters: Record<string, any>;
      
      /** Evaluation criteria */
      evaluation: {
        /** Comparison operator */
        operator: '>' | '<' | '==' | '!=' | '>=' | '<=' | 'contains' | 'regex' | 'threshold_breach';
        
        /** Threshold or expected value */
        value: any;
        
        /** Duration the condition must persist (seconds) */
        duration: number;
        
        /** Number of consecutive evaluations that must match */
        consecutiveCount?: number;
      };
    };
    
    /** Additional conditions that must be met (AND logic) */
    additional?: Array<{
      source: string;
      parameters: Record<string, any>;
      evaluation: {
        operator: string;
        value: any;
        duration?: number;
      };
    }>;
    
    /** Exclusion conditions that prevent trigger activation */
    exclusions?: Array<{
      source: string;
      parameters: Record<string, any>;
      evaluation: {
        operator: string;
        value: any;
      };
    }>;
    
    /** Time-based constraints */
    timeConstraints?: {
      /** Allowed time windows */
      allowedWindows: Array<{
        startTime: string; // HH:MM format
        endTime: string;
        daysOfWeek: string[];
      }>;
      
      /** Time zone for scheduling */
      timezone: string;
      
      /** Blackout periods where trigger is disabled */
      blackoutPeriods?: Array<{
        start: string; // ISO 8601
        end: string;
        reason: string;
      }>;
    };
  };
  
  /** Target configuration */
  target: {
    /** Agent IDs that this trigger applies to */
    agentIds: string[];
    
    /** Specific components within agents */
    components?: string[];
    
    /** Scope of the trigger */
    scope: 'agent' | 'component' | 'system' | 'cluster';
  };
  
  /** Recovery procedures to execute when triggered */
  recoveryProcedures: Array<{
    /** Recovery procedure identifier */
    procedureId: string;
    
    /** Execution priority (lower number = higher priority) */
    priority: number;
    
    /** Whether to execute in parallel or sequence */
    executionMode: 'parallel' | 'sequential';
    
    /** Conditions for executing this specific procedure */
    executionConditions?: Array<{
      condition: string;
      value: any;
    }>;
    
    /** Procedure-specific configuration overrides */
    configOverrides?: Record<string, any>;
  }>;
  
  /** Trigger management settings */
  management: {
    /** Whether the trigger is currently enabled */
    enabled: boolean;
    
    /** Maximum number of activations per time period */
    rateLimiting: {
      maxActivations: number;
      timeWindowMinutes: number;
      resetOnSuccess: boolean;
    };
    
    /** Cooldown period between activations */
    cooldown: {
      duration: number; // seconds
      strategy: 'fixed' | 'exponential' | 'adaptive';
    };
    
    /** Auto-disable conditions */
    autoDisable: {
      /** Disable after consecutive failures */
      afterConsecutiveFailures: number;
      
      /** Disable after total failure count */
      afterTotalFailures?: number;
      
      /** Re-enable conditions */
      reEnableConditions?: Array<{
        condition: string;
        value: any;
      }>;
    };
  };
  
  /** Trigger metadata and tracking */
  metadata: {
    /** Trigger category */
    category: string;
    
    /** Priority level */
    priority: 'low' | 'medium' | 'high' | 'critical';
    
    /** Tags for organization */
    tags: string[];
    
    /** Ownership information */
    owner: {
      team: string;
      contact: string;
    };
    
    /** Documentation links */
    documentation?: {
      description?: string;
      troubleshooting?: string;
      escalation?: string;
    };
    
    /** Audit information */
    audit: {
      createdBy: string;
      createdAt: string;
      lastModifiedBy: string;
      lastModifiedAt: string;
      version: string;
    };
  };
  
  /** Trigger execution statistics */
  statistics: {
    /** Total number of activations */
    totalActivations: number;
    
    /** Successful recovery rate */
    successRate: number;
    
    /** Average recovery time */
    averageRecoveryTime: number;
    
    /** Last activation details */
    lastActivation?: {
      timestamp: string;
      success: boolean;
      duration: number;
      proceduresExecuted: number;
    };
    
    /** Performance trends */
    trends: {
      /** Activation frequency trend */
      activationTrend: 'increasing' | 'stable' | 'decreasing';
      
      /** Success rate trend */
      successTrend: 'improving' | 'stable' | 'declining';
      
      /** Common failure patterns */
      failurePatterns: Array<{
        pattern: string;
        frequency: number;
        lastOccurrence: string;
      }>;
    };
  };
}

/**
 * Interface for recovery execution engine
 * Manages the execution of recovery procedures and coordination
 */
export interface IRecoveryExecutionEngine {
  /** Engine identifier */
  id: string;
  
  /** Engine configuration */
  config: {
    /** Execution management */
    execution: {
      /** Maximum concurrent recovery executions */
      maxConcurrentExecutions: number;
      
      /** Default timeout for recovery procedures */
      defaultTimeoutMinutes: number;
      
      /** Resource allocation for recovery tasks */
      resourceAllocation: {
        cpuLimit: number;
        memoryLimit: number;
        networkBandwidth?: number;
      };
      
      /** Execution environment settings */
      environment: {
        /** Isolation level for recovery execution */
        isolation: 'none' | 'sandbox' | 'container' | 'vm';
        
        /** Security context */
        securityContext: Record<string, string>;
        
        /** Environment variables */
        environmentVariables: Record<string, string>;
      };
    };
    
    /** Safety and validation */
    safety: {
      /** Enable safety checks before execution */
      enableSafetyChecks: boolean;
      
      /** Pre-execution validation rules */
      preExecutionValidation: Array<{
        rule: string;
        parameters: Record<string, any>;
        severity: 'warning' | 'error' | 'critical';
      }>;
      
      /** Dry-run capability */
      dryRun: {
        enabled: boolean;
        defaultMode: boolean;
      };
      
      /** Approval workflow */
      approvalWorkflow: {
        required: boolean;
        autoApproval: {
          enabled: boolean;
          conditions: Array<{
            condition: string;
            value: any;
          }>;
        };
        approvers: Array<{
          role: string;
          users: string[];
          requiredCount: number;
        }>;
      };
    };
    
    /** Monitoring and observability */
    monitoring: {
      /** Detailed execution logging */
      detailedLogging: boolean;
      
      /** Metrics collection during execution */
      metricsCollection: {
        enabled: boolean;
        interval: number; // seconds
        metrics: string[];
      };
      
      /** Real-time status updates */
      realTimeUpdates: boolean;
      
      /** External monitoring integration */
      externalMonitoring: Array<{
        system: string;
        endpoint: string;
        credentials?: Record<string, string>;
      }>;
    };
  };
  
  /** Current engine state */
  state: {
    /** Engine operational status */
    status: 'active' | 'degraded' | 'maintenance' | 'error';
    
    /** Currently executing recoveries */
    activeExecutions: number;
    
    /** Queued recovery requests */
    queuedExecutions: number;
    
    /** Resource utilization */
    resourceUtilization: {
      cpu: number;
      memory: number;
      storage: number;
    };
    
    /** Execution capacity */
    capacity: {
      available: number;
      total: number;
      utilizationPercent: number;
    };
  };
  
  /** Execution queue management */
  queue: {
    /** Priority queue for recovery executions */
    priorityQueue: Array<{
      executionId: string;
      priority: number;
      queuedAt: string;
      estimatedDuration: number;
    }>;
    
    /** Queue management policies */
    policies: {
      /** Maximum queue size */
      maxQueueSize: number;
      
      /** Queue overflow behavior */
      overflowBehavior: 'reject' | 'drop_oldest' | 'drop_lowest_priority';
      
      /** Priority calculation algorithm */
      priorityAlgorithm: 'severity_based' | 'impact_based' | 'fifo' | 'custom';
    };
    
    /** Queue performance metrics */
    metrics: {
      averageWaitTime: number;
      queueThroughput: number;
      rejectionRate: number;
    };
  };
  
  /** Recovery execution orchestration */
  orchestration: {
    /** Workflow engine for complex recovery procedures */
    workflowEngine: {
      enabled: boolean;
      engine: 'simple' | 'state_machine' | 'dag' | 'external';
      configuration: Record<string, any>;
    };
    
    /** Dependency management */
    dependencies: {
      /** Dependency resolution strategy */
      resolutionStrategy: 'sequential' | 'parallel' | 'optimized';
      
      /** Timeout for dependency resolution */
      resolutionTimeout: number;
      
      /** Handling of circular dependencies */
      circularDependencyHandling: 'error' | 'ignore' | 'break_cycle';
    };
    
    /** Recovery coordination */
    coordination: {
      /** Cross-agent recovery coordination */
      crossAgentCoordination: boolean;
      
      /** Coordination protocols */
      protocols: Array<{
        protocol: string;
        enabled: boolean;
        configuration: Record<string, any>;
      }>;
    };
  };
}

/**
 * Interface for recovery execution tracking and results
 * Tracks the complete lifecycle of recovery procedure executions
 */
export interface IRecoveryExecution {
  /** Unique execution identifier */
  id: string;
  
  /** Trigger that initiated this execution */
  triggerId: string;
  
  /** Recovery procedure being executed */
  procedureId: string;
  
  /** Execution metadata */
  execution: {
    /** Current execution state */
    state: RecoveryExecutionState;
    
    /** Execution start timestamp */
    startedAt: string;
    
    /** Execution completion timestamp */
    completedAt?: string;
    
    /** Total execution duration */
    durationMs?: number;
    
    /** Execution priority */
    priority: number;
    
    /** Execution mode */
    mode: 'automatic' | 'manual' | 'dry_run';
  };
  
  /** Target information */
  target: {
    /** Agent ID being recovered */
    agentId: string;
    
    /** Specific components being targeted */
    components: string[];
    
    /** Recovery scope */
    scope: 'component' | 'agent' | 'cluster';
  };
  
  /** Execution context */
  context: {
    /** Triggering event details */
    triggeringEvent: {
      type: string;
      timestamp: string;
      data: Record<string, any>;
    };
    
    /** System state at execution time */
    systemState: {
      /** Current health metrics */
      healthMetrics: IMetric[];
      
      /** Active alerts */
      activeAlerts: string[];
      
      /** System load information */
      systemLoad: Record<string, number>;
    };
    
    /** Environmental context */
    environment: {
      /** Execution environment details */
      executionEnvironment: Record<string, string>;
      
      /** Resource constraints */
      resourceConstraints: Record<string, number>;
      
      /** External dependencies status */
      dependencyStatus: Array<{
        dependency: string;
        status: 'available' | 'degraded' | 'unavailable';
      }>;
    };
  };
  
  /** Execution steps and progress */
  steps: Array<{
    /** Step identifier */
    stepId: string;
    
    /** Step name */
    name: string;
    
    /** Step execution order */
    order: number;
    
    /** Step status */
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'cancelled';
    
    /** Step start and end times */
    startedAt?: string;
    completedAt?: string;
    durationMs?: number;
    
    /** Step input parameters */
    input: Record<string, any>;
    
    /** Step output results */
    output?: Record<string, any>;
    
    /** Error information if step failed */
    error?: {
      code: string;
      message: string;
      details: Record<string, any>;
      stackTrace?: string;
    };
    
    /** Step-specific metrics */
    metrics?: Array<{
      name: string;
      value: number;
      timestamp: string;
    }>;
    
    /** Retry information */
    retries?: Array<{
      attempt: number;
      timestamp: string;
      result: 'success' | 'failure';
      error?: string;
    }>;
  }>;
  
  /** Overall execution results */
  results: {
    /** Final execution status */
    success: boolean;
    
    /** Recovery effectiveness score */
    effectivenessScore: number; // 0-100
    
    /** Performance improvement metrics */
    improvements: Array<{
      metric: MetricType;
      beforeValue: number;
      afterValue: number;
      improvementPercent: number;
    }>;
    
    /** Issues resolved */
    resolvedIssues: Array<{
      issueType: string;
      severity: AlertSeverity;
      description: string;
      resolutionMethod: string;
    }>;
    
    /** New issues introduced (if any) */
    introducedIssues?: Array<{
      issueType: string;
      severity: AlertSeverity;
      description: string;
      mitigationPlan?: string;
    }>;
    
    /** Resource impact */
    resourceImpact: {
      /** CPU usage during recovery */
      cpuUsage: number;
      
      /** Memory usage during recovery */
      memoryUsage: number;
      
      /** Network bandwidth used */
      networkUsage: number;
      
      /** Storage space affected */
      storageImpact: number;
    };
  };
  
  /** Quality assurance and validation */
  validation: {
    /** Pre-execution validation results */
    preExecution: Array<{
      check: string;
      passed: boolean;
      message?: string;
    }>;
    
    /** Post-execution validation results */
    postExecution: Array<{
      check: string;
      passed: boolean;
      message?: string;
    }>;
    
    /** Success criteria evaluation */
    successCriteria: Array<{
      criterion: string;
      expected: any;
      actual: any;
      met: boolean;
    }>;
  };
  
  /** Rollback information (if applicable) */
  rollback?: {
    /** Whether rollback was performed */
    performed: boolean;
    
    /** Rollback trigger reason */
    reason: string;
    
    /** Rollback execution details */
    execution: {
      startedAt: string;
      completedAt?: string;
      success: boolean;
      steps: Array<{
        name: string;
        status: string;
        result?: Record<string, any>;
      }>;
    };
    
    /** System state after rollback */
    postRollbackState?: Record<string, any>;
  };
  
  /** Approval workflow tracking */
  approval?: {
    /** Approval status */
    status: 'pending' | 'approved' | 'rejected' | 'auto_approved';
    
    /** Approval requests */
    requests: Array<{
      requestedAt: string;
      requestedBy: string;
      approver: string;
      decision: 'approved' | 'rejected' | 'pending';
      decidedAt?: string;
      comments?: string;
    }>;
    
    /** Auto-approval details */
    autoApproval?: {
      applied: boolean;
      reason: string;
      conditions: Array<{
        condition: string;
        met: boolean;
      }>;
    };
  };
  
  /** Execution metadata */
  metadata: {
    /** Execution tags */
    tags: string[];
    
    /** Related executions */
    relatedExecutions: string[];
    
    /** External references */
    externalReferences: Array<{
      system: string;
      reference: string;
      type: string;
    }>;
    
    /** Audit trail */
    auditTrail: Array<{
      timestamp: string;
      action: string;
      actor: string;
      details: Record<string, any>;
    }>;
  };
}

/**
 * Interface for self-healing system coordination
 * Coordinates multiple recovery systems and provides system-wide healing capabilities
 */
export interface ISelfHealingCoordinator {
  /** Coordinator identifier */
  id: string;
  
  /** Coordination configuration */
  config: {
    /** Healing strategies */
    strategies: {
      /** Global healing strategy */
      global: 'reactive' | 'proactive' | 'predictive' | 'adaptive';
      
      /** Component-specific strategies */
      componentStrategies: Record<string, string>;
      
      /** Strategy selection criteria */
      selectionCriteria: Array<{
        condition: string;
        strategy: string;
        priority: number;
      }>;
    };
    
    /** Coordination policies */
    coordination: {
      /** Cross-system coordination enabled */
      crossSystemCoordination: boolean;
      
      /** Conflict resolution strategy */
      conflictResolution: 'priority_based' | 'consensus' | 'arbitration';
      
      /** Resource sharing policies */
      resourceSharing: {
        enabled: boolean;
        sharableResources: string[];
        allocationStrategy: 'fair_share' | 'priority_based' | 'demand_based';
      };
    };
    
    /** Learning and adaptation */
    learning: {
      /** Enable system-wide learning */
      enabled: boolean;
      
      /** Learning algorithms */
      algorithms: Array<{
        name: string;
        enabled: boolean;
        parameters: Record<string, any>;
      }>;
      
      /** Knowledge sharing between components */
      knowledgeSharing: boolean;
      
      /** Adaptation frequency */
      adaptationFrequency: number; // hours
    };
  };
  
  /** System health state */
  systemHealth: {
    /** Overall system health score */
    overallHealth: number; // 0-100
    
    /** Component health breakdown */
    componentHealth: Record<string, {
      score: number;
      status: HealthLevel;
      issues: string[];
      lastChecked: string;
    }>;
    
    /** System resilience metrics */
    resilience: {
      /** Recovery success rate */
      recoverySuccessRate: number;
      
      /** Mean time to recovery */
      meanTimeToRecovery: number;
      
      /** System availability */
      availability: number;
      
      /** Fault tolerance level */
      faultTolerance: number;
    };
    
    /** Health trends */
    trends: {
      /** Short-term health trend */
      shortTerm: 'improving' | 'stable' | 'declining';
      
      /** Long-term health trend */
      longTerm: 'improving' | 'stable' | 'declining';
      
      /** Trend confidence */
      confidence: number;
    };
  };
  
  /** Active healing sessions */
  activeSessions: Array<{
    /** Session identifier */
    sessionId: string;
    
    /** Session type */
    type: 'emergency' | 'maintenance' | 'optimization' | 'prevention';
    
    /** Affected components */
    affectedComponents: string[];
    
    /** Session start time */
    startedAt: string;
    
    /** Estimated completion time */
    estimatedCompletion: string;
    
    /** Session progress */
    progress: number; // 0-100
    
    /** Active recovery procedures */
    activeProcedures: Array<{
      procedureId: string;
      status: RecoveryExecutionState;
      progress: number;
    }>;
  }>;
  
  /** Coordination metrics */
  coordinationMetrics: {
    /** Coordination effectiveness */
    effectiveness: {
      /** Successful coordinated recoveries */
      successfulCoordinations: number;
      
      /** Failed coordinated recoveries */
      failedCoordinations: number;
      
      /** Average coordination overhead */
      averageOverhead: number; // milliseconds
    };
    
    /** Resource utilization */
    resourceUtilization: {
      /** Shared resource usage efficiency */
      sharedResourceEfficiency: number;
      
      /** Resource contention incidents */
      contentionIncidents: number;
      
      /** Resource allocation fairness */
      allocationFairness: number;
    };
    
    /** Learning effectiveness */
    learningEffectiveness: {
      /** Knowledge transfer success rate */
      knowledgeTransferRate: number;
      
      /** Adaptation success rate */
      adaptationSuccessRate: number;
      
      /** Learning convergence time */
      learningConvergenceTime: number; // hours
    };
  };
  
  /** Historical healing data */
  history: {
    /** Healing session history */
    sessions: Array<{
      sessionId: string;
      type: string;
      startTime: string;
      endTime: string;
      success: boolean;
      componentsHealed: number;
      effectivenessScore: number;
    }>;
    
    /** Learning milestones */
    learningMilestones: Array<{
      timestamp: string;
      milestone: string;
      impact: string;
      metrics: Record<string, number>;
    }>;
    
    /** System evolution tracking */
    evolution: {
      /** Configuration changes over time */
      configurationChanges: Array<{
        timestamp: string;
        component: string;
        change: string;
        reason: string;
      }>;
      
      /** Performance improvements */
      performanceImprovements: Array<{
        timestamp: string;
        metric: string;
        improvementPercent: number;
        cause: string;
      }>;
    };
  };
}