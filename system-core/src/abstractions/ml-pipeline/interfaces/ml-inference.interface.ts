/**
 * ML Inference Interfaces
 * Defines types and interfaces for ML model inference operations
 */

import { MLModelArtifact } from './ml-training.interface';

// Inference Service Types
export interface MLInferenceService {
  id: string;
  name: string;
  description?: string;
  modelId: string;
  version: string;
  endpoint: MLInferenceEndpoint;
  configuration: MLInferenceConfiguration;
  deployment: MLInferenceDeployment;
  monitoring: MLInferenceMonitoring;
  scaling: MLInferenceScaling;
  security: MLInferenceSecurity;
  performance: MLInferencePerformance;
  status: 'deploying' | 'active' | 'inactive' | 'updating' | 'error';
  health: MLInferenceHealth;
  metrics: MLInferenceMetrics;
  logs: MLInferenceLog[];
  createdAt: Date;
  updatedAt: Date;
  lastDeployedAt?: Date;
  createdBy: string;
  tags: string[];
  metadata: Record<string, any>;
}

export interface MLInferenceEndpoint {
  url: string;
  method: 'POST' | 'GET';
  protocol: 'http' | 'https' | 'grpc' | 'websocket';
  authentication: {
    type: 'none' | 'api_key' | 'jwt' | 'oauth' | 'custom';
    config?: Record<string, any>;
  };
  rateLimit?: {
    enabled: boolean;
    requestsPerMinute: number;
    burstSize: number;
  };
  cors?: {
    enabled: boolean;
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
  };
  requestFormat: MLInferenceRequestFormat;
  responseFormat: MLInferenceResponseFormat;
  documentation?: {
    openApiSpec?: string;
    examples?: MLInferenceExample[];
  };
}

export interface MLInferenceRequestFormat {
  contentType: 'application/json' | 'multipart/form-data' | 'application/octet-stream' | 'text/plain';
  schema: {
    type: 'object' | 'array' | 'string' | 'binary';
    properties?: Record<string, any>;
    required?: string[];
    examples?: any[];
  };
  preprocessing?: {
    enabled: boolean;
    steps: MLInferencePreprocessingStep[];
  };
  validation?: {
    enabled: boolean;
    rules: MLInferenceValidationRule[];
  };
}

export interface MLInferenceResponseFormat {
  contentType: 'application/json' | 'text/plain' | 'application/octet-stream';
  schema: {
    type: 'object' | 'array' | 'string' | 'number';
    properties?: Record<string, any>;
    examples?: any[];
  };
  postprocessing?: {
    enabled: boolean;
    steps: MLInferencePostprocessingStep[];
  };
  includeMetadata: boolean;
  includeProbabilities?: boolean;
  includeExplanations?: boolean;
}

export interface MLInferenceExample {
  name: string;
  description?: string;
  request: {
    headers?: Record<string, string>;
    body: any;
  };
  response: {
    status: number;
    headers?: Record<string, string>;
    body: any;
  };
}

export interface MLInferenceConfiguration {
  model: {
    artifact: MLModelArtifact;
    framework: string;
    runtime: string;
    optimizations?: {
      quantization?: boolean;
      pruning?: boolean;
      tensorRT?: boolean;
      onnxRuntime?: boolean;
    };
  };
  batching: {
    enabled: boolean;
    maxBatchSize: number;
    maxWaitTime: number; // milliseconds
    dynamicBatching: boolean;
  };
  caching: {
    enabled: boolean;
    strategy: 'lru' | 'lfu' | 'ttl' | 'custom';
    size: number; // MB
    ttl?: number; // seconds
    keyGeneration?: {
      includeInputHash: boolean;
      includeModelVersion: boolean;
      customFields?: string[];
    };
  };
  preprocessing: {
    enabled: boolean;
    steps: MLInferencePreprocessingStep[];
    parallelization: boolean;
  };
  postprocessing: {
    enabled: boolean;
    steps: MLInferencePostprocessingStep[];
  };
  fallback?: {
    enabled: boolean;
    strategy: 'previous_version' | 'default_response' | 'human_review';
    config?: Record<string, any>;
  };
}

export interface MLInferencePreprocessingStep {
  name: string;
  type: 'normalization' | 'resize' | 'tokenization' | 'encoding' | 'custom';
  config: Record<string, any>;
  enabled: boolean;
  order: number;
  errorHandling: 'skip' | 'error' | 'default';
}

