/**
 * Auth Abstraction Layer Interface
 * Extends the core auth interfaces with provider-specific functionality
 */

import {
  IAuthService,
  IRoleService,
  IAuthEventService,
  AuthConfig,
  User,
  Session,
  AuthResult,
  SignUpCredentials,
  SignInCredentials,
  AuthEvent,
  SecurityEvent,
  MFAEvent,
  AuthStats,
  TokenValidation,
  ProfileUpdates,
  MFASetupResult,
  AuthProvider,
  ProviderOptions,
  MFAMethod,
  Role,
  RolePermission,
  Device
} from '../../shared-utils/auth-interface';

// Provider-specific interfaces
export interface IAuthProvider extends IAuthService, IRoleService, IAuthEventService {
  // Provider lifecycle
  initialize(config: AuthConfig): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getProviderName(): string;
  
  // Health and monitoring
  healthCheck(): Promise<ProviderHealthStatus>;
  getStats(): Promise<AuthStats>;
  
  // Admin operations
  createUser(userData: CreateUserData): Promise<User>;
  updateUser(userId: string, updates: Partial<User>): Promise<User>;
  deleteUser(userId: string): Promise<void>;
  listUsers(options?: ListUsersOptions): Promise<ListUsersResult>;
  
  // Bulk operations
  bulkCreateUsers(users: CreateUserData[]): Promise<BulkOperationResult<User>>;
  bulkDeleteUsers(userIds: string[]): Promise<BulkOperationResult<void>>;
  
  // Advanced security
  lockUser(userId: string, reason?: string): Promise<void>;
  unlockUser(userId: string): Promise<void>;
  forcePasswordReset(userId: string): Promise<void>;
  
  // Audit and compliance
  getAuditLog(options?: AuditLogOptions): Promise<AuditLogEntry[]>;
  exportUserData(userId: string): Promise<UserDataExport>;
  deleteUserData(userId: string): Promise<void>; // GDPR compliance
}

export interface ProviderHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastChecked: Date;
  responseTime?: number;
  errors?: string[];
  metrics?: {
    activeConnections: number;
    avgResponseTime: number;
    errorRate: number;
    uptime: number;
  };
}

export interface CreateUserData {
  email: string;
  password?: string;
  phone?: string;
  name?: string;
  emailConfirmed?: boolean;
  phoneConfirmed?: boolean;
  roles?: string[];
  metadata?: Record<string, any>;
}

export interface ListUsersOptions {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'lastSignInAt' | 'email' | 'name';
  sortOrder?: 'asc' | 'desc';
  filter?: {
    email?: string;
    emailConfirmed?: boolean;
    roles?: string[];
    createdAfter?: Date;
    createdBefore?: Date;
    lastSignInAfter?: Date;
    lastSignInBefore?: Date;
  };
}

