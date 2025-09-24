/**
 * Database Utilities
 * Helper functions for database operations and management
 */

import { 
  DatabaseConfig,
  DatabaseError,
  ConnectionError
} from '../../../shared-utils/database-interface';
import { UnifiedDatabaseService } from '../UnifiedDatabaseService';
import { DatabaseProviderFactory, DatabaseProviderCapabilities } from '../providers/DatabaseProviderFactory';
import { DatabaseConfigManager } from '../config/DatabaseConfigManager';

/**
 * Create and initialize a database connection
 */
export async function createDatabaseConnection(
  config: DatabaseConfig
): Promise<UnifiedDatabaseService> {
  const service = new UnifiedDatabaseService({
    autoConnect: false,
    enableEvents: true,
    enablePerformanceMonitoring: true
  });

  await service.connect(config);
  return service;
}

/**
 * Validate database configuration
 */
export function validateDatabaseConfig(config: DatabaseConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const configManager = DatabaseConfigManager.getInstance();
  const validation = configManager.validateConfig(config);
  
  return {
    valid: validation.valid,
    errors: validation.errors,
    warnings: validation.warnings
  };
}

/**
 * Get capabilities for a database provider
 */
export function getDatabaseProviderCapabilities(
  providerType: string
): DatabaseProviderCapabilities | null {
  return DatabaseProviderFactory.getCapabilities(providerType);
}

/**
 * Switch database provider for an existing service
 */
export async function switchDatabaseProvider(
  service: UnifiedDatabaseService,
  newConfig: DatabaseConfig
): Promise<void> {
  // Validate new configuration
  const validation = validateDatabaseConfig(newConfig);
  if (!validation.valid) {
    throw new DatabaseError(`Invalid configuration: ${validation.errors.join(', ')}`);
  }

  // Disconnect from current provider
  if (service.isConnected()) {
    await service.disconnect();
  }

  // Connect to new provider
  await service.connect(newConfig);
}

/**
 * Test database connection without creating a persistent service
 */
export async function testDatabaseConnection(
  config: DatabaseConfig
): Promise<{ success: boolean; error?: string; responseTime?: number }> {
  const startTime = Date.now();
  
  try {
    const provider = DatabaseProviderFactory.create(config);
    await provider.connect(config);
    
    const isConnected = provider.isConnected();
    const responseTime = Date.now() - startTime;
    
    await provider.disconnect();
    
    return {
      success: isConnected,
      responseTime
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    };
  }
}

/**
 * Create database configuration from environment variables
 */
export function createConfigFromEnvironment(): DatabaseConfig {
  const configManager = DatabaseConfigManager.getInstance();
  return configManager.loadFromEnvironment();
}

/**
 * Create database configuration for specific provider
 */
export function createProviderConfig(
  providerType: 'supabase' | 'postgresql' | 'mock',
  connectionDetails: any
): DatabaseConfig {
  const baseConfig: DatabaseConfig = {
    type: providerType
  };

  switch (providerType) {
    case 'supabase':
      baseConfig.supabase = {
        url: connectionDetails.url,
        anonKey: connectionDetails.anonKey,
        serviceRoleKey: connectionDetails.serviceRoleKey
      };
      break;
      
    case 'postgresql':
      baseConfig.connection = {
        host: connectionDetails.host,
        port: connectionDetails.port,
        database: connectionDetails.database,
        username: connectionDetails.username,
        password: connectionDetails.password,
        ssl: connectionDetails.ssl
      };
      break;
      
    case 'mock':
      // Mock provider doesn't need specific configuration
      break;
      
    default:
      throw new DatabaseError(`Unsupported provider type: ${providerType}`);
  }

  return baseConfig;
}

/**
 * Compare database provider capabilities
 */
export function compareProviderCapabilities(
  provider1: string,
  provider2: string
): {
  provider1: DatabaseProviderCapabilities | null;
  provider2: DatabaseProviderCapabilities | null;
  comparison: {
    feature: string;
    provider1Support: boolean;
    provider2Support: boolean;
  }[];
} {
  const caps1 = getDatabaseProviderCapabilities(provider1);
  const caps2 = getDatabaseProviderCapabilities(provider2);
  
  const allFeatures = new Set<string>();
  if (caps1) caps1.supportedFeatures.forEach(f => allFeatures.add(f));
  if (caps2) caps2.supportedFeatures.forEach(f => allFeatures.add(f));
  
  const comparison = Array.from(allFeatures).map(feature => ({
    feature,
    provider1Support: caps1?.supportedFeatures.includes(feature) || false,
    provider2Support: caps2?.supportedFeatures.includes(feature) || false
  }));
  
  return {
    provider1: caps1,
    provider2: caps2,
    comparison
  };
}

