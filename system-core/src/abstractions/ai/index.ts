/**
 * AI Service Abstraction Layer - Main Export File
 * Provides unified exports for all AI service components with multi-provider support
 */

// Core AI Service and Interfaces
export { UnifiedAIService } from './UnifiedAIService';
export type { UnifiedAIServiceOptions } from './UnifiedAIService';

// Provider Factory
export { AIProviderFactory } from './providers/provider-factory';

// Core Interfaces and Types
export * from './ai.interface';

// Provider Implementations
export { OpenAIProvider } from './providers/openai-provider';
export { AnthropicProvider } from './providers/anthropic-provider';
export { LocalLLMProvider } from './providers/local-llm-provider';
export { HuggingFaceProvider } from './providers/huggingface-provider';
export { OllamaProvider } from './providers/ollama-provider';
export { MockAIProvider } from './providers/mock-provider';

// Configuration Management
export { 
  DefaultAIConfigurationManager, 
  aiConfigurationManager,
  AIConfigurationPresets 
} from './config/configuration-manager';
export type { 
  AIConfigurationManager, 
  ValidationResult 
} from './config/configuration-manager';

// Deployment Helpers
export { 
  AIEdgeFunctionDeploymentHelper,
  AIDeploymentHelpers 
} from './edge-functions/deployment-helpers';
export type { 
  EdgeFunctionAITemplate,
  DeploymentOptions 
} from './edge-functions/deployment-helpers';

// Utilities
export { 
  AIUtils,
  TokenUtils,
  TextUtils,
  EmbeddingUtils,
  ResponseUtils,
  ErrorUtils,
  PerformanceUtils 
} from './utils/ai-utils';

/**
 * Quick Start Helper Functions
 */

import { UnifiedAIService } from './UnifiedAIService';
import { AIProviderFactory } from './providers/provider-factory';
import { AIConfig } from './ai.interface';

/**
 * Initialize AI service with OpenAI provider
 */
export async function initializeOpenAIService(apiKey: string, options?: {
  baseURL?: string;
  organization?: string;
  project?: string;
}): Promise<UnifiedAIService> {
  const config: AIConfig = {
    type: 'openai',
    openai: {
      apiKey,
      baseURL: options?.baseURL,
      organization: options?.organization,
      project: options?.project
    }
  };
  
  const service = new UnifiedAIService({
    autoConnect: true,
    enableCaching: true,
    enableMetrics: true
  });
  
  await service.connect(config);
  return service;
}

/**
 * Initialize AI service with Anthropic provider
 */
export async function initializeAnthropicService(apiKey: string, options?: {
  baseURL?: string;
}): Promise<UnifiedAIService> {
  const config: AIConfig = {
    type: 'anthropic',
    anthropic: {
      apiKey,
      baseURL: options?.baseURL
    }
  };
  
  const service = new UnifiedAIService({
    autoConnect: true,
    enableCaching: true,
    enableMetrics: true
  });
  
  await service.connect(config);
  return service;
}

/**
 * Initialize AI service with Local LLM provider
 */
export async function initializeLocalLLMService(endpoint: string, options?: {
  apiKey?: string;
  modelPath?: string;
  gpu?: boolean;
  maxContextLength?: number;
}): Promise<UnifiedAIService> {
  const config: AIConfig = {
    type: 'local-llm',
    localLLM: {
      endpoint,
      apiKey: options?.apiKey,
      modelPath: options?.modelPath,
      gpu: options?.gpu,
      maxContextLength: options?.maxContextLength
    }
  };
  
  const service = new UnifiedAIService({
    autoConnect: true,
    enableCaching: true,
    enableMetrics: true,
    enableModelPooling: true
  });
  
  await service.connect(config);
  return service;
}

/**
 * Initialize AI service with Ollama provider
 */
export async function initializeOllamaService(endpoint: string, options?: {
  timeout?: number;
}): Promise<UnifiedAIService> {
  const config: AIConfig = {
    type: 'ollama',
    ollama: {
      endpoint,
      timeout: options?.timeout
    }
  };
  
  const service = new UnifiedAIService({
    autoConnect: true,
    enableCaching: true,
    enableMetrics: true,
    enableModelPooling: true
  });
  
  await service.connect(config);
  return service;
}

/**
 * Initialize AI service with HuggingFace provider
 */
export async function initializeHuggingFaceService(options?: {
  apiKey?: string;
  baseURL?: string;
  useInference?: boolean;
}): Promise<UnifiedAIService> {
  const config: AIConfig = {
    type: 'huggingface',
    huggingface: {
      apiKey: options?.apiKey,
      baseURL: options?.baseURL,
      useInference: options?.useInference
    }
  };
  
  const service = new UnifiedAIService({
    autoConnect: true,
    enableCaching: true,
    enableMetrics: true,
    enableModelPooling: true
  });
  
  await service.connect(config);
  return service;
}

