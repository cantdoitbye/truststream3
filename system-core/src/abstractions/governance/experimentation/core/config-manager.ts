/**
 * Configuration Manager Implementation
 * Manages experiment framework configuration and settings
 */

import {
  IExperimentationConfigManager,
  ValidationResult
} from '../interfaces';

import {
  ExperimentConfig,
  StatsdConfig,
  AnalyticsConfig,
  FeatureFlagConfig,
  GlobalCanaryConfig,
  ExperimentationError
} from '../types';

export class ExperimentationConfigManager implements IExperimentationConfigManager {
  private config: ExperimentConfig;
  private readonly defaultConfig: ExperimentConfig;

  constructor() {
    this.defaultConfig = this.createDefaultConfig();
    this.config = { ...this.defaultConfig };
  }

  /**
   * Get experiment configuration
   */
  async getConfig(): Promise<ExperimentConfig> {
    return { ...this.config };
  }

  /**
   * Update experiment configuration
   */
  async updateConfig(updates: Partial<ExperimentConfig>): Promise<ExperimentConfig> {
    try {
      const updatedConfig = { ...this.config, ...updates };
      
      // Validate the updated configuration
      const validation = this.validateConfig(updatedConfig);
      if (!validation.valid) {
        throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
      }

      this.config = updatedConfig;
      return { ...this.config };

    } catch (error) {
      throw new ExperimentationError({
        code: 'CONFIG_UPDATE_ERROR',
        message: `Failed to update configuration: ${error.message}`,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Validate configuration
   */
  validateConfig(config: ExperimentConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate confidence level
      if (config.defaultConfidence < 0.5 || config.defaultConfidence > 0.99) {
        errors.push('Default confidence must be between 0.5 and 0.99');
      }

      // Validate power level
      if (config.defaultPower < 0.5 || config.defaultPower > 0.95) {
        errors.push('Default power must be between 0.5 and 0.95');
      }

      // Validate experiment duration
      if (config.maxExperimentDuration <= 0) {
        errors.push('Maximum experiment duration must be positive');
      }

      if (config.maxExperimentDuration > 365) {
        warnings.push('Maximum experiment duration over 1 year may be excessive');
      }

      // Validate minimum sample size
      if (config.minSampleSize < 10) {
        warnings.push('Minimum sample size below 10 may not provide reliable results');
      }

      // Validate StatsD configuration
      if (config.statsdConfig) {
        const statsdValidation = this.validateStatsdConfig(config.statsdConfig);
        errors.push(...statsdValidation.errors);
        warnings.push(...statsdValidation.warnings);
      }

      // Validate analytics configuration
      if (config.analyticsConfig) {
        const analyticsValidation = this.validateAnalyticsConfig(config.analyticsConfig);
        errors.push(...analyticsValidation.errors);
        warnings.push(...analyticsValidation.warnings);
      }

      // Validate feature flag configuration
      if (config.featureFlagConfig) {
        const flagValidation = this.validateFeatureFlagConfig(config.featureFlagConfig);
        errors.push(...flagValidation.errors);
        warnings.push(...flagValidation.warnings);
      }

      // Validate canary configuration
      if (config.canaryConfig) {
        const canaryValidation = this.validateCanaryConfig(config.canaryConfig);
        errors.push(...canaryValidation.errors);
        warnings.push(...canaryValidation.warnings);
      }

    } catch (error) {
      errors.push(`Configuration validation error: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Reset configuration to defaults
   */
  async resetToDefaults(): Promise<ExperimentConfig> {
    this.config = { ...this.defaultConfig };
    return { ...this.config };
  }

  /**
   * Get specific configuration section
   */
  async getStatsdConfig(): Promise<StatsdConfig | undefined> {
    return this.config.statsdConfig ? { ...this.config.statsdConfig } : undefined;
  }

  async getAnalyticsConfig(): Promise<AnalyticsConfig | undefined> {
    return this.config.analyticsConfig ? { ...this.config.analyticsConfig } : undefined;
  }

  async getFeatureFlagConfig(): Promise<FeatureFlagConfig | undefined> {
    return this.config.featureFlagConfig ? { ...this.config.featureFlagConfig } : undefined;
  }

  async getCanaryConfig(): Promise<GlobalCanaryConfig | undefined> {
    return this.config.canaryConfig ? { ...this.config.canaryConfig } : undefined;
  }

  /**
   * Update specific configuration section
   */
  async updateStatsdConfig(config: StatsdConfig): Promise<void> {
    await this.updateConfig({ statsdConfig: config });
  }

  async updateAnalyticsConfig(config: AnalyticsConfig): Promise<void> {
    await this.updateConfig({ analyticsConfig: config });
  }

  async updateFeatureFlagConfig(config: FeatureFlagConfig): Promise<void> {
    await this.updateConfig({ featureFlagConfig: config });
  }

  async updateCanaryConfig(config: GlobalCanaryConfig): Promise<void> {
    await this.updateConfig({ canaryConfig: config });
  }

  /**
   * Private helper methods
   */

  private createDefaultConfig(): ExperimentConfig {
    return {
      defaultConfidence: 0.95,
      defaultPower: 0.8,
      maxExperimentDuration: 90, // 90 days
      minSampleSize: 100,
      statsdConfig: {
        host: 'localhost',
        port: 8125,
        prefix: 'truststream.experiments'
      },
      analyticsConfig: {
        batchSize: 1000,
        flushInterval: 60, // 1 minute
        retentionDays: 365
      },
      featureFlagConfig: {
        defaultRolloutPercentage: 100,
        evaluationCacheSize: 10000,
        evaluationCacheTtl: 300 // 5 minutes
      },
      canaryConfig: {
        defaultIncrements: [5, 10, 25, 50, 75, 100],
        defaultPromotionDelay: 300, // 5 minutes
        defaultRollbackThreshold: 5, // 5% error rate
        monitoringInterval: 30 // 30 seconds
      }
    };
  }

  private validateStatsdConfig(config: StatsdConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.host || config.host.trim().length === 0) {
      errors.push('StatsD host is required');
    }

    if (config.port <= 0 || config.port > 65535) {
      errors.push('StatsD port must be between 1 and 65535');
    }

    if (!config.prefix || config.prefix.trim().length === 0) {
      warnings.push('StatsD prefix is recommended for metric organization');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private validateAnalyticsConfig(config: AnalyticsConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (config.batchSize <= 0) {
      errors.push('Analytics batch size must be positive');
    }

    if (config.batchSize > 10000) {
      warnings.push('Large batch sizes may impact performance');
    }

    if (config.flushInterval <= 0) {
      errors.push('Analytics flush interval must be positive');
    }

    if (config.flushInterval < 10) {
      warnings.push('Very short flush intervals may impact performance');
    }

    if (config.retentionDays <= 0) {
      errors.push('Analytics retention days must be positive');
    }

    if (config.retentionDays > 2555) { // ~7 years
      warnings.push('Very long retention periods may impact storage costs');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private validateFeatureFlagConfig(config: FeatureFlagConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (config.defaultRolloutPercentage < 0 || config.defaultRolloutPercentage > 100) {
      errors.push('Default rollout percentage must be between 0 and 100');
    }

    if (config.evaluationCacheSize <= 0) {
      errors.push('Evaluation cache size must be positive');
    }

    if (config.evaluationCacheSize > 100000) {
      warnings.push('Large cache sizes may impact memory usage');
    }

    if (config.evaluationCacheTtl <= 0) {
      errors.push('Evaluation cache TTL must be positive');
    }

    if (config.evaluationCacheTtl < 60) {
      warnings.push('Short cache TTL may impact performance');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private validateCanaryConfig(config: GlobalCanaryConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.defaultIncrements || config.defaultIncrements.length === 0) {
      errors.push('Default increments are required');
    } else {
      for (const increment of config.defaultIncrements) {
        if (increment <= 0 || increment > 100) {
          errors.push('Default increments must be between 0 and 100');
        }
      }

      // Check if increments are in ascending order
      for (let i = 1; i < config.defaultIncrements.length; i++) {
        if (config.defaultIncrements[i] <= config.defaultIncrements[i - 1]) {
          warnings.push('Default increments should be in ascending order');
          break;
        }
      }
    }

    if (config.defaultPromotionDelay <= 0) {
      errors.push('Default promotion delay must be positive');
    }

    if (config.defaultPromotionDelay < 60) {
      warnings.push('Very short promotion delays may not allow sufficient monitoring');
    }

    if (config.defaultRollbackThreshold <= 0 || config.defaultRollbackThreshold > 100) {
      errors.push('Default rollback threshold must be between 0 and 100');
    }

    if (config.monitoringInterval <= 0) {
      errors.push('Monitoring interval must be positive');
    }

    if (config.monitoringInterval < 10) {
      warnings.push('Very short monitoring intervals may impact performance');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Export configuration as JSON
   */
  async exportConfig(): Promise<string> {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  async importConfig(configJson: string): Promise<ExperimentConfig> {
    try {
      const importedConfig = JSON.parse(configJson) as ExperimentConfig;
      return await this.updateConfig(importedConfig);
    } catch (error) {
      throw new ExperimentationError({
        code: 'CONFIG_IMPORT_ERROR',
        message: `Failed to import configuration: ${error.message}`,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get configuration schema for validation
   */
  getConfigSchema(): any {
    return {
      type: 'object',
      properties: {
        defaultConfidence: {
          type: 'number',
          minimum: 0.5,
          maximum: 0.99,
          description: 'Default confidence level for statistical tests'
        },
        defaultPower: {
          type: 'number',
          minimum: 0.5,
          maximum: 0.95,
          description: 'Default statistical power for experiments'
        },
        maxExperimentDuration: {
          type: 'number',
          minimum: 1,
          description: 'Maximum experiment duration in days'
        },
        minSampleSize: {
          type: 'number',
          minimum: 1,
          description: 'Minimum sample size for experiments'
        },
        statsdConfig: {
          type: 'object',
          properties: {
            host: { type: 'string' },
            port: { type: 'number', minimum: 1, maximum: 65535 },
            prefix: { type: 'string' }
          },
          required: ['host', 'port']
        },
        analyticsConfig: {
          type: 'object',
          properties: {
            batchSize: { type: 'number', minimum: 1 },
            flushInterval: { type: 'number', minimum: 1 },
            retentionDays: { type: 'number', minimum: 1 }
          },
          required: ['batchSize', 'flushInterval', 'retentionDays']
        },
        featureFlagConfig: {
          type: 'object',
          properties: {
            defaultRolloutPercentage: { type: 'number', minimum: 0, maximum: 100 },
            evaluationCacheSize: { type: 'number', minimum: 1 },
            evaluationCacheTtl: { type: 'number', minimum: 1 }
          },
          required: ['defaultRolloutPercentage', 'evaluationCacheSize', 'evaluationCacheTtl']
        },
        canaryConfig: {
          type: 'object',
          properties: {
            defaultIncrements: {
              type: 'array',
              items: { type: 'number', minimum: 0, maximum: 100 }
            },
            defaultPromotionDelay: { type: 'number', minimum: 1 },
            defaultRollbackThreshold: { type: 'number', minimum: 0, maximum: 100 },
            monitoringInterval: { type: 'number', minimum: 1 }
          },
          required: ['defaultIncrements', 'defaultPromotionDelay', 'defaultRollbackThreshold', 'monitoringInterval']
        }
      },
      required: ['defaultConfidence', 'defaultPower', 'maxExperimentDuration', 'minSampleSize']
    };
  }
}

export default ExperimentationConfigManager;