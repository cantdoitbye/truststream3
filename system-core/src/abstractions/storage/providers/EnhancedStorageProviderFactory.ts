/**
 * Enhanced Storage Provider Factory with Firebase Support
 * Registers and manages all available storage providers
 */

import { StorageConfig } from '../../../shared-utils/storage-interface';
import { BaseStorageProvider } from '../storage.interface';
import { SupabaseStorageProvider } from './supabase-storage-provider';
import { FirebaseStorageProvider } from './firebase-storage-provider';
import { MockStorageProvider } from './mock-storage-provider';

export interface StorageProviderCapabilities {
  supportsVersioning: boolean;
  supportsEncryption: boolean;
  supportsCDN: boolean;
  maxFileSize: number;
  supportedFormats: string[];
}

export class EnhancedStorageProviderFactory {
  private static providers = new Map<string, typeof BaseStorageProvider>();
  private static capabilities = new Map<string, StorageProviderCapabilities>();

  static {
    // Register all available providers
    this.registerProvider('supabase', SupabaseStorageProvider, {
      supportsVersioning: false,
      supportsEncryption: true,
      supportsCDN: true,
      maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB
      supportedFormats: ['*']
    });

    this.registerProvider('firebase', FirebaseStorageProvider, {
      supportsVersioning: false,
      supportsEncryption: true,
      supportsCDN: true,
      maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB
      supportedFormats: ['*']
    });

    this.registerProvider('mock', MockStorageProvider, {
      supportsVersioning: false,
      supportsEncryption: false,
      supportsCDN: false,
      maxFileSize: 1024 * 1024, // 1MB
      supportedFormats: ['*']
    });
  }

  /**
   * Register a new storage provider
   */
  static registerProvider(
    name: string,
    providerClass: typeof BaseStorageProvider,
    capabilities: StorageProviderCapabilities
  ): void {
    this.providers.set(name, providerClass);
    this.capabilities.set(name, capabilities);
  }

  /**
   * Create a storage provider instance
   */
  static createProvider(config: StorageConfig): BaseStorageProvider {
    const ProviderClass = this.providers.get(config.type);
    
    if (!ProviderClass) {
      throw new Error(`Unknown storage provider: ${config.type}`);
    }

    return new ProviderClass();
  }

  /**
   * Get provider capabilities
   */
  static getProviderCapabilities(providerType: string): StorageProviderCapabilities | null {
    return this.capabilities.get(providerType) || null;
  }

  /**
   * List all available providers
   */
  static getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Find providers that meet file size requirements
   */
  static getProvidersForFileSize(fileSize: number): string[] {
    const result: string[] = [];
    
    for (const [name, capabilities] of this.capabilities.entries()) {
      if (capabilities.maxFileSize >= fileSize) {
        result.push(name);
      }
    }
    
    return result;
  }

  /**
   * Find providers with specific features
   */
  static getProvidersWithFeatures(requirements: {
    requiresVersioning?: boolean;
    requiresEncryption?: boolean;
    requiresCDN?: boolean;
    supportedFormats?: string[];
  }): string[] {
    const result: string[] = [];
    
    for (const [name, capabilities] of this.capabilities.entries()) {
      let compatible = true;
      
      if (requirements.requiresVersioning && !capabilities.supportsVersioning) {
        compatible = false;
      }
      
      if (requirements.requiresEncryption && !capabilities.supportsEncryption) {
        compatible = false;
      }
      
      if (requirements.requiresCDN && !capabilities.supportsCDN) {
        compatible = false;
      }
      
      if (requirements.supportedFormats) {
        for (const format of requirements.supportedFormats) {
          if (!capabilities.supportedFormats.includes('*') && 
              !capabilities.supportedFormats.includes(format)) {
            compatible = false;
            break;
          }
        }
      }
      
      if (compatible) {
        result.push(name);
      }
    }
    
    return result;
  }
}