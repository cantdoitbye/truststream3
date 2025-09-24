/**
 * Consensus Coordination Protocols Interface
 * 
 * Defines contracts for distributed consensus mechanisms, voting protocols,
 * decision coordination, and conflict resolution among governance agents.
 */

import {
  ConsensusProposal,
  ConsensusVote,
  ConsensusSession,
  ConsensusResult,
  DecisionSession,
  DecisionContribution,
  FinalDecision
} from './ICommunication';

export interface IConsensusCoordinator {
  // === CONSENSUS LIFECYCLE ===
  
  /**
   * Initialize consensus coordinator
   */
  initialize(config: ConsensusConfig): Promise<void>;
  
  /**
   * Start consensus processing
   */
  start(): Promise<void>;
  
  /**
   * Stop consensus processing
   */
  stop(): Promise<void>;
  
  /**
   * Get coordinator health
   */
  getHealth(): Promise<ConsensusHealth>;
  
  // === CONSENSUS INITIATION ===
  
  /**
   * Initiate new consensus session
   */
  initiateConsensus(
    proposal: ConsensusProposal,
    participants: string[],
    options?: ConsensusOptions
  ): Promise<ConsensusSession>;
  
  /**
   * Create multi-round consensus
   */
  createMultiRoundConsensus(
    proposal: ConsensusProposal,
    rounds: ConsensusRound[],
    participants: string[]
  ): Promise<MultiRoundSession>;
  
  /**
   * Initiate emergency consensus
   */
  initiateEmergencyConsensus(
    proposal: EmergencyProposal,
    participants: string[],
    timeout: number
  ): Promise<EmergencySession>;
  
  // === VOTING OPERATIONS ===
  
  /**
   * Cast vote in consensus session
   */
  castVote(
    sessionId: string,
    agentId: string,
    vote: ConsensusVote
  ): Promise<VoteResult>;
  
  /**
   * Update or revise existing vote
   */
  reviseVote(
    sessionId: string,
    agentId: string,
    revisedVote: ConsensusVote,
    reason: string
  ): Promise<VoteRevisionResult>;
  
  /**
   * Delegate voting power
   */
  delegateVote(
    sessionId: string,
    delegator: string,
    delegate: string,
    scope: DelegationScope
  ): Promise<DelegationResult>;
  
  /**
   * Revoke vote delegation
   */
  revokeDelegation(
    sessionId: string,
    delegator: string,
    delegate: string
  ): Promise<void>;
  
  // === CONSENSUS MANAGEMENT ===
  
  /**
   * Get active consensus sessions
   */
  getActiveSessions(): Promise<ConsensusSession[]>;
  
  /**
   * Get consensus session by ID
   */
  getSession(sessionId: string): Promise<ConsensusSession | null>;
  
  /**
   * Extend consensus deadline
   */
  extendDeadline(
    sessionId: string,
    newDeadline: Date,
    reason: string
  ): Promise<void>;
  
  /**
   * Cancel consensus session
   */
  cancelSession(
    sessionId: string,
    reason: string,
    authorizedBy: string
  ): Promise<void>;
  
  /**
   * Force finalize consensus
   */
  forceFinalizeConsensus(
    sessionId: string,
    authorizedBy: string,
    justification: string
  ): Promise<ConsensusResult>;
  
  // === DECISION COORDINATION ===
  
  /**
   * Create collaborative decision session
   */
  createDecisionSession(
    topic: string,
    participants: string[],
    options?: DecisionSessionOptions
  ): Promise<DecisionSession>;
  
  /**
   * Contribute to decision session
   */
  contributeToDecision(
    sessionId: string,
    contribution: DecisionContribution
  ): Promise<ContributionResult>;
  
  /**
   * Synthesize decision from contributions
   */
  synthesizeDecision(
    sessionId: string,
    synthesizer: string
  ): Promise<DecisionSynthesis>;
  
  /**
   * Finalize collaborative decision
   */
  finalizeDecision(
    sessionId: string,
    finalDecision: FinalDecision
  ): Promise<DecisionFinalizationResult>;
  
  // === CONFLICT RESOLUTION ===
  
  /**
   * Detect consensus conflicts
   */
  detectConflicts(
    sessionId: string
  ): Promise<ConflictAnalysis>;
  
