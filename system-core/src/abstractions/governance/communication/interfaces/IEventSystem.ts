/**
 * Event-Driven Communication System Interface
 * 
 * Defines contracts for event publishing, subscription, stream processing,
 * and event-driven coordination between governance agents.
 */

import {
  GovernanceEvent,
  EventHandler,
  SubscriptionHandle,
  EventPublishConfirmation
} from './ICommunication';

export interface IEventSystem {
  // === EVENT LIFECYCLE ===
  
  /**
   * Initialize the event system
   */
  initialize(config: EventSystemConfig): Promise<void>;
  
  /**
   * Start event processing
   */
  start(): Promise<void>;
  
  /**
   * Stop event processing
   */
  stop(): Promise<void>;
  
  /**
   * Get system health
   */
  getHealth(): Promise<EventSystemHealth>;
  
  // === EVENT PUBLISHING ===
  
  /**
   * Publish single event
   */
  publishEvent(
    event: GovernanceEvent,
    options?: PublishOptions
  ): Promise<EventPublishConfirmation>;
  
  /**
   * Publish multiple events as batch
   */
  publishEvents(
    events: GovernanceEvent[],
    options?: BatchPublishOptions
  ): Promise<BatchPublishResult>;
  
  /**
   * Publish event with correlation
   */
  publishCorrelatedEvent(
    event: GovernanceEvent,
    correlationId: string,
    options?: CorrelatedPublishOptions
  ): Promise<CorrelatedPublishResult>;
  
  // === EVENT SUBSCRIPTION ===
  
  /**
   * Subscribe to events by type
   */
  subscribeToEventTypes(
    eventTypes: string[],
    handler: EventHandler,
    options?: SubscriptionOptions
  ): Promise<SubscriptionHandle>;
  
  /**
   * Subscribe to events by pattern
   */
  subscribeToEventPattern(
    pattern: EventPattern,
    handler: EventHandler,
    options?: SubscriptionOptions
  ): Promise<SubscriptionHandle>;
  
  /**
   * Subscribe to events with filter
   */
  subscribeWithFilter(
    filter: EventFilter,
    handler: EventHandler,
    options?: SubscriptionOptions
  ): Promise<SubscriptionHandle>;
  
  /**
   * Create durable subscription
   */
  createDurableSubscription(
    name: string,
    eventTypes: string[],
    handler: EventHandler,
    options?: DurableSubscriptionOptions
  ): Promise<DurableSubscriptionHandle>;
  
  /**
   * Unsubscribe from events
   */
  unsubscribe(handle: SubscriptionHandle): Promise<void>;
  
  // === EVENT STREAMING ===
  
  /**
   * Create event stream
   */
  createEventStream(
    name: string,
    config: EventStreamConfig
  ): Promise<EventStream>;
  
  /**
   * Delete event stream
   */
  deleteEventStream(name: string): Promise<void>;
  
  /**
   * Get event stream
   */
  getEventStream(name: string): Promise<EventStream>;
  
  /**
   * List all event streams
   */
  listEventStreams(): Promise<EventStreamInfo[]>;
  
  // === EVENT SOURCING ===
  
  /**
   * Store event in event store
   */
  storeEvent(
    event: GovernanceEvent,
    streamId: string
  ): Promise<EventStoreResult>;
  
  /**
   * Replay events from stream
   */
  replayEvents(
    streamId: string,
    fromPosition?: number,
    toPosition?: number
  ): Promise<EventReplayResult>;
  
  /**
   * Get event history
   */
  getEventHistory(
    criteria: EventHistoryCriteria
  ): Promise<EventHistoryResult>;
  
  // === EVENT CORRELATION ===
  
  /**
   * Correlate events by ID
   */
  correlateEvents(
    correlationId: string,
    timeWindow?: TimeWindow
  ): Promise<CorrelatedEvents>;
  
