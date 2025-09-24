/**
 * TrustStream v4.2 - Intelligent Connection Pool Manager
 * 
 * Advanced connection pooling with adaptive sizing, health monitoring,
 * and predictive resource allocation.
 * 
 * Author: MiniMax Agent
 * Date: 2025-09-20
 */

import { EventEmitter } from 'events';
import { Logger } from '../shared-utils/logger';
import { DatabaseConfig } from '../shared-utils/database-interface';

export interface PoolConfiguration {
  minConnections: number;
  maxConnections: number;
  acquireTimeoutMs: number;
  createTimeoutMs: number;
  destroyTimeoutMs: number;
  idleTimeoutMs: number;
  reapIntervalMs: number;
  createRetryIntervalMs: number;
  
  // Advanced configuration
  adaptiveScaling: boolean;
  healthCheckIntervalMs: number;
  warmupConnections: number;
  loadBalancing: boolean;
  connectionQueueing: boolean;
  predictivePreloading: boolean;
  
  // Performance thresholds
  highLoadThreshold: number;
  lowLoadThreshold: number;
  connectionUtilizationTarget: number;
  maxQueueSize: number;
}

export interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  queuedRequests: number;
  poolUtilization: number;
  averageAcquireTime: number;
  averageQueryTime: number;
  errorRate: number;
  throughput: number;
  lastHealthCheck: Date;
}

export interface ConnectionInstance {
  id: string;
  connection: any;
  createdAt: Date;
  lastUsed: Date;
  inUse: boolean;
  healthy: boolean;
  queryCount: number;
  errorCount: number;
  averageResponseTime: number;
}

export interface LoadBalancingStrategy {
  type: 'round-robin' | 'least-connections' | 'random' | 'weighted' | 'adaptive';
  weights?: Map<string, number>;
  healthCheckRequired?: boolean;
}

/**
 * IntelligentConnectionPool
 * 
 * Advanced connection pool with adaptive sizing, health monitoring,
 * load balancing, and predictive scaling capabilities.
 */
export class IntelligentConnectionPool extends EventEmitter {
  private config: PoolConfiguration;
  private logger: Logger;
  private connections: Map<string, ConnectionInstance> = new Map();
  private waitingClients: Array<{
    resolve: (connection: ConnectionInstance) => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];
  
  // Metrics and monitoring
  private metrics: ConnectionMetrics;
  private metricsHistory: ConnectionMetrics[] = [];
  private loadHistory: number[] = [];
  private predictionModel: LoadPredictionModel;
  
  // Health monitoring
  private healthCheckTimer?: NodeJS.Timeout;
  private adaptiveScalingTimer?: NodeJS.Timeout;
  private metricsTimer?: NodeJS.Timeout;
  
  // Load balancing
  private loadBalancer: ConnectionLoadBalancer;
  private connectionFactory: (config: DatabaseConfig) => Promise<any>;
  private dbConfig: DatabaseConfig;

  constructor(
    config: PoolConfiguration,
    dbConfig: DatabaseConfig,
    connectionFactory: (config: DatabaseConfig) => Promise<any>,
    logger: Logger
  ) {
    super();
    this.config = config;
    this.dbConfig = dbConfig;
    this.connectionFactory = connectionFactory;
    this.logger = logger;
    
    this.metrics = this.initializeMetrics();
    this.predictionModel = new LoadPredictionModel(logger);
    this.loadBalancer = new ConnectionLoadBalancer(config, logger);
    
    this.startMonitoring();
  }

