/**
 * Local LLM Service Interface
 * Provides abstraction for local LLM providers (Ollama, LLaMA, etc.)
 */

export interface LocalLLMConfig {
  endpoint: string;
  defaultModel: string;
  timeout: number;
  maxRetries: number;
  supportedModels: string[];
  capabilities: {
    reasoning: boolean;
    codeGeneration: boolean;
    analysis: boolean;
    creativity: boolean;
    conversation: boolean;
  };
}

export interface LocalLLMRequest {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  systemPrompt?: string;
  context?: {
    agentType: string;
    governanceType: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    sessionId: string;
  };
}

export interface LocalLLMResponse {
  response: string;
  model: string;
  executionTimeMs: number;
  tokensUsed: number;
  confidence: number;
  reasoning?: string;
  metadata: {
    temperature: number;
    completionReason: string;
    finishReason: string;
  };
}

export interface ILocalLLMInterface {
  initialize(config: LocalLLMConfig): Promise<void>;
  generateResponse(request: LocalLLMRequest): Promise<LocalLLMResponse>;
  isModelAvailable(modelName: string): Promise<boolean>;
  getAvailableModels(): Promise<string[]>;
  getHealthStatus(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details: any }>;
  shutdown(): Promise<void>;
}

/**
 * Ollama Local LLM Implementation
 */
export class OllamaLLMInterface implements ILocalLLMInterface {
  private config?: LocalLLMConfig;
  private initialized = false;

  async initialize(config: LocalLLMConfig): Promise<void> {
    this.config = config;
    
    // Test connection to Ollama
    try {
      const response = await fetch(`${config.endpoint}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`Ollama connection failed: ${response.statusText}`);
      }
      
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize Ollama interface: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateResponse(request: LocalLLMRequest): Promise<LocalLLMResponse> {
    this.ensureInitialized();
    
    const startTime = Date.now();
    const model = request.model || this.config!.defaultModel;
    
    try {
      const payload = {
        model,
        prompt: request.systemPrompt ? `${request.systemPrompt}\n\nUser: ${request.prompt}` : request.prompt,
        stream: false,
        options: {
          temperature: request.temperature || 0.7,
          num_predict: request.maxTokens || 2048
        }
      };
      
      const response = await fetch(`${this.config!.endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      const executionTime = Date.now() - startTime;
      
      return {
        response: data.response,
        model,
        executionTimeMs: executionTime,
        tokensUsed: this.estimateTokens(data.response),
        confidence: this.calculateConfidence(data.response, executionTime),
        metadata: {
          temperature: request.temperature || 0.7,
          completionReason: data.done ? 'completed' : 'interrupted',
          finishReason: data.done_reason || 'length'
        }
      };
    } catch (error) {
      throw new Error(`Local LLM generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async isModelAvailable(modelName: string): Promise<boolean> {
    this.ensureInitialized();
    
    try {
      const models = await this.getAvailableModels();
      return models.includes(modelName);
    } catch {
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    this.ensureInitialized();
    
    try {
      const response = await fetch(`${this.config!.endpoint}/api/tags`);
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }
      
      const data = await response.json();
      return data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      console.warn('Failed to get available models:', error);
      return [];
    }
  }

  async getHealthStatus(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details: any }> {
    try {
      const response = await fetch(`${this.config!.endpoint}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (response.ok) {
        const models = await this.getAvailableModels();
        return {
          status: 'healthy',
          details: {
            endpoint: this.config!.endpoint,
            availableModels: models.length,
            timestamp: new Date().toISOString()
          }
        };
      } else {
        return {
          status: 'degraded',
          details: {
            endpoint: this.config!.endpoint,
            httpStatus: response.status,
            timestamp: new Date().toISOString()
          }
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          endpoint: this.config!.endpoint,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  async shutdown(): Promise<void> {
    this.initialized = false;
    this.config = undefined;
  }

  private ensureInitialized(): void {
    if (!this.initialized || !this.config) {
      throw new Error('Local LLM interface not initialized');
    }
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private calculateConfidence(response: string, executionTime: number): number {
    // Simple confidence calculation based on response length and generation time
    const lengthFactor = Math.min(response.length / 500, 1); // Normalize to 500 chars
    const timeFactor = Math.max(0, 1 - (executionTime / 30000)); // Penalty for >30s
    return (lengthFactor + timeFactor) / 2;
  }
}

/**
 * Factory function to create local LLM interface
 */
export async function createLocalLLMInterface(config: LocalLLMConfig): Promise<ILocalLLMInterface> {
  const interface_ = new OllamaLLMInterface();
  await interface_.initialize(config);
  return interface_;
}

/**
 * Factory function to create from environment variables
 */
export async function createLocalLLMInterfaceFromEnv(): Promise<ILocalLLMInterface> {
  const config: LocalLLMConfig = {
    endpoint: process.env.LOCAL_LLM_ENDPOINT || 'http://localhost:11434',
    defaultModel: process.env.LOCAL_LLM_DEFAULT_MODEL || 'llama3.2:3b',
    timeout: parseInt(process.env.LOCAL_LLM_TIMEOUT || '30000'),
    maxRetries: parseInt(process.env.LOCAL_LLM_MAX_RETRIES || '3'),
    supportedModels: (process.env.LOCAL_LLM_SUPPORTED_MODELS || 'llama3.2:3b,llama3.2:1b,codellama:7b').split(','),
    capabilities: {
      reasoning: true,
      codeGeneration: true,
      analysis: true,
      creativity: true,
      conversation: true
    }
  };
  
  return createLocalLLMInterface(config);
}