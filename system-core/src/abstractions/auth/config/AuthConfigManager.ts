/**
 * Auth Configuration Manager
 * Centralized configuration management for authentication abstraction layer
 */

import { AuthConfig } from '../../../shared-utils/auth-interface';

export interface AuthEnvironmentConfig {
  development: AuthConfig;
  testing: AuthConfig;
  staging: AuthConfig;
  production: AuthConfig;
}

export interface AuthConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class AuthConfigManager {
  private static instance: AuthConfigManager;
  private currentEnvironment: string;
  private config: AuthConfig | null = null;
  private environmentConfigs: Partial<AuthEnvironmentConfig> = {};

  private constructor() {
    this.currentEnvironment = process.env.NODE_ENV || 'development';
  }

  static getInstance(): AuthConfigManager {
    if (!AuthConfigManager.instance) {
      AuthConfigManager.instance = new AuthConfigManager();
    }
    return AuthConfigManager.instance;
  }

  /**
   * Load configuration from environment variables
   */
  loadFromEnvironment(): AuthConfig {
    const config: AuthConfig = {
      type: this.getEnvVar('AUTH_TYPE', 'supabase') as AuthConfig['type']
    };

    // Load Supabase configuration
    if (config.type === 'supabase') {
      config.supabase = {
        url: this.getEnvVar('SUPABASE_URL', ''),
        anonKey: this.getEnvVar('SUPABASE_ANON_KEY', ''),
        serviceRoleKey: this.getEnvVar('SUPABASE_SERVICE_ROLE_KEY')
      };
    }

    // Load Firebase configuration
    if (config.type === 'firebase') {
      config.firebase = {
        apiKey: this.getEnvVar('FIREBASE_API_KEY', ''),
        authDomain: this.getEnvVar('FIREBASE_AUTH_DOMAIN', ''),
        projectId: this.getEnvVar('FIREBASE_PROJECT_ID', '')
      };
    }

    // Load Auth0 configuration
    if (config.type === 'auth0') {
      config.auth0 = {
        domain: this.getEnvVar('AUTH0_DOMAIN', ''),
        clientId: this.getEnvVar('AUTH0_CLIENT_ID', ''),
        clientSecret: this.getEnvVar('AUTH0_CLIENT_SECRET')
      };
    }

    // Load custom configuration
    if (config.type === 'custom') {
      config.custom = {
        baseUrl: this.getEnvVar('AUTH_BASE_URL', ''),
        apiKey: this.getEnvVar('AUTH_API_KEY'),
        tokenEndpoint: this.getEnvVar('AUTH_TOKEN_ENDPOINT'),
        userEndpoint: this.getEnvVar('AUTH_USER_ENDPOINT')
      };
    }

    // Load options
    config.options = {
      sessionTimeout: parseInt(this.getEnvVar('AUTH_SESSION_TIMEOUT', '3600000')), // 1 hour
      refreshThreshold: parseInt(this.getEnvVar('AUTH_REFRESH_THRESHOLD', '300000')), // 5 minutes
      enableMFA: this.getEnvVar('AUTH_ENABLE_MFA', 'false') === 'true',
      passwordPolicy: {
        minLength: parseInt(this.getEnvVar('AUTH_PASSWORD_MIN_LENGTH', '8')),
        requireUppercase: this.getEnvVar('AUTH_PASSWORD_REQUIRE_UPPERCASE', 'true') === 'true',
        requireLowercase: this.getEnvVar('AUTH_PASSWORD_REQUIRE_LOWERCASE', 'true') === 'true',
        requireNumbers: this.getEnvVar('AUTH_PASSWORD_REQUIRE_NUMBERS', 'true') === 'true',
        requireSymbols: this.getEnvVar('AUTH_PASSWORD_REQUIRE_SYMBOLS', 'false') === 'true',
        maxAge: parseInt(this.getEnvVar('AUTH_PASSWORD_MAX_AGE', '90')), // 90 days
        preventReuse: parseInt(this.getEnvVar('AUTH_PASSWORD_PREVENT_REUSE', '5'))
      }
    };

    this.config = config;
    return config;
  }

  /**
   * Set configuration manually
   */
  setConfig(config: AuthConfig): void {
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid auth configuration: ${validation.errors.join(', ')}`);
    }
    this.config = config;
  }

  /**
   * Get current configuration
   */
  getConfig(): AuthConfig {
    if (!this.config) {
      return this.loadFromEnvironment();
    }
    return this.config;
  }

  /**
   * Validate authentication configuration
   */
  validateConfig(config: AuthConfig): AuthConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate type
    if (!config.type) {
      errors.push('Authentication type is required');
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

    // Validate Firebase configuration
    if (config.type === 'firebase') {
      if (!config.firebase?.apiKey) {
        errors.push('Firebase API key is required');
      }
      if (!config.firebase?.authDomain) {
        errors.push('Firebase auth domain is required');
      }
      if (!config.firebase?.projectId) {
        errors.push('Firebase project ID is required');
      }
    }

    // Validate Auth0 configuration
    if (config.type === 'auth0') {
      if (!config.auth0?.domain) {
        errors.push('Auth0 domain is required');
      }
      if (!config.auth0?.clientId) {
        errors.push('Auth0 client ID is required');
      }
      if (!config.auth0?.clientSecret) {
        warnings.push('Auth0 client secret not provided - server-side operations may be limited');
      }
    }

    // Validate custom configuration
    if (config.type === 'custom') {
      if (!config.custom?.baseUrl) {
        errors.push('Custom auth base URL is required');
      }
    }

    // Validate password policy
    if (config.options?.passwordPolicy) {
      const policy = config.options.passwordPolicy;
      if (policy.minLength && policy.minLength < 6) {
        warnings.push('Password minimum length less than 6 may be insecure');
      }
      if (policy.maxAge && policy.maxAge > 365) {
        warnings.push('Password max age greater than 365 days may be insecure');
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
  setEnvironmentConfig(environment: string, config: AuthConfig): void {
    this.environmentConfigs[environment as keyof AuthEnvironmentConfig] = config;
  }

  /**
   * Get configuration for specific environment
   */
  getEnvironmentConfig(environment?: string): AuthConfig {
    const env = environment || this.currentEnvironment;
    const envConfig = this.environmentConfigs[env as keyof AuthEnvironmentConfig];
    
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
   * Test configuration by attempting connection
   */
  async testConfig(config?: AuthConfig): Promise<{ success: boolean; error?: string }> {
    const testConfig = config || this.getConfig();
    
    try {
      // Import and create appropriate provider
      const { AuthProviderFactory } = await import('../providers/AuthProviderFactory');
      const provider = AuthProviderFactory.create(testConfig);
      
      // Test basic connection/initialization
      await provider.initialize?.();
      
      return { success: true };
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

    if (config.supabase) {
      summary.supabase = {
        url: config.supabase.url,
        hasAnonKey: !!config.supabase.anonKey,
        hasServiceRoleKey: !!config.supabase.serviceRoleKey
      };
    }

    if (config.firebase) {
      summary.firebase = {
        authDomain: config.firebase.authDomain,
        projectId: config.firebase.projectId,
        hasApiKey: !!config.firebase.apiKey
      };
    }

    if (config.auth0) {
      summary.auth0 = {
        domain: config.auth0.domain,
        clientId: config.auth0.clientId,
        hasClientSecret: !!config.auth0.clientSecret
      };
    }

    if (config.custom) {
      summary.custom = {
        baseUrl: config.custom.baseUrl,
        hasApiKey: !!config.custom.apiKey
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
export const authConfigManager = AuthConfigManager.getInstance();