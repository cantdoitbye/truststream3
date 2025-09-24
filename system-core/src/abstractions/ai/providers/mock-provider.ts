/**
 * Mock AI Provider
 * Provides mock implementations for testing and development
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
  CustomModelConfig
} from '../ai.interface';

export class MockAIProvider extends BaseAIProvider {
  private mockModels: Map<string, ModelInfo> = new Map();
  private mockStats: Partial<AIStats> = {
    totalRequests: 0,
    totalTokens: 0,
    averageLatency: 50,
    errorRate: 0,
    modelsLoaded: 0
  };

  constructor() {
    super();
    this.initializeMockModels();
  }

  public getProviderName(): string {
    return 'mock';
  }

  public async initialize(config: AIConfig): Promise<void> {
    this.config = config;
  }

  public async connect(): Promise<void> {
    // Simulate connection delay
    await this.delay(100);
    this.connected = true;
  }

  public async disconnect(): Promise<void> {
    this.connected = false;
  }

  protected async performHealthCheck(): Promise<void> {
    // Mock health check always passes
    await this.delay(10);
  }

  public getCapabilities(): ProviderCapabilities {
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
      batchProcessing: true,
      rateLimiting: false,
      caching: true
    };
  }

  public async getStats(): Promise<AIStats> {
    return {
      totalRequests: this.mockStats.totalRequests || 0,
      totalTokens: this.mockStats.totalTokens || 0,
      averageLatency: this.mockStats.averageLatency || 50,
      errorRate: this.mockStats.errorRate || 0,
      providerName: 'mock',
      modelsLoaded: this.mockModels.size,
      timestamp: new Date(),
      usage: {
        textGeneration: Math.floor(Math.random() * 100),
        chatCompletion: Math.floor(Math.random() * 200),
        embeddings: Math.floor(Math.random() * 50),
        vision: Math.floor(Math.random() * 20),
        audio: Math.floor(Math.random() * 10)
      }
    };
  }

  // Text Generation
  public async generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult> {
    await this.delay(200);
    this.incrementStats();

    const tokens = this.estimateTokens(prompt);
    const completionTokens = Math.floor(tokens * 0.7);
    
    return {
      text: this.generateMockText(prompt, completionTokens),
      finishReason: 'stop',
      usage: {
        promptTokens: tokens,
        completionTokens,
        totalTokens: tokens + completionTokens
      },
      model: options?.model || 'mock-gpt-4',
      id: this.generateId(),
      created: Date.now()
    };
  }

  public async *streamText(prompt: string, options?: TextGenerationOptions): AsyncIterable<TextStreamChunk> {
    const fullText = await this.generateText(prompt, options);
    const words = fullText.text.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      await this.delay(50);
      yield {
        text: words[i] + (i < words.length - 1 ? ' ' : ''),
        index: i,
        finishReason: i === words.length - 1 ? 'stop' : undefined
      };
    }
  }

  // Chat Completion
  public async chatCompletion(messages: ChatMessage[], options?: ChatCompletionOptions): Promise<ChatCompletionResult> {
    await this.delay(300);
    this.incrementStats();

    const lastMessage = messages[messages.length - 1];
    const responseText = this.generateMockChatResponse(lastMessage.content);
    const tokens = this.estimateTokens(messages.map(m => m.content).join(' '));
    const completionTokens = this.estimateTokens(responseText);
    
    return {
      message: {
        role: 'assistant',
        content: responseText
      },
      finishReason: 'stop',
      usage: {
        promptTokens: tokens,
        completionTokens,
        totalTokens: tokens + completionTokens
      },
      model: options?.model || 'mock-gpt-4',
      id: this.generateId(),
      created: Date.now()
    };
  }

  public async *streamChatCompletion(messages: ChatMessage[], options?: ChatCompletionOptions): AsyncIterable<ChatStreamChunk> {
    const fullResponse = await this.chatCompletion(messages, options);
    const words = fullResponse.message.content.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      await this.delay(50);
      yield {
        delta: {
          content: words[i] + (i < words.length - 1 ? ' ' : '')
        },
        index: i,
        finishReason: i === words.length - 1 ? 'stop' : undefined
      };
    }
  }

  // Code Generation
  public async generateCode(prompt: string, language: string, options?: CodeGenerationOptions): Promise<CodeGenerationResult> {
    await this.delay(400);
    this.incrementStats();

    const code = this.generateMockCode(prompt, language);
    const tokens = this.estimateTokens(prompt);
    const completionTokens = this.estimateTokens(code);
    
    return {
      text: code,
      finishReason: 'stop',
      usage: {
        promptTokens: tokens,
        completionTokens,
        totalTokens: tokens + completionTokens
      },
      model: 'mock-codegen',
      id: this.generateId(),
      created: Date.now(),
      language,
      hasTests: options?.includeTests || false,
      hasDocumentation: options?.includeDocumentation || false,
      complexity: {
        cyclomatic: Math.floor(Math.random() * 10) + 1,
        cognitive: Math.floor(Math.random() * 15) + 1,
        maintainability: Math.floor(Math.random() * 100) + 1
      }
    };
  }

  // Function Calling
  public async callFunction(messages: ChatMessage[], functions: FunctionDefinition[], options?: FunctionCallOptions): Promise<FunctionCallResult> {
    await this.delay(150);
    
    const functionToCall = functions[0]; // Mock always calls first function
    const mockArgs = this.generateMockFunctionArgs(functionToCall);
    
    return {
      functionName: functionToCall.name,
      arguments: mockArgs,
      result: { success: true, data: 'Mock function result' },
      success: true,
      executionTime: 100
    };
  }

  // Embeddings
  public async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult> {
    await this.delay(100);
    this.incrementStats();

    const dimensions = options?.dimensions || 1536;
    const embedding = Array.from({ length: dimensions }, () => Math.random() * 2 - 1);
    
    return {
      embedding,
      dimensions,
      model: options?.model || 'mock-embedding',
      usage: {
        promptTokens: this.estimateTokens(text),
        totalTokens: this.estimateTokens(text)
      }
    };
  }

  public async generateEmbeddings(texts: string[], options?: EmbeddingOptions): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    
    for (const text of texts) {
      const result = await this.generateEmbedding(text, options);
      results.push(result);
    }
    
    return results;
  }

  public async semanticSearch(query: string, documents: string[], options?: SemanticSearchOptions): Promise<SemanticSearchResult[]> {
    await this.delay(150);
    
    const topK = options?.topK || 5;
    const results: SemanticSearchResult[] = [];
    
    for (let i = 0; i < Math.min(topK, documents.length); i++) {
      results.push({
        text: documents[i],
        score: Math.random() * 0.5 + 0.5, // Random score between 0.5 and 1
        index: i,
        metadata: { mockResult: true }
      });
    }
    
    return results.sort((a, b) => b.score - a.score);
  }

  public async calculateSimilarity(text1: string, text2: string, options?: SimilarityOptions): Promise<number> {
    await this.delay(50);
    return Math.random() * 0.5 + 0.5; // Random similarity between 0.5 and 1
  }

  public async clusterTexts(texts: string[], options?: ClusteringOptions): Promise<ClusteringResult> {
    await this.delay(300);
    
    const numClusters = options?.numClusters || Math.min(3, texts.length);
    const clusters = [];
    
    for (let i = 0; i < numClusters; i++) {
      const clusterTexts = texts.filter((_, index) => index % numClusters === i);
      clusters.push({
        id: i,
        texts: clusterTexts,
        centroid: Array.from({ length: 1536 }, () => Math.random() * 2 - 1),
        size: clusterTexts.length
      });
    }
    
    return {
      clusters,
      totalClusters: numClusters,
      silhouetteScore: Math.random() * 0.5 + 0.5
    };
  }

  // Model Management
  public async listModels(): Promise<ModelInfo[]> {
    return Array.from(this.mockModels.values());
  }

  public async getModel(modelId: string): Promise<ModelInfo | null> {
    return this.mockModels.get(modelId) || null;
  }

  public async loadModel(modelId: string, config?: ModelLoadConfig): Promise<void> {
    await this.delay(1000);
    
    const model = this.mockModels.get(modelId);
    if (model) {
      model.status = 'available';
      this.mockStats.modelsLoaded = (this.mockStats.modelsLoaded || 0) + 1;
    }
  }

  public async unloadModel(modelId: string): Promise<void> {
    await this.delay(500);
    
    const model = this.mockModels.get(modelId);
    if (model) {
      model.status = 'unavailable';
      this.mockStats.modelsLoaded = Math.max(0, (this.mockStats.modelsLoaded || 0) - 1);
    }
  }

  public async getModelHealth(modelId: string): Promise<ModelHealthStatus> {
    return {
      status: 'healthy',
      lastChecked: new Date(),
      responseTime: 50,
      memoryUsage: Math.random() * 8000, // MB
      gpuUsage: Math.random() * 100, // %
      throughput: {
        requestsPerSecond: Math.random() * 10,
        tokensPerSecond: Math.random() * 1000
      }
    };
  }

  public async getModelMetrics(modelId: string): Promise<ModelMetrics> {
    return {
      requestCount: Math.floor(Math.random() * 1000),
      totalTokens: Math.floor(Math.random() * 100000),
      averageLatency: Math.random() * 200 + 50,
      errorRate: Math.random() * 0.1,
      throughput: Math.random() * 100,
      memoryUsage: Math.random() * 8000,
      gpuUtilization: Math.random() * 100,
      timeWindow: '1h',
      lastUpdated: new Date()
    };
  }

  public async downloadModel(modelId: string, options?: ModelDownloadOptions): Promise<ModelDownloadResult> {
    await this.delay(2000);
    
    // Simulate download progress
    if (options?.onProgress) {
      for (let i = 0; i <= 100; i += 10) {
        await this.delay(100);
        options.onProgress({
          downloaded: i * 1024 * 1024,
          total: 100 * 1024 * 1024,
          percentage: i,
          speed: 10 * 1024 * 1024, // 10MB/s
          eta: (100 - i) * 100
        });
      }
    }
    
    return {
      modelId,
      path: `/mock/models/${modelId}`,
      size: 100 * 1024 * 1024, // 100MB
      checksum: 'mock-checksum-' + modelId,
      downloadTime: 2000,
      verified: true
    };
  }

  public async deleteModel(modelId: string): Promise<void> {
    await this.delay(200);
    this.mockModels.delete(modelId);
  }

  // Vision Services
  public async analyzeImage(image: Buffer | string, prompt?: string, options?: VisionOptions): Promise<VisionResult> {
    await this.delay(500);
    this.incrementStats();

    return {
      description: this.generateMockImageDescription(prompt),
      confidence: Math.random() * 0.3 + 0.7,
      objects: [
        {
          label: 'mock-object',
          confidence: Math.random() * 0.3 + 0.7,
          boundingBox: {
            x: Math.random() * 100,
            y: Math.random() * 100,
            width: Math.random() * 200,
            height: Math.random() * 200
          }
        }
      ],
      text: 'Mock OCR text extracted from image',
      usage: {
        promptTokens: 100,
        completionTokens: 150,
        totalTokens: 250
      }
    };
  }

  public async describeImage(image: Buffer | string, options?: VisionOptions): Promise<string> {
    await this.delay(400);
    return this.generateMockImageDescription();
  }

  public async extractText(image: Buffer | string, options?: OCROptions): Promise<OCRResult> {
    await this.delay(300);
    
    return {
      text: 'Mock OCR extracted text from the image',
      confidence: Math.random() * 0.3 + 0.7,
      words: [
        {
          text: 'Mock',
          confidence: 0.95,
          boundingBox: { x: 10, y: 10, width: 50, height: 20 }
        },
        {
          text: 'text',
          confidence: 0.92,
          boundingBox: { x: 70, y: 10, width: 40, height: 20 }
        }
      ],
      layout: {
        pages: 1,
        orientation: 0
      }
    };
  }

  public async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult> {
    await this.delay(3000);
    
    return {
      url: `https://mock-images.example.com/${this.generateId()}.png`,
      size: options?.size || '1024x1024',
      model: options?.model || 'mock-dalle-3',
      created: Date.now(),
      revisedPrompt: `Enhanced mock version of: ${prompt}`
    };
  }

  public async editImage(image: Buffer | string, prompt: string, options?: ImageEditOptions): Promise<ImageGenerationResult> {
    await this.delay(4000);
    
    return {
      url: `https://mock-images.example.com/edited-${this.generateId()}.png`,
      size: options?.size || '1024x1024',
      model: options?.model || 'mock-dalle-3',
      created: Date.now(),
      revisedPrompt: `Mock edit: ${prompt}`
    };
  }

  // Audio Services
  public async transcribeAudio(audio: Buffer | string, options?: TranscriptionOptions): Promise<TranscriptionResult> {
    await this.delay(800);
    
    return {
      text: 'This is a mock transcription of the audio file.',
      language: options?.language || 'en',
      duration: 10.5,
      segments: [
        {
          id: 0,
          start: 0.0,
          end: 5.0,
          text: 'This is a mock',
          words: [
            { word: 'This', start: 0.0, end: 0.5, confidence: 0.95 },
            { word: 'is', start: 0.6, end: 0.8, confidence: 0.98 },
            { word: 'a', start: 0.9, end: 1.0, confidence: 0.99 },
            { word: 'mock', start: 1.1, end: 1.5, confidence: 0.97 }
          ]
        },
        {
          id: 1,
          start: 5.1,
          end: 10.5,
          text: 'transcription of the audio file.',
          words: [
            { word: 'transcription', start: 5.1, end: 6.0, confidence: 0.94 },
            { word: 'of', start: 6.1, end: 6.3, confidence: 0.99 },
            { word: 'the', start: 6.4, end: 6.6, confidence: 0.99 },
            { word: 'audio', start: 6.7, end: 7.2, confidence: 0.96 },
            { word: 'file', start: 7.3, end: 7.7, confidence: 0.98 }
          ]
        }
      ]
    };
  }

  public async synthesizeSpeech(text: string, options?: SpeechSynthesisOptions): Promise<SpeechSynthesisResult> {
    await this.delay(1000);
    
    // Create a mock audio buffer
    const mockAudio = Buffer.alloc(1024 * 10); // 10KB mock audio
    
    return {
      audio: mockAudio,
      format: options?.responseFormat || 'mp3',
      duration: text.length * 0.1, // Rough estimate
      size: mockAudio.length
    };
  }

  public async analyzeAudio(audio: Buffer | string, options?: AudioAnalysisOptions): Promise<AudioAnalysisResult> {
    await this.delay(600);
    
    return {
      transcript: 'Mock audio transcript',
      language: 'en',
      duration: 15.3,
      emotions: [
        { emotion: 'neutral', confidence: 0.8, timestamp: 0 },
        { emotion: 'positive', confidence: 0.6, timestamp: 5 },
        { emotion: 'calm', confidence: 0.7, timestamp: 10 }
      ],
      sentiment: {
        polarity: 0.1,
        subjectivity: 0.3,
        label: 'neutral'
      },
      keywords: [
        { word: 'mock', relevance: 0.9, frequency: 3 },
        { word: 'audio', relevance: 0.8, frequency: 2 },
        { word: 'analysis', relevance: 0.7, frequency: 1 }
      ]
    };
  }

  // Rate Limits and Usage
  public async getRateLimits(): Promise<RateLimitInfo> {
    return {
      requestsPerMinute: 1000,
      tokensPerMinute: 100000,
      requestsRemaining: 950,
      tokensRemaining: 95000,
      resetTime: new Date(Date.now() + 60000) // 1 minute from now
    };
  }

  public async getUsage(): Promise<UsageInfo> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return {
      totalRequests: 1500,
      totalTokens: 150000,
      totalCost: 15.50,
      period: {
        start: startOfMonth,
        end: now
      },
      breakdown: {
        textGeneration: { requests: 500, tokens: 50000, cost: 5.00 },
        chatCompletion: { requests: 800, tokens: 80000, cost: 8.00 },
        embeddings: { requests: 150, tokens: 15000, cost: 1.50 },
        vision: { requests: 30, tokens: 3000, cost: 0.75 },
        audio: { requests: 20, tokens: 2000, cost: 0.25 }
      }
    };
  }

  // Custom Models
  public async registerCustomModel(modelConfig: CustomModelConfig): Promise<void> {
    await this.delay(200);
    
    const modelInfo: ModelInfo = {
      id: modelConfig.id,
      name: modelConfig.name,
      description: `Custom ${modelConfig.type} model`,
      provider: 'mock',
      type: modelConfig.type,
      maxTokens: 4096,
      contextLength: 4096,
      capabilities: ['text_generation'],
      isLocal: true,
      status: 'available',
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.mockModels.set(modelConfig.id, modelInfo);
  }

  public async unregisterCustomModel(modelId: string): Promise<void> {
    await this.delay(100);
    this.mockModels.delete(modelId);
  }

  // Private helper methods
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private incrementStats(): void {
    this.mockStats.totalRequests = (this.mockStats.totalRequests || 0) + 1;
    this.mockStats.totalTokens = (this.mockStats.totalTokens || 0) + Math.floor(Math.random() * 1000) + 100;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4); // Rough estimate: 1 token per 4 characters
  }

  private generateId(): string {
    return 'mock_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private generateMockText(prompt: string, maxTokens: number): string {
    const words = [
      'The', 'quick', 'brown', 'fox', 'jumps', 'over', 'the', 'lazy', 'dog',
      'Lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
      'This', 'is', 'a', 'mock', 'response', 'generated', 'by', 'the', 'mock', 'provider',
      'Artificial', 'intelligence', 'machine', 'learning', 'natural', 'language', 'processing'
    ];
    
    const targetLength = Math.min(maxTokens * 4, 500); // Approximate character count
    let result = '';
    
    while (result.length < targetLength) {
      const word = words[Math.floor(Math.random() * words.length)];
      result += (result ? ' ' : '') + word;
    }
    
    return result + '.';
  }

  private generateMockChatResponse(userMessage: string): string {
    const responses = [
      `I understand you're asking about "${userMessage.substring(0, 50)}...". This is a mock response from the AI provider.`,
      `Thank you for your question. As a mock AI, I can provide a simulated response to your inquiry about the topic mentioned.`,
      `That's an interesting question. In a real scenario, I would analyze your input and provide a relevant response.`,
      `I appreciate your message. This mock provider is simulating a conversational AI response.`,
      `Based on your input, I'm generating a mock response that would typically be more contextual and helpful.`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateMockCode(prompt: string, language: string): string {
    const codeTemplates = {
      javascript: `// Mock ${language} code generated from prompt
function mockFunction() {
  console.log('This is mock ${language} code');
  return 'Mock result';
}

mockFunction();`,
      python: `# Mock ${language} code generated from prompt
def mock_function():
    print('This is mock ${language} code')
    return 'Mock result'

if __name__ == '__main__':
    mock_function()`,
      java: `// Mock ${language} code generated from prompt
public class MockClass {
    public static void main(String[] args) {
        System.out.println("This is mock ${language} code");
    }
}`,
      default: `/* Mock ${language} code generated from prompt */
