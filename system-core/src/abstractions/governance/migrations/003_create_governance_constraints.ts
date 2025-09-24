/**
 * Migration: Create Governance Constraints
 * Adds foreign key constraints and additional data integrity rules
 */

import { BaseGovernanceMigration } from '../migrations/GovernanceMigrationManager';
import { IGovernanceConnectionPool } from '../interfaces/IGovernanceDatabase';

export class CreateGovernanceConstraintsMigration extends BaseGovernanceMigration {
  name = 'create_governance_constraints';
  version = '20250920000003';
  description = 'Create foreign key constraints and additional data integrity rules';

  constructor(connectionPool: IGovernanceConnectionPool) {
    super(connectionPool);
  }

  async up(): Promise<void> {
    const queries = [
      // Foreign key constraints for governance_votes
      `
        ALTER TABLE governance_votes 
        ADD CONSTRAINT fk_governance_votes_proposal 
        FOREIGN KEY (proposal_id) 
        REFERENCES governance_proposals(id) 
        ON DELETE CASCADE
      `,
      
      // Foreign key constraints for governance_decisions
      `
        ALTER TABLE governance_decisions 
        ADD CONSTRAINT fk_governance_decisions_proposal 
        FOREIGN KEY (proposal_id) 
        REFERENCES governance_proposals(id) 
        ON DELETE CASCADE
      `,
      
      // Self-referencing foreign key for governance_participants delegation
      `
        ALTER TABLE governance_participants 
        ADD CONSTRAINT fk_governance_participants_delegated_to 
        FOREIGN KEY (delegated_to) 
        REFERENCES governance_participants(user_id) 
        ON DELETE SET NULL
      `,
      
      // Check constraint to prevent self-delegation
      `
        ALTER TABLE governance_participants 
        ADD CONSTRAINT chk_no_self_delegation 
        CHECK (user_id != delegated_to)
      `,
      
      // Additional constraint for proposal voting dates
      `
        ALTER TABLE governance_proposals 
        ADD CONSTRAINT chk_voting_start_future 
        CHECK (voting_start_date >= created_at)
      `,
      
      // Constraint for vote weight consistency
      `
        ALTER TABLE governance_votes 
        ADD CONSTRAINT chk_vote_weight_reasonable 
        CHECK (weight <= 1000.0)
      `,
      
      // Constraint for analytics metric values
      `
        ALTER TABLE governance_analytics 
        ADD CONSTRAINT chk_metric_value_finite 
        CHECK (metric_value IS NOT NULL AND metric_value != 'NaN'::numeric)
      `,
      
      // Constraint for policy version consistency
      `
        ALTER TABLE governance_policies 
        ADD CONSTRAINT chk_policy_version_positive 
        CHECK (version > 0)
      `,
      
      // Constraint for proposal version consistency
      `
        ALTER TABLE governance_proposals 
        ADD CONSTRAINT chk_proposal_version_positive 
        CHECK (version > 0)
      `,
      
      // Constraint for committee member array validation
      `
        ALTER TABLE governance_committees 
        ADD CONSTRAINT chk_committee_members_array 
        CHECK (jsonb_typeof(members) = 'array')
      `,
      
      // Constraint for notification read consistency
      `
        ALTER TABLE governance_notifications 
        ADD CONSTRAINT chk_notification_read_consistency 
        CHECK ((read = false AND read_at IS NULL) OR (read = true AND read_at IS NOT NULL))
      `,
      
      // Constraint for notification delivery consistency
      `
        ALTER TABLE governance_notifications 
        ADD CONSTRAINT chk_notification_delivery_consistency 
        CHECK ((delivered = false AND delivered_at IS NULL) OR (delivered = true AND delivered_at IS NOT NULL))
      `,
      
      // Trigger function for automatic updated_at timestamp
      `
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ language 'plpgsql'
      `,
      
      // Apply updated_at triggers to all governance tables
      `
        CREATE TRIGGER update_governance_proposals_updated_at 
        BEFORE UPDATE ON governance_proposals 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `,
      `
        CREATE TRIGGER update_governance_votes_updated_at 
        BEFORE UPDATE ON governance_votes 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `,
      `
        CREATE TRIGGER update_governance_policies_updated_at 
        BEFORE UPDATE ON governance_policies 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `,
      `
        CREATE TRIGGER update_governance_participants_updated_at 
        BEFORE UPDATE ON governance_participants 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `,
      `
        CREATE TRIGGER update_governance_committees_updated_at 
        BEFORE UPDATE ON governance_committees 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `,
      `
        CREATE TRIGGER update_governance_decisions_updated_at 
        BEFORE UPDATE ON governance_decisions 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `,
      `
        CREATE TRIGGER update_governance_audit_logs_updated_at 
        BEFORE UPDATE ON governance_audit_logs 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `,
      `
        CREATE TRIGGER update_governance_analytics_updated_at 
        BEFORE UPDATE ON governance_analytics 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `,
      `
        CREATE TRIGGER update_governance_notifications_updated_at 
        BEFORE UPDATE ON governance_notifications 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `,
      
      // Function to automatically update delegation count
      `
        CREATE OR REPLACE FUNCTION update_delegation_count()
        RETURNS TRIGGER AS $$
        BEGIN
          IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
            -- Update delegation count for the delegate
            IF NEW.delegated_to IS NOT NULL THEN
              UPDATE governance_participants 
              SET delegation_count = (
                SELECT COUNT(*) 
                FROM governance_participants 
                WHERE delegated_to = NEW.delegated_to
              )
              WHERE user_id = NEW.delegated_to;
            END IF;
            
            -- Update delegation count for previous delegate (if changed)
            IF TG_OP = 'UPDATE' AND OLD.delegated_to IS NOT NULL AND OLD.delegated_to != NEW.delegated_to THEN
              UPDATE governance_participants 
              SET delegation_count = (
                SELECT COUNT(*) 
                FROM governance_participants 
                WHERE delegated_to = OLD.delegated_to
              )
              WHERE user_id = OLD.delegated_to;
            END IF;
            
            RETURN NEW;
          END IF;
          
          IF TG_OP = 'DELETE' THEN
            -- Update delegation count for the delegate
            IF OLD.delegated_to IS NOT NULL THEN
              UPDATE governance_participants 
              SET delegation_count = (
                SELECT COUNT(*) 
                FROM governance_participants 
                WHERE delegated_to = OLD.delegated_to
              )
              WHERE user_id = OLD.delegated_to;
            END IF;
            
            RETURN OLD;
          END IF;
          
          RETURN NULL;
        END;
        $$ language 'plpgsql'
      `,
      
      // Apply delegation count trigger
      `
        CREATE TRIGGER update_delegation_count_trigger 
        AFTER INSERT OR UPDATE OR DELETE ON governance_participants 
        FOR EACH ROW EXECUTE FUNCTION update_delegation_count()
      `
    ];

    await this.executeSQLBatch(queries);
  }

