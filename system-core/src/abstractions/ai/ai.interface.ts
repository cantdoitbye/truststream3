/**
 * AI Service Abstraction Layer Interface
 * Provides comprehensive interfaces for LLM inference, embeddings, and AI model management
 */

import { EventEmitter } from 'events';

// Core AI Service Interfaces
export interface ILLMInferenceService {
  // Text generation
  generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult>;
  streamText(prompt: string, options?: TextGenerationOptions): AsyncIterable<TextStreamChunk>;
  
  // Chat completion
  chatCompletion(messages: ChatMessage[], options?: ChatCompletionOptions): Promise<ChatCompletionResult>;
  streamChatCompletion(messages: ChatMessage[], options?: ChatCompletionOptions): AsyncIterable<ChatStreamChunk>;
  
  // Code generation
  generateCode(prompt: string, language: string, options?: CodeGenerationOptions): Promise<CodeGenerationResult>;
  
  // Function calling
  callFunction(messages: ChatMessage[], functions: FunctionDefinition[], options?: FunctionCallOptions): Promise<FunctionCallResult>;
}

export interface IEmbeddingService {
  // Text embeddings
  generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult>;
  generateEmbeddings(texts: string[], options?: EmbeddingOptions): Promise<EmbeddingResult[]>;
  
  // Semantic search
  semanticSearch(query: string, documents: string[], options?: SemanticSearchOptions): Promise<SemanticSearchResult[]>;
  
  // Similarity operations
  calculateSimilarity(text1: string, text2: string, options?: SimilarityOptions): Promise<number>;
  clusterTexts(texts: string[], options?: ClusteringOptions): Promise<ClusteringResult>;
}

export interface IModelManagementService {
  // Model operations
  listModels(): Promise<ModelInfo[]>;
  getModel(modelId: string): Promise<ModelInfo | null>;
  loadModel(modelId: string, config?: ModelLoadConfig): Promise<void>;
  unloadModel(modelId: string): Promise<void>;
  
  // Model health and metrics
  getModelHealth(modelId: string): Promise<ModelHealthStatus>;
  getModelMetrics(modelId: string): Promise<ModelMetrics>;
  
  // Local model management
  downloadModel(modelId: string, options?: ModelDownloadOptions): Promise<ModelDownloadResult>;
  deleteModel(modelId: string): Promise<void>;
}

export interface IVisionService {
  // Image analysis
  analyzeImage(image: Buffer | string, prompt?: string, options?: VisionOptions): Promise<VisionResult>;
  describeImage(image: Buffer | string, options?: VisionOptions): Promise<string>;
  
  // OCR and text extraction
  extractText(image: Buffer | string, options?: OCROptions): Promise<OCRResult>;
  
  // Image generation
  generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult>;
  editImage(image: Buffer | string, prompt: string, options?: ImageEditOptions): Promise<ImageGenerationResult>;
}

export interface IAudioService {
  // Speech-to-text
  transcribeAudio(audio: Buffer | string, options?: TranscriptionOptions): Promise<TranscriptionResult>;
  
  // Text-to-speech
  synthesizeSpeech(text: string, options?: SpeechSynthesisOptions): Promise<SpeechSynthesisResult>;
  
  // Audio analysis
  analyzeAudio(audio: Buffer | string, options?: AudioAnalysisOptions): Promise<AudioAnalysisResult>;
}

// Provider-specific interface
export interface IAIProvider extends ILLMInferenceService, IEmbeddingService, IModelManagementService, IVisionService, IAudioService {
  // Provider lifecycle
  initialize(config: AIConfig): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getProviderName(): string;
  
  // Health and monitoring
  healthCheck(): Promise<ProviderHealthStatus>;
  getStats(): Promise<AIStats>;
  
  // Capabilities
  getCapabilities(): ProviderCapabilities;
  supportsFeature(feature: AIFeature): boolean;
  
  // Rate limiting and quotas
  getRateLimits(): Promise<RateLimitInfo>;
  getUsage(): Promise<UsageInfo>;
  
