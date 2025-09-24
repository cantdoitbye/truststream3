# Enhanced Production Package v4.3 - Deployment Guide

**Version:** 4.3.0  
**Last Updated:** 2025-09-21  
**Target Audience:** DevOps Engineers, System Administrators, Technical Leads

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Environment Configuration](#environment-configuration)
4. [Backend Provider Setup](#backend-provider-setup)
5. [Application Deployment](#application-deployment)
6. [AI Components Setup](#ai-components-setup)
7. [Security Configuration](#security-configuration)
8. [Monitoring Setup](#monitoring-setup)
9. [Validation & Testing](#validation--testing)
10. [Production Deployment](#production-deployment)
11. [Post-Deployment Tasks](#post-deployment-tasks)
12. [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

### System Requirements

#### Minimum Requirements
- **CPU**: 4 cores (8 recommended for AI workloads)
- **RAM**: 16GB (32GB recommended for local LLM)
- **Storage**: 100GB SSD (500GB recommended)
- **Network**: 1Gbps connection
- **OS**: Linux (Ubuntu 20.04+), macOS 12+, Windows 11

#### Recommended for Production
- **CPU**: 8+ cores with AVX2 support
- **RAM**: 64GB+ for optimal AI performance
- **Storage**: NVMe SSD with 1TB+ capacity
- **GPU**: NVIDIA GPU with 8GB+ VRAM (for local AI)
- **Network**: 10Gbps connection with low latency

### Software Dependencies

#### Core Requirements
```bash
# Node.js (v18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Python (3.9+)
sudo apt-get install python3.9 python3.9-pip python3.9-venv

# Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Git
sudo apt-get install git

# Essential build tools
sudo apt-get install build-essential curl wget unzip
```

#### AI/ML Requirements (Optional - for local AI)
```bash
# NVIDIA Docker (for GPU support)
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update && sudo apt-get install -y nvidia-docker2
sudo systemctl restart docker

# CUDA (if using local GPU)
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2004/x86_64/cuda-ubuntu2004.pin
sudo mv cuda-ubuntu2004.pin /etc/apt/preferences.d/cuda-repository-pin-600
sudo apt-key adv --fetch-keys https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2004/x86_64/3bf863cc.pub
sudo add-apt-repository "deb https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2004/x86_64/ /"
sudo apt-get update
sudo apt-get -y install cuda
```

### Cloud Prerequisites

#### For AWS Deployment
- AWS Account with appropriate permissions
- AWS CLI v2.0+ configured
- IAM roles for ECS/EKS deployment
- VPC with public/private subnets

#### For Azure Deployment
- Azure subscription with contributor access
- Azure CLI v2.40+ installed
- Resource group for deployment
- Azure AD app registration

#### For GCP Deployment
- GCP project with billing enabled
- gcloud CLI installed and configured
- Service account with necessary permissions
- VPC network configured

## 🏗️ Infrastructure Setup

### 1. Clone Repository and Initial Setup

```bash
# Clone the repository
git clone https://github.com/your-org/enhanced-production-package-v4.3.git
cd enhanced-production-package-v4.3

# Make scripts executable
chmod +x scripts/*.sh

# Copy environment template
cp .env.example .env

# Install dependencies
npm install
pip install -r requirements.txt
```

### 2. Infrastructure Provisioning

#### Option A: Automated Infrastructure (Recommended)

```bash
# Set your deployment environment
export DEPLOYMENT_ENV=production  # or staging, development
export CLOUD_PROVIDER=aws         # or azure, gcp, local

# Run automated infrastructure setup
./scripts/setup-infrastructure.sh

# This script will:
# - Provision cloud resources
# - Set up networking
# - Configure security groups
# - Create databases
# - Set up load balancers
# - Configure monitoring
```

#### Option B: Manual Infrastructure

##### AWS Infrastructure
```bash
# Create VPC and networking
aws cloudformation create-stack \
  --stack-name epp-v43-network \
  --template-body file://infrastructure/aws/network.yaml \
  --parameters ParameterKey=Environment,ParameterValue=production

# Create RDS database
aws cloudformation create-stack \
  --stack-name epp-v43-database \
  --template-body file://infrastructure/aws/database.yaml \
  --parameters ParameterKey=Environment,ParameterValue=production

# Create ECS cluster
aws cloudformation create-stack \
  --stack-name epp-v43-compute \
  --template-body file://infrastructure/aws/compute.yaml \
  --parameters ParameterKey=Environment,ParameterValue=production
```

##### Azure Infrastructure
```bash
# Create resource group
az group create --name epp-v43-rg --location eastus

# Deploy infrastructure template
az deployment group create \
  --resource-group epp-v43-rg \
  --template-file infrastructure/azure/main.bicep \
  --parameters environment=production
```

##### GCP Infrastructure
```bash
# Enable required APIs
gcloud services enable compute.googleapis.com
gcloud services enable container.googleapis.com
gcloud services enable sql-component.googleapis.com

# Deploy infrastructure
gcloud deployment-manager deployments create epp-v43-infra \
  --config infrastructure/gcp/infrastructure.yaml
```

### 3. Container Registry Setup

```bash
# Build and push container images
./scripts/build-images.sh

# For AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# For Azure ACR
az acr login --name your-registry-name

# For GCP GCR
gcloud auth configure-docker

# Push images
docker push your-registry/epp-v43-app:latest
docker push your-registry/epp-v43-ai:latest
docker push your-registry/epp-v43-worker:latest
```

## ⚙️ Environment Configuration

### 1. Environment Variables

Create environment-specific configuration files:

#### Production Environment (`.env.production`)
```bash
# Core Configuration
NODE_ENV=production
LOG_LEVEL=warn
PORT=3000
API_VERSION=v4.3

# Provider Configuration
PROVIDER=supabase  # or firebase, aws, azure, gcp
PROVIDER_CONFIG_PATH=./config/providers/production.json

# Database Configuration
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=epp_production
DB_SSL=true
DB_POOL_SIZE=20

# AI Configuration
AI_ENABLED=true
LOCAL_AI_ENABLED=true
AI_MODEL_PATH=/app/models
AI_GPU_ENABLED=true
AI_MAX_BATCH_SIZE=32

# Security Configuration
JWT_SECRET=your-super-secret-jwt-key-256-bits-long
ENCRYPTION_KEY=your-encryption-key-for-sensitive-data
MFA_ENABLED=true
SESSION_TIMEOUT=3600

# Performance Configuration
CACHE_ENABLED=true
CACHE_REDIS_URL=redis://your-redis-cluster:6379
CACHE_TTL=3600
ENABLE_COMPRESSION=true

# Monitoring Configuration
MONITORING_ENABLED=true
METRICS_PORT=9090
HEALTH_CHECK_PORT=8080
LOG_AGGREGATION_ENABLED=true

# Feature Flags
FEATURE_KNOWLEDGE_GRAPH=true
FEATURE_ADAPTIVE_LEARNING=true
FEATURE_MULTI_MODAL_AI=true
FEATURE_ZERO_TRUST_SECURITY=true
```

#### Staging Environment (`.env.staging`)
```bash
# Similar to production but with reduced resources
NODE_ENV=staging
DB_POOL_SIZE=10
AI_MAX_BATCH_SIZE=16
# ... other staging-specific configurations
```

### 2. Provider-Specific Configuration

#### Supabase Configuration (`config/providers/supabase.json`)
```json
{
  "name": "supabase",
  "type": "postgresql",
  "config": {
    "url": "${SUPABASE_URL}",
    "anonKey": "${SUPABASE_ANON_KEY}",
    "serviceRoleKey": "${SUPABASE_SERVICE_ROLE_KEY}",
    "jwtSecret": "${SUPABASE_JWT_SECRET}",
    "features": {
      "realtime": true,
      "storage": true,
      "edgeFunctions": true,
      "auth": true
    },
    "pool": {
      "min": 5,
      "max": 20,
      "idleTimeoutMillis": 30000
    }
  }
}
```

#### AWS Configuration (`config/providers/aws.json`)
```json
{
  "name": "aws",
  "type": "postgresql",
  "config": {
    "region": "${AWS_REGION}",
    "accessKeyId": "${AWS_ACCESS_KEY_ID}",
    "secretAccessKey": "${AWS_SECRET_ACCESS_KEY}",
    "database": {
      "host": "${RDS_ENDPOINT}",
      "port": 5432,
      "database": "${DB_NAME}",
      "ssl": true
    },
    "storage": {
      "bucket": "${S3_BUCKET}",
      "region": "${AWS_REGION}"
    },
    "functions": {
      "runtime": "nodejs18.x",
      "timeout": 30,
      "memorySize": 512
    }
  }
}
```

### 3. AI Model Configuration

```bash
# Download AI models (if using local AI)
./scripts/download-models.sh

# Configure model settings
cat > config/ai-models.json << EOF
{
  "models": [
    {
      "name": "llama-2-7b-chat",
      "type": "llm",
      "path": "/app/models/llama-2-7b-chat.gguf",
      "quantization": "q4_0",
      "contextLength": 4096,
      "temperature": 0.7,
      "enabled": true
    },
    {
      "name": "mistral-7b-instruct",
      "type": "llm",
      "path": "/app/models/mistral-7b-instruct.gguf",
      "quantization": "q4_0",
      "contextLength": 8192,
      "temperature": 0.7,
      "enabled": true
    },
    {
      "name": "clip-vit-large",
      "type": "vision",
      "path": "/app/models/clip-vit-large-patch14",
      "enabled": true
    }
  ],
  "fallback": {
    "enabled": true,
    "provider": "openai",
    "model": "gpt-3.5-turbo"
  }
}
EOF
```

## 🔗 Backend Provider Setup

### Option 1: Supabase Setup (Recommended)

#### 1. Create Supabase Project
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Initialize project
supabase init

# Link to your Supabase project
supabase link --project-ref your-project-id
```

#### 2. Database Setup
```bash
# Run migrations
supabase db push

# Seed initial data
supabase db seed

# Set up RLS policies
psql -h db.your-project.supabase.co -U postgres -d postgres -f sql/security-policies.sql
```

#### 3. Edge Functions Deployment
```bash
# Deploy authentication functions
supabase functions deploy auth-handler --project-ref your-project-id

# Deploy AI processing functions
supabase functions deploy ai-processor --project-ref your-project-id

# Deploy webhook handlers
supabase functions deploy webhook-handler --project-ref your-project-id
```

#### 4. Storage Configuration
```bash
# Create storage buckets
supabase storage create-bucket user-uploads --public
supabase storage create-bucket ai-models --private
supabase storage create-bucket documents --private

# Set up bucket policies
supabase storage update-bucket user-uploads --file-size-limit 10485760
```

### Option 2: AWS Setup

#### 1. RDS Database Setup
```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier epp-v43-db \
  --db-instance-class db.t3.large \
  --engine postgres \
  --engine-version 14.9 \
  --allocated-storage 100 \
  --storage-type gp2 \
  --storage-encrypted \
  --master-username admin \
  --master-user-password your-secure-password \
  --vpc-security-group-ids sg-12345678 \
  --db-subnet-group-name epp-v43-subnet-group

# Wait for instance to be available
aws rds wait db-instance-available --db-instance-identifier epp-v43-db
```

#### 2. Lambda Functions Setup
```bash
# Package and deploy Lambda functions
cd functions/aws
zip -r auth-handler.zip auth-handler/
zip -r ai-processor.zip ai-processor/

# Deploy functions
aws lambda create-function \
  --function-name epp-v43-auth-handler \
  --runtime nodejs18.x \
  --role arn:aws:iam::123456789012:role/lambda-execution-role \
  --handler index.handler \
  --zip-file fileb://auth-handler.zip

aws lambda create-function \
  --function-name epp-v43-ai-processor \
  --runtime nodejs18.x \
  --role arn:aws:iam::123456789012:role/lambda-execution-role \
  --handler index.handler \
  --zip-file fileb://ai-processor.zip \
  --timeout 60 \
  --memory-size 1024
```

#### 3. S3 Storage Setup
```bash
# Create S3 buckets
aws s3 mb s3://epp-v43-user-uploads
aws s3 mb s3://epp-v43-ai-models
aws s3 mb s3://epp-v43-documents

# Configure bucket policies
aws s3api put-bucket-policy \
  --bucket epp-v43-user-uploads \
  --policy file://policies/s3-public-read.json

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket epp-v43-documents \
  --versioning-configuration Status=Enabled
```

### Option 3: Firebase Setup

#### 1. Initialize Firebase Project
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project
firebase init

# Select features: Firestore, Functions, Hosting, Storage
```

#### 2. Firestore Database Setup
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Public read access for knowledge base
    match /knowledge/{document=**} {
      allow read: if true;
      allow write: if request.auth != null && hasRole('admin');
    }
  }
}
```

#### 3. Cloud Functions Deployment
```bash
# Deploy functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:authHandler
firebase deploy --only functions:aiProcessor
```

## 🚀 Application Deployment

### 1. Container Deployment

#### Docker Compose (Development/Staging)
```yaml
# docker-compose.production.yml
version: '3.8'
services:
  app:
    image: your-registry/epp-v43-app:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - redis
      - postgres
    
  ai-service:
    image: your-registry/epp-v43-ai:latest
    ports:
      - "8001:8001"
    environment:
      - AI_GPU_ENABLED=true
    runtime: nvidia
    volumes:
      - ./models:/app/models
    
  worker:
    image: your-registry/epp-v43-worker:latest
    environment:
      - WORKER_TYPE=background
    env_file:
      - .env.production
    
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    
  postgres:
    image: postgres:14
    environment:
      - POSTGRES_DB=epp_production
      - POSTGRES_USER=admin
      - POSTGRES_PASSWORD=secure-password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

```bash
# Deploy with Docker Compose
docker-compose -f docker-compose.production.yml up -d

# Scale services
docker-compose -f docker-compose.production.yml up -d --scale worker=3
```

#### Kubernetes Deployment
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: epp-v43-app
  labels:
    app: epp-v43-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: epp-v43-app
  template:
    metadata:
      labels:
        app: epp-v43-app
    spec:
      containers:
      - name: app
        image: your-registry/epp-v43-app:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: epp-secrets
              key: database-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

```bash
# Deploy to Kubernetes
kubectl apply -f k8s/

# Scale deployment
kubectl scale deployment epp-v43-app --replicas=5

# Check deployment status
kubectl rollout status deployment/epp-v43-app
```

### 2. Database Migration

```bash
# Run database migrations
npm run migrate:production

# Verify migration status
npm run migrate:status

# Rollback if needed (emergency only)
npm run migrate:rollback
```

### 3. Static Assets Deployment

```bash
# Build and optimize static assets
npm run build:production

# Deploy to CDN
aws s3 sync dist/ s3://epp-v43-cdn --delete
aws cloudfront create-invalidation --distribution-id E1234567890 --paths "/*"

# Or for other CDNs
gsutil -m rsync -r -d dist/ gs://epp-v43-cdn
```

## 🤖 AI Components Setup

### 1. Local Model Download and Setup

```bash
# Download AI models
./scripts/download-models.sh --environment production

# This will download:
# - Llama 2 7B Chat (4-bit quantized)
# - Mistral 7B Instruct (4-bit quantized)
# - Code Llama 7B (4-bit quantized)
# - CLIP ViT-Large (vision model)
# - Whisper Large (audio model)

# Verify model integrity
./scripts/verify-models.sh

# Test model loading
npm run test:ai-models
```

### 2. GPU Setup (If Available)

```bash
# Verify GPU availability
nvidia-smi

# Test CUDA installation
python -c "import torch; print(torch.cuda.is_available())"

# Configure GPU memory allocation
export CUDA_VISIBLE_DEVICES=0
export PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
```

### 3. Vector Database Setup

```bash
# Initialize vector database
python scripts/setup-vector-db.py

# Create indices
python scripts/create-embeddings-index.py

# Test vector search
npm run test:vector-search
```

### 4. Knowledge Graph Initialization

```bash
# Initialize knowledge graph
python scripts/init-knowledge-graph.py

# Load initial knowledge base
python scripts/load-knowledge-base.py --source ./data/knowledge/

# Create graph indices
python scripts/create-graph-indices.py
```

## 🔒 Security Configuration

### 1. SSL/TLS Setup

#### Option A: Let's Encrypt (Free)
```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d api.your-domain.com

# Auto-renewal setup
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Option B: Commercial Certificate
```bash
# Generate CSR
openssl req -new -newkey rsa:2048 -nodes -keyout server.key -out server.csr

# Install certificate
sudo cp server.crt /etc/ssl/certs/
sudo cp server.key /etc/ssl/private/
sudo chmod 600 /etc/ssl/private/server.key
```

### 2. Security Headers Configuration

```nginx
# /etc/nginx/conf.d/security-headers.conf
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### 3. Firewall Configuration

```bash
# UFW (Ubuntu Firewall)
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow ssh

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow application ports
sudo ufw allow 3000/tcp  # Application
sudo ufw allow 8001/tcp  # AI service

# Application-specific rules
sudo ufw allow from 10.0.0.0/16 to any port 5432  # Database (internal only)
sudo ufw allow from 10.0.0.0/16 to any port 6379  # Redis (internal only)
```

### 4. Authentication Setup

```bash
# Generate JWT secrets
openssl rand -base64 64 > jwt-secret.txt

# Generate encryption keys
openssl rand -base64 32 > encryption-key.txt

# Set up OAuth providers (if using)
./scripts/setup-oauth.sh

# Configure MFA
./scripts/setup-mfa.sh
```

## 📊 Monitoring Setup

### 1. Application Monitoring

#### Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/*.yml"

scrape_configs:
  - job_name: 'epp-v43-app'
    static_configs:
      - targets: ['localhost:9090']
    metrics_path: /metrics
    scrape_interval: 5s
  
  - job_name: 'epp-v43-ai'
    static_configs:
      - targets: ['localhost:8001']
    metrics_path: /metrics
    scrape_interval: 10s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

#### Grafana Dashboards
```bash
# Import pre-built dashboards
curl -X POST \
  http://admin:admin@localhost:3000/api/dashboards/db \
  -H 'Content-Type: application/json' \
  -d @monitoring/grafana/epp-v43-dashboard.json

# Set up alerts
curl -X POST \
  http://admin:admin@localhost:3000/api/alerts \
  -H 'Content-Type: application/json' \
  -d @monitoring/grafana/alerts.json
```

### 2. Log Aggregation

#### ELK Stack Setup
```bash
# Deploy Elasticsearch
docker run -d \
  --name elasticsearch \
  -p 9200:9200 \
  -e "discovery.type=single-node" \
  -e "ES_JAVA_OPTS=-Xms1g -Xmx1g" \
  elasticsearch:7.17.0

# Deploy Logstash
docker run -d \
  --name logstash \
  -p 5044:5044 \
  -v ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf \
  logstash:7.17.0

# Deploy Kibana
docker run -d \
  --name kibana \
  -p 5601:5601 \
  -e "ELASTICSEARCH_HOSTS=http://elasticsearch:9200" \
  kibana:7.17.0
```

### 3. Health Checks

```bash
# Set up health check endpoints
curl -f http://localhost:3000/health || exit 1
curl -f http://localhost:8001/health || exit 1

# Configure load balancer health checks
# AWS ALB health check configuration
aws elbv2 modify-target-group \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/epp-v43/1234567890123456 \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 5
```

## ✅ Validation & Testing

### 1. Smoke Tests

```bash
# Run smoke tests
npm run test:smoke

# Test API endpoints
curl -X GET http://localhost:3000/api/v4.3/health
curl -X GET http://localhost:3000/api/v4.3/status

# Test AI endpoints
curl -X POST http://localhost:8001/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, world!", "model": "llama-2-7b-chat"}'
```

### 2. Integration Tests

```bash
# Run full integration test suite
npm run test:integration

# Test database connectivity
npm run test:database

# Test provider integrations
npm run test:providers

# Test AI model functionality
npm run test:ai-integration
```

### 3. Performance Tests

```bash
# Load testing
npm run test:load

# Stress testing
npm run test:stress

# AI performance benchmarks
npm run test:ai-performance
```

### 4. Security Tests

```bash
# Security vulnerability scan
npm audit --audit-level high

# Container security scan
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  -v $(pwd):/tmp/app \
  aquasec/trivy image your-registry/epp-v43-app:latest

# OWASP ZAP security scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://your-domain.com
```

## 🌐 Production Deployment

### 1. Pre-Deployment Checklist

```bash
# ✓ Environment variables configured
# ✓ Database migrations tested
# ✓ SSL certificates installed
# ✓ Security configurations applied
# ✓ Monitoring setup complete
# ✓ Backup procedures tested
# ✓ Load balancer configured
# ✓ Auto-scaling rules defined
# ✓ Health checks configured
# ✓ Rollback procedures documented

# Run pre-deployment validation
./scripts/pre-deployment-check.sh
```

### 2. Blue-Green Deployment

```bash
# Deploy to green environment
./scripts/deploy-green.sh

# Run validation tests on green
./scripts/validate-green.sh

# Switch traffic to green
./scripts/switch-to-green.sh

# Monitor for issues
./scripts/monitor-deployment.sh

# Cleanup blue environment (after validation)
./scripts/cleanup-blue.sh
```

### 3. Canary Deployment

```bash
# Deploy canary (5% traffic)
./scripts/deploy-canary.sh --traffic-percentage 5

# Monitor canary metrics
./scripts/monitor-canary.sh

# Gradually increase traffic
./scripts/increase-canary-traffic.sh --percentage 25
./scripts/increase-canary-traffic.sh --percentage 50
./scripts/increase-canary-traffic.sh --percentage 100

# Complete deployment
./scripts/complete-canary-deployment.sh
```

### 4. Database Migration in Production

```bash
# Create database backup
./scripts/backup-database.sh --environment production

# Run migrations in maintenance mode
./scripts/enable-maintenance-mode.sh
npm run migrate:production
./scripts/validate-migration.sh
./scripts/disable-maintenance-mode.sh

# Verify application functionality
./scripts/post-migration-tests.sh
```

## 📋 Post-Deployment Tasks

### 1. Monitoring Setup Verification

```bash
# Verify all monitoring endpoints
curl http://localhost:9090/targets  # Prometheus targets
curl http://localhost:3000/api/health  # Application health
curl http://localhost:5601/api/status  # Kibana status

# Check alert rules
curl http://localhost:9093/api/v1/alerts  # Alertmanager

# Verify metrics collection
curl "http://localhost:9090/api/v1/query?query=up"
```

### 2. Performance Baseline Establishment

```bash
# Run performance benchmarks
./scripts/performance-baseline.sh

# Document baseline metrics
./scripts/document-baseline.sh

# Set up performance alerts based on baseline
./scripts/setup-performance-alerts.sh
```

### 3. Security Verification

```bash
# Run security scan
./scripts/security-scan.sh

# Verify SSL configuration
./scripts/verify-ssl.sh

# Test authentication flows
./scripts/test-authentication.sh

# Verify access controls
./scripts/test-access-controls.sh
```

### 4. Backup Verification

```bash
# Test backup creation
./scripts/create-backup.sh --type full

# Test backup restoration (on test environment)
./scripts/test-restore.sh --backup-id latest

# Verify backup integrity
./scripts/verify-backup-integrity.sh
```

### 5. Documentation Updates

```bash
# Update deployment documentation
./scripts/update-deployment-docs.sh

# Update runbooks
./scripts/update-runbooks.sh

# Create deployment report
./scripts/create-deployment-report.sh
```

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. Application Won't Start

**Symptoms:**
- Container exits immediately
- "Port already in use" errors
- Database connection failures

**Solutions:**
```bash
# Check logs
docker logs epp-v43-app
kubectl logs deployment/epp-v43-app

# Verify environment variables
env | grep -E "(DB_|API_|JWT_)"

# Check port availability
netstat -tlnp | grep :3000

# Test database connectivity
pg_isready -h your-db-host -p 5432

# Verify configuration
npm run config:validate
```

#### 2. AI Service Performance Issues

**Symptoms:**
- Slow AI response times
- High memory usage
- GPU out of memory errors

**Solutions:**
```bash
# Check GPU utilization
nvidia-smi

# Reduce batch size
export AI_MAX_BATCH_SIZE=8

# Enable model quantization
export AI_QUANTIZATION=4bit

# Monitor memory usage
docker stats epp-v43-ai

# Check model loading
curl http://localhost:8001/api/v1/models
```

#### 3. Database Performance Issues

**Symptoms:**
- Slow query responses
- Connection pool exhaustion
- High CPU usage on database

**Solutions:**
```bash
# Check active connections
SELECT count(*) FROM pg_stat_activity;

# Identify slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

# Optimize connection pool
export DB_POOL_SIZE=10
export DB_POOL_TIMEOUT=30000

# Update table statistics
ANALYZE;

# Reindex if needed
REINDEX INDEX CONCURRENTLY your_index_name;
```

#### 4. Memory Leaks

**Symptoms:**
- Gradually increasing memory usage
- Out of memory errors
- Application crashes

**Solutions:**
```bash
# Monitor memory usage
docker stats --no-stream
kubectl top pods

# Enable heap profiling
export NODE_OPTIONS="--max-old-space-size=4096 --inspect"

# Check for memory leaks
npm run profile:memory

# Restart application if needed
docker restart epp-v43-app
kubectl rollout restart deployment/epp-v43-app
```

#### 5. Network Connectivity Issues

**Symptoms:**
- Intermittent API failures
- Load balancer timeouts
- DNS resolution failures

**Solutions:**
```bash
# Test network connectivity
curl -v http://localhost:3000/health
ping your-database-host
nslookup your-domain.com

# Check load balancer configuration
aws elbv2 describe-target-health --target-group-arn your-target-group-arn

# Verify security groups
aws ec2 describe-security-groups --group-ids your-security-group-id

# Check DNS configuration
dig your-domain.com
```

### Emergency Procedures

#### 1. Emergency Rollback

```bash
# Quick rollback to previous version
./scripts/emergency-rollback.sh --version previous

# Rollback database migrations (if safe)
npm run migrate:rollback --steps 1

# Verify rollback success
./scripts/verify-rollback.sh
```

#### 2. Scale Down in Emergency

```bash
# Reduce resource consumption
kubectl scale deployment epp-v43-app --replicas=1
kubectl scale deployment epp-v43-ai --replicas=0

# Disable AI features temporarily
kubectl patch configmap app-config -p '{"data":{"AI_ENABLED":"false"}}'
kubectl rollout restart deployment/epp-v43-app
```

#### 3. Emergency Maintenance Mode

```bash
# Enable maintenance mode
./scripts/enable-maintenance-mode.sh

# Display maintenance page
nginx -s reload

# Perform emergency fixes
# ...

# Disable maintenance mode
./scripts/disable-maintenance-mode.sh
```

### Support Contacts

- **Technical Lead**: [technical-lead@your-org.com]
- **DevOps Team**: [devops@your-org.com]
- **24/7 Support**: [support@your-org.com]
- **Emergency Hotline**: +1-555-EMERGENCY

### Additional Resources

- [API Documentation](./api-documentation.md)
- [Architecture Overview](./architecture.md)
- [Security Guidelines](./security-guidelines.md)
- [Performance Tuning Guide](./performance-tuning.md)
- [Monitoring Runbook](./monitoring-runbook.md)

---

**Deployment Guide Version**: 1.0  
**Last Updated**: 2025-09-21  
**Next Review**: 2025-10-21  

*This deployment guide is part of the Enhanced Production Package v4.3 documentation suite. For the most up-to-date information, please refer to the official documentation repository.*
