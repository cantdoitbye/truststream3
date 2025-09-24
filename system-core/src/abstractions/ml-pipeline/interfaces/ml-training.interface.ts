/**
 * ML Training Interfaces
 * Defines types and interfaces for ML model training operations
 */

import { MLDataset, MLModelConfig } from './ml-data.interface';

// Training Job Types
export interface MLTrainingJob {
  id: string;
  name: string;
  description?: string;
  pipelineId: string;
  modelConfig: MLModelConfig;
  trainingConfig: MLTrainingConfiguration;
  dataConfig: MLTrainingDataConfig;
  computeConfig: MLTrainingComputeConfig;
  experimentConfig?: MLExperimentConfig;
  status: 'queued' | 'preparing' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: MLTrainingProgress;
  results?: MLTrainingResults;
  artifacts: MLTrainingArtifact[];
  metrics: MLTrainingMetrics;
  logs: MLTrainingLog[];
  error?: {
    message: string;
    stack?: string;
    phase?: string;
  };
  resourceUsage: MLResourceUsage;
  scheduling: MLTrainingScheduling;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number; // seconds
  createdBy: string;
  tags: string[];
  metadata: Record<string, any>;
}

export interface MLTrainingConfiguration {
  algorithm: string;
  framework: 'tensorflow' | 'pytorch' | 'scikit-learn' | 'xgboost' | 'lightgbm' | 'catboost' | 'custom';
  version?: string;
  parameters: MLTrainingParameters;
  hyperparameterTuning?: MLHyperparameterTuning;
  optimization: MLOptimizationConfig;
  regularization?: MLRegularizationConfig;
  validation: MLValidationConfig;
  callbacks?: MLTrainingCallback[];
  checkpointing: MLCheckpointConfig;
  earlyStoppingConfig?: MLEarlyStoppingConfig;
  distributedTraining?: MLDistributedTrainingConfig;
  mixedPrecision?: boolean;
  gradientAccumulation?: {
    enabled: boolean;
    steps: number;
  };
  reproducibility: {
    seed: number;
    deterministic: boolean;
  };
}

export interface MLTrainingParameters {
  epochs: number;
  batchSize: number;
  learningRate: number;
  weightDecay?: number;
  momentum?: number;
  beta1?: number;
  beta2?: number;
  epsilon?: number;
  amsgrad?: boolean;
  nestrov?: boolean;
  [key: string]: any; // Allow for framework-specific parameters
}

export interface MLHyperparameterTuning {
  enabled: boolean;
  method: 'grid_search' | 'random_search' | 'bayesian' | 'evolutionary' | 'optuna' | 'hyperopt';
  searchSpace: Record<string, MLHyperparameterRange>;
  objective: {
    metric: string;
    direction: 'minimize' | 'maximize';
  };
  maxTrials: number;
  maxDuration?: number; // seconds
  earlyStoppingConfig?: {
    enabled: boolean;
    minTrials: number;
    patience: number;
  };
  samplingStrategy?: {
    type: 'tpe' | 'random' | 'grid' | 'cmaes';
    config?: Record<string, any>;
  };
  pruning?: {
    enabled: boolean;
    algorithm: 'median' | 'asha' | 'hyperband';
    config?: Record<string, any>;
  };
}

export interface MLHyperparameterRange {
  type: 'float' | 'int' | 'categorical' | 'log_uniform' | 'uniform';
  low?: number;
  high?: number;
  values?: any[];
  step?: number;
  base?: number; // for log_uniform
}

export interface MLOptimizationConfig {
  optimizer: 'adam' | 'sgd' | 'rmsprop' | 'adagrad' | 'adadelta' | 'adamw' | 'custom';
  lossFunction: string;
  metrics: string[];
  customOptimizer?: {
    code: string;
    parameters: Record<string, any>;
  };
  customLoss?: {
    code: string;
    parameters: Record<string, any>;
  };
  customMetrics?: Array<{
    name: string;
    code: string;
    parameters?: Record<string, any>;
  }>;
}

export interface MLRegularizationConfig {
  l1?: number;
  l2?: number;
  dropout?: number;
  batchNormalization?: boolean;
  layerNormalization?: boolean;
  spectralNormalization?: boolean;
  gradientClipping?: {
    enabled: boolean;
    value: number;
    method: 'norm' | 'value';
  };
}

