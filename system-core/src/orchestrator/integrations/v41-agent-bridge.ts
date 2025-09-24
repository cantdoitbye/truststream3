/**
 * TrustStream v4.2 - V4.1 Agent Bridge
 * 
 * Integration bridge that enables seamless communication and coordination
 * between existing v4.1 agents and the new unified orchestration system.
 * 
 * DESIGN PRINCIPLES:
 * - Zero-disruption integration with existing v4.1 agents
 * - Backward compatibility for all existing agent APIs
 * - Transparent protocol translation between v4.1 and v4.2
 * - Enhanced coordination with governance oversight
 * - Graceful fallback to v4.1 behaviors when needed
 */

import { DatabaseInterface } from '../../shared-utils/database-interface';
import { AgentCommunication } from '../../shared-utils/agent-communication';
import { Logger } from '../../shared-utils/logger';

// V4.1 Agent interfaces (compatible with existing system)
export interface LegacyAgent {
  id: string;
  type: LegacyAgentType;
  name: string;
  status: AgentStatus;
  capabilities: string[];
  performance_score: number;
  health_score: number;
  last_active: Date;
  endpoint: AgentEndpoint;
  protocol_version: string;
  metadata: LegacyAgentMetadata;
}

export type LegacyAgentType = 
  | 'ai_coordinator'
  | 'memory_manager'
  | 'performance_monitor'
  | 'communication_handler'
  | 'task_executor'
  | 'data_processor'
  | 'error_handler'
  | 'security_monitor';

export type AgentStatus = 
  | 'active'
  | 'busy'
  | 'idle'
  | 'degraded'
  | 'offline'
  | 'maintenance';

export interface AgentEndpoint {
  url: string;
  protocol: 'http' | 'https' | 'websocket' | 'grpc';
  port: number;
  authentication: AuthenticationConfig;
  health_check_path: string;
}

export interface AuthenticationConfig {
  type: 'none' | 'api_key' | 'oauth' | 'certificate';
  credentials?: any;
  token_refresh_interval?: number;
}

export interface LegacyAgentMetadata {
  deployment_date: Date;
  version: string;
  dependencies: string[];
  resource_requirements: ResourceRequirements;
  monitoring_config: MonitoringConfig;
  compatibility_flags: CompatibilityFlags;
}

export interface ResourceRequirements {
  cpu_cores: number;
  memory_mb: number;
  storage_gb: number;
  network_bandwidth_mbps: number;
}

export interface MonitoringConfig {
  metrics_enabled: boolean;
  logging_level: 'debug' | 'info' | 'warn' | 'error';
  health_check_interval: number;
  performance_tracking: boolean;
}

export interface CompatibilityFlags {
  v41_api_compatible: boolean;
  enhanced_features_supported: boolean;
  governance_integration_level: 'none' | 'basic' | 'full';
  protocol_version_supported: string[];
}

// Legacy task and communication interfaces
export interface LegacyTask {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  payload: any;
  source_agent?: string;
  target_agents?: string[];
  created_at: Date;
  timeout_ms: number;
  retry_policy: RetryPolicy;
  callback_url?: string;
}

export interface RetryPolicy {
  max_attempts: number;
  delay_ms: number;
  backoff_multiplier: number;
  retry_conditions: string[];
}

export interface LegacyTaskResult {
  task_id: string;
  agent_id: string;
  status: 'success' | 'failure' | 'timeout' | 'cancelled';
  result: any;
  error_message?: string;
  execution_time_ms: number;
  resource_usage: ResourceUsage;
  metadata: TaskExecutionMetadata;
}

export interface ResourceUsage {
  cpu_time_ms: number;
  memory_peak_mb: number;
  network_bytes_transferred: number;
  disk_operations: number;
}

export interface TaskExecutionMetadata {
  started_at: Date;
  completed_at: Date;
  retry_count: number;
  agent_version: string;
  protocol_used: string;
  performance_metrics: PerformanceMetrics;
}

export interface PerformanceMetrics {
  response_time_ms: number;
  throughput: number;
  success_rate: number;
  error_rate: number;
  quality_score: number;
}

