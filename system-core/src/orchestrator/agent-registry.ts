/**
 * TrustStream v4.2 - Agent Registry
 * 
 * Service registry for governance agents with dynamic discovery,
 * capability matching, and health monitoring.
 * 
 * Based on existing TrustStream agent discovery patterns.
 */

import { DatabaseInterface } from '../shared-utils/database-interface';
import { AgentCommunication } from '../shared-utils/agent-communication';
import { Logger } from '../shared-utils/logger';
import { GovernanceAgent, GovernanceAgentType, AgentStatus, AgentConfig } from './governance-orchestrator';

// Core registry interfaces
export interface AgentRegistration {
  agent: GovernanceAgent;
  registration_time: Date;
  last_heartbeat: Date;
  endpoint_url: string;
  api_version: string;
  metadata: RegistrationMetadata;
}

export interface RegistrationMetadata {
  deployment_environment: 'development' | 'staging' | 'production';
  container_id?: string;
  host_name: string;
  port: number;
  protocol: 'http' | 'https' | 'grpc' | 'websocket';
  supported_formats: string[];
  rate_limits: RateLimitConfig;
  resource_requirements: ResourceRequirements;
  dependencies: string[];
}

export interface RateLimitConfig {
  requests_per_minute: number;
  concurrent_requests: number;
  burst_capacity: number;
  throttle_strategy: 'queue' | 'reject' | 'circuit_breaker';
}

export interface ResourceRequirements {
  min_memory_mb: number;
  min_cpu_cores: number;
  disk_space_mb: number;
  network_bandwidth_mbps: number;
  gpu_required: boolean;
}

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  input_schema: any;
  output_schema: any;
  performance_metrics: CapabilityMetrics;
  governance_domain: GovernanceAgentType;
  complexity_level: 'simple' | 'moderate' | 'complex' | 'expert';
  execution_time_estimate_ms: number;
  quality_guarantees: QualityGuarantee[];
}

export interface CapabilityMetrics {
  average_response_time_ms: number;
  success_rate: number;
  throughput_per_hour: number;
  quality_score: number;
  reliability_score: number;
  last_updated: Date;
}

export interface QualityGuarantee {
  metric: string;
  threshold: number;
  unit: string;
  sla_level: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface AgentDiscoveryQuery {
  agent_types?: GovernanceAgentType[];
  capabilities?: string[];
  min_performance_score?: number;
  min_trust_score?: number;
  max_response_time_ms?: number;
  availability_requirement?: 'best_effort' | 'high' | 'guaranteed';
  geographic_preference?: string;
  compliance_requirements?: string[];
  load_balancing_strategy?: LoadBalancingStrategy;
}

export type LoadBalancingStrategy = 
  | 'round_robin'
  | 'least_connections'
  | 'weighted_performance'
  | 'geographic_proximity'
  | 'resource_aware';

export interface AgentDiscoveryResult {
  agents: AgentMatch[];
  total_found: number;
  query_time_ms: number;
  recommendations: AgentRecommendation[];
}

export interface AgentMatch {
  agent: GovernanceAgent;
  registration: AgentRegistration;
  match_score: number;
  match_reasons: string[];
  estimated_availability: Date;
  current_load: number;
}

export interface AgentRecommendation {
  type: 'performance' | 'cost' | 'availability' | 'quality';
  agent_id: string;
  reason: string;
  confidence: number;
}

export interface HealthCheckConfig {
  enabled: boolean;
  interval_seconds: number;
  timeout_seconds: number;
  failure_threshold: number;
  recovery_threshold: number;
  endpoint_path: string;
  expected_response_codes: number[];
  custom_checks: CustomHealthCheck[];
}

export interface CustomHealthCheck {
  name: string;
  type: 'database' | 'memory' | 'cpu' | 'disk' | 'network' | 'custom';
  threshold: number;
  unit: string;
  critical: boolean;
}

export interface AgentMetrics {
  agent_id: string;
  timestamp: Date;
  performance_metrics: PerformanceMetrics;
  resource_metrics: ResourceMetrics;
  business_metrics: BusinessMetrics;
}

export interface PerformanceMetrics {
  requests_per_minute: number;
  average_response_time_ms: number;
  error_rate: number;
  success_rate: number;
  queue_depth: number;
  active_connections: number;
}

export interface ResourceMetrics {
  cpu_usage_percent: number;
  memory_usage_mb: number;
  memory_usage_percent: number;
  disk_usage_percent: number;
  network_io_mbps: number;
  gpu_usage_percent?: number;
}

export interface BusinessMetrics {
  tasks_completed: number;
  tasks_failed: number;
  quality_score: number;
  user_satisfaction: number;
  cost_per_request: number;
  revenue_generated: number;
}

/**
 * AgentRegistry
 * 
 * Service registry for governance agents with dynamic discovery and health monitoring.
 * Based on existing TrustStream agent discovery service patterns.
 */
export class AgentRegistry {
  private db: DatabaseInterface;
  private communication: AgentCommunication;
  private logger: Logger;
  private registeredAgents: Map<string, AgentRegistration> = new Map();
  private agentCapabilities: Map<string, AgentCapability[]> = new Map();
  private healthCheckConfigs: Map<string, HealthCheckConfig> = new Map();
  private metrics: Map<string, AgentMetrics> = new Map();
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    db: DatabaseInterface,
    communication: AgentCommunication,
    logger: Logger
  ) {
    this.db = db;
    this.communication = communication;
    this.logger = logger;
  }

