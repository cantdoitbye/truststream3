/**
 * TrustStream v4.2 - Error Handling Configuration
 * Comprehensive configuration options for the error handling framework
 */

// ===== MAIN CONFIGURATION INTERFACE =====

export interface ErrorHandlingConfig {
  // Core settings
  enable_circuit_breakers: boolean;
  enable_graceful_degradation: boolean;
  enable_root_cause_analysis: boolean;
  enable_recovery_coordination: boolean;
  
  // Recovery settings
  max_recovery_attempts: number;
  default_timeout_ms: number;
  recovery_strategy_timeout: number;
  
  // Circuit breaker settings
  circuit_breaker_failure_threshold: number;
  circuit_breaker_timeout_ms: number;
  circuit_breaker_test_request_volume: number;
  circuit_breaker_rolling_window_size: number;
  circuit_breaker_minimum_throughput: number;
  circuit_breaker_error_threshold_percentage: number;
  
  // Degradation settings
  degradation_threshold_percentage: number;
  degradation_check_interval_ms: number;
  degradation_auto_recovery: boolean;
  degradation_max_level: 'minimal' | 'moderate' | 'severe' | 'emergency';
  
  // Monitoring settings
  monitoring_interval_ms: number;
  enable_detailed_metrics: boolean;
  enable_performance_tracking: boolean;
  metric_retention_hours: number;
  
  // Analysis settings
  root_cause_analysis_timeout: number;
  enable_ml_classification: boolean;
  classification_confidence_threshold: number;
  
  // Coordination settings
  coordination_timeout_ms: number;
  max_concurrent_recoveries: number;
  coordination_retry_attempts: number;
  
  // Logging settings
  log_level: 'debug' | 'info' | 'warn' | 'error';
  log_error_details: boolean;
  log_recovery_actions: boolean;
  log_degradation_changes: boolean;
  
  // Alert settings
  enable_alerts: boolean;
  alert_escalation_timeout: number;
  critical_error_immediate_alert: boolean;
}

// ===== DEFAULT CONFIGURATIONS =====

export const DEFAULT_ERROR_HANDLING_CONFIG: ErrorHandlingConfig = {
  // Core settings
  enable_circuit_breakers: true,
  enable_graceful_degradation: true,
  enable_root_cause_analysis: true,
  enable_recovery_coordination: true,
  
  // Recovery settings
  max_recovery_attempts: 3,
  default_timeout_ms: 30000,
  recovery_strategy_timeout: 60000,
  
  // Circuit breaker settings
  circuit_breaker_failure_threshold: 5,
  circuit_breaker_timeout_ms: 60000,
  circuit_breaker_test_request_volume: 3,
  circuit_breaker_rolling_window_size: 300000,
  circuit_breaker_minimum_throughput: 10,
  circuit_breaker_error_threshold_percentage: 50,
  
  // Degradation settings
  degradation_threshold_percentage: 75,
  degradation_check_interval_ms: 5000,
  degradation_auto_recovery: true,
  degradation_max_level: 'severe',
  
  // Monitoring settings
  monitoring_interval_ms: 5000,
  enable_detailed_metrics: false,
  enable_performance_tracking: true,
  metric_retention_hours: 24,
  
  // Analysis settings
  root_cause_analysis_timeout: 30000,
  enable_ml_classification: true,
  classification_confidence_threshold: 0.7,
  
  // Coordination settings
  coordination_timeout_ms: 300000,
  max_concurrent_recoveries: 3,
  coordination_retry_attempts: 2,
  
  // Logging settings
  log_level: 'info',
  log_error_details: true,
  log_recovery_actions: true,
  log_degradation_changes: true,
  
  // Alert settings
  enable_alerts: true,
  alert_escalation_timeout: 60000,
  critical_error_immediate_alert: true
};

// ===== ENVIRONMENT-SPECIFIC CONFIGURATIONS =====

