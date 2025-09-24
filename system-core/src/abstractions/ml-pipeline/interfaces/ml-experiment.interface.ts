/**
 * ML Experiment Interfaces
 * Defines types and interfaces for ML experiment tracking and management
 */

import { MLTrainingJob, MLTrainingResults } from './ml-training.interface';
import { MLDataset } from './ml-data.interface';

// Experiment Types
export interface MLExperiment {
  id: string;
  name: string;
  description?: string;
  projectId?: string;
  type: 'single_run' | 'hyperparameter_tuning' | 'comparison' | 'ablation' | 'research';
  objectives: MLExperimentObjective[];
  configuration: MLExperimentConfiguration;
  runs: MLExperimentRun[];
  status: 'planning' | 'running' | 'completed' | 'paused' | 'cancelled';
  metadata: {
    tags: string[];
    collaborators: string[];
    budget?: {
      computational: number;
      monetary: number;
      time: number; // hours
    };
    priority: 'low' | 'medium' | 'high' | 'critical';
    reproducibility: {
      seed: number;
      environment: Record<string, string>;
      dependencies: Record<string, string>;
    };
  };
  analysis: MLExperimentAnalysis;
  insights: MLExperimentInsight[];
  artifacts: MLExperimentArtifact[];
  timeline: MLExperimentTimelineEvent[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  createdBy: string;
}

export interface MLExperimentObjective {
  name: string;
  type: 'minimize' | 'maximize';
  metric: string;
  weight?: number;
  threshold?: {
    value: number;
    direction: 'above' | 'below';
  };
  priority: 'primary' | 'secondary';
}

export interface MLExperimentConfiguration {
  baselineRun?: string;
  comparisonStrategy: 'best_vs_baseline' | 'all_vs_baseline' | 'pairwise' | 'tournament';
  trackingConfig: {
    metrics: string[];
    parameters: string[];
    artifacts: string[];
    frequency: {
      metrics: number; // steps
      artifacts: number; // epochs
    };
    storage: {
      location: string;
      compression: boolean;
      retention: number; // days
    };
  };
  validation: {
    strategy: 'cross_validation' | 'holdout' | 'time_series' | 'bootstrap';
    folds?: number;
    testSize?: number;
    statisticalTests: string[];
  };
  earlyTermination?: {
    enabled: boolean;
    patience: number;
    minRuns: number;
    criteria: string[];
  };
  resourceLimits?: {
    maxRuns: number;
    maxDuration: number; // hours
    maxCost: number;
    maxConcurrency: number;
  };
}

export interface MLExperimentRun {
  id: string;
  experimentId: string;
  name?: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'terminated';
  trainingJobId?: string;
  parameters: Record<string, any>;
  metrics: MLRunMetrics;
  artifacts: MLRunArtifact[];
  logs: MLRunLog[];
  environment: {
    platform: string;
    pythonVersion: string;
    dependencies: Record<string, string>;
    hardware: {
      cpu: string;
      memory: string;
      gpu?: string;
    };
    container?: {
      image: string;
      tag: string;
    };
  };
  dataset: {
    training: string; // dataset ID
    validation?: string;
    test?: string;
    preprocessing?: string[];
  };
  model: {
    architecture: string;
    framework: string;
    version: string;
    size?: number; // bytes
    checksum?: string;
  };
  timing: {
    queued: Date;
    started?: Date;
    completed?: Date;
    duration?: number; // seconds
    phases: Record<string, number>; // phase -> duration
  };
  resources: {
    cpu: {
      cores: number;
      utilization: number; // percentage
    };
    memory: {
      allocated: string;
      peak: string;
      utilization: number;
    };
    gpu?: {
      type: string;
      count: number;
      utilization: number;
      memory: string;
    };
    cost?: {
      compute: number;
      storage: number;
      total: number;
    };
  };
  notes?: string;
  tags: string[];
  parentRun?: string;
  childRuns?: string[];
  createdBy: string;
}

export interface MLRunMetrics {
  training: Record<string, MLMetricSeries>;
  validation: Record<string, MLMetricSeries>;
  test: Record<string, number>;
  custom: Record<string, any>;
  summary: {
    best: Record<string, number>;
    final: Record<string, number>;
    convergence: Record<string, {
      epoch: number;
      value: number;
      stable: boolean;
    }>;
  };
}

export interface MLMetricSeries {
  values: number[];
  steps?: number[];
  timestamps?: Date[];
  metadata?: {
    unit?: string;
    description?: string;
    higherIsBetter?: boolean;
  };
}

export interface MLRunArtifact {
  name: string;
  type: 'model' | 'dataset' | 'plot' | 'report' | 'log' | 'config' | 'checkpoint' | 'custom';
  path: string;
  size: number;
  mimeType?: string;
  description?: string;
  metadata: Record<string, any>;
  tags: string[];
  version?: string;
  checksum?: string;
  createdAt: Date;
}

export interface MLRunLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warning' | 'error';
  source: 'system' | 'training' | 'validation' | 'custom';
  message: string;
  data?: Record<string, any>;
  step?: number;
  epoch?: number;
}

