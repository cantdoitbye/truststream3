/**
 * TrustStream v4.2 - Error Handling Framework
 * Comprehensive error handling and recovery system for governance agents
 */

// Core interfaces and types
export * from './core/interfaces';
export { ErrorRegistry } from './core/error-registry';

// Main orchestrator
export { ErrorHandlingManager } from './error-handling-manager';

// Error classification
export { ErrorClassifier } from './classification/error-classifier';

// Recovery strategies
export { RecoveryManager } from './recovery/recovery-manager';
export { CircuitBreaker } from './recovery/circuit-breaker';

// Graceful degradation
export { DegradationManager } from './degradation/degradation-manager';

// Root cause analysis
export { RootCauseAnalyzer } from './analysis/root-cause-analyzer';

// Recovery coordination
export { RecoveryCoordinator } from './coordination/recovery-coordinator';

// Monitoring
export { ErrorMonitor } from './monitoring/error-monitor';

// Type guards for error handling
export const isRetryableError = (error: any): boolean => {
  return error?.retryable === true || 
         error?.code === 'ETIMEDOUT' ||
         error?.code === 'ECONNRESET' ||
         error?.code === 'ENOTFOUND';
};

export const isCriticalError = (error: any): boolean => {
  return error?.severity === 'critical' ||
         error?.severity === 'emergency' ||
         error?.name === 'DatabaseCorruptionError' ||
         error?.name === 'SecurityBreach';
};

// Helper function to create error context
export const createErrorContext = (
  errorId: string,
  agentId: string,
  agentType: string,
  additionalContext: Record<string, any> = {}
): any => {
  return {
    error_id: errorId,
    agent_id: agentId,
    agent_type: agentType,
    timestamp: new Date(),
    environment: {
      node_version: process.version,
      memory_usage: process.memoryUsage().heapUsed,
      cpu_usage: process.cpuUsage().user,
      active_connections: 0 // This would be filled by the actual monitoring
    },
    metadata: additionalContext
  };
};

// Constants for configuration
export const DEFAULT_ERROR_HANDLING_CONFIG = {
  enable_circuit_breakers: true,
  enable_graceful_degradation: true,
  enable_root_cause_analysis: true,
  enable_recovery_coordination: true,
  max_recovery_attempts: 3,
  default_timeout_ms: 30000,
  circuit_breaker_failure_threshold: 5,
  circuit_breaker_timeout_ms: 60000,
  degradation_threshold_percentage: 75,
  monitoring_interval_ms: 5000
};

// Convenience factory function
export const createErrorHandlingManager = (
  db: any,
  logger: any,
  config: any = {}
) => {
  return new ErrorHandlingManager(db, logger, {
    ...DEFAULT_ERROR_HANDLING_CONFIG,
    ...config
  });
};
