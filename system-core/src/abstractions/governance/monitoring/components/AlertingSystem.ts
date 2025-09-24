/**
 * Alerting System Component
 * 
 * Intelligent alert management with threshold monitoring, escalation,
 * suppression, and multi-channel notifications for governance agents.
 */

import { EventEmitter } from 'events';
import { 
  AlertingConfig,
  Alert,
  ActiveAlert,
  AlertAcknowledgment,
  AlertEscalation,
  AlertResolution,
  AlertType,
  AlertStatus,
  SeverityLevel,
  HealthMetrics,
  NotificationChannel,
  EscalationRule,
  SuppressionRule
} from '../interfaces';

import { DataStore } from './DataStore';

interface AlertRule {
  ruleId: string;
  name: string;
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'ne' | 'gte' | 'lte';
  threshold: number;
  severity: SeverityLevel;
  enabled: boolean;
  cooldownPeriod: number;
  description: string;
}

interface NotificationDelivery {
  deliveryId: string;
  alertId: string;
  channelId: string;
  status: 'pending' | 'sent' | 'failed' | 'retrying';
  attempts: number;
  lastAttempt?: Date;
  error?: string;
}

export class AlertingSystem extends EventEmitter {
  private config: AlertingConfig;
  private dataStore: DataStore;
  private isRunning: boolean = false;
  
  // Alert state management
  private activeAlerts: Map<string, ActiveAlert> = new Map();
  private alertRules: Map<string, AlertRule[]> = new Map();
  private suppressedAlerts: Map<string, Date> = new Map();
  private cooldownTimers: Map<string, Date> = new Map();
  
  // Notification management
  private notificationQueue: NotificationDelivery[] = [];
  private deliveryAttempts: Map<string, number> = new Map();
  
  // Processing intervals
  private alertProcessingInterval?: NodeJS.Timeout;
  private escalationCheckInterval?: NodeJS.Timeout;
  private notificationProcessingInterval?: NodeJS.Timeout;

  constructor(config: AlertingConfig, dataStore: DataStore) {
    super();
    this.config = config;
    this.dataStore = dataStore;
    this.initializeDefaultRules();
  }

