# TrustStream A/B Testing Framework

A comprehensive experimentation framework for gradual rollout capability of governance agents, featuring experiment management, traffic splitting, statistical analysis, feature flags, and canary deployments.

## 🚀 Features

### Core Capabilities
- **Experiment Management System** - Complete lifecycle management for governance policy and algorithm experiments
- **Traffic Splitting & Variant Allocation** - Sophisticated user assignment with multiple allocation strategies
- **Statistical Analysis Tools** - Real-time significance testing and experiment effectiveness measurement
- **Feature Flags System** - Dynamic configuration management for governance components
- **Canary Deployment Mechanisms** - Gradual rollouts with automated monitoring and rollback

### Key Benefits
- **Risk Mitigation** - Gradual rollouts minimize impact of governance changes
- **Data-Driven Decisions** - Statistical significance testing ensures reliable results
- **Automated Monitoring** - Real-time health checks and automatic rollback capabilities
- **Flexible Configuration** - Feature flags enable dynamic behavior modification
- **Comprehensive Testing** - Built-in test suite ensures framework reliability

## 📁 Architecture

```
experimentation/
├── core/
│   ├── orchestrator.ts          # Main coordination layer
│   └── config-manager.ts        # Configuration management
├── experiments/
│   └── manager.ts               # Experiment lifecycle management
├── traffic-splitting/
│   └── splitter.ts              # User/agent assignment to variants
├── statistical-analysis/
│   └── analyzer.ts              # Statistical testing and analysis
├── feature-flags/
│   └── manager.ts               # Feature flag management
├── canary-deployment/
│   └── manager.ts               # Canary deployment orchestration
├── tests/
│   └── framework-tests.ts       # Comprehensive test suite
├── types/
│   └── index.ts                 # TypeScript type definitions
├── interfaces/
│   └── index.ts                 # Interface contracts
└── index.ts                     # Main exports and utilities
```

## 🛠 Quick Start

### Installation & Setup

```typescript
import { 
  TrustStreamExperimentationFramework,
  createGovernanceExperimentFramework 
} from './experimentation';

// Option 1: Full framework
const framework = new TrustStreamExperimentationFramework();
await framework.initialize();

// Option 2: Quick start for governance experiments
const { framework: govFramework, initialize, createExperiment } = 
  await createGovernanceExperimentFramework();

await initialize();
```

### Creating Your First Experiment

```typescript
// Create a governance agent experiment
const experiment = await createExperiment(
  'AI Leader Efficiency Test',
  'Testing new efficiency algorithms for AI leadership',
  'ai-leader-efficiency-agent'
);

console.log('Experiment created:', experiment.id);
```

### Assigning Users to Variants

```typescript
// Assign users to experiment variants
const assignment = await assignUser(
  experiment.id,
  'user_12345',
  'agent_67890'
);

console.log('User assigned to variant:', assignment.variantId);
```

### Recording Metrics

```typescript
// Record experiment metrics
await recordMetric(
  experiment.id,
  assignment.variantId,
  'effectiveness',
  0.85, // 85% effectiveness score
  'user_12345'
);
```

### Analyzing Results

```typescript
// Get statistical analysis
const results = await analyzeResults(experiment.id);
console.log('Statistical significance:', results[0].significance);

// Complete the experiment
const report = await completeExperiment(experiment.id);
console.log('Experiment completed:', report.summary);
```

## 📊 Experiment Management

### Creating Experiments