  /**
   * Initialize the connection pool
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing intelligent connection pool', {
      min_connections: this.config.minConnections,
      max_connections: this.config.maxConnections,
      adaptive_scaling: this.config.adaptiveScaling
    });

    try {
      // Create initial connections
      const initialConnections = Math.max(this.config.minConnections, this.config.warmupConnections);
      await this.ensureMinConnections(initialConnections);
      
      // Start adaptive scaling if enabled
      if (this.config.adaptiveScaling) {
        this.startAdaptiveScaling();
      }
      
      this.emit('pool-initialized', {
        totalConnections: this.connections.size,
        config: this.config
      });
      
      this.logger.info('Connection pool initialized successfully', {
        total_connections: this.connections.size,
        healthy_connections: this.getHealthyConnections().length
      });
    } catch (error) {
      this.logger.error('Failed to initialize connection pool', error);
      throw error;
    }
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire(): Promise<ConnectionInstance> {
    const startTime = Date.now();
    
    try {
      // Check if we can get an immediate connection
      const availableConnection = await this.getAvailableConnection();
      if (availableConnection) {
        this.markConnectionInUse(availableConnection);
        this.updateMetrics('acquire', Date.now() - startTime);
        return availableConnection;
      }

      // Check if we can create a new connection
      if (this.connections.size < this.config.maxConnections) {
        const newConnection = await this.createConnection();
        this.markConnectionInUse(newConnection);
        this.updateMetrics('acquire', Date.now() - startTime);
        return newConnection;
      }

      // Queue the request if queueing is enabled
      if (this.config.connectionQueueing && this.waitingClients.length < this.config.maxQueueSize) {
        return this.queueAcquireRequest(startTime);
      }

      // Pool exhausted
      throw new Error('Connection pool exhausted and queueing disabled or full');
    } catch (error) {
      this.updateMetrics('acquire-error', Date.now() - startTime);
      this.logger.error('Failed to acquire connection', error);
      throw error;
    }
  }

  /**
   * Release a connection back to the pool
   */
  async release(connection: ConnectionInstance): Promise<void> {
    try {
      if (!this.connections.has(connection.id)) {
        this.logger.warn('Attempted to release unknown connection', { connection_id: connection.id });
        return;
      }

      this.markConnectionIdle(connection);
      
      // Serve waiting clients if any
      if (this.waitingClients.length > 0) {
        const waitingClient = this.waitingClients.shift();
        if (waitingClient) {
          this.markConnectionInUse(connection);
          waitingClient.resolve(connection);
          return;
        }
      }

      // Check if connection should be destroyed (adaptive scaling)
      if (this.shouldDestroyConnection(connection)) {
        await this.destroyConnection(connection);
      }

      this.updateMetrics('release');
    } catch (error) {
      this.logger.error('Failed to release connection', error);
      throw error;
    }
  }

  /**
   * Get pool metrics and statistics
   */
  getMetrics(): ConnectionMetrics {
    return {
      ...this.metrics,
      totalConnections: this.connections.size,
      activeConnections: this.getActiveConnections().length,
      idleConnections: this.getIdleConnections().length,
      queuedRequests: this.waitingClients.length,
      poolUtilization: this.calculatePoolUtilization(),
      lastHealthCheck: new Date()
    };
  }

  /**
   * Destroy the connection pool
   */
  async destroy(): Promise<void> {
    this.logger.info('Destroying connection pool', {
      total_connections: this.connections.size,
      active_connections: this.getActiveConnections().length
    });

    try {
      // Stop all timers
      if (this.healthCheckTimer) clearInterval(this.healthCheckTimer);
      if (this.adaptiveScalingTimer) clearInterval(this.adaptiveScalingTimer);
      if (this.metricsTimer) clearInterval(this.metricsTimer);

      // Reject all waiting clients
      while (this.waitingClients.length > 0) {
        const client = this.waitingClients.shift();
        if (client) {
          client.reject(new Error('Connection pool is being destroyed'));
        }
      }

      // Destroy all connections
      const destroyPromises = Array.from(this.connections.values()).map(
        connection => this.destroyConnection(connection)
      );
      await Promise.all(destroyPromises);

      this.connections.clear();
      this.emit('pool-destroyed');
      
      this.logger.info('Connection pool destroyed successfully');
    } catch (error) {
      this.logger.error('Error destroying connection pool', error);
      throw error;
    }
  }

  // Private methods

  private async getAvailableConnection(): Promise<ConnectionInstance | null> {
    const idleConnections = this.getHealthyIdleConnections();
    
    if (idleConnections.length === 0) return null;

    // Use load balancing strategy to select best connection
    return this.loadBalancer.selectConnection(idleConnections);
  }

