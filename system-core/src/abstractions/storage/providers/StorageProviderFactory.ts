/**
 * Storage Provider Factory
 * Factory for creating storage provider instances
 */

import { 
  StorageConfig,
  IStorageService,
  StorageError
} from '../../../shared-utils/storage-interface';

export interface StorageProviderCapabilities {
  supportsVersioning: boolean;
  supportsEncryption: boolean;
  supportsCDN: boolean;
  supportsSignedUrls: boolean;
  supportsMetadata: boolean;
  supportsBatchOperations: boolean;
  maxFileSize: number;
  supportedFormats: string[];
  supportedFeatures: string[];
}

export interface StorageProviderFactory {
  create(config: StorageConfig): IStorageService;
  validateConfig(config: StorageConfig): { valid: boolean; errors: string[] };
  getCapabilities(): StorageProviderCapabilities;
}

export class StorageProviderRegistry {
  private static instance: StorageProviderRegistry;
  private providers = new Map<string, StorageProviderFactory>();

  private constructor() {
    this.registerDefaultProviders();
  }

  static getInstance(): StorageProviderRegistry {
    if (!StorageProviderRegistry.instance) {
      StorageProviderRegistry.instance = new StorageProviderRegistry();
    }
    return StorageProviderRegistry.instance;
  }

  /**
   * Register a storage provider
   */
  register(type: string, factory: StorageProviderFactory): void {
    this.providers.set(type, factory);
  }

  /**
   * Create storage service instance
   */
  create(config: StorageConfig): IStorageService {
    const factory = this.providers.get(config.type);
    if (!factory) {
      throw new StorageError(`Unknown storage provider: ${config.type}`);
    }

    // Validate configuration
    const validation = factory.validateConfig(config);
    if (!validation.valid) {
      throw new StorageError(`Invalid configuration: ${validation.errors.join(', ')}`);
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
  getCapabilities(type: string): StorageProviderCapabilities | null {
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
      const { SupabaseStorageProviderFactory } = await import('./SupabaseStorageProvider');
      this.register('supabase', new SupabaseStorageProviderFactory());

      // Register AWS S3 provider
      const { S3StorageProviderFactory } = await import('./S3StorageProvider');
      this.register('s3', new S3StorageProviderFactory());

      // Register Firebase provider
      const { FirebaseStorageProviderFactory } = await import('./FirebaseStorageProvider');
      this.register('firebase', new FirebaseStorageProviderFactory());

      // Register Filesystem provider
      const { FilesystemStorageProviderFactory } = await import('./FilesystemStorageProvider');
      this.register('filesystem', new FilesystemStorageProviderFactory());

      // Register Mock provider
      const { MockStorageProviderFactory } = await import('./MockStorageProvider');
      this.register('mock', new MockStorageProviderFactory());
    } catch (error) {
      console.warn('Some storage providers failed to load:', error);
    }
  }
}

/**
 * Convenience factory class
 */
export class StorageProviderFactory {
  private static registry = StorageProviderRegistry.getInstance();

  /**
   * Create storage service from configuration
   */
  static create(config: StorageConfig): IStorageService {
    return this.registry.create(config);
  }

  /**
   * Register custom provider
   */
  static registerProvider(type: string, factory: StorageProviderFactory): void {
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
  static getCapabilities(type: string): StorageProviderCapabilities | null {
    return this.registry.getCapabilities(type);
  }
  
  /**
   * Validate configuration
   */
  static validateConfig(config: StorageConfig): { valid: boolean; errors: string[] } {
    const factory = this.registry.providers.get(config.type);
    if (!factory) {
      return {
        valid: false,
        errors: [`Unknown storage provider: ${config.type}`]
      };
    }
    
    return factory.validateConfig(config);
  }
}

// Export the singleton registry
export const storageProviderRegistry = StorageProviderRegistry.getInstance();
