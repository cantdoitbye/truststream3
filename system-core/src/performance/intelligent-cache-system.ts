/**
 * Intelligent Multi-Tier Caching System
 * TrustStream v4.2 Performance Optimization
 * 
 * Implements intelligent caching with multiple tiers, TTL management,
 * cache warming, invalidation strategies, and performance analytics.
 */

import { Logger } from '../shared-utils/logger';
import { EventEmitter } from 'events';

export interface CacheConfig {
  // Memory cache configuration
  memoryCache: {
    maxSize: number;
    defaultTTL: number;
    cleanupInterval: number;
    compressionEnabled: boolean;
  };
  
  // Redis cache configuration (optional)
  redisCache?: {
    host: string;
    port: number;
    password?: string;
    db: number;
    defaultTTL: number;
    keyPrefix: string;
  };
  
  // Cache behavior
  enableWarmup: boolean;
  enableInvalidation: boolean;
  enableCompression: boolean;
  enableAnalytics: boolean;
  
  // Performance settings
  maxConcurrentOperations: number;
  batchSize: number;
  preloadPatterns: string[];
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalOperations: number;
  averageResponseTime: number;
  memoryUsage: number;
  evictions: number;
  errors: number;
  lastCleanup: Date;
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  compressed: boolean;
}

export interface CacheWarmupStrategy {
  pattern: string;
  priority: number;
  batchSize: number;
  dataLoader: (keys: string[]) => Promise<Map<string, any>>;
}

/**
 * Intelligent Multi-Tier Cache System
 */
export class IntelligentCacheSystem extends EventEmitter {
  private config: CacheConfig;
  private logger: Logger;
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private accessPatterns: Map<string, number[]> = new Map();
  private metrics: CacheMetrics;
  private cleanupTimer?: NodeJS.Timeout;
  private warmupStrategies: Map<string, CacheWarmupStrategy> = new Map();
  private compressionLib: any; // For compression if enabled

  constructor(config: CacheConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.initializeMetrics();
    
    if (config.enableCompression) {
      this.compressionLib = require('zlib');
    }
  }

  /**
   * Initialize the cache system
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Intelligent Cache System');

    try {
      // Start cleanup timer
      this.startCleanupTimer();
      
      // Initialize warmup strategies
      await this.initializeWarmupStrategies();
      
      // Perform initial cache warming if enabled
      if (this.config.enableWarmup) {
        await this.performCacheWarmup();
      }
      
      this.logger.info('Intelligent Cache System initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize cache system', error);
      throw error;
    }
  }

  /**
   * Get value from cache with intelligent tier selection
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    
    try {
      // Try memory cache first
      const memoryResult = await this.getFromMemory<T>(key);
      if (memoryResult !== null) {
        this.trackAccess(key, Date.now() - startTime, true);
        return memoryResult;
      }
      
      // Try Redis cache if configured
      if (this.config.redisCache) {
        const redisResult = await this.getFromRedis<T>(key);
        if (redisResult !== null) {
          // Store in memory cache for faster access
          await this.setInMemory(key, redisResult, this.config.memoryCache.defaultTTL);
          this.trackAccess(key, Date.now() - startTime, true);
          return redisResult;
        }
      }
      
      this.trackAccess(key, Date.now() - startTime, false);
      return null;
    } catch (error) {
      this.logger.error('Cache get operation failed', { key, error });
      this.metrics.errors++;
      return null;
    }
  }

  /**
   * Set value in cache with intelligent tier management
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const startTime = Date.now();
    
    try {
      const effectiveTTL = ttl || this.config.memoryCache.defaultTTL;
      
      // Always store in memory cache
      await this.setInMemory(key, value, effectiveTTL);
      
      // Store in Redis if configured and value is significant
      if (this.config.redisCache && this.shouldStoreInRedis(key, value)) {
        await this.setInRedis(key, value, effectiveTTL);
      }
      
      this.trackOperation('set', Date.now() - startTime);
      this.emit('cache_set', { key, ttl: effectiveTTL });
    } catch (error) {
      this.logger.error('Cache set operation failed', { key, error });
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Get multiple values efficiently
   */
  async getMultiple<T>(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    const missingKeys: string[] = [];
    
    // Check memory cache first for all keys
    for (const key of keys) {
      const value = await this.getFromMemory<T>(key);
      if (value !== null) {
        results.set(key, value);
      } else {
        missingKeys.push(key);
      }
    }
    
    // Check Redis for missing keys if configured
    if (this.config.redisCache && missingKeys.length > 0) {
      const redisResults = await this.getMultipleFromRedis<T>(missingKeys);
      for (const [key, value] of redisResults) {
        results.set(key, value);
        // Store in memory for future access
        await this.setInMemory(key, value, this.config.memoryCache.defaultTTL);
      }
    }
    
    return results;
  }

