/**
 * Comprehensive Test Suite for A/B Testing Framework
 * Tests all components including experiments, traffic splitting, statistical analysis,
 * feature flags, and canary deployments
 */

import ExperimentManager from '../experiments/manager';
import TrafficSplitter from '../traffic-splitting/splitter';
import StatisticalAnalyzer from '../statistical-analysis/analyzer';
import FeatureFlagManager from '../feature-flags/manager';
import CanaryDeploymentManager from '../canary-deployment/manager';
import ExperimentationConfigManager from '../core/config-manager';
import ExperimentationOrchestrator from '../core/orchestrator';

import {
  Experiment,
  ExperimentStatus,
  VariantType,
  ExperimentMetricType,
  StatisticalTestType,
  FeatureFlag,
  DeploymentConfig,
  DeploymentStrategy,
  CanaryStatus
} from '../types';

/**
 * Mock Event System for Testing
 */
class MockEventSystem {
  private events: any[] = [];
  private subscriptions: Map<string, Function[]> = new Map();

  async emit(event: any): Promise<void> {
    this.events.push(event);
    
    const callbacks = this.subscriptions.get(event.experimentId) || [];
    const allCallbacks = this.subscriptions.get('all') || [];
    
    [...callbacks, ...allCallbacks].forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Event callback error:', error);
      }
    });
  }

  async subscribe(experimentId: string, eventTypes: string[], callback: Function): Promise<string> {
    const subscriptionId = Math.random().toString(36);
    
    if (!this.subscriptions.has(experimentId)) {
      this.subscriptions.set(experimentId, []);
    }
    
    this.subscriptions.get(experimentId)!.push(callback);
    return subscriptionId;
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    // Mock implementation
  }

  async getEventHistory(experimentId: string): Promise<any[]> {
    return this.events.filter(e => e.experimentId === experimentId);
  }

  async processMetricEvent(experimentId: string, variantId: string, metric: any): Promise<void> {
    await this.emit({
      experimentId,
      type: 'metric_recorded',
      data: { variantId, metric },
      timestamp: Date.now()
    });
  }

  getEvents(): any[] {
    return [...this.events];
  }

  clearEvents(): void {
    this.events = [];
  }
}

/**
 * Mock Reporter for Testing
 */
class MockReporter {
  async generateReport(experimentId: string): Promise<any> {
    return {
      experimentId,
      generatedAt: Date.now(),
      status: ExperimentStatus.COMPLETED,
      duration: 7 * 24 * 60 * 60 * 1000, // 7 days
      totalSampleSize: 10000,
      results: [],
      recommendations: ['Test completed successfully'],
      summary: 'Mock experiment report'
    };
  }

  async getExperimentSummary(experimentId: string): Promise<any> {
    return {
      experimentId,
      name: 'Test Experiment',
      status: ExperimentStatus.ACTIVE,
      duration: 1000000,
      sampleSize: 5000,
      significantMetrics: 1,
      confidence: 0.95,
      estimatedValue: 1000
    };
  }

  async exportExperimentData(experimentId: string, format: string): Promise<Buffer> {
    return Buffer.from('mock,export,data\n1,2,3');
  }

  async generateInsightsReport(experimentIds: string[]): Promise<any> {
    return {
      generatedAt: Date.now(),
      experiments: [],
      overallInsights: ['Mock insights'],
      recommendations: [],
      trends: []
    };
  }

  async getDashboardData(): Promise<any> {
    return {
      summary: {
        totalExperiments: 10,
        activeExperiments: 3,
        completedExperiments: 7,
        totalUsers: 50000
      },
      recentExperiments: [],
      performanceMetrics: {},
      alerts: []
    };
  }
}

/**
 * Test Suite Class
 */
export class ExperimentationFrameworkTestSuite {
  private experimentManager: ExperimentManager;
  private trafficSplitter: TrafficSplitter;
  private statisticalAnalyzer: StatisticalAnalyzer;
  private featureFlagManager: FeatureFlagManager;
  private canaryDeploymentManager: CanaryDeploymentManager;
  private configManager: ExperimentationConfigManager;
  private eventSystem: MockEventSystem;
  private reporter: MockReporter;
  private orchestrator: ExperimentationOrchestrator;

