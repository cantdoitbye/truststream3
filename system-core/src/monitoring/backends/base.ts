/**
 * Base monitoring backend providing common functionality
 * All concrete backends should extend this class
 */

import {
  MonitoringBackend,
  LogEntry,
  PerformanceMetric,
  AnalyticsQuery,
  AnalyticsResult,
  AnomalyDetectionConfig,
  Anomaly,
  Alert,
  PredictionRequest,
  Prediction,
  SystemHealth,
  MonitoringConfig,
  EventType,
  LogLevel,
  MetricType
} from '../types';

export abstract class BaseMonitoringBackend implements MonitoringBackend {
  protected config: MonitoringConfig;
  protected initialized: boolean = false;
  
  // In-memory buffers for batching
  protected logBuffer: LogEntry[] = [];
  protected metricBuffer: PerformanceMetric[] = [];
  protected flushTimer?: NodeJS.Timeout;
  
  constructor(config: MonitoringConfig) {
    this.config = {
      batchSize: 100,
      flushInterval: 5000, // 5 seconds
      maxCacheSize: 1000,
      features: {
        enableAnomalyDetection: true,
        enablePredictions: true,
        enableSystemHealth: true,
        retentionDays: 30,
        ...config.features
      },
      ...config
    };
  }

  /**
   * Initialize the backend - must be implemented by concrete classes
   */
  abstract initialize(): Promise<void>;

  /**
   * Destroy the backend and cleanup resources
   */
  async destroy(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Flush any remaining data
    await this.flush();
    
    this.initialized = false;
  }

  /**
   * Log an entry with optional batching
   */
  async log(entry: LogEntry): Promise<void> {
    this.ensureInitialized();
    
    // Add timestamp if not provided
    if (!entry.timestamp) {
      entry.timestamp = new Date();
    }
    
    // Add to buffer
    this.logBuffer.push(entry);
    
    // Check if we should flush
    if (this.logBuffer.length >= (this.config.batchSize || 100)) {
      await this.flushLogs();
    }
    
    // Set up auto-flush if not already set
    this.ensureFlushTimer();
  }

  /**
   * Track a performance metric with optional batching
   */
  async track(metric: PerformanceMetric): Promise<void> {
    this.ensureInitialized();
    
    // Add timestamp if not provided
    if (!metric.timestamp) {
      metric.timestamp = new Date();
    }
    
    // Add to buffer
    this.metricBuffer.push(metric);
    
    // Check if we should flush
    if (this.metricBuffer.length >= (this.config.batchSize || 100)) {
      await this.flushMetrics();
    }
    
    // Set up auto-flush if not already set
    this.ensureFlushTimer();
  }

  /**
   * Track multiple metrics in batch
   */
  async trackBatch(metrics: PerformanceMetric[]): Promise<void> {
    for (const metric of metrics) {
      await this.track(metric);
    }
  }

  /**
   * Generate a comprehensive system health report
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    
    // Get recent error rates
    const recentErrors = await this.query({
      startTime: oneMinuteAgo,
      endTime: now,
      logLevels: [LogLevel.ERROR, LogLevel.CRITICAL],
      aggregations: [{
        field: 'level',
        function: 'count'
      }]
    });
    
    // Get recent performance metrics
    const recentMetrics = await this.query({
      startTime: oneMinuteAgo,
      endTime: now,
      aggregations: [{
        field: 'value',
        function: 'avg'
      }]
    });
    
    // Calculate overall health
    const errorRate = recentErrors.aggregations?.level || 0;
    const avgLatency = recentMetrics.aggregations?.value || 0;
    
    let overall: SystemHealth['overall'] = 'healthy';
    if (errorRate > 10 || avgLatency > 5000) {
      overall = 'degraded';
    }
    if (errorRate > 50 || avgLatency > 10000) {
      overall = 'unhealthy';
    }
    
    return {
      timestamp: now,
      overall,
      components: [
        {
          name: 'monitoring_backend',
          status: 'healthy',
          lastCheck: now,
          details: {
            logBufferSize: this.logBuffer.length,
            metricBufferSize: this.metricBuffer.length
          }
        }
      ],
      metrics: {
        cpuUsage: process.cpuUsage ? this.getCpuUsage() : 0,
        memoryUsage: this.getMemoryUsage(),
        diskUsage: 0 // Would need OS-specific implementation
      }
    };
  }

  /**
   * Basic anomaly detection using statistical methods
   */
  async detectAnomalies(config: AnomalyDetectionConfig): Promise<Anomaly[]> {
    if (!this.config.features?.enableAnomalyDetection) {
      return [];
    }
    
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - config.lookbackPeriod * 60000);
    
    // Get historical data for the metric
    const historicalData = await this.getMetrics({
      startTime,
      endTime,
      aggregations: [{
        field: 'value',
        function: 'avg'
      }]
    });
    
    if (historicalData.length < config.minDataPoints) {
      return [];
    }
    
    // Simple statistical anomaly detection
    const values = historicalData.map(m => m.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Determine threshold multiplier based on sensitivity
    const thresholdMultiplier = {
      low: 3,
      medium: 2,
      high: 1.5
    }[config.sensitivity];
    
    const upperThreshold = mean + (stdDev * thresholdMultiplier);
    const lowerThreshold = mean - (stdDev * thresholdMultiplier);
    
    // Find anomalies
    const anomalies: Anomaly[] = [];
    const recentData = historicalData.slice(-10); // Check last 10 data points
    
    for (const dataPoint of recentData) {
      if (dataPoint.value > upperThreshold || dataPoint.value < lowerThreshold) {
        const severity = this.calculateAnomalySeverity(dataPoint.value, mean, stdDev);
        const confidence = Math.min(Math.abs(dataPoint.value - mean) / stdDev / thresholdMultiplier, 1);
        
        anomalies.push({
          id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: dataPoint.timestamp,
          metric: config.metric,
          value: dataPoint.value,
          expectedValue: mean,
          severity,
          confidence,
          description: `${config.metric} value ${dataPoint.value} is ${dataPoint.value > upperThreshold ? 'above' : 'below'} expected range`,
          context: {
            mean,
            stdDev,
            threshold: dataPoint.value > upperThreshold ? upperThreshold : lowerThreshold
          }
        });
      }
    }
    
    return anomalies;
  }

