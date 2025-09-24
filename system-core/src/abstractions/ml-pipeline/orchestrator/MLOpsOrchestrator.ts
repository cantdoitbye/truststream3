/**
 * MLOps Orchestrator
 * Coordinates and manages all ML pipeline operations across the entire lifecycle
 */

import { EventEmitter } from 'events';
import { IDatabaseService } from '../shared-utils/database-interface';
import { IStorageService } from '../shared-utils/storage-interface';
import { MLPipelineService } from './MLPipelineService';
import { MLDataPipelineService } from './data/MLDataPipelineService';
import { MLTrainingService } from './training/MLTrainingService';
import { MLInferenceService } from './inference/MLInferenceService';
import { MLExperimentService } from './experiment/MLExperimentService';
import { MLDataVersioningService } from './versioning/MLDataVersioningService';
import { MLAutoRetrainingService } from './retraining/MLAutoRetrainingService';
import { MLEventService } from './events/MLEventService';
import {
  MLPipelineConfig,
  MLPipelineRun,
  MLSystemHealth,
  MLPipelineEvent
} from './interfaces/ml-pipeline.interface';

export interface MLOpsConfig {
  database: IDatabaseService;
  storage: IStorageService;
  enableExperimentTracking?: boolean;
  enableDataVersioning?: boolean;
  enableAutoRetraining?: boolean;
  enableMonitoring?: boolean;
  enableContinuousLearning?: boolean;
  computeConfig?: {
    defaultCpu: number;
    defaultMemory: string;
    maxConcurrentJobs?: number;
    autoscaling?: boolean;
  };
  storageConfig?: {
    dataPath: string;
    modelPath: string;
    artifactPath: string;
    versioning?: boolean;
  };
  orchestrationConfig?: {
    maxRetries: number;
    defaultTimeout: number; // seconds
    healthCheckInterval: number; // seconds
    resourceCleanupInterval: number; // seconds
  };
}

export interface MLOpsWorkflow {
  id: string;
  name: string;
  description?: string;
  type: 'full_lifecycle' | 'training_only' | 'inference_only' | 'data_pipeline' | 'custom';
  stages: MLOpsStage[];
  triggers: MLOpsTrigger[];
  configuration: MLOpsWorkflowConfig;
  dependencies: string[]; // Other workflow IDs
  status: 'draft' | 'active' | 'paused' | 'archived';
  metrics: MLOpsWorkflowMetrics;
  schedule?: {
    enabled: boolean;
    cron: string;
    timezone?: string;
  };
  approval?: {
    required: boolean;
    approvers: string[];
    autoApprove?: {
      conditions: string[];
    };
  };
  tags: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface MLOpsStage {
  id: string;
  name: string;
  type: 'data_preparation' | 'training' | 'validation' | 'deployment' | 'monitoring' | 'custom';
  service: 'data' | 'training' | 'inference' | 'experiment' | 'versioning' | 'retraining';
  configuration: Record<string, any>;
  dependencies: string[]; // Other stage IDs
  conditions: MLOpsCondition[];
  retryPolicy: {
    maxAttempts: number;
    backoffStrategy: 'linear' | 'exponential' | 'fixed';
    backoffDelay: number; // seconds
  };
  timeout?: number; // seconds
  resources?: {
    cpu?: number;
    memory?: string;
    gpu?: number;
  };
  outputMapping?: Record<string, string>; // Maps outputs to next stage inputs
}

export interface MLOpsTrigger {
  type: 'schedule' | 'data_change' | 'model_drift' | 'performance_degradation' | 'manual' | 'api' | 'event';
  configuration: Record<string, any>;
  enabled: boolean;
  conditions?: string[];
}

export interface MLOpsCondition {
  type: 'data_quality' | 'model_performance' | 'resource_availability' | 'approval' | 'custom';
  expression: string;
  required: boolean;
  timeout?: number; // seconds
}

export interface MLOpsWorkflowConfig {
  parallelism: {
    enabled: boolean;
    maxConcurrentStages: number;
  };
  rollback: {
    enabled: boolean;
    strategy: 'previous_version' | 'checkpoint' | 'manual';
    triggers: string[];
  };
  monitoring: {
    enabled: boolean;
    alerting: {
      channels: string[];
      thresholds: Record<string, number>;
    };
    dashboards: {
      enabled: boolean;
      customDashboards?: string[];
    };
  };
  security: {
    encryption: boolean;
    accessControl: boolean;
    auditLogging: boolean;
  };
  optimization: {
    enabled: boolean;
    strategies: string[];
    targetMetrics: string[];
  };
}

export interface MLOpsWorkflowMetrics {
  executions: {
    total: number;
    successful: number;
    failed: number;
    averageDuration: number;
  };
  performance: {
    successRate: number;
    reliability: number;
    efficiency: number;
  };
  resource: {
    averageCpuUsage: number;
    averageMemoryUsage: number;
    totalCost?: number;
  };
  business: {
    modelsDeployed: number;
    dataProcessed: number; // GB
    predictionsMade: number;
  };
}

export interface MLOpsExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  triggeredBy: {
    type: string;
    userId?: string;
    source?: string;
  };
  stages: MLOpsStageExecution[];
  outputs: Record<string, any>;
  metrics: Record<string, any>;
  logs: MLOpsExecutionLog[];
  error?: {
    message: string;
    stage?: string;
    stack?: string;
  };
  resourceUsage: {
    cpu: number;
    memory: number;
    gpu?: number;
    storage: number;
    cost?: number;
  };
}

