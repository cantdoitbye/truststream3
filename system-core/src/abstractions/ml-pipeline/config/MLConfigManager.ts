/**
 * ML Configuration Manager
 * Manages ML pipeline configurations with validation and environment-specific settings
 */

import { EventEmitter } from 'events';
import { IDatabaseService } from '../../shared-utils/database-interface';
import { IStorageService } from '../../shared-utils/storage-interface';
import {
  MLPipelineConfig,
  MLDataSource,
  MLModelConfig,
  MLComputeConfig,
  MLStorageConfig,
  MLMonitoringConfig,
  MLRetrainingConfig,
  MLEnvironmentConfig
} from '../interfaces/ml-pipeline.interface';
import {
  MLProviderConfig,
  MLProviderCapabilities
} from '../interfaces/ml-provider.interface';

export interface MLConfigOptions {
  database: IDatabaseService;
  storage: IStorageService;
  environment?: 'development' | 'staging' | 'production';
  enableValidation?: boolean;
  enableDefaults?: boolean;
  configPath?: string;
  secretsPath?: string;
}

export interface MLConfigValidationResult {
  valid: boolean;
  errors: MLConfigError[];
  warnings: MLConfigWarning[];
  suggestions: string[];
}

export interface MLConfigError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

export interface MLConfigWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface MLConfigTemplate {
  name: string;
  description: string;
  type: 'training' | 'inference' | 'data_preprocessing' | 'hybrid';
  config: Partial<MLPipelineConfig>;
  requirements: Partial<MLProviderCapabilities>;
  tags: string[];
}

export class MLConfigManager extends EventEmitter {
  private database: IDatabaseService;
  private storage: IStorageService;
  private environment: string;
  private enableValidation: boolean;
  private enableDefaults: boolean;
  private configCache = new Map<string, MLPipelineConfig>();
  private templates = new Map<string, MLConfigTemplate>();
  
  constructor(options: MLConfigOptions) {
    super();
    this.database = options.database;
    this.storage = options.storage;
    this.environment = options.environment || 'development';
    this.enableValidation = options.enableValidation !== false;
    this.enableDefaults = options.enableDefaults !== false;
    
    this.initializeTemplates();
  }
  