  /**
   * Create event correlation rule
   */
  addCorrelationRule(
    rule: CorrelationRule
  ): Promise<CorrelationRuleId>;
  
  /**
   * Remove correlation rule
   */
  removeCorrelationRule(
    ruleId: CorrelationRuleId
  ): Promise<void>;
  
  // === EVENT AGGREGATION ===
  
  /**
   * Create event aggregator
   */
  createAggregator(
    config: AggregatorConfig
  ): Promise<EventAggregator>;
  
  /**
   * Remove event aggregator
   */
  removeAggregator(
    aggregatorId: string
  ): Promise<void>;
  
  /**
   * Get aggregation results
   */
  getAggregationResults(
    aggregatorId: string,
    timeRange?: TimeRange
  ): Promise<AggregationResult>;
  
  // === EVENT MONITORING ===
  
  /**
   * Get event metrics
   */
  getEventMetrics(): Promise<EventMetrics>;
  
  /**
   * Get subscription metrics
   */
  getSubscriptionMetrics(
    subscriptionId: string
  ): Promise<SubscriptionMetrics>;
  
  /**
   * Get stream metrics
   */
  getStreamMetrics(
    streamName: string
  ): Promise<StreamMetrics>;
}

// === CONFIGURATION ===

export interface EventSystemConfig {
  provider: EventProvider;
  persistence: PersistenceConfig;
  clustering: EventClusterConfig;
  security: EventSecurityConfig;
  performance: EventPerformanceConfig;
  monitoring: EventMonitoringConfig;
}

export interface PersistenceConfig {
  enabled: boolean;
  storageType: StorageType;
  connectionString?: string;
  retentionPolicy: RetentionPolicy;
  compression: CompressionConfig;
  encryption: EncryptionConfig;
}

export interface EventClusterConfig {
  enabled: boolean;
  nodes: EventNode[];
  replicationFactor: number;
  consistencyLevel: ConsistencyLevel;
  partitioning: PartitioningConfig;
}

export interface EventSecurityConfig {
  authentication: boolean;
  authorization: boolean;
  encryption: boolean;
  auditLogging: boolean;
  accessControl: AccessControlConfig;
}

export interface EventPerformanceConfig {
  batchSize: number;
  bufferSize: number;
  flushInterval: number;
  maxConcurrency: number;
  backpressureStrategy: BackpressureStrategy;
}

export interface EventMonitoringConfig {
  metricsEnabled: boolean;
  tracingEnabled: boolean;
  healthChecks: HealthCheckConfig;
  alerting: AlertingConfig;
}

// === OPTIONS ===

export interface PublishOptions {
  async?: boolean;
  priority?: number;
  ttl?: number;
  headers?: Record<string, string>;
  retryPolicy?: RetryPolicy;
  deliveryGuarantee?: DeliveryGuarantee;
}

export interface BatchPublishOptions extends PublishOptions {
  batchSize?: number;
  maxWaitTime?: number;
  failFast?: boolean;
}

export interface CorrelatedPublishOptions extends PublishOptions {
  causationId?: string;
  expectedCorrelations?: string[];
}

export interface SubscriptionOptions {
  durableSubscription?: boolean;
  startPosition?: SubscriptionPosition;
  acknowledgmentMode?: AcknowledgmentMode;
  maxRetries?: number;
  deadLetterQueue?: string;
  consumerGroup?: string;
  priority?: number;
}

export interface DurableSubscriptionOptions extends SubscriptionOptions {
  checkpointInterval?: number;
  maxUnacknowledged?: number;
  resumeStrategy?: ResumeStrategy;
}

// === EVENT FILTERING ===

export interface EventPattern {
  type: PatternType;
  expression: string;
  caseSensitive?: boolean;
  multiline?: boolean;
}

export interface EventFilter {
  conditions: FilterCondition[];
  operator: LogicalOperator;
}

export interface FilterCondition {
  field: string;
  operator: ComparisonOperator;
  value: any;
  type?: FieldType;
}