  /**
   * Initiate conflict resolution
   */
  initiateConflictResolution(
    sessionId: string,
    conflicts: Conflict[],
    strategy: ResolutionStrategy
  ): Promise<ConflictResolution>;
  
  /**
   * Mediate between conflicting parties
   */
  mediateConflict(
    conflictId: string,
    mediator: string,
    proposal: MediationProposal
  ): Promise<MediationResult>;
  
  /**
   * Escalate unresolved conflicts
   */
  escalateConflict(
    conflictId: string,
    escalationLevel: EscalationLevel,
    reason: string
  ): Promise<EscalationResult>;
  
  // === CONSENSUS ALGORITHMS ===
  
  /**
   * Execute RAFT consensus
   */
  executeRaftConsensus(
    proposal: ConsensusProposal,
    participants: RaftNode[]
  ): Promise<RaftResult>;
  
  /**
   * Execute Byzantine Fault Tolerant consensus
   */
  executeBftConsensus(
    proposal: ConsensusProposal,
    participants: BftNode[],
    faultTolerance: number
  ): Promise<BftResult>;
  
  /**
   * Execute Practical Byzantine Fault Tolerance
   */
  executePbftConsensus(
    proposal: ConsensusProposal,
    participants: PbftNode[]
  ): Promise<PbftResult>;
  
  /**
   * Execute weighted voting consensus
   */
  executeWeightedConsensus(
    proposal: ConsensusProposal,
    participants: WeightedParticipant[]
  ): Promise<WeightedResult>;
  
  // === MONITORING AND ANALYTICS ===
  
  /**
   * Get consensus metrics
   */
  getConsensusMetrics(): Promise<ConsensusMetrics>;
  
  /**
   * Get participation metrics
   */
  getParticipationMetrics(
    timeRange?: TimeRange
  ): Promise<ParticipationMetrics>;
  
  /**
   * Analyze consensus patterns
   */
  analyzeConsensusPatterns(
    criteria: AnalysisCriteria
  ): Promise<ConsensusPatternAnalysis>;
  
  /**
   * Generate consensus report
   */
  generateConsensusReport(
    sessionId: string
  ): Promise<ConsensusReport>;
}

// === CONFIGURATION ===

export interface ConsensusConfig {
  algorithms: AlgorithmConfig[];
  defaultAlgorithm: ConsensusAlgorithm;
  timeouts: TimeoutConfig;
  quorum: QuorumConfig;
  voting: VotingConfig;
  delegation: DelegationConfig;
  conflictResolution: ConflictResolutionConfig;
  security: ConsensusSecurityConfig;
  persistence: ConsensusPersistenceConfig;
}

export interface AlgorithmConfig {
  algorithm: ConsensusAlgorithm;
  enabled: boolean;
  parameters: Record<string, any>;
  applicableScenarios: string[];
}

export interface TimeoutConfig {
  defaultSessionTimeout: number;
  votingTimeout: number;
  deliberationTimeout: number;
  emergencyTimeout: number;
  extensionAllowed: boolean;
  maxExtensions: number;
}

export interface QuorumConfig {
  defaultQuorum: number;
  minimumQuorum: number;
  dynamicQuorum: boolean;
  quorumCalculation: QuorumCalculation;
  abstentionHandling: AbstentionHandling;
}

export interface VotingConfig {
  allowRevision: boolean;
  revisionDeadline: number;
  allowDelegation: boolean;
  weightedVoting: boolean;
  secretBallot: boolean;
  auditTrail: boolean;
}

export interface DelegationConfig {
  enabled: boolean;
  maxDelegationDepth: number;
  revocable: boolean;
  scopeLimitations: string[];
  auditRequired: boolean;
}

export interface ConflictResolutionConfig {
  autoDetection: boolean;
  resolutionStrategies: ResolutionStrategy[];
  mediationRequired: boolean;
  escalationLevels: EscalationLevel[];
  timeouts: ConflictTimeoutConfig;
}

export interface ConsensusSecurityConfig {
  authentication: boolean;
  authorization: boolean;
  encryption: boolean;
  digitalSignatures: boolean;
  auditLogging: boolean;
  tamperDetection: boolean;
}

export interface ConsensusPersistenceConfig {
  enabled: boolean;
  storageType: StorageType;
  retentionPeriod: number;
  compression: boolean;
  encryption: boolean;
  backup: BackupConfig;
}

// === OPTIONS ===

