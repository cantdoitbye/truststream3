/**
 * Mock Authentication Provider
 * Implements the auth abstraction layer for testing and development
 */

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
  MFARequiredError,
  AccountLockedError
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

interface MockUser extends User {
  password?: string;
  locked?: boolean;
  lockReason?: string;
  mfaEnabled?: boolean;
  mfaMethods?: MFAMethod[];
}

interface MockSession extends Session {
  id: string;
  createdAt: Date;
}

export class MockAuthProvider extends BaseAuthProvider {
  private users: Map<string, MockUser> = new Map();
  private sessions: Map<string, MockSession> = new Map();
  private roles: Map<string, Role> = new Map();
  private permissions: Map<string, RolePermission> = new Map();
  private userRoles: Map<string, string[]> = new Map();
  private currentUser: MockUser | null = null;
  private currentSession: MockSession | null = null;
  private eventListeners: Map<string, Function[]> = new Map();
  private auditLog: AuditLogEntry[] = [];
  private securityEvents: SecurityEvent[] = [];
  private devices: Map<string, Device> = new Map();
  private stats: AuthStats = {
    totalUsers: 0,
    activeUsers: 0,
    signInsToday: 0,
    signUpsToday: 0,
    mfaEnabledUsers: 0
  };

  public getProviderName(): string {
    return 'mock';
  }

  public async initialize(config: AuthConfig): Promise<void> {
    this.config = config;
    this.setupDefaultData();
  }

  public async connect(): Promise<void> {
    this.connected = true;
  }

  public async disconnect(): Promise<void> {
    this.connected = false;
    this.currentUser = null;
    this.currentSession = null;
  }

  protected async performHealthCheck(): Promise<void> {
    // Mock provider is always healthy when connected
    if (!this.connected) {
      throw new Error('Mock provider not connected');
    }
  }

  // Authentication methods
  public async signUp(credentials: SignUpCredentials): Promise<AuthResult> {
    // Check if user already exists
    const existingUser = Array.from(this.users.values()).find(u => u.email === credentials.email);
    if (existingUser) {
      throw new AuthError('User already exists', 'USER_EXISTS', 409);
    }

    // Create new user
    const userId = this.generateId();
    const user: MockUser = {
      id: userId,
      email: credentials.email,
      emailConfirmed: false,
      phone: credentials.phone,
      phoneConfirmed: false,
      name: credentials.metadata?.name,
      metadata: credentials.metadata || {},
      roles: [],
      permissions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      password: credentials.password
    };

    this.users.set(userId, user);
    this.stats.totalUsers++;
    this.stats.signUpsToday++;

    this.logAudit({
      id: this.generateId(),
      timestamp: new Date(),
      userId: userId,
      action: 'SIGN_UP',
      success: true,
      metadata: { email: credentials.email }
    });

    // Create session
    const session = this.createSession(user);
    this.currentUser = user;
    this.currentSession = session;

    return {
      user: this.sanitizeUser(user),
      session: this.sanitizeSession(session)
    };
  }

  public async signIn(credentials: SignInCredentials): Promise<AuthResult> {
    const user = Array.from(this.users.values()).find(u => u.email === credentials.email);
    
    if (!user) {
      this.logAudit({
        id: this.generateId(),
        timestamp: new Date(),
        action: 'SIGN_IN_FAILED',
        success: false,
        metadata: { email: credentials.email, reason: 'USER_NOT_FOUND' }
      });
      throw new InvalidCredentialsError();
    }

    if (user.locked) {
      throw new AccountLockedError(user.lockReason);
    }

    if (user.password !== credentials.password) {
      this.logAudit({
        id: this.generateId(),
        timestamp: new Date(),
        userId: user.id,
        action: 'SIGN_IN_FAILED',
        success: false,
        metadata: { email: credentials.email, reason: 'INVALID_PASSWORD' }
      });
      throw new InvalidCredentialsError();
    }

    // Check if MFA is required
    if (user.mfaEnabled && user.mfaMethods && user.mfaMethods.length > 0) {
      throw new MFARequiredError('MFA required', user.mfaMethods);
    }

    this.logAudit({
      id: this.generateId(),
      timestamp: new Date(),
      userId: user.id,
      action: 'SIGN_IN',
      success: true,
      metadata: { email: credentials.email }
    });

    // Update last sign in
    user.lastSignInAt = new Date();
    user.updatedAt = new Date();
    this.users.set(user.id, user);

    // Create session
    const session = this.createSession(user);
    this.currentUser = user;
    this.currentSession = session;

    this.stats.signInsToday++;
    this.stats.activeUsers++;

    return {
      user: this.sanitizeUser(user),
      session: this.sanitizeSession(session)
    };
  }

