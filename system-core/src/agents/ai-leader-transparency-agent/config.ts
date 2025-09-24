/**
 * Transparency Agent Configuration
 */

import { TRANSPARENCY_AGENT_CONFIG } from '../config/default-config';

export class TransparencyAgentConfig {
  public auditing: any;
  public compliance: any;
  public explanation: any;
  public reporting: any;
  public dataUsage: any;

  constructor(config: any = {}) {
    const fullConfig = { ...TRANSPARENCY_AGENT_CONFIG, ...config };
    
    this.auditing = fullConfig.auditing;
    this.compliance = fullConfig.compliance;
    this.explanation = fullConfig.explanation;
    this.reporting = fullConfig.reporting;
    this.dataUsage = fullConfig.dataUsage;
  }
}

export default TransparencyAgentConfig;