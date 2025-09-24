/**
 * Enhanced Semantic Search Engine
 * Advanced search capabilities with AI-powered query understanding
 */

import { EventEmitter } from 'events';
import { UnifiedAIService } from '../ai/UnifiedAIService';
import { DatabaseInterface } from '../../shared-utils/database-interface';
import { Logger } from '../../shared-utils/logger';
import { KnowledgeNode, KnowledgeEdge, SemanticQuery, SemanticSearchResult } from './knowledge-graph-storage';

export interface SearchIntent {
  query_type: 'factual' | 'conceptual' | 'procedural' | 'exploratory' | 'comparative';
  intent_confidence: number;
  extracted_entities: Array<{
    entity: string;
    type: string;
    confidence: number;
  }>;
  query_expansion: string[];
  temporal_context?: {
    time_reference: 'past' | 'present' | 'future' | 'timeless';
    specific_timeframe?: string;
  };
}

export interface SearchContext {
  user_id: string;
  session_id: string;
  previous_queries: string[];
  domain_preferences: string[];
  trust_profile: {
    min_trust_threshold: number;
    preferred_sources: string[];
    validation_requirements: string[];
  };
  personalization_factors: {
    expertise_level: 'beginner' | 'intermediate' | 'expert';
    preferred_complexity: 'simple' | 'moderate' | 'complex';
    learning_style: 'visual' | 'textual' | 'interactive';
  };
}

export interface EnhancedSearchResult {
  primary_results: KnowledgeNode[];
  related_concepts: KnowledgeNode[];
  knowledge_pathways: Array<{
    path_id: string;
    nodes: KnowledgeNode[];
    relationships: KnowledgeEdge[];
    pathway_coherence: number;
    learning_difficulty: number;
  }>;
  fact_verification: Array<{
    claim: string;
    verification_status: 'verified' | 'disputed' | 'unverified';
    sources: string[];
    confidence: number;
  }>;
  search_analytics: {
    intent_analysis: SearchIntent;
    query_complexity: number;
    result_diversity: number;
    personalization_score: number;
  };
  suggested_refinements: string[];
  knowledge_gaps: Array<{
    gap_description: string;
    potential_sources: string[];
    research_difficulty: number;
  }>;
}

export interface MultiModalSearchQuery {
  text_query?: string;
  image_query?: {
    image_data: Buffer;
    description?: string;
  };
  audio_query?: {
    audio_data: Buffer;
    transcription?: string;
  };
  document_query?: {
    document_data: Buffer;
    document_type: string;
  };
  combined_weight?: {
    text: number;
    image: number;
    audio: number;
    document: number;
  };
}

/**
 * Enhanced Semantic Search Engine
 * Provides advanced search capabilities with AI-powered understanding
 */
export class EnhancedSemanticSearch extends EventEmitter {
  private db: DatabaseInterface;
  private logger: Logger;
  private aiService: UnifiedAIService;
  private searchCache = new Map<string, EnhancedSearchResult>();
  private intentCache = new Map<string, SearchIntent>();
  private queryEmbeddingCache = new Map<string, number[]>();

  constructor(
    db: DatabaseInterface,
    logger: Logger,
    aiService: UnifiedAIService
  ) {
    super();
    this.db = db;
    this.logger = logger;
    this.aiService = aiService;
  }

