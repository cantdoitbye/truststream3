/**
 * Authentication Utilities
 * Helper functions for auth operations and validation
 */

import {
  User,
  Session,
  AuthError,
  PasswordPolicy,
  validatePasswordPolicy,
  isTokenExpired,
  parseJWT,
  generateSecurePassword
} from '../../shared-utils/auth-interface';

// Re-export utilities from shared-utils
export {
  validatePasswordPolicy,
  isTokenExpired,
  parseJWT,
  generateSecurePassword
} from '../../shared-utils/auth-interface';

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates phone number format (basic validation)
 */
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
}

/**
 * Generates a secure session token
 */
export function generateSessionToken(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2);
  const additionalRandom = Math.random().toString(36).substring(2);
  return `${timestamp}.${randomPart}.${additionalRandom}`;
}

/**
 * Creates a JWT-like token (simplified for mock purposes)
 */
export function createMockJWT(payload: any, expiresIn: number = 3600): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const expirationTime = Math.floor(Date.now() / 1000) + expiresIn;
  const body = btoa(JSON.stringify({ ...payload, exp: expirationTime, iat: Math.floor(Date.now() / 1000) }));
  const signature = btoa(`signature-${Date.now()}`);
  
  return `${header}.${body}.${signature}`;
}

/**
 * Validates user object structure
 */
export function validateUserObject(user: any): user is User {
  return (
    user &&
    typeof user === 'object' &&
    typeof user.id === 'string' &&
    typeof user.email === 'string' &&
    typeof user.emailConfirmed === 'boolean' &&
    user.createdAt instanceof Date &&
    user.updatedAt instanceof Date
  );
}

/**
 * Validates session object structure
 */
export function validateSessionObject(session: any): session is Session {
  return (
    session &&
    typeof session === 'object' &&
    typeof session.accessToken === 'string' &&
    typeof session.refreshToken === 'string' &&
    session.expiresAt instanceof Date &&
    validateUserObject(session.user)
  );
}

/**
 * Sanitizes user data by removing sensitive information
 */
export function sanitizeUser(user: User): Omit<User, 'metadata'> & { metadata?: Record<string, any> } {
  const { metadata, ...sanitized } = user;
  
  // Remove sensitive fields from metadata
  const cleanMetadata = metadata ? { ...metadata } : {};
  delete cleanMetadata.password;
  delete cleanMetadata.secretKey;
  delete cleanMetadata.privateKey;
  
  return {
    ...sanitized,
    metadata: Object.keys(cleanMetadata).length > 0 ? cleanMetadata : undefined
  };
}

/**
 * Checks if a session is expired
 */
export function isSessionExpired(session: Session): boolean {
  return session.expiresAt <= new Date();
}

/**
 * Calculates session time remaining in milliseconds
 */
export function getSessionTimeRemaining(session: Session): number {
  return Math.max(0, session.expiresAt.getTime() - Date.now());
}

/**
 * Checks if session is about to expire (within threshold)
 */
export function isSessionNearExpiry(session: Session, thresholdMinutes: number = 5): boolean {
  const thresholdMs = thresholdMinutes * 60 * 1000;
  return getSessionTimeRemaining(session) <= thresholdMs;
}

/**
 * Formats user display name
 */
export function formatUserDisplayName(user: User): string {
  if (user.name) {
    return user.name;
  }
  
  if (user.email) {
    return user.email.split('@')[0];
  }
  
  return `User ${user.id.substring(0, 8)}`;
}

/**
 * Generates avatar URL based on user info
 */
export function generateAvatarUrl(user: User, service: 'gravatar' | 'identicon' | 'robohash' = 'gravatar'): string {
  if (user.avatarUrl) {
    return user.avatarUrl;
  }
  
  const emailHash = user.email ? btoa(user.email.toLowerCase()).replace(/[^a-zA-Z0-9]/g, '') : user.id;
  
  switch (service) {
    case 'gravatar':
      return `https://www.gravatar.com/avatar/${emailHash}?d=identicon&s=200`;
    case 'identicon':
      return `https://identicon.org/${emailHash}.png`;
    case 'robohash':
      return `https://robohash.org/${emailHash}.png?size=200x200`;
    default:
      return `https://www.gravatar.com/avatar/${emailHash}?d=identicon&s=200`;
  }
}

/**
 * Validates password strength
 */
export function getPasswordStrength(password: string): {
  score: number;
  feedback: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
} {
  const feedback: string[] = [];
  let score = 0;
  
  // Length check
  if (password.length >= 8) score += 1;
  else feedback.push('Password should be at least 8 characters long');
  
  if (password.length >= 12) score += 1;
  
  // Character variety
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Add lowercase letters');
  
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Add uppercase letters');
  
  if (/\d/.test(password)) score += 1;
  else feedback.push('Add numbers');
  
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else feedback.push('Add special characters');
  
  // Common patterns check
  if (!/(.)\1{2,}/.test(password)) score += 1;
  else feedback.push('Avoid repeating characters');
  
  if (!/123|abc|qwe|password|admin/i.test(password)) score += 1;
  else feedback.push('Avoid common patterns');
  
  let strength: 'weak' | 'fair' | 'good' | 'strong';
  if (score <= 3) strength = 'weak';
  else if (score <= 5) strength = 'fair';
  else if (score <= 7) strength = 'good';
  else strength = 'strong';
  
  return { score, feedback, strength };
}

/**
 * Creates a password policy validator
 */
export function createPasswordValidator(policy: PasswordPolicy) {
  return (password: string): { valid: boolean; errors: string[] } => {
    return validatePasswordPolicy(password, policy);
  };
}

/**
 * Debounce function for auth operations
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for auth operations
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === maxRetries) {
        break;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Creates a timeout wrapper for async operations
 */
