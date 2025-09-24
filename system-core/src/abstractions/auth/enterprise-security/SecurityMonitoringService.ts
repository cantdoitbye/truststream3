/**
 * Security Monitoring Service
 * 
 * Enterprise-grade security monitoring with threat detection and SIEM integration
 */

import { EventEmitter } from 'events';
import { SecurityConfig } from './SecurityConfig';
import { User, Session, SecurityEvent } from '../../../shared-utils/auth-interface';

export interface SecurityAlert {
  id: string;
  type: 'authentication' | 'authorization' | 'data_access' | 'system' | 'compliance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  metadata?: Record<string, any>;
  correlationId?: string;
  status: 'new' | 'investigating' | 'resolved' | 'false_positive';
  assignedTo?: string;
  responseActions?: SecurityResponseAction[];
}

export interface SecurityResponseAction {
  id: string;
  type: 'log' | 'notify' | 'block' | 'quarantine' | 'investigate';
  description: string;
  automated: boolean;
  executed: boolean;
  executedAt?: Date;
  result?: string;
}

export interface ThreatIndicator {
  type: 'ip' | 'user_agent' | 'behavior' | 'pattern';
  value: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  firstSeen: Date;
  lastSeen: Date;
  occurrences: number;
  confidence: number;
}

export interface SecurityMetrics {
  timestamp: Date;
  authenticationAttempts: {
    total: number;
    successful: number;
    failed: number;
    blocked: number;
  };
  alerts: {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  threats: {
    detected: number;
    mitigated: number;
    active: number;
  };
  compliance: {
    gdprEvents: number;
    auditLogEntries: number;
    dataExportRequests: number;
    dataDeletionRequests: number;
  };
}

export interface BehavioralPattern {
  userId: string;
  patternType: 'login_time' | 'location' | 'device' | 'resource_access';
  baseline: any;
  current: any;
  deviation: number;
  confidence: number;
  lastUpdated: Date;
}

export interface ComplianceEvent {
  id: string;
  type: 'gdpr_request' | 'data_export' | 'data_deletion' | 'consent_update' | 'breach_notification';
  userId?: string;
  timestamp: Date;
  details: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  evidence?: string[];
}

/**
 * Security Monitoring Service
 */
export class SecurityMonitoringService extends EventEmitter {
  private config: SecurityConfig;
  private alerts = new Map<string, SecurityAlert>();
  private threatIndicators = new Map<string, ThreatIndicator>();
  private behavioralPatterns = new Map<string, BehavioralPattern[]>();
  private complianceEvents = new Map<string, ComplianceEvent>();
  private metrics: SecurityMetrics;
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(config: SecurityConfig) {
    super();
    this.config = config;
    this.metrics = this.initializeMetrics();
  }

  /**
   * Start security monitoring
   */
  public start(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    
    if (this.config.monitoring.threatDetection.enabled) {
      this.startThreatDetection();
    }

    if (this.config.monitoring.threatDetection.behavioralAnalysis) {
      this.startBehavioralAnalysis();
    }

    // Start metrics collection
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, 60000); // Every minute

    this.emit('monitoring:started');
  }

  /**
   * Stop security monitoring
   */
  public stop(): void {
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.emit('monitoring:stopped');
  }

  /**
   * Record security event
   */
  public async recordSecurityEvent(event: SecurityEvent): Promise<void> {
    // Update metrics
    this.updateMetrics(event);

    // Check for threat indicators
    const threats = await this.detectThreats(event);
    
    for (const threat of threats) {
      await this.handleThreatDetection(threat, event);
    }

    // Behavioral analysis
    if (this.config.monitoring.threatDetection.behavioralAnalysis && event.userId) {
      await this.updateBehavioralPattern(event.userId, event);
    }

    // SIEM integration
    if (this.config.monitoring.siem.enabled) {
      await this.sendToSIEM(event);
    }

    // Compliance event detection
    await this.checkComplianceEvents(event);

    this.emit('security:event', event);
  }

  /**
   * Create security alert
   */
  public async createAlert(alert: Omit<SecurityAlert, 'id' | 'timestamp' | 'status'>): Promise<SecurityAlert> {
    const fullAlert: SecurityAlert = {
      ...alert,
      id: this.generateAlertId(),
      timestamp: new Date(),
      status: 'new',
      responseActions: []
    };

    this.alerts.set(fullAlert.id, fullAlert);

    // Auto-response based on severity
    await this.triggerAutoResponse(fullAlert);

    // Real-time notifications
    if (this.config.monitoring.threatDetection.realTimeAlerts) {
      await this.sendAlertNotification(fullAlert);
    }

    this.emit('security:alert', fullAlert);
    return fullAlert;
  }

