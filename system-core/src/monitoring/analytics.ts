/**
 * Main analytics service providing high-level monitoring and analytics functionality
 * This is the primary interface applications should use
 */

import {
  MonitoringBackend,
  MonitoringConfig,
  LogEntry,
  PerformanceMetric,
  AnalyticsQuery,
  AnalyticsResult,
  EventType,
  LogLevel,
  MetricType,
  AnomalyDetectionConfig,
  Alert,
  PredictionRequest,
  SystemHealth
} from './types';
import { SupabaseMonitoringBackend } from './backends/supabase';

export class AnalyticsService {
  private backend: MonitoringBackend;
  private config: MonitoringConfig;
  private alertRules: Map<string, AnomalyDetectionConfig> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config: MonitoringConfig) {
    this.config = config;
    this.backend = this.createBackend(config);
  }

  /**
   * Initialize the analytics service
   */
  async initialize(): Promise<void> {
    await this.backend.initialize();
    
    // Set up automatic system health monitoring
    if (this.config.features?.enableSystemHealth) {
      this.startHealthMonitoring();
    }
    
    // Set up automatic anomaly detection
    if (this.config.features?.enableAnomalyDetection) {
      await this.setupDefaultAnomalyRules();
    }
  }

  /**
   * Destroy the service and cleanup resources
   */
  async destroy(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    await this.backend.destroy();
  }

  // === LOGGING METHODS ===

  /**
   * Log an AI agent start event
   */
  async logAgentStart(agentId: string, context: {
    userId?: string;
    sessionId?: string;
    requestId?: string;
    modelName?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: LogLevel.INFO,
      eventType: EventType.AGENT_START,
      message: `Agent ${agentId} started`,
      agentId,
      ...context
    };
    
    await this.backend.log(entry);
  }

  /**
   * Log an AI agent completion event
   */
  async logAgentComplete(agentId: string, context: {
    userId?: string;
    sessionId?: string;
    requestId?: string;
    duration?: number;
    tokenCount?: number;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: LogLevel.INFO,
      eventType: EventType.AGENT_COMPLETE,
      message: `Agent ${agentId} completed successfully`,
      agentId,
      ...context
    };
    
    await this.backend.log(entry);
    
    // Track completion metrics
    if (context.duration) {
      await this.trackMetric({
        name: 'agent_duration',
        value: context.duration,
        unit: 'ms',
        agentId,
        metricType: MetricType.TIMER
      });
    }
    
    if (context.tokenCount) {
      await this.trackMetric({
        name: 'agent_tokens',
        value: context.tokenCount,
        unit: 'tokens',
        agentId,
        metricType: MetricType.COUNTER
      });
    }
  }

  /**
   * Log an AI agent error event
   */
  async logAgentError(agentId: string, error: Error, context: {
    userId?: string;
    sessionId?: string;
    requestId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: LogLevel.ERROR,
      eventType: EventType.AGENT_ERROR,
      message: `Agent ${agentId} encountered an error: ${error.message}`,
      agentId,
      error: {
        code: error.name,
        stack: error.stack,
        details: { message: error.message }
      },
      ...context
    };
    
    await this.backend.log(entry);
    
    // Create alert for critical errors
    if (error.name === 'CriticalError') {
      await this.createAlert({
        title: `Critical Agent Error`,
        description: `Agent ${agentId} encountered a critical error: ${error.message}`,
        severity: 'critical',
        source: 'agent_monitoring',
        condition: {
          metric: 'agent_errors',
          threshold: 1,
          operator: 'gte'
        },
        status: 'active'
      });
    }
  }

  /**
   * Log tool usage by an AI agent
   */
  async logToolUse(agentId: string, toolName: string, context: {
    userId?: string;
    sessionId?: string;
    duration?: number;
    success: boolean;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: context.success ? LogLevel.INFO : LogLevel.WARN,
      eventType: EventType.AGENT_TOOL_USE,
      message: `Agent ${agentId} used tool ${toolName}: ${context.success ? 'success' : 'failed'}`,
      agentId,
      duration: context.duration,
      metadata: {
        toolName,
        success: context.success,
        ...context.metadata
      }
    };
    
    await this.backend.log(entry);
    
    // Track tool usage metrics
    await this.trackMetric({
      name: 'tool_usage',
      value: 1,
      agentId,
      metricType: MetricType.COUNTER,
      dimensions: {
        toolName,
        success: context.success.toString()
      }
    });
  }

  // === PERFORMANCE TRACKING ===

  /**
   * Track a performance metric
   */
  async trackMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>): Promise<void> {
    const fullMetric: PerformanceMetric = {
      timestamp: new Date(),
      ...metric
    };
    
    await this.backend.track(fullMetric);
  }

  /**
   * Track model inference performance
   */
  async trackModelInference(modelName: string, context: {
    duration: number;
    tokenCount?: number;
    inputTokens?: number;
    outputTokens?: number;
    agentId?: string;
    userId?: string;
    success: boolean;
    errorCode?: string;
  }): Promise<void> {
    // Log the inference event
    await this.backend.log({
      timestamp: new Date(),
      level: context.success ? LogLevel.INFO : LogLevel.ERROR,
      eventType: EventType.MODEL_INFERENCE,
      message: `Model ${modelName} inference ${context.success ? 'completed' : 'failed'}`,
      modelName,
      duration: context.duration,
      tokenCount: context.tokenCount,
      agentId: context.agentId,
      userId: context.userId,
      metadata: {
        inputTokens: context.inputTokens,
        outputTokens: context.outputTokens,
        errorCode: context.errorCode
      }
    });
    
    // Track performance metrics
    const metrics: Array<Omit<PerformanceMetric, 'id' | 'timestamp'>> = [
      {
        name: 'model_latency',
        value: context.duration,
        unit: 'ms',
        metricType: MetricType.TIMER,
        modelName,
        agentId: context.agentId,
        dimensions: { success: context.success.toString() }
      }
    ];
    
    if (context.tokenCount) {
      metrics.push({
        name: 'model_tokens',
        value: context.tokenCount,
        unit: 'tokens',
        metricType: MetricType.COUNTER,
        modelName,
        agentId: context.agentId
      });
    }
    
    if (context.inputTokens) {
      metrics.push({
        name: 'model_input_tokens',
        value: context.inputTokens,
        unit: 'tokens',
        metricType: MetricType.COUNTER,
        modelName,
        agentId: context.agentId
      });
    }
    
    if (context.outputTokens) {
      metrics.push({
        name: 'model_output_tokens',
        value: context.outputTokens,
        unit: 'tokens',
        metricType: MetricType.COUNTER,
        modelName,
        agentId: context.agentId
      });
    }
    
    for (const metric of metrics) {
      await this.trackMetric(metric);
    }
  }

  /**
   * Track system resource usage
   */
  async trackSystemUsage(context: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage?: number;
    networkLatency?: number;
    activeConnections?: number;
  }): Promise<void> {
    const timestamp = new Date();
    
    const metrics: Array<Omit<PerformanceMetric, 'id' | 'timestamp'>> = [
      {
        name: 'cpu_usage',
        value: context.cpuUsage,
        unit: 'percent',
        metricType: MetricType.GAUGE,
        timestamp
      },
      {
        name: 'memory_usage',
        value: context.memoryUsage,
        unit: 'percent',
        metricType: MetricType.GAUGE,
        timestamp
      }
    ];
    
    if (context.diskUsage !== undefined) {
      metrics.push({
        name: 'disk_usage',
        value: context.diskUsage,
        unit: 'percent',
        metricType: MetricType.GAUGE,
        timestamp
      });
    }
    
    if (context.networkLatency !== undefined) {
      metrics.push({
        name: 'network_latency',
        value: context.networkLatency,
        unit: 'ms',
        metricType: MetricType.GAUGE,
        timestamp
      });
    }
    
    if (context.activeConnections !== undefined) {
      metrics.push({
        name: 'active_connections',
        value: context.activeConnections,
        unit: 'count',
        metricType: MetricType.GAUGE,
        timestamp
      });
    }
    
    await this.backend.trackBatch(metrics.map(m => ({ timestamp, ...m })));
  }

  // === ANALYTICS & QUERYING ===

  /**
   * Get analytics dashboard data
   */
  async getDashboardData(timeRange: { start: Date; end: Date }): Promise<{
    agentMetrics: {
      totalAgents: number;
      activeAgents: number;
      completionRate: number;
      averageDuration: number;
      errorRate: number;
    };
    modelMetrics: {
      totalInferences: number;
      averageLatency: number;
      tokenUsage: number;
      errorRate: number;
    };
    systemMetrics: {
      averageCpuUsage: number;
      averageMemoryUsage: number;
      uptime: number;
    };
    recentAnomalies: any[];
    activeAlerts: any[];
  }> {
    const [
      agentStats,
      modelStats,
      systemStats,
      anomalies,
      alerts
    ] = await Promise.all([
      this.getAgentMetrics(timeRange),
      this.getModelMetrics(timeRange),
      this.getSystemMetrics(timeRange),
      this.backend.getAnomalies(timeRange.start, timeRange.end),
      this.backend.getAlerts('active')
    ]);
    
    return {
      agentMetrics: agentStats,
      modelMetrics: modelStats,
      systemMetrics: systemStats,
      recentAnomalies: anomalies.slice(0, 10),
      activeAlerts: alerts
    };
  }

  /**
   * Generate predictions for a metric
   */
  async generatePrediction(request: PredictionRequest): Promise<any> {
    if (!this.config.features?.enablePredictions) {
      throw new Error('Predictions are disabled');
    }
    
    return await this.backend.generatePrediction(request);
  }

  /**
   * Run anomaly detection
   */
  async detectAnomalies(metric?: string): Promise<any[]> {
    if (!this.config.features?.enableAnomalyDetection) {
      return [];
    }
    
    const anomalies = [];
    
    for (const [ruleName, config] of this.alertRules) {
      if (!metric || config.metric === metric) {
        const detected = await this.backend.detectAnomalies(config);
        anomalies.push(...detected);
      }
    }
    
    return anomalies;
  }

  /**
   * Create a custom alert
   */
  async createAlert(alert: Omit<Alert, 'id' | 'timestamp'>): Promise<Alert> {
    return await this.backend.createAlert(alert);
  }

  // === PRIVATE HELPER METHODS ===

  private createBackend(config: MonitoringConfig): MonitoringBackend {
    switch (config.backend) {
      case 'supabase':
        return new SupabaseMonitoringBackend(config as any);
      // Future backends can be added here
      // case 'mongodb':
      //   return new MongoDBMonitoringBackend(config);
      // case 'postgresql':
      //   return new PostgreSQLMonitoringBackend(config);
      default:
        throw new Error(`Unsupported backend: ${config.backend}`);
    }
  }

  private async getAgentMetrics(timeRange: { start: Date; end: Date }) {
    const agentQuery: AnalyticsQuery = {
      startTime: timeRange.start,
      endTime: timeRange.end,
      eventTypes: [EventType.AGENT_START, EventType.AGENT_COMPLETE, EventType.AGENT_ERROR],
      aggregations: [
        { field: 'agentId', function: 'count' },
        { field: 'duration', function: 'avg' }
      ]
    };
    
    const result = await this.backend.query(agentQuery);
    
    // Calculate metrics from the result
    const totalAgents = new Set(result.data.map((d: any) => d.agentId)).size;
    const completions = result.data.filter((d: any) => d.eventType === EventType.AGENT_COMPLETE).length;
    const starts = result.data.filter((d: any) => d.eventType === EventType.AGENT_START).length;
    const errors = result.data.filter((d: any) => d.eventType === EventType.AGENT_ERROR).length;
    
    return {
      totalAgents,
      activeAgents: starts - completions,
      completionRate: starts > 0 ? (completions / starts) * 100 : 0,
      averageDuration: result.aggregations?.duration || 0,
      errorRate: starts > 0 ? (errors / starts) * 100 : 0
    };
  }

  private async getModelMetrics(timeRange: { start: Date; end: Date }) {
    const modelQuery: AnalyticsQuery = {
      startTime: timeRange.start,
      endTime: timeRange.end,
      eventTypes: [EventType.MODEL_INFERENCE],
      aggregations: [
        { field: 'eventType', function: 'count' },
        { field: 'duration', function: 'avg' },
        { field: 'tokenCount', function: 'sum' }
      ]
    };
    
    const result = await this.backend.query(modelQuery);
    const errorCount = result.data.filter((d: any) => d.level === LogLevel.ERROR).length;
    
    return {
      totalInferences: result.aggregations?.eventType || 0,
      averageLatency: result.aggregations?.duration || 0,
      tokenUsage: result.aggregations?.tokenCount || 0,
      errorRate: result.data.length > 0 ? (errorCount / result.data.length) * 100 : 0
    };
  }

  private async getSystemMetrics(timeRange: { start: Date; end: Date }) {
    const systemQuery: AnalyticsQuery = {
      startTime: timeRange.start,
      endTime: timeRange.end,
      aggregations: [
        { field: 'cpuUsage', function: 'avg' },
        { field: 'memoryUsage', function: 'avg' }
      ]
    };
    
    const result = await this.backend.query(systemQuery);
    
    return {
      averageCpuUsage: result.aggregations?.cpuUsage || 0,
      averageMemoryUsage: result.aggregations?.memoryUsage || 0,
      uptime: Date.now() - timeRange.start.getTime()
    };
  }

  private startHealthMonitoring(): void {
    // Check system health every 5 minutes
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.backend.getSystemHealth();
        await this.backend.updateSystemHealth(health);
        
        // Create alerts for unhealthy components
        if (health.overall === 'unhealthy') {
          await this.createAlert({
            title: 'System Health Critical',
            description: 'System health has degraded to critical levels',
            severity: 'critical',
            source: 'system_health',
            condition: {
              metric: 'system_health',
              threshold: 1,
              operator: 'eq'
            },
            status: 'active'
          });
        }
      } catch (error) {
        console.error('Error during health check:', error);
      }
    }, 5 * 60 * 1000);
  }

  private async setupDefaultAnomalyRules(): Promise<void> {
    // Default anomaly detection rules
    const defaultRules: AnomalyDetectionConfig[] = [
      {
        metric: 'model_latency',
        sensitivity: 'medium',
        lookbackPeriod: 60,
        minDataPoints: 10,
        algorithm: 'statistical'
      },
      {
        metric: 'cpu_usage',
        threshold: 90,
        sensitivity: 'high',
        lookbackPeriod: 30,
        minDataPoints: 5,
        algorithm: 'threshold'
      },
      {
        metric: 'memory_usage',
        threshold: 85,
        sensitivity: 'high',
        lookbackPeriod: 30,
        minDataPoints: 5,
        algorithm: 'threshold'
      }
    ];
    
    for (const rule of defaultRules) {
      this.alertRules.set(rule.metric, rule);
    }
  }
}

// Export factory function for easy setup
export function createAnalyticsService(config: MonitoringConfig): AnalyticsService {
  return new AnalyticsService(config);
}
