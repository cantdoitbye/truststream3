/**
 * AI Service Utilities
 * Common utility functions for AI service operations
 */

import { 
  TextGenerationResult, 
  ChatMessage, 
  EmbeddingResult,
  ModelInfo,
  AIError
} from '../ai.interface';

/**
 * Token estimation utilities
 */
export class TokenUtils {
  /**
   * Estimate token count for text (rough approximation)
   */
  static estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    // This is a simplification - actual tokenization varies by model
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate tokens for chat messages
   */
  static estimateChatTokens(messages: ChatMessage[]): number {
    return messages.reduce((total, message) => {
      return total + this.estimateTokens(message.content) + 4; // +4 for message formatting
    }, 3); // +3 for chat formatting
  }

  /**
   * Calculate cost estimate based on token usage
   */
  static estimateCost(
    promptTokens: number, 
    completionTokens: number, 
    pricing: { inputCost: number; outputCost: number; unit: string }
  ): number {
    if (pricing.unit === 'per_token') {
      return (promptTokens * pricing.inputCost) + (completionTokens * pricing.outputCost);
    }
    // Add other pricing models as needed
    return 0;
  }

  /**
   * Check if text exceeds model context length
   */
  static exceedsContextLength(text: string, maxTokens: number): boolean {
    return this.estimateTokens(text) > maxTokens;
  }

  /**
   * Truncate text to fit within token limit
   */
  static truncateToTokenLimit(text: string, maxTokens: number): string {
    const estimatedTokens = this.estimateTokens(text);
    if (estimatedTokens <= maxTokens) {
      return text;
    }

    const ratio = maxTokens / estimatedTokens;
    const truncatedLength = Math.floor(text.length * ratio);
    return text.substring(0, truncatedLength);
  }
}

/**
 * Text processing utilities
 */
export class TextUtils {
  /**
   * Clean and normalize text for AI processing
   */
  static cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')          // Normalize line endings
      .replace(/\s+/g, ' ')            // Collapse multiple spaces
      .replace(/\n{3,}/g, '\n\n')      // Limit consecutive newlines
      .trim();                         // Remove leading/trailing whitespace
  }

  /**
   * Split text into chunks for processing
   */
  static chunkText(text: string, maxChunkSize: number, overlap: number = 0): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+/);
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const cleanSentence = sentence.trim();
      if (!cleanSentence) continue;
      
      const potentialChunk = currentChunk + (currentChunk ? '. ' : '') + cleanSentence;
      
      if (TokenUtils.estimateTokens(potentialChunk) > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk);
          
          // Add overlap
          if (overlap > 0) {
            const overlapText = this.getLastNTokens(currentChunk, overlap);
            currentChunk = overlapText + '. ' + cleanSentence;
          } else {
            currentChunk = cleanSentence;
          }
        } else {
          // Single sentence is too long, split by words
          const words = cleanSentence.split(' ');
          let wordChunk = '';
          
          for (const word of words) {
            const potentialWordChunk = wordChunk + (wordChunk ? ' ' : '') + word;
            if (TokenUtils.estimateTokens(potentialWordChunk) > maxChunkSize) {
              if (wordChunk) {
                chunks.push(wordChunk);
                wordChunk = word;
              } else {
                // Single word is too long, just add it
                chunks.push(word);
              }
            } else {
              wordChunk = potentialWordChunk;
            }
          }
          
          if (wordChunk) {
            currentChunk = wordChunk;
          }
        }
      } else {
        currentChunk = potentialChunk;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }

  /**
   * Get last N tokens from text (approximation)
   */
  private static getLastNTokens(text: string, n: number): string {
    const words = text.split(' ');
    const estimatedWordsPerToken = 0.75; // Rough estimate
    const targetWords = Math.floor(n * estimatedWordsPerToken);
    
    if (targetWords >= words.length) {
      return text;
    }
    
    return words.slice(-targetWords).join(' ');
  }

  /**
   * Extract key information from text
   */
  static extractKeywords(text: string, maxKeywords: number = 10): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);

    // Simple frequency-based keyword extraction
    const frequency: Record<string, number> = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }

  /**
   * Calculate text similarity (simple Jaccard index)
   */
  static calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }
}

/**
 * Embedding utilities
 */
export class EmbeddingUtils {
  /**
   * Calculate cosine similarity between two embeddings
   */
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Calculate Euclidean distance between embeddings
   */
  static euclideanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have the same length');
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }

    return Math.sqrt(sum);
  }

  /**
   * Find most similar embeddings
   */
  static findMostSimilar(
    query: number[], 
    candidates: Array<{ embedding: number[]; data: any }>,
    topK: number = 5,
    metric: 'cosine' | 'euclidean' = 'cosine'
  ): Array<{ similarity: number; data: any }> {
    const similarities = candidates.map(candidate => {
      const similarity = metric === 'cosine' 
        ? this.cosineSimilarity(query, candidate.embedding)
        : 1 / (1 + this.euclideanDistance(query, candidate.embedding)); // Convert distance to similarity

      return {
        similarity,
        data: candidate.data
      };
    });

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Normalize embedding vector
   */
  static normalize(embedding: number[]): number[] {
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / norm);
  }

  /**
   * Calculate embedding centroid
   */
  static calculateCentroid(embeddings: number[][]): number[] {
    if (embeddings.length === 0) {
      throw new Error('Cannot calculate centroid of empty embeddings');
    }

    const dimensions = embeddings[0].length;
    const centroid = new Array(dimensions).fill(0);

    for (const embedding of embeddings) {
      for (let i = 0; i < dimensions; i++) {
        centroid[i] += embedding[i];
      }
    }

    return centroid.map(val => val / embeddings.length);
  }
}

