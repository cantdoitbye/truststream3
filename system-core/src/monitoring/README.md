# Enhanced Monitoring and Analytics System

A comprehensive, backend-agnostic monitoring and analytics system designed for AI applications. This system provides real-time monitoring of AI agents, model performance, and system health with advanced features like anomaly detection, predictive analytics, and intelligent alerting.

## 🚀 Features

### Core Monitoring
- **AI Agent Tracking** - Monitor agent lifecycle, performance, and errors
- **Model Performance** - Track inference latency, token usage, and success rates
- **System Health** - Monitor CPU, memory, disk usage, and network latency
- **Error Tracking** - Comprehensive error logging with context and stack traces

### Advanced Analytics
- **Anomaly Detection** - Statistical and ML-based anomaly detection with configurable sensitivity
- **Predictive Analytics** - Trend analysis and forecasting for key metrics
- **Intelligent Alerting** - Smart alert system with severity levels and auto-resolution
- **Performance Insights** - Automated performance analysis and recommendations

### Architecture Benefits
- **Backend Agnostic** - Works with Supabase, MongoDB, PostgreSQL, and more
- **High Performance** - Optimized batching, indexing, and caching
- **Scalable** - Designed to handle high-volume production workloads
- **Production Ready** - Comprehensive error handling, cleanup, and monitoring

## 📦 Installation

```bash
npm install @supabase/supabase-js
# or
yarn add @supabase/supabase-js
```

## 🔧 Setup

### 1. Database Setup (Supabase)

Run the migration SQL in your Supabase project:

```sql
-- Copy and run the content from src/monitoring/supabase_migration.sql
-- This creates all necessary tables, indexes, and policies
```

### 2. Initialize the Analytics Service

```typescript
import { createAnalyticsService } from './src/monitoring';

const analytics = createAnalyticsService({
  backend: 'supabase',
  connection: {
    url: process.env.SUPABASE_URL!,
    apiKey: process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key for backend
  },
  features: {
    enableAnomalyDetection: true,
    enablePredictions: true,
    enableSystemHealth: true,
    retentionDays: 30
  },
  batchSize: 100,
  flushInterval: 5000 // 5 seconds
});

// Initialize the service
await analytics.initialize();
```

### 3. Quick Setup Helper

```typescript
import { quickSetup } from './src/monitoring';

const analytics = quickSetup({
  backend: 'supabase',
  url: process.env.SUPABASE_URL!,
  apiKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  features: {
    enableAnomalyDetection: true,
    enablePredictions: true
  }
});

await analytics.initialize();
```

## 📚 Usage Examples

### Basic Agent Monitoring

```typescript
// Track agent lifecycle
await analytics.logAgentStart('agent-123', {
  userId: 'user-456',
  sessionId: 'session-789',
  modelName: 'gpt-4',
  metadata: { 
    task: 'document_analysis',
    priority: 'high'
  }
});

// Log successful completion
await analytics.logAgentComplete('agent-123', {
  userId: 'user-456',
  duration: 2500, // milliseconds
  tokenCount: 150,
  metadata: {
    outputFormat: 'json',
    documentsProcessed: 5
  }
});

// Log errors with context
await analytics.logAgentError('agent-123', new Error('API timeout'), {
  userId: 'user-456',
  metadata: {
    retryAttempt: 2,
    apiEndpoint: '/analyze'
  }
});
```

### Model Performance Tracking

```typescript
// Track model inference
await analytics.trackModelInference('gpt-4', {
  duration: 1500,
  tokenCount: 200,
  inputTokens: 150,
  outputTokens: 50,
  agentId: 'agent-123',
  success: true
});

// Track custom metrics
await analytics.trackMetric({
  name: 'custom_processing_time',
  value: 3500,
  unit: 'ms',
  metricType: 'timer',
  agentId: 'agent-123',
  dimensions: {
    algorithm: 'advanced',
    dataSize: 'large'
  }
});
```

### System Monitoring

```typescript
// Track system resources
await analytics.trackSystemUsage({
  cpuUsage: 75.5,
  memoryUsage: 82.3,
  diskUsage: 45.2,
  networkLatency: 125,
  activeConnections: 150
});
```

### Analytics and Insights

```typescript
// Get comprehensive dashboard data
const dashboard = await analytics.getDashboardData({
  start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
  end: new Date()
});

console.log('Agent Metrics:', dashboard.agentMetrics);
console.log('Model Performance:', dashboard.modelMetrics);
console.log('System Health:', dashboard.systemMetrics);
console.log('Recent Anomalies:', dashboard.recentAnomalies);
console.log('Active Alerts:', dashboard.activeAlerts);
```

### Anomaly Detection

