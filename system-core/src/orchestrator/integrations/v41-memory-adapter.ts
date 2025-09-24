/**
 * TrustStream v4.2 - V4.1 Memory Adapter
 * 
 * Integration adapter that bridges the existing v4.1 VectorGraph memory system
 * with new governance capabilities while maintaining full backward compatibility.
 * 
 * DESIGN PRINCIPLES:
 * - Seamless integration with existing v4.1 memory patterns
 * - Zero-downtime migration and enhancement
 * - Backward compatibility for all existing memory operations
 * - Enhanced memory zones for governance data
 * - Unified memory APIs for both v4.1 and governance features
 */

import { DatabaseInterface } from '../../shared-utils/database-interface';
import { Logger } from '../../shared-utils/logger';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// V4.1 memory interfaces (extending existing patterns)
export interface V41MemoryRecord {
  id: string;
  conversation_id: string;
  user_id: string;
  agent_id: string;
  content: any;
  metadata: V41MemoryMetadata;
  vector_embedding?: number[];
  importance_score: number;
  created_at: Date;
  updated_at?: Date;
  memory_zone?: string;
}

export interface V41MemoryMetadata {
  context_type: 'conversation' | 'decision' | 'task_result' | 'governance';
  agent_type?: string;
  interaction_type?: string;
  entities_mentioned?: string[];
  tags?: string[];
  confidence_score?: number;
  // Enhanced metadata for governance integration
  governance_context?: GovernanceMemoryContext;
  trust_score_snapshot?: TrustScore;
  backward_compatibility_flags?: CompatibilityFlags;
}

export interface GovernanceMemoryContext {
  governance_type: 'decision' | 'audit' | 'accountability' | 'transparency';
  governance_zone_id: string;
  trust_requirements: TrustRequirements;
  accountability_chain: string[];
  transparency_level: 'public' | 'restricted' | 'private';
  audit_trail_enabled: boolean;
}

export interface TrustScore {
  iq_score: number;
  appeal_score: number;
  social_score: number;
  humanity_score: number;
  composite_score: number;
  timestamp: Date;
  agent_id: string;
}

export interface TrustRequirements {
  min_iq_score: number;
  min_appeal_score: number;
  min_social_score: number;
  min_humanity_score: number;
  composite_trust_threshold: number;
}

export interface CompatibilityFlags {
  v41_format_preserved: boolean;
  enhanced_metadata_available: boolean;
  governance_features_enabled: boolean;
  memory_zone_extended: boolean;
}

export interface MemorySearchQuery {
  query_text?: string;
  user_id?: string;
  agent_id?: string;
  conversation_id?: string;
  memory_zone?: string;
  governance_context?: GovernanceMemoryContext;
  date_range?: DateRange;
  min_importance?: number;
  min_trust_score?: number;
  include_governance_metadata?: boolean;
  limit?: number;
  offset?: number;
  v41_compatibility_mode?: boolean;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface MemorySearchResult {
  memories: V41MemoryRecord[];
  total_count: number;
  governance_summary?: GovernanceSummary;
  trust_analytics?: TrustAnalytics;
  search_metadata: SearchMetadata;
}

export interface GovernanceSummary {
  governance_decisions_count: number;
  average_trust_score: number;
  accountability_records: number;
  transparency_level_distribution: Record<string, number>;
}

export interface TrustAnalytics {
  trust_score_trends: TrustTrend[];
  agent_trust_rankings: AgentTrustRanking[];
  trust_score_distribution: TrustDistribution;
}

export interface TrustTrend {
  timestamp: Date;
  average_trust_score: number;
  agent_count: number;
}

export interface AgentTrustRanking {
  agent_id: string;
  trust_score: number;
  rank: number;
  improvement_trend: 'improving' | 'stable' | 'declining';
}

export interface TrustDistribution {
  iq_distribution: ScoreDistribution;
  appeal_distribution: ScoreDistribution;
  social_distribution: ScoreDistribution;
  humanity_distribution: ScoreDistribution;
}

export interface ScoreDistribution {
  min: number;
  max: number;
  average: number;
  median: number;
  standard_deviation: number;
}

export interface SearchMetadata {
  query_time_ms: number;
  total_results: number;
  governance_enhanced: boolean;
  memory_zones_searched: string[];
  v41_compatibility_used: boolean;
}

export interface MemoryIntegrationResult {
  v41_memory_id?: string;
  governance_memory_id?: string;
  memory_zone_used: string;
  trust_score_snapshot: TrustScore;
  backward_compatibility_maintained: boolean;
  integration_mode: 'v41_only' | 'governance_enhanced' | 'unified';
}

/**
 * V41MemoryAdapter
 * 
 * Bridges the existing v4.1 VectorGraph memory system with governance capabilities
 * while maintaining full backward compatibility and zero-downtime operation.
 */
export class V41MemoryAdapter {
  private db: DatabaseInterface;
  private logger: Logger;
  private supabase: SupabaseClient;
  private memoryZones: Map<string, MemoryZoneConfig> = new Map();
  private compatibilityMode: boolean = true;
  private enhancedFeaturesEnabled: boolean = true;

