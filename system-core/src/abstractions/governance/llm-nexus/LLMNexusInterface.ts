/**
 * LLM Nexus Interface Implementation
 * Concrete implementation of the LLM Nexus interface for governance agents
 */

import {
  ILLMNexusInterface,
  LLMNexusConfig,
  GovernanceLLMRequest,
  LLMNexusResponse,
  ProviderCriteria,
  ProviderRecommendation,
  GovernanceFeedback,
  PerformanceMetrics,
  TimeRange,
  HTTPClient,
  HTTPResponse,
  HTTPClientConfig
} from './interfaces';

/**
 * Simple HTTP Client implementation
 */
class SimpleHTTPClient implements HTTPClient {
  private config: HTTPClientConfig;
  
  constructor(config: HTTPClientConfig) {
    this.config = config;
  }
  
  async get<T>(url: string, headers?: Record<string, string>): Promise<HTTPResponse<T>> {
    return this.makeRequest('GET', url, undefined, headers);
  }
  
  async post<T>(url: string, data: any, headers?: Record<string, string>): Promise<HTTPResponse<T>> {
    return this.makeRequest('POST', url, data, headers);
  }
  
  async put<T>(url: string, data: any, headers?: Record<string, string>): Promise<HTTPResponse<T>> {
    return this.makeRequest('PUT', url, data, headers);
  }
  
  async delete<T>(url: string, headers?: Record<string, string>): Promise<HTTPResponse<T>> {
    return this.makeRequest('DELETE', url, undefined, headers);
  }
  
  private async makeRequest<T>(
    method: string,
    url: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<HTTPResponse<T>> {
    const fullUrl = url.startsWith('http') ? url : `${this.config.baseUrl}${url}`;
    const requestHeaders = { ...this.config.defaultHeaders, ...headers };
    
    const options: RequestInit = {
      method,
      headers: requestHeaders,
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }
    
    let attempt = 0;
    const maxAttempts = this.config.retryAttempts || 3;
    
    while (attempt < maxAttempts) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout || 30000);
        
        options.signal = controller.signal;
        
        const response = await fetch(fullUrl, options);
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const responseData = await response.json();
        
        return {
          data: responseData,
          status: response.status,
          headers: Object.fromEntries(response.headers.entries())
        };
      } catch (error) {
        attempt++;
        if (attempt >= maxAttempts) {
          throw error;
        }
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('Max retry attempts exceeded');
  }
}

/**
 * Main LLM Nexus Interface implementation
 */
export class LLMNexusInterface implements ILLMNexusInterface {
  private config?: LLMNexusConfig;
  private httpClient?: HTTPClient;
  private initialized = false;
  