export interface MLInferencePostprocessingStep {
  name: string;
  type: 'threshold' | 'top_k' | 'softmax' | 'denormalization' | 'formatting' | 'custom';
  config: Record<string, any>;
  enabled: boolean;
  order: number;
}

export interface MLInferenceValidationRule {
  name: string;
  type: 'type_check' | 'range_check' | 'format_check' | 'custom';
  config: Record<string, any>;
  action: 'warn' | 'error' | 'fix';
  enabled: boolean;
}

export interface MLInferenceDeployment {
  strategy: 'blue_green' | 'canary' | 'rolling' | 'immediate';
  environment: 'development' | 'staging' | 'production';
  infrastructure: {
    type: 'serverless' | 'container' | 'vm' | 'edge';
    provider: 'aws' | 'gcp' | 'azure' | 'local' | 'custom';
    config: Record<string, any>;
  };
  resources: {
    cpu: number;
    memory: string;
    gpu?: {
      enabled: boolean;
      type?: string;
      count?: number;
    };
    storage?: string;
  };
  networking: {
    loadBalancer: {
      enabled: boolean;
      type?: 'round_robin' | 'least_connections' | 'weighted';
    };
    cdn?: {
      enabled: boolean;
      provider?: string;
      config?: Record<string, any>;
    };
  };
  rollback: {
    enabled: boolean;
    automatic: boolean;
    triggers: string[];
    strategy: 'previous_version' | 'specific_version';
  };
}

export interface MLInferenceMonitoring {
  enabled: boolean;
  metrics: {
    performance: boolean;
    accuracy: boolean;
    dataQuality: boolean;
    resourceUsage: boolean;
    businessMetrics: boolean;
  };
  alerting: {
    enabled: boolean;
    channels: Array<{
      type: 'email' | 'webhook' | 'slack' | 'pagerduty';
      config: Record<string, any>;
    }>;
    thresholds: {
      latency?: number; // milliseconds
      errorRate?: number; // percentage
      throughput?: number; // requests per second
      accuracy?: number; // percentage
    };
  };
  logging: {
    level: 'debug' | 'info' | 'warning' | 'error';
    includeRequests: boolean;
    includeResponses: boolean;
    sampling: {
      enabled: boolean;
      rate: number; // 0-1
    };
  };
  tracing: {
    enabled: boolean;
    provider: 'jaeger' | 'zipkin' | 'opentelemetry' | 'custom';
    config?: Record<string, any>;
  };
}

export interface MLInferenceScaling {
  enabled: boolean;
  type: 'horizontal' | 'vertical' | 'hybrid';
  horizontal: {
    minInstances: number;
    maxInstances: number;
    targetCPUUtilization: number;
    targetMemoryUtilization: number;
    targetRequestRate?: number;
    scaleUpCooldown: number; // seconds
    scaleDownCooldown: number; // seconds
  };
  vertical: {
    enabled: boolean;
    cpuRange: [number, number];
    memoryRange: [string, string];
  };
  predictive: {
    enabled: boolean;
    method: 'moving_average' | 'exponential_smoothing' | 'arima' | 'lstm';
    lookAhead: number; // minutes
    trainingWindow: number; // hours
  };
}

export interface MLInferenceSecurity {
  encryption: {
    inTransit: boolean;
    atRest: boolean;
    keyManagement?: {
      provider: 'aws_kms' | 'azure_key_vault' | 'gcp_kms' | 'custom';
      config?: Record<string, any>;
    };
  };
  access: {
    authentication: boolean;
    authorization: {
      enabled: boolean;
      roles: string[];
      permissions: Record<string, string[]>;
    };
    ipWhitelist?: string[];
    geoblocking?: {
      enabled: boolean;
      allowedCountries: string[];
    };
  };
  compliance: {
    gdpr: boolean;
    hipaa: boolean;
    sox: boolean;
    custom?: string[];
  };
  auditLog: {
    enabled: boolean;
    includeInputs: boolean;
    includeOutputs: boolean;
    retention: number; // days
  };
}

