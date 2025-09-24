/**
 * Agent Discovery and Registration System Interface
 * 
 * Defines contracts for dynamic agent discovery, capability matching,
 * service registration, health monitoring, and load balancing.
 */

import {
  AgentInfo,
  AgentCapability,
  PresenceInfo,
  PresenceMap,
  DiscoveryCriteria
} from './ICommunication';

export interface IAgentDiscovery {
  // === DISCOVERY LIFECYCLE ===
  
  /**
   * Initialize discovery service
   */
  initialize(config: DiscoveryConfig): Promise<void>;
  
  /**
   * Start discovery service
   */
  start(): Promise<void>;
  
  /**
   * Stop discovery service
   */
  stop(): Promise<void>;
  
  /**
   * Get discovery service health
   */
  getHealth(): Promise<DiscoveryHealth>;
  
  // === AGENT REGISTRATION ===
  
  /**
   * Register agent with discovery service
   */
  registerAgent(
    agentInfo: AgentRegistrationRequest
  ): Promise<AgentRegistrationResponse>;
  
  /**
   * Update agent registration
   */
  updateRegistration(
    agentId: string,
    updates: AgentRegistrationUpdate
  ): Promise<void>;
  
  /**
   * Deregister agent from discovery service
   */
  deregisterAgent(
    agentId: string,
    reason?: string
  ): Promise<void>;
  
  /**
   * Renew agent registration
   */
  renewRegistration(
    agentId: string,
    ttl?: number
  ): Promise<RegistrationRenewalResult>;
  
  // === AGENT DISCOVERY ===
  
  /**
   * Discover agents by criteria
   */
  discoverAgents(
    criteria: DiscoveryCriteria
  ): Promise<AgentDiscoveryResult>;
  
  /**
   * Find agents by capability
   */
  findAgentsByCapability(
    capabilities: string[],
    options?: CapabilitySearchOptions
  ): Promise<CapabilityMatchResult>;
  
  /**
   * Find agents by type
   */
  findAgentsByType(
    agentTypes: string[],
    options?: TypeSearchOptions
  ): Promise<TypeMatchResult>;
  
  /**
   * Find nearest agents by location
   */
  findNearestAgents(
    location: GeographicLocation,
    radius: number,
    options?: LocationSearchOptions
  ): Promise<LocationMatchResult>;
  
  /**
   * Get agent by ID
   */
  getAgent(agentId: string): Promise<AgentInfo | null>;
  
  /**
   * Get multiple agents by IDs
   */
  getAgents(agentIds: string[]): Promise<AgentInfo[]>;
  
  // === CAPABILITY MANAGEMENT ===
  
  /**
   * Register agent capability
   */
  registerCapability(
    agentId: string,
    capability: CapabilityRegistration
  ): Promise<CapabilityRegistrationResult>;
  
  /**
   * Update agent capability
   */
  updateCapability(
    agentId: string,
    capabilityId: string,
    updates: CapabilityUpdate
  ): Promise<void>;
  
  /**
   * Deregister agent capability
   */
  deregisterCapability(
    agentId: string,
    capabilityId: string
  ): Promise<void>;
  
  /**
   * Get agent capabilities
   */
  getAgentCapabilities(
    agentId: string
  ): Promise<AgentCapability[]>;
  
  /**
   * Search capabilities across all agents
   */
  searchCapabilities(
    query: CapabilityQuery
  ): Promise<CapabilitySearchResult>;
  
  // === PRESENCE MANAGEMENT ===
  
  /**
   * Update agent presence
   */
  updatePresence(
    agentId: string,
    presence: PresenceUpdate
  ): Promise<void>;
  
  /**
   * Get agent presence
   */
  getPresence(agentId: string): Promise<PresenceInfo | null>;
  
  /**
   * Get presence for multiple agents
   */
  getMultiplePresence(
    agentIds: string[]
  ): Promise<PresenceMap>;
  
  /**
   * Subscribe to presence changes
   */
  subscribeToPresence(
    agentIds: string[],
    callback: PresenceChangeCallback
  ): Promise<PresenceSubscription>;
  
  /**
   * Unsubscribe from presence changes
   */
  unsubscribeFromPresence(
    subscription: PresenceSubscription
  ): Promise<void>;
  
  // === HEALTH MONITORING ===
  
