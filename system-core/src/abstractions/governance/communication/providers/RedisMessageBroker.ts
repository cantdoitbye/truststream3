/**
 * Redis Message Broker Implementation
 * 
 * Provides Redis-based message brokering capabilities for agent-to-agent communication
 * using Redis Streams and pub/sub functionality.
 */

import Redis from 'ioredis';
import {
  IMessageBroker,
  MessageBrokerConfig,
  PublishOptions,
  SubscribeOptions,
  DirectMessageOptions,
  PublishResult,
  DirectMessageResult,
  QueueConfig,
  TopicConfig,
  QueueInfo,
  TopicInfo,
  RoutingRule,
  BrokerHealth,
  BrokerMetrics,
  MessageHandler,
  MessageContext,
  SubscriptionId,
  PurgeResult
} from '../interfaces/IMessageBroker';
import {
  AgentMessage,
  MessagePriority,
  DeliveryGuarantee
} from '../interfaces/ICommunication';
import { Logger } from '../../../shared-utils/logger';

export class RedisMessageBroker implements IMessageBroker {
  private redis: Redis;
  private subscriber: Redis;
  private config: MessageBrokerConfig;
  private logger: Logger;
  private subscriptions: Map<SubscriptionId, SubscriptionInfo> = new Map();
  private routingRules: Map<string, RoutingRule> = new Map();
  private isInitialized = false;
  private isStarted = false;
  private metrics: BrokerMetrics;

  constructor(config: MessageBrokerConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.initializeMetrics();
  }

  // === BROKER LIFECYCLE ===

