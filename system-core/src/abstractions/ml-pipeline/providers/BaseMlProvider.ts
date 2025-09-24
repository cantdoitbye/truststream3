/**
 * Base ML Provider
 * Abstract base class for all ML providers
 */

import { EventEmitter } from 'events';
import {
  IMLProvider,
  MLProviderConfig,
  MLProviderCapabilities,
  MLProviderError,
  MLResourceRequirements,
  MLResourceAllocation,
  MLResourceUsage,
  MLArtifact
} from '../interfaces/ml-provider.interface';
import {
  MLSystemHealth
} from '../interfaces/ml-pipeline.interface';
import {
  MLDataset,
  MLDataProcessingJob,
  MLDataValidationResult
} from '../interfaces/ml-data.interface';
import {
  MLTrainingJob,
  MLModel,
  MLTrainingResult
} from '../interfaces/ml-training.interface';
import {
  MLInferenceJob,
  MLPredictionResult,
  MLInferenceEndpoint
} from '../interfaces/ml-inference.interface';
import {
  MLExperiment,
  MLExperimentRun,
  MLMetric
} from '../interfaces/ml-experiment.interface';
import { IDatabaseService } from '../../shared-utils/database-interface';
import { IStorageService } from '../../shared-utils/storage-interface';

export abstract class BaseMlProvider extends EventEmitter implements IMLProvider {
  protected database: IDatabaseService;
  protected storage: IStorageService;
  protected config: MLProviderConfig;
  protected isConnected = false;
  protected isInitialized = false;
  
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly capabilities: MLProviderCapabilities;
  
  constructor() {
    super();
  }
  
  // Lifecycle methods
  async initialize(config: MLProviderConfig): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    this.config = config;
    this.database = config.database;
    this.storage = config.storage;
    
