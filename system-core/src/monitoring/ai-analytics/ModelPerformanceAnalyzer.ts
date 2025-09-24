/**
 * Model Performance Analyzer
 * 
 * Comprehensive performance monitoring and analytics for AI models
 */

import { EventEmitter } from 'events';
import { Logger } from '../../shared-utils/logger';
import { AIMonitoringConfig, AIMonitoringBackend, AIMetric, ModelPerformanceMetrics } from '../AIPerformanceAnalytics';

export class ModelPerformanceAnalyzer extends EventEmitter {
  private config: AIMonitoringConfig;
  private logger: Logger;
  private backend: AIMonitoringBackend;
  
  // Model tracking
  private modelMetrics: Map<string, ModelPerformanceMetrics> = new Map();
  private modelHistory: Map<string, AIMetric[]> = new Map();
  private performanceBaselines: Map<string, Record<string, number>> = new Map();
  private driftDetection: Map<string, DriftDetectionState> = new Map();
  
  // Monitoring timers
  private metricsUpdateTimer?: NodeJS.Timeout;
  private performanceAnalysisTimer?: NodeJS.Timeout;
  private driftDetectionTimer?: NodeJS.Timeout;
  
  constructor(config: AIMonitoringConfig, logger: Logger, backend: AIMonitoringBackend) {
    super();
    this.config = config;
    this.logger = logger;
    this.backend = backend;
  }
  
  async initialize(): Promise<void> {
    this.logger.info('Initializing Model Performance Analyzer');
    
    try {
      // Load existing model metrics
      await this.loadModelBaselines();
      
      // Initialize drift detection
      if (this.config.modelDriftDetection) {
        await this.initializeDriftDetection();
      }
      
      // Start monitoring
      this.startMonitoring();
      
      this.logger.info('Model Performance Analyzer initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Model Performance Analyzer', error);
      throw error;
    }
  }
  
  async updateModelMetrics(modelId: string, metric: AIMetric): Promise<void> {
    try {
      // Update metric history
      const history = this.modelHistory.get(modelId) || [];
      history.push(metric);
      
      // Keep only recent metrics
      const maxHistory = 1000;
      if (history.length > maxHistory) {
        history.splice(0, history.length - maxHistory);
      }
      
      this.modelHistory.set(modelId, history);
      
      // Update drift detection
      if (this.config.modelDriftDetection) {
        await this.updateDriftDetection(modelId, metric);
      }
      
      // Update performance metrics
      await this.calculateModelPerformance(modelId);
      
      this.emit('model-metrics-updated', { model_id: modelId, metric });
    } catch (error) {
      this.logger.error('Failed to update model metrics', error);
    }
  }
  
  async collectMetrics(): Promise<void> {
    try {
      // Collect metrics from active models
      const activeModels = await this.getActiveModels();
      
      for (const modelId of activeModels) {
        await this.collectModelMetrics(modelId);
      }
    } catch (error) {
      this.logger.error('Failed to collect model metrics', error);
    }
  }
  
  async processAnalytics(): Promise<void> {
    try {
      // Process performance analytics for all models
      for (const modelId of this.modelMetrics.keys()) {
        await this.analyzeModelPerformance(modelId);
      }
      
      // Generate performance insights
      await this.generateModelInsights();
      
      // Cost analysis
      if (this.config.costMonitoringEnabled) {
        await this.analyzeCosts();
      }
    } catch (error) {
      this.logger.error('Failed to process model analytics', error);
    }
  }
  
  async getModelSummary(): Promise<ModelPerformanceMetrics[]> {
    return Array.from(this.modelMetrics.values());
  }
  
  async getModelPerformanceHistory(modelId: string, timeRange: string = '24h'): Promise<ModelPerformanceMetrics[]> {
    return await this.backend.getModelPerformance(modelId, timeRange);
  }
  
  async getModelMetrics(modelId: string): Promise<ModelPerformanceMetrics | null> {
    return this.modelMetrics.get(modelId) || null;
  }
  
  async getModelDriftScore(modelId: string): Promise<number> {
    const driftState = this.driftDetection.get(modelId);
    return driftState?.currentDriftScore || 0;
  }
  
