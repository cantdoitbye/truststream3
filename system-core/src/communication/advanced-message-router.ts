/**
 * TrustStream v4.2 - Advanced Message Router
 * 
 * Intelligent message routing system with priority queues, load balancing,
 * and adaptive routing algorithms for optimal communication efficiency.
 * 
 * KEY FEATURES:
 * - Priority-based message routing
 * - Intelligent destination selection
 * - Real-time route optimization
 * - Load-aware routing decisions
 * - Message correlation and tracking
 */

import { DatabaseInterface } from '../shared-utils/database-interface';
import { Logger } from '../shared-utils/logger';
import { EventEmitter } from 'events';

// Message interfaces
export interface RoutableMessage {
  id: string;
  type: MessageType;
  priority: MessagePriority;
  source: string;
  destination?: string | string[];
  payload: any;
  routing_hints?: RoutingHints;
  correlation_id?: string;
  timestamp: Date;
  expiry?: Date;
  retry_policy?: RetryPolicy;
  governance_requirements?: GovernanceRoutingRequirements;
}

export type MessageType = 
  | 'task_assignment'
  | 'task_result'
  | 'health_check'
  | 'performance_metric'
  | 'governance_decision'
  | 'consensus_vote'
  | 'approval_request'
  | 'trust_update'
  | 'system_alert'
  | 'coordination_signal'
  | 'memory_operation'
  | 'v41_legacy_message';

export type MessagePriority = 
  | 'critical'      // System critical operations
  | 'high'          // Governance decisions, urgent tasks
  | 'normal'        // Regular task coordination
  | 'low'           // Background operations, metrics
  | 'background';   // System maintenance, cleanup

export interface RoutingHints {
  preferred_protocol?: string;
  avoid_agents?: string[];
  require_capabilities?: string[];
  geographic_preference?: string;
  latency_requirement?: number;
  bandwidth_requirement?: number;
  encryption_required?: boolean;
}

export interface RetryPolicy {
  max_attempts: number;
  initial_delay_ms: number;
  backoff_multiplier: number;
  max_delay_ms: number;
  retry_conditions: string[];
}

export interface GovernanceRoutingRequirements {
  trust_score_minimum: number;
  accountability_required: boolean;
  audit_trail_enabled: boolean;
  consensus_routing: boolean;
  approval_chain_routing: boolean;
}

// Routing interfaces
export interface RoutingDecision {
  message_id: string;
  selected_route: Route;
  alternative_routes: Route[];
  routing_score: number;
  decision_timestamp: Date;
  decision_factors: RoutingFactor[];
  estimated_delivery_time: number;
}

export interface Route {
  route_id: string;
  destination: string;
  protocol: string;
  estimated_latency: number;
  estimated_bandwidth: number;
  reliability_score: number;
  load_factor: number;
  trust_score?: number;
  cost_score: number;
  hops: RouteHop[];
}

export interface RouteHop {
  hop_id: string;
  node_id: string;
  protocol: string;
  latency_ms: number;
  bandwidth_mbps: number;
  reliability: number;
}

export interface RoutingFactor {
  factor_name: string;
  weight: number;
  score: number;
  explanation: string;
}

// Priority queue interfaces
export interface PriorityQueue {
  critical: RoutableMessage[];
  high: RoutableMessage[];
  normal: RoutableMessage[];
  low: RoutableMessage[];
  background: RoutableMessage[];
}

export interface QueueMetrics {
  total_messages: number;
  messages_by_priority: Record<MessagePriority, number>;
  average_wait_time: Record<MessagePriority, number>;
  throughput_per_second: number;
  queue_depth: number;
  processing_rate: number;
}

// Load balancing interfaces
export interface LoadBalancingStrategy {
  strategy_name: string;
  algorithm: 'round_robin' | 'weighted_round_robin' | 'least_connections' | 'least_response_time' | 'hash_based' | 'adaptive';
  parameters: Record<string, any>;
  effectiveness_score: number;
}

export interface NodeLoadMetrics {
  node_id: string;
  cpu_utilization: number;
  memory_utilization: number;
  network_utilization: number;
  connection_count: number;
  queue_depth: number;
  response_time_avg: number;
  success_rate: number;
  last_updated: Date;
}

