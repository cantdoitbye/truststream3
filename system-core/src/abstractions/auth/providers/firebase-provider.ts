/**
 * Firebase Authentication Provider
 * Implements the auth abstraction layer using Firebase Auth
 */

import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import {
  getAuth,
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  TwitterAuthProvider,
  GithubAuthProvider
} from 'firebase/auth';
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

export class FirebaseAuthProvider extends BaseAuthProvider {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private eventListeners: Map<string, Function[]> = new Map();

  public getProviderName(): string {
    return 'firebase';
  }

  public async initialize(config: AuthConfig): Promise<void> {
    if (config.type !== 'firebase' || !config.firebase) {
      throw new Error('Invalid Firebase configuration');
    }

    // Initialize Firebase app if not already initialized
    const existingApp = getApps().find(app => app.name === config.firebase?.projectId);
    
    if (existingApp) {
      this.app = existingApp;
    } else {
      this.app = initializeApp({
        apiKey: config.firebase.apiKey,
        authDomain: config.firebase.authDomain,
        projectId: config.firebase.projectId,
        storageBucket: config.firebase.storageBucket,
        messagingSenderId: config.firebase.messagingSenderId,
        appId: config.firebase.appId
      }, config.firebase.projectId);
    }

    this.auth = getAuth(this.app);
    this.config = config;
    this.setupEventListeners();
  }

  public async connect(): Promise<void> {
    if (!this.auth) {
      throw new Error('Firebase auth not initialized');
    }

    try {
      // Test the connection by checking current user
      this.auth.currentUser;
      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw new AuthError('Failed to connect to Firebase Auth', 'CONNECTION_FAILED', 500, error);
    }
  }

  public async disconnect(): Promise<void> {
    if (this.auth) {
      await signOut(this.auth);
      this.connected = false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    if (!this.auth) {
      throw new Error('Auth not initialized');
    }
    
    // Test connection by accessing current user
    this.auth.currentUser;
  }

  private setupEventListeners(): void {
    if (!this.auth) return;

    onAuthStateChanged(this.auth, (firebaseUser) => {
      const user = firebaseUser ? this.mapFirebaseUser(firebaseUser) : null;
      this.emitEvent('auth:state_changed', { user });
    });
  }

  // Authentication methods
  public async signUp(credentials: SignUpCredentials): Promise<AuthResult> {
    if (!this.auth) {
      throw new Error('Auth not initialized');
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        credentials.email,
        credentials.password
      );

      // Update profile if display name provided
      if (credentials.metadata?.displayName) {
        await updateProfile(userCredential.user, {
          displayName: credentials.metadata.displayName
        });
      }

      // Send email verification if enabled
      if (credentials.options?.emailConfirmation !== false) {
        await sendEmailVerification(userCredential.user);
      }

      return {
        user: this.mapFirebaseUser(userCredential.user),
        session: this.createSession(userCredential.user)
      };
    } catch (error: any) {
      throw this.mapFirebaseError(error);
    }
  }

