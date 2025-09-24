/**
 * Governance Entity Definitions
 * Type definitions for all governance-related entities
 */

/**
 * Base entity interface
 */
export interface BaseEntity {
  id: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Governance Proposal Entity
 */
export interface GovernanceProposal extends BaseEntity {
  title: string;
  description: string;
  proposer_id: string;
  status: 'draft' | 'active' | 'passed' | 'rejected' | 'expired';
  type: 'policy' | 'budget' | 'technical' | 'constitutional';
  voting_start_date: Date;
  voting_end_date: Date;
  required_quorum: number;
  required_majority: number;
  metadata: Record<string, any>;
  version: number;
}

/**
 * Governance Vote Entity
 */
export interface GovernanceVote extends BaseEntity {
  proposal_id: string;
  voter_id: string;
  vote: 'yes' | 'no' | 'abstain';
  weight: number;
  reasoning?: string;
  delegation_chain?: string[];
  cast_at: Date;
}

/**
 * Governance Policy Entity
 */
export interface GovernancePolicy extends BaseEntity {
  name: string;
  description: string;
  policy_text: string;
  category: string;
  status: 'active' | 'inactive' | 'deprecated';
  effective_date: Date;
  expiry_date?: Date;
  created_by: string;
  approved_by?: string;
  tags: string[];
  version: number;
}

/**
 * Governance Participant Entity
 */
export interface GovernanceParticipant extends BaseEntity {
  user_id: string;
  role: 'member' | 'delegate' | 'admin' | 'observer';
  voting_power: number;
  reputation_score: number;
  participation_level: 'low' | 'medium' | 'high';
  joined_at: Date;
  last_active_at: Date;
  delegated_to?: string;
  delegation_count: number;
}

/**
 * Governance Committee Entity
 */
export interface GovernanceCommittee extends BaseEntity {
  name: string;
  description: string;
  purpose: string;
  chair_id: string;
  members: string[];
  status: 'active' | 'inactive' | 'dissolved';
  meeting_frequency: string;
  next_meeting_date?: Date;
  responsibilities: string[];
}

/**
 * Governance Decision Entity
 */
export interface GovernanceDecision extends BaseEntity {
  proposal_id: string;
  decision: 'approved' | 'rejected' | 'deferred';
  total_votes: number;
  yes_votes: number;
  no_votes: number;
  abstain_votes: number;
  quorum_met: boolean;
  majority_achieved: boolean;
  execution_date?: Date;
  executed: boolean;
  execution_result?: string;
}

/**
 * Governance Audit Log Entity
 */
export interface GovernanceAuditLog extends BaseEntity {
  action: string;
  entity_type: string;
  entity_id: string;
  actor_id: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  timestamp: Date;
}

/**
 * Governance Analytics Entity
 */
export interface GovernanceAnalytics extends BaseEntity {
  metric_name: string;
  metric_value: number;
  metric_type: 'count' | 'percentage' | 'average' | 'sum';
  time_period: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  period_start: Date;
  period_end: Date;
  dimensions: Record<string, string>;
  calculated_at: Date;
}

/**
 * Governance Notification Entity
 */
export interface GovernanceNotification extends BaseEntity {
  recipient_id: string;
  type: 'proposal_created' | 'voting_started' | 'voting_ended' | 'decision_made' | 'delegation_request';
  title: string;
  message: string;
  related_entity_type: string;
  related_entity_id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  read_at?: Date;
  delivery_method: 'email' | 'push' | 'in_app';
  delivered: boolean;
  delivered_at?: Date;
}

/**
 * Entity Type Registry
 */
export type GovernanceEntityType = 
  | 'governance_proposal'
  | 'governance_vote'
  | 'governance_policy'
  | 'governance_participant'
  | 'governance_committee'
  | 'governance_decision'
  | 'governance_audit_log'
  | 'governance_analytics'
  | 'governance_notification';

/**
 * Entity Type Map
 */
export interface GovernanceEntityMap {
  governance_proposal: GovernanceProposal;
  governance_vote: GovernanceVote;
  governance_policy: GovernancePolicy;
  governance_participant: GovernanceParticipant;
  governance_committee: GovernanceCommittee;
  governance_decision: GovernanceDecision;
  governance_audit_log: GovernanceAuditLog;
  governance_analytics: GovernanceAnalytics;
  governance_notification: GovernanceNotification;
}
