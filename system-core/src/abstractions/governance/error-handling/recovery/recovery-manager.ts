/**
 * TrustStream v4.2 - Recovery Manager
 * Comprehensive recovery strategy execution and management
 */

import {
  IRecoveryManager,
  ErrorContext,
  ErrorClassification,
  RecoveryStrategy,
  RecoveryResult,
  RecoveryAttempt,
  RecoveryAction,
  RecoveryActionType,
  SuccessCriteria,
  RecoveryPrerequisite,
  RollbackStrategy
} from '../core/interfaces';
import { Logger } from '../../../shared-utils/logger';
import { DatabaseInterface } from '../../../shared-utils/database-interface';
import { CircuitBreaker } from './circuit-breaker';
import { EventEmitter } from 'events';

/**
 * Advanced recovery manager with intelligent strategy selection
 */
export class RecoveryManager extends EventEmitter implements IRecoveryManager {
  private db: DatabaseInterface;
  private logger: Logger;
  private strategies: Map<string, RecoveryStrategy> = new Map();
  private activeRecoveries: Map<string, ActiveRecovery> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private strategyExecutor: RecoveryStrategyExecutor;
  private strategySelector: RecoveryStrategySelector;

  constructor(
    db: DatabaseInterface,
    logger: Logger
  ) {
    super();
    this.db = db;
    this.logger = logger;
    this.strategyExecutor = new RecoveryStrategyExecutor(logger);
    this.strategySelector = new RecoveryStrategySelector();
    
    this.initializeDefaultStrategies();
  }

  /**
   * Execute recovery for an error
   */
  async executeRecovery(
    error: ErrorContext,
    classification: ErrorClassification
  ): Promise<RecoveryResult> {
    const startTime = Date.now();
    
    this.logger.info(`Starting recovery for error: ${error.error_id}`, {
      agent_id: error.agent_id,
      error_type: classification.error_type,
      severity: classification.severity
    });

    try {
      // Check if recovery is already in progress for this error
      if (this.activeRecoveries.has(error.error_id)) {
        const activeRecovery = this.activeRecoveries.get(error.error_id)!;
        return await this.waitForActiveRecovery(activeRecovery);
      }

      // Get available recovery strategies
      const availableStrategies = await this.getAvailableStrategies(classification);
      
      if (availableStrategies.length === 0) {
        throw new Error('No suitable recovery strategies found');
      }

      // Select best strategy
      const selectedStrategy = this.strategySelector.selectBestStrategy(
        availableStrategies,
        error,
        classification
      );

      // Create recovery attempt record
      const attemptId = await this.createRecoveryAttempt(
        error.error_id,
        selectedStrategy.strategy_id
      );

      // Mark recovery as active
      const activeRecovery: ActiveRecovery = {
        error_id: error.error_id,
        attempt_id: attemptId,
        strategy: selectedStrategy,
        started_at: new Date(),
        promise: null as any
      };

      // Execute recovery strategy
      const recoveryPromise = this.executeRecoveryStrategy(
        selectedStrategy,
        error,
        classification,
        attemptId
      );
      
      activeRecovery.promise = recoveryPromise;
      this.activeRecoveries.set(error.error_id, activeRecovery);

      const result = await recoveryPromise;
      
      // Update attempt record
      await this.updateRecoveryAttempt(attemptId, result);
      
      // Clean up active recovery
      this.activeRecoveries.delete(error.error_id);

      const duration = Date.now() - startTime;
      this.logger.info(`Recovery completed for error: ${error.error_id}`, {
        success: result.success,
        duration_ms: duration,
        strategy_used: selectedStrategy.name
      });

      this.emit('recovery_completed', {
        error_id: error.error_id,
        result,
        duration_ms: duration
      });

      return result;

    } catch (recoveryError) {
      const duration = Date.now() - startTime;
      this.logger.error('Recovery failed', {
        error_id: error.error_id,
        recovery_error: recoveryError.message,
        duration_ms: duration
      });

      this.activeRecoveries.delete(error.error_id);

      const failedResult: RecoveryResult = {
        success: false,
        strategy_used: null as any,
        actions_executed: [],
        duration_ms: duration,
        error_resolved: false,
        side_effects: [recoveryError.message],
        rollback_required: false
      };

      this.emit('recovery_failed', {
        error_id: error.error_id,
        error: recoveryError.message
      });

      return failedResult;
    }
  }

