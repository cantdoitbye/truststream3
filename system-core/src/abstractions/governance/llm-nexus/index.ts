/**
 * LLM Nexus Abstraction Layer
 * Main export file for LLM Nexus integration with governance agents
 */

// Export interfaces
export {
  ILLMNexusInterface,
  LLMNexusConfig,
  GovernanceLLMRequest,
  GovernanceContext,
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

// Export implementation
export {
  LLMNexusInterface,
  createLLMNexusInterface,
  createLLMNexusInterfaceFromEnv
} from './LLMNexusInterface';

// Export types for external use
export type {
  ILLMNexusInterface as GovernanceLLMRouter,
  GovernanceLLMRequest as LLMRequest,
  LLMNexusResponse as LLMResponse
};
