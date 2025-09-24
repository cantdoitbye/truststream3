/**
 * ML Data Interfaces
 * Defines types and interfaces for ML data pipeline operations
 */

import { IDatabaseService } from '../../shared-utils/database-interface';
import { IStorageService } from '../../shared-utils/storage-interface';

// Data Pipeline Types
export interface MLDataset {
  id: string;
  name: string;
  description?: string;
  type: 'training' | 'validation' | 'test' | 'inference' | 'production';
  format: 'csv' | 'json' | 'parquet' | 'numpy' | 'images' | 'text' | 'audio' | 'video';
  source: MLDataSource;
  schema: MLDataSchema;
  statistics: MLDataStatistics;
  version: string;
  size: number; // bytes
  recordCount: number;
  features: MLFeature[];
  target?: MLTarget;
  splits?: MLDataSplit[];
  preprocessing?: MLDataPreprocessingHistory;
  quality: MLDataQuality;
  lineage: MLDataLineage;
  tags: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastValidated?: Date;
  status: 'draft' | 'validated' | 'approved' | 'deprecated';
}

export interface MLDataSchema {
  columns: MLDataColumn[];
  constraints?: MLDataConstraint[];
  relationships?: MLDataRelationship[];
}

export interface MLDataColumn {
  name: string;
  type: 'numeric' | 'categorical' | 'text' | 'datetime' | 'boolean' | 'image' | 'audio' | 'custom';
  nullable: boolean;
  unique?: boolean;
  description?: string;
  constraints?: {
    min?: number;
    max?: number;
    pattern?: string;
    values?: any[];
    format?: string;
  };
  encoding?: {
    type: 'label' | 'onehot' | 'ordinal' | 'embedding' | 'custom';
    config?: Record<string, any>;
  };
  transformations?: MLDataTransformation[];
}

export interface MLDataConstraint {
  type: 'unique' | 'check' | 'foreign_key' | 'custom';
  columns: string[];
  condition?: string;
  reference?: {
    table: string;
    columns: string[];
  };
}

export interface MLDataRelationship {
  type: 'one_to_one' | 'one_to_many' | 'many_to_many';
  source: string;
  target: string;
  condition: string;
}

export interface MLDataStatistics {
  overview: {
    totalRecords: number;
    totalFeatures: number;
    missingValues: number;
    duplicateRecords: number;
    dataTypes: Record<string, number>;
  };
  numerical: Record<string, {
    count: number;
    mean: number;
    std: number;
    min: number;
    max: number;
    percentiles: Record<string, number>;
    nullCount: number;
    outliers: number;
  }>;
  categorical: Record<string, {
    count: number;
    unique: number;
    top: string;
    freq: number;
    nullCount: number;
    distribution: Record<string, number>;
  }>;
  temporal: Record<string, {
    count: number;
    start: Date;
    end: Date;
    nullCount: number;
    frequency: string;
    trends?: Record<string, number>;
  }>;
  correlations?: Record<string, Record<string, number>>;
  distributions?: Record<string, any>;
}

export interface MLFeature {
  name: string;
  type: 'numeric' | 'categorical' | 'text' | 'datetime' | 'image' | 'audio' | 'custom';
  importance?: number;
  selected: boolean;
  transformations: MLDataTransformation[];
  encoding?: {
    type: string;
    parameters: Record<string, any>;
  };
  statistics: Record<string, any>;
  description?: string;
  tags?: string[];
}

export interface MLTarget {
  name: string;
  type: 'binary' | 'multiclass' | 'regression' | 'multilabel' | 'ranking';
  classes?: string[];
  distribution: Record<string, any>;
  encoding?: {
    type: string;
    parameters: Record<string, any>;
  };
  transformations?: MLDataTransformation[];
}

export interface MLDataSplit {
  name: string;
  type: 'train' | 'validation' | 'test' | 'custom';
  percentage: number;
  strategy: 'random' | 'stratified' | 'temporal' | 'custom';
  seed?: number;
  filters?: Record<string, any>;
  path?: string;
  recordCount: number;
}

