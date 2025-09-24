/**
 * Predictive Analytics Engine
 * 
 * Advanced predictive analytics for AI systems including capacity planning,
 * performance forecasting, cost optimization, and maintenance scheduling.
 */

import { EventEmitter } from 'events';
import { Logger } from '../../shared-utils/logger';
import { AIMonitoringConfig, AIMonitoringBackend, AIMetric, PredictiveInsight } from '../AIPerformanceAnalytics';

export class PredictiveAnalyticsEngine extends EventEmitter {
  private config: AIMonitoringConfig;
  private logger: Logger;
  private backend: AIMonitoringBackend;
  
  // Prediction models
  private forecastModels: Map<string, ForecastModel> = new Map();
  private capacityModels: Map<string, CapacityModel> = new Map();
  private costModels: Map<string, CostModel> = new Map();
  
  // Active insights
  private activeInsights: Map<string, PredictiveInsight> = new Map();
  
  // Prediction timers
  private forecastTimer?: NodeJS.Timeout;
  private capacityAnalysisTimer?: NodeJS.Timeout;
  private costOptimizationTimer?: NodeJS.Timeout;
  private modelUpdateTimer?: NodeJS.Timeout;
  
  constructor(config: AIMonitoringConfig, logger: Logger, backend: AIMonitoringBackend) {
    super();
    this.config = config;
    this.logger = logger;
    this.backend = backend;
  }
  
  async initialize(): Promise<void> {
    this.logger.info('Initializing Predictive Analytics Engine');
    
    try {
      // Initialize prediction models
      await this.initializePredictionModels();
      
      // Load existing insights
      await this.loadActiveInsights();
      
      // Start predictive analytics
      this.startPredictiveAnalytics();
      
      this.logger.info('Predictive Analytics Engine initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Predictive Analytics Engine', error);
      throw error;
    }
  }
  