export interface MLInferencePerformance {
  latency: {
    p50: number; // milliseconds
    p90: number;
    p95: number;
    p99: number;
    max: number;
  };
  throughput: {
    requestsPerSecond: number;
    peakRequestsPerSecond: number;
    averageRequestsPerMinute: number;
  };
  accuracy: {
    current?: number;
    baseline?: number;
    degradationThreshold?: number;
  };
  resourceUtilization: {
    cpu: number; // percentage
    memory: number; // percentage
    gpu?: number; // percentage
  };
  costMetrics?: {
    costPerRequest: number;
    totalCostPerDay: number;
    costPerPrediction: number;
  };
}

export interface MLInferenceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastChecked: Date;
  checks: {
    endpoint: 'healthy' | 'unhealthy';
    model: 'loaded' | 'loading' | 'error';
    dependencies: 'healthy' | 'degraded' | 'unhealthy';
    resources: 'healthy' | 'warning' | 'critical';
  };
  uptime: number; // seconds
  failureReasons?: string[];
}

export interface MLInferenceMetrics {
  realtime: {
    requestsPerSecond: number;
    averageLatency: number;
    errorRate: number;
    activeConnections: number;
  };
  historical: {
    hourly: Record<string, number[]>;
    daily: Record<string, number[]>;
    weekly: Record<string, number[]>;
  };
  business: Record<string, number>;
  custom: Record<string, any>;
}

export interface MLInferenceLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warning' | 'error';
  component: 'endpoint' | 'model' | 'preprocessing' | 'postprocessing' | 'monitoring';
  message: string;
  requestId?: string;
  duration?: number;
  data?: Record<string, any>;
  error?: {
    type: string;
    message: string;
    stack?: string;
  };
}

// Inference Request and Response Types
export interface MLInferenceRequest {
  id: string;
  timestamp: Date;
  serviceId: string;
  input: any;
  metadata?: {
    userId?: string;
    sessionId?: string;
    clientInfo?: Record<string, string>;
    custom?: Record<string, any>;
  };
  options?: {
    explanation?: boolean;
    confidence?: boolean;
    topK?: number;
    timeout?: number;
  };
  preprocessing?: {
    skip?: string[];
    custom?: Record<string, any>;
  };
}

export interface MLInferenceResponse {
  id: string;
  requestId: string;
  timestamp: Date;
  prediction: any;
  confidence?: number;
  probabilities?: Record<string, number>;
  explanation?: {
    method: string;
    importance: Record<string, number>;
    visualizations?: string[];
  };
  metadata: {
    modelVersion: string;
    latency: number;
    processingTime: number;
    queueTime?: number;
    cached: boolean;
    batchSize?: number;
  };
  warnings?: string[];
  errors?: string[];
}

// Batch Inference Types
export interface MLBatchInferenceJob {
  id: string;
  name: string;
  serviceId: string;
  inputSource: {
    type: 'storage' | 'database' | 'url';
    location: string;
    format: 'csv' | 'json' | 'parquet' | 'images';
    options?: Record<string, any>;
  };
  outputDestination: {
    type: 'storage' | 'database';
    location: string;
    format: 'csv' | 'json' | 'parquet';
    options?: Record<string, any>;
  };
  configuration: {
    batchSize: number;
    parallelism: number;
    timeout: number; // seconds
    retryPolicy: {
      maxRetries: number;
      backoffStrategy: 'linear' | 'exponential';
    };
  };
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    processed: number;
    successful: number;
    failed: number;
    percentage: number;
  };
  results?: {
    totalProcessed: number;
    successRate: number;
    averageLatency: number;
    outputLocation: string;
    errorSummary?: Record<string, number>;
  };
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  error?: string;
}

// Model Serving Types
export interface MLModelServer {
  id: string;
  name: string;
  type: 'tensorflow_serving' | 'torchserve' | 'triton' | 'mlflow' | 'custom';
  models: MLServedModel[];
  configuration: {
    maxModels: number;
    modelCacheSize: string;
    batchingConfig?: {
      maxBatchSize: number;
      batchTimeout: number;
    };
    optimizations?: {
      gpu: boolean;
      tensorRT: boolean;
      onnxRuntime: boolean;
    };
  };
  resources: {
    cpu: number;
    memory: string;
    gpu?: {
      count: number;
      type: string;
    };
  };
  health: {
    status: 'healthy' | 'unhealthy';
    modelsLoaded: number;
    memoryUsage: number;
    gpuUsage?: number;
  };
  metrics: {
    requestsPerSecond: number;
    averageLatency: number;
    modelSwitchTime: number;
  };
}