/**
 * Health check for multiple database services
 */
export async function checkMultipleDatabaseHealth(
  services: { name: string; service: UnifiedDatabaseService }[]
): Promise<{
  name: string;
  healthy: boolean;
  details: any;
}[]> {
  const results = await Promise.allSettled(
    services.map(async ({ name, service }) => {
      const health = await service.getHealthStatus();
      return {
        name,
        healthy: health.connected && health.errors.length === 0,
        details: health
      };
    })
  );
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        name: services[index].name,
        healthy: false,
        details: { error: result.reason }
      };
    }
  });
}

/**
 * Benchmark database operations
 */
export async function benchmarkDatabaseOperations(
  service: UnifiedDatabaseService,
  operations: {
    name: string;
    operation: () => Promise<any>;
  }[]
): Promise<{
  name: string;
  executionTime: number;
  success: boolean;
  error?: string;
}[]> {
  const results = [];
  
  for (const { name, operation } of operations) {
    const startTime = Date.now();
    
    try {
      await operation();
      results.push({
        name,
        executionTime: Date.now() - startTime,
        success: true
      });
    } catch (error) {
      results.push({
        name,
        executionTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return results;
}

/**
 * Create database schema from table definitions
 */
export async function createSchemaFromDefinitions(
  service: UnifiedDatabaseService,
  tableDefinitions: {
    name: string;
    columns: Array<{
      name: string;
      type: string;
      nullable?: boolean;
      defaultValue?: any;
      primaryKey?: boolean;
      unique?: boolean;
    }>;
    indexes?: Array<{
      columns: string[];
      unique?: boolean;
    }>;
  }[]
): Promise<void> {
  for (const tableDef of tableDefinitions) {
    // Create table
    await service.createTable({
      name: tableDef.name,
      columns: tableDef.columns.map(col => ({
        name: col.name,
        type: col.type,
        nullable: col.nullable ?? true,
        defaultValue: col.defaultValue,
        primaryKey: col.primaryKey ?? false,
        unique: col.unique ?? false
      }))
    });
    
    // Create indexes
    if (tableDef.indexes) {
      for (const indexDef of tableDef.indexes) {
        await service.createIndex(
          tableDef.name,
          indexDef.columns,
          { unique: indexDef.unique }
        );
      }
    }
  }
}

/**
 * Backup database data to JSON
 */
export async function backupDatabaseToJSON(
  service: UnifiedDatabaseService,
  tables?: string[]
): Promise<{ [tableName: string]: any[] }> {
  const tablesToBackup = tables || await service.listTables();
  const backup: { [tableName: string]: any[] } = {};
  
  for (const table of tablesToBackup) {
    try {
      backup[table] = await service.read(table);
    } catch (error) {
      console.warn(`Failed to backup table ${table}:`, error);
      backup[table] = [];
    }
  }
  
  return backup;
}

/**
 * Restore database data from JSON backup
 */
export async function restoreDatabaseFromJSON(
  service: UnifiedDatabaseService,
  backup: { [tableName: string]: any[] },
  clearExisting = false
): Promise<void> {
  for (const [tableName, data] of Object.entries(backup)) {
    try {
      // Clear existing data if requested
      if (clearExisting) {
        await service.deleteMany(tableName, {});
      }
      
      // Insert backup data
      if (data.length > 0) {
        await service.createMany(tableName, data);
      }
    } catch (error) {
      console.error(`Failed to restore table ${tableName}:`, error);
      throw error;
    }
  }
}

/**
 * Query performance analyzer
 */
export class QueryPerformanceAnalyzer {
  private queryHistory: Array<{
    query: string;
    duration: number;
    timestamp: Date;
    table?: string;
    rowsAffected: number;
  }> = [];
  
  private maxHistorySize: number;
  
  constructor(maxHistorySize = 1000) {
    this.maxHistorySize = maxHistorySize;
  }
  
  addQuery(
    query: string,
    duration: number,
    table?: string,
    rowsAffected = 0
  ): void {
    this.queryHistory.push({
      query,
      duration,
      timestamp: new Date(),
      table,
      rowsAffected
    });
    
    // Maintain history size
    if (this.queryHistory.length > this.maxHistorySize) {
      this.queryHistory = this.queryHistory.slice(-this.maxHistorySize);
    }
  }
  
  getSlowQueries(threshold = 1000): typeof this.queryHistory {
    return this.queryHistory.filter(q => q.duration > threshold);
  }
  
  getAverageQueryTime(): number {
    if (this.queryHistory.length === 0) return 0;
    
    const total = this.queryHistory.reduce((sum, q) => sum + q.duration, 0);
    return total / this.queryHistory.length;
  }
  
  getQueryStatsByTable(): { [table: string]: { count: number; avgDuration: number } } {
    const stats: { [table: string]: { durations: number[]; count: number } } = {};
    
    for (const query of this.queryHistory) {
      const table = query.table || 'unknown';
      if (!stats[table]) {
        stats[table] = { durations: [], count: 0 };
      }
      stats[table].durations.push(query.duration);
      stats[table].count++;
    }
    
    const result: { [table: string]: { count: number; avgDuration: number } } = {};
    for (const [table, data] of Object.entries(stats)) {
      result[table] = {
        count: data.count,
        avgDuration: data.durations.reduce((a, b) => a + b, 0) / data.durations.length
      };
    }
    
    return result;
  }
  
  clear(): void {
    this.queryHistory = [];
  }
}

/**
 * Database migration utilities
 */
export class DatabaseMigrationRunner {
  private service: UnifiedDatabaseService;
  private migrations: Array<{
    version: string;
    name: string;
    up: () => Promise<void>;
    down: () => Promise<void>;
  }> = [];
  
  constructor(service: UnifiedDatabaseService) {
    this.service = service;
  }
  
  addMigration(
    version: string,
    name: string,
    up: () => Promise<void>,
    down: () => Promise<void>
  ): void {
    this.migrations.push({ version, name, up, down });
    this.migrations.sort((a, b) => a.version.localeCompare(b.version));
  }
  
  async runMigrations(): Promise<void> {
    // Ensure migrations table exists
    await this.ensureMigrationsTable();
    
    // Get applied migrations
    const appliedMigrations = await this.getAppliedMigrations();
    
    // Run pending migrations
    for (const migration of this.migrations) {
      if (!appliedMigrations.includes(migration.version)) {
        console.log(`Running migration ${migration.version}: ${migration.name}`);
        
        try {
          await migration.up();
          await this.recordMigration(migration.version, migration.name);
          console.log(`Migration ${migration.version} completed successfully`);
        } catch (error) {
          console.error(`Migration ${migration.version} failed:`, error);
          throw error;
        }
      }
    }
  }
  
  async rollbackMigration(version: string): Promise<void> {
    const migration = this.migrations.find(m => m.version === version);
    if (!migration) {
      throw new Error(`Migration ${version} not found`);
    }
    
    console.log(`Rolling back migration ${version}: ${migration.name}`);
    
    try {
      await migration.down();
      await this.removeMigrationRecord(version);
      console.log(`Migration ${version} rolled back successfully`);
    } catch (error) {
      console.error(`Migration rollback ${version} failed:`, error);
      throw error;
    }
  }
  
  private async ensureMigrationsTable(): Promise<void> {
    try {
      await this.service.createTable({
        name: '_migrations',
        columns: [
          { name: 'version', type: 'VARCHAR(255)', primaryKey: true },
          { name: 'name', type: 'VARCHAR(255)', nullable: false },
          { name: 'applied_at', type: 'TIMESTAMP', nullable: false }
        ]
      });
    } catch (error) {
      // Table might already exist
    }
  }
  
  private async getAppliedMigrations(): Promise<string[]> {
    try {
      const results = await this.service.read<{ version: string }>('_migrations');
      return results.map(r => r.version);
    } catch (error) {
      return [];
    }
  }
  
  private async recordMigration(version: string, name: string): Promise<void> {
    await this.service.create('_migrations', {
      version,
      name,
      applied_at: new Date()
    });
  }
  
  private async removeMigrationRecord(version: string): Promise<void> {
    await this.service.deleteMany('_migrations', {
      where: [{ column: 'version', operator: 'eq', value: version }]
    });
  }
}