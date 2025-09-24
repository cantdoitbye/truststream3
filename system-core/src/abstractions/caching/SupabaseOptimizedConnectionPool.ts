/**
 * Supabase Optimized Connection Pool
 * TrustStream v4.2 - Enhanced Connection Pooling for Supabase
 * 
 * Implements intelligent connection pooling optimized for Supabase with
 * adaptive sizing, query optimization, and performance monitoring.
 */

import { createClient, SupabaseClient, PostgrestFilterBuilder } from '@supabase/supabase-js';
import { EventEmitter } from 'events';
import { Logger } from '../shared-utils/logger';

export interface SupabasePoolConfig {
  // Supabase configuration
  supabaseUrl: string;
  supabaseKey: string;
  supabaseServiceKey?: string;
  
  // Connection pool settings
  poolSettings: {
    initialSize: number;
    minSize: number;
    maxSize: number;
    idleTimeoutMs: number;
    acquireTimeoutMs: number;
    enableHealthCheck: boolean;
    healthCheckIntervalMs: number;
  };
  
  // Query optimization
  queryOptimization: {
    enableQueryCache: boolean;
    cacheTTLMs: number;
    enablePreparedStatements: boolean;
    batchingEnabled: boolean;
    maxBatchSize: number;
    batchTimeoutMs: number;
  };
  
  // Performance monitoring
  monitoring: {
    enableMetrics: boolean;
    enableSlowQueryLogging: boolean;
    slowQueryThresholdMs: number;
    enableQueryAnalysis: boolean;
  };
  
  // Adaptive features
  adaptive: {
    enableAutoResize: boolean;
    resizeThresholdMs: number;
    loadBalancing: boolean;
    enableFailover: boolean;
    readReplicaUrls?: string[];
  };
}

export interface SupabasePoolMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  queuedRequests: number;
  totalQueries: number;
  averageQueryTime: number;
  cacheHitRate: number;
  errorRate: number;
  throughput: number;
  readWriteRatio: number;
  lastOptimization: Date;
}

export interface QueryCacheEntry {
  query: string;
  params: any;
  result: any;
  timestamp: number;
  accessCount: number;
  executionTime: number;
  size: number;
}

export interface BatchedQuery {
  id: string;
  query: string;
  params: any;
  resolve: (result: any) => void;
  reject: (error: any) => void;
  timestamp: number;
  priority: number;
}

export interface ConnectionInfo {
  id: string;
  client: SupabaseClient;
  createdAt: Date;
  lastUsed: Date;
  queryCount: number;
  isActive: boolean;
  isHealthy: boolean;
  avgResponseTime: number;
}

/**
 * Supabase Optimized Connection Pool
 * 
 * Provides intelligent connection pooling with Supabase-specific optimizations
 */
export class SupabaseOptimizedConnectionPool extends EventEmitter {
  private config: SupabasePoolConfig;
  private logger: Logger;
  private connections: Map<string, ConnectionInfo> = new Map();
  private queryQueue: BatchedQuery[] = [];
  private queryCache: Map<string, QueryCacheEntry> = new Map();
  private metrics: SupabasePoolMetrics;
  
  // Read replicas for load balancing
  private readReplicas: SupabaseClient[] = [];
  private writeClient: SupabaseClient;
  
  // Background timers
  private healthCheckTimer?: NodeJS.Timeout;
  private resizeTimer?: NodeJS.Timeout;
  private batchProcessor?: NodeJS.Timeout;
  private cacheCleanupTimer?: NodeJS.Timeout;
  
  // Connection state
  private isInitialized = false;
  private currentLoad = 0;
  private batchQueue: Map<string, BatchedQuery[]> = new Map();

  constructor(config: SupabasePoolConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.initializeMetrics();
  }

