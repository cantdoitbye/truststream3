/**
 * AI Model Management System - Utility Functions
 * Helper functions for calculations, validations, and formatting
 */

import {
  ModelMetrics,
  ModelHealthStatus,
  ModelAlert,
  DeploymentOptions,
  ModelManagementConfig,
  PerformanceMetric,
  OptimizationRecommendation,
  ModelDeployment
} from './types';

/**
 * Create default configuration for the model management system
 */
export function createDefaultConfig(): ModelManagementConfig {
  return {
    default_monitoring_interval: 30, // 30 seconds
    performance_alert_thresholds: {
      latency_ms: 500,
      error_rate_percentage: 1.0,
      cost_spike_percentage: 50
    },
    auto_optimization_enabled: true,
    ab_test_defaults: {
      significance_threshold: 0.05,
      minimum_sample_size: 1000,
      default_duration_hours: 168 // 1 week
    },
    deployment_settings: {
      max_concurrent_deployments: 5,
      default_rollback_timeout: 300, // 5 minutes
      canary_traffic_increment: 10 // 10% increments
    }
  };
}

/**
 * Validate deployment options
 */
export function validateDeploymentOptions(options: DeploymentOptions): string[] {
  const errors: string[] = [];
  
  // Validate environment
  const validEnvironments = ['development', 'staging', 'production', 'testing'];
  if (!validEnvironments.includes(options.environment)) {
    errors.push(`Invalid environment: ${options.environment}`);
  }
  
  // Validate deployment type
  const validTypes = ['blue-green', 'canary', 'rolling', 'direct'];
  if (!validTypes.includes(options.deployment_type)) {
    errors.push(`Invalid deployment type: ${options.deployment_type}`);
  }
  
  // Validate traffic percentage
  if (options.traffic_percentage !== undefined) {
    if (options.traffic_percentage < 0 || options.traffic_percentage > 100) {
      errors.push('Traffic percentage must be between 0 and 100');
    }
  }
  
  // Validate canary deployment requirements
  if (options.deployment_type === 'canary') {
    if (!options.traffic_percentage || options.traffic_percentage === 100) {
      errors.push('Canary deployments require traffic_percentage < 100');
    }
  }
  
  return errors;
}

/**
 * Calculate aggregated metrics from a list of performance metrics
 */
export function calculateMetricsAggregation(metrics: PerformanceMetric[]): ModelMetrics {
  if (metrics.length === 0) {
    return {
      latency_avg: 0,
      latency_p95: 0,
      latency_p99: 0,
      throughput: 0,
      error_rate: 0,
      cost_per_request: 0,
      uptime_percentage: 0
    };
  }
  
  // Group metrics by type
  const metricsByType = metrics.reduce((acc, metric) => {
    if (!acc[metric.metric_type]) {
      acc[metric.metric_type] = [];
    }
    acc[metric.metric_type].push(metric.metric_value);
    return acc;
  }, {} as Record<string, number[]>);
  
  // Calculate aggregations
  const latencyMetrics = metricsByType.latency || [];
  const throughputMetrics = metricsByType.throughput || [];
  const errorRateMetrics = metricsByType.error_rate || [];
  const costMetrics = metricsByType.cost || [];
  
  return {
    latency_avg: calculateAverage(latencyMetrics),
    latency_p95: calculatePercentile(latencyMetrics, 95),
    latency_p99: calculatePercentile(latencyMetrics, 99),
    throughput: calculateAverage(throughputMetrics),
    error_rate: calculateAverage(errorRateMetrics),
    cost_per_request: calculateAverage(costMetrics),
    uptime_percentage: calculateUptimePercentage(metrics)
  };
}

/**
 * Format metric values for display
 */
