/**
 * Feature Flag Manager Implementation
 * Provides dynamic configuration and feature toggling for governance components
 */

import {
  IFeatureFlagManager,
  FeatureFlagFilter,
  ValidationResult
} from '../interfaces';

import {
  FeatureFlag,
  FeatureFlagEvaluation,
  FeatureFlagRule,
  FeatureFlagCondition,
  FeatureFlagVariant,
  UUID,
  UserId,
  AgentId,
  ExperimentationError
} from '../types';

export class FeatureFlagManager implements IFeatureFlagManager {
  private flags: Map<UUID, FeatureFlag> = new Map();
  private flagsByKey: Map<string, FeatureFlag> = new Map();
  private evaluationCache: Map<string, FeatureFlagEvaluation> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 10000;

  /**
   * Create a new feature flag
   */
  async createFlag(flagData: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeatureFlag> {
    try {
      // Validate flag data
      const validation = this.validateFlagData(flagData);
      if (!validation.valid) {
        throw new Error(`Flag validation failed: ${validation.errors.join(', ')}`);
      }

      // Check for duplicate key
      if (this.flagsByKey.has(flagData.key)) {
        throw new Error(`Feature flag with key '${flagData.key}' already exists`);
      }

      const id = this.generateUUID();
      const now = Date.now();

      const flag: FeatureFlag = {
        ...flagData,
        id,
        createdAt: now,
        updatedAt: now
      };

      // Store the flag
      this.flags.set(id, flag);
      this.flagsByKey.set(flag.key, flag);

      // Clear evaluation cache for this flag
      this.clearFlagCache(flag.key);

      return flag;

    } catch (error) {
      throw new ExperimentationError({
        code: 'FLAG_CREATION_ERROR',
        message: `Failed to create feature flag: ${error.message}`,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Update a feature flag
   */
  async updateFlag(id: UUID, updates: Partial<FeatureFlag>): Promise<FeatureFlag> {
    try {
      const existingFlag = this.flags.get(id);
      if (!existingFlag) {
        throw new Error(`Feature flag ${id} not found`);
      }

      // Check for key conflicts if key is being updated
      if (updates.key && updates.key !== existingFlag.key) {
        if (this.flagsByKey.has(updates.key)) {
          throw new Error(`Feature flag with key '${updates.key}' already exists`);
        }
      }

      const updatedFlag: FeatureFlag = {
        ...existingFlag,
        ...updates,
        id, // Ensure ID cannot be changed
        createdAt: existingFlag.createdAt, // Ensure creation time cannot be changed
        updatedAt: Date.now()
      };

      // Validate updated flag
      const validation = this.validateFlagData(updatedFlag);
      if (!validation.valid) {
        throw new Error(`Updated flag validation failed: ${validation.errors.join(', ')}`);
      }

      // Update storage
      this.flags.set(id, updatedFlag);
      
      // Update key mapping if key changed
      if (updates.key && updates.key !== existingFlag.key) {
        this.flagsByKey.delete(existingFlag.key);
        this.flagsByKey.set(updatedFlag.key, updatedFlag);
        this.clearFlagCache(existingFlag.key);
      } else {
        this.flagsByKey.set(updatedFlag.key, updatedFlag);
      }

      // Clear evaluation cache
      this.clearFlagCache(updatedFlag.key);

      return updatedFlag;

    } catch (error) {
      throw new ExperimentationError({
        code: 'FLAG_UPDATE_ERROR',
        message: `Failed to update feature flag: ${error.message}`,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get feature flag by ID or key
   */
  async getFlag(identifier: UUID | string): Promise<FeatureFlag | null> {
    // Try by ID first
    let flag = this.flags.get(identifier);
    if (flag) return flag;

    // Try by key
    flag = this.flagsByKey.get(identifier);
    return flag || null;
  }

  /**
   * List feature flags
   */
  async listFlags(filter?: FeatureFlagFilter): Promise<FeatureFlag[]> {
    try {
      let flags = Array.from(this.flags.values());

      if (filter) {
        flags = this.applyFilters(flags, filter);
      }

      // Sort by creation date (newest first)
      flags.sort((a, b) => b.createdAt - a.createdAt);

      return flags;

    } catch (error) {
      throw new ExperimentationError({
        code: 'FLAG_LIST_ERROR',
        message: `Failed to list feature flags: ${error.message}`,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Evaluate a feature flag for a user/agent
   */
  async evaluateFlag(
    flagKey: string,
    userId: UserId,
    agentId?: AgentId,
    context?: Record<string, any>
  ): Promise<FeatureFlagEvaluation> {
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(flagKey, userId, agentId, context);
      const cached = this.getCachedEvaluation(cacheKey);
      if (cached) {
        return cached;
      }

      const flag = this.flagsByKey.get(flagKey);
      if (!flag) {
        throw new Error(`Feature flag '${flagKey}' not found`);
      }

      const evaluation = this.performEvaluation(flag, userId, agentId, context);
      
      // Cache the evaluation
      this.cacheEvaluation(cacheKey, evaluation);

      return evaluation;

    } catch (error) {
      // Return default evaluation on error
      return {
        flagId: 'unknown',
        userId,
        agentId,
        enabled: false,
        evaluatedAt: Date.now(),
        context: context || {}
      };
    }
  }

  /**
   * Bulk evaluate multiple feature flags
   */
  async evaluateFlags(
    flagKeys: string[],
    userId: UserId,
    agentId?: AgentId,
    context?: Record<string, any>
  ): Promise<Record<string, FeatureFlagEvaluation>> {
    const results: Record<string, FeatureFlagEvaluation> = {};

    // Evaluate each flag
    const evaluationPromises = flagKeys.map(async (key) => {
      try {
        const evaluation = await this.evaluateFlag(key, userId, agentId, context);
        return { key, evaluation };
      } catch (error) {
        // Return default evaluation on error
        return {
          key,
          evaluation: {
            flagId: 'unknown',
            userId,
            agentId,
            enabled: false,
            evaluatedAt: Date.now(),
            context: context || {}
          }
        };
      }
    });

    const evaluations = await Promise.all(evaluationPromises);
    
    for (const { key, evaluation } of evaluations) {
      results[key] = evaluation;
    }

    return results;
  }

  /**
   * Toggle a feature flag
   */
  async toggleFlag(id: UUID, enabled: boolean): Promise<void> {
    await this.updateFlag(id, { enabled });
  }

  /**
   * Update flag rollout percentage
   */
  async updateRollout(id: UUID, percentage: number): Promise<void> {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Rollout percentage must be between 0 and 100');
    }
    await this.updateFlag(id, { rolloutPercentage: percentage });
  }

  /**
   * Add rule to feature flag
   */
  async addRule(flagId: UUID, ruleData: Omit<FeatureFlagRule, 'id'>): Promise<FeatureFlagRule> {
    try {
      const flag = await this.getFlag(flagId);
      if (!flag) {
        throw new Error(`Feature flag ${flagId} not found`);
      }

      const rule: FeatureFlagRule = {
        ...ruleData,
        id: this.generateUUID()
      };

      const updatedRules = [...flag.rules, rule];
      
      // Sort rules by priority (higher priority first)
      updatedRules.sort((a, b) => b.priority - a.priority);

      await this.updateFlag(flagId, { rules: updatedRules });

      return rule;

    } catch (error) {
      throw new ExperimentationError({
        code: 'RULE_ADDITION_ERROR',
        message: `Failed to add rule: ${error.message}`,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Update feature flag rule
   */
  async updateRule(flagId: UUID, ruleId: UUID, updates: Partial<FeatureFlagRule>): Promise<FeatureFlagRule> {
    try {
      const flag = await this.getFlag(flagId);
      if (!flag) {
        throw new Error(`Feature flag ${flagId} not found`);
      }

      const ruleIndex = flag.rules.findIndex(r => r.id === ruleId);
      if (ruleIndex === -1) {
        throw new Error(`Rule ${ruleId} not found in flag ${flagId}`);
      }

      const updatedRule: FeatureFlagRule = {
        ...flag.rules[ruleIndex],
        ...updates,
        id: ruleId // Ensure ID cannot be changed
      };

      const updatedRules = [...flag.rules];
      updatedRules[ruleIndex] = updatedRule;

      // Re-sort rules by priority if priority was updated
      if (updates.priority !== undefined) {
        updatedRules.sort((a, b) => b.priority - a.priority);
      }

      await this.updateFlag(flagId, { rules: updatedRules });

      return updatedRule;

    } catch (error) {
      throw new ExperimentationError({
        code: 'RULE_UPDATE_ERROR',
        message: `Failed to update rule: ${error.message}`,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Remove rule from feature flag
   */
  async removeRule(flagId: UUID, ruleId: UUID): Promise<void> {
    try {
      const flag = await this.getFlag(flagId);
      if (!flag) {
        throw new Error(`Feature flag ${flagId} not found`);
      }

      const updatedRules = flag.rules.filter(r => r.id !== ruleId);
      
      if (updatedRules.length === flag.rules.length) {
        throw new Error(`Rule ${ruleId} not found in flag ${flagId}`);
      }

      await this.updateFlag(flagId, { rules: updatedRules });

    } catch (error) {
      throw new ExperimentationError({
        code: 'RULE_REMOVAL_ERROR',
        message: `Failed to remove rule: ${error.message}`,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Archive a feature flag
   */
  async archiveFlag(id: UUID): Promise<void> {
    await this.updateFlag(id, {
      enabled: false,
      metadata: {
        archived: true,
        archivedAt: Date.now()
      }
    });
  }

  /**
   * Get flag evaluation history
   */
  async getEvaluationHistory(flagId: UUID, userId?: UserId): Promise<FeatureFlagEvaluation[]> {
    // In a real implementation, this would query a persistent store
    // For now, we'll return empty array
    return [];
  }

  /**
   * Private helper methods
   */

  private performEvaluation(
    flag: FeatureFlag,
    userId: UserId,
    agentId?: AgentId,
    context?: Record<string, any>
  ): FeatureFlagEvaluation {
    // Check if flag is enabled globally
    if (!flag.enabled) {
      return {
        flagId: flag.id,
        userId,
        agentId,
        enabled: false,
        evaluatedAt: Date.now(),
        context: context || {}
      };
    }

    // Check targeting
    if (flag.targetType && flag.targetId) {
      const targetMatches = this.checkTargeting(flag, userId, agentId, context);
      if (!targetMatches) {
        return {
          flagId: flag.id,
          userId,
          agentId,
          enabled: false,
          evaluatedAt: Date.now(),
          context: context || {}
        };
      }
    }

    // Evaluate rules in priority order
    for (const rule of flag.rules) {
      if (!rule.enabled) continue;

      const ruleMatches = this.evaluateRule(rule, userId, agentId, context);
      if (ruleMatches) {
        // Check rollout percentage for this rule
        if (!this.passesRollout(rule.rolloutPercentage, userId)) {
          continue;
        }

        const variant = rule.variant ? flag.variants?.find(v => v.id === rule.variant) : undefined;
        
        return {
          flagId: flag.id,
          userId,
          agentId,
          enabled: true,
          variant,
          rule: rule.id,
          evaluatedAt: Date.now(),
          context: context || {}
        };
      }
    }

    // Check global rollout percentage
    if (!this.passesRollout(flag.rolloutPercentage, userId)) {
      return {
        flagId: flag.id,
        userId,
        agentId,
        enabled: false,
        evaluatedAt: Date.now(),
        context: context || {}
      };
    }

    // Default evaluation - flag is enabled
    const defaultVariant = flag.variants?.[0];
    
    return {
      flagId: flag.id,
      userId,
      agentId,
      enabled: true,
      variant: defaultVariant,
      evaluatedAt: Date.now(),
      context: context || {}
    };
  }

  private checkTargeting(
    flag: FeatureFlag,
    userId: UserId,
    agentId?: AgentId,
    context?: Record<string, any>
  ): boolean {
    switch (flag.targetType) {
      case 'agent':
        return agentId === flag.targetId;
      case 'policy':
      case 'algorithm':
      case 'workflow':
        return context?.targetId === flag.targetId;
      case 'global':
        return true;
      default:
        return false;
    }
  }

  private evaluateRule(
    rule: FeatureFlagRule,
    userId: UserId,
    agentId?: AgentId,
    context?: Record<string, any>
  ): boolean {
    for (const condition of rule.conditions) {
      if (!this.evaluateCondition(condition, userId, agentId, context)) {
        return false; // All conditions must match (AND logic)
      }
    }
    return true;
  }

  private evaluateCondition(
    condition: FeatureFlagCondition,
    userId: UserId,
    agentId?: AgentId,
    context?: Record<string, any>
  ): boolean {
    const value = this.getConditionValue(condition.field, userId, agentId, context);
    return this.compareValues(value, condition.operator, condition.value);
  }

  private getConditionValue(
    field: string,
    userId: UserId,
    agentId?: AgentId,
    context?: Record<string, any>
  ): any {
    switch (field) {
      case 'userId':
        return userId;
      case 'agentId':
        return agentId;
      default:
        return context?.[field];
    }
  }

  private compareValues(value: any, operator: string, conditionValue: any): boolean {
    switch (operator) {
      case 'equals':
        return value === conditionValue;
      case 'contains':
        return typeof value === 'string' && value.includes(conditionValue);
      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(value);
      case 'greater_than':
        return typeof value === 'number' && value > conditionValue;
      case 'less_than':
        return typeof value === 'number' && value < conditionValue;
      case 'regex':
        return typeof value === 'string' && new RegExp(conditionValue).test(value);
      default:
        return false;
    }
  }

  private passesRollout(percentage: number, userId: UserId): boolean {
    if (percentage >= 100) return true;
    if (percentage <= 0) return false;

    // Deterministic rollout based on user ID hash
    const hash = this.hashString(userId, 42);
    const userPercentile = (hash % 10000) / 100; // 0-99.99
    return userPercentile < percentage;
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

  private validateFlagData(flagData: Partial<FeatureFlag>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!flagData.name || flagData.name.trim().length === 0) {
      errors.push('Flag name is required');
    }

    if (!flagData.key || flagData.key.trim().length === 0) {
      errors.push('Flag key is required');
    } else if (!/^[a-zA-Z0-9_-]+$/.test(flagData.key)) {
      errors.push('Flag key can only contain letters, numbers, underscores, and hyphens');
    }

    if (flagData.rolloutPercentage !== undefined) {
      if (flagData.rolloutPercentage < 0 || flagData.rolloutPercentage > 100) {
        errors.push('Rollout percentage must be between 0 and 100');
      }
    }

    if (flagData.variants) {
      const totalAllocation = flagData.variants.reduce((sum, v) => sum + v.allocation, 0);
      if (Math.abs(totalAllocation - 100) > 0.01) {
        errors.push(`Total variant allocation must equal 100%, got ${totalAllocation}%`);
      }
    }

    if (flagData.rules) {
      for (const rule of flagData.rules) {
        if (rule.rolloutPercentage < 0 || rule.rolloutPercentage > 100) {
          errors.push(`Rule rollout percentage must be between 0 and 100`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private applyFilters(flags: FeatureFlag[], filter: FeatureFlagFilter): FeatureFlag[] {
    return flags.filter(flag => {
      if (filter.enabled !== undefined && flag.enabled !== filter.enabled) {
        return false;
      }

      if (filter.environment && !filter.environment.some(env => flag.environments.includes(env))) {
        return false;
      }

      if (filter.targetType && !filter.targetType.includes(flag.targetType)) {
        return false;
      }

      if (filter.tags && filter.tags.length > 0) {
        const flagTags = flag.metadata?.tags || [];
        if (!filter.tags.some(tag => flagTags.includes(tag))) {
          return false;
        }
      }

      return true;
    });
  }

  private getCacheKey(
    flagKey: string,
    userId: UserId,
    agentId?: AgentId,
    context?: Record<string, any>
  ): string {
    const contextString = context ? JSON.stringify(context) : '';
    return `${flagKey}:${userId}:${agentId || ''}:${contextString}`;
  }

  private getCachedEvaluation(cacheKey: string): FeatureFlagEvaluation | null {
    const expiry = this.cacheExpiry.get(cacheKey);
    if (expiry && Date.now() < expiry) {
      return this.evaluationCache.get(cacheKey) || null;
    }
    return null;
  }

  private cacheEvaluation(cacheKey: string, evaluation: FeatureFlagEvaluation): void {
    // Implement LRU cache eviction if cache is full
    if (this.evaluationCache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.evaluationCache.keys().next().value;
      this.evaluationCache.delete(oldestKey);
      this.cacheExpiry.delete(oldestKey);
    }

    this.evaluationCache.set(cacheKey, evaluation);
    this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);
  }

  private clearFlagCache(flagKey: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.evaluationCache.keys()) {
      if (key.startsWith(flagKey + ':')) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.evaluationCache.delete(key);
      this.cacheExpiry.delete(key);
    }
  }

  private generateUUID(): UUID {
    return 'flag_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
  }

  /**
   * Clear all caches (useful for testing)
   */
  clearCache(): void {
    this.evaluationCache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
  } {
    return {
      size: this.evaluationCache.size,
      maxSize: this.MAX_CACHE_SIZE,
      hitRate: 0 // Would track in real implementation
    };
  }
}

export default FeatureFlagManager;