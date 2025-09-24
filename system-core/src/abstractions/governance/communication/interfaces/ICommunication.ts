/**
 * Core Communication Interfaces for Governance Agents
 * 
 * Defines the contracts for inter-agent communication, event-driven messaging,
 * consensus coordination, and agent discovery protocols.
 */

export interface IAgentCommunication {
  // === DIRECT MESSAGING ===
  
  /**
   * Send synchronous request-response message
   */
  sendRequest<T>(
    targetAgent: string, 
    request: AgentRequest
  ): Promise<AgentResponse<T>>;
  
  /**
   * Send asynchronous message with delivery confirmation
   */
  sendMessage(
    targetAgent: string, 
    message: AgentMessage
  ): Promise<MessageDeliveryConfirmation>;
  
  /**
   * Broadcast message to multiple agents
   */
  broadcast(
    message: BroadcastMessage, 
    recipients?: string[]
  ): Promise<BroadcastConfirmation>;
  
  // === EVENT-DRIVEN COMMUNICATION ===
  
  /**
   * Publish governance event to event stream
   */
  publishEvent(event: GovernanceEvent): Promise<EventPublishConfirmation>;
  
  /**
   * Subscribe to specific event types
   */
  subscribeToEvents(
    eventTypes: string[], 
    handler: EventHandler
  ): Promise<SubscriptionHandle>;
  
  /**
   * Unsubscribe from events
   */
  unsubscribeFromEvents(handle: SubscriptionHandle): Promise<void>;
  
  // === COORDINATION PROTOCOLS ===
  
  /**
   * Initiate consensus voting session
   */
  initiateConsensus(proposal: ConsensusProposal): Promise<ConsensusSession>;
  
  /**
   * Participate in consensus voting
   */
  participateInConsensus(
    sessionId: string, 
    vote: ConsensusVote
  ): Promise<void>;
  
  /**
   * Create collaborative decision session
   */
  createDecisionSession(
    decision: CollaborativeDecision
  ): Promise<DecisionSession>;
  
  /**
   * Contribute to collaborative decision
   */
  contributeToDecision(
    sessionId: string, 
    contribution: DecisionContribution
  ): Promise<void>;
  
  /**
   * Request assistance from other agents
   */
  requestAssistance(task: AssistanceRequest): Promise<AssistanceOffer[]>;
  
  /**
   * Offer assistance for a request
   */
  offerAssistance(
    requestId: string, 
    offer: AssistanceOffer
  ): Promise<void>;
  
  // === DISCOVERY AND PRESENCE ===
  
  /**
   * Discover agents based on criteria
   */
  discoverAgents(criteria: DiscoveryCriteria): Promise<AgentInfo[]>;
  
  /**
   * Announce agent capabilities
   */
  announceCapabilities(capabilities: AgentCapability[]): Promise<void>;
  
  /**
   * Update agent presence information
   */
  updatePresence(presence: PresenceInfo): Promise<void>;
  
  /**
   * Query presence of specific agents
   */
  queryPresence(agentIds: string[]): Promise<PresenceMap>;
  
  // === COMMUNICATION QOS ===
  
  /**
   * Send message with delivery guarantee
   */
  sendWithDeliveryGuarantee(
    message: ReliableMessage, 
    guarantee: DeliveryGuarantee
  ): Promise<DeliveryConfirmation>;
  
  /**
   * Send priority message
   */
  sendPriorityMessage(
    message: PriorityMessage
  ): Promise<PriorityDeliveryConfirmation>;
  
  /**
   * Get communication metrics
   */
  getCommunicationMetrics(): Promise<CommunicationMetrics>;
}

// === MESSAGE TYPES ===

export interface AgentMessage {
  id: string;
  from: string;
  to: string;
  type: MessageType;
  timestamp: Date;
  priority: MessagePriority;
  payload: any;
  metadata?: MessageMetadata;
  correlationId?: string;
  replyTo?: string;
  ttl?: number; // Time to live in milliseconds
}

export interface AgentRequest extends AgentMessage {
  expectsResponse: true;
  timeout: number;
  retryPolicy?: RetryPolicy;
}

export interface AgentResponse<T> {
  id: string;
  requestId: string;
  from: string;
  to: string;
  success: boolean;
  data?: T;
  error?: ErrorInfo;
  timestamp: Date;
  processingTime: number;
}

