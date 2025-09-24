/**
 * Enhanced Auth Provider Factory with Firebase Support
 * Registers and manages all available authentication providers
 */

import { AuthConfig } from '../../../shared-utils/auth-interface';
import { BaseAuthProvider } from '../auth.interface';
import { SupabaseAuthProvider } from './supabase-provider';
import { FirebaseAuthProvider } from './firebase-provider';
import { MockAuthProvider } from './mock-provider';

export interface AuthProviderCapabilities {
  supportsMFA: boolean;
  supportsSSO: boolean;
  supportsSocialAuth: boolean;
  supportsRoleManagement: boolean;
  maxSessions: number;
  supportedProviders: string[];
}

export class EnhancedAuthProviderFactory {
  private static providers = new Map<string, typeof BaseAuthProvider>();
  private static capabilities = new Map<string, AuthProviderCapabilities>();

  static {
    // Register all available providers
    this.registerProvider('supabase', SupabaseAuthProvider, {
      supportsMFA: true,
      supportsSSO: true,
      supportsSocialAuth: true,
      supportsRoleManagement: true,
      maxSessions: 1000000,
      supportedProviders: ['email', 'google', 'github', 'apple', 'facebook']
    });

    this.registerProvider('firebase', FirebaseAuthProvider, {
      supportsMFA: true,
      supportsSSO: true,
      supportsSocialAuth: true,
      supportsRoleManagement: true,
      maxSessions: 1000000,
      supportedProviders: ['email', 'google', 'facebook', 'twitter', 'github']
    });

    this.registerProvider('mock', MockAuthProvider, {
      supportsMFA: true,
      supportsSSO: true,
      supportsSocialAuth: true,
      supportsRoleManagement: true,
      maxSessions: 100,
      supportedProviders: ['mock']
    });
  }

  /**
   * Register a new auth provider
   */
  static registerProvider(
    name: string,
    providerClass: typeof BaseAuthProvider,
    capabilities: AuthProviderCapabilities
  ): void {
    this.providers.set(name, providerClass);
    this.capabilities.set(name, capabilities);
  }

  /**
   * Create an auth provider instance
   */
  static createProvider(config: AuthConfig): BaseAuthProvider {
    const ProviderClass = this.providers.get(config.type);
    
    if (!ProviderClass) {
      throw new Error(`Unknown auth provider: ${config.type}`);
    }

    return new ProviderClass();
  }

  /**
   * Get provider capabilities
   */
  static getProviderCapabilities(providerType: string): AuthProviderCapabilities | null {
    return this.capabilities.get(providerType) || null;
  }

  /**
   * List all available providers
   */
  static getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider supports a specific auth method
   */
  static supportsAuthMethod(providerType: string, method: string): boolean {
    const capabilities = this.capabilities.get(providerType);
    return capabilities?.supportedProviders.includes(method) || false;
  }

  /**
   * Find providers that support specific requirements
   */
  static findCompatibleProviders(requirements: {
    requiresMFA?: boolean;
    requiresSSO?: boolean;
    requiresSocialAuth?: boolean;
    socialProviders?: string[];
  }): string[] {
    const result: string[] = [];
    
    for (const [name, capabilities] of this.capabilities.entries()) {
      let compatible = true;
      
      if (requirements.requiresMFA && !capabilities.supportsMFA) {
        compatible = false;
      }
      
      if (requirements.requiresSSO && !capabilities.supportsSSO) {
        compatible = false;
      }
      
      if (requirements.requiresSocialAuth && !capabilities.supportsSocialAuth) {
        compatible = false;
      }
      
      if (requirements.socialProviders) {
        for (const provider of requirements.socialProviders) {
          if (!capabilities.supportedProviders.includes(provider)) {
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