export interface MLDataTransformation {
  id: string;
  name: string;
  type: 'normalization' | 'standardization' | 'encoding' | 'feature_engineering' | 'cleaning' | 'custom';
  parameters: Record<string, any>;
  appliedAt: Date;
  reversible: boolean;
  impact: {
    before: Record<string, any>;
    after: Record<string, any>;
  };
}

export interface MLDataPreprocessingHistory {
  steps: MLDataTransformation[];
  pipeline: string;
  version: string;
  appliedAt: Date;
  duration: number;
  impact: {
    recordsBefore: number;
    recordsAfter: number;
    featuresBefore: number;
    featuresAfter: number;
    qualityScore: number;
  };
}

export interface MLDataQuality {
  score: number; // 0-100
  dimensions: {
    completeness: number;
    consistency: number;
    accuracy: number;
    validity: number;
    uniqueness: number;
    timeliness: number;
  };
  issues: MLDataQualityIssue[];
  lastAssessed: Date;
  assessmentConfig: Record<string, any>;
}

export interface MLDataQualityIssue {
  type: 'missing_values' | 'outliers' | 'duplicates' | 'inconsistency' | 'invalid_format' | 'constraint_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  column?: string;
  description: string;
  count: number;
  percentage: number;
  suggestions: string[];
  autoFixable: boolean;
}

export interface MLDataLineage {
  sources: MLDataSource[];
  transformations: MLDataTransformation[];
  dependencies: string[];
  derivedFrom?: string[];
  usedIn: string[]; // pipeline IDs or model IDs
  impact: {
    downstream: string[];
    upstream: string[];
  };
}

// Data Loading and Processing
export interface MLDataLoader {
  type: 'batch' | 'stream' | 'incremental';
  config: Record<string, any>;
  schedule?: {
    enabled: boolean;
    cron: string;
    timezone?: string;
  };
  validation?: {
    enabled: boolean;
    rules: MLDataValidationRule[];
  };
  monitoring?: {
    enabled: boolean;
    metrics: string[];
  };
}

export interface MLDataValidationRule {
  name: string;
  type: 'schema' | 'range' | 'pattern' | 'custom';
  config: Record<string, any>;
  action: 'warn' | 'error' | 'skip' | 'fix';
  enabled: boolean;
}

// Data Source Configuration
export interface MLDataSource {
  id: string;
  type: 'database' | 'storage' | 'api' | 'stream' | 'file_upload';
  name: string;
  connection: MLDataConnection;
  refresh: {
    enabled: boolean;
    interval?: number; // seconds
    triggerConditions?: string[];
  };
  access: {
    readOnly: boolean;
    credentials?: Record<string, string>;
    permissions?: string[];
  };
  monitoring: {
    enabled: boolean;
    healthCheck?: {
      interval: number;
      timeout: number;
    };
  };
  metadata: Record<string, any>;
}

export interface MLDataConnection {
  database?: {
    service: IDatabaseService;
    query?: string;
    tables?: string[];
    incremental?: {
      column: string;
      strategy: 'timestamp' | 'id' | 'custom';
      lastValue?: any;
    };
  };
  storage?: {
    service: IStorageService;
    paths: string[];
    format: string;
    compression?: string;
    options?: Record<string, any>;
  };
  api?: {
    endpoint: string;
    method: 'GET' | 'POST';
    headers?: Record<string, string>;
    auth?: {
      type: 'bearer' | 'api_key' | 'oauth' | 'basic';
      credentials: Record<string, string>;
    };
    pagination?: {
      type: 'offset' | 'cursor' | 'page';
      config: Record<string, any>;
    };
    rateLimit?: {
      requests: number;
      period: number; // seconds
    };
  };
  stream?: {
    endpoint: string;
    protocol: 'websocket' | 'sse' | 'kafka' | 'rabbitmq' | 'pulsar';
    config: Record<string, any>;
    buffer?: {
      size: number;
      timeout: number;
    };
  };
}

