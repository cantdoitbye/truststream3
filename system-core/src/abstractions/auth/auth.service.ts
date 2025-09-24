/**
 * Auth Service - Main authentication service orchestrator
 * Manages auth providers and provides unified access to authentication functionality
 */

import { EventEmitter } from 'events';
import {
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
  Device,
  AuthError
} from '../../shared-utils/auth-interface';
import {
  IAuthProvider,
  AuthProviderEvent,
  AuthMetrics,
  CreateUserData,
  ListUsersOptions,
  ListUsersResult,
  BulkOperationResult,
  AuditLogOptions,
  AuditLogEntry,
  UserDataExport
} from './auth.interface';
import { AuthConfigManager } from './config';
import { AuthProviderFactory } from './providers/provider-factory';

export interface AuthServiceOptions {
  enableMetrics?: boolean;
  enableHealthChecks?: boolean;
  healthCheckInterval?: number;
  retryAttempts?: number;
  retryDelay?: number;
  enableAutoReconnect?: boolean;
  autoReconnectInterval?: number;
}

export class AuthService extends EventEmitter {
  private static instance: AuthService;
  private provider: IAuthProvider | null = null;
  private configManager: AuthConfigManager;
  private providerFactory: AuthProviderFactory;
  private options: AuthServiceOptions;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private metrics: AuthMetrics | null = null;
  private isInitialized = false;

  private constructor(options: AuthServiceOptions = {}) {
    super();
    this.configManager = AuthConfigManager.getInstance();
    this.providerFactory = AuthProviderFactory.getInstance();
    this.options = {
      enableMetrics: true,
      enableHealthChecks: true,
      healthCheckInterval: 30000, // 30 seconds
      retryAttempts: 3,
      retryDelay: 1000,
      enableAutoReconnect: true,
      autoReconnectInterval: 5000,
      ...options
    };
  }

