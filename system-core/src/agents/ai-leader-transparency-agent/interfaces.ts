/**
 * AI Leader Transparency Agent - Type Definitions
 */

// Base interfaces
export interface AgentConfig {
  agentId?: string;
  environment: 'development' | 'staging' | 'production';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  database: DatabaseConfig;
  orchestrator: OrchestratorConfig;
  monitoring: MonitoringConfig;
}

export interface DatabaseConfig {
  type: 'postgresql' | 'supabase' | 'mongodb';
  connectionString: string;
  poolSize: number;
  retryAttempts: number;
}

export interface OrchestratorConfig {
  endpoint: string;
  authToken: string;
  heartbeatInterval: number;
  maxRetries: number;
}

export interface MonitoringConfig {
  metricsEndpoint: string;
  alertingEndpoint: string;
  logAggregationEndpoint: string;
  enableTracing: boolean;
}

// Transparency Agent specific interfaces
export interface TransparencyAgentInterface {
  // Decision transparency
  explainDecision(decisionId: string): Promise<DecisionExplanation>;
  trackDecisionPath(context: DecisionContext): Promise<DecisionAuditTrail>;
  
  // Audit and logging
  maintainAuditTrail(): Promise<AuditTrail>;
  generateTransparencyReport(): Promise<TransparencyReport>;
  
  // Compliance monitoring
  monitorTransparencyCompliance(): Promise<ComplianceStatus>;
  validateDataUsageTransparency(): Promise<DataUsageReport>;
  
  // Public reporting
  generatePublicTransparencyReport(): Promise<PublicReport>;
  publishGovernanceDecisions(): Promise<GovernancePublication>;
}

// Decision transparency types
export interface DecisionContext {
  decisionId: string;
  sourceAgent: string;
  timestamp: Date;
  type: 'governance' | 'operational' | 'policy' | 'emergency';
  priority: 'low' | 'medium' | 'high' | 'critical';
  stakeholders: string[];
  inputData: any;
  constraints: any;
  requirements: any;
}

export interface DecisionExplanation {
  explanationId: string;
  decisionId: string;
  timestamp: Date;
  summary: string;
  reasoning: DecisionReasoning;
  process: DecisionProcess;
  evidence: Evidence[];
  alternatives: Alternative[];
  risks: Risk[];
  impact: ImpactAssessment;
  confidence: number;
  reviewers: string[];
}

export interface DecisionReasoning {
  primaryFactors: ReasoningFactor[];
  methodology: string;
  assumptions: string[];
  constraints: string[];
  principles: string[];
  precedents: string[];
}

export interface ReasoningFactor {
  factor: string;
  weight: number;
  evidence: string;
  rationale: string;
}

export interface DecisionProcess {
  steps: ProcessStep[];
  participants: Participant[];
  timeline: Timeline;
  reviews: Review[];
  approvals: Approval[];
}

export interface ProcessStep {
  stepId: string;
  name: string;
  description: string;
  startTime: Date;
  endTime: Date;
  inputs: any[];
  outputs: any[];
  participants: string[];
  tools: string[];
}

export interface Participant {
  id: string;
  role: string;
  involvement: 'decision-maker' | 'advisor' | 'reviewer' | 'stakeholder';
  contribution: string;
}

export interface Timeline {
  initiated: Date;
  analyzed: Date;
  decided: Date;
  approved: Date;
  implemented: Date;
  duration: number;
}

export interface Review {
  reviewId: string;
  reviewer: string;
  timestamp: Date;
  type: 'technical' | 'ethical' | 'legal' | 'business';
  outcome: 'approved' | 'rejected' | 'conditional';
  comments: string;
  recommendations: string[];
}

export interface Approval {
  approvalId: string;
  approver: string;
  timestamp: Date;
  level: string;
  conditions?: string[];
  signature?: string;
}

export interface Evidence {
  evidenceId: string;
  type: 'data' | 'analysis' | 'expert-opinion' | 'precedent' | 'regulation';
  source: string;
  description: string;
  reliability: number;
  relevance: number;
  content: any;
}

export interface Alternative {
  alternativeId: string;
  description: string;
  pros: string[];
  cons: string[];
  cost: number;
  risk: number;
  feasibility: number;
  reasonNotChosen: string;
}

export interface Risk {
  riskId: string;
  type: string;
  description: string;
  probability: number;
  impact: number;
  mitigation: string;
  owner: string;
}

export interface ImpactAssessment {
  scope: string[];
  stakeholders: StakeholderImpact[];
  metrics: ImpactMetric[];
  timeline: ImpactTimeline;
  mitigation: string[];
  monitoring: string[];
}

