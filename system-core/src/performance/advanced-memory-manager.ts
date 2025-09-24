/**
 * Advanced Memory Management System
 * TrustStream v4.2 Performance Optimization
 * 
 * Implements intelligent memory management with object pools,
 * garbage collection optimization, memory leak detection, and monitoring.
 */

import { Logger } from '../shared-utils/logger';
import { EventEmitter } from 'events';

export interface MemoryConfig {
  // Object pooling
  objectPools: {
    enabled: boolean;
    maxPoolSize: number;
    poolTypes: string[];
    cleanupInterval: number;
  };
  
  // Memory monitoring
  monitoring: {
    enabled: boolean;
    heapSnapshotInterval: number;
    leakDetectionThreshold: number;
    alertThreshold: number;
  };
  
  // Garbage collection optimization
  gcOptimization: {
    enabled: boolean;
    forcefulGCInterval: number;
    generationalGC: boolean;
    incrementalMarking: boolean;
  };
  
  // Memory limits
  limits: {
    maxHeapSize: number;
    maxArrayBufferSize: number;
    maxStringSize: number;
    emergencyCleanupThreshold: number;
  };
}

export interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  rss: number;
  gcCount: number;
  gcDuration: number;
  poolUtilization: Map<string, number>;
  leakSuspects: string[];
  lastSnapshot: Date;
}

export interface ObjectPool<T> {
  name: string;
  maxSize: number;
  currentSize: number;
  available: T[];
  inUse: Set<T>;
  factory: () => T;
  reset: (obj: T) => void;
  validator: (obj: T) => boolean;
}

export interface MemorySnapshot {
  timestamp: Date;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  objects: Map<string, number>;
  functions: Map<string, number>;
  arrayBuffers: number;
}

/**
 * Advanced Memory Management System
 */
export class AdvancedMemoryManager extends EventEmitter {
  private config: MemoryConfig;
  private logger: Logger;
  private objectPools: Map<string, ObjectPool<any>> = new Map();
  private memoryMetrics: MemoryMetrics;
  private monitoringTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;
  private gcTimer?: NodeJS.Timeout;
  private memorySnapshots: MemorySnapshot[] = [];
  private weakReferences: Map<string, WeakRef<any>> = new Map();
  private finalizationRegistry: FinalizationRegistry<string>;

  constructor(config: MemoryConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.initializeMetrics();
    
    // Set up finalization registry for leak detection
    this.finalizationRegistry = new FinalizationRegistry((key: string) => {
      this.handleObjectFinalization(key);
    });
  }

  /**
   * Initialize the memory management system
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Advanced Memory Manager');

    try {
      // Set up object pools
      if (this.config.objectPools.enabled) {
        await this.initializeObjectPools();
      }
      
      // Start memory monitoring
      if (this.config.monitoring.enabled) {
        this.startMemoryMonitoring();
      }
      
      // Start garbage collection optimization
      if (this.config.gcOptimization.enabled) {
        this.startGCOptimization();
      }
      
      // Set up cleanup timers
      this.startCleanupTimers();
      
      // Configure Node.js memory limits
      this.configureMemoryLimits();
      
      this.logger.info('Advanced Memory Manager initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize memory manager', error);
      throw error;
    }
  }

  /**
   * Get object from pool or create new one
   */
  acquireObject<T>(poolName: string): T | null {
    const pool = this.objectPools.get(poolName);
    if (!pool) {
      this.logger.warn('Object pool not found', { poolName });
      return null;
    }

    try {
      let obj: T;
      
      if (pool.available.length > 0) {
        obj = pool.available.pop()!;
      } else {
        obj = pool.factory();
      }
      
      pool.inUse.add(obj);
      
      // Track object for leak detection
      const objId = this.generateObjectId();
      this.finalizationRegistry.register(obj, objId);
      
      return obj;
    } catch (error) {
      this.logger.error('Failed to acquire object from pool', { poolName, error });
      return null;
    }
  }

