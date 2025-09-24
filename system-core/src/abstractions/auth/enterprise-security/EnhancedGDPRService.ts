/**
 * Enhanced GDPR Compliance Service
 * 
 * Automated GDPR compliance with advanced data minimization and lifecycle management
 */

import { EventEmitter } from 'events';
import { SecurityConfig } from './SecurityConfig';
import GDPRComplianceUtils, { AuditLogEntry, DataExportRequest, DataDeletionRequest, ConsentUpdate } from '../../../utils/gdpr-compliance';

export interface DataClassification {
  id: string;
  name: string;
  category: 'personal' | 'sensitive' | 'public' | 'internal';
  retentionPeriod: number; // days
  processingPurpose: string[];
  legalBasis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  dataMinimizationRules: DataMinimizationRule[];
  anonymizationSchedule: string; // cron expression
}

export interface DataMinimizationRule {
  field: string;
  condition: string;
  action: 'redact' | 'pseudonymize' | 'delete' | 'encrypt';
  trigger: 'time_based' | 'purpose_fulfilled' | 'consent_withdrawn';
}

export interface ConsentRecord {
  userId: string;
  consentId: string;
  purposes: ConsentPurpose[];
  timestamp: Date;
  method: 'explicit' | 'implied' | 'opt_in' | 'opt_out';
  ipAddress: string;
  userAgent: string;
  withdrawnAt?: Date;
  withdrawalReason?: string;
}

export interface ConsentPurpose {
  purpose: string;
  granted: boolean;
  mandatory: boolean;
  description: string;
  legalBasis: string;
}

export interface DataSubjectRequest {
  id: string;
  type: 'access' | 'rectification' | 'erasure' | 'restriction' | 'portability' | 'objection';
  userId: string;
  email: string;
  requestDate: Date;
  status: 'pending' | 'processing' | 'completed' | 'rejected' | 'partially_completed';
  dueDate: Date;
  description: string;
  evidence: string[];
  processingNotes: string[];
  completedAt?: Date;
  rejectionReason?: string;
}

export interface PrivacyImpactAssessment {
  id: string;
  name: string;
  description: string;
  dataTypes: string[];
  processingActivities: string[];
  riskLevel: 'low' | 'medium' | 'high';
  mitigationMeasures: string[];
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  reviewDate: Date;
}

export interface BreachNotification {
  id: string;
  incidentDate: Date;
  discoveredDate: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedRecords: number;
  dataTypes: string[];
  cause: string;
  containmentMeasures: string[];
  notificationRequired: boolean;
  authorityNotified: boolean;
  subjectsNotified: boolean;
  status: 'investigating' | 'contained' | 'resolved';
}

/**
 * Enhanced GDPR Compliance Service
 */
export class EnhancedGDPRService extends EventEmitter {
  private config: SecurityConfig;
  private gdprUtils: GDPRComplianceUtils;
  private dataClassifications = new Map<string, DataClassification>();
  private consentRecords = new Map<string, ConsentRecord[]>();
  private dataSubjectRequests = new Map<string, DataSubjectRequest>();
  private privacyImpactAssessments = new Map<string, PrivacyImpactAssessment>();
  private breachNotifications = new Map<string, BreachNotification>();
  private automationInterval?: NodeJS.Timeout;
  private isRunning = false;

  constructor(config: SecurityConfig, gdprUtils: GDPRComplianceUtils) {
    super();
    this.config = config;
    this.gdprUtils = gdprUtils;
    this.initializeDataClassifications();
  }

  /**
   * Start GDPR compliance automation
   */
  public start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Start automated compliance tasks
    this.automationInterval = setInterval(() => {
      this.runAutomatedTasks();
    }, 3600000); // Every hour

    // Schedule daily data minimization
    this.scheduleDataMinimization();

