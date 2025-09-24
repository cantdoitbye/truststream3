/**
 * Agent Performance Analyzer
 * 
 * Comprehensive performance monitoring and analytics for AI agents
 */

import { EventEmitter } from 'events';
import { Logger } from '../../shared-utils/logger';
import { AIMonitoringConfig, AIMonitoringBackend, AIMetric, AgentPerformanceMetrics } from '../AIPerformanceAnalytics';

export class AgentPerformanceAnalyzer extends EventEmitter {
  private config: AIMonitoringConfig;
  private logger: Logger;
  private backend: AIMonitoringBackend;
  
  // Agent tracking
  private agentMetrics: Map<string, AgentPerformanceMetrics> = new Map();
  private agentHistory: Map<string, AIMetric[]> = new Map();
  private performanceBaselines: Map<string, Record<string, number>> = new Map();
  
  // Monitoring timers
  private metricsUpdateTimer?: NodeJS.Timeout;
  private performanceAnalysisTimer?: NodeJS.Timeout;
  
  constructor(config: AIMonitoringConfig, logger: Logger, backend: AIMonitoringBackend) {
    super();
    this.config = config;
    this.logger = logger;
    this.backend = backend;
  }
  
  async initialize(): Promise<void> {
    this.logger.info('Initializing Agent Performance Analyzer');
    
    try {
      // Load existing agent metrics
      await this.loadAgentBaselines();
      
      // Start monitoring
      this.startMonitoring();
      
      this.logger.info('Agent Performance Analyzer initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Agent Performance Analyzer', error);
      throw error;
    }
  }
  
  async updateAgentMetrics(agentId: string, metric: AIMetric): Promise<void> {
    try {
      // Update metric history
      const history = this.agentHistory.get(agentId) || [];
      history.push(metric);
      
      // Keep only recent metrics
      const maxHistory = 1000;
      if (history.length > maxHistory) {
        history.splice(0, history.length - maxHistory);
      }
      
      this.agentHistory.set(agentId, history);
      
      // Update performance metrics
      await this.calculateAgentPerformance(agentId);
      
      this.emit('agent-metrics-updated', { agent_id: agentId, metric });
    } catch (error) {
      this.logger.error('Failed to update agent metrics', error);
    }
  }
  
  async collectMetrics(): Promise<void> {
    try {
      // Collect metrics from active agents
      const activeAgents = await this.getActiveAgents();
      
      for (const agentId of activeAgents) {
        await this.collectAgentMetrics(agentId);
      }
    } catch (error) {
      this.logger.error('Failed to collect agent metrics', error);
    }
  }
  
  async processAnalytics(): Promise<void> {
    try {
      // Process performance analytics for all agents
      for (const agentId of this.agentMetrics.keys()) {
        await this.analyzeAgentPerformance(agentId);
      }
      
      // Generate performance insights
      await this.generatePerformanceInsights();
    } catch (error) {
      this.logger.error('Failed to process agent analytics', error);
    }
  }
  
  async getAgentSummary(): Promise<AgentPerformanceMetrics[]> {
    return Array.from(this.agentMetrics.values());
  }
  
  async getAgentPerformanceHistory(agentId: string, timeRange: string = '24h'): Promise<AgentPerformanceMetrics[]> {
    return await this.backend.getAgentPerformance(agentId, timeRange);
  }
  
  async getAgentMetrics(agentId: string): Promise<AgentPerformanceMetrics | null> {
    return this.agentMetrics.get(agentId) || null;
  }
  
  // Private methods
  
  private startMonitoring(): void {
    // Regular metrics updates
    this.metricsUpdateTimer = setInterval(() => {
      this.updateAllAgentMetrics();
    }, 30000); // Every 30 seconds
    
    // Performance analysis
    this.performanceAnalysisTimer = setInterval(() => {
      this.processAnalytics();
    }, 300000); // Every 5 minutes
  }
  