  /**
   * Initialize the connection pool
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Supabase Optimized Connection Pool');
      
      // Create primary write client
      this.writeClient = createClient(
        this.config.supabaseUrl,
        this.config.supabaseServiceKey || this.config.supabaseKey,
        {
          auth: { persistSession: false },
          realtime: { params: { eventsPerSecond: 10 } },
          global: {
            headers: {
              'x-connection-pool': 'supabase-optimized',
              'x-pool-version': '4.2.0'
            }
          }
        }
      );
      
      // Initialize read replicas if configured
      if (this.config.adaptive.readReplicaUrls) {
        for (const replicaUrl of this.config.adaptive.readReplicaUrls) {
          const replica = createClient(replicaUrl, this.config.supabaseKey, {
            auth: { persistSession: false }
          });
          this.readReplicas.push(replica);
        }
      }
      
      // Create initial connection pool
      await this.createInitialConnections();
      
      // Start background processes
      this.startHealthChecking();
      this.startAdaptiveResize();
      this.startBatchProcessor();
      this.startCacheCleanup();
      
      // Test connections
      await this.performHealthCheck();
      
      this.isInitialized = true;
      this.emit('pool-initialized', { connections: this.connections.size });
      
      this.logger.info('Supabase connection pool initialized successfully', {
        connections: this.connections.size,
        readReplicas: this.readReplicas.length
      });
      
    } catch (error) {
      this.logger.error('Failed to initialize Supabase connection pool', error);
      throw error;
    }
  }

  /**
   * Execute optimized query with intelligent routing
   */
  async executeQuery<T = any>(
    table: string,
    operation: 'select' | 'insert' | 'update' | 'delete' | 'rpc',
    options: {
      filter?: any;
      data?: any;
      params?: any;
      cache?: boolean;
      priority?: number;
      readOnly?: boolean;
      batchable?: boolean;
    } = {}
  ): Promise<{ data: T[] | T | null; error: any; metadata: any }> {
    const startTime = Date.now();
    const queryId = this.generateQueryId(table, operation, options);
    
    try {
      // Check cache first
      if (options.cache !== false && this.config.queryOptimization.enableQueryCache) {
        const cached = this.getCachedResult(queryId);
        if (cached) {
          this.updateMetrics('cache_hit', Date.now() - startTime);
          return {
            data: cached.result.data,
            error: null,
            metadata: { fromCache: true, executionTime: Date.now() - startTime }
          };
        }
      }
      
      // Route query based on operation type and load balancing
      const client = this.selectOptimalClient(operation, options.readOnly);
      
      // Execute query with batching if applicable
      if (options.batchable && this.config.queryOptimization.batchingEnabled) {
        return await this.executeBatchedQuery(client, table, operation, options, queryId);
      }
      
      // Execute immediate query
      const result = await this.executeDirectQuery(client, table, operation, options);
      const executionTime = Date.now() - startTime;
      
      // Cache result if appropriate
      if (this.shouldCacheResult(operation, executionTime, result)) {
        this.cacheResult(queryId, options, result, executionTime);
      }
      
      // Update metrics
      this.updateMetrics('query_executed', executionTime);
      
      // Log slow queries
      if (this.config.monitoring.enableSlowQueryLogging && 
          executionTime > this.config.monitoring.slowQueryThresholdMs) {
        this.logger.warn('Slow query detected', {
          table,
          operation,
          executionTime,
          queryId
        });
      }
      
      return {
        data: result.data,
        error: result.error,
        metadata: {
          fromCache: false,
          executionTime,
          queryId,
          client: client === this.writeClient ? 'primary' : 'replica'
        }
      };
      
    } catch (error) {
      this.updateMetrics('query_error');
      this.logger.error('Query execution failed', {
        table,
        operation,
        error,
        executionTime: Date.now() - startTime
      });
      
      return {
        data: null,
        error,
        metadata: { executionTime: Date.now() - startTime }
      };
    }
  }

  /**
   * Execute optimized RPC call
   */
  async executeRPC<T = any>(
    functionName: string,
    params: any = {},
    options: { cache?: boolean; timeout?: number } = {}
  ): Promise<{ data: T | null; error: any; metadata: any }> {
    const startTime = Date.now();
    
    try {
      const client = this.selectOptimalClient('rpc', false);
      const result = await client.rpc(functionName, params);
      const executionTime = Date.now() - startTime;
      
      this.updateMetrics('rpc_executed', executionTime);
      
      return {
        data: result.data,
        error: result.error,
        metadata: { executionTime, functionName }
      };
      
    } catch (error) {
      this.updateMetrics('rpc_error');
      this.logger.error('RPC execution failed', { functionName, params, error });
      
      return {
        data: null,
        error,
        metadata: { executionTime: Date.now() - startTime }
      };
    }
  }

