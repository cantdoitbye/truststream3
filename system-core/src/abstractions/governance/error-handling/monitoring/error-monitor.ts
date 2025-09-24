/**
 * TrustStream v4.2 - Error Monitor
 * Comprehensive error monitoring and alerting system
 */

import {
  IErrorMonitor,
  ErrorContext,
  ErrorMetrics,
  ErrorTrend,
  AlertPattern,
  AlertCondition,
  TimeRange,
  ErrorType,
  ErrorSeverity
} from '../core/interfaces';
import { Logger } from '../../../shared-utils/logger';
import { DatabaseInterface } from '../../../shared-utils/database-interface';
import { EventEmitter } from 'events';

/**
 * Comprehensive error monitoring system
 */
export class ErrorMonitor extends EventEmitter implements IErrorMonitor {
  private db: DatabaseInterface;
  private logger: Logger;
  private alertPatterns: Map<string, AlertPattern> = new Map();
  private alertCooldowns: Map<string, Date> = new Map();
  private metricsCollector: ErrorMetricsCollector;
  private trendAnalyzer: ErrorTrendAnalyzer;
  private alertManager: AlertManager;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(
    db: DatabaseInterface,
    logger: Logger
  ) {
    super();
    this.db = db;
    this.logger = logger;
    this.metricsCollector = new ErrorMetricsCollector(db, logger);
    this.trendAnalyzer = new ErrorTrendAnalyzer(db, logger);
    this.alertManager = new AlertManager(logger);
    
    this.startMonitoring();
  }

  /**
   * Record an error occurrence
   */
  async recordError(error: ErrorContext): Promise<void> {
    this.logger.debug(`Recording error: ${error.error_id}`, {
      agent_id: error.agent_id,
      agent_type: error.agent_type
    });

    try {
      // Store error in database
      await this.storeError(error);
      
      // Update metrics
      await this.metricsCollector.recordError(error);
      
      // Check alert patterns
      await this.checkAlertPatterns(error);
      
      this.emit('error_recorded', error);
      
    } catch (recordingError) {
      this.logger.error('Failed to record error', {
        error_id: error.error_id,
        error: recordingError.message
      });
    }
  }

  /**
   * Get error metrics for a time range
   */
  async getErrorMetrics(timeRange: TimeRange): Promise<ErrorMetrics> {
    return await this.metricsCollector.getMetrics(timeRange);
  }

  /**
   * Get error trends
   */
  async getErrorTrends(agentId?: string): Promise<ErrorTrend[]> {
    return await this.trendAnalyzer.analyzeTrends(agentId);
  }

  /**
   * Configure alert patterns
   */
  async alertOnPatterns(patterns: AlertPattern[]): Promise<void> {
    this.logger.info(`Configuring ${patterns.length} alert patterns`);
    
    for (const pattern of patterns) {
      this.alertPatterns.set(pattern.pattern_id, pattern);
      await this.storeAlertPattern(pattern);
    }
    
    this.emit('alert_patterns_updated', patterns);
  }

  /**
   * Store error in database
   */
  private async storeError(error: ErrorContext): Promise<void> {
    try {
      const query = `
        INSERT INTO error_contexts (
          error_id, agent_id, agent_type, timestamp, session_id,
          task_id, user_id, community_id, request_id, correlation_id,
          stack_trace, environment, metadata, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()
        )
        ON CONFLICT (error_id) DO UPDATE SET
          updated_at = NOW()
      `;
      
      const params = [
        error.error_id,
        error.agent_id,
        error.agent_type,
        error.timestamp,
        error.session_id,
        error.task_id,
        error.user_id,
        error.community_id,
        error.request_id,
        error.correlation_id,
        error.stack_trace,
        JSON.stringify(error.environment),
        JSON.stringify(error.metadata)
      ];
      
      await this.db.query(query, params);
      
    } catch (dbError) {
      this.logger.warn('Failed to store error in database', {
        error_id: error.error_id,
        error: dbError.message
      });
    }
  }

