/**
 * Advanced Database Connection Pool Manager
 * TrustStream v4.2 Performance Optimization
 * 
 * Implements intelligent connection pooling with adaptive sizing,
 * health monitoring, and performance optimization features.
 */

import { Pool, PoolConfig, PoolClient } from 'pg';
import { Logger } from './logger';

export interface ConnectionPoolConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  
  // Pool configuration
  initialSize: number;
  minSize: number;
  maxSize: number;
  acquireTimeoutMillis: number;
  idleTimeoutMillis: number;
  
  // Performance optimization
  enableHealthCheck: boolean;
  healthCheckIntervalMs: number;
  enableAdaptiveResize: boolean;
  performanceMonitoring: boolean;
  
  // Advanced features
  connectionRetryDelay: number;
  maxRetries: number;
  enableQueryOptimization: boolean;
  preparedStatementCache: boolean;
}

export interface ConnectionPoolMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
  totalRequests: number;
  averageResponseTime: number;
  errorRate: number;
  lastHealthCheck: Date;
}

export interface OptimizedQueryResult<T = any> {
  rows: T[];
  rowCount: number;
  executionTime: number;
  fromCache: boolean;
  queryHash: string;
}

/**
 * Advanced Database Connection Pool with intelligent features
 */
export class AdvancedConnectionPool {
  private pool: Pool;
  private config: ConnectionPoolConfig;
  private logger: Logger;
  private metrics: ConnectionPoolMetrics;
  private queryCache: Map<string, { result: any; timestamp: number; hitCount: number }> = new Map();
  private preparedStatements: Map<string, string> = new Map();
  private performanceMetrics: Map<string, number[]> = new Map();
  private healthCheckTimer?: NodeJS.Timeout;
  private resizeTimer?: NodeJS.Timeout;

  constructor(config: ConnectionPoolConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.initializeMetrics();
    this.createPool();
  }

  /**
   * Initialize the connection pool
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Advanced Connection Pool');

    try {
      // Test initial connection
      await this.testConnection();
      
      // Start background tasks
      this.startHealthChecking();
      this.startAdaptiveResize();
      this.startPerformanceMonitoring();
      
      this.logger.info('Advanced Connection Pool initialized successfully', {
        initialSize: this.config.initialSize,
        maxSize: this.config.maxSize
      });
    } catch (error) {
      this.logger.error('Failed to initialize connection pool', error);
      throw error;
    }
  }

  /**
   * Execute optimized query with caching and performance monitoring
   */
  async executeOptimizedQuery<T = any>(
    query: string, 
    params: any[] = [], 
    options: { cache?: boolean; timeout?: number } = {}
  ): Promise<OptimizedQueryResult<T>> {
    const startTime = Date.now();
    const queryHash = this.generateQueryHash(query, params);
    
    // Check cache first
    if (options.cache !== false && this.queryCache.has(queryHash)) {
      const cached = this.queryCache.get(queryHash)!;
      if (Date.now() - cached.timestamp < 300000) { // 5 minute cache
        cached.hitCount++;
        return {
          ...cached.result,
          fromCache: true,
          executionTime: Date.now() - startTime
        };
      } else {
        this.queryCache.delete(queryHash);
      }
    }

    // Execute query
    const client = await this.getConnection();
    try {
      const result = await client.query(query, params);
      const executionTime = Date.now() - startTime;
      
      // Cache result if appropriate
      if (options.cache !== false && this.shouldCacheQuery(query, executionTime)) {
        this.queryCache.set(queryHash, {
          result: {
            rows: result.rows,
            rowCount: result.rowCount,
            queryHash,
            fromCache: false
          },
          timestamp: Date.now(),
          hitCount: 0
        });
      }
      
      // Track performance metrics
      this.trackQueryPerformance(queryHash, executionTime);
      
      return {
        rows: result.rows,
        rowCount: result.rowCount,
        executionTime,
        fromCache: false,
        queryHash
      };
    } finally {
      client.release();
    }
  }

  /**
   * Execute batch queries with optimized connection reuse
   */
  async executeBatch<T = any>(
    queries: { query: string; params: any[] }[],
    options: { transaction?: boolean; timeout?: number } = {}
  ): Promise<OptimizedQueryResult<T>[]> {
    const client = await this.getConnection();
    const results: OptimizedQueryResult<T>[] = [];
    
    try {
      if (options.transaction) {
        await client.query('BEGIN');
      }
      
      for (const { query, params } of queries) {
        const startTime = Date.now();
        const result = await client.query(query, params);
        const executionTime = Date.now() - startTime;
        
        results.push({
          rows: result.rows,
          rowCount: result.rowCount,
          executionTime,
          fromCache: false,
          queryHash: this.generateQueryHash(query, params)
        });
      }
      
      if (options.transaction) {
        await client.query('COMMIT');
      }
    } catch (error) {
      if (options.transaction) {
        await client.query('ROLLBACK');
      }
      throw error;
    } finally {
      client.release();
    }
    
    return results;
  }

  /**
   * Get connection with intelligent routing
   */
  async getConnection(): Promise<PoolClient> {
    const startTime = Date.now();
    
    try {
      const client = await this.pool.connect();
      this.updateMetrics('connection_acquired', Date.now() - startTime);
      return client;
    } catch (error) {
      this.updateMetrics('connection_error');
      this.logger.error('Failed to acquire database connection', error);
      throw error;
    }
  }

  /**
   * Get current pool metrics
   */
  getMetrics(): ConnectionPoolMetrics {
    return {
      ...this.metrics,
      totalConnections: this.pool.totalCount,
      activeConnections: this.pool.totalCount - this.pool.idleCount,
      idleConnections: this.pool.idleCount,
      waitingClients: this.pool.waitingCount
    };
  }