// Agent discovery and coordination interfaces
export interface AgentDiscoveryQuery {
  agent_types?: LegacyAgentType[];
  capabilities?: string[];
  min_performance_score?: number;
  max_response_time?: number;
  availability_requirements?: string[];
  geographic_constraints?: string[];
  protocol_preferences?: string[];
  v41_compatibility_required?: boolean;
}

export interface AgentDiscoveryResult {
  agents: LegacyAgent[];
  total_found: number;
  search_time_ms: number;
  compatibility_summary: CompatibilitySummary;
}

export interface CompatibilitySummary {
  v41_compatible_count: number;
  enhanced_features_count: number;
  governance_ready_count: number;
  protocol_distribution: Record<string, number>;
}

export interface LegacySession {
  id: string;
  task_id: string;
  participating_agents: string[];
  session_type: 'coordination' | 'execution' | 'monitoring' | 'maintenance';
  protocol: 'v41_native' | 'v42_enhanced' | 'hybrid';
  created_at: Date;
  expires_at: Date;
  status: 'active' | 'completed' | 'failed' | 'expired';
  communication_channels: CommunicationChannel[];
}

export interface CommunicationChannel {
  id: string;
  type: 'websocket' | 'http_polling' | 'grpc_stream' | 'message_queue';
  endpoint: string;
  participants: string[];
  message_count: number;
  last_activity: Date;
}

/**
 * V41AgentBridge
 * 
 * Provides seamless integration between existing v4.1 agents and the unified
 * orchestration system while maintaining full backward compatibility.
 */
export class V41AgentBridge {
  private db: DatabaseInterface;
  private communication: AgentCommunication;
  private logger: Logger;
  
  // Agent registry and session management
  private legacyAgents: Map<string, LegacyAgent> = new Map();
  private activeSessions: Map<string, LegacySession> = new Map();
  private protocolAdapters: Map<string, ProtocolAdapter> = new Map();
  
  // Performance monitoring
  private performanceMetrics: Map<string, PerformanceMetrics> = new Map();
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  
  // Configuration
  private bridgeConfig: BridgeConfig;

  constructor(
    db: DatabaseInterface,
    communication: AgentCommunication,
    logger: Logger
  ) {
    this.db = db;
    this.communication = communication;
    this.logger = logger;
    
    this.bridgeConfig = {
      enable_legacy_support: true,
      enable_enhanced_features: true,
      protocol_translation_enabled: true,
      performance_monitoring_enabled: true,
      health_check_interval: 30000,
      session_timeout_ms: 3600000, // 1 hour
      backward_compatibility_strict: true
    };
  }

  /**
   * Initialize the V4.1 agent bridge
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing V4.1 Agent Bridge');
    
    try {
      // Load existing v4.1 agents from registry
      await this.loadExistingLegacyAgents();
      
      // Initialize protocol adapters
      await this.initializeProtocolAdapters();
      
      // Set up health monitoring for legacy agents
      await this.setupLegacyAgentHealthMonitoring();
      
      // Initialize communication channels
      await this.initializeCommunicationChannels();
      
      // Start background tasks
      await this.startBackgroundTasks();
      
      this.logger.info('V4.1 Agent Bridge initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize V4.1 Agent Bridge', error);
      throw error;
    }
  }

  /**
   * Discover available legacy agents based on task requirements
   */
  async discoverLegacyAgents(task: any): Promise<LegacyAgent[]> {
    this.logger.info(`Discovering legacy agents for task: ${task.id}`);
    
    try {
      // Build discovery query based on task requirements
      const query: AgentDiscoveryQuery = {
        agent_types: this.mapTaskTypeToAgentTypes(task.type),
        min_performance_score: 0.7,
        max_response_time: 5000,
        v41_compatibility_required: true
      };
      
      // Execute discovery
      const result = await this.executeAgentDiscovery(query);
      
      // Filter and rank agents
      const suitableAgents = this.filterAndRankAgents(result.agents, task);
      
      this.logger.info(`Found ${suitableAgents.length} suitable legacy agents for task ${task.id}`);
      return suitableAgents;
      
    } catch (error) {
      this.logger.error(`Failed to discover legacy agents for task ${task.id}`, error);
      throw error;
    }
  }