  /**
   * Initialize the agent registry
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Agent Registry');
    
    try {
      await this.loadExistingRegistrations();
      await this.loadAgentCapabilities();
      await this.setupHealthMonitoring();
      await this.startPeriodicTasks();
      
      this.logger.info('Agent Registry initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Agent Registry', error);
      throw error;
    }
  }

  /**
   * Register a new governance agent
   */
  async registerAgent(
    agent: GovernanceAgent,
    endpointUrl: string,
    metadata: RegistrationMetadata
  ): Promise<AgentRegistration> {
    this.logger.info(`Registering agent: ${agent.id}`, { type: agent.type });
    
    try {
      // Validate agent configuration
      await this.validateAgentConfig(agent, metadata);
      
      // Perform initial health check
      const healthCheckResult = await this.performHealthCheck(agent.id, endpointUrl);
      if (!healthCheckResult.healthy) {
        throw new Error(`Agent failed initial health check: ${healthCheckResult.error}`);
      }
      
      // Create registration record
      const registration: AgentRegistration = {
        agent,
        registration_time: new Date(),
        last_heartbeat: new Date(),
        endpoint_url: endpointUrl,
        api_version: metadata.supported_formats[0] || '1.0',
        metadata
      };
      
      // Store in memory and database
      this.registeredAgents.set(agent.id, registration);
      await this.persistAgentRegistration(registration);
      
      // Set up health monitoring for this agent
      await this.setupAgentHealthMonitoring(agent.id);
      
      // Load agent capabilities
      await this.loadAgentCapabilitiesForAgent(agent.id);
      
      // Notify other components about new agent
      await this.communication.publishEvent({
        type: 'agent_registered',
        agent_id: agent.id,
        agent_type: agent.type,
        capabilities: this.agentCapabilities.get(agent.id) || [],
        timestamp: new Date()
      });
      
      this.logger.info(`Agent registered successfully: ${agent.id}`);
      return registration;
      
    } catch (error) {
      this.logger.error(`Failed to register agent: ${agent.id}`, error);
      throw error;
    }
  }

