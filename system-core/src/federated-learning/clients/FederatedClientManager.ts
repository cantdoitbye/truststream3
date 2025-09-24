/**
 * TrustStram v4.4 Federated Client Manager
 * Manages federated learning clients and their lifecycle
 */

import { EventEmitter } from 'events';
import {
  FederatedClient,
  ClientStatus,
  ModelUpdate,
  TrainingConfig,
  FederatedLearningEvent
} from '../types';
import { CommunicationManager } from '../utils/CommunicationManager';
import { SecurityManager } from '../security/SecurityManager';
import { PrivacyManager } from '../privacy/PrivacyManager';

/**
 * Manages federated learning clients and their interactions
 */
export class FederatedClientManager extends EventEmitter {
  private clients: Map<string, FederatedClient> = new Map();
  private clientConnections: Map<string, ClientConnection> = new Map();
  private communicationManager: CommunicationManager;
  private securityManager: SecurityManager;
  private privacyManager: PrivacyManager;
  private heartbeatInterval: NodeJS.Timeout;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly CLIENT_TIMEOUT = 120000; // 2 minutes

  constructor(
    communicationManager: CommunicationManager,
    securityManager: SecurityManager,
    privacyManager: PrivacyManager
  ) {
    super();
    this.communicationManager = communicationManager;
    this.securityManager = securityManager;
    this.privacyManager = privacyManager;
    this.startHeartbeatMonitoring();
  }

  /**
   * Register a new federated learning client
   */
  async registerClient(client: FederatedClient): Promise<void> {
    try {
      console.log(`Registering client ${client.client_id}`);
      
      // Validate client configuration
      await this.validateClientConfiguration(client);
      
      // Security screening
      const securityClearance = await this.securityManager.screenClient(client);
      if (!securityClearance.approved) {
        throw new Error(`Client security screening failed: ${securityClearance.reason}`);
      }
      
      // Privacy validation
      const privacyValidation = await this.privacyManager.validateClientPrivacySettings(client);
      if (!privacyValidation.valid) {
        throw new Error(`Client privacy validation failed: ${privacyValidation.reason}`);
      }
      
      // Initialize client connection
      const connection = await this.initializeClientConnection(client);
      
      // Store client and connection
      this.clients.set(client.client_id, {
        ...client,
        status: 'available',
        registered_at: new Date().toISOString()
      });
      
      this.clientConnections.set(client.client_id, connection);
      
      this.emit('client_registered', {
        event_id: this.generateEventId(),
        event_type: 'client_registered',
        job_id: '',
        timestamp: new Date().toISOString(),
        data: {
          client_id: client.client_id,
          client_type: client.client_type,
          capabilities: client.capabilities
        },
        severity: 'info'
      } as FederatedLearningEvent);
      
      console.log(`Client ${client.client_id} registered successfully`);
      
    } catch (error) {
      console.error(`Failed to register client ${client.client_id}:`, error);
      throw error;
    }
  }

