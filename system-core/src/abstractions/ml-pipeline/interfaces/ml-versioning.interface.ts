/**
 * ML Data Versioning Interfaces
 * Defines types and interfaces for ML data versioning and lineage tracking
 */

import { MLDataset } from './ml-data.interface';

// Data Versioning Types
export interface MLDataVersion {
  id: string;
  datasetId: string;
  version: string;
  versionType: 'major' | 'minor' | 'patch' | 'snapshot';
  name?: string;
  description?: string;
  status: 'draft' | 'published' | 'deprecated' | 'archived';
  metadata: {
    size: number; // bytes
    recordCount: number;
    featureCount: number;
    checksum: string;
    tags: string[];
    labels: Record<string, string>;
  };
  schema: MLDataVersionSchema;
  changes: MLDataVersionChange[];
  lineage: MLDataLineage;
  quality: MLDataVersionQuality;
  compatibility: MLDataVersionCompatibility;
  location: MLDataVersionLocation;
  approval: MLDataVersionApproval;
  usage: MLDataVersionUsage;
  audit: MLDataVersionAudit;
  createdAt: Date;
  createdBy: string;
  publishedAt?: Date;
  deprecatedAt?: Date;
  parentVersion?: string;
  childVersions: string[];
}

export interface MLDataVersionSchema {
  version: string;
  columns: MLDataVersionColumn[];
  constraints: MLDataVersionConstraint[];
  compatibility: {
    backward: boolean;
    forward: boolean;
    breaking: boolean;
  };
  migration?: {
    required: boolean;
    automatic: boolean;
    script?: string;
    instructions: string[];
  };
}

export interface MLDataVersionColumn {
  name: string;
  type: string;
  nullable: boolean;
  description?: string;
  tags?: string[];
  statistics?: {
    min?: number;
    max?: number;
    mean?: number;
    uniqueValues?: number;
    nullCount: number;
    distribution?: Record<string, number>;
  };
  quality: {
    completeness: number; // 0-1
    validity: number; // 0-1
    consistency: number; // 0-1
  };
  changeType?: 'added' | 'removed' | 'modified' | 'renamed';
  previousName?: string;
}

export interface MLDataVersionConstraint {
  name: string;
  type: 'primary_key' | 'foreign_key' | 'unique' | 'check' | 'not_null' | 'custom';
  columns: string[];
  condition?: string;
  enforced: boolean;
  validated: boolean;
}

export interface MLDataVersionChange {
  type: 'schema' | 'data' | 'quality' | 'metadata';
  operation: 'add' | 'remove' | 'modify' | 'rename';
  target: string; // column name, table name, etc.
  before?: any;
  after?: any;
  impact: {
    breaking: boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
    affectedRows?: number;
    description: string;
  };
  migration?: {
    required: boolean;
    automatic: boolean;
    code?: string;
  };
}

export interface MLDataLineage {
  upstream: MLDataLineageNode[];
  downstream: MLDataLineageNode[];
  transformations: MLDataTransformation[];
  dependencies: MLDataDependency[];
  provenance: MLDataProvenance;
  impact: MLDataImpactAnalysis;
}

export interface MLDataLineageNode {
  id: string;
  type: 'dataset' | 'transformation' | 'model' | 'experiment' | 'deployment';
  name: string;
  version?: string;
  relationship: 'parent' | 'child' | 'sibling' | 'derived_from' | 'merged_with';
  confidence: number; // 0-1
  metadata?: Record<string, any>;
}

export interface MLDataTransformation {
  id: string;
  name: string;
  type: 'cleaning' | 'feature_engineering' | 'normalization' | 'aggregation' | 'join' | 'filter' | 'custom';
  operation: string;
  parameters: Record<string, any>;
  code?: string;
  inputColumns?: string[];
  outputColumns?: string[];
  statistics: {
    recordsBefore: number;
    recordsAfter: number;
    executionTime: number;
    memoryUsage?: number;
  };
  validation: {
    passed: boolean;
    tests: MLDataValidationTest[];
  };
  metadata: Record<string, any>;
  appliedAt: Date;
  appliedBy: string;
}

export interface MLDataDependency {
  sourceId: string;
  targetId: string;
  type: 'direct' | 'indirect' | 'temporal' | 'conditional';
  strength: number; // 0-1
  description: string;
  conditions?: string[];
  lastValidated: Date;
}

export interface MLDataProvenance {
  origin: {
    source: string;
    timestamp: Date;
    method: 'manual' | 'automated' | 'imported' | 'generated';
    location: string;
    credentials?: string;
  };
  collection: {
    method: string;
    tools: string[];
    parameters: Record<string, any>;
    samplingStrategy?: string;
    biases?: string[];
  };
  processing: {
    steps: MLDataTransformation[];
    tools: string[];
    environment: Record<string, string>;
    reproducible: boolean;
  };
  validation: {
    tests: MLDataValidationTest[];
    coverage: number;
    lastValidated: Date;
  };
}

