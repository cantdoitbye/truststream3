/**
 * Supabase implementation of the monitoring backend
 * Handles all Supabase-specific database operations
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BaseMonitoringBackend } from './base';
import {
  MonitoringConfig,
  LogEntry,
  PerformanceMetric,
  AnalyticsQuery,
  AnalyticsResult,
  Anomaly,
  Alert,
  Prediction,
  SystemHealth,
  EventType,
  LogLevel
} from '../types';

interface SupabaseMonitoringConfig extends MonitoringConfig {
  connection: {
    url: string;
    apiKey: string;
  };
}

export class SupabaseMonitoringBackend extends BaseMonitoringBackend {
  private client: SupabaseClient;
  private readonly TABLES = {
    logs: 'monitoring_logs',
    metrics: 'monitoring_metrics',
    anomalies: 'monitoring_anomalies',
    alerts: 'monitoring_alerts',
    predictions: 'monitoring_predictions',
    system_health: 'monitoring_system_health'
  };

  constructor(config: SupabaseMonitoringConfig) {
    super(config);
    
    if (!config.connection?.url || !config.connection?.apiKey) {
      throw new Error('Supabase URL and API key are required');
    }
    
    this.client = createClient(config.connection.url, config.connection.apiKey);
  }

  async initialize(): Promise<void> {
    try {
      // Test connection
      const { error } = await this.client.from(this.TABLES.logs).select('id').limit(1);
      if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist, which is fine
        throw error;
      }
      
      // Create tables if they don't exist
      await this.createTablesIfNeeded();
      
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize Supabase monitoring backend: ${error}`);
    }
  }

  protected async persistLogs(logs: LogEntry[]): Promise<void> {
    if (logs.length === 0) return;
    
    const { error } = await this.client
      .from(this.TABLES.logs)
      .insert(logs.map(log => ({
        ...log,
        timestamp: log.timestamp.toISOString(),
        metadata: log.metadata ? JSON.stringify(log.metadata) : null,
        tags: log.tags ? JSON.stringify(log.tags) : null,
        error: log.error ? JSON.stringify(log.error) : null
      })));
    
    if (error) {
      throw new Error(`Failed to persist logs: ${error.message}`);
    }
  }

  protected async persistMetrics(metrics: PerformanceMetric[]): Promise<void> {
    if (metrics.length === 0) return;
    
    const { error } = await this.client
      .from(this.TABLES.metrics)
      .insert(metrics.map(metric => ({
        ...metric,
        timestamp: metric.timestamp.toISOString(),
        dimensions: metric.dimensions ? JSON.stringify(metric.dimensions) : null,
        metadata: metric.metadata ? JSON.stringify(metric.metadata) : null,
        tags: metric.tags ? JSON.stringify(metric.tags) : null
      })));
    
    if (error) {
      throw new Error(`Failed to persist metrics: ${error.message}`);
    }
  }

  async query(query: AnalyticsQuery): Promise<AnalyticsResult> {
    // Start with base query
    let logsQuery = this.client.from(this.TABLES.logs).select('*');
    let metricsQuery = this.client.from(this.TABLES.metrics).select('*');
    
    // Apply filters
    if (query.startTime) {
      const startTime = query.startTime.toISOString();
      logsQuery = logsQuery.gte('timestamp', startTime);
      metricsQuery = metricsQuery.gte('timestamp', startTime);
    }
    
    if (query.endTime) {
      const endTime = query.endTime.toISOString();
      logsQuery = logsQuery.lte('timestamp', endTime);
      metricsQuery = metricsQuery.lte('timestamp', endTime);
    }
    
    if (query.eventTypes?.length) {
      logsQuery = logsQuery.in('eventType', query.eventTypes);
    }
    
    if (query.logLevels?.length) {
      logsQuery = logsQuery.in('level', query.logLevels);
    }
    
    if (query.agentIds?.length) {
      logsQuery = logsQuery.in('agentId', query.agentIds);
      metricsQuery = metricsQuery.in('agentId', query.agentIds);
    }
    
    if (query.userIds?.length) {
      logsQuery = logsQuery.in('userId', query.userIds);
      metricsQuery = metricsQuery.in('userId', query.userIds);
    }
    
    if (query.modelNames?.length) {
      logsQuery = logsQuery.in('modelName', query.modelNames);
      metricsQuery = metricsQuery.in('modelName', query.modelNames);
    }
    
    // Apply ordering
    if (query.orderBy?.length) {
      for (const order of query.orderBy) {
        const ascending = order.direction === 'asc';
        logsQuery = logsQuery.order(order.field, { ascending });
        metricsQuery = metricsQuery.order(order.field, { ascending });
      }
    } else {
      // Default ordering by timestamp
      logsQuery = logsQuery.order('timestamp', { ascending: false });
      metricsQuery = metricsQuery.order('timestamp', { ascending: false });
    }
    
    // Apply pagination
    if (query.limit) {
      logsQuery = logsQuery.limit(query.limit);
      metricsQuery = metricsQuery.limit(query.limit);
    }
    
    if (query.offset) {
      logsQuery = logsQuery.range(query.offset, query.offset + (query.limit || 100) - 1);
      metricsQuery = metricsQuery.range(query.offset, query.offset + (query.limit || 100) - 1);
    }
    
    // Execute queries
    const startTime = Date.now();
    const [logsResult, metricsResult] = await Promise.all([
      logsQuery,
      metricsQuery
    ]);
    
    if (logsResult.error) throw new Error(`Logs query failed: ${logsResult.error.message}`);
    if (metricsResult.error) throw new Error(`Metrics query failed: ${metricsResult.error.message}`);
    
    // Combine results
    const data = [
      ...logsResult.data.map(this.parseLogEntry),
      ...metricsResult.data.map(this.parseMetric)
    ];
    
    // Calculate aggregations if requested
    const aggregations: Record<string, number> = {};
    if (query.aggregations?.length) {
      for (const agg of query.aggregations) {
        const values = data
          .map(item => item[agg.field])
          .filter(val => val !== undefined && val !== null)
          .map(val => typeof val === 'number' ? val : parseFloat(val))
          .filter(val => !isNaN(val));
        
        if (values.length > 0) {
          switch (agg.function) {
            case 'count':
              aggregations[agg.field] = values.length;
              break;
            case 'sum':
              aggregations[agg.field] = values.reduce((a, b) => a + b, 0);
              break;
            case 'avg':
              aggregations[agg.field] = values.reduce((a, b) => a + b, 0) / values.length;
              break;
            case 'min':
              aggregations[agg.field] = Math.min(...values);
              break;
            case 'max':
              aggregations[agg.field] = Math.max(...values);
              break;
            case 'percentile':
              const sorted = values.sort((a, b) => a - b);
              const index = Math.ceil(sorted.length * (agg.percentile || 50) / 100) - 1;
              aggregations[agg.field] = sorted[Math.max(0, index)];
              break;
          }
        }
      }
    }
    
    return {
      data,
      totalCount: data.length,
      aggregations,
      metadata: {
        queryDuration: Date.now() - startTime
      }
    };
  }

  async getLogs(query: Partial<AnalyticsQuery> = {}): Promise<LogEntry[]> {
    const result = await this.query({
      ...query,
      limit: query.limit || 1000
    });
    
    return result.data.filter(item => 'level' in item) as LogEntry[];
  }

  async getMetrics(query: Partial<AnalyticsQuery> = {}): Promise<PerformanceMetric[]> {
    const result = await this.query({
      ...query,
      limit: query.limit || 1000
    });
    
    return result.data.filter(item => 'metricType' in item) as PerformanceMetric[];
  }

  async getAnomalies(startTime?: Date, endTime?: Date): Promise<Anomaly[]> {
    let query = this.client.from(this.TABLES.anomalies).select('*');
    
    if (startTime) {
      query = query.gte('timestamp', startTime.toISOString());
    }
    
    if (endTime) {
      query = query.lte('timestamp', endTime.toISOString());
    }
    
    const { data, error } = await query.order('timestamp', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to get anomalies: ${error.message}`);
    }
    
    return data.map(this.parseAnomaly);
  }

  async createAlert(alert: Omit<Alert, 'id' | 'timestamp'>): Promise<Alert> {
    const newAlert = {
      ...alert,
      timestamp: new Date().toISOString(),
      condition: JSON.stringify(alert.condition),
      metadata: alert.metadata ? JSON.stringify(alert.metadata) : null,
      tags: alert.tags ? JSON.stringify(alert.tags) : null
    };
    
    const { data, error } = await this.client
      .from(this.TABLES.alerts)
      .insert(newAlert)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to create alert: ${error.message}`);
    }
    
    return this.parseAlert(data);
  }

  async getAlerts(status?: Alert['status']): Promise<Alert[]> {
    let query = this.client.from(this.TABLES.alerts).select('*');
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query.order('timestamp', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to get alerts: ${error.message}`);
    }
    
    return data.map(this.parseAlert);
  }

  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    const { error } = await this.client
      .from(this.TABLES.alerts)
      .update({
        status: 'acknowledged',
        acknowledgedBy,
        acknowledgedAt: new Date().toISOString()
      })
      .eq('id', alertId);
    
    if (error) {
      throw new Error(`Failed to acknowledge alert: ${error.message}`);
    }
  }

  async resolveAlert(alertId: string): Promise<void> {
    const { error } = await this.client
      .from(this.TABLES.alerts)
      .update({
        status: 'resolved',
        resolvedAt: new Date().toISOString()
      })
      .eq('id', alertId);
    
    if (error) {
      throw new Error(`Failed to resolve alert: ${error.message}`);
    }
  }

  async getPredictions(metric?: string): Promise<Prediction[]> {
    let query = this.client.from(this.TABLES.predictions).select('*');
    
    if (metric) {
      query = query.eq('metric', metric);
    }
    
    const { data, error } = await query.order('timestamp', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to get predictions: ${error.message}`);
    }
    
    return data.map(this.parsePrediction);
  }

  async updateSystemHealth(health: SystemHealth): Promise<void> {
    const { error } = await this.client
      .from(this.TABLES.system_health)
      .upsert({
        timestamp: health.timestamp.toISOString(),
        overall: health.overall,
        components: JSON.stringify(health.components),
        metrics: JSON.stringify(health.metrics)
      });
    
    if (error) {
      throw new Error(`Failed to update system health: ${error.message}`);
    }
  }

  async cleanup(olderThan: Date): Promise<number> {
    const cutoffTime = olderThan.toISOString();
    let totalDeleted = 0;
    
    // Clean up logs
    const { error: logsError, count: logsCount } = await this.client
      .from(this.TABLES.logs)
      .delete({ count: 'exact' })
      .lt('timestamp', cutoffTime);
    
    if (logsError) {
      console.error('Failed to cleanup logs:', logsError);
    } else {
      totalDeleted += logsCount || 0;
    }
    
    // Clean up metrics
    const { error: metricsError, count: metricsCount } = await this.client
      .from(this.TABLES.metrics)
      .delete({ count: 'exact' })
      .lt('timestamp', cutoffTime);
    
    if (metricsError) {
      console.error('Failed to cleanup metrics:', metricsError);
    } else {
      totalDeleted += metricsCount || 0;
    }
    
    // Clean up anomalies
    const { error: anomaliesError, count: anomaliesCount } = await this.client
      .from(this.TABLES.anomalies)
      .delete({ count: 'exact' })
      .lt('timestamp', cutoffTime);
    
    if (anomaliesError) {
      console.error('Failed to cleanup anomalies:', anomaliesError);
    } else {
      totalDeleted += anomaliesCount || 0;
    }
    
    return totalDeleted;
  }

  private async createTablesIfNeeded(): Promise<void> {
    // Note: In a real implementation, you would handle table creation through Supabase migrations
    // This is just for reference on what the schema should look like
    console.log('Tables should be created through Supabase migrations:');
    console.log(`
      -- Create monitoring_logs table
      CREATE TABLE IF NOT EXISTS ${this.TABLES.logs} (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        timestamp TIMESTAMPTZ NOT NULL,
        level TEXT NOT NULL,
        event_type TEXT NOT NULL,
        message TEXT NOT NULL,
        agent_id TEXT,
        user_id TEXT,
        session_id TEXT,
        request_id TEXT,
        duration INTEGER,
        model_name TEXT,
        token_count INTEGER,
        memory_usage REAL,
        cpu_usage REAL,
        metadata JSONB,
        tags JSONB,
        error JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      -- Create monitoring_metrics table
      CREATE TABLE IF NOT EXISTS ${this.TABLES.metrics} (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        timestamp TIMESTAMPTZ NOT NULL,
        metric_type TEXT NOT NULL,
        name TEXT NOT NULL,
        value REAL NOT NULL,
        unit TEXT,
        agent_id TEXT,
        model_name TEXT,
        user_id TEXT,
        session_id TEXT,
        dimensions JSONB,
        metadata JSONB,
        tags JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      -- Add indexes for performance
      CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON ${this.TABLES.logs} (timestamp);
      CREATE INDEX IF NOT EXISTS idx_logs_level ON ${this.TABLES.logs} (level);
      CREATE INDEX IF NOT EXISTS idx_logs_event_type ON ${this.TABLES.logs} (event_type);
      CREATE INDEX IF NOT EXISTS idx_logs_agent_id ON ${this.TABLES.logs} (agent_id);
      
      CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON ${this.TABLES.metrics} (timestamp);
      CREATE INDEX IF NOT EXISTS idx_metrics_name ON ${this.TABLES.metrics} (name);
      CREATE INDEX IF NOT EXISTS idx_metrics_agent_id ON ${this.TABLES.metrics} (agent_id);
    `);
  }

  // Parsing helper methods
  private parseLogEntry(data: any): LogEntry {
    return {
      ...data,
      timestamp: new Date(data.timestamp),
      metadata: data.metadata ? JSON.parse(data.metadata) : undefined,
      tags: data.tags ? JSON.parse(data.tags) : undefined,
      error: data.error ? JSON.parse(data.error) : undefined
    };
  }

  private parseMetric(data: any): PerformanceMetric {
    return {
      ...data,
      timestamp: new Date(data.timestamp),
      dimensions: data.dimensions ? JSON.parse(data.dimensions) : undefined,
      metadata: data.metadata ? JSON.parse(data.metadata) : undefined,
      tags: data.tags ? JSON.parse(data.tags) : undefined
    };
  }

  private parseAnomaly(data: any): Anomaly {
    return {
      ...data,
      timestamp: new Date(data.timestamp),
      context: data.context ? JSON.parse(data.context) : undefined
    };
  }

  private parseAlert(data: any): Alert {
    return {
      ...data,
      timestamp: new Date(data.timestamp),
      condition: JSON.parse(data.condition),
      metadata: data.metadata ? JSON.parse(data.metadata) : undefined,
      tags: data.tags ? JSON.parse(data.tags) : undefined,
      acknowledgedAt: data.acknowledgedAt ? new Date(data.acknowledgedAt) : undefined,
      resolvedAt: data.resolvedAt ? new Date(data.resolvedAt) : undefined
    };
  }

  private parsePrediction(data: any): Prediction {
    return {
      ...data,
      timestamp: new Date(data.timestamp),
      predictions: JSON.parse(data.predictions).map((p: any) => ({
        ...p,
        timestamp: new Date(p.timestamp)
      })),
      metadata: data.metadata ? JSON.parse(data.metadata) : undefined
    };
  }
}