  /**
   * Discover agents based on query criteria
   */
  async discoverAgents(query: AgentDiscoveryQuery): Promise<AgentDiscoveryResult> {
    const startTime = Date.now();
    this.logger.info('Discovering agents', query);
    
    try {
      // Filter agents by basic criteria
      let candidateAgents = Array.from(this.registeredAgents.values()).filter(registration => {
        const agent = registration.agent;
        
        // Filter by agent types
        if (query.agent_types && !query.agent_types.includes(agent.type)) {
          return false;
        }
        
        // Filter by performance score
        if (query.min_performance_score && agent.performance_score < query.min_performance_score) {
          return false;
        }
        
        // Filter by trust score
        if (query.min_trust_score && agent.trust_score < query.min_trust_score) {
          return false;
        }
        
        // Filter by agent status
        if (!['active', 'busy'].includes(agent.status)) {
          return false;
        }
        
        return true;
      });
      
      // Filter by capabilities
      if (query.capabilities && query.capabilities.length > 0) {
        candidateAgents = candidateAgents.filter(registration => {
          const agentCapabilities = this.agentCapabilities.get(registration.agent.id) || [];
          return query.capabilities!.every(requiredCap => 
            agentCapabilities.some(cap => cap.name === requiredCap)
          );
        });
      }
      
      // Score and rank agents
      const scoredMatches = candidateAgents.map(registration => {
        const match: AgentMatch = {
          agent: registration.agent,
          registration,
          match_score: this.calculateMatchScore(registration, query),
          match_reasons: this.generateMatchReasons(registration, query),
          estimated_availability: this.estimateAvailability(registration),
          current_load: this.getCurrentLoad(registration.agent.id)
        };
        return match;
      });
      
      // Sort by match score
      scoredMatches.sort((a, b) => b.match_score - a.match_score);
      
      // Apply load balancing strategy
      const balancedMatches = await this.applyLoadBalancing(scoredMatches, query.load_balancing_strategy || 'weighted_performance');
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(scoredMatches, query);
      
      const result: AgentDiscoveryResult = {
        agents: balancedMatches,
        total_found: scoredMatches.length,
        query_time_ms: Date.now() - startTime,
        recommendations
      };
      
      this.logger.info(`Agent discovery completed: ${result.total_found} agents found in ${result.query_time_ms}ms`);
      return result;
      
    } catch (error) {
      this.logger.error('Agent discovery failed', error);
      throw error;
    }
  }

  /**
   * Update agent status and metrics
   */
  async updateAgentStatus(agentId: string, status: AgentStatus, metrics?: Partial<AgentMetrics>): Promise<void> {
    const registration = this.registeredAgents.get(agentId);
    if (!registration) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    
    const oldStatus = registration.agent.status;
    registration.agent.status = status;
    registration.last_heartbeat = new Date();
    
    // Update metrics if provided
    if (metrics) {
      const currentMetrics = this.metrics.get(agentId) || this.createDefaultMetrics(agentId);
      Object.assign(currentMetrics, metrics, { timestamp: new Date() });
      this.metrics.set(agentId, currentMetrics);
    }
    
    // Persist updates
    await this.updateAgentRegistration(registration);
    
    // Notify status change
    if (oldStatus !== status) {
      await this.communication.publishEvent({
        type: 'agent_status_change',
        agent_id: agentId,
        old_status: oldStatus,
        new_status: status,
        timestamp: new Date()
      });
    }
    
    this.logger.info(`Agent status updated: ${agentId} -> ${status}`);
  }

