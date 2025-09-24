/**
 * AI Model Management Service - Core Service Layer
 * Integrates with existing backend abstractions
 */

import { UnifiedDatabaseService } from '../abstractions/database';
import { UnifiedStorageService } from '../abstractions/storage';
import { UnifiedEdgeFunctionService } from '../abstractions/edge-functions';
import {
  AIModel,
  ModelLifecycle,
  ModelDeployment,
  PerformanceMetric,
  ABTest,
  ABTestResult,
  FineTuningJob,
  OptimizationRecommendation,
  ModelUsageAnalytics,
  ModelAlert,
  DeploymentOptions,
  FineTuningOptions,
  ABTestOptions,
  ModelMetrics,
  ModelHealthStatus,
  ModelComparisonResult,
  ModelOptimizationSuggestion,
  ModelEvent,
  ModelManagementConfig
} from './types';
import { EventEmitter } from 'events';

export class AIModelManagementService extends EventEmitter {
  private static instance: AIModelManagementService;
  private dbService: UnifiedDatabaseService;
  private storageService: UnifiedStorageService;
  private edgeFunctionService: UnifiedEdgeFunctionService;
  private config: ModelManagementConfig;
  private monitoringInterval: NodeJS.Timeout | null = null;

  private constructor(
    dbService: UnifiedDatabaseService,
    storageService: UnifiedStorageService,
    edgeFunctionService: UnifiedEdgeFunctionService,
    config: ModelManagementConfig
  ) {
    super();
    this.dbService = dbService;
    this.storageService = storageService;
    this.edgeFunctionService = edgeFunctionService;
    this.config = config;
  }

  public static getInstance(
    dbService?: UnifiedDatabaseService,
    storageService?: UnifiedStorageService,
    edgeFunctionService?: UnifiedEdgeFunctionService,
    config?: ModelManagementConfig
  ): AIModelManagementService {
    if (!AIModelManagementService.instance) {
      if (!dbService || !storageService || !edgeFunctionService || !config) {
        throw new Error('First instantiation requires all services and config');
      }
      AIModelManagementService.instance = new AIModelManagementService(
        dbService,
        storageService,
        edgeFunctionService,
        config
      );
    }
    return AIModelManagementService.instance;
  }

  // Model Lifecycle Management
  async createModelLifecycle(modelId: string, versionTag: string, config: Partial<ModelLifecycle>): Promise<ModelLifecycle> {
    const lifecycle: Partial<ModelLifecycle> = {
      model_id: modelId,
      version_tag: versionTag,
      lifecycle_stage: 'development',
      approval_status: 'pending',
      deployment_config: config.deployment_config || {},
      performance_requirements: config.performance_requirements || {},
      resource_allocation: config.resource_allocation || {},
      rollback_plan: config.rollback_plan || {},
      monitoring_config: config.monitoring_config || {}
    };

    const result = await this.dbService.create('ai_model_lifecycle', lifecycle);
    this.emit('lifecycle_created', { lifecycle: result });
    return result as ModelLifecycle;
  }

  async updateLifecycleStage(lifecycleId: string, stage: ModelLifecycle['lifecycle_stage']): Promise<ModelLifecycle> {
    const updated = await this.dbService.update('ai_model_lifecycle', lifecycleId, {
      lifecycle_stage: stage,
      updated_at: new Date().toISOString()
    });
    
    this.emit('lifecycle_stage_changed', { lifecycle_id: lifecycleId, stage });
    return updated as ModelLifecycle;
  }

