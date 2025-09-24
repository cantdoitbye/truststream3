/**
 * Supabase Authentication Provider
 * Implements the auth abstraction layer using Supabase Auth
 */

import { createClient, SupabaseClient, AuthError as SupabaseAuthError } from '@supabase/supabase-js';
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
  AuthError,
  AuthenticationError,
  InvalidCredentialsError,
  TokenExpiredError,
  MFARequiredError
} from '../../../shared-utils/auth-interface';
import {
  BaseAuthProvider,
  ProviderHealthStatus,
  CreateUserData,
  ListUsersOptions,
  ListUsersResult,
  BulkOperationResult,
  AuditLogOptions,
  AuditLogEntry,
  UserDataExport
} from '../auth.interface';

export class SupabaseAuthProvider extends BaseAuthProvider {
  private client: SupabaseClient | null = null;
  private eventListeners: Map<string, Function[]> = new Map();

  public getProviderName(): string {
    return 'supabase';
  }

  public async initialize(config: AuthConfig): Promise<void> {
    if (config.type !== 'supabase' || !config.supabase) {
      throw new Error('Invalid Supabase configuration');
    }

    const { url, anonKey } = config.supabase;
    
    this.client = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });

    this.config = config;
    this.setupEventListeners();
  }

  public async connect(): Promise<void> {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      // Test the connection by attempting to get the session
      await this.client.auth.getSession();
      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw new AuthError('Failed to connect to Supabase', 'CONNECTION_FAILED', 500, error);
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.auth.signOut();
      this.connected = false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }
    
    // Test connection by getting session
    await this.client.auth.getSession();
  }

  // Authentication methods
  public async signUp(credentials: SignUpCredentials): Promise<AuthResult> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const { data, error } = await this.client.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        phone: credentials.phone,
        options: {
          emailRedirectTo: credentials.options?.emailRedirectTo,
          data: credentials.options?.data || credentials.metadata
        }
      });

      if (error) {
        throw this.mapSupabaseError(error);
      }

      return {
        user: data.user ? this.mapSupabaseUser(data.user) : null,
        session: data.session ? this.mapSupabaseSession(data.session) : null
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Sign up failed', 'SIGNUP_FAILED', 400, error);
    }
  }

  public async signIn(credentials: SignInCredentials): Promise<AuthResult> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email: credentials.email!,
        password: credentials.password
      });

      if (error) {
        throw this.mapSupabaseError(error);
      }

      return {
        user: data.user ? this.mapSupabaseUser(data.user) : null,
        session: data.session ? this.mapSupabaseSession(data.session) : null
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Sign in failed', 'SIGNIN_FAILED', 400, error);
    }
  }

  public async signOut(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const { error } = await this.client.auth.signOut();
    if (error) {
      throw this.mapSupabaseError(error);
    }
  }

  public async signOutEverywhere(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const { error } = await this.client.auth.signOut({ scope: 'global' });
    if (error) {
      throw this.mapSupabaseError(error);
    }
  }

  // Session management
  public async getCurrentUser(): Promise<User | null> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const { data: { user }, error } = await this.client.auth.getUser();
    
    if (error) {
      throw this.mapSupabaseError(error);
    }

    return user ? this.mapSupabaseUser(user) : null;
  }

  public async getSession(): Promise<Session | null> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const { data: { session }, error } = await this.client.auth.getSession();
    
    if (error) {
      throw this.mapSupabaseError(error);
    }

    return session ? this.mapSupabaseSession(session) : null;
  }

  public async refreshSession(): Promise<Session> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const { data, error } = await this.client.auth.refreshSession();
    
    if (error) {
      throw this.mapSupabaseError(error);
    }

    if (!data.session) {
      throw new TokenExpiredError('Failed to refresh session');
    }

    return this.mapSupabaseSession(data.session);
  }

  public async verifySession(token: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const { data, error } = await this.client.auth.getUser(token);
      return !error && !!data.user;
    } catch {
      return false;
    }
  }

  // Password management
  public async resetPassword(email: string): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const { error } = await this.client.auth.resetPasswordForEmail(email);
    if (error) {
      throw this.mapSupabaseError(error);
    }
  }

  public async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const { error } = await this.client.auth.updateUser({
      password: newPassword
    });

    if (error) {
      throw this.mapSupabaseError(error);
    }
  }

  public async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const { error } = await this.client.auth.verifyOtp({
      token_hash: token,
      type: 'recovery'
    });

    if (error) {
      throw this.mapSupabaseError(error);
    }

    await this.updatePassword('', newPassword);
  }

  // Email verification
  public async sendEmailVerification(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const { data: { user } } = await this.client.auth.getUser();
    if (!user?.email) {
      throw new AuthError('No email associated with current user', 'NO_EMAIL', 400);
    }

    const { error } = await this.client.auth.resend({
      type: 'signup',
      email: user.email
    });

    if (error) {
      throw this.mapSupabaseError(error);
    }
  }

  public async verifyEmail(token: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const { error } = await this.client.auth.verifyOtp({
        token_hash: token,
        type: 'email'
      });

      return !error;
    } catch {
      return false;
    }
  }

  // Phone verification
  public async sendPhoneVerification(phone: string): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const { error } = await this.client.auth.signInWithOtp({
      phone: phone
    });

    if (error) {
      throw this.mapSupabaseError(error);
    }
  }

  public async verifyPhone(token: string, phone: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const { error } = await this.client.auth.verifyOtp({
        phone: phone,
        token: token,
        type: 'sms'
      });

      return !error;
    } catch {
      return false;
    }
  }

  // Placeholder implementations for MFA (Supabase doesn't have full MFA support yet)
  public async enableMFA(method: MFAMethod): Promise<MFASetupResult> {
    throw new AuthError('MFA not yet supported by Supabase provider', 'MFA_NOT_SUPPORTED', 501);
  }

  public async verifyMFA(code: string, method?: MFAMethod): Promise<boolean> {
    throw new AuthError('MFA not yet supported by Supabase provider', 'MFA_NOT_SUPPORTED', 501);
  }

  public async disableMFA(): Promise<void> {
    throw new AuthError('MFA not yet supported by Supabase provider', 'MFA_NOT_SUPPORTED', 501);
  }

  public async getMFAMethods(): Promise<MFAMethod[]> {
    return [];
  }

  // Social authentication
  public async signInWithProvider(provider: AuthProvider, options?: ProviderOptions): Promise<AuthResult> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const { data, error } = await this.client.auth.signInWithOAuth({
      provider: provider.name as any,
      options: {
        redirectTo: options?.redirectTo,
        scopes: options?.scopes?.join(' '),
        queryParams: options?.queryParams
      }
    });

    if (error) {
      throw this.mapSupabaseError(error);
    }

    // OAuth returns URL for redirect, actual user/session comes via callback
    return {
      user: null,
      session: null
    };
  }

  public async linkProvider(provider: AuthProvider): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const { error } = await this.client.auth.linkIdentity({
      provider: provider.name as any
    });

    if (error) {
      throw this.mapSupabaseError(error);
    }
  }

  public async unlinkProvider(provider: AuthProvider): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const { error } = await this.client.auth.unlinkIdentity({
      provider: provider.name as any
    });

    if (error) {
      throw this.mapSupabaseError(error);
    }
  }

  public async getLinkedProviders(): Promise<AuthProvider[]> {
    const user = await this.getCurrentUser();
    // This would need to be implemented based on Supabase's identity linking
    return [];
  }

  // Token management
  public async getAccessToken(): Promise<string | null> {
    const session = await this.getSession();
    return session?.accessToken || null;
  }

  public async getRefreshToken(): Promise<string | null> {
    const session = await this.getSession();
    return session?.refreshToken || null;
  }

  public async validateToken(token: string): Promise<TokenValidation> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const { data, error } = await this.client.auth.getUser(token);
      
      if (error || !data.user) {
        return {
          valid: false,
          error: error?.message || 'Invalid token'
        };
      }

      return {
        valid: true,
        user: this.mapSupabaseUser(data.user)
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Token validation failed'
      };
    }
  }

  public async revokeToken(token: string): Promise<void> {
    // Supabase doesn't have explicit token revocation, use sign out
    await this.signOut();
  }

  // User profile
  public async updateProfile(updates: ProfileUpdates): Promise<User> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const { data, error } = await this.client.auth.updateUser({
      phone: updates.phone,
      data: {
        name: updates.name,
        avatar_url: updates.avatarUrl,
        ...updates.metadata
      }
    });

    if (error) {
      throw this.mapSupabaseError(error);
    }

    if (!data.user) {
      throw new AuthError('Failed to update profile', 'UPDATE_FAILED', 400);
    }

    return this.mapSupabaseUser(data.user);
  }

  public async uploadAvatar(file: File | Buffer): Promise<string> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const user = await this.getCurrentUser();
    if (!user) {
      throw new AuthError('No authenticated user', 'NOT_AUTHENTICATED', 401);
    }

    const fileName = `avatar-${user.id}-${Date.now()}`;
    const { data, error } = await this.client.storage
      .from('avatars')
      .upload(fileName, file);

    if (error) {
      throw new AuthError('Avatar upload failed', 'UPLOAD_FAILED', 400, error);
    }

    const { data: { publicUrl } } = this.client.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return publicUrl;
  }

  public async deleteAccount(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    // This would need to be implemented as an RPC call or admin function
    throw new AuthError('Account deletion not implemented', 'NOT_IMPLEMENTED', 501);
  }

  // Utility methods for mapping Supabase types to our interfaces
  private mapSupabaseUser(user: any): User {
    return {
      id: user.id,
      email: user.email || '',
      emailConfirmed: !!user.email_confirmed_at,
      phone: user.phone,
      phoneConfirmed: !!user.phone_confirmed_at,
      name: user.user_metadata?.name || user.user_metadata?.full_name,
      avatarUrl: user.user_metadata?.avatar_url,
      metadata: user.user_metadata || {},
      roles: user.app_metadata?.roles || [],
      permissions: user.app_metadata?.permissions || [],
      createdAt: new Date(user.created_at),
      updatedAt: new Date(user.updated_at),
      lastSignInAt: user.last_sign_in_at ? new Date(user.last_sign_in_at) : undefined
    };
  }

  private mapSupabaseSession(session: any): Session {
    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: new Date(session.expires_at * 1000),
      user: this.mapSupabaseUser(session.user),
      tokenType: session.token_type,
      scope: session.scope?.split(' ') || []
    };
  }

  private mapSupabaseError(error: SupabaseAuthError): AuthError {
    switch (error.message.toLowerCase()) {
      case 'invalid login credentials':
        return new InvalidCredentialsError();
      case 'email not confirmed':
        return new AuthError('Email not confirmed', 'EMAIL_NOT_CONFIRMED', 400);
      case 'signup disabled':
        return new AuthError('Sign up is disabled', 'SIGNUP_DISABLED', 403);
      default:
        return new AuthError(error.message, 'SUPABASE_ERROR', 400, error);
    }
  }

  private setupEventListeners(): void {
    if (!this.client) return;

    this.client.auth.onAuthStateChange((event, session) => {
      const authEvent: AuthEvent = {
        type: event.toUpperCase() as any,
        timestamp: new Date(),
        userId: session?.user?.id,
        sessionId: session?.access_token
      };

      this.broadcastAuthEvent(authEvent, session);
    });
  }

  // Placeholder implementations for methods not fully supported by Supabase
  public async linkAccount(credentials: SignInCredentials): Promise<void> {
    throw new AuthError('Account linking not implemented', 'NOT_IMPLEMENTED', 501);
  }

  public async unlinkAccount(provider: string): Promise<void> {
    throw new AuthError('Account unlinking not implemented', 'NOT_IMPLEMENTED', 501);
  }

  public async getSecurityEvents(): Promise<SecurityEvent[]> {
    return [];
  }

  public async enableAccountLockout(attempts: number, duration: number): Promise<void> {
    throw new AuthError('Account lockout not implemented', 'NOT_IMPLEMENTED', 501);
  }

  public async checkAccountLockout(): Promise<boolean> {
    return false;
  }

  public async getDevices(): Promise<Device[]> {
    return [];
  }

  public async revokeDevice(deviceId: string): Promise<void> {
    throw new AuthError('Device management not implemented', 'NOT_IMPLEMENTED', 501);
  }

  public async revokeAllDevices(): Promise<void> {
    throw new AuthError('Device management not implemented', 'NOT_IMPLEMENTED', 501);
  }

  // Role and permission methods (would need custom implementation)
  public async createRole(role: Omit<Role, 'id'>): Promise<Role> {
    throw new AuthError('Role management not implemented', 'NOT_IMPLEMENTED', 501);
  }

  public async updateRole(id: string, updates: Partial<Role>): Promise<Role> {
    throw new AuthError('Role management not implemented', 'NOT_IMPLEMENTED', 501);
  }

  public async deleteRole(id: string): Promise<void> {
    throw new AuthError('Role management not implemented', 'NOT_IMPLEMENTED', 501);
  }

  public async getRole(id: string): Promise<Role | null> {
    return null;
  }

  public async listRoles(): Promise<Role[]> {
    return [];
  }

  public async createPermission(permission: Omit<RolePermission, 'id'>): Promise<RolePermission> {
    throw new AuthError('Permission management not implemented', 'NOT_IMPLEMENTED', 501);
  }

  public async updatePermission(id: string, updates: Partial<RolePermission>): Promise<RolePermission> {
    throw new AuthError('Permission management not implemented', 'NOT_IMPLEMENTED', 501);
  }

  public async deletePermission(id: string): Promise<void> {
    throw new AuthError('Permission management not implemented', 'NOT_IMPLEMENTED', 501);
  }

  public async getPermission(id: string): Promise<RolePermission | null> {
    return null;
  }

  public async listPermissions(): Promise<RolePermission[]> {
    return [];
  }

  public async assignRole(userId: string, roleId: string): Promise<void> {
    throw new AuthError('Role assignment not implemented', 'NOT_IMPLEMENTED', 501);
  }

  public async removeRole(userId: string, roleId: string): Promise<void> {
    throw new AuthError('Role removal not implemented', 'NOT_IMPLEMENTED', 501);
  }

  public async getUserRoles(userId: string): Promise<Role[]> {
    return [];
  }

  public async hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    return false;
  }

  public async getUserPermissions(userId: string): Promise<RolePermission[]> {
    return [];
  }

  public async checkPermissions(userId: string, permissions: Array<{resource: string; action: string}>): Promise<boolean[]> {
    return permissions.map(() => false);
  }

  // Event methods
  public onAuthStateChange(callback: (event: AuthEvent, session: Session | null) => void): () => void {
    const listeners = this.eventListeners.get('authStateChange') || [];
    listeners.push(callback);
    this.eventListeners.set('authStateChange', listeners);

    return () => {
      const currentListeners = this.eventListeners.get('authStateChange') || [];
      const index = currentListeners.indexOf(callback);
      if (index > -1) {
        currentListeners.splice(index, 1);
      }
    };
  }

  public onUserUpdate(callback: (user: User) => void): () => void {
    const listeners = this.eventListeners.get('userUpdate') || [];
    listeners.push(callback);
    this.eventListeners.set('userUpdate', listeners);

    return () => {
      const currentListeners = this.eventListeners.get('userUpdate') || [];
      const index = currentListeners.indexOf(callback);
      if (index > -1) {
        currentListeners.splice(index, 1);
      }
    };
  }

  public onSessionExpiry(callback: () => void): () => void {
    const listeners = this.eventListeners.get('sessionExpiry') || [];
    listeners.push(callback);
    this.eventListeners.set('sessionExpiry', listeners);

    return () => {
      const currentListeners = this.eventListeners.get('sessionExpiry') || [];
      const index = currentListeners.indexOf(callback);
      if (index > -1) {
        currentListeners.splice(index, 1);
      }
    };
  }

  public onPasswordChange(callback: (userId: string) => void): () => void {
    const listeners = this.eventListeners.get('passwordChange') || [];
    listeners.push(callback);
    this.eventListeners.set('passwordChange', listeners);

    return () => {
      const currentListeners = this.eventListeners.get('passwordChange') || [];
      const index = currentListeners.indexOf(callback);
      if (index > -1) {
        currentListeners.splice(index, 1);
      }
    };
  }

  public onMFAEvent(callback: (event: MFAEvent) => void): () => void {
    const listeners = this.eventListeners.get('mfaEvent') || [];
    listeners.push(callback);
    this.eventListeners.set('mfaEvent', listeners);

    return () => {
      const currentListeners = this.eventListeners.get('mfaEvent') || [];
      const index = currentListeners.indexOf(callback);
      if (index > -1) {
        currentListeners.splice(index, 1);
      }
    };
  }

  public onSecurityEvent(callback: (event: SecurityEvent) => void): () => void {
    const listeners = this.eventListeners.get('securityEvent') || [];
    listeners.push(callback);
    this.eventListeners.set('securityEvent', listeners);

    return () => {
      const currentListeners = this.eventListeners.get('securityEvent') || [];
      const index = currentListeners.indexOf(callback);
      if (index > -1) {
        currentListeners.splice(index, 1);
      }
    };
  }

  public async broadcastAuthEvent(event: AuthEvent, data?: any): Promise<void> {
    const listeners = this.eventListeners.get('authStateChange') || [];
    listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Error in auth event listener:', error);
      }
    });
  }

  public async broadcastSecurityEvent(event: SecurityEvent): Promise<void> {
    const listeners = this.eventListeners.get('securityEvent') || [];
    listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in security event listener:', error);
      }
    });
  }

  // Admin methods (placeholder implementations)
  public async getStats(): Promise<AuthStats> {
    return {
      totalUsers: 0,
      activeUsers: 0,
      signInsToday: 0,
      signUpsToday: 0,
      mfaEnabledUsers: 0
    };
  }

  public async createUser(userData: CreateUserData): Promise<User> {
    throw new AuthError('Admin user creation not implemented', 'NOT_IMPLEMENTED', 501);
  }

  public async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    throw new AuthError('Admin user update not implemented', 'NOT_IMPLEMENTED', 501);
  }

  public async deleteUser(userId: string): Promise<void> {
    throw new AuthError('Admin user deletion not implemented', 'NOT_IMPLEMENTED', 501);
  }

  public async listUsers(options?: ListUsersOptions): Promise<ListUsersResult> {
    return {
      users: [],
      total: 0,
      page: 1,
      limit: 10,
      hasMore: false
    };
  }

  public async bulkCreateUsers(users: CreateUserData[]): Promise<BulkOperationResult<User>> {
    return {
      successful: [],
      failed: [],
      totalProcessed: 0,
      successCount: 0,
      failureCount: 0
    };
  }

  public async bulkDeleteUsers(userIds: string[]): Promise<BulkOperationResult<void>> {
    return {
      successful: [],
      failed: [],
      totalProcessed: 0,
      successCount: 0,
      failureCount: 0
    };
  }

  public async lockUser(userId: string, reason?: string): Promise<void> {
    throw new AuthError('User locking not implemented', 'NOT_IMPLEMENTED', 501);
  }

  public async unlockUser(userId: string): Promise<void> {
    throw new AuthError('User unlocking not implemented', 'NOT_IMPLEMENTED', 501);
  }

  public async forcePasswordReset(userId: string): Promise<void> {
    throw new AuthError('Force password reset not implemented', 'NOT_IMPLEMENTED', 501);
  }

  public async getAuditLog(options?: AuditLogOptions): Promise<AuditLogEntry[]> {
    return [];
  }

  public async exportUserData(userId: string): Promise<UserDataExport> {
    const user = await this.getCurrentUser();
    if (!user) {
      throw new AuthError('User not found', 'USER_NOT_FOUND', 404);
    }

    return {
      profile: user,
      sessions: [],
      securityEvents: [],
      devices: [],
      metadata: {
        exportedAt: new Date(),
        exportedBy: 'system',
        dataVersion: '1.0'
      }
    };
  }

  public async deleteUserData(userId: string): Promise<void> {
    throw new AuthError('User data deletion not implemented', 'NOT_IMPLEMENTED', 501);
  }
}
