/**
 * Enterprise Security Configuration
 * 
 * Centralized security configuration for enterprise-grade security features
 */

export interface SecurityConfig {
  // Zero Trust Configuration
  zeroTrust: {
    enabled: boolean;
    policyEngine: {
      strictMode: boolean;
      riskBasedAccess: boolean;
      deviceTrustRequired: boolean;
      locationRestrictions: boolean;
    };
    deviceVerification: {
      enabled: boolean;
      trustScoreThreshold: number;
      biometricRequired: boolean;
    };
  };

  // Enhanced Authentication
  authentication: {
    passwordlessEnabled: boolean;
    passkeysEnabled: boolean;
    biometricEnabled: boolean;
    sessionTimeout: number;
    concurrentSessionLimit: number;
    ipWhitelisting: {
      enabled: boolean;
      allowedRanges: string[];
    };
  };

  // Advanced Authorization
  authorization: {
    rbacEnabled: boolean;
    abacEnabled: boolean;
    permissionCaching: {
      enabled: boolean;
      ttl: number;
    };
    riskBasedDecisions: boolean;
  };

  // Security Monitoring
  monitoring: {
    threatDetection: {
      enabled: boolean;
      realTimeAlerts: boolean;
      anomalyDetection: boolean;
      behavioralAnalysis: boolean;
    };
    auditLogging: {
      enabled: boolean;
      logLevel: 'minimal' | 'standard' | 'comprehensive';
      retentionDays: number;
    };
    siem: {
      enabled: boolean;
      provider: 'elastic' | 'splunk' | 'qradar' | 'custom';
      alertWebhooks: string[];
    };
  };

  // Compliance Framework
  compliance: {
    gdprEnhanced: {
      automatedConsentManagement: boolean;
      dataMinimization: boolean;
      anonymizationSchedule: string;
      retentionPolicies: {
        [dataType: string]: number; // days
      };
    };
    iso27001: {
      enabled: boolean;
      controlsMonitoring: boolean;
      incidentResponsePlan: boolean;
    };
    soc2: {
      enabled: boolean;
      continuousMonitoring: boolean;
      evidenceCollection: boolean;
    };
  };

  // Security Headers
  headers: {
    contentSecurityPolicy: {
      enabled: boolean;
      strictMode: boolean;
      reportingEndpoint?: string;
    };
    hsts: {
      enabled: boolean;
      maxAge: number;
      includeSubDomains: boolean;
      preload: boolean;
    };
    permissionsPolicy: {
      enabled: boolean;
      restrictedFeatures: string[];
    };
  };

  // API Security
  apiSecurity: {
    rateLimiting: {
      enabled: boolean;
      globalLimit: number;
      perUserLimit: number;
      burstLimit: number;
    };
    requestValidation: {
      enabled: boolean;
      schemaValidation: boolean;
      sanitization: boolean;
    };
    cors: {
      enabled: boolean;
      strictOrigins: boolean;
      credentialsAllowed: boolean;
    };
  };
}