  async generateInsights(metrics: Map<string, AIMetric[]>): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];
    
    try {
      // Generate different types of insights
      const capacityInsights = await this.generateCapacityPlanningInsights(metrics);
      const performanceInsights = await this.generatePerformancePredictions(metrics);
      const costInsights = await this.generateCostOptimizationInsights(metrics);
      const maintenanceInsights = await this.generateMaintenanceScheduleInsights(metrics);
      
      insights.push(...capacityInsights, ...performanceInsights, ...costInsights, ...maintenanceInsights);
      
      // Store insights
      for (const insight of insights) {
        await this.backend.storePredictiveInsight(insight);
        this.activeInsights.set(insight.insight_id, insight);
      }
      
      return insights;
    } catch (error) {
      this.logger.error('Failed to generate predictive insights', error);
      return [];
    }
  }
  
  async getPredictiveInsights(filters?: Record<string, any>): Promise<PredictiveInsight[]> {
    return await this.backend.getPredictiveInsights(filters || {});
  }
  
  async generateCapacityForecast(
    entityId: string,
    metricName: string,
    timeHorizon: string
  ): Promise<CapacityForecast | null> {
    try {
      const model = this.capacityModels.get(`${entityId}_${metricName}`);
      if (!model) {
        this.logger.warn('No capacity model available', { entity_id: entityId, metric: metricName });
        return null;
      }
      
      const forecast = await this.generateForecast(model, timeHorizon);
      return {
        entity_id: entityId,
        metric_name: metricName,
        time_horizon: timeHorizon,
        predicted_values: forecast.predictions,
        confidence_intervals: forecast.confidence,
        capacity_threshold: model.capacity_threshold,
        expected_breach_time: this.calculateBreachTime(forecast, model.capacity_threshold),
        recommended_actions: this.generateCapacityRecommendations(forecast, model)
      };
    } catch (error) {
      this.logger.error('Failed to generate capacity forecast', { entity_id: entityId, metric: metricName, error });
      return null;
    }
  }
  
  async generatePerformancePrediction(
    entityId: string,
    timeHorizon: string
  ): Promise<PerformancePrediction | null> {
    try {
      const forecastModel = this.forecastModels.get(entityId);
      if (!forecastModel) {
        return null;
      }
      
      const prediction = await this.predictPerformanceTrends(forecastModel, timeHorizon);
      return {
        entity_id: entityId,
        time_horizon: timeHorizon,
        predicted_metrics: prediction.metrics,
        performance_trend: prediction.trend,
        confidence: prediction.confidence,
        risk_factors: prediction.risks,
        optimization_opportunities: prediction.optimizations
      };
    } catch (error) {
      this.logger.error('Failed to generate performance prediction', { entity_id: entityId, error });
      return null;
    }
  }
  
  // Private methods
  
  private startPredictiveAnalytics(): void {
    // Performance forecasting
    this.forecastTimer = setInterval(() => {
      this.runPerformanceForecasting();
    }, this.config.predictionUpdateInterval);
    
    // Capacity analysis
    this.capacityAnalysisTimer = setInterval(() => {
      this.runCapacityAnalysis();
    }, 3600000); // Every hour
    
    // Cost optimization
    if (this.config.costMonitoringEnabled) {
      this.costOptimizationTimer = setInterval(() => {
        this.runCostOptimization();
      }, 3600000); // Every hour
    }
    
    // Model updates
    this.modelUpdateTimer = setInterval(() => {
      this.updatePredictionModels();
    }, 6 * 3600000); // Every 6 hours
  }
  
  private async initializePredictionModels(): Promise<void> {
    try {
      // Get all entities with sufficient historical data
      const entities = await this.getEntitiesWithSufficientData();
      
      for (const entity of entities) {
        await this.buildForecastModel(entity.id, entity.type);
        await this.buildCapacityModel(entity.id, entity.type);
        
        if (this.config.costMonitoringEnabled) {
          await this.buildCostModel(entity.id, entity.type);
        }
      }
    } catch (error) {
      this.logger.error('Failed to initialize prediction models', error);
    }
  }
  
  private async loadActiveInsights(): Promise<void> {
    try {
      const insights = await this.backend.getPredictiveInsights({
        expires_at: { '>=': new Date() }
      });
      
      for (const insight of insights) {
        this.activeInsights.set(insight.insight_id, insight);
      }
    } catch (error) {
      this.logger.error('Failed to load active insights', error);
    }
  }
  
  private async generateCapacityPlanningInsights(metrics: Map<string, AIMetric[]>): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];
    
    try {
      // Group metrics by entity
      const entityMetrics = this.groupMetricsByEntity(metrics);
      
      for (const [entityId, entityMetricMap] of entityMetrics) {
        // Analyze resource utilization trends
        const resourceMetrics = this.filterResourceMetrics(entityMetricMap);
        
        for (const [metricName, metricHistory] of resourceMetrics) {
          if (metricHistory.length < 20) continue;
          
          const forecast = await this.generateCapacityForecast(entityId, metricName, '7d');
          if (forecast && forecast.expected_breach_time) {
            const insight: PredictiveInsight = {
              insight_id: `capacity_${entityId}_${metricName}_${Date.now()}`,
              insight_type: 'capacity_planning',
              entity_type: this.determineEntityType(entityId),
              entity_id: entityId,
              prediction: `${metricName} capacity may be exceeded in ${forecast.expected_breach_time}`,
              confidence: forecast.confidence_intervals[0]?.confidence || 0.8,
              time_horizon: '7d',
              impact_assessment: 'Potential service degradation or outage',
              recommended_actions: forecast.recommended_actions,
              created_at: new Date(),
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            };
            
            insights.push(insight);
          }
        }
      }
      
      return insights;
    } catch (error) {
      this.logger.error('Failed to generate capacity planning insights', error);
      return [];
    }
  }
  
  private async generatePerformancePredictions(metrics: Map<string, AIMetric[]>): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];
    
    try {
      const entityMetrics = this.groupMetricsByEntity(metrics);
      
      for (const [entityId, entityMetricMap] of entityMetrics) {
        const prediction = await this.generatePerformancePrediction(entityId, '24h');
        
        if (prediction && prediction.performance_trend !== 'stable') {
          const insight: PredictiveInsight = {
            insight_id: `performance_${entityId}_${Date.now()}`,
            insight_type: 'performance_prediction',
            entity_type: this.determineEntityType(entityId),
            entity_id: entityId,
            prediction: `Performance trend: ${prediction.performance_trend} over next ${prediction.time_horizon}`,
            confidence: prediction.confidence,
            time_horizon: prediction.time_horizon,
            impact_assessment: this.assessPerformanceImpact(prediction.performance_trend),
            recommended_actions: prediction.optimization_opportunities,
            created_at: new Date(),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
          };
          
          insights.push(insight);
        }
      }
      
      return insights;
    } catch (error) {
      this.logger.error('Failed to generate performance predictions', error);
      return [];
    }
  }
  
  private async generateCostOptimizationInsights(metrics: Map<string, AIMetric[]>): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];
    
    if (!this.config.costMonitoringEnabled) return insights;
    
    try {
      const entityMetrics = this.groupMetricsByEntity(metrics);
      
      for (const [entityId, entityMetricMap] of entityMetrics) {
        const costOptimization = await this.analyzeCostOptimization(entityId, entityMetricMap);
        
        if (costOptimization && costOptimization.potential_savings > 0) {
          const insight: PredictiveInsight = {
            insight_id: `cost_${entityId}_${Date.now()}`,
            insight_type: 'cost_optimization',
            entity_type: this.determineEntityType(entityId),
            entity_id: entityId,
            prediction: `Potential monthly savings: $${costOptimization.potential_savings.toFixed(2)}`,
            confidence: costOptimization.confidence,
            time_horizon: '30d',
            impact_assessment: `Cost reduction opportunity identified`,
            recommended_actions: costOptimization.recommendations,
            created_at: new Date(),
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          };
          
          insights.push(insight);
        }
      }
      
      return insights;
    } catch (error) {
      this.logger.error('Failed to generate cost optimization insights', error);
      return [];
    }
  }
  
  private async generateMaintenanceScheduleInsights(metrics: Map<string, AIMetric[]>): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];
    
    try {
      const entityMetrics = this.groupMetricsByEntity(metrics);
      
      for (const [entityId, entityMetricMap] of entityMetrics) {
        const maintenanceNeeds = await this.analyzeMaintenanceNeeds(entityId, entityMetricMap);
        
        if (maintenanceNeeds && maintenanceNeeds.urgency > 0.5) {
          const insight: PredictiveInsight = {
            insight_id: `maintenance_${entityId}_${Date.now()}`,
            insight_type: 'maintenance_schedule',
            entity_type: this.determineEntityType(entityId),
            entity_id: entityId,
            prediction: `Maintenance recommended within ${maintenanceNeeds.recommended_timeframe}`,
            confidence: maintenanceNeeds.confidence,
            time_horizon: maintenanceNeeds.recommended_timeframe,
            impact_assessment: maintenanceNeeds.impact_assessment,
            recommended_actions: maintenanceNeeds.maintenance_actions,
            created_at: new Date(),
            expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
          };
          
          insights.push(insight);
        }
      }
      
      return insights;
    } catch (error) {
      this.logger.error('Failed to generate maintenance schedule insights', error);
      return [];
    }
  }
  
  private async runPerformanceForecasting(): Promise<void> {
    try {
      // Generate forecasts for all active entities
      for (const [entityId, model] of this.forecastModels) {
        const prediction = await this.generatePerformancePrediction(entityId, '24h');
        
        if (prediction) {
          this.emit('performance-forecast-generated', {
            entity_id: entityId,
            prediction
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to run performance forecasting', error);
    }
  }
  
  private async runCapacityAnalysis(): Promise<void> {
    try {
      for (const [modelKey, model] of this.capacityModels) {
        const [entityId, metricName] = modelKey.split('_');
        const forecast = await this.generateCapacityForecast(entityId, metricName, '7d');
        
        if (forecast && forecast.expected_breach_time) {
          this.emit('capacity-alert', {
            entity_id: entityId,
            metric_name: metricName,
            forecast
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to run capacity analysis', error);
    }
  }
  
  private async runCostOptimization(): Promise<void> {
    try {
      // Analyze cost optimization opportunities
      const allMetrics = await this.backend.getMetrics({
        timestamp: { '>=': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });
      
      const entityMetrics = this.groupMetricsByEntity(new Map([['all', allMetrics]]));
      
      for (const [entityId, entityMetricMap] of entityMetrics) {
        const costOptimization = await this.analyzeCostOptimization(entityId, entityMetricMap);
        
        if (costOptimization && costOptimization.potential_savings > 10) {
          this.emit('cost-optimization-opportunity', {
            entity_id: entityId,
            optimization: costOptimization
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to run cost optimization', error);
    }
  }
  
  private async updatePredictionModels(): Promise<void> {
    try {
      // Update models with recent data
      const entities = await this.getEntitiesWithSufficientData();
      
      for (const entity of entities) {
        await this.updateForecastModel(entity.id, entity.type);
        await this.updateCapacityModel(entity.id, entity.type);
        
        if (this.config.costMonitoringEnabled) {
          await this.updateCostModel(entity.id, entity.type);
        }
      }
    } catch (error) {
      this.logger.error('Failed to update prediction models', error);
    }
  }
  
  // Model building and updating methods
  
  private async buildForecastModel(entityId: string, entityType: 'agent' | 'model' | 'system'): Promise<void> {
    try {
      const metrics = await this.getHistoricalMetrics(entityId, '30d');
      
      if (metrics.length < 50) {
        this.logger.warn('Insufficient data for forecast model', { entity_id: entityId });
        return;
      }
      
      const model: ForecastModel = {
        entity_id: entityId,
        entity_type: entityType,
        metrics_included: this.getUniqueMetricNames(metrics),
        seasonality_patterns: await this.detectSeasonalityPatterns(metrics),
        trend_patterns: await this.detectTrendPatterns(metrics),
        correlation_matrix: await this.calculateCorrelationMatrix(metrics),
        model_quality: this.assessForecastModelQuality(metrics),
        last_updated: new Date(),
        sample_size: metrics.length
      };
      
      this.forecastModels.set(entityId, model);
    } catch (error) {
      this.logger.error('Failed to build forecast model', { entity_id: entityId, error });
    }
  }
  
  private async buildCapacityModel(entityId: string, entityType: 'agent' | 'model' | 'system'): Promise<void> {
    try {
      const resourceMetrics = await this.getResourceMetrics(entityId, '30d');
      
      for (const [metricName, metricHistory] of resourceMetrics) {
        if (metricHistory.length < 20) continue;
        
        const model: CapacityModel = {
          entity_id: entityId,
          metric_name: metricName,
          current_utilization: this.calculateCurrentUtilization(metricHistory),
          historical_peak: this.calculateHistoricalPeak(metricHistory),
          growth_rate: this.calculateGrowthRate(metricHistory),
          capacity_threshold: this.determineCapacityThreshold(metricName),
          seasonality_factor: this.calculateSeasonalityFactor(metricHistory),
          prediction_accuracy: 0.8, // Initial estimate
          last_updated: new Date()
        };
        
        this.capacityModels.set(`${entityId}_${metricName}`, model);
      }
    } catch (error) {
      this.logger.error('Failed to build capacity model', { entity_id: entityId, error });
    }
  }
  
  private async buildCostModel(entityId: string, entityType: 'agent' | 'model' | 'system'): Promise<void> {
    try {
      const costMetrics = await this.getCostMetrics(entityId, '30d');
      
      if (costMetrics.length < 10) {
        this.logger.warn('Insufficient cost data for model', { entity_id: entityId });
        return;
      }
      
      const model: CostModel = {
        entity_id: entityId,
        cost_drivers: this.identifyCostDrivers(costMetrics),
        cost_per_unit: this.calculateCostPerUnit(costMetrics),
        optimization_opportunities: this.identifyOptimizationOpportunities(costMetrics),
        efficiency_baseline: this.calculateEfficiencyBaseline(costMetrics),
        last_updated: new Date()
      };
      
      this.costModels.set(entityId, model);
    } catch (error) {
      this.logger.error('Failed to build cost model', { entity_id: entityId, error });
    }
  }
  
  // Helper methods
  
  private groupMetricsByEntity(metrics: Map<string, AIMetric[]>): Map<string, Map<string, AIMetric[]>> {
    const entityMetrics = new Map<string, Map<string, AIMetric[]>>();
    
    for (const [metricName, metricHistory] of metrics) {
      for (const metric of metricHistory) {
        const entityId = metric.agent_id || metric.model_id || 'system';
        
        if (!entityMetrics.has(entityId)) {
          entityMetrics.set(entityId, new Map());
        }
        
        const entityMetricMap = entityMetrics.get(entityId)!;
        if (!entityMetricMap.has(metricName)) {
          entityMetricMap.set(metricName, []);
        }
        
        entityMetricMap.get(metricName)!.push(metric);
      }
    }
    
    return entityMetrics;
  }
  
  private filterResourceMetrics(entityMetrics: Map<string, AIMetric[]>): Map<string, AIMetric[]> {
    const resourceMetrics = new Map<string, AIMetric[]>();
    
    for (const [metricName, metricHistory] of entityMetrics) {
      if (this.isResourceMetric(metricName)) {
        resourceMetrics.set(metricName, metricHistory);
      }
    }
    
    return resourceMetrics;
  }
  
  private isResourceMetric(metricName: string): boolean {
    const resourcePatterns = [
      /cpu/, /memory/, /gpu/, /storage/, /bandwidth/,
      /utilization/, /usage/, /capacity/
    ];
    
    return resourcePatterns.some(pattern => pattern.test(metricName.toLowerCase()));
  }
  
  private determineEntityType(entityId: string): 'agent' | 'model' | 'system' {
    if (entityId.includes('agent')) return 'agent';
    if (entityId.includes('model')) return 'model';
    return 'system';
  }
  
  private assessPerformanceImpact(trend: string): string {
    switch (trend) {
      case 'improving':
        return 'Positive performance improvement expected';
      case 'degrading':
        return 'Performance degradation expected, intervention recommended';
      default:
        return 'Stable performance expected';
    }
  }
  
  private async getEntitiesWithSufficientData(): Promise<Array<{ id: string; type: 'agent' | 'model' | 'system' }>> {
    // Implementation would query for entities with sufficient metrics
    return [
      { id: 'agent_001', type: 'agent' },
      { id: 'model_001', type: 'model' },
      { id: 'system', type: 'system' }
    ];
  }
  
  private async getHistoricalMetrics(entityId: string, timeRange: string): Promise<AIMetric[]> {
    const filter: any = {
      timestamp: { '>=': this.parseTimeRange(timeRange) }
    };
    
    if (entityId.includes('agent')) {
      filter.agent_id = entityId;
    } else if (entityId.includes('model')) {
      filter.model_id = entityId;
    }
    
    return await this.backend.getMetrics(filter);
  }
  
  private parseTimeRange(timeRange: string): Date {
    const now = new Date();
    const match = timeRange.match(/^(\d+)([dhm])$/);
    
    if (!match) return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'h':
        return new Date(now.getTime() - value * 60 * 60 * 1000);
      case 'd':
        return new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
      case 'm':
        return new Date(now.getTime() - value * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }
  
  // Placeholder implementations for complex analytics methods
  private async generateForecast(model: CapacityModel, timeHorizon: string): Promise<{ predictions: number[]; confidence: Array<{ confidence: number }> }> {
    // Simplified forecast implementation
    return {
      predictions: [model.current_utilization * 1.1, model.current_utilization * 1.2],
      confidence: [{ confidence: 0.8 }, { confidence: 0.7 }]
    };
  }
  
  private calculateBreachTime(forecast: any, threshold: number): string | null {
    // Simplified breach time calculation
    if (forecast.predictions[0] > threshold) {
      return '3 days';
    }
    return null;
  }
  
  private generateCapacityRecommendations(forecast: any, model: CapacityModel): string[] {
    return [
      'Monitor resource utilization closely',
      'Consider scaling infrastructure',
      'Review resource allocation policies'
    ];
  }
  
  private async predictPerformanceTrends(model: ForecastModel, timeHorizon: string): Promise<any> {
    // Simplified performance prediction
    return {
      metrics: {},
      trend: 'stable',
      confidence: 0.8,
      risks: [],
      optimizations: []
    };
  }
  
  private async analyzeCostOptimization(entityId: string, metrics: Map<string, AIMetric[]>): Promise<any> {
    // Simplified cost optimization analysis
    return {
      potential_savings: Math.random() * 100,
      confidence: 0.7,
      recommendations: ['Optimize resource usage', 'Review scaling policies']
    };
  }
  
  private async analyzeMaintenanceNeeds(entityId: string, metrics: Map<string, AIMetric[]>): Promise<any> {
    // Simplified maintenance needs analysis
    return {
      urgency: Math.random(),
      recommended_timeframe: '7 days',
      confidence: 0.8,
      impact_assessment: 'Preventive maintenance recommended',
      maintenance_actions: ['System health check', 'Performance optimization']
    };
  }
  
  // Additional helper methods (simplified implementations)
  private getUniqueMetricNames(metrics: AIMetric[]): string[] {
    return [...new Set(metrics.map(m => m.metric_name))];
  }
  
  private async detectSeasonalityPatterns(metrics: AIMetric[]): Promise<any> {
    return {};
  }
  
  private async detectTrendPatterns(metrics: AIMetric[]): Promise<any> {
    return {};
  }
  
  private async calculateCorrelationMatrix(metrics: AIMetric[]): Promise<any> {
    return {};
  }
  
  private assessForecastModelQuality(metrics: AIMetric[]): number {
    return 0.8;
  }
  
  private async getResourceMetrics(entityId: string, timeRange: string): Promise<Map<string, AIMetric[]>> {
    return new Map();
  }
  
  private calculateCurrentUtilization(metricHistory: AIMetric[]): number {
    if (metricHistory.length === 0) return 0;
    return metricHistory[metricHistory.length - 1].metric_value;
  }
  
  private calculateHistoricalPeak(metricHistory: AIMetric[]): number {
    return Math.max(...metricHistory.map(m => m.metric_value));
  }
  
  private calculateGrowthRate(metricHistory: AIMetric[]): number {
    // Simplified growth rate calculation
    return 0.05; // 5% growth
  }
  
  private determineCapacityThreshold(metricName: string): number {
    const thresholds: Record<string, number> = {
      'cpu_usage': 80,
      'memory_usage': 85,
      'gpu_utilization': 90,
      'storage_usage': 80
    };
    
    return thresholds[metricName] || 80;
  }
  
  private calculateSeasonalityFactor(metricHistory: AIMetric[]): number {
    return 1.0;
  }
  
  private async getCostMetrics(entityId: string, timeRange: string): Promise<AIMetric[]> {
    return [];
  }
  
  private identifyCostDrivers(costMetrics: AIMetric[]): string[] {
    return ['compute_hours', 'storage_usage', 'bandwidth'];
  }
  
  private calculateCostPerUnit(costMetrics: AIMetric[]): Record<string, number> {
    return { per_request: 0.001, per_hour: 0.1 };
  }
  
  private identifyOptimizationOpportunities(costMetrics: AIMetric[]): string[] {
    return ['Right-size instances', 'Optimize storage', 'Use reserved capacity'];
  }
  
  private calculateEfficiencyBaseline(costMetrics: AIMetric[]): number {
    return 0.8;
  }
  
  private async updateForecastModel(entityId: string, entityType: 'agent' | 'model' | 'system'): Promise<void> {
    await this.buildForecastModel(entityId, entityType);
  }
  
  private async updateCapacityModel(entityId: string, entityType: 'agent' | 'model' | 'system'): Promise<void> {
    await this.buildCapacityModel(entityId, entityType);
  }
  
  private async updateCostModel(entityId: string, entityType: 'agent' | 'model' | 'system'): Promise<void> {
    await this.buildCostModel(entityId, entityType);
  }
  
  async destroy(): Promise<void> {
    try {
      // Stop all timers
      if (this.forecastTimer) clearInterval(this.forecastTimer);
      if (this.capacityAnalysisTimer) clearInterval(this.capacityAnalysisTimer);
      if (this.costOptimizationTimer) clearInterval(this.costOptimizationTimer);
      if (this.modelUpdateTimer) clearInterval(this.modelUpdateTimer);
      
      // Clear state
      this.forecastModels.clear();
      this.capacityModels.clear();
      this.costModels.clear();
      this.activeInsights.clear();
      
      this.logger.info('Predictive Analytics Engine destroyed');
    } catch (error) {
      this.logger.error('Failed to destroy Predictive Analytics Engine', error);
      throw error;
    }
  }
}

// Supporting interfaces
interface ForecastModel {
  entity_id: string;
  entity_type: 'agent' | 'model' | 'system';
  metrics_included: string[];
  seasonality_patterns: any;
  trend_patterns: any;
  correlation_matrix: any;
  model_quality: number;
  last_updated: Date;
  sample_size: number;
}

interface CapacityModel {
  entity_id: string;
  metric_name: string;
  current_utilization: number;
  historical_peak: number;
  growth_rate: number;
  capacity_threshold: number;
  seasonality_factor: number;
  prediction_accuracy: number;
  last_updated: Date;
}

interface CostModel {
  entity_id: string;
  cost_drivers: string[];
  cost_per_unit: Record<string, number>;
  optimization_opportunities: string[];
  efficiency_baseline: number;
  last_updated: Date;
}

interface CapacityForecast {
  entity_id: string;
  metric_name: string;
  time_horizon: string;
  predicted_values: number[];
  confidence_intervals: Array<{ confidence: number }>;
  capacity_threshold: number;
  expected_breach_time: string | null;
  recommended_actions: string[];
}

interface PerformancePrediction {
  entity_id: string;
  time_horizon: string;
  predicted_metrics: Record<string, number>;
  performance_trend: 'improving' | 'stable' | 'degrading';
  confidence: number;
  risk_factors: string[];
  optimization_opportunities: string[];
}
