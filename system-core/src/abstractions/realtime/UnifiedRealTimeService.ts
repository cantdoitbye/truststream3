/**
 * Unified RealTime Service
 * Provides unified real-time communication interface across different providers
 */

import { EventEmitter } from 'events';
import { RealTimeConfig } from '../backend-manager/types';

export interface RealtimeChannel {
  name: string;
  topic: string;
  presence?: boolean;
  broadcast?: boolean;
  postgres_changes?: boolean;
}

export interface RealtimeMessage {
  event: string;
  payload: any;
  timestamp: Date;
  sender?: string;
}

export interface PresenceState {
  user_id: string;
  online_at: string;
  metadata?: Record<string, any>;
}

export interface PostgresChangesPayload {
  table: string;
  schema: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: Record<string, any>;
  old?: Record<string, any>;
  timestamp: string;
}

export interface UnifiedRealTimeServiceOptions {
  autoConnect?: boolean;
  enableEvents?: boolean;
  enableReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
}

export interface IRealTimeProvider {
  connect(config: RealTimeConfig): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  // Channel management
  createChannel(name: string, options?: any): Promise<any>;
  joinChannel(channel: any): Promise<void>;
  leaveChannel(channel: any): Promise<void>;
  
  // Messaging
  sendMessage(channel: any, event: string, payload: any): Promise<void>;
  onMessage(channel: any, event: string, callback: (payload: any) => void): () => void;
  
  // Presence
  trackPresence(channel: any, state: PresenceState): Promise<void>;
  untrackPresence(channel: any): Promise<void>;
  onPresenceChange(channel: any, callback: (presences: PresenceState[]) => void): () => void;
  
  // Database changes
  onDatabaseChange(
    channel: any, 
    config: any, 
    callback: (payload: PostgresChangesPayload) => void
  ): () => void;
}

export class UnifiedRealTimeService extends EventEmitter {
  private provider: IRealTimeProvider | null = null;
  private config: RealTimeConfig | null = null;
  private options: Required<UnifiedRealTimeServiceOptions>;
  private isConnectedFlag = false;
  private channels = new Map<string, any>();
  private reconnectAttempts = 0;
  private heartbeatTimer?: NodeJS.Timeout;
  private reconnectTimer?: NodeJS.Timeout;
  private messageListeners = new Map<string, (() => void)[]>();

  constructor(options: UnifiedRealTimeServiceOptions = {}) {
    super();
    
    this.options = {
      autoConnect: options.autoConnect ?? true,
      enableEvents: options.enableEvents ?? true,
      enableReconnect: options.enableReconnect ?? true,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 5,
      reconnectInterval: options.reconnectInterval ?? 5000,
      heartbeatInterval: options.heartbeatInterval ?? 30000
    };
  }

  /**
   * Connect to realtime provider
   */
  async connect(config: RealTimeConfig): Promise<void> {
    try {
      this.config = config;
      
      // Create provider instance based on type
      this.provider = this.createProvider(config);
      
      // Connect to provider
      await this.provider.connect(config);
      
      this.isConnectedFlag = true;
      this.reconnectAttempts = 0;
      
      // Start heartbeat if enabled
      if (this.options.heartbeatInterval > 0) {
        this.startHeartbeat();
      }
      
      // Setup connection monitoring
      this.setupConnectionMonitoring();
      
      this.emit('connected', { provider: config.type });
      
    } catch (error) {
      this.emit('connection:failed', { error });
      
      // Attempt reconnection if enabled
      if (this.options.enableReconnect) {
        this.scheduleReconnect();
      }
      
      throw error;
    }
  }

  /**
   * Disconnect from realtime provider
   */
  async disconnect(): Promise<void> {
    try {
      // Stop timers
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = undefined;
      }
      
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = undefined;
      }
      
      // Leave all channels
      for (const [channelName, channel] of this.channels) {
        try {
          await this.leaveChannel(channelName);
        } catch (error) {
          // Ignore errors when leaving channels during disconnect
        }
      }
      
      // Disconnect provider
      if (this.provider) {
        await this.provider.disconnect();
      }
      
      this.isConnectedFlag = false;
      this.provider = null;
      this.config = null;
      
      // Clear listeners
      this.clearAllListeners();
      
