/**
 * Governance Agents Main Export
 * Entry point for all governance agents
 */

// Agent classes
export { AccountabilityAgent } from './ai-leader-accountability-agent';
export { EfficiencyAgent } from './ai-leader-efficiency-agent';
export { AILeaderInnovationAgent } from './ai-leader-innovation-agent';
export { QualityAgent } from './ai-leader-quality-agent';
export { TransparencyAgent } from './ai-leader-transparency-agent';

// Base classes and interfaces
export { GovernanceAgent, BaseAgent, type BaseAgentConfig } from './shared/base-agent';

// Bootstrap and configuration
export { bootstrapGovernanceAgents, initializeGovernanceAgent } from './bootstrap';
export * from './config/default-config';

// Agent factory
export class GovernanceAgentFactory {
  /**
   * Create a new accountability agent
   */
  static createAccountabilityAgent(config?: any) {
    const { AccountabilityAgent } = require('./ai-leader-accountability-agent');
    return new AccountabilityAgent(config);
  }

  /**
   * Create a new efficiency agent
   */
  static createEfficiencyAgent(config?: any) {
    const { EfficiencyAgent } = require('./ai-leader-efficiency-agent');
    return new EfficiencyAgent(config);
  }

  /**
   * Create a new innovation agent
   */
  static createInnovationAgent(config?: any) {
    const { AILeaderInnovationAgent } = require('./ai-leader-innovation-agent');
    return new AILeaderInnovationAgent(config);
  }

  /**
   * Create a new quality agent
   */
  static createQualityAgent(config?: any) {
    const { QualityAgent } = require('./ai-leader-quality-agent');
    return new QualityAgent(config);
  }

  /**
   * Create a new transparency agent
   */
  static createTransparencyAgent(config?: any) {
    const { TransparencyAgent } = require('./ai-leader-transparency-agent');
    return new TransparencyAgent(config);
  }
}

export default GovernanceAgentFactory;