/**
 * AdvancedMessageRouter
 * 
 * High-performance message routing system with intelligent routing algorithms,
 * priority queues, and adaptive load balancing capabilities.
 */
export class AdvancedMessageRouter extends EventEmitter {
  private db: DatabaseInterface;
  private logger: Logger;
  
  // Core routing components
  private priorityQueues: Map<string, PriorityQueue> = new Map();
  private routingTable: Map<string, Route[]> = new Map();
  private loadMetrics: Map<string, NodeLoadMetrics> = new Map();
  private routingHistory: Map<string, RoutingDecision[]> = new Map();
  
  // Routing algorithms
  private routingAlgorithms: Map<string, RoutingAlgorithm> = new Map();
  private loadBalancingStrategies: Map<string, LoadBalancingStrategy> = new Map();
  
  // Performance tracking
  private routingMetrics: RoutingMetrics;
  private performanceOptimizer: PerformanceOptimizer;
  
  // Configuration
  private config: RouterConfig;

  constructor(
    db: DatabaseInterface,
    logger: Logger,
    config?: Partial<RouterConfig>
  ) {
    super();
    this.db = db;
    this.logger = logger;
    
    this.config = {
      max_queue_size: 10000,
      max_routing_attempts: 3,
      route_cache_ttl: 300000, // 5 minutes
      performance_monitoring_interval: 30000, // 30 seconds
      adaptive_routing_enabled: true,
      load_balancing_enabled: true,
      priority_enforcement: true,
      metrics_retention_period: 86400000, // 24 hours
      ...config
    };
    
    this.routingMetrics = new RoutingMetrics(logger);
    this.performanceOptimizer = new PerformanceOptimizer(logger);
  }

  /**
   * Initialize the advanced message router
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Advanced Message Router');
    
    try {
      // Initialize routing algorithms
      await this.initializeRoutingAlgorithms();
      
      // Initialize load balancing strategies
      await this.initializeLoadBalancingStrategies();
      
      // Load routing table from database
      await this.loadRoutingTable();
      
      // Start performance monitoring
      await this.startPerformanceMonitoring();
      
      // Initialize priority queues
      await this.initializePriorityQueues();
      
      // Start message processing
      await this.startMessageProcessing();
      
      this.logger.info('Advanced Message Router initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Advanced Message Router', error);
      throw error;
    }
  }

  /**
   * Route a message using intelligent routing algorithms
   */
  async routeMessage(message: RoutableMessage): Promise<RoutingDecision> {
    this.logger.debug(`Routing message: ${message.id}`, { 
      type: message.type, 
      priority: message.priority 
    });
    
    const startTime = Date.now();
    
    try {
      // Validate message
      this.validateMessage(message);
      
      // Add to priority queue
      await this.addToPriorityQueue(message);
      
      // Discover available routes
      const availableRoutes = await this.discoverRoutes(message);
      
      // Score and rank routes
      const rankedRoutes = await this.scoreAndRankRoutes(availableRoutes, message);
      
      // Select optimal route
      const selectedRoute = await this.selectOptimalRoute(rankedRoutes, message);
      
      // Create routing decision
      const routingDecision: RoutingDecision = {
        message_id: message.id,
        selected_route: selectedRoute,
        alternative_routes: rankedRoutes.slice(1, 4), // Top 3 alternatives
        routing_score: rankedRoutes[0]?.cost_score || 0,
        decision_timestamp: new Date(),
        decision_factors: await this.getDecisionFactors(selectedRoute, message),
        estimated_delivery_time: selectedRoute.estimated_latency
      };
      
      // Store routing decision
      await this.storeRoutingDecision(routingDecision);
      
      // Update routing metrics
      await this.routingMetrics.recordRouting(
        message, routingDecision, Date.now() - startTime
      );
      
      // Emit routing event
      this.emit('message_routed', {
        message: message,
        decision: routingDecision
      });
      
      return routingDecision;
      
    } catch (error) {
      this.logger.error(`Failed to route message: ${message.id}`, error);
      await this.routingMetrics.recordError(message, error);
      throw error;
    }
  }