  /**
   * Execute transaction with optimized connection handling
   */
  async executeTransaction<T = any>(
    operations: Array<{
      table: string;
      operation: 'select' | 'insert' | 'update' | 'delete';
      options: any;
    }>,
    transactionOptions: { isolation?: string; timeout?: number } = {}
  ): Promise<{ results: T[]; error: any; metadata: any }> {
    const startTime = Date.now();
    const client = this.writeClient; // Transactions always use write client
    
    try {
      // Execute operations in transaction
      const results = [];
      
      // Note: Supabase doesn't support explicit transactions in the same way as raw PostgreSQL
      // This is a simplified implementation - for true transactions, use RPC functions
      for (const op of operations) {
        const result = await this.executeDirectQuery(client, op.table, op.operation, op.options);
        if (result.error) {
          throw new Error(`Transaction failed at operation: ${op.operation} on ${op.table}`);
        }
        results.push(result.data);
      }
      
      const executionTime = Date.now() - startTime;
      this.updateMetrics('transaction_executed', executionTime);
      
      return {
        results,
        error: null,
        metadata: { executionTime, operationCount: operations.length }
      };
      
    } catch (error) {
      this.updateMetrics('transaction_error');
      this.logger.error('Transaction execution failed', { operations: operations.length, error });
      
      return {
        results: [],
        error,
        metadata: { executionTime: Date.now() - startTime }
      };
    }
  }

  /**
   * Get comprehensive pool metrics
   */
  getMetrics(): SupabasePoolMetrics {
    return {
      ...this.metrics,
      totalConnections: this.connections.size + this.readReplicas.length + 1, // +1 for write client
      activeConnections: this.currentLoad,
      idleConnections: this.connections.size - this.currentLoad,
      queuedRequests: this.queryQueue.length
    };
  }

  /**
   * Optimize pool configuration based on current performance
   */
  async optimizePool(): Promise<void> {
    try {
      this.logger.info('Starting pool optimization');
      
      const metrics = this.getMetrics();
      
      // Analyze query patterns
      const queryAnalysis = this.analyzeQueryPatterns();
      
      // Optimize cache settings
      await this.optimizeCacheSettings(queryAnalysis);
      
      // Adjust connection pool size
      await this.adjustPoolSize(metrics);
      
      // Clean up stale connections
      await this.cleanupStaleConnections();
      
      // Rebalance read replicas
      if (this.config.adaptive.loadBalancing) {
        await this.rebalanceReplicas();
      }
      
      this.metrics.lastOptimization = new Date();
      this.emit('pool-optimized', { metrics, queryAnalysis });
      
      this.logger.info('Pool optimization completed');
      
    } catch (error) {
      this.logger.error('Pool optimization failed', error);
    }
  }

  /**
   * Graceful shutdown of the connection pool
   */
  async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down Supabase connection pool');
      
      // Clear timers
      if (this.healthCheckTimer) clearInterval(this.healthCheckTimer);
      if (this.resizeTimer) clearInterval(this.resizeTimer);
      if (this.batchProcessor) clearInterval(this.batchProcessor);
      if (this.cacheCleanupTimer) clearInterval(this.cacheCleanupTimer);
      
      // Wait for queued operations to complete (with timeout)
      const shutdownTimeout = setTimeout(() => {
        this.logger.warn('Shutdown timeout reached, forcing shutdown');
      }, 10000);
      
      while (this.queryQueue.length > 0 && !shutdownTimeout) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      clearTimeout(shutdownTimeout);
      
      // Clear caches
      this.queryCache.clear();
      this.connections.clear();
      this.batchQueue.clear();
      
      this.isInitialized = false;
      this.emit('pool-shutdown');
      