  async approveLifecycle(lifecycleId: string, approvedBy: string): Promise<ModelLifecycle> {
    const updated = await this.dbService.update('ai_model_lifecycle', lifecycleId, {
      approval_status: 'approved',
      approved_by: approvedBy,
      approval_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    this.emit('lifecycle_approved', { lifecycle_id: lifecycleId, approved_by: approvedBy });
    return updated as ModelLifecycle;
  }

  // Model Deployment Management
  async deployModel(lifecycleId: string, options: DeploymentOptions): Promise<ModelDeployment> {
    const deployment: Partial<ModelDeployment> = {
      lifecycle_id: lifecycleId,
      deployment_name: `deployment-${Date.now()}`,
      environment: options.environment,
      deployment_type: options.deployment_type,
      status: 'deploying',
      traffic_percentage: options.traffic_percentage || 0,
      load_balancer_config: {},
      scaling_config: options.scaling_config || {},
      security_config: options.security_config || {},
      deployment_metadata: {}
    };

    const result = await this.dbService.create('ai_model_deployments', deployment);
    
    // Trigger deployment process
    await this.triggerDeploymentProcess(result.id, options);
    
    this.emit('deployment_started', { deployment: result });
    return result as ModelDeployment;
  }

  async updateDeploymentStatus(
    deploymentId: string, 
    status: ModelDeployment['status'], 
    metadata?: any
  ): Promise<ModelDeployment> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'healthy') {
      updateData.deployed_at = new Date().toISOString();
      updateData.last_health_check = new Date().toISOString();
    }

    if (metadata) {
      updateData.deployment_metadata = metadata;
    }

    const updated = await this.dbService.update('ai_model_deployments', deploymentId, updateData);
    this.emit('deployment_status_changed', { deployment_id: deploymentId, status });
    return updated as ModelDeployment;
  }

  async rollbackDeployment(deploymentId: string, reason: string): Promise<ModelDeployment> {
    const deployment = await this.dbService.read('ai_model_deployments', deploymentId) as ModelDeployment;
    
    // Execute rollback process
    await this.executeRollback(deployment, reason);
    
    const updated = await this.updateDeploymentStatus(deploymentId, 'terminated', {
      rollback_reason: reason,
      rollback_timestamp: new Date().toISOString()
    });

    this.emit('deployment_rollback', { deployment_id: deploymentId, reason });
    return updated;
  }

  // Performance Monitoring
  async recordPerformanceMetric(
    deploymentId: string,
    metricType: PerformanceMetric['metric_type'],
    value: number,
    unit?: string,
    context?: any
  ): Promise<PerformanceMetric> {
    const metric: Partial<PerformanceMetric> = {
      deployment_id: deploymentId,
      metric_type: metricType,
      metric_value: value,
      metric_unit: unit,
      measurement_context: context || {},
      benchmark_comparison: {},
      alert_threshold_breached: false,
      aggregation_period: 'real-time'
    };

    // Check for threshold breaches
    const thresholdBreached = await this.checkThresholds(deploymentId, metricType, value);
    if (thresholdBreached) {
      metric.alert_threshold_breached = true;
      await this.createAlert(deploymentId, metricType, value, thresholdBreached);
    }

    const result = await this.dbService.create('ai_model_performance_metrics', metric);
    this.emit('performance_metric_recorded', { metric: result });
    return result as PerformanceMetric;
  }

  async getModelMetrics(deploymentId: string, timeRange?: { start: Date; end: Date }): Promise<ModelMetrics> {
    const conditions: any = { deployment_id: deploymentId };
    
    if (timeRange) {
      conditions.recorded_at = {
        gte: timeRange.start.toISOString(),
        lte: timeRange.end.toISOString()
      };
    }

    const metrics = await this.dbService.findMany('ai_model_performance_metrics', { where: conditions });
    
    return this.aggregateMetrics(metrics as PerformanceMetric[]);
  }

  async getModelHealth(deploymentId: string): Promise<ModelHealthStatus> {
    const deployment = await this.dbService.read('ai_model_deployments', deploymentId) as ModelDeployment;
    const recentMetrics = await this.getModelMetrics(deploymentId, {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      end: new Date()
    });
    
    const activeAlerts = await this.dbService.findMany('ai_model_alerts', {
      where: { deployment_id: deploymentId, status: 'open' }
    }) as ModelAlert[];

    const healthScore = this.calculateHealthScore(recentMetrics, activeAlerts);
    
    return {
      deployment_id: deploymentId,
      overall_health: this.determineOverallHealth(healthScore, activeAlerts),
      health_score: healthScore,
      last_check: new Date().toISOString(),
      issues: activeAlerts.map(alert => ({
        type: alert.alert_type,
        severity: alert.severity,
        message: alert.description,
        since: alert.triggered_at
      })),
      performance_summary: recentMetrics,
      resource_utilization: await this.getResourceUtilization(deploymentId)
    };
  }