  /**
   * Update node load metrics for load balancing
   */
  async updateNodeLoad(nodeId: string, metrics: Partial<NodeLoadMetrics>): Promise<void> {
    const existingMetrics = this.loadMetrics.get(nodeId) || this.getDefaultNodeMetrics(nodeId);
    
    const updatedMetrics: NodeLoadMetrics = {
      ...existingMetrics,
      ...metrics,
      last_updated: new Date()
    };
    
    this.loadMetrics.set(nodeId, updatedMetrics);
    
    // Trigger route recalculation if significant load change
    if (this.isSignificantLoadChange(existingMetrics, updatedMetrics)) {
      await this.recalculateRoutes(nodeId);
    }
  }

  /**
   * Get real-time routing analytics
   */
  getRoutingAnalytics(): RoutingAnalytics {
    return {
      total_messages_routed: this.routingMetrics.getTotalMessages(),
      average_routing_time: this.routingMetrics.getAverageRoutingTime(),
      success_rate: this.routingMetrics.getSuccessRate(),
      queue_metrics: this.getQueueMetrics(),
      load_distribution: this.getLoadDistribution(),
      route_performance: this.getRoutePerformance(),
      optimization_opportunities: this.performanceOptimizer.getOptimizationOpportunities()
    };
  }

  // Private helper methods
  private async initializeRoutingAlgorithms(): Promise<void> {
    this.logger.info('Initializing routing algorithms');
    
    // Shortest path algorithm
    this.routingAlgorithms.set('shortest_path', new ShortestPathAlgorithm());
    
    // Load-aware routing
    this.routingAlgorithms.set('load_aware', new LoadAwareRoutingAlgorithm());
    
    // Trust-based routing for governance
    this.routingAlgorithms.set('trust_based', new TrustBasedRoutingAlgorithm());
    
    // Latency-optimized routing
    this.routingAlgorithms.set('latency_optimized', new LatencyOptimizedRoutingAlgorithm());
    
    // Bandwidth-optimized routing
    this.routingAlgorithms.set('bandwidth_optimized', new BandwidthOptimizedRoutingAlgorithm());
    
    // Adaptive routing
    this.routingAlgorithms.set('adaptive', new AdaptiveRoutingAlgorithm());
  }

  private async initializeLoadBalancingStrategies(): Promise<void> {
    this.logger.info('Initializing load balancing strategies');
    
    // Round robin
    this.loadBalancingStrategies.set('round_robin', {
      strategy_name: 'round_robin',
      algorithm: 'round_robin',
      parameters: {},
      effectiveness_score: 0.7
    });
    
    // Weighted round robin
    this.loadBalancingStrategies.set('weighted_round_robin', {
      strategy_name: 'weighted_round_robin',
      algorithm: 'weighted_round_robin',
      parameters: { weight_factor: 'performance_score' },
      effectiveness_score: 0.8
    });
    
    // Least connections
    this.loadBalancingStrategies.set('least_connections', {
      strategy_name: 'least_connections',
      algorithm: 'least_connections',
      parameters: {},
      effectiveness_score: 0.85
    });
    
    // Adaptive load balancing
    this.loadBalancingStrategies.set('adaptive', {
      strategy_name: 'adaptive',
      algorithm: 'adaptive',
      parameters: { 
        learning_rate: 0.1,
        adaptation_threshold: 0.2
      },
      effectiveness_score: 0.95
    });
  }

  private async addToPriorityQueue(message: RoutableMessage): Promise<void> {
    const queueKey = this.getQueueKey(message);
    let queue = this.priorityQueues.get(queueKey);
    
    if (!queue) {
      queue = this.createEmptyPriorityQueue();
      this.priorityQueues.set(queueKey, queue);
    }
    
    // Add to appropriate priority queue
    switch (message.priority) {
      case 'critical':
        queue.critical.push(message);
        break;
      case 'high':
        queue.high.push(message);
        break;
      case 'normal':
        queue.normal.push(message);
        break;
      case 'low':
        queue.low.push(message);
        break;
      case 'background':
        queue.background.push(message);
        break;
    }
    
    // Check queue size limits
    await this.enforceQueueLimits(queue);
  }

