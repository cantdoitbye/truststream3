/**
 * TrustStream v4.2 - Error Handling Manager
 * Central error handling orchestration and management
 */

import {
  ErrorContext,
  ErrorClassification,
  IErrorClassifier,
  IRecoveryManager,
  ICircuitBreaker,
  IDegradationManager,
  IRootCauseAnalyzer,
  IRecoveryCoordinator,
  IErrorMonitor,
  ErrorMetrics,
  ErrorTrend,
  AlertPattern,
  TimeRange,
  RecoveryResult,
  RootCauseAnalysisResult
} from './core/interfaces';
import { ErrorClassifier } from './classification/error-classifier';
import { RecoveryManager } from './recovery/recovery-manager';
import { CircuitBreaker } from './recovery/circuit-breaker';
import { DegradationManager } from './degradation/degradation-manager';
import { RootCauseAnalyzer } from './analysis/root-cause-analyzer';
import { RecoveryCoordinator } from './coordination/recovery-coordinator';
import { ErrorMonitor } from './monitoring/error-monitor';
import { Logger } from '../../shared-utils/logger';
import { DatabaseInterface } from '../../shared-utils/database-interface';
import { EventEmitter } from 'events';

/**
 * Central error handling manager that orchestrates all error handling components
 */
export class ErrorHandlingManager extends EventEmitter {
  private db: DatabaseInterface;
  private logger: Logger;
  private classifier: IErrorClassifier;
  private recoveryManager: IRecoveryManager;
  private degradationManager: IDegradationManager;
  private rootCauseAnalyzer: IRootCauseAnalyzer;
  private recoveryCoordinator: IRecoveryCoordinator;
  private errorMonitor: IErrorMonitor;
  private circuitBreakers: Map<string, ICircuitBreaker> = new Map();
  private activeRecoveries: Map<string, ActiveRecovery> = new Map();
  private config: ErrorHandlingConfig;

  constructor(
    db: DatabaseInterface,
    logger: Logger,
    config: Partial<ErrorHandlingConfig> = {}
  ) {
    super();
    this.db = db;
    this.logger = logger;
    this.config = { ...this.getDefaultConfig(), ...config };
    
    this.initializeComponents();
  }

  /**
   * Initialize all error handling components
   */
  private initializeComponents(): void {
    this.classifier = new ErrorClassifier(this.db, this.logger);
    this.recoveryManager = new RecoveryManager(this.db, this.logger);
    this.degradationManager = new DegradationManager(this.db, this.logger);
    this.rootCauseAnalyzer = new RootCauseAnalyzer(this.db, this.logger);
    this.recoveryCoordinator = new RecoveryCoordinator(this.db, this.logger);
    this.errorMonitor = new ErrorMonitor(this.db, this.logger);
    
    this.setupEventHandlers();
    
    this.logger.info('Error handling manager initialized');
  }

  /**
   * Handle an error occurrence through the complete error handling pipeline
   */
  async handleError(error: Error, context: ErrorContext): Promise<ErrorHandlingResult> {
    const startTime = Date.now();
    
    this.logger.info(`Handling error: ${context.error_id}`, {
      agent_id: context.agent_id,
      error_type: error.name,
      agent_type: context.agent_type
    });

    try {
      // Step 1: Record the error
      await this.errorMonitor.recordError(context);
      
      // Step 2: Classify the error
      const classification = await this.classifier.classifyError(error, context);
      
      this.logger.info(`Error classified: ${context.error_id}`, {
        error_type: classification.error_type,
        severity: classification.severity,
        confidence: classification.confidence_score
      });

      // Step 3: Check for immediate degradation needs
      if (classification.requires_immediate_attention) {
        await this.handleImmediateResponse(classification, context);
      }

      // Step 4: Determine recovery approach
      const recoveryApproach = this.determineRecoveryApproach(classification, context);
      
      let recoveryResult: RecoveryResult;
      let rootCauseAnalysis: RootCauseAnalysisResult | null = null;
      
      // Step 5: Execute recovery based on approach
      switch (recoveryApproach) {
        case 'single_agent':
          recoveryResult = await this.executeSingleAgentRecovery(
            error,
            context,
            classification
          );
          break;
          
        case 'coordinated':
          recoveryResult = await this.executeCoordinatedRecovery(
            error,
            context,
            classification
          );
          break;
          
        case 'degradation_only':
          recoveryResult = await this.executeDegradationOnly(
            error,
            context,
            classification
          );
          break;
          
        default:
          throw new Error(`Unknown recovery approach: ${recoveryApproach}`);
      }
      
      // Step 6: Perform root cause analysis (async if recovery was successful)
      if (this.config.enable_root_cause_analysis) {
        if (recoveryResult.success) {
          // Async analysis for successful recoveries
          this.performAsyncRootCauseAnalysis(context, classification);
        } else {
          // Immediate analysis for failed recoveries
          rootCauseAnalysis = await this.rootCauseAnalyzer.analyzeError(context);
        }
      }
      
      // Step 7: Update degradation state if needed
      await this.updateDegradationState(classification, recoveryResult);
      
      const duration = Date.now() - startTime;
      
      const result: ErrorHandlingResult = {
        error_id: context.error_id,
        classification,
        recovery_result: recoveryResult,
        root_cause_analysis: rootCauseAnalysis,
        recovery_approach: recoveryApproach,
        duration_ms: duration,
        success: recoveryResult.success
      };

      this.logger.info(`Error handling completed: ${context.error_id}`, {
        success: result.success,
        duration_ms: duration,
        recovery_approach: recoveryApproach
      });

      this.emit('error_handled', result);
      
      return result;

    } catch (handlingError) {
      const duration = Date.now() - startTime;
      
      this.logger.error('Error handling failed', {
        error_id: context.error_id,
        handling_error: handlingError.message,
        duration_ms: duration
      });

      // Emergency fallback
      const emergencyResult = await this.executeEmergencyFallback(context);
      
      const result: ErrorHandlingResult = {
        error_id: context.error_id,
        classification: this.getEmergencyClassification(),
        recovery_result: emergencyResult,
        root_cause_analysis: null,
        recovery_approach: 'degradation_only',
        duration_ms: duration,
        success: false
      };

      this.emit('error_handling_failed', {
        error_id: context.error_id,
        error: handlingError.message,
        result
      });
      
      return result;
    }
  }

