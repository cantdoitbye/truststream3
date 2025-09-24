/**
 * TrustStream v4.2 - Error Handling Framework Tests
 * Comprehensive tests and examples for the error handling system
 */

import {
  ErrorHandlingManager,
  ErrorClassifier,
  CircuitBreaker,
  DegradationManager,
  RecoveryCoordinator,
  createErrorContext,
  createErrorHandlingManager,
  isRetryableError,
  isCriticalError,
  DEFAULT_ERROR_HANDLING_CONFIG
} from './index';

// Mock dependencies for testing
class MockDatabase {
  async query(sql: string, params?: any[]): Promise<any> {
    return { rows: [], rowCount: 0 };
  }
  
  async transaction(callback: (client: any) => Promise<any>): Promise<any> {
    return await callback(this);
  }
}

class MockLogger {
  info(message: string, meta?: any): void {
    console.log(`[INFO] ${message}`, meta || '');
  }
  
  warn(message: string, meta?: any): void {
    console.log(`[WARN] ${message}`, meta || '');
  }
  
  error(message: string, meta?: any): void {
    console.log(`[ERROR] ${message}`, meta || '');
  }
  
  debug(message: string, meta?: any): void {
    console.log(`[DEBUG] ${message}`, meta || '');
  }
}

// Test scenarios
export class ErrorHandlingTests {
  private errorManager: ErrorHandlingManager;
  private mockDb: MockDatabase;
  private mockLogger: MockLogger;

  constructor() {
    this.mockDb = new MockDatabase();
    this.mockLogger = new MockLogger();
    this.errorManager = createErrorHandlingManager(
      this.mockDb,
      this.mockLogger,
      {
        ...DEFAULT_ERROR_HANDLING_CONFIG,
        max_recovery_attempts: 2,
        default_timeout_ms: 5000
      }
    );
  }

  /**
   * Test basic error handling flow
   */
  async testBasicErrorHandling(): Promise<void> {
    console.log('\n=== Testing Basic Error Handling ===');
    
    // Simulate a network error
    const networkError = new Error('Connection timeout');
    networkError.name = 'NetworkError';
    (networkError as any).code = 'ETIMEDOUT';
    
    const context = createErrorContext(
      'test_001',
      'consensus_agent_1',
      'consensus_agent',
      {
        operation: 'validate_consensus',
        request_id: 'req_123'
      }
    );
    
    try {
      const result = await this.errorManager.handleError(networkError, context);
      
      console.log('Error handling result:', {
        success: result.success,
        errorType: result.classification.error_type,
        severity: result.classification.severity,
        recoveryApproach: result.recovery_approach,
        duration: result.duration_ms
      });
      
      return result;
    } catch (error) {
      console.error('Error handling failed:', error.message);
      throw error;
    }
  }

  /**
   * Test circuit breaker functionality
   */
  async testCircuitBreaker(): Promise<void> {
    console.log('\n=== Testing Circuit Breaker ===');
    
    const circuitBreaker = new CircuitBreaker(
      'test_service',
      {
        failure_threshold: 3,
        recovery_timeout: 10000,
        test_request_volume: 1,
        rolling_window_size: 60000,
        minimum_throughput: 1,
        error_threshold_percentage: 50
      },
      this.mockLogger
    );

    const context = createErrorContext(
      'circuit_test_001',
      'test_agent',
      'consensus_agent'
    );

    let results = [];

    // Test successful operations
    console.log('Testing successful operations...');
    for (let i = 0; i < 3; i++) {
      try {
        const result = await circuitBreaker.call(async () => {
          return `Success ${i + 1}`;
        }, context);
        results.push({ attempt: i + 1, result, state: circuitBreaker.getState().current_state });
      } catch (error) {
        results.push({ attempt: i + 1, error: error.message, state: circuitBreaker.getState().current_state });
      }
    }

    // Test failing operations to trigger circuit breaker
    console.log('Testing failing operations...');
    for (let i = 0; i < 5; i++) {
      try {
        const result = await circuitBreaker.call(async () => {
          throw new Error(`Simulated failure ${i + 1}`);
        }, context);
        results.push({ attempt: i + 4, result, state: circuitBreaker.getState().current_state });
      } catch (error) {
        results.push({ attempt: i + 4, error: error.message, state: circuitBreaker.getState().current_state });
      }
    }

    console.log('Circuit breaker test results:');
    results.forEach(r => console.log(`  Attempt ${r.attempt}: ${r.result || r.error} (State: ${r.state})`));
    
    console.log('Final circuit breaker state:', circuitBreaker.getState());
  }