    try {
      await this.initializeProvider();
      await this.initializeDatabaseSchema();
      
      this.isInitialized = true;
      this.emit('initialized', { provider: this.name });
      
    } catch (error) {
      throw new MLProviderError(
        `Failed to initialize ${this.name} provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INITIALIZATION_ERROR',
        this.name,
        'initialize'
      );
    }
  }
  
  async connect(): Promise<void> {
    this.ensureInitialized();
    
    if (this.isConnected) {
      return;
    }
    
    try {
      await this.connectProvider();
      this.isConnected = true;
      this.emit('connected', { provider: this.name });
      
    } catch (error) {
      throw new MLProviderError(
        `Failed to connect ${this.name} provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CONNECTION_ERROR',
        this.name,
        'connect'
      );
    }
  }
  
  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }
    
    try {
      await this.disconnectProvider();
      this.isConnected = false;
      this.emit('disconnected', { provider: this.name });
      
    } catch (error) {
      throw new MLProviderError(
        `Failed to disconnect ${this.name} provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DISCONNECTION_ERROR',
        this.name,
        'disconnect'
      );
    }
  }
  
  async getHealth(): Promise<MLSystemHealth> {
    this.ensureConnected();
    
    try {
      const providerHealth = await this.getProviderHealth();
      
      // Check database health
      const dbHealth = await this.checkDatabaseHealth();
      
      // Check storage health
      const storageHealth = await this.checkStorageHealth();
      
      // Aggregate health status
      const components = {
        database: dbHealth,
        storage: storageHealth,
        compute: providerHealth.compute || 'healthy' as const,
        monitoring: providerHealth.monitoring || 'healthy' as const
      };
      
      const hasWarning = Object.values(components).some(status => status === 'warning');
      const hasCritical = Object.values(components).some(status => status === 'critical');
      
      const overall = hasCritical ? 'critical' : hasWarning ? 'warning' : 'healthy';
      
      return {
        overall,
        components,
        activePipelines: providerHealth.activePipelines || 0,
        queuedJobs: providerHealth.queuedJobs || 0,
        resources: providerHealth.resources || {
          cpu: 0,
          memory: 0,
          storage: 0
        },
        errors: providerHealth.errors || []
      };
      
    } catch (error) {
      return {
        overall: 'critical',
        components: {
          database: 'critical',
          storage: 'critical',
          compute: 'critical',
          monitoring: 'critical'
        },
        activePipelines: 0,
        queuedJobs: 0,
        resources: { cpu: 0, memory: 0, storage: 0 },
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
  
  // Data operations - default implementations
  async createDataset(dataset: Partial<MLDataset>): Promise<MLDataset> {
    this.ensureConnected();
    
    const datasetData: MLDataset = {
      id: dataset.id || this.generateId('dataset'),
      name: dataset.name || 'Untitled Dataset',
      type: dataset.type || 'tabular',
      source: dataset.source || { type: 'database', config: {} },
      schema: dataset.schema || { columns: [], metadata: {} },
      statistics: dataset.statistics,
      version: dataset.version || '1.0.0',
      status: dataset.status || 'created',
      metadata: dataset.metadata || {},
      tags: dataset.tags || [],
      createdAt: dataset.createdAt || new Date(),
      updatedAt: new Date()
    };
    
    await this.database.create('ml_datasets', datasetData);
    
    this.emit('dataset_created', { datasetId: datasetData.id });
    return datasetData;
  }
  
  async getDataset(id: string): Promise<MLDataset | null> {
    this.ensureConnected();
    
    return await this.database.readOne<MLDataset>('ml_datasets', {
      where: [{ column: 'id', operator: 'eq', value: id }]
    });
  }
  
  async updateDataset(id: string, updates: Partial<MLDataset>): Promise<void> {
    this.ensureConnected();
    
    await this.database.update('ml_datasets', id, {
      ...updates,
      updatedAt: new Date()
    });
    
    this.emit('dataset_updated', { datasetId: id });
  }
  
  async deleteDataset(id: string): Promise<void> {
    this.ensureConnected();
    
    await this.database.delete('ml_datasets', id);
    
    this.emit('dataset_deleted', { datasetId: id });
  }
  
  async listDatasets(filters?: Record<string, any>): Promise<MLDataset[]> {
    this.ensureConnected();
    
    const query = filters ? this.buildDatabaseQuery(filters) : {};
    return await this.database.read<MLDataset>('ml_datasets', query);
  }
  
  // Model operations - default implementations
  async saveModel(model: Partial<MLModel>): Promise<MLModel> {
    this.ensureConnected();
    
    const modelData: MLModel = {
      id: model.id || this.generateId('model'),
      name: model.name || 'Untitled Model',
      type: model.type || 'classification',
      algorithm: model.algorithm || 'unknown',
      framework: model.framework || 'custom',
      version: model.version || '1.0.0',
      status: model.status || 'created',
      parameters: model.parameters || {},
      metrics: model.metrics || {},
      artifacts: model.artifacts || [],
      trainingJob: model.trainingJob,
      parentModel: model.parentModel,
      metadata: model.metadata || {},
      tags: model.tags || [],
      createdAt: model.createdAt || new Date(),
      updatedAt: new Date()
    };
    
    await this.database.create('ml_models', modelData);
    
    this.emit('model_saved', { modelId: modelData.id });
    return modelData;
  }
  
  async loadModel(id: string): Promise<MLModel | null> {
    this.ensureConnected();
    
    return await this.database.readOne<MLModel>('ml_models', {
      where: [{ column: 'id', operator: 'eq', value: id }]
    });
  }
  
  async updateModel(id: string, updates: Partial<MLModel>): Promise<void> {
    this.ensureConnected();
    
    await this.database.update('ml_models', id, {
      ...updates,
      updatedAt: new Date()
    });
    
    this.emit('model_updated', { modelId: id });
  }
  
  async deleteModel(id: string): Promise<void> {
    this.ensureConnected();
    
    await this.database.delete('ml_models', id);
    
    this.emit('model_deleted', { modelId: id });
  }
  
  async listModels(filters?: Record<string, any>): Promise<MLModel[]> {
    this.ensureConnected();
    
    const query = filters ? this.buildDatabaseQuery(filters) : {};
    return await this.database.read<MLModel>('ml_models', query);
  }
  
  // Abstract methods to be implemented by specific providers
  protected abstract initializeProvider(): Promise<void>;
  protected abstract connectProvider(): Promise<void>;
  protected abstract disconnectProvider(): Promise<void>;
  protected abstract getProviderHealth(): Promise<{
    compute?: 'healthy' | 'warning' | 'critical';
    monitoring?: 'healthy' | 'warning' | 'critical';
    activePipelines?: number;
    queuedJobs?: number;
    resources?: { cpu: number; memory: number; storage: number };
    errors?: string[];
  }>;
  
  // Provider-specific implementations - default to throwing not implemented
  async processData(job: MLDataProcessingJob): Promise<MLDataValidationResult> {
    throw new MLProviderError(
      'Data processing not implemented',
      'NOT_IMPLEMENTED',
      this.name,
      'processData'
    );
  }
  
  async createTrainingJob(job: Partial<MLTrainingJob>): Promise<MLTrainingJob> {
    throw new MLProviderError(
      'Training jobs not implemented',
      'NOT_IMPLEMENTED',
      this.name,
      'createTrainingJob'
    );
  }
  
  async startTraining(jobId: string): Promise<void> {
    throw new MLProviderError(
      'Training execution not implemented',
      'NOT_IMPLEMENTED',
      this.name,
      'startTraining'
    );
  }
  
  async stopTraining(jobId: string): Promise<void> {
    throw new MLProviderError(
      'Training control not implemented',
      'NOT_IMPLEMENTED',
      this.name,
      'stopTraining'
    );
  }
  
  async getTrainingStatus(jobId: string): Promise<MLTrainingJob> {
    throw new MLProviderError(
      'Training status not implemented',
      'NOT_IMPLEMENTED',
      this.name,
      'getTrainingStatus'
    );
  }
  
  async getTrainingResult(jobId: string): Promise<MLTrainingResult | null> {
    throw new MLProviderError(
      'Training results not implemented',
      'NOT_IMPLEMENTED',
      this.name,
      'getTrainingResult'
    );
  }
  
  async createInferenceEndpoint(endpoint: Partial<MLInferenceEndpoint>): Promise<MLInferenceEndpoint> {
    throw new MLProviderError(
      'Inference endpoints not implemented',
      'NOT_IMPLEMENTED',
      this.name,
      'createInferenceEndpoint'
    );
  }
  
  async predict(endpointId: string, data: any): Promise<MLPredictionResult> {
    throw new MLProviderError(
      'Prediction not implemented',
      'NOT_IMPLEMENTED',
      this.name,
      'predict'
    );
  }
  
  async batchPredict(endpointId: string, data: any[]): Promise<MLPredictionResult[]> {
    throw new MLProviderError(
      'Batch prediction not implemented',
      'NOT_IMPLEMENTED',
      this.name,
      'batchPredict'
    );
  }
  
  async getInferenceJob(jobId: string): Promise<MLInferenceJob | null> {
    throw new MLProviderError(
      'Inference jobs not implemented',
      'NOT_IMPLEMENTED',
      this.name,
      'getInferenceJob'
    );
  }
  
  async createExperiment(experiment: Partial<MLExperiment>): Promise<MLExperiment> {
    throw new MLProviderError(
      'Experiments not implemented',
      'NOT_IMPLEMENTED',
      this.name,
      'createExperiment'
    );
  }
  
  async createExperimentRun(experimentId: string, run: Partial<MLExperimentRun>): Promise<MLExperimentRun> {
    throw new MLProviderError(
      'Experiment runs not implemented',
      'NOT_IMPLEMENTED',
      this.name,
      'createExperimentRun'
    );
  }
  
  async logMetric(runId: string, metric: MLMetric): Promise<void> {
    throw new MLProviderError(
      'Metric logging not implemented',
      'NOT_IMPLEMENTED',
      this.name,
      'logMetric'
    );
  }
  
  async logArtifact(runId: string, artifact: MLArtifact): Promise<void> {
    throw new MLProviderError(
      'Artifact logging not implemented',
      'NOT_IMPLEMENTED',
      this.name,
      'logArtifact'
    );
  }
  
  async getSystemMetrics(timeRange?: [Date, Date]): Promise<Record<string, any>> {
    throw new MLProviderError(
      'System metrics not implemented',
      'NOT_IMPLEMENTED',
      this.name,
      'getSystemMetrics'
    );
  }
  
  async getModelMetrics(modelId: string, timeRange?: [Date, Date]): Promise<Record<string, any>> {
    throw new MLProviderError(
      'Model metrics not implemented',
      'NOT_IMPLEMENTED',
      this.name,
      'getModelMetrics'
    );
  }
  
  async allocateResources(requirements: MLResourceRequirements): Promise<MLResourceAllocation> {
    throw new MLProviderError(
      'Resource allocation not implemented',
      'NOT_IMPLEMENTED',
      this.name,
      'allocateResources'
    );
  }
  
  async deallocateResources(allocationId: string): Promise<void> {
    throw new MLProviderError(
      'Resource deallocation not implemented',
      'NOT_IMPLEMENTED',
      this.name,
      'deallocateResources'
    );
  }
  
  async getResourceUsage(): Promise<MLResourceUsage> {
    throw new MLProviderError(
      'Resource usage not implemented',
      'NOT_IMPLEMENTED',
      this.name,
      'getResourceUsage'
    );
  }
  
  // Helper methods
  protected ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new MLProviderError(
        `${this.name} provider not initialized`,
        'NOT_INITIALIZED',
        this.name
      );
    }
  }
  
  protected ensureConnected(): void {
    this.ensureInitialized();
    if (!this.isConnected) {
      throw new MLProviderError(
        `${this.name} provider not connected`,
        'NOT_CONNECTED',
        this.name
      );
    }
  }
  
  protected generateId(prefix: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  }
  
  protected buildDatabaseQuery(filters: Record<string, any>): any {
    // Convert filters to database query format
    const where = [];
    
    for (const [field, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          where.push({ column: field, operator: 'in', value });
        } else {
          where.push({ column: field, operator: 'eq', value });
        }
      }
    }
    
    return where.length > 0 ? { where } : {};
  }
  
  private async initializeDatabaseSchema(): Promise<void> {
    try {
      // Create tables if they don't exist
      await this.createTablesIfNotExist();
    } catch (error) {
      console.warn(`Failed to initialize database schema for ${this.name}:`, error);
      // Don't throw here as schema might already exist
    }
  }
  
  private async createTablesIfNotExist(): Promise<void> {
    const tables = [
      {
        name: 'ml_datasets',
        columns: `
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(100) NOT NULL,
          source JSONB NOT NULL,
          schema JSONB,
          statistics JSONB,
          version VARCHAR(50),
          status VARCHAR(50),
          metadata JSONB,
          tags TEXT[],
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        `
      },
      {
        name: 'ml_models',
        columns: `
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(100) NOT NULL,
          algorithm VARCHAR(100),
          framework VARCHAR(100),
          version VARCHAR(50),
          status VARCHAR(50),
          parameters JSONB,
          metrics JSONB,
          artifacts JSONB,
          training_job VARCHAR(255),
          parent_model VARCHAR(255),
          metadata JSONB,
          tags TEXT[],
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        `
      },
      {
        name: 'ml_training_jobs',
        columns: `
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          dataset_id VARCHAR(255),
          model_id VARCHAR(255),
          config JSONB NOT NULL,
          status VARCHAR(50),
          progress FLOAT,
          start_time TIMESTAMP,
          end_time TIMESTAMP,
          logs TEXT,
          error_message TEXT,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        `
      },
      {
        name: 'ml_inference_endpoints',
        columns: `
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          model_id VARCHAR(255) NOT NULL,
          config JSONB NOT NULL,
          status VARCHAR(50),
          url VARCHAR(500),
          metrics JSONB,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        `
      },
      {
        name: 'ml_experiments',
        columns: `
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          tags TEXT[],
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        `
      },
      {
        name: 'ml_experiment_runs',
        columns: `
          id VARCHAR(255) PRIMARY KEY,
          experiment_id VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          status VARCHAR(50),
          parameters JSONB,
          metrics JSONB,
          artifacts JSONB,
          start_time TIMESTAMP,
          end_time TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        `
      }
    ];
    
    for (const table of tables) {
      try {
        await this.database.query(`
          CREATE TABLE IF NOT EXISTS ${table.name} (
            ${table.columns}
          )
        `);
      } catch (error) {
        console.warn(`Failed to create table ${table.name}:`, error);
      }
    }
  }
  
  private async checkDatabaseHealth(): Promise<'healthy' | 'warning' | 'critical'> {
    try {
      // Simple health check query
      await this.database.query('SELECT 1');
      return 'healthy';
    } catch (error) {
      return 'critical';
    }
  }
  
  private async checkStorageHealth(): Promise<'healthy' | 'warning' | 'critical'> {
    try {
      // Simple storage health check
      const testPath = 'health-check/test.txt';
      await this.storage.upload(testPath, Buffer.from('test'));
      await this.storage.delete(testPath);
      return 'healthy';
    } catch (error) {
      return 'critical';
    }
  }
}
