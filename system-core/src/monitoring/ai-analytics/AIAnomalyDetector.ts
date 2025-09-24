/**
 * AI Anomaly Detector
 * 
 * Advanced anomaly detection for AI systems using statistical methods,
 * pattern recognition, and machine learning techniques.
 */

import { EventEmitter } from 'events';
import { Logger } from '../../shared-utils/logger';
import { AIMonitoringConfig, AIMonitoringBackend, AIMetric, AIAnomaly } from '../AIPerformanceAnalytics';

export class AIAnomalyDetector extends EventEmitter {
  private config: AIMonitoringConfig;
  private logger: Logger;
  private backend: AIMonitoringBackend;
  
  // Anomaly detection state
  private detectionModels: Map<string, AnomalyDetectionModel> = new Map();
  private anomalyHistory: Map<string, AnomalyHistoryPoint[]> = new Map();
  private baselineModels: Map<string, BaselineModel> = new Map();
  
  // Detection timers
  private anomalyDetectionTimer?: NodeJS.Timeout;
  private modelUpdateTimer?: NodeJS.Timeout;
  
  constructor(config: AIMonitoringConfig, logger: Logger, backend: AIMonitoringBackend) {
    super();
    this.config = config;
    this.logger = logger;
    this.backend = backend;
  }
  
  async initialize(): Promise<void> {
    this.logger.info('Initializing AI Anomaly Detector');
    
    try {
      // Initialize detection models
      await this.initializeDetectionModels();
      
      // Load historical anomalies
      await this.loadAnomalyHistory();
      
      // Start monitoring
      this.startAnomalyDetection();
      
      this.logger.info('AI Anomaly Detector initialized');
    } catch (error) {
      this.logger.error('Failed to initialize AI Anomaly Detector', error);
      throw error;
    }
  }
  
  async detectAnomalies(metrics: Map<string, AIMetric[]>): Promise<AIAnomaly[]> {
    const detectedAnomalies: AIAnomaly[] = [];
    
    try {
      for (const [metricName, metricHistory] of metrics) {
        if (metricHistory.length < 10) continue; // Need sufficient history
        
        const anomaly = await this.detectMetricAnomaly(metricName, metricHistory);
        if (anomaly) {
          detectedAnomalies.push(anomaly);
          await this.backend.storeAnomaly(anomaly);
        }
      }
      
      // Cross-metric anomaly detection
      const crossMetricAnomalies = await this.detectCrossMetricAnomalies(metrics);
      detectedAnomalies.push(...crossMetricAnomalies);
      
      return detectedAnomalies;
    } catch (error) {
      this.logger.error('Failed to detect anomalies', error);
      return [];
    }
  }
  
  async checkForAnomaly(metric: AIMetric): Promise<AIAnomaly | null> {
    try {
      const detectionModel = this.detectionModels.get(metric.metric_name);
      if (!detectionModel) {
        return null; // No model available yet
      }
      
      const anomalyScore = this.calculateAnomalyScore(metric, detectionModel);
      
      if (anomalyScore > this.config.anomalySensitivity) {
        const anomaly = await this.createAnomaly(metric, anomalyScore, detectionModel);
        await this.backend.storeAnomaly(anomaly);
        
        this.emit('anomaly-detected', anomaly);
        return anomaly;
      }
      
      return null;
    } catch (error) {
      this.logger.error('Failed to check for anomaly', error);
      return null;
    }
  }
  
  async updateDetectionModel(metricName: string, metrics: AIMetric[]): Promise<void> {
    try {
      if (metrics.length < 20) return; // Need sufficient data
      
      const model = await this.buildDetectionModel(metricName, metrics);
      this.detectionModels.set(metricName, model);
      
      this.emit('detection-model-updated', { metric_name: metricName, model_quality: model.quality });
    } catch (error) {
      this.logger.error('Failed to update detection model', { metric_name: metricName, error });
    }
  }
  
