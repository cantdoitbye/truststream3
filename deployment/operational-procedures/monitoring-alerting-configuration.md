# TrustStram v4.4 Monitoring & Alerting Configuration

**Version**: 4.4.0  
**Last Updated**: September 21, 2025  
**Classification**: Operations Manual  
**Review Cycle**: Monthly  

---

## 📋 **Monitoring Overview**

Comprehensive monitoring and alerting setup for TrustStram v4.4 enterprise deployment ensuring 99.9% uptime SLA compliance and proactive issue detection.

### **Monitoring Stack**
- **Metrics**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Tracing**: Jaeger
- **APM**: New Relic / Datadog
- **Infrastructure**: CloudWatch / Azure Monitor / Stackdriver
- **Uptime**: Pingdom / StatusCake

---

## 📊 **Metrics Collection Setup**

### **Prometheus Configuration**

#### **Core Prometheus Config**
```yaml
# monitoring/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'truststream-v44-production'
    environment: 'production'

rule_files:
  - "alert_rules/*.yml"

scrape_configs:
  # Kubernetes API Server
  - job_name: 'kubernetes-apiservers'
    kubernetes_sd_configs:
    - role: endpoints
    scheme: https
    tls_config:
      ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
    relabel_configs:
    - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
      action: keep
      regex: default;kubernetes;https

  # Kubernetes Nodes
  - job_name: 'kubernetes-nodes'
    kubernetes_sd_configs:
    - role: node
    scheme: https
    tls_config:
      ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
    relabel_configs:
    - action: labelmap
      regex: __meta_kubernetes_node_label_(.+)
    - target_label: __address__
      replacement: kubernetes.default.svc:443
    - source_labels: [__meta_kubernetes_node_name]
      regex: (.+)
      target_label: __metrics_path__
      replacement: /api/v1/nodes/${1}/proxy/metrics

  # TrustStram Application
  - job_name: 'truststream-app'
    kubernetes_sd_configs:
    - role: pod
    relabel_configs:
    - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
      action: keep
      regex: true
    - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
      action: replace
      target_label: __metrics_path__
      regex: (.+)
    - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
      action: replace
      regex: ([^:]+)(?::\d+)?;(\d+)
      replacement: $1:$2
      target_label: __address__
    - action: labelmap
      regex: __meta_kubernetes_pod_label_(.+)
    - source_labels: [__meta_kubernetes_namespace]
      action: replace
      target_label: kubernetes_namespace
    - source_labels: [__meta_kubernetes_pod_name]
      action: replace
      target_label: kubernetes_pod_name

  # Database Exporter
  - job_name: 'postgres-exporter'
    static_configs:
    - targets: ['postgres-exporter:9187']
    scrape_interval: 30s

  # Redis Exporter
  - job_name: 'redis-exporter'
    static_configs:
    - targets: ['redis-exporter:9121']
    scrape_interval: 30s

  # NGINX Exporter
  - job_name: 'nginx-exporter'
    static_configs:
    - targets: ['nginx-exporter:9113']
    scrape_interval: 30s

alerting:
  alertmanagers:
  - static_configs:
    - targets:
      - alertmanager:9093
```

#### **Application Metrics Configuration**
```typescript
// src/monitoring/metrics.ts
import promClient from 'prom-client';

// Create a Registry
const register = new promClient.Registry();

// Add default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new promClient.Histogram({
  name: 'truststream_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

export const httpRequestTotal = new promClient.Counter({
  name: 'truststream_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

export const aiAgentRequestDuration = new promClient.Histogram({
  name: 'truststream_ai_agent_request_duration_seconds',
  help: 'Duration of AI agent requests in seconds',
  labelNames: ['agent_type', 'model', 'status'],
  buckets: [0.5, 1, 2, 5, 10, 30, 60]
});

export const databaseConnectionPool = new promClient.Gauge({
  name: 'truststream_database_connections_active',
  help: 'Number of active database connections',
  labelNames: ['database', 'state']
});

export const cacheHitRate = new promClient.Gauge({
  name: 'truststream_cache_hit_rate',
  help: 'Cache hit rate percentage',
  labelNames: ['cache_type']
});

export const businessMetrics = {
  activeUsers: new promClient.Gauge({
    name: 'truststream_active_users_total',
    help: 'Number of active users'
  }),
  
  agentExecutions: new promClient.Counter({
    name: 'truststream_agent_executions_total',
    help: 'Total number of agent executions',
    labelNames: ['agent_type', 'status']
  }),
  
  dataProcessed: new promClient.Counter({
    name: 'truststream_data_processed_bytes_total',
    help: 'Total bytes of data processed',
    labelNames: ['data_type']
  })
};

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(aiAgentRequestDuration);
register.registerMetric(databaseConnectionPool);
register.registerMetric(cacheHitRate);
register.registerMetric(businessMetrics.activeUsers);
register.registerMetric(businessMetrics.agentExecutions);
register.registerMetric(businessMetrics.dataProcessed);

export { register };
```