  /**
   * Handle immediate response for critical errors
   */
  private async handleImmediateResponse(
    classification: ErrorClassification,
    context: ErrorContext
  ): Promise<void> {
    this.logger.warn(`Immediate response required for error: ${context.error_id}`, {
      severity: classification.severity,
      impact_scope: classification.impact_scope
    });

    // Trigger circuit breakers for system-wide issues
    if (classification.impact_scope === 'system_wide' || 
        classification.impact_scope === 'cross_system') {
      await this.activateEmergencyCircuitBreakers(context);
    }
    
    // Escalate degradation for critical errors
    if (classification.severity === 'critical' || classification.severity === 'emergency') {
      await this.degradationManager.escalateDegradation({
        metric: 'error_severity',
        operator: 'eq',
        threshold: classification.severity,
        window_size_ms: 60000
      });
    }
  }

  /**
   * Determine recovery approach based on error characteristics
   */
  private determineRecoveryApproach(
    classification: ErrorClassification,
    context: ErrorContext
  ): RecoveryApproach {
    // System-wide or agent cluster issues require coordination
    if (classification.impact_scope === 'system_wide' || 
        classification.impact_scope === 'agent_cluster') {
      return 'coordinated';
    }
    
    // Critical errors that might affect other agents
    if (classification.severity === 'critical' && 
        classification.error_type === 'agent_coordination_error') {
      return 'coordinated';
    }
    
    // Non-retryable errors might only need degradation
    if (!classification.is_retryable) {
      return 'degradation_only';
    }
    
    // Default to single agent recovery
    return 'single_agent';
  }

  /**
   * Execute single agent recovery
   */
  private async executeSingleAgentRecovery(
    error: Error,
    context: ErrorContext,
    classification: ErrorClassification
  ): Promise<RecoveryResult> {
    this.logger.debug(`Executing single agent recovery: ${context.error_id}`);
    
    // Use circuit breaker for the recovery operation
    const circuitBreaker = this.getOrCreateCircuitBreaker(
      `recovery_${context.agent_id}`,
      {
        failure_threshold: 3,
        recovery_timeout: 60000,
        test_request_volume: 1,
        rolling_window_size: 300000,
        minimum_throughput: 1,
        error_threshold_percentage: 50
      }
    );
    
    return await circuitBreaker.call(async () => {
      return await this.recoveryManager.executeRecovery(context, classification);
    }, context);
  }

  /**
   * Execute coordinated recovery
   */
  private async executeCoordinatedRecovery(
    error: Error,
    context: ErrorContext,
    classification: ErrorClassification
  ): Promise<RecoveryResult> {
    this.logger.debug(`Executing coordinated recovery: ${context.error_id}`);
    
    // Determine participating agents
    const participatingAgents = await this.determineParticipatingAgents(
      context,
      classification
    );
    
    // Initiate coordinated recovery session
    const session = await this.recoveryCoordinator.initiateRecovery(
      context,
      participatingAgents
    );
    
    // Execute coordinated recovery
    return await this.recoveryCoordinator.executeCoordinatedRecovery(
      session.session_id
    );
  }