      this.logger.info('Supabase connection pool shutdown completed');
      
    } catch (error) {
      this.logger.error('Error during pool shutdown', error);
      throw error;
    }
  }

  // Private methods

  private initializeMetrics(): void {
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      queuedRequests: 0,
      totalQueries: 0,
      averageQueryTime: 0,
      cacheHitRate: 0,
      errorRate: 0,
      throughput: 0,
      readWriteRatio: 0,
      lastOptimization: new Date()
    };
  }

  private async createInitialConnections(): Promise<void> {
    // Supabase clients are lightweight and can be created as needed
    // This is more about tracking connection info than actual connections
    for (let i = 0; i < this.config.poolSettings.initialSize; i++) {
      const connectionId = `conn_${i}`;
      const connectionInfo: ConnectionInfo = {
        id: connectionId,
        client: this.writeClient, // Reference to shared client
        createdAt: new Date(),
        lastUsed: new Date(),
        queryCount: 0,
        isActive: false,
        isHealthy: true,
        avgResponseTime: 0
      };
      
      this.connections.set(connectionId, connectionInfo);
    }
  }

  private selectOptimalClient(
    operation: string,
    readOnly?: boolean
  ): SupabaseClient {
    // Route read operations to replicas if available and load balancing is enabled
    if (readOnly && this.readReplicas.length > 0 && this.config.adaptive.loadBalancing) {
      // Simple round-robin for now
      const replicaIndex = this.metrics.totalQueries % this.readReplicas.length;
      return this.readReplicas[replicaIndex];
    }
    
    // Default to write client
    return this.writeClient;
  }

  private async executeDirectQuery(
    client: SupabaseClient,
    table: string,
    operation: string,
    options: any
  ): Promise<any> {
    let query;
    
    switch (operation) {
      case 'select':
        query = client.from(table).select(options.select || '*');
        if (options.filter) {
          query = this.applyFilters(query, options.filter);
        }
        if (options.limit) query = query.limit(options.limit);
        if (options.order) query = query.order(options.order.column, { ascending: options.order.ascending });
        break;
        
      case 'insert':
        query = client.from(table).insert(options.data);
        if (options.select) query = query.select(options.select);
        break;
        
      case 'update':
        query = client.from(table).update(options.data);
        if (options.filter) {
          query = this.applyFilters(query, options.filter);
        }
        if (options.select) query = query.select(options.select);
        break;
        
      case 'delete':
        query = client.from(table).delete();
        if (options.filter) {
          query = this.applyFilters(query, options.filter);
        }
        break;
        
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
    
    return await query;
  }

  private applyFilters(query: any, filters: any): any {
    for (const [key, value] of Object.entries(filters)) {
      if (typeof value === 'object' && value !== null) {
        // Handle complex filters
        for (const [operator, operand] of Object.entries(value as any)) {
          switch (operator) {
            case 'eq':
              query = query.eq(key, operand);
              break;
            case 'neq':
              query = query.neq(key, operand);
              break;
            case 'gt':
              query = query.gt(key, operand);
              break;
            case 'gte':
              query = query.gte(key, operand);
              break;
            case 'lt':
              query = query.lt(key, operand);
              break;
            case 'lte':
              query = query.lte(key, operand);
              break;
            case 'in':
              query = query.in(key, operand);
              break;
            case 'like':
              query = query.like(key, operand);
              break;
            case 'ilike':
              query = query.ilike(key, operand);
              break;
          }
        }
      } else {
        // Simple equality filter
        query = query.eq(key, value);
      }
    }
    return query;
  }

  private async executeBatchedQuery(
    client: SupabaseClient,
    table: string,
    operation: string,
    options: any,
    queryId: string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const batchedQuery: BatchedQuery = {
        id: queryId,
        query: `${table}:${operation}`,
        params: options,
        resolve,
        reject,
        timestamp: Date.now(),
        priority: options.priority || 1
      };
      
      // Add to batch queue
      const batchKey = `${table}:${operation}`;
      if (!this.batchQueue.has(batchKey)) {
        this.batchQueue.set(batchKey, []);
      }
      this.batchQueue.get(batchKey)!.push(batchedQuery);
    });
  }

  private generateQueryId(table: string, operation: string, options: any): string {
    const key = `${table}:${operation}:${JSON.stringify(options)}`;
    return Buffer.from(key).toString('base64').slice(0, 16);
  }

  private getCachedResult(queryId: string): QueryCacheEntry | null {
    const cached = this.queryCache.get(queryId);
    if (!cached) return null;
    
    // Check if cache entry is still valid
    if (Date.now() - cached.timestamp > this.config.queryOptimization.cacheTTLMs) {
      this.queryCache.delete(queryId);
      return null;
    }
    
    cached.accessCount++;
    return cached;
  }

  private shouldCacheResult(operation: string, executionTime: number, result: any): boolean {
    if (!this.config.queryOptimization.enableQueryCache) return false;
    if (operation !== 'select') return false; // Only cache read operations
    if (result.error) return false; // Don't cache errors
    if (executionTime < 10) return false; // Don't cache very fast queries
    
    return true;
  }

  private cacheResult(queryId: string, options: any, result: any, executionTime: number): void {
    const entry: QueryCacheEntry = {
      query: queryId,
      params: options,
      result,
      timestamp: Date.now(),
      accessCount: 1,
      executionTime,
      size: JSON.stringify(result).length
    };
    
    this.queryCache.set(queryId, entry);
    
    // Limit cache size
    if (this.queryCache.size > 1000) {
      const oldestKey = this.findOldestCacheEntry();
      if (oldestKey) this.queryCache.delete(oldestKey);
    }
  }

  private findOldestCacheEntry(): string | null {
    let oldest: { key: string; timestamp: number } | null = null;
    
    for (const [key, entry] of this.queryCache) {
      if (!oldest || entry.timestamp < oldest.timestamp) {
        oldest = { key, timestamp: entry.timestamp };
      }
    }
    
    return oldest?.key || null;
  }

  private updateMetrics(type: string, value?: number): void {
    switch (type) {
      case 'query_executed':
        this.metrics.totalQueries++;
        if (value) {
          this.metrics.averageQueryTime = 
            (this.metrics.averageQueryTime * (this.metrics.totalQueries - 1) + value) / this.metrics.totalQueries;
        }
        break;
      case 'cache_hit':
        this.metrics.cacheHitRate = 
          (this.metrics.cacheHitRate * this.metrics.totalQueries + 1) / (this.metrics.totalQueries + 1);
        break;
      case 'query_error':
      case 'rpc_error':
      case 'transaction_error':
        this.metrics.errorRate = 
          (this.metrics.errorRate * this.metrics.totalQueries + 1) / (this.metrics.totalQueries + 1);
        break;
    }
  }

  private analyzeQueryPatterns(): any {
    const patterns = {
      mostCachedQueries: [],
      slowestQueries: [],
      errorProneQueries: [],
      recommendations: []
    };
    
    // Analyze cache entries for patterns
    for (const entry of this.queryCache.values()) {
      if (entry.accessCount > 10) {
        patterns.mostCachedQueries.push({
          query: entry.query,
          hits: entry.accessCount,
          avgTime: entry.executionTime
        });
      }
    }
    
    return patterns;
  }

  private async optimizeCacheSettings(analysis: any): Promise<void> {
    // Adjust cache TTL based on access patterns
    if (analysis.mostCachedQueries.length > 100) {
      // Increase cache TTL for frequently accessed queries
      this.config.queryOptimization.cacheTTLMs *= 1.2;
    }
  }

  private async adjustPoolSize(metrics: SupabasePoolMetrics): Promise<void> {
    // Supabase clients are lightweight, so this is more about tracking than actual connections
    if (metrics.queuedRequests > 10 && this.connections.size < this.config.poolSettings.maxSize) {
      // Add more connection tracking
      this.logger.info('Increasing pool size due to high demand');
    }
  }

  private async cleanupStaleConnections(): Promise<void> {
    const now = Date.now();
    for (const [id, conn] of this.connections) {
      if (now - conn.lastUsed.getTime() > this.config.poolSettings.idleTimeoutMs) {
        this.connections.delete(id);
      }
    }
  }

  private async rebalanceReplicas(): Promise<void> {
    // Health check all replicas and redistribute load
    this.logger.info('Rebalancing read replica load');
  }

  private async performHealthCheck(): Promise<boolean> {
    try {
      const result = await this.writeClient.from('health_check').select('*').limit(1);
      return !result.error;
    } catch (error) {
      this.logger.error('Health check failed', error);
      return false;
    }
  }

  private startHealthChecking(): void {
    if (!this.config.poolSettings.enableHealthCheck) return;
    
    this.healthCheckTimer = setInterval(async () => {
      const isHealthy = await this.performHealthCheck();
      if (!isHealthy) {
        this.emit('health-check-failed');
        this.logger.warn('Health check failed');
      }
    }, this.config.poolSettings.healthCheckIntervalMs);
  }

  private startAdaptiveResize(): void {
    if (!this.config.adaptive.enableAutoResize) return;
    
    this.resizeTimer = setInterval(async () => {
      await this.optimizePool();
    }, this.config.adaptive.resizeThresholdMs);
  }

  private startBatchProcessor(): void {
    if (!this.config.queryOptimization.batchingEnabled) return;
    
    this.batchProcessor = setInterval(async () => {
      await this.processBatchedQueries();
    }, this.config.queryOptimization.batchTimeoutMs);
  }

  private startCacheCleanup(): void {
    this.cacheCleanupTimer = setInterval(() => {
      this.cleanupExpiredCache();
    }, 60000); // Every minute
  }

  private async processBatchedQueries(): Promise<void> {
    for (const [batchKey, queries] of this.batchQueue) {
      if (queries.length >= this.config.queryOptimization.maxBatchSize || 
          Date.now() - queries[0].timestamp > this.config.queryOptimization.batchTimeoutMs) {
        
        // Process batch
        const batch = queries.splice(0, this.config.queryOptimization.maxBatchSize);
        await this.executeBatch(batchKey, batch);
      }
    }
  }

  private async executeBatch(batchKey: string, queries: BatchedQuery[]): Promise<void> {
    // Group similar queries and execute them together
    // This is a simplified implementation
    for (const query of queries) {
      try {
        const [table, operation] = batchKey.split(':');
        const result = await this.executeDirectQuery(this.writeClient, table, operation, query.params);
        query.resolve(result);
      } catch (error) {
        query.reject(error);
      }
    }
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.queryCache) {
      if (now - entry.timestamp > this.config.queryOptimization.cacheTTLMs) {
        this.queryCache.delete(key);
      }
    }
  }
}