---

## 🚨 **Alert Rules Configuration**

### **Critical Alerts (P0)**

#### **Service Availability**
```yaml
# monitoring/alert-rules/critical.yml
groups:
- name: critical
  rules:
  - alert: ServiceDown
    expr: up{job="truststream-app"} == 0
    for: 1m
    labels:
      severity: critical
      team: platform
    annotations:
      summary: "TrustStram service is down"
      description: "TrustStram service {{ $labels.instance }} has been down for more than 1 minute."
      runbook_url: "https://docs.truststream.com/runbooks/service-down"

  - alert: HighErrorRate
    expr: |
      (
        rate(truststream_http_requests_total{status_code=~"5.."}[5m]) /
        rate(truststream_http_requests_total[5m])
      ) > 0.1
    for: 5m
    labels:
      severity: critical
      team: platform
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value | humanizePercentage }} for the last 5 minutes."
      runbook_url: "https://docs.truststream.com/runbooks/high-error-rate"

  - alert: DatabaseDown
    expr: up{job="postgres-exporter"} == 0
    for: 1m
    labels:
      severity: critical
      team: platform
    annotations:
      summary: "Database is unreachable"
      description: "PostgreSQL database has been unreachable for more than 1 minute."
      runbook_url: "https://docs.truststream.com/runbooks/database-down"

  - alert: HighResponseTime
    expr: |
      histogram_quantile(0.95, 
        rate(truststream_http_request_duration_seconds_bucket[5m])
      ) > 5
    for: 5m
    labels:
      severity: critical
      team: platform
    annotations:
      summary: "High response time detected"
      description: "95th percentile response time is {{ $value }}s for the last 5 minutes."
      runbook_url: "https://docs.truststream.com/runbooks/high-response-time"
```

### **Warning Alerts (P1)**

#### **Performance & Capacity**
```yaml
# monitoring/alert-rules/warning.yml
groups:
- name: warning
  rules:
  - alert: HighCPUUsage
    expr: |
      (
        avg by (instance) (
          rate(node_cpu_seconds_total{mode!="idle"}[5m])
        ) * 100
      ) > 80
    for: 10m
    labels:
      severity: warning
      team: platform
    annotations:
      summary: "High CPU usage"
      description: "CPU usage is {{ $value }}% on {{ $labels.instance }}."

  - alert: HighMemoryUsage
    expr: |
      (
        1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)
      ) * 100 > 85
    for: 10m
    labels:
      severity: warning
      team: platform
    annotations:
      summary: "High memory usage"
      description: "Memory usage is {{ $value }}% on {{ $labels.instance }}."

  - alert: DatabaseConnectionsHigh
    expr: |
      (
        pg_stat_database_numbackends /
        pg_settings_max_connections
      ) > 0.8
    for: 5m
    labels:
      severity: warning
      team: platform
    annotations:
      summary: "High database connection usage"
      description: "Database connection usage is {{ $value | humanizePercentage }}."

  - alert: DiskSpaceLow
    expr: |
      (
        1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)
      ) * 100 > 85
    for: 5m
    labels:
      severity: warning
      team: platform
    annotations:
      summary: "Low disk space"
      description: "Disk usage is {{ $value }}% on {{ $labels.instance }}."
```

### **Business Logic Alerts**

#### **AI & Application Specific**
```yaml
# monitoring/alert-rules/business.yml
groups:
- name: business
  rules:
  - alert: AIAgentFailureRate
    expr: |
      (
        rate(truststream_agent_executions_total{status="error"}[10m]) /
        rate(truststream_agent_executions_total[10m])
      ) > 0.05
    for: 5m
    labels:
      severity: warning
      team: ai
    annotations:
      summary: "High AI agent failure rate"
      description: "AI agent failure rate is {{ $value | humanizePercentage }}."

  - alert: CacheHitRateLow
    expr: truststream_cache_hit_rate < 0.8
    for: 10m
    labels:
      severity: warning
      team: platform
    annotations:
      summary: "Low cache hit rate"
      description: "Cache hit rate is {{ $value | humanizePercentage }} for {{ $labels.cache_type }}."

  - alert: ActiveUsersDropped
    expr: |
      (
        truststream_active_users_total < 
        truststream_active_users_total offset 1h * 0.5
      )
    for: 15m
    labels:
      severity: warning
      team: product
    annotations:
      summary: "Significant drop in active users"
      description: "Active users dropped by more than 50% compared to 1 hour ago."
```