  /**
   * Store alert pattern in database
   */
  private async storeAlertPattern(pattern: AlertPattern): Promise<void> {
    try {
      const query = `
        INSERT INTO alert_patterns (
          pattern_id, name, description, conditions, severity,
          notification_channels, cooldown_period_ms, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (pattern_id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          conditions = EXCLUDED.conditions,
          severity = EXCLUDED.severity,
          notification_channels = EXCLUDED.notification_channels,
          cooldown_period_ms = EXCLUDED.cooldown_period_ms,
          updated_at = NOW()
      `;
      
      const params = [
        pattern.pattern_id,
        pattern.name,
        pattern.description,
        JSON.stringify(pattern.conditions),
        pattern.severity,
        JSON.stringify(pattern.notification_channels),
        pattern.cooldown_period_ms
      ];
      
      await this.db.query(query, params);
      
    } catch (dbError) {
      this.logger.warn('Failed to store alert pattern', {
        pattern_id: pattern.pattern_id,
        error: dbError.message
      });
    }
  }

  /**
   * Check if error triggers any alert patterns
   */
  private async checkAlertPatterns(error: ErrorContext): Promise<void> {
    for (const [patternId, pattern] of this.alertPatterns) {
      try {
        // Check cooldown
        if (this.isPatternInCooldown(patternId)) {
          continue;
        }
        
        // Check if pattern conditions are met
        const triggered = await this.evaluateAlertPattern(pattern, error);
        
        if (triggered) {
          await this.triggerAlert(pattern, error);
          
          // Set cooldown
          this.alertCooldowns.set(
            patternId,
            new Date(Date.now() + pattern.cooldown_period_ms)
          );
        }
        
      } catch (patternError) {
        this.logger.error('Error evaluating alert pattern', {
          pattern_id: patternId,
          error: patternError.message
        });
      }
    }
  }

  /**
   * Check if alert pattern is in cooldown period
   */
  private isPatternInCooldown(patternId: string): boolean {
    const cooldownEnd = this.alertCooldowns.get(patternId);
    if (!cooldownEnd) {
      return false;
    }
    
    return Date.now() < cooldownEnd.getTime();
  }

  /**
   * Evaluate if alert pattern conditions are met
   */
  private async evaluateAlertPattern(
    pattern: AlertPattern,
    error: ErrorContext
  ): Promise<boolean> {
    for (const condition of pattern.conditions) {
      const conditionMet = await this.evaluateAlertCondition(condition, error);
      
      if (!conditionMet) {
        return false; // All conditions must be met
      }
    }
    
    return true;
  }

  /**
   * Evaluate individual alert condition
   */
  private async evaluateAlertCondition(
    condition: AlertCondition,
    error: ErrorContext
  ): Promise<boolean> {
    const metricValue = await this.getMetricValue(
      condition.metric,
      condition.window_size_ms,
      error
    );
    
    switch (condition.operator) {
      case 'gt':
        return metricValue > condition.threshold;
      case 'gte':
        return metricValue >= condition.threshold;
      case 'lt':
        return metricValue < condition.threshold;
      case 'lte':
        return metricValue <= condition.threshold;
      case 'eq':
        return metricValue === condition.threshold;
      default:
        return false;
    }
  }

