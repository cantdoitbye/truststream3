/**
 * Backend Configuration Templates
 * Pre-configured templates for different deployment scenarios
 */

import { BackendConfiguration, BackendProvider } from './types';

export class BackendConfigurationTemplates {
  /**
   * Get development configuration with local/mock providers
   */
  static getDevelopmentConfiguration(): BackendConfiguration {
    return {
      version: '1.0.0',
      name: 'truststream-development',
      activeProvider: 'supabase-dev',
      providers: {
        'supabase-dev': {
          name: 'supabase-dev',
          type: 'supabase',
          enabled: true,
          priority: 1,
          database: {
            type: 'supabase',
            supabase: {
              url: process.env.SUPABASE_URL_DEV || 'http://localhost:54321',
              anonKey: process.env.SUPABASE_ANON_KEY_DEV || '',
              serviceRoleKey: process.env.SUPABASE_SERVICE_KEY_DEV || ''
            }
          },
          auth: {
            type: 'supabase',
            supabase: {
              url: process.env.SUPABASE_URL_DEV || 'http://localhost:54321',
              anonKey: process.env.SUPABASE_ANON_KEY_DEV || ''
            }
          },
          storage: {
            type: 'supabase',
            supabase: {
              url: process.env.SUPABASE_URL_DEV || 'http://localhost:54321',
              anonKey: process.env.SUPABASE_ANON_KEY_DEV || ''
            }
          },
          capabilities: this.getSupabaseCapabilities()
        },
        'mock': {
          name: 'mock',
          type: 'custom',
          enabled: true,
          priority: 0,
          database: {
            type: 'mock'
          },
          auth: {
            type: 'mock'
          },
          storage: {
            type: 'mock'
          },
          capabilities: this.getMockCapabilities()
        }
      },
      migration: {
        enableAutoMigration: true,
        migrationTimeout: 300000,
        backupBeforeMigration: true,
        verifyDataIntegrity: true,
        rollbackOnFailure: true,
        batchSize: 1000,
        parallelOperations: 4
      },
      monitoring: {
        enableHealthChecks: true,
        healthCheckInterval: 30000,
        enableMetrics: true,
        enableAlerting: false,
        alertThresholds: {
          responseTime: 5000,
          errorRate: 0.05,
          availability: 0.99
        }
      },
      failover: {
        enableAutoFailover: true,
        failoverTimeout: 60000,
        healthCheckRetries: 3,
        fallbackProviders: ['mock']
      }
    };
  }

  /**
   * Get production configuration with high availability
   */
  static getProductionConfiguration(): BackendConfiguration {
    return {
      version: '1.0.0',
      name: 'truststream-production',
      activeProvider: 'supabase-prod',
      providers: {
        'supabase-prod': {
          name: 'supabase-prod',
          type: 'supabase',
          enabled: true,
          priority: 1,
          database: {
            type: 'supabase',
            supabase: {
              url: process.env.SUPABASE_URL || '',
              anonKey: process.env.SUPABASE_ANON_KEY || '',
              serviceRoleKey: process.env.SUPABASE_SERVICE_KEY || ''
            },
            options: {
              poolSize: 20,
              timeout: 30000,
              retryAttempts: 3,
              maxConnections: 100
            }
          },
          auth: {
            type: 'supabase',
            supabase: {
              url: process.env.SUPABASE_URL || '',
              anonKey: process.env.SUPABASE_ANON_KEY || ''
            }
          },
          storage: {
            type: 'supabase',
            supabase: {
              url: process.env.SUPABASE_URL || '',
              anonKey: process.env.SUPABASE_ANON_KEY || ''
            }
          },
          capabilities: this.getSupabaseCapabilities(),
          limits: {
            database: {
              maxTableSize: 500000000, // 500GB
              maxQueryDuration: 300000, // 5 minutes
              maxConcurrentQueries: 200
            },
            storage: {
              maxStorageSize: 100000000000, // 100GB
              maxBandwidth: 200000000000, // 200GB
              maxRequests: 2500000 // 2.5M requests
            },
            auth: {
              maxUsers: 100000,
              maxLoginAttempts: 10
            }
          }
        },
        'firebase-backup': {
          name: 'firebase-backup',
          type: 'firebase',
          enabled: true,
          priority: 2,
          database: {
            type: 'firebase',
            firebase: {
              apiKey: process.env.FIREBASE_API_KEY || '',
              authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
              projectId: process.env.FIREBASE_PROJECT_ID || '',
              storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
              messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
              appId: process.env.FIREBASE_APP_ID || ''
            }
          },
          auth: {
            type: 'firebase',
            firebase: {
              apiKey: process.env.FIREBASE_API_KEY || '',
              authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
              projectId: process.env.FIREBASE_PROJECT_ID || '',
              storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
              messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
              appId: process.env.FIREBASE_APP_ID || ''
            }
          },
          storage: {
            type: 'firebase',
            firebase: {
              apiKey: process.env.FIREBASE_API_KEY || '',
              authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
              projectId: process.env.FIREBASE_PROJECT_ID || '',
              storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
              messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
              appId: process.env.FIREBASE_APP_ID || ''
            }
          },
          capabilities: this.getFirebaseCapabilities()
        }
      },
      migration: {
        enableAutoMigration: false, // Manual approval for production
        migrationTimeout: 600000, // 10 minutes
        backupBeforeMigration: true,
        verifyDataIntegrity: true,
        rollbackOnFailure: true,
        batchSize: 500,
        parallelOperations: 2
      },
      monitoring: {
        enableHealthChecks: true,
        healthCheckInterval: 15000,
        enableMetrics: true,
        enableAlerting: true,
        alertThresholds: {
          responseTime: 2000,
          errorRate: 0.01,
          availability: 0.999
        }
      },
      failover: {
        enableAutoFailover: true,
        failoverTimeout: 30000,
        healthCheckRetries: 5,
        fallbackProviders: ['firebase-backup'],
        notificationEndpoints: [process.env.SLACK_WEBHOOK_URL || '']
      }
    };
  }

