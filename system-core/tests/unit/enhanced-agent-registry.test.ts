/**
 * TrustStream v4.2 - Enhanced Agent Registry Unit Tests
 * 
 * Comprehensive unit tests for the EnhancedAgentRegistry class that verify
 * governance capabilities, v4.1 compatibility, trust score management,
 * and agent discovery functionality.
 */

import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals';
import { 
  EnhancedAgentRegistry,
  EnhancedAgentRegistration,
  EnhancedAgentDiscoveryQuery,
  GovernanceCapability,
  TrustScoreUpdate,
  TrustScoreHistory,
  GovernanceCompliance
} from '../../src/orchestrator/enhanced-agent-registry';
import { GovernanceAgent, GovernanceAgentType } from '../../src/orchestrator/governance-orchestrator';
import { V41AgentBridge, LegacyAgent } from '../../src/orchestrator/integrations/v41-agent-bridge';
import { DatabaseInterface } from '../../src/shared-utils/database-interface';
import { AgentCommunication } from '../../src/shared-utils/agent-communication';
import { Logger } from '../../src/shared-utils/logger';

// Mock dependencies
jest.mock('../../src/shared-utils/database-interface');
jest.mock('../../src/shared-utils/agent-communication');
jest.mock('../../src/shared-utils/logger');
jest.mock('../../src/orchestrator/integrations/v41-agent-bridge');