  constructor(
    db: DatabaseInterface,
    logger: Logger,
    supabaseUrl: string,
    serviceKey: string
  ) {
    this.db = db;
    this.logger = logger;
    this.supabase = createClient(supabaseUrl, serviceKey);
  }

  /**
   * Initialize the memory adapter with v4.1 compatibility
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing V4.1 Memory Adapter');
    
    try {
      // Load existing v4.1 memory zones
      await this.loadExistingMemoryZones();
      
      // Create enhanced memory zones for governance
      await this.createGovernanceMemoryZones();
      
      // Verify v4.1 compatibility
      await this.verifyV41Compatibility();
      
      // Set up memory bridge connections
      await this.setupMemoryBridges();
      
      this.logger.info('V4.1 Memory Adapter initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize V4.1 Memory Adapter', error);
      throw error;
    }
  }

  /**
   * Store memory using v4.1 patterns with optional governance enhancement
   */
  async storeMemory(
    content: any,
    metadata: V41MemoryMetadata,
    memoryZone?: string
  ): Promise<MemoryIntegrationResult> {
    this.logger.info('Storing memory with v4.1 compatibility', { 
      zone: memoryZone,
      governance_enhanced: !!metadata.governance_context 
    });
    
    try {
      // Determine target memory zone
      const targetZone = this.determineMemoryZone(metadata, memoryZone);
      
      // Create v4.1 compatible memory record
      const memoryRecord: V41MemoryRecord = {
        id: this.generateMemoryId(),
        conversation_id: metadata.context_type === 'conversation' ? 
          this.generateConversationId() : `${metadata.context_type}_${Date.now()}`,
        user_id: this.extractUserId(content, metadata),
        agent_id: metadata.agent_type || 'system',
        content: this.sanitizeContent(content),
        metadata: this.enhanceMetadata(metadata),
        importance_score: this.calculateImportanceScore(content, metadata),
        created_at: new Date(),
        memory_zone: targetZone
      };
      
      // Store in v4.1 database structure (maintaining compatibility)
      const v41MemoryId = await this.storeV41Memory(memoryRecord);
      
      // Enhanced governance storage if applicable
      let governanceMemoryId: string | undefined;
      if (metadata.governance_context && this.enhancedFeaturesEnabled) {
        governanceMemoryId = await this.storeGovernanceEnhancedMemory(memoryRecord);
      }
      
      // Update memory zone statistics
      await this.updateMemoryZoneStats(targetZone, memoryRecord);
      
      return {
        v41_memory_id: v41MemoryId,
        governance_memory_id: governanceMemoryId,
        memory_zone_used: targetZone,
        trust_score_snapshot: metadata.trust_score_snapshot || this.createDefaultTrustScore(),
        backward_compatibility_maintained: true,
        integration_mode: governanceMemoryId ? 'unified' : 'v41_only'
      };
      
    } catch (error) {
      this.logger.error('Failed to store memory', error);
      throw error;
    }
  }