  /**
   * Perform health check on agent
   */
  performHealthCheck(
    agentId: string
  ): Promise<AgentHealthResult>;
  
  /**
   * Perform health checks on multiple agents
   */
  performBulkHealthCheck(
    agentIds: string[]
  ): Promise<BulkHealthResult>;
  
  /**
   * Get agent health history
   */
  getHealthHistory(
    agentId: string,
    timeRange?: TimeRange
  ): Promise<HealthHistoryResult>;
  
  /**
   * Subscribe to health change notifications
   */
  subscribeToHealthChanges(
    agentIds: string[],
    callback: HealthChangeCallback
  ): Promise<HealthSubscription>;
  
  // === LOAD BALANCING ===
  
  /**
   * Get load balanced agent selection
   */
  getLoadBalancedSelection(
    criteria: DiscoveryCriteria,
    strategy: LoadBalancingStrategy
  ): Promise<LoadBalancedResult>;
  
  /**
   * Update agent load metrics
   */
  updateLoadMetrics(
    agentId: string,
    metrics: LoadMetrics
  ): Promise<void>;
  
  /**
   * Get current load distribution
   */
  getLoadDistribution(
    agentTypes?: string[]
  ): Promise<LoadDistribution>;
  
  // === SERVICE MESH INTEGRATION ===
  
  /**
   * Register service endpoint
   */
  registerServiceEndpoint(
    agentId: string,
    endpoint: ServiceEndpoint
  ): Promise<EndpointRegistrationResult>;
  
  /**
   * Update service endpoint
   */
  updateServiceEndpoint(
    agentId: string,
    endpointId: string,
    updates: EndpointUpdate
  ): Promise<void>;
  
  /**
   * Deregister service endpoint
   */
  deregisterServiceEndpoint(
    agentId: string,
    endpointId: string
  ): Promise<void>;
  
  /**
   * Discover service endpoints
   */
  discoverServiceEndpoints(
    serviceName: string,
    options?: EndpointDiscoveryOptions
  ): Promise<EndpointDiscoveryResult>;
  
  // === MONITORING AND ANALYTICS ===
  
  /**
   * Get discovery metrics
   */
  getDiscoveryMetrics(): Promise<DiscoveryMetrics>;
  
  /**
   * Get registration statistics
   */
  getRegistrationStatistics(
    timeRange?: TimeRange
  ): Promise<RegistrationStatistics>;
  
  /**
   * Analyze discovery patterns
   */
  analyzeDiscoveryPatterns(
    criteria: PatternAnalysisCriteria
  ): Promise<DiscoveryPatternAnalysis>;
  
  /**
   * Generate discovery report
   */
  generateDiscoveryReport(
    options: ReportOptions
  ): Promise<DiscoveryReport>;
}

// === CONFIGURATION ===

export interface DiscoveryConfig {
  provider: DiscoveryProvider;
  clustering: DiscoveryClusterConfig;
  caching: CachingConfig;
  healthCheck: HealthCheckConfig;
  loadBalancing: LoadBalancingConfig;
  security: DiscoverySecurityConfig;
  persistence: DiscoveryPersistenceConfig;
  networking: NetworkingConfig;
}

export interface DiscoveryClusterConfig {
  enabled: boolean;
  nodes: DiscoveryNode[];
  replicationFactor: number;
  consistencyLevel: ConsistencyLevel;
  gossipProtocol: GossipConfig;
}

export interface CachingConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
  strategy: CachingStrategy;
  invalidation: InvalidationConfig;
}

export interface HealthCheckConfig {
  enabled: boolean;
  interval: number;
  timeout: number;
  retries: number;
  failureThreshold: number;
  recoveryThreshold: number;
  customChecks: CustomHealthCheck[];
}

export interface LoadBalancingConfig {
  defaultStrategy: LoadBalancingStrategy;
  strategies: StrategyConfig[];
  affinityRules: AffinityRule[];
  weights: WeightConfig[];
}

export interface DiscoverySecurityConfig {
  authentication: boolean;
  authorization: boolean;
  encryption: boolean;
  rateLimit: RateLimitConfig;
  accessControl: AccessControlConfig;
}

export interface DiscoveryPersistenceConfig {
  enabled: boolean;
  storageType: StorageType;
  retentionPeriod: number;
  backup: BackupConfig;
  consistency: ConsistencyConfig;
}

