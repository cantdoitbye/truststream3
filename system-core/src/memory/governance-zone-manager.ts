/**
 * TrustStream v4.2 - Memory Zone Manager Integration
 * 
 * Extends existing v4.1 memory zone functionality for governance operations.
 * Integrates with vectorgraph_memory_zones table and zone governance policies.
 * 
 * Author: MiniMax Agent
 * Date: 2025-09-20
 */

import { DatabaseInterface } from '../shared-utils/database-interface';
import { Logger } from '../shared-utils/logger';

export interface GovernanceMemoryZone {
  id: string;
  zone_id: string;
  zone_name: string;
  zone_type: string;
  governance_policy_id: string;
  access_control_config: {
    read: string[];
    write: string[];
    admin: string[];
  };
  trust_requirements: {
    min_trust_score: number;
    requires_verification: boolean;
    min_iq_score?: number;
    min_appeal_score?: number;
    min_social_score?: number;
    min_humanity_score?: number;
  };
}

/**
 * MemoryZoneManager
 * 
 * Manages governance-specific memory zones within the existing v4.1 memory architecture.
 * Provides zone-based access control and governance-specific memory operations.
 */
export class MemoryZoneManager {
  private db: DatabaseInterface;
  private logger: Logger;
  private supabaseUrl: string;
  private serviceKey: string;

  constructor(db: DatabaseInterface, logger: Logger, supabaseUrl: string, serviceKey: string) {
    this.db = db;
    this.logger = logger;
    this.supabaseUrl = supabaseUrl;
    this.serviceKey = serviceKey;
  }

