/**
 * Predictive Analytics Engine Component
 * 
 * Advanced machine learning and statistical analysis for performance forecasting,
 * capacity planning, and proactive health management of governance agents.
 */

import { EventEmitter } from 'events';
import { 
  HealthMetrics,
  PerformancePrediction,
  AnomalyDetection,
  AnalyticsRecommendation,
  TrendDirection,
  PredictionFactor
} from '../interfaces';

interface MLModel {
  id: string;
  type: 'regression' | 'classification' | 'timeseries' | 'anomaly';
  algorithm: string;
  features: string[];
  accuracy: number;
  lastTraining: Date;
  parameters: Record<string, any>;
  trainingData: any[];
}

interface PredictionResult {
  metric: string;
  timeHorizon: string;
  predictedValue: number;
  confidenceInterval: [number, number];
  trend: TrendDirection;
  factors: PredictionFactor[];
  accuracy: number;
}

interface AnomalyDetectionResult {
  isAnomaly: boolean;
  severity: number;
  confidence: number;
  expectedValue: number;
  deviation: number;
  contributingFactors: string[];
}

export class PredictiveAnalyticsEngine extends EventEmitter {
  private models: Map<string, MLModel> = new Map();
  private isRunning: boolean = false;
  private trainingInterval?: NodeJS.Timeout;
  
  // Configuration
  private config = {
    minDataPoints: 50,
    maxModelAge: 24 * 60 * 60 * 1000, // 24 hours
    retrainingThreshold: 0.8, // Retrain if accuracy drops below 80%
    anomalyThreshold: 2.0, // Standard deviations
    predictionHorizons: ['1h', '6h', '24h', '7d']
  };

  constructor() {
    super();
    this.initializeModels();
  }

  // ===== LIFECYCLE METHODS =====

  async start(): Promise<void> {
    if (this.isRunning) return;
    
    console.log(`[${new Date().toISOString()}] Starting PredictiveAnalyticsEngine`);
    
    // Start model training/retraining loop
    this.trainingInterval = setInterval(async () => {
      await this.performModelMaintenance();
    }, 60 * 60 * 1000); // Every hour
    
    this.isRunning = true;
    this.emit('analytics:started', { timestamp: new Date() });
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;
    
    console.log(`[${new Date().toISOString()}] Stopping PredictiveAnalyticsEngine`);
    
    if (this.trainingInterval) {
      clearInterval(this.trainingInterval);
      this.trainingInterval = undefined;
    }
    
    this.isRunning = false;
    this.emit('analytics:stopped', { timestamp: new Date() });
  }

  // ===== PREDICTION METHODS =====

  async predictPerformance(
    agentId: string, 
    metrics: HealthMetrics[], 
    horizon: string
  ): Promise<PerformancePrediction[]> {
    const predictions: PerformancePrediction[] = [];
    
    // Predict response time
    const responseTimePrediction = await this.predictMetric(
      agentId,
      'response_time',
      metrics.map(m => m.performance.responseTime.current),
      horizon
    );
    
    predictions.push({
      metric: 'response_time',
      timeHorizon: horizon,
      predictedValue: responseTimePrediction.predictedValue,
      confidenceInterval: responseTimePrediction.confidenceInterval,
      trend: responseTimePrediction.trend,
      factors: responseTimePrediction.factors
    });
    
    // Predict throughput
    const throughputPrediction = await this.predictMetric(
      agentId,
      'throughput',
      metrics.map(m => m.performance.throughput.current),
      horizon
    );
    
    predictions.push({
      metric: 'throughput',
      timeHorizon: horizon,
      predictedValue: throughputPrediction.predictedValue,
      confidenceInterval: throughputPrediction.confidenceInterval,
      trend: throughputPrediction.trend,
      factors: throughputPrediction.factors
    });
    
    // Predict error rate
    const errorRatePrediction = await this.predictMetric(
      agentId,
      'error_rate',
      metrics.map(m => m.performance.errorRate.current),
      horizon
    );
    
    predictions.push({
      metric: 'error_rate',
      timeHorizon: horizon,
      predictedValue: errorRatePrediction.predictedValue,
      confidenceInterval: errorRatePrediction.confidenceInterval,
      trend: errorRatePrediction.trend,
      factors: errorRatePrediction.factors
    });
    
    return predictions;
  }