export interface NetworkingConfig {
  protocols: NetworkProtocol[];
  ports: PortConfiguration;
  timeouts: TimeoutConfig;
  retry: RetryConfig;
  compression: CompressionConfig;
}

// === REGISTRATION ===

export interface AgentRegistrationRequest {
  agentInfo: AgentInfo;
  capabilities: CapabilityRegistration[];
  endpoints: ServiceEndpoint[];
  presence: PresenceInfo;
  metadata: RegistrationMetadata;
  ttl?: number;
}

export interface AgentRegistrationResponse {
  agentId: string;
  registrationId: string;
  status: RegistrationStatus;
  expiresAt: Date;
  assignedEndpoints: AssignedEndpoint[];
  discoveryTags: string[];
}

export interface AgentRegistrationUpdate {
  agentInfo?: Partial<AgentInfo>;
  capabilities?: CapabilityUpdate[];
  endpoints?: EndpointUpdate[];
  presence?: PresenceUpdate;
  metadata?: Partial<RegistrationMetadata>;
}

export interface RegistrationRenewalResult {
  agentId: string;
  renewed: boolean;
  newExpiryTime: Date;
  warningsIssued: string[];
}

export interface RegistrationMetadata {
  environment: Environment;
  region: string;
  zone?: string;
  tags: Record<string, string>;
  constraints: RegistrationConstraint[];
  preferences: RegistrationPreference[];
}

// === DISCOVERY RESULTS ===

export interface AgentDiscoveryResult {
  agents: DiscoveredAgent[];
  totalFound: number;
  searchTime: number;
  cacheHit: boolean;
  recommendations: DiscoveryRecommendation[];
}

export interface DiscoveredAgent {
  agentInfo: AgentInfo;
  matchScore: number;
  matchReasons: MatchReason[];
  distance?: number;
  loadLevel: LoadLevel;
  healthStatus: HealthStatus;
  lastSeen: Date;
}

export interface CapabilityMatchResult {
  matches: CapabilityMatch[];
  partialMatches: PartialCapabilityMatch[];
  totalCapabilities: number;
  searchTime: number;
}

export interface CapabilityMatch {
  agentId: string;
  capability: AgentCapability;
  matchScore: number;
  availability: AvailabilityInfo;
}

export interface PartialCapabilityMatch {
  agentId: string;
  matchedCapabilities: string[];
  missingCapabilities: string[];
  matchPercentage: number;
}

export interface TypeMatchResult {
  matches: TypeMatch[];
  totalAgents: number;
  byType: Record<string, number>;
  searchTime: number;
}

export interface TypeMatch {
  agentInfo: AgentInfo;
  exactMatch: boolean;
  compatibility: CompatibilityScore;
}

export interface LocationMatchResult {
  matches: LocationMatch[];
  searchRadius: number;
  searchCenter: GeographicLocation;
  totalInRadius: number;
}

export interface LocationMatch {
  agentInfo: AgentInfo;
  distance: number;
  bearing: number;
  travelTime?: number;
  networkLatency?: number;
}

// === CAPABILITY MANAGEMENT ===

export interface CapabilityRegistration {
  capability: AgentCapability;
  availability: CapabilityAvailability;
  pricing?: CapabilityPricing;
  sla: ServiceLevelAgreement;
}

export interface CapabilityRegistrationResult {
  capabilityId: string;
  registered: boolean;
  version: string;
  discoveryTags: string[];
}

export interface CapabilityUpdate {
  capability?: Partial<AgentCapability>;
  availability?: Partial<CapabilityAvailability>;
  pricing?: Partial<CapabilityPricing>;
  sla?: Partial<ServiceLevelAgreement>;
}

export interface CapabilityQuery {
  name?: string;
  category?: string;
  tags?: string[];
  minVersion?: string;
  performance?: PerformanceRequirements;
  availability?: AvailabilityRequirements;
}

export interface CapabilitySearchResult {
  capabilities: CapabilitySearchMatch[];
  totalFound: number;
  categories: CategorySummary[];
  searchTime: number;
}

export interface CapabilitySearchMatch {
  agentId: string;
  capability: AgentCapability;
  matchScore: number;
  availability: AvailabilityInfo;
  pricing?: PricingInfo;
}

