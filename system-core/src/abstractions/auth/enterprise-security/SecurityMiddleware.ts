/**
 * Enterprise Security Middleware
 * 
 * Advanced security middleware with comprehensive protection features
 */

import { Request, Response, NextFunction } from 'express';
import { SecurityConfig, SecurityConfigManager } from './SecurityConfig';
import { EnhancedAuthService } from './EnhancedAuthService';
import { SecurityMonitoringService } from './SecurityMonitoringService';
import { ZeroTrustPolicyEngine, AccessRequest } from './ZeroTrustPolicyEngine';

export interface SecurityMiddlewareOptions {
  authService?: EnhancedAuthService;
  securityConfig?: SecurityConfigManager;
  monitoring?: SecurityMonitoringService;
  zeroTrust?: ZeroTrustPolicyEngine;
}

export interface SecurityHeaders {
  'X-Frame-Options'?: string;
  'X-Content-Type-Options'?: string;
  'X-XSS-Protection'?: string;
  'Strict-Transport-Security'?: string;
  'Content-Security-Policy'?: string;
  'Referrer-Policy'?: string;
  'Permissions-Policy'?: string;
  'Cross-Origin-Embedder-Policy'?: string;
  'Cross-Origin-Opener-Policy'?: string;
  'Cross-Origin-Resource-Policy'?: string;
  'X-Permitted-Cross-Domain-Policies'?: string;
  'Expect-CT'?: string;
  'Cache-Control'?: string;
  'X-Security-Level'?: string;
  'X-Request-ID'?: string;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
  standardHeaders: boolean;
  legacyHeaders: boolean;
}

export interface RequestValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: any;
}

/**
 * Enterprise Security Middleware
 */
export class SecurityMiddleware {
  private config: SecurityConfigManager;
  private authService?: EnhancedAuthService;
  private monitoring?: SecurityMonitoringService;
  private zeroTrust?: ZeroTrustPolicyEngine;
  private rateLimitStore = new Map<string, { count: number; resetTime: number }>();

  constructor(options: SecurityMiddlewareOptions) {
    this.config = options.securityConfig || new SecurityConfigManager();
    this.authService = options.authService;
    this.monitoring = options.monitoring;
    this.zeroTrust = options.zeroTrust;
  }

  /**
   * Enhanced security headers middleware - 100% Coverage
   */
  public securityHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
      const config = this.config.getConfig();
      const headers: SecurityHeaders = {};

      // ========================================
      // CRITICAL SECURITY HEADERS (100% Coverage)
      // ========================================

      // Prevent clickjacking attacks
      headers['X-Frame-Options'] = 'DENY';
      
      // Prevent MIME type sniffing
      headers['X-Content-Type-Options'] = 'nosniff';
      
      // XSS Protection (legacy browsers)
      headers['X-XSS-Protection'] = '1; mode=block';
      
      // Referrer Policy for privacy
      headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';

      // HSTS - HTTP Strict Transport Security
      if (config.headers.hsts.enabled) {
        const hsts = config.headers.hsts;
        let hstsValue = `max-age=${hsts.maxAge}`;
        if (hsts.includeSubDomains) hstsValue += '; includeSubDomains';
        if (hsts.preload) hstsValue += '; preload';
        headers['Strict-Transport-Security'] = hstsValue;
      } else {
        // Default HSTS for production
        headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
      }

      // Enhanced Content Security Policy
      if (config.headers.contentSecurityPolicy.enabled) {
        const csp = config.headers.contentSecurityPolicy;
        let cspValue = "default-src 'self'";
        
        if (csp.strictMode) {
          cspValue += "; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://*.supabase.co https://*.supabase.net; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests; object-src 'none'; worker-src 'self'; child-src 'none'";
        } else {
          cspValue += "; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://*.supabase.co https://*.supabase.net; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'";
        }
        
        if (csp.reportingEndpoint) {
          cspValue += `; report-uri ${csp.reportingEndpoint}`;
        }
        
        headers['Content-Security-Policy'] = cspValue;
      } else {
        // Default comprehensive CSP
        headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://*.supabase.co https://*.supabase.net; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests; object-src 'none'; worker-src 'self'; child-src 'none'";
      }