export interface BroadcastMessage extends Omit<AgentMessage, 'to'> {
  audience: BroadcastAudience;
  exclusions?: string[];
}

export interface GovernanceEvent extends AgentMessage {
  eventType: GovernanceEventType;
  domain: GovernanceDomain;
  severity: EventSeverity;
  impact: ImpactLevel;
  evidence: EventEvidence[];
  cascadeRules?: CascadeRule[];
}

export interface ConsensusProposal extends AgentMessage {
  proposalId: string;
  proposalType: ProposalType;
  description: string;
  rationale: string;
  alternatives: ProposalAlternative[];
  requiredParticipants: string[];
  deadline: Date;
  votingRules: VotingRules;
  quorumRequirement: number;
  majorityThreshold: number;
}

export interface ConsensusVote {
  sessionId: string;
  agentId: string;
  vote: VoteChoice;
  confidence: number;
  rationale?: string;
  conditions?: VoteCondition[];
  timestamp: Date;
}

export interface DecisionContribution extends AgentMessage {
  decisionId: string;
  contributionType: ContributionType;
  content: ContributionContent;
  confidence: number;
  supportingEvidence: Evidence[];
  dependencies?: string[];
}

export interface AssistanceRequest extends AgentMessage {
  requestId: string;
  taskDescription: string;
  requiredCapabilities: string[];
  deadline: Date;
  urgency: UrgencyLevel;
  resourcesOffered: ResourceOffer[];
  constraints: TaskConstraint[];
}

export interface AssistanceOffer {
  requestId: string;
  offeringAgent: string;
  capabilities: string[];
  availability: AvailabilityWindow;
  cost: ResourceCost;
  conditions: OfferCondition[];
  confidence: number;
}

// === ENUMS AND TYPES ===

export type MessageType = 
  | 'request'
  | 'response'
  | 'notification'
  | 'event'
  | 'broadcast'
  | 'consensus'
  | 'decision'
  | 'assistance'
  | 'discovery'
  | 'heartbeat';

export type MessagePriority = 
  | 'low'
  | 'normal'
  | 'high'
  | 'critical'
  | 'emergency';

export type GovernanceEventType = 
  | 'policy_violation'
  | 'threshold_breach'
  | 'anomaly_detected'
  | 'compliance_issue'
  | 'performance_degradation'
  | 'security_incident'
  | 'consensus_reached'
  | 'decision_required'
  | 'escalation_needed';

export type GovernanceDomain = 
  | 'efficiency'
  | 'quality'
  | 'transparency'
  | 'accountability'
  | 'innovation'
  | 'multi_domain';

export type EventSeverity = 
  | 'info'
  | 'warning'
  | 'error'
  | 'critical'
  | 'emergency';

export type ImpactLevel = 
  | 'minimal'
  | 'low'
  | 'medium'
  | 'high'
  | 'severe';

export type ProposalType = 
  | 'policy_change'
  | 'action_approval'
  | 'resource_allocation'
  | 'escalation'
  | 'configuration_change'
  | 'emergency_response';

export type VoteChoice = 
  | 'yes'
  | 'no'
  | 'abstain'
  | 'conditional';

export type ContributionType = 
  | 'analysis'
  | 'recommendation'
  | 'evidence'
  | 'risk_assessment'
  | 'alternative_proposal'
  | 'implementation_plan';

export type UrgencyLevel = 
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export type DeliveryGuarantee = 
  | 'at_most_once'
  | 'at_least_once'
  | 'exactly_once';

export type BroadcastAudience = 
  | 'all_agents'
  | 'governance_agents'
  | 'domain_specific'
  | 'role_based'
  | 'custom';

// === SUPPORTING INTERFACES ===

export interface MessageMetadata {
  sourceSystem?: string;
  version?: string;
  encoding?: string;
  compression?: string;
  encryption?: EncryptionInfo;
  routing?: RoutingInfo;
  tracing?: TracingInfo;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  baseDelayMs: number;
  maxDelayMs: number;
  jitter?: boolean;
}

export interface ErrorInfo {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  category: ErrorCategory;
}

