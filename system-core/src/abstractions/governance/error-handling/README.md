# TrustStream v4.2 - Error Handling Framework

A comprehensive error handling and recovery system designed specifically for governance agents in the TrustStream ecosystem.

## Overview

This framework provides five core components for robust error handling:

1. **Error Classification** - Intelligent error categorization and severity assessment
2. **Automated Recovery Strategies** - Circuit breakers, retries, and adaptive recovery
3. **Graceful Degradation** - System stability through controlled degradation
4. **Root Cause Analysis** - Deep error analysis and pattern detection
5. **Recovery Coordination** - Multi-agent recovery orchestration

## Architecture

```
error-handling/
├── core/                    # Core interfaces and error registry
├── classification/          # Error classification engine
├── recovery/               # Recovery strategies and circuit breakers
├── degradation/            # Graceful degradation management
├── analysis/               # Root cause analysis tools
├── coordination/           # Multi-agent recovery coordination
├── monitoring/             # Error monitoring and metrics
└── error-handling-manager.ts  # Main orchestrator
```

## Quick Start

### Basic Usage

```typescript
import { 
  ErrorHandlingManager, 
  createErrorContext,
  createErrorHandlingManager 
} from './error-handling';

// Initialize the error handling manager
const errorManager = createErrorHandlingManager(
  database,
  logger,
  {
    enable_circuit_breakers: true,
    max_recovery_attempts: 3,
    default_timeout_ms: 30000
  }
);

// Handle an error
try {
  // Your governance agent code here
  await performGovernanceTask();
} catch (error) {
  const context = createErrorContext(
    'err_001',
    'governance_agent_1',
    'consensus_agent',
    { task: 'consensus_validation', user_id: 'user123' }
  );
  
  const result = await errorManager.handleError(error, context);
  
  if (result.success) {
    console.log('Error recovered successfully');
  } else {
    console.log('Error recovery failed, system degraded');
  }
}
```

### Advanced Configuration

```typescript
import { ErrorHandlingManager } from './error-handling';

const errorManager = new ErrorHandlingManager(
  database,
  logger,
  {
    // Circuit breaker settings
    circuit_breaker_failure_threshold: 5,
    circuit_breaker_timeout_ms: 60000,
    
    // Recovery settings
    max_recovery_attempts: 3,
    default_timeout_ms: 30000,
    
    // Degradation settings
    degradation_threshold_percentage: 75,
    
    // Analysis settings
    enable_root_cause_analysis: true,
    
    // Monitoring
    monitoring_interval_ms: 5000
  }
);
```

## Core Components

### 1. Error Classification

Automatically classifies errors by:
- **Type**: System, validation, network, database, etc.
- **Severity**: Low, medium, high, critical, emergency
- **Impact Scope**: Single request, agent, cluster, system-wide
- **Retryability**: Whether the error can be retried

```typescript
const classification = await errorManager.classifier.classifyError(error, context);
console.log(classification.error_type);     // 'network_error'
console.log(classification.severity);       // 'high'
console.log(classification.is_retryable);   // true
```

### 2. Circuit Breakers

Prevent cascading failures through adaptive circuit breaking:

```typescript
const circuitBreaker = new CircuitBreaker(
  'governance_service',
  {
    failure_threshold: 5,
    recovery_timeout: 60000,
    test_request_volume: 3
  },
  logger
);

const result = await circuitBreaker.call(async () => {
  return await governanceService.performTask();
}, context);
```

### 3. Graceful Degradation

Maintain system stability by:
- Disabling non-essential features
- Using cached data
- Reducing functionality scope
- Implementing fallback mechanisms

```typescript
// Automatic degradation based on error patterns
await errorManager.degradationManager.evaluateDegradation({
  metric: 'error_rate',
  threshold: 0.1,
  window_size_ms: 300000
});
```

### 4. Root Cause Analysis

Deep analysis including:
- Error correlation analysis
- Performance impact assessment
- Pattern detection
- Trend analysis

```typescript
const analysis = await errorManager.rootCauseAnalyzer.analyzeError(context);
console.log(analysis.primary_cause);       // 'database_connection_pool_exhaustion'
console.log(analysis.contributing_factors); // ['high_load', 'memory_pressure']
```

### 5. Recovery Coordination

Coordinate recovery across multiple agents:

```typescript
// Coordinate recovery across agent cluster
const coordinatedRecovery = await errorManager.recoveryCoordinator.coordinateRecovery({
  affected_agents: ['agent1', 'agent2', 'agent3'],
  recovery_strategy: 'rolling_restart',
  max_concurrent_recoveries: 1
});
```

## Error Types and Handling

### Transient Errors
- Network timeouts
- Rate limiting
- Temporary resource unavailability

**Strategy**: Retry with exponential backoff

### Persistent Errors
- Configuration issues
- Authentication failures
- Data corruption

**Strategy**: Escalate to higher-level recovery or degradation

### Critical Errors
- Security breaches
- Data corruption
- System failures

**Strategy**: Immediate escalation and emergency procedures

## Monitoring and Metrics

The framework provides comprehensive monitoring:

```typescript
// Monitor error patterns
errorManager.on('error_handled', (result) => {
  console.log(`Error ${result.error_id} handled in ${result.duration_ms}ms`);
});

// Monitor degradation state
errorManager.on('degradation_activated', (event) => {
  console.log(`Degradation activated: ${event.reason}`);
});

// Monitor recovery coordination
errorManager.on('recovery_coordinated', (event) => {
  console.log(`Recovery coordinated for ${event.affected_agents.length} agents`);
});
```

## Error Context Structure

