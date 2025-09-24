/**
 * AI Model Management System - Main Entry Point
 * 
 * This module provides a comprehensive AI model lifecycle management system
 * including deployment, monitoring, optimization, and A/B testing capabilities.
 */

// Core Service
export { AIModelManagementService } from './AIModelManagementService';

// Type Definitions
export type {
  AIModel,
  ModelLifecycle,
  ModelDeployment,
  PerformanceMetric,
  ABTest,
  ABTestResult,
  FineTuningJob,
  OptimizationRecommendation,
  ModelUsageAnalytics,
  ModelAlert,
  DeploymentOptions,
  FineTuningOptions,
  ABTestOptions,
  ModelMetrics,
  ModelHealthStatus,
  ModelComparisonResult,
  ModelOptimizationSuggestion,
  ModelEvent,
  ModelManagementConfig,
  ModelVersionInfo
} from './types';

// React Components
export { AIModelManagementDashboard } from './components/AIModelManagementDashboard';
export { ModelDeploymentManager } from './components/ModelDeploymentManager';
export { ModelPerformanceMonitor } from './components/ModelPerformanceMonitor';
export { ABTestManager } from './components/ABTestManager';
export { default as ModelOptimizationPanel } from './components/ModelOptimizationPanel';
export { default as ModelLifecycleView } from './components/ModelLifecycleView';

// Utility Functions
export {
  createDefaultConfig,
  validateDeploymentOptions,
  calculateMetricsAggregation,
  formatMetricValue,
  determineHealthStatus,
  generateOptimizationRecommendations
} from './utils';

// Constants
export {
  DEFAULT_PERFORMANCE_THRESHOLDS,
  DEPLOYMENT_ENVIRONMENTS,
  DEPLOYMENT_TYPES,
  METRIC_TYPES,
  ALERT_SEVERITIES,
  LIFECYCLE_STAGES,
  APPROVAL_STATUSES
} from './constants';

/**
 * Initialize the AI Model Management System
 * 
 * @param config - Configuration options for the system
 * @returns Initialized system instance
 * 
 * @example
 * ```typescript
 * import { initializeAIModelManagement } from './ai-model-management';
 * 
 * const modelManagement = await initializeAIModelManagement({
 *   supabaseUrl: 'https://your-project.supabase.co',
 *   supabaseKey: 'your-anon-key',
 *   defaultMonitoringInterval: 30000,
 *   performanceAlertThresholds: {
 *     latency_ms: 500,
 *     error_rate_percentage: 1.0,
 *     cost_spike_percentage: 50
 *   }
 * });
 * ```
 */
export async function initializeAIModelManagement(config: {
  supabaseUrl: string;
  supabaseKey: string;
  defaultMonitoringInterval?: number;
  performanceAlertThresholds?: {
    latency_ms: number;
    error_rate_percentage: number;
    cost_spike_percentage: number;
  };
  autoOptimizationEnabled?: boolean;
  abTestDefaults?: {
    significance_threshold: number;
    minimum_sample_size: number;
    default_duration_hours: number;
  };
}) {
  // This would initialize the backend services and return a configured instance
  // For now, we'll return a placeholder that demonstrates the intended interface
  
  console.log('Initializing AI Model Management System with config:', config);
  
  return {
    service: null, // Would be the actual service instance
    config,
    status: 'initialized',
    version: '1.0.0'
  };
}

/**
 * Quick start function for setting up a basic model management workflow
 * 
 * @param modelId - ID of the model to manage
 * @param options - Quick start options
 * 
 * @example
 * ```typescript
 * import { quickStartModelManagement } from './ai-model-management';
 * 
 * const workflow = await quickStartModelManagement('gpt-4-turbo', {
 *   environment: 'production',
 *   enableMonitoring: true,
 *   enableABTesting: true,
 *   deploymentStrategy: 'blue-green'
 * });
 * ```
 */
export async function quickStartModelManagement(
  modelId: string,
  options: {
    environment: 'development' | 'staging' | 'production';
    enableMonitoring?: boolean;
    enableABTesting?: boolean;
    deploymentStrategy?: 'direct' | 'blue-green' | 'canary' | 'rolling';
    performanceRequirements?: {
      latency_threshold?: number;
      availability_target?: number;
      throughput_target?: number;
    };
  }
) {
  console.log(`Quick starting model management for ${modelId}`, options);
  
  // This would:
  // 1. Create a model lifecycle
  // 2. Set up basic monitoring
  // 3. Configure deployment strategy
  // 4. Enable requested features
  
  return {
    modelId,
    lifecycleId: `lifecycle-${modelId}`,
    deploymentId: `deployment-${modelId}`,
    monitoringEnabled: options.enableMonitoring ?? true,
    abTestingEnabled: options.enableABTesting ?? false,
    status: 'ready'
  };
}

// Re-export commonly used utilities
export {
  // Would export utility functions here
} from './utils';

// Default export
export default {
  AIModelManagementService,
  initializeAIModelManagement,
  quickStartModelManagement
};