  // Model registry
  registerCustomModel(modelConfig: CustomModelConfig): Promise<void>;
  unregisterCustomModel(modelId: string): Promise<void>;
}

// Configuration interfaces
export interface AIConfig {
  type: 'openai' | 'anthropic' | 'local-llm' | 'huggingface' | 'ollama' | 'azure' | 'mock';
  
  // Provider-specific configs
  openai?: {
    apiKey: string;
    baseURL?: string;
    organization?: string;
    project?: string;
  };
  
  anthropic?: {
    apiKey: string;
    baseURL?: string;
  };
  
  localLLM?: {
    endpoint: string;
    apiKey?: string;
    modelPath?: string;
    gpu?: boolean;
    maxContextLength?: number;
  };
  
  huggingface?: {
    apiKey?: string;
    baseURL?: string;
    useInference?: boolean;
  };
  
  ollama?: {
    endpoint: string;
    timeout?: number;
  };
  
  azure?: {
    apiKey: string;
    endpoint: string;
    apiVersion?: string;
    deployment?: string;
  };
  
  // Common options
  timeout?: number;
  retryAttempts?: number;
  rateLimiting?: {
    requestsPerMinute?: number;
    tokensPerMinute?: number;
  };
  caching?: {
    enabled: boolean;
    ttl?: number;
    maxSize?: number;
  };
  monitoring?: {
    enabled: boolean;
    logRequests?: boolean;
    collectMetrics?: boolean;
  };
}

// Data types and options
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
}

export interface TextGenerationOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  stop?: string[];
  stream?: boolean;
  logprobs?: number;
  echo?: boolean;
  presencePenalty?: number;
  frequencyPenalty?: number;
  seed?: number;
  user?: string;
}

export interface ChatCompletionOptions extends TextGenerationOptions {
  functions?: FunctionDefinition[];
  functionCall?: 'auto' | 'none' | { name: string };
  tools?: ToolDefinition[];
  toolChoice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
}

export interface CodeGenerationOptions extends TextGenerationOptions {
  includeTests?: boolean;
  includeDocumentation?: boolean;
  framework?: string;
  style?: 'functional' | 'object-oriented' | 'procedural';
}