```typescript
interface ErrorContext {
  error_id: string;
  agent_id: string;
  agent_type: GovernanceAgentType;
  timestamp: Date;
  session_id?: string;
  task_id?: string;
  user_id?: string;
  community_id?: string;
  environment: {
    node_version: string;
    memory_usage: number;
    cpu_usage: number;
    active_connections: number;
  };
  metadata: Record<string, any>;
}
```

## Best Practices

### 1. Context Enrichment
Always provide rich context for better error analysis:

```typescript
const context = createErrorContext(
  generateErrorId(),
  agentId,
  agentType,
  {
    operation: 'consensus_validation',
    user_id: userId,
    community_id: communityId,
    request_size: requestData.length,
    retry_count: retryCount
  }
);
```

### 2. Circuit Breaker Configuration
Configure circuit breakers based on service characteristics:

```typescript
// For external API calls
const apiCircuitBreaker = new CircuitBreaker('external_api', {
  failure_threshold: 3,
  recovery_timeout: 30000,
  test_request_volume: 1
});

// For database operations
const dbCircuitBreaker = new CircuitBreaker('database', {
  failure_threshold: 5,
  recovery_timeout: 60000,
  test_request_volume: 3
});
```

### 3. Graceful Degradation Levels
Implement multiple degradation levels:

```typescript
// Level 1: Disable non-essential features
await degradationManager.setDegradationLevel('minimal', {
  disabled_features: ['advanced_analytics', 'real_time_notifications']
});

// Level 2: Use cached data
await degradationManager.setDegradationLevel('cached', {
  use_cache_only: true,
  max_cache_age: 300000
});

// Level 3: Emergency mode
await degradationManager.setDegradationLevel('emergency', {
  essential_operations_only: true
});
```

### 4. Recovery Coordination
Plan recovery strategies for different scenarios:

```typescript
// Rolling recovery for gradual restoration
await recoveryCoordinator.executeRollingRecovery({
  agents: affectedAgents,
  batch_size: 2,
  delay_between_batches: 30000
});

// Simultaneous recovery for urgent issues
await recoveryCoordinator.executeSimultaneousRecovery({
  agents: affectedAgents,
  timeout: 60000
});
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enable_circuit_breakers` | boolean | `true` | Enable circuit breaker protection |
| `enable_graceful_degradation` | boolean | `true` | Enable graceful degradation |
| `enable_root_cause_analysis` | boolean | `true` | Enable root cause analysis |
| `enable_recovery_coordination` | boolean | `true` | Enable multi-agent coordination |
| `max_recovery_attempts` | number | `3` | Maximum recovery attempts |
| `default_timeout_ms` | number | `30000` | Default operation timeout |
| `circuit_breaker_failure_threshold` | number | `5` | Circuit breaker failure threshold |
| `circuit_breaker_timeout_ms` | number | `60000` | Circuit breaker timeout |
| `degradation_threshold_percentage` | number | `75` | Degradation activation threshold |
| `monitoring_interval_ms` | number | `5000` | Monitoring check interval |

## Integration with Governance Agents

### Consensus Agent Integration

```typescript
class ConsensusAgent {
  private errorManager: ErrorHandlingManager;
  
  async validateConsensus(proposal: Proposal): Promise<ConsensusResult> {
    try {
      return await this.performConsensusValidation(proposal);
    } catch (error) {
      const context = createErrorContext(
        generateErrorId(),
        this.agentId,
        'consensus_agent',
        { proposal_id: proposal.id, validator_count: proposal.validators.length }
      );
      
      const result = await this.errorManager.handleError(error, context);
      
      if (result.success) {
        // Retry the operation
        return await this.performConsensusValidation(proposal);
      } else {
        // Return degraded result
        return this.getDegradedConsensusResult(proposal);
      }
    }
  }
}
```

### Workflow Agent Integration

```typescript
class WorkflowAgent {
  private errorManager: ErrorHandlingManager;
  
  async executeWorkflow(workflow: Workflow): Promise<WorkflowResult> {
    const circuitBreaker = this.errorManager.getCircuitBreaker(`workflow_${workflow.id}`);
    
    return await circuitBreaker.call(async () => {
      return await this.performWorkflowExecution(workflow);
    }, createErrorContext(
      generateErrorId(),
      this.agentId,
      'workflow_agent',
      { workflow_id: workflow.id, step_count: workflow.steps.length }
    ));
  }
}
```

## Testing

The framework includes comprehensive test coverage:

```bash
# Run error handling tests
npm test -- error-handling

# Run specific component tests
npm test -- circuit-breaker
npm test -- degradation-manager
npm test -- recovery-coordinator
```

## Performance Considerations

- **Circuit Breakers**: Minimal overhead (~1-2ms per call)
- **Error Classification**: ML-based classification with <10ms response time
- **Degradation Checks**: Optimized for <5ms evaluation time
- **Recovery Coordination**: Async operations to minimize blocking

## Troubleshooting

### Common Issues

1. **Circuit Breaker Not Triggering**
   - Check failure threshold configuration
   - Verify error types are being properly classified
   - Review circuit breaker state logs

2. **Degradation Not Activating**
   - Verify degradation threshold settings
   - Check metric calculation accuracy
   - Review degradation trigger conditions

3. **Recovery Coordination Failures**
   - Check agent connectivity
   - Verify coordination protocol configuration
   - Review timeout settings

### Debug Logging

Enable detailed logging for troubleshooting:

```typescript
const errorManager = new ErrorHandlingManager(db, logger, {
  log_level: 'debug',
  enable_detailed_metrics: true,
  enable_performance_tracking: true
});
```

## Future Enhancements

- Machine learning-based error prediction
- Automated recovery strategy optimization
- Cross-system error correlation
- Real-time dashboard integration
- A/B testing for recovery strategies

---

For more detailed API documentation, see the individual component README files in each subdirectory.