      this.emit('disconnected');
      
    } catch (error) {
      this.emit('disconnection:failed', { error });
      throw error;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.isConnectedFlag && this.provider?.isConnected() === true;
  }

  // Channel Management
  
  async createChannel(name: string, options: RealtimeChannel = { name, topic: name }): Promise<void> {
    this.ensureConnected();
    
    try {
      if (this.channels.has(name)) {
        throw new Error(`Channel '${name}' already exists`);
      }
      
      const channel = await this.provider!.createChannel(name, options);
      this.channels.set(name, channel);
      
      this.emit('channel:created', { name, options });
      
    } catch (error) {
      this.emit('channel:create:failed', { name, error });
      throw error;
    }
  }

  async joinChannel(name: string): Promise<void> {
    this.ensureConnected();
    
    try {
      const channel = this.channels.get(name);
      if (!channel) {
        throw new Error(`Channel '${name}' not found`);
      }
      
      await this.provider!.joinChannel(channel);
      
      this.emit('channel:joined', { name });
      
    } catch (error) {
      this.emit('channel:join:failed', { name, error });
      throw error;
    }
  }

  async leaveChannel(name: string): Promise<void> {
    this.ensureConnected();
    
    try {
      const channel = this.channels.get(name);
      if (!channel) {
        throw new Error(`Channel '${name}' not found`);
      }
      
      await this.provider!.leaveChannel(channel);
      
      // Clear listeners for this channel
      this.clearChannelListeners(name);
      
      // Remove channel
      this.channels.delete(name);
      
      this.emit('channel:left', { name });
      
    } catch (error) {
      this.emit('channel:leave:failed', { name, error });
      throw error;
    }
  }

  getChannels(): string[] {
    return Array.from(this.channels.keys());
  }

  hasChannel(name: string): boolean {
    return this.channels.has(name);
  }

  // Messaging
  
  async sendMessage(channelName: string, event: string, payload: any): Promise<void> {
    this.ensureConnected();
    
    try {
      const channel = this.channels.get(channelName);
      if (!channel) {
        throw new Error(`Channel '${channelName}' not found`);
      }
      
      await this.provider!.sendMessage(channel, event, payload);
      
      this.emit('message:sent', { channelName, event, payload });
      
    } catch (error) {
      this.emit('message:send:failed', { channelName, event, error });
      throw error;
    }
  }

  onMessage(
    channelName: string, 
    event: string, 
    callback: (payload: any) => void
  ): () => void {
    this.ensureConnected();
    
    const channel = this.channels.get(channelName);
    if (!channel) {
      throw new Error(`Channel '${channelName}' not found`);
    }
    
    const unsubscribe = this.provider!.onMessage(channel, event, (payload) => {
      this.emit('message:received', { channelName, event, payload });
      callback(payload);
    });
    
    // Store listener for cleanup
    const key = `${channelName}:${event}:message`;
    const listeners = this.messageListeners.get(key) || [];
    listeners.push(unsubscribe);
    this.messageListeners.set(key, listeners);
    
    return unsubscribe;
  }

  // Presence
  
  async trackPresence(channelName: string, state: PresenceState): Promise<void> {
    this.ensureConnected();
    
    try {
      const channel = this.channels.get(channelName);
      if (!channel) {
        throw new Error(`Channel '${channelName}' not found`);
      }
      
      await this.provider!.trackPresence(channel, state);
      
      this.emit('presence:tracked', { channelName, state });
      
    } catch (error) {
      this.emit('presence:track:failed', { channelName, error });
      throw error;
    }
  }

  async untrackPresence(channelName: string): Promise<void> {
    this.ensureConnected();
    
    try {
      const channel = this.channels.get(channelName);
      if (!channel) {
        throw new Error(`Channel '${channelName}' not found`);
      }
      
      await this.provider!.untrackPresence(channel);
      
      this.emit('presence:untracked', { channelName });
      
    } catch (error) {
      this.emit('presence:untrack:failed', { channelName, error });
      throw error;
    }
  }

  onPresenceChange(
    channelName: string, 
    callback: (presences: PresenceState[]) => void
  ): () => void {
    this.ensureConnected();
    
    const channel = this.channels.get(channelName);
    if (!channel) {
      throw new Error(`Channel '${channelName}' not found`);
    }
    
    const unsubscribe = this.provider!.onPresenceChange(channel, (presences) => {
      this.emit('presence:changed', { channelName, presences });
      callback(presences);
    });
    
    // Store listener for cleanup
    const key = `${channelName}:presence`;
    const listeners = this.messageListeners.get(key) || [];
    listeners.push(unsubscribe);
    this.messageListeners.set(key, listeners);
    
    return unsubscribe;
  }

  // Database Changes
  
  onDatabaseChange(
    channelName: string,
    config: {
      event: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
      schema: string;
      table: string;
      filter?: string;
    },
    callback: (payload: PostgresChangesPayload) => void
  ): () => void {
    this.ensureConnected();
    
    const channel = this.channels.get(channelName);
    if (!channel) {
      throw new Error(`Channel '${channelName}' not found`);
    }
    
    const unsubscribe = this.provider!.onDatabaseChange(channel, config, (payload) => {
      this.emit('database:change', { channelName, payload });
      callback(payload);
    });
    
    // Store listener for cleanup
    const key = `${channelName}:db:${config.table}`;
    const listeners = this.messageListeners.get(key) || [];
    listeners.push(unsubscribe);
    this.messageListeners.set(key, listeners);
    
    return unsubscribe;
  }

  // Broadcast to all channels
  async broadcast(event: string, payload: any): Promise<void> {
    const channels = Array.from(this.channels.keys());
    
    await Promise.all(
      channels.map(channelName => 
        this.sendMessage(channelName, event, payload).catch(error => {
          this.emit('broadcast:failed', { channelName, event, error });
        })
      )
    );
    
    this.emit('broadcast:completed', { event, payload, channels });
  }

  // Utility Methods
  
  private ensureConnected(): void {
    if (!this.isConnected()) {
      throw new Error('RealTime service is not connected');
    }
  }

  private createProvider(config: RealTimeConfig): IRealTimeProvider {
    switch (config.type) {
      case 'supabase':
        return new SupabaseRealTimeProvider();
      case 'firebase':
        return new FirebaseRealTimeProvider();
      case 'socket.io':
        return new SocketIOProvider();
      case 'websocket':
        return new WebSocketProvider();
      case 'sse':
        return new SSEProvider();
      default:
        throw new Error(`Unsupported realtime provider: ${config.type}`);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(async () => {
      try {
        if (!this.isConnected()) {
          this.emit('heartbeat:failed', { reason: 'not_connected' });
          
          if (this.options.enableReconnect) {
            this.scheduleReconnect();
          }
        } else {
          this.emit('heartbeat:success');
        }
      } catch (error) {
        this.emit('heartbeat:error', { error });
      }
    }, this.options.heartbeatInterval);
  }

  private setupConnectionMonitoring(): void {
    // Monitor connection state and handle disconnections
    // This would be implementation-specific based on the provider
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.emit('reconnect:max_attempts_reached', { attempts: this.reconnectAttempts });
      return;
    }
    
    this.reconnectAttempts++;
    
    this.reconnectTimer = setTimeout(async () => {
      try {
        this.emit('reconnect:attempting', { attempt: this.reconnectAttempts });
        
        if (this.config) {
          await this.connect(this.config);
          this.emit('reconnect:successful', { attempt: this.reconnectAttempts });
        }
      } catch (error) {
        this.emit('reconnect:failed', { attempt: this.reconnectAttempts, error });
        this.scheduleReconnect();
      }
    }, this.options.reconnectInterval * this.reconnectAttempts);
  }

  private clearChannelListeners(channelName: string): void {
    for (const [key, listeners] of this.messageListeners.entries()) {
      if (key.startsWith(channelName)) {
        listeners.forEach(unsubscribe => unsubscribe());
        this.messageListeners.delete(key);
      }
    }
  }

  private clearAllListeners(): void {
    for (const listeners of this.messageListeners.values()) {
      listeners.forEach(unsubscribe => unsubscribe());
    }
    this.messageListeners.clear();
  }
}