export const DEVELOPMENT_CONFIG: Partial<ErrorHandlingConfig> = {
  log_level: 'debug',
  enable_detailed_metrics: true,
  monitoring_interval_ms: 1000,
  degradation_check_interval_ms: 2000,
  circuit_breaker_failure_threshold: 3,
  max_recovery_attempts: 2,
  default_timeout_ms: 10000
};

export const PRODUCTION_CONFIG: Partial<ErrorHandlingConfig> = {
  log_level: 'warn',
  enable_detailed_metrics: false,
  monitoring_interval_ms: 10000,
  degradation_check_interval_ms: 15000,
  circuit_breaker_failure_threshold: 10,
  max_recovery_attempts: 5,
  default_timeout_ms: 60000,
  metric_retention_hours: 72,
  enable_alerts: true
};

export const HIGH_AVAILABILITY_CONFIG: Partial<ErrorHandlingConfig> = {
  enable_circuit_breakers: true,
  enable_graceful_degradation: true,
  enable_recovery_coordination: true,
  degradation_auto_recovery: true,
  degradation_max_level: 'emergency',
  circuit_breaker_failure_threshold: 15,
  max_concurrent_recoveries: 5,
  coordination_timeout_ms: 600000,
  max_recovery_attempts: 7,
  default_timeout_ms: 90000
};

export const PERFORMANCE_OPTIMIZED_CONFIG: Partial<ErrorHandlingConfig> = {
  enable_detailed_metrics: false,
  enable_performance_tracking: false,
  monitoring_interval_ms: 30000,
  degradation_check_interval_ms: 60000,
  root_cause_analysis_timeout: 10000,
  enable_ml_classification: false,
  log_level: 'error',
  log_error_details: false
};

// ===== AGENT-SPECIFIC CONFIGURATIONS =====

export const CONSENSUS_AGENT_CONFIG: Partial<ErrorHandlingConfig> = {
  circuit_breaker_failure_threshold: 3,
  circuit_breaker_timeout_ms: 30000,
  max_recovery_attempts: 5,
  degradation_threshold_percentage: 90,
  enable_recovery_coordination: true,
  coordination_timeout_ms: 120000,
  critical_error_immediate_alert: true
};

export const WORKFLOW_AGENT_CONFIG: Partial<ErrorHandlingConfig> = {
  circuit_breaker_failure_threshold: 5,
  circuit_breaker_timeout_ms: 60000,
  max_recovery_attempts: 3,
  degradation_threshold_percentage: 80,
  enable_graceful_degradation: true,
  degradation_auto_recovery: true
};

export const VALIDATION_AGENT_CONFIG: Partial<ErrorHandlingConfig> = {
  circuit_breaker_failure_threshold: 7,
  circuit_breaker_timeout_ms: 45000,
  max_recovery_attempts: 4,
  degradation_threshold_percentage: 85,
  enable_root_cause_analysis: true,
  root_cause_analysis_timeout: 20000
};

export const INTEGRATION_AGENT_CONFIG: Partial<ErrorHandlingConfig> = {
  circuit_breaker_failure_threshold: 10,
  circuit_breaker_timeout_ms: 120000,
  max_recovery_attempts: 6,
  degradation_threshold_percentage: 70,
  enable_circuit_breakers: true,
  circuit_breaker_error_threshold_percentage: 40
};

// ===== SPECIALIZED CONFIGURATIONS =====

export const REAL_TIME_CONFIG: Partial<ErrorHandlingConfig> = {
  default_timeout_ms: 5000,
  recovery_strategy_timeout: 10000,
  monitoring_interval_ms: 1000,
  degradation_check_interval_ms: 1000,
  circuit_breaker_failure_threshold: 2,
  circuit_breaker_timeout_ms: 15000,
  max_recovery_attempts: 2,
  enable_detailed_metrics: true
};

export const BATCH_PROCESSING_CONFIG: Partial<ErrorHandlingConfig> = {
  default_timeout_ms: 300000,
  recovery_strategy_timeout: 600000,
  monitoring_interval_ms: 60000,
  degradation_check_interval_ms: 120000,
  circuit_breaker_failure_threshold: 20,
  circuit_breaker_timeout_ms: 900000,
  max_recovery_attempts: 10,
  coordination_timeout_ms: 1800000
};