/**
 * Response processing utilities
 */
export class ResponseUtils {
  /**
   * Extract structured data from AI response
   */
  static extractJSON(text: string): any {
    // Try to find JSON in the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // JSON parsing failed
      }
    }

    // Try to find array
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch {
        // Array parsing failed
      }
    }

    return null;
  }

  /**
   * Clean up AI response text
   */
  static cleanResponse(text: string): string {
    return text
      .replace(/^(AI|Assistant|Bot):\s*/i, '')  // Remove AI prefixes
      .replace(/\n{3,}/g, '\n\n')              // Limit consecutive newlines
      .trim();
  }

  /**
   * Extract code blocks from response
   */
  static extractCodeBlocks(text: string): Array<{ language: string; code: string }> {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const codeBlocks: Array<{ language: string; code: string }> = [];
    
    let match;
    while ((match = codeBlockRegex.exec(text)) !== null) {
      codeBlocks.push({
        language: match[1] || 'text',
        code: match[2].trim()
      });
    }

    return codeBlocks;
  }

  /**
   * Validate response completeness
   */
  static validateResponse(response: TextGenerationResult): {
    isComplete: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (!response.text || response.text.trim().length === 0) {
      issues.push('Response text is empty');
    }

    if (response.finishReason === 'length') {
      issues.push('Response was truncated due to length limit');
    }

    if (response.finishReason === 'content_filter') {
      issues.push('Response was filtered due to content policy');
    }

    if (response.usage.totalTokens === 0) {
      issues.push('No tokens were used in the response');
    }

    return {
      isComplete: issues.length === 0,
      issues
    };
  }
}

/**
 * Error handling utilities
 */
export class ErrorUtils {
  /**
   * Create standardized AI error
   */
  static createAIError(
    message: string,
    code: string,
    statusCode: number = 500,
    provider?: string,
    model?: string,
    cause?: Error
  ): AIError {
    return new AIError(message, code, statusCode, provider, model, cause);
  }

  /**
   * Parse provider-specific error
   */
  static parseProviderError(error: any, provider: string): AIError {
    if (error instanceof AIError) {
      return error;
    }

    let message = 'Unknown error';
    let code = 'UNKNOWN_ERROR';
    let statusCode = 500;

    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    } else if (error && typeof error === 'object') {
      message = error.message || error.error || JSON.stringify(error);
    }

    // Provider-specific error parsing
    switch (provider) {
      case 'openai':
        if (error?.status === 401) {
          code = 'INVALID_API_KEY';
          statusCode = 401;
        } else if (error?.status === 429) {
          code = 'RATE_LIMIT_EXCEEDED';
          statusCode = 429;
        } else if (error?.status === 400) {
          code = 'INVALID_REQUEST';
          statusCode = 400;
        }
        break;

      case 'anthropic':
        if (error?.status === 401) {
          code = 'INVALID_API_KEY';
          statusCode = 401;
        } else if (error?.status === 429) {
          code = 'RATE_LIMIT_EXCEEDED';
          statusCode = 429;
        }
        break;

      case 'local-llm':
        if (error?.code === 'ECONNREFUSED') {
          code = 'CONNECTION_REFUSED';
          message = 'Cannot connect to local LLM endpoint';
        } else if (error?.code === 'ETIMEDOUT') {
          code = 'REQUEST_TIMEOUT';
          message = 'Request to local LLM timed out';
        }
        break;
    }

    return new AIError(message, code, statusCode, provider, undefined, error instanceof Error ? error : undefined);
  }

  /**
   * Check if error is retryable
   */
  static isRetryableError(error: AIError): boolean {
    const retryableCodes = [
      'RATE_LIMIT_EXCEEDED',
      'REQUEST_TIMEOUT',
      'CONNECTION_REFUSED',
      'INTERNAL_SERVER_ERROR',
      'SERVICE_UNAVAILABLE'
    ];

    return retryableCodes.includes(error.code) || error.statusCode >= 500;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  static calculateRetryDelay(attempt: number, baseDelay: number = 1000): number {
    return Math.min(baseDelay * Math.pow(2, attempt), 60000); // Max 60 seconds
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceUtils {
  /**
   * Measure execution time
   */
  static async measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    return { result, duration };
  }

  /**
   * Calculate throughput metrics
   */
  static calculateThroughput(
    requests: number,
    timeWindow: number,
    tokens?: number
  ): {
    requestsPerSecond: number;
    tokensPerSecond?: number;
  } {
    const timeInSeconds = timeWindow / 1000;
    return {
      requestsPerSecond: requests / timeInSeconds,
      tokensPerSecond: tokens ? tokens / timeInSeconds : undefined
    };
  }

  /**
   * Calculate percentiles from latency data
   */
  static calculatePercentiles(latencies: number[]): {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
    min: number;
    max: number;
  } {
    const sorted = latencies.slice().sort((a, b) => a - b);
    const n = sorted.length;

    return {
      p50: sorted[Math.floor(n * 0.5)],
      p95: sorted[Math.floor(n * 0.95)],
      p99: sorted[Math.floor(n * 0.99)],
      avg: latencies.reduce((sum, val) => sum + val, 0) / n,
      min: sorted[0],
      max: sorted[n - 1]
    };
  }
}

/**
 * Export all utilities
 */
export const AIUtils = {
  TokenUtils,
  TextUtils,
  EmbeddingUtils,
  ResponseUtils,
  ErrorUtils,
  PerformanceUtils
};

export default AIUtils;