export interface MLDataValidationTest {
  name: string;
  type: 'schema' | 'data_quality' | 'statistical' | 'business_rule' | 'custom';
  description: string;
  passed: boolean;
  score?: number;
  details: {
    expected: any;
    actual: any;
    difference?: any;
  };
  metadata?: Record<string, any>;
  executedAt: Date;
}

export interface MLDataImpactAnalysis {
  downstreamAffected: {
    datasets: string[];
    models: string[];
    experiments: string[];
    deployments: string[];
  };
  riskAssessment: {
    level: 'low' | 'medium' | 'high' | 'critical';
    factors: string[];
    mitigation: string[];
  };
  businessImpact: {
    areas: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  };
  technicalImpact: {
    compatibility: boolean;
    performance: number; // percentage change
    accuracy: number; // percentage change
    description: string;
  };
}

export interface MLDataVersionQuality {
  overall: {
    score: number; // 0-100
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    trend: 'improving' | 'stable' | 'degrading';
  };
  dimensions: {
    completeness: number;
    consistency: number;
    accuracy: number;
    validity: number;
    uniqueness: number;
    timeliness: number;
    relevance: number;
  };
  issues: MLDataQualityIssue[];
  improvements: MLDataQualityImprovement[];
  benchmark: {
    industry?: number;
    historical?: number[];
    target?: number;
  };
  assessedAt: Date;
  assessmentMethod: string;
}

export interface MLDataQualityIssue {
  id: string;
  type: 'missing_values' | 'outliers' | 'duplicates' | 'inconsistency' | 'invalid_format' | 'constraint_violation' | 'schema_drift';
  severity: 'low' | 'medium' | 'high' | 'critical';
  column?: string;
  description: string;
  count: number;
  percentage: number;
  examples?: any[];
  impact: {
    dataQuality: number;
    modelPerformance?: number;
    businessValue?: number;
  };
  suggestions: string[];
  autoFixable: boolean;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted';
  assignee?: string;
  dueDate?: Date;
  resolvedAt?: Date;
}

export interface MLDataQualityImprovement {
  type: 'cleaning' | 'validation' | 'enrichment' | 'standardization' | 'governance';
  description: string;
  impact: {
    qualityIncrease: number; // percentage
    effort: number; // 1-10
    cost?: number;
  };
  implementation: {
    steps: string[];
    code?: string;
    tools?: string[];
    duration?: number; // days
  };
  priority: 'low' | 'medium' | 'high' | 'critical';
  dependencies?: string[];
}

export interface MLDataVersionCompatibility {
  backward: {
    compatible: boolean;
    issues: string[];
    migration?: {
      required: boolean;
      automatic: boolean;
      complexity: 'low' | 'medium' | 'high';
      estimatedTime: number; // hours
    };
  };
  forward: {
    compatible: boolean;
    warnings: string[];
  };
  consumer: {
    models: Record<string, {
      compatible: boolean;
      issues: string[];
      recommendations: string[];
    }>;
    pipelines: Record<string, {
      compatible: boolean;
      issues: string[];
      recommendations: string[];
    }>;
  };
}

export interface MLDataVersionLocation {
  primary: {
    type: 'storage' | 'database' | 'warehouse' | 'lake';
    url: string;
    credentials?: string;
    metadata?: Record<string, any>;
  };
  replicas: Array<{
    type: string;
    url: string;
    region?: string;
    purpose: 'backup' | 'cache' | 'edge' | 'archive';
    syncStatus: 'synced' | 'syncing' | 'out_of_sync' | 'error';
    lastSynced?: Date;
  }>;
  access: {
    public: boolean;
    permissions: Record<string, string[]>; // role -> permissions
    accessLog: boolean;
  };
}

export interface MLDataVersionApproval {
  required: boolean;
  workflow: {
    stages: MLApprovalStage[];
    currentStage?: number;
    autoApprove?: {
      conditions: string[];
      enabled: boolean;
    };
  };
  history: MLApprovalHistory[];
  status: 'pending' | 'approved' | 'rejected' | 'conditional';
  decision: {
    approver?: string;
    timestamp?: Date;
    reason?: string;
    conditions?: string[];
  };
}

export interface MLApprovalStage {
  name: string;
  type: 'automatic' | 'manual' | 'review';
  approvers: string[];
  criteria: string[];
  requiredApprovals: number;
  timeoutDays?: number;
  escalation?: {
    enabled: boolean;
    after: number; // days
    to: string[];
  };
}

