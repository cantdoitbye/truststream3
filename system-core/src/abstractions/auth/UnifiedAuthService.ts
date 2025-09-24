/**
 * Unified Auth Service
 * Provides unified authentication interface across different providers
 */

import { EventEmitter } from 'events';
import {
  IAuthService,
  AuthConfig,
  User,
  Session,
  AuthResult,
  SignUpCredentials,
  SignInCredentials,
  AuthStats,
  AuthEvent,
  SecurityEvent,
  MFAEvent
} from '../../../shared-utils/auth-interface';
import { AuthProviderFactory } from '../auth/providers/AuthProviderFactory';
import { IAuthProvider } from '../auth/auth.interface';

export interface UnifiedAuthServiceOptions {
  autoConnect?: boolean;
  enableEvents?: boolean;
  enableCaching?: boolean;
  cacheTimeout?: number;
  enableFailover?: boolean;
  retryAttempts?: number;
}

export class UnifiedAuthService extends EventEmitter implements IAuthService {
  private provider: IAuthProvider | null = null;
  private config: AuthConfig | null = null;
  private options: Required<UnifiedAuthServiceOptions>;
  private isConnectedFlag = false;
  private eventListeners = new Map<string, (() => void)[]>();
  
  // Caching
  private userCache = new Map<string, { user: User; expiry: number }>();
  private sessionCache = new Map<string, { session: Session; expiry: number }>();
  
  constructor(options: UnifiedAuthServiceOptions = {}) {
    super();
    
    this.options = {
      autoConnect: options.autoConnect ?? true,
      enableEvents: options.enableEvents ?? true,
      enableCaching: options.enableCaching ?? true,
      cacheTimeout: options.cacheTimeout ?? 300000, // 5 minutes
      enableFailover: options.enableFailover ?? true,
      retryAttempts: options.retryAttempts ?? 3
    };
  }

  /**
   * Connect to auth provider
   */
  async connect(config: AuthConfig): Promise<void> {
    try {
      this.config = config;
      
      // Create provider instance
      this.provider = AuthProviderFactory.create(config) as IAuthProvider;
      
      // Initialize provider
      await this.provider.initialize(config);
      await this.provider.connect();
      
      this.isConnectedFlag = true;
      
      // Setup event forwarding
      if (this.options.enableEvents) {
        this.setupEventForwarding();
      }
      
      this.emit('connected', { provider: config.type });
      
    } catch (error) {
      this.emit('connection:failed', { error });
      throw error;
    }
  }

