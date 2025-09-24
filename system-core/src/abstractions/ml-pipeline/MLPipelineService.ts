/**
 * ML Pipeline Service
 * Core service for managing ML pipelines with backend abstraction support
 */

import { EventEmitter } from 'events';
import { IDatabaseService } from '../shared-utils/database-interface';
import { IStorageService } from '../shared-utils/storage-interface';
import {
  MLPipelineConfig,
  MLPipelineRun,
  MLSystemHealth,
  MLPipelineEvent,
  IMLPipelineService,
  MLPipelineError,
  MLConfigurationError,
  MLExecutionError
} from './interfaces/ml-pipeline.interface';
import { MLDataPipelineService } from './data/MLDataPipelineService';
import { MLTrainingService } from './training/MLTrainingService';
import { MLInferenceService } from './inference/MLInferenceService';
import { MLExperimentService } from './experiment/MLExperimentService';
import { MLDataVersioningService } from './versioning/MLDataVersioningService';
import { MLAutoRetrainingService } from './retraining/MLAutoRetrainingService';
import { MLEventService } from './events/MLEventService';
import { MLConfigManager } from './config/MLConfigManager';

export interface MLPipelineServiceConfig {
  database: IDatabaseService;
  storage: IStorageService;
  enableExperimentTracking?: boolean;
  enableDataVersioning?: boolean;
  enableAutoRetraining?: boolean;
  enableMonitoring?: boolean;
  computeConfig?: {
    defaultCpu: number;
    defaultMemory: string;
    maxConcurrentJobs?: number;
  };
  storageConfig?: {
    dataPath: string;
    modelPath: string;
    artifactPath: string;
  };
}

export class MLPipelineService extends EventEmitter implements IMLPipelineService {
  private database: IDatabaseService;
  private storage: IStorageService;
  private config: MLConfigManager;
  private eventService: MLEventService;
  
  // Sub-services
  private dataService: MLDataPipelineService;
  private trainingService: MLTrainingService;
  private inferenceService: MLInferenceService;
  private experimentService: MLExperimentService;
  private versioningService: MLDataVersioningService;
  private retrainingService: MLAutoRetrainingService;
  
  private pipelines: Map<string, MLPipelineConfig> = new Map();
  private runs: Map<string, MLPipelineRun> = new Map();
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized = false;

