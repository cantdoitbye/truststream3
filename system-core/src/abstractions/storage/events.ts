/**
 * Storage Events System
 * Handles storage-related events and notifications
 */

import { EventEmitter } from 'events';
import { StorageEvent, StorageError } from '../../shared-utils/storage-interface';
import { StorageProviderEvent, StorageMetrics } from './storage.interface';

export interface StorageEventHandler {
  id: string;
  event: string;
  handler: Function;
  once?: boolean;
  priority?: number;
}

export interface StorageEventSubscription {
  unsubscribe: () => void;
  id: string;
}

export class StorageEventEmitter extends EventEmitter {
  private static instance: StorageEventEmitter;
  private eventHandlers: Map<string, StorageEventHandler[]> = new Map();
  private eventHistory: Array<{ event: string; data: any; timestamp: Date }> = [];
  private maxHistorySize = 100;

  private constructor() {
    super();
    this.setMaxListeners(50);
  }

  public static getInstance(): StorageEventEmitter {
    if (!StorageEventEmitter.instance) {
      StorageEventEmitter.instance = new StorageEventEmitter();
    }
    return StorageEventEmitter.instance;
  }

  /**
   * Subscribe to file upload events
   */
  public onUpload(handler: (event: StorageEvent) => void): StorageEventSubscription {
    return this.subscribe('storage:upload', handler);
  }

  /**
   * Subscribe to file download events
   */
  public onDownload(handler: (event: StorageEvent) => void): StorageEventSubscription {
    return this.subscribe('storage:download', handler);
  }

  /**
   * Subscribe to file delete events
   */
  public onDelete(handler: (event: StorageEvent) => void): StorageEventSubscription {
    return this.subscribe('storage:delete', handler);
  }

  /**
   * Subscribe to file move events
   */
  public onMove(handler: (event: StorageEvent) => void): StorageEventSubscription {
    return this.subscribe('storage:move', handler);
  }

  /**
   * Subscribe to file copy events
   */
  public onCopy(handler: (event: StorageEvent) => void): StorageEventSubscription {
    return this.subscribe('storage:copy', handler);
  }

  /**
   * Subscribe to storage provider events
   */
  public onProviderEvent(handler: (event: StorageProviderEvent) => void): StorageEventSubscription {
    return this.subscribe('storage:providerEvent', handler);
  }

  /**
   * Subscribe to storage metrics updates
   */
  public onMetricsUpdate(handler: (metrics: StorageMetrics) => void): StorageEventSubscription {
    return this.subscribe('storage:metricsUpdate', handler);
  }

  /**
   * Subscribe to storage errors
   */
  public onStorageError(handler: (error: StorageError, context?: string) => void): StorageEventSubscription {
    return this.subscribe('storage:error', handler);
  }

  /**
   * Subscribe to bucket events
   */
  public onBucketEvent(handler: (event: { type: string; bucket: string; timestamp: Date }) => void): StorageEventSubscription {
    return this.subscribe('storage:bucketEvent', handler);
  }

  /**
   * Broadcast file upload event
   */
  public emitUpload(event: StorageEvent): void {
    this.emitEvent('storage:upload', event);
  }

  /**
   * Broadcast file download event
   */
  public emitDownload(event: StorageEvent): void {
    this.emitEvent('storage:download', event);
  }

  /**
   * Broadcast file delete event
   */
  public emitDelete(event: StorageEvent): void {
    this.emitEvent('storage:delete', event);
  }

  /**
   * Broadcast file move event
   */
  public emitMove(event: StorageEvent): void {
    this.emitEvent('storage:move', event);
  }

  /**
   * Broadcast file copy event
   */
  public emitCopy(event: StorageEvent): void {
    this.emitEvent('storage:copy', event);
  }

  /**
   * Broadcast provider event
   */
  public emitProviderEvent(event: StorageProviderEvent): void {
    this.emitEvent('storage:providerEvent', event);
  }

  /**
   * Broadcast metrics update
   */
  public emitMetricsUpdate(metrics: StorageMetrics): void {
    this.emitEvent('storage:metricsUpdate', metrics);
  }

  /**
   * Broadcast storage error
   */
  public emitStorageError(error: StorageError, context?: string): void {
    this.emitEvent('storage:error', { error, context });
  }

  /**
   * Broadcast bucket event
   */
  public emitBucketEvent(type: string, bucket: string): void {
    this.emitEvent('storage:bucketEvent', {
      type,
      bucket,
      timestamp: new Date()
    });
  }

  /**
   * Generic event subscription with advanced options
   */
  public subscribe(
    eventName: string, 
    handler: Function, 
    options: { once?: boolean; priority?: number } = {}
  ): StorageEventSubscription {
    const id = this.generateId();
    const eventHandler: StorageEventHandler = {
      id,
      event: eventName,
      handler,
      once: options.once,
      priority: options.priority || 0
    };

    // Add to handlers map
    const handlers = this.eventHandlers.get(eventName) || [];
    handlers.push(eventHandler);
    
    // Sort by priority (higher priority first)
    handlers.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    this.eventHandlers.set(eventName, handlers);

    // Set up EventEmitter listener
    const wrappedHandler = (...args: any[]) => {
      try {
        handler(...args);
        
        // Remove if once
        if (eventHandler.once) {
          this.unsubscribe(id);
        }
      } catch (error) {
        console.error(`Error in storage event handler for ${eventName}:`, error);
        this.emitStorageError(
          error instanceof StorageError ? error : new StorageError('Event handler error', 'EVENT_HANDLER_ERROR', 500, error),
          eventName
        );
      }
    };

    if (options.once) {
      this.once(eventName, wrappedHandler);
    } else {
      this.on(eventName, wrappedHandler);
    }

    return {
      unsubscribe: () => this.unsubscribe(id),
      id
    };
  }