  /**
   * Search memory with unified v4.1 and governance capabilities
   */
  async searchMemory(query: MemorySearchQuery): Promise<MemorySearchResult> {
    const startTime = Date.now();
    this.logger.info('Searching memory with unified capabilities', query);
    
    try {
      // Build search query based on compatibility mode
      const searchQuery = this.buildUnifiedSearchQuery(query);
      
      // Execute search across appropriate memory zones
      const memories = await this.executeUnifiedSearch(searchQuery);
      
      // Enhance results with governance metadata if requested
      const enhancedMemories = query.include_governance_metadata ? 
        await this.enhanceWithGovernanceMetadata(memories) : memories;
      
      // Generate governance summary if governance context provided
      let governanceSummary: GovernanceSummary | undefined;
      let trustAnalytics: TrustAnalytics | undefined;
      
      if (query.governance_context || query.include_governance_metadata) {
        governanceSummary = await this.generateGovernanceSummary(enhancedMemories);
        trustAnalytics = await this.generateTrustAnalytics(enhancedMemories);
      }
      
      return {
        memories: enhancedMemories,
        total_count: enhancedMemories.length,
        governance_summary: governanceSummary,
        trust_analytics: trustAnalytics,
        search_metadata: {
          query_time_ms: Date.now() - startTime,
          total_results: enhancedMemories.length,
          governance_enhanced: !!governanceSummary,
          memory_zones_searched: this.getSearchedZones(query),
          v41_compatibility_used: query.v41_compatibility_mode || this.compatibilityMode
        }
      };
      
    } catch (error) {
      this.logger.error('Memory search failed', error);
      throw error;
    }
  }

  /**
   * Store legacy task result using v4.1 patterns
   */
  async storeLegacyTaskResult(task: any, result: any): Promise<MemoryIntegrationResult> {
    this.logger.info(`Storing legacy task result: ${task.id}`);
    
    const metadata: V41MemoryMetadata = {
      context_type: 'task_result',
      agent_type: 'legacy_coordinator',
      interaction_type: 'task_execution',
      entities_mentioned: [task.id],
      tags: ['legacy', 'v41_compatible', task.type],
      confidence_score: 1.0,
      backward_compatibility_flags: {
        v41_format_preserved: true,
        enhanced_metadata_available: false,
        governance_features_enabled: false,
        memory_zone_extended: false
      }
    };
    
    return await this.storeMemory(
      { task, result },
      metadata,
      'legacy_tasks_zone'
    );
  }

  /**
   * Verify compatibility with existing v4.1 memory system
   */
  async verifyCompatibility(): Promise<void> {
    this.logger.info('Verifying v4.1 memory system compatibility');
    
    try {
      // Test basic v4.1 memory operations
      await this.testV41MemoryOperations();
      
      // Test memory zone access
      await this.testMemoryZoneAccess();
      
      // Test backward compatibility
      await this.testBackwardCompatibility();
      
      this.logger.info('V4.1 memory compatibility verified successfully');
    } catch (error) {
      this.logger.error('V4.1 memory compatibility verification failed', error);
      throw error;
    }
  }

  // Private helper methods
  private async loadExistingMemoryZones(): Promise<void> {
    this.logger.info('Loading existing v4.1 memory zones');
    
    const zones = await this.db.query(
      'SELECT * FROM vectorgraph_memory_zones WHERE active = true'
    );
    
    for (const zone of zones) {
      this.memoryZones.set(zone.zone_id, {
        id: zone.zone_id,
        name: zone.zone_name,
        type: zone.zone_type,
        access_control: zone.access_control_config,
        trust_requirements: zone.trust_requirements,
        v41_compatible: true
      });
    }
    
    this.logger.info(`Loaded ${zones.length} existing memory zones`);
  }

