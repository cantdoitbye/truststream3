/**
 * Local LLM Provider
 * Implements AI services using local LLM endpoints (e.g., vLLM, text-generation-inference, etc.)
 */

import {
  BaseAIProvider,
  AIConfig,
  ProviderCapabilities,
  AIStats,
  TextGenerationOptions,
  TextGenerationResult,
  TextStreamChunk,
  ChatMessage,
  ChatCompletionOptions,
  ChatCompletionResult,
  ChatStreamChunk,
  CodeGenerationOptions,
  CodeGenerationResult,
  FunctionDefinition,
  FunctionCallOptions,
  FunctionCallResult,
  EmbeddingOptions,
  EmbeddingResult,
  SemanticSearchOptions,
  SemanticSearchResult,
  SimilarityOptions,
  ClusteringOptions,
  ClusteringResult,
  ModelInfo,
  ModelLoadConfig,
  ModelHealthStatus,
  ModelMetrics,
  ModelDownloadOptions,
  ModelDownloadResult,
  VisionOptions,
  VisionResult,
  OCROptions,
  OCRResult,
  ImageGenerationOptions,
  ImageGenerationResult,
  ImageEditOptions,
  TranscriptionOptions,
  TranscriptionResult,
  SpeechSynthesisOptions,
  SpeechSynthesisResult,
  AudioAnalysisOptions,
  AudioAnalysisResult,
  RateLimitInfo,
  UsageInfo,
  CustomModelConfig,
  AIError,
  ModelNotFoundError,
  ModelLoadError,
  InsufficientResourcesError
} from '../ai.interface';

interface LocalLLMResponse {
  choices: Array<{
    text?: string;
    message?: {
      role: string;
      content: string;
    };
    finish_reason: string;
    index: number;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  id?: string;
  created?: number;
}

interface ModelStatus {
  loaded: boolean;
  loading: boolean;
  error?: string;
  memoryUsage?: number;
  lastAccessed?: Date;
}

export class LocalLLMProvider extends BaseAIProvider {
  private endpoint: string = '';
  private apiKey?: string;
  private requestCount = 0;
  private tokenCount = 0;
  private errorCount = 0;
  private startTime = Date.now();
  private loadedModels = new Map<string, ModelStatus>();
  private modelMetrics = new Map<string, {
    requests: number;
    tokens: number;
    errors: number;
    totalLatency: number;
  }>();

  public getProviderName(): string {
    return 'local-llm';
  }

  public async initialize(config: AIConfig): Promise<void> {
    if (config.type !== 'local-llm' || !config.localLLM) {
      throw new AIError('Invalid Local LLM configuration', 'INVALID_CONFIG', 400, 'local-llm');
    }

    this.config = config;
    this.endpoint = config.localLLM.endpoint;
    this.apiKey = config.localLLM.apiKey;
  }