  /**
   * Perform enhanced semantic search with AI-powered query understanding
   */
  async enhancedSearch(
    query: string,
    context: SearchContext,
    options: {
      max_results?: number;
      include_pathways?: boolean;
      enable_fact_checking?: boolean;
      personalize?: boolean;
    } = {}
  ): Promise<EnhancedSearchResult> {
    this.logger.info('Performing enhanced semantic search', {
      query: query.substring(0, 100),
      user_id: context.user_id
    });

    try {
      // Check cache first
      const cacheKey = this.generateSearchCacheKey(query, context, options);
      const cached = this.searchCache.get(cacheKey);
      if (cached) {
        this.logger.debug('Returning cached search result');
        return cached;
      }

      // Analyze search intent using AI
      const searchIntent = await this.analyzeSearchIntent(query, context);

      // Generate query embedding with intent enhancement
      const enhancedQuery = this.enhanceQueryWithIntent(query, searchIntent);
      const queryEmbedding = await this.getOrCreateEmbedding(enhancedQuery);

      // Perform multi-stage search
      const primaryResults = await this.performPrimarySearch(
        queryEmbedding,
        searchIntent,
        context,
        options.max_results || 20
      );

      // Find related concepts through knowledge graph traversal
      const relatedConcepts = await this.findRelatedConcepts(
        primaryResults,
        searchIntent,
        context
      );

      // Generate knowledge pathways if requested
      let knowledgePathways: any[] = [];
      if (options.include_pathways) {
        knowledgePathways = await this.generateKnowledgePathways(
          primaryResults,
          relatedConcepts,
          context.personalization_factors.expertise_level
        );
      }

      // Perform fact verification if enabled
      let factVerification: any[] = [];
      if (options.enable_fact_checking) {
        factVerification = await this.performFactVerification(
          primaryResults,
          query
        );
      }

      // Calculate analytics
      const searchAnalytics = this.calculateSearchAnalytics(
        query,
        searchIntent,
        primaryResults,
        context
      );

      // Generate suggestions and identify knowledge gaps
      const suggestedRefinements = await this.generateSearchRefinements(
        query,
        searchIntent,
        primaryResults
      );

      const knowledgeGaps = await this.identifyKnowledgeGaps(
        query,
        primaryResults,
        searchIntent
      );

      const result: EnhancedSearchResult = {
        primary_results: primaryResults,
        related_concepts: relatedConcepts,
        knowledge_pathways: knowledgePathways,
        fact_verification: factVerification,
        search_analytics: {
          intent_analysis: searchIntent,
          query_complexity: this.calculateQueryComplexity(query),
          result_diversity: this.calculateResultDiversity(primaryResults),
          personalization_score: options.personalize ? 0.8 : 0.0
        },
        suggested_refinements: suggestedRefinements,
        knowledge_gaps: knowledgeGaps
      };

      // Cache the result
      this.searchCache.set(cacheKey, result);

      this.emit('search:completed', {
        query: query.substring(0, 100),
        user_id: context.user_id,
        results_count: primaryResults.length,
        intent_type: searchIntent.query_type
      });

      return result;
    } catch (error) {
      this.logger.error('Enhanced semantic search failed', error);
      throw error;
    }
  }

  /**
   * Multi-modal search supporting text, images, audio, and documents
   */
  async multiModalSearch(
    query: MultiModalSearchQuery,
    context: SearchContext,
    options: any = {}
  ): Promise<EnhancedSearchResult> {
    this.logger.info('Performing multi-modal search', {
      has_text: !!query.text_query,
      has_image: !!query.image_query,
      has_audio: !!query.audio_query,
      has_document: !!query.document_query
    });

    try {
      const modalityEmbeddings: { [key: string]: number[] } = {};
      const weights = query.combined_weight || { text: 1, image: 0, audio: 0, document: 0 };

      // Process text query
      if (query.text_query && weights.text > 0) {
        modalityEmbeddings.text = await this.getOrCreateEmbedding(query.text_query);
      }

      // Process image query using vision capabilities
      if (query.image_query && weights.image > 0) {
        const imageAnalysis = await this.aiService.analyzeImage(
          query.image_query.image_data,
          {
            include_description: true,
            extract_text: true,
            identify_objects: true
          }
        );
        
        const imageDescription = imageAnalysis.description || query.image_query.description || '';
        modalityEmbeddings.image = await this.getOrCreateEmbedding(imageDescription);
      }

      // Process audio query
      if (query.audio_query && weights.audio > 0) {
        let audioText = query.audio_query.transcription;
        if (!audioText) {
          const transcription = await this.aiService.transcribeAudio(
            query.audio_query.audio_data,
            { language: 'auto' }
          );
          audioText = transcription.text;
        }
        modalityEmbeddings.audio = await this.getOrCreateEmbedding(audioText);
      }

      // Process document query
      if (query.document_query && weights.document > 0) {
        // Extract text from document (implementation would depend on document type)
        const documentText = await this.extractTextFromDocument(
          query.document_query.document_data,
          query.document_query.document_type
        );
        modalityEmbeddings.document = await this.getOrCreateEmbedding(documentText);
      }

      // Combine embeddings with weights
      const combinedEmbedding = this.combineEmbeddings(modalityEmbeddings, weights);

      // Create a combined text query for intent analysis
      const combinedTextQuery = this.createCombinedTextQuery(query);
      
      // Perform enhanced search with combined embedding
      const searchIntent = await this.analyzeSearchIntent(combinedTextQuery, context);
      
      const primaryResults = await this.performPrimarySearchWithEmbedding(
        combinedEmbedding,
        searchIntent,
        context,
        options.max_results || 20
      );

      // Continue with standard enhanced search pipeline
      const relatedConcepts = await this.findRelatedConcepts(primaryResults, searchIntent, context);
      
      return {
        primary_results: primaryResults,
        related_concepts: relatedConcepts,
        knowledge_pathways: [],
        fact_verification: [],
        search_analytics: {
          intent_analysis: searchIntent,
          query_complexity: this.calculateQueryComplexity(combinedTextQuery),
          result_diversity: this.calculateResultDiversity(primaryResults),
          personalization_score: 0.5
        },
        suggested_refinements: [],
        knowledge_gaps: []
      };
    } catch (error) {
      this.logger.error('Multi-modal search failed', error);
      throw error;
    }
  }