export interface MLOpsStageExecution {
  stageId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  attempts: number;
  outputs?: Record<string, any>;
  error?: string;
  resourceUsage?: Record<string, any>;
}

export interface MLOpsExecutionLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warning' | 'error';
  stage?: string;
  component: string;
  message: string;
  data?: Record<string, any>;
}

export class MLOpsOrchestrator extends EventEmitter {
  private database: IDatabaseService;
  private storage: IStorageService;
  private config: MLOpsConfig;
  private eventService: MLEventService;
  
  // Core services
  private pipelineService: MLPipelineService;
  private dataService: MLDataPipelineService;
  private trainingService: MLTrainingService;
  private inferenceService: MLInferenceService;
  private experimentService?: MLExperimentService;
  private versioningService?: MLDataVersioningService;
  private retrainingService?: MLAutoRetrainingService;
  
  // State management
  private workflows: Map<string, MLOpsWorkflow> = new Map();
  private executions: Map<string, MLOpsExecution> = new Map();
  private scheduledWorkflows: Map<string, NodeJS.Timeout> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;
  private isInitialized = false;

  constructor(config: MLOpsConfig) {
    super();
    this.database = config.database;
    this.storage = config.storage;
    this.config = config;
    this.eventService = new MLEventService();
    
    // Initialize core services
    this.pipelineService = new MLPipelineService({
      database: this.database,
      storage: this.storage,
      enableExperimentTracking: config.enableExperimentTracking,
      enableDataVersioning: config.enableDataVersioning,
      enableAutoRetraining: config.enableAutoRetraining,
      enableMonitoring: config.enableMonitoring,
      computeConfig: config.computeConfig,
      storageConfig: config.storageConfig
    });
    
    this.setupEventHandlers();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize database schema
      await this.initializeDatabaseSchema();
      
      // Initialize core services
      await this.pipelineService.initialize();
      
      // Initialize optional services
      if (this.config.enableExperimentTracking && this.experimentService) {
        await this.experimentService.initialize();
      }
      
      if (this.config.enableDataVersioning && this.versioningService) {
        await this.versioningService.initialize();
      }
      
      if (this.config.enableAutoRetraining && this.retrainingService) {
        await this.retrainingService.initialize();
      }
      
      // Load existing workflows
      await this.loadExistingWorkflows();
      
      // Start health monitoring
      if (this.config.orchestrationConfig?.healthCheckInterval) {
        this.startHealthMonitoring();
      }
      
      // Start scheduled workflows
      await this.startScheduledWorkflows();
      
      this.isInitialized = true;
      this.emit('initialized');
      
    } catch (error) {
      throw new Error(
        `Failed to initialize MLOps Orchestrator: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async shutdown(): Promise<void> {
    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Stop scheduled workflows
    for (const [workflowId, timeout] of this.scheduledWorkflows) {
      clearTimeout(timeout);
    }
    this.scheduledWorkflows.clear();
    
    // Cancel running executions
    for (const execution of this.executions.values()) {
      if (['pending', 'running'].includes(execution.status)) {
        await this.cancelExecution(execution.id);
      }
    }
    
    this.isInitialized = false;
    this.emit('shutdown');
  }

  // Workflow Management
  async createWorkflow(workflow: Partial<MLOpsWorkflow>): Promise<string> {
    this.ensureInitialized();
    
    const workflowData: MLOpsWorkflow = {
      id: workflow.id || this.generateWorkflowId(),
      name: workflow.name || 'Untitled Workflow',
      type: workflow.type || 'custom',
      stages: workflow.stages || [],
      triggers: workflow.triggers || [],
      configuration: workflow.configuration || this.getDefaultWorkflowConfig(),
      dependencies: workflow.dependencies || [],
      status: workflow.status || 'draft',
      metrics: workflow.metrics || this.getInitialMetrics(),
      tags: workflow.tags || [],
      metadata: workflow.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: workflow.createdBy || 'system',
      ...workflow
    };
    
    // Validate workflow
    await this.validateWorkflow(workflowData);
    
    // Store in database
    await this.database.create('mlops_workflows', workflowData);
    
    // Cache workflow
    this.workflows.set(workflowData.id, workflowData);
    
    // Set up scheduling if enabled
    if (workflowData.schedule?.enabled && workflowData.status === 'active') {
      await this.scheduleWorkflow(workflowData.id);
    }
    
    this.emit('workflow_created', { workflowId: workflowData.id });
    
    return workflowData.id;
  }

  async executeWorkflow(workflowId: string, options?: {
    triggeredBy?: { type: string; userId?: string; source?: string };
    parameters?: Record<string, any>;
  }): Promise<string> {
    this.ensureInitialized();
    
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    
    if (workflow.status !== 'active') {
      throw new Error(`Workflow ${workflowId} is not active (status: ${workflow.status})`);
    }
    
    // Create execution record
    const execution: MLOpsExecution = {
      id: this.generateExecutionId(),
      workflowId,
      status: 'pending',
      startTime: new Date(),
      triggeredBy: options?.triggeredBy || { type: 'manual', source: 'api' },
      stages: workflow.stages.map(stage => ({
        stageId: stage.id,
        status: 'pending',
        attempts: 0
      })),
      outputs: {},
      metrics: {},
      logs: [],
      resourceUsage: {
        cpu: 0,
        memory: 0,
        storage: 0
      }
    };
    
    // Store execution
    await this.database.create('mlops_executions', execution);
    this.executions.set(execution.id, execution);
    
    // Execute workflow asynchronously
    this.executeWorkflowAsync(execution, options?.parameters);
    
    this.emit('workflow_started', { workflowId, executionId: execution.id });
    
    return execution.id;
  }

  async getWorkflowStatus(workflowId: string): Promise<{
    workflow: MLOpsWorkflow;
    recentExecutions: MLOpsExecution[];
    metrics: MLOpsWorkflowMetrics;
  } | null> {
    this.ensureInitialized();
    
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return null;
    }
    
    // Get recent executions
    const executions = await this.database.read<MLOpsExecution>('mlops_executions', {
      where: [{ column: 'workflowId', operator: 'eq', value: workflowId }],
      orderBy: { column: 'startTime', direction: 'DESC' },
      limit: 10
    });
    
    // Calculate metrics
    const metrics = this.calculateWorkflowMetrics(executions);
    
    return {
      workflow,
      recentExecutions: executions,
      metrics
    };
  }

  async getSystemOverview(): Promise<{
    health: MLSystemHealth;
    workflows: {
      total: number;
      active: number;
      running: number;
    };
    executions: {
      total: number;
      running: number;
      successful: number;
      failed: number;
    };
    resources: {
      utilization: Record<string, number>;
      costs?: Record<string, number>;
    };
  }> {
    this.ensureInitialized();
    
    const [health, workflowStats, executionStats] = await Promise.all([
      this.pipelineService.getSystemHealth(),
      this.getWorkflowStatistics(),
      this.getExecutionStatistics()
    ]);
    
    return {
      health,
      workflows: workflowStats,
      executions: executionStats,
      resources: {
        utilization: {
          cpu: 0, // Would be implemented with actual monitoring
          memory: 0,
          storage: 0
        }
      }
    };
  }

  async optimizeWorkflows(): Promise<{
    recommendations: Array<{
      workflowId: string;
      type: string;
      description: string;
      impact: string;
    }>;
    autoApplied: string[];
  }> {
    this.ensureInitialized();
    
    const recommendations = [];
    const autoApplied = [];
    
    // Analyze workflows for optimization opportunities
    for (const [workflowId, workflow] of this.workflows) {
      const executions = await this.getWorkflowExecutions(workflowId, 20);
      
      // Check for frequently failing stages
      const failureAnalysis = this.analyzeFailurePatterns(executions);
      if (failureAnalysis.highFailureRate) {
        recommendations.push({
          workflowId,
          type: 'reliability',
          description: `Stage "${failureAnalysis.stage}" has high failure rate (${failureAnalysis.rate}%)`,
          impact: 'Increase retry attempts or add error handling'
        });
      }
      
      // Check for resource optimization
      const resourceAnalysis = this.analyzeResourceUsage(executions);
      if (resourceAnalysis.underutilized) {
        recommendations.push({
          workflowId,
          type: 'resource_optimization',
          description: `CPU utilization is only ${resourceAnalysis.cpuUtilization}%`,
          impact: 'Reduce allocated resources to save costs'
        });
      }
      
      // Check for parallelization opportunities
      const parallelizationAnalysis = this.analyzeParallelizationOpportunities(workflow);
      if (parallelizationAnalysis.canOptimize) {
        recommendations.push({
          workflowId,
          type: 'parallelization',
          description: 'Stages can be parallelized for faster execution',
          impact: `Reduce execution time by ~${parallelizationAnalysis.speedupPercent}%`
        });
      }
    }
    
    return { recommendations, autoApplied };
  }

  // Private Methods
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('MLOpsOrchestrator not initialized');
    }
  }

  private async initializeDatabaseSchema(): Promise<void> {
    const tables = [
      {
        name: 'mlops_workflows',
        columns: [
          'id VARCHAR(255) PRIMARY KEY',
          'name VARCHAR(255) NOT NULL',
          'description TEXT',
          'type VARCHAR(100) NOT NULL',
          'stages JSONB NOT NULL',
          'triggers JSONB NOT NULL',
          'configuration JSONB NOT NULL',
          'dependencies JSONB',
          'status VARCHAR(50) NOT NULL',
          'metrics JSONB',
          'schedule JSONB',
          'approval JSONB',
          'tags JSONB',
          'metadata JSONB',
          'created_at TIMESTAMP NOT NULL',
          'updated_at TIMESTAMP NOT NULL',
          'created_by VARCHAR(255)'
        ].join(', ')
      },
      {
        name: 'mlops_executions',
        columns: [
          'id VARCHAR(255) PRIMARY KEY',
          'workflow_id VARCHAR(255) NOT NULL',
          'status VARCHAR(50) NOT NULL',
          'start_time TIMESTAMP NOT NULL',
          'end_time TIMESTAMP',
          'duration INTEGER',
          'triggered_by JSONB NOT NULL',
          'stages JSONB NOT NULL',
          'outputs JSONB',
          'metrics JSONB',
          'logs JSONB',
          'error JSONB',
          'resource_usage JSONB'
        ].join(', ')
      }
    ];

    for (const table of tables) {
      try {
        await this.database.rawQuery(
          `CREATE TABLE IF NOT EXISTS ${table.name} (${table.columns})`
        );
      } catch (error) {
        console.warn(`Failed to create table ${table.name}:`, error);
      }
    }
  }

  private async loadExistingWorkflows(): Promise<void> {
    try {
      const workflows = await this.database.read<MLOpsWorkflow>('mlops_workflows');
      for (const workflow of workflows) {
        this.workflows.set(workflow.id, workflow);
      }
    } catch (error) {
      console.warn('Failed to load existing workflows:', error);
    }
  }

  private setupEventHandlers(): void {
    // Handle pipeline events
    this.pipelineService.onPipelineEvent((event: MLPipelineEvent) => {
      this.emit('pipeline_event', event);
    });
  }

  private startHealthMonitoring(): void {
    const interval = this.config.orchestrationConfig?.healthCheckInterval || 30000;
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.pipelineService.getSystemHealth();
        
        if (health.overall !== 'healthy') {
          this.emit('health_warning', { health });
        }
        
        // Check for stuck executions
        const stuckExecutions = await this.findStuckExecutions();
        if (stuckExecutions.length > 0) {
          this.emit('stuck_executions', { executions: stuckExecutions });
        }
        
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, interval);
  }

  private async startScheduledWorkflows(): Promise<void> {
    for (const workflow of this.workflows.values()) {
      if (workflow.schedule?.enabled && workflow.status === 'active') {
        await this.scheduleWorkflow(workflow.id);
      }
    }
  }

  private async scheduleWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow?.schedule?.enabled) {
      return;
    }
    
    // Simple interval-based scheduling (in production, use a proper cron library)
    const intervalMs = this.parseCronToInterval(workflow.schedule.cron);
    
    const scheduleExecution = () => {
      this.executeWorkflow(workflowId, {
        triggeredBy: { type: 'schedule', source: 'cron' }
      }).catch(error => {
        console.error(`Scheduled workflow ${workflowId} failed:`, error);
      }).finally(() => {
        // Reschedule
        const timeout = setTimeout(scheduleExecution, intervalMs);
        this.scheduledWorkflows.set(workflowId, timeout);
      });
    };
    
    const timeout = setTimeout(scheduleExecution, intervalMs);
    this.scheduledWorkflows.set(workflowId, timeout);
  }

  private async executeWorkflowAsync(execution: MLOpsExecution, parameters?: Record<string, any>): Promise<void> {
    try {
      execution.status = 'running';
      await this.database.update('mlops_executions', execution.id, { status: 'running' });
      
      const workflow = this.workflows.get(execution.workflowId)!;
      
      // Execute stages according to dependencies and configuration
      await this.executeStages(execution, workflow, parameters);
      
      execution.status = 'completed';
      execution.endTime = new Date();
      execution.duration = Math.floor((execution.endTime.getTime() - execution.startTime.getTime()) / 1000);
      
      await this.database.update('mlops_executions', execution.id, {
        status: 'completed',
        endTime: execution.endTime,
        duration: execution.duration
      });
      
      this.emit('workflow_completed', {
        workflowId: execution.workflowId,
        executionId: execution.id,
        duration: execution.duration
      });
      
    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.duration = Math.floor((execution.endTime.getTime() - execution.startTime.getTime()) / 1000);
      execution.error = {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      };
      
      await this.database.update('mlops_executions', execution.id, {
        status: 'failed',
        endTime: execution.endTime,
        duration: execution.duration,
        error: execution.error
      });
      
      this.emit('workflow_failed', {
        workflowId: execution.workflowId,
        executionId: execution.id,
        error: execution.error
      });
    }
  }

  private async executeStages(execution: MLOpsExecution, workflow: MLOpsWorkflow, parameters?: Record<string, any>): Promise<void> {
    // Simple sequential execution (in production, implement proper dependency resolution and parallelization)
    for (const stageExecution of execution.stages) {
      const stage = workflow.stages.find(s => s.id === stageExecution.stageId);
      if (!stage) {
        throw new Error(`Stage ${stageExecution.stageId} not found in workflow`);
      }
      
      stageExecution.status = 'running';
      stageExecution.startTime = new Date();
      stageExecution.attempts++;
      
      try {
        // Execute stage based on service type
        await this.executeStage(stage, execution, parameters);
        
        stageExecution.status = 'completed';
        stageExecution.endTime = new Date();
        stageExecution.duration = Math.floor(
          (stageExecution.endTime.getTime() - stageExecution.startTime.getTime()) / 1000
        );
        
      } catch (error) {
        stageExecution.status = 'failed';
        stageExecution.error = error instanceof Error ? error.message : 'Unknown error';
        
        // Implement retry logic if configured
        if (stageExecution.attempts < stage.retryPolicy.maxAttempts) {
          // Wait for backoff period and retry
          const delay = this.calculateBackoffDelay(stage.retryPolicy, stageExecution.attempts);
          await new Promise(resolve => setTimeout(resolve, delay * 1000));
          
          stageExecution.status = 'pending';
          continue; // Retry the stage
        } else {
          throw error; // Max retries exceeded
        }
      }
    }
  }

  private async executeStage(stage: MLOpsStage, execution: MLOpsExecution, parameters?: Record<string, any>): Promise<void> {
    // Route to appropriate service based on stage type
    switch (stage.service) {
      case 'data':
        await this.executeDataStage(stage, execution, parameters);
        break;
      case 'training':
        await this.executeTrainingStage(stage, execution, parameters);
        break;
      case 'inference':
        await this.executeInferenceStage(stage, execution, parameters);
        break;
      default:
        throw new Error(`Unsupported stage service: ${stage.service}`);
    }
  }

  private async executeDataStage(stage: MLOpsStage, execution: MLOpsExecution, parameters?: Record<string, any>): Promise<void> {
    // Implementation would call data service methods
    // Simulated execution
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async executeTrainingStage(stage: MLOpsStage, execution: MLOpsExecution, parameters?: Record<string, any>): Promise<void> {
    // Implementation would call training service methods
    // Simulated execution
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private async executeInferenceStage(stage: MLOpsStage, execution: MLOpsExecution, parameters?: Record<string, any>): Promise<void> {
    // Implementation would call inference service methods
    // Simulated execution
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  private async cancelExecution(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (execution && ['pending', 'running'].includes(execution.status)) {
      execution.status = 'cancelled';
      execution.endTime = new Date();
      execution.duration = Math.floor((execution.endTime.getTime() - execution.startTime.getTime()) / 1000);
      
      await this.database.update('mlops_executions', executionId, {
        status: 'cancelled',
        endTime: execution.endTime,
        duration: execution.duration
      });
    }
  }

  private async validateWorkflow(workflow: MLOpsWorkflow): Promise<void> {
    // Validate workflow configuration
    if (!workflow.stages || workflow.stages.length === 0) {
      throw new Error('Workflow must have at least one stage');
    }
    
    // Validate stage dependencies
    const stageIds = new Set(workflow.stages.map(s => s.id));
    for (const stage of workflow.stages) {
      for (const dep of stage.dependencies) {
        if (!stageIds.has(dep)) {
          throw new Error(`Stage ${stage.id} depends on non-existent stage ${dep}`);
        }
      }
    }
    
    // Check for circular dependencies
    if (this.hasCircularDependencies(workflow.stages)) {
      throw new Error('Workflow has circular dependencies');
    }
  }

  private hasCircularDependencies(stages: MLOpsStage[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const hasCycle = (stageId: string): boolean => {
      if (recursionStack.has(stageId)) {
        return true;
      }
      if (visited.has(stageId)) {
        return false;
      }
      
      visited.add(stageId);
      recursionStack.add(stageId);
      
      const stage = stages.find(s => s.id === stageId);
      if (stage) {
        for (const dep of stage.dependencies) {
          if (hasCycle(dep)) {
            return true;
          }
        }
      }
      
      recursionStack.delete(stageId);
      return false;
    };
    
    for (const stage of stages) {
      if (!visited.has(stage.id) && hasCycle(stage.id)) {
        return true;
      }
    }
    
    return false;
  }

  private generateWorkflowId(): string {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultWorkflowConfig(): MLOpsWorkflowConfig {
    return {
      parallelism: {
        enabled: false,
        maxConcurrentStages: 1
      },
      rollback: {
        enabled: false,
        strategy: 'previous_version',
        triggers: []
      },
      monitoring: {
        enabled: true,
        alerting: {
          channels: [],
          thresholds: {}
        },
        dashboards: {
          enabled: false
        }
      },
      security: {
        encryption: false,
        accessControl: false,
        auditLogging: true
      },
      optimization: {
        enabled: false,
        strategies: [],
        targetMetrics: []
      }
    };
  }

  private getInitialMetrics(): MLOpsWorkflowMetrics {
    return {
      executions: {
        total: 0,
        successful: 0,
        failed: 0,
        averageDuration: 0
      },
      performance: {
        successRate: 0,
        reliability: 0,
        efficiency: 0
      },
      resource: {
        averageCpuUsage: 0,
        averageMemoryUsage: 0
      },
      business: {
        modelsDeployed: 0,
        dataProcessed: 0,
        predictionsMade: 0
      }
    };
  }

  private calculateWorkflowMetrics(executions: MLOpsExecution[]): MLOpsWorkflowMetrics {
    const total = executions.length;
    const successful = executions.filter(e => e.status === 'completed').length;
    const failed = executions.filter(e => e.status === 'failed').length;
    const completedExecutions = executions.filter(e => e.duration !== undefined);
    const averageDuration = completedExecutions.length > 0 ?
      completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) / completedExecutions.length : 0;
    
    return {
      executions: {
        total,
        successful,
        failed,
        averageDuration
      },
      performance: {
        successRate: total > 0 ? successful / total : 0,
        reliability: total > 0 ? successful / total : 0, // Simplified
        efficiency: 1 // Simplified
      },
      resource: {
        averageCpuUsage: 0, // Would be calculated from actual resource data
        averageMemoryUsage: 0
      },
      business: {
        modelsDeployed: 0, // Would be tracked from actual deployments
        dataProcessed: 0,
        predictionsMade: 0
      }
    };
  }

  private async getWorkflowStatistics() {
    const workflows = Array.from(this.workflows.values());
    const activeWorkflows = workflows.filter(w => w.status === 'active');
    const runningExecutions = Array.from(this.executions.values())
      .filter(e => e.status === 'running');
    
    return {
      total: workflows.length,
      active: activeWorkflows.length,
      running: runningExecutions.length
    };
  }

  private async getExecutionStatistics() {
    const executions = Array.from(this.executions.values());
    
    return {
      total: executions.length,
      running: executions.filter(e => e.status === 'running').length,
      successful: executions.filter(e => e.status === 'completed').length,
      failed: executions.filter(e => e.status === 'failed').length
    };
  }

  private async getWorkflowExecutions(workflowId: string, limit: number): Promise<MLOpsExecution[]> {
    return this.database.read<MLOpsExecution>('mlops_executions', {
      where: [{ column: 'workflowId', operator: 'eq', value: workflowId }],
      orderBy: { column: 'startTime', direction: 'DESC' },
      limit
    });
  }

  private async findStuckExecutions(): Promise<MLOpsExecution[]> {
    const timeout = this.config.orchestrationConfig?.defaultTimeout || 3600; // 1 hour
    const cutoffTime = new Date(Date.now() - timeout * 1000);
    
    return Array.from(this.executions.values()).filter(execution => 
      ['pending', 'running'].includes(execution.status) && 
      execution.startTime < cutoffTime
    );
  }

  private analyzeFailurePatterns(executions: MLOpsExecution[]): {
    highFailureRate: boolean;
    stage?: string;
    rate: number;
  } {
    // Simplified failure analysis
    const failedExecutions = executions.filter(e => e.status === 'failed');
    const rate = executions.length > 0 ? (failedExecutions.length / executions.length) * 100 : 0;
    
    return {
      highFailureRate: rate > 20, // More than 20% failure rate
      rate
    };
  }

  private analyzeResourceUsage(executions: MLOpsExecution[]): {
    underutilized: boolean;
    cpuUtilization: number;
  } {
    // Simplified resource analysis
    return {
      underutilized: true, // Simplified
      cpuUtilization: 30 // Simplified
    };
  }

  private analyzeParallelizationOpportunities(workflow: MLOpsWorkflow): {
    canOptimize: boolean;
    speedupPercent: number;
  } {
    // Simplified parallelization analysis
    const independentStages = workflow.stages.filter(stage => stage.dependencies.length === 0);
    
    return {
      canOptimize: independentStages.length > 1,
      speedupPercent: 25 // Simplified
    };
  }

  private calculateBackoffDelay(retryPolicy: MLOpsStage['retryPolicy'], attempt: number): number {
    switch (retryPolicy.backoffStrategy) {
      case 'linear':
        return retryPolicy.backoffDelay * attempt;
      case 'exponential':
        return retryPolicy.backoffDelay * Math.pow(2, attempt - 1);
      case 'fixed':
      default:
        return retryPolicy.backoffDelay;
    }
  }

  private parseCronToInterval(cron: string): number {
    // Simplified cron parsing - return 1 hour interval
    return 60 * 60 * 1000;
  }
}