  constructor() {
    this.experimentManager = new ExperimentManager();
    this.trafficSplitter = new TrafficSplitter();
    this.statisticalAnalyzer = new StatisticalAnalyzer();
    this.featureFlagManager = new FeatureFlagManager();
    this.canaryDeploymentManager = new CanaryDeploymentManager();
    this.configManager = new ExperimentationConfigManager();
    this.eventSystem = new MockEventSystem();
    this.reporter = new MockReporter();

    this.orchestrator = new ExperimentationOrchestrator(
      this.experimentManager,
      this.trafficSplitter,
      this.statisticalAnalyzer,
      this.featureFlagManager,
      this.canaryDeploymentManager,
      this.eventSystem as any,
      this.configManager,
      this.reporter as any
    );
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<TestResults> {
    console.log('🧪 Starting A/B Testing Framework Test Suite...\n');

    const results: TestResults = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };

    // Initialize the framework
    await this.orchestrator.initialize();

    const testSuites = [
      { name: 'Experiment Manager Tests', tests: this.runExperimentManagerTests.bind(this) },
      { name: 'Traffic Splitter Tests', tests: this.runTrafficSplitterTests.bind(this) },
      { name: 'Statistical Analyzer Tests', tests: this.runStatisticalAnalyzerTests.bind(this) },
      { name: 'Feature Flag Manager Tests', tests: this.runFeatureFlagTests.bind(this) },
      { name: 'Canary Deployment Tests', tests: this.runCanaryDeploymentTests.bind(this) },
      { name: 'Configuration Manager Tests', tests: this.runConfigManagerTests.bind(this) },
      { name: 'Integration Tests', tests: this.runIntegrationTests.bind(this) }
    ];

    for (const suite of testSuites) {
      console.log(`\n📋 ${suite.name}`);
      console.log('═'.repeat(50));

      try {
        const suiteResults = await suite.tests();
        results.passed += suiteResults.passed;
        results.failed += suiteResults.failed;
        results.total += suiteResults.total;
        results.details.push({
          suite: suite.name,
          ...suiteResults
        });
      } catch (error) {
        console.error(`❌ Test suite failed: ${error.message}`);
        results.failed++;
        results.total++;
      }
    }

    this.printSummary(results);
    return results;
  }

  /**
   * Experiment Manager Tests
   */
  async runExperimentManagerTests(): Promise<TestSuiteResults> {
    const results: TestSuiteResults = { passed: 0, failed: 0, total: 0 };

    // Test 1: Create Experiment
    await this.runTest('Create Experiment', async () => {
      const experimentData = this.createMockExperimentData();
      const experiment = await this.experimentManager.createExperiment(experimentData);
      
      if (!experiment.id || experiment.name !== experimentData.name) {
        throw new Error('Experiment creation failed');
      }
      
      if (experiment.status !== ExperimentStatus.DRAFT) {
        throw new Error('New experiment should be in draft status');
      }
    }, results);

    // Test 2: Start Experiment
    await this.runTest('Start Experiment', async () => {
      const experimentData = this.createMockExperimentData();
      const experiment = await this.experimentManager.createExperiment(experimentData);
      
      await this.experimentManager.startExperiment(experiment.id);
      const updated = await this.experimentManager.getExperiment(experiment.id);
      
      if (updated?.status !== ExperimentStatus.ACTIVE) {
        throw new Error('Experiment should be active after starting');
      }
    }, results);

    // Test 3: Experiment Validation
    await this.runTest('Experiment Validation', async () => {
      const invalidExperiment = {
        ...this.createMockExperimentData(),
        variants: [] // Invalid: no variants
      };
      
      try {
        await this.experimentManager.createExperiment(invalidExperiment);
        throw new Error('Should have failed validation');
      } catch (error) {
        if (!error.message.includes('variants')) {
          throw new Error('Should fail with variant validation error');
        }
      }
    }, results);

    return results;
  }

  /**
   * Traffic Splitter Tests
   */
  async runTrafficSplitterTests(): Promise<TestSuiteResults> {
    const results: TestSuiteResults = { passed: 0, failed: 0, total: 0 };

    // Create experiment for traffic splitting
    const experiment = await this.experimentManager.createExperiment(this.createMockExperimentData());
    this.trafficSplitter.setExperiment(experiment);

    // Test 1: Assign Variant
    await this.runTest('Assign Variant', async () => {
      const assignment = await this.trafficSplitter.assignVariant(
        experiment.id,
        'user_123',
        'agent_456'
      );
      
      if (!assignment.variantId || assignment.experimentId !== experiment.id) {
        throw new Error('Variant assignment failed');
      }
    }, results);

    // Test 2: Traffic Distribution
    await this.runTest('Traffic Distribution', async () => {
      // Assign multiple users
      for (let i = 0; i < 100; i++) {
        await this.trafficSplitter.assignVariant(experiment.id, `user_${i}`);
      }
      
      const distribution = await this.trafficSplitter.getTrafficDistribution(experiment.id);
      
      if (distribution.totalUsers !== 100) {
        throw new Error(`Expected 100 users, got ${distribution.totalUsers}`);
      }
      
      if (distribution.variants.length !== experiment.variants.length) {
        throw new Error('Variant distribution mismatch');
      }
    }, results);

    // Test 3: Sticky Assignment
    await this.runTest('Sticky Assignment', async () => {
      const firstAssignment = await this.trafficSplitter.assignVariant(experiment.id, 'sticky_user');
      const secondAssignment = await this.trafficSplitter.assignVariant(experiment.id, 'sticky_user');
      
      if (firstAssignment.variantId !== secondAssignment.variantId) {
        throw new Error('Sticky assignment failed');
      }
    }, results);

    return results;
  }

