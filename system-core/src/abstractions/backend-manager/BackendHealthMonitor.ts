/**
 * Backend Health Monitor
 * Monitors health and performance of all backend services
 */

import { EventEmitter } from 'events';
import {
  BackendProvider,
  BackendHealthStatus,
  ServiceHealth,
  HealthMetrics,
  PerformanceMetrics
} from './types';
import { UnifiedDatabaseService } from '../database/UnifiedDatabaseService';
import { UnifiedAuthService } from '../auth/UnifiedAuthService';
import { UnifiedStorageService } from '../storage/UnifiedStorageService';
import { UnifiedRealTimeService } from '../realtime/UnifiedRealTimeService';
import { UnifiedEdgeFunctionService } from '../edge-functions/UnifiedEdgeFunctionService';

export interface HealthMonitorOptions {
  interval?: number;
  enabled?: boolean;
  enableAlerting?: boolean;
  alertThresholds?: {
    responseTime: number;
    errorRate: number;
    availability: number;
  };
  retryAttempts?: number;
  timeout?: number;
}

export interface ServiceMap {
  database?: UnifiedDatabaseService;
  auth?: UnifiedAuthService;
  storage?: UnifiedStorageService;
  realtime?: UnifiedRealTimeService;
  edgeFunctions?: UnifiedEdgeFunctionService;
}

export class BackendHealthMonitor extends EventEmitter {
  private options: Required<HealthMonitorOptions>;
  private monitoringInterval?: NodeJS.Timeout;
  private services: ServiceMap = {};
  private healthHistory = new Map<string, ServiceHealth[]>();
  private lastHealthCheck = new Map<string, Date>();
  private alertsEnabled = true;
  private isRunning = false;
  
  // Metrics tracking
  private metricsBuffer = new Map<string, PerformanceMetrics[]>();
  private readonly MAX_HISTORY_SIZE = 100;
  private readonly METRICS_BUFFER_SIZE = 50;

  constructor(options: HealthMonitorOptions = {}) {
    super();
    
    this.options = {
      interval: options.interval ?? 30000, // 30 seconds
      enabled: options.enabled ?? true,
      enableAlerting: options.enableAlerting ?? true,
      alertThresholds: options.alertThresholds ?? {
        responseTime: 1000, // 1 second
        errorRate: 0.05, // 5%
        availability: 0.99 // 99%
      },
      retryAttempts: options.retryAttempts ?? 3,
      timeout: options.timeout ?? 10000 // 10 seconds
    };
    
    this.alertsEnabled = this.options.enableAlerting;
  }

  /**
   * Start health monitoring
   */
  async start(services: ServiceMap): Promise<void> {
    if (this.isRunning) {
      throw new Error('Health monitor is already running');
    }
    
    this.services = services;
    this.isRunning = true;
    
    if (this.options.enabled) {
      this.emit('monitor:started');
      
      // Perform initial health check
      await this.performHealthCheck();
      
      // Start periodic monitoring
      this.monitoringInterval = setInterval(async () => {
        try {
          await this.performHealthCheck();
        } catch (error) {
          this.emit('monitor:error', { error });
        }
      }, this.options.interval);
    }
  }