```typescript
import { ExperimentManager } from './experimentation';

const experimentManager = new ExperimentManager();

const experimentData = {
  name: 'Governance Policy Test',
  description: 'Testing new governance policy effectiveness',
  hypotheses: ['New policy will improve decision accuracy by 10%'],
  targetType: 'policy',
  targetId: 'governance_policy_v2',
  variants: [
    {
      id: 'control',
      name: 'Current Policy',
      type: 'control',
      configuration: { version: 'v1.0' },
      isControl: true,
      allocation: 50
    },
    {
      id: 'treatment',
      name: 'New Policy',
      type: 'treatment',
      configuration: { version: 'v2.0' },
      isControl: false,
      allocation: 50
    }
  ],
  metrics: [
    {
      id: 'accuracy',
      name: 'Decision Accuracy',
      type: 'primary',
      dataType: 'numeric',
      aggregation: 'average',
      statisticalTest: 't-test'
    }
  ],
  confidence: 0.95,
  power: 0.8,
  minimumSampleSize: 1000
};

const experiment = await experimentManager.createExperiment(experimentData);
```

### Experiment Lifecycle

```typescript
// Start experiment
await experimentManager.startExperiment(experiment.id);

// Monitor progress
const status = await experimentManager.getExperiment(experiment.id);
console.log('Current status:', status.status);

// Pause if needed
await experimentManager.pauseExperiment(experiment.id);

// Resume
await experimentManager.resumeExperiment(experiment.id);

// Complete
const report = await experimentManager.completeExperiment(experiment.id);
```

## 🎯 Traffic Splitting

### Allocation Strategies

```typescript
import { TrafficSplitter } from './experimentation';

const splitter = new TrafficSplitter();

// Hash-based allocation (default)
const assignment1 = await splitter.assignVariant(
  experimentId,
  'user_123',
  'agent_456'
);

// The framework supports multiple allocation algorithms:
// - hash-based: Deterministic based on user ID
// - random: Random assignment
// - segment-based: Based on user/agent characteristics
// - deterministic: Round-robin style assignment
```

### Sticky Sessions

```typescript
// Users remain in the same variant across sessions
const trafficAllocation = {
  algorithm: 'hash-based',
  stickiness: true,
  stickyDuration: 3600 // 1 hour in seconds
};
```

### Traffic Filters

```typescript
// Include/exclude users based on criteria
const trafficAllocation = {
  algorithm: 'hash-based',
  filters: [
    {
      field: 'userType',
      operator: 'equals',
      value: 'premium',
      include: true
    },
    {
      field: 'region',
      operator: 'in',
      value: ['US', 'CA', 'UK'],
      include: true
    }
  ]
};
```

## 📈 Statistical Analysis

### Real-time Metrics

```typescript
import { StatisticalAnalyzer } from './experimentation';

const analyzer = new StatisticalAnalyzer();

// Get experiment metrics
const metrics = await analyzer.getExperimentMetrics(experimentId);
console.log('Total sample size:', metrics.overallMetrics.totalSampleSize);
console.log('Variant performance:', metrics.variants);
```

### Significance Testing

```typescript
// Calculate statistical significance
const results = await analyzer.calculateSignificance(experimentId);

for (const result of results) {
  console.log(`Metric: ${result.metricId}`);
  console.log(`P-value: ${result.pValue}`);
  console.log(`Confidence: ${result.significance}`);
  console.log(`Effect size: ${result.effectSize}`);
}
```

### Sample Size Calculation

```typescript
// Calculate required sample size
const sampleSize = await analyzer.calculateSampleSize(
  0.05,  // Expected 5% effect size
  0.95,  // 95% confidence level
  0.8,   // 80% statistical power
  0.1    // 10% baseline conversion rate
);

console.log('Required sample size:', sampleSize);
```

### Anomaly Detection

```typescript
// Detect data quality issues
const anomalies = await analyzer.detectAnomalies(experimentId);

for (const anomaly of anomalies) {
  console.log(`${anomaly.type}: ${anomaly.description}`);
  console.log(`Severity: ${anomaly.severity}`);
  console.log(`Recommendations: ${anomaly.recommendations.join(', ')}`);
}
```

## 🚩 Feature Flags

### Creating Feature Flags

