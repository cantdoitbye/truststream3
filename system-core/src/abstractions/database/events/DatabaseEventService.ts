/**
 * Database Event Service
 * Event handling and broadcasting for database operations
 */

import { 
  IDatabaseEventService,
  TransactionOperation
} from '../../../shared-utils/database-interface';
import { EventEmitter } from 'events';

export interface DatabaseEvent {
  type: 'connection' | 'query' | 'transaction' | 'error' | 'schema' | 'performance';
  timestamp: Date;
  source: string;
  data: any;
  metadata?: Record<string, any>;
}

export interface QueryEvent extends DatabaseEvent {
  type: 'query';
  data: {
    query: string;
    params?: any[];
    duration: number;
    rowsAffected: number;
    table?: string;
    operation: 'create' | 'read' | 'update' | 'delete' | 'raw';
  };
}

export interface ConnectionEvent extends DatabaseEvent {
  type: 'connection';
  data: {
    connected: boolean;
    provider: string;
    connectionId?: string;
    poolStats?: any;
  };
}

export interface TransactionEvent extends DatabaseEvent {
  type: 'transaction';
  data: {
    transactionId: string;
    operations: TransactionOperation[];
    result: any;
    status: 'started' | 'committed' | 'rolled_back' | 'failed';
    duration?: number;
  };
}

export interface ErrorEvent extends DatabaseEvent {
  type: 'error';
  data: {
    error: Error;
    context: string;
    query?: string;
    transactionId?: string;
  };
}

export interface PerformanceEvent extends DatabaseEvent {
  type: 'performance';
  data: {
    metric: 'slow_query' | 'high_memory' | 'connection_limit' | 'deadlock';
    value: number;
    threshold: number;
    details: any;
  };
}

export interface EventSubscription {
  id: string;
  eventType: string;
  callback: (event: DatabaseEvent) => void;
  filter?: (event: DatabaseEvent) => boolean;
  once?: boolean;
}

export class DatabaseEventService extends EventEmitter implements IDatabaseEventService {
  private subscriptions = new Map<string, EventSubscription>();
  private eventHistory: DatabaseEvent[] = [];
  private maxHistorySize = 1000;
  private subscriptionCounter = 0;

  /**
   * Subscribe to connection events
   */
  onConnection(callback: (connected: boolean) => void): () => void {
    const subscription = this.subscribe('connection', (event) => {
      const connectionEvent = event as ConnectionEvent;
      callback(connectionEvent.data.connected);
    });

    return () => this.unsubscribe(subscription.id);
  }

  /**
   * Subscribe to query events
   */
  onQuery(callback: (query: string, duration: number) => void): () => void {
    const subscription = this.subscribe('query', (event) => {
      const queryEvent = event as QueryEvent;
      callback(queryEvent.data.query, queryEvent.data.duration);
    });

    return () => this.unsubscribe(subscription.id);
  }

  /**
   * Subscribe to error events
   */
  onError(callback: (error: Error) => void): () => void {
    const subscription = this.subscribe('error', (event) => {
      const errorEvent = event as ErrorEvent;
      callback(errorEvent.data.error);
    });

    return () => this.unsubscribe(subscription.id);
  }

  /**
   * Subscribe to transaction events
   */
  onTransaction(callback: (operations: TransactionOperation[], result: any) => void): () => void {
    const subscription = this.subscribe('transaction', (event) => {
      const transactionEvent = event as TransactionEvent;
      if (transactionEvent.data.status === 'committed') {
        callback(transactionEvent.data.operations, transactionEvent.data.result);
      }
    });

    return () => this.unsubscribe(subscription.id);
  }

  /**
   * Subscribe to specific event type
   */
  subscribe(
    eventType: string, 
    callback: (event: DatabaseEvent) => void,
    filter?: (event: DatabaseEvent) => boolean,
    once = false
  ): EventSubscription {
    const subscription: EventSubscription = {
      id: this.generateSubscriptionId(),
      eventType,
      callback,
      filter,
      once
    };

    this.subscriptions.set(subscription.id, subscription);
    return subscription;
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): boolean {
    return this.subscriptions.delete(subscriptionId);
  }

  /**
   * Broadcast database event
   */
  async broadcastEvent(event: DatabaseEvent): Promise<void> {
    // Add to history
    this.addToHistory(event);

    // Emit to EventEmitter listeners
    this.emit(event.type, event);
    this.emit('*', event);

    // Process subscriptions
    const subscriptionsToRemove: string[] = [];

    for (const [id, subscription] of this.subscriptions) {
      if (subscription.eventType === event.type || subscription.eventType === '*') {
        try {
          // Apply filter if present
          if (subscription.filter && !subscription.filter(event)) {
            continue;
          }

          // Call the callback
          await subscription.callback(event);

          // Mark for removal if it's a one-time subscription
          if (subscription.once) {
            subscriptionsToRemove.push(id);
          }
        } catch (error) {
          console.error(`Error in event subscription ${id}:`, error);
          
          // Broadcast error event
          this.broadcastErrorEvent(error as Error, `subscription_${id}`);
        }
      }
    }

    // Remove one-time subscriptions
    for (const id of subscriptionsToRemove) {
      this.subscriptions.delete(id);
    }
  }