export interface MLServedModel {
  name: string;
  version: string;
  status: 'loading' | 'ready' | 'unloading' | 'error';
  framework: string;
  artifactPath: string;
  loadedAt?: Date;
  memoryUsage?: number;
  lastUsed?: Date;
  requestCount: number;
  averageLatency: number;
  errorRate: number;
}

// A/B Testing Types
export interface MLABTest {
  id: string;
  name: string;
  description?: string;
  variants: MLABTestVariant[];
  traffic: {
    allocation: Record<string, number>; // variant_id -> percentage
    targeting?: {
      rules: MLTargetingRule[];
      defaultVariant: string;
    };
  };
  metrics: {
    primary: string[];
    secondary: string[];
    custom: Record<string, string>;
  };
  configuration: {
    duration: number; // days
    minSampleSize: number;
    confidenceLevel: number;
    statisticalPower: number;
  };
  status: 'draft' | 'running' | 'completed' | 'paused' | 'cancelled';
  results?: MLABTestResults;
  startDate?: Date;
  endDate?: Date;
  createdBy: string;
  createdAt: Date;
}

export interface MLABTestVariant {
  id: string;
  name: string;
  description?: string;
  serviceId: string;
  isControl: boolean;
  configuration?: Record<string, any>;
}

export interface MLTargetingRule {
  type: 'user_attribute' | 'geo_location' | 'device_type' | 'custom';
  condition: string;
  value: any;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains' | 'regex';
}

export interface MLABTestResults {
  summary: {
    winner?: string;
    confidence: number;
    lift: number;
    significance: boolean;
  };
  variants: Record<string, {
    sampleSize: number;
    conversionRate: number;
    metrics: Record<string, number>;
    confidence: [number, number]; // confidence interval
  }>;
  statistical: {
    pValue: number;
    effect: number;
    power: number;
  };
  recommendations: string[];
}

// Service Interface
export interface IMLInferenceService {
  // Service Management
  createInferenceService(config: Partial<MLInferenceService>): Promise<string>;
  getInferenceService(id: string): Promise<MLInferenceService | null>;
  updateInferenceService(id: string, updates: Partial<MLInferenceService>): Promise<void>;
  deleteInferenceService(id: string): Promise<void>;
  listInferenceServices(filters?: Record<string, any>): Promise<MLInferenceService[]>;
  
  // Deployment
  deployService(id: string): Promise<void>;
  updateDeployment(id: string, config: Partial<MLInferenceDeployment>): Promise<void>;
  rollbackDeployment(id: string, version?: string): Promise<void>;
  
  // Inference
  predict(serviceId: string, request: MLInferenceRequest): Promise<MLInferenceResponse>;
  batchPredict(serviceId: string, requests: MLInferenceRequest[]): Promise<MLInferenceResponse[]>;
  
  // Batch Jobs
  createBatchJob(config: Partial<MLBatchInferenceJob>): Promise<string>;
  getBatchJob(id: string): Promise<MLBatchInferenceJob | null>;
  startBatchJob(id: string): Promise<void>;
  cancelBatchJob(id: string): Promise<void>;
  
  // Monitoring
  getServiceHealth(id: string): Promise<MLInferenceHealth>;
  getServiceMetrics(id: string, timeRange?: [Date, Date]): Promise<MLInferenceMetrics>;
  getServiceLogs(id: string, options?: { limit?: number; level?: string }): Promise<MLInferenceLog[]>;
  
  // A/B Testing
  createABTest(config: Partial<MLABTest>): Promise<string>;
  getABTest(id: string): Promise<MLABTest | null>;
  startABTest(id: string): Promise<void>;
  stopABTest(id: string): Promise<void>;
  getABTestResults(id: string): Promise<MLABTestResults | null>;
  
  // Events
  onInferenceEvent(callback: (event: MLInferenceEvent) => void): () => void;
}

export interface MLInferenceEvent {
  type: 'service_deployed' | 'prediction_made' | 'batch_job_completed' | 'health_check_failed' | 'ab_test_completed';
  serviceId: string;
  timestamp: Date;
  data: Record<string, any>;
  severity: 'info' | 'warning' | 'error';
}
