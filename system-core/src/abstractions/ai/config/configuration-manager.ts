/**
 * AI Configuration Manager
 * Handles configuration loading, validation, and management for AI services
 */

import { AIConfig } from '../ai.interface';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface AIConfigurationManager {
  loadConfig(source: string | AIConfig): Promise<AIConfig>;
  validateConfig(config: AIConfig): Promise<ValidationResult>;
  getConfigFromEnvironment(): AIConfig | null;
  saveConfig(config: AIConfig, path: string): Promise<void>;
  mergeConfigs(base: AIConfig, override: Partial<AIConfig>): AIConfig;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export class DefaultAIConfigurationManager implements AIConfigurationManager {
  /**
   * Load configuration from file path or object
   */
  async loadConfig(source: string | AIConfig): Promise<AIConfig> {
    if (typeof source === 'object') {
      const validation = await this.validateConfig(source);
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }
      return source;
    }

    if (!existsSync(source)) {
      throw new Error(`Configuration file not found: ${source}`);
    }

    try {
      const configData = readFileSync(source, 'utf-8');
      const config: AIConfig = JSON.parse(configData);
      
      const validation = await this.validateConfig(config);
      if (!validation.valid) {
        throw new Error(`Invalid configuration file: ${validation.errors.join(', ')}`);
      }

      return config;
    } catch (error) {
      throw new Error(`Failed to load configuration from ${source}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate AI configuration
   */
  async validateConfig(config: AIConfig): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validate required fields
    if (!config.type) {
      errors.push('Configuration type is required');
    }

    const supportedTypes = ['openai', 'anthropic', 'local-llm', 'huggingface', 'ollama', 'azure', 'mock'];
    if (config.type && !supportedTypes.includes(config.type)) {
      errors.push(`Unsupported provider type: ${config.type}`);
    }

    // Provider-specific validation
    switch (config.type) {
      case 'openai':
        if (!config.openai?.apiKey) {
          errors.push('OpenAI API key is required');
        }
        if (config.openai?.baseURL && !this.isValidURL(config.openai.baseURL)) {
          errors.push('OpenAI baseURL must be a valid URL');
        }
        break;

      case 'anthropic':
        if (!config.anthropic?.apiKey) {
          errors.push('Anthropic API key is required');
        }
        if (config.anthropic?.baseURL && !this.isValidURL(config.anthropic.baseURL)) {
          errors.push('Anthropic baseURL must be a valid URL');
        }
        break;

      case 'local-llm':
        if (!config.localLLM?.endpoint) {
          errors.push('Local LLM endpoint is required');
        }
        if (config.localLLM?.endpoint && !this.isValidURL(config.localLLM.endpoint)) {
          errors.push('Local LLM endpoint must be a valid URL');
        }
        if (config.localLLM?.maxContextLength && config.localLLM.maxContextLength < 1) {
          errors.push('Max context length must be positive');
        }
        break;

      case 'ollama':
        if (!config.ollama?.endpoint) {
          errors.push('Ollama endpoint is required');
        }
        if (config.ollama?.endpoint && !this.isValidURL(config.ollama.endpoint)) {
          errors.push('Ollama endpoint must be a valid URL');
        }
        break;

      case 'azure':
        if (!config.azure?.apiKey) {
          errors.push('Azure API key is required');
        }
        if (!config.azure?.endpoint) {
          errors.push('Azure endpoint is required');
        }
        if (config.azure?.endpoint && !this.isValidURL(config.azure.endpoint)) {
          errors.push('Azure endpoint must be a valid URL');
        }
        break;
    }

    // Validate common options
    if (config.timeout && config.timeout < 1000) {
      warnings.push('Timeout less than 1000ms may cause frequent failures');
    }

    if (config.retryAttempts && config.retryAttempts < 1) {
      errors.push('Retry attempts must be at least 1');
    }

    if (config.retryAttempts && config.retryAttempts > 10) {
      warnings.push('High retry attempts may cause excessive delays');
    }

    // Rate limiting validation
    if (config.rateLimiting) {
      if (config.rateLimiting.requestsPerMinute && config.rateLimiting.requestsPerMinute < 1) {
        errors.push('Requests per minute must be positive');
      }
      if (config.rateLimiting.tokensPerMinute && config.rateLimiting.tokensPerMinute < 1) {
        errors.push('Tokens per minute must be positive');
      }
    }

    // Caching validation
    if (config.caching) {
      if (config.caching.ttl && config.caching.ttl < 1000) {
        warnings.push('Cache TTL less than 1000ms may not be effective');
      }
      if (config.caching.maxSize && config.caching.maxSize < 1) {
        errors.push('Cache max size must be positive');
      }
    }

    // Performance suggestions
    if (!config.caching?.enabled) {
      suggestions.push('Consider enabling caching for better performance');
    }

    if (!config.monitoring?.enabled) {
      suggestions.push('Consider enabling monitoring for better observability');
    }

    if (config.type === 'local-llm' && !config.localLLM?.gpu) {
      suggestions.push('Consider enabling GPU acceleration for local LLM');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Get configuration from environment variables
   */
  getConfigFromEnvironment(): AIConfig | null {
    const aiType = process.env.AI_PROVIDER_TYPE;
    if (!aiType) {
      return null;
    }

    const baseConfig: Partial<AIConfig> = {
      type: aiType as any,
      timeout: process.env.AI_TIMEOUT ? parseInt(process.env.AI_TIMEOUT) : undefined,
      retryAttempts: process.env.AI_RETRY_ATTEMPTS ? parseInt(process.env.AI_RETRY_ATTEMPTS) : undefined
    };

    // Rate limiting from environment
    if (process.env.AI_RATE_LIMIT_REQUESTS || process.env.AI_RATE_LIMIT_TOKENS) {
      baseConfig.rateLimiting = {
        requestsPerMinute: process.env.AI_RATE_LIMIT_REQUESTS ? parseInt(process.env.AI_RATE_LIMIT_REQUESTS) : undefined,
        tokensPerMinute: process.env.AI_RATE_LIMIT_TOKENS ? parseInt(process.env.AI_RATE_LIMIT_TOKENS) : undefined
      };
    }

    // Caching from environment
    if (process.env.AI_CACHE_ENABLED) {
      baseConfig.caching = {
        enabled: process.env.AI_CACHE_ENABLED === 'true',
        ttl: process.env.AI_CACHE_TTL ? parseInt(process.env.AI_CACHE_TTL) : undefined,
        maxSize: process.env.AI_CACHE_MAX_SIZE ? parseInt(process.env.AI_CACHE_MAX_SIZE) : undefined
      };
    }

    // Monitoring from environment
    if (process.env.AI_MONITORING_ENABLED) {
      baseConfig.monitoring = {
        enabled: process.env.AI_MONITORING_ENABLED === 'true',
        logRequests: process.env.AI_LOG_REQUESTS === 'true',
        collectMetrics: process.env.AI_COLLECT_METRICS === 'true'
      };
    }

    // Provider-specific configuration
    switch (aiType) {
      case 'openai':
        baseConfig.openai = {
          apiKey: process.env.OPENAI_API_KEY || '',
          baseURL: process.env.OPENAI_BASE_URL,
          organization: process.env.OPENAI_ORGANIZATION,
          project: process.env.OPENAI_PROJECT
        };
        break;

      case 'anthropic':
        baseConfig.anthropic = {
          apiKey: process.env.ANTHROPIC_API_KEY || '',
          baseURL: process.env.ANTHROPIC_BASE_URL
        };
        break;

      case 'local-llm':
        baseConfig.localLLM = {
          endpoint: process.env.LOCAL_LLM_ENDPOINT || '',
          apiKey: process.env.LOCAL_LLM_API_KEY,
          modelPath: process.env.LOCAL_LLM_MODEL_PATH,
          gpu: process.env.LOCAL_LLM_GPU === 'true',
          maxContextLength: process.env.LOCAL_LLM_MAX_CONTEXT ? parseInt(process.env.LOCAL_LLM_MAX_CONTEXT) : undefined
        };
        break;

      case 'ollama':
        baseConfig.ollama = {
          endpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
          timeout: process.env.OLLAMA_TIMEOUT ? parseInt(process.env.OLLAMA_TIMEOUT) : undefined
        };
        break;

      case 'huggingface':
        baseConfig.huggingface = {
          apiKey: process.env.HUGGINGFACE_API_KEY,
          baseURL: process.env.HUGGINGFACE_BASE_URL,
          useInference: process.env.HUGGINGFACE_USE_INFERENCE === 'true'
        };
        break;

      case 'azure':
        baseConfig.azure = {
          apiKey: process.env.AZURE_OPENAI_API_KEY || '',
          endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
          apiVersion: process.env.AZURE_OPENAI_API_VERSION,
          deployment: process.env.AZURE_OPENAI_DEPLOYMENT
        };
        break;

      default:
        return null;
    }

    return baseConfig as AIConfig;
  }

  /**
   * Save configuration to file
   */
  async saveConfig(config: AIConfig, path: string): Promise<void> {
    const validation = await this.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    try {
      const fs = await import('fs/promises');
      await fs.writeFile(path, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save configuration to ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Merge two configurations
   */
  mergeConfigs(base: AIConfig, override: Partial<AIConfig>): AIConfig {
    const merged = { ...base };

    // Merge top-level properties
    Object.keys(override).forEach(key => {
      if (override[key as keyof AIConfig] !== undefined) {
        if (typeof override[key as keyof AIConfig] === 'object' && !Array.isArray(override[key as keyof AIConfig])) {
          merged[key as keyof AIConfig] = {
            ...merged[key as keyof AIConfig],
            ...override[key as keyof AIConfig]
          } as any;
        } else {
          merged[key as keyof AIConfig] = override[key as keyof AIConfig] as any;
        }
      }
    });

    return merged;
  }

  /**
   * Check if a string is a valid URL
   */
  private isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Singleton instance
 */
export const aiConfigurationManager = new DefaultAIConfigurationManager();

/**
 * Configuration presets for common scenarios
 */
export const AIConfigurationPresets = {
  /**
   * Development preset with OpenAI
   */
  development: (apiKey: string): AIConfig => ({
    type: 'openai',
    openai: { apiKey },
    timeout: 30000,
    retryAttempts: 2,
    caching: { enabled: true, ttl: 300000 },
    monitoring: { enabled: true, logRequests: true, collectMetrics: true }
  }),

  /**
   * Production preset with OpenAI
   */
  production: (apiKey: string): AIConfig => ({
    type: 'openai',
    openai: { apiKey },
    timeout: 30000,
    retryAttempts: 3,
    rateLimiting: { requestsPerMinute: 60, tokensPerMinute: 150000 },
    caching: { enabled: true, ttl: 600000, maxSize: 1000 },
    monitoring: { enabled: true, logRequests: false, collectMetrics: true }
  }),

  /**
   * Local development with Ollama
   */
  localDevelopment: (endpoint = 'http://localhost:11434'): AIConfig => ({
    type: 'ollama',
    ollama: { endpoint, timeout: 60000 },
    timeout: 60000,
    retryAttempts: 2,
    caching: { enabled: true, ttl: 300000 },
    monitoring: { enabled: true, logRequests: true, collectMetrics: true }
  }),

  /**
   * High-performance local LLM setup
   */
  highPerformanceLocal: (endpoint: string): AIConfig => ({
    type: 'local-llm',
    localLLM: { endpoint, gpu: true, maxContextLength: 8192 },
    timeout: 120000,
    retryAttempts: 2,
    caching: { enabled: true, ttl: 900000, maxSize: 500 },
    monitoring: { enabled: true, logRequests: true, collectMetrics: true }
  })
};
