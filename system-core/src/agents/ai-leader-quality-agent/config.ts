/**
 * Quality Agent Configuration
 */

import { QUALITY_AGENT_CONFIG } from '../config/default-config';

export interface QualityConfigSection {
  monitoring?: any;
  thresholds?: any;
  compliance?: any;
  analysis?: any;
  improvements?: any;
  retention?: any;
  reporting?: any;
  enforcement?: any;
  benchmarking?: any;
}

export class QualityAgentConfig {
  public monitoring: any;
  public thresholds: any;
  public compliance: any;
  public analysis: any;
  public improvements: any;
  public retention: any;
  public reporting: any;
  public enforcement: any;
  public benchmarking: any;

  constructor(config: QualityConfigSection = {}) {
    try {
      const fullConfig = this.mergeWithDefaults(config);
      
      this.monitoring = this.validateAndSet(fullConfig.monitoring, 'monitoring');
      this.thresholds = this.validateAndSet(fullConfig.thresholds, 'thresholds');
      this.compliance = this.validateAndSet(fullConfig.compliance, 'compliance');
      this.analysis = this.validateAndSet(fullConfig.analysis, 'analysis');
      this.improvements = this.validateAndSet(fullConfig.improvements, 'improvements');
      this.retention = this.validateAndSet(fullConfig.retention, 'retention');
      this.reporting = this.validateAndSet(fullConfig.reporting, 'reporting');
      this.enforcement = this.validateAndSet(fullConfig.enforcement, 'enforcement');
      this.benchmarking = this.validateAndSet(fullConfig.benchmarking, 'benchmarking');
    } catch (error) {
      console.error('Error initializing QualityAgentConfig, using defaults:', error);
      this.initializeDefaults();
    }
  }

  private mergeWithDefaults(config: QualityConfigSection): any {
    try {
      return { 
        ...QUALITY_AGENT_CONFIG, 
        ...config,
        // Ensure nested objects are properly merged
        monitoring: { ...QUALITY_AGENT_CONFIG.monitoring, ...(config.monitoring || {}) },
        thresholds: { ...QUALITY_AGENT_CONFIG.thresholds, ...(config.thresholds || {}) },
        compliance: { ...QUALITY_AGENT_CONFIG.compliance, ...(config.compliance || {}) },
        analysis: { ...QUALITY_AGENT_CONFIG.analysis, ...(config.analysis || {}) },
        improvements: { ...QUALITY_AGENT_CONFIG.improvements, ...(config.improvements || {}) },
        retention: { ...QUALITY_AGENT_CONFIG.retention, ...(config.retention || {}) },
        reporting: { ...QUALITY_AGENT_CONFIG.reporting, ...(config.reporting || {}) },
        enforcement: { ...QUALITY_AGENT_CONFIG.enforcement, ...(config.enforcement || {}) },
        benchmarking: { ...QUALITY_AGENT_CONFIG.benchmarking, ...(config.benchmarking || {}) }
      };
    } catch (error) {
      console.error('Error merging config with defaults:', error);
      return QUALITY_AGENT_CONFIG;
    }
  }

  private validateAndSet(value: any, sectionName: string): any {
    if (!value || typeof value !== 'object') {
      console.warn(`Invalid ${sectionName} config, using default`);
      return QUALITY_AGENT_CONFIG[sectionName] || {};
    }
    return value;
  }

  private initializeDefaults(): void {
    this.monitoring = QUALITY_AGENT_CONFIG.monitoring || {};
    this.thresholds = QUALITY_AGENT_CONFIG.thresholds || {};
    this.compliance = QUALITY_AGENT_CONFIG.compliance || {};
    this.analysis = QUALITY_AGENT_CONFIG.analysis || {};
    this.improvements = QUALITY_AGENT_CONFIG.improvements || {};
    this.retention = QUALITY_AGENT_CONFIG.retention || {};
    this.reporting = QUALITY_AGENT_CONFIG.reporting || {};
    this.enforcement = QUALITY_AGENT_CONFIG.enforcement || {};
    this.benchmarking = QUALITY_AGENT_CONFIG.benchmarking || {};
  }

  // Safe property accessors with fallbacks
  public getMonitoringInterval(): number {
    return this.monitoring?.interval || 30000;
  }

  public getMaxResponseTime(): number {
    return this.monitoring?.maxResponseTime || 5000;
  }

  public getComplianceAuditPeriod(): number {
    return this.compliance?.auditPeriod || (7 * 24 * 60 * 60 * 1000);
  }

  public getComplianceHistoryRetention(): number {
    return this.retention?.complianceHistoryRetention || (30 * 24 * 60 * 60 * 1000);
  }

  public getReportingPeriod(): number {
    return this.reporting?.period || (24 * 60 * 60 * 1000);
  }

  public getTrendWindow(): number {
    return this.analysis?.trendWindow || (24 * 60 * 60 * 1000);
  }

  public getDeviationWindow(): number {
    return this.analysis?.deviationWindow || 50;
  }

  public getMaxRecommendations(): number {
    return this.improvements?.maxRecommendations || 10;
  }

  // Validation methods
  public validateConfig(): boolean {
    try {
      const required = ['monitoring', 'thresholds', 'compliance', 'analysis', 'improvements'];
      for (const section of required) {
        if (!this[section] || typeof this[section] !== 'object') {
          console.error(`Missing or invalid required config section: ${section}`);
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Error validating config:', error);
      return false;
    }
  }
}

export default QualityAgentConfig;