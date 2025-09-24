/**
 * Enhanced Governance Agent Base Class
 * Extended base class with LLM Nexus integration
 */

import { GovernanceAgent } from './base-agent';
import {
  ILLMNexusInterface,
  GovernanceLLMRequest,
  LLMNexusResponse,
  GovernanceFeedback,
  createLLMNexusInterfaceFromEnv
} from '../abstractions/governance/llm-nexus';
import { AgentConfig } from './types';

export abstract class EnhancedGovernanceAgent extends GovernanceAgent {
  protected llmNexus?: ILLMNexusInterface;
  private llmNexusEnabled: boolean = true;
  
  constructor(config: AgentConfig) {
    super(config);
  }
  
  /**
   * Initialize the enhanced agent with LLM Nexus integration
   */
  public async initialize(): Promise<void> {
    await super.initialize();
    
    // Initialize LLM Nexus interface
    if (this.llmNexusEnabled) {
      try {
        this.llmNexus = await createLLMNexusInterfaceFromEnv();
        this.logger.info('LLM Nexus interface initialized successfully');
      } catch (error) {
        this.logger.warn('Failed to initialize LLM Nexus interface, disabling integration:', error);
        this.llmNexusEnabled = false;
      }
    }
  }
  
  /**
   * Make an LLM request through the Nexus with governance optimization
   */
  protected async makeLLMRequest(
    prompt: string,
    governanceType: 'efficiency' | 'quality' | 'transparency' | 'accountability' | 'innovation',
    options: {
      priority?: 'low' | 'medium' | 'high' | 'critical';
      maxCost?: number;
      maxLatency?: number;
      minTrustScore?: number;
      requiredCapabilities?: string[];
      context?: Record<string, any>;
    } = {}
  ): Promise<LLMNexusResponse> {
    if (!this.llmNexus || !this.llmNexusEnabled) {
      throw new Error('LLM Nexus not available. Check configuration.');
    }
    
    const request: GovernanceLLMRequest = {
      agentId: this.agentId,
      governanceType,
      prompt,
      context: {
        region: process.env.DEPLOYMENT_REGION || 'US',
        domain: this.agentType,
        userContext: options.context || {},
        sessionId: this.generateSessionId()
      },
      constraints: {
        maxCost: options.maxCost,
        maxLatency: options.maxLatency || 10000, // Default 10 seconds
        minTrustScore: options.minTrustScore || 0.8, // Default high trust
        requiredCapabilities: options.requiredCapabilities || ['reasoning', 'text-analysis']
      },
      priority: options.priority || 'medium'
    };
    
    try {
      const startTime = Date.now();
      const response = await this.llmNexus.routeRequest(request);
      const endTime = Date.now();
      
      // Log the successful request
      this.logger.info(`LLM request completed: ${response.provider}, ${endTime - startTime}ms, $${response.cost.toFixed(4)}`);
      
      return response;
    } catch (error) {
      this.logger.error('LLM request failed:', error);
      throw error;
    }
  }
  
  /**
   * Provide feedback on LLM response quality
   */
  protected async provideLLMFeedback(
    response: LLMNexusResponse,
    feedback: {
      satisfaction: number; // 0-1
      qualityRating: number; // 0-1
      costEffectiveness?: number; // 0-1
      performanceRating?: number; // 0-1
      issues?: string[];
      recommendations?: string;
    }
  ): Promise<void> {
    if (!this.llmNexus || !this.llmNexusEnabled) {
      return; // Silently skip if not available
    }
    
    try {
      const governanceFeedback: GovernanceFeedback = {
        requestId: response.requestId,
        provider: response.provider,
        governanceType: this.getGovernanceType(),
        satisfaction: feedback.satisfaction,
        performanceRating: feedback.performanceRating || this.calculatePerformanceRating(response),
        costEffectiveness: feedback.costEffectiveness || this.calculateCostEffectiveness(response),
        qualityRating: feedback.qualityRating,
        recommendations: feedback.recommendations,
        issues: feedback.issues
      };
      
      await this.llmNexus.submitFeedback(governanceFeedback);
      this.logger.debug('LLM feedback submitted successfully');
    } catch (error) {
      this.logger.warn('Failed to submit LLM feedback:', error);
      // Don't throw - feedback failures shouldn't break the main flow
    }
  }
  