  /**
   * Statistical Analyzer Tests
   */
  async runStatisticalAnalyzerTests(): Promise<TestSuiteResults> {
    const results: TestSuiteResults = { passed: 0, failed: 0, total: 0 };

    // Setup experiment for analysis
    const experiment = await this.experimentManager.createExperiment(this.createMockExperimentData());
    this.statisticalAnalyzer.setExperiment(experiment);

    // Test 1: Add Metric Values
    await this.runTest('Add Metric Values', async () => {
      const metricValue = {
        experimentId: experiment.id,
        variantId: experiment.variants[0].id,
        metricId: experiment.metrics[0].id,
        value: 1.5,
        timestamp: Date.now(),
        userId: 'test_user',
        metadata: {}
      };
      
      this.statisticalAnalyzer.addMetricValue(metricValue);
      
      const metrics = await this.statisticalAnalyzer.getExperimentMetrics(experiment.id);
      if (metrics.variants[0].sampleSize === 0) {
        throw new Error('Metric value not added');
      }
    }, results);

    // Test 2: Sample Size Calculation
    await this.runTest('Sample Size Calculation', async () => {
      const sampleSize = await this.statisticalAnalyzer.calculateSampleSize(
        0.05, // 5% effect
        0.95, // 95% confidence
        0.8,  // 80% power
        0.1   // 10% baseline rate
      );
      
      if (sampleSize <= 0) {
        throw new Error('Sample size calculation failed');
      }
    }, results);

    // Test 3: Anomaly Detection
    await this.runTest('Anomaly Detection', async () => {
      const anomalies = await this.statisticalAnalyzer.detectAnomalies(experiment.id);
      
      // Should not throw errors
      if (!Array.isArray(anomalies)) {
        throw new Error('Anomaly detection should return array');
      }
    }, results);

    return results;
  }

  /**
   * Feature Flag Tests
   */
  async runFeatureFlagTests(): Promise<TestSuiteResults> {
    const results: TestSuiteResults = { passed: 0, failed: 0, total: 0 };

    // Test 1: Create Feature Flag
    await this.runTest('Create Feature Flag', async () => {
      const flagData = this.createMockFeatureFlagData();
      const flag = await this.featureFlagManager.createFlag(flagData);
      
      if (!flag.id || flag.key !== flagData.key) {
        throw new Error('Feature flag creation failed');
      }
    }, results);

    // Test 2: Evaluate Feature Flag
    await this.runTest('Evaluate Feature Flag', async () => {
      const flagData = this.createMockFeatureFlagData();
      const flag = await this.featureFlagManager.createFlag(flagData);
      
      const evaluation = await this.featureFlagManager.evaluateFlag(
        flag.key,
        'test_user',
        'test_agent'
      );
      
      if (evaluation.flagId !== flag.id) {
        throw new Error('Feature flag evaluation failed');
      }
    }, results);

    // Test 3: Feature Flag Rules
    await this.runTest('Feature Flag Rules', async () => {
      const flagData = this.createMockFeatureFlagData();
      const flag = await this.featureFlagManager.createFlag(flagData);
      
      const rule = await this.featureFlagManager.addRule(flag.id, {
        name: 'Test Rule',
        conditions: [{
          field: 'userId',
          operator: 'equals',
          value: 'special_user'
        }],
        enabled: true,
        rolloutPercentage: 100,
        priority: 1
      });
      
      if (!rule.id) {
        throw new Error('Feature flag rule creation failed');
      }
    }, results);

    return results;
  }