  /**
   * Basic prediction using linear trend analysis
   */
  async generatePrediction(request: PredictionRequest): Promise<Prediction> {
    if (!this.config.features?.enablePredictions) {
      throw new Error('Predictions are disabled');
    }
    
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - request.forecastPeriod * 60000 * 2); // Use 2x the forecast period for training
    
    // Get historical data
    const historicalData = await this.getMetrics({
      startTime,
      endTime
    });
    
    if (historicalData.length < 2) {
      throw new Error('Insufficient data for prediction');
    }
    
    // Simple linear regression
    const dataPoints = historicalData.map((d, i) => ({
      x: i,
      y: d.value,
      timestamp: d.timestamp
    }));
    
    const { slope, intercept } = this.calculateLinearRegression(dataPoints);
    
    // Generate predictions
    const predictions = [];
    const predictionCount = Math.ceil(request.forecastPeriod / 5); // One prediction every 5 minutes
    
    for (let i = 1; i <= predictionCount; i++) {
      const futureX = dataPoints.length + i;
      const predictedValue = slope * futureX + intercept;
      const futureTimestamp = new Date(endTime.getTime() + i * 5 * 60000);
      
      predictions.push({
        timestamp: futureTimestamp,
        value: Math.max(0, predictedValue), // Ensure non-negative values
        confidenceInterval: {
          lower: predictedValue * 0.8,
          upper: predictedValue * 1.2
        }
      });
    }
    
    return {
      metric: request.metric,
      timestamp: new Date(),
      forecastPeriod: request.forecastPeriod,
      predictions,
      confidence: request.confidence || 0.8,
      model: 'linear',
      metadata: {
        slope,
        intercept,
        dataPoints: dataPoints.length
      }
    };
  }

  // Abstract methods that must be implemented by concrete backends
  abstract query(query: AnalyticsQuery): Promise<AnalyticsResult>;
  abstract getLogs(query: Partial<AnalyticsQuery>): Promise<LogEntry[]>;
  abstract getMetrics(query: Partial<AnalyticsQuery>): Promise<PerformanceMetric[]>;
  abstract getAnomalies(startTime?: Date, endTime?: Date): Promise<Anomaly[]>;
  abstract createAlert(alert: Omit<Alert, 'id' | 'timestamp'>): Promise<Alert>;
  abstract getAlerts(status?: Alert['status']): Promise<Alert[]>;
  abstract acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void>;
  abstract resolveAlert(alertId: string): Promise<void>;
  abstract getPredictions(metric?: string): Promise<Prediction[]>;
  abstract updateSystemHealth(health: SystemHealth): Promise<void>;
  abstract cleanup(olderThan: Date): Promise<number>;

  // Protected helper methods
  protected async flush(): Promise<void> {
    await Promise.all([
      this.flushLogs(),
      this.flushMetrics()
    ]);
  }

  protected async flushLogs(): Promise<void> {
    if (this.logBuffer.length > 0) {
      const logsToFlush = [...this.logBuffer];
      this.logBuffer = [];
      await this.persistLogs(logsToFlush);
    }
  }

  protected async flushMetrics(): Promise<void> {
    if (this.metricBuffer.length > 0) {
      const metricsToFlush = [...this.metricBuffer];
      this.metricBuffer = [];
      await this.persistMetrics(metricsToFlush);
    }
  }

  protected abstract persistLogs(logs: LogEntry[]): Promise<void>;
  protected abstract persistMetrics(metrics: PerformanceMetric[]): Promise<void>;

  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Backend not initialized. Call initialize() first.');
    }
  }

  protected ensureFlushTimer(): void {
    if (!this.flushTimer) {
      this.flushTimer = setInterval(async () => {
        try {
          await this.flush();
        } catch (error) {
          console.error('Error during auto-flush:', error);
        }
      }, this.config.flushInterval || 5000);
    }
  }

  protected calculateAnomalySeverity(value: number, mean: number, stdDev: number): Anomaly['severity'] {
    const deviations = Math.abs(value - mean) / stdDev;
    
    if (deviations > 4) return 'critical';
    if (deviations > 3) return 'high';
    if (deviations > 2) return 'medium';
    return 'low';
  }

  protected calculateLinearRegression(dataPoints: Array<{x: number, y: number}>): {slope: number, intercept: number} {
    const n = dataPoints.length;
    const sumX = dataPoints.reduce((sum, point) => sum + point.x, 0);
    const sumY = dataPoints.reduce((sum, point) => sum + point.y, 0);
    const sumXY = dataPoints.reduce((sum, point) => sum + point.x * point.y, 0);
    const sumXX = dataPoints.reduce((sum, point) => sum + point.x * point.x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
  }

  protected getCpuUsage(): number {
    // Simple CPU usage calculation - would need more sophisticated implementation
    const usage = process.cpuUsage();
    return ((usage.user + usage.system) / 1000) % 100;
  }

  protected getMemoryUsage(): number {
    const memUsage = process.memoryUsage();
    return (memUsage.heapUsed / memUsage.heapTotal) * 100;
  }
}
