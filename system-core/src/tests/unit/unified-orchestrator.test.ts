/**
 * TrustStream v4.2 - Unified Orchestrator Unit Tests
 * 
 * Unit tests for the UnifiedOrchestrator class to verify individual component
 * functionality, orchestration modes, and integration capabilities.
 */

import { describe, beforeEach, afterEach, test, expect, jest, beforeAll, afterAll } from '@jest/globals';
import { UnifiedOrchestrator, UnifiedTask, OrchestrationConfig, UnifiedOrchestrationResult } from '../../src/orchestrator/unified-orchestrator';
import { DatabaseInterface } from '../../src/shared-utils/database-interface';
import { AgentCommunication } from '../../src/shared-utils/agent-communication';
import { Logger } from '../../src/shared-utils/logger';

describe('UnifiedOrchestrator', () => {
  let orchestrator: UnifiedOrchestrator;
  let mockDb: DatabaseInterface;
  let mockCommunication: AgentCommunication;
  let mockLogger: Logger;
  let orchestrationConfig: OrchestrationConfig;

  beforeAll(() => {
    // Setup mocks
    mockDb = {
      query: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    } as any;

    mockCommunication = {
      sendMessage: jest.fn(),
      subscribeToEvent: jest.fn(),
      publishEvent: jest.fn(),
      createChannel: jest.fn(),
      closeChannel: jest.fn()
    } as any;

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    } as any;
  });

  beforeEach(async () => {
    orchestrationConfig = {
      enable_governance_features: true,
      v41_compatibility_mode: true,
      memory_integration_enabled: true,
      performance_monitoring_enhanced: true,
      backward_compatibility_strict: true,
      governance_memory_zones: ['governance-decisions-zone', 'accountability-tracking-zone'],
      trust_scoring_enabled: true
    };

    orchestrator = new UnifiedOrchestrator(
      mockDb,
      mockCommunication,
      mockLogger,
      orchestrationConfig,
      'http://localhost:54321',
      'test_service_key'
    );

    // Mock database responses
    (mockDb.query as jest.Mock).mockResolvedValue([]);
    (mockDb.create as jest.Mock).mockResolvedValue({ id: 'test_id' });
    (mockDb.update as jest.Mock).mockResolvedValue({ id: 'test_id' });
    (mockCommunication.subscribeToEvent as jest.Mock).mockResolvedValue(undefined);
    (mockCommunication.publishEvent as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize successfully with all components', async () => {
      await expect(orchestrator.initialize()).resolves.not.toThrow();
      
      expect(mockLogger.info).toHaveBeenCalledWith('Initializing Unified Orchestrator with v4.1 integration');
      expect(mockLogger.info).toHaveBeenCalledWith('Unified Orchestrator initialized successfully');
    });

    test('should handle initialization failures gracefully', async () => {
      // Mock a database failure
      (mockDb.query as jest.Mock).mockRejectedValue(new Error('Database connection failed'));
      
      await expect(orchestrator.initialize()).rejects.toThrow('Database connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize Unified Orchestrator', expect.any(Error));
    });

    test('should set up all required communication channels', async () => {
      await orchestrator.initialize();
      
      expect(mockCommunication.subscribeToEvent).toHaveBeenCalledWith('task_completion', expect.any(Function));
      expect(mockCommunication.subscribeToEvent).toHaveBeenCalledWith('agent_status_change', expect.any(Function));
      expect(mockCommunication.subscribeToEvent).toHaveBeenCalledWith('governance_decision', expect.any(Function));
      expect(mockCommunication.subscribeToEvent).toHaveBeenCalledWith('v41_legacy_event', expect.any(Function));
    });
  });

  describe('Task Orchestration', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    test('should orchestrate legacy v4.1 tasks correctly', async () => {
      const legacyTask: UnifiedTask = {
        id: 'legacy_test_001',
        type: 'ai_coordination',
        category: 'legacy_v41',
        priority: 'medium',
        payload: { test: 'legacy_orchestration' },
        v41_compatibility: {
          use_legacy_api: true,
          memory_integration_mode: 'full',
          agent_coordination_legacy: true,
          performance_monitoring_v41: true
        },
        created_at: new Date(),
        status: 'pending',
        assigned_agents: []
      };

      const result = await orchestrator.orchestrateTask(legacyTask);

      expect(result.orchestration_mode).toBe('v41_legacy');
      expect(result.task_id).toBe('legacy_test_001');
      expect(result.status).toBe('completed');
      expect(result.assigned_agents).toBeDefined();
      expect(result.estimated_completion).toBeInstanceOf(Date);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Orchestrating unified task: legacy_test_001',
        { type: 'ai_coordination', category: 'legacy_v41' }
      );
    });

    test('should orchestrate governance tasks correctly', async () => {
      const governanceTask: UnifiedTask = {
        id: 'governance_test_001',
        type: 'quality_assessment',
        category: 'governance',
        priority: 'high',
        payload: { assessment_criteria: ['accuracy', 'timeliness'] },
        governance_requirements: {
          trust_score_minimum: 0.8,
          transparency_level: 'public',
          accountability_required: true,
          quality_threshold: 0.9
        },
        created_at: new Date(),
        status: 'pending',
        assigned_agents: []
      };

      const result = await orchestrator.orchestrateTask(governanceTask);

      expect(result.orchestration_mode).toBe('governance');
      expect(result.task_id).toBe('governance_test_001');
      expect(result.governance_context).toBeDefined();
      expect(result.governance_context?.trust_requirements).toBeDefined();
      expect(result.governance_context?.trust_requirements.composite_trust_threshold).toBe(0.8);
      expect(result.memory_integration?.governance_memory_id).toBeDefined();
      expect(result.memory_integration?.trust_score_snapshot).toBeDefined();
    });

    test('should orchestrate unified tasks with both v4.1 and governance features', async () => {
      const unifiedTask: UnifiedTask = {
        id: 'unified_test_001',
        type: 'governance_enhanced_coordination',
        category: 'hybrid',
        priority: 'critical',
        payload: { 
          coordination_scope: 'system_wide',
          governance_oversight: true,
          legacy_integration: true
        },
        governance_requirements: {
          trust_score_minimum: 0.85,
          transparency_level: 'restricted',
          accountability_required: true,
          quality_threshold: 0.9
        },
        v41_compatibility: {
          use_legacy_api: false,
          memory_integration_mode: 'full',
          agent_coordination_legacy: false,
          performance_monitoring_v41: true
        },
        created_at: new Date(),
        status: 'pending',
        assigned_agents: []
      };

      const result = await orchestrator.orchestrateTask(unifiedTask);

      expect(result.orchestration_mode).toBe('unified');
      expect(result.task_id).toBe('unified_test_001');
      expect(result.governance_context).toBeDefined();
      expect(result.memory_integration?.v41_memory_id).toBeDefined();
      expect(result.memory_integration?.governance_memory_id).toBeDefined();
      expect(result.memory_integration?.memory_bridge_active).toBe(true);
    });

    test('should handle task orchestration failures gracefully', async () => {
      const invalidTask: UnifiedTask = {
        id: 'invalid_test_001',
        type: 'invalid_type' as any,
        category: 'governance',
        priority: 'medium',
        payload: {},
        governance_requirements: {
          trust_score_minimum: 1.5, // Invalid - greater than 1.0
          transparency_level: 'public',
          accountability_required: true,
          quality_threshold: 0.8
        },
        created_at: new Date(),
        status: 'pending',
        assigned_agents: []
      };

      await expect(orchestrator.orchestrateTask(invalidTask)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Task orchestration failed: invalid_test_001',
        expect.any(Error)
      );
    });
  });

  describe('Orchestration Mode Determination', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    test('should determine v4.1 legacy mode for legacy tasks', async () => {
      const legacyTask: UnifiedTask = {
        id: 'mode_test_001',
        type: 'memory_management',
        category: 'legacy_v41',
        priority: 'low',
        payload: {},
        created_at: new Date(),
        status: 'pending',
        assigned_agents: []
      };

      const result = await orchestrator.orchestrateTask(legacyTask);
      expect(result.orchestration_mode).toBe('v41_legacy');
    });

    test('should determine governance mode for governance tasks', async () => {
      const governanceTask: UnifiedTask = {
        id: 'mode_test_002',
        type: 'transparency_audit',
        category: 'governance',
        priority: 'high',
        payload: {},
        governance_requirements: {
          trust_score_minimum: 0.7,
          transparency_level: 'public',
          accountability_required: true,
          quality_threshold: 0.8
        },
        created_at: new Date(),
        status: 'pending',
        assigned_agents: []
      };

      const result = await orchestrator.orchestrateTask(governanceTask);
      expect(result.orchestration_mode).toBe('governance');
    });

    test('should determine unified mode for hybrid tasks', async () => {
      const hybridTask: UnifiedTask = {
        id: 'mode_test_003',
        type: 'memory_with_governance',
        category: 'hybrid',
        priority: 'medium',
        payload: {},
        governance_requirements: {
          trust_score_minimum: 0.8,
          transparency_level: 'restricted',
          accountability_required: true,
          quality_threshold: 0.9
        },
        v41_compatibility: {
          use_legacy_api: true,
          memory_integration_mode: 'read_only',
          agent_coordination_legacy: false,
          performance_monitoring_v41: true
        },
        created_at: new Date(),
        status: 'pending',
        assigned_agents: []
      };

      const result = await orchestrator.orchestrateTask(hybridTask);
      expect(result.orchestration_mode).toBe('unified');
    });
  });

  describe('Governance Context Creation', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    test('should create appropriate governance context for governance tasks', async () => {
      const governanceTask: UnifiedTask = {
        id: 'context_test_001',
        type: 'accountability_review',
        category: 'governance',
        priority: 'critical',
        user_id: 'test_user_123',
        payload: { review_scope: 'full_audit' },
        governance_requirements: {
          trust_score_minimum: 0.9,
          transparency_level: 'public',
          accountability_required: true,
          quality_threshold: 0.95
        },
        created_at: new Date(),
        status: 'pending',
        assigned_agents: []
      };

      const result = await orchestrator.orchestrateTask(governanceTask);

      expect(result.governance_context).toBeDefined();
      expect(result.governance_context?.governance_zone_id).toBe('governance-decisions-zone');
      expect(result.governance_context?.trust_requirements.composite_trust_threshold).toBe(0.9);
      expect(result.governance_context?.accountability_chain).toContain('test_user_123');
      expect(result.governance_context?.transparency_audit.public_visibility).toBe(true);
      expect(result.governance_context?.decision_tracking.responsible_agents).toContain('unified-orchestrator');
    });

    test('should not create governance context for legacy tasks', async () => {
      const legacyTask: UnifiedTask = {
        id: 'context_test_002',
        type: 'performance_monitoring',
        category: 'legacy_v41',
        priority: 'medium',
        payload: {},
        v41_compatibility: {
          use_legacy_api: true,
          memory_integration_mode: 'full',
          agent_coordination_legacy: true,
          performance_monitoring_v41: true
        },
        created_at: new Date(),
        status: 'pending',
        assigned_agents: []
      };

      // Mock governance features disabled for legacy tasks
      orchestrator = new UnifiedOrchestrator(
        mockDb,
        mockCommunication,
        mockLogger,
        { ...orchestrationConfig, enable_governance_features: false },
        'http://localhost:54321',
        'test_service_key'
      );
      await orchestrator.initialize();

      const result = await orchestrator.orchestrateTask(legacyTask);
      expect(result.governance_context).toBeUndefined();
    });
  });

  describe('Trust Score Integration', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    test('should generate trust score snapshots for governance tasks', async () => {
      const governanceTask: UnifiedTask = {
        id: 'trust_test_001',
        type: 'innovation_analysis',
        category: 'governance',
        priority: 'high',
        payload: { analysis_depth: 'comprehensive' },
        governance_requirements: {
          trust_score_minimum: 0.85,
          transparency_level: 'restricted',
          accountability_required: true,
          quality_threshold: 0.9
        },
        created_at: new Date(),
        status: 'pending',
        assigned_agents: []
      };

      const result = await orchestrator.orchestrateTask(governanceTask);

      expect(result.memory_integration?.trust_score_snapshot).toBeDefined();
      expect(result.memory_integration?.trust_score_snapshot.iq_score).toBeGreaterThanOrEqual(0);
      expect(result.memory_integration?.trust_score_snapshot.iq_score).toBeLessThanOrEqual(1);
      expect(result.memory_integration?.trust_score_snapshot.appeal_score).toBeGreaterThanOrEqual(0);
      expect(result.memory_integration?.trust_score_snapshot.appeal_score).toBeLessThanOrEqual(1);
      expect(result.memory_integration?.trust_score_snapshot.social_score).toBeGreaterThanOrEqual(0);
      expect(result.memory_integration?.trust_score_snapshot.social_score).toBeLessThanOrEqual(1);
      expect(result.memory_integration?.trust_score_snapshot.humanity_score).toBeGreaterThanOrEqual(0);
      expect(result.memory_integration?.trust_score_snapshot.humanity_score).toBeLessThanOrEqual(1);
      expect(result.memory_integration?.trust_score_snapshot.composite_score).toBeGreaterThanOrEqual(0);
      expect(result.memory_integration?.trust_score_snapshot.composite_score).toBeLessThanOrEqual(1);
      expect(result.memory_integration?.trust_score_snapshot.agent_id).toBe('unified-orchestrator');
      expect(result.memory_integration?.trust_score_snapshot.timestamp).toBeInstanceOf(Date);
    });

    test('should adjust trust scores based on task complexity', async () => {
      const complexTask: UnifiedTask = {
        id: 'trust_complex_001',
        type: 'multi_domain_governance',
        category: 'governance',
        priority: 'critical',
        payload: { domains: ['quality', 'transparency', 'accountability'] },
        governance_requirements: {
          trust_score_minimum: 0.9,
          transparency_level: 'public',
          accountability_required: true,
          quality_threshold: 0.95
        },
        created_at: new Date(),
        status: 'pending',
        assigned_agents: []
      };

      const simpleTask: UnifiedTask = {
        id: 'trust_simple_001',
        type: 'efficiency_optimization',
        category: 'governance',
        priority: 'low',
        payload: { optimization_scope: 'basic' },
        governance_requirements: {
          trust_score_minimum: 0.6,
          transparency_level: 'private',
          accountability_required: false,
          quality_threshold: 0.7
        },
        created_at: new Date(),
        status: 'pending',
        assigned_agents: []
      };

      const complexResult = await orchestrator.orchestrateTask(complexTask);
      const simpleResult = await orchestrator.orchestrateTask(simpleTask);

      // Complex tasks should generally have higher trust requirements reflected in the snapshots
      expect(complexResult.memory_integration?.trust_score_snapshot.composite_score)
        .toBeGreaterThanOrEqual(simpleResult.memory_integration?.trust_score_snapshot.composite_score!);
    });
  });

  describe('Memory Integration', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    test('should integrate with v4.1 memory for legacy tasks', async () => {
      const legacyTask: UnifiedTask = {
        id: 'memory_legacy_001',
        type: 'data_processing',
        category: 'legacy_v41',
        priority: 'medium',
        payload: { data_source: 'legacy_system' },
        v41_compatibility: {
          use_legacy_api: true,
          memory_integration_mode: 'full',
          agent_coordination_legacy: true,
          performance_monitoring_v41: true
        },
        created_at: new Date(),
        status: 'pending',
        assigned_agents: []
      };

      const result = await orchestrator.orchestrateTask(legacyTask);

      expect(result.memory_integration).toBeDefined();
      expect(result.memory_integration?.v41_memory_id).toBeDefined();
      expect(result.memory_integration?.governance_memory_id).toBeUndefined();
      expect(result.memory_integration?.memory_bridge_active).toBe(false);
    });

    test('should integrate with governance memory for governance tasks', async () => {
      const governanceTask: UnifiedTask = {
        id: 'memory_governance_001',
        type: 'transparency_audit',
        category: 'governance',
        priority: 'high',
        payload: { audit_scope: 'system_wide' },
        governance_requirements: {
          trust_score_minimum: 0.8,
          transparency_level: 'public',
          accountability_required: true,
          quality_threshold: 0.9
        },
        created_at: new Date(),
        status: 'pending',
        assigned_agents: []
      };

      const result = await orchestrator.orchestrateTask(governanceTask);

      expect(result.memory_integration).toBeDefined();
      expect(result.memory_integration?.governance_memory_id).toBeDefined();
      expect(result.memory_integration?.memory_zone_used).toBe('governance-decisions-zone');
      expect(result.memory_integration?.trust_score_snapshot).toBeDefined();
    });

    test('should integrate with both memory systems for unified tasks', async () => {
      const unifiedTask: UnifiedTask = {
        id: 'memory_unified_001',
        type: 'transparent_monitoring',
        category: 'hybrid',
        priority: 'high',
        payload: { monitoring_scope: 'comprehensive' },
        governance_requirements: {
          trust_score_minimum: 0.8,
          transparency_level: 'public',
          accountability_required: true,
          quality_threshold: 0.85
        },
        v41_compatibility: {
          use_legacy_api: false,
          memory_integration_mode: 'full',
          agent_coordination_legacy: false,
          performance_monitoring_v41: true
        },
        created_at: new Date(),
        status: 'pending',
        assigned_agents: []
      };

      const result = await orchestrator.orchestrateTask(unifiedTask);

      expect(result.memory_integration).toBeDefined();
      expect(result.memory_integration?.v41_memory_id).toBeDefined();
      expect(result.memory_integration?.governance_memory_id).toBeDefined();
      expect(result.memory_integration?.memory_bridge_active).toBe(true);
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    test('should track performance metrics for all orchestration modes', async () => {
      const tasks: UnifiedTask[] = [
        {
          id: 'perf_legacy_001',
          type: 'error_handling',
          category: 'legacy_v41',
          priority: 'medium',
          payload: {},
          v41_compatibility: {
            use_legacy_api: true,
            memory_integration_mode: 'full',
            agent_coordination_legacy: true,
            performance_monitoring_v41: true
          },
          created_at: new Date(),
          status: 'pending',
          assigned_agents: []
        },
        {
          id: 'perf_governance_001',
          type: 'quality_assessment',
          category: 'governance',
          priority: 'medium',
          payload: {},
          governance_requirements: {
            trust_score_minimum: 0.7,
            transparency_level: 'restricted',
            accountability_required: true,
            quality_threshold: 0.8
          },
          created_at: new Date(),
          status: 'pending',
          assigned_agents: []
        },
        {
          id: 'perf_unified_001',
          type: 'governance_enhanced_coordination',
          category: 'hybrid',
          priority: 'medium',
          payload: {},
          governance_requirements: {
            trust_score_minimum: 0.8,
            transparency_level: 'public',
            accountability_required: true,
            quality_threshold: 0.9
          },
          v41_compatibility: {
            use_legacy_api: false,
            memory_integration_mode: 'full',
            agent_coordination_legacy: false,
            performance_monitoring_v41: true
          },
          created_at: new Date(),
          status: 'pending',
          assigned_agents: []
        }
      ];

      const results = await Promise.all(
        tasks.map(task => orchestrator.orchestrateTask(task))
      );

      // Verify all tasks completed successfully
      results.forEach(result => {
        expect(result.status).toBe('completed');
        expect(result.estimated_completion).toBeInstanceOf(Date);
      });

      // Verify different orchestration modes were used
      const modes = results.map(r => r.orchestration_mode);
      expect(modes).toContain('v41_legacy');
      expect(modes).toContain('governance');
      expect(modes).toContain('unified');
    });

    test('should handle concurrent task orchestration', async () => {
      const concurrentTasks = Array.from({ length: 5 }, (_, i) => ({
        id: `concurrent_${i}`,
        type: i % 2 === 0 ? 'ai_coordination' : 'quality_assessment',
        category: i % 2 === 0 ? 'legacy_v41' : 'governance',
        priority: 'medium' as const,
        payload: { index: i },
        governance_requirements: i % 2 !== 0 ? {
          trust_score_minimum: 0.7,
          transparency_level: 'restricted' as const,
          accountability_required: true,
          quality_threshold: 0.8
        } : undefined,
        v41_compatibility: i % 2 === 0 ? {
          use_legacy_api: true,
          memory_integration_mode: 'full' as const,
          agent_coordination_legacy: true,
          performance_monitoring_v41: true
        } : undefined,
        created_at: new Date(),
        status: 'pending' as const,
        assigned_agents: []
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        concurrentTasks.map(task => orchestrator.orchestrateTask(task))
      );
      const endTime = Date.now();

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.status).toBe('completed');
      });

      // Concurrent execution should be reasonably fast
      expect(endTime - startTime).toBeLessThan(5000); // Less than 5 seconds total
    });
  });

  describe('Error Handling and Resilience', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    test('should handle database errors gracefully', async () => {
      // Mock database failure for specific operations
      (mockDb.create as jest.Mock).mockRejectedValueOnce(new Error('Database write failed'));

      const task: UnifiedTask = {
        id: 'error_test_001',
        type: 'quality_assessment',
        category: 'governance',
        priority: 'medium',
        payload: {},
        governance_requirements: {
          trust_score_minimum: 0.7,
          transparency_level: 'public',
          accountability_required: true,
          quality_threshold: 0.8
        },
        created_at: new Date(),
        status: 'pending',
        assigned_agents: []
      };

      await expect(orchestrator.orchestrateTask(task)).rejects.toThrow('Database write failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Task orchestration failed: error_test_001',
        expect.any(Error)
      );
    });

    test('should handle invalid governance requirements', async () => {
      const invalidTask: UnifiedTask = {
        id: 'invalid_governance_001',
        type: 'transparency_audit',
        category: 'governance',
        priority: 'medium',
        payload: {},
        governance_requirements: {
          trust_score_minimum: -0.5, // Invalid negative value
          transparency_level: 'invalid_level' as any,
          accountability_required: true,
          quality_threshold: 1.5 // Invalid - greater than 1.0
        },
        created_at: new Date(),
        status: 'pending',
        assigned_agents: []
      };

      await expect(orchestrator.orchestrateTask(invalidTask)).rejects.toThrow();
    });

    test('should recover from component failures', async () => {
      // Simulate component failure and recovery
      (mockCommunication.publishEvent as jest.Mock).mockRejectedValueOnce(new Error('Communication failed'));

      const task: UnifiedTask = {
        id: 'recovery_test_001',
        type: 'ai_coordination',
        category: 'legacy_v41',
        priority: 'low',
        payload: {},
        v41_compatibility: {
          use_legacy_api: true,
          memory_integration_mode: 'full',
          agent_coordination_legacy: true,
          performance_monitoring_v41: true
        },
        created_at: new Date(),
        status: 'pending',
        assigned_agents: []
      };

      // First task should fail
      await expect(orchestrator.orchestrateTask(task)).rejects.toThrow();

      // Reset the mock to succeed
      (mockCommunication.publishEvent as jest.Mock).mockResolvedValue(undefined);

      // Second task should succeed, showing recovery
      const recoveryTask = { ...task, id: 'recovery_test_002' };
      const result = await orchestrator.orchestrateTask(recoveryTask);
      expect(result.status).toBe('completed');
    });
  });
});