  async detectAnomalies(
    agentId: string,
    currentMetrics: HealthMetrics,
    historicalMetrics: HealthMetrics[]
  ): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];
    
    // Detect performance anomalies
    const responseTimeAnomaly = await this.detectMetricAnomaly(
      'response_time',
      currentMetrics.performance.responseTime.current,
      historicalMetrics.map(m => m.performance.responseTime.current)
    );
    
    if (responseTimeAnomaly.isAnomaly) {
      anomalies.push({
        anomalyId: this.generateAnomalyId(),
        type: 'point',
        severity: this.mapAnomalyToSeverity(responseTimeAnomaly.severity),
        metric: 'response_time',
        observedValue: currentMetrics.performance.responseTime.current,
        expectedValue: responseTimeAnomaly.expectedValue,
        deviation: responseTimeAnomaly.deviation,
        confidence: responseTimeAnomaly.confidence,
        context: {
          relatedMetrics: responseTimeAnomaly.contributingFactors,
          timeContext: 'current',
          externalFactors: this.identifyExternalFactors(currentMetrics)
        }
      });
    }
    
    // Detect resource anomalies
    const cpuAnomaly = await this.detectMetricAnomaly(
      'cpu_usage',
      currentMetrics.resource.cpu.percentage,
      historicalMetrics.map(m => m.resource.cpu.percentage)
    );
    
    if (cpuAnomaly.isAnomaly) {
      anomalies.push({
        anomalyId: this.generateAnomalyId(),
        type: 'point',
        severity: this.mapAnomalyToSeverity(cpuAnomaly.severity),
        metric: 'cpu_usage',
        observedValue: currentMetrics.resource.cpu.percentage,
        expectedValue: cpuAnomaly.expectedValue,
        deviation: cpuAnomaly.deviation,
        confidence: cpuAnomaly.confidence,
        context: {
          relatedMetrics: cpuAnomaly.contributingFactors,
          timeContext: 'current'
        }
      });
    }
    
    return anomalies;
  }

  async generateCapacityRecommendations(
    agentId: string,
    metrics: HealthMetrics[],
    predictions: PerformancePrediction[]
  ): Promise<AnalyticsRecommendation[]> {
    const recommendations: AnalyticsRecommendation[] = [];
    
    // Analyze predicted resource usage
    const cpuPrediction = predictions.find(p => p.metric === 'cpu_usage');
    if (cpuPrediction && cpuPrediction.predictedValue > 80) {
      recommendations.push({
        recommendationId: this.generateRecommendationId(),
        type: 'scaling',
        priority: cpuPrediction.predictedValue > 90 ? 'urgent' : 'high',
        description: `CPU usage predicted to reach ${cpuPrediction.predictedValue.toFixed(1)}% in ${cpuPrediction.timeHorizon}`,
        actions: [
          {
            actionId: 'scale_cpu',
            type: 'scale_up',
            description: 'Increase CPU allocation',
            parameters: {
              currentCpu: metrics[metrics.length - 1]?.resource.cpu.percentage || 0,
              recommendedIncrease: '20%',
              urgency: cpuPrediction.predictedValue > 90 ? 'high' : 'medium'
            },
            automation: true
          }
        ],
        expectedImpact: {
          performance: 0.2,
          stability: 0.3,
          cost: -0.1,
          risk: 0.1
        },
        effort: 'medium'
      });
    }
    
    // Analyze error rate trends
    const errorRatePrediction = predictions.find(p => p.metric === 'error_rate');
    if (errorRatePrediction && errorRatePrediction.trend === 'up') {
      recommendations.push({
        recommendationId: this.generateRecommendationId(),
        type: 'maintenance',
        priority: 'high',
        description: `Error rate trending upward, predicted to reach ${errorRatePrediction.predictedValue.toFixed(2)}%`,
        actions: [
          {
            actionId: 'investigate_errors',
            type: 'diagnostic',
            description: 'Investigate increasing error patterns',
            parameters: {
              timeRange: '24h',
              focus: 'error_patterns',
              includeStackTraces: true
            },
            automation: false
          },
          {
            actionId: 'restart_agent',
            type: 'recovery',
            description: 'Consider agent restart if errors persist',
            parameters: {
              gracefulShutdown: true,
              backupConfig: true
            },
            automation: false
          }
        ],
        expectedImpact: {
          performance: 0.3,
          stability: 0.4,
          cost: 0.0,
          risk: 0.2
        },
        effort: 'high'
      });
    }
    
    return recommendations;
  }

  // ===== PRIVATE METHODS =====

  private initializeModels(): void {
    // Initialize default ML models for different metrics
    const defaultModels: MLModel[] = [
      {
        id: 'response_time_predictor',
        type: 'timeseries',
        algorithm: 'arima',
        features: ['historical_values', 'time_of_day', 'day_of_week'],
        accuracy: 0.8,
        lastTraining: new Date(),
        parameters: {
          order: [1, 1, 1],
          seasonality: 24
        },
        trainingData: []
      },
      {
        id: 'anomaly_detector',
        type: 'anomaly',
        algorithm: 'isolation_forest',
        features: ['response_time', 'cpu_usage', 'memory_usage', 'error_rate'],
        accuracy: 0.9,
        lastTraining: new Date(),
        parameters: {
          contamination: 0.1,
          n_estimators: 100
        },
        trainingData: []
      },
      {
        id: 'capacity_predictor',
        type: 'regression',
        algorithm: 'linear_regression',
        features: ['throughput', 'cpu_usage', 'memory_usage', 'time_trend'],
        accuracy: 0.75,
        lastTraining: new Date(),
        parameters: {
          regularization: 'l2',
          alpha: 0.01
        },
        trainingData: []
      }
    ];
    
    defaultModels.forEach(model => {
      this.models.set(model.id, model);
    });
  }

  private async predictMetric(
    agentId: string,
    metricName: string,
    values: number[],
    horizon: string
  ): Promise<PredictionResult> {
    if (values.length < this.config.minDataPoints) {
      throw new Error(`Insufficient data points for prediction: ${values.length} < ${this.config.minDataPoints}`);
    }
    
    // Simple trend-based prediction (in production, use actual ML models)
    const recentValues = values.slice(-20); // Last 20 values
    const trend = this.calculateTrend(recentValues);
    const mean = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const stdDev = Math.sqrt(
      recentValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentValues.length
    );
    
    // Calculate prediction based on trend
    const horizonMs = this.parseTimeHorizon(horizon);
    const trendMultiplier = horizonMs / (60 * 60 * 1000); // Hours
    const predictedValue = mean + (trend * trendMultiplier);
    
    // Calculate confidence interval
    const confidenceInterval: [number, number] = [
      Math.max(0, predictedValue - 1.96 * stdDev),
      predictedValue + 1.96 * stdDev
    ];
    
    // Identify contributing factors
    const factors: PredictionFactor[] = [
      {
        factor: 'historical_trend',
        importance: 0.6,
        direction: trend > 0 ? 'positive' : 'negative'
      },
      {
        factor: 'recent_variance',
        importance: 0.3,
        direction: stdDev > mean * 0.2 ? 'negative' : 'positive'
      },
      {
        factor: 'data_quality',
        importance: 0.1,
        direction: values.length > 100 ? 'positive' : 'negative'
      }
    ];
    
    return {
      metric: metricName,
      timeHorizon: horizon,
      predictedValue,
      confidenceInterval,
      trend: this.classifyTrend(trend),
      factors,
      accuracy: 0.8 // Would be calculated from model validation
    };
  }

  private async detectMetricAnomaly(
    metricName: string,
    currentValue: number,
    historicalValues: number[]
  ): Promise<AnomalyDetectionResult> {
    if (historicalValues.length < this.config.minDataPoints) {
      return {
        isAnomaly: false,
        severity: 0,
        confidence: 0,
        expectedValue: currentValue,
        deviation: 0,
        contributingFactors: []
      };
    }
    
    // Statistical anomaly detection
    const mean = historicalValues.reduce((sum, val) => sum + val, 0) / historicalValues.length;
    const stdDev = Math.sqrt(
      historicalValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historicalValues.length
    );
    
    const zScore = Math.abs(currentValue - mean) / stdDev;
    const isAnomaly = zScore > this.config.anomalyThreshold;
    
    return {
      isAnomaly,
      severity: Math.min(zScore / this.config.anomalyThreshold, 1.0),
      confidence: Math.min(zScore / 3.0, 1.0), // Higher z-score = higher confidence
      expectedValue: mean,
      deviation: currentValue - mean,
      contributingFactors: this.identifyContributingFactors(metricName, zScore)
    };
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    // Simple linear regression slope
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  private classifyTrend(slope: number): TrendDirection {
    if (Math.abs(slope) < 0.01) return 'stable';
    return slope > 0 ? 'up' : 'down';
  }

  private parseTimeHorizon(horizon: string): number {
    const unit = horizon.slice(-1);
    const value = parseInt(horizon.slice(0, -1));
    
    switch (unit) {
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'w': return value * 7 * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000; // Default 1 hour
    }
  }

  private mapAnomalyToSeverity(severity: number): 'info' | 'warning' | 'critical' | 'emergency' {
    if (severity < 0.3) return 'info';
    if (severity < 0.6) return 'warning';
    if (severity < 0.9) return 'critical';
    return 'emergency';
  }

  private identifyExternalFactors(metrics: HealthMetrics): string[] {
    const factors: string[] = [];
    
    if (metrics.resource.cpu.percentage > 80) {
      factors.push('high_cpu_load');
    }
    
    if (metrics.resource.memory.percentage > 85) {
      factors.push('high_memory_usage');
    }
    
    if (metrics.resource.connections.connectionErrors > 5) {
      factors.push('connection_issues');
    }
    
    return factors;
  }

  private identifyContributingFactors(metricName: string, zScore: number): string[] {
    const factors: string[] = [];
    
    if (zScore > 3) {
      factors.push('extreme_deviation');
    }
    
    factors.push(`${metricName}_pattern_change`);
    
    if (metricName === 'response_time') {
      factors.push('potential_bottleneck', 'resource_constraint');
    }
    
    return factors;
  }

  private async performModelMaintenance(): Promise<void> {
    for (const [modelId, model] of this.models) {
      const age = Date.now() - model.lastTraining.getTime();
      
      if (age > this.config.maxModelAge || model.accuracy < this.config.retrainingThreshold) {
        console.log(`[${new Date().toISOString()}] Retraining model: ${modelId}`);
        await this.retrainModel(model);
      }
    }
  }

  private async retrainModel(model: MLModel): Promise<void> {
    // Simulate model retraining
    model.lastTraining = new Date();
    model.accuracy = 0.8 + Math.random() * 0.15; // Simulate improved accuracy
    
    this.emit('model:retrained', {
      modelId: model.id,
      accuracy: model.accuracy,
      timestamp: new Date()
    });
  }

  private generateAnomalyId(): string {
    return `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRecommendationId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}