  /**
   * Canary Deployment Tests
   */
  async runCanaryDeploymentTests(): Promise<TestSuiteResults> {
    const results: TestSuiteResults = { passed: 0, failed: 0, total: 0 };

    // Test 1: Start Canary Deployment
    await this.runTest('Start Canary Deployment', async () => {
      const config = this.createMockCanaryConfig();
      const deployment = await this.canaryDeploymentManager.startCanaryDeployment(config);
      
      if (!deployment.id || deployment.status !== CanaryStatus.STARTING) {
        throw new Error('Canary deployment start failed');
      }
    }, results);

    // Test 2: Monitor Canary Health
    await this.runTest('Monitor Canary Health', async () => {
      const config = this.createMockCanaryConfig();
      const deployment = await this.canaryDeploymentManager.startCanaryDeployment(config);
      
      // Wait a bit for initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const health = await this.canaryDeploymentManager.monitorCanaryHealth(deployment.id);
      
      if (!health.deploymentId || !health.overall) {
        throw new Error('Canary health monitoring failed');
      }
    }, results);

    // Test 3: Canary Metrics
    await this.runTest('Canary Metrics', async () => {
      const config = this.createMockCanaryConfig();
      const deployment = await this.canaryDeploymentManager.startCanaryDeployment(config);
      
      const metrics = await this.canaryDeploymentManager.getCanaryMetrics(deployment.id);
      
      if (!metrics.deploymentId || metrics.errorRate < 0) {
        throw new Error('Canary metrics collection failed');
      }
    }, results);

    return results;
  }

  /**
   * Configuration Manager Tests
   */
  async runConfigManagerTests(): Promise<TestSuiteResults> {
    const results: TestSuiteResults = { passed: 0, failed: 0, total: 0 };

    // Test 1: Get Configuration
    await this.runTest('Get Configuration', async () => {
      const config = await this.configManager.getConfig();
      
      if (!config.defaultConfidence || !config.defaultPower) {
        throw new Error('Configuration retrieval failed');
      }
    }, results);

    // Test 2: Update Configuration
    await this.runTest('Update Configuration', async () => {
      const updates = { defaultConfidence: 0.99 };
      const config = await this.configManager.updateConfig(updates);
      
      if (config.defaultConfidence !== 0.99) {
        throw new Error('Configuration update failed');
      }
    }, results);

    // Test 3: Configuration Validation
    await this.runTest('Configuration Validation', async () => {
      const invalidConfig = { defaultConfidence: 1.5 }; // Invalid value
      
      try {
        await this.configManager.updateConfig(invalidConfig);
        throw new Error('Should have failed validation');
      } catch (error) {
        if (!error.message.includes('confidence')) {
          throw new Error('Should fail with confidence validation error');
        }
      }
    }, results);

    return results;
  }

  /**
   * Integration Tests
   */
  async runIntegrationTests(): Promise<TestSuiteResults> {
    const results: TestSuiteResults = { passed: 0, failed: 0, total: 0 };

    // Test 1: Full Experiment Lifecycle
    await this.runTest('Full Experiment Lifecycle', async () => {
      // Create experiment through orchestrator
      const experimentData = this.createMockExperimentData();
      const experiment = await this.orchestrator.createGovernanceExperiment(experimentData, true);
      
      // Assign users
      for (let i = 0; i < 10; i++) {
        await this.orchestrator.assignToExperiment(experiment.id, `user_${i}`, `agent_${i}`);
      }
      
      // Record metrics
      for (let i = 0; i < 10; i++) {
        await this.orchestrator.recordMetric(
          experiment.id,
          experiment.variants[i % 2].id,
          experiment.metrics[0].id,
          Math.random() * 10,
          `user_${i}`,
          `agent_${i}`
        );
      }
      
      // Analyze results
      const results = await this.orchestrator.analyzeExperiment(experiment.id);
      
      if (!Array.isArray(results) || results.length === 0) {
        throw new Error('Experiment analysis failed');
      }
      
      // Complete experiment
      const report = await this.orchestrator.completeExperiment(experiment.id);
      
      if (!report.experimentId || !report.summary) {
        throw new Error('Experiment completion failed');
      }
    }, results);

    // Test 2: Feature Flag Integration
    await this.runTest('Feature Flag Integration', async () => {
      const evaluation = await this.orchestrator.evaluateGovernanceFeatureFlag(
        'test_governance_flag',
        'test_user',
        'test_agent',
        { environment: 'test' }
      );
      
      if (typeof evaluation.enabled !== 'boolean') {
        throw new Error('Feature flag integration failed');
      }
    }, results);

    // Test 3: Event System Integration
    await this.runTest('Event System Integration', async () => {
      const initialEventCount = this.eventSystem.getEvents().length;
      
      const experimentData = this.createMockExperimentData();
      await this.orchestrator.createGovernanceExperiment(experimentData);
      
      const finalEventCount = this.eventSystem.getEvents().length;
      
      if (finalEventCount <= initialEventCount) {
        throw new Error('Event system integration failed');
      }
    }, results);

    return results;
  }