  /**
   * Test graceful degradation
   */
  async testGracefulDegradation(): Promise<void> {
    console.log('\n=== Testing Graceful Degradation ===');
    
    const degradationManager = new DegradationManager(this.mockDb, this.mockLogger);
    
    // Test degradation activation
    console.log('Testing degradation activation...');
    await degradationManager.evaluateDegradation({
      metric: 'error_rate',
      operator: 'gt',
      threshold: 0.1,
      window_size_ms: 300000
    });
    
    // Test degradation levels
    const levels = ['minimal', 'moderate', 'severe', 'emergency'];
    
    for (const level of levels) {
      console.log(`Setting degradation level: ${level}`);
      await degradationManager.setDegradationLevel(level as any, {
        reason: `Testing ${level} degradation`,
        disabled_features: level === 'emergency' ? ['all_non_essential'] : [`feature_${level}`],
        use_cache_only: level === 'severe' || level === 'emergency',
        max_cache_age: level === 'emergency' ? 600000 : 300000
      });
      
      const currentState = degradationManager.getCurrentState();
      console.log(`  Current state:`, {
        level: currentState.level,
        active: currentState.active,
        disabledFeatures: currentState.disabled_features?.length || 0
      });
    }
    
    // Test degradation deactivation
    console.log('Deactivating degradation...');
    await degradationManager.deactivateDegradation('Test completed');
    
    const finalState = degradationManager.getCurrentState();
    console.log('Final degradation state:', finalState);
  }

  /**
   * Test recovery coordination
   */
  async testRecoveryCoordination(): Promise<void> {
    console.log('\n=== Testing Recovery Coordination ===');
    
    const recoveryCoordinator = new RecoveryCoordinator(this.mockDb, this.mockLogger);
    
    const affectedAgents = [
      'consensus_agent_1',
      'consensus_agent_2',
      'workflow_agent_1',
      'validation_agent_1'
    ];
    
    // Test coordinated recovery
    console.log('Testing coordinated recovery...');
    const coordinationResult = await recoveryCoordinator.coordinateRecovery({
      coordination_id: 'coord_test_001',
      affected_agents: affectedAgents,
      recovery_strategy: 'rolling_restart',
      max_concurrent_recoveries: 2,
      recovery_timeout: 30000,
      coordination_timeout: 120000,
      prerequisites: []
    });
    
    console.log('Coordination result:', {
      success: coordinationResult.success,
      affectedAgents: coordinationResult.affected_agents.length,
      duration: coordinationResult.duration_ms,
      recoveredAgents: coordinationResult.recovered_agents?.length || 0
    });
    
    // Test rolling recovery
    console.log('Testing rolling recovery...');
    const rollingResult = await recoveryCoordinator.executeRollingRecovery({
      agents: affectedAgents.slice(0, 3),
      batch_size: 1,
      delay_between_batches: 1000,
      timeout: 10000
    });
    
    console.log('Rolling recovery result:', {
      success: rollingResult.success,
      totalAgents: rollingResult.total_agents,
      recoveredAgents: rollingResult.recovered_agents
    });
  }

