/**
 * Core Experimentation Framework Orchestrator
 * Coordinates experiment management, traffic splitting, statistical analysis,
 * feature flags, and canary deployments for TrustStream governance agents.
 */

import {
  IExperimentManager,
  ITrafficSplitter,
  IStatisticalAnalyzer,
  IFeatureFlagManager,
  ICanaryDeploymentManager,
  IExperimentEventSystem,
  IExperimentationConfigManager,
  IExperimentReporter,
  ValidationResult
} from '../interfaces';

import {
  Experiment,
  ExperimentConfig,
  ExperimentEvent,
  ExperimentReport,
  FeatureFlag,
  FeatureFlagEvaluation,
  TrafficSplit,
  UUID,
  UserId,
  AgentId,
  ExperimentStatus,
  CanaryDeployment,
  DeploymentConfig,
  StatisticalResult,
  ExperimentationError
} from '../types';

export class ExperimentationOrchestrator {
  private experimentManager: IExperimentManager;
  private trafficSplitter: ITrafficSplitter;
  private statisticalAnalyzer: IStatisticalAnalyzer;
  private featureFlagManager: IFeatureFlagManager;
  private canaryDeploymentManager: ICanaryDeploymentManager;
  private eventSystem: IExperimentEventSystem;
  private configManager: IExperimentationConfigManager;
  private reporter: IExperimentReporter;

  private isInitialized: boolean = false;
  private config: ExperimentConfig | null = null;

  constructor(
    experimentManager: IExperimentManager,
    trafficSplitter: ITrafficSplitter,
    statisticalAnalyzer: IStatisticalAnalyzer,
    featureFlagManager: IFeatureFlagManager,
    canaryDeploymentManager: ICanaryDeploymentManager,
    eventSystem: IExperimentEventSystem,
    configManager: IExperimentationConfigManager,
    reporter: IExperimentReporter
  ) {
    this.experimentManager = experimentManager;
    this.trafficSplitter = trafficSplitter;
    this.statisticalAnalyzer = statisticalAnalyzer;
    this.featureFlagManager = featureFlagManager;
    this.canaryDeploymentManager = canaryDeploymentManager;
    this.eventSystem = eventSystem;
    this.configManager = configManager;
    this.reporter = reporter;
  }