  async down(): Promise<void> {
    const queries = [
      // Drop triggers
      'DROP TRIGGER IF EXISTS update_delegation_count_trigger ON governance_participants',
      'DROP TRIGGER IF EXISTS update_governance_notifications_updated_at ON governance_notifications',
      'DROP TRIGGER IF EXISTS update_governance_analytics_updated_at ON governance_analytics',
      'DROP TRIGGER IF EXISTS update_governance_audit_logs_updated_at ON governance_audit_logs',
      'DROP TRIGGER IF EXISTS update_governance_decisions_updated_at ON governance_decisions',
      'DROP TRIGGER IF EXISTS update_governance_committees_updated_at ON governance_committees',
      'DROP TRIGGER IF EXISTS update_governance_participants_updated_at ON governance_participants',
      'DROP TRIGGER IF EXISTS update_governance_policies_updated_at ON governance_policies',
      'DROP TRIGGER IF EXISTS update_governance_votes_updated_at ON governance_votes',
      'DROP TRIGGER IF EXISTS update_governance_proposals_updated_at ON governance_proposals',
      
      // Drop functions
      'DROP FUNCTION IF EXISTS update_delegation_count()',
      'DROP FUNCTION IF EXISTS update_updated_at_column()',
      
      // Drop constraints
      'ALTER TABLE governance_notifications DROP CONSTRAINT IF EXISTS chk_notification_delivery_consistency',
      'ALTER TABLE governance_notifications DROP CONSTRAINT IF EXISTS chk_notification_read_consistency',
      'ALTER TABLE governance_committees DROP CONSTRAINT IF EXISTS chk_committee_members_array',
      'ALTER TABLE governance_proposals DROP CONSTRAINT IF EXISTS chk_proposal_version_positive',
      'ALTER TABLE governance_policies DROP CONSTRAINT IF EXISTS chk_policy_version_positive',
      'ALTER TABLE governance_analytics DROP CONSTRAINT IF EXISTS chk_metric_value_finite',
      'ALTER TABLE governance_votes DROP CONSTRAINT IF EXISTS chk_vote_weight_reasonable',
      'ALTER TABLE governance_proposals DROP CONSTRAINT IF EXISTS chk_voting_start_future',
      'ALTER TABLE governance_participants DROP CONSTRAINT IF EXISTS chk_no_self_delegation',
      'ALTER TABLE governance_participants DROP CONSTRAINT IF EXISTS fk_governance_participants_delegated_to',
      'ALTER TABLE governance_decisions DROP CONSTRAINT IF EXISTS fk_governance_decisions_proposal',
      'ALTER TABLE governance_votes DROP CONSTRAINT IF EXISTS fk_governance_votes_proposal'
    ];

    await this.executeSQLBatch(queries);
  }

  getDependencies(): string[] {
    return ['20250920000001', '20250920000002']; // Depends on tables and indexes migrations
  }
}
