/**
 * Orchestrator Client Implementation
 * Handles communication between governance agents and the orchestrator
 */

import { 
  OrchestratorClient, 
  GovernanceAgent, 
  AgentEvent, 
  AgentMetrics, 
  HealthCheckResult, 
  GovernanceTask, 
  TaskResult, 
  AgentStatus, 
  AgentConfig,
  AgentEventType,
  CommunicationError
} from './types';
import { AgentLogger } from './logger';

export class GovernanceOrchestratorClient implements OrchestratorClient {
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private heartbeatInterval?: NodeJS.Timeout;
  private eventSubscriptions: Set<AgentEventType> = new Set();

  constructor(
    private agentId: string,
    private orchestratorEndpoint: string,
    private logger: AgentLogger,
    private retryPolicy: {
      maxRetries: number;
      retryDelay: number;
      exponentialBackoff: boolean;
    } = {
      maxRetries: 3,
      retryDelay: 1000,
      exponentialBackoff: true
    }
  ) {}

  async register(agent: GovernanceAgent): Promise<void> {
    try {
      const registrationData = {
        agentId: agent.agentId,
        agentType: agent.agentType,
        capabilities: agent.capabilities,
        status: agent.status,
        timestamp: new Date().toISOString()
      };

      await this.sendRequest('POST', '/agents/register', registrationData);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Start heartbeat
      this.startHeartbeat();
      
      this.logger.info('Successfully registered with orchestrator', { 
        endpoint: this.orchestratorEndpoint 
      });
    } catch (error) {
      this.logger.error('Failed to register with orchestrator', error as Error);
      throw new CommunicationError(
        'Registration failed',
        this.agentId,
        'orchestrator',
        { endpoint: this.orchestratorEndpoint }
      );
    }
  }

  async unregister(agentId: string): Promise<void> {
    try {
      await this.sendRequest('POST', `/agents/${agentId}/unregister`, {
        timestamp: new Date().toISOString()
      });
      
      this.isConnected = false;
      this.stopHeartbeat();
      
      this.logger.info('Successfully unregistered from orchestrator');
    } catch (error) {
      this.logger.error('Failed to unregister from orchestrator', error as Error);
      throw new CommunicationError(
        'Unregistration failed',
        this.agentId,
        'orchestrator'
      );
    }
  }

  async subscribeToEvents(agentId: string, eventTypes: AgentEventType[]): Promise<void> {
    try {
      await this.sendRequest('POST', `/agents/${agentId}/subscribe`, {
        eventTypes,
        timestamp: new Date().toISOString()
      });

      eventTypes.forEach(eventType => this.eventSubscriptions.add(eventType));
      
      this.logger.info('Successfully subscribed to events', { 
        eventTypes,
        totalSubscriptions: this.eventSubscriptions.size
      });
    } catch (error) {
      this.logger.error('Failed to subscribe to events', error as Error);
      throw new CommunicationError(
        'Event subscription failed',
        this.agentId,
        'orchestrator'
      );
    }
  }

  async unsubscribeFromEvents(agentId: string, eventTypes: AgentEventType[]): Promise<void> {
    try {
      await this.sendRequest('POST', `/agents/${agentId}/unsubscribe`, {
        eventTypes,
        timestamp: new Date().toISOString()
      });

      eventTypes.forEach(eventType => this.eventSubscriptions.delete(eventType));
      
      this.logger.info('Successfully unsubscribed from events', { 
        eventTypes,
        remainingSubscriptions: this.eventSubscriptions.size
      });
    } catch (error) {
      this.logger.error('Failed to unsubscribe from events', error as Error);
      throw new CommunicationError(
        'Event unsubscription failed',
        this.agentId,
        'orchestrator'
      );
    }
  }

  async publishEvent(event: AgentEvent): Promise<void> {
    try {
      await this.sendRequest('POST', '/events/publish', {
        ...event,
        publishedAt: new Date().toISOString()
      });
      
      this.logger.logCommunication('sent', event.targetAgentId || 'broadcast', event.eventType, {
        eventId: event.eventId,
        priority: event.priority
      });
    } catch (error) {
      this.logger.error('Failed to publish event', error as Error, { 
        eventId: event.eventId,
        eventType: event.eventType
      });
      throw new CommunicationError(
        'Event publishing failed',
        this.agentId,
        'orchestrator'
      );
    }
  }

  async reportMetrics(metrics: AgentMetrics): Promise<void> {
    try {
      await this.sendRequest('POST', `/agents/${metrics.agentId}/metrics`, metrics);
      
      this.logger.debug('Metrics reported successfully', {
        performanceScore: metrics.performanceScore,
        healthScore: metrics.healthScore,
        tasksCompleted: metrics.tasksCompleted
      });
    } catch (error) {
      this.logger.error('Failed to report metrics', error as Error);
      // Don't throw error for metrics reporting to avoid cascading failures
    }
  }

  async reportHealth(healthCheck: HealthCheckResult): Promise<void> {
    try {
      await this.sendRequest('POST', `/agents/${healthCheck.agentId}/health`, healthCheck);
      
      this.logger.debug('Health check reported successfully', {
        status: healthCheck.status,
        healthScore: healthCheck.healthScore,
        issues: healthCheck.issues?.length || 0
      });
    } catch (error) {
      this.logger.error('Failed to report health check', error as Error);
      // Don't throw error for health reporting to avoid cascading failures
    }
  }

