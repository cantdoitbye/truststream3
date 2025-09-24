/**
 * Authentication Interface - Core authentication abstraction layer
 * Provides unified interface for different authentication implementations
 */

// Core Types and Interfaces
export interface User {
  id: string;
  email: string;
  emailConfirmed: boolean;
  phone?: string;
  phoneConfirmed?: boolean;
  name?: string;
  avatarUrl?: string;
  metadata?: Record<string, any>;
  roles?: string[];
  permissions?: string[];
  createdAt: Date;
  updatedAt: Date;
  lastSignInAt?: Date;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  user: User;
  tokenType?: string;
  scope?: string[];
}

export interface SignUpCredentials {
  email: string;
  password: string;
  phone?: string;
  metadata?: Record<string, any>;
  options?: {
    emailRedirectTo?: string;
    data?: Record<string, any>;
  };
}

export interface SignInCredentials {
  email?: string;
  phone?: string;
  password: string;
  remember?: boolean;
  captchaToken?: string;
}

export interface AuthResult {
  user: User | null;
  session: Session | null;
  error?: AuthError;
}

export interface MFASetupResult {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface TokenValidation {
  valid: boolean;
  user?: User;
  expiresAt?: Date;
  scopes?: string[];
  error?: string;
}

export interface ProfileUpdates {
  name?: string;
  phone?: string;
  metadata?: Record<string, any>;
  avatarUrl?: string;
}

export interface AuthProvider {
  name: 'google' | 'github' | 'facebook' | 'twitter' | 'apple' | 'discord' | 'microsoft';
  scopes?: string[];
}

export interface ProviderOptions {
  redirectTo?: string;
  scopes?: string[];
  queryParams?: Record<string, string>;
}

export type MFAMethod = 'totp' | 'sms' | 'email';

export interface AuthConfig {
  type: 'supabase' | 'firebase' | 'auth0' | 'custom' | 'mock';
  supabase?: {
    url: string;
    anonKey: string;
    serviceRoleKey?: string;
  };
  firebase?: {
    apiKey: string;
    authDomain: string;
    projectId: string;
  };
  auth0?: {
    domain: string;
    clientId: string;
    clientSecret?: string;
  };
  custom?: {
    baseUrl: string;
    apiKey?: string;
    tokenEndpoint?: string;
    userEndpoint?: string;
  };
  options?: {
    sessionTimeout?: number;
    refreshThreshold?: number;
    enableMFA?: boolean;
    passwordPolicy?: PasswordPolicy;
  };
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
  maxAge?: number; // days
  preventReuse?: number; // number of previous passwords
}

export interface AuthStats {
  totalUsers: number;
  activeUsers: number;
  signInsToday: number;
  signUpsToday: number;
  mfaEnabledUsers: number;
}

export interface RolePermission {
  id: string;
  name: string;
  description?: string;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: RolePermission[];
  isDefault?: boolean;
  hierarchy?: number;
}

// Core Authentication Service Interface
export interface IAuthService {
  // User Authentication
  signUp(credentials: SignUpCredentials): Promise<AuthResult>;
  signIn(credentials: SignInCredentials): Promise<AuthResult>;
  signOut(): Promise<void>;
  signOutEverywhere(): Promise<void>;
  
  // Session Management
  getCurrentUser(): Promise<User | null>;
  getSession(): Promise<Session | null>;
  refreshSession(): Promise<Session>;
  verifySession(token: string): Promise<boolean>;
  
  // Password Management
  resetPassword(email: string): Promise<void>;
  updatePassword(currentPassword: string, newPassword: string): Promise<void>;
  confirmPasswordReset(token: string, newPassword: string): Promise<void>;
  
  // Email Verification
  sendEmailVerification(): Promise<void>;
  verifyEmail(token: string): Promise<boolean>;
  
  // Phone Verification
  sendPhoneVerification(phone: string): Promise<void>;
  verifyPhone(token: string, phone: string): Promise<boolean>;
  
  // Multi-factor Authentication
  enableMFA(method: MFAMethod): Promise<MFASetupResult>;
  verifyMFA(code: string, method?: MFAMethod): Promise<boolean>;
  disableMFA(): Promise<void>;
  getMFAMethods(): Promise<MFAMethod[]>;
  
  // Social Authentication
  signInWithProvider(provider: AuthProvider, options?: ProviderOptions): Promise<AuthResult>;
  linkProvider(provider: AuthProvider): Promise<void>;
  unlinkProvider(provider: AuthProvider): Promise<void>;
  getLinkedProviders(): Promise<AuthProvider[]>;
  
  // Token Management
  getAccessToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>;
  validateToken(token: string): Promise<TokenValidation>;
  revokeToken(token: string): Promise<void>;
  
  // User Profile
  updateProfile(updates: ProfileUpdates): Promise<User>;
  uploadAvatar(file: File | Buffer): Promise<string>;
  deleteAccount(): Promise<void>;
  
  // Account Linking
  linkAccount(credentials: SignInCredentials): Promise<void>;
  unlinkAccount(provider: string): Promise<void>;
  
  // Security
  getSecurityEvents(): Promise<SecurityEvent[]>;
  enableAccountLockout(attempts: number, duration: number): Promise<void>;
  checkAccountLockout(): Promise<boolean>;
  
