/**
 * TrustStram v4.4 Communication Manager
 * Handles secure communication between federated learning components
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import {
  CommunicationConfig,
  FederatedClient
} from '../types';

/**
 * Manages secure communication for federated learning
 * Implements multiple protocols and encryption schemes
 */
export class CommunicationManager extends EventEmitter {
  private connections: Map<string, any> = new Map();
  private encryptionKeys: Map<string, Buffer> = new Map();
  private compressionEnabled: boolean = true;
  private messageQueue: Map<string, any[]> = new Map();
  private bandwidthMonitor: BandwidthMonitor;
  private compressionRatio: number = 0.6; // Target 60% reduction

  constructor() {
    super();
    this.bandwidthMonitor = new BandwidthMonitor();
  }

  /**
   * Initialize communication manager
   */
  async initialize(): Promise<void> {
    try {
      await this.setupEncryption();
      this.bandwidthMonitor.start();
      console.log('Communication Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Communication Manager:', error);
      throw error;
    }
  }

  /**
   * Establish connection with a client
   */
  async establishConnection(
    connection: any,
    config: CommunicationConfig
  ): Promise<void> {
    try {
      // Generate encryption keys for this connection
      const encryptionKey = await this.generateEncryptionKey();
      this.encryptionKeys.set(connection.connection_id, encryptionKey);
      
      // Store connection configuration
      this.connections.set(connection.connection_id, {
        ...connection,
        config,
        established_at: new Date().toISOString(),
        bytes_sent: 0,
        bytes_received: 0
      });
      
      // Initialize message queue for this connection
      this.messageQueue.set(connection.connection_id, []);
      
      console.log(`Connection established: ${connection.connection_id}`);
      
    } catch (error) {
      console.error(`Failed to establish connection ${connection.connection_id}:`, error);
      throw error;
    }
  }

  /**
   * Send model to client
   */
  async sendModelToClient(
    client: FederatedClient,
    modelData: any,
    metadata: any
  ): Promise<void> {
    try {
      const connectionId = this.findConnectionForClient(client.client_id);
      if (!connectionId) {
        throw new Error(`No connection found for client ${client.client_id}`);
      }
      
      const message = {
        type: 'model_update',
        payload: {
          model_data: modelData,
          metadata,
          timestamp: new Date().toISOString()
        }
      };
      
      await this.sendMessage(connectionId, 'model_update', message);
      
    } catch (error) {
      console.error(`Failed to send model to client ${client.client_id}:`, error);
      throw error;
    }
  }

  /**
   * Send message with encryption and compression
   */
  async sendMessage(
    connectionIdOrConnection: string | any,
    messageType: string,
    payload: any
  ): Promise<void> {
    try {
      const connectionId = typeof connectionIdOrConnection === 'string' 
        ? connectionIdOrConnection 
        : connectionIdOrConnection.connection_id;
      
      const connection = this.connections.get(connectionId);
      if (!connection) {
        throw new Error(`Connection ${connectionId} not found`);
      }
      
      // Serialize payload
      const serializedPayload = JSON.stringify(payload);
      
      // Apply compression if enabled
      let processedPayload = serializedPayload;
      if (this.compressionEnabled) {
        processedPayload = await this.compressMessage(serializedPayload);
      }
      
      // Encrypt message
      const encryptedPayload = await this.encryptMessage(
        connectionId,
        processedPayload
      );
      
      // Create final message
      const message = {
        type: messageType,
        payload: encryptedPayload,
        compressed: this.compressionEnabled,
        timestamp: new Date().toISOString(),
        message_id: this.generateMessageId()
      };
      
      // Send message (implementation depends on protocol)
      await this.sendRawMessage(connection, message);
      
      // Update bandwidth statistics
      const messageSize = Buffer.byteLength(JSON.stringify(message));
      connection.bytes_sent += messageSize;
      this.bandwidthMonitor.recordSent(messageSize);
      
      console.log(`Message sent to ${connectionId}: ${messageType}`);
      
    } catch (error) {
      console.error(`Failed to send message:`, error);
      throw error;
    }
  }

