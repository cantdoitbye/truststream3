/**
 * Enhanced Trust Scoring System Configuration
 * TrustStream v4.2 - Central Configuration Management
 * 
 * Author: MiniMax Agent
 * Date: 2025-09-20
 * 
 * Centralized configuration for all enhanced trust scoring components
 */

export interface EnhancedTrustScoringConfig {
  system: SystemConfig;
  features: FeatureConfig;
  performance: PerformanceConfig;
  rollout: RolloutConfig;
  monitoring: MonitoringConfig;
  security: SecurityConfig;
}

export interface SystemConfig {
  version: string;
  environment: 'development' | 'staging' | 'production';
  backward_compatibility: boolean;
  fallback_enabled: boolean;
  graceful_degradation: boolean;
}

export interface FeatureConfig {
  enhanced_governance_scoring: {
    enabled: boolean;
    version: string;
    trust_pyramid_layers: number;
    governance_weights: {
      accountability: number;
      transparency: number;
      compliance: number;
      ethics: number;
    };
  };
  governance_risk_assessment: {
    enabled: boolean;
    calculation_depth: 'basic' | 'standard' | 'comprehensive';
    risk_categories: string[];
    mitigation_recommendations: boolean;
    cache_assessments: boolean;
  };
  collaborative_governance_scoring: {
    enabled: boolean;
    multi_agent_consensus: boolean;
    cross_community_scoring: boolean;
    consensus_threshold: number;
    agent_weights: Record<string, number>;
  };
  trust_pyramid_architecture: {
    enabled: boolean;
    layer_optimization: boolean;
    dynamic_weights: boolean;
    performance_caching: boolean;
  };
}

export interface PerformanceConfig {
  optimization: {
    caching_enabled: boolean;
    cache_ttl_seconds: number;
    max_cache_size: number;
    query_optimization: boolean;
    batch_processing: boolean;
  };
  limits: {
    max_execution_time_ms: number;
    max_memory_usage_mb: number;
    max_database_connections: number;
    max_concurrent_requests: number;
  };
  monitoring: {
    performance_tracking: boolean;
    error_tracking: boolean;
    resource_monitoring: boolean;
    alert_thresholds: {
      execution_time_ms: number;
      error_rate_percentage: number;
      memory_usage_mb: number;
    };
  };
}

export interface RolloutConfig {
  strategy: 'conservative' | 'beta' | 'gradual' | 'full';
  rollout_percentage: number;
  eligible_communities: string[];
  feature_flags: {
    emergency_rollback_enabled: boolean;
    gradual_increase_enabled: boolean;
    community_restrictions: boolean;
    performance_based_rollout: boolean;
  };
  phases: {
    internal_testing: {
      duration_days: number;
      rollout_percentage: number;
      communities: string[];
    };
    beta_testing: {
      duration_days: number;
      rollout_percentage: number;
      communities: string[];
    };
    gradual_rollout: {
      duration_days: number;
      increment_percentage: number;
      success_criteria: {
        min_success_rate: number;
        max_error_rate: number;
        max_execution_time: number;
      };
    };
  };
}

export interface MonitoringConfig {
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    structured_logging: boolean;
    performance_logs: boolean;
    audit_logs: boolean;
  };
  metrics: {
    collection_enabled: boolean;
    retention_days: number;
    real_time_monitoring: boolean;
    custom_metrics: string[];
  };
  alerting: {
    enabled: boolean;
    channels: string[];
    thresholds: {
      error_rate_percentage: number;
      execution_time_ms: number;
      memory_usage_percentage: number;
      success_rate_percentage: number;
    };
  };
}

export interface SecurityConfig {
  authentication: {
    api_key_required: boolean;
    jwt_validation: boolean;
    rate_limiting: boolean;
  };
  authorization: {
    community_based_access: boolean;
    role_based_access: boolean;
    feature_based_permissions: boolean;
  };
  data_protection: {
    encrypt_sensitive_data: boolean;
    sanitize_outputs: boolean;
    audit_data_access: boolean;
  };
  security_headers: {
    cors_enabled: boolean;
    content_security_policy: boolean;
    xss_protection: boolean;
    content_type_options: boolean;
  };
}

