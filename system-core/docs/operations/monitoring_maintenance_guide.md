# TrustStram v4.4 Monitoring and Maintenance Guide

## Table of Contents
1. [Monitoring Overview](#monitoring-overview)
2. [System Monitoring](#system-monitoring)
3. [Application Monitoring](#application-monitoring)
4. [Performance Monitoring](#performance-monitoring)
5. [Security Monitoring](#security-monitoring)
6. [Database Monitoring](#database-monitoring)
7. [Infrastructure Monitoring](#infrastructure-monitoring)
8. [Alerting and Notifications](#alerting-and-notifications)
9. [Log Management](#log-management)
10. [Maintenance Procedures](#maintenance-procedures)
11. [Preventive Maintenance](#preventive-maintenance)
12. [Health Checks](#health-checks)
13. [Capacity Planning](#capacity-planning)
14. [Troubleshooting Runbooks](#troubleshooting-runbooks)

## Monitoring Overview

TrustStram v4.4 provides comprehensive monitoring capabilities through multiple layers:

### Monitoring Stack Architecture
```
┌─────────────────────────────────────────────────────┐
│                 Monitoring Stack                    │
├─────────────────────────────────────────────────────┤
│ Grafana Dashboards                                  │
├─────────────────────────────────────────────────────┤
│ Prometheus Metrics Collection                       │
├─────────────────────────────────────────────────────┤
│ Jaeger Distributed Tracing                         │
├─────────────────────────────────────────────────────┤
│ ELK Stack (Elasticsearch, Logstash, Kibana)        │
├─────────────────────────────────────────────────────┤
│ Custom TrustStram Metrics                           │
└─────────────────────────────────────────────────────┘
```

### Key Monitoring Components
- **Metrics**: Prometheus + Grafana
- **Logs**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Traces**: Jaeger
- **Uptime**: Custom health checks
- **Alerts**: AlertManager + PagerDuty
- **APM**: Application Performance Monitoring

## System Monitoring

### Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "truststram_alerts.yml"

scrape_configs:
  - job_name: 'truststram-api'
    static_configs:
      - targets: ['localhost:8080']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'truststram-worker'
    static_configs:
      - targets: ['localhost:8081']
    metrics_path: '/metrics'
    scrape_interval: 15s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['localhost:9187']

  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['localhost:9121']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### System Metrics Collection
```bash
# Install and configure node_exporter
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz
tar xvfz node_exporter-1.6.1.linux-amd64.tar.gz
sudo cp node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/

# Create systemd service
cat > /etc/systemd/system/node_exporter.service << 'EOF'
[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=prometheus
Group=prometheus
Type=simple
ExecStart=/usr/local/bin/node_exporter \
  --collector.systemd \
  --collector.processes \
  --collector.diskstats

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable node_exporter
sudo systemctl start node_exporter
```

### Custom System Metrics
```python
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import psutil
import time

# Define custom metrics
REQUEST_COUNT = Counter('truststram_requests_total', 'Total requests', ['method', 'endpoint'])
REQUEST_LATENCY = Histogram('truststram_request_duration_seconds', 'Request latency')
ACTIVE_USERS = Gauge('truststram_active_users', 'Number of active users')
MODEL_PREDICTIONS = Counter('truststram_model_predictions_total', 'Total model predictions', ['model_id'])
FEDERATED_CLIENTS = Gauge('truststram_federated_clients', 'Number of connected federated clients')

class SystemMonitor:
    def __init__(self):
        self.start_time = time.time()
    
    def collect_system_metrics(self):
        """Collect and expose system metrics."""
        # CPU usage
        cpu_usage = Gauge('system_cpu_usage_percent', 'CPU usage percentage')
        cpu_usage.set(psutil.cpu_percent())
        
        # Memory usage
        memory = psutil.virtual_memory()
        memory_usage = Gauge('system_memory_usage_percent', 'Memory usage percentage')
        memory_usage.set(memory.percent)
        
        # Disk usage
        disk = psutil.disk_usage('/')
        disk_usage = Gauge('system_disk_usage_percent', 'Disk usage percentage')
        disk_usage.set((disk.used / disk.total) * 100)
        
        # Network I/O
        network = psutil.net_io_counters()
        network_bytes_sent = Gauge('system_network_bytes_sent_total', 'Network bytes sent')
        network_bytes_recv = Gauge('system_network_bytes_recv_total', 'Network bytes received')
        network_bytes_sent.set(network.bytes_sent)
        network_bytes_recv.set(network.bytes_recv)
    
    def start_monitoring(self):
        """Start metrics collection server."""
        start_http_server(9090)
        while True:
            self.collect_system_metrics()
            time.sleep(15)

# Usage
if __name__ == "__main__":
    monitor = SystemMonitor()
    monitor.start_monitoring()
```

## Application Monitoring

### Application Metrics
```python
from truststram.monitoring import MetricsCollector
import time
import functools

class TrustStramMonitor:
    def __init__(self):
        self.metrics = MetricsCollector()
    
    def monitor_api_endpoint(self, func):
        """Decorator to monitor API endpoints."""
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            method = kwargs.get('method', 'GET')
            endpoint = func.__name__
            
            try:
                result = func(*args, **kwargs)
                REQUEST_COUNT.labels(method=method, endpoint=endpoint).inc()
                return result
            except Exception as e:
                ERROR_COUNT.labels(method=method, endpoint=endpoint, error=type(e).__name__).inc()
                raise
            finally:
                REQUEST_LATENCY.observe(time.time() - start_time)
        
        return wrapper
    
    def monitor_model_performance(self, model_id, prediction_time, accuracy=None):
        """Monitor model performance metrics."""
        MODEL_PREDICTIONS.labels(model_id=model_id).inc()
        
        prediction_latency = Histogram('model_prediction_latency_seconds', 
                                     'Model prediction latency', ['model_id'])
        prediction_latency.labels(model_id=model_id).observe(prediction_time)
        
        if accuracy is not None:
            model_accuracy = Gauge('model_accuracy', 'Model accuracy', ['model_id'])
            model_accuracy.labels(model_id=model_id).set(accuracy)
    
    def monitor_federated_learning(self, round_id, num_clients, aggregation_time):
        """Monitor federated learning metrics."""
        FEDERATED_CLIENTS.set(num_clients)
        
        fl_round_time = Histogram('federated_learning_round_duration_seconds',
                                'Federated learning round duration')
        fl_round_time.observe(aggregation_time)
        
        fl_rounds = Counter('federated_learning_rounds_total', 'Total FL rounds')
        fl_rounds.inc()

# Integration with Flask/FastAPI
from flask import Flask, request
from prometheus_flask_exporter import PrometheusMetrics

app = Flask(__name__)
metrics = PrometheusMetrics(app)

# Add custom metrics
metrics.info('truststram_info', 'TrustStram application info', version='4.4.0')

@app.route('/api/v1/predict', methods=['POST'])
@metrics.counter('predictions', 'Number of predictions', labels={'model': lambda: request.json.get('model_id')})
def predict():
    # Prediction logic here
    pass
```

### Health Check Implementation
```python
from truststram.health import HealthChecker
import redis
import psycopg2

class TrustStramHealthChecker:
    def __init__(self):
        self.health_checker = HealthChecker()
        self.setup_health_checks()
    
    def setup_health_checks(self):
        """Setup various health checks."""
        
        # Database health check
        self.health_checker.add_check("database", self.check_database)
        
        # Redis health check
        self.health_checker.add_check("redis", self.check_redis)
        
        # External API health check
        self.health_checker.add_check("external_api", self.check_external_apis)
        
        # Model service health check
        self.health_checker.add_check("model_service", self.check_model_service)
        
        # Federated learning coordinator
        self.health_checker.add_check("fl_coordinator", self.check_fl_coordinator)
    
    def check_database(self):
        """Check database connectivity and performance."""
        try:
            conn = psycopg2.connect(DATABASE_URL)
            cursor = conn.cursor()
            
            # Test query
            start_time = time.time()
            cursor.execute("SELECT 1")
            query_time = time.time() - start_time
            
            cursor.close()
            conn.close()
            
            if query_time > 1.0:  # Slow query threshold
                return {"status": "warning", "message": f"Slow database response: {query_time:.2f}s"}
            
            return {"status": "healthy", "response_time": query_time}
        
        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}
    
    def check_redis(self):
        """Check Redis connectivity."""
        try:
            r = redis.Redis.from_url(REDIS_URL)
            start_time = time.time()
            r.ping()
            response_time = time.time() - start_time
            
            return {"status": "healthy", "response_time": response_time}
        
        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}
    
    def get_health_status(self):
        """Get overall system health."""
        return self.health_checker.get_status()

# FastAPI health endpoint
from fastapi import FastAPI

app = FastAPI()
health_checker = TrustStramHealthChecker()

@app.get("/health")
async def health_check():
    return health_checker.get_health_status()

@app.get("/health/detailed")
async def detailed_health_check():
    return health_checker.get_detailed_status()
```

## Performance Monitoring

### Response Time Monitoring
```python
import time
import statistics
from collections import deque, defaultdict

class PerformanceMonitor:
    def __init__(self, window_size=1000):
        self.response_times = defaultdict(lambda: deque(maxlen=window_size))
        self.request_counts = defaultdict(int)
        
    def record_request(self, endpoint, response_time):
        """Record request performance."""
        self.response_times[endpoint].append(response_time)
        self.request_counts[endpoint] += 1
    
    def get_performance_stats(self, endpoint):
        """Get performance statistics for an endpoint."""
        times = list(self.response_times[endpoint])
        if not times:
            return None
        
        return {
            "count": len(times),
            "avg_response_time": statistics.mean(times),
            "median_response_time": statistics.median(times),
            "p95_response_time": self.percentile(times, 95),
            "p99_response_time": self.percentile(times, 99),
            "min_response_time": min(times),
            "max_response_time": max(times)
        }
    
    def percentile(self, data, percentile):
        """Calculate percentile."""
        size = len(data)
        return sorted(data)[int(size * percentile / 100)]
    
    def get_slow_endpoints(self, threshold=1.0):
        """Identify slow endpoints."""
        slow_endpoints = []
        for endpoint in self.response_times:
            stats = self.get_performance_stats(endpoint)
            if stats and stats["avg_response_time"] > threshold:
                slow_endpoints.append({
                    "endpoint": endpoint,
                    "avg_response_time": stats["avg_response_time"]
                })
        
        return sorted(slow_endpoints, key=lambda x: x["avg_response_time"], reverse=True)

# Usage with middleware
performance_monitor = PerformanceMonitor()

class PerformanceMiddleware:
    def __init__(self, app):
        self.app = app
    
    def __call__(self, environ, start_response):
        start_time = time.time()
        
        def new_start_response(status, response_headers, exc_info=None):
            response_time = time.time() - start_time
            endpoint = environ.get('PATH_INFO', 'unknown')
            performance_monitor.record_request(endpoint, response_time)
            return start_response(status, response_headers, exc_info)
        
        return self.app(environ, new_start_response)
```

### Resource Usage Monitoring
```python
import psutil
import threading
import time
from datetime import datetime

class ResourceMonitor:
    def __init__(self):
        self.monitoring = False
        self.data = []
        
    def start_monitoring(self, interval=30):
        """Start resource monitoring."""
        self.monitoring = True
        
        def monitor_loop():
            while self.monitoring:
                timestamp = datetime.now()
                
                # CPU usage
                cpu_percent = psutil.cpu_percent(interval=1)
                cpu_per_core = psutil.cpu_percent(interval=1, percpu=True)
                
                # Memory usage
                memory = psutil.virtual_memory()
                swap = psutil.swap_memory()
                
                # Disk usage
                disk_usage = {}
                for partition in psutil.disk_partitions():
                    try:
                        usage = psutil.disk_usage(partition.mountpoint)
                        disk_usage[partition.mountpoint] = {
                            "total": usage.total,
                            "used": usage.used,
                            "free": usage.free,
                            "percent": (usage.used / usage.total) * 100
                        }
                    except PermissionError:
                        continue
                
                # Network I/O
                network = psutil.net_io_counters()
                
                # Process information
                process_info = []
                for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
                    if 'truststram' in proc.info['name'].lower():
                        process_info.append(proc.info)
                
                resource_data = {
                    "timestamp": timestamp,
                    "cpu": {
                        "overall": cpu_percent,
                        "per_core": cpu_per_core,
                        "load_average": psutil.getloadavg()
                    },
                    "memory": {
                        "total": memory.total,
                        "available": memory.available,
                        "percent": memory.percent,
                        "used": memory.used,
                        "free": memory.free,
                        "swap_total": swap.total,
                        "swap_used": swap.used,
                        "swap_percent": swap.percent
                    },
                    "disk": disk_usage,
                    "network": {
                        "bytes_sent": network.bytes_sent,
                        "bytes_recv": network.bytes_recv,
                        "packets_sent": network.packets_sent,
                        "packets_recv": network.packets_recv
                    },
                    "processes": process_info
                }
                
                self.data.append(resource_data)
                
                # Keep only last 24 hours of data (assuming 30s intervals)
                if len(self.data) > 2880:
                    self.data.pop(0)
                
                time.sleep(interval)
        
        self.monitor_thread = threading.Thread(target=monitor_loop)
        self.monitor_thread.daemon = True
        self.monitor_thread.start()
    
    def stop_monitoring(self):
        """Stop resource monitoring."""
        self.monitoring = False
    
    def get_current_usage(self):
        """Get current resource usage."""
        if self.data:
            return self.data[-1]
        return None
    
    def get_usage_history(self, hours=1):
        """Get resource usage history."""
        cutoff = datetime.now() - timedelta(hours=hours)
        return [data for data in self.data if data["timestamp"] > cutoff]
```

## Security Monitoring

### Security Event Monitoring
```python
import re
import json
from datetime import datetime, timedelta
from collections import defaultdict

class SecurityMonitor:
    def __init__(self):
        self.failed_logins = defaultdict(list)
        self.suspicious_activities = []
        self.blocked_ips = set()
        
    def monitor_login_attempts(self, log_line):
        """Monitor login attempts for suspicious activity."""
        # Parse authentication logs
        patterns = {
            'failed_login': r'authentication failed for user (\w+) from (\d+\.\d+\.\d+\.\d+)',
            'successful_login': r'authentication successful for user (\w+) from (\d+\.\d+\.\d+\.\d+)',
            'brute_force': r'multiple failed attempts from (\d+\.\d+\.\d+\.\d+)'
        }
        
        for event_type, pattern in patterns.items():
            match = re.search(pattern, log_line)
            if match:
                self.handle_security_event(event_type, match.groups(), log_line)
    
    def handle_security_event(self, event_type, groups, log_line):
        """Handle different types of security events."""
        timestamp = datetime.now()
        
        if event_type == 'failed_login':
            username, ip_address = groups
            self.failed_logins[ip_address].append({
                'username': username,
                'timestamp': timestamp
            })
            
            # Check for brute force
            recent_failures = [
                attempt for attempt in self.failed_logins[ip_address]
                if timestamp - attempt['timestamp'] < timedelta(minutes=15)
            ]
            
            if len(recent_failures) >= 5:
                self.trigger_brute_force_alert(ip_address, recent_failures)
        
        elif event_type == 'brute_force':
            ip_address = groups[0]
            self.block_ip(ip_address, "Brute force attack detected")
    
    def trigger_brute_force_alert(self, ip_address, attempts):
        """Trigger brute force attack alert."""
        alert = {
            "type": "brute_force_attack",
            "ip_address": ip_address,
            "attempt_count": len(attempts),
            "usernames": list(set(attempt['username'] for attempt in attempts)),
            "timestamp": datetime.now(),
            "severity": "high"
        }
        
        self.send_security_alert(alert)
        self.block_ip(ip_address, "Brute force attack")
    
    def block_ip(self, ip_address, reason):
        """Block suspicious IP address."""
        self.blocked_ips.add(ip_address)
        
        # Add firewall rule
        import subprocess
        subprocess.run([
            'sudo', 'ufw', 'insert', '1', 'deny', 'from', ip_address
        ], check=True)
        
        # Log the action
        print(f"Blocked IP {ip_address}: {reason}")
    
    def send_security_alert(self, alert):
        """Send security alert to monitoring system."""
        # Send to SIEM system, Slack, email, etc.
        alert_json = json.dumps(alert, default=str)
        print(f"SECURITY ALERT: {alert_json}")

# Real-time log monitoring
import subprocess
import threading

class LogMonitor:
    def __init__(self, log_file, security_monitor):
        self.log_file = log_file
        self.security_monitor = security_monitor
        self.monitoring = False
    
    def start_monitoring(self):
        """Start monitoring log file."""
        self.monitoring = True
        
        def monitor_loop():
            proc = subprocess.Popen([
                'tail', '-F', self.log_file
            ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            while self.monitoring:
                line = proc.stdout.readline()
                if line:
                    self.security_monitor.monitor_login_attempts(line.decode())
        
        self.monitor_thread = threading.Thread(target=monitor_loop)
        self.monitor_thread.daemon = True
        self.monitor_thread.start()
    
    def stop_monitoring(self):
        """Stop monitoring."""
        self.monitoring = False

# Usage
security_monitor = SecurityMonitor()
log_monitor = LogMonitor('/var/log/truststram/auth.log', security_monitor)
log_monitor.start_monitoring()
```

## Database Monitoring

### PostgreSQL Monitoring
```sql
-- Create monitoring views and functions

-- Active connections
CREATE VIEW active_connections AS
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    state_change,
    query
FROM pg_stat_activity 
WHERE state != 'idle';

-- Long running queries
CREATE VIEW long_running_queries AS
SELECT 
    pid,
    now() - query_start AS duration,
    usename,
    query
FROM pg_stat_activity 
WHERE state != 'idle' 
AND now() - query_start > interval '5 minutes';

-- Database size monitoring
CREATE VIEW database_sizes AS
SELECT 
    datname,
    pg_size_pretty(pg_database_size(datname)) AS size,
    pg_database_size(datname) AS size_bytes
FROM pg_database
ORDER BY pg_database_size(datname) DESC;

-- Table sizes
CREATE VIEW table_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage
CREATE VIEW index_usage AS
SELECT 
    t.schemaname,
    t.tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes i
JOIN pg_stat_user_tables t ON i.relid = t.relid
ORDER BY idx_scan DESC;
```

### Database Performance Monitoring
```python
import psycopg2
import json
from datetime import datetime

class DatabaseMonitor:
    def __init__(self, database_url):
        self.database_url = database_url
    
    def get_connection_stats(self):
        """Get database connection statistics."""
        with psycopg2.connect(self.database_url) as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT 
                    count(*) as total_connections,
                    count(*) FILTER (WHERE state = 'active') as active_connections,
                    count(*) FILTER (WHERE state = 'idle') as idle_connections,
                    count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
                FROM pg_stat_activity
                WHERE datname = current_database()
            """)
            
            result = cursor.fetchone()
            return {
                "total_connections": result[0],
                "active_connections": result[1],
                "idle_connections": result[2],
                "idle_in_transaction": result[3]
            }
    
    def get_query_performance(self):
        """Get query performance statistics."""
        with psycopg2.connect(self.database_url) as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT 
                    query,
                    calls,
                    total_time,
                    mean_time,
                    min_time,
                    max_time
                FROM pg_stat_statements
                ORDER BY total_time DESC
                LIMIT 10
            """)
            
            return [
                {
                    "query": row[0][:100] + "..." if len(row[0]) > 100 else row[0],
                    "calls": row[1],
                    "total_time": row[2],
                    "mean_time": row[3],
                    "min_time": row[4],
                    "max_time": row[5]
                }
                for row in cursor.fetchall()
            ]
    
    def get_lock_information(self):
        """Get database lock information."""
        with psycopg2.connect(self.database_url) as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT 
                    l.locktype,
                    l.mode,
                    l.granted,
                    a.query,
                    a.query_start
                FROM pg_locks l
                JOIN pg_stat_activity a ON l.pid = a.pid
                WHERE a.datname = current_database()
                AND NOT l.granted
            """)
            
            return [
                {
                    "locktype": row[0],
                    "mode": row[1],
                    "granted": row[2],
                    "query": row[3][:100] + "..." if len(row[3]) > 100 else row[3],
                    "query_start": row[4]
                }
                for row in cursor.fetchall()
            ]
    
    def get_database_health(self):
        """Get overall database health."""
        return {
            "timestamp": datetime.now(),
            "connections": self.get_connection_stats(),
            "query_performance": self.get_query_performance(),
            "locks": self.get_lock_information()
        }

# Automated monitoring script
db_monitor = DatabaseMonitor(DATABASE_URL)

def monitor_database():
    """Monitor database and send alerts if needed."""
    health = db_monitor.get_database_health()
    
    # Check for issues
    if health["connections"]["active_connections"] > 50:
        send_alert("High number of active database connections", health)
    
    if health["locks"]:
        send_alert("Database locks detected", health["locks"])
    
    # Log health data
    print(json.dumps(health, default=str, indent=2))

# Schedule monitoring
import schedule
schedule.every(5).minutes.do(monitor_database)
```

## Infrastructure Monitoring

### Kubernetes Monitoring
```yaml
# kube-prometheus-stack values.yaml
prometheus:
  prometheusSpec:
    retention: 15d
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: fast-ssd
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 50Gi

grafana:
  persistence:
    enabled: true
    size: 10Gi
  
  dashboardProviders:
    dashboardproviders.yaml:
      apiVersion: 1
      providers:
      - name: 'truststram'
        folder: 'TrustStram'
        type: file
        disableDeletion: false
        editable: true
        options:
          path: /var/lib/grafana/dashboards/truststram

alertmanager:
  config:
    global:
      slack_api_url: 'YOUR_SLACK_WEBHOOK_URL'
    
    route:
      group_by: ['alertname', 'cluster', 'service']
      group_wait: 10s
      group_interval: 10s
      repeat_interval: 1h
      receiver: 'web.hook'
    
    receivers:
    - name: 'web.hook'
      slack_configs:
      - channel: '#alerts'
        title: 'TrustStram Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
```

### Container Monitoring
```bash
# Install cAdvisor for container monitoring
docker run \
  --volume=/:/rootfs:ro \
  --volume=/var/run:/var/run:rw \
  --volume=/sys:/sys:ro \
  --volume=/var/lib/docker/:/var/lib/docker:ro \
  --publish=8080:8080 \
  --detach=true \
  --name=cadvisor \
  gcr.io/cadvisor/cadvisor:latest

# Docker stats monitoring script
#!/bin/bash
# monitor_containers.sh

echo "Monitoring TrustStram containers..."

while true; do
    echo "=== $(date) ==="
    
    # Get container stats
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" \
        $(docker ps --filter "name=truststram" --format "{{.Names}}")
    
    echo ""
    
    # Check container health
    for container in $(docker ps --filter "name=truststram" --format "{{.Names}}"); do
        health=$(docker inspect --format='{{.State.Health.Status}}' $container 2>/dev/null || echo "no-health-check")
        echo "Container $container health: $health"
    done
    
    echo "================================"
    sleep 60
done
```

## Alerting and Notifications

### Alert Rules Configuration
```yaml
# truststram_alerts.yml
groups:
- name: truststram.rules
  rules:
  
  # High CPU usage
  - alert: HighCPUUsage
    expr: (100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)) > 80
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High CPU usage detected"
      description: "CPU usage is above 80% for more than 5 minutes"
  
  # High memory usage
  - alert: HighMemoryUsage
    expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100 > 85
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High memory usage detected"
      description: "Memory usage is above 85% for more than 5 minutes"
  
  # Application down
  - alert: TrustStramDown
    expr: up{job="truststram-api"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "TrustStram API is down"
      description: "TrustStram API has been down for more than 1 minute"
  
  # High response time
  - alert: HighResponseTime
    expr: histogram_quantile(0.95, rate(truststram_request_duration_seconds_bucket[5m])) > 2
    for: 3m
    labels:
      severity: warning
    annotations:
      summary: "High response time detected"
      description: "95th percentile response time is above 2 seconds"
  
  # High error rate
  - alert: HighErrorRate
    expr: rate(truststram_requests_total{status_code=~"5.."}[5m]) / rate(truststram_requests_total[5m]) > 0.1
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is above 10% for more than 2 minutes"
  
  # Database connection issues
  - alert: DatabaseConnectionHigh
    expr: pg_stat_database_numbackends > 80
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High number of database connections"
      description: "Number of database connections is above 80"
  
  # Federated learning issues
  - alert: FederatedLearningDown
    expr: truststram_federated_clients == 0
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "No federated learning clients connected"
      description: "No federated learning clients have been connected for 10 minutes"
```

### Notification Channels
```python
import requests
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart

class NotificationManager:
    def __init__(self):
        self.slack_webhook = "YOUR_SLACK_WEBHOOK_URL"
        self.email_config = {
            "smtp_server": "smtp.gmail.com",
            "smtp_port": 587,
            "username": "alerts@truststram.com",
            "password": "your_password"
        }
    
    def send_slack_alert(self, alert):
        """Send alert to Slack."""
        payload = {
            "text": f"🚨 TrustStram Alert",
            "attachments": [
                {
                    "color": "danger" if alert["severity"] == "critical" else "warning",
                    "fields": [
                        {
                            "title": "Alert",
                            "value": alert["summary"],
                            "short": False
                        },
                        {
                            "title": "Description",
                            "value": alert["description"],
                            "short": False
                        },
                        {
                            "title": "Severity",
                            "value": alert["severity"],
                            "short": True
                        },
                        {
                            "title": "Time",
                            "value": alert["timestamp"],
                            "short": True
                        }
                    ]
                }
            ]
        }
        
        response = requests.post(self.slack_webhook, json=payload)
        return response.status_code == 200
    
    def send_email_alert(self, alert, recipients):
        """Send alert via email."""
        msg = MimeMultipart()
        msg['From'] = self.email_config['username']
        msg['To'] = ', '.join(recipients)
        msg['Subject'] = f"TrustStram Alert: {alert['summary']}"
        
        body = f"""
        Alert: {alert['summary']}
        
        Description: {alert['description']}
        
        Severity: {alert['severity']}
        Timestamp: {alert['timestamp']}
        
        Please investigate and take appropriate action.
        
        TrustStram Monitoring System
        """
        
        msg.attach(MimeText(body, 'plain'))
        
        try:
            server = smtplib.SMTP(self.email_config['smtp_server'], self.email_config['smtp_port'])
            server.starttls()
            server.login(self.email_config['username'], self.email_config['password'])
            server.send_message(msg)
            server.quit()
            return True
        except Exception as e:
            print(f"Failed to send email: {e}")
            return False
    
    def send_alert(self, alert):
        """Send alert through all configured channels."""
        success = True
        
        # Send to Slack
        if not self.send_slack_alert(alert):
            success = False
        
        # Send email for critical alerts
        if alert["severity"] == "critical":
            recipients = ["admin@truststram.com", "devops@truststram.com"]
            if not self.send_email_alert(alert, recipients):
                success = False
        
        return success
```

## Log Management

### Centralized Logging with ELK Stack
```yaml
# docker-compose.yml for ELK stack
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms1g -Xmx1g"
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data

  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    ports:
      - "5000:5000"
      - "9600:9600"
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf:ro
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

volumes:
  elasticsearch-data:
```

### Logstash Configuration
```ruby
# logstash.conf
input {
  beats {
    port => 5044
  }
  
  tcp {
    port => 5000
    codec => json
  }
}

filter {
  if [service] == "truststram" {
    grok {
      match => { "message" => "%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} %{DATA:logger} - %{GREEDYDATA:message}" }
    }
    
    date {
      match => [ "timestamp", "ISO8601" ]
    }
    
    if [level] == "ERROR" {
      mutate {
        add_tag => [ "error" ]
      }
    }
  }
  
  if [type] == "nginx" {
    grok {
      match => { "message" => "%{NGINXACCESS}" }
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "truststram-%{+YYYY.MM.dd}"
  }
  
  if "error" in [tags] {
    email {
      to => "alerts@truststram.com"
      subject => "TrustStram Error Alert"
      body => "Error detected: %{message}"
    }
  }
}
```

### Log Rotation and Archival
```bash
#!/bin/bash
# log_rotation.sh

# TrustStram log rotation configuration
cat > /etc/logrotate.d/truststram << 'EOF'
/var/log/truststram/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 truststram truststram
    postrotate
        systemctl reload truststram
    endscript
}
EOF

# Archive old logs to S3
#!/bin/bash
# archive_logs.sh

LOG_DIR="/var/log/truststram"
ARCHIVE_DIR="/tmp/log_archive"
S3_BUCKET="truststram-log-archive"

# Create archive directory
mkdir -p $ARCHIVE_DIR

# Find logs older than 7 days
find $LOG_DIR -name "*.log.gz" -mtime +7 -exec mv {} $ARCHIVE_DIR/ \;

# Upload to S3
if [ "$(ls -A $ARCHIVE_DIR)" ]; then
    aws s3 sync $ARCHIVE_DIR s3://$S3_BUCKET/$(date +%Y/%m/%d)/
    rm -rf $ARCHIVE_DIR/*
fi
```

## Maintenance Procedures

### Routine Maintenance Tasks
```bash
#!/bin/bash
# daily_maintenance.sh

echo "Starting daily maintenance tasks..."

# 1. Database maintenance
echo "Running database maintenance..."
sudo -u postgres psql truststram -c "VACUUM ANALYZE;"
sudo -u postgres psql truststram -c "REINDEX DATABASE truststram;"

# 2. Clear temporary files
echo "Cleaning temporary files..."
find /tmp -name "truststram_*" -mtime +1 -delete
find /var/tmp -name "*.tmp" -mtime +7 -delete

# 3. Log cleanup
echo "Cleaning old logs..."
find /var/log/truststram -name "*.log" -mtime +30 -delete

# 4. Check disk usage
echo "Checking disk usage..."
df -h | awk '$5 > 80 {print "Warning: " $1 " is " $5 " full"}'

# 5. Update security signatures
echo "Updating security signatures..."
freshclam --quiet

# 6. Check certificate expiration
echo "Checking certificate expiration..."
openssl x509 -in /etc/ssl/certs/truststram.crt -noout -dates

# 7. Backup configuration
echo "Backing up configuration..."
tar -czf /backup/config_$(date +%Y%m%d).tar.gz /etc/truststram/

echo "Daily maintenance completed."
```

### Weekly Maintenance Tasks
```bash
#!/bin/bash
# weekly_maintenance.sh

echo "Starting weekly maintenance tasks..."

# 1. System updates
echo "Checking for system updates..."
apt update && apt list --upgradable

# 2. Security scan
echo "Running security scan..."
lynis audit system --quiet

# 3. Performance analysis
echo "Analyzing performance..."
iostat -x 1 10 > /tmp/iostat_report.txt
sar -u 1 60 > /tmp/cpu_report.txt

# 4. Database statistics update
echo "Updating database statistics..."
sudo -u postgres psql truststram -c "ANALYZE;"

# 5. Certificate renewal check
echo "Checking certificate renewal..."
certbot renew --dry-run

# 6. Backup verification
echo "Verifying recent backups..."
find /backup -name "*.tar.gz" -mtime -7 -exec tar -tzf {} \; > /dev/null

echo "Weekly maintenance completed."
```

### Emergency Maintenance Procedures
```bash
#!/bin/bash
# emergency_procedures.sh

function emergency_stop() {
    echo "Emergency stop initiated..."
    
    # Stop TrustStram services
    systemctl stop truststram
    systemctl stop truststram-worker
    
    # Stop load balancer traffic
    nginx -s stop
    
    # Notify monitoring systems
    curl -X POST $MONITORING_WEBHOOK -d '{"status": "emergency_stop", "timestamp": "'$(date)'"}'
    
    echo "Emergency stop completed."
}

function emergency_restart() {
    echo "Emergency restart initiated..."
    
    # Create backup
    pg_dump truststram > /backup/emergency_backup_$(date +%Y%m%d_%H%M%S).sql
    
    # Restart services in order
    systemctl restart postgresql
    systemctl restart redis
    systemctl restart truststram
    systemctl restart truststram-worker
    systemctl restart nginx
    
    # Verify services
    sleep 30
    curl -f http://localhost:8080/health || echo "Warning: Health check failed"
    
    echo "Emergency restart completed."
}

function rollback_deployment() {
    echo "Rolling back deployment..."
    
    # Stop current version
    systemctl stop truststram
    
    # Restore previous version
    cp /backup/truststram-previous /opt/truststram/bin/truststram
    
    # Restore database if needed
    # psql truststram < /backup/pre_deployment_backup.sql
    
    # Start services
    systemctl start truststram
    
    echo "Rollback completed."
}

# Usage based on first argument
case "$1" in
    "stop")
        emergency_stop
        ;;
    "restart")
        emergency_restart
        ;;
    "rollback")
        rollback_deployment
        ;;
    *)
        echo "Usage: $0 {stop|restart|rollback}"
        exit 1
        ;;
esac
```

## Preventive Maintenance

### Automated Health Checks
```python
import schedule
import time
import requests
import psycopg2
import redis

class PreventiveMaintenance:
    def __init__(self):
        self.health_checks = {
            "api": self.check_api_health,
            "database": self.check_database_health,
            "redis": self.check_redis_health,
            "disk_space": self.check_disk_space,
            "certificates": self.check_certificates
        }
    
    def check_api_health(self):
        """Check API endpoint health."""
        try:
            response = requests.get("http://localhost:8080/health", timeout=10)
            return response.status_code == 200
        except:
            return False
    
    def check_database_health(self):
        """Check database health."""
        try:
            conn = psycopg2.connect(DATABASE_URL)
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.close()
            conn.close()
            return True
        except:
            return False
    
    def check_redis_health(self):
        """Check Redis health."""
        try:
            r = redis.Redis.from_url(REDIS_URL)
            return r.ping()
        except:
            return False
    
    def check_disk_space(self):
        """Check disk space usage."""
        import shutil
        total, used, free = shutil.disk_usage("/")
        usage_percent = (used / total) * 100
        return usage_percent < 85  # Alert if over 85%
    
    def check_certificates(self):
        """Check SSL certificate expiration."""
        import ssl
        import socket
        from datetime import datetime, timedelta
        
        try:
            context = ssl.create_default_context()
            with socket.create_connection(("api.truststram.com", 443)) as sock:
                with context.wrap_socket(sock, server_hostname="api.truststram.com") as ssock:
                    cert = ssock.getpeercert()
                    expiry_date = datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
                    days_until_expiry = (expiry_date - datetime.now()).days
                    return days_until_expiry > 30  # Alert if expiring within 30 days
        except:
            return False
    
    def run_health_checks(self):
        """Run all health checks."""
        results = {}
        for check_name, check_func in self.health_checks.items():
            results[check_name] = check_func()
            if not results[check_name]:
                self.send_alert(f"{check_name} health check failed")
        
        return results
    
    def send_alert(self, message):
        """Send maintenance alert."""
        print(f"MAINTENANCE ALERT: {message}")
        # Send to monitoring system

# Schedule preventive maintenance
maintenance = PreventiveMaintenance()

# Run health checks every 5 minutes
schedule.every(5).minutes.do(maintenance.run_health_checks)

# Run daily maintenance
schedule.every().day.at("02:00").do(lambda: subprocess.run(["/opt/truststram/scripts/daily_maintenance.sh"]))

# Run weekly maintenance
schedule.every().sunday.at("03:00").do(lambda: subprocess.run(["/opt/truststram/scripts/weekly_maintenance.sh"]))

while True:
    schedule.run_pending()
    time.sleep(60)
```

---

## Support and Documentation

- **Monitoring Support**: monitoring@truststram.com
- **Operations Team**: ops@truststram.com
- **Emergency Hotline**: +1-800-TRUSTSTRAM
- **Documentation**: https://docs.truststram.com/monitoring
- **Runbooks**: https://runbooks.truststram.com

For critical issues or emergencies, contact the 24/7 Operations Center immediately.