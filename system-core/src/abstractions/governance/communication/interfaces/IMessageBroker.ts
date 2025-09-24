/**
 * Message Broker Interface for Agent-to-Agent Communication
 * 
 * Defines the contract for message brokering, queuing, routing,
 * and delivery management in the governance communication system.
 */

import {
  AgentMessage,
  MessagePriority,
  DeliveryGuarantee,
  MessageType
} from './ICommunication';

export interface IMessageBroker {
  // === BROKER LIFECYCLE ===
  
  /**
   * Initialize the message broker
   */
  initialize(config: MessageBrokerConfig): Promise<void>;
  
  /**
   * Start the message broker
   */
  start(): Promise<void>;
  
  /**
   * Stop the message broker
   */
  stop(): Promise<void>;
  
  /**
   * Get broker health status
   */
  getHealth(): Promise<BrokerHealth>;
  
  // === MESSAGE OPERATIONS ===
  
  /**
   * Publish message to topic/queue
   */
  publish(
    topic: string,
    message: AgentMessage,
    options?: PublishOptions
  ): Promise<PublishResult>;
  
  /**
   * Subscribe to topic/queue
   */
  subscribe(
    topic: string,
    handler: MessageHandler,
    options?: SubscribeOptions
  ): Promise<SubscriptionId>;
  
  /**
   * Unsubscribe from topic/queue
   */
  unsubscribe(subscriptionId: SubscriptionId): Promise<void>;
  
  /**
   * Send direct message to specific agent
   */
  sendDirect(
    targetAgent: string,
    message: AgentMessage,
    options?: DirectMessageOptions
  ): Promise<DirectMessageResult>;
  
  // === QUEUE MANAGEMENT ===
  
  /**
   * Create message queue
   */
  createQueue(
    queueName: string,
    config: QueueConfig
  ): Promise<QueueInfo>;
  
  /**
   * Delete message queue
   */
  deleteQueue(queueName: string): Promise<void>;
  
  /**
   * Get queue information
   */
  getQueueInfo(queueName: string): Promise<QueueInfo>;
  
  /**
   * Purge queue messages
   */
  purgeQueue(queueName: string): Promise<PurgeResult>;
  
  // === TOPIC MANAGEMENT ===
  
  /**
   * Create topic for pub/sub
   */
  createTopic(
    topicName: string,
    config: TopicConfig
  ): Promise<TopicInfo>;
  
  /**
   * Delete topic
   */
  deleteTopic(topicName: string): Promise<void>;
  
  /**
   * Get topic information
   */
  getTopicInfo(topicName: string): Promise<TopicInfo>;
  
  // === ROUTING ===
  
  /**
   * Add message routing rule
   */
  addRoutingRule(rule: RoutingRule): Promise<void>;
  
  /**
   * Remove routing rule
   */
  removeRoutingRule(ruleId: string): Promise<void>;
  
  /**
   * Get routing rules
   */
  getRoutingRules(): Promise<RoutingRule[]>;
  
  // === MONITORING ===
  
  /**
   * Get broker metrics
   */
  getMetrics(): Promise<BrokerMetrics>;
  
  /**
   * Get queue metrics
   */
  getQueueMetrics(queueName: string): Promise<QueueMetrics>;
  
  /**
   * Get topic metrics
   */
  getTopicMetrics(topicName: string): Promise<TopicMetrics>;
}

// === CONFIGURATION ===

export interface MessageBrokerConfig {
  type: BrokerType;
  connectionString?: string;
  hosts?: string[];
  port?: number;
  username?: string;
  password?: string;
  ssl?: boolean;
  virtualHost?: string;
  heartbeatInterval?: number;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  messageTimeout?: number;
  maxMessageSize?: number;
  persistentMessages?: boolean;
  clustering?: ClusterConfig;
  security?: SecurityConfig;
}

export interface ClusterConfig {
  enabled: boolean;
  nodes: ClusterNode[];
  replicationFactor: number;
  consistencyLevel: ConsistencyLevel;
  partitioning: PartitioningStrategy;
}

export interface ClusterNode {
  id: string;
  host: string;
  port: number;
  weight: number;
  region?: string;
}

export interface SecurityConfig {
  authentication: AuthenticationConfig;
  encryption: EncryptionConfig;
  authorization: AuthorizationConfig;
}

export interface AuthenticationConfig {
  enabled: boolean;
  mechanism: AuthMechanism;
  credentials?: CredentialProvider;
}

export interface EncryptionConfig {
  enabled: boolean;
  algorithm: EncryptionAlgorithm;
  keyRotation: boolean;
  keyRotationInterval?: number;
}

export interface AuthorizationConfig {
  enabled: boolean;
  provider: AuthorizationProvider;
  policies: AuthorizationPolicy[];
}