  /**
   * Stop health monitoring
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }
    
    this.isRunning = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    this.emit('monitor:stopped');
  }

  /**
   * Get overall health status
   */
  async getOverallHealth(): Promise<BackendHealthStatus> {
    const serviceHealthMap: Record<string, ServiceHealth> = {};
    const errors: string[] = [];
    let totalResponseTime = 0;
    let healthyServices = 0;
    let totalServices = 0;
    
    // Check each service
    for (const [serviceName, service] of Object.entries(this.services)) {
      if (!service) continue;
      
      totalServices++;
      
      try {
        const health = await this.checkServiceHealth(serviceName, service);
        serviceHealthMap[serviceName] = health;
        
        if (health.status === 'healthy') {
          healthyServices++;
        }
        
        totalResponseTime += health.responseTime;
        
        if (health.lastError) {
          errors.push(`${serviceName}: ${health.lastError}`);
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${serviceName}: ${errorMessage}`);
        
        serviceHealthMap[serviceName] = {
          status: 'unhealthy',
          responseTime: 0,
          errorRate: 1,
          lastError: errorMessage
        };
      }
    }
    
    // Calculate overall status
    const availability = totalServices > 0 ? healthyServices / totalServices : 0;
    const avgResponseTime = totalServices > 0 ? totalResponseTime / totalServices : 0;
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (availability >= this.options.alertThresholds.availability) {
      overallStatus = 'healthy';
    } else if (availability >= 0.5) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }
    
    const health: BackendHealthStatus = {
      status: overallStatus,
      lastChecked: new Date(),
      responseTime: avgResponseTime,
      errors: errors.length > 0 ? errors : undefined,
      services: serviceHealthMap,
      metrics: {
        uptime: this.calculateUptime(),
        avgResponseTime,
        requestCount: this.getTotalRequestCount(),
        errorCount: errors.length,
        dataIntegrity: this.calculateDataIntegrity(),
        performanceScore: this.calculatePerformanceScore(availability, avgResponseTime)
      }
    };
    
    return health;
  }

  /**
   * Test health of a specific provider
   */
  async testProviderHealth(provider: BackendProvider): Promise<BackendHealthStatus> {
    const startTime = Date.now();
    const errors: string[] = [];
    
    try {
      // Test database connection
      if (provider.database) {
        await this.testDatabaseHealth(provider);
      }
      
      // Test auth service
      if (provider.auth) {
        await this.testAuthHealth(provider);
      }
      
      // Test storage service
      if (provider.storage) {
        await this.testStorageHealth(provider);
      }
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        lastChecked: new Date(),
        responseTime,
        errors: errors.length > 0 ? errors : undefined
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        status: 'unhealthy',
        lastChecked: new Date(),
        responseTime,
        errors: [errorMessage]
      };
    }
  }

  /**
   * Get health history for a service
   */
  getHealthHistory(serviceName: string): ServiceHealth[] {
    return this.healthHistory.get(serviceName) || [];
  }

  /**
   * Get performance metrics for a service
   */
  getPerformanceMetrics(serviceName: string): PerformanceMetrics[] {
    return this.metricsBuffer.get(serviceName) || [];
  }

  /**
   * Enable or disable alerting
   */
  setAlertingEnabled(enabled: boolean): void {
    this.alertsEnabled = enabled;
  }

  /**
   * Update alert thresholds
   */
  updateAlertThresholds(thresholds: Partial<HealthMonitorOptions['alertThresholds']>): void {
    Object.assign(this.options.alertThresholds, thresholds);
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats(): {
    isRunning: boolean;
    servicesMonitored: number;
    lastCheckTime: Date | null;
    totalChecks: number;
    averageResponseTime: number;
    errorRate: number;
  } {
    const lastChecks = Array.from(this.lastHealthCheck.values());
    const lastCheckTime = lastChecks.length > 0 ? new Date(Math.max(...lastChecks.map(d => d.getTime()))) : null;
    
    return {
      isRunning: this.isRunning,
      servicesMonitored: Object.keys(this.services).length,
      lastCheckTime,
      totalChecks: this.getTotalChecks(),
      averageResponseTime: this.getAverageResponseTime(),
      errorRate: this.getErrorRate()
    };
  }

  private async performHealthCheck(): Promise<void> {
    const checkStartTime = Date.now();
    
    try {
      const overallHealth = await this.getOverallHealth();
      
      // Store health history
      this.storeHealthHistory(overallHealth);
      
      // Check for alerts
      if (this.alertsEnabled) {
        await this.checkAlerts(overallHealth);
      }
      
      // Emit health change events
      this.emit('health:checked', {
        health: overallHealth,
        checkDuration: Date.now() - checkStartTime
      });
      
      // Check if health status changed
      await this.detectHealthChanges(overallHealth);
      
    } catch (error) {
      this.emit('health:check:failed', { error });
    }
  }

  private async checkServiceHealth(serviceName: string, service: any): Promise<ServiceHealth> {
    const startTime = Date.now();
    let errorRate = 0;
    let lastError: string | undefined;
    
    try {
      // Perform health check based on service type
      if (service.ping) {
        const isHealthy = await Promise.race([
          service.ping(),
          new Promise<boolean>((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), this.options.timeout)
          )
        ]);
        
        if (!isHealthy) {
          throw new Error('Service ping failed');
        }
      } else if (service.isConnected) {
        const isConnected = service.isConnected();
        if (!isConnected) {
          throw new Error('Service not connected');
        }
      }
      
      // Get error rate from service stats if available
      if (service.getStats) {
        const stats = service.getStats();
        if (stats && stats.errorCount && stats.queryCount) {
          errorRate = stats.errorCount / stats.queryCount;
        }
      }
      
      const responseTime = Date.now() - startTime;
      
      const health: ServiceHealth = {
        status: this.determineHealthStatus(responseTime, errorRate),
        responseTime,
        errorRate,
        lastError
      };
      
      // Update last check time
      this.lastHealthCheck.set(serviceName, new Date());
      
      // Store metrics
      this.storeMetrics(serviceName, {
        avgResponseTime: responseTime,
        queryLatency: responseTime,
        throughput: 0, // Would need to calculate from service stats
        errorRate,
        availability: health.status === 'healthy' ? 1 : 0
      });
      
      return health;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      lastError = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        status: 'unhealthy',
        responseTime,
        errorRate: 1,
        lastError
      };
    }
  }

  private determineHealthStatus(
    responseTime: number, 
    errorRate: number
  ): 'healthy' | 'degraded' | 'unhealthy' {
    if (errorRate > this.options.alertThresholds.errorRate) {
      return 'unhealthy';
    }
    
    if (responseTime > this.options.alertThresholds.responseTime * 2) {
      return 'unhealthy';
    }
    
    if (responseTime > this.options.alertThresholds.responseTime) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  private async testDatabaseHealth(provider: BackendProvider): Promise<void> {
    // Test database connectivity - implementation would depend on provider type
    // For now, this is a placeholder
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  private async testAuthHealth(provider: BackendProvider): Promise<void> {
    // Test auth service connectivity - implementation would depend on provider type
    // For now, this is a placeholder
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  private async testStorageHealth(provider: BackendProvider): Promise<void> {
    // Test storage service connectivity - implementation would depend on provider type
    // For now, this is a placeholder
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  private storeHealthHistory(health: BackendHealthStatus): void {
    if (!health.services) return;
    
    for (const [serviceName, serviceHealth] of Object.entries(health.services)) {
      let history = this.healthHistory.get(serviceName) || [];
      history.push(serviceHealth);
      
      // Keep only the latest entries
      if (history.length > this.MAX_HISTORY_SIZE) {
        history = history.slice(-this.MAX_HISTORY_SIZE);
      }
      
      this.healthHistory.set(serviceName, history);
    }
  }

  private storeMetrics(serviceName: string, metrics: PerformanceMetrics): void {
    let buffer = this.metricsBuffer.get(serviceName) || [];
    buffer.push(metrics);
    
    // Keep only the latest metrics
    if (buffer.length > this.METRICS_BUFFER_SIZE) {
      buffer = buffer.slice(-this.METRICS_BUFFER_SIZE);
    }
    
    this.metricsBuffer.set(serviceName, buffer);
  }

  private async checkAlerts(health: BackendHealthStatus): Promise<void> {
    const { metrics } = health;
    if (!metrics) return;
    
    // Check response time alert
    if (metrics.avgResponseTime > this.options.alertThresholds.responseTime) {
      this.emit('alert:response_time', {
        threshold: this.options.alertThresholds.responseTime,
        actual: metrics.avgResponseTime,
        severity: metrics.avgResponseTime > this.options.alertThresholds.responseTime * 2 ? 'critical' : 'warning'
      });
    }
    
    // Check error rate alert
    const currentErrorRate = metrics.errorCount / (metrics.requestCount || 1);
    if (currentErrorRate > this.options.alertThresholds.errorRate) {
      this.emit('alert:error_rate', {
        threshold: this.options.alertThresholds.errorRate,
        actual: currentErrorRate,
        severity: currentErrorRate > this.options.alertThresholds.errorRate * 2 ? 'critical' : 'warning'
      });
    }
    
    // Check availability alert
    const availability = this.calculateCurrentAvailability();
    if (availability < this.options.alertThresholds.availability) {
      this.emit('alert:availability', {
        threshold: this.options.alertThresholds.availability,
        actual: availability,
        severity: availability < 0.5 ? 'critical' : 'warning'
      });
    }
  }

  private async detectHealthChanges(currentHealth: BackendHealthStatus): Promise<void> {
    // This would compare with previous health status and emit change events
    // Implementation would track previous status and detect changes
    this.emit('health:changed', { health: currentHealth });
    
    if (currentHealth.status === 'degraded' || currentHealth.status === 'unhealthy') {
      this.emit('health:degraded', { health: currentHealth });
    }
  }

  private calculateUptime(): number {
    // Calculate uptime based on health history
    // For now, return a placeholder value
    return 0.99;
  }

  private getTotalRequestCount(): number {
    // Sum request counts from all services
    let total = 0;
    for (const [serviceName, service] of Object.entries(this.services)) {
      if (service && service.getStats) {
        const stats = service.getStats();
        if (stats && stats.queryCount) {
          total += stats.queryCount;
        }
      }
    }
    return total;
  }

  private calculateDataIntegrity(): number {
    // Calculate data integrity score
    // For now, return a placeholder value
    return 1.0;
  }

  private calculatePerformanceScore(availability: number, avgResponseTime: number): number {
    // Calculate overall performance score
    const responseScore = Math.max(0, 1 - (avgResponseTime / this.options.alertThresholds.responseTime));
    return (availability + responseScore) / 2;
  }

  private getTotalChecks(): number {
    return this.lastHealthCheck.size;
  }

  private getAverageResponseTime(): number {
    const allMetrics = Array.from(this.metricsBuffer.values()).flat();
    if (allMetrics.length === 0) return 0;
    
    const sum = allMetrics.reduce((acc, metric) => acc + metric.avgResponseTime, 0);
    return sum / allMetrics.length;
  }

  private getErrorRate(): number {
    const allMetrics = Array.from(this.metricsBuffer.values()).flat();
    if (allMetrics.length === 0) return 0;
    
    const sum = allMetrics.reduce((acc, metric) => acc + metric.errorRate, 0);
    return sum / allMetrics.length;
  }

  private calculateCurrentAvailability(): number {
    const healthHistories = Array.from(this.healthHistory.values());
    if (healthHistories.length === 0) return 1;
    
    let totalChecks = 0;
    let healthyChecks = 0;
    
    for (const history of healthHistories) {
      totalChecks += history.length;
      healthyChecks += history.filter(h => h.status === 'healthy').length;
    }
    
    return totalChecks > 0 ? healthyChecks / totalChecks : 1;
  }
}