  /**
   * Deregister an agent
   */
  async deregisterAgent(agentId: string, reason: string): Promise<void> {
    this.logger.info(`Deregistering agent: ${agentId}`, { reason });
    
    const registration = this.registeredAgents.get(agentId);
    if (!registration) {
      this.logger.warn(`Attempted to deregister unknown agent: ${agentId}`);
      return;
    }
    
    try {
      // Stop health monitoring
      const healthCheckInterval = this.healthCheckIntervals.get(agentId);
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
        this.healthCheckIntervals.delete(agentId);
      }
      
      // Remove from memory
      this.registeredAgents.delete(agentId);
      this.agentCapabilities.delete(agentId);
      this.metrics.delete(agentId);
      
      // Update database
      await this.db.update('governance_agents', agentId, { 
        status: 'offline',
        deregistered_at: new Date(),
        deregistration_reason: reason
      });
      
      // Notify deregistration
      await this.communication.publishEvent({
        type: 'agent_deregistered',
        agent_id: agentId,
        reason,
        timestamp: new Date()
      });
      
      this.logger.info(`Agent deregistered successfully: ${agentId}`);
      
    } catch (error) {
      this.logger.error(`Failed to deregister agent: ${agentId}`, error);
      throw error;
    }
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): AgentRegistration | null {
    return this.registeredAgents.get(agentId) || null;
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): AgentRegistration[] {
    return Array.from(this.registeredAgents.values());
  }

  /**
   * Get agents by type
   */
  getAgentsByType(agentType: GovernanceAgentType): AgentRegistration[] {
    return Array.from(this.registeredAgents.values())
      .filter(registration => registration.agent.type === agentType);
  }

  /**
   * Get agent capabilities
   */
  getAgentCapabilities(agentId: string): AgentCapability[] {
    return this.agentCapabilities.get(agentId) || [];
  }

  /**
   * Get agent metrics
   */
  getAgentMetrics(agentId: string): AgentMetrics | null {
    return this.metrics.get(agentId) || null;
  }

  // Private helper methods
  private async loadExistingRegistrations(): Promise<void> {
    const registrations = await this.db.query<any>(
      'SELECT * FROM agent_registrations WHERE status != $1',
      ['deregistered']
    );
    
    for (const reg of registrations) {
      // Convert database record to AgentRegistration
      const registration = this.convertDbToRegistration(reg);
      this.registeredAgents.set(registration.agent.id, registration);
    }
  }

  private async loadAgentCapabilities(): Promise<void> {
    const capabilities = await this.db.query<any>(
      'SELECT * FROM agent_capabilities'
    );
    
    for (const cap of capabilities) {
      const agentId = cap.agent_id;
      if (!this.agentCapabilities.has(agentId)) {
        this.agentCapabilities.set(agentId, []);
      }
      this.agentCapabilities.get(agentId)!.push(this.convertDbToCapability(cap));
    }
  }

  private async setupHealthMonitoring(): Promise<void> {
    for (const [agentId, registration] of this.registeredAgents) {
      await this.setupAgentHealthMonitoring(agentId);
    }
  }

  private async setupAgentHealthMonitoring(agentId: string): Promise<void> {
    const healthConfig = this.healthCheckConfigs.get(agentId) || this.getDefaultHealthConfig();
    
    if (healthConfig.enabled) {
      const interval = setInterval(async () => {
        await this.performPeriodicHealthCheck(agentId);
      }, healthConfig.interval_seconds * 1000);
      
      this.healthCheckIntervals.set(agentId, interval);
    }
  }

  private async startPeriodicTasks(): Promise<void> {
    // Cleanup stale registrations
    setInterval(() => {
      this.cleanupStaleRegistrations();
    }, 300000); // Every 5 minutes
    
    // Update agent metrics
    setInterval(() => {
      this.updateAgentMetrics();
    }, 60000); // Every minute
  }

  private async validateAgentConfig(agent: GovernanceAgent, metadata: RegistrationMetadata): Promise<void> {
    // Validate agent configuration
    if (!agent.id || !agent.type || !agent.name) {
      throw new Error('Agent must have id, type, and name');
    }
    
    if (!metadata.host_name || !metadata.port) {
      throw new Error('Agent metadata must include host_name and port');
    }
    
    // Check if agent is already registered
    if (this.registeredAgents.has(agent.id)) {
      throw new Error(`Agent already registered: ${agent.id}`);
    }
  }

  private async performHealthCheck(agentId: string, endpointUrl: string): Promise<{healthy: boolean, error?: string}> {
    try {
      // Perform HTTP health check
      const response = await fetch(`${endpointUrl}/health`, {
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
        return { healthy: true };
      } else {
        return { healthy: false, error: `HTTP ${response.status}` };
      }
      
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  private async performPeriodicHealthCheck(agentId: string): Promise<void> {
    const registration = this.registeredAgents.get(agentId);
    if (!registration) return;
    
    const healthResult = await this.performHealthCheck(agentId, registration.endpoint_url);
    
    if (!healthResult.healthy) {
      this.logger.warn(`Health check failed for agent: ${agentId}`, { error: healthResult.error });
      
      // Update agent status based on failure
      if (registration.agent.status === 'active') {
        await this.updateAgentStatus(agentId, 'degraded');
      } else if (registration.agent.status === 'degraded') {
        await this.updateAgentStatus(agentId, 'offline');
      }
    } else {
      // Agent is healthy, update status if needed
      if (registration.agent.status === 'degraded') {
        await this.updateAgentStatus(agentId, 'active');
      }
    }
  }

  private calculateMatchScore(registration: AgentRegistration, query: AgentDiscoveryQuery): number {
    const agent = registration.agent;
    let score = 0;
    
    // Base score from agent performance
    score += agent.performance_score * 0.3;
    score += agent.trust_score * 0.2;
    score += agent.health_score * 0.2;
    
    // Availability bonus
    if (agent.status === 'active') {
      score += 0.2;
    } else if (agent.status === 'busy') {
      score += 0.1;
    }
    
    // Capability match bonus
    if (query.capabilities) {
      const agentCaps = this.agentCapabilities.get(agent.id) || [];
      const matchedCaps = query.capabilities.filter(reqCap => 
        agentCaps.some(cap => cap.name === reqCap)
      );
      score += (matchedCaps.length / query.capabilities.length) * 0.1;
    }
    
    return Math.min(score, 1.0); // Cap at 1.0
  }

  private generateMatchReasons(registration: AgentRegistration, query: AgentDiscoveryQuery): string[] {
    const reasons: string[] = [];
    const agent = registration.agent;
    
    if (agent.performance_score > 0.8) {
      reasons.push('High performance score');
    }
    
    if (agent.trust_score > 0.9) {
      reasons.push('Excellent trust rating');
    }
    
    if (agent.status === 'active') {
      reasons.push('Currently available');
    }
    
    return reasons;
  }

  private estimateAvailability(registration: AgentRegistration): Date {
    const agent = registration.agent;
    const now = new Date();
    
    if (agent.status === 'active') {
      return now;
    } else if (agent.status === 'busy') {
      // Estimate based on current load
      const currentLoad = this.getCurrentLoad(agent.id);
      const estimatedMinutes = currentLoad * 5; // Rough estimation
      return new Date(now.getTime() + estimatedMinutes * 60000);
    } else {
      // Agent not available
      return new Date(now.getTime() + 3600000); // 1 hour from now
    }
  }

  private getCurrentLoad(agentId: string): number {
    const metrics = this.metrics.get(agentId);
    if (!metrics || !metrics.performance_metrics) {
      return 0;
    }
    
    // Simple load calculation based on queue depth and active connections
    const { queue_depth, active_connections } = metrics.performance_metrics;
    return Math.min((queue_depth + active_connections) / 10, 1.0);
  }

  private async applyLoadBalancing(matches: AgentMatch[], strategy: LoadBalancingStrategy): Promise<AgentMatch[]> {
    switch (strategy) {
      case 'round_robin':
        // Rotate based on last used (simple implementation)
        return matches;
      
      case 'least_connections':
        return matches.sort((a, b) => a.current_load - b.current_load);
      
      case 'weighted_performance':
        return matches.sort((a, b) => {
          const scoreA = a.agent.performance_score * (1 - a.current_load);
          const scoreB = b.agent.performance_score * (1 - b.current_load);
          return scoreB - scoreA;
        });
      
      default:
        return matches;
    }
  }

  private generateRecommendations(matches: AgentMatch[], query: AgentDiscoveryQuery): AgentRecommendation[] {
    const recommendations: AgentRecommendation[] = [];
    
    if (matches.length > 0) {
      const bestMatch = matches[0];
      recommendations.push({
        type: 'performance',
        agent_id: bestMatch.agent.id,
        reason: `Best overall match with score ${bestMatch.match_score.toFixed(2)}`,
        confidence: bestMatch.match_score
      });
    }
    
    // Find best availability
    const availableNow = matches.filter(m => m.agent.status === 'active');
    if (availableNow.length > 0) {
      recommendations.push({
        type: 'availability',
        agent_id: availableNow[0].agent.id,
        reason: 'Available immediately',
        confidence: 0.9
      });
    }
    
    return recommendations;
  }

  private async loadAgentCapabilitiesForAgent(agentId: string): Promise<void> {
    const capabilities = await this.db.query<any>(
      'SELECT * FROM agent_capabilities WHERE agent_id = $1',
      [agentId]
    );
    
    const agentCaps = capabilities.map(cap => this.convertDbToCapability(cap));
    this.agentCapabilities.set(agentId, agentCaps);
  }

  private async persistAgentRegistration(registration: AgentRegistration): Promise<void> {
    await this.db.create('agent_registrations', {
      agent_id: registration.agent.id,
      agent_type: registration.agent.type,
      agent_name: registration.agent.name,
      status: registration.agent.status,
      endpoint_url: registration.endpoint_url,
      registration_time: registration.registration_time,
      last_heartbeat: registration.last_heartbeat,
      metadata: registration.metadata
    });
  }

  private async updateAgentRegistration(registration: AgentRegistration): Promise<void> {
    await this.db.update('agent_registrations', registration.agent.id, {
      status: registration.agent.status,
      last_heartbeat: registration.last_heartbeat
    });
  }

  private createDefaultMetrics(agentId: string): AgentMetrics {
    return {
      agent_id: agentId,
      timestamp: new Date(),
      performance_metrics: {
        requests_per_minute: 0,
        average_response_time_ms: 0,
        error_rate: 0,
        success_rate: 100,
        queue_depth: 0,
        active_connections: 0
      },
      resource_metrics: {
        cpu_usage_percent: 0,
        memory_usage_mb: 0,
        memory_usage_percent: 0,
        disk_usage_percent: 0,
        network_io_mbps: 0
      },
      business_metrics: {
        tasks_completed: 0,
        tasks_failed: 0,
        quality_score: 0,
        user_satisfaction: 0,
        cost_per_request: 0,
        revenue_generated: 0
      }
    };
  }

  private getDefaultHealthConfig(): HealthCheckConfig {
    return {
      enabled: true,
      interval_seconds: 30,
      timeout_seconds: 5,
      failure_threshold: 3,
      recovery_threshold: 2,
      endpoint_path: '/health',
      expected_response_codes: [200],
      custom_checks: []
    };
  }

  private convertDbToRegistration(dbRecord: any): AgentRegistration {
    // Convert database record to AgentRegistration object
    // This would include proper type conversion and validation
    return dbRecord as AgentRegistration;
  }

  private convertDbToCapability(dbRecord: any): AgentCapability {
    // Convert database record to AgentCapability object
    return dbRecord as AgentCapability;
  }

  private async cleanupStaleRegistrations(): Promise<void> {
    const staleThreshold = new Date(Date.now() - 300000); // 5 minutes ago
    
    for (const [agentId, registration] of this.registeredAgents) {
      if (registration.last_heartbeat < staleThreshold) {
        this.logger.warn(`Cleaning up stale registration: ${agentId}`);
        await this.deregisterAgent(agentId, 'Stale registration - no heartbeat');
      }
    }
  }

  private async updateAgentMetrics(): Promise<void> {
    // Update performance metrics for all agents
    for (const [agentId, registration] of this.registeredAgents) {
      try {
        // Fetch current metrics from agent (in a real implementation)
        // For now, just update timestamp
        const currentMetrics = this.metrics.get(agentId) || this.createDefaultMetrics(agentId);
        currentMetrics.timestamp = new Date();
        this.metrics.set(agentId, currentMetrics);
      } catch (error) {
        this.logger.error(`Failed to update metrics for agent: ${agentId}`, error);
      }
    }
  }
}
