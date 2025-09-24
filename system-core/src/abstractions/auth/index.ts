/**
 * Enhanced Authentication Abstraction Layer
 * 
 * Updated main export with enterprise security features
 */

// Core service and configuration
export { AuthService, authService } from './auth.service';
export { AuthConfigManager, authConfig } from './config';
export { UnifiedAuthService } from './UnifiedAuthService';

// Enhanced security services
export * from './enterprise-security';

// Interfaces and types
export * from './auth.interface';

// Providers
export { AuthProviderFactory, authProviderFactory } from './providers/provider-factory';
export { SupabaseAuthProvider } from './providers/supabase-provider';
export { MockAuthProvider } from './providers/mock-provider';

// Events system
export { AuthEventEmitter, authEvents } from './events';
export type { AuthEventHandler, EventSubscription } from './events';

// Utilities
export * from './utils';

// Re-export shared auth interfaces
export * from '../../shared-utils/auth-interface';

// Enhanced configuration for enterprise setup
export const createEnhancedAuthService = async (config: any, options?: any) => {
  const { EnhancedAuthService } = await import('./enterprise-security/EnhancedAuthService');
  const service = new EnhancedAuthService(config, options);
  await service.initialize(config);
  return service;
};

// Quick setup for common providers with enterprise features
export const setupEnhancedSupabaseAuth = async (url: string, anonKey: string, options?: any) => {
  return createEnhancedAuthService({
    type: 'supabase',
    supabase: { url, anonKey },
    options
  }, {
    enableZeroTrust: true,
    enableSecurityMonitoring: true,
    enablePasswordless: true,
    ...options
  });
};

// Enhanced auth middleware helper with enterprise security
export const createEnhancedAuthMiddleware = async (authService: any, securityOptions?: any) => {
  const { createSecurityMiddleware } = await import('./enterprise-security/SecurityMiddleware');
  
  return createSecurityMiddleware({
    authService,
    ...securityOptions
  });
};

// Security dashboard helper
export const createSecurityDashboard = async (services: {
  authService?: any;
  monitoring?: any;
  gdprService?: any;
}) => {
  return {
    getSecurityMetrics: () => services.monitoring?.getMetrics() || null,
    getSecurityAlerts: (filter?: any) => services.monitoring?.getAlerts(filter) || [],
    getComplianceStatus: () => services.gdprService?.getComplianceDashboard() || null,
    getUserSecurityProfile: async (userId: string) => {
      const alerts = services.monitoring?.getAlerts({ userId }) || [];
      const user = await services.authService?.getCurrentUser();
      return {
        user,
        alerts,
        riskScore: alerts.reduce((score, alert) => {
          const severityScores = { low: 0.2, medium: 0.5, high: 0.8, critical: 1.0 };
          return Math.max(score, severityScores[alert.severity as keyof typeof severityScores] || 0);
        }, 0)
      };
    }
  };
};

// Enterprise deployment helper
export const deployEnterpriseSecuritySuite = async (config: {
  authConfig: any;
  securityConfig?: any;
  enableAll?: boolean;
}) => {
  const { EnhancedAuthService } = await import('./enterprise-security/EnhancedAuthService');
  const { SecurityMonitoringService } = await import('./enterprise-security/SecurityMonitoringService');
  const { EnhancedGDPRService } = await import('./enterprise-security/EnhancedGDPRService');
  const { SecurityConfigManager } = await import('./enterprise-security/SecurityConfig');
  const { createSecurityMiddleware } = await import('./enterprise-security/SecurityMiddleware');
  const GDPRComplianceUtils = (await import('../../utils/gdpr-compliance')).default;

  // Initialize security configuration
  const securityConfigManager = new SecurityConfigManager(
    config.securityConfig,
    process.env.NODE_ENV as any || 'production'
  );

  // Initialize enhanced auth service
  const authService = new EnhancedAuthService(config.authConfig, {
    enableZeroTrust: config.enableAll ?? true,
    enableSecurityMonitoring: config.enableAll ?? true,
    enablePasswordless: config.enableAll ?? true,
    securityConfig: config.securityConfig
  });

  await authService.initialize(config.authConfig);

  // Initialize monitoring service
  const monitoringService = new SecurityMonitoringService(securityConfigManager.getConfig());
  monitoringService.start();

  // Initialize GDPR service
  const gdprUtils = new GDPRComplianceUtils(
    process.env.SUPABASE_URL || 'http://localhost:54321',
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const gdprService = new EnhancedGDPRService(securityConfigManager.getConfig(), gdprUtils);
  gdprService.start();

  // Create security middleware
  const securityMiddleware = createSecurityMiddleware({
    authService,
    securityConfig: securityConfigManager,
    monitoring: monitoringService
  });

  // Create dashboard
  const dashboard = await createSecurityDashboard({
    authService,
    monitoring: monitoringService,
    gdprService
  });

  return {
    authService,
    monitoringService,
    gdprService,
    securityMiddleware,
    dashboard,
    config: securityConfigManager
  };
};

// Constants
export const AUTH_EVENTS = {
  SIGNED_IN: 'SIGNED_IN',
  SIGNED_OUT: 'SIGNED_OUT',
  TOKEN_REFRESHED: 'TOKEN_REFRESHED',
  USER_UPDATED: 'USER_UPDATED',
  PASSWORD_RECOVERY: 'PASSWORD_RECOVERY',
  MFA_ENABLED: 'MFA_ENABLED',
  MFA_DISABLED: 'MFA_DISABLED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  // Enhanced security events
  SECURITY_ALERT: 'SECURITY_ALERT',
  ZERO_TRUST_EVALUATION: 'ZERO_TRUST_EVALUATION',
  PASSWORDLESS_AUTH: 'PASSWORDLESS_AUTH',
  BIOMETRIC_AUTH: 'BIOMETRIC_AUTH',
  GDPR_REQUEST: 'GDPR_REQUEST'
} as const;

export const AUTH_PROVIDERS = {
  SUPABASE: 'supabase',
  FIREBASE: 'firebase',
  AUTH0: 'auth0',
  CUSTOM: 'custom',
  MOCK: 'mock'
} as const;

export const SECURITY_LEVELS = {
  BASIC: 'basic',
  ENHANCED: 'enhanced',
  ENTERPRISE: 'enterprise',
  ZERO_TRUST: 'zero_trust'
} as const;