  async getAnomalyInsights(): Promise<AnomalyInsights> {
    try {
      const recentAnomalies = await this.backend.getAnomalies({
        detected_at: { '>=': new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      });
      
      return {
        total_anomalies: recentAnomalies.length,
        severity_distribution: this.calculateSeverityDistribution(recentAnomalies),
        type_distribution: this.calculateTypeDistribution(recentAnomalies),
        entity_distribution: this.calculateEntityDistribution(recentAnomalies),
        trend: this.calculateAnomalyTrend(recentAnomalies),
        top_affected_entities: this.getTopAffectedEntities(recentAnomalies)
      };
    } catch (error) {
      this.logger.error('Failed to get anomaly insights', error);
      return {
        total_anomalies: 0,
        severity_distribution: {},
        type_distribution: {},
        entity_distribution: {},
        trend: 'stable',
        top_affected_entities: []
      };
    }
  }
  
  // Private methods
  
  private startAnomalyDetection(): void {
    // Real-time anomaly detection
    this.anomalyDetectionTimer = setInterval(() => {
      this.runBatchAnomalyDetection();
    }, 60000); // Every minute
    
    // Model updates
    this.modelUpdateTimer = setInterval(() => {
      this.updateAllDetectionModels();
    }, 600000); // Every 10 minutes
  }
  
  private async initializeDetectionModels(): Promise<void> {
    try {
      // Get all unique metrics to create models for
      const allMetrics = await this.backend.getMetrics({});
      const metricNames = new Set(allMetrics.map(m => m.metric_name));
      
      for (const metricName of metricNames) {
        const metricHistory = allMetrics.filter(m => m.metric_name === metricName);
        if (metricHistory.length >= 20) {
          await this.updateDetectionModel(metricName, metricHistory);
        }
      }
    } catch (error) {
      this.logger.error('Failed to initialize detection models', error);
    }
  }
  
  private async loadAnomalyHistory(): Promise<void> {
    try {
      const anomalies = await this.backend.getAnomalies({});
      
      for (const anomaly of anomalies) {
        const history = this.anomalyHistory.get(anomaly.entity_id) || [];
        history.push({
          timestamp: anomaly.detected_at,
          anomaly_type: anomaly.anomaly_type,
          severity: anomaly.severity
        });
        this.anomalyHistory.set(anomaly.entity_id, history);
      }
    } catch (error) {
      this.logger.error('Failed to load anomaly history', error);
    }
  }
  
  private async detectMetricAnomaly(metricName: string, metricHistory: AIMetric[]): Promise<AIAnomaly | null> {
    try {
      const detectionModel = this.detectionModels.get(metricName);
      if (!detectionModel) return null;
      
      const latestMetric = metricHistory[metricHistory.length - 1];
      const anomalyScore = this.calculateAnomalyScore(latestMetric, detectionModel);
      
      if (anomalyScore > this.config.anomalySensitivity) {
        return await this.createAnomaly(latestMetric, anomalyScore, detectionModel);
      }
      
      return null;
    } catch (error) {
      this.logger.error('Failed to detect metric anomaly', { metric_name: metricName, error });
      return null;
    }
  }
  
  private async detectCrossMetricAnomalies(metrics: Map<string, AIMetric[]>): Promise<AIAnomaly[]> {
    const anomalies: AIAnomaly[] = [];
    
    try {
      // Group metrics by entity (agent or model)
      const entityMetrics = new Map<string, Map<string, AIMetric[]>>();
      
      for (const [metricName, metricHistory] of metrics) {
        for (const metric of metricHistory) {
          const entityId = metric.agent_id || metric.model_id || 'system';
          
          if (!entityMetrics.has(entityId)) {
            entityMetrics.set(entityId, new Map());
          }
          
          const entityMetricMap = entityMetrics.get(entityId)!;
          if (!entityMetricMap.has(metricName)) {
            entityMetricMap.set(metricName, []);
          }
          
          entityMetricMap.get(metricName)!.push(metric);
        }
      }
      
      // Detect cross-metric anomalies for each entity
      for (const [entityId, entityMetricMap] of entityMetrics) {
        const crossMetricAnomaly = await this.detectEntityCrossMetricAnomaly(entityId, entityMetricMap);
        if (crossMetricAnomaly) {
          anomalies.push(crossMetricAnomaly);
        }
      }
      
      return anomalies;
    } catch (error) {
      this.logger.error('Failed to detect cross-metric anomalies', error);
      return [];
    }
  }
  
  private async detectEntityCrossMetricAnomaly(
    entityId: string,
    entityMetrics: Map<string, AIMetric[]>
  ): Promise<AIAnomaly | null> {
    try {
      // Look for correlated anomalies across multiple metrics
      const recentMetrics = new Map<string, AIMetric>();
      
      // Get the most recent metric for each type
      for (const [metricName, metricHistory] of entityMetrics) {
        if (metricHistory.length > 0) {
          recentMetrics.set(metricName, metricHistory[metricHistory.length - 1]);
        }
      }
      
      // Check for known anomaly patterns
      const patterns = [
        this.checkPerformanceDegradationPattern(recentMetrics),
        this.checkResourceExhaustionPattern(recentMetrics),
        this.checkAccuracyDropPattern(recentMetrics)
      ];
      
      const detectedPattern = patterns.find(pattern => pattern !== null);
      
      if (detectedPattern) {
        const anomaly: AIAnomaly = {
          anomaly_id: `cross_metric_${entityId}_${Date.now()}`,
          entity_type: this.determineEntityType(entityId),
          entity_id: entityId,
          anomaly_type: detectedPattern.type,
          severity: detectedPattern.severity,
          description: detectedPattern.description,
          detected_at: new Date(),
          metrics: detectedPattern.metrics,
          predicted_impact: detectedPattern.predicted_impact,
          recommended_actions: detectedPattern.recommended_actions
        };
        
        await this.backend.storeAnomaly(anomaly);
        return anomaly;
      }
      
      return null;
    } catch (error) {
      this.logger.error('Failed to detect entity cross-metric anomaly', { entity_id: entityId, error });
      return null;
    }
  }
  
  private async buildDetectionModel(metricName: string, metrics: AIMetric[]): Promise<AnomalyDetectionModel> {
    try {
      const values = metrics.map(m => m.metric_value);
      
      // Statistical model
      const mean = this.calculateMean(values);
      const std = this.calculateStandardDeviation(values, mean);
      const percentiles = this.calculatePercentiles(values, [0.05, 0.25, 0.75, 0.95]);
      
      // Seasonal pattern detection
      const seasonality = this.detectSeasonality(metrics);
      
      // Trend detection
      const trend = this.detectTrend(values);
      
      // Model quality assessment
      const quality = this.assessModelQuality(values, mean, std);
      
      return {
        metric_name: metricName,
        statistical_params: {
          mean,
          std,
          percentiles
        },
        seasonality,
        trend,
        quality,
        last_updated: new Date(),
        sample_size: values.length
      };
    } catch (error) {
      this.logger.error('Failed to build detection model', { metric_name: metricName, error });
      throw error;
    }
  }
  
  private calculateAnomalyScore(metric: AIMetric, model: AnomalyDetectionModel): number {
    try {
      const value = metric.metric_value;
      const { mean, std, percentiles } = model.statistical_params;
      
      // Z-score based detection
      const zScore = Math.abs(value - mean) / std;
      let anomalyScore = Math.min(1.0, zScore / 3); // Normalize by 3-sigma
      
      // Percentile-based detection
      const percentileScore = this.calculatePercentileScore(value, percentiles);
      
      // Combine scores
      anomalyScore = Math.max(anomalyScore, percentileScore);
      
      // Adjust for trend and seasonality
      if (model.trend && model.trend.strength > 0.5) {
        const trendAdjustment = this.calculateTrendAdjustment(value, model.trend);
        anomalyScore *= trendAdjustment;
      }
      
      if (model.seasonality && model.seasonality.strength > 0.5) {
        const seasonalAdjustment = this.calculateSeasonalAdjustment(metric.timestamp, value, model.seasonality);
        anomalyScore *= seasonalAdjustment;
      }
      
      return Math.min(1.0, anomalyScore);
    } catch (error) {
      this.logger.error('Failed to calculate anomaly score', error);
      return 0;
    }
  }
  
  private async createAnomaly(
    metric: AIMetric,
    anomalyScore: number,
    model: AnomalyDetectionModel
  ): Promise<AIAnomaly> {
    const anomalyType = this.classifyAnomalyType(metric, anomalyScore, model);
    const severity = this.calculateAnomalySeverity(anomalyScore);
    
    return {
      anomaly_id: `${metric.metric_name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      entity_type: metric.agent_id ? 'agent' : metric.model_id ? 'model' : 'system',
      entity_id: metric.agent_id || metric.model_id || 'system',
      anomaly_type: anomalyType,
      severity,
      description: `Anomaly detected in ${metric.metric_name}: ${metric.metric_value}${metric.metric_unit} (score: ${anomalyScore.toFixed(3)})`,
      detected_at: metric.timestamp,
      metrics: {
        metric_name: metric.metric_name,
        metric_value: metric.metric_value,
        anomaly_score: anomalyScore,
        expected_range: {
          min: model.statistical_params.percentiles[0.05],
          max: model.statistical_params.percentiles[0.95]
        }
      },
      predicted_impact: this.predictAnomalyImpact(metric, anomalyScore),
      recommended_actions: this.generateRecommendedActions(metric, anomalyType, severity)
    };
  }
  
  private async runBatchAnomalyDetection(): Promise<void> {
    try {
      // Get recent metrics for batch processing
      const recentMetrics = await this.backend.getMetrics({
        timestamp: { '>=': new Date(Date.now() - 300000) } // Last 5 minutes
      });
      
      // Group by metric name
      const metricGroups = new Map<string, AIMetric[]>();
      for (const metric of recentMetrics) {
        if (!metricGroups.has(metric.metric_name)) {
          metricGroups.set(metric.metric_name, []);
        }
        metricGroups.get(metric.metric_name)!.push(metric);
      }
      
      // Detect anomalies
      const anomalies = await this.detectAnomalies(metricGroups);
      
      for (const anomaly of anomalies) {
        this.emit('anomaly-detected', anomaly);
      }
    } catch (error) {
      this.logger.error('Failed to run batch anomaly detection', error);
    }
  }
  
  private async updateAllDetectionModels(): Promise<void> {
    try {
      for (const metricName of this.detectionModels.keys()) {
        const recentMetrics = await this.backend.getMetrics({
          metric_name: metricName,
          timestamp: { '>=': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        });
        
        if (recentMetrics.length >= 20) {
          await this.updateDetectionModel(metricName, recentMetrics);
        }
      }
    } catch (error) {
      this.logger.error('Failed to update all detection models', error);
    }
  }
  
  // Helper methods for pattern detection
  
  private checkPerformanceDegradationPattern(metrics: Map<string, AIMetric>): AnomalyPattern | null {
    const responseTime = metrics.get('response_time');
    const errorRate = metrics.get('error_rate');
    const throughput = metrics.get('throughput');
    
    if (responseTime && errorRate && throughput) {
      if (responseTime.metric_value > 2000 && errorRate.metric_value > 0.05 && throughput.metric_value < 10) {
        return {
          type: 'performance_degradation',
          severity: 'high',
          description: 'Significant performance degradation detected across multiple metrics',
          metrics: {
            response_time: responseTime.metric_value,
            error_rate: errorRate.metric_value,
            throughput: throughput.metric_value
          },
          predicted_impact: 'Service quality degradation, potential user experience issues',
          recommended_actions: [
            'Check system resources',
            'Review recent deployments',
            'Scale infrastructure if needed',
            'Investigate error logs'
          ]
        };
      }
    }
    
    return null;
  }
  
  private checkResourceExhaustionPattern(metrics: Map<string, AIMetric>): AnomalyPattern | null {
    const cpuUsage = metrics.get('cpu_usage');
    const memoryUsage = metrics.get('memory_usage');
    const gpuUtilization = metrics.get('gpu_utilization');
    
    if (cpuUsage && memoryUsage && (cpuUsage.metric_value > 90 || memoryUsage.metric_value > 90)) {
      return {
        type: 'resource_spike',
        severity: 'critical',
        description: 'Resource exhaustion pattern detected',
        metrics: {
          cpu_usage: cpuUsage.metric_value,
          memory_usage: memoryUsage.metric_value,
          gpu_utilization: gpuUtilization?.metric_value || 0
        },
        predicted_impact: 'System instability, potential service outage',
        recommended_actions: [
          'Immediate resource scaling',
          'Identify resource-intensive processes',
          'Implement resource limits',
          'Consider load balancing'
        ]
      };
    }
    
    return null;
  }
  
  private checkAccuracyDropPattern(metrics: Map<string, AIMetric>): AnomalyPattern | null {
    const accuracy = metrics.get('accuracy');
    const driftScore = metrics.get('drift_score');
    
    if (accuracy && accuracy.metric_value < 0.7) {
      return {
        type: 'accuracy_drop',
        severity: driftScore && driftScore.metric_value > 0.5 ? 'critical' : 'high',
        description: 'Significant accuracy drop detected',
        metrics: {
          accuracy: accuracy.metric_value,
          drift_score: driftScore?.metric_value || 0
        },
        predicted_impact: 'Poor prediction quality, reduced model effectiveness',
        recommended_actions: [
          'Review training data quality',
          'Check for data drift',
          'Consider model retraining',
          'Validate input data pipeline'
        ]
      };
    }
    
    return null;
  }
  
  // Statistical calculation methods
  
  private calculateMean(values: number[]): number {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
  
  private calculateStandardDeviation(values: number[], mean: number): number {
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }
  
  private calculatePercentiles(values: number[], percentiles: number[]): Record<number, number> {
    const sorted = values.sort((a, b) => a - b);
    const result: Record<number, number> = {};
    
    for (const p of percentiles) {
      const index = Math.ceil(sorted.length * p) - 1;
      result[p] = sorted[Math.max(0, index)];
    }
    
    return result;
  }
  
  private calculatePercentileScore(value: number, percentiles: Record<number, number>): number {
    if (value < percentiles[0.05] || value > percentiles[0.95]) {
      return 0.8; // High anomaly score for extreme values
    }
    if (value < percentiles[0.25] || value > percentiles[0.75]) {
      return 0.4; // Medium anomaly score for outer quartiles
    }
    return 0; // Normal range
  }
  
  private detectSeasonality(metrics: AIMetric[]): SeasonalityInfo | null {
    // Simplified seasonality detection
    if (metrics.length < 100) return null;
    
    // Check for daily patterns (24 hour cycle)
    const hourlyAverages = new Array(24).fill(0).map(() => ({ sum: 0, count: 0 }));
    
    for (const metric of metrics) {
      const hour = metric.timestamp.getHours();
      hourlyAverages[hour].sum += metric.metric_value;
      hourlyAverages[hour].count++;
    }
    
    const hourlyMeans = hourlyAverages.map(h => h.count > 0 ? h.sum / h.count : 0);
    const overallMean = this.calculateMean(hourlyMeans.filter(m => m > 0));
    const variance = this.calculateStandardDeviation(hourlyMeans.filter(m => m > 0), overallMean);
    
    const strength = variance / overallMean; // Coefficient of variation as strength indicator
    
    if (strength > 0.2) {
      return {
        period: 24,
        strength,
        pattern: hourlyMeans
      };
    }
    
    return null;
  }
  
  private detectTrend(values: number[]): TrendInfo | null {
    if (values.length < 10) return null;
    
    // Simple linear regression
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;
    
    const xMean = this.calculateMean(x);
    const yMean = this.calculateMean(y);
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      numerator += (x[i] - xMean) * (y[i] - yMean);
      denominator += Math.pow(x[i] - xMean, 2);
    }
    
    const slope = denominator !== 0 ? numerator / denominator : 0;
    
    // Calculate correlation coefficient for trend strength
    const correlation = Math.abs(numerator) / Math.sqrt(denominator * values.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0));
    
    if (correlation > 0.3) {
      return {
        direction: slope > 0 ? 'increasing' : 'decreasing',
        strength: correlation,
        slope
      };
    }
    
    return null;
  }
  
  private calculateTrendAdjustment(value: number, trend: TrendInfo): number {
    // Adjust anomaly score based on trend
    // If value follows the trend, reduce anomaly score
    return 1.0; // Simplified implementation
  }
  
  private calculateSeasonalAdjustment(timestamp: Date, value: number, seasonality: SeasonalityInfo): number {
    // Adjust anomaly score based on seasonal patterns
    // If value matches seasonal pattern, reduce anomaly score
    return 1.0; // Simplified implementation
  }
  
  private assessModelQuality(values: number[], mean: number, std: number): number {
    // Assess the quality of the detection model
    const coefficientOfVariation = std / mean;
    const sampleSize = values.length;
    
    // Quality based on coefficient of variation and sample size
    let quality = 1.0;
    
    if (coefficientOfVariation > 1.0) quality *= 0.7; // High variability reduces quality
    if (sampleSize < 50) quality *= 0.8; // Small sample size reduces quality
    if (sampleSize < 20) quality *= 0.6;
    
    return Math.max(0.1, quality);
  }
  
  private classifyAnomalyType(metric: AIMetric, anomalyScore: number, model: AnomalyDetectionModel): AIAnomaly['anomaly_type'] {
    const value = metric.metric_value;
    const mean = model.statistical_params.mean;
    
    if (metric.metric_name.includes('latency') || metric.metric_name.includes('response_time')) {
      return value > mean ? 'latency_increase' : 'performance_degradation';
    }
    
    if (metric.metric_name.includes('error')) {
      return 'error_rate_increase';
    }
    
    if (metric.metric_name.includes('accuracy')) {
      return 'accuracy_drop';
    }
    
    if (metric.metric_name.includes('resource') || metric.metric_name.includes('memory') || metric.metric_name.includes('cpu')) {
      return 'resource_spike';
    }
    
    return 'performance_degradation';
  }
  
  private calculateAnomalySeverity(anomalyScore: number): AIAnomaly['severity'] {
    if (anomalyScore >= 0.8) return 'critical';
    if (anomalyScore >= 0.6) return 'high';
    if (anomalyScore >= 0.4) return 'medium';
    return 'low';
  }
  
  private predictAnomalyImpact(metric: AIMetric, anomalyScore: number): string {
    const impacts = {
      low: 'Minimal impact on system performance',
      medium: 'Moderate impact, monitoring recommended',
      high: 'Significant impact, intervention may be needed',
      critical: 'Severe impact, immediate action required'
    };
    
    const severity = this.calculateAnomalySeverity(anomalyScore);
    return impacts[severity];
  }
  
  private generateRecommendedActions(
    metric: AIMetric,
    anomalyType: AIAnomaly['anomaly_type'],
    severity: AIAnomaly['severity']
  ): string[] {
    const actions: string[] = [];
    
    switch (anomalyType) {
      case 'latency_increase':
        actions.push('Check network connectivity', 'Review system load', 'Optimize queries/operations');
        break;
      case 'error_rate_increase':
        actions.push('Review error logs', 'Check service dependencies', 'Validate input data');
        break;
      case 'accuracy_drop':
        actions.push('Review model performance', 'Check for data drift', 'Consider retraining');
        break;
      case 'resource_spike':
        actions.push('Monitor resource usage', 'Scale infrastructure', 'Identify resource leaks');
        break;
      default:
        actions.push('Investigate root cause', 'Monitor closely', 'Review recent changes');
    }
    
    if (severity === 'critical') {
      actions.unshift('Immediate escalation required');
    }
    
    return actions;
  }
  
  private calculateSeverityDistribution(anomalies: AIAnomaly[]): Record<string, number> {
    const distribution: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    
    for (const anomaly of anomalies) {
      distribution[anomaly.severity]++;
    }
    
    return distribution;
  }
  
  private calculateTypeDistribution(anomalies: AIAnomaly[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    for (const anomaly of anomalies) {
      distribution[anomaly.anomaly_type] = (distribution[anomaly.anomaly_type] || 0) + 1;
    }
    
    return distribution;
  }
  
  private calculateEntityDistribution(anomalies: AIAnomaly[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    for (const anomaly of anomalies) {
      distribution[anomaly.entity_type] = (distribution[anomaly.entity_type] || 0) + 1;
    }
    
    return distribution;
  }
  
  private calculateAnomalyTrend(anomalies: AIAnomaly[]): 'increasing' | 'decreasing' | 'stable' {
    if (anomalies.length < 10) return 'stable';
    
    const sortedAnomalies = anomalies.sort((a, b) => a.detected_at.getTime() - b.detected_at.getTime());
    const firstHalf = sortedAnomalies.slice(0, Math.floor(sortedAnomalies.length / 2));
    const secondHalf = sortedAnomalies.slice(Math.floor(sortedAnomalies.length / 2));
    
    const firstHalfCount = firstHalf.length;
    const secondHalfCount = secondHalf.length;
    
    const changePercent = ((secondHalfCount - firstHalfCount) / firstHalfCount) * 100;
    
    if (Math.abs(changePercent) < 20) return 'stable';
    return changePercent > 0 ? 'increasing' : 'decreasing';
  }
  
  private getTopAffectedEntities(anomalies: AIAnomaly[]): Array<{ entity_id: string; count: number }> {
    const entityCounts: Record<string, number> = {};
    
    for (const anomaly of anomalies) {
      entityCounts[anomaly.entity_id] = (entityCounts[anomaly.entity_id] || 0) + 1;
    }
    
    return Object.entries(entityCounts)
      .map(([entity_id, count]) => ({ entity_id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }
  
  private determineEntityType(entityId: string): 'agent' | 'model' | 'system' {
    // Simple heuristic based on entity ID patterns
    if (entityId.includes('agent')) return 'agent';
    if (entityId.includes('model')) return 'model';
    return 'system';
  }
  
  async destroy(): Promise<void> {
    try {
      // Stop detection timers
      if (this.anomalyDetectionTimer) clearInterval(this.anomalyDetectionTimer);
      if (this.modelUpdateTimer) clearInterval(this.modelUpdateTimer);
      
      // Clear state
      this.detectionModels.clear();
      this.anomalyHistory.clear();
      this.baselineModels.clear();
      
      this.logger.info('AI Anomaly Detector destroyed');
    } catch (error) {
      this.logger.error('Failed to destroy AI Anomaly Detector', error);
      throw error;
    }
  }
}

// Supporting interfaces
interface AnomalyDetectionModel {
  metric_name: string;
  statistical_params: {
    mean: number;
    std: number;
    percentiles: Record<number, number>;
  };
  seasonality: SeasonalityInfo | null;
  trend: TrendInfo | null;
  quality: number;
  last_updated: Date;
  sample_size: number;
}

interface SeasonalityInfo {
  period: number;
  strength: number;
  pattern: number[];
}

interface TrendInfo {
  direction: 'increasing' | 'decreasing';
  strength: number;
  slope: number;
}

interface BaselineModel {
  entity_id: string;
  baseline_metrics: Record<string, number>;
  last_updated: Date;
}

interface AnomalyHistoryPoint {
  timestamp: Date;
  anomaly_type: string;
  severity: string;
}

interface AnomalyPattern {
  type: AIAnomaly['anomaly_type'];
  severity: AIAnomaly['severity'];
  description: string;
  metrics: Record<string, number>;
  predicted_impact: string;
  recommended_actions: string[];
}

interface AnomalyInsights {
  total_anomalies: number;
  severity_distribution: Record<string, number>;
  type_distribution: Record<string, number>;
  entity_distribution: Record<string, number>;
  trend: 'increasing' | 'decreasing' | 'stable';
  top_affected_entities: Array<{ entity_id: string; count: number }>;
}