  constructor(config: MLPipelineServiceConfig) {
    super();
    this.database = config.database;
    this.storage = config.storage;
    this.config = new MLConfigManager(config);
    this.eventService = new MLEventService();
    
    // Initialize sub-services
    this.dataService = new MLDataPipelineService({
      database: this.database,
      storage: this.storage,
      eventService: this.eventService
    });
    
    this.trainingService = new MLTrainingService({
      database: this.database,
      storage: this.storage,
      eventService: this.eventService,
      dataService: this.dataService
    });
    
    this.inferenceService = new MLInferenceService({
      database: this.database,
      storage: this.storage,
      eventService: this.eventService
    });
    
    if (config.enableExperimentTracking) {
      this.experimentService = new MLExperimentService({
        database: this.database,
        storage: this.storage,
        eventService: this.eventService
      });
    }
    
    if (config.enableDataVersioning) {
      this.versioningService = new MLDataVersioningService({
        database: this.database,
        storage: this.storage,
        eventService: this.eventService
      });
    }
    
    if (config.enableAutoRetraining) {
      this.retrainingService = new MLAutoRetrainingService({
        database: this.database,
        storage: this.storage,
        eventService: this.eventService,
        trainingService: this.trainingService,
        inferenceService: this.inferenceService
      });
    }
    
    this.setupEventHandlers();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize database schema
      await this.initializeDatabaseSchema();
      
      // Initialize sub-services
      await this.dataService.initialize();
      await this.trainingService.initialize();
      await this.inferenceService.initialize();
      
      if (this.experimentService) {
        await this.experimentService.initialize();
      }
      
      if (this.versioningService) {
        await this.versioningService.initialize();
      }
      
      if (this.retrainingService) {
        await this.retrainingService.initialize();
      }
      
      // Load existing pipelines
      await this.loadExistingPipelines();
      
      this.isInitialized = true;
      this.emit('initialized');
      
    } catch (error) {
      throw new MLPipelineError(
        `Failed to initialize ML Pipeline Service: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Pipeline Management
  async createPipeline(config: MLPipelineConfig): Promise<string> {
    this.ensureInitialized();
    
    try {
      // Validate configuration
      await this.config.validatePipelineConfig(config);
      
      // Store pipeline in database
      const pipelineData = {
        ...config,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await this.database.create('ml_pipelines', pipelineData);
      
      // Cache pipeline
      this.pipelines.set(config.id, config);
      
      // Emit event
      this.eventService.emit({
        type: 'pipeline_created',
        pipelineId: config.id,
        timestamp: new Date(),
        data: { config },
        severity: 'info'
      });
      
      return config.id;
      
    } catch (error) {
      throw new MLConfigurationError(
        `Failed to create pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`,
        config.id
      );
    }
  }

  async getPipeline(id: string): Promise<MLPipelineConfig | null> {
    this.ensureInitialized();
    
    // Check cache first
    if (this.pipelines.has(id)) {
      return this.pipelines.get(id)!;
    }
    
    try {
      const result = await this.database.readOne<MLPipelineConfig>('ml_pipelines', {
        where: [{ column: 'id', operator: 'eq', value: id }]
      });
      
      if (result) {
        this.pipelines.set(id, result);
      }
      
      return result;
      
    } catch (error) {
      throw new MLPipelineError(
        `Failed to get pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        id
      );
    }
  }

  async updatePipeline(id: string, updates: Partial<MLPipelineConfig>): Promise<void> {
    this.ensureInitialized();
    
    try {
      const existing = await this.getPipeline(id);
      if (!existing) {
        throw new Error(`Pipeline ${id} not found`);
      }
      
      const updated = {
        ...existing,
        ...updates,
        updatedAt: new Date()
      };
      
      // Validate updated configuration
      await this.config.validatePipelineConfig(updated);
      
      // Update in database
      await this.database.update('ml_pipelines', id, updates);
      
      // Update cache
      this.pipelines.set(id, updated);
      
      // Emit event
      this.eventService.emit({
        type: 'pipeline_updated',
        pipelineId: id,
        timestamp: new Date(),
        data: { updates },
        severity: 'info'
      } as MLPipelineEvent);
      
    } catch (error) {
      throw new MLConfigurationError(
        `Failed to update pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`,
        id
      );
    }
  }

  async deletePipeline(id: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      // Check for running jobs
      const runningRuns = Array.from(this.runs.values())
        .filter(run => run.pipelineId === id && ['pending', 'running'].includes(run.status));
      
      if (runningRuns.length > 0) {
        throw new Error(`Cannot delete pipeline ${id}: has ${runningRuns.length} running jobs`);
      }
      
      // Cancel scheduled jobs
      if (this.scheduledJobs.has(id)) {
        clearTimeout(this.scheduledJobs.get(id)!);
        this.scheduledJobs.delete(id);
      }
      
      // Delete from database
      await this.database.delete('ml_pipelines', id);
      
      // Remove from cache
      this.pipelines.delete(id);
      
      // Emit event
      this.eventService.emit({
        type: 'pipeline_deleted',
        pipelineId: id,
        timestamp: new Date(),
        data: {},
        severity: 'info'
      } as MLPipelineEvent);
      
    } catch (error) {
      throw new MLPipelineError(
        `Failed to delete pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        id
      );
    }
  }

  async listPipelines(filters?: Record<string, any>): Promise<MLPipelineConfig[]> {
    this.ensureInitialized();
    
    try {
      const query = filters ? this.buildQuery(filters) : {};
      const pipelines = await this.database.read<MLPipelineConfig>('ml_pipelines', query);
      
      // Update cache
      for (const pipeline of pipelines) {
        this.pipelines.set(pipeline.id, pipeline);
      }
      
      return pipelines;
      
    } catch (error) {
      throw new MLPipelineError(
        `Failed to list pipelines: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Pipeline Execution
  async runPipeline(id: string, options?: Record<string, any>): Promise<string> {
    this.ensureInitialized();
    
    try {
      const pipeline = await this.getPipeline(id);
      if (!pipeline) {
        throw new Error(`Pipeline ${id} not found`);
      }
      
      if (pipeline.status !== 'active') {
        throw new Error(`Pipeline ${id} is not active (status: ${pipeline.status})`);
      }
      
      // Create run record
      const run: MLPipelineRun = {
        id: this.generateRunId(),
        pipelineId: id,
        version: pipeline.version,
        status: 'pending',
        startTime: new Date(),
        triggeredBy: {
          type: 'manual',
          userId: options?.userId,
          source: 'api'
        },
        configuration: pipeline,
        steps: this.generateSteps(pipeline),
        logs: [],
        resourceUsage: {
          cpu: 0,
          memory: 0,
          gpu: 0,
          storage: 0
        }
      };
      
      // Store run
      await this.database.create('ml_pipeline_runs', run);
      this.runs.set(run.id, run);
      
      // Execute pipeline asynchronously
      this.executePipelineAsync(run);
      
      // Emit event
      this.eventService.emit({
        type: 'pipeline_started',
        pipelineId: id,
        runId: run.id,
        timestamp: new Date(),
        data: { options },
        severity: 'info'
      });
      
      return run.id;
      
    } catch (error) {
      throw new MLExecutionError(
        `Failed to start pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`,
        id
      );
    }
  }

  async stopPipeline(runId: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      const run = this.runs.get(runId);
      if (!run) {
        throw new Error(`Run ${runId} not found`);
      }
      
      if (!['pending', 'running'].includes(run.status)) {
        throw new Error(`Run ${runId} cannot be stopped (status: ${run.status})`);
      }
      
      // Update run status
      run.status = 'cancelled';
      run.endTime = new Date();
      run.duration = Math.floor((run.endTime.getTime() - run.startTime.getTime()) / 1000);
      
      // Update in database
      await this.database.update('ml_pipeline_runs', runId, {
        status: 'cancelled',
        endTime: run.endTime,
        duration: run.duration
      });
      
      // Emit event
      this.eventService.emit({
        type: 'pipeline_cancelled',
        pipelineId: run.pipelineId,
        runId: runId,
        timestamp: new Date(),
        data: {},
        severity: 'info'
      } as MLPipelineEvent);
      
    } catch (error) {
      throw new MLExecutionError(
        `Failed to stop pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        runId
      );
    }
  }

  async getPipelineRun(runId: string): Promise<MLPipelineRun | null> {
    this.ensureInitialized();
    
    // Check cache first
    if (this.runs.has(runId)) {
      return this.runs.get(runId)!;
    }
    
    try {
      const result = await this.database.readOne<MLPipelineRun>('ml_pipeline_runs', {
        where: [{ column: 'id', operator: 'eq', value: runId }]
      });
      
      if (result) {
        this.runs.set(runId, result);
      }
      
      return result;
      
    } catch (error) {
      throw new MLPipelineError(
        `Failed to get pipeline run: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        runId
      );
    }
  }

  async listPipelineRuns(pipelineId: string, filters?: Record<string, any>): Promise<MLPipelineRun[]> {
    this.ensureInitialized();
    
    try {
      const query = {
        where: [{ column: 'pipelineId', operator: 'eq' as const, value: pipelineId }],
        ...(filters ? this.buildQuery(filters) : {}),
        orderBy: { column: 'startTime', direction: 'DESC' as const }
      };
      
      const runs = await this.database.read<MLPipelineRun>('ml_pipeline_runs', query);
      
      // Update cache
      for (const run of runs) {
        this.runs.set(run.id, run);
      }
      
      return runs;
      
    } catch (error) {
      throw new MLPipelineError(
        `Failed to list pipeline runs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        pipelineId
      );
    }
  }

  // Pipeline Scheduling
  async schedulePipeline(id: string, schedule: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      const pipeline = await this.getPipeline(id);
      if (!pipeline) {
        throw new Error(`Pipeline ${id} not found`);
      }
      
      // Parse cron schedule and set up timer
      // This is a simplified implementation - in production, use a proper cron library
      const intervalMs = this.parseCronToInterval(schedule);
      
      if (this.scheduledJobs.has(id)) {
        clearTimeout(this.scheduledJobs.get(id)!);
      }
      
      const scheduleJob = () => {
        this.runPipeline(id, { triggeredBy: { type: 'schedule', source: 'cron' } })
          .catch(error => {
            console.error(`Scheduled pipeline ${id} failed:`, error);
          })
          .finally(() => {
            // Reschedule
            const timeout = setTimeout(scheduleJob, intervalMs);
            this.scheduledJobs.set(id, timeout);
          });
      };
      
      const timeout = setTimeout(scheduleJob, intervalMs);
      this.scheduledJobs.set(id, timeout);
      
      // Update pipeline with schedule info
      await this.updatePipeline(id, {
        metadata: {
          ...pipeline.metadata,
          schedule,
          nextRun: new Date(Date.now() + intervalMs)
        }
      });
      
    } catch (error) {
      throw new MLPipelineError(
        `Failed to schedule pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        id
      );
    }
  }

  async unschedulePipeline(id: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      if (this.scheduledJobs.has(id)) {
        clearTimeout(this.scheduledJobs.get(id)!);
        this.scheduledJobs.delete(id);
      }
      
      // Remove schedule from pipeline metadata
      const pipeline = await this.getPipeline(id);
      if (pipeline) {
        const { schedule, nextRun, ...metadata } = pipeline.metadata || {};
        await this.updatePipeline(id, { metadata });
      }
      
    } catch (error) {
      throw new MLPipelineError(
        `Failed to unschedule pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        id
      );
    }
  }

  // Health and Monitoring
  async getSystemHealth(): Promise<MLSystemHealth> {
    this.ensureInitialized();
    
    try {
      const [databaseHealth, storageHealth] = await Promise.all([
        this.checkDatabaseHealth(),
        this.checkStorageHealth()
      ]);
      
      const activePipelines = Array.from(this.runs.values())
        .filter(run => ['pending', 'running'].includes(run.status)).length;
      
      const queuedJobs = Array.from(this.runs.values())
        .filter(run => run.status === 'pending').length;
      
      return {
        overall: this.calculateOverallHealth([databaseHealth, storageHealth]),
        components: {
          database: databaseHealth,
          storage: storageHealth,
          compute: 'healthy', // Simplified
          monitoring: 'healthy' // Simplified
        },
        activePipelines,
        queuedJobs,
        resources: {
          cpu: 0, // Would be implemented with actual monitoring
          memory: 0,
          storage: 0
        },
        errors: []
      };
      
    } catch (error) {
      throw new MLPipelineError(
        `Failed to get system health: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getPipelineMetrics(id: string, timeRange?: [Date, Date]): Promise<Record<string, any>> {
    this.ensureInitialized();
    
    try {
      const runs = await this.listPipelineRuns(id);
      
      let filteredRuns = runs;
      if (timeRange) {
        filteredRuns = runs.filter(run => 
          run.startTime >= timeRange[0] && run.startTime <= timeRange[1]
        );
      }
      
      const metrics = {
        totalRuns: filteredRuns.length,
        successfulRuns: filteredRuns.filter(run => run.status === 'completed').length,
        failedRuns: filteredRuns.filter(run => run.status === 'failed').length,
        averageDuration: this.calculateAverageDuration(filteredRuns),
        successRate: filteredRuns.length > 0 ? 
          filteredRuns.filter(run => run.status === 'completed').length / filteredRuns.length : 0
      };
      
      return metrics;
      
    } catch (error) {
      throw new MLPipelineError(
        `Failed to get pipeline metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        id
      );
    }
  }

  // Event Handling
  onPipelineEvent(callback: (event: MLPipelineEvent) => void): () => void {
    this.eventService.on('pipeline_event', callback);
    return () => this.eventService.off('pipeline_event', callback);
  }

  // Private Methods
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new MLPipelineError('MLPipelineService not initialized');
    }
  }

  private async initializeDatabaseSchema(): Promise<void> {
    // Create required tables if they don't exist
    const tables = [
      {
        name: 'ml_pipelines',
        columns: [
          'id VARCHAR(255) PRIMARY KEY',
          'name VARCHAR(255) NOT NULL',
          'description TEXT',
          'type VARCHAR(100) NOT NULL',
          'configuration JSONB NOT NULL',
          'status VARCHAR(50) NOT NULL',
          'version VARCHAR(100) NOT NULL',
          'tags JSONB',
          'metadata JSONB',
          'created_at TIMESTAMP NOT NULL',
          'updated_at TIMESTAMP NOT NULL',
          'created_by VARCHAR(255)'
        ].join(', ')
      },
      {
        name: 'ml_pipeline_runs',
        columns: [
          'id VARCHAR(255) PRIMARY KEY',
          'pipeline_id VARCHAR(255) NOT NULL',
          'version VARCHAR(100) NOT NULL',
          'status VARCHAR(50) NOT NULL',
          'start_time TIMESTAMP NOT NULL',
          'end_time TIMESTAMP',
          'duration INTEGER',
          'triggered_by JSONB NOT NULL',
          'configuration JSONB NOT NULL',
          'steps JSONB NOT NULL',
          'results JSONB',
          'error JSONB',
          'metrics JSONB',
          'artifacts JSONB',
          'logs JSONB',
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

  private async loadExistingPipelines(): Promise<void> {
    try {
      const pipelines = await this.database.read<MLPipelineConfig>('ml_pipelines');
      for (const pipeline of pipelines) {
        this.pipelines.set(pipeline.id, pipeline);
      }
    } catch (error) {
      console.warn('Failed to load existing pipelines:', error);
    }
  }

  private setupEventHandlers(): void {
    // Forward events from sub-services
    this.eventService.on('*', (event: MLPipelineEvent) => {
      this.emit('pipeline_event', event);
    });
  }

  private async executePipelineAsync(run: MLPipelineRun): Promise<void> {
    try {
      run.status = 'running';
      await this.database.update('ml_pipeline_runs', run.id, { status: 'running' });
      
      // Execute pipeline steps based on type
      switch (run.configuration.type) {
        case 'training':
          await this.executeTrainingPipeline(run);
          break;
        case 'inference':
          await this.executeInferencePipeline(run);
          break;
        case 'data_preprocessing':
          await this.executeDataPreprocessingPipeline(run);
          break;
        default:
          throw new Error(`Unsupported pipeline type: ${run.configuration.type}`);
      }
      
      run.status = 'completed';
      run.endTime = new Date();
      run.duration = Math.floor((run.endTime.getTime() - run.startTime.getTime()) / 1000);
      
      await this.database.update('ml_pipeline_runs', run.id, {
        status: 'completed',
        endTime: run.endTime,
        duration: run.duration
      });
      
      this.eventService.emit({
        type: 'pipeline_completed',
        pipelineId: run.pipelineId,
        runId: run.id,
        timestamp: new Date(),
        data: { duration: run.duration },
        severity: 'info'
      });
      
    } catch (error) {
      run.status = 'failed';
      run.endTime = new Date();
      run.duration = Math.floor((run.endTime.getTime() - run.startTime.getTime()) / 1000);
      run.error = {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      };
      
      await this.database.update('ml_pipeline_runs', run.id, {
        status: 'failed',
        endTime: run.endTime,
        duration: run.duration,
        error: run.error
      });
      
      this.eventService.emit({
        type: 'pipeline_failed',
        pipelineId: run.pipelineId,
        runId: run.id,
        timestamp: new Date(),
        data: { error: run.error },
        severity: 'error'
      });
    }
  }

  private async executeTrainingPipeline(run: MLPipelineRun): Promise<void> {
    // Implementation would coordinate with training service
    // This is a simplified version
    for (let i = 0; i < run.steps.length; i++) {
      const step = run.steps[i];
      step.status = 'running';
      step.startTime = new Date();
      
      // Execute step based on type
      // In a real implementation, this would call appropriate services
      await this.executeStep(step, run);
      
      step.status = 'completed';
      step.endTime = new Date();
      step.duration = Math.floor((step.endTime.getTime() - step.startTime.getTime()) / 1000);
    }
  }

  private async executeInferencePipeline(run: MLPipelineRun): Promise<void> {
    // Implementation would coordinate with inference service
    for (const step of run.steps) {
      await this.executeStep(step, run);
    }
  }

  private async executeDataPreprocessingPipeline(run: MLPipelineRun): Promise<void> {
    // Implementation would coordinate with data service
    for (const step of run.steps) {
      await this.executeStep(step, run);
    }
  }

  private async executeStep(step: any, run: MLPipelineRun): Promise<void> {
    // Simulate step execution
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private generateRunId(): string {
    return `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSteps(pipeline: MLPipelineConfig): any[] {
    // Generate steps based on pipeline configuration
    const steps = [];
    
    switch (pipeline.type) {
      case 'training':
        steps.push(
          { name: 'data_loading', type: 'data_loading', status: 'pending' },
          { name: 'preprocessing', type: 'preprocessing', status: 'pending' },
          { name: 'training', type: 'training', status: 'pending' },
          { name: 'validation', type: 'validation', status: 'pending' }
        );
        break;
      case 'inference':
        steps.push(
          { name: 'model_loading', type: 'model_loading', status: 'pending' },
          { name: 'inference', type: 'inference', status: 'pending' }
        );
        break;
      case 'data_preprocessing':
        steps.push(
          { name: 'data_loading', type: 'data_loading', status: 'pending' },
          { name: 'preprocessing', type: 'preprocessing', status: 'pending' },
          { name: 'validation', type: 'validation', status: 'pending' }
        );
        break;
    }
    
    return steps;
  }

  private buildQuery(filters: Record<string, any>): any {
    // Build database query from filters
    const where = [];
    
    for (const [key, value] of Object.entries(filters)) {
      if (Array.isArray(value)) {
        where.push({ column: key, operator: 'in', values: value });
      } else {
        where.push({ column: key, operator: 'eq', value });
      }
    }
    
    return { where };
  }

  private async checkDatabaseHealth(): Promise<'healthy' | 'warning' | 'critical'> {
    try {
      await this.database.ping();
      return 'healthy';
    } catch {
      return 'critical';
    }
  }

  private async checkStorageHealth(): Promise<'healthy' | 'warning' | 'critical'> {
    try {
      // Simple health check - try to list files
      await this.storage.listFiles('/');
      return 'healthy';
    } catch {
      return 'critical';
    }
  }

  private calculateOverallHealth(componentHealths: ('healthy' | 'warning' | 'critical')[]): 'healthy' | 'warning' | 'critical' {
    if (componentHealths.includes('critical')) return 'critical';
    if (componentHealths.includes('warning')) return 'warning';
    return 'healthy';
  }

  private calculateAverageDuration(runs: MLPipelineRun[]): number {
    const completedRuns = runs.filter(run => run.duration !== undefined);
    if (completedRuns.length === 0) return 0;
    
    const totalDuration = completedRuns.reduce((sum, run) => sum + (run.duration || 0), 0);
    return totalDuration / completedRuns.length;
  }

  private parseCronToInterval(schedule: string): number {
    // Simplified cron parsing - in production, use a proper cron library
    // For now, return a default interval of 1 hour
    return 60 * 60 * 1000; // 1 hour in milliseconds
  }
}

// Factory function
export function createMLPipelineService(config: MLPipelineServiceConfig): MLPipelineService {
  return new MLPipelineService(config);
}