  /**
   * Execute degradation only (no active recovery)
   */
  private async executeDegradationOnly(
    error: Error,
    context: ErrorContext,
    classification: ErrorClassification
  ): Promise<RecoveryResult> {
    this.logger.debug(`Executing degradation only: ${context.error_id}`);
    
    // Trigger degradation based on error characteristics
    await this.degradationManager.escalateDegradation({
      metric: 'error_occurrence',
      operator: 'eq',
      threshold: 1,
      window_size_ms: 60000
    });
    
    return {
      success: true, // Degradation is considered successful
      strategy_used: {
        strategy_id: 'degradation_only',
        name: 'Degradation Only',
        description: 'Applied graceful degradation without active recovery',
        applicable_error_types: [],
        applicable_severities: [],
        priority: 0,
        max_attempts: 1,
        timeout_ms: 5000,
        success_criteria: {
          health_check_passes: false,
          response_time_threshold: 10000,
          error_rate_threshold: 1.0,
          success_rate_threshold: 0.0,
          custom_checks: []
        },
        prerequisites: [],
        estimated_recovery_time: 5000
      },
      actions_executed: [
        {
          action_id: 'graceful_degradation',
          type: 'fallback_mode',
          description: 'Applied graceful degradation',
          parameters: { level: classification.severity },
          timeout_ms: 5000,
          dependencies: []
        }
      ],
      duration_ms: 5000,
      error_resolved: false,
      side_effects: ['System operating in degraded mode'],
      rollback_required: false
    };
  }

  /**
   * Execute emergency fallback when all else fails
   */
  private async executeEmergencyFallback(context: ErrorContext): Promise<RecoveryResult> {
    this.logger.error(`Executing emergency fallback: ${context.error_id}`);
    
    try {
      // Force maximum degradation
      await this.degradationManager.escalateDegradation({
        metric: 'emergency',
        operator: 'eq',
        threshold: 1,
        window_size_ms: 1000
      });
      
      // Activate all circuit breakers
      await this.activateEmergencyCircuitBreakers(context);
      
      return {
        success: false,
        strategy_used: null as any,
        actions_executed: [],
        duration_ms: 1000,
        error_resolved: false,
        side_effects: ['Emergency fallback activated'],
        rollback_required: false
      };
      
    } catch (fallbackError) {
      this.logger.error('Emergency fallback failed', {
        error: fallbackError.message
      });
      
      return {
        success: false,
        strategy_used: null as any,
        actions_executed: [],
        duration_ms: 0,
        error_resolved: false,
        side_effects: ['Emergency fallback failed'],
        rollback_required: false
      };
    }
  }

  /**
   * Perform async root cause analysis
   */
  private async performAsyncRootCauseAnalysis(
    context: ErrorContext,
    classification: ErrorClassification
  ): Promise<void> {
    try {
      const analysis = await this.rootCauseAnalyzer.analyzeError(context);
      
      this.emit('root_cause_analysis_completed', {
        error_id: context.error_id,
        analysis
      });
      
    } catch (analysisError) {
      this.logger.warn('Async root cause analysis failed', {
        error_id: context.error_id,
        error: analysisError.message
      });
    }
  }

  /**
   * Update degradation state based on recovery result
   */
  private async updateDegradationState(
    classification: ErrorClassification,
    recoveryResult: RecoveryResult
  ): Promise<void> {
    if (recoveryResult.success && classification.severity !== 'emergency') {
      // Attempt to recover from degradation if recovery was successful
      try {
        await this.degradationManager.recoverDegradation();
      } catch (recoveryError) {
        this.logger.warn('Failed to recover from degradation', {
          error: recoveryError.message
        });
      }
    }
  }

  /**
   * Determine participating agents for coordinated recovery
   */
  private async determineParticipatingAgents(
    context: ErrorContext,
    classification: ErrorClassification
  ): Promise<string[]> {
    const agents = [context.agent_id]; // Always include the affected agent
    
    // For system-wide issues, include all governance agents
    if (classification.impact_scope === 'system_wide') {
      agents.push(
        'ai-leader-efficiency',
        'ai-leader-quality',
        'ai-leader-transparency',
        'ai-leader-accountability',
        'ai-leader-innovation'
      );
    }
    
    // For agent cluster issues, include related agents
    if (classification.impact_scope === 'agent_cluster') {
      // Add agents of the same type or in the same cluster
      // This would be determined by actual agent topology
      agents.push(`${context.agent_type}-backup`);
    }
    
    return [...new Set(agents)]; // Remove duplicates
  }

  /**
   * Activate emergency circuit breakers
   */
  private async activateEmergencyCircuitBreakers(context: ErrorContext): Promise<void> {
    this.logger.warn('Activating emergency circuit breakers');
    
    // Force open all circuit breakers
    for (const [name, circuitBreaker] of this.circuitBreakers) {
      try {
        circuitBreaker.forceOpen();
      } catch (error) {
        this.logger.error(`Failed to open circuit breaker: ${name}`, {
          error: error.message
        });
      }
    }
  }

