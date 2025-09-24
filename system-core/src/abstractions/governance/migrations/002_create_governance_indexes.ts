/**
 * Migration: Create Governance Indexes
 * Adds performance indexes for governance queries
 */

import { BaseGovernanceMigration } from '../migrations/GovernanceMigrationManager';
import { IGovernanceConnectionPool } from '../interfaces/IGovernanceDatabase';

export class CreateGovernanceIndexesMigration extends BaseGovernanceMigration {
  name = 'create_governance_indexes';
  version = '20250920000002';
  description = 'Create indexes for improved governance query performance';

  constructor(connectionPool: IGovernanceConnectionPool) {
    super(connectionPool);
  }

  async up(): Promise<void> {
    const queries = [
      // Governance Proposals Indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_proposals_status ON governance_proposals(status)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_proposals_type ON governance_proposals(type)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_proposals_proposer ON governance_proposals(proposer_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_proposals_voting_dates ON governance_proposals(voting_start_date, voting_end_date)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_proposals_created_at ON governance_proposals(created_at DESC)',
      
      // Governance Votes Indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_votes_proposal ON governance_votes(proposal_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_votes_voter ON governance_votes(voter_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_votes_cast_at ON governance_votes(cast_at DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_votes_proposal_vote ON governance_votes(proposal_id, vote)',
      
      // Governance Policies Indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_policies_status ON governance_policies(status)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_policies_category ON governance_policies(category)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_policies_created_by ON governance_policies(created_by)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_policies_effective_date ON governance_policies(effective_date)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_policies_tags ON governance_policies USING GIN(tags)',
      
      // Governance Participants Indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_participants_user_id ON governance_participants(user_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_participants_role ON governance_participants(role)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_participants_delegated_to ON governance_participants(delegated_to)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_participants_last_active ON governance_participants(last_active_at DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_participants_reputation ON governance_participants(reputation_score DESC)',
      
      // Governance Committees Indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_committees_status ON governance_committees(status)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_committees_chair ON governance_committees(chair_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_committees_next_meeting ON governance_committees(next_meeting_date)',
      
      // Governance Decisions Indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_decisions_proposal ON governance_decisions(proposal_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_decisions_decision ON governance_decisions(decision)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_decisions_executed ON governance_decisions(executed)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_decisions_execution_date ON governance_decisions(execution_date)',
      
      // Governance Audit Log Indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_audit_logs_entity ON governance_audit_logs(entity_type, entity_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_audit_logs_actor ON governance_audit_logs(actor_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_audit_logs_action ON governance_audit_logs(action)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_audit_logs_timestamp ON governance_audit_logs(timestamp DESC)',
      
      // Governance Analytics Indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_analytics_metric ON governance_analytics(metric_name)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_analytics_time_period ON governance_analytics(time_period, period_start, period_end)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_analytics_calculated_at ON governance_analytics(calculated_at DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_analytics_dimensions ON governance_analytics USING GIN(dimensions)',
      
      // Governance Notifications Indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_notifications_recipient ON governance_notifications(recipient_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_notifications_type ON governance_notifications(type)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_notifications_read ON governance_notifications(read)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_notifications_priority ON governance_notifications(priority)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_notifications_related_entity ON governance_notifications(related_entity_type, related_entity_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_notifications_created_at ON governance_notifications(created_at DESC)'
    ];

    // Execute indexes one by one to handle CONCURRENTLY properly
    for (const query of queries) {
      await this.executeSQL(query);
    }
  }

  async down(): Promise<void> {
    const indexes = [
      'idx_governance_proposals_status',
      'idx_governance_proposals_type',
      'idx_governance_proposals_proposer',
      'idx_governance_proposals_voting_dates',
      'idx_governance_proposals_created_at',
      'idx_governance_votes_proposal',
      'idx_governance_votes_voter',
      'idx_governance_votes_cast_at',
      'idx_governance_votes_proposal_vote',
      'idx_governance_policies_status',
      'idx_governance_policies_category',
      'idx_governance_policies_created_by',
      'idx_governance_policies_effective_date',
      'idx_governance_policies_tags',
      'idx_governance_participants_user_id',
      'idx_governance_participants_role',
      'idx_governance_participants_delegated_to',
      'idx_governance_participants_last_active',
      'idx_governance_participants_reputation',
      'idx_governance_committees_status',
      'idx_governance_committees_chair',
      'idx_governance_committees_next_meeting',
      'idx_governance_decisions_proposal',
      'idx_governance_decisions_decision',
      'idx_governance_decisions_executed',
      'idx_governance_decisions_execution_date',
      'idx_governance_audit_logs_entity',
      'idx_governance_audit_logs_actor',
      'idx_governance_audit_logs_action',
      'idx_governance_audit_logs_timestamp',
      'idx_governance_analytics_metric',
      'idx_governance_analytics_time_period',
      'idx_governance_analytics_calculated_at',
      'idx_governance_analytics_dimensions',
      'idx_governance_notifications_recipient',
      'idx_governance_notifications_type',
      'idx_governance_notifications_read',
      'idx_governance_notifications_priority',
      'idx_governance_notifications_related_entity',
      'idx_governance_notifications_created_at'
    ];

    const dropQueries = indexes.map(index => `DROP INDEX IF EXISTS ${index}`);
    
    for (const query of dropQueries) {
      await this.executeSQL(query);
    }
  }

  getDependencies(): string[] {
    return ['20250920000001']; // Depends on initial tables migration
  }
}
