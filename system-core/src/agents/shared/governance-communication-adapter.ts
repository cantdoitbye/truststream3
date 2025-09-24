/**
 * Governance Communication Adapter - MCP/A2A Integration
 * Enables governance agents to participate in the MCP communication network
 * 
 * File: truststream-v4.2/src/agents/shared/governance-communication-adapter.ts
 */

import { GovernanceContextManager, GovernanceContext } from './governance-context-manager.ts';

export interface GovernanceMessage {
  messageId: string;
  sourceAgent: string;
  targetAgent: string;
  messageType: MessageType;
  action: string;
  data: any;
  contextRequirements?: string[];
  expectedResponse?: string;
  priority: Priority;
  timestamp: Date;
  correlationId?: string;
  replyTo?: string;
}

export interface MCPGovernanceCapabilities {
  protocols: string[];
  version: string;
  governance_specializations: string[];
  coordination_patterns: string[];
  context_types: string[];
}

export interface AgentRegistration {
  agent_id: string;
  discovery_data: {
    agent_name: string;
    agent_type: string;
    metadata: any;
  };
  capabilities: string[];
  mcp_capabilities: MCPGovernanceCapabilities;
}

export interface CommunicationConfig {
  supabaseUrl: string;
  supabaseKey: string;
  agentId: string;
  governanceRole: string;
  maxRetries?: number;
  timeoutMs?: number;
}

export enum MessageType {
  REQUEST = 'request',
  RESPONSE = 'response',
  EVENT = 'event',
  NOTIFICATION = 'notification',
  COORDINATION = 'coordination',
  GOVERNANCE_ACTION = 'governance_action'
}

export enum Priority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4
}

export interface MessageResponse {
  messageId: string;
  originalMessageId: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: Date;
}

export interface GovernanceCoordinationRequest {
  coordinationId: string;
  coordinationType: 'consensus' | 'collaboration' | 'notification' | 'escalation';
  participants: string[];
  proposal?: any;
  timeout?: number;
  requiredApprovals?: number;
}

export interface GovernanceCoordinationResponse {
  coordinationId: string;
  agentId: string;
  response: 'approve' | 'reject' | 'abstain';
  reasoning?: string;
  data?: any;
  timestamp: Date;
}

