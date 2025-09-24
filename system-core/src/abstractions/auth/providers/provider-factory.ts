/**
 * Auth Provider Factory
 * Creates appropriate auth provider instances based on configuration
 */

import { AuthConfig } from '../../shared-utils/auth-interface';
import { IAuthProvider } from './auth.interface';
import { SupabaseAuthProvider } from './providers/supabase-provider';
import { MockAuthProvider } from './providers/mock-provider';

export class AuthProviderFactory {
  private static instance: AuthProviderFactory;
  private providerCache = new Map<string, IAuthProvider>();

  private constructor() {}

  public static getInstance(): AuthProviderFactory {
    if (!AuthProviderFactory.instance) {
      AuthProviderFactory.instance = new AuthProviderFactory();
    }
    return AuthProviderFactory.instance;
  }

  /**
   * Creates an auth provider instance based on the configuration
   * @param config Auth configuration
   * @param useCache Whether to use cached instances (default: true)
   * @returns Auth provider instance
   */
  public async createProvider(config: AuthConfig, useCache: boolean = true): Promise<IAuthProvider> {
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

    let provider: IAuthProvider;

    switch (config.type) {
      case 'supabase':
        provider = new SupabaseAuthProvider();
        break;
      
      case 'firebase':
        throw new Error('Firebase auth provider not implemented yet');
      
      case 'auth0':
        throw new Error('Auth0 provider not implemented yet');
      
      case 'custom':
        throw new Error('Custom auth provider not implemented yet');
      
      case 'mock':
        provider = new MockAuthProvider();
        break;
      
      default:
        throw new Error(`Unsupported auth provider type: ${config.type}`);
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
          console.warn('Error disconnecting cached provider:', error);
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
   * @param config Auth configuration
   */
  public removeCachedProvider(config: AuthConfig): boolean {
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
   * @param config Auth configuration
   */
  public async createUncachedProvider(config: AuthConfig): Promise<IAuthProvider> {
    return this.createProvider(config, false);
  }

  /**
   * Validates provider configuration before creation
   * @param config Auth configuration
   */
  public validateConfig(config: AuthConfig): { valid: boolean; errors: string[] } {
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
          if (!config.supabase.anonKey) {
            errors.push('Supabase anonymous key is required');
          }
        }
        break;
      
      case 'firebase':
        if (!config.firebase) {
          errors.push('Firebase configuration is required');
        } else {
          if (!config.firebase.apiKey) {
            errors.push('Firebase API key is required');
          }
          if (!config.firebase.authDomain) {
            errors.push('Firebase auth domain is required');
          }
          if (!config.firebase.projectId) {
            errors.push('Firebase project ID is required');
          }
        }
        break;
      
      case 'auth0':
        if (!config.auth0) {
          errors.push('Auth0 configuration is required');
        } else {
          if (!config.auth0.domain) {
            errors.push('Auth0 domain is required');
          }
          if (!config.auth0.clientId) {
            errors.push('Auth0 client ID is required');
          }
        }
        break;
      
      case 'custom':
        if (!config.custom) {
          errors.push('Custom configuration is required');
        } else {
          if (!config.custom.baseUrl) {
            errors.push('Custom base URL is required');
          }
        }
        break;
      
      case 'mock':
        // Mock provider doesn't require additional configuration
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Gets cached provider instances
   */
  public getCachedProviders(): Map<string, IAuthProvider> {
    return new Map(this.providerCache);
  }

  /**
   * Generates a cache key for the provider configuration
   * @param config Auth configuration
   */
  private generateCacheKey(config: AuthConfig): string {
    const keyParts = [config.type];
    
    switch (config.type) {
      case 'supabase':
        if (config.supabase) {
          keyParts.push(config.supabase.url);
        }
        break;
      
      case 'firebase':
        if (config.firebase) {
          keyParts.push(config.firebase.projectId);
        }
        break;
      
      case 'auth0':
        if (config.auth0) {
          keyParts.push(config.auth0.domain);
        }
        break;
      
      case 'custom':
        if (config.custom) {
          keyParts.push(config.custom.baseUrl);
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
export const authProviderFactory = AuthProviderFactory.getInstance();
