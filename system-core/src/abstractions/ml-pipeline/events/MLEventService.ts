/**
 * ML Event Service
 * Centralized event management for ML pipeline operations
 */

import { EventEmitter } from 'events';
import { MLPipelineEvent } from '../interfaces/ml-pipeline.interface';
import { MLDataEvent } from '../interfaces/ml-data.interface';
import { MLTrainingEvent } from '../interfaces/ml-training.interface';
import { MLInferenceEvent } from '../interfaces/ml-inference.interface';
import { MLExperimentEvent } from '../interfaces/ml-experiment.interface';
import { MLDataVersionEvent } from '../interfaces/ml-versioning.interface';

export type MLEvent = 
  | MLPipelineEvent 
  | MLDataEvent 
  | MLTrainingEvent 
  | MLInferenceEvent 
  | MLExperimentEvent 
  | MLDataVersionEvent;

export interface MLEventSubscription {
  id: string;
  eventType: string;
  callback: (event: MLEvent) => void;
  filter?: (event: MLEvent) => boolean;
  active: boolean;
  createdAt: Date;
}

export interface MLEventHistory {
  events: MLEvent[];
  totalCount: number;
  timeRange: [Date, Date];
}

export class MLEventService extends EventEmitter {
  private subscriptions: Map<string, MLEventSubscription> = new Map();
  private eventHistory: MLEvent[] = [];
  private maxHistorySize = 10000;
  private eventFilters: Map<string, (event: MLEvent) => boolean> = new Map();

  constructor() {
    super();
    this.setupDefaultFilters();
  }

  // Event Emission
  emit(event: MLEvent): void {
    // Store in history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }

    // Emit to subscribers
    super.emit('ml_event', event);
    super.emit(event.type, event);
    super.emit('*', event);

    // Process subscriptions with filters
    for (const subscription of this.subscriptions.values()) {
      if (!subscription.active) continue;
      
      if (subscription.eventType === '*' || subscription.eventType === event.type) {
        if (!subscription.filter || subscription.filter(event)) {
          try {
            subscription.callback(event);
          } catch (error) {
            console.error(`Error in event subscription ${subscription.id}:`, error);
          }
        }
      }
    }
  }