export interface MLApprovalHistory {
  stage: string;
  approver: string;
  action: 'approved' | 'rejected' | 'requested_changes';
  timestamp: Date;
  reason?: string;
  comments?: string;
  conditions?: string[];
}

export interface MLDataVersionUsage {
  consumers: {
    models: MLUsageConsumer[];
    experiments: MLUsageConsumer[];
    pipelines: MLUsageConsumer[];
    reports: MLUsageConsumer[];
  };
  statistics: {
    totalAccess: number;
    uniqueUsers: number;
    lastAccessed: Date;
    accessFrequency: Record<string, number>; // period -> count
    downloadCount: number;
    popularColumns: string[];
  };
  performance: {
    queryLatency: number; // milliseconds
    downloadSpeed: number; // MB/s
    cacheHitRate: number; // percentage
  };
  feedback: MLUsageFeedback[];
}

export interface MLUsageConsumer {
  id: string;
  name: string;
  type: string;
  version?: string;
  userId: string;
  firstUsed: Date;
  lastUsed: Date;
  accessCount: number;
  status: 'active' | 'inactive' | 'deprecated';
  performance?: {
    accuracy?: number;
    latency?: number;
    throughput?: number;
  };
}

export interface MLUsageFeedback {
  userId: string;
  type: 'rating' | 'comment' | 'issue' | 'suggestion';
  rating?: number; // 1-5
  content: string;
  category?: string;
  status: 'open' | 'addressed' | 'resolved';
  helpful: number; // votes
  timestamp: Date;
  response?: {
    content: string;
    respondent: string;
    timestamp: Date;
  };
}

export interface MLDataVersionAudit {
  events: MLDataAuditEvent[];
  compliance: {
    gdpr: boolean;
    hipaa: boolean;
    sox: boolean;
    custom: string[];
  };
  retention: {
    policy: string;
    expiration?: Date;
    archiveDate?: Date;
    destructionDate?: Date;
  };
  access: {
    public: boolean;
    tracking: boolean;
    anonymization: boolean;
  };
}

export interface MLDataAuditEvent {
  timestamp: Date;
  type: 'created' | 'accessed' | 'modified' | 'published' | 'deprecated' | 'deleted' | 'exported' | 'shared';
  userId: string;
  action: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
}

// Data Repository Types
export interface MLDataRepository {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'team' | 'organization';
  datasets: string[]; // dataset IDs
  configuration: MLRepositoryConfiguration;
  governance: MLRepositoryGovernance;
  collaboration: MLRepositoryCollaboration;
  metrics: MLRepositoryMetrics;
  tags: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}

export interface MLRepositoryConfiguration {
  versioning: {
    strategy: 'semantic' | 'timestamp' | 'sequential' | 'hash';
    autoVersioning: boolean;
    retentionPolicy: {
      maxVersions?: number;
      maxAge?: number; // days
      compressionStrategy?: 'none' | 'lz4' | 'gzip' | 'brotli';
    };
  };
  quality: {
    enableValidation: boolean;
    validationRules: string[];
    qualityGates: Array<{
      stage: string;
      threshold: number;
      action: 'warn' | 'block';
    }>;
    autoRemediation: boolean;
  };
  security: {
    encryption: boolean;
    accessControl: boolean;
    auditLogging: boolean;
    dataClassification: string[];
  };
  backup: {
    enabled: boolean;
    frequency: string; // cron expression
    retention: number; // days
    destinations: string[];
  };
}

export interface MLRepositoryGovernance {
  policies: MLDataGovernancePolicy[];
  stewards: string[]; // user IDs
  approvalWorkflow: {
    enabled: boolean;
    stages: string[];
    autoApproval: {
      enabled: boolean;
      conditions: string[];
    };
  };
  compliance: {
    frameworks: string[];
    requirements: Record<string, string[]>;
    assessments: Array<{
      framework: string;
      score: number;
      lastAssessed: Date;
      nextAssessment: Date;
    }>;
  };
}

export interface MLDataGovernancePolicy {
  id: string;
  name: string;
  type: 'access' | 'retention' | 'quality' | 'privacy' | 'usage';
  description: string;
  rules: string[];
  enforcement: 'advisory' | 'warning' | 'blocking';
  scope: {
    datasets?: string[];
    dataTypes?: string[];
    classifications?: string[];
  };
  exceptions: Array<{
    condition: string;
    action: string;
    approver: string;
  }>;
  active: boolean;
  createdAt: Date;
  createdBy: string;
}

