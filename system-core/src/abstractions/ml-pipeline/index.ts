/**
 * ML Pipeline Abstraction Layer - Main Export
 * Comprehensive MLOps and ML pipeline management
 */

// Core ML Pipeline Services
export { MLPipelineService, createMLPipelineService } from './MLPipelineService';
export { MLDataPipelineService } from './data/MLDataPipelineService';
export { MLTrainingService } from './training/MLTrainingService';
export { MLInferenceService } from './inference/MLInferenceService';
export { MLExperimentService } from './experiment/MLExperimentService';
export { MLDataVersioningService } from './versioning/MLDataVersioningService';
export { MLAutoRetrainingService } from './retraining/MLAutoRetrainingService';
export { MLOpsOrchestrator } from './orchestrator/MLOpsOrchestrator';

// Interfaces and Types
export * from './interfaces/ml-pipeline.interface';
export * from './interfaces/ml-data.interface';
export * from './interfaces/ml-training.interface';
export * from './interfaces/ml-inference.interface';
export * from './interfaces/ml-experiment.interface';
export * from './interfaces/ml-versioning.interface';

// Providers
export { MLProviderFactory } from './providers/MLProviderFactory';
export { SupabaseMLProvider } from './providers/SupabaseMLProvider';
export { MockMLProvider } from './providers/MockMLProvider';

// Configuration
export { MLConfigManager } from './config/MLConfigManager';

// Events
export { MLEventService } from './events/MLEventService';

// Utils
export * from './utils/ml-utils';

// Quick setup functions
export const setupMLPipeline = async (config: any) => {
  const service = createMLPipelineService();
  await service.initialize(config);
  return service;
};

// ML Pipeline configurations
export const ML_PIPELINE_PRESETS = {
  DEVELOPMENT: {
    dataStorage: 'mock',
    modelStorage: 'mock',
    experimentTracking: 'local',
    autoRetrain: false,
    enableLogging: true
  },
  PRODUCTION: {
    dataStorage: 'supabase',
    modelStorage: 'supabase',
    experimentTracking: 'database',
    autoRetrain: true,
    enableLogging: true
  },
  RESEARCH: {
    dataStorage: 'supabase',
    modelStorage: 'supabase',
    experimentTracking: 'database',
    autoRetrain: false,
    enableAdvancedTracking: true
  }
} as const;

// Export version
export const ML_PIPELINE_VERSION = '1.0.0';
