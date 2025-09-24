/**
 * Performance Optimizer Component
 * 
 * Intelligent performance optimization with automated tuning, resource management,
 * and proactive scaling for governance agent ecosystems.
 */

import { EventEmitter } from 'events';
import {
  HealthMetrics,
  PerformanceMetrics,
  ResourceMetrics,
  AnalyticsRecommendation,
  TrendDirection
} from '../interfaces';

interface OptimizationProfile {
  agentId: string;
  profileType: 'balanced' | 'performance' | 'efficiency' | 'stability';
  parameters: {
    cpuThreshold: number;
    memoryThreshold: number;
    responseTimeTarget: number;
    throughputTarget: number;
    errorRateLimit: number;
  };
  constraints: {
    maxCpuUsage: number;
    maxMemoryUsage: number;
    maxCost: number;
    minAvailability: number;
  };
}

interface OptimizationAction {
  actionId: string;
  type: 'scale_up' | 'scale_down' | 'tune_parameters' | 'restart_component' | 'cache_optimization';
  target: string;
  parameters: Record<string, any>;
  expectedImpact: {
    performance: number;  // -1 to 1
    cost: number;        // -1 to 1  
    stability: number;   // -1 to 1
  };
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  rollbackProcedure?: string;
}

interface OptimizationResult {
  actionId: string;
  success: boolean;
  executionTime: number;
  beforeMetrics: PerformanceMetrics;
  afterMetrics?: PerformanceMetrics;
  actualImpact?: {
    performance: number;
    cost: number;
    stability: number;
  };
  error?: string;
}

interface ResourcePrediction {
  metric: string;
  timeHorizon: string;
  currentUsage: number;
  predictedUsage: number;
  threshold: number;
  actionNeeded: boolean;
  recommendedAction?: OptimizationAction;
}

export class PerformanceOptimizer extends EventEmitter {
  private isRunning: boolean = false;
  private optimizationProfiles: Map<string, OptimizationProfile> = new Map();
  private activeOptimizations: Map<string, OptimizationAction> = new Map();
  private optimizationHistory: Map<string, OptimizationResult[]> = new Map();
  
  // Configuration
  private config = {
    optimizationInterval: 300000, // 5 minutes
    evaluationWindow: 3600000,    // 1 hour
    maxConcurrentOptimizations: 3,
    minDataPoints: 20,
    coolingPeriod: 900000,        // 15 minutes between optimizations
    emergencyThresholds: {
      cpu: 95,
      memory: 95,
      responseTime: 10000,        // 10 seconds
      errorRate: 50               // 50%
    }
  };
  