export function formatMetricValue(value: number, unit?: string): string {
  if (unit === 'percentage') {
    return `${(value * 100).toFixed(2)}%`;
  }
  
  if (unit === 'usd' || unit === 'cost') {
    return `$${value.toFixed(4)}`;
  }
  
  if (unit === 'ms' || unit === 'milliseconds') {
    return `${Math.round(value)}ms`;
  }
  
  if (unit === 'requests/second' || unit === 'rps') {
    return `${value.toFixed(1)} req/s`;
  }
  
  if (unit === 'bytes') {
    return formatBytes(value);
  }
  
  // Default formatting
  if (value < 0.01 && value > 0) {
    return value.toExponential(2);
  }
  
  if (value > 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  
  if (value > 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  
  return value.toFixed(2);
}

/**
 * Determine overall health status based on metrics and alerts
 */
export function determineHealthStatus(
  metrics: ModelMetrics,
  alerts: ModelAlert[],
  thresholds: ModelManagementConfig['performance_alert_thresholds']
): ModelHealthStatus['overall_health'] {
  const criticalAlerts = alerts.filter(alert => alert.severity === 'critical');
  const warningAlerts = alerts.filter(alert => alert.severity === 'warning');
  
  // Critical if there are critical alerts
  if (criticalAlerts.length > 0) {
    return 'critical';
  }
  
  // Check performance thresholds
  const latencyIssue = metrics.latency_avg > thresholds.latency_ms;
  const errorRateIssue = metrics.error_rate > (thresholds.error_rate_percentage / 100);
  
  if (latencyIssue || errorRateIssue) {
    return 'degraded';
  }
  
  // Degraded if there are warning alerts
  if (warningAlerts.length > 0) {
    return 'degraded';
  }
  
  return 'healthy';
}

/**
 * Generate optimization recommendations based on metrics
 */
export function generateOptimizationRecommendations(
  deployment: ModelDeployment,
  metrics: ModelMetrics,
  thresholds: ModelManagementConfig['performance_alert_thresholds']
): OptimizationRecommendation[] {
  const recommendations: Partial<OptimizationRecommendation>[] = [];
  
  // High latency recommendation
  if (metrics.latency_avg > thresholds.latency_ms) {
    recommendations.push({
      recommendation_type: 'performance',
      priority: metrics.latency_avg > thresholds.latency_ms * 2 ? 'critical' : 'high',
      recommendation_title: 'Optimize Model Latency',
      recommendation_description: `Average latency (${metrics.latency_avg.toFixed(0)}ms) exceeds threshold (${thresholds.latency_ms}ms)`,
      implementation_steps: {
        steps: [
          'Analyze model complexity and size',
          'Consider model quantization or pruning',
          'Optimize inference pipeline',
          'Implement caching strategies',
          'Consider hardware acceleration'
        ]
      },
      expected_impact: {
        latency_improvement: '30-50%',
        cost_reduction: '20-30%'
      },
      estimated_effort: '1-2 weeks',
      auto_generated: true,
      confidence_score: 0.8
    });
  }
  
  // High error rate recommendation
  if (metrics.error_rate > (thresholds.error_rate_percentage / 100)) {
    recommendations.push({
      recommendation_type: 'accuracy',
      priority: 'high',
      recommendation_title: 'Reduce Error Rate',
      recommendation_description: `Error rate (${(metrics.error_rate * 100).toFixed(2)}%) exceeds threshold`,
      implementation_steps: {
        steps: [
          'Analyze error patterns and root causes',
          'Improve input validation',
          'Enhance model robustness',
          'Implement better error handling',
          'Consider model retraining'
        ]
      },
      expected_impact: {
        error_rate_reduction: '50-70%',
        user_satisfaction_improvement: '15-25%'
      },
      estimated_effort: '1-3 weeks',
      auto_generated: true,
      confidence_score: 0.75
    });
  }
  
  // Low throughput recommendation
  if (metrics.throughput < 50) {
    recommendations.push({
      recommendation_type: 'scaling',
      priority: 'medium',
      recommendation_title: 'Improve Throughput',
      recommendation_description: `Low throughput (${metrics.throughput.toFixed(1)} req/s) may impact user experience`,
      implementation_steps: {
        steps: [
          'Analyze bottlenecks in request processing',
          'Implement request batching',
          'Optimize resource allocation',
          'Consider horizontal scaling',
          'Implement load balancing'
        ]
      },
      expected_impact: {
        throughput_improvement: '2-3x',
        response_time_improvement: '20-30%'
      },
      estimated_effort: '1-2 weeks',
      auto_generated: true,
      confidence_score: 0.7
    });
  }
  
  // High cost recommendation
  if (metrics.cost_per_request > 0.01) {
    recommendations.push({
      recommendation_type: 'cost',
      priority: 'medium',
      recommendation_title: 'Optimize Costs',
      recommendation_description: `High cost per request ($${metrics.cost_per_request.toFixed(4)}) impacts profitability`,
      implementation_steps: {
        steps: [
          'Analyze cost breakdown',
          'Optimize model size and complexity',
          'Implement efficient resource usage',
          'Consider spot instances or reserved capacity',
          'Optimize data transfer costs'
        ]
      },
      expected_impact: {
        cost_reduction: '40-60%',
        roi_improvement: '20-30%'
      },
      estimated_effort: '2-3 weeks',
      auto_generated: true,
      confidence_score: 0.85
    });
  }
  
  return recommendations.map((rec, index) => ({
    id: `rec-${Date.now()}-${index}`,
    deployment_id: deployment.id,
    status: 'open',
    risk_assessment: { level: 'medium', factors: [] },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...rec
  })) as OptimizationRecommendation[];
}

// Helper functions

function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function calculateUptimePercentage(metrics: PerformanceMetric[]): number {
  // Simplified uptime calculation based on error rate
  const errorMetrics = metrics.filter(m => m.metric_type === 'error_rate');
  if (errorMetrics.length === 0) return 100;
  
  const avgErrorRate = calculateAverage(errorMetrics.map(m => m.metric_value));
  return Math.max(0, 100 - (avgErrorRate * 100));
}

function formatBytes(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 B';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Calculate health score based on metrics
 */
export function calculateHealthScore(
  metrics: ModelMetrics,
  alerts: ModelAlert[]
): number {
  let score = 100;
  
  // Deduct points for high latency
  if (metrics.latency_avg > 200) {
    score -= Math.min(30, (metrics.latency_avg - 200) / 10);
  }
  
  // Deduct points for high error rate
  if (metrics.error_rate > 0.01) {
    score -= Math.min(40, (metrics.error_rate - 0.01) * 1000);
  }
  
  // Deduct points for low throughput
  if (metrics.throughput < 50) {
    score -= Math.min(20, (50 - metrics.throughput) / 2);
  }
  
  // Deduct points for alerts
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
  const warningAlerts = alerts.filter(a => a.severity === 'warning').length;
  
  score -= criticalAlerts * 15;
  score -= warningAlerts * 5;
  
  return Math.max(0, Math.round(score));
}

/**
 * Generate a unique ID
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate JSON string
 */
export function validateJson(jsonString: string): { valid: boolean; error?: string } {
  try {
    JSON.parse(jsonString);
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Deep merge objects
 */
export function deepMerge(target: any, ...sources: any[]): any {
  if (!sources.length) return target;
  const source = sources.shift();
  
  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }
  
  return deepMerge(target, ...sources);
}

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}