export const defaultSecurityConfig: SecurityConfig = {
  zeroTrust: {
    enabled: true,
    policyEngine: {
      strictMode: true,
      riskBasedAccess: true,
      deviceTrustRequired: true,
      locationRestrictions: false
    },
    deviceVerification: {
      enabled: true,
      trustScoreThreshold: 0.8,
      biometricRequired: false
    }
  },
  authentication: {
    passwordlessEnabled: true,
    passkeysEnabled: true,
    biometricEnabled: true,
    sessionTimeout: 3600000, // 1 hour
    concurrentSessionLimit: 5,
    ipWhitelisting: {
      enabled: false,
      allowedRanges: []
    }
  },
  authorization: {
    rbacEnabled: true,
    abacEnabled: true,
    permissionCaching: {
      enabled: true,
      ttl: 300000 // 5 minutes
    },
    riskBasedDecisions: true
  },
  monitoring: {
    threatDetection: {
      enabled: true,
      realTimeAlerts: true,
      anomalyDetection: true,
      behavioralAnalysis: true
    },
    auditLogging: {
      enabled: true,
      logLevel: 'comprehensive',
      retentionDays: 2555 // 7 years for compliance
    },
    siem: {
      enabled: true,
      provider: 'elastic',
      alertWebhooks: []
    }
  },
  compliance: {
    gdprEnhanced: {
      automatedConsentManagement: true,
      dataMinimization: true,
      anonymizationSchedule: '0 2 * * 0', // Weekly Sunday 2 AM
      retentionPolicies: {
        'user_data': 2555, // 7 years
        'audit_logs': 2555,
        'session_data': 30,
        'analytics_data': 730 // 2 years
      }
    },
    iso27001: {
      enabled: true,
      controlsMonitoring: true,
      incidentResponsePlan: true
    },
    soc2: {
      enabled: true,
      continuousMonitoring: true,
      evidenceCollection: true
    }
  },
  headers: {
    contentSecurityPolicy: {
      enabled: true,
      strictMode: true,
      reportingEndpoint: '/api/security/csp-reports'
    },
    hsts: {
      enabled: true,
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    permissionsPolicy: {
      enabled: true,
      restrictedFeatures: [
        'geolocation', 'camera', 'microphone', 'payment',
        'usb', 'magnetometer', 'gyroscope'
      ]
    }
  },
  apiSecurity: {
    rateLimiting: {
      enabled: true,
      globalLimit: 10000, // per hour
      perUserLimit: 1000, // per hour
      burstLimit: 100 // per minute
    },
    requestValidation: {
      enabled: true,
      schemaValidation: true,
      sanitization: true
    },
    cors: {
      enabled: true,
      strictOrigins: true,
      credentialsAllowed: false
    }
  }
};

/**
 * Security Configuration Manager
 */
export class SecurityConfigManager {
  private config: SecurityConfig;
  private environment: 'development' | 'staging' | 'production';

  constructor(config?: Partial<SecurityConfig>, environment = 'production') {
    this.environment = environment;
    this.config = this.mergeConfig(defaultSecurityConfig, config || {});
    this.validateConfig();
  }

  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<SecurityConfig>): void {
    this.config = this.mergeConfig(this.config, updates);
    this.validateConfig();
  }

  isFeatureEnabled(feature: string): boolean {
    const keys = feature.split('.');
    let current: any = this.config;
    
    for (const key of keys) {
      if (current[key] === undefined) {
        return false;
      }
      current = current[key];
    }
    
    return Boolean(current);
  }

  getEnvironmentConfig(): Partial<SecurityConfig> {
    switch (this.environment) {
      case 'development':
        return {
          zeroTrust: {
            ...this.config.zeroTrust,
            policyEngine: {
              ...this.config.zeroTrust.policyEngine,
              strictMode: false
            }
          },
          monitoring: {
            ...this.config.monitoring,
            auditLogging: {
              ...this.config.monitoring.auditLogging,
              logLevel: 'minimal'
            }
          }
        };
      case 'staging':
        return {
          zeroTrust: {
            ...this.config.zeroTrust,
            policyEngine: {
              ...this.config.zeroTrust.policyEngine,
              strictMode: true
            }
          }
        };
      case 'production':
      default:
        return this.config;
    }
  }

  private mergeConfig(base: SecurityConfig, override: Partial<SecurityConfig>): SecurityConfig {
    const merged = { ...base };
    
    for (const [key, value] of Object.entries(override)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        merged[key as keyof SecurityConfig] = {
          ...merged[key as keyof SecurityConfig],
          ...value
        } as any;
      } else {
        (merged as any)[key] = value;
      }
    }
    
    return merged;
  }

  private validateConfig(): void {
    // Validate session timeout
    if (this.config.authentication.sessionTimeout < 300000) { // 5 minutes minimum
      throw new Error('Session timeout must be at least 5 minutes');
    }

    // Validate trust score threshold
    if (this.config.zeroTrust.deviceVerification.trustScoreThreshold < 0 || 
        this.config.zeroTrust.deviceVerification.trustScoreThreshold > 1) {
      throw new Error('Device trust score threshold must be between 0 and 1');
    }

    // Validate retention days
    if (this.config.monitoring.auditLogging.retentionDays < 1) {
      throw new Error('Audit log retention must be at least 1 day');
    }

    // Validate rate limits
    if (this.config.apiSecurity.rateLimiting.perUserLimit > this.config.apiSecurity.rateLimiting.globalLimit) {
      throw new Error('Per-user rate limit cannot exceed global rate limit');
    }
  }
}

export const securityConfig = new SecurityConfigManager();