// === EVENT STREAMING ===

export interface EventStreamConfig {
  partitions?: number;
  replicationFactor?: number;
  retentionTime?: number;
  retentionSize?: number;
  compression?: CompressionType;
  ordering?: OrderingGuarantee;
}

export interface EventStream {
  name: string;
  id: string;
  config: EventStreamConfig;
  status: StreamStatus;
  metrics: StreamMetrics;
  
  /**
   * Write event to stream
   */
  writeEvent(event: GovernanceEvent): Promise<WriteResult>;
  
  /**
   * Read events from stream
   */
  readEvents(options?: ReadOptions): Promise<ReadResult>;
  
  /**
   * Subscribe to stream
   */
  subscribe(
    handler: EventHandler,
    options?: StreamSubscriptionOptions
  ): Promise<StreamSubscription>;
  
  /**
   * Create checkpoint
   */
  createCheckpoint(name: string): Promise<Checkpoint>;
  
  /**
   * Restore from checkpoint
   */
  restoreFromCheckpoint(name: string): Promise<void>;
}

export interface EventStreamInfo {
  name: string;
  id: string;
  partitions: number;
  replicationFactor: number;
  eventCount: number;
  size: number;
  createdAt: Date;
  lastModified: Date;
  status: StreamStatus;
}

// === EVENT SOURCING ===

export interface EventStoreResult {
  eventId: string;
  streamId: string;
  position: number;
  timestamp: Date;
  version: number;
}

export interface EventReplayResult {
  streamId: string;
  eventsReplayed: number;
  fromPosition: number;
  toPosition: number;
  duration: number;
  errors: ReplayError[];
}

export interface EventHistoryCriteria {
  streamId?: string;
  eventTypes?: string[];
  timeRange?: TimeRange;
  agentId?: string;
  correlationId?: string;
  limit?: number;
  offset?: number;
}

export interface EventHistoryResult {
  events: GovernanceEvent[];
  totalCount: number;
  hasMore: boolean;
  nextOffset?: number;
}

// === EVENT CORRELATION ===

export interface CorrelationRule {
  id?: string;
  name: string;
  description?: string;
  enabled: boolean;
  conditions: CorrelationCondition[];
  timeWindow: TimeWindow;
  action: CorrelationAction;
}

export interface CorrelationCondition {
  eventType: string;
  field: string;
  operator: ComparisonOperator;
  value: any;
  required: boolean;
}

export interface CorrelationAction {
  type: CorrelationActionType;
  target: string;
  parameters?: Record<string, any>;
}

export interface CorrelatedEvents {
  correlationId: string;
  events: GovernanceEvent[];
  startTime: Date;
  endTime: Date;
  completeness: number;
  patterns: DetectedPattern[];
}

export interface DetectedPattern {
  type: string;
  confidence: number;
  description: string;
  events: string[];
}

// === EVENT AGGREGATION ===

export interface AggregatorConfig {
  name: string;
  description?: string;
  inputStreams: string[];
  aggregationType: AggregationType;
  timeWindow: TimeWindow;
  groupBy?: string[];
  aggregationFunction: AggregationFunction;
  outputStream?: string;
}

export interface EventAggregator {
  id: string;
  config: AggregatorConfig;
  status: AggregatorStatus;
  
  start(): Promise<void>;
  stop(): Promise<void>;
  getResults(timeRange?: TimeRange): Promise<AggregationResult>;
}

export interface AggregationResult {
  aggregatorId: string;
  timeRange: TimeRange;
  groups: AggregationGroup[];
  metadata: AggregationMetadata;
}

export interface AggregationGroup {
  key: Record<string, any>;
  value: any;
  count: number;
  firstEvent: Date;
  lastEvent: Date;
}

export interface AggregationMetadata {
  totalEvents: number;
  totalGroups: number;
  processingTime: number;
  accuracy: number;
}

// === METRICS AND MONITORING ===