// ================================================================
// ENVIRONMENT-SPECIFIC CONFIGURATIONS
// ================================================================

export const DevelopmentConfig: EnhancedTrustScoringConfig = {
  system: {
    version: '4.2-enhanced-dev',
    environment: 'development',
    backward_compatibility: true,
    fallback_enabled: true,
    graceful_degradation: true
  },
  features: {
    enhanced_governance_scoring: {
      enabled: true,
      version: '4.2-enhanced',
      trust_pyramid_layers: 4,
      governance_weights: {
        accountability: 0.25,
        transparency: 0.30,
        compliance: 0.20,
        ethics: 0.25
      }
    },
    governance_risk_assessment: {
      enabled: true,
      calculation_depth: 'standard',
      risk_categories: ['decision_impact', 'bias', 'compliance', 'stakeholder_alienation', 'system_vulnerability'],
      mitigation_recommendations: true,
      cache_assessments: true
    },
    collaborative_governance_scoring: {
      enabled: true,
      multi_agent_consensus: true,
      cross_community_scoring: true,
      consensus_threshold: 0.7,
      agent_weights: {
        efficiency: 0.25,
        quality: 0.25,
        transparency: 0.25,
        accountability: 0.25
      }
    },
    trust_pyramid_architecture: {
      enabled: true,
      layer_optimization: true,
      dynamic_weights: false,
      performance_caching: true
    }
  },
  performance: {
    optimization: {
      caching_enabled: true,
      cache_ttl_seconds: 300,
      max_cache_size: 1000,
      query_optimization: true,
      batch_processing: true
    },
    limits: {
      max_execution_time_ms: 10000,
      max_memory_usage_mb: 512,
      max_database_connections: 5,
      max_concurrent_requests: 10
    },
    monitoring: {
      performance_tracking: true,
      error_tracking: true,
      resource_monitoring: true,
      alert_thresholds: {
        execution_time_ms: 8000,
        error_rate_percentage: 5,
        memory_usage_mb: 400
      }
    }
  },
  rollout: {
    strategy: 'gradual',
    rollout_percentage: 100,
    eligible_communities: [],
    feature_flags: {
      emergency_rollback_enabled: true,
      gradual_increase_enabled: false,
      community_restrictions: false,
      performance_based_rollout: false
    },
    phases: {
      internal_testing: {
        duration_days: 1,
        rollout_percentage: 100,
        communities: ['development']
      },
      beta_testing: {
        duration_days: 1,
        rollout_percentage: 100,
        communities: ['development']
      },
      gradual_rollout: {
        duration_days: 1,
        increment_percentage: 100,
        success_criteria: {
          min_success_rate: 90,
          max_error_rate: 10,
          max_execution_time: 10000
        }
      }
    }
  },
  monitoring: {
    logging: {
      level: 'debug',
      structured_logging: true,
      performance_logs: true,
      audit_logs: true
    },
    metrics: {
      collection_enabled: true,
      retention_days: 7,
      real_time_monitoring: true,
      custom_metrics: ['trust_calculation_time', 'governance_score_distribution']
    },
    alerting: {
      enabled: false,
      channels: ['console'],
      thresholds: {
        error_rate_percentage: 10,
        execution_time_ms: 8000,
        memory_usage_percentage: 80,
        success_rate_percentage: 90
      }
    }
  },
  security: {
    authentication: {
      api_key_required: true,
      jwt_validation: false,
      rate_limiting: false
    },
    authorization: {
      community_based_access: false,
      role_based_access: false,
      feature_based_permissions: false
    },
    data_protection: {
      encrypt_sensitive_data: false,
      sanitize_outputs: true,
      audit_data_access: true
    },
    security_headers: {
      cors_enabled: true,
      content_security_policy: false,
      xss_protection: true,
      content_type_options: true
    }
  }
};