  /**
   * Disconnect from auth provider
   */
  async disconnect(): Promise<void> {
    try {
      if (this.provider) {
        await this.provider.disconnect();
        this.clearEventListeners();
      }
      
      this.isConnectedFlag = false;
      this.provider = null;
      this.config = null;
      
      // Clear caches
      this.userCache.clear();
      this.sessionCache.clear();
      
      this.emit('disconnected');
      
    } catch (error) {
      this.emit('disconnection:failed', { error });
      throw error;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.isConnectedFlag && this.provider?.isConnected() === true;
  }

  /**
   * Get auth stats
   */
  async getStats(): Promise<AuthStats> {
    this.ensureConnected();
    return this.provider!.getStats();
  }

  // Auth Operations with caching and retry logic
  
  async signUp(credentials: SignUpCredentials): Promise<AuthResult> {
    this.ensureConnected();
    
    try {
      const result = await this.executeWithRetry(() => 
        this.provider!.signUp(credentials)
      );
      
      // Cache user if successful
      if (this.options.enableCaching && result.user) {
        this.cacheUser(result.user);
      }
      
      if (this.options.enableEvents) {
        this.emit('auth:signup', { user: result.user, success: !!result.user });
      }
      
      return result;
      
    } catch (error) {
      if (this.options.enableEvents) {
        this.emit('auth:signup:failed', { error, credentials: { email: credentials.email } });
      }
      throw error;
    }
  }

  async signIn(credentials: SignInCredentials): Promise<AuthResult> {
    this.ensureConnected();
    
    try {
      const result = await this.executeWithRetry(() => 
        this.provider!.signIn(credentials)
      );
      
      // Cache user and session if successful
      if (this.options.enableCaching) {
        if (result.user) {
          this.cacheUser(result.user);
        }
        if (result.session) {
          this.cacheSession(result.session);
        }
      }
      
      if (this.options.enableEvents) {
        this.emit('auth:signin', { user: result.user, success: !!result.user });
      }
      
      return result;
      
    } catch (error) {
      if (this.options.enableEvents) {
        this.emit('auth:signin:failed', { error, credentials: { email: credentials.email } });
      }
      throw error;
    }
  }

  async signOut(): Promise<void> {
    this.ensureConnected();
    
    try {
      await this.executeWithRetry(() => this.provider!.signOut());
      
      // Clear caches
      this.userCache.clear();
      this.sessionCache.clear();
      
      if (this.options.enableEvents) {
        this.emit('auth:signout');
      }
      
    } catch (error) {
      if (this.options.enableEvents) {
        this.emit('auth:signout:failed', { error });
      }
      throw error;
    }
  }

  async signOutEverywhere(): Promise<void> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.signOutEverywhere());
  }

  async getCurrentUser(): Promise<User | null> {
    this.ensureConnected();
    
    // Check cache first
    if (this.options.enableCaching) {
      const cached = this.getCachedUser('current');
      if (cached) {
        return cached;
      }
    }
    
    try {
      const user = await this.executeWithRetry(() => this.provider!.getCurrentUser());
      
      // Cache the result
      if (this.options.enableCaching && user) {
        this.cacheUser(user);
      }
      
      return user;
      
    } catch (error) {
      if (this.options.enableEvents) {
        this.emit('auth:get_user:failed', { error });
      }
      throw error;
    }
  }

  async getSession(): Promise<Session | null> {
    this.ensureConnected();
    
    // Check cache first
    if (this.options.enableCaching) {
      const cached = this.getCachedSession('current');
      if (cached) {
        return cached;
      }
    }
    
    try {
      const session = await this.executeWithRetry(() => this.provider!.getSession());
      
      // Cache the result
      if (this.options.enableCaching && session) {
        this.cacheSession(session);
      }
      
      return session;
      
    } catch (error) {
      if (this.options.enableEvents) {
        this.emit('auth:get_session:failed', { error });
      }
      throw error;
    }
  }

  async refreshSession(): Promise<Session> {
    this.ensureConnected();
    
    try {
      const session = await this.executeWithRetry(() => this.provider!.refreshSession());
      
      // Update cache
      if (this.options.enableCaching) {
        this.cacheSession(session);
      }
      
      if (this.options.enableEvents) {
        this.emit('auth:session:refreshed', { session });
      }
      
      return session;
      
    } catch (error) {
      if (this.options.enableEvents) {
        this.emit('auth:session:refresh:failed', { error });
      }
      throw error;
    }
  }

  // Delegate all other methods to the provider
  async verifySession(token: string): Promise<boolean> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.verifySession(token));
  }

  async resetPassword(email: string): Promise<void> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.resetPassword(email));
  }

  async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.updatePassword(currentPassword, newPassword));
  }

  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.confirmPasswordReset(token, newPassword));
  }

  async sendEmailVerification(): Promise<void> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.sendEmailVerification());
  }

  async verifyEmail(token: string): Promise<boolean> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.verifyEmail(token));
  }

  async sendPhoneVerification(phone: string): Promise<void> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.sendPhoneVerification(phone));
  }

  async verifyPhone(token: string, phone: string): Promise<boolean> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.verifyPhone(token, phone));
  }

  // MFA methods
  async enableMFA(method: any): Promise<any> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.enableMFA(method));
  }

  async verifyMFA(code: string, method?: any): Promise<boolean> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.verifyMFA(code, method));
  }

  async disableMFA(): Promise<void> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.disableMFA());
  }

  async getMFAMethods(): Promise<any[]> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.getMFAMethods());
  }

  // Social auth methods
  async signInWithProvider(provider: any, options?: any): Promise<AuthResult> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.signInWithProvider(provider, options));
  }

  async linkProvider(provider: any): Promise<void> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.linkProvider(provider));
  }

  async unlinkProvider(provider: any): Promise<void> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.unlinkProvider(provider));
  }

  async getLinkedProviders(): Promise<any[]> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.getLinkedProviders());
  }

  // Token methods
  async getAccessToken(): Promise<string | null> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.getAccessToken());
  }

  async getRefreshToken(): Promise<string | null> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.getRefreshToken());
  }

  async validateToken(token: string): Promise<any> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.validateToken(token));
  }

  async revokeToken(token: string): Promise<void> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.revokeToken(token));
  }

  // Profile methods
  async updateProfile(updates: any): Promise<User> {
    this.ensureConnected();
    
    try {
      const user = await this.executeWithRetry(() => this.provider!.updateProfile(updates));
      
      // Update cache
      if (this.options.enableCaching) {
        this.cacheUser(user);
      }
      
      return user;
      
    } catch (error) {
      if (this.options.enableEvents) {
        this.emit('auth:profile:update:failed', { error });
      }
      throw error;
    }
  }

  async uploadAvatar(file: File | Buffer): Promise<string> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.uploadAvatar(file));
  }

  async deleteAccount(): Promise<void> {
    this.ensureConnected();
    
    try {
      await this.executeWithRetry(() => this.provider!.deleteAccount());
      
      // Clear caches
      this.userCache.clear();
      this.sessionCache.clear();
      
      if (this.options.enableEvents) {
        this.emit('auth:account:deleted');
      }
      
    } catch (error) {
      if (this.options.enableEvents) {
        this.emit('auth:account:delete:failed', { error });
      }
      throw error;
    }
  }

  // Account linking
  async linkAccount(credentials: SignInCredentials): Promise<void> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.linkAccount(credentials));
  }

  async unlinkAccount(provider: string): Promise<void> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.unlinkAccount(provider));
  }

  // Security methods
  async getSecurityEvents(): Promise<SecurityEvent[]> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.getSecurityEvents());
  }

  async enableAccountLockout(attempts: number, duration: number): Promise<void> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.enableAccountLockout(attempts, duration));
  }

  async checkAccountLockout(): Promise<boolean> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.checkAccountLockout());
  }

  // Device management
  async getDevices(): Promise<any[]> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.getDevices());
  }

  async revokeDevice(deviceId: string): Promise<void> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.revokeDevice(deviceId));
  }

  async revokeAllDevices(): Promise<void> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.revokeAllDevices());
  }

  // Event listener methods
  onAuthStateChange(callback: (event: AuthEvent, session: Session | null) => void): () => void {
    this.ensureConnected();
    return this.provider!.onAuthStateChange(callback);
  }

  onUserUpdate(callback: (user: User) => void): () => void {
    this.ensureConnected();
    return this.provider!.onUserUpdate(callback);
  }

  onSessionExpiry(callback: () => void): () => void {
    this.ensureConnected();
    return this.provider!.onSessionExpiry(callback);
  }

  onPasswordChange(callback: (userId: string) => void): () => void {
    this.ensureConnected();
    return this.provider!.onPasswordChange(callback);
  }

  onMFAEvent(callback: (event: MFAEvent) => void): () => void {
    this.ensureConnected();
    return this.provider!.onMFAEvent(callback);
  }

  onSecurityEvent(callback: (event: SecurityEvent) => void): () => void {
    this.ensureConnected();
    return this.provider!.onSecurityEvent(callback);
  }

  // Utility methods
  
  private ensureConnected(): void {
    if (!this.isConnected()) {
      throw new Error('Auth service is not connected');
    }
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.options.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === this.options.retryAttempts) {
          throw lastError;
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    
    throw lastError!;
  }

  private cacheUser(user: User): void {
    const expiry = Date.now() + this.options.cacheTimeout;
    this.userCache.set(user.id, { user, expiry });
    this.userCache.set('current', { user, expiry });
  }

  private cacheSession(session: Session): void {
    const expiry = Date.now() + this.options.cacheTimeout;
    this.sessionCache.set('current', { session, expiry });
  }

  private getCachedUser(key: string): User | null {
    const cached = this.userCache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.user;
    }
    
    // Remove expired cache entry
    if (cached) {
      this.userCache.delete(key);
    }
    
    return null;
  }

  private getCachedSession(key: string): Session | null {
    const cached = this.sessionCache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.session;
    }
    
    // Remove expired cache entry
    if (cached) {
      this.sessionCache.delete(key);
    }
    
    return null;
  }

  private setupEventForwarding(): void {
    if (!this.provider) return;
    
    // Forward provider events
    const authStateListener = this.provider.onAuthStateChange((event, session) => {
      this.emit('auth:state:changed', { event, session });
    });
    
    const userUpdateListener = this.provider.onUserUpdate((user) => {
      // Update cache
      if (this.options.enableCaching) {
        this.cacheUser(user);
      }
      this.emit('auth:user:updated', { user });
    });
    
    const sessionExpiryListener = this.provider.onSessionExpiry(() => {
      // Clear caches
      this.sessionCache.clear();
      this.emit('auth:session:expired');
    });
    
    // Store listeners for cleanup
    this.eventListeners.set('authState', [authStateListener]);
    this.eventListeners.set('userUpdate', [userUpdateListener]);
    this.eventListeners.set('sessionExpiry', [sessionExpiryListener]);
  }

  private clearEventListeners(): void {
    for (const listeners of this.eventListeners.values()) {
      listeners.forEach(listener => listener());
    }
    this.eventListeners.clear();
  }
}