export interface ListUsersResult {
  users: User[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface BulkOperationResult<T> {
  successful: T[];
  failed: Array<{
    data: any;
    error: string;
  }>;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
}

export interface AuditLogOptions {
  userId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId?: string;
  action: string;
  resource?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface UserDataExport {
  profile: User;
  sessions: Session[];
  securityEvents: SecurityEvent[];
  devices: Device[];
  metadata: {
    exportedAt: Date;
    exportedBy: string;
    dataVersion: string;
  };
}

// Auth configuration with provider-specific options
export interface AuthProviderConfig extends AuthConfig {
  connectionPool?: {
    min?: number;
    max?: number;
    acquireTimeoutMillis?: number;
    createTimeoutMillis?: number;
    destroyTimeoutMillis?: number;
    idleTimeoutMillis?: number;
    reapIntervalMillis?: number;
    createRetryIntervalMillis?: number;
  };
  cache?: {
    enabled: boolean;
    ttl?: number;
    maxSize?: number;
    strategy?: 'memory' | 'redis' | 'memcached';
  };
  security?: {
    enableRateLimiting?: boolean;
    maxLoginAttempts?: number;
    lockoutDuration?: number;
    enableAuditLog?: boolean;
    enableSecurityHeaders?: boolean;
  };
  monitoring?: {
    enableMetrics?: boolean;
    enableHealthChecks?: boolean;
    healthCheckInterval?: number;
  };
}

// Event types for the auth abstraction layer
export interface AuthProviderEvent {
  type: 'PROVIDER_CONNECTED' | 'PROVIDER_DISCONNECTED' | 'PROVIDER_ERROR' | 'PROVIDER_HEALTH_CHANGED';
  timestamp: Date;
  providerId: string;
  data?: any;
  error?: Error;
}

export interface AuthMetrics {
  providerName: string;
  timestamp: Date;
  metrics: {
    activeUsers: number;
    totalSessions: number;
    signInsPerHour: number;
    signUpsPerHour: number;
    errorRate: number;
    averageResponseTime: number;
    cacheHitRate?: number;
  };
}

// Abstract base class for auth providers
export abstract class BaseAuthProvider implements IAuthProvider {
  protected config: AuthProviderConfig | null = null;
  protected connected = false;
  protected healthStatus: ProviderHealthStatus = {
    status: 'unhealthy',
    lastChecked: new Date()
  };

  abstract getProviderName(): string;
  abstract initialize(config: AuthConfig): Promise<void>;
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;

  public isConnected(): boolean {
    return this.connected;
  }

  public async healthCheck(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();
    
    try {
      await this.performHealthCheck();
      const responseTime = Date.now() - startTime;
      
      this.healthStatus = {
        status: 'healthy',
        lastChecked: new Date(),
        responseTime
      };
    } catch (error) {
      this.healthStatus = {
        status: 'unhealthy',
        lastChecked: new Date(),
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
    
    return this.healthStatus;
  }

  protected abstract performHealthCheck(): Promise<void>;

  // Abstract methods that must be implemented by concrete providers
  abstract signUp(credentials: SignUpCredentials): Promise<AuthResult>;
  abstract signIn(credentials: SignInCredentials): Promise<AuthResult>;
  abstract signOut(): Promise<void>;
  abstract signOutEverywhere(): Promise<void>;
  abstract getCurrentUser(): Promise<User | null>;
  abstract getSession(): Promise<Session | null>;
  abstract refreshSession(): Promise<Session>;
  abstract verifySession(token: string): Promise<boolean>;
  abstract resetPassword(email: string): Promise<void>;
  abstract updatePassword(currentPassword: string, newPassword: string): Promise<void>;
  abstract confirmPasswordReset(token: string, newPassword: string): Promise<void>;
  abstract sendEmailVerification(): Promise<void>;
  abstract verifyEmail(token: string): Promise<boolean>;
  abstract sendPhoneVerification(phone: string): Promise<void>;
  abstract verifyPhone(token: string, phone: string): Promise<boolean>;
  abstract enableMFA(method: MFAMethod): Promise<MFASetupResult>;
  abstract verifyMFA(code: string, method?: MFAMethod): Promise<boolean>;
  abstract disableMFA(): Promise<void>;
  abstract getMFAMethods(): Promise<MFAMethod[]>;
  abstract signInWithProvider(provider: AuthProvider, options?: ProviderOptions): Promise<AuthResult>;
  abstract linkProvider(provider: AuthProvider): Promise<void>;
  abstract unlinkProvider(provider: AuthProvider): Promise<void>;
  abstract getLinkedProviders(): Promise<AuthProvider[]>;
  abstract getAccessToken(): Promise<string | null>;
  abstract getRefreshToken(): Promise<string | null>;
  abstract validateToken(token: string): Promise<TokenValidation>;
  abstract revokeToken(token: string): Promise<void>;
  abstract updateProfile(updates: ProfileUpdates): Promise<User>;
  abstract uploadAvatar(file: File | Buffer): Promise<string>;
  abstract deleteAccount(): Promise<void>;
  abstract linkAccount(credentials: SignInCredentials): Promise<void>;
  abstract unlinkAccount(provider: string): Promise<void>;
  abstract getSecurityEvents(): Promise<SecurityEvent[]>;
  abstract enableAccountLockout(attempts: number, duration: number): Promise<void>;
  abstract checkAccountLockout(): Promise<boolean>;
  abstract getDevices(): Promise<Device[]>;
  abstract revokeDevice(deviceId: string): Promise<void>;
  abstract revokeAllDevices(): Promise<void>;
  abstract createRole(role: Omit<Role, 'id'>): Promise<Role>;
  abstract updateRole(id: string, updates: Partial<Role>): Promise<Role>;
  abstract deleteRole(id: string): Promise<void>;
  abstract getRole(id: string): Promise<Role | null>;
  abstract listRoles(): Promise<Role[]>;
  abstract createPermission(permission: Omit<RolePermission, 'id'>): Promise<RolePermission>;
  abstract updatePermission(id: string, updates: Partial<RolePermission>): Promise<RolePermission>;
  abstract deletePermission(id: string): Promise<void>;
  abstract getPermission(id: string): Promise<RolePermission | null>;
  abstract listPermissions(): Promise<RolePermission[]>;
  abstract assignRole(userId: string, roleId: string): Promise<void>;
  abstract removeRole(userId: string, roleId: string): Promise<void>;
  abstract getUserRoles(userId: string): Promise<Role[]>;
  abstract hasPermission(userId: string, resource: string, action: string): Promise<boolean>;
  abstract getUserPermissions(userId: string): Promise<RolePermission[]>;
  abstract checkPermissions(userId: string, permissions: Array<{resource: string; action: string}>): Promise<boolean[]>;
  abstract onAuthStateChange(callback: (event: AuthEvent, session: Session | null) => void): () => void;
  abstract onUserUpdate(callback: (user: User) => void): () => void;
  abstract onSessionExpiry(callback: () => void): () => void;
  abstract onPasswordChange(callback: (userId: string) => void): () => void;
  abstract onMFAEvent(callback: (event: MFAEvent) => void): () => void;
  abstract onSecurityEvent(callback: (event: SecurityEvent) => void): () => void;
  abstract broadcastAuthEvent(event: AuthEvent, data?: any): Promise<void>;
  abstract broadcastSecurityEvent(event: SecurityEvent): Promise<void>;
  abstract getStats(): Promise<AuthStats>;
  abstract createUser(userData: CreateUserData): Promise<User>;
  abstract updateUser(userId: string, updates: Partial<User>): Promise<User>;
  abstract deleteUser(userId: string): Promise<void>;
  abstract listUsers(options?: ListUsersOptions): Promise<ListUsersResult>;
  abstract bulkCreateUsers(users: CreateUserData[]): Promise<BulkOperationResult<User>>;
  abstract bulkDeleteUsers(userIds: string[]): Promise<BulkOperationResult<void>>;
  abstract lockUser(userId: string, reason?: string): Promise<void>;
  abstract unlockUser(userId: string): Promise<void>;
  abstract forcePasswordReset(userId: string): Promise<void>;
  abstract getAuditLog(options?: AuditLogOptions): Promise<AuditLogEntry[]>;
  abstract exportUserData(userId: string): Promise<UserDataExport>;
  abstract deleteUserData(userId: string): Promise<void>;
}

// Re-export all types from shared-utils for convenience
export * from '../../shared-utils/auth-interface';