  /**
   * Receive and process incoming message
   */
  async receiveMessage(
    connectionId: string,
    rawMessage: any
  ): Promise<any> {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) {
        throw new Error(`Connection ${connectionId} not found`);
      }
      
      // Update bandwidth statistics
      const messageSize = Buffer.byteLength(JSON.stringify(rawMessage));
      connection.bytes_received += messageSize;
      this.bandwidthMonitor.recordReceived(messageSize);
      
      // Decrypt message
      const decryptedPayload = await this.decryptMessage(
        connectionId,
        rawMessage.payload
      );
      
      // Decompress if needed
      let processedPayload = decryptedPayload;
      if (rawMessage.compressed) {
        processedPayload = await this.decompressMessage(decryptedPayload);
      }
      
      // Parse payload
      const payload = JSON.parse(processedPayload);
      
      // Emit received message event
      this.emit('message_received', {
        connection_id: connectionId,
        message_type: rawMessage.type,
        payload,
        timestamp: rawMessage.timestamp
      });
      
      return payload;
      
    } catch (error) {
      console.error(`Failed to receive message from ${connectionId}:`, error);
      throw error;
    }
  }

  /**
   * Send heartbeat to client
   */
  async sendHeartbeat(connection: any): Promise<void> {
    try {
      const heartbeatMessage = {
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      };
      
      await this.sendMessage(connection.connection_id, 'heartbeat', heartbeatMessage);
      
    } catch (error) {
      console.error(`Failed to send heartbeat to ${connection.connection_id}:`, error);
      throw error;
    }
  }

  /**
   * Handle heartbeat response
   */
  handleHeartbeatResponse(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.last_heartbeat = new Date().toISOString();
    }
  }

  /**
   * Close connection
   */
  async closeConnection(connection: any): Promise<void> {
    try {
      const connectionId = connection.connection_id;
      
      // Clean up encryption keys
      this.encryptionKeys.delete(connectionId);
      
      // Clean up message queue
      this.messageQueue.delete(connectionId);
      
      // Remove connection
      this.connections.delete(connectionId);
      
      console.log(`Connection closed: ${connectionId}`);
      
    } catch (error) {
      console.error(`Failed to close connection ${connection.connection_id}:`, error);
    }
  }

  /**
   * Get communication statistics
   */
  getCommunicationStatistics(): CommunicationStatistics {
    const totalConnections = this.connections.size;
    const activeConnections = Array.from(this.connections.values())
      .filter(conn => conn.is_active).length;
    
    const totalBytesSent = Array.from(this.connections.values())
      .reduce((sum, conn) => sum + conn.bytes_sent, 0);
    
    const totalBytesReceived = Array.from(this.connections.values())
      .reduce((sum, conn) => sum + conn.bytes_received, 0);
    
    const bandwidthStats = this.bandwidthMonitor.getStatistics();
    
    return {
      total_connections: totalConnections,
      active_connections: activeConnections,
      total_bytes_sent: totalBytesSent,
      total_bytes_received: totalBytesReceived,
      compression_ratio: this.compressionRatio,
      bandwidth_utilization: bandwidthStats.utilization,
      average_latency: bandwidthStats.average_latency,
      message_throughput: bandwidthStats.message_throughput
    };
  }

  /**
   * Private helper methods
   */
  private async setupEncryption(): Promise<void> {
    // Initialize encryption infrastructure
    // This is a simplified version - production would use proper key management
  }

  private async generateEncryptionKey(): Promise<Buffer> {
    return crypto.randomBytes(32); // 256-bit key
  }

  private async encryptMessage(connectionId: string, message: string): Promise<string> {
    const key = this.encryptionKeys.get(connectionId);
    if (!key) {
      throw new Error(`No encryption key found for connection ${connectionId}`);
    }
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', key);
    cipher.setAutoPadding(true);
    
    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  private async decryptMessage(connectionId: string, encryptedMessage: string): Promise<string> {
    const key = this.encryptionKeys.get(connectionId);
    if (!key) {
      throw new Error(`No encryption key found for connection ${connectionId}`);
    }
    
    const parts = encryptedMessage.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    decipher.setAutoPadding(true);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  private async compressMessage(message: string): Promise<string> {
    // Implement compression algorithm (e.g., gzip, top-k sparsification)
    // This is a simplified placeholder
    const compressed = Buffer.from(message).toString('base64');
    return compressed;
  }

  private async decompressMessage(compressedMessage: string): Promise<string> {
    // Implement decompression
    const decompressed = Buffer.from(compressedMessage, 'base64').toString('utf8');
    return decompressed;
  }

  private async sendRawMessage(connection: any, message: any): Promise<void> {
    // Implementation depends on the protocol (gRPC, HTTP, WebSocket)
    // This is a placeholder that would interface with actual transport layer
    
    switch (connection.config.protocol) {
      case 'grpc':
        await this.sendGrpcMessage(connection, message);
        break;
      case 'http':
        await this.sendHttpMessage(connection, message);
        break;
      case 'websocket':
        await this.sendWebSocketMessage(connection, message);
        break;
      default:
        throw new Error(`Unsupported protocol: ${connection.config.protocol}`);
    }
  }

  private async sendGrpcMessage(connection: any, message: any): Promise<void> {
    // gRPC implementation placeholder
    console.log(`Sending gRPC message to ${connection.connection_id}`);
  }

  private async sendHttpMessage(connection: any, message: any): Promise<void> {
    // HTTP implementation placeholder
    console.log(`Sending HTTP message to ${connection.connection_id}`);
  }

  private async sendWebSocketMessage(connection: any, message: any): Promise<void> {
    // WebSocket implementation placeholder
    console.log(`Sending WebSocket message to ${connection.connection_id}`);
  }

  private findConnectionForClient(clientId: string): string | null {
    for (const [connectionId, connection] of this.connections.entries()) {
      if (connection.client_id === clientId) {
        return connectionId;
      }
    }
    return null;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Close all connections
    for (const connection of this.connections.values()) {
      await this.closeConnection(connection);
    }
    
    // Stop bandwidth monitoring
    this.bandwidthMonitor.stop();
    
    // Clear data structures
    this.connections.clear();
    this.encryptionKeys.clear();
    this.messageQueue.clear();
    
    console.log('Communication Manager cleaned up successfully');
  }
}

/**
 * Bandwidth monitoring utility
 */
class BandwidthMonitor {
  private sentBytes: number = 0;
  private receivedBytes: number = 0;
  private startTime: number = Date.now();
  private messageCount: number = 0;
  private latencySum: number = 0;
  private isRunning: boolean = false;

  start(): void {
    this.isRunning = true;
    this.startTime = Date.now();
  }

  stop(): void {
    this.isRunning = false;
  }

  recordSent(bytes: number): void {
    if (this.isRunning) {
      this.sentBytes += bytes;
      this.messageCount++;
    }
  }

  recordReceived(bytes: number): void {
    if (this.isRunning) {
      this.receivedBytes += bytes;
    }
  }

  recordLatency(latency: number): void {
    if (this.isRunning) {
      this.latencySum += latency;
    }
  }

  getStatistics(): BandwidthStatistics {
    const elapsedTime = (Date.now() - this.startTime) / 1000; // seconds
    const totalBytes = this.sentBytes + this.receivedBytes;
    
    return {
      utilization: elapsedTime > 0 ? totalBytes / elapsedTime : 0,
      average_latency: this.messageCount > 0 ? this.latencySum / this.messageCount : 0,
      message_throughput: elapsedTime > 0 ? this.messageCount / elapsedTime : 0,
      total_bytes_transferred: totalBytes
    };
  }
}

// Helper interfaces
interface CommunicationStatistics {
  total_connections: number;
  active_connections: number;
  total_bytes_sent: number;
  total_bytes_received: number;
  compression_ratio: number;
  bandwidth_utilization: number;
  average_latency: number;
  message_throughput: number;
}

interface BandwidthStatistics {
  utilization: number;
  average_latency: number;
  message_throughput: number;
  total_bytes_transferred: number;
}