  /**
   * Unregister a client
   */
  async unregisterClient(clientId: string): Promise<void> {
    try {
      const client = this.clients.get(clientId);
      if (!client) {
        throw new Error(`Client ${clientId} not found`);
      }
      
      // Close connection
      const connection = this.clientConnections.get(clientId);
      if (connection) {
        await this.closeClientConnection(connection);
        this.clientConnections.delete(clientId);
      }
      
      // Remove client
      this.clients.delete(clientId);
      
      this.emit('client_unregistered', {
        event_id: this.generateEventId(),
        event_type: 'client_registered',
        job_id: '',
        timestamp: new Date().toISOString(),
        data: { client_id: clientId },
        severity: 'info'
      } as FederatedLearningEvent);
      
      console.log(`Client ${clientId} unregistered successfully`);
      
    } catch (error) {
      console.error(`Failed to unregister client ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * Update client status
   */
  async updateClientStatus(clientId: string, status: ClientStatus): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error(`Client ${clientId} not found`);
    }
    
    const updatedClient = {
      ...client,
      status,
      updated_at: new Date().toISOString()
    };
    
    this.clients.set(clientId, updatedClient);
    
    this.emit('client_status_updated', {
      event_id: this.generateEventId(),
      event_type: 'client_status_updated',
      job_id: '',
      timestamp: new Date().toISOString(),
      data: {
        client_id: clientId,
        old_status: client.status,
        new_status: status
      },
      severity: 'info'
    } as FederatedLearningEvent);
  }

  /**
   * Send training task to client
   */
  async sendTrainingTask(
    clientId: string,
    jobId: string,
    modelData: any,
    trainingConfig: TrainingConfig
  ): Promise<void> {
    try {
      const client = this.clients.get(clientId);
      if (!client) {
        throw new Error(`Client ${clientId} not found`);
      }
      
      if (client.status !== 'available') {
        throw new Error(`Client ${clientId} is not available (status: ${client.status})`);
      }
      
      const connection = this.clientConnections.get(clientId);
      if (!connection) {
        throw new Error(`No connection found for client ${clientId}`);
      }
      
      // Update client status
      await this.updateClientStatus(clientId, 'training');
      
      // Prepare training message
      const trainingMessage = {
        job_id: jobId,
        model_data: modelData,
        training_config: trainingConfig,
        privacy_requirements: client.privacy_preferences,
        timestamp: new Date().toISOString()
      };
      
      // Send training task
      await this.communicationManager.sendMessage(
        connection,
        'training_task',
        trainingMessage
      );
      
      // Set training timeout
      const timeout = setTimeout(() => {
        this.handleTrainingTimeout(clientId, jobId);
      }, trainingConfig.training_timeout || 600000); // 10 minutes default
      
      connection.training_timeout = timeout;
      
      console.log(`Training task sent to client ${clientId} for job ${jobId}`);
      
    } catch (error) {
      console.error(`Failed to send training task to client ${clientId}:`, error);
      await this.updateClientStatus(clientId, 'error');
      throw error;
    }
  }

  /**
   * Process client update received
   */
  async processClientUpdate(
    clientId: string,
    update: ModelUpdate
  ): Promise<void> {
    try {
      const client = this.clients.get(clientId);
      if (!client) {
        throw new Error(`Client ${clientId} not found`);
      }
      
      const connection = this.clientConnections.get(clientId);
      if (connection?.training_timeout) {
        clearTimeout(connection.training_timeout);
        connection.training_timeout = undefined;
      }
      
      // Validate update
      await this.validateClientUpdate(client, update);
      
      // Update client status
      await this.updateClientStatus(clientId, 'available');
      
      // Forward update to orchestrator
      this.emit('client_update_received', {
        client_id: clientId,
        update
      });
      
      console.log(`Received update from client ${clientId} for job ${update.job_id || 'unknown'}`);
      
    } catch (error) {
      console.error(`Failed to process update from client ${clientId}:`, error);
      await this.updateClientStatus(clientId, 'error');
      throw error;
    }
  }

  /**
   * Get available clients
   */
  getAvailableClients(): FederatedClient[] {
    return Array.from(this.clients.values())
      .filter(client => client.status === 'available');
  }

  /**
   * Get all clients
   */
  getAllClients(): FederatedClient[] {
    return Array.from(this.clients.values());
  }

  /**
   * Get client by ID
   */
  getClient(clientId: string): FederatedClient | null {
    return this.clients.get(clientId) || null;
  }

  /**
   * Get clients by type
   */
  getClientsByType(clientType: string): FederatedClient[] {
    return Array.from(this.clients.values())
      .filter(client => client.client_type === clientType);
  }

  /**
   * Get client statistics
   */
  getClientStatistics(): ClientStatistics {
    const allClients = Array.from(this.clients.values());
    const statusCounts = allClients.reduce((counts, client) => {
      counts[client.status] = (counts[client.status] || 0) + 1;
      return counts;
    }, {} as Record<ClientStatus, number>);
    
    const typeCounts = allClients.reduce((counts, client) => {
      counts[client.client_type] = (counts[client.client_type] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    return {
      total_clients: allClients.length,
      status_distribution: statusCounts,
      type_distribution: typeCounts,
      active_connections: this.clientConnections.size,
      average_data_quality: this.calculateAverageDataQuality(allClients),
      compute_capacity_distribution: this.getComputeCapacityDistribution(allClients)
    };
  }

  /**
   * Validate client configuration
   */
  private async validateClientConfiguration(client: FederatedClient): Promise<void> {
    // Validate required fields
    if (!client.client_id || !client.client_type) {
      throw new Error('Client ID and type are required');
    }
    
    // Check for duplicate client ID
    if (this.clients.has(client.client_id)) {
      throw new Error(`Client ${client.client_id} is already registered`);
    }
    
    // Validate capabilities
    if (!client.capabilities) {
      throw new Error('Client capabilities are required');
    }
    
    // Validate data schema
    if (!client.data_schema || client.data_schema.sample_count <= 0) {
      throw new Error('Valid data schema with positive sample count is required');
    }
    
    // Validate communication config
    if (!client.communication_config) {
      throw new Error('Communication configuration is required');
    }
    
    // Validate privacy preferences
    if (!client.privacy_preferences) {
      throw new Error('Privacy preferences are required');
    }
  }

  /**
   * Initialize client connection
   */
  private async initializeClientConnection(client: FederatedClient): Promise<ClientConnection> {
    const connection: ClientConnection = {
      client_id: client.client_id,
      connection_id: this.generateConnectionId(),
      established_at: new Date().toISOString(),
      last_heartbeat: new Date().toISOString(),
      is_active: true,
      protocol: client.communication_config.protocol,
      encryption: client.communication_config.encryption
    };
    
    // Establish actual network connection based on protocol
    await this.communicationManager.establishConnection(connection, client.communication_config);
    
    return connection;
  }

  /**
   * Close client connection
   */
  private async closeClientConnection(connection: ClientConnection): Promise<void> {
    try {
      connection.is_active = false;
      
      if (connection.training_timeout) {
        clearTimeout(connection.training_timeout);
      }
      
      await this.communicationManager.closeConnection(connection);
      
    } catch (error) {
      console.error(`Failed to close connection for client ${connection.client_id}:`, error);
    }
  }

  /**
   * Validate client update
   */
  private async validateClientUpdate(
    client: FederatedClient,
    update: ModelUpdate
  ): Promise<void> {
    // Validate update structure
    if (!update.client_id || !update.round_number || !update.parameters) {
      throw new Error('Invalid update structure');
    }
    
    // Verify client ID matches
    if (update.client_id !== client.client_id) {
      throw new Error('Client ID mismatch in update');
    }
    
    // Validate integrity hash
    const calculatedHash = await this.calculateUpdateHash(update);
    if (calculatedHash !== update.integrity_hash) {
      throw new Error('Update integrity validation failed');
    }
    
    // Validate privacy proof
    if (client.privacy_preferences.audit_trail_required && !update.privacy_proof) {
      throw new Error('Privacy proof required but not provided');
    }
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeatMonitoring(): void {
    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeatCheck();
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Perform heartbeat check on all clients
   */
  private async performHeartbeatCheck(): Promise<void> {
    const now = new Date();
    
    for (const [clientId, connection] of this.clientConnections.entries()) {
      const lastHeartbeat = new Date(connection.last_heartbeat);
      const timeSinceHeartbeat = now.getTime() - lastHeartbeat.getTime();
      
      if (timeSinceHeartbeat > this.CLIENT_TIMEOUT) {
        console.warn(`Client ${clientId} heartbeat timeout`);
        await this.handleClientTimeout(clientId);
      } else if (connection.is_active) {
        // Send heartbeat request
        try {
          await this.communicationManager.sendHeartbeat(connection);
        } catch (error) {
          console.warn(`Failed to send heartbeat to client ${clientId}:`, error);
        }
      }
    }
  }

  /**
   * Handle client timeout
   */
  private async handleClientTimeout(clientId: string): Promise<void> {
    try {
      await this.updateClientStatus(clientId, 'offline');
      
      const connection = this.clientConnections.get(clientId);
      if (connection) {
        await this.closeClientConnection(connection);
        this.clientConnections.delete(clientId);
      }
      
      this.emit('client_timeout', {
        event_id: this.generateEventId(),
        event_type: 'client_timeout',
        job_id: '',
        timestamp: new Date().toISOString(),
        data: { client_id: clientId },
        severity: 'warning'
      } as FederatedLearningEvent);
      
    } catch (error) {
      console.error(`Failed to handle timeout for client ${clientId}:`, error);
    }
  }

  /**
   * Handle training timeout
   */
  private async handleTrainingTimeout(clientId: string, jobId: string): Promise<void> {
    console.warn(`Training timeout for client ${clientId} in job ${jobId}`);
    
    await this.updateClientStatus(clientId, 'error');
    
    this.emit('training_timeout', {
      event_id: this.generateEventId(),
      event_type: 'training_timeout',
      job_id: jobId,
      timestamp: new Date().toISOString(),
      data: {
        client_id: clientId,
        job_id: jobId
      },
      severity: 'warning'
    } as FederatedLearningEvent);
  }

  /**
   * Calculate update hash for integrity verification
   */
  private async calculateUpdateHash(update: ModelUpdate): Promise<string> {
    // Implementation would calculate cryptographic hash
    // This is a placeholder
    return 'calculated_hash';
  }

  /**
   * Helper methods
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateAverageDataQuality(clients: FederatedClient[]): number {
    if (clients.length === 0) return 0;
    const total = clients.reduce((sum, client) => sum + client.data_schema.data_quality, 0);
    return total / clients.length;
  }

  private getComputeCapacityDistribution(clients: FederatedClient[]): Record<string, number> {
    return clients.reduce((distribution, client) => {
      const power = client.capabilities.compute_power;
      distribution[power] = (distribution[power] || 0) + 1;
      return distribution;
    }, {} as Record<string, number>);
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Clear heartbeat interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Close all client connections
    for (const connection of this.clientConnections.values()) {
      await this.closeClientConnection(connection);
    }
    
    // Clear data structures
    this.clients.clear();
    this.clientConnections.clear();
    
    console.log('Federated Client Manager cleaned up successfully');
  }
}

// Helper interfaces
interface ClientConnection {
  client_id: string;
  connection_id: string;
  established_at: string;
  last_heartbeat: string;
  is_active: boolean;
  protocol: string;
  encryption: string;
  training_timeout?: NodeJS.Timeout;
}

interface ClientStatistics {
  total_clients: number;
  status_distribution: Record<ClientStatus, number>;
  type_distribution: Record<string, number>;
  active_connections: number;
  average_data_quality: number;
  compute_capacity_distribution: Record<string, number>;
}
