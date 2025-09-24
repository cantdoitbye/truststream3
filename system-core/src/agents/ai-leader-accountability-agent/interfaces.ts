/**
 * AI Leader Accountability Agent - Type Definitions
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

// Accountability Agent specific interfaces
export interface AccountabilityAgentInterface {
  // Responsibility management
  assignResponsibility(action: GovernanceAction, agent: string): Promise<ResponsibilityAssignment>;
  trackAccountabilityMetrics(): Promise<AccountabilityMetrics>;
  
  // Ethics monitoring
  monitorEthicsCompliance(): Promise<EthicsComplianceReport>;
  detectBias(outputs: any[], context: BiasContext): Promise<BiasAnalysis>;
  
  // Accountability enforcement
  enforceAccountabilityStandards(): Promise<EnforcementResult>;
  escalateAccountabilityIssues(): Promise<EscalationResult>;
  
  // Reporting and governance
  generateAccountabilityReport(): Promise<AccountabilityReport>;
  auditGovernanceDecisions(): Promise<GovernanceAudit>;
}

// Governance action types
export interface GovernanceAction {
  actionId: string;
  type: 'decision' | 'implementation' | 'oversight' | 'outcome';
  category: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  impact: 'minimal' | 'moderate' | 'significant' | 'major';
  stakeholders: string[];
  requirements: ActionRequirement[];
  constraints: ActionConstraint[];
  timeline: ActionTimeline;
  canDelegate: boolean;
  requiresApproval: boolean;
  complianceRequirements: string[];
}

export interface ActionRequirement {
  requirementId: string;
  type: 'functional' | 'compliance' | 'security' | 'performance';
  description: string;
  mandatory: boolean;
  verificationMethod: string;
}

export interface ActionConstraint {
  constraintId: string;
  type: 'legal' | 'technical' | 'resource' | 'timeline';
  description: string;
  impact: string;
  mitigation?: string;
}

export interface ActionTimeline {
  startDate: Date;
  endDate: Date;
  milestones: Milestone[];
  dependencies: string[];
  bufferTime?: number;
}

export interface Milestone {
  milestoneId: string;
  name: string;
  date: Date;
  deliverables: string[];
  criteria: string[];
  responsible: string;
}

// Responsibility assignment types
export interface ResponsibilityAssignment {
  assignmentId: string;
  actionId: string;
  responsibleAgent: string;
  assignedBy: string;
  assignedAt: Date;
  scope: ResponsibilityScope;
  accountability: AccountabilityFramework;
  delegation?: DelegationRules;
  status: 'active' | 'completed' | 'transferred' | 'escalated' | 'cancelled';
  escalation: EscalationProtocol;
  completedAt?: Date;
  outcome?: ResponsibilityOutcome;
}

export interface ResponsibilityScope {
  decision: boolean;
  implementation: boolean;
  oversight: boolean;
  outcome: boolean;
  communication?: boolean;
  documentation?: boolean;
}

export interface AccountabilityFramework {
  level: 'informational' | 'consultative' | 'responsible' | 'accountable';
  requirements: AccountabilityRequirement[];
  metrics: AccountabilityMetric[];
  reporting: ReportingRequirement[];
}

export interface AccountabilityRequirement {
  requirementId: string;
  category: 'documentation' | 'approval' | 'review' | 'communication';
  description: string;
  frequency: string;
  deadline?: Date;
  format?: string;
}

export interface AccountabilityMetric {
  metricId: string;
  name: string;
  type: 'quantitative' | 'qualitative';
  target: any;
  measurement: string;
  frequency: string;
}

export interface ReportingRequirement {
  reportId: string;
  type: 'progress' | 'completion' | 'issue' | 'escalation';
  frequency: string;
  recipients: string[];
  format: string;
  template?: string;
}

export interface DelegationRules {
  allowed: boolean;
  restrictions: DelegationRestriction[];
  approvalRequired: boolean;
  approvers?: string[];
  retainedAuthority: string[];
}

export interface DelegationRestriction {
  restrictionId: string;
  type: 'scope' | 'authority' | 'timeline' | 'decision';
  description: string;
  rationale: string;
}

export interface EscalationProtocol {
  conditions: EscalationCondition[];
  levels: EscalationLevel[];
  contacts: EscalationContact[];
  timeline: EscalationTimeline;
}

export interface EscalationCondition {
  conditionId: string;
  trigger: string;
  threshold: any;
  action: 'notify' | 'escalate' | 'reassign' | 'emergency';
  automatic: boolean;
}

export interface EscalationLevel {
  level: number;
  name: string;
  authority: string[];
  timeline: number;
  actions: string[];
}

export interface EscalationContact {
  contactId: string;
  role: string;
  person: string;
  level: number;
  method: string[];
  availability: string;
}

export interface EscalationTimeline {
  initialResponse: number;
  escalationDelay: number;
  maxEscalationTime: number;
  reviewPeriod: number;
}

export interface ResponsibilityOutcome {
  outcomeId: string;
  status: 'successful' | 'partial' | 'failed' | 'cancelled';
  results: OutcomeResult[];
  lessons: string[];
  improvements: string[];
  feedback: string[];
}

export interface OutcomeResult {
  resultId: string;
  metric: string;
  target: any;
  actual: any;
  variance: number;
  explanation: string;
}

// Accountability metrics types
export interface AccountabilityMetrics {
  timestamp: Date;
  period: {
    start: Date;
    end: Date;
  };
  responsibility: ResponsibilityMetrics;
  ethics: EthicsMetrics;
  bias: BiasMetrics;
  governance: GovernanceMetrics;
}

export interface ResponsibilityMetrics {
  totalAssignments: number;
  activeAssignments: number;
  completedAssignments: number;
  overdue: number;
  escalated: number;
  averageCompletionTime: number;
  responsibilityClarity: number;
  delegationRate: number;
}

export interface EthicsMetrics {
  complianceScore: number;
  violations: number;
  resolved: number;
  averageResolutionTime: number;
  preventiveMeasures: number;
  trainingCompliance: number;
}

export interface BiasMetrics {
  detectionsCount: number;
  mitigatedCount: number;
  averageSeverity: number;
  improvementRate: number;
  fairnessScore: number;
  diversityIndex: number;
}

export interface GovernanceMetrics {
  overallScore: number;
  transparency: number;
  responsiveness: number;
  effectiveness: number;
  stakeholderSatisfaction: number;
  decisionQuality: number;
}

// Ethics compliance types
export interface EthicsComplianceReport {
  reportId: string;
  timestamp: Date;
  period: {
    start: Date;
    end: Date;
  };
  framework: string;
  principles: EthicalPrincipleAssessment[];
  violations: EthicsViolation[];
  compliance: ComplianceAssessment;
  recommendations: EthicsRecommendation[];
  remediation: RemediationPlan;
  score: number;
  status: 'compliant' | 'non-compliant' | 'under-review';
}

export interface EthicalPrincipleAssessment {
  principleId: string;
  name: string;
  description: string;
  score: number;
  evidence: string[];
  gaps: string[];
  improvements: string[];
}

export interface EthicsViolation {
  violationId: string;
  principle: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  context: ViolationContext;
  detected: Date;
  reportedBy: string;
  investigation: Investigation;
  resolution: ViolationResolution;
  status: 'reported' | 'investigating' | 'resolved' | 'closed';
}

export interface ViolationContext {
  agent: string;
  action: string;
  stakeholders: string[];
  impact: ImpactAssessment;
  circumstances: string;
}

export interface Investigation {
  investigationId: string;
  investigator: string;
  startDate: Date;
  endDate?: Date;
  findings: string[];
  evidence: Evidence[];
  conclusions: string[];
}

export interface Evidence {
  evidenceId: string;
  type: 'log' | 'document' | 'testimony' | 'data' | 'external';
  description: string;
  source: string;
  reliability: number;
  timestamp: Date;
}

export interface ViolationResolution {
  resolutionId: string;
  type: 'corrective' | 'preventive' | 'disciplinary' | 'systemic';
  actions: ResolutionAction[];
  timeline: Date;
  responsible: string;
  effectiveness: number;
  followUp: FollowUpPlan;
}

export interface ResolutionAction {
  actionId: string;
  description: string;
  type: 'immediate' | 'short-term' | 'long-term';
  responsible: string;
  deadline: Date;
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled';
  outcome?: string;
}

export interface FollowUpPlan {
  planId: string;
  schedule: FollowUpSchedule[];
  metrics: FollowUpMetric[];
  reporting: string[];
  duration: number;
}

export interface FollowUpSchedule {
  date: Date;
  activity: string;
  responsible: string;
  deliverables: string[];
}

export interface FollowUpMetric {
  metric: string;
  baseline: number;
  target: number;
  current?: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface ComplianceAssessment {
  assessmentId: string;
  methodology: string;
  criteria: ComplianceCriteria[];
  findings: ComplianceFinding[];
  gaps: ComplianceGap[];
  recommendations: string[];
  overallScore: number;
}

export interface ComplianceCriteria {
  criteriaId: string;
  category: string;
  description: string;
  weight: number;
  score: number;
  evidence: string[];
}

export interface ComplianceFinding {
  findingId: string;
  type: 'strength' | 'weakness' | 'gap' | 'risk';
  description: string;
  severity: string;
  recommendation: string;
}

export interface ComplianceGap {
  gapId: string;
  area: string;
  description: string;
  impact: string;
  priority: number;
  remediation: string;
}

export interface EthicsRecommendation {
  recommendationId: string;
  category: 'policy' | 'process' | 'training' | 'technology' | 'oversight';
  description: string;
  rationale: string;
  implementation: ImplementationPlan;
  benefits: string[];
  risks: string[];
  priority: number;
}

export interface ImplementationPlan {
  planId: string;
  phases: ImplementationPhase[];
  resources: ResourceRequirement[];
  timeline: Date;
  dependencies: string[];
  success: SuccessCriteria[];
}

export interface ImplementationPhase {
  phaseId: string;
  name: string;
  duration: number;
  activities: string[];
  deliverables: string[];
  responsible: string;
}

export interface ResourceRequirement {
  resourceId: string;
  type: 'human' | 'financial' | 'technical' | 'infrastructure';
  description: string;
  quantity: number;
  cost?: number;
  availability: string;
}

export interface SuccessCriteria {
  criteriaId: string;
  description: string;
  measurable: boolean;
  target: any;
  method: string;
  timeline: Date;
}

export interface RemediationPlan {
  planId: string;
  scope: string;
  actions: RemediationAction[];
  timeline: RemediationTimeline;
  resources: ResourceAllocation[];
  monitoring: MonitoringPlan;
  success: SuccessIndicators;
}

export interface RemediationAction {
  actionId: string;
  type: 'immediate' | 'corrective' | 'preventive' | 'systemic';
  description: string;
  responsible: string;
  deadline: Date;
  dependencies: string[];
  status: 'planned' | 'active' | 'completed' | 'cancelled';
}

export interface RemediationTimeline {
  start: Date;
  phases: TimelinePhase[];
  milestones: TimelineMilestone[];
  completion: Date;
  buffers: number;
}

export interface TimelinePhase {
  phaseId: string;
  name: string;
  start: Date;
  end: Date;
  activities: string[];
  dependencies: string[];
}

export interface TimelineMilestone {
  milestoneId: string;
  name: string;
  date: Date;
  criteria: string[];
  deliverables: string[];
}

export interface ResourceAllocation {
  resourceId: string;
  type: string;
  amount: number;
  allocation: string;
  justification: string;
}

export interface MonitoringPlan {
  planId: string;
  frequency: string;
  metrics: MonitoringMetric[];
  reporting: MonitoringReport[];
  escalation: string[];
}

export interface MonitoringMetric {
  metricId: string;
  name: string;
  target: number;
  threshold: number;
  measurement: string;
}

export interface MonitoringReport {
  reportId: string;
  frequency: string;
  recipients: string[];
  format: string;
  automation: boolean;
}

export interface SuccessIndicators {
  primary: Indicator[];
  secondary: Indicator[];
  leading: Indicator[];
  lagging: Indicator[];
}

export interface Indicator {
  indicatorId: string;
  name: string;
  description: string;
  target: number;
  current?: number;
  trend?: string;
}

// Bias detection types
export interface BiasContext {
  domain: string;
  population: PopulationCharacteristics;
  sensitiveAttributes: string[];
  fairnessMetrics: string[];
  thresholds: BiasThreshold[];
  regulations: string[];
}

export interface PopulationCharacteristics {
  size: number;
  demographics: Demographic[];
  distribution: string;
  representativeness: number;
}

export interface Demographic {
  attribute: string;
  values: DemographicValue[];
  distribution: number[];
  representation: number;
}

export interface DemographicValue {
  value: string;
  count: number;
  percentage: number;
}

export interface BiasThreshold {
  metric: string;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: string;
}

export interface BiasAnalysis {
  analysisId: string;
  timestamp: Date;
  context: BiasContext;
  detected: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  types: BiasType[];
  metrics: BiasMetric[];
  evidence: BiasEvidence[];
  impact: BiasImpact;
  mitigation: BiasMitigation;
  recommendations: BiasRecommendation[];
}

export interface BiasType {
  type: string;
  description: string;
  confidence: number;
  evidence: string[];
  severity: string;
}

export interface BiasMetric {
  metric: string;
  value: number;
  threshold: number;
  status: 'pass' | 'warning' | 'fail';
  explanation: string;
}

export interface BiasEvidence {
  evidenceId: string;
  type: 'statistical' | 'visual' | 'case-study' | 'comparative';
  description: string;
  data: any;
  strength: number;
}

export interface BiasImpact {
  affected: AffectedGroup[];
  severity: string;
  scope: string;
  consequences: string[];
  likelihood: number;
}

export interface AffectedGroup {
  group: string;
  size: number;
  impact: string;
  magnitude: number;
}

export interface BiasMitigation {
  mitigationId: string;
  strategies: MitigationStrategy[];
  timeline: Date;
  effectiveness: number;
  monitoring: string[];
  validation: ValidationPlan;
}

export interface MitigationStrategy {
  strategyId: string;
  type: 'data' | 'algorithmic' | 'process' | 'oversight';
  description: string;
  implementation: string;
  effectiveness: number;
  cost: number;
}

export interface ValidationPlan {
  planId: string;
  methods: ValidationMethod[];
  frequency: string;
  criteria: string[];
  reporting: string;
}

export interface ValidationMethod {
  method: string;
  description: string;
  frequency: string;
  automation: boolean;
}

export interface BiasRecommendation {
  recommendationId: string;
  type: 'immediate' | 'preventive' | 'systemic';
  description: string;
  rationale: string;
  implementation: string;
  timeline: string;
  priority: number;
}

// Enforcement and escalation types
export interface EnforcementResult {
  enforcementId: string;
  timestamp: Date;
  scope: string;
  violations: AccountabilityViolation[];
  actions: EnforcementAction[];
  outcomes: EnforcementOutcome[];
  effectiveness: number;
  status: 'pending' | 'active' | 'successful' | 'partial' | 'failed';
}

export interface AccountabilityViolation {
  violationId: string;
  type: string;
  description: string;
  severity: string;
  agent: string;
  detected: Date;
  evidence: string[];
}

export interface EnforcementAction {
  actionId: string;
  type: 'warning' | 'corrective' | 'punitive' | 'preventive';
  description: string;
  target: string;
  timeline: Date;
  status: string;
  outcome?: string;
}

export interface EnforcementOutcome {
  outcomeId: string;
  action: string;
  result: string;
  effectiveness: number;
  feedback: string[];
  lessons: string[];
}

export interface EscalationResult {
  escalationId: string;
  timestamp: Date;
  issues: EscalationIssue[];
  escalations: Escalation[];
  resolutions: EscalationResolution[];
  status: 'in-progress' | 'resolved' | 'pending' | 'closed';
}

export interface EscalationIssue {
  issueId: string;
  type: string;
  description: string;
  severity: string;
  urgency: string;
  source: string;
  stakeholders: string[];
}

export interface Escalation {
  escalationId: string;
  issue: string;
  level: number;
  escalatedTo: string;
  timestamp: Date;
  justification: string;
  timeline: Date;
}

export interface EscalationResolution {
  resolutionId: string;
  escalation: string;
  type: string;
  description: string;
  responsible: string;
  timeline: Date;
  status: string;
}

// Reporting types
export interface AccountabilityReport {
  reportId: string;
  timestamp: Date;
  period: {
    start: Date;
    end: Date;
  };
  summary: AccountabilitySummary;
  metrics: AccountabilityMetrics;
  ethics: EthicsComplianceReport;
  bias: BiasReport;
  enforcement: EnforcementSummary;
  improvements: AccountabilityImprovement[];
  recommendations: AccountabilityRecommendation[];
}

export interface AccountabilitySummary {
  overallScore: number;
  keyAchievements: string[];
  majorChallenges: string[];
  trends: AccountabilityTrend[];
  highlights: string[];
}

export interface AccountabilityTrend {
  area: string;
  direction: 'improving' | 'stable' | 'declining';
  magnitude: number;
  confidence: number;
}

export interface BiasReport {
  reportId: string;
  summary: BiasSummary;
  detections: BiasDetectionSummary[];
  mitigations: BiasMitigationSummary[];
  trends: BiasTrend[];
  recommendations: string[];
}

export interface BiasSummary {
  totalDetections: number;
  criticalDetections: number;
  mitigatedCases: number;
  improvementRate: number;
  overallFairnessScore: number;
}

export interface BiasDetectionSummary {
  domain: string;
  detections: number;
  severity: string;
  trends: string;
}

export interface BiasMitigationSummary {
  strategy: string;
  applications: number;
  effectiveness: number;
  cost: number;
}

export interface BiasTrend {
  metric: string;
  direction: string;
  rate: number;
  significance: number;
}

export interface EnforcementSummary {
  totalActions: number;
  successfulActions: number;
  pendingActions: number;
  effectiveness: number;
  averageResolutionTime: number;
}

export interface AccountabilityImprovement {
  improvementId: string;
  area: string;
  description: string;
  impact: number;
  timeline: string;
  status: string;
}

export interface AccountabilityRecommendation {
  recommendationId: string;
  category: string;
  description: string;
  rationale: string;
  priority: number;
  implementation: string;
  benefits: string[];
}

// Governance audit types
export interface GovernanceAudit {
  auditId: string;
  timestamp: Date;
  scope: string;
  period: {
    start: Date;
    end: Date;
  };
  decisions: DecisionAudit[];
  compliance: ComplianceAudit;
  accountability: AccountabilityAudit;
  findings: AuditFinding[];
  recommendations: AuditRecommendation[];
  status: string;
}

export interface DecisionAudit {
  decisionId: string;
  quality: number;
  transparency: number;
  accountability: number;
  compliance: number;
  outcome: number;
  issues: string[];
}

export interface ComplianceAudit {
  overallScore: number;
  frameworks: FrameworkAudit[];
  violations: number;
  gaps: string[];
}

export interface FrameworkAudit {
  framework: string;
  score: number;
  requirements: RequirementAudit[];
  status: string;
}

export interface RequirementAudit {
  requirement: string;
  status: string;
  evidence: string[];
  gaps: string[];
}

export interface AccountabilityAudit {
  score: number;
  responsibilities: ResponsibilityAudit[];
  escalations: number;
  resolutions: number;
  effectiveness: number;
}

export interface ResponsibilityAudit {
  assignment: string;
  clarity: number;
  fulfillment: number;
  timeliness: number;
  quality: number;
}

export interface AuditFinding {
  findingId: string;
  type: 'strength' | 'weakness' | 'gap' | 'violation';
  area: string;
  description: string;
  severity: string;
  evidence: string[];
  impact: string;
}

export interface AuditRecommendation {
  recommendationId: string;
  finding: string;
  type: 'corrective' | 'preventive' | 'improvement';
  description: string;
  priority: number;
  timeline: string;
  responsible: string;
}

// Configuration types
export interface AccountabilityConfig {
  responsibility: ResponsibilityConfig;
  ethics: EthicsConfig;
  bias: BiasConfig;
  enforcement: EnforcementConfig;
  escalation: EscalationConfig;
  reporting: ReportingConfig;
  auditing: AuditingConfig;
  retention: RetentionConfig;
}

export interface ResponsibilityConfig {
  trackingInterval: number;
  trackingPeriod: number;
  clarityThreshold: number;
  escalationThreshold: number;
  delegationRules: boolean;
  approvalWorkflow: boolean;
}

export interface EthicsConfig {
  framework: string;
  monitoringInterval: number;
  auditPeriod: number;
  complianceThreshold: number;
  autoRemediation: boolean;
  trainingRequired: boolean;
}

export interface BiasConfig {
  detectionEnabled: boolean;
  fairnessMetrics: string[];
  thresholds: Record<string, number>;
  mitigationStrategies: string[];
  validationRequired: boolean;
  reportingLevel: string;
}

export interface EnforcementConfig {
  autoEnforcement: boolean;
  escalationLevels: number;
  maxRetries: number;
  effectivenessThreshold: number;
  appealProcess: boolean;
}

export interface EscalationConfig {
  levels: number;
  timeouts: number[];
  contacts: string[];
  autoEscalation: boolean;
  reviewRequired: boolean;
}

export interface ReportingConfig {
  period: number;
  distributionList: string[];
  format: string[];
  publicReporting: boolean;
  stakeholderReporting: boolean;
}

export interface AuditingConfig {
  auditPeriod: number;
  independentAuditor: boolean;
  auditScope: string[];
  complianceFrameworks: string[];
  reportingLevel: string;
}

export interface RetentionConfig {
  responsibilityRecords: number;
  ethicsRecords: number;
  biasRecords: number;
  auditRecords: number;
  reportRetention: number;
}

// Impact assessment types
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