// === PRESENCE MANAGEMENT ===

export interface PresenceUpdate {
  status?: PresenceStatus;
  location?: GeographicLocation;
  currentTasks?: string[];
  availableUntil?: Date;
  metadata?: Record<string, any>;
}

export interface PresenceSubscription {
  id: string;
  agentIds: string[];
  callback: PresenceChangeCallback;
  
  unsubscribe(): Promise<void>;
}

export type PresenceChangeCallback = (
  agentId: string,
  oldPresence: PresenceInfo | null,
  newPresence: PresenceInfo
) => Promise<void>;

// === HEALTH MONITORING ===

export interface AgentHealthResult {
  agentId: string;
  healthy: boolean;
  healthScore: number;
  checks: HealthCheckResult[];
  lastUpdated: Date;
  responseTime: number;
}

export interface HealthCheckResult {
  checkName: string;
  status: CheckStatus;
  value?: number;
  threshold?: number;
  message?: string;
  timestamp: Date;
}

export interface BulkHealthResult {
  results: AgentHealthResult[];
  summary: HealthSummary;
  duration: number;
}

export interface HealthHistoryResult {
  agentId: string;
  timeRange: TimeRange;
  healthPoints: HealthDataPoint[];
  trends: HealthTrend[];
  incidents: HealthIncident[];
}

export interface HealthDataPoint {
  timestamp: Date;
  healthScore: number;
  checks: HealthCheckSummary[];
}

export interface HealthSubscription {
  id: string;
  agentIds: string[];
  callback: HealthChangeCallback;
  
  unsubscribe(): Promise<void>;
}

export type HealthChangeCallback = (
  agentId: string,
  oldHealth: AgentHealthResult | null,
  newHealth: AgentHealthResult
) => Promise<void>;

// === LOAD BALANCING ===

export interface LoadBalancedResult {
  selectedAgents: LoadBalancedAgent[];
  strategy: LoadBalancingStrategy;
  distribution: LoadDistribution;
  recommendations: LoadBalancingRecommendation[];
}

export interface LoadBalancedAgent {
  agentInfo: AgentInfo;
  currentLoad: number;
  capacity: number;
  utilization: number;
  estimatedResponseTime: number;
}

export interface LoadMetrics {
  agentId: string;
  currentLoad: number;
  capacity: number;
  requestsPerMinute: number;
  averageResponseTime: number;
  errorRate: number;
  timestamp: Date;
}

export interface LoadDistribution {
  totalAgents: number;
  averageLoad: number;
  loadByAgent: AgentLoad[];
  loadByType: TypeLoad[];
  imbalanceScore: number;
}

export interface AgentLoad {
  agentId: string;
  currentLoad: number;
  capacity: number;
  utilization: number;
  trend: LoadTrend;
}

export interface TypeLoad {
  agentType: string;
  totalAgents: number;
  averageLoad: number;
  capacity: number;
  utilization: number;
}

// === SERVICE MESH ===

export interface ServiceEndpoint {
  id?: string;
  serviceName: string;
  protocol: NetworkProtocol;
  host: string;
  port: number;
  path?: string;
  metadata: EndpointMetadata;
  healthCheck?: EndpointHealthCheck;
}

export interface EndpointRegistrationResult {
  endpointId: string;
  registered: boolean;
  assignedPort?: number;
  discoveryUrl: string;
}

export interface EndpointUpdate {
  serviceName?: string;
  protocol?: NetworkProtocol;
  host?: string;
  port?: number;
  path?: string;
  metadata?: Partial<EndpointMetadata>;
  healthCheck?: Partial<EndpointHealthCheck>;
}

export interface EndpointDiscoveryResult {
  endpoints: DiscoveredEndpoint[];
  totalFound: number;
  loadBalanced: boolean;
  recommendations: EndpointRecommendation[];
}

export interface DiscoveredEndpoint {
  endpoint: ServiceEndpoint;
  agentId: string;
  healthStatus: HealthStatus;
  load: number;
  responseTime: number;
  reliability: number;
}

// === METRICS AND ANALYTICS ===

export interface DiscoveryHealth {
  status: HealthStatus;
  uptime: number;
  registeredAgents: number;
  activeSessions: number;
  queryRate: number;
  averageResponseTime: number;
  errorRate: number;
  cacheHitRate: number;
  lastUpdated: Date;
}

