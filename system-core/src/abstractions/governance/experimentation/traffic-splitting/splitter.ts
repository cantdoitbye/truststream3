/**
 * Traffic Splitter Implementation
 * Handles variant assignment and traffic distribution for A/B testing experiments
 */

import {
  ITrafficSplitter,
  TrafficDistribution,
  VariantDistribution,
  ValidationResult
} from '../interfaces';

import {
  TrafficSplit,
  TrafficAllocation,
  TrafficSegment,
  TrafficFilter,
  SegmentCriteria,
  UUID,
  UserId,
  AgentId,
  ExperimentationError,
  Experiment
} from '../types';

export class TrafficSplitter implements ITrafficSplitter {
  private assignments: Map<string, TrafficSplit> = new Map(); // key: experimentId:userId
  private stickyAssignments: Map<string, TrafficSplit> = new Map();
  private experiments: Map<UUID, Experiment> = new Map();
  
  private readonly HASH_SEED = 42;

  /**
   * Set experiment configuration for traffic splitting
   */
  setExperiment(experiment: Experiment): void {
    this.experiments.set(experiment.id, experiment);
  }

  /**
   * Assign a user to a variant
   */
  async assignVariant(
    experimentId: UUID,
    userId: UserId,
    agentId?: AgentId,
    context?: Record<string, any>
  ): Promise<TrafficSplit> {
    try {
      const experiment = this.experiments.get(experimentId);
      if (!experiment) {
        throw new Error(`Experiment ${experimentId} not found`);
      }

      const assignmentKey = `${experimentId}:${userId}`;

      // Check for existing sticky assignment
      if (experiment.trafficAllocation.stickiness) {
        const existingAssignment = this.getStickyAssignment(assignmentKey);
        if (existingAssignment && this.isAssignmentValid(existingAssignment, experiment)) {
          return existingAssignment;
        }
      }

      // Apply traffic filters
      if (!this.passesTrafficFilters(experiment.trafficAllocation.filters || [], userId, agentId, context)) {
        throw new Error(`User ${userId} does not meet traffic filter criteria`);
      }

      // Check segment-based allocation
      const segmentVariant = this.getSegmentBasedVariant(experiment, userId, agentId, context);
      if (segmentVariant) {
        const assignment = this.createAssignment(experimentId, userId, agentId, segmentVariant, context);
        this.storeAssignment(assignment, experiment.trafficAllocation.stickiness);
        return assignment;
      }

      // Perform standard allocation
      const variantId = this.allocateVariant(experiment, userId);
      const assignment = this.createAssignment(experimentId, userId, agentId, variantId, context);
      
      this.storeAssignment(assignment, experiment.trafficAllocation.stickiness);
      return assignment;

    } catch (error) {
      throw new ExperimentationError({
        code: 'VARIANT_ASSIGNMENT_ERROR',
        message: `Failed to assign variant: ${error.message}`,
        timestamp: Date.now(),
        experimentId
      });
    }
  }

  /**
   * Get current assignment for a user
   */
  async getAssignment(experimentId: UUID, userId: UserId): Promise<TrafficSplit | null> {
    const assignmentKey = `${experimentId}:${userId}`;
    return this.assignments.get(assignmentKey) || this.stickyAssignments.get(assignmentKey) || null;
  }

  /**
   * Update traffic allocation for an experiment
   */
  async updateTrafficAllocation(experimentId: UUID, allocation: Record<UUID, number>): Promise<void> {
    try {
      const experiment = this.experiments.get(experimentId);
      if (!experiment) {
        throw new Error(`Experiment ${experimentId} not found`);
      }

      // Validate allocation
      const validation = this.validateTrafficAllocation(allocation);
      if (!validation.valid) {
        throw new Error(`Invalid allocation: ${validation.errors.join(', ')}`);
      }

      // Update experiment variants with new allocation
      experiment.variants.forEach(variant => {
        if (allocation[variant.id] !== undefined) {
          variant.allocation = allocation[variant.id];
        }
      });

      // Rebalance existing assignments if needed
      await this.rebalanceExistingAssignments(experimentId, allocation);

    } catch (error) {
      throw new ExperimentationError({
        code: 'TRAFFIC_ALLOCATION_UPDATE_ERROR',
        message: `Failed to update traffic allocation: ${error.message}`,
        timestamp: Date.now(),
        experimentId
      });
    }
  }

