/**
 * Unified Database Service
 * Main service that integrates all database components
 */

import { 
  IDatabaseService,
  DatabaseConfig,
  QueryOptions,
  TransactionOperation,
  TableSchema,
  TableModification,
  IndexOptions,
  QueryAnalysis,
  DatabaseStats,
  DatabaseError,
  ConnectionError
} from '../../../shared-utils/database-interface';
import { DatabaseProviderFactory } from '../providers/DatabaseProviderFactory';
import { DatabaseConfigManager } from '../config/DatabaseConfigManager';
import { DatabaseTransactionManager } from '../transaction/DatabaseTransactionManager';
import { DatabaseEventService } from '../events/DatabaseEventService';
import { BaseDatabaseProvider } from '../providers/BaseDatabaseProvider';

export interface DatabaseServiceOptions {
  autoConnect?: boolean;
  enableEvents?: boolean;
  enablePerformanceMonitoring?: boolean;
  healthCheckInterval?: number;
  configManager?: DatabaseConfigManager;
  eventService?: DatabaseEventService;
  transactionManager?: DatabaseTransactionManager;
}

export class UnifiedDatabaseService implements IDatabaseService {
  private provider: BaseDatabaseProvider | null = null;
  private config: DatabaseConfig | null = null;
  private configManager: DatabaseConfigManager;
  private eventService: DatabaseEventService;
  private transactionManager: DatabaseTransactionManager;
  private options: Required<DatabaseServiceOptions>;
  private healthCheckTimer?: NodeJS.Timeout;
  private performanceMonitor?: NodeJS.Timeout;

  constructor(options: DatabaseServiceOptions = {}) {
    this.options = {
      autoConnect: options.autoConnect ?? true,
      enableEvents: options.enableEvents ?? true,
      enablePerformanceMonitoring: options.enablePerformanceMonitoring ?? true,
      healthCheckInterval: options.healthCheckInterval ?? 30000,
      configManager: options.configManager ?? DatabaseConfigManager.getInstance(),
      eventService: options.eventService ?? new DatabaseEventService(),
      transactionManager: options.transactionManager ?? new DatabaseTransactionManager()
    };

    this.configManager = this.options.configManager;
    this.eventService = this.options.eventService;
    this.transactionManager = this.options.transactionManager;

    this.setupEventListeners();
  }

