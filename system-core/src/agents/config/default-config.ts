/**
 * Default Configuration for Governance Agents
 */

export const DEFAULT_AGENT_CONFIG = {
  environment: 'development' as const,
  logLevel: 'info' as const,
  database: {
    type: 'postgresql' as const,
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/governance',
    poolSize: 10,
    retryAttempts: 3
  },
  orchestrator: {
    endpoint: process.env.ORCHESTRATOR_ENDPOINT || 'http://localhost:3000',
    authToken: process.env.ORCHESTRATOR_AUTH_TOKEN || '',
    heartbeatInterval: 30000,
    maxRetries: 3
  },
  monitoring: {
    metricsEndpoint: process.env.METRICS_ENDPOINT || 'http://localhost:9090',
    alertingEndpoint: process.env.ALERTING_ENDPOINT || 'http://localhost:9093',
    logAggregationEndpoint: process.env.LOG_ENDPOINT || 'http://localhost:5000',
    enableTracing: process.env.ENABLE_TRACING === 'true'
  }
};

export const ACCOUNTABILITY_AGENT_CONFIG = {
  ...DEFAULT_AGENT_CONFIG,
  ethics: {
    monitoringInterval: 60000, // 1 minute
    auditPeriod: 24 * 60 * 60 * 1000, // 24 hours
    framework: 'truststream-ethics-v1'
  },
  accountability: {
    trackingInterval: 30000, // 30 seconds
    trackingPeriod: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  bias: {
    detectionThreshold: 0.05,
    severityLevels: ['low', 'medium', 'high', 'critical']
  },
  escalation: {
    levels: ['warning', 'moderate', 'severe', 'critical']
  },
  reporting: {
    period: 7 * 24 * 60 * 60 * 1000, // 7 days
    format: 'json'
  },
  auditing: {
    auditPeriod: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
};

export const EFFICIENCY_AGENT_CONFIG = {
  ...DEFAULT_AGENT_CONFIG,
  monitoring: {
    ...DEFAULT_AGENT_CONFIG.monitoring,
    interval: 10000 // 10 seconds
  },
  analysis: {
    windowSize: 100,
    deviationWindow: 50
  },
  retention: {
    metricsRetention: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  reporting: {
    period: 24 * 60 * 60 * 1000, // 24 hours
    historyLimit: 100
  },
  improvements: {
    maxRecommendations: 10
  }
};

export const QUALITY_AGENT_CONFIG = {
  ...DEFAULT_AGENT_CONFIG,
  monitoring: {
    ...DEFAULT_AGENT_CONFIG.monitoring,
    interval: 30000, // 30 seconds
    maxResponseTime: 5000, // 5 seconds default
    healthCheckInterval: 60000, // 1 minute
    alertThreshold: 0.8
  },
  thresholds: {
    accuracy: 0.9,
    relevance: 0.8,
    completeness: 0.85,
    clarity: 0.8,
    consistency: 0.9,
    timeliness: 0.95
  },
  compliance: {
    auditPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
    framework: 'quality-v1',
    reviewInterval: 24 * 60 * 60 * 1000, // 24 hours
    alertThreshold: 0.8
  },
  analysis: {
    trendWindow: 24 * 60 * 60 * 1000, // 24 hours
    deviationWindow: 50,
    statisticsWindow: 100,
    forecastHorizon: 12 * 60 * 60 * 1000 // 12 hours
  },
  improvements: {
    maxRecommendations: 10,
    priorityThreshold: 0.7,
    implementationTracking: true
  },
  retention: {
    complianceHistoryRetention: 30 * 24 * 60 * 60 * 1000, // 30 days
    qualityScoreRetention: 7 * 24 * 60 * 60 * 1000, // 7 days
    metricsRetention: 14 * 24 * 60 * 60 * 1000, // 14 days
    reportRetention: 90 * 24 * 60 * 60 * 1000 // 90 days
  },
  reporting: {
    period: 24 * 60 * 60 * 1000, // 24 hours
    format: 'json',
    includeDetails: true,
    historyLimit: 100,
    autoGenerate: true
  },
  enforcement: {
    enableAutomation: true,
    escalationLevels: ['warning', 'moderate', 'severe', 'critical'],
    autoRemediationThreshold: 0.6,
    manualReviewRequired: false
  },
  benchmarking: {
    enableIndustryComparison: true,
    standardsVersion: 'latest',
    updateInterval: 7 * 24 * 60 * 60 * 1000, // 7 days
    comparisonThreshold: 0.8
  }
};

export const TRANSPARENCY_AGENT_CONFIG = {
  ...DEFAULT_AGENT_CONFIG,
  auditing: {
    maintenanceInterval: 60000, // 1 minute
    auditPeriod: 24 * 60 * 60 * 1000 // 24 hours
  },
  compliance: {
    monitoringInterval: 120000, // 2 minutes
    framework: 'transparency-v1',
    reviewInterval: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  explanation: {
    maxDepth: 5,
    includeAssumptions: true,
    includeAlternatives: true
  },
  reporting: {
    period: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  dataUsage: {
    auditPeriod: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
};

export const INNOVATION_AGENT_CONFIG = {
  ...DEFAULT_AGENT_CONFIG,
  innovation: {
    explorationRate: 0.1,
    implementationThreshold: 0.8,
    evaluationPeriod: 14 * 24 * 60 * 60 * 1000 // 14 days
  },
  research: {
    maxConcurrentProjects: 5,
    budgetThreshold: 10000
  }
};

export default {
  DEFAULT_AGENT_CONFIG,
  ACCOUNTABILITY_AGENT_CONFIG,
  EFFICIENCY_AGENT_CONFIG,
  QUALITY_AGENT_CONFIG,
  TRANSPARENCY_AGENT_CONFIG,
  INNOVATION_AGENT_CONFIG
};