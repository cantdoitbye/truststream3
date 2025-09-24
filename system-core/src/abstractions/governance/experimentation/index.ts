/**
 * TrustStream A/B Testing Framework
 * 
 * A comprehensive experimentation framework for gradual rollout capability 
 * of governance agents, featuring:
 * 
 * - Experiment Management System for governance policies and algorithms
 * - Traffic Splitting and Variant Allocation
 * - Statistical Analysis Tools for measuring experiment effectiveness  
 * - Feature Flags System for governance components
 * - Canary Deployment Mechanisms with rollback capabilities
 * 
 * @author TrustStream Development Team
 * @version 1.0.0
 */

// Core Components
export { default as ExperimentationOrchestrator } from './core/orchestrator';
export { default as ExperimentationConfigManager } from './core/config-manager';

// Experiment Management
export { default as ExperimentManager } from './experiments/manager';

// Traffic Splitting
export { default as TrafficSplitter } from './traffic-splitting/splitter';

// Statistical Analysis
export { default as StatisticalAnalyzer } from './statistical-analysis/analyzer';

// Feature Flags
export { default as FeatureFlagManager } from './feature-flags/manager';

// Canary Deployments
export { default as CanaryDeploymentManager } from './canary-deployment/manager';

// Test Suite
export { 
  ExperimentationFrameworkTestSuite, 
  runExperimentationTests 
} from './tests/framework-tests';

// Type Exports
export * from './types';
export * from './interfaces';

// Factory Functions
import ExperimentManager from './experiments/manager';
import TrafficSplitter from './traffic-splitting/splitter';
import StatisticalAnalyzer from './statistical-analysis/analyzer';
import FeatureFlagManager from './feature-flags/manager';
import CanaryDeploymentManager from './canary-deployment/manager';
import ExperimentationConfigManager from './core/config-manager';
import ExperimentationOrchestrator from './core/orchestrator';

import {
  IExperimentEventSystem,
  IExperimentReporter,
  ExperimentEvent,
  ExperimentReport,
  UUID,
  UserId,
  AgentId,
  MetricValue
} from './interfaces';

/**
 * Default Event System Implementation
 */
export class DefaultEventSystem implements IExperimentEventSystem {
  private events: ExperimentEvent[] = [];
  private subscriptions: Map<string, Map<string, (event: ExperimentEvent) => void>> = new Map();

  async emit(event: Omit<ExperimentEvent, 'id' | 'timestamp'>): Promise<void> {
    const fullEvent: ExperimentEvent = {
      ...event,
      id: this.generateUUID(),
      timestamp: Date.now()
    };

    this.events.push(fullEvent);

    // Notify subscribers
    const experimentSubscribers = this.subscriptions.get(event.experimentId) || new Map();
    const allSubscribers = this.subscriptions.get('all') || new Map();

    [...experimentSubscribers.values(), ...allSubscribers.values()].forEach(callback => {
      try {
        callback(fullEvent);
      } catch (error) {
        console.error('Event callback error:', error);
      }
    });
  }

  async subscribe(
    experimentId: UUID | 'all',
    eventTypes: string[],
    callback: (event: ExperimentEvent) => void
  ): Promise<string> {
    const subscriptionId = this.generateUUID();

    if (!this.subscriptions.has(experimentId)) {
      this.subscriptions.set(experimentId, new Map());
    }

    this.subscriptions.get(experimentId)!.set(subscriptionId, callback);
    return subscriptionId;
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    for (const [experimentId, subscribers] of this.subscriptions) {
      if (subscribers.has(subscriptionId)) {
        subscribers.delete(subscriptionId);
        break;
      }
    }
  }

  async getEventHistory(experimentId: UUID, filter?: any): Promise<ExperimentEvent[]> {
    return this.events.filter(event => 
      event.experimentId === experimentId &&
      (!filter?.eventTypes || filter.eventTypes.includes(event.type)) &&
      (!filter?.startDate || event.timestamp >= filter.startDate) &&
      (!filter?.endDate || event.timestamp <= filter.endDate)
    );
  }

  async processMetricEvent(experimentId: UUID, variantId: UUID, metric: MetricValue): Promise<void> {
    await this.emit({
      experimentId,
      type: 'metric_recorded',
      data: { variantId, metric }
    });
  }

  private generateUUID(): string {
    return 'event_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
  }
}

/**
 * Default Reporter Implementation
 */
export class DefaultReporter implements IExperimentReporter {
  async generateReport(experimentId: UUID): Promise<ExperimentReport> {
    return {
      experimentId,
      generatedAt: Date.now(),
      status: 'completed' as any,
      duration: 0,
      totalSampleSize: 0,
      results: [],
      recommendations: [],
      summary: 'Report generated successfully'
    };
  }