```typescript
// Detect anomalies for specific metrics
const anomalies = await analytics.detectAnomalies('model_latency');

for (const anomaly of anomalies) {
  console.log(`Anomaly detected: ${anomaly.description}`);
  console.log(`Severity: ${anomaly.severity}, Confidence: ${anomaly.confidence}`);
}

// Custom anomaly detection rules
await analytics.backend.detectAnomalies({
  metric: 'cpu_usage',
  threshold: 90,
  sensitivity: 'high',
  lookbackPeriod: 30,
  minDataPoints: 10,
  algorithm: 'threshold'
});
```

### Predictive Analytics

```typescript
// Generate predictions
const prediction = await analytics.generatePrediction({
  metric: 'model_latency',
  forecastPeriod: 60, // next 60 minutes
  confidence: 0.8,
  includeSeasonality: true,
  model: 'linear'
});

console.log('Predicted values:', prediction.predictions);
console.log('Confidence:', prediction.confidence);
```

### Custom Alerts

```typescript
// Create custom alerts
await analytics.createAlert({
  title: 'High Error Rate Detected',
  description: 'Agent error rate has exceeded 10% in the last hour',
  severity: 'warning',
  source: 'agent_monitoring',
  condition: {
    metric: 'agent_error_rate',
    threshold: 10,
    operator: 'gt'
  },
  status: 'active',
  metadata: {
    threshold: 10,
    currentValue: 15.5
  }
});
```

## 🔌 Backend Integration

### Extending to New Backends

The system is designed to be backend-agnostic. To add support for a new backend:

```typescript
import { BaseMonitoringBackend, MonitoringConfig } from './src/monitoring';

class CustomMonitoringBackend extends BaseMonitoringBackend {
  constructor(config: MonitoringConfig) {
    super(config);
    // Initialize your backend connection
  }

  async initialize(): Promise<void> {
    // Set up your backend
    this.initialized = true;
  }

  // Implement all abstract methods
  async persistLogs(logs: LogEntry[]): Promise<void> {
    // Your backend-specific implementation
  }

  async persistMetrics(metrics: PerformanceMetric[]): Promise<void> {
    // Your backend-specific implementation
  }

  // ... implement other abstract methods
}
```

### Custom Analytics

```typescript
import { MonitoringUtils } from './src/monitoring';

// Use utility functions for custom analytics
const timeSeries = MonitoringUtils.createTimeSeries(metrics, 'cpu_usage');
const trend = MonitoringUtils.detectTrend(timeSeries);
const report = MonitoringUtils.createPerformanceReport({
  logs,
  metrics,
  timeRange: { start, end }
});

console.log('Performance Report:', report);
console.log('Recommendations:', report.recommendations);
```

## 📊 Dashboard Integration

### React Dashboard Example

```typescript
import React, { useEffect, useState } from 'react';
import { analytics } from './analytics-service';

export function MonitoringDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const data = await analytics.getDashboardData({
          start: new Date(Date.now() - 24 * 60 * 60 * 1000),
          end: new Date()
        });
        setDashboardData(data);
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
    const interval = setInterval(loadDashboard, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="monitoring-dashboard">
      <div className="metrics-grid">
        <MetricCard 
          title="Active Agents" 
          value={dashboardData.agentMetrics.activeAgents} 
        />
        <MetricCard 
          title="Completion Rate" 
          value={`${dashboardData.agentMetrics.completionRate.toFixed(1)}%`} 
        />
        <MetricCard 
          title="Avg Latency" 
          value={`${dashboardData.modelMetrics.averageLatency}ms`} 
        />
        <MetricCard 
          title="Error Rate" 
          value={`${dashboardData.agentMetrics.errorRate.toFixed(1)}%`} 
        />
      </div>
      
      <AlertsList alerts={dashboardData.activeAlerts} />
      <AnomaliesList anomalies={dashboardData.recentAnomalies} />
    </div>
  );
}
```

## 🛠️ Configuration Options

### Full Configuration

```typescript
const config = {
  backend: 'supabase',
  connection: {
    url: 'your-supabase-url',
    apiKey: 'your-service-role-key'
  },
  features: {
    enableAnomalyDetection: true,
    enablePredictions: true,
    enableSystemHealth: true,
    retentionDays: 30
  },
  batchSize: 100,           // Number of records to batch before writing
  flushInterval: 5000,      // Auto-flush interval in milliseconds
  maxCacheSize: 1000        // Maximum cache size for performance
};
```

### Environment Variables

```bash
# Required for Supabase backend
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional configuration
MONITORING_BATCH_SIZE=100
MONITORING_FLUSH_INTERVAL=5000
MONITORING_RETENTION_DAYS=30
```

## 📈 Performance Optimization

### Best Practices

