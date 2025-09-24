/**
 * TrustStream v4.2 - Enhanced Workflow Coordinator Unit Tests
 * 
 * Comprehensive unit tests for the EnhancedWorkflowCoordinator class that verify
 * governance workflow capabilities, consensus execution, approval chains,
 * trust validation, and accountability tracking.
 */

import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals';
import { 
  EnhancedWorkflowCoordinator,
  EnhancedWorkflowDefinition,
  EnhancedWorkflowExecution,
  GovernanceWorkflowRequirements,
  TrustRequirements,
  ConsensusSettings,
  ApprovalChainSettings,
  AccountabilitySettings,
  TransparencySettings
} from '../../src/orchestrator/enhanced-workflow-coordinator';
import { GovernanceAgent, GovernanceAgentType } from '../../src/orchestrator/governance-orchestrator';
import { GovernanceMemoryIntegration } from '../../src/orchestrator/integrations/governance-memory-integration';
import { DatabaseInterface } from '../../src/shared-utils/database-interface';
import { AgentCommunication } from '../../src/shared-utils/agent-communication';
import { Logger } from '../../src/shared-utils/logger';
import { ExecutionContext } from '../../src/orchestrator/workflow-coordinator';

// Mock dependencies
jest.mock('../../src/shared-utils/database-interface');
jest.mock('../../src/shared-utils/agent-communication');
jest.mock('../../src/shared-utils/logger');
jest.mock('../../src/orchestrator/integrations/governance-memory-integration');

