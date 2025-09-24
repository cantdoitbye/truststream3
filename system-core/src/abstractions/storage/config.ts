/**
 * Storage Configuration Management
 * Manages and validates storage service configurations
 */

import { StorageConfig } from '../../shared-utils/storage-interface';

export class StorageConfigManager {
  private static instance: StorageConfigManager;
  private config: StorageConfig | null = null;

  private constructor() {}

  public static getInstance(): StorageConfigManager {
    if (!StorageConfigManager.instance) {
      StorageConfigManager.instance = new StorageConfigManager();
    }
    return StorageConfigManager.instance;
  }

  public setConfig(config: StorageConfig): void {
    this.validateConfig(config);
    this.config = config;
  }

  public getConfig(): StorageConfig {
    if (!this.config) {
      throw new Error('Storage configuration not initialized. Call setConfig() first.');
    }
    return this.config;
  }

  public getProviderType(): string {
    return this.getConfig().type;
  }

  public getSupabaseConfig() {
    const config = this.getConfig();
    if (config.type !== 'supabase' || !config.supabase) {
      throw new Error('Supabase configuration not available');
    }
    return config.supabase;
  }

  public getAWSConfig() {
    const config = this.getConfig();
    if (config.type !== 'aws-s3' || !config.aws) {
      throw new Error('AWS S3 configuration not available');
    }
    return config.aws;
  }

  public getGoogleCloudConfig() {
    const config = this.getConfig();
    if (config.type !== 'google-cloud' || !config.googleCloud) {
      throw new Error('Google Cloud configuration not available');
    }
    return config.googleCloud;
  }

  public getAzureConfig() {
    const config = this.getConfig();
    if (config.type !== 'azure-blob' || !config.azure) {
      throw new Error('Azure Blob configuration not available');
    }
    return config.azure;
  }

  public getFilesystemConfig() {
    const config = this.getConfig();
    if (config.type !== 'filesystem' || !config.filesystem) {
      throw new Error('Filesystem configuration not available');
    }
    return config.filesystem;
  }

  public getOptions() {
    return this.getConfig().options || {};
  }

  public getMaxFileSize(): number {
    const options = this.getOptions();
    return options.maxFileSize || 100 * 1024 * 1024; // 100MB default
  }

  public getAllowedTypes(): string[] {
    const options = this.getOptions();
    return options.allowedTypes || []; // Empty array means all types allowed
  }

  public isEncryptionEnabled(): boolean {
    const options = this.getOptions();
    return options.encryption || false;
  }

  public isVersioningEnabled(): boolean {
    const options = this.getOptions();
    return options.enableVersioning || false;
  }

  public getDefaultCacheControl(): string {
    const options = this.getOptions();
    return options.defaultCacheControl || 'public, max-age=3600';
  }

  private validateConfig(config: StorageConfig): void {
    if (!config.type) {
      throw new Error('Storage provider type is required');
    }

    switch (config.type) {
      case 'supabase':
        this.validateSupabaseConfig(config.supabase);
        break;
      case 'aws-s3':
        this.validateAWSConfig(config.aws);
        break;
      case 'google-cloud':
        this.validateGoogleCloudConfig(config.googleCloud);
        break;
      case 'azure-blob':
        this.validateAzureConfig(config.azure);
        break;
      case 'filesystem':
        this.validateFilesystemConfig(config.filesystem);
        break;
      case 'mock':
        // Mock doesn't need validation
        break;
      default:
        throw new Error(`Unsupported storage provider: ${config.type}`);
    }

    if (config.options) {
      this.validateOptions(config.options);
    }
  }

  private validateSupabaseConfig(config: any): void {
    if (!config) {
      throw new Error('Supabase configuration is required when using supabase provider');
    }
    if (!config.url) {
      throw new Error('Supabase URL is required');
    }
    if (!config.key) {
      throw new Error('Supabase key is required');
    }
    if (!config.bucket) {
      throw new Error('Supabase bucket name is required');
    }
    if (!this.isValidUrl(config.url)) {
      throw new Error('Invalid Supabase URL format');
    }
  }

  private validateAWSConfig(config: any): void {
    if (!config) {
      throw new Error('AWS S3 configuration is required when using aws-s3 provider');
    }
    if (!config.accessKeyId) {
      throw new Error('AWS access key ID is required');
    }
    if (!config.secretAccessKey) {
      throw new Error('AWS secret access key is required');
    }
    if (!config.region) {
      throw new Error('AWS region is required');
    }
    if (!config.bucket) {
      throw new Error('AWS S3 bucket name is required');
    }
  }

  private validateGoogleCloudConfig(config: any): void {
    if (!config) {
      throw new Error('Google Cloud configuration is required when using google-cloud provider');
    }
    if (!config.projectId) {
      throw new Error('Google Cloud project ID is required');
    }
    if (!config.keyFilename) {
      throw new Error('Google Cloud key filename is required');
    }
    if (!config.bucket) {
      throw new Error('Google Cloud bucket name is required');
    }
  }

  private validateAzureConfig(config: any): void {
    if (!config) {
      throw new Error('Azure Blob configuration is required when using azure-blob provider');
    }
    if (!config.connectionString) {
      throw new Error('Azure connection string is required');
    }
    if (!config.containerName) {
      throw new Error('Azure container name is required');
    }
  }

  private validateFilesystemConfig(config: any): void {
    if (!config) {
      throw new Error('Filesystem configuration is required when using filesystem provider');
    }
    if (!config.basePath) {
      throw new Error('Filesystem base path is required');
    }
    if (!this.isValidPath(config.basePath)) {
      throw new Error('Invalid filesystem base path');
    }
  }

  private validateOptions(options: any): void {
    if (options.maxFileSize && (options.maxFileSize <= 0 || options.maxFileSize > 10 * 1024 * 1024 * 1024)) {
      throw new Error('Max file size must be between 1 byte and 10GB');
    }

    if (options.allowedTypes && !Array.isArray(options.allowedTypes)) {
      throw new Error('Allowed types must be an array of MIME types');
    }

    if (options.enableVersioning && typeof options.enableVersioning !== 'boolean') {
      throw new Error('Enable versioning must be a boolean');
    }

    if (options.encryption && typeof options.encryption !== 'boolean') {
      throw new Error('Encryption must be a boolean');
    }

    if (options.defaultCacheControl && typeof options.defaultCacheControl !== 'string') {
      throw new Error('Default cache control must be a string');
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidPath(path: string): boolean {
    // Basic path validation - should be expanded based on OS
    return typeof path === 'string' && path.length > 0 && !path.includes('..');
  }

  public reset(): void {
    this.config = null;
  }
}

// Default export for easy access
export const storageConfig = StorageConfigManager.getInstance();