export interface DiscoveryMetrics {
  totalQueries: number;
  queriesPerSecond: number;
  averageQueryTime: number;
  cacheHitRate: number;
  registrationStats: RegistrationStats;
  popularCapabilities: PopularCapability[];
  usagePatterns: UsagePattern[];
  performanceMetrics: PerformanceMetrics;
}

export interface RegistrationStatistics {
  totalRegistrations: number;
  activeRegistrations: number;
  registrationsPerHour: number;
  deregistrationsPerHour: number;
  averageSessionDuration: number;
  registrationsByType: Record<string, number>;
  registrationsByRegion: Record<string, number>;
}

export interface DiscoveryPatternAnalysis {
  patterns: DiscoveryPattern[];
  trends: DiscoveryTrend[];
  predictions: DiscoveryPrediction[];
  recommendations: PatternRecommendation[];
}

export interface DiscoveryReport {
  period: TimeRange;
  summary: ReportSummary;
  registrations: RegistrationAnalysis;
  discoveries: DiscoveryAnalysis;
  performance: PerformanceAnalysis;
  recommendations: ReportRecommendation[];
  metadata: ReportMetadata;
}

// === TYPES AND ENUMS ===

export type DiscoveryProvider = 
  | 'consul'
  | 'etcd'
  | 'zookeeper'
  | 'kubernetes'
  | 'eureka'
  | 'nacos'
  | 'custom';

export type ConsistencyLevel = 
  | 'eventual'
  | 'strong'
  | 'bounded_staleness';

export type CachingStrategy = 
  | 'lru'
  | 'lfu'
  | 'ttl'
  | 'adaptive';

export type LoadBalancingStrategy = 
  | 'round_robin'
  | 'least_connections'
  | 'weighted_random'
  | 'performance_based'
  | 'geographic'
  | 'custom';

export type RegistrationStatus = 
  | 'pending'
  | 'active'
  | 'expired'
  | 'failed'
  | 'deregistered';

export type Environment = 
  | 'development'
  | 'testing'
  | 'staging'
  | 'production';

export type LoadLevel = 
  | 'low'
  | 'medium'
  | 'high'
  | 'overloaded';

export type HealthStatus = 
  | 'healthy'
  | 'degraded'
  | 'unhealthy'
  | 'unknown';

export type CheckStatus = 
  | 'pass'
  | 'warn'
  | 'fail'
  | 'unknown';

export type PresenceStatus = 
  | 'online'
  | 'busy'
  | 'away'
  | 'offline'
  | 'do_not_disturb';

export type NetworkProtocol = 
  | 'http'
  | 'https'
  | 'grpc'
  | 'tcp'
  | 'udp'
  | 'websocket';

export type LoadTrend = 
  | 'increasing'
  | 'decreasing'
  | 'stable'
  | 'volatile';

// === SUPPORTING INTERFACES ===

export interface DiscoveryNode {
  id: string;
  host: string;
  port: number;
  region: string;
  weight: number;
}

export interface GossipConfig {
  enabled: boolean;
  interval: number;
  fanout: number;
  timeout: number;
}

export interface InvalidationConfig {
  strategy: 'ttl' | 'event' | 'manual';
  events: string[];
  batchSize?: number;
}

export interface CustomHealthCheck {
  name: string;
  type: 'http' | 'tcp' | 'script' | 'custom';
  config: Record<string, any>;
  weight: number;
}

export interface StrategyConfig {
  strategy: LoadBalancingStrategy;
  weight: number;
  conditions: string[];
}

export interface AffinityRule {
  type: 'prefer' | 'require' | 'avoid';
  attribute: string;
  value: string;
  weight: number;
}

export interface WeightConfig {
  attribute: string;
  weights: Record<string, number>;
}

export interface RateLimitConfig {
  enabled: boolean;
  requestsPerMinute: number;
  burstSize: number;
  strategy: 'sliding_window' | 'fixed_window';
}

export interface AccessControlConfig {
  defaultPolicy: 'allow' | 'deny';
  rules: AccessRule[];
}

export interface AccessRule {
  principal: string;
  action: string;
  resource: string;
  effect: 'allow' | 'deny';
}