export interface FunctionDefinition {
  name: string;
  description?: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolDefinition {
  type: 'function';
  function: FunctionDefinition;
}

export interface FunctionCallOptions extends ChatCompletionOptions {
  parallel?: boolean;
  validate?: boolean;
}

export interface EmbeddingOptions {
  model?: string;
  dimensions?: number;
  inputType?: 'search_document' | 'search_query' | 'classification' | 'clustering';
  truncate?: 'none' | 'start' | 'end';
}

export interface SemanticSearchOptions {
  topK?: number;
  threshold?: number;
  includeMetadata?: boolean;
  filter?: Record<string, any>;
}

export interface SimilarityOptions {
  metric?: 'cosine' | 'euclidean' | 'dot_product';
  normalize?: boolean;
}

export interface ClusteringOptions {
  numClusters?: number;
  algorithm?: 'kmeans' | 'hierarchical' | 'dbscan';
  minSamples?: number;
  eps?: number;
}

export interface VisionOptions {
  model?: string;
  maxTokens?: number;
  detail?: 'low' | 'high' | 'auto';
  outputFormat?: 'text' | 'json' | 'structured';
}

export interface OCROptions {
  language?: string;
  preserveLayout?: boolean;
  outputFormat?: 'text' | 'json' | 'hocr';
}

export interface ImageGenerationOptions {
  model?: string;
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  responseFormat?: 'url' | 'b64_json';
  user?: string;
}

export interface ImageEditOptions extends ImageGenerationOptions {
  mask?: Buffer | string;
  strength?: number;
  guidance?: number;
  steps?: number;
}

export interface TranscriptionOptions {
  model?: string;
  language?: string;
  prompt?: string;
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  temperature?: number;
  timestampGranularities?: ('word' | 'segment')[];
}

export interface SpeechSynthesisOptions {
  model?: string;
  voice?: string;
  responseFormat?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';
  speed?: number;
}

export interface AudioAnalysisOptions {
  includeEmotions?: boolean;
  includeSentiment?: boolean;
  includeKeywords?: boolean;
  language?: string;
}

// Result types
export interface TextGenerationResult {
  text: string;
  finishReason: 'stop' | 'length' | 'function_call' | 'content_filter' | 'null';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  logprobs?: any;
  model: string;
  id: string;
  created: number;
}

export interface TextStreamChunk {
  text: string;
  finishReason?: 'stop' | 'length' | 'function_call' | 'content_filter' | 'null';
  logprobs?: any;
  index: number;
}

export interface ChatCompletionResult {
  message: ChatMessage;
  finishReason: 'stop' | 'length' | 'function_call' | 'tool_calls' | 'content_filter';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  id: string;
  created: number;
  toolCalls?: ToolCall[];
}

export interface ChatStreamChunk {
  delta: Partial<ChatMessage>;
  finishReason?: 'stop' | 'length' | 'function_call' | 'tool_calls' | 'content_filter';
  index: number;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface CodeGenerationResult extends TextGenerationResult {
  language: string;
  hasTests: boolean;
  hasDocumentation: boolean;
  complexity?: {
    cyclomatic: number;
    cognitive: number;
    maintainability: number;
  };
}

export interface FunctionCallResult {
  functionName: string;
  arguments: Record<string, any>;
  result: any;
  success: boolean;
  error?: string;
  executionTime: number;
}

export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

export interface SemanticSearchResult {
  text: string;
  score: number;
  index: number;
  metadata?: Record<string, any>;
}

export interface ClusteringResult {
  clusters: Array<{
    id: number;
    texts: string[];
    centroid: number[];
    size: number;
  }>;
  totalClusters: number;
  silhouetteScore?: number;
}

export interface VisionResult {
  description: string;
  confidence?: number;
  objects?: Array<{
    label: string;
    confidence: number;
    boundingBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  text?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface OCRResult {
  text: string;
  confidence: number;
  words?: Array<{
    text: string;
    confidence: number;
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  layout?: {
    pages: number;
    orientation: number;
  };
}

export interface ImageGenerationResult {
  url?: string;
  b64Json?: string;
  revisedPrompt?: string;
  size: string;
  model: string;
  created: number;
}

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  segments?: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
    words?: Array<{
      word: string;
      start: number;
      end: number;
      confidence: number;
    }>;
  }>;
}

export interface SpeechSynthesisResult {
  audio: Buffer;
  format: string;
  duration?: number;
  size: number;
}

export interface AudioAnalysisResult {
  transcript?: string;
  language?: string;
  duration: number;
  emotions?: Array<{
    emotion: string;
    confidence: number;
    timestamp?: number;
  }>;
  sentiment?: {
    polarity: number;
    subjectivity: number;
    label: 'positive' | 'negative' | 'neutral';
  };
  keywords?: Array<{
    word: string;
    relevance: number;
    frequency: number;
  }>;
}

// Model and provider info
export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  provider: string;
  type: 'text' | 'chat' | 'embedding' | 'vision' | 'audio' | 'multimodal';
  maxTokens?: number;
  contextLength?: number;
  pricing?: {
    inputCost: number;
    outputCost: number;
    unit: 'per_token' | 'per_request' | 'per_minute';
  };
  capabilities: string[];
  isLocal: boolean;
  status: 'available' | 'loading' | 'unavailable' | 'error';
  version?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModelLoadConfig {
  gpu?: boolean;
  quantization?: '4bit' | '8bit' | '16bit' | 'none';
  maxMemory?: number;
  deviceMap?: Record<string, number>;
  loadInBits?: number;
  optimizationLevel?: 'O1' | 'O2' | 'O3';
}

export interface ModelHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastChecked: Date;
  responseTime?: number;
  memoryUsage?: number;
  gpuUsage?: number;
  errors?: string[];
  throughput?: {
    requestsPerSecond: number;
    tokensPerSecond: number;
  };
}

export interface ModelMetrics {
  requestCount: number;
  totalTokens: number;
  averageLatency: number;
  errorRate: number;
  throughput: number;
  memoryUsage: number;
  gpuUtilization?: number;
  timeWindow: string;
  lastUpdated: Date;
}

export interface ModelDownloadOptions {
  force?: boolean;
  verify?: boolean;
  onProgress?: (progress: DownloadProgress) => void;
}

export interface ModelDownloadResult {
  modelId: string;
  path: string;
  size: number;
  checksum: string;
  downloadTime: number;
  verified: boolean;
}

export interface DownloadProgress {
  downloaded: number;
  total: number;
  percentage: number;
  speed: number;
  eta: number;
}

export interface CustomModelConfig {
  id: string;
  name: string;
  type: 'text' | 'chat' | 'embedding' | 'vision' | 'audio';
  path: string;
  config: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ProviderHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastChecked: Date;
  responseTime?: number;
  errors?: string[];
  metrics?: {
    uptime: number;
    requestCount: number;
    errorRate: number;
    avgResponseTime: number;
    rateLimitRemaining?: number;
  };
}

export interface AIStats {
  totalRequests: number;
  totalTokens: number;
  averageLatency: number;
  errorRate: number;
  providerName: string;
  modelsLoaded: number;
  cacheHitRate?: number;
  timestamp: Date;
  usage: {
    textGeneration: number;
    chatCompletion: number;
    embeddings: number;
    vision: number;
    audio: number;
  };
}

export interface ProviderCapabilities {
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
  rateLimiting: boolean;
  caching: boolean;
}

export type AIFeature = keyof ProviderCapabilities;

export interface RateLimitInfo {
  requestsPerMinute: number;
  tokensPerMinute: number;
  requestsRemaining: number;
  tokensRemaining: number;
  resetTime: Date;
}

export interface UsageInfo {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  period: {
    start: Date;
    end: Date;
  };
  breakdown: {
    textGeneration: { requests: number; tokens: number; cost: number };
    chatCompletion: { requests: number; tokens: number; cost: number };
    embeddings: { requests: number; tokens: number; cost: number };
    vision: { requests: number; tokens: number; cost: number };
    audio: { requests: number; tokens: number; cost: number };
  };
}

// Events
export interface AIEvent {
  type: 'request' | 'response' | 'error' | 'rate_limit' | 'model_loaded' | 'model_unloaded';
  timestamp: Date;
  provider: string;
  model?: string;
  duration?: number;
  tokenCount?: number;
  cost?: number;
  error?: string;
  metadata?: Record<string, any>;
}

// Error types
export class AIError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public provider?: string,
    public model?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'AIError';
  }
}