  /**
   * Get metric value for alert evaluation
   */
  private async getMetricValue(
    metric: string,
    windowSizeMs: number,
    error: ErrorContext
  ): Promise<number> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - windowSizeMs);
    
    try {
      switch (metric) {
        case 'error_rate':
          return await this.calculateErrorRate(startTime, endTime, error.agent_id);
          
        case 'error_count':
          return await this.calculateErrorCount(startTime, endTime, error.agent_id);
          
        case 'critical_error_count':
          return await this.calculateCriticalErrorCount(startTime, endTime, error.agent_id);
          
        case 'response_time':
          return error.environment?.response_time || 0;
          
        case 'memory_usage':
          return error.environment?.memory_usage || 0;
          
        case 'cpu_usage':
          return error.environment?.cpu_usage || 0;
          
        default:
          this.logger.warn(`Unknown metric: ${metric}`);
          return 0;
      }
      
    } catch (metricError) {
      this.logger.error('Failed to get metric value', {
        metric,
        error: metricError.message
      });
      return 0;
    }
  }

  /**
   * Calculate error rate
   */
  private async calculateErrorRate(
    startTime: Date,
    endTime: Date,
    agentId: string
  ): Promise<number> {
    try {
      const query = `
        SELECT 
          COUNT(*) as error_count,
          COUNT(DISTINCT session_id) as total_sessions
        FROM error_contexts
        WHERE 
          agent_id = $1
          AND timestamp BETWEEN $2 AND $3
      `;
      
      const result = await this.db.query(query, [agentId, startTime, endTime]);
      const row = result.rows[0];
      
      if (row.total_sessions === 0) {
        return 0;
      }
      
      return (row.error_count / row.total_sessions) * 100;
      
    } catch (dbError) {
      this.logger.error('Failed to calculate error rate', {
        error: dbError.message
      });
      return 0;
    }
  }

  /**
   * Calculate error count
   */
  private async calculateErrorCount(
    startTime: Date,
    endTime: Date,
    agentId: string
  ): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as error_count
        FROM error_contexts
        WHERE 
          agent_id = $1
          AND timestamp BETWEEN $2 AND $3
      `;
      
      const result = await this.db.query(query, [agentId, startTime, endTime]);
      return parseInt(result.rows[0].error_count, 10) || 0;
      
    } catch (dbError) {
      this.logger.error('Failed to calculate error count', {
        error: dbError.message
      });
      return 0;
    }
  }

  /**
   * Calculate critical error count
   */
  private async calculateCriticalErrorCount(
    startTime: Date,
    endTime: Date,
    agentId: string
  ): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as critical_error_count
        FROM error_contexts ec
        JOIN error_classifications ecl ON ec.error_id = ecl.error_id
        WHERE 
          ec.agent_id = $1
          AND ec.timestamp BETWEEN $2 AND $3
          AND ecl.severity IN ('critical', 'emergency')
      `;
      
      const result = await this.db.query(query, [agentId, startTime, endTime]);
      return parseInt(result.rows[0].critical_error_count, 10) || 0;
      
    } catch (dbError) {
      this.logger.error('Failed to calculate critical error count', {
        error: dbError.message
      });
      return 0;
    }
  }

  /**
   * Trigger alert
   */
  private async triggerAlert(
    pattern: AlertPattern,
    error: ErrorContext
  ): Promise<void> {
    this.logger.warn(`Alert triggered: ${pattern.name}`, {
      pattern_id: pattern.pattern_id,
      error_id: error.error_id,
      severity: pattern.severity
    });

    const alert = {
      alert_id: `alert_${pattern.pattern_id}_${Date.now()}`,
      pattern_id: pattern.pattern_id,
      pattern_name: pattern.name,
      severity: pattern.severity,
      error_context: error,
      triggered_at: new Date(),
      description: pattern.description
    };

    // Send alert through configured channels
    await this.alertManager.sendAlert(alert, pattern.notification_channels);
    
    // Store alert in database
    await this.storeAlert(alert);
    
    this.emit('alert_triggered', alert);
  }

  /**
   * Store alert in database
   */
  private async storeAlert(alert: any): Promise<void> {
    try {
      const query = `
        INSERT INTO error_alerts (
          alert_id, pattern_id, pattern_name, severity,
          error_context, triggered_at, description, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `;
      
      const params = [
        alert.alert_id,
        alert.pattern_id,
        alert.pattern_name,
        alert.severity,
        JSON.stringify(alert.error_context),
        alert.triggered_at,
        alert.description
      ];
      
      await this.db.query(query, params);
      
    } catch (dbError) {
      this.logger.warn('Failed to store alert', {
        alert_id: alert.alert_id,
        error: dbError.message
      });
    }
  }

  /**
   * Start monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performPeriodicTasks();
      } catch (error) {
        this.logger.error('Monitoring task failed', {
          error: error.message
        });
      }
    }, 60000); // Run every minute
    
    this.logger.info('Error monitoring started');
  }

  /**
   * Perform periodic monitoring tasks
   */
  private async performPeriodicTasks(): Promise<void> {
    // Clean up old cooldowns
    const now = Date.now();
    for (const [patternId, cooldownEnd] of this.alertCooldowns) {
      if (now >= cooldownEnd.getTime()) {
        this.alertCooldowns.delete(patternId);
      }
    }
    
    // Update trend analysis
    await this.trendAnalyzer.updateTrends();
    
    // Check for system-wide patterns
    await this.checkSystemWidePatterns();
  }

  /**
   * Check for system-wide error patterns
   */
  private async checkSystemWidePatterns(): Promise<void> {
    try {
      // Check for error spikes across all agents
      const recentErrors = await this.getRecentErrorCount(300000); // Last 5 minutes
      
      if (recentErrors > 100) { // Threshold for error spike
        this.emit('error_spike_detected', {
          error_count: recentErrors,
          time_window: '5 minutes'
        });
      }
      
    } catch (error) {
      this.logger.error('Failed to check system-wide patterns', {
        error: error.message
      });
    }
  }

  /**
   * Get recent error count
   */
  private async getRecentErrorCount(windowMs: number): Promise<number> {
    const startTime = new Date(Date.now() - windowMs);
    const endTime = new Date();
    
    try {
      const query = `
        SELECT COUNT(*) as error_count
        FROM error_contexts
        WHERE timestamp BETWEEN $1 AND $2
      `;
      
      const result = await this.db.query(query, [startTime, endTime]);
      return parseInt(result.rows[0].error_count, 10) || 0;
      
    } catch (dbError) {
      this.logger.error('Failed to get recent error count', {
        error: dbError.message
      });
      return 0;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.removeAllListeners();
    this.logger.info('Error monitor destroyed');
  }
}