export interface StorageType {
  type: 'memory' | 'database' | 'distributed';
  config: Record<string, any>;
}

export interface BackupConfig {
  enabled: boolean;
  frequency: number;
  retention: number;
  location: string;
}

export interface ConsistencyConfig {
  level: ConsistencyLevel;
  timeout: number;
  retries: number;
}

export interface PortConfiguration {
  discovery: number;
  health: number;
  admin: number;
  metrics: number;
}

export interface TimeoutConfig {
  connection: number;
  request: number;
  idle: number;
}

export interface RetryConfig {
  maxAttempts: number;
  backoffStrategy: 'linear' | 'exponential';
  baseDelay: number;
  maxDelay: number;
}

export interface CompressionConfig {
  enabled: boolean;
  algorithm: 'gzip' | 'deflate' | 'br';
  threshold: number;
}

export interface AssignedEndpoint {
  endpointId: string;
  assignedUrl: string;
  loadBalanced: boolean;
  healthChecked: boolean;
}

export interface RegistrationConstraint {
  type: string;
  value: any;
  enforcement: 'strict' | 'prefer';
}

export interface RegistrationPreference {
  type: string;
  value: any;
  weight: number;
}

export interface MatchReason {
  category: string;
  description: string;
  confidence: number;
}

export interface DiscoveryRecommendation {
  type: 'performance' | 'cost' | 'reliability';
  agentId: string;
  reason: string;
  confidence: number;
}

export interface AvailabilityInfo {
  available: boolean;
  nextAvailable?: Date;
  capacity: number;
  currentUtilization: number;
}

export interface CompatibilityScore {
  score: number;
  factors: CompatibilityFactor[];
}

export interface CompatibilityFactor {
  factor: string;
  weight: number;
  value: number;
}

export interface GeographicLocation {
  latitude: number;
  longitude: number;
  region?: string;
  zone?: string;
  datacenter?: string;
}

export interface CapabilityAvailability {
  schedule: AvailabilitySchedule[];
  capacity: number;
  reservations: Reservation[];
}

export interface AvailabilitySchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
}

export interface Reservation {
  id: string;
  start: Date;
  end: Date;
  capacity: number;
  priority: number;
}

export interface CapabilityPricing {
  model: 'fixed' | 'variable' | 'tiered';
  basePrice: number;
  currency: string;
  tiers?: PricingTier[];
}

export interface PricingTier {
  from: number;
  to: number;
  price: number;
}

export interface ServiceLevelAgreement {
  availability: number;
  responseTime: number;
  throughput: number;
  errorRate: number;
  support: SupportLevel;
}

export interface SupportLevel {
  level: 'basic' | 'standard' | 'premium';
  hours: string;
  responseTime: number;
  channels: string[];
}

export interface PerformanceRequirements {
  minResponseTime?: number;
  maxResponseTime?: number;
  minThroughput?: number;
  maxErrorRate?: number;
}

export interface AvailabilityRequirements {
  minUptime?: number;
  maxDowntime?: number;
  maintenanceWindows?: MaintenanceWindow[];
}

export interface MaintenanceWindow {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
}

export interface CategorySummary {
  category: string;
  count: number;
  averageScore: number;
  topCapabilities: string[];
}

export interface PricingInfo {
  basePrice: number;
  currency: string;
  estimatedCost: number;
  model: string;
}

export interface HealthSummary {
  totalChecked: number;
  healthy: number;
  degraded: number;
  unhealthy: number;
  averageScore: number;
}

export interface HealthTrend {
  metric: string;
  direction: 'improving' | 'declining' | 'stable';
  rate: number;
  timeframe: string;
}

export interface HealthIncident {
  id: string;
  start: Date;
  end?: Date;
  severity: string;
  description: string;
  resolved: boolean;
}

export interface HealthCheckSummary {
  checkName: string;
  status: CheckStatus;
  value: number;
}

export interface LoadBalancingRecommendation {
  type: 'rebalance' | 'scale_up' | 'scale_down';
  reason: string;
  expectedBenefit: string;
  implementation: string[];
}

export interface EndpointMetadata {
  version: string;
  tags: Record<string, string>;
  capabilities: string[];
  dependencies: string[];
}

export interface EndpointHealthCheck {
  enabled: boolean;
  path: string;
  interval: number;
  timeout: number;
  healthyThreshold: number;
  unhealthyThreshold: number;
}