export interface MLValidationConfig {
  strategy: 'holdout' | 'k_fold' | 'stratified_k_fold' | 'time_series_split' | 'group_k_fold' | 'custom';
  testSize?: number;
  kFolds?: number;
  shuffle?: boolean;
  stratify?: boolean;
  groupColumn?: string;
  timeColumn?: string;
  validationSplit?: number;
  customSplitter?: {
    code: string;
    parameters?: Record<string, any>;
  };
  metrics: string[];
  scoringFunction?: string;
}

export interface MLTrainingCallback {
  name: string;
  type: 'model_checkpoint' | 'early_stopping' | 'reduce_lr' | 'tensorboard' | 'wandb' | 'custom';
  config: Record<string, any>;
  enabled: boolean;
  priority: number;
}

export interface MLCheckpointConfig {
  enabled: boolean;
  frequency: 'epoch' | 'batch' | 'time'; // Save frequency
  interval: number; // Every N epochs/batches or every N seconds
  saveWeightsOnly: boolean;
  saveBestOnly: boolean;
  monitorMetric?: string;
  mode?: 'min' | 'max' | 'auto';
  maxCheckpoints?: number; // Maximum number of checkpoints to keep
  path?: string;
}

export interface MLEarlyStoppingConfig {
  enabled: boolean;
  monitorMetric: string;
  patience: number;
  minDelta: number;
  mode: 'min' | 'max' | 'auto';
  baseline?: number;
  restoreBestWeights: boolean;
}

export interface MLDistributedTrainingConfig {
  enabled: boolean;
  strategy: 'data_parallel' | 'model_parallel' | 'pipeline_parallel' | 'hybrid';
  workers: number;
  gpusPerWorker?: number;
  communicationBackend?: 'nccl' | 'gloo' | 'mpi';
  synchronization: 'sync' | 'async';
  aggregationMethod?: 'average' | 'sum' | 'federated';
  faultTolerance?: {
    enabled: boolean;
    maxFailures: number;
    recoveryStrategy: 'restart' | 'ignore' | 'replace';
  };
}

export interface MLTrainingDataConfig {
  trainingDataset: string; // Dataset ID
  validationDataset?: string;
  testDataset?: string;
  dataLoading: {
    batchSize: number;
    shuffle: boolean;
    numWorkers: number;
    prefetchFactor?: number;
    pinMemory?: boolean;
    dropLast?: boolean;
  };
  augmentation?: MLDataAugmentation;
  sampling?: {
    strategy: 'none' | 'oversample' | 'undersample' | 'smote' | 'custom';
    config?: Record<string, any>;
  };
  preprocessing?: {
    normalize: boolean;
    standardize: boolean;
    customTransforms?: string[];
  };
}

export interface MLDataAugmentation {
  enabled: boolean;
  techniques: MLAugmentationTechnique[];
  probability: number; // Overall probability of applying augmentation
  sequential: boolean; // Apply techniques sequentially or randomly
}

export interface MLAugmentationTechnique {
  name: string;
  type: 'rotation' | 'flip' | 'crop' | 'noise' | 'brightness' | 'contrast' | 'dropout' | 'custom';
  probability: number;
  parameters: Record<string, any>;
  enabled: boolean;
}

export interface MLTrainingComputeConfig {
  type: 'local' | 'cloud' | 'cluster';
  resources: {
    cpu: number;
    memory: string; // e.g., '16GB'
    gpu?: {
      count: number;
      type?: string; // e.g., 'V100', 'A100'
      memory?: string;
    };
    storage: string;
  };
  environment: {
    runtime: string;
    image?: string;
    requirements: string[];
    environmentVariables?: Record<string, string>;
  };
  scaling?: {
    enabled: boolean;
    minNodes: number;
    maxNodes: number;
    scaleUpThreshold: number;
    scaleDownThreshold: number;
  };
  spot?: {
    enabled: boolean;
    maxPrice?: number;
    fallbackToOnDemand: boolean;
  };
}

export interface MLExperimentConfig {
  enabled: boolean;
  trackingService: 'mlflow' | 'wandb' | 'tensorboard' | 'custom';
  experimentName: string;
  runName?: string;
  tags?: Record<string, string>;
  logFrequency: {
    metrics: number; // Every N steps
    parameters: boolean;
    gradients: boolean;
    weights: boolean;
  };
  artifacts: {
    model: boolean;
    logs: boolean;
    plots: boolean;
    datasets: boolean;
  };
  comparison: {
    enabled: boolean;
    baselineRun?: string;
    comparisonMetrics: string[];
  };
}