  async requestTask(agentId: string, taskTypes: string[]): Promise<GovernanceTask | null> {
    try {
      const response = await this.sendRequest('POST', `/agents/${agentId}/request-task`, {
        agentId,
        taskTypes,
        timestamp: new Date().toISOString()
      });
      
      if (response && response.task) {
        this.logger.info('Task requested successfully', {
          taskId: response.task.taskId,
          taskType: response.task.type,
          priority: response.task.priority
        });
        return response.task;
      }
      
      return null;
    } catch (error) {
      this.logger.error('Failed to request task', error as Error);
      throw new CommunicationError(
        'Task request failed',
        this.agentId,
        'orchestrator'
      );
    }
  }

  async submitTaskResult(result: TaskResult): Promise<void> {
    try {
      await this.sendRequest('POST', `/tasks/${result.taskId}/result`, result);
      
      this.logger.logTaskExecution(result.taskId, 
        result.status === 'completed' ? 'completed' : 'failed', {
        executionTime: result.executionTime,
        qualityScore: result.qualityScore,
        status: result.status
      });
    } catch (error) {
      this.logger.error('Failed to submit task result', error as Error, {
        taskId: result.taskId
      });
      throw new CommunicationError(
        'Task result submission failed',
        this.agentId,
        'orchestrator'
      );
    }
  }

  async notifyStatusChange(agentId: string, status: AgentStatus): Promise<void> {
    try {
      await this.sendRequest('POST', `/agents/${agentId}/status`, {
        agentId,
        status,
        timestamp: new Date().toISOString()
      });
      
      this.logger.logStateChange('unknown', status, 'Status update to orchestrator');
    } catch (error) {
      this.logger.error('Failed to notify status change', error as Error);
      // Don't throw error for status notifications to avoid cascading failures
    }
  }

  async getAgentConfig(agentId: string): Promise<AgentConfig | null> {
    try {
      const response = await this.sendRequest('GET', `/agents/${agentId}/config`);
      
      if (response && response.config) {
        this.logger.debug('Agent configuration retrieved successfully');
        return response.config;
      }
      
      return null;
    } catch (error) {
      this.logger.error('Failed to get agent configuration', error as Error);
      return null;
    }
  }

  // Connection management
  public isOrchestratorConnected(): boolean {
    return this.isConnected;
  }

  public async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      throw new CommunicationError(
        'Max reconnection attempts exceeded',
        this.agentId,
        'orchestrator'
      );
    }

    this.reconnectAttempts++;
    const delay = this.retryPolicy.exponentialBackoff 
      ? this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
      : this.reconnectDelay;

    this.logger.warn(`Attempting to reconnect to orchestrator (attempt ${this.reconnectAttempts})`, {
      delay,
      maxAttempts: this.maxReconnectAttempts
    });

    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      // Test connection with a simple ping
      await this.sendRequest('GET', '/health');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      
      this.logger.info('Successfully reconnected to orchestrator');
    } catch (error) {
      this.logger.error('Reconnection attempt failed', error as Error);
      throw error;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat(); // Clear any existing heartbeat
    
    this.heartbeatInterval = setInterval(async () => {
      try {
        await this.sendRequest('POST', `/agents/${this.agentId}/heartbeat`, {
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.logger.warn('Heartbeat failed', { error: (error as Error).message });
        this.isConnected = false;
        
        // Attempt to reconnect
        try {
          await this.reconnect();
        } catch (reconnectError) {
          this.logger.error('Failed to reconnect after heartbeat failure', reconnectError as Error);
        }
      }
    }, 30000); // 30 second heartbeat
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  private async sendRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    data?: any
  ): Promise<any> {
    const url = `${this.orchestratorEndpoint}${path}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Agent-ID': this.agentId,
        'X-Request-ID': this.generateRequestId()
      }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.retryPolicy.maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const responseData = await response.json();
        return responseData;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.retryPolicy.maxRetries) {
          const delay = this.retryPolicy.exponentialBackoff 
            ? this.retryPolicy.retryDelay * Math.pow(2, attempt)
            : this.retryPolicy.retryDelay;
          
          this.logger.warn(`Request failed, retrying in ${delay}ms`, {
            attempt: attempt + 1,
            maxRetries: this.retryPolicy.maxRetries,
            error: error.message
          });
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }

  private generateRequestId(): string {
    return `${this.agentId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup method
  public async destroy(): Promise<void> {
    this.stopHeartbeat();
    if (this.isConnected) {
      try {
        await this.unregister(this.agentId);
      } catch (error) {
        this.logger.warn('Error during cleanup unregister', { error: (error as Error).message });
      }
    }
  }
}

// Factory function for creating orchestrator clients
export function createOrchestratorClient(
  agentId: string,
  orchestratorEndpoint: string,
  logger: AgentLogger,
  retryPolicy?: {
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff: boolean;
  }
): GovernanceOrchestratorClient {
  return new GovernanceOrchestratorClient(agentId, orchestratorEndpoint, logger, retryPolicy);
}
