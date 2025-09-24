/**
 * ML Provider Interfaces
 * Defines the contract for ML backend providers
 */

import { IDatabaseService } from '../../shared-utils/database-interface';
import { IStorageService } from '../../shared-utils/storage-interface';
import { 
  MLPipelineConfig,
  MLPipelineRun,
  MLSystemHealth 
} from './ml-pipeline.interface';
import {
  MLDataset,
  MLDataProcessingJob,
  MLDataValidationResult
} from './ml-data.interface';
import {
  MLTrainingJob,
  MLModel,
  MLTrainingResult
} from './ml-training.interface';
import {
  MLInferenceJob,
  MLPredictionResult,
  MLInferenceEndpoint
} from './ml-inference.interface';
import {
  MLExperiment,
  MLExperimentRun,
  MLMetric
} from './ml-experiment.interface';

// Core ML Provider Interface
export interface IMLProvider {
  // Provider metadata
  readonly name: string;
  readonly version: string;
  readonly capabilities: MLProviderCapabilities;
  
  // Lifecycle
  initialize(config: MLProviderConfig): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getHealth(): Promise<MLSystemHealth>;
  
  // Data operations
  createDataset(dataset: Partial<MLDataset>): Promise<MLDataset>;
  getDataset(id: string): Promise<MLDataset | null>;
  updateDataset(id: string, updates: Partial<MLDataset>): Promise<void>;
  deleteDataset(id: string): Promise<void>;
  listDatasets(filters?: Record<string, any>): Promise<MLDataset[]>;
  processData(job: MLDataProcessingJob): Promise<MLDataValidationResult>;
  
  // Training operations
  createTrainingJob(job: Partial<MLTrainingJob>): Promise<MLTrainingJob>;
  startTraining(jobId: string): Promise<void>;
  stopTraining(jobId: string): Promise<void>;
  getTrainingStatus(jobId: string): Promise<MLTrainingJob>;
  getTrainingResult(jobId: string): Promise<MLTrainingResult | null>;
  
  // Model operations
  saveModel(model: Partial<MLModel>): Promise<MLModel>;
  loadModel(id: string): Promise<MLModel | null>;
  updateModel(id: string, updates: Partial<MLModel>): Promise<void>;
  deleteModel(id: string): Promise<void>;
  listModels(filters?: Record<string, any>): Promise<MLModel[]>;
  
  // Inference operations
  createInferenceEndpoint(endpoint: Partial<MLInferenceEndpoint>): Promise<MLInferenceEndpoint>;
  predict(endpointId: string, data: any): Promise<MLPredictionResult>;
  batchPredict(endpointId: string, data: any[]): Promise<MLPredictionResult[]>;
  getInferenceJob(jobId: string): Promise<MLInferenceJob | null>;
  
  // Experiment operations
  createExperiment(experiment: Partial<MLExperiment>): Promise<MLExperiment>;
  createExperimentRun(experimentId: string, run: Partial<MLExperimentRun>): Promise<MLExperimentRun>;
  logMetric(runId: string, metric: MLMetric): Promise<void>;
  logArtifact(runId: string, artifact: MLArtifact): Promise<void>;
  
  // Monitoring and observability
  getSystemMetrics(timeRange?: [Date, Date]): Promise<Record<string, any>>;
  getModelMetrics(modelId: string, timeRange?: [Date, Date]): Promise<Record<string, any>>;
  
  // Resource management
  allocateResources(requirements: MLResourceRequirements): Promise<MLResourceAllocation>;
  deallocateResources(allocationId: string): Promise<void>;
  getResourceUsage(): Promise<MLResourceUsage>;
}

// Provider capabilities
export interface MLProviderCapabilities {
  // Data capabilities
  dataTypes: string[]; // 'tabular', 'image', 'text', 'audio', 'video'
  dataFormats: string[]; // 'csv', 'json', 'parquet', 'numpy', etc.
  dataSources: string[]; // 'database', 'storage', 'api', 'stream'
  
  // Training capabilities
  frameworks: string[]; // 'tensorflow', 'pytorch', 'scikit-learn', etc.
  algorithms: string[]; // 'linear_regression', 'random_forest', etc.
  distributedTraining: boolean;
  hyperparameterTuning: boolean;
  autoML: boolean;
  
  // Inference capabilities
  realtimeInference: boolean;
  batchInference: boolean;
  modelServing: boolean;
  autoScaling: boolean;
  
  // Infrastructure capabilities
  computeTypes: string[]; // 'cpu', 'gpu', 'tpu'
  containerization: boolean;
  kubernetes: boolean;
  serverless: boolean;
  
  // MLOps capabilities
  experimentTracking: boolean;
  modelVersioning: boolean;
  dataVersioning: boolean;
  monitoring: boolean;
  alerting: boolean;
  autoRetraining: boolean;
  