export interface EventEvidence {
  type: 'metric' | 'log' | 'alert' | 'trace' | 'user_report';
  source: string;
  timestamp: Date;
  data: any;
  confidence: number;
}

export interface CascadeRule {
  condition: string;
  targetAgents: string[];
  action: 'notify' | 'trigger' | 'escalate';
  delay?: number;
}

export interface ProposalAlternative {
  id: string;
  description: string;
  pros: string[];
  cons: string[];
  cost: number;
  risk: RiskLevel;
  implementationTime: number;
}

export interface VotingRules {
  allowDelegation: boolean;
  allowRevision: boolean;
  requireJustification: boolean;
  confidentialVoting: boolean;
  weightedVoting: boolean;
  dynamicQuorum: boolean;
}

export interface VoteCondition {
  type: 'if' | 'unless' | 'after' | 'before';
  condition: string;
  value: any;
}

export interface ContributionContent {
  summary: string;
  details: any;
  attachments?: Attachment[];
  references?: Reference[];
  tags?: string[];
}

export interface Evidence {
  id: string;
  type: EvidenceType;
  source: string;
  content: any;
  reliability: number;
  timestamp: Date;
  verificationStatus: VerificationStatus;
}

export interface ResourceOffer {
  type: ResourceType;
  amount: number;
  unit: string;
  availability: AvailabilityWindow;
}

export interface TaskConstraint {
  type: ConstraintType;
  description: string;
  mandatory: boolean;
  weight: number;
}

export interface AvailabilityWindow {
  start: Date;
  end: Date;
  timezone: string;
  exclusions?: TimeRange[];
}

export interface ResourceCost {
  type: CostType;
  amount: number;
  currency: string;
  billingModel: BillingModel;
}

export interface OfferCondition {
  type: ConditionType;
  description: string;
  negotiable: boolean;
}

// === DISCOVERY AND PRESENCE ===

export interface DiscoveryCriteria {
  agentTypes?: string[];
  capabilities?: string[];
  minPerformanceScore?: number;
  maxResponseTime?: number;
  availabilityRequirement?: AvailabilityRequirement;
  geographicPreference?: string;
  loadBalancing?: LoadBalancingStrategy;
}

export interface AgentInfo {
  id: string;
  type: string;
  capabilities: string[];
  performanceScore: number;
  currentLoad: number;
  responseTime: number;
  endpoint: string;
}

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  parameters: ParameterDefinition[];
  qualityMetrics: QualityMetric[];
}

export interface PresenceInfo {
  agentId: string;
  status: PresenceStatus;
  location?: GeographicLocation;
  currentTasks: string[];
  availableUntil?: Date;
  metadata?: any;
}

export interface PresenceMap {
  [agentId: string]: PresenceInfo;
}

// === SESSION TYPES ===

export interface ConsensusSession {
  id: string;
  proposalId: string;
  participants: string[];
  status: SessionStatus;
  votes: ConsensusVote[];
  startTime: Date;
  deadline: Date;
  result?: ConsensusResult;
}

export interface DecisionSession {
  id: string;
  decisionTopic: string;
  participants: string[];
  contributions: DecisionContribution[];
  status: SessionStatus;
  startTime: Date;
  deadline?: Date;
  finalDecision?: FinalDecision;
}

export interface ConsensusResult {
  sessionId: string;
  proposal: ConsensusProposal;
  outcome: ConsensusOutcome;
  voteSummary: VoteSummary;
  finalizedAt: Date;
  implementationPlan?: ImplementationPlan;
}

export interface FinalDecision {
  sessionId: string;
  decision: string;
  rationale: string;
  contributors: string[];
  confidence: number;
  implementationSteps: string[];
  reviewDate?: Date;
}

// === CONFIRMATION TYPES ===

export interface MessageDeliveryConfirmation {
  messageId: string;
  deliveredAt: Date;
  deliveryPath: string[];
  qosMetrics: QosMetrics;
}

export interface BroadcastConfirmation {
  messageId: string;
  totalRecipients: number;
  successfulDeliveries: number;
  failedDeliveries: DeliveryFailure[];
  deliveryTime: number;
}

export interface EventPublishConfirmation {
  eventId: string;
  publishedAt: Date;
  subscribersNotified: number;
  propagationPath: string[];
}