// Experiment Analysis
export interface MLExperimentAnalysis {
  summary: {
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    averageDuration: number;
    totalCost?: number;
  };
  bestRun: {
    runId: string;
    metrics: Record<string, number>;
    parameters: Record<string, any>;
    improvement: number; // percentage
  };
  convergence: {
    achieved: boolean;
    runId?: string;
    epoch?: number;
    plateauDetected: boolean;
  };
  parameterImportance: Record<string, {
    importance: number;
    correlation: number;
    pValue?: number;
  }>;
  statisticalSignificance: {
    significantImprovements: boolean;
    confidenceLevel: number;
    tests: Record<string, {
      statistic: number;
      pValue: number;
      significant: boolean;
    }>;
  };
  trends: {
    performanceOverTime: MLTrendAnalysis;
    resourceUtilization: MLTrendAnalysis;
    hyperparameterEvolution: Record<string, MLTrendAnalysis>;
  };
  outliers: {
    runs: string[];
    reasons: Record<string, string>;
  };
  recommendations: MLExperimentRecommendation[];
}

export interface MLTrendAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable' | 'cyclical';
  strength: number; // 0-1
  significance: number; // p-value
  forecast?: {
    values: number[];
    confidence: [number, number][];
    horizon: number;
  };
}

export interface MLExperimentRecommendation {
  type: 'parameter_tuning' | 'early_stopping' | 'resource_optimization' | 'data_improvement' | 'architecture_change';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  evidence: {
    runs: string[];
    metrics: Record<string, number>;
    analysis: string;
  };
  implementation: {
    effort: number; // 1-10
    expectedImprovement: number; // percentage
    risks: string[];
    steps: string[];
  };
  confidence: number; // 0-1
}

export interface MLExperimentInsight {
  id: string;
  type: 'discovery' | 'performance' | 'efficiency' | 'anomaly' | 'pattern';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  evidence: {
    runs: string[];
    metrics: string[];
    visualizations?: string[];
    statistics: Record<string, number>;
  };
  actionable: boolean;
  actions?: string[];
  discoveredAt: Date;
  discoveredBy: 'system' | 'user';
  validated: boolean;
  tags: string[];
}

export interface MLExperimentArtifact {
  name: string;
  type: 'comparison_report' | 'visualization' | 'model_ensemble' | 'analysis' | 'dataset' | 'custom';
  path: string;
  size: number;
  description?: string;
  metadata: Record<string, any>;
  relatedRuns: string[];
  createdAt: Date;
  tags: string[];
}

export interface MLExperimentTimelineEvent {
  timestamp: Date;
  type: 'experiment_created' | 'run_started' | 'run_completed' | 'insight_discovered' | 'parameter_updated' | 'analysis_completed';
  description: string;
  runId?: string;
  userId?: string;
  data?: Record<string, any>;
}