  /**
   * Return object to pool
   */
  releaseObject<T>(poolName: string, obj: T): boolean {
    const pool = this.objectPools.get(poolName);
    if (!pool) {
      this.logger.warn('Object pool not found for release', { poolName });
      return false;
    }

    try {
      if (!pool.inUse.has(obj)) {
        this.logger.warn('Object not tracked in pool', { poolName });
        return false;
      }
      
      pool.inUse.delete(obj);
      
      // Validate and reset object
      if (pool.validator(obj)) {
        pool.reset(obj);
        
        if (pool.available.length < pool.maxSize) {
          pool.available.push(obj);
        }
        return true;
      } else {
        this.logger.warn('Object failed validation, not returned to pool', { poolName });
        return false;
      }
    } catch (error) {
      this.logger.error('Failed to release object to pool', { poolName, error });
      return false;
    }
  }

  /**
   * Create a managed reference with automatic cleanup
   */
  createManagedReference<T extends object>(key: string, obj: T, ttl?: number): void {
    // Create weak reference
    const weakRef = new WeakRef(obj);
    this.weakReferences.set(key, weakRef);
    
    // Set up automatic cleanup if TTL provided
    if (ttl) {
      setTimeout(() => {
        this.cleanupManagedReference(key);
      }, ttl);
    }
    
    // Register for finalization
    this.finalizationRegistry.register(obj, key);
  }

  /**
   * Get managed reference
   */
  getManagedReference<T>(key: string): T | null {
    const weakRef = this.weakReferences.get(key);
    if (!weakRef) return null;
    
    const obj = weakRef.deref();
    if (!obj) {
      this.weakReferences.delete(key);
      return null;
    }
    
    return obj as T;
  }

  /**
   * Force garbage collection with optimization
   */
  forceGarbageCollection(): void {
    if (global.gc) {
      try {
        const startTime = Date.now();
        global.gc();
        const duration = Date.now() - startTime;
        
        this.memoryMetrics.gcCount++;
        this.memoryMetrics.gcDuration = (this.memoryMetrics.gcDuration * 0.9) + (duration * 0.1);
        
        this.logger.debug('Forced garbage collection completed', { duration });
        this.emit('gc_completed', { duration });
      } catch (error) {
        this.logger.error('Failed to force garbage collection', error);
      }
    } else {
      this.logger.warn('Garbage collection not exposed (use --expose-gc flag)');
    }
  }

  /**
   * Detect memory leaks using various strategies
   */
  async detectMemoryLeaks(): Promise<string[]> {
    const leaks: string[] = [];
    
    try {
      // Analyze heap growth
      const currentMemory = process.memoryUsage();
      if (this.memorySnapshots.length > 0) {
        const lastSnapshot = this.memorySnapshots[this.memorySnapshots.length - 1];
        const growthRate = (currentMemory.heapUsed - lastSnapshot.heapUsed) / lastSnapshot.heapUsed;
        
        if (growthRate > this.config.monitoring.leakDetectionThreshold) {
          leaks.push(`Heap growth rate: ${(growthRate * 100).toFixed(2)}%`);
        }
      }
      
      // Check object pool utilization
      for (const [poolName, pool] of this.objectPools) {
        const utilizationRate = pool.inUse.size / pool.maxSize;
        if (utilizationRate > 0.9) {
          leaks.push(`High pool utilization: ${poolName} (${(utilizationRate * 100).toFixed(1)}%)`);
        }
      }
      
      // Check for stuck weak references
      let stuckReferences = 0;
      for (const [key, weakRef] of this.weakReferences) {
        if (!weakRef.deref()) {
          this.weakReferences.delete(key);
        } else {
          stuckReferences++;
        }
      }
      
      if (stuckReferences > 100) {
        leaks.push(`High number of lingering weak references: ${stuckReferences}`);
      }
      
      this.memoryMetrics.leakSuspects = leaks;
      
      if (leaks.length > 0) {
        this.logger.warn('Memory leaks detected', { leaks });
        this.emit('memory_leaks_detected', { leaks });
      }
      
      return leaks;
    } catch (error) {
      this.logger.error('Memory leak detection failed', error);
      return [];
    }
  }

