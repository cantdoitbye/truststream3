/**
 * ML Pipeline Core Interfaces
 * Defines the fundamental types and interfaces for ML pipeline operations
 */

import { IDatabaseService } from '../../shared-utils/database-interface';
import { IStorageService } from '../../shared-utils/storage-interface';

// Core ML Pipeline Types
export interface MLPipelineConfig {
  id: string;
  name: string;
  description?: string;
  type: 'training' | 'inference' | 'data_preprocessing' | 'model_evaluation' | 'hybrid';
  dataSource: MLDataSource;
  modelConfig: MLModelConfig;
  computeConfig: MLComputeConfig;
  storageConfig: MLStorageConfig;
  monitoringConfig?: MLMonitoringConfig;
  retrainingConfig?: MLRetrainingConfig;
  environmentConfig?: MLEnvironmentConfig;
  createdAt: Date;
  updatedAt: Date;
  version: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface MLDataSource {
  type: 'database' | 'storage' | 'api' | 'stream' | 'batch_upload';
  connection: {
    database?: {
      service: IDatabaseService;
      tables: string[];
      query?: string;
    };
    storage?: {
      service: IStorageService;
      paths: string[];
      format: 'csv' | 'json' | 'parquet' | 'numpy' | 'images' | 'text';
    };
    api?: {
      endpoint: string;
      method: 'GET' | 'POST';
      headers?: Record<string, string>;
      auth?: Record<string, any>;
    };
    stream?: {
      endpoint: string;
      protocol: 'websocket' | 'sse' | 'kafka' | 'rabbitmq';
      config?: Record<string, any>;
    };
  };
  preprocessing?: MLDataPreprocessingConfig;
  validation?: MLDataValidationConfig;
  refresh?: {
    enabled: boolean;
    interval: number; // seconds
    maxSize?: number;
    triggerConditions?: string[];
  };
}

export interface MLModelConfig {
  type: 'classification' | 'regression' | 'clustering' | 'nlp' | 'computer_vision' | 'custom';
  algorithm: string;
  framework: 'tensorflow' | 'pytorch' | 'scikit-learn' | 'xgboost' | 'custom';
  parameters: Record<string, any>;
  architecture?: {
    layers?: any[];
    customCode?: string;
    requirements?: string[];
  };
  trainingConfig: {
    epochs?: number;
    batchSize?: number;
    learningRate?: number;
    validationSplit?: number;
    earlyStoppingConfig?: {
      patience: number;
      metric: string;
      minDelta?: number;
    };
    optimizerConfig?: Record<string, any>;
    lossFunction?: string;
    metrics?: string[];
  };
  hyperparameterTuning?: {
    enabled: boolean;
    method: 'grid_search' | 'random_search' | 'bayesian' | 'evolutionary';
    searchSpace: Record<string, any>;
    maxTrials?: number;
    objective?: string;
  };
}

export interface MLComputeConfig {
  type: 'local' | 'cloud' | 'distributed';
  resources: {
    cpu?: number;
    memory?: string; // e.g., '8GB'
    gpu?: {
      enabled: boolean;
      type?: string;
      count?: number;
    };
    storage?: string;
  };
  scaling?: {
    enabled: boolean;
    minInstances?: number;
    maxInstances?: number;
    targetMetric?: string;
    targetValue?: number;
  };
  environment?: {
    runtime: string;
    requirements: string[];
    environmentVariables?: Record<string, string>;
    dockerImage?: string;
  };
}

export interface MLStorageConfig {
  dataStorage: {
    service: IStorageService;
    basePath: string;
    versioning: boolean;
    compression?: boolean;
    encryption?: boolean;
  };
  modelStorage: {
    service: IStorageService;
    basePath: string;
    versioning: boolean;
    compression?: boolean;
    registryIntegration?: boolean;
  };
  artifactStorage: {
    service: IStorageService;
    basePath: string;
    retentionPolicy?: {
      maxVersions?: number;
      maxAge?: number; // days
    };
  };
  caching?: {
    enabled: boolean;
    size?: string;
    ttl?: number; // seconds
  };
}

export interface MLMonitoringConfig {
  enabled: boolean;
  metrics: {
    performance: boolean;
    dataQuality: boolean;
    modelDrift: boolean;
    resourceUsage: boolean;
    businessMetrics?: string[];
  };
  alerting: {
    enabled: boolean;
    channels: Array<{
      type: 'email' | 'webhook' | 'slack';
      config: Record<string, any>;
    }>;
    thresholds: Record<string, number>;
  };
  dashboards?: {
    enabled: boolean;
    autoGenerate: boolean;
    customDashboards?: string[];
  };
}

export interface MLRetrainingConfig {
  enabled: boolean;
  triggers: Array<{
    type: 'schedule' | 'data_drift' | 'performance_degradation' | 'manual';
    config: Record<string, any>;
  }>;
  dataWindow: {
    size: number; // days
    sliding: boolean;
  };
  validation: {
    strategy: 'holdout' | 'cross_validation' | 'time_series_split';
    testSize?: number;
    minPerformanceThreshold?: number;
  };
  deployment: {
    strategy: 'replace' | 'blue_green' | 'canary' | 'shadow';
    rollbackPolicy?: {
      enabled: boolean;
      conditions: string[];
    };
  };
}

export interface MLEnvironmentConfig {
  isolation: 'process' | 'container' | 'vm';
  dependencies: {
    python?: string;
    packages: Record<string, string>;
    systemPackages?: string[];
  };
  secrets?: Record<string, string>;
  logging: {
    level: 'debug' | 'info' | 'warning' | 'error';
    format: 'json' | 'text';
    outputs: Array<'console' | 'file' | 'remote'>;
  };
}

// Data preprocessing interfaces
export interface MLDataPreprocessingConfig {
  steps: MLPreprocessingStep[];
  parallelization?: {
    enabled: boolean;
    workers?: number;
  };
  caching?: boolean;
}

export interface MLPreprocessingStep {
  name: string;
  type: 'normalization' | 'encoding' | 'feature_selection' | 'data_cleaning' | 'augmentation' | 'custom';
  config: Record<string, any>;
  enabled: boolean;
  order: number;
}

export interface MLDataValidationConfig {
  schema?: {
    columns: Record<string, {
      type: string;
      required: boolean;
      constraints?: Record<string, any>;
    }>;
  };
  qualityChecks: Array<{
    name: string;
    type: 'missing_values' | 'outliers' | 'duplicates' | 'consistency' | 'custom';
    config: Record<string, any>;
    threshold?: number;
    action: 'warn' | 'error' | 'fix';
  }>;
}

// Pipeline execution interfaces
export interface MLPipelineRun {
  id: string;
  pipelineId: string;
  version: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  duration?: number; // seconds
  triggeredBy: {
    type: 'manual' | 'schedule' | 'api' | 'event';
    userId?: string;
    source?: string;
  };
  configuration: MLPipelineConfig;
  steps: MLPipelineStep[];
  results?: MLPipelineResults;
  error?: {
    message: string;
    stack?: string;
    step?: string;
  };
  metrics?: Record<string, any>;
  artifacts?: MLPipelineArtifact[];
  logs?: string[];
  resourceUsage?: {
    cpu: number;
    memory: number;
    gpu?: number;
    storage: number;
    cost?: number;
  };
}

export interface MLPipelineStep {
  name: string;
  type: 'data_loading' | 'preprocessing' | 'training' | 'validation' | 'deployment' | 'monitoring' | 'custom';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  config: Record<string, any>;
  outputs?: Record<string, any>;
  error?: string;
  dependencies?: string[];
}

export interface MLPipelineResults {
  success: boolean;
  modelVersion?: string;
  performance?: Record<string, number>;
  dataStats?: Record<string, any>;
  validationResults?: Record<string, any>;
  deploymentStatus?: string;
  recommendations?: string[];
}

export interface MLPipelineArtifact {
  name: string;
  type: 'model' | 'dataset' | 'report' | 'visualization' | 'log' | 'config';
  path: string;
  size: number;
  mimeType: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

// Core ML Service Interfaces
export interface IMLPipelineService {
  // Pipeline Management
  createPipeline(config: MLPipelineConfig): Promise<string>;
  getPipeline(id: string): Promise<MLPipelineConfig | null>;
  updatePipeline(id: string, updates: Partial<MLPipelineConfig>): Promise<void>;
  deletePipeline(id: string): Promise<void>;
  listPipelines(filters?: Record<string, any>): Promise<MLPipelineConfig[]>;
  