export const SECURITY_FOCUSED_CONFIG: Partial<ErrorHandlingConfig> = {
  log_error_details: false,
  enable_detailed_metrics: false,
  critical_error_immediate_alert: true,
  alert_escalation_timeout: 10000,
  circuit_breaker_failure_threshold: 1, // Very sensitive for security errors
  max_recovery_attempts: 1,
  degradation_max_level: 'emergency',
  enable_alerts: true
};

// ===== CONFIGURATION BUILDER =====

export class ErrorHandlingConfigBuilder {
  private config: Partial<ErrorHandlingConfig> = {};

  constructor(baseConfig: Partial<ErrorHandlingConfig> = DEFAULT_ERROR_HANDLING_CONFIG) {
    this.config = { ...baseConfig };
  }

  // Core settings
  enableCircuitBreakers(enabled: boolean = true): this {
    this.config.enable_circuit_breakers = enabled;
    return this;
  }

  enableGracefulDegradation(enabled: boolean = true): this {
    this.config.enable_graceful_degradation = enabled;
    return this;
  }

  enableRootCauseAnalysis(enabled: boolean = true): this {
    this.config.enable_root_cause_analysis = enabled;
    return this;
  }

  enableRecoveryCoordination(enabled: boolean = true): this {
    this.config.enable_recovery_coordination = enabled;
    return this;
  }

  // Recovery settings
  setMaxRecoveryAttempts(attempts: number): this {
    this.config.max_recovery_attempts = attempts;
    return this;
  }

  setDefaultTimeout(timeoutMs: number): this {
    this.config.default_timeout_ms = timeoutMs;
    return this;
  }

  // Circuit breaker settings
  setCircuitBreakerThreshold(threshold: number): this {
    this.config.circuit_breaker_failure_threshold = threshold;
    return this;
  }

  setCircuitBreakerTimeout(timeoutMs: number): this {
    this.config.circuit_breaker_timeout_ms = timeoutMs;
    return this;
  }

  // Degradation settings
  setDegradationThreshold(percentage: number): this {
    this.config.degradation_threshold_percentage = percentage;
    return this;
  }

  setDegradationMaxLevel(level: 'minimal' | 'moderate' | 'severe' | 'emergency'): this {
    this.config.degradation_max_level = level;
    return this;
  }

  // Monitoring settings
  setMonitoringInterval(intervalMs: number): this {
    this.config.monitoring_interval_ms = intervalMs;
    return this;
  }

  enableDetailedMetrics(enabled: boolean = true): this {
    this.config.enable_detailed_metrics = enabled;
    return this;
  }

  // Logging settings
  setLogLevel(level: 'debug' | 'info' | 'warn' | 'error'): this {
    this.config.log_level = level;
    return this;
  }

  // Build the configuration
  build(): ErrorHandlingConfig {
    return { ...DEFAULT_ERROR_HANDLING_CONFIG, ...this.config };
  }
}

// ===== CONFIGURATION PRESETS =====

export const ConfigurationPresets = {
  development: () => new ErrorHandlingConfigBuilder(DEVELOPMENT_CONFIG),
  production: () => new ErrorHandlingConfigBuilder(PRODUCTION_CONFIG),
  highAvailability: () => new ErrorHandlingConfigBuilder(HIGH_AVAILABILITY_CONFIG),
  performanceOptimized: () => new ErrorHandlingConfigBuilder(PERFORMANCE_OPTIMIZED_CONFIG),
  realTime: () => new ErrorHandlingConfigBuilder(REAL_TIME_CONFIG),
  batchProcessing: () => new ErrorHandlingConfigBuilder(BATCH_PROCESSING_CONFIG),
  securityFocused: () => new ErrorHandlingConfigBuilder(SECURITY_FOCUSED_CONFIG),

  // Agent-specific presets
  consensusAgent: () => new ErrorHandlingConfigBuilder(CONSENSUS_AGENT_CONFIG),
  workflowAgent: () => new ErrorHandlingConfigBuilder(WORKFLOW_AGENT_CONFIG),
  validationAgent: () => new ErrorHandlingConfigBuilder(VALIDATION_AGENT_CONFIG),
  integrationAgent: () => new ErrorHandlingConfigBuilder(INTEGRATION_AGENT_CONFIG)
};