describe('EnhancedWorkflowCoordinator', () => {
  let enhancedCoordinator: EnhancedWorkflowCoordinator;
  let mockDb: jest.Mocked<DatabaseInterface>;
  let mockCommunication: jest.Mocked<AgentCommunication>;
  let mockLogger: jest.Mocked<Logger>;
  let mockGovernanceMemory: jest.Mocked<GovernanceMemoryIntegration>;

  // Test data
  const mockGovernanceAgent: GovernanceAgent = {
    id: 'gov-agent-1',
    name: 'Test Governance Agent',
    type: 'accountability_agent' as GovernanceAgentType,
    endpoint: {
      protocol: 'https',
      host: 'gov-agent-1.local',
      port: 8080,
      path: '/api'
    },
    trust_scores: {
      iq_score: 0.85,
      appeal_score: 0.8,
      social_score: 0.75,
      humanity_score: 0.9
    },
    trust_score: 0.82,
    governance_config: {
      governance_domains: ['task_quality', 'compliance'],
      accountability_level: 'high',
      transparency_requirements: ['decision_logging'],
      quality_standards: {
        min_quality_threshold: 0.8,
        validation_requirements: ['peer_review']
      }
    },
    capabilities: ['consensus_management', 'approval_validation'],
    status: 'ready',
    version: '4.2.0',
    last_heartbeat: new Date(),
    performance_metrics: {
      total_tasks: 50,
      successful_tasks: 48,
      success_rate: 0.96,
      average_response_time: 200,
      average_quality_score: 0.9
    }
  };

  const mockTrustRequirements: TrustRequirements = {
    min_composite_trust: 0.8,
    min_iq_score: 0.8,
    min_appeal_score: 0.7,
    min_social_score: 0.7,
    min_humanity_score: 0.8,
    trust_verification_required: true,
    trust_score_aggregation_method: 'weighted'
  };

  const mockConsensusSettings: ConsensusSettings = {
    consensus_algorithm: 'majority',
    minimum_participants: 3,
    consensus_threshold: 0.7,
    timeout_strategy: 'escalate',
    conflict_resolution: {
      strategy_type: 'mediation',
      mediator_selection: 'expert',
      resolution_criteria: ['fairness', 'efficiency'],
      appeal_process: true
    },
    bias_mitigation: {
      anonymize_inputs: true,
      rotate_participants: false,
      devil_advocate_assignment: true,
      cognitive_bias_checks: ['confirmation_bias', 'anchoring_bias'],
      diverse_perspective_requirement: true
    }
  };

  const mockApprovalChainSettings: ApprovalChainSettings = {
    approval_levels: [{
      level: 1,
      required_approvers: ['approver-1', 'approver-2'],
      approval_criteria: ['technical_review', 'business_alignment'],
      trust_score_requirement: 0.8,
      expertise_requirements: ['technical_expertise'],
      conflict_of_interest_rules: ['no_direct_interest']
    }],
    escalation_rules: [{
      trigger_condition: 'timeout',
      escalation_target: 'senior_approver',
      escalation_timeout: 3600000, // 1 hour
      escalation_criteria: ['urgency', 'business_impact'],
      auto_escalation: true
    }],
    approval_timeout: 86400000, // 24 hours
    concurrent_approvals_allowed: true,
    approval_delegation: false,
    override_conditions: [{
      condition_type: 'emergency',
      authorized_overriders: ['emergency_admin'],
      override_criteria: ['critical_business_need'],
      justification_required: true,
      audit_trail_enhanced: true
    }]
  };

  const mockGovernanceRequirements: GovernanceWorkflowRequirements = {
    governance_oversight_required: true,
    trust_score_threshold: 0.8,
    accountability_tracking: true,
    transparency_level: 'public',
    audit_trail_required: true,
    stakeholder_approval_required: true,
    compliance_validation: true
  };

  const mockWorkflowDefinition: EnhancedWorkflowDefinition = {
    id: 'test-governance-workflow',
    name: 'Test Governance Workflow',
    description: 'Test workflow with governance capabilities',
    version: '1.0.0',
    workflow_type: 'consensus_driven',
    steps: [{
      id: 'step-1',
      name: 'Initial Step',
      type: 'governance_validation',
      configuration: {},
      dependencies: []
    }],
    triggers: [{
      trigger_type: 'manual',
      configuration: {}
    }],
    governance_requirements: mockGovernanceRequirements,
    trust_requirements: mockTrustRequirements,
    consensus_settings: mockConsensusSettings,
    approval_chain_settings: mockApprovalChainSettings,
    accountability_settings: {
      decision_tracking_enabled: true,
      responsible_party_identification: true,
      outcome_monitoring: true,
      impact_assessment_required: true,
      corrective_action_planning: true,
      stakeholder_notification: true,
      audit_evidence_collection: true
    } as AccountabilitySettings,
    transparency_settings: {
      public_visibility: true,
      stakeholder_access: ['stakeholder-1', 'stakeholder-2'],
      information_disclosure_level: 'full',
      real_time_updates: true,
      anonymization_rules: ['remove_personal_info'],
      transparency_reporting: true
    } as TransparencySettings
  };

  const mockExecutionContext: ExecutionContext = {
    execution_id: 'exec-123',
    triggered_by: 'user-1',
    trigger_data: { reason: 'governance_review' },
    environment: 'production',
    parameters: { priority: 'high' }
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

    mockGovernanceMemory = {
      initialize: jest.fn(),
      storeGovernanceMemory: jest.fn(),
      retrieveGovernanceMemory: jest.fn(),
      updateGovernanceMemory: jest.fn(),
      clearGovernanceMemory: jest.fn()
    } as jest.Mocked<GovernanceMemoryIntegration>;

    // Create coordinator instance
    enhancedCoordinator = new EnhancedWorkflowCoordinator(
      mockDb,
      mockCommunication,
      mockLogger,
      mockGovernanceMemory
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor and Initialization', () => {
    test('should create instance with all dependencies', () => {
      expect(enhancedCoordinator).toBeInstanceOf(EnhancedWorkflowCoordinator);
      expect(mockLogger.info).not.toHaveBeenCalled(); // Constructor shouldn't log
    });

    test('should initialize successfully with all components', async () => {
      // Mock database responses
      mockDb.query.mockResolvedValueOnce([]); // governance workflows
      mockCommunication.subscribeToEvent.mockResolvedValue(undefined);

      await enhancedCoordinator.initialize();

      expect(mockLogger.info).toHaveBeenCalledWith('Initializing Enhanced Workflow Coordinator');
      expect(mockLogger.info).toHaveBeenCalledWith('Enhanced Workflow Coordinator initialized successfully');
      expect(mockLogger.info).toHaveBeenCalledWith('Initializing governance workflow components');
      expect(mockLogger.info).toHaveBeenCalledWith('Loading governance workflows');
      expect(mockLogger.info).toHaveBeenCalledWith('Setting up governance event handlers');
      expect(mockLogger.info).toHaveBeenCalledWith('Starting governance monitoring');
      
      // Should subscribe to governance events
      expect(mockCommunication.subscribeToEvent).toHaveBeenCalledTimes(4);
      expect(mockCommunication.subscribeToEvent).toHaveBeenCalledWith(
        'consensus_round_completed',
        expect.any(Function)
      );
      expect(mockCommunication.subscribeToEvent).toHaveBeenCalledWith(
        'approval_received',
        expect.any(Function)
      );
      expect(mockCommunication.subscribeToEvent).toHaveBeenCalledWith(
        'trust_score_updated',
        expect.any(Function)
      );
      expect(mockCommunication.subscribeToEvent).toHaveBeenCalledWith(
        'governance_violation_detected',
        expect.any(Function)
      );
    });

    test('should handle initialization failure gracefully', async () => {
      const error = new Error('Database initialization failed');
      mockDb.query.mockRejectedValueOnce(error);

      await expect(enhancedCoordinator.initialize()).rejects.toThrow('Database initialization failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to initialize Enhanced Workflow Coordinator',
        error
      );
    });

    test('should load governance workflows from database', async () => {
      const mockWorkflows = [mockWorkflowDefinition];
      mockDb.query.mockResolvedValueOnce(mockWorkflows);
      mockCommunication.subscribeToEvent.mockResolvedValue(undefined);

      await enhancedCoordinator.initialize();

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM enhanced_workflow_definitions WHERE governance_requirements IS NOT NULL'
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Loaded 1 governance workflows');
    });
  });

  describe('Enhanced Workflow Execution', () => {
    beforeEach(async () => {
      // Mock successful initialization
      mockDb.query.mockResolvedValue([]);
      mockCommunication.subscribeToEvent.mockResolvedValue(undefined);
      await enhancedCoordinator.initialize();
    });

    test('should start enhanced workflow successfully', async () => {
      // Mock base workflow execution
      jest.spyOn(enhancedCoordinator as any, 'startWorkflow').mockResolvedValueOnce({
        id: 'exec-123',
        workflow_id: mockWorkflowDefinition.id,
        status: 'running',
        started_at: new Date(),
        context: mockExecutionContext,
        current_step: 0,
        steps: []
      });

      const execution = await enhancedCoordinator.startEnhancedWorkflow(
        mockWorkflowDefinition,
        mockExecutionContext,
        'test-user'
      );

      expect(execution).toBeDefined();
      expect(execution.id).toBe('exec-123');
      expect(execution.governance_context).toBeDefined();
      expect(execution.trust_score_evolution).toEqual([]);
      expect(execution.accountability_records).toEqual([]);
      expect(execution.transparency_audit).toEqual([]);
      expect(execution.governance_violations).toEqual([]);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Starting enhanced workflow: ${mockWorkflowDefinition.id}`,
        {
          type: mockWorkflowDefinition.workflow_type,
          governance_required: true
        }
      );
    });

    test('should initialize consensus tracking for consensus workflows', async () => {
      jest.spyOn(enhancedCoordinator as any, 'startWorkflow').mockResolvedValueOnce({
        id: 'exec-123',
        workflow_id: mockWorkflowDefinition.id,
        status: 'running',
        started_at: new Date(),
        context: mockExecutionContext,
        current_step: 0,
        steps: []
      });

      const execution = await enhancedCoordinator.startEnhancedWorkflow(
        mockWorkflowDefinition,
        mockExecutionContext,
        'test-user'
      );

      expect(execution.consensus_tracking).toBeDefined();
      expect(execution.consensus_tracking?.consensus_session_id).toMatch(/^gov_session_/);
      expect(execution.consensus_tracking?.participants).toEqual([]);
      expect(execution.consensus_tracking?.voting_rounds).toEqual([]);
      expect(execution.consensus_tracking?.consensus_achieved).toBe(false);
    });

    test('should initialize approval tracking for approval chain workflows', async () => {
      const approvalWorkflow = {
        ...mockWorkflowDefinition,
        workflow_type: 'approval_chain' as any
      };

      jest.spyOn(enhancedCoordinator as any, 'startWorkflow').mockResolvedValueOnce({
        id: 'exec-123',
        workflow_id: approvalWorkflow.id,
        status: 'running',
        started_at: new Date(),
        context: mockExecutionContext,
        current_step: 0,
        steps: []
      });

      const execution = await enhancedCoordinator.startEnhancedWorkflow(
        approvalWorkflow,
        mockExecutionContext,
        'test-user'
      );

      expect(execution.approval_tracking).toBeDefined();
      expect(execution.approval_tracking?.approval_session_id).toMatch(/^gov_session_/);
      expect(execution.approval_tracking?.approval_chain).toEqual([]);
      expect(execution.approval_tracking?.current_approval_level).toBe(1);
      expect(execution.approval_tracking?.overall_approval_status).toBe('pending');
    });

    test('should handle workflow startup failure gracefully', async () => {
      const error = new Error('Workflow startup failed');
      jest.spyOn(enhancedCoordinator as any, 'startWorkflow').mockRejectedValueOnce(error);

      await expect(
        enhancedCoordinator.startEnhancedWorkflow(
          mockWorkflowDefinition,
          mockExecutionContext,
          'test-user'
        )
      ).rejects.toThrow('Workflow startup failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Failed to start enhanced workflow: ${mockWorkflowDefinition.id}`,
        error
      );
    });
  });

  describe('Consensus Workflow Execution', () => {
    let mockExecution: EnhancedWorkflowExecution;

    beforeEach(async () => {
      mockDb.query.mockResolvedValue([]);
      mockCommunication.subscribeToEvent.mockResolvedValue(undefined);
      await enhancedCoordinator.initialize();

      mockExecution = {
        id: 'exec-123',
        workflow_id: mockWorkflowDefinition.id,
        status: 'running',
        started_at: new Date(),
        context: mockExecutionContext,
        current_step: 0,
        steps: [],
        governance_context: {
          governance_session_id: 'gov-session-123',
          governance_agents: [mockGovernanceAgent],
          trust_validation_results: [],
          accountability_framework: {} as any,
          transparency_requirements: {} as any,
          compliance_checkpoints: []
        },
        trust_score_evolution: [],
        accountability_records: [],
        transparency_audit: [],
        governance_violations: [],
        consensus_tracking: {
          consensus_session_id: 'consensus-123',
          participants: [],
          voting_rounds: [],
          consensus_achieved: false,
          consensus_score: 0,
          final_decision: '',
          minority_opinions: []
        }
      };
    });

    test('should execute consensus workflow successfully', async () => {
      // Mock consensus engine response
      const mockConsensusResult = {
        consensus_achieved: true,
        consensus_score: 0.85,
        final_decision: 'approved',
        voting_rounds: []
      };

      jest.spyOn(enhancedCoordinator as any, 'consensusEngine').mockImplementation({
        executeConsensus: jest.fn().mockResolvedValue(mockConsensusResult)
      });

      jest.spyOn(enhancedCoordinator as any, 'accountabilityTracker').mockImplementation({
        recordConsensusDecision: jest.fn().mockResolvedValue({
          record_id: 'accountability-123',
          decision_point: 'consensus_decision',
          responsible_agents: [],
          decision_rationale: 'Consensus achieved',
          stakeholder_impact: [],
          outcome_commitment: [],
          monitoring_plan: {
            monitoring_frequency: 'weekly',
            key_indicators: [],
            reporting_schedule: 'monthly',
            escalation_triggers: [],
            review_checkpoints: []
          },
          corrective_actions: []
        })
      });

      await enhancedCoordinator.executeConsensusWorkflow(mockExecution, mockWorkflowDefinition);

      expect(mockExecution.consensus_tracking?.consensus_achieved).toBe(true);
      expect(mockExecution.consensus_tracking?.consensus_score).toBe(0.85);
      expect(mockExecution.accountability_records).toHaveLength(1);
      expect(mockGovernanceMemory.storeGovernanceMemory).toHaveBeenCalled();

      expect(mockLogger.info).toHaveBeenCalledWith(`Executing consensus workflow: ${mockExecution.id}`);
    });

    test('should handle consensus workflow without settings', async () => {
      const workflowWithoutConsensus = {
        ...mockWorkflowDefinition,
        consensus_settings: undefined
      };

      await expect(
        enhancedCoordinator.executeConsensusWorkflow(mockExecution, workflowWithoutConsensus)
      ).rejects.toThrow('Consensus settings not configured for workflow');
    });

    test('should handle consensus failure gracefully', async () => {
      const error = new Error('Consensus failed');
      jest.spyOn(enhancedCoordinator as any, 'consensusEngine').mockImplementation({
        executeConsensus: jest.fn().mockRejectedValue(error)
      });

      await expect(
        enhancedCoordinator.executeConsensusWorkflow(mockExecution, mockWorkflowDefinition)
      ).rejects.toThrow('Consensus failed');

      expect(mockExecution.governance_violations).toHaveLength(1);
      expect(mockExecution.governance_violations[0].violation_type).toBe('consensus_failure');
      expect(mockExecution.governance_violations[0].severity).toBe('high');

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Consensus workflow execution failed: ${mockExecution.id}`,
        error
      );
    });
  });

  describe('Approval Chain Workflow Execution', () => {
    let mockExecution: EnhancedWorkflowExecution;

    beforeEach(async () => {
      mockDb.query.mockResolvedValue([]);
      mockCommunication.subscribeToEvent.mockResolvedValue(undefined);
      await enhancedCoordinator.initialize();

      mockExecution = {
        id: 'exec-123',
        workflow_id: mockWorkflowDefinition.id,
        status: 'running',
        started_at: new Date(),
        context: mockExecutionContext,
        current_step: 0,
        steps: [],
        governance_context: {
          governance_session_id: 'gov-session-123',
          governance_agents: [mockGovernanceAgent],
          trust_validation_results: [],
          accountability_framework: {} as any,
          transparency_requirements: {} as any,
          compliance_checkpoints: []
        },
        trust_score_evolution: [],
        accountability_records: [],
        transparency_audit: [],
        governance_violations: [],
        approval_tracking: {
          approval_session_id: 'approval-123',
          approval_chain: [],
          current_approval_level: 1,
          overall_approval_status: 'pending',
          approval_timeline: []
        }
      };
    });

    test('should execute approval chain workflow successfully', async () => {
      const mockApprovalResult = {
        overall_approval_status: 'approved',
        approval_chain: [],
        approval_timeline: []
      };

      jest.spyOn(enhancedCoordinator as any, 'approvalChainManager').mockImplementation({
        executeApprovalChain: jest.fn().mockResolvedValue(mockApprovalResult)
      });

      jest.spyOn(enhancedCoordinator as any, 'accountabilityTracker').mockImplementation({
        recordApprovalDecision: jest.fn().mockResolvedValue({
          record_id: 'accountability-123',
          decision_point: 'approval_decision',
          responsible_agents: [],
          decision_rationale: 'Approval chain completed',
          stakeholder_impact: [],
          outcome_commitment: [],
          monitoring_plan: {
            monitoring_frequency: 'weekly',
            key_indicators: [],
            reporting_schedule: 'monthly',
            escalation_triggers: [],
            review_checkpoints: []
          },
          corrective_actions: []
        })
      });

      jest.spyOn(enhancedCoordinator as any, 'transparencyAuditor').mockImplementation({
        auditApprovalProcess: jest.fn().mockResolvedValue({
          audit_id: 'audit-123',
          audit_timestamp: new Date(),
          audit_type: 'step_completion',
          audit_details: 'Approval process completed',
          visibility_level: 'public',
          stakeholders_notified: [],
          audit_evidence: []
        })
      });

      await enhancedCoordinator.executeApprovalChainWorkflow(mockExecution, mockWorkflowDefinition);

      expect(mockExecution.approval_tracking?.overall_approval_status).toBe('approved');
      expect(mockExecution.accountability_records).toHaveLength(1);
      expect(mockExecution.transparency_audit).toHaveLength(1);

      expect(mockLogger.info).toHaveBeenCalledWith(`Executing approval chain workflow: ${mockExecution.id}`);
    });

    test('should handle approval chain workflow without settings', async () => {
      const workflowWithoutApprovals = {
        ...mockWorkflowDefinition,
        approval_chain_settings: undefined
      };

      await expect(
        enhancedCoordinator.executeApprovalChainWorkflow(mockExecution, workflowWithoutApprovals)
      ).rejects.toThrow('Approval chain settings not configured for workflow');
    });

    test('should handle approval chain failure gracefully', async () => {
      const error = new Error('Approval chain failed');
      jest.spyOn(enhancedCoordinator as any, 'approvalChainManager').mockImplementation({
        executeApprovalChain: jest.fn().mockRejectedValue(error)
      });

      await expect(
        enhancedCoordinator.executeApprovalChainWorkflow(mockExecution, mockWorkflowDefinition)
      ).rejects.toThrow('Approval chain failed');

      expect(mockExecution.governance_violations).toHaveLength(1);
      expect(mockExecution.governance_violations[0].violation_type).toBe('approval_chain_failure');
      expect(mockExecution.governance_violations[0].severity).toBe('high');

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Approval chain workflow execution failed: ${mockExecution.id}`,
        error
      );
    });
  });

  describe('Trust Validated Workflow Execution', () => {
    let mockExecution: EnhancedWorkflowExecution;

    beforeEach(async () => {
      mockDb.query.mockResolvedValue([]);
      mockCommunication.subscribeToEvent.mockResolvedValue(undefined);
      await enhancedCoordinator.initialize();

      mockExecution = {
        id: 'exec-123',
        workflow_id: mockWorkflowDefinition.id,
        status: 'running',
        started_at: new Date(),
        context: mockExecutionContext,
        current_step: 0,
        steps: [],
        governance_context: {
          governance_session_id: 'gov-session-123',
          governance_agents: [mockGovernanceAgent],
          trust_validation_results: [],
          accountability_framework: {} as any,
          transparency_requirements: {} as any,
          compliance_checkpoints: []
        },
        trust_score_evolution: [],
        accountability_records: [],
        transparency_audit: [],
        governance_violations: []
      };
    });

    test('should execute trust validated workflow successfully', async () => {
      const trustValidationWorkflow = {
        ...mockWorkflowDefinition,
        workflow_type: 'trust_validated' as any
      };

      jest.spyOn(enhancedCoordinator as any, 'trustScoreValidator').mockImplementation({
        validateAgentTrust: jest.fn().mockResolvedValue({
          agent_id: mockGovernanceAgent.id,
          validation_passed: true,
          trust_scores: {
            iq_score: 0.85,
            appeal_score: 0.8,
            social_score: 0.75,
            humanity_score: 0.9,
            composite_score: 0.82
          },
          timestamp: new Date()
        })
      });

      jest.spyOn(enhancedCoordinator as any, 'executeStepWithTrustMonitoring').mockResolvedValue(undefined);

      await enhancedCoordinator.executeTrustValidatedWorkflow(mockExecution, trustValidationWorkflow);

      expect(mockExecution.governance_context?.trust_validation_results).toHaveLength(1);
      expect(mockExecution.governance_context?.trust_validation_results[0].validation_passed).toBe(true);

      expect(mockLogger.info).toHaveBeenCalledWith(`Executing trust-validated workflow: ${mockExecution.id}`);
    });

    test('should handle trust validation failure', async () => {
      const trustValidationWorkflow = {
        ...mockWorkflowDefinition,
        workflow_type: 'trust_validated' as any
      };

      jest.spyOn(enhancedCoordinator as any, 'trustScoreValidator').mockImplementation({
        validateAgentTrust: jest.fn().mockResolvedValue({
          agent_id: mockGovernanceAgent.id,
          validation_passed: false,
          failure_reason: 'Trust score below threshold',
          trust_scores: {
            iq_score: 0.6,
            appeal_score: 0.5,
            social_score: 0.5,
            humanity_score: 0.7,
            composite_score: 0.58
          },
          timestamp: new Date()
        })
      });

      await expect(
        enhancedCoordinator.executeTrustValidatedWorkflow(mockExecution, trustValidationWorkflow)
      ).rejects.toThrow(`Trust validation failed for agent ${mockGovernanceAgent.id}: Trust score below threshold`);

      expect(mockExecution.governance_violations).toHaveLength(1);
      expect(mockExecution.governance_violations[0].violation_type).toBe('trust_validation_failure');
      expect(mockExecution.governance_violations[0].severity).toBe('critical');
    });

    test('should handle workflow without trust requirements', async () => {
      const workflowWithoutTrust = {
        ...mockWorkflowDefinition,
        trust_requirements: undefined
      };

      await expect(
        enhancedCoordinator.executeTrustValidatedWorkflow(mockExecution, workflowWithoutTrust)
      ).rejects.toThrow('Trust requirements not configured for workflow');
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      mockDb.query.mockResolvedValue([]);
      mockCommunication.subscribeToEvent.mockResolvedValue(undefined);
      await enhancedCoordinator.initialize();
    });

    test('should handle consensus round completed event', () => {
      const event = {
        execution_id: 'exec-123',
        round_number: 1,
        consensus_achieved: true,
        consensus_score: 0.8
      };

      // Access private method for testing
      const handleEvent = (enhancedCoordinator as any).handleConsensusRoundCompleted.bind(enhancedCoordinator);
      handleEvent(event);

      expect(mockLogger.info).toHaveBeenCalledWith('Consensus round completed', event);
    });

    test('should handle approval received event', () => {
      const event = {
        execution_id: 'exec-123',
        approver_id: 'approver-1',
        approval_status: 'approved'
      };

      const handleEvent = (enhancedCoordinator as any).handleApprovalReceived.bind(enhancedCoordinator);
      handleEvent(event);

      expect(mockLogger.info).toHaveBeenCalledWith('Approval received', event);
    });

    test('should handle trust score updated event', () => {
      const mockExecution: EnhancedWorkflowExecution = {
        id: 'exec-123',
        workflow_id: 'workflow-1',
        status: 'running',
        started_at: new Date(),
        context: mockExecutionContext,
        current_step: 0,
        steps: [],
        governance_context: {
          governance_session_id: 'gov-session-123',
          governance_agents: [mockGovernanceAgent],
          trust_validation_results: [],
          accountability_framework: {} as any,
          transparency_requirements: {} as any,
          compliance_checkpoints: []
        },
        trust_score_evolution: [],
        accountability_records: [],
        transparency_audit: [],
        governance_violations: []
      };

      // Set up active execution
      (enhancedCoordinator as any).activeGovernanceExecutions.set('exec-123', mockExecution);

      const event = {
        agent_id: mockGovernanceAgent.id,
        step_id: 'step-1',
        previous_scores: { iq_score: 0.8, appeal_score: 0.7, social_score: 0.7, humanity_score: 0.85, composite_score: 0.78 },
        current_scores: { iq_score: 0.85, appeal_score: 0.8, social_score: 0.75, humanity_score: 0.9, composite_score: 0.82 },
        impact_factors: ['successful_task_completion']
      };

      const handleEvent = (enhancedCoordinator as any).handleTrustScoreUpdated.bind(enhancedCoordinator);
      handleEvent(event);

      expect(mockExecution.trust_score_evolution).toHaveLength(1);
      expect(mockExecution.trust_score_evolution[0].agent_id).toBe(mockGovernanceAgent.id);
      expect(mockExecution.trust_score_evolution[0].trust_validation_status).toBe('pending');

      expect(mockLogger.info).toHaveBeenCalledWith('Trust score updated', event);
    });

    test('should handle governance violation detected event', () => {
      const mockExecution: EnhancedWorkflowExecution = {
        id: 'exec-123',
        workflow_id: 'workflow-1',
        status: 'running',
        started_at: new Date(),
        context: mockExecutionContext,
        current_step: 0,
        steps: [],
        governance_context: {
          governance_session_id: 'gov-session-123',
          governance_agents: [],
          trust_validation_results: [],
          accountability_framework: {} as any,
          transparency_requirements: {} as any,
          compliance_checkpoints: []
        },
        trust_score_evolution: [],
        accountability_records: [],
        transparency_audit: [],
        governance_violations: []
      };

      (enhancedCoordinator as any).activeGovernanceExecutions.set('exec-123', mockExecution);

      const event = {
        execution_id: 'exec-123',
        violation_id: 'violation-123',
        violation_type: 'compliance_breach',
        severity: 'high',
        description: 'Compliance rule violated',
        detection_method: 'automated_monitoring',
        affected_components: ['compliance_engine']
      };

      const handleEvent = (enhancedCoordinator as any).handleGovernanceViolationDetected.bind(enhancedCoordinator);
      handleEvent(event);

      expect(mockExecution.governance_violations).toHaveLength(1);
      expect(mockExecution.governance_violations[0].violation_type).toBe('compliance_breach');
      expect(mockExecution.governance_violations[0].severity).toBe('high');

      expect(mockLogger.warn).toHaveBeenCalledWith('Governance violation detected', event);
    });
  });

  describe('Utility Methods', () => {
    test('should generate governance session ID', () => {
      const generateSessionId = (enhancedCoordinator as any).generateGovernanceSessionId.bind(enhancedCoordinator);
      const sessionId = generateSessionId();

      expect(sessionId).toMatch(/^gov_session_\d+_[a-z0-9]+$/);
    });

    test('should get default trust requirements', () => {
      const getDefaultTrust = (enhancedCoordinator as any).getDefaultTrustRequirements.bind(enhancedCoordinator);
      const defaultTrust = getDefaultTrust();

      expect(defaultTrust).toBeDefined();
      expect(defaultTrust.min_composite_trust).toBe(0.7);
      expect(defaultTrust.min_iq_score).toBe(0.7);
      expect(defaultTrust.min_appeal_score).toBe(0.6);
      expect(defaultTrust.min_social_score).toBe(0.6);
      expect(defaultTrust.min_humanity_score).toBe(0.8);
      expect(defaultTrust.trust_verification_required).toBe(true);
      expect(defaultTrust.trust_score_aggregation_method).toBe('weighted');
    });
  });

  describe('Helper Class Integration', () => {
    beforeEach(async () => {
      mockDb.query.mockResolvedValue([]);
      mockCommunication.subscribeToEvent.mockResolvedValue(undefined);
      await enhancedCoordinator.initialize();
    });

    test('should initialize trust score validator', () => {
      expect(mockLogger.info).toHaveBeenCalledWith('Trust Score Validator initialized');
    });

    test('should initialize consensus engine', () => {
      expect(mockLogger.info).toHaveBeenCalledWith('Consensus Engine initialized');
    });

    test('should initialize approval chain manager', () => {
      expect(mockLogger.info).toHaveBeenCalledWith('Approval Chain Manager initialized');
    });

    test('should initialize accountability tracker', () => {
      expect(mockLogger.info).toHaveBeenCalledWith('Accountability Tracker initialized');
    });

    test('should initialize transparency auditor', () => {
      expect(mockLogger.info).toHaveBeenCalledWith('Transparency Auditor initialized');
    });
  });
});