export const StagingConfig: EnhancedTrustScoringConfig = {
  ...DevelopmentConfig,
  system: {
    ...DevelopmentConfig.system,
    version: '4.2-enhanced-staging',
    environment: 'staging'
  },
  performance: {
    ...DevelopmentConfig.performance,
    limits: {
      max_execution_time_ms: 5000,
      max_memory_usage_mb: 512,
      max_database_connections: 8,
      max_concurrent_requests: 20
    },
    monitoring: {
      ...DevelopmentConfig.performance.monitoring,
      alert_thresholds: {
        execution_time_ms: 4000,
        error_rate_percentage: 3,
        memory_usage_mb: 400
      }
    }
  },
  rollout: {
    ...DevelopmentConfig.rollout,
    strategy: 'beta',
    rollout_percentage: 50,
    eligible_communities: ['staging', 'beta_testers'],
    feature_flags: {
      emergency_rollback_enabled: true,
      gradual_increase_enabled: true,
      community_restrictions: true,
      performance_based_rollout: true
    },
    phases: {
      internal_testing: {
        duration_days: 2,
        rollout_percentage: 10,
        communities: ['staging']
      },
      beta_testing: {
        duration_days: 3,
        rollout_percentage: 25,
        communities: ['staging', 'beta_testers']
      },
      gradual_rollout: {
        duration_days: 5,
        increment_percentage: 25,
        success_criteria: {
          min_success_rate: 95,
          max_error_rate: 3,
          max_execution_time: 4000
        }
      }
    }
  },
  monitoring: {
    ...DevelopmentConfig.monitoring,
    logging: {
      ...DevelopmentConfig.monitoring.logging,
      level: 'info'
    },
    alerting: {
      enabled: true,
      channels: ['email', 'slack'],
      thresholds: {
        error_rate_percentage: 3,
        execution_time_ms: 4000,
        memory_usage_percentage: 75,
        success_rate_percentage: 95
      }
    }
  },
  security: {
    ...DevelopmentConfig.security,
    authorization: {
      community_based_access: true,
      role_based_access: true,
      feature_based_permissions: true
    },
    data_protection: {
      encrypt_sensitive_data: true,
      sanitize_outputs: true,
      audit_data_access: true
    }
  }
};

export const ProductionConfig: EnhancedTrustScoringConfig = {
  ...StagingConfig,
  system: {
    ...StagingConfig.system,
    version: '4.2-enhanced',
    environment: 'production'
  },
  performance: {
    ...StagingConfig.performance,
    limits: {
      max_execution_time_ms: 5000,
      max_memory_usage_mb: 1024,
      max_database_connections: 15,
      max_concurrent_requests: 50
    },
    monitoring: {
      ...StagingConfig.performance.monitoring,
      alert_thresholds: {
        execution_time_ms: 5000,
        error_rate_percentage: 1,
        memory_usage_mb: 800
      }
    }
  },
  rollout: {
    ...StagingConfig.rollout,
    strategy: 'conservative',
    rollout_percentage: 0, // Start with 0% for production
    eligible_communities: [],
    phases: {
      internal_testing: {
        duration_days: 3,
        rollout_percentage: 5,
        communities: ['internal', 'trusted_partners']
      },
      beta_testing: {
        duration_days: 7,
        rollout_percentage: 25,
        communities: ['beta_communities', 'early_adopters']
      },
      gradual_rollout: {
        duration_days: 14,
        increment_percentage: 15,
        success_criteria: {
          min_success_rate: 99,
          max_error_rate: 1,
          max_execution_time: 5000
        }
      }
    }
  },
  monitoring: {
    ...StagingConfig.monitoring,
    logging: {
      ...StagingConfig.monitoring.logging,
      level: 'warn'
    },
    metrics: {
      ...StagingConfig.monitoring.metrics,
      retention_days: 30
    },
    alerting: {
      enabled: true,
      channels: ['email', 'slack', 'pagerduty'],
      thresholds: {
        error_rate_percentage: 1,
        execution_time_ms: 5000,
        memory_usage_percentage: 80,
        success_rate_percentage: 99
      }
    }
  },
  security: {
    authentication: {
      api_key_required: true,
      jwt_validation: true,
      rate_limiting: true
    },
    authorization: {
      community_based_access: true,
      role_based_access: true,
      feature_based_permissions: true
    },
    data_protection: {
      encrypt_sensitive_data: true,
      sanitize_outputs: true,
      audit_data_access: true
    },
    security_headers: {
      cors_enabled: true,
      content_security_policy: true,
      xss_protection: true,
      content_type_options: true
    }
  }
};