  public static getInstance(options?: AuthServiceOptions): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService(options);
    }
    return AuthService.instance;
  }

  /**
   * Initialize the auth service with configuration
   */
  public async initialize(config: AuthConfig): Promise<void> {
    try {
      // Validate and set configuration
      this.configManager.setConfig(config);
      
      // Create provider
      this.provider = await this.providerFactory.createProvider(config);
      
      // Connect to provider
      await this.provider.connect();
      
      // Setup event listeners
      this.setupProviderEventListeners();
      
      // Start health checks if enabled
      if (this.options.enableHealthChecks) {
        this.startHealthChecks();
      }
      
      // Initialize metrics if enabled
      if (this.options.enableMetrics) {
        await this.initializeMetrics();
      }
      
      this.isInitialized = true;
      
      this.emit('initialized', {
        type: 'PROVIDER_CONNECTED',
        timestamp: new Date(),
        providerId: this.provider.getProviderName()
      } as AuthProviderEvent);
      
    } catch (error) {
      this.handleError('initialize', error);
      throw error;
    }
  }

  /**
   * Disconnect from the auth provider
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.healthCheckTimer) {
        clearInterval(this.healthCheckTimer);
        this.healthCheckTimer = null;
      }
      
      if (this.reconnectTimer) {
        clearInterval(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      
      if (this.provider && this.provider.isConnected()) {
        await this.provider.disconnect();
      }
      
      this.provider = null;
      this.isInitialized = false;
      
      this.emit('disconnected');
      
    } catch (error) {
      this.handleError('disconnect', error);
      throw error;
    }
  }

  /**
   * Check if service is connected and ready
   */
  public isConnected(): boolean {
    return this.isInitialized && !!this.provider && this.provider.isConnected();
  }

  /**
   * Get current provider information
   */
  public getProviderInfo(): { name: string; connected: boolean } | null {
    if (!this.provider) {
      return null;
    }
    
    return {
      name: this.provider.getProviderName(),
      connected: this.provider.isConnected()
    };
  }

  /**
   * Switch to a different auth provider
   */
  public async switchProvider(config: AuthConfig): Promise<void> {
    try {
      // Disconnect current provider
      if (this.provider) {
        await this.provider.disconnect();
      }
      
      // Initialize with new config
      await this.initialize(config);
      
    } catch (error) {
      this.handleError('switchProvider', error);
      throw error;
    }
  }

  /**
   * Perform health check on current provider
   */
  public async healthCheck(): Promise<{ healthy: boolean; provider: string; details?: any }> {
    if (!this.provider) {
      return { healthy: false, provider: 'none' };
    }
    
    try {
      const healthStatus = await this.provider.healthCheck();
      return {
        healthy: healthStatus.status === 'healthy',
        provider: this.provider.getProviderName(),
        details: healthStatus
      };
    } catch (error) {
      return {
        healthy: false,
        provider: this.provider.getProviderName(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Get current metrics
   */
  public getMetrics(): AuthMetrics | null {
    return this.metrics;
  }

  // Auth Service Methods - Delegate to provider with error handling and retries

  public async signUp(credentials: SignUpCredentials): Promise<AuthResult> {
    return this.executeWithRetry(() => this.ensureProvider().signUp(credentials));
  }

  public async signIn(credentials: SignInCredentials): Promise<AuthResult> {
    return this.executeWithRetry(() => this.ensureProvider().signIn(credentials));
  }

  public async signOut(): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().signOut());
  }

  public async signOutEverywhere(): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().signOutEverywhere());
  }

  public async getCurrentUser(): Promise<User | null> {
    return this.executeWithRetry(() => this.ensureProvider().getCurrentUser());
  }

  public async getSession(): Promise<Session | null> {
    return this.executeWithRetry(() => this.ensureProvider().getSession());
  }

  public async refreshSession(): Promise<Session> {
    return this.executeWithRetry(() => this.ensureProvider().refreshSession());
  }

  public async verifySession(token: string): Promise<boolean> {
    return this.executeWithRetry(() => this.ensureProvider().verifySession(token));
  }

  public async resetPassword(email: string): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().resetPassword(email));
  }

  public async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().updatePassword(currentPassword, newPassword));
  }

  public async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().confirmPasswordReset(token, newPassword));
  }

  public async sendEmailVerification(): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().sendEmailVerification());
  }

  public async verifyEmail(token: string): Promise<boolean> {
    return this.executeWithRetry(() => this.ensureProvider().verifyEmail(token));
  }

  public async sendPhoneVerification(phone: string): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().sendPhoneVerification(phone));
  }

  public async verifyPhone(token: string, phone: string): Promise<boolean> {
    return this.executeWithRetry(() => this.ensureProvider().verifyPhone(token, phone));
  }

  public async enableMFA(method: MFAMethod): Promise<MFASetupResult> {
    return this.executeWithRetry(() => this.ensureProvider().enableMFA(method));
  }

  public async verifyMFA(code: string, method?: MFAMethod): Promise<boolean> {
    return this.executeWithRetry(() => this.ensureProvider().verifyMFA(code, method));
  }

  public async disableMFA(): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().disableMFA());
  }

  public async getMFAMethods(): Promise<MFAMethod[]> {
    return this.executeWithRetry(() => this.ensureProvider().getMFAMethods());
  }

  public async signInWithProvider(provider: AuthProvider, options?: ProviderOptions): Promise<AuthResult> {
    return this.executeWithRetry(() => this.ensureProvider().signInWithProvider(provider, options));
  }

  public async linkProvider(provider: AuthProvider): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().linkProvider(provider));
  }

  public async unlinkProvider(provider: AuthProvider): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().unlinkProvider(provider));
  }

  public async getLinkedProviders(): Promise<AuthProvider[]> {
    return this.executeWithRetry(() => this.ensureProvider().getLinkedProviders());
  }

  public async getAccessToken(): Promise<string | null> {
    return this.executeWithRetry(() => this.ensureProvider().getAccessToken());
  }

  public async getRefreshToken(): Promise<string | null> {
    return this.executeWithRetry(() => this.ensureProvider().getRefreshToken());
  }

  public async validateToken(token: string): Promise<TokenValidation> {
    return this.executeWithRetry(() => this.ensureProvider().validateToken(token));
  }

  public async revokeToken(token: string): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().revokeToken(token));
  }

  public async updateProfile(updates: ProfileUpdates): Promise<User> {
    return this.executeWithRetry(() => this.ensureProvider().updateProfile(updates));
  }

  public async uploadAvatar(file: File | Buffer): Promise<string> {
    return this.executeWithRetry(() => this.ensureProvider().uploadAvatar(file));
  }

  public async deleteAccount(): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().deleteAccount());
  }

  public async linkAccount(credentials: SignInCredentials): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().linkAccount(credentials));
  }

  public async unlinkAccount(provider: string): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().unlinkAccount(provider));
  }

  public async getSecurityEvents(): Promise<SecurityEvent[]> {
    return this.executeWithRetry(() => this.ensureProvider().getSecurityEvents());
  }

  public async enableAccountLockout(attempts: number, duration: number): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().enableAccountLockout(attempts, duration));
  }

  public async checkAccountLockout(): Promise<boolean> {
    return this.executeWithRetry(() => this.ensureProvider().checkAccountLockout());
  }

  public async getDevices(): Promise<Device[]> {
    return this.executeWithRetry(() => this.ensureProvider().getDevices());
  }

  public async revokeDevice(deviceId: string): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().revokeDevice(deviceId));
  }

  public async revokeAllDevices(): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().revokeAllDevices());
  }

  // Role and Permission methods
  public async createRole(role: Omit<Role, 'id'>): Promise<Role> {
    return this.executeWithRetry(() => this.ensureProvider().createRole(role));
  }

  public async updateRole(id: string, updates: Partial<Role>): Promise<Role> {
    return this.executeWithRetry(() => this.ensureProvider().updateRole(id, updates));
  }

  public async deleteRole(id: string): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().deleteRole(id));
  }

  public async getRole(id: string): Promise<Role | null> {
    return this.executeWithRetry(() => this.ensureProvider().getRole(id));
  }

  public async listRoles(): Promise<Role[]> {
    return this.executeWithRetry(() => this.ensureProvider().listRoles());
  }

  public async createPermission(permission: Omit<RolePermission, 'id'>): Promise<RolePermission> {
    return this.executeWithRetry(() => this.ensureProvider().createPermission(permission));
  }

  public async updatePermission(id: string, updates: Partial<RolePermission>): Promise<RolePermission> {
    return this.executeWithRetry(() => this.ensureProvider().updatePermission(id, updates));
  }

  public async deletePermission(id: string): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().deletePermission(id));
  }

  public async getPermission(id: string): Promise<RolePermission | null> {
    return this.executeWithRetry(() => this.ensureProvider().getPermission(id));
  }

  public async listPermissions(): Promise<RolePermission[]> {
    return this.executeWithRetry(() => this.ensureProvider().listPermissions());
  }

  public async assignRole(userId: string, roleId: string): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().assignRole(userId, roleId));
  }

  public async removeRole(userId: string, roleId: string): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().removeRole(userId, roleId));
  }

  public async getUserRoles(userId: string): Promise<Role[]> {
    return this.executeWithRetry(() => this.ensureProvider().getUserRoles(userId));
  }

  public async hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    return this.executeWithRetry(() => this.ensureProvider().hasPermission(userId, resource, action));
  }

  public async getUserPermissions(userId: string): Promise<RolePermission[]> {
    return this.executeWithRetry(() => this.ensureProvider().getUserPermissions(userId));
  }

  public async checkPermissions(userId: string, permissions: Array<{resource: string; action: string}>): Promise<boolean[]> {
    return this.executeWithRetry(() => this.ensureProvider().checkPermissions(userId, permissions));
  }

  // Event methods
  public onAuthStateChange(callback: (event: AuthEvent, session: Session | null) => void): () => void {
    return this.ensureProvider().onAuthStateChange(callback);
  }

  public onUserUpdate(callback: (user: User) => void): () => void {
    return this.ensureProvider().onUserUpdate(callback);
  }

  public onSessionExpiry(callback: () => void): () => void {
    return this.ensureProvider().onSessionExpiry(callback);
  }

  public onPasswordChange(callback: (userId: string) => void): () => void {
    return this.ensureProvider().onPasswordChange(callback);
  }

  public onMFAEvent(callback: (event: MFAEvent) => void): () => void {
    return this.ensureProvider().onMFAEvent(callback);
  }

  public onSecurityEvent(callback: (event: SecurityEvent) => void): () => void {
    return this.ensureProvider().onSecurityEvent(callback);
  }

  public async broadcastAuthEvent(event: AuthEvent, data?: any): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().broadcastAuthEvent(event, data));
  }

  public async broadcastSecurityEvent(event: SecurityEvent): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().broadcastSecurityEvent(event));
  }

  // Admin methods
  public async getStats(): Promise<AuthStats> {
    return this.executeWithRetry(() => this.ensureProvider().getStats());
  }

  public async createUser(userData: CreateUserData): Promise<User> {
    return this.executeWithRetry(() => this.ensureProvider().createUser(userData));
  }

  public async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    return this.executeWithRetry(() => this.ensureProvider().updateUser(userId, updates));
  }

  public async deleteUser(userId: string): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().deleteUser(userId));
  }

  public async listUsers(options?: ListUsersOptions): Promise<ListUsersResult> {
    return this.executeWithRetry(() => this.ensureProvider().listUsers(options));
  }

  public async bulkCreateUsers(users: CreateUserData[]): Promise<BulkOperationResult<User>> {
    return this.executeWithRetry(() => this.ensureProvider().bulkCreateUsers(users));
  }

  public async bulkDeleteUsers(userIds: string[]): Promise<BulkOperationResult<void>> {
    return this.executeWithRetry(() => this.ensureProvider().bulkDeleteUsers(userIds));
  }

  public async lockUser(userId: string, reason?: string): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().lockUser(userId, reason));
  }

  public async unlockUser(userId: string): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().unlockUser(userId));
  }

  public async forcePasswordReset(userId: string): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().forcePasswordReset(userId));
  }

  public async getAuditLog(options?: AuditLogOptions): Promise<AuditLogEntry[]> {
    return this.executeWithRetry(() => this.ensureProvider().getAuditLog(options));
  }

  public async exportUserData(userId: string): Promise<UserDataExport> {
    return this.executeWithRetry(() => this.ensureProvider().exportUserData(userId));
  }

  public async deleteUserData(userId: string): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().deleteUserData(userId));
  }

  // Private utility methods

  private ensureProvider(): IAuthProvider {
    if (!this.provider) {
      throw new AuthError('Auth service not initialized. Call initialize() first.', 'SERVICE_NOT_INITIALIZED', 500);
    }
    
    if (!this.provider.isConnected()) {
      throw new AuthError('Auth provider not connected', 'PROVIDER_NOT_CONNECTED', 500);
    }
    
    return this.provider;
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.options.retryAttempts!; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === this.options.retryAttempts) {
          break;
        }
        
        // Check if this is a retryable error
        if (!this.isRetryableError(lastError)) {
          break;
        }
        
        // Wait before retrying
        await this.delay(this.options.retryDelay! * attempt);
        
        // Try to reconnect if provider is disconnected
        if (this.provider && !this.provider.isConnected()) {
          try {
            await this.provider.connect();
          } catch (reconnectError) {
            // Continue to next attempt
          }
        }
      }
    }
    
    throw lastError!;
  }

  private isRetryableError(error: Error): boolean {
    // Retry on connection errors, timeouts, and temporary server errors
    const retryablePatterns = [
      /connection/i,
      /timeout/i,
      /network/i,
      /temporary/i,
      /503/,
      /502/,
      /504/
    ];
    
    return retryablePatterns.some(pattern => pattern.test(error.message));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private setupProviderEventListeners(): void {
    if (!this.provider) return;

    // Listen for auth state changes and forward them
    this.provider.onAuthStateChange((event, session) => {
      this.emit('authStateChange', event, session);
    });

    this.provider.onSecurityEvent((event) => {
      this.emit('securityEvent', event);
    });
  }

  private startHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      try {
        const health = await this.healthCheck();
        
        if (!health.healthy && this.options.enableAutoReconnect) {
          this.attemptReconnect();
        }
        
        this.emit('healthCheck', health);
      } catch (error) {
        this.emit('healthCheckError', error);
      }
    }, this.options.healthCheckInterval);
  }

  private attemptReconnect(): void {
    if (this.reconnectTimer) {
      return; // Already attempting reconnect
    }

    this.reconnectTimer = setInterval(async () => {
      try {
        if (this.provider && !this.provider.isConnected()) {
          await this.provider.connect();
          
          if (this.provider.isConnected()) {
            clearInterval(this.reconnectTimer!);
            this.reconnectTimer = null;
            this.emit('reconnected');
          }
        }
      } catch (error) {
        this.emit('reconnectError', error);
      }
    }, this.options.autoReconnectInterval);
  }

  private async initializeMetrics(): Promise<void> {
    if (!this.provider) return;

    try {
      const stats = await this.provider.getStats();
      
      this.metrics = {
        providerName: this.provider.getProviderName(),
        timestamp: new Date(),
        metrics: {
          activeUsers: stats.activeUsers,
          totalSessions: 0, // Would need to be implemented in providers
          signInsPerHour: stats.signInsToday,
          signUpsPerHour: stats.signUpsToday,
          errorRate: 0,
          averageResponseTime: 0
        }
      };
    } catch (error) {
      console.warn('Failed to initialize metrics:', error);
    }
  }

  private handleError(operation: string, error: any): void {
    const authError = error instanceof AuthError ? error : 
      new AuthError(`Auth service ${operation} failed`, 'SERVICE_ERROR', 500, error);
    
    this.emit('error', authError);
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  public static reset(): void {
    if (AuthService.instance) {
      AuthService.instance.removeAllListeners();
      AuthService.instance = null as any;
    }
  }
}

// Default export for easy access
export const authService = AuthService.getInstance();
