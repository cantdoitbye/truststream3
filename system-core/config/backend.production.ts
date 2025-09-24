/**
 * Production Environment Configuration
 * Optimized for production deployment with high availability
 */

import { BackendConfiguration } from '../src/abstractions/backend-manager/types';

export const productionConfig: BackendConfiguration = {
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
      capabilities: {
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
          maxExecutionTime: 1000000,
          supportedRuntimes: ['deno']
        }
      },
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
      capabilities: {
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
      }
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
    healthCheckInterval: 15000, // 15 seconds
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
    failoverTimeout: 30000, // 30 seconds
    healthCheckRetries: 5,
    fallbackProviders: ['firebase-backup'],
    notificationEndpoints: [
      process.env.SLACK_WEBHOOK_URL || '',
      process.env.DISCORD_WEBHOOK_URL || ''
    ]
  }
};