// ================================================================
// CONFIGURATION UTILITIES
// ================================================================

export class ConfigurationManager {
  private config: EnhancedTrustScoringConfig;

  constructor(environment: string = 'development') {
    this.config = this.getConfigForEnvironment(environment);
  }

  getConfig(): EnhancedTrustScoringConfig {
    return this.config;
  }

  getFeatureConfig(featureName: keyof FeatureConfig): any {
    return this.config.features[featureName];
  }

  isFeatureEnabled(featureName: keyof FeatureConfig): boolean {
    return this.config.features[featureName].enabled;
  }

  getPerformanceConfig(): PerformanceConfig {
    return this.config.performance;
  }

  getRolloutConfig(): RolloutConfig {
    return this.config.rollout;
  }

  updateConfig(updates: Partial<EnhancedTrustScoringConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  private getConfigForEnvironment(environment: string): EnhancedTrustScoringConfig {
    switch (environment.toLowerCase()) {
      case 'development':
      case 'dev':
        return DevelopmentConfig;
      case 'staging':
      case 'stage':
        return StagingConfig;
      case 'production':
      case 'prod':
        return ProductionConfig;
      default:
        console.warn(`Unknown environment: ${environment}, using development config`);
        return DevelopmentConfig;
    }
  }
}

// ================================================================
// FEATURE FLAG INTEGRATION
// ================================================================

export function getFeatureFlagDefaults(): Array<{
  feature_name: string;
  enabled: boolean;
  rollout_percentage: number;
  configuration: any;
}> {
  return [
    {
      feature_name: 'enhanced_governance_scoring',
      enabled: false,
      rollout_percentage: 0,
      configuration: {
        version: "4.2-enhanced",
        backend_compatible: true,
        max_execution_time_ms: 5000,
        fallback_to_v41: true,
        performance_monitoring: true,
        trust_pyramid_layers: 4,
        governance_weights: {
          accountability: 0.25,
          transparency: 0.30,
          compliance: 0.20,
          ethics: 0.25
        }
      }
    },
    {
      feature_name: 'governance_risk_assessment',
      enabled: false,
      rollout_percentage: 0,
      configuration: {
        risk_calculation_enabled: true,
        risk_mitigation_suggestions: true,
        risk_calculation_depth: 'standard',
        cache_risk_assessments: true,
        risk_categories: ['decision_impact', 'bias', 'compliance', 'stakeholder_alienation', 'system_vulnerability']
      }
    },
    {
      feature_name: 'collaborative_governance_scoring',
      enabled: false,
      rollout_percentage: 0,
      configuration: {
        multi_agent_consensus: true,
        cross_community_scoring: true,
        consensus_threshold: 0.7,
        agent_weight_balancing: true,
        collaborative_metrics: ['agent_consensus', 'cross_community_coordination', 'stakeholder_integration']
      }
    },
    {
      feature_name: 'trust_pyramid_architecture',
      enabled: false,
      rollout_percentage: 0,
      configuration: {
        pyramid_layers: 4,
        layer_optimization: true,
        dynamic_weights: false,
        caching_enabled: true,
        performance_caching: true
      }
    }
  ];
}

// ================================================================
// EXPORTS
// ================================================================

export default {
  DevelopmentConfig,
  StagingConfig,
  ProductionConfig,
  ConfigurationManager,
  getFeatureFlagDefaults
};