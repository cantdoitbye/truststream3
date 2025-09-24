/**
 * Enhanced Agents Registry
 * Central registry for all enhanced AI agents with local LLM capabilities
 */

import { EnhancedQualityAgent } from './ai-leader-quality-agent/enhanced-index';
import { EnhancedTransparencyAgent } from './ai-leader-transparency-agent/index';
import { EnhancedInnovationAgent } from './ai-leader-innovation-agent/enhanced-index';
import { EnhancedAccountabilityAgent } from './ai-leader-accountability-agent/enhanced-index';
import { EnhancedEfficiencyAgent } from './ai-leader-efficiency-agent/enhanced-index';
import { 
  EnhancedIntelligenceAgent, 
  IntelligenceCapabilities,
  createIntelligenceCapabilities
} from './shared/enhanced-intelligence-agent';

export interface AgentRegistryConfig {
  quality?: any;
  transparency?: any;
  innovation?: any;
  accountability?: any;
  efficiency?: any;
}

export interface EnhancedAgent {
  id: string;
  type: string;
  instance: EnhancedIntelligenceAgent;
  capabilities: IntelligenceCapabilities;
  status: 'initializing' | 'ready' | 'error' | 'shutdown';
  lastHealthCheck?: Date;
  performanceMetrics?: {
    requestsProcessed: number;
    averageResponseTime: number;
    successRate: number;
    aiProviderDistribution: Record<string, number>;
  };
}

export class EnhancedAgentsRegistry {
  private agents: Map<string, EnhancedAgent>;
  private initialized: boolean = false;
  private healthCheckInterval?: NodeJS.Timeout;
  
  constructor() {
    this.agents = new Map();
  }
  
  /**
   * Initialize all enhanced agents
   */
  public async initializeAgents(config: AgentRegistryConfig = {}): Promise<void> {
    try {
      console.log('Initializing Enhanced AI Agents Registry...');
      
      // Initialize Quality Agent
      await this.initializeAgent(
        'quality',
        () => new EnhancedQualityAgent(config.quality || {}),
        createIntelligenceCapabilities({
          analysis: {
            dataInterpretation: true,
            trendAnalysis: true,
            riskAssessment: true,
            impactEvaluation: true
          }
        })
      );
      
      // Initialize Transparency Agent
      await this.initializeAgent(
        'transparency',
        () => new EnhancedTransparencyAgent(config.transparency || {}),
        createIntelligenceCapabilities({
          reasoning: {
            causalAnalysis: true,
            logicalDeduction: true,
            probabilisticReasoning: true,
            counterargumentGeneration: true
          }
        })
      );
      
      // Initialize Innovation Agent
      await this.initializeAgent(
        'innovation',
        () => new EnhancedInnovationAgent(config.innovation || {}),
        createIntelligenceCapabilities({
          creativity: {
            solutionGeneration: true,
            alternativeApproaches: true,
            innovativeThinking: true,
            strategicPlanning: true
          }
        })
      );
      
      // Initialize Accountability Agent
      await this.initializeAgent(
        'accountability',
        () => new EnhancedAccountabilityAgent(config.accountability || {}),
        createIntelligenceCapabilities({
          reasoning: {
            causalAnalysis: true,
            logicalDeduction: true,
            probabilisticReasoning: true,
            counterargumentGeneration: true
          }
        })
      );
      
      // Initialize Efficiency Agent
      await this.initializeAgent(
        'efficiency',
        () => new EnhancedEfficiencyAgent(config.efficiency || {}),
        createIntelligenceCapabilities({
          analysis: {
            dataInterpretation: true,
            trendAnalysis: true,
            riskAssessment: true,
            impactEvaluation: true
          },
          learning: {
            patternRecognition: true,
            adaptiveDecisionMaking: true,
            contextualMemory: true,
            feedbackIntegration: true
          }
        })
      );
      
      this.initialized = true;
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      console.log(`Enhanced AI Agents Registry initialized with ${this.agents.size} agents`);
    } catch (error) {
      console.error('Failed to initialize enhanced agents registry:', error);
      throw error;
    }
  }
  
  /**
   * Get an agent by type
   */
  public getAgent(type: string): EnhancedAgent | undefined {
    return this.agents.get(type);
  }
  
  /**
   * Get all agents
   */
  public getAllAgents(): EnhancedAgent[] {
    return Array.from(this.agents.values());
  }
  
  /**
   * Get agents by status
   */
  public getAgentsByStatus(status: EnhancedAgent['status']): EnhancedAgent[] {
    return Array.from(this.agents.values()).filter(agent => agent.status === status);
  }
  
