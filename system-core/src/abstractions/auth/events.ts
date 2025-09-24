/**
 * Auth Events System
 * Handles authentication-related events and notifications
 */

import { EventEmitter } from 'events';
import {
  AuthEvent,
  SecurityEvent,
  MFAEvent,
  User,
  Session
} from '../../shared-utils/auth-interface';
import { AuthProviderEvent, AuthMetrics } from './auth.interface';

export interface AuthEventHandler {
  id: string;
  event: string;
  handler: Function;
  once?: boolean;
  priority?: number;
}

export interface EventSubscription {
  unsubscribe: () => void;
  id: string;
}

export class AuthEventEmitter extends EventEmitter {
  private static instance: AuthEventEmitter;
  private eventHandlers: Map<string, AuthEventHandler[]> = new Map();
  private eventHistory: Array<{ event: string; data: any; timestamp: Date }> = [];
  private maxHistorySize = 100;

  private constructor() {
    super();
    this.setMaxListeners(50); // Increase default limit for high-traffic auth events
  }

  public static getInstance(): AuthEventEmitter {
    if (!AuthEventEmitter.instance) {
      AuthEventEmitter.instance = new AuthEventEmitter();
    }
    return AuthEventEmitter.instance;
  }

  /**
   * Subscribe to authentication state changes
   */
  public onAuthStateChange(handler: (event: AuthEvent, session: Session | null) => void): EventSubscription {
    return this.subscribe('auth:stateChange', handler);
  }

  /**
   * Subscribe to user profile updates
   */
  public onUserUpdate(handler: (user: User) => void): EventSubscription {
    return this.subscribe('auth:userUpdate', handler);
  }

  /**
   * Subscribe to session expiry events
   */
  public onSessionExpiry(handler: () => void): EventSubscription {
    return this.subscribe('auth:sessionExpiry', handler);
  }

  /**
   * Subscribe to password change events
   */
  public onPasswordChange(handler: (userId: string) => void): EventSubscription {
    return this.subscribe('auth:passwordChange', handler);
  }

  /**
   * Subscribe to MFA events
   */
  public onMFAEvent(handler: (event: MFAEvent) => void): EventSubscription {
    return this.subscribe('auth:mfaEvent', handler);
  }

  /**
   * Subscribe to security events
   */
  public onSecurityEvent(handler: (event: SecurityEvent) => void): EventSubscription {
    return this.subscribe('auth:securityEvent', handler);
  }

  /**
   * Subscribe to provider events (connection, disconnection, errors)
   */
  public onProviderEvent(handler: (event: AuthProviderEvent) => void): EventSubscription {
    return this.subscribe('auth:providerEvent', handler);
  }

  /**
   * Subscribe to authentication metrics updates
   */
  public onMetricsUpdate(handler: (metrics: AuthMetrics) => void): EventSubscription {
    return this.subscribe('auth:metricsUpdate', handler);
  }

  /**
   * Subscribe to authentication errors
   */
  public onAuthError(handler: (error: Error, context?: string) => void): EventSubscription {
    return this.subscribe('auth:error', handler);
  }

  /**
   * Broadcast authentication state change
   */
  public emitAuthStateChange(event: AuthEvent, session: Session | null): void {
    this.emitEvent('auth:stateChange', { event, session });
  }

  /**
   * Broadcast user profile update
   */
  public emitUserUpdate(user: User): void {
    this.emitEvent('auth:userUpdate', user);
  }

  /**
   * Broadcast session expiry
   */
  public emitSessionExpiry(): void {
    this.emitEvent('auth:sessionExpiry');
  }

  /**
   * Broadcast password change
   */
  public emitPasswordChange(userId: string): void {
    this.emitEvent('auth:passwordChange', userId);
  }

  /**
   * Broadcast MFA event
   */
  public emitMFAEvent(event: MFAEvent): void {
    this.emitEvent('auth:mfaEvent', event);
  }

  /**
   * Broadcast security event
   */
  public emitSecurityEvent(event: SecurityEvent): void {
    this.emitEvent('auth:securityEvent', event);
  }

  /**
   * Broadcast provider event
   */
  public emitProviderEvent(event: AuthProviderEvent): void {
    this.emitEvent('auth:providerEvent', event);
  }

  /**
   * Broadcast metrics update
   */
  public emitMetricsUpdate(metrics: AuthMetrics): void {
    this.emitEvent('auth:metricsUpdate', metrics);
  }

  /**
   * Broadcast authentication error
   */
  public emitAuthError(error: Error, context?: string): void {
    this.emitEvent('auth:error', { error, context });
  }

  /**
   * Generic event subscription with advanced options
   */
  public subscribe(
    eventName: string, 
    handler: Function, 
    options: { once?: boolean; priority?: number } = {}
  ): EventSubscription {
    const id = this.generateId();
    const eventHandler: AuthEventHandler = {
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
        console.error(`Error in auth event handler for ${eventName}:`, error);
        this.emitAuthError(error instanceof Error ? error : new Error('Event handler error'), eventName);
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
  ): EventSubscription {
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
  ): EventSubscription {
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
  ): EventSubscription[] {
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
    return `auth-event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
    if (AuthEventEmitter.instance) {
      AuthEventEmitter.instance.cleanup();
      AuthEventEmitter.instance = null as any;
    }
  }
}

// Default export for easy access
export const authEvents = AuthEventEmitter.getInstance();
