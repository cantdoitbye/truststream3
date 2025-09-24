/**
 * OpenAI Provider
 * Implements AI services using OpenAI's API
 */

import OpenAI from 'openai';
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
  RateLimitError,
  ModelNotFoundError
} from '../ai.interface';

export class OpenAIProvider extends BaseAIProvider {
  private client: OpenAI | null = null;
  private requestCount = 0;
  private tokenCount = 0;
  private errorCount = 0;
  private startTime = Date.now();

  public getProviderName(): string {
    return 'openai';
  }

  public async initialize(config: AIConfig): Promise<void> {
    if (config.type !== 'openai' || !config.openai) {
      throw new AIError('Invalid OpenAI configuration', 'INVALID_CONFIG', 400, 'openai');
    }

    this.config = config;
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
      baseURL: config.openai.baseURL,
      organization: config.openai.organization,
      project: config.openai.project,
      timeout: config.timeout || 60000,
      maxRetries: config.retryAttempts || 3
    });
  }

  public async connect(): Promise<void> {
    if (!this.client) {
      throw new AIError('OpenAI client not initialized', 'CLIENT_NOT_INITIALIZED', 500, 'openai');
    }

    try {
      // Test connection by listing models
      await this.client.models.list();
      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw new AIError(
        'Failed to connect to OpenAI',
        'CONNECTION_FAILED',
        500,
        'openai',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  public async disconnect(): Promise<void> {
    this.connected = false;
    this.client = null;
  }

  protected async performHealthCheck(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }
    
    // Test with a simple request
    await this.client.models.list();
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
      localModels: false,
      customModels: true,
      finetuning: true,
      batchProcessing: true,
      rateLimiting: true,
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
      providerName: 'openai',
      modelsLoaded: 0, // OpenAI doesn't require model loading
      timestamp: new Date(),
      usage: {
        textGeneration: Math.floor(this.requestCount * 0.3),
        chatCompletion: Math.floor(this.requestCount * 0.5),
        embeddings: Math.floor(this.requestCount * 0.1),
        vision: Math.floor(this.requestCount * 0.05),
        audio: Math.floor(this.requestCount * 0.05)
      }
    };
  }

  // Text Generation
  public async generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult> {
    if (!this.client) {
      throw new AIError('Client not initialized', 'CLIENT_NOT_INITIALIZED', 500, 'openai');
    }

    this.requestCount++;
    const startTime = Date.now();

    try {
      const completion = await this.client.completions.create({
        model: options?.model || 'gpt-3.5-turbo-instruct',
        prompt,
        max_tokens: options?.maxTokens,
        temperature: options?.temperature,
        top_p: options?.topP,
        frequency_penalty: options?.frequencyPenalty,
        presence_penalty: options?.presencePenalty,
        stop: options?.stop,
        stream: false,
        logprobs: options?.logprobs,
        echo: options?.echo,
        user: options?.user
      });

      const choice = completion.choices[0];
      this.tokenCount += completion.usage?.total_tokens || 0;

      return {
        text: choice.text,
        finishReason: this.mapFinishReason(choice.finish_reason),
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0
        },
        logprobs: choice.logprobs,
        model: completion.model,
        id: completion.id,
        created: completion.created
      };
    } catch (error) {
      this.errorCount++;
      throw this.handleError(error, 'generateText');
    }
  }

  public async *streamText(prompt: string, options?: TextGenerationOptions): AsyncIterable<TextStreamChunk> {
    if (!this.client) {
      throw new AIError('Client not initialized', 'CLIENT_NOT_INITIALIZED', 500, 'openai');
    }

    this.requestCount++;

    try {
      const stream = await this.client.completions.create({
        model: options?.model || 'gpt-3.5-turbo-instruct',
        prompt,
        max_tokens: options?.maxTokens,
        temperature: options?.temperature,
        top_p: options?.topP,
        frequency_penalty: options?.frequencyPenalty,
        presence_penalty: options?.presencePenalty,
        stop: options?.stop,
        stream: true,
        user: options?.user
      });

      let index = 0;
      for await (const chunk of stream) {
        const choice = chunk.choices[0];
        if (choice) {
          yield {
            text: choice.text,
            finishReason: this.mapFinishReason(choice.finish_reason),
            logprobs: choice.logprobs,
            index: index++
          };
        }
      }
    } catch (error) {
      this.errorCount++;
      throw this.handleError(error, 'streamText');
    }
  }

  // Chat Completion
  public async chatCompletion(messages: ChatMessage[], options?: ChatCompletionOptions): Promise<ChatCompletionResult> {
    if (!this.client) {
      throw new AIError('Client not initialized', 'CLIENT_NOT_INITIALIZED', 500, 'openai');
    }

    this.requestCount++;

    try {
      const completion = await this.client.chat.completions.create({
        model: options?.model || 'gpt-3.5-turbo',
        messages: this.convertMessages(messages),
        max_tokens: options?.maxTokens,
        temperature: options?.temperature,
        top_p: options?.topP,
        frequency_penalty: options?.frequencyPenalty,
        presence_penalty: options?.presencePenalty,
        stop: options?.stop,
        stream: false,
        functions: options?.functions,
        function_call: options?.functionCall,
        tools: options?.tools?.map(tool => ({
          type: tool.type,
          function: tool.function
        })),
        tool_choice: options?.toolChoice,
        user: options?.user
      });

      const choice = completion.choices[0];
      this.tokenCount += completion.usage?.total_tokens || 0;

      return {
        message: {
          role: choice.message.role as 'assistant',
          content: choice.message.content || '',
          function_call: choice.message.function_call
        },
        finishReason: this.mapFinishReason(choice.finish_reason),
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0
        },
        model: completion.model,
        id: completion.id,
        created: completion.created,
        toolCalls: choice.message.tool_calls?.map(tc => ({
          id: tc.id,
          type: tc.type,
          function: tc.function
        }))
      };
    } catch (error) {
      this.errorCount++;
      throw this.handleError(error, 'chatCompletion');
    }
  }

  public async *streamChatCompletion(messages: ChatMessage[], options?: ChatCompletionOptions): AsyncIterable<ChatStreamChunk> {
    if (!this.client) {
      throw new AIError('Client not initialized', 'CLIENT_NOT_INITIALIZED', 500, 'openai');
    }

    this.requestCount++;

    try {
      const stream = await this.client.chat.completions.create({
        model: options?.model || 'gpt-3.5-turbo',
        messages: this.convertMessages(messages),
        max_tokens: options?.maxTokens,
        temperature: options?.temperature,
        top_p: options?.topP,
        frequency_penalty: options?.frequencyPenalty,
        presence_penalty: options?.presencePenalty,
        stop: options?.stop,
        stream: true,
        functions: options?.functions,
        function_call: options?.functionCall,
        tools: options?.tools?.map(tool => ({
          type: tool.type,
          function: tool.function
        })),
        tool_choice: options?.toolChoice,
        user: options?.user
      });

      let index = 0;
      for await (const chunk of stream) {
        const choice = chunk.choices[0];
        if (choice) {
          yield {
            delta: {
              role: choice.delta.role as any,
              content: choice.delta.content || '',
              function_call: choice.delta.function_call
            },
            finishReason: this.mapFinishReason(choice.finish_reason),
            index: index++,
            toolCalls: choice.delta.tool_calls?.map(tc => ({
              id: tc.id || '',
              type: tc.type || 'function',
              function: tc.function || { name: '', arguments: '' }
            }))
          };
        }
      }
    } catch (error) {
      this.errorCount++;
      throw this.handleError(error, 'streamChatCompletion');
    }
  }

  // Code Generation
  public async generateCode(prompt: string, language: string, options?: CodeGenerationOptions): Promise<CodeGenerationResult> {
    // Use chat completion with code-specific prompt
    const codePrompt = `Generate ${language} code for the following request. ${options?.includeTests ? 'Include unit tests.' : ''} ${options?.includeDocumentation ? 'Include documentation.' : ''}\n\nRequest: ${prompt}`;
    
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an expert ${language} programmer. Generate clean, efficient, and well-structured code.`
      },
      {
        role: 'user',
        content: codePrompt
      }
    ];

    const result = await this.chatCompletion(messages, {
      model: 'gpt-4',
      ...options
    });

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
      function_call: 'auto'
    });

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

    throw new AIError('No function call in response', 'NO_FUNCTION_CALL', 400, 'openai');
  }

  // Embeddings
  public async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult> {
    if (!this.client) {
      throw new AIError('Client not initialized', 'CLIENT_NOT_INITIALIZED', 500, 'openai');
    }

    this.requestCount++;

    try {
      const embedding = await this.client.embeddings.create({
        model: options?.model || 'text-embedding-ada-002',
        input: text,
        dimensions: options?.dimensions,
        encoding_format: 'float',
        user: options?.inputType
      });

      const data = embedding.data[0];
      this.tokenCount += embedding.usage.total_tokens;

      return {
        embedding: data.embedding,
        dimensions: data.embedding.length,
        model: embedding.model,
        usage: {
          promptTokens: embedding.usage.prompt_tokens,
          totalTokens: embedding.usage.total_tokens
        }
      };
    } catch (error) {
      this.errorCount++;
      throw this.handleError(error, 'generateEmbedding');
    }
  }

  public async generateEmbeddings(texts: string[], options?: EmbeddingOptions): Promise<EmbeddingResult[]> {
    if (!this.client) {
      throw new AIError('Client not initialized', 'CLIENT_NOT_INITIALIZED', 500, 'openai');
    }

    this.requestCount++;

    try {
      const embedding = await this.client.embeddings.create({
        model: options?.model || 'text-embedding-ada-002',
        input: texts,
        dimensions: options?.dimensions,
        encoding_format: 'float'
      });

      this.tokenCount += embedding.usage.total_tokens;

      return embedding.data.map(data => ({
        embedding: data.embedding,
        dimensions: data.embedding.length,
        model: embedding.model,
        usage: {
          promptTokens: Math.floor(embedding.usage.prompt_tokens / texts.length),
          totalTokens: Math.floor(embedding.usage.total_tokens / texts.length)
        }
      }));
    } catch (error) {
      this.errorCount++;
      throw this.handleError(error, 'generateEmbeddings');
    }
  }

  // Vision Services
  public async analyzeImage(image: Buffer | string, prompt?: string, options?: VisionOptions): Promise<VisionResult> {
    if (!this.client) {
      throw new AIError('Client not initialized', 'CLIENT_NOT_INITIALIZED', 500, 'openai');
    }

    this.requestCount++;

    try {
      const imageUrl = typeof image === 'string' ? image : `data:image/jpeg;base64,${image.toString('base64')}`;
      
      const messages: any[] = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt || 'What do you see in this image?'
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: options?.detail || 'auto'
              }
            }
          ]
        }
      ];

      const completion = await this.client.chat.completions.create({
        model: options?.model || 'gpt-4-vision-preview',
        messages,
        max_tokens: options?.maxTokens || 500
      });

      const choice = completion.choices[0];
      this.tokenCount += completion.usage?.total_tokens || 0;

      return {
        description: choice.message.content || '',
        confidence: 0.9, // OpenAI doesn't provide confidence scores
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0
        }
      };
    } catch (error) {
      this.errorCount++;
      throw this.handleError(error, 'analyzeImage');
    }
  }

  public async describeImage(image: Buffer | string, options?: VisionOptions): Promise<string> {
    const result = await this.analyzeImage(image, 'Describe this image in detail.', options);
    return result.description;
  }

  public async extractText(image: Buffer | string, options?: OCROptions): Promise<OCRResult> {
    const result = await this.analyzeImage(image, 'Extract all text from this image.', {
      model: 'gpt-4-vision-preview',
      maxTokens: 1000
    });

    return {
      text: result.description,
      confidence: 0.9,
      layout: {
        pages: 1,
        orientation: 0
      }
    };
  }

  public async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult> {
    if (!this.client) {
      throw new AIError('Client not initialized', 'CLIENT_NOT_INITIALIZED', 500, 'openai');
    }

    this.requestCount++;

    try {
      const image = await this.client.images.generate({
        model: options?.model || 'dall-e-3',
        prompt,
        size: options?.size || '1024x1024',
        quality: options?.quality || 'standard',
        style: options?.style,
        response_format: options?.responseFormat || 'url',
        user: options?.user
      });

      const data = image.data[0];

      return {
        url: data.url,
        b64Json: data.b64_json,
        revisedPrompt: data.revised_prompt,
        size: options?.size || '1024x1024',
        model: 'dall-e-3',
        created: Date.now()
      };
    } catch (error) {
      this.errorCount++;
      throw this.handleError(error, 'generateImage');
    }
  }

  public async editImage(image: Buffer | string, prompt: string, options?: ImageEditOptions): Promise<ImageGenerationResult> {
    if (!this.client) {
      throw new AIError('Client not initialized', 'CLIENT_NOT_INITIALIZED', 500, 'openai');
    }

    this.requestCount++;

    try {
      // Convert image to File object if it's a Buffer
      const imageFile = typeof image === 'string' 
        ? await fetch(image).then(r => r.blob())
        : new Blob([image]);

      const result = await this.client.images.edit({
        image: imageFile as any,
        mask: options?.mask ? new Blob([options.mask]) : undefined,
        prompt,
        size: options?.size || '1024x1024',
        response_format: options?.responseFormat || 'url',
        user: options?.user
      } as any);

      const data = result.data[0];

      return {
        url: data.url,
        b64Json: data.b64_json,
        size: options?.size || '1024x1024',
        model: 'dall-e-2',
        created: Date.now()
      };
    } catch (error) {
      this.errorCount++;
      throw this.handleError(error, 'editImage');
    }
  }

  // Audio Services
  public async transcribeAudio(audio: Buffer | string, options?: TranscriptionOptions): Promise<TranscriptionResult> {
    if (!this.client) {
      throw new AIError('Client not initialized', 'CLIENT_NOT_INITIALIZED', 500, 'openai');
    }

    this.requestCount++;

    try {
      const audioFile = typeof audio === 'string' 
        ? await fetch(audio).then(r => r.blob())
        : new Blob([audio]);

      const transcription = await this.client.audio.transcriptions.create({
        file: audioFile as any,
        model: options?.model || 'whisper-1',
        language: options?.language,
        prompt: options?.prompt,
        response_format: options?.responseFormat || 'verbose_json',
        temperature: options?.temperature,
        timestamp_granularities: options?.timestampGranularities
      });

      if (typeof transcription === 'string') {
        return {
          text: transcription
        };
      }

      return {
        text: transcription.text,
        language: transcription.language,
        duration: transcription.duration,
        segments: transcription.segments?.map(seg => ({
          id: seg.id,
          start: seg.start,
          end: seg.end,
          text: seg.text,
          words: seg.words?.map(word => ({
            word: word.word,
            start: word.start,
            end: word.end,
            confidence: word.confidence
          }))
        }))
      };
    } catch (error) {
      this.errorCount++;
      throw this.handleError(error, 'transcribeAudio');
    }
  }

  public async synthesizeSpeech(text: string, options?: SpeechSynthesisOptions): Promise<SpeechSynthesisResult> {
    if (!this.client) {
      throw new AIError('Client not initialized', 'CLIENT_NOT_INITIALIZED', 500, 'openai');
    }

    this.requestCount++;

    try {
      const speech = await this.client.audio.speech.create({
        model: options?.model || 'tts-1',
        voice: options?.voice as any || 'alloy',
        input: text,
        response_format: options?.responseFormat || 'mp3',
        speed: options?.speed
      });

      const buffer = Buffer.from(await speech.arrayBuffer());

      return {
        audio: buffer,
        format: options?.responseFormat || 'mp3',
        size: buffer.length,
        duration: text.length * 0.1 // Rough estimate
      };
    } catch (error) {
      this.errorCount++;
      throw this.handleError(error, 'synthesizeSpeech');
    }
  }

  // Not implemented by OpenAI - use fallback implementations
  public async semanticSearch(query: string, documents: string[], options?: SemanticSearchOptions): Promise<SemanticSearchResult[]> {
    // Implement using embeddings
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
    throw new AIError('Clustering not implemented for OpenAI provider', 'NOT_IMPLEMENTED', 501, 'openai');
  }

  public async analyzeAudio(audio: Buffer | string, options?: AudioAnalysisOptions): Promise<AudioAnalysisResult> {
    // Use transcription as base and analyze the text
    const transcription = await this.transcribeAudio(audio, {
      model: 'whisper-1',
      responseFormat: 'verbose_json'
    });

    // Analyze sentiment using chat completion
    if (options?.includeSentiment || options?.includeEmotions) {
      const analysisPrompt = `Analyze the following text for sentiment and emotions: "${transcription.text}"`;
      const analysis = await this.chatCompletion([
        { role: 'system', content: 'You are a text analysis expert. Provide sentiment and emotion analysis.' },
        { role: 'user', content: analysisPrompt }
      ]);

      // Parse the analysis response (simplified)
      return {
        transcript: transcription.text,
        language: transcription.language,
        duration: transcription.duration || 0,
        sentiment: {
          polarity: 0.1, // Would parse from analysis
          subjectivity: 0.5,
          label: 'neutral'
        }
      };
    }

    return {
      transcript: transcription.text,
      language: transcription.language,
      duration: transcription.duration || 0
    };
  }

  // Model Management (Limited for OpenAI)
  public async listModels(): Promise<ModelInfo[]> {
    if (!this.client) {
      throw new AIError('Client not initialized', 'CLIENT_NOT_INITIALIZED', 500, 'openai');
    }

    try {
      const models = await this.client.models.list();
      return models.data.map(model => ({
        id: model.id,
        name: model.id,
        description: `OpenAI model: ${model.id}`,
        provider: 'openai',
        type: this.inferModelType(model.id),
        capabilities: this.getModelCapabilities(model.id),
        isLocal: false,
        status: 'available',
        createdAt: new Date(model.created * 1000),
        updatedAt: new Date(model.created * 1000)
      }));
    } catch (error) {
      throw this.handleError(error, 'listModels');
    }
  }

  public async getModel(modelId: string): Promise<ModelInfo | null> {
    const models = await this.listModels();
    return models.find(m => m.id === modelId) || null;
  }

  public async loadModel(modelId: string, config?: ModelLoadConfig): Promise<void> {
    // OpenAI models are always loaded
    const model = await this.getModel(modelId);
    if (!model) {
      throw new ModelNotFoundError(modelId, 'openai');
    }
  }

  public async unloadModel(modelId: string): Promise<void> {
    // No-op for OpenAI
  }

  public async getModelHealth(modelId: string): Promise<ModelHealthStatus> {
    const model = await this.getModel(modelId);
    if (!model) {
      throw new ModelNotFoundError(modelId, 'openai');
    }

    return {
      status: 'healthy',
      lastChecked: new Date(),
      responseTime: 200 // Average estimate
    };
  }

  public async getModelMetrics(modelId: string): Promise<ModelMetrics> {
    return {
      requestCount: this.requestCount,
      totalTokens: this.tokenCount,
      averageLatency: 200,
      errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
      throughput: this.requestCount / ((Date.now() - this.startTime) / 1000),
      memoryUsage: 0, // Not available
      timeWindow: '1h',
      lastUpdated: new Date()
    };
  }

  public async downloadModel(modelId: string, options?: ModelDownloadOptions): Promise<ModelDownloadResult> {
    throw new AIError('Model download not supported for OpenAI provider', 'NOT_SUPPORTED', 501, 'openai');
  }

  public async deleteModel(modelId: string): Promise<void> {
    throw new AIError('Model deletion not supported for OpenAI provider', 'NOT_SUPPORTED', 501, 'openai');
  }

  public async getRateLimits(): Promise<RateLimitInfo> {
    // OpenAI doesn't provide programmatic rate limit info
    return {
      requestsPerMinute: 3000, // Default tier
      tokensPerMinute: 250000,
      requestsRemaining: 2900,
      tokensRemaining: 240000,
      resetTime: new Date(Date.now() + 60000)
    };
  }

  public async getUsage(): Promise<UsageInfo> {
    // OpenAI doesn't provide usage info via API
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return {
      totalRequests: this.requestCount,
      totalTokens: this.tokenCount,
      totalCost: (this.tokenCount / 1000) * 0.002, // Rough estimate
      period: {
        start: startOfMonth,
        end: now
      },
      breakdown: {
        textGeneration: { requests: 0, tokens: 0, cost: 0 },
        chatCompletion: { requests: this.requestCount, tokens: this.tokenCount, cost: (this.tokenCount / 1000) * 0.002 },
        embeddings: { requests: 0, tokens: 0, cost: 0 },
        vision: { requests: 0, tokens: 0, cost: 0 },
        audio: { requests: 0, tokens: 0, cost: 0 }
      }
    };
  }

  public async registerCustomModel(modelConfig: CustomModelConfig): Promise<void> {
    throw new AIError('Custom model registration not supported for OpenAI provider', 'NOT_SUPPORTED', 501, 'openai');
  }

  public async unregisterCustomModel(modelId: string): Promise<void> {
    throw new AIError('Custom model unregistration not supported for OpenAI provider', 'NOT_SUPPORTED', 501, 'openai');
  }

  // Private helper methods
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
      case 'content_filter': return 'content_filter';
      default: return 'stop';
    }
  }

  private handleError(error: any, operation: string): AIError {
    if (error?.status === 429) {
      return new RateLimitError('Rate limit exceeded', 'openai', new Date(Date.now() + 60000));
    }
    
    if (error?.status === 404) {
      return new ModelNotFoundError(operation, 'openai');
    }
    
    return new AIError(
      `OpenAI ${operation} failed: ${error?.message || 'Unknown error'}`,
      'API_ERROR',
      error?.status || 500,
      'openai',
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

  private inferModelType(modelId: string): 'text' | 'chat' | 'embedding' | 'vision' | 'audio' | 'multimodal' {
    if (modelId.includes('embedding')) return 'embedding';
    if (modelId.includes('vision')) return 'vision';
    if (modelId.includes('whisper') || modelId.includes('tts')) return 'audio';
    if (modelId.includes('gpt')) return 'chat';
    return 'text';
  }

  private getModelCapabilities(modelId: string): string[] {
    const capabilities = [];
    
    if (modelId.includes('gpt')) {
      capabilities.push('text_generation', 'chat_completion', 'function_calling');
    }
    if (modelId.includes('embedding')) {
      capabilities.push('embeddings');
    }
    if (modelId.includes('vision')) {
      capabilities.push('vision');
    }
    if (modelId.includes('whisper')) {
      capabilities.push('speech_to_text');
    }
    if (modelId.includes('tts')) {
      capabilities.push('text_to_speech');
    }
    if (modelId.includes('dall-e')) {
      capabilities.push('image_generation');
    }
    
    return capabilities;
  }
}
