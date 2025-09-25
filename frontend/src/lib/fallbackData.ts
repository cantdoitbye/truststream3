/**
 * Fallback data for development/testing when backend is not available
 */

export const fallbackSystemStatus = {
  version: "4.4.0",
  timestamp: new Date().toISOString(),
  status: "operational",
  ai_governance: {
    total_agents: 15,
    active_agents: 12,
    average_success_rate: 94.5,
    average_response_time_ms: 245,
    average_trust_score: 8.7,
    agents: [
      {
        id: "agent-001",
        agent_name: "Quality Assurance Agent",
        agent_type: "quality",
        status: "active",
        trust_score: 9.2,
        success_rate: 96.8,
        response_time_ms: 180,
        performance_metrics: { accuracy: 0.96, efficiency: 0.89 }
      },
      {
        id: "agent-002",
        agent_name: "Transparency Monitor",
        agent_type: "transparency",
        status: "active",
        trust_score: 8.9,
        success_rate: 94.2,
        response_time_ms: 220,
        performance_metrics: { accuracy: 0.94, efficiency: 0.92 }
      }
    ]
  },
  system_metrics: {
    latest_metrics: [
      { metric_name: "API Response Time", metric_value: 145, metric_unit: "ms", tags: {} },
      { metric_name: "System Uptime", metric_value: 99.9, metric_unit: "%", tags: {} },
      { metric_name: "Active Connections", metric_value: 1247, metric_unit: "count", tags: {} }
    ],
    performance_summary: {
      api_response_time: 145,
      system_throughput: 2340,
      system_uptime: 99.9,
      test_coverage: 94.2
    }
  },
  compliance: {
    total_frameworks: 8,
    compliant_count: 7,
    average_score: 92.3,
    frameworks: [
      {
        compliance_framework: "GDPR",
        compliance_status: "compliant",
        compliance_score: 95.2,
        last_audit_date: "2025-09-15",
        next_audit_date: "2025-12-15"
      },
      {
        compliance_framework: "EU AI Act",
        compliance_status: "compliant",
        compliance_score: 89.7,
        last_audit_date: "2025-09-10",
        next_audit_date: "2025-12-10"
      }
    ]
  },
  trust_scoring: {
    system_trust_score: 8.7,
    trust_dimensions: {
      iq_score: 9.1,
      appeal_score: 8.4,
      social_score: 8.6,
      humanity_score: 8.7,
      overall_trust_score: 8.7
    }
  }
};

export const fallbackFederatedLearning = {
  summary: {
    total_jobs: 8,
    running_jobs: 3,
    completed_jobs: 4,
    failed_jobs: 1,
    success_rate: "87.5",
    frameworks_used: ["flower", "tensorflow_federated", "unified"],
    job_types: ["horizontal", "vertical", "cross_device"]
  },
  jobs: [
    {
      id: "fl-job-001",
      job_name: "Healthcare Privacy FL",
      job_type: "horizontal" as const,
      framework: "flower" as const,
      status: "running" as const,
      num_clients: 25,
      num_rounds: 10,
      current_round: 6,
      privacy_budget: 8.0,
      performance_metrics: { accuracy: 0.94, loss: 0.23 },
      created_at: "2025-09-22T10:30:00Z"
    },
    {
      id: "fl-job-002",
      job_name: "Financial Model Training",
      job_type: "vertical" as const,
      framework: "tensorflow_federated" as const,
      status: "completed" as const,
      num_clients: 15,
      num_rounds: 8,
      current_round: 8,
      privacy_budget: 5.0,
      performance_metrics: { accuracy: 0.91, loss: 0.18 },
      created_at: "2025-09-20T14:15:00Z"
    }
  ]
};