/**
 * Error metrics collector
 */
class ErrorMetricsCollector {
  private db: DatabaseInterface;
  private logger: Logger;

  constructor(db: DatabaseInterface, logger: Logger) {
    this.db = db;
    this.logger = logger;
  }

  /**
   * Record error for metrics
   */
  async recordError(error: ErrorContext): Promise<void> {
    // Metrics are calculated on-demand from the error_contexts table
    // This method could be used for caching or pre-aggregation if needed
  }

  /**
   * Get error metrics for time range
   */
  async getMetrics(timeRange: TimeRange): Promise<ErrorMetrics> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_errors,
          COUNT(DISTINCT ec.agent_id) as affected_agents,
          AVG(CASE WHEN ecl.severity = 'critical' THEN 1 ELSE 0 END) * 100 as critical_rate
        FROM error_contexts ec
        LEFT JOIN error_classifications ecl ON ec.error_id = ecl.error_id
        WHERE ec.timestamp BETWEEN $1 AND $2
      `;
      
      const result = await this.db.query(query, [timeRange.start, timeRange.end]);
      const row = result.rows[0];
      
      // Get error distribution by type
      const typeQuery = `
        SELECT ecl.error_type, COUNT(*) as count
        FROM error_contexts ec
        JOIN error_classifications ecl ON ec.error_id = ecl.error_id
        WHERE ec.timestamp BETWEEN $1 AND $2
        GROUP BY ecl.error_type
      `;
      
      const typeResult = await this.db.query(typeQuery, [timeRange.start, timeRange.end]);
      const errorsByType: Record<ErrorType, number> = {} as any;
      
      typeResult.rows.forEach((typeRow: any) => {
        errorsByType[typeRow.error_type as ErrorType] = parseInt(typeRow.count, 10);
      });
      
      // Get error distribution by severity
      const severityQuery = `
        SELECT ecl.severity, COUNT(*) as count
        FROM error_contexts ec
        JOIN error_classifications ecl ON ec.error_id = ecl.error_id
        WHERE ec.timestamp BETWEEN $1 AND $2
        GROUP BY ecl.severity
      `;
      
      const severityResult = await this.db.query(severityQuery, [timeRange.start, timeRange.end]);
      const errorsBySeverity: Record<ErrorSeverity, number> = {} as any;
      
      severityResult.rows.forEach((severityRow: any) => {
        errorsBySeverity[severityRow.severity as ErrorSeverity] = parseInt(severityRow.count, 10);
      });
      
      // Get error distribution by agent
      const agentQuery = `
        SELECT ec.agent_id, COUNT(*) as count
        FROM error_contexts ec
        WHERE ec.timestamp BETWEEN $1 AND $2
        GROUP BY ec.agent_id
      `;
      
      const agentResult = await this.db.query(agentQuery, [timeRange.start, timeRange.end]);
      const errorsByAgent: Record<string, number> = {};
      
      agentResult.rows.forEach((agentRow: any) => {
        errorsByAgent[agentRow.agent_id] = parseInt(agentRow.count, 10);
      });
      
      return {
        total_errors: parseInt(row.total_errors, 10) || 0,
        errors_by_type: errorsByType,
        errors_by_severity: errorsBySeverity,
        errors_by_agent: errorsByAgent,
        resolution_rate: 0.85, // Would be calculated from recovery data
        average_resolution_time: 120000, // Would be calculated from recovery data
        recurring_errors: 0, // Would be calculated from pattern analysis
        critical_errors: Object.values(errorsBySeverity).reduce(
          (sum, count) => sum + count, 0
        )
      };
      
    } catch (dbError) {
      this.logger.error('Failed to get error metrics', {
        error: dbError.message
      });
      
      // Return empty metrics
      return {
        total_errors: 0,
        errors_by_type: {} as any,
        errors_by_severity: {} as any,
        errors_by_agent: {},
        resolution_rate: 0,
        average_resolution_time: 0,
        recurring_errors: 0,
        critical_errors: 0
      };
    }
  }
}

/**
 * Error trend analyzer
 */
class ErrorTrendAnalyzer {
  private db: DatabaseInterface;
  private logger: Logger;

  constructor(db: DatabaseInterface, logger: Logger) {
    this.db = db;
    this.logger = logger;
  }

  /**
   * Analyze error trends
   */
  async analyzeTrends(agentId?: string): Promise<ErrorTrend[]> {
    try {
      const query = `
        SELECT 
          DATE_TRUNC('hour', ec.timestamp) as hour,
          COUNT(*) as error_count,
          COUNT(CASE WHEN ecl.severity = 'critical' THEN 1 END) as critical_count,
          COUNT(CASE WHEN ecl.severity = 'high' THEN 1 END) as high_count,
          COUNT(CASE WHEN ecl.severity = 'medium' THEN 1 END) as medium_count,
          COUNT(CASE WHEN ecl.severity = 'low' THEN 1 END) as low_count
        FROM error_contexts ec
        LEFT JOIN error_classifications ecl ON ec.error_id = ecl.error_id
        WHERE 
          ec.timestamp >= NOW() - INTERVAL '24 hours'
          ${agentId ? 'AND ec.agent_id = $1' : ''}
        GROUP BY DATE_TRUNC('hour', ec.timestamp)
        ORDER BY hour
      `;
      
      const params = agentId ? [agentId] : [];
      const result = await this.db.query(query, params);
      
      return result.rows.map((row: any) => ({
        timestamp: row.hour,
        error_count: parseInt(row.error_count, 10),
        severity_distribution: {
          critical: parseInt(row.critical_count, 10) || 0,
          high: parseInt(row.high_count, 10) || 0,
          medium: parseInt(row.medium_count, 10) || 0,
          low: parseInt(row.low_count, 10) || 0,
          emergency: 0 // Would be calculated if emergency severity exists
        },
        resolution_rate: 0.85, // Would be calculated from recovery data
        average_resolution_time: 120000 // Would be calculated from recovery data
      }));
      
    } catch (dbError) {
      this.logger.error('Failed to analyze error trends', {
        error: dbError.message
      });
      return [];
    }
  }

  /**
   * Update trend analysis (called periodically)
   */
  async updateTrends(): Promise<void> {
    // This would implement more sophisticated trend analysis
    // For now, trends are calculated on-demand
  }
}

/**
 * Alert manager for sending notifications
 */
class AlertManager {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Send alert through configured channels
   */
  async sendAlert(alert: any, channels: string[]): Promise<void> {
    for (const channel of channels) {
      try {
        await this.sendAlertToChannel(alert, channel);
      } catch (channelError) {
        this.logger.error(`Failed to send alert to channel: ${channel}`, {
          alert_id: alert.alert_id,
          error: channelError.message
        });
      }
    }
  }

  /**
   * Send alert to specific channel
   */
  private async sendAlertToChannel(alert: any, channel: string): Promise<void> {
    this.logger.info(`Sending alert to channel: ${channel}`, {
      alert_id: alert.alert_id,
      severity: alert.severity
    });

    // In a real implementation, this would integrate with:
    // - Email services
    // - Slack/Teams
    // - SMS services
    // - PagerDuty/OpsGenie
    // - Custom webhooks
    
    switch (channel) {
      case 'email':
        await this.sendEmailAlert(alert);
        break;
        
      case 'slack':
        await this.sendSlackAlert(alert);
        break;
        
      case 'webhook':
        await this.sendWebhookAlert(alert);
        break;
        
      default:
        this.logger.warn(`Unknown alert channel: ${channel}`);
    }
  }

  /**
   * Send email alert (simulated)
   */
  private async sendEmailAlert(alert: any): Promise<void> {
    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 100));
    this.logger.info(`Email alert sent: ${alert.alert_id}`);
  }

  /**
   * Send Slack alert (simulated)
   */
  private async sendSlackAlert(alert: any): Promise<void> {
    // Simulate Slack notification
    await new Promise(resolve => setTimeout(resolve, 150));
    this.logger.info(`Slack alert sent: ${alert.alert_id}`);
  }

  /**
   * Send webhook alert (simulated)
   */
  private async sendWebhookAlert(alert: any): Promise<void> {
    // Simulate webhook call
    await new Promise(resolve => setTimeout(resolve, 200));
    this.logger.info(`Webhook alert sent: ${alert.alert_id}`);
  }
}