  // Connection Management
  async connect(config?: DatabaseConfig): Promise<void> {
    try {
      this.config = config || this.configManager.getConfig();
      
      // Validate configuration
      const validation = this.configManager.validateConfig(this.config);
      if (!validation.valid) {
        throw new ConnectionError(`Invalid database configuration: ${validation.errors.join(', ')}`);
      }

      // Create provider
      this.provider = DatabaseProviderFactory.create(this.config) as BaseDatabaseProvider;
      
      // Connect to database
      await this.provider.connect(this.config);
      
      // Start health monitoring
      if (this.options.enablePerformanceMonitoring) {
        this.startHealthMonitoring();
        this.startPerformanceMonitoring();
      }

      // Broadcast connection event
      if (this.options.enableEvents) {
        await this.eventService.broadcastConnectionEvent(
          true, 
          this.config.type, 
          undefined,
          this.provider.getStats()
        );
      }

    } catch (error) {
      if (this.options.enableEvents) {
        await this.eventService.broadcastErrorEvent(
          error as Error, 
          'connection', 
          undefined, 
          undefined
        );
      }
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.healthCheckTimer) {
        clearInterval(this.healthCheckTimer);
      }
      
      if (this.performanceMonitor) {
        clearInterval(this.performanceMonitor);
      }

      if (this.provider) {
        await this.provider.disconnect();
        
        if (this.options.enableEvents) {
          await this.eventService.broadcastConnectionEvent(
            false, 
            this.config?.type || 'unknown'
          );
        }
      }

      // Cancel all active transactions
      await this.transactionManager.cancelAllTransactions();

      this.provider = null;
      this.config = null;
    } catch (error) {
      if (this.options.enableEvents) {
        await this.eventService.broadcastErrorEvent(
          error as Error, 
          'disconnection'
        );
      }
      throw error;
    }
  }

  isConnected(): boolean {
    return this.provider ? this.provider.isConnected() : false;
  }

  getStats(): DatabaseStats {
    if (!this.provider) {
      throw new ConnectionError('Database is not connected');
    }
    return this.provider.getStats();
  }

  // CRUD Operations with event broadcasting
  async create<T>(table: string, data: Partial<T>): Promise<T> {
    const startTime = Date.now();
    
    try {
      this.ensureConnected();
      const result = await this.provider!.create(table, data);
      
      if (this.options.enableEvents) {
        await this.eventService.broadcastQueryEvent(
          `INSERT INTO ${table}`,
          Date.now() - startTime,
          'create',
          table,
          undefined,
          1
        );
      }
      
      return result;
    } catch (error) {
      if (this.options.enableEvents) {
        await this.eventService.broadcastErrorEvent(
          error as Error, 
          'create_operation', 
          `INSERT INTO ${table}`
        );
      }
      throw error;
    }
  }

  async read<T>(table: string, query?: QueryOptions): Promise<T[]> {
    const startTime = Date.now();
    
    try {
      this.ensureConnected();
      const result = await this.provider!.read(table, query);
      
      if (this.options.enableEvents) {
        await this.eventService.broadcastQueryEvent(
          `SELECT FROM ${table}`,
          Date.now() - startTime,
          'read',
          table,
          undefined,
          result.length
        );
      }
      
      return result;
    } catch (error) {
      if (this.options.enableEvents) {
        await this.eventService.broadcastErrorEvent(
          error as Error, 
          'read_operation', 
          `SELECT FROM ${table}`
        );
      }
      throw error;
    }
  }

  async readOne<T>(table: string, query: QueryOptions): Promise<T | null> {
    const result = await this.read<T>(table, { ...query, limit: 1 });
    return result.length > 0 ? result[0] : null;
  }

  async update<T>(table: string, id: string, data: Partial<T>): Promise<T> {
    const startTime = Date.now();
    
    try {
      this.ensureConnected();
      const result = await this.provider!.update(table, id, data);
      
      if (this.options.enableEvents) {
        await this.eventService.broadcastQueryEvent(
          `UPDATE ${table}`,
          Date.now() - startTime,
          'update',
          table,
          undefined,
          1
        );
      }
      
      return result;
    } catch (error) {
      if (this.options.enableEvents) {
        await this.eventService.broadcastErrorEvent(
          error as Error, 
          'update_operation', 
          `UPDATE ${table}`
        );
      }
      throw error;
    }
  }

  async delete(table: string, id: string): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      this.ensureConnected();
      const result = await this.provider!.delete(table, id);
      
      if (this.options.enableEvents) {
        await this.eventService.broadcastQueryEvent(
          `DELETE FROM ${table}`,
          Date.now() - startTime,
          'delete',
          table,
          undefined,
          result ? 1 : 0
        );
      }
      
      return result;
    } catch (error) {
      if (this.options.enableEvents) {
        await this.eventService.broadcastErrorEvent(
          error as Error, 
          'delete_operation', 
          `DELETE FROM ${table}`
        );
      }
      throw error;
    }
  }

  // Batch Operations
  async createMany<T>(table: string, data: Partial<T>[]): Promise<T[]> {
    this.ensureConnected();
    return this.provider!.createMany(table, data);
  }

  async updateMany<T>(table: string, query: QueryOptions, data: Partial<T>): Promise<T[]> {
    this.ensureConnected();
    return this.provider!.updateMany(table, query, data);
  }

  async deleteMany(table: string, query: QueryOptions): Promise<number> {
    this.ensureConnected();
    return this.provider!.deleteMany(table, query);
  }

  // Advanced Queries
  async rawQuery<T>(query: string, params?: any[]): Promise<T[]> {
    const startTime = Date.now();
    
    try {
      this.ensureConnected();
      const result = await this.provider!.rawQuery(query, params);
      
      if (this.options.enableEvents) {
        await this.eventService.broadcastQueryEvent(
          query,
          Date.now() - startTime,
          'raw',
          undefined,
          params,
          Array.isArray(result) ? result.length : 0
        );
      }
      
      return result;
    } catch (error) {
      if (this.options.enableEvents) {
        await this.eventService.broadcastErrorEvent(
          error as Error, 
          'raw_query', 
          query
        );
      }
      throw error;
    }
  }

  async transaction<T>(operations: TransactionOperation[]): Promise<T> {
    this.ensureConnected();
    
    const transactionId = await this.transactionManager.beginTransaction(this.provider!);
    const startTime = Date.now();
    
    try {
      if (this.options.enableEvents) {
        await this.eventService.broadcastTransactionEvent(
          transactionId,
          operations,
          undefined,
          'started'
        );
      }
      
      const result = await this.transactionManager.executeTransaction<T>(
        this.provider!,
        operations
      );
      
      if (this.options.enableEvents) {
        await this.eventService.broadcastTransactionEvent(
          transactionId,
          operations,
          result,
          'committed',
          Date.now() - startTime
        );
      }
      
      return result;
    } catch (error) {
      if (this.options.enableEvents) {
        await this.eventService.broadcastTransactionEvent(
          transactionId,
          operations,
          undefined,
          'failed',
          Date.now() - startTime
        );
        
        await this.eventService.broadcastErrorEvent(
          error as Error, 
          'transaction', 
          undefined,
          transactionId
        );
      }
      throw error;
    }
  }

  async count(table: string, query?: QueryOptions): Promise<number> {
    this.ensureConnected();
    return this.provider!.count(table, query);
  }

  async exists(table: string, query: QueryOptions): Promise<boolean> {
    this.ensureConnected();
    return this.provider!.exists(table, query);
  }

  // Schema Management
  async createTable(schema: TableSchema): Promise<void> {
    this.ensureConnected();
    return this.provider!.createTable(schema);
  }

  async dropTable(tableName: string): Promise<void> {
    this.ensureConnected();
    return this.provider!.dropTable(tableName);
  }

  async alterTable(tableName: string, modifications: TableModification[]): Promise<void> {
    this.ensureConnected();
    return this.provider!.alterTable(tableName, modifications);
  }

  async getTableSchema(tableName: string): Promise<TableSchema> {
    this.ensureConnected();
    return this.provider!.getTableSchema(tableName);
  }

  async listTables(): Promise<string[]> {
    this.ensureConnected();
    return this.provider!.listTables();
  }

  // Indexing and Performance
  async createIndex(tableName: string, columns: string[], options?: IndexOptions): Promise<void> {
    this.ensureConnected();
    return this.provider!.createIndex(tableName, columns, options);
  }

  async dropIndex(indexName: string): Promise<void> {
    this.ensureConnected();
    return this.provider!.dropIndex(indexName);
  }

  async analyzeQuery(query: string): Promise<QueryAnalysis> {
    this.ensureConnected();
    return this.provider!.analyzeQuery(query);
  }

  async optimizeTable(tableName: string): Promise<void> {
    this.ensureConnected();
    return this.provider!.optimizeTable(tableName);
  }

  // Utility Methods
  async ping(): Promise<boolean> {
    if (!this.provider) return false;
    return this.provider.ping();
  }

  async vacuum(): Promise<void> {
    this.ensureConnected();
    return this.provider!.vacuum();
  }

  async backup(path: string): Promise<void> {
    this.ensureConnected();
    return this.provider!.backup(path);
  }

  async restore(path: string): Promise<void> {
    this.ensureConnected();
    return this.provider!.restore(path);
  }

  // Service Management
  getConfigManager(): DatabaseConfigManager {
    return this.configManager;
  }

  getEventService(): DatabaseEventService {
    return this.eventService;
  }

  getTransactionManager(): DatabaseTransactionManager {
    return this.transactionManager;
  }

  getCurrentProvider(): BaseDatabaseProvider | null {
    return this.provider;
  }

  getCurrentConfig(): DatabaseConfig | null {
    return this.config;
  }

  // Health and Performance Monitoring
  async getHealthStatus(): Promise<{
    connected: boolean;
    responseTime: number;
    poolStats?: any;
    errors: string[];
  }> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      const connected = await this.ping();
      const responseTime = Date.now() - startTime;
      const poolStats = this.provider?.getStats();

      return {
        connected,
        responseTime,
        poolStats,
        errors
      };
    } catch (error) {
      return {
        connected: false,
        responseTime: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  private ensureConnected(): void {
    if (!this.provider || !this.isConnected()) {
      throw new ConnectionError('Database is not connected');
    }
  }

  private setupEventListeners(): void {
    if (this.options.enableEvents) {
      // Listen for transaction events
      this.transactionManager.on('transactionStarted', async ({ transactionId, context }) => {
        await this.eventService.broadcastTransactionEvent(
          transactionId,
          context.operations,
          undefined,
          'started'
        );
      });

      this.transactionManager.on('transactionCommitted', async ({ transactionId, context }) => {
        await this.eventService.broadcastTransactionEvent(
          transactionId,
          context.operations,
          undefined,
          'committed'
        );
      });

      this.transactionManager.on('transactionRolledBack', async ({ transactionId, context }) => {
        await this.eventService.broadcastTransactionEvent(
          transactionId,
          context.operations,
          undefined,
          'rolled_back'
        );
      });
    }
  }

  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(async () => {
      try {
        const health = await this.getHealthStatus();
        
        if (!health.connected) {
          await this.eventService.broadcastErrorEvent(
            new Error('Database health check failed'),
            'health_monitor'
          );
        }

        if (health.responseTime > 1000) {
          await this.eventService.broadcastPerformanceEvent(
            'slow_query',
            health.responseTime,
            1000,
            { operation: 'health_check' }
          );
        }
      } catch (error) {
        await this.eventService.broadcastErrorEvent(
          error as Error,
          'health_monitor'
        );
      }
    }, this.options.healthCheckInterval);
  }

  private startPerformanceMonitoring(): void {
    this.performanceMonitor = setInterval(async () => {
      try {
        const stats = this.getStats();
        
        // Check for high connection usage
        const connectionUsage = stats.activeConnections / stats.totalConnections;
        if (connectionUsage > 0.8) {
          await this.eventService.broadcastPerformanceEvent(
            'connection_limit',
            connectionUsage,
            0.8,
            stats
          );
        }

        // Check for slow average query time
        if (stats.averageQueryTime > 500) {
          await this.eventService.broadcastPerformanceEvent(
            'slow_query',
            stats.averageQueryTime,
            500,
            { average: true }
          );
        }
      } catch (error) {
        // Silent error - performance monitoring is not critical
      }
    }, 60000); // Check every minute
  }
}

// Export factory function
export function createDatabaseService(options?: DatabaseServiceOptions): UnifiedDatabaseService {
  return new UnifiedDatabaseService(options);
}