  /**
   * Get security alerts
   */
  public getAlerts(filter?: {
    type?: string;
    severity?: string;
    status?: string;
    userId?: string;
    since?: Date;
  }): SecurityAlert[] {
    let alerts = Array.from(this.alerts.values());

    if (filter) {
      alerts = alerts.filter(alert => {
        if (filter.type && alert.type !== filter.type) return false;
        if (filter.severity && alert.severity !== filter.severity) return false;
        if (filter.status && alert.status !== filter.status) return false;
        if (filter.userId && alert.userId !== filter.userId) return false;
        if (filter.since && alert.timestamp < filter.since) return false;
        return true;
      });
    }

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Update alert status
   */
  public async updateAlert(alertId: string, updates: Partial<SecurityAlert>): Promise<SecurityAlert | null> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      return null;
    }

    const updatedAlert = { ...alert, ...updates };
    this.alerts.set(alertId, updatedAlert);

    this.emit('security:alert:updated', updatedAlert);
    return updatedAlert;
  }

  /**
   * Get security metrics
   */
  public getMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  /**
   * Get threat indicators
   */
  public getThreatIndicators(): ThreatIndicator[] {
    return Array.from(this.threatIndicators.values())
      .sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
  }

  /**
   * Add threat indicator
   */
  public addThreatIndicator(indicator: ThreatIndicator): void {
    const key = `${indicator.type}:${indicator.value}`;
    const existing = this.threatIndicators.get(key);
    
    if (existing) {
      existing.lastSeen = new Date();
      existing.occurrences++;
      existing.confidence = Math.min(1.0, existing.confidence + 0.1);
    } else {
      this.threatIndicators.set(key, { ...indicator });
    }
  }

  /**
   * Record compliance event
   */
  public async recordComplianceEvent(event: Omit<ComplianceEvent, 'id' | 'timestamp'>): Promise<ComplianceEvent> {
    const fullEvent: ComplianceEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date()
    };

    this.complianceEvents.set(fullEvent.id, fullEvent);

    // Update compliance metrics
    this.metrics.compliance.gdprEvents++;
    
    if (event.type === 'data_export') {
      this.metrics.compliance.dataExportRequests++;
    } else if (event.type === 'data_deletion') {
      this.metrics.compliance.dataDeletionRequests++;
    }

    this.emit('compliance:event', fullEvent);
    return fullEvent;
  }

  /**
   * Detect anomalies in user behavior
   */
  public async detectBehavioralAnomalies(userId: string, currentActivity: any): Promise<BehavioralPattern[]> {
    const patterns = this.behavioralPatterns.get(userId) || [];
    const anomalies: BehavioralPattern[] = [];

    for (const pattern of patterns) {
      const deviation = this.calculateDeviation(pattern.baseline, currentActivity);
      
      if (deviation > 0.7) { // Anomaly threshold
        pattern.deviation = deviation;
        pattern.lastUpdated = new Date();
        anomalies.push(pattern);

        // Create alert for significant anomalies
        if (deviation > 0.8) {
          await this.createAlert({
            type: 'authentication',
            severity: 'medium',
            title: 'Behavioral Anomaly Detected',
            description: `Unusual ${pattern.patternType} pattern detected for user`,
            userId,
            metadata: {
              patternType: pattern.patternType,
              deviation,
              confidence: pattern.confidence
            }
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Private methods
   */
  private initializeMetrics(): SecurityMetrics {
    return {
      timestamp: new Date(),
      authenticationAttempts: {
        total: 0,
        successful: 0,
        failed: 0,
        blocked: 0
      },
      alerts: {
        total: 0,
        byType: {},
        bySeverity: {}
      },
      threats: {
        detected: 0,
        mitigated: 0,
        active: 0
      },
      compliance: {
        gdprEvents: 0,
        auditLogEntries: 0,
        dataExportRequests: 0,
        dataDeletionRequests: 0
      }
    };
  }

  private startThreatDetection(): void {
    // Initialize threat detection algorithms
    this.emit('threat_detection:started');
  }

  private startBehavioralAnalysis(): void {
    // Initialize behavioral analysis
    this.emit('behavioral_analysis:started');
  }

  private async detectThreats(event: SecurityEvent): Promise<ThreatIndicator[]> {
    const threats: ThreatIndicator[] = [];

    // IP-based threat detection
    if (event.ipAddress) {
      const ipThreat = this.threatIndicators.get(`ip:${event.ipAddress}`);
      if (ipThreat) {
        threats.push(ipThreat);
      }
    }

    // User agent-based detection
    if (event.userAgent) {
      const uaThreat = this.threatIndicators.get(`user_agent:${event.userAgent}`);
      if (uaThreat) {
        threats.push(uaThreat);
      }
    }

    return threats;
  }

  private async handleThreatDetection(threat: ThreatIndicator, event: SecurityEvent): Promise<void> {
    await this.createAlert({
      type: 'system',
      severity: threat.severity,
      title: 'Threat Indicator Detected',
      description: `Threat indicator ${threat.type}:${threat.value} detected`,
      userId: event.userId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      metadata: {
        threat,
        event
      }
    });

    this.metrics.threats.detected++;
  }

  private async updateBehavioralPattern(userId: string, event: SecurityEvent): Promise<void> {
    // This would implement sophisticated behavioral pattern analysis
    // For now, basic implementation
    const patterns = this.behavioralPatterns.get(userId) || [];
    
    // Update or create patterns based on the event
    this.behavioralPatterns.set(userId, patterns);
  }

  private async sendToSIEM(event: SecurityEvent): Promise<void> {
    // Integration with SIEM systems
    const siemEvent = {
      timestamp: new Date().toISOString(),
      source: 'truststream-auth',
      event_type: event.type,
      severity: event.severity || 'medium',
      user_id: event.userId,
      session_id: event.sessionId,
      ip_address: event.ipAddress,
      user_agent: event.userAgent,
      details: event.metadata
    };

    // Send to configured SIEM endpoint
    try {
      for (const webhook of this.config.monitoring.siem.alertWebhooks) {
        await fetch(webhook, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(siemEvent)
        });
      }
    } catch (error) {
      console.error('Failed to send event to SIEM:', error);
    }
  }

  private async checkComplianceEvents(event: SecurityEvent): Promise<void> {
    // Check for GDPR-related events
    if (event.type === 'DATA_ACCESS' || event.type === 'DATA_EXPORT' || event.type === 'DATA_DELETION') {
      await this.recordComplianceEvent({
        type: 'gdpr_request',
        userId: event.userId,
        details: event.metadata,
        status: 'completed'
      });
    }
  }

  private async triggerAutoResponse(alert: SecurityAlert): Promise<void> {
    const actions: SecurityResponseAction[] = [];

    // Auto-response based on severity
    if (alert.severity === 'critical') {
      actions.push({
        id: this.generateActionId(),
        type: 'notify',
        description: 'Send immediate notification to security team',
        automated: true,
        executed: false
      });

      actions.push({
        id: this.generateActionId(),
        type: 'investigate',
        description: 'Auto-trigger investigation workflow',
        automated: true,
        executed: false
      });
    }

    // Execute actions
    for (const action of actions) {
      try {
        await this.executeSecurityAction(action);
        action.executed = true;
        action.executedAt = new Date();
        action.result = 'success';
      } catch (error) {
        action.executed = false;
        action.result = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    alert.responseActions = actions;
  }

  private async executeSecurityAction(action: SecurityResponseAction): Promise<void> {
    switch (action.type) {
      case 'notify':
        await this.sendSecurityNotification(action.description);
        break;
      case 'block':
        // Implement blocking logic
        break;
      case 'investigate':
        // Trigger investigation workflow
        break;
      default:
        console.log(`Security action executed: ${action.description}`);
    }
  }

  private async sendAlertNotification(alert: SecurityAlert): Promise<void> {
    // Send notifications via configured channels
    const notification = {
      alert_id: alert.id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      description: alert.description,
      timestamp: alert.timestamp.toISOString(),
      user_id: alert.userId,
      ip_address: alert.ipAddress
    };

    // Implementation would send via email, Slack, etc.
    console.log('Security Alert:', notification);
  }

  private async sendSecurityNotification(message: string): Promise<void> {
    // Send security team notification
    console.log('Security Notification:', message);
  }

  private updateMetrics(event: SecurityEvent): void {
    this.metrics.timestamp = new Date();

    if (event.type === 'SIGNED_IN' || event.type === 'SIGN_IN_FAILED') {
      this.metrics.authenticationAttempts.total++;
      
      if (event.type === 'SIGNED_IN') {
        this.metrics.authenticationAttempts.successful++;
      } else {
        this.metrics.authenticationAttempts.failed++;
      }
    }

    this.metrics.compliance.auditLogEntries++;
  }

  private collectMetrics(): void {
    // Collect and aggregate metrics
    this.metrics.alerts.total = this.alerts.size;
    this.metrics.threats.active = Array.from(this.threatIndicators.values())
      .filter(t => t.confidence > 0.7).length;
    
    this.emit('metrics:collected', this.metrics);
  }

  private calculateDeviation(baseline: any, current: any): number {
    // Simple deviation calculation - would be more sophisticated in production
    return Math.random() * 0.5; // Placeholder
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