export class GovernanceCommunicationAdapter {
  private agentId: string;
  private governanceRole: string;
  private config: CommunicationConfig;
  private contextManager: GovernanceContextManager;
  private messageHandlers: Map<string, Function> = new Map();
  private pendingResponses: Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }> = new Map();
  private subscriptions: Map<string, Set<Function>> = new Map();

  constructor(config: CommunicationConfig, contextManager: GovernanceContextManager) {
    this.agentId = config.agentId;
    this.governanceRole = config.governanceRole;
    this.config = config;
    this.contextManager = contextManager;
    
    this.setupMessageHandlers();
    this.setupRealtimeSubscriptions();
  }

  /**
   * Register this agent in the MCP governance network
   */
  async registerAsGovernanceAgent(capabilities: string[]): Promise<void> {
    try {
      console.log(`Registering governance agent: ${this.agentId}`);

      const mcpCapabilities: MCPGovernanceCapabilities = {
        protocols: ['governance-context', 'governance-decision', 'governance-event'],
        version: '1.0.0',
        governance_specializations: this.getGovernanceSpecializations(),
        coordination_patterns: ['consensus', 'collaboration', 'escalation'],
        context_types: this.getSupportedContextTypes()
      };

      const registration: AgentRegistration = {
        agent_id: this.agentId,
        discovery_data: {
          agent_name: `Governance Agent - ${this.agentId}`,
          agent_type: 'governance_agent',
          metadata: {
            governance_role: this.governanceRole,
            mcp_protocol_version: '1.0.0',
            last_registration: new Date().toISOString(),
            capabilities: capabilities
          }
        },
        capabilities: [...capabilities, 'governance_coordination', 'context_sharing', 'mcp_communication'],
        mcp_capabilities: mcpCapabilities
      };

      // Register with agent discovery service
      const response = await fetch(`${this.config.supabaseUrl}/functions/v1/agent-discovery-service-simple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.supabaseKey}`,
          'apikey': this.config.supabaseKey
        },
        body: JSON.stringify({
          action: 'register_agent',
          ...registration
        })
      });

      if (!response.ok) {
        throw new Error(`Registration failed: ${await response.text()}`);
      }

      // Update agent registry with MCP capabilities
      const supabaseHeaders = {
        'Authorization': `Bearer ${this.config.supabaseKey}`,
        'apikey': this.config.supabaseKey,
        'Content-Type': 'application/json'
      };

      await fetch(`${this.config.supabaseUrl}/rest/v1/agent_registry`, {
        method: 'POST',
        headers: { ...supabaseHeaders, 'Prefer': 'return=representation' },
        body: JSON.stringify({
          agent_id: this.agentId,
          agent_name: registration.discovery_data.agent_name,
          agent_type: registration.discovery_data.agent_type,
          current_status: 'active',
          capabilities: registration.capabilities,
          mcp_capabilities: mcpCapabilities,
          governance_role: this.governanceRole,
          communication_protocols: mcpCapabilities.protocols,
          last_mcp_heartbeat: new Date().toISOString(),
          metadata: registration.discovery_data.metadata
        })
      });

      console.log(`Governance agent registered successfully: ${this.agentId}`);

    } catch (error) {
      console.error('Failed to register governance agent:', error);
      throw error;
    }
  }

  /**
   * Send a governance message to another agent
   */
  async sendGovernanceMessage(targetAgent: string, message: Partial<GovernanceMessage>): Promise<MessageResponse> {
    try {
      const fullMessage: GovernanceMessage = {
        messageId: crypto.randomUUID(),
        sourceAgent: this.agentId,
        targetAgent,
        messageType: message.messageType || MessageType.REQUEST,
        action: message.action || 'unknown',
        data: message.data || {},
        contextRequirements: message.contextRequirements || [],
        expectedResponse: message.expectedResponse,
        priority: message.priority || Priority.NORMAL,
        timestamp: new Date(),
        correlationId: message.correlationId,
        replyTo: message.replyTo
      };

      // Ensure required governance context
      const contextId = await this.ensureGovernanceContext(fullMessage.contextRequirements || []);
      
      // Store message in communication log
      await this.logCommunication(fullMessage, contextId);

      // Route message through coordination service
      const response = await this.routeMessage(fullMessage);

      // If expecting a response, wait for it
      if (fullMessage.expectedResponse) {
        return await this.waitForResponse(fullMessage.messageId);
      }

      return {
        messageId: fullMessage.messageId,
        originalMessageId: fullMessage.messageId,
        success: true,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Failed to send governance message:', error);
      throw error;
    }
  }

  /**
   * Coordinate a governance action with multiple agents
   */
  async coordinateGovernanceAction(request: GovernanceCoordinationRequest): Promise<GovernanceCoordinationResponse[]> {
    try {
      console.log(`Coordinating governance action: ${request.coordinationId}`);

      const responses: GovernanceCoordinationResponse[] = [];
      const timeout = request.timeout || 30000; // 30 seconds default

      // Send coordination request to all participants
      const coordinationPromises = request.participants.map(async (participant) => {
        const message: GovernanceMessage = {
          messageId: crypto.randomUUID(),
          sourceAgent: this.agentId,
          targetAgent: participant,
          messageType: MessageType.COORDINATION,
          action: 'governance_coordination_request',
          data: request,
          priority: Priority.HIGH,
          timestamp: new Date(),
          correlationId: request.coordinationId,
          expectedResponse: 'governance_coordination_response'
        };

        try {
          const response = await this.sendGovernanceMessage(participant, message);
          if (response.success && response.data) {
            return response.data as GovernanceCoordinationResponse;
          }
        } catch (error) {
          console.error(`Coordination failed with ${participant}:`, error);
          return {
            coordinationId: request.coordinationId,
            agentId: participant,
            response: 'abstain',
            reasoning: `Communication error: ${error.message}`,
            timestamp: new Date()
          };
        }
      });

      // Wait for all responses or timeout
      const results = await Promise.allSettled(coordinationPromises);
      
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          responses.push(result.value);
        }
      }

      // Evaluate coordination result
      const coordination = await this.evaluateCoordinationResult(request, responses);
      
      // Log coordination session
      await this.logCoordinationSession(request, responses, coordination);

      return responses;

    } catch (error) {
      console.error('Coordination failed:', error);
      throw error;
    }
  }

  /**
   * Subscribe to governance events
   */
  async subscribeToGovernanceEvents(eventTypes: string[], handler: Function): Promise<void> {
    for (const eventType of eventTypes) {
      if (!this.subscriptions.has(eventType)) {
        this.subscriptions.set(eventType, new Set());
      }
      this.subscriptions.get(eventType)!.add(handler);
    }

    console.log(`Agent ${this.agentId} subscribed to events: ${eventTypes.join(', ')}`);
  }

  /**
   * Publish a governance event
   */
  async publishGovernanceEvent(eventType: string, data: any, priority: Priority = Priority.NORMAL): Promise<void> {
    try {
      const event = {
        eventId: crypto.randomUUID(),
        eventType,
        category: 'governance',
        sourceAgent: this.agentId,
        timestamp: new Date(),
        severity: this.priorityToSeverity(priority),
        data,
        acknowledgmentRequired: priority >= Priority.HIGH
      };

      // Store event
      await fetch(`${this.config.supabaseUrl}/rest/v1/governance_events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.supabaseKey}`,
          'apikey': this.config.supabaseKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      // Notify subscribers through realtime
      await this.notifyEventSubscribers(event);

    } catch (error) {
      console.error('Failed to publish governance event:', error);
      throw error;
    }
  }

  /**
   * Handle incoming governance message
   */
  async handleIncomingMessage(message: GovernanceMessage): Promise<MessageResponse> {
    try {
      console.log(`Handling incoming message: ${message.messageId} from ${message.sourceAgent}`);

      const handler = this.messageHandlers.get(message.action);
      if (!handler) {
        throw new Error(`No handler found for action: ${message.action}`);
      }

      const result = await handler(message);

      const response: MessageResponse = {
        messageId: crypto.randomUUID(),
        originalMessageId: message.messageId,
        success: true,
        data: result,
        timestamp: new Date()
      };

      // Send response if reply is expected
      if (message.replyTo && message.expectedResponse) {
        await this.sendGovernanceMessage(message.sourceAgent, {
          messageType: MessageType.RESPONSE,
          action: message.expectedResponse,
          data: response,
          correlationId: message.correlationId
        });
      }

      return response;

    } catch (error) {
      console.error('Error handling incoming message:', error);
      
      const errorResponse: MessageResponse = {
        messageId: crypto.randomUUID(),
        originalMessageId: message.messageId,
        success: false,
        error: error.message,
        timestamp: new Date()
      };

      // Send error response if reply is expected
      if (message.replyTo) {
        await this.sendGovernanceMessage(message.sourceAgent, {
          messageType: MessageType.RESPONSE,
          action: 'error_response',
          data: errorResponse,
          correlationId: message.correlationId
        });
      }

      return errorResponse;
    }
  }

  /**
   * Register a message handler for a specific action
   */
  registerMessageHandler(action: string, handler: Function): void {
    this.messageHandlers.set(action, handler);
    console.log(`Registered handler for action: ${action}`);
  }

  // Private helper methods

  private setupMessageHandlers(): void {
    // Default governance coordination handlers
    this.registerMessageHandler('governance_coordination_request', this.handleCoordinationRequest.bind(this));
    this.registerMessageHandler('context_sharing_request', this.handleContextSharingRequest.bind(this));
    this.registerMessageHandler('governance_status_request', this.handleStatusRequest.bind(this));
  }

  private setupRealtimeSubscriptions(): void {
    // Subscribe to incoming messages
    fetch(`${this.config.supabaseUrl}/rest/v1/governance_communications?target_agent=eq.${this.agentId}&select=*`, {
      headers: {
        'Authorization': `Bearer ${this.config.supabaseKey}`,
        'apikey': this.config.supabaseKey
      }
    }).then(response => response.json()).then(messages => {
      // Process any pending messages
      for (const msg of messages) {
        if (msg.status === 'sent') {
          this.processIncomingMessage(msg);
        }
      }
    });
  }

  private async processIncomingMessage(msgData: any): Promise<void> {
    try {
      const message: GovernanceMessage = {
        messageId: msgData.communication_id,
        sourceAgent: msgData.source_agent,
        targetAgent: msgData.target_agent,
        messageType: msgData.message_type,
        action: msgData.content.action || 'unknown',
        data: msgData.content.data || {},
        priority: this.stringToPriority(msgData.priority),
        timestamp: new Date(msgData.created_at),
        correlationId: msgData.content.correlationId,
        replyTo: msgData.content.replyTo
      };

      await this.handleIncomingMessage(message);

      // Mark message as processed
      await fetch(`${this.config.supabaseUrl}/rest/v1/governance_communications`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.config.supabaseKey}`,
          'apikey': this.config.supabaseKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'processed',
          acknowledged_at: new Date().toISOString()
        })
      });

    } catch (error) {
      console.error('Error processing incoming message:', error);
    }
  }

  private async ensureGovernanceContext(contextRequirements: string[]): Promise<string | null> {
    if (contextRequirements.length === 0) return null;

    try {
      // Try to get the first required context
      const contextType = contextRequirements[0];
      const context = await this.contextManager.requestGovernanceContext(this.agentId, contextType);
      return context.contextId;
    } catch (error) {
      console.warn(`Could not ensure governance context: ${error.message}`);
      return null;
    }
  }

  private async logCommunication(message: GovernanceMessage, contextId: string | null): Promise<void> {
    await fetch(`${this.config.supabaseUrl}/rest/v1/governance_communications`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.supabaseKey}`,
        'apikey': this.config.supabaseKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        communication_id: message.messageId,
        source_agent: message.sourceAgent,
        target_agent: message.targetAgent,
        message_type: message.messageType,
        protocol: 'mcp-governance',
        content: {
          action: message.action,
          data: message.data,
          correlationId: message.correlationId,
          replyTo: message.replyTo
        },
        context_id: contextId,
        priority: this.priorityToString(message.priority),
        status: 'sent'
      })
    });
  }

  private async routeMessage(message: GovernanceMessage): Promise<any> {
    // Route through agent coordination service
    const response = await fetch(`${this.config.supabaseUrl}/functions/v1/agent-coordination`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.supabaseKey}`,
        'apikey': this.config.supabaseKey
      },
      body: JSON.stringify({
        action: 'route_message',
        target_agent: message.targetAgent,
        message: message
      })
    });

    if (!response.ok) {
      throw new Error(`Message routing failed: ${await response.text()}`);
    }

    return await response.json();
  }

  private async waitForResponse(messageId: string): Promise<MessageResponse> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingResponses.delete(messageId);
        reject(new Error('Response timeout'));
      }, this.config.timeoutMs || 30000);

      this.pendingResponses.set(messageId, { resolve, reject, timeout });
    });
  }

  private async handleCoordinationRequest(message: GovernanceMessage): Promise<any> {
    const request = message.data as GovernanceCoordinationRequest;
    
    // Default implementation - agents should override this
    return {
      coordinationId: request.coordinationId,
      agentId: this.agentId,
      response: 'approve',
      reasoning: 'Default approval from base adapter',
      timestamp: new Date()
    };
  }

  private async handleContextSharingRequest(message: GovernanceMessage): Promise<any> {
    const { contextType } = message.data;
    
    try {
      const context = await this.contextManager.requestGovernanceContext(this.agentId, contextType);
      return {
        success: true,
        context: context,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  private async handleStatusRequest(message: GovernanceMessage): Promise<any> {
    return {
      agentId: this.agentId,
      status: 'active',
      governanceRole: this.governanceRole,
      capabilities: Array.from(this.messageHandlers.keys()),
      timestamp: new Date()
    };
  }

  private async evaluateCoordinationResult(
    request: GovernanceCoordinationRequest, 
    responses: GovernanceCoordinationResponse[]
  ): Promise<any> {
    const approvals = responses.filter(r => r.response === 'approve').length;
    const rejections = responses.filter(r => r.response === 'reject').length;
    const abstentions = responses.filter(r => r.response === 'abstain').length;

    const requiredApprovals = request.requiredApprovals || Math.ceil(request.participants.length / 2);
    const consensusReached = approvals >= requiredApprovals;

    return {
      consensusReached,
      approvals,
      rejections,
      abstentions,
      requiredApprovals,
      participationRate: responses.length / request.participants.length
    };
  }

  private async logCoordinationSession(
    request: GovernanceCoordinationRequest,
    responses: GovernanceCoordinationResponse[],
    result: any
  ): Promise<void> {
    await fetch(`${this.config.supabaseUrl}/rest/v1/governance_coordination_sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.supabaseKey}`,
        'apikey': this.config.supabaseKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        coordination_id: request.coordinationId,
        coordination_type: request.coordinationType,
        initiator_agent: this.agentId,
        participants: request.participants,
        responses: responses,
        result: result,
        created_at: new Date().toISOString()
      })
    });
  }

  private async notifyEventSubscribers(event: any): Promise<void> {
    const subscribers = this.subscriptions.get(event.eventType);
    if (subscribers) {
      for (const handler of subscribers) {
        try {
          await handler(event);
        } catch (error) {
          console.error('Error notifying event subscriber:', error);
        }
      }
    }
  }

  private getGovernanceSpecializations(): string[] {
    // Override in specific governance agents
    return ['general_governance'];
  }

  private getSupportedContextTypes(): string[] {
    // Override in specific governance agents
    return ['decision', 'policy', 'standard', 'metric', 'audit'];
  }

  private priorityToSeverity(priority: Priority): string {
    switch (priority) {
      case Priority.LOW: return 'info';
      case Priority.NORMAL: return 'info';
      case Priority.HIGH: return 'warning';
      case Priority.CRITICAL: return 'critical';
      default: return 'info';
    }
  }

  private priorityToString(priority: Priority): string {
    switch (priority) {
      case Priority.LOW: return 'low';
      case Priority.NORMAL: return 'normal';
      case Priority.HIGH: return 'high';
      case Priority.CRITICAL: return 'critical';
      default: return 'normal';
    }
  }

  private stringToPriority(priority: string): Priority {
    switch (priority) {
      case 'low': return Priority.LOW;
      case 'normal': return Priority.NORMAL;
      case 'medium': return Priority.NORMAL;
      case 'high': return Priority.HIGH;
      case 'critical': return Priority.CRITICAL;
      default: return Priority.NORMAL;
    }
  }

  // Cleanup methods

  async disconnect(): Promise<void> {
    // Clear pending responses
    for (const [messageId, pending] of this.pendingResponses) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Agent disconnecting'));
    }
    this.pendingResponses.clear();

    // Clear subscriptions
    this.subscriptions.clear();

    console.log(`Agent ${this.agentId} disconnected from MCP network`);
  }

  async updateHeartbeat(): Promise<void> {
    try {
      await fetch(`${this.config.supabaseUrl}/rest/v1/agent_registry`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.config.supabaseKey}`,
          'apikey': this.config.supabaseKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          last_mcp_heartbeat: new Date().toISOString(),
          current_status: 'active'
        })
      });
    } catch (error) {
      console.error('Failed to update heartbeat:', error);
    }
  }
}