  // A/B Testing
  async createABTest(testName: string, options: ABTestOptions): Promise<ABTest> {
    const abTest: Partial<ABTest> = {
      test_name: testName,
      model_a_deployment_id: options.model_a_deployment_id,
      model_b_deployment_id: options.model_b_deployment_id,
      traffic_split_percentage: options.traffic_split_percentage || 50,
      test_criteria: options.test_criteria,
      success_metrics: options.success_metrics,
      statistical_significance_threshold: options.statistical_significance_threshold || 0.05,
      minimum_sample_size: options.minimum_sample_size || 1000,
      test_duration_hours: options.test_duration_hours,
      status: 'draft',
      preliminary_results: {},
      final_results: {}
    };

    const result = await this.dbService.create('ai_ab_tests', abTest);
    this.emit('ab_test_created', { ab_test: result });
    return result as ABTest;
  }

  async startABTest(testId: string): Promise<ABTest> {
    const updated = await this.dbService.update('ai_ab_tests', testId, {
      status: 'running',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Configure traffic routing for A/B test
    await this.configureABTestRouting(testId);
    
    this.emit('ab_test_started', { test_id: testId });
    return updated as ABTest;
  }

  async recordABTestResult(
    testId: string,
    variant: 'A' | 'B',
    metricName: string,
    metricValue: number,
    context?: any
  ): Promise<ABTestResult> {
    const result: Partial<ABTestResult> = {
      ab_test_id: testId,
      variant,
      metric_name: metricName,
      metric_value: metricValue,
      context_metadata: context || {},
      error_occurred: false
    };

    const testResult = await this.dbService.create('ai_ab_test_results', result);
    
    // Check if test should be completed
    await this.checkABTestCompletion(testId);
    
    return testResult as ABTestResult;
  }

  async getABTestResults(testId: string): Promise<ModelComparisonResult> {
    const test = await this.dbService.read('ai_ab_tests', testId) as ABTest;
    const results = await this.dbService.findMany('ai_ab_test_results', {
      where: { ab_test_id: testId }
    }) as ABTestResult[];

    return this.analyzeABTestResults(test, results);
  }

  // Model Fine-tuning
  async startFineTuning(
    baseModelId: string,
    jobName: string,
    objective: string,
    options: FineTuningOptions
  ): Promise<FineTuningJob> {
    const job: Partial<FineTuningJob> = {
      base_model_id: baseModelId,
      training_dataset_id: options.training_dataset_id,
      validation_dataset_id: options.validation_dataset_id,
      job_name: jobName,
      fine_tuning_objective: objective,
      hyperparameters: options.hyperparameters || {},
      training_config: {},
      optimization_strategy: options.optimization_strategy || 'adam',
      learning_rate: options.learning_rate || 0.0001,
      batch_size: options.batch_size || 32,
      epochs: options.epochs || 10,
      early_stopping_config: options.early_stopping_config || {},
      status: 'queued',
      progress_percentage: 0,
      current_epoch: 0,
      training_logs: {},
      resource_usage: {}
    };

    const result = await this.dbService.create('ai_model_finetuning_jobs', job);
    
    // Queue the training job
    await this.queueTrainingJob(result.id);
    
    this.emit('finetuning_job_created', { job: result });
    return result as FineTuningJob;
  }

  async updateFineTuningProgress(
    jobId: string,
    progress: number,
    epoch: number,
    logs?: any
  ): Promise<FineTuningJob> {
    const updateData: any = {
      progress_percentage: progress,
      current_epoch: epoch,
      updated_at: new Date().toISOString()
    };

    if (logs) {
      updateData.training_logs = logs;
    }

    const updated = await this.dbService.update('ai_model_finetuning_jobs', jobId, updateData);
    this.emit('finetuning_progress_updated', { job_id: jobId, progress, epoch });
    return updated as FineTuningJob;
  }

  // Optimization and Recommendations
  async generateOptimizationRecommendations(deploymentId: string): Promise<OptimizationRecommendation[]> {
    const health = await this.getModelHealth(deploymentId);
    const recommendations: Partial<OptimizationRecommendation>[] = [];

    // Analyze performance metrics and generate recommendations
    if (health.performance_summary.latency_avg > this.config.performance_alert_thresholds.latency_ms) {
      recommendations.push({
        deployment_id: deploymentId,
        recommendation_type: 'performance',
        priority: 'high',
        recommendation_title: 'High Latency Detected',
        recommendation_description: 'Model response time is above acceptable thresholds',
        implementation_steps: {
          steps: [
            'Review model complexity',
            'Optimize inference pipeline',
            'Consider model quantization',
            'Scale up infrastructure'
          ]
        },
        expected_impact: { latency_reduction: '30-50%' },
        auto_generated: true,
        confidence_score: 0.85
      });
    }

    if (health.performance_summary.error_rate > this.config.performance_alert_thresholds.error_rate_percentage / 100) {
      recommendations.push({
        deployment_id: deploymentId,
        recommendation_type: 'accuracy',
        priority: 'critical',
        recommendation_title: 'High Error Rate',
        recommendation_description: 'Model error rate is exceeding acceptable limits',
        implementation_steps: {
          steps: [
            'Analyze error patterns',
            'Review training data quality',
            'Consider model retraining',
            'Implement additional validation'
          ]
        },
        expected_impact: { error_reduction: '50-70%' },
        auto_generated: true,
        confidence_score: 0.90
      });
    }

    // Create recommendations in database
    const results: OptimizationRecommendation[] = [];
    for (const rec of recommendations) {
      const created = await this.dbService.create('ai_model_optimization_recommendations', rec);
      results.push(created as OptimizationRecommendation);
    }

    this.emit('optimization_recommendations_generated', { deployment_id: deploymentId, count: results.length });
    return results;
  }

  // Usage Analytics
  async recordUsage(
    deploymentId: string,
    userId: string | undefined,
    requestId: string,
    inputTokens: number,
    outputTokens: number,
    latency: number,
    success: boolean,
    errorInfo?: { type: string; message: string }
  ): Promise<ModelUsageAnalytics> {
    const model = await this.getModelByDeployment(deploymentId);
    const totalCost = this.calculateCost(model, inputTokens, outputTokens);

    const usage: Partial<ModelUsageAnalytics> = {
      deployment_id: deploymentId,
      user_id: userId,
      request_id: requestId,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_cost: totalCost,
      latency_ms: latency,
      success,
      error_type: errorInfo?.type,
      error_message: errorInfo?.message,
      request_metadata: {},
      response_metadata: {}
    };

    const result = await this.dbService.create('ai_model_usage_analytics', usage);
    
    // Update real-time metrics
    await this.recordPerformanceMetric(deploymentId, 'latency', latency, 'ms');
    await this.recordPerformanceMetric(deploymentId, 'cost', totalCost, 'usd');
    
    if (!success) {
      await this.recordPerformanceMetric(deploymentId, 'error_rate', 1, 'count');
    }

    this.emit('usage_recorded', { usage: result });
    return result as ModelUsageAnalytics;
  }

  // Alert Management
  async createAlert(
    deploymentId: string,
    alertType: ModelAlert['alert_type'],
    currentValue: number,
    threshold: any
  ): Promise<ModelAlert> {
    const alert: Partial<ModelAlert> = {
      deployment_id: deploymentId,
      alert_type: alertType,
      severity: this.determineSeverity(alertType, currentValue, threshold),
      title: `${alertType.replace('_', ' ').toUpperCase()} Alert`,
      description: `${alertType} has exceeded threshold. Current: ${currentValue}, Threshold: ${threshold.value}`,
      trigger_conditions: threshold,
      current_values: { value: currentValue },
      threshold_values: threshold,
      status: 'open',
      escalation_level: 1
    };

    const result = await this.dbService.create('ai_model_alerts', alert);
    this.emit('alert_created', { alert: result });
    return result as ModelAlert;
  }

  // Monitoring and Health Checks
  startMonitoring(): void {
    if (this.monitoringInterval) {
      return; // Already monitoring
    }

    this.monitoringInterval = setInterval(async () => {
      await this.performHealthChecks();
      await this.runOptimizationAnalysis();
    }, this.config.default_monitoring_interval * 1000);

    this.emit('monitoring_started');
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.emit('monitoring_stopped');
    }
  }

  // Private helper methods
  private async triggerDeploymentProcess(deploymentId: string, options: DeploymentOptions): Promise<void> {
    // Implement deployment logic using edge functions
    try {
      await this.edgeFunctionService.invoke('ai-model-deployment', {
        deployment_id: deploymentId,
        options
      });
    } catch (error) {
      await this.updateDeploymentStatus(deploymentId, 'failed', {
        error: error instanceof Error ? error.message : 'Unknown deployment error'
      });
      throw error;
    }
  }

  private async executeRollback(deployment: ModelDeployment, reason: string): Promise<void> {
    // Implement rollback logic
    await this.edgeFunctionService.invoke('ai-model-rollback', {
      deployment_id: deployment.id,
      reason
    });
  }

  private async checkThresholds(
    deploymentId: string,
    metricType: PerformanceMetric['metric_type'],
    value: number
  ): Promise<any> {
    const thresholds = this.config.performance_alert_thresholds;
    
    switch (metricType) {
      case 'latency':
        return value > thresholds.latency_ms ? { value: thresholds.latency_ms, exceeded: true } : null;
      case 'error_rate':
        return value > thresholds.error_rate_percentage ? { value: thresholds.error_rate_percentage, exceeded: true } : null;
      default:
        return null;
    }
  }

  private aggregateMetrics(metrics: PerformanceMetric[]): ModelMetrics {
    const latencyMetrics = metrics.filter(m => m.metric_type === 'latency');
    const throughputMetrics = metrics.filter(m => m.metric_type === 'throughput');
    const errorRateMetrics = metrics.filter(m => m.metric_type === 'error_rate');
    const costMetrics = metrics.filter(m => m.metric_type === 'cost');

    return {
      latency_avg: this.calculateAverage(latencyMetrics.map(m => m.metric_value)),
      latency_p95: this.calculatePercentile(latencyMetrics.map(m => m.metric_value), 95),
      latency_p99: this.calculatePercentile(latencyMetrics.map(m => m.metric_value), 99),
      throughput: this.calculateAverage(throughputMetrics.map(m => m.metric_value)),
      error_rate: this.calculateAverage(errorRateMetrics.map(m => m.metric_value)),
      cost_per_request: this.calculateAverage(costMetrics.map(m => m.metric_value)),
      uptime_percentage: this.calculateUptimePercentage(metrics)
    };
  }

  private calculateHealthScore(metrics: ModelMetrics, alerts: ModelAlert[]): number {
    let score = 100;
    
    // Deduct points for performance issues
    if (metrics.latency_avg > this.config.performance_alert_thresholds.latency_ms) {
      score -= 20;
    }
    
    if (metrics.error_rate > this.config.performance_alert_thresholds.error_rate_percentage / 100) {
      score -= 30;
    }
    
    // Deduct points for active alerts
    alerts.forEach(alert => {
      switch (alert.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'warning':
          score -= 10;
          break;
        case 'emergency':
          score -= 40;
          break;
      }
    });
    
    return Math.max(0, score);
  }

  private determineOverallHealth(
    healthScore: number,
    alerts: ModelAlert[]
  ): ModelHealthStatus['overall_health'] {
    const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'emergency');
    
    if (criticalAlerts.length > 0 || healthScore < 50) {
      return 'critical';
    }
    
    if (healthScore < 75) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  private async getResourceUtilization(deploymentId: string): Promise<any> {
    // This would integrate with infrastructure monitoring
    return {
      cpu_percentage: 45,
      memory_percentage: 60,
      gpu_percentage: 75,
      storage_percentage: 30
    };
  }

  private async configureABTestRouting(testId: string): Promise<void> {
    // Configure load balancer or routing logic for A/B test
    await this.edgeFunctionService.invoke('configure-ab-test-routing', { test_id: testId });
  }

  private async checkABTestCompletion(testId: string): Promise<void> {
    const test = await this.dbService.read('ai_ab_tests', testId) as ABTest;
    const results = await this.dbService.findMany('ai_ab_test_results', {
      where: { ab_test_id: testId }
    }) as ABTestResult[];

    if (results.length >= test.minimum_sample_size) {
      const analysis = this.analyzeABTestResults(test, results);
      
      if (analysis.statistical_significance.is_significant) {
        await this.dbService.update('ai_ab_tests', testId, {
          status: 'completed',
          completed_at: new Date().toISOString(),
          final_results: analysis,
          winner_model_id: analysis.winner === 'A' ? test.model_a_deployment_id : test.model_b_deployment_id,
          confidence_level: analysis.statistical_significance.confidence_level
        });
        
        this.emit('ab_test_completed', { test_id: testId, results: analysis });
      }
    }
  }

  private analyzeABTestResults(test: ABTest, results: ABTestResult[]): ModelComparisonResult {
    const variantA = results.filter(r => r.variant === 'A');
    const variantB = results.filter(r => r.variant === 'B');

    // Calculate metrics for each variant
    const metricsA = this.calculateVariantMetrics(variantA);
    const metricsB = this.calculateVariantMetrics(variantB);

    // Perform statistical significance test
    const significance = this.performSignificanceTest(variantA, variantB, test.statistical_significance_threshold);

    return {
      model_a: {
        deployment_id: test.model_a_deployment_id,
        metrics: metricsA,
        sample_size: variantA.length
      },
      model_b: {
        deployment_id: test.model_b_deployment_id,
        metrics: metricsB,
        sample_size: variantB.length
      },
      statistical_significance: significance,
      winner: significance.is_significant ? this.determineWinner(metricsA, metricsB) : 'tie',
      recommendations: this.generateABTestRecommendations(metricsA, metricsB, significance)
    };
  }

  private calculateVariantMetrics(results: ABTestResult[]): ModelMetrics {
    const latencies = results.map(r => r.latency_ms || 0).filter(l => l > 0);
    const qualityScores = results.map(r => r.response_quality_score || 0).filter(s => s > 0);
    const errors = results.filter(r => r.error_occurred);

    return {
      latency_avg: this.calculateAverage(latencies),
      latency_p95: this.calculatePercentile(latencies, 95),
      latency_p99: this.calculatePercentile(latencies, 99),
      throughput: results.length / 24, // Assuming 24 hour test period
      error_rate: errors.length / results.length,
      accuracy: this.calculateAverage(qualityScores),
      cost_per_request: 0, // Would calculate based on token usage
      user_satisfaction: this.calculateAverage(results.map(r => r.user_feedback_score || 0).filter(s => s > 0)),
      uptime_percentage: (results.length - errors.length) / results.length * 100
    };
  }

  private performSignificanceTest(variantA: ABTestResult[], variantB: ABTestResult[], threshold: number): any {
    // Simplified statistical significance test
    // In production, use proper statistical libraries
    const sampleSizeA = variantA.length;
    const sampleSizeB = variantB.length;
    
    if (sampleSizeA < 100 || sampleSizeB < 100) {
      return {
        is_significant: false,
        confidence_level: 0,
        p_value: 1
      };
    }

    // Mock p-value calculation - replace with actual statistical test
    const mockPValue = Math.random() * 0.1;
    
    return {
      is_significant: mockPValue < threshold,
      confidence_level: 1 - mockPValue,
      p_value: mockPValue
    };
  }

  private determineWinner(metricsA: ModelMetrics, metricsB: ModelMetrics): 'A' | 'B' | 'tie' {
    // Simple scoring based on key metrics
    let scoreA = 0;
    let scoreB = 0;

    // Lower latency is better
    if (metricsA.latency_avg < metricsB.latency_avg) scoreA++; else scoreB++;
    
    // Lower error rate is better
    if (metricsA.error_rate < metricsB.error_rate) scoreA++; else scoreB++;
    
    // Higher accuracy is better
    if ((metricsA.accuracy || 0) > (metricsB.accuracy || 0)) scoreA++; else scoreB++;

    if (scoreA > scoreB) return 'A';
    if (scoreB > scoreA) return 'B';
    return 'tie';
  }

  private generateABTestRecommendations(metricsA: ModelMetrics, metricsB: ModelMetrics, significance: any): string[] {
    const recommendations: string[] = [];
    
    if (!significance.is_significant) {
      recommendations.push('Test did not reach statistical significance. Consider running longer or with more traffic.');
    }
    
    if (Math.abs(metricsA.latency_avg - metricsB.latency_avg) > 100) {
      recommendations.push('Significant latency difference detected. Consider optimizing the slower variant.');
    }
    
    if (Math.abs(metricsA.error_rate - metricsB.error_rate) > 0.01) {
      recommendations.push('Error rate differences suggest quality issues. Investigate the higher error variant.');
    }
    
    return recommendations;
  }

  private async queueTrainingJob(jobId: string): Promise<void> {
    // Queue the training job for execution
    await this.edgeFunctionService.invoke('queue-training-job', { job_id: jobId });
  }

  private async performHealthChecks(): Promise<void> {
    const activeDeployments = await this.dbService.findMany('ai_model_deployments', {
      where: { status: 'healthy' }
    }) as ModelDeployment[];

    for (const deployment of activeDeployments) {
      const health = await this.getModelHealth(deployment.id);
      
      if (health.overall_health === 'critical') {
        await this.createAlert(
          deployment.id,
          'availability_issue',
          health.health_score,
          { type: 'health_score', threshold: 50, comparison: 'less_than' }
        );
      }
    }
  }

  private async runOptimizationAnalysis(): Promise<void> {
    if (!this.config.auto_optimization_enabled) {
      return;
    }

    const deployments = await this.dbService.findMany('ai_model_deployments', {
      where: { status: 'healthy' }
    }) as ModelDeployment[];

    for (const deployment of deployments) {
      await this.generateOptimizationRecommendations(deployment.id);
    }
  }

  private async getModelByDeployment(deploymentId: string): Promise<AIModel> {
    const deployment = await this.dbService.read('ai_model_deployments', deploymentId) as ModelDeployment;
    const lifecycle = await this.dbService.read('ai_model_lifecycle', deployment.lifecycle_id) as ModelLifecycle;
    return await this.dbService.read('ai_models', lifecycle.model_id) as AIModel;
  }

  private calculateCost(model: AIModel, inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1000) * model.cost_per_1k_input_tokens;
    const outputCost = (outputTokens / 1000) * model.cost_per_1k_output_tokens;
    return inputCost + outputCost;
  }

  private determineSeverity(
    alertType: ModelAlert['alert_type'],
    currentValue: number,
    threshold: any
  ): ModelAlert['severity'] {
    const exceedanceRatio = currentValue / threshold.value;
    
    if (exceedanceRatio > 3) return 'emergency';
    if (exceedanceRatio > 2) return 'critical';
    if (exceedanceRatio > 1.5) return 'warning';
    return 'info';
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  private calculateUptimePercentage(metrics: PerformanceMetric[]): number {
    // Simplified uptime calculation based on error rate metrics
    const errorMetrics = metrics.filter(m => m.metric_type === 'error_rate');
    if (errorMetrics.length === 0) return 100;
    
    const avgErrorRate = this.calculateAverage(errorMetrics.map(m => m.metric_value));
    return Math.max(0, (1 - avgErrorRate) * 100);
  }
}