  /**
   * Get LLM Nexus performance metrics for this agent
   */
  protected async getLLMPerformanceMetrics(days: number = 7) {
    if (!this.llmNexus || !this.llmNexusEnabled) {
      return null;
    }
    
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
      
      return await this.llmNexus.getPerformanceMetrics(
        { start: startDate, end: endDate },
        this.getGovernanceType()
      );
    } catch (error) {
      this.logger.warn('Failed to get LLM performance metrics:', error);
      return null;
    }
  }
  
  /**
   * Check LLM Nexus health status
   */
  protected async checkLLMNexusHealth() {
    if (!this.llmNexus || !this.llmNexusEnabled) {
      return { status: 'disabled', details: { reason: 'LLM Nexus not available' } };
    }
    
    try {
      return await this.llmNexus.getHealthStatus();
    } catch (error) {
      this.logger.warn('Failed to check LLM Nexus health:', error);
      return { status: 'unhealthy', details: { error: error instanceof Error ? error.message : 'Unknown error' } };
    }
  }
  
  /**
   * Clean up LLM Nexus resources
   */
  public async shutdown(): Promise<void> {
    if (this.llmNexus) {
      try {
        await this.llmNexus.close();
        this.logger.info('LLM Nexus interface closed');
      } catch (error) {
        this.logger.warn('Error closing LLM Nexus interface:', error);
      }
    }
    
    await super.shutdown();
  }
  
  // Abstract method to be implemented by subclasses
  protected abstract getGovernanceType(): 'efficiency' | 'quality' | 'transparency' | 'accountability' | 'innovation';
  
  // Private helper methods
  
  private generateSessionId(): string {
    return `${this.agentId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private calculatePerformanceRating(response: LLMNexusResponse): number {
    // Base performance on response time and trust score
    const timeScore = Math.max(0, 1 - (response.executionTimeMs / 10000)); // 10 seconds = 0 score
    const trustScore = response.trustScore;
    
    return (timeScore + trustScore) / 2;
  }
  
  private calculateCostEffectiveness(response: LLMNexusResponse): number {
    // Simple cost effectiveness calculation
    // Lower cost = higher effectiveness, but cap at reasonable values
    if (response.cost <= 0) return 1.0;
    if (response.cost >= 0.1) return 0.1; // Very expensive
    
    return Math.max(0.1, 1 - (response.cost * 10));
  }
}

/**
 * Utility functions for LLM Nexus integration
 */
export class LLMNexusUtils {
  /**
   * Build a structured prompt for governance operations
   */
  static buildGovernancePrompt(
    operation: string,
    context: Record<string, any>,
    requirements: string[] = [],
    constraints: string[] = []
  ): string {
    let prompt = `Governance Operation: ${operation}\n\n`;
    
    if (Object.keys(context).length > 0) {
      prompt += `Context:\n${JSON.stringify(context, null, 2)}\n\n`;
    }
    
    if (requirements.length > 0) {
      prompt += `Requirements:\n${requirements.map(req => `- ${req}`).join('\n')}\n\n`;
    }
    
    if (constraints.length > 0) {
      prompt += `Constraints:\n${constraints.map(constraint => `- ${constraint}`).join('\n')}\n\n`;
    }
    
    prompt += `Please provide a comprehensive analysis and recommendations based on the above information.`;
    
    return prompt;
  }
  
  /**
   * Parse structured LLM response
   */
  static parseStructuredResponse<T>(response: string, schema: any): T | null {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                       response.match(/{[\s\S]*}/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonStr);
      }
      
      // If no JSON found, try to parse the entire response
      return JSON.parse(response);
    } catch (error) {
      console.warn('Failed to parse structured response:', error);
      return null;
    }
  }
  
  /**
   * Calculate governance complexity score
   */
  static calculateComplexityScore(
    factors: {
      dataVolume?: number; // 0-1
      decisionImpact?: number; // 0-1
      stakeholderCount?: number; // 0-1
      timeConstraint?: number; // 0-1 (1 = urgent)
      regulatoryComplexity?: number; // 0-1
    }
  ): number {
    const weights = {
      dataVolume: 0.2,
      decisionImpact: 0.3,
      stakeholderCount: 0.2,
      timeConstraint: 0.15,
      regulatoryComplexity: 0.15
    };
    
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const [factor, value] of Object.entries(factors)) {
      if (value !== undefined && factor in weights) {
        totalScore += value * weights[factor as keyof typeof weights];
        totalWeight += weights[factor as keyof typeof weights];
      }
    }
    
    return totalWeight > 0 ? totalScore / totalWeight : 0.5; // Default medium complexity
  }
}