---

## 📧 **Alertmanager Configuration**

### **Alert Routing & Grouping**
```yaml
# monitoring/alertmanager/alertmanager.yml
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@truststream.com'
  smtp_auth_username: 'alerts@truststream.com'
  smtp_auth_password: 'password'

route:
  group_by: ['alertname']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 12h
  receiver: 'web.hook'
  routes:
  - match:
      severity: critical
    receiver: 'critical-alerts'
    group_wait: 10s
    repeat_interval: 5m
  - match:
      severity: warning
    receiver: 'warning-alerts'
    group_wait: 30s
    repeat_interval: 1h
  - match:
      team: ai
    receiver: 'ai-team'
  - match:
      team: platform
    receiver: 'platform-team'

inhibit_rules:
- source_match:
    severity: 'critical'
  target_match:
    severity: 'warning'
  equal: ['alertname', 'dev', 'instance']

receivers:
- name: 'web.hook'
  webhook_configs:
  - url: 'http://127.0.0.1:5001/'

- name: 'critical-alerts'
  email_configs:
  - to: 'oncall@truststream.com'
    subject: '[CRITICAL] {{ .GroupLabels.alertname }}'
    body: |
      {{ range .Alerts }}
      Alert: {{ .Annotations.summary }}
      Description: {{ .Annotations.description }}
      Runbook: {{ .Annotations.runbook_url }}
      {{ end }}
  slack_configs:
  - api_url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX'
    channel: '#alerts-critical'
    title: '[CRITICAL] {{ .GroupLabels.alertname }}'
    text: |
      {{ range .Alerts }}
      *Alert:* {{ .Annotations.summary }}
      *Description:* {{ .Annotations.description }}
      *Runbook:* {{ .Annotations.runbook_url }}
      {{ end }}
  pagerduty_configs:
  - service_key: 'PAGERDUTY_SERVICE_KEY'
    description: '{{ .GroupLabels.alertname }}'

- name: 'warning-alerts'
  slack_configs:
  - api_url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX'
    channel: '#alerts-warning'
    title: '[WARNING] {{ .GroupLabels.alertname }}'
    text: |
      {{ range .Alerts }}
      *Alert:* {{ .Annotations.summary }}
      *Description:* {{ .Annotations.description }}
      {{ end }}

- name: 'ai-team'
  slack_configs:
  - api_url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX'
    channel: '#team-ai'
    title: '[AI ALERT] {{ .GroupLabels.alertname }}'

- name: 'platform-team'
  slack_configs:
  - api_url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX'
    channel: '#team-platform'
    title: '[PLATFORM ALERT] {{ .GroupLabels.alertname }}'
```

---

## 📊 **Grafana Dashboards**

### **Main Application Dashboard**
```json
{
  "dashboard": {
    "id": null,
    "title": "TrustStram v4.4 - Application Overview",
    "tags": ["truststream", "production"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(truststream_http_requests_total[5m])",
            "legendFormat": "{{ method }} {{ route }}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Response Time (95th percentile)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(truststream_http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      },
      {
        "id": 3,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(truststream_http_requests_total{status_code=~\"5..\"}[5m]) / rate(truststream_http_requests_total[5m])",
            "legendFormat": "Error Rate"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8}
      },
      {
        "id": 4,
        "title": "Active Users",
        "type": "stat",
        "targets": [
          {
            "expr": "truststream_active_users_total",
            "legendFormat": "Active Users"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8}
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
```

### **Infrastructure Dashboard**
```json
{
  "dashboard": {
    "title": "TrustStram v4.4 - Infrastructure",
    "panels": [
      {
        "title": "CPU Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "100 - (avg by (instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
            "legendFormat": "{{ instance }}"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100",
            "legendFormat": "{{ instance }}"
          }
        ]
      },
      {
        "title": "Disk Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "(1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100",
            "legendFormat": "{{ instance }} {{ mountpoint }}"
          }
        ]
      },
      {
        "title": "Network I/O",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(node_network_receive_bytes_total[5m])",
            "legendFormat": "RX {{ instance }} {{ device }}"
          },
          {
            "expr": "rate(node_network_transmit_bytes_total[5m])",
            "legendFormat": "TX {{ instance }} {{ device }}"
          }
        ]
      }
    ]
  }
}
```

