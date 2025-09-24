/**
 * Example integration of the Enhanced Monitoring and Analytics System
 * This demonstrates how to integrate the monitoring system into an existing AI application
 */

import { createAnalyticsService, LogLevel, EventType, MetricType } from './index';

// ========================================================================
// 1. SETUP AND INITIALIZATION
// ========================================================================

export class AIApplicationMonitoring {
  private analytics: any;
  private initialized = false;

  constructor() {
    // Initialize the analytics service
    this.analytics = createAnalyticsService({
      backend: 'supabase',
      connection: {
        url: process.env.SUPABASE_URL!,
        apiKey: process.env.SUPABASE_SERVICE_ROLE_KEY!
      },
      features: {
        enableAnomalyDetection: true,
        enablePredictions: true,
        enableSystemHealth: true,
        retentionDays: 30
      },
      batchSize: 50, // Smaller batch for demo
      flushInterval: 3000 // 3 seconds for demo
    });
  }

  async initialize() {
    try {
      await this.analytics.initialize();
      this.initialized = true;
      console.log('✅ Monitoring system initialized successfully');
      
      // Start background monitoring
      this.startBackgroundMonitoring();
    } catch (error) {
      console.error('❌ Failed to initialize monitoring:', error);
      throw error;
    }
  }

  async destroy() {
    if (this.initialized) {
      await this.analytics.destroy();
      console.log('✅ Monitoring system shutdown complete');
    }
  }

  // ========================================================================
  // 2. AI AGENT MONITORING WRAPPER
  // ========================================================================

  /**
   * Wrapper function to monitor AI agent execution
   */
  async monitorAgent<T>(
    agentId: string,
    operation: () => Promise<T>,
    context: {
      userId?: string;
      sessionId?: string;
      modelName?: string;
      task?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      // Log agent start
      await this.analytics.logAgentStart(agentId, {
        userId: context.userId,
        sessionId: context.sessionId,
        modelName: context.modelName,
        metadata: {
          task: context.task,
          ...context.metadata
        }
      });

      // Execute the operation
      const result = await operation();
      
      // Log successful completion
      const duration = Date.now() - startTime;
      await this.analytics.logAgentComplete(agentId, {
        userId: context.userId,
        sessionId: context.sessionId,
        duration,
        metadata: {
          task: context.task,
          resultType: typeof result,
          ...context.metadata
        }
      });

      return result;
      
    } catch (error) {
      // Log error
      await this.analytics.logAgentError(agentId, error as Error, {
        userId: context.userId,
        sessionId: context.sessionId,
        metadata: {
          task: context.task,
          duration: Date.now() - startTime,
          ...context.metadata
        }
      });

      throw error;
    }
  }