// Placeholder provider implementations
// These would be implemented in separate files

class SupabaseRealTimeProvider implements IRealTimeProvider {
  async connect(config: RealTimeConfig): Promise<void> {
    // Implementation for Supabase realtime
    throw new Error('Not implemented');
  }
  
  async disconnect(): Promise<void> {
    throw new Error('Not implemented');
  }
  
  isConnected(): boolean {
    return false;
  }
  
  async createChannel(name: string, options?: any): Promise<any> {
    throw new Error('Not implemented');
  }
  
  async joinChannel(channel: any): Promise<void> {
    throw new Error('Not implemented');
  }
  
  async leaveChannel(channel: any): Promise<void> {
    throw new Error('Not implemented');
  }
  
  async sendMessage(channel: any, event: string, payload: any): Promise<void> {
    throw new Error('Not implemented');
  }
  
  onMessage(channel: any, event: string, callback: (payload: any) => void): () => void {
    throw new Error('Not implemented');
  }
  
  async trackPresence(channel: any, state: PresenceState): Promise<void> {
    throw new Error('Not implemented');
  }
  
  async untrackPresence(channel: any): Promise<void> {
    throw new Error('Not implemented');
  }
  
  onPresenceChange(channel: any, callback: (presences: PresenceState[]) => void): () => void {
    throw new Error('Not implemented');
  }
  
  onDatabaseChange(channel: any, config: any, callback: (payload: PostgresChangesPayload) => void): () => void {
    throw new Error('Not implemented');
  }
}

