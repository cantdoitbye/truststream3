/**
 * TrustStream v4.2 - Error Registry
 * Central registry for error types, patterns, and classification rules
 */

import { 
  ErrorType, 
  ErrorSeverity, 
  ErrorCategory, 
  ClassificationRule,
  ErrorClassification,
  ImpactScope
} from './interfaces';

/**
 * Predefined error patterns and classifications for governance agents
 */
export class ErrorRegistry {
  private static instance: ErrorRegistry;
  private classificationRules: Map<string, ClassificationRule> = new Map();
  private errorPatterns: Map<ErrorType, RegExp[]> = new Map();
  private severityMappings: Map<string, ErrorSeverity> = new Map();

  private constructor() {
    this.initializeDefaultRules();
    this.initializeErrorPatterns();
    this.initializeSeverityMappings();
  }

  public static getInstance(): ErrorRegistry {
    if (!ErrorRegistry.instance) {
      ErrorRegistry.instance = new ErrorRegistry();
    }
    return ErrorRegistry.instance;
  }

  /**
   * Initialize default classification rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: ClassificationRule[] = [
      // System Errors
      {
        rule_id: 'SYSTEM_OUT_OF_MEMORY',
        pattern: /OutOfMemoryError|Cannot allocate memory|ENOMEM/i,
        error_type: 'system_error',
        severity: 'critical',
        category: 'infrastructure',
        confidence: 0.95,
        priority: 100
      },
      {
        rule_id: 'SYSTEM_CPU_EXHAUSTION',
        pattern: /CPU usage.*100%|Process killed.*resource|SIGKILL.*resource/i,
        error_type: 'resource_exhaustion',
        severity: 'high',
        category: 'infrastructure',
        confidence: 0.9,
        priority: 90
      },
      
      // Database Errors
      {
        rule_id: 'DB_CONNECTION_FAILED',
        pattern: /Connection.*refused|ECONNREFUSED|Database.*unavailable/i,
        error_type: 'database_error',
        severity: 'high',
        category: 'infrastructure',
        confidence: 0.9,
        priority: 85
      },
      {
        rule_id: 'DB_DEADLOCK',
        pattern: /deadlock|lock.*timeout|Lock wait timeout/i,
        error_type: 'database_error',
        severity: 'medium',
        category: 'application',
        confidence: 0.85,
        priority: 70
      },
      {
        rule_id: 'DB_CONSTRAINT_VIOLATION',
        pattern: /constraint.*violation|foreign key.*constraint|unique.*constraint/i,
        error_type: 'validation_error',
        severity: 'medium',
        category: 'data',
        confidence: 0.8,
        priority: 60
      },
      
      // Network Errors
      {
        rule_id: 'NETWORK_TIMEOUT',
        pattern: /timeout|ETIMEDOUT|Request.*timeout/i,
        error_type: 'timeout_error',
        severity: 'medium',
        category: 'infrastructure',
        confidence: 0.8,
        priority: 65
      },
      {
        rule_id: 'NETWORK_CONNECTION_RESET',
        pattern: /ECONNRESET|Connection.*reset|socket.*closed/i,
        error_type: 'network_error',
        severity: 'medium',
        category: 'infrastructure',
        confidence: 0.85,
        priority: 70
      },
      
      // Authentication/Authorization
      {
        rule_id: 'AUTH_TOKEN_EXPIRED',
        pattern: /token.*expired|JWT.*expired|authentication.*expired/i,
        error_type: 'authentication_error',
        severity: 'low',
        category: 'security',
        confidence: 0.9,
        priority: 40
      },
      {
        rule_id: 'AUTH_INSUFFICIENT_PERMISSIONS',
        pattern: /permission.*denied|access.*denied|forbidden|unauthorized/i,
        error_type: 'authorization_error',
        severity: 'medium',
        category: 'security',
        confidence: 0.8,
        priority: 50
      },
      
      // Rate Limiting
      {
        rule_id: 'RATE_LIMIT_EXCEEDED',
        pattern: /rate.*limit|too many requests|429|quota.*exceeded/i,
        error_type: 'rate_limit_error',
        severity: 'medium',
        category: 'performance',
        confidence: 0.9,
        priority: 55
      },
      
      // Agent Coordination
      {
        rule_id: 'AGENT_COMMUNICATION_FAILED',
        pattern: /agent.*unreachable|agent.*timeout|coordination.*failed/i,
        error_type: 'agent_coordination_error',
        severity: 'high',
        category: 'coordination',
        confidence: 0.85,
        priority: 80
      },
      {
        rule_id: 'AGENT_CONSENSUS_FAILED',
        pattern: /consensus.*failed|quorum.*not.*reached|voting.*timeout/i,
        error_type: 'agent_coordination_error',
        severity: 'high',
        category: 'coordination',
        confidence: 0.8,
        priority: 75
      },
      
      // Data Corruption
      {
        rule_id: 'DATA_CORRUPTION_DETECTED',
        pattern: /checksum.*mismatch|data.*corrupted|integrity.*violation/i,
        error_type: 'data_corruption_error',
        severity: 'critical',
        category: 'data',
        confidence: 0.9,
        priority: 95
      },
      
      // Configuration
      {
        rule_id: 'CONFIG_INVALID',
        pattern: /configuration.*invalid|config.*error|setting.*not.*found/i,
        error_type: 'configuration_error',
        severity: 'medium',
        category: 'application',
        confidence: 0.7,
        priority: 45
      },
      
      // Business Logic
      {
        rule_id: 'BUSINESS_RULE_VIOLATION',
        pattern: /business.*rule|policy.*violation|governance.*constraint/i,
        error_type: 'business_logic_error',
        severity: 'medium',
        category: 'business',
        confidence: 0.75,
        priority: 50
      }
    ];

    defaultRules.forEach(rule => {
      this.classificationRules.set(rule.rule_id, rule);
    });
  }

  /**
   * Initialize error patterns for quick detection
   */
  private initializeErrorPatterns(): void {
    this.errorPatterns.set('system_error', [
      /OutOfMemoryError/i,
      /StackOverflowError/i,
      /SIGKILL/i,
      /SIGSEGV/i
    ]);

    this.errorPatterns.set('database_error', [
      /ECONNREFUSED.*database/i,
      /deadlock/i,
      /constraint.*violation/i,
      /connection.*pool.*exhausted/i
    ]);

    this.errorPatterns.set('network_error', [
      /ECONNRESET/i,
      /ETIMEDOUT/i,
      /ENOTFOUND/i,
      /ECONNREFUSED/i
    ]);

    this.errorPatterns.set('timeout_error', [
      /timeout/i,
      /ETIMEDOUT/i,
      /operation.*timed.*out/i
    ]);

    this.errorPatterns.set('authentication_error', [
      /unauthorized/i,
      /authentication.*failed/i,
      /token.*expired/i,
      /invalid.*credentials/i
    ]);

    this.errorPatterns.set('authorization_error', [
      /forbidden/i,
      /access.*denied/i,
      /permission.*denied/i,
      /insufficient.*privileges/i
    ]);

    this.errorPatterns.set('rate_limit_error', [
      /rate.*limit/i,
      /too.*many.*requests/i,
      /quota.*exceeded/i,
      /429/
    ]);

    this.errorPatterns.set('validation_error', [
      /validation.*failed/i,
      /invalid.*input/i,
      /schema.*validation/i,
      /required.*field/i
    ]);
  }