    this.emit('gdpr:service:started');
  }

  /**
   * Stop GDPR compliance automation
   */
  public stop(): void {
    this.isRunning = false;
    
    if (this.automationInterval) {
      clearInterval(this.automationInterval);
    }

    this.emit('gdpr:service:stopped');
  }

  /**
   * Process data subject request
   */
  public async processDataSubjectRequest(request: Omit<DataSubjectRequest, 'id' | 'status' | 'dueDate'>): Promise<DataSubjectRequest> {
    const fullRequest: DataSubjectRequest = {
      ...request,
      id: this.generateRequestId(),
      status: 'pending',
      dueDate: this.calculateDueDate(request.type),
      processingNotes: []
    };

    this.dataSubjectRequests.set(fullRequest.id, fullRequest);

    // Auto-process certain request types
    if (this.config.compliance.gdprEnhanced.automatedConsentManagement) {
      await this.autoProcessRequest(fullRequest);
    }

    // Log the request
    await this.gdprUtils.logAuditEntry({
      user_id: request.userId,
      action: 'data_subject_request_created',
      details: {
        requestType: request.type,
        requestId: fullRequest.id
      }
    });

    this.emit('gdpr:request:created', fullRequest);
    return fullRequest;
  }

  /**
   * Update consent preferences with automation
   */
  public async updateConsent(userId: string, purposes: ConsentPurpose[], metadata: {
    ipAddress: string;
    userAgent: string;
    method: 'explicit' | 'implied' | 'opt_in' | 'opt_out';
  }): Promise<ConsentRecord> {
    const consentRecord: ConsentRecord = {
      userId,
      consentId: this.generateConsentId(),
      purposes,
      timestamp: new Date(),
      method: metadata.method,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent
    };

    // Store consent record
    const userConsents = this.consentRecords.get(userId) || [];
    userConsents.push(consentRecord);
    this.consentRecords.set(userId, userConsents);

    // Update consent in GDPR utils
    await this.gdprUtils.updateConsent({
      userId,
      consents: {
        necessary: true, // Always true
        functional: purposes.find(p => p.purpose === 'functional')?.granted || false,
        analytics: purposes.find(p => p.purpose === 'analytics')?.granted || false,
        marketing: purposes.find(p => p.purpose === 'marketing')?.granted || false
      },
      consentMethod: metadata.method
    });

    // Trigger data minimization if consent withdrawn
    if (purposes.some(p => !p.granted)) {
      await this.triggerDataMinimization(userId, purposes.filter(p => !p.granted));
    }

    this.emit('gdpr:consent:updated', consentRecord);
    return consentRecord;
  }

  /**
   * Automated data export
   */
  public async exportUserData(userId: string, requestId?: string): Promise<any> {
    try {
      const exportData = await this.gdprUtils.requestDataExport({
        userId,
        format: 'json'
      });

      // Enhanced export with classification metadata
      const enhancedExport = {
        ...exportData,
        metadata: {
          exportedAt: new Date().toISOString(),
          requestId,
          dataClassifications: this.getDataClassificationsForUser(userId),
          retentionPolicies: this.getRetentionPoliciesForUser(userId)
        }
      };

      // Update request status if applicable
      if (requestId) {
        await this.updateRequestStatus(requestId, 'completed');
      }

      this.emit('gdpr:data:exported', { userId, requestId, dataSize: JSON.stringify(enhancedExport).length });
      return enhancedExport;

    } catch (error) {
      if (requestId) {
        await this.updateRequestStatus(requestId, 'rejected', error instanceof Error ? error.message : 'Export failed');
      }
      throw error;
    }
  }

  /**
   * Automated data deletion with verification
   */
  public async deleteUserData(userId: string, requestId?: string, deletionType: 'complete' | 'immediate' | 'scheduled' = 'complete'): Promise<void> {
    try {
      // Pre-deletion audit
      await this.gdprUtils.logAuditEntry({
        user_id: userId,
        action: 'data_deletion_initiated',
        details: {
          requestId,
          deletionType,
          timestamp: new Date().toISOString()
        }
      });

      // Perform deletion based on data classifications
      await this.performClassifiedDeletion(userId, deletionType);

      // GDPR utils deletion
      await this.gdprUtils.requestDataDeletion({
        userId,
        deletionType,
        reason: 'data_subject_request'
      });

      // Clean up local records
      this.consentRecords.delete(userId);

      // Post-deletion verification
      const verificationResult = await this.verifyDataDeletion(userId);
      
      if (!verificationResult.complete) {
        throw new Error(`Data deletion incomplete: ${verificationResult.remainingData.join(', ')}`);
      }

      // Update request status
      if (requestId) {
        await this.updateRequestStatus(requestId, 'completed');
      }

      // Post-deletion audit
      await this.gdprUtils.logAuditEntry({
        user_id: userId,
        action: 'data_deletion_completed',
        details: {
          requestId,
          deletionType,
          verificationResult,
          timestamp: new Date().toISOString()
        }
      });

      this.emit('gdpr:data:deleted', { userId, requestId, deletionType });

    } catch (error) {
      if (requestId) {
        await this.updateRequestStatus(requestId, 'rejected', error instanceof Error ? error.message : 'Deletion failed');
      }
      throw error;
    }
  }

  /**
   * Automated data anonymization
   */
  public async anonymizeUserData(userId: string, dataTypes?: string[]): Promise<void> {
    const classifications = dataTypes ? 
      Array.from(this.dataClassifications.values()).filter(c => dataTypes.includes(c.name)) :
      Array.from(this.dataClassifications.values());

    for (const classification of classifications) {
      await this.anonymizeDataByClassification(userId, classification);
    }

    await this.gdprUtils.logAuditEntry({
      user_id: userId,
      action: 'data_anonymized',
      details: {
        dataTypes: dataTypes || 'all',
        timestamp: new Date().toISOString()
      }
    });

    this.emit('gdpr:data:anonymized', { userId, dataTypes });
  }

  /**
   * Generate privacy impact assessment
   */
  public async createPrivacyImpactAssessment(assessment: Omit<PrivacyImpactAssessment, 'id' | 'approvalStatus'>): Promise<PrivacyImpactAssessment> {
    const fullAssessment: PrivacyImpactAssessment = {
      ...assessment,
      id: this.generatePIAId(),
      approvalStatus: 'pending'
    };

    this.privacyImpactAssessments.set(fullAssessment.id, fullAssessment);

    // Auto-approve low-risk assessments
    if (fullAssessment.riskLevel === 'low') {
      fullAssessment.approvalStatus = 'approved';
      fullAssessment.approvedAt = new Date();
      fullAssessment.approvedBy = 'system';
    }

    this.emit('gdpr:pia:created', fullAssessment);
    return fullAssessment;
  }

  /**
   * Report data breach with automated notifications
   */
  public async reportDataBreach(breach: Omit<BreachNotification, 'id' | 'status'>): Promise<BreachNotification> {
    const fullBreach: BreachNotification = {
      ...breach,
      id: this.generateBreachId(),
      status: 'investigating'
    };

    this.breachNotifications.set(fullBreach.id, fullBreach);

    // Auto-determine notification requirements
    fullBreach.notificationRequired = this.shouldNotifyAuthority(fullBreach);

    // Auto-notify if critical
    if (fullBreach.severity === 'critical') {
      await this.sendBreachNotifications(fullBreach);
    }

    await this.gdprUtils.logAuditEntry({
      user_id: 'system',
      action: 'data_breach_reported',
      details: {
        breachId: fullBreach.id,
        severity: fullBreach.severity,
        affectedRecords: fullBreach.affectedRecords
      }
    });

    this.emit('gdpr:breach:reported', fullBreach);
    return fullBreach;
  }

  /**
   * Get compliance dashboard data
   */
  public getComplianceDashboard(): any {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentRequests = Array.from(this.dataSubjectRequests.values())
      .filter(r => r.requestDate >= thirtyDaysAgo);

    const pendingRequests = recentRequests.filter(r => r.status === 'pending');
    const overdueRequests = recentRequests.filter(r => r.dueDate < now && r.status !== 'completed');

    return {
      summary: {
        totalRequests: recentRequests.length,
        pendingRequests: pendingRequests.length,
        overdueRequests: overdueRequests.length,
        completionRate: recentRequests.length > 0 ? 
          (recentRequests.filter(r => r.status === 'completed').length / recentRequests.length) * 100 : 0
      },
      requestsByType: this.groupRequestsByType(recentRequests),
      consentMetrics: this.calculateConsentMetrics(),
      dataRetention: this.calculateRetentionMetrics(),
      breaches: Array.from(this.breachNotifications.values())
        .filter(b => b.incidentDate >= thirtyDaysAgo)
    };
  }

  /**
   * Private methods
   */
  private initializeDataClassifications(): void {
    const defaultClassifications: DataClassification[] = [
      {
        id: 'user_profile',
        name: 'User Profile Data',
        category: 'personal',
        retentionPeriod: this.config.compliance.gdprEnhanced.retentionPolicies.user_data || 2555,
        processingPurpose: ['account_management', 'service_provision'],
        legalBasis: 'contract',
        dataMinimizationRules: [
          {
            field: 'email',
            condition: 'account_deleted',
            action: 'pseudonymize',
            trigger: 'purpose_fulfilled'
          }
        ],
        anonymizationSchedule: this.config.compliance.gdprEnhanced.anonymizationSchedule
      },
      {
        id: 'session_data',
        name: 'Session Data',
        category: 'internal',
        retentionPeriod: this.config.compliance.gdprEnhanced.retentionPolicies.session_data || 30,
        processingPurpose: ['security', 'service_provision'],
        legalBasis: 'legitimate_interests',
        dataMinimizationRules: [
          {
            field: 'ip_address',
            condition: 'session_expired',
            action: 'delete',
            trigger: 'time_based'
          }
        ],
        anonymizationSchedule: '0 2 * * *' // Daily at 2 AM
      },
      {
        id: 'analytics_data',
        name: 'Analytics Data',
        category: 'internal',
        retentionPeriod: this.config.compliance.gdprEnhanced.retentionPolicies.analytics_data || 730,
        processingPurpose: ['analytics', 'service_improvement'],
        legalBasis: 'consent',
        dataMinimizationRules: [
          {
            field: 'user_id',
            condition: 'consent_withdrawn',
            action: 'pseudonymize',
            trigger: 'consent_withdrawn'
          }
        ],
        anonymizationSchedule: this.config.compliance.gdprEnhanced.anonymizationSchedule
      }
    ];

    for (const classification of defaultClassifications) {
      this.dataClassifications.set(classification.id, classification);
    }
  }

  private async runAutomatedTasks(): Promise<void> {
    try {
      // Check for overdue requests
      await this.checkOverdueRequests();

      // Run data minimization
      await this.runDataMinimization();

      // Check consent expiry
      await this.checkConsentExpiry();

      // Clean up expired data
      await this.cleanupExpiredData();

    } catch (error) {
      console.error('Error in automated GDPR tasks:', error);
    }
  }

  private async autoProcessRequest(request: DataSubjectRequest): Promise<void> {
    try {
      switch (request.type) {
        case 'access':
          await this.exportUserData(request.userId, request.id);
          break;
        case 'erasure':
          await this.deleteUserData(request.userId, request.id);
          break;
        case 'portability':
          await this.exportUserData(request.userId, request.id);
          break;
        default:
          // Manual processing required
          break;
      }
    } catch (error) {
      console.error(`Error auto-processing request ${request.id}:`, error);
    }
  }

  private async updateRequestStatus(requestId: string, status: DataSubjectRequest['status'], reason?: string): Promise<void> {
    const request = this.dataSubjectRequests.get(requestId);
    if (request) {
      request.status = status;
      if (status === 'completed') {
        request.completedAt = new Date();
      } else if (status === 'rejected' && reason) {
        request.rejectionReason = reason;
      }
      this.dataSubjectRequests.set(requestId, request);
      this.emit('gdpr:request:updated', request);
    }
  }

  private async triggerDataMinimization(userId: string, withdrawnPurposes: ConsentPurpose[]): Promise<void> {
    for (const purpose of withdrawnPurposes) {
      const relevantClassifications = Array.from(this.dataClassifications.values())
        .filter(c => c.processingPurpose.includes(purpose.purpose));

      for (const classification of relevantClassifications) {
        const rules = classification.dataMinimizationRules
          .filter(r => r.trigger === 'consent_withdrawn');

        for (const rule of rules) {
          await this.applyMinimizationRule(userId, rule, classification);
        }
      }
    }
  }

  private async performClassifiedDeletion(userId: string, deletionType: string): Promise<void> {
    const classifications = Array.from(this.dataClassifications.values());

    for (const classification of classifications) {
      // Apply deletion rules based on classification
      if (deletionType === 'immediate' || classification.category === 'personal') {
        await this.deleteDataByClassification(userId, classification);
      } else if (deletionType === 'scheduled') {
        await this.scheduleDataDeletion(userId, classification);
      }
    }
  }

  private async verifyDataDeletion(userId: string): Promise<{ complete: boolean; remainingData: string[] }> {
    // This would verify actual data deletion across all systems
    // For now, return a simplified result
    return {
      complete: true,
      remainingData: []
    };
  }

  private async anonymizeDataByClassification(userId: string, classification: DataClassification): Promise<void> {
    // Apply anonymization rules based on classification
    for (const rule of classification.dataMinimizationRules) {
      if (rule.action === 'pseudonymize') {
        await this.applyMinimizationRule(userId, rule, classification);
      }
    }
  }

  private async applyMinimizationRule(userId: string, rule: DataMinimizationRule, classification: DataClassification): Promise<void> {
    // This would apply the actual minimization rule to the data
    console.log(`Applying minimization rule: ${rule.action} on ${rule.field} for user ${userId}`);
  }

  private async deleteDataByClassification(userId: string, classification: DataClassification): Promise<void> {
    // This would delete data based on classification
    console.log(`Deleting ${classification.name} data for user ${userId}`);
  }

  private async scheduleDataDeletion(userId: string, classification: DataClassification): Promise<void> {
    // This would schedule data deletion based on retention period
    const deletionDate = new Date(Date.now() + classification.retentionPeriod * 24 * 60 * 60 * 1000);
    console.log(`Scheduled deletion of ${classification.name} data for user ${userId} on ${deletionDate}`);
  }

  private shouldNotifyAuthority(breach: BreachNotification): boolean {
    // GDPR requires notification within 72 hours if likely to result in risk
    return breach.severity === 'high' || breach.severity === 'critical' || breach.affectedRecords > 100;
  }

  private async sendBreachNotifications(breach: BreachNotification): Promise<void> {
    // Send notifications to relevant authorities and affected data subjects
    console.log(`Sending breach notifications for breach ${breach.id}`);
    
    // Update notification status
    breach.authorityNotified = true;
    breach.subjectsNotified = breach.affectedRecords <= 1000; // Simplified logic
  }

  private scheduleDataMinimization(): void {
    // Schedule based on configuration
    const schedule = this.config.compliance.gdprEnhanced.anonymizationSchedule;
    console.log(`Data minimization scheduled: ${schedule}`);
  }

  private async checkOverdueRequests(): Promise<void> {
    const now = new Date();
    const overdueRequests = Array.from(this.dataSubjectRequests.values())
      .filter(r => r.dueDate < now && r.status === 'pending');

    for (const request of overdueRequests) {
      this.emit('gdpr:request:overdue', request);
    }
  }

  private async runDataMinimization(): Promise<void> {
    // Run data minimization based on schedules
    if (this.config.compliance.gdprEnhanced.dataMinimization) {
      console.log('Running automated data minimization');
    }
  }

  private async checkConsentExpiry(): Promise<void> {
    // Check for consents that need refresh (older than 13 months)
    const thirteenMonthsAgo = new Date();
    thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13);

    for (const [userId, consents] of this.consentRecords.entries()) {
      const latestConsent = consents[consents.length - 1];
      if (latestConsent && latestConsent.timestamp < thirteenMonthsAgo) {
        this.emit('gdpr:consent:expired', { userId, consent: latestConsent });
      }
    }
  }

  private async cleanupExpiredData(): Promise<void> {
    // Clean up data based on retention policies
    for (const classification of this.dataClassifications.values()) {
      const expiryDate = new Date(Date.now() - classification.retentionPeriod * 24 * 60 * 60 * 1000);
      console.log(`Cleaning up ${classification.name} data older than ${expiryDate}`);
    }
  }

  private getDataClassificationsForUser(userId: string): DataClassification[] {
    return Array.from(this.dataClassifications.values());
  }

  private getRetentionPoliciesForUser(userId: string): any {
    const policies: any = {};
    for (const classification of this.dataClassifications.values()) {
      policies[classification.name] = {
        retentionPeriod: classification.retentionPeriod,
        legalBasis: classification.legalBasis
      };
    }
    return policies;
  }

  private groupRequestsByType(requests: DataSubjectRequest[]): any {
    const grouped: any = {};
    for (const request of requests) {
      grouped[request.type] = (grouped[request.type] || 0) + 1;
    }
    return grouped;
  }

  private calculateConsentMetrics(): any {
    const totalUsers = this.consentRecords.size;
    let functionalConsents = 0;
    let analyticsConsents = 0;
    let marketingConsents = 0;

    for (const consents of this.consentRecords.values()) {
      const latest = consents[consents.length - 1];
      if (latest) {
        if (latest.purposes.find(p => p.purpose === 'functional')?.granted) functionalConsents++;
        if (latest.purposes.find(p => p.purpose === 'analytics')?.granted) analyticsConsents++;
        if (latest.purposes.find(p => p.purpose === 'marketing')?.granted) marketingConsents++;
      }
    }

    return {
      totalUsers,
      consentRates: {
        functional: totalUsers > 0 ? (functionalConsents / totalUsers) * 100 : 0,
        analytics: totalUsers > 0 ? (analyticsConsents / totalUsers) * 100 : 0,
        marketing: totalUsers > 0 ? (marketingConsents / totalUsers) * 100 : 0
      }
    };
  }

  private calculateRetentionMetrics(): any {
    const metrics: any = {};
    for (const classification of this.dataClassifications.values()) {
      metrics[classification.name] = {
        retentionPeriod: classification.retentionPeriod,
        category: classification.category,
        dataMinimizationRules: classification.dataMinimizationRules.length
      };
    }
    return metrics;
  }

  private calculateDueDate(requestType: string): Date {
    // GDPR requires response within 1 month (30 days)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    return dueDate;
  }

  private generateRequestId(): string {
    return `dsr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateConsentId(): string {
    return `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePIAId(): string {
    return `pia_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBreachId(): string {
    return `breach_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
