/**
 * AI Alert Processor
 * 
 * Intelligent alert processing and management system for AI monitoring,
 * including alert correlation, escalation, and automated responses.
 */

import { EventEmitter } from 'events';
import { Logger } from '../../shared-utils/logger';
import { AIMonitoringConfig, AIMonitoringBackend, AIAlert } from '../AIPerformanceAnalytics';

export class AIAlertProcessor extends EventEmitter {
  private config: AIMonitoringConfig;
  private logger: Logger;
  private backend: AIMonitoringBackend;
  
  // Alert processing state
  private activeAlerts: Map<string, ProcessedAlert> = new Map();
  private alertCorrelations: Map<string, AlertCorrelation> = new Map();
  private escalationRules: Map<string, EscalationRule> = new Map();
  private suppressionRules: Map<string, SuppressionRule> = new Map();
  
  // Alert routing
  private alertChannels: Map<string, AlertChannel> = new Map();
  private notificationHandlers: Map<string, NotificationHandler> = new Map();
  
  // Processing timers
  private processingTimer?: NodeJS.Timeout;
  private correlationTimer?: NodeJS.Timeout;
  private escalationTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;
  
  // Alert statistics
  private alertStats: AlertStatistics = {
    total_processed: 0,
    total_suppressed: 0,
    total_escalated: 0,
    total_auto_resolved: 0,
    by_severity: { low: 0, medium: 0, high: 0, critical: 0 },
    by_type: {},
    processing_time_avg: 0
  };
  
  constructor(config: AIMonitoringConfig, logger: Logger, backend: AIMonitoringBackend) {
    super();
    this.config = config;
    this.logger = logger;
    this.backend = backend;
  }
  
  async initialize(): Promise<void> {
    this.logger.info('Initializing AI Alert Processor');
    
    try {
      // Initialize alert processing rules
      await this.initializeAlertRules();
      
      // Initialize notification channels
      await this.initializeNotificationChannels();
      
      // Load active alerts
      await this.loadActiveAlerts();
      
      // Start alert processing
      this.startAlertProcessing();
      
      this.logger.info('AI Alert Processor initialized');
    } catch (error) {
      this.logger.error('Failed to initialize AI Alert Processor', error);
      throw error;
    }
  }
  
  async processAlert(alert: AIAlert): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Processing alert', { alert_id: alert.alert_id, severity: alert.severity });
      
      // Check for suppression
      if (await this.shouldSuppressAlert(alert)) {
        await this.suppressAlert(alert);
        return;
      }
      
      // Enrich alert with additional context
      const enrichedAlert = await this.enrichAlert(alert);
      
      // Check for correlations
      const correlatedAlerts = await this.findCorrelatedAlerts(enrichedAlert);
      
      // Create processed alert
      const processedAlert: ProcessedAlert = {
        original_alert: enrichedAlert,
        correlated_alerts: correlatedAlerts,
        processing_started: new Date(),
        status: 'processing',
        actions_taken: [],
        escalation_level: 0,
        suppression_reason: null
      };
      
      this.activeAlerts.set(alert.alert_id, processedAlert);
      
      // Route alert to appropriate channels
      await this.routeAlert(processedAlert);
      
      // Check for auto-resolution opportunities
      await this.checkAutoResolution(processedAlert);
      
      // Update statistics
      this.updateAlertStatistics(alert, Date.now() - startTime);
      