  // Private methods
  
  private startMonitoring(): void {
    // Regular metrics updates
    this.metricsUpdateTimer = setInterval(() => {
      this.updateAllModelMetrics();
    }, 30000); // Every 30 seconds
    
    // Performance analysis
    this.performanceAnalysisTimer = setInterval(() => {
      this.processAnalytics();
    }, 300000); // Every 5 minutes
    
    // Drift detection
    if (this.config.modelDriftDetection) {
      this.driftDetectionTimer = setInterval(() => {
        this.runDriftDetection();
      }, 600000); // Every 10 minutes
    }
  }
  
  private async loadModelBaselines(): Promise<void> {
    try {
      // Load performance baselines from historical data
      const models = await this.getKnownModels();
      
      for (const modelId of models) {
        const baseline = await this.calculatePerformanceBaseline(modelId);
        this.performanceBaselines.set(modelId, baseline);
      }
    } catch (error) {
      this.logger.error('Failed to load model baselines', error);
    }
  }
  
  private async initializeDriftDetection(): Promise<void> {
    try {
      const models = await this.getKnownModels();
      
      for (const modelId of models) {
        const driftState: DriftDetectionState = {
          modelId,
          referenceDistribution: await this.calculateReferenceDistribution(modelId),
          currentDriftScore: 0,
          driftTrend: 'stable',
          lastDriftCheck: new Date(),
          driftHistory: []
        };
        
        this.driftDetection.set(modelId, driftState);
      }
    } catch (error) {
      this.logger.error('Failed to initialize drift detection', error);
    }
  }
  
  private async getActiveModels(): Promise<string[]> {
    try {
      // Get list of active models from the system
      const metrics = await this.backend.getMetrics({
        metric_type: 'performance',
        timestamp: { '>=': new Date(Date.now() - 300000) } // Last 5 minutes
      });
      
      const modelIds = new Set<string>();
      for (const metric of metrics) {
        if (metric.model_id) {
          modelIds.add(metric.model_id);
        }
      }
      
      return Array.from(modelIds);
    } catch (error) {
      this.logger.error('Failed to get active models', error);
      return [];
    }
  }
  
  private async getKnownModels(): Promise<string[]> {
    try {
      // Get all known models from metrics history
      const metrics = await this.backend.getMetrics({});
      const modelIds = new Set<string>();
      
      for (const metric of metrics) {
        if (metric.model_id) {
          modelIds.add(metric.model_id);
        }
      }
      
      return Array.from(modelIds);
    } catch (error) {
      this.logger.error('Failed to get known models', error);
      return [];
    }
  }
  
  private async collectModelMetrics(modelId: string): Promise<void> {
    try {
      // This would integrate with your model monitoring system
      // For now, we'll simulate collecting metrics
      
      const currentTime = new Date();
      const mockMetrics = [
        {
          name: 'inference_latency',
          value: Math.random() * 200 + 50, // 50-250ms
          type: 'latency' as const
        },
        {
          name: 'tokens_per_second',
          value: Math.random() * 100 + 50, // 50-150 tokens/s
          type: 'throughput' as const
        },
        {
          name: 'gpu_utilization',
          value: Math.random() * 0.4 + 0.4, // 40-80%
          type: 'resource' as const
        },
        {
          name: 'memory_usage',
          value: Math.random() * 2000 + 1000, // 1-3GB
          type: 'resource' as const
        },
        {
          name: 'cache_hit_rate',
          value: Math.random() * 0.3 + 0.7, // 70-100%
          type: 'performance' as const
        }
      ];
      
      for (const mockMetric of mockMetrics) {
        const metric: AIMetric = {
          metric_id: `${mockMetric.name}_${modelId}_${Date.now()}`,
          model_id: modelId,
          metric_name: mockMetric.name,
          metric_value: mockMetric.value,
          metric_unit: this.getMetricUnit(mockMetric.name),
          metric_type: mockMetric.type,
          timestamp: currentTime,
          context: { collection_type: 'system' },
          tags: ['auto_collected']
        };
        
        await this.backend.storeMetric(metric);
        await this.updateModelMetrics(modelId, metric);
      }
    } catch (error) {
      this.logger.error('Failed to collect model metrics', { model_id: modelId, error });
    }
  }
  