export interface EventSystemHealth {
  status: HealthStatus;
  uptime: number;
  eventRate: number;
  errorRate: number;
  latency: LatencyMetrics;
  resources: ResourceUsage;
  lastUpdated: Date;
}

export interface EventMetrics {
  totalEvents: number;
  eventsPerSecond: number;
  eventsByType: Record<string, number>;
  averageLatency: number;
  errorRate: number;
  subscriptions: SubscriptionSummary[];
  streams: StreamSummary[];
  aggregators: AggregatorSummary[];
}

export interface SubscriptionMetrics {
  subscriptionId: string;
  eventsProcessed: number;
  eventsPerSecond: number;
  averageProcessingTime: number;
  errorRate: number;
  backlogSize: number;
  lastActivity: Date;
}

export interface StreamMetrics {
  streamName: string;
  eventCount: number;
  sizeBytes: number;
  writeRate: number;
  readRate: number;
  partitionMetrics: PartitionMetrics[];
}

export interface PartitionMetrics {
  partitionId: number;
  eventCount: number;
  sizeBytes: number;
  highWatermark: number;
  lowWatermark: number;
  lag: number;
}

// === HANDLES AND RESULTS ===

export interface DurableSubscriptionHandle extends SubscriptionHandle {
  name: string;
  checkpointPosition: number;
  resume(): Promise<void>;
  pause(): Promise<void>;
  getCheckpoint(): Promise<Checkpoint>;
}

export interface BatchPublishResult {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  errors: PublishError[];
  batchId: string;
  processingTime: number;
}

export interface CorrelatedPublishResult extends EventPublishConfirmation {
  correlationId: string;
  causationId?: string;
  relatedEvents: string[];
}

export interface StreamSubscription {
  id: string;
  streamName: string;
  position: number;
  