describe('EnhancedAgentRegistry', () => {
  let enhancedRegistry: EnhancedAgentRegistry;
  let mockDb: jest.Mocked<DatabaseInterface>;
  let mockCommunication: jest.Mocked<AgentCommunication>;
  let mockLogger: jest.Mocked<Logger>;
  let mockV41Bridge: jest.Mocked<V41AgentBridge>;

  // Test data
  const mockGovernanceAgent: GovernanceAgent = {
    id: 'governance-agent-1',
    name: 'Test Governance Agent',
    type: 'accountability_agent' as GovernanceAgentType,
    endpoint: {
      protocol: 'https',
      host: 'governance-agent-1.local',
      port: 8080,
      path: '/api'
    },
    trust_scores: {
      iq_score: 0.85,
      appeal_score: 0.8,
      social_score: 0.75,
      humanity_score: 0.9
    },
    governance_config: {
      governance_domains: ['task_quality', 'compliance'],
      accountability_level: 'high',
      transparency_requirements: ['decision_logging', 'audit_trail'],
      quality_standards: {
        min_quality_threshold: 0.8,
        validation_requirements: ['peer_review', 'automated_testing']
      }
    },
    capabilities: ['task_validation', 'quality_assessment', 'compliance_monitoring'],
    status: 'ready',
    version: '4.2.0',
    last_heartbeat: new Date(),
    performance_metrics: {
      total_tasks: 100,
      successful_tasks: 95,
      success_rate: 0.95,
      average_response_time: 250,
      average_quality_score: 0.88
    }
  };

  const mockGovernanceCapabilities: GovernanceCapability[] = [
    {
      capability_id: 'cap-1',
      governance_domain: 'accountability_agent',
      capability_name: 'Task Validation',
      description: 'Validates task completion and quality',
      trust_requirements: {
        min_iq_score: 0.8,
        min_appeal_score: 0.7,
        min_social_score: 0.7,
        min_humanity_score: 0.8
      },
      quality_guarantees: [{
        metric: 'accuracy',
        threshold: 0.95,
        unit: 'percentage',
        sla_level: 'gold'
      }],
      compliance_certifications: [{
        certification_name: 'Governance V1',
        issuer: 'TrustStream Foundation',
        issued_date: new Date('2024-01-01'),
        expiry_date: new Date('2025-01-01'),
        status: 'active'
      }],
      performance_benchmarks: [{
        benchmark_name: 'validation_speed',
        target_value: 300,
        current_value: 250,
        measurement_unit: 'ms',
        last_measured: new Date()
      }]
    }
  ];

  const mockLegacyAgent: LegacyAgent = {
    id: 'legacy-agent-1',
    name: 'Legacy Agent 1',
    endpoint: {
      protocol: 'http',
      host: 'legacy-agent-1.local',
      port: 3000,
      path: '/api/v1'
    },
    capabilities: ['basic_task_execution'],
    status: 'active',
    version: '4.1.0',
    last_heartbeat: new Date(),
    performance_metrics: {
      total_tasks: 200,
      successful_tasks: 190,
      success_rate: 0.95,
      average_response_time: 180
    }
  };

  beforeEach(() => {
    // Create mock instances
    mockDb = {
      initialize: jest.fn(),
      cleanup: jest.fn(),
      query: jest.fn(),
      execute: jest.fn(),
      transaction: jest.fn(),
      beginTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn()
    } as jest.Mocked<DatabaseInterface>;

    mockCommunication = {
      initialize: jest.fn(),
      sendMessage: jest.fn(),
      subscribeToEvent: jest.fn(),
      unsubscribeFromEvent: jest.fn(),
      broadcastMessage: jest.fn(),
      createChannel: jest.fn(),
      closeChannel: jest.fn()
    } as jest.Mocked<AgentCommunication>;

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    } as jest.Mocked<Logger>;

    mockV41Bridge = {
      initialize: jest.fn(),
      getAllAgents: jest.fn(),
      discoverLegacyAgents: jest.fn(),
      registerLegacyAgent: jest.fn(),
      getLegacyAgentMetrics: jest.fn(),
      bridgeGovernanceCall: jest.fn()
    } as jest.Mocked<V41AgentBridge>;

    // Create registry instance
    enhancedRegistry = new EnhancedAgentRegistry(
      mockDb,
      mockCommunication,
      mockLogger,
      mockV41Bridge
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor and Initialization', () => {
    test('should create instance with all dependencies', () => {
      expect(enhancedRegistry).toBeInstanceOf(EnhancedAgentRegistry);
      expect(mockLogger.info).not.toHaveBeenCalled(); // Constructor shouldn't log
    });

    test('should initialize successfully with all components', async () => {
      // Mock database responses
      mockDb.query.mockResolvedValueOnce([]); // governance agents
      mockV41Bridge.getAllAgents.mockResolvedValueOnce([mockLegacyAgent]);
      mockCommunication.subscribeToEvent.mockResolvedValue(undefined);

      await enhancedRegistry.initialize();

      expect(mockLogger.info).toHaveBeenCalledWith('Initializing Enhanced Agent Registry');
      expect(mockLogger.info).toHaveBeenCalledWith('Enhanced Agent Registry initialized successfully');
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM governance_agents WHERE status IN ($1, $2)',
        ['active', 'busy']
      );
      expect(mockV41Bridge.getAllAgents).toHaveBeenCalled();
      expect(mockCommunication.subscribeToEvent).toHaveBeenCalledTimes(3); // 3 event subscriptions
    });

    test('should handle initialization failure gracefully', async () => {
      const error = new Error('Database connection failed');
      mockDb.query.mockRejectedValueOnce(error);

      await expect(enhancedRegistry.initialize()).rejects.toThrow('Database connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize Enhanced Agent Registry', error);
    });
  });

  describe('Agent Registration', () => {
    beforeEach(async () => {
      // Mock successful initialization
      mockDb.query.mockResolvedValue([]);
      mockV41Bridge.getAllAgents.mockResolvedValue([]);
      mockCommunication.subscribeToEvent.mockResolvedValue(undefined);
      await enhancedRegistry.initialize();
    });

    test('should register governance agent successfully', async () => {
      const registration = await enhancedRegistry.registerGovernanceAgent(
        mockGovernanceAgent,
        mockGovernanceCapabilities
      );

      expect(registration).toBeDefined();
      expect(registration.agent_id).toBe(mockGovernanceAgent.id);
      expect(registration.governance_capabilities).toEqual(mockGovernanceCapabilities);
      expect(registration.trust_score_history).toBeDefined();
      expect(registration.governance_compliance).toBeDefined();
      expect(registration.v41_compatibility).toBeDefined();
      expect(registration.performance_analytics).toBeDefined();

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Registering governance agent: ${mockGovernanceAgent.id}`,
        { type: mockGovernanceAgent.type }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Governance agent registered successfully: ${mockGovernanceAgent.id}`
      );
    });

    test('should handle agent registration failure', async () => {
      // Mock base registry failure
      const error = new Error('Registration failed');
      jest.spyOn(enhancedRegistry as any, 'registerAgent').mockRejectedValueOnce(error);

      await expect(
        enhancedRegistry.registerGovernanceAgent(mockGovernanceAgent, mockGovernanceCapabilities)
      ).rejects.toThrow('Registration failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Failed to register governance agent: ${mockGovernanceAgent.id}`,
        error
      );
    });
  });

  describe('Agent Discovery', () => {
    beforeEach(async () => {
      // Mock successful initialization with agents
      mockDb.query.mockResolvedValue([mockGovernanceAgent]);
      mockV41Bridge.getAllAgents.mockResolvedValue([mockLegacyAgent]);
      mockCommunication.subscribeToEvent.mockResolvedValue(undefined);
      await enhancedRegistry.initialize();

      // Register a governance agent for discovery tests
      await enhancedRegistry.registerGovernanceAgent(mockGovernanceAgent, mockGovernanceCapabilities);
    });

    test('should discover governance agents with basic query', async () => {
      const query: EnhancedAgentDiscoveryQuery = {
        governance_domains: ['accountability_agent'],
        capabilities: ['task_validation']
      };

      const result = await enhancedRegistry.discoverEnhancedAgents(query);

      expect(result).toBeDefined();
      expect(result.governance_agents).toBeDefined();
      expect(result.governance_agents.length).toBeGreaterThan(0);
      expect(result.trust_analytics).toBeDefined();
      expect(result.governance_coverage).toBeDefined();
      expect(result.query_time_ms).toBeGreaterThan(0);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Discovering agents with enhanced capabilities',
        query
      );
    });

    test('should discover with trust score requirements', async () => {
      const query: EnhancedAgentDiscoveryQuery = {
        trust_score_requirements: {
          min_composite_score: 0.8,
          min_iq_score: 0.8
        },
        governance_domains: ['accountability_agent']
      };

      const result = await enhancedRegistry.discoverEnhancedAgents(query);

      expect(result).toBeDefined();
      expect(result.governance_agents).toBeDefined();
      // Should filter based on trust scores
    });

    test('should discover with v4.1 compatibility requirement', async () => {
      mockV41Bridge.discoverLegacyAgents.mockResolvedValueOnce([mockLegacyAgent]);

      const query: EnhancedAgentDiscoveryQuery = {
        v41_compatibility_required: true,
        capabilities: ['basic_task_execution']
      };

      const result = await enhancedRegistry.discoverEnhancedAgents(query);

      expect(result).toBeDefined();
      expect(result.legacy_agents).toBeDefined();
      expect(result.hybrid_coordination_options).toBeDefined();
      expect(mockV41Bridge.discoverLegacyAgents).toHaveBeenCalled();
    });

    test('should handle discovery errors gracefully', async () => {
      const error = new Error('Discovery failed');
      // Mock internal method failure
      jest.spyOn(enhancedRegistry as any, 'discoverGovernanceAgents').mockRejectedValueOnce(error);

      const query: EnhancedAgentDiscoveryQuery = {
        governance_domains: ['accountability_agent']
      };

      await expect(enhancedRegistry.discoverEnhancedAgents(query)).rejects.toThrow('Discovery failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Enhanced agent discovery failed', error);
    });
  });

  describe('Agent Metrics', () => {
    beforeEach(async () => {
      // Mock successful initialization and registration
      mockDb.query.mockResolvedValue([]);
      mockV41Bridge.getAllAgents.mockResolvedValue([]);
      mockCommunication.subscribeToEvent.mockResolvedValue(undefined);
      await enhancedRegistry.initialize();
      await enhancedRegistry.registerGovernanceAgent(mockGovernanceAgent, mockGovernanceCapabilities);
    });

    test('should get enhanced agent metrics successfully', async () => {
      // Mock base registry metrics
      jest.spyOn(enhancedRegistry, 'getAgentMetrics').mockReturnValueOnce({
        agent_id: mockGovernanceAgent.id,
        total_tasks: 100,
        successful_tasks: 95,
        success_rate: 0.95,
        average_response_time: 250,
        last_activity: new Date(),
        status: 'ready',
        health_score: 0.95
      });

      const metrics = await enhancedRegistry.getEnhancedAgentMetrics(mockGovernanceAgent.id);

      expect(metrics).toBeDefined();
      expect(metrics.agent_id).toBe(mockGovernanceAgent.id);
      expect(metrics.governance_metrics).toBeDefined();
      expect(metrics.trust_score_analytics).toBeDefined();
      expect(metrics.compliance_status).toBeDefined();
      expect(metrics.optimization_opportunities).toBeDefined();
    });

    test('should handle metrics request for non-existent agent', async () => {
      jest.spyOn(enhancedRegistry, 'getAgentMetrics').mockReturnValueOnce(null);

      await expect(
        enhancedRegistry.getEnhancedAgentMetrics('non-existent-agent')
      ).rejects.toThrow('Agent not found: non-existent-agent');
    });
  });

  describe('Trust Score Management', () => {
    beforeEach(async () => {
      // Mock successful initialization and registration
      mockDb.query.mockResolvedValue([]);
      mockV41Bridge.getAllAgents.mockResolvedValue([]);
      mockCommunication.subscribeToEvent.mockResolvedValue(undefined);
      await enhancedRegistry.initialize();
      await enhancedRegistry.registerGovernanceAgent(mockGovernanceAgent, mockGovernanceCapabilities);
    });

    test('should update trust scores successfully', async () => {
      const trustUpdate: TrustScoreUpdate = {
        iq_score: 0.9,
        appeal_score: 0.85,
        social_score: 0.8,
        humanity_score: 0.95
      };

      await enhancedRegistry.updateAgentTrustScores(
        mockGovernanceAgent.id,
        trustUpdate,
        'performance_evaluation'
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Updating trust scores for agent: ${mockGovernanceAgent.id}`,
        { context: 'performance_evaluation' }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Trust scores updated successfully for agent: ${mockGovernanceAgent.id}`
      );
    });

    test('should handle trust score validation errors', async () => {
      const invalidTrustUpdate = {
        iq_score: 1.5, // Invalid score > 1
        appeal_score: 0.85,
        social_score: 0.8,
        humanity_score: 0.95
      };

      // Mock validation to throw error
      jest.spyOn(enhancedRegistry as any, 'validateTrustScores').mockImplementationOnce(() => {
        throw new Error('Invalid trust score: iq_score must be between 0 and 1');
      });

      await expect(
        enhancedRegistry.updateAgentTrustScores(
          mockGovernanceAgent.id,
          invalidTrustUpdate as TrustScoreUpdate,
          'test'
        )
      ).rejects.toThrow('Invalid trust score: iq_score must be between 0 and 1');

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Failed to update trust scores for agent: ${mockGovernanceAgent.id}`,
        expect.any(Error)
      );
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      // Mock successful initialization
      mockDb.query.mockResolvedValue([]);
      mockV41Bridge.getAllAgents.mockResolvedValue([]);
      mockCommunication.subscribeToEvent.mockResolvedValue(undefined);
      await enhancedRegistry.initialize();
    });

    test('should handle governance task completion event', () => {
      const event = {
        agent_id: 'governance-agent-1',
        task_result: { success: true, quality_score: 0.9 },
        trust_impact: { iq_impact: 0.05 }
      };

      // Access private method for testing
      const handleTaskCompletion = (enhancedRegistry as any).handleGovernanceTaskCompletion.bind(enhancedRegistry);
      handleTaskCompletion(event);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Governance task completion event received',
        event
      );
    });

    test('should handle trust score violation event', () => {
      const event = {
        agent_id: 'governance-agent-1',
        violation: { 
          severity: 'critical',
          type: 'trust_score_drop',
          details: 'Significant trust score decrease detected'
        }
      };

      // Access private method for testing
      const handleViolation = (enhancedRegistry as any).handleTrustScoreViolation.bind(enhancedRegistry);
      handleViolation(event);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Trust score violation detected',
        event
      );
    });

    test('should handle compliance audit required event', () => {
      const event = {
        agent_id: 'governance-agent-1',
        audit_type: 'compliance_review'
      };

      // Access private method for testing
      const handleAudit = (enhancedRegistry as any).handleComplianceAuditRequired.bind(enhancedRegistry);
      handleAudit(event);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Compliance audit required',
        event
      );
    });
  });

  describe('Utility Methods', () => {
    test('should calculate average correctly', () => {
      const calculateAverage = (enhancedRegistry as any).calculateAverage.bind(enhancedRegistry);
      
      expect(calculateAverage([1, 2, 3, 4, 5])).toBe(3);
      expect(calculateAverage([0.5, 0.7, 0.9])).toBeCloseTo(0.7, 2);
      expect(calculateAverage([])).toBe(0);
    });

    test('should calculate variance correctly', () => {
      const calculateVariance = (enhancedRegistry as any).calculateVariance.bind(enhancedRegistry);
      
      expect(calculateVariance([1, 2, 3, 4, 5])).toBeCloseTo(2, 1);
      expect(calculateVariance([])).toBe(0);
    });

    test('should determine overall trend correctly', () => {
      const determineOverallTrend = (enhancedRegistry as any).determineOverallTrend.bind(enhancedRegistry);
      
      const improvingTrustScores: TrustScoreHistory[] = [
        { trend_analysis: { trend_direction: 'improving' } } as TrustScoreHistory,
        { trend_analysis: { trend_direction: 'improving' } } as TrustScoreHistory,
        { trend_analysis: { trend_direction: 'stable' } } as TrustScoreHistory
      ];
      
      const decliningTrustScores: TrustScoreHistory[] = [
        { trend_analysis: { trend_direction: 'declining' } } as TrustScoreHistory,
        { trend_analysis: { trend_direction: 'declining' } } as TrustScoreHistory,
        { trend_analysis: { trend_direction: 'stable' } } as TrustScoreHistory
      ];
      
      const stableTrustScores: TrustScoreHistory[] = [
        { trend_analysis: { trend_direction: 'improving' } } as TrustScoreHistory,
        { trend_analysis: { trend_direction: 'declining' } } as TrustScoreHistory,
        { trend_analysis: { trend_direction: 'stable' } } as TrustScoreHistory
      ];

      expect(determineOverallTrend(improvingTrustScores)).toBe('improving');
      expect(determineOverallTrend(decliningTrustScores)).toBe('declining');
      expect(determineOverallTrend(stableTrustScores)).toBe('stable');
    });

    test('should get default trust scores', () => {
      const getDefaultTrustScores = (enhancedRegistry as any).getDefaultTrustScores.bind(enhancedRegistry);
      const defaults = getDefaultTrustScores();

      expect(defaults).toBeDefined();
      expect(defaults.iq_score).toBe(0.8);
      expect(defaults.appeal_score).toBe(0.7);
      expect(defaults.social_score).toBe(0.75);
      expect(defaults.humanity_score).toBe(0.85);
      expect(defaults.composite_score).toBe(0.78);
      expect(defaults.validation_status).toBe('validated');
      expect(defaults.trend_analysis.trend_direction).toBe('stable');
    });
  });

  describe('Helper Class Integration', () => {
    test('should integrate with TrustScoreTracker', async () => {
      // Test would verify integration with TrustScoreTracker
      // This is more of an integration test, but verifies the registry calls the tracker correctly
      mockDb.query.mockResolvedValue([]);
      mockV41Bridge.getAllAgents.mockResolvedValue([]);
      mockCommunication.subscribeToEvent.mockResolvedValue(undefined);
      
      await enhancedRegistry.initialize();
      
      // Verify trust score tracker is initialized
      expect(mockLogger.info).toHaveBeenCalledWith('Trust Score Tracker initialized');
    });

    test('should integrate with GovernanceComplianceMonitor', async () => {
      mockDb.query.mockResolvedValue([]);
      mockV41Bridge.getAllAgents.mockResolvedValue([]);
      mockCommunication.subscribeToEvent.mockResolvedValue(undefined);
      
      await enhancedRegistry.initialize();
      
      // Verify compliance monitor is initialized
      expect(mockLogger.info).toHaveBeenCalledWith('Governance Compliance Monitor initialized');
    });

    test('should integrate with PerformanceAnalyticsEngine', async () => {
      mockDb.query.mockResolvedValue([]);
      mockV41Bridge.getAllAgents.mockResolvedValue([]);
      mockCommunication.subscribeToEvent.mockResolvedValue(undefined);
      
      await enhancedRegistry.initialize();
      
      // Verify performance analytics engine is initialized
      expect(mockLogger.info).toHaveBeenCalledWith('Performance Analytics Engine initialized');
    });
  });
});