  /**
   * Invalidate cache entries with pattern matching
   */
  async invalidate(pattern: string): Promise<number> {
    let invalidatedCount = 0;
    
    try {
      // Invalidate from memory cache
      for (const key of this.memoryCache.keys()) {
        if (this.matchesPattern(key, pattern)) {
          this.memoryCache.delete(key);
          invalidatedCount++;
        }
      }
      
      // Invalidate from Redis if configured
      if (this.config.redisCache) {
        // Implementation would depend on Redis client
        // invalidatedCount += await this.invalidateFromRedis(pattern);
      }
      
      this.logger.info('Cache invalidation completed', { pattern, count: invalidatedCount });
      this.emit('cache_invalidated', { pattern, count: invalidatedCount });
      
      return invalidatedCount;
    } catch (error) {
      this.logger.error('Cache invalidation failed', { pattern, error });
      this.metrics.errors++;
      return 0;
    }
  }

  /**
   * Warm cache with intelligent data loading
   */
  async warmCache(strategy: string, keys?: string[]): Promise<void> {
    const warmupStrategy = this.warmupStrategies.get(strategy);
    if (!warmupStrategy) {
      throw new Error(`Unknown warmup strategy: ${strategy}`);
    }
    
    this.logger.info('Starting cache warmup', { strategy, keyCount: keys?.length });
    
    try {
      const targetKeys = keys || await this.generateWarmupKeys(warmupStrategy.pattern);
      const batches = this.createBatches(targetKeys, warmupStrategy.batchSize);
      
      for (const batch of batches) {
        const data = await warmupStrategy.dataLoader(batch);
        
        for (const [key, value] of data) {
          await this.set(key, value);
        }
      }
      
      this.logger.info('Cache warmup completed', { strategy, totalKeys: targetKeys.length });
    } catch (error) {
      this.logger.error('Cache warmup failed', { strategy, error });
      throw error;
    }
  }

  /**
   * Get comprehensive cache metrics
   */
  getMetrics(): CacheMetrics {
    const currentMemoryUsage = this.calculateMemoryUsage();
    const hitRate = this.metrics.totalOperations > 0 
      ? this.metrics.hits / this.metrics.totalOperations 
      : 0;
    
    return {
      ...this.metrics,
      hitRate,
      memoryUsage: currentMemoryUsage
    };
  }

  /**
   * Optimize cache performance based on access patterns
   */
  async optimizeCache(): Promise<void> {
    this.logger.info('Starting cache optimization');
    
    try {
      // Analyze access patterns
      const patterns = this.analyzeAccessPatterns();
      
      // Evict rarely used items
      await this.evictLeastUsed();
      
      // Pre-load frequently accessed items
      await this.preloadFrequentItems(patterns);
      
      // Adjust TTL based on access patterns
      this.adjustTTLBasedOnPatterns(patterns);
      
      this.logger.info('Cache optimization completed');
    } catch (error) {
      this.logger.error('Cache optimization failed', error);
    }
  }