// Comparison and Analysis Types
export interface MLRunComparison {
  runs: string[];
  timestamp: Date;
  metrics: {
    comparison: Record<string, {
      values: Record<string, number>; // runId -> value
      best: string; // runId
      worst: string; // runId
      range: [number, number];
      standardDeviation: number;
    }>;
    statistical: Record<string, {
      test: string;
      statistic: number;
      pValue: number;
      significant: boolean;
      effect: number;
    }>;
  };
  parameters: {
    differences: Record<string, Record<string, any>>; // param -> {runId -> value}
    correlations: Record<string, number>; // param -> correlation with target metric
  };
  analysis: {
    dominantRun?: string;
    paretoFront: string[];
    tradeoffs: Array<{
      metric1: string;
      metric2: string;
      correlation: number;
      tradeoffRuns: string[];
    }>;
  };
  visualizations: {
    parallelCoordinates?: string;
    scatterMatrix?: string;
    performanceProfile?: string;
    hyperparameterImportance?: string;
  };
  insights: string[];
}

export interface MLHyperparameterSpace {
  parameters: Record<string, MLParameterDefinition>;
  constraints?: MLParameterConstraint[];
  recommendations?: {
    explored: Record<string, any>[];
    promising: Record<string, any>[];
    avoided: Record<string, any>[];
  };
  analysis: {
    coverage: number; // 0-1
    density: Record<string, number>; // parameter -> density
    correlations: Record<string, Record<string, number>>;
  };
}

export interface MLParameterDefinition {
  type: 'float' | 'int' | 'categorical' | 'boolean';
  bounds?: [number, number];
  values?: any[];
  distribution?: 'uniform' | 'log_uniform' | 'normal' | 'log_normal';
  importance?: number;
  sensitivity?: number;
}

export interface MLParameterConstraint {
  type: 'conditional' | 'mutual_exclusive' | 'dependency' | 'range';
  parameters: string[];
  condition: string;
  description?: string;
}

// Model Registry Integration
export interface MLModelVersion {
  id: string;
  modelName: string;
  version: string;
  runId: string;
  experimentId: string;
  stage: 'staging' | 'production' | 'archived';
  status: 'ready' | 'failed_registration' | 'pending_approval';
  artifacts: {
    model: string;
    dependencies: string;
    signature?: string;
    examples?: string;
  };
  performance: Record<string, number>;
  metadata: {
    description?: string;
    tags: string[];
    aliases?: string[];
    datasetVersion?: string;
    trainingTime: number;
    framework: string;
    size: number;
  };
  approval: {
    required: boolean;
    status?: 'pending' | 'approved' | 'rejected';
    approver?: string;
    timestamp?: Date;
    comments?: string;
  };
  deployment: {
    environments: string[];
    lastDeployed?: Date;
    deploymentId?: string;
  };
  lineage: {
    parentModels?: string[];
    childModels?: string[];
    datasets: string[];
    experiments: string[];
  };
  createdAt: Date;
  createdBy: string;
}

// Collaborative Features
export interface MLExperimentCollaboration {
  experimentId: string;
  collaborators: MLCollaborator[];
  comments: MLExperimentComment[];
  reviews: MLExperimentReview[];
  permissions: {
    public: boolean;
    viewLevel: 'public' | 'team' | 'private';
    editLevel: 'owner' | 'collaborators' | 'team';
  };
  sharing: {
    shareableLinks: MLShareableLink[];
    exports: MLExperimentExport[];
  };
}

export interface MLCollaborator {
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  permissions: string[];
  joinedAt: Date;
  invitedBy: string;
}