  unsubscribe(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  getPosition(): Promise<number>;
  seek(position: number): Promise<void>;
}

export interface WriteResult {
  eventId: string;
  position: number;
  timestamp: Date;
  partition?: number;
}

export interface ReadResult {
  events: GovernanceEvent[];
  nextPosition: number;
  hasMore: boolean;
  readTime: number;
}

export interface Checkpoint {
  name: string;
  position: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// === TYPES AND ENUMS ===

export type EventProvider = 
  | 'kafka'
  | 'pulsar'
  | 'eventhub'
  | 'kinesis'
  | 'redis_streams'
  | 'nats_jetstream'
  | 'in_memory';

export type StorageType = 
  | 'file'
  | 'database'
  | 'object_store'
  | 'distributed';

export type ConsistencyLevel = 
  | 'eventual'
  | 'strong'
  | 'bounded_staleness';

export type BackpressureStrategy = 
  | 'block'
  | 'drop_oldest'
  | 'drop_newest'
  | 'error';

export type SubscriptionPosition = 
  | 'earliest'
  | 'latest'
  | 'timestamp'
  | 'position';

export type AcknowledgmentMode = 
  | 'auto'
  | 'manual'
  | 'at_least_once'
  | 'at_most_once'
  | 'exactly_once';

export type ResumeStrategy = 
  | 'last_checkpoint'
  | 'earliest'
  | 'latest'
  | 'timestamp';

export type PatternType = 
  | 'regex'
  | 'glob'
  | 'exact'
  | 'prefix'
  | 'suffix';

export type LogicalOperator = 
  | 'and'
  | 'or'
  | 'not';

export type ComparisonOperator = 
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_equal'
  | 'less_equal'
  | 'contains'
  | 'starts_with'
  | 'ends_with'
  | 'in'
  | 'not_in'
  | 'regex';

export type FieldType = 
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'object'
  | 'array';

export type CompressionType = 
  | 'none'
  | 'gzip'
  | 'snappy'
  | 'lz4'
  | 'zstd';

export type OrderingGuarantee = 
  | 'none'
  | 'partition'
  | 'global'
  | 'causal';

export type StreamStatus = 
  | 'active'
  | 'paused'
  | 'stopped'
  | 'error'
  | 'recovering';

export type CorrelationActionType = 
  | 'create_event'
  | 'trigger_workflow'
  | 'send_notification'
  | 'custom';

export type AggregationType = 
  | 'tumbling_window'
  | 'sliding_window'
  | 'session_window'
  | 'global';

export type AggregationFunction = 
  | 'count'
  | 'sum'
  | 'average'
  | 'min'
  | 'max'
  | 'distinct_count'
  | 'percentile'
  | 'custom';

export type AggregatorStatus = 
  | 'running'
  | 'stopped'
  | 'error'
  | 'paused';

export type HealthStatus = 
  | 'healthy'
  | 'degraded'
  | 'unhealthy';

export type CorrelationRuleId = string;

// === SUPPORTING INTERFACES ===

export interface EventNode {
  id: string;
  host: string;
  port: number;
  region?: string;
  weight: number;
}

export interface RetentionPolicy {
  timeBasedRetention?: number;
  sizeBasedRetention?: number;
  messageBasedRetention?: number;
  deletePolicy: DeletePolicy;
}

export interface DeletePolicy {
  type: 'delete' | 'compact' | 'archive';
  archiveLocation?: string;
}

export interface CompressionConfig {
  algorithm: CompressionType;
  level?: number;
  threshold?: number;
}

export interface EncryptionConfig {
  enabled: boolean;
  algorithm?: string;
  keyRotation?: boolean;
}

export interface PartitioningConfig {
  strategy: PartitioningStrategy;
  partitions: number;
  keyExtractor?: string;
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

export interface HealthCheckConfig {
  interval: number;
  timeout: number;
  failureThreshold: number;
}

export interface AlertingConfig {
  enabled: boolean;
  rules: AlertRule[];
  channels: AlertChannel[];
}

export interface AlertRule {
  name: string;
  condition: string;
  threshold: number;
  severity: AlertSeverity;
}

export interface AlertChannel {
  type: 'email' | 'webhook' | 'slack';
  config: Record<string, any>;
}

export interface TimeWindow {
  duration: number;
  unit: TimeUnit;
  sliding?: boolean;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface ReadOptions {
  fromPosition?: number;
  maxEvents?: number;
  timeout?: number;
  includeMetadata?: boolean;
}

export interface StreamSubscriptionOptions {
  startPosition?: SubscriptionPosition;
  consumerGroup?: string;
  acknowledgmentMode?: AcknowledgmentMode;
}

export interface ReplayError {
  position: number;
  event: GovernanceEvent;
  error: string;
  timestamp: Date;
}

export interface LatencyMetrics {
  p50: number;
  p95: number;
  p99: number;
  average: number;
}

export interface ResourceUsage {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

export interface SubscriptionSummary {
  id: string;
  eventTypes: string[];
  status: string;
  backlogSize: number;
}

export interface StreamSummary {
  name: string;
  eventCount: number;
  sizeBytes: number;
  status: StreamStatus;
}

export interface AggregatorSummary {
  id: string;
  name: string;
  status: AggregatorStatus;
  eventsProcessed: number;
}

export interface PublishError {
  event: GovernanceEvent;
  error: string;
  retryable: boolean;
}

export type DeliveryGuarantee = 
  | 'at_most_once'
  | 'at_least_once'
  | 'exactly_once';

export type RetryPolicy = {
  maxAttempts: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  baseDelayMs: number;
  maxDelayMs: number;
};

export type PartitioningStrategy = 
  | 'hash'
  | 'range'
  | 'round_robin'
  | 'custom';

export type AlertSeverity = 
  | 'info'
  | 'warning'
  | 'error'
  | 'critical';

export type TimeUnit = 
  | 'milliseconds'
  | 'seconds'
  | 'minutes'
  | 'hours'
  | 'days';
