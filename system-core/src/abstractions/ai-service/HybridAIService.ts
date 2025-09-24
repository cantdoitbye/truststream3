/**
 * Hybrid AI Service
 * Intelligent routing between local and external LLM providers
 */

import { ILocalLLMInterface, LocalLLMRequest, LocalLLMResponse, createLocalLLMInterfaceFromEnv } from './LocalLLMInterface';
import { 
  ILLMNexusInterface, 
  GovernanceLLMRequest, 
  LLMNexusResponse,
  createLLMNexusInterfaceFromEnv 
} from '../governance/llm-nexus';

export interface HybridAIConfig {
  preferLocal: boolean;
  localFallback: boolean;
  externalFallback: boolean;
  performanceThresholds: {
    maxLocalLatency: number;
    minLocalConfidence: number;
    maxExternalCost: number;
  };
  routingRules: {
    sensitiveData: 'local' | 'external' | 'both';
    complexTasks: 'local' | 'external' | 'both';
    realTimeRequests: 'local' | 'external' | 'both';
  };
}

export interface HybridAIRequest {
  prompt: string;
  context: {
    agentType: string;
    governanceType: 'efficiency' | 'quality' | 'transparency' | 'accountability' | 'innovation';
    priority: 'low' | 'medium' | 'high' | 'critical';
    sessionId: string;
    sensitiveData?: boolean;
    realTime?: boolean;
    complexity?: 'low' | 'medium' | 'high';
  };
  preferences?: {
    preferLocal?: boolean;
    maxCost?: number;
    maxLatency?: number;
    minConfidence?: number;
    requiredCapabilities?: string[];
  };
}

export interface HybridAIResponse {
  response: string;
  provider: 'local' | 'external';
  model: string;
  executionTimeMs: number;
  cost: number;
  confidence: number;
  reasoning?: string;
  metadata: {
    routingDecision: {
      reason: string;
      factors: Record<string, any>;
    };
    fallbackUsed?: boolean;
    originalProvider?: 'local' | 'external';
  };
}

export class HybridAIService {
  private localLLM?: ILocalLLMInterface;
  private externalLLM?: ILLMNexusInterface;
  private config: HybridAIConfig;
  private initialized = false;

  constructor(config?: Partial<HybridAIConfig>) {
    this.config = {
      preferLocal: true,
      localFallback: true,
      externalFallback: true,
      performanceThresholds: {
        maxLocalLatency: 15000,
        minLocalConfidence: 0.7,
        maxExternalCost: 0.1
      },
      routingRules: {
        sensitiveData: 'local',
        complexTasks: 'both',
        realTimeRequests: 'local'
      },
      ...config
    };
  }

  async initialize(): Promise<void> {
    try {
      // Initialize local LLM
      this.localLLM = await createLocalLLMInterfaceFromEnv();
      console.log('Local LLM interface initialized successfully');
    } catch (error) {
      console.warn('Failed to initialize local LLM interface:', error);
      if (!this.config.externalFallback) {
        throw new Error('Local LLM required but initialization failed');
      }
    }

    try {
      // Initialize external LLM
      this.externalLLM = await createLLMNexusInterfaceFromEnv();
      console.log('External LLM interface initialized successfully');
    } catch (error) {
      console.warn('Failed to initialize external LLM interface:', error);
      if (!this.config.localFallback) {
        throw new Error('External LLM required but initialization failed');
      }
    }

    if (!this.localLLM && !this.externalLLM) {
      throw new Error('No LLM interfaces available');
    }

    this.initialized = true;
  }

  async generateResponse(request: HybridAIRequest): Promise<HybridAIResponse> {
    this.ensureInitialized();
    
    // Determine optimal routing
    const routingDecision = this.determineRouting(request);
    
    try {
      if (routingDecision.provider === 'local' && this.localLLM) {
        return await this.generateLocalResponse(request, routingDecision);
      } else if (routingDecision.provider === 'external' && this.externalLLM) {
        return await this.generateExternalResponse(request, routingDecision);
      } else {
        throw new Error(`Preferred provider ${routingDecision.provider} not available`);
      }
    } catch (error) {
      console.warn(`Primary provider ${routingDecision.provider} failed:`, error);
      
      // Attempt fallback
      if (routingDecision.provider === 'local' && this.config.externalFallback && this.externalLLM) {
        console.log('Falling back to external LLM');
        const fallbackDecision = { ...routingDecision, provider: 'external' as const };
        const response = await this.generateExternalResponse(request, fallbackDecision);
        response.metadata.fallbackUsed = true;
        response.metadata.originalProvider = 'local';
        return response;
      } else if (routingDecision.provider === 'external' && this.config.localFallback && this.localLLM) {
        console.log('Falling back to local LLM');
        const fallbackDecision = { ...routingDecision, provider: 'local' as const };
        const response = await this.generateLocalResponse(request, fallbackDecision);
        response.metadata.fallbackUsed = true;
        response.metadata.originalProvider = 'external';
        return response;
      }
      
      throw error;
    }
  }

  async getHealthStatus(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    local: any;
    external: any;
  }> {
    const localHealth = this.localLLM ? await this.localLLM.getHealthStatus() : { status: 'unavailable' };
    const externalHealth = this.externalLLM ? await this.externalLLM.getHealthStatus() : { status: 'unavailable' };
    
    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (localHealth.status === 'healthy' || externalHealth.status === 'healthy') {
      overall = 'healthy';
    } else if (localHealth.status === 'degraded' || externalHealth.status === 'degraded') {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }
    
    return {
      overall,
      local: localHealth,
      external: externalHealth
    };
  }