```typescript
import { FeatureFlagManager } from './experimentation';

const flagManager = new FeatureFlagManager();

const flagData = {
  name: 'Enhanced Governance Algorithm',
  description: 'Enable enhanced decision-making algorithm',
  key: 'enhanced_governance_algo',
  enabled: true,
  targetType: 'agent',
  targetId: 'governance_agent_1',
  rolloutPercentage: 25, // Start with 25% rollout
  environments: ['production'],
  rules: []
};

const flag = await flagManager.createFlag(flagData);
```

### Evaluating Feature Flags

```typescript
// Evaluate flag for a specific user/agent
const evaluation = await flagManager.evaluateFlag(
  'enhanced_governance_algo',
  'user_123',
  'agent_456',
  { environment: 'production', userTier: 'premium' }
);

if (evaluation.enabled) {
  // Use enhanced algorithm
  console.log('Using enhanced governance algorithm');
} else {
  // Use standard algorithm
  console.log('Using standard governance algorithm');
}
```

### Advanced Rules

```typescript
// Add conditional rules
await flagManager.addRule(flag.id, {
  name: 'Premium Users Only',
  conditions: [
    {
      field: 'userTier',
      operator: 'equals',
      value: 'premium'
    }
  ],
  enabled: true,
  rolloutPercentage: 100,
  priority: 1
});

// Add time-based rules
await flagManager.addRule(flag.id, {
  name: 'Business Hours Only',
  conditions: [
    {
      field: 'hour',
      operator: 'greater_than',
      value: 9
    },
    {
      field: 'hour',
      operator: 'less_than',
      value: 17
    }
  ],
  enabled: true,
  rolloutPercentage: 100,
  priority: 2
});
```

### Gradual Rollout

```typescript
// Gradually increase rollout percentage
await flagManager.updateRollout(flag.id, 50); // 50%
await flagManager.updateRollout(flag.id, 75); // 75%
await flagManager.updateRollout(flag.id, 100); // 100%
```

## 🕯️ Canary Deployments

### Basic Canary Setup

```typescript
import { CanaryDeploymentManager } from './experimentation';

const canaryManager = new CanaryDeploymentManager();

const canaryConfig = {
  strategy: 'canary',
  canaryConfig: {
    initialTraffic: 5,
    increments: [10, 25, 50, 100],
    promotionCriteria: [
      {
        metric: 'errorRate',
        threshold: 1,
        comparison: 'less_than',
        window: 300 // 5 minutes
      }
    ],
    monitoringMetrics: ['errorRate', 'responseTime', 'successRate'],
    automaticPromotion: false,
    rollbackThresholds: {
      errorRate: 5,
      responseTime: 1000
    }
  }
};

const deployment = await canaryManager.startCanaryDeployment(canaryConfig);
```

### Monitoring Canary Health

```typescript
// Monitor deployment health
const health = await canaryManager.monitorCanaryHealth(deployment.id);

console.log('Overall health:', health.overall);
console.log('Error rate:', health.metrics.errorRate);
console.log('Response time:', health.metrics.responseTime);

if (health.overall === 'critical') {
  console.log('Recommendations:', health.recommendations);
}
```

### Manual Promotion

```typescript
// Manually promote to next phase
await canaryManager.promoteCanary(deployment.id);

// Or rollback if issues detected
await canaryManager.rollbackCanary(deployment.id, 'High error rate detected');
```

### Automatic Rollback

```typescript
const canaryConfig = {
  strategy: 'canary',
  canaryConfig: {
    automaticPromotion: true,
    rollbackThresholds: {
      errorRate: 5,      // Rollback if error rate > 5%
      responseTime: 1000, // Rollback if response time > 1000ms
      successRate: 95    // Rollback if success rate < 95%
    }
  },
  rollbackCriteria: [
    {
      metric: 'errorRate',
      threshold: 10,
      comparison: 'greater_than',
      automatic: true
    }
  ]
};
```

## ⚙️ Configuration

### Framework Configuration