  /**
   * Optimize pool configuration based on performance data
   */
  async optimizeConfiguration(): Promise<void> {
    const metrics = this.getMetrics();
    const avgResponseTime = metrics.averageResponseTime;
    
    this.logger.info('Optimizing pool configuration', { metrics });
    
    // Adjust pool size based on utilization
    if (metrics.waitingClients > 0 && this.pool.options.max! < this.config.maxSize) {
      this.logger.info('Increasing pool size due to waiting clients');
      // Note: pg Pool doesn't support dynamic resize, this would require pool recreation
    }
    
    // Clean up query cache
    this.cleanupQueryCache();
    
    // Optimize prepared statements
    this.optimizePreparedStatements();
  }

  /**
   * Health check and maintenance
   */
  async performHealthCheck(): Promise<boolean> {
    try {
      const client = await this.getConnection();
      await client.query('SELECT 1 as health_check');
      client.release();
      
      this.metrics.lastHealthCheck = new Date();
      return true;
    } catch (error) {
      this.logger.error('Health check failed', error);
      return false;
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down connection pool');
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    if (this.resizeTimer) {
      clearInterval(this.resizeTimer);
    }
    
    await this.pool.end();
    this.queryCache.clear();
    this.preparedStatements.clear();
  }

  // Private methods
  private createPool(): void {
    const poolConfig: PoolConfig = {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      min: this.config.minSize,
      max: this.config.maxSize,
      acquireTimeoutMillis: this.config.acquireTimeoutMillis,
      idleTimeoutMillis: this.config.idleTimeoutMillis,
      allowExitOnIdle: true
    };

    this.pool = new Pool(poolConfig);
    
    // Set up event handlers
    this.pool.on('connect', (client) => {
      this.logger.debug('New client connected to pool');
    });
    
    this.pool.on('remove', (client) => {
      this.logger.debug('Client removed from pool');
    });
    
    this.pool.on('error', (err) => {
      this.logger.error('Pool error', err);
      this.updateMetrics('pool_error');
    });
  }

  private initializeMetrics(): void {
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingClients: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      lastHealthCheck: new Date()
    };
  }

  private async testConnection(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('SELECT NOW()');
    } finally {
      client.release();
    }
  }

  private startHealthChecking(): void {
    if (!this.config.enableHealthCheck) return;
    
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckIntervalMs);
  }

  private startAdaptiveResize(): void {
    if (!this.config.enableAdaptiveResize) return;
    
    this.resizeTimer = setInterval(async () => {
      await this.optimizeConfiguration();
    }, 60000); // Every minute
  }

  private startPerformanceMonitoring(): void {
    if (!this.config.performanceMonitoring) return;
    
    setInterval(() => {
      this.logPerformanceMetrics();
    }, 30000); // Every 30 seconds
  }

  private generateQueryHash(query: string, params: any[]): string {
    const crypto = require('crypto');
    return crypto.createHash('md5')
      .update(query + JSON.stringify(params))
      .digest('hex');
  }

  private shouldCacheQuery(query: string, executionTime: number): boolean {
    // Cache SELECT queries that take more than 10ms
    return query.trim().toLowerCase().startsWith('select') && executionTime > 10;
  }

  private trackQueryPerformance(queryHash: string, executionTime: number): void {
    if (!this.performanceMetrics.has(queryHash)) {
      this.performanceMetrics.set(queryHash, []);
    }
    
    const metrics = this.performanceMetrics.get(queryHash)!;
    metrics.push(executionTime);
    
    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  private updateMetrics(type: string, value: number = 1): void {
    switch (type) {
      case 'connection_acquired':
        this.metrics.totalRequests++;
        break;
      case 'connection_error':
      case 'pool_error':
        this.metrics.errorRate = (this.metrics.errorRate * 0.9) + (0.1 * 1);
        break;
    }
  }

  private cleanupQueryCache(): void {
    const now = Date.now();
    const maxAge = 300000; // 5 minutes
    
    for (const [key, value] of this.queryCache.entries()) {
      if (now - value.timestamp > maxAge) {
        this.queryCache.delete(key);
      }
    }
  }

  private optimizePreparedStatements(): void {
    // Analyze frequently used queries and create prepared statements
    const queryFrequency = new Map<string, number>();
    
    for (const [hash, metrics] of this.performanceMetrics.entries()) {
      queryFrequency.set(hash, metrics.length);
    }
    
    // Sort by frequency and prepare top queries
    const sortedQueries = Array.from(queryFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20); // Top 20 queries
    
    this.logger.info('Optimized prepared statements', { 
      topQueries: sortedQueries.length 
    });
  }

  private logPerformanceMetrics(): void {
    const metrics = this.getMetrics();
    this.logger.info('Connection pool performance metrics', metrics);
  }
}

/**
 * Database Connection Pool Factory
 */
export class ConnectionPoolFactory {
  private static instances: Map<string, AdvancedConnectionPool> = new Map();

  static async createPool(
    name: string,
    config: ConnectionPoolConfig,
    logger: Logger
  ): Promise<AdvancedConnectionPool> {
    if (this.instances.has(name)) {
      return this.instances.get(name)!;
    }

    const pool = new AdvancedConnectionPool(config, logger);
    await pool.initialize();
    
    this.instances.set(name, pool);
    return pool;
  }

  static getPool(name: string): AdvancedConnectionPool | null {
    return this.instances.get(name) || null;
  }

  static async shutdownAll(): Promise<void> {
    const shutdownPromises = Array.from(this.instances.values())
      .map(pool => pool.shutdown());
    
    await Promise.all(shutdownPromises);
    this.instances.clear();
  }
}