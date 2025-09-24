/**
 * Accountability Agent Configuration
 */

import { ACCOUNTABILITY_AGENT_CONFIG } from '../config/default-config';

export class AccountabilityAgentConfig {
  public ethics: any;
  public accountability: any;
  public bias: any;
  public escalation: any;
  public reporting: any;
  public auditing: any;

  constructor(config: any = {}) {
    const fullConfig = { ...ACCOUNTABILITY_AGENT_CONFIG, ...config };
    
    this.ethics = fullConfig.ethics;
    this.accountability = fullConfig.accountability;
    this.bias = fullConfig.bias;
    this.escalation = fullConfig.escalation;
    this.reporting = fullConfig.reporting;
    this.auditing = fullConfig.auditing;
  }
}

export default AccountabilityAgentConfig;