  /**
   * Remove user from experiment
   */
  async removeUserFromExperiment(experimentId: UUID, userId: UserId): Promise<void> {
    const assignmentKey = `${experimentId}:${userId}`;
    this.assignments.delete(assignmentKey);
    this.stickyAssignments.delete(assignmentKey);
  }

  /**
   * Get traffic distribution for an experiment
   */
  async getTrafficDistribution(experimentId: UUID): Promise<TrafficDistribution> {
    try {
      const experiment = this.experiments.get(experimentId);
      if (!experiment) {
        throw new Error(`Experiment ${experimentId} not found`);
      }

      const variantCounts = new Map<UUID, number>();
      let totalUsers = 0;

      // Count assignments for each variant
      for (const [key, assignment] of this.assignments) {
        if (assignment.experimentId === experimentId) {
          totalUsers++;
          const count = variantCounts.get(assignment.variantId) || 0;
          variantCounts.set(assignment.variantId, count + 1);
        }
      }

      // Include sticky assignments
      for (const [key, assignment] of this.stickyAssignments) {
        if (assignment.experimentId === experimentId) {
          totalUsers++;
          const count = variantCounts.get(assignment.variantId) || 0;
          variantCounts.set(assignment.variantId, count + 1);
        }
      }

      const variants: VariantDistribution[] = experiment.variants.map(variant => ({
        variantId: variant.id,
        userCount: variantCounts.get(variant.id) || 0,
        percentage: totalUsers > 0 ? ((variantCounts.get(variant.id) || 0) / totalUsers) * 100 : 0
      }));

      return {
        experimentId,
        totalUsers,
        variants,
        lastUpdated: Date.now()
      };

    } catch (error) {
      throw new ExperimentationError({
        code: 'TRAFFIC_DISTRIBUTION_ERROR',
        message: `Failed to get traffic distribution: ${error.message}`,
        timestamp: Date.now(),
        experimentId
      });
    }
  }