  /**
   * Get high availability configuration with multiple providers
   */
  static getHighAvailabilityConfiguration(): BackendConfiguration {
    return {
      version: '1.0.0',
      name: 'truststream-ha',
      activeProvider: 'supabase-primary',
      providers: {
        'supabase-primary': {
          name: 'supabase-primary',
          type: 'supabase',
          enabled: true,
          priority: 1,
          database: {
            type: 'supabase',
            supabase: {
              url: process.env.SUPABASE_PRIMARY_URL || '',
              anonKey: process.env.SUPABASE_PRIMARY_ANON_KEY || '',
              serviceRoleKey: process.env.SUPABASE_PRIMARY_SERVICE_KEY || ''
            },
            options: {
              poolSize: 30,
              timeout: 20000,
              retryAttempts: 5,
              maxConnections: 200
            }
          },
          auth: {
            type: 'supabase',
            supabase: {
              url: process.env.SUPABASE_PRIMARY_URL || '',
              anonKey: process.env.SUPABASE_PRIMARY_ANON_KEY || ''
            }
          },
          storage: {
            type: 'supabase',
            supabase: {
              url: process.env.SUPABASE_PRIMARY_URL || '',
              anonKey: process.env.SUPABASE_PRIMARY_ANON_KEY || ''
            }
          },
          capabilities: this.getSupabaseCapabilities()
        },
        'supabase-secondary': {
          name: 'supabase-secondary',
          type: 'supabase',
          enabled: true,
          priority: 2,
          database: {
            type: 'supabase',
            supabase: {
              url: process.env.SUPABASE_SECONDARY_URL || '',
              anonKey: process.env.SUPABASE_SECONDARY_ANON_KEY || '',
              serviceRoleKey: process.env.SUPABASE_SECONDARY_SERVICE_KEY || ''
            }
          },
          auth: {
            type: 'supabase',
            supabase: {
              url: process.env.SUPABASE_SECONDARY_URL || '',
              anonKey: process.env.SUPABASE_SECONDARY_ANON_KEY || ''
            }
          },
          storage: {
            type: 'supabase',
            supabase: {
              url: process.env.SUPABASE_SECONDARY_URL || '',
              anonKey: process.env.SUPABASE_SECONDARY_ANON_KEY || ''
            }
          },
          capabilities: this.getSupabaseCapabilities()
        },
        'firebase-tertiary': {
          name: 'firebase-tertiary',
          type: 'firebase',
          enabled: true,
          priority: 3,
          database: {
            type: 'firebase',
            firebase: {
              apiKey: process.env.FIREBASE_API_KEY || '',
              authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
              projectId: process.env.FIREBASE_PROJECT_ID || '',
              storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
              messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
              appId: process.env.FIREBASE_APP_ID || ''
            }
          },
          auth: {
            type: 'firebase',
            firebase: {
              apiKey: process.env.FIREBASE_API_KEY || '',
              authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
              projectId: process.env.FIREBASE_PROJECT_ID || '',
              storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
              messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
              appId: process.env.FIREBASE_APP_ID || ''
            }
          },
          storage: {
            type: 'firebase',
            firebase: {
              apiKey: process.env.FIREBASE_API_KEY || '',
              authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
              projectId: process.env.FIREBASE_PROJECT_ID || '',
              storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
              messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
              appId: process.env.FIREBASE_APP_ID || ''
            }
          },
          capabilities: this.getFirebaseCapabilities()
        },
        'postgresql-emergency': {
          name: 'postgresql-emergency',
          type: 'postgresql',
          enabled: true,
          priority: 4,
          database: {
            type: 'postgresql',
            connection: {
              host: process.env.POSTGRES_HOST || 'localhost',
              port: parseInt(process.env.POSTGRES_PORT || '5432'),
              database: process.env.POSTGRES_DB || 'truststream',
              username: process.env.POSTGRES_USER || 'postgres',
              password: process.env.POSTGRES_PASSWORD || '',
              ssl: process.env.POSTGRES_SSL === 'true'
            }
          },
          auth: {
            type: 'custom' // Would need custom auth implementation
          },
          storage: {
            type: 'local' // Local file storage as emergency fallback
          },
          capabilities: this.getPostgreSQLCapabilities()
        }
      },
      migration: {
        enableAutoMigration: false,
        migrationTimeout: 1800000, // 30 minutes
        backupBeforeMigration: true,
        verifyDataIntegrity: true,
        rollbackOnFailure: true,
        batchSize: 100,
        parallelOperations: 1
      },
      monitoring: {
        enableHealthChecks: true,
        healthCheckInterval: 10000,
        enableMetrics: true,
        enableAlerting: true,
        alertThresholds: {
          responseTime: 1000,
          errorRate: 0.005,
          availability: 0.9999
        }
      },
      failover: {
        enableAutoFailover: true,
        failoverTimeout: 15000,
        healthCheckRetries: 3,
        fallbackProviders: ['supabase-secondary', 'firebase-tertiary', 'postgresql-emergency'],
        notificationEndpoints: [
          process.env.SLACK_WEBHOOK_URL || '',
          process.env.DISCORD_WEBHOOK_URL || '',
          process.env.EMAIL_NOTIFICATION_ENDPOINT || ''
        ]
      }
    };
  }