      this.emit('alert-processed', {
        alert_id: alert.alert_id,
        processing_time: Date.now() - startTime,
        actions_taken: processedAlert.actions_taken.length
      });
      
    } catch (error) {
      this.logger.error('Failed to process alert', { alert_id: alert.alert_id, error });
      throw error;
    }
  }
  
  async acknowledgeAlert(alertId: string, acknowledgerId: string, note?: string): Promise<void> {
    try {
      const processedAlert = this.activeAlerts.get(alertId);
      if (!processedAlert) {
        throw new Error(`Alert not found: ${alertId}`);
      }
      
      // Update alert in backend
      await this.backend.updateAlert(alertId, {
        acknowledged_at: new Date(),
        actions_taken: [...processedAlert.original_alert.actions_taken, `Acknowledged by ${acknowledgerId}`]
      });
      
      // Update local state
      processedAlert.status = 'acknowledged';
      processedAlert.actions_taken.push({
        action: 'acknowledged',
        timestamp: new Date(),
        actor: acknowledgerId,
        note
      });
      
      this.emit('alert-acknowledged', {
        alert_id: alertId,
        acknowledger: acknowledgerId,
        note
      });
      
    } catch (error) {
      this.logger.error('Failed to acknowledge alert', { alert_id: alertId, error });
      throw error;
    }
  }
  
  async resolveAlert(alertId: string, resolverId: string, resolution: string): Promise<void> {
    try {
      const processedAlert = this.activeAlerts.get(alertId);
      if (!processedAlert) {
        throw new Error(`Alert not found: ${alertId}`);
      }
      
      // Update alert in backend
      await this.backend.updateAlert(alertId, {
        resolved_at: new Date(),
        actions_taken: [...processedAlert.original_alert.actions_taken, `Resolved by ${resolverId}: ${resolution}`]
      });
      
      // Update local state
      processedAlert.status = 'resolved';
      processedAlert.actions_taken.push({
        action: 'resolved',
        timestamp: new Date(),
        actor: resolverId,
        note: resolution
      });
      
      // Check for correlated alerts that can be auto-resolved
      await this.checkCorrelatedResolution(processedAlert);
      
      this.emit('alert-resolved', {
        alert_id: alertId,
        resolver: resolverId,
        resolution
      });
      
    } catch (error) {
      this.logger.error('Failed to resolve alert', { alert_id: alertId, error });
      throw error;
    }
  }
  
  async escalateAlert(alertId: string, escalationReason: string): Promise<void> {
    try {
      const processedAlert = this.activeAlerts.get(alertId);
      if (!processedAlert) {
        throw new Error(`Alert not found: ${alertId}`);
      }
      
      processedAlert.escalation_level++;
      
      // Find appropriate escalation rule
      const escalationRule = this.findEscalationRule(processedAlert.original_alert);
      
      if (escalationRule) {
        await this.executeEscalation(processedAlert, escalationRule, escalationReason);
      }
      
      this.alertStats.total_escalated++;
      
      this.emit('alert-escalated', {
        alert_id: alertId,
        escalation_level: processedAlert.escalation_level,
        reason: escalationReason
      });
      
    } catch (error) {
      this.logger.error('Failed to escalate alert', { alert_id: alertId, error });
      throw error;
    }
  }
  
  async getAlertStatistics(): Promise<AlertStatistics> {
    return { ...this.alertStats };
  }
  
  async getActiveAlertsCount(): Promise<number> {
    return Array.from(this.activeAlerts.values()).filter(a => a.status !== 'resolved').length;
  }
  
  // Private methods
  
  private startAlertProcessing(): void {
    // Alert correlation processing
    this.correlationTimer = setInterval(() => {
      this.processAlertCorrelations();
    }, 30000); // Every 30 seconds
    
    // Escalation processing
    this.escalationTimer = setInterval(() => {
      this.processEscalations();
    }, 60000); // Every minute
    
    // Cleanup resolved alerts
    this.cleanupTimer = setInterval(() => {
      this.cleanupResolvedAlerts();
    }, 300000); // Every 5 minutes
  }
  
  private async initializeAlertRules(): Promise<void> {
    try {
      // Initialize escalation rules
      this.escalationRules.set('critical_performance', {
        rule_id: 'critical_performance',
        conditions: {
          severity: ['critical'],
          alert_type: ['performance'],
          unacknowledged_duration: 300000 // 5 minutes
        },
        escalation_targets: ['oncall_engineer', 'team_lead'],
        escalation_delay: 300000, // 5 minutes
        max_escalations: 3
      });
      
      this.escalationRules.set('high_anomaly', {
        rule_id: 'high_anomaly',
        conditions: {
          severity: ['high', 'critical'],
          alert_type: ['anomaly'],
          unacknowledged_duration: 600000 // 10 minutes
        },
        escalation_targets: ['ai_team', 'oncall_engineer'],
        escalation_delay: 600000, // 10 minutes
        max_escalations: 2
      });
      
      // Initialize suppression rules
      this.suppressionRules.set('duplicate_performance', {
        rule_id: 'duplicate_performance',
        conditions: {
          same_entity: true,
          same_alert_type: true,
          time_window: 300000 // 5 minutes
        },
        suppression_duration: 1800000, // 30 minutes
        max_suppressions: 5
      });
      
    } catch (error) {
      this.logger.error('Failed to initialize alert rules', error);
    }
  }
  
  private async initializeNotificationChannels(): Promise<void> {
    try {
      // Initialize notification handlers
      this.notificationHandlers.set('email', new EmailNotificationHandler(this.config, this.logger));
      this.notificationHandlers.set('slack', new SlackNotificationHandler(this.config, this.logger));
      this.notificationHandlers.set('webhook', new WebhookNotificationHandler(this.config, this.logger));
      
      // Initialize alert channels from config
      for (const channel of this.config.alertChannels) {
        this.alertChannels.set(channel.name, {
          name: channel.name,
          type: channel.type,
          config: channel.config,
          enabled: channel.enabled,
          priorities: channel.priorities,
          cooldown_period: 300000, // 5 minutes
          last_notification: new Map()
        });
      }
      
    } catch (error) {
      this.logger.error('Failed to initialize notification channels', error);
    }
  }
  
  private async loadActiveAlerts(): Promise<void> {
    try {
      const activeAlerts = await this.backend.getAlerts({ resolved_at: null });
      
      for (const alert of activeAlerts) {
        const processedAlert: ProcessedAlert = {
          original_alert: alert,
          correlated_alerts: [],
          processing_started: alert.created_at,
          status: alert.acknowledged_at ? 'acknowledged' : 'active',
          actions_taken: [],
          escalation_level: 0,
          suppression_reason: null
        };
        
        this.activeAlerts.set(alert.alert_id, processedAlert);
      }
      
    } catch (error) {
      this.logger.error('Failed to load active alerts', error);
    }
  }
  
  private async shouldSuppressAlert(alert: AIAlert): Promise<boolean> {
    try {
      for (const [ruleId, rule] of this.suppressionRules) {
        if (await this.matchesSuppressionRule(alert, rule)) {
          return true;
        }
      }
      return false;
    } catch (error) {
      this.logger.error('Failed to check alert suppression', error);
      return false;
    }
  }
  
  private async matchesSuppressionRule(alert: AIAlert, rule: SuppressionRule): Promise<boolean> {
    const conditions = rule.conditions;
    
    // Check for duplicate alerts within time window
    if (conditions.same_entity && conditions.same_alert_type) {
      const timeWindow = new Date(Date.now() - conditions.time_window);
      
      const recentAlerts = Array.from(this.activeAlerts.values()).filter(pa => {
        const a = pa.original_alert;
        return a.entity_id === alert.entity_id &&
               a.alert_type === alert.alert_type &&
               a.created_at > timeWindow;
      });
      
      return recentAlerts.length > 0;
    }
    
    return false;
  }
  
  private async suppressAlert(alert: AIAlert): Promise<void> {
    this.logger.debug('Suppressing alert', { alert_id: alert.alert_id });
    
    this.alertStats.total_suppressed++;
    
    this.emit('alert-suppressed', {
      alert_id: alert.alert_id,
      reason: 'Duplicate alert within suppression window'
    });
  }
  
  private async enrichAlert(alert: AIAlert): Promise<AIAlert> {
    try {
      // Add contextual information to the alert
      const enrichedAlert = { ...alert };
      
      // Add entity context
      if (alert.entity_id) {
        enrichedAlert.context = {
          ...enrichedAlert.context,
          entity_context: await this.getEntityContext(alert.entity_id, alert.entity_type)
        };
      }
      
      // Add historical context
      enrichedAlert.context = {
        ...enrichedAlert.context,
        historical_context: await this.getHistoricalContext(alert)
      };
      
      return enrichedAlert;
    } catch (error) {
      this.logger.error('Failed to enrich alert', { alert_id: alert.alert_id, error });
      return alert;
    }
  }
  
  private async findCorrelatedAlerts(alert: AIAlert): Promise<AIAlert[]> {
    try {
      const correlatedAlerts: AIAlert[] = [];
      
      // Find alerts from the same entity
      const entityAlerts = Array.from(this.activeAlerts.values())
        .filter(pa => pa.original_alert.entity_id === alert.entity_id &&
                     pa.original_alert.alert_id !== alert.alert_id)
        .map(pa => pa.original_alert);
      
      correlatedAlerts.push(...entityAlerts);
      
      // Find alerts with similar patterns
      const patternAlerts = await this.findPatternCorrelatedAlerts(alert);
      correlatedAlerts.push(...patternAlerts);
      
      return correlatedAlerts;
    } catch (error) {
      this.logger.error('Failed to find correlated alerts', { alert_id: alert.alert_id, error });
      return [];
    }
  }
  
  private async findPatternCorrelatedAlerts(alert: AIAlert): Promise<AIAlert[]> {
    // Simplified pattern correlation
    const timeWindow = new Date(Date.now() - 1800000); // 30 minutes
    
    return Array.from(this.activeAlerts.values())
      .filter(pa => pa.original_alert.alert_type === alert.alert_type &&
                   pa.original_alert.severity === alert.severity &&
                   pa.original_alert.created_at > timeWindow)
      .map(pa => pa.original_alert);
  }
  
  private async routeAlert(processedAlert: ProcessedAlert): Promise<void> {
    try {
      const alert = processedAlert.original_alert;
      
      for (const [channelName, channel] of this.alertChannels) {
        if (!channel.enabled) continue;
        
        // Check if channel accepts this severity
        if (!channel.priorities.includes(alert.severity)) continue;
        
        // Check cooldown
        const lastNotification = channel.last_notification.get(alert.entity_id);
        if (lastNotification && Date.now() - lastNotification.getTime() < channel.cooldown_period) {
          continue;
        }
        
        // Send notification
        await this.sendNotification(channel, processedAlert);
        
        // Update last notification time
        channel.last_notification.set(alert.entity_id, new Date());
        
        processedAlert.actions_taken.push({
          action: 'notification_sent',
          timestamp: new Date(),
          actor: 'system',
          note: `Sent to ${channelName}`
        });
      }
    } catch (error) {
      this.logger.error('Failed to route alert', { alert_id: processedAlert.original_alert.alert_id, error });
    }
  }
  
  private async sendNotification(channel: AlertChannel, processedAlert: ProcessedAlert): Promise<void> {
    try {
      const handler = this.notificationHandlers.get(channel.type);
      if (!handler) {
        this.logger.warn('No handler for channel type', { type: channel.type });
        return;
      }
      
      await handler.sendNotification(channel, processedAlert);
      
    } catch (error) {
      this.logger.error('Failed to send notification', { channel: channel.name, error });
    }
  }
  
  private async checkAutoResolution(processedAlert: ProcessedAlert): Promise<void> {
    try {
      const alert = processedAlert.original_alert;
      
      // Check if alert can be auto-resolved based on current metrics
      const canAutoResolve = await this.canAutoResolveAlert(alert);
      
      if (canAutoResolve) {
        await this.autoResolveAlert(processedAlert, 'Automatic resolution based on current metrics');
      }
    } catch (error) {
      this.logger.error('Failed to check auto-resolution', { alert_id: processedAlert.original_alert.alert_id, error });
    }
  }
  
  private async canAutoResolveAlert(alert: AIAlert): Promise<boolean> {
    try {
      // Get current metrics for the entity
      const currentMetrics = await this.backend.getMetrics({
        entity_id: alert.entity_id,
        timestamp: { '>=': new Date(Date.now() - 300000) } // Last 5 minutes
      });
      
      // Check if the alerting condition is no longer present
      // This is a simplified implementation
      return currentMetrics.length === 0; // No recent metrics indicating problems
    } catch (error) {
      this.logger.error('Failed to check auto-resolution conditions', error);
      return false;
    }
  }
  
  private async autoResolveAlert(processedAlert: ProcessedAlert, resolution: string): Promise<void> {
    try {
      await this.resolveAlert(processedAlert.original_alert.alert_id, 'system', resolution);
      
      this.alertStats.total_auto_resolved++;
      
      this.emit('alert-auto-resolved', {
        alert_id: processedAlert.original_alert.alert_id,
        resolution
      });
    } catch (error) {
      this.logger.error('Failed to auto-resolve alert', error);
    }
  }
  
  private async processAlertCorrelations(): Promise<void> {
    try {
      // Process alert correlations and create correlation groups
      const activeProcessedAlerts = Array.from(this.activeAlerts.values())
        .filter(pa => pa.status === 'active' || pa.status === 'processing');
      
      for (const processedAlert of activeProcessedAlerts) {
        if (processedAlert.correlated_alerts.length > 2) {
          // Create correlation group
          const correlationId = `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          const correlation: AlertCorrelation = {
            correlation_id: correlationId,
            primary_alert: processedAlert.original_alert,
            correlated_alerts: processedAlert.correlated_alerts,
            correlation_type: 'pattern_based',
            correlation_strength: this.calculateCorrelationStrength(processedAlert),
            created_at: new Date()
          };
          
          this.alertCorrelations.set(correlationId, correlation);
          
          this.emit('alert-correlation-created', {
            correlation_id: correlationId,
            alert_count: correlation.correlated_alerts.length + 1
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to process alert correlations', error);
    }
  }
  
  private async processEscalations(): Promise<void> {
    try {
      const activeAlerts = Array.from(this.activeAlerts.values())
        .filter(pa => pa.status === 'active' && !pa.original_alert.acknowledged_at);
      
      for (const processedAlert of activeAlerts) {
        const escalationRule = this.findEscalationRule(processedAlert.original_alert);
        
        if (escalationRule && this.shouldEscalate(processedAlert, escalationRule)) {
          await this.escalateAlert(
            processedAlert.original_alert.alert_id,
            'Automatic escalation due to unacknowledged alert'
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to process escalations', error);
    }
  }
  
  private findEscalationRule(alert: AIAlert): EscalationRule | null {
    for (const [ruleId, rule] of this.escalationRules) {
      if (this.matchesEscalationRule(alert, rule)) {
        return rule;
      }
    }
    return null;
  }
  
  private matchesEscalationRule(alert: AIAlert, rule: EscalationRule): boolean {
    const conditions = rule.conditions;
    
    // Check severity
    if (conditions.severity && !conditions.severity.includes(alert.severity)) {
      return false;
    }
    
    // Check alert type
    if (conditions.alert_type && !conditions.alert_type.includes(alert.alert_type)) {
      return false;
    }
    
    return true;
  }
  
  private shouldEscalate(processedAlert: ProcessedAlert, rule: EscalationRule): boolean {
    const alert = processedAlert.original_alert;
    const timeInactive = Date.now() - alert.created_at.getTime();
    
    // Check if alert has been unacknowledged for the required duration
    if (timeInactive < rule.conditions.unacknowledged_duration) {
      return false;
    }
    
    // Check if already escalated too many times
    if (processedAlert.escalation_level >= rule.max_escalations) {
      return false;
    }
    
    return true;
  }
  
  private async executeEscalation(
    processedAlert: ProcessedAlert,
    rule: EscalationRule,
    reason: string
  ): Promise<void> {
    try {
      // Send escalation notifications
      for (const target of rule.escalation_targets) {
        await this.sendEscalationNotification(processedAlert, target, reason);
      }
      
      // Update alert in backend
      await this.backend.updateAlert(processedAlert.original_alert.alert_id, {
        escalated_at: new Date(),
        actions_taken: [...processedAlert.original_alert.actions_taken, `Escalated: ${reason}`]
      });
      
      processedAlert.actions_taken.push({
        action: 'escalated',
        timestamp: new Date(),
        actor: 'system',
        note: reason
      });
      
    } catch (error) {
      this.logger.error('Failed to execute escalation', error);
    }
  }
  
  private async sendEscalationNotification(
    processedAlert: ProcessedAlert,
    target: string,
    reason: string
  ): Promise<void> {
    // Implementation would send escalation notification to specific target
    this.logger.info('Escalation notification sent', {
      alert_id: processedAlert.original_alert.alert_id,
      target,
      reason
    });
  }
  
  private async checkCorrelatedResolution(resolvedAlert: ProcessedAlert): Promise<void> {
    try {
      // Check if correlated alerts can be auto-resolved
      for (const correlatedAlert of resolvedAlert.correlated_alerts) {
        const correlatedProcessedAlert = this.activeAlerts.get(correlatedAlert.alert_id);
        
        if (correlatedProcessedAlert && correlatedProcessedAlert.status === 'active') {
          const canResolve = await this.canAutoResolveCorrelated(resolvedAlert, correlatedProcessedAlert);
          
          if (canResolve) {
            await this.autoResolveAlert(
              correlatedProcessedAlert,
              `Auto-resolved due to resolution of correlated alert ${resolvedAlert.original_alert.alert_id}`
            );
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to check correlated resolution', error);
    }
  }
  
  private async canAutoResolveCorrelated(
    resolvedAlert: ProcessedAlert,
    correlatedAlert: ProcessedAlert
  ): Promise<boolean> {
    // Simplified logic for auto-resolving correlated alerts
    return resolvedAlert.original_alert.entity_id === correlatedAlert.original_alert.entity_id &&
           resolvedAlert.original_alert.alert_type === correlatedAlert.original_alert.alert_type;
  }
  
  private cleanupResolvedAlerts(): void {
    try {
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      
      for (const [alertId, processedAlert] of this.activeAlerts) {
        if (processedAlert.status === 'resolved' && 
            processedAlert.original_alert.resolved_at &&
            processedAlert.original_alert.resolved_at < cutoffTime) {
          this.activeAlerts.delete(alertId);
        }
      }
      
      // Cleanup old correlations
      for (const [correlationId, correlation] of this.alertCorrelations) {
        if (correlation.created_at < cutoffTime) {
          this.alertCorrelations.delete(correlationId);
        }
      }
    } catch (error) {
      this.logger.error('Failed to cleanup resolved alerts', error);
    }
  }
  
  private updateAlertStatistics(alert: AIAlert, processingTime: number): void {
    this.alertStats.total_processed++;
    this.alertStats.by_severity[alert.severity]++;
    this.alertStats.by_type[alert.alert_type] = (this.alertStats.by_type[alert.alert_type] || 0) + 1;
    
    // Update average processing time
    this.alertStats.processing_time_avg = 
      (this.alertStats.processing_time_avg * (this.alertStats.total_processed - 1) + processingTime) /
      this.alertStats.total_processed;
  }
  
  private calculateCorrelationStrength(processedAlert: ProcessedAlert): number {
    // Simplified correlation strength calculation
    const sameEntity = processedAlert.correlated_alerts.filter(a => 
      a.entity_id === processedAlert.original_alert.entity_id
    ).length;
    
    const sameType = processedAlert.correlated_alerts.filter(a => 
      a.alert_type === processedAlert.original_alert.alert_type
    ).length;
    
    return (sameEntity + sameType) / (processedAlert.correlated_alerts.length * 2);
  }
  
  private async getEntityContext(entityId: string, entityType: string): Promise<any> {
    // Implementation would fetch entity context from appropriate service
    return {
      entity_id: entityId,
      entity_type: entityType,
      status: 'active'
    };
  }
  
  private async getHistoricalContext(alert: AIAlert): Promise<any> {
    // Implementation would fetch historical alert data
    return {
      similar_alerts_count: 0,
      last_occurrence: null
    };
  }
  
  async destroy(): Promise<void> {
    try {
      // Stop processing timers
      if (this.processingTimer) clearInterval(this.processingTimer);
      if (this.correlationTimer) clearInterval(this.correlationTimer);
      if (this.escalationTimer) clearInterval(this.escalationTimer);
      if (this.cleanupTimer) clearInterval(this.cleanupTimer);
      
      // Cleanup notification handlers
      for (const handler of this.notificationHandlers.values()) {
        if (handler.destroy) {
          await handler.destroy();
        }
      }
      
      // Clear state
      this.activeAlerts.clear();
      this.alertCorrelations.clear();
      this.escalationRules.clear();
      this.suppressionRules.clear();
      this.alertChannels.clear();
      this.notificationHandlers.clear();
      
      this.logger.info('AI Alert Processor destroyed');
    } catch (error) {
      this.logger.error('Failed to destroy AI Alert Processor', error);
      throw error;
    }
  }
}

// Supporting interfaces
interface ProcessedAlert {
  original_alert: AIAlert;
  correlated_alerts: AIAlert[];
  processing_started: Date;
  status: 'processing' | 'active' | 'acknowledged' | 'resolved' | 'suppressed';
  actions_taken: AlertAction[];
  escalation_level: number;
  suppression_reason: string | null;
}

interface AlertAction {
  action: string;
  timestamp: Date;
  actor: string;
  note?: string;
}

interface AlertCorrelation {
  correlation_id: string;
  primary_alert: AIAlert;
  correlated_alerts: AIAlert[];
  correlation_type: 'pattern_based' | 'entity_based' | 'time_based';
  correlation_strength: number;
  created_at: Date;
}

interface EscalationRule {
  rule_id: string;
  conditions: {
    severity?: string[];
    alert_type?: string[];
    unacknowledged_duration: number;
  };
  escalation_targets: string[];
  escalation_delay: number;
  max_escalations: number;
}

interface SuppressionRule {
  rule_id: string;
  conditions: {
    same_entity?: boolean;
    same_alert_type?: boolean;
    time_window: number;
  };
  suppression_duration: number;
  max_suppressions: number;
}

interface AlertChannel {
  name: string;
  type: string;
  config: any;
  enabled: boolean;
  priorities: string[];
  cooldown_period: number;
  last_notification: Map<string, Date>;
}

interface NotificationHandler {
  sendNotification(channel: AlertChannel, processedAlert: ProcessedAlert): Promise<void>;
  destroy?(): Promise<void>;
}

interface AlertStatistics {
  total_processed: number;
  total_suppressed: number;
  total_escalated: number;
  total_auto_resolved: number;
  by_severity: Record<string, number>;
  by_type: Record<string, number>;
  processing_time_avg: number;
}

// Notification handler implementations (simplified)
class EmailNotificationHandler implements NotificationHandler {
  constructor(private config: any, private logger: Logger) {}
  
  async sendNotification(channel: AlertChannel, processedAlert: ProcessedAlert): Promise<void> {
    this.logger.info('Email notification sent', {
      channel: channel.name,
      alert_id: processedAlert.original_alert.alert_id
    });
  }
}

class SlackNotificationHandler implements NotificationHandler {
  constructor(private config: any, private logger: Logger) {}
  
  async sendNotification(channel: AlertChannel, processedAlert: ProcessedAlert): Promise<void> {
    this.logger.info('Slack notification sent', {
      channel: channel.name,
      alert_id: processedAlert.original_alert.alert_id
    });
  }
}

class WebhookNotificationHandler implements NotificationHandler {
  constructor(private config: any, private logger: Logger) {}
  
  async sendNotification(channel: AlertChannel, processedAlert: ProcessedAlert): Promise<void> {
    this.logger.info('Webhook notification sent', {
      channel: channel.name,
      alert_id: processedAlert.original_alert.alert_id
    });
  }
}