  /**
   * Validate traffic allocation
   */
  validateTrafficAllocation(allocation: Record<UUID, number>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const values = Object.values(allocation);
      const total = values.reduce((sum, value) => sum + value, 0);

      // Check total allocation
      if (Math.abs(total - 100) > 0.01) {
        errors.push(`Total allocation must equal 100%, got ${total}%`);
      }

      // Check individual allocations
      for (const [variantId, percentage] of Object.entries(allocation)) {
        if (percentage < 0) {
          errors.push(`Allocation for variant ${variantId} cannot be negative`);
        }
        if (percentage > 100) {
          errors.push(`Allocation for variant ${variantId} cannot exceed 100%`);
        }
        if (percentage > 0 && percentage < 1) {
          warnings.push(`Allocation for variant ${variantId} is very small (${percentage}%), consider minimum viable allocation`);
        }
      }

      // Check for empty allocations
      if (values.filter(v => v > 0).length < 2) {
        errors.push('At least 2 variants must have non-zero allocation');
      }

    } catch (error) {
      errors.push(`Allocation validation error: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Rebalance traffic across variants
   */
  async rebalanceTraffic(experimentId: UUID): Promise<void> {
    try {
      const experiment = this.experiments.get(experimentId);
      if (!experiment) {
        throw new Error(`Experiment ${experimentId} not found`);
      }

      // Get current distribution
      const distribution = await this.getTrafficDistribution(experimentId);

      // Calculate desired distribution
      const desiredDistribution = new Map<UUID, number>();
      experiment.variants.forEach(variant => {
        desiredDistribution.set(variant.id, (variant.allocation / 100) * distribution.totalUsers);
      });

      // Identify over/under allocated variants
      const reallocations: { from: UUID; to: UUID; count: number }[] = [];
      
      for (const variant of distribution.variants) {
        const desired = desiredDistribution.get(variant.variantId) || 0;
        const difference = variant.userCount - desired;
        
        if (Math.abs(difference) > 1) { // Only rebalance if difference is significant
          // Implementation would reassign users here
          // For now, we'll just log the rebalancing need
          console.log(`Variant ${variant.variantId} needs ${difference > 0 ? 'fewer' : 'more'} users: ${Math.abs(difference)}`);
        }
      }

    } catch (error) {
      throw new ExperimentationError({
        code: 'TRAFFIC_REBALANCE_ERROR',
        message: `Failed to rebalance traffic: ${error.message}`,
        timestamp: Date.now(),
        experimentId
      });
    }
  }

  /**
   * Private helper methods
   */

  private allocateVariant(experiment: Experiment, userId: UserId): UUID {
    const algorithm = experiment.trafficAllocation.algorithm;

    switch (algorithm) {
      case 'hash-based':
        return this.hashBasedAllocation(experiment, userId);
      case 'deterministic':
        return this.deterministicAllocation(experiment, userId);
      case 'random':
        return this.randomAllocation(experiment);
      default:
        return this.hashBasedAllocation(experiment, userId);
    }
  }

  private hashBasedAllocation(experiment: Experiment, userId: UserId): UUID {
    const hash = this.hashString(`${experiment.id}:${userId}`, this.HASH_SEED);
    const percentage = (hash % 10000) / 100; // 0-99.99

    let cumulativeAllocation = 0;
    for (const variant of experiment.variants) {
      cumulativeAllocation += variant.allocation;
      if (percentage < cumulativeAllocation) {
        return variant.id;
      }
    }

    // Fallback to control variant
    return experiment.variants.find(v => v.isControl)?.id || experiment.variants[0].id;
  }

  private deterministicAllocation(experiment: Experiment, userId: UserId): UUID {
    // Simple deterministic allocation based on user ID
    const userIdHash = this.hashString(userId, this.HASH_SEED);
    const variantIndex = userIdHash % experiment.variants.length;
    return experiment.variants[variantIndex].id;
  }

  private randomAllocation(experiment: Experiment): UUID {
    const random = Math.random() * 100;
    let cumulativeAllocation = 0;

    for (const variant of experiment.variants) {
      cumulativeAllocation += variant.allocation;
      if (random < cumulativeAllocation) {
        return variant.id;
      }
    }

    return experiment.variants[0].id;
  }

  private hashString(str: string, seed: number): number {
    let hash = seed;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private passesTrafficFilters(
    filters: TrafficFilter[],
    userId: UserId,
    agentId?: AgentId,
    context?: Record<string, any>
  ): boolean {
    for (const filter of filters) {
      const value = this.getFilterValue(filter.field, userId, agentId, context);
      const passes = this.evaluateFilterCondition(value, filter.operator, filter.value);
      
      if (filter.include && !passes) {
        return false;
      }
      if (!filter.include && passes) {
        return false;
      }
    }
    return true;
  }

  private getFilterValue(field: string, userId: UserId, agentId?: AgentId, context?: Record<string, any>): any {
    switch (field) {
      case 'userId':
        return userId;
      case 'agentId':
        return agentId;
      default:
        return context?.[field];
    }
  }

  private evaluateFilterCondition(value: any, operator: string, filterValue: any): boolean {
    switch (operator) {
      case 'equals':
        return value === filterValue;
      case 'contains':
        return typeof value === 'string' && value.includes(filterValue);
      case 'in':
        return Array.isArray(filterValue) && filterValue.includes(value);
      case 'greater_than':
        return typeof value === 'number' && value > filterValue;
      case 'less_than':
        return typeof value === 'number' && value < filterValue;
      case 'regex':
        return typeof value === 'string' && new RegExp(filterValue).test(value);
      default:
        return false;
    }
  }

  private getSegmentBasedVariant(
    experiment: Experiment,
    userId: UserId,
    agentId?: AgentId,
    context?: Record<string, any>
  ): UUID | null {
    if (experiment.trafficAllocation.algorithm !== 'segment-based' || !experiment.trafficAllocation.segments) {
      return null;
    }

    for (const segment of experiment.trafficAllocation.segments) {
      if (this.matchesSegment(segment, userId, agentId, context)) {
        return segment.variantId;
      }
    }

    return null;
  }

  private matchesSegment(
    segment: TrafficSegment,
    userId: UserId,
    agentId?: AgentId,
    context?: Record<string, any>
  ): boolean {
    for (const criteria of segment.criteria) {
      const value = this.getFilterValue(criteria.field, userId, agentId, context);
      if (!this.evaluateFilterCondition(value, criteria.operator, criteria.value)) {
        return false;
      }
    }
    return true;
  }

  private createAssignment(
    experimentId: UUID,
    userId: UserId,
    agentId: AgentId | undefined,
    variantId: UUID,
    context?: Record<string, any>
  ): TrafficSplit {
    return {
      experimentId,
      userId,
      agentId,
      variantId,
      assignedAt: Date.now(),
      sessionId: context?.sessionId,
      metadata: context || {}
    };
  }

  private storeAssignment(assignment: TrafficSplit, sticky: boolean): void {
    const key = `${assignment.experimentId}:${assignment.userId}`;
    this.assignments.set(key, assignment);

    if (sticky) {
      this.stickyAssignments.set(key, assignment);
    }
  }

  private getStickyAssignment(assignmentKey: string): TrafficSplit | null {
    return this.stickyAssignments.get(assignmentKey) || null;
  }

  private isAssignmentValid(assignment: TrafficSplit, experiment: Experiment): boolean {
    // Check if the assignment is still valid for the current experiment configuration
    const variant = experiment.variants.find(v => v.id === assignment.variantId);
    if (!variant) {
      return false;
    }

    // Check if sticky duration has expired
    if (experiment.trafficAllocation.stickyDuration) {
      const expirationTime = assignment.assignedAt + (experiment.trafficAllocation.stickyDuration * 1000);
      if (Date.now() > expirationTime) {
        return false;
      }
    }

    return true;
  }

  private async rebalanceExistingAssignments(
    experimentId: UUID,
    newAllocation: Record<UUID, number>
  ): Promise<void> {
    // In a real implementation, this would intelligently reassign users
    // to maintain the new allocation percentages while minimizing disruption
    console.log(`Rebalancing assignments for experiment ${experimentId} with new allocation:`, newAllocation);
  }

  /**
   * Clear all assignments (useful for testing)
   */
  clearAssignments(): void {
    this.assignments.clear();
    this.stickyAssignments.clear();
  }

  /**
   * Get assignment statistics
   */
  getAssignmentStats(experimentId: UUID): {
    totalAssignments: number;
    stickyAssignments: number;
    variantBreakdown: Record<UUID, number>;
  } {
    const stats = {
      totalAssignments: 0,
      stickyAssignments: 0,
      variantBreakdown: {} as Record<UUID, number>
    };

    for (const [key, assignment] of this.assignments) {
      if (assignment.experimentId === experimentId) {
        stats.totalAssignments++;
        stats.variantBreakdown[assignment.variantId] = 
          (stats.variantBreakdown[assignment.variantId] || 0) + 1;
      }
    }

    for (const [key, assignment] of this.stickyAssignments) {
      if (assignment.experimentId === experimentId) {
        stats.stickyAssignments++;
      }
    }

    return stats;
  }
}

export default TrafficSplitter;