  /**
   * Get testing configuration for comprehensive testing
   */
  static getTestingConfiguration(): BackendConfiguration {
    return {
      version: '1.0.0',
      name: 'truststream-testing',
      activeProvider: 'mock',
      providers: {
        'mock': {
          name: 'mock',
          type: 'custom',
          enabled: true,
          priority: 1,
          database: {
            type: 'mock'
          },
          auth: {
            type: 'mock'
          },
          storage: {
            type: 'mock'
          },
          capabilities: this.getMockCapabilities()
        },
        'supabase-test': {
          name: 'supabase-test',
          type: 'supabase',
          enabled: true,
          priority: 2,
          database: {
            type: 'supabase',
            supabase: {
              url: process.env.SUPABASE_TEST_URL || '',
              anonKey: process.env.SUPABASE_TEST_ANON_KEY || '',
              serviceRoleKey: process.env.SUPABASE_TEST_SERVICE_KEY || ''
            }
          },
          auth: {
            type: 'supabase',
            supabase: {
              url: process.env.SUPABASE_TEST_URL || '',
              anonKey: process.env.SUPABASE_TEST_ANON_KEY || ''
            }
          },
          storage: {
            type: 'supabase',
            supabase: {
              url: process.env.SUPABASE_TEST_URL || '',
              anonKey: process.env.SUPABASE_TEST_ANON_KEY || ''
            }
          },
          capabilities: this.getSupabaseCapabilities()
        }
      },
      migration: {
        enableAutoMigration: true,
        migrationTimeout: 60000,
        backupBeforeMigration: false,
        verifyDataIntegrity: true,
        rollbackOnFailure: true,
        batchSize: 100,
        parallelOperations: 1
      },
      monitoring: {
        enableHealthChecks: true,
        healthCheckInterval: 5000,
        enableMetrics: true,
        enableAlerting: false,
        alertThresholds: {
          responseTime: 10000,
          errorRate: 0.1,
          availability: 0.9
        }
      },
      failover: {
        enableAutoFailover: false,
        failoverTimeout: 30000,
        healthCheckRetries: 1,
        fallbackProviders: []
      }
    };
  }

