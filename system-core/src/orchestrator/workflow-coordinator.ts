/**
 * TrustStream v4.2 - Workflow Coordinator
 * 
 * Manages complex governance workflows involving multiple agents.
 * Handles workflow definition, execution, monitoring, and coordination.
 * 
 * Based on existing TrustStream workflow patterns and agent coordination systems.
 */

import { DatabaseInterface } from '../shared-utils/database-interface';
import { AgentCommunication } from '../shared-utils/agent-communication';
import { Logger } from '../shared-utils/logger';
import { GovernanceAgent, GovernanceAgentType, TaskStatus } from './governance-orchestrator';

// Core workflow interfaces
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  governance_domains: GovernanceAgentType[];
  workflow_type: WorkflowType;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  success_criteria: SuccessCriteria;
  failure_policies: FailurePolicy[];
  metadata: WorkflowMetadata;
}

export type WorkflowType = 
  | 'sequential'
  | 'parallel'
  | 'conditional'
  | 'event_driven'
  | 'approval_chain'
  | 'consensus_driven';

export interface WorkflowStep {
  id: string;
  name: string;
  type: StepType;
  agent_type: GovernanceAgentType;
  action: string;
  inputs: StepInputDefinition;
  outputs: StepOutputDefinition;
  conditions: StepCondition[];
  timeout_ms: number;
  retry_policy: RetryPolicy;
  approval_required: boolean;
  parallel_group?: string;
}

export type StepType = 
  | 'agent_action'
  | 'decision_point'
  | 'approval_gate'
  | 'data_collection'
  | 'notification'
  | 'validation'
  | 'aggregation';

export interface StepInputDefinition {
  schema: any;
  sources: InputSource[];
  transformations: DataTransformation[];
  validation_rules: ValidationRule[];
}

export interface StepOutputDefinition {
  schema: any;
  destinations: OutputDestination[];
  format: 'json' | 'xml' | 'csv' | 'report';
  persistence: PersistenceConfig;
}

export interface StepCondition {
  id: string;
  type: 'input_validation' | 'output_validation' | 'approval_status' | 'custom';
  expression: string;
  error_action: 'fail' | 'retry' | 'skip' | 'escalate';
}

export interface WorkflowTrigger {
  id: string;
  type: TriggerType;
  conditions: TriggerCondition[];
  schedule?: ScheduleConfig;
  event_filter?: EventFilter;
}

export type TriggerType = 
  | 'manual'
  | 'scheduled'
  | 'event_based'
  | 'threshold_based'
  | 'approval_required';

export interface SuccessCriteria {
  required_approvals: number;
  consensus_threshold: number;
  quality_threshold: number;
  time_limit_hours: number;
  critical_steps: string[];
}

export interface FailurePolicy {
  trigger: FailureTrigger;
  action: FailureAction;
  escalation_path: string[];
  notification_recipients: string[];
  retry_config?: RetryConfig;
}

export interface WorkflowMetadata {
  created_by: string;
  created_at: Date;
  last_modified: Date;
  version_history: VersionInfo[];
  tags: string[];
  category: string;
  business_impact: 'low' | 'medium' | 'high' | 'critical';
}

// Workflow execution interfaces
export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  instance_name: string;
  status: WorkflowExecutionStatus;
  current_step: string;
  started_at: Date;
  completed_at?: Date;
  triggered_by: string;
  context: ExecutionContext;
  step_executions: StepExecution[];
  approvals: ApprovalRecord[];
  metrics: ExecutionMetrics;
}

export type WorkflowExecutionStatus = 
  | 'pending'
  | 'running'
  | 'waiting_approval'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'escalated';

export interface StepExecution {
  step_id: string;
  execution_id: string;
  agent_id: string;
  status: StepExecutionStatus;
  started_at: Date;
  completed_at?: Date;
  inputs: any;
  outputs?: any;
  error_message?: string;
  retry_count: number;
  approval_status?: ApprovalStatus;
}

export type StepExecutionStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'waiting_approval'
  | 'approved'
  | 'rejected'
  | 'skipped';

export interface ExecutionContext {
  user_id?: string;
  community_id?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  variables: Record<string, any>;
  external_references: Record<string, string>;
  compliance_requirements: string[];
}

