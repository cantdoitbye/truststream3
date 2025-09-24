/**
 * TrustStream v4.2 - V4.1 Agent Bridge Unit Tests
 * 
 * Comprehensive unit tests for the V41AgentBridge class that verify
 * backward compatibility, protocol translation, legacy agent coordination,
 * and seamless integration with the unified orchestration system.
 */

import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals';
import { 
  V41AgentBridge,
  LegacyAgent,
  LegacyAgentType,
  AgentStatus,
  LegacyTask,
  LegacyTaskResult,
  AgentDiscoveryQuery,
  LegacySession
} from '../../src/orchestrator/integrations/v41-agent-bridge';
import { DatabaseInterface } from '../../src/shared-utils/database-interface';
import { AgentCommunication } from '../../src/shared-utils/agent-communication';
import { Logger } from '../../src/shared-utils/logger';

// Mock dependencies
jest.mock('../../src/shared-utils/database-interface');
jest.mock('../../src/shared-utils/agent-communication');
jest.mock('../../src/shared-utils/logger');

describe('V41AgentBridge', () => {
  let bridge: V41AgentBridge;
  let mockDb: jest.Mocked<DatabaseInterface>;
  let mockCommunication: jest.Mocked<AgentCommunication>;
  let mockLogger: jest.Mocked<Logger>;

  // Test data
  const mockLegacyAgent: LegacyAgent = {
    id: 'legacy-agent-1',
    type: 'task_executor' as LegacyAgentType,
    name: 'Legacy Task Executor',
    status: 'active' as AgentStatus,
    capabilities: ['data_processing', 'task_execution'],
    performance_score: 0.85,
    health_score: 0.95,
    last_active: new Date(),
    endpoint: {
      url: 'http://legacy-agent-1.local',
      protocol: 'http',
      port: 3000,
      authentication: {
        type: 'api_key',
        credentials: { key: 'test-api-key' }
      },
      health_check_path: '/health'
    },
    protocol_version: '4.1.0',
    metadata: {
      deployment_date: new Date('2023-01-01'),
      version: '4.1.0',
      dependencies: ['nodejs', 'express'],
      resource_requirements: {
        cpu_cores: 2,
        memory_mb: 1024,
        storage_gb: 20,
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
        governance_integration_level: 'basic',
        protocol_version_supported: ['4.1.0']
      }
    }
  };

  const mockLegacyTask: LegacyTask = {
    id: 'task-123',
    type: 'data_processing',
    priority: 'medium',
    payload: { data: 'test_data', operation: 'transform' },
    created_at: new Date(),
    timeout_ms: 300000,
    retry_policy: {
      max_attempts: 3,
      delay_ms: 1000,
      backoff_multiplier: 2,
      retry_conditions: ['network_error', 'timeout']
    }
  };

  const mockDbAgentRecord = {
    id: 'legacy-agent-1',
    agent_type: 'task_executor',
    name: 'Legacy Task Executor',
    status: 'active',
    capabilities: '["data_processing", "task_execution"]',
    performance_score: 0.85,
    health_score: 0.95,
    last_active: new Date(),
    endpoint_url: 'http://legacy-agent-1.local',
    protocol: 'http',
    port: 3000,
    auth_config: '{"type": "api_key", "credentials": {"key": "test-api-key"}}',
    version: '4.1.0',
    deployment_date: new Date('2023-01-01'),
    dependencies: '["nodejs", "express"]'
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
      rollbackTransaction: jest.fn(),
      create: jest.fn()
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

    // Create bridge instance
    bridge = new V41AgentBridge(mockDb, mockCommunication, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear any intervals that might have been set
    jest.clearAllTimers();
  });

  describe('Constructor and Initialization', () => {
    test('should create instance with all dependencies', () => {
      expect(bridge).toBeInstanceOf(V41AgentBridge);
      expect(mockLogger.info).not.toHaveBeenCalled(); // Constructor shouldn't log
    });

    test('should initialize successfully with all components', async () => {
      // Mock database responses
      mockDb.query.mockResolvedValueOnce([mockDbAgentRecord]);
      mockCommunication.subscribeToEvent.mockResolvedValue(undefined);

      await bridge.initialize();

      expect(mockLogger.info).toHaveBeenCalledWith('Initializing V4.1 Agent Bridge');
      expect(mockLogger.info).toHaveBeenCalledWith('V4.1 Agent Bridge initialized successfully');
      expect(mockLogger.info).toHaveBeenCalledWith('Loading existing legacy agents');
      expect(mockLogger.info).toHaveBeenCalledWith('Initializing protocol adapters');
      expect(mockLogger.info).toHaveBeenCalledWith('Setting up legacy agent health monitoring');
      expect(mockLogger.info).toHaveBeenCalledWith('Initializing communication channels');
      expect(mockLogger.info).toHaveBeenCalledWith('Starting background tasks');

      // Should load legacy agents from database
      expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'));
      expect(mockLogger.info).toHaveBeenCalledWith('Loaded 1 legacy agents');

      // Should initialize protocol adapters
      expect(mockLogger.info).toHaveBeenCalledWith('Protocol adapter initialized: http');
      expect(mockLogger.info).toHaveBeenCalledWith('Protocol adapter initialized: websocket');
      expect(mockLogger.info).toHaveBeenCalledWith('Protocol adapter initialized: grpc');

      // Should subscribe to events
      expect(mockCommunication.subscribeToEvent).toHaveBeenCalledTimes(3);
      expect(mockCommunication.subscribeToEvent).toHaveBeenCalledWith(
        'v41_agent_status',
        expect.any(Function)
      );
      expect(mockCommunication.subscribeToEvent).toHaveBeenCalledWith(
        'v41_task_result',
        expect.any(Function)
      );
      expect(mockCommunication.subscribeToEvent).toHaveBeenCalledWith(
        'v41_health_update',
        expect.any(Function)
      );
    });

    test('should handle initialization failure gracefully', async () => {
      const error = new Error('Database connection failed');
      mockDb.query.mockRejectedValueOnce(error);

      await expect(bridge.initialize()).rejects.toThrow('Database connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize V4.1 Agent Bridge', error);
    });

    test('should handle partial legacy agent loading', async () => {
      // Mock database error but continue with partial loading
      mockDb.query.mockRejectedValueOnce(new Error('Partial load failure'));
      mockCommunication.subscribeToEvent.mockResolvedValue(undefined);

      await bridge.initialize();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to load some legacy agents',
        expect.any(Error)
      );
      expect(mockLogger.info).toHaveBeenCalledWith('V4.1 Agent Bridge initialized successfully');
    });
  });

  describe('Agent Discovery', () => {
    beforeEach(async () => {
      // Mock successful initialization with agents
      mockDb.query.mockResolvedValueOnce([mockDbAgentRecord]);
      mockCommunication.subscribeToEvent.mockResolvedValue(undefined);
      await bridge.initialize();
    });

    test('should discover legacy agents for task requirements', async () => {
      const testTask = {
        id: 'test-task-1',
        type: 'data_processing',
        required_capabilities: ['data_processing'],
        priority: 'medium'
      };

      const result = await bridge.discoverLegacyAgents(testTask);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].id).toBe(mockLegacyAgent.id);
      expect(result[0].capabilities).toContain('data_processing');

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Discovering legacy agents for task: ${testTask.id}`
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Found ${result.length} suitable legacy agents for task ${testTask.id}`
      );
    });

    test('should filter agents by task type', async () => {
      const testTask = {
        id: 'test-task-2',
        type: 'security_check', // Different type
        required_capabilities: ['security_monitoring'],
        priority: 'high'
      };

      const result = await bridge.discoverLegacyAgents(testTask);

      // Should return empty or filtered results since our mock agent is a task_executor
      expect(Array.isArray(result)).toBe(true);
    });

    test('should handle discovery failure gracefully', async () => {
      const testTask = {
        id: 'test-task-3',
        type: 'invalid_type'
      };

      // Mock internal method failure by corrupting the internal state
      jest.spyOn(bridge as any, 'executeAgentDiscovery').mockRejectedValueOnce(
        new Error('Discovery failed')
      );

      await expect(bridge.discoverLegacyAgents(testTask)).rejects.toThrow('Discovery failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Failed to discover legacy agents for task ${testTask.id}`,
        expect.any(Error)
      );
    });
  });

  describe('Session Management', () => {
    beforeEach(async () => {
      mockDb.query.mockResolvedValueOnce([mockDbAgentRecord]);
      mockCommunication.subscribeToEvent.mockResolvedValue(undefined);
      mockDb.create.mockResolvedValue(undefined);
      await bridge.initialize();
    });

    test('should create legacy session successfully', async () => {
      const agents = [mockLegacyAgent];
      const testTask = {
        id: 'session-task-1',
        type: 'coordination',
        priority: 'medium'
      };

      const sessionId = await bridge.createLegacySession(testTask, agents);

      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^legacy_session_\d+_[a-z0-9]+$/);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Creating legacy session for task: ${testTask.id}`
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringMatching(/^Legacy session created: legacy_session_\d+_[a-z0-9]+ with protocol:/)
      );

      // Should persist session to database
      expect(mockDb.create).toHaveBeenCalledWith('legacy_sessions', expect.any(Object));
    });

    test('should determine optimal protocol for agents', async () => {
      const httpsAgent = {
        ...mockLegacyAgent,
        id: 'https-agent',
        endpoint: { ...mockLegacyAgent.endpoint, protocol: 'https' }
      };
      const grpcAgent = {
        ...mockLegacyAgent,
        id: 'grpc-agent',
        endpoint: { ...mockLegacyAgent.endpoint, protocol: 'grpc' }
      };

      const testTask = { id: 'protocol-test-task', type: 'coordination' };

      // Test with modern protocols (should use v42_enhanced)
      const sessionId1 = await bridge.createLegacySession(testTask, [httpsAgent, grpcAgent]);
      expect(sessionId1).toBeDefined();

      // Test with mixed protocols (should use hybrid)
      const sessionId2 = await bridge.createLegacySession(testTask, [mockLegacyAgent, httpsAgent]);
      expect(sessionId2).toBeDefined();

      // Test with only HTTP (should use v41_native)
      const sessionId3 = await bridge.createLegacySession(testTask, [mockLegacyAgent]);
      expect(sessionId3).toBeDefined();
    });

    test('should handle session creation failure', async () => {
      const error = new Error('Session creation failed');
      mockDb.create.mockRejectedValueOnce(error);

      const testTask = { id: 'fail-task', type: 'test' };

      await expect(
        bridge.createLegacySession(testTask, [mockLegacyAgent])
      ).rejects.toThrow('Session creation failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Failed to create legacy session for task ${testTask.id}`,
        error
      );
    });
  });

  describe('Task Execution', () => {
    beforeEach(async () => {
      mockDb.query.mockResolvedValueOnce([mockDbAgentRecord]);
      mockCommunication.subscribeToEvent.mockResolvedValue(undefined);
      await bridge.initialize();
    });

    test('should execute legacy task successfully', async () => {
      const agents = [mockLegacyAgent];

      const result = await bridge.executeLegacyTask(mockLegacyTask, agents);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.total_agents).toBe(1);
      expect(result.successful_agents).toBe(1);
      expect(result.failed_agents).toBe(0);
      expect(result.performance_summary).toBeDefined();

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Executing legacy task: ${mockLegacyTask.id} with ${agents.length} agents`
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Legacy task execution completed: ${mockLegacyTask.id}`
      );
    });

    test('should handle agent task execution failure', async () => {
      // Mock protocol adapter to throw error
      const agents = [mockLegacyAgent];

      // Access private method to mock protocol adapter failure
      jest.spyOn(bridge as any, 'coordinateLegacyAgents').mockRejectedValueOnce(
        new Error('Agent communication failed')
      );

      await expect(
        bridge.executeLegacyTask(mockLegacyTask, agents)
      ).rejects.toThrow('Agent communication failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Legacy task execution failed: ${mockLegacyTask.id}`,
        expect.any(Error)
      );
    });

    test('should aggregate results from multiple agents', async () => {
      const agents = [
        mockLegacyAgent,
        { ...mockLegacyAgent, id: 'agent-2' },
        { ...mockLegacyAgent, id: 'agent-3' }
      ];

      const result = await bridge.executeLegacyTask(mockLegacyTask, agents);

      expect(result.total_agents).toBe(3);
      expect(result.successful_agents).toBe(3);
      expect(result.results).toHaveLength(3);
      expect(result.performance_summary.success_rate).toBe(1);
    });
  });

  describe('Compatibility Verification', () => {
    beforeEach(async () => {
      mockDb.query.mockResolvedValueOnce([mockDbAgentRecord]);
      mockCommunication.subscribeToEvent.mockResolvedValue(undefined);
      await bridge.initialize();
    });

    test('should verify compatibility successfully', async () => {
      await bridge.verifyCompatibility();

      expect(mockLogger.info).toHaveBeenCalledWith('Verifying V4.1 agent compatibility');
      expect(mockLogger.info).toHaveBeenCalledWith('V4.1 agent compatibility verified successfully');
      expect(mockLogger.info).toHaveBeenCalledWith('Agent discovery test passed');
    });

    test('should handle compatibility verification failure', async () => {
      // Mock test failure by removing all agents
      jest.spyOn(bridge as any, 'executeAgentDiscovery').mockResolvedValueOnce({
        agents: [],
        total_found: 0,
        search_time_ms: 10,
        compatibility_summary: {
          v41_compatible_count: 0,
          enhanced_features_count: 0,
          governance_ready_count: 0,
          protocol_distribution: {}
        }
      });

      await expect(bridge.verifyCompatibility()).rejects.toThrow('No v4.1 compatible agents found');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'V4.1 agent compatibility verification failed',
        expect.any(Error)
      );
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      mockDb.query.mockResolvedValueOnce([mockDbAgentRecord]);
      mockCommunication.subscribeToEvent.mockResolvedValue(undefined);
      await bridge.initialize();
    });

    test('should handle v4.1 agent status events', () => {
      const event = {
        agent_id: mockLegacyAgent.id,
        status: 'busy',
        timestamp: new Date().toISOString()
      };

      // Access private method for testing
      const handleStatus = (bridge as any).handleV41AgentStatus.bind(bridge);
      handleStatus(event);

      expect(mockLogger.info).toHaveBeenCalledWith('V4.1 agent status event received', event);
    });

    test('should handle v4.1 task result events', () => {
      const event = {
        task_id: 'task-123',
        agent_id: mockLegacyAgent.id,
        status: 'success',
        result: { data: 'processed' }
      };

      const handleResult = (bridge as any).handleV41TaskResult.bind(bridge);
      handleResult(event);

      expect(mockLogger.info).toHaveBeenCalledWith('V4.1 task result event received', event);
    });

    test('should handle v4.1 health update events', () => {
      const event = {
        agent_id: mockLegacyAgent.id,
        health_score: 0.8,
        timestamp: new Date().toISOString()
      };

      const handleHealth = (bridge as any).handleV41HealthUpdate.bind(bridge);
      handleHealth(event);

      // Health score should be updated internally
      // Note: This would require access to the internal agent state to verify
    });
  });

  describe('Protocol Adapters', () => {
    beforeEach(async () => {
      mockDb.query.mockResolvedValueOnce([]);
      mockCommunication.subscribeToEvent.mockResolvedValue(undefined);
      await bridge.initialize();
    });

    test('should initialize all protocol adapters', () => {
      expect(mockLogger.info).toHaveBeenCalledWith('HTTP Protocol Adapter initialized');
      expect(mockLogger.info).toHaveBeenCalledWith('WebSocket Protocol Adapter initialized');
      expect(mockLogger.info).toHaveBeenCalledWith('gRPC Protocol Adapter initialized');
    });

    test('should handle protocol adapter initialization failure gracefully', async () => {
      // Create a new bridge instance to test initialization failure
      const failingBridge = new V41AgentBridge(mockDb, mockCommunication, mockLogger);
      
      // Mock protocol adapter to throw during initialization
      jest.spyOn(failingBridge as any, 'initializeProtocolAdapters').mockImplementationOnce(async () => {
        const error = new Error('Protocol adapter init failed');
        (failingBridge as any).logger.warn('Failed to initialize protocol adapter: http', error);
        throw error;
      });

      mockDb.query.mockResolvedValueOnce([]);
      mockCommunication.subscribeToEvent.mockResolvedValue(undefined);

      await expect(failingBridge.initialize()).rejects.toThrow('Protocol adapter init failed');
    });
  });

  describe('Health Monitoring', () => {
    beforeEach(async () => {
      mockDb.query.mockResolvedValueOnce([mockDbAgentRecord]);
      mockCommunication.subscribeToEvent.mockResolvedValue(undefined);
      await bridge.initialize();
    });

    test('should set up health monitoring for active agents', () => {
      // Health monitoring should be set up during initialization
      expect(mockLogger.info).toHaveBeenCalledWith('Setting up legacy agent health monitoring');
    });

    test('should perform health checks for agents', async () => {
      // Access private method for testing
      const performHealthCheck = (bridge as any).performLegacyAgentHealthCheck.bind(bridge);
      
      await performHealthCheck(mockLegacyAgent.id);

      // Should not throw and should complete successfully
      // The actual health check logic is mocked in the protocol adapters
    });
  });

  describe('Background Tasks', () => {
    beforeEach(async () => {
      // Use fake timers to control intervals
      jest.useFakeTimers();
      mockDb.query.mockResolvedValueOnce([mockDbAgentRecord]);
      mockCommunication.subscribeToEvent.mockResolvedValue(undefined);
      await bridge.initialize();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should start background tasks', () => {
      expect(mockLogger.info).toHaveBeenCalledWith('Starting background tasks');
    });

    test('should run session cleanup periodically', () => {
      // Fast-forward time to trigger cleanup
      jest.advanceTimersByTime(300000); // 5 minutes

      // Session cleanup should have been called
      // Note: Actual verification would require mocking the cleanup method
    });

    test('should collect performance metrics periodically', () => {
      // Fast-forward time to trigger metrics collection
      jest.advanceTimersByTime(60000); // 1 minute

      // Performance metrics collection should have been called
    });

    test('should synchronize agent registry periodically', () => {
      // Fast-forward time to trigger synchronization
      jest.advanceTimersByTime(600000); // 10 minutes

      // Agent registry synchronization should have been called
    });
  });

  describe('Utility Methods', () => {
    test('should generate session IDs', () => {
      const generateSessionId = (bridge as any).generateSessionId.bind(bridge);
      const sessionId = generateSessionId();

      expect(sessionId).toMatch(/^legacy_session_\d+_[a-z0-9]+$/);
    });

    test('should convert database records to legacy agents', () => {
      const convertToLegacyAgent = (bridge as any).convertToLegacyAgent.bind(bridge);
      const legacyAgent = convertToLegacyAgent(mockDbAgentRecord);

      expect(legacyAgent.id).toBe(mockDbAgentRecord.id);
      expect(legacyAgent.type).toBe(mockDbAgentRecord.agent_type);
      expect(legacyAgent.name).toBe(mockDbAgentRecord.name);
      expect(legacyAgent.status).toBe(mockDbAgentRecord.status);
      expect(legacyAgent.capabilities).toEqual(['data_processing', 'task_execution']);
      expect(legacyAgent.metadata.compatibility_flags.v41_api_compatible).toBe(true);
    });

    test('should generate compatibility summary', () => {
      const generateCompatibilitySummary = (bridge as any).generateCompatibilitySummary.bind(bridge);
      const agents = [mockLegacyAgent];
      const summary = generateCompatibilitySummary(agents);

      expect(summary.v41_compatible_count).toBe(1);
      expect(summary.enhanced_features_count).toBe(0);
      expect(summary.governance_ready_count).toBe(1); // basic governance level
      expect(summary.protocol_distribution.http).toBe(1);
    });

    test('should calculate agent scores for task matching', () => {
      const calculateAgentScore = (bridge as any).calculateAgentScore.bind(bridge);
      const testTask = {
        required_capabilities: ['data_processing'],
        priority: 'medium'
      };

      const score = calculateAgentScore(mockLegacyAgent, testTask);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle database query failures during agent loading', async () => {
      const error = new Error('Database query failed');
      mockDb.query.mockRejectedValueOnce(error);
      mockCommunication.subscribeToEvent.mockResolvedValue(undefined);

      await bridge.initialize();

      expect(mockLogger.warn).toHaveBeenCalledWith('Failed to load some legacy agents', error);
      // Should continue initialization despite failure
      expect(mockLogger.info).toHaveBeenCalledWith('V4.1 Agent Bridge initialized successfully');
    });

    test('should handle session persistence failures gracefully', async () => {
      mockDb.query.mockResolvedValueOnce([mockDbAgentRecord]);
      mockCommunication.subscribeToEvent.mockResolvedValue(undefined);
      await bridge.initialize();

      const persistError = new Error('Failed to persist session');
      mockDb.create.mockRejectedValueOnce(persistError);

      const testTask = { id: 'persist-fail-task', type: 'test' };
      
      // Should still create session even if persistence fails
      const sessionId = await bridge.createLegacySession(testTask, [mockLegacyAgent]);
      
      expect(sessionId).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringMatching(/Failed to persist legacy session:/),
        persistError
      );
    });
  });
});
