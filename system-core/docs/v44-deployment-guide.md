# TrustStram v4.4 Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying TrustStram v4.4 with all integrated features. The deployment maintains full backward compatibility with v4.3 while introducing advanced capabilities for federated learning, multi-cloud orchestration, AI explainability, and quantum encryption.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Migration](#database-migration)
4. [Configuration](#configuration)
5. [Deployment Options](#deployment-options)
6. [Feature Activation](#feature-activation)
7. [Verification](#verification)
8. [Monitoring Setup](#monitoring-setup)
9. [Troubleshooting](#troubleshooting)
10. [Rollback Procedures](#rollback-procedures)

## Prerequisites

### System Requirements

#### Minimum Requirements (Development)
- **CPU**: 4 cores (2.4 GHz)
- **RAM**: 16 GB
- **Storage**: 100 GB SSD
- **Network**: 100 Mbps

#### Recommended Requirements (Production)
- **CPU**: 8+ cores (3.0 GHz)
- **RAM**: 32+ GB
- **Storage**: 500+ GB NVMe SSD
- **Network**: 1+ Gbps

### Software Dependencies

#### Core Dependencies
```bash
# Node.js and package management
node --version    # v18.0.0+
npm --version     # v8.0.0+
yarn --version    # v1.22.0+ (optional)

# Database
postgresql --version  # v13.0+
redis-server --version  # v6.0+

# Container platform
docker --version        # v20.0+
docker-compose --version  # v2.0+
kubectl version --client   # v1.24+ (for Kubernetes deployment)
```

#### Cloud Platform CLI Tools (for multi-cloud features)
```bash
# AWS CLI
aws --version     # v2.0+

# Google Cloud CLI  
gcloud --version  # v400.0+

# Azure CLI
az --version      # v2.40+
```

### Infrastructure Prerequisites

#### Database Setup
- PostgreSQL 13+ with JSONB support
- Redis 6+ for caching
- Proper backup and recovery procedures

#### Network Requirements
- Load balancer capability
- SSL/TLS certificate management
- DNS configuration
- Firewall rules for API access

#### Security Requirements
- HSM for quantum encryption (production only)
- Secrets management system
- Audit logging capability
- Compliance monitoring tools

## Environment Setup

### 1. Clone and Setup Repository

```bash
# Clone the repository
git clone https://github.com/your-org/truststream-v44.git
cd truststream-v44

# Install dependencies
npm install

# Or using yarn
yarn install
```

### 2. Environment Variables

Create environment configuration files:

```bash
# Development environment
cp .env.example .env.development

# Staging environment  
cp .env.example .env.staging

# Production environment
cp .env.example .env.production
```

#### Essential Environment Variables

```bash
# .env.production example
NODE_ENV=production
PORT=3000

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/truststream_v44
REDIS_URL=redis://localhost:6379

# Security Configuration
JWT_SECRET=your-super-secure-jwt-secret
ENCRYPTION_KEY=your-32-character-encryption-key

# Feature Flags
ENABLE_FEDERATED_LEARNING=false
ENABLE_AI_EXPLAINABILITY=false
ENABLE_MULTI_CLOUD=false
ENABLE_QUANTUM_ENCRYPTION=false

# Cloud Provider Configuration (if using multi-cloud)
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_DEFAULT_REGION=us-west-2

GOOGLE_APPLICATION_CREDENTIALS=/path/to/gcp-credentials.json
GOOGLE_CLOUD_PROJECT=your-gcp-project

AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-secret
AZURE_TENANT_ID=your-azure-tenant

# Monitoring and Observability
ENABLE_METRICS=true
METRICS_PORT=9090
LOG_LEVEL=info

# Quantum Encryption (production only)
HSM_ENABLED=false
HSM_SLOT_ID=0
HSM_PIN=your-hsm-pin
```

### 3. SSL/TLS Setup

```bash
# Generate self-signed certificates for development
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# For production, use proper CA-signed certificates
# Place certificates in: certs/
mkdir -p certs/
cp your-cert.pem certs/cert.pem
cp your-key.pem certs/key.pem
```

## Database Migration

### 1. Database Preparation

```bash
# Create database
createdb truststream_v44

# Verify connection
psql -d truststream_v44 -c "SELECT version();"
```

### 2. Run v4.4 Migration

```bash
# Apply the comprehensive v4.4 schema migration
psql -d truststream_v44 -f database/migrations/v44_unified_features_schema.sql

# Verify migration
psql -d truststream_v44 -c "SELECT * FROM v44_feature_status;"
```

### 3. Data Migration (if upgrading from v4.3)

```bash
# Run data migration script
node scripts/migrate-v43-to-v44.js

# Verify data integrity
node scripts/verify-migration.js
```

### 4. Database Optimization

```bash
# Update statistics
psql -d truststream_v44 -c "ANALYZE;"

# Rebuild indexes if necessary
psql -d truststream_v44 -c "REINDEX DATABASE truststream_v44;"
```

## Configuration

### 1. Feature Configuration

Edit the configuration file:

```typescript
// src/config/v44-unified-config.ts
export const productionV44Config: TrustStramV44Config = {
  system: {
    version: '4.4.0',
    environment: 'production',
    backward_compatibility: true,
    fallback_enabled: true,
    graceful_degradation: true,
    migration_mode: false,
    feature_flags_enabled: true,
  },
  features: {
    // Start with all features disabled for safe deployment
    federated_learning: { enabled: false },
    ai_explainability: { enabled: false },
    multi_cloud_orchestration: { enabled: false },
    quantum_encryption: { enabled: false },
  },
  // ... rest of configuration
};
```

### 2. Security Configuration

```typescript
// Update security settings for production
security: {
  encryption: {
    quantum_safe: true,
    hybrid_encryption: true,
    key_rotation_enabled: true,
    hsm_enabled: true, // Only if HSM is available
  },
  access_control: {
    zero_trust: true,
    multi_factor_auth: true,
    role_based_access: true,
    federated_identity: true,
  },
  audit: {
    comprehensive_logging: true,
    real_time_monitoring: true,
    threat_detection: true,
    incident_response: true,
  },
}
```

### 3. Performance Configuration

```typescript
// Optimize for production workloads
performance: {
  limits: {
    max_execution_time_ms: 30000,
    max_memory_usage_mb: 2048,
    max_database_connections: 200,
    max_concurrent_requests: 2000,
    max_federated_clients: 1000,
    max_cloud_deployments: 10,
    max_explanation_requests_per_minute: 500,
    max_quantum_operations_per_second: 100,
  },
}
```

## Deployment Options

### Option 1: Docker Deployment (Recommended)

#### 1. Build Docker Image

```bash
# Build the application image
docker build -t truststream:v4.4 .

# Verify the image
docker images | grep truststream
```

#### 2. Docker Compose Deployment

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  truststream:
    image: truststream:v4.4
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/truststream_v44
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    restart: unless-stopped
    volumes:
      - ./certs:/app/certs:ro
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/v44/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: truststream_v44
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/migrations:/docker-entrypoint-initdb.d:ro
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

#### 3. Start Services

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f truststream

# Verify health
curl http://localhost:3000/api/v44/health
```

### Option 2: Kubernetes Deployment

#### 1. Prepare Kubernetes Manifests

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: truststream-v44
  labels:
    app: truststream
    version: v4.4
spec:
  replicas: 3
  selector:
    matchLabels:
      app: truststream
      version: v4.4
  template:
    metadata:
      labels:
        app: truststream
        version: v4.4
    spec:
      containers:
      - name: truststream
        image: truststream:v4.4
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: truststream-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: truststream-secrets
              key: redis-url
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /api/v44/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/v44/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

#### 2. Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace truststream

# Create secrets
kubectl create secret generic truststream-secrets \
  --from-literal=database-url="postgresql://user:pass@host:5432/truststream_v44" \
  --from-literal=redis-url="redis://redis:6379" \
  -n truststream

# Deploy application
kubectl apply -f k8s/ -n truststream

# Check deployment status
kubectl get deployments -n truststream
kubectl get pods -n truststream
```

### Option 3: Direct Node.js Deployment

#### 1. Build Application

```bash
# Install production dependencies
npm ci --only=production

# Build TypeScript
npm run build

# Verify build
ls -la dist/
```

#### 2. Start Application

```bash
# Using PM2 for process management
npm install -g pm2

# Start with PM2
pm2 start dist/main-v44.js --name truststream-v44 --instances max

# Save PM2 configuration
pm2 save
pm2 startup

# Monitor
pm2 status
pm2 logs truststream-v44
```

#### 3. Setup Reverse Proxy (Nginx)

```nginx
# /etc/nginx/sites-available/truststream
server {
    listen 80;
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/v44/health {
        proxy_pass http://localhost:3000;
        access_log off;
    }
}
```

## Feature Activation

### 1. Gradual Feature Rollout

Start with all features disabled and enable them gradually:

```bash
# Check current feature status
curl http://localhost:3000/api/v44/features

# Enable AI Explainability (lowest risk)
curl -X PUT http://localhost:3000/api/v44/config/features/ai_explainability \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "rollout_percentage": 10}'

# Monitor for 24 hours, then increase rollout
curl -X PUT http://localhost:3000/api/v44/config/features/ai_explainability \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "rollout_percentage": 50}'
```

### 2. Feature Activation Order (Recommended)

1. **AI Explainability** (Day 1-3)
   - Lowest system impact
   - Easy to validate and monitor
   - Provides immediate compliance value

2. **Quantum Encryption** (Day 4-7)
   - Enhanced security layer
   - Minimal performance impact with optimization
   - Important for future-proofing

3. **Federated Learning** (Day 8-14)
   - Requires careful client coordination
   - Privacy and performance considerations
   - Gradual client onboarding

4. **Multi-Cloud Orchestration** (Day 15-21)
   - Highest complexity
   - Infrastructure dependencies
   - Requires comprehensive testing

### 3. Feature Configuration Examples

```bash
# AI Explainability - Full Production
curl -X PUT http://localhost:3000/api/v44/config/features/ai_explainability \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "rollout_percentage": 100,
    "explanation_methods": {
      "shap": true,
      "lime": true,
      "counterfactual": true,
      "feature_importance": true
    },
    "compliance_features": {
      "gdpr_article_22": true,
      "eu_ai_act": true,
      "audit_trails": true
    }
  }'

# Federated Learning - Conservative Start
curl -X PUT http://localhost:3000/api/v44/config/features/federated_learning \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "rollout_percentage": 25,
    "framework_support": {
      "flower": true,
      "tensorflow_federated": false,
      "unified_orchestration": true
    },
    "privacy_settings": {
      "differential_privacy_budget": 8.0,
      "secure_aggregation": true,
      "byzantine_robustness": true
    }
  }'
```

## Verification

### 1. Health Check Verification

```bash
# Basic health check
curl -s http://localhost:3000/api/v44/health | jq

# Detailed system status
curl -s http://localhost:3000/api/v44/status | jq

# Feature status
curl -s http://localhost:3000/api/v44/features | jq
```

### 2. API Endpoint Testing

```bash
# Test v4.4 endpoints
curl -X POST http://localhost:3000/api/v44/explainability/explain \
  -H "Content-Type: application/json" \
  -d '{
    "model_id": "test-model",
    "input_data": {"feature1": 0.5, "feature2": 0.8},
    "explanation_type": "shap",
    "stakeholder_type": "end_user"
  }'

# Test v4.3 compatibility
curl http://localhost:3000/api/v43/governance/trust-score
```

### 3. Performance Testing

```bash
# Install testing tools
npm install -g autocannon

# Load test health endpoint
autocannon -c 10 -d 30 http://localhost:3000/api/v44/health

# Load test main API
autocannon -c 5 -d 60 http://localhost:3000/api/v44/status
```

### 4. Database Verification

```sql
-- Check feature status
SELECT * FROM v44_feature_status;

-- Check integration events
SELECT * FROM v44_integration_events ORDER BY created_at DESC LIMIT 10;

-- Check system health
SELECT 
  feature_name,
  status,
  health_status,
  rollout_percentage
FROM v44_feature_status;
```

## Monitoring Setup

### 1. Application Monitoring

```bash
# Setup Prometheus metrics endpoint
curl http://localhost:3000/metrics

# Check integration metrics
curl http://localhost:3000/api/v44/metrics | jq
```

### 2. Log Monitoring

```bash
# Application logs
tail -f logs/application.log

# Error logs
tail -f logs/error.log

# Feature-specific logs
tail -f logs/federated-learning.log
tail -f logs/ai-explainability.log
```

### 3. Database Monitoring

```sql
-- Monitor feature usage
SELECT 
  feature_name,
  COUNT(*) as usage_count,
  AVG(performance_metrics->>'response_time_ms')::float as avg_response_time
FROM v44_integration_events 
WHERE event_type = 'feature_usage'
GROUP BY feature_name;

-- Monitor error rates
SELECT 
  feature_name,
  COUNT(*) as error_count,
  DATE(created_at) as error_date
FROM v44_integration_events 
WHERE event_type = 'integration_failure'
GROUP BY feature_name, DATE(created_at)
ORDER BY error_date DESC;
```

### 4. Alerting Setup

Configure alerts for:
- High error rates (>5%)
- Performance degradation (>2x baseline)
- Feature failures
- Database connection issues
- Memory/CPU usage (>80%)

## Troubleshooting

### Common Issues and Solutions

#### 1. Application Won't Start

```bash
# Check logs
docker-compose logs truststream

# Common issues:
# - Database connection failed
# - Missing environment variables
# - Port already in use
# - Insufficient permissions

# Solutions:
# Check database connectivity
psql $DATABASE_URL -c "SELECT 1"

# Verify environment variables
env | grep TRUSTSTREAM

# Check port availability
netstat -tulpn | grep :3000
```

#### 2. Features Not Activating

```bash
# Check feature flag status
curl http://localhost:3000/api/v44/features

# Check integration service health
curl http://localhost:3000/api/v44/status

# Check logs for feature initialization
grep "feature.*initialization" logs/application.log
```

#### 3. Performance Issues

```bash
# Check system metrics
curl http://localhost:3000/api/v44/metrics

# Monitor database performance
psql $DATABASE_URL -c "
SELECT 
  query,
  calls,
  total_time,
  mean_time
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;"

# Monitor memory usage
free -h
top -p $(pgrep node)
```

#### 4. Database Issues

```bash
# Check database connectivity
pg_isready -h localhost -p 5432

# Check table existence
psql $DATABASE_URL -c "\dt v44*"

# Check migration status
psql $DATABASE_URL -c "SELECT * FROM v44_feature_status"
```

### Debug Mode

Enable debug mode for detailed logging:

```bash
# Set debug environment
export DEBUG=truststream:*
export LOG_LEVEL=debug

# Restart application
pm2 restart truststream-v44
```

## Rollback Procedures

### 1. Emergency Rollback

```bash
# Stop current deployment
docker-compose down

# Rollback to previous version
docker run -d --name truststream-rollback \
  -p 3000:3000 \
  -e NODE_ENV=production \
  truststream:v4.3

# Verify rollback
curl http://localhost:3000/health
```

### 2. Feature-Specific Rollback

```bash
# Disable specific feature
curl -X PUT http://localhost:3000/api/v44/config/features/federated_learning \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

# Verify feature disabled
curl http://localhost:3000/api/v44/features
```

### 3. Database Rollback

```sql
-- Disable all v4.4 features
UPDATE v44_feature_status SET status = 'disabled', rollout_percentage = 0;

-- Check rollback
SELECT feature_name, status FROM v44_feature_status;
```

### 4. Gradual Rollback

```bash
# Gradually reduce feature rollout
for percentage in 75 50 25 10 0; do
  curl -X PUT http://localhost:3000/api/v44/config/features/ai_explainability \
    -H "Content-Type: application/json" \
    -d "{\"rollout_percentage\": $percentage}"
  
  echo "Reduced rollout to $percentage%, monitoring for 10 minutes..."
  sleep 600
done
```

## Conclusion

This deployment guide provides comprehensive instructions for deploying TrustStram v4.4 with all integrated features. The gradual rollout approach ensures system stability while introducing advanced capabilities.

### Key Success Factors

1. **Thorough Testing**: Test each component before production deployment
2. **Gradual Rollout**: Enable features incrementally with monitoring
3. **Comprehensive Monitoring**: Monitor all aspects of system health
4. **Backup Procedures**: Maintain robust backup and rollback capabilities
5. **Documentation**: Keep deployment logs and configuration documentation

### Next Steps

1. Monitor system performance for 30 days
2. Gradually increase feature rollout percentages
3. Collect user feedback and usage metrics
4. Plan for scale-out based on usage patterns
5. Schedule regular security and performance reviews

For additional support, refer to the [comprehensive integration documentation](docs/v44-comprehensive-integration-guide.md) or contact the TrustStram engineering team.