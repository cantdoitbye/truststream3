/**
 * Health Analyzer Component
 * 
 * Advanced health assessment with predictive analytics, anomaly detection,
 * and intelligent recommendations for governance agent optimization.
 */

import { EventEmitter } from 'events';
import { 
  AnalyticsConfig,
  HealthMetrics,
  HealthLevel,
  ComponentHealth,
  ComponentType,
  PredictiveAnalysis,
  PerformancePrediction,
  AnomalyDetection,
  AnalyticsRecommendation,
  AnomalyType,
  SeverityLevel,
  RecommendationType,
  PriorityLevel,
  TrendDirection
} from '../interfaces';

import { DataStore } from './DataStore';

interface HealthAssessment {
  overallHealth: HealthLevel;
  components: ComponentHealth[];
  healthScore: number;
  riskFactors: string[];
  recommendations: string[];
}

interface MLModel {
  version: string;
  accuracy: number;
  lastTrainingDate: Date;
  features: string[];
  parameters: Record<string, any>;
}

export class HealthAnalyzer extends EventEmitter {
  private config: AnalyticsConfig;
  private dataStore: DataStore;
  private isRunning: boolean = false;
  
  // Registered agents and their health state
  private agentHealthState: Map<string, HealthAssessment> = new Map();
  private agentHistories: Map<string, HealthMetrics[]> = new Map();
  
  // ML Models for prediction and anomaly detection
  private predictionModels: Map<string, MLModel> = new Map();
  private anomalyModels: Map<string, MLModel> = new Map();
  
  // Analysis intervals
  private analysisInterval?: NodeJS.Timeout;
  private modelUpdateInterval?: NodeJS.Timeout;

  constructor(config: AnalyticsConfig, dataStore: DataStore) {
    super();
    this.config = config;
    this.dataStore = dataStore;
    this.initializeModels();
  }