      // Permissions Policy (replaces deprecated Feature-Policy)
      if (config.headers.permissionsPolicy.enabled) {
        const restrictedFeatures = config.headers.permissionsPolicy.restrictedFeatures;
        const permissionsValue = restrictedFeatures.map(feature => `${feature}=()`).join(', ');
        headers['Permissions-Policy'] = permissionsValue;
      } else {
        // Default comprehensive permissions policy
        headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), encrypted-media=(), magnetometer=(), accelerometer=(), gyroscope=(), fullscreen=(), picture-in-picture=(), autoplay=(), display-capture=()';
      }

      // Cross-Origin Policies for enhanced isolation
      headers['Cross-Origin-Embedder-Policy'] = 'require-corp';
      headers['Cross-Origin-Opener-Policy'] = 'same-origin';
      headers['Cross-Origin-Resource-Policy'] = 'same-origin';

      // Additional Security Headers
      headers['X-Permitted-Cross-Domain-Policies'] = 'none';
      headers['Expect-CT'] = 'max-age=86400, enforce';

      // Cache Control for sensitive endpoints
      const sensitiveEndpoints = ['/api/auth/', '/admin/', '/api/gdpr/'];
      const isSensitive = sensitiveEndpoints.some(endpoint => req.path.includes(endpoint));
      
      if (isSensitive) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }

      // Security Response Headers
      res.setHeader('X-Security-Level', 'PRODUCTION');
      res.setHeader('X-Request-ID', crypto.randomUUID());

      // Remove server information leakage
      res.removeHeader('X-Powered-By');
      res.removeHeader('Server');

      // Set all security headers
      Object.entries(headers).forEach(([key, value]) => {
        if (value) {
          res.setHeader(key, value);
        }
      });

      next();
    };
  }

  /**
   * Advanced rate limiting middleware
   */
  public rateLimiting() {
    return (req: Request, res: Response, next: NextFunction) => {
      const config = this.config.getConfig();
      
      if (!config.apiSecurity.rateLimiting.enabled) {
        return next();
      }

      const key = this.getRateLimitKey(req);
      const now = Date.now();
      const windowMs = 60 * 60 * 1000; // 1 hour
      const limit = this.getRateLimit(req, config);

      let bucket = this.rateLimitStore.get(key);
      
      if (!bucket || now > bucket.resetTime) {
        bucket = {
          count: 0,
          resetTime: now + windowMs
        };
      }

      bucket.count++;
      this.rateLimitStore.set(key, bucket);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', limit.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - bucket.count).toString());
      res.setHeader('X-RateLimit-Reset', Math.ceil(bucket.resetTime / 1000).toString());

      if (bucket.count > limit) {
        // Log rate limit violation
        if (this.monitoring) {
          this.monitoring.recordSecurityEvent({
            type: 'RATE_LIMIT_EXCEEDED',
            timestamp: new Date(),
            ipAddress: this.getClientIP(req),
            userAgent: req.get('User-Agent'),
            metadata: {
              limit,
              current: bucket.count,
              endpoint: req.path
            }
          });
        }

        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests, please try again later',
          retryAfter: Math.ceil((bucket.resetTime - now) / 1000)
        });
      }

      next();
    };
  }

  /**
   * Request validation and sanitization middleware
   */
  public requestValidation() {
    return (req: Request, res: Response, next: NextFunction) => {
      const config = this.config.getConfig();
      
      if (!config.apiSecurity.requestValidation.enabled) {
        return next();
      }

      try {
        // Validate and sanitize request
        const validation = this.validateRequest(req);
        
        if (!validation.valid) {
          // Log validation failure
          if (this.monitoring) {
            this.monitoring.recordSecurityEvent({
              type: 'REQUEST_VALIDATION_FAILED',
              timestamp: new Date(),
              ipAddress: this.getClientIP(req),
              userAgent: req.get('User-Agent'),
              metadata: {
                errors: validation.errors,
                endpoint: req.path,
                method: req.method
              }
            });
          }

          return res.status(400).json({
            error: 'Request validation failed',
            errors: validation.errors
          });
        }

        // Apply sanitized data if available
        if (validation.sanitized) {
          req.body = validation.sanitized.body || req.body;
          req.query = validation.sanitized.query || req.query;
        }

        next();
      } catch (error) {
        res.status(500).json({
          error: 'Request validation error',
          message: 'An error occurred while validating the request'
        });
      }
    };
  }

  /**
   * Enhanced authentication middleware with Zero Trust
   */
  public authentication(options: { required?: boolean; roles?: string[] } = {}) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const token = this.extractToken(req);
        
        if (!token && options.required) {
          return res.status(401).json({
            error: 'Authentication required',
            message: 'A valid authentication token is required'
          });
        }

        if (token && this.authService) {
          const validation = await this.authService.validateSession(token);
          
          if (!validation.valid) {
            // Record failed authentication
            if (this.monitoring) {
              await this.monitoring.recordSecurityEvent({
                type: 'AUTHENTICATION_FAILED',
                timestamp: new Date(),
                ipAddress: this.getClientIP(req),
                userAgent: req.get('User-Agent'),
                metadata: {
                  reason: validation.error,
                  requiresStepUp: validation.requiresStepUp
                }
              });
            }

            const statusCode = validation.requiresStepUp ? 403 : 401;
            const message = validation.requiresStepUp ? 
              'Additional authentication required' : 
              'Invalid or expired token';

            return res.status(statusCode).json({
              error: 'Authentication failed',
              message,
              requiresStepUp: validation.requiresStepUp
            });
          }

          // Store user in request
          (req as any).user = validation.user;
          (req as any).session = { token };

          // Role-based access control
          if (options.roles && validation.user) {
            const userRoles = validation.user.roles || [];
            const hasRequiredRole = options.roles.some(role => userRoles.includes(role));
            
            if (!hasRequiredRole) {
              return res.status(403).json({
                error: 'Insufficient permissions',
                message: 'User does not have required role'
              });
            }
          }

          // Zero Trust evaluation for sensitive operations
          if (this.zeroTrust && this.isSensitiveOperation(req)) {
            const accessRequest: AccessRequest = {
              user: validation.user,
              resource: req.path,
              action: req.method.toLowerCase(),
              context: {
                ipAddress: this.getClientIP(req),
                userAgent: req.get('User-Agent') || '',
                deviceFingerprint: req.get('X-Device-Fingerprint') || 'unknown',
                timestamp: new Date(),
                sessionAge: 0 // Would calculate actual session age
              }
            };

            const decision = await this.zeroTrust.evaluateAccess(accessRequest);
            
            if (decision.decision === 'deny') {
              return res.status(403).json({
                error: 'Access denied',
                message: decision.reason,
                riskScore: decision.riskScore
              });
            } else if (decision.decision === 'step_up_auth') {
              return res.status(403).json({
                error: 'Additional authentication required',
                message: decision.reason,
                requiresStepUp: true,
                conditions: decision.conditions
              });
            }
          }
        }

        next();
      } catch (error) {
        res.status(500).json({
          error: 'Authentication error',
          message: 'An error occurred during authentication'
        });
      }
    };
  }

  /**
   * CORS middleware with strict configuration
   */
  public cors() {
    return (req: Request, res: Response, next: NextFunction) => {
      const config = this.config.getConfig();
      
      if (!config.apiSecurity.cors.enabled) {
        return next();
      }

      const origin = req.get('Origin');
      const allowedOrigins = this.getAllowedOrigins();

      // Strict origin checking
      if (config.apiSecurity.cors.strictOrigins && origin) {
        if (!allowedOrigins.includes(origin)) {
          return res.status(403).json({
            error: 'CORS policy violation',
            message: 'Origin not allowed'
          });
        }
        res.setHeader('Access-Control-Allow-Origin', origin);
      } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
      }

      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With, X-Device-Fingerprint');
      res.setHeader('Access-Control-Max-Age', '86400');
      
      if (config.apiSecurity.cors.credentialsAllowed) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }

      next();
    };
  }

  /**
   * SQL injection protection middleware
   */
  public sqlInjectionProtection() {
    return (req: Request, res: Response, next: NextFunction) => {
      const sqlPatterns = [
        /('|(\-\-)|(;)|(\||\|)|(\*|\*))/i,
        /(union|select|insert|delete|update|create|drop|exec|execute)/i,
        /(script|javascript|vbscript|onload|onerror|onclick)/i
      ];

      const checkForSQLInjection = (obj: any): boolean => {
        if (typeof obj === 'string') {
          return sqlPatterns.some(pattern => pattern.test(obj));
        }
        
        if (typeof obj === 'object' && obj !== null) {
          for (const key in obj) {
            if (checkForSQLInjection(obj[key])) {
              return true;
            }
          }
        }
        
        return false;
      };

      // Check query parameters, body, and headers
      const suspicious = 
        checkForSQLInjection(req.query) ||
        checkForSQLInjection(req.body) ||
        checkForSQLInjection(req.params);

      if (suspicious) {
        // Log potential SQL injection attempt
        if (this.monitoring) {
          this.monitoring.recordSecurityEvent({
            type: 'SQL_INJECTION_ATTEMPT',
            timestamp: new Date(),
            ipAddress: this.getClientIP(req),
            userAgent: req.get('User-Agent'),
            metadata: {
              endpoint: req.path,
              method: req.method,
              suspiciousData: {
                query: req.query,
                body: req.body,
                params: req.params
              }
            }
          });
        }

        return res.status(400).json({
          error: 'Invalid request',
          message: 'Request contains potentially malicious content'
        });
      }

      next();
    };
  }

  /**
   * XSS protection middleware
   */
  public xssProtection() {
    return (req: Request, res: Response, next: NextFunction) => {
      const xssPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /<iframe[^>]*>.*?<\/iframe>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<img[^>]+src[\s]*=[\s]*["']?[\s]*javascript:/gi
      ];

      const sanitizeString = (str: string): string => {
        return str.replace(/[<>"'&]/g, (match) => {
          const entities: { [key: string]: string } = {
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '&': '&amp;'
          };
          return entities[match] || match;
        });
      };

      const checkAndSanitize = (obj: any): any => {
        if (typeof obj === 'string') {
          const hasXSS = xssPatterns.some(pattern => pattern.test(obj));
          if (hasXSS) {
            return sanitizeString(obj);
          }
          return obj;
        }
        
        if (typeof obj === 'object' && obj !== null) {
          const sanitized: any = Array.isArray(obj) ? [] : {};
          for (const key in obj) {
            sanitized[key] = checkAndSanitize(obj[key]);
          }
          return sanitized;
        }
        
        return obj;
      };

      // Sanitize request data
      req.body = checkAndSanitize(req.body);
      req.query = checkAndSanitize(req.query);

      next();
    };
  }

  /**
   * Private helper methods
   */
  private getRateLimitKey(req: Request): string {
    const user = (req as any).user;
    const ip = this.getClientIP(req);
    
    // Use user ID if authenticated, otherwise IP address
    return user?.id || ip;
  }

  private getRateLimit(req: Request, config: SecurityConfig): number {
    const user = (req as any).user;
    
    // Different limits for authenticated vs anonymous users
    return user ? 
      config.apiSecurity.rateLimiting.perUserLimit : 
      config.apiSecurity.rateLimiting.globalLimit / 10; // Lower limit for anonymous
  }

  private getClientIP(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      '127.0.0.1'
    );
  }

  private extractToken(req: Request): string | null {
    const authHeader = req.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }

  private validateRequest(req: Request): RequestValidationResult {
    const errors: string[] = [];
    
    // Basic validation rules
    if (req.body && typeof req.body === 'object') {
      if (JSON.stringify(req.body).length > 1024 * 1024) { // 1MB limit
        errors.push('Request body too large');
      }
    }

    // Validate content type for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.get('Content-Type');
      if (!contentType || !contentType.includes('application/json')) {
        errors.push('Invalid content type');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private isSensitiveOperation(req: Request): boolean {
    const sensitiveOperations = [
      /\/admin\//,
      /\/api\/users\/delete/,
      /\/api\/auth\/password/,
      /\/api\/gdpr\//
    ];

    return sensitiveOperations.some(pattern => pattern.test(req.path));
  }

  private getAllowedOrigins(): string[] {
    // This would come from configuration
    return [
      'https://truststream.app',
      'https://admin.truststream.app',
      'http://localhost:3000',
      'http://localhost:5173'
    ];
  }
}

/**
 * Express middleware factory functions
 */
export const createSecurityMiddleware = (options: SecurityMiddlewareOptions = {}) => {
  const middleware = new SecurityMiddleware(options);
  
  return {
    // Core security middleware
    securityHeaders: middleware.securityHeaders(),
    rateLimiting: middleware.rateLimiting(),
    requestValidation: middleware.requestValidation(),
    cors: middleware.cors(),
    sqlInjectionProtection: middleware.sqlInjectionProtection(),
    xssProtection: middleware.xssProtection(),
    
    // Authentication middleware with options
    requireAuth: (roles?: string[]) => middleware.authentication({ required: true, roles }),
    optionalAuth: () => middleware.authentication({ required: false }),
    requireRole: (roles: string[]) => middleware.authentication({ required: true, roles }),
    
    // Combined middleware stack
    securityStack: () => [
      middleware.cors(),
      middleware.securityHeaders(),
      middleware.rateLimiting(),
      middleware.sqlInjectionProtection(),
      middleware.xssProtection(),
      middleware.requestValidation()
    ]
  };
};