  /**
   * Initialize severity mappings based on keywords and patterns
   */
  private initializeSeverityMappings(): void {
    // Critical severity keywords
    this.severityMappings.set('critical', 'critical');
    this.severityMappings.set('fatal', 'critical');
    this.severityMappings.set('emergency', 'emergency');
    this.severityMappings.set('outofmemory', 'critical');
    this.severityMappings.set('segmentation', 'critical');
    this.severityMappings.set('corruption', 'critical');
    
    // High severity keywords
    this.severityMappings.set('error', 'high');
    this.severityMappings.set('failed', 'high');
    this.severityMappings.set('exception', 'high');
    this.severityMappings.set('unavailable', 'high');
    
    // Medium severity keywords
    this.severityMappings.set('warning', 'medium');
    this.severityMappings.set('timeout', 'medium');
    this.severityMappings.set('retry', 'medium');
    this.severityMappings.set('degraded', 'medium');
    
    // Low severity keywords
    this.severityMappings.set('info', 'low');
    this.severityMappings.set('debug', 'low');
    this.severityMappings.set('notice', 'low');
  }

  /**
   * Get all classification rules
   */
  public getClassificationRules(): ClassificationRule[] {
    return Array.from(this.classificationRules.values());
  }

  /**
   * Get rules for a specific error type
   */
  public getRulesForErrorType(errorType: ErrorType): ClassificationRule[] {
    return Array.from(this.classificationRules.values())
      .filter(rule => rule.error_type === errorType)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Add or update a classification rule
   */
  public addRule(rule: ClassificationRule): void {
    this.classificationRules.set(rule.rule_id, rule);
  }

  /**
   * Remove a classification rule
   */
  public removeRule(ruleId: string): boolean {
    return this.classificationRules.delete(ruleId);
  }

  /**
   * Find matching rules for an error message
   */
  public findMatchingRules(errorMessage: string): ClassificationRule[] {
    const matchingRules: ClassificationRule[] = [];
    
    for (const rule of this.classificationRules.values()) {
      const pattern = typeof rule.pattern === 'string' 
        ? new RegExp(rule.pattern, 'i')
        : rule.pattern;
      
      if (pattern.test(errorMessage)) {
        matchingRules.push(rule);
      }
    }
    
    return matchingRules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get error patterns for a specific type
   */
  public getErrorPatterns(errorType: ErrorType): RegExp[] {
    return this.errorPatterns.get(errorType) || [];
  }

  /**
   * Detect error type from message
   */
  public detectErrorType(errorMessage: string): ErrorType | null {
    for (const [errorType, patterns] of this.errorPatterns.entries()) {
      for (const pattern of patterns) {
        if (pattern.test(errorMessage)) {
          return errorType;
        }
      }
    }
    return null;
  }

  /**
   * Determine severity from error message
   */
  public determineSeverity(errorMessage: string, errorType?: ErrorType): ErrorSeverity {
    const lowerMessage = errorMessage.toLowerCase();
    
    // Check for explicit severity keywords
    for (const [keyword, severity] of this.severityMappings.entries()) {
      if (lowerMessage.includes(keyword)) {
        return severity as ErrorSeverity;
      }
    }
    
    // Determine severity based on error type
    if (errorType) {
      switch (errorType) {
        case 'system_error':
        case 'data_corruption_error':
          return 'critical';
        case 'database_error':
        case 'agent_coordination_error':
          return 'high';
        case 'timeout_error':
        case 'network_error':
        case 'rate_limit_error':
          return 'medium';
        case 'validation_error':
        case 'authentication_error':
          return 'low';
        default:
          return 'medium';
      }
    }
    
    return 'medium'; // Default severity
  }

  /**
   * Determine impact scope based on error characteristics
   */
  public determineImpactScope(
    errorType: ErrorType, 
    agentType: string, 
    errorMessage: string
  ): ImpactScope {
    // System-wide errors
    if (
      errorType === 'system_error' ||
      errorType === 'resource_exhaustion' ||
      errorMessage.includes('cluster') ||
      errorMessage.includes('system-wide')
    ) {
      return 'system_wide';
    }
    
    // Agent cluster errors
    if (
      errorType === 'agent_coordination_error' ||
      errorMessage.includes('coordination') ||
      errorMessage.includes('consensus')
    ) {
      return 'agent_cluster';
    }
    
    // Database errors often affect multiple agents
    if (errorType === 'database_error') {
      return 'agent_cluster';
    }
    
    // Cross-system errors
    if (
      errorType === 'dependency_error' ||
      errorMessage.includes('external') ||
      errorMessage.includes('third-party')
    ) {
      return 'cross_system';
    }
    
    // Single agent errors
    if (
      errorType === 'validation_error' ||
      errorType === 'authentication_error' ||
      errorType === 'authorization_error'
    ) {
      return 'single_agent';
    }
    
    return 'single_request'; // Default scope
  }

  /**
   * Check if error is retryable based on type and message
   */
  public isRetryable(errorType: ErrorType, errorMessage: string): boolean {
    const nonRetryableTypes: ErrorType[] = [
      'validation_error',
      'authorization_error',
      'data_corruption_error',
      'configuration_error',
      'business_logic_error'
    ];
    
    if (nonRetryableTypes.includes(errorType)) {
      return false;
    }
    
    // Check for non-retryable patterns in message
    const nonRetryablePatterns = [
      /not found/i,
      /does not exist/i,
      /invalid.*format/i,
      /malformed/i,
      /syntax.*error/i
    ];
    
    for (const pattern of nonRetryablePatterns) {
      if (pattern.test(errorMessage)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Check if error is transient (temporary)
   */
  public isTransient(errorType: ErrorType, errorMessage: string): boolean {
    const transientTypes: ErrorType[] = [
      'timeout_error',
      'network_error',
      'rate_limit_error'
    ];
    
    if (transientTypes.includes(errorType)) {
      return true;
    }
    
    // Check for transient patterns
    const transientPatterns = [
      /temporary/i,
      /temporarily/i,
      /rate.*limit/i,
      /busy/i,
      /overloaded/i,
      /throttle/i
    ];
    
    for (const pattern of transientPatterns) {
      if (pattern.test(errorMessage)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Estimate recovery time based on error characteristics
   */
  public estimateRecoveryTime(errorType: ErrorType, severity: ErrorSeverity): number {
    const baseRecoveryTimes: Record<ErrorType, number> = {
      'system_error': 300000, // 5 minutes
      'validation_error': 0, // Immediate (no recovery needed)
      'authentication_error': 5000, // 5 seconds
      'authorization_error': 0, // Immediate (no recovery needed)
      'rate_limit_error': 60000, // 1 minute
      'timeout_error': 30000, // 30 seconds
      'network_error': 60000, // 1 minute
      'database_error': 120000, // 2 minutes
      'dependency_error': 180000, // 3 minutes
      'configuration_error': 600000, // 10 minutes
      'resource_exhaustion': 300000, // 5 minutes
      'business_logic_error': 0, // Immediate (no recovery needed)
      'data_corruption_error': 1800000, // 30 minutes
      'protocol_error': 60000, // 1 minute
      'agent_coordination_error': 120000 // 2 minutes
    };
    
    const severityMultipliers: Record<ErrorSeverity, number> = {
      'low': 0.5,
      'medium': 1.0,
      'high': 2.0,
      'critical': 3.0,
      'emergency': 5.0
    };
    
    const baseTime = baseRecoveryTimes[errorType] || 60000;
    const multiplier = severityMultipliers[severity] || 1.0;
    
    return Math.round(baseTime * multiplier);
  }
}