// Training Progress and Results
export interface MLTrainingProgress {
  currentEpoch: number;
  totalEpochs: number;
  currentBatch?: number;
  totalBatches?: number;
  percentage: number;
  elapsedTime: number; // seconds
  estimatedTimeRemaining?: number; // seconds
  currentLoss?: number;
  currentMetrics?: Record<string, number>;
  bestMetrics?: Record<string, number>;
  learningRate?: number;
  memoryUsage?: {
    gpu?: number;
    cpu?: number;
  };
  throughput?: {
    samplesPerSecond: number;
    batchesPerSecond: number;
  };
}

export interface MLTrainingResults {
  success: boolean;
  finalMetrics: Record<string, number>;
  bestMetrics: Record<string, number>;
  trainingHistory: MLTrainingHistory;
  validationResults?: MLValidationResults;
  modelArtifacts: MLModelArtifact[];
  hyperparameterResults?: MLHyperparameterResults;
  convergenceAnalysis: MLConvergenceAnalysis;
  recommendations: MLTrainingRecommendation[];
  performanceAnalysis: MLPerformanceAnalysis;
}

export interface MLTrainingHistory {
  epochs: number[];
  metrics: Record<string, number[]>; // metric_name -> values per epoch
  losses: Record<string, number[]>; // loss_name -> values per epoch
  learningRates: number[];
  validationMetrics?: Record<string, number[]>;
  validationLosses?: Record<string, number[]>;
  timestamps: Date[];
}

export interface MLValidationResults {
  strategy: string;
  folds?: number;
  crossValidationScores: Record<string, number[]>;
  meanScores: Record<string, number>;
  stdScores: Record<string, number>;
  confusionMatrix?: number[][];
  classificationReport?: Record<string, any>;
  featureImportance?: Record<string, number>;
  predictionAnalysis?: {
    residuals?: number[];
    predictions?: number[];
    actuals?: number[];
  };
}

export interface MLModelArtifact {
  name: string;
  type: 'weights' | 'full_model' | 'onnx' | 'tflite' | 'torchscript' | 'custom';
  path: string;
  size: number;
  format: string;
  framework: string;
  version: string;
  checksum: string;
  metadata: Record<string, any>;
  performance?: Record<string, number>;
  compatibility: {
    frameworks: string[];
    pythonVersions: string[];
    platforms: string[];
  };
}

export interface MLHyperparameterResults {
  bestParameters: Record<string, any>;
  bestScore: number;
  totalTrials: number;
  completedTrials: number;
  prunedTrials: number;
  trialHistory: MLHyperparameterTrial[];
  optimizationHistory: {
    trials: number[];
    scores: number[];
    parameters: Record<string, any>[];
  };
  importanceAnalysis?: Record<string, number>;
  convergenceAnalysis?: {
    converged: boolean;
    plateauDetected: boolean;
    recommendedTrials: number;
  };
}

export interface MLHyperparameterTrial {
  trialId: string;
  parameters: Record<string, any>;
  score: number;
  status: 'completed' | 'pruned' | 'failed';
  duration: number;
  startTime: Date;
  endTime?: Date;
  intermediateValues?: number[];
  userAttributes?: Record<string, any>;
}

export interface MLConvergenceAnalysis {
  converged: boolean;
  convergenceEpoch?: number;
  earlyStoppedAt?: number;
  overfittingDetected: boolean;
  overfittingEpoch?: number;
  stagnationDetected: boolean;
  stagnationEpoch?: number;
  lossPatterns: {
    decreasing: boolean;
    oscillating: boolean;
    plateauing: boolean;
  };
  recommendations: string[];
}

export interface MLTrainingRecommendation {
  type: 'hyperparameter' | 'architecture' | 'data' | 'training_strategy' | 'optimization';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: {
    performance: number; // Expected improvement
    effort: number; // Implementation effort (1-10)
    confidence: number; // Confidence in recommendation (0-1)
  };
  implementation: {
    steps: string[];
    code?: string;
    resources?: string[];
  };
  evidence: {
    basedOn: string[];
    data: Record<string, any>;
  };
}

export interface MLPerformanceAnalysis {
  efficiency: {
    trainingSpeed: number; // samples/second
    memoryUtilization: number; // percentage
    gpuUtilization?: number; // percentage
    cpuUtilization: number; // percentage
  };
  scalability: {
    estimatedTimeForDataDoubling: number; // seconds
    estimatedMemoryForDataDoubling: number; // GB
    parallelizationEfficiency?: number;
  };
  resourceOptimization: {
    underutilizedResources: string[];
    bottlenecks: string[];
    recommendations: string[];
  };
  costAnalysis?: {
    totalCost: number;
    costPerEpoch: number;
    costPerSample: number;
    optimization: string[];
  };
}

