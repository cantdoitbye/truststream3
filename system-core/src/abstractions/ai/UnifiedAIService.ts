/**
 * Unified AI Service
 * Provides unified AI interface across different providers with caching, retries, and events
 */

import { EventEmitter } from 'events';
import {
  IAIProvider,
  AIConfig,
  AIStats,
  AIEvent,
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
  ProviderCapabilities,
  AIFeature,
  AIError,
  RateLimitError
} from './ai.interface';
import { AIProviderFactory } from './providers/provider-factory';

export interface UnifiedAIServiceOptions {
  autoConnect?: boolean;
  enableEvents?: boolean;
  enableCaching?: boolean;
  cacheTimeout?: number;
  enableMetrics?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  enableRateLimitHandling?: boolean;
  maxConcurrentRequests?: number;
  enableModelPooling?: boolean;
  enableFailover?: boolean;
  fallbackProviders?: string[];
}

interface CacheEntry<T> {
  data: T;
  expiry: number;
  hits: number;
}

interface RequestMetrics {
  startTime: number;
  endTime?: number;
  tokens?: number;
  cost?: number;
  model?: string;
  type: string;
}

export class UnifiedAIService extends EventEmitter {
  private provider: IAIProvider | null = null;
  private config: AIConfig | null = null;
  private options: Required<UnifiedAIServiceOptions>;
  private isConnectedFlag = false;
  
  // Caching system
  private textCache = new Map<string, CacheEntry<TextGenerationResult>>();
  private chatCache = new Map<string, CacheEntry<ChatCompletionResult>>();
  private embeddingCache = new Map<string, CacheEntry<EmbeddingResult>>();
  private visionCache = new Map<string, CacheEntry<VisionResult>>();
  
  // Metrics and monitoring
  private requestMetrics = new Map<string, RequestMetrics>();
  private stats = {
    totalRequests: 0,
    totalTokens: 0,
    totalCost: 0,
    errorCount: 0,
    cacheHits: 0,
    rateLimitHits: 0
  };
  
  // Rate limiting and concurrency
  private activeRequests = new Set<string>();
  private requestQueue: Array<() => Promise<any>> = [];
  private rateLimitResetTime: Date | null = null;
  
  // Model pooling
  private loadedModels = new Set<string>();
  private modelUsage = new Map<string, number>();
  
  constructor(options: UnifiedAIServiceOptions = {}) {
    super();
    
    this.options = {
      autoConnect: options.autoConnect ?? true,
      enableEvents: options.enableEvents ?? true,
      enableCaching: options.enableCaching ?? true,
      cacheTimeout: options.cacheTimeout ?? 300000, // 5 minutes
      enableMetrics: options.enableMetrics ?? true,
      retryAttempts: options.retryAttempts ?? 3,
      retryDelay: options.retryDelay ?? 1000,
      enableRateLimitHandling: options.enableRateLimitHandling ?? true,
      maxConcurrentRequests: options.maxConcurrentRequests ?? 10,
      enableModelPooling: options.enableModelPooling ?? true,
      enableFailover: options.enableFailover ?? false,
      fallbackProviders: options.fallbackProviders ?? []
    };
    
    // Setup cleanup intervals
    this.setupCleanupIntervals();
  }

  /**
   * Connect to AI provider
   */
  async connect(config: AIConfig): Promise<void> {
    try {
      this.config = config;
      
      // Create provider instance
      this.provider = await AIProviderFactory.getInstance().createProvider(config);
      
      // Initialize and connect
      await this.provider.initialize(config);
      await this.provider.connect();
      
      this.isConnectedFlag = true;
      
      // Setup event forwarding
      if (this.options.enableEvents) {
        this.setupEventForwarding();
      }
      
      this.emit('connected', { provider: config.type });
      
    } catch (error) {
      this.emit('connection:failed', { error });
      throw error;
    }
  }