  /**
   * Get registry health status
   */
  public getHealthStatus(): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    agents: Record<string, any>;
    summary: {
      total: number;
      ready: number;
      error: number;
      initializing: number;
    };
  } {
    const agents = Array.from(this.agents.values());
    const summary = {
      total: agents.length,
      ready: agents.filter(a => a.status === 'ready').length,
      error: agents.filter(a => a.status === 'error').length,
      initializing: agents.filter(a => a.status === 'initializing').length
    };
    
    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (summary.ready === summary.total) {
      overall = 'healthy';
    } else if (summary.ready > summary.total / 2) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }
    
    const agentStatus: Record<string, any> = {};
    for (const [type, agent] of this.agents) {
      agentStatus[type] = {
        status: agent.status,
        lastHealthCheck: agent.lastHealthCheck,
        performanceMetrics: agent.performanceMetrics
      };
    }
    
    return {
      overall,
      agents: agentStatus,
      summary
    };
  }
  
  /**
   * Get performance metrics for all agents
   */
  public getPerformanceMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};
    
    for (const [type, agent] of this.agents) {
      if (agent.performanceMetrics) {
        metrics[type] = {
          ...agent.performanceMetrics,
          status: agent.status,
          lastUpdate: agent.lastHealthCheck
        };
      }
    }
    
    return metrics;
  }
  
  /**
   * Execute a function on a specific agent
   */
  public async executeOnAgent<T>(
    agentType: string, 
    operation: (agent: EnhancedIntelligenceAgent) => Promise<T>
  ): Promise<T> {
    const agent = this.agents.get(agentType);
    if (!agent) {
      throw new Error(`Agent of type '${agentType}' not found`);
    }
    
    if (agent.status !== 'ready') {
      throw new Error(`Agent '${agentType}' is not ready (status: ${agent.status})`);
    }
    
    const startTime = Date.now();
    try {
      const result = await operation(agent.instance);
      
      // Update performance metrics
      this.updatePerformanceMetrics(agentType, startTime, true);
      
      return result;
    } catch (error) {
      this.updatePerformanceMetrics(agentType, startTime, false);
      throw error;
    }
  }
  
  /**
   * Shutdown all agents
   */
  public async shutdown(): Promise<void> {
    console.log('Shutting down Enhanced AI Agents Registry...');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    const shutdownPromises = Array.from(this.agents.values()).map(async (agent) => {
      try {
        await agent.instance.shutdown();
        agent.status = 'shutdown';
      } catch (error) {
        console.error(`Failed to shutdown agent ${agent.id}:`, error);
      }
    });
    
    await Promise.all(shutdownPromises);
    this.initialized = false;
    
    console.log('Enhanced AI Agents Registry shut down successfully');
  }
  
  // Private helper methods
  
  private async initializeAgent(
    type: string,
    agentFactory: () => EnhancedIntelligenceAgent,
    capabilities: IntelligenceCapabilities
  ): Promise<void> {
    try {
      console.log(`Initializing ${type} agent...`);
      
      const instance = agentFactory();
      const agent: EnhancedAgent = {
        id: `enhanced-${type}-agent`,
        type,
        instance,
        capabilities,
        status: 'initializing',
        performanceMetrics: {
          requestsProcessed: 0,
          averageResponseTime: 0,
          successRate: 1.0,
          aiProviderDistribution: {}
        }
      };
      
      this.agents.set(type, agent);
      
      // Initialize the agent
      await instance.initialize();
      agent.status = 'ready';
      agent.lastHealthCheck = new Date();
      
      console.log(`${type} agent initialized successfully`);
    } catch (error) {
      console.error(`Failed to initialize ${type} agent:`, error);
      
      // Set error status if agent exists
      const agent = this.agents.get(type);
      if (agent) {
        agent.status = 'error';
      }
      
      throw error;
    }
  }
  
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, 60000); // Check every minute
  }
  
  private async performHealthChecks(): Promise<void> {
    for (const [type, agent] of this.agents) {
      try {
        if (agent.status === 'ready') {
          // Perform health check (this could be extended to call agent-specific health methods)
          agent.lastHealthCheck = new Date();
        }
      } catch (error) {
        console.error(`Health check failed for ${type} agent:`, error);
        agent.status = 'error';
      }
    }
  }
  
  private updatePerformanceMetrics(
    agentType: string, 
    startTime: number, 
    success: boolean
  ): void {
    const agent = this.agents.get(agentType);
    if (!agent || !agent.performanceMetrics) return;
    
    const responseTime = Date.now() - startTime;
    const metrics = agent.performanceMetrics;
    
    // Update request count
    metrics.requestsProcessed++;
    
    // Update average response time
    metrics.averageResponseTime = (
      (metrics.averageResponseTime * (metrics.requestsProcessed - 1)) + responseTime
    ) / metrics.requestsProcessed;
    
    // Update success rate
    const previousSuccessCount = Math.round(metrics.successRate * (metrics.requestsProcessed - 1));
    const newSuccessCount = previousSuccessCount + (success ? 1 : 0);
    metrics.successRate = newSuccessCount / metrics.requestsProcessed;
  }
}

// Create a singleton instance
export const enhancedAgentsRegistry = new EnhancedAgentsRegistry();

// Export agent classes for direct use
export {
  EnhancedQualityAgent,
  EnhancedTransparencyAgent,
  EnhancedInnovationAgent,
  EnhancedAccountabilityAgent,
  EnhancedEfficiencyAgent
};

// Default export
export default enhancedAgentsRegistry;