  /**
   * Unsubscribe from an event
   */
  public unsubscribe(subscriptionId: string): boolean {
    for (const [eventName, handlers] of this.eventHandlers.entries()) {
      const index = handlers.findIndex(h => h.id === subscriptionId);
      if (index !== -1) {
        const handler = handlers[index];
        handlers.splice(index, 1);
        
        // Remove from EventEmitter
        this.removeListener(eventName, handler.handler);
        
        if (handlers.length === 0) {
          this.eventHandlers.delete(eventName);
        }
        
        return true;
      }
    }
    return false;
  }

  /**
   * Get all active subscriptions
   */
  public getActiveSubscriptions(): Array<{ id: string; event: string; priority: number }> {
    const subscriptions: Array<{ id: string; event: string; priority: number }> = [];
    
    for (const handlers of this.eventHandlers.values()) {
      for (const handler of handlers) {
        subscriptions.push({
          id: handler.id,
          event: handler.event,
          priority: handler.priority || 0
        });
      }
    }
    
    return subscriptions;
  }

  /**
   * Get event history
   */
  public getEventHistory(eventType?: string): Array<{ event: string; data: any; timestamp: Date }> {
    if (eventType) {
      return this.eventHistory.filter(entry => entry.event === eventType);
    }
    return [...this.eventHistory];
  }

  /**
   * Clear event history
   */
  public clearEventHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Wait for a specific event (Promise-based)
   */
  public waitForEvent(eventName: string, timeout?: number): Promise<any> {
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | undefined;
      
      const subscription = this.subscribe(eventName, (data: any) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        subscription.unsubscribe();
        resolve(data);
      }, { once: true });

      if (timeout) {
        timeoutId = setTimeout(() => {
          subscription.unsubscribe();
          reject(new Error(`Timeout waiting for event: ${eventName}`));
        }, timeout);
      }
    });
  }

  /**
   * Create an event filter that only triggers when condition is met
   */
  public createEventFilter<T>(
    eventName: string,
    filterFn: (data: T) => boolean,
    handler: (data: T) => void
  ): StorageEventSubscription {
    return this.subscribe(eventName, (data: T) => {
      if (filterFn(data)) {
        handler(data);
      }
    });
  }

  /**
   * Create a debounced event handler
   */
  public createDebouncedHandler(
    eventName: string,
    handler: Function,
    delay: number
  ): StorageEventSubscription {
    let timeoutId: NodeJS.Timeout | undefined;
    
    return this.subscribe(eventName, (...args: any[]) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        handler(...args);
      }, delay);
    });
  }

  /**
   * Batch multiple events into a single handler
   */
  public createBatchHandler(
    eventNames: string[],
    handler: (events: Array<{ event: string; data: any }>) => void,
    batchSize: number = 10,
    timeout: number = 1000
  ): StorageEventSubscription[] {
    const events: Array<{ event: string; data: any }> = [];
    let timeoutId: NodeJS.Timeout | undefined;
    
    const flush = () => {
      if (events.length > 0) {
        handler([...events]);
        events.length = 0;
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
    };
    
    const addEvent = (eventName: string, data: any) => {
      events.push({ event: eventName, data });
      
      if (events.length >= batchSize) {
        flush();
      } else if (!timeoutId) {
        timeoutId = setTimeout(flush, timeout);
      }
    };
    
    return eventNames.map(eventName => 
      this.subscribe(eventName, (data: any) => addEvent(eventName, data))
    );
  }

  /**
   * Get event statistics
   */
  public getEventStats(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    activeSubscriptions: number;
    eventsPerMinute: number;
  } {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    
    const recentEvents = this.eventHistory.filter(entry => entry.timestamp >= oneMinuteAgo);
    const eventsByType: Record<string, number> = {};
    
    for (const entry of this.eventHistory) {
      eventsByType[entry.event] = (eventsByType[entry.event] || 0) + 1;
    }
    
    return {
      totalEvents: this.eventHistory.length,
      eventsByType,
      activeSubscriptions: this.getActiveSubscriptions().length,
      eventsPerMinute: recentEvents.length
    };
  }

  /**
   * Create a rate-limited event handler
   */
  public createRateLimitedHandler(
    eventName: string,
    handler: Function,
    maxCalls: number,
    windowMs: number
  ): StorageEventSubscription {
    const calls: number[] = [];
    
    return this.subscribe(eventName, (...args: any[]) => {
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Remove old calls
      while (calls.length > 0 && calls[0] < windowStart) {
        calls.shift();
      }
      
      if (calls.length < maxCalls) {
        calls.push(now);
        handler(...args);
      }
    });
  }

  /**
   * Private method to emit events with history tracking
   */
  private emitEvent(eventName: string, data?: any): void {
    // Add to history
    this.eventHistory.push({
      event: eventName,
      data,
      timestamp: new Date()
    });
    
    // Trim history if too large
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
    
    // Emit the event
    this.emit(eventName, data);
  }

  private generateId(): string {
    return `storage-event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up all subscriptions and reset state
   */
  public cleanup(): void {
    this.removeAllListeners();
    this.eventHandlers.clear();
    this.eventHistory = [];
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  public static reset(): void {
    if (StorageEventEmitter.instance) {
      StorageEventEmitter.instance.cleanup();
      StorageEventEmitter.instance = null as any;
    }
  }
}

// Default export for easy access
export const storageEvents = StorageEventEmitter.getInstance();