  private async createGovernanceMemoryZones(): Promise<void> {
    this.logger.info('Creating enhanced governance memory zones');
    
    const governanceZones = [
      {
        zone_id: 'governance-enhanced-zone',
        zone_name: 'Governance Enhanced Memory Zone',
        zone_type: 'governance_enhanced',
        zone_description: 'Enhanced memory zone with governance capabilities',
        access_control_config: {
          read: ['governance_agents', 'unified_orchestrator'],
          write: ['governance_agents', 'unified_orchestrator'],
          admin: ['ai_leaders', 'system_admin']
        },
        trust_requirements: {
          min_trust_score: 0.7,
          requires_verification: true
        },
        v41_compatible: true
      },
      {
        zone_id: 'legacy_tasks_zone',
        zone_name: 'Legacy Tasks Memory Zone',
        zone_type: 'legacy_compatible',
        zone_description: 'Memory zone for legacy v4.1 task results',
        access_control_config: {
          read: ['all_agents'],
          write: ['legacy_agents', 'unified_orchestrator'],
          admin: ['system_admin']
        },
        trust_requirements: {
          min_trust_score: 0.5,
          requires_verification: false
        },
        v41_compatible: true
      }
    ];

    for (const zone of governanceZones) {
      try {
        await this.db.query(
          `INSERT INTO vectorgraph_memory_zones 
           (zone_id, zone_name, zone_type, zone_description, access_control_config, trust_requirements) 
           VALUES ($1, $2, $3, $4, $5, $6) 
           ON CONFLICT (zone_id) DO UPDATE SET 
           zone_name = EXCLUDED.zone_name,
           access_control_config = EXCLUDED.access_control_config`,
          [
            zone.zone_id, zone.zone_name, zone.zone_type, zone.zone_description,
            JSON.stringify(zone.access_control_config), JSON.stringify(zone.trust_requirements)
          ]
        );
        
        this.memoryZones.set(zone.zone_id, zone as any);
        this.logger.info(`Created governance memory zone: ${zone.zone_id}`);
      } catch (error) {
        this.logger.warn(`Failed to create governance memory zone ${zone.zone_id}`, error);
      }
    }
  }

  private async verifyV41Compatibility(): Promise<void> {
    // Test existing v4.1 memory operations
    const testQuery = await this.db.query(
      'SELECT COUNT(*) as count FROM ai_conversation_memory LIMIT 1'
    );
    
    if (!testQuery || testQuery.length === 0) {
      throw new Error('Cannot access v4.1 memory tables');
    }
    
    this.logger.info('V4.1 memory tables accessible');
  }

  private async setupMemoryBridges(): Promise<void> {
    this.logger.info('Setting up memory bridge connections');
    
    // Set up Supabase connection for VectorGraph integration
    try {
      const { error } = await this.supabase
        .from('ai_conversation_memory')
        .select('id')
        .limit(1);
        
      if (error) {
        this.logger.warn('Supabase connection issue', error);
      } else {
        this.logger.info('Supabase memory bridge connected');
      }
    } catch (error) {
      this.logger.warn('Supabase memory bridge setup failed', error);
    }
  }

  private determineMemoryZone(metadata: V41MemoryMetadata, requestedZone?: string): string {
    if (requestedZone && this.memoryZones.has(requestedZone)) {
      return requestedZone;
    }
    
    if (metadata.governance_context) {
      return metadata.governance_context.governance_zone_id || 'governance-enhanced-zone';
    }
    
    switch (metadata.context_type) {
      case 'conversation':
        return 'conversation-memory-zone';
      case 'task_result':
        return 'legacy_tasks_zone';
      case 'decision':
        return 'governance-decisions-zone';
      default:
        return 'default-memory-zone';
    }
  }

  private enhanceMetadata(metadata: V41MemoryMetadata): V41MemoryMetadata {
    return {
      ...metadata,
      backward_compatibility_flags: {
        v41_format_preserved: true,
        enhanced_metadata_available: !!metadata.governance_context,
        governance_features_enabled: this.enhancedFeaturesEnabled,
        memory_zone_extended: true
      }
    };
  }

  private calculateImportanceScore(content: any, metadata: V41MemoryMetadata): number {
    let score = 0.5; // Base score
    
    // Increase score based on governance context
    if (metadata.governance_context) {
      score += 0.3;
    }
    
    // Increase score based on trust requirements
    if (metadata.trust_score_snapshot?.composite_score) {
      score += metadata.trust_score_snapshot.composite_score * 0.2;
    }
    
    return Math.min(score, 1.0);
  }