  async initialize(config: MessageBrokerConfig): Promise<void> {
    this.logger.info('Initializing Redis Message Broker');

    try {
      this.config = { ...this.config, ...config };

      // Initialize Redis connections
      this.redis = new Redis({
        host: this.config.hosts?.[0] || 'localhost',
        port: this.config.port || 6379,
        password: this.config.password,
        retryDelayOnFailover: this.config.reconnectDelay || 1000,
        maxRetriesPerRequest: this.config.reconnectAttempts || 3,
        connectTimeout: 10000,
        lazyConnect: true
      });

      this.subscriber = new Redis({
        host: this.config.hosts?.[0] || 'localhost',
        port: this.config.port || 6379,
        password: this.config.password,
        retryDelayOnFailover: this.config.reconnectDelay || 1000,
        maxRetriesPerRequest: this.config.reconnectAttempts || 3,
        connectTimeout: 10000,
        lazyConnect: true
      });

      // Connect to Redis
      await this.redis.connect();
      await this.subscriber.connect();

      // Set up event handlers
      this.setupEventHandlers();

      this.isInitialized = true;
      this.logger.info('Redis Message Broker initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize Redis Message Broker', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Message broker must be initialized before starting');
    }

    this.logger.info('Starting Redis Message Broker');
    
    try {
      // Start metric collection
      this.startMetricsCollection();
      
      this.isStarted = true;
      this.logger.info('Redis Message Broker started successfully');

    } catch (error) {
      this.logger.error('Failed to start Redis Message Broker', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping Redis Message Broker');

    try {
      // Close all subscriptions
      for (const [subscriptionId, subscription] of this.subscriptions) {
        await this.unsubscribe(subscriptionId);
      }

      // Disconnect from Redis
      await this.subscriber.disconnect();
      await this.redis.disconnect();

      this.isStarted = false;
      this.logger.info('Redis Message Broker stopped successfully');

    } catch (error) {
      this.logger.error('Failed to stop Redis Message Broker', error);
      throw error;
    }
  }

  async getHealth(): Promise<BrokerHealth> {
    try {
      const info = await this.redis.info('server');
      const memory = await this.redis.info('memory');
      
      const uptime = this.extractInfoValue(info, 'uptime_in_seconds');
      const connectedClients = this.extractInfoValue(info, 'connected_clients');
      const usedMemory = this.extractInfoValue(memory, 'used_memory');
      const totalMemory = this.extractInfoValue(memory, 'total_system_memory');

      return {
        status: this.isStarted ? 'healthy' : 'unhealthy',
        uptime: parseInt(uptime) || 0,
        version: this.extractInfoValue(info, 'redis_version'),
        connectedClients: parseInt(connectedClients) || 0,
        totalMemory: parseInt(totalMemory) || 0,
        usedMemory: parseInt(usedMemory) || 0,
        diskUsage: {
          total: 0,
          used: 0,
          available: 0,
          percentage: 0
        },
        networkStats: {
          bytesIn: 0,
          bytesOut: 0,
          packetsIn: 0,
          packetsOut: 0,
          connectionsPerSecond: 0
        },
        lastUpdated: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to get broker health', error);
      return {
        status: 'unhealthy',
        uptime: 0,
        version: 'unknown',
        connectedClients: 0,
        totalMemory: 0,
        usedMemory: 0,
        diskUsage: {
          total: 0,
          used: 0,
          available: 0,
          percentage: 0
        },
        networkStats: {
          bytesIn: 0,
          bytesOut: 0,
          packetsIn: 0,
          packetsOut: 0,
          connectionsPerSecond: 0
        },
        lastUpdated: new Date()
      };
    }
  }

  // === MESSAGE OPERATIONS ===

  async publish(
    topic: string,
    message: AgentMessage,
    options?: PublishOptions
  ): Promise<PublishResult> {
    this.logger.debug(`Publishing message to topic: ${topic}`, { messageId: message.id });

    try {
      const publishOptions = this.buildPublishOptions(options);
      const serializedMessage = this.serializeMessage(message, publishOptions);

      let result: any;

      if (publishOptions.persistent) {
        // Use Redis Streams for persistent messages
        const streamKey = `stream:${topic}`;
        const messageId = await this.redis.xadd(
          streamKey,
          '*',
          'data', serializedMessage,
          'priority', publishOptions.priority || 'normal',
          'ttl', publishOptions.ttl || 0
        );
        result = { messageId, partition: 0, offset: 0 };
      } else {
        // Use pub/sub for non-persistent messages
        const subscriberCount = await this.redis.publish(topic, serializedMessage);
        result = { messageId: message.id, subscriberCount };
      }

      // Apply routing rules
      await this.applyRoutingRules(topic, message, publishOptions);

      // Update metrics
      this.updatePublishMetrics(topic, message, true);

      return {
        messageId: message.id,
        topic,
        partition: result.partition,
        offset: result.offset,
        timestamp: new Date(),
        confirmedBy: ['redis-broker']
      };

    } catch (error) {
      this.logger.error(`Failed to publish message to topic: ${topic}`, error);
      this.updatePublishMetrics(topic, message, false);
      throw error;
    }
  }

  async subscribe(
    topic: string,
    handler: MessageHandler,
    options?: SubscribeOptions
  ): Promise<SubscriptionId> {
    this.logger.info(`Subscribing to topic: ${topic}`);

    try {
      const subscriptionId = this.generateSubscriptionId();
      const subscribeOptions = this.buildSubscribeOptions(options);
      
      const subscription: SubscriptionInfo = {
        id: subscriptionId,
        topic,
        handler,
        options: subscribeOptions,
        active: true,
        messageCount: 0,
        lastActivity: new Date()
      };

      this.subscriptions.set(subscriptionId, subscription);

      if (subscribeOptions.durableSubscription) {
        // Use Redis Streams for durable subscriptions
        await this.setupStreamSubscription(subscription);
      } else {
        // Use pub/sub for regular subscriptions
        await this.setupPubSubSubscription(subscription);
      }

      this.logger.info(`Subscribed to topic: ${topic} with ID: ${subscriptionId}`);
      return subscriptionId;

    } catch (error) {
      this.logger.error(`Failed to subscribe to topic: ${topic}`, error);
      throw error;
    }
  }

  async unsubscribe(subscriptionId: SubscriptionId): Promise<void> {
    this.logger.info(`Unsubscribing from subscription: ${subscriptionId}`);

    try {
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) {
        this.logger.warn(`Subscription not found: ${subscriptionId}`);
        return;
      }

      subscription.active = false;
      
      if (subscription.options.durableSubscription) {
        // Handle stream subscription cleanup
        await this.cleanupStreamSubscription(subscription);
      } else {
        // Handle pub/sub subscription cleanup
        await this.cleanupPubSubSubscription(subscription);
      }

      this.subscriptions.delete(subscriptionId);
      this.logger.info(`Unsubscribed from subscription: ${subscriptionId}`);

    } catch (error) {
      this.logger.error(`Failed to unsubscribe: ${subscriptionId}`, error);
      throw error;
    }
  }

  async sendDirect(
    targetAgent: string,
    message: AgentMessage,
    options?: DirectMessageOptions
  ): Promise<DirectMessageResult> {
    this.logger.debug(`Sending direct message to agent: ${targetAgent}`, { messageId: message.id });

    try {
      const queueName = `agent:${targetAgent}:messages`;
      const directOptions = this.buildDirectMessageOptions(options);
      const serializedMessage = this.serializeMessage(message, directOptions);

      // Use Redis List for direct messaging with optional priority
      const startTime = Date.now();
      
      if (directOptions.priority === 'high' || directOptions.priority === 'critical') {
        await this.redis.lpush(queueName, serializedMessage);
      } else {
        await this.redis.rpush(queueName, serializedMessage);
      }

      // Set TTL if specified
      if (directOptions.timeout) {
        await this.redis.expire(queueName, Math.ceil(directOptions.timeout / 1000));
      }

      const deliveryTime = Date.now() - startTime;

      return {
        messageId: message.id,
        targetAgent,
        deliveryPath: ['redis-broker', targetAgent],
        deliveryTime,
        acknowledged: false // Redis doesn't provide delivery confirmation by default
      };

    } catch (error) {
      this.logger.error(`Failed to send direct message to agent: ${targetAgent}`, error);
      throw error;
    }
  }

  // === QUEUE MANAGEMENT ===

  async createQueue(queueName: string, config: QueueConfig): Promise<QueueInfo> {
    this.logger.info(`Creating queue: ${queueName}`);

    try {
      // Redis doesn't have explicit queue creation, but we can set up metadata
      const queueKey = `queue:${queueName}`;
      const metadataKey = `queue:${queueName}:metadata`;
      
      await this.redis.hmset(metadataKey, {
        name: queueName,
        durable: config.durable ? 'true' : 'false',
        autoDelete: config.autoDelete ? 'true' : 'false',
        exclusive: config.exclusive ? 'true' : 'false',
        maxLength: config.maxLength || 0,
        messageTtl: config.messageTtl || 0,
        created: new Date().toISOString()
      });

      return {
        name: queueName,
        durable: config.durable || false,
        autoDelete: config.autoDelete || false,
        exclusive: config.exclusive || false,
        messageCount: 0,
        consumerCount: 0,
        arguments: config.arguments || {},
        state: 'running'
      };

    } catch (error) {
      this.logger.error(`Failed to create queue: ${queueName}`, error);
      throw error;
    }
  }

  async deleteQueue(queueName: string): Promise<void> {
    this.logger.info(`Deleting queue: ${queueName}`);

    try {
      const queueKey = `queue:${queueName}`;
      const metadataKey = `queue:${queueName}:metadata`;
      
      await this.redis.del(queueKey, metadataKey);
      this.logger.info(`Queue deleted: ${queueName}`);

    } catch (error) {
      this.logger.error(`Failed to delete queue: ${queueName}`, error);
      throw error;
    }
  }

  async getQueueInfo(queueName: string): Promise<QueueInfo> {
    try {
      const queueKey = `queue:${queueName}`;
      const metadataKey = `queue:${queueName}:metadata`;
      
      const metadata = await this.redis.hgetall(metadataKey);
      const messageCount = await this.redis.llen(queueKey);
      
      if (!metadata.name) {
        throw new Error(`Queue not found: ${queueName}`);
      }

      return {
        name: queueName,
        durable: metadata.durable === 'true',
        autoDelete: metadata.autoDelete === 'true',
        exclusive: metadata.exclusive === 'true',
        messageCount,
        consumerCount: 0, // Redis doesn't track this directly
        arguments: {},
        state: 'running'
      };

    } catch (error) {
      this.logger.error(`Failed to get queue info: ${queueName}`, error);
      throw error;
    }
  }

  async purgeQueue(queueName: string): Promise<PurgeResult> {
    this.logger.info(`Purging queue: ${queueName}`);

    try {
      const queueKey = `queue:${queueName}`;
      const messageCount = await this.redis.llen(queueKey);
      
      await this.redis.del(queueKey);
      
      return {
        queueName,
        messagesPurged: messageCount,
        purgedAt: new Date()
      };

    } catch (error) {
      this.logger.error(`Failed to purge queue: ${queueName}`, error);
      throw error;
    }
  }

  // === TOPIC MANAGEMENT ===

  async createTopic(topicName: string, config: TopicConfig): Promise<TopicInfo> {
    this.logger.info(`Creating topic: ${topicName}`);

    try {
      // Redis Streams will be created automatically when first message is published
      const metadataKey = `topic:${topicName}:metadata`;
      
      await this.redis.hmset(metadataKey, {
        name: topicName,
        partitions: config.partitions || 1,
        replicationFactor: config.replicationFactor || 1,
        retentionTime: config.retentionTime || 0,
        created: new Date().toISOString()
      });

      return {
        name: topicName,
        partitions: [],
        replicationFactor: config.replicationFactor || 1,
        configs: {},
        state: 'active'
      };

    } catch (error) {
      this.logger.error(`Failed to create topic: ${topicName}`, error);
      throw error;
    }
  }

  async deleteTopic(topicName: string): Promise<void> {
    this.logger.info(`Deleting topic: ${topicName}`);

    try {
      const streamKey = `stream:${topicName}`;
      const metadataKey = `topic:${topicName}:metadata`;
      
      await this.redis.del(streamKey, metadataKey);
      this.logger.info(`Topic deleted: ${topicName}`);

    } catch (error) {
      this.logger.error(`Failed to delete topic: ${topicName}`, error);
      throw error;
    }
  }

  async getTopicInfo(topicName: string): Promise<TopicInfo> {
    try {
      const metadataKey = `topic:${topicName}:metadata`;
      const metadata = await this.redis.hgetall(metadataKey);
      
      if (!metadata.name) {
        throw new Error(`Topic not found: ${topicName}`);
      }

      return {
        name: topicName,
        partitions: [],
        replicationFactor: parseInt(metadata.replicationFactor) || 1,
        configs: {},
        state: 'active'
      };

    } catch (error) {
      this.logger.error(`Failed to get topic info: ${topicName}`, error);
      throw error;
    }
  }

  // === ROUTING ===

  async addRoutingRule(rule: RoutingRule): Promise<void> {
    this.logger.info(`Adding routing rule: ${rule.name}`);
    
    try {
      this.routingRules.set(rule.id, rule);
      
      // Persist routing rule to Redis
      const ruleKey = `routing:rule:${rule.id}`;
      await this.redis.hmset(ruleKey, {
        id: rule.id,
        name: rule.name,
        enabled: rule.enabled ? 'true' : 'false',
        priority: rule.priority,
        conditions: JSON.stringify(rule.conditions),
        actions: JSON.stringify(rule.actions),
        metadata: JSON.stringify(rule.metadata || {})
      });
      
      this.logger.info(`Routing rule added: ${rule.name}`);

    } catch (error) {
      this.logger.error(`Failed to add routing rule: ${rule.name}`, error);
      throw error;
    }
  }

  async removeRoutingRule(ruleId: string): Promise<void> {
    this.logger.info(`Removing routing rule: ${ruleId}`);
    
    try {
      this.routingRules.delete(ruleId);
      
      const ruleKey = `routing:rule:${ruleId}`;
      await this.redis.del(ruleKey);
      
      this.logger.info(`Routing rule removed: ${ruleId}`);

    } catch (error) {
      this.logger.error(`Failed to remove routing rule: ${ruleId}`, error);
      throw error;
    }
  }

  async getRoutingRules(): Promise<RoutingRule[]> {
    return Array.from(this.routingRules.values());
  }

  // === MONITORING ===

  async getMetrics(): Promise<BrokerMetrics> {
    await this.updateMetrics();
    return this.metrics;
  }

  async getQueueMetrics(queueName: string): Promise<any> {
    try {
      const queueKey = `queue:${queueName}`;
      const depth = await this.redis.llen(queueKey);
      
      return {
        name: queueName,
        depth,
        enqueueRate: 0, // Would need to implement rate tracking
        dequeueRate: 0,
        averageMessageSize: 0,
        oldestMessage: new Date(),
        consumerUtilization: 0
      };

    } catch (error) {
      this.logger.error(`Failed to get queue metrics: ${queueName}`, error);
      throw error;
    }
  }

  async getTopicMetrics(topicName: string): Promise<any> {
    try {
      const streamKey = `stream:${topicName}`;
      const length = await this.redis.xlen(streamKey);
      
      return {
        name: topicName,
        totalSize: 0,
        messageCount: length,
        producerCount: 0,
        consumerCount: 0,
        replicationLag: 0,
        partitionMetrics: []
      };

    } catch (error) {
      this.logger.error(`Failed to get topic metrics: ${topicName}`, error);
      throw error;
    }
  }

  // === PRIVATE METHODS ===

  private setupEventHandlers(): void {
    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error', error);
    });

    this.subscriber.on('error', (error) => {
      this.logger.error('Redis subscriber connection error', error);
    });

    this.redis.on('connect', () => {
      this.logger.info('Connected to Redis');
    });

    this.subscriber.on('connect', () => {
      this.logger.info('Redis subscriber connected');
    });
  }

  private initializeMetrics(): void {
    this.metrics = {
      messageStats: {
        totalPublished: 0,
        totalConsumed: 0,
        totalAcknowledged: 0,
        totalRejected: 0,
        publishRate: 0,
        consumeRate: 0,
        inFlightMessages: 0,
        deadLetterMessages: 0
      },
      connectionStats: {
        totalConnections: 0,
        activeConnections: 0,
        connectionsPerSecond: 0,
        disconnectionsPerSecond: 0,
        failedConnections: 0
      },
      queueStats: [],
      topicStats: [],
      errorStats: {
        totalErrors: 0,
        errorRate: 0,
        errorsByType: {},
        lastError: undefined
      },
      performance: {
        averageLatency: 0,
        p95Latency: 0,
        p99Latency: 0,
        throughput: 0,
        cpuUsage: 0,
        memoryUsage: 0
      },
      timestamp: new Date()
    };
  }

  private startMetricsCollection(): void {
    // Update metrics every 30 seconds
    setInterval(() => {
      this.updateMetrics().catch(error => {
        this.logger.error('Failed to update metrics', error);
      });
    }, 30000);
  }

  private async updateMetrics(): Promise<void> {
    this.metrics.timestamp = new Date();
    // Additional metrics collection logic would go here
  }

  private buildPublishOptions(options?: PublishOptions): any {
    return {
      priority: options?.priority || 'normal',
      deliveryGuarantee: options?.deliveryGuarantee || 'at_least_once',
      ttl: options?.ttl || 0,
      persistent: options?.persistent !== false,
      compression: options?.compression || 'none',
      retryPolicy: options?.retryPolicy,
      deadLetterQueue: options?.deadLetterQueue,
      headers: options?.headers || {}
    };
  }

  private buildSubscribeOptions(options?: SubscribeOptions): any {
    return {
      queueName: options?.queueName,
      durableSubscription: options?.durableSubscription || false,
      acknowledgeMode: options?.acknowledgeMode || 'auto',
      prefetchCount: options?.prefetchCount || 1,
      priority: options?.priority || 0,
      filterExpression: options?.filterExpression,
      deadLetterQueue: options?.deadLetterQueue,
      retryPolicy: options?.retryPolicy,
      consumerGroup: options?.consumerGroup
    };
  }

  private buildDirectMessageOptions(options?: DirectMessageOptions): any {
    return {
      timeout: options?.timeout || 30000,
      retryPolicy: options?.retryPolicy,
      priority: options?.priority || 'normal',
      deliveryGuarantee: options?.deliveryGuarantee || 'at_least_once'
    };
  }

  private serializeMessage(message: AgentMessage, options: any): string {
    const messageWithOptions = {
      ...message,
      _broker: {
        timestamp: new Date().toISOString(),
        priority: options.priority,
        ttl: options.ttl,
        headers: options.headers
      }
    };
    return JSON.stringify(messageWithOptions);
  }

  private deserializeMessage(data: string): AgentMessage {
    const parsed = JSON.parse(data);
    delete parsed._broker; // Remove broker metadata
    return parsed;
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async setupStreamSubscription(subscription: SubscriptionInfo): Promise<void> {
    const streamKey = `stream:${subscription.topic}`;
    const consumerGroup = subscription.options.consumerGroup || 'default';
    const consumerName = `consumer_${subscription.id}`;

    try {
      // Create consumer group if it doesn't exist
      try {
        await this.redis.xgroup('CREATE', streamKey, consumerGroup, '$', 'MKSTREAM');
      } catch (error) {
        // Group might already exist, ignore error
      }

      // Start consuming messages
      this.processStreamMessages(subscription, streamKey, consumerGroup, consumerName);

    } catch (error) {
      this.logger.error(`Failed to setup stream subscription for topic: ${subscription.topic}`, error);
      throw error;
    }
  }

  private async setupPubSubSubscription(subscription: SubscriptionInfo): Promise<void> {
    try {
      await this.subscriber.subscribe(subscription.topic);
      
      this.subscriber.on('message', async (channel, message) => {
        if (channel === subscription.topic && subscription.active) {
          await this.handleSubscriptionMessage(subscription, message);
        }
      });

    } catch (error) {
      this.logger.error(`Failed to setup pub/sub subscription for topic: ${subscription.topic}`, error);
      throw error;
    }
  }

  private async processStreamMessages(
    subscription: SubscriptionInfo,
    streamKey: string,
    consumerGroup: string,
    consumerName: string
  ): Promise<void> {
    while (subscription.active) {
      try {
        const messages = await this.redis.xreadgroup(
          'GROUP', consumerGroup, consumerName,
          'COUNT', subscription.options.prefetchCount || 1,
          'BLOCK', 1000,
          'STREAMS', streamKey, '>'
        );

        if (messages && messages.length > 0) {
          for (const [stream, streamMessages] of messages) {
            for (const [messageId, fields] of streamMessages) {
              if (!subscription.active) break;
              
              const messageData = fields[1]; // Assuming data is at index 1
              await this.handleSubscriptionMessage(subscription, messageData, messageId);
              
              // Acknowledge message
              await this.redis.xack(streamKey, consumerGroup, messageId);
            }
          }
        }
      } catch (error) {
        if (subscription.active) {
          this.logger.error(`Error processing stream messages for topic: ${subscription.topic}`, error);
          await this.sleep(1000); // Wait before retrying
        }
      }
    }
  }

  private async handleSubscriptionMessage(
    subscription: SubscriptionInfo,
    messageData: string,
    messageId?: string
  ): Promise<void> {
    try {
      const message = this.deserializeMessage(messageData);
      subscription.messageCount++;
      subscription.lastActivity = new Date();

      const context: MessageContext = {
        subscriptionId: subscription.id,
        deliveryAttempt: 1,
        originalTopic: subscription.topic,
        routingKey: subscription.topic,
        timestamp: new Date(),
        acknowledge: async () => {
          // Acknowledgment is handled in the stream processing loop
        },
        reject: async (requeue?: boolean) => {
          this.logger.warn(`Message rejected`, { messageId: message.id, requeue });
        },
        deadLetter: async () => {
          this.logger.warn(`Message sent to dead letter queue`, { messageId: message.id });
        }
      };

      await subscription.handler(message, context);

    } catch (error) {
      this.logger.error(`Error handling subscription message`, error);
    }
  }

  private async cleanupStreamSubscription(subscription: SubscriptionInfo): Promise<void> {
    // Consumer group cleanup would be implemented here
    this.logger.debug(`Cleaning up stream subscription: ${subscription.id}`);
  }

  private async cleanupPubSubSubscription(subscription: SubscriptionInfo): Promise<void> {
    try {
      await this.subscriber.unsubscribe(subscription.topic);
    } catch (error) {
      this.logger.error(`Failed to cleanup pub/sub subscription: ${subscription.id}`, error);
    }
  }

  private async applyRoutingRules(
    topic: string,
    message: AgentMessage,
    options: any
  ): Promise<void> {
    // Apply routing rules logic would be implemented here
    // For now, this is a placeholder
  }

  private updatePublishMetrics(topic: string, message: AgentMessage, success: boolean): void {
    if (success) {
      this.metrics.messageStats.totalPublished++;
    } else {
      this.metrics.errorStats.totalErrors++;
    }
  }

  private extractInfoValue(info: string, key: string): string {
    const lines = info.split('\r\n');
    for (const line of lines) {
      if (line.startsWith(`${key}:`)) {
        return line.split(':')[1];
      }
    }
    return '0';
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Supporting interfaces
interface SubscriptionInfo {
  id: SubscriptionId;
  topic: string;
  handler: MessageHandler;
  options: any;
  active: boolean;
  messageCount: number;
  lastActivity: Date;
}