  /**
   * Test error classification
   */
  async testErrorClassification(): Promise<void> {
    console.log('\n=== Testing Error Classification ===');
    
    const classifier = new ErrorClassifier(this.mockDb, this.mockLogger);
    
    const testErrors = [
      { error: new Error('Connection refused'), name: 'NetworkError', code: 'ECONNREFUSED' },
      { error: new Error('Invalid authentication token'), name: 'AuthenticationError' },
      { error: new Error('Database connection failed'), name: 'DatabaseError', code: 'DB_CONNECTION_FAILED' },
      { error: new Error('Rate limit exceeded'), name: 'RateLimitError', code: 'RATE_LIMIT_EXCEEDED' },
      { error: new Error('Critical system failure'), name: 'SystemError', severity: 'critical' }
    ];
    
    for (const testCase of testErrors) {
      const error = testCase.error;
      error.name = testCase.name;
      if (testCase.code) (error as any).code = testCase.code;
      if (testCase.severity) (error as any).severity = testCase.severity;
      
      const context = createErrorContext(
        `classify_test_${testErrors.indexOf(testCase)}`,
        'test_agent',
        'consensus_agent'
      );
      
      const classification = await classifier.classifyError(error, context);
      
      console.log(`${error.name}:`, {
        type: classification.error_type,
        severity: classification.severity,
        category: classification.category,
        retryable: classification.is_retryable,
        transient: classification.is_transient,
        confidence: classification.confidence_score
      });
    }
  }

  /**
   * Test utility functions
   */
  testUtilityFunctions(): void {
    console.log('\n=== Testing Utility Functions ===');
    
    // Test error type checking
    const retryableError = new Error('Timeout');
    (retryableError as any).code = 'ETIMEDOUT';
    
    const criticalError = new Error('System failure');
    (criticalError as any).severity = 'critical';
    
    console.log('Utility function tests:');
    console.log(`  Retryable error check: ${isRetryableError(retryableError)}`);
    console.log(`  Critical error check: ${isCriticalError(criticalError)}`);
    console.log(`  Normal error retryable: ${isRetryableError(new Error('Normal error'))}`);
    console.log(`  Normal error critical: ${isCriticalError(new Error('Normal error'))}`);
    
    // Test error context creation
    const context = createErrorContext(
      'utility_test_001',
      'test_agent',
      'consensus_agent',
      { custom_field: 'test_value' }
    );
    
    console.log('Created context structure:', {
      hasErrorId: !!context.error_id,
      hasAgentId: !!context.agent_id,
      hasTimestamp: !!context.timestamp,
      hasEnvironment: !!context.environment,
      hasMetadata: !!context.metadata,
      customField: context.metadata.custom_field
    });
  }