  /**
   * Initialize the experimentation framework
   */
  async initialize(): Promise<void> {
    try {
      // Load configuration
      this.config = await this.configManager.getConfig();
      
      // Validate configuration
      const configValidation = this.configManager.validateConfig(this.config);
      if (!configValidation.valid) {
        throw new Error(`Invalid configuration: ${configValidation.errors.join(', ')}`);
      }

      // Initialize event subscriptions for monitoring
      await this.setupEventSubscriptions();

      this.isInitialized = true;

      await this.eventSystem.emit({
        experimentId: 'system',
        type: 'created',
        data: { message: 'Experimentation framework initialized' }
      });

    } catch (error) {
      throw new ExperimentationError({
        code: 'INITIALIZATION_FAILED',
        message: `Failed to initialize experimentation framework: ${error.message}`,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Create and start a new governance experiment
   */
  async createGovernanceExperiment(
    experimentData: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'>,
    startImmediately: boolean = false
  ): Promise<Experiment> {
    this.ensureInitialized();

    try {
      // Validate experiment configuration
      const tempExperiment = { ...experimentData, id: 'temp', createdAt: Date.now(), updatedAt: Date.now() } as Experiment;
      const validation = await this.experimentManager.validateExperiment(tempExperiment);
      
      if (!validation.valid) {
        throw new Error(`Experiment validation failed: ${validation.errors.join(', ')}`);
      }

      // Create the experiment
      const experiment = await this.experimentManager.createExperiment(experimentData);

      // Emit creation event
      await this.eventSystem.emit({
        experimentId: experiment.id,
        type: 'created',
        data: { experiment },
        userId: experiment.createdBy
      });

      // Start immediately if requested
      if (startImmediately) {
        await this.startExperiment(experiment.id);
      }

      return experiment;

    } catch (error) {
      throw new ExperimentationError({
        code: 'EXPERIMENT_CREATION_FAILED',
        message: `Failed to create experiment: ${error.message}`,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Start an experiment with full orchestration
   */
  async startExperiment(experimentId: UUID): Promise<void> {
    this.ensureInitialized();

    try {
      const experiment = await this.experimentManager.getExperiment(experimentId);
      if (!experiment) {
        throw new Error(`Experiment ${experimentId} not found`);
      }

      if (experiment.status !== ExperimentStatus.DRAFT) {
        throw new Error(`Experiment ${experimentId} is not in draft status`);
      }

      // Validate traffic allocation
      const allocation = experiment.variants.reduce((acc, variant) => {
        acc[variant.id] = variant.allocation;
        return acc;
      }, {} as Record<UUID, number>);

      const allocationValidation = this.trafficSplitter.validateTrafficAllocation(allocation);
      if (!allocationValidation.valid) {
        throw new Error(`Invalid traffic allocation: ${allocationValidation.errors.join(', ')}`);
      }

      // Start the experiment
      await this.experimentManager.startExperiment(experimentId);

      // Initialize canary deployments if configured
      await this.initializeCanaryDeployments(experiment);

      // Set up feature flags if applicable
      await this.initializeFeatureFlags(experiment);

      // Emit start event
      await this.eventSystem.emit({
        experimentId,
        type: 'started',
        data: { startedAt: Date.now() }
      });

    } catch (error) {
      throw new ExperimentationError({
        code: 'EXPERIMENT_START_FAILED',
        message: `Failed to start experiment: ${error.message}`,
        timestamp: Date.now(),
        experimentId
      });
    }
  }

  /**
   * Assign a user/agent to an experiment variant
   */
  async assignToExperiment(
    experimentId: UUID,
    userId: UserId,
    agentId?: AgentId,
    context?: Record<string, any>
  ): Promise<TrafficSplit> {
    this.ensureInitialized();

    try {
      const experiment = await this.experimentManager.getExperiment(experimentId);
      if (!experiment) {
        throw new Error(`Experiment ${experimentId} not found`);
      }

      if (experiment.status !== ExperimentStatus.ACTIVE) {
        throw new Error(`Experiment ${experimentId} is not active`);
      }

      // Assign to variant
      const assignment = await this.trafficSplitter.assignVariant(
        experimentId,
        userId,
        agentId,
        context
      );

      // Emit assignment event
      await this.eventSystem.emit({
        experimentId,
        type: 'variant_assigned',
        data: { assignment },
        userId,
        agentId
      });

      return assignment;

    } catch (error) {
      throw new ExperimentationError({
        code: 'ASSIGNMENT_FAILED',
        message: `Failed to assign to experiment: ${error.message}`,
        timestamp: Date.now(),
        experimentId
      });
    }
  }

  /**
   * Evaluate feature flags for governance components
   */
  async evaluateGovernanceFeatureFlag(
    flagKey: string,
    userId: UserId,
    agentId?: AgentId,
    context?: Record<string, any>
  ): Promise<FeatureFlagEvaluation> {
    this.ensureInitialized();

    try {
      const evaluation = await this.featureFlagManager.evaluateFlag(
        flagKey,
        userId,
        agentId,
        context
      );

      // Track evaluation for analytics
      await this.eventSystem.emit({
        experimentId: 'feature_flag',
        type: 'variant_assigned',
        data: { flagKey, evaluation },
        userId,
        agentId
      });

      return evaluation;

    } catch (error) {
      throw new ExperimentationError({
        code: 'FEATURE_FLAG_EVALUATION_FAILED',
        message: `Failed to evaluate feature flag: ${error.message}`,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Record a metric value for an experiment
   */
  async recordMetric(
    experimentId: UUID,
    variantId: UUID,
    metricId: UUID,
    value: number,
    userId?: UserId,
    agentId?: AgentId,
    metadata?: Record<string, any>
  ): Promise<void> {
    this.ensureInitialized();

    try {
      const metricValue = {
        experimentId,
        variantId,
        metricId,
        value,
        timestamp: Date.now(),
        userId,
        agentId,
        metadata: metadata || {}
      };

      // Process the metric
      await this.eventSystem.processMetricEvent(experimentId, variantId, metricValue);

      // Check for anomalies
      const anomalies = await this.statisticalAnalyzer.detectAnomalies(experimentId);
      if (anomalies.length > 0) {
        for (const anomaly of anomalies) {
          await this.eventSystem.emit({
            experimentId,
            type: 'created',
            data: { anomaly }
          });
        }
      }

    } catch (error) {
      throw new ExperimentationError({
        code: 'METRIC_RECORDING_FAILED',
        message: `Failed to record metric: ${error.message}`,
        timestamp: Date.now(),
        experimentId
      });
    }
  }

  /**
   * Analyze experiment results
   */
  async analyzeExperiment(experimentId: UUID): Promise<StatisticalResult[]> {
    this.ensureInitialized();

    try {
      const results = await this.statisticalAnalyzer.calculateSignificance(experimentId);

      // Check for early stopping criteria
      await this.checkEarlyStoppingCriteria(experimentId, results);

      return results;

    } catch (error) {
      throw new ExperimentationError({
        code: 'ANALYSIS_FAILED',
        message: `Failed to analyze experiment: ${error.message}`,
        timestamp: Date.now(),
        experimentId
      });
    }
  }

  /**
   * Complete an experiment and generate final report
   */
  async completeExperiment(experimentId: UUID): Promise<ExperimentReport> {
    this.ensureInitialized();

    try {
      // Generate final analysis
      const results = await this.analyzeExperiment(experimentId);

      // Complete the experiment
      const report = await this.experimentManager.completeExperiment(experimentId);

      // Clean up canary deployments
      await this.cleanupCanaryDeployments(experimentId);

      // Archive related feature flags if configured
      await this.archiveExperimentFeatureFlags(experimentId);

      // Emit completion event
      await this.eventSystem.emit({
        experimentId,
        type: 'completed',
        data: { report, completedAt: Date.now() }
      });

      return report;

    } catch (error) {
      throw new ExperimentationError({
        code: 'EXPERIMENT_COMPLETION_FAILED',
        message: `Failed to complete experiment: ${error.message}`,
        timestamp: Date.now(),
        experimentId
      });
    }
  }

  /**
   * Terminate an experiment due to issues
   */
  async terminateExperiment(experimentId: UUID, reason: string): Promise<void> {
    this.ensureInitialized();

    try {
      // Terminate the experiment
      await this.experimentManager.terminateExperiment(experimentId, reason);

      // Rollback any canary deployments
      await this.rollbackCanaryDeployments(experimentId);

      // Disable related feature flags
      await this.disableExperimentFeatureFlags(experimentId);

      // Emit termination event
      await this.eventSystem.emit({
        experimentId,
        type: 'terminated',
        data: { reason, terminatedAt: Date.now() }
      });

    } catch (error) {
      throw new ExperimentationError({
        code: 'EXPERIMENT_TERMINATION_FAILED',
        message: `Failed to terminate experiment: ${error.message}`,
        timestamp: Date.now(),
        experimentId
      });
    }
  }

  /**
   * Get comprehensive experiment status
   */
  async getExperimentStatus(experimentId: UUID): Promise<ExperimentStatus> {
    this.ensureInitialized();

    try {
      const experiment = await this.experimentManager.getExperiment(experimentId);
      if (!experiment) {
        throw new Error(`Experiment ${experimentId} not found`);
      }

      // Get traffic distribution
      const distribution = await this.trafficSplitter.getTrafficDistribution(experimentId);

      // Get current metrics
      const metrics = await this.statisticalAnalyzer.getExperimentMetrics(experimentId);

      // Get canary status if applicable
      const canaryDeployments = await this.canaryDeploymentManager.listCanaryDeployments({
        experimentId: [experimentId]
      });

      return {
        experiment,
        distribution,
        metrics,
        canaryDeployments,
        lastUpdated: Date.now()
      } as any;

    } catch (error) {
      throw new ExperimentationError({
        code: 'STATUS_RETRIEVAL_FAILED',
        message: `Failed to get experiment status: ${error.message}`,
        timestamp: Date.now(),
        experimentId
      });
    }
  }

  /**
   * Private helper methods
   */

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Experimentation framework not initialized');
    }
  }

  private async setupEventSubscriptions(): Promise<void> {
    // Subscribe to critical events for monitoring
    await this.eventSystem.subscribe('all', ['terminated', 'created'], async (event) => {
      if (event.type === 'terminated') {
        // Handle experiment termination
        console.warn(`Experiment ${event.experimentId} terminated:`, event.data);
      }
    });
  }

  private async initializeCanaryDeployments(experiment: Experiment): Promise<void> {
    for (const variant of experiment.variants) {
      if (variant.deploymentConfig) {
        await this.canaryDeploymentManager.startCanaryDeployment(variant.deploymentConfig);
      }
    }
  }

  private async initializeFeatureFlags(experiment: Experiment): Promise<void> {
    // Create feature flags for experiment variants if needed
    for (const variant of experiment.variants) {
      if (variant.configuration.featureFlag) {
        const flag: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'> = {
          name: `${experiment.name}_${variant.name}`,
          description: `Feature flag for experiment ${experiment.name}, variant ${variant.name}`,
          key: `exp_${experiment.id}_${variant.id}`,
          enabled: true,
          targetType: experiment.targetType as any,
          targetId: experiment.targetId,
          rules: [],
          rolloutPercentage: variant.allocation,
          environments: ['production'],
          createdBy: experiment.createdBy,
          metadata: {
            experimentId: experiment.id,
            variantId: variant.id
          }
        };

        await this.featureFlagManager.createFlag(flag);
      }
    }
  }

  private async checkEarlyStoppingCriteria(
    experimentId: UUID,
    results: StatisticalResult[]
  ): Promise<void> {
    // Check if experiment meets early stopping criteria
    const experiment = await this.experimentManager.getExperiment(experimentId);
    if (!experiment) return;

    for (const result of results) {
      if (result.significance >= experiment.confidence && result.pValue < 0.05) {
        // Consider early stopping
        await this.eventSystem.emit({
          experimentId,
          type: 'created',
          data: {
            message: 'Early stopping criteria met',
            metric: result.metricId,
            significance: result.significance
          }
        });
      }
    }
  }

  private async cleanupCanaryDeployments(experimentId: UUID): Promise<void> {
    const deployments = await this.canaryDeploymentManager.listCanaryDeployments({
      experimentId: [experimentId]
    });

    for (const deployment of deployments) {
      await this.canaryDeploymentManager.completeCanaryDeployment(deployment.id);
    }
  }

  private async rollbackCanaryDeployments(experimentId: UUID): Promise<void> {
    const deployments = await this.canaryDeploymentManager.listCanaryDeployments({
      experimentId: [experimentId]
    });

    for (const deployment of deployments) {
      await this.canaryDeploymentManager.rollbackCanary(deployment.id, 'Experiment terminated');
    }
  }

  private async archiveExperimentFeatureFlags(experimentId: UUID): Promise<void> {
    const flags = await this.featureFlagManager.listFlags();
    
    for (const flag of flags) {
      if (flag.metadata?.experimentId === experimentId) {
        await this.featureFlagManager.archiveFlag(flag.id);
      }
    }
  }

  private async disableExperimentFeatureFlags(experimentId: UUID): Promise<void> {
    const flags = await this.featureFlagManager.listFlags();
    
    for (const flag of flags) {
      if (flag.metadata?.experimentId === experimentId) {
        await this.featureFlagManager.toggleFlag(flag.id, false);
      }
    }
  }

  /**
   * Get orchestrator health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    return {
      initialized: this.isInitialized,
      timestamp: Date.now(),
      components: {
        experimentManager: 'healthy',
        trafficSplitter: 'healthy',
        statisticalAnalyzer: 'healthy',
        featureFlagManager: 'healthy',
        canaryDeploymentManager: 'healthy',
        eventSystem: 'healthy',
        configManager: 'healthy',
        reporter: 'healthy'
      }
    };
  }
}

interface HealthStatus {
  initialized: boolean;
  timestamp: number;
  components: Record<string, 'healthy' | 'warning' | 'error'>;
}

export default ExperimentationOrchestrator;