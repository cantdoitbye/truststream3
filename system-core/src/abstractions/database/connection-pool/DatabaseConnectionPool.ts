/**
 * Database Connection Pool Manager
 * Provider-agnostic connection pooling with health monitoring
 */

import { DatabaseConfig, DatabaseStats, ConnectionError } from '../../../shared-utils/database-interface';
import { EventEmitter } from 'events';

export interface PoolConnection {
  id: string;
  connection: any;
  createdAt: Date;
  lastUsedAt: Date;
  isActive: boolean;
  queryCount: number;
}

export interface PoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  totalQueries: number;
  averageQueryTime: number;
  errorCount: number;
  poolUtilization: number;
}

export interface PoolOptions {
  minConnections?: number;
  maxConnections?: number;
  acquireTimeout?: number;
  idleTimeout?: number;
  maxLifetime?: number;
  healthCheckInterval?: number;
  reconnectOnError?: boolean;
}

export class DatabaseConnectionPool extends EventEmitter {
  private connections: Map<string, PoolConnection> = new Map();
  private waitingQueue: Array<{ resolve: Function; reject: Function; timestamp: Date }> = [];
  private config: DatabaseConfig;
  private options: Required<PoolOptions>;
  private isInitialized = false;
  private healthCheckTimer?: NodeJS.Timeout;
  private stats: PoolStats;
  private createConnection: () => Promise<any>;
  private validateConnection: (connection: any) => Promise<boolean>;
  private closeConnection: (connection: any) => Promise<void>;

