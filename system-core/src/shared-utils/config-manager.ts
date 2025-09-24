/**
 * Configuration Manager - Centralized configuration management system
 * Provides type-safe configuration loading, validation, and environment-specific overrides
 */

import { DatabaseConfig } from './database-interface';
import { AuthConfig } from './auth-interface';
import { StorageConfig } from './storage-interface';

// Core Configuration Types
export interface ServiceConfiguration {
  database: {
    provider: 'supabase' | 'postgresql' | 'mock';
    config: DatabaseConfig;
  };
  auth: {
    provider: 'supabase' | 'firebase' | 'auth0' | 'custom' | 'mock';
    config: AuthConfig;
  };
  storage: {
    provider: 'supabase' | 'aws-s3' | 'google-cloud' | 'azure-blob' | 'filesystem' | 'mock';
    config: StorageConfig;
  };
  realtime: {
    provider: 'supabase' | 'websocket' | 'socket.io' | 'mock';
    config: RealtimeConfig;
  };
}

export interface RealtimeConfig {
  type: 'supabase' | 'websocket' | 'socket.io' | 'mock';
  supabase?: {
    url: string;
    key: string;
  };
  websocket?: {
    url: string;
    protocols?: string[];
  };
  socketio?: {
    url: string;
    options?: Record<string, any>;
  };
  options?: {
    reconnectAttempts?: number;
    reconnectDelay?: number;
    heartbeatInterval?: number;
  };
}

export interface AppConfiguration extends ServiceConfiguration {
  app: {
    name: string;
    version: string;
    environment: Environment;
    debug: boolean;
    port?: number;
    host?: string;
    cors?: CORSConfiguration;
    rateLimit?: RateLimitConfiguration;
  };
  logging: LoggingConfiguration;
  monitoring: MonitoringConfiguration;
  security: SecurityConfiguration;
  features: FeatureFlags;
}

export interface LoggingConfiguration {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  outputs: Array<{
    type: 'console' | 'file' | 'database' | 'external';
    config?: Record<string, any>;
  }>;
  structured: boolean;
  includeStack: boolean;
}

export interface MonitoringConfiguration {
  enabled: boolean;
  metrics: {
    enabled: boolean;
    interval: number;
    endpoint?: string;
  };
  tracing: {
    enabled: boolean;
    serviceName: string;
    endpoint?: string;
  };
  healthCheck: {
    enabled: boolean;
    endpoint: string;
    interval: number;
  };
  alerts: {
    enabled: boolean;
    channels: AlertChannel[];
  };
}

export interface SecurityConfiguration {
  cors: CORSConfiguration;
  rateLimit: RateLimitConfiguration;
  encryption: {
    algorithm: string;
    keyRotationInterval: number;
  };
  session: {
    secret: string;
    maxAge: number;
    secure: boolean;
    httpOnly: boolean;
  };
  headers: SecurityHeaders;
}

export interface CORSConfiguration {
  origin: string | string[] | boolean;
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders?: string[];
  credentials: boolean;
  maxAge?: number;
}

export interface RateLimitConfiguration {
  windowMs: number;
  max: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: string;
}

export interface SecurityHeaders {
  contentSecurityPolicy?: string;
  crossOriginEmbedderPolicy?: string;
  crossOriginOpenerPolicy?: string;
  crossOriginResourcePolicy?: string;
  xFrameOptions?: string;
  xContentTypeOptions?: string;
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook';
  config: Record<string, any>;
  triggers: AlertTrigger[];
}

export interface AlertTrigger {
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals';
  value: number;
  duration?: number;
}

export interface FeatureFlags {
  [key: string]: boolean | string | number | FeatureFlag;
}

export interface FeatureFlag {
  enabled: boolean;
  value?: any;
  conditions?: FeatureCondition[];
  rollout?: RolloutStrategy;
}

export interface FeatureCondition {
  type: 'user' | 'environment' | 'percentage' | 'date';
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than';
  value: any;
}

export interface RolloutStrategy {
  type: 'percentage' | 'user_list' | 'gradual';
  value: number | string[];
  startDate?: Date;
  endDate?: Date;
}

export type Environment = 'development' | 'staging' | 'production' | 'test';

