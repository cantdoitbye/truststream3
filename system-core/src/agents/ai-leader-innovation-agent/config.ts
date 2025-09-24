/**
 * Innovation Agent Configuration
 */

import { INNOVATION_AGENT_CONFIG } from '../config/default-config';

export class InnovationAgentConfig {
  public innovation: any;
  public research: any;

  constructor(config: any = {}) {
    const fullConfig = { ...INNOVATION_AGENT_CONFIG, ...config };
    
    this.innovation = fullConfig.innovation;
    this.research = fullConfig.research;
  }
}

export default InnovationAgentConfig;