```typescript
import { ExperimentationConfigManager } from './experimentation';

const configManager = new ExperimentationConfigManager();

// Get current configuration
const config = await configManager.getConfig();

// Update configuration
await configManager.updateConfig({
  defaultConfidence: 0.99,
  defaultPower: 0.9,
  maxExperimentDuration: 60, // 60 days
  minSampleSize: 500
});

// Reset to defaults
await configManager.resetToDefaults();
```

### Environment-Specific Settings

```typescript
// Development environment
await configManager.updateConfig({
  analyticsConfig: {
    batchSize: 100,
    flushInterval: 10,
    retentionDays: 30
  },
  canaryConfig: {
    defaultIncrements: [10, 50, 100],
    monitoringInterval: 10
  }
});

// Production environment
await configManager.updateConfig({
  analyticsConfig: {
    batchSize: 1000,
    flushInterval: 60,
    retentionDays: 365
  },
  canaryConfig: {
    defaultIncrements: [5, 10, 25, 50, 75, 100],
    monitoringInterval: 30
  }
});
```

## 🧪 Testing

### Running Framework Tests

```typescript
import { runExperimentationTests } from './experimentation';

// Run comprehensive test suite
const results = await runExperimentationTests();

console.log(`Tests: ${results.passed}/${results.total} passed`);
console.log(`Pass rate: ${(results.passed/results.total*100).toFixed(1)}%`);

if (results.failed > 0) {
  console.log('Failed tests:', results.details.filter(d => d.failed > 0));
}
```

### Custom Test Suite

```typescript
import { ExperimentationFrameworkTestSuite } from './experimentation';

const testSuite = new ExperimentationFrameworkTestSuite();

// Run specific test categories
await testSuite.runExperimentManagerTests();
await testSuite.runTrafficSplitterTests();
await testSuite.runStatisticalAnalyzerTests();
await testSuite.runFeatureFlagTests();
await testSuite.runCanaryDeploymentTests();
```

## 🔧 Integration Examples

### Governance Agent Integration

```typescript
class GovernanceAgent {
  private experimentFramework: TrustStreamExperimentationFramework;
  private agentId: string;

  constructor(agentId: string) {
    this.agentId = agentId;
    this.experimentFramework = new TrustStreamExperimentationFramework();
  }

  async initialize() {
    await this.experimentFramework.initialize();
  }

  async makeDecision(context: any, userId: string): Promise<any> {
    // Check if user is in an experiment
    const experiments = await this.getActiveExperiments();
    
    for (const experiment of experiments) {
      const assignment = await this.experimentFramework.experiments
        .assignToExperiment(experiment.id, userId, this.agentId, context);
      
      // Use variant-specific algorithm
      const decision = await this.executeVariantAlgorithm(
        assignment.variantId, 
        context
      );
      
      // Record decision quality metric
      await this.experimentFramework.experiments.recordMetric(
        experiment.id,
        assignment.variantId,
        'decision_quality',
        this.evaluateDecisionQuality(decision, context),
        userId,
        this.agentId
      );
      
      return decision;
    }
    
    // Default behavior
    return await this.executeDefaultAlgorithm(context);
  }

  async getActiveExperiments() {
    // Get experiments targeting this agent
    return []; // Implementation specific
  }

  async executeVariantAlgorithm(variantId: string, context: any) {
    // Execute algorithm based on variant configuration
    return {}; // Implementation specific
  }

  async executeDefaultAlgorithm(context: any) {
    // Default decision algorithm
    return {}; // Implementation specific
  }

  evaluateDecisionQuality(decision: any, context: any): number {
    // Evaluate decision quality (0-1 scale)
    return 0.85; // Implementation specific
  }
}
```

### Policy Rollout Integration