// Configuration Loading Options
export interface ConfigurationOptions {
  environment?: Environment;
  configPaths?: string[];
  envPrefix?: string;
  envFile?: string;
  validateSchema?: boolean;
  allowOverrides?: boolean;
  watchForChanges?: boolean;
}

export interface ConfigurationSource {
  type: 'file' | 'environment' | 'database' | 'remote' | 'memory';
  priority: number;
  options?: Record<string, any>;
}

// Configuration Manager Interface
export interface IConfigurationManager {
  // Loading and Initialization
  load(options?: ConfigurationOptions): Promise<void>;
  reload(): Promise<void>;
  isLoaded(): boolean;
  
  // Configuration Access
  get<T = any>(key: string, defaultValue?: T): T;
  getRequired<T = any>(key: string): T;
  has(key: string): boolean;
  getAll(): AppConfiguration;
  
  // Configuration Updates
  set(key: string, value: any): void;
  update(updates: Partial<AppConfiguration>): void;
  merge(config: Partial<AppConfiguration>): void;
  
  // Environment-specific
  getEnvironment(): Environment;
  setEnvironment(env: Environment): void;
  isProduction(): boolean;
  isDevelopment(): boolean;
  isTest(): boolean;
  
  // Service Configurations
  getDatabaseConfig(): DatabaseConfig;
  getAuthConfig(): AuthConfig;
  getStorageConfig(): StorageConfig;
  getRealtimeConfig(): RealtimeConfig;
  
  // Feature Flags
  isFeatureEnabled(feature: string): boolean;
  getFeatureValue(feature: string, defaultValue?: any): any;
  evaluateFeature(feature: string, context?: Record<string, any>): boolean;
  
  // Validation
  validate(): ConfigurationValidationResult;
  validateSection(section: keyof AppConfiguration): boolean;
  
  // Events
  onChange(callback: (key: string, oldValue: any, newValue: any) => void): () => void;
  onReload(callback: (config: AppConfiguration) => void): () => void;
  
  // Secrets Management
  getSecret(key: string): string | null;
  setSecret(key: string, value: string): void;
  rotateSecrets(): Promise<void>;
  
  // Configuration Export/Import
  export(format?: 'json' | 'yaml' | 'env'): string;
  import(data: string, format?: 'json' | 'yaml' | 'env'): void;
}

// Configuration Validation
export interface ConfigurationValidationResult {
  valid: boolean;
  errors: ConfigurationError[];
  warnings: ConfigurationWarning[];
}

export interface ConfigurationError {
  path: string;
  message: string;
  type: 'missing' | 'invalid_type' | 'invalid_value' | 'constraint_violation';
  expected?: any;
  actual?: any;
}

export interface ConfigurationWarning {
  path: string;
  message: string;
  type: 'deprecated' | 'insecure' | 'performance' | 'compatibility';
}

// Configuration Manager Implementation
export class ConfigurationManager implements IConfigurationManager {
  private config: AppConfiguration | null = null;
  private sources: ConfigurationSource[] = [];
  private changeListeners: Array<(key: string, oldValue: any, newValue: any) => void> = [];
  private reloadListeners: Array<(config: AppConfiguration) => void> = [];
  private environment: Environment = 'development';
  private secrets: Map<string, string> = new Map();
  private watchHandles: any[] = [];

  async load(options: ConfigurationOptions = {}): Promise<void> {
    this.environment = options.environment || this.detectEnvironment();
    
    // Setup configuration sources
    this.setupSources(options);
    
    // Load configuration from all sources
    const configs = await this.loadFromSources();
    
    // Merge configurations by priority
    this.config = this.mergeConfigurations(configs);
    
    // Validate configuration
    if (options.validateSchema !== false) {
      const validation = this.validate();
      if (!validation.valid) {
        throw new ConfigurationError(`Configuration validation failed: ${validation.errors.map(e => e.message).join(', ')}`, 'VALIDATION_FAILED');
      }
    }
    
    // Setup file watching if enabled
    if (options.watchForChanges) {
      this.setupFileWatching(options.configPaths || []);
    }
    
    // Load secrets
    await this.loadSecrets();
  }

