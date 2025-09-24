/**
 * In-Memory Agent Discovery Service Implementation
 * 
 * Provides agent discovery, registration, and capability matching for development and testing.
 * Includes health monitoring, load balancing, and service mesh integration.
 */

import {
  IAgentDiscovery,
  DiscoveryConfig,
  AgentRegistrationRequest,
  AgentRegistrationResponse,
  AgentRegistrationUpdate,
  RegistrationRenewalResult,
  AgentDiscoveryResult,
  CapabilityMatchResult,
  TypeMatchResult,
  LocationMatchResult,
  CapabilityRegistration,
  CapabilityRegistrationResult,
  CapabilityUpdate,
  CapabilityQuery,
  CapabilitySearchResult,
  PresenceUpdate,
  PresenceSubscription,
  PresenceChangeCallback,
  AgentHealthResult,
  BulkHealthResult,
  HealthHistoryResult,
  HealthChangeCallback,
  HealthSubscription,
  LoadBalancedResult,
  LoadMetrics,
  LoadDistribution,
  ServiceEndpoint,
  EndpointRegistrationResult,
  EndpointUpdate,
  EndpointDiscoveryResult,
  DiscoveryMetrics,
  RegistrationStatistics,
  DiscoveryPatternAnalysis,
  DiscoveryReport,
  DiscoveryHealth,
  CapabilitySearchOptions,
  TypeSearchOptions,
  LocationSearchOptions,
  EndpointDiscoveryOptions,
  PatternAnalysisCriteria,
  ReportOptions,
  TimeRange,
  GeographicLocation,
  LoadBalancingStrategy
} from '../interfaces/IAgentDiscovery';
import {
  AgentInfo,
  AgentCapability,
  PresenceInfo,
  PresenceMap,
  DiscoveryCriteria
} from '../interfaces/ICommunication';
import { Logger } from '../../../shared-utils/logger';

export class InMemoryAgentDiscovery implements IAgentDiscovery {
  private config: DiscoveryConfig;
  private logger: Logger;
  private isInitialized = false;
  private isStarted = false;
  
  // Storage
  private registeredAgents: Map<string, RegisteredAgent> = new Map();
  private agentCapabilities: Map<string, Map<string, AgentCapability>> = new Map();
  private agentPresence: Map<string, PresenceInfo> = new Map();
  private serviceEndpoints: Map<string, Map<string, ServiceEndpoint>> = new Map();
  
  // Subscriptions
  private presenceSubscriptions: Map<string, PresenceSubscription> = new Map();
  private healthSubscriptions: Map<string, HealthSubscription> = new Map();
  
  // Metrics and monitoring
  private metrics: DiscoveryMetrics;
  private healthResults: Map<string, AgentHealthResult> = new Map();
  private healthHistory: Map<string, AgentHealthResult[]> = new Map();
  private loadMetrics: Map<string, LoadMetrics> = new Map();
  
  constructor(logger: Logger) {
    this.logger = logger;
    this.initializeMetrics();
  }

  // === DISCOVERY LIFECYCLE ===