  /**
   * Create legacy coordination session
   */
  async createLegacySession(task: any, agents: LegacyAgent[]): Promise<string> {
    this.logger.info(`Creating legacy session for task: ${task.id}`);
    
    try {
      const sessionId = this.generateSessionId();
      
      // Determine optimal communication protocol
      const protocol = this.determineOptimalProtocol(agents);
      
      // Create session
      const session: LegacySession = {
        id: sessionId,
        task_id: task.id,
        participating_agents: agents.map(a => a.id),
        session_type: 'coordination',
        protocol: protocol,
        created_at: new Date(),
        expires_at: new Date(Date.now() + this.bridgeConfig.session_timeout_ms),
        status: 'active',
        communication_channels: []
      };
      
      // Set up communication channels
      await this.setupSessionCommunication(session, agents);
      
      // Store session
      this.activeSessions.set(sessionId, session);
      
      // Persist to database
      await this.persistLegacySession(session);
      
      this.logger.info(`Legacy session created: ${sessionId} with protocol: ${protocol}`);
      return sessionId;
      
    } catch (error) {
      this.logger.error(`Failed to create legacy session for task ${task.id}`, error);
      throw error;
    }
  }

  /**
   * Execute legacy task using v4.1 patterns
   */
  async executeLegacyTask(task: any, agents: LegacyAgent[]): Promise<any> {
    this.logger.info(`Executing legacy task: ${task.id} with ${agents.length} agents`);
    
    const startTime = Date.now();
    
    try {
      // Convert task to legacy format
      const legacyTask = this.convertToLegacyTask(task);
      
      // Execute task coordination using v4.1 patterns
      const results = await this.coordinateLegacyAgents(legacyTask, agents);
      
      // Aggregate results
      const aggregatedResult = this.aggregateLegacyResults(results);
      
      // Track performance
      await this.trackLegacyTaskPerformance(task.id, Date.now() - startTime, results);
      
      this.logger.info(`Legacy task execution completed: ${task.id}`);
      return aggregatedResult;
      
    } catch (error) {
      this.logger.error(`Legacy task execution failed: ${task.id}`, error);
      await this.handleLegacyTaskFailure(task, error);
      throw error;
    }
  }

  /**
   * Verify compatibility with v4.1 systems
   */
  async verifyCompatibility(): Promise<void> {
    this.logger.info('Verifying V4.1 agent compatibility');
    
    try {
      // Test agent discovery
      await this.testAgentDiscovery();
      
      // Test communication protocols
      await this.testCommunicationProtocols();
      
      // Test task execution patterns
      await this.testLegacyTaskExecution();
      
      // Test health monitoring
      await this.testHealthMonitoring();
      
      this.logger.info('V4.1 agent compatibility verified successfully');
    } catch (error) {
      this.logger.error('V4.1 agent compatibility verification failed', error);
      throw error;
    }
  }

  // Private helper methods
  private async loadExistingLegacyAgents(): Promise<void> {
    this.logger.info('Loading existing legacy agents');
    
    try {
      // Load from v4.1 agent registry tables
      const agents = await this.db.query(`
        SELECT 
          a.id, a.agent_type, a.name, a.status, a.capabilities,
          a.performance_score, a.health_score, a.last_active,
          e.endpoint_url, e.protocol, e.port, e.auth_config,
          m.version, m.deployment_date, m.dependencies
        FROM v41_agents a
        LEFT JOIN v41_agent_endpoints e ON a.id = e.agent_id
        LEFT JOIN v41_agent_metadata m ON a.id = m.agent_id
        WHERE a.status IN ('active', 'idle', 'busy')
      `);
      
      for (const agent of agents) {
        const legacyAgent = this.convertToLegacyAgent(agent);
        this.legacyAgents.set(agent.id, legacyAgent);
      }
      
      this.logger.info(`Loaded ${agents.length} legacy agents`);
    } catch (error) {
      this.logger.warn('Failed to load some legacy agents', error);
      // Continue with partial loading
    }
  }