  /**
   * Monitor model inference calls
   */
  async monitorModelInference<T>(
    modelName: string,
    inference: () => Promise<T>,
    context: {
      agentId?: string;
      userId?: string;
      expectedTokens?: number;
      metadata?: Record<string, any>;
    }
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await inference();
      const duration = Date.now() - startTime;
      
      // Extract token count if available in result
      let tokenCount = context.expectedTokens;
      if (result && typeof result === 'object' && 'tokenCount' in result) {
        tokenCount = (result as any).tokenCount;
      }

      await this.analytics.trackModelInference(modelName, {
        duration,
        tokenCount,
        agentId: context.agentId,
        userId: context.userId,
        success: true
      });

      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await this.analytics.trackModelInference(modelName, {
        duration,
        agentId: context.agentId,
        userId: context.userId,
        success: false,
        errorCode: (error as Error).name
      });

      throw error;
    }
  }

  // ========================================================================
  // 3. CUSTOM METRICS TRACKING
  // ========================================================================

  /**
   * Track custom business metrics
   */
  async trackBusinessMetric(name: string, value: number, context?: {
    unit?: string;
    agentId?: string;
    userId?: string;
    dimensions?: Record<string, string>;
    metadata?: Record<string, any>;
  }) {
    await this.analytics.trackMetric({
      name,
      value,
      unit: context?.unit,
      metricType: MetricType.GAUGE,
      agentId: context?.agentId,
      userId: context?.userId,
      dimensions: context?.dimensions,
      metadata: context?.metadata
    });
  }

  /**
   * Track API endpoint performance
   */
  async trackAPICall(endpoint: string, method: string, statusCode: number, duration: number, context?: {
    userId?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }) {
    // Track response time
    await this.analytics.trackMetric({
      name: 'api_response_time',
      value: duration,
      unit: 'ms',
      metricType: MetricType.TIMER,
      userId: context?.userId,
      dimensions: {
        endpoint,
        method,
        statusCode: statusCode.toString()
      },
      metadata: context?.metadata
    });

    // Track API call count
    await this.analytics.trackMetric({
      name: 'api_calls',
      value: 1,
      metricType: MetricType.COUNTER,
      userId: context?.userId,
      dimensions: {
        endpoint,
        method,
        statusCode: statusCode.toString()
      }
    });

    // Log API call
    await this.analytics.backend.log({
      timestamp: new Date(),
      level: statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO,
      eventType: EventType.API_REQUEST,
      message: `${method} ${endpoint} - ${statusCode}`,
      duration,
      userId: context?.userId,
      metadata: {
        endpoint,
        method,
        statusCode,
        userAgent: context?.userAgent,
        ...context?.metadata
      }
    });
  }

  // ========================================================================
  // 4. DASHBOARD AND ANALYTICS
  // ========================================================================

  /**
   * Get comprehensive analytics dashboard
   */
  async getDashboard(timeRange?: { start: Date; end: Date }) {
    const range = timeRange || {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      end: new Date()
    };

    return await this.analytics.getDashboardData(range);
  }

  /**
   * Get agent performance report
   */
  async getAgentReport(agentId?: string, timeRange?: { start: Date; end: Date }) {
    const range = timeRange || {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      end: new Date()
    };

    const query = {
      startTime: range.start,
      endTime: range.end,
      ...(agentId && { agentIds: [agentId] }),
      aggregations: [
        { field: 'duration', function: 'avg' as const },
        { field: 'duration', function: 'max' as const },
        { field: 'tokenCount', function: 'sum' as const }
      ]
    };

    const result = await this.analytics.backend.query(query);
    
    return {
      totalEvents: result.data.length,
      averageDuration: result.aggregations?.duration || 0,
      maxDuration: result.aggregations?.duration || 0,
      totalTokens: result.aggregations?.tokenCount || 0,
      errorRate: this.calculateErrorRate(result.data),
      data: result.data
    };
  }

  /**
   * Get system health summary
   */
  async getSystemHealth() {
    return await this.analytics.backend.getSystemHealth();
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts() {
    return await this.analytics.backend.getAlerts('active');
  }

  // ========================================================================
  // 5. ALERT MANAGEMENT
  // ========================================================================

  /**
   * Create custom alert
   */
  async createCustomAlert(config: {
    title: string;
    description: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    metric: string;
    threshold: number;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    metadata?: Record<string, any>;
  }) {
    return await this.analytics.createAlert({
      title: config.title,
      description: config.description,
      severity: config.severity,
      source: 'custom_alert',
      condition: {
        metric: config.metric,
        threshold: config.threshold,
        operator: config.operator
      },
      status: 'active',
      metadata: config.metadata
    });
  }

  // ========================================================================
  // 6. BACKGROUND MONITORING
  // ========================================================================

  private startBackgroundMonitoring() {
    // Monitor system resources every 30 seconds
    setInterval(async () => {
      try {
        await this.collectSystemMetrics();
      } catch (error) {
        console.error('Error collecting system metrics:', error);
      }
    }, 30000);

    // Run anomaly detection every 5 minutes
    setInterval(async () => {
      try {
        await this.runAnomalyDetection();
      } catch (error) {
        console.error('Error running anomaly detection:', error);
      }
    }, 5 * 60000);

    // Health check every 2 minutes
    setInterval(async () => {
      try {
        const health = await this.analytics.backend.getSystemHealth();
        await this.analytics.backend.updateSystemHealth(health);
      } catch (error) {
        console.error('Error updating system health:', error);
      }
    }, 2 * 60000);
  }

  private async collectSystemMetrics() {
    // Get system resource usage
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    await this.analytics.trackSystemUsage({
      cpuUsage: ((cpuUsage.user + cpuUsage.system) / 1000000) % 100,
      memoryUsage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      activeConnections: 0 // Would need to track actual connections
    });
  }

  private async runAnomalyDetection() {
    const anomalies = await this.analytics.detectAnomalies();
    
    for (const anomaly of anomalies) {
      if (anomaly.severity === 'critical' || anomaly.severity === 'high') {
        await this.analytics.createAlert({
          title: `Anomaly Detected: ${anomaly.metric}`,
          description: anomaly.description,
          severity: anomaly.severity === 'critical' ? 'critical' : 'warning',
          source: 'anomaly_detection',
          condition: {
            metric: anomaly.metric,
            threshold: anomaly.value,
            operator: 'eq'
          },
          status: 'active',
          metadata: {
            anomalyId: anomaly.id,
            confidence: anomaly.confidence,
            expectedValue: anomaly.expectedValue
          }
        });
      }
    }
  }

  // ========================================================================
  // 7. UTILITY METHODS
  // ========================================================================

  private calculateErrorRate(data: any[]): number {
    if (data.length === 0) return 0;
    const errors = data.filter(item => 
      item.level === LogLevel.ERROR || item.level === LogLevel.CRITICAL
    ).length;
    return (errors / data.length) * 100;
  }
}