export interface ApprovalRecord {
  id: string;
  step_id: string;
  approver_id: string;
  status: ApprovalStatus;
  comments?: string;
  created_at: Date;
  decision_at?: Date;
  approval_level: number;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'escalated';

export interface ExecutionMetrics {
  total_duration_ms: number;
  step_count: number;
  approval_count: number;
  retry_count: number;
  success_rate: number;
  agent_performance: Record<string, AgentPerformanceMetric>;
}

export interface AgentPerformanceMetric {
  agent_id: string;
  response_time_ms: number;
  success_rate: number;
  quality_score: number;
  retry_count: number;
}

// Supporting interfaces
interface InputSource {
  type: 'previous_step' | 'user_input' | 'database' | 'external_api' | 'context';
  reference: string;
  mapping?: Record<string, string>;
}

interface OutputDestination {
  type: 'next_step' | 'database' | 'external_system' | 'notification' | 'context';
  reference: string;
  mapping?: Record<string, string>;
}

interface DataTransformation {
  type: 'map' | 'filter' | 'aggregate' | 'validate' | 'format';
  expression: string;
  parameters: Record<string, any>;
}

interface ValidationRule {
  field: string;
  type: 'required' | 'type' | 'range' | 'pattern' | 'custom';
  constraint: any;
  error_message: string;
}

interface PersistenceConfig {
  enabled: boolean;
  table?: string;
  retention_days?: number;
  encryption?: boolean;
}

interface TriggerCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'exists';
  value: any;
}

interface ScheduleConfig {
  type: 'once' | 'recurring';
  start_time: Date;
  interval?: string; // cron expression
  end_time?: Date;
  timezone: string;
}

interface EventFilter {
  event_type: string;
  source: string;
  conditions: Record<string, any>;
}

type FailureTrigger = 'step_failure' | 'timeout' | 'approval_rejection' | 'quality_threshold';
type FailureAction = 'retry' | 'escalate' | 'fail' | 'alternative_path' | 'manual_intervention';

interface RetryConfig {
  max_attempts: number;
  delay_ms: number;
  backoff_multiplier: number;
  max_delay_ms: number;
}

interface RetryPolicy {
  max_attempts: number;
  backoff_strategy: 'linear' | 'exponential' | 'fixed';
  base_delay_ms: number;
  max_delay_ms: number;
  retry_conditions: string[];
}

interface VersionInfo {
  version: string;
  changes: string;
  created_at: Date;
  created_by: string;
}

/**
 * WorkflowCoordinator
 * 
 * Manages complex governance workflows with multi-agent coordination.
 * Based on existing TrustStream workflow management patterns.
 */
export class WorkflowCoordinator {
  private db: DatabaseInterface;
  private communication: AgentCommunication;
  private logger: Logger;
  private workflowDefinitions: Map<string, WorkflowDefinition> = new Map();
  private activeExecutions: Map<string, WorkflowExecution> = new Map();
  private agents: Map<string, GovernanceAgent> = new Map();

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
   * Initialize the workflow coordinator
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Workflow Coordinator');
    