  // Event Subscription
  subscribe(
    eventType: string,
    callback: (event: MLEvent) => void,
    filter?: (event: MLEvent) => boolean
  ): string {
    const subscriptionId = this.generateSubscriptionId();
    
    const subscription: MLEventSubscription = {
      id: subscriptionId,
      eventType,
      callback,
      filter,
      active: true,
      createdAt: new Date()
    };
    
    this.subscriptions.set(subscriptionId, subscription);
    
    return subscriptionId;
  }

  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.active = false;
      this.subscriptions.delete(subscriptionId);
      return true;
    }
    return false;
  }

  // Event History and Querying
  getEventHistory(
    eventType?: string,
    limit?: number,
    timeRange?: [Date, Date]
  ): MLEventHistory {
    let filteredEvents = this.eventHistory;
    
    // Filter by event type
    if (eventType && eventType !== '*') {
      filteredEvents = filteredEvents.filter(event => event.type === eventType);
    }
    
    // Filter by time range
    if (timeRange) {
      filteredEvents = filteredEvents.filter(event => 
        event.timestamp >= timeRange[0] && event.timestamp <= timeRange[1]
      );
    }
    
    // Apply limit
    if (limit) {
      filteredEvents = filteredEvents.slice(-limit);
    }
    
    const minTime = filteredEvents.length > 0 ? 
      Math.min(...filteredEvents.map(e => e.timestamp.getTime())) : Date.now();
    const maxTime = filteredEvents.length > 0 ? 
      Math.max(...filteredEvents.map(e => e.timestamp.getTime())) : Date.now();
    
    return {
      events: filteredEvents,
      totalCount: filteredEvents.length,
      timeRange: [new Date(minTime), new Date(maxTime)]
    };
  }

  getEventCounts(timeRange?: [Date, Date]): Record<string, number> {
    let events = this.eventHistory;
    
    if (timeRange) {
      events = events.filter(event => 
        event.timestamp >= timeRange[0] && event.timestamp <= timeRange[1]
      );
    }
    
    const counts: Record<string, number> = {};
    for (const event of events) {
      counts[event.type] = (counts[event.type] || 0) + 1;
    }
    
    return counts;
  }

  getErrorEvents(limit = 100): MLEvent[] {
    return this.eventHistory
      .filter(event => event.severity === 'error')
      .slice(-limit);
  }

  getWarningEvents(limit = 100): MLEvent[] {
    return this.eventHistory
      .filter(event => event.severity === 'warning')
      .slice(-limit);
  }

  // Event Filters
  createSlowQueryFilter(thresholdMs: number): (event: MLEvent) => boolean {
    return (event: MLEvent) => {
      if (event.type === 'query' && event.data.duration) {
        return event.data.duration > thresholdMs;
      }
      return false;
    };
  }

  createErrorFilter(): (event: MLEvent) => boolean {
    return (event: MLEvent) => event.severity === 'error';
  }

  createPipelineFilter(pipelineId: string): (event: MLEvent) => boolean {
    return (event: MLEvent) => {
      if ('pipelineId' in event) {
        return event.pipelineId === pipelineId;
      }
      return false;
    };
  }

  createDatasetFilter(datasetId: string): (event: MLEvent) => boolean {
    return (event: MLEvent) => {
      if ('datasetId' in event) {
        return event.datasetId === datasetId;
      }
      return false;
    };
  }

  createSeverityFilter(severity: 'info' | 'warning' | 'error'): (event: MLEvent) => boolean {
    return (event: MLEvent) => event.severity === severity;
  }

  createTimeRangeFilter(startTime: Date, endTime: Date): (event: MLEvent) => boolean {
    return (event: MLEvent) => 
      event.timestamp >= startTime && event.timestamp <= endTime;
  }

  // Event Analytics
  getEventMetrics(timeRange?: [Date, Date]): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    eventsPerHour: Record<string, number>;
    errorRate: number;
  } {
    let events = this.eventHistory;
    
    if (timeRange) {
      events = events.filter(event => 
        event.timestamp >= timeRange[0] && event.timestamp <= timeRange[1]
      );
    }
    
    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};
    const eventsPerHour: Record<string, number> = {};
    
    for (const event of events) {
      // Count by type
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      
      // Count by severity
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
      
      // Count by hour
      const hour = event.timestamp.toISOString().slice(0, 13) + ':00:00';
      eventsPerHour[hour] = (eventsPerHour[hour] || 0) + 1;
    }
    
    const errorCount = eventsBySeverity.error || 0;
    const errorRate = events.length > 0 ? errorCount / events.length : 0;
    
    return {
      totalEvents: events.length,
      eventsByType,
      eventsBySeverity,
      eventsPerHour,
      errorRate
    };
  }

  getEventTrends(hours = 24): {
    timeline: Array<{
      timestamp: Date;
      eventCount: number;
      errorCount: number;
    }>;
    trending: {
      increasing: string[];
      decreasing: string[];
    };
  } {
    const now = new Date();
    const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
    
    const events = this.eventHistory.filter(event => event.timestamp >= startTime);
    
    // Create hourly buckets
    const timeline = [];
    for (let i = 0; i < hours; i++) {
      const bucketStart = new Date(startTime.getTime() + i * 60 * 60 * 1000);
      const bucketEnd = new Date(bucketStart.getTime() + 60 * 60 * 1000);
      
      const bucketEvents = events.filter(event => 
        event.timestamp >= bucketStart && event.timestamp < bucketEnd
      );
      
      timeline.push({
        timestamp: bucketStart,
        eventCount: bucketEvents.length,
        errorCount: bucketEvents.filter(e => e.severity === 'error').length
      });
    }
    
    // Analyze trends (simplified)
    const recentHours = timeline.slice(-6); // Last 6 hours
    const earlierHours = timeline.slice(-12, -6); // 6-12 hours ago
    
    const recentAvg = recentHours.reduce((sum, h) => sum + h.eventCount, 0) / recentHours.length;
    const earlierAvg = earlierHours.reduce((sum, h) => sum + h.eventCount, 0) / earlierHours.length;
    
    const trending = {
      increasing: recentAvg > earlierAvg * 1.2 ? ['overall_activity'] : [],
      decreasing: recentAvg < earlierAvg * 0.8 ? ['overall_activity'] : []
    };
    
    return { timeline, trending };
  }

  // Event Correlation
  findCorrelatedEvents(
    primaryEventType: string,
    timeWindowMs = 60000, // 1 minute
    minOccurrences = 5
  ): Array<{
    eventType: string;
    correlation: number;
    occurrences: number;
  }> {
    const primaryEvents = this.eventHistory.filter(event => event.type === primaryEventType);
    const correlations: Record<string, number> = {};
    const occurrences: Record<string, number> = {};
    
    for (const primaryEvent of primaryEvents) {
      const correlatedEvents = this.eventHistory.filter(event => 
        event.type !== primaryEventType &&
        Math.abs(event.timestamp.getTime() - primaryEvent.timestamp.getTime()) <= timeWindowMs
      );
      
      for (const correlatedEvent of correlatedEvents) {
        const key = correlatedEvent.type;
        correlations[key] = (correlations[key] || 0) + 1;
        occurrences[key] = (occurrences[key] || 0) + 1;
      }
    }
    
    const results = [];
    for (const [eventType, count] of Object.entries(correlations)) {
      if (count >= minOccurrences) {
        const correlation = count / primaryEvents.length;
        results.push({
          eventType,
          correlation,
          occurrences: occurrences[eventType]
        });
      }
    }
    
    return results.sort((a, b) => b.correlation - a.correlation);
  }

  // Event Aggregation
  aggregateEvents(
    eventType: string,
    timeRange: [Date, Date],
    aggregationPeriod: 'hour' | 'day' | 'week' = 'hour'
  ): Array<{
    period: Date;
    count: number;
    avgValue?: number;
    minValue?: number;
    maxValue?: number;
  }> {
    const events = this.eventHistory.filter(event => 
      event.type === eventType &&
      event.timestamp >= timeRange[0] &&
      event.timestamp <= timeRange[1]
    );
    
    const periodMs = this.getPeriodMs(aggregationPeriod);
    const periods: Record<string, {
      period: Date;
      count: number;
      values: number[];
    }> = {};
    
    for (const event of events) {
      const periodStart = this.floorToPeriod(event.timestamp, aggregationPeriod);
      const periodKey = periodStart.toISOString();
      
      if (!periods[periodKey]) {
        periods[periodKey] = {
          period: periodStart,
          count: 0,
          values: []
        };
      }
      
      periods[periodKey].count++;
      
      // Extract numeric values from event data for aggregation
      if (event.data && typeof event.data.value === 'number') {
        periods[periodKey].values.push(event.data.value);
      }
    }
    
    return Object.values(periods).map(period => ({
      period: period.period,
      count: period.count,
      avgValue: period.values.length > 0 ? 
        period.values.reduce((sum, v) => sum + v, 0) / period.values.length : undefined,
      minValue: period.values.length > 0 ? Math.min(...period.values) : undefined,
      maxValue: period.values.length > 0 ? Math.max(...period.values) : undefined
    })).sort((a, b) => a.period.getTime() - b.period.getTime());
  }

  // Utilities
  clearHistory(): void {
    this.eventHistory = [];
  }

  setMaxHistorySize(size: number): void {
    this.maxHistorySize = Math.max(100, size); // Minimum of 100 events
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  getActiveSubscriptions(): MLEventSubscription[] {
    return Array.from(this.subscriptions.values()).filter(sub => sub.active);
  }

  // Private Methods
  private setupDefaultFilters(): void {
    this.eventFilters.set('errors', this.createErrorFilter());
    this.eventFilters.set('warnings', this.createSeverityFilter('warning'));
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getPeriodMs(period: 'hour' | 'day' | 'week'): number {
    switch (period) {
      case 'hour': return 60 * 60 * 1000;
      case 'day': return 24 * 60 * 60 * 1000;
      case 'week': return 7 * 24 * 60 * 60 * 1000;
    }
  }

  private floorToPeriod(date: Date, period: 'hour' | 'day' | 'week'): Date {
    const d = new Date(date);
    
    switch (period) {
      case 'hour':
        d.setMinutes(0, 0, 0);
        break;
      case 'day':
        d.setHours(0, 0, 0, 0);
        break;
      case 'week':
        d.setHours(0, 0, 0, 0);
        const dayOfWeek = d.getDay();
        d.setDate(d.getDate() - dayOfWeek);
        break;
    }
    
    return d;
  }
}
