/**
 * Database Configuration Manager
 * Centralized configuration management for database abstraction layer
 */

import { DatabaseConfig } from '../../../shared-utils/database-interface';

export interface DatabaseEnvironmentConfig {
  development: DatabaseConfig;
  testing: DatabaseConfig;
  staging: DatabaseConfig;
  production: DatabaseConfig;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class DatabaseConfigManager {
  private static instance: DatabaseConfigManager;
  private currentEnvironment: string;
  private config: DatabaseConfig | null = null;
  private environmentConfigs: Partial<DatabaseEnvironmentConfig> = {};

  private constructor() {
    this.currentEnvironment = process.env.NODE_ENV || 'development';
  }

  static getInstance(): DatabaseConfigManager {
    if (!DatabaseConfigManager.instance) {
      DatabaseConfigManager.instance = new DatabaseConfigManager();
    }
    return DatabaseConfigManager.instance;
  }

  /**
   * Load configuration from environment variables
   */
  loadFromEnvironment(): DatabaseConfig {
    const config: DatabaseConfig = {
      type: this.getEnvVar('DB_TYPE', 'supabase') as DatabaseConfig['type']
    };

    // Load Supabase configuration
    if (config.type === 'supabase') {
      config.supabase = {
        url: this.getEnvVar('SUPABASE_URL', ''),
        anonKey: this.getEnvVar('SUPABASE_ANON_KEY', ''),
        serviceRoleKey: this.getEnvVar('SUPABASE_SERVICE_ROLE_KEY')
      };
    }

    // Load PostgreSQL configuration
    if (config.type === 'postgresql') {
      config.connection = {
        host: this.getEnvVar('DB_HOST', 'localhost'),
        port: parseInt(this.getEnvVar('DB_PORT', '5432')),
        database: this.getEnvVar('DB_NAME', 'truststream'),
        username: this.getEnvVar('DB_USER', 'postgres'),
        password: this.getEnvVar('DB_PASSWORD', ''),
        ssl: this.getEnvVar('DB_SSL', 'false') === 'true'
      };
    }

    // Load connection options
    config.options = {
      poolSize: parseInt(this.getEnvVar('DB_POOL_SIZE', '10')),
      timeout: parseInt(this.getEnvVar('DB_TIMEOUT', '30000')),
      retryAttempts: parseInt(this.getEnvVar('DB_RETRY_ATTEMPTS', '3')),
      maxConnections: parseInt(this.getEnvVar('DB_MAX_CONNECTIONS', '20'))
    };

    this.config = config;
    return config;
  }

  /**
   * Set configuration manually
   */
  setConfig(config: DatabaseConfig): void {
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }
    this.config = config;
  }

  /**
   * Get current configuration
   */
  getConfig(): DatabaseConfig {
    if (!this.config) {
      return this.loadFromEnvironment();
    }
    return this.config;
  }

  /**
   * Validate database configuration
   */
  validateConfig(config: DatabaseConfig): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate type
    if (!config.type) {
      errors.push('Database type is required');
    }

    // Validate Supabase configuration
    if (config.type === 'supabase') {
      if (!config.supabase?.url) {
        errors.push('Supabase URL is required');
      }
      if (!config.supabase?.anonKey) {
        errors.push('Supabase anonymous key is required');
      }
      if (!config.supabase?.serviceRoleKey) {
        warnings.push('Supabase service role key not provided - some operations may be limited');
      }
    }

    // Validate PostgreSQL configuration
    if (config.type === 'postgresql') {
      if (!config.connection?.host) {
        errors.push('PostgreSQL host is required');
      }
      if (!config.connection?.database) {
        errors.push('PostgreSQL database name is required');
      }
      if (!config.connection?.username) {
        errors.push('PostgreSQL username is required');
      }
    }

    // Validate options
    if (config.options) {
      if (config.options.poolSize && config.options.poolSize < 1) {
        errors.push('Pool size must be at least 1');
      }
      if (config.options.timeout && config.options.timeout < 1000) {
        warnings.push('Timeout less than 1000ms may cause connection issues');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Set environment-specific configuration
   */
  setEnvironmentConfig(environment: string, config: DatabaseConfig): void {
    this.environmentConfigs[environment as keyof DatabaseEnvironmentConfig] = config;
  }

  /**
   * Get configuration for specific environment
   */
  getEnvironmentConfig(environment?: string): DatabaseConfig {
    const env = environment || this.currentEnvironment;
    const envConfig = this.environmentConfigs[env as keyof DatabaseEnvironmentConfig];
    
    if (envConfig) {
      return envConfig;
    }

    // Fallback to current config or environment loading
    return this.getConfig();
  }

  /**
   * Switch to different environment
   */
  switchEnvironment(environment: string): void {
    this.currentEnvironment = environment;
    this.config = null; // Force reload
  }

  /**
   * Get current environment
   */
  getCurrentEnvironment(): string {
    return this.currentEnvironment;
  }

  /**
   * Load configuration from file
   */
  async loadFromFile(filePath: string): Promise<DatabaseConfig> {
    try {
      const fs = await import('fs/promises');
      const configData = await fs.readFile(filePath, 'utf8');
      const config = JSON.parse(configData) as DatabaseConfig;
      
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        throw new Error(`Invalid configuration file: ${validation.errors.join(', ')}`);
      }

      this.config = config;
      return config;
    } catch (error) {
      throw new Error(`Failed to load configuration from file: ${error}`);
    }
  }

  /**
   * Save configuration to file
   */
  async saveToFile(filePath: string, config?: DatabaseConfig): Promise<void> {
    const configToSave = config || this.getConfig();
    
    try {
      const fs = await import('fs/promises');
      await fs.writeFile(filePath, JSON.stringify(configToSave, null, 2), 'utf8');
    } catch (error) {
      throw new Error(`Failed to save configuration to file: ${error}`);
    }
  }

  /**
   * Test configuration by attempting connection
   */
  async testConfig(config?: DatabaseConfig): Promise<{ success: boolean; error?: string }> {
    const testConfig = config || this.getConfig();
    
    try {
      // Import and create appropriate provider
      const { DatabaseProviderFactory } = await import('../providers/DatabaseProviderFactory');
      const provider = DatabaseProviderFactory.create(testConfig);
      
      await provider.connect(testConfig);
      const isConnected = provider.isConnected();
      await provider.disconnect();
      
      return { success: isConnected };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get configuration summary (without sensitive data)
   */
  getConfigSummary(): any {
    const config = this.getConfig();
    const summary: any = {
      type: config.type,
      environment: this.currentEnvironment
    };

    if (config.connection) {
      summary.connection = {
        host: config.connection.host,
        port: config.connection.port,
        database: config.connection.database,
        username: config.connection.username,
        ssl: config.connection.ssl
      };
    }

    if (config.supabase) {
      summary.supabase = {
        url: config.supabase.url,
        hasAnonKey: !!config.supabase.anonKey,
        hasServiceRoleKey: !!config.supabase.serviceRoleKey
      };
    }

    summary.options = config.options;

    return summary;
  }

  private getEnvVar(name: string, defaultValue?: string): string {
    const value = process.env[name];
    if (value === undefined && defaultValue === undefined) {
      throw new Error(`Required environment variable ${name} is not set`);
    }
    return value || defaultValue || '';
  }
}

// Export singleton instance
export const databaseConfigManager = DatabaseConfigManager.getInstance();