  /**
   * Helper Methods
   */

  private async runTest(
    name: string,
    testFn: () => Promise<void>,
    results: TestSuiteResults
  ): Promise<void> {
    results.total++;
    
    try {
      await testFn();
      console.log(`✅ ${name}`);
      results.passed++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      results.failed++;
    }
  }

  private createMockExperimentData(): Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      name: 'Test Governance Experiment',
      description: 'Testing governance agent performance',
      hypotheses: ['Agent A will perform better than Agent B'],
      status: ExperimentStatus.DRAFT,
      targetType: 'agent',
      targetId: 'governance_agent_1',
      variants: [
        {
          id: 'variant_control',
          name: 'Control',
          type: VariantType.CONTROL,
          configuration: { algorithm: 'baseline' },
          isControl: true,
          allocation: 50
        },
        {
          id: 'variant_treatment',
          name: 'Treatment',
          type: VariantType.TREATMENT,
          configuration: { algorithm: 'optimized' },
          isControl: false,
          allocation: 50
        }
      ],
      trafficAllocation: {
        algorithm: 'hash-based',
        stickiness: true,
        stickyDuration: 3600
      },
      metrics: [
        {
          id: 'metric_accuracy',
          name: 'Decision Accuracy',
          description: 'Accuracy of governance decisions',
          type: ExperimentMetricType.PRIMARY,
          dataType: 'numeric',
          aggregation: 'average',
          statisticalTest: StatisticalTestType.T_TEST
        }
      ],
      startDate: 0,
      confidence: 0.95,
      power: 0.8,
      minimumSampleSize: 1000,
      createdBy: 'test_user',
      metadata: {}
    };
  }

  private createMockFeatureFlagData(): Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      name: 'Test Governance Flag',
      description: 'Feature flag for governance testing',
      key: 'test_governance_flag',
      enabled: true,
      targetType: 'agent',
      targetId: 'governance_agent_1',
      rules: [],
      rolloutPercentage: 100,
      environments: ['test', 'staging'],
      createdBy: 'test_user',
      metadata: {}
    };
  }

  private createMockCanaryConfig(): DeploymentConfig {
    return {
      strategy: DeploymentStrategy.CANARY,
      canaryConfig: {
        initialTraffic: 5,
        increments: [10, 25, 50, 100],
        promotionCriteria: [
          {
            metric: 'errorRate',
            threshold: 1,
            comparison: 'less_than',
            window: 300
          }
        ],
        monitoringMetrics: ['errorRate', 'responseTime'],
        automaticPromotion: false,
        rollbackThresholds: {
          errorRate: 5,
          responseTime: 1000
        }
      }
    };
  }

  private printSummary(results: TestResults): void {
    console.log('\n' + '═'.repeat(70));
    console.log('🧪 A/B TESTING FRAMEWORK TEST SUMMARY');
    console.log('═'.repeat(70));
    
    const passRate = results.total > 0 ? (results.passed / results.total * 100).toFixed(1) : '0';
    
    console.log(`📊 Total Tests: ${results.total}`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📈 Pass Rate: ${passRate}%`);
    
    if (results.failed === 0) {
      console.log('\n🎉 All tests passed! The A/B testing framework is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the errors above.');
    }
    
    console.log('\n📋 Test Suite Details:');
    for (const detail of results.details) {
      const suitePassRate = detail.total > 0 ? (detail.passed / detail.total * 100).toFixed(1) : '0';
      console.log(`  ${detail.suite}: ${detail.passed}/${detail.total} (${suitePassRate}%)`);
    }
    
    console.log('\n' + '═'.repeat(70));
  }
}

// Type definitions for test results
interface TestResults {
  passed: number;
  failed: number;
  total: number;
  details: Array<{
    suite: string;
    passed: number;
    failed: number;
    total: number;
  }>;
}

interface TestSuiteResults {
  passed: number;
  failed: number;
  total: number;
}

// Export test runner function
export async function runExperimentationTests(): Promise<TestResults> {
  const testSuite = new ExperimentationFrameworkTestSuite();
  return await testSuite.runAllTests();
}

export default ExperimentationFrameworkTestSuite;