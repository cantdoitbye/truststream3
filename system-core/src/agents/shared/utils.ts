/**
 * Shared utilities for governance agents
 */

import { 
  GovernanceTask, 
  TaskResult, 
  AgentMetrics, 
  HealthCheckResult, 
  AgentEvent, 
  AgentStatus,
  TaskPriority,
  AgentEventType 
} from './types';

/**
 * Utility functions for task management
 */
export class TaskUtils {
  static generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateEventId(): string {
    return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static isTaskExpired(task: GovernanceTask): boolean {
    if (!task.deadline) return false;
    return new Date() > task.deadline;
  }

  static calculateTaskPriorityScore(priority: TaskPriority): number {
    const priorityScores = {
      'low': 1,
      'medium': 2,
      'high': 3,
      'critical': 4,
      'emergency': 5
    };
    return priorityScores[priority] || 1;
  }

  static shouldAcceptTask(
    task: GovernanceTask,
    agentCapabilities: string[],
    currentLoad: number,
    maxLoad: number
  ): boolean {
    // Check if agent has required capabilities
    if (task.requirements?.requiredCapabilities) {
      const hasRequiredCapabilities = task.requirements.requiredCapabilities.every(
        capability => agentCapabilities.includes(capability)
      );
      if (!hasRequiredCapabilities) return false;
    }

    // Check if agent has capacity
    if (currentLoad >= maxLoad) return false;

    // Check if task is not expired
    if (this.isTaskExpired(task)) return false;

    return true;
  }

  static estimateTaskExecutionTime(
    task: GovernanceTask,
    agentPerformanceScore: number
  ): number {
    // Base estimation algorithm - can be enhanced with machine learning
    const baseTime = task.requirements?.maxExecutionTime || 300000; // 5 minutes default
    const performanceFactor = Math.max(0.1, agentPerformanceScore / 100);
    return Math.round(baseTime / performanceFactor);
  }
}

/**
 * Utility functions for metrics calculation
 */
export class MetricsUtils {
  static calculateHealthScore(checks: {
    orchestratorConnection: boolean;
    databaseConnection: boolean;
    memoryUsage: boolean;
    cpuUsage: boolean;
    taskQueueHealth: boolean;
  }): number {
    const weights = {
      orchestratorConnection: 0.3,
      databaseConnection: 0.3,
      memoryUsage: 0.15,
      cpuUsage: 0.15,
      taskQueueHealth: 0.1
    };

    let score = 0;
    Object.entries(checks).forEach(([check, status]) => {
      if (status) {
        score += weights[check as keyof typeof weights] * 100;
      }
    });

    return Math.round(score);
  }

  static calculatePerformanceScore(
    completedTasks: number,
    failedTasks: number,
    averageResponseTime: number,
    targetResponseTime: number = 5000
  ): number {
    if (completedTasks === 0) return 50; // Default score for new agents

    const successRate = completedTasks / (completedTasks + failedTasks);
    const responseTimeScore = Math.max(0, 1 - (averageResponseTime / targetResponseTime));
    
    const performanceScore = (successRate * 0.7 + responseTimeScore * 0.3) * 100;
    return Math.round(Math.min(100, Math.max(0, performanceScore)));
  }

  static calculateTrustScore(
    performanceScore: number,
    consistencyScore: number,
    securityScore: number = 100
  ): number {
    const trustScore = (performanceScore * 0.4 + consistencyScore * 0.4 + securityScore * 0.2);
    return Math.round(Math.min(100, Math.max(0, trustScore)));
  }

  static calculateConsistencyScore(
    recentPerformanceScores: number[]
  ): number {
    if (recentPerformanceScores.length < 2) return 100;

    const mean = recentPerformanceScores.reduce((sum, score) => sum + score, 0) / recentPerformanceScores.length;
    const variance = recentPerformanceScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / recentPerformanceScores.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Lower standard deviation = higher consistency
    const consistencyScore = Math.max(0, 100 - (standardDeviation * 2));
    return Math.round(consistencyScore);
  }
}

/**
 * Utility functions for event handling
 */
export class EventUtils {
  static createEvent(
    sourceAgentId: string,
    eventType: AgentEventType,
    payload: any,
    targetAgentId?: string,
    priority: TaskPriority = 'medium'
  ): AgentEvent {
    return {
      eventId: TaskUtils.generateEventId(),
      eventType,
      sourceAgentId,
      targetAgentId,
      timestamp: new Date(),
      payload,
      priority,
      metadata: {
        createdAt: new Date().toISOString()
      }
    };
  }

  static isEventRelevant(
    event: AgentEvent,
    agentId: string,
    subscribedEventTypes: Set<AgentEventType>
  ): boolean {
    // Check if agent is subscribed to this event type
    if (!subscribedEventTypes.has(event.eventType)) return false;

    // Check if event is targeted at this agent or is a broadcast
    if (event.targetAgentId && event.targetAgentId !== agentId) return false;

    // Check if event is not from this agent (avoid self-events unless intended)
    if (event.sourceAgentId === agentId && !event.targetAgentId) return false;

    return true;
  }