  /**
   * Conversational search that maintains context across queries
   */
  async conversationalSearch(
    query: string,
    context: SearchContext,
    conversationHistory: Array<{
      query: string;
      response: EnhancedSearchResult;
      timestamp: Date;
    }>
  ): Promise<EnhancedSearchResult> {
    this.logger.info('Performing conversational search', {
      query: query.substring(0, 100),
      history_length: conversationHistory.length
    });

    try {
      // Enhance query with conversation context
      const contextualQuery = await this.enhanceQueryWithConversationContext(
        query,
        conversationHistory
      );

      // Update search context with conversation insights
      const enhancedContext = this.updateContextWithConversation(context, conversationHistory);

      // Perform enhanced search with contextual understanding
      return this.enhancedSearch(contextualQuery, enhancedContext, {
        max_results: 15,
        include_pathways: true,
        enable_fact_checking: true,
        personalize: true
      });
    } catch (error) {
      this.logger.error('Conversational search failed', error);
      throw error;
    }
  }

  // Private helper methods

  private async analyzeSearchIntent(query: string, context: SearchContext): Promise<SearchIntent> {
    // Check cache first
    const cacheKey = `intent_${Buffer.from(query).toString('base64').substring(0, 32)}`;
    const cached = this.intentCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.aiService.chatCompletion([
        {
          role: 'system',
          content: 'Analyze the search intent and extract entities. Return JSON with query_type, intent_confidence, extracted_entities, query_expansion, and temporal_context.'
        },
        {
          role: 'user',
          content: `Analyze this search query: "${query}"\n\nUser context: expertise_level=${context.personalization_factors.expertise_level}, previous_queries=${context.previous_queries.slice(-3).join(', ')}`
        }
      ], {
        temperature: 0.3,
        max_tokens: 500
      });

      const analysis = JSON.parse(response.choices[0]?.message.content || '{}');
      
      const intent: SearchIntent = {
        query_type: analysis.query_type || 'factual',
        intent_confidence: analysis.intent_confidence || 0.7,
        extracted_entities: analysis.extracted_entities || [],
        query_expansion: analysis.query_expansion || [],
        temporal_context: analysis.temporal_context
      };

      // Cache the result
      this.intentCache.set(cacheKey, intent);

      return intent;
    } catch (error) {
      this.logger.warn('Intent analysis failed, using default', error);
      return {
        query_type: 'factual',
        intent_confidence: 0.5,
        extracted_entities: [],
        query_expansion: []
      };
    }
  }

  private enhanceQueryWithIntent(query: string, intent: SearchIntent): string {
    let enhanced = query;
    
    // Add entity context
    if (intent.extracted_entities.length > 0) {
      const entityTerms = intent.extracted_entities
        .filter(e => e.confidence > 0.7)
        .map(e => e.entity)
        .join(' ');
      enhanced += ` ${entityTerms}`;
    }

    // Add query expansions
    if (intent.query_expansion.length > 0) {
      enhanced += ` ${intent.query_expansion.slice(0, 3).join(' ')}`;
    }

    return enhanced.trim();
  }

  private async getOrCreateEmbedding(text: string): Promise<number[]> {
    const cacheKey = Buffer.from(text).toString('base64').substring(0, 32);
    const cached = this.queryEmbeddingCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.aiService.createEmbedding(text);
    this.queryEmbeddingCache.set(cacheKey, result.embedding);
    return result.embedding;
  }

  private async performPrimarySearch(
    embedding: number[],
    intent: SearchIntent,
    context: SearchContext,
    maxResults: number
  ): Promise<KnowledgeNode[]> {
    // Build search filters based on intent and context
    const filters = this.buildSearchFilters(intent, context);
    
    const query = `
      SELECT vmo.*, ve.embedding_vector,
             (ve.embedding_vector <=> $1::vector) as similarity_distance
      FROM vectorgraph_memory_objects vmo
      JOIN vector_embeddings ve ON ve.content_hash = vmo.content_hash
      ${filters}
      AND vmo.memory_status = 'active'
      ORDER BY ve.embedding_vector <=> $1::vector
      LIMIT $2
    `;

    const result = await this.db.query(query, [JSON.stringify(embedding), maxResults]);
    return result.rows.map(row => this.mapRowToKnowledgeNode(row));
  }

  private async performPrimarySearchWithEmbedding(
    embedding: number[],
    intent: SearchIntent,
    context: SearchContext,
    maxResults: number
  ): Promise<KnowledgeNode[]> {
    return this.performPrimarySearch(embedding, intent, context, maxResults);
  }

  private buildSearchFilters(intent: SearchIntent, context: SearchContext): string {
    const conditions: string[] = [];
    
    // Apply trust threshold
    if (context.trust_profile.min_trust_threshold > 0) {
      conditions.push(`(
        ((vmo.trust_score_4d->>'iq')::numeric + 
         (vmo.trust_score_4d->>'appeal')::numeric + 
         (vmo.trust_score_4d->>'social')::numeric + 
         (vmo.trust_score_4d->>'humanity')::numeric) / 4
      ) >= ${context.trust_profile.min_trust_threshold}`);
    }

    // Apply domain preferences
    if (context.domain_preferences.length > 0) {
      const domains = context.domain_preferences.map(d => `'${d}'`).join(',');
      conditions.push(`vmo.metadata->>'knowledge_domain' IN (${domains})`);
    }

    // Apply query type specific filters
    if (intent.query_type === 'factual') {
      conditions.push(`vmo.metadata->>'verification_status' != 'disputed'`);
    }

    return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  }

  private async findRelatedConcepts(
    primaryResults: KnowledgeNode[],
    intent: SearchIntent,
    context: SearchContext
  ): Promise<KnowledgeNode[]> {
    if (primaryResults.length === 0) return [];

    // Find concepts related through knowledge graph relationships
    const nodeIds = primaryResults.slice(0, 5).map(n => `'${n.id}'`).join(',');
    
    const query = `
      SELECT DISTINCT vmo.*, ve.embedding_vector
      FROM knowledge_graph_edges kge
      JOIN vectorgraph_memory_objects vmo ON (
        vmo.memory_id = kge.target_node_id OR vmo.memory_id = kge.source_node_id
      )
      JOIN vector_embeddings ve ON ve.content_hash = vmo.content_hash
      WHERE (kge.source_node_id IN (${nodeIds}) OR kge.target_node_id IN (${nodeIds}))
      AND vmo.memory_id NOT IN (${nodeIds})
      AND kge.confidence > 0.6
      ORDER BY kge.weight DESC
      LIMIT 10
    `;

    try {
      const result = await this.db.query(query);
      return result.rows.map(row => this.mapRowToKnowledgeNode(row));
    } catch (error) {
      this.logger.warn('Failed to find related concepts', error);
      return [];
    }
  }

  private async generateKnowledgePathways(
    primaryResults: KnowledgeNode[],
    relatedConcepts: KnowledgeNode[],
    expertiseLevel: string
  ): Promise<any[]> {
    // Generate learning pathways based on expertise level
    // This would implement pathway generation logic
    return [];
  }

  private async performFactVerification(
    results: KnowledgeNode[],
    query: string
  ): Promise<any[]> {
    // Extract claims and verify against trusted sources
    return [];
  }

  private calculateSearchAnalytics(
    query: string,
    intent: SearchIntent,
    results: KnowledgeNode[],
    context: SearchContext
  ): any {
    return {
      intent_analysis: intent,
      query_complexity: this.calculateQueryComplexity(query),
      result_diversity: this.calculateResultDiversity(results),
      personalization_score: 0.7
    };
  }

  private async generateSearchRefinements(
    query: string,
    intent: SearchIntent,
    results: KnowledgeNode[]
  ): Promise<string[]> {
    // Generate suggested query refinements using AI
    return [];
  }

  private async identifyKnowledgeGaps(
    query: string,
    results: KnowledgeNode[],
    intent: SearchIntent
  ): Promise<any[]> {
    // Identify gaps in knowledge coverage
    return [];
  }

  private calculateQueryComplexity(query: string): number {
    // Calculate complexity based on length, entities, etc.
    return Math.min(query.length / 100, 1.0);
  }

  private calculateResultDiversity(results: KnowledgeNode[]): number {
    // Calculate diversity of result domains and types
    if (results.length === 0) return 0;
    
    const domains = new Set(results.map(r => r.metadata.knowledge_domain));
    return domains.size / results.length;
  }

  private combineEmbeddings(
    embeddings: { [key: string]: number[] },
    weights: { [key: string]: number }
  ): number[] {
    // Combine multiple embeddings with weights
    const keys = Object.keys(embeddings);
    if (keys.length === 0) return [];
    
    const dimension = embeddings[keys[0]].length;
    const combined = new Array(dimension).fill(0);
    let totalWeight = 0;
    
    for (const key of keys) {
      const weight = weights[key] || 0;
      if (weight > 0) {
        for (let i = 0; i < dimension; i++) {
          combined[i] += embeddings[key][i] * weight;
        }
        totalWeight += weight;
      }
    }
    
    // Normalize
    if (totalWeight > 0) {
      for (let i = 0; i < dimension; i++) {
        combined[i] /= totalWeight;
      }
    }
    
    return combined;
  }

  private createCombinedTextQuery(query: MultiModalSearchQuery): string {
    const parts: string[] = [];
    
    if (query.text_query) parts.push(query.text_query);
    if (query.image_query?.description) parts.push(`Image: ${query.image_query.description}`);
    if (query.audio_query?.transcription) parts.push(`Audio: ${query.audio_query.transcription}`);
    
    return parts.join(' ');
  }

  private async extractTextFromDocument(data: Buffer, type: string): Promise<string> {
    // Extract text from various document types
    // Implementation would depend on document type (PDF, DOCX, etc.)
    return 'extracted document text';
  }

  private async enhanceQueryWithConversationContext(
    query: string,
    history: Array<{ query: string; response: EnhancedSearchResult; timestamp: Date }>
  ): Promise<string> {
    if (history.length === 0) return query;
    
    // Use AI to enhance query with conversation context
    const recentHistory = history.slice(-3);
    const contextPrompt = recentHistory.map(h => h.query).join(' -> ');
    
    const response = await this.aiService.chatCompletion([
      {
        role: 'system',
        content: 'Enhance the current query with context from previous queries in the conversation.'
      },
      {
        role: 'user',
        content: `Previous queries: ${contextPrompt}\nCurrent query: ${query}\nEnhanced query:`
      }
    ]);
    
    return response.choices[0]?.message.content || query;
  }

  private updateContextWithConversation(
    context: SearchContext,
    history: Array<{ query: string; response: EnhancedSearchResult; timestamp: Date }>
  ): SearchContext {
    // Update context based on conversation history
    const updatedContext = { ...context };
    
    // Extract domain preferences from history
    const historyDomains = history.flatMap(h => 
      h.response.primary_results.map(r => r.metadata.knowledge_domain)
    );
    
    updatedContext.domain_preferences = [
      ...new Set([...context.domain_preferences, ...historyDomains])
    ].slice(0, 10);
    
    return updatedContext;
  }

  private mapRowToKnowledgeNode(row: any): KnowledgeNode {
    return {
      id: row.memory_id,
      type: row.content_type,
      content: JSON.parse(row.content_data),
      embedding: row.embedding_vector ? JSON.parse(row.embedding_vector) : undefined,
      metadata: {
        trust_score_4d: JSON.parse(row.trust_score_4d),
        vibe_score: row.vibe_score,
        community_validation_score: row.community_validation_score,
        semantic_tags: JSON.parse(row.metadata).semantic_tags || [],
        knowledge_domain: JSON.parse(row.metadata).knowledge_domain || 'general',
        created_by: row.creator_agent_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        quality_score: row.quality_score,
        ...JSON.parse(row.metadata)
      }
    };
  }

  private generateSearchCacheKey(query: string, context: SearchContext, options: any): string {
    const keyData = {
      query,
      user_id: context.user_id,
      trust_threshold: context.trust_profile.min_trust_threshold,
      domains: context.domain_preferences.sort(),
      options
    };
    return Buffer.from(JSON.stringify(keyData)).toString('base64').substring(0, 32);
  }
}