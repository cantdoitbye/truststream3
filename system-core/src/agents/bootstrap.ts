/**
 * Agent Bootstrap and Service Registration
 * Configures the dependency injection container for all governance agents
 */

import { getContainer, SERVICE_TOKENS } from '../shared-utils/service-container';
import { createGovernanceDatabaseFromEnv, IGovernanceDatabase } from '../abstractions/governance';

/**
 * Bootstrap the governance agent system
 */
export async function bootstrapGovernanceAgents(): Promise<void> {
  const container = getContainer();
  
  try {
    // Register governance database
    container.registerSingleton(
      SERVICE_TOKENS.GOVERNANCE_DATABASE,
      async () => {
        const database = await createGovernanceDatabaseFromEnv();
        return database;
      }
    );
    
    // Register configuration service
    container.registerSingleton(
      SERVICE_TOKENS.CONFIG,
      () => {
        return {
          get: (key: string, defaultValue?: any) => {
            return process.env[key] || defaultValue;
          },
          set: (key: string, value: any) => {
            process.env[key] = String(value);
          },
          has: (key: string) => {
            return key in process.env;
          }
        };
      }
    );
    
    console.log('Governance agents bootstrap completed successfully');
  } catch (error) {
    console.error('Failed to bootstrap governance agents:', error);
    throw error;
  }
}

/**
 * Initialize a specific governance agent with proper dependencies
 */
export async function initializeGovernanceAgent<T>(AgentClass: new (config: any) => T, config: any): Promise<T> {
  // Ensure services are bootstrapped
  await bootstrapGovernanceAgents();
  
  // Create and initialize agent
  const agent = new AgentClass(config);
  
  if (typeof (agent as any).initialize === 'function') {
    await (agent as any).initialize();
  }
  
  return agent;
}

export default bootstrapGovernanceAgents;