  public async signOut(): Promise<void> {
    if (this.currentSession) {
      this.sessions.delete(this.currentSession.id);
      
      this.logAudit({
        id: this.generateId(),
        timestamp: new Date(),
        userId: this.currentUser?.id,
        action: 'SIGN_OUT',
        success: true
      });
    }

    this.currentUser = null;
    this.currentSession = null;
    if (this.stats.activeUsers > 0) {
      this.stats.activeUsers--;
    }
  }

  public async signOutEverywhere(): Promise<void> {
    if (this.currentUser) {
      // Remove all sessions for this user
      const userSessions = Array.from(this.sessions.entries())
        .filter(([_, session]) => session.user.id === this.currentUser!.id);
      
      userSessions.forEach(([sessionId]) => {
        this.sessions.delete(sessionId);
      });

      this.logAudit({
        id: this.generateId(),
        timestamp: new Date(),
        userId: this.currentUser.id,
        action: 'SIGN_OUT_EVERYWHERE',
        success: true
      });
    }

    this.currentUser = null;
    this.currentSession = null;
  }

  // Session management
  public async getCurrentUser(): Promise<User | null> {
    return this.currentUser ? this.sanitizeUser(this.currentUser) : null;
  }

  public async getSession(): Promise<Session | null> {
    if (!this.currentSession) {
      return null;
    }

    // Check if session is expired
    if (this.currentSession.expiresAt < new Date()) {
      this.sessions.delete(this.currentSession.id);
      this.currentSession = null;
      this.currentUser = null;
      return null;
    }

    return this.sanitizeSession(this.currentSession);
  }

  public async refreshSession(): Promise<Session> {
    if (!this.currentSession) {
      throw new TokenExpiredError('No active session');
    }

    // Create new session
    const newSession = this.createSession(this.currentUser!);
    this.sessions.delete(this.currentSession.id);
    this.currentSession = newSession;

    return this.sanitizeSession(newSession);
  }

  public async verifySession(token: string): Promise<boolean> {
    const session = Array.from(this.sessions.values()).find(s => s.accessToken === token);
    return session && session.expiresAt > new Date() || false;
  }

  // Password management
  public async resetPassword(email: string): Promise<void> {
    const user = Array.from(this.users.values()).find(u => u.email === email);
    if (!user) {
      // Don't reveal if user exists for security
      return;
    }

    this.logAudit({
      id: this.generateId(),
      timestamp: new Date(),
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      success: true,
      metadata: { email }
    });
  }

  public async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (!this.currentUser) {
      throw new AuthError('Not authenticated', 'NOT_AUTHENTICATED', 401);
    }

    if (this.currentUser.password !== currentPassword) {
      throw new InvalidCredentialsError('Current password is incorrect');
    }

    this.currentUser.password = newPassword;
    this.currentUser.updatedAt = new Date();
    this.users.set(this.currentUser.id, this.currentUser);