  // Configuration validation
  async validatePipelineConfig(config: MLPipelineConfig): Promise<MLConfigValidationResult> {
    const errors: MLConfigError[] = [];
    const warnings: MLConfigWarning[] = [];
    const suggestions: string[] = [];
    
    try {
      // Validate basic fields
      this.validateBasicFields(config, errors);
      
      // Validate data source
      await this.validateDataSource(config.dataSource, errors, warnings);
      
      // Validate model configuration
      this.validateModelConfig(config.modelConfig, errors, warnings);
      
      // Validate compute configuration
      this.validateComputeConfig(config.computeConfig, errors, warnings);
      
      // Validate storage configuration
      await this.validateStorageConfig(config.storageConfig, errors, warnings);
      
      // Environment-specific validation
      this.validateEnvironmentSpecific(config, errors, warnings, suggestions);
      
      // Cross-field validation
      this.validateCrossFields(config, errors, warnings, suggestions);
      
    } catch (error) {
      errors.push({
        field: 'validation',
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: 'VALIDATION_ERROR',
        severity: 'error'
      });
    }
    
    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings,
      suggestions
    };
  }
  
  // Apply defaults to configuration
  applyDefaults(config: Partial<MLPipelineConfig>): MLPipelineConfig {
    const defaults = this.getEnvironmentDefaults();
    
    return {
      id: config.id || this.generateConfigId(),
      name: config.name || 'Untitled Pipeline',
      type: config.type || 'training',
      version: config.version || '1.0.0',
      status: config.status || 'draft',
      createdAt: config.createdAt || new Date(),
      updatedAt: config.updatedAt || new Date(),
      tags: config.tags || [],
      metadata: config.metadata || {},
      
      // Apply defaults for complex objects
      dataSource: this.applyDataSourceDefaults(config.dataSource, defaults.dataSource),
      modelConfig: this.applyModelConfigDefaults(config.modelConfig, defaults.modelConfig),
      computeConfig: this.applyComputeConfigDefaults(config.computeConfig, defaults.computeConfig),
      storageConfig: this.applyStorageConfigDefaults(config.storageConfig, defaults.storageConfig),
      
      // Optional configurations
      monitoringConfig: config.monitoringConfig || defaults.monitoringConfig,
      retrainingConfig: config.retrainingConfig || defaults.retrainingConfig,
      environmentConfig: config.environmentConfig || defaults.environmentConfig,
      
      description: config.description
    };
  }
  
  // Configuration templates
  getTemplate(name: string): MLConfigTemplate | null {
    return this.templates.get(name) || null;
  }
  
  listTemplates(type?: string, tags?: string[]): MLConfigTemplate[] {
    const allTemplates = Array.from(this.templates.values());
    
    return allTemplates.filter(template => {
      if (type && template.type !== type) return false;
      if (tags && !tags.some(tag => template.tags.includes(tag))) return false;
      return true;
    });
  }
  
  createFromTemplate(templateName: string, overrides: Partial<MLPipelineConfig> = {}): MLPipelineConfig {
    const template = this.getTemplate(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }
    
    const config = {
      ...template.config,
      ...overrides,
      id: overrides.id || this.generateConfigId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return this.applyDefaults(config);
  }
  
  // Configuration management
  async saveConfig(config: MLPipelineConfig): Promise<void> {
    if (this.enableValidation) {
      const validation = await this.validatePipelineConfig(config);
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.map(e => e.message).join(', ')}`);
      }
    }
    
    // Save to database
    await this.database.create('ml_pipeline_configs', {
      ...config,
      updatedAt: new Date()
    });
    
    // Update cache
    this.configCache.set(config.id, config);
    
    this.emit('config_saved', { configId: config.id });
  }
  
  async loadConfig(id: string): Promise<MLPipelineConfig | null> {
    // Check cache first
    if (this.configCache.has(id)) {
      return this.configCache.get(id)!;
    }
    
    // Load from database
    const config = await this.database.readOne<MLPipelineConfig>('ml_pipeline_configs', {
      where: [{ column: 'id', operator: 'eq', value: id }]
    });
    
    if (config) {
      this.configCache.set(id, config);
    }
    
    return config;
  }
  
  async deleteConfig(id: string): Promise<void> {
    await this.database.delete('ml_pipeline_configs', id);
    this.configCache.delete(id);
    
    this.emit('config_deleted', { configId: id });
  }
  
  // Environment-specific configurations
  private getEnvironmentDefaults(): {
    dataSource: Partial<MLDataSource>;
    modelConfig: Partial<MLModelConfig>;
    computeConfig: Partial<MLComputeConfig>;
    storageConfig: Partial<MLStorageConfig>;
    monitoringConfig?: MLMonitoringConfig;
    retrainingConfig?: MLRetrainingConfig;
    environmentConfig?: MLEnvironmentConfig;
  } {
    const baseDefaults = {
      dataSource: {
        type: 'database' as const,
        preprocessing: {
          steps: [],
          caching: true
        },
        validation: {
          qualityChecks: [
            {
              name: 'missing_values',
              type: 'missing_values' as const,
              config: { threshold: 0.1 },
              threshold: 0.1,
              action: 'warn' as const
            }
          ]
        }
      },
      modelConfig: {
        type: 'classification' as const,
        framework: 'scikit-learn' as const,
        parameters: {},
        trainingConfig: {
          epochs: 100,
          batchSize: 32,
          learningRate: 0.001,
          validationSplit: 0.2,
          metrics: ['accuracy']
        }
      },
      computeConfig: {
        type: 'local' as const,
        resources: {
          cpu: 2,
          memory: '4GB',
          storage: '10GB'
        },
        environment: {
          runtime: 'python3.9',
          requirements: ['pandas', 'numpy', 'scikit-learn'],
          environmentVariables: {}
        }
      },
      storageConfig: {
        dataStorage: {
          service: this.storage,
          basePath: 'ml-data',
          versioning: true,
          compression: true
        },
        modelStorage: {
          service: this.storage,
          basePath: 'ml-models',
          versioning: true,
          compression: true
        },
        artifactStorage: {
          service: this.storage,
          basePath: 'ml-artifacts',
          retentionPolicy: {
            maxVersions: 10,
            maxAge: 90
          }
        }
      }
    };
    
    switch (this.environment) {
      case 'development':
        return {
          ...baseDefaults,
          computeConfig: {
            ...baseDefaults.computeConfig,
            resources: {
              cpu: 2,
              memory: '4GB',
              storage: '10GB'
            }
          },
          monitoringConfig: {
            enabled: false,
            metrics: {
              performance: true,
              dataQuality: false,
              modelDrift: false,
              resourceUsage: false
            },
            alerting: {
              enabled: false,
              channels: [],
              thresholds: {}
            }
          }
        };
        
      case 'staging':
        return {
          ...baseDefaults,
          computeConfig: {
            ...baseDefaults.computeConfig,
            resources: {
              cpu: 4,
              memory: '8GB',
              storage: '50GB'
            }
          },
          monitoringConfig: {
            enabled: true,
            metrics: {
              performance: true,
              dataQuality: true,
              modelDrift: false,
              resourceUsage: true
            },
            alerting: {
              enabled: true,
              channels: [{ type: 'email', config: {} }],
              thresholds: {
                accuracy: 0.8,
                latency: 1000
              }
            }
          }
        };
        
      case 'production':
        return {
          ...baseDefaults,
          computeConfig: {
            ...baseDefaults.computeConfig,
            type: 'cloud' as const,
            resources: {
              cpu: 8,
              memory: '16GB',
              storage: '100GB'
            },
            scaling: {
              enabled: true,
              minInstances: 1,
              maxInstances: 10,
              targetMetric: 'cpu_utilization',
              targetValue: 70
            }
          },
          monitoringConfig: {
            enabled: true,
            metrics: {
              performance: true,
              dataQuality: true,
              modelDrift: true,
              resourceUsage: true
            },
            alerting: {
              enabled: true,
              channels: [
                { type: 'email', config: {} },
                { type: 'slack', config: {} }
              ],
              thresholds: {
                accuracy: 0.85,
                latency: 500,
                error_rate: 0.01
              }
            },
            dashboards: {
              enabled: true,
              autoGenerate: true
            }
          },
          retrainingConfig: {
            enabled: true,
            triggers: [
              {
                type: 'schedule',
                config: { cron: '0 2 * * 0' } // Weekly
              },
              {
                type: 'performance_degradation',
                config: { threshold: 0.05 }
              }
            ],
            dataWindow: {
              size: 30,
              sliding: true
            },
            validation: {
              strategy: 'holdout',
              testSize: 0.2,
              minPerformanceThreshold: 0.8
            },
            deployment: {
              strategy: 'blue_green',
              rollbackPolicy: {
                enabled: true,
                conditions: ['performance_degradation', 'error_rate_spike']
              }
            }
          }
        };
        
      default:
        return baseDefaults;
    }
  }
  
  // Helper methods for applying defaults
  private applyDataSourceDefaults(config?: Partial<MLDataSource>, defaults?: Partial<MLDataSource>): MLDataSource {
    return {
      type: config?.type || defaults?.type || 'database',
      connection: config?.connection || { database: { service: this.database, tables: [] } },
      preprocessing: {
        ...defaults?.preprocessing,
        ...config?.preprocessing
      },
      validation: {
        ...defaults?.validation,
        ...config?.validation
      },
      refresh: config?.refresh
    };
  }
  
  private applyModelConfigDefaults(config?: Partial<MLModelConfig>, defaults?: Partial<MLModelConfig>): MLModelConfig {
    return {
      type: config?.type || defaults?.type || 'classification',
      algorithm: config?.algorithm || 'auto',
      framework: config?.framework || defaults?.framework || 'scikit-learn',
      parameters: {
        ...defaults?.parameters,
        ...config?.parameters
      },
      trainingConfig: {
        ...defaults?.trainingConfig,
        ...config?.trainingConfig
      },
      architecture: config?.architecture,
      hyperparameterTuning: config?.hyperparameterTuning
    };
  }
  
  private applyComputeConfigDefaults(config?: Partial<MLComputeConfig>, defaults?: Partial<MLComputeConfig>): MLComputeConfig {
    return {
      type: config?.type || defaults?.type || 'local',
      resources: {
        ...defaults?.resources,
        ...config?.resources
      },
      scaling: config?.scaling || defaults?.scaling,
      environment: {
        ...defaults?.environment,
        ...config?.environment
      }
    };
  }
  
  private applyStorageConfigDefaults(config?: Partial<MLStorageConfig>, defaults?: Partial<MLStorageConfig>): MLStorageConfig {
    return {
      dataStorage: {
        service: this.storage,
        basePath: 'ml-data',
        versioning: true,
        ...defaults?.dataStorage,
        ...config?.dataStorage
      },
      modelStorage: {
        service: this.storage,
        basePath: 'ml-models',
        versioning: true,
        ...defaults?.modelStorage,
        ...config?.modelStorage
      },
      artifactStorage: {
        service: this.storage,
        basePath: 'ml-artifacts',
        ...defaults?.artifactStorage,
        ...config?.artifactStorage
      },
      caching: config?.caching || defaults?.caching
    };
  }
  
  // Validation helper methods
  private validateBasicFields(config: MLPipelineConfig, errors: MLConfigError[]): void {
    if (!config.id) {
      errors.push({
        field: 'id',
        message: 'Pipeline ID is required',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error'
      });
    }
    
    if (!config.name) {
      errors.push({
        field: 'name',
        message: 'Pipeline name is required',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error'
      });
    }
    
    if (!['training', 'inference', 'data_preprocessing', 'model_evaluation', 'hybrid'].includes(config.type)) {
      errors.push({
        field: 'type',
        message: 'Invalid pipeline type',
        code: 'INVALID_VALUE',
        severity: 'error'
      });
    }
  }
  
  private async validateDataSource(dataSource: MLDataSource, errors: MLConfigError[], warnings: MLConfigWarning[]): Promise<void> {
    if (!['database', 'storage', 'api', 'stream', 'batch_upload'].includes(dataSource.type)) {
      errors.push({
        field: 'dataSource.type',
        message: 'Invalid data source type',
        code: 'INVALID_VALUE',
        severity: 'error'
      });
    }
    
    // Validate connection based on type
    switch (dataSource.type) {
      case 'database':
        if (!dataSource.connection.database?.tables?.length) {
          warnings.push({
            field: 'dataSource.connection.database.tables',
            message: 'No tables specified for database data source',
            suggestion: 'Specify at least one table to query'
          });
        }
        break;
        
      case 'storage':
        if (!dataSource.connection.storage?.paths?.length) {
          warnings.push({
            field: 'dataSource.connection.storage.paths',
            message: 'No paths specified for storage data source',
            suggestion: 'Specify at least one file path'
          });
        }
        break;
    }
  }
  
  private validateModelConfig(modelConfig: MLModelConfig, errors: MLConfigError[], warnings: MLConfigWarning[]): void {
    if (!['classification', 'regression', 'clustering', 'nlp', 'computer_vision', 'custom'].includes(modelConfig.type)) {
      errors.push({
        field: 'modelConfig.type',
        message: 'Invalid model type',
        code: 'INVALID_VALUE',
        severity: 'error'
      });
    }
    
    if (!['tensorflow', 'pytorch', 'scikit-learn', 'xgboost', 'custom'].includes(modelConfig.framework)) {
      warnings.push({
        field: 'modelConfig.framework',
        message: 'Unknown or unsupported framework',
        suggestion: 'Use a supported framework for better integration'
      });
    }
    
    // Validate training configuration
    const training = modelConfig.trainingConfig;
    if (training.epochs && training.epochs <= 0) {
      errors.push({
        field: 'modelConfig.trainingConfig.epochs',
        message: 'Epochs must be greater than 0',
        code: 'INVALID_VALUE',
        severity: 'error'
      });
    }
    
    if (training.batchSize && training.batchSize <= 0) {
      errors.push({
        field: 'modelConfig.trainingConfig.batchSize',
        message: 'Batch size must be greater than 0',
        code: 'INVALID_VALUE',
        severity: 'error'
      });
    }
  }
  
  private validateComputeConfig(computeConfig: MLComputeConfig, errors: MLConfigError[], warnings: MLConfigWarning[]): void {
    if (!['local', 'cloud', 'distributed'].includes(computeConfig.type)) {
      errors.push({
        field: 'computeConfig.type',
        message: 'Invalid compute type',
        code: 'INVALID_VALUE',
        severity: 'error'
      });
    }
    
    if (computeConfig.resources.cpu && computeConfig.resources.cpu <= 0) {
      errors.push({
        field: 'computeConfig.resources.cpu',
        message: 'CPU count must be greater than 0',
        code: 'INVALID_VALUE',
        severity: 'error'
      });
    }
    
    // Validate memory format
    const memory = computeConfig.resources.memory;
    if (memory && !/^\d+[KMGT]?B?$/i.test(memory)) {
      errors.push({
        field: 'computeConfig.resources.memory',
        message: 'Invalid memory format (use format like "8GB", "512MB")',
        code: 'INVALID_FORMAT',
        severity: 'error'
      });
    }
  }
  
  private async validateStorageConfig(storageConfig: MLStorageConfig, errors: MLConfigError[], warnings: MLConfigWarning[]): Promise<void> {
    // Validate storage services are configured
    if (!storageConfig.dataStorage.service) {
      errors.push({
        field: 'storageConfig.dataStorage.service',
        message: 'Data storage service is required',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error'
      });
    }
    
    if (!storageConfig.modelStorage.service) {
      errors.push({
        field: 'storageConfig.modelStorage.service',
        message: 'Model storage service is required',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error'
      });
    }
    
    // Validate paths
    if (!storageConfig.dataStorage.basePath) {
      warnings.push({
        field: 'storageConfig.dataStorage.basePath',
        message: 'No base path specified for data storage',
        suggestion: 'Specify a base path to organize data files'
      });
    }
  }
  
  private validateEnvironmentSpecific(config: MLPipelineConfig, errors: MLConfigError[], warnings: MLConfigWarning[], suggestions: string[]): void {
    switch (this.environment) {
      case 'production':
        if (!config.monitoringConfig?.enabled) {
          warnings.push({
            field: 'monitoringConfig.enabled',
            message: 'Monitoring is not enabled in production environment',
            suggestion: 'Enable monitoring for production deployments'
          });
        }
        
        if (config.computeConfig.type === 'local') {
          warnings.push({
            field: 'computeConfig.type',
            message: 'Local compute type may not be suitable for production',
            suggestion: 'Consider using cloud or distributed compute for production'
          });
        }
        break;
        
      case 'development':
        if (config.computeConfig.resources.cpu && config.computeConfig.resources.cpu > 4) {
          suggestions.push('Consider reducing CPU allocation for development environment');
        }
        break;
    }
  }
  
  private validateCrossFields(config: MLPipelineConfig, errors: MLConfigError[], warnings: MLConfigWarning[], suggestions: string[]): void {
    // Validate model type and algorithm compatibility
    if (config.modelConfig.type === 'nlp' && config.modelConfig.framework === 'scikit-learn') {
      warnings.push({
        field: 'modelConfig.framework',
        message: 'Scikit-learn may have limited NLP capabilities',
        suggestion: 'Consider using TensorFlow or PyTorch for NLP tasks'
      });
    }
    
    // Validate compute resources for model complexity
    if (config.modelConfig.framework === 'tensorflow' && !config.computeConfig.resources.gpu) {
      suggestions.push('Consider enabling GPU for TensorFlow models to improve training speed');
    }
    
    // Validate monitoring and alerting consistency
    if (config.monitoringConfig?.enabled && !config.monitoringConfig.alerting?.enabled) {
      suggestions.push('Enable alerting when monitoring is enabled for better observability');
    }
  }
  
  private initializeTemplates(): void {
    // Basic classification template
    this.templates.set('basic_classification', {
      name: 'Basic Classification',
      description: 'Simple classification model with default settings',
      type: 'training',
      config: {
        type: 'training',
        modelConfig: {
          type: 'classification',
          framework: 'scikit-learn',
          algorithm: 'random_forest',
          parameters: {
            n_estimators: 100,
            max_depth: 10
          },
          trainingConfig: {
            validationSplit: 0.2,
            metrics: ['accuracy', 'precision', 'recall']
          }
        }
      },
      requirements: {
        frameworks: ['scikit-learn'],
        algorithms: ['random_forest']
      },
      tags: ['classification', 'basic', 'scikit-learn']
    });
    
    // Deep learning template
    this.templates.set('deep_learning', {
      name: 'Deep Learning',
      description: 'TensorFlow/Keras deep learning model',
      type: 'training',
      config: {
        type: 'training',
        modelConfig: {
          type: 'classification',
          framework: 'tensorflow',
          algorithm: 'neural_network',
          parameters: {
            hidden_layers: [128, 64, 32],
            activation: 'relu',
            dropout: 0.2
          },
          trainingConfig: {
            epochs: 100,
            batchSize: 32,
            learningRate: 0.001,
            validationSplit: 0.2,
            earlyStoppingConfig: {
              patience: 10,
              metric: 'val_loss',
              minDelta: 0.001
            }
          }
        },
        computeConfig: {
          type: 'cloud',
          resources: {
            cpu: 4,
            memory: '16GB',
            gpu: {
              enabled: true,
              count: 1
            }
          }
        }
      },
      requirements: {
        frameworks: ['tensorflow'],
        computeTypes: ['gpu']
      },
      tags: ['deep_learning', 'tensorflow', 'neural_network']
    });
    
    // Inference-only template
    this.templates.set('inference_only', {
      name: 'Inference Only',
      description: 'Model serving and inference pipeline',
      type: 'inference',
      config: {
        type: 'inference',
        computeConfig: {
          type: 'cloud',
          resources: {
            cpu: 2,
            memory: '8GB'
          },
          scaling: {
            enabled: true,
            minInstances: 1,
            maxInstances: 5,
            targetMetric: 'cpu_utilization',
            targetValue: 70
          }
        },
        monitoringConfig: {
          enabled: true,
          metrics: {
            performance: true,
            dataQuality: false,
            modelDrift: false,
            resourceUsage: true
          },
          alerting: {
            enabled: true,
            channels: [],
            thresholds: {
              latency: 1000,
              error_rate: 0.05
            }
          }
        }
      },
      requirements: {
        realtimeInference: true,
        autoScaling: true
      },
      tags: ['inference', 'serving', 'production']
    });
  }
  
  private generateConfigId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `ml_pipeline_${timestamp}_${random}`;
  }
}

// Convenience function for creating config manager
export function createMLConfigManager(options: MLConfigOptions): MLConfigManager {
  return new MLConfigManager(options);
}