  public async signIn(credentials: SignInCredentials): Promise<AuthResult> {
    if (!this.auth) {
      throw new Error('Auth not initialized');
    }

    try {
      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        credentials.email!,
        credentials.password
      );

      return {
        user: this.mapFirebaseUser(userCredential.user),
        session: this.createSession(userCredential.user)
      };
    } catch (error: any) {
      throw this.mapFirebaseError(error);
    }
  }

  public async signInWithProvider(provider: AuthProvider, options?: ProviderOptions): Promise<AuthResult> {
    if (!this.auth) {
      throw new Error('Auth not initialized');
    }

    try {
      let authProvider;
      
      switch (provider) {
        case 'google':
          authProvider = new GoogleAuthProvider();
          break;
        case 'facebook':
          authProvider = new FacebookAuthProvider();
          break;
        case 'twitter':
          authProvider = new TwitterAuthProvider();
          break;
        case 'github':
          authProvider = new GithubAuthProvider();
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      if (options?.scopes) {
        options.scopes.forEach(scope => authProvider.addScope(scope));
      }

      const userCredential = await signInWithPopup(this.auth, authProvider);

      return {
        user: this.mapFirebaseUser(userCredential.user),
        session: this.createSession(userCredential.user)
      };
    } catch (error: any) {
      throw this.mapFirebaseError(error);
    }
  }

  public async signOut(): Promise<void> {
    if (!this.auth) {
      throw new Error('Auth not initialized');
    }

    await signOut(this.auth);
  }

  public async signOutEverywhere(): Promise<void> {
    // Firebase doesn't support signing out from all devices
    // This would require server-side implementation
    await this.signOut();
  }

  // Session management
  public async getCurrentUser(): Promise<User | null> {
    if (!this.auth) {
      throw new Error('Auth not initialized');
    }

    const firebaseUser = this.auth.currentUser;
    return firebaseUser ? this.mapFirebaseUser(firebaseUser) : null;
  }

  public async getSession(): Promise<Session | null> {
    if (!this.auth) {
      throw new Error('Auth not initialized');
    }

    const firebaseUser = this.auth.currentUser;
    return firebaseUser ? this.createSession(firebaseUser) : null;
  }

  public async refreshSession(): Promise<Session | null> {
    if (!this.auth?.currentUser) {
      return null;
    }

    // Firebase automatically handles token refresh
    await this.auth.currentUser.getIdToken(true);
    return this.createSession(this.auth.currentUser);
  }

  // Password management
  public async resetPassword(email: string): Promise<void> {
    if (!this.auth) {
      throw new Error('Auth not initialized');
    }

    try {
      await sendPasswordResetEmail(this.auth, email);
    } catch (error: any) {
      throw this.mapFirebaseError(error);
    }
  }

  // Helper methods
  private mapFirebaseUser(firebaseUser: FirebaseUser): User {
    return {
      id: firebaseUser.uid,
      email: firebaseUser.email || undefined,
      phone: firebaseUser.phoneNumber || undefined,
      displayName: firebaseUser.displayName || undefined,
      avatarUrl: firebaseUser.photoURL || undefined,
      emailVerified: firebaseUser.emailVerified,
      phoneVerified: false, // Firebase doesn't track this separately
      mfaEnabled: false, // Would need to check MFA enrollment
      roles: [], // Would need custom implementation
      metadata: {
        provider: 'firebase',
        createdAt: firebaseUser.metadata.creationTime ? new Date(firebaseUser.metadata.creationTime) : new Date(),
        lastSignInAt: firebaseUser.metadata.lastSignInTime ? new Date(firebaseUser.metadata.lastSignInTime) : undefined
      },
      isActive: true,
      lastActiveAt: new Date(),
      preferences: {},
      customClaims: {}
    };
  }

  private createSession(firebaseUser: FirebaseUser): Session {
    return {
      id: `session_${firebaseUser.uid}_${Date.now()}`,
      userId: firebaseUser.uid,
      accessToken: '', // Would need to get ID token
      refreshToken: firebaseUser.refreshToken,
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
      createdAt: new Date(),
      lastRefreshedAt: new Date(),
      deviceInfo: {
        userAgent: navigator.userAgent,
        ipAddress: '', // Not available client-side
        platform: navigator.platform
      },
      metadata: {
        provider: 'firebase',
        authMethod: 'email'
      }
    };
  }

  private mapFirebaseError(error: any): AuthError {
    switch (error.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return new InvalidCredentialsError('Invalid email or password');
      case 'auth/email-already-in-use':
        return new AuthError('Email already in use', 'EMAIL_IN_USE', 400);
      case 'auth/weak-password':
        return new AuthError('Password is too weak', 'WEAK_PASSWORD', 400);
      case 'auth/invalid-email':
        return new AuthError('Invalid email format', 'INVALID_EMAIL', 400);
      case 'auth/user-disabled':
        return new AuthError('User account has been disabled', 'USER_DISABLED', 403);
      case 'auth/too-many-requests':
        return new AuthError('Too many requests, try again later', 'RATE_LIMITED', 429);
      default:
        return new AuthError(error.message || 'Authentication failed', 'AUTH_ERROR', 500, error);
    }
  }

  // Additional methods required by BaseAuthProvider
  public async updateUserMetadata(userId: string, metadata: any): Promise<void> {
    // Firebase custom claims would need admin SDK
    throw new Error('updateUserMetadata not implemented for Firebase client SDK');
  }

  public async createUser(userData: CreateUserData): Promise<User> {
    // Would need admin SDK for server-side user creation
    throw new Error('createUser not implemented for Firebase client SDK');
  }

  public async getUserById(userId: string): Promise<User | null> {
    // Would need admin SDK or Firestore integration
    throw new Error('getUserById not implemented for Firebase client SDK');
  }

  public async listUsers(options?: ListUsersOptions): Promise<ListUsersResult> {
    // Would need admin SDK
    throw new Error('listUsers not implemented for Firebase client SDK');
  }

  public async deleteUser(userId: string): Promise<void> {
    // Would need admin SDK
    throw new Error('deleteUser not implemented for Firebase client SDK');
  }

  public async bulkCreateUsers(users: CreateUserData[]): Promise<BulkOperationResult> {
    // Would need admin SDK
    throw new Error('bulkCreateUsers not implemented for Firebase client SDK');
  }

  public async exportUserData(userId: string): Promise<UserDataExport> {
    // Would need custom implementation
    throw new Error('exportUserData not implemented for Firebase client SDK');
  }

  public async getAuditLogs(options: AuditLogOptions): Promise<AuditLogEntry[]> {
    // Would need custom logging implementation
    throw new Error('getAuditLogs not implemented for Firebase client SDK');
  }

  protected async getProviderStats(): Promise<AuthStats> {
    return {
      totalUsers: 0, // Would need admin SDK
      activeUsers: 0,
      newUsers: 0,
      authenticationsToday: 0,
      failedLogins: 0,
      mfaUsers: 0,
      socialLogins: 0,
      lastUpdated: new Date()
    };
  }
}