  /**
   * Broadcast connection event
   */
  async broadcastConnectionEvent(
    connected: boolean, 
    provider: string, 
    connectionId?: string,
    poolStats?: any
  ): Promise<void> {
    const event: ConnectionEvent = {
      type: 'connection',
      timestamp: new Date(),
      source: provider,
      data: {
        connected,
        provider,
        connectionId,
        poolStats
      }
    };

    await this.broadcastEvent(event);
  }

  /**
   * Broadcast query event
   */
  async broadcastQueryEvent(
    query: string,
    duration: number,
    operation: 'create' | 'read' | 'update' | 'delete' | 'raw',
    table?: string,
    params?: any[],
    rowsAffected = 0
  ): Promise<void> {
    const event: QueryEvent = {
      type: 'query',
      timestamp: new Date(),
      source: 'database',
      data: {
        query,
        params,
        duration,
        rowsAffected,
        table,
        operation
      }
    };

    await this.broadcastEvent(event);
  }

  /**
   * Broadcast transaction event
   */
  async broadcastTransactionEvent(
    transactionId: string,
    operations: TransactionOperation[],
    result: any,
    status: 'started' | 'committed' | 'rolled_back' | 'failed',
    duration?: number
  ): Promise<void> {
    const event: TransactionEvent = {
      type: 'transaction',
      timestamp: new Date(),
      source: 'transaction_manager',
      data: {
        transactionId,
        operations,
        result,
        status,
        duration
      }
    };

    await this.broadcastEvent(event);
  }

  /**
   * Broadcast error event
   */
  async broadcastErrorEvent(
    error: Error, 
    context: string, 
    query?: string, 
    transactionId?: string
  ): Promise<void> {
    const event: ErrorEvent = {
      type: 'error',
      timestamp: new Date(),
      source: context,
      data: {
        error,
        context,
        query,
        transactionId
      }
    };

    await this.broadcastEvent(event);
  }

  /**
   * Broadcast performance event
   */
  async broadcastPerformanceEvent(
    metric: 'slow_query' | 'high_memory' | 'connection_limit' | 'deadlock',
    value: number,
    threshold: number,
    details: any
  ): Promise<void> {
    const event: PerformanceEvent = {
      type: 'performance',
      timestamp: new Date(),
      source: 'performance_monitor',
      data: {
        metric,
        value,
        threshold,
        details
      }
    };

    await this.broadcastEvent(event);
  }

  /**
   * Get event history
   */
  getEventHistory(eventType?: string, limit = 100): DatabaseEvent[] {
    let events = this.eventHistory;
    
    if (eventType) {
      events = events.filter(event => event.type === eventType);
    }
    
    return events.slice(-limit);
  }

  /**
   * Clear event history
   */
  clearEventHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get subscription statistics
   */
  getSubscriptionStats(): {
    total: number;
    byType: Record<string, number>;
    active: number;
  } {
    const stats = {
      total: this.subscriptions.size,
      byType: {} as Record<string, number>,
      active: this.subscriptions.size
    };

    for (const subscription of this.subscriptions.values()) {
      stats.byType[subscription.eventType] = (stats.byType[subscription.eventType] || 0) + 1;
    }

    return stats;
  }

  /**
   * Create event filter for slow queries
   */
  createSlowQueryFilter(thresholdMs: number): (event: DatabaseEvent) => boolean {
    return (event: DatabaseEvent) => {
      if (event.type === 'query') {
        const queryEvent = event as QueryEvent;
        return queryEvent.data.duration > thresholdMs;
      }
      return false;
    };
  }

  /**
   * Create event filter for specific tables
   */
  createTableFilter(tableNames: string[]): (event: DatabaseEvent) => boolean {
    return (event: DatabaseEvent) => {
      if (event.type === 'query') {
        const queryEvent = event as QueryEvent;
        return tableNames.includes(queryEvent.data.table || '');
      }
      return false;
    };
  }

  /**
   * Create event filter for error types
   */
  createErrorFilter(errorTypes: string[]): (event: DatabaseEvent) => boolean {
    return (event: DatabaseEvent) => {
      if (event.type === 'error') {
        const errorEvent = event as ErrorEvent;
        return errorTypes.includes(errorEvent.data.error.name);
      }
      return false;
    };
  }

  private addToHistory(event: DatabaseEvent): void {
    this.eventHistory.push(event);
    
    // Maintain history size limit
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${++this.subscriptionCounter}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const databaseEventService = new DatabaseEventService();