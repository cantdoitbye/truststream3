/**
 * Data Store Component
 * 
 * Persistent storage layer for monitoring data with support for multiple
 * database backends, efficient querying, and data retention management.
 */

import { EventEmitter } from 'events';
import { 
  StorageConfig,
  HealthMetrics,
  Alert,
  ActiveAlert,
  RecoveryExecution,
  RecoveryProcedure,
  PredictiveAnalysis,
  AnomalyDetection
} from '../interfaces';

interface ConnectionPool {
  total: number;
  active: number;
  idle: number;
  waiting: number;
}

interface QueryMetrics {
  totalQueries: number;
  averageExecutionTime: number;
  slowQueries: number;
  failedQueries: number;
}

export class DataStore extends EventEmitter {
  private config: StorageConfig;
  private isInitialized: boolean = false;
  private connectionPool?: ConnectionPool;
  private queryMetrics: QueryMetrics = {
    totalQueries: 0,
    averageExecutionTime: 0,
    slowQueries: 0,
    failedQueries: 0
  };

  // In-memory caches for frequently accessed data
  private metricsCache: Map<string, HealthMetrics[]> = new Map();
  private alertsCache: Map<string, Alert[]> = new Map();
  private proceduresCache: Map<string, RecoveryProcedure> = new Map();

  // Data retention timers
  private retentionCleanupInterval?: NodeJS.Timeout;

  constructor(config: StorageConfig) {
    super();
    this.config = config;
  }

  // ===== LIFECYCLE METHODS =====

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log(`[${new Date().toISOString()}] Initializing DataStore (${this.config.type})`);

