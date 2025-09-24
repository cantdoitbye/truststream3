/**
 * Agent Health Monitor - Main Implementation
 * 
 * Comprehensive health monitoring and auto-recovery system for governance agents
 * providing real-time metrics collection, predictive analytics, and automated recovery.
 */

import { EventEmitter } from 'events';
import { 
  IAgentHealthMonitor,
  MonitoringSystemConfig,
  AgentHealthStatus,
  HealthMetrics,
  Alert,
  ActiveAlert,
  PredictiveAnalysis,
  AnomalyDetection,
  AnalyticsRecommendation,
  RecoveryExecution,
  RecoveryStepExecution,
  DashboardData,
  SystemOverview,
  HealthLevel,
  SeverityLevel
} from './interfaces';

import { MetricsCollector } from './components/MetricsCollector';
import { HealthAnalyzer } from './components/HealthAnalyzer';
import { AlertingSystem } from './components/AlertingSystem';
import { RecoveryEngine } from './components/RecoveryEngine';
import { MonitoringDashboard } from './components/MonitoringDashboard';
import { DataStore } from './components/DataStore';

export class AgentHealthMonitor extends EventEmitter implements IAgentHealthMonitor {
  private config: MonitoringSystemConfig;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private registeredAgents: Map<string, any> = new Map();
  
  // Core components
  private metricsCollector: MetricsCollector;
  private healthAnalyzer: HealthAnalyzer;
  private alertingSystem: AlertingSystem;
  private recoveryEngine: RecoveryEngine;
  private dashboard: MonitoringDashboard;
  private dataStore: DataStore;
  
  // Monitoring intervals
  private monitoringInterval?: NodeJS.Timeout;
  private analyticsInterval?: NodeJS.Timeout;
  
  constructor(config: MonitoringSystemConfig) {
    super();
    this.config = this.validateAndNormalizeConfig(config);
    this.initializeComponents();
    this.setupEventHandlers();
  }

  // ===== CORE MONITORING OPERATIONS =====

  async startMonitoring(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Monitoring is already running');
    }