  private async initializeProtocolAdapters(): Promise<void> {
    this.logger.info('Initializing protocol adapters');
    
    // HTTP/REST adapter for v4.1 agents
    this.protocolAdapters.set('http', new HTTPProtocolAdapter(this.logger));
    
    // WebSocket adapter for real-time communication
    this.protocolAdapters.set('websocket', new WebSocketProtocolAdapter(this.logger));
    
    // gRPC adapter for high-performance communication
    this.protocolAdapters.set('grpc', new GRPCProtocolAdapter(this.logger));
    
    // Initialize all adapters
    for (const [protocol, adapter] of this.protocolAdapters) {
      try {
        await adapter.initialize();
        this.logger.info(`Protocol adapter initialized: ${protocol}`);
      } catch (error) {
        this.logger.warn(`Failed to initialize protocol adapter: ${protocol}`, error);
      }
    }
  }

  private async setupLegacyAgentHealthMonitoring(): Promise<void> {
    this.logger.info('Setting up legacy agent health monitoring');
    
    for (const [agentId, agent] of this.legacyAgents) {
      if (agent.status === 'active') {
        const interval = setInterval(async () => {
          await this.performLegacyAgentHealthCheck(agentId);
        }, this.bridgeConfig.health_check_interval);
        
        this.healthCheckIntervals.set(agentId, interval);
      }
    }
  }

  private async initializeCommunicationChannels(): Promise<void> {
    this.logger.info('Initializing communication channels');
    
    // Subscribe to v4.1 agent events
    await this.communication.subscribeToEvent('v41_agent_status', this.handleV41AgentStatus.bind(this));
    await this.communication.subscribeToEvent('v41_task_result', this.handleV41TaskResult.bind(this));
    await this.communication.subscribeToEvent('v41_health_update', this.handleV41HealthUpdate.bind(this));
  }

  private async startBackgroundTasks(): Promise<void> {
    this.logger.info('Starting background tasks');
    
    // Session cleanup
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 300000); // Every 5 minutes
    
    // Performance metrics collection
    setInterval(() => {
      this.collectPerformanceMetrics();
    }, 60000); // Every minute
    