  // Monitoring intervals
  private optimizationInterval?: NodeJS.Timeout;
  private predictionInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.initializeDefaultProfiles();
  }

  // ===== LIFECYCLE METHODS =====

  async start(): Promise<void> {
    if (this.isRunning) return;
    
    console.log(`[${new Date().toISOString()}] Starting PerformanceOptimizer`);
    
    this.startOptimizationLoops();
    
    this.isRunning = true;
    this.emit('optimizer:started', { timestamp: new Date() });
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;
    
    console.log(`[${new Date().toISOString()}] Stopping PerformanceOptimizer`);
    
    this.stopOptimizationLoops();
    
    // Complete any active optimizations
    await this.completeActiveOptimizations();
    
    this.isRunning = false;
    this.emit('optimizer:stopped', { timestamp: new Date() });
  }

  // ===== OPTIMIZATION ANALYSIS =====

  async analyzePerformance(
    agentId: string,
    metrics: HealthMetrics[],
    timeWindow: number = this.config.evaluationWindow
  ): Promise<AnalyticsRecommendation[]> {
    if (metrics.length < this.config.minDataPoints) {
      return [];
    }
    
    const recommendations: AnalyticsRecommendation[] = [];
    const profile = this.optimizationProfiles.get(agentId);
    
    if (!profile) {
      console.warn(`No optimization profile found for agent ${agentId}`);
      return [];
    }
    
    // Analyze current performance state
    const currentMetrics = metrics[metrics.length - 1];
    const performanceAnalysis = this.analyzePerformanceMetrics(currentMetrics.performance, profile);
    const resourceAnalysis = this.analyzeResourceMetrics(currentMetrics.resource, profile);
    
    // Generate optimization recommendations
    recommendations.push(
      ...await this.generatePerformanceRecommendations(agentId, performanceAnalysis, metrics),
      ...await this.generateResourceRecommendations(agentId, resourceAnalysis, metrics),
      ...await this.generateScalingRecommendations(agentId, metrics, profile)
    );
    
    // Check for emergency optimizations
    const emergencyRecommendations = await this.checkEmergencyOptimizations(agentId, currentMetrics);
    recommendations.push(...emergencyRecommendations);
    
    // Sort by priority and impact
    return this.prioritizeRecommendations(recommendations);
  }

  async predictResourceNeeds(
    agentId: string,
    metrics: HealthMetrics[],
    horizons: string[] = ['1h', '6h', '24h']
  ): Promise<ResourcePrediction[]> {
    const predictions: ResourcePrediction[] = [];
    
    for (const horizon of horizons) {
      // Predict CPU usage
      const cpuValues = metrics.map(m => m.resource.cpu.percentage);
      const cpuPrediction = this.predictMetricValue(cpuValues, horizon);
      
      predictions.push({
        metric: 'cpu_usage',
        timeHorizon: horizon,
        currentUsage: cpuValues[cpuValues.length - 1],
        predictedUsage: cpuPrediction.value,
        threshold: 80,
        actionNeeded: cpuPrediction.value > 80,
        recommendedAction: cpuPrediction.value > 80 ? 
          await this.generateScalingAction(agentId, 'cpu', cpuPrediction.value) : undefined
      });
      
      // Predict memory usage
      const memoryValues = metrics.map(m => m.resource.memory.percentage);
      const memoryPrediction = this.predictMetricValue(memoryValues, horizon);
      
      predictions.push({
        metric: 'memory_usage',
        timeHorizon: horizon,
        currentUsage: memoryValues[memoryValues.length - 1],
        predictedUsage: memoryPrediction.value,
        threshold: 85,
        actionNeeded: memoryPrediction.value > 85,
        recommendedAction: memoryPrediction.value > 85 ? 
          await this.generateScalingAction(agentId, 'memory', memoryPrediction.value) : undefined
      });
    }
    
    return predictions;
  }

  // ===== OPTIMIZATION EXECUTION =====

  async executeOptimization(
    agentId: string,
    action: OptimizationAction
  ): Promise<OptimizationResult> {
    console.log(`[${new Date().toISOString()}] Executing optimization for agent ${agentId}: ${action.type}`);
    
    // Check if agent is already being optimized
    if (this.activeOptimizations.has(agentId)) {
      throw new Error(`Agent ${agentId} is already being optimized`);
    }
    
    // Check cooling period
    if (!this.canOptimizeAgent(agentId)) {
      throw new Error(`Agent ${agentId} is in cooling period`);
    }
    
    const startTime = Date.now();
    this.activeOptimizations.set(agentId, action);
    
    try {
      // Capture before metrics
      const beforeMetrics = await this.capturePerformanceSnapshot(agentId);
      
      // Execute the optimization action
      await this.executeOptimizationAction(agentId, action);
      
      // Wait for metrics stabilization
      await this.waitForStabilization(agentId);
      
      // Capture after metrics
      const afterMetrics = await this.capturePerformanceSnapshot(agentId);
      
      // Calculate actual impact
      const actualImpact = this.calculateActualImpact(beforeMetrics, afterMetrics);
      
      const result: OptimizationResult = {
        actionId: action.actionId,
        success: true,
        executionTime: Date.now() - startTime,
        beforeMetrics,
        afterMetrics,
        actualImpact
      };
      
      // Store result in history
      this.addToOptimizationHistory(agentId, result);
      
      this.emit('optimization:completed', {
        agentId,
        action,
        result,
        timestamp: new Date()
      });
      
      return result;
      
    } catch (error) {
      console.error(`Optimization failed for agent ${agentId}:`, error);
      
      // Attempt rollback if possible
      if (action.rollbackProcedure) {
        try {
          await this.executeRollback(agentId, action.rollbackProcedure);
        } catch (rollbackError) {
          console.error(`Rollback failed for agent ${agentId}:`, rollbackError);
        }
      }
      
      const result: OptimizationResult = {
        actionId: action.actionId,
        success: false,
        executionTime: Date.now() - startTime,
        beforeMetrics: await this.capturePerformanceSnapshot(agentId),
        error: error.message
      };
      
      this.addToOptimizationHistory(agentId, result);
      
      this.emit('optimization:failed', {
        agentId,
        action,
        error: error.message,
        timestamp: new Date()
      });
      
      throw error;
      
    } finally {
      this.activeOptimizations.delete(agentId);
    }
  }

  async autoOptimize(agentId: string, metrics: HealthMetrics[]): Promise<OptimizationResult[]> {
    const recommendations = await this.analyzePerformance(agentId, metrics);
    const results: OptimizationResult[] = [];
    
    // Execute high-priority, low-risk optimizations automatically
    for (const recommendation of recommendations) {
      if (recommendation.priority === 'high' && 
          recommendation.actions.every(a => a.automation)) {
        
        for (const action of recommendation.actions) {
          try {
            const optimizationAction = this.convertToOptimizationAction(action);
            if (optimizationAction.riskLevel === 'low') {
              const result = await this.executeOptimization(agentId, optimizationAction);
              results.push(result);
            }
          } catch (error) {
            console.error(`Auto-optimization failed:`, error);
          }
        }
      }
    }
    
    return results;
  }

  // ===== PRIVATE METHODS =====

  private initializeDefaultProfiles(): void {
    const defaultProfiles: OptimizationProfile[] = [
      {
        agentId: 'default',
        profileType: 'balanced',
        parameters: {
          cpuThreshold: 70,
          memoryThreshold: 75,
          responseTimeTarget: 1000,
          throughputTarget: 100,
          errorRateLimit: 1
        },
        constraints: {
          maxCpuUsage: 90,
          maxMemoryUsage: 90,
          maxCost: 1000,
          minAvailability: 99.5
        }
      },
      {
        agentId: 'performance_optimized',
        profileType: 'performance',
        parameters: {
          cpuThreshold: 60,
          memoryThreshold: 65,
          responseTimeTarget: 500,
          throughputTarget: 200,
          errorRateLimit: 0.5
        },
        constraints: {
          maxCpuUsage: 85,
          maxMemoryUsage: 85,
          maxCost: 2000,
          minAvailability: 99.9
        }
      },
      {
        agentId: 'efficiency_optimized',
        profileType: 'efficiency',
        parameters: {
          cpuThreshold: 80,
          memoryThreshold: 85,
          responseTimeTarget: 2000,
          throughputTarget: 50,
          errorRateLimit: 2
        },
        constraints: {
          maxCpuUsage: 95,
          maxMemoryUsage: 95,
          maxCost: 500,
          minAvailability: 99.0
        }
      }
    ];
    
    defaultProfiles.forEach(profile => {
      this.optimizationProfiles.set(profile.agentId, profile);
    });
  }

  private startOptimizationLoops(): void {
    // Main optimization loop
    this.optimizationInterval = setInterval(async () => {
      await this.performOptimizationCycle();
    }, this.config.optimizationInterval);
    
    // Prediction and analysis loop
    this.predictionInterval = setInterval(async () => {
      await this.performPredictionCycle();
    }, this.config.optimizationInterval * 2); // Less frequent
  }

  private stopOptimizationLoops(): void {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = undefined;
    }
    
    if (this.predictionInterval) {
      clearInterval(this.predictionInterval);
      this.predictionInterval = undefined;
    }
  }

  private analyzePerformanceMetrics(
    performance: PerformanceMetrics,
    profile: OptimizationProfile
  ): any {
    return {
      responseTimeStatus: performance.responseTime.current > profile.parameters.responseTimeTarget ? 'poor' : 'good',
      throughputStatus: performance.throughput.current < profile.parameters.throughputTarget ? 'poor' : 'good',
      errorRateStatus: performance.errorRate.current > profile.parameters.errorRateLimit ? 'poor' : 'good',
      availabilityStatus: performance.availability.current < profile.constraints.minAvailability ? 'poor' : 'good'
    };
  }

  private analyzeResourceMetrics(
    resource: ResourceMetrics,
    profile: OptimizationProfile
  ): any {
    return {
      cpuStatus: resource.cpu.percentage > profile.parameters.cpuThreshold ? 'high' : 'normal',
      memoryStatus: resource.memory.percentage > profile.parameters.memoryThreshold ? 'high' : 'normal',
      diskStatus: resource.disk.percentage > 80 ? 'high' : 'normal'
    };
  }

  private async generatePerformanceRecommendations(
    agentId: string,
    analysis: any,
    metrics: HealthMetrics[]
  ): Promise<AnalyticsRecommendation[]> {
    const recommendations: AnalyticsRecommendation[] = [];
    
    if (analysis.responseTimeStatus === 'poor') {
      recommendations.push({
        recommendationId: this.generateId('rec'),
        type: 'optimization',
        priority: 'high',
        description: 'Response time exceeds target - optimize performance',
        actions: [
          {
            actionId: this.generateId('action'),
            type: 'tune_parameters',
            description: 'Optimize thread pool and connection settings',
            parameters: {
              threadPoolSize: '+20%',
              connectionPoolSize: '+15%',
              timeout: 'reduce'
            },
            automation: true
          }
        ],
        expectedImpact: {
          performance: 0.3,
          stability: 0.1,
          cost: -0.1,
          risk: 0.1
        },
        effort: 'medium'
      });
    }
    
    if (analysis.throughputStatus === 'poor') {
      recommendations.push({
        recommendationId: this.generateId('rec'),
        type: 'scaling',
        priority: 'high',
        description: 'Throughput below target - consider scaling up',
        actions: [
          {
            actionId: this.generateId('action'),
            type: 'scale_up',
            description: 'Increase processing capacity',
            parameters: {
              scaleType: 'horizontal',
              increaseBy: '25%'
            },
            automation: false
          }
        ],
        expectedImpact: {
          performance: 0.4,
          stability: 0.2,
          cost: -0.3,
          risk: 0.2
        },
        effort: 'high'
      });
    }
    
    return recommendations;
  }

  private async generateResourceRecommendations(
    agentId: string,
    analysis: any,
    metrics: HealthMetrics[]
  ): Promise<AnalyticsRecommendation[]> {
    const recommendations: AnalyticsRecommendation[] = [];
    
    if (analysis.cpuStatus === 'high') {
      recommendations.push({
        recommendationId: this.generateId('rec'),
        type: 'optimization',
        priority: 'high',
        description: 'High CPU usage detected - optimize resource utilization',
        actions: [
          {
            actionId: this.generateId('action'),
            type: 'cache_optimization',
            description: 'Optimize caching to reduce CPU load',
            parameters: {
              cacheSize: '+50%',
              cacheTTL: 'optimize',
              algorithm: 'LRU'
            },
            automation: true
          }
        ],
        expectedImpact: {
          performance: 0.2,
          stability: 0.1,
          cost: 0.0,
          risk: 0.1
        },
        effort: 'low'
      });
    }
    
    return recommendations;
  }

  private async generateScalingRecommendations(
    agentId: string,
    metrics: HealthMetrics[],
    profile: OptimizationProfile
  ): Promise<AnalyticsRecommendation[]> {
    const recommendations: AnalyticsRecommendation[] = [];
    
    // Analyze trends to predict scaling needs
    const cpuTrend = this.calculateTrend(metrics.map(m => m.resource.cpu.percentage));
    const memoryTrend = this.calculateTrend(metrics.map(m => m.resource.memory.percentage));
    
    if (cpuTrend === 'up' && metrics[metrics.length - 1].resource.cpu.percentage > 60) {
      recommendations.push({
        recommendationId: this.generateId('rec'),
        type: 'scaling',
        priority: 'medium',
        description: 'CPU usage trending upward - proactive scaling recommended',
        actions: [
          {
            actionId: this.generateId('action'),
            type: 'scale_up',
            description: 'Proactively scale CPU resources',
            parameters: {
              resourceType: 'cpu',
              scaleBy: '15%',
              trigger: 'proactive'
            },
            automation: false
          }
        ],
        expectedImpact: {
          performance: 0.2,
          stability: 0.3,
          cost: -0.2,
          risk: 0.1
        },
        effort: 'medium'
      });
    }
    
    return recommendations;
  }

  private async checkEmergencyOptimizations(
    agentId: string,
    metrics: HealthMetrics
  ): Promise<AnalyticsRecommendation[]> {
    const recommendations: AnalyticsRecommendation[] = [];
    const thresholds = this.config.emergencyThresholds;
    
    // Check for emergency conditions
    if (metrics.resource.cpu.percentage > thresholds.cpu) {
      recommendations.push({
        recommendationId: this.generateId('emergency_rec'),
        type: 'emergency',
        priority: 'urgent',
        description: 'EMERGENCY: Critical CPU usage detected',
        actions: [
          {
            actionId: this.generateId('emergency_action'),
            type: 'restart_component',
            description: 'Emergency restart to clear CPU load',
            parameters: {
              component: 'worker_processes',
              graceful: false
            },
            automation: true
          }
        ],
        expectedImpact: {
          performance: 0.5,
          stability: -0.2,
          cost: 0.0,
          risk: 0.3
        },
        effort: 'low'
      });
    }
    
    return recommendations;
  }

  private prioritizeRecommendations(
    recommendations: AnalyticsRecommendation[]
  ): AnalyticsRecommendation[] {
    const priorityOrder = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 };
    
    return recommendations.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Secondary sort by expected performance impact
      return b.expectedImpact.performance - a.expectedImpact.performance;
    });
  }

  private predictMetricValue(values: number[], horizon: string): { value: number, confidence: number } {
    // Simple trend-based prediction
    const trend = this.calculateTrendValue(values);
    const recent = values.slice(-10);
    const average = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    
    const horizonHours = this.parseTimeHorizon(horizon);
    const predictedValue = average + (trend * horizonHours);
    
    return {
      value: Math.max(0, Math.min(100, predictedValue)),
      confidence: values.length > 20 ? 0.8 : 0.6
    };
  }

  private calculateTrend(values: number[]): TrendDirection {
    if (values.length < 3) return 'stable';
    
    const slope = this.calculateTrendValue(values);
    if (Math.abs(slope) < 0.1) return 'stable';
    return slope > 0 ? 'up' : 'down';
  }

  private calculateTrendValue(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  private parseTimeHorizon(horizon: string): number {
    const value = parseInt(horizon.slice(0, -1));
    const unit = horizon.slice(-1);
    
    switch (unit) {
      case 'h': return value;
      case 'd': return value * 24;
      default: return 1;
    }
  }

  private canOptimizeAgent(agentId: string): boolean {
    const history = this.optimizationHistory.get(agentId) || [];
    if (history.length === 0) return true;
    
    const lastOptimization = history[history.length - 1];
    const timeSince = Date.now() - lastOptimization.executionTime;
    
    return timeSince > this.config.coolingPeriod;
  }

  private async generateScalingAction(
    agentId: string,
    resourceType: string,
    predictedUsage: number
  ): Promise<OptimizationAction> {
    return {
      actionId: this.generateId('scale'),
      type: 'scale_up',
      target: resourceType,
      parameters: {
        resourceType,
        currentUsage: predictedUsage,
        targetUsage: 70,
        scaleBy: '20%'
      },
      expectedImpact: {
        performance: 0.3,
        cost: -0.2,
        stability: 0.2
      },
      confidence: 0.8,
      riskLevel: 'low'
    };
  }

  private convertToOptimizationAction(action: any): OptimizationAction {
    return {
      actionId: action.actionId,
      type: action.type,
      target: action.description,
      parameters: action.parameters,
      expectedImpact: {
        performance: 0.2,
        cost: 0.0,
        stability: 0.1
      },
      confidence: 0.7,
      riskLevel: 'low'
    };
  }

  private addToOptimizationHistory(agentId: string, result: OptimizationResult): void {
    let history = this.optimizationHistory.get(agentId) || [];
    history.push(result);
    
    // Keep only last 50 results
    if (history.length > 50) {
      history = history.slice(-50);
    }
    
    this.optimizationHistory.set(agentId, history);
  }

  private calculateActualImpact(
    before: PerformanceMetrics,
    after: PerformanceMetrics
  ): { performance: number; cost: number; stability: number } {
    const performanceImprovement = 
      (before.responseTime.current - after.responseTime.current) / before.responseTime.current;
    
    return {
      performance: performanceImprovement,
      cost: 0, // Would be calculated based on resource changes
      stability: (after.availability.current - before.availability.current) / 100
    };
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Placeholder implementations for complex operations
  private async completeActiveOptimizations(): Promise<void> {
    // Complete any active optimizations gracefully
  }

  private async performOptimizationCycle(): Promise<void> {
    // Main optimization cycle logic
  }

  private async performPredictionCycle(): Promise<void> {
    // Prediction and analysis cycle logic
  }

  private async capturePerformanceSnapshot(agentId: string): Promise<PerformanceMetrics> {
    // Capture current performance metrics
    return {
      responseTime: { current: 100, average: 120, min: 50, max: 200, trend: 'stable', unit: 'ms', timestamp: new Date() },
      throughput: { current: 150, average: 140, min: 100, max: 200, trend: 'up', unit: 'req/s', timestamp: new Date() },
      errorRate: { current: 1, average: 1.5, min: 0, max: 5, trend: 'down', unit: '%', timestamp: new Date() },
      successRate: { current: 99, average: 98.5, min: 95, max: 100, trend: 'up', unit: '%', timestamp: new Date() },
      latency: { p50: 80, p90: 150, p95: 200, p99: 300, mean: 100, unit: 'ms' },
      availability: { current: 99.9, average: 99.8, min: 99.5, max: 100, trend: 'stable', unit: '%', timestamp: new Date() }
    };
  }

  private async executeOptimizationAction(agentId: string, action: OptimizationAction): Promise<void> {
    // Execute the actual optimization action
    console.log(`Executing ${action.type} for agent ${agentId}`);
  }

  private async waitForStabilization(agentId: string): Promise<void> {
    // Wait for metrics to stabilize after optimization
    await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
  }

  private async executeRollback(agentId: string, rollbackProcedure: string): Promise<void> {
    // Execute rollback procedure
    console.log(`Executing rollback for agent ${agentId}: ${rollbackProcedure}`);
  }
}