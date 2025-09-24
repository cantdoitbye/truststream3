# TrustStram v4.4 Performance Tuning Guide

## Table of Contents
1. [Performance Overview](#performance-overview)
2. [System-Level Optimization](#system-level-optimization)
3. [Database Performance Tuning](#database-performance-tuning)
4. [Application Performance Optimization](#application-performance-optimization)
5. [Network Performance](#network-performance)
6. [Storage Optimization](#storage-optimization)
7. [Memory Management](#memory-management)
8. [CPU Optimization](#cpu-optimization)
9. [Model Training Performance](#model-training-performance)
10. [Federated Learning Optimization](#federated-learning-optimization)
11. [Multi-Cloud Performance](#multi-cloud-performance)
12. [Monitoring and Profiling](#monitoring-and-profiling)
13. [Load Testing and Benchmarking](#load-testing-and-benchmarking)
14. [Troubleshooting Performance Issues](#troubleshooting-performance-issues)

## Performance Overview

TrustStram v4.4 performance optimization focuses on maximizing throughput, minimizing latency, and ensuring efficient resource utilization across all system components.

### Performance Targets
- **API Response Time**: < 100ms for 95% of requests
- **Model Training**: Optimize training time by 40-60%
- **Inference Latency**: < 50ms for real-time predictions
- **Throughput**: Support 10,000+ concurrent users
- **Resource Utilization**: CPU < 80%, Memory < 85%
- **Federated Learning**: Minimize communication overhead

### Performance Architecture
```
┌─────────────────────────────────────────────────────┐
│                Performance Stack                    │
├─────────────────────────────────────────────────────┤
│ Load Balancer (Nginx/HAProxy)                      │
├─────────────────────────────────────────────────────┤
│ Application Layer (TrustStram API)                  │
│ ├── Connection Pooling                              │
│ ├── Caching Layer (Redis)                          │
│ ├── Async Processing                                │
│ └── Resource Management                             │
├─────────────────────────────────────────────────────┤
│ Database Layer (PostgreSQL)                        │
│ ├── Query Optimization                              │
│ ├── Index Strategy                                  │
│ ├── Connection Pooling                              │
│ └── Partitioning                                    │
├─────────────────────────────────────────────────────┤
│ Infrastructure Layer                                │
│ ├── CPU Optimization                                │
│ ├── Memory Management                               │
│ ├── Storage I/O                                     │
│ └── Network Tuning                                  │
└─────────────────────────────────────────────────────┘
```

## System-Level Optimization

### Kernel Parameter Tuning
```bash
#!/bin/bash
# system_optimization.sh

# Network optimizations
cat >> /etc/sysctl.conf << 'EOF'
# Network Performance Tuning
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.core.rmem_default = 262144
net.core.wmem_default = 262144
net.core.netdev_max_backlog = 5000
net.core.somaxconn = 65535

# TCP optimizations
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.ipv4.tcp_congestion_control = bbr
net.ipv4.tcp_slow_start_after_idle = 0
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 600
net.ipv4.tcp_keepalive_probes = 3
net.ipv4.tcp_keepalive_intvl = 90

# File system optimizations
fs.file-max = 2097152
fs.inotify.max_user_watches = 524288
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
vm.overcommit_memory = 1

# Security optimizations that don't impact performance
net.ipv4.conf.default.rp_filter = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
EOF

# Apply settings
sysctl -p

# CPU governor optimization
echo performance > /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Disable transparent huge pages (can cause latency spikes)
echo never > /sys/kernel/mm/transparent_hugepage/enabled
echo never > /sys/kernel/mm/transparent_hugepage/defrag

# I/O scheduler optimization for SSDs
echo noop > /sys/block/nvme0n1/queue/scheduler

# IRQ affinity optimization
/opt/truststram/scripts/optimize_irq_affinity.sh
```

### CPU Affinity and NUMA Optimization
```bash
#!/bin/bash
# cpu_optimization.sh

# Get NUMA topology
numactl --hardware

# Bind TrustStram processes to specific NUMA nodes
NUMA_NODE=0
CPU_CORES="0-7"  # First 8 cores

# Update systemd service for NUMA binding
cat > /etc/systemd/system/truststram.service.d/numa.conf << EOF
[Service]
ExecStart=
ExecStart=numactl --cpunodebind=$NUMA_NODE --membind=$NUMA_NODE /opt/truststram/bin/truststram
CPUAffinity=$CPU_CORES
EOF

# Worker processes on different NUMA node
WORKER_NUMA_NODE=1
WORKER_CPU_CORES="8-15"

cat > /etc/systemd/system/truststram-worker.service.d/numa.conf << EOF
[Service]
ExecStart=
ExecStart=numactl --cpunodebind=$WORKER_NUMA_NODE --membind=$WORKER_NUMA_NODE /opt/truststram/bin/truststram-worker
CPUAffinity=$WORKER_CPU_CORES
EOF

systemctl daemon-reload
systemctl restart truststram truststram-worker

# Verify CPU affinity
ps -eo pid,psr,comm | grep truststram
```

### Memory Optimization
```bash
#!/bin/bash
# memory_optimization.sh

# Configure huge pages for large memory allocations
HUGEPAGE_SIZE=2048  # 2MB pages
HUGEPAGE_COUNT=1024  # 2GB total

echo $HUGEPAGE_COUNT > /sys/kernel/mm/hugepages/hugepages-${HUGEPAGE_SIZE}kB/nr_hugepages

# Add to boot parameters
sed -i 's/GRUB_CMDLINE_LINUX="/GRUB_CMDLINE_LINUX="hugepages=1024 /' /etc/default/grub
update-grub

# Configure memory overcommit
echo 1 > /proc/sys/vm/overcommit_memory
echo 80 > /proc/sys/vm/overcommit_ratio

# Memory compaction settings
echo 1 > /sys/kernel/mm/transparent_hugepage/khugepaged/defrag
echo 0 > /proc/sys/vm/compaction_proactiveness
```

## Database Performance Tuning

### PostgreSQL Configuration
```sql
-- postgresql.conf optimizations
-- Copy to /etc/postgresql/15/main/postgresql.conf

-- Memory Settings
shared_buffers = '8GB'                    -- 25% of total RAM for dedicated server
effective_cache_size = '24GB'             -- 75% of total RAM
work_mem = '256MB'                        -- Per-operation memory
maintenance_work_mem = '2GB'              -- For VACUUM, CREATE INDEX, etc.
autovacuum_work_mem = '2GB'               -- For autovacuum workers

-- Checkpoint Settings
wal_buffers = '64MB'
checkpoint_completion_target = 0.9
checkpoint_timeout = '10min'
max_wal_size = '4GB'
min_wal_size = '1GB'

-- Connection Settings
max_connections = 200
superuser_reserved_connections = 3

-- Query Planner Settings
random_page_cost = 1.1                   -- For SSD storage
effective_io_concurrency = 200           -- For SSD storage
max_worker_processes = 16
max_parallel_workers_per_gather = 4
max_parallel_workers = 16
max_parallel_maintenance_workers = 4

-- Logging Settings for Performance Analysis
log_min_duration_statement = 1000        -- Log queries > 1 second
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
log_temp_files = 10MB

-- Autovacuum Settings
autovacuum = on
autovacuum_max_workers = 6
autovacuum_naptime = 30s
autovacuum_vacuum_threshold = 50
autovacuum_vacuum_scale_factor = 0.1
autovacuum_analyze_threshold = 50
autovacuum_analyze_scale_factor = 0.05

-- Background Writer Settings
bgwriter_delay = 200ms
bgwriter_lru_maxpages = 100
bgwriter_lru_multiplier = 2.0

-- WAL Settings for Performance
wal_level = replica
wal_compression = on
wal_log_hints = on
```

### Database Indexing Strategy
```sql
-- Create performance-optimized indexes

-- Models table indexes
CREATE INDEX CONCURRENTLY idx_models_created_at_btree ON models USING btree(created_at);
CREATE INDEX CONCURRENTLY idx_models_status ON models USING btree(status) WHERE status = 'active';
CREATE INDEX CONCURRENTLY idx_models_type_version ON models USING btree(model_type, version);
CREATE INDEX CONCURRENTLY idx_models_owner_created ON models USING btree(owner_id, created_at DESC);

-- Predictions table indexes (if large)
CREATE INDEX CONCURRENTLY idx_predictions_timestamp ON predictions USING btree(timestamp);
CREATE INDEX CONCURRENTLY idx_predictions_model_timestamp ON predictions USING btree(model_id, timestamp);
CREATE INDEX CONCURRENTLY idx_predictions_user_timestamp ON predictions USING btree(user_id, timestamp);

-- Training data indexes
CREATE INDEX CONCURRENTLY idx_training_data_dataset_id ON training_data USING btree(dataset_id);
CREATE INDEX CONCURRENTLY idx_training_data_created_at ON training_data USING btree(created_at);

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY idx_models_owner_type_status ON models USING btree(owner_id, model_type, status);
CREATE INDEX CONCURRENTLY idx_predictions_model_user_time ON predictions USING btree(model_id, user_id, timestamp DESC);

-- Partial indexes for filtered queries
CREATE INDEX CONCURRENTLY idx_models_active_recent ON models USING btree(created_at) 
    WHERE status = 'active' AND created_at > CURRENT_DATE - INTERVAL '30 days';

-- GIN indexes for JSON columns
CREATE INDEX CONCURRENTLY idx_models_metadata_gin ON models USING gin(metadata);
CREATE INDEX CONCURRENTLY idx_predictions_features_gin ON predictions USING gin(features);

-- Covering indexes to avoid table lookups
CREATE INDEX CONCURRENTLY idx_models_list_covering ON models USING btree(owner_id, created_at DESC) 
    INCLUDE (name, model_type, status, version);
```

### Query Optimization
```sql
-- Analyze query performance
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
SELECT m.id, m.name, m.model_type, p.timestamp, p.result
FROM models m
JOIN predictions p ON m.id = p.model_id
WHERE m.owner_id = $1 
  AND p.timestamp >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY p.timestamp DESC
LIMIT 100;

-- Optimize common queries with CTEs
WITH recent_models AS (
    SELECT id, name, model_type, created_at
    FROM models
    WHERE status = 'active' 
      AND created_at >= CURRENT_DATE - INTERVAL '30 days'
),
model_stats AS (
    SELECT 
        model_id,
        COUNT(*) as prediction_count,
        AVG(CASE WHEN result::float > 0.5 THEN 1 ELSE 0 END) as avg_confidence
    FROM predictions p
    WHERE p.timestamp >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY model_id
)
SELECT 
    rm.id,
    rm.name,
    rm.model_type,
    COALESCE(ms.prediction_count, 0) as recent_predictions,
    COALESCE(ms.avg_confidence, 0) as avg_confidence
FROM recent_models rm
LEFT JOIN model_stats ms ON rm.id = ms.model_id
ORDER BY rm.created_at DESC;

-- Use materialized views for complex aggregations
CREATE MATERIALIZED VIEW mv_model_performance AS
SELECT 
    m.id as model_id,
    m.name,
    m.model_type,
    COUNT(p.id) as total_predictions,
    AVG(p.confidence) as avg_confidence,
    COUNT(p.id) FILTER (WHERE p.timestamp >= CURRENT_DATE - INTERVAL '24 hours') as daily_predictions,
    MAX(p.timestamp) as last_prediction_time
FROM models m
LEFT JOIN predictions p ON m.id = p.model_id
WHERE m.status = 'active'
GROUP BY m.id, m.name, m.model_type;

-- Refresh materialized view
CREATE OR REPLACE FUNCTION refresh_model_performance()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_model_performance;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh
SELECT cron.schedule('refresh-model-performance', '*/15 * * * *', 'SELECT refresh_model_performance();');
```

### Connection Pooling with PgBouncer
```ini
# /etc/pgbouncer/pgbouncer.ini

[databases]
truststram = host=localhost port=5432 dbname=truststram pool_size=25 max_db_connections=100

[pgbouncer]
listen_port = 6432
listen_addr = 127.0.0.1
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Pool settings
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
max_db_connections = 100
max_user_connections = 50

# Performance settings
server_reset_query = DISCARD ALL
server_check_query = SELECT 1
server_check_delay = 30
server_connect_timeout = 15
server_login_retry = 15
client_login_timeout = 60
autodb_idle_timeout = 3600

# Logging
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
stats_period = 60

# Memory settings
pkt_buf = 8192
listen_backlog = 128
sbuf_loopcnt = 5
```

## Application Performance Optimization

### Python Application Tuning
```python
# performance_config.py

import os
import multiprocessing
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import asyncio
import uvloop  # High-performance event loop

# Performance configuration
PERFORMANCE_CONFIG = {
    # Worker processes
    'worker_processes': max(1, multiprocessing.cpu_count() - 1),
    'worker_threads': 4,
    'max_requests': 10000,
    'max_requests_jitter': 1000,
    
    # Connection pooling
    'db_pool_size': 20,
    'db_max_overflow': 30,
    'db_pool_timeout': 30,
    'db_pool_recycle': 3600,
    
    # Redis connection pooling
    'redis_pool_size': 10,
    'redis_max_connections': 50,
    
    # Async settings
    'async_workers': 8,
    'event_loop': 'uvloop',
    
    # Caching
    'cache_ttl': 300,  # 5 minutes
    'cache_max_size': 10000,
    
    # Request handling
    'request_timeout': 30,
    'keepalive_timeout': 65,
    'max_concurrent_requests': 1000,
}

class PerformanceOptimizer:
    def __init__(self):
        self.thread_pool = ThreadPoolExecutor(
            max_workers=PERFORMANCE_CONFIG['worker_threads']
        )
        self.process_pool = ProcessPoolExecutor(
            max_workers=PERFORMANCE_CONFIG['worker_processes']
        )
    
    def optimize_event_loop(self):
        """Configure high-performance event loop."""
        if PERFORMANCE_CONFIG['event_loop'] == 'uvloop':
            uvloop.install()
        
        # Configure asyncio settings
        loop = asyncio.get_event_loop()
        loop.set_debug(False)
        
        # Optimize for high concurrency
        import socket
        socket.setdefaulttimeout(PERFORMANCE_CONFIG['request_timeout'])
    
    def setup_database_optimization(self):
        """Configure database connection optimization."""
        from sqlalchemy import create_engine
        from sqlalchemy.pool import QueuePool
        
        engine = create_engine(
            DATABASE_URL,
            poolclass=QueuePool,
            pool_size=PERFORMANCE_CONFIG['db_pool_size'],
            max_overflow=PERFORMANCE_CONFIG['db_max_overflow'],
            pool_timeout=PERFORMANCE_CONFIG['db_pool_timeout'],
            pool_recycle=PERFORMANCE_CONFIG['db_pool_recycle'],
            pool_pre_ping=True,
            echo=False,  # Disable SQL logging in production
            # Use prepared statements for better performance
            executemany_mode='values_plus_batch',
            # Connection-level optimizations
            connect_args={
                "options": "-c default_transaction_isolation=read_committed"
            }
        )
        
        return engine
    
    def setup_redis_optimization(self):
        """Configure Redis connection optimization."""
        import redis
        from redis.connection import ConnectionPool
        
        pool = ConnectionPool(
            host='localhost',
            port=6379,
            db=0,
            max_connections=PERFORMANCE_CONFIG['redis_max_connections'],
            socket_connect_timeout=5,
            socket_timeout=5,
            socket_keepalive=True,
            socket_keepalive_options={},
            health_check_interval=30,
        )
        
        redis_client = redis.Redis(
            connection_pool=pool,
            decode_responses=True
        )
        
        return redis_client

# Caching decorator for expensive operations
import functools
import time
from typing import Dict, Any

class CacheManager:
    def __init__(self, max_size: int = 10000, ttl: int = 300):
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.max_size = max_size
        self.ttl = ttl
    
    def get(self, key: str) -> Any:
        if key in self.cache:
            entry = self.cache[key]
            if time.time() - entry['timestamp'] < self.ttl:
                return entry['value']
            else:
                del self.cache[key]
        return None
    
    def set(self, key: str, value: Any) -> None:
        if len(self.cache) >= self.max_size:
            # Remove oldest entry
            oldest_key = min(self.cache.keys(), 
                           key=lambda k: self.cache[k]['timestamp'])
            del self.cache[oldest_key]
        
        self.cache[key] = {
            'value': value,
            'timestamp': time.time()
        }

cache_manager = CacheManager()

def cached(ttl: int = 300):
    """Decorator for caching function results."""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Create cache key from function name and arguments
            cache_key = f"{func.__name__}:{hash(str(args) + str(kwargs))}"
            
            # Try to get from cache
            result = cache_manager.get(cache_key)
            if result is not None:
                return result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache_manager.set(cache_key, result)
            
            return result
        return wrapper
    return decorator

# Example usage
@cached(ttl=600)  # Cache for 10 minutes
def get_model_performance(model_id: str):
    """Expensive operation that benefits from caching."""
    # Simulate expensive database query
    time.sleep(1)
    return {"accuracy": 0.95, "latency": 45.2}
```

### FastAPI Optimization
```python
# optimized_fastapi_app.py

from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import asyncio
from concurrent.futures import ThreadPoolExecutor
import multiprocessing

# Create optimized FastAPI app
app = FastAPI(
    title="TrustStram API",
    version="4.4.0",
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url=None if os.getenv("ENVIRONMENT") == "production" else "/redoc"
)

# Add performance middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom middleware for performance monitoring
@app.middleware("http")
async def performance_middleware(request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    
    # Log slow requests
    if process_time > 1.0:
        logger.warning(f"Slow request: {request.url} took {process_time:.2f}s")
    
    return response

# Async endpoint with optimizations
@app.post("/api/v1/predict")
async def predict_async(request: PredictionRequest, background_tasks: BackgroundTasks):
    """Optimized prediction endpoint."""
    
    # Use async database operations
    async with database.transaction():
        model = await get_model_async(request.model_id)
        
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")
    
    # Perform prediction asynchronously
    prediction_task = asyncio.create_task(
        perform_prediction_async(model, request.data)
    )
    
    # Schedule background logging
    background_tasks.add_task(
        log_prediction_async, 
        request.model_id, 
        request.user_id
    )
    
    prediction_result = await prediction_task
    
    return {
        "prediction": prediction_result,
        "model_id": request.model_id,
        "timestamp": datetime.utcnow()
    }

# Batch prediction endpoint for better throughput
@app.post("/api/v1/predict/batch")
async def predict_batch(requests: List[PredictionRequest]):
    """Batch prediction for improved throughput."""
    
    # Group requests by model_id for efficiency
    model_groups = {}
    for req in requests:
        if req.model_id not in model_groups:
            model_groups[req.model_id] = []
        model_groups[req.model_id].append(req)
    
    # Process each model group concurrently
    tasks = []
    for model_id, model_requests in model_groups.items():
        task = asyncio.create_task(
            process_model_batch(model_id, model_requests)
        )
        tasks.append(task)
    
    results = await asyncio.gather(*tasks)
    
    # Flatten results
    all_predictions = []
    for batch_result in results:
        all_predictions.extend(batch_result)
    
    return {"predictions": all_predictions}

async def process_model_batch(model_id: str, requests: List[PredictionRequest]):
    """Process batch of requests for single model."""
    model = await get_model_async(model_id)
    
    # Process in parallel batches
    batch_size = 32
    prediction_tasks = []
    
    for i in range(0, len(requests), batch_size):
        batch = requests[i:i + batch_size]
        task = asyncio.create_task(
            predict_batch_internal(model, [req.data for req in batch])
        )
        prediction_tasks.append(task)
    
    batch_results = await asyncio.gather(*prediction_tasks)
    
    # Combine results
    predictions = []
    for batch_result in batch_results:
        predictions.extend(batch_result)
    
    return predictions

# Optimized server configuration
if __name__ == "__main__":
    # Calculate optimal worker count
    workers = max(1, multiprocessing.cpu_count() - 1)
    
    uvicorn.run(
        "optimized_fastapi_app:app",
        host="0.0.0.0",
        port=8080,
        workers=workers,
        loop="uvloop",
        http="httptools",
        access_log=False,  # Disable in production for performance
        server_header=False,
        date_header=False,
        # Connection limits
        limit_concurrency=1000,
        limit_max_requests=10000,
        # Timeouts
        timeout_keep_alive=65,
        timeout_graceful_shutdown=30,
        # SSL/TLS optimization (if using HTTPS)
        ssl_keyfile="path/to/keyfile",
        ssl_certfile="path/to/certfile",
        ssl_ciphers="ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS",
    )
```

## Network Performance

### Load Balancer Optimization
```nginx
# /etc/nginx/nginx.conf - Optimized configuration

user nginx;
worker_processes auto;
worker_cpu_affinity auto;
worker_rlimit_nofile 65535;

error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
    accept_mutex off;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Logging optimization
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                   '$status $body_bytes_sent "$http_referer" '
                   '"$http_user_agent" "$http_x_forwarded_for" '
                   'rt=$request_time uct="$upstream_connect_time" '
                   'uht="$upstream_header_time" urt="$upstream_response_time"';
    
    # Performance optimizations
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    keepalive_requests 1000;
    client_max_body_size 100M;
    client_body_buffer_size 128k;
    client_header_buffer_size 3m;
    large_client_header_buffers 4 256k;
    
    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/s;
    
    # Connection limiting
    limit_conn_zone $binary_remote_addr zone=addr:10m;
    
    # Upstream configuration
    upstream truststram_backend {
        least_conn;
        keepalive 32;
        keepalive_requests 1000;
        keepalive_timeout 60s;
        
        server 10.0.1.10:8080 max_fails=3 fail_timeout=30s weight=1;
        server 10.0.1.11:8080 max_fails=3 fail_timeout=30s weight=1;
        server 10.0.1.12:8080 max_fails=3 fail_timeout=30s weight=1;
    }
    
    # Cache configuration
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m 
                     max_size=1g inactive=60m use_temp_path=off;
    
    server {
        listen 443 ssl http2;
        server_name api.truststram.com;
        
        # SSL optimization
        ssl_certificate /etc/ssl/certs/truststram.crt;
        ssl_certificate_key /etc/ssl/private/truststram.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        ssl_session_tickets off;
        ssl_stapling on;
        ssl_stapling_verify on;
        
        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options DENY always;
        add_header X-Content-Type-Options nosniff always;
        
        # Rate limiting
        limit_req zone=api burst=200 nodelay;
        limit_conn addr 50;
        
        location /api/v1/predict {
            # Caching for GET requests
            proxy_cache api_cache;
            proxy_cache_valid 200 5m;
            proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
            proxy_cache_background_update on;
            proxy_cache_lock on;
            
            proxy_pass http://truststram_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            # Timeouts
            proxy_connect_timeout 5s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
            
            # Buffering
            proxy_buffering on;
            proxy_buffer_size 4k;
            proxy_buffers 8 4k;
            proxy_busy_buffers_size 8k;
        }
        
        location /auth {
            limit_req zone=auth burst=10 nodelay;
            
            proxy_pass http://truststram_backend;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
            
            # No caching for auth endpoints
            proxy_cache off;
            add_header Cache-Control "no-store, no-cache, must-revalidate";
        }
        
        location /health {
            access_log off;
            proxy_pass http://truststram_backend;
            proxy_connect_timeout 1s;
            proxy_send_timeout 1s;
            proxy_read_timeout 1s;
        }
    }
}
```

### TCP/Network Optimization
```bash
#!/bin/bash
# network_optimization.sh

# Network interface optimization
INTERFACE="eth0"

# Set ring buffer sizes
ethtool -G $INTERFACE rx 4096 tx 4096

# Enable network features
ethtool -K $INTERFACE gso on
ethtool -K $INTERFACE tso on
ethtool -K $INTERFACE lro on
ethtool -K $INTERFACE gro on

# Interrupt coalescing for high throughput
ethtool -C $INTERFACE adaptive-rx on adaptive-tx on \
    rx-usecs 50 tx-usecs 50 \
    rx-frames 32 tx-frames 32

# Set CPU affinity for network interrupts
/opt/truststram/scripts/irq_affinity.sh $INTERFACE

# Configure network queues
echo 4 > /sys/class/net/$INTERFACE/queues/rx-0/rps_cpus
echo 4 > /sys/class/net/$INTERFACE/queues/rx-1/rps_cpus

# Optimize socket buffer sizes
echo 16777216 > /proc/sys/net/core/rmem_max
echo 16777216 > /proc/sys/net/core/wmem_max
echo 16777216 > /proc/sys/net/core/rmem_default
echo 16777216 > /proc/sys/net/core/wmem_default
```

## Storage Optimization

### Disk I/O Optimization
```bash
#!/bin/bash
# storage_optimization.sh

# Identify storage devices
lsblk -d -o name,rota

# Optimize SSD settings
for disk in /dev/nvme0n1 /dev/sda; do
    if [ -b "$disk" ]; then
        # Set I/O scheduler
        echo noop > /sys/block/$(basename $disk)/queue/scheduler
        
        # Optimize queue depth
        echo 32 > /sys/block/$(basename $disk)/queue/nr_requests
        
        # Disable add_random for SSDs
        echo 0 > /sys/block/$(basename $disk)/queue/add_random
        
        # Set read-ahead
        blockdev --setra 4096 $disk
    fi
done

# File system optimizations for ext4
mount -o remount,noatime,nodiratime,barrier=0 /
mount -o remount,noatime,nodiratime,barrier=0 /var/lib/postgresql
mount -o remount,noatime,nodiratime,barrier=0 /var/lib/truststram

# PostgreSQL storage optimization
mkdir -p /etc/systemd/system/postgresql.service.d
cat > /etc/systemd/system/postgresql.service.d/storage.conf << 'EOF'
[Service]
# I/O optimization
IOSchedulingClass=1
IOSchedulingPriority=4
# Memory optimization
MemoryDenyWriteExecute=false
# CPU optimization
CPUSchedulingPolicy=1
CPUSchedulingPriority=50
EOF

systemctl daemon-reload
```

### Database Storage Layout
```sql
-- Optimize PostgreSQL storage layout
-- Move heavily accessed tables to separate tablespaces on different disks

-- Create tablespaces for different workloads
CREATE TABLESPACE ts_models LOCATION '/var/lib/postgresql/ts_models';
CREATE TABLESPACE ts_predictions LOCATION '/var/lib/postgresql/ts_predictions';
CREATE TABLESPACE ts_indexes LOCATION '/var/lib/postgresql/ts_indexes';

-- Move tables to appropriate tablespaces
ALTER TABLE models SET TABLESPACE ts_models;
ALTER TABLE predictions SET TABLESPACE ts_predictions;

-- Move indexes to dedicated tablespace
ALTER INDEX idx_models_created_at SET TABLESPACE ts_indexes;
ALTER INDEX idx_predictions_timestamp SET TABLESPACE ts_indexes;

-- Table partitioning for large tables
CREATE TABLE predictions_partitioned (
    id SERIAL,
    model_id INTEGER NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    features JSONB,
    result FLOAT,
    confidence FLOAT
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions
CREATE TABLE predictions_2024_01 PARTITION OF predictions_partitioned
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01')
    TABLESPACE ts_predictions;

CREATE TABLE predictions_2024_02 PARTITION OF predictions_partitioned
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01')
    TABLESPACE ts_predictions;

-- Auto-create partitions function
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name text, start_date date)
RETURNS void AS $$
DECLARE
    partition_name text;
    end_date date;
BEGIN
    partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
    end_date := start_date + interval '1 month';
    
    EXECUTE format('CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                   partition_name, table_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;
```

## Memory Management

### Application Memory Optimization
```python
# memory_optimization.py

import gc
import sys
import psutil
import tracemalloc
from memory_profiler import profile
import pympler.tracker

class MemoryManager:
    def __init__(self):
        self.memory_tracker = pympler.tracker.SummaryTracker()
        self.gc_threshold = 85  # Trigger GC at 85% memory usage
        self.max_memory_mb = 8192  # 8GB limit
        
    def start_memory_tracking(self):
        """Start memory tracking for debugging."""
        tracemalloc.start()
        
    def get_memory_usage(self):
        """Get current memory usage statistics."""
        process = psutil.Process()
        memory_info = process.memory_info()
        memory_percent = process.memory_percent()
        
        return {
            'rss': memory_info.rss / 1024 / 1024,  # MB
            'vms': memory_info.vms / 1024 / 1024,  # MB
            'percent': memory_percent,
            'available': psutil.virtual_memory().available / 1024 / 1024  # MB
        }
    
    def check_memory_pressure(self):
        """Check if system is under memory pressure."""
        memory_usage = self.get_memory_usage()
        
        if memory_usage['percent'] > self.gc_threshold:
            self.force_garbage_collection()
            return True
        
        return False
    
    def force_garbage_collection(self):
        """Force garbage collection to free memory."""
        # Force collection of all generations
        collected = gc.collect()
        
        # Compact memory if possible
        try:
            import ctypes
            libc = ctypes.CDLL("libc.so.6")
            libc.malloc_trim(0)
        except:
            pass
        
        return collected
    
    def optimize_gc_thresholds(self):
        """Optimize garbage collection thresholds for ML workloads."""
        # Increase thresholds for better performance with large objects
        gc.set_threshold(2000, 20, 20)
        
        # Disable automatic GC for generation 2 (manual control)
        gc.set_threshold(0, 0, 0)
    
    @profile
    def memory_efficient_model_loading(self, model_path):
        """Load model with memory optimization."""
        import joblib
        import numpy as np
        
        # Use memory mapping for large models
        with open(model_path, 'rb') as f:
            model = joblib.load(f, mmap_mode='r')
        
        return model
    
    def batch_processing_with_memory_limit(self, data_iterator, batch_size=1000):
        """Process data in batches with memory monitoring."""
        batch = []
        
        for item in data_iterator:
            batch.append(item)
            
            if len(batch) >= batch_size:
                # Check memory before processing
                if self.check_memory_pressure():
                    # Reduce batch size if under memory pressure
                    batch_size = max(100, batch_size // 2)
                
                yield batch
                batch = []
                
                # Force GC after each batch
                gc.collect()
        
        if batch:
            yield batch

# Memory-efficient data structures
class MemoryEfficientCache:
    """Memory-efficient LRU cache with automatic cleanup."""
    
    def __init__(self, max_size_mb=1024):
        self.max_size_bytes = max_size_mb * 1024 * 1024
        self.cache = {}
        self.access_order = []
        self.current_size = 0
    
    def get(self, key):
        if key in self.cache:
            # Update access order
            self.access_order.remove(key)
            self.access_order.append(key)
            return self.cache[key]['value']
        return None
    
    def set(self, key, value):
        # Calculate size of value
        value_size = sys.getsizeof(value)
        
        # Remove old value if exists
        if key in self.cache:
            self.current_size -= self.cache[key]['size']
            self.access_order.remove(key)
        
        # Check if we need to evict items
        while (self.current_size + value_size > self.max_size_bytes and 
               self.access_order):
            oldest_key = self.access_order.pop(0)
            self.current_size -= self.cache[oldest_key]['size']
            del self.cache[oldest_key]
        
        # Add new value
        self.cache[key] = {'value': value, 'size': value_size}
        self.access_order.append(key)
        self.current_size += value_size
    
    def clear(self):
        self.cache.clear()
        self.access_order.clear()
        self.current_size = 0

# Memory monitoring decorator
def monitor_memory(func):
    """Decorator to monitor memory usage of functions."""
    def wrapper(*args, **kwargs):
        memory_manager = MemoryManager()
        
        # Memory before
        before = memory_manager.get_memory_usage()
        
        try:
            result = func(*args, **kwargs)
            
            # Memory after
            after = memory_manager.get_memory_usage()
            
            # Log memory usage
            memory_delta = after['rss'] - before['rss']
            if memory_delta > 100:  # Log if > 100MB increase
                print(f"Function {func.__name__} used {memory_delta:.1f}MB memory")
            
            return result
            
        finally:
            # Cleanup
            memory_manager.check_memory_pressure()
    
    return wrapper

# Example usage
memory_manager = MemoryManager()
memory_manager.optimize_gc_thresholds()

# Use memory-efficient cache
cache = MemoryEfficientCache(max_size_mb=512)

@monitor_memory
def train_model_memory_efficient(data):
    """Train model with memory optimization."""
    # Process data in batches
    for batch in memory_manager.batch_processing_with_memory_limit(data):
        # Process batch
        process_batch(batch)
        
        # Check memory pressure
        memory_manager.check_memory_pressure()
```

## CPU Optimization

### Multi-Processing and Threading
```python
# cpu_optimization.py

import multiprocessing
import threading
import concurrent.futures
import asyncio
import numpy as np
from numba import jit, prange
import psutil

class CPUOptimizer:
    def __init__(self):
        self.cpu_count = multiprocessing.cpu_count()
        self.optimal_workers = max(1, self.cpu_count - 1)
        self.io_threads = min(32, (self.cpu_count or 1) + 4)
        
    def get_cpu_usage(self):
        """Get current CPU usage statistics."""
        return {
            'percent': psutil.cpu_percent(interval=1),
            'per_cpu': psutil.cpu_percent(interval=1, percpu=True),
            'load_avg': psutil.getloadavg(),
            'context_switches': psutil.cpu_stats().ctx_switches,
            'interrupts': psutil.cpu_stats().interrupts
        }
    
    def optimize_cpu_affinity(self, process_name="truststram"):
        """Set CPU affinity for optimal performance."""
        current_process = psutil.Process()
        
        # Get NUMA topology
        numa_nodes = self.get_numa_topology()
        
        if numa_nodes:
            # Bind to first NUMA node for better memory locality
            cpu_list = numa_nodes[0]['cpus']
            current_process.cpu_affinity(cpu_list)
            print(f"Set CPU affinity to: {cpu_list}")
        
    def get_numa_topology(self):
        """Get NUMA topology information."""
        try:
            import subprocess
            result = subprocess.run(['numactl', '--hardware'], 
                                  capture_output=True, text=True)
            # Parse numactl output (simplified)
            return [{'cpus': list(range(self.cpu_count // 2))}]
        except:
            return None
    
    def parallel_processing_cpu_intensive(self, data_chunks, processing_func):
        """Optimize CPU-intensive tasks with multiprocessing."""
        with concurrent.futures.ProcessPoolExecutor(
            max_workers=self.optimal_workers
        ) as executor:
            futures = [
                executor.submit(processing_func, chunk) 
                for chunk in data_chunks
            ]
            
            results = []
            for future in concurrent.futures.as_completed(futures):
                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    print(f"Processing error: {e}")
            
            return results
    
    def parallel_processing_io_bound(self, tasks, processing_func):
        """Optimize I/O-bound tasks with threading."""
        with concurrent.futures.ThreadPoolExecutor(
            max_workers=self.io_threads
        ) as executor:
            futures = [
                executor.submit(processing_func, task) 
                for task in tasks
            ]
            
            results = []
            for future in concurrent.futures.as_completed(futures):
                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    print(f"I/O error: {e}")
            
            return results

# Numba optimization for numerical computations
@jit(nopython=True, parallel=True)
def optimized_matrix_multiplication(a, b):
    """Optimized matrix multiplication using Numba."""
    rows_a, cols_a = a.shape
    rows_b, cols_b = b.shape
    
    # Preallocate result matrix
    result = np.zeros((rows_a, cols_b), dtype=np.float64)
    
    # Parallel computation
    for i in prange(rows_a):
        for j in range(cols_b):
            for k in range(cols_a):
                result[i, j] += a[i, k] * b[k, j]
    
    return result

@jit(nopython=True, parallel=True)
def optimized_feature_scaling(data):
    """Optimized feature scaling using Numba."""
    n_samples, n_features = data.shape
    scaled_data = np.zeros_like(data)
    
    for j in prange(n_features):
        col = data[:, j]
        min_val = np.min(col)
        max_val = np.max(col)
        range_val = max_val - min_val
        
        if range_val > 0:
            for i in range(n_samples):
                scaled_data[i, j] = (col[i] - min_val) / range_val
        else:
            scaled_data[:, j] = 0.0
    
    return scaled_data

# Vectorized operations for better CPU utilization
class VectorizedOperations:
    """Optimized vectorized operations for ML tasks."""
    
    @staticmethod
    def batch_prediction(model_weights, input_data):
        """Vectorized batch prediction."""
        # Use BLAS-optimized operations
        return np.dot(input_data, model_weights.T)
    
    @staticmethod
    def compute_similarities(embeddings):
        """Compute pairwise similarities efficiently."""
        # Normalize embeddings
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        normalized = embeddings / norms
        
        # Compute cosine similarities using matrix multiplication
        similarities = np.dot(normalized, normalized.T)
        return similarities
    
    @staticmethod
    def parallel_feature_extraction(data_chunks, extractor_func):
        """Parallel feature extraction."""
        cpu_optimizer = CPUOptimizer()
        
        return cpu_optimizer.parallel_processing_cpu_intensive(
            data_chunks, extractor_func
        )

# Async processing for concurrent operations
class AsyncProcessor:
    def __init__(self, max_concurrent=None):
        self.max_concurrent = max_concurrent or multiprocessing.cpu_count()
        self.semaphore = asyncio.Semaphore(self.max_concurrent)
    
    async def process_item_async(self, item, processor_func):
        """Process single item asynchronously."""
        async with self.semaphore:
            # Run CPU-intensive task in thread pool
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None, processor_func, item
            )
            return result
    
    async def process_batch_async(self, items, processor_func):
        """Process batch of items asynchronously."""
        tasks = [
            self.process_item_async(item, processor_func)
            for item in items
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out exceptions
        valid_results = [
            result for result in results 
            if not isinstance(result, Exception)
        ]
        
        return valid_results

# Example usage
cpu_optimizer = CPUOptimizer()
cpu_optimizer.optimize_cpu_affinity()

# CPU-intensive processing
def process_model_training(data_chunk):
    """CPU-intensive model training task."""
    # Simulate heavy computation
    return optimized_matrix_multiplication(data_chunk, data_chunk.T)

# Process large dataset in parallel
large_dataset = [np.random.rand(1000, 100) for _ in range(10)]
results = cpu_optimizer.parallel_processing_cpu_intensive(
    large_dataset, process_model_training
)

# Async processing example
async def main():
    processor = AsyncProcessor(max_concurrent=8)
    items = list(range(100))
    
    def cpu_task(item):
        return item ** 2
    
    results = await processor.process_batch_async(items, cpu_task)
    print(f"Processed {len(results)} items")

# Run async processing
# asyncio.run(main())
```

## Model Training Performance

### Distributed Training Optimization
```python
# distributed_training.py

import torch
import torch.distributed as dist
import torch.multiprocessing as mp
from torch.nn.parallel import DistributedDataParallel as DDP
from torch.utils.data.distributed import DistributedSampler
import numpy as np
import time

class DistributedTrainingOptimizer:
    def __init__(self, world_size, backend='nccl'):
        self.world_size = world_size
        self.backend = backend
        
    def setup(self, rank):
        """Initialize distributed training."""
        os.environ['MASTER_ADDR'] = 'localhost'
        os.environ['MASTER_PORT'] = '12355'
        
        # Initialize process group
        dist.init_process_group(
            backend=self.backend,
            rank=rank,
            world_size=self.world_size
        )
        
        # Set device
        torch.cuda.set_device(rank)
        
    def cleanup(self):
        """Clean up distributed training."""
        dist.destroy_process_group()
    
    def create_distributed_model(self, model, rank):
        """Create distributed model."""
        model = model.to(rank)
        model = DDP(model, device_ids=[rank])
        return model
    
    def create_distributed_dataloader(self, dataset, batch_size, rank):
        """Create distributed data loader."""
        sampler = DistributedSampler(
            dataset,
            num_replicas=self.world_size,
            rank=rank,
            shuffle=True
        )
        
        dataloader = torch.utils.data.DataLoader(
            dataset,
            batch_size=batch_size,
            sampler=sampler,
            num_workers=4,
            pin_memory=True,
            persistent_workers=True
        )
        
        return dataloader, sampler

# Mixed precision training for better performance
class MixedPrecisionTrainer:
    def __init__(self, model, optimizer):
        self.model = model
        self.optimizer = optimizer
        self.scaler = torch.cuda.amp.GradScaler()
        
    def train_step(self, data, target):
        """Optimized training step with mixed precision."""
        self.optimizer.zero_grad()
        
        # Forward pass with autocast
        with torch.cuda.amp.autocast():
            output = self.model(data)
            loss = torch.nn.functional.cross_entropy(output, target)
        
        # Backward pass with gradient scaling
        self.scaler.scale(loss).backward()
        self.scaler.step(self.optimizer)
        self.scaler.update()
        
        return loss.item()

# Data loading optimization
class OptimizedDataLoader:
    def __init__(self, dataset, batch_size, num_workers=None):
        self.dataset = dataset
        self.batch_size = batch_size
        self.num_workers = num_workers or min(8, multiprocessing.cpu_count())
        
    def create_dataloader(self):
        """Create optimized data loader."""
        return torch.utils.data.DataLoader(
            self.dataset,
            batch_size=self.batch_size,
            shuffle=True,
            num_workers=self.num_workers,
            pin_memory=True,
            persistent_workers=True,
            prefetch_factor=2,
            drop_last=True,  # For better batching
        )

# Model optimization techniques
class ModelOptimizer:
    @staticmethod
    def optimize_model_for_inference(model):
        """Optimize model for inference performance."""
        # Set to evaluation mode
        model.eval()
        
        # Fuse operations
        if hasattr(model, 'fuse_modules'):
            model.fuse_modules()
        
        # Apply torch.jit.script for additional optimization
        try:
            scripted_model = torch.jit.script(model)
            return scripted_model
        except:
            return model
    
    @staticmethod
    def quantize_model(model, calibration_data):
        """Quantize model for faster inference."""
        # Dynamic quantization
        quantized_model = torch.quantization.quantize_dynamic(
            model,
            {torch.nn.Linear, torch.nn.Conv2d},
            dtype=torch.qint8
        )
        
        return quantized_model
    
    @staticmethod
    def prune_model(model, pruning_ratio=0.2):
        """Prune model to reduce size and computation."""
        import torch.nn.utils.prune as prune
        
        parameters_to_prune = []
        for module in model.modules():
            if isinstance(module, (torch.nn.Linear, torch.nn.Conv2d)):
                parameters_to_prune.append((module, 'weight'))
        
        # Global magnitude pruning
        prune.global_unstructured(
            parameters_to_prune,
            pruning_method=prune.L1Unstructured,
            amount=pruning_ratio,
        )
        
        # Make pruning permanent
        for module, param in parameters_to_prune:
            prune.remove(module, param)
        
        return model

# Training optimization strategies
class TrainingOptimizer:
    def __init__(self, model):
        self.model = model
        
    def optimize_optimizer(self, learning_rate=0.001):
        """Create optimized optimizer."""
        # Use AdamW with weight decay
        optimizer = torch.optim.AdamW(
            self.model.parameters(),
            lr=learning_rate,
            weight_decay=0.01,
            eps=1e-8,
            amsgrad=True
        )
        
        return optimizer
    
    def create_lr_scheduler(self, optimizer, total_steps):
        """Create learning rate scheduler."""
        scheduler = torch.optim.lr_scheduler.OneCycleLR(
            optimizer,
            max_lr=0.01,
            total_steps=total_steps,
            pct_start=0.1,
            anneal_strategy='cos'
        )
        
        return scheduler
    
    def gradient_accumulation_step(self, loss, accumulation_steps):
        """Implement gradient accumulation."""
        loss = loss / accumulation_steps
        loss.backward()
        
        return loss

# Memory-efficient training
class MemoryEfficientTrainer:
    def __init__(self, model):
        self.model = model
        
    def enable_gradient_checkpointing(self):
        """Enable gradient checkpointing to save memory."""
        if hasattr(self.model, 'gradient_checkpointing_enable'):
            self.model.gradient_checkpointing_enable()
    
    def train_with_memory_optimization(self, dataloader, optimizer, epochs):
        """Train with memory optimization techniques."""
        self.enable_gradient_checkpointing()
        
        for epoch in range(epochs):
            for batch_idx, (data, target) in enumerate(dataloader):
                optimizer.zero_grad()
                
                # Clear cache periodically
                if batch_idx % 100 == 0:
                    torch.cuda.empty_cache()
                
                # Forward pass
                output = self.model(data)
                loss = torch.nn.functional.cross_entropy(output, target)
                
                # Backward pass
                loss.backward()
                
                # Gradient clipping
                torch.nn.utils.clip_grad_norm_(self.model.parameters(), 1.0)
                
                optimizer.step()

# Example usage for distributed training
def train_distributed(rank, world_size):
    """Distributed training function."""
    optimizer = DistributedTrainingOptimizer(world_size)
    optimizer.setup(rank)
    
    # Create model
    model = create_model()
    model = optimizer.create_distributed_model(model, rank)
    
    # Create dataset and dataloader
    dataset = create_dataset()
    dataloader, sampler = optimizer.create_distributed_dataloader(
        dataset, batch_size=32, rank=rank
    )
    
    # Training loop
    for epoch in range(num_epochs):
        sampler.set_epoch(epoch)
        
        for batch_idx, (data, target) in enumerate(dataloader):
            data, target = data.to(rank), target.to(rank)
            
            # Training step
            loss = train_step(model, data, target)
            
            if batch_idx % 100 == 0:
                print(f'Rank {rank}, Epoch {epoch}, Loss: {loss:.4f}')
    
    optimizer.cleanup()

# Launch distributed training
if __name__ == "__main__":
    world_size = torch.cuda.device_count()
    mp.spawn(train_distributed, args=(world_size,), nprocs=world_size, join=True)
```

## Federated Learning Optimization

### Federated Learning Performance
```python
# federated_optimization.py

import asyncio
import threading
import queue
import time
from concurrent.futures import ThreadPoolExecutor
import numpy as np
import torch
import logging

class FederatedLearningOptimizer:
    def __init__(self, max_clients=100, aggregation_timeout=300):
        self.max_clients = max_clients
        self.aggregation_timeout = aggregation_timeout
        self.client_pool = ThreadPoolExecutor(max_workers=20)
        self.update_queue = queue.Queue()
        
    def optimize_client_selection(self, available_clients, selection_ratio=0.3):
        """Optimize client selection for federated learning."""
        num_selected = max(1, int(len(available_clients) * selection_ratio))
        
        # Select clients based on resource availability and network quality
        scored_clients = []
        for client in available_clients:
            score = self.calculate_client_score(client)
            scored_clients.append((score, client))
        
        # Sort by score and select top clients
        scored_clients.sort(reverse=True)
        selected_clients = [client for _, client in scored_clients[:num_selected]]
        
        return selected_clients
    
    def calculate_client_score(self, client):
        """Calculate client selection score."""
        # Factors: computation power, network bandwidth, data quality
        compute_score = client.get('cpu_cores', 1) * client.get('memory_gb', 1)
        network_score = client.get('bandwidth_mbps', 1) / client.get('latency_ms', 100)
        data_score = client.get('data_size', 1)
        
        # Weighted combination
        total_score = (compute_score * 0.4 + network_score * 0.4 + data_score * 0.2)
        return total_score
    
    async def async_model_aggregation(self, client_updates):
        """Asynchronous model aggregation with timeout."""
        aggregation_task = asyncio.create_task(
            self.federated_averaging(client_updates)
        )
        
        try:
            # Wait for aggregation with timeout
            aggregated_model = await asyncio.wait_for(
                aggregation_task, timeout=self.aggregation_timeout
            )
            return aggregated_model
        except asyncio.TimeoutError:
            logging.warning("Model aggregation timed out")
            # Return partial aggregation or last known good model
            return self.get_fallback_model()
    
    async def federated_averaging(self, client_updates):
        """Optimized federated averaging."""
        if not client_updates:
            return None
        
        # Initialize aggregated weights
        aggregated_weights = {}
        total_samples = sum(update['sample_count'] for update in client_updates)
        
        # Weighted averaging
        for layer_name in client_updates[0]['weights'].keys():
            weighted_sum = np.zeros_like(client_updates[0]['weights'][layer_name])
            
            for update in client_updates:
                weight = update['sample_count'] / total_samples
                weighted_sum += weight * update['weights'][layer_name]
            
            aggregated_weights[layer_name] = weighted_sum
        
        return aggregated_weights
    
    def compress_model_update(self, model_weights, compression_ratio=0.1):
        """Compress model updates for efficient transmission."""
        compressed_weights = {}
        
        for layer_name, weights in model_weights.items():
            # Top-k sparsification
            flat_weights = weights.flatten()
            k = int(len(flat_weights) * compression_ratio)
            
            # Get top-k indices and values
            top_k_indices = np.argpartition(np.abs(flat_weights), -k)[-k:]
            top_k_values = flat_weights[top_k_indices]
            
            compressed_weights[layer_name] = {
                'indices': top_k_indices,
                'values': top_k_values,
                'shape': weights.shape
            }
        
        return compressed_weights
    
    def decompress_model_update(self, compressed_weights):
        """Decompress model updates."""
        decompressed_weights = {}
        
        for layer_name, compressed in compressed_weights.items():
            # Reconstruct sparse weights
            flat_weights = np.zeros(np.prod(compressed['shape']))
            flat_weights[compressed['indices']] = compressed['values']
            
            decompressed_weights[layer_name] = flat_weights.reshape(compressed['shape'])
        
        return decompressed_weights

class AsyncFederatedTrainer:
    """Asynchronous federated learning trainer."""
    
    def __init__(self, staleness_threshold=5):
        self.staleness_threshold = staleness_threshold
        self.global_model_version = 0
        self.client_versions = {}
        
    async def async_federated_learning(self, clients):
        """Asynchronous federated learning with staleness control."""
        update_buffer = []
        
        # Process client updates asynchronously
        async def process_client_update(client):
            while True:
                update = await self.receive_client_update(client)
                
                # Check staleness
                staleness = self.global_model_version - update['model_version']
                if staleness <= self.staleness_threshold:
                    update_buffer.append(update)
                    
                    # Trigger aggregation if enough updates
                    if len(update_buffer) >= 5:  # Minimum updates for aggregation
                        await self.aggregate_and_update(update_buffer)
                        update_buffer.clear()
        
        # Start processing for all clients
        tasks = [process_client_update(client) for client in clients]
        await asyncio.gather(*tasks)
    
    async def receive_client_update(self, client):
        """Simulate receiving client update."""
        # Simulate network delay
        await asyncio.sleep(np.random.uniform(0.1, 2.0))
        
        return {
            'client_id': client['id'],
            'weights': self.simulate_training_update(),
            'sample_count': np.random.randint(100, 1000),
            'model_version': self.global_model_version
        }
    
    async def aggregate_and_update(self, updates):
        """Aggregate updates and update global model."""
        optimizer = FederatedLearningOptimizer()
        
        # Perform aggregation
        aggregated_weights = await optimizer.async_model_aggregation(updates)
        
        if aggregated_weights:
            # Update global model
            self.update_global_model(aggregated_weights)
            self.global_model_version += 1
            
            # Broadcast to clients
            await self.broadcast_model_update(aggregated_weights)
    
    def simulate_training_update(self):
        """Simulate client training update."""
        return {
            'layer1': np.random.randn(100, 50),
            'layer2': np.random.randn(50, 10)
        }

# Communication optimization
class CommunicationOptimizer:
    def __init__(self):
        self.compression_enabled = True
        self.quantization_bits = 8
        
    def quantize_weights(self, weights, bits=8):
        """Quantize weights to reduce communication overhead."""
        quantized_weights = {}
        
        for layer_name, weight_tensor in weights.items():
            # Min-max quantization
            min_val = np.min(weight_tensor)
            max_val = np.max(weight_tensor)
            
            # Quantize to specified bits
            scale = (max_val - min_val) / (2**bits - 1)
            quantized = np.round((weight_tensor - min_val) / scale).astype(np.uint8)
            
            quantized_weights[layer_name] = {
                'quantized': quantized,
                'min_val': min_val,
                'scale': scale
            }
        
        return quantized_weights
    
    def dequantize_weights(self, quantized_weights):
        """Dequantize weights."""
        dequantized_weights = {}
        
        for layer_name, quantized in quantized_weights.items():
            dequantized = (quantized['quantized'].astype(np.float32) * 
                          quantized['scale'] + quantized['min_val'])
            dequantized_weights[layer_name] = dequantized
        
        return dequantized_weights
    
    def differential_compression(self, current_weights, previous_weights):
        """Compress using difference from previous weights."""
        differential = {}
        
        for layer_name in current_weights.keys():
            if layer_name in previous_weights:
                diff = current_weights[layer_name] - previous_weights[layer_name]
                differential[layer_name] = diff
            else:
                differential[layer_name] = current_weights[layer_name]
        
        return differential

# Resource-aware federated learning
class ResourceAwareFLOptimizer:
    def __init__(self):
        self.resource_monitor = ResourceMonitor()
        
    def adaptive_batch_size(self, client_resources):
        """Adapt batch size based on client resources."""
        memory_gb = client_resources.get('memory_gb', 4)
        cpu_cores = client_resources.get('cpu_cores', 2)
        
        # Calculate optimal batch size
        base_batch_size = 32
        memory_factor = min(2.0, memory_gb / 4.0)
        cpu_factor = min(2.0, cpu_cores / 2.0)
        
        optimal_batch_size = int(base_batch_size * memory_factor * cpu_factor)
        return min(256, max(8, optimal_batch_size))
    
    def adaptive_local_epochs(self, client_resources, data_size):
        """Adapt number of local epochs based on resources."""
        computation_budget = client_resources.get('computation_budget', 100)
        
        # Calculate optimal local epochs
        base_epochs = 5
        budget_factor = computation_budget / 100.0
        data_factor = min(2.0, data_size / 1000.0)
        
        optimal_epochs = int(base_epochs * budget_factor / data_factor)
        return min(20, max(1, optimal_epochs))

class ResourceMonitor:
    def get_client_resources(self):
        """Monitor client resources."""
        return {
            'cpu_cores': psutil.cpu_count(),
            'memory_gb': psutil.virtual_memory().total / (1024**3),
            'cpu_percent': psutil.cpu_percent(),
            'memory_percent': psutil.virtual_memory().percent,
            'network_bandwidth': self.estimate_bandwidth(),
            'computation_budget': 100  # Placeholder
        }
    
    def estimate_bandwidth(self):
        """Estimate network bandwidth."""
        # Simplified bandwidth estimation
        return np.random.uniform(10, 100)  # Mbps

# Example usage
async def run_optimized_federated_learning():
    """Run optimized federated learning."""
    optimizer = FederatedLearningOptimizer()
    trainer = AsyncFederatedTrainer()
    comm_optimizer = CommunicationOptimizer()
    
    # Simulate clients
    clients = [
        {'id': i, 'cpu_cores': np.random.randint(2, 8), 
         'memory_gb': np.random.randint(4, 16),
         'bandwidth_mbps': np.random.uniform(10, 100)}
        for i in range(20)
    ]
    
    # Select optimal clients
    selected_clients = optimizer.optimize_client_selection(clients)
    print(f"Selected {len(selected_clients)} clients for training")
    
    # Run asynchronous federated learning
    await trainer.async_federated_learning(selected_clients[:5])

# Run the optimization
# asyncio.run(run_optimized_federated_learning())
```

## Multi-Cloud Performance

### Cross-Cloud Optimization
```python
# multi_cloud_optimization.py

import asyncio
import aiohttp
import time
from typing import Dict, List, Tuple
import numpy as np
import concurrent.futures

class MultiCloudOptimizer:
    def __init__(self):
        self.cloud_providers = {
            'aws': {'latency': 0, 'cost': 0, 'reliability': 0},
            'azure': {'latency': 0, 'cost': 0, 'reliability': 0},
            'gcp': {'latency': 0, 'cost': 0, 'reliability': 0}
        }
        self.performance_history = {}
        
    async def measure_cloud_latency(self, provider: str, endpoint: str) -> float:
        """Measure latency to cloud provider."""
        start_time = time.time()
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(endpoint, timeout=5) as response:
                    await response.read()
                    latency = (time.time() - start_time) * 1000  # ms
                    return latency
        except:
            return float('inf')
    
    async def benchmark_cloud_providers(self) -> Dict[str, Dict]:
        """Benchmark all cloud providers."""
        endpoints = {
            'aws': 'https://aws.amazon.com/ping',
            'azure': 'https://azure.microsoft.com/ping',
            'gcp': 'https://cloud.google.com/ping'
        }
        
        tasks = []
        for provider, endpoint in endpoints.items():
            task = self.measure_cloud_latency(provider, endpoint)
            tasks.append((provider, task))
        
        results = {}
        for provider, task in tasks:
            latency = await task
            results[provider] = {'latency': latency}
            
        return results
    
    def select_optimal_cloud(self, workload_type: str) -> str:
        """Select optimal cloud provider based on workload."""
        scores = {}
        
        for provider, metrics in self.cloud_providers.items():
            # Weight factors based on workload type
            if workload_type == 'training':
                # Training prioritizes cost and compute power
                score = (
                    0.4 * (1 / max(metrics['cost'], 0.01)) +
                    0.3 * metrics['reliability'] +
                    0.3 * (1 / max(metrics['latency'], 0.01))
                )
            elif workload_type == 'inference':
                # Inference prioritizes latency and reliability
                score = (
                    0.5 * (1 / max(metrics['latency'], 0.01)) +
                    0.4 * metrics['reliability'] +
                    0.1 * (1 / max(metrics['cost'], 0.01))
                )
            else:
                # Balanced workload
                score = (
                    0.33 * (1 / max(metrics['latency'], 0.01)) +
                    0.33 * metrics['reliability'] +
                    0.34 * (1 / max(metrics['cost'], 0.01))
                )
            
            scores[provider] = score
        
        return max(scores.keys(), key=lambda k: scores[k])
    
    def load_balance_across_clouds(self, requests: List, strategy: str = 'weighted'):
        """Distribute load across multiple cloud providers."""
        if strategy == 'weighted':
            return self._weighted_load_balancing(requests)
        elif strategy == 'round_robin':
            return self._round_robin_balancing(requests)
        elif strategy == 'latency_based':
            return self._latency_based_balancing(requests)
    
    def _weighted_load_balancing(self, requests: List) -> Dict[str, List]:
        """Weighted load balancing based on provider performance."""
        weights = {}
        total_weight = 0
        
        for provider, metrics in self.cloud_providers.items():
            # Calculate weight based on inverse latency and cost
            weight = 1 / (metrics['latency'] + metrics['cost'] + 1)
            weights[provider] = weight
            total_weight += weight
        
        # Normalize weights
        for provider in weights:
            weights[provider] /= total_weight
        
        # Distribute requests
        distribution = {provider: [] for provider in self.cloud_providers}
        
        for i, request in enumerate(requests):
            # Select provider based on cumulative weights
            cumulative_weight = 0
            random_val = np.random.random()
            
            for provider, weight in weights.items():
                cumulative_weight += weight
                if random_val <= cumulative_weight:
                    distribution[provider].append(request)
                    break
        
        return distribution

class CrossCloudDataSync:
    """Optimize data synchronization across clouds."""
    
    def __init__(self):
        self.sync_strategies = {
            'immediate': self.immediate_sync,
            'batch': self.batch_sync,
            'lazy': self.lazy_sync
        }
    
    async def immediate_sync(self, data, target_clouds):
        """Immediate synchronization to all target clouds."""
        sync_tasks = []
        
        for cloud in target_clouds:
            task = self.upload_to_cloud(data, cloud)
            sync_tasks.append(task)
        
        results = await asyncio.gather(*sync_tasks, return_exceptions=True)
        return results
    
    async def batch_sync(self, data_batch, target_clouds, batch_size=10):
        """Batch synchronization for efficiency."""
        results = []
        
        for i in range(0, len(data_batch), batch_size):
            batch = data_batch[i:i + batch_size]
            
            # Process batch for each cloud
            batch_tasks = []
            for cloud in target_clouds:
                task = self.upload_batch_to_cloud(batch, cloud)
                batch_tasks.append(task)
            
            batch_results = await asyncio.gather(*batch_tasks)
            results.extend(batch_results)
        
        return results
    
    async def lazy_sync(self, data, target_clouds, sync_threshold=100):
        """Lazy synchronization - sync when threshold is reached."""
        # Accumulate data until threshold
        if len(self.pending_sync) >= sync_threshold:
            return await self.batch_sync(self.pending_sync, target_clouds)
        else:
            self.pending_sync.append(data)
            return None
    
    async def upload_to_cloud(self, data, cloud_provider):
        """Upload data to specific cloud provider."""
        # Simulate cloud upload
        await asyncio.sleep(np.random.uniform(0.1, 1.0))
        return f"Uploaded to {cloud_provider}"
    
    async def upload_batch_to_cloud(self, data_batch, cloud_provider):
        """Upload batch of data to cloud provider."""
        # Simulate batch upload (more efficient)
        await asyncio.sleep(np.random.uniform(0.5, 2.0))
        return f"Batch uploaded {len(data_batch)} items to {cloud_provider}"

class MultiCloudCaching:
    """Intelligent caching across multiple clouds."""
    
    def __init__(self):
        self.cache_strategies = {
            'geographic': self._geographic_caching,
            'performance': self._performance_based_caching,
            'cost': self._cost_optimized_caching
        }
        
    def _geographic_caching(self, data, user_location):
        """Cache data in geographically closest cloud."""
        cloud_locations = {
            'aws': {'us-east': (39.0458, -76.6413), 'eu-west': (53.3498, -6.2603)},
            'azure': {'us-central': (41.5868, -93.6250), 'eu-north': (60.1699, 24.9384)},
            'gcp': {'us-west': (37.7749, -122.4194), 'eu-west': (50.1109, 8.6821)}
        }
        
        # Calculate distances and select closest
        min_distance = float('inf')
        optimal_cloud = None
        
        for cloud, locations in cloud_locations.items():
            for region, coords in locations.items():
                distance = self._calculate_distance(user_location, coords)
                if distance < min_distance:
                    min_distance = distance
                    optimal_cloud = (cloud, region)
        
        return optimal_cloud
    
    def _performance_based_caching(self, data, access_pattern):
        """Cache based on access patterns and performance."""
        if access_pattern['frequency'] > 100:  # High frequency
            # Cache in multiple clouds for redundancy
            return ['aws', 'azure']
        elif access_pattern['latency_sensitive']:
            # Cache in lowest latency cloud
            return ['gcp']  # Assuming GCP has lowest latency
        else:
            # Standard caching
            return ['aws']
    
    def _cost_optimized_caching(self, data, budget_constraints):
        """Optimize caching for cost."""
        cloud_costs = {'aws': 0.023, 'azure': 0.021, 'gcp': 0.020}  # Per GB
        
        # Select cheapest cloud within budget
        sorted_clouds = sorted(cloud_costs.items(), key=lambda x: x[1])
        
        for cloud, cost in sorted_clouds:
            if cost * data['size_gb'] <= budget_constraints:
                return [cloud]
        
        return []  # No suitable cloud within budget
    
    def _calculate_distance(self, point1, point2):
        """Calculate distance between two geographic points."""
        # Simplified distance calculation
        return ((point1[0] - point2[0])**2 + (point1[1] - point2[1])**2)**0.5

class MultiCloudWorkloadScheduler:
    """Schedule workloads across multiple clouds optimally."""
    
    def __init__(self):
        self.scheduler_strategies = {
            'cost_optimal': self._cost_optimal_scheduling,
            'performance_optimal': self._performance_optimal_scheduling,
            'balanced': self._balanced_scheduling
        }
    
    def schedule_workloads(self, workloads, strategy='balanced'):
        """Schedule workloads using specified strategy."""
        scheduler = self.scheduler_strategies.get(strategy, self._balanced_scheduling)
        return scheduler(workloads)
    
    def _cost_optimal_scheduling(self, workloads):
        """Schedule workloads to minimize cost."""
        cloud_costs = {
            'aws': {'compute': 0.10, 'storage': 0.023, 'network': 0.09},
            'azure': {'compute': 0.096, 'storage': 0.021, 'network': 0.087},
            'gcp': {'compute': 0.095, 'storage': 0.020, 'network': 0.085}
        }
        
        scheduled_workloads = {}
        
        for workload in workloads:
            min_cost = float('inf')
            optimal_cloud = None
            
            for cloud, costs in cloud_costs.items():
                # Calculate total cost for workload
                total_cost = (
                    workload['compute_hours'] * costs['compute'] +
                    workload['storage_gb'] * costs['storage'] +
                    workload['network_gb'] * costs['network']
                )
                
                if total_cost < min_cost:
                    min_cost = total_cost
                    optimal_cloud = cloud
            
            if optimal_cloud not in scheduled_workloads:
                scheduled_workloads[optimal_cloud] = []
            scheduled_workloads[optimal_cloud].append(workload)
        
        return scheduled_workloads
    
    def _performance_optimal_scheduling(self, workloads):
        """Schedule workloads for optimal performance."""
        cloud_performance = {
            'aws': {'cpu_score': 95, 'memory_score': 90, 'network_score': 88},
            'azure': {'cpu_score': 92, 'memory_score': 94, 'network_score': 90},
            'gcp': {'cpu_score': 97, 'memory_score': 89, 'network_score': 92}
        }
        
        scheduled_workloads = {}
        
        for workload in workloads:
            max_score = 0
            optimal_cloud = None
            
            for cloud, performance in cloud_performance.items():
                # Calculate performance score based on workload requirements
                if workload['type'] == 'cpu_intensive':
                    score = performance['cpu_score']
                elif workload['type'] == 'memory_intensive':
                    score = performance['memory_score']
                elif workload['type'] == 'network_intensive':
                    score = performance['network_score']
                else:
                    # Balanced workload
                    score = (performance['cpu_score'] + 
                            performance['memory_score'] + 
                            performance['network_score']) / 3
                
                if score > max_score:
                    max_score = score
                    optimal_cloud = cloud
            
            if optimal_cloud not in scheduled_workloads:
                scheduled_workloads[optimal_cloud] = []
            scheduled_workloads[optimal_cloud].append(workload)
        
        return scheduled_workloads
    
    def _balanced_scheduling(self, workloads):
        """Balanced scheduling considering cost and performance."""
        # Combine cost and performance scheduling with weights
        cost_schedule = self._cost_optimal_scheduling(workloads)
        perf_schedule = self._performance_optimal_scheduling(workloads)
        
        # Simple load balancing between cost and performance optimized schedules
        balanced_schedule = {}
        
        for i, workload in enumerate(workloads):
            if i % 2 == 0:
                # Use cost-optimal for even indices
                for cloud, wl_list in cost_schedule.items():
                    if workload in wl_list:
                        if cloud not in balanced_schedule:
                            balanced_schedule[cloud] = []
                        balanced_schedule[cloud].append(workload)
                        break
            else:
                # Use performance-optimal for odd indices
                for cloud, wl_list in perf_schedule.items():
                    if workload in wl_list:
                        if cloud not in balanced_schedule:
                            balanced_schedule[cloud] = []
                        balanced_schedule[cloud].append(workload)
                        break
        
        return balanced_schedule

# Example usage
async def optimize_multi_cloud_deployment():
    """Example multi-cloud optimization."""
    optimizer = MultiCloudOptimizer()
    
    # Benchmark cloud providers
    benchmarks = await optimizer.benchmark_cloud_providers()
    print("Cloud benchmarks:", benchmarks)
    
    # Select optimal cloud for different workloads
    training_cloud = optimizer.select_optimal_cloud('training')
    inference_cloud = optimizer.select_optimal_cloud('inference')
    
    print(f"Optimal cloud for training: {training_cloud}")
    print(f"Optimal cloud for inference: {inference_cloud}")
    
    # Schedule workloads
    scheduler = MultiCloudWorkloadScheduler()
    workloads = [
        {'id': 1, 'type': 'cpu_intensive', 'compute_hours': 10, 'storage_gb': 100, 'network_gb': 50},
        {'id': 2, 'type': 'memory_intensive', 'compute_hours': 5, 'storage_gb': 200, 'network_gb': 30},
        {'id': 3, 'type': 'network_intensive', 'compute_hours': 8, 'storage_gb': 50, 'network_gb': 200}
    ]
    
    schedule = scheduler.schedule_workloads(workloads, strategy='balanced')
    print("Workload schedule:", schedule)

# Run multi-cloud optimization
# asyncio.run(optimize_multi_cloud_deployment())
```

## Monitoring and Profiling

### Performance Monitoring Tools
```python
# performance_monitoring.py

import time
import psutil
import functools
import threading
import queue
from collections import defaultdict, deque
import numpy as np
import matplotlib.pyplot as plt
import cProfile
import pstats
import io

class PerformanceProfiler:
    def __init__(self):
        self.metrics = defaultdict(list)
        self.active_profiles = {}
        self.monitoring_thread = None
        self.monitoring_active = False
        
    def profile_function(self, func):
        """Decorator to profile function performance."""
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Start profiling
            profiler = cProfile.Profile()
            profiler.enable()
            
            start_time = time.time()
            start_memory = psutil.Process().memory_info().rss
            
            try:
                result = func(*args, **kwargs)
                return result
            finally:
                # Stop profiling
                profiler.disable()
                
                end_time = time.time()
                end_memory = psutil.Process().memory_info().rss
                
                # Calculate metrics
                execution_time = end_time - start_time
                memory_delta = end_memory - start_memory
                
                # Store metrics
                self.metrics[func.__name__].append({
                    'execution_time': execution_time,
                    'memory_delta': memory_delta,
                    'timestamp': time.time()
                })
                
                # Store profile
                s = io.StringIO()
                ps = pstats.Stats(profiler, stream=s).sort_stats('cumulative')
                ps.print_stats()
                
                self.active_profiles[f"{func.__name__}_{time.time()}"] = s.getvalue()
        
        return wrapper
    
    def start_system_monitoring(self, interval=1):
        """Start continuous system monitoring."""
        self.monitoring_active = True
        
        def monitor_loop():
            while self.monitoring_active:
                timestamp = time.time()
                
                # CPU metrics
                cpu_percent = psutil.cpu_percent(interval=None)
                cpu_per_core = psutil.cpu_percent(interval=None, percpu=True)
                
                # Memory metrics
                memory = psutil.virtual_memory()
                
                # Disk I/O
                disk_io = psutil.disk_io_counters()
                
                # Network I/O
                network_io = psutil.net_io_counters()
                
                # Store system metrics
                self.metrics['system'].append({
                    'timestamp': timestamp,
                    'cpu_percent': cpu_percent,
                    'cpu_per_core': cpu_per_core,
                    'memory_percent': memory.percent,
                    'memory_available': memory.available,
                    'disk_read_bytes': disk_io.read_bytes if disk_io else 0,
                    'disk_write_bytes': disk_io.write_bytes if disk_io else 0,
                    'network_bytes_sent': network_io.bytes_sent if network_io else 0,
                    'network_bytes_recv': network_io.bytes_recv if network_io else 0
                })
                
                time.sleep(interval)
        
        self.monitoring_thread = threading.Thread(target=monitor_loop)
        self.monitoring_thread.daemon = True
        self.monitoring_thread.start()
    
    def stop_system_monitoring(self):
        """Stop system monitoring."""
        self.monitoring_active = False
        if self.monitoring_thread:
            self.monitoring_thread.join()
    
    def get_performance_summary(self, function_name=None):
        """Get performance summary for function or all functions."""
        if function_name:
            metrics = self.metrics.get(function_name, [])
            if not metrics:
                return None
            
            execution_times = [m['execution_time'] for m in metrics]
            memory_deltas = [m['memory_delta'] for m in metrics]
            
            return {
                'function_name': function_name,
                'call_count': len(metrics),
                'avg_execution_time': np.mean(execution_times),
                'min_execution_time': np.min(execution_times),
                'max_execution_time': np.max(execution_times),
                'p95_execution_time': np.percentile(execution_times, 95),
                'avg_memory_delta': np.mean(memory_deltas),
                'max_memory_delta': np.max(memory_deltas)
            }
        else:
            # Summary for all functions
            summary = {}
            for func_name in self.metrics:
                if func_name != 'system':
                    summary[func_name] = self.get_performance_summary(func_name)
            return summary
    
    def plot_performance_metrics(self, function_name, metric='execution_time'):
        """Plot performance metrics over time."""
        metrics = self.metrics.get(function_name, [])
        if not metrics:
            print(f"No metrics found for function: {function_name}")
            return
        
        timestamps = [m['timestamp'] for m in metrics]
        values = [m[metric] for m in metrics]
        
        plt.figure(figsize=(12, 6))
        plt.plot(timestamps, values, marker='o')
        plt.title(f'{function_name} - {metric.replace("_", " ").title()}')
        plt.xlabel('Timestamp')
        plt.ylabel(metric.replace("_", " ").title())
        plt.grid(True)
        plt.show()
    
    def detect_performance_anomalies(self, function_name, threshold_multiplier=3):
        """Detect performance anomalies using statistical methods."""
        metrics = self.metrics.get(function_name, [])
        if len(metrics) < 10:  # Need sufficient data
            return []
        
        execution_times = [m['execution_time'] for m in metrics]
        mean_time = np.mean(execution_times)
        std_time = np.std(execution_times)
        
        anomalies = []
        threshold = mean_time + (threshold_multiplier * std_time)
        
        for i, metric in enumerate(metrics):
            if metric['execution_time'] > threshold:
                anomalies.append({
                    'index': i,
                    'timestamp': metric['timestamp'],
                    'execution_time': metric['execution_time'],
                    'deviation': metric['execution_time'] - mean_time
                })
        
        return anomalies

class RealTimeMonitor:
    """Real-time performance monitoring with alerts."""
    
    def __init__(self, alert_thresholds=None):
        self.alert_thresholds = alert_thresholds or {
            'cpu_percent': 80,
            'memory_percent': 85,
            'response_time': 1.0  # seconds
        }
        self.alert_queue = queue.Queue()
        self.metrics_window = deque(maxlen=1000)  # Keep last 1000 metrics
        
    def monitor_request(self, request_id, start_time, end_time, status_code):
        """Monitor individual request performance."""
        response_time = end_time - start_time
        
        metric = {
            'request_id': request_id,
            'response_time': response_time,
            'status_code': status_code,
            'timestamp': end_time
        }
        
        self.metrics_window.append(metric)
        
        # Check for alerts
        if response_time > self.alert_thresholds['response_time']:
            self.trigger_alert('high_response_time', {
                'request_id': request_id,
                'response_time': response_time,
                'threshold': self.alert_thresholds['response_time']
            })
    
    def monitor_system_resources(self):
        """Monitor system resources and trigger alerts."""
        cpu_percent = psutil.cpu_percent()
        memory_percent = psutil.virtual_memory().percent
        
        if cpu_percent > self.alert_thresholds['cpu_percent']:
            self.trigger_alert('high_cpu', {
                'cpu_percent': cpu_percent,
                'threshold': self.alert_thresholds['cpu_percent']
            })
        
        if memory_percent > self.alert_thresholds['memory_percent']:
            self.trigger_alert('high_memory', {
                'memory_percent': memory_percent,
                'threshold': self.alert_thresholds['memory_percent']
            })
    
    def trigger_alert(self, alert_type, data):
        """Trigger performance alert."""
        alert = {
            'type': alert_type,
            'timestamp': time.time(),
            'data': data
        }
        
        self.alert_queue.put(alert)
        print(f"ALERT: {alert_type} - {data}")
    
    def get_real_time_stats(self):
        """Get real-time performance statistics."""
        if not self.metrics_window:
            return {}
        
        recent_metrics = list(self.metrics_window)[-100:]  # Last 100 requests
        response_times = [m['response_time'] for m in recent_metrics]
        
        return {
            'request_count': len(recent_metrics),
            'avg_response_time': np.mean(response_times),
            'p95_response_time': np.percentile(response_times, 95),
            'p99_response_time': np.percentile(response_times, 99),
            'error_rate': len([m for m in recent_metrics if m['status_code'] >= 400]) / len(recent_metrics),
            'requests_per_second': len(recent_metrics) / 60  # Assuming 1-minute window
        }

# Flask middleware for automatic performance monitoring
class PerformanceMiddleware:
    def __init__(self, app, profiler, monitor):
        self.app = app
        self.profiler = profiler
        self.monitor = monitor
        self.wrap_app()
    
    def wrap_app(self):
        """Wrap Flask app with performance monitoring."""
        original_dispatch = self.app.dispatch_request
        
        def monitored_dispatch():
            request_id = generate_request_id()
            start_time = time.time()
            
            try:
                response = original_dispatch()
                status_code = getattr(response, 'status_code', 200)
            except Exception as e:
                status_code = 500
                raise
            finally:
                end_time = time.time()
                self.monitor.monitor_request(request_id, start_time, end_time, status_code)
            
            return response
        
        self.app.dispatch_request = monitored_dispatch

def generate_request_id():
    """Generate unique request ID."""
    return f"req_{int(time.time() * 1000)}_{np.random.randint(1000, 9999)}"

# Example usage
profiler = PerformanceProfiler()
monitor = RealTimeMonitor()

# Start system monitoring
profiler.start_system_monitoring(interval=5)

# Example function with profiling
@profiler.profile_function
def expensive_computation(n):
    """Example expensive computation."""
    result = 0
    for i in range(n):
        result += i ** 2
    return result

# Run some operations
for i in range(10):
    expensive_computation(100000)

# Get performance summary
summary = profiler.get_performance_summary('expensive_computation')
print("Performance Summary:", summary)

# Detect anomalies
anomalies = profiler.detect_performance_anomalies('expensive_computation')
print("Detected Anomalies:", anomalies)

# Get real-time stats
real_time_stats = monitor.get_real_time_stats()
print("Real-time Stats:", real_time_stats)

# Stop monitoring
profiler.stop_system_monitoring()
```

---

## Performance Troubleshooting Guide

### Common Performance Issues and Solutions

#### 1. High CPU Usage
```bash
# Identify CPU-intensive processes
top -p $(pgrep truststram)
htop -p $(pgrep truststram)

# CPU profiling
perf record -g -p $(pgrep truststram)
perf report

# Solutions:
# - Optimize algorithms
# - Implement multiprocessing
# - Use CPU affinity
# - Upgrade hardware
```

#### 2. Memory Issues
```bash
# Memory profiling
valgrind --tool=massif python app.py
python -m memory_profiler app.py

# Solutions:
# - Implement garbage collection
# - Use memory mapping
# - Optimize data structures
# - Add more RAM
```

#### 3. Database Performance
```sql
-- Identify slow queries
SELECT query, mean_time, calls, total_time 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;

-- Solutions:
-- - Add indexes
-- - Optimize queries
-- - Increase shared_buffers
-- - Use connection pooling
```

#### 4. Network Bottlenecks
```bash
# Network monitoring
iftop -i eth0
nethogs
ss -tuln

# Solutions:
# - Optimize protocols
# - Use compression
# - Implement caching
# - Upgrade bandwidth
```

---

## Conclusion

This comprehensive performance tuning guide provides optimization strategies for all components of TrustStram v4.4. Regular monitoring and continuous optimization based on actual usage patterns are essential for maintaining optimal performance.

### Key Performance Recommendations:
1. **Monitor continuously** - Use automated monitoring tools
2. **Profile regularly** - Identify bottlenecks proactively  
3. **Optimize incrementally** - Make measured improvements
4. **Test thoroughly** - Validate performance improvements
5. **Document changes** - Track optimization history

For additional performance support, contact: performance@truststram.com