  private async createConnection(): Promise<ConnectionInstance> {
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      this.logger.debug('Creating new connection', { connection_id: connectionId });
      
      const rawConnection = await this.connectionFactory(this.dbConfig);
      
      const connection: ConnectionInstance = {
        id: connectionId,
        connection: rawConnection,
        createdAt: new Date(),
        lastUsed: new Date(),
        inUse: false,
        healthy: true,
        queryCount: 0,
        errorCount: 0,
        averageResponseTime: 0
      };

      this.connections.set(connectionId, connection);
      
      this.emit('connection-created', { connection_id: connectionId });
      this.logger.debug('Connection created successfully', { connection_id: connectionId });
      
      return connection;
    } catch (error) {
      this.logger.error('Failed to create connection', error);
      throw error;
    }
  }

  private async destroyConnection(connection: ConnectionInstance): Promise<void> {
    try {
      this.logger.debug('Destroying connection', { connection_id: connection.id });
      
      if (connection.connection && typeof connection.connection.end === 'function') {
        await connection.connection.end();
      }
      
      this.connections.delete(connection.id);
      this.emit('connection-destroyed', { connection_id: connection.id });
      
      this.logger.debug('Connection destroyed successfully', { connection_id: connection.id });
    } catch (error) {
      this.logger.error('Failed to destroy connection', error);
      throw error;
    }
  }

  private async queueAcquireRequest(startTime: number): Promise<ConnectionInstance> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waitingClients.findIndex(client => client.resolve === resolve);
        if (index !== -1) {
          this.waitingClients.splice(index, 1);
          reject(new Error('Connection acquire timeout'));
        }
      }, this.config.acquireTimeoutMs);

      this.waitingClients.push({
        resolve: (connection) => {
          clearTimeout(timeout);
          resolve(connection);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
        timestamp: startTime
      });
    });
  }

  private markConnectionInUse(connection: ConnectionInstance): void {
    connection.inUse = true;
    connection.lastUsed = new Date();
  }

  private markConnectionIdle(connection: ConnectionInstance): void {
    connection.inUse = false;
    connection.lastUsed = new Date();
  }

  private getActiveConnections(): ConnectionInstance[] {
    return Array.from(this.connections.values()).filter(conn => conn.inUse);
  }

  private getIdleConnections(): ConnectionInstance[] {
    return Array.from(this.connections.values()).filter(conn => !conn.inUse);
  }

  private getHealthyConnections(): ConnectionInstance[] {
    return Array.from(this.connections.values()).filter(conn => conn.healthy);
  }

  private getHealthyIdleConnections(): ConnectionInstance[] {
    return Array.from(this.connections.values()).filter(conn => !conn.inUse && conn.healthy);
  }

  private shouldDestroyConnection(connection: ConnectionInstance): boolean {
    const now = Date.now();
    const idleTime = now - connection.lastUsed.getTime();
    
    // Destroy if idle too long
    if (idleTime > this.config.idleTimeoutMs) return true;
    
    // Destroy if we have too many connections
    if (this.connections.size > this.config.minConnections) {
      const utilization = this.calculatePoolUtilization();
      if (utilization < this.config.lowLoadThreshold) return true;
    }
    
    return false;
  }

  private calculatePoolUtilization(): number {
    if (this.connections.size === 0) return 0;
    return this.getActiveConnections().length / this.connections.size;
  }

  private async ensureMinConnections(targetCount?: number): Promise<void> {
    const target = targetCount || this.config.minConnections;
    const currentCount = this.connections.size;
    
    if (currentCount >= target) return;
    
    const connectionsToCreate = target - currentCount;
    const creationPromises = Array(connectionsToCreate).fill(0).map(() => this.createConnection());
    
    await Promise.all(creationPromises);
  }

  private startMonitoring(): void {
    // Health check monitoring
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheckIntervalMs);

    // Metrics collection
    this.metricsTimer = setInterval(() => {
      this.collectMetrics();
    }, 10000); // Collect metrics every 10 seconds
  }

  private startAdaptiveScaling(): void {
    this.adaptiveScalingTimer = setInterval(async () => {
      await this.performAdaptiveScaling();
    }, 30000); // Check every 30 seconds
  }

  private async performHealthChecks(): Promise<void> {
    const connections = Array.from(this.connections.values());
    
    for (const connection of connections) {
      try {
        // Perform health check (implementation depends on database type)
        const isHealthy = await this.checkConnectionHealth(connection);
        connection.healthy = isHealthy;
        
        if (!isHealthy) {
          this.logger.warn('Unhealthy connection detected', { connection_id: connection.id });
          await this.destroyConnection(connection);
        }
      } catch (error) {
        this.logger.error('Health check failed', { connection_id: connection.id, error });
        connection.healthy = false;
      }
    }
  }

  private async checkConnectionHealth(connection: ConnectionInstance): Promise<boolean> {
    try {
      // Implementation would depend on the specific database driver
      // This is a placeholder for the actual health check
      if (connection.connection && typeof connection.connection.ping === 'function') {
        await connection.connection.ping();
        return true;
      }
      return true; // Assume healthy if no ping method
    } catch (error) {
      return false;
    }
  }

  private async performAdaptiveScaling(): Promise<void> {
    const currentUtilization = this.calculatePoolUtilization();
    const currentLoad = this.getCurrentLoad();
    
    // Store load history for prediction
    this.loadHistory.push(currentLoad);
    if (this.loadHistory.length > 100) {
      this.loadHistory.shift(); // Keep only last 100 measurements
    }
    
    // Predict future load
    const predictedLoad = this.predictionModel.predictLoad(this.loadHistory);
    
    // Scale up if needed
    if (currentUtilization > this.config.highLoadThreshold || predictedLoad > this.config.highLoadThreshold) {
      const targetConnections = Math.min(
        this.connections.size + Math.ceil(this.connections.size * 0.2),
        this.config.maxConnections
      );
      
      if (targetConnections > this.connections.size) {
        this.logger.info('Scaling up connection pool', {
          current: this.connections.size,
          target: targetConnections,
          utilization: currentUtilization,
          predicted_load: predictedLoad
        });
        
        await this.ensureMinConnections(targetConnections);
      }
    }
    
    // Scale down if needed
    if (currentUtilization < this.config.lowLoadThreshold && predictedLoad < this.config.lowLoadThreshold) {
      const idleConnections = this.getIdleConnections();
      const connectionsToRemove = Math.min(
        Math.floor(idleConnections.length * 0.5),
        this.connections.size - this.config.minConnections
      );
      
      if (connectionsToRemove > 0) {
        this.logger.info('Scaling down connection pool', {
          current: this.connections.size,
          removing: connectionsToRemove,
          utilization: currentUtilization,
          predicted_load: predictedLoad
        });
        
        for (let i = 0; i < connectionsToRemove; i++) {
          if (idleConnections[i]) {
            await this.destroyConnection(idleConnections[i]);
          }
        }
      }
    }
  }

  private getCurrentLoad(): number {
    return this.getActiveConnections().length / this.config.maxConnections;
  }

  private collectMetrics(): void {
    const currentMetrics = this.getMetrics();
    this.metricsHistory.push(currentMetrics);
    
    // Keep only last 1000 metric snapshots
    if (this.metricsHistory.length > 1000) {
      this.metricsHistory.shift();
    }
    
    this.emit('metrics-collected', currentMetrics);
  }

  private updateMetrics(operation: string, duration?: number): void {
    // Update operation-specific metrics
    // Implementation would track various metrics based on operation type
  }

  private initializeMetrics(): ConnectionMetrics {
    return {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      queuedRequests: 0,
      poolUtilization: 0,
      averageAcquireTime: 0,
      averageQueryTime: 0,
      errorRate: 0,
      throughput: 0,
      lastHealthCheck: new Date()
    };
  }
}