---

## 📄 **Logging Configuration**

### **Application Logging Setup**
```typescript
// src/monitoring/logger.ts
import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return JSON.stringify({
        timestamp,
        level,
        message,
        service: 'truststream-v44',
        environment: process.env.NODE_ENV,
        version: process.env.APP_VERSION,
        ...meta
      });
    })
  ),
  transports: [
    new winston.transports.Console(),
    new ElasticsearchTransport({
      level: 'info',
      clientOpts: {
        node: process.env.ELASTICSEARCH_URL,
        auth: {
          username: process.env.ELASTICSEARCH_USERNAME,
          password: process.env.ELASTICSEARCH_PASSWORD
        }
      },
      index: 'truststream-logs'
    })
  ]
});

export default logger;
```

### **Structured Logging Example**
```typescript
// Usage in application code
import logger from './monitoring/logger';

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      requestId: req.headers['x-request-id']
    });
  });
  
  next();
};

// Error logging
export const errorLogger = (error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Application Error', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body
    },
    requestId: req.headers['x-request-id']
  });
  
  next(error);
};
```

---

## 🗺️ **Distributed Tracing**

### **Jaeger Configuration**
```typescript
// src/monitoring/tracing.ts
import { initTracer } from 'jaeger-client';
import opentracing from 'opentracing';

const config = {
  serviceName: 'truststream-v44',
  sampler: {
    type: 'const',
    param: 1
  },
  reporter: {
    logSpans: true,
    agentHost: process.env.JAEGER_AGENT_HOST || 'localhost',
    agentPort: parseInt(process.env.JAEGER_AGENT_PORT || '6832')
  }
};

const tracer = initTracer(config);
opentracing.initGlobalTracer(tracer);

export { tracer };

// Express middleware for tracing
export const tracingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const span = tracer.startSpan(`${req.method} ${req.route?.path || req.path}`);
  
  span.setTag('http.method', req.method);
  span.setTag('http.url', req.url);
  span.setTag('user.id', req.user?.id);
  
  req.span = span;
  
  res.on('finish', () => {
    span.setTag('http.status_code', res.statusCode);
    span.finish();
  });
  
  next();
};
```

---

## 📱 **Uptime Monitoring**

### **External Monitoring Setup**
```bash
#!/bin/bash
# scripts/monitoring/setup-uptime-monitoring.sh

# Pingdom checks
curl -X POST "https://api.pingdom.com/api/3.1/checks" \
  -H "Authorization: Bearer $PINGDOM_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "TrustStram API Health",
    "host": "truststream.yourdomain.com",
    "type": "http",
    "url": "/health",
    "encryption": true,
    "port": 443,
    "requestheaders": {
      "User-Agent": "Pingdom Monitor"
    },
    "shouldcontain": "healthy",
    "sendnotificationwhendown": 2,
    "notifyagainevery": 0,
    "notifywhenbackup": true,
    "resolution": 1
  }'

# StatusCake checks
curl -X POST "https://app.statuscake.com/API/Tests/Update" \
  -H "API: $STATUSCAKE_API_KEY" \
  -H "Username: $STATUSCAKE_USERNAME" \
  -d "WebsiteName=TrustStram API" \
  -d "WebsiteURL=https://truststream.yourdomain.com/health" \
  -d "CheckRate=60" \
  -d "TestType=HTTP" \
  -d "FindString=healthy"
```

---

## 📋 **Monitoring Runbooks**

### **Alert Response Procedures**

#### **High Error Rate Response**
```markdown
# Runbook: High Error Rate

## Immediate Actions (0-5 minutes)
1. Check application logs for error patterns
2. Verify database connectivity
3. Check external service dependencies
4. Monitor resource utilization

## Investigation Steps
1. Query error breakdown by endpoint
2. Check recent deployments
3. Verify configuration changes
4. Review database performance

## Resolution Steps
1. If deployment related: Consider rollback
2. If resource related: Scale up instances
3. If dependency related: Enable circuit breaker
4. If database related: Check slow queries

## Escalation
If not resolved in 15 minutes, escalate to Senior Engineer
```

---

**📊 This monitoring configuration provides comprehensive observability for TrustStram v4.4 ensuring proactive issue detection and rapid resolution.**

*Review and update alert thresholds monthly based on baseline performance metrics.*