  /**
   * Disconnect from AI provider
   */
  async disconnect(): Promise<void> {
    try {
      if (this.provider) {
        await this.provider.disconnect();
      }
      
      this.isConnectedFlag = false;
      this.provider = null;
      this.config = null;
      
      // Clear caches and state
      this.clearCaches();
      this.activeRequests.clear();
      this.requestQueue.length = 0;
      this.loadedModels.clear();
      this.modelUsage.clear();
      
      this.emit('disconnected');
      
    } catch (error) {
      this.emit('disconnection:failed', { error });
      throw error;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.isConnectedFlag && this.provider?.isConnected() === true;
  }

  /**
   * Get service statistics
   */
  async getStats(): Promise<AIStats> {
    this.ensureConnected();
    
    const providerStats = await this.provider!.getStats();
    
    return {
      ...providerStats,
      cacheHitRate: this.calculateCacheHitRate(),
      timestamp: new Date(),
      usage: {
        ...providerStats.usage,
        textGeneration: this.stats.totalRequests
      }
    };
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(): ProviderCapabilities {
    this.ensureConnected();
    return this.provider!.getCapabilities();
  }

  /**
   * Check if feature is supported
   */
  supportsFeature(feature: AIFeature): boolean {
    return this.isConnected() && this.provider!.supportsFeature(feature);
  }

  // Text Generation
  async generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult> {
    this.ensureConnected();
    
    const cacheKey = this.getCacheKey('text', { prompt, ...options });
    
    // Check cache first
    if (this.options.enableCaching) {
      const cached = this.getFromCache(this.textCache, cacheKey);
      if (cached) {
        this.incrementCacheHits();
        this.emit('cache:hit', { type: 'text', key: cacheKey });
        return cached;
      }
    }
    
    const requestId = this.generateRequestId();
    const metrics = this.startRequestMetrics(requestId, 'text');
    
    try {
      await this.handleRateLimit();
      await this.handleConcurrency(requestId);
      
      const result = await this.executeWithRetry(async () => {
        return this.provider!.generateText(prompt, options);
      });
      
      // Cache the result
      if (this.options.enableCaching) {
        this.setCache(this.textCache, cacheKey, result);
      }
      
      // Update metrics
      this.endRequestMetrics(requestId, {
        tokens: result.usage.totalTokens,
        model: result.model
      });
      
      // Emit events
      if (this.options.enableEvents) {
        this.emit('text:generated', {
          prompt: prompt.substring(0, 100),
          tokens: result.usage.totalTokens,
          model: result.model,
          duration: Date.now() - metrics.startTime
        });
      }
      
      return result;
      
    } catch (error) {
      this.handleRequestError(requestId, error);
      throw error;
    } finally {
      this.activeRequests.delete(requestId);
      this.processQueue();
    }
  }

  async *streamText(prompt: string, options?: TextGenerationOptions): AsyncIterable<TextStreamChunk> {
    this.ensureConnected();
    
    const requestId = this.generateRequestId();
    const metrics = this.startRequestMetrics(requestId, 'text-stream');
    
    try {
      await this.handleRateLimit();
      await this.handleConcurrency(requestId);
      
      const stream = this.provider!.streamText(prompt, options);
      
      for await (const chunk of stream) {
        yield chunk;
      }
      
      this.endRequestMetrics(requestId);
      
    } catch (error) {
      this.handleRequestError(requestId, error);
      throw error;
    } finally {
      this.activeRequests.delete(requestId);
      this.processQueue();
    }
  }

  // Chat Completion
  async chatCompletion(messages: ChatMessage[], options?: ChatCompletionOptions): Promise<ChatCompletionResult> {
    this.ensureConnected();
    
    const cacheKey = this.getCacheKey('chat', { messages, ...options });
    
    // Check cache
    if (this.options.enableCaching) {
      const cached = this.getFromCache(this.chatCache, cacheKey);
      if (cached) {
        this.incrementCacheHits();
        this.emit('cache:hit', { type: 'chat', key: cacheKey });
        return cached;
      }
    }
    
    const requestId = this.generateRequestId();
    const metrics = this.startRequestMetrics(requestId, 'chat');
    
    try {
      await this.handleRateLimit();
      await this.handleConcurrency(requestId);
      
      const result = await this.executeWithRetry(async () => {
        return this.provider!.chatCompletion(messages, options);
      });
      
      // Cache the result
      if (this.options.enableCaching) {
        this.setCache(this.chatCache, cacheKey, result);
      }
      
      // Update metrics
      this.endRequestMetrics(requestId, {
        tokens: result.usage.totalTokens,
        model: result.model
      });
      
      // Emit events
      if (this.options.enableEvents) {
        this.emit('chat:completed', {
          messageCount: messages.length,
          tokens: result.usage.totalTokens,
          model: result.model,
          duration: Date.now() - metrics.startTime
        });
      }
      
      return result;
      
    } catch (error) {
      this.handleRequestError(requestId, error);
      throw error;
    } finally {
      this.activeRequests.delete(requestId);
      this.processQueue();
    }
  }

  async *streamChatCompletion(messages: ChatMessage[], options?: ChatCompletionOptions): AsyncIterable<ChatStreamChunk> {
    this.ensureConnected();
    
    const requestId = this.generateRequestId();
    const metrics = this.startRequestMetrics(requestId, 'chat-stream');
    
    try {
      await this.handleRateLimit();
      await this.handleConcurrency(requestId);
      
      const stream = this.provider!.streamChatCompletion(messages, options);
      
      for await (const chunk of stream) {
        yield chunk;
      }
      
      this.endRequestMetrics(requestId);
      
    } catch (error) {
      this.handleRequestError(requestId, error);
      throw error;
    } finally {
      this.activeRequests.delete(requestId);
      this.processQueue();
    }
  }

  // Code Generation
  async generateCode(prompt: string, language: string, options?: CodeGenerationOptions): Promise<CodeGenerationResult> {
    this.ensureConnected();
    
    const requestId = this.generateRequestId();
    const metrics = this.startRequestMetrics(requestId, 'code');
    
    try {
      await this.handleRateLimit();
      await this.handleConcurrency(requestId);
      
      const result = await this.executeWithRetry(async () => {
        return this.provider!.generateCode(prompt, language, options);
      });
      
      this.endRequestMetrics(requestId, {
        tokens: result.usage.totalTokens,
        model: result.model
      });
      
      return result;
      
    } catch (error) {
      this.handleRequestError(requestId, error);
      throw error;
    } finally {
      this.activeRequests.delete(requestId);
      this.processQueue();
    }
  }

  // Function Calling
  async callFunction(messages: ChatMessage[], functions: FunctionDefinition[], options?: FunctionCallOptions): Promise<FunctionCallResult> {
    this.ensureConnected();
    
    const requestId = this.generateRequestId();
    const metrics = this.startRequestMetrics(requestId, 'function');
    
    try {
      await this.handleRateLimit();
      await this.handleConcurrency(requestId);
      
      const result = await this.executeWithRetry(async () => {
        return this.provider!.callFunction(messages, functions, options);
      });
      
      this.endRequestMetrics(requestId);
      
      return result;
      
    } catch (error) {
      this.handleRequestError(requestId, error);
      throw error;
    } finally {
      this.activeRequests.delete(requestId);
      this.processQueue();
    }
  }

  // Embeddings
  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult> {
    this.ensureConnected();
    
    const cacheKey = this.getCacheKey('embedding', { text, ...options });
    
    // Check cache
    if (this.options.enableCaching) {
      const cached = this.getFromCache(this.embeddingCache, cacheKey);
      if (cached) {
        this.incrementCacheHits();
        this.emit('cache:hit', { type: 'embedding', key: cacheKey });
        return cached;
      }
    }
    
    const requestId = this.generateRequestId();
    const metrics = this.startRequestMetrics(requestId, 'embedding');
    
    try {
      await this.handleRateLimit();
      await this.handleConcurrency(requestId);
      
      const result = await this.executeWithRetry(async () => {
        return this.provider!.generateEmbedding(text, options);
      });
      
      // Cache the result
      if (this.options.enableCaching) {
        this.setCache(this.embeddingCache, cacheKey, result);
      }
      
      this.endRequestMetrics(requestId, {
        tokens: result.usage.totalTokens,
        model: result.model
      });
      
      return result;
      
    } catch (error) {
      this.handleRequestError(requestId, error);
      throw error;
    } finally {
      this.activeRequests.delete(requestId);
      this.processQueue();
    }
  }

  async generateEmbeddings(texts: string[], options?: EmbeddingOptions): Promise<EmbeddingResult[]> {
    this.ensureConnected();
    
    const requestId = this.generateRequestId();
    const metrics = this.startRequestMetrics(requestId, 'embeddings');
    
    try {
      await this.handleRateLimit();
      await this.handleConcurrency(requestId);
      
      const results = await this.executeWithRetry(async () => {
        return this.provider!.generateEmbeddings(texts, options);
      });
      
      this.endRequestMetrics(requestId);
      
      return results;
      
    } catch (error) {
      this.handleRequestError(requestId, error);
      throw error;
    } finally {
      this.activeRequests.delete(requestId);
      this.processQueue();
    }
  }

  // Semantic Search
  async semanticSearch(query: string, documents: string[], options?: SemanticSearchOptions): Promise<SemanticSearchResult[]> {
    this.ensureConnected();
    return this.provider!.semanticSearch(query, documents, options);
  }

  async calculateSimilarity(text1: string, text2: string, options?: SimilarityOptions): Promise<number> {
    this.ensureConnected();
    return this.provider!.calculateSimilarity(text1, text2, options);
  }

  async clusterTexts(texts: string[], options?: ClusteringOptions): Promise<ClusteringResult> {
    this.ensureConnected();
    return this.provider!.clusterTexts(texts, options);
  }

  // Model Management
  async listModels(): Promise<ModelInfo[]> {
    this.ensureConnected();
    return this.provider!.listModels();
  }

  async getModel(modelId: string): Promise<ModelInfo | null> {
    this.ensureConnected();
    return this.provider!.getModel(modelId);
  }

  async loadModel(modelId: string, config?: ModelLoadConfig): Promise<void> {
    this.ensureConnected();
    
    try {
      await this.provider!.loadModel(modelId, config);
      
      if (this.options.enableModelPooling) {
        this.loadedModels.add(modelId);
        this.modelUsage.set(modelId, 0);
      }
      
      this.emit('model:loaded', { modelId });
      
    } catch (error) {
      this.emit('model:load:failed', { modelId, error });
      throw error;
    }
  }

  async unloadModel(modelId: string): Promise<void> {
    this.ensureConnected();
    
    try {
      await this.provider!.unloadModel(modelId);
      
      if (this.options.enableModelPooling) {
        this.loadedModels.delete(modelId);
        this.modelUsage.delete(modelId);
      }
      
      this.emit('model:unloaded', { modelId });
      
    } catch (error) {
      this.emit('model:unload:failed', { modelId, error });
      throw error;
    }
  }

  async getModelHealth(modelId: string): Promise<ModelHealthStatus> {
    this.ensureConnected();
    return this.provider!.getModelHealth(modelId);
  }

  async getModelMetrics(modelId: string): Promise<ModelMetrics> {
    this.ensureConnected();
    return this.provider!.getModelMetrics(modelId);
  }

  async downloadModel(modelId: string, options?: ModelDownloadOptions): Promise<ModelDownloadResult> {
    this.ensureConnected();
    return this.provider!.downloadModel(modelId, options);
  }

  async deleteModel(modelId: string): Promise<void> {
    this.ensureConnected();
    return this.provider!.deleteModel(modelId);
  }

  // Vision Services
  async analyzeImage(image: Buffer | string, prompt?: string, options?: VisionOptions): Promise<VisionResult> {
    this.ensureConnected();
    
    const cacheKey = this.getCacheKey('vision', { image: typeof image === 'string' ? image : 'buffer', prompt, ...options });
    
    // Check cache
    if (this.options.enableCaching && typeof image === 'string') {
      const cached = this.getFromCache(this.visionCache, cacheKey);
      if (cached) {
        this.incrementCacheHits();
        return cached;
      }
    }
    
    const requestId = this.generateRequestId();
    const metrics = this.startRequestMetrics(requestId, 'vision');
    
    try {
      await this.handleRateLimit();
      await this.handleConcurrency(requestId);
      
      const result = await this.executeWithRetry(async () => {
        return this.provider!.analyzeImage(image, prompt, options);
      });
      
      // Cache the result (only for URL-based images)
      if (this.options.enableCaching && typeof image === 'string') {
        this.setCache(this.visionCache, cacheKey, result);
      }
      
      this.endRequestMetrics(requestId, {
        tokens: result.usage?.totalTokens,
        model: options?.model
      });
      
      return result;
      
    } catch (error) {
      this.handleRequestError(requestId, error);
      throw error;
    } finally {
      this.activeRequests.delete(requestId);
      this.processQueue();
    }
  }

  async describeImage(image: Buffer | string, options?: VisionOptions): Promise<string> {
    this.ensureConnected();
    return this.provider!.describeImage(image, options);
  }

  async extractText(image: Buffer | string, options?: OCROptions): Promise<OCRResult> {
    this.ensureConnected();
    return this.provider!.extractText(image, options);
  }

  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult> {
    this.ensureConnected();
    
    const requestId = this.generateRequestId();
    const metrics = this.startRequestMetrics(requestId, 'image-generation');
    
    try {
      await this.handleRateLimit();
      await this.handleConcurrency(requestId);
      
      const result = await this.executeWithRetry(async () => {
        return this.provider!.generateImage(prompt, options);
      });
      
      this.endRequestMetrics(requestId, {
        model: result.model
      });
      
      return result;
      
    } catch (error) {
      this.handleRequestError(requestId, error);
      throw error;
    } finally {
      this.activeRequests.delete(requestId);
      this.processQueue();
    }
  }

  async editImage(image: Buffer | string, prompt: string, options?: ImageEditOptions): Promise<ImageGenerationResult> {
    this.ensureConnected();
    return this.provider!.editImage(image, prompt, options);
  }

  // Audio Services
  async transcribeAudio(audio: Buffer | string, options?: TranscriptionOptions): Promise<TranscriptionResult> {
    this.ensureConnected();
    
    const requestId = this.generateRequestId();
    const metrics = this.startRequestMetrics(requestId, 'transcription');
    
    try {
      await this.handleRateLimit();
      await this.handleConcurrency(requestId);
      
      const result = await this.executeWithRetry(async () => {
        return this.provider!.transcribeAudio(audio, options);
      });
      
      this.endRequestMetrics(requestId, {
        model: options?.model
      });
      
      return result;
      
    } catch (error) {
      this.handleRequestError(requestId, error);
      throw error;
    } finally {
      this.activeRequests.delete(requestId);
      this.processQueue();
    }
  }

  async synthesizeSpeech(text: string, options?: SpeechSynthesisOptions): Promise<SpeechSynthesisResult> {
    this.ensureConnected();
    
    const requestId = this.generateRequestId();
    const metrics = this.startRequestMetrics(requestId, 'speech-synthesis');
    
    try {
      await this.handleRateLimit();
      await this.handleConcurrency(requestId);
      
      const result = await this.executeWithRetry(async () => {
        return this.provider!.synthesizeSpeech(text, options);
      });
      
      this.endRequestMetrics(requestId, {
        model: options?.model
      });
      
      return result;
      
    } catch (error) {
      this.handleRequestError(requestId, error);
      throw error;
    } finally {
      this.activeRequests.delete(requestId);
      this.processQueue();
    }
  }

  async analyzeAudio(audio: Buffer | string, options?: AudioAnalysisOptions): Promise<AudioAnalysisResult> {
    this.ensureConnected();
    return this.provider!.analyzeAudio(audio, options);
  }

  // Rate Limits and Usage
  async getRateLimits(): Promise<RateLimitInfo> {
    this.ensureConnected();
    return this.provider!.getRateLimits();
  }

  async getUsage(): Promise<UsageInfo> {
    this.ensureConnected();
    return this.provider!.getUsage();
  }

  // Custom Models
  async registerCustomModel(modelConfig: CustomModelConfig): Promise<void> {
    this.ensureConnected();
    return this.provider!.registerCustomModel(modelConfig);
  }

  async unregisterCustomModel(modelId: string): Promise<void> {
    this.ensureConnected();
    return this.provider!.unregisterCustomModel(modelId);
  }

  // Private helper methods
  private ensureConnected(): void {
    if (!this.isConnected()) {
      throw new AIError('AI service is not connected', 'NOT_CONNECTED', 503);
    }
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.options.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Don't retry certain errors
        if (error instanceof RateLimitError || 
            (error instanceof AIError && error.statusCode === 400)) {
          throw error;
        }
        
        if (attempt === this.options.retryAttempts) {
          throw lastError;
        }
        
        // Exponential backoff
        const delay = this.options.retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  private async handleRateLimit(): Promise<void> {
    if (!this.options.enableRateLimitHandling) return;
    
    if (this.rateLimitResetTime && new Date() < this.rateLimitResetTime) {
      const waitTime = this.rateLimitResetTime.getTime() - Date.now();
      this.emit('rate_limit:waiting', { waitTime });
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  private async handleConcurrency(requestId: string): Promise<void> {
    if (this.activeRequests.size >= this.options.maxConcurrentRequests) {
      // Queue the request
      await new Promise<void>((resolve) => {
        this.requestQueue.push(async () => {
          this.activeRequests.add(requestId);
          resolve();
        });
      });
    } else {
      this.activeRequests.add(requestId);
    }
  }

  private processQueue(): void {
    if (this.requestQueue.length > 0 && this.activeRequests.size < this.options.maxConcurrentRequests) {
      const nextRequest = this.requestQueue.shift();
      if (nextRequest) {
        nextRequest();
      }
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startRequestMetrics(requestId: string, type: string): RequestMetrics {
    const metrics: RequestMetrics = {
      startTime: Date.now(),
      type
    };
    
    this.requestMetrics.set(requestId, metrics);
    this.stats.totalRequests++;
    
    return metrics;
  }

  private endRequestMetrics(requestId: string, data?: Partial<RequestMetrics>): void {
    const metrics = this.requestMetrics.get(requestId);
    if (metrics) {
      metrics.endTime = Date.now();
      if (data) {
        Object.assign(metrics, data);
      }
      
      if (metrics.tokens) {
        this.stats.totalTokens += metrics.tokens;
      }
      if (metrics.cost) {
        this.stats.totalCost += metrics.cost;
      }
      
      // Clean up old metrics
      setTimeout(() => this.requestMetrics.delete(requestId), 60000);
    }
  }

  private handleRequestError(requestId: string, error: any): void {
    this.stats.errorCount++;
    
    if (error instanceof RateLimitError) {
      this.stats.rateLimitHits++;
      if (error.metadata?.resetTime) {
        this.rateLimitResetTime = error.metadata.resetTime;
      }
    }
    
    this.emit('request:error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      type: this.requestMetrics.get(requestId)?.type
    });
  }

  private getCacheKey(type: string, data: any): string {
    return `${type}:${JSON.stringify(data)}`;
  }

  private getFromCache<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
    const entry = cache.get(key);
    if (entry && entry.expiry > Date.now()) {
      entry.hits++;
      return entry.data;
    }
    
    if (entry) {
      cache.delete(key);
    }
    
    return null;
  }

  private setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
    const expiry = Date.now() + this.options.cacheTimeout;
    cache.set(key, { data, expiry, hits: 0 });
  }

  private clearCaches(): void {
    this.textCache.clear();
    this.chatCache.clear();
    this.embeddingCache.clear();
    this.visionCache.clear();
  }

  private incrementCacheHits(): void {
    this.stats.cacheHits++;
  }

  private calculateCacheHitRate(): number {
    const totalRequests = this.stats.totalRequests;
    const cacheHits = this.stats.cacheHits;
    return totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;
  }

  private setupEventForwarding(): void {
    if (!this.provider) return;
    
    // Forward provider events
    // This would depend on the specific provider implementation
  }

  private setupCleanupIntervals(): void {
    // Clean up expired cache entries every 5 minutes
    setInterval(() => {
      this.cleanupCache(this.textCache);
      this.cleanupCache(this.chatCache);
      this.cleanupCache(this.embeddingCache);
      this.cleanupCache(this.visionCache);
    }, 300000);
    
    // Clean up old request metrics every hour
    setInterval(() => {
      const cutoff = Date.now() - 3600000; // 1 hour ago
      for (const [id, metrics] of this.requestMetrics.entries()) {
        if (metrics.startTime < cutoff) {
          this.requestMetrics.delete(id);
        }
      }
    }, 3600000);
  }

  private cleanupCache<T>(cache: Map<string, CacheEntry<T>>): void {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (entry.expiry <= now) {
        cache.delete(key);
      }
    }
  }
}

// Default instance
export const unifiedAIService = new UnifiedAIService();