/**
 * Load Prediction Model for predictive scaling
 */
class LoadPredictionModel {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  predictLoad(loadHistory: number[]): number {
    if (loadHistory.length < 3) return 0;
    
    // Simple moving average prediction
    const recentHistory = loadHistory.slice(-10);
    const average = recentHistory.reduce((sum, load) => sum + load, 0) / recentHistory.length;
    
    // Simple trend calculation
    const firstHalf = recentHistory.slice(0, Math.floor(recentHistory.length / 2));
    const secondHalf = recentHistory.slice(Math.floor(recentHistory.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, load) => sum + load, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, load) => sum + load, 0) / secondHalf.length;
    
    const trend = secondAvg - firstAvg;
    
    return Math.max(0, Math.min(1, average + trend));
  }
}

/**
 * Connection Load Balancer
 */
class ConnectionLoadBalancer {
  private strategy: LoadBalancingStrategy;
  private logger: Logger;
  private roundRobinIndex = 0;

  constructor(config: PoolConfiguration, logger: Logger) {
    this.logger = logger;
    this.strategy = {
      type: config.loadBalancing ? 'least-connections' : 'round-robin'
    };
  }

  selectConnection(connections: ConnectionInstance[]): ConnectionInstance | null {
    if (connections.length === 0) return null;
    if (connections.length === 1) return connections[0];

    switch (this.strategy.type) {
      case 'round-robin':
        return this.selectRoundRobin(connections);
      case 'least-connections':
        return this.selectLeastConnections(connections);
      case 'random':
        return this.selectRandom(connections);
      default:
        return connections[0];
    }
  }

  private selectRoundRobin(connections: ConnectionInstance[]): ConnectionInstance {
    const connection = connections[this.roundRobinIndex % connections.length];
    this.roundRobinIndex++;
    return connection;
  }

  private selectLeastConnections(connections: ConnectionInstance[]): ConnectionInstance {
    return connections.reduce((best, current) => 
      current.queryCount < best.queryCount ? current : best
    );
  }

  private selectRandom(connections: ConnectionInstance[]): ConnectionInstance {
    return connections[Math.floor(Math.random() * connections.length)];
  }
}