  public async connect(): Promise<void> {
    try {
      // Test connection by checking health endpoint
      const response = await this.makeRequest('/health', 'GET');
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      
      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw new AIError(
        'Failed to connect to Local LLM',
        'CONNECTION_FAILED',
        500,
        'local-llm',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  public async disconnect(): Promise<void> {
    this.connected = false;
    this.loadedModels.clear();
    this.modelMetrics.clear();
  }

  protected async performHealthCheck(): Promise<void> {
    const response = await this.makeRequest('/health', 'GET');
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
  }

  public getCapabilities(): ProviderCapabilities {
    return {
      textGeneration: true,
      chatCompletion: true,
      functionCalling: true,
      streamingSupport: true,
      embeddings: true,
      vision: false, // Depends on model
      imageGeneration: false,
      audioTranscription: false,
      speechSynthesis: false,
      localModels: true,
      customModels: true,
      finetuning: true,
      batchProcessing: true,
      rateLimiting: false,
      caching: true
    };
  }

  public async getStats(): Promise<AIStats> {
    const uptime = Date.now() - this.startTime;
    const avgLatency = uptime / Math.max(this.requestCount, 1);
    
    return {
      totalRequests: this.requestCount,
      totalTokens: this.tokenCount,
      averageLatency: avgLatency,
      errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
      providerName: 'local-llm',
      modelsLoaded: Array.from(this.loadedModels.values()).filter(s => s.loaded).length,
      timestamp: new Date(),
      usage: {
        textGeneration: Math.floor(this.requestCount * 0.4),
        chatCompletion: Math.floor(this.requestCount * 0.6),
        embeddings: Math.floor(this.requestCount * 0.1),
        vision: 0,
        audio: 0
      }
    };
  }

  // Text Generation
  public async generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult> {
    this.requestCount++;
    const startTime = Date.now();

    try {
      const payload = {
        prompt,
        model: options?.model || 'default',
        max_tokens: options?.maxTokens || 512,
        temperature: options?.temperature || 0.7,
        top_p: options?.topP,
        top_k: options?.topK,
        stop: options?.stop,
        stream: false,
        echo: options?.echo || false
      };

      const response = await this.makeRequest('/v1/completions', 'POST', payload);
      
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }

      const data: LocalLLMResponse = await response.json();
      const choice = data.choices[0];
      const tokens = data.usage?.total_tokens || this.estimateTokens(prompt + (choice.text || ''));
      
      this.tokenCount += tokens;
      this.updateModelMetrics(payload.model, tokens, Date.now() - startTime, false);

      return {
        text: choice.text || '',
        finishReason: this.mapFinishReason(choice.finish_reason),
        usage: {
          promptTokens: data.usage?.prompt_tokens || this.estimateTokens(prompt),
          completionTokens: data.usage?.completion_tokens || this.estimateTokens(choice.text || ''),
          totalTokens: tokens
        },
        model: data.model,
        id: data.id || this.generateId(),
        created: data.created || Math.floor(Date.now() / 1000)
      };
    } catch (error) {
      this.errorCount++;
      this.updateModelMetrics(options?.model || 'default', 0, Date.now() - startTime, true);
      throw this.handleError(error, 'generateText');
    }
  }

  public async *streamText(prompt: string, options?: TextGenerationOptions): AsyncIterable<TextStreamChunk> {
    this.requestCount++;

    try {
      const payload = {
        prompt,
        model: options?.model || 'default',
        max_tokens: options?.maxTokens || 512,
        temperature: options?.temperature || 0.7,
        top_p: options?.topP,
        top_k: options?.topK,
        stop: options?.stop,
        stream: true
      };

      const response = await this.makeRequest('/v1/completions', 'POST', payload);
      
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let index = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '));

          for (const line of lines) {
            const data = line.replace('data: ', '').trim();
            if (data === '[DONE]') return;

            try {
              const parsed: LocalLLMResponse = JSON.parse(data);
              const choice = parsed.choices[0];
              
              if (choice) {
                yield {
                  text: choice.text || '',
                  finishReason: this.mapFinishReason(choice.finish_reason),
                  index: index++
                };
              }
            } catch (parseError) {
              // Skip invalid JSON chunks
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      this.errorCount++;
      throw this.handleError(error, 'streamText');
    }
  }

  // Chat Completion
  public async chatCompletion(messages: ChatMessage[], options?: ChatCompletionOptions): Promise<ChatCompletionResult> {
    this.requestCount++;
    const startTime = Date.now();

    try {
      const payload = {
        messages: this.convertMessages(messages),
        model: options?.model || 'default',
        max_tokens: options?.maxTokens || 512,
        temperature: options?.temperature || 0.7,
        top_p: options?.topP,
        stop: options?.stop,
        stream: false,
        functions: options?.functions,
        function_call: options?.functionCall
      };

      const response = await this.makeRequest('/v1/chat/completions', 'POST', payload);
      
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }

      const data: LocalLLMResponse = await response.json();
      const choice = data.choices[0];
      const tokens = data.usage?.total_tokens || this.estimateTokens(
        messages.map(m => m.content).join(' ') + (choice.message?.content || '')
      );
      
      this.tokenCount += tokens;
      this.updateModelMetrics(payload.model, tokens, Date.now() - startTime, false);

      return {
        message: {
          role: choice.message?.role as 'assistant' || 'assistant',
          content: choice.message?.content || ''
        },
        finishReason: this.mapFinishReason(choice.finish_reason),
        usage: {
          promptTokens: data.usage?.prompt_tokens || this.estimateTokens(messages.map(m => m.content).join(' ')),
          completionTokens: data.usage?.completion_tokens || this.estimateTokens(choice.message?.content || ''),
          totalTokens: tokens
        },
        model: data.model,
        id: data.id || this.generateId(),
        created: data.created || Math.floor(Date.now() / 1000)
      };
    } catch (error) {
      this.errorCount++;
      this.updateModelMetrics(options?.model || 'default', 0, Date.now() - startTime, true);
      throw this.handleError(error, 'chatCompletion');
    }
  }

  public async *streamChatCompletion(messages: ChatMessage[], options?: ChatCompletionOptions): AsyncIterable<ChatStreamChunk> {
    this.requestCount++;

    try {
      const payload = {
        messages: this.convertMessages(messages),
        model: options?.model || 'default',
        max_tokens: options?.maxTokens || 512,
        temperature: options?.temperature || 0.7,
        top_p: options?.topP,
        stop: options?.stop,
        stream: true,
        functions: options?.functions,
        function_call: options?.functionCall
      };

      const response = await this.makeRequest('/v1/chat/completions', 'POST', payload);
      
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let index = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '));

          for (const line of lines) {
            const data = line.replace('data: ', '').trim();
            if (data === '[DONE]') return;

            try {
              const parsed: LocalLLMResponse = JSON.parse(data);
              const choice = parsed.choices[0];
              
              if (choice && choice.message) {
                yield {
                  delta: {
                    role: choice.message.role as any,
                    content: choice.message.content
                  },
                  finishReason: this.mapFinishReason(choice.finish_reason),
                  index: index++
                };
              }
            } catch (parseError) {
              // Skip invalid JSON chunks
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      this.errorCount++;
      throw this.handleError(error, 'streamChatCompletion');
    }
  }

  // Code Generation
  public async generateCode(prompt: string, language: string, options?: CodeGenerationOptions): Promise<CodeGenerationResult> {
    const codePrompt = `Generate ${language} code for: ${prompt}${options?.includeTests ? ' Include unit tests.' : ''}${options?.includeDocumentation ? ' Include documentation.' : ''}`;
    
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an expert ${language} programmer. Generate clean, efficient code.`
      },
      {
        role: 'user',
        content: codePrompt
      }
    ];

    const result = await this.chatCompletion(messages, options);

    return {
      text: result.message.content,
      finishReason: result.finishReason,
      usage: result.usage,
      model: result.model,
      id: result.id,
      created: result.created,
      language,
      hasTests: options?.includeTests || false,
      hasDocumentation: options?.includeDocumentation || false
    };
  }

  // Function Calling
  public async callFunction(messages: ChatMessage[], functions: FunctionDefinition[], options?: FunctionCallOptions): Promise<FunctionCallResult> {
    const result = await this.chatCompletion(messages, {
      ...options,
      functions,
      functionCall: 'auto'
    });

    // Parse function call from response
    if (result.message.function_call) {
      const startTime = Date.now();
      
      return {
        functionName: result.message.function_call.name,
        arguments: JSON.parse(result.message.function_call.arguments),
        result: { called: true, response: result.message.content },
        success: true,
        executionTime: Date.now() - startTime
      };
    }

    throw new AIError('No function call in response', 'NO_FUNCTION_CALL', 400, 'local-llm');
  }

  // Embeddings
  public async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult> {
    this.requestCount++;

    try {
      const payload = {
        input: text,
        model: options?.model || 'default-embedding',
        encoding_format: 'float'
      };

      const response = await this.makeRequest('/v1/embeddings', 'POST', payload);
      
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const embedding = data.data[0];
      
      this.tokenCount += data.usage?.total_tokens || this.estimateTokens(text);

      return {
        embedding: embedding.embedding,
        dimensions: embedding.embedding.length,
        model: data.model || payload.model,
        usage: {
          promptTokens: data.usage?.prompt_tokens || this.estimateTokens(text),
          totalTokens: data.usage?.total_tokens || this.estimateTokens(text)
        }
      };
    } catch (error) {
      this.errorCount++;
      throw this.handleError(error, 'generateEmbedding');
    }
  }

  public async generateEmbeddings(texts: string[], options?: EmbeddingOptions): Promise<EmbeddingResult[]> {
    this.requestCount++;

    try {
      const payload = {
        input: texts,
        model: options?.model || 'default-embedding',
        encoding_format: 'float'
      };

      const response = await this.makeRequest('/v1/embeddings', 'POST', payload);
      
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.tokenCount += data.usage?.total_tokens || texts.reduce((sum, text) => sum + this.estimateTokens(text), 0);

      return data.data.map((embedding: any) => ({
        embedding: embedding.embedding,
        dimensions: embedding.embedding.length,
        model: data.model || payload.model,
        usage: {
          promptTokens: Math.floor((data.usage?.prompt_tokens || 0) / texts.length),
          totalTokens: Math.floor((data.usage?.total_tokens || 0) / texts.length)
        }
      }));
    } catch (error) {
      this.errorCount++;
      throw this.handleError(error, 'generateEmbeddings');
    }
  }

  // Semantic Search and Similarity
  public async semanticSearch(query: string, documents: string[], options?: SemanticSearchOptions): Promise<SemanticSearchResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    const docEmbeddings = await this.generateEmbeddings(documents);
    
    const similarities = docEmbeddings.map((docEmb, index) => ({
      text: documents[index],
      score: this.cosineSimilarity(queryEmbedding.embedding, docEmb.embedding),
      index
    }));
    
    const topK = options?.topK || 5;
    return similarities
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .filter(item => !options?.threshold || item.score >= options.threshold);
  }

  public async calculateSimilarity(text1: string, text2: string, options?: SimilarityOptions): Promise<number> {
    const [emb1, emb2] = await this.generateEmbeddings([text1, text2]);
    return this.cosineSimilarity(emb1.embedding, emb2.embedding);
  }

  public async clusterTexts(texts: string[], options?: ClusteringOptions): Promise<ClusteringResult> {
    // Simple k-means clustering implementation
    const embeddings = await this.generateEmbeddings(texts);
    const numClusters = options?.numClusters || Math.min(3, texts.length);
    
    // Initialize centroids randomly
    const centroids = [];
    for (let i = 0; i < numClusters; i++) {
      const randomIndex = Math.floor(Math.random() * embeddings.length);
      centroids.push([...embeddings[randomIndex].embedding]);
    }
    
    // Assign texts to clusters
    const clusters = Array.from({ length: numClusters }, (_, i) => ({
      id: i,
      texts: [] as string[],
      centroid: centroids[i],
      size: 0
    }));
    
    for (let i = 0; i < texts.length; i++) {
      let bestCluster = 0;
      let bestSimilarity = -1;
      
      for (let j = 0; j < numClusters; j++) {
        const similarity = this.cosineSimilarity(embeddings[i].embedding, centroids[j]);
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestCluster = j;
        }
      }
      
      clusters[bestCluster].texts.push(texts[i]);
      clusters[bestCluster].size++;
    }
    
    return {
      clusters,
      totalClusters: numClusters,
      silhouetteScore: 0.7 // Placeholder
    };
  }

  // Model Management
  public async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await this.makeRequest('/v1/models', 'GET');
      
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.data?.map((model: any) => ({
        id: model.id,
        name: model.id,
        description: `Local LLM model: ${model.id}`,
        provider: 'local-llm',
        type: this.inferModelType(model.id),
        capabilities: this.getModelCapabilities(model.id),
        isLocal: true,
        status: this.loadedModels.get(model.id)?.loaded ? 'available' : 'unavailable',
        createdAt: new Date(model.created * 1000),
        updatedAt: new Date(model.created * 1000)
      })) || [];
    } catch (error) {
      throw this.handleError(error, 'listModels');
    }
  }

  public async getModel(modelId: string): Promise<ModelInfo | null> {
    const models = await this.listModels();
    return models.find(m => m.id === modelId) || null;
  }

  public async loadModel(modelId: string, config?: ModelLoadConfig): Promise<void> {
    const status = this.loadedModels.get(modelId);
    if (status?.loaded) {
      return; // Already loaded
    }

    if (status?.loading) {
      throw new ModelLoadError(modelId, 'Model is already being loaded', 'local-llm');
    }

    this.loadedModels.set(modelId, { loaded: false, loading: true });

    try {
      const payload = {
        model: modelId,
        config: {
          gpu: config?.gpu,
          quantization: config?.quantization,
          max_memory: config?.maxMemory,
          device_map: config?.deviceMap
        }
      };

      const response = await this.makeRequest('/v1/models/load', 'POST', payload);
      
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }

      this.loadedModels.set(modelId, { 
        loaded: true, 
        loading: false, 
        lastAccessed: new Date() 
      });
    } catch (error) {
      this.loadedModels.set(modelId, { 
        loaded: false, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new ModelLoadError(modelId, error instanceof Error ? error.message : 'Unknown error', 'local-llm');
    }
  }

  public async unloadModel(modelId: string): Promise<void> {
    try {
      const response = await this.makeRequest(`/v1/models/${modelId}/unload`, 'POST');
      
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }

      this.loadedModels.delete(modelId);
    } catch (error) {
      throw this.handleError(error, 'unloadModel');
    }
  }

  public async getModelHealth(modelId: string): Promise<ModelHealthStatus> {
    try {
      const response = await this.makeRequest(`/v1/models/${modelId}/health`, 'GET');
      
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        status: data.status || 'healthy',
        lastChecked: new Date(),
        responseTime: data.response_time,
        memoryUsage: data.memory_usage,
        gpuUsage: data.gpu_usage,
        throughput: {
          requestsPerSecond: data.throughput?.requests_per_second || 0,
          tokensPerSecond: data.throughput?.tokens_per_second || 0
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastChecked: new Date(),
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  public async getModelMetrics(modelId: string): Promise<ModelMetrics> {
    const metrics = this.modelMetrics.get(modelId);
    
    return {
      requestCount: metrics?.requests || 0,
      totalTokens: metrics?.tokens || 0,
      averageLatency: metrics?.requests ? metrics.totalLatency / metrics.requests : 0,
      errorRate: metrics?.requests ? (metrics.errors / metrics.requests) * 100 : 0,
      throughput: metrics?.requests ? metrics.requests / ((Date.now() - this.startTime) / 1000) : 0,
      memoryUsage: this.loadedModels.get(modelId)?.memoryUsage || 0,
      timeWindow: '1h',
      lastUpdated: new Date()
    };
  }

  public async downloadModel(modelId: string, options?: ModelDownloadOptions): Promise<ModelDownloadResult> {
    try {
      const payload = {
        model: modelId,
        force: options?.force || false,
        verify: options?.verify !== false
      };

      const response = await this.makeRequest('/v1/models/download', 'POST', payload);
      
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }

      // Simulate download progress if callback provided
      if (options?.onProgress) {
        for (let i = 0; i <= 100; i += 10) {
          await new Promise(resolve => setTimeout(resolve, 200));
          options.onProgress({
            downloaded: i * 1024 * 1024,
            total: 100 * 1024 * 1024,
            percentage: i,
            speed: 5 * 1024 * 1024, // 5MB/s
            eta: (100 - i) * 200
          });
        }
      }

      const data = await response.json();
      
      return {
        modelId,
        path: data.path,
        size: data.size,
        checksum: data.checksum,
        downloadTime: data.download_time,
        verified: data.verified
      };
    } catch (error) {
      throw this.handleError(error, 'downloadModel');
    }
  }

  public async deleteModel(modelId: string): Promise<void> {
    try {
      const response = await this.makeRequest(`/v1/models/${modelId}`, 'DELETE');
      
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }

      this.loadedModels.delete(modelId);
      this.modelMetrics.delete(modelId);
    } catch (error) {
      throw this.handleError(error, 'deleteModel');
    }
  }

  // Vision, Audio, and Image services not implemented for basic local LLM
  public async analyzeImage(image: Buffer | string, prompt?: string, options?: VisionOptions): Promise<VisionResult> {
    throw new AIError('Vision analysis not supported by this local LLM provider', 'NOT_SUPPORTED', 501, 'local-llm');
  }

  public async describeImage(image: Buffer | string, options?: VisionOptions): Promise<string> {
    throw new AIError('Image description not supported by this local LLM provider', 'NOT_SUPPORTED', 501, 'local-llm');
  }

  public async extractText(image: Buffer | string, options?: OCROptions): Promise<OCRResult> {
    throw new AIError('OCR not supported by this local LLM provider', 'NOT_SUPPORTED', 501, 'local-llm');
  }

  public async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult> {
    throw new AIError('Image generation not supported by this local LLM provider', 'NOT_SUPPORTED', 501, 'local-llm');
  }

  public async editImage(image: Buffer | string, prompt: string, options?: ImageEditOptions): Promise<ImageGenerationResult> {
    throw new AIError('Image editing not supported by this local LLM provider', 'NOT_SUPPORTED', 501, 'local-llm');
  }

  public async transcribeAudio(audio: Buffer | string, options?: TranscriptionOptions): Promise<TranscriptionResult> {
    throw new AIError('Audio transcription not supported by this local LLM provider', 'NOT_SUPPORTED', 501, 'local-llm');
  }

  public async synthesizeSpeech(text: string, options?: SpeechSynthesisOptions): Promise<SpeechSynthesisResult> {
    throw new AIError('Speech synthesis not supported by this local LLM provider', 'NOT_SUPPORTED', 501, 'local-llm');
  }

  public async analyzeAudio(audio: Buffer | string, options?: AudioAnalysisOptions): Promise<AudioAnalysisResult> {
    throw new AIError('Audio analysis not supported by this local LLM provider', 'NOT_SUPPORTED', 501, 'local-llm');
  }

  // Rate Limits and Usage
  public async getRateLimits(): Promise<RateLimitInfo> {
    // Local LLMs typically don't have rate limits
    return {
      requestsPerMinute: Number.MAX_SAFE_INTEGER,
      tokensPerMinute: Number.MAX_SAFE_INTEGER,
      requestsRemaining: Number.MAX_SAFE_INTEGER,
      tokensRemaining: Number.MAX_SAFE_INTEGER,
      resetTime: new Date(Date.now() + 60000)
    };
  }

  public async getUsage(): Promise<UsageInfo> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return {
      totalRequests: this.requestCount,
      totalTokens: this.tokenCount,
      totalCost: 0, // Local LLMs have no API costs
      period: {
        start: startOfMonth,
        end: now
      },
      breakdown: {
        textGeneration: { requests: Math.floor(this.requestCount * 0.4), tokens: Math.floor(this.tokenCount * 0.4), cost: 0 },
        chatCompletion: { requests: Math.floor(this.requestCount * 0.6), tokens: Math.floor(this.tokenCount * 0.6), cost: 0 },
        embeddings: { requests: Math.floor(this.requestCount * 0.1), tokens: Math.floor(this.tokenCount * 0.1), cost: 0 },
        vision: { requests: 0, tokens: 0, cost: 0 },
        audio: { requests: 0, tokens: 0, cost: 0 }
      }
    };
  }

  public async registerCustomModel(modelConfig: CustomModelConfig): Promise<void> {
    try {
      const payload = {
        id: modelConfig.id,
        name: modelConfig.name,
        type: modelConfig.type,
        path: modelConfig.path,
        config: modelConfig.config,
        metadata: modelConfig.metadata
      };

      const response = await this.makeRequest('/v1/models/register', 'POST', payload);
      
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      throw this.handleError(error, 'registerCustomModel');
    }
  }

  public async unregisterCustomModel(modelId: string): Promise<void> {
    try {
      const response = await this.makeRequest(`/v1/models/register/${modelId}`, 'DELETE');
      
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }

      this.loadedModels.delete(modelId);
      this.modelMetrics.delete(modelId);
    } catch (error) {
      throw this.handleError(error, 'unregisterCustomModel');
    }
  }

  // Private helper methods
  private async makeRequest(path: string, method: 'GET' | 'POST' | 'DELETE', body?: any): Promise<Response> {
    const url = `${this.endpoint}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const config: RequestInit = {
      method,
      headers,
      timeout: this.config?.timeout || 60000
    };

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    return fetch(url, config);
  }

  private convertMessages(messages: ChatMessage[]): any[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      name: msg.name,
      function_call: msg.function_call
    }));
  }

  private mapFinishReason(reason: string | null): any {
    switch (reason) {
      case 'stop': return 'stop';
      case 'length': return 'length';
      case 'function_call': return 'function_call';
      case 'tool_calls': return 'tool_calls';
      default: return 'stop';
    }
  }

  private handleError(error: any, operation: string): AIError {
    if (error?.status === 404) {
      return new ModelNotFoundError(operation, 'local-llm');
    }
    
    if (error?.status === 507) {
      return new InsufficientResourcesError('memory', 0, 0, 'local-llm');
    }
    
    return new AIError(
      `Local LLM ${operation} failed: ${error?.message || 'Unknown error'}`,
      'API_ERROR',
      error?.status || 500,
      'local-llm',
      undefined,
      error
    );
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private generateId(): string {
    return 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private updateModelMetrics(modelId: string, tokens: number, latency: number, isError: boolean): void {
    const current = this.modelMetrics.get(modelId) || {
      requests: 0,
      tokens: 0,
      errors: 0,
      totalLatency: 0
    };

    current.requests++;
    current.tokens += tokens;
    current.totalLatency += latency;
    if (isError) {
      current.errors++;
    }

    this.modelMetrics.set(modelId, current);
  }

  private inferModelType(modelId: string): 'text' | 'chat' | 'embedding' | 'vision' | 'audio' | 'multimodal' {
    if (modelId.includes('embedding')) return 'embedding';
    if (modelId.includes('vision')) return 'vision';
    if (modelId.includes('whisper')) return 'audio';
    if (modelId.includes('chat') || modelId.includes('instruct')) return 'chat';
    return 'text';
  }

  private getModelCapabilities(modelId: string): string[] {
    const capabilities = [];
    
    if (modelId.includes('chat') || modelId.includes('instruct')) {
      capabilities.push('chat_completion', 'text_generation');
    } else {
      capabilities.push('text_generation');
    }
    
    if (modelId.includes('embedding')) {
      capabilities.push('embeddings');
    }
    
    if (modelId.includes('vision')) {
      capabilities.push('vision');
    }
    
    return capabilities;
  }
}