  /**
   * Get or create circuit breaker
   */
  private getOrCreateCircuitBreaker(
    name: string,
    config: any
  ): ICircuitBreaker {
    if (!this.circuitBreakers.has(name)) {
      const circuitBreaker = new CircuitBreaker(name, config, this.logger);
      this.circuitBreakers.set(name, circuitBreaker);
    }
    
    return this.circuitBreakers.get(name)!;
  }

  /**
   * Get emergency classification for fallback scenarios
   */
  private getEmergencyClassification(): ErrorClassification {
    return {
      error_type: 'system_error',
      severity: 'emergency',
      category: 'infrastructure',
      subcategory: 'emergency_fallback',
      is_retryable: false,
      is_transient: false,
      requires_immediate_attention: true,
      estimated_recovery_time: 0,
      impact_scope: 'system_wide',
      confidence_score: 1.0
    };
  }

  /**
   * Setup event handlers for component integration
   */
  private setupEventHandlers(): void {
    // Degradation manager events
    this.degradationManager.on('degradation_escalated', (data) => {
      this.logger.info('Degradation escalated', data);
      this.emit('degradation_changed', data);
    });
    
    this.degradationManager.on('degradation_recovered', (data) => {
      this.logger.info('Degradation recovered', data);
      this.emit('degradation_changed', data);
    });
    
    // Recovery coordinator events
    this.recoveryCoordinator.on('recovery_session_initiated', (session) => {
      this.logger.info('Recovery session initiated', {
        session_id: session.session_id
      });
    });
    
    this.recoveryCoordinator.on('recovery_session_completed', (data) => {
      this.logger.info('Recovery session completed', data);
    });
    
    // Root cause analyzer events
    this.rootCauseAnalyzer.on('analysis_completed', (analysis) => {
      this.logger.info('Root cause analysis completed', {
        analysis_id: analysis.analysis_id,
        confidence: analysis.confidence_score
      });
    });
  }

  /**
   * Get error metrics
   */
  async getErrorMetrics(timeRange: TimeRange): Promise<ErrorMetrics> {
    return await this.errorMonitor.getErrorMetrics(timeRange);
  }

  /**
   * Get error trends
   */
  async getErrorTrends(agentId?: string): Promise<ErrorTrend[]> {
    return await this.errorMonitor.getErrorTrends(agentId);
  }

  /**
   * Configure alert patterns
   */
  async configureAlerts(patterns: AlertPattern[]): Promise<void> {
    await this.errorMonitor.alertOnPatterns(patterns);
  }

  /**
   * Get current degradation level
   */
  getCurrentDegradationLevel() {
    return this.degradationManager.getCurrentLevel();
  }

  /**
   * Get circuit breaker states
   */
  getCircuitBreakerStates(): Record<string, any> {
    const states: Record<string, any> = {};
    
    for (const [name, circuitBreaker] of this.circuitBreakers) {
      states[name] = circuitBreaker.getState();
    }
    
    return states;
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): ErrorHandlingConfig {
    return {
      enable_root_cause_analysis: true,
      enable_coordinated_recovery: true,
      enable_graceful_degradation: true,
      max_concurrent_recoveries: 5,
      default_recovery_timeout: 300000, // 5 minutes
      enable_circuit_breakers: true,
      enable_monitoring: true
    };
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    // Close circuit breakers
    for (const circuitBreaker of this.circuitBreakers.values()) {
      if (typeof circuitBreaker.reset === 'function') {
        circuitBreaker.reset();
      }
    }
    
    // Cleanup degradation manager
    if (typeof this.degradationManager.destroy === 'function') {
      this.degradationManager.destroy();
    }
    
    this.removeAllListeners();
    
    this.logger.info('Error handling manager destroyed');
  }
}

// Supporting interfaces and types
export interface ErrorHandlingConfig {
  enable_root_cause_analysis: boolean;
  enable_coordinated_recovery: boolean;
  enable_graceful_degradation: boolean;
  max_concurrent_recoveries: number;
  default_recovery_timeout: number;
  enable_circuit_breakers: boolean;
  enable_monitoring: boolean;
}

export interface ErrorHandlingResult {
  error_id: string;
  classification: ErrorClassification;
  recovery_result: RecoveryResult;
  root_cause_analysis: RootCauseAnalysisResult | null;
  recovery_approach: RecoveryApproach;
  duration_ms: number;
  success: boolean;
}

export type RecoveryApproach = 'single_agent' | 'coordinated' | 'degradation_only';

interface ActiveRecovery {
  error_id: string;
  approach: RecoveryApproach;
  started_at: Date;
  promise: Promise<RecoveryResult>;
}