export const fallbackExplainability = {
  summary: {
    total_requests: 156,
    completed_requests: 142,
    pending_requests: 8,
    processing_requests: 6,
    success_rate: "91.0",
    average_processing_time_ms: 1240,
    request_types: {
      shap: 45,
      lime: 38,
      counterfactual: 29,
      feature_importance: 32,
      bias_audit: 12
    },
    stakeholder_types: {
      end_user: 58,
      technical_user: 67,
      business_user: 21,
      regulator: 10
    }
  },
  requests: [
    {
      id: "exp-001",
      request_type: "shap" as const,
      status: "completed" as const,
      model_id: "healthcare-ai-v2",
      input_data: { patient_age: 45, symptoms: ["fever", "cough"] },
      stakeholder_type: "end_user" as const,
      explanation_result: { feature_importance: { age: 0.3, symptoms: 0.7 } },
      processing_time_ms: 850,
      created_at: "2025-09-23T09:15:00Z"
    },
    {
      id: "exp-002",
      request_type: "bias_audit" as const,
      status: "processing" as const,
      model_id: "loan-approval-ai",
      input_data: { demographic_analysis: true },
      stakeholder_type: "regulator" as const,
      explanation_result: {},
      processing_time_ms: 0,
      created_at: "2025-09-23T11:30:00Z"
    }
  ]
};

export const fallbackQuantumEncryption = {
  summary: {
    total_operations: 2840,
    completed_operations: 2756,
    processing_operations: 12,
    failed_operations: 72,
    success_rate: "97.0",
    average_processing_time_ms: 45,
    operation_types: {
      encrypt: 985,
      decrypt: 942,
      sign: 456,
      verify: 398,
      key_generation: 59
    },
    algorithm_usage: {
      "ML-KEM-768": 1127,
      "ML-DSA-65": 854,
      "FALCON": 456,
      "SPHINCS+": 403
    },
    quantum_ready_percentage: 97.2
  },
  operations: [
    {
      id: "qop-001",
      operation_type: "encrypt" as const,
      algorithm: "ML-KEM-768" as const,
      status: "completed" as const,
      processing_time_ms: 32,
      key_id: "qkey-768-001",
      operation_metadata: { data_size: 2048, encryption_strength: "high" },
      created_at: "2025-09-23T13:45:00Z"
    },
    {
      id: "qop-002",
      operation_type: "sign" as const,
      algorithm: "ML-DSA-65" as const,
      status: "processing" as const,
      processing_time_ms: 0,
      key_id: "qkey-dsa-002",
      operation_metadata: { signature_type: "document", priority: "high" },
      created_at: "2025-09-23T14:10:00Z"
    }
  ]
};

export const fallbackMultiCloud = {
  summary: {
    total_deployments: 24,
    running_deployments: 18,
    scaling_deployments: 3,
    failed_deployments: 3,
    cloud_distribution: {
      aws: 12,
      azure: 8,
      gcp: 4
    },
    cost_optimization_enabled: 21,
    average_cost_reduction: 23.7,
    deployment_types: ["application", "service", "infrastructure", "data"]
  },
  deployments: [
    {
      id: "deploy-001",
      deployment_name: "AI Analytics Platform",
      deployment_type: "application" as const,
      status: "running" as const,
      primary_cloud: "aws",
      secondary_clouds: ["azure"],
      deployment_config: { instances: 5, regions: ["us-east-1", "eu-west-1"] },
      cost_optimization_enabled: true,
      performance_metrics: { uptime: 99.9, response_time: 156 },
      created_at: "2025-09-20T08:00:00Z"
    },
    {
      id: "deploy-002",
      deployment_name: "Data Processing Pipeline",
      deployment_type: "service" as const,
      status: "scaling" as const,
      primary_cloud: "azure",
      secondary_clouds: ["gcp"],
      deployment_config: { instances: 8, regions: ["east-us", "west-europe"] },
      cost_optimization_enabled: true,
      performance_metrics: { uptime: 99.7, response_time: 89 },
      created_at: "2025-09-22T12:30:00Z"
    }
  ]
};

// Check if we should use fallback data (when backend is not available)
export const shouldUseFallbackData = () => {
  // Check if explicitly enabled via environment variable
  return import.meta.env.VITE_USE_FALLBACK_DATA === 'true' || 
         // Or if we're in development and no backend is specified
         (import.meta.env.DEV && !import.meta.env.VITE_BACKEND_AVAILABLE);
};

// Enhanced fallback with realistic timestamps and variations
export const generateRealtimeVariations = () => {
  const now = new Date();
  const variations = {
    systemStatus: {
      ...fallbackSystemStatus,
      timestamp: now.toISOString(),
      system_metrics: {
        ...fallbackSystemStatus.system_metrics,
        latest_metrics: fallbackSystemStatus.system_metrics.latest_metrics.map(metric => ({
          ...metric,
          metric_value: metric.metric_value + (Math.random() - 0.5) * 10
        }))
      }
    }
  };
  
  return variations;
};