  // Security capabilities
  encryption: boolean;
  accessControl: boolean;
  auditLogging: boolean;
  compliance: string[]; // 'GDPR', 'HIPAA', etc.
}

// Provider configuration
export interface MLProviderConfig {
  database: IDatabaseService;
  storage: IStorageService;
  
  // Provider-specific settings
  providerSettings: Record<string, any>;
  
  // Resource configuration
  defaultResources: {
    cpu: number;
    memory: string;
    storage: string;
    gpu?: {
      enabled: boolean;
      type?: string;
      count?: number;
    };
  };
  
  // Environment configuration
  environment: {
    runtime: string;
    pythonVersion?: string;
    requirements: string[];
    environmentVariables: Record<string, string>;
  };
  
  // Monitoring configuration
  monitoring: {
    enabled: boolean;
    metricsCollection: boolean;
    logsCollection: boolean;
    alerting: boolean;
  };
  
  // Security configuration
  security: {
    encryption: {
      atRest: boolean;
      inTransit: boolean;
      keyManagement?: string;
    };
    accessControl: {
      enabled: boolean;
      rbac: boolean;
      apiKeys: boolean;
    };
    compliance: {
      gdpr: boolean;
      auditLogging: boolean;
    };
  };
}

// Resource management
export interface MLResourceRequirements {
  cpu: number;
  memory: string;
  storage: string;
  gpu?: {
    count: number;
    type?: string;
    memory?: string;
  };
  duration?: number; // seconds
  priority: 'low' | 'normal' | 'high' | 'critical';
  labels?: Record<string, string>;
}

export interface MLResourceAllocation {
  id: string;
  requirements: MLResourceRequirements;
  allocatedAt: Date;
  expiresAt?: Date;
  status: 'pending' | 'allocated' | 'failed' | 'released';
  metadata: {
    nodeId?: string;
    containerId?: string;
    processId?: string;
  };
}

export interface MLResourceUsage {
  cpu: {
    used: number;
    available: number;
    percentage: number;
  };
  memory: {
    used: string;
    available: string;
    percentage: number;
  };
  storage: {
    used: string;
    available: string;
    percentage: number;
  };
  gpu?: {
    used: number;
    available: number;
    utilization: number;
    memory: {
      used: string;
      available: string;
      percentage: number;
    };
  };
  network?: {
    inbound: string;
    outbound: string;
  };
}

// Artifact management
export interface MLArtifact {
  name: string;
  type: 'model' | 'dataset' | 'plot' | 'report' | 'log' | 'config' | 'custom';
  path: string;
  size: number;
  mimeType: string;
  metadata: Record<string, any>;
  tags: string[];
  createdAt: Date;
  version?: string;
}

// Provider registry
export interface MLProviderRegistry {
  register(name: string, factory: MLProviderFactory): void;
  unregister(name: string): void;
  get(name: string): MLProviderFactory | null;
  list(): string[];
  getCapabilities(name: string): MLProviderCapabilities | null;
}

// Provider factory
export interface MLProviderFactory {
  create(config: MLProviderConfig): Promise<IMLProvider>;
  validate(config: MLProviderConfig): Promise<MLProviderValidationResult>;
  getCapabilities(): MLProviderCapabilities;
  getConfigSchema(): Record<string, any>;
}

export interface MLProviderValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// Provider errors
export class MLProviderError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider: string,
    public operation?: string,
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'MLProviderError';
  }
}

export class MLProviderConnectionError extends MLProviderError {
  constructor(provider: string, details?: string) {
    super(
      `Failed to connect to ML provider: ${provider}${details ? ` - ${details}` : ''}`,
      'PROVIDER_CONNECTION_ERROR',
      provider,
      'connect'
    );
  }
}

export class MLProviderConfigurationError extends MLProviderError {
  constructor(provider: string, field: string, details?: string) {
    super(
      `Invalid configuration for ML provider ${provider}: ${field}${details ? ` - ${details}` : ''}`,
      'PROVIDER_CONFIGURATION_ERROR',
      provider,
      'configure'
    );
  }
}

export class MLProviderResourceError extends MLProviderError {
  constructor(provider: string, resource: string, details?: string) {
    super(
      `Resource error in ML provider ${provider}: ${resource}${details ? ` - ${details}` : ''}`,
      'PROVIDER_RESOURCE_ERROR',
      provider,
      'resource'
    );
  }
}

// Type guards
export const isMLProvider = (obj: any): obj is IMLProvider => {
  return obj && 
    typeof obj === 'object' &&
    typeof obj.name === 'string' &&
    typeof obj.initialize === 'function' &&
    typeof obj.connect === 'function';
};

export const isMLProviderError = (error: any): error is MLProviderError => {
  return error instanceof MLProviderError;
};