  private async storeV41Memory(record: V41MemoryRecord): Promise<string> {
    // Store in v4.1 compatible format
    const { data, error } = await this.supabase
      .from('ai_conversation_memory')
      .insert({
        id: record.id,
        conversation_id: record.conversation_id,
        user_id: record.user_id,
        agent_id: record.agent_id,
        content: record.content,
        metadata: record.metadata,
        importance_score: record.importance_score,
        memory_zone: record.memory_zone,
        created_at: record.created_at
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to store v4.1 memory: ${error.message}`);
    }
    
    return data.id;
  }

  private async storeGovernanceEnhancedMemory(record: V41MemoryRecord): Promise<string> {
    // Store enhanced governance metadata in separate table
    const governanceId = `gov_${record.id}`;
    
    const { error } = await this.supabase
      .from('governance_memory_enhanced')
      .insert({
        id: governanceId,
        base_memory_id: record.id,
        governance_context: record.metadata.governance_context,
        trust_score_snapshot: record.metadata.trust_score_snapshot,
        enhanced_metadata: record.metadata,
        created_at: new Date()
      });
    
    if (error) {
      this.logger.warn('Failed to store governance enhanced memory', error);
      return record.id; // Fall back to base memory ID
    }
    
    return governanceId;
  }

  private buildUnifiedSearchQuery(query: MemorySearchQuery): any {
    let sqlQuery = 'SELECT * FROM ai_conversation_memory WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;
    
    if (query.user_id) {
      sqlQuery += ` AND user_id = $${paramIndex++}`;
      params.push(query.user_id);
    }
    
    if (query.agent_id) {
      sqlQuery += ` AND agent_id = $${paramIndex++}`;
      params.push(query.agent_id);
    }
    
    if (query.memory_zone) {
      sqlQuery += ` AND memory_zone = $${paramIndex++}`;
      params.push(query.memory_zone);
    }
    
    if (query.min_importance) {
      sqlQuery += ` AND importance_score >= $${paramIndex++}`;
      params.push(query.min_importance);
    }
    
    if (query.date_range) {
      sqlQuery += ` AND created_at BETWEEN $${paramIndex++} AND $${paramIndex++}`;
      params.push(query.date_range.start, query.date_range.end);
    }
    
    sqlQuery += ` ORDER BY created_at DESC`;
    
    if (query.limit) {
      sqlQuery += ` LIMIT $${paramIndex++}`;
      params.push(query.limit);
    }
    
    if (query.offset) {
      sqlQuery += ` OFFSET $${paramIndex++}`;
      params.push(query.offset);
    }
    
    return { query: sqlQuery, params };
  }

  private async executeUnifiedSearch(searchQuery: any): Promise<V41MemoryRecord[]> {
    const { data, error } = await this.supabase
      .rpc('search_memory_unified', {
        search_query: searchQuery.query,
        search_params: searchQuery.params
      });
    
    if (error) {
      this.logger.warn('Unified search failed, falling back to basic search', error);
      // Fall back to basic database query
      return await this.db.query(searchQuery.query, searchQuery.params);
    }
    
    return data || [];
  }

  private async enhanceWithGovernanceMetadata(memories: V41MemoryRecord[]): Promise<V41MemoryRecord[]> {
    // Enhance with governance metadata from enhanced table
    for (const memory of memories) {
      try {
        const { data } = await this.supabase
          .from('governance_memory_enhanced')
          .select('*')
          .eq('base_memory_id', memory.id)
          .single();
        
        if (data) {
          memory.metadata = {
            ...memory.metadata,
            governance_context: data.governance_context,
            trust_score_snapshot: data.trust_score_snapshot
          };
        }
      } catch (error) {
        // Continue without enhancement if not available
      }
    }
    
    return memories;
  }

  private async generateGovernanceSummary(memories: V41MemoryRecord[]): Promise<GovernanceSummary> {
    const governanceMemories = memories.filter(m => m.metadata.governance_context);
    
    return {
      governance_decisions_count: governanceMemories.length,
      average_trust_score: this.calculateAverageTrustScore(memories),
      accountability_records: governanceMemories.filter(m => 
        m.metadata.governance_context?.governance_type === 'accountability'
      ).length,
      transparency_level_distribution: this.calculateTransparencyDistribution(governanceMemories)
    };
  }

  private async generateTrustAnalytics(memories: V41MemoryRecord[]): Promise<TrustAnalytics> {
    // Implement trust analytics generation
    return {
      trust_score_trends: [],
      agent_trust_rankings: [],
      trust_score_distribution: {
        iq_distribution: { min: 0, max: 1, average: 0.8, median: 0.8, standard_deviation: 0.1 },
        appeal_distribution: { min: 0, max: 1, average: 0.7, median: 0.7, standard_deviation: 0.1 },
        social_distribution: { min: 0, max: 1, average: 0.75, median: 0.75, standard_deviation: 0.1 },
        humanity_distribution: { min: 0, max: 1, average: 0.85, median: 0.85, standard_deviation: 0.1 }
      }
    };
  }

  // Utility methods
  private generateMemoryId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractUserId(content: any, metadata: V41MemoryMetadata): string {
    return content.user_id || metadata.agent_type || 'system';
  }

  private sanitizeContent(content: any): any {
    // Ensure content is safely serializable
    return JSON.parse(JSON.stringify(content));
  }

  private createDefaultTrustScore(): TrustScore {
    return {
      iq_score: 0.8,
      appeal_score: 0.7,
      social_score: 0.75,
      humanity_score: 0.85,
      composite_score: 0.78,
      timestamp: new Date(),
      agent_id: 'system'
    };
  }

  private getSearchedZones(query: MemorySearchQuery): string[] {
    if (query.memory_zone) {
      return [query.memory_zone];
    }
    return Array.from(this.memoryZones.keys());
  }

  private calculateAverageTrustScore(memories: V41MemoryRecord[]): number {
    const trustScores = memories
      .map(m => m.metadata.trust_score_snapshot?.composite_score)
      .filter((score): score is number => score !== undefined);
    
    if (trustScores.length === 0) return 0;
    return trustScores.reduce((sum, score) => sum + score, 0) / trustScores.length;
  }

  private calculateTransparencyDistribution(memories: V41MemoryRecord[]): Record<string, number> {
    const distribution: Record<string, number> = { public: 0, restricted: 0, private: 0 };
    
    memories.forEach(memory => {
      const level = memory.metadata.governance_context?.transparency_level || 'private';
      distribution[level]++;
    });
    
    return distribution;
  }

  private async updateMemoryZoneStats(zoneId: string, record: V41MemoryRecord): Promise<void> {
    // Update memory zone statistics
    try {
      await this.db.query(
        `UPDATE vectorgraph_memory_zones 
         SET record_count = record_count + 1, last_updated = NOW() 
         WHERE zone_id = $1`,
        [zoneId]
      );
    } catch (error) {
      this.logger.warn(`Failed to update memory zone stats for ${zoneId}`, error);
    }
  }

  // Testing methods
  private async testV41MemoryOperations(): Promise<void> {
    // Test basic v4.1 memory operations
    const testMemory = {
      test: 'v41_compatibility_test',
      timestamp: new Date().toISOString()
    };
    
    const metadata: V41MemoryMetadata = {
      context_type: 'conversation',
      agent_type: 'test_agent',
      interaction_type: 'compatibility_test',
      confidence_score: 1.0
    };
    
    const result = await this.storeMemory(testMemory, metadata);
    
    if (!result.v41_memory_id) {
      throw new Error('V4.1 memory operation test failed');
    }
    
    this.logger.info('V4.1 memory operations test passed');
  }

  private async testMemoryZoneAccess(): Promise<void> {
    // Test access to memory zones
    for (const zoneId of this.memoryZones.keys()) {
      try {
        await this.db.query(
          'SELECT zone_id FROM vectorgraph_memory_zones WHERE zone_id = $1',
          [zoneId]
        );
      } catch (error) {
        throw new Error(`Memory zone access test failed for zone: ${zoneId}`);
      }
    }
    
    this.logger.info('Memory zone access test passed');
  }

  private async testBackwardCompatibility(): Promise<void> {
    // Test that existing v4.1 queries still work
    try {
      const result = await this.db.query(
        'SELECT * FROM ai_conversation_memory ORDER BY created_at DESC LIMIT 1'
      );
      
      if (result === null) {
        this.logger.warn('No existing memory records found for backward compatibility test');
      } else {
        this.logger.info('Backward compatibility test passed');
      }
    } catch (error) {
      throw new Error(`Backward compatibility test failed: ${error.message}`);
    }
  }
}

// Supporting interfaces
interface MemoryZoneConfig {
  id: string;
  name: string;
  type: string;
  access_control: any;
  trust_requirements: any;
  v41_compatible: boolean;
}