  /**
   * Create governance memory zone using existing v4.1 schema
   */
  async createGovernanceZone(zoneConfig: Partial<GovernanceMemoryZone>): Promise<GovernanceMemoryZone> {
    this.logger.info('Creating governance memory zone', { zone_id: zoneConfig.zone_id });

    try {
      // Use existing v4.1 vectorgraph_memory_zones table structure
      const insertQuery = `
        INSERT INTO vectorgraph_memory_zones (
          zone_id, zone_name, zone_type, zone_description, 
          governance_policy_id, access_control_config, 
          read_permissions, write_permissions, admin_permissions,
          trust_requirements, zone_status, creator_agent_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const result = await this.db.query(insertQuery, [
        zoneConfig.zone_id,
        zoneConfig.zone_name,
        zoneConfig.zone_type,
        `Governance zone for ${zoneConfig.zone_type} operations`,
        zoneConfig.governance_policy_id || `governance-policy-${zoneConfig.zone_type}`,
        JSON.stringify(zoneConfig.access_control_config),
        JSON.stringify({ agents: zoneConfig.access_control_config?.read || [] }),
        JSON.stringify({ agents: zoneConfig.access_control_config?.write || [] }),
        JSON.stringify({ agents: zoneConfig.access_control_config?.admin || [] }),
        JSON.stringify(zoneConfig.trust_requirements),
        'active',
        'governance-orchestrator'
      ]);

      const createdZone = result.rows[0];
      this.logger.info('Successfully created governance memory zone', { 
        zone_id: createdZone.zone_id 
      });

      return this.mapDatabaseZoneToInterface(createdZone);
    } catch (error) {
      this.logger.error('Failed to create governance memory zone', error);
      throw error;
    }
  }

  /**
   * Check if agent has access to governance memory zone
   * Uses existing v4.1 access control patterns
   */
  async checkZoneAccess(
    zoneId: string, 
    agentId: string, 
    operation: 'read' | 'write' | 'admin',
    trustScore?: any
  ): Promise<boolean> {
    try {
      // Query existing v4.1 memory zone structure
      const zoneQuery = `
        SELECT access_control_config, trust_requirements, ${operation}_permissions 
        FROM vectorgraph_memory_zones 
        WHERE zone_id = $1 AND zone_status = 'active'
      `;

      const result = await this.db.query(zoneQuery, [zoneId]);
      
      if (result.rows.length === 0) {
        this.logger.warn('Governance memory zone not found', { zone_id: zoneId });
        return false;
      }

      const zone = result.rows[0];
      const accessConfig = zone.access_control_config;
      const trustRequirements = zone.trust_requirements;

      // Check basic access permissions
      const permissions = zone[`${operation}_permissions`];
      if (permissions?.agents && !permissions.agents.includes(agentId)) {
        this.logger.debug('Agent lacks basic permissions', { 
          agent_id: agentId, 
          zone_id: zoneId, 
          operation 
        });
        return false;
      }

      // Check governance-specific trust requirements
      if (trustScore && trustRequirements) {
        const meetsRequirements = this.checkTrustRequirements(trustScore, trustRequirements);
        if (!meetsRequirements) {
          this.logger.debug('Agent does not meet trust requirements', { 
            agent_id: agentId, 
            zone_id: zoneId,
            trust_score: trustScore,
            requirements: trustRequirements
          });
          return false;
        }
      }

      return true;
    } catch (error) {
      this.logger.error('Error checking zone access', error);
      return false;
    }
  }

  /**
   * Store memory in governance zone with access control
   * Integrates with existing v4.1 vectorgraph_memory_objects table
   */
  async storeInGovernanceZone(
    zoneId: string,
    memoryData: any,
    agentId: string,
    trustScore: any
  ): Promise<any> {
    this.logger.info('Storing memory in governance zone', { 
      zone_id: zoneId, 
      agent_id: agentId 
    });

    // Check write access to zone
    const hasAccess = await this.checkZoneAccess(zoneId, agentId, 'write', trustScore);
    if (!hasAccess) {
      throw new Error(`Agent ${agentId} lacks write access to zone ${zoneId}`);
    }

    try {
      // Use existing v4.1 VectorGraph memory manager for storage
      const response = await fetch(`${this.supabaseUrl}/functions/v1/vectorgraph-memory-manager`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.serviceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'store_memory',
          memoryData: {
            ...memoryData,
            memory_zone_id: zoneId, // Associate with governance zone
            creator_agent_id: agentId,
            governance_enhanced: true,
            zone_trust_score: trustScore
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to store in governance zone: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Log governance zone activity
      await this.logZoneActivity(zoneId, agentId, 'store', result.data?.id);
      
      return result.data;
    } catch (error) {
      this.logger.error('Failed to store memory in governance zone', error);
      throw error;
    }
  }

  /**
   * Retrieve memories from governance zone with trust filtering
   * Uses existing v4.1 trust-scored retrieval patterns
   */
  async retrieveFromGovernanceZone(
    zoneId: string,
    queryData: any,
    agentId: string,
    trustScore?: any
  ): Promise<any[]> {
    this.logger.info('Retrieving memories from governance zone', { 
      zone_id: zoneId, 
      agent_id: agentId 
    });

    // Check read access to zone
    const hasAccess = await this.checkZoneAccess(zoneId, agentId, 'read', trustScore);
    if (!hasAccess) {
      throw new Error(`Agent ${agentId} lacks read access to zone ${zoneId}`);
    }

    try {
      // Use existing v4.1 VectorGraph memory manager for retrieval
      const response = await fetch(`${this.supabaseUrl}/functions/v1/vectorgraph-memory-manager`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.serviceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'retrieve_memory',
          queryData: {
            ...queryData,
            zone_filter: zoneId, // Filter by governance zone
            governance_context: true
          },
          communityNamespace: queryData.communityNamespace || 'governance',
          filters: {
            ...queryData.filters,
            memory_zone_id: zoneId
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to retrieve from governance zone: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Log governance zone activity
      await this.logZoneActivity(zoneId, agentId, 'retrieve', null, result.data?.length);
      
      return result.data || [];
    } catch (error) {
      this.logger.error('Failed to retrieve memories from governance zone', error);
      throw error;
    }
  }

  /**
   * Check if trust score meets zone requirements
   * Uses existing v4.1 4D trust scoring (iq, appeal, social, humanity)
   */
  private checkTrustRequirements(trustScore: any, requirements: any): boolean {
    if (!trustScore || !requirements) return true;

    // Check overall trust score
    if (requirements.min_trust_score && trustScore.overall < requirements.min_trust_score) {
      return false;
    }

    // Check 4D trust scores (existing v4.1 pattern)
    if (requirements.min_iq_score && trustScore.iq < requirements.min_iq_score) {
      return false;
    }
    if (requirements.min_appeal_score && trustScore.appeal < requirements.min_appeal_score) {
      return false;
    }
    if (requirements.min_social_score && trustScore.social < requirements.min_social_score) {
      return false;
    }
    if (requirements.min_humanity_score && trustScore.humanity < requirements.min_humanity_score) {
      return false;
    }

    return true;
  }

  /**
   * Log governance zone activity for audit trails
   * Uses existing v4.1 audit logging patterns
   */
  private async logZoneActivity(
    zoneId: string,
    agentId: string,
    operation: string,
    memoryId?: string,
    resultCount?: number
  ): Promise<void> {
    try {
      const logEntry = {
        zone_id: zoneId,
        agent_id: agentId,
        operation: operation,
        memory_id: memoryId,
        result_count: resultCount,
        timestamp: new Date().toISOString(),
        source: 'governance-zone-manager'
      };

      // Use existing v4.1 audit log table
      await this.db.query(
        `INSERT INTO memory_zone_access_logs (zone_id, agent_id, operation, memory_id, metadata, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [zoneId, agentId, operation, memoryId, JSON.stringify(logEntry), new Date()]
      );
    } catch (error) {
      this.logger.warn('Failed to log zone activity', error);
    }
  }

  /**
   * Map database zone record to interface
   */
  private mapDatabaseZoneToInterface(dbZone: any): GovernanceMemoryZone {
    return {
      id: dbZone.id,
      zone_id: dbZone.zone_id,
      zone_name: dbZone.zone_name,
      zone_type: dbZone.zone_type,
      governance_policy_id: dbZone.governance_policy_id,
      access_control_config: dbZone.access_control_config,
      trust_requirements: dbZone.trust_requirements
    };
  }

  /**
   * Get zone analytics using existing v4.1 analytics patterns
   */
  async getZoneAnalytics(zoneId: string): Promise<any> {
    try {
      const analyticsQuery = `
        SELECT 
          COUNT(*) as total_memories,
          COUNT(DISTINCT creator_agent_id) as unique_agents,
          AVG((trust_score_4d->>'iq')::numeric) as avg_iq_score,
          AVG((trust_score_4d->>'appeal')::numeric) as avg_appeal_score,
          AVG((trust_score_4d->>'social')::numeric) as avg_social_score,
          AVG((trust_score_4d->>'humanity')::numeric) as avg_humanity_score,
          MAX(created_at) as latest_activity
        FROM vectorgraph_memory_objects 
        WHERE memory_zone_id = $1 AND memory_status = 'active'
      `;

      const result = await this.db.query(analyticsQuery, [zoneId]);
      return result.rows[0] || {};
    } catch (error) {
      this.logger.error('Failed to get zone analytics', error);
      return {};
    }
  }
}