  private async calculateModelPerformance(modelId: string): Promise<void> {
    try {
      const history = this.modelHistory.get(modelId) || [];
      if (history.length === 0) return;
      
      // Calculate performance metrics from history
      const latencyMetrics = history.filter(m => m.metric_name === 'inference_latency');
      const throughputMetrics = history.filter(m => m.metric_name === 'tokens_per_second');
      const gpuMetrics = history.filter(m => m.metric_name === 'gpu_utilization');
      const memoryMetrics = history.filter(m => m.metric_name === 'memory_usage');
      const cacheMetrics = history.filter(m => m.metric_name === 'cache_hit_rate');
      const errorMetrics = history.filter(m => m.metric_name === 'error_rate');
      
      const performanceMetrics: ModelPerformanceMetrics = {
        model_id: modelId,
        model_name: await this.getModelName(modelId),
        model_version: await this.getModelVersion(modelId),
        inference_latency_avg: this.calculateAverage(latencyMetrics.map(m => m.metric_value)),
        inference_latency_p95: this.calculatePercentile(latencyMetrics.map(m => m.metric_value), 0.95),
        tokens_per_second: this.calculateAverage(throughputMetrics.map(m => m.metric_value)),
        gpu_utilization: this.calculateAverage(gpuMetrics.map(m => m.metric_value)),
        memory_usage: this.calculateAverage(memoryMetrics.map(m => m.metric_value)),
        cache_hit_rate: this.calculateAverage(cacheMetrics.map(m => m.metric_value)),
        accuracy_metrics: this.calculateAccuracyMetrics(history),
        cost_per_request: this.calculateCostPerRequest(history),
        error_rate: this.calculateAverage(errorMetrics.map(m => m.metric_value)),
        drift_score: this.getModelDriftScore(modelId),
        performance_trend: this.calculatePerformanceTrend(modelId),
        last_updated: new Date()
      };
      
      this.modelMetrics.set(modelId, performanceMetrics);
      
      // Store in backend
      await this.backend.storeModelPerformance(performanceMetrics);
      
      this.emit('model-performance-calculated', { model_id: modelId, metrics: performanceMetrics });
    } catch (error) {
      this.logger.error('Failed to calculate model performance', { model_id: modelId, error });
    }
  }
  
  private async analyzeModelPerformance(modelId: string): Promise<void> {
    try {
      const currentMetrics = this.modelMetrics.get(modelId);
      const baseline = this.performanceBaselines.get(modelId);
      
      if (!currentMetrics || !baseline) return;
      
      // Compare against baseline
      const performanceChanges = {
        latency_change: ((currentMetrics.inference_latency_avg - baseline.inference_latency_avg) / baseline.inference_latency_avg) * 100,
        throughput_change: ((currentMetrics.tokens_per_second - baseline.tokens_per_second) / baseline.tokens_per_second) * 100,
        memory_change: ((currentMetrics.memory_usage - baseline.memory_usage) / baseline.memory_usage) * 100
      };
      
      // Detect significant changes
      const significantThreshold = 15; // 15% change
      
      if (Math.abs(performanceChanges.latency_change) > significantThreshold) {
        this.emit('model-performance-change', {
          model_id: modelId,
          metric: 'inference_latency',
          change_percent: performanceChanges.latency_change,
          current_value: currentMetrics.inference_latency_avg,
          baseline_value: baseline.inference_latency_avg
        });
      }
      
      // Check for drift alerts
      if (currentMetrics.drift_score > this.config.driftAlertThreshold) {
        this.emit('model-drift-detected', {
          model_id: modelId,
          drift_score: currentMetrics.drift_score,
          threshold: this.config.driftAlertThreshold
        });
      }
    } catch (error) {
      this.logger.error('Failed to analyze model performance', { model_id: modelId, error });
    }
  }
  