  // ===== LIFECYCLE METHODS =====

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('AlertingSystem is already running');
    }

    console.log(`[${new Date().toISOString()}] Starting AlertingSystem`);

    // Load existing alerts from storage
    await this.loadActiveAlertsFromStorage();

    // Start processing intervals
    this.startProcessingLoops();

    this.isRunning = true;
    this.emit('alerting:started', { timestamp: new Date() });
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log(`[${new Date().toISOString()}] Stopping AlertingSystem`);

    // Stop processing intervals
    this.stopProcessingLoops();

    // Save active alerts to storage
    await this.saveActiveAlertsToStorage();

    // Process remaining notifications
    await this.processNotificationQueue();

    this.isRunning = false;
    this.emit('alerting:stopped', { timestamp: new Date() });
  }

  async updateConfig(config: AlertingConfig): Promise<void> {
    this.config = { ...this.config, ...config };
    
    // Update notification channels
    await this.validateNotificationChannels();
    
    this.emit('alerting:config_updated', { config: this.config, timestamp: new Date() });
  }

  // ===== ALERT MANAGEMENT =====

  async createAlert(alertData: Omit<Alert, 'alertId' | 'timestamp'>): Promise<Alert> {
    const alertId = this.generateAlertId();
    const timestamp = new Date();

    const alert: Alert = {
      alertId,
      timestamp,
      ...alertData
    };

    // Check for suppression
    if (this.isAlertSuppressed(alert)) {
      console.log(`[${timestamp.toISOString()}] Alert suppressed: ${alertId}`);
      return alert;
    }

    // Check for similar recent alerts (deduplication)
    const similarAlert = this.findSimilarRecentAlert(alert);
    if (similarAlert) {
      console.log(`[${timestamp.toISOString()}] Alert deduplicated: ${alertId} -> ${similarAlert.alertId}`);
      return similarAlert;
    }

    // Create active alert
    const activeAlert: ActiveAlert = {
      ...alert,
      duration: 0,
      ackRequired: this.requiresAcknowledgment(alert),
      escalationDeadline: this.calculateEscalationDeadline(alert),
      relatedAlerts: this.findRelatedAlerts(alert)
    };

    this.activeAlerts.set(alertId, activeAlert);

    // Store in database
    await this.dataStore.storeAlert(alert);

    // Send notifications
    await this.sendNotifications(activeAlert);

    console.log(`[${timestamp.toISOString()}] Alert created: ${alertId} - ${alert.title}`);
    this.emit('alert:created', { alert: activeAlert, timestamp });

    return alert;
  }

  async acknowledgeAlert(alertId: string, acknowledgedBy: string, comment?: string): Promise<void> {
    const activeAlert = this.activeAlerts.get(alertId);
    if (!activeAlert) {
      throw new Error(`Alert ${alertId} not found or not active`);
    }

    const acknowledgment: AlertAcknowledgment = {
      acknowledgedBy,
      acknowledgedAt: new Date(),
      comment,
      action: 'acknowledged'
    };

    activeAlert.acknowledgments.push(acknowledgment);
    activeAlert.status = 'acknowledged';

    // Update in storage
    await this.dataStore.updateAlert(alertId, { 
      acknowledgments: activeAlert.acknowledgments,
      status: activeAlert.status
    });

    console.log(`[${new Date().toISOString()}] Alert acknowledged: ${alertId} by ${acknowledgedBy}`);
    this.emit('alert:acknowledged', { alertId, acknowledgment, timestamp: new Date() });
  }

  async resolveAlert(alertId: string, resolvedBy: string, resolution: string): Promise<void> {
    const activeAlert = this.activeAlerts.get(alertId);
    if (!activeAlert) {
      throw new Error(`Alert ${alertId} not found or not active`);
    }

    const alertResolution: AlertResolution = {
      resolvedBy,
      resolvedAt: new Date(),
      resolution,
      actions: [], // Could be populated with specific actions taken
      preventiveMeasures: []
    };

    activeAlert.resolution = alertResolution;
    activeAlert.status = 'resolved';

    // Update in storage
    await this.dataStore.updateAlert(alertId, { 
      resolution: alertResolution,
      status: activeAlert.status
    });

    // Remove from active alerts
    this.activeAlerts.delete(alertId);

    console.log(`[${new Date().toISOString()}] Alert resolved: ${alertId} by ${resolvedBy}`);
    this.emit('alert:resolved', { alertId, resolution: alertResolution, timestamp: new Date() });
  }

  async getActiveAlerts(agentId?: string): Promise<ActiveAlert[]> {
    let alerts = Array.from(this.activeAlerts.values());
    
    if (agentId) {
      alerts = alerts.filter(alert => alert.agentId === agentId);
    }

    // Update duration for each alert
    alerts.forEach(alert => {
      alert.duration = Date.now() - alert.timestamp.getTime();
    });

    return alerts;
  }

  async getActiveAlertsForAgent(agentId: string): Promise<ActiveAlert[]> {
    return this.getActiveAlerts(agentId);
  }

  // ===== THRESHOLD MONITORING =====

  async checkThresholds(agentId: string, metrics: HealthMetrics): Promise<void> {
    if (!this.config.enableAlerting) {
      return;
    }

    const agentRules = this.alertRules.get(agentId) || [];
    const timestamp = new Date();

    for (const rule of agentRules) {
      if (!rule.enabled) {
        continue;
      }

      // Check cooldown
      const cooldownKey = `${agentId}_${rule.ruleId}`;
      if (this.isInCooldown(cooldownKey)) {
        continue;
      }

      const metricValue = this.extractMetricValue(metrics, rule.metric);
      if (metricValue === null) {
        continue;
      }

      const thresholdViolated = this.evaluateThreshold(metricValue, rule.operator, rule.threshold);
      
      if (thresholdViolated) {
        await this.createThresholdAlert(agentId, rule, metricValue, timestamp);
        this.setCooldown(cooldownKey, rule.cooldownPeriod);
      }
    }
  }

  // ===== ESCALATION MANAGEMENT =====

  async processEscalations(): Promise<void> {
    const now = new Date();
    
    for (const [alertId, alert] of this.activeAlerts) {
      if (alert.status === 'resolved' || alert.status === 'suppressed') {
        continue;
      }

      // Check if escalation is due
      if (alert.escalationDeadline && now >= alert.escalationDeadline && 
          alert.acknowledgments.length === 0) {
        await this.escalateAlert(alertId, alert);
      }

      // Check escalation rules
      await this.checkEscalationRules(alertId, alert);
    }
  }

  private async escalateAlert(alertId: string, alert: ActiveAlert): Promise<void> {
    const currentLevel = alert.escalations.length;
    const nextLevel = currentLevel + 1;

    // Find applicable escalation rule
    const escalationRule = this.config.escalationRules.find(rule => 
      this.evaluateEscalationCondition(rule, alert, nextLevel)
    );

    if (!escalationRule) {
      console.log(`[${new Date().toISOString()}] No escalation rule found for alert ${alertId} at level ${nextLevel}`);
      return;
    }

    const escalation: AlertEscalation = {
      level: nextLevel,
      escalatedTo: escalationRule.target,
      escalatedAt: new Date(),
      reason: `Automatic escalation - level ${nextLevel}`,
      deadline: new Date(Date.now() + escalationRule.delay)
    };

    alert.escalations.push(escalation);
    alert.escalationDeadline = escalation.deadline;

    // Update in storage
    await this.dataStore.updateAlert(alertId, { 
      escalations: alert.escalations,
      escalationDeadline: alert.escalationDeadline
    });

    // Send escalation notifications
    await this.sendEscalationNotifications(alert, escalation);

    console.log(`[${new Date().toISOString()}] Alert escalated: ${alertId} to level ${nextLevel}`);
    this.emit('alert:escalated', { alertId, escalation, timestamp: new Date() });
  }

  private async checkEscalationRules(alertId: string, alert: ActiveAlert): Promise<void> {
    for (const rule of this.config.escalationRules) {
      if (this.evaluateEscalationCondition(rule, alert, alert.escalations.length + 1)) {
        const timeSinceAlert = Date.now() - alert.timestamp.getTime();
        if (timeSinceAlert >= rule.delay) {
          await this.escalateAlert(alertId, alert);
          break; // Only escalate once per check
        }
      }
    }
  }

  // ===== SUPPRESSION MANAGEMENT =====

  private isAlertSuppressed(alert: Alert): boolean {
    const suppressionKey = this.generateSuppressionKey(alert);
    const suppressedUntil = this.suppressedAlerts.get(suppressionKey);
    
    if (suppressedUntil && new Date() < suppressedUntil) {
      return true;
    }

    // Check suppression rules
    for (const rule of this.config.suppressionRules) {
      if (this.evaluateSuppressionCondition(rule, alert)) {
        this.suppressAlert(suppressionKey, rule.duration);
        return true;
      }
    }

    return false;
  }

  private suppressAlert(key: string, duration: number): void {
    const suppressedUntil = new Date(Date.now() + duration);
    this.suppressedAlerts.set(key, suppressedUntil);
  }

  // ===== NOTIFICATION MANAGEMENT =====

  private async sendNotifications(alert: ActiveAlert): Promise<void> {
    const applicableChannels = this.getApplicableNotificationChannels(alert);
    
    for (const channel of applicableChannels) {
      const delivery: NotificationDelivery = {
        deliveryId: this.generateDeliveryId(),
        alertId: alert.alertId,
        channelId: channel.id,
        status: 'pending',
        attempts: 0
      };

      this.notificationQueue.push(delivery);
    }

    // Process immediately if not too many in queue
    if (this.notificationQueue.length < 100) {
      await this.processNotificationQueue();
    }
  }

  private async sendEscalationNotifications(alert: ActiveAlert, escalation: AlertEscalation): Promise<void> {
    // Send notifications for escalated alerts
    // This could use different channels or higher priority
    await this.sendNotifications(alert);
  }

  private async processNotificationQueue(): Promise<void> {
    const maxConcurrent = 10;
    const processingBatch = this.notificationQueue.splice(0, maxConcurrent);

    const processPromises = processingBatch.map(delivery => this.processNotificationDelivery(delivery));
    
    await Promise.allSettled(processPromises);
  }

  private async processNotificationDelivery(delivery: NotificationDelivery): Promise<void> {
    const alert = this.activeAlerts.get(delivery.alertId);
    if (!alert) {
      return; // Alert no longer active
    }

    const channel = this.config.notificationChannels.find(c => c.id === delivery.channelId);
    if (!channel || !channel.enabled) {
      delivery.status = 'failed';
      delivery.error = 'Channel not found or disabled';
      return;
    }

    try {
      delivery.attempts++;
      delivery.lastAttempt = new Date();
      delivery.status = 'pending';

      await this.deliverNotification(channel, alert);
      
      delivery.status = 'sent';
      console.log(`[${new Date().toISOString()}] Notification sent for alert ${alert.alertId} via ${channel.type}`);

    } catch (error) {
      delivery.status = 'failed';
      delivery.error = error.message;
      console.error(`[${new Date().toISOString()}] Failed to send notification for alert ${alert.alertId} via ${channel.type}:`, error);

      // Retry logic
      if (delivery.attempts < 3) {
        delivery.status = 'retrying';
        // Re-queue for retry after delay
        setTimeout(() => {
          this.notificationQueue.push(delivery);
        }, 60000 * delivery.attempts); // Exponential backoff
      }
    }
  }

  private async deliverNotification(channel: NotificationChannel, alert: ActiveAlert): Promise<void> {
    switch (channel.type) {
      case 'email':
        await this.sendEmailNotification(channel, alert);
        break;
      case 'slack':
        await this.sendSlackNotification(channel, alert);
        break;
      case 'webhook':
        await this.sendWebhookNotification(channel, alert);
        break;
      case 'sms':
        await this.sendSMSNotification(channel, alert);
        break;
      case 'pagerduty':
        await this.sendPagerDutyNotification(channel, alert);
        break;
      default:
        throw new Error(`Unsupported notification channel type: ${channel.type}`);
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  private initializeDefaultRules(): void {
    // Initialize default alerting rules for common scenarios
    const defaultRules: AlertRule[] = [
      {
        ruleId: 'high_response_time',
        name: 'High Response Time',
        metric: 'performance.responseTime.current',
        operator: 'gt',
        threshold: 1000,
        severity: 'warning',
        enabled: true,
        cooldownPeriod: 300000, // 5 minutes
        description: 'Response time exceeds 1 second'
      },
      {
        ruleId: 'high_error_rate',
        name: 'High Error Rate',
        metric: 'performance.errorRate.current',
        operator: 'gt',
        threshold: 5,
        severity: 'critical',
        enabled: true,
        cooldownPeriod: 300000,
        description: 'Error rate exceeds 5%'
      },
      {
        ruleId: 'high_cpu_usage',
        name: 'High CPU Usage',
        metric: 'resource.cpu.percentage',
        operator: 'gt',
        threshold: 80,
        severity: 'warning',
        enabled: true,
        cooldownPeriod: 600000, // 10 minutes
        description: 'CPU usage exceeds 80%'
      },
      {
        ruleId: 'low_availability',
        name: 'Low Availability',
        metric: 'performance.availability.current',
        operator: 'lt',
        threshold: 99,
        severity: 'critical',
        enabled: true,
        cooldownPeriod: 300000,
        description: 'Availability below 99%'
      }
    ];

    // These would be applied to all agents by default
    // In a real implementation, rules could be customized per agent
  }

  private async loadActiveAlertsFromStorage(): Promise<void> {
    try {
      const storedAlerts = await this.dataStore.getActiveAlerts();
      for (const alert of storedAlerts) {
        this.activeAlerts.set(alert.alertId, alert as ActiveAlert);
      }
      console.log(`[${new Date().toISOString()}] Loaded ${storedAlerts.length} active alerts from storage`);
    } catch (error) {
      console.error('Error loading active alerts from storage:', error);
    }
  }

  private async saveActiveAlertsToStorage(): Promise<void> {
    try {
      const alerts = Array.from(this.activeAlerts.values());
      await this.dataStore.saveActiveAlerts(alerts);
      console.log(`[${new Date().toISOString()}] Saved ${alerts.length} active alerts to storage`);
    } catch (error) {
      console.error('Error saving active alerts to storage:', error);
    }
  }

  private startProcessingLoops(): void {
    // Alert processing loop
    this.alertProcessingInterval = setInterval(async () => {
      try {
        await this.processNotificationQueue();
      } catch (error) {
        console.error('Error in alert processing loop:', error);
      }
    }, 30000); // Every 30 seconds

    // Escalation check loop
    this.escalationCheckInterval = setInterval(async () => {
      try {
        await this.processEscalations();
      } catch (error) {
        console.error('Error in escalation check loop:', error);
      }
    }, 60000); // Every minute

    // Notification processing loop
    this.notificationProcessingInterval = setInterval(async () => {
      try {
        if (this.notificationQueue.length > 0) {
          await this.processNotificationQueue();
        }
      } catch (error) {
        console.error('Error in notification processing loop:', error);
      }
    }, 10000); // Every 10 seconds
  }

  private stopProcessingLoops(): void {
    if (this.alertProcessingInterval) {
      clearInterval(this.alertProcessingInterval);
      this.alertProcessingInterval = undefined;
    }

    if (this.escalationCheckInterval) {
      clearInterval(this.escalationCheckInterval);
      this.escalationCheckInterval = undefined;
    }

    if (this.notificationProcessingInterval) {
      clearInterval(this.notificationProcessingInterval);
      this.notificationProcessingInterval = undefined;
    }
  }

  private extractMetricValue(metrics: HealthMetrics, metricPath: string): number | null {
    const parts = metricPath.split('.');
    let current: any = metrics;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return null;
      }
    }
    
    return typeof current === 'number' ? current : null;
  }

  private evaluateThreshold(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      case 'ne': return value !== threshold;
      default: return false;
    }
  }

  private async createThresholdAlert(agentId: string, rule: AlertRule, value: number, timestamp: Date): Promise<void> {
    const alert = await this.createAlert({
      agentId,
      type: 'threshold',
      severity: rule.severity,
      title: rule.name,
      description: `${rule.description}. Current value: ${value}, Threshold: ${rule.threshold}`,
      metric: rule.metric,
      threshold: rule.threshold,
      actualValue: value,
      status: 'active',
      acknowledgments: [],
      escalations: [],
      tags: ['threshold', rule.ruleId]
    });

    console.log(`[${timestamp.toISOString()}] Threshold alert created: ${alert.alertId} for agent ${agentId}`);
  }

  private isInCooldown(cooldownKey: string): boolean {
    const cooldownEnd = this.cooldownTimers.get(cooldownKey);
    return cooldownEnd ? new Date() < cooldownEnd : false;
  }

  private setCooldown(cooldownKey: string, duration: number): void {
    const cooldownEnd = new Date(Date.now() + duration);
    this.cooldownTimers.set(cooldownKey, cooldownEnd);
  }

  private requiresAcknowledgment(alert: Alert): boolean {
    return alert.severity === 'critical' || alert.severity === 'emergency';
  }

  private calculateEscalationDeadline(alert: Alert): Date | undefined {
    if (alert.severity === 'critical' || alert.severity === 'emergency') {
      return new Date(Date.now() + this.config.acknowledgmentTimeout);
    }
    return undefined;
  }

  private findRelatedAlerts(alert: Alert): string[] {
    const relatedAlerts: string[] = [];
    
    for (const [alertId, activeAlert] of this.activeAlerts) {
      if (activeAlert.agentId === alert.agentId && 
          activeAlert.type === alert.type &&
          alertId !== alert.alertId) {
        relatedAlerts.push(alertId);
      }
    }
    
    return relatedAlerts;
  }

  private findSimilarRecentAlert(alert: Alert): ActiveAlert | null {
    const timeWindow = 300000; // 5 minutes
    const now = Date.now();
    
    for (const activeAlert of this.activeAlerts.values()) {
      if (activeAlert.agentId === alert.agentId &&
          activeAlert.type === alert.type &&
          activeAlert.metric === alert.metric &&
          (now - activeAlert.timestamp.getTime()) < timeWindow) {
        return activeAlert;
      }
    }
    
    return null;
  }

  private evaluateEscalationCondition(rule: EscalationRule, alert: ActiveAlert, level: number): boolean {
    // Simple condition evaluation - in a real implementation, this would be more sophisticated
    return alert.severity === 'critical' && level <= 3;
  }

  private evaluateSuppressionCondition(rule: SuppressionRule, alert: Alert): boolean {
    // Simple condition evaluation - in a real implementation, this would be more sophisticated
    return alert.type === 'threshold' && alert.severity === 'info';
  }

  private getApplicableNotificationChannels(alert: ActiveAlert): NotificationChannel[] {
    return this.config.notificationChannels.filter(channel => 
      channel.enabled && 
      channel.severityFilter.includes(alert.severity)
    );
  }

  private async validateNotificationChannels(): Promise<void> {
    for (const channel of this.config.notificationChannels) {
      try {
        await this.validateChannel(channel);
      } catch (error) {
        console.error(`Invalid notification channel ${channel.id}:`, error);
        channel.enabled = false;
      }
    }
  }

  private async validateChannel(channel: NotificationChannel): Promise<void> {
    // Validate channel configuration
    switch (channel.type) {
      case 'email':
        if (!channel.config.recipients || !Array.isArray(channel.config.recipients)) {
          throw new Error('Email channel requires recipients array');
        }
        break;
      case 'slack':
        if (!channel.config.webhook_url) {
          throw new Error('Slack channel requires webhook_url');
        }
        break;
      case 'webhook':
        if (!channel.config.url) {
          throw new Error('Webhook channel requires url');
        }
        break;
    }
  }

  // ===== NOTIFICATION DELIVERY METHODS =====

  private async sendEmailNotification(channel: NotificationChannel, alert: ActiveAlert): Promise<void> {
    // Email notification implementation
    console.log(`[${new Date().toISOString()}] Sending email notification for alert ${alert.alertId}`);
    
    // In a real implementation, this would integrate with an email service
    const emailData = {
      to: channel.config.recipients,
      subject: `Alert: ${alert.title}`,
      body: this.formatAlertMessage(alert),
      priority: alert.severity === 'critical' ? 'high' : 'normal'
    };

    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async sendSlackNotification(channel: NotificationChannel, alert: ActiveAlert): Promise<void> {
    // Slack notification implementation
    console.log(`[${new Date().toISOString()}] Sending Slack notification for alert ${alert.alertId}`);
    
    const slackMessage = {
      text: `Alert: ${alert.title}`,
      attachments: [{
        color: this.getSeverityColor(alert.severity),
        fields: [
          { title: 'Agent', value: alert.agentId, short: true },
          { title: 'Severity', value: alert.severity, short: true },
          { title: 'Description', value: alert.description, short: false }
        ],
        ts: Math.floor(alert.timestamp.getTime() / 1000)
      }]
    };

    // In a real implementation, this would make HTTP request to Slack webhook
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async sendWebhookNotification(channel: NotificationChannel, alert: ActiveAlert): Promise<void> {
    // Webhook notification implementation
    console.log(`[${new Date().toISOString()}] Sending webhook notification for alert ${alert.alertId}`);
    
    const webhookPayload = {
      alert_id: alert.alertId,
      agent_id: alert.agentId,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      description: alert.description,
      timestamp: alert.timestamp.toISOString(),
      metric: alert.metric,
      threshold: alert.threshold,
      actual_value: alert.actualValue
    };

    // In a real implementation, this would make HTTP request to the webhook URL
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async sendSMSNotification(channel: NotificationChannel, alert: ActiveAlert): Promise<void> {
    // SMS notification implementation (typically only for critical alerts)
    if (alert.severity !== 'critical' && alert.severity !== 'emergency') {
      return;
    }

    console.log(`[${new Date().toISOString()}] Sending SMS notification for alert ${alert.alertId}`);
    
    const smsMessage = `ALERT: ${alert.title} - Agent: ${alert.agentId} - Severity: ${alert.severity}`;

    // In a real implementation, this would integrate with an SMS service
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async sendPagerDutyNotification(channel: NotificationChannel, alert: ActiveAlert): Promise<void> {
    // PagerDuty notification implementation
    console.log(`[${new Date().toISOString()}] Sending PagerDuty notification for alert ${alert.alertId}`);
    
    const pagerDutyEvent = {
      routing_key: channel.config.integration_key,
      event_action: 'trigger',
      payload: {
        summary: alert.title,
        source: alert.agentId,
        severity: alert.severity,
        custom_details: {
          description: alert.description,
          metric: alert.metric,
          threshold: alert.threshold,
          actual_value: alert.actualValue
        }
      }
    };

    // In a real implementation, this would make HTTP request to PagerDuty Events API
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private formatAlertMessage(alert: ActiveAlert): string {
    return `
Alert Details:
- ID: ${alert.alertId}
- Agent: ${alert.agentId}
- Type: ${alert.type}
- Severity: ${alert.severity}
- Title: ${alert.title}
- Description: ${alert.description}
- Timestamp: ${alert.timestamp.toISOString()}
${alert.metric ? `- Metric: ${alert.metric}` : ''}
${alert.threshold ? `- Threshold: ${alert.threshold}` : ''}
${alert.actualValue ? `- Actual Value: ${alert.actualValue}` : ''}
`;
  }

  private getSeverityColor(severity: SeverityLevel): string {
    const colors = {
      'info': '#36a64f',      // Green
      'warning': '#ff9900',   // Orange
      'critical': '#ff0000',  // Red
      'emergency': '#8b0000'  // Dark Red
    };
    return colors[severity] || '#808080';
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateDeliveryId(): string {
    return `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSuppressionKey(alert: Alert): string {
    return `${alert.agentId}_${alert.type}_${alert.metric || 'general'}`;
  }
}
