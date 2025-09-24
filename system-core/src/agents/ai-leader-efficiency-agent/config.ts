/**
 * Efficiency Agent Configuration
 */

import { EFFICIENCY_AGENT_CONFIG } from '../config/default-config';

export class EfficiencyAgentConfig {
  public monitoring: any;
  public analysis: any;
  public retention: any;
  public reporting: any;
  public improvements: any;

  constructor(config: any = {}) {
    const fullConfig = { ...EFFICIENCY_AGENT_CONFIG, ...config };
    
    this.monitoring = fullConfig.monitoring;
    this.analysis = fullConfig.analysis;
    this.retention = fullConfig.retention;
    this.reporting = fullConfig.reporting;
    this.improvements = fullConfig.improvements;
  }
}

export default EfficiencyAgentConfig;