  async initialize(config: DiscoveryConfig): Promise<void> {
    this.logger.info('Initializing In-Memory Agent Discovery Service');
    
    try {
      this.config = config;
      
      // Initialize caching if enabled
      if (this.config.caching?.enabled) {
        this.initializeCaching();
      }
      
      // Set up health checking if enabled
      if (this.config.healthCheck?.enabled) {
        this.setupHealthChecking();
      }
      
      this.isInitialized = true;
      this.logger.info('In-Memory Agent Discovery Service initialized successfully');
      
    } catch (error) {
      this.logger.error('Failed to initialize In-Memory Agent Discovery Service', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Discovery service must be initialized before starting');
    }

    this.logger.info('Starting In-Memory Agent Discovery Service');
    
    try {
      // Start background processes
      this.startMetricsCollection();
      this.startHealthMonitoring();
      this.startRegistrationCleanup();
      
      this.isStarted = true;
      this.logger.info('In-Memory Agent Discovery Service started successfully');
      
    } catch (error) {
      this.logger.error('Failed to start In-Memory Agent Discovery Service', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping In-Memory Agent Discovery Service');
    
    try {
      // Stop all subscriptions
      for (const subscription of this.presenceSubscriptions.values()) {
        await subscription.unsubscribe();
      }
      
      for (const subscription of this.healthSubscriptions.values()) {
        await subscription.unsubscribe();
      }
      
      this.isStarted = false;
      this.logger.info('In-Memory Agent Discovery Service stopped successfully');
      
    } catch (error) {
      this.logger.error('Failed to stop In-Memory Agent Discovery Service', error);
      throw error;
    }
  }

  async getHealth(): Promise<DiscoveryHealth> {
    return {
      status: this.isStarted ? 'healthy' : 'unhealthy',
      uptime: this.isStarted ? Date.now() - this.metrics.timestamp.getTime() : 0,
      registeredAgents: this.registeredAgents.size,
      activeSessions: 0, // Would track active discovery sessions
      queryRate: this.calculateQueryRate(),
      averageResponseTime: this.calculateAverageResponseTime(),
      errorRate: this.calculateErrorRate(),
      cacheHitRate: this.calculateCacheHitRate(),
      lastUpdated: new Date()
    };
  }

  // === AGENT REGISTRATION ===

  async registerAgent(
    agentInfo: AgentRegistrationRequest
  ): Promise<AgentRegistrationResponse> {
    this.logger.info(`Registering agent: ${agentInfo.agentInfo.id}`);
    
    try {
      const agentId = agentInfo.agentInfo.id;
      
      // Check if agent is already registered
      if (this.registeredAgents.has(agentId)) {
        throw new Error(`Agent already registered: ${agentId}`);
      }
      
      const registrationId = this.generateRegistrationId();
      const expiresAt = agentInfo.ttl ? 
        new Date(Date.now() + agentInfo.ttl) : 
        new Date(Date.now() + 24 * 60 * 60 * 1000); // Default 24 hours
      
      const registeredAgent: RegisteredAgent = {
        registration: {
          agentId,
          registrationId,
          status: 'active',
          expiresAt,
          assignedEndpoints: [],
          discoveryTags: this.generateDiscoveryTags(agentInfo)
        },
        agentInfo: agentInfo.agentInfo,
        metadata: agentInfo.metadata,
        registeredAt: new Date(),
        lastSeen: new Date()
      };
      
      this.registeredAgents.set(agentId, registeredAgent);
      
      // Register capabilities
      const agentCapabilities = new Map<string, AgentCapability>();
      for (const capability of agentInfo.capabilities) {
        const capabilityId = this.generateCapabilityId();
        agentCapabilities.set(capabilityId, capability.capability);
      }
      this.agentCapabilities.set(agentId, agentCapabilities);
      
      // Register endpoints
      const agentEndpoints = new Map<string, ServiceEndpoint>();
      for (const endpoint of agentInfo.endpoints) {
        const endpointId = this.generateEndpointId();
        agentEndpoints.set(endpointId, endpoint);
      }
      this.serviceEndpoints.set(agentId, agentEndpoints);
      
      // Set initial presence
      this.agentPresence.set(agentId, agentInfo.presence);
      
      // Update metrics
      this.updateRegistrationMetrics('registered');
      
      this.logger.info(`Agent registered successfully: ${agentId}`);
      
      return {
        agentId,
        registrationId,
        status: 'active',
        expiresAt,
        assignedEndpoints: [],
        discoveryTags: registeredAgent.registration.discoveryTags
      };
      
    } catch (error) {
      this.logger.error(`Failed to register agent: ${agentInfo.agentInfo.id}`, error);
      this.updateRegistrationMetrics('failed');
      throw error;
    }
  }

  async updateRegistration(
    agentId: string,
    updates: AgentRegistrationUpdate
  ): Promise<void> {
    this.logger.debug(`Updating registration for agent: ${agentId}`);
    
    try {
      const registeredAgent = this.registeredAgents.get(agentId);
      if (!registeredAgent) {
        throw new Error(`Agent not found: ${agentId}`);
      }
      
      // Update agent info
      if (updates.agentInfo) {
        Object.assign(registeredAgent.agentInfo, updates.agentInfo);
      }
      
      // Update metadata
      if (updates.metadata) {
        Object.assign(registeredAgent.metadata, updates.metadata);
      }
      
      // Update presence
      if (updates.presence) {
        const currentPresence = this.agentPresence.get(agentId);
        if (currentPresence) {
          Object.assign(currentPresence, updates.presence);
        }
      }
      
      registeredAgent.lastSeen = new Date();
      
      this.logger.debug(`Registration updated for agent: ${agentId}`);
      
    } catch (error) {
      this.logger.error(`Failed to update registration for agent: ${agentId}`, error);
      throw error;
    }
  }

  async deregisterAgent(agentId: string, reason?: string): Promise<void> {
    this.logger.info(`Deregistering agent: ${agentId}`, { reason });
    
    try {
      const registeredAgent = this.registeredAgents.get(agentId);
      if (!registeredAgent) {
        this.logger.warn(`Attempted to deregister unknown agent: ${agentId}`);
        return;
      }
      
      // Remove from all storage
      this.registeredAgents.delete(agentId);
      this.agentCapabilities.delete(agentId);
      this.agentPresence.delete(agentId);
      this.serviceEndpoints.delete(agentId);
      this.healthResults.delete(agentId);
      this.healthHistory.delete(agentId);
      this.loadMetrics.delete(agentId);
      
      // Notify presence subscribers
      await this.notifyPresenceChange(agentId, null, null);
      
      // Update metrics
      this.updateRegistrationMetrics('deregistered');
      
      this.logger.info(`Agent deregistered successfully: ${agentId}`);
      
    } catch (error) {
      this.logger.error(`Failed to deregister agent: ${agentId}`, error);
      throw error;
    }
  }

  async renewRegistration(
    agentId: string,
    ttl?: number
  ): Promise<RegistrationRenewalResult> {
    this.logger.debug(`Renewing registration for agent: ${agentId}`);
    
    try {
      const registeredAgent = this.registeredAgents.get(agentId);
      if (!registeredAgent) {
        throw new Error(`Agent not found: ${agentId}`);
      }
      
      const newTtl = ttl || 24 * 60 * 60 * 1000; // Default 24 hours
      const newExpiryTime = new Date(Date.now() + newTtl);
      
      registeredAgent.registration.expiresAt = newExpiryTime;
      registeredAgent.lastSeen = new Date();
      
      return {
        agentId,
        renewed: true,
        newExpiryTime,
        warningsIssued: []
      };
      
    } catch (error) {
      this.logger.error(`Failed to renew registration for agent: ${agentId}`, error);
      throw error;
    }
  }

  // === AGENT DISCOVERY ===

  async discoverAgents(
    criteria: DiscoveryCriteria
  ): Promise<AgentDiscoveryResult> {
    this.logger.debug('Discovering agents', criteria);
    
    const startTime = Date.now();
    
    try {
      let candidateAgents = Array.from(this.registeredAgents.values())
        .filter(agent => agent.registration.status === 'active');
      
      // Apply filters
      if (criteria.agentTypes) {
        candidateAgents = candidateAgents.filter(agent => 
          criteria.agentTypes!.includes(agent.agentInfo.type)
        );
      }
      
      if (criteria.capabilities) {
        candidateAgents = candidateAgents.filter(agent => {
          const agentCaps = this.agentCapabilities.get(agent.agentInfo.id) || new Map();
          return criteria.capabilities!.every(reqCap => 
            Array.from(agentCaps.values()).some(cap => cap.name === reqCap)
          );
        });
      }
      
      if (criteria.minPerformanceScore) {
        candidateAgents = candidateAgents.filter(agent => 
          agent.agentInfo.performanceScore >= criteria.minPerformanceScore!
        );
      }
      
      if (criteria.maxResponseTime) {
        candidateAgents = candidateAgents.filter(agent => 
          agent.agentInfo.responseTime <= criteria.maxResponseTime!
        );
      }
      
      // Score and rank agents
      const discoveredAgents = candidateAgents.map(agent => {
        const matchScore = this.calculateMatchScore(agent, criteria);
        const matchReasons = this.generateMatchReasons(agent, criteria);
        
        return {
          agentInfo: agent.agentInfo,
          matchScore,
          matchReasons,
          distance: this.calculateDistance(agent, criteria.geographicPreference),
          loadLevel: this.getLoadLevel(agent.agentInfo.id),
          healthStatus: this.getHealthStatus(agent.agentInfo.id),
          lastSeen: agent.lastSeen
        };
      });
      
      // Sort by match score
      discoveredAgents.sort((a, b) => b.matchScore - a.matchScore);
      
      // Apply load balancing if specified
      const balancedAgents = await this.applyLoadBalancing(
        discoveredAgents,
        criteria.loadBalancing || 'performance_based'
      );
      
      const searchTime = Date.now() - startTime;
      
      // Update metrics
      this.updateDiscoveryMetrics(criteria, searchTime, balancedAgents.length);
      
      return {
        agents: balancedAgents,
        totalFound: balancedAgents.length,
        searchTime,
        cacheHit: false, // Always false for in-memory implementation
        recommendations: this.generateDiscoveryRecommendations(balancedAgents)
      };
      
    } catch (error) {
      this.logger.error('Failed to discover agents', error);
      throw error;
    }
  }

  async findAgentsByCapability(
    capabilities: string[],
    options?: CapabilitySearchOptions
  ): Promise<CapabilityMatchResult> {
    this.logger.debug(`Finding agents by capabilities: ${capabilities.join(', ')}`);
    
    const startTime = Date.now();
    
    try {
      const matches: any[] = [];
      const partialMatches: any[] = [];
      
      for (const [agentId, agentCaps] of this.agentCapabilities) {
        const agentCapabilities = Array.from(agentCaps.values());
        const matchedCaps = capabilities.filter(reqCap => 
          agentCapabilities.some(cap => cap.name === reqCap)
        );
        
        if (matchedCaps.length === capabilities.length) {
          // Full match
          for (const cap of agentCapabilities) {
            if (capabilities.includes(cap.name)) {
              matches.push({
                agentId,
                capability: cap,
                matchScore: 1.0,
                availability: this.getCapabilityAvailability(agentId, cap.id)
              });
            }
          }
        } else if (matchedCaps.length > 0) {
          // Partial match
          partialMatches.push({
            agentId,
            matchedCapabilities: matchedCaps,
            missingCapabilities: capabilities.filter(cap => !matchedCaps.includes(cap)),
            matchPercentage: matchedCaps.length / capabilities.length
          });
        }
      }
      
      // Apply sorting if specified
      if (options?.sortBy) {
        matches.sort((a, b) => {
          switch (options.sortBy) {
            case 'score':
              return b.matchScore - a.matchScore;
            case 'availability':
              return (b.availability?.available ? 1 : 0) - (a.availability?.available ? 1 : 0);
            default:
              return 0;
          }
        });
      }
      
      // Apply limit if specified
      if (options?.limit) {
        matches.splice(options.limit);
      }
      
      return {
        matches,
        partialMatches,
        totalCapabilities: this.getTotalCapabilitiesCount(),
        searchTime: Date.now() - startTime
      };
      
    } catch (error) {
      this.logger.error('Failed to find agents by capability', error);
      throw error;
    }
  }

  async findAgentsByType(
    agentTypes: string[],
    options?: TypeSearchOptions
  ): Promise<TypeMatchResult> {
    this.logger.debug(`Finding agents by types: ${agentTypes.join(', ')}`);
    
    const startTime = Date.now();
    
    try {
      const matches: any[] = [];
      const typeCount: Record<string, number> = {};
      
      for (const [agentId, registeredAgent] of this.registeredAgents) {
        const agentType = registeredAgent.agentInfo.type;
        
        if (!typeCount[agentType]) {
          typeCount[agentType] = 0;
        }
        typeCount[agentType]++;
        
        if (agentTypes.includes(agentType)) {
          matches.push({
            agentInfo: registeredAgent.agentInfo,
            exactMatch: true,
            compatibility: {
              score: 1.0,
              factors: [{
                factor: 'exact_type_match',
                weight: 1.0,
                value: 1.0
              }]
            }
          });
        }
      }
      
      // Apply sorting if specified
      if (options?.sortBy) {
        matches.sort((a, b) => {
          switch (options.sortBy) {
            case 'score':
              return b.compatibility.score - a.compatibility.score;
            case 'load':
              return this.getLoadLevel(a.agentInfo.id).localeCompare(this.getLoadLevel(b.agentInfo.id));
            case 'health':
              return this.getHealthStatus(a.agentInfo.id).localeCompare(this.getHealthStatus(b.agentInfo.id));
            default:
              return 0;
          }
        });
      }
      
      // Apply limit if specified
      if (options?.limit) {
        matches.splice(options.limit);
      }
      
      return {
        matches,
        totalAgents: this.registeredAgents.size,
        byType: typeCount,
        searchTime: Date.now() - startTime
      };
      
    } catch (error) {
      this.logger.error('Failed to find agents by type', error);
      throw error;
    }
  }

  async findNearestAgents(
    location: GeographicLocation,
    radius: number,
    options?: LocationSearchOptions
  ): Promise<LocationMatchResult> {
    this.logger.debug(`Finding nearest agents to location: ${location.latitude}, ${location.longitude}`);
    
    try {
      const matches: any[] = [];
      let totalInRadius = 0;
      
      for (const [agentId, registeredAgent] of this.registeredAgents) {
        const presence = this.agentPresence.get(agentId);
        if (!presence?.location) continue;
        
        const distance = this.calculateGeographicDistance(location, presence.location);
        
        if (distance <= radius) {
          totalInRadius++;
          
          if (!options?.includeOffline && presence.status === 'offline') {
            continue;
          }
          
          matches.push({
            agentInfo: registeredAgent.agentInfo,
            distance,
            bearing: this.calculateBearing(location, presence.location),
            travelTime: this.estimateTravelTime(distance),
            networkLatency: this.estimateNetworkLatency(distance)
          });
        }
      }
      
      // Apply sorting if specified
      if (options?.sortBy) {
        matches.sort((a, b) => {
          switch (options.sortBy) {
            case 'distance':
              return a.distance - b.distance;
            case 'latency':
              return (a.networkLatency || 0) - (b.networkLatency || 0);
            case 'load':
              return this.getLoadLevel(a.agentInfo.id).localeCompare(this.getLoadLevel(b.agentInfo.id));
            default:
              return 0;
          }
        });
      }
      
      // Apply limit if specified
      if (options?.limit) {
        matches.splice(options.limit);
      }
      
      return {
        matches,
        searchRadius: radius,
        searchCenter: location,
        totalInRadius
      };
      
    } catch (error) {
      this.logger.error('Failed to find nearest agents', error);
      throw error;
    }
  }

  async getAgent(agentId: string): Promise<AgentInfo | null> {
    const registeredAgent = this.registeredAgents.get(agentId);
    return registeredAgent ? registeredAgent.agentInfo : null;
  }

  async getAgents(agentIds: string[]): Promise<AgentInfo[]> {
    const agents: AgentInfo[] = [];
    
    for (const agentId of agentIds) {
      const agent = await this.getAgent(agentId);
      if (agent) {
        agents.push(agent);
      }
    }
    
    return agents;
  }

  // === CAPABILITY MANAGEMENT ===

  async registerCapability(
    agentId: string,
    capability: CapabilityRegistration
  ): Promise<CapabilityRegistrationResult> {
    this.logger.debug(`Registering capability for agent: ${agentId}`);
    
    try {
      if (!this.registeredAgents.has(agentId)) {
        throw new Error(`Agent not found: ${agentId}`);
      }
      
      let agentCapabilities = this.agentCapabilities.get(agentId);
      if (!agentCapabilities) {
        agentCapabilities = new Map();
        this.agentCapabilities.set(agentId, agentCapabilities);
      }
      
      const capabilityId = this.generateCapabilityId();
      agentCapabilities.set(capabilityId, capability.capability);
      
      return {
        capabilityId,
        registered: true,
        version: capability.capability.version,
        discoveryTags: this.generateCapabilityTags(capability.capability)
      };
      
    } catch (error) {
      this.logger.error(`Failed to register capability for agent: ${agentId}`, error);
      throw error;
    }
  }

  async updateCapability(
    agentId: string,
    capabilityId: string,
    updates: CapabilityUpdate
  ): Promise<void> {
    this.logger.debug(`Updating capability ${capabilityId} for agent: ${agentId}`);
    
    try {
      const agentCapabilities = this.agentCapabilities.get(agentId);
      if (!agentCapabilities) {
        throw new Error(`No capabilities found for agent: ${agentId}`);
      }
      
      const capability = agentCapabilities.get(capabilityId);
      if (!capability) {
        throw new Error(`Capability not found: ${capabilityId}`);
      }
      
      if (updates.capability) {
        Object.assign(capability, updates.capability);
      }
      
    } catch (error) {
      this.logger.error(`Failed to update capability ${capabilityId} for agent: ${agentId}`, error);
      throw error;
    }
  }

  async deregisterCapability(
    agentId: string,
    capabilityId: string
  ): Promise<void> {
    this.logger.debug(`Deregistering capability ${capabilityId} for agent: ${agentId}`);
    
    try {
      const agentCapabilities = this.agentCapabilities.get(agentId);
      if (agentCapabilities) {
        agentCapabilities.delete(capabilityId);
      }
      
    } catch (error) {
      this.logger.error(`Failed to deregister capability ${capabilityId} for agent: ${agentId}`, error);
      throw error;
    }
  }

  async getAgentCapabilities(agentId: string): Promise<AgentCapability[]> {
    const agentCapabilities = this.agentCapabilities.get(agentId);
    return agentCapabilities ? Array.from(agentCapabilities.values()) : [];
  }

  async searchCapabilities(
    query: CapabilityQuery
  ): Promise<CapabilitySearchResult> {
    this.logger.debug('Searching capabilities', query);
    
    const startTime = Date.now();
    
    try {
      const matches: any[] = [];
      const categories = new Set<string>();
      
      for (const [agentId, agentCapabilities] of this.agentCapabilities) {
        for (const [capabilityId, capability] of agentCapabilities) {
          categories.add(capability.category);
          
          // Apply filters
          if (query.name && !capability.name.toLowerCase().includes(query.name.toLowerCase())) {
            continue;
          }
          
          if (query.category && capability.category !== query.category) {
            continue;
          }
          
          if (query.tags && !query.tags.every(tag => capability.name.includes(tag))) {
            continue;
          }
          
          const matchScore = this.calculateCapabilityMatchScore(capability, query);
          
          matches.push({
            agentId,
            capability,
            matchScore,
            availability: this.getCapabilityAvailability(agentId, capabilityId)
          });
        }
      }
      
      // Sort by match score
      matches.sort((a, b) => b.matchScore - a.matchScore);
      
      const categorySummary = Array.from(categories).map(category => ({
        category,
        count: matches.filter(m => m.capability.category === category).length,
        averageScore: this.calculateAverageScore(matches.filter(m => m.capability.category === category)),
        topCapabilities: matches
          .filter(m => m.capability.category === category)
          .slice(0, 3)
          .map(m => m.capability.name)
      }));
      
      return {
        capabilities: matches,
        totalFound: matches.length,
        categories: categorySummary,
        searchTime: Date.now() - startTime
      };
      
    } catch (error) {
      this.logger.error('Failed to search capabilities', error);
      throw error;
    }
  }

  // === PRESENCE MANAGEMENT ===

  async updatePresence(
    agentId: string,
    presence: PresenceUpdate
  ): Promise<void> {
    this.logger.debug(`Updating presence for agent: ${agentId}`);
    
    try {
      if (!this.registeredAgents.has(agentId)) {
        throw new Error(`Agent not found: ${agentId}`);
      }
      
      const currentPresence = this.agentPresence.get(agentId);
      const oldPresence = currentPresence ? { ...currentPresence } : null;
      
      if (currentPresence) {
        Object.assign(currentPresence, presence);
      } else {
        this.agentPresence.set(agentId, {
          agentId,
          status: presence.status || 'online',
          location: presence.location,
          currentTasks: presence.currentTasks || [],
          availableUntil: presence.availableUntil,
          metadata: presence.metadata
        });
      }
      
      const newPresence = this.agentPresence.get(agentId)!;
      
      // Notify subscribers
      await this.notifyPresenceChange(agentId, oldPresence, newPresence);
      
    } catch (error) {
      this.logger.error(`Failed to update presence for agent: ${agentId}`, error);
      throw error;
    }
  }

  async getPresence(agentId: string): Promise<PresenceInfo | null> {
    return this.agentPresence.get(agentId) || null;
  }

  async getMultiplePresence(agentIds: string[]): Promise<PresenceMap> {
    const presenceMap: PresenceMap = {};
    
    for (const agentId of agentIds) {
      const presence = this.agentPresence.get(agentId);
      if (presence) {
        presenceMap[agentId] = presence;
      }
    }
    
    return presenceMap;
  }

  async subscribeToPresence(
    agentIds: string[],
    callback: PresenceChangeCallback
  ): Promise<PresenceSubscription> {
    const subscriptionId = this.generateSubscriptionId();
    
    const subscription: PresenceSubscription = {
      id: subscriptionId,
      agentIds,
      callback,
      unsubscribe: async () => {
        this.presenceSubscriptions.delete(subscriptionId);
      }
    };
    
    this.presenceSubscriptions.set(subscriptionId, subscription);
    
    return subscription;
  }

  async unsubscribeFromPresence(
    subscription: PresenceSubscription
  ): Promise<void> {
    await subscription.unsubscribe();
  }

  // === HEALTH MONITORING ===

  async performHealthCheck(agentId: string): Promise<AgentHealthResult> {
    this.logger.debug(`Performing health check for agent: ${agentId}`);
    
    try {
      const registeredAgent = this.registeredAgents.get(agentId);
      if (!registeredAgent) {
        throw new Error(`Agent not found: ${agentId}`);
      }
      
      const startTime = Date.now();
      
      // Simulate health checks
      const checks = [
        {
          checkName: 'connectivity',
          status: 'pass' as const,
          value: 100,
          threshold: 90,
          message: 'Agent is responsive',
          timestamp: new Date()
        },
        {
          checkName: 'memory',
          status: 'pass' as const,
          value: 75,
          threshold: 90,
          message: 'Memory usage within limits',
          timestamp: new Date()
        },
        {
          checkName: 'cpu',
          status: 'pass' as const,
          value: 60,
          threshold: 80,
          message: 'CPU usage normal',
          timestamp: new Date()
        }
      ];
      
      const healthScore = checks.reduce((sum, check) => 
        sum + (check.status === 'pass' ? check.value : 0), 0) / checks.length;
      
      const healthy = checks.every(check => check.status === 'pass');
      
      const result: AgentHealthResult = {
        agentId,
        healthy,
        healthScore,
        checks,
        lastUpdated: new Date(),
        responseTime: Date.now() - startTime
      };
      
      this.healthResults.set(agentId, result);
      
      // Add to health history
      let history = this.healthHistory.get(agentId);
      if (!history) {
        history = [];
        this.healthHistory.set(agentId, history);
      }
      history.push(result);
      
      // Keep only recent history (last 100 entries)
      if (history.length > 100) {
        history.splice(0, history.length - 100);
      }
      
      return result;
      
    } catch (error) {
      this.logger.error(`Failed to perform health check for agent: ${agentId}`, error);
      throw error;
    }
  }

  async performBulkHealthCheck(agentIds: string[]): Promise<BulkHealthResult> {
    this.logger.debug(`Performing bulk health check for ${agentIds.length} agents`);
    
    const startTime = Date.now();
    const results: AgentHealthResult[] = [];
    
    for (const agentId of agentIds) {
      try {
        const result = await this.performHealthCheck(agentId);
        results.push(result);
      } catch (error) {
        this.logger.error(`Health check failed for agent: ${agentId}`, error);
      }
    }
    
    const healthyCount = results.filter(r => r.healthy).length;
    const degradedCount = results.filter(r => !r.healthy && r.healthScore > 0.5).length;
    const unhealthyCount = results.length - healthyCount - degradedCount;
    
    return {
      results,
      summary: {
        totalChecked: results.length,
        healthy: healthyCount,
        degraded: degradedCount,
        unhealthy: unhealthyCount,
        averageScore: results.reduce((sum, r) => sum + r.healthScore, 0) / results.length
      },
      duration: Date.now() - startTime
    };
  }

  async getHealthHistory(
    agentId: string,
    timeRange?: TimeRange
  ): Promise<HealthHistoryResult> {
    this.logger.debug(`Getting health history for agent: ${agentId}`);
    
    try {
      const history = this.healthHistory.get(agentId) || [];
      
      let filteredHistory = history;
      if (timeRange) {
        filteredHistory = history.filter(h => 
          h.lastUpdated >= timeRange.start && h.lastUpdated <= timeRange.end
        );
      }
      
      const healthPoints = filteredHistory.map(h => ({
        timestamp: h.lastUpdated,
        healthScore: h.healthScore,
        checks: h.checks.map(c => ({
          checkName: c.checkName,
          status: c.status,
          value: c.value || 0
        }))
      }));
      
      // Calculate trends
      const trends = this.calculateHealthTrends(filteredHistory);
      
      // Identify incidents
      const incidents = this.identifyHealthIncidents(filteredHistory);
      
      return {
        agentId,
        timeRange: timeRange || { start: new Date(0), end: new Date() },
        healthPoints,
        trends,
        incidents
      };
      
    } catch (error) {
      this.logger.error(`Failed to get health history for agent: ${agentId}`, error);
      throw error;
    }
  }

  async subscribeToHealthChanges(
    agentIds: string[],
    callback: HealthChangeCallback
  ): Promise<HealthSubscription> {
    const subscriptionId = this.generateSubscriptionId();
    
    const subscription: HealthSubscription = {
      id: subscriptionId,
      agentIds,
      callback,
      unsubscribe: async () => {
        this.healthSubscriptions.delete(subscriptionId);
      }
    };
    
    this.healthSubscriptions.set(subscriptionId, subscription);
    
    return subscription;
  }

  // === LOAD BALANCING ===

  async getLoadBalancedSelection(
    criteria: DiscoveryCriteria,
    strategy: LoadBalancingStrategy
  ): Promise<LoadBalancedResult> {
    this.logger.debug(`Getting load balanced selection with strategy: ${strategy}`);
    
    try {
      // First discover agents based on criteria
      const discoveryResult = await this.discoverAgents(criteria);
      
      // Apply load balancing
      const balancedAgents = await this.applyLoadBalancing(
        discoveryResult.agents,
        strategy
      );
      
      const loadDistribution = await this.getLoadDistribution();
      
      return {
        selectedAgents: balancedAgents.map(agent => ({
          agentInfo: agent.agentInfo,
          currentLoad: this.getCurrentLoad(agent.agentInfo.id),
          capacity: this.getCapacity(agent.agentInfo.id),
          utilization: this.getUtilization(agent.agentInfo.id),
          estimatedResponseTime: agent.agentInfo.responseTime
        })),
        strategy,
        distribution: loadDistribution,
        recommendations: this.generateLoadBalancingRecommendations(balancedAgents)
      };
      
    } catch (error) {
      this.logger.error('Failed to get load balanced selection', error);
      throw error;
    }
  }

  async updateLoadMetrics(
    agentId: string,
    metrics: LoadMetrics
  ): Promise<void> {
    this.logger.debug(`Updating load metrics for agent: ${agentId}`);
    
    try {
      this.loadMetrics.set(agentId, metrics);
      
    } catch (error) {
      this.logger.error(`Failed to update load metrics for agent: ${agentId}`, error);
      throw error;
    }
  }

  async getLoadDistribution(
    agentTypes?: string[]
  ): Promise<LoadDistribution> {
    const agentLoads: any[] = [];
    const typeLoads: any[] = [];
    const typeStats: Record<string, { count: number; totalLoad: number; totalCapacity: number }> = {};
    
    for (const [agentId, registeredAgent] of this.registeredAgents) {
      if (agentTypes && !agentTypes.includes(registeredAgent.agentInfo.type)) {
        continue;
      }
      
      const currentLoad = this.getCurrentLoad(agentId);
      const capacity = this.getCapacity(agentId);
      const utilization = this.getUtilization(agentId);
      
      agentLoads.push({
        agentId,
        currentLoad,
        capacity,
        utilization,
        trend: this.getLoadTrend(agentId)
      });
      
      const agentType = registeredAgent.agentInfo.type;
      if (!typeStats[agentType]) {
        typeStats[agentType] = { count: 0, totalLoad: 0, totalCapacity: 0 };
      }
      typeStats[agentType].count++;
      typeStats[agentType].totalLoad += currentLoad;
      typeStats[agentType].totalCapacity += capacity;
    }
    
    for (const [agentType, stats] of Object.entries(typeStats)) {
      typeLoads.push({
        agentType,
        totalAgents: stats.count,
        averageLoad: stats.totalLoad / stats.count,
        capacity: stats.totalCapacity,
        utilization: stats.totalLoad / stats.totalCapacity
      });
    }
    
    const averageLoad = agentLoads.reduce((sum, load) => sum + load.currentLoad, 0) / agentLoads.length;
    const imbalanceScore = this.calculateImbalanceScore(agentLoads);
    
    return {
      totalAgents: agentLoads.length,
      averageLoad,
      loadByAgent: agentLoads,
      loadByType: typeLoads,
      imbalanceScore
    };
  }

  // === SERVICE MESH INTEGRATION ===

  async registerServiceEndpoint(
    agentId: string,
    endpoint: ServiceEndpoint
  ): Promise<EndpointRegistrationResult> {
    this.logger.debug(`Registering service endpoint for agent: ${agentId}`);
    
    try {
      if (!this.registeredAgents.has(agentId)) {
        throw new Error(`Agent not found: ${agentId}`);
      }
      
      let agentEndpoints = this.serviceEndpoints.get(agentId);
      if (!agentEndpoints) {
        agentEndpoints = new Map();
        this.serviceEndpoints.set(agentId, agentEndpoints);
      }
      
      const endpointId = this.generateEndpointId();
      endpoint.id = endpointId;
      
      agentEndpoints.set(endpointId, endpoint);
      
      const discoveryUrl = `${endpoint.protocol}://${endpoint.host}:${endpoint.port}${endpoint.path || ''}`;
      
      return {
        endpointId,
        registered: true,
        discoveryUrl
      };
      
    } catch (error) {
      this.logger.error(`Failed to register service endpoint for agent: ${agentId}`, error);
      throw error;
    }
  }

  async updateServiceEndpoint(
    agentId: string,
    endpointId: string,
    updates: EndpointUpdate
  ): Promise<void> {
    this.logger.debug(`Updating service endpoint ${endpointId} for agent: ${agentId}`);
    
    try {
      const agentEndpoints = this.serviceEndpoints.get(agentId);
      if (!agentEndpoints) {
        throw new Error(`No endpoints found for agent: ${agentId}`);
      }
      
      const endpoint = agentEndpoints.get(endpointId);
      if (!endpoint) {
        throw new Error(`Endpoint not found: ${endpointId}`);
      }
      
      Object.assign(endpoint, updates);
      
    } catch (error) {
      this.logger.error(`Failed to update service endpoint ${endpointId} for agent: ${agentId}`, error);
      throw error;
    }
  }

  async deregisterServiceEndpoint(
    agentId: string,
    endpointId: string
  ): Promise<void> {
    this.logger.debug(`Deregistering service endpoint ${endpointId} for agent: ${agentId}`);
    
    try {
      const agentEndpoints = this.serviceEndpoints.get(agentId);
      if (agentEndpoints) {
        agentEndpoints.delete(endpointId);
      }
      
    } catch (error) {
      this.logger.error(`Failed to deregister service endpoint ${endpointId} for agent: ${agentId}`, error);
      throw error;
    }
  }

  async discoverServiceEndpoints(
    serviceName: string,
    options?: EndpointDiscoveryOptions
  ): Promise<EndpointDiscoveryResult> {
    this.logger.debug(`Discovering service endpoints for service: ${serviceName}`);
    
    try {
      const discoveredEndpoints: any[] = [];
      
      for (const [agentId, agentEndpoints] of this.serviceEndpoints) {
        for (const [endpointId, endpoint] of agentEndpoints) {
          if (endpoint.serviceName === serviceName) {
            // Apply filters
            if (options?.protocol && endpoint.protocol !== options.protocol) {
              continue;
            }
            
            if (options?.healthyOnly) {
              const health = this.healthResults.get(agentId);
              if (!health || !health.healthy) {
                continue;
              }
            }
            
            const load = this.getCurrentLoad(agentId);
            const healthStatus = this.getHealthStatus(agentId);
            const responseTime = this.getAverageResponseTime(agentId);
            const reliability = this.getReliabilityScore(agentId);
            
            discoveredEndpoints.push({
              endpoint,
              agentId,
              healthStatus,
              load,
              responseTime,
              reliability
            });
          }
        }
      }
      
      // Apply sorting if specified
      if (options?.sortBy) {
        discoveredEndpoints.sort((a, b) => {
          switch (options.sortBy) {
            case 'health':
              return this.compareHealthStatus(b.healthStatus, a.healthStatus);
            case 'load':
              return a.load - b.load;
            case 'response_time':
              return a.responseTime - b.responseTime;
            default:
              return 0;
          }
        });
      }
      
      // Apply limit if specified
      if (options?.limit) {
        discoveredEndpoints.splice(options.limit);
      }
      
      return {
        endpoints: discoveredEndpoints,
        totalFound: discoveredEndpoints.length,
        loadBalanced: options?.loadBalanced || false,
        recommendations: this.generateEndpointRecommendations(discoveredEndpoints)
      };
      
    } catch (error) {
      this.logger.error(`Failed to discover service endpoints for service: ${serviceName}`, error);
      throw error;
    }
  }

  // === MONITORING AND ANALYTICS ===

  async getDiscoveryMetrics(): Promise<DiscoveryMetrics> {
    this.updateMetrics();
    return this.metrics;
  }

  async getRegistrationStatistics(
    timeRange?: TimeRange
  ): Promise<RegistrationStatistics> {
    // Calculate registration statistics for the given time range
    const now = new Date();
    const oneHour = 60 * 60 * 1000;
    const oneDayAgo = new Date(now.getTime() - 24 * oneHour);
    
    const registrations = Array.from(this.registeredAgents.values());
    const recentRegistrations = registrations.filter(r => r.registeredAt >= oneDayAgo);
    
    const byType: Record<string, number> = {};
    const byRegion: Record<string, number> = {};
    
    for (const registration of registrations) {
      const agentType = registration.agentInfo.type;
      const region = registration.metadata.region;
      
      byType[agentType] = (byType[agentType] || 0) + 1;
      byRegion[region] = (byRegion[region] || 0) + 1;
    }
    
    return {
      totalRegistrations: registrations.length,
      activeRegistrations: registrations.filter(r => r.registration.status === 'active').length,
      registrationsPerHour: recentRegistrations.length / 24, // Rough estimate
      deregistrationsPerHour: 0, // Would need to track deregistration events
      averageSessionDuration: 24 * oneHour, // Default for in-memory implementation
      registrationsByType: byType,
      registrationsByRegion: byRegion
    };
  }

  async analyzeDiscoveryPatterns(
    criteria: PatternAnalysisCriteria
  ): Promise<DiscoveryPatternAnalysis> {
    // Analyze discovery patterns based on criteria
    return {
      patterns: [],
      trends: [],
      predictions: [],
      recommendations: []
    };
  }

  async generateDiscoveryReport(
    options: ReportOptions
  ): Promise<DiscoveryReport> {
    const registrationStats = await this.getRegistrationStatistics(options.timeRange);
    
    return {
      period: options.timeRange,
      summary: {
        totalQueries: this.metrics.totalQueries,
        totalRegistrations: registrationStats.totalRegistrations,
        averageResponseTime: this.metrics.averageQueryTime,
        uptime: this.calculateUptime(),
        topCapabilities: this.getTopCapabilities()
      },
      registrations: {
        trends: [],
        patterns: [],
        failures: []
      },
      discoveries: {
        queryVolume: [],
        popularSearches: [],
        responseTimeDistribution: {
          p50: this.metrics.averageQueryTime,
          p90: this.metrics.averageQueryTime * 1.5,
          p95: this.metrics.averageQueryTime * 2,
          p99: this.metrics.averageQueryTime * 3
        }
      },
      performance: {
        latencyTrends: [],
        throughputTrends: [],
        errorAnalysis: {
          totalErrors: 0,
          errorRate: this.calculateErrorRate(),
          errorsByType: {},
          topErrors: []
        }
      },
      recommendations: [],
      metadata: {
        generatedAt: new Date(),
        generatedBy: 'in-memory-discovery-service',
        version: '1.0',
        dataSource: 'in-memory'
      }
    };
  }

  // === PRIVATE METHODS ===

  private initializeMetrics(): void {
    this.metrics = {
      totalQueries: 0,
      queriesPerSecond: 0,
      averageQueryTime: 0,
      cacheHitRate: 0,
      registrationStats: {
        total: 0,
        active: 0,
        byType: {},
        byRegion: {},
        averageDuration: 0
      },
      popularCapabilities: [],
      usagePatterns: [],
      performanceMetrics: {
        averageLatency: 0,
        p95Latency: 0,
        p99Latency: 0,
        throughput: 0,
        errorRate: 0
      },
      timestamp: new Date()
    };
  }

  private initializeCaching(): void {
    // Initialize caching if enabled
    this.logger.debug('Initializing caching');
  }

  private setupHealthChecking(): void {
    // Set up health checking if enabled
    this.logger.debug('Setting up health checking');
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.updateMetrics();
    }, 60000); // Update every minute
  }

  private startHealthMonitoring(): void {
    if (!this.config.healthCheck?.enabled) return;
    
    setInterval(() => {
      this.performPeriodicHealthChecks();
    }, (this.config.healthCheck.interval || 30) * 1000);
  }

  private startRegistrationCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredRegistrations();
    }, 300000); // Every 5 minutes
  }

  private async performPeriodicHealthChecks(): Promise<void> {
    for (const agentId of this.registeredAgents.keys()) {
      try {
        await this.performHealthCheck(agentId);
      } catch (error) {
        this.logger.error(`Periodic health check failed for agent: ${agentId}`, error);
      }
    }
  }

  private cleanupExpiredRegistrations(): void {
    const now = new Date();
    const expiredAgents: string[] = [];
    
    for (const [agentId, registeredAgent] of this.registeredAgents) {
      if (registeredAgent.registration.expiresAt < now) {
        expiredAgents.push(agentId);
      }
    }
    
    for (const agentId of expiredAgents) {
      this.deregisterAgent(agentId, 'registration_expired');
    }
    
    if (expiredAgents.length > 0) {
      this.logger.info(`Cleaned up ${expiredAgents.length} expired registrations`);
    }
  }

  private updateMetrics(): void {
    this.metrics.registrationStats.total = this.registeredAgents.size;
    this.metrics.registrationStats.active = Array.from(this.registeredAgents.values())
      .filter(r => r.registration.status === 'active').length;
    this.metrics.timestamp = new Date();
  }

  private generateRegistrationId(): string {
    return `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCapabilityId(): string {
    return `cap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEndpointId(): string {
    return `ep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateDiscoveryTags(agentInfo: AgentRegistrationRequest): string[] {
    const tags = [agentInfo.agentInfo.type];
    tags.push(...agentInfo.agentInfo.capabilities);
    tags.push(agentInfo.metadata.environment);
    tags.push(agentInfo.metadata.region);
    return tags;
  }

  private generateCapabilityTags(capability: AgentCapability): string[] {
    return [capability.category, capability.name, capability.version];
  }

  private calculateMatchScore(agent: RegisteredAgent, criteria: DiscoveryCriteria): number {
    let score = 0.5; // Base score
    
    // Performance score weight
    if (criteria.minPerformanceScore) {
      score += (agent.agentInfo.performanceScore / 100) * 0.3;
    }
    
    // Response time weight
    if (criteria.maxResponseTime) {
      const responseTimeScore = Math.max(0, 1 - (agent.agentInfo.responseTime / criteria.maxResponseTime));
      score += responseTimeScore * 0.2;
    }
    
    return Math.min(score, 1.0);
  }

  private generateMatchReasons(agent: RegisteredAgent, criteria: DiscoveryCriteria): any[] {
    const reasons = [];
    
    if (agent.agentInfo.performanceScore > 80) {
      reasons.push({
        category: 'performance',
        description: 'High performance score',
        confidence: 0.9
      });
    }
    
    if (agent.agentInfo.currentLoad < 50) {
      reasons.push({
        category: 'availability',
        description: 'Low current load',
        confidence: 0.8
      });
    }
    
    return reasons;
  }

  private calculateDistance(agent: RegisteredAgent, geoPreference?: string): number {
    // Simplified distance calculation
    return Math.random() * 1000; // Random distance for demo
  }

  private getLoadLevel(agentId: string): any {
    const load = this.getCurrentLoad(agentId);
    if (load < 25) return 'low';
    if (load < 50) return 'medium';
    if (load < 75) return 'high';
    return 'overloaded';
  }

  private getHealthStatus(agentId: string): any {
    const health = this.healthResults.get(agentId);
    if (!health) return 'unknown';
    if (health.healthy) return 'healthy';
    if (health.healthScore > 0.5) return 'degraded';
    return 'unhealthy';
  }

  private async applyLoadBalancing(
    agents: any[],
    strategy: LoadBalancingStrategy
  ): Promise<any[]> {
    switch (strategy) {
      case 'round_robin':
        // Implement round-robin logic
        return agents;
      case 'least_loaded':
        return agents.sort((a, b) => this.getCurrentLoad(a.agentInfo.id) - this.getCurrentLoad(b.agentInfo.id));
      case 'performance_based':
        return agents.sort((a, b) => b.agentInfo.performanceScore - a.agentInfo.performanceScore);
      case 'geographic':
        // Implement geographic-based load balancing
        return agents;
      default:
        return agents;
    }
  }

  private generateDiscoveryRecommendations(agents: any[]): any[] {
    const recommendations = [];
    
    if (agents.length > 0) {
      const topAgent = agents[0];
      recommendations.push({
        type: 'performance',
        agentId: topAgent.agentInfo.id,
        reason: 'Highest match score',
        confidence: 0.9
      });
    }
    
    return recommendations;
  }

  private updateDiscoveryMetrics(criteria: DiscoveryCriteria, searchTime: number, resultCount: number): void {
    this.metrics.totalQueries++;
    this.metrics.averageQueryTime = (this.metrics.averageQueryTime + searchTime) / 2;
  }

  private updateRegistrationMetrics(event: 'registered' | 'deregistered' | 'failed'): void {
    // Update registration-specific metrics
  }

  private getTotalCapabilitiesCount(): number {
    let total = 0;
    for (const agentCaps of this.agentCapabilities.values()) {
      total += agentCaps.size;
    }
    return total;
  }

  private getCapabilityAvailability(agentId: string, capabilityId: string): any {
    return {
      available: true,
      capacity: 100,
      currentUtilization: Math.random() * 100
    };
  }

  private calculateCapabilityMatchScore(capability: AgentCapability, query: CapabilityQuery): number {
    let score = 0.5;
    
    if (query.name && capability.name.toLowerCase().includes(query.name.toLowerCase())) {
      score += 0.3;
    }
    
    if (query.category && capability.category === query.category) {
      score += 0.2;
    }
    
    return Math.min(score, 1.0);
  }

  private calculateAverageScore(matches: any[]): number {
    if (matches.length === 0) return 0;
    return matches.reduce((sum, match) => sum + match.matchScore, 0) / matches.length;
  }

  private calculateGeographicDistance(loc1: GeographicLocation, loc2: GeographicLocation): number {
    // Simplified distance calculation using Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(loc2.latitude - loc1.latitude);
    const dLon = this.toRadians(loc2.longitude - loc1.longitude);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(loc1.latitude)) * Math.cos(this.toRadians(loc2.latitude)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private calculateBearing(from: GeographicLocation, to: GeographicLocation): number {
    const dLon = this.toRadians(to.longitude - from.longitude);
    const lat1 = this.toRadians(from.latitude);
    const lat2 = this.toRadians(to.latitude);
    
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    
    return (this.toDegrees(Math.atan2(y, x)) + 360) % 360;
  }

  private toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }

  private estimateTravelTime(distance: number): number {
    // Estimate travel time in minutes (assuming 60 km/h average speed)
    return distance;
  }

  private estimateNetworkLatency(distance: number): number {
    // Estimate network latency in ms (rough approximation)
    return Math.max(1, distance / 100);
  }

  private async notifyPresenceChange(
    agentId: string,
    oldPresence: PresenceInfo | null,
    newPresence: PresenceInfo | null
  ): Promise<void> {
    for (const subscription of this.presenceSubscriptions.values()) {
      if (subscription.agentIds.includes(agentId)) {
        try {
          await subscription.callback(agentId, oldPresence, newPresence!);
        } catch (error) {
          this.logger.error(`Error in presence change callback for subscription: ${subscription.id}`, error);
        }
      }
    }
  }

  private calculateHealthTrends(history: AgentHealthResult[]): any[] {
    if (history.length < 2) return [];
    
    const latest = history[history.length - 1];
    const previous = history[history.length - 2];
    
    return [
      {
        metric: 'healthScore',
        direction: latest.healthScore > previous.healthScore ? 'improving' : 'declining',
        rate: Math.abs(latest.healthScore - previous.healthScore),
        timeframe: '1 period'
      }
    ];
  }

  private identifyHealthIncidents(history: AgentHealthResult[]): any[] {
    const incidents = [];
    
    for (let i = 0; i < history.length; i++) {
      const result = history[i];
      if (!result.healthy) {
        incidents.push({
          id: `incident_${i}`,
          start: result.lastUpdated,
          severity: result.healthScore < 0.3 ? 'critical' : 'moderate',
          description: 'Health check failure detected',
          resolved: i < history.length - 1 && history[i + 1].healthy
        });
      }
    }
    
    return incidents;
  }

  private getCurrentLoad(agentId: string): number {
    const metrics = this.loadMetrics.get(agentId);
    return metrics ? metrics.currentLoad : Math.random() * 100;
  }

  private getCapacity(agentId: string): number {
    const metrics = this.loadMetrics.get(agentId);
    return metrics ? metrics.capacity : 100;
  }

  private getUtilization(agentId: string): number {
    const load = this.getCurrentLoad(agentId);
    const capacity = this.getCapacity(agentId);
    return capacity > 0 ? load / capacity : 0;
  }

  private getLoadTrend(agentId: string): any {
    // Simplified trend calculation
    return 'stable';
  }

  private calculateImbalanceScore(agentLoads: any[]): number {
    if (agentLoads.length === 0) return 0;
    
    const loads = agentLoads.map(al => al.utilization);
    const mean = loads.reduce((sum, load) => sum + load, 0) / loads.length;
    const variance = loads.reduce((sum, load) => sum + Math.pow(load - mean, 2), 0) / loads.length;
    
    return Math.sqrt(variance);
  }

  private generateLoadBalancingRecommendations(agents: any[]): any[] {
    const recommendations = [];
    
    const overloadedAgents = agents.filter(a => this.getUtilization(a.agentInfo.id) > 0.8);
    if (overloadedAgents.length > 0) {
      recommendations.push({
        type: 'scale_up',
        reason: `${overloadedAgents.length} agents are overloaded`,
        expectedBenefit: 'Improved response times and reliability',
        implementation: ['Add more agent instances', 'Redistribute load']
      });
    }
    
    return recommendations;
  }

  private getAverageResponseTime(agentId: string): number {
    const registeredAgent = this.registeredAgents.get(agentId);
    return registeredAgent ? registeredAgent.agentInfo.responseTime : 100;
  }

  private getReliabilityScore(agentId: string): number {
    // Simplified reliability calculation
    return Math.random() * 100;
  }

  private compareHealthStatus(status1: any, status2: any): number {
    const statusOrder = { 'healthy': 3, 'degraded': 2, 'unhealthy': 1, 'unknown': 0 };
    return statusOrder[status1] - statusOrder[status2];
  }

  private generateEndpointRecommendations(endpoints: any[]): any[] {
    const recommendations = [];
    
    if (endpoints.length > 0) {
      const bestEndpoint = endpoints[0];
      recommendations.push({
        endpointId: bestEndpoint.endpoint.id,
        reason: 'Best performance and health metrics',
        priority: 1,
        alternatives: endpoints.slice(1, 3).map(e => e.endpoint.id)
      });
    }
    
    return recommendations;
  }

  private calculateQueryRate(): number {
    // Simplified rate calculation
    return this.metrics.totalQueries / Math.max(1, (Date.now() - this.metrics.timestamp.getTime()) / 1000);
  }

  private calculateAverageResponseTime(): number {
    return this.metrics.averageQueryTime;
  }

  private calculateErrorRate(): number {
    return this.metrics.performanceMetrics.errorRate;
  }

  private calculateCacheHitRate(): number {
    return this.metrics.cacheHitRate;
  }

  private calculateUptime(): number {
    return Date.now() - this.metrics.timestamp.getTime();
  }

  private getTopCapabilities(): string[] {
    const capabilityCount: Record<string, number> = {};
    
    for (const agentCaps of this.agentCapabilities.values()) {
      for (const capability of agentCaps.values()) {
        capabilityCount[capability.name] = (capabilityCount[capability.name] || 0) + 1;
      }
    }
    
    return Object.entries(capabilityCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name]) => name);
  }
}

// Supporting interfaces
interface RegisteredAgent {
  registration: AgentRegistrationResponse;
  agentInfo: AgentInfo;
  metadata: any;
  registeredAt: Date;
  lastSeen: Date;
}
