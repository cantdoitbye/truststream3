/**
 * Development Environment Configuration
 * Optimized for local development and testing
 */

import { BackendConfiguration } from '../src/abstractions/backend-manager/types';

export const developmentConfig: BackendConfiguration = {
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
        },
        options: {
          poolSize: 5,
          timeout: 10000,
          retryAttempts: 2,
          maxConnections: 10
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
      }
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
      capabilities: {
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
      }
    }
  },
  migration: {
    enableAutoMigration: true,
    migrationTimeout: 300000, // 5 minutes
    backupBeforeMigration: true,
    verifyDataIntegrity: true,
    rollbackOnFailure: true,
    batchSize: 1000,
    parallelOperations: 4
  },
  monitoring: {
    enableHealthChecks: true,
    healthCheckInterval: 30000, // 30 seconds
    enableMetrics: true,
    enableAlerting: false, // Disabled for development
    alertThresholds: {
      responseTime: 5000,
      errorRate: 0.05,
      availability: 0.99
    }
  },
  failover: {
    enableAutoFailover: true,
    failoverTimeout: 60000, // 1 minute
    healthCheckRetries: 3,
    fallbackProviders: ['mock']
  }
};