export interface ConsensusOptions {
  algorithm?: ConsensusAlgorithm;
  timeout?: number;
  quorumOverride?: number;
  majorityOverride?: number;
  allowDelegation?: boolean;
  requireJustification?: boolean;
  confidential?: boolean;
  priority?: ConsensusPriority;
}

export interface DecisionSessionOptions {
  timeout?: number;
  maxContributions?: number;
  requireConsensus?: boolean;
  allowAnonymous?: boolean;
  structuredDeliberation?: boolean;
  facilitator?: string;
}

// === SESSION TYPES ===

export interface MultiRoundSession extends ConsensusSession {
  rounds: ConsensusRound[];
  currentRound: number;
  roundResults: RoundResult[];
}

export interface EmergencySession extends ConsensusSession {
  emergencyLevel: EmergencyLevel;
  acceleratedProcedure: boolean;
  authorizedBy: string;
  justification: string;
}

export interface ConsensusRound {
  roundNumber: number;
  description: string;
  timeout: number;
  quorumRequirement: number;
  majorityThreshold: number;
  allowedVoteChanges: boolean;
}

export interface RoundResult {
  roundNumber: number;
  votes: ConsensusVote[];
  quorumMet: boolean;
  majorityAchieved: boolean;
  outcome: RoundOutcome;
  nextRoundRequired: boolean;
}

export interface EmergencyProposal extends ConsensusProposal {
  emergencyLevel: EmergencyLevel;
  justification: string;
  authorizedBy: string;
  immediateAction: boolean;
  fallbackPlan?: FallbackPlan;
}

// === VOTING RESULTS ===

export interface VoteResult {
  voteId: string;
  sessionId: string;
  agentId: string;
  accepted: boolean;
  timestamp: Date;
  voteWeight: number;
  delegatedVotes?: DelegatedVote[];
}

export interface VoteRevisionResult {
  originalVoteId: string;
  revisedVoteId: string;
  revisionReason: string;
  authorizedBy: string;
  timestamp: Date;
  impactAnalysis: RevisionImpact;
}

export interface DelegationResult {
  delegationId: string;
  delegator: string;
  delegate: string;
  scope: DelegationScope;
  effectiveFrom: Date;
  expiresAt?: Date;
  voteWeight: number;
}

export interface DelegatedVote {
  delegator: string;
  voteWeight: number;
  scope: DelegationScope;
  timestamp: Date;
}

// === DECISION COORDINATION ===

export interface ContributionResult {
  contributionId: string;
  sessionId: string;
  agentId: string;
  accepted: boolean;
  quality: number;
  relevance: number;
  timestamp: Date;
}

export interface DecisionSynthesis {
  sessionId: string;
  synthesizer: string;
  methodology: SynthesisMethodology;
  keyPoints: string[];
  consensusAreas: string[];
  disagreementAreas: string[];
  recommendedAction: string;
  confidence: number;
  timestamp: Date;
}

export interface DecisionFinalizationResult {
  sessionId: string;
  finalDecision: FinalDecision;
  implementation: ImplementationPlan;
  approval: ApprovalRecord;
  timestamp: Date;
}

// === CONFLICT RESOLUTION ===

export interface ConflictAnalysis {
  sessionId: string;
  conflicts: Conflict[];
  severity: ConflictSeverity;
  resolutionComplexity: ResolutionComplexity;
  recommendedStrategies: ResolutionStrategy[];
  timeToResolution: number;
}

export interface Conflict {
  id: string;
  type: ConflictType;
  parties: string[];
  description: string;
  positions: ConflictPosition[];
  severity: ConflictSeverity;
  resolvable: boolean;
}

export interface ConflictPosition {
  agentId: string;
  position: string;
  rationale: string;
  flexibility: number;
  requirements: string[];
}

export interface ConflictResolution {
  conflictId: string;
  strategy: ResolutionStrategy;
  mediator?: string;
  resolution: Resolution;
  timeline: ResolutionTimeline;
  outcome: ResolutionOutcome;
}

export interface MediationProposal {
  conflictId: string;
  mediator: string;
  approach: MediationApproach;
  timeline: MediationTimeline;
  requirements: MediationRequirement[];
  expectedOutcome: string;
}

export interface MediationResult {
  proposalId: string;
  accepted: boolean;
  mediation: MediationSession;
  outcome: MediationOutcome;
  followUp: FollowUpAction[];
}