// === PUBLISH/SUBSCRIBE OPTIONS ===

export interface PublishOptions {
  priority?: MessagePriority;
  deliveryGuarantee?: DeliveryGuarantee;
  ttl?: number;
  persistent?: boolean;
  compression?: CompressionType;
  routing?: RoutingOptions;
  retryPolicy?: RetryPolicy;
  deadLetterQueue?: string;
  headers?: Record<string, string>;
}

export interface SubscribeOptions {
  queueName?: string;
  durableSubscription?: boolean;
  acknowledgeMode?: AcknowledgeMode;
  prefetchCount?: number;
  priority?: number;
  filterExpression?: string;
  deadLetterQueue?: string;
  retryPolicy?: RetryPolicy;
  consumerGroup?: string;
}

export interface DirectMessageOptions {
  timeout?: number;
  retryPolicy?: RetryPolicy;
  priority?: MessagePriority;
  deliveryGuarantee?: DeliveryGuarantee;
}

export interface RoutingOptions {
  routingKey?: string;
  targetPartition?: number;
  affinityKey?: string;
  customHeaders?: Record<string, string>;
}

// === QUEUE CONFIGURATION ===

export interface QueueConfig {
  durable?: boolean;
  autoDelete?: boolean;
  exclusive?: boolean;
  maxLength?: number;
  maxLengthBytes?: number;
  messageTtl?: number;
  expires?: number;
  deadLetterExchange?: string;
  deadLetterRoutingKey?: string;
  maxPriority?: number;
  arguments?: Record<string, any>;
}

export interface TopicConfig {
  partitions?: number;
  replicationFactor?: number;
  retentionTime?: number;
  retentionSize?: number;
  compactionEnabled?: boolean;
  minInSyncReplicas?: number;
  uncleanLeaderElection?: boolean;
  arguments?: Record<string, any>;
}

// === ROUTING ===

export interface RoutingRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;
  conditions: RoutingCondition[];
  actions: RoutingAction[];
  metadata?: Record<string, any>;
}

export interface RoutingCondition {
  type: ConditionType;
  field: string;
  operator: ComparisonOperator;
  value: any;
  caseSensitive?: boolean;
}

export interface RoutingAction {
  type: ActionType;
  target: string;
  parameters?: Record<string, any>;
  transformations?: MessageTransformation[];
}

export interface MessageTransformation {
  type: TransformationType;
  source: string;
  target: string;
  expression?: string;
}

// === HANDLER TYPES ===

export type MessageHandler = (
  message: AgentMessage,
  context: MessageContext
) => Promise<MessageHandlerResult>;

export interface MessageContext {
  subscriptionId: SubscriptionId;
  deliveryAttempt: number;
  originalTopic: string;
  routingKey?: string;
  timestamp: Date;
  acknowledge: () => Promise<void>;
  reject: (requeue?: boolean) => Promise<void>;
  deadLetter: () => Promise<void>;
}

export interface MessageHandlerResult {
  status: HandlerStatus;
  response?: any;
  error?: Error;
  retryAfter?: number;
}

// === RESULT TYPES ===

export interface PublishResult {
  messageId: string;
  topic: string;
  partition?: number;
  offset?: number;
  timestamp: Date;
  confirmedBy?: string[];
}

export interface DirectMessageResult {
  messageId: string;
  targetAgent: string;
  deliveryPath: string[];
  deliveryTime: number;
  acknowledged: boolean;
}

export interface PurgeResult {
  queueName: string;
  messagesPurged: number;
  purgedAt: Date;
}

// === INFO TYPES ===

export interface QueueInfo {
  name: string;
  durable: boolean;
  autoDelete: boolean;
  exclusive: boolean;
  messageCount: number;
  consumerCount: number;
  arguments: Record<string, any>;
  state: QueueState;
  node?: string;
}

export interface TopicInfo {
  name: string;
  partitions: PartitionInfo[];
  replicationFactor: number;
  configs: Record<string, string>;
  state: TopicState;
}

export interface PartitionInfo {
  id: number;
  leader: string;
  replicas: string[];
  inSyncReplicas: string[];
  highWatermark: number;
  lowWatermark: number;
}

// === HEALTH AND METRICS ===

export interface BrokerHealth {
  status: HealthStatus;
  uptime: number;
  version: string;
  connectedClients: number;
  totalMemory: number;
  usedMemory: number;
  diskUsage: DiskUsage;
  networkStats: NetworkStats;
  lastUpdated: Date;
}

export interface BrokerMetrics {
  messageStats: MessageStats;
  connectionStats: ConnectionStats;
  queueStats: QueueStats[];
  topicStats: TopicStats[];
  errorStats: ErrorStats;
  performance: PerformanceStats;
  timestamp: Date;
}