  // ===== LIFECYCLE METHODS =====

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('HealthAnalyzer is already running');
    }

    console.log(`[${new Date().toISOString()}] Starting HealthAnalyzer`);

    // Load existing models from storage
    await this.loadModelsFromStorage();

    // Start analysis intervals
    this.startAnalysisLoops();

    this.isRunning = true;
    this.emit('analyzer:started', { timestamp: new Date() });
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log(`[${new Date().toISOString()}] Stopping HealthAnalyzer`);

    // Stop analysis intervals
    this.stopAnalysisLoops();

    // Save models to storage
    await this.saveModelsToStorage();

    this.isRunning = false;
    this.emit('analyzer:stopped', { timestamp: new Date() });
  }

  async updateConfig(config: AnalyticsConfig): Promise<void> {
    const oldConfig = this.config;
    this.config = { ...this.config, ...config };

    // Restart analysis loops if intervals changed
    if (oldConfig.modelUpdateInterval !== config.modelUpdateInterval) {
      this.stopAnalysisLoops();
      this.startAnalysisLoops();
    }

    this.emit('analyzer:config_updated', { config: this.config, timestamp: new Date() });
  }

  // ===== AGENT MANAGEMENT =====

  async registerAgent(agentId: string, config: any): Promise<void> {
    console.log(`[${new Date().toISOString()}] Registering agent for health analysis: ${agentId}`);

    // Initialize health state
    this.agentHealthState.set(agentId, {
      overallHealth: 'unknown',
      components: this.initializeComponentHealth(config),
      healthScore: 0,
      riskFactors: [],
      recommendations: []
    });

    // Initialize history
    this.agentHistories.set(agentId, []);

    // Initialize models for this agent
    await this.initializeAgentModels(agentId, config);

    this.emit('agent:registered', { agentId, config, timestamp: new Date() });
  }

  async unregisterAgent(agentId: string): Promise<void> {
    console.log(`[${new Date().toISOString()}] Unregistering agent from health analysis: ${agentId}`);

    this.agentHealthState.delete(agentId);
    this.agentHistories.delete(agentId);

    // Remove agent-specific models
    this.predictionModels.delete(agentId);
    this.anomalyModels.delete(agentId);

    this.emit('agent:unregistered', { agentId, timestamp: new Date() });
  }

  // ===== HEALTH ASSESSMENT =====

  async assessHealth(agentId: string, metrics: HealthMetrics): Promise<HealthAssessment> {
    if (!this.agentHealthState.has(agentId)) {
      throw new Error(`Agent ${agentId} is not registered`);
    }

    try {
      // Get current health state
      const currentHealth = this.agentHealthState.get(agentId)!;
      
      // Update metrics history
      this.updateMetricsHistory(agentId, metrics);

      // Assess overall health
      const overallHealth = this.calculateOverallHealth(metrics);
      const healthScore = this.calculateHealthScore(metrics);
      
      // Assess component health
      const components = await this.assessComponentHealth(agentId, metrics);
      
      // Identify risk factors
      const riskFactors = this.identifyRiskFactors(metrics, components);
      
      // Generate health recommendations
      const recommendations = await this.generateHealthRecommendations(agentId, metrics, overallHealth);

      const assessment: HealthAssessment = {
        overallHealth,
        components,
        healthScore,
        riskFactors,
        recommendations
      };

      // Check for health degradation
      if (currentHealth.overallHealth !== overallHealth && 
          this.isHealthDegradation(currentHealth.overallHealth, overallHealth)) {
        this.emit('health:degraded', {
          agentId,
          previousHealth: currentHealth.overallHealth,
          currentHealth: overallHealth,
          metrics,
          timestamp: new Date()
        });
      }

      // Update state
      this.agentHealthState.set(agentId, assessment);

      this.emit('health:assessed', { agentId, assessment, timestamp: new Date() });

      return assessment;

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error assessing health for agent ${agentId}:`, error);
      throw error;
    }
  }

  // ===== PREDICTIVE ANALYTICS =====

  async runPredictiveAnalysis(agentId: string): Promise<PredictiveAnalysis> {
    if (!this.config.enablePredictiveAnalytics) {
      throw new Error('Predictive analytics is not enabled');
    }

    const history = this.agentHistories.get(agentId);
    if (!history || history.length < 10) {
      throw new Error(`Insufficient historical data for agent ${agentId}`);
    }

    try {
      const model = this.predictionModels.get(agentId);
      if (!model) {
        throw new Error(`No prediction model available for agent ${agentId}`);
      }

      const predictions: PerformancePrediction[] = [];

      // Generate predictions for each configured horizon
      for (const horizon of this.config.performancePrediction.horizons) {
        const responseTimePrediction = await this.predictMetric(
          agentId, 
          'response_time', 
          horizon, 
          history
        );
        
        const throughputPrediction = await this.predictMetric(
          agentId, 
          'throughput', 
          horizon, 
          history
        );
        
        const errorRatePrediction = await this.predictMetric(
          agentId, 
          'error_rate', 
          horizon, 
          history
        );

        predictions.push(responseTimePrediction, throughputPrediction, errorRatePrediction);
      }

      // Detect anomalies in the predictions
      const anomalies = await this.detectAnomalies(agentId);
      
      // Generate recommendations based on predictions
      const recommendations = await this.generatePredictiveRecommendations(agentId, predictions);

      const analysis: PredictiveAnalysis = {
        analysisId: this.generateAnalysisId(),
        agentId,
        timestamp: new Date(),
        predictions,
        anomalies,
        recommendations,
        confidence: model.accuracy,
        modelVersion: model.version
      };

      this.emit('prediction:completed', { agentId, analysis, timestamp: new Date() });

      return analysis;

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error in predictive analysis for agent ${agentId}:`, error);
      throw error;
    }
  }

  // ===== ANOMALY DETECTION =====

  async detectAnomalies(agentId: string): Promise<AnomalyDetection[]> {
    if (!this.config.anomalyDetection.enabled) {
      return [];
    }

    const history = this.agentHistories.get(agentId);
    if (!history || history.length < this.config.anomalyDetection.minDataPoints) {
      return [];
    }

    try {
      const anomalies: AnomalyDetection[] = [];
      const latestMetrics = history[history.length - 1];

      // Detect anomalies in different metric categories
      const performanceAnomalies = await this.detectPerformanceAnomalies(agentId, latestMetrics, history);
      const resourceAnomalies = await this.detectResourceAnomalies(agentId, latestMetrics, history);
      const governanceAnomalies = await this.detectGovernanceAnomalies(agentId, latestMetrics, history);

      anomalies.push(...performanceAnomalies, ...resourceAnomalies, ...governanceAnomalies);

      // Emit events for detected anomalies
      anomalies.forEach(anomaly => {
        this.emit('anomaly:detected', { agentId, anomaly, timestamp: new Date() });
      });

      return anomalies;

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error detecting anomalies for agent ${agentId}:`, error);
      return [];
    }
  }

  // ===== RECOMMENDATIONS =====

  async generateRecommendations(agentId: string): Promise<AnalyticsRecommendation[]> {
    const healthState = this.agentHealthState.get(agentId);
    const history = this.agentHistories.get(agentId);
    
    if (!healthState || !history || history.length === 0) {
      return [];
    }

    try {
      const recommendations: AnalyticsRecommendation[] = [];
      const latestMetrics = history[history.length - 1];

      // Performance optimization recommendations
      const performanceRecs = await this.generatePerformanceRecommendations(agentId, latestMetrics, healthState);
      
      // Resource optimization recommendations
      const resourceRecs = await this.generateResourceRecommendations(agentId, latestMetrics, healthState);
      
      // Governance improvement recommendations
      const governanceRecs = await this.generateGovernanceRecommendations(agentId, latestMetrics, healthState);
      
      // Security recommendations
      const securityRecs = await this.generateSecurityRecommendations(agentId, latestMetrics, healthState);

      recommendations.push(...performanceRecs, ...resourceRecs, ...governanceRecs, ...securityRecs);

      // Sort by priority
      recommendations.sort((a, b) => {
        const priorityOrder = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      this.emit('recommendations:generated', { agentId, recommendations, timestamp: new Date() });

      return recommendations;

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error generating recommendations for agent ${agentId}:`, error);
      return [];
    }
  }

  // ===== PRIVATE METHODS =====

  private initializeModels(): void {
    // Initialize default ML models
    console.log(`[${new Date().toISOString()}] Initializing ML models for health analysis`);
  }

  private async loadModelsFromStorage(): Promise<void> {
    try {
      // Load models from data store
      // In a real implementation, this would restore trained models
      console.log(`[${new Date().toISOString()}] Loading ML models from storage`);
    } catch (error) {
      console.error('Error loading models from storage:', error);
    }
  }

  private async saveModelsToStorage(): Promise<void> {
    try {
      // Save models to data store
      // In a real implementation, this would persist trained models
      console.log(`[${new Date().toISOString()}] Saving ML models to storage`);
    } catch (error) {
      console.error('Error saving models to storage:', error);
    }
  }

  private startAnalysisLoops(): void {
    // Main analysis loop
    this.analysisInterval = setInterval(async () => {
      try {
        await this.performAnalysisCycle();
      } catch (error) {
        console.error('Error in analysis cycle:', error);
      }
    }, 60000); // Run every minute

    // Model update loop
    if (this.config.enablePredictiveAnalytics) {
      this.modelUpdateInterval = setInterval(async () => {
        try {
          await this.updateModels();
        } catch (error) {
          console.error('Error updating models:', error);
        }
      }, this.config.modelUpdateInterval);
    }
  }

  private stopAnalysisLoops(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = undefined;
    }

    if (this.modelUpdateInterval) {
      clearInterval(this.modelUpdateInterval);
      this.modelUpdateInterval = undefined;
    }
  }

  private async performAnalysisCycle(): Promise<void> {
    for (const agentId of this.agentHealthState.keys()) {
      try {
        // Run anomaly detection
        await this.detectAnomalies(agentId);
        
        // Generate recommendations
        await this.generateRecommendations(agentId);
        
        // Update health trends
        await this.updateHealthTrends(agentId);
        
      } catch (error) {
        console.error(`Error in analysis cycle for agent ${agentId}:`, error);
      }
    }
  }

  private async updateModels(): Promise<void> {
    for (const agentId of this.agentHealthState.keys()) {
      try {
        await this.updateAgentModels(agentId);
      } catch (error) {
        console.error(`Error updating models for agent ${agentId}:`, error);
      }
    }
  }

  private initializeComponentHealth(config: any): ComponentHealth[] {
    // Standard components for governance agents
    const standardComponents: Array<{name: string, type: ComponentType}> = [
      { name: 'core_engine', type: 'core' },
      { name: 'decision_service', type: 'service' },
      { name: 'database_connection', type: 'database' },
      { name: 'external_apis', type: 'external' },
      { name: 'cache_layer', type: 'cache' },
      { name: 'message_queue', type: 'queue' }
    ];

    return standardComponents.map((comp, index) => ({
      componentId: `${comp.name}_${index}`,
      name: comp.name,
      type: comp.type,
      status: 'unknown',
      metrics: {},
      dependencies: [],
      lastChecked: new Date(),
      checkInterval: 30000 // 30 seconds
    }));
  }

  private calculateOverallHealth(metrics: HealthMetrics): HealthLevel {
    // Calculate health based on weighted metrics
    const weights = {
      performance: 0.3,
      resource: 0.3,
      governance: 0.25,
      system: 0.15
    };

    const performanceScore = this.calculatePerformanceScore(metrics.performance);
    const resourceScore = this.calculateResourceScore(metrics.resource);
    const governanceScore = this.calculateGovernanceScore(metrics.governance);
    const systemScore = this.calculateSystemScore(metrics.system);

    const overallScore = (
      performanceScore * weights.performance +
      resourceScore * weights.resource +
      governanceScore * weights.governance +
      systemScore * weights.system
    );

    if (overallScore >= 90) return 'healthy';
    if (overallScore >= 70) return 'degraded';
    if (overallScore >= 50) return 'unhealthy';
    return 'critical';
  }

  private calculateHealthScore(metrics: HealthMetrics): number {
    // Return a 0-100 health score
    const performanceScore = this.calculatePerformanceScore(metrics.performance);
    const resourceScore = this.calculateResourceScore(metrics.resource);
    const governanceScore = this.calculateGovernanceScore(metrics.governance);
    const systemScore = this.calculateSystemScore(metrics.system);

    return (performanceScore + resourceScore + governanceScore + systemScore) / 4;
  }

  private calculatePerformanceScore(performance: any): number {
    // Calculate performance score (0-100)
    const responseTimeScore = Math.max(0, 100 - (performance.responseTime.current / 10)); // Assuming 1000ms is 0 score
    const errorRateScore = Math.max(0, 100 - (performance.errorRate.current * 10)); // Assuming 10% error rate is 0 score
    const availabilityScore = performance.availability.current;

    return (responseTimeScore + errorRateScore + availabilityScore) / 3;
  }

  private calculateResourceScore(resource: any): number {
    // Calculate resource score (0-100)
    const cpuScore = Math.max(0, 100 - resource.cpu.percentage);
    const memoryScore = Math.max(0, 100 - resource.memory.percentage);
    const diskScore = Math.max(0, 100 - resource.disk.percentage);

    return (cpuScore + memoryScore + diskScore) / 3;
  }

  private calculateGovernanceScore(governance: any): number {
    // Calculate governance score (0-100)
    return (
      governance.decisionQuality.current +
      governance.complianceScore.current +
      governance.auditTrailIntegrity.current +
      governance.stakeholderSatisfaction.current +
      governance.ethicsCompliance.current +
      governance.transparencyScore.current
    ) / 6;
  }

  private calculateSystemScore(system: any): number {
    // Calculate system score (0-100)
    const cacheScore = system.cacheHitRate.current;
    const connectionScore = Math.max(0, 100 - (system.databaseConnections / system.maxConnections || 1) * 100);
    const queueScore = Math.max(0, 100 - system.queueDepth);

    return (cacheScore + connectionScore + queueScore) / 3;
  }

  private async assessComponentHealth(agentId: string, metrics: HealthMetrics): Promise<ComponentHealth[]> {
    const currentComponents = this.agentHealthState.get(agentId)?.components || [];
    
    return currentComponents.map(component => ({
      ...component,
      status: this.assessIndividualComponentHealth(component, metrics),
      metrics: this.extractComponentMetrics(component, metrics),
      lastChecked: new Date()
    }));
  }

  private assessIndividualComponentHealth(component: ComponentHealth, metrics: HealthMetrics): HealthLevel {
    // Assess health based on component type and relevant metrics
    switch (component.type) {
      case 'core':
        return metrics.performance.errorRate.current < 5 ? 'healthy' : 'unhealthy';
      case 'database':
        return metrics.resource.connections.connectionErrors < 3 ? 'healthy' : 'degraded';
      case 'cache':
        return metrics.system.cacheHitRate.current > 80 ? 'healthy' : 'degraded';
      default:
        return 'healthy';
    }
  }

  private extractComponentMetrics(component: ComponentHealth, metrics: HealthMetrics): any {
    // Extract relevant metrics for each component type
    switch (component.type) {
      case 'core':
        return {
          responseTime: metrics.performance.responseTime.current,
          errorRate: metrics.performance.errorRate.current
        };
      case 'database':
        return {
          connections: metrics.resource.connections.active,
          errors: metrics.resource.connections.connectionErrors
        };
      case 'cache':
        return {
          hitRate: metrics.system.cacheHitRate.current
        };
      default:
        return {};
    }
  }

  private identifyRiskFactors(metrics: HealthMetrics, components: ComponentHealth[]): string[] {
    const riskFactors: string[] = [];

    // Performance risks
    if (metrics.performance.responseTime.current > 1000) {
      riskFactors.push('High response time');
    }
    if (metrics.performance.errorRate.current > 5) {
      riskFactors.push('Elevated error rate');
    }

    // Resource risks
    if (metrics.resource.cpu.percentage > 80) {
      riskFactors.push('High CPU utilization');
    }
    if (metrics.resource.memory.percentage > 85) {
      riskFactors.push('High memory usage');
    }

    // Component risks
    const unhealthyComponents = components.filter(c => c.status === 'unhealthy' || c.status === 'critical');
    if (unhealthyComponents.length > 0) {
      riskFactors.push(`${unhealthyComponents.length} unhealthy components`);
    }

    return riskFactors;
  }

  private async generateHealthRecommendations(agentId: string, metrics: HealthMetrics, health: HealthLevel): Promise<string[]> {
    const recommendations: string[] = [];

    if (health === 'critical' || health === 'unhealthy') {
      recommendations.push('Immediate attention required - consider restarting agent');
      recommendations.push('Review error logs for specific issues');
    }

    if (metrics.performance.responseTime.current > 1000) {
      recommendations.push('Optimize response time - consider caching strategies');
    }

    if (metrics.resource.cpu.percentage > 80) {
      recommendations.push('High CPU usage detected - consider scaling resources');
    }

    if (metrics.resource.memory.percentage > 85) {
      recommendations.push('Memory usage is high - investigate memory leaks');
    }

    return recommendations;
  }

  private isHealthDegradation(previous: HealthLevel, current: HealthLevel): boolean {
    const healthOrder = { 'healthy': 4, 'degraded': 3, 'unhealthy': 2, 'critical': 1, 'unknown': 0 };
    return healthOrder[current] < healthOrder[previous];
  }

  private updateMetricsHistory(agentId: string, metrics: HealthMetrics): void {
    let history = this.agentHistories.get(agentId);
    if (!history) {
      history = [];
      this.agentHistories.set(agentId, history);
    }

    history.push(metrics);

    // Keep only recent history (e.g., last 1000 entries)
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
  }

  private async initializeAgentModels(agentId: string, config: any): Promise<void> {
    // Initialize prediction model
    this.predictionModels.set(agentId, {
      version: '1.0.0',
      accuracy: 0.8,
      lastTrainingDate: new Date(),
      features: ['response_time', 'error_rate', 'cpu_usage', 'memory_usage'],
      parameters: {}
    });

    // Initialize anomaly detection model
    this.anomalyModels.set(agentId, {
      version: '1.0.0',
      accuracy: 0.9,
      lastTrainingDate: new Date(),
      features: ['response_time', 'error_rate', 'throughput'],
      parameters: {}
    });
  }

  private async predictMetric(agentId: string, metric: string, horizon: string, history: HealthMetrics[]): Promise<PerformancePrediction> {
    // Simplified prediction logic - in a real implementation, this would use ML models
    const recentValues = history.slice(-10).map(h => this.extractMetricValue(h, metric));
    const average = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const variance = recentValues.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / recentValues.length;
    const stdDev = Math.sqrt(variance);

    return {
      metric,
      timeHorizon: horizon,
      predictedValue: average,
      confidenceInterval: [average - stdDev, average + stdDev],
      trend: this.calculateTrend(recentValues),
      factors: [
        { factor: 'historical_average', importance: 0.6, direction: 'positive' },
        { factor: 'recent_trend', importance: 0.4, direction: 'positive' }
      ]
    };
  }

  private extractMetricValue(metrics: HealthMetrics, metricName: string): number {
    switch (metricName) {
      case 'response_time':
        return metrics.performance.responseTime.current;
      case 'error_rate':
        return metrics.performance.errorRate.current;
      case 'throughput':
        return metrics.performance.throughput.current;
      case 'cpu_usage':
        return metrics.resource.cpu.percentage;
      case 'memory_usage':
        return metrics.resource.memory.percentage;
      default:
        return 0;
    }
  }

  private calculateTrend(values: number[]): TrendDirection {
    if (values.length < 2) return 'stable';
    
    const recent = values.slice(-3);
    const older = values.slice(-6, -3);
    
    if (recent.length === 0 || older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > 0.05) return 'up';
    if (change < -0.05) return 'down';
    return 'stable';
  }

  private async detectPerformanceAnomalies(agentId: string, current: HealthMetrics, history: HealthMetrics[]): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];
    
    // Simple statistical anomaly detection
    const responseTimeHistory = history.map(h => h.performance.responseTime.current);
    const responseTimeAnomaly = this.detectStatisticalAnomaly('response_time', current.performance.responseTime.current, responseTimeHistory);
    if (responseTimeAnomaly) {
      anomalies.push(responseTimeAnomaly);
    }

    return anomalies;
  }

  private async detectResourceAnomalies(agentId: string, current: HealthMetrics, history: HealthMetrics[]): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];
    
    // Detect CPU usage anomalies
    const cpuHistory = history.map(h => h.resource.cpu.percentage);
    const cpuAnomaly = this.detectStatisticalAnomaly('cpu_usage', current.resource.cpu.percentage, cpuHistory);
    if (cpuAnomaly) {
      anomalies.push(cpuAnomaly);
    }

    return anomalies;
  }

  private async detectGovernanceAnomalies(agentId: string, current: HealthMetrics, history: HealthMetrics[]): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];
    
    // Detect compliance score anomalies
    const complianceHistory = history.map(h => h.governance.complianceScore.current);
    const complianceAnomaly = this.detectStatisticalAnomaly('compliance_score', current.governance.complianceScore.current, complianceHistory);
    if (complianceAnomaly) {
      anomalies.push(complianceAnomaly);
    }

    return anomalies;
  }

  private detectStatisticalAnomaly(metric: string, currentValue: number, history: number[]): AnomalyDetection | null {
    if (history.length < 10) return null;

    const mean = history.reduce((sum, val) => sum + val, 0) / history.length;
    const variance = history.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / history.length;
    const stdDev = Math.sqrt(variance);
    
    const threshold = 2 * stdDev; // 2 standard deviations
    const deviation = Math.abs(currentValue - mean);
    
    if (deviation > threshold) {
      return {
        anomalyId: this.generateAnomalyId(),
        type: 'point',
        severity: deviation > 3 * stdDev ? 'critical' : 'warning',
        metric,
        observedValue: currentValue,
        expectedValue: mean,
        deviation,
        confidence: Math.min(0.95, deviation / threshold),
        context: {
          relatedMetrics: [],
          timeContext: 'recent',
          externalFactors: []
        }
      };
    }

    return null;
  }

  private async generatePerformanceRecommendations(agentId: string, metrics: HealthMetrics, health: HealthAssessment): Promise<AnalyticsRecommendation[]> {
    const recommendations: AnalyticsRecommendation[] = [];

    if (metrics.performance.responseTime.current > 1000) {
      recommendations.push({
        recommendationId: this.generateRecommendationId(),
        type: 'optimization',
        priority: 'high',
        description: 'Response time is above acceptable threshold',
        actions: [
          {
            actionId: 'optimize_caching',
            type: 'configuration',
            description: 'Enable or optimize caching mechanisms',
            parameters: { 'cache_ttl': 300, 'cache_size': '100MB' },
            automation: true
          }
        ],
        expectedImpact: {
          performance: 30,
          stability: 10,
          cost: -5,
          risk: 5
        },
        effort: 'medium'
      });
    }

    return recommendations;
  }

  private async generateResourceRecommendations(agentId: string, metrics: HealthMetrics, health: HealthAssessment): Promise<AnalyticsRecommendation[]> {
    const recommendations: AnalyticsRecommendation[] = [];

    if (metrics.resource.cpu.percentage > 80) {
      recommendations.push({
        recommendationId: this.generateRecommendationId(),
        type: 'scaling',
        priority: 'high',
        description: 'CPU utilization is high, consider scaling',
        actions: [
          {
            actionId: 'scale_horizontally',
            type: 'scaling',
            description: 'Add additional agent instances',
            parameters: { 'instances': 2 },
            automation: false
          }
        ],
        expectedImpact: {
          performance: 40,
          stability: 30,
          cost: -20,
          risk: 10
        },
        effort: 'high'
      });
    }

    return recommendations;
  }

  private async generateGovernanceRecommendations(agentId: string, metrics: HealthMetrics, health: HealthAssessment): Promise<AnalyticsRecommendation[]> {
    const recommendations: AnalyticsRecommendation[] = [];

    if (metrics.governance.complianceScore.current < 85) {
      recommendations.push({
        recommendationId: this.generateRecommendationId(),
        type: 'configuration',
        priority: 'medium',
        description: 'Compliance score below target threshold',
        actions: [
          {
            actionId: 'review_policies',
            type: 'maintenance',
            description: 'Review and update governance policies',
            parameters: {},
            automation: false
          }
        ],
        expectedImpact: {
          performance: 5,
          stability: 20,
          cost: 0,
          risk: -10
        },
        effort: 'medium'
      });
    }

    return recommendations;
  }

  private async generateSecurityRecommendations(agentId: string, metrics: HealthMetrics, health: HealthAssessment): Promise<AnalyticsRecommendation[]> {
    const recommendations: AnalyticsRecommendation[] = [];

    // Add security recommendations based on patterns
    if (metrics.performance.errorRate.current > 10) {
      recommendations.push({
        recommendationId: this.generateRecommendationId(),
        type: 'security',
        priority: 'medium',
        description: 'High error rate may indicate security issues',
        actions: [
          {
            actionId: 'audit_security_logs',
            type: 'maintenance',
            description: 'Perform security audit and log analysis',
            parameters: {},
            automation: false
          }
        ],
        expectedImpact: {
          performance: 0,
          stability: 15,
          cost: -5,
          risk: -25
        },
        effort: 'medium'
      });
    }

    return recommendations;
  }

  private async generatePredictiveRecommendations(agentId: string, predictions: PerformancePrediction[]): Promise<AnalyticsRecommendation[]> {
    const recommendations: AnalyticsRecommendation[] = [];

    // Analyze predictions and generate proactive recommendations
    for (const prediction of predictions) {
      if (prediction.trend === 'up' && prediction.metric === 'response_time') {
        recommendations.push({
          recommendationId: this.generateRecommendationId(),
          type: 'optimization',
          priority: 'medium',
          description: `Predicted increase in ${prediction.metric} over ${prediction.timeHorizon}`,
          actions: [
            {
              actionId: 'preemptive_optimization',
              type: 'optimization',
              description: 'Apply preemptive performance optimizations',
              parameters: {},
              automation: true
            }
          ],
          expectedImpact: {
            performance: 20,
            stability: 10,
            cost: -5,
            risk: 5
          },
          effort: 'low'
        });
      }
    }

    return recommendations;
  }

  private async updateHealthTrends(agentId: string): Promise<void> {
    // Update health trends for the agent
    // This would analyze historical data and update trend indicators
  }

  private async updateAgentModels(agentId: string): Promise<void> {
    // Update ML models with new data
    // This would retrain models with recent historical data
    const history = this.agentHistories.get(agentId);
    if (history && history.length > 50) {
      // Simulated model update
      const model = this.predictionModels.get(agentId);
      if (model) {
        model.lastTrainingDate = new Date();
        model.accuracy = Math.min(0.99, model.accuracy + 0.01); // Gradually improve accuracy
      }
    }
  }

  private generateAnalysisId(): string {
    return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAnomalyId(): string {
    return `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRecommendationId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
