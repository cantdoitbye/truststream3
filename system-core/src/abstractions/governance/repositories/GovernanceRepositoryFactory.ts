/**
 * Repository Factory for Governance Entities
 * Creates appropriate repository instances for different entity types
 */

import { IGovernanceRepository } from '../interfaces/IGovernanceRepository';
import { IGovernanceConnectionPool } from '../interfaces/IGovernanceDatabase';
import { 
  GovernanceProposal,
  GovernanceVote,
  GovernancePolicy,
  GovernanceParticipant,
  GovernanceCommittee,
  GovernanceDecision,
  GovernanceAuditLog,
  GovernanceAnalytics,
  GovernanceNotification,
  GovernanceEntityType
} from '../entities/GovernanceEntities';
import { BaseGovernanceRepository } from './BaseGovernanceRepository';
import { TransactionalRepository } from '../transactions/GovernanceTransaction';

/**
 * Governance Proposal Repository
 */
export class GovernanceProposalRepository extends BaseGovernanceRepository<GovernanceProposal> {
  constructor(connectionPool: IGovernanceConnectionPool) {
    super('governance_proposals', connectionPool);
  }

  protected mapRowToEntity(row: any): GovernanceProposal {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      proposer_id: row.proposer_id,
      status: row.status,
      type: row.type,
      voting_start_date: new Date(row.voting_start_date),
      voting_end_date: new Date(row.voting_end_date),
      required_quorum: row.required_quorum,
      required_majority: row.required_majority,
      metadata: row.metadata || {},
      version: row.version,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  protected getEntityColumns(): string[] {
    return [
      'title', 'description', 'proposer_id', 'status', 'type',
      'voting_start_date', 'voting_end_date', 'required_quorum',
      'required_majority', 'metadata', 'version'
    ];
  }

  /**
   * Find active proposals
   */
  async findActiveProposals(): Promise<GovernanceProposal[]> {
    return this.findBy({ status: 'active' as any });
  }

  /**
   * Find proposals by proposer
   */
  async findByProposer(proposerId: string): Promise<GovernanceProposal[]> {
    return this.findBy({ proposer_id: proposerId as any });
  }

  /**
   * Find proposals by date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<GovernanceProposal[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE voting_start_date >= $1 AND voting_end_date <= $2
      ORDER BY voting_start_date DESC
    `;
    const rows = await this.query(query, [startDate, endDate]);
    return rows.map(row => this.mapRowToEntity(row));
  }
}

/**
 * Governance Vote Repository
 */
export class GovernanceVoteRepository extends BaseGovernanceRepository<GovernanceVote> {
  constructor(connectionPool: IGovernanceConnectionPool) {
    super('governance_votes', connectionPool);
  }

  protected mapRowToEntity(row: any): GovernanceVote {
    return {
      id: row.id,
      proposal_id: row.proposal_id,
      voter_id: row.voter_id,
      vote: row.vote,
      weight: row.weight,
      reasoning: row.reasoning,
      delegation_chain: row.delegation_chain || [],
      cast_at: new Date(row.cast_at),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  protected getEntityColumns(): string[] {
    return [
      'proposal_id', 'voter_id', 'vote', 'weight',
      'reasoning', 'delegation_chain', 'cast_at'
    ];
  }

  /**
   * Find votes by proposal
   */
  async findByProposal(proposalId: string): Promise<GovernanceVote[]> {
    return this.findBy({ proposal_id: proposalId as any });
  }

  /**
   * Find votes by voter
   */
  async findByVoter(voterId: string): Promise<GovernanceVote[]> {
    return this.findBy({ voter_id: voterId as any });
  }

  /**
   * Get vote statistics for proposal
   */
  async getVoteStatistics(proposalId: string): Promise<{
    total: number;
    yes: number;
    no: number;
    abstain: number;
    totalWeight: number;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN vote = 'yes' THEN 1 ELSE 0 END) as yes,
        SUM(CASE WHEN vote = 'no' THEN 1 ELSE 0 END) as no,
        SUM(CASE WHEN vote = 'abstain' THEN 1 ELSE 0 END) as abstain,
        SUM(weight) as total_weight
      FROM ${this.tableName}
      WHERE proposal_id = $1
    `;
    
    const rows = await this.query(query, [proposalId]);
    const result = rows[0];
    
    return {
      total: parseInt(result.total),
      yes: parseInt(result.yes),
      no: parseInt(result.no),
      abstain: parseInt(result.abstain),
      totalWeight: parseFloat(result.total_weight) || 0
    };
  }
}

/**
 * Governance Policy Repository
 */
export class GovernancePolicyRepository extends BaseGovernanceRepository<GovernancePolicy> {
  constructor(connectionPool: IGovernanceConnectionPool) {
    super('governance_policies', connectionPool);
  }

  protected mapRowToEntity(row: any): GovernancePolicy {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      policy_text: row.policy_text,
      category: row.category,
      status: row.status,
      effective_date: new Date(row.effective_date),
      expiry_date: row.expiry_date ? new Date(row.expiry_date) : undefined,
      created_by: row.created_by,
      approved_by: row.approved_by,
      tags: row.tags || [],
      version: row.version,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  protected getEntityColumns(): string[] {
    return [
      'name', 'description', 'policy_text', 'category', 'status',
      'effective_date', 'expiry_date', 'created_by', 'approved_by',
      'tags', 'version'
    ];
  }

  /**
   * Find active policies
   */
  async findActivePolicies(): Promise<GovernancePolicy[]> {
    return this.findBy({ status: 'active' as any });
  }

  /**
   * Find policies by category
   */
  async findByCategory(category: string): Promise<GovernancePolicy[]> {
    return this.findBy({ category: category as any });
  }

  /**
   * Find policies by tags
   */
  async findByTags(tags: string[]): Promise<GovernancePolicy[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE tags && $1
      ORDER BY created_at DESC
    `;
    const rows = await this.query(query, [tags]);
    return rows.map(row => this.mapRowToEntity(row));
  }
}

/**
 * Repository Factory
 */
export class GovernanceRepositoryFactory {
  private connectionPool: IGovernanceConnectionPool;
  private repositories: Map<string, IGovernanceRepository<any>> = new Map();

  constructor(connectionPool: IGovernanceConnectionPool) {
    this.connectionPool = connectionPool;
  }

  createRepository<T>(entityType: GovernanceEntityType): IGovernanceRepository<T> {
    if (this.repositories.has(entityType)) {
      return this.repositories.get(entityType);
    }

    let repository: IGovernanceRepository<any>;

    switch (entityType) {
      case 'governance_proposal':
        repository = new GovernanceProposalRepository(this.connectionPool);
        break;
      case 'governance_vote':
        repository = new GovernanceVoteRepository(this.connectionPool);
        break;
      case 'governance_policy':
        repository = new GovernancePolicyRepository(this.connectionPool);
        break;
      default:
        // Generic repository for other entity types
        repository = new (class extends BaseGovernanceRepository<T> {
          protected mapRowToEntity(row: any): T {
            return row as T;
          }
          protected getEntityColumns(): string[] {
            return Object.keys(row || {}).filter(key => 
              !['id', 'created_at', 'updated_at'].includes(key)
            );
          }
        })(this.getTableName(entityType), this.connectionPool);
    }

    this.repositories.set(entityType, repository);
    return repository;
  }

  createTransactionalRepository<T>(
    entityType: string,
    connection: any
  ): IGovernanceRepository<T> {
    const baseRepository = this.createRepository<T>(entityType as GovernanceEntityType);
    return new TransactionalRepository<T>(baseRepository, connection);
  }

  private getTableName(entityType: GovernanceEntityType): string {
    // Map entity types to table names
    const tableMap: Record<GovernanceEntityType, string> = {
      governance_proposal: 'governance_proposals',
      governance_vote: 'governance_votes',
      governance_policy: 'governance_policies',
      governance_participant: 'governance_participants',
      governance_committee: 'governance_committees',
      governance_decision: 'governance_decisions',
      governance_audit_log: 'governance_audit_logs',
      governance_analytics: 'governance_analytics',
      governance_notification: 'governance_notifications'
    };

    return tableMap[entityType] || entityType;
  }
}
