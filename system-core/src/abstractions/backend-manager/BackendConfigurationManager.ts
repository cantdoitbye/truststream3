/**
 * Backend Configuration Manager
 * Handles backend configuration validation, loading, and management
 */

import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';
import { 
  BackendConfiguration, 
  BackendProvider, 
  ProviderValidation,
  ConfigurationValidation,
  ProviderCapabilities,
  CompatibilityMatrix
} from './types';
import { DatabaseProviderFactory } from '../database/providers/DatabaseProviderFactory';
import { AuthProviderFactory } from '../auth/providers/AuthProviderFactory';
import { StorageProviderFactory } from '../storage/providers/StorageProviderFactory';

export interface ConfigurationManagerOptions {
  configPath?: string;
  enableValidation?: boolean;
  enableCompatibilityCheck?: boolean;
  cacheConfigurations?: boolean;
}

export class BackendConfigurationManager extends EventEmitter {
  private options: Required<ConfigurationManagerOptions>;
  private configCache = new Map<string, BackendConfiguration>();
  private validationCache = new Map<string, ConfigurationValidation>();
  private compatibilityMatrix: CompatibilityMatrix[] = [];
  
  constructor(options: ConfigurationManagerOptions = {}) {
    super();
    
    this.options = {
      configPath: options.configPath ?? './config/backend.json',
      enableValidation: options.enableValidation ?? true,
      enableCompatibilityCheck: options.enableCompatibilityCheck ?? true,
      cacheConfigurations: options.cacheConfigurations ?? true
    };
    
    this.loadCompatibilityMatrix();
  }

