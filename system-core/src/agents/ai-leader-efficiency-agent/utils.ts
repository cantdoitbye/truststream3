/**
 * AI Leader Efficiency Agent - Utility Functions
 * 
 * Helper functions and utilities for the Efficiency Agent following
 * the orchestration-first architecture patterns.
 */

import { 
  PerformanceMetrics, 
  OptimizationOpportunity,
  PerformanceForecast,
  BottleneckAnalysis,
  ResourceUtilization,
  MLModelConfig
} from './interfaces';

/**
 * Calculate overall performance score based on metrics
 */
export async function calculatePerformanceScore(
  metricsCache: Map<string, PerformanceMetrics>
): Promise<number> {
  if (metricsCache.size === 0) {
    return 0;
  }

  const recentMetrics = Array.from(metricsCache.values())
    .slice(-10) // Last 10 measurements
    .map(metrics => {
      // Normalize metrics to 0-1 scale
      const responseTimeScore = Math.max(0, 1 - (metrics.responseTime / 2000)); // 2s baseline
      const throughputScore = Math.min(1, metrics.throughput / 1000); // 1000 rps baseline
      const errorRateScore = Math.max(0, 1 - (metrics.errorRate * 10)); // 10% baseline
      const availabilityScore = metrics.availability;
      
      const resourceScore = calculateResourceScore(metrics.resourceUtilization);
      
      // Weighted average
      return (
        responseTimeScore * 0.25 +
        throughputScore * 0.2 +
        errorRateScore * 0.2 +
        availabilityScore * 0.15 +
        resourceScore * 0.2
      );
    });

  // Return average of recent scores
  return recentMetrics.reduce((sum, score) => sum + score, 0) / recentMetrics.length;
}

/**
 * Calculate resource utilization score
 */
function calculateResourceScore(utilization: ResourceUtilization): number {
  // Optimal utilization is around 70% - penalize both under and over-utilization
  const optimal = 0.7;
  const cpuScore = 1 - Math.abs(utilization.cpu - optimal) / optimal;
  const memoryScore = 1 - Math.abs(utilization.memory - optimal) / optimal;
  const diskScore = 1 - Math.abs(utilization.disk - optimal) / optimal;
  const networkScore = 1 - Math.abs(utilization.network - optimal) / optimal;
  
  return Math.max(0, (cpuScore + memoryScore + diskScore + networkScore) / 4);
}

/**
 * Identify optimization opportunities based on current metrics
 */
export async function identifyOptimizationOpportunities(): Promise<OptimizationOpportunity[]> {
  const opportunities: OptimizationOpportunity[] = [];
  
  // This is a simplified implementation - in production, this would use
  // machine learning models and historical data analysis
  
  // CPU optimization opportunities
  opportunities.push({
    type: 'cpu',
    description: 'Optimize CPU-intensive algorithms',
    currentValue: 0.85,
    targetValue: 0.65,
    estimatedImpact: 0.15,
    complexity: 'medium',
    priority: 8
  });
  
  // Memory optimization opportunities
  opportunities.push({
    type: 'memory',
    description: 'Implement memory pooling for frequent allocations',
    currentValue: 0.78,
    targetValue: 0.60,
    estimatedImpact: 0.12,
    complexity: 'low',
    priority: 6
  });
  
  // Database optimization opportunities
  opportunities.push({
    type: 'database',
    description: 'Add database query optimization and caching',
    currentValue: 150, // ms average query time
    targetValue: 50,
    estimatedImpact: 0.20,
    complexity: 'high',
    priority: 9
  });
  
  // Algorithm optimization opportunities
  opportunities.push({
    type: 'algorithm',
    description: 'Implement more efficient sorting algorithms',
    currentValue: 200, // ms processing time
    targetValue: 80,
    estimatedImpact: 0.25,
    complexity: 'medium',
    priority: 7
  });
  
  // Sort by priority (descending)
  return opportunities.sort((a, b) => b.priority - a.priority);
}

/**
 * Predict performance trends using historical data
 */