  /**
   * Test complete error handling scenario
   */
  async testCompleteScenario(): Promise<void> {
    console.log('\n=== Testing Complete Error Handling Scenario ===');
    
    // Simulate a complex governance agent error scenario
    const simulateGovernanceOperation = async (shouldFail: boolean = false) => {
      if (shouldFail) {
        const error = new Error('Consensus validation failed due to network partition');
        error.name = 'ConsensusError';
        (error as any).code = 'CONSENSUS_NETWORK_PARTITION';
        throw error;
      }
      return { status: 'success', consensus_reached: true };
    };
    
    let attempt = 0;
    const maxAttempts = 3;
    
    while (attempt < maxAttempts) {
      attempt++;
      console.log(`\nAttempt ${attempt}:`);
      
      try {
        const result = await simulateGovernanceOperation(attempt < 3); // Fail first 2 attempts
        console.log('  Operation succeeded:', result);
        break;
        
      } catch (error) {
        const context = createErrorContext(
          `scenario_test_${attempt}`,
          'consensus_agent_main',
          'consensus_agent',
          {
            operation: 'consensus_validation',
            attempt_number: attempt,
            max_attempts: maxAttempts,
            network_partition_detected: true
          }
        );
        
        console.log(`  Error occurred: ${error.message}`);
        
        const handlingResult = await this.errorManager.handleError(error, context);
        
        console.log('  Error handling result:', {
          success: handlingResult.success,
          errorType: handlingResult.classification.error_type,
          severity: handlingResult.classification.severity,
          recoveryApproach: handlingResult.recovery_approach,
          retryable: handlingResult.classification.is_retryable
        });
        
        if (!handlingResult.success && attempt === maxAttempts) {
          console.log('  All recovery attempts failed, entering degraded mode');
          break;
        }
        
        if (handlingResult.classification.is_retryable) {
          console.log(`  Will retry in ${1000 * attempt}ms...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        } else {
          console.log('  Error is not retryable, stopping attempts');
          break;
        }
      }
    }
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Error Handling Framework Tests\n');
    
    try {
      // Test utility functions first (synchronous)
      this.testUtilityFunctions();
      
      // Test individual components
      await this.testErrorClassification();
      await this.testCircuitBreaker();
      await this.testGracefulDegradation();
      await this.testRecoveryCoordination();
      
      // Test basic error handling
      await this.testBasicErrorHandling();
      
      // Test complete scenario
      await this.testCompleteScenario();
      
      console.log('\n✅ All tests completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Test suite failed:', error.message);
      throw error;
    }
  }
}

// Export for external testing
export { ErrorHandlingTests };

// Run tests if this file is executed directly
if (require.main === module) {
  const tests = new ErrorHandlingTests();
  tests.runAllTests().catch(console.error);
}

// Example usage patterns for documentation
export const ExampleUsagePatterns = {
  
  /**
   * Basic governance agent integration
   */
  basicIntegration: async () => {
    const db = new MockDatabase();
    const logger = new MockLogger();
    const errorManager = createErrorHandlingManager(db, logger);
    
    // In your governance agent
    class ConsensusAgent {
      async validateConsensus(proposal: any) {
        try {
          return await this.performValidation(proposal);
        } catch (error) {
          const context = createErrorContext(
            `consensus_${Date.now()}`,
            this.agentId,
            'consensus_agent',
            { proposal_id: proposal.id }
          );
          
          const result = await errorManager.handleError(error, context);
          
          if (result.success) {
            return await this.performValidation(proposal); // Retry
          } else {
            return this.getFallbackResult(proposal); // Degraded response
          }
        }
      }
      
      private agentId = 'consensus_agent_1';
      private async performValidation(proposal: any) { /* implementation */ }
      private getFallbackResult(proposal: any) { /* fallback implementation */ }
    }
  },
  
  /**
   * Advanced circuit breaker usage
   */
  advancedCircuitBreaker: async () => {
    const logger = new MockLogger();
    
    // Configure circuit breaker for external service
    const apiCircuitBreaker = new CircuitBreaker(
      'governance_api',
      {
        failure_threshold: 5,
        recovery_timeout: 60000,
        test_request_volume: 3,
        rolling_window_size: 300000,
        minimum_throughput: 10,
        error_threshold_percentage: 50
      },
      logger
    );
    
    // Use in service calls
    const callExternalAPI = async (data: any) => {
      const context = createErrorContext(
        `api_call_${Date.now()}`,
        'api_client',
        'integration_agent'
      );
      
      return await apiCircuitBreaker.call(async () => {
        // Your API call here
        return await fetch('/api/governance/validate', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      }, context);
    };
  },
  
  /**
   * Coordinated recovery example
   */
  coordinatedRecovery: async () => {
    const db = new MockDatabase();
    const logger = new MockLogger();
    const coordinator = new RecoveryCoordinator(db, logger);
    
    // When a cluster-wide issue is detected
    const performClusterRecovery = async (affectedAgents: string[]) => {
      return await coordinator.coordinateRecovery({
        coordination_id: `cluster_recovery_${Date.now()}`,
        affected_agents: affectedAgents,
        recovery_strategy: 'rolling_restart',
        max_concurrent_recoveries: 2,
        recovery_timeout: 30000,
        coordination_timeout: 300000,
        prerequisites: [
          {
            type: 'state_backup',
            description: 'Backup agent state before recovery',
            timeout_ms: 10000
          }
        ]
      });
    };
  }
};