export interface StakeholderImpact {
  stakeholder: string;
  impactType: 'positive' | 'negative' | 'neutral';
  magnitude: number;
  description: string;
  mitigation?: string;
}

export interface ImpactMetric {
  metric: string;
  baseline: number;
  predicted: number;
  actual?: number;
  unit: string;
}

export interface ImpactTimeline {
  immediate: string[];
  shortTerm: string[];
  longTerm: string[];
}

// Audit trail types
export interface DecisionAuditTrail {
  trailId: string;
  decisionId: string;
  timestamp: Date;
  context: DecisionContext;
  steps: ProcessStep[];
  dataSource: DataSource[];
  algorithms: Algorithm[];
  humanInvolvement: HumanInvolvement[];
  assumptions: string[];
  alternatives: Alternative[];
  confidence: number;
  reviewers: string[];
}

export interface AuditTrail {
  trailId: string;
  type: 'decision-path' | 'system-audit' | 'compliance-audit' | 'data-audit';
  timestamp: Date;
  source: string;
  data: any;
  integrity: string;
  status: 'active' | 'archived' | 'deleted';
}

export interface DataSource {
  sourceId: string;
  name: string;
  type: 'database' | 'api' | 'file' | 'user-input' | 'external';
  description: string;
  accessTime: Date;
  dataVolume: number;
  quality: number;
  lineage: string[];
}

export interface Algorithm {
  algorithmId: string;
  name: string;
  version: string;
  type: 'ml-model' | 'rule-engine' | 'statistical' | 'heuristic';
  description: string;
  parameters: Record<string, any>;
  performance: AlgorithmPerformance;
  bias: BiasAssessment;
}

export interface AlgorithmPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  trainingDate: Date;
  validationMethod: string;
}

export interface BiasAssessment {
  tested: boolean;
  testDate?: Date;
  biasScore?: number;
  fairnessMetrics?: Record<string, number>;
  mitigationMeasures?: string[];
}

export interface HumanInvolvement {
  personId: string;
  role: string;
  involvement: 'oversight' | 'input' | 'validation' | 'approval';
  timestamp: Date;
  contribution: string;
  authority: string;
}

// Compliance types
export interface ComplianceStatus {
  complianceId: string;
  timestamp: Date;
  framework: string;
  requirements: ComplianceRequirement[];
  violations: ComplianceViolation[];
  score: number;
  status: 'compliant' | 'mostly-compliant' | 'partially-compliant' | 'non-compliant';
  recommendations: string[];
  nextReview: Date;
}

export interface ComplianceRequirement {
  requirementId: string;
  category: string;
  description: string;
  mandatory: boolean;
  status: 'met' | 'partially-met' | 'not-met' | 'not-applicable';
  evidence: string[];
  gap?: string;
}

export interface ComplianceViolation {
  violationId: string;
  requirement: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detected: Date;
  remediation: RemediationPlan;
  status: 'open' | 'in-progress' | 'resolved';
}

export interface RemediationPlan {
  planId: string;
  actions: RemediationAction[];
  timeline: Date;
  owner: string;
  cost?: number;
  priority: number;
}

export interface RemediationAction {
  actionId: string;
  description: string;
  type: 'immediate' | 'short-term' | 'long-term';
  deadline: Date;
  responsible: string;
  status: 'planned' | 'in-progress' | 'completed';
}

// Data usage transparency types
export interface DataUsageReport {
  reportId: string;
  timestamp: Date;
  period: {
    start: Date;
    end: Date;
  };
  dataSources: DataSourceAudit[];
  processing: DataProcessingAudit[];
  retention: DataRetentionAudit[];
  sharing: DataSharingAudit[];
  consent: ConsentAudit[];
  compliance: DataComplianceStatus;
  recommendations: string[];
}

export interface DataSourceAudit {
  sourceId: string;
  name: string;
  type: string;
  purpose: string;
  legalBasis: string;
  dataTypes: string[];
  volume: number;
  accessFrequency: number;
  lastAccessed: Date;
  quality: DataQualityMetrics;
}

export interface DataQualityMetrics {
  completeness: number;
  accuracy: number;
  consistency: number;
  timeliness: number;
  validity: number;
  overallScore: number;
}

export interface DataProcessingAudit {
  processId: string;
  purpose: string;
  methods: string[];
  algorithms: string[];
  transformations: DataTransformation[];
  outputs: ProcessingOutput[];
  retention: RetentionPolicy;
  security: SecurityMeasures;
}