  async shutdown(): Promise<void> {
    if (this.localLLM) {
      await this.localLLM.shutdown();
    }
    if (this.externalLLM) {
      await this.externalLLM.close();
    }
    this.initialized = false;
  }

  private determineRouting(request: HybridAIRequest): {
    provider: 'local' | 'external';
    reason: string;
    factors: Record<string, any>;
  } {
    const factors: Record<string, any> = {};
    let score = 0;
    
    // Preference factor
    if (request.preferences?.preferLocal !== undefined) {
      factors.userPreference = request.preferences.preferLocal ? 'local' : 'external';
      score += request.preferences.preferLocal ? 10 : -10;
    } else {
      factors.configPreference = this.config.preferLocal ? 'local' : 'external';
      score += this.config.preferLocal ? 5 : -5;
    }
    
    // Sensitive data factor
    if (request.context.sensitiveData) {
      factors.sensitiveData = this.config.routingRules.sensitiveData;
      if (this.config.routingRules.sensitiveData === 'local') score += 15;
      else if (this.config.routingRules.sensitiveData === 'external') score -= 15;
    }
    
    // Real-time factor
    if (request.context.realTime) {
      factors.realTime = this.config.routingRules.realTimeRequests;
      if (this.config.routingRules.realTimeRequests === 'local') score += 10;
      else if (this.config.routingRules.realTimeRequests === 'external') score -= 10;
    }
    
    // Complexity factor
    if (request.context.complexity) {
      factors.complexity = request.context.complexity;
      if (request.context.complexity === 'high') {
        score += this.config.routingRules.complexTasks === 'external' ? -8 : 0;
      }
    }
    
    // Cost factor
    if (request.preferences?.maxCost !== undefined) {
      factors.costConstraint = request.preferences.maxCost;
      if (request.preferences.maxCost < 0.01) score += 8; // Very low cost = prefer local
    }
    
    // Latency factor
    if (request.preferences?.maxLatency !== undefined) {
      factors.latencyConstraint = request.preferences.maxLatency;
      if (request.preferences.maxLatency < 5000) score += 5; // Low latency = prefer local
    }
    
    // Priority factor
    factors.priority = request.context.priority;
    if (request.context.priority === 'critical') {
      score += 3; // Critical = prefer local for independence
    }
    
    const provider = score >= 0 ? 'local' : 'external';
    const reason = this.generateRoutingReason(score, factors);
    
    return { provider, reason, factors };
  }

  private generateRoutingReason(score: number, factors: Record<string, any>): string {
    const reasons = [];
    
    if (factors.sensitiveData === 'local') {
      reasons.push('sensitive data requires local processing');
    }
    if (factors.realTime === 'local') {
      reasons.push('real-time requirement favors local LLM');
    }
    if (factors.costConstraint && factors.costConstraint < 0.01) {
      reasons.push('cost constraint favors local processing');
    }
    if (factors.latencyConstraint && factors.latencyConstraint < 5000) {
      reasons.push('latency requirement favors local processing');
    }
    if (factors.complexity === 'high') {
      reasons.push('high complexity may benefit from external LLM');
    }
    
    if (reasons.length === 0) {
      return score >= 0 ? 'default preference for local processing' : 'default preference for external processing';
    }
    
    return reasons.join(', ');
  }

  private async generateLocalResponse(
    request: HybridAIRequest,
    routingDecision: any
  ): Promise<HybridAIResponse> {
    const localRequest: LocalLLMRequest = {
      prompt: request.prompt,
      context: {
        agentType: request.context.agentType,
        governanceType: request.context.governanceType,
        priority: request.context.priority,
        sessionId: request.context.sessionId
      },
      maxTokens: 2048,
      temperature: 0.7
    };
    
    const response = await this.localLLM!.generateResponse(localRequest);
    
    return {
      response: response.response,
      provider: 'local',
      model: response.model,
      executionTimeMs: response.executionTimeMs,
      cost: 0, // Local processing is free
      confidence: response.confidence,
      reasoning: response.reasoning,
      metadata: {
        routingDecision: {
          reason: routingDecision.reason,
          factors: routingDecision.factors
        }
      }
    };
  }

  private async generateExternalResponse(
    request: HybridAIRequest,
    routingDecision: any
  ): Promise<HybridAIResponse> {
    const externalRequest: GovernanceLLMRequest = {
      agentId: request.context.agentType,
      governanceType: request.context.governanceType,
      prompt: request.prompt,
      context: {
        region: 'US',
        domain: request.context.agentType,
        userContext: {},
        sessionId: request.context.sessionId
      },
      constraints: {
        maxCost: request.preferences?.maxCost,
        maxLatency: request.preferences?.maxLatency || 10000,
        minTrustScore: 0.8,
        requiredCapabilities: request.preferences?.requiredCapabilities || ['reasoning', 'text-analysis']
      },
      priority: request.context.priority
    };
    
    const response = await this.externalLLM!.routeRequest(externalRequest);
    
    return {
      response: response.response,
      provider: 'external',
      model: response.provider,
      executionTimeMs: response.executionTimeMs,
      cost: response.cost,
      confidence: response.trustScore,
      metadata: {
        routingDecision: {
          reason: routingDecision.reason,
          factors: routingDecision.factors
        }
      }
    };
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Hybrid AI Service not initialized');
    }
  }
}

/**
 * Factory function to create and initialize hybrid AI service
 */
export async function createHybridAIService(config?: Partial<HybridAIConfig>): Promise<HybridAIService> {
  const service = new HybridAIService(config);
  await service.initialize();
  return service;
}