export class ModelNotFoundError extends AIError {
  constructor(modelId: string, provider?: string) {
    super(`Model not found: ${modelId}`, 'MODEL_NOT_FOUND', 404, provider, modelId);
    this.name = 'ModelNotFoundError';
  }
}

export class RateLimitError extends AIError {
  constructor(message: string, provider?: string, resetTime?: Date) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, provider);
    this.name = 'RateLimitError';
    if (resetTime) {
      this.metadata = { resetTime };
    }
  }

  metadata?: Record<string, any>;
}

export class ModelLoadError extends AIError {
  constructor(modelId: string, reason: string, provider?: string) {
    super(`Failed to load model ${modelId}: ${reason}`, 'MODEL_LOAD_FAILED', 500, provider, modelId);
    this.name = 'ModelLoadError';
  }
}

export class InsufficientResourcesError extends AIError {
  constructor(resource: string, required: number, available: number, provider?: string) {
    super(
      `Insufficient ${resource}: required ${required}, available ${available}`,
      'INSUFFICIENT_RESOURCES',
      507,
      provider
    );
    this.name = 'InsufficientResourcesError';
  }
}

// Base provider class
export abstract class BaseAIProvider extends EventEmitter implements IAIProvider {
  protected config: AIConfig | null = null;
  protected connected = false;
  protected healthStatus: ProviderHealthStatus = {
    status: 'unhealthy',
    lastChecked: new Date()
  };
  protected metrics: Partial<AIStats> = {};

