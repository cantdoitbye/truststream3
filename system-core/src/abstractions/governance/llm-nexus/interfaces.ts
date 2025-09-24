/**
 * LLM Nexus Interface
 * Abstraction layer for governance agents to interact with LLM Nexus infrastructure
 */

export interface LLMNexusConfig {
  supabaseUrl: string;
  serviceKey: string;
  timeout?: number;
  retryAttempts?: number;
}

export interface GovernanceLLMRequest {
  agentId: string;
  governanceType: 'efficiency' | 'quality' | 'transparency' | 'accountability' | 'innovation';
  prompt: string;
  context: GovernanceContext;
  constraints: {
    maxCost?: number;
    maxLatency?: number;
    minTrustScore?: number;
    requiredCapabilities?: string[];
  };
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface GovernanceContext {
  region?: string;
  domain?: string;
  userContext?: Record<string, any>;
  sessionId?: string;
}

export interface LLMNexusResponse {
  requestId?: string;
  response: string;
  provider: string;
  executionTimeMs: number;
  cost: number;
  trustScore: number;
  promptAnalysis: {
    complexity: number;
    category: string;
    reasoning: string;
  };
  scoringDetails: any[];
}

export interface ProviderCriteria {
  governanceType: string;
  taskComplexity: number;
  qualityRequirement: number;
  trustRequirement: number;
  budgetConstraint?: number;
  latencyRequirement?: number;
}

export interface ProviderRecommendation {
  provider: string;
  model: string;
  score: number;
  reasoning: string;
  estimatedCost: number;
  estimatedLatency: number;
  trustScore: number;
}

export interface GovernanceFeedback {
  requestId?: string;
  provider?: string;
  governanceType: string;
  satisfaction: number; // 0-1
  performanceRating: number; // 0-1
  costEffectiveness: number; // 0-1
  qualityRating: number; // 0-1
  recommendations?: string;
  issues?: string[];
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  successRate: number;
  errorRate: number;
  averageCost: number;
  averageQualityScore: number;
  totalRequests: number;
  providerDistribution: Record<string, number>;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

/**
 * Main interface for LLM Nexus operations
 */
export interface ILLMNexusInterface {
  /**
   * Initialize connection to LLM Nexus
   */
  initialize(config: LLMNexusConfig): Promise<void>;
  
  /**
   * Route governance request through LLM Nexus
   */
  routeRequest(request: GovernanceLLMRequest): Promise<LLMNexusResponse>;
  
  /**
   * Get provider recommendations based on criteria
   */
  getProviderRecommendations(criteria: ProviderCriteria): Promise<ProviderRecommendation[]>;
  
  /**
   * Submit governance feedback to improve routing
   */
  submitFeedback(feedback: GovernanceFeedback): Promise<void>;
  
  /**
   * Get performance metrics for time range
   */
  getPerformanceMetrics(timeRange: TimeRange, governanceType?: string): Promise<PerformanceMetrics>;
  
  /**
   * Get health status of LLM Nexus
   */
  getHealthStatus(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details: any }>;
  
  /**
   * Close connections and cleanup
   */
  close(): Promise<void>;
}

/**
 * HTTP Client interface for making requests
 */
export interface HTTPClient {
  get<T>(url: string, headers?: Record<string, string>): Promise<HTTPResponse<T>>;
  post<T>(url: string, data: any, headers?: Record<string, string>): Promise<HTTPResponse<T>>;
  put<T>(url: string, data: any, headers?: Record<string, string>): Promise<HTTPResponse<T>>;
  delete<T>(url: string, headers?: Record<string, string>): Promise<HTTPResponse<T>>;
}

export interface HTTPResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

export interface HTTPClientConfig {
  baseUrl: string;
  timeout?: number;
  retryAttempts?: number;
  defaultHeaders?: Record<string, string>;
}