  async getExperimentSummary(experimentId: UUID): Promise<any> {
    return {
      experimentId,
      name: 'Experiment',
      status: 'active',
      duration: 0,
      sampleSize: 0,
      significantMetrics: 0,
      confidence: 0.95,
      estimatedValue: 0
    };
  }

  async exportExperimentData(experimentId: UUID, format: string): Promise<Buffer> {
    return Buffer.from(`Experiment ${experimentId} data export (${format})`);
  }

  async generateInsightsReport(experimentIds: UUID[]): Promise<any> {
    return {
      generatedAt: Date.now(),
      experiments: [],
      overallInsights: [],
      recommendations: [],
      trends: []
    };
  }

  async getDashboardData(filter?: any): Promise<any> {
    return {
      summary: {
        totalExperiments: 0,
        activeExperiments: 0,
        completedExperiments: 0,
        totalUsers: 0
      },
      recentExperiments: [],
      performanceMetrics: {},
      alerts: []
    };
  }
}

/**
 * Factory function to create a fully configured experimentation framework
 */
export function createExperimentationFramework(options?: {
  eventSystem?: IExperimentEventSystem;
  reporter?: IExperimentReporter;
}): ExperimentationOrchestrator {
  const experimentManager = new ExperimentManager();
  const trafficSplitter = new TrafficSplitter();
  const statisticalAnalyzer = new StatisticalAnalyzer();
  const featureFlagManager = new FeatureFlagManager();
  const canaryDeploymentManager = new CanaryDeploymentManager();
  const configManager = new ExperimentationConfigManager();
  const eventSystem = options?.eventSystem || new DefaultEventSystem();
  const reporter = options?.reporter || new DefaultReporter();

  return new ExperimentationOrchestrator(
    experimentManager,
    trafficSplitter,
    statisticalAnalyzer,
    featureFlagManager,
    canaryDeploymentManager,
    eventSystem,
    configManager,
    reporter
  );
}

/**
 * Quick start function for governance experiments
 */
export async function createGovernanceExperimentFramework(): Promise<{
  framework: ExperimentationOrchestrator;
  initialize: () => Promise<void>;
  createExperiment: (name: string, description: string, targetAgentId: string) => Promise<any>;
  assignUser: (experimentId: string, userId: string, agentId?: string) => Promise<any>;
  recordMetric: (experimentId: string, variantId: string, metricId: string, value: number, userId?: string) => Promise<void>;
  analyzeResults: (experimentId: string) => Promise<any>;
  completeExperiment: (experimentId: string) => Promise<any>;
}> {
  const framework = createExperimentationFramework();

  return {
    framework,
    
    async initialize() {
      await framework.initialize();
    },

    async createExperiment(name: string, description: string, targetAgentId: string) {
      const experimentData = {
        name,
        description,
        hypotheses: [`Testing governance improvements for ${targetAgentId}`],
        status: 'draft' as any,
        targetType: 'agent' as any,
        targetId: targetAgentId,
        variants: [
          {
            id: 'control',
            name: 'Control',
            type: 'control' as any,
            configuration: { version: 'current' },
            isControl: true,
            allocation: 50
          },
          {
            id: 'treatment',
            name: 'Treatment', 
            type: 'treatment' as any,
            configuration: { version: 'improved' },
            isControl: false,
            allocation: 50
          }
        ],
        trafficAllocation: {
          algorithm: 'hash-based' as any,
          stickiness: true,
          stickyDuration: 3600
        },
        metrics: [
          {
            id: 'effectiveness',
            name: 'Governance Effectiveness',
            description: 'Measure of governance decision quality',
            type: 'primary' as any,
            dataType: 'numeric' as any,
            aggregation: 'average' as any,
            statisticalTest: 't-test' as any
          }
        ],
        startDate: 0,
        confidence: 0.95,
        power: 0.8,
        minimumSampleSize: 1000,
        createdBy: 'system',
        metadata: {}
      };

      return await framework.createGovernanceExperiment(experimentData, true);
    },

    async assignUser(experimentId: string, userId: string, agentId?: string) {
      return await framework.assignToExperiment(experimentId, userId, agentId);
    },

    async recordMetric(experimentId: string, variantId: string, metricId: string, value: number, userId?: string) {
      await framework.recordMetric(experimentId, variantId, metricId, value, userId);
    },

    async analyzeResults(experimentId: string) {
      return await framework.analyzeExperiment(experimentId);
    },

    async completeExperiment(experimentId: string) {
      return await framework.completeExperiment(experimentId);
    }
  };
}