  constructor(
    config: DatabaseConfig,
    createConnectionFn: () => Promise<any>,
    validateConnectionFn: (connection: any) => Promise<boolean>,
    closeConnectionFn: (connection: any) => Promise<void>,
    options: PoolOptions = {}
  ) {
    super();
    this.config = config;
    this.createConnection = createConnectionFn;
    this.validateConnection = validateConnectionFn;
    this.closeConnection = closeConnectionFn;
    
    this.options = {
      minConnections: options.minConnections ?? 2,
      maxConnections: options.maxConnections ?? config.options?.maxConnections ?? 10,
      acquireTimeout: options.acquireTimeout ?? 30000,
      idleTimeout: options.idleTimeout ?? 600000, // 10 minutes
      maxLifetime: options.maxLifetime ?? 3600000, // 1 hour
      healthCheckInterval: options.healthCheckInterval ?? 30000, // 30 seconds
      reconnectOnError: options.reconnectOnError ?? true
    };

    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingRequests: 0,
      totalQueries: 0,
      averageQueryTime: 0,
      errorCount: 0,
      poolUtilization: 0
    };
  }

  /**
   * Initialize the connection pool
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Create minimum connections
      for (let i = 0; i < this.options.minConnections; i++) {
        await this.createNewConnection();
      }

      // Start health check timer
      this.startHealthCheck();
      
      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      throw new ConnectionError(`Failed to initialize connection pool: ${error}`);
    }
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire(): Promise<PoolConnection> {
    if (!this.isInitialized) {
      throw new ConnectionError('Connection pool is not initialized');
    }

    const startTime = Date.now();
    this.stats.waitingRequests++;

    try {
      // Try to get an idle connection
      const idleConnection = this.getIdleConnection();
      if (idleConnection) {
        this.stats.waitingRequests--;
        this.activateConnection(idleConnection);
        return idleConnection;
      }

      // Create new connection if under limit
      if (this.connections.size < this.options.maxConnections) {
        const newConnection = await this.createNewConnection();
        this.stats.waitingRequests--;
        this.activateConnection(newConnection);
        return newConnection;
      }

      // Wait for available connection
      return await this.waitForConnection();
    } catch (error) {
      this.stats.waitingRequests--;
      this.stats.errorCount++;
      throw error;
    } finally {
      const waitTime = Date.now() - startTime;
      this.emit('connectionAcquired', { waitTime });
    }
  }

  /**
   * Release a connection back to the pool
   */
  async release(poolConnection: PoolConnection): Promise<void> {
    if (!this.connections.has(poolConnection.id)) {
      return; // Connection not in pool
    }

    poolConnection.isActive = false;
    poolConnection.lastUsedAt = new Date();
    this.stats.activeConnections--;
    this.stats.idleConnections++;

    // Process waiting queue
    if (this.waitingQueue.length > 0) {
      const waiter = this.waitingQueue.shift();
      if (waiter) {
        this.activateConnection(poolConnection);
        waiter.resolve(poolConnection);
        return;
      }
    }

    this.emit('connectionReleased', { connectionId: poolConnection.id });
  }

  /**
   * Execute a query with automatic connection management
   */
  async execute<T>(
    operation: (connection: any) => Promise<T>
  ): Promise<T> {
    const poolConnection = await this.acquire();
    const startTime = Date.now();

    try {
      const result = await operation(poolConnection.connection);
      
      // Update statistics
      const queryTime = Date.now() - startTime;
      this.updateQueryStats(queryTime);
      poolConnection.queryCount++;
      
      return result;
    } catch (error) {
      this.stats.errorCount++;
      throw error;
    } finally {
      await this.release(poolConnection);
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): PoolStats {
    this.stats.totalConnections = this.connections.size;
    this.stats.poolUtilization = this.stats.activeConnections / this.options.maxConnections;
    return { ...this.stats };
  }

  /**
   * Health check for all connections
   */
  async healthCheck(): Promise<{ healthy: number; unhealthy: number; errors: string[] }> {
    const results = { healthy: 0, unhealthy: 0, errors: [] as string[] };

    for (const [id, poolConnection] of this.connections) {
      try {
        const isValid = await this.validateConnection(poolConnection.connection);
        if (isValid) {
          results.healthy++;
        } else {
          results.unhealthy++;
          results.errors.push(`Connection ${id} is invalid`);
          
          if (this.options.reconnectOnError) {
            await this.recreateConnection(poolConnection);
          }
        }
      } catch (error) {
        results.unhealthy++;
        results.errors.push(`Connection ${id} health check failed: ${error}`);
        
        if (this.options.reconnectOnError) {
          await this.recreateConnection(poolConnection);
        }
      }
    }

    return results;
  }

  /**
   * Close all connections and shutdown pool
   */
  async shutdown(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // Reject all waiting requests
    for (const waiter of this.waitingQueue) {
      waiter.reject(new ConnectionError('Connection pool is shutting down'));
    }
    this.waitingQueue.length = 0;

    // Close all connections
    const closePromises = Array.from(this.connections.values()).map(async (poolConnection) => {
      try {
        await this.closeConnection(poolConnection.connection);
      } catch (error) {
        console.warn(`Error closing connection ${poolConnection.id}:`, error);
      }
    });

    await Promise.allSettled(closePromises);
    this.connections.clear();
    this.isInitialized = false;
    
    this.emit('shutdown');
  }

  /**
   * Force remove old connections
   */
  async cleanup(): Promise<number> {
    const now = Date.now();
    let removedCount = 0;

    for (const [id, poolConnection] of this.connections) {
      const age = now - poolConnection.createdAt.getTime();
      const idleTime = now - poolConnection.lastUsedAt.getTime();

      if (
        !poolConnection.isActive &&
        (age > this.options.maxLifetime || idleTime > this.options.idleTimeout) &&
        this.connections.size > this.options.minConnections
      ) {
        try {
          await this.closeConnection(poolConnection.connection);
          this.connections.delete(id);
          this.stats.idleConnections--;
          removedCount++;
        } catch (error) {
          console.warn(`Error removing connection ${id}:`, error);
        }
      }
    }

    // Ensure minimum connections
    while (this.connections.size < this.options.minConnections) {
      try {
        await this.createNewConnection();
      } catch (error) {
        console.error('Failed to create minimum connection during cleanup:', error);
        break;
      }
    }

    return removedCount;
  }

  private async createNewConnection(): Promise<PoolConnection> {
    const connection = await this.createConnection();
    const poolConnection: PoolConnection = {
      id: this.generateConnectionId(),
      connection,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      isActive: false,
      queryCount: 0
    };

    this.connections.set(poolConnection.id, poolConnection);
    this.stats.idleConnections++;
    
    return poolConnection;
  }

  private getIdleConnection(): PoolConnection | null {
    for (const poolConnection of this.connections.values()) {
      if (!poolConnection.isActive) {
        return poolConnection;
      }
    }
    return null;
  }

  private activateConnection(poolConnection: PoolConnection): void {
    poolConnection.isActive = true;
    poolConnection.lastUsedAt = new Date();
    this.stats.activeConnections++;
    this.stats.idleConnections--;
  }

  private async waitForConnection(): Promise<PoolConnection> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waitingQueue.findIndex(w => w.resolve === resolve);
        if (index !== -1) {
          this.waitingQueue.splice(index, 1);
          this.stats.waitingRequests--;
        }
        reject(new ConnectionError(`Connection acquire timeout after ${this.options.acquireTimeout}ms`));
      }, this.options.acquireTimeout);

      this.waitingQueue.push({
        resolve: (connection: PoolConnection) => {
          clearTimeout(timeout);
          resolve(connection);
        },
        reject: (error: Error) => {
          clearTimeout(timeout);
          reject(error);
        },
        timestamp: new Date()
      });
    });
  }

  private async recreateConnection(poolConnection: PoolConnection): Promise<void> {
    try {
      await this.closeConnection(poolConnection.connection);
    } catch (error) {
      console.warn(`Error closing invalid connection ${poolConnection.id}:`, error);
    }

    try {
      const newConnection = await this.createConnection();
      poolConnection.connection = newConnection;
      poolConnection.createdAt = new Date();
      poolConnection.lastUsedAt = new Date();
      poolConnection.queryCount = 0;
    } catch (error) {
      // Remove the connection if recreation fails
      this.connections.delete(poolConnection.id);
      if (poolConnection.isActive) {
        this.stats.activeConnections--;
      } else {
        this.stats.idleConnections--;
      }
      throw error;
    }
  }

  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.healthCheck();
        await this.cleanup();
      } catch (error) {
        console.error('Health check error:', error);
      }
    }, this.options.healthCheckInterval);
  }

  private updateQueryStats(queryTime: number): void {
    this.stats.totalQueries++;
    this.stats.averageQueryTime = 
      (this.stats.averageQueryTime * (this.stats.totalQueries - 1) + queryTime) / this.stats.totalQueries;
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}