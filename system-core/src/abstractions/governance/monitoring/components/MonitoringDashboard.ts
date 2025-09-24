/**
 * Monitoring Dashboard Component
 * 
 * Interactive real-time dashboard for governance agent health monitoring
 * with comprehensive visualization, drill-down analytics, and management interfaces.
 */

import { EventEmitter } from 'events';
import express from 'express';
import { createServer, Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { 
  DashboardConfig,
  DashboardData,
  SystemOverview,
  AgentSummary,
  IAgentHealthMonitor
} from '../interfaces';

interface DashboardClient {
  id: string;
  socket: any;
  connectedAt: Date;
  lastActivity: Date;
  subscribedAgents: string[];
}

interface DashboardMetrics {
  connectedClients: number;
  totalPageViews: number;
  averageSessionDuration: number;
  alertsAcknowledged: number;
  exportRequests: number;
}

export class MonitoringDashboard extends EventEmitter {
  private config: DashboardConfig;
  private healthMonitor: IAgentHealthMonitor;
  private isRunning: boolean = false;
  
  // Express app and servers
  private app: express.Application;
  private server?: Server;
  private io?: SocketIOServer;
  
  // Client management
  private connectedClients: Map<string, DashboardClient> = new Map();
  private dashboardMetrics: DashboardMetrics = {
    connectedClients: 0,
    totalPageViews: 0,
    averageSessionDuration: 0,
    alertsAcknowledged: 0,
    exportRequests: 0
  };
  
  // Update intervals
  private dataUpdateInterval?: NodeJS.Timeout;
  private clientCleanupInterval?: NodeJS.Timeout;

  constructor(config: DashboardConfig, healthMonitor: IAgentHealthMonitor) {
    super();
    this.config = config;
    this.healthMonitor = healthMonitor;
    this.app = express();
    this.setupExpressApp();
  }

  // ===== LIFECYCLE METHODS =====

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('MonitoringDashboard is already running');
    }

    if (!this.config.enableDashboard) {
      console.log(`[${new Date().toISOString()}] Dashboard is disabled in configuration`);
      return;
    }

    console.log(`[${new Date().toISOString()}] Starting MonitoringDashboard on port ${this.config.port}`);

    try {
      // Create HTTP server
      this.server = createServer(this.app);
      
      // Initialize Socket.IO
      this.io = new SocketIOServer(this.server, {
        cors: {
          origin: "*",
          methods: ["GET", "POST"]
        }
      });
      
      // Setup Socket.IO handlers
      this.setupSocketHandlers();
      
      // Start server
      await new Promise<void>((resolve, reject) => {
        this.server!.listen(this.config.port, (error?: Error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
      
      // Start update intervals
      this.startUpdateIntervals();
      
      this.isRunning = true;
      this.emit('dashboard:started', { port: this.config.port, timestamp: new Date() });
      
      console.log(`[${new Date().toISOString()}] MonitoringDashboard started successfully on port ${this.config.port}`);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to start MonitoringDashboard:`, error);
      throw new Error(`Dashboard startup failed: ${error.message}`);
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log(`[${new Date().toISOString()}] Stopping MonitoringDashboard`);

    try {
      // Stop update intervals
      this.stopUpdateIntervals();
      
      // Disconnect all clients
      this.disconnectAllClients();
      
      // Close Socket.IO server
      if (this.io) {
        this.io.close();
        this.io = undefined;
      }
      
      // Close HTTP server
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server!.close(() => resolve());
        });
        this.server = undefined;
      }
      
      this.isRunning = false;
      this.emit('dashboard:stopped', { timestamp: new Date() });
      
      console.log(`[${new Date().toISOString()}] MonitoringDashboard stopped successfully`);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error stopping MonitoringDashboard:`, error);
      throw error;
    }
  }

  // ===== EXPRESS APP SETUP =====

  private setupExpressApp(): void {
    // Middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Static files (dashboard UI)
    this.app.use(express.static(path.join(__dirname, '../dashboard/dist')));

    // API Routes
    this.setupAPIRoutes();

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
      });
    });

    // Serve dashboard UI
    this.app.get('/', (req, res) => {
      this.dashboardMetrics.totalPageViews++;
      res.sendFile(path.join(__dirname, '../dashboard/dist/index.html'));
    });

    // Error handling
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Dashboard API error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    });
  }

  private setupAPIRoutes(): void {
    const router = express.Router();

    // Dashboard data endpoint
    router.get('/dashboard/data', async (req, res) => {
      try {
        const data = await this.healthMonitor.getDashboardData();
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // System overview endpoint
    router.get('/dashboard/overview', async (req, res) => {
      try {
        const overview = await this.healthMonitor.getSystemOverview();
        res.json(overview);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Agents health endpoint
    router.get('/agents/health', async (req, res) => {
      try {
        const agentId = req.query.agentId as string;
        if (agentId) {
          const health = await this.healthMonitor.getAgentHealth(agentId);
          res.json(health);
        } else {
          const allHealth = await this.healthMonitor.getAllAgentsHealth();
          res.json(allHealth);
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Metrics endpoint
    router.get('/agents/:agentId/metrics', async (req, res) => {
      try {
        const { agentId } = req.params;
        const timeRange = req.query.timeRange as string || '1h';
        const metrics = await this.healthMonitor.getMetricsHistory(agentId, timeRange);
        res.json(metrics);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Alerts endpoints
    router.get('/alerts', async (req, res) => {
      try {
        const agentId = req.query.agentId as string;
        const alerts = await this.healthMonitor.getActiveAlerts(agentId);
        res.json(alerts);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    router.post('/alerts/:alertId/acknowledge', async (req, res) => {
      try {
        const { alertId } = req.params;
        const { acknowledgedBy, comment } = req.body;
        
        await this.healthMonitor.acknowledgeAlert(alertId, acknowledgedBy, comment);
        this.dashboardMetrics.alertsAcknowledged++;
        
        res.json({ success: true, message: 'Alert acknowledged' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    router.post('/alerts/:alertId/resolve', async (req, res) => {
      try {
        const { alertId } = req.params;
        const { resolvedBy, resolution } = req.body;
        
        await this.healthMonitor.resolveAlert(alertId, resolvedBy, resolution);
        
        res.json({ success: true, message: 'Alert resolved' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Recovery endpoints
    router.post('/agents/:agentId/recovery', async (req, res) => {
      try {
        const { agentId } = req.params;
        const { procedureId, triggeredBy } = req.body;
        
        const execution = await this.healthMonitor.triggerRecovery(agentId, procedureId, triggeredBy);
        
        res.json({ success: true, execution });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    router.get('/recovery/:executionId/status', async (req, res) => {
      try {
        const { executionId } = req.params;
        const status = await this.healthMonitor.getRecoveryStatus(executionId);
        res.json(status);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    router.post('/recovery/:executionId/rollback', async (req, res) => {
      try {
        const { executionId } = req.params;
        await this.healthMonitor.rollbackRecovery(executionId);
        res.json({ success: true, message: 'Recovery rolled back' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Analytics endpoints
    router.get('/agents/:agentId/predictions', async (req, res) => {
      try {
        const { agentId } = req.params;
        const analysis = await this.healthMonitor.runPredictiveAnalysis(agentId);
        res.json(analysis);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    router.get('/agents/:agentId/anomalies', async (req, res) => {
      try {
        const { agentId } = req.params;
        const anomalies = await this.healthMonitor.detectAnomalies(agentId);
        res.json(anomalies);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    router.get('/agents/:agentId/recommendations', async (req, res) => {
      try {
        const { agentId } = req.params;
        const recommendations = await this.healthMonitor.generateRecommendations(agentId);
        res.json(recommendations);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Export endpoints
    router.get('/export/metrics', async (req, res) => {
      try {
        const format = req.query.format as 'json' | 'csv' | 'prometheus' || 'json';
        const data = await this.healthMonitor.exportMetrics(format);
        
        this.dashboardMetrics.exportRequests++;
        
        const contentTypes = {
          json: 'application/json',
          csv: 'text/csv',
          prometheus: 'text/plain'
        };
        
        const fileExtensions = {
          json: 'json',
          csv: 'csv',
          prometheus: 'txt'
        };
        
        res.setHeader('Content-Type', contentTypes[format]);
        res.setHeader('Content-Disposition', `attachment; filename=metrics.${fileExtensions[format]}`);
        res.send(data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Dashboard metrics endpoint
    router.get('/dashboard/metrics', (req, res) => {
      res.json({
        ...this.dashboardMetrics,
        connectedClients: this.connectedClients.size
      });
    });

    this.app.use('/api', router);
  }

  // ===== SOCKET.IO SETUP =====

  private setupSocketHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      const clientId = this.generateClientId();
      const client: DashboardClient = {
        id: clientId,
        socket: socket,
        connectedAt: new Date(),
        lastActivity: new Date(),
        subscribedAgents: []
      };

      this.connectedClients.set(clientId, client);
      this.dashboardMetrics.connectedClients = this.connectedClients.size;

      console.log(`[${new Date().toISOString()}] Dashboard client connected: ${clientId}`);

      // Send initial data
      this.sendInitialData(client);

      // Handle client events
      socket.on('subscribe:agent', (agentId: string) => {
        this.handleAgentSubscription(client, agentId);
      });

      socket.on('unsubscribe:agent', (agentId: string) => {
        this.handleAgentUnsubscription(client, agentId);
      });

      socket.on('request:data', async (request: any) => {
        await this.handleDataRequest(client, request);
      });

      socket.on('action:acknowledge_alert', async (data: any) => {
        await this.handleAlertAcknowledgment(client, data);
      });

      socket.on('action:trigger_recovery', async (data: any) => {
        await this.handleRecoveryTrigger(client, data);
      });

      socket.on('disconnect', () => {
        this.handleClientDisconnect(clientId);
      });

      // Update activity timestamp on any event
      socket.onAny(() => {
        client.lastActivity = new Date();
      });
    });
  }

  private async sendInitialData(client: DashboardClient): Promise<void> {
    try {
      const dashboardData = await this.healthMonitor.getDashboardData();
      client.socket.emit('initial:data', dashboardData);
    } catch (error) {
      console.error(`Error sending initial data to client ${client.id}:`, error);
      client.socket.emit('error', { message: 'Failed to load initial data' });
    }
  }

  private handleAgentSubscription(client: DashboardClient, agentId: string): void {
    if (!client.subscribedAgents.includes(agentId)) {
      client.subscribedAgents.push(agentId);
      client.socket.join(`agent:${agentId}`);
      console.log(`[${new Date().toISOString()}] Client ${client.id} subscribed to agent ${agentId}`);
    }
  }

  private handleAgentUnsubscription(client: DashboardClient, agentId: string): void {
    const index = client.subscribedAgents.indexOf(agentId);
    if (index !== -1) {
      client.subscribedAgents.splice(index, 1);
      client.socket.leave(`agent:${agentId}`);
      console.log(`[${new Date().toISOString()}] Client ${client.id} unsubscribed from agent ${agentId}`);
    }
  }

  private async handleDataRequest(client: DashboardClient, request: any): Promise<void> {
    try {
      let response: any;

      switch (request.type) {
        case 'agent_health':
          response = await this.healthMonitor.getAgentHealth(request.agentId);
          break;
        case 'metrics_history':
          response = await this.healthMonitor.getMetricsHistory(request.agentId, request.timeRange);
          break;
        case 'active_alerts':
          response = await this.healthMonitor.getActiveAlerts(request.agentId);
          break;
        case 'system_overview':
          response = await this.healthMonitor.getSystemOverview();
          break;
        default:
          throw new Error(`Unknown request type: ${request.type}`);
      }

      client.socket.emit('data:response', {
        requestId: request.requestId,
        type: request.type,
        data: response
      });

    } catch (error) {
      client.socket.emit('data:error', {
        requestId: request.requestId,
        error: error.message
      });
    }
  }

  private async handleAlertAcknowledgment(client: DashboardClient, data: any): Promise<void> {
    try {
      await this.healthMonitor.acknowledgeAlert(data.alertId, data.acknowledgedBy, data.comment);
      
      client.socket.emit('action:success', {
        type: 'acknowledge_alert',
        alertId: data.alertId,
        message: 'Alert acknowledged successfully'
      });

      // Broadcast to other clients
      this.io?.emit('alert:acknowledged', {
        alertId: data.alertId,
        acknowledgedBy: data.acknowledgedBy
      });

    } catch (error) {
      client.socket.emit('action:error', {
        type: 'acknowledge_alert',
        error: error.message
      });
    }
  }

  private async handleRecoveryTrigger(client: DashboardClient, data: any): Promise<void> {
    try {
      const execution = await this.healthMonitor.triggerRecovery(
        data.agentId, 
        data.procedureId, 
        data.triggeredBy
      );
      
      client.socket.emit('action:success', {
        type: 'trigger_recovery',
        execution,
        message: 'Recovery triggered successfully'
      });

      // Broadcast to clients subscribed to this agent
      this.io?.to(`agent:${data.agentId}`).emit('recovery:triggered', {
        agentId: data.agentId,
        execution
      });

    } catch (error) {
      client.socket.emit('action:error', {
        type: 'trigger_recovery',
        error: error.message
      });
    }
  }

  private handleClientDisconnect(clientId: string): void {
    const client = this.connectedClients.get(clientId);
    if (client) {
      const sessionDuration = Date.now() - client.connectedAt.getTime();
      this.updateAverageSessionDuration(sessionDuration);
      
      this.connectedClients.delete(clientId);
      this.dashboardMetrics.connectedClients = this.connectedClients.size;
      
      console.log(`[${new Date().toISOString()}] Dashboard client disconnected: ${clientId}`);
    }
  }

  // ===== UPDATE INTERVALS =====

  private startUpdateIntervals(): void {
    // Regular data updates to connected clients
    this.dataUpdateInterval = setInterval(async () => {
      await this.broadcastDataUpdates();
    }, this.config.refreshInterval);

    // Client cleanup
    this.clientCleanupInterval = setInterval(() => {
      this.cleanupInactiveClients();
    }, 60000); // Every minute
  }

  private stopUpdateIntervals(): void {
    if (this.dataUpdateInterval) {
      clearInterval(this.dataUpdateInterval);
      this.dataUpdateInterval = undefined;
    }

    if (this.clientCleanupInterval) {
      clearInterval(this.clientCleanupInterval);
      this.clientCleanupInterval = undefined;
    }
  }

  private async broadcastDataUpdates(): Promise<void> {
    if (this.connectedClients.size === 0) {
      return;
    }

    try {
      // Get fresh dashboard data
      const dashboardData = await this.healthMonitor.getDashboardData();
      
      // Broadcast to all connected clients
      this.io?.emit('data:update', {
        type: 'dashboard_data',
        data: dashboardData,
        timestamp: new Date().toISOString()
      });

      // Send agent-specific updates to subscribed clients
      for (const agent of dashboardData.agents) {
        this.io?.to(`agent:${agent.agentId}`).emit('data:update', {
          type: 'agent_data',
          agentId: agent.agentId,
          data: agent,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('Error broadcasting data updates:', error);
    }
  }

  private cleanupInactiveClients(): void {
    const inactivityThreshold = 30 * 60 * 1000; // 30 minutes
    const now = Date.now();

    for (const [clientId, client] of this.connectedClients) {
      if (now - client.lastActivity.getTime() > inactivityThreshold) {
        console.log(`[${new Date().toISOString()}] Disconnecting inactive client: ${clientId}`);
        client.socket.disconnect();
        this.connectedClients.delete(clientId);
      }
    }

    this.dashboardMetrics.connectedClients = this.connectedClients.size;
  }

  // ===== PUBLIC METHODS =====

  public broadcastAlert(alert: any): void {
    if (this.io) {
      this.io.emit('alert:new', alert);
      
      // Send to clients subscribed to the specific agent
      this.io.to(`agent:${alert.agentId}`).emit('agent:alert', alert);
    }
  }

  public broadcastRecoveryUpdate(execution: any): void {
    if (this.io) {
      this.io.emit('recovery:update', execution);
      
      // Send to clients subscribed to the specific agent
      this.io.to(`agent:${execution.agentId}`).emit('agent:recovery', execution);
    }
  }

  public broadcastHealthUpdate(agentId: string, health: any): void {
    if (this.io) {
      this.io.to(`agent:${agentId}`).emit('health:update', {
        agentId,
        health,
        timestamp: new Date().toISOString()
      });
    }
  }

  // ===== PRIVATE UTILITIES =====

  private disconnectAllClients(): void {
    for (const [clientId, client] of this.connectedClients) {
      client.socket.disconnect();
    }
    this.connectedClients.clear();
    this.dashboardMetrics.connectedClients = 0;
  }

  private updateAverageSessionDuration(sessionDuration: number): void {
    const totalSessions = this.dashboardMetrics.totalPageViews;
    if (totalSessions > 0) {
      const totalDuration = this.dashboardMetrics.averageSessionDuration * (totalSessions - 1) + sessionDuration;
      this.dashboardMetrics.averageSessionDuration = totalDuration / totalSessions;
    } else {
      this.dashboardMetrics.averageSessionDuration = sessionDuration;
    }
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ===== GETTERS =====

  public getConnectedClients(): number {
    return this.connectedClients.size;
  }

  public getDashboardMetrics(): DashboardMetrics & { connectedClients: number } {
    return {
      ...this.dashboardMetrics,
      connectedClients: this.connectedClients.size
    };
  }

  public isHealthy(): boolean {
    return this.isRunning && 
           this.server !== undefined && 
           this.io !== undefined;
  }

  public getConfig(): DashboardConfig {
    return { ...this.config };
  }
}
