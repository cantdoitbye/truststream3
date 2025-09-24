/**
 * Abstraction Layer Foundation - Main Export Index
 * 
 * This module provides the foundational abstraction layer components for TrustStream v4.2
 * Implements Phase 1 of the abstraction layers design to reduce Supabase dependencies
 */

// Service Container - Dependency Injection Framework
export * from './service-container';

// Database Abstraction Layer
export * from './database-interface';

// Authentication Abstraction Layer
export * from './auth-interface';

// Storage Abstraction Layer
export * from './storage-interface';

// Configuration Management
export * from './config-manager';

// Re-export commonly used types and utilities
export type {
  // Service Container Types
  ServiceToken,
  ServiceFactory,
  IServiceContainer,
  
  // Database Types
  IDatabaseService,
  IQueryBuilder,
  IRepository,
  QueryOptions,
  DatabaseConfig,
  
  // Auth Types
  IAuthService,
  IRoleService,
  IAuthEventService,
  User,
  Session,
  AuthConfig,
  
  // Storage Types
  IStorageService,
  IBucketService,
  IStorageEventService,
  FileInfo,
  UploadResult,
  StorageConfig,
  
  // Configuration Types
  IConfigurationManager,
  AppConfiguration,
  ServiceConfiguration,
  Environment
} from './service-container';

// Export service tokens for dependency injection
export { SERVICE_TOKENS } from './service-container';

// Export utility functions
export {
  getContainer,
  resolve,
  Inject
} from './service-container';

export {
  createQueryBuilder
} from './database-interface';

export {
  isTokenExpired,
  parseJWT,
  validatePasswordPolicy,
  generateSecurePassword
} from './auth-interface';

export {
  getMimeType,
  formatFileSize,
  validateFileName,
  generateUniqueFileName,
  StoragePath
} from './storage-interface';

export {
  getConfigurationManager,
  loadConfiguration,
  getConfig,
  setConfig,
  isFeatureEnabled,
  getEnvironment
} from './config-manager';

// Export error classes
export {
  DatabaseError,
  ConnectionError,
  QueryError,
  TransactionError,
  SchemaError
} from './database-interface';

export {
  AuthError,
  AuthenticationError,
  AuthorizationError,
  TokenExpiredError,
  InvalidCredentialsError,
  AccountLockedError,
  MFARequiredError
} from './auth-interface';

export {
  StorageError,
  FileNotFoundError,
  BucketNotFoundError,
  InsufficientStorageError,
  FileTooLargeError,
  InvalidFileTypeError,
  UploadFailedError,
  DownloadFailedError
} from './storage-interface';

export {
  ConfigurationError
} from './config-manager';
