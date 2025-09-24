/**
 * Example Usage and Configuration for Agent Health Monitoring System
 * 
 * This file demonstrates how to set up and use the comprehensive health
 * monitoring and auto-recovery system for governance agents.
 */

import { 
  createMonitoringSystem,
  ConfigTemplates,
  AgentHealthMonitor,
  MonitoringSystemConfig,
  HealthStatus,
  AlertSeverity
} from './index';

// ===== BASIC USAGE EXAMPLE =====

/**
 * Simple setup for development environment
 */
async function basicUsageExample() {
  console.log('=== Basic Usage Example ===');

  // Create monitoring system with default development configuration
  const monitor = createMonitoringSystem(
    'truststream-dev',
    'development'
  );

  try {
    // Start the monitoring system
    await monitor.startMonitoring();
    console.log('Monitoring system started successfully');

    // Register a governance agent for monitoring
    await monitor.registerAgent('governance-agent-1', {
      type: 'accountability-agent',
      version: '1.0.0',
      capabilities: ['decision-tracking', 'ethics-monitoring'],
      metricsConfig: {
        collectionInterval: 5000,
        customMetrics: [
          {
            name: 'decisions_per_minute',
            description: 'Number of governance decisions made per minute',
            unit: 'decisions/min'
          }
        ]
      }
    });

    // Get agent health status
    const health = await monitor.getAgentHealth('governance-agent-1');
    console.log('Agent health:', health.overallHealth);

    // Create a test alert
    await monitor.createAlert({
      agentId: 'governance-agent-1',
      type: 'performance',
      severity: 'warning',
      title: 'High Response Time',
      description: 'Agent response time is above normal threshold',
      status: 'active',
      acknowledgments: [],
      escalations: [],
      tags: ['performance', 'response-time']
    });

    // Get dashboard data
    const dashboardData = await monitor.getDashboardData();
    console.log('System overview:', dashboardData.overview);

    // Stop monitoring (in real usage, this would be on shutdown)
    // await monitor.stopMonitoring();

  } catch (error) {
    console.error('Error in basic usage example:', error);
  }
}

// ===== ADVANCED CONFIGURATION EXAMPLE =====

/**
 * Advanced setup with custom configuration for production
 */
async function advancedConfigurationExample() {
  console.log('=== Advanced Configuration Example ===');

  // Start with production template and customize
  const baseConfig = ConfigTemplates.production('truststream-prod');
  
  const customConfig: MonitoringSystemConfig = {
    ...baseConfig,
    // Customize metrics collection
    metrics: {
      ...baseConfig.metrics,
      collectionInterval: 3000, // More frequent collection
      aggregationRules: [
        ...baseConfig.metrics.aggregationRules,
        {
          metric: 'governance_decisions',
          function: 'count',
          interval: '1m',
          retention: '30d'
        },
        {
          metric: 'ethics_violations',
          function: 'sum',
          interval: '1h',
          retention: '90d'
        }
      ]
    },
    // Customize alerting
    alerting: {
      ...baseConfig.alerting,
      notificationChannels: [
        {
          id: 'governance_slack',
          type: 'slack',
          config: {
            webhook_url: process.env.GOVERNANCE_SLACK_WEBHOOK,
            channel: '#governance-alerts'
          },
          enabled: true,
          severityFilter: ['warning', 'critical', 'emergency']
        },
        {
          id: 'governance_email',
          type: 'email',
          config: {
            recipients: [
              'governance-team@truststream.io',
              'security-team@truststream.io'
            ],
            smtp_server: process.env.SMTP_SERVER
          },
          enabled: true,
          severityFilter: ['critical', 'emergency']
        },
        {
          id: 'governance_pagerduty',
          type: 'pagerduty',
          config: {
            integration_key: process.env.PAGERDUTY_GOVERNANCE_KEY,
            service_id: 'governance-agents'
          },
          enabled: true,
          severityFilter: ['emergency']
        }
      ],
      escalationRules: [
        {
          ruleId: 'governance_critical',
          condition: 'agent_type == "governance" && severity >= "critical"',
          delay: 300000, // 5 minutes
          target: 'governance_lead',
          action: 'escalate_and_page'
        },
        {
          ruleId: 'ethics_violation',
          condition: 'alert_type == "ethics" && severity >= "warning"',
          delay: 60000, // 1 minute
          target: 'ethics_committee',
          action: 'immediate_escalation'
        }
      ]
    },
    // Customize recovery procedures
    recovery: {
      ...baseConfig.recovery,
      emergencyProtocols: [
        {
          protocolId: 'governance_emergency',
          name: 'Governance Emergency Protocol',
          trigger: 'ethics_violation_critical || governance_failure',
          actions: [
            {
              actionId: 'suspend_decisions',
              type: 'isolate',
              parameters: { 
                suspend_decision_making: true,
                preserve_audit_trail: true
              },
              timeout: 30000
            },
            {
              actionId: 'notify_board',
              type: 'notify',
              parameters: {
                recipients: ['board@truststream.io'],
                priority: 'emergency',
                template: 'governance_emergency'
              },
              timeout: 60000
            }
          ],
          contacts: [
            {
              contactId: 'governance_lead',
              name: 'Governance Lead',
              role: 'governance_manager',
              methods: [
                { type: 'phone', value: '+1-555-GOVERN', priority: 1 },
                { type: 'email', value: 'governance-lead@truststream.io', priority: 2 }
              ],
              availability: '24/7'
            }
          ]
        }
      ]
    }
  };

  const monitor = new AgentHealthMonitor(customConfig);

  try {
    await monitor.startMonitoring();
    console.log('Advanced monitoring system started successfully');

    // Register multiple governance agents
    const agents = [
      {
        id: 'accountability-agent-1',
        config: {
          type: 'accountability-agent',
          responsibilities: ['decision-tracking', 'responsibility-assignment'],
          compliance_frameworks: ['GDPR', 'SOX', 'ISO27001']
        }
      },
      {
        id: 'transparency-agent-1',
        config: {
          type: 'transparency-agent',
          responsibilities: ['disclosure-management', 'communication-tracking'],
          stakeholder_groups: ['internal', 'external', 'regulatory']
        }
      },
      {
        id: 'ethics-agent-1',
        config: {
          type: 'ethics-agent',
          responsibilities: ['bias-detection', 'ethics-enforcement'],
          ethics_frameworks: ['ACM-Code', 'IEEE-Ethics', 'EU-AI-Ethics']
        }
      }
    ];

    for (const agent of agents) {
      await monitor.registerAgent(agent.id, agent.config);
      console.log(`Registered agent: ${agent.id}`);
    }

    // Monitor agents for a period
    console.log('Monitoring agents...');
    
    // In a real implementation, this would run continuously
    // Here we'll simulate some monitoring activity
    
  } catch (error) {
    console.error('Error in advanced configuration example:', error);
  }
}