export interface EscalationResult {
  conflictId: string;
  level: EscalationLevel;
  escalatedTo: string[];
  timeline: EscalationTimeline;
  requirements: EscalationRequirement[];
}

// === CONSENSUS ALGORITHMS ===

export interface RaftNode {
  id: string;
  endpoint: string;
  role: RaftRole;
  term: number;
  lastLogIndex: number;
  commitIndex: number;
}

export interface RaftResult {
  leader: string;
  term: number;
  committed: boolean;
  logIndex: number;
  participants: RaftParticipant[];
}

export interface BftNode {
  id: string;
  endpoint: string;
  publicKey: string;
  trustScore: number;
  stake: number;
}

export interface BftResult {
  consensus: boolean;
  byzantineFaults: number;
  toleratedFaults: number;
  agreement: BftAgreement;
  participants: BftParticipant[];
}

export interface PbftNode {
  id: string;
  endpoint: string;
  view: number;
  sequenceNumber: number;
  phase: PbftPhase;
}

export interface PbftResult {
  consensus: boolean;
  view: number;
  sequenceNumber: number;
  phases: PhaseResult[];
  participants: PbftParticipant[];
}

export interface WeightedParticipant {
  agentId: string;
  voteWeight: number;
  expertise: ExpertiseWeight[];
  delegation: DelegationWeight[];
}

export interface WeightedResult {
  totalWeight: number;
  weightedOutcome: WeightedOutcome;
  distribution: WeightDistribution;
  participants: WeightedParticipant[];
}

// === METRICS AND ANALYTICS ===

export interface ConsensusHealth {
  status: HealthStatus;
  activeSessions: number;
  averageConsensusTime: number;
  successRate: number;
  conflictRate: number;
  participationRate: number;
  lastUpdated: Date;
}

export interface ConsensusMetrics {
  totalSessions: number;
  successfulSessions: number;
  failedSessions: number;
  averageConsensusTime: number;
  averageParticipation: number;
  algorithmUsage: AlgorithmUsage[];
  conflictStatistics: ConflictStatistics;
  participationTrends: ParticipationTrend[];
}

export interface ParticipationMetrics {
  totalParticipants: number;
  activeParticipants: number;
  participationRate: number;
  averageContributions: number;
  leadershipDistribution: LeadershipDistribution;
  expertiseUtilization: ExpertiseUtilization[];
}

export interface ConsensusPatternAnalysis {
  patterns: ConsensusPattern[];
  recommendations: PatternRecommendation[];
  predictions: ConsensusPrediction[];
  trends: ConsensusTrend[];
}

export interface ConsensusReport {
  sessionId: string;
  summary: SessionSummary;
  participation: ParticipationSummary;
  timeline: SessionTimeline;
  decisions: DecisionSummary[];
  conflicts: ConflictSummary[];
  recommendations: ReportRecommendation[];
  metadata: ReportMetadata;
}

// === TYPES AND ENUMS ===

export type ConsensusAlgorithm = 
  | 'simple_majority'
  | 'supermajority'
  | 'unanimous'
  | 'weighted_voting'
  | 'raft'
  | 'bft'
  | 'pbft'
  | 'delegated_proof_of_stake'
  | 'proof_of_authority'
  | 'custom';

export type QuorumCalculation = 
  | 'fixed_percentage'
  | 'dynamic_participation'
  | 'expertise_weighted'
  | 'role_based'
  | 'custom';

export type AbstentionHandling = 
  | 'ignore'
  | 'count_as_no'
  | 'reduce_quorum'
  | 'require_explanation';

export type ResolutionStrategy = 
  | 'majority_override'
  | 'expert_mediation'
  | 'compromise_seeking'
  | 'hierarchical_escalation'
  | 'external_arbitration'
  | 'delay_and_reconsider';

export type EscalationLevel = 
  | 'team_lead'
  | 'department_head'
  | 'executive_committee'
  | 'board_level'
  | 'external_arbitrator';

export type ConsensusPriority = 
  | 'low'
  | 'normal'
  | 'high'
  | 'critical'
  | 'emergency';

export type EmergencyLevel = 
  | 'minor'
  | 'moderate'
  | 'major'
  | 'critical'
  | 'catastrophic';

export type RoundOutcome = 
  | 'consensus_reached'
  | 'no_consensus'
  | 'insufficient_participation'
  | 'time_expired'
  | 'cancelled';

