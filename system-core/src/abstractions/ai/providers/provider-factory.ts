/**
 * AI Provider Factory
 * Creates appropriate AI provider instances based on configuration
 */

import { AIConfig } from '../ai.interface';
import { IAIProvider } from '../ai.interface';
import { OpenAIProvider } from './openai-provider';
import { AnthropicProvider } from './anthropic-provider';
import { LocalLLMProvider } from './local-llm-provider';
import { HuggingFaceProvider } from './huggingface-provider';
import { OllamaProvider } from './ollama-provider';
import { AzureProvider } from './azure-provider';
import { MockAIProvider } from './mock-provider';

export class AIProviderFactory {
  private static instance: AIProviderFactory;
  private providerCache = new Map<string, IAIProvider>();
  private loadingPromises = new Map<string, Promise<IAIProvider>>();

  private constructor() {}

  public static getInstance(): AIProviderFactory {
    if (!AIProviderFactory.instance) {
      AIProviderFactory.instance = new AIProviderFactory();
    }
    return AIProviderFactory.instance;
  }

  /**
   * Creates an AI provider instance based on the configuration
   * @param config AI configuration
   * @param useCache Whether to use cached instances (default: true)
   * @returns AI provider instance
   */
  public async createProvider(config: AIConfig, useCache: boolean = true): Promise<IAIProvider> {
    const cacheKey = this.generateCacheKey(config);
    
    // Return cached instance if available and caching is enabled
    if (useCache && this.providerCache.has(cacheKey)) {
      const cachedProvider = this.providerCache.get(cacheKey)!;
      if (cachedProvider.isConnected()) {
        return cachedProvider;
      } else {
        // Remove disconnected provider from cache
        this.providerCache.delete(cacheKey);
      }
    }

    // Check if provider is currently being loaded
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey)!;
    }

    // Create loading promise
    const loadingPromise = this.createProviderInstance(config, useCache, cacheKey);
    this.loadingPromises.set(cacheKey, loadingPromise);

    try {
      const provider = await loadingPromise;
      this.loadingPromises.delete(cacheKey);
      return provider;
    } catch (error) {
      this.loadingPromises.delete(cacheKey);
      throw error;
    }
  }

  private async createProviderInstance(config: AIConfig, useCache: boolean, cacheKey: string): Promise<IAIProvider> {
    // Validate configuration first
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    let provider: IAIProvider;

    switch (config.type) {
      case 'openai':
        provider = new OpenAIProvider();
        break;
      
      case 'anthropic':
        provider = new AnthropicProvider();
        break;
      
      case 'local-llm':
        provider = new LocalLLMProvider();
        break;
      
      case 'huggingface':
        provider = new HuggingFaceProvider();
        break;
      
      case 'ollama':
        provider = new OllamaProvider();
        break;
      
      case 'azure':
        provider = new AzureProvider();
        break;
      
      case 'mock':
        provider = new MockAIProvider();
        break;
      
      default:
        throw new Error(`Unsupported AI provider type: ${config.type}`);
    }

    // Initialize the provider
    await provider.initialize(config);

    // Cache the provider if caching is enabled
    if (useCache) {
      this.providerCache.set(cacheKey, provider);
    }

    return provider;
  }

  /**
   * Gets a list of supported provider types
   */
  public getSupportedProviders(): string[] {
    return ['openai', 'anthropic', 'local-llm', 'huggingface', 'ollama', 'azure', 'mock'];
  }

  /**
   * Checks if a provider type is supported
   * @param providerType The provider type to check
   */
  public isProviderSupported(providerType: string): boolean {
    return this.getSupportedProviders().includes(providerType);
  }

  /**
   * Gets provider capabilities by type
   * @param providerType The provider type
   */
  public getProviderCapabilities(providerType: string): {
    textGeneration: boolean;
    chatCompletion: boolean;
    functionCalling: boolean;
    streamingSupport: boolean;
    embeddings: boolean;
    vision: boolean;
    imageGeneration: boolean;
    audioTranscription: boolean;
    speechSynthesis: boolean;
    localModels: boolean;
    customModels: boolean;
    finetuning: boolean;
    batchProcessing: boolean;
  } {
    switch (providerType) {
      case 'openai':
        return {
          textGeneration: true,
          chatCompletion: true,
          functionCalling: true,
          streamingSupport: true,
          embeddings: true,
          vision: true,
          imageGeneration: true,
          audioTranscription: true,
          speechSynthesis: true,
          localModels: false,
          customModels: true,
          finetuning: true,
          batchProcessing: true
        };
      
      case 'anthropic':
        return {
          textGeneration: true,
          chatCompletion: true,
          functionCalling: true,
          streamingSupport: true,
          embeddings: false,
          vision: true,
          imageGeneration: false,
          audioTranscription: false,
          speechSynthesis: false,
          localModels: false,
          customModels: false,
          finetuning: false,
          batchProcessing: true
        };
      
      case 'local-llm':
        return {
          textGeneration: true,
          chatCompletion: true,
          functionCalling: true,
          streamingSupport: true,
          embeddings: true,
          vision: false,
          imageGeneration: false,
          audioTranscription: false,
          speechSynthesis: false,
          localModels: true,
          customModels: true,
          finetuning: true,
          batchProcessing: true
        };
      
      case 'huggingface':
        return {
          textGeneration: true,
          chatCompletion: true,
          functionCalling: false,
          streamingSupport: true,
          embeddings: true,
          vision: true,
          imageGeneration: true,
          audioTranscription: true,
          speechSynthesis: true,
          localModels: true,
          customModels: true,
          finetuning: true,
          batchProcessing: true
        };
      
      case 'ollama':
        return {
          textGeneration: true,
          chatCompletion: true,
          functionCalling: false,
          streamingSupport: true,
          embeddings: true,
          vision: true,
          imageGeneration: false,
          audioTranscription: false,
          speechSynthesis: false,
          localModels: true,
          customModels: true,
          finetuning: false,
          batchProcessing: false
        };
      
      case 'azure':
        return {
          textGeneration: true,
          chatCompletion: true,
          functionCalling: true,
          streamingSupport: true,
          embeddings: true,
          vision: true,
          imageGeneration: true,
          audioTranscription: true,
          speechSynthesis: true,
          localModels: false,
          customModels: true,
          finetuning: true,
          batchProcessing: true
        };
      
      case 'mock':
        return {
          textGeneration: true,
          chatCompletion: true,
          functionCalling: true,
          streamingSupport: true,
          embeddings: true,
          vision: true,
          imageGeneration: true,
          audioTranscription: true,
          speechSynthesis: true,
          localModels: true,
          customModels: true,
          finetuning: true,
          batchProcessing: true
        };
      
      default:
        return {
          textGeneration: false,
          chatCompletion: false,
          functionCalling: false,
          streamingSupport: false,
          embeddings: false,
          vision: false,
          imageGeneration: false,
          audioTranscription: false,
          speechSynthesis: false,
          localModels: false,
          customModels: false,
          finetuning: false,
          batchProcessing: false
        };
    }
  }

  /**
   * Estimates costs for different providers
   * @param providerType The provider type
   * @param usage Usage metrics
   */
  public estimateCosts(providerType: string, usage: {
    textTokens: number;
    chatTokens: number;
    embeddingTokens: number;
    imageGenerations: number;
    audioMinutes: number;
  }): {
    textGeneration: number;
    chatCompletion: number;
    embeddings: number;
    imageGeneration: number;
    audio: number;
    total: number;
  } {
    // Base pricing per 1K tokens (approximate)
    const pricing = this.getProviderPricing(providerType);
    
    const costs = {
      textGeneration: (usage.textTokens / 1000) * pricing.textPerK,
      chatCompletion: (usage.chatTokens / 1000) * pricing.chatPerK,
      embeddings: (usage.embeddingTokens / 1000) * pricing.embeddingPerK,
      imageGeneration: usage.imageGenerations * pricing.imagePerGeneration,
      audio: usage.audioMinutes * pricing.audioPerMinute
    };
    
    return {
      ...costs,
      total: Object.values(costs).reduce((sum, cost) => sum + cost, 0)
    };
  }

  private getProviderPricing(providerType: string) {
    switch (providerType) {
      case 'openai':
        return {
          textPerK: 0.002,
          chatPerK: 0.002,
          embeddingPerK: 0.0001,
          imagePerGeneration: 0.02,
          audioPerMinute: 0.006
        };
      
      case 'anthropic':
        return {
          textPerK: 0.008,
          chatPerK: 0.008,
          embeddingPerK: 0,
          imagePerGeneration: 0,
          audioPerMinute: 0
        };
      
      case 'local-llm':
      case 'ollama':
        return {
          textPerK: 0,
          chatPerK: 0,
          embeddingPerK: 0,
          imagePerGeneration: 0,
          audioPerMinute: 0
        };
      
      case 'huggingface':
        return {
          textPerK: 0.001,
          chatPerK: 0.001,
          embeddingPerK: 0.00005,
          imagePerGeneration: 0.01,
          audioPerMinute: 0.003
        };
      
      case 'azure':
        return {
          textPerK: 0.002,
          chatPerK: 0.002,
          embeddingPerK: 0.0001,
          imagePerGeneration: 0.02,
          audioPerMinute: 0.006
        };
      
      default:
        return {
          textPerK: 0,
          chatPerK: 0,
          embeddingPerK: 0,
          imagePerGeneration: 0,
          audioPerMinute: 0
        };
    }
  }

  /**
   * Validates provider configuration before creation
   * @param config AI configuration
   */
  public validateConfig(config: AIConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.type) {
      errors.push('Provider type is required');
    } else if (!this.isProviderSupported(config.type)) {
      errors.push(`Unsupported provider type: ${config.type}`);
    }

    // Provider-specific validation
    switch (config.type) {
      case 'openai':
        if (!config.openai) {
          errors.push('OpenAI configuration is required');
        } else {
          if (!config.openai.apiKey) {
            errors.push('OpenAI API key is required');
          }
        }
        break;
      
      case 'anthropic':
        if (!config.anthropic) {
          errors.push('Anthropic configuration is required');
        } else {
          if (!config.anthropic.apiKey) {
            errors.push('Anthropic API key is required');
          }
        }
        break;
      
      case 'local-llm':
        if (!config.localLLM) {
          errors.push('Local LLM configuration is required');
        } else {
          if (!config.localLLM.endpoint) {
            errors.push('Local LLM endpoint is required');
          }
        }
        break;
      
      case 'huggingface':
        if (!config.huggingface) {
          errors.push('Hugging Face configuration is required');
        }
        // API key is optional for public models
        break;
      
      case 'ollama':
        if (!config.ollama) {
          errors.push('Ollama configuration is required');
        } else {
          if (!config.ollama.endpoint) {
            errors.push('Ollama endpoint is required');
          }
        }
        break;
      
      case 'azure':
        if (!config.azure) {
          errors.push('Azure configuration is required');
        } else {
          if (!config.azure.apiKey) {
            errors.push('Azure API key is required');
          }
          if (!config.azure.endpoint) {
            errors.push('Azure endpoint is required');
          }
        }
        break;
      
      case 'mock':
        // Mock provider doesn't require additional configuration
        break;
    }

    // Validate common options
    if (config.timeout && config.timeout <= 0) {
      errors.push('Timeout must be greater than 0');
    }
    
    if (config.retryAttempts && config.retryAttempts < 0) {
      errors.push('Retry attempts must be non-negative');
    }
    
    if (config.rateLimiting) {
      if (config.rateLimiting.requestsPerMinute && config.rateLimiting.requestsPerMinute <= 0) {
        errors.push('Requests per minute must be greater than 0');
      }
      if (config.rateLimiting.tokensPerMinute && config.rateLimiting.tokensPerMinute <= 0) {
        errors.push('Tokens per minute must be greater than 0');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Clears the provider cache
   */
  public clearCache(): void {
    // Disconnect all cached providers
    for (const provider of this.providerCache.values()) {
      if (provider.isConnected()) {
        provider.disconnect().catch(error => {
          console.warn('Error disconnecting cached AI provider:', error);
        });
      }
    }
    this.providerCache.clear();
  }

  /**
   * Gets the current cache size
   */
  public getCacheSize(): number {
    return this.providerCache.size;
  }

  /**
   * Removes a specific provider from cache
   * @param config AI configuration
   */
  public removeCachedProvider(config: AIConfig): boolean {
    const cacheKey = this.generateCacheKey(config);
    const provider = this.providerCache.get(cacheKey);
    
    if (provider) {
      if (provider.isConnected()) {
        provider.disconnect().catch(error => {
          console.warn('Error disconnecting provider during cache removal:', error);
        });
      }
      return this.providerCache.delete(cacheKey);
    }
    
    return false;
  }

  /**
   * Creates a provider instance without caching
   * @param config AI configuration
   */
  public async createUncachedProvider(config: AIConfig): Promise<IAIProvider> {
    return this.createProvider(config, false);
  }

  /**
   * Gets cached provider instances
   */
  public getCachedProviders(): Map<string, IAIProvider> {
    return new Map(this.providerCache);
  }

  /**
   * Gets health status for all cached providers
   */
  public async getProvidersHealth(): Promise<Array<{ 
    provider: string; 
    status: any; 
    error?: string 
  }>> {
    const healthResults = [];
    
    for (const [key, provider] of this.providerCache.entries()) {
      try {
        const health = await provider.healthCheck();
        healthResults.push({
          provider: provider.getProviderName(),
          status: health
        });
      } catch (error) {
        healthResults.push({
          provider: provider.getProviderName(),
          status: { status: 'error' },
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return healthResults;
  }

  /**
   * Recommends the best provider for a given use case
   * @param requirements Usage requirements
   */
  public recommendProvider(requirements: {
    features: string[];
    budget?: 'low' | 'medium' | 'high';
    latency?: 'low' | 'medium' | 'high';
    privacy?: 'low' | 'medium' | 'high';
    scalability?: 'low' | 'medium' | 'high';
  }): { provider: string; score: number; reasoning: string[] }[] {
    const providers = this.getSupportedProviders();
    const scores: Array<{ provider: string; score: number; reasoning: string[] }> = [];
    
    for (const provider of providers) {
      const capabilities = this.getProviderCapabilities(provider);
      let score = 0;
      const reasoning: string[] = [];
      
      // Feature support scoring
      for (const feature of requirements.features) {
        if (capabilities[feature as keyof typeof capabilities]) {
          score += 10;
          reasoning.push(`Supports ${feature}`);
        } else {
          score -= 5;
          reasoning.push(`Does not support ${feature}`);
        }
      }
      
      // Budget considerations
      if (requirements.budget) {
        switch (provider) {
          case 'local-llm':
          case 'ollama':
            if (requirements.budget === 'low') {
              score += 15;
              reasoning.push('No API costs (local hosting)');
            }
            break;
          case 'huggingface':
            if (requirements.budget === 'low' || requirements.budget === 'medium') {
              score += 10;
              reasoning.push('Lower cost than major providers');
            }
            break;
          case 'openai':
          case 'anthropic':
          case 'azure':
            if (requirements.budget === 'high') {
              score += 5;
              reasoning.push('Premium features with higher costs');
            } else {
              score -= 5;
              reasoning.push('Higher cost');
            }
            break;
        }
      }
      
      // Latency considerations
      if (requirements.latency === 'low') {
        if (['local-llm', 'ollama'].includes(provider)) {
          score += 10;
          reasoning.push('Local execution for low latency');
        }
      }
      
      // Privacy considerations
      if (requirements.privacy === 'high') {
        if (['local-llm', 'ollama'].includes(provider)) {
          score += 15;
          reasoning.push('Data stays local for maximum privacy');
        } else {
          score -= 5;
          reasoning.push('Data sent to external API');
        }
      }
      
      scores.push({ provider, score, reasoning });
    }
    
    return scores.sort((a, b) => b.score - a.score);
  }

  private generateCacheKey(config: AIConfig): string {
    // Create a deterministic cache key based on essential config properties
    const keyData = {
      type: config.type,
      ...config[config.type as keyof AIConfig]
    };
    
    return `${config.type}:${JSON.stringify(keyData)}`;
  }
}

// Export singleton instance
export const aiProviderFactory = AIProviderFactory.getInstance();