class FirebaseRealTimeProvider implements IRealTimeProvider {
  // Similar implementation for Firebase
  async connect(config: RealTimeConfig): Promise<void> { throw new Error('Not implemented'); }
  async disconnect(): Promise<void> { throw new Error('Not implemented'); }
  isConnected(): boolean { return false; }
  async createChannel(name: string, options?: any): Promise<any> { throw new Error('Not implemented'); }
  async joinChannel(channel: any): Promise<void> { throw new Error('Not implemented'); }
  async leaveChannel(channel: any): Promise<void> { throw new Error('Not implemented'); }
  async sendMessage(channel: any, event: string, payload: any): Promise<void> { throw new Error('Not implemented'); }
  onMessage(channel: any, event: string, callback: (payload: any) => void): () => void { throw new Error('Not implemented'); }
  async trackPresence(channel: any, state: PresenceState): Promise<void> { throw new Error('Not implemented'); }
  async untrackPresence(channel: any): Promise<void> { throw new Error('Not implemented'); }
  onPresenceChange(channel: any, callback: (presences: PresenceState[]) => void): () => void { throw new Error('Not implemented'); }
  onDatabaseChange(channel: any, config: any, callback: (payload: PostgresChangesPayload) => void): () => void { throw new Error('Not implemented'); }
}

class SocketIOProvider implements IRealTimeProvider {
  // Implementation for Socket.IO
  async connect(config: RealTimeConfig): Promise<void> { throw new Error('Not implemented'); }
  async disconnect(): Promise<void> { throw new Error('Not implemented'); }
  isConnected(): boolean { return false; }
  async createChannel(name: string, options?: any): Promise<any> { throw new Error('Not implemented'); }
  async joinChannel(channel: any): Promise<void> { throw new Error('Not implemented'); }
  async leaveChannel(channel: any): Promise<void> { throw new Error('Not implemented'); }
  async sendMessage(channel: any, event: string, payload: any): Promise<void> { throw new Error('Not implemented'); }
  onMessage(channel: any, event: string, callback: (payload: any) => void): () => void { throw new Error('Not implemented'); }
  async trackPresence(channel: any, state: PresenceState): Promise<void> { throw new Error('Not implemented'); }
  async untrackPresence(channel: any): Promise<void> { throw new Error('Not implemented'); }
  onPresenceChange(channel: any, callback: (presences: PresenceState[]) => void): () => void { throw new Error('Not implemented'); }
  onDatabaseChange(channel: any, config: any, callback: (payload: PostgresChangesPayload) => void): () => void { throw new Error('Not implemented'); }
}

class WebSocketProvider implements IRealTimeProvider {
  // Implementation for raw WebSocket
  async connect(config: RealTimeConfig): Promise<void> { throw new Error('Not implemented'); }
  async disconnect(): Promise<void> { throw new Error('Not implemented'); }
  isConnected(): boolean { return false; }
  async createChannel(name: string, options?: any): Promise<any> { throw new Error('Not implemented'); }
  async joinChannel(channel: any): Promise<void> { throw new Error('Not implemented'); }
  async leaveChannel(channel: any): Promise<void> { throw new Error('Not implemented'); }
  async sendMessage(channel: any, event: string, payload: any): Promise<void> { throw new Error('Not implemented'); }
  onMessage(channel: any, event: string, callback: (payload: any) => void): () => void { throw new Error('Not implemented'); }
  async trackPresence(channel: any, state: PresenceState): Promise<void> { throw new Error('Not implemented'); }
  async untrackPresence(channel: any): Promise<void> { throw new Error('Not implemented'); }
  onPresenceChange(channel: any, callback: (presences: PresenceState[]) => void): () => void { throw new Error('Not implemented'); }
  onDatabaseChange(channel: any, config: any, callback: (payload: PostgresChangesPayload) => void): () => void { throw new Error('Not implemented'); }
}

class SSEProvider implements IRealTimeProvider {
  // Implementation for Server-Sent Events
  async connect(config: RealTimeConfig): Promise<void> { throw new Error('Not implemented'); }
  async disconnect(): Promise<void> { throw new Error('Not implemented'); }
  isConnected(): boolean { return false; }
  async createChannel(name: string, options?: any): Promise<any> { throw new Error('Not implemented'); }
  async joinChannel(channel: any): Promise<void> { throw new Error('Not implemented'); }
  async leaveChannel(channel: any): Promise<void> { throw new Error('Not implemented'); }
  async sendMessage(channel: any, event: string, payload: any): Promise<void> { throw new Error('Not implemented'); }
  onMessage(channel: any, event: string, callback: (payload: any) => void): () => void { throw new Error('Not implemented'); }
  async trackPresence(channel: any, state: PresenceState): Promise<void> { throw new Error('Not implemented'); }
  async untrackPresence(channel: any): Promise<void> { throw new Error('Not implemented'); }
  onPresenceChange(channel: any, callback: (presences: PresenceState[]) => void): () => void { throw new Error('Not implemented'); }
  onDatabaseChange(channel: any, config: any, callback: (payload: PostgresChangesPayload) => void): () => void { throw new Error('Not implemented'); }
}