    try {
      // Initialize connection based on database type
      await this.initializeConnection();
      
      // Create tables/schemas if they don't exist
      await this.initializeSchema();
      
      // Start retention cleanup
      this.startRetentionCleanup();
      
      this.isInitialized = true;
      this.emit('datastore:initialized', { timestamp: new Date() });
      
      console.log(`[${new Date().toISOString()}] DataStore initialized successfully`);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to initialize DataStore:`, error);
      throw new Error(`DataStore initialization failed: ${error.message}`);
    }
  }

  async close(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    console.log(`[${new Date().toISOString()}] Closing DataStore`);

    try {
      // Stop retention cleanup
      if (this.retentionCleanupInterval) {
        clearInterval(this.retentionCleanupInterval);
        this.retentionCleanupInterval = undefined;
      }

      // Close database connections
      await this.closeConnection();
      
      // Clear caches
      this.clearCaches();
      
      this.isInitialized = false;
      this.emit('datastore:closed', { timestamp: new Date() });
      
      console.log(`[${new Date().toISOString()}] DataStore closed successfully`);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error closing DataStore:`, error);
      throw error;
    }
  }

  // ===== METRICS STORAGE =====

  async storeMetrics(agentId: string, metrics: HealthMetrics): Promise<void> {
    this.ensureInitialized();

    try {
      await this.executeQuery(
        'INSERT INTO agent_metrics (agent_id, timestamp, metrics_data) VALUES (?, ?, ?)',
        [agentId, new Date(), JSON.stringify(metrics)]
      );

      // Update cache
      this.updateMetricsCache(agentId, metrics);

      this.emit('metrics:stored', { agentId, timestamp: new Date() });

    } catch (error) {
      console.error(`Error storing metrics for agent ${agentId}:`, error);
      throw error;
    }
  }

  async storeMetricsBatch(agentId: string, metricsBatch: HealthMetrics[]): Promise<void> {
    this.ensureInitialized();

    if (metricsBatch.length === 0) {
      return;
    }

    try {
      const values = metricsBatch.map(metrics => [
        agentId,
        new Date(),
        JSON.stringify(metrics)
      ]);

      await this.executeBatchQuery(
        'INSERT INTO agent_metrics (agent_id, timestamp, metrics_data) VALUES (?, ?, ?)',
        values
      );

      // Update cache with latest metrics
      metricsBatch.forEach(metrics => this.updateMetricsCache(agentId, metrics));

      this.emit('metrics:batch_stored', { 
        agentId, 
        count: metricsBatch.length, 
        timestamp: new Date() 
      });

    } catch (error) {
      console.error(`Error storing metrics batch for agent ${agentId}:`, error);
      throw error;
    }
  }

  async getMetricsHistory(agentId: string, timeRange: string): Promise<HealthMetrics[]> {
    this.ensureInitialized();

    try {
      const timeRangeMs = this.parseTimeRange(timeRange);
      const startTime = new Date(Date.now() - timeRangeMs);

      const results = await this.executeQuery(
        'SELECT metrics_data, timestamp FROM agent_metrics WHERE agent_id = ? AND timestamp >= ? ORDER BY timestamp DESC LIMIT 1000',
        [agentId, startTime]
      );

      return results.map((row: any) => ({
        ...JSON.parse(row.metrics_data),
        timestamp: row.timestamp
      }));

    } catch (error) {
      console.error(`Error getting metrics history for agent ${agentId}:`, error);
      throw error;
    }
  }

  async getLatestMetrics(agentId: string): Promise<HealthMetrics | null> {
    // Check cache first
    const cached = this.metricsCache.get(agentId);
    if (cached && cached.length > 0) {
      return cached[cached.length - 1];
    }

    this.ensureInitialized();

    try {
      const results = await this.executeQuery(
        'SELECT metrics_data FROM agent_metrics WHERE agent_id = ? ORDER BY timestamp DESC LIMIT 1',
        [agentId]
      );

      if (results.length === 0) {
        return null;
      }

      return JSON.parse(results[0].metrics_data);

    } catch (error) {
      console.error(`Error getting latest metrics for agent ${agentId}:`, error);
      throw error;
    }
  }

  // ===== ALERT STORAGE =====

  async storeAlert(alert: Alert): Promise<void> {
    this.ensureInitialized();

    try {
      await this.executeQuery(
        `INSERT INTO alerts (
          alert_id, agent_id, type, severity, title, description, 
          metric, threshold, actual_value, timestamp, status, 
          acknowledgments, escalations, resolution, tags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          alert.alertId,
          alert.agentId,
          alert.type,
          alert.severity,
          alert.title,
          alert.description,
          alert.metric || null,
          alert.threshold || null,
          alert.actualValue || null,
          alert.timestamp,
          alert.status,
          JSON.stringify(alert.acknowledgments),
          JSON.stringify(alert.escalations),
          alert.resolution ? JSON.stringify(alert.resolution) : null,
          JSON.stringify(alert.tags)
        ]
      );

      // Update cache
      this.updateAlertsCache(alert.agentId, alert);

      this.emit('alert:stored', { alert, timestamp: new Date() });

    } catch (error) {
      console.error(`Error storing alert ${alert.alertId}:`, error);
      throw error;
    }
  }

  async updateAlert(alertId: string, updates: Partial<Alert>): Promise<void> {
    this.ensureInitialized();

    try {
      const setClauses: string[] = [];
      const values: any[] = [];

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          setClauses.push(`${key} = ?`);
          values.push(typeof value === 'object' ? JSON.stringify(value) : value);
        }
      });

      if (setClauses.length === 0) {
        return;
      }

      values.push(alertId);

      await this.executeQuery(
        `UPDATE alerts SET ${setClauses.join(', ')} WHERE alert_id = ?`,
        values
      );

      this.emit('alert:updated', { alertId, updates, timestamp: new Date() });

    } catch (error) {
      console.error(`Error updating alert ${alertId}:`, error);
      throw error;
    }
  }

  async getActiveAlerts(): Promise<Alert[]> {
    this.ensureInitialized();

    try {
      const results = await this.executeQuery(
        `SELECT * FROM alerts WHERE status IN ('active', 'acknowledged', 'escalated') ORDER BY timestamp DESC`,
        []
      );

      return results.map(this.mapRowToAlert);

    } catch (error) {
      console.error('Error getting active alerts:', error);
      throw error;
    }
  }

  async getAlertHistory(agentId: string, timeRange: string): Promise<Alert[]> {
    this.ensureInitialized();

    try {
      const timeRangeMs = this.parseTimeRange(timeRange);
      const startTime = new Date(Date.now() - timeRangeMs);

      const results = await this.executeQuery(
        'SELECT * FROM alerts WHERE agent_id = ? AND timestamp >= ? ORDER BY timestamp DESC',
        [agentId, startTime]
      );

      return results.map(this.mapRowToAlert);

    } catch (error) {
      console.error(`Error getting alert history for agent ${agentId}:`, error);
      throw error;
    }
  }

  async saveActiveAlerts(alerts: ActiveAlert[]): Promise<void> {
    // This is used for saving state during shutdown
    for (const alert of alerts) {
      await this.updateAlert(alert.alertId, {
        acknowledgments: alert.acknowledgments,
        escalations: alert.escalations,
        status: alert.status
      });
    }
  }

  // ===== RECOVERY STORAGE =====

  async storeRecoveryExecution(execution: RecoveryExecution): Promise<void> {
    this.ensureInitialized();

    try {
      await this.executeQuery(
        `INSERT INTO recovery_executions (
          execution_id, procedure_id, agent_id, triggered_by, start_time,
          end_time, status, steps, result, logs
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          execution.executionId,
          execution.procedureId,
          execution.agentId,
          execution.triggeredBy,
          execution.startTime,
          execution.endTime || null,
          execution.status,
          JSON.stringify(execution.steps),
          JSON.stringify(execution.result),
          JSON.stringify(execution.logs)
        ]
      );

      this.emit('recovery:stored', { execution, timestamp: new Date() });

    } catch (error) {
      console.error(`Error storing recovery execution ${execution.executionId}:`, error);
      throw error;
    }
  }

  async updateRecoveryExecution(executionId: string, execution: RecoveryExecution): Promise<void> {
    this.ensureInitialized();

    try {
      await this.executeQuery(
        `UPDATE recovery_executions SET 
          end_time = ?, status = ?, steps = ?, result = ?, logs = ?
         WHERE execution_id = ?`,
        [
          execution.endTime || null,
          execution.status,
          JSON.stringify(execution.steps),
          JSON.stringify(execution.result),
          JSON.stringify(execution.logs),
          executionId
        ]
      );

      this.emit('recovery:updated', { executionId, timestamp: new Date() });

    } catch (error) {
      console.error(`Error updating recovery execution ${executionId}:`, error);
      throw error;
    }
  }

  async getRecoveryExecution(executionId: string): Promise<RecoveryExecution | null> {
    this.ensureInitialized();

    try {
      const results = await this.executeQuery(
        'SELECT * FROM recovery_executions WHERE execution_id = ?',
        [executionId]
      );

      if (results.length === 0) {
        return null;
      }

      return this.mapRowToRecoveryExecution(results[0]);

    } catch (error) {
      console.error(`Error getting recovery execution ${executionId}:`, error);
      throw error;
    }
  }

  async getActiveRecoveries(): Promise<RecoveryExecution[]> {
    this.ensureInitialized();

    try {
      const results = await this.executeQuery(
        `SELECT * FROM recovery_executions WHERE status IN ('pending', 'running') ORDER BY start_time DESC`,
        []
      );

      return results.map(this.mapRowToRecoveryExecution);

    } catch (error) {
      console.error('Error getting active recoveries:', error);
      throw error;
    }
  }

  async saveActiveRecoveries(recoveries: RecoveryExecution[]): Promise<void> {
    // This is used for saving state during shutdown
    for (const recovery of recoveries) {
      await this.updateRecoveryExecution(recovery.executionId, recovery);
    }
  }

  async getRecoveryProcedures(): Promise<RecoveryProcedure[]> {
    // Check cache first
    if (this.proceduresCache.size > 0) {
      return Array.from(this.proceduresCache.values());
    }

    this.ensureInitialized();

    try {
      const results = await this.executeQuery(
        'SELECT * FROM recovery_procedures ORDER BY procedure_id',
        []
      );

      const procedures = results.map(this.mapRowToRecoveryProcedure);
      
      // Update cache
      procedures.forEach(procedure => {
        this.proceduresCache.set(procedure.procedureId, procedure);
      });

      return procedures;

    } catch (error) {
      console.error('Error getting recovery procedures:', error);
      return [];
    }
  }

  // ===== ANALYTICS STORAGE =====

  async storePredictiveAnalysis(analysis: PredictiveAnalysis): Promise<void> {
    this.ensureInitialized();

    try {
      await this.executeQuery(
        `INSERT INTO predictive_analyses (
          analysis_id, agent_id, timestamp, predictions, anomalies,
          recommendations, confidence, model_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          analysis.analysisId,
          analysis.agentId,
          analysis.timestamp,
          JSON.stringify(analysis.predictions),
          JSON.stringify(analysis.anomalies),
          JSON.stringify(analysis.recommendations),
          analysis.confidence,
          analysis.modelVersion
        ]
      );

      this.emit('analysis:stored', { analysis, timestamp: new Date() });

    } catch (error) {
      console.error(`Error storing predictive analysis ${analysis.analysisId}:`, error);
      throw error;
    }
  }

  async storeAnomalyDetection(anomaly: AnomalyDetection): Promise<void> {
    this.ensureInitialized();

    try {
      await this.executeQuery(
        `INSERT INTO anomaly_detections (
          anomaly_id, type, severity, metric, observed_value, expected_value,
          deviation, confidence, context, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          anomaly.anomalyId,
          anomaly.type,
          anomaly.severity,
          anomaly.metric,
          anomaly.observedValue,
          anomaly.expectedValue,
          anomaly.deviation,
          anomaly.confidence,
          JSON.stringify(anomaly.context),
          new Date()
        ]
      );

      this.emit('anomaly:stored', { anomaly, timestamp: new Date() });

    } catch (error) {
      console.error(`Error storing anomaly detection ${anomaly.anomalyId}:`, error);
      throw error;
    }
  }

  // ===== QUERY EXECUTION =====

  private async executeQuery(query: string, params: any[]): Promise<any[]> {
    const startTime = Date.now();
    
    try {
      this.queryMetrics.totalQueries++;

      // In a real implementation, this would execute against the actual database
      const result = await this.simulateQuery(query, params);
      
      const executionTime = Date.now() - startTime;
      this.updateQueryMetrics(executionTime);

      return result;

    } catch (error) {
      this.queryMetrics.failedQueries++;
      throw error;
    }
  }

  private async executeBatchQuery(query: string, paramsBatch: any[][]): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.queryMetrics.totalQueries += paramsBatch.length;

      // In a real implementation, this would execute batch operations
      await this.simulateBatchQuery(query, paramsBatch);
      
      const executionTime = Date.now() - startTime;
      this.updateQueryMetrics(executionTime);

    } catch (error) {
      this.queryMetrics.failedQueries += paramsBatch.length;
      throw error;
    }
  }

  // ===== PRIVATE METHODS =====

  private async initializeConnection(): Promise<void> {
    // Initialize connection based on database type
    switch (this.config.type) {
      case 'postgresql':
        await this.initializePostgreSQL();
        break;
      case 'timescaledb':
        await this.initializeTimeScaleDB();
        break;
      case 'influxdb':
        await this.initializeInfluxDB();
        break;
      case 'elasticsearch':
        await this.initializeElasticsearch();
        break;
      default:
        throw new Error(`Unsupported database type: ${this.config.type}`);
    }

    this.connectionPool = {
      total: 10,
      active: 0,
      idle: 10,
      waiting: 0
    };
  }

  private async closeConnection(): Promise<void> {
    // Close database connections based on type
    console.log(`[${new Date().toISOString()}] Closing ${this.config.type} connection`);
    
    // In a real implementation, this would close actual database connections
    this.connectionPool = undefined;
  }

  private async initializeSchema(): Promise<void> {
    // Create tables/schemas if they don't exist
    await this.createTablesIfNotExists();
    await this.createIndexes();
    await this.setupPartitioning();
  }

  private async createTablesIfNotExists(): Promise<void> {
    const tables = [
      this.getAgentMetricsTableSQL(),
      this.getAlertsTableSQL(),
      this.getRecoveryExecutionsTableSQL(),
      this.getRecoveryProceduresTableSQL(),
      this.getPredictiveAnalysesTableSQL(),
      this.getAnomalyDetectionsTableSQL()
    ];

    for (const tableSQL of tables) {
      await this.executeQuery(tableSQL, []);
    }
  }

  private async createIndexes(): Promise<void> {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_agent_metrics_agent_timestamp ON agent_metrics(agent_id, timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_alerts_agent_status ON alerts(agent_id, status)',
      'CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_recovery_executions_agent ON recovery_executions(agent_id)',
      'CREATE INDEX IF NOT EXISTS idx_recovery_executions_status ON recovery_executions(status)',
      'CREATE INDEX IF NOT EXISTS idx_predictive_analyses_agent ON predictive_analyses(agent_id)',
      'CREATE INDEX IF NOT EXISTS idx_anomaly_detections_timestamp ON anomaly_detections(timestamp)'
    ];

    for (const indexSQL of indexes) {
      await this.executeQuery(indexSQL, []);
    }
  }

  private async setupPartitioning(): Promise<void> {
    // Setup time-based partitioning for large tables
    if (this.config.partitionStrategy === 'time') {
      // In a real implementation, this would setup database partitioning
      console.log(`[${new Date().toISOString()}] Setting up time-based partitioning`);
    }
  }

  private startRetentionCleanup(): void {
    // Start automatic cleanup of old data based on retention policy
    this.retentionCleanupInterval = setInterval(async () => {
      try {
        await this.performRetentionCleanup();
      } catch (error) {
        console.error('Error in retention cleanup:', error);
      }
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  private async performRetentionCleanup(): Promise<void> {
    console.log(`[${new Date().toISOString()}] Performing retention cleanup`);

    const retentionMs = this.parseTimeRange('30d'); // Default 30 days
    const cutoffDate = new Date(Date.now() - retentionMs);

    // Clean up old metrics
    await this.executeQuery(
      'DELETE FROM agent_metrics WHERE timestamp < ?',
      [cutoffDate]
    );

    // Clean up resolved alerts older than retention period
    await this.executeQuery(
      'DELETE FROM alerts WHERE status = \'resolved\' AND timestamp < ?',
      [cutoffDate]
    );

    // Clean up completed recovery executions
    await this.executeQuery(
      'DELETE FROM recovery_executions WHERE status IN (\'completed\', \'failed\', \'cancelled\') AND start_time < ?',
      [cutoffDate]
    );

    this.emit('retention:cleanup_completed', { cutoffDate, timestamp: new Date() });
  }

  private parseTimeRange(timeRange: string): number {
    const match = timeRange.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid time range format: ${timeRange}`);
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    };

    return value * multipliers[unit as keyof typeof multipliers];
  }

  private updateQueryMetrics(executionTime: number): void {
    // Update average execution time
    const totalTime = this.queryMetrics.averageExecutionTime * (this.queryMetrics.totalQueries - 1) + executionTime;
    this.queryMetrics.averageExecutionTime = totalTime / this.queryMetrics.totalQueries;

    // Track slow queries (> 1 second)
    if (executionTime > 1000) {
      this.queryMetrics.slowQueries++;
    }
  }

  private updateMetricsCache(agentId: string, metrics: HealthMetrics): void {
    let cache = this.metricsCache.get(agentId);
    if (!cache) {
      cache = [];
      this.metricsCache.set(agentId, cache);
    }

    cache.push(metrics);

    // Keep only recent metrics in cache
    if (cache.length > 100) {
      cache.splice(0, cache.length - 100);
    }
  }

  private updateAlertsCache(agentId: string, alert: Alert): void {
    let cache = this.alertsCache.get(agentId);
    if (!cache) {
      cache = [];
      this.alertsCache.set(agentId, cache);
    }

    cache.push(alert);

    // Keep only recent alerts in cache
    if (cache.length > 50) {
      cache.splice(0, cache.length - 50);
    }
  }

  private clearCaches(): void {
    this.metricsCache.clear();
    this.alertsCache.clear();
    this.proceduresCache.clear();
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('DataStore is not initialized. Call initialize() first.');
    }
  }

  // ===== DATABASE-SPECIFIC INITIALIZATION =====

  private async initializePostgreSQL(): Promise<void> {
    console.log(`[${new Date().toISOString()}] Initializing PostgreSQL connection`);
    // In a real implementation, this would create PostgreSQL connection pool
  }

  private async initializeTimeScaleDB(): Promise<void> {
    console.log(`[${new Date().toISOString()}] Initializing TimeScaleDB connection`);
    // In a real implementation, this would create TimeScaleDB connection pool
  }

  private async initializeInfluxDB(): Promise<void> {
    console.log(`[${new Date().toISOString()}] Initializing InfluxDB connection`);
    // In a real implementation, this would create InfluxDB client
  }

  private async initializeElasticsearch(): Promise<void> {
    console.log(`[${new Date().toISOString()}] Initializing Elasticsearch connection`);
    // In a real implementation, this would create Elasticsearch client
  }

  // ===== QUERY SIMULATION =====

  private async simulateQuery(query: string, params: any[]): Promise<any[]> {
    // Simulate database query execution
    await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 50));

    // Return mock data based on query type
    if (query.includes('SELECT')) {
      return this.generateMockQueryResults(query, params);
    }

    return [];
  }

  private async simulateBatchQuery(query: string, paramsBatch: any[][]): Promise<void> {
    // Simulate batch query execution
    const delay = Math.max(50, paramsBatch.length * 2);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private generateMockQueryResults(query: string, params: any[]): any[] {
    // Generate mock data based on query
    if (query.includes('agent_metrics')) {
      return this.generateMockMetricsResults();
    } else if (query.includes('alerts')) {
      return this.generateMockAlertsResults();
    } else if (query.includes('recovery_executions')) {
      return this.generateMockRecoveryResults();
    }

    return [];
  }

  private generateMockMetricsResults(): any[] {
    // Generate mock metrics data
    return Array.from({ length: 10 }, (_, i) => ({
      metrics_data: JSON.stringify({
        performance: {
          responseTime: { current: 50 + Math.random() * 100 },
          errorRate: { current: Math.random() * 5 }
        },
        resource: {
          cpu: { percentage: Math.random() * 80 },
          memory: { percentage: 60 + Math.random() * 30 }
        }
      }),
      timestamp: new Date(Date.now() - i * 60000)
    }));
  }

  private generateMockAlertsResults(): any[] {
    // Generate mock alerts data
    return [];
  }

  private generateMockRecoveryResults(): any[] {
    // Generate mock recovery data
    return [];
  }

  // ===== TABLE SCHEMA DEFINITIONS =====

  private getAgentMetricsTableSQL(): string {
    return `
      CREATE TABLE IF NOT EXISTS agent_metrics (
        id SERIAL PRIMARY KEY,
        agent_id VARCHAR(255) NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        metrics_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
  }

  private getAlertsTableSQL(): string {
    return `
      CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY,
        alert_id VARCHAR(255) UNIQUE NOT NULL,
        agent_id VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        metric VARCHAR(255),
        threshold DECIMAL,
        actual_value DECIMAL,
        timestamp TIMESTAMP NOT NULL,
        status VARCHAR(20) NOT NULL,
        acknowledgments JSONB DEFAULT '[]',
        escalations JSONB DEFAULT '[]',
        resolution JSONB,
        tags JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
  }

  private getRecoveryExecutionsTableSQL(): string {
    return `
      CREATE TABLE IF NOT EXISTS recovery_executions (
        id SERIAL PRIMARY KEY,
        execution_id VARCHAR(255) UNIQUE NOT NULL,
        procedure_id VARCHAR(255) NOT NULL,
        agent_id VARCHAR(255) NOT NULL,
        triggered_by VARCHAR(255) NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        status VARCHAR(20) NOT NULL,
        steps JSONB NOT NULL,
        result JSONB NOT NULL,
        logs JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
  }

  private getRecoveryProceduresTableSQL(): string {
    return `
      CREATE TABLE IF NOT EXISTS recovery_procedures (
        id SERIAL PRIMARY KEY,
        procedure_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        triggers JSONB NOT NULL,
        steps JSONB NOT NULL,
        prerequisites JSONB DEFAULT '[]',
        rollback_steps JSONB DEFAULT '[]',
        success_criteria JSONB NOT NULL,
        timeout INTEGER NOT NULL,
        max_attempts INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
  }

  private getPredictiveAnalysesTableSQL(): string {
    return `
      CREATE TABLE IF NOT EXISTS predictive_analyses (
        id SERIAL PRIMARY KEY,
        analysis_id VARCHAR(255) UNIQUE NOT NULL,
        agent_id VARCHAR(255) NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        predictions JSONB NOT NULL,
        anomalies JSONB NOT NULL,
        recommendations JSONB NOT NULL,
        confidence DECIMAL NOT NULL,
        model_version VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
  }

  private getAnomalyDetectionsTableSQL(): string {
    return `
      CREATE TABLE IF NOT EXISTS anomaly_detections (
        id SERIAL PRIMARY KEY,
        anomaly_id VARCHAR(255) UNIQUE NOT NULL,
        type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        metric VARCHAR(255) NOT NULL,
        observed_value DECIMAL NOT NULL,
        expected_value DECIMAL NOT NULL,
        deviation DECIMAL NOT NULL,
        confidence DECIMAL NOT NULL,
        context JSONB NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
  }

  // ===== ROW MAPPING METHODS =====

  private mapRowToAlert = (row: any): Alert => {
    return {
      alertId: row.alert_id,
      agentId: row.agent_id,
      type: row.type,
      severity: row.severity,
      title: row.title,
      description: row.description,
      metric: row.metric,
      threshold: row.threshold,
      actualValue: row.actual_value,
      timestamp: row.timestamp,
      status: row.status,
      acknowledgments: JSON.parse(row.acknowledgments || '[]'),
      escalations: JSON.parse(row.escalations || '[]'),
      resolution: row.resolution ? JSON.parse(row.resolution) : undefined,
      tags: JSON.parse(row.tags || '[]')
    };
  };

  private mapRowToRecoveryExecution = (row: any): RecoveryExecution => {
    return {
      executionId: row.execution_id,
      procedureId: row.procedure_id,
      agentId: row.agent_id,
      triggeredBy: row.triggered_by,
      startTime: row.start_time,
      endTime: row.end_time,
      status: row.status,
      steps: JSON.parse(row.steps),
      result: JSON.parse(row.result),
      logs: JSON.parse(row.logs || '[]')
    };
  };

  private mapRowToRecoveryProcedure = (row: any): RecoveryProcedure => {
    return {
      procedureId: row.procedure_id,
      name: row.name,
      description: row.description,
      triggers: JSON.parse(row.triggers),
      steps: JSON.parse(row.steps),
      prerequisites: JSON.parse(row.prerequisites || '[]'),
      rollbackSteps: JSON.parse(row.rollback_steps || '[]'),
      successCriteria: JSON.parse(row.success_criteria),
      timeout: row.timeout,
      maxAttempts: row.max_attempts
    };
  };

  // ===== GETTERS =====

  getConnectionPool(): ConnectionPool | undefined {
    return this.connectionPool;
  }

  getQueryMetrics(): QueryMetrics {
    return { ...this.queryMetrics };
  }

  isHealthy(): boolean {
    return this.isInitialized && 
           this.connectionPool !== undefined &&
           this.queryMetrics.failedQueries / Math.max(1, this.queryMetrics.totalQueries) < 0.1;
  }
}