// ========================================================================
// 8. USAGE EXAMPLE
// ========================================================================

export async function exampleUsage() {
  // Initialize monitoring
  const monitoring = new AIApplicationMonitoring();
  await monitoring.initialize();

  try {
    // Example: Monitor an AI agent operation
    const result = await monitoring.monitorAgent(
      'document-analyzer-v1',
      async () => {
        // Simulate AI agent work
        await new Promise(resolve => setTimeout(resolve, 1500));
        return { processed: 5, status: 'completed' };
      },
      {
        userId: 'user-123',
        sessionId: 'session-456',
        modelName: 'gpt-4',
        task: 'document_analysis',
        metadata: { documentType: 'pdf', pages: 10 }
      }
    );

    // Example: Monitor model inference
    const inferenceResult = await monitoring.monitorModelInference(
      'gpt-4',
      async () => {
        // Simulate model call
        await new Promise(resolve => setTimeout(resolve, 800));
        return { text: 'Generated response', tokenCount: 150 };
      },
      {
        agentId: 'document-analyzer-v1',
        userId: 'user-123',
        expectedTokens: 150
      }
    );

    // Example: Track custom business metrics
    await monitoring.trackBusinessMetric('documents_processed', 5, {
      unit: 'count',
      agentId: 'document-analyzer-v1',
      dimensions: { documentType: 'pdf', complexity: 'high' }
    });

    // Example: Get dashboard data
    const dashboard = await monitoring.getDashboard();
    console.log('Dashboard data:', {
      activeAgents: dashboard.agentMetrics.activeAgents,
      completionRate: dashboard.agentMetrics.completionRate,
      averageLatency: dashboard.modelMetrics.averageLatency,
      systemHealth: dashboard.systemMetrics.averageCpuUsage
    });

    // Example: Create custom alert
    await monitoring.createCustomAlert({
      title: 'High Processing Time',
      description: 'Document processing time exceeded 10 seconds',
      severity: 'warning',
      metric: 'processing_time',
      threshold: 10000,
      operator: 'gt',
      metadata: { component: 'document-analyzer' }
    });

  } finally {
    // Clean shutdown
    await monitoring.destroy();
  }
}

// Example Express.js middleware integration
export function createMonitoringMiddleware(monitoring: AIApplicationMonitoring) {
  return async (req: any, res: any, next: any) => {
    const startTime = Date.now();
    
    // Capture response
    const originalSend = res.send;
    res.send = function(data: any) {
      const duration = Date.now() - startTime;
      
      // Track API call asynchronously
      monitoring.trackAPICall(
        req.path,
        req.method,
        res.statusCode,
        duration,
        {
          userId: req.user?.id,
          userAgent: req.get('User-Agent'),
          metadata: {
            ip: req.ip,
            contentLength: data?.length || 0
          }
        }
      ).catch(console.error);
      
      return originalSend.call(this, data);
    };
    
    next();
  };
}

// Export the main class
export default AIApplicationMonitoring;
