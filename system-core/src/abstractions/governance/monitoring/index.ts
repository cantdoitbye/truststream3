/**
 * @fileoverview Health monitoring system exports
 * @version 1.0.0
 * @author TrustStream Health Monitoring System
 * @description Centralized exports for all health monitoring interfaces and types
 */

// Core health monitoring interfaces and types
export * from './health.interfaces';

// Metrics collection system
export * from './metrics.interfaces';

// Predictive analytics and forecasting
export * from './predictive.interfaces';

// Automated health checks and alerting
export * from './health-checks.interfaces';

// Auto-recovery and self-healing
export * from './auto-recovery.interfaces';

// Dashboard and visualization
export * from './dashboard.interfaces';

/**
 * @description
 * This module provides a comprehensive suite of TypeScript interfaces for building
 * a complete health monitoring and auto-recovery system for governance agents.
 * 
 * ## Core Components:
 * 
 * ### 1. Health Monitoring Foundation
 * - IMetric: Individual metric data points
 * - IHealthStatus: Comprehensive health state representation
 * - IAlert: Intelligent alerting system
 * - RecoveryProcedure: Auto-recovery procedure definitions
 * 
 * ### 2. Metrics Collection System
 * - IMetricsCollectionConfig: Configuration for metrics collection
 * - IMetricsCollector: Real-time metrics collector
 * - IMetricsAggregator: Metrics aggregation and processing
 * - IMetricsStorage: Persistent storage and retrieval
 * - IMetricsQuery: Query and analysis capabilities
 * - IMetricsStream: Real-time metrics streaming
 * - IMetricsExporter: Export and integration
 * 
 * ### 3. Predictive Analytics
 * - IPredictiveModelConfig: Prediction model configuration
 * - IPredictionResult: Prediction results and forecasts
 * - IAnomalyDetection: Anomaly detection and classification
 * - IPerformanceForecastingEngine: Performance forecasting engine
 * 
 * ### 4. Automated Health Checks
 * - IHealthCheck: Health check definition and configuration
 * - IHealthCheckResult: Health check execution results
 * - IIntelligentAlertingEngine: Smart alert generation and correlation
 * - IAdaptiveHealthMonitoring: Machine learning-driven adaptive monitoring
 * 
 * ### 5. Auto-Recovery System
 * - IRecoveryTrigger: Recovery trigger definition
 * - IRecoveryExecutionEngine: Recovery execution management
 * - IRecoveryExecution: Recovery execution tracking and results
 * - ISelfHealingCoordinator: System-wide healing coordination
 * 
 * ### 6. Health Dashboard
 * - IDashboardConfig: Dashboard configuration and layout
 * - IDashboardWidget: Widget configuration and behavior
 * - IRealTimeDashboardData: Real-time data management
 * - IDashboardAnalytics: Analytics and insights
 * - IDashboardExport: Export and reporting
 * 
 * ## Key Features:
 * 
 * ### Real-time Monitoring
 * - Continuous metrics collection (CPU, memory, task latency, error rates)
 * - Real-time health status tracking
 * - Live streaming data feeds
 * - Adaptive monitoring strategies
 * 
 * ### Predictive Analytics
 * - Multiple prediction models (LSTM, ARIMA, Random Forest, etc.)
 * - Anomaly detection algorithms
 * - Performance forecasting
 * - Trend analysis and pattern recognition
 * 
 * ### Intelligent Alerting
 * - Smart alert correlation
 * - Alert suppression and deduplication
 * - Priority-based routing
 * - Escalation management
 * 
 * ### Automated Recovery
 * - Condition-based triggers
 * - Multi-step recovery procedures
 * - Rollback capabilities
 * - Self-healing coordination
 * 
 * ### Comprehensive Dashboard
 * - Real-time visualization
 * - Interactive widgets
 * - Analytics insights
 * - Export and reporting
 * 
 * ## Usage Example:
 * 
 * ```typescript
 * import {
 *   IMetricsCollector,
 *   IHealthCheck,
 *   IPredictionResult,
 *   IRecoveryTrigger,
 *   IDashboardConfig
 * } from '@truststream/governance/monitoring';
 * 
 * // Configure metrics collection
 * const metricsConfig: IMetricsCollectionConfig = {
 *   id: 'agent-metrics',
 *   agentId: 'governance-agent-1',
 *   intervalSeconds: 30,
 *   enabledMetrics: [
 *     { type: MetricType.CPU_USAGE, enabled: true },
 *     { type: MetricType.MEMORY_USAGE, enabled: true },
 *     { type: MetricType.TASK_LATENCY, enabled: true }
 *   ]
 * };
 * 
 * // Define health check
 * const healthCheck: IHealthCheck = {
 *   id: 'connectivity-check',
 *   name: 'Agent Connectivity Check',
 *   type: HealthCheckType.BASIC_CONNECTIVITY,
 *   target: { agentId: 'governance-agent-1' },
 *   execution: {
 *     strategy: CheckExecutionStrategy.SCHEDULED,
 *     schedule: { cronExpression: '* * * * *' } // Every minute
 *   }
 * };
 * 
 * // Configure recovery trigger
 * const recoveryTrigger: IRecoveryTrigger = {
 *   id: 'high-cpu-trigger',
 *   name: 'High CPU Usage Recovery',
 *   type: RecoveryTriggerType.METRIC_THRESHOLD,
 *   condition: {
 *     primary: {
 *       source: 'metric',
 *       parameters: { metricType: MetricType.CPU_USAGE },
 *       evaluation: { operator: '>', value: 80, duration: 300 }
 *     }
 *   },
 *   recoveryProcedures: [{
 *     procedureId: 'restart-agent',
 *     priority: 1,
 *     executionMode: 'sequential'
 *   }]
 * };
 * ```
 * 
 * @since 1.0.0
 */