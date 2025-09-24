/**
 * TrustStream v4.2 - Circuit Breaker Implementation
 * Advanced circuit breaker with adaptive thresholds and monitoring
 */

import {
  ICircuitBreaker,
  CircuitBreakerConfig,
  CircuitBreakerState,
  CircuitState,
  CircuitBreakerMetric,
  ErrorContext,
  ErrorType
} from '../core/interfaces';
import { Logger } from '../../../shared-utils/logger';
import { EventEmitter } from 'events';

/**
 * Advanced circuit breaker with machine learning capabilities
 */
export class CircuitBreaker extends EventEmitter implements ICircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitBreakerState;
  private logger: Logger;
  private name: string;
  private adaptiveThresholds: AdaptiveThresholds;
  private metrics: CircuitBreakerMetrics;

  constructor(
    name: string,
    config: CircuitBreakerConfig,
    logger: Logger
  ) {
    super();
    this.name = name;
    this.config = { ...this.getDefaultConfig(), ...config };
    this.logger = logger;
    this.state = this.initializeState();
    this.adaptiveThresholds = new AdaptiveThresholds(config);
    this.metrics = new CircuitBreakerMetrics();

    // Periodic state evaluation
    setInterval(() => this.evaluateState(), 5000);
  }

  /**
   * Execute operation with circuit breaker protection
   */
  async call<T>(operation: () => Promise<T>, context: ErrorContext): Promise<T> {
    const startTime = Date.now();
    
    // Check current state
    if (this.state.state === 'open') {
      const error = new Error(`Circuit breaker '${this.name}' is OPEN`);
      this.recordMetric(false, Date.now() - startTime, 'circuit_open');
      throw error;
    }

    // Half-open state: limited testing
    if (this.state.state === 'half_open') {
      return this.executeInHalfOpenState(operation, context, startTime);
    }

    // Closed state: normal execution
    return this.executeInClosedState(operation, context, startTime);
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  /**
   * Reset circuit breaker to closed state
   */
  reset(): void {
    this.logger.info(`Resetting circuit breaker: ${this.name}`);
    
    this.state = {
      ...this.state,
      state: 'closed',
      failure_count: 0,
      success_count: 0,
      last_failure_time: null,
      next_attempt_time: null
    };

    this.adaptiveThresholds.reset();
    this.emit('reset');
  }

  /**
   * Force circuit breaker to open state
   */
  forceOpen(): void {
    this.logger.warn(`Forcing circuit breaker OPEN: ${this.name}`);
    
    this.state.state = 'open';
    this.state.last_failure_time = new Date();
    this.state.next_attempt_time = new Date(
      Date.now() + this.config.recovery_timeout
    );

    this.emit('forced_open');
  }

  /**
   * Force circuit breaker to closed state
   */
  forceClose(): void {
    this.logger.info(`Forcing circuit breaker CLOSED: ${this.name}`);
    
    this.state.state = 'closed';
    this.state.failure_count = 0;
    this.state.last_failure_time = null;
    this.state.next_attempt_time = null;

    this.emit('forced_close');
  }

  /**
   * Execute operation in closed state
   */
  private async executeInClosedState<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    startTime: number
  ): Promise<T> {
    try {
      const result = await operation();
      const responseTime = Date.now() - startTime;
      
      this.recordSuccess(responseTime);
      this.adaptiveThresholds.recordSuccess(responseTime);
      
      return result;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.recordFailure(responseTime, error);
      this.adaptiveThresholds.recordFailure(responseTime, error);
      
      // Check if we should open the circuit
      if (this.shouldOpenCircuit()) {
        this.openCircuit();
      }
      
      throw error;
    }
  }

  /**
   * Execute operation in half-open state
   */
  private async executeInHalfOpenState<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    startTime: number
  ): Promise<T> {
    try {
      const result = await operation();
      const responseTime = Date.now() - startTime;
      
      this.recordSuccess(responseTime);
      
      // Check if we should close the circuit
      if (this.shouldCloseCircuit()) {
        this.closeCircuit();
      }
      
      return result;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.recordFailure(responseTime, error);
      
      // Back to open state
      this.openCircuit();
      throw error;
    }
  }

  /**
   * Record successful operation
   */
  private recordSuccess(responseTime: number): void {
    this.state.success_count++;
    this.state.last_success_time = new Date();
    
    const metric: CircuitBreakerMetric = {
      timestamp: new Date(),
      success: true,
      response_time: responseTime
    };
    
    this.addToRollingWindow(metric);
    this.recordMetric(true, responseTime);
    
    this.logger.debug(`Circuit breaker success: ${this.name}`, {
      response_time: responseTime,
      success_count: this.state.success_count
    });
  }

  /**
   * Record failed operation
   */
  private recordFailure(responseTime: number, error: any): void {
    this.state.failure_count++;
    this.state.last_failure_time = new Date();
    
    const errorType = this.determineErrorType(error);
    
    const metric: CircuitBreakerMetric = {
      timestamp: new Date(),
      success: false,
      response_time: responseTime,
      error_type: errorType
    };
    
    this.addToRollingWindow(metric);
    this.recordMetric(false, responseTime, errorType);
    
    this.logger.debug(`Circuit breaker failure: ${this.name}`, {
      response_time: responseTime,
      failure_count: this.state.failure_count,
      error_type: errorType
    });
  }

  /**
   * Add metric to rolling window
   */
  private addToRollingWindow(metric: CircuitBreakerMetric): void {
    this.state.rolling_window.push(metric);
    
    // Maintain window size
    if (this.state.rolling_window.length > this.config.rolling_window_size) {
      this.state.rolling_window.shift();
    }
  }

  /**
   * Check if circuit should be opened
   */
  private shouldOpenCircuit(): boolean {
    const windowMetrics = this.getRecentMetrics();
    
    if (windowMetrics.length < this.config.minimum_throughput) {
      return false;
    }
    
    const failureCount = windowMetrics.filter(m => !m.success).length;
    const failurePercentage = (failureCount / windowMetrics.length) * 100;
    
    // Use adaptive threshold if available
    const threshold = this.adaptiveThresholds.getFailureThreshold() ||
                     this.config.error_threshold_percentage;
    
    const shouldOpen = failurePercentage >= threshold;
    
    if (shouldOpen) {
      this.logger.warn(`Circuit breaker threshold exceeded: ${this.name}`, {
        failure_percentage: failurePercentage,
        threshold,
        window_size: windowMetrics.length
      });
    }
    
    return shouldOpen;
  }

  /**
   * Check if circuit should be closed (from half-open)
   */
  private shouldCloseCircuit(): boolean {
    // Simple strategy: close after a few successful requests
    const recentSuccesses = this.state.rolling_window
      .slice(-5) // Last 5 requests
      .filter(m => m.success).length;
    
    return recentSuccesses >= 3;
  }

  /**
   * Open the circuit
   */
  private openCircuit(): void {
    this.state.state = 'open';
    this.state.next_attempt_time = new Date(
      Date.now() + this.config.recovery_timeout
    );
    
    this.logger.warn(`Circuit breaker OPENED: ${this.name}`, {
      failure_count: this.state.failure_count,
      recovery_timeout: this.config.recovery_timeout
    });
    
    this.emit('opened', {
      failure_count: this.state.failure_count,
      metrics: this.getMetricsSummary()
    });
  }

  /**
   * Close the circuit
   */
  private closeCircuit(): void {
    this.state.state = 'closed';
    this.state.failure_count = 0;
    this.state.next_attempt_time = null;
    
    this.logger.info(`Circuit breaker CLOSED: ${this.name}`);
    
    this.emit('closed', {
      success_count: this.state.success_count,
      metrics: this.getMetricsSummary()
    });
  }

  /**
   * Transition to half-open state
   */
  private transitionToHalfOpen(): void {
    this.state.state = 'half_open';
    
    this.logger.info(`Circuit breaker HALF-OPEN: ${this.name}`);
    
    this.emit('half_open');
  }

  /**
   * Periodic state evaluation
   */
  private evaluateState(): void {
    if (this.state.state === 'open' && this.canAttemptRecovery()) {
      this.transitionToHalfOpen();
    }
    
    // Update adaptive thresholds
    this.adaptiveThresholds.update(this.getRecentMetrics());
    
    // Clean old metrics
    this.cleanOldMetrics();
  }

  /**
   * Check if recovery can be attempted
   */
  private canAttemptRecovery(): boolean {
    if (!this.state.next_attempt_time) {
      return false;
    }
    
    return Date.now() >= this.state.next_attempt_time.getTime();
  }

  /**
   * Get recent metrics within rolling window
   */
  private getRecentMetrics(): CircuitBreakerMetric[] {
    const cutoffTime = Date.now() - this.config.rolling_window_size;
    
    return this.state.rolling_window.filter(
      metric => metric.timestamp.getTime() > cutoffTime
    );
  }

  /**
   * Clean old metrics to prevent memory leaks
   */
  private cleanOldMetrics(): void {
    const cutoffTime = Date.now() - (this.config.rolling_window_size * 2);
    
    this.state.rolling_window = this.state.rolling_window.filter(
      metric => metric.timestamp.getTime() > cutoffTime
    );
  }

  /**
   * Record metric for monitoring
   */
  private recordMetric(
    success: boolean, 
    responseTime: number, 
    errorType?: ErrorType | string
  ): void {
    this.metrics.record({
      circuitName: this.name,
      success,
      responseTime,
      errorType,
      state: this.state.state,
      timestamp: new Date()
    });
  }

  /**
   * Determine error type from error object
   */
  private determineErrorType(error: any): ErrorType {
    if (error.code === 'ECONNREFUSED') return 'network_error';
    if (error.code === 'ETIMEDOUT') return 'timeout_error';
    if (error.message?.includes('database')) return 'database_error';
    if (error.message?.includes('unauthorized')) return 'authentication_error';
    if (error.message?.includes('forbidden')) return 'authorization_error';
    if (error.status === 429) return 'rate_limit_error';
    
    return 'system_error';
  }

  /**
   * Get metrics summary
   */
  private getMetricsSummary(): any {
    const recentMetrics = this.getRecentMetrics();
    const successCount = recentMetrics.filter(m => m.success).length;
    const failureCount = recentMetrics.length - successCount;
    
    return {
      total_requests: recentMetrics.length,
      success_count: successCount,
      failure_count: failureCount,
      success_rate: recentMetrics.length > 0 ? successCount / recentMetrics.length : 0,
      average_response_time: recentMetrics.length > 0 ?
        recentMetrics.reduce((sum, m) => sum + m.response_time, 0) / recentMetrics.length : 0
    };
  }

  /**
   * Initialize default state
   */
  private initializeState(): CircuitBreakerState {
    return {
      state: 'closed',
      failure_count: 0,
      success_count: 0,
      last_failure_time: null,
      last_success_time: null,
      next_attempt_time: null,
      rolling_window: []
    };
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): CircuitBreakerConfig {
    return {
      failure_threshold: 5,
      recovery_timeout: 60000, // 1 minute
      test_request_volume: 3,
      rolling_window_size: 60000, // 1 minute
      minimum_throughput: 10,
      error_threshold_percentage: 50
    };
  }

  /**
   * Get detailed metrics for monitoring
   */
  getDetailedMetrics(): any {
    return {
      name: this.name,
      state: this.state,
      config: this.config,
      adaptive_thresholds: this.adaptiveThresholds.getThresholds(),
      recent_metrics: this.getMetricsSummary(),
      historical_metrics: this.metrics.getSummary()
    };
  }
}