  private async discoverRoutes(message: RoutableMessage): Promise<Route[]> {
    const routes: Route[] = [];
    
    // Get destinations
    const destinations = this.getDestinations(message);
    
    for (const destination of destinations) {
      // Get cached routes
      const cachedRoutes = this.routingTable.get(destination);
      
      if (cachedRoutes && this.areRoutesCacheFresh(cachedRoutes)) {
        routes.push(...cachedRoutes);
      } else {
        // Discover new routes
        const discoveredRoutes = await this.discoverRoutesToDestination(destination, message);
        routes.push(...discoveredRoutes);
        
        // Update routing table cache
        this.routingTable.set(destination, discoveredRoutes);
      }
    }
    
    return routes;
  }

  private async scoreAndRankRoutes(routes: Route[], message: RoutableMessage): Promise<Route[]> {
    const scoredRoutes = await Promise.all(
      routes.map(async route => ({
        ...route,
        cost_score: await this.calculateRouteCostScore(route, message)
      }))
    );
    
    // Sort by cost score (lower is better)
    return scoredRoutes.sort((a, b) => a.cost_score - b.cost_score);
  }

  private async calculateRouteCostScore(route: Route, message: RoutableMessage): Promise<number> {
    let score = 0;
    
    // Latency factor (40% weight)
    score += (route.estimated_latency / 1000) * 0.4;
    
    // Load factor (30% weight)
    score += route.load_factor * 0.3;
    
    // Reliability factor (20% weight) - inverse score
    score += (1 - route.reliability_score) * 0.2;
    
    // Trust factor for governance messages (10% weight)
    if (message.governance_requirements?.trust_score_minimum) {
      const trustGap = Math.max(0, message.governance_requirements.trust_score_minimum - (route.trust_score || 0));
      score += trustGap * 0.1;
    }
    
    return score;
  }

  private getQueueKey(message: RoutableMessage): string {
    // Group messages by type for better queue management
    return `${message.type}_queue`;
  }

  private createEmptyPriorityQueue(): PriorityQueue {
    return {
      critical: [],
      high: [],
      normal: [],
      low: [],
      background: []
    };
  }

  private validateMessage(message: RoutableMessage): void {
    if (!message.id) throw new Error('Message ID is required');
    if (!message.type) throw new Error('Message type is required');
    if (!message.priority) throw new Error('Message priority is required');
    if (!message.source) throw new Error('Message source is required');
    if (!message.payload) throw new Error('Message payload is required');
  }

  private getDestinations(message: RoutableMessage): string[] {
    if (Array.isArray(message.destination)) {
      return message.destination;
    } else if (message.destination) {
      return [message.destination];
    } else {
      // Auto-discover destinations based on message type
      return this.autoDiscoverDestinations(message);
    }
  }

  private autoDiscoverDestinations(message: RoutableMessage): string[] {
    // Implementation depends on agent registry integration
    // For now, return empty array - would be implemented with agent discovery
    return [];
  }
}

// Supporting classes
class RoutingMetrics {
  private logger: Logger;
  private metrics: Map<string, any> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async recordRouting(message: RoutableMessage, decision: RoutingDecision, timeMs: number): Promise<void> {
    // Record routing metrics
    const key = `${message.type}_${message.priority}`;
    const existing = this.metrics.get(key) || { count: 0, totalTime: 0, success: 0 };
    
    this.metrics.set(key, {
      count: existing.count + 1,
      totalTime: existing.totalTime + timeMs,
      success: existing.success + 1
    });
  }

  async recordError(message: RoutableMessage, error: Error): Promise<void> {
    const key = `${message.type}_${message.priority}`;
    const existing = this.metrics.get(key) || { count: 0, totalTime: 0, success: 0, errors: 0 };
    
    this.metrics.set(key, {
      ...existing,
      count: existing.count + 1,
      errors: (existing.errors || 0) + 1
    });
  }

  getTotalMessages(): number {
    return Array.from(this.metrics.values()).reduce((sum, m) => sum + m.count, 0);
  }

  getAverageRoutingTime(): number {
    const totalTime = Array.from(this.metrics.values()).reduce((sum, m) => sum + m.totalTime, 0);
    const totalCount = this.getTotalMessages();
    return totalCount > 0 ? totalTime / totalCount : 0;
  }

  getSuccessRate(): number {
    const totalSuccess = Array.from(this.metrics.values()).reduce((sum, m) => sum + m.success, 0);
    const totalCount = this.getTotalMessages();
    return totalCount > 0 ? totalSuccess / totalCount : 0;
  }
}