// Data Processing Operations
export interface MLDataProcessor {
  preprocess(dataset: MLDataset, config: MLDataPreprocessingConfig): Promise<MLDataset>;
  validate(dataset: MLDataset, rules: MLDataValidationRule[]): Promise<MLDataQuality>;
  split(dataset: MLDataset, splits: MLDataSplit[]): Promise<Record<string, MLDataset>>;
  transform(dataset: MLDataset, transformations: MLDataTransformation[]): Promise<MLDataset>;
  analyze(dataset: MLDataset): Promise<MLDataStatistics>;
  profile(dataset: MLDataset): Promise<MLDataProfile>;
}

export interface MLDataProfile {
  dataset: string;
  timestamp: Date;
  schema: MLDataSchema;
  statistics: MLDataStatistics;
  quality: MLDataQuality;
  recommendations: MLDataRecommendation[];
  alerts: MLDataAlert[];
}

export interface MLDataRecommendation {
  type: 'feature_engineering' | 'data_cleaning' | 'encoding' | 'sampling' | 'quality_improvement';
  priority: 'low' | 'medium' | 'high';
  description: string;
  impact: {
    effort: number; // 1-10
    benefit: number; // 1-10
  };
  implementation: {
    steps: string[];
    code?: string;
    resources?: string[];
  };
}

export interface MLDataAlert {
  type: 'drift' | 'quality_degradation' | 'schema_change' | 'volume_anomaly' | 'custom';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  details: Record<string, any>;
  timestamp: Date;
  acknowledged: boolean;
  actions?: string[];
}

// Data Service Interface
export interface IMLDataService {
  // Dataset Management
  createDataset(config: Partial<MLDataset>): Promise<string>;
  getDataset(id: string): Promise<MLDataset | null>;
  updateDataset(id: string, updates: Partial<MLDataset>): Promise<void>;
  deleteDataset(id: string): Promise<void>;
  listDatasets(filters?: Record<string, any>): Promise<MLDataset[]>;
  
  // Data Loading
  loadData(source: MLDataSource, options?: Record<string, any>): Promise<MLDataset>;
  refreshData(datasetId: string): Promise<void>;
  
  // Data Processing
  preprocessData(datasetId: string, config: MLDataPreprocessingConfig): Promise<string>;
  validateData(datasetId: string, rules?: MLDataValidationRule[]): Promise<MLDataQuality>;
  splitData(datasetId: string, splits: MLDataSplit[]): Promise<Record<string, string>>;
  
  // Data Analysis
  analyzeData(datasetId: string): Promise<MLDataStatistics>;
  profileData(datasetId: string): Promise<MLDataProfile>;
  compareDatasets(id1: string, id2: string): Promise<MLDataComparison>;
  
  // Data Quality
  assessQuality(datasetId: string): Promise<MLDataQuality>;
  fixQualityIssues(datasetId: string, issues: string[]): Promise<MLDataset>;
  
  // Data Lineage
  getLineage(datasetId: string): Promise<MLDataLineage>;
  trackUsage(datasetId: string, usedBy: string): Promise<void>;
  
  // Events
  onDataEvent(callback: (event: MLDataEvent) => void): () => void;
}

export interface MLDataComparison {
  datasets: [string, string];
  timestamp: Date;
  schemaChanges: {
    added: MLDataColumn[];
    removed: MLDataColumn[];
    modified: Array<{ before: MLDataColumn; after: MLDataColumn }>;
  };
  statisticalChanges: {
    drift: Record<string, number>;
    distributionChanges: Record<string, any>;
    correlationChanges: Record<string, number>;
  };
  qualityChanges: {
    before: MLDataQuality;
    after: MLDataQuality;
    improvements: string[];
    degradations: string[];
  };
  recommendations: MLDataRecommendation[];
}

export interface MLDataEvent {
  type: 'dataset_created' | 'dataset_updated' | 'data_loaded' | 'quality_alert' | 'schema_change' | 'drift_detected';
  datasetId: string;
  timestamp: Date;
  data: Record<string, any>;
  severity: 'info' | 'warning' | 'error';
}
