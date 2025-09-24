/**
 * Storage Provider Factory
 * Creates appropriate storage provider instances based on configuration
 */

import { StorageConfig } from '../../shared-utils/storage-interface';
import { IStorageProvider } from './storage.interface';
import { SupabaseStorageProvider } from './providers/supabase-provider';
import { MockStorageProvider } from './providers/mock-provider';

export class StorageProviderFactory {
  private static instance: StorageProviderFactory;
  private providerCache = new Map<string, IStorageProvider>();

  private constructor() {}

  public static getInstance(): StorageProviderFactory {
    if (!StorageProviderFactory.instance) {
      StorageProviderFactory.instance = new StorageProviderFactory();
    }
    return StorageProviderFactory.instance;
  }

  /**
   * Creates a storage provider instance based on the configuration
   * @param config Storage configuration
   * @param useCache Whether to use cached instances (default: true)
   * @returns Storage provider instance
   */
  public async createProvider(config: StorageConfig, useCache: boolean = true): Promise<IStorageProvider> {
    const cacheKey = this.generateCacheKey(config);
    
    // Return cached instance if available and caching is enabled
    if (useCache && this.providerCache.has(cacheKey)) {
      const cachedProvider = this.providerCache.get(cacheKey)!;
      if (cachedProvider.isConnected()) {
        return cachedProvider;
      } else {
        // Remove disconnected provider from cache
        this.providerCache.delete(cacheKey);
      }
    }

    let provider: IStorageProvider;

    switch (config.type) {
      case 'supabase':
        provider = new SupabaseStorageProvider();
        break;
      
      case 'aws-s3':
        throw new Error('AWS S3 storage provider not implemented yet');
      
      case 'google-cloud':
        throw new Error('Google Cloud Storage provider not implemented yet');
      
      case 'azure-blob':
        throw new Error('Azure Blob Storage provider not implemented yet');
      
      case 'filesystem':
        throw new Error('Filesystem storage provider not implemented yet');
      
      case 'mock':
        provider = new MockStorageProvider();
        break;
      
      default:
        throw new Error(`Unsupported storage provider type: ${config.type}`);
    }

    // Initialize the provider
    await provider.initialize(config);

    // Cache the provider if caching is enabled
    if (useCache) {
      this.providerCache.set(cacheKey, provider);
    }

    return provider;
  }

  /**
   * Gets a list of supported provider types
   */
  public getSupportedProviders(): string[] {
    return ['supabase', 'mock'];
  }

  /**
   * Checks if a provider type is supported
   * @param providerType The provider type to check
   */
  public isProviderSupported(providerType: string): boolean {
    return this.getSupportedProviders().includes(providerType);
  }

  /**
   * Clears the provider cache
   */
  public clearCache(): void {
    // Disconnect all cached providers
    for (const provider of this.providerCache.values()) {
      if (provider.isConnected()) {
        provider.disconnect().catch(error => {
          console.warn('Error disconnecting cached storage provider:', error);
        });
      }
    }
    this.providerCache.clear();
  }

  /**
   * Gets the current cache size
   */
  public getCacheSize(): number {
    return this.providerCache.size;
  }

  /**
   * Removes a specific provider from cache
   * @param config Storage configuration
   */
  public removeCachedProvider(config: StorageConfig): boolean {
    const cacheKey = this.generateCacheKey(config);
    const provider = this.providerCache.get(cacheKey);
    
    if (provider) {
      if (provider.isConnected()) {
        provider.disconnect().catch(error => {
          console.warn('Error disconnecting provider during cache removal:', error);
        });
      }
      return this.providerCache.delete(cacheKey);
    }
    
    return false;
  }

  /**
   * Creates a provider instance without caching
   * @param config Storage configuration
   */
  public async createUncachedProvider(config: StorageConfig): Promise<IStorageProvider> {
    return this.createProvider(config, false);
  }

  /**
   * Validates provider configuration before creation
   * @param config Storage configuration
   */
  public validateConfig(config: StorageConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.type) {
      errors.push('Provider type is required');
    } else if (!this.isProviderSupported(config.type)) {
      errors.push(`Unsupported provider type: ${config.type}`);
    }

    // Provider-specific validation
    switch (config.type) {
      case 'supabase':
        if (!config.supabase) {
          errors.push('Supabase configuration is required');
        } else {
          if (!config.supabase.url) {
            errors.push('Supabase URL is required');
          }
          if (!config.supabase.key) {
            errors.push('Supabase key is required');
          }
          if (!config.supabase.bucket) {
            errors.push('Supabase bucket name is required');
          }
        }
        break;
      
      case 'aws-s3':
        if (!config.aws) {
          errors.push('AWS S3 configuration is required');
        } else {
          if (!config.aws.accessKeyId) {
            errors.push('AWS access key ID is required');
          }
          if (!config.aws.secretAccessKey) {
            errors.push('AWS secret access key is required');
          }
          if (!config.aws.region) {
            errors.push('AWS region is required');
          }
          if (!config.aws.bucket) {
            errors.push('AWS S3 bucket name is required');
          }
        }
        break;
      
      case 'google-cloud':
        if (!config.googleCloud) {
          errors.push('Google Cloud Storage configuration is required');
        } else {
          if (!config.googleCloud.projectId) {
            errors.push('Google Cloud project ID is required');
          }
          if (!config.googleCloud.keyFilename) {
            errors.push('Google Cloud key filename is required');
          }
          if (!config.googleCloud.bucket) {
            errors.push('Google Cloud bucket name is required');
          }
        }
        break;
      
      case 'azure-blob':
        if (!config.azure) {
          errors.push('Azure Blob Storage configuration is required');
        } else {
          if (!config.azure.connectionString) {
            errors.push('Azure connection string is required');
          }
          if (!config.azure.containerName) {
            errors.push('Azure container name is required');
          }
        }
        break;
      
      case 'filesystem':
        if (!config.filesystem) {
          errors.push('Filesystem configuration is required');
        } else {
          if (!config.filesystem.basePath) {
            errors.push('Filesystem base path is required');
          }
        }
        break;
      
      case 'mock':
        // Mock provider doesn't require additional configuration
        break;
    }

