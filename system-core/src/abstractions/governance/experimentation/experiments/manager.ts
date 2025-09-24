/**
 * Experiment Manager Implementation
 * Handles the complete lifecycle of A/B testing experiments for governance agents
 */

import {
  IExperimentManager,
  ExperimentFilter,
  ValidationResult
} from '../interfaces';

import {
  Experiment,
  ExperimentStatus,
  ExperimentReport,
  ExperimentResult,
  StatisticalResult,
  UUID,
  UserId,
  ExperimentationError,
  Timestamp
} from '../types';

export class ExperimentManager implements IExperimentManager {
  private experiments: Map<UUID, Experiment> = new Map();
  private experimentIndex: Map<string, Set<UUID>> = new Map(); // For efficient filtering

  /**
   * Create a new experiment
   */
  async createExperiment(experimentData: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Experiment> {
    try {
      const id = this.generateUUID();
      const now = Date.now();

      const experiment: Experiment = {
        ...experimentData,
        id,
        createdAt: now,
        updatedAt: now,
        status: ExperimentStatus.DRAFT
      };

      // Validate the experiment
      const validation = await this.validateExperiment(experiment);
      if (!validation.valid) {
        throw new Error(`Experiment validation failed: ${validation.errors.join(', ')}`);
      }

      // Store the experiment
      this.experiments.set(id, experiment);
      this.updateIndex(experiment);

      return experiment;

    } catch (error) {
      throw new ExperimentationError({
        code: 'EXPERIMENT_CREATION_ERROR',
        message: `Failed to create experiment: ${error.message}`,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Update an existing experiment
   */
  async updateExperiment(id: UUID, updates: Partial<Experiment>): Promise<Experiment> {
    try {
      const experiment = this.experiments.get(id);
      if (!experiment) {
        throw new Error(`Experiment ${id} not found`);
      }

      // Validate status transitions
      if (updates.status && !this.isValidStatusTransition(experiment.status, updates.status)) {
        throw new Error(`Invalid status transition from ${experiment.status} to ${updates.status}`);
      }

      // Create updated experiment
      const updatedExperiment: Experiment = {
        ...experiment,
        ...updates,
        id, // Ensure ID cannot be changed
        createdAt: experiment.createdAt, // Ensure creation time cannot be changed
        updatedAt: Date.now()
      };

      // Validate the updated experiment
      const validation = await this.validateExperiment(updatedExperiment);
      if (!validation.valid) {
        throw new Error(`Updated experiment validation failed: ${validation.errors.join(', ')}`);
      }

      // Update storage and index
      this.experiments.set(id, updatedExperiment);
      this.updateIndex(updatedExperiment, experiment);

      return updatedExperiment;

    } catch (error) {
      throw new ExperimentationError({
        code: 'EXPERIMENT_UPDATE_ERROR',
        message: `Failed to update experiment: ${error.message}`,
        timestamp: Date.now(),
        experimentId: id
      });
    }
  }

  /**
   * Get experiment by ID
   */
  async getExperiment(id: UUID): Promise<Experiment | null> {
    return this.experiments.get(id) || null;
  }

  /**
   * List experiments with optional filtering
   */
  async listExperiments(filter?: ExperimentFilter): Promise<Experiment[]> {
    try {
      let experiments = Array.from(this.experiments.values());

      if (filter) {
        experiments = this.applyFilters(experiments, filter);
      }

      // Sort by creation date (newest first)
      experiments.sort((a, b) => b.createdAt - a.createdAt);

      return experiments;

    } catch (error) {
      throw new ExperimentationError({
        code: 'EXPERIMENT_LIST_ERROR',
        message: `Failed to list experiments: ${error.message}`,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Start an experiment
   */
  async startExperiment(id: UUID): Promise<void> {
    try {
      const experiment = await this.getExperiment(id);
      if (!experiment) {
        throw new Error(`Experiment ${id} not found`);
      }

      if (experiment.status !== ExperimentStatus.DRAFT) {
        throw new Error(`Cannot start experiment ${id} - current status: ${experiment.status}`);
      }

      // Validate experiment is ready to start
      const validation = await this.validateExperimentStart(experiment);
      if (!validation.valid) {
        throw new Error(`Cannot start experiment: ${validation.errors.join(', ')}`);
      }

      await this.updateExperiment(id, {
        status: ExperimentStatus.ACTIVE,
        startDate: Date.now()
      });

    } catch (error) {
      throw new ExperimentationError({
        code: 'EXPERIMENT_START_ERROR',
        message: `Failed to start experiment: ${error.message}`,
        timestamp: Date.now(),
        experimentId: id
      });
    }
  }

  /**
   * Pause an experiment
   */
  async pauseExperiment(id: UUID): Promise<void> {
    try {
      const experiment = await this.getExperiment(id);
      if (!experiment) {
        throw new Error(`Experiment ${id} not found`);
      }

      if (experiment.status !== ExperimentStatus.ACTIVE) {
        throw new Error(`Cannot pause experiment ${id} - current status: ${experiment.status}`);
      }

      await this.updateExperiment(id, {
        status: ExperimentStatus.PAUSED
      });

    } catch (error) {
      throw new ExperimentationError({
        code: 'EXPERIMENT_PAUSE_ERROR',
        message: `Failed to pause experiment: ${error.message}`,
        timestamp: Date.now(),
        experimentId: id
      });
    }
  }

  /**
   * Resume a paused experiment
   */
  async resumeExperiment(id: UUID): Promise<void> {
    try {
      const experiment = await this.getExperiment(id);
      if (!experiment) {
        throw new Error(`Experiment ${id} not found`);
      }

      if (experiment.status !== ExperimentStatus.PAUSED) {
        throw new Error(`Cannot resume experiment ${id} - current status: ${experiment.status}`);
      }

      await this.updateExperiment(id, {
        status: ExperimentStatus.ACTIVE
      });

    } catch (error) {
      throw new ExperimentationError({
        code: 'EXPERIMENT_RESUME_ERROR',
        message: `Failed to resume experiment: ${error.message}`,
        timestamp: Date.now(),
        experimentId: id
      });
    }
  }

  /**
   * Complete an experiment
   */
  async completeExperiment(id: UUID): Promise<ExperimentReport> {
    try {
      const experiment = await this.getExperiment(id);
      if (!experiment) {
        throw new Error(`Experiment ${id} not found`);
      }

      if (![ExperimentStatus.ACTIVE, ExperimentStatus.PAUSED].includes(experiment.status)) {
        throw new Error(`Cannot complete experiment ${id} - current status: ${experiment.status}`);
      }

      // Generate final report
      const report = await this.generateFinalReport(experiment);

      // Update experiment status
      await this.updateExperiment(id, {
        status: ExperimentStatus.COMPLETED,
        endDate: Date.now()
      });

      return report;

    } catch (error) {
      throw new ExperimentationError({
        code: 'EXPERIMENT_COMPLETION_ERROR',
        message: `Failed to complete experiment: ${error.message}`,
        timestamp: Date.now(),
        experimentId: id
      });
    }
  }

  /**
   * Terminate an experiment
   */
  async terminateExperiment(id: UUID, reason: string): Promise<void> {
    try {
      const experiment = await this.getExperiment(id);
      if (!experiment) {
        throw new Error(`Experiment ${id} not found`);
      }

      if ([ExperimentStatus.COMPLETED, ExperimentStatus.TERMINATED].includes(experiment.status)) {
        throw new Error(`Cannot terminate experiment ${id} - current status: ${experiment.status}`);
      }

      await this.updateExperiment(id, {
        status: ExperimentStatus.TERMINATED,
        endDate: Date.now(),
        metadata: {
          ...experiment.metadata,
          terminationReason: reason,
          terminatedAt: Date.now()
        }
      });

    } catch (error) {
      throw new ExperimentationError({
        code: 'EXPERIMENT_TERMINATION_ERROR',
        message: `Failed to terminate experiment: ${error.message}`,
        timestamp: Date.now(),
        experimentId: id
      });
    }
  }

  /**
   * Validate experiment configuration
   */
  async validateExperiment(experiment: Experiment): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic validation
      if (!experiment.name || experiment.name.trim().length === 0) {
        errors.push('Experiment name is required');
      }

      if (!experiment.description || experiment.description.trim().length === 0) {
        warnings.push('Experiment description is recommended');
      }

      if (!experiment.hypotheses || experiment.hypotheses.length === 0) {
        warnings.push('At least one hypothesis is recommended');
      }

      // Validate variants
      if (!experiment.variants || experiment.variants.length < 2) {
        errors.push('At least 2 variants are required');
      } else {
        const totalAllocation = experiment.variants.reduce((sum, variant) => sum + variant.allocation, 0);
        if (Math.abs(totalAllocation - 100) > 0.01) {
          errors.push(`Total variant allocation must equal 100%, got ${totalAllocation}%`);
        }

        const controlVariants = experiment.variants.filter(v => v.isControl);
        if (controlVariants.length !== 1) {
          errors.push('Exactly one control variant is required');
        }

        // Validate variant IDs are unique
        const variantIds = experiment.variants.map(v => v.id);
        const uniqueIds = new Set(variantIds);
        if (variantIds.length !== uniqueIds.size) {
          errors.push('Variant IDs must be unique');
        }
      }

      // Validate metrics
      if (!experiment.metrics || experiment.metrics.length === 0) {
        errors.push('At least one metric is required');
      } else {
        const primaryMetrics = experiment.metrics.filter(m => m.type === 'primary');
        if (primaryMetrics.length === 0) {
          errors.push('At least one primary metric is required');
        }
      }

      // Validate traffic allocation
      if (!experiment.trafficAllocation) {
        errors.push('Traffic allocation configuration is required');
      }

      // Validate confidence and power
      if (experiment.confidence < 0.8 || experiment.confidence > 0.99) {
        warnings.push('Confidence level should typically be between 80% and 99%');
      }

      if (experiment.power < 0.8 || experiment.power > 0.95) {
        warnings.push('Statistical power should typically be between 80% and 95%');
      }

      // Validate minimum sample size
      if (experiment.minimumSampleSize < 100) {
        warnings.push('Minimum sample size should typically be at least 100');
      }

      // Validate target
      if (!experiment.targetType || !experiment.targetId) {
        errors.push('Target type and ID are required');
      }

    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Clone an experiment
   */
  async cloneExperiment(id: UUID, name: string): Promise<Experiment> {
    try {
      const originalExperiment = await this.getExperiment(id);
      if (!originalExperiment) {
        throw new Error(`Experiment ${id} not found`);
      }

      const clonedData: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'> = {
        ...originalExperiment,
        name,
        status: ExperimentStatus.DRAFT,
        startDate: 0,
        endDate: undefined,
        metadata: {
          ...originalExperiment.metadata,
          clonedFrom: id,
          clonedAt: Date.now()
        }
      };

      return await this.createExperiment(clonedData);

    } catch (error) {
      throw new ExperimentationError({
        code: 'EXPERIMENT_CLONE_ERROR',
        message: `Failed to clone experiment: ${error.message}`,
        timestamp: Date.now(),
        experimentId: id
      });
    }
  }

  /**
   * Archive an experiment
   */
  async archiveExperiment(id: UUID): Promise<void> {
    try {
      const experiment = await this.getExperiment(id);
      if (!experiment) {
        throw new Error(`Experiment ${id} not found`);
      }

      if (experiment.status === ExperimentStatus.ACTIVE) {
        throw new Error('Cannot archive an active experiment. Complete or terminate it first.');
      }

      await this.updateExperiment(id, {
        metadata: {
          ...experiment.metadata,
          archived: true,
          archivedAt: Date.now()
        }
      });

    } catch (error) {
      throw new ExperimentationError({
        code: 'EXPERIMENT_ARCHIVE_ERROR',
        message: `Failed to archive experiment: ${error.message}`,
        timestamp: Date.now(),
        experimentId: id
      });
    }
  }

  /**
   * Private helper methods
   */

  private generateUUID(): UUID {
    return 'exp_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
  }

  private isValidStatusTransition(currentStatus: ExperimentStatus, newStatus: ExperimentStatus): boolean {
    const validTransitions: Record<ExperimentStatus, ExperimentStatus[]> = {
      [ExperimentStatus.DRAFT]: [ExperimentStatus.ACTIVE, ExperimentStatus.TERMINATED],
      [ExperimentStatus.ACTIVE]: [ExperimentStatus.PAUSED, ExperimentStatus.COMPLETED, ExperimentStatus.TERMINATED],
      [ExperimentStatus.PAUSED]: [ExperimentStatus.ACTIVE, ExperimentStatus.COMPLETED, ExperimentStatus.TERMINATED],
      [ExperimentStatus.COMPLETED]: [],
      [ExperimentStatus.TERMINATED]: [],
      [ExperimentStatus.ANALYZING]: [ExperimentStatus.COMPLETED, ExperimentStatus.TERMINATED]
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  private async validateExperimentStart(experiment: Experiment): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if experiment duration is reasonable
    if (experiment.endDate && experiment.endDate <= Date.now()) {
      errors.push('End date must be in the future');
    }

    // Check if sample size requirements can be met
    if (experiment.minimumSampleSize > 0) {
      warnings.push('Ensure sufficient traffic to meet minimum sample size requirements');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private async generateFinalReport(experiment: Experiment): Promise<ExperimentReport> {
    const now = Date.now();
    const duration = experiment.startDate ? now - experiment.startDate : 0;

    // Mock implementation - in real scenario, this would integrate with statistical analyzer
    const results: ExperimentResult[] = experiment.metrics.map(metric => ({
      metricId: metric.id,
      metricName: metric.name,
      statisticalResult: {
        metricId: metric.id,
        variantComparison: [],
        significance: 0.95,
        pValue: 0.05,
        confidenceInterval: [0, 0],
        effectSize: 0,
        sampleSize: 0,
        testType: metric.statisticalTest,
        calculatedAt: now
      },
      recommendation: 'continue',
      significance: 'not_significant'
    }));

    return {
      experimentId: experiment.id,
      generatedAt: now,
      status: experiment.status,
      duration,
      totalSampleSize: 0, // Would be calculated from actual data
      results,
      recommendations: ['Continue monitoring', 'Collect more data'],
      summary: `Experiment ${experiment.name} completed after ${Math.round(duration / (1000 * 60 * 60 * 24))} days`
    };
  }

  private updateIndex(experiment: Experiment, oldExperiment?: Experiment): void {
    // Remove old index entries if updating
    if (oldExperiment) {
      this.removeFromIndex(oldExperiment);
    }

    // Add new index entries
    const indexKeys = [
      `status:${experiment.status}`,
      `targetType:${experiment.targetType}`,
      `createdBy:${experiment.createdBy}`,
      `archived:${experiment.metadata.archived || false}`
    ];

    for (const key of indexKeys) {
      if (!this.experimentIndex.has(key)) {
        this.experimentIndex.set(key, new Set());
      }
      this.experimentIndex.get(key)!.add(experiment.id);
    }
  }

  private removeFromIndex(experiment: Experiment): void {
    const indexKeys = [
      `status:${experiment.status}`,
      `targetType:${experiment.targetType}`,
      `createdBy:${experiment.createdBy}`,
      `archived:${experiment.metadata.archived || false}`
    ];

    for (const key of indexKeys) {
      this.experimentIndex.get(key)?.delete(experiment.id);
    }
  }

  private applyFilters(experiments: Experiment[], filter: ExperimentFilter): Experiment[] {
    return experiments.filter(experiment => {
      if (filter.status && !filter.status.includes(experiment.status)) {
        return false;
      }

      if (filter.targetType && !filter.targetType.includes(experiment.targetType)) {
        return false;
      }

      if (filter.createdBy && !filter.createdBy.includes(experiment.createdBy)) {
        return false;
      }

      if (filter.startDate) {
        if (filter.startDate.from && experiment.startDate < filter.startDate.from) {
          return false;
        }
        if (filter.startDate.to && experiment.startDate > filter.startDate.to) {
          return false;
        }
      }

      if (filter.tags && filter.tags.length > 0) {
        const experimentTags = experiment.metadata.tags || [];
        if (!filter.tags.some(tag => experimentTags.includes(tag))) {
          return false;
        }
      }

      return true;
    });
  }
}

export default ExperimentManager;