  /**
   * Load configuration from file or create default
   */
  async loadConfiguration(configPath?: string): Promise<BackendConfiguration> {
    const filePath = configPath || this.options.configPath;
    
    try {
      // Check cache first
      if (this.options.cacheConfigurations && this.configCache.has(filePath)) {
        return this.configCache.get(filePath)!;
      }
      
      const configData = await fs.readFile(filePath, 'utf-8');
      const config: BackendConfiguration = JSON.parse(configData);
      
      // Validate configuration
      if (this.options.enableValidation) {
        const validation = await this.validateConfiguration(config);
        if (!validation.valid) {
          throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
        }
      }
      
      // Cache configuration
      if (this.options.cacheConfigurations) {
        this.configCache.set(filePath, config);
      }
      
      this.emit('configuration:loaded', { config, path: filePath });
      return config;
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        // File doesn't exist, create default configuration
        const defaultConfig = this.createDefaultConfiguration();
        await this.saveConfiguration(defaultConfig, filePath);
        return defaultConfig;
      }
      throw error;
    }
  }

  /**
   * Save configuration to file
   */
  async saveConfiguration(
    config: BackendConfiguration, 
    configPath?: string
  ): Promise<void> {
    const filePath = configPath || this.options.configPath;
    
    try {
      // Validate before saving
      if (this.options.enableValidation) {
        const validation = await this.validateConfiguration(config);
        if (!validation.valid) {
          throw new Error(`Cannot save invalid configuration: ${validation.errors.join(', ')}`);
        }
      }
      
      // Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      // Save configuration
      await fs.writeFile(filePath, JSON.stringify(config, null, 2));
      
      // Update cache
      if (this.options.cacheConfigurations) {
        this.configCache.set(filePath, config);
      }
      
      this.emit('configuration:saved', { config, path: filePath });
      
    } catch (error) {
      this.emit('configuration:save:failed', { error, path: filePath });
      throw error;
    }
  }

  /**
   * Validate backend configuration
   */
  async validateConfiguration(config: BackendConfiguration): Promise<ConfigurationValidation> {
    const cacheKey = JSON.stringify(config);
    
    // Check cache first
    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey)!;
    }
    
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    try {
      // Basic structure validation
      if (!config.version) {
        errors.push('Configuration version is required');
      }
      
      if (!config.name) {
        errors.push('Configuration name is required');
      }
      
      if (!config.activeProvider) {
        errors.push('Active provider must be specified');
      }
      
      if (!config.providers || Object.keys(config.providers).length === 0) {
        errors.push('At least one provider must be configured');
      }
      
      // Validate active provider exists
      if (config.activeProvider && !config.providers[config.activeProvider]) {
        errors.push(`Active provider '${config.activeProvider}' not found in providers`);
      }
      
      // Validate each provider
      for (const [name, provider] of Object.entries(config.providers)) {
        const providerValidation = await this.validateProvider(name, provider);
        if (!providerValidation.valid) {
          errors.push(...providerValidation.errors.map(e => `Provider '${name}': ${e}`));
        }
      }
      
      // Check compatibility if enabled
      if (this.options.enableCompatibilityCheck && Object.keys(config.providers).length > 1) {
        const compatibilityIssues = this.checkProviderCompatibility(config.providers);
        warnings.push(...compatibilityIssues);
      }
      
      // Performance suggestions
      const activeProvider = config.providers[config.activeProvider];
      if (activeProvider) {
        if (activeProvider.priority < 1) {
          suggestions.push('Consider increasing priority for the active provider');
        }
        
        if (!activeProvider.database.options?.poolSize) {
          suggestions.push('Configure connection pooling for better performance');
        }
      }
      
      const validation: ConfigurationValidation = {
        valid: errors.length === 0,
        errors,
        warnings,
        suggestions
      };
      
      // Cache validation result
      this.validationCache.set(cacheKey, validation);
      
      return validation;
      
    } catch (error) {
      return {
        valid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        suggestions: []
      };
    }
  }

  /**
   * Validate individual provider configuration
   */
  async validateProvider(name: string, provider: BackendProvider): Promise<ProviderValidation> {
    const errors: string[] = [];
    
    try {
      // Basic provider validation
      if (!provider.name) {
        errors.push('Provider name is required');
      }
      
      if (!provider.type) {
        errors.push('Provider type is required');
      }
      
      if (provider.priority < 0) {
        errors.push('Provider priority must be non-negative');
      }
      
      // Validate database configuration
      if (provider.database) {
        const dbValidation = DatabaseProviderFactory.validateConfig ? 
          DatabaseProviderFactory.validateConfig(provider.database) : 
          { valid: true, errors: [] };
        
        if (!dbValidation.valid) {
          errors.push(...dbValidation.errors.map(e => `Database: ${e}`));
        }
      } else {
        errors.push('Database configuration is required');
      }
      
      // Validate auth configuration
      if (provider.auth) {
        const authValidation = AuthProviderFactory.validateConfig ? 
          AuthProviderFactory.validateConfig(provider.auth) : 
          { valid: true, errors: [] };
        
        if (!authValidation.valid) {
          errors.push(...authValidation.errors.map(e => `Auth: ${e}`));
        }
      }
      
      // Validate storage configuration
      if (provider.storage) {
        const storageValidation = StorageProviderFactory.validateConfig ? 
          StorageProviderFactory.validateConfig(provider.storage) : 
          { valid: true, errors: [] };
        
        if (!storageValidation.valid) {
          errors.push(...storageValidation.errors.map(e => `Storage: ${e}`));
        }
      }
      
      // Test connection if provider is enabled
      let connectionTest = false;
      if (provider.enabled) {
        try {
          connectionTest = await this.testProviderConnection(provider);
        } catch (error) {
          errors.push(`Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      return {
        name,
        valid: errors.length === 0,
        errors,
        capabilities: provider.capabilities,
        connectionTest
      };
      
    } catch (error) {
      return {
        name,
        valid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        capabilities: provider.capabilities,
        connectionTest: false
      };
    }
  }

  /**
   * Test provider connection without full initialization
   */
  private async testProviderConnection(provider: BackendProvider): Promise<boolean> {
    // This would need to be implemented based on the specific provider type
    // For now, return true as a placeholder
    return true;
  }

  /**
   * Check compatibility between providers
   */
  private checkProviderCompatibility(providers: Record<string, BackendProvider>): string[] {
    const warnings: string[] = [];
    const providerTypes = Object.values(providers).map(p => p.type);
    
    // Check for known incompatibilities
    for (const matrix of this.compatibilityMatrix) {
      if (providerTypes.includes(matrix.source as any) && 
          providerTypes.includes(matrix.target as any) && 
          !matrix.compatible) {
        warnings.push(`Incompatibility detected between ${matrix.source} and ${matrix.target}: ${matrix.limitations.join(', ')}`);
      }
    }
    
    return warnings;
  }

  /**
   * Create default configuration
   */
  createDefaultConfiguration(): BackendConfiguration {
    return {
      version: '1.0.0',
      name: 'TrustStream Backend Configuration',
      activeProvider: 'supabase',
      providers: {
        supabase: {
          name: 'Supabase Primary',
          type: 'supabase',
          enabled: true,
          priority: 1,
          database: {
            type: 'supabase',
            supabase: {
              url: process.env.SUPABASE_URL || '',
              anonKey: process.env.SUPABASE_ANON_KEY || '',
              serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
            },
            options: {
              poolSize: 10,
              timeout: 30000,
              retryAttempts: 3
            }
          },
          auth: {
            type: 'supabase',
            supabase: {
              url: process.env.SUPABASE_URL || '',
              anonKey: process.env.SUPABASE_ANON_KEY || ''
            }
          },
          storage: {
            type: 'supabase',
            supabase: {
              url: process.env.SUPABASE_URL || '',
              anonKey: process.env.SUPABASE_ANON_KEY || ''
            }
          },
          capabilities: this.getDefaultCapabilities('supabase')
        },
        postgresql: {
          name: 'PostgreSQL Fallback',
          type: 'postgresql',
          enabled: false,
          priority: 2,
          database: {
            type: 'postgresql',
            connection: {
              host: 'localhost',
              port: 5432,
              database: 'truststream',
              username: 'postgres',
              password: '',
              ssl: false
            }
          },
          auth: {
            type: 'custom',
            connection: {
              host: 'localhost',
              port: 3001
            }
          },
          storage: {
            type: 'filesystem',
            path: './storage'
          },
          capabilities: this.getDefaultCapabilities('postgresql')
        }
      },
      migration: {
        enableAutoMigration: false,
        migrationTimeout: 300000,
        backupBeforeMigration: true,
        verifyDataIntegrity: true,
        rollbackOnFailure: true
      },
      monitoring: {
        enableHealthChecks: true,
        healthCheckInterval: 30000,
        enableMetrics: true,
        enableAlerting: false,
        alertThresholds: {
          responseTime: 1000,
          errorRate: 0.05,
          availability: 0.99
        }
      },
      failover: {
        enableAutoFailover: false,
        failoverTimeout: 60000,
        healthCheckRetries: 3,
        fallbackProviders: ['postgresql']
      }
    };
  }

  /**
   * Get default capabilities for provider type
   */
  private getDefaultCapabilities(type: string): ProviderCapabilities {
    const baseCapabilities: ProviderCapabilities = {
      database: {
        supportsTransactions: true,
        supportsReplication: false,
        supportsSharding: false,
        supportsBackup: false,
        maxConnections: 100,
        supportedFeatures: ['CRUD', 'Queries']
      },
      auth: {
        supportsMFA: false,
        supportsSSO: false,
        supportsSocialAuth: false,
        supportsRoleManagement: false,
        maxSessions: 1000,
        supportedProviders: []
      },
      storage: {
        supportsVersioning: false,
        supportsEncryption: false,
        supportsCDN: false,
        maxFileSize: 5 * 1024 * 1024, // 5MB
        supportedFormats: ['*']
      },
      realtime: {
        supportsChannels: false,
        supportsPresence: false,
        maxConcurrentConnections: 100,
        supportedProtocols: []
      },
      edgeFunctions: {
        supportsScheduling: false,
        supportsWebhooks: false,
        maxExecutionTime: 30000,
        supportedRuntimes: []
      }
    };

    // Override capabilities based on provider type
    switch (type) {
      case 'supabase':
        baseCapabilities.database.supportsReplication = true;
        baseCapabilities.database.supportsBackup = true;
        baseCapabilities.database.maxConnections = 500;
        baseCapabilities.auth.supportsMFA = true;
        baseCapabilities.auth.supportsSocialAuth = true;
        baseCapabilities.auth.supportsRoleManagement = true;
        baseCapabilities.storage.supportsVersioning = true;
        baseCapabilities.storage.supportsCDN = true;
        baseCapabilities.realtime.supportsChannels = true;
        baseCapabilities.realtime.supportsPresence = true;
        baseCapabilities.edgeFunctions.supportsScheduling = true;
        baseCapabilities.edgeFunctions.supportsWebhooks = true;
        break;
        
      case 'firebase':
        baseCapabilities.database.supportsReplication = true;
        baseCapabilities.auth.supportsMFA = true;
        baseCapabilities.auth.supportsSocialAuth = true;
        baseCapabilities.storage.supportsCDN = true;
        baseCapabilities.realtime.supportsChannels = true;
        break;
        
      case 'postgresql':
        baseCapabilities.database.supportsSharding = true;
        baseCapabilities.database.maxConnections = 1000;
        break;
    }

    return baseCapabilities;
  }

  /**
   * Load compatibility matrix from predefined data
   */
  private loadCompatibilityMatrix(): void {
    this.compatibilityMatrix = [
      {
        source: 'supabase',
        target: 'postgresql',
        compatible: true,
        limitations: [],
        dataTransformations: [],
        unsupportedFeatures: ['realtime', 'edge-functions']
      },
      {
        source: 'supabase',
        target: 'firebase',
        compatible: true,
        limitations: ['Different real-time protocols'],
        dataTransformations: [
          {
            source: 'postgresql',
            target: 'firestore',
            type: 'transform',
            description: 'SQL to NoSQL transformation required'
          }
        ],
        unsupportedFeatures: ['sql-queries']
      },
      {
        source: 'postgresql',
        target: 'mongodb',
        compatible: false,
        limitations: ['Fundamental SQL vs NoSQL differences'],
        dataTransformations: [],
        unsupportedFeatures: ['sql-queries', 'relational-constraints']
      }
    ];
  }

  /**
   * Clear caches
   */
  clearCache(): void {
    this.configCache.clear();
    this.validationCache.clear();
    this.emit('cache:cleared');
  }

  /**
   * Get configuration templates for different scenarios
   */
  getConfigurationTemplates(): Record<string, BackendConfiguration> {
    return {
      'single-provider': this.createDefaultConfiguration(),
      'multi-provider-ha': this.createHighAvailabilityConfiguration(),
      'development': this.createDevelopmentConfiguration(),
      'production': this.createProductionConfiguration()
    };
  }

  private createHighAvailabilityConfiguration(): BackendConfiguration {
    const config = this.createDefaultConfiguration();
    config.name = 'High Availability Configuration';
    config.failover!.enableAutoFailover = true;
    config.monitoring!.enableAlerting = true;
    
    // Add additional providers
    config.providers.firebase = {
      name: 'Firebase Secondary',
      type: 'firebase',
      enabled: true,
      priority: 3,
      database: {
        type: 'firebase',
        firebase: {
          projectId: '',
          privateKey: '',
          clientEmail: ''
        }
      },
      auth: {
        type: 'firebase',
        firebase: {
          projectId: '',
          privateKey: ''
        }
      },
      storage: {
        type: 'firebase',
        firebase: {
          projectId: '',
          storageBucket: ''
        }
      },
      capabilities: this.getDefaultCapabilities('firebase')
    };
    
    return config;
  }

  private createDevelopmentConfiguration(): BackendConfiguration {
    const config = this.createDefaultConfiguration();
    config.name = 'Development Configuration';
    config.monitoring!.enableAlerting = false;
    config.migration!.enableAutoMigration = true;
    
    return config;
  }

  private createProductionConfiguration(): BackendConfiguration {
    const config = this.createDefaultConfiguration();
    config.name = 'Production Configuration';
    config.failover!.enableAutoFailover = true;
    config.monitoring!.enableAlerting = true;
    config.migration!.backupBeforeMigration = true;
    config.migration!.verifyDataIntegrity = true;
    
    return config;
  }
}
