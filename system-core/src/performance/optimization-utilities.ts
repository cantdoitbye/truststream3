/**
 * Performance Optimization Utilities for Enhanced Trust Scoring
 * TrustStream v4.2 - Caching, Monitoring, and Optimization
 * 
 * Author: MiniMax Agent
 * Date: 2025-09-20
 * 
 * Provides performance optimization features including:
 * - Intelligent caching system
 * - Performance monitoring
 * - Resource management
 * - Query optimization
 */

import { Logger } from '../shared-utils/logger';

// ================================================================
// INTERFACES AND TYPES
// ================================================================

interface CacheEntry {
  key: string;
  value: any;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

interface PerformanceMetrics {
  execution_time_ms: number;
  memory_usage_mb: number;
  cache_hit_rate: number;
  database_query_count: number;
  feature_calculation_time: Record<string, number>;
}

interface OptimizationSettings {
  caching_enabled: boolean;
  cache_ttl_seconds: number;
  max_cache_size: number;
  performance_monitoring: boolean;
  query_optimization: boolean;
  resource_limits: {
    max_execution_time_ms: number;
    max_memory_usage_mb: number;
    max_database_connections: number;
  };
}

// ================================================================
// INTELLIGENT CACHING SYSTEM
// ================================================================

export class IntelligentCache {
  private cache: Map<string, CacheEntry> = new Map();
  private logger: Logger;
  private maxSize: number;
  private defaultTtl: number;
  private hitCount: number = 0;
  private missCount: number = 0;

  constructor(logger: Logger, maxSize: number = 1000, defaultTtl: number = 300) {
    this.logger = logger;
    this.maxSize = maxSize;
    this.defaultTtl = defaultTtl;
  }

  /**
   * Get value from cache with intelligent expiration
   */
  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.missCount++;
      return null;
    }

    const now = Date.now();
    
    // Check if entry has expired
    if (now - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    // Update access metrics
    entry.accessCount++;
    entry.lastAccessed = now;
    
    this.hitCount++;
    return entry.value;
  }

  /**
   * Set value in cache with intelligent eviction
   */
  set(key: string, value: any, ttl?: number): void {
    const now = Date.now();
    const entryTtl = ttl || this.defaultTtl;

    // Check if cache is full and needs eviction
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLeastUsed();
    }

    const entry: CacheEntry = {
      key,
      value,
      timestamp: now,
      ttl: entryTtl,
      accessCount: 1,
      lastAccessed: now
    };

    this.cache.set(key, entry);
  }

  /**
   * Intelligent cache key generation
   */
  generateCacheKey(prefix: string, params: any): string {
    // Create deterministic key from parameters
    const paramStr = JSON.stringify(params, Object.keys(params).sort());
    const hash = this.simpleHash(paramStr);
    return `${prefix}:${hash}`;
  }

  /**
   * Get cache statistics
   */
  getStats(): any {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0;

    return {
      hit_count: this.hitCount,
      miss_count: this.missCount,
      hit_rate: hitRate,
      cache_size: this.cache.size,
      max_size: this.maxSize
    };
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl * 1000) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
    
    this.logger.debug('Cache cleanup completed', { 
      expired_entries: expiredKeys.length,
      remaining_entries: this.cache.size 
    });
  }

  private evictLeastUsed(): void {
    let leastUsedKey: string | null = null;
    let minAccessCount = Infinity;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount < minAccessCount || 
          (entry.accessCount === minAccessCount && entry.lastAccessed < oldestTime)) {
        leastUsedKey = key;
        minAccessCount = entry.accessCount;
        oldestTime = entry.lastAccessed;
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
      this.logger.debug('Evicted least used cache entry', { key: leastUsedKey });
    }
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

// ================================================================
// PERFORMANCE MONITOR
// ================================================================

export class PerformanceMonitor {
  private logger: Logger;
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private activeRequests: Map<string, { startTime: number; startMemory: number }> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Start tracking performance for a request
   */
  startTracking(requestId: string): void {
    const startMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB
    
    this.activeRequests.set(requestId, {
      startTime: Date.now(),
      startMemory: startMemory
    });
  }

  /**
   * End tracking and calculate metrics
   */
  endTracking(requestId: string, additionalMetrics?: Partial<PerformanceMetrics>): PerformanceMetrics {
    const tracking = this.activeRequests.get(requestId);
    
    if (!tracking) {
      throw new Error(`No tracking found for request ${requestId}`);
    }

    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB
    
    const metrics: PerformanceMetrics = {
      execution_time_ms: endTime - tracking.startTime,
      memory_usage_mb: endMemory - tracking.startMemory,
      cache_hit_rate: 0,
      database_query_count: 0,
      feature_calculation_time: {},
      ...additionalMetrics
    };

    this.metrics.set(requestId, metrics);
    this.activeRequests.delete(requestId);

    // Log performance warning if thresholds exceeded
    if (metrics.execution_time_ms > 5000) {
      this.logger.warn('Performance threshold exceeded', {
        request_id: requestId,
        execution_time: metrics.execution_time_ms,
        threshold: 5000
      });
    }

    return metrics;
  }