  static prioritizeEvents(events: AgentEvent[]): AgentEvent[] {
    return events.sort((a, b) => {
      const priorityDiff = TaskUtils.calculateTaskPriorityScore(b.priority) - TaskUtils.calculateTaskPriorityScore(a.priority);
      if (priorityDiff !== 0) return priorityDiff;
      
      // If priorities are equal, sort by timestamp (newer first)
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  }
}

/**
 * Utility functions for agent status management
 */
export class StatusUtils {
  static canTransitionTo(currentStatus: AgentStatus, newStatus: AgentStatus): boolean {
    const validTransitions: Record<AgentStatus, AgentStatus[]> = {
      'initializing': ['active', 'error'],
      'active': ['busy', 'degraded', 'maintenance', 'offline'],
      'busy': ['active', 'degraded', 'error'],
      'degraded': ['active', 'maintenance', 'offline', 'error'],
      'offline': ['initializing', 'maintenance'],
      'error': ['initializing', 'offline'],
      'maintenance': ['active', 'offline']
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  static getStatusPriority(status: AgentStatus): number {
    const priorities = {
      'error': 5,
      'offline': 4,
      'maintenance': 3,
      'degraded': 2,
      'busy': 1,
      'active': 0,
      'initializing': 1
    };
    return priorities[status] || 0;
  }

  static isOperational(status: AgentStatus): boolean {
    return ['active', 'busy'].includes(status);
  }
}

/**
 * Utility functions for configuration management
 */
export class ConfigUtils {
  static validateConfig(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.agentId || typeof config.agentId !== 'string') {
      errors.push('agentId is required and must be a string');
    }

    if (!config.agentType || typeof config.agentType !== 'string') {
      errors.push('agentType is required and must be a string');
    }

    if (!Array.isArray(config.capabilities)) {
      errors.push('capabilities must be an array');
    }

    if (config.maxConcurrentTasks && (typeof config.maxConcurrentTasks !== 'number' || config.maxConcurrentTasks < 1)) {
      errors.push('maxConcurrentTasks must be a positive number');
    }

    if (config.performanceThreshold && (typeof config.performanceThreshold !== 'number' || config.performanceThreshold < 0 || config.performanceThreshold > 100)) {
      errors.push('performanceThreshold must be a number between 0 and 100');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static mergeConfigs(baseConfig: any, overrideConfig: any): any {
    const merged = { ...baseConfig };

    Object.keys(overrideConfig).forEach(key => {
      if (overrideConfig[key] !== undefined) {
        if (typeof overrideConfig[key] === 'object' && !Array.isArray(overrideConfig[key]) && overrideConfig[key] !== null) {
          merged[key] = { ...merged[key], ...overrideConfig[key] };
        } else {
          merged[key] = overrideConfig[key];
        }
      }
    });

    return merged;
  }
}

/**
 * Utility functions for retry logic
 */
export class RetryUtils {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    exponentialBackoff: boolean = true
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries) {
          throw lastError;
        }

        const delay = exponentialBackoff 
          ? baseDelay * Math.pow(2, attempt)
          : baseDelay;

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  static createRetryableFunction<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    exponentialBackoff: boolean = true
  ): T {
    return ((...args: Parameters<T>) => {
      return this.withRetry(
        () => fn(...args),
        maxRetries,
        baseDelay,
        exponentialBackoff
      );
    }) as T;
  }
}

/**
 * Utility functions for data validation
 */
export class ValidationUtils {
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  static isValidAgentId(agentId: string): boolean {
    // Agent IDs should be alphanumeric with hyphens, between 3-50 characters
    const agentIdRegex = /^[a-zA-Z0-9\-]{3,50}$/;
    return agentIdRegex.test(agentId);
  }

  static sanitizeString(input: string, maxLength: number = 1000): string {
    return input.trim().substring(0, maxLength);
  }

  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Utility functions for performance monitoring
 */
export class PerformanceUtils {
  private static performanceMarks = new Map<string, number>();

  static startTiming(label: string): void {
    this.performanceMarks.set(label, performance.now());
  }

  static endTiming(label: string): number {
    const startTime = this.performanceMarks.get(label);
    if (!startTime) {
      throw new Error(`No performance mark found for label: ${label}`);
    }

    const duration = performance.now() - startTime;
    this.performanceMarks.delete(label);
    return duration;
  }

  static async timeAsync<T>(label: string, operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
    this.startTiming(label);
    try {
      const result = await operation();
      const duration = this.endTiming(label);
      return { result, duration };
    } catch (error) {
      this.endTiming(label);
      throw error;
    }
  }

  static formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${Math.round(milliseconds)}ms`;
    } else if (milliseconds < 60000) {
      return `${(milliseconds / 1000).toFixed(2)}s`;
    } else {
      const minutes = Math.floor(milliseconds / 60000);
      const seconds = ((milliseconds % 60000) / 1000).toFixed(2);
      return `${minutes}m ${seconds}s`;
    }
  }
}

// Export all utilities
export {
  TaskUtils,
  MetricsUtils,
  EventUtils,
  StatusUtils,
  ConfigUtils,
  RetryUtils,
  ValidationUtils,
  PerformanceUtils
};