export interface DataTransformation {
  transformationId: string;
  type: string;
  description: string;
  parameters: Record<string, any>;
  impact: string;
  reversible: boolean;
}

export interface ProcessingOutput {
  outputId: string;
  type: string;
  description: string;
  recipients: string[];
  purpose: string;
  retention: string;
}

export interface RetentionPolicy {
  policyId: string;
  category: string;
  period: number;
  justification: string;
  disposal: string;
  exceptions: string[];
}

export interface SecurityMeasures {
  encryption: EncryptionDetails;
  access: AccessControls;
  monitoring: MonitoringMeasures;
  backup: BackupPolicy;
}

export interface EncryptionDetails {
  atRest: boolean;
  inTransit: boolean;
  algorithm: string;
  keyManagement: string;
}

export interface AccessControls {
  authentication: string[];
  authorization: string;
  roles: string[];
  audit: boolean;
}

export interface MonitoringMeasures {
  logging: boolean;
  alerting: boolean;
  anomalyDetection: boolean;
  retention: number;
}

export interface BackupPolicy {
  frequency: string;
  retention: number;
  encryption: boolean;
  testing: boolean;
}

export interface DataRetentionAudit {
  category: string;
  policies: RetentionPolicy[];
  compliance: boolean;
  deletions: DeletionRecord[];
  exceptions: ExceptionRecord[];
}

export interface DeletionRecord {
  recordId: string;
  dataType: string;
  deletionDate: Date;
  reason: string;
  method: string;
  verified: boolean;
}

export interface ExceptionRecord {
  exceptionId: string;
  dataType: string;
  reason: string;
  approver: string;
  expiration: Date;
}

export interface DataSharingAudit {
  sharingId: string;
  recipient: string;
  purpose: string;
  dataTypes: string[];
  legalBasis: string;
  safeguards: string[];
  startDate: Date;
  endDate?: Date;
  volume: number;
}

export interface ConsentAudit {
  consentId: string;
  subject: string;
  purposes: string[];
  dataTypes: string[];
  given: Date;
  withdrawn?: Date;
  granular: boolean;
  method: string;
  evidence: string;
}

export interface DataComplianceStatus {
  gdpr: ComplianceAssessment;
  ccpa: ComplianceAssessment;
  hipaa?: ComplianceAssessment;
  other: ComplianceAssessment[];
  overall: number;
}

export interface ComplianceAssessment {
  framework: string;
  score: number;
  status: string;
  gaps: string[];
  improvements: string[];
  lastAssessed: Date;
}

// Reporting types
export interface TransparencyReport {
  reportId: string;
  timestamp: Date;
  period: {
    start: Date;
    end: Date;
  };
  metrics: TransparencyMetrics;
  decisions: DecisionSummary;
  auditSummary: AuditSummary;
  compliance: ComplianceSummary;
  dataUsage: DataUsageReport;
  improvements: TransparencyImprovement[];
  publicDisclosures: PublicDisclosure[];
}

export interface TransparencyMetrics {
  decisionExplanationRate: number;
  auditTrailCompleteness: number;
  complianceScore: number;
  dataTransparencyScore: number;
  publicReportingScore: number;
  overallTransparency: number;
}

export interface DecisionSummary {
  totalDecisions: number;
  explainedDecisions: number;
  explainabilityRate: number;
  averageExplanationTime: number;
  decisionTypes: DecisionTypeStats[];
  stakeholderEngagement: number;
}

export interface DecisionTypeStats {
  type: string;
  count: number;
  explainabilityRate: number;
  averageComplexity: number;
}

export interface AuditSummary {
  totalTrails: number;
  completeTrails: number;
  integrityViolations: number;
  averageTrailCompleteness: number;
  auditCoverage: number;
}

export interface ComplianceSummary {
  overallScore: number;
  frameworkScores: Record<string, number>;
  violations: number;
  resolved: number;
  pending: number;
  trends: ComplianceTrend[];
}

export interface ComplianceTrend {
  framework: string;
  direction: 'improving' | 'stable' | 'declining';
  rate: number;
  significance: number;
}

export interface TransparencyImprovement {
  improvementId: string;
  area: string;
  description: string;
  impact: number;
  effort: number;
  timeline: string;
  status: 'planned' | 'in-progress' | 'completed';
}

export interface PublicDisclosure {
  disclosureId: string;
  type: string;
  title: string;
  summary: string;
  publishedDate: Date;
  url?: string;
  audience: string[];
}

