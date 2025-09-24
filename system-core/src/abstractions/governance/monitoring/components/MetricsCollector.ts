/**
 * Metrics Collector Component
 * 
 * Real-time collection and streaming of agent health metrics with
 * comprehensive performance, resource, governance, and system monitoring.
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { 
  MetricsConfig, 
  HealthMetrics, 
  PerformanceMetrics,
  ResourceMetrics,
  GovernanceMetrics,
  SystemMetrics,
  MetricValue,
  ResourceUtilization,
  LatencyMetrics,
  NetworkMetrics,
  ConnectionMetrics,
  TrendDirection
} from '../interfaces';

import { DataStore } from './DataStore';

export class MetricsCollector extends EventEmitter {
  private config: MetricsConfig;
  private dataStore: DataStore;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  
  // Registered agents and their configurations
  private registeredAgents: Map<string, any> = new Map();
  
  // Collection intervals per agent
  private collectionIntervals: Map<string, NodeJS.Timeout> = new Map();
  
  // WebSocket server for streaming
  private wsServer?: WebSocket.Server;
  private streamingConnections: Map<string, Set<WebSocket>> = new Map();
  
  // Metrics cache for batching
  private metricsBuffer: Map<string, HealthMetrics[]> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: MetricsConfig, dataStore: DataStore) {
    super();
    this.config = config;
    this.dataStore = dataStore;
  }

  // ===== LIFECYCLE METHODS =====

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('MetricsCollector is already running');
    }

    console.log(`[${new Date().toISOString()}] Starting MetricsCollector`);

    // Initialize WebSocket server for streaming
    if (this.config.enableStreaming) {
      await this.initializeWebSocketServer();
    }

    // Start collection for registered agents
    for (const [agentId] of this.registeredAgents) {
      await this.startAgentCollection(agentId);
    }

    this.isRunning = true;
    this.emit('collector:started', { timestamp: new Date() });
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log(`[${new Date().toISOString()}] Stopping MetricsCollector`);

    // Stop all collection intervals
    for (const [agentId] of this.registeredAgents) {
      await this.stopAgentCollection(agentId);
    }

    // Flush remaining batched metrics
    await this.flushAllBatches();

    // Close WebSocket server
    if (this.wsServer) {
      this.wsServer.close();
      this.wsServer = undefined;
    }

    this.isRunning = false;
    this.emit('collector:stopped', { timestamp: new Date() });
  }

  async pause(): Promise<void> {
    if (!this.isRunning || this.isPaused) {
      return;
    }

    console.log(`[${new Date().toISOString()}] Pausing MetricsCollector`);

    // Pause all collection intervals
    for (const [agentId] of this.registeredAgents) {
      this.pauseAgentCollection(agentId);
    }

    this.isPaused = true;
    this.emit('collector:paused', { timestamp: new Date() });
  }

  async resume(): Promise<void> {
    if (!this.isRunning || !this.isPaused) {
      return;
    }

    console.log(`[${new Date().toISOString()}] Resuming MetricsCollector`);

    // Resume all collection intervals
    for (const [agentId] of this.registeredAgents) {
      await this.startAgentCollection(agentId);
    }

    this.isPaused = false;
    this.emit('collector:resumed', { timestamp: new Date() });
  }

  // ===== AGENT MANAGEMENT =====

  async registerAgent(agentId: string, config: any): Promise<void> {
    console.log(`[${new Date().toISOString()}] Registering agent for metrics collection: ${agentId}`);

    this.registeredAgents.set(agentId, {
      ...config,
      registeredAt: new Date(),
      metricsConfig: {
        collectionInterval: config.metricsConfig?.collectionInterval || this.config.collectionInterval,
        customMetrics: config.metricsConfig?.customMetrics || []
      }
    });

    // Initialize metrics buffer
    this.metricsBuffer.set(agentId, []);

    // Start collection if running
    if (this.isRunning && !this.isPaused) {
      await this.startAgentCollection(agentId);
    }

    this.emit('agent:registered', { agentId, config, timestamp: new Date() });
  }

  async unregisterAgent(agentId: string): Promise<void> {
    console.log(`[${new Date().toISOString()}] Unregistering agent from metrics collection: ${agentId}`);

    await this.stopAgentCollection(agentId);
    await this.flushAgentBatch(agentId);

    this.registeredAgents.delete(agentId);
    this.metricsBuffer.delete(agentId);

    // Close streaming connections for this agent
    const connections = this.streamingConnections.get(agentId);
    if (connections) {
      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      });
      this.streamingConnections.delete(agentId);
    }

    this.emit('agent:unregistered', { agentId, timestamp: new Date() });
  }

  // ===== METRICS COLLECTION =====

  async collectMetrics(agentId: string): Promise<HealthMetrics> {
    if (!this.registeredAgents.has(agentId)) {
      throw new Error(`Agent ${agentId} is not registered`);
    }

    const agentConfig = this.registeredAgents.get(agentId);
    const timestamp = new Date();

    try {
      // Collect all metric categories
      const performance = await this.collectPerformanceMetrics(agentId, agentConfig);
      const resource = await this.collectResourceMetrics(agentId, agentConfig);
      const governance = await this.collectGovernanceMetrics(agentId, agentConfig);
      const system = await this.collectSystemMetrics(agentId, agentConfig);
      const custom = await this.collectCustomMetrics(agentId, agentConfig);

      const metrics: HealthMetrics = {
        performance,
        resource,
        governance,
        system,
        custom
      };

      // Store in buffer for batching
      this.addToBatch(agentId, metrics);

      // Stream metrics if enabled
      if (this.config.enableStreaming) {
        this.streamMetricsToClients(agentId, metrics);
      }

      this.emit('metrics:collected', { agentId, metrics, timestamp });

      return metrics;

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error collecting metrics for agent ${agentId}:`, error);
      this.emit('metrics:error', { agentId, error: error.message, timestamp });
      throw error;
    }
  }

  async streamMetrics(agentId: string, callback: (metrics: HealthMetrics) => void): Promise<void> {
    if (!this.config.enableStreaming) {
      throw new Error('Streaming is not enabled');
    }

    // This would typically involve WebSocket connections, but for the callback approach
    // we'll set up a custom event listener
    const handler = (event: any) => {
      if (event.agentId === agentId) {
        callback(event.metrics);
      }
    };

    this.on('metrics:collected', handler);

    // Return a promise that resolves when streaming is stopped
    return new Promise((resolve) => {
      // Store the handler for cleanup
      const cleanup = () => {
        this.removeListener('metrics:collected', handler);
        resolve();
      };

      // Allow cleanup via events
      this.once(`streaming:stop:${agentId}`, cleanup);
    });
  }

  async getLatestMetrics(agentId: string): Promise<HealthMetrics> {
    // Try to get from recent buffer first
    const buffer = this.metricsBuffer.get(agentId);
    if (buffer && buffer.length > 0) {
      return buffer[buffer.length - 1];
    }

    // Otherwise collect fresh metrics
    return await this.collectMetrics(agentId);
  }

  async updateConfig(config: MetricsConfig): Promise<void> {
    const oldConfig = this.config;
    this.config = { ...this.config, ...config };

    // Restart streaming server if port changed
    if (oldConfig.streamingPort !== config.streamingPort && this.config.enableStreaming) {
      if (this.wsServer) {
        this.wsServer.close();
      }
      await this.initializeWebSocketServer();
    }

    // Update collection intervals if changed
    if (oldConfig.collectionInterval !== config.collectionInterval) {
      for (const [agentId] of this.registeredAgents) {
        await this.stopAgentCollection(agentId);
        await this.startAgentCollection(agentId);
      }
    }

    this.emit('config:updated', { config: this.config, timestamp: new Date() });
  }

  // ===== PRIVATE COLLECTION METHODS =====

  private async collectPerformanceMetrics(agentId: string, agentConfig: any): Promise<PerformanceMetrics> {
    // In a real implementation, these would connect to actual monitoring endpoints
    // For now, we'll simulate realistic metrics with some variability

    const baseResponseTime = 50 + Math.random() * 100;
    const baseErrorRate = Math.random() * 5;
    const baseThroughput = 100 + Math.random() * 50;

    return {
      responseTime: this.createMetricValue(baseResponseTime, 'ms'),
      throughput: this.createMetricValue(baseThroughput, 'req/s'),
      errorRate: this.createMetricValue(baseErrorRate, '%'),
      successRate: this.createMetricValue(100 - baseErrorRate, '%'),
      latency: {
        p50: baseResponseTime * 0.7,
        p90: baseResponseTime * 1.5,
        p95: baseResponseTime * 2.0,
        p99: baseResponseTime * 3.0,
        mean: baseResponseTime,
        unit: 'ms'
      },
      availability: this.createMetricValue(99.5 + Math.random() * 0.5, '%')
    };
  }

  private async collectResourceMetrics(agentId: string, agentConfig: any): Promise<ResourceMetrics> {
    const cpuUsage = Math.random() * 80;
    const memoryUsage = 60 + Math.random() * 30;
    const diskUsage = 40 + Math.random() * 20;

    return {
      cpu: {
        used: cpuUsage,
        total: 100,
        percentage: cpuUsage,
        trend: this.getTrendDirection(cpuUsage, 50),
        threshold: {
          warning: 70,
          critical: 90,
          emergency: 95
        }
      },
      memory: {
        used: memoryUsage,
        total: 100,
        percentage: memoryUsage,
        trend: this.getTrendDirection(memoryUsage, 75),
        threshold: {
          warning: 80,
          critical: 90,
          emergency: 95
        }
      },
      disk: {
        used: diskUsage,
        total: 100,
        percentage: diskUsage,
        trend: this.getTrendDirection(diskUsage, 60),
        threshold: {
          warning: 80,
          critical: 90,
          emergency: 95
        }
      },
      network: {
        bytesIn: this.createMetricValue(1000 + Math.random() * 5000, 'bytes/s'),
        bytesOut: this.createMetricValue(800 + Math.random() * 3000, 'bytes/s'),
        packetsIn: this.createMetricValue(50 + Math.random() * 200, 'packets/s'),
        packetsOut: this.createMetricValue(40 + Math.random() * 150, 'packets/s'),
        errors: this.createMetricValue(Math.random() * 2, 'errors/s'),
        dropped: this.createMetricValue(Math.random() * 1, 'dropped/s')
      },
      connections: {
        active: Math.floor(10 + Math.random() * 40),
        idle: Math.floor(5 + Math.random() * 20),
        waiting: Math.floor(Math.random() * 10),
        poolSize: 50,
        maxConnections: 100,
        connectionErrors: Math.floor(Math.random() * 3)
      }
    };
  }

  private async collectGovernanceMetrics(agentId: string, agentConfig: any): Promise<GovernanceMetrics> {
    return {
      decisionQuality: this.createMetricValue(85 + Math.random() * 15, 'score'),
      complianceScore: this.createMetricValue(90 + Math.random() * 10, 'score'),
      auditTrailIntegrity: this.createMetricValue(95 + Math.random() * 5, 'score'),
      stakeholderSatisfaction: this.createMetricValue(80 + Math.random() * 20, 'score'),
      ethicsCompliance: this.createMetricValue(92 + Math.random() * 8, 'score'),
      transparencyScore: this.createMetricValue(88 + Math.random() * 12, 'score')
    };
  }

  private async collectSystemMetrics(agentId: string, agentConfig: any): Promise<SystemMetrics> {
    return {
      processCount: Math.floor(5 + Math.random() * 15),
      threadCount: Math.floor(20 + Math.random() * 50),
      fileDescriptors: Math.floor(100 + Math.random() * 400),
      databaseConnections: Math.floor(5 + Math.random() * 25),
      cacheHitRate: this.createMetricValue(85 + Math.random() * 15, '%'),
      queueDepth: Math.floor(Math.random() * 50)
    };
  }

  private async collectCustomMetrics(agentId: string, agentConfig: any): Promise<Record<string, any>> {
    const customMetrics: Record<string, any> = {};
    
    // Collect custom metrics defined in agent configuration
    const customMetricConfigs = agentConfig.metricsConfig?.customMetrics || [];
    
    for (const metricConfig of customMetricConfigs) {
      try {
        // In a real implementation, this would call the actual metric collection method
        customMetrics[metricConfig.name] = await this.collectCustomMetric(agentId, metricConfig);
      } catch (error) {
        console.error(`Error collecting custom metric ${metricConfig.name} for agent ${agentId}:`, error);
        customMetrics[metricConfig.name] = null;
      }
    }

    return customMetrics;
  }

  private async collectCustomMetric(agentId: string, metricConfig: any): Promise<any> {
    // Placeholder for custom metric collection
    // In a real implementation, this would execute the metric collection logic
    // defined in the metricConfig
    return this.createMetricValue(Math.random() * 100, metricConfig.unit || 'units');
  }

  // ===== HELPER METHODS =====

  private createMetricValue(current: number, unit: string): MetricValue {
    // In a real implementation, these would be calculated from historical data
    const variation = current * 0.1;
    return {
      current,
      average: current + (Math.random() - 0.5) * variation,
      min: current - variation,
      max: current + variation,
      trend: this.getTrendDirection(current, current),
      unit,
      timestamp: new Date()
    };
  }

  private getTrendDirection(current: number, baseline: number): TrendDirection {
    const threshold = baseline * 0.05; // 5% threshold
    if (current > baseline + threshold) return 'up';
    if (current < baseline - threshold) return 'down';
    return 'stable';
  }

  private async startAgentCollection(agentId: string): Promise<void> {
    if (this.collectionIntervals.has(agentId)) {
      return; // Already collecting
    }

    const agentConfig = this.registeredAgents.get(agentId);
    const interval = agentConfig?.metricsConfig?.collectionInterval || this.config.collectionInterval;

    const intervalId = setInterval(async () => {
      try {
        await this.collectMetrics(agentId);
      } catch (error) {
        console.error(`Error in collection interval for agent ${agentId}:`, error);
      }
    }, interval);

    this.collectionIntervals.set(agentId, intervalId);

    // Set up batch timer
    const batchTimer = setInterval(async () => {
      await this.flushAgentBatch(agentId);
    }, interval * this.config.batchSize);

    this.batchTimers.set(agentId, batchTimer);
  }

  private async stopAgentCollection(agentId: string): Promise<void> {
    const intervalId = this.collectionIntervals.get(agentId);
    if (intervalId) {
      clearInterval(intervalId);
      this.collectionIntervals.delete(agentId);
    }

    const batchTimer = this.batchTimers.get(agentId);
    if (batchTimer) {
      clearInterval(batchTimer);
      this.batchTimers.delete(agentId);
    }
  }

  private pauseAgentCollection(agentId: string): void {
    const intervalId = this.collectionIntervals.get(agentId);
    if (intervalId) {
      clearInterval(intervalId);
      this.collectionIntervals.delete(agentId);
    }
  }

  private addToBatch(agentId: string, metrics: HealthMetrics): void {
    let buffer = this.metricsBuffer.get(agentId);
    if (!buffer) {
      buffer = [];
      this.metricsBuffer.set(agentId, buffer);
    }

    buffer.push(metrics);

    // Flush if batch size reached
    if (buffer.length >= this.config.batchSize) {
      this.flushAgentBatch(agentId);
    }
  }

  private async flushAgentBatch(agentId: string): Promise<void> {
    const buffer = this.metricsBuffer.get(agentId);
    if (!buffer || buffer.length === 0) {
      return;
    }

    try {
      await this.dataStore.storeMetricsBatch(agentId, buffer);
      this.metricsBuffer.set(agentId, []); // Clear buffer
      
      this.emit('batch:flushed', { 
        agentId, 
        metricsCount: buffer.length, 
        timestamp: new Date() 
      });
      
    } catch (error) {
      console.error(`Error flushing metrics batch for agent ${agentId}:`, error);
      this.emit('batch:error', { agentId, error: error.message, timestamp: new Date() });
    }
  }

  private async flushAllBatches(): Promise<void> {
    const flushPromises = Array.from(this.registeredAgents.keys()).map(agentId => 
      this.flushAgentBatch(agentId)
    );
    
    await Promise.allSettled(flushPromises);
  }

  private async initializeWebSocketServer(): Promise<void> {
    this.wsServer = new WebSocket.Server({ 
      port: this.config.streamingPort,
      perMessageDeflate: this.config.compressionEnabled
    });

    this.wsServer.on('connection', (ws, req) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const agentId = url.searchParams.get('agentId');

      if (!agentId || !this.registeredAgents.has(agentId)) {
        ws.close(1008, 'Invalid or missing agentId');
        return;
      }

      console.log(`[${new Date().toISOString()}] WebSocket connection established for agent: ${agentId}`);

      // Add to streaming connections
      if (!this.streamingConnections.has(agentId)) {
        this.streamingConnections.set(agentId, new Set());
      }
      this.streamingConnections.get(agentId)!.add(ws);

      // Handle disconnection
      ws.on('close', () => {
        const connections = this.streamingConnections.get(agentId);
        if (connections) {
          connections.delete(ws);
          if (connections.size === 0) {
            this.streamingConnections.delete(agentId);
          }
        }
      });

      // Send initial metrics
      this.getLatestMetrics(agentId).then(metrics => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'metrics', data: metrics, timestamp: new Date() }));
        }
      }).catch(error => {
        console.error(`Error sending initial metrics to WebSocket:`, error);
      });
    });

    this.wsServer.on('error', (error) => {
      console.error(`WebSocket server error:`, error);
      this.emit('streaming:error', { error: error.message, timestamp: new Date() });
    });

    console.log(`[${new Date().toISOString()}] WebSocket server started on port ${this.config.streamingPort}`);
  }

  private streamMetricsToClients(agentId: string, metrics: HealthMetrics): void {
    const connections = this.streamingConnections.get(agentId);
    if (!connections || connections.size === 0) {
      return;
    }

    const message = JSON.stringify({
      type: 'metrics',
      agentId,
      data: metrics,
      timestamp: new Date()
    });

    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(message);
        } catch (error) {
          console.error(`Error sending metrics to WebSocket client:`, error);
          // Remove invalid connection
          connections.delete(ws);
        }
      }
    });
  }
}
