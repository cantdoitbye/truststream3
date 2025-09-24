/**
 * Backend Manager Types
 * Type definitions for the backend abstraction system
 */

import { DatabaseConfig, AuthConfig, StorageConfig } from '../../../shared-utils/index';

// Core Backend Configuration Types
export interface BackendConfiguration {
  version: string;
  name: string;
  activeProvider: string;
  providers: Record<string, BackendProvider>;
  migration?: MigrationConfig;
  monitoring?: MonitoringConfig;
  failover?: FailoverConfig;
}

export interface BackendProvider {
  name: string;
  type: ProviderType;
  enabled: boolean;
  priority: number;
  database: DatabaseConfig;
  auth: AuthConfig;
  storage: StorageConfig;
  realtime?: RealTimeConfig;
  edgeFunctions?: EdgeFunctionConfig;
  capabilities: ProviderCapabilities;
  limits?: ProviderLimits;
  metadata?: Record<string, any>;
}

export type ProviderType = 
  | 'supabase'
  | 'firebase'
  | 'aws'
  | 'gcp'
  | 'azure'
  | 'mongodb'
  | 'postgresql'
  | 'mysql'
  | 'redis'
  | 'hybrid'
  | 'custom';

export interface ProviderCapabilities {
  database: {
    supportsTransactions: boolean;
    supportsReplication: boolean;
    supportsSharding: boolean;
    supportsBackup: boolean;
    maxConnections: number;
    supportedFeatures: string[];
  };
  auth: {
    supportsMFA: boolean;
    supportsSSO: boolean;
    supportsSocialAuth: boolean;
    supportsRoleManagement: boolean;
    maxSessions: number;
    supportedProviders: string[];
  };
  storage: {
    supportsVersioning: boolean;
    supportsEncryption: boolean;
    supportsCDN: boolean;
    maxFileSize: number;
    supportedFormats: string[];
  };
  realtime: {
    supportsChannels: boolean;
    supportsPresence: boolean;
    maxConcurrentConnections: number;
    supportedProtocols: string[];
  };
  edgeFunctions: {
    supportsScheduling: boolean;
    supportsWebhooks: boolean;
    maxExecutionTime: number;
    supportedRuntimes: string[];
  };
}

export interface ProviderLimits {
  database?: {
    maxTableSize?: number;
    maxQueryDuration?: number;
    maxConcurrentQueries?: number;
  };
  storage?: {
    maxStorageSize?: number;
    maxBandwidth?: number;
    maxRequests?: number;
  };
  auth?: {
    maxUsers?: number;
    maxLoginAttempts?: number;
  };
}

// Configuration Types
export interface RealTimeConfig {
  type: 'supabase' | 'firebase' | 'socket.io' | 'websocket' | 'sse';
  endpoint?: string;
  apiKey?: string;
  options?: {
    autoReconnect?: boolean;
    heartbeatInterval?: number;
    maxReconnectAttempts?: number;
  };
}

export interface EdgeFunctionConfig {
  type: 'supabase' | 'vercel' | 'cloudflare' | 'aws-lambda' | 'azure-functions';
  endpoint?: string;
  apiKey?: string;
  options?: {
    timeout?: number;
    retryAttempts?: number;
    environment?: 'development' | 'staging' | 'production';
  };
}

export interface MigrationConfig {
  enableAutoMigration: boolean;
  migrationTimeout: number;
  backupBeforeMigration: boolean;
  verifyDataIntegrity: boolean;
  rollbackOnFailure: boolean;
  batchSize?: number;
  parallelOperations?: number;
}

export interface MonitoringConfig {
  enableHealthChecks: boolean;
  healthCheckInterval: number;
  enableMetrics: boolean;
  enableAlerting: boolean;
  alertThresholds: {
    responseTime: number;
    errorRate: number;
    availability: number;
  };
}

export interface FailoverConfig {
  enableAutoFailover: boolean;
  failoverTimeout: number;
  healthCheckRetries: number;
  fallbackProviders: string[];
  notificationEndpoints?: string[];
}

// Backend Switching Types
export interface BackendSwitchOptions {
  reason?: string;
  preserveData?: boolean;
  verifyIntegrity?: boolean;
  migrationStrategy?: 'immediate' | 'gradual' | 'blue-green';
  rollbackOnFailure?: boolean;
  notifyUsers?: boolean;
  scheduledAt?: Date;
  metadata?: Record<string, any>;
}

export interface MigrationPlan {
  id: string;
  sourceProvider: BackendProvider;
  targetProvider: BackendProvider;
  steps: MigrationStep[];
  estimatedDuration: number;
  risksAssessment: string[];
  rollbackPlan: RollbackStep[];
  verification: VerificationStep[];
}

export interface MigrationStep {
  id: string;
  type: 'export' | 'transform' | 'import' | 'verify' | 'cleanup';
  service: 'database' | 'auth' | 'storage' | 'realtime' | 'edgeFunctions';
  description: string;
  estimatedDuration: number;
  dependencies: string[];
  rollbackable: boolean;
}

