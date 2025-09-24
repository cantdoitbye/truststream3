/**
 * Enterprise Security Integration
 * 
 * Main integration point for all enterprise security enhancements
 */

export { SecurityConfig, SecurityConfigManager, defaultSecurityConfig } from './SecurityConfig';
export { ZeroTrustPolicyEngine, AccessRequest, PolicyDecision, DeviceTrustAssessment, UserRiskAssessment } from './ZeroTrustPolicyEngine';
export { SecurityMonitoringService, SecurityAlert, ThreatIndicator, SecurityMetrics } from './SecurityMonitoringService';
export { EnhancedAuthService, EnhancedAuthOptions, PasskeyCredentials, BiometricCredentials } from './EnhancedAuthService';
export { EnhancedGDPRService, DataClassification, ConsentRecord, DataSubjectRequest } from './EnhancedGDPRService';
export { SecurityMiddleware, createSecurityMiddleware, SecurityMiddlewareOptions } from './SecurityMiddleware';

// Types
export type {
  SecurityAlert,
  ThreatIndicator,
  SecurityMetrics,
  BehavioralPattern,
  ComplianceEvent,
  AccessRequest,
  PolicyDecision,
  DeviceTrustAssessment,
  UserRiskAssessment,
  DataClassification,
  ConsentRecord,
  DataSubjectRequest,
  PrivacyImpactAssessment,
  BreachNotification
} from './SecurityMonitoringService';

export type {
  EnhancedAuthOptions,
  PasskeyCredentials,
  BiometricCredentials,
  DeviceInfo,
  SessionContext
} from './EnhancedAuthService';

export type {
  SecurityConfig
} from './SecurityConfig';

export type {
  SecurityMiddlewareOptions,
  SecurityHeaders,
  RateLimitConfig
} from './SecurityMiddleware';