  /**
   * Execute a specific recovery strategy
   */
  private async executeRecoveryStrategy(
    strategy: RecoveryStrategy,
    error: ErrorContext,
    classification: ErrorClassification,
    attemptId: string
  ): Promise<RecoveryResult> {
    this.logger.debug(`Executing recovery strategy: ${strategy.name}`, {
      strategy_id: strategy.strategy_id,
      error_id: error.error_id
    });

    // Check prerequisites
    const prerequisiteCheck = await this.checkPrerequisites(
      strategy.prerequisites,
      error
    );
    
    if (!prerequisiteCheck.success) {
      throw new Error(`Prerequisites not met: ${prerequisiteCheck.failures.join(', ')}`);
    }

    // Execute recovery with circuit breaker protection
    const circuitBreaker = this.getOrCreateCircuitBreaker(
      `recovery_${strategy.strategy_id}`,
      {
        failure_threshold: 3,
        recovery_timeout: 30000,
        test_request_volume: 1,
        rolling_window_size: 60000,
        minimum_throughput: 1,
        error_threshold_percentage: 50
      }
    );

    return await circuitBreaker.call(async () => {
      return await this.strategyExecutor.execute(
        strategy,
        error,
        classification,
        (action, status) => this.onActionUpdate(attemptId, action, status)
      );
    }, error);
  }

  /**
   * Get available strategies for an error classification
   */
  async getAvailableStrategies(
    classification: ErrorClassification
  ): Promise<RecoveryStrategy[]> {
    const allStrategies = Array.from(this.strategies.values());
    
    return allStrategies.filter(strategy => {
      // Check if strategy applies to this error type
      if (!strategy.applicable_error_types.includes(classification.error_type)) {
        return false;
      }
      
      // Check if strategy applies to this severity
      if (!strategy.applicable_severities.includes(classification.severity)) {
        return false;
      }
      
      return true;
    }).sort((a, b) => b.priority - a.priority); // Sort by priority
  }

  /**
   * Register a new recovery strategy
   */
  async registerStrategy(strategy: RecoveryStrategy): Promise<void> {
    this.logger.info(`Registering recovery strategy: ${strategy.name}`, {
      strategy_id: strategy.strategy_id,
      applicable_errors: strategy.applicable_error_types
    });
    
    this.strategies.set(strategy.strategy_id, strategy);
    
    // Store in database
    await this.storeStrategy(strategy);
    
    this.emit('strategy_registered', strategy);
  }

  /**
   * Get recovery history for an agent
   */
  async getRecoveryHistory(agentId: string): Promise<RecoveryAttempt[]> {
    try {
      const query = `
        SELECT ra.*, rs.name as strategy_name
        FROM recovery_attempts ra
        JOIN recovery_strategies rs ON ra.strategy_id = rs.strategy_id
        JOIN error_contexts ec ON ra.error_id = ec.error_id
        WHERE ec.agent_id = $1
        ORDER BY ra.started_at DESC
        LIMIT 100
      `;
      
      const result = await this.db.query(query, [agentId]);
      return result.rows || [];
      
    } catch (dbError) {
      this.logger.error('Failed to get recovery history', {
        agent_id: agentId,
        error: dbError.message
      });
      return [];
    }
  }

  /**
   * Check prerequisites for a strategy
   */
  private async checkPrerequisites(
    prerequisites: RecoveryPrerequisite[],
    error: ErrorContext
  ): Promise<PrerequisiteCheckResult> {
    const failures: string[] = [];
    
    for (const prerequisite of prerequisites) {
      try {
        const isValid = await Promise.race([
          prerequisite.validator(error),
          new Promise<boolean>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), prerequisite.timeout_ms)
          )
        ]);
        