  async reload(): Promise<void> {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    
    const oldConfig = { ...this.config };
    const configs = await this.loadFromSources();
    this.config = this.mergeConfigurations(configs);
    
    // Notify listeners
    this.reloadListeners.forEach(listener => listener(this.config!));
  }

  isLoaded(): boolean {
    return this.config !== null;
  }

  get<T = any>(key: string, defaultValue?: T): T {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }
    
    return this.getNestedValue(this.config, key) ?? defaultValue;
  }

  getRequired<T = any>(key: string): T {
    const value = this.get<T>(key);
    if (value === undefined || value === null) {
      throw new Error(`Required configuration key '${key}' is missing`);
    }
    return value;
  }

  has(key: string): boolean {
    if (!this.config) return false;
    return this.getNestedValue(this.config, key) !== undefined;
  }

  getAll(): AppConfiguration {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }
    return { ...this.config };
  }

  set(key: string, value: any): void {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }
    
    const oldValue = this.get(key);
    this.setNestedValue(this.config, key, value);
    
    // Notify listeners
    this.changeListeners.forEach(listener => listener(key, oldValue, value));
  }

  update(updates: Partial<AppConfiguration>): void {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }
    
    Object.assign(this.config, updates);
  }

  merge(config: Partial<AppConfiguration>): void {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }
    
    this.config = this.deepMerge(this.config, config);
  }

  getEnvironment(): Environment {
    return this.environment;
  }

  setEnvironment(env: Environment): void {
    this.environment = env;
  }

  isProduction(): boolean {
    return this.environment === 'production';
  }

  isDevelopment(): boolean {
    return this.environment === 'development';
  }

  isTest(): boolean {
    return this.environment === 'test';
  }

  getDatabaseConfig(): DatabaseConfig {
    return this.getRequired('database.config');
  }

  getAuthConfig(): AuthConfig {
    return this.getRequired('auth.config');
  }

  getStorageConfig(): StorageConfig {
    return this.getRequired('storage.config');
  }

  getRealtimeConfig(): RealtimeConfig {
    return this.getRequired('realtime.config');
  }

  isFeatureEnabled(feature: string): boolean {
    const flag = this.get(`features.${feature}`);
    
    if (typeof flag === 'boolean') {
      return flag;
    }
    
    if (typeof flag === 'object' && flag !== null) {
      return this.evaluateFeatureFlag(flag as FeatureFlag);
    }
    
    return false;
  }

  getFeatureValue(feature: string, defaultValue?: any): any {
    const flag = this.get(`features.${feature}`);
    
    if (typeof flag === 'object' && flag !== null && 'value' in flag) {
      return flag.value;
    }
    
    return flag ?? defaultValue;
  }

  evaluateFeature(feature: string, context: Record<string, any> = {}): boolean {
    const flag = this.get(`features.${feature}`);
    
    if (typeof flag === 'boolean') {
      return flag;
    }
    
    if (typeof flag === 'object' && flag !== null) {
      return this.evaluateFeatureFlag(flag as FeatureFlag, context);
    }
    
    return false;
  }

  validate(): ConfigurationValidationResult {
    if (!this.config) {
      return {
        valid: false,
        errors: [{ path: 'root', message: 'Configuration not loaded', type: 'missing' }],
        warnings: []
      };
    }
    
    const errors: ConfigurationError[] = [];
    const warnings: ConfigurationWarning[] = [];
    
    // Validate required sections
    const requiredSections = ['app', 'database', 'auth', 'storage'];
    for (const section of requiredSections) {
      if (!this.has(section)) {
        errors.push({
          path: section,
          message: `Required section '${section}' is missing`,
          type: 'missing'
        });
      }
    }
    
    // Validate app configuration
    if (this.has('app')) {
      if (!this.has('app.name')) {
        errors.push({ path: 'app.name', message: 'App name is required', type: 'missing' });
      }
      if (!this.has('app.version')) {
        errors.push({ path: 'app.version', message: 'App version is required', type: 'missing' });
      }
    }
    
    // Add more validation rules as needed...
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  validateSection(section: keyof AppConfiguration): boolean {
    return this.has(section.toString());
  }

  onChange(callback: (key: string, oldValue: any, newValue: any) => void): () => void {
    this.changeListeners.push(callback);
    return () => {
      const index = this.changeListeners.indexOf(callback);
      if (index > -1) {
        this.changeListeners.splice(index, 1);
      }
    };
  }

  onReload(callback: (config: AppConfiguration) => void): () => void {
    this.reloadListeners.push(callback);
    return () => {
      const index = this.reloadListeners.indexOf(callback);
      if (index > -1) {
        this.reloadListeners.splice(index, 1);
      }
    };
  }

  getSecret(key: string): string | null {
    return this.secrets.get(key) || null;
  }

  setSecret(key: string, value: string): void {
    this.secrets.set(key, value);
  }

  async rotateSecrets(): Promise<void> {
    // Implementation for secret rotation
    // This would depend on the secret management system being used
  }

  export(format: 'json' | 'yaml' | 'env' = 'json'): string {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }
    
    switch (format) {
      case 'json':
        return JSON.stringify(this.config, null, 2);
      case 'yaml':
        // Would need yaml library
        throw new Error('YAML export not implemented');
      case 'env':
        return this.configToEnvFormat(this.config);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  import(data: string, format: 'json' | 'yaml' | 'env' = 'json'): void {
    let config: any;
    
    switch (format) {
      case 'json':
        config = JSON.parse(data);
        break;
      case 'yaml':
        // Would need yaml library
        throw new Error('YAML import not implemented');
      case 'env':
        config = this.envFormatToConfig(data);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
    
    this.merge(config);
  }

  // Private helper methods
  private detectEnvironment(): Environment {
    return (process.env.NODE_ENV as Environment) || 'development';
  }

  private setupSources(options: ConfigurationOptions): void {
    this.sources = [
      { type: 'environment', priority: 1 },
      { type: 'file', priority: 2, options: { paths: options.configPaths } },
      { type: 'memory', priority: 3 }
    ];
  }

  private async loadFromSources(): Promise<any[]> {
    const configs = [];
    
    for (const source of this.sources) {
      try {
        const config = await this.loadFromSource(source);
        if (config) {
          configs.push({ ...config, _priority: source.priority });
        }
      } catch (error) {
        console.warn(`Failed to load configuration from ${source.type}:`, error);
      }
    }
    
    return configs;
  }

  private async loadFromSource(source: ConfigurationSource): Promise<any> {
    switch (source.type) {
      case 'environment':
        return this.loadFromEnvironment();
      case 'file':
        return this.loadFromFile(source.options?.paths);
      case 'memory':
        return this.loadFromMemory();
      default:
        return null;
    }
  }

  private loadFromEnvironment(): any {
    // Load from environment variables
    const config: any = {};
    
    // Map environment variables to configuration structure
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('TRUSTSTREAM_')) {
        const configKey = key.replace('TRUSTSTREAM_', '').toLowerCase().replace(/_/g, '.');
        this.setNestedValue(config, configKey, process.env[key]);
      }
    });
    
    return config;
  }

  private async loadFromFile(paths?: string[]): Promise<any> {
    // Load from configuration files
    // This would read JSON/YAML files from specified paths
    return {};
  }

  private loadFromMemory(): any {
    // Load from in-memory configuration
    return {};
  }

  private mergeConfigurations(configs: any[]): AppConfiguration {
    // Sort by priority and merge
    configs.sort((a, b) => a._priority - b._priority);
    
    let merged = this.getDefaultConfiguration();
    
    for (const config of configs) {
      delete config._priority;
      merged = this.deepMerge(merged, config);
    }
    
    return merged;
  }

  private getDefaultConfiguration(): AppConfiguration {
    return {
      app: {
        name: 'TrustStream',
        version: '4.2.0',
        environment: this.environment,
        debug: this.environment !== 'production',
        port: 3000,
        host: '0.0.0.0'
      },
      database: {
        provider: 'mock',
        config: { type: 'mock' }
      },
      auth: {
        provider: 'mock',
        config: { type: 'mock' }
      },
      storage: {
        provider: 'mock',
        config: { type: 'mock' }
      },
      realtime: {
        provider: 'mock',
        config: { type: 'mock' }
      },
      logging: {
        level: 'info',
        format: 'json',
        outputs: [{ type: 'console' }],
        structured: true,
        includeStack: false
      },
      monitoring: {
        enabled: false,
        metrics: { enabled: false, interval: 60000 },
        tracing: { enabled: false, serviceName: 'truststream' },
        healthCheck: { enabled: true, endpoint: '/health', interval: 30000 },
        alerts: { enabled: false, channels: [] }
      },
      security: {
        cors: {
          origin: '*',
          methods: ['GET', 'POST', 'PUT', 'DELETE'],
          allowedHeaders: ['Content-Type', 'Authorization'],
          credentials: false
        },
        rateLimit: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 100
        },
        encryption: {
          algorithm: 'aes-256-gcm',
          keyRotationInterval: 86400000 // 24 hours
        },
        session: {
          secret: 'default-secret',
          maxAge: 86400000, // 24 hours
          secure: false,
          httpOnly: true
        },
        headers: {}
      },
      features: {}
    };
  }

  private evaluateFeatureFlag(flag: FeatureFlag, context: Record<string, any> = {}): boolean {
    if (!flag.enabled) {
      return false;
    }
    
    // Evaluate conditions
    if (flag.conditions) {
      for (const condition of flag.conditions) {
        if (!this.evaluateCondition(condition, context)) {
          return false;
        }
      }
    }
    
    // Evaluate rollout strategy
    if (flag.rollout) {
      return this.evaluateRollout(flag.rollout, context);
    }
    
    return true;
  }

  private evaluateCondition(condition: FeatureCondition, context: Record<string, any>): boolean {
    // Implementation for condition evaluation
    return true; // Placeholder
  }

  private evaluateRollout(rollout: RolloutStrategy, context: Record<string, any>): boolean {
    // Implementation for rollout strategy evaluation
    return true; // Placeholder
  }

  private async loadSecrets(): Promise<void> {
    // Load secrets from secure storage
    // This would integrate with secret management systems
  }

  private setupFileWatching(paths: string[]): void {
    // Setup file watching for configuration changes
    // This would use fs.watch or similar
  }

  private getNestedValue(obj: any, key: string): any {
    return key.split('.').reduce((current, path) => current && current[path], obj);
  }

  private setNestedValue(obj: any, key: string, value: any): void {
    const keys = key.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, path) => {
      if (!current[path] || typeof current[path] !== 'object') {
        current[path] = {};
      }
      return current[path];
    }, obj);
    target[lastKey] = value;
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  private configToEnvFormat(config: any, prefix = 'TRUSTSTREAM'): string {
    const lines: string[] = [];
    
    const flatten = (obj: any, currentPrefix: string) => {
      for (const [key, value] of Object.entries(obj)) {
        const envKey = `${currentPrefix}_${key.toUpperCase()}`;
        
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          flatten(value, envKey);
        } else {
          lines.push(`${envKey}=${value}`);
        }
      }
    };
    
    flatten(config, prefix);
    return lines.join('\n');
  }

  private envFormatToConfig(data: string): any {
    const config: any = {};
    const lines = data.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    
    for (const line of lines) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=');
      
      if (key.startsWith('TRUSTSTREAM_')) {
        const configKey = key.replace('TRUSTSTREAM_', '').toLowerCase().replace(/_/g, '.');
        this.setNestedValue(config, configKey, value);
      }
    }
    
    return config;
  }
}

// Configuration Error Class
export class ConfigurationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

// Global Configuration Manager Instance
let globalConfigManager: ConfigurationManager | null = null;

export function getConfigurationManager(): ConfigurationManager {
  if (!globalConfigManager) {
    globalConfigManager = new ConfigurationManager();
  }
  return globalConfigManager;
}

export function createConfigurationManager(): ConfigurationManager {
  return new ConfigurationManager();
}

// Utility functions
export function loadConfiguration(options?: ConfigurationOptions): Promise<void> {
  return getConfigurationManager().load(options);
}

export function getConfig<T = any>(key: string, defaultValue?: T): T {
  return getConfigurationManager().get(key, defaultValue);
}

export function setConfig(key: string, value: any): void {
  getConfigurationManager().set(key, value);
}

export function isFeatureEnabled(feature: string): boolean {
  return getConfigurationManager().isFeatureEnabled(feature);
}

export function getEnvironment(): Environment {
  return getConfigurationManager().getEnvironment();
}