  private async loadAgentBaselines(): Promise<void> {
    try {
      // Load performance baselines from historical data
      const agents = await this.getKnownAgents();
      
      for (const agentId of agents) {
        const baseline = await this.calculatePerformanceBaseline(agentId);
        this.performanceBaselines.set(agentId, baseline);
      }
    } catch (error) {
      this.logger.error('Failed to load agent baselines', error);
    }
  }
  
  private async getActiveAgents(): Promise<string[]> {
    try {
      // Get list of active agents from the system
      // This would integrate with your agent registry
      const metrics = await this.backend.getMetrics({
        metric_type: 'performance',
        timestamp: { '>=': new Date(Date.now() - 300000) } // Last 5 minutes
      });
      
      const agentIds = new Set<string>();
      for (const metric of metrics) {
        if (metric.agent_id) {
          agentIds.add(metric.agent_id);
        }
      }
      
      return Array.from(agentIds);
    } catch (error) {
      this.logger.error('Failed to get active agents', error);
      return [];
    }
  }
  
  private async getKnownAgents(): Promise<string[]> {
    try {
      // Get all known agents from metrics history
      const metrics = await this.backend.getMetrics({});
      const agentIds = new Set<string>();
      
      for (const metric of metrics) {
        if (metric.agent_id) {
          agentIds.add(metric.agent_id);
        }
      }
      
      return Array.from(agentIds);
    } catch (error) {
      this.logger.error('Failed to get known agents', error);
      return [];
    }
  }
  
  private async collectAgentMetrics(agentId: string): Promise<void> {
    try {
      // This would integrate with your agent monitoring system
      // For now, we'll simulate collecting metrics
      
      const currentTime = new Date();
      const mockMetrics = [
        {
          name: 'response_time',
          value: Math.random() * 1000 + 100, // 100-1100ms
          type: 'latency' as const
        },
        {
          name: 'success_rate',
          value: 0.95 + Math.random() * 0.05, // 95-100%
          type: 'performance' as const
        },
        {
          name: 'throughput',
          value: Math.random() * 50 + 10, // 10-60 req/min
          type: 'throughput' as const
        }
      ];
      
      for (const mockMetric of mockMetrics) {
        const metric: AIMetric = {
          metric_id: `${mockMetric.name}_${agentId}_${Date.now()}`,
          agent_id: agentId,
          metric_name: mockMetric.name,
          metric_value: mockMetric.value,
          metric_unit: this.getMetricUnit(mockMetric.name),
          metric_type: mockMetric.type,
          timestamp: currentTime,
          context: { collection_type: 'system' },
          tags: ['auto_collected']
        };
        
        await this.backend.storeMetric(metric);
        await this.updateAgentMetrics(agentId, metric);
      }
    } catch (error) {
      this.logger.error('Failed to collect agent metrics', { agent_id: agentId, error });
    }
  }
  
  private async calculateAgentPerformance(agentId: string): Promise<void> {
    try {
      const history = this.agentHistory.get(agentId) || [];
      if (history.length === 0) return;
      
      // Calculate performance metrics from history
      const responseTimeMetrics = history.filter(m => m.metric_name === 'response_time');
      const successRateMetrics = history.filter(m => m.metric_name === 'success_rate');
      const errorRateMetrics = history.filter(m => m.metric_name === 'error_rate');
      const throughputMetrics = history.filter(m => m.metric_name === 'throughput');
      
      // Calculate aggregated metrics
      const performanceMetrics: AgentPerformanceMetrics = {
        agent_id: agentId,
        agent_name: await this.getAgentName(agentId),
        agent_type: await this.getAgentType(agentId),
        response_time_avg: this.calculateAverage(responseTimeMetrics.map(m => m.metric_value)),
        response_time_p95: this.calculatePercentile(responseTimeMetrics.map(m => m.metric_value), 0.95),
        response_time_p99: this.calculatePercentile(responseTimeMetrics.map(m => m.metric_value), 0.99),
        success_rate: this.calculateAverage(successRateMetrics.map(m => m.metric_value)),
        error_rate: this.calculateAverage(errorRateMetrics.map(m => m.metric_value)),
        throughput: this.calculateAverage(throughputMetrics.map(m => m.metric_value)),
        resource_utilization: this.calculateResourceUtilization(history),
        quality_score: this.calculateQualityScore(history),
        accuracy_score: this.calculateAccuracyScore(history),
        user_satisfaction: this.calculateUserSatisfaction(history),
        last_updated: new Date()
      };
      
      this.agentMetrics.set(agentId, performanceMetrics);
      
      // Store in backend
      await this.backend.storeAgentPerformance(performanceMetrics);
      
      this.emit('agent-performance-calculated', { agent_id: agentId, metrics: performanceMetrics });
    } catch (error) {
      this.logger.error('Failed to calculate agent performance', { agent_id: agentId, error });
    }
  }
  