  /**
   * Shutdown cache system gracefully
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down cache system');
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    // Clear all caches
    this.memoryCache.clear();
    this.accessPatterns.clear();
    this.warmupStrategies.clear();
    
    this.emit('cache_shutdown');
  }

  // Private methods
  private async getFromMemory<T>(key: string): Promise<T | null> {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    
    // Check if entry has expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.memoryCache.delete(key);
      this.metrics.evictions++;
      return null;
    }
    
    // Update access information
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    // Decompress if needed
    let value = entry.value;
    if (entry.compressed && this.compressionLib) {
      value = JSON.parse(this.compressionLib.gunzipSync(entry.value).toString());
    }
    
    return value;
  }

  private async setInMemory<T>(key: string, value: T, ttl: number): Promise<void> {
    // Check if cache is full
    if (this.memoryCache.size >= this.config.memoryCache.maxSize) {
      await this.evictLeastUsed();
    }
    
    let finalValue = value;
    let compressed = false;
    let size = JSON.stringify(value).length;
    
    // Compress if enabled and beneficial
    if (this.config.enableCompression && size > 1024) { // Compress if > 1KB
      try {
        const compressed_data = this.compressionLib.gzipSync(JSON.stringify(value));
        if (compressed_data.length < size * 0.8) { // Only if compression saves 20%
          finalValue = compressed_data as any;
          compressed = true;
          size = compressed_data.length;
        }
      } catch (error) {
        this.logger.warn('Compression failed', { key, error });
      }
    }
    
    const entry: CacheEntry<T> = {
      key,
      value: finalValue,
      timestamp: Date.now(),
      ttl,
      accessCount: 1,
      lastAccessed: Date.now(),
      size,
      compressed
    };
    
    this.memoryCache.set(key, entry);
  }

  private async getFromRedis<T>(key: string): Promise<T | null> {
    // Redis implementation would go here
    // For now, returning null as placeholder
    return null;
  }

  private async setInRedis<T>(key: string, value: T, ttl: number): Promise<void> {
    // Redis implementation would go here
  }

  private async getMultipleFromRedis<T>(keys: string[]): Promise<Map<string, T>> {
    // Redis implementation would go here
    return new Map();
  }

  private shouldStoreInRedis<T>(key: string, value: T): boolean {
    // Store in Redis if value is large or frequently accessed
    const size = JSON.stringify(value).length;
    const accessCount = this.accessPatterns.get(key)?.length || 0;
    
    return size > 10240 || accessCount > 10; // 10KB or 10+ accesses
  }

  private trackAccess(key: string, responseTime: number, hit: boolean): void {
    if (hit) {
      this.metrics.hits++;
    } else {
      this.metrics.misses++;
    }
    
    this.metrics.totalOperations++;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * 0.9) + (responseTime * 0.1);
    
    // Track access patterns
    if (!this.accessPatterns.has(key)) {
      this.accessPatterns.set(key, []);
    }
    
    const pattern = this.accessPatterns.get(key)!;
    pattern.push(Date.now());
    
    // Keep only last 100 accesses
    if (pattern.length > 100) {
      pattern.shift();
    }
  }

  private trackOperation(operation: string, responseTime: number): void {
    this.metrics.totalOperations++;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * 0.9) + (responseTime * 0.1);
  }

  private initializeMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalOperations: 0,
      averageResponseTime: 0,
      memoryUsage: 0,
      evictions: 0,
      errors: 0,
      lastCleanup: new Date()
    };
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.config.memoryCache.cleanupInterval);
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.memoryCache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      this.logger.debug('Cleaned up expired cache entries', { count: cleanedCount });
      this.metrics.evictions += cleanedCount;
    }
    
    this.metrics.lastCleanup = new Date();
  }

  private async evictLeastUsed(): Promise<void> {
    // Find least recently used entries
    const entries = Array.from(this.memoryCache.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    // Evict bottom 10%
    const evictCount = Math.max(1, Math.floor(entries.length * 0.1));
    
    for (let i = 0; i < evictCount; i++) {
      this.memoryCache.delete(entries[i][0]);
      this.metrics.evictions++;
    }
  }

  private calculateMemoryUsage(): number {
    let totalSize = 0;
    for (const entry of this.memoryCache.values()) {
      totalSize += entry.size;
    }
    return totalSize;
  }

  private matchesPattern(key: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(key);
  }

  private analyzeAccessPatterns(): Map<string, number> {
    const patternScores = new Map<string, number>();
    
    for (const [key, accesses] of this.accessPatterns) {
      const recentAccesses = accesses.filter(time => 
        Date.now() - time < 3600000 // Last hour
      );
      
      patternScores.set(key, recentAccesses.length);
    }
    
    return patternScores;
  }

  private async initializeWarmupStrategies(): Promise<void> {
    // Initialize default warmup strategies based on config
    for (const pattern of this.config.preloadPatterns) {
      const strategy: CacheWarmupStrategy = {
        pattern,
        priority: 1,
        batchSize: this.config.batchSize,
        dataLoader: async (keys: string[]) => {
          // Default data loader - would be customized per use case
          return new Map();
        }
      };
      
      this.warmupStrategies.set(pattern, strategy);
    }
  }

  private async performCacheWarmup(): Promise<void> {
    this.logger.info('Performing initial cache warmup');
    
    const strategies = Array.from(this.warmupStrategies.keys())
      .sort((a, b) => {
        const strategyA = this.warmupStrategies.get(a)!;
        const strategyB = this.warmupStrategies.get(b)!;
        return strategyB.priority - strategyA.priority;
      });
    
    for (const strategyKey of strategies) {
      try {
        await this.warmCache(strategyKey);
      } catch (error) {
        this.logger.warn('Warmup strategy failed', { strategy: strategyKey, error });
      }
    }
  }

  private async generateWarmupKeys(pattern: string): Promise<string[]> {
    // Generate keys based on pattern
    // This would be implemented based on specific data patterns
    return [];
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async preloadFrequentItems(patterns: Map<string, number>): Promise<void> {
    // Pre-load most frequently accessed items
    const frequent = Array.from(patterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50) // Top 50
      .map(([key]) => key);
    
    // Load these items if they're not already cached
    for (const key of frequent) {
      if (!this.memoryCache.has(key)) {
        // Would implement data loading logic here
      }
    }
  }

  private adjustTTLBasedOnPatterns(patterns: Map<string, number>): void {
    // Adjust TTL based on access frequency
    for (const [key, frequency] of patterns) {
      const entry = this.memoryCache.get(key);
      if (entry) {
        // Higher frequency = longer TTL
        const newTTL = Math.min(
          this.config.memoryCache.defaultTTL * 2,
          this.config.memoryCache.defaultTTL * (1 + frequency / 10)
        );
        entry.ttl = newTTL;
      }
    }
  }
}

/**
 * Cache Manager Factory
 */
export class CacheManagerFactory {
  private static instances: Map<string, IntelligentCacheSystem> = new Map();

  static async createCache(
    name: string,
    config: CacheConfig,
    logger: Logger
  ): Promise<IntelligentCacheSystem> {
    if (this.instances.has(name)) {
      return this.instances.get(name)!;
    }

    const cache = new IntelligentCacheSystem(config, logger);
    await cache.initialize();
    
    this.instances.set(name, cache);
    return cache;
  }

  static getCache(name: string): IntelligentCacheSystem | null {
    return this.instances.get(name) || null;
  }

  static async shutdownAll(): Promise<void> {
    const shutdownPromises = Array.from(this.instances.values())
      .map(cache => cache.shutdown());
    
    await Promise.all(shutdownPromises);
    this.instances.clear();
  }
}