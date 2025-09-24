/**
 * Enhanced Provider Factory with Firebase Support
 * Registers and manages all available backend providers
 */

import { DatabaseConfig } from '../../../shared-utils/database-interface';
import { BaseDatabaseProvider } from './BaseDatabaseProvider';
import { SupabaseDatabaseProvider } from './SupabaseDatabaseProvider';
import { FirebaseDatabaseProvider } from './FirebaseDatabaseProvider';
import { MongoDBDatabaseProvider } from './MongoDBDatabaseProvider';
import { PostgreSQLDatabaseProvider } from './PostgreSQLDatabaseProvider';
import { MockDatabaseProvider } from './MockDatabaseProvider';

export interface DatabaseProviderCapabilities {
  supportsTransactions: boolean;
  supportsReplication: boolean;
  supportsSharding: boolean;
  supportsBackup: boolean;
  maxConnections: number;
  supportedFeatures: string[];
}

export class DatabaseProviderFactory {
  private static providers = new Map<string, typeof BaseDatabaseProvider>();
  private static capabilities = new Map<string, DatabaseProviderCapabilities>();

  static {
    // Register all available providers
    this.registerProvider('supabase', SupabaseDatabaseProvider, {
      supportsTransactions: true,
      supportsReplication: true,
      supportsSharding: false,
      supportsBackup: true,
      maxConnections: 200,
      supportedFeatures: ['realtime', 'rls', 'functions', 'triggers']
    });

    this.registerProvider('firebase', FirebaseDatabaseProvider, {
      supportsTransactions: true,
      supportsReplication: true,
      supportsSharding: true,
      supportsBackup: true,
      maxConnections: 1000000,
      supportedFeatures: ['realtime', 'offline', 'security-rules']
    });

    this.registerProvider('mongodb', MongoDBDatabaseProvider, {
      supportsTransactions: true,
      supportsReplication: true,
      supportsSharding: true,
      supportsBackup: true,
      maxConnections: 1000,
      supportedFeatures: ['aggregation', 'indexing', 'text-search']
    });

    this.registerProvider('postgresql', PostgreSQLDatabaseProvider, {
      supportsTransactions: true,
      supportsReplication: true,
      supportsSharding: true,
      supportsBackup: true,
      maxConnections: 100,
      supportedFeatures: ['acid', 'jsonb', 'full-text-search', 'spatial']
    });

    this.registerProvider('mock', MockDatabaseProvider, {
      supportsTransactions: true,
      supportsReplication: false,
      supportsSharding: false,
      supportsBackup: false,
      maxConnections: 10,
      supportedFeatures: ['testing', 'in-memory']
    });
  }

  /**
   * Register a new database provider
   */
  static registerProvider(
    name: string,
    providerClass: typeof BaseDatabaseProvider,
    capabilities: DatabaseProviderCapabilities
  ): void {
    this.providers.set(name, providerClass);
    this.capabilities.set(name, capabilities);
  }

  /**
   * Create a database provider instance
   */
  static createProvider(config: DatabaseConfig): BaseDatabaseProvider {
    const ProviderClass = this.providers.get(config.type);
    
    if (!ProviderClass) {
      throw new Error(`Unknown database provider: ${config.type}`);
    }

    return new ProviderClass(config);
  }

  /**
   * Get provider capabilities
   */
  static getProviderCapabilities(providerType: string): DatabaseProviderCapabilities | null {
    return this.capabilities.get(providerType) || null;
  }

  /**
   * List all available providers
   */
  static getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is available
   */
  static isProviderAvailable(providerType: string): boolean {
    return this.providers.has(providerType);
  }

  /**
   * Get providers that support specific features
   */
  static getProvidersWithFeature(feature: string): string[] {
    const result: string[] = [];
    
    for (const [name, capabilities] of this.capabilities.entries()) {
      if (capabilities.supportedFeatures.includes(feature)) {
        result.push(name);
      }
    }
    
    return result;
  }

  /**
   * Find the best provider for given requirements
   */
  static findBestProvider(requirements: {
    maxConnections?: number;
    requiredFeatures?: string[];
    preferredProviders?: string[];
  }): string | null {
    const candidates = this.getAvailableProviders();
    
    // Filter by requirements
    const suitable = candidates.filter(name => {
      const capabilities = this.capabilities.get(name);
      if (!capabilities) return false;
      
      // Check max connections
      if (requirements.maxConnections && capabilities.maxConnections < requirements.maxConnections) {
        return false;
      }
      
      // Check required features
      if (requirements.requiredFeatures) {
        for (const feature of requirements.requiredFeatures) {
          if (!capabilities.supportedFeatures.includes(feature)) {
            return false;
          }
        }
      }
      
      return true;
    });
    
    if (suitable.length === 0) return null;
    
    // Prefer specific providers if specified
    if (requirements.preferredProviders) {
      for (const preferred of requirements.preferredProviders) {
        if (suitable.includes(preferred)) {
          return preferred;
        }
      }
    }
    
    // Return first suitable provider
    return suitable[0];
  }
}