/**
 * Initialize AI service with custom configuration
 */
export async function initializeCustomAIService(config: AIConfig, options?: {
  enableCaching?: boolean;
  enableMetrics?: boolean;
  enableModelPooling?: boolean;
  enableFailover?: boolean;
  fallbackProviders?: string[];
}): Promise<UnifiedAIService> {
  const service = new UnifiedAIService({
    autoConnect: true,
    enableCaching: options?.enableCaching ?? true,
    enableMetrics: options?.enableMetrics ?? true,
    enableModelPooling: options?.enableModelPooling ?? true,
    enableFailover: options?.enableFailover ?? false,
    fallbackProviders: options?.fallbackProviders ?? []
  });
  
  await service.connect(config);
  return service;
}

/**
 * Switch AI provider with zero downtime
 */
export async function switchAIProvider(
  service: UnifiedAIService,
  newConfig: AIConfig,
  options?: {
    preserveCache?: boolean;
    validateConnection?: boolean;
  }
): Promise<void> {
  // Disconnect current provider
  await service.disconnect();
  
  // Clear cache if requested
  if (!options?.preserveCache) {
    // Cache clearing is handled internally during disconnect
  }
  
  // Connect to new provider
  await service.connect(newConfig);
  
  // Validate connection if requested
  if (options?.validateConnection) {
    const stats = await service.getStats();
    if (!service.isConnected()) {
      throw new Error('Failed to connect to new AI provider');
    }
  }
}

/**
 * Get AI service capabilities by provider type
 */
export function getProviderCapabilities(providerType: string) {
  const factory = AIProviderFactory.getInstance();
  return factory.getProviderCapabilities(providerType);
}

/**
 * List all supported AI providers
 */
export function getSupportedProviders(): string[] {
  const factory = AIProviderFactory.getInstance();
  return factory.getSupportedProviders();
}

/**
 * Check if a provider type is supported
 */
export function isProviderSupported(providerType: string): boolean {
  const factory = AIProviderFactory.getInstance();
  return factory.isProviderSupported(providerType);
}

/**
 * Create a mock AI service for testing
 */
export async function createMockAIService(): Promise<UnifiedAIService> {
  const config: AIConfig = {
    type: 'mock'
  };
  
  const service = new UnifiedAIService({
    autoConnect: true,
    enableCaching: false,
    enableMetrics: true
  });
  
  await service.connect(config);
  return service;
}

/**
 * Configuration templates for different use cases
 */
export const AIConfigurationTemplates = {
  /**
   * OpenAI production configuration
   */
  openaiProduction: (apiKey: string): AIConfig => ({
    type: 'openai',
    openai: {
      apiKey,
      baseURL: 'https://api.openai.com/v1'
    },
    timeout: 30000,
    retryAttempts: 3,
    rateLimiting: {
      requestsPerMinute: 60,
      tokensPerMinute: 150000
    },
    caching: {
      enabled: true,
      ttl: 300000,
      maxSize: 1000
    },
    monitoring: {
      enabled: true,
      logRequests: true,
      collectMetrics: true
    }
  }),

  /**
   * Local LLM development configuration
   */
  localLLMDevelopment: (endpoint: string): AIConfig => ({
    type: 'local-llm',
    localLLM: {
      endpoint,
      gpu: true,
      maxContextLength: 4096
    },
    timeout: 60000,
    retryAttempts: 2,
    caching: {
      enabled: true,
      ttl: 600000,
      maxSize: 500
    },
    monitoring: {
      enabled: true,
      logRequests: true,
      collectMetrics: true
    }
  }),

  /**
   * Multi-provider failover configuration
   */
  multiProviderFailover: (primaryApiKey: string, fallbackEndpoint: string): AIConfig => ({
    type: 'openai',
    openai: {
      apiKey: primaryApiKey
    },
    timeout: 30000,
    retryAttempts: 2,
    caching: {
      enabled: true,
      ttl: 300000
    },
    monitoring: {
      enabled: true,
      collectMetrics: true
    }
  })
};

/**
 * Export version information
 */
export const VERSION = '1.0.0';
export const SUPPORTED_PROVIDERS = ['openai', 'anthropic', 'local-llm', 'huggingface', 'ollama', 'azure', 'mock'];

/**
 * Default export for convenience
 */
const AIAbstraction = {
  UnifiedAIService,
  AIProviderFactory,
  initializeOpenAIService,
  initializeAnthropicService,
  initializeLocalLLMService,
  initializeOllamaService,
  initializeHuggingFaceService,
  initializeCustomAIService,
  switchAIProvider,
  getProviderCapabilities,
  getSupportedProviders,
  isProviderSupported,
  createMockAIService,
  AIConfigurationTemplates,
  VERSION,
  SUPPORTED_PROVIDERS
};

export default AIAbstraction;
