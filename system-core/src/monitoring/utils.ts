/**
 * Utility functions for monitoring and analytics
 */

import {
  LogEntry,
  PerformanceMetric,
  EventType,
  LogLevel,
  MetricType,
  SystemHealth
} from './types';

export class MonitoringUtils {
  /**
   * Create a standardized log entry
   */
  static createLogEntry(
    level: LogLevel,
    eventType: EventType,
    message: string,
    context?: Partial<Omit<LogEntry, 'timestamp' | 'level' | 'eventType' | 'message'>>
  ): LogEntry {
    return {
      timestamp: new Date(),
      level,
      eventType,
      message,
      ...context
    };
  }

  /**
   * Create a performance metric
   */
  static createMetric(
    name: string,
    value: number,
    metricType: MetricType,
    context?: Partial<Omit<PerformanceMetric, 'timestamp' | 'name' | 'value' | 'metricType'>>
  ): PerformanceMetric {
    return {
      timestamp: new Date(),
      name,
      value,
      metricType,
      ...context
    };
  }

  /**
   * Calculate percentiles from an array of numbers
   */
  static calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * (percentile / 100)) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Calculate moving average
   */
  static calculateMovingAverage(values: number[], windowSize: number): number[] {
    if (values.length < windowSize) return values;
    
    const result: number[] = [];
    for (let i = windowSize - 1; i < values.length; i++) {
      const window = values.slice(i - windowSize + 1, i + 1);
      const average = window.reduce((sum, val) => sum + val, 0) / windowSize;
      result.push(average);
    }
    
    return result;
  }

  /**
   * Format duration in human-readable format
   */
  static formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${Math.round(milliseconds)}ms`;
    } else if (milliseconds < 60000) {
      return `${Math.round(milliseconds / 1000)}s`;
    } else if (milliseconds < 3600000) {
      return `${Math.round(milliseconds / 60000)}m`;
    } else {
      return `${Math.round(milliseconds / 3600000)}h`;
    }
  }

  /**
   * Format file size in human-readable format
   */
  static formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Generate a unique request ID
   */
  static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a unique session ID
   */
  static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate log entry
   */
  static validateLogEntry(entry: LogEntry): string[] {
    const errors: string[] = [];
    
    if (!entry.timestamp) {
      errors.push('timestamp is required');
    }
    
    if (!entry.level) {
      errors.push('level is required');
    }
    
    if (!entry.eventType) {
      errors.push('eventType is required');
    }
    
    if (!entry.message || entry.message.trim().length === 0) {
      errors.push('message is required and cannot be empty');
    }
    
    return errors;
  }

  /**
   * Validate performance metric
   */
  static validateMetric(metric: PerformanceMetric): string[] {
    const errors: string[] = [];
    
    if (!metric.timestamp) {
      errors.push('timestamp is required');
    }
    
    if (!metric.name || metric.name.trim().length === 0) {
      errors.push('name is required and cannot be empty');
    }
    
    if (typeof metric.value !== 'number' || isNaN(metric.value)) {
      errors.push('value must be a valid number');
    }
    
    if (!metric.metricType) {
      errors.push('metricType is required');
    }
    
    return errors;
  }

  /**
   * Calculate system health score
   */
  static calculateHealthScore(health: SystemHealth): number {
    let score = 100;
    
    // Deduct points for unhealthy components
    const unhealthyComponents = health.components.filter(c => c.status !== 'healthy').length;
    score -= unhealthyComponents * 20;
    
    // Deduct points for high resource usage
    if (health.metrics.cpuUsage > 80) score -= 15;
    if (health.metrics.memoryUsage > 80) score -= 15;
    if (health.metrics.diskUsage && health.metrics.diskUsage > 90) score -= 10;
    
    // Deduct points for high network latency
    if (health.metrics.networkLatency && health.metrics.networkLatency > 1000) score -= 10;
    
    return Math.max(0, score);
  }

  /**
   * Group metrics by time intervals
   */
  static groupMetricsByInterval(
    metrics: PerformanceMetric[],
    intervalMinutes: number
  ): Array<{
    timestamp: Date;
    metrics: PerformanceMetric[];
    aggregated: Record<string, number>;
  }> {
    if (metrics.length === 0) return [];
    
    const intervalMs = intervalMinutes * 60 * 1000;
    const groups = new Map<number, PerformanceMetric[]>();
    
    // Group metrics by interval
    for (const metric of metrics) {
      const intervalStart = Math.floor(metric.timestamp.getTime() / intervalMs) * intervalMs;
      
      if (!groups.has(intervalStart)) {
        groups.set(intervalStart, []);
      }
      
      groups.get(intervalStart)!.push(metric);
    }
    
    // Convert to result format with aggregations
    return Array.from(groups.entries())
      .sort(([a], [b]) => a - b)
      .map(([timestamp, intervalMetrics]) => {
        const aggregated: Record<string, number> = {};
        
        // Group by metric name and calculate averages
        const metricGroups = new Map<string, number[]>();
        for (const metric of intervalMetrics) {
          if (!metricGroups.has(metric.name)) {
            metricGroups.set(metric.name, []);
          }
          metricGroups.get(metric.name)!.push(metric.value);
        }
        
        for (const [name, values] of metricGroups) {
          aggregated[name] = values.reduce((sum, val) => sum + val, 0) / values.length;
        }
        
        return {
          timestamp: new Date(timestamp),
          metrics: intervalMetrics,
          aggregated
        };
      });
  }

  /**
   * Create a time series from metrics
   */
  static createTimeSeries(
    metrics: PerformanceMetric[],
    metricName: string
  ): Array<{ timestamp: Date; value: number }> {
    return metrics
      .filter(m => m.name === metricName)
      .map(m => ({
        timestamp: m.timestamp,
        value: m.value
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Detect trends in time series data
   */
  static detectTrend(timeSeries: Array<{ timestamp: Date; value: number }>): {
    trend: 'increasing' | 'decreasing' | 'stable';
    slope: number;
    confidence: number;
  } {
    if (timeSeries.length < 2) {
      return { trend: 'stable', slope: 0, confidence: 0 };
    }
    
    // Calculate linear regression
    const n = timeSeries.length;
    const xValues = timeSeries.map((_, i) => i);
    const yValues = timeSeries.map(point => point.value);
    
    const sumX = xValues.reduce((sum, x) => sum + x, 0);
    const sumY = yValues.reduce((sum, y) => sum + y, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // Calculate correlation coefficient for confidence
    const meanX = sumX / n;
    const meanY = sumY / n;
    
    let numerator = 0;
    let denominatorX = 0;
    let denominatorY = 0;
    
    for (let i = 0; i < n; i++) {
      const xDiff = xValues[i] - meanX;
      const yDiff = yValues[i] - meanY;
      numerator += xDiff * yDiff;
      denominatorX += xDiff * xDiff;
      denominatorY += yDiff * yDiff;
    }
    
    const correlation = numerator / Math.sqrt(denominatorX * denominatorY);
    const confidence = Math.abs(correlation);
    
    // Determine trend
    let trend: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(slope) < 0.001 || confidence < 0.3) {
      trend = 'stable';
    } else if (slope > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }
    
    return { trend, slope, confidence };
  }

  /**
   * Create performance report
   */
  static createPerformanceReport(data: {
    logs: LogEntry[];
    metrics: PerformanceMetric[];
    timeRange: { start: Date; end: Date };
  }): {
    summary: {
      totalEvents: number;
      errorRate: number;
      averageResponseTime: number;
      peakMetrics: Record<string, number>;
    };
    trends: Record<string, { trend: string; confidence: number }>;
    recommendations: string[];
  } {
    const { logs, metrics, timeRange } = data;
    
    // Calculate summary statistics
    const totalEvents = logs.length;
    const errorEvents = logs.filter(log => log.level === LogLevel.ERROR || log.level === LogLevel.CRITICAL).length;
    const errorRate = totalEvents > 0 ? (errorEvents / totalEvents) * 100 : 0;
    
    const responseTimes = logs
      .filter(log => log.duration !== undefined)
      .map(log => log.duration!);
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;
    
    // Calculate peak metrics
    const peakMetrics: Record<string, number> = {};
    const metricGroups = new Map<string, number[]>();
    
    for (const metric of metrics) {
      if (!metricGroups.has(metric.name)) {
        metricGroups.set(metric.name, []);
      }
      metricGroups.get(metric.name)!.push(metric.value);
    }
    
    for (const [name, values] of metricGroups) {
      peakMetrics[name] = Math.max(...values);
    }
    
    // Analyze trends
    const trends: Record<string, { trend: string; confidence: number }> = {};
    for (const [name] of metricGroups) {
      const timeSeries = this.createTimeSeries(metrics, name);
      const trendAnalysis = this.detectTrend(timeSeries);
      trends[name] = {
        trend: trendAnalysis.trend,
        confidence: trendAnalysis.confidence
      };
    }
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (errorRate > 5) {
      recommendations.push(`High error rate detected (${errorRate.toFixed(1)}%). Investigate error patterns and implement better error handling.`);
    }
    
    if (averageResponseTime > 5000) {
      recommendations.push(`High average response time (${this.formatDuration(averageResponseTime)}). Consider performance optimization.`);
    }
    
    if (peakMetrics.cpu_usage > 80) {
      recommendations.push(`High CPU usage detected (${peakMetrics.cpu_usage.toFixed(1)}%). Consider scaling or optimization.`);
    }
    
    if (peakMetrics.memory_usage > 80) {
      recommendations.push(`High memory usage detected (${peakMetrics.memory_usage.toFixed(1)}%). Check for memory leaks or increase resources.`);
    }
    
    for (const [metric, trend] of Object.entries(trends)) {
      if (trend.trend === 'increasing' && trend.confidence > 0.7 && metric.includes('latency')) {
        recommendations.push(`${metric} is showing an increasing trend. Monitor for potential performance degradation.`);
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('System performance looks healthy. Continue monitoring.');
    }
    
    return {
      summary: {
        totalEvents,
        errorRate,
        averageResponseTime,
        peakMetrics
      },
      trends,
      recommendations
    };
  }
}