export interface RollbackStep {
  stepId: string;
  action: string;
  description: string;
}

export interface VerificationStep {
  id: string;
  type: 'data-integrity' | 'performance' | 'functionality' | 'security';
  description: string;
  criteria: any;
}

export interface MigrationProgress {
  planId: string;
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  failedSteps: string[];
  startTime: Date;
  estimatedCompletion: Date;
  currentOperation: string;
}

export interface MigrationResult {
  success: boolean;
  planId: string;
  completedSteps: string[];
  failedSteps: Array<{ stepId: string; error: string }>;
  duration: number;
  dataIntegrityCheck: boolean;
  performanceComparison?: PerformanceComparison;
  error?: string;
}

export interface PerformanceComparison {
  before: PerformanceMetrics;
  after: PerformanceMetrics;
  improvement: number; // percentage
}

export interface PerformanceMetrics {
  avgResponseTime: number;
  queryLatency: number;
  throughput: number;
  errorRate: number;
  availability: number;
}

// Status and Health Types
export interface BackendStatus {
  initialized: boolean;
  currentProvider: string | null;
  availableProviders: string[];
  health: BackendHealthStatus;
  services: Record<string, ServiceStatus>;
  isSwitching?: boolean;
  queuedSwitches?: number;
}

export interface BackendHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastChecked: Date;
  responseTime?: number;
  errors?: string[];
  services?: Record<string, ServiceHealth>;
  metrics?: HealthMetrics;
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  errorRate: number;
  lastError?: string;
}

export interface ServiceStatus {
  connected: boolean;
  stats: any;
  lastActivity?: Date;
  errors?: string[];
}

export interface HealthMetrics {
  uptime: number;
  avgResponseTime: number;
  requestCount: number;
  errorCount: number;
  dataIntegrity: number;
  performanceScore: number;
}

// Event Types
export interface BackendEvent {
  type: BackendEventType;
  timestamp: Date;
  provider?: string;
  service?: string;
  data?: any;
  error?: Error;
}

export type BackendEventType =
  | 'initialization:started'
  | 'initialization:completed'
  | 'initialization:failed'
  | 'provider:switch:started'
  | 'provider:switch:completed'
  | 'provider:switch:failed'
  | 'migration:plan:created'
  | 'migration:progress'
  | 'migration:rollback:started'
  | 'migration:rollback:completed'
  | 'migration:rollback:failed'
  | 'health:changed'
  | 'health:degraded'
  | 'failover:started'
  | 'failover:completed'
  | 'failover:failed'
  | 'service:connected'
  | 'service:disconnected'
  | 'service:error'
  | 'shutdown:started'
  | 'shutdown:completed'
  | 'shutdown:failed';

// Configuration Validation Types
export interface ConfigurationValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface ProviderValidation {
  name: string;
  valid: boolean;
  errors: string[];
  capabilities: ProviderCapabilities;
  connectionTest?: boolean;
}

// Migration Strategy Types
export interface MigrationStrategy {
  name: string;
  description: string;
  estimatedDowntime: number;
  dataLossRisk: 'none' | 'low' | 'medium' | 'high';
  complexity: 'simple' | 'moderate' | 'complex';
  requirements: string[];
  steps: MigrationStepTemplate[];
}

export interface MigrationStepTemplate {
  type: MigrationStep['type'];
  service: MigrationStep['service'];
  template: string;
  parameters: Record<string, any>;
}

// Compatibility Types
export interface CompatibilityMatrix {
  source: string;
  target: string;
  compatible: boolean;
  limitations: string[];
  dataTransformations: DataTransformation[];
  unsupportedFeatures: string[];
}

export interface DataTransformation {
  source: string;
  target: string;
  type: 'direct' | 'transform' | 'lossy';
  description: string;
  transformFunction?: string;
}

// Testing and Validation Types
export interface BackendTestSuite {
  name: string;
  provider: string;
  tests: BackendTest[];
  setup?: TestSetup;
  teardown?: TestTeardown;
}

export interface BackendTest {
  id: string;
  name: string;
  type: 'unit' | 'integration' | 'performance' | 'security';
  service: string;
  description: string;
  assertion: TestAssertion;
  timeout?: number;
}

export interface TestAssertion {
  type: 'response-time' | 'data-integrity' | 'functionality' | 'error-handling';
  criteria: any;
  expectedResult: any;
}

export interface TestSetup {
  script: string;
  data?: any;
  environment?: Record<string, string>;
}

export interface TestTeardown {
  script: string;
  cleanupData?: boolean;
}

export interface TestResult {
  testId: string;
  provider: string;
  success: boolean;
  duration: number;
  result: any;
  error?: string;
  metrics?: any;
}

// Export all types for external use
export * from './BackendConfigurationManager';
export * from './BackendMigrationManager';
export * from './BackendHealthMonitor';