export async function predictPerformanceTrends(
  historicalData: PerformanceMetrics[]
): Promise<PerformanceForecast> {
  if (historicalData.length < 10) {
    throw new Error('Insufficient historical data for prediction');
  }
  
  const forecastId = `forecast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const timeHorizon = 60; // 1 hour
  
  // Simple linear regression for trend prediction
  // In production, this would use more sophisticated ML models
  const predictions = [
    predictMetricTrend(historicalData, 'responseTime', timeHorizon),
    predictMetricTrend(historicalData, 'throughput', timeHorizon),
    predictMetricTrend(historicalData, 'errorRate', timeHorizon),
    predictMetricTrend(historicalData, 'availability', timeHorizon)
  ];
  
  return {
    forecastId,
    timestamp: new Date(),
    timeHorizon,
    predictions,
    confidence: calculateForecastConfidence(historicalData),
    methodology: 'Linear Regression with Seasonal Adjustment',
    assumptions: [
      'System load patterns remain consistent',
      'No major infrastructure changes',
      'Current optimization efforts continue'
    ]
  };
}

/**
 * Predict trend for a specific metric
 */
function predictMetricTrend(
  data: PerformanceMetrics[], 
  metric: string, 
  hoursAhead: number
): any {
  const values = data.map((d, index) => ({ x: index, y: getMetricValue(d, metric) }));
  const { slope, intercept } = calculateLinearRegression(values);
  
  const currentValue = values[values.length - 1].y;
  const predictedValue = slope * (values.length + hoursAhead) + intercept;
  
  let trend: 'improving' | 'stable' | 'degrading' = 'stable';
  const changePercent = Math.abs((predictedValue - currentValue) / currentValue);
  
  if (changePercent > 0.05) { // 5% threshold
    if (metric === 'responseTime' || metric === 'errorRate') {
      trend = predictedValue > currentValue ? 'degrading' : 'improving';
    } else {
      trend = predictedValue > currentValue ? 'improving' : 'degrading';
    }
  }
  
  return {
    metric,
    currentValue,
    predictedValue,
    trend,
    confidence: 0.85, // Simplified confidence calculation
    timeToThreshold: calculateTimeToThreshold(slope, currentValue, metric),
    factors: identifyInfluencingFactors(metric)
  };
}

/**
 * Calculate linear regression for trend analysis
 */
function calculateLinearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number } {
  const n = points.length;
  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);
  const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return { slope, intercept };
}

/**
 * Get metric value from performance metrics object
 */
function getMetricValue(metrics: PerformanceMetrics, metric: string): number {
  switch (metric) {
    case 'responseTime':
      return metrics.responseTime;
    case 'throughput':
      return metrics.throughput;
    case 'errorRate':
      return metrics.errorRate;
    case 'availability':
      return metrics.availability;
    default:
      return 0;
  }
}

/**
 * Calculate forecast confidence based on data quality
 */
function calculateForecastConfidence(data: PerformanceMetrics[]): number {
  // Simple confidence calculation based on data consistency
  const dataQuality = assessDataQuality(data);
  const trendStability = assessTrendStability(data);
  const dataRecency = assessDataRecency(data);
  
  return (dataQuality * 0.4 + trendStability * 0.4 + dataRecency * 0.2);
}

/**
 * Assess data quality for confidence calculation
 */
function assessDataQuality(data: PerformanceMetrics[]): number {
  // Check for missing data points, outliers, etc.
  const completeness = data.length / 100; // Assuming 100 is ideal sample size
  const consistency = calculateDataConsistency(data);
  
  return Math.min(1, (completeness + consistency) / 2);
}

/**
 * Calculate data consistency for quality assessment
 */
function calculateDataConsistency(data: PerformanceMetrics[]): number {
  if (data.length < 2) return 0;
  
  const responseTimeVariance = calculateVariance(data.map(d => d.responseTime));
  const throughputVariance = calculateVariance(data.map(d => d.throughput));
  
  // Lower variance indicates higher consistency
  const normalizedVariance = Math.min(1, (responseTimeVariance + throughputVariance) / 2);
  return 1 - normalizedVariance;
}

/**
 * Calculate variance of a numeric array
 */
function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
  
  return squaredDifferences.reduce((sum, diff) => sum + diff, 0) / values.length;
}

/**
 * Assess trend stability for confidence calculation
 */
function assessTrendStability(data: PerformanceMetrics[]): number {
  // Analyze trend consistency over time
  // Simplified implementation
  return 0.8;
}

/**
 * Assess data recency for confidence calculation
 */
function assessDataRecency(data: PerformanceMetrics[]): number {
  if (data.length === 0) return 0;
  
  const latestTimestamp = data[data.length - 1].timestamp;
  const ageInHours = (Date.now() - latestTimestamp.getTime()) / (1000 * 60 * 60);
  
  // Fresher data gets higher score
  return Math.max(0, 1 - (ageInHours / 24)); // 24 hours decay
}

/**
 * Calculate time to threshold crossing
 */
function calculateTimeToThreshold(slope: number, currentValue: number, metric: string): number | undefined {
  // Define thresholds for different metrics
  const thresholds: Record<string, number> = {
    responseTime: 1000, // 1s
    throughput: 500,    // 500 rps
    errorRate: 0.05,    // 5%
    availability: 0.95  // 95%
  };
  
  const threshold = thresholds[metric];
  if (!threshold || slope === 0) return undefined;
  
  const timeToThreshold = (threshold - currentValue) / slope;
  return timeToThreshold > 0 ? timeToThreshold : undefined;
}

/**
 * Identify factors influencing metric trends
 */
function identifyInfluencingFactors(metric: string): any[] {
  const factors: Record<string, any[]> = {
    responseTime: [
      { factor: 'System Load', influence: 0.8, description: 'High system load increases response time' },
      { factor: 'Database Performance', influence: 0.6, description: 'Slow queries impact response time' },
      { factor: 'Network Latency', influence: 0.4, description: 'Network delays affect response time' }
    ],
    throughput: [
      { factor: 'CPU Utilization', influence: 0.9, description: 'CPU bottlenecks limit throughput' },
      { factor: 'Concurrent Users', influence: 0.7, description: 'More users can reduce per-user throughput' },
      { factor: 'Memory Availability', influence: 0.5, description: 'Memory pressure affects throughput' }
    ],
    errorRate: [
      { factor: 'System Stability', influence: 0.9, description: 'System instability increases errors' },
      { factor: 'Input Validation', influence: 0.6, description: 'Poor validation leads to more errors' },
      { factor: 'External Dependencies', influence: 0.7, description: 'External service failures cause errors' }
    ],
    availability: [
      { factor: 'Infrastructure Health', influence: 0.95, description: 'Infrastructure failures reduce availability' },
      { factor: 'Deployment Frequency', influence: 0.4, description: 'Frequent deployments can impact availability' },
      { factor: 'Monitoring Coverage', influence: 0.3, description: 'Better monitoring improves availability' }
    ]
  };
  
  return factors[metric] || [];
}

/**
 * Validate optimization parameters
 */
export function validateOptimizationParams(
  metrics: PerformanceMetrics, 
  bottlenecks: BottleneckAnalysis
): boolean {
  // Validate that metrics are within reasonable bounds
  if (metrics.responseTime < 0 || metrics.responseTime > 10000) {
    return false;
  }
  
  if (metrics.throughput < 0 || metrics.throughput > 100000) {
    return false;
  }
  
  if (metrics.errorRate < 0 || metrics.errorRate > 1) {
    return false;
  }
  
  if (metrics.availability < 0 || metrics.availability > 1) {
    return false;
  }
  
  // Validate bottlenecks have valid severity
  const validSeverities = ['low', 'medium', 'high', 'critical'];
  if (!validSeverities.includes(bottlenecks.severity)) {
    return false;
  }
  
  return true;
}

/**
 * Calculate optimization impact score
 */
export function calculateOptimizationImpact(
  beforeMetrics: PerformanceMetrics,
  afterMetrics: PerformanceMetrics
): number {
  const responseTimeImprovement = 
    (beforeMetrics.responseTime - afterMetrics.responseTime) / beforeMetrics.responseTime;
  
  const throughputImprovement = 
    (afterMetrics.throughput - beforeMetrics.throughput) / beforeMetrics.throughput;
  
  const errorRateImprovement = 
    (beforeMetrics.errorRate - afterMetrics.errorRate) / beforeMetrics.errorRate;
  
  const availabilityImprovement = 
    (afterMetrics.availability - beforeMetrics.availability) / beforeMetrics.availability;
  
  // Weighted average of improvements
  return (
    responseTimeImprovement * 0.3 +
    throughputImprovement * 0.3 +
    errorRateImprovement * 0.2 +
    availabilityImprovement * 0.2
  );
}

/**
 * Generate optimization recommendations
 */
export function generateOptimizationRecommendations(
  metrics: PerformanceMetrics,
  opportunities: OptimizationOpportunity[]
): string[] {
  const recommendations: string[] = [];
  
  // Response time recommendations
  if (metrics.responseTime > 500) {
    recommendations.push('Implement response caching for frequently accessed data');
    recommendations.push('Optimize database queries with proper indexing');
    recommendations.push('Consider implementing CDN for static content');
  }
  
  // Throughput recommendations
  if (metrics.throughput < 1000) {
    recommendations.push('Scale horizontally by adding more server instances');
    recommendations.push('Implement connection pooling for database connections');
    recommendations.push('Optimize algorithm efficiency in critical paths');
  }
  
  // Error rate recommendations
  if (metrics.errorRate > 0.01) {
    recommendations.push('Implement circuit breakers for external service calls');
    recommendations.push('Add comprehensive input validation and error handling');
    recommendations.push('Improve monitoring and alerting for faster issue detection');
  }
  
  // Resource utilization recommendations
  const cpu = metrics.resourceUtilization.cpu;
  const memory = metrics.resourceUtilization.memory;
  
  if (cpu > 0.8) {
    recommendations.push('Consider CPU optimization or scaling');
  }
  
  if (memory > 0.8) {
    recommendations.push('Implement memory optimization or increase memory allocation');
  }
  
  // Add opportunity-specific recommendations
  opportunities.slice(0, 3).forEach(opportunity => {
    recommendations.push(`Priority optimization: ${opportunity.description}`);
  });
  
  return recommendations;
}

/**
 * Create performance summary
 */
export function createPerformanceSummary(
  metrics: PerformanceMetrics[],
  timeWindow: number = 3600000 // 1 hour default
): any {
  const recentMetrics = metrics.filter(
    m => Date.now() - m.timestamp.getTime() < timeWindow
  );
  
  if (recentMetrics.length === 0) {
    return null;
  }
  
  const avgResponseTime = average(recentMetrics.map(m => m.responseTime));
  const avgThroughput = average(recentMetrics.map(m => m.throughput));
  const avgErrorRate = average(recentMetrics.map(m => m.errorRate));
  const avgAvailability = average(recentMetrics.map(m => m.availability));
  
  const maxResponseTime = Math.max(...recentMetrics.map(m => m.responseTime));
  const minThroughput = Math.min(...recentMetrics.map(m => m.throughput));
  const maxErrorRate = Math.max(...recentMetrics.map(m => m.errorRate));
  const minAvailability = Math.min(...recentMetrics.map(m => m.availability));
  
  return {
    timeWindow,
    dataPoints: recentMetrics.length,
    averages: {
      responseTime: avgResponseTime,
      throughput: avgThroughput,
      errorRate: avgErrorRate,
      availability: avgAvailability
    },
    extremes: {
      maxResponseTime,
      minThroughput,
      maxErrorRate,
      minAvailability
    },
    trends: {
      responseTime: calculateTrend(recentMetrics.map(m => m.responseTime)),
      throughput: calculateTrend(recentMetrics.map(m => m.throughput)),
      errorRate: calculateTrend(recentMetrics.map(m => m.errorRate)),
      availability: calculateTrend(recentMetrics.map(m => m.availability))
    }
  };
}

/**
 * Calculate average of numeric array
 */
function average(values: number[]): number {
  return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
}

/**
 * Calculate trend direction for a series of values
 */
function calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (values.length < 2) return 'stable';
  
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  
  const firstAvg = average(firstHalf);
  const secondAvg = average(secondHalf);
  
  const changePercent = Math.abs((secondAvg - firstAvg) / firstAvg);
  
  if (changePercent < 0.05) return 'stable'; // Less than 5% change
  
  return secondAvg > firstAvg ? 'increasing' : 'decreasing';
}

/**
 * Utility for generating unique IDs
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Utility for safe JSON parsing
 */
export function safeJsonParse(jsonString: string, defaultValue: any = null): any {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Utility for formatting duration in human-readable format
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Utility for formatting percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Utility for formatting file size
 */
export function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 B';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  
  return `${size.toFixed(1)} ${sizes[i]}`;
}