// Training Events and Logs
export interface MLTrainingLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warning' | 'error';
  phase: 'initialization' | 'training' | 'validation' | 'evaluation' | 'cleanup';
  message: string;
  data?: Record<string, any>;
  epoch?: number;
  batch?: number;
}

export interface MLResourceUsage {
  cpu: {
    utilization: number; // percentage
    cores: number;
  };
  memory: {
    used: number; // GB
    available: number; // GB
    utilization: number; // percentage
  };
  gpu?: {
    utilization: number; // percentage
    memoryUsed: number; // GB
    memoryTotal: number; // GB
    temperature?: number; // Celsius
  };
  storage: {
    used: number; // GB
    available: number; // GB
  };
  network?: {
    bytesReceived: number;
    bytesSent: number;
    bandwidth: number; // Mbps
  };
  cost?: {
    compute: number;
    storage: number;
    network: number;
    total: number;
  };
}

export interface MLTrainingScheduling {
  priority: 'low' | 'normal' | 'high' | 'urgent';
  queuePosition?: number;
  estimatedStartTime?: Date;
  dependencies?: string[]; // Other job IDs that must complete first
  constraints?: {
    timeOfDay?: [number, number]; // Hours [start, end]
    daysOfWeek?: number[]; // 0-6, Sunday = 0
    maxDuration?: number; // seconds
    requiredResources?: Record<string, any>;
  };
  retryPolicy?: {
    enabled: boolean;
    maxRetries: number;
    backoffStrategy: 'linear' | 'exponential' | 'fixed';
    retryConditions: string[];
  };
}

export interface MLTrainingMetrics {
  realtime: Record<string, number>;
  history: Record<string, number[]>;
  aggregated: {
    min: Record<string, number>;
    max: Record<string, number>;
    mean: Record<string, number>;
    std: Record<string, number>;
  };
  custom: Record<string, any>;
}

export interface MLTrainingArtifact {
  name: string;
  type: 'model' | 'checkpoint' | 'logs' | 'plots' | 'metrics' | 'config' | 'custom';
  path: string;
  size: number;
  mimeType: string;
  description?: string;
  metadata: Record<string, any>;
  tags: string[];
  createdAt: Date;
}

// Training Service Interface
export interface IMLTrainingService {
  // Job Management
  createTrainingJob(config: Partial<MLTrainingJob>): Promise<string>;
  getTrainingJob(id: string): Promise<MLTrainingJob | null>;
  updateTrainingJob(id: string, updates: Partial<MLTrainingJob>): Promise<void>;
  deleteTrainingJob(id: string): Promise<void>;
  listTrainingJobs(filters?: Record<string, any>): Promise<MLTrainingJob[]>;
  
  // Job Execution
  startTraining(jobId: string): Promise<void>;
  pauseTraining(jobId: string): Promise<void>;
  resumeTraining(jobId: string): Promise<void>;
  stopTraining(jobId: string): Promise<void>;
  
  // Monitoring
  getTrainingProgress(jobId: string): Promise<MLTrainingProgress>;
  getTrainingMetrics(jobId: string): Promise<MLTrainingMetrics>;
  getTrainingLogs(jobId: string, options?: { limit?: number; level?: string }): Promise<MLTrainingLog[]>;
  
  // Results and Artifacts
  getTrainingResults(jobId: string): Promise<MLTrainingResults | null>;
  getTrainingArtifacts(jobId: string): Promise<MLTrainingArtifact[]>;
  downloadArtifact(jobId: string, artifactName: string): Promise<ArrayBuffer>;
  
  // Hyperparameter Tuning
  startHyperparameterTuning(config: MLHyperparameterTuning): Promise<string>;
  getHyperparameterResults(tuningJobId: string): Promise<MLHyperparameterResults>;
  
  // Resource Management
  getResourceUsage(jobId: string): Promise<MLResourceUsage>;
  getQueueStatus(): Promise<MLTrainingQueueStatus>;
  
  // Events
  onTrainingEvent(callback: (event: MLTrainingEvent) => void): () => void;
}

export interface MLTrainingQueueStatus {
  totalJobs: number;
  runningJobs: number;
  queuedJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageWaitTime: number; // seconds
  averageRunTime: number; // seconds
  resourceUtilization: {
    cpu: number;
    memory: number;
    gpu?: number;
  };
}

export interface MLTrainingEvent {
  type: 'job_created' | 'job_started' | 'job_completed' | 'job_failed' | 'job_paused' | 'epoch_completed' | 'metrics_updated';
  jobId: string;
  timestamp: Date;
  data: Record<string, any>;
  severity: 'info' | 'warning' | 'error';
}
