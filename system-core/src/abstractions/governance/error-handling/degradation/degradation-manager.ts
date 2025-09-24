/**
 * TrustStream v4.2 - Graceful Degradation Manager
 * Advanced degradation system with adaptive feature management
 */

import {
  IDegradationManager,
  DegradationLevel,
  FallbackStrategy,
  TriggerCondition,
  ErrorContext,
  ErrorSeverity
} from '../core/interfaces';
import { Logger } from '../../../shared-utils/logger';
import { DatabaseInterface } from '../../../shared-utils/database-interface';
import { EventEmitter } from 'events';

/**
 * Comprehensive graceful degradation manager
 */
export class DegradationManager extends EventEmitter implements IDegradationManager {
  private db: DatabaseInterface;
  private logger: Logger;
  private currentLevel: DegradationLevel;
  private degradationLevels: Map<number, DegradationLevel> = new Map();
  private fallbackStrategies: Map<string, FallbackStrategy> = new Map();
  private featureStates: Map<string, FeatureState> = new Map();
  private metricsCollector: DegradationMetricsCollector;
  private adaptiveController: AdaptiveDegradationController;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(
    db: DatabaseInterface,
    logger: Logger
  ) {
    super();
    this.db = db;
    this.logger = logger;
    this.metricsCollector = new DegradationMetricsCollector();
    this.adaptiveController = new AdaptiveDegradationController(logger);
    
    this.initializeDegradationLevels();
    this.initializeFallbackStrategies();
    this.currentLevel = this.degradationLevels.get(0)!; // Start at full service
    
    this.startMonitoring();
  }

  /**
   * Get current degradation level
   */
  getCurrentLevel(): DegradationLevel {
    return { ...this.currentLevel };
  }

  /**
   * Escalate degradation based on trigger conditions
   */
  async escalateDegradation(trigger: TriggerCondition): Promise<void> {
    this.logger.warn('Escalating degradation', {
      current_level: this.currentLevel.level,
      trigger_metric: trigger.metric,
      trigger_threshold: trigger.threshold
    });

    try {
      // Determine target degradation level
      const targetLevel = await this.determineTargetLevel(trigger);
      
      if (targetLevel.level <= this.currentLevel.level) {
        this.logger.debug('No escalation needed', {
          current_level: this.currentLevel.level,
          target_level: targetLevel.level
        });
        return;
      }

      // Apply degradation
      await this.applyDegradationLevel(targetLevel);
      
      // Record degradation event
      await this.recordDegradationEvent('escalated', targetLevel, trigger);
      
      this.emit('degradation_escalated', {
        from_level: this.currentLevel.level,
        to_level: targetLevel.level,
        trigger
      });

    } catch (error) {
      this.logger.error('Failed to escalate degradation', {
        error: error.message,
        trigger
      });
      throw error;
    }
  }