/**
 * Utility Functions
 */

/**
 * Helper to create a basic experiment configuration
 */
export function createBasicExperimentConfig(name: string, targetId: string) {
  return {
    name,
    description: `A/B test for ${name}`,
    hypotheses: [`Testing improvements for ${name}`],
    targetType: 'agent' as any,
    targetId,
    variants: [
      {
        id: 'control',
        name: 'Control',
        type: 'control' as any,
        configuration: {},
        isControl: true,
        allocation: 50
      },
      {
        id: 'treatment',
        name: 'Treatment',
        type: 'treatment' as any,
        configuration: {},
        isControl: false,
        allocation: 50
      }
    ],
    trafficAllocation: {
      algorithm: 'hash-based' as any,
      stickiness: true
    },
    metrics: [],
    confidence: 0.95,
    power: 0.8,
    minimumSampleSize: 1000,
    createdBy: 'system',
    metadata: {}
  };
}

/**
 * Helper to create a feature flag for governance
 */
export function createGovernanceFeatureFlag(key: string, name: string, targetId?: string) {
  return {
    name,
    description: `Feature flag for ${name}`,
    key,
    enabled: true,
    targetType: 'agent' as any,
    targetId,
    rules: [],
    rolloutPercentage: 100,
    environments: ['production'],
    createdBy: 'system',
    metadata: {}
  };
}

/**
 * Helper to create canary deployment configuration
 */
export function createCanaryDeploymentConfig(initialTraffic: number = 5) {
  return {
    strategy: 'canary' as any,
    canaryConfig: {
      initialTraffic,
      increments: [10, 25, 50, 75, 100],
      promotionCriteria: [
        {
          metric: 'errorRate',
          threshold: 1,
          comparison: 'less_than' as any,
          window: 300
        }
      ],
      monitoringMetrics: ['errorRate', 'responseTime', 'successRate'],
      automaticPromotion: false,
      rollbackThresholds: {
        errorRate: 5,
        responseTime: 1000,
        successRate: 95
      }
    },
    rollbackCriteria: [
      {
        metric: 'errorRate',
        threshold: 10,
        comparison: 'greater_than' as any,
        automatic: true
      }
    ]
  };
}

/**
 * Constants and Configuration
 */
export const FRAMEWORK_VERSION = '1.0.0';

export const DEFAULT_EXPERIMENT_CONFIG = {
  confidence: 0.95,
  power: 0.8,
  minimumSampleSize: 1000,
  maxDuration: 90 // days
};

export const DEFAULT_CANARY_CONFIG = {
  initialTraffic: 5,
  increments: [5, 10, 25, 50, 75, 100],
  monitoringInterval: 30, // seconds
  promotionDelay: 300 // seconds
};

/**
 * Main Framework Class Export for Easy Usage
 */
export class TrustStreamExperimentationFramework {
  private orchestrator: ExperimentationOrchestrator;
  
  constructor(options?: {
    eventSystem?: IExperimentEventSystem;
    reporter?: IExperimentReporter;
  }) {
    this.orchestrator = createExperimentationFramework(options);
  }

  async initialize(): Promise<void> {
    await this.orchestrator.initialize();
  }

  get experiments() {
    return this.orchestrator;
  }

  async createQuickExperiment(name: string, targetAgentId: string): Promise<any> {
    const config = createBasicExperimentConfig(name, targetAgentId);
    return await this.orchestrator.createGovernanceExperiment(config, true);
  }

  async runTests(): Promise<any> {
    const { runExperimentationTests } = await import('./tests/framework-tests');
    return await runExperimentationTests();
  }

  getHealthStatus(): Promise<any> {
    return this.orchestrator.getHealthStatus();
  }
}

// Default export
export default TrustStreamExperimentationFramework;

// Framework information
export const FRAMEWORK_INFO = {
  name: 'TrustStream A/B Testing Framework',
  version: FRAMEWORK_VERSION,
  description: 'Comprehensive experimentation framework for governance agent gradual rollouts',
  components: [
    'Experiment Management',
    'Traffic Splitting', 
    'Statistical Analysis',
    'Feature Flags',
    'Canary Deployments'
  ],
  capabilities: [
    'Gradual rollout of governance policies',
    'A/B testing of governance algorithms',
    'Statistical significance testing',
    'Automatic rollback mechanisms',
    'Real-time monitoring and alerting',
    'Feature flag management',
    'Canary deployment strategies'
  ]
};