export interface MLRepositoryCollaboration {
  contributors: Array<{
    userId: string;
    role: 'owner' | 'maintainer' | 'contributor' | 'viewer';
    permissions: string[];
    joinedAt: Date;
  }>;
  discussions: Array<{
    id: string;
    title: string;
    type: 'general' | 'issue' | 'proposal' | 'question';
    status: 'open' | 'closed' | 'resolved';
    participants: string[];
    createdAt: Date;
  }>;
  sharing: {
    public: boolean;
    discovery: boolean;
    forkable: boolean;
    citable: boolean;
    doi?: string;
  };
}

export interface MLRepositoryMetrics {
  usage: {
    downloads: number;
    views: number;
    stars: number;
    forks: number;
  };
  activity: {
    commits: number;
    contributors: number;
    lastActivity: Date;
    commitFrequency: Record<string, number>;
  };
  quality: {
    averageQualityScore: number;
    documentationCoverage: number;
    testCoverage?: number;
  };
  impact: {
    citations: number;
    derivedDatasets: number;
    modelsTrained: number;
    papersPublished?: number;
  };
}

// Service Interface
export interface IMLDataVersioningService {
  // Version Management
  createVersion(datasetId: string, config: Partial<MLDataVersion>): Promise<string>;
  getVersion(versionId: string): Promise<MLDataVersion | null>;
  updateVersion(versionId: string, updates: Partial<MLDataVersion>): Promise<void>;
  deleteVersion(versionId: string): Promise<void>;
  listVersions(datasetId: string, filters?: Record<string, any>): Promise<MLDataVersion[]>;
  
  // Version Operations
  publishVersion(versionId: string): Promise<void>;
  deprecateVersion(versionId: string, reason?: string): Promise<void>;
  compareVersions(version1: string, version2: string): Promise<MLDataVersionComparison>;
  mergeVersions(baseVersion: string, sourceVersions: string[]): Promise<string>;
  
  // Lineage and Provenance
  getLineage(versionId: string): Promise<MLDataLineage>;
  trackLineage(sourceId: string, targetId: string, transformation: MLDataTransformation): Promise<void>;
  analyzeImpact(versionId: string): Promise<MLDataImpactAnalysis>;
  
  // Quality Management
  assessQuality(versionId: string): Promise<MLDataVersionQuality>;
  validateVersion(versionId: string, rules?: string[]): Promise<MLDataValidationTest[]>;
  fixQualityIssues(versionId: string, issueIds: string[]): Promise<string>; // returns new version ID
  
  // Compatibility
  checkCompatibility(version1: string, version2: string): Promise<MLDataVersionCompatibility>;
  generateMigration(fromVersion: string, toVersion: string): Promise<string>;
  
  // Repository Management
  createRepository(config: Partial<MLDataRepository>): Promise<string>;
  getRepository(id: string): Promise<MLDataRepository | null>;
  addDatasetToRepository(repositoryId: string, datasetId: string): Promise<void>;
  removeDatasetFromRepository(repositoryId: string, datasetId: string): Promise<void>;
  
  // Approval Workflow
  submitForApproval(versionId: string): Promise<void>;
  approveVersion(versionId: string, stage: string, comments?: string): Promise<void>;
  rejectVersion(versionId: string, stage: string, reason: string): Promise<void>;
  
  // Usage Tracking
  recordUsage(versionId: string, consumerId: string, consumerType: string): Promise<void>;
  getUsageStats(versionId: string): Promise<MLDataVersionUsage>;
  
  // Search and Discovery
  searchVersions(query: string, filters?: Record<string, any>): Promise<MLDataVersion[]>;
  recommendVersions(context: Record<string, any>): Promise<MLDataVersion[]>;
  
  // Events
  onVersionEvent(callback: (event: MLDataVersionEvent) => void): () => void;
}

export interface MLDataVersionComparison {
  versions: [string, string];
  timestamp: Date;
  summary: {
    breaking: boolean;
    compatible: boolean;
    recommendedAction: 'upgrade' | 'migrate' | 'review' | 'skip';
  };
  changes: {
    schema: MLDataVersionChange[];
    data: {
      recordCountDelta: number;
      sizeChange: number;
      qualityChange: number;
    };
    statistics: Record<string, {
      before: any;
      after: any;
      change: any;
    }>;
  };
  migration: {
    required: boolean;
    automatic: boolean;
    complexity: 'low' | 'medium' | 'high';
    estimatedTime: number; // hours
    script?: string;
    instructions: string[];
  };
  impact: {
    consumers: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    recommendations: string[];
  };
}

export interface MLDataVersionEvent {
  type: 'version_created' | 'version_published' | 'version_deprecated' | 'quality_assessed' | 'approval_requested' | 'migration_completed';
  versionId: string;
  datasetId: string;
  timestamp: Date;
  data: Record<string, any>;
  userId?: string;
}