    try {
      console.log(`[${new Date().toISOString()}] Starting Agent Health Monitor`);
      
      // Initialize data store
      await this.dataStore.initialize();
      
      // Start components
      await this.metricsCollector.start();
      await this.healthAnalyzer.start();
      await this.alertingSystem.start();
      await this.recoveryEngine.start();
      
      if (this.config.dashboard.enableDashboard) {
        await this.dashboard.start();
      }
      
      // Start monitoring intervals
      this.startMonitoringLoops();
      
      this.isRunning = true;
      this.isPaused = false;
      
      this.emit('monitoring:started', { timestamp: new Date() });
      console.log(`[${new Date().toISOString()}] Agent Health Monitor started successfully`);
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to start monitoring:`, error);
      throw new Error(`Failed to start monitoring: ${error.message}`);
    }
  }

  async stopMonitoring(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      console.log(`[${new Date().toISOString()}] Stopping Agent Health Monitor`);
      
      // Stop monitoring intervals
      this.stopMonitoringLoops();
      
      // Stop components
      await this.metricsCollector.stop();
      await this.healthAnalyzer.stop();
      await this.alertingSystem.stop();
      await this.recoveryEngine.stop();
      await this.dashboard.stop();
      
      // Close data store
      await this.dataStore.close();
      
      this.isRunning = false;
      this.isPaused = false;
      
      this.emit('monitoring:stopped', { timestamp: new Date() });
      console.log(`[${new Date().toISOString()}] Agent Health Monitor stopped successfully`);
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error stopping monitoring:`, error);
      throw error;
    }
  }

  async pauseMonitoring(): Promise<void> {
    if (!this.isRunning || this.isPaused) {
      return;
    }

    console.log(`[${new Date().toISOString()}] Pausing Agent Health Monitor`);
    
    this.stopMonitoringLoops();
    await this.metricsCollector.pause();
    
    this.isPaused = true;
    this.emit('monitoring:paused', { timestamp: new Date() });
  }

  async resumeMonitoring(): Promise<void> {
    if (!this.isRunning || !this.isPaused) {
      return;
    }

    console.log(`[${new Date().toISOString()}] Resuming Agent Health Monitor`);
    
    await this.metricsCollector.resume();
    this.startMonitoringLoops();
    
    this.isPaused = false;
    this.emit('monitoring:resumed', { timestamp: new Date() });
  }

  // ===== AGENT MANAGEMENT =====

  async registerAgent(agentId: string, config: any): Promise<void> {
    if (this.registeredAgents.has(agentId)) {
      throw new Error(`Agent ${agentId} is already registered`);
    }

    console.log(`[${new Date().toISOString()}] Registering agent: ${agentId}`);
    
    this.registeredAgents.set(agentId, {
      ...config,
      registeredAt: new Date(),
      lastSeen: new Date()
    });

    await this.metricsCollector.registerAgent(agentId, config);
    await this.healthAnalyzer.registerAgent(agentId, config);
    await this.recoveryEngine.registerAgent(agentId, config);

    this.emit('agent:registered', { agentId, config, timestamp: new Date() });
  }

  async unregisterAgent(agentId: string): Promise<void> {
    if (!this.registeredAgents.has(agentId)) {
      throw new Error(`Agent ${agentId} is not registered`);
    }

    console.log(`[${new Date().toISOString()}] Unregistering agent: ${agentId}`);
    
    await this.metricsCollector.unregisterAgent(agentId);
    await this.healthAnalyzer.unregisterAgent(agentId);
    await this.recoveryEngine.unregisterAgent(agentId);
    
    this.registeredAgents.delete(agentId);

    this.emit('agent:unregistered', { agentId, timestamp: new Date() });
  }

  async getAgentHealth(agentId: string): Promise<AgentHealthStatus> {
    if (!this.registeredAgents.has(agentId)) {
      throw new Error(`Agent ${agentId} is not registered`);
    }

    const metrics = await this.metricsCollector.getLatestMetrics(agentId);
    const health = await this.healthAnalyzer.assessHealth(agentId, metrics);
    const alerts = await this.alertingSystem.getActiveAlertsForAgent(agentId);
    const agentConfig = this.registeredAgents.get(agentId);

    return {
      agentId,
      timestamp: new Date(),
      overallHealth: health.overallHealth,
      components: health.components,
      metrics: metrics,
      alerts: alerts,
      lastHeartbeat: agentConfig.lastSeen,
      uptime: Date.now() - agentConfig.registeredAt.getTime(),
      version: agentConfig.version || 'unknown'
    };
  }

  async getAllAgentsHealth(): Promise<AgentHealthStatus[]> {
    const healthStatuses: AgentHealthStatus[] = [];
    
    for (const agentId of this.registeredAgents.keys()) {
      try {
        const health = await this.getAgentHealth(agentId);
        healthStatuses.push(health);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error getting health for agent ${agentId}:`, error);
        // Continue with other agents
      }
    }
    
    return healthStatuses;
  }

  // ===== METRICS OPERATIONS =====

  async collectMetrics(agentId: string): Promise<HealthMetrics> {
    if (!this.registeredAgents.has(agentId)) {
      throw new Error(`Agent ${agentId} is not registered`);
    }

    return await this.metricsCollector.collectMetrics(agentId);
  }

  async streamMetrics(agentId: string, callback: (metrics: HealthMetrics) => void): Promise<void> {
    if (!this.registeredAgents.has(agentId)) {
      throw new Error(`Agent ${agentId} is not registered`);
    }

    return this.metricsCollector.streamMetrics(agentId, callback);
  }

  async getMetricsHistory(agentId: string, timeRange: string): Promise<HealthMetrics[]> {
    return await this.dataStore.getMetricsHistory(agentId, timeRange);
  }

  // ===== ANALYTICS OPERATIONS =====

  async runPredictiveAnalysis(agentId: string): Promise<PredictiveAnalysis> {
    if (!this.registeredAgents.has(agentId)) {
      throw new Error(`Agent ${agentId} is not registered`);
    }

    return await this.healthAnalyzer.runPredictiveAnalysis(agentId);
  }

  async detectAnomalies(agentId: string): Promise<AnomalyDetection[]> {
    if (!this.registeredAgents.has(agentId)) {
      throw new Error(`Agent ${agentId} is not registered`);
    }

    return await this.healthAnalyzer.detectAnomalies(agentId);
  }

  async generateRecommendations(agentId: string): Promise<AnalyticsRecommendation[]> {
    if (!this.registeredAgents.has(agentId)) {
      throw new Error(`Agent ${agentId} is not registered`);
    }

    return await this.healthAnalyzer.generateRecommendations(agentId);
  }

  // ===== ALERTING OPERATIONS =====

  async createAlert(alert: Omit<Alert, 'alertId' | 'timestamp'>): Promise<Alert> {
    return await this.alertingSystem.createAlert(alert);
  }

  async acknowledgeAlert(alertId: string, acknowledgedBy: string, comment?: string): Promise<void> {
    await this.alertingSystem.acknowledgeAlert(alertId, acknowledgedBy, comment);
  }

  async resolveAlert(alertId: string, resolvedBy: string, resolution: string): Promise<void> {
    await this.alertingSystem.resolveAlert(alertId, resolvedBy, resolution);
  }

  async getActiveAlerts(agentId?: string): Promise<ActiveAlert[]> {
    return await this.alertingSystem.getActiveAlerts(agentId);
  }

  // ===== RECOVERY OPERATIONS =====

  async triggerRecovery(agentId: string, procedureId: string, triggeredBy: string): Promise<RecoveryExecution> {
    if (!this.registeredAgents.has(agentId)) {
      throw new Error(`Agent ${agentId} is not registered`);
    }

    return await this.recoveryEngine.triggerRecovery(agentId, procedureId, triggeredBy);
  }

  async executeRecoveryStep(executionId: string, stepId: string): Promise<RecoveryStepExecution> {
    return await this.recoveryEngine.executeStep(executionId, stepId);
  }

  async rollbackRecovery(executionId: string): Promise<void> {
    await this.recoveryEngine.rollbackRecovery(executionId);
  }

  async getRecoveryStatus(executionId: string): Promise<RecoveryExecution> {
    return await this.recoveryEngine.getRecoveryStatus(executionId);
  }

  // ===== DASHBOARD OPERATIONS =====

  async getDashboardData(): Promise<DashboardData> {
    const overview = await this.getSystemOverview();
    const agents = await this.getAllAgentsHealth();
    const alerts = await this.getActiveAlerts();
    
    return {
      timestamp: new Date(),
      overview,
      agents: agents.map(agent => ({
        agentId: agent.agentId,
        name: agent.agentId, // Could be enhanced with proper naming
        type: 'governance', // Could be enhanced with agent types
        health: agent.overallHealth,
        uptime: agent.uptime,
        activeAlerts: agent.alerts.length,
        lastSeen: agent.lastHeartbeat,
        key_metrics: {
          responseTime: agent.metrics.performance.responseTime.current,
          errorRate: agent.metrics.performance.errorRate.current,
          cpuUsage: agent.metrics.resource.cpu.percentage
        }
      })),
      alerts: {
        total: alerts.length,
        critical: alerts.filter(a => a.severity === 'critical').length,
        warning: alerts.filter(a => a.severity === 'warning').length,
        info: alerts.filter(a => a.severity === 'info').length,
        acknowledged: alerts.filter(a => a.acknowledgments.length > 0).length,
        recent: alerts.slice(0, 10)
      },
      performance: {
        averageResponseTime: agents.reduce((sum, a) => sum + a.metrics.performance.responseTime.current, 0) / agents.length || 0,
        totalRequests: agents.reduce((sum, a) => sum + (a.metrics.performance.throughput.current * 3600), 0), // Convert to hourly
        errorRate: agents.reduce((sum, a) => sum + a.metrics.performance.errorRate.current, 0) / agents.length || 0,
        throughput: agents.reduce((sum, a) => sum + a.metrics.performance.throughput.current, 0),
        topPerformers: agents.filter(a => a.health === 'healthy').slice(0, 5),
        underPerformers: agents.filter(a => a.health === 'unhealthy' || a.health === 'critical').slice(0, 5)
      },
      trends: {
        performance: 'stable',
        availability: 'stable',
        errorRate: 'stable',
        resourceUtilization: 'stable',
        predictions: ['System performance is expected to remain stable over the next 24 hours']
      },
      recovery: {
        totalRecoveries: 0, // Would be populated from actual recovery history
        successfulRecoveries: 0,
        failedRecoveries: 0,
        averageRecoveryTime: 0,
        recentRecoveries: []
      }
    };
  }

  async getSystemOverview(): Promise<SystemOverview> {
    const agents = await this.getAllAgentsHealth();
    const totalAgents = agents.length;
    const healthyAgents = agents.filter(a => a.overallHealth === 'healthy').length;
    const unhealthyAgents = agents.filter(a => a.overallHealth === 'unhealthy').length;
    const criticalAgents = agents.filter(a => a.overallHealth === 'critical').length;

    return {
      totalAgents,
      healthyAgents,
      unhealthyAgents,
      criticalAgents,
      overallHealthScore: totalAgents > 0 ? (healthyAgents / totalAgents) * 100 : 100,
      systemUptime: this.isRunning ? Date.now() - (this.registeredAgents.size > 0 ? 
        Math.min(...Array.from(this.registeredAgents.values()).map(a => a.registeredAt.getTime())) : 
        Date.now()) : 0,
      lastUpdate: new Date()
    };
  }

  async exportMetrics(format: 'json' | 'csv' | 'prometheus'): Promise<string> {
    const agents = await this.getAllAgentsHealth();
    
    switch (format) {
      case 'json':
        return JSON.stringify(agents, null, 2);
      
      case 'csv':
        const headers = ['agentId', 'health', 'uptime', 'responseTime', 'errorRate', 'cpuUsage'];
        const rows = agents.map(agent => [
          agent.agentId,
          agent.overallHealth,
          agent.uptime,
          agent.metrics.performance.responseTime.current,
          agent.metrics.performance.errorRate.current,
          agent.metrics.resource.cpu.percentage
        ]);
        return [headers.join(','), ...rows.map(row => row.join(','))].join('\\n');
      
      case 'prometheus':
        let prometheusMetrics = '';
        agents.forEach(agent => {
          prometheusMetrics += `agent_health{agent_id="${agent.agentId}"} ${agent.overallHealth === 'healthy' ? 1 : 0}\\n`;
          prometheusMetrics += `agent_response_time{agent_id="${agent.agentId}"} ${agent.metrics.performance.responseTime.current}\\n`;
          prometheusMetrics += `agent_error_rate{agent_id="${agent.agentId}"} ${agent.metrics.performance.errorRate.current}\\n`;
        });
        return prometheusMetrics;
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // ===== CONFIGURATION OPERATIONS =====

  async updateConfig(config: Partial<MonitoringSystemConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    
    // Update component configurations
    await this.metricsCollector.updateConfig(this.config.metrics);
    await this.healthAnalyzer.updateConfig(this.config.analytics);
    await this.alertingSystem.updateConfig(this.config.alerting);
    await this.recoveryEngine.updateConfig(this.config.recovery);
    
    this.emit('config:updated', { config: this.config, timestamp: new Date() });
  }

  getConfig(): MonitoringSystemConfig {
    return { ...this.config };
  }

  validateConfig(config: MonitoringSystemConfig): boolean {
    try {
      this.validateAndNormalizeConfig(config);
      return true;
    } catch (error) {
      console.error('Config validation failed:', error);
      return false;
    }
  }

  // ===== PRIVATE METHODS =====

  private validateAndNormalizeConfig(config: MonitoringSystemConfig): MonitoringSystemConfig {
    // Validate required fields
    if (!config.systemId) {
      throw new Error('systemId is required');
    }
    
    if (!config.environment) {
      throw new Error('environment is required');
    }

    // Set defaults for missing configuration
    const defaultConfig: MonitoringSystemConfig = {
      systemId: config.systemId,
      environment: config.environment,
      metrics: {
        collectionInterval: 5000,
        batchSize: 100,
        retentionPeriod: '7d',
        enableStreaming: true,
        streamingPort: 8080,
        compressionEnabled: true,
        aggregationRules: [],
        ...config.metrics
      },
      analytics: {
        enablePredictiveAnalytics: true,
        modelUpdateInterval: 3600000,
        anomalyDetection: {
          enabled: true,
          algorithm: 'hybrid',
          sensitivity: 0.95,
          lookbackWindow: '1h',
          minDataPoints: 10
        },
        performancePrediction: {
          enabled: true,
          horizons: ['1h', '24h', '7d'],
          updateInterval: '1h',
          accuracy_threshold: 0.8
        },
        trendAnalysis: {
          enabled: true,
          window: '24h',
          sensitivity: 0.1,
          seasonality: true
        },
        ...config.analytics
      },
      alerting: {
        enableAlerting: true,
        severityThresholds: {
          warning: 70,
          critical: 90,
          emergency: 95
        },
        notificationChannels: [],
        escalationRules: [],
        suppressionRules: [],
        acknowledgmentTimeout: 300000,
        ...config.alerting
      },
      recovery: {
        enableAutoRecovery: true,
        maxRetryAttempts: 3,
        retryBackoffStrategy: 'exponential',
        escalationTimeout: 600000,
        failoverEnabled: true,
        rollbackEnabled: true,
        emergencyProtocols: [],
        ...config.recovery
      },
      dashboard: {
        enableDashboard: true,
        port: 3000,
        theme: 'auto',
        refreshInterval: 5000,
        maxDisplayedAlerts: 50,
        enableExports: true,
        customizations: [],
        ...config.dashboard
      },
      storage: {
        type: 'postgresql',
        connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/monitoring',
        replicationFactor: 1,
        partitionStrategy: 'time',
        compressionLevel: 6,
        ...config.storage
      }
    };

    return defaultConfig;
  }

  private initializeComponents(): void {
    this.dataStore = new DataStore(this.config.storage);
    this.metricsCollector = new MetricsCollector(this.config.metrics, this.dataStore);
    this.healthAnalyzer = new HealthAnalyzer(this.config.analytics, this.dataStore);
    this.alertingSystem = new AlertingSystem(this.config.alerting, this.dataStore);
    this.recoveryEngine = new RecoveryEngine(this.config.recovery, this.dataStore);
    this.dashboard = new MonitoringDashboard(this.config.dashboard, this);
  }

  private setupEventHandlers(): void {
    // Handle health status changes
    this.healthAnalyzer.on('health:degraded', async (event) => {
      await this.handleHealthDegradation(event);
    });

    this.healthAnalyzer.on('anomaly:detected', async (event) => {
      await this.handleAnomalyDetection(event);
    });

    // Handle alert events
    this.alertingSystem.on('alert:created', (event) => {
      this.emit('alert:created', event);
    });

    this.alertingSystem.on('alert:escalated', async (event) => {
      await this.handleAlertEscalation(event);
    });

    // Handle recovery events
    this.recoveryEngine.on('recovery:completed', (event) => {
      this.emit('recovery:completed', event);
    });

    this.recoveryEngine.on('recovery:failed', async (event) => {
      await this.handleRecoveryFailure(event);
    });
  }

  private startMonitoringLoops(): void {
    // Main monitoring loop
    this.monitoringInterval = setInterval(async () => {
      if (this.isPaused) return;
      
      try {
        await this.performMonitoringCycle();
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Monitoring cycle error:`, error);
      }
    }, this.config.metrics.collectionInterval);

    // Analytics loop
    this.analyticsInterval = setInterval(async () => {
      if (this.isPaused) return;
      
      try {
        await this.performAnalyticsCycle();
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Analytics cycle error:`, error);
      }
    }, this.config.analytics.modelUpdateInterval);
  }

  private stopMonitoringLoops(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    if (this.analyticsInterval) {
      clearInterval(this.analyticsInterval);
      this.analyticsInterval = undefined;
    }
  }

  private async performMonitoringCycle(): Promise<void> {
    for (const agentId of this.registeredAgents.keys()) {
      try {
        // Collect metrics
        const metrics = await this.metricsCollector.collectMetrics(agentId);
        
        // Assess health
        const health = await this.healthAnalyzer.assessHealth(agentId, metrics);
        
        // Check for alerts
        await this.alertingSystem.checkThresholds(agentId, metrics);
        
        // Update last seen
        const agentConfig = this.registeredAgents.get(agentId);
        if (agentConfig) {
          agentConfig.lastSeen = new Date();
        }
        
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error monitoring agent ${agentId}:`, error);
      }
    }
  }

  private async performAnalyticsCycle(): Promise<void> {
    for (const agentId of this.registeredAgents.keys()) {
      try {
        // Run predictive analysis
        await this.healthAnalyzer.runPredictiveAnalysis(agentId);
        
        // Detect anomalies
        await this.healthAnalyzer.detectAnomalies(agentId);
        
        // Generate recommendations
        await this.healthAnalyzer.generateRecommendations(agentId);
        
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in analytics cycle for agent ${agentId}:`, error);
      }
    }
  }

  private async handleHealthDegradation(event: any): Promise<void> {
    const { agentId, previousHealth, currentHealth, metrics } = event;
    
    console.log(`[${new Date().toISOString()}] Health degradation detected for agent ${agentId}: ${previousHealth} -> ${currentHealth}`);
    
    // Create alert
    await this.createAlert({
      agentId,
      type: 'availability',
      severity: this.mapHealthToSeverity(currentHealth),
      title: `Agent Health Degraded: ${agentId}`,
      description: `Agent health changed from ${previousHealth} to ${currentHealth}`,
      status: 'active',
      acknowledgments: [],
      escalations: [],
      tags: ['health', 'degradation']
    });

    // Trigger auto-recovery if enabled
    if (this.config.recovery.enableAutoRecovery && currentHealth === 'critical') {
      await this.triggerRecovery(agentId, 'health_degradation_recovery', 'system');
    }
  }

  private async handleAnomalyDetection(event: any): Promise<void> {
    const { agentId, anomaly } = event;
    
    console.log(`[${new Date().toISOString()}] Anomaly detected for agent ${agentId}: ${anomaly.type}`);
    
    // Create alert
    await this.createAlert({
      agentId,
      type: 'anomaly',
      severity: this.mapAnomalySeverityToAlertSeverity(anomaly.severity),
      title: `Anomaly Detected: ${anomaly.type}`,
      description: `Anomaly detected in metric ${anomaly.metric}: observed ${anomaly.observedValue}, expected ${anomaly.expectedValue}`,
      metric: anomaly.metric,
      threshold: anomaly.expectedValue,
      actualValue: anomaly.observedValue,
      status: 'active',
      acknowledgments: [],
      escalations: [],
      tags: ['anomaly', anomaly.type]
    });
  }

  private async handleAlertEscalation(event: any): Promise<void> {
    const { alertId, escalation } = event;
    
    console.log(`[${new Date().toISOString()}] Alert ${alertId} escalated to level ${escalation.level}`);
    
    // Additional escalation logic could be implemented here
  }

  private async handleRecoveryFailure(event: any): Promise<void> {
    const { executionId, agentId, error } = event;
    
    console.log(`[${new Date().toISOString()}] Recovery failed for agent ${agentId}: ${error}`);
    
    // Create critical alert
    await this.createAlert({
      agentId,
      type: 'availability',
      severity: 'critical',
      title: `Recovery Failed: ${agentId}`,
      description: `Automated recovery failed: ${error}`,
      status: 'active',
      acknowledgments: [],
      escalations: [],
      tags: ['recovery', 'failure']
    });
  }

  private mapHealthToSeverity(health: HealthLevel): SeverityLevel {
    const mapping: Record<HealthLevel, SeverityLevel> = {
      'healthy': 'info',
      'degraded': 'warning',
      'unhealthy': 'warning',
      'critical': 'critical',
      'unknown': 'warning'
    };
    return mapping[health] || 'warning';
  }

  private mapAnomalySeverityToAlertSeverity(severity: SeverityLevel): SeverityLevel {
    return severity; // Direct mapping for now
  }
}

// Factory function for easier instantiation
export function createAgentHealthMonitor(config: MonitoringSystemConfig): AgentHealthMonitor {
  return new AgentHealthMonitor(config);
}

// Export configuration helpers
export function createDefaultConfig(systemId: string, environment: 'development' | 'staging' | 'production'): MonitoringSystemConfig {
  return {
    systemId,
    environment,
    metrics: {
      collectionInterval: 5000,
      batchSize: 100,
      retentionPeriod: '7d',
      enableStreaming: true,
      streamingPort: 8080,
      compressionEnabled: true,
      aggregationRules: []
    },
    analytics: {
      enablePredictiveAnalytics: true,
      modelUpdateInterval: 3600000,
      anomalyDetection: {
        enabled: true,
        algorithm: 'hybrid',
        sensitivity: 0.95,
        lookbackWindow: '1h',
        minDataPoints: 10
      },
      performancePrediction: {
        enabled: true,
        horizons: ['1h', '24h', '7d'],
        updateInterval: '1h',
        accuracy_threshold: 0.8
      },
      trendAnalysis: {
        enabled: true,
        window: '24h',
        sensitivity: 0.1,
        seasonality: true
      }
    },
    alerting: {
      enableAlerting: true,
      severityThresholds: {
        warning: 70,
        critical: 90,
        emergency: 95
      },
      notificationChannels: [],
      escalationRules: [],
      suppressionRules: [],
      acknowledgmentTimeout: 300000
    },
    recovery: {
      enableAutoRecovery: true,
      maxRetryAttempts: 3,
      retryBackoffStrategy: 'exponential',
      escalationTimeout: 600000,
      failoverEnabled: true,
      rollbackEnabled: true,
      emergencyProtocols: []
    },
    dashboard: {
      enableDashboard: true,
      port: 3000,
      theme: 'auto',
      refreshInterval: 5000,
      maxDisplayedAlerts: 50,
      enableExports: true,
      customizations: []
    },
    storage: {
      type: 'postgresql',
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/monitoring',
      replicationFactor: 1,
      partitionStrategy: 'time',
      compressionLevel: 6
    }
  };
}