  /**
   * Perform emergency memory cleanup
   */
  async emergencyCleanup(): Promise<void> {
    this.logger.warn('Performing emergency memory cleanup');
    
    try {
      // Clear object pools
      for (const pool of this.objectPools.values()) {
        pool.available = [];
        pool.inUse.clear();
      }
      
      // Clear weak references
      this.weakReferences.clear();
      
      // Clear memory snapshots (keep only recent ones)
      if (this.memorySnapshots.length > 10) {
        this.memorySnapshots = this.memorySnapshots.slice(-10);
      }
      
      // Force multiple GC cycles
      for (let i = 0; i < 3; i++) {
        this.forceGarbageCollection();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      this.logger.info('Emergency memory cleanup completed');
      this.emit('emergency_cleanup_completed');
    } catch (error) {
      this.logger.error('Emergency cleanup failed', error);
    }
  }

  /**
   * Get comprehensive memory metrics
   */
  getMetrics(): MemoryMetrics {
    const currentMemory = process.memoryUsage();
    
    // Update pool utilization metrics
    const poolUtilization = new Map<string, number>();
    for (const [poolName, pool] of this.objectPools) {
      const utilization = pool.inUse.size / pool.maxSize;
      poolUtilization.set(poolName, utilization);
    }
    
    return {
      heapUsed: currentMemory.heapUsed,
      heapTotal: currentMemory.heapTotal,
      external: currentMemory.external,
      arrayBuffers: currentMemory.arrayBuffers,
      rss: currentMemory.rss,
      gcCount: this.memoryMetrics.gcCount,
      gcDuration: this.memoryMetrics.gcDuration,
      poolUtilization,
      leakSuspects: this.memoryMetrics.leakSuspects,
      lastSnapshot: this.memoryMetrics.lastSnapshot
    };
  }

  /**
   * Take memory snapshot for analysis
   */
  takeMemorySnapshot(): MemorySnapshot {
    const memory = process.memoryUsage();
    
    const snapshot: MemorySnapshot = {
      timestamp: new Date(),
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal,
      external: memory.external,
      rss: memory.rss,
      objects: new Map(),
      functions: new Map(),
      arrayBuffers: memory.arrayBuffers
    };
    
    this.memorySnapshots.push(snapshot);
    
    // Keep only last 50 snapshots
    if (this.memorySnapshots.length > 50) {
      this.memorySnapshots.shift();
    }
    
    this.memoryMetrics.lastSnapshot = new Date();
    
    return snapshot;
  }

  /**
   * Shutdown memory manager
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down memory manager');
    
    // Clear timers
    if (this.monitoringTimer) clearInterval(this.monitoringTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    if (this.gcTimer) clearInterval(this.gcTimer);
    
    // Clear all pools
    this.objectPools.clear();
    this.weakReferences.clear();
    this.memorySnapshots = [];
    
    this.emit('memory_manager_shutdown');
  }

  // Private methods
  private initializeMetrics(): void {
    this.memoryMetrics = {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      arrayBuffers: 0,
      rss: 0,
      gcCount: 0,
      gcDuration: 0,
      poolUtilization: new Map(),
      leakSuspects: [],
      lastSnapshot: new Date()
    };
  }

  private async initializeObjectPools(): Promise<void> {
    this.logger.info('Initializing object pools');
    
    // Create standard object pools
    const poolConfigs = [
      {
        name: 'trust_calculation_context',
        factory: () => ({ trust_scores: {}, governance_context: {}, results: {} }),
        reset: (obj: any) => {
          obj.trust_scores = {};
          obj.governance_context = {};
          obj.results = {};
        },
        validator: (obj: any) => typeof obj === 'object' && obj !== null
      },
      {
        name: 'database_query_context',
        factory: () => ({ query: '', params: [], result: null, metadata: {} }),
        reset: (obj: any) => {
          obj.query = '';
          obj.params = [];
          obj.result = null;
          obj.metadata = {};
        },
        validator: (obj: any) => typeof obj === 'object' && obj !== null
      },
      {
        name: 'orchestration_task',
        factory: () => ({ 
          id: '', 
          type: '', 
          payload: {}, 
          agents: [], 
          status: 'pending',
          results: {}
        }),
        reset: (obj: any) => {
          obj.id = '';
          obj.type = '';
          obj.payload = {};
          obj.agents = [];
          obj.status = 'pending';
          obj.results = {};
        },
        validator: (obj: any) => typeof obj === 'object' && obj !== null
      }
    ];
    
    for (const config of poolConfigs) {
      const pool: ObjectPool<any> = {
        name: config.name,
        maxSize: this.config.objectPools.maxPoolSize,
        currentSize: 0,
        available: [],
        inUse: new Set(),
        factory: config.factory,
        reset: config.reset,
        validator: config.validator
      };
      
      this.objectPools.set(config.name, pool);
    }
  }

  private startMemoryMonitoring(): void {
    this.monitoringTimer = setInterval(() => {
      this.performMemoryMonitoring();
    }, this.config.monitoring.heapSnapshotInterval);
  }

  private startGCOptimization(): void {
    if (this.config.gcOptimization.forcefulGCInterval > 0) {
      this.gcTimer = setInterval(() => {
        this.performOptimizedGC();
      }, this.config.gcOptimization.forcefulGCInterval);
    }
  }

  private startCleanupTimers(): void {
    this.cleanupTimer = setInterval(() => {
      this.performRoutineCleanup();
    }, this.config.objectPools.cleanupInterval);
  }

  private configureMemoryLimits(): void {
    // Set V8 heap size if configured
    if (this.config.limits.maxHeapSize > 0) {
      // Note: V8 flags need to be set at startup, this is for monitoring
      const currentHeap = process.memoryUsage().heapTotal;
      if (currentHeap > this.config.limits.maxHeapSize) {
        this.logger.warn('Current heap size exceeds configured limit', {
          current: currentHeap,
          limit: this.config.limits.maxHeapSize
        });
      }
    }
  }

  private async performMemoryMonitoring(): Promise<void> {
    try {
      // Take memory snapshot
      const snapshot = this.takeMemorySnapshot();
      
      // Check for emergency cleanup threshold
      if (snapshot.heapUsed > this.config.limits.emergencyCleanupThreshold) {
        await this.emergencyCleanup();
      }
      
      // Check for alert threshold
      if (snapshot.heapUsed > this.config.monitoring.alertThreshold) {
        this.logger.warn('Memory usage exceeds alert threshold', {
          current: snapshot.heapUsed,
          threshold: this.config.monitoring.alertThreshold
        });
        this.emit('memory_alert', { usage: snapshot.heapUsed, threshold: this.config.monitoring.alertThreshold });
      }
      
      // Detect memory leaks
      await this.detectMemoryLeaks();
      
    } catch (error) {
      this.logger.error('Memory monitoring failed', error);
    }
  }

  private performOptimizedGC(): void {
    try {
      // Perform incremental GC if available
      if (this.config.gcOptimization.incrementalMarking && global.gc) {
        global.gc();
      }
      
      // Additional GC optimizations could be added here
      this.logger.debug('Optimized GC cycle completed');
    } catch (error) {
      this.logger.error('Optimized GC failed', error);
    }
  }

  private async performRoutineCleanup(): Promise<void> {
    try {
      // Clean up object pools
      for (const pool of this.objectPools.values()) {
        // Remove excess objects from available pools
        if (pool.available.length > pool.maxSize * 0.8) {
          const excess = pool.available.length - Math.floor(pool.maxSize * 0.8);
          pool.available.splice(0, excess);
        }
      }
      
      // Clean up weak references
      for (const [key, weakRef] of this.weakReferences) {
        if (!weakRef.deref()) {
          this.weakReferences.delete(key);
        }
      }
      
      this.logger.debug('Routine cleanup completed');
    } catch (error) {
      this.logger.error('Routine cleanup failed', error);
    }
  }

  private handleObjectFinalization(key: string): void {
    // Object has been garbage collected
    this.weakReferences.delete(key);
    this.logger.debug('Object finalized', { key });
  }

  private generateObjectId(): string {
    return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private cleanupManagedReference(key: string): void {
    this.weakReferences.delete(key);
    this.logger.debug('Managed reference cleaned up', { key });
  }
}

/**
 * Memory Manager Factory
 */
export class MemoryManagerFactory {
  private static instance: AdvancedMemoryManager | null = null;

  static async createManager(
    config: MemoryConfig,
    logger: Logger
  ): Promise<AdvancedMemoryManager> {
    if (this.instance) {
      return this.instance;
    }

    this.instance = new AdvancedMemoryManager(config, logger);
    await this.instance.initialize();
    
    return this.instance;
  }

  static getManager(): AdvancedMemoryManager | null {
    return this.instance;
  }

  static async shutdown(): Promise<void> {
    if (this.instance) {
      await this.instance.shutdown();
      this.instance = null;
    }
  }
}