        if (!isValid) {
          failures.push(prerequisite.description);
        }
        
      } catch (error) {
        failures.push(`${prerequisite.description}: ${error.message}`);
      }
    }
    
    return {
      success: failures.length === 0,
      failures
    };
  }

  /**
   * Get or create circuit breaker for strategy
   */
  private getOrCreateCircuitBreaker(
    name: string,
    config: any
  ): CircuitBreaker {
    if (!this.circuitBreakers.has(name)) {
      const circuitBreaker = new CircuitBreaker(name, config, this.logger);
      this.circuitBreakers.set(name, circuitBreaker);
    }
    
    return this.circuitBreakers.get(name)!;
  }

  /**
   * Wait for active recovery to complete
   */
  private async waitForActiveRecovery(
    activeRecovery: ActiveRecovery
  ): Promise<RecoveryResult> {
    this.logger.debug(`Waiting for active recovery: ${activeRecovery.error_id}`);
    return await activeRecovery.promise;
  }

  /**
   * Create recovery attempt record
   */
  private async createRecoveryAttempt(
    errorId: string,
    strategyId: string
  ): Promise<string> {
    try {
      const query = `
        INSERT INTO recovery_attempts (
          attempt_id, error_id, strategy_id, started_at, status
        ) VALUES (gen_random_uuid(), $1, $2, NOW(), 'executing')
        RETURNING attempt_id
      `;
      
      const result = await this.db.query(query, [errorId, strategyId]);
      return result.rows[0].attempt_id;
      
    } catch (dbError) {
      this.logger.warn('Failed to create recovery attempt record', {
        error_id: errorId,
        error: dbError.message
      });
      return `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * Update recovery attempt record
   */
  private async updateRecoveryAttempt(
    attemptId: string,
    result: RecoveryResult
  ): Promise<void> {
    try {
      const query = `
        UPDATE recovery_attempts SET
          completed_at = NOW(),
          status = $2,
          result_data = $3,
          updated_at = NOW()
        WHERE attempt_id = $1
      `;
      
      const params = [
        attemptId,
        result.success ? 'completed' : 'failed',
        JSON.stringify(result)
      ];
      
      await this.db.query(query, params);
      
    } catch (dbError) {
      this.logger.warn('Failed to update recovery attempt', {
        attempt_id: attemptId,
        error: dbError.message
      });
    }
  }

  /**
   * Store recovery strategy in database
   */
  private async storeStrategy(strategy: RecoveryStrategy): Promise<void> {
    try {
      const query = `
        INSERT INTO recovery_strategies (
          strategy_id, name, description, applicable_error_types,
          applicable_severities, priority, max_attempts, timeout_ms,
          estimated_recovery_time, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (strategy_id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          applicable_error_types = EXCLUDED.applicable_error_types,
          applicable_severities = EXCLUDED.applicable_severities,
          priority = EXCLUDED.priority,
          max_attempts = EXCLUDED.max_attempts,
          timeout_ms = EXCLUDED.timeout_ms,
          estimated_recovery_time = EXCLUDED.estimated_recovery_time,
          updated_at = NOW()
      `;
      
      const params = [
        strategy.strategy_id,
        strategy.name,
        strategy.description,
        JSON.stringify(strategy.applicable_error_types),
        JSON.stringify(strategy.applicable_severities),
        strategy.priority,
        strategy.max_attempts,
        strategy.timeout_ms,
        strategy.estimated_recovery_time
      ];
      
      await this.db.query(query, params);
      
    } catch (dbError) {
      this.logger.warn('Failed to store recovery strategy', {
        strategy_id: strategy.strategy_id,
        error: dbError.message
      });
    }
  }

  /**
   * Handle action update during recovery
   */
  private onActionUpdate(
    attemptId: string,
    action: RecoveryAction,
    status: 'started' | 'completed' | 'failed' | 'skipped'
  ): void {
    this.logger.debug(`Recovery action ${status}: ${action.action_id}`, {
      attempt_id: attemptId,
      action_type: action.type
    });
    
    this.emit('action_update', {
      attempt_id: attemptId,
      action,
      status
    });
  }

  /**
   * Initialize default recovery strategies
   */
  private initializeDefaultStrategies(): void {
    const defaultStrategies: RecoveryStrategy[] = [
      // Agent restart strategy
      {
        strategy_id: 'agent_restart',
        name: 'Agent Restart',
        description: 'Restart the failing agent process',
        applicable_error_types: ['system_error', 'resource_exhaustion', 'agent_coordination_error'],
        applicable_severities: ['medium', 'high', 'critical'],
        priority: 80,
        max_attempts: 3,
        timeout_ms: 120000, // 2 minutes
        success_criteria: {
          health_check_passes: true,
          response_time_threshold: 5000,
          error_rate_threshold: 0.1,
          success_rate_threshold: 0.9,
          custom_checks: []
        },
        prerequisites: [],
        estimated_recovery_time: 60000 // 1 minute
      },
      
      // Circuit breaker strategy
      {
        strategy_id: 'circuit_breaker_activation',
        name: 'Circuit Breaker Activation',
        description: 'Activate circuit breaker to prevent cascade failures',
        applicable_error_types: ['network_error', 'timeout_error', 'dependency_error'],
        applicable_severities: ['medium', 'high'],
        priority: 90,
        max_attempts: 1,
        timeout_ms: 5000,
        success_criteria: {
          health_check_passes: false,
          response_time_threshold: 1000,
          error_rate_threshold: 0.0,
          success_rate_threshold: 1.0,
          custom_checks: []
        },
        prerequisites: [],
        estimated_recovery_time: 5000
      },
      
      // Database connection reset
      {
        strategy_id: 'db_connection_reset',
        name: 'Database Connection Reset',
        description: 'Reset database connection pool',
        applicable_error_types: ['database_error'],
        applicable_severities: ['medium', 'high'],
        priority: 70,
        max_attempts: 2,
        timeout_ms: 30000,
        success_criteria: {
          health_check_passes: true,
          response_time_threshold: 3000,
          error_rate_threshold: 0.05,
          success_rate_threshold: 0.95,
          custom_checks: []
        },
        prerequisites: [],
        estimated_recovery_time: 15000
      },
      
      // Graceful degradation
      {
        strategy_id: 'graceful_degradation',
        name: 'Graceful Degradation',
        description: 'Enable degraded mode with reduced functionality',
        applicable_error_types: ['resource_exhaustion', 'dependency_error', 'system_error'],
        applicable_severities: ['medium', 'high', 'critical'],
        priority: 60,
        max_attempts: 1,
        timeout_ms: 10000,
        success_criteria: {
          health_check_passes: true,
          response_time_threshold: 10000,
          error_rate_threshold: 0.2,
          success_rate_threshold: 0.8,
          custom_checks: []
        },
        prerequisites: [],
        estimated_recovery_time: 5000
      },
      
      // Cache clear strategy
      {
        strategy_id: 'cache_clear',
        name: 'Cache Clear',
        description: 'Clear application caches to resolve data inconsistencies',
        applicable_error_types: ['data_corruption_error', 'business_logic_error'],
        applicable_severities: ['low', 'medium'],
        priority: 50,
        max_attempts: 1,
        timeout_ms: 15000,
        success_criteria: {
          health_check_passes: true,
          response_time_threshold: 5000,
          error_rate_threshold: 0.1,
          success_rate_threshold: 0.9,
          custom_checks: []
        },
        prerequisites: [],
        estimated_recovery_time: 10000
      }
    ];

    defaultStrategies.forEach(strategy => {
      this.strategies.set(strategy.strategy_id, strategy);
    });

    this.logger.info(`Initialized ${defaultStrategies.length} default recovery strategies`);
  }
}

/**
 * Recovery strategy executor
 */
class RecoveryStrategyExecutor {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Execute a recovery strategy
   */
  async execute(
    strategy: RecoveryStrategy,
    error: ErrorContext,
    classification: ErrorClassification,
    onActionUpdate: (action: RecoveryAction, status: string) => void
  ): Promise<RecoveryResult> {
    const startTime = Date.now();
    const executedActions: RecoveryAction[] = [];
    const sideEffects: string[] = [];
    let rollbackRequired = false;

    try {
      // Generate recovery actions based on strategy
      const actions = this.generateRecoveryActions(strategy, error, classification);
      
      this.logger.debug(`Executing ${actions.length} recovery actions`, {
        strategy_id: strategy.strategy_id,
        error_id: error.error_id
      });

      // Execute actions sequentially
      for (const action of actions) {
        onActionUpdate(action, 'started');
        
        try {
          await this.executeAction(action, error);
          executedActions.push(action);
          onActionUpdate(action, 'completed');
          
        } catch (actionError) {
          this.logger.error(`Recovery action failed: ${action.action_id}`, {
            error: actionError.message,
            action_type: action.type
          });
          
          onActionUpdate(action, 'failed');
          rollbackRequired = true;
          sideEffects.push(`Action ${action.action_id} failed: ${actionError.message}`);
          break;
        }
      }

      // Verify success criteria
      const verificationResult = await this.verifySuccessCriteria(
        strategy.success_criteria,
        error
      );

      const duration = Date.now() - startTime;
      
      const result: RecoveryResult = {
        success: verificationResult.success,
        strategy_used: strategy,
        actions_executed: executedActions,
        duration_ms: duration,
        error_resolved: verificationResult.success,
        side_effects: sideEffects,
        rollback_required: rollbackRequired && !verificationResult.success
      };

      // Execute rollback if needed
      if (result.rollback_required && strategy.rollback_strategy) {
        await this.executeRollback(strategy.rollback_strategy, error);
      }

      return result;

    } catch (strategyError) {
      const duration = Date.now() - startTime;
      
      this.logger.error('Recovery strategy execution failed', {
        strategy_id: strategy.strategy_id,
        error: strategyError.message
      });

      return {
        success: false,
        strategy_used: strategy,
        actions_executed: executedActions,
        duration_ms: duration,
        error_resolved: false,
        side_effects: [...sideEffects, strategyError.message],
        rollback_required: true
      };
    }
  }

  /**
   * Generate recovery actions for a strategy
   */
  private generateRecoveryActions(
    strategy: RecoveryStrategy,
    error: ErrorContext,
    classification: ErrorClassification
  ): RecoveryAction[] {
    const actions: RecoveryAction[] = [];
    
    // Generate actions based on strategy type
    switch (strategy.strategy_id) {
      case 'agent_restart':
        actions.push({
          action_id: 'restart_agent_process',
          type: 'restart_agent',
          description: 'Restart the agent process',
          parameters: { agent_id: error.agent_id },
          timeout_ms: 60000,
          dependencies: []
        });
        break;
        
      case 'circuit_breaker_activation':
        actions.push({
          action_id: 'open_circuit_breaker',
          type: 'circuit_breaker_open',
          description: 'Open circuit breaker to prevent cascade failures',
          parameters: { 
            circuit_name: `agent_${error.agent_id}`,
            timeout: 30000
          },
          timeout_ms: 5000,
          dependencies: []
        });
        break;
        
      case 'db_connection_reset':
        actions.push({
          action_id: 'reset_db_connections',
          type: 'reset_connections',
          description: 'Reset database connection pool',
          parameters: { connection_type: 'database' },
          timeout_ms: 30000,
          dependencies: []
        });
        break;
        
      case 'graceful_degradation':
        actions.push({
          action_id: 'enable_degraded_mode',
          type: 'fallback_mode',
          description: 'Enable graceful degradation mode',
          parameters: { 
            degradation_level: this.determineDegradationLevel(classification)
          },
          timeout_ms: 10000,
          dependencies: []
        });
        break;
        
      case 'cache_clear':
        actions.push({
          action_id: 'clear_application_cache',
          type: 'clear_cache',
          description: 'Clear application caches',
          parameters: { cache_types: ['memory', 'redis'] },
          timeout_ms: 15000,
          dependencies: []
        });
        break;
    }
    
    return actions;
  }

  /**
   * Execute a single recovery action
   */
  private async executeAction(
    action: RecoveryAction,
    error: ErrorContext
  ): Promise<void> {
    this.logger.debug(`Executing recovery action: ${action.action_id}`, {
      type: action.type,
      description: action.description
    });

    // Simulate action execution (in real implementation, this would call actual services)
    switch (action.type) {
      case 'restart_agent':
        await this.simulateAgentRestart(action.parameters.agent_id);
        break;
        
      case 'circuit_breaker_open':
        await this.simulateCircuitBreakerOpen(action.parameters.circuit_name);
        break;
        
      case 'reset_connections':
        await this.simulateConnectionReset(action.parameters.connection_type);
        break;
        
      case 'fallback_mode':
        await this.simulateFallbackMode(action.parameters.degradation_level);
        break;
        
      case 'clear_cache':
        await this.simulateCacheClear(action.parameters.cache_types);
        break;
        
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Verify success criteria
   */
  private async verifySuccessCriteria(
    criteria: SuccessCriteria,
    error: ErrorContext
  ): Promise<{ success: boolean; details: string[] }> {
    const details: string[] = [];
    let allPassed = true;

    // Health check verification
    if (criteria.health_check_passes) {
      const healthCheckPassed = await this.simulateHealthCheck(error.agent_id);
      if (!healthCheckPassed) {
        allPassed = false;
        details.push('Health check failed');
      }
    }

    // Custom checks
    for (const check of criteria.custom_checks) {
      try {
        const checkPassed = await check.validator({});
        if (!checkPassed) {
          allPassed = false;
          details.push(`Custom check failed: ${check.name}`);
        }
      } catch (checkError) {
        allPassed = false;
        details.push(`Custom check error: ${check.name} - ${checkError.message}`);
      }
    }

    return { success: allPassed, details };
  }

  /**
   * Execute rollback strategy
   */
  private async executeRollback(
    rollbackStrategy: RollbackStrategy,
    error: ErrorContext
  ): Promise<void> {
    this.logger.warn(`Executing rollback strategy: ${rollbackStrategy.strategy_id}`);
    
    for (const action of rollbackStrategy.actions) {
      try {
        await this.executeAction(action, error);
      } catch (rollbackError) {
        this.logger.error(`Rollback action failed: ${action.action_id}`, {
          error: rollbackError.message
        });
      }
    }
  }

  /**
   * Determine degradation level based on classification
   */
  private determineDegradationLevel(classification: ErrorClassification): number {
    switch (classification.severity) {
      case 'low': return 1;
      case 'medium': return 2;
      case 'high': return 3;
      case 'critical': return 4;
      case 'emergency': return 5;
      default: return 2;
    }
  }

  // Simulation methods (replace with actual implementations)
  private async simulateAgentRestart(agentId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 2000));
    this.logger.info(`Simulated agent restart: ${agentId}`);
  }

  private async simulateCircuitBreakerOpen(circuitName: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
    this.logger.info(`Simulated circuit breaker open: ${circuitName}`);
  }

  private async simulateConnectionReset(connectionType: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1500));
    this.logger.info(`Simulated connection reset: ${connectionType}`);
  }

  private async simulateFallbackMode(level: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.logger.info(`Simulated fallback mode activation: level ${level}`);
  }

  private async simulateCacheClear(cacheTypes: string[]): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 800));
    this.logger.info(`Simulated cache clear: ${cacheTypes.join(', ')}`);
  }

  private async simulateHealthCheck(agentId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return Math.random() > 0.2; // 80% success rate
  }
}

/**
 * Recovery strategy selector
 */
class RecoveryStrategySelector {
  /**
   * Select the best recovery strategy
   */
  selectBestStrategy(
    strategies: RecoveryStrategy[],
    error: ErrorContext,
    classification: ErrorClassification
  ): RecoveryStrategy {
    if (strategies.length === 0) {
      throw new Error('No strategies available');
    }
    
    if (strategies.length === 1) {
      return strategies[0];
    }

    // Score strategies based on multiple factors
    const scoredStrategies = strategies.map(strategy => ({
      strategy,
      score: this.calculateStrategyScore(strategy, error, classification)
    }));

    // Sort by score (highest first)
    scoredStrategies.sort((a, b) => b.score - a.score);
    
    return scoredStrategies[0].strategy;
  }

  /**
   * Calculate strategy score
   */
  private calculateStrategyScore(
    strategy: RecoveryStrategy,
    error: ErrorContext,
    classification: ErrorClassification
  ): number {
    let score = strategy.priority; // Base score from priority
    
    // Prefer strategies with shorter recovery times for urgent errors
    if (classification.requires_immediate_attention) {
      score += (60000 - strategy.estimated_recovery_time) / 1000; // Prefer faster recovery
    }
    
    // Prefer strategies with higher success rates for critical errors
    if (classification.severity === 'critical' || classification.severity === 'emergency') {
      score += 20; // Boost for critical errors
    }
    
    // Consider impact scope
    if (classification.impact_scope === 'system_wide') {
      score += 15; // Prefer strategies for system-wide issues
    }
    
    return score;
  }
}

// Supporting interfaces
interface ActiveRecovery {
  error_id: string;
  attempt_id: string;
  strategy: RecoveryStrategy;
  started_at: Date;
  promise: Promise<RecoveryResult>;
}

interface PrerequisiteCheckResult {
  success: boolean;
  failures: string[];
}