  /**
   * Get performance statistics
   */
  getStats(timeWindow?: number): any {
    const now = Date.now();
    const windowStart = timeWindow ? now - timeWindow : 0;
    
    const recentMetrics = Array.from(this.metrics.entries())
      .filter(([id, _]) => {
        // Use timestamp from request ID if available, otherwise include all
        const timestamp = parseInt(id.split('_')[1]) || now;
        return timestamp >= windowStart;
      })
      .map(([_, metrics]) => metrics);

    if (recentMetrics.length === 0) {
      return {
        request_count: 0,
        avg_execution_time_ms: 0,
        max_execution_time_ms: 0,
        avg_memory_usage_mb: 0,
        max_memory_usage_mb: 0
      };
    }

    const stats = {
      request_count: recentMetrics.length,
      avg_execution_time_ms: recentMetrics.reduce((sum, m) => sum + m.execution_time_ms, 0) / recentMetrics.length,
      max_execution_time_ms: Math.max(...recentMetrics.map(m => m.execution_time_ms)),
      avg_memory_usage_mb: recentMetrics.reduce((sum, m) => sum + m.memory_usage_mb, 0) / recentMetrics.length,
      max_memory_usage_mb: Math.max(...recentMetrics.map(m => m.memory_usage_mb)),
      avg_cache_hit_rate: recentMetrics.reduce((sum, m) => sum + m.cache_hit_rate, 0) / recentMetrics.length
    };

    return stats;
  }

  /**
   * Clean up old metrics
   */
  cleanup(maxAge: number = 3600000): void { // 1 hour default
    const cutoff = Date.now() - maxAge;
    const expiredKeys: string[] = [];

    for (const [requestId, _] of this.metrics.entries()) {
      const timestamp = parseInt(requestId.split('_')[1]) || 0;
      if (timestamp < cutoff) {
        expiredKeys.push(requestId);
      }
    }

    expiredKeys.forEach(key => this.metrics.delete(key));
    
    this.logger.debug('Performance metrics cleanup completed', {
      expired_metrics: expiredKeys.length,
      remaining_metrics: this.metrics.size
    });
  }
}

// ================================================================
// QUERY OPTIMIZER
// ================================================================