  async initialize(config: LLMNexusConfig): Promise<void> {
    this.config = config;
    
    this.httpClient = new SimpleHTTPClient({
      baseUrl: config.supabaseUrl,
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      defaultHeaders: {
        'Authorization': `Bearer ${config.serviceKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'TrustStream-Governance-Agent/1.0'
      }
    });
    
    // Test connection
    await this.getHealthStatus();
    
    this.initialized = true;
  }
  
  async routeRequest(request: GovernanceLLMRequest): Promise<LLMNexusResponse> {
    this.ensureInitialized();
    
    try {
      const requestPayload = {
        prompt: request.prompt,
        userRegion: request.context.region || 'US',
        trustScoreRequirement: request.constraints.minTrustScore || 0.8,
        maxCost: request.constraints.maxCost || -1,
        preferredCapabilities: request.constraints.requiredCapabilities || [],
        governanceContext: {
          agentId: request.agentId,
          governanceType: request.governanceType,
          priority: request.priority,
          sessionId: request.context.sessionId,
          domain: request.context.domain
        }
      };
      
      const response = await this.httpClient!.post<{
        data: {
          response: string;
          provider: string;
          executionTimeMs: number;
          cost: number;
          trustScore: number;
          promptAnalysis: any;
          scoringDetails: any[];
        }
      }>('/functions/v1/llm-nexus-v4-router', requestPayload);
      
      // Log the request for performance tracking
      await this.logGovernanceRequest(request, response.data.data);
      
      return {
        requestId: this.generateRequestId(),
        response: response.data.data.response,
        provider: response.data.data.provider,
        executionTimeMs: response.data.data.executionTimeMs,
        cost: response.data.data.cost,
        trustScore: response.data.data.trustScore,
        promptAnalysis: response.data.data.promptAnalysis,
        scoringDetails: response.data.data.scoringDetails
      };
    } catch (error) {
      console.error('LLM Nexus routing error:', error);
      throw new Error(`Failed to route governance request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async getProviderRecommendations(criteria: ProviderCriteria): Promise<ProviderRecommendation[]> {
    this.ensureInitialized();
    
    try {
      // Query enhanced provider scoring view
      const response = await this.httpClient!.get<any[]>(
        `/rest/v1/governance_enhanced_provider_scores?` +
        `order=enhanced_governance_score.desc&` +
        `limit=10`
      );
      
      return response.data.map(provider => ({
        provider: provider.provider_name,
        model: provider.model_name,
        score: provider.enhanced_governance_score,
        reasoning: this.generateRecommendationReasoning(provider, criteria),
        estimatedCost: this.estimateRequestCost(provider, criteria),
        estimatedLatency: provider.governance_response_time_avg,
        trustScore: provider.trust_score_weighting
      }));
    } catch (error) {
      console.error('Failed to get provider recommendations:', error);
      throw error;
    }
  }
  
  async submitFeedback(feedback: GovernanceFeedback): Promise<void> {
    this.ensureInitialized();
    
    try {
      const feedbackRecord = {
        provider_name: feedback.provider?.split(':')[0] || 'unknown',
        model_name: feedback.provider?.split(':')[1] || 'unknown',
        governance_type: feedback.governanceType,
        feedback_type: 'comprehensive',
        rating: (feedback.satisfaction + feedback.performanceRating + 
                feedback.costEffectiveness + feedback.qualityRating) / 4,
        feedback_data: {
          satisfaction: feedback.satisfaction,
          performanceRating: feedback.performanceRating,
          costEffectiveness: feedback.costEffectiveness,
          qualityRating: feedback.qualityRating,
          recommendations: feedback.recommendations,
          issues: feedback.issues,
          requestId: feedback.requestId
        },
        submitted_by: 'governance-system'
      };
      
      await this.httpClient!.post('/rest/v1/governance_provider_feedback', feedbackRecord);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      // Don't throw - feedback submission shouldn't break the main flow
    }
  }
  
  async getPerformanceMetrics(timeRange: TimeRange, governanceType?: string): Promise<PerformanceMetrics> {
    this.ensureInitialized();
    
    try {
      let query = `/rest/v1/governance_llm_performance?` +
        `request_timestamp=gte.${timeRange.start.toISOString()}&` +
        `request_timestamp=lte.${timeRange.end.toISOString()}`;
      
      if (governanceType) {
        query += `&governance_type=eq.${governanceType}`;
      }
      
      const response = await this.httpClient!.get<any[]>(query);
      const records = response.data;
      
      if (records.length === 0) {
        return this.getEmptyMetrics();
      }
      
      const totalRequests = records.length;
      const successfulRequests = records.filter(r => r.quality_score > 0).length;
      
      return {
        averageResponseTime: records.reduce((sum, r) => sum + r.response_time_ms, 0) / totalRequests,
        successRate: successfulRequests / totalRequests,
        errorRate: (totalRequests - successfulRequests) / totalRequests,
        averageCost: records.reduce((sum, r) => sum + r.cost_actual, 0) / totalRequests,
        averageQualityScore: records
          .filter(r => r.quality_score > 0)
          .reduce((sum, r) => sum + r.quality_score, 0) / successfulRequests || 0,
        totalRequests,
        providerDistribution: this.calculateProviderDistribution(records)
      };
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      return this.getEmptyMetrics();
    }
  }
  
  async getHealthStatus(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details: any }> {
    try {
      // Test basic connectivity
      const healthResponse = await this.httpClient!.get('/rest/v1/llm_providers_v4?limit=1');
      
      if (healthResponse.status === 200) {
        return {
          status: 'healthy',
          details: {
            connectivity: 'ok',
            timestamp: new Date().toISOString()
          }
        };
      } else {
        return {
          status: 'degraded',
          details: {
            connectivity: 'limited',
            httpStatus: healthResponse.status,
            timestamp: new Date().toISOString()
          }
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          connectivity: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }
  
  async close(): Promise<void> {
    this.initialized = false;
    this.httpClient = undefined;
    this.config = undefined;
  }
  
  // Private helper methods
  
  private ensureInitialized(): void {
    if (!this.initialized || !this.httpClient) {
      throw new Error('LLM Nexus interface not initialized. Call initialize() first.');
    }
  }
  
  private generateRequestId(): string {
    return `gov-req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private async logGovernanceRequest(request: GovernanceLLMRequest, response: any): Promise<void> {
    try {
      const logRecord = {
        agent_id: request.agentId,
        governance_type: request.governanceType,
        provider_name: response.provider.split(':')[0],
        model_name: response.provider.split(':')[1],
        request_timestamp: new Date().toISOString(),
        response_time_ms: response.executionTimeMs,
        cost_actual: response.cost,
        quality_score: null, // Will be updated later via feedback
        satisfaction_rating: null,
        context_data: {
          priority: request.priority,
          constraints: request.constraints,
          promptAnalysis: response.promptAnalysis
        }
      };
      
      await this.httpClient!.post('/rest/v1/governance_llm_performance', logRecord);
    } catch (error) {
      console.warn('Failed to log governance request:', error);
      // Don't throw - logging failures shouldn't break the main flow
    }
  }
  
  private generateRecommendationReasoning(provider: any, criteria: ProviderCriteria): string {
    const reasons = [];
    
    if (provider.enhanced_governance_score > 0.8) {
      reasons.push('High overall governance score');
    }
    
    if (provider.trust_score_weighting > criteria.trustRequirement) {
      reasons.push('Meets trust requirements');
    }
    
    if (provider.governance_quality_avg > criteria.qualityRequirement) {
      reasons.push('Strong governance quality history');
    }
    
    if (criteria.budgetConstraint && provider.cost_per_1k_tokens <= criteria.budgetConstraint) {
      reasons.push('Within budget constraints');
    }
    
    return reasons.join(', ') || 'Standard provider recommendation';
  }
  
  private estimateRequestCost(provider: any, criteria: ProviderCriteria): number {
    // Rough estimation based on task complexity
    const estimatedTokens = criteria.taskComplexity * 500; // 500 tokens per complexity point
    return (estimatedTokens / 1000) * provider.cost_per_1k_tokens;
  }
  
  private calculateProviderDistribution(records: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    for (const record of records) {
      const provider = `${record.provider_name}:${record.model_name}`;
      distribution[provider] = (distribution[provider] || 0) + 1;
    }
    
    return distribution;
  }
  
  private getEmptyMetrics(): PerformanceMetrics {
    return {
      averageResponseTime: 0,
      successRate: 0,
      errorRate: 0,
      averageCost: 0,
      averageQualityScore: 0,
      totalRequests: 0,
      providerDistribution: {}
    };
  }
}

/**
 * Factory function to create and initialize LLM Nexus interface
 */
export async function createLLMNexusInterface(config: LLMNexusConfig): Promise<ILLMNexusInterface> {
  const interface_ = new LLMNexusInterface();
  await interface_.initialize(config);
  return interface_;
}

/**
 * Factory function to create LLM Nexus interface from environment variables
 */
export async function createLLMNexusInterfaceFromEnv(): Promise<ILLMNexusInterface> {
  const config: LLMNexusConfig = {
    supabaseUrl: process.env.SUPABASE_URL!,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    timeout: process.env.LLM_NEXUS_TIMEOUT ? parseInt(process.env.LLM_NEXUS_TIMEOUT) : 30000,
    retryAttempts: process.env.LLM_NEXUS_RETRY_ATTEMPTS ? parseInt(process.env.LLM_NEXUS_RETRY_ATTEMPTS) : 3
  };
  
  if (!config.supabaseUrl || !config.serviceKey) {
    throw new Error('Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  }
  
  return createLLMNexusInterface(config);
}