// This is a mock code generation result
// In a real implementation, this would be actual ${language} code
console.log('Mock ${language} code');`
    };
    
    return codeTemplates[language as keyof typeof codeTemplates] || codeTemplates.default;
  }

  private generateMockFunctionArgs(functionDef: FunctionDefinition): Record<string, any> {
    const args: Record<string, any> = {};
    
    if (functionDef.parameters?.properties) {
      for (const [key, prop] of Object.entries(functionDef.parameters.properties)) {
        // Generate mock values based on property type
        if (prop.type === 'string') {
          args[key] = `mock_${key}_value`;
        } else if (prop.type === 'number') {
          args[key] = Math.floor(Math.random() * 100);
        } else if (prop.type === 'boolean') {
          args[key] = Math.random() > 0.5;
        } else {
          args[key] = `mock_${key}`;
        }
      }
    }
    
    return args;
  }

  private generateMockImageDescription(prompt?: string): string {
    const descriptions = [
      'A mock image analysis showing various objects and scenes',
      'This is a simulated vision analysis result with mock object detection',
      'Mock computer vision output describing the contents of the image',
      'Simulated image recognition results for testing purposes',
      'A mock description of the visual elements detected in the image'
    ];
    
    let description = descriptions[Math.floor(Math.random() * descriptions.length)];
    
    if (prompt) {
      description += ` Based on the prompt: "${prompt.substring(0, 100)}..."`;
    }
    
    return description;
  }

  private initializeMockModels(): void {
    const models: ModelInfo[] = [
      {
        id: 'mock-gpt-4',
        name: 'Mock GPT-4',
        description: 'Mock implementation of GPT-4 for testing',
        provider: 'mock',
        type: 'chat',
        maxTokens: 4096,
        contextLength: 8192,
        capabilities: ['text_generation', 'chat_completion', 'function_calling'],
        isLocal: false,
        status: 'available',
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'mock-embedding',
        name: 'Mock Embedding Model',
        description: 'Mock text embedding model',
        provider: 'mock',
        type: 'embedding',
        capabilities: ['embeddings'],
        isLocal: false,
        status: 'available',
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'mock-vision',
        name: 'Mock Vision Model',
        description: 'Mock computer vision model',
        provider: 'mock',
        type: 'vision',
        capabilities: ['vision', 'ocr'],
        isLocal: false,
        status: 'available',
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    for (const model of models) {
      this.mockModels.set(model.id, model);
    }
  }
}