  abstract getProviderName(): string;
  abstract initialize(config: AIConfig): Promise<void>;
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract getCapabilities(): ProviderCapabilities;

  public isConnected(): boolean {
    return this.connected;
  }

  public async healthCheck(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();
    
    try {
      await this.performHealthCheck();
      const responseTime = Date.now() - startTime;
      
      this.healthStatus = {
        status: 'healthy',
        lastChecked: new Date(),
        responseTime
      };
    } catch (error) {
      this.healthStatus = {
        status: 'unhealthy',
        lastChecked: new Date(),
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
    
    return this.healthStatus;
  }

  protected abstract performHealthCheck(): Promise<void>;

  public supportsFeature(feature: AIFeature): boolean {
    const capabilities = this.getCapabilities();
    return capabilities[feature] || false;
  }

  // Abstract methods that must be implemented by concrete providers
  abstract generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult>;
  abstract streamText(prompt: string, options?: TextGenerationOptions): AsyncIterable<TextStreamChunk>;
  abstract chatCompletion(messages: ChatMessage[], options?: ChatCompletionOptions): Promise<ChatCompletionResult>;
  abstract streamChatCompletion(messages: ChatMessage[], options?: ChatCompletionOptions): AsyncIterable<ChatStreamChunk>;
  abstract generateCode(prompt: string, language: string, options?: CodeGenerationOptions): Promise<CodeGenerationResult>;
  abstract callFunction(messages: ChatMessage[], functions: FunctionDefinition[], options?: FunctionCallOptions): Promise<FunctionCallResult>;
  abstract generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult>;
  abstract generateEmbeddings(texts: string[], options?: EmbeddingOptions): Promise<EmbeddingResult[]>;
  abstract semanticSearch(query: string, documents: string[], options?: SemanticSearchOptions): Promise<SemanticSearchResult[]>;
  abstract calculateSimilarity(text1: string, text2: string, options?: SimilarityOptions): Promise<number>;
  abstract clusterTexts(texts: string[], options?: ClusteringOptions): Promise<ClusteringResult>;
  abstract listModels(): Promise<ModelInfo[]>;
  abstract getModel(modelId: string): Promise<ModelInfo | null>;
  abstract loadModel(modelId: string, config?: ModelLoadConfig): Promise<void>;
  abstract unloadModel(modelId: string): Promise<void>;
  abstract getModelHealth(modelId: string): Promise<ModelHealthStatus>;
  abstract getModelMetrics(modelId: string): Promise<ModelMetrics>;
  abstract downloadModel(modelId: string, options?: ModelDownloadOptions): Promise<ModelDownloadResult>;
  abstract deleteModel(modelId: string): Promise<void>;
  abstract analyzeImage(image: Buffer | string, prompt?: string, options?: VisionOptions): Promise<VisionResult>;
  abstract describeImage(image: Buffer | string, options?: VisionOptions): Promise<string>;
  abstract extractText(image: Buffer | string, options?: OCROptions): Promise<OCRResult>;
  abstract generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult>;
  abstract editImage(image: Buffer | string, prompt: string, options?: ImageEditOptions): Promise<ImageGenerationResult>;
  abstract transcribeAudio(audio: Buffer | string, options?: TranscriptionOptions): Promise<TranscriptionResult>;
  abstract synthesizeSpeech(text: string, options?: SpeechSynthesisOptions): Promise<SpeechSynthesisResult>;
  abstract analyzeAudio(audio: Buffer | string, options?: AudioAnalysisOptions): Promise<AudioAnalysisResult>;
  abstract getStats(): Promise<AIStats>;
  abstract getRateLimits(): Promise<RateLimitInfo>;
  abstract getUsage(): Promise<UsageInfo>;
  abstract registerCustomModel(modelConfig: CustomModelConfig): Promise<void>;
  abstract unregisterCustomModel(modelId: string): Promise<void>;
}