export type ConflictType = 
  | 'value_conflict'
  | 'resource_conflict'
  | 'process_conflict'
  | 'goal_conflict'
  | 'interpretation_conflict';

export type ConflictSeverity = 
  | 'minor'
  | 'moderate'
  | 'major'
  | 'severe'
  | 'critical';

export type ResolutionComplexity = 
  | 'simple'
  | 'moderate'
  | 'complex'
  | 'very_complex';

export type MediationApproach = 
  | 'facilitative'
  | 'evaluative'
  | 'transformative'
  | 'narrative'
  | 'hybrid';

export type ResolutionOutcome = 
  | 'resolved'
  | 'partially_resolved'
  | 'unresolved'
  | 'escalated'
  | 'deferred';

export type MediationOutcome = 
  | 'agreement_reached'
  | 'partial_agreement'
  | 'impasse'
  | 'withdrawn'
  | 'escalated';

export type RaftRole = 
  | 'leader'
  | 'follower'
  | 'candidate';

export type PbftPhase = 
  | 'pre_prepare'
  | 'prepare'
  | 'commit'
  | 'committed';

export type SynthesisMethodology = 
  | 'weighted_average'
  | 'expert_judgment'
  | 'consensus_building'
  | 'delphi_method'
  | 'nominal_group';

export type HealthStatus = 
  | 'healthy'
  | 'degraded'
  | 'unhealthy';

// === SUPPORTING INTERFACES ===

export interface DelegationScope {
  sessionTypes: string[];
  topicAreas: string[];
  timeFrame: TimeRange;
  limitations: string[];
}

