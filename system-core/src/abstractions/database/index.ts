/**
 * Database Abstraction Layer - Main Index
 * Unified export for all database abstraction components
 */

// Core Service
export { 
  UnifiedDatabaseService, 
  createDatabaseService,
  type DatabaseServiceOptions 
} from './UnifiedDatabaseService';

// Shared Utils Integration
export * from '../../shared-utils/database-interface';

// Configuration Management
export { 
  DatabaseConfigManager, 
  databaseConfigManager,
  type DatabaseEnvironmentConfig,
  type ConfigValidationResult 
} from './config/DatabaseConfigManager';

// Provider System
export { 
  DatabaseProviderFactory,
  DatabaseProviderRegistry,
  databaseProviderRegistry,
  type DatabaseProviderCapabilities,
  type DatabaseProviderFactory as IProviderFactory
} from './providers/DatabaseProviderFactory';

export { 
  BaseDatabaseProvider 
} from './providers/BaseDatabaseProvider';

export { 
  SupabaseDatabaseProvider,
  SupabaseDatabaseProviderFactory 
} from './providers/SupabaseDatabaseProvider';

export { 
  PostgreSQLDatabaseProvider,
  PostgreSQLDatabaseProviderFactory 
} from './providers/PostgreSQLDatabaseProvider';

export { 
  MockDatabaseProvider,
  MockDatabaseProviderFactory 
} from './providers/MockDatabaseProvider';

// Connection Pool
export { 
  DatabaseConnectionPool,
  type PoolConnection,
  type PoolStats,
  type PoolOptions 
} from './connection-pool/DatabaseConnectionPool';

// Transaction Management
export { 
  DatabaseTransactionManager,
  type TransactionContext,
  type TransactionOptions,
  type TransactionStats 
} from './transaction/DatabaseTransactionManager';

// Event System
export { 
  DatabaseEventService,
  databaseEventService,
  type DatabaseEvent,
  type QueryEvent,
  type ConnectionEvent,
  type TransactionEvent,
  type ErrorEvent,
  type PerformanceEvent,
  type EventSubscription 
} from './events/DatabaseEventService';

// Repository Helpers
export { 
  EnhancedRepository,
  createRepository,
  type RepositoryOptions,
  type RepositoryQueryOptions 
} from './repository/EnhancedRepository';

// Utility Functions
export { 
  createDatabaseConnection,
  validateDatabaseConfig,
  getDatabaseProviderCapabilities,
  switchDatabaseProvider
} from './utils/DatabaseUtils';

/**
 * Default Database Service Instance
 * Pre-configured service ready for use
 */
let defaultServiceInstance: UnifiedDatabaseService | null = null;

export function getDefaultDatabaseService(): UnifiedDatabaseService {
  if (!defaultServiceInstance) {
    defaultServiceInstance = createDatabaseService({
      autoConnect: false, // Don't auto-connect, let user configure first
      enableEvents: true,
      enablePerformanceMonitoring: true,
      healthCheckInterval: 30000
    });
  }
  return defaultServiceInstance;
}

export function setDefaultDatabaseService(service: UnifiedDatabaseService): void {
  defaultServiceInstance = service;
}

/**
 * Quick Setup Functions
 */
export async function setupSupabaseDatabase(url: string, key: string): Promise<UnifiedDatabaseService> {
  const service = createDatabaseService();
  await service.connect({
    type: 'supabase',
    supabase: { url, anonKey: key }
  });
  return service;
}

export async function setupPostgreSQLDatabase(
  host: string, 
  port: number, 
  database: string, 
  username: string, 
  password: string
): Promise<UnifiedDatabaseService> {
  const service = createDatabaseService();
  await service.connect({
    type: 'postgresql',
    connection: { host, port, database, username, password }
  });
  return service;
}

export async function setupMockDatabase(): Promise<UnifiedDatabaseService> {
  const service = createDatabaseService();
  await service.connect({
    type: 'mock'
  });
  return service;
}

/**
 * Migration Helpers
 */
export async function migrateFromProvider(
  source: UnifiedDatabaseService,
  target: UnifiedDatabaseService,
  tables?: string[]
): Promise<void> {
  const tablesToMigrate = tables || await source.listTables();
  
  for (const table of tablesToMigrate) {
    try {
      // Get all data from source
      const data = await source.read(table);
      
      // Insert into target (this is a basic implementation)
      if (data.length > 0) {
        await target.createMany(table, data);
      }
    } catch (error) {
      console.error(`Failed to migrate table ${table}:`, error);
      throw error;
    }
  }
}

/**
 * Health Check Utilities
 */
export async function checkDatabaseHealth(service: UnifiedDatabaseService): Promise<{
  healthy: boolean;
  details: any;
}> {
  try {
    const health = await service.getHealthStatus();
    return {
      healthy: health.connected && health.errors.length === 0,
      details: health
    };
  } catch (error) {
    return {
      healthy: false,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

/**
 * Performance Monitoring Helpers
 */
export function createPerformanceMonitor(service: UnifiedDatabaseService) {
  const eventService = service.getEventService();
  
  return {
    onSlowQuery: (callback: (query: string, duration: number) => void, thresholdMs = 1000) => {
      return eventService.subscribe(
        'query',
        (event) => {
          const queryEvent = event as any;
          callback(queryEvent.data.query, queryEvent.data.duration);
        },
        eventService.createSlowQueryFilter(thresholdMs)
      );
    },
    
    onHighConnectionUsage: (callback: (usage: number) => void, threshold = 0.8) => {
      return eventService.subscribe(
        'performance',
        (event) => {
          const perfEvent = event as any;
          if (perfEvent.data.metric === 'connection_limit') {
            callback(perfEvent.data.value);
          }
        }
      );
    },
    
    getQueryStats: () => {
      return eventService.getEventHistory('query', 100);
    }
  };
}