export interface MLExperimentComment {
  id: string;
  userId: string;
  runId?: string;
  content: string;
  type: 'general' | 'insight' | 'question' | 'issue';
  tags?: string[];
  replies: MLExperimentComment[];
  resolved: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface MLExperimentReview {
  id: string;
  reviewerId: string;
  type: 'peer_review' | 'approval' | 'audit';
  status: 'pending' | 'approved' | 'rejected' | 'needs_changes';
  criteria: {
    methodology: number; // 1-5 score
    reproducibility: number;
    documentation: number;
    significance: number;
  };
  comments: string;
  recommendations: string[];
  checklist: Record<string, boolean>;
  createdAt: Date;
  completedAt?: Date;
}

export interface MLShareableLink {
  id: string;
  url: string;
  type: 'view' | 'embed' | 'export';
  permissions: string[];
  expiresAt?: Date;
  accessCount: number;
  createdAt: Date;
  createdBy: string;
}

export interface MLExperimentExport {
  id: string;
  format: 'json' | 'csv' | 'pdf' | 'html' | 'zip';
  content: 'full' | 'summary' | 'data_only' | 'custom';
  filters?: Record<string, any>;
  url: string;
  size: number;
  expiresAt: Date;
  createdAt: Date;
  createdBy: string;
}

// Service Interface
export interface IMLExperimentService {
  // Experiment Management
  createExperiment(config: Partial<MLExperiment>): Promise<string>;
  getExperiment(id: string): Promise<MLExperiment | null>;
  updateExperiment(id: string, updates: Partial<MLExperiment>): Promise<void>;
  deleteExperiment(id: string): Promise<void>;
  listExperiments(filters?: Record<string, any>): Promise<MLExperiment[]>;
  
  // Run Management
  createRun(experimentId: string, config: Partial<MLExperimentRun>): Promise<string>;
  getRun(runId: string): Promise<MLExperimentRun | null>;
  updateRun(runId: string, updates: Partial<MLExperimentRun>): Promise<void>;
  deleteRun(runId: string): Promise<void>;
  listRuns(experimentId: string, filters?: Record<string, any>): Promise<MLExperimentRun[]>;
  
  // Metrics and Logging
  logMetric(runId: string, metric: string, value: number, step?: number): Promise<void>;
  logMetrics(runId: string, metrics: Record<string, number>, step?: number): Promise<void>;
  logParameter(runId: string, parameter: string, value: any): Promise<void>;
  logParameters(runId: string, parameters: Record<string, any>): Promise<void>;
  logArtifact(runId: string, artifact: Partial<MLRunArtifact>): Promise<void>;
  
  // Analysis and Comparison
  analyzeExperiment(experimentId: string): Promise<MLExperimentAnalysis>;
  compareRuns(runIds: string[], metrics?: string[]): Promise<MLRunComparison>;
  generateInsights(experimentId: string): Promise<MLExperimentInsight[]>;
  
  // Hyperparameter Space Analysis
  analyzeHyperparameterSpace(experimentId: string): Promise<MLHyperparameterSpace>;
  suggestHyperparameters(experimentId: string, count: number): Promise<Record<string, any>[]>;
  
  // Model Registry Integration
  registerModel(runId: string, modelName: string, version?: string): Promise<string>;
  getModelVersion(versionId: string): Promise<MLModelVersion | null>;
  promoteModel(versionId: string, stage: string): Promise<void>;
  
  // Collaboration
  addCollaborator(experimentId: string, userId: string, role: string): Promise<void>;
  removeCollaborator(experimentId: string, userId: string): Promise<void>;
  addComment(experimentId: string, comment: Partial<MLExperimentComment>): Promise<string>;
  createShareableLink(experimentId: string, options: Partial<MLShareableLink>): Promise<string>;
  
  // Export and Import
  exportExperiment(experimentId: string, format: string, options?: Record<string, any>): Promise<string>;
  importExperiment(data: any, format: string): Promise<string>;
  
  // Search and Discovery
  searchExperiments(query: string, filters?: Record<string, any>): Promise<MLExperiment[]>;
  searchRuns(query: string, filters?: Record<string, any>): Promise<MLExperimentRun[]>;
  
  // Events
  onExperimentEvent(callback: (event: MLExperimentEvent) => void): () => void;
}

export interface MLExperimentEvent {
  type: 'experiment_created' | 'run_started' | 'run_completed' | 'metric_logged' | 'insight_discovered' | 'model_registered';
  experimentId: string;
  runId?: string;
  timestamp: Date;
  data: Record<string, any>;
  userId?: string;
}