    try {
      await this.loadWorkflowDefinitions();
      await this.loadActiveExecutions();
      await this.setupEventListeners();
      await this.startPeriodicTasks();
      
      this.logger.info('Workflow Coordinator initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Workflow Coordinator', error);
      throw error;
    }
  }

  /**
   * Start a new workflow execution
   */
  async startWorkflow(
    workflowId: string,
    context: ExecutionContext,
    triggeredBy: string
  ): Promise<WorkflowExecution> {
    this.logger.info(`Starting workflow: ${workflowId}`, { triggered_by: triggeredBy });
    
    const workflow = this.workflowDefinitions.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    // Create execution instance
    const execution: WorkflowExecution = {
      id: this.generateExecutionId(),
      workflow_id: workflowId,
      instance_name: `${workflow.name}_${Date.now()}`,
      status: 'pending',
      current_step: workflow.steps[0]?.id || '',
      started_at: new Date(),
      triggered_by: triggeredBy,
      context,
      step_executions: [],
      approvals: [],
      metrics: {
        total_duration_ms: 0,
        step_count: workflow.steps.length,
        approval_count: 0,
        retry_count: 0,
        success_rate: 0,
        agent_performance: {}
      }
    };

    // Persist execution
    await this.persistExecution(execution);
    this.activeExecutions.set(execution.id, execution);

    // Start execution
    await this.executeWorkflow(execution);

    return execution;
  }

  /**
   * Execute workflow steps based on workflow type
   */
  private async executeWorkflow(execution: WorkflowExecution): Promise<void> {
    const workflow = this.workflowDefinitions.get(execution.workflow_id)!;
    execution.status = 'running';

    try {
      switch (workflow.workflow_type) {
        case 'sequential':
          await this.executeSequential(workflow, execution);
          break;
        case 'parallel':
          await this.executeParallel(workflow, execution);
          break;
        case 'conditional':
          await this.executeConditional(workflow, execution);
          break;
        case 'consensus_driven':
          await this.executeConsensus(workflow, execution);
          break;
        default:
          throw new Error(`Unsupported workflow type: ${workflow.workflow_type}`);
      }

      execution.status = 'completed';
      execution.completed_at = new Date();
      execution.metrics.total_duration_ms = execution.completed_at.getTime() - execution.started_at.getTime();
      
    } catch (error) {
      this.logger.error(`Workflow execution failed: ${execution.id}`, error);
      execution.status = 'failed';
      await this.handleWorkflowFailure(execution, error);
    }

    await this.updateExecution(execution);
  }

  /**
   * Execute workflow steps sequentially
   */
  private async executeSequential(workflow: WorkflowDefinition, execution: WorkflowExecution): Promise<void> {
    for (const step of workflow.steps) {
      execution.current_step = step.id;
      await this.executeStep(step, execution);
      
      const stepExecution = execution.step_executions.find(se => se.step_id === step.id);
      if (stepExecution?.status === 'failed') {
        throw new Error(`Step failed: ${step.id}`);
      }
    }
  }

  /**
   * Execute workflow steps in parallel
   */
  private async executeParallel(workflow: WorkflowDefinition, execution: WorkflowExecution): Promise<void> {
    const parallelGroups = this.groupStepsByParallelGroup(workflow.steps);
    
    for (const [groupName, steps] of parallelGroups) {
      const promises = steps.map(step => this.executeStep(step, execution));
      await Promise.all(promises);
      
      // Check if any steps in the group failed
      const failedSteps = execution.step_executions.filter(
        se => steps.some(s => s.id === se.step_id) && se.status === 'failed'
      );
      
      if (failedSteps.length > 0) {
        throw new Error(`Parallel group failed: ${groupName}`);
      }
    }
  }

  /**
   * Execute workflow with conditional logic
   */
  private async executeConditional(workflow: WorkflowDefinition, execution: WorkflowExecution): Promise<void> {
    for (const step of workflow.steps) {
      // Evaluate step conditions
      const shouldExecute = await this.evaluateStepConditions(step, execution);
      
      if (shouldExecute) {
        execution.current_step = step.id;
        await this.executeStep(step, execution);
      } else {
        // Mark step as skipped
        const stepExecution: StepExecution = {
          step_id: step.id,
          execution_id: execution.id,
          agent_id: '',
          status: 'skipped',
          started_at: new Date(),
          completed_at: new Date(),
          inputs: {},
          retry_count: 0
        };
        execution.step_executions.push(stepExecution);
      }
    }
  }

  /**
   * Execute workflow with consensus requirement
   */
  private async executeConsensus(workflow: WorkflowDefinition, execution: WorkflowExecution): Promise<void> {
    // For consensus workflows, execute all steps and then evaluate consensus
    const promises = workflow.steps.map(step => this.executeStep(step, execution));
    await Promise.all(promises);
    
    // Evaluate consensus
    const consensus = await this.evaluateConsensus(workflow, execution);
    if (!consensus.achieved) {
      throw new Error(`Consensus not achieved: ${consensus.reason}`);
    }
  }

  /**
   * Execute individual workflow step
   */
  private async executeStep(step: WorkflowStep, execution: WorkflowExecution): Promise<void> {
    this.logger.info(`Executing step: ${step.id}`, { execution_id: execution.id });
    
    // Find available agent
    const agent = await this.findAvailableAgent(step.agent_type);
    if (!agent) {
      throw new Error(`No available agent for type: ${step.agent_type}`);
    }

    // Create step execution record
    const stepExecution: StepExecution = {
      step_id: step.id,
      execution_id: execution.id,
      agent_id: agent.id,
      status: 'running',
      started_at: new Date(),
      inputs: await this.prepareStepInputs(step, execution),
      retry_count: 0
    };

    execution.step_executions.push(stepExecution);

    try {
      // Execute step with retry logic
      const result = await this.executeStepWithRetry(step, stepExecution, agent);
      
      stepExecution.status = 'completed';
      stepExecution.completed_at = new Date();
      stepExecution.outputs = result;
      
      // Handle approval requirements
      if (step.approval_required) {
        await this.handleApprovalRequirement(step, stepExecution, execution);
      }
      
    } catch (error) {
      stepExecution.status = 'failed';
      stepExecution.error_message = error.message;
      stepExecution.completed_at = new Date();
      
      this.logger.error(`Step execution failed: ${step.id}`, error);
      throw error;
    }
  }

  /**
   * Execute step with retry logic
   */
  private async executeStepWithRetry(
    step: WorkflowStep,
    stepExecution: StepExecution,
    agent: GovernanceAgent
  ): Promise<any> {
    const maxAttempts = step.retry_policy.max_attempts;
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        stepExecution.retry_count = attempt - 1;
        
        // Execute step action through agent communication
        const result = await this.communication.sendMessage(
          'workflow_coordinator',
          agent.id,
          {
            action: step.action,
            inputs: stepExecution.inputs,
            step_id: step.id,
            execution_id: stepExecution.execution_id
          }
        );
        
        // Validate outputs
        await this.validateStepOutputs(step, result);
        
        return result;
        
      } catch (error) {
        lastError = error;
        this.logger.warn(`Step attempt ${attempt} failed: ${step.id}`, error);
        
        if (attempt < maxAttempts) {
          const delay = this.calculateRetryDelay(step.retry_policy, attempt);
          await this.sleep(delay);
        }
      }
    }

    throw lastError!;
  }

  /**
   * Handle approval requirement for a step
   */
  private async handleApprovalRequirement(
    step: WorkflowStep,
    stepExecution: StepExecution,
    execution: WorkflowExecution
  ): Promise<void> {
    stepExecution.status = 'waiting_approval';
    execution.status = 'waiting_approval';
    
    // Create approval record
    const approval: ApprovalRecord = {
      id: this.generateApprovalId(),
      step_id: step.id,
      approver_id: this.determineApprover(step, execution),
      status: 'pending',
      created_at: new Date(),
      approval_level: 1
    };
    
    execution.approvals.push(approval);
    
    // Send approval notification
    await this.sendApprovalNotification(approval, step, execution);
    
    // Wait for approval (this would be handled by external approval process)
    // In a real implementation, this would be event-driven
  }

  // Helper methods
  private async loadWorkflowDefinitions(): Promise<void> {
    const workflows = await this.db.query<WorkflowDefinition>(
      'SELECT * FROM workflow_definitions WHERE active = true'
    );
    
    for (const workflow of workflows) {
      this.workflowDefinitions.set(workflow.id, workflow);
    }
  }

  private async loadActiveExecutions(): Promise<void> {
    const executions = await this.db.query<WorkflowExecution>(
      'SELECT * FROM workflow_executions WHERE status IN ($1, $2, $3)',
      ['running', 'waiting_approval', 'paused']
    );
    
    for (const execution of executions) {
      this.activeExecutions.set(execution.id, execution);
    }
  }

  private async setupEventListeners(): Promise<void> {
    await this.communication.subscribeToEvent('approval_decision', this.handleApprovalDecision.bind(this));
    await this.communication.subscribeToEvent('agent_response', this.handleAgentResponse.bind(this));
  }

  private async startPeriodicTasks(): Promise<void> {
    // Check for timeouts
    setInterval(() => {
      this.checkForTimeouts();
    }, 60000); // Every minute
    
    // Clean up completed executions
    setInterval(() => {
      this.cleanupCompletedExecutions();
    }, 3600000); // Every hour
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateApprovalId(): string {
    return `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async findAvailableAgent(agentType: GovernanceAgentType): Promise<GovernanceAgent | null> {
    // This would integrate with the agent registry
    return Array.from(this.agents.values()).find(
      agent => agent.type === agentType && agent.status === 'active'
    ) || null;
  }

  private async prepareStepInputs(step: WorkflowStep, execution: WorkflowExecution): Promise<any> {
    const inputs: any = {};
    
    for (const source of step.inputs.sources) {
      switch (source.type) {
        case 'previous_step':
          const prevStepExecution = execution.step_executions.find(
            se => se.step_id === source.reference
          );
          if (prevStepExecution?.outputs) {
            Object.assign(inputs, prevStepExecution.outputs);
          }
          break;
        case 'context':
          const contextValue = execution.context.variables[source.reference];
          if (contextValue !== undefined) {
            inputs[source.reference] = contextValue;
          }
          break;
        // Add other source types as needed
      }
    }
    
    return inputs;
  }

  private async validateStepOutputs(step: WorkflowStep, outputs: any): Promise<void> {
    // Validate outputs against schema
    // This would use a JSON schema validator
    if (!outputs || typeof outputs !== 'object') {
      throw new Error('Invalid step outputs');
    }
  }

  private calculateRetryDelay(retryPolicy: RetryPolicy, attempt: number): number {
    switch (retryPolicy.backoff_strategy) {
      case 'exponential':
        return Math.min(
          retryPolicy.base_delay_ms * Math.pow(2, attempt - 1),
          retryPolicy.max_delay_ms
        );
      case 'linear':
        return Math.min(
          retryPolicy.base_delay_ms * attempt,
          retryPolicy.max_delay_ms
        );
      case 'fixed':
      default:
        return retryPolicy.base_delay_ms;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private groupStepsByParallelGroup(steps: WorkflowStep[]): Map<string, WorkflowStep[]> {
    const groups = new Map<string, WorkflowStep[]>();
    
    for (const step of steps) {
      const groupName = step.parallel_group || 'default';
      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }
      groups.get(groupName)!.push(step);
    }
    
    return groups;
  }

  private async evaluateStepConditions(step: WorkflowStep, execution: WorkflowExecution): Promise<boolean> {
    // Evaluate all conditions for the step
    for (const condition of step.conditions) {
      const result = await this.evaluateCondition(condition, execution);
      if (!result) {
        return false;
      }
    }
    return true;
  }

  private async evaluateCondition(condition: StepCondition, execution: WorkflowExecution): Promise<boolean> {
    // Simple condition evaluation - would be more sophisticated in production
    return true;
  }

  private async evaluateConsensus(workflow: WorkflowDefinition, execution: WorkflowExecution): Promise<{achieved: boolean, reason?: string}> {
    const completedSteps = execution.step_executions.filter(se => se.status === 'completed');
    const successRate = completedSteps.length / workflow.steps.length;
    
    if (successRate >= workflow.success_criteria.consensus_threshold) {
      return { achieved: true };
    } else {
      return { achieved: false, reason: `Consensus threshold not met: ${successRate} < ${workflow.success_criteria.consensus_threshold}` };
    }
  }

  private determineApprover(step: WorkflowStep, execution: WorkflowExecution): string {
    // Logic to determine who should approve this step
    return execution.context.user_id || 'system';
  }

  private async sendApprovalNotification(approval: ApprovalRecord, step: WorkflowStep, execution: WorkflowExecution): Promise<void> {
    // Send notification to approver
    this.logger.info(`Approval required for step ${step.id}`, { approval_id: approval.id });
  }

  private async persistExecution(execution: WorkflowExecution): Promise<void> {
    await this.db.create('workflow_executions', execution);
  }

  private async updateExecution(execution: WorkflowExecution): Promise<void> {
    await this.db.update('workflow_executions', execution.id, execution);
  }

  private async handleWorkflowFailure(execution: WorkflowExecution, error: Error): Promise<void> {
    this.logger.error(`Workflow failed: ${execution.id}`, error);
    // Handle failure policies
  }

  private handleApprovalDecision(event: any): void {
    // Handle approval decision events
    this.logger.info('Approval decision received', event);
  }

  private handleAgentResponse(event: any): void {
    // Handle agent response events
    this.logger.info('Agent response received', event);
  }

  private async checkForTimeouts(): Promise<void> {
    // Check for timed-out executions
    const now = new Date();
    for (const execution of this.activeExecutions.values()) {
      const workflow = this.workflowDefinitions.get(execution.workflow_id);
      if (workflow) {
        const timeLimit = workflow.success_criteria.time_limit_hours * 3600000; // Convert to ms
        const elapsed = now.getTime() - execution.started_at.getTime();
        
        if (elapsed > timeLimit) {
          execution.status = 'failed';
          await this.updateExecution(execution);
          this.activeExecutions.delete(execution.id);
        }
      }
    }
  }

  private async cleanupCompletedExecutions(): Promise<void> {
    // Remove completed executions from memory
    for (const [id, execution] of this.activeExecutions) {
      if (['completed', 'failed', 'cancelled'].includes(execution.status)) {
        this.activeExecutions.delete(id);
      }
    }
  }
}