  // Device Management
  getDevices(): Promise<Device[]>;
  revokeDevice(deviceId: string): Promise<void>;
  revokeAllDevices(): Promise<void>;
}

// Role and Permission Management Interface
export interface IRoleService {
  // Roles
  createRole(role: Omit<Role, 'id'>): Promise<Role>;
  updateRole(id: string, updates: Partial<Role>): Promise<Role>;
  deleteRole(id: string): Promise<void>;
  getRole(id: string): Promise<Role | null>;
  listRoles(): Promise<Role[]>;
  
  // Permissions
  createPermission(permission: Omit<RolePermission, 'id'>): Promise<RolePermission>;
  updatePermission(id: string, updates: Partial<RolePermission>): Promise<RolePermission>;
  deletePermission(id: string): Promise<void>;
  getPermission(id: string): Promise<RolePermission | null>;
  listPermissions(): Promise<RolePermission[]>;
  
  // User Role Assignment
  assignRole(userId: string, roleId: string): Promise<void>;
  removeRole(userId: string, roleId: string): Promise<void>;
  getUserRoles(userId: string): Promise<Role[]>;
  
  // Permission Checking
  hasPermission(userId: string, resource: string, action: string): Promise<boolean>;
  getUserPermissions(userId: string): Promise<RolePermission[]>;
  checkPermissions(userId: string, permissions: Array<{resource: string; action: string}>): Promise<boolean[]>;
}

// Authentication Event Interface
export interface IAuthEventService {
  // Event Listeners
  onAuthStateChange(callback: (event: AuthEvent, session: Session | null) => void): () => void;
  onUserUpdate(callback: (user: User) => void): () => void;
  onSessionExpiry(callback: () => void): () => void;
  onPasswordChange(callback: (userId: string) => void): () => void;
  onMFAEvent(callback: (event: MFAEvent) => void): () => void;
  onSecurityEvent(callback: (event: SecurityEvent) => void): () => void;
  
  // Event Broadcasting
  broadcastAuthEvent(event: AuthEvent, data?: any): Promise<void>;
  broadcastSecurityEvent(event: SecurityEvent): Promise<void>;
}

// Authentication Events
export interface AuthEvent {
  type: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED' | 'PASSWORD_RECOVERY';
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface MFAEvent {
  type: 'MFA_ENABLED' | 'MFA_DISABLED' | 'MFA_CHALLENGE_SENT' | 'MFA_VERIFIED' | 'MFA_FAILED';
  timestamp: Date;
  userId: string;
  method: MFAMethod;
  success: boolean;
  attempts?: number;
}

export interface SecurityEvent {
  type: 'SUSPICIOUS_LOGIN' | 'ACCOUNT_LOCKED' | 'PASSWORD_BREACH' | 'DEVICE_ADDED' | 'UNUSUAL_ACTIVITY';
  timestamp: Date;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details?: Record<string, any>;
}

export interface Device {
  id: string;
  name: string;
  type: 'mobile' | 'desktop' | 'tablet' | 'other';
  browser?: string;
  os?: string;
  ipAddress: string;
  location?: string;
  lastUsed: Date;
  isCurrent: boolean;
}

// Error Classes
export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class AuthenticationError extends AuthError {
  constructor(message: string, details?: any) {
    super(message, 'AUTHENTICATION_FAILED', 401, details);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AuthError {
  constructor(message: string, details?: any) {
    super(message, 'AUTHORIZATION_FAILED', 403, details);
    this.name = 'AuthorizationError';
  }
}

export class TokenExpiredError extends AuthError {
  constructor(message: string = 'Token has expired') {
    super(message, 'TOKEN_EXPIRED', 401);
    this.name = 'TokenExpiredError';
  }
}

export class InvalidCredentialsError extends AuthError {
  constructor(message: string = 'Invalid credentials') {
    super(message, 'INVALID_CREDENTIALS', 401);
    this.name = 'InvalidCredentialsError';
  }
}

export class AccountLockedError extends AuthError {
  constructor(message: string = 'Account is locked', public unlockAt?: Date) {
    super(message, 'ACCOUNT_LOCKED', 423);
    this.name = 'AccountLockedError';
  }
}

export class MFARequiredError extends AuthError {
  constructor(message: string = 'Multi-factor authentication required', public methods?: MFAMethod[]) {
    super(message, 'MFA_REQUIRED', 200); // 200 because it's not an error, just additional step required
    this.name = 'MFARequiredError';
  }
}

// Utility Functions
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function parseJWT(token: string): any {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
}

export function validatePasswordPolicy(password: string, policy: PasswordPolicy): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters long`);
  }
  
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (policy.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (policy.requireSymbols && !/[^\w\s]/.test(password)) {
    errors.push('Password must contain at least one symbol');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export function generateSecurePassword(length: number = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return password;
}

export function hashPassword(password: string, salt?: string): string {
  // This is a placeholder - in real implementation, use bcrypt or similar
  const actualSalt = salt || Math.random().toString(36).substring(2, 15);
  return `${actualSalt}:${password}`; // Simplified for interface definition
}

export function verifyPassword(password: string, hash: string): boolean {
  // This is a placeholder - in real implementation, use bcrypt or similar
  const [salt, originalPassword] = hash.split(':');
  return password === originalPassword; // Simplified for interface definition
}