  /**
   * Recover from degradation
   */
  async recoverDegradation(): Promise<void> {
    this.logger.info('Attempting degradation recovery', {
      current_level: this.currentLevel.level
    });

    try {
      // Check if recovery conditions are met
      const canRecover = await this.checkRecoveryConditions();
      
      if (!canRecover.allowed) {
        this.logger.debug('Recovery conditions not met', {
          reasons: canRecover.reasons
        });
        return;
      }

      // Determine target recovery level
      const targetLevel = await this.determineRecoveryLevel();
      
      if (targetLevel.level >= this.currentLevel.level) {
        this.logger.debug('No recovery needed', {
          current_level: this.currentLevel.level,
          target_level: targetLevel.level
        });
        return;
      }

      // Apply recovery
      await this.applyDegradationLevel(targetLevel);
      
      // Record recovery event
      await this.recordDegradationEvent('recovered', targetLevel);
      
      this.emit('degradation_recovered', {
        from_level: this.currentLevel.level,
        to_level: targetLevel.level
      });

    } catch (error) {
      this.logger.error('Failed to recover from degradation', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Check if a feature is enabled at current degradation level
   */
  isFeatureEnabled(feature: string): boolean {
    const featureState = this.featureStates.get(feature);
    
    if (!featureState) {
      // Default to enabled if feature not explicitly managed
      return true;
    }
    
    return featureState.enabled && 
           this.currentLevel.enabled_features.includes(feature);
  }

  /**
   * Get available fallback strategies for a feature
   */
  getAvailableFallbacks(feature: string): FallbackStrategy[] {
    const allStrategies = Array.from(this.fallbackStrategies.values());
    
    return allStrategies.filter(strategy => {
      // Check if strategy is applicable to current conditions
      return strategy.trigger_conditions.some(condition => 
        this.evaluateTriggerCondition(condition)
      );
    }).sort((a, b) => b.quality_score - a.quality_score); // Sort by quality
  }

  /**
   * Apply a specific degradation level
   */
  private async applyDegradationLevel(level: DegradationLevel): Promise<void> {
    this.logger.info(`Applying degradation level: ${level.level} (${level.name})`, {
      description: level.description,
      enabled_features: level.enabled_features.length,
      disabled_features: level.disabled_features.length
    });

    const previousLevel = this.currentLevel;
    this.currentLevel = level;

    // Update feature states
    await this.updateFeatureStates(level);
    
    // Apply performance limits
    await this.applyPerformanceLimits(level.performance_limits);
    
    // Activate fallback strategies
    await this.activateFallbackStrategies(level);
    
    // Update metrics
    this.metricsCollector.recordLevelChange(previousLevel, level);
    
    this.logger.info(`Degradation level applied successfully: ${level.level}`);
  }

  /**
   * Update feature states based on degradation level
   */
  private async updateFeatureStates(level: DegradationLevel): Promise<void> {
    // Enable specified features
    for (const feature of level.enabled_features) {
      this.featureStates.set(feature, {
        name: feature,
        enabled: true,
        degradation_level: level.level,
        last_updated: new Date(),
        fallback_active: false
      });
    }
    
    // Disable specified features
    for (const feature of level.disabled_features) {
      const currentState = this.featureStates.get(feature);
      this.featureStates.set(feature, {
        name: feature,
        enabled: false,
        degradation_level: level.level,
        last_updated: new Date(),
        fallback_active: currentState?.fallback_active || false
      });
    }
  }

  /**
   * Apply performance limits
   */
  private async applyPerformanceLimits(
    limits: DegradationLevel['performance_limits']
  ): Promise<void> {
    this.logger.debug('Applying performance limits', limits);
    
    // In a real implementation, this would configure:
    // - Request rate limiters
    // - Connection pool sizes
    // - Timeout values
    // - Resource quotas
    
    // Emit event for other components to react
    this.emit('performance_limits_updated', limits);
  }

  /**
   * Activate fallback strategies for the degradation level
   */
  private async activateFallbackStrategies(level: DegradationLevel): Promise<void> {
    for (const strategy of level.fallback_strategies) {
      try {
        await this.activateFallbackStrategy(strategy);
      } catch (error) {
        this.logger.error('Failed to activate fallback strategy', {
          strategy_id: strategy.strategy_id,
          error: error.message
        });
      }
    }
  }

  /**
   * Activate a specific fallback strategy
   */
  private async activateFallbackStrategy(strategy: FallbackStrategy): Promise<void> {
    this.logger.debug(`Activating fallback strategy: ${strategy.name}`, {
      strategy_id: strategy.strategy_id,
      quality_score: strategy.quality_score
    });

    // Execute fallback action
    switch (strategy.fallback_action.type) {
      case 'fallback_mode':
        await this.enableFallbackMode(strategy);
        break;
        
      case 'load_balancer_redirect':
        await this.configureLoadBalancerRedirect(strategy);
        break;
        
      case 'circuit_breaker_open':
        await this.openCircuitBreaker(strategy);
        break;
        
      default:
        this.logger.warn(`Unknown fallback action type: ${strategy.fallback_action.type}`);
    }
    
    this.emit('fallback_strategy_activated', strategy);
  }

  /**
   * Determine target degradation level based on trigger
   */
  private async determineTargetLevel(trigger: TriggerCondition): Promise<DegradationLevel> {
    // Use adaptive controller to determine optimal level
    const recommendation = await this.adaptiveController.recommendLevel(
      trigger,
      this.currentLevel,
      this.metricsCollector.getRecentMetrics()
    );
    
    const targetLevel = this.degradationLevels.get(recommendation.level);
    
    if (!targetLevel) {
      throw new Error(`Invalid degradation level: ${recommendation.level}`);
    }
    
    return targetLevel;
  }

  /**
   * Determine recovery level
   */
  private async determineRecoveryLevel(): Promise<DegradationLevel> {
    // Gradual recovery - move one level down at a time
    const targetLevelNumber = Math.max(0, this.currentLevel.level - 1);
    
    const targetLevel = this.degradationLevels.get(targetLevelNumber);
    
    if (!targetLevel) {
      throw new Error(`Invalid recovery level: ${targetLevelNumber}`);
    }
    
    return targetLevel;
  }

  /**
   * Check if recovery conditions are met
   */
  private async checkRecoveryConditions(): Promise<RecoveryCheck> {
    const reasons: string[] = [];
    
    // Check if enough time has passed since last degradation
    const timeSinceLastChange = this.metricsCollector.getTimeSinceLastChange();
    const minimumStabilityPeriod = 300000; // 5 minutes
    
    if (timeSinceLastChange < minimumStabilityPeriod) {
      reasons.push('Insufficient stability period');
    }
    
    // Check system health metrics
    const healthMetrics = await this.getSystemHealthMetrics();
    
    if (healthMetrics.error_rate > 0.05) {
      reasons.push('Error rate too high');
    }
    
    if (healthMetrics.response_time > 5000) {
      reasons.push('Response time too high');
    }
    
    if (healthMetrics.cpu_usage > 80) {
      reasons.push('CPU usage too high');
    }
    
    if (healthMetrics.memory_usage > 85) {
      reasons.push('Memory usage too high');
    }
    
    return {
      allowed: reasons.length === 0,
      reasons
    };
  }

  /**
   * Evaluate trigger condition
   */
  private evaluateTriggerCondition(condition: TriggerCondition): boolean {
    // In a real implementation, this would fetch actual metrics
    // For now, simulate based on condition type
    const mockMetricValue = this.getMockMetricValue(condition.metric);
    
    switch (condition.operator) {
      case 'gt': return mockMetricValue > condition.threshold;
      case 'gte': return mockMetricValue >= condition.threshold;
      case 'lt': return mockMetricValue < condition.threshold;
      case 'lte': return mockMetricValue <= condition.threshold;
      case 'eq': return mockMetricValue === condition.threshold;
      case 'contains': return String(mockMetricValue).includes(String(condition.threshold));
      default: return false;
    }
  }

  /**
   * Get mock metric value (replace with actual metric collection)
   */
  private getMockMetricValue(metric: string): number {
    const mockValues: Record<string, number> = {
      'error_rate': 0.02,
      'response_time': 1500,
      'cpu_usage': 65,
      'memory_usage': 70,
      'connection_count': 450,
      'request_rate': 120
    };
    
    return mockValues[metric] || 0;
  }

  /**
   * Get system health metrics
   */
  private async getSystemHealthMetrics(): Promise<SystemHealthMetrics> {
    // In a real implementation, this would collect actual metrics
    return {
      error_rate: this.getMockMetricValue('error_rate'),
      response_time: this.getMockMetricValue('response_time'),
      cpu_usage: this.getMockMetricValue('cpu_usage'),
      memory_usage: this.getMockMetricValue('memory_usage'),
      connection_count: this.getMockMetricValue('connection_count'),
      request_rate: this.getMockMetricValue('request_rate')
    };
  }

  /**
   * Record degradation event
   */
  private async recordDegradationEvent(
    event_type: 'escalated' | 'recovered',
    level: DegradationLevel,
    trigger?: TriggerCondition
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO degradation_events (
          event_id, event_type, degradation_level, level_name,
          trigger_data, created_at
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
      `;
      
      const params = [
        event_type,
        level.level,
        level.name,
        trigger ? JSON.stringify(trigger) : null
      ];
      
      await this.db.query(query, params);
      
    } catch (dbError) {
      this.logger.warn('Failed to record degradation event', {
        error: dbError.message
      });
    }
  }

  /**
   * Start monitoring for automatic degradation management
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performAutomaticAssessment();
      } catch (error) {
        this.logger.error('Automatic degradation assessment failed', {
          error: error.message
        });
      }
    }, 30000); // Check every 30 seconds
    
    this.logger.info('Degradation monitoring started');
  }

  /**
   * Perform automatic assessment of degradation needs
   */
  private async performAutomaticAssessment(): Promise<void> {
    const metrics = await this.getSystemHealthMetrics();
    
    // Check for escalation conditions
    const escalationTriggers = this.checkEscalationTriggers(metrics);
    
    for (const trigger of escalationTriggers) {
      await this.escalateDegradation(trigger);
    }
    
    // Check for recovery opportunities
    if (this.currentLevel.level > 0) {
      await this.recoverDegradation();
    }
  }

  /**
   * Check for escalation triggers
   */
  private checkEscalationTriggers(metrics: SystemHealthMetrics): TriggerCondition[] {
    const triggers: TriggerCondition[] = [];
    
    // Error rate trigger
    if (metrics.error_rate > 0.1) {
      triggers.push({
        metric: 'error_rate',
        operator: 'gt',
        threshold: 0.1,
        window_size_ms: 60000
      });
    }
    
    // Response time trigger
    if (metrics.response_time > 10000) {
      triggers.push({
        metric: 'response_time',
        operator: 'gt',
        threshold: 10000,
        window_size_ms: 60000
      });
    }
    
    // CPU usage trigger
    if (metrics.cpu_usage > 90) {
      triggers.push({
        metric: 'cpu_usage',
        operator: 'gt',
        threshold: 90,
        window_size_ms: 30000
      });
    }
    
    // Memory usage trigger
    if (metrics.memory_usage > 95) {
      triggers.push({
        metric: 'memory_usage',
        operator: 'gt',
        threshold: 95,
        window_size_ms: 30000
      });
    }
    
    return triggers;
  }

  /**
   * Initialize degradation levels
   */
  private initializeDegradationLevels(): void {
    const levels: DegradationLevel[] = [
      {
        level: 0,
        name: 'Full Service',
        description: 'All features enabled, full performance',
        enabled_features: [
          'advanced_analytics',
          'real_time_processing',
          'complex_queries',
          'background_jobs',
          'notifications',
          'reporting',
          'file_uploads',
          'data_export'
        ],
        disabled_features: [],
        performance_limits: {
          max_concurrent_requests: 1000,
          max_request_size: 50 * 1024 * 1024, // 50MB
          timeout_ms: 30000,
          rate_limit_per_minute: 6000
        },
        fallback_strategies: []
      },
      
      {
        level: 1,
        name: 'Minor Degradation',
        description: 'Non-essential features disabled, slight performance reduction',
        enabled_features: [
          'advanced_analytics',
          'real_time_processing',
          'complex_queries',
          'notifications',
          'reporting',
          'file_uploads'
        ],
        disabled_features: [
          'background_jobs',
          'data_export'
        ],
        performance_limits: {
          max_concurrent_requests: 800,
          max_request_size: 25 * 1024 * 1024, // 25MB
          timeout_ms: 20000,
          rate_limit_per_minute: 4800
        },
        fallback_strategies: [
          {
            strategy_id: 'disable_background_jobs',
            name: 'Disable Background Jobs',
            description: 'Suspend non-critical background processing',
            trigger_conditions: [
              {
                metric: 'cpu_usage',
                operator: 'gt',
                threshold: 80,
                window_size_ms: 60000
              }
            ],
            fallback_action: {
              action_id: 'suspend_background_jobs',
              type: 'fallback_mode',
              description: 'Suspend background job processing',
              parameters: { mode: 'suspend_background' },
              timeout_ms: 5000,
              dependencies: []
            },
            quality_score: 0.9,
            estimated_performance_impact: 0.1
          }
        ]
      },
      
      {
        level: 2,
        name: 'Moderate Degradation',
        description: 'Advanced features disabled, performance constraints applied',
        enabled_features: [
          'real_time_processing',
          'notifications',
          'reporting'
        ],
        disabled_features: [
          'advanced_analytics',
          'complex_queries',
          'background_jobs',
          'data_export',
          'file_uploads'
        ],
        performance_limits: {
          max_concurrent_requests: 500,
          max_request_size: 10 * 1024 * 1024, // 10MB
          timeout_ms: 15000,
          rate_limit_per_minute: 3000
        },
        fallback_strategies: [
          {
            strategy_id: 'simple_queries_only',
            name: 'Simple Queries Only',
            description: 'Restrict to simple database queries only',
            trigger_conditions: [
              {
                metric: 'response_time',
                operator: 'gt',
                threshold: 5000,
                window_size_ms: 120000
              }
            ],
            fallback_action: {
              action_id: 'enable_simple_query_mode',
              type: 'fallback_mode',
              description: 'Enable simple query mode',
              parameters: { query_complexity: 'simple' },
              timeout_ms: 3000,
              dependencies: []
            },
            quality_score: 0.7,
            estimated_performance_impact: 0.3
          }
        ]
      },
      
      {
        level: 3,
        name: 'Severe Degradation',
        description: 'Only core features available, significant performance limits',
        enabled_features: [
          'notifications'
        ],
        disabled_features: [
          'advanced_analytics',
          'real_time_processing',
          'complex_queries',
          'background_jobs',
          'reporting',
          'data_export',
          'file_uploads'
        ],
        performance_limits: {
          max_concurrent_requests: 200,
          max_request_size: 1 * 1024 * 1024, // 1MB
          timeout_ms: 10000,
          rate_limit_per_minute: 1200
        },
        fallback_strategies: [
          {
            strategy_id: 'read_only_mode',
            name: 'Read-Only Mode',
            description: 'Allow only read operations',
            trigger_conditions: [
              {
                metric: 'error_rate',
                operator: 'gt',
                threshold: 0.2,
                window_size_ms: 180000
              }
            ],
            fallback_action: {
              action_id: 'enable_read_only_mode',
              type: 'fallback_mode',
              description: 'Enable read-only mode',
              parameters: { mode: 'read_only' },
              timeout_ms: 2000,
              dependencies: []
            },
            quality_score: 0.5,
            estimated_performance_impact: 0.6
          }
        ]
      },
      
      {
        level: 4,
        name: 'Emergency Mode',
        description: 'Minimal functionality, survival mode',
        enabled_features: [],
        disabled_features: [
          'advanced_analytics',
          'real_time_processing',
          'complex_queries',
          'background_jobs',
          'notifications',
          'reporting',
          'data_export',
          'file_uploads'
        ],
        performance_limits: {
          max_concurrent_requests: 50,
          max_request_size: 256 * 1024, // 256KB
          timeout_ms: 5000,
          rate_limit_per_minute: 300
        },
        fallback_strategies: [
          {
            strategy_id: 'static_response_mode',
            name: 'Static Response Mode',
            description: 'Return cached/static responses only',
            trigger_conditions: [
              {
                metric: 'cpu_usage',
                operator: 'gt',
                threshold: 95,
                window_size_ms: 60000
              }
            ],
            fallback_action: {
              action_id: 'enable_static_mode',
              type: 'fallback_mode',
              description: 'Enable static response mode',
              parameters: { mode: 'static_only' },
              timeout_ms: 1000,
              dependencies: []
            },
            quality_score: 0.2,
            estimated_performance_impact: 0.9
          }
        ]
      }
    ];

    levels.forEach(level => {
      this.degradationLevels.set(level.level, level);
    });

    this.logger.info(`Initialized ${levels.length} degradation levels`);
  }

  /**
   * Initialize fallback strategies
   */
  private initializeFallbackStrategies(): void {
    const strategies: FallbackStrategy[] = [
      {
        strategy_id: 'cache_fallback',
        name: 'Cache Fallback',
        description: 'Serve cached responses when database is unavailable',
        trigger_conditions: [
          {
            metric: 'database_error_rate',
            operator: 'gt',
            threshold: 0.5,
            window_size_ms: 30000
          }
        ],
        fallback_action: {
          action_id: 'enable_cache_fallback',
          type: 'fallback_mode',
          description: 'Enable cache-only mode',
          parameters: { cache_type: 'redis', ttl: 300 },
          timeout_ms: 2000,
          dependencies: []
        },
        quality_score: 0.8,
        estimated_performance_impact: 0.2
      },
      
      {
        strategy_id: 'circuit_breaker_fallback',
        name: 'Circuit Breaker Fallback',
        description: 'Open circuit breakers to prevent cascade failures',
        trigger_conditions: [
          {
            metric: 'downstream_error_rate',
            operator: 'gt',
            threshold: 0.3,
            window_size_ms: 60000
          }
        ],
        fallback_action: {
          action_id: 'activate_circuit_breakers',
          type: 'circuit_breaker_open',
          description: 'Open circuit breakers for failing services',
          parameters: { timeout: 30000 },
          timeout_ms: 5000,
          dependencies: []
        },
        quality_score: 0.9,
        estimated_performance_impact: 0.1
      }
    ];

    strategies.forEach(strategy => {
      this.fallbackStrategies.set(strategy.strategy_id, strategy);
    });

    this.logger.info(`Initialized ${strategies.length} fallback strategies`);
  }

  // Simulation methods for fallback actions
  private async enableFallbackMode(strategy: FallbackStrategy): Promise<void> {
    this.logger.info(`Enabling fallback mode: ${strategy.name}`);
    // Simulate enabling fallback mode
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async configureLoadBalancerRedirect(strategy: FallbackStrategy): Promise<void> {
    this.logger.info(`Configuring load balancer redirect: ${strategy.name}`);
    // Simulate load balancer configuration
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  private async openCircuitBreaker(strategy: FallbackStrategy): Promise<void> {
    this.logger.info(`Opening circuit breaker: ${strategy.name}`);
    // Simulate circuit breaker opening
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.removeAllListeners();
    this.logger.info('Degradation manager destroyed');
  }
}

/**
 * Metrics collector for degradation management
 */
class DegradationMetricsCollector {
  private levelChanges: LevelChangeRecord[] = [];
  private lastChangeTime: Date | null = null;

  /**
   * Record level change
   */
  recordLevelChange(from: DegradationLevel, to: DegradationLevel): void {
    const record: LevelChangeRecord = {
      timestamp: new Date(),
      from_level: from.level,
      to_level: to.level,
      direction: to.level > from.level ? 'escalation' : 'recovery'
    };
    
    this.levelChanges.push(record);
    this.lastChangeTime = record.timestamp;
    
    // Maintain sliding window
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    this.levelChanges = this.levelChanges.filter(
      record => record.timestamp.getTime() > cutoffTime
    );
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(): DegradationMetrics {
    const recentChanges = this.levelChanges.slice(-10); // Last 10 changes
    
    return {
      total_changes: this.levelChanges.length,
      recent_changes: recentChanges.length,
      escalations: recentChanges.filter(c => c.direction === 'escalation').length,
      recoveries: recentChanges.filter(c => c.direction === 'recovery').length,
      last_change_time: this.lastChangeTime,
      change_frequency: this.calculateChangeFrequency()
    };
  }

  /**
   * Get time since last change
   */
  getTimeSinceLastChange(): number {
    if (!this.lastChangeTime) {
      return Infinity;
    }
    
    return Date.now() - this.lastChangeTime.getTime();
  }

  /**
   * Calculate change frequency (changes per hour)
   */
  private calculateChangeFrequency(): number {
    if (this.levelChanges.length < 2) {
      return 0;
    }
    
    const firstChange = this.levelChanges[0];
    const lastChange = this.levelChanges[this.levelChanges.length - 1];
    
    const timeSpanHours = (
      lastChange.timestamp.getTime() - firstChange.timestamp.getTime()
    ) / (60 * 60 * 1000);
    
    return timeSpanHours > 0 ? this.levelChanges.length / timeSpanHours : 0;
  }
}

/**
 * Adaptive degradation controller
 */
class AdaptiveDegradationController {
  private logger: Logger;
  private learningData: LearningDataPoint[] = [];

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Recommend optimal degradation level
   */
  async recommendLevel(
    trigger: TriggerCondition,
    currentLevel: DegradationLevel,
    metrics: DegradationMetrics
  ): Promise<LevelRecommendation> {
    // Simple heuristic-based recommendation
    let recommendedLevel = currentLevel.level;
    
    // Escalate based on trigger severity
    if (trigger.metric === 'error_rate' && trigger.threshold > 0.2) {
      recommendedLevel = Math.min(4, currentLevel.level + 2);
    } else if (trigger.metric === 'cpu_usage' && trigger.threshold > 95) {
      recommendedLevel = Math.min(4, currentLevel.level + 2);
    } else if (trigger.metric === 'memory_usage' && trigger.threshold > 95) {
      recommendedLevel = Math.min(4, currentLevel.level + 2);
    } else {
      recommendedLevel = Math.min(4, currentLevel.level + 1);
    }
    
    // Consider change frequency - be more conservative if changing frequently
    if (metrics.change_frequency > 5) { // More than 5 changes per hour
      recommendedLevel = Math.min(recommendedLevel, currentLevel.level + 1);
    }
    
    return {
      level: recommendedLevel,
      confidence: 0.8,
      reasoning: `Escalating due to ${trigger.metric} threshold exceeded`
    };
  }

  /**
   * Learn from degradation outcomes
   */
  learnFromOutcome(
    trigger: TriggerCondition,
    chosenLevel: number,
    outcome: 'success' | 'failure',
    effectivenessScore: number
  ): void {
    const dataPoint: LearningDataPoint = {
      timestamp: new Date(),
      trigger,
      chosen_level: chosenLevel,
      outcome,
      effectiveness_score: effectivenessScore
    };
    
    this.learningData.push(dataPoint);
    
    // Maintain sliding window
    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    this.learningData = this.learningData.filter(
      point => point.timestamp.getTime() > cutoffTime
    );
  }
}

// Supporting interfaces and types
interface FeatureState {
  name: string;
  enabled: boolean;
  degradation_level: number;
  last_updated: Date;
  fallback_active: boolean;
}

interface RecoveryCheck {
  allowed: boolean;
  reasons: string[];
}

interface SystemHealthMetrics {
  error_rate: number;
  response_time: number;
  cpu_usage: number;
  memory_usage: number;
  connection_count: number;
  request_rate: number;
}

interface LevelChangeRecord {
  timestamp: Date;
  from_level: number;
  to_level: number;
  direction: 'escalation' | 'recovery';
}

interface DegradationMetrics {
  total_changes: number;
  recent_changes: number;
  escalations: number;
  recoveries: number;
  last_change_time: Date | null;
  change_frequency: number;
}

interface LevelRecommendation {
  level: number;
  confidence: number;
  reasoning: string;
}

interface LearningDataPoint {
  timestamp: Date;
  trigger: TriggerCondition;
  chosen_level: number;
  outcome: 'success' | 'failure';
  effectiveness_score: number;
}