  // Capability definitions
  private static getSupabaseCapabilities() {
    return {
      database: {
        supportsTransactions: true,
        supportsReplication: true,
        supportsSharding: false,
        supportsBackup: true,
        maxConnections: 200,
        supportedFeatures: ['realtime', 'rls', 'functions', 'triggers']
      },
      auth: {
        supportsMFA: true,
        supportsSSO: true,
        supportsSocialAuth: true,
        supportsRoleManagement: true,
        maxSessions: 1000000,
        supportedProviders: ['email', 'google', 'github', 'apple', 'facebook']
      },
      storage: {
        supportsVersioning: false,
        supportsEncryption: true,
        supportsCDN: true,
        maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB
        supportedFormats: ['*']
      },
      realtime: {
        supportsChannels: true,
        supportsPresence: true,
        maxConcurrentConnections: 500,
        supportedProtocols: ['websocket']
      },
      edgeFunctions: {
        supportsScheduling: true,
        supportsWebhooks: true,
        maxExecutionTime: 1000000, // 1000 seconds
        supportedRuntimes: ['deno']
      }
    };
  }

  private static getFirebaseCapabilities() {
    return {
      database: {
        supportsTransactions: true,
        supportsReplication: true,
        supportsSharding: true,
        supportsBackup: true,
        maxConnections: 1000000,
        supportedFeatures: ['realtime', 'offline', 'security-rules']
      },
      auth: {
        supportsMFA: true,
        supportsSSO: true,
        supportsSocialAuth: true,
        supportsRoleManagement: true,
        maxSessions: 1000000,
        supportedProviders: ['email', 'google', 'facebook', 'twitter', 'github']
      },
      storage: {
        supportsVersioning: false,
        supportsEncryption: true,
        supportsCDN: true,
        maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB
        supportedFormats: ['*']
      },
      realtime: {
        supportsChannels: true,
        supportsPresence: true,
        maxConcurrentConnections: 100000,
        supportedProtocols: ['websocket']
      },
      edgeFunctions: {
        supportsScheduling: true,
        supportsWebhooks: true,
        maxExecutionTime: 60000,
        supportedRuntimes: ['node.js']
      }
    };
  }

  private static getPostgreSQLCapabilities() {
    return {
      database: {
        supportsTransactions: true,
        supportsReplication: true,
        supportsSharding: true,
        supportsBackup: true,
        maxConnections: 100,
        supportedFeatures: ['acid', 'jsonb', 'full-text-search', 'spatial']
      },
      auth: {
        supportsMFA: false,
        supportsSSO: false,
        supportsSocialAuth: false,
        supportsRoleManagement: false,
        maxSessions: 0,
        supportedProviders: []
      },
      storage: {
        supportsVersioning: false,
        supportsEncryption: false,
        supportsCDN: false,
        maxFileSize: 0,
        supportedFormats: []
      },
      realtime: {
        supportsChannels: false,
        supportsPresence: false,
        maxConcurrentConnections: 0,
        supportedProtocols: []
      },
      edgeFunctions: {
        supportsScheduling: false,
        supportsWebhooks: false,
        maxExecutionTime: 0,
        supportedRuntimes: []
      }
    };
  }

  private static getMockCapabilities() {
    return {
      database: {
        supportsTransactions: true,
        supportsReplication: false,
        supportsSharding: false,
        supportsBackup: false,
        maxConnections: 10,
        supportedFeatures: ['testing', 'in-memory']
      },
      auth: {
        supportsMFA: true,
        supportsSSO: true,
        supportsSocialAuth: true,
        supportsRoleManagement: true,
        maxSessions: 100,
        supportedProviders: ['mock']
      },
      storage: {
        supportsVersioning: false,
        supportsEncryption: false,
        supportsCDN: false,
        maxFileSize: 1024 * 1024, // 1MB
        supportedFormats: ['*']
      },
      realtime: {
        supportsChannels: true,
        supportsPresence: true,
        maxConcurrentConnections: 10,
        supportedProtocols: ['mock']
      },
      edgeFunctions: {
        supportsScheduling: true,
        supportsWebhooks: true,
        maxExecutionTime: 1000,
        supportedRuntimes: ['mock']
      }
    };
  }
}