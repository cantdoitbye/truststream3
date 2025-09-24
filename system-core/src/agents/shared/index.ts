/**
 * Export file for enhanced agent capabilities
 */

export { EnhancedGovernanceAgent, LLMNexusUtils } from './enhanced-base-agent';
export { 
  EnhancedIntelligenceAgent, 
  IntelligenceCapabilities, 
  ReasoningContext, 
  IntelligentDecision 
} from './enhanced-intelligence-agent';
export * from './types';

// Base agent configurations
export const DEFAULT_INTELLIGENCE_CAPABILITIES = {
  reasoning: {
    causalAnalysis: true,
    logicalDeduction: true,
    probabilisticReasoning: true,
    counterargumentGeneration: true
  },
  learning: {
    patternRecognition: true,
    adaptiveDecisionMaking: true,
    contextualMemory: true,
    feedbackIntegration: true
  },
  creativity: {
    solutionGeneration: true,
    alternativeApproaches: true,
    innovativeThinking: true,
    strategicPlanning: true
  },
  analysis: {
    dataInterpretation: true,
    trendAnalysis: true,
    riskAssessment: true,
    impactEvaluation: true
  }
};

// Standard reasoning contexts for different governance types
export const GOVERNANCE_REASONING_CONTEXTS = {
  quality: {
    domain: 'quality_assurance',
    stakeholders: ['users', 'developers', 'quality_team'],
    constraints: ['accuracy_requirements', 'performance_standards', 'compliance_rules'],
    objectives: ['maintain_quality', 'continuous_improvement', 'user_satisfaction'],
    riskTolerance: 'low' as const
  },
  transparency: {
    domain: 'transparency_governance',
    stakeholders: ['public', 'auditors', 'stakeholders', 'regulators'],
    constraints: ['privacy_requirements', 'disclosure_limits', 'security_considerations'],
    objectives: ['public_accountability', 'clear_communication', 'trust_building'],
    riskTolerance: 'low' as const
  },
  innovation: {
    domain: 'innovation_management',
    stakeholders: ['researchers', 'developers', 'users', 'market'],
    constraints: ['resource_limitations', 'technical_feasibility', 'market_demands'],
    objectives: ['breakthrough_solutions', 'competitive_advantage', 'value_creation'],
    riskTolerance: 'high' as const
  },
  accountability: {
    domain: 'accountability_governance',
    stakeholders: ['leadership', 'auditors', 'public', 'regulators'],
    constraints: ['legal_requirements', 'ethical_standards', 'organizational_policies'],
    objectives: ['responsibility_assignment', 'oversight_effectiveness', 'compliance_assurance'],
    riskTolerance: 'low' as const
  },
  efficiency: {
    domain: 'efficiency_optimization',
    stakeholders: ['operations_team', 'users', 'management', 'stakeholders'],
    constraints: ['resource_constraints', 'performance_targets', 'quality_standards'],
    objectives: ['resource_optimization', 'performance_improvement', 'cost_effectiveness'],
    riskTolerance: 'medium' as const
  }
};

// Utility functions for agent initialization
export function createReasoningContext(
  governanceType: keyof typeof GOVERNANCE_REASONING_CONTEXTS,
  overrides: Partial<ReasoningContext> = {}
): ReasoningContext {
  const baseContext = GOVERNANCE_REASONING_CONTEXTS[governanceType];
  return {
    ...baseContext,
    complexity: 'medium',
    timeframe: 'short_term',
    ...overrides
  };
}

export function createIntelligenceCapabilities(
  overrides: Partial<IntelligenceCapabilities> = {}
): IntelligenceCapabilities {
  return {
    ...DEFAULT_INTELLIGENCE_CAPABILITIES,
    ...overrides
  };
}