  private async analyzeAgentPerformance(agentId: string): Promise<void> {
    try {
      const currentMetrics = this.agentMetrics.get(agentId);
      const baseline = this.performanceBaselines.get(agentId);
      
      if (!currentMetrics || !baseline) return;
      
      // Compare against baseline
      const performanceChanges = {
        response_time_change: ((currentMetrics.response_time_avg - baseline.response_time_avg) / baseline.response_time_avg) * 100,
        success_rate_change: ((currentMetrics.success_rate - baseline.success_rate) / baseline.success_rate) * 100,
        throughput_change: ((currentMetrics.throughput - baseline.throughput) / baseline.throughput) * 100
      };
      
      // Detect significant changes
      const significantThreshold = 10; // 10% change
      
      if (Math.abs(performanceChanges.response_time_change) > significantThreshold) {
        this.emit('performance-change-detected', {
          agent_id: agentId,
          metric: 'response_time',
          change_percent: performanceChanges.response_time_change,
          current_value: currentMetrics.response_time_avg,
          baseline_value: baseline.response_time_avg
        });
      }
      
      if (Math.abs(performanceChanges.success_rate_change) > significantThreshold) {
        this.emit('performance-change-detected', {
          agent_id: agentId,
          metric: 'success_rate',
          change_percent: performanceChanges.success_rate_change,
          current_value: currentMetrics.success_rate,
          baseline_value: baseline.success_rate
        });
      }
    } catch (error) {
      this.logger.error('Failed to analyze agent performance', { agent_id: agentId, error });
    }
  }
  
  private async generatePerformanceInsights(): Promise<void> {
    try {
      // Generate insights based on performance data
      const allMetrics = Array.from(this.agentMetrics.values());
      
      // Find top performing agents
      const topPerformers = allMetrics
        .sort((a, b) => (b.quality_score + b.accuracy_score) - (a.quality_score + a.accuracy_score))
        .slice(0, 5);
      
      // Find agents needing attention
      const needsAttention = allMetrics.filter(metrics => 
        metrics.error_rate > 0.05 || 
        metrics.response_time_avg > 2000 || 
        metrics.success_rate < 0.9
      );
      
      this.emit('performance-insights-generated', {
        top_performers: topPerformers.map(m => m.agent_id),
        needs_attention: needsAttention.map(m => m.agent_id),
        total_agents: allMetrics.length
      });
    } catch (error) {
      this.logger.error('Failed to generate performance insights', error);
    }
  }
  
  private async updateAllAgentMetrics(): Promise<void> {
    try {
      for (const agentId of this.agentMetrics.keys()) {
        await this.calculateAgentPerformance(agentId);
      }
    } catch (error) {
      this.logger.error('Failed to update all agent metrics', error);
    }
  }
  