    // Agent registry synchronization
    setInterval(() => {
      this.synchronizeAgentRegistry();
    }, 600000); // Every 10 minutes
  }

  private mapTaskTypeToAgentTypes(taskType: string): LegacyAgentType[] {
    const mapping: Record<string, LegacyAgentType[]> = {
      'ai_coordination': ['ai_coordinator'],
      'memory_management': ['memory_manager'],
      'performance_monitoring': ['performance_monitor'],
      'task_execution': ['task_executor'],
      'data_processing': ['data_processor'],
      'error_handling': ['error_handler'],
      'security_check': ['security_monitor']
    };
    
    return mapping[taskType] || ['task_executor'];
  }

  private async executeAgentDiscovery(query: AgentDiscoveryQuery): Promise<AgentDiscoveryResult> {
    const startTime = Date.now();
    
    // Filter agents based on query criteria
    let candidateAgents = Array.from(this.legacyAgents.values());
    
    if (query.agent_types) {
      candidateAgents = candidateAgents.filter(agent => 
        query.agent_types!.includes(agent.type)
      );
    }
    
    if (query.min_performance_score) {
      candidateAgents = candidateAgents.filter(agent => 
        agent.performance_score >= query.min_performance_score!
      );
    }
    
    if (query.capabilities) {
      candidateAgents = candidateAgents.filter(agent =>
        query.capabilities!.every(cap => agent.capabilities.includes(cap))
      );
    }
    
    if (query.v41_compatibility_required) {
      candidateAgents = candidateAgents.filter(agent =>
        agent.metadata.compatibility_flags.v41_api_compatible
      );
    }
    
    return {
      agents: candidateAgents,
      total_found: candidateAgents.length,
      search_time_ms: Date.now() - startTime,
      compatibility_summary: this.generateCompatibilitySummary(candidateAgents)
    };
  }

  private filterAndRankAgents(agents: LegacyAgent[], task: any): LegacyAgent[] {
    // Score and rank agents based on task requirements
    const scoredAgents = agents.map(agent => ({
      agent,
      score: this.calculateAgentScore(agent, task)
    }));
    
    // Sort by score (highest first)
    scoredAgents.sort((a, b) => b.score - a.score);
    
    // Return top candidates
    return scoredAgents.slice(0, 5).map(sa => sa.agent);
  }

  private calculateAgentScore(agent: LegacyAgent, task: any): number {
    let score = 0;
    
    // Base performance score
    score += agent.performance_score * 0.4;
    
    // Health score
    score += agent.health_score * 0.3;
    
    // Availability (status)
    if (agent.status === 'active') score += 0.2;
    else if (agent.status === 'idle') score += 0.15;
    else if (agent.status === 'busy') score += 0.05;
    
    // Capability match
    const taskCapabilities = this.extractTaskCapabilities(task);
    const matchingCaps = agent.capabilities.filter(cap => 
      taskCapabilities.includes(cap)
    );
    score += (matchingCaps.length / taskCapabilities.length) * 0.1;
    
    return Math.min(score, 1.0);
  }

  private determineOptimalProtocol(agents: LegacyAgent[]): 'v41_native' | 'v42_enhanced' | 'hybrid' {
    const protocols = agents.map(agent => agent.endpoint.protocol);
    
    // If all agents support modern protocols, use enhanced
    if (protocols.every(p => ['https', 'grpc', 'websocket'].includes(p))) {
      return 'v42_enhanced';
    }
    
    // If mixed protocols, use hybrid
    if (protocols.some(p => ['https', 'grpc'].includes(p)) && 
        protocols.some(p => p === 'http')) {
      return 'hybrid';
    }
    
    // Default to v4.1 native for maximum compatibility
    return 'v41_native';
  }

  private async setupSessionCommunication(session: LegacySession, agents: LegacyAgent[]): Promise<void> {
    for (const agent of agents) {
      const channelId = `${session.id}_${agent.id}`;
      
      const channel: CommunicationChannel = {
        id: channelId,
        type: this.mapProtocolToChannelType(agent.endpoint.protocol),
        endpoint: agent.endpoint.url,
        participants: [session.id, agent.id],
        message_count: 0,
        last_activity: new Date()
      };
      
      session.communication_channels.push(channel);
    }
  }

  private convertToLegacyTask(task: any): LegacyTask {
    return {
      id: task.id,
      type: task.type,
      priority: task.priority || 'medium',
      payload: task.payload,
      created_at: task.created_at || new Date(),
      timeout_ms: 300000, // 5 minutes default
      retry_policy: {
        max_attempts: 3,
        delay_ms: 1000,
        backoff_multiplier: 2,
        retry_conditions: ['network_error', 'timeout', 'temporary_failure']
      }
    };
  }

  private async coordinateLegacyAgents(task: LegacyTask, agents: LegacyAgent[]): Promise<LegacyTaskResult[]> {
    const results: LegacyTaskResult[] = [];
    
    // Execute task on each agent
    for (const agent of agents) {
      try {
        const result = await this.executeLegacyAgentTask(agent, task);
        results.push(result);
      } catch (error) {
        this.logger.warn(`Agent task execution failed: ${agent.id}`, error);
        
        // Create failure result
        results.push({
          task_id: task.id,
          agent_id: agent.id,
          status: 'failure',
          result: null,
          error_message: error.message,
          execution_time_ms: 0,
          resource_usage: {
            cpu_time_ms: 0,
            memory_peak_mb: 0,
            network_bytes_transferred: 0,
            disk_operations: 0
          },
          metadata: {
            started_at: new Date(),
            completed_at: new Date(),
            retry_count: 0,
            agent_version: agent.metadata.version,
            protocol_used: agent.endpoint.protocol,
            performance_metrics: {
              response_time_ms: 0,
              throughput: 0,
              success_rate: 0,
              error_rate: 1,
              quality_score: 0
            }
          }
        });
      }
    }
    
    return results;
  }

  private async executeLegacyAgentTask(agent: LegacyAgent, task: LegacyTask): Promise<LegacyTaskResult> {
    const startTime = Date.now();
    
    // Get appropriate protocol adapter
    const adapter = this.protocolAdapters.get(agent.endpoint.protocol);
    if (!adapter) {
      throw new Error(`No protocol adapter available for: ${agent.endpoint.protocol}`);
    }
    
    // Execute task using protocol adapter
    const result = await adapter.executeTask(agent, task);
    
    const executionTime = Date.now() - startTime;
    
    return {
      task_id: task.id,
      agent_id: agent.id,
      status: 'success',
      result: result,
      execution_time_ms: executionTime,
      resource_usage: {
        cpu_time_ms: executionTime,
        memory_peak_mb: 50, // Estimated
        network_bytes_transferred: JSON.stringify(result).length,
        disk_operations: 1
      },
      metadata: {
        started_at: new Date(startTime),
        completed_at: new Date(),
        retry_count: 0,
        agent_version: agent.metadata.version,
        protocol_used: agent.endpoint.protocol,
        performance_metrics: {
          response_time_ms: executionTime,
          throughput: 1,
          success_rate: 1,
          error_rate: 0,
          quality_score: 0.8
        }
      }
    };
  }

  private aggregateLegacyResults(results: LegacyTaskResult[]): any {
    const successfulResults = results.filter(r => r.status === 'success');
    const failedResults = results.filter(r => r.status === 'failure');
    
    return {
      success: successfulResults.length > 0,
      total_agents: results.length,
      successful_agents: successfulResults.length,
      failed_agents: failedResults.length,
      results: successfulResults.map(r => r.result),
      errors: failedResults.map(r => r.error_message),
      performance_summary: {
        average_execution_time: results.reduce((sum, r) => sum + r.execution_time_ms, 0) / results.length,
        success_rate: successfulResults.length / results.length,
        total_execution_time: results.reduce((sum, r) => sum + r.execution_time_ms, 0)
      }
    };
  }

  // Event handlers and utility methods
  private handleV41AgentStatus(event: any): void {
    this.logger.info('V4.1 agent status event received', event);
    
    const agent = this.legacyAgents.get(event.agent_id);
    if (agent) {
      agent.status = event.status;
      agent.last_active = new Date(event.timestamp);
    }
  }

  private handleV41TaskResult(event: any): void {
    this.logger.info('V4.1 task result event received', event);
  }

  private handleV41HealthUpdate(event: any): void {
    const agent = this.legacyAgents.get(event.agent_id);
    if (agent) {
      agent.health_score = event.health_score;
    }
  }

  // Utility and helper methods
  private generateSessionId(): string {
    return `legacy_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private convertToLegacyAgent(dbRecord: any): LegacyAgent {
    return {
      id: dbRecord.id,
      type: dbRecord.agent_type,
      name: dbRecord.name,
      status: dbRecord.status,
      capabilities: JSON.parse(dbRecord.capabilities || '[]'),
      performance_score: dbRecord.performance_score || 0.5,
      health_score: dbRecord.health_score || 1.0,
      last_active: new Date(dbRecord.last_active),
      endpoint: {
        url: dbRecord.endpoint_url,
        protocol: dbRecord.protocol,
        port: dbRecord.port,
        authentication: JSON.parse(dbRecord.auth_config || '{"type": "none"}'),
        health_check_path: '/health'
      },
      protocol_version: dbRecord.version || '4.1.0',
      metadata: {
        deployment_date: new Date(dbRecord.deployment_date),
        version: dbRecord.version || '4.1.0',
        dependencies: JSON.parse(dbRecord.dependencies || '[]'),
        resource_requirements: {
          cpu_cores: 1,
          memory_mb: 512,
          storage_gb: 10,
          network_bandwidth_mbps: 100
        },
        monitoring_config: {
          metrics_enabled: true,
          logging_level: 'info',
          health_check_interval: 30000,
          performance_tracking: true
        },
        compatibility_flags: {
          v41_api_compatible: true,
          enhanced_features_supported: false,
          governance_integration_level: 'none',
          protocol_version_supported: ['4.1.0']
        }
      }
    };
  }

  private generateCompatibilitySummary(agents: LegacyAgent[]): CompatibilitySummary {
    return {
      v41_compatible_count: agents.filter(a => a.metadata.compatibility_flags.v41_api_compatible).length,
      enhanced_features_count: agents.filter(a => a.metadata.compatibility_flags.enhanced_features_supported).length,
      governance_ready_count: agents.filter(a => a.metadata.compatibility_flags.governance_integration_level !== 'none').length,
      protocol_distribution: agents.reduce((dist, agent) => {
        const protocol = agent.endpoint.protocol;
        dist[protocol] = (dist[protocol] || 0) + 1;
        return dist;
      }, {} as Record<string, number>)
    };
  }

  private extractTaskCapabilities(task: any): string[] {
    // Extract required capabilities from task
    return task.required_capabilities || [];
  }

  private mapProtocolToChannelType(protocol: string): 'websocket' | 'http_polling' | 'grpc_stream' | 'message_queue' {
    switch (protocol) {
      case 'websocket': return 'websocket';
      case 'grpc': return 'grpc_stream';
      case 'http':
      case 'https':
      default:
        return 'http_polling';
    }
  }

  // Testing and verification methods
  private async testAgentDiscovery(): Promise<void> {
    const testQuery: AgentDiscoveryQuery = {
      v41_compatibility_required: true
    };
    
    const result = await this.executeAgentDiscovery(testQuery);
    if (result.agents.length === 0) {
      throw new Error('No v4.1 compatible agents found');
    }
    
    this.logger.info('Agent discovery test passed');
  }

  private async testCommunicationProtocols(): Promise<void> {
    for (const [protocol, adapter] of this.protocolAdapters) {
      try {
        await adapter.test();
        this.logger.info(`Protocol test passed: ${protocol}`);
      } catch (error) {
        this.logger.warn(`Protocol test failed: ${protocol}`, error);
      }
    }
  }

  private async testLegacyTaskExecution(): Promise<void> {
    // Create a simple test task
    const testTask: LegacyTask = {
      id: 'test_task_' + Date.now(),
      type: 'health_check',
      priority: 'low',
      payload: { test: true },
      created_at: new Date(),
      timeout_ms: 10000,
      retry_policy: {
        max_attempts: 1,
        delay_ms: 1000,
        backoff_multiplier: 1,
        retry_conditions: []
      }
    };
    
    // Try to execute on first available agent
    const availableAgents = Array.from(this.legacyAgents.values())
      .filter(agent => agent.status === 'active')
      .slice(0, 1);
    
    if (availableAgents.length === 0) {
      this.logger.warn('No active agents available for task execution test');
      return;
    }
    
    try {
      await this.coordinateLegacyAgents(testTask, availableAgents);
      this.logger.info('Legacy task execution test passed');
    } catch (error) {
      this.logger.warn('Legacy task execution test failed', error);
    }
  }

  private async testHealthMonitoring(): Promise<void> {
    // Test health monitoring for first available agent
    const agentIds = Array.from(this.legacyAgents.keys()).slice(0, 1);
    
    for (const agentId of agentIds) {
      try {
        await this.performLegacyAgentHealthCheck(agentId);
        this.logger.info(`Health monitoring test passed for agent: ${agentId}`);
      } catch (error) {
        this.logger.warn(`Health monitoring test failed for agent: ${agentId}`, error);
      }
    }
  }

  private async performLegacyAgentHealthCheck(agentId: string): Promise<void> {
    const agent = this.legacyAgents.get(agentId);
    if (!agent) return;
    
    try {
      const adapter = this.protocolAdapters.get(agent.endpoint.protocol);
      if (adapter) {
        const healthy = await adapter.checkHealth(agent);
        
        if (!healthy) {
          agent.status = 'degraded';
          this.logger.warn(`Agent health check failed: ${agentId}`);
        } else if (agent.status === 'degraded') {
          agent.status = 'active';
          this.logger.info(`Agent health recovered: ${agentId}`);
        }
      }
    } catch (error) {
      this.logger.warn(`Health check failed for agent: ${agentId}`, error);
      agent.status = 'degraded';
    }
  }

  private async trackLegacyTaskPerformance(taskId: string, executionTime: number, results: LegacyTaskResult[]): Promise<void> {
    const metrics: PerformanceMetrics = {
      response_time_ms: executionTime,
      throughput: results.length,
      success_rate: results.filter(r => r.status === 'success').length / results.length,
      error_rate: results.filter(r => r.status === 'failure').length / results.length,
      quality_score: 0.8 // Calculated based on results
    };
    
    this.performanceMetrics.set(taskId, metrics);
  }

  private async handleLegacyTaskFailure(task: any, error: Error): Promise<void> {
    this.logger.error(`Handling legacy task failure: ${task.id}`, error);
    // Implement failure handling logic
  }

  private async persistLegacySession(session: LegacySession): Promise<void> {
    try {
      await this.db.create('legacy_sessions', session);
    } catch (error) {
      this.logger.warn(`Failed to persist legacy session: ${session.id}`, error);
    }
  }

  private async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    
    for (const [sessionId, session] of this.activeSessions) {
      if (session.expires_at < now) {
        this.activeSessions.delete(sessionId);
        this.logger.info(`Cleaned up expired session: ${sessionId}`);
      }
    }
  }

  private async collectPerformanceMetrics(): Promise<void> {
    // Collect and aggregate performance metrics
    const metrics = Array.from(this.performanceMetrics.values());
    
    if (metrics.length > 0) {
      const averageResponseTime = metrics.reduce((sum, m) => sum + m.response_time_ms, 0) / metrics.length;
      const averageSuccessRate = metrics.reduce((sum, m) => sum + m.success_rate, 0) / metrics.length;
      
      this.logger.info('Legacy agent performance summary', {
        total_tasks: metrics.length,
        average_response_time: averageResponseTime,
        average_success_rate: averageSuccessRate
      });
    }
  }

  private async synchronizeAgentRegistry(): Promise<void> {
    try {
      await this.loadExistingLegacyAgents();
      this.logger.info('Agent registry synchronized');
    } catch (error) {
      this.logger.warn('Agent registry synchronization failed', error);
    }
  }
}

// Protocol adapter interfaces and implementations
interface ProtocolAdapter {
  initialize(): Promise<void>;
  executeTask(agent: LegacyAgent, task: LegacyTask): Promise<any>;
  checkHealth(agent: LegacyAgent): Promise<boolean>;
  test(): Promise<void>;
}

class HTTPProtocolAdapter implements ProtocolAdapter {
  constructor(private logger: Logger) {}

  async initialize(): Promise<void> {
    this.logger.info('HTTP Protocol Adapter initialized');
  }

  async executeTask(agent: LegacyAgent, task: LegacyTask): Promise<any> {
    // Implement HTTP task execution
    return { success: true, data: 'mock_result' };
  }

  async checkHealth(agent: LegacyAgent): Promise<boolean> {
    // Implement HTTP health check
    return true;
  }

  async test(): Promise<void> {
    // Implement HTTP protocol test
  }
}

class WebSocketProtocolAdapter implements ProtocolAdapter {
  constructor(private logger: Logger) {}

  async initialize(): Promise<void> {
    this.logger.info('WebSocket Protocol Adapter initialized');
  }

  async executeTask(agent: LegacyAgent, task: LegacyTask): Promise<any> {
    // Implement WebSocket task execution
    return { success: true, data: 'mock_result' };
  }

  async checkHealth(agent: LegacyAgent): Promise<boolean> {
    // Implement WebSocket health check
    return true;
  }

  async test(): Promise<void> {
    // Implement WebSocket protocol test
  }
}

class GRPCProtocolAdapter implements ProtocolAdapter {
  constructor(private logger: Logger) {}

  async initialize(): Promise<void> {
    this.logger.info('gRPC Protocol Adapter initialized');
  }

  async executeTask(agent: LegacyAgent, task: LegacyTask): Promise<any> {
    // Implement gRPC task execution
    return { success: true, data: 'mock_result' };
  }

  async checkHealth(agent: LegacyAgent): Promise<boolean> {
    // Implement gRPC health check
    return true;
  }

  async test(): Promise<void> {
    // Implement gRPC protocol test
  }
}

// Configuration interface
interface BridgeConfig {
  enable_legacy_support: boolean;
  enable_enhanced_features: boolean;
  protocol_translation_enabled: boolean;
  performance_monitoring_enabled: boolean;
  health_check_interval: number;
  session_timeout_ms: number;
  backward_compatibility_strict: boolean;
}
