/**
 * Auth Provider Factory
 * Factory for creating authentication provider instances
 */

import { 
  AuthConfig, 
  IAuthService,
  AuthError
} from '../../../shared-utils/auth-interface';

export interface AuthProviderCapabilities {
  supportsMFA: boolean;
  supportsSSO: boolean;
  supportsSocialAuth: boolean;
  supportsPasswordless: boolean;
  supportsRoleManagement: boolean;
  supportsSessionManagement: boolean;
  maxSessionDuration: number;
  supportedProviders: string[];
  supportedFeatures: string[];
}

export interface AuthProviderFactory {
  create(config: AuthConfig): IAuthService;
  validateConfig(config: AuthConfig): { valid: boolean; errors: string[] };
  getCapabilities(): AuthProviderCapabilities;
}

export class AuthProviderRegistry {
  private static instance: AuthProviderRegistry;
  private providers = new Map<string, AuthProviderFactory>();

  private constructor() {
    this.registerDefaultProviders();
  }

  static getInstance(): AuthProviderRegistry {
    if (!AuthProviderRegistry.instance) {
      AuthProviderRegistry.instance = new AuthProviderRegistry();
    }
    return AuthProviderRegistry.instance;
  }

  /**
   * Register an auth provider
   */
  register(type: string, factory: AuthProviderFactory): void {
    this.providers.set(type, factory);
  }

  /**
   * Create auth service instance
   */
  create(config: AuthConfig): IAuthService {
    const factory = this.providers.get(config.type);
    if (!factory) {
      throw new AuthError(`Unknown auth provider: ${config.type}`, 'PROVIDER_NOT_FOUND');
    }

    // Validate configuration
    const validation = factory.validateConfig(config);
    if (!validation.valid) {
      throw new AuthError(`Invalid configuration: ${validation.errors.join(', ')}`, 'INVALID_CONFIG');
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
  getCapabilities(type: string): AuthProviderCapabilities | null {
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
      const { SupabaseAuthProviderFactory } = await import('./SupabaseAuthProvider');
      this.register('supabase', new SupabaseAuthProviderFactory());

      // Register Firebase provider
      const { FirebaseAuthProviderFactory } = await import('./FirebaseAuthProvider');
      this.register('firebase', new FirebaseAuthProviderFactory());

      // Register Auth0 provider
      const { Auth0AuthProviderFactory } = await import('./Auth0AuthProvider');
      this.register('auth0', new Auth0AuthProviderFactory());

      // Register Mock provider
      const { MockAuthProviderFactory } = await import('./MockAuthProvider');
      this.register('mock', new MockAuthProviderFactory());
    } catch (error) {
      console.warn('Some auth providers failed to load:', error);
    }
  }
}

/**
 * Convenience factory class
 */
export class AuthProviderFactory {
  private static registry = AuthProviderRegistry.getInstance();

  /**
   * Create auth service from configuration
   */
  static create(config: AuthConfig): IAuthService {
    return this.registry.create(config);
  }

  /**
   * Register custom provider
   */
  static registerProvider(type: string, factory: AuthProviderFactory): void {
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
  static getCapabilities(type: string): AuthProviderCapabilities | null {
    return this.registry.getCapabilities(type);
  }
}

// Export the singleton registry
export const authProviderRegistry = AuthProviderRegistry.getInstance();