/**
 * Adaptive thresholds that learn from historical data
 */
class AdaptiveThresholds {
  private config: CircuitBreakerConfig;
  private historicalData: HistoricalMetric[] = [];
  private currentThresholds: AdaptiveThresholdValues;
  private learningEnabled: boolean = true;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
    this.currentThresholds = {
      failureThreshold: config.error_threshold_percentage,
      responseTimeThreshold: 5000, // 5 seconds default
      lastUpdated: new Date()
    };
  }

  /**
   * Record successful operation
   */
  recordSuccess(responseTime: number): void {
    this.addHistoricalData({
      timestamp: new Date(),
      success: true,
      responseTime,
      errorType: undefined
    });
  }

  /**
   * Record failed operation
   */
  recordFailure(responseTime: number, error: any): void {
    this.addHistoricalData({
      timestamp: new Date(),
      success: false,
      responseTime,
      errorType: this.categorizeError(error)
    });
  }

  /**
   * Update thresholds based on recent data
   */
  update(recentMetrics: CircuitBreakerMetric[]): void {
    if (!this.learningEnabled || recentMetrics.length < 20) {
      return; // Need sufficient data for learning
    }

    const failureRate = this.calculateFailureRate(recentMetrics);
    const avgResponseTime = this.calculateAverageResponseTime(recentMetrics);
    const errorPatterns = this.analyzeErrorPatterns(recentMetrics);

    // Adjust failure threshold based on historical patterns
    this.adjustFailureThreshold(failureRate, errorPatterns);
    
    // Adjust response time threshold
    this.adjustResponseTimeThreshold(avgResponseTime);
    
    this.currentThresholds.lastUpdated = new Date();
  }

  /**
   * Get current failure threshold
   */
  getFailureThreshold(): number {
    return this.currentThresholds.failureThreshold;
  }

  /**
   * Get current thresholds
   */
  getThresholds(): AdaptiveThresholdValues {
    return { ...this.currentThresholds };
  }

  /**
   * Reset thresholds to defaults
   */
  reset(): void {
    this.currentThresholds = {
      failureThreshold: this.config.error_threshold_percentage,
      responseTimeThreshold: 5000,
      lastUpdated: new Date()
    };
    this.historicalData = [];
  }

  /**
   * Add historical data point
   */
  private addHistoricalData(data: HistoricalMetric): void {
    this.historicalData.push(data);
    
    // Maintain sliding window of historical data
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    this.historicalData = this.historicalData.filter(
      d => d.timestamp.getTime() > cutoffTime
    );
  }

  /**
   * Calculate failure rate from metrics
   */
  private calculateFailureRate(metrics: CircuitBreakerMetric[]): number {
    if (metrics.length === 0) return 0;
    
    const failures = metrics.filter(m => !m.success).length;
    return (failures / metrics.length) * 100;
  }

  /**
   * Calculate average response time
   */
  private calculateAverageResponseTime(metrics: CircuitBreakerMetric[]): number {
    if (metrics.length === 0) return 0;
    
    const totalTime = metrics.reduce((sum, m) => sum + m.response_time, 0);
    return totalTime / metrics.length;
  }

  /**
   * Analyze error patterns in metrics
   */
  private analyzeErrorPatterns(metrics: CircuitBreakerMetric[]): ErrorPatternAnalysis {
    const errorTypes = new Map<ErrorType, number>();
    const timeBasedErrors = new Map<number, number>(); // Hour of day -> error count
    
    metrics.filter(m => !m.success && m.error_type).forEach(metric => {
      const errorType = metric.error_type!;
      errorTypes.set(errorType, (errorTypes.get(errorType) || 0) + 1);
      
      const hour = metric.timestamp.getHours();
      timeBasedErrors.set(hour, (timeBasedErrors.get(hour) || 0) + 1);
    });
    
    return {
      errorTypeDistribution: Object.fromEntries(errorTypes),
      timeBasedDistribution: Object.fromEntries(timeBasedErrors),
      totalErrors: metrics.filter(m => !m.success).length
    };
  }

  /**
   * Adjust failure threshold based on patterns
   */
  private adjustFailureThreshold(
    currentFailureRate: number, 
    patterns: ErrorPatternAnalysis
  ): void {
    // If we're seeing consistent transient errors, be more lenient
    const transientErrorRatio = this.calculateTransientErrorRatio(patterns);
    
    if (transientErrorRatio > 0.7) {
      // More lenient for transient errors
      this.currentThresholds.failureThreshold = Math.min(
        this.config.error_threshold_percentage * 1.5,
        80
      );
    } else if (transientErrorRatio < 0.3) {
      // More strict for persistent errors
      this.currentThresholds.failureThreshold = Math.max(
        this.config.error_threshold_percentage * 0.8,
        20
      );
    }
  }

  /**
   * Adjust response time threshold
   */
  private adjustResponseTimeThreshold(avgResponseTime: number): void {
    // Set threshold to 95th percentile of recent response times
    const recentResponseTimes = this.historicalData
      .slice(-100) // Last 100 requests
      .map(d => d.responseTime)
      .sort((a, b) => a - b);
    
    if (recentResponseTimes.length > 20) {
      const p95Index = Math.floor(recentResponseTimes.length * 0.95);
      this.currentThresholds.responseTimeThreshold = recentResponseTimes[p95Index];
    }
  }

  /**
   * Calculate ratio of transient vs persistent errors
   */
  private calculateTransientErrorRatio(patterns: ErrorPatternAnalysis): number {
    const transientErrors = [
      'timeout_error',
      'network_error',
      'rate_limit_error'
    ];
    
    let transientCount = 0;
    let totalErrors = 0;
    
    Object.entries(patterns.errorTypeDistribution).forEach(([type, count]) => {
      totalErrors += count;
      if (transientErrors.includes(type)) {
        transientCount += count;
      }
    });
    
    return totalErrors > 0 ? transientCount / totalErrors : 0;
  }

  /**
   * Categorize error for learning
   */
  private categorizeError(error: any): string {
    if (error.code === 'ECONNREFUSED') return 'network_error';
    if (error.code === 'ETIMEDOUT') return 'timeout_error';
    if (error.status === 429) return 'rate_limit_error';
    if (error.message?.includes('database')) return 'database_error';
    
    return 'system_error';
  }
}