  private async calculatePerformanceBaseline(agentId: string): Promise<Record<string, number>> {
    try {
      // Calculate baseline from historical data (last 7 days)
      const historicalMetrics = await this.backend.getAgentPerformance(agentId, '7d');
      
      if (historicalMetrics.length === 0) {
        // Default baseline
        return {
          response_time_avg: 500,
          success_rate: 0.95,
          throughput: 30,
          error_rate: 0.02
        };
      }
      
      // Calculate averages from historical data
      return {
        response_time_avg: this.calculateAverage(historicalMetrics.map(m => m.response_time_avg)),
        success_rate: this.calculateAverage(historicalMetrics.map(m => m.success_rate)),
        throughput: this.calculateAverage(historicalMetrics.map(m => m.throughput)),
        error_rate: this.calculateAverage(historicalMetrics.map(m => m.error_rate))
      };
    } catch (error) {
      this.logger.error('Failed to calculate performance baseline', { agent_id: agentId, error });
      return {};
    }
  }
  
  private async getAgentName(agentId: string): Promise<string> {
    // This would integrate with your agent registry
    return `Agent-${agentId.slice(0, 8)}`;
  }
  
  private async getAgentType(agentId: string): Promise<string> {
    // This would integrate with your agent registry
    return 'ai-assistant';
  }
  
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
  
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[index] || 0;
  }
  
  private calculateResourceUtilization(metrics: AIMetric[]): number {
    // Calculate resource utilization based on various metrics
    const resourceMetrics = metrics.filter(m => 
      m.metric_name.includes('cpu') || 
      m.metric_name.includes('memory') || 
      m.metric_name.includes('gpu')
    );
    
    if (resourceMetrics.length === 0) return 0.5; // Default moderate utilization
    
    return this.calculateAverage(resourceMetrics.map(m => m.metric_value));
  }
  
  private calculateQualityScore(metrics: AIMetric[]): number {
    // Calculate quality score based on various quality metrics
    const qualityMetrics = metrics.filter(m => 
      m.metric_name.includes('quality') || 
      m.metric_name.includes('satisfaction') ||
      m.metric_name.includes('accuracy')
    );
    
    if (qualityMetrics.length === 0) return 0.8; // Default good quality
    
    return this.calculateAverage(qualityMetrics.map(m => m.metric_value));
  }
  
  private calculateAccuracyScore(metrics: AIMetric[]): number {
    // Calculate accuracy score
    const accuracyMetrics = metrics.filter(m => m.metric_name.includes('accuracy'));
    
    if (accuracyMetrics.length === 0) return 0.85; // Default good accuracy
    
    return this.calculateAverage(accuracyMetrics.map(m => m.metric_value));
  }
  
  private calculateUserSatisfaction(metrics: AIMetric[]): number {
    // Calculate user satisfaction score
    const satisfactionMetrics = metrics.filter(m => 
      m.metric_name.includes('satisfaction') || 
      m.metric_name.includes('rating')
    );
    
    if (satisfactionMetrics.length === 0) return 0.8; // Default good satisfaction
    
    return this.calculateAverage(satisfactionMetrics.map(m => m.metric_value));
  }
  
  private getMetricUnit(metricName: string): string {
    const unitMappings: Record<string, string> = {
      'response_time': 'ms',
      'success_rate': '%',
      'error_rate': '%',
      'throughput': 'req/min',
      'accuracy': '%',
      'quality_score': 'score',
      'user_satisfaction': 'score'
    };
    
    for (const [pattern, unit] of Object.entries(unitMappings)) {
      if (metricName.includes(pattern)) {
        return unit;
      }
    }
    
    return '';
  }
  
  async destroy(): Promise<void> {
    try {
      // Stop monitoring timers
      if (this.metricsUpdateTimer) clearInterval(this.metricsUpdateTimer);
      if (this.performanceAnalysisTimer) clearInterval(this.performanceAnalysisTimer);
      
      // Clear state
      this.agentMetrics.clear();
      this.agentHistory.clear();
      this.performanceBaselines.clear();
      
      this.logger.info('Agent Performance Analyzer destroyed');
    } catch (error) {
      this.logger.error('Failed to destroy Agent Performance Analyzer', error);
      throw error;
    }
  }
}