export interface RevisionImpact {
  affectedVotes: string[];
  quorumImpact: boolean;
  outcomeChange: boolean;
  notificationRequired: boolean;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface AnalysisCriteria {
  timeRange?: TimeRange;
  sessionTypes?: string[];
  participants?: string[];
  outcomes?: string[];
  algorithms?: ConsensusAlgorithm[];
}

export interface StorageType {
  type: 'database' | 'file' | 'distributed';
  location: string;
  replication: boolean;
}

export interface BackupConfig {
  enabled: boolean;
  frequency: number;
  retention: number;
  location: string;
}

export interface ConflictTimeoutConfig {
  detectionTimeout: number;
  resolutionTimeout: number;
  mediationTimeout: number;
  escalationTimeout: number;
}

export interface FallbackPlan {
  actions: FallbackAction[];
  triggers: FallbackTrigger[];
  autorization: string;
}

export interface FallbackAction {
  action: string;
  priority: number;
  required: boolean;
}

export interface FallbackTrigger {
  condition: string;
  threshold: number;
  timeout: number;
}

export interface Resolution {
  type: string;
  description: string;
  terms: ResolutionTerm[];
  implementation: ImplementationStep[];
}

export interface ResolutionTerm {
  party: string;
  commitment: string;
  deadline?: Date;
  measurable: boolean;
}

export interface ImplementationStep {
  step: string;
  responsible: string;
  deadline: Date;
  dependencies: string[];
}

export interface ResolutionTimeline {
  start: Date;
  milestones: Milestone[];
  estimatedCompletion: Date;
}

export interface Milestone {
  name: string;
  date: Date;
  description: string;
  critical: boolean;
}

export interface MediationSession {
  id: string;
  mediator: string;
  parties: string[];
  approach: MediationApproach;
  timeline: MediationTimeline;
  status: SessionStatus;
}

export interface MediationTimeline {
  start: Date;
  sessions: SessionSchedule[];
  expectedCompletion: Date;
}

export interface SessionSchedule {
  date: Date;
  duration: number;
  agenda: string[];
  participants: string[];
}

export interface MediationRequirement {
  type: string;
  description: string;
  mandatory: boolean;
}

export interface FollowUpAction {
  action: string;
  responsible: string;
  deadline: Date;
  priority: string;
}

export interface EscalationTimeline {
  initiated: Date;
  reviewBy: Date;
  decisionBy: Date;
  implementationBy: Date;
}

export interface EscalationRequirement {
  level: EscalationLevel;
  authority: string;
  documentation: string[];
  timeline: number;
}

export interface RaftParticipant {
  node: RaftNode;
  vote: boolean;
  responseTime: number;
}

export interface BftAgreement {
  value: any;
  signature: string;
  timestamp: Date;
}

export interface BftParticipant {
  node: BftNode;
  agreement: BftAgreement;
  byzantine: boolean;
}

export interface PhaseResult {
  phase: PbftPhase;
  votes: number;
  required: number;
  successful: boolean;
}

export interface PbftParticipant {
  node: PbftNode;
  phases: PhaseParticipation[];
}

export interface PhaseParticipation {
  phase: PbftPhase;
  participated: boolean;
  timestamp: Date;
}

export interface ExpertiseWeight {
  domain: string;
  weight: number;
  certification: string;
}

export interface DelegationWeight {
  delegator: string;
  weight: number;
  scope: string[];
}

export interface WeightedOutcome {
  decision: string;
  totalWeight: number;
  distribution: VoteDistribution[];
}

export interface VoteDistribution {
  option: string;
  weight: number;
  percentage: number;
  participants: number;
}

export interface WeightDistribution {
  byAgent: AgentWeight[];
  byExpertise: ExpertiseDistribution[];
  byDelegation: DelegationDistribution[];
}

export interface AgentWeight {
  agentId: string;
  totalWeight: number;
  directWeight: number;
  delegatedWeight: number;
}

export interface ExpertiseDistribution {
  domain: string;
  totalWeight: number;
  averageWeight: number;
  participants: number;
}

export interface DelegationDistribution {
  delegator: string;
  totalDelegated: number;
  activeDelegations: number;
}

export interface AlgorithmUsage {
  algorithm: ConsensusAlgorithm;
  usageCount: number;
  successRate: number;
  averageTime: number;
}

export interface ConflictStatistics {
  totalConflicts: number;
  resolvedConflicts: number;
  averageResolutionTime: number;
  conflictsByType: Record<ConflictType, number>;
  resolutionByStrategy: Record<ResolutionStrategy, number>;
}

export interface ParticipationTrend {
  period: string;
  participationRate: number;
  averageContributions: number;
  qualityScore: number;
}

export interface LeadershipDistribution {
  byAgent: LeadershipMetric[];
  rotationRate: number;
  concentrationIndex: number;
}

export interface LeadershipMetric {
  agentId: string;
  sessionsLed: number;
  successRate: number;
  averageTime: number;
}

export interface ExpertiseUtilization {
  domain: string;
  utilizationRate: number;
  demandLevel: number;
  expertCount: number;
}

export interface ConsensusPattern {
  pattern: string;
  frequency: number;
  conditions: string[];
  outcomes: string[];
  confidence: number;
}

export interface PatternRecommendation {
  pattern: string;
  recommendation: string;
  expectedImprovement: number;
  implementation: string[];
}

export interface ConsensusPrediction {
  scenario: string;
  probability: number;
  timeframe: string;
  factors: string[];
}

export interface ConsensusTrend {
  metric: string;
  direction: 'improving' | 'declining' | 'stable';
  magnitude: number;
  timeframe: string;
}

export interface SessionSummary {
  sessionId: string;
  duration: number;
  participants: number;
  outcome: string;
  algorithm: ConsensusAlgorithm;
  finalResult: ConsensusResult;
}

export interface ParticipationSummary {
  totalParticipants: number;
  activeParticipants: number;
  contributions: number;
  qualityScore: number;
  engagementLevel: number;
}

export interface SessionTimeline {
  started: Date;
  phases: PhaseTimeline[];
  completed: Date;
  duration: number;
}

export interface PhaseTimeline {
  phase: string;
  start: Date;
  end: Date;
  duration: number;
  activities: string[];
}

export interface DecisionSummary {
  decision: string;
  rationale: string;
  support: number;
  opposition: number;
  implementation: string;
}

export interface ConflictSummary {
  conflictId: string;
  type: ConflictType;
  parties: string[];
  resolution: ResolutionOutcome;
  time: number;
}

export interface ReportRecommendation {
  area: string;
  recommendation: string;
  priority: string;
  expectedBenefit: string;
}

export interface ReportMetadata {
  generatedBy: string;
  generatedAt: Date;
  version: string;
  confidentiality: string;
}

export type SessionStatus = 
  | 'active'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'suspended';

export interface ImplementationPlan {
  steps: ImplementationStep[];
  timeline: Date;
  resources: string[];
  risks: string[];
}

export interface ApprovalRecord {
  approvedBy: string[];
  approvalLevel: string;
  timestamp: Date;
  conditions: string[];
}
