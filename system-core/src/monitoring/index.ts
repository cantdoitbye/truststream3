/**
 * Enhanced Monitoring and Analytics System
 * Backend-agnostic monitoring with AI performance analytics
 * 
 * @example
 * ```typescript
 * import { createAnalyticsService, LogLevel, EventType } from './monitoring';
 * 
 * const analytics = createAnalyticsService({
 *   backend: 'supabase',
 *   connection: {
 *     url: process.env.SUPABASE_URL,
 *     apiKey: process.env.SUPABASE_ANON_KEY
 *   },
 *   features: {
 *     enableAnomalyDetection: true,
 *     enablePredictions: true,
 *     enableSystemHealth: true
 *   }
 * });
 * 
 * await analytics.initialize();
 * 
 * // Log AI agent activity
 * await analytics.logAgentStart('agent-123', {
 *   userId: 'user-456',
 *   modelName: 'gpt-4',
 *   metadata: { task: 'document_analysis' }
 * });
 * 
 * // Track model performance
 * await analytics.trackModelInference('gpt-4', {
 *   duration: 1500,
 *   tokenCount: 150,
 *   success: true
 * });
 * 
 * // Get dashboard analytics
 * const dashboard = await analytics.getDashboardData({
 *   start: new Date(Date.now() - 24 * 60 * 60 * 1000),
 *   end: new Date()
 * });
 * ```
 */

// Core types and interfaces
export * from './types';

// Backend implementations
export { BaseMonitoringBackend } from './backends/base';
export { SupabaseMonitoringBackend } from './backends/supabase';

// Main analytics service
export { AnalyticsService, createAnalyticsService } from './analytics';

// Utility functions and helpers
export { MonitoringUtils } from './utils';

// Factory function for easy setup with different configurations
export function createMonitoringBackend(config: any) {
  switch (config.backend) {
    case 'supabase':
      return new SupabaseMonitoringBackend(config);
    default:
      throw new Error(`Unsupported backend: ${config.backend}`);
  }
}

/**
 * Quick setup function for common use cases
 */
export function quickSetup(options: {
  backend: 'supabase';
  url: string;
  apiKey: string;
  features?: {
    enableAnomalyDetection?: boolean;
    enablePredictions?: boolean;
    enableSystemHealth?: boolean;
    retentionDays?: number;
  };
}) {
  return createAnalyticsService({
    backend: options.backend,
    connection: {
      url: options.url,
      apiKey: options.apiKey
    },
    features: {
      enableAnomalyDetection: true,
      enablePredictions: true,
      enableSystemHealth: true,
      retentionDays: 30,
      ...options.features
    },
    batchSize: 100,
    flushInterval: 5000
  });
}