export interface EndpointRecommendation {
  endpointId: string;
  reason: string;
  priority: number;
  alternatives: string[];
}

export interface RegistrationStats {
  total: number;
  active: number;
  byType: Record<string, number>;
  byRegion: Record<string, number>;
  averageDuration: number;
}

export interface PopularCapability {
  capability: string;
  requestCount: number;
  uniqueRequesters: number;
  averageRating: number;
}

export interface UsagePattern {
  pattern: string;
  frequency: number;
  peakHours: number[];
  commonCapabilities: string[];
}

export interface PerformanceMetrics {
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  throughput: number;
  errorRate: number;
}

export interface DiscoveryPattern {
  pattern: string;
  frequency: number;
  triggers: string[];
  outcomes: string[];
}

export interface DiscoveryTrend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  rate: number;
  period: string;
}

export interface DiscoveryPrediction {
  scenario: string;
  probability: number;
  timeframe: string;
  factors: string[];
}

export interface PatternRecommendation {
  pattern: string;
  recommendation: string;
  impact: string;
  effort: string;
}

export interface ReportSummary {
  totalQueries: number;
  totalRegistrations: number;
  averageResponseTime: number;
  uptime: number;
  topCapabilities: string[];
}

export interface RegistrationAnalysis {
  trends: RegistrationTrend[];
  patterns: RegistrationPattern[];
  failures: RegistrationFailure[];
}

export interface RegistrationTrend {
  period: string;
  registrations: number;
  deregistrations: number;
  netChange: number;
}

export interface RegistrationPattern {
  pattern: string;
  occurrences: number;
  context: string[];
}

export interface RegistrationFailure {
  reason: string;
  count: number;
  impact: string;
}

export interface DiscoveryAnalysis {
  queryVolume: QueryVolume[];
  popularSearches: PopularSearch[];
  responseTimeDistribution: ResponseTimeDistribution;
}

export interface QueryVolume {
  hour: number;
  queries: number;
  uniqueClients: number;
}

export interface PopularSearch {
  criteria: string;
  frequency: number;
  avgResponseTime: number;
}

export interface ResponseTimeDistribution {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

export interface PerformanceAnalysis {
  latencyTrends: LatencyTrend[];
  throughputTrends: ThroughputTrend[];
  errorAnalysis: ErrorAnalysis;
}

export interface LatencyTrend {
  period: string;
  averageLatency: number;
  p95Latency: number;
}

export interface ThroughputTrend {
  period: string;
  requestsPerSecond: number;
  peakThroughput: number;
}

export interface ErrorAnalysis {
  totalErrors: number;
  errorRate: number;
  errorsByType: Record<string, number>;
  topErrors: ErrorDetail[];
}

export interface ErrorDetail {
  error: string;
  count: number;
  impact: string;
  trend: string;
}

export interface ReportRecommendation {
  category: string;
  recommendation: string;
  priority: 'low' | 'medium' | 'high';
  expectedBenefit: string;
}

export interface ReportMetadata {
  generatedAt: Date;
  generatedBy: string;
  version: string;
  dataSource: string;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface CapabilitySearchOptions {
  exactMatch?: boolean;
  includePartial?: boolean;
  minScore?: number;
  sortBy?: 'score' | 'availability' | 'price';
  limit?: number;
}

export interface TypeSearchOptions {
  exactMatch?: boolean;
  includeCompatible?: boolean;
  sortBy?: 'score' | 'load' | 'health';
  limit?: number;
}

export interface LocationSearchOptions {
  sortBy?: 'distance' | 'latency' | 'load';
  includeOffline?: boolean;
  limit?: number;
}

export interface EndpointDiscoveryOptions {
  protocol?: NetworkProtocol;
  healthyOnly?: boolean;
  loadBalanced?: boolean;
  sortBy?: 'health' | 'load' | 'response_time';
  limit?: number;
}

export interface PatternAnalysisCriteria {
  timeRange?: TimeRange;
  agentTypes?: string[];
  capabilities?: string[];
  regions?: string[];
}

export interface ReportOptions {
  timeRange: TimeRange;
  includeDetails?: boolean;
  includePredictions?: boolean;
  format?: 'json' | 'pdf' | 'html';
}