  private async updateDriftDetection(modelId: string, metric: AIMetric): Promise<void> {
    try {
      const driftState = this.driftDetection.get(modelId);
      if (!driftState) return;
      
      // Update drift detection based on new metric
      if (metric.metric_name === 'accuracy' || metric.metric_name === 'output_distribution') {
        const currentDrift = this.calculateDriftScore(metric, driftState.referenceDistribution);
        
        driftState.currentDriftScore = currentDrift;
        driftState.driftHistory.push({
          timestamp: metric.timestamp,
          drift_score: currentDrift
        });
        
        // Keep only recent drift history
        if (driftState.driftHistory.length > 100) {
          driftState.driftHistory.splice(0, driftState.driftHistory.length - 100);
        }
        
        // Update drift trend
        driftState.driftTrend = this.calculateDriftTrend(driftState.driftHistory);
        driftState.lastDriftCheck = new Date();
        
        this.driftDetection.set(modelId, driftState);
      }
    } catch (error) {
      this.logger.error('Failed to update drift detection', { model_id: modelId, error });
    }
  }
  
  private async runDriftDetection(): Promise<void> {
    try {
      for (const [modelId, driftState] of this.driftDetection) {
        // Check if drift detection is needed
        const timeSinceLastCheck = Date.now() - driftState.lastDriftCheck.getTime();
        if (timeSinceLastCheck < 300000) continue; // Skip if checked recently
        
        // Run drift detection
        const currentDrift = await this.detectModelDrift(modelId);
        if (currentDrift !== null) {
          driftState.currentDriftScore = currentDrift;
          driftState.lastDriftCheck = new Date();
          
          // Check for significant drift
          if (currentDrift > this.config.driftAlertThreshold) {
            this.emit('drift-alert', {
              model_id: modelId,
              drift_score: currentDrift,
              threshold: this.config.driftAlertThreshold
            });
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to run drift detection', error);
    }
  }
  
  private async generateModelInsights(): Promise<void> {
    try {
      const allMetrics = Array.from(this.modelMetrics.values());
      
      // Find most efficient models
      const mostEfficient = allMetrics
        .sort((a, b) => (b.tokens_per_second / b.memory_usage) - (a.tokens_per_second / a.memory_usage))
        .slice(0, 3);
      
      // Find models with high drift
      const highDrift = allMetrics.filter(metrics => metrics.drift_score > 0.7);
      
      // Find cost-effective models
      const costEffective = allMetrics
        .sort((a, b) => a.cost_per_request - b.cost_per_request)
        .slice(0, 3);
      
      this.emit('model-insights-generated', {
        most_efficient: mostEfficient.map(m => m.model_id),
        high_drift: highDrift.map(m => m.model_id),
        cost_effective: costEffective.map(m => m.model_id),
        total_models: allMetrics.length
      });
    } catch (error) {
      this.logger.error('Failed to generate model insights', error);
    }
  }
  
  private async analyzeCosts(): Promise<void> {
    try {
      const allMetrics = Array.from(this.modelMetrics.values());
      
      // Calculate total daily cost
      const totalDailyCost = allMetrics.reduce((sum, model) => {
        return sum + (model.cost_per_request * model.tokens_per_second * 24 * 3600);
      }, 0);
      
      // Check budget alerts
      if (this.config.costBudgetAlerts) {
        if (this.config.dailyBudgetLimit && totalDailyCost > this.config.dailyBudgetLimit) {
          this.emit('budget-alert', {
            type: 'daily',
            current_cost: totalDailyCost,
            budget_limit: this.config.dailyBudgetLimit,
            overage: totalDailyCost - this.config.dailyBudgetLimit
          });
        }
      }
      
      this.emit('cost-analysis-completed', {
        total_daily_cost: totalDailyCost,
        models_analyzed: allMetrics.length
      });
    } catch (error) {
      this.logger.error('Failed to analyze costs', error);
    }
  }
  
  private async updateAllModelMetrics(): Promise<void> {
    try {
      for (const modelId of this.modelMetrics.keys()) {
        await this.calculateModelPerformance(modelId);
      }
    } catch (error) {
      this.logger.error('Failed to update all model metrics', error);
    }
  }
  
  private async calculatePerformanceBaseline(modelId: string): Promise<Record<string, number>> {
    try {
      // Calculate baseline from historical data (last 7 days)
      const historicalMetrics = await this.backend.getModelPerformance(modelId, '7d');
      
      if (historicalMetrics.length === 0) {
        // Default baseline
        return {
          inference_latency_avg: 100,
          tokens_per_second: 75,
          gpu_utilization: 0.6,
          memory_usage: 1500,
          error_rate: 0.01
        };
      }
      
      // Calculate averages from historical data
      return {
        inference_latency_avg: this.calculateAverage(historicalMetrics.map(m => m.inference_latency_avg)),
        tokens_per_second: this.calculateAverage(historicalMetrics.map(m => m.tokens_per_second)),
        gpu_utilization: this.calculateAverage(historicalMetrics.map(m => m.gpu_utilization)),
        memory_usage: this.calculateAverage(historicalMetrics.map(m => m.memory_usage)),
        error_rate: this.calculateAverage(historicalMetrics.map(m => m.error_rate))
      };
    } catch (error) {
      this.logger.error('Failed to calculate performance baseline', { model_id: modelId, error });
      return {};
    }
  }
  
  private async calculateReferenceDistribution(modelId: string): Promise<Record<string, number>> {
    try {
      // Calculate reference distribution for drift detection
      const historicalMetrics = await this.backend.getMetrics({
        model_id: modelId,
        metric_type: 'accuracy'
      });
      
      // Simplified reference distribution calculation
      const accuracyValues = historicalMetrics.map(m => m.metric_value);
      if (accuracyValues.length === 0) {
        return { mean: 0.85, std: 0.05 };
      }
      
      const mean = this.calculateAverage(accuracyValues);
      const std = this.calculateStandardDeviation(accuracyValues, mean);
      
      return { mean, std };
    } catch (error) {
      this.logger.error('Failed to calculate reference distribution', { model_id: modelId, error });
      return { mean: 0.85, std: 0.05 };
    }
  }
  
  private async detectModelDrift(modelId: string): Promise<number | null> {
    try {
      // Get recent metrics for drift detection
      const recentMetrics = await this.backend.getMetrics({
        model_id: modelId,
        metric_type: 'accuracy',
        timestamp: { '>=': new Date(Date.now() - 3600000) } // Last hour
      });
      
      if (recentMetrics.length === 0) return null;
      
      const driftState = this.driftDetection.get(modelId);
      if (!driftState) return null;
      
      // Calculate drift score using statistical methods
      const recentValues = recentMetrics.map(m => m.metric_value);
      const currentMean = this.calculateAverage(recentValues);
      
      const referenceMean = driftState.referenceDistribution.mean;
      const referenceStd = driftState.referenceDistribution.std;
      
      // Simple drift calculation (normalized difference)
      const driftScore = Math.abs(currentMean - referenceMean) / referenceStd;
      
      return Math.min(1.0, driftScore); // Normalize to 0-1
    } catch (error) {
      this.logger.error('Failed to detect model drift', { model_id: modelId, error });
      return null;
    }
  }
  
  private calculateDriftScore(metric: AIMetric, referenceDistribution: Record<string, number>): number {
    // Calculate drift score for a single metric
    const referenceMean = referenceDistribution.mean || 0;
    const referenceStd = referenceDistribution.std || 1;
    
    const deviation = Math.abs(metric.metric_value - referenceMean);
    return Math.min(1.0, deviation / (referenceStd * 3)); // 3-sigma normalization
  }
  
  private calculateDriftTrend(driftHistory: DriftHistoryPoint[]): 'increasing' | 'decreasing' | 'stable' {
    if (driftHistory.length < 5) return 'stable';
    
    const recent = driftHistory.slice(-5);
    const firstHalf = recent.slice(0, 2).map(p => p.drift_score);
    const secondHalf = recent.slice(-2).map(p => p.drift_score);
    
    const firstAvg = this.calculateAverage(firstHalf);
    const secondAvg = this.calculateAverage(secondHalf);
    
    const change = secondAvg - firstAvg;
    
    if (Math.abs(change) < 0.05) return 'stable';
    return change > 0 ? 'increasing' : 'decreasing';
  }
  
  private calculatePerformanceTrend(modelId: string): 'improving' | 'stable' | 'degrading' {
    const currentMetrics = this.modelMetrics.get(modelId);
    const baseline = this.performanceBaselines.get(modelId);
    
    if (!currentMetrics || !baseline) return 'stable';
    
    // Simple trend calculation based on key metrics
    const latencyImprovement = (baseline.inference_latency_avg - currentMetrics.inference_latency_avg) / baseline.inference_latency_avg;
    const throughputImprovement = (currentMetrics.tokens_per_second - baseline.tokens_per_second) / baseline.tokens_per_second;
    
    const overallImprovement = (latencyImprovement + throughputImprovement) / 2;
    
    if (overallImprovement > 0.1) return 'improving';
    if (overallImprovement < -0.1) return 'degrading';
    return 'stable';
  }
  
  private async getModelName(modelId: string): Promise<string> {
    // This would integrate with your model registry
    return `Model-${modelId.slice(0, 8)}`;
  }
  
  private async getModelVersion(modelId: string): Promise<string> {
    // This would integrate with your model registry
    return '1.0.0';
  }
  
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
  
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[index] || 0;
  }
  
  private calculateStandardDeviation(values: number[], mean: number): number {
    if (values.length === 0) return 0;
    
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }
  
  private calculateAccuracyMetrics(metrics: AIMetric[]): Record<string, number> {
    const accuracyMetrics = metrics.filter(m => m.metric_name.includes('accuracy'));
    
    if (accuracyMetrics.length === 0) {
      return { overall: 0.85 };
    }
    
    return {
      overall: this.calculateAverage(accuracyMetrics.map(m => m.metric_value)),
      precision: this.calculateAverage(metrics.filter(m => m.metric_name.includes('precision')).map(m => m.metric_value)) || 0.85,
      recall: this.calculateAverage(metrics.filter(m => m.metric_name.includes('recall')).map(m => m.metric_value)) || 0.85
    };
  }
  
  private calculateCostPerRequest(metrics: AIMetric[]): number {
    const costMetrics = metrics.filter(m => m.metric_name.includes('cost'));
    
    if (costMetrics.length === 0) {
      // Estimate cost based on GPU utilization and model complexity
      const gpuMetrics = metrics.filter(m => m.metric_name === 'gpu_utilization');
      const avgGpuUsage = this.calculateAverage(gpuMetrics.map(m => m.metric_value));
      
      // Simple cost estimation (GPU hours * rate)
      return avgGpuUsage * 0.001; // $0.001 per request at full GPU utilization
    }
    
    return this.calculateAverage(costMetrics.map(m => m.metric_value));
  }
  
  private getMetricUnit(metricName: string): string {
    const unitMappings: Record<string, string> = {
      'inference_latency': 'ms',
      'tokens_per_second': 'tokens/s',
      'gpu_utilization': '%',
      'memory_usage': 'MB',
      'cache_hit_rate': '%',
      'accuracy': '%',
      'cost_per_request': '$',
      'drift_score': 'score'
    };
    
    for (const [pattern, unit] of Object.entries(unitMappings)) {
      if (metricName.includes(pattern)) {
        return unit;
      }
    }
    
    return '';
  }
  
  async destroy(): Promise<void> {
    try {
      // Stop monitoring timers
      if (this.metricsUpdateTimer) clearInterval(this.metricsUpdateTimer);
      if (this.performanceAnalysisTimer) clearInterval(this.performanceAnalysisTimer);
      if (this.driftDetectionTimer) clearInterval(this.driftDetectionTimer);
      
      // Clear state
      this.modelMetrics.clear();
      this.modelHistory.clear();
      this.performanceBaselines.clear();
      this.driftDetection.clear();
      
      this.logger.info('Model Performance Analyzer destroyed');
    } catch (error) {
      this.logger.error('Failed to destroy Model Performance Analyzer', error);
      throw error;
    }
  }
}

// Supporting interfaces
interface DriftDetectionState {
  modelId: string;
  referenceDistribution: Record<string, number>;
  currentDriftScore: number;
  driftTrend: 'increasing' | 'decreasing' | 'stable';
  lastDriftCheck: Date;
  driftHistory: DriftHistoryPoint[];
}

interface DriftHistoryPoint {
  timestamp: Date;
  drift_score: number;
}