// ===== CONFIGURATION VALIDATION =====

export class ConfigurationValidator {
  static validate(config: Partial<ErrorHandlingConfig>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required numeric values
    if (config.max_recovery_attempts !== undefined && config.max_recovery_attempts < 1) {
      errors.push('max_recovery_attempts must be at least 1');
    }

    if (config.default_timeout_ms !== undefined && config.default_timeout_ms < 1000) {
      warnings.push('default_timeout_ms less than 1000ms may cause performance issues');
    }

    if (config.circuit_breaker_failure_threshold !== undefined && config.circuit_breaker_failure_threshold < 1) {
      errors.push('circuit_breaker_failure_threshold must be at least 1');
    }

    if (config.degradation_threshold_percentage !== undefined) {
      if (config.degradation_threshold_percentage < 0 || config.degradation_threshold_percentage > 100) {
        errors.push('degradation_threshold_percentage must be between 0 and 100');
      }
    }

    // Validate monitoring intervals
    if (config.monitoring_interval_ms !== undefined && config.monitoring_interval_ms < 100) {
      warnings.push('monitoring_interval_ms less than 100ms may cause high CPU usage');
    }

    // Validate coordination settings
    if (config.max_concurrent_recoveries !== undefined && config.max_concurrent_recoveries < 1) {
      errors.push('max_concurrent_recoveries must be at least 1');
    }

    // Check for conflicting settings
    if (config.enable_circuit_breakers === false && config.circuit_breaker_failure_threshold !== undefined) {
      warnings.push('circuit_breaker_failure_threshold set but circuit breakers are disabled');
    }

    if (config.enable_graceful_degradation === false && config.degradation_threshold_percentage !== undefined) {
      warnings.push('degradation_threshold_percentage set but graceful degradation is disabled');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ===== USAGE EXAMPLES =====

export const ConfigurationExamples = {
  // Basic production setup
  basic: () => {
    return new ErrorHandlingConfigBuilder()
      .enableCircuitBreakers(true)
      .enableGracefulDegradation(true)
      .setMaxRecoveryAttempts(3)
      .setDefaultTimeout(30000)
      .setLogLevel('info')
      .build();
  },

  // High-performance setup
  highPerformance: () => {
    return ConfigurationPresets.performanceOptimized()
      .setMonitoringInterval(60000)
      .enableDetailedMetrics(false)
      .setLogLevel('error')
      .build();
  },

  // Development setup with detailed logging
  development: () => {
    return ConfigurationPresets.development()
      .setLogLevel('debug')
      .enableDetailedMetrics(true)
      .setMonitoringInterval(1000)
      .setMaxRecoveryAttempts(2)
      .build();
  },

  // Mission-critical setup
  missionCritical: () => {
    return ConfigurationPresets.highAvailability()
      .setMaxRecoveryAttempts(7)
      .setCircuitBreakerThreshold(20)
      .setDegradationMaxLevel('emergency')
      .enableDetailedMetrics(true)
      .build();
  },

  // Custom consensus agent setup
  customConsensusAgent: () => {
    return new ErrorHandlingConfigBuilder()
      .enableCircuitBreakers(true)
      .enableRecoveryCoordination(true)
      .setCircuitBreakerThreshold(2)
      .setCircuitBreakerTimeout(15000)
      .setMaxRecoveryAttempts(5)
      .setDegradationThreshold(95)
      .setLogLevel('info')
      .build();
  }
};

// Export everything for easy access
export {
  ErrorHandlingConfigBuilder,
  ConfigurationValidator,
  ConfigurationPresets,
  ConfigurationExamples
};