/**
 * Circuit breaker metrics collection
 */
class CircuitBreakerMetrics {
  private metrics: CircuitMetricData[] = [];
  private aggregates: CircuitAggregates = {
    totalRequests: 0,
    totalFailures: 0,
    totalSuccesses: 0,
    averageResponseTime: 0,
    lastReset: new Date()
  };

  /**
   * Record a new metric
   */
  record(metric: CircuitMetricData): void {
    this.metrics.push(metric);
    this.updateAggregates(metric);
    
    // Maintain sliding window
    const cutoffTime = Date.now() - (60 * 60 * 1000); // 1 hour
    this.metrics = this.metrics.filter(
      m => m.timestamp.getTime() > cutoffTime
    );
  }

  /**
   * Get metrics summary
   */
  getSummary(): CircuitAggregates {
    return { ...this.aggregates };
  }

  /**
   * Update aggregate metrics
   */
  private updateAggregates(metric: CircuitMetricData): void {
    this.aggregates.totalRequests++;
    
    if (metric.success) {
      this.aggregates.totalSuccesses++;
    } else {
      this.aggregates.totalFailures++;
    }
    
    // Update average response time (running average)
    const totalTime = this.aggregates.averageResponseTime * (this.aggregates.totalRequests - 1);
    this.aggregates.averageResponseTime = (totalTime + metric.responseTime) / this.aggregates.totalRequests;
  }
}

// Supporting interfaces
interface AdaptiveThresholdValues {
  failureThreshold: number;
  responseTimeThreshold: number;
  lastUpdated: Date;
}

interface HistoricalMetric {
  timestamp: Date;
  success: boolean;
  responseTime: number;
  errorType?: string;
}

interface ErrorPatternAnalysis {
  errorTypeDistribution: Record<string, number>;
  timeBasedDistribution: Record<number, number>;
  totalErrors: number;
}

interface CircuitMetricData {
  circuitName: string;
  success: boolean;
  responseTime: number;
  errorType?: ErrorType | string;
  state: CircuitState;
  timestamp: Date;
}

interface CircuitAggregates {
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  averageResponseTime: number;
  lastReset: Date;
}