    this.logAudit({
      id: this.generateId(),
      timestamp: new Date(),
      userId: this.currentUser.id,
      action: 'PASSWORD_UPDATED',
      success: true
    });
  }

  public async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    // In a real implementation, token would be validated against a reset tokens store
    // For mock, we'll just assume token is valid
    if (!this.currentUser) {
      throw new AuthError('Invalid reset token', 'INVALID_TOKEN', 400);
    }

    this.currentUser.password = newPassword;
    this.currentUser.updatedAt = new Date();
    this.users.set(this.currentUser.id, this.currentUser);
  }

  // Email verification
  public async sendEmailVerification(): Promise<void> {
    if (!this.currentUser) {
      throw new AuthError('Not authenticated', 'NOT_AUTHENTICATED', 401);
    }

    this.logAudit({
      id: this.generateId(),
      timestamp: new Date(),
      userId: this.currentUser.id,
      action: 'EMAIL_VERIFICATION_SENT',
      success: true
    });
  }

  public async verifyEmail(token: string): Promise<boolean> {
    if (!this.currentUser) {
      return false;
    }

    this.currentUser.emailConfirmed = true;
    this.currentUser.updatedAt = new Date();
    this.users.set(this.currentUser.id, this.currentUser);

    this.logAudit({
      id: this.generateId(),
      timestamp: new Date(),
      userId: this.currentUser.id,
      action: 'EMAIL_VERIFIED',
      success: true
    });

    return true;
  }

  // Phone verification
  public async sendPhoneVerification(phone: string): Promise<void> {
    if (!this.currentUser) {
      throw new AuthError('Not authenticated', 'NOT_AUTHENTICATED', 401);
    }

    this.logAudit({
      id: this.generateId(),
      timestamp: new Date(),
      userId: this.currentUser.id,
      action: 'PHONE_VERIFICATION_SENT',
      success: true,
      metadata: { phone }
    });
  }

  public async verifyPhone(token: string, phone: string): Promise<boolean> {
    if (!this.currentUser) {
      return false;
    }

    this.currentUser.phone = phone;
    this.currentUser.phoneConfirmed = true;
    this.currentUser.updatedAt = new Date();
    this.users.set(this.currentUser.id, this.currentUser);

    this.logAudit({
      id: this.generateId(),
      timestamp: new Date(),
      userId: this.currentUser.id,
      action: 'PHONE_VERIFIED',
      success: true,
      metadata: { phone }
    });

    return true;
  }

  // Multi-factor Authentication
  public async enableMFA(method: MFAMethod): Promise<MFASetupResult> {
    if (!this.currentUser) {
      throw new AuthError('Not authenticated', 'NOT_AUTHENTICATED', 401);
    }

    this.currentUser.mfaEnabled = true;
    this.currentUser.mfaMethods = [method];
    this.users.set(this.currentUser.id, this.currentUser);

    this.stats.mfaEnabledUsers++;

    return {
      secret: 'mock-secret-key',
      qrCode: 'data:image/png;base64,mock-qr-code',
      backupCodes: ['123456', '234567', '345678']
    };
  }

  public async verifyMFA(code: string, method?: MFAMethod): Promise<boolean> {
    // Mock implementation accepts '123456' as valid MFA code
    return code === '123456';
  }

  public async disableMFA(): Promise<void> {
    if (!this.currentUser) {
      throw new AuthError('Not authenticated', 'NOT_AUTHENTICATED', 401);
    }

    this.currentUser.mfaEnabled = false;
    this.currentUser.mfaMethods = [];
    this.users.set(this.currentUser.id, this.currentUser);

    if (this.stats.mfaEnabledUsers > 0) {
      this.stats.mfaEnabledUsers--;
    }
  }

  public async getMFAMethods(): Promise<MFAMethod[]> {
    return this.currentUser?.mfaMethods || [];
  }

  // Social authentication
  public async signInWithProvider(provider: AuthProvider, options?: ProviderOptions): Promise<AuthResult> {
    // Mock implementation creates a new user for social login
    const userId = this.generateId();
    const user: MockUser = {
      id: userId,
      email: `${provider.name}@example.com`,
      emailConfirmed: true,
      name: `${provider.name} User`,
      metadata: { provider: provider.name },
      roles: [],
      permissions: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.users.set(userId, user);
    const session = this.createSession(user);
    this.currentUser = user;
    this.currentSession = session;

    return {
      user: this.sanitizeUser(user),
      session: this.sanitizeSession(session)
    };
  }

  public async linkProvider(provider: AuthProvider): Promise<void> {
    if (!this.currentUser) {
      throw new AuthError('Not authenticated', 'NOT_AUTHENTICATED', 401);
    }

    this.currentUser.metadata = {
      ...this.currentUser.metadata,
      linkedProviders: [...(this.currentUser.metadata?.linkedProviders || []), provider.name]
    };
    this.users.set(this.currentUser.id, this.currentUser);
  }

  public async unlinkProvider(provider: AuthProvider): Promise<void> {
    if (!this.currentUser) {
      throw new AuthError('Not authenticated', 'NOT_AUTHENTICATED', 401);
    }

    const linkedProviders = this.currentUser.metadata?.linkedProviders || [];
    this.currentUser.metadata = {
      ...this.currentUser.metadata,
      linkedProviders: linkedProviders.filter((p: string) => p !== provider.name)
    };
    this.users.set(this.currentUser.id, this.currentUser);
  }

  public async getLinkedProviders(): Promise<AuthProvider[]> {
    const linkedProviders = this.currentUser?.metadata?.linkedProviders || [];
    return linkedProviders.map((name: string) => ({ name } as AuthProvider));
  }

  // Token management
  public async getAccessToken(): Promise<string | null> {
    return this.currentSession?.accessToken || null;
  }

  public async getRefreshToken(): Promise<string | null> {
    return this.currentSession?.refreshToken || null;
  }

  public async validateToken(token: string): Promise<TokenValidation> {
    const session = Array.from(this.sessions.values()).find(s => s.accessToken === token);
    
    if (!session) {
      return { valid: false, error: 'Token not found' };
    }

    if (session.expiresAt < new Date()) {
      return { valid: false, error: 'Token expired' };
    }

    return {
      valid: true,
      user: this.sanitizeUser(session.user as MockUser),
      expiresAt: session.expiresAt
    };
  }

  public async revokeToken(token: string): Promise<void> {
    const sessionEntry = Array.from(this.sessions.entries())
      .find(([_, session]) => session.accessToken === token);
    
    if (sessionEntry) {
      this.sessions.delete(sessionEntry[0]);
    }
  }

  // User profile
  public async updateProfile(updates: ProfileUpdates): Promise<User> {
    if (!this.currentUser) {
      throw new AuthError('Not authenticated', 'NOT_AUTHENTICATED', 401);
    }

    this.currentUser.name = updates.name || this.currentUser.name;
    this.currentUser.phone = updates.phone || this.currentUser.phone;
    this.currentUser.avatarUrl = updates.avatarUrl || this.currentUser.avatarUrl;
    this.currentUser.metadata = { ...this.currentUser.metadata, ...updates.metadata };
    this.currentUser.updatedAt = new Date();

    this.users.set(this.currentUser.id, this.currentUser);

    return this.sanitizeUser(this.currentUser);
  }

  public async uploadAvatar(file: File | Buffer): Promise<string> {
    if (!this.currentUser) {
      throw new AuthError('Not authenticated', 'NOT_AUTHENTICATED', 401);
    }

    const avatarUrl = `https://mock-storage.example.com/avatars/${this.currentUser.id}`;
    this.currentUser.avatarUrl = avatarUrl;
    this.users.set(this.currentUser.id, this.currentUser);

    return avatarUrl;
  }

  public async deleteAccount(): Promise<void> {
    if (!this.currentUser) {
      throw new AuthError('Not authenticated', 'NOT_AUTHENTICATED', 401);
    }

    const userId = this.currentUser.id;
    
    // Remove user and all associated data
    this.users.delete(userId);
    this.userRoles.delete(userId);
    
    // Remove all sessions for this user
    const userSessions = Array.from(this.sessions.entries())
      .filter(([_, session]) => session.user.id === userId);
    userSessions.forEach(([sessionId]) => this.sessions.delete(sessionId));

    this.currentUser = null;
    this.currentSession = null;
    this.stats.totalUsers--;
  }

  // Additional methods implementation...
  // (Continuing with the rest of the interface methods)

  public async linkAccount(credentials: SignInCredentials): Promise<void> {
    throw new AuthError('Account linking not implemented in mock', 'NOT_IMPLEMENTED', 501);
  }

  public async unlinkAccount(provider: string): Promise<void> {
    if (!this.currentUser) {
      throw new AuthError('Not authenticated', 'NOT_AUTHENTICATED', 401);
    }
    // Mock implementation
  }

  public async getSecurityEvents(): Promise<SecurityEvent[]> {
    return this.securityEvents.filter(event => 
      !this.currentUser || event.userId === this.currentUser.id
    );
  }

  public async enableAccountLockout(attempts: number, duration: number): Promise<void> {
    // Mock implementation - would store lockout configuration
  }

  public async checkAccountLockout(): Promise<boolean> {
    return this.currentUser?.locked || false;
  }

  public async getDevices(): Promise<Device[]> {
    if (!this.currentUser) {
      return [];
    }
    
    return Array.from(this.devices.values())
      .filter(device => device.id.startsWith(this.currentUser!.id));
  }

  public async revokeDevice(deviceId: string): Promise<void> {
    this.devices.delete(deviceId);
  }

  public async revokeAllDevices(): Promise<void> {
    if (!this.currentUser) return;
    
    const userDevices = Array.from(this.devices.entries())
      .filter(([_, device]) => device.id.startsWith(this.currentUser!.id));
    
    userDevices.forEach(([deviceId]) => this.devices.delete(deviceId));
  }

  // Role and permission management
  public async createRole(role: Omit<Role, 'id'>): Promise<Role> {
    const id = this.generateId();
    const newRole: Role = { ...role, id };
    this.roles.set(id, newRole);
    return newRole;
  }

  public async updateRole(id: string, updates: Partial<Role>): Promise<Role> {
    const role = this.roles.get(id);
    if (!role) {
      throw new AuthError('Role not found', 'ROLE_NOT_FOUND', 404);
    }
    
    const updatedRole = { ...role, ...updates };
    this.roles.set(id, updatedRole);
    return updatedRole;
  }

  public async deleteRole(id: string): Promise<void> {
    this.roles.delete(id);
  }

  public async getRole(id: string): Promise<Role | null> {
    return this.roles.get(id) || null;
  }

  public async listRoles(): Promise<Role[]> {
    return Array.from(this.roles.values());
  }

  public async createPermission(permission: Omit<RolePermission, 'id'>): Promise<RolePermission> {
    const id = this.generateId();
    const newPermission: RolePermission = { ...permission, id };
    this.permissions.set(id, newPermission);
    return newPermission;
  }

  public async updatePermission(id: string, updates: Partial<RolePermission>): Promise<RolePermission> {
    const permission = this.permissions.get(id);
    if (!permission) {
      throw new AuthError('Permission not found', 'PERMISSION_NOT_FOUND', 404);
    }
    
    const updatedPermission = { ...permission, ...updates };
    this.permissions.set(id, updatedPermission);
    return updatedPermission;
  }

  public async deletePermission(id: string): Promise<void> {
    this.permissions.delete(id);
  }

  public async getPermission(id: string): Promise<RolePermission | null> {
    return this.permissions.get(id) || null;
  }

  public async listPermissions(): Promise<RolePermission[]> {
    return Array.from(this.permissions.values());
  }

  public async assignRole(userId: string, roleId: string): Promise<void> {
    const userRoles = this.userRoles.get(userId) || [];
    if (!userRoles.includes(roleId)) {
      userRoles.push(roleId);
      this.userRoles.set(userId, userRoles);
    }
  }

  public async removeRole(userId: string, roleId: string): Promise<void> {
    const userRoles = this.userRoles.get(userId) || [];
    const updatedRoles = userRoles.filter(id => id !== roleId);
    this.userRoles.set(userId, updatedRoles);
  }

  public async getUserRoles(userId: string): Promise<Role[]> {
    const roleIds = this.userRoles.get(userId) || [];
    return roleIds.map(id => this.roles.get(id)).filter(Boolean) as Role[];
  }

  public async hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    const userRoles = await this.getUserRoles(userId);
    
    for (const role of userRoles) {
      for (const permission of role.permissions) {
        if (permission.resource === resource && permission.action === action) {
          return true;
        }
      }
    }
    
    return false;
  }

  public async getUserPermissions(userId: string): Promise<RolePermission[]> {
    const userRoles = await this.getUserRoles(userId);
    const permissions: RolePermission[] = [];
    
    for (const role of userRoles) {
      permissions.push(...role.permissions);
    }
    
    return permissions;
  }

  public async checkPermissions(userId: string, permissions: Array<{resource: string; action: string}>): Promise<boolean[]> {
    const results: boolean[] = [];
    
    for (const permission of permissions) {
      const hasPermission = await this.hasPermission(userId, permission.resource, permission.action);
      results.push(hasPermission);
    }
    
    return results;
  }

  // Event methods
  public onAuthStateChange(callback: (event: AuthEvent, session: Session | null) => void): () => void {
    return this.addEventListener('authStateChange', callback);
  }

  public onUserUpdate(callback: (user: User) => void): () => void {
    return this.addEventListener('userUpdate', callback);
  }

  public onSessionExpiry(callback: () => void): () => void {
    return this.addEventListener('sessionExpiry', callback);
  }

  public onPasswordChange(callback: (userId: string) => void): () => void {
    return this.addEventListener('passwordChange', callback);
  }

  public onMFAEvent(callback: (event: MFAEvent) => void): () => void {
    return this.addEventListener('mfaEvent', callback);
  }

  public onSecurityEvent(callback: (event: SecurityEvent) => void): () => void {
    return this.addEventListener('securityEvent', callback);
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
    this.securityEvents.push(event);
    const listeners = this.eventListeners.get('securityEvent') || [];
    listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in security event listener:', error);
      }
    });
  }

  // Admin methods
  public async getStats(): Promise<AuthStats> {
    return { ...this.stats };
  }

  public async createUser(userData: CreateUserData): Promise<User> {
    const userId = this.generateId();
    const user: MockUser = {
      id: userId,
      email: userData.email,
      emailConfirmed: userData.emailConfirmed || false,
      phone: userData.phone,
      phoneConfirmed: userData.phoneConfirmed || false,
      name: userData.name,
      metadata: userData.metadata || {},
      roles: userData.roles || [],
      permissions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      password: userData.password || this.generateId()
    };

    this.users.set(userId, user);
    this.stats.totalUsers++;

    return this.sanitizeUser(user);
  }

  public async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new AuthError('User not found', 'USER_NOT_FOUND', 404);
    }

    Object.assign(user, updates, { updatedAt: new Date() });
    this.users.set(userId, user);

    return this.sanitizeUser(user);
  }

  public async deleteUser(userId: string): Promise<void> {
    this.users.delete(userId);
    this.userRoles.delete(userId);
    this.stats.totalUsers--;
  }

  public async listUsers(options?: ListUsersOptions): Promise<ListUsersResult> {
    const users = Array.from(this.users.values());
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const offset = (page - 1) * limit;

    let filteredUsers = users;

    // Apply filters
    if (options?.filter) {
      const filter = options.filter;
      filteredUsers = users.filter(user => {
        if (filter.email && !user.email.includes(filter.email)) return false;
        if (filter.emailConfirmed !== undefined && user.emailConfirmed !== filter.emailConfirmed) return false;
        if (filter.roles && !filter.roles.some(role => user.roles?.includes(role))) return false;
        if (filter.createdAfter && user.createdAt < filter.createdAfter) return false;
        if (filter.createdBefore && user.createdAt > filter.createdBefore) return false;
        return true;
      });
    }

    // Apply sorting
    if (options?.sortBy) {
      filteredUsers.sort((a, b) => {
        const aValue = a[options.sortBy!];
        const bValue = b[options.sortBy!];
        const order = options.sortOrder === 'desc' ? -1 : 1;
        
        if (aValue < bValue) return -1 * order;
        if (aValue > bValue) return 1 * order;
        return 0;
      });
    }

    const paginatedUsers = filteredUsers.slice(offset, offset + limit);

    return {
      users: paginatedUsers.map(user => this.sanitizeUser(user)),
      total: filteredUsers.length,
      page,
      limit,
      hasMore: offset + limit < filteredUsers.length
    };
  }

  public async bulkCreateUsers(users: CreateUserData[]): Promise<BulkOperationResult<User>> {
    const successful: User[] = [];
    const failed: Array<{ data: any; error: string }> = [];

    for (const userData of users) {
      try {
        const user = await this.createUser(userData);
        successful.push(user);
      } catch (error) {
        failed.push({
          data: userData,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      successful,
      failed,
      totalProcessed: users.length,
      successCount: successful.length,
      failureCount: failed.length
    };
  }

  public async bulkDeleteUsers(userIds: string[]): Promise<BulkOperationResult<void>> {
    const successful: void[] = [];
    const failed: Array<{ data: any; error: string }> = [];

    for (const userId of userIds) {
      try {
        await this.deleteUser(userId);
        successful.push();
      } catch (error) {
        failed.push({
          data: userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      successful,
      failed,
      totalProcessed: userIds.length,
      successCount: successful.length,
      failureCount: failed.length
    };
  }

  public async lockUser(userId: string, reason?: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new AuthError('User not found', 'USER_NOT_FOUND', 404);
    }

    user.locked = true;
    user.lockReason = reason;
    this.users.set(userId, user);
  }

  public async unlockUser(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new AuthError('User not found', 'USER_NOT_FOUND', 404);
    }

    user.locked = false;
    user.lockReason = undefined;
    this.users.set(userId, user);
  }

  public async forcePasswordReset(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new AuthError('User not found', 'USER_NOT_FOUND', 404);
    }

    // Mock implementation - would typically send reset email
    this.logAudit({
      id: this.generateId(),
      timestamp: new Date(),
      userId,
      action: 'FORCE_PASSWORD_RESET',
      success: true
    });
  }

  public async getAuditLog(options?: AuditLogOptions): Promise<AuditLogEntry[]> {
    let log = [...this.auditLog];

    if (options?.userId) {
      log = log.filter(entry => entry.userId === options.userId);
    }

    if (options?.action) {
      log = log.filter(entry => entry.action === options.action);
    }

    if (options?.startDate) {
      log = log.filter(entry => entry.timestamp >= options.startDate!);
    }

    if (options?.endDate) {
      log = log.filter(entry => entry.timestamp <= options.endDate!);
    }

    if (options?.offset) {
      log = log.slice(options.offset);
    }

    if (options?.limit) {
      log = log.slice(0, options.limit);
    }

    return log;
  }

  public async exportUserData(userId: string): Promise<UserDataExport> {
    const user = this.users.get(userId);
    if (!user) {
      throw new AuthError('User not found', 'USER_NOT_FOUND', 404);
    }

    const sessions = Array.from(this.sessions.values())
      .filter(session => session.user.id === userId)
      .map(session => this.sanitizeSession(session));

    const securityEvents = this.securityEvents.filter(event => event.userId === userId);
    const devices = Array.from(this.devices.values())
      .filter(device => device.id.startsWith(userId));

    return {
      profile: this.sanitizeUser(user),
      sessions,
      securityEvents,
      devices,
      metadata: {
        exportedAt: new Date(),
        exportedBy: 'system',
        dataVersion: '1.0'
      }
    };
  }

  public async deleteUserData(userId: string): Promise<void> {
    await this.deleteUser(userId);
    
    // Remove from audit log
    this.auditLog = this.auditLog.filter(entry => entry.userId !== userId);
    
    // Remove security events
    this.securityEvents = this.securityEvents.filter(event => event.userId !== userId);
    
    // Remove devices
    Array.from(this.devices.entries())
      .filter(([_, device]) => device.id.startsWith(userId))
      .forEach(([deviceId]) => this.devices.delete(deviceId));
  }

  // Utility methods
  private setupDefaultData(): void {
    // Create default admin user
    const adminId = 'admin-1';
    const adminUser: MockUser = {
      id: adminId,
      email: 'admin@example.com',
      emailConfirmed: true,
      name: 'Admin User',
      metadata: {},
      roles: ['admin'],
      permissions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      password: 'admin123'
    };

    this.users.set(adminId, adminUser);

    // Create default role
    const adminRole: Role = {
      id: 'admin',
      name: 'Administrator',
      description: 'Full system access',
      permissions: [],
      isDefault: false,
      hierarchy: 1
    };

    this.roles.set('admin', adminRole);
    this.userRoles.set(adminId, ['admin']);

    this.stats.totalUsers = 1;
  }

  private createSession(user: MockUser): MockSession {
    const sessionId = this.generateId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const session: MockSession = {
      id: sessionId,
      accessToken: `mock-access-token-${sessionId}`,
      refreshToken: `mock-refresh-token-${sessionId}`,
      expiresAt,
      user: this.sanitizeUser(user),
      tokenType: 'Bearer',
      scope: ['read', 'write'],
      createdAt: now
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  private sanitizeUser(user: MockUser): User {
    const { password, locked, lockReason, mfaEnabled, mfaMethods, ...sanitized } = user;
    return sanitized;
  }

  private sanitizeSession(session: MockSession): Session {
    const { id, createdAt, ...sanitized } = session;
    return sanitized;
  }

  private generateId(): string {
    return `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private addEventListener(eventType: string, callback: Function): () => void {
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.push(callback);
    this.eventListeners.set(eventType, listeners);

    return () => {
      const currentListeners = this.eventListeners.get(eventType) || [];
      const index = currentListeners.indexOf(callback);
      if (index > -1) {
        currentListeners.splice(index, 1);
      }
    };
  }

  private logAudit(entry: AuditLogEntry): void {
    this.auditLog.push(entry);
    
    // Keep only last 1000 entries to prevent memory issues
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }
  }
}