// ===== INTEGRATION EXAMPLE =====

/**
 * Example of integrating with existing governance agents
 */
async function governanceIntegrationExample() {
  console.log('=== Governance Integration Example ===');

  const monitor = createMonitoringSystem(
    'truststream-governance',
    'production',
    {
      // Custom configuration for governance integration
      dashboard: {
        enableDashboard: true,
        port: 3001, // Different port for governance dashboard
        theme: 'light',
        refreshInterval: 2000,
        maxDisplayedAlerts: 50,
        enableExports: true,
        customizations: [
          {
            id: 'governance_overview',
            type: 'widget',
            config: {
              title: 'Governance Health Overview',
              metrics: [
                'overall_governance_score',
                'ethics_compliance_rate',
                'decision_transparency_score',
                'stakeholder_satisfaction'
              ],
              refreshInterval: 5000
            }
          }
        ]
      }
    }
  );

  try {
    await monitor.startMonitoring();

    // Simulate governance agent registration and monitoring
    const governanceAgents = [
      'ai-leader-accountability-agent',
      'ai-leader-efficiency-agent', 
      'ai-leader-innovation-agent',
      'ai-leader-quality-agent',
      'ai-leader-transparency-agent'
    ];

    for (const agentId of governanceAgents) {
      await monitor.registerAgent(agentId, {
        type: 'governance-leader',
        framework: 'truststream-v4.2',
        integration: {
          orchestrator: 'governance-orchestrator',
          database: 'governance-database',
          monitoring: 'real-time'
        }
      });
    }

    // Set up event handlers for governance-specific events
    monitor.on('alert:created', async (event) => {
      const { alert } = event;
      
      // Handle governance-specific alerts
      if (alert.type === 'governance' || alert.tags.includes('governance')) {
        console.log(`Governance alert created: ${alert.title}`);
        
        // Custom governance alert handling
        await handleGovernanceAlert(alert);
      }
    });

    monitor.on('recovery:completed', async (event) => {
      const { execution } = event;
      
      // Log governance recovery events for audit trail
      console.log(`Governance recovery completed for agent: ${execution.agentId}`);
      await logGovernanceRecovery(execution);
    });

    console.log('Governance monitoring integration setup complete');

  } catch (error) {
    console.error('Error in governance integration example:', error);
  }

  // Helper functions for governance integration
  async function handleGovernanceAlert(alert: any) {
    // Implement governance-specific alert handling
    // e.g., notify compliance team, update audit logs, etc.
    console.log(`Handling governance alert: ${alert.alertId}`);
  }

  async function logGovernanceRecovery(execution: any) {
    // Implement governance recovery logging for compliance
    console.log(`Logging governance recovery: ${execution.executionId}`);
  }
}