class PerformanceOptimizer {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  getOptimizationOpportunities(): OptimizationOpportunity[] {
    // Analyze performance data and return optimization suggestions
    return [
      {
        opportunity_type: 'route_optimization',
        description: 'Optimize frequently used routes',
        potential_improvement: 0.15,
        implementation_effort: 'medium'
      }
    ];
  }
}

// Routing algorithm interfaces
interface RoutingAlgorithm {
  calculateRoute(source: string, destination: string, constraints: any): Promise<Route>;
}

class ShortestPathAlgorithm implements RoutingAlgorithm {
  async calculateRoute(source: string, destination: string, constraints: any): Promise<Route> {
    // Implement shortest path algorithm
    return {
      route_id: `shortest_${source}_${destination}`,
      destination,
      protocol: 'https',
      estimated_latency: 100,
      estimated_bandwidth: 1000,
      reliability_score: 0.95,
      load_factor: 0.5,
      cost_score: 0.3,
      hops: []
    };
  }
}

class LoadAwareRoutingAlgorithm implements RoutingAlgorithm {
  async calculateRoute(source: string, destination: string, constraints: any): Promise<Route> {
    // Implement load-aware routing
    return {
      route_id: `load_aware_${source}_${destination}`,
      destination,
      protocol: 'https',
      estimated_latency: 120,
      estimated_bandwidth: 1000,
      reliability_score: 0.98,
      load_factor: 0.3,
      cost_score: 0.25,
      hops: []
    };
  }
}

class TrustBasedRoutingAlgorithm implements RoutingAlgorithm {
  async calculateRoute(source: string, destination: string, constraints: any): Promise<Route> {
    // Implement trust-based routing for governance
    return {
      route_id: `trust_based_${source}_${destination}`,
      destination,
      protocol: 'https',
      estimated_latency: 150,
      estimated_bandwidth: 800,
      reliability_score: 0.99,
      load_factor: 0.4,
      trust_score: 0.95,
      cost_score: 0.2,
      hops: []
    };
  }
}

class LatencyOptimizedRoutingAlgorithm implements RoutingAlgorithm {
  async calculateRoute(source: string, destination: string, constraints: any): Promise<Route> {
    // Implement latency-optimized routing
    return {
      route_id: `latency_optimized_${source}_${destination}`,
      destination,
      protocol: 'grpc',
      estimated_latency: 80,
      estimated_bandwidth: 1200,
      reliability_score: 0.96,
      load_factor: 0.6,
      cost_score: 0.4,
      hops: []
    };
  }
}

class BandwidthOptimizedRoutingAlgorithm implements RoutingAlgorithm {
  async calculateRoute(source: string, destination: string, constraints: any): Promise<Route> {
    // Implement bandwidth-optimized routing
    return {
      route_id: `bandwidth_optimized_${source}_${destination}`,
      destination,
      protocol: 'websocket',
      estimated_latency: 200,
      estimated_bandwidth: 2000,
      reliability_score: 0.94,
      load_factor: 0.3,
      cost_score: 0.35,
      hops: []
    };
  }
}

class AdaptiveRoutingAlgorithm implements RoutingAlgorithm {
  async calculateRoute(source: string, destination: string, constraints: any): Promise<Route> {
    // Implement adaptive routing with machine learning
    return {
      route_id: `adaptive_${source}_${destination}`,
      destination,
      protocol: 'https',
      estimated_latency: 90,
      estimated_bandwidth: 1500,
      reliability_score: 0.97,
      load_factor: 0.35,
      cost_score: 0.18,
      hops: []
    };
  }
}

// Additional interfaces
interface RouterConfig {
  max_queue_size: number;
  max_routing_attempts: number;
  route_cache_ttl: number;
  performance_monitoring_interval: number;
  adaptive_routing_enabled: boolean;
  load_balancing_enabled: boolean;
  priority_enforcement: boolean;
  metrics_retention_period: number;
}

interface RoutingAnalytics {
  total_messages_routed: number;
  average_routing_time: number;
  success_rate: number;
  queue_metrics: QueueMetrics;
  load_distribution: any;
  route_performance: any;
  optimization_opportunities: OptimizationOpportunity[];
}

interface OptimizationOpportunity {
  opportunity_type: string;
  description: string;
  potential_improvement: number;
  implementation_effort: 'low' | 'medium' | 'high';
}
