/**
 * Database Provider Factory
 * Factory for creating database provider instances
 */

import { 
  DatabaseConfig, 
  IDatabaseService,
  DatabaseError
} from '../../../shared-utils/database-interface';

export interface DatabaseProviderCapabilities {
  supportsTransactions: boolean;
  supportsNestedTransactions: boolean;
  supportsJsonQueries: boolean;
  supportsFullTextSearch: boolean;
  supportsReplication: boolean;
  supportsBackup: boolean;
  maxConnections: number;
  supportedFeatures: string[];
}

export interface DatabaseProviderFactory {
  create(config: DatabaseConfig): IDatabaseService;
  validateConfig(config: DatabaseConfig): { valid: boolean; errors: string[] };
  getCapabilities(): DatabaseProviderCapabilities;
}

export class DatabaseProviderRegistry {
  private static instance: DatabaseProviderRegistry;
  private providers = new Map<string, DatabaseProviderFactory>();

  private constructor() {
    this.registerDefaultProviders();
  }

  static getInstance(): DatabaseProviderRegistry {
    if (!DatabaseProviderRegistry.instance) {
      DatabaseProviderRegistry.instance = new DatabaseProviderRegistry();
    }
    return DatabaseProviderRegistry.instance;
  }

  /**
   * Register a database provider
   */
  register(type: string, factory: DatabaseProviderFactory): void {
    this.providers.set(type, factory);
  }

  /**
   * Create database service instance
   */
  create(config: DatabaseConfig): IDatabaseService {
    const factory = this.providers.get(config.type);
    if (!factory) {
      throw new DatabaseError(`Unknown database provider: ${config.type}`);
    }

    // Validate configuration
    const validation = factory.validateConfig(config);
    if (!validation.valid) {
      throw new DatabaseError(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    return factory.create(config);
  }

  /**
   * List available providers
   */
  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(type: string): DatabaseProviderCapabilities | null {
    const factory = this.providers.get(type);
    return factory ? factory.getCapabilities() : null;
  }

  /**
   * Check if provider is available
   */
  hasProvider(type: string): boolean {
    return this.providers.has(type);
  }

  private async registerDefaultProviders(): Promise<void> {
    try {
      // Register Supabase provider
      const { SupabaseDatabaseProviderFactory } = await import('./SupabaseDatabaseProvider');
      this.register('supabase', new SupabaseDatabaseProviderFactory());

      // Register PostgreSQL provider
      const { PostgreSQLDatabaseProviderFactory } = await import('./PostgreSQLDatabaseProvider');
      this.register('postgresql', new PostgreSQLDatabaseProviderFactory());

      // Register Mock provider
      const { MockDatabaseProviderFactory } = await import('./MockDatabaseProvider');
      this.register('mock', new MockDatabaseProviderFactory());
    } catch (error) {
      console.warn('Some database providers failed to load:', error);
    }
  }
}

/**
 * Convenience factory class
 */
export class DatabaseProviderFactory {
  private static registry = DatabaseProviderRegistry.getInstance();

  /**
   * Create database service from configuration
   */
  static create(config: DatabaseConfig): IDatabaseService {
    return this.registry.create(config);
  }

  /**
   * Register custom provider
   */
  static registerProvider(type: string, factory: DatabaseProviderFactory): void {
    this.registry.register(type, factory);
  }

  /**
   * List available providers
   */
  static listProviders(): string[] {
    return this.registry.listProviders();
  }

  /**
   * Get provider capabilities
   */
  static getCapabilities(type: string): DatabaseProviderCapabilities | null {
    return this.registry.getCapabilities(type);
  }
}

// Export the singleton registry
export const databaseProviderRegistry = DatabaseProviderRegistry.getInstance();