// ===== MONITORING DASHBOARD EXAMPLE =====

/**
 * Example of customizing the monitoring dashboard
 */
async function dashboardCustomizationExample() {
  console.log('=== Dashboard Customization Example ===');

  const monitor = createMonitoringSystem(
    'truststream-dashboard-demo',
    'development',
    {
      dashboard: {
        enableDashboard: true,
        port: 3002,
        theme: 'dark',
        refreshInterval: 1000,
        maxDisplayedAlerts: 100,
        enableExports: true,
        customizations: [
          {
            id: 'executive_dashboard',
            type: 'layout',
            config: {
              title: 'TrustStream Executive Dashboard',
              widgets: [
                {
                  id: 'governance_kpis',
                  type: 'metrics',
                  size: 'large',
                  config: {
                    title: 'Governance KPIs',
                    metrics: [
                      'overall_trust_score',
                      'governance_efficiency',
                      'transparency_index',
                      'compliance_rating'
                    ]
                  }
                },
                {
                  id: 'agent_health_grid',
                  type: 'grid',
                  size: 'medium',
                  config: {
                    title: 'Agent Health Status',
                    view: 'grid',
                    groupBy: 'agent_type'
                  }
                },
                {
                  id: 'critical_alerts',
                  type: 'alerts',
                  size: 'medium',
                  config: {
                    title: 'Critical Alerts',
                    filter: 'severity >= critical',
                    limit: 10
                  }
                }
              ]
            }
          }
        ]
      }
    }
  );

  try {
    await monitor.startMonitoring();
    console.log('Dashboard demo started on http://localhost:3002');

    // Register demo agents with different health statuses
    const demoAgents = [
      { id: 'healthy-agent', health: 'healthy' },
      { id: 'degraded-agent', health: 'degraded' },
      { id: 'critical-agent', health: 'critical' }
    ];

    for (const agent of demoAgents) {
      await monitor.registerAgent(agent.id, {
        type: 'demo-agent',
        simulatedHealth: agent.health
      });
    }

    console.log('Demo dashboard setup complete');

  } catch (error) {
    console.error('Error in dashboard customization example:', error);
  }
}

// ===== EXPORT EXAMPLES =====

export {
  basicUsageExample,
  advancedConfigurationExample,
  governanceIntegrationExample,
  dashboardCustomizationExample
};

// ===== CONFIGURATION HELPERS =====

/**
 * Create configuration for different deployment sizes
 */
export function createScaledConfig(
  systemId: string,
  scale: 'small' | 'medium' | 'large' | 'enterprise'
): MonitoringSystemConfig {
  const scaleConfigs = {
    small: {
      maxAgents: 10,
      collectionInterval: 10000,
      batchSize: 50,
      retentionPeriod: '7d'
    },
    medium: {
      maxAgents: 50,
      collectionInterval: 5000,
      batchSize: 100,
      retentionPeriod: '30d'
    },
    large: {
      maxAgents: 200,
      collectionInterval: 2000,
      batchSize: 300,
      retentionPeriod: '90d'
    },
    enterprise: {
      maxAgents: 1000,
      collectionInterval: 1000,
      batchSize: 500,
      retentionPeriod: '365d'
    }
  };

  const scaleConfig = scaleConfigs[scale];
  const baseConfig = ConfigTemplates.production(systemId);

  return {
    ...baseConfig,
    metrics: {
      ...baseConfig.metrics,
      collectionInterval: scaleConfig.collectionInterval,
      batchSize: scaleConfig.batchSize,
      retentionPeriod: scaleConfig.retentionPeriod
    }
  };
}

/**
 * Environment-specific configuration
 */
export function createEnvironmentConfig(
  systemId: string,
  environment: string
): MonitoringSystemConfig {
  const envConfigs = {
    local: ConfigTemplates.development(systemId),
    dev: ConfigTemplates.development(systemId),
    staging: ConfigTemplates.production(systemId),
    prod: ConfigTemplates.production(systemId),
    enterprise: ConfigTemplates.enterprise(systemId)
  };

  return envConfigs[environment as keyof typeof envConfigs] || ConfigTemplates.production(systemId);
}

// ===== MAIN DEMO RUNNER =====

/**
 * Run all examples (useful for testing)
 */
export async function runAllExamples() {
  console.log('Running all monitoring system examples...\n');

  try {
    await basicUsageExample();
    console.log('\n');
    
    await advancedConfigurationExample();
    console.log('\n');
    
    await governanceIntegrationExample();
    console.log('\n');
    
    await dashboardCustomizationExample();
    console.log('\n');
    
    console.log('All examples completed successfully!');
    
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// ===== CLI USAGE =====

if (require.main === module) {
  // Run examples if this file is executed directly
  runAllExamples().catch(console.error);
}