  // Pipeline Execution
  runPipeline(id: string, options?: Record<string, any>): Promise<string>; // returns run ID
  stopPipeline(runId: string): Promise<void>;
  getPipelineRun(runId: string): Promise<MLPipelineRun | null>;
  listPipelineRuns(pipelineId: string, filters?: Record<string, any>): Promise<MLPipelineRun[]>;
  
  // Pipeline Scheduling
  schedulePipeline(id: string, schedule: string): Promise<void>;
  unschedulePipeline(id: string): Promise<void>;
  
  // Health and Monitoring
  getSystemHealth(): Promise<MLSystemHealth>;
  getPipelineMetrics(id: string, timeRange?: [Date, Date]): Promise<Record<string, any>>;
  
  // Event handling
  onPipelineEvent(callback: (event: MLPipelineEvent) => void): () => void;
}

export interface MLSystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  components: {
    database: 'healthy' | 'warning' | 'critical';
    storage: 'healthy' | 'warning' | 'critical';
    compute: 'healthy' | 'warning' | 'critical';
    monitoring: 'healthy' | 'warning' | 'critical';
  };
  activePipelines: number;
  queuedJobs: number;
  resources: {
    cpu: number;
    memory: number;
    storage: number;
  };
  errors: string[];
}

export interface MLPipelineEvent {
  type: 'pipeline_created' | 'pipeline_started' | 'pipeline_completed' | 'pipeline_failed' | 'pipeline_cancelled' | 'step_completed' | 'model_deployed';
  pipelineId: string;
  runId?: string;
  timestamp: Date;
  data: Record<string, any>;
  severity: 'info' | 'warning' | 'error';
}

// Error classes
export class MLPipelineError extends Error {
  constructor(
    message: string,
    public code?: string,
    public pipelineId?: string,
    public step?: string
  ) {
    super(message);
    this.name = 'MLPipelineError';
  }
}

export class MLConfigurationError extends MLPipelineError {
  constructor(message: string, pipelineId?: string) {
    super(message, 'CONFIGURATION_ERROR', pipelineId);
    this.name = 'MLConfigurationError';
  }
}

export class MLExecutionError extends MLPipelineError {
  constructor(message: string, pipelineId?: string, step?: string) {
    super(message, 'EXECUTION_ERROR', pipelineId, step);
    this.name = 'MLExecutionError';
  }
}

export class MLResourceError extends MLPipelineError {
  constructor(message: string, pipelineId?: string) {
    super(message, 'RESOURCE_ERROR', pipelineId);
    this.name = 'MLResourceError';
  }
}
