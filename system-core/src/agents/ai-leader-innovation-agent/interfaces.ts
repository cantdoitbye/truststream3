/**
 * Type definitions for AI Leader Innovation Agent
 */

export interface InnovationAgentInterface {
  initialize(): Promise<void>;
  execute(): Promise<void>;
  shutdown(): Promise<void>;
}

export interface InnovationMetrics {
  innovationIndex: number;
  transformationProgress: number;
  creativityScore: number;
  disruptionLevel: number;
}

export interface InnovationInitiative {
  id: string;
  title: string;
  description: string;
  category: InnovationCategory;
  priority: Priority;
  status: InitiativeStatus;
  impact: ImpactAssessment;
  timeline: Timeline;
}

export enum InnovationCategory {
  PROCESS = 'process',
  TECHNOLOGY = 'technology',
  PRODUCT = 'product',
  SERVICE = 'service',
  STRATEGIC = 'strategic'
}

export enum InitiativeStatus {
  IDEATION = 'ideation',
  PLANNING = 'planning',
  DEVELOPMENT = 'development',
  TESTING = 'testing',
  IMPLEMENTATION = 'implementation',
  COMPLETED = 'completed'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ImpactAssessment {
  businessValue: number;
  riskLevel: number;
  resourceRequirement: number;
  timeToValue: number;
}

export interface Timeline {
  startDate: Date;
  endDate: Date;
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  completed: boolean;
}