```typescript
class PolicyManager {
  private experimentFramework: TrustStreamExperimentationFramework;

  async rolloutNewPolicy(policyId: string, newPolicyConfig: any) {
    // Create experiment for policy rollout
    const experiment = await this.experimentFramework.createQuickExperiment(
      `Policy Rollout: ${policyId}`,
      policyId
    );

    // Create feature flag for gradual enablement
    const flag = await this.createPolicyFeatureFlag(policyId, newPolicyConfig);

    // Start canary deployment
    const canaryConfig = createCanaryDeploymentConfig(5); // Start with 5%
    const deployment = await this.startCanaryDeployment(canaryConfig);

    // Monitor and promote based on metrics
    return {
      experimentId: experiment.id,
      flagKey: flag.key,
      deploymentId: deployment.id
    };
  }

  async applyPolicy(policyId: string, context: any, userId: string): Promise<any> {
    // Check feature flag
    const evaluation = await this.experimentFramework.experiments
      .evaluateGovernanceFeatureFlag(
        `policy_${policyId}`,
        userId,
        undefined,
        context
      );

    if (evaluation.enabled) {
      // Use new policy
      return await this.applyNewPolicy(policyId, context, evaluation.variant);
    } else {
      // Use existing policy
      return await this.applyExistingPolicy(policyId, context);
    }
  }
}
```

## 📚 API Reference

### Core Classes

#### ExperimentationOrchestrator
Main coordination class for the framework.

```typescript
class ExperimentationOrchestrator {
  async initialize(): Promise<void>
  async createGovernanceExperiment(data: ExperimentData, startImmediately?: boolean): Promise<Experiment>
  async startExperiment(experimentId: string): Promise<void>
  async assignToExperiment(experimentId: string, userId: string, agentId?: string, context?: any): Promise<Assignment>
  async recordMetric(experimentId: string, variantId: string, metricId: string, value: number, userId?: string, agentId?: string): Promise<void>
  async analyzeExperiment(experimentId: string): Promise<StatisticalResult[]>
  async completeExperiment(experimentId: string): Promise<ExperimentReport>
  async evaluateGovernanceFeatureFlag(flagKey: string, userId: string, agentId?: string, context?: any): Promise<FlagEvaluation>
  async getHealthStatus(): Promise<HealthStatus>
}
```

#### ExperimentManager
Manages experiment lifecycle and validation.

```typescript
class ExperimentManager {
  async createExperiment(data: ExperimentData): Promise<Experiment>
  async updateExperiment(id: string, updates: Partial<Experiment>): Promise<Experiment>
  async getExperiment(id: string): Promise<Experiment | null>
  async listExperiments(filter?: ExperimentFilter): Promise<Experiment[]>
  async startExperiment(id: string): Promise<void>
  async pauseExperiment(id: string): Promise<void>
  async resumeExperiment(id: string): Promise<void>
  async completeExperiment(id: string): Promise<ExperimentReport>
  async terminateExperiment(id: string, reason: string): Promise<void>
  async validateExperiment(experiment: Experiment): Promise<ValidationResult>
  async cloneExperiment(id: string, name: string): Promise<Experiment>
}
```

#### TrafficSplitter
Handles user assignment to experiment variants.

```typescript
class TrafficSplitter {
  async assignVariant(experimentId: string, userId: string, agentId?: string, context?: any): Promise<Assignment>
  async getAssignment(experimentId: string, userId: string): Promise<Assignment | null>
  async updateTrafficAllocation(experimentId: string, allocation: Record<string, number>): Promise<void>
  async removeUserFromExperiment(experimentId: string, userId: string): Promise<void>
  async getTrafficDistribution(experimentId: string): Promise<TrafficDistribution>
  validateTrafficAllocation(allocation: Record<string, number>): ValidationResult
  async rebalanceTraffic(experimentId: string): Promise<void>
}
```

## 🔍 Troubleshooting

### Common Issues

#### Experiment Creation Fails
```typescript
// Check validation errors
const validation = await experimentManager.validateExperiment(experimentData);
if (!validation.valid) {
  console.log('Validation errors:', validation.errors);
  console.log('Warnings:', validation.warnings);
}
```

