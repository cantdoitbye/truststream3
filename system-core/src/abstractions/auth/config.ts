/**
 * Authentication Configuration Management
 * Manages and validates authentication service configurations
 */

import { AuthConfig, PasswordPolicy } from '../../shared-utils/auth-interface';

export class AuthConfigManager {
  private static instance: AuthConfigManager;
  private config: AuthConfig | null = null;

  private constructor() {}

  public static getInstance(): AuthConfigManager {
    if (!AuthConfigManager.instance) {
      AuthConfigManager.instance = new AuthConfigManager();
    }
    return AuthConfigManager.instance;
  }

  public setConfig(config: AuthConfig): void {
    this.validateConfig(config);
    this.config = config;
  }

  public getConfig(): AuthConfig {
    if (!this.config) {
      throw new Error('Auth configuration not initialized. Call setConfig() first.');
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

  public getFirebaseConfig() {
    const config = this.getConfig();
    if (config.type !== 'firebase' || !config.firebase) {
      throw new Error('Firebase configuration not available');
    }
    return config.firebase;
  }

  public getAuth0Config() {
    const config = this.getConfig();
    if (config.type !== 'auth0' || !config.auth0) {
      throw new Error('Auth0 configuration not available');
    }
    return config.auth0;
  }

  public getCustomConfig() {
    const config = this.getConfig();
    if (config.type !== 'custom' || !config.custom) {
      throw new Error('Custom configuration not available');
    }
    return config.custom;
  }

  public getOptions() {
    return this.getConfig().options || {};
  }

  public getPasswordPolicy(): PasswordPolicy {
    const options = this.getOptions();
    return options.passwordPolicy || {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSymbols: false,
      maxAge: 90,
      preventReuse: 5
    };
  }

  public getSessionTimeout(): number {
    const options = this.getOptions();
    return options.sessionTimeout || 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  }

  public getRefreshThreshold(): number {
    const options = this.getOptions();
    return options.refreshThreshold || 5 * 60 * 1000; // 5 minutes in milliseconds
  }

  public isMFAEnabled(): boolean {
    const options = this.getOptions();
    return options.enableMFA || false;
  }

  private validateConfig(config: AuthConfig): void {
    if (!config.type) {
      throw new Error('Auth provider type is required');
    }

    switch (config.type) {
      case 'supabase':
        this.validateSupabaseConfig(config.supabase);
        break;
      case 'firebase':
        this.validateFirebaseConfig(config.firebase);
        break;
      case 'auth0':
        this.validateAuth0Config(config.auth0);
        break;
      case 'custom':
        this.validateCustomConfig(config.custom);
        break;
      case 'mock':
        // Mock doesn't need validation
        break;
      default:
        throw new Error(`Unsupported auth provider: ${config.type}`);
    }

    if (config.options?.passwordPolicy) {
      this.validatePasswordPolicy(config.options.passwordPolicy);
    }
  }

  private validateSupabaseConfig(config: any): void {
    if (!config) {
      throw new Error('Supabase configuration is required when using supabase provider');
    }
    if (!config.url) {
      throw new Error('Supabase URL is required');
    }
    if (!config.anonKey) {
      throw new Error('Supabase anonymous key is required');
    }
    if (!this.isValidUrl(config.url)) {
      throw new Error('Invalid Supabase URL format');
    }
  }

  private validateFirebaseConfig(config: any): void {
    if (!config) {
      throw new Error('Firebase configuration is required when using firebase provider');
    }
    if (!config.apiKey) {
      throw new Error('Firebase API key is required');
    }
    if (!config.authDomain) {
      throw new Error('Firebase auth domain is required');
    }
    if (!config.projectId) {
      throw new Error('Firebase project ID is required');
    }
  }

  private validateAuth0Config(config: any): void {
    if (!config) {
      throw new Error('Auth0 configuration is required when using auth0 provider');
    }
    if (!config.domain) {
      throw new Error('Auth0 domain is required');
    }
    if (!config.clientId) {
      throw new Error('Auth0 client ID is required');
    }
  }

  private validateCustomConfig(config: any): void {
    if (!config) {
      throw new Error('Custom configuration is required when using custom provider');
    }
    if (!config.baseUrl) {
      throw new Error('Custom base URL is required');
    }
    if (!this.isValidUrl(config.baseUrl)) {
      throw new Error('Invalid custom base URL format');
    }
  }

  private validatePasswordPolicy(policy: PasswordPolicy): void {
    if (policy.minLength < 4 || policy.minLength > 128) {
      throw new Error('Password minimum length must be between 4 and 128 characters');
    }
    if (policy.maxAge && policy.maxAge < 1) {
      throw new Error('Password max age must be at least 1 day');
    }
    if (policy.preventReuse && policy.preventReuse < 1) {
      throw new Error('Password reuse prevention must be at least 1');
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

  public reset(): void {
    this.config = null;
  }
}

// Default export for easy access
export const authConfig = AuthConfigManager.getInstance();