1. **Use Batching**: Enable batching for high-volume scenarios
2. **Optimize Queries**: Use proper filtering and pagination
3. **Regular Cleanup**: Set appropriate retention periods
4. **Index Usage**: Ensure database indexes are properly configured
5. **Caching**: Leverage built-in caching for frequently accessed data

### Monitoring Performance

```typescript
// Track the monitoring system itself
await analytics.trackMetric({
  name: 'monitoring_flush_duration',
  value: flushDuration,
  unit: 'ms',
  metricType: 'timer',
  tags: ['internal', 'performance']
});
```

## 🔒 Security

### Row Level Security (RLS)

The system includes comprehensive RLS policies:

- **Service Role**: Full access for backend operations
- **Authenticated Users**: Can read their own data
- **Public Data**: System health and alerts are readable by authenticated users

### Data Privacy

- **User Isolation**: User data is automatically isolated
- **Encryption**: All data is encrypted at rest and in transit
- **Audit Trail**: Complete audit trail for all operations

## 🚨 Alerting and Notifications

### Built-in Alert Rules

```typescript
// The system includes default alert rules for:
// - High CPU usage (>90%)
// - High memory usage (>85%)
// - Model latency anomalies
// - High error rates (>10%)
// - System health degradation
```

### Custom Notifications

```typescript
// Integrate with external notification systems
analytics.backend.getAlerts('active').then(alerts => {
  for (const alert of alerts) {
    if (alert.severity === 'critical') {
      // Send to Slack, email, PagerDuty, etc.
      notificationService.send({
        channel: 'critical-alerts',
        message: alert.description,
        metadata: alert.metadata
      });
    }
  }
});
```

## 🧪 Testing

### Unit Testing

```typescript
import { MonitoringUtils } from './src/monitoring';

describe('MonitoringUtils', () => {
  test('should calculate percentiles correctly', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(MonitoringUtils.calculatePercentile(values, 50)).toBe(5);
    expect(MonitoringUtils.calculatePercentile(values, 90)).toBe(9);
  });

  test('should detect trends correctly', () => {
    const increasingData = [
      { timestamp: new Date(), value: 1 },
      { timestamp: new Date(), value: 2 },
      { timestamp: new Date(), value: 3 }
    ];
    
    const trend = MonitoringUtils.detectTrend(increasingData);
    expect(trend.trend).toBe('increasing');
    expect(trend.confidence).toBeGreaterThan(0.5);
  });
});
```

### Integration Testing

```typescript
describe('AnalyticsService Integration', () => {
  let analytics: AnalyticsService;

  beforeAll(async () => {
    analytics = createAnalyticsService(testConfig);
    await analytics.initialize();
  });

  afterAll(async () => {
    await analytics.destroy();
  });

  test('should log and retrieve agent events', async () => {
    await analytics.logAgentStart('test-agent', { userId: 'test-user' });
    
    const logs = await analytics.backend.getLogs({
      agentIds: ['test-agent'],
      limit: 10
    });
    
    expect(logs).toHaveLength(1);
    expect(logs[0].agentId).toBe('test-agent');
  });
});
```

## 📖 API Reference

### Core Classes

#### AnalyticsService

Main service class providing high-level monitoring functionality.

**Methods:**
- `initialize()` - Initialize the service
- `destroy()` - Cleanup and destroy the service
- `logAgentStart(agentId, context)` - Log agent start event
- `logAgentComplete(agentId, context)` - Log agent completion
- `logAgentError(agentId, error, context)` - Log agent error
- `trackMetric(metric)` - Track performance metric
- `trackModelInference(model, context)` - Track model performance
- `getDashboardData(timeRange)` - Get analytics dashboard data
- `detectAnomalies(metric?)` - Run anomaly detection
- `generatePrediction(request)` - Generate predictions

#### MonitoringBackend

Abstract interface implemented by all backends.

**Methods:**
- `log(entry)` - Log a single entry
- `track(metric)` - Track a single metric
- `query(query)` - Execute analytics query
- `detectAnomalies(config)` - Detect anomalies
- `createAlert(alert)` - Create alert
- `cleanup(olderThan)` - Cleanup old data

#### MonitoringUtils

Utility functions for analytics calculations.

**Methods:**
- `createLogEntry()` - Create standardized log entry
- `createMetric()` - Create performance metric
- `calculatePercentile()` - Calculate percentiles
- `detectTrend()` - Detect trends in time series
- `createPerformanceReport()` - Generate performance report

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For questions, issues, or contributions:

1. Check the [GitHub Issues](link-to-issues)
2. Review the [Documentation](link-to-docs)
3. Join our [Community Discord](link-to-discord)

---

**Built with ❤️ for the AI development community**