#### Traffic Assignment Issues
```typescript
// Verify traffic allocation
const allocation = { variant1: 50, variant2: 50 };
const validation = trafficSplitter.validateTrafficAllocation(allocation);
if (!validation.valid) {
  console.log('Allocation errors:', validation.errors);
}
```

#### Statistical Analysis Problems
```typescript
// Check sample size requirements
const sampleSize = await analyzer.calculateSampleSize(0.05, 0.95, 0.8);
console.log('Required sample size:', sampleSize);

// Check for anomalies
const anomalies = await analyzer.detectAnomalies(experimentId);
if (anomalies.length > 0) {
  console.log('Data quality issues:', anomalies);
}
```

### Performance Optimization

#### Caching
```typescript
// Feature flag evaluation caching is automatic
// Clear cache when needed
featureFlagManager.clearCache();

// Statistical analysis caching
// Results are cached for 5 minutes by default
```

#### Batch Operations
```typescript
// Batch evaluate multiple feature flags
const evaluations = await featureFlagManager.evaluateFlags(
  ['flag1', 'flag2', 'flag3'],
  userId,
  agentId,
  context
);
```

## 🚀 Production Deployment

### Monitoring Setup

```typescript
// Set up health monitoring
setInterval(async () => {
  const health = await framework.getHealthStatus();
  if (!health.initialized) {
    console.error('Framework not initialized');
  }
  
  for (const [component, status] of Object.entries(health.components)) {
    if (status !== 'healthy') {
      console.warn(`Component ${component} status: ${status}`);
    }
  }
}, 30000); // Check every 30 seconds
```

### Backup and Recovery

```typescript
// Export configuration
const configManager = new ExperimentationConfigManager();
const configBackup = await configManager.exportConfig();

// Store backup
await fs.writeFile('experiment-config-backup.json', configBackup);

// Restore configuration
const restoredConfig = await fs.readFile('experiment-config-backup.json', 'utf8');
await configManager.importConfig(restoredConfig);
```

### Scaling Considerations

- **Database Storage**: Implement persistent storage for experiments and metrics
- **Event System**: Use message queues (Redis, Kafka) for high-throughput scenarios
- **Caching**: Implement distributed caching for feature flag evaluations
- **Monitoring**: Set up comprehensive monitoring and alerting
- **Load Balancing**: Distribute traffic splitting across multiple instances

## 📖 Best Practices

### Experiment Design
- Define clear hypotheses before starting experiments
- Use appropriate sample sizes for statistical power
- Set up guardrail metrics to detect negative impacts
- Plan for experiment duration and stopping criteria

### Traffic Management
- Start with small traffic allocations for new variants
- Use sticky sessions to maintain user experience consistency
- Monitor for sample ratio mismatches
- Implement proper randomization

### Statistical Analysis
- Wait for sufficient sample sizes before making decisions
- Use appropriate statistical tests for your data types
- Account for multiple testing when running multiple metrics
- Consider practical significance along with statistical significance

### Feature Flags
- Use descriptive names and clear documentation
- Implement proper access controls and approval processes
- Clean up old flags regularly
- Monitor flag evaluation performance

### Canary Deployments
- Define clear success and failure criteria
- Monitor key metrics continuously
- Have rollback procedures ready
- Test rollback mechanisms regularly

## 🤝 Contributing

### Development Setup

```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
npm install

# Run tests
npm test

# Build the project
npm run build
```

### Code Standards
- Follow TypeScript best practices
- Write comprehensive tests for new features
- Document public APIs
- Use semantic versioning for releases

### Testing Requirements
- Unit tests for all components
- Integration tests for workflows
- Performance tests for high-load scenarios
- End-to-end tests for critical paths

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation
- Run the test suite to validate setup

---

**TrustStream A/B Testing Framework v1.0.0**  
Built for reliable, scalable experimentation in governance systems.