    // Validate options if present
    if (config.options) {
      if (config.options.maxFileSize && config.options.maxFileSize <= 0) {
        errors.push('Max file size must be greater than 0');
      }
      
      if (config.options.allowedTypes && !Array.isArray(config.options.allowedTypes)) {
        errors.push('Allowed types must be an array');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Gets cached provider instances
   */
  public getCachedProviders(): Map<string, IStorageProvider> {
    return new Map(this.providerCache);
  }

  /**
   * Gets provider capabilities
   * @param providerType The provider type
   */
  public getProviderCapabilities(providerType: string): {
    versioning: boolean;
    encryption: boolean;
    signedUrls: boolean;
    lifecycle: boolean;
    cors: boolean;
    analytics: boolean;
  } {
    switch (providerType) {
      case 'supabase':
        return {
          versioning: false,
          encryption: true,
          signedUrls: true,
          lifecycle: false,
          cors: true,
          analytics: false
        };
      
      case 'aws-s3':
        return {
          versioning: true,
          encryption: true,
          signedUrls: true,
          lifecycle: true,
          cors: true,
          analytics: true
        };
      
      case 'google-cloud':
        return {
          versioning: true,
          encryption: true,
          signedUrls: true,
          lifecycle: true,
          cors: true,
          analytics: true
        };
      
      case 'azure-blob':
        return {
          versioning: true,
          encryption: true,
          signedUrls: true,
          lifecycle: true,
          cors: true,
          analytics: true
        };
      
      case 'filesystem':
        return {
          versioning: false,
          encryption: false,
          signedUrls: false,
          lifecycle: false,
          cors: false,
          analytics: false
        };
      
      case 'mock':
        return {
          versioning: true,
          encryption: false,
          signedUrls: true,
          lifecycle: false,
          cors: false,
          analytics: false
        };
      
      default:
        return {
          versioning: false,
          encryption: false,
          signedUrls: false,
          lifecycle: false,
          cors: false,
          analytics: false
        };
    }
  }

  /**
   * Estimates storage costs for different providers
   * @param providerType The provider type
   * @param usage Usage metrics
   */
  public estimateCosts(providerType: string, usage: {
    storageGB: number;
    transferGB: number;
    requests: number;
  }): {
    storage: number;
    transfer: number;
    requests: number;
    total: number;
    currency: string;
  } {
    // Simplified cost estimation - in reality, this would be much more complex
    const costTables: Record<string, any> = {
      'supabase': {
        storagePerGB: 0.021, // per month
        transferPerGB: 0.09,
        requestsPer1000: 0.0004,
        currency: 'USD'
      },
      'aws-s3': {
        storagePerGB: 0.023,
        transferPerGB: 0.09,
        requestsPer1000: 0.0004,
        currency: 'USD'
      },
      'google-cloud': {
        storagePerGB: 0.020,
        transferPerGB: 0.12,
        requestsPer1000: 0.0004,
        currency: 'USD'
      },
      'azure-blob': {
        storagePerGB: 0.0184,
        transferPerGB: 0.087,
        requestsPer1000: 0.0004,
        currency: 'USD'
      },
      'filesystem': {
        storagePerGB: 0,
        transferPerGB: 0,
        requestsPer1000: 0,
        currency: 'USD'
      },
      'mock': {
        storagePerGB: 0,
        transferPerGB: 0,
        requestsPer1000: 0,
        currency: 'USD'
      }
    };

    const costs = costTables[providerType] || costTables['mock'];
    
    const storage = usage.storageGB * costs.storagePerGB;
    const transfer = usage.transferGB * costs.transferPerGB;
    const requests = (usage.requests / 1000) * costs.requestsPer1000;
    
    return {
      storage,
      transfer,
      requests,
      total: storage + transfer + requests,
      currency: costs.currency
    };
  }

  /**
   * Generates a cache key for the provider configuration
   * @param config Storage configuration
   */
  private generateCacheKey(config: StorageConfig): string {
    const keyParts = [config.type];
    
    switch (config.type) {
      case 'supabase':
        if (config.supabase) {
          keyParts.push(config.supabase.url, config.supabase.bucket);
        }
        break;
      
      case 'aws-s3':
        if (config.aws) {
          keyParts.push(config.aws.region, config.aws.bucket);
        }
        break;
      
      case 'google-cloud':
        if (config.googleCloud) {
          keyParts.push(config.googleCloud.projectId, config.googleCloud.bucket);
        }
        break;
      
      case 'azure-blob':
        if (config.azure) {
          keyParts.push(config.azure.containerName);
        }
        break;
      
      case 'filesystem':
        if (config.filesystem) {
          keyParts.push(config.filesystem.basePath);
        }
        break;
      
      case 'mock':
        keyParts.push('default');
        break;
    }
    
    return keyParts.join(':');
  }
}

// Singleton instance for easy access
export const storageProviderFactory = StorageProviderFactory.getInstance();