export function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new AuthError(errorMessage || 'Operation timed out', 'TIMEOUT', 408)),
        timeoutMs
      )
    )
  ]);
}

/**
 * Validates authentication configuration
 */
export function validateAuthConfig(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!config || typeof config !== 'object') {
    errors.push('Configuration must be an object');
    return { valid: false, errors };
  }
  
  if (!config.type) {
    errors.push('Provider type is required');
  }
  
  const validProviders = ['supabase', 'firebase', 'auth0', 'custom', 'mock'];
  if (config.type && !validProviders.includes(config.type)) {
    errors.push(`Invalid provider type. Must be one of: ${validProviders.join(', ')}`);
  }
  
  // Provider-specific validation
  switch (config.type) {
    case 'supabase':
      if (!config.supabase?.url) errors.push('Supabase URL is required');
      if (!config.supabase?.anonKey) errors.push('Supabase anonymous key is required');
      break;
    case 'firebase':
      if (!config.firebase?.apiKey) errors.push('Firebase API key is required');
      if (!config.firebase?.authDomain) errors.push('Firebase auth domain is required');
      if (!config.firebase?.projectId) errors.push('Firebase project ID is required');
      break;
    case 'auth0':
      if (!config.auth0?.domain) errors.push('Auth0 domain is required');
      if (!config.auth0?.clientId) errors.push('Auth0 client ID is required');
      break;
    case 'custom':
      if (!config.custom?.baseUrl) errors.push('Custom base URL is required');
      break;
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Creates a rate limiter for auth operations
 */
export function createRateLimiter(maxRequests: number, windowMs: number) {
  const requests = new Map<string, number[]>();
  
  return (identifier: string): { allowed: boolean; resetTime: number } => {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old requests
    const userRequests = requests.get(identifier) || [];
    const validRequests = userRequests.filter(time => time > windowStart);
    
    if (validRequests.length >= maxRequests) {
      return {
        allowed: false,
        resetTime: validRequests[0] + windowMs
      };
    }
    
    validRequests.push(now);
    requests.set(identifier, validRequests);
    
    return {
      allowed: true,
      resetTime: now + windowMs
    };
  };
}

/**
 * Generates secure backup codes for MFA
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    codes.push(code);
  }
  
  return codes;
}

/**
 * Validates MFA code format
 */
export function isValidMFACode(code: string, method: 'totp' | 'sms' | 'email' = 'totp'): boolean {
  switch (method) {
    case 'totp':
      return /^\d{6}$/.test(code);
    case 'sms':
    case 'email':
      return /^\d{4,8}$/.test(code);
    default:
      return false;
  }
}

/**
 * Creates a simple encryption/decryption utility (for demo purposes)
 * Note: In production, use proper encryption libraries
 */
export const createSimpleCrypto = (key: string) => {
  const encrypt = (text: string): string => {
    return btoa(text + key).split('').reverse().join('');
  };
  
  const decrypt = (encrypted: string): string => {
    try {
      const reversed = encrypted.split('').reverse().join('');
      const decoded = atob(reversed);
      return decoded.substring(0, decoded.length - key.length);
    } catch {
      throw new AuthError('Decryption failed', 'DECRYPTION_ERROR', 400);
    }
  };
  
  return { encrypt, decrypt };
};

/**
 * Helper to check if user has specific role
 */
export function userHasRole(user: User, roleName: string): boolean {
  return user.roles?.includes(roleName) || false;
}

/**
 * Helper to check if user has any of the specified roles
 */
export function userHasAnyRole(user: User, roleNames: string[]): boolean {
  return roleNames.some(role => userHasRole(user, role));
}

/**
 * Helper to check if user has all specified roles
 */
export function userHasAllRoles(user: User, roleNames: string[]): boolean {
  return roleNames.every(role => userHasRole(user, role));
}

/**
 * Creates a user permission checker
 */
export function createPermissionChecker(userPermissions: string[]) {
  return (requiredPermission: string): boolean => {
    return userPermissions.includes(requiredPermission);
  };
}

/**
 * Formats authentication error for display
 */
export function formatAuthError(error: any): string {
  if (error instanceof AuthError) {
    switch (error.code) {
      case 'INVALID_CREDENTIALS':
        return 'Invalid email or password';
      case 'EMAIL_NOT_CONFIRMED':
        return 'Please verify your email address';
      case 'ACCOUNT_LOCKED':
        return 'Account is temporarily locked';
      case 'MFA_REQUIRED':
        return 'Multi-factor authentication required';
      case 'TOKEN_EXPIRED':
        return 'Session has expired';
      default:
        return error.message || 'Authentication error';
    }
  }
  
  return error?.message || 'An unexpected error occurred';
}

/**
 * Creates a session storage helper
 */
export const createSessionStorage = (storageKey: string = 'auth_session') => {
  const isClient = typeof window !== 'undefined';
  
  const getSession = (): Session | null => {
    if (!isClient) return null;
    
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return null;
      
      const session = JSON.parse(stored);
      session.expiresAt = new Date(session.expiresAt);
      session.user.createdAt = new Date(session.user.createdAt);
      session.user.updatedAt = new Date(session.user.updatedAt);
      if (session.user.lastSignInAt) {
        session.user.lastSignInAt = new Date(session.user.lastSignInAt);
      }
      
      return validateSessionObject(session) ? session : null;
    } catch {
      return null;
    }
  };
  
  const setSession = (session: Session): void => {
    if (!isClient) return;
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(session));
    } catch (error) {
      console.warn('Failed to store session:', error);
    }
  };
  
  const clearSession = (): void => {
    if (!isClient) return;
    
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('Failed to clear session:', error);
    }
  };
  
  return { getSession, setSession, clearSession };
};
