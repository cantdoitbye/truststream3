/**
 * Canary Deployment Manager Implementation
 * Handles gradual rollouts with monitoring and automatic rollback capabilities
 */

import {
  ICanaryDeploymentManager,
  CanaryDeployment,
  CanaryFilter,
  CanaryHealthStatus,
  CanaryMetricHealth,
  CanaryMetrics,
  ValidationResult
} from '../interfaces';

import {
  DeploymentConfig,
  CanaryConfig,
  PromotionCriteria,
  RollbackCriteria,
  GradualRolloutPlan,
  RolloutPhase,
  CanaryEvent,
  UUID,
  ExperimentationError,
  CanaryStatus
} from '../types';

export class CanaryDeploymentManager implements ICanaryDeploymentManager {
  private deployments: Map<UUID, CanaryDeployment> = new Map();
  private activeMonitoring: Map<UUID, NodeJS.Timeout> = new Map();
  private metricCollectors: Map<UUID, MetricCollector> = new Map();
  
  private readonly MONITORING_INTERVAL = 30 * 1000; // 30 seconds
  private readonly PROMOTION_DELAY = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_ROLLBACK_ATTEMPTS = 3;

  /**
   * Start a canary deployment
   */
  async startCanaryDeployment(config: DeploymentConfig): Promise<CanaryDeployment> {
    try {
      // Validate configuration
      const validation = this.validateCanaryConfig(config);
      if (!validation.valid) {
        throw new Error(`Invalid canary configuration: ${validation.errors.join(', ')}`);
      }

      const id = this.generateUUID();
      const now = Date.now();

      const deployment: CanaryDeployment = {
        id,
        config,
        status: CanaryStatus.STARTING,
        currentPhase: 0,
        currentTrafficPercentage: config.canaryConfig?.initialTraffic || 5,
        startedAt: now,
        events: [],
        metrics: {
          deploymentId: id,
          errorRate: 0,
          responseTime: 0,
          throughput: 0,
          successRate: 100,
          customMetrics: {},
          collectedAt: now
        }
      };

      // Store deployment
      this.deployments.set(id, deployment);

      // Initialize metric collection
      await this.initializeMetricCollection(id);

      // Start monitoring
      await this.startMonitoring(id);

      // Add initial event
      await this.addEvent(id, {
        id: this.generateUUID(),
        deploymentId: id,
        type: 'started',
        timestamp: now,
        triggeredBy: 'manual'
      });

      // Begin initial phase
      await this.beginPhase(id, 0);

      return deployment;

    } catch (error) {
      throw new ExperimentationError({
        code: 'CANARY_START_ERROR',
        message: `Failed to start canary deployment: ${error.message}`,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Update canary deployment configuration
   */
  async updateCanaryDeployment(deploymentId: UUID, config: Partial<DeploymentConfig>): Promise<CanaryDeployment> {
    try {
      const deployment = this.deployments.get(deploymentId);
      if (!deployment) {
        throw new Error(`Canary deployment ${deploymentId} not found`);
      }

      if (deployment.status === CanaryStatus.COMPLETED || deployment.status === CanaryStatus.ROLLED_BACK) {
        throw new Error(`Cannot update completed or rolled back deployment`);
      }

      const updatedConfig = { ...deployment.config, ...config };
      
      // Validate updated configuration
      const validation = this.validateCanaryConfig(updatedConfig);
      if (!validation.valid) {
        throw new Error(`Invalid updated configuration: ${validation.errors.join(', ')}`);
      }

      const updatedDeployment: CanaryDeployment = {
        ...deployment,
        config: updatedConfig
      };

      this.deployments.set(deploymentId, updatedDeployment);

      await this.addEvent(deploymentId, {
        id: this.generateUUID(),
        deploymentId,
        type: 'started', // Configuration updated
        timestamp: Date.now(),
        triggeredBy: 'manual'
      });

      return updatedDeployment;

    } catch (error) {
      throw new ExperimentationError({
        code: 'CANARY_UPDATE_ERROR',
        message: `Failed to update canary deployment: ${error.message}`,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get canary deployment status
   */
  async getCanaryDeployment(deploymentId: UUID): Promise<CanaryDeployment | null> {
    return this.deployments.get(deploymentId) || null;
  }

  /**
   * List active canary deployments
   */
  async listCanaryDeployments(filter?: CanaryFilter): Promise<CanaryDeployment[]> {
    try {
      let deployments = Array.from(this.deployments.values());

      if (filter) {
        deployments = this.applyFilters(deployments, filter);
      }

      // Sort by start time (newest first)
      deployments.sort((a, b) => b.startedAt - a.startedAt);

      return deployments;

    } catch (error) {
      throw new ExperimentationError({
        code: 'CANARY_LIST_ERROR',
        message: `Failed to list canary deployments: ${error.message}`,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Promote canary to next phase
   */
  async promoteCanary(deploymentId: UUID): Promise<void> {
    try {
      const deployment = await this.getCanaryDeployment(deploymentId);
      if (!deployment) {
        throw new Error(`Canary deployment ${deploymentId} not found`);
      }

      if (deployment.status !== CanaryStatus.ACTIVE) {
        throw new Error(`Cannot promote deployment in status: ${deployment.status}`);
      }

      // Check if promotion criteria are met
      const healthStatus = await this.monitorCanaryHealth(deploymentId);
      if (healthStatus.overall === 'critical') {
        throw new Error('Cannot promote: critical health issues detected');
      }

      // Check promotion criteria
      if (deployment.config.canaryConfig?.promotionCriteria) {
        const criteriaCheck = await this.checkPromotionCriteria(deploymentId);
        if (!criteriaCheck.canPromote) {
          throw new Error(`Promotion criteria not met: ${criteriaCheck.reason}`);
        }
      }

      const canaryConfig = deployment.config.canaryConfig;
      
      if (canaryConfig?.gradualRolloutPlan) {
        // Gradual rollout plan
        await this.promoteGradualRollout(deploymentId);
      } else {
        // Standard canary promotion
        await this.promoteStandardCanary(deploymentId);
      }

    } catch (error) {
      throw new ExperimentationError({
        code: 'CANARY_PROMOTION_ERROR',
        message: `Failed to promote canary: ${error.message}`,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Rollback canary deployment
   */
  async rollbackCanary(deploymentId: UUID, reason: string): Promise<void> {
    try {
      const deployment = await this.getCanaryDeployment(deploymentId);
      if (!deployment) {
        throw new Error(`Canary deployment ${deploymentId} not found`);
      }

      if ([CanaryStatus.COMPLETED, CanaryStatus.ROLLED_BACK].includes(deployment.status)) {
        throw new Error(`Cannot rollback deployment in status: ${deployment.status}`);
      }

      // Update status
      const updatedDeployment: CanaryDeployment = {
        ...deployment,
        status: CanaryStatus.ROLLING_BACK
      };
      this.deployments.set(deploymentId, updatedDeployment);

      // Stop monitoring
      await this.stopMonitoring(deploymentId);

      // Perform rollback
      await this.performRollback(deploymentId);

      // Update final status
      updatedDeployment.status = CanaryStatus.ROLLED_BACK;
      this.deployments.set(deploymentId, updatedDeployment);

      // Add rollback event
      await this.addEvent(deploymentId, {
        id: this.generateUUID(),
        deploymentId,
        type: 'rolled_back',
        timestamp: Date.now(),
        triggeredBy: 'manual'
      });

    } catch (error) {
      // Update status to failed
      const deployment = this.deployments.get(deploymentId);
      if (deployment) {
        deployment.status = CanaryStatus.FAILED;
        this.deployments.set(deploymentId, deployment);
      }

      throw new ExperimentationError({
        code: 'CANARY_ROLLBACK_ERROR',
        message: `Failed to rollback canary: ${error.message}`,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Complete canary deployment
   */
  async completeCanaryDeployment(deploymentId: UUID): Promise<void> {
    try {
      const deployment = await this.getCanaryDeployment(deploymentId);
      if (!deployment) {
        throw new Error(`Canary deployment ${deploymentId} not found`);
      }

      if (deployment.status !== CanaryStatus.ACTIVE) {
        throw new Error(`Cannot complete deployment in status: ${deployment.status}`);
      }

      // Update status
      const updatedDeployment: CanaryDeployment = {
        ...deployment,
        status: CanaryStatus.COMPLETED,
        currentTrafficPercentage: 100
      };
      this.deployments.set(deploymentId, updatedDeployment);

      // Stop monitoring
      await this.stopMonitoring(deploymentId);

      // Add completion event
      await this.addEvent(deploymentId, {
        id: this.generateUUID(),
        deploymentId,
        type: 'completed',
        timestamp: Date.now(),
        triggeredBy: 'manual'
      });

    } catch (error) {
      throw new ExperimentationError({
        code: 'CANARY_COMPLETION_ERROR',
        message: `Failed to complete canary deployment: ${error.message}`,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Monitor canary health
   */
  async monitorCanaryHealth(deploymentId: UUID): Promise<CanaryHealthStatus> {
    try {
      const deployment = await this.getCanaryDeployment(deploymentId);
      if (!deployment) {
        throw new Error(`Canary deployment ${deploymentId} not found`);
      }

      const metrics = await this.getCanaryMetrics(deploymentId);
      const canaryConfig = deployment.config.canaryConfig;
      
      const metricHealths: Record<string, CanaryMetricHealth> = {};
      let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
      const recommendations: string[] = [];

      // Check error rate
      const errorRateThreshold = canaryConfig?.rollbackThresholds?.errorRate || 5;
      const errorRateHealth: CanaryMetricHealth = {
        name: 'Error Rate',
        value: metrics.errorRate,
        threshold: errorRateThreshold,
        status: metrics.errorRate > errorRateThreshold ? 'critical' : 'healthy'
      };
      metricHealths.errorRate = errorRateHealth;

      if (errorRateHealth.status === 'critical') {
        overallStatus = 'critical';
        recommendations.push('Error rate exceeds threshold - consider rollback');
      }

      // Check response time
      const responseTimeThreshold = canaryConfig?.rollbackThresholds?.responseTime || 1000;
      const responseTimeHealth: CanaryMetricHealth = {
        name: 'Response Time',
        value: metrics.responseTime,
        threshold: responseTimeThreshold,
        status: metrics.responseTime > responseTimeThreshold ? 'warning' : 'healthy'
      };
      metricHealths.responseTime = responseTimeHealth;

      if (responseTimeHealth.status === 'warning' && overallStatus === 'healthy') {
        overallStatus = 'warning';
        recommendations.push('Response time elevated - monitor closely');
      }

      // Check success rate
      const successRateThreshold = canaryConfig?.rollbackThresholds?.successRate || 95;
      const successRateHealth: CanaryMetricHealth = {
        name: 'Success Rate',
        value: metrics.successRate,
        threshold: successRateThreshold,
        status: metrics.successRate < successRateThreshold ? 'critical' : 'healthy'
      };
      metricHealths.successRate = successRateHealth;

      if (successRateHealth.status === 'critical') {
        overallStatus = 'critical';
        recommendations.push('Success rate below threshold - consider rollback');
      }

      return {
        deploymentId,
        overall: overallStatus,
        metrics: metricHealths,
        recommendations,
        lastChecked: Date.now()
      };

    } catch (error) {
      throw new ExperimentationError({
        code: 'CANARY_HEALTH_CHECK_ERROR',
        message: `Failed to check canary health: ${error.message}`,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get canary metrics
   */
  async getCanaryMetrics(deploymentId: UUID): Promise<CanaryMetrics> {
    try {
      const deployment = await this.getCanaryDeployment(deploymentId);
      if (!deployment) {
        throw new Error(`Canary deployment ${deploymentId} not found`);
      }

      // Collect latest metrics
      const collector = this.metricCollectors.get(deploymentId);
      if (collector) {
        const latestMetrics = await collector.collect();
        deployment.metrics = latestMetrics;
        this.deployments.set(deploymentId, deployment);
      }

      return deployment.metrics;

    } catch (error) {
      throw new ExperimentationError({
        code: 'CANARY_METRICS_ERROR',
        message: `Failed to get canary metrics: ${error.message}`,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Validate canary configuration
   */
  validateCanaryConfig(config: DeploymentConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      if (!config.strategy) {
        errors.push('Deployment strategy is required');
      }

      if (config.strategy === 'canary' && !config.canaryConfig) {
        errors.push('Canary configuration is required for canary strategy');
      }

      if (config.canaryConfig) {
        const canaryConfig = config.canaryConfig;

        if (canaryConfig.initialTraffic < 0 || canaryConfig.initialTraffic > 100) {
          errors.push('Initial traffic percentage must be between 0 and 100');
        }

        if (canaryConfig.increments) {
          for (const increment of canaryConfig.increments) {
            if (increment <= 0 || increment > 100) {
              errors.push('Traffic increments must be between 0 and 100');
            }
          }
        }

        if (canaryConfig.promotionCriteria) {
          for (const criteria of canaryConfig.promotionCriteria) {
            if (!criteria.metric || !criteria.threshold || !criteria.comparison) {
              errors.push('Promotion criteria must specify metric, threshold, and comparison');
            }
          }
        }
      }

      if (config.gradualRolloutPlan) {
        const plan = config.gradualRolloutPlan;
        
        if (!plan.phases || plan.phases.length === 0) {
          errors.push('Gradual rollout plan must have at least one phase');
        }

        let totalPercentage = 0;
        for (const phase of plan.phases || []) {
          totalPercentage += phase.trafficPercentage;
          if (phase.trafficPercentage <= 0 || phase.trafficPercentage > 100) {
            errors.push(`Phase ${phase.phase} traffic percentage must be between 0 and 100`);
          }
        }

        if (totalPercentage !== 100) {
          warnings.push(`Total phase traffic allocation is ${totalPercentage}%, consider ensuring it reaches 100%`);
        }
      }

    } catch (error) {
      errors.push(`Configuration validation error: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Private helper methods
   */

  private async initializeMetricCollection(deploymentId: UUID): Promise<void> {
    const collector = new MetricCollector(deploymentId);
    this.metricCollectors.set(deploymentId, collector);
    await collector.initialize();
  }

  private async startMonitoring(deploymentId: UUID): Promise<void> {
    const monitoringInterval = setInterval(async () => {
      try {
        await this.performHealthCheck(deploymentId);
      } catch (error) {
        console.error(`Monitoring error for deployment ${deploymentId}:`, error);
      }
    }, this.MONITORING_INTERVAL);

    this.activeMonitoring.set(deploymentId, monitoringInterval);
  }

  private async stopMonitoring(deploymentId: UUID): Promise<void> {
    const interval = this.activeMonitoring.get(deploymentId);
    if (interval) {
      clearInterval(interval);
      this.activeMonitoring.delete(deploymentId);
    }
  }

  private async performHealthCheck(deploymentId: UUID): Promise<void> {
    const deployment = await this.getCanaryDeployment(deploymentId);
    if (!deployment || deployment.status !== CanaryStatus.ACTIVE) {
      return;
    }

    const health = await this.monitorCanaryHealth(deploymentId);
    
    // Check for automatic rollback
    if (health.overall === 'critical' && deployment.config.canaryConfig?.automaticPromotion === false) {
      // Check rollback criteria
      const shouldRollback = await this.checkRollbackCriteria(deploymentId);
      if (shouldRollback.shouldRollback) {
        await this.rollbackCanary(deploymentId, shouldRollback.reason);
        return;
      }
    }

    // Check for automatic promotion
    if (deployment.config.canaryConfig?.automaticPromotion) {
      const canPromote = await this.checkPromotionCriteria(deploymentId);
      if (canPromote.canPromote) {
        // Wait for promotion delay
        const timeSinceLastPromotion = Date.now() - (deployment.lastPromotedAt || deployment.startedAt);
        if (timeSinceLastPromotion >= this.PROMOTION_DELAY) {
          await this.promoteCanary(deploymentId);
        }
      }
    }
  }

  private async checkPromotionCriteria(deploymentId: UUID): Promise<{ canPromote: boolean; reason: string }> {
    const deployment = await this.getCanaryDeployment(deploymentId);
    if (!deployment) {
      return { canPromote: false, reason: 'Deployment not found' };
    }

    const criteria = deployment.config.canaryConfig?.promotionCriteria;
    if (!criteria || criteria.length === 0) {
      return { canPromote: true, reason: 'No criteria specified' };
    }

    const metrics = await this.getCanaryMetrics(deploymentId);
    
    for (const criterion of criteria) {
      const metricValue = this.getMetricValue(metrics, criterion.metric);
      if (!this.evaluateCriterion(metricValue, criterion.threshold, criterion.comparison)) {
        return { canPromote: false, reason: `${criterion.metric} does not meet criteria` };
      }
    }

    return { canPromote: true, reason: 'All criteria met' };
  }

  private async checkRollbackCriteria(deploymentId: UUID): Promise<{ shouldRollback: boolean; reason: string }> {
    const deployment = await this.getCanaryDeployment(deploymentId);
    if (!deployment) {
      return { shouldRollback: false, reason: 'Deployment not found' };
    }

    const criteria = deployment.config.rollbackCriteria;
    if (!criteria || criteria.length === 0) {
      return { shouldRollback: false, reason: 'No rollback criteria specified' };
    }

    const metrics = await this.getCanaryMetrics(deploymentId);
    
    for (const criterion of criteria) {
      if (criterion.automatic) {
        const metricValue = this.getMetricValue(metrics, criterion.metric);
        if (this.evaluateCriterion(metricValue, criterion.threshold, criterion.comparison)) {
          return { shouldRollback: true, reason: `${criterion.metric} triggered rollback` };
        }
      }
    }

    return { shouldRollback: false, reason: 'No rollback criteria triggered' };
  }

  private getMetricValue(metrics: CanaryMetrics, metricName: string): number {
    switch (metricName) {
      case 'errorRate':
        return metrics.errorRate;
      case 'responseTime':
        return metrics.responseTime;
      case 'successRate':
        return metrics.successRate;
      case 'throughput':
        return metrics.throughput;
      default:
        return metrics.customMetrics[metricName] || 0;
    }
  }

  private evaluateCriterion(value: number, threshold: number, comparison: string): boolean {
    switch (comparison) {
      case 'greater_than':
        return value > threshold;
      case 'less_than':
        return value < threshold;
      case 'equals':
        return Math.abs(value - threshold) < 0.001;
      default:
        return false;
    }
  }

  private async promoteStandardCanary(deploymentId: UUID): Promise<void> {
    const deployment = await this.getCanaryDeployment(deploymentId);
    if (!deployment) return;

    const canaryConfig = deployment.config.canaryConfig;
    const currentIndex = canaryConfig?.increments?.findIndex(
      increment => increment > deployment.currentTrafficPercentage
    ) || -1;

    if (currentIndex === -1) {
      // No more increments, complete deployment
      await this.completeCanaryDeployment(deploymentId);
      return;
    }

    const nextTrafficPercentage = canaryConfig?.increments?.[currentIndex] || 100;
    
    // Update traffic percentage
    const updatedDeployment: CanaryDeployment = {
      ...deployment,
      currentTrafficPercentage: nextTrafficPercentage,
      lastPromotedAt: Date.now()
    };
    this.deployments.set(deploymentId, updatedDeployment);

    // Add promotion event
    await this.addEvent(deploymentId, {
      id: this.generateUUID(),
      deploymentId,
      type: 'promoted',
      trafficPercentage: nextTrafficPercentage,
      timestamp: Date.now(),
      triggeredBy: 'automatic'
    });
  }

  private async promoteGradualRollout(deploymentId: UUID): Promise<void> {
    const deployment = await this.getCanaryDeployment(deploymentId);
    if (!deployment) return;

    const plan = deployment.config.gradualRolloutPlan;
    if (!plan || !plan.phases) return;

    const nextPhase = deployment.currentPhase + 1;
    if (nextPhase >= plan.phases.length) {
      await this.completeCanaryDeployment(deploymentId);
      return;
    }

    const phase = plan.phases[nextPhase];
    
    // Update to next phase
    const updatedDeployment: CanaryDeployment = {
      ...deployment,
      currentPhase: nextPhase,
      currentTrafficPercentage: phase.trafficPercentage,
      lastPromotedAt: Date.now()
    };
    this.deployments.set(deploymentId, updatedDeployment);

    // Add promotion event
    await this.addEvent(deploymentId, {
      id: this.generateUUID(),
      deploymentId,
      type: 'promoted',
      phase: nextPhase,
      trafficPercentage: phase.trafficPercentage,
      timestamp: Date.now(),
      triggeredBy: 'automatic'
    });

    // Begin the new phase
    await this.beginPhase(deploymentId, nextPhase);
  }

  private async beginPhase(deploymentId: UUID, phaseNumber: number): Promise<void> {
    const deployment = await this.getCanaryDeployment(deploymentId);
    if (!deployment) return;

    // Update status to active if starting
    if (deployment.status === CanaryStatus.STARTING) {
      const updatedDeployment: CanaryDeployment = {
        ...deployment,
        status: CanaryStatus.ACTIVE
      };
      this.deployments.set(deploymentId, updatedDeployment);
    }

    // Configure traffic routing for this phase
    await this.configureTrafficRouting(deploymentId, deployment.currentTrafficPercentage);
  }

  private async configureTrafficRouting(deploymentId: UUID, trafficPercentage: number): Promise<void> {
    // In a real implementation, this would configure load balancers,
    // service meshes, or other traffic routing mechanisms
    console.log(`Configuring ${trafficPercentage}% traffic for deployment ${deploymentId}`);
  }

  private async performRollback(deploymentId: UUID): Promise<void> {
    // In a real implementation, this would:
    // 1. Route all traffic back to the stable version
    // 2. Cleanup canary resources
    // 3. Restore previous configuration
    console.log(`Performing rollback for deployment ${deploymentId}`);
  }

  private async addEvent(deploymentId: UUID, event: CanaryEvent): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (deployment) {
      deployment.events.push(event);
      this.deployments.set(deploymentId, deployment);
    }
  }

  private applyFilters(deployments: CanaryDeployment[], filter: CanaryFilter): CanaryDeployment[] {
    return deployments.filter(deployment => {
      if (filter.status && !filter.status.includes(deployment.status)) {
        return false;
      }

      if (filter.experimentId && !filter.experimentId.includes(deployment.experimentId || '')) {
        return false;
      }

      return true;
    });
  }

  private generateUUID(): UUID {
    return 'canary_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
  }
}

/**
 * Mock Metric Collector for demonstration
 */
class MetricCollector {
  private deploymentId: UUID;

  constructor(deploymentId: UUID) {
    this.deploymentId = deploymentId;
  }

  async initialize(): Promise<void> {
    // Initialize metric collection infrastructure
  }

  async collect(): Promise<CanaryMetrics> {
    // Mock metrics collection
    const now = Date.now();
    const baseErrorRate = 1 + Math.random() * 2; // 1-3%
    const baseResponseTime = 200 + Math.random() * 100; // 200-300ms
    
    return {
      deploymentId: this.deploymentId,
      errorRate: baseErrorRate,
      responseTime: baseResponseTime,
      throughput: 1000 + Math.random() * 500, // 1000-1500 req/s
      successRate: 100 - baseErrorRate,
      customMetrics: {
        cpuUsage: 30 + Math.random() * 40, // 30-70%
        memoryUsage: 40 + Math.random() * 30, // 40-70%
      },
      collectedAt: now
    };
  }
}

export default CanaryDeploymentManager;