/**
 * Backend Abstraction Layer - Main Export File
 * Provides unified exports for all backend abstraction components
 */

// Core Backend Manager
export { BackendManager, backendManager } from './backend-manager/BackendManager';
export { BackendConfigurationManager } from './backend-manager/BackendConfigurationManager';
export { BackendMigrationManager } from './backend-manager/BackendMigrationManager';
export { BackendHealthMonitor } from './backend-manager/BackendHealthMonitor';
export { BackendConfigurationTemplates } from './backend-manager/BackendConfigurationTemplates';
export { BackendAbstractionTestingFramework } from './backend-manager/BackendTestingFramework';

// Unified Services
export { UnifiedDatabaseService } from './database/UnifiedDatabaseService';
export { UnifiedAuthService } from './auth/UnifiedAuthService';
export { UnifiedStorageService } from './storage/UnifiedStorageService';
export { UnifiedRealTimeService } from './realtime/UnifiedRealTimeService';
export { UnifiedEdgeFunctionService } from './edge-functions/UnifiedEdgeFunctionService';
export { UnifiedAIService } from './ai/UnifiedAIService';

// Database Providers
export { DatabaseProviderFactory } from './database/providers/DatabaseProviderFactory';
export { BaseDatabaseProvider } from './database/providers/BaseDatabaseProvider';
export { MongoDBDatabaseProvider } from './database/providers/MongoDBDatabaseProvider';

// Auth Providers
export { AuthProviderFactory } from './auth/providers/AuthProviderFactory';
export { BaseAuthProvider } from './auth/auth.interface';

// Storage Providers
export { StorageProviderFactory } from './storage/providers/StorageProviderFactory';
export { BaseStorageProvider } from './storage/storage.interface';

// AI Providers
export { AIProviderFactory } from './ai/providers/provider-factory';
export { BaseAIProvider } from './ai/ai.interface';

// Types and Interfaces
export * from './backend-manager/types';
export * from './auth/auth.interface';
export * from './storage/storage.interface';
export * from './realtime/UnifiedRealTimeService';
export * from './edge-functions/UnifiedEdgeFunctionService';
export * from './ai/ai.interface';

// Shared Utilities
export * from '../shared-utils/database-interface';
export * from '../shared-utils/auth-interface';
export * from '../shared-utils/storage-interface';

/**
 * Quick Start Helper Functions
 */

import { BackendManager } from './backend-manager/BackendManager';
import { BackendConfigurationTemplates } from './backend-manager/BackendConfigurationTemplates';
import { BackendConfiguration } from './backend-manager/types';

/**
 * Initialize backend with development configuration
 */
export async function initializeDevelopmentBackend(): Promise<BackendManager> {
  const config = BackendConfigurationTemplates.getDevelopmentConfiguration();
  const manager = BackendManager.getInstance();
  await manager.initialize(config);
  return manager;
}

/**
 * Initialize backend with production configuration
 */
export async function initializeProductionBackend(): Promise<BackendManager> {
  const config = BackendConfigurationTemplates.getProductionConfiguration();
  const manager = BackendManager.getInstance();
  await manager.initialize(config);
  return manager;
}

/**
 * Initialize backend with high availability configuration
 */
export async function initializeHighAvailabilityBackend(): Promise<BackendManager> {
  const config = BackendConfigurationTemplates.getHighAvailabilityConfiguration();
  const manager = BackendManager.getInstance();
  await manager.initialize(config);
  return manager;
}

/**
 * Initialize backend with custom configuration
 */
export async function initializeCustomBackend(config: BackendConfiguration): Promise<BackendManager> {
  const manager = BackendManager.getInstance();
  await manager.initialize(config);
  return manager;
}

/**
 * Switch backend provider with zero downtime
 */
export async function switchBackendProvider(
  targetProvider: string,
  options?: {
    preserveData?: boolean;
    verifyIntegrity?: boolean;
    migrationStrategy?: 'immediate' | 'gradual' | 'blue-green';
  }
): Promise<void> {
  const manager = BackendManager.getInstance();
  await manager.switchProvider(targetProvider, {
    preserveData: options?.preserveData ?? true,
    verifyIntegrity: options?.verifyIntegrity ?? true,
    migrationStrategy: options?.migrationStrategy ?? 'immediate'
  });
}

/**
 * Get backend status and health information
 */
export async function getBackendStatus() {
  const manager = BackendManager.getInstance();
  return await manager.getBackendStatus();
}

/**
 * Test backend provider compatibility
 */
export async function testProviderCompatibility(providerName: string) {
  const manager = BackendManager.getInstance();
  return await manager.testProvider(providerName);
}

/**
 * Create a comprehensive testing framework instance
 */
export function createTestingFramework(options?: {
  enablePerformanceTesting?: boolean;
  enableLoadTesting?: boolean;
  enableMigrationTesting?: boolean;
  testDataSize?: 'small' | 'medium' | 'large';
}) {
  return new (require('./backend-manager/BackendTestingFramework').BackendAbstractionTestingFramework)(options);
}

/**
 * Utility function to validate backend configuration
 */
export async function validateBackendConfiguration(config: BackendConfiguration): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}> {
  const configManager = new (require('./backend-manager/BackendConfigurationManager').BackendConfigurationManager)();
  return await configManager.validateConfiguration(config);
}

/**
 * Export version information
 */
export const VERSION = '1.0.0';
export const COMPATIBLE_VERSIONS = ['4.1', '4.2'];

/**
 * Export configuration templates for easy access
 */
export const ConfigurationTemplates = {
  development: BackendConfigurationTemplates.getDevelopmentConfiguration,
  production: BackendConfigurationTemplates.getProductionConfiguration,
  highAvailability: BackendConfigurationTemplates.getHighAvailabilityConfiguration,
  multiCloud: BackendConfigurationTemplates.getMultiCloudConfiguration,
  edge: BackendConfigurationTemplates.getEdgeConfiguration
};

/**
 * Default export for convenience
 */
const BackendAbstraction = {
  BackendManager,
  ConfigurationTemplates,
  initializeDevelopmentBackend,
  initializeProductionBackend,
  initializeHighAvailabilityBackend,
  initializeCustomBackend,
  switchBackendProvider,
  getBackendStatus,
  testProviderCompatibility,
  createTestingFramework,
  validateBackendConfiguration,
  VERSION,
  COMPATIBLE_VERSIONS
};

export default BackendAbstraction;