export class QueryOptimizer {
  private logger: Logger;
  private queryCache: Map<string, any> = new Map();
  private queryStats: Map<string, { count: number; totalTime: number }> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Optimize database query with caching and batching
   */
  async optimizeQuery(
    queryKey: string,
    queryFn: () => Promise<any>,
    cacheOptions?: { ttl?: number; batch?: boolean }
  ): Promise<any> {
    const startTime = Date.now();
    
    // Check cache first
    if (cacheOptions?.ttl && this.queryCache.has(queryKey)) {
      const cached = this.queryCache.get(queryKey);
      if (Date.now() - cached.timestamp < cacheOptions.ttl * 1000) {
        this.updateQueryStats(queryKey, Date.now() - startTime);
        return cached.result;
      }
    }

    // Execute query
    try {
      const result = await queryFn();
      
      // Cache result if caching enabled
      if (cacheOptions?.ttl) {
        this.queryCache.set(queryKey, {
          result,
          timestamp: Date.now()
        });
      }

      this.updateQueryStats(queryKey, Date.now() - startTime);
      return result;
    } catch (error) {
      this.logger.error('Query optimization failed', {
        query_key: queryKey,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Batch multiple queries for efficiency
   */
  async batchQueries(queries: Array<{ key: string; fn: () => Promise<any> }>): Promise<any[]> {
    const results = await Promise.all(
      queries.map(query => this.optimizeQuery(query.key, query.fn))
    );
    
    this.logger.debug('Batch query completed', {
      query_count: queries.length,
      total_time: Date.now()
    });

    return results;
  }

  /**
   * Get query performance statistics
   */
  getQueryStats(): any {
    const stats: any = {};
    
    for (const [queryKey, stat] of this.queryStats.entries()) {
      stats[queryKey] = {
        execution_count: stat.count,
        average_time_ms: stat.totalTime / stat.count,
        total_time_ms: stat.totalTime
      };
    }

    return stats;
  }

  private updateQueryStats(queryKey: string, executionTime: number): void {
    const existing = this.queryStats.get(queryKey) || { count: 0, totalTime: 0 };
    this.queryStats.set(queryKey, {
      count: existing.count + 1,
      totalTime: existing.totalTime + executionTime
    });
  }
}

// ================================================================
// RESOURCE MANAGER
// ================================================================

export class ResourceManager {
  private logger: Logger;
  private settings: OptimizationSettings;
  private activeConnections: number = 0;
  private maxConnections: number;

  constructor(logger: Logger, settings: OptimizationSettings) {
    this.logger = logger;
    this.settings = settings;
    this.maxConnections = settings.resource_limits.max_database_connections;
  }

  /**
   * Check if resources are available for new request
   */
  checkResourceAvailability(): { available: boolean; reason?: string } {
    // Check memory usage
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB
    if (memoryUsage > this.settings.resource_limits.max_memory_usage_mb) {
      return {
        available: false,
        reason: `Memory usage ${memoryUsage.toFixed(2)}MB exceeds limit ${this.settings.resource_limits.max_memory_usage_mb}MB`
      };
    }

    // Check database connections
    if (this.activeConnections >= this.maxConnections) {
      return {
        available: false,
        reason: `Database connections ${this.activeConnections} at maximum ${this.maxConnections}`
      };
    }

    return { available: true };
  }

  /**
   * Acquire database connection
   */
  acquireConnection(): boolean {
    if (this.activeConnections < this.maxConnections) {
      this.activeConnections++;
      return true;
    }
    return false;
  }

  /**
   * Release database connection
   */
  releaseConnection(): void {
    if (this.activeConnections > 0) {
      this.activeConnections--;
    }
  }

  /**
   * Get resource usage statistics
   */
  getResourceStats(): any {
    const memoryUsage = process.memoryUsage();
    
    return {
      memory_usage: {
        heap_used_mb: memoryUsage.heapUsed / 1024 / 1024,
        heap_total_mb: memoryUsage.heapTotal / 1024 / 1024,
        external_mb: memoryUsage.external / 1024 / 1024,
        rss_mb: memoryUsage.rss / 1024 / 1024
      },
      database_connections: {
        active: this.activeConnections,
        max: this.maxConnections,
        utilization_percentage: (this.activeConnections / this.maxConnections) * 100
      },
      resource_limits: this.settings.resource_limits
    };
  }

  /**
   * Clean up resources and connections
   */
  cleanup(): void {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      this.logger.debug('Forced garbage collection completed');
    }

    // Reset connection count (connections should be managed by pool)
    this.activeConnections = 0;
  }
}

// ================================================================
// OPTIMIZATION COORDINATOR
// ================================================================

export class OptimizationCoordinator {
  private cache: IntelligentCache;
  private monitor: PerformanceMonitor;
  private queryOptimizer: QueryOptimizer;
  private resourceManager: ResourceManager;
  private logger: Logger;

  constructor(logger: Logger, settings: OptimizationSettings) {
    this.logger = logger;
    this.cache = new IntelligentCache(logger, 1000, settings.cache_ttl_seconds);
    this.monitor = new PerformanceMonitor(logger);
    this.queryOptimizer = new QueryOptimizer(logger);
    this.resourceManager = new ResourceManager(logger, settings);

    // Setup periodic cleanup
    setInterval(() => this.performCleanup(), 60000); // Every minute
  }

  /**
   * Get all optimization utilities
   */
  getUtilities() {
    return {
      cache: this.cache,
      monitor: this.monitor,
      queryOptimizer: this.queryOptimizer,
      resourceManager: this.resourceManager
    };
  }

  /**
   * Get comprehensive optimization statistics
   */
  getOptimizationStats(): any {
    return {
      cache_stats: this.cache.getStats(),
      performance_stats: this.monitor.getStats(3600000), // Last hour
      query_stats: this.queryOptimizer.getQueryStats(),
      resource_stats: this.resourceManager.getResourceStats(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Perform periodic cleanup and optimization
   */
  private performCleanup(): void {
    try {
      this.cache.cleanup();
      this.monitor.cleanup();
      this.resourceManager.cleanup();
      
      this.logger.debug('Optimization cleanup completed');
    } catch (error) {
      this.logger.error('Optimization cleanup failed', error);
    }
  }
}

// ================================================================
// DEFAULT OPTIMIZATION SETTINGS
// ================================================================

export const DefaultOptimizationSettings: OptimizationSettings = {
  caching_enabled: true,
  cache_ttl_seconds: 300, // 5 minutes
  max_cache_size: 1000,
  performance_monitoring: true,
  query_optimization: true,
  resource_limits: {
    max_execution_time_ms: 5000,
    max_memory_usage_mb: 512,
    max_database_connections: 10
  }
};