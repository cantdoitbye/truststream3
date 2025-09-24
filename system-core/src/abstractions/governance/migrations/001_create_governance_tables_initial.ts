/**
 * Initial Migration: Create Governance Tables
 * Sets up the core governance database schema
 */

import { BaseGovernanceMigration } from '../migrations/GovernanceMigrationManager';
import { IGovernanceConnectionPool } from '../interfaces/IGovernanceDatabase';

export class CreateGovernanceTablesInitialMigration extends BaseGovernanceMigration {
  name = 'create_governance_tables_initial';
  version = '20250920000001';
  description = 'Create initial governance tables for proposals, votes, policies, and participants';

  constructor(connectionPool: IGovernanceConnectionPool) {
    super(connectionPool);
  }

  async up(): Promise<void> {
    const queries = [
      // Governance Proposals Table
      `
        CREATE TABLE IF NOT EXISTS governance_proposals (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(500) NOT NULL,
          description TEXT NOT NULL,
          proposer_id UUID NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'passed', 'rejected', 'expired')),
          type VARCHAR(20) NOT NULL CHECK (type IN ('policy', 'budget', 'technical', 'constitutional')),
          voting_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
          voting_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
          required_quorum INTEGER NOT NULL DEFAULT 50,
          required_majority INTEGER NOT NULL DEFAULT 51,
          metadata JSONB DEFAULT '{}',
          version INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          CONSTRAINT voting_dates_valid CHECK (voting_end_date > voting_start_date),
          CONSTRAINT quorum_valid CHECK (required_quorum >= 0 AND required_quorum <= 100),
          CONSTRAINT majority_valid CHECK (required_majority >= 0 AND required_majority <= 100)
        )
      `,

      // Governance Votes Table
      `
        CREATE TABLE IF NOT EXISTS governance_votes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          proposal_id UUID NOT NULL,
          voter_id UUID NOT NULL,
          vote VARCHAR(10) NOT NULL CHECK (vote IN ('yes', 'no', 'abstain')),
          weight DECIMAL(10,2) NOT NULL DEFAULT 1.0,
          reasoning TEXT,
          delegation_chain JSONB DEFAULT '[]',
          cast_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          UNIQUE(proposal_id, voter_id),
          CONSTRAINT weight_positive CHECK (weight >= 0)
        )
      `,

      // Governance Policies Table
      `
        CREATE TABLE IF NOT EXISTS governance_policies (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(200) NOT NULL,
          description TEXT NOT NULL,
          policy_text TEXT NOT NULL,
          category VARCHAR(100) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deprecated')),
          effective_date TIMESTAMP WITH TIME ZONE NOT NULL,
          expiry_date TIMESTAMP WITH TIME ZONE,
          created_by UUID NOT NULL,
          approved_by UUID,
          tags TEXT[] DEFAULT '{}',
          version INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          CONSTRAINT expiry_after_effective CHECK (expiry_date IS NULL OR expiry_date > effective_date)
        )
      `,

      // Governance Participants Table
      `
        CREATE TABLE IF NOT EXISTS governance_participants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL UNIQUE,
          role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'delegate', 'admin', 'observer')),
          voting_power DECIMAL(10,2) NOT NULL DEFAULT 1.0,
          reputation_score INTEGER NOT NULL DEFAULT 0,
          participation_level VARCHAR(10) NOT NULL DEFAULT 'low' CHECK (participation_level IN ('low', 'medium', 'high')),
          joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          delegated_to UUID,
          delegation_count INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          CONSTRAINT voting_power_positive CHECK (voting_power >= 0),
          CONSTRAINT reputation_non_negative CHECK (reputation_score >= 0),
          CONSTRAINT delegation_count_non_negative CHECK (delegation_count >= 0)
        )
      `,

      // Governance Committees Table
      `
        CREATE TABLE IF NOT EXISTS governance_committees (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(200) NOT NULL,
          description TEXT NOT NULL,
          purpose TEXT NOT NULL,
          chair_id UUID NOT NULL,
          members JSONB NOT NULL DEFAULT '[]',
          status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'dissolved')),
          meeting_frequency VARCHAR(50),
          next_meeting_date TIMESTAMP WITH TIME ZONE,
          responsibilities TEXT[] DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
      `,

      // Governance Decisions Table
      `
        CREATE TABLE IF NOT EXISTS governance_decisions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          proposal_id UUID NOT NULL UNIQUE,
          decision VARCHAR(20) NOT NULL CHECK (decision IN ('approved', 'rejected', 'deferred')),
          total_votes INTEGER NOT NULL DEFAULT 0,
          yes_votes INTEGER NOT NULL DEFAULT 0,
          no_votes INTEGER NOT NULL DEFAULT 0,
          abstain_votes INTEGER NOT NULL DEFAULT 0,
          quorum_met BOOLEAN NOT NULL DEFAULT FALSE,
          majority_achieved BOOLEAN NOT NULL DEFAULT FALSE,
          execution_date TIMESTAMP WITH TIME ZONE,
          executed BOOLEAN NOT NULL DEFAULT FALSE,
          execution_result TEXT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          CONSTRAINT vote_counts_valid CHECK (
            total_votes = yes_votes + no_votes + abstain_votes
          ),
          CONSTRAINT vote_counts_non_negative CHECK (
            total_votes >= 0 AND yes_votes >= 0 AND no_votes >= 0 AND abstain_votes >= 0
          )
        )
      `,

      // Governance Audit Log Table
      `
        CREATE TABLE IF NOT EXISTS governance_audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          action VARCHAR(100) NOT NULL,
          entity_type VARCHAR(50) NOT NULL,
          entity_id UUID NOT NULL,
          actor_id UUID NOT NULL,
          old_values JSONB,
          new_values JSONB,
          ip_address INET,
          user_agent TEXT,
          session_id VARCHAR(100),
          timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
      `,

      // Governance Analytics Table
      `
        CREATE TABLE IF NOT EXISTS governance_analytics (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          metric_name VARCHAR(100) NOT NULL,
          metric_value DECIMAL(15,4) NOT NULL,
          metric_type VARCHAR(20) NOT NULL CHECK (metric_type IN ('count', 'percentage', 'average', 'sum')),
          time_period VARCHAR(20) NOT NULL CHECK (time_period IN ('hour', 'day', 'week', 'month', 'quarter', 'year')),
          period_start TIMESTAMP WITH TIME ZONE NOT NULL,
          period_end TIMESTAMP WITH TIME ZONE NOT NULL,
          dimensions JSONB DEFAULT '{}',
          calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          CONSTRAINT period_valid CHECK (period_end > period_start)
        )
      `,

      // Governance Notifications Table
      `
        CREATE TABLE IF NOT EXISTS governance_notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          recipient_id UUID NOT NULL,
          type VARCHAR(50) NOT NULL CHECK (type IN (
            'proposal_created', 'voting_started', 'voting_ended', 
            'decision_made', 'delegation_request'
          )),
          title VARCHAR(200) NOT NULL,
          message TEXT NOT NULL,
          related_entity_type VARCHAR(50) NOT NULL,
          related_entity_id UUID NOT NULL,
          priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
          read BOOLEAN NOT NULL DEFAULT FALSE,
          read_at TIMESTAMP WITH TIME ZONE,
          delivery_method VARCHAR(20) NOT NULL DEFAULT 'in_app' CHECK (delivery_method IN ('email', 'push', 'in_app')),
          delivered BOOLEAN NOT NULL DEFAULT FALSE,
          delivered_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
      `
    ];

    await this.executeSQLBatch(queries);
  }

  async down(): Promise<void> {
    const queries = [
      'DROP TABLE IF EXISTS governance_notifications',
      'DROP TABLE IF EXISTS governance_analytics',
      'DROP TABLE IF EXISTS governance_audit_logs',
      'DROP TABLE IF EXISTS governance_decisions',
      'DROP TABLE IF EXISTS governance_committees',
      'DROP TABLE IF EXISTS governance_participants',
      'DROP TABLE IF EXISTS governance_policies',
      'DROP TABLE IF EXISTS governance_votes',
      'DROP TABLE IF EXISTS governance_proposals'
    ];

    await this.executeSQLBatch(queries);
  }

  getDependencies(): string[] {
    return [];
  }
}