// Public reporting types
export interface PublicReport {
  reportId: string;
  timestamp: Date;
  title: string;
  summary: string;
  governance: GovernanceOverview;
  decisions: PublicDecisionMetrics;
  dataHandling: PublicDataHandling;
  compliance: PublicCompliance;
  improvements: PublicImprovement[];
  contact: ContactInfo;
  disclaimers: string[];
}

export interface GovernanceOverview {
  structure: string;
  principles: string[];
  processes: string[];
  oversight: string[];
  accountability: string[];
}

export interface PublicDecisionMetrics {
  totalDecisions: number;
  publicDecisions: number;
  transparencyRate: number;
  stakeholderEngagement: number;
  appealProcess: string;
}

export interface PublicDataHandling {
  dataTypes: string[];
  purposes: string[];
  retention: string;
  rights: string[];
  contact: string;
}

export interface PublicCompliance {
  frameworks: string[];
  certifications: Certification[];
  audits: PublicAudit[];
  improvements: string[];
}

export interface Certification {
  name: string;
  issuer: string;
  issued: Date;
  expires: Date;
  scope: string;
}

export interface PublicAudit {
  type: string;
  auditor: string;
  date: Date;
  scope: string;
  outcome: string;
  reportUrl?: string;
}

export interface PublicImprovement {
  area: string;
  description: string;
  timeline: string;
  status: string;
}

export interface ContactInfo {
  general: string;
  privacy: string;
  compliance: string;
  transparency: string;
}

// Governance publication types
export interface GovernancePublication {
  publicationId: string;
  timestamp: Date;
  period: {
    start: Date;
    end: Date;
  };
  decisions: PublishableDecision[];
  policies: PublishablePolicy[];
  changes: GovernanceChange[];
  impact: GovernanceImpact;
  feedback: StakeholderFeedback[];
  nextPublication: Date;
}

export interface PublishableDecision {
  decisionId: string;
  title: string;
  summary: string;
  date: Date;
  impact: string[];
  rationale: string;
  publicComment?: string;
}

export interface PublishablePolicy {
  policyId: string;
  title: string;
  version: string;
  effective: Date;
  summary: string;
  changes?: string[];
  url?: string;
}

export interface GovernanceChange {
  changeId: string;
  type: string;
  description: string;
  effective: Date;
  impact: string;
  stakeholders: string[];
}

export interface GovernanceImpact {
  summary: string;
  metrics: ImpactMetric[];
  stakeholders: string[];
  feedback: string;
}

export interface StakeholderFeedback {
  feedbackId: string;
  stakeholder: string;
  type: string;
  feedback: string;
  response: string;
  date: Date;
  status: 'received' | 'reviewed' | 'responded' | 'closed';
}

// Configuration types
export interface TransparencyConfig {
  explanation: ExplanationConfig;
  auditing: AuditingConfig;
  compliance: ComplianceConfig;
  dataUsage: DataUsageConfig;
  reporting: ReportingConfig;
  publication: PublicationConfig;
  retention: RetentionConfig;
  public: PublicConfig;
}

export interface ExplanationConfig {
  autoGenerate: boolean;
  detailLevel: 'basic' | 'detailed' | 'comprehensive';
  includeAlternatives: boolean;
  includeRisks: boolean;
  includeEvidence: boolean;
  timeout: number;
  maxRetries: number;
}

export interface AuditingConfig {
  enableContinuous: boolean;
  maintenanceInterval: number;
  integrityChecks: boolean;
  auditPeriod: number;
  trailCompleteness: number;
  automatedAnalysis: boolean;
}

export interface ComplianceConfig {
  framework: string;
  monitoringInterval: number;
  reviewInterval: number;
  autoRemediation: boolean;
  escalationThreshold: number;
  reportingLevel: string;
}

export interface DataUsageConfig {
  auditPeriod: number;
  includeMetrics: boolean;
  consentTracking: boolean;
  retentionValidation: boolean;
  sharingTransparency: boolean;
  automatedReporting: boolean;
}

export interface ReportingConfig {
  period: number;
  distributionList: string[];
  format: string[];
  publicReporting: boolean;
  stakeholderReporting: boolean;
  automatedGeneration: boolean;
}

export interface PublicationConfig {
  frequency: number;
  period: number;
  decisionThreshold: string;
  approvalRequired: boolean;
  stakeholderReview: boolean;
  distributionChannels: string[];
}

export interface RetentionConfig {
  auditTrailRetention: number;
  decisionHistoryRetention: number;
  complianceRecordRetention: number;
  reportRetention: number;
}

export interface PublicConfig {
  contactInfo: ContactInfo;
  disclaimers: string[];
  legalNotices: string[];
  privacyPolicy: string;
  termsOfService: string;
}