export interface MessageStats {
  totalPublished: number;
  totalConsumed: number;
  totalAcknowledged: number;
  totalRejected: number;
  publishRate: number;
  consumeRate: number;
  inFlightMessages: number;
  deadLetterMessages: number;
}

export interface ConnectionStats {
  totalConnections: number;
  activeConnections: number;
  connectionsPerSecond: number;
  disconnectionsPerSecond: number;
  failedConnections: number;
}

export interface QueueStats {
  name: string;
  messages: number;
  consumers: number;
  publishRate: number;
  consumeRate: number;
  acknowledgeRate: number;
  averageLatency: number;
}

export interface TopicStats {
  name: string;
  partitions: number;
  totalMessages: number;
  messagesPerSecond: number;
  bytesPerSecond: number;
  consumerGroups: number;
}

export interface ErrorStats {
  totalErrors: number;
  errorRate: number;
  errorsByType: Record<string, number>;
  lastError?: ErrorInfo;
}

export interface PerformanceStats {
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  throughput: number;
  cpuUsage: number;
  memoryUsage: number;
}

export interface QueueMetrics {
  name: string;
  depth: number;
  enqueueRate: number;
  dequeueRate: number;
  averageMessageSize: number;
  oldestMessage: Date;
  consumerUtilization: number;
}

export interface TopicMetrics {
  name: string;
  totalSize: number;
  messageCount: number;
  producerCount: number;
  consumerCount: number;
  replicationLag: number;
  partitionMetrics: PartitionMetrics[];
}

export interface PartitionMetrics {
  id: number;
  size: number;
  messages: number;
  highWatermark: number;
  logEndOffset: number;
  replicaLag: number;
}

// === TYPES AND ENUMS ===

export type BrokerType = 
  | 'rabbitmq'
  | 'kafka'
  | 'redis'
  | 'activemq'
  | 'nats'
  | 'pulsar'
  | 'in_memory';

export type ConsistencyLevel = 
  | 'eventual'
  | 'strong'
  | 'bounded_staleness';

export type PartitioningStrategy = 
  | 'hash'
  | 'range'
  | 'round_robin'
  | 'custom';

export type AuthMechanism = 
  | 'plain'
  | 'external'
  | 'scram_sha_256'
  | 'scram_sha_512'
  | 'oauth';

export type EncryptionAlgorithm = 
  | 'aes_256_gcm'
  | 'chacha20_poly1305'
  | 'rsa_2048';

export type AuthorizationProvider = 
  | 'internal'
  | 'ldap'
  | 'oauth2'
  | 'custom';

export type CompressionType = 
  | 'none'
  | 'gzip'
  | 'snappy'
  | 'lz4'
  | 'zstd';

export type AcknowledgeMode = 
  | 'auto'
  | 'manual'
  | 'dups_ok';

export type ConditionType = 
  | 'header'
  | 'payload'
  | 'routing_key'
  | 'message_type'
  | 'priority';

export type ComparisonOperator = 
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'in'
  | 'not_in'
  | 'regex';

export type ActionType = 
  | 'route_to_queue'
  | 'route_to_topic'
  | 'transform'
  | 'filter'
  | 'dead_letter'
  | 'custom';

export type TransformationType = 
  | 'copy'
  | 'rename'
  | 'format'
  | 'calculate'
  | 'lookup';

export type HandlerStatus = 
  | 'success'
  | 'error'
  | 'retry'
  | 'dead_letter';

export type QueueState = 
  | 'running'
  | 'idle'
  | 'stopped'
  | 'error';

export type TopicState = 
  | 'active'
  | 'inactive'
  | 'error';

export type HealthStatus = 
  | 'healthy'
  | 'degraded'
  | 'unhealthy'
  | 'unknown';

export type SubscriptionId = string;

// === SUPPORTING INTERFACES ===

export interface DiskUsage {
  total: number;
  used: number;
  available: number;
  percentage: number;
}

export interface NetworkStats {
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
  connectionsPerSecond: number;
}

export interface ErrorInfo {
  code: string;
  message: string;
  timestamp: Date;
  count: number;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  baseDelayMs: number;
  maxDelayMs: number;
  jitter?: boolean;
}

export interface CredentialProvider {
  getCredentials(): Promise<Credentials>;
  refreshCredentials(): Promise<Credentials>;
}

export interface Credentials {
  username: string;
  password: string;
  token?: string;
  expiresAt?: Date;
}

export interface AuthorizationPolicy {
  id: string;
  name: string;
  effect: 'allow' | 'deny';
  principals: string[];
  actions: string[];
  resources: string[];
  conditions?: Record<string, any>;
}