export interface DeliveryConfirmation {
  messageId: string;
  guarantee: DeliveryGuarantee;
  acknowledgedBy: string[];
  deliveryAttempts: number;
  finalStatus: DeliveryStatus;
}

export interface PriorityDeliveryConfirmation extends DeliveryConfirmation {
  priorityLevel: MessagePriority;
  queueBypassedCount: number;
  expeditedProcessing: boolean;
}

// === HANDLE TYPES ===

export interface SubscriptionHandle {
  id: string;
  eventTypes: string[];
  createdAt: Date;
  isActive: boolean;
  unsubscribe(): Promise<void>;
}

export type EventHandler = (event: GovernanceEvent) => Promise<void>;

// === METRICS ===

export interface CommunicationMetrics {
  totalMessages: number;
  messagesByType: Record<MessageType, number>;
  averageLatency: number;
  successRate: number;
  errorRate: number;
  throughput: number;
  activeConnections: number;
  queueDepth: number;
  lastUpdated: Date;
}

export interface QosMetrics {
  latency: number;
  deliveryTime: number;
  retryCount: number;
  routingHops: number;
}

// === ADDITIONAL SUPPORTING TYPES ===

export type ErrorCategory = 
  | 'network'
  | 'timeout'
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'processing'
  | 'resource'
  | 'unknown';

export type RiskLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
export type EvidenceType = 'quantitative' | 'qualitative' | 'observational' | 'experimental';
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'disputed';
export type ResourceType = 'cpu' | 'memory' | 'storage' | 'network' | 'time' | 'expertise';
export type ConstraintType = 'resource' | 'time' | 'quality' | 'security' | 'compliance';
export type CostType = 'fixed' | 'variable' | 'tiered' | 'subscription';
export type BillingModel = 'per_use' | 'flat_rate' | 'time_based' | 'performance_based';
export type ConditionType = 'prerequisite' | 'limitation' | 'requirement' | 'preference';
export type AvailabilityRequirement = 'best_effort' | 'high' | 'guaranteed' | 'exclusive';
export type LoadBalancingStrategy = 'round_robin' | 'least_loaded' | 'performance_based' | 'geographic';
export type PresenceStatus = 'online' | 'busy' | 'away' | 'offline' | 'do_not_disturb';
export type SessionStatus = 'pending' | 'active' | 'completed' | 'failed' | 'cancelled' | 'expired';
export type ConsensusOutcome = 'approved' | 'rejected' | 'modified' | 'deferred' | 'cancelled';
export type DeliveryStatus = 'pending' | 'delivered' | 'failed' | 'expired' | 'cancelled';

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface GeographicLocation {
  latitude: number;
  longitude: number;
  region?: string;
  datacenter?: string;
}

export interface ParameterDefinition {
  name: string;
  type: string;
  required: boolean;
  description: string;
  constraints?: any;
}

export interface QualityMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface Reference {
  id: string;
  type: 'document' | 'url' | 'citation' | 'agent' | 'decision';
  target: string;
  description?: string;
}

export interface VoteSummary {
  totalVotes: number;
  yesVotes: number;
  noVotes: number;
  abstentions: number;
  conditionalVotes: number;
  quorumMet: boolean;
  majorityAchieved: boolean;
}

export interface ImplementationPlan {
  steps: ImplementationStep[];
  timeline: Date;
  resources: ResourceRequirement[];
  risks: Risk[];
  successMetrics: string[];
}

export interface ImplementationStep {
  id: string;
  description: string;
  owner: string;
  deadline: Date;
  dependencies: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
}

export interface ResourceRequirement {
  type: ResourceType;
  amount: number;
  duration: number;
  criticality: 'essential' | 'important' | 'nice_to_have';
}

export interface Risk {
  id: string;
  description: string;
  probability: number;
  impact: number;
  mitigation: string;
  owner: string;
}

export interface DeliveryFailure {
  recipient: string;
  error: ErrorInfo;
  retryAttempts: number;
  lastAttempt: Date;
}

export interface EncryptionInfo {
  algorithm: string;
  keyId: string;
  encrypted: boolean;
}

export interface RoutingInfo {
  path: string[];
  priority: number;
  alternateRoutes?: string[][];
}

export interface TracingInfo {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  baggage?: Record<string, string>;
}
