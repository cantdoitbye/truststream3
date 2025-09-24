/**
 * Governance Database Abstraction Layer
 * Main export file for the governance database abstraction system
 */

// Core Interfaces
export {
  IGovernanceRepository,
  IGovernanceTransaction,
  IGovernanceQueryBuilder,
  IGovernanceMigration
} from './interfaces/IGovernanceRepository';

export {
  IGovernanceDatabase,
  IGovernanceDatabaseConfig,
  IGovernanceConnectionPool
} from './interfaces/IGovernanceDatabase';

// Entity Types
export {
  BaseEntity,
  GovernanceProposal,
  GovernanceVote,
  GovernancePolicy,
  GovernanceParticipant,
  GovernanceCommittee,
  GovernanceDecision,
  GovernanceAuditLog,
  GovernanceAnalytics,
  GovernanceNotification,
  GovernanceEntityType,
  GovernanceEntityMap
} from './entities/GovernanceEntities';

// Repository Implementations
export {
  BaseGovernanceRepository
} from './repositories/BaseGovernanceRepository';

export {
  GovernanceQueryBuilder
} from './repositories/GovernanceQueryBuilder';

export {
  GovernanceProposalRepository,
  GovernanceVoteRepository,
  GovernancePolicyRepository,
  GovernanceRepositoryFactory
} from './repositories/GovernanceRepositoryFactory';

// Transaction Management
export {
  GovernanceTransaction,
  TransactionalRepository
} from './transactions/GovernanceTransaction';

// Connection Pool
export {
  GovernanceConnectionPool
} from './connections/GovernanceConnectionPool';

// Migration System
export {
  BaseGovernanceMigration,
  GovernanceMigrationManager,
  MigrationUtils
} from './migrations/GovernanceMigrationManager';

// Main Database Implementation
export {
  GovernanceDatabase,
  GovernanceDatabaseFactory
} from './GovernanceDatabase';

// Migration Implementations
export {
  CreateGovernanceTablesInitialMigration
} from './migrations/001_create_governance_tables_initial';

export {
  CreateGovernanceIndexesMigration
} from './migrations/002_create_governance_indexes';

export {
  CreateGovernanceConstraintsMigration
} from './migrations/003_create_governance_constraints';

/**
 * Convenience function to create and initialize a governance database
 */
export async function createGovernanceDatabase(
  config: IGovernanceDatabaseConfig
): Promise<GovernanceDatabase> {
  const database = GovernanceDatabaseFactory.create(config);
  await database.initialize();
  return database;
}

/**
 * Convenience function to create a governance database from environment variables
 */
export async function createGovernanceDatabaseFromEnv(): Promise<GovernanceDatabase> {
  const database = GovernanceDatabaseFactory.createFromEnv();
  await database.initialize();
  return database;
}

/**
 * Convenience function to create a test governance database
 */
export async function createTestGovernanceDatabase(): Promise<GovernanceDatabase> {
  const database = GovernanceDatabaseFactory.createForTesting();
  await database.initialize();
  return database;
}

/**
 * Type guard functions for entity types
 */
export function isGovernanceProposal(entity: any): entity is GovernanceProposal {
  return entity && typeof entity.title === 'string' && typeof entity.description === 'string';
}

export function isGovernanceVote(entity: any): entity is GovernanceVote {
  return entity && typeof entity.proposal_id === 'string' && typeof entity.voter_id === 'string';
}

export function isGovernancePolicy(entity: any): entity is GovernancePolicy {
  return entity && typeof entity.name === 'string' && typeof entity.policy_text === 'string';
}

export function isGovernanceParticipant(entity: any): entity is GovernanceParticipant {
  return entity && typeof entity.user_id === 'string' && typeof entity.role === 'string';
}

/**
 * Utility functions for common governance operations
 */
export class GovernanceUtils {
  /**
   * Calculate voting power for a participant including delegations
   */
  static async calculateTotalVotingPower(
    database: IGovernanceDatabase,
    participantId: string
  ): Promise<number> {
    const participantRepo = database.getRepository<GovernanceParticipant>('governance_participant');
    
    // Get base voting power
    const participant = await participantRepo.findById(participantId);
    if (!participant) return 0;
    
    let totalPower = participant.voting_power;
    
    // Add delegated voting power
    const delegators = await participantRepo.findBy({ delegated_to: participantId as any });
    for (const delegator of delegators) {
      totalPower += delegator.voting_power;
    }
    
    return totalPower;
  }
  
  /**
   * Check if a proposal has reached quorum
   */
  static async checkQuorum(
    database: IGovernanceDatabase,
    proposalId: string
  ): Promise<boolean> {
    const proposalRepo = database.getRepository<GovernanceProposal>('governance_proposal');
    const voteRepo = database.getRepository<GovernanceVote>('governance_vote');
    
    const proposal = await proposalRepo.findById(proposalId);
    if (!proposal) return false;
    
    const votes = await voteRepo.findBy({ proposal_id: proposalId as any });
    const totalVotes = votes.reduce((sum, vote) => sum + vote.weight, 0);
    
    // Simplified quorum calculation - in reality, this would need total eligible voters
    return totalVotes >= proposal.required_quorum;
  }
  
  /**
   * Calculate proposal result
   */
  static async calculateProposalResult(
    database: IGovernanceDatabase,
    proposalId: string
  ): Promise<{
    passed: boolean;
    yesPercentage: number;
    noPercentage: number;
    abstainPercentage: number;
    quorumMet: boolean;
  }> {
    const proposalRepo = database.getRepository<GovernanceProposal>('governance_proposal');
    const voteRepo = database.getRepository<GovernanceVote>('governance_vote');
    
    const proposal = await proposalRepo.findById(proposalId);
    if (!proposal) {
      throw new Error('Proposal not found');
    }
    
    const votes = await voteRepo.findBy({ proposal_id: proposalId as any });
    
    let yesVotes = 0;
    let noVotes = 0;
    let abstainVotes = 0;
    
    for (const vote of votes) {
      switch (vote.vote) {
        case 'yes':
          yesVotes += vote.weight;
          break;
        case 'no':
          noVotes += vote.weight;
          break;
        case 'abstain':
          abstainVotes += vote.weight;
          break;
      }
    }
    
    const totalVotes = yesVotes + noVotes + abstainVotes;
    const quorumMet = totalVotes >= proposal.required_quorum;
    
    const yesPercentage = totalVotes > 0 ? (yesVotes / totalVotes) * 100 : 0;
    const noPercentage = totalVotes > 0 ? (noVotes / totalVotes) * 100 : 0;
    const abstainPercentage = totalVotes > 0 ? (abstainVotes / totalVotes) * 100 : 0;
    
    const passed = quorumMet && yesPercentage >= proposal.required_majority;
    
    return {
      passed,
      yesPercentage,
      noPercentage,
      abstainPercentage,
      quorumMet
    };
  }
}

/**
 * Export type definitions for external use
 */
export type {
  IGovernanceRepository,
  IGovernanceTransaction,
  IGovernanceQueryBuilder,
  IGovernanceMigration,
  IGovernanceDatabase,
  IGovernanceDatabaseConfig,
  IGovernanceConnectionPool,
  BaseEntity,
  GovernanceProposal,
  GovernanceVote,
  GovernancePolicy,
  GovernanceParticipant,
  GovernanceCommittee,
  GovernanceDecision,
  GovernanceAuditLog,
  GovernanceAnalytics,
  GovernanceNotification,
  GovernanceEntityType,
  GovernanceEntityMap
};
