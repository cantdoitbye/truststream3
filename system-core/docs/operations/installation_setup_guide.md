# TrustStram v4.4 Installation and Setup Guide

## Table of Contents
1. [System Requirements](#system-requirements)
2. [Pre-Installation Checklist](#pre-installation-checklist)
3. [Installation Methods](#installation-methods)
4. [Docker Deployment](#docker-deployment)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [Cloud Provider Setup](#cloud-provider-setup)
7. [Database Configuration](#database-configuration)
8. [Security Configuration](#security-configuration)
9. [Network Configuration](#network-configuration)
10. [Initial Configuration](#initial-configuration)
11. [Verification and Testing](#verification-and-testing)
12. [Troubleshooting](#troubleshooting)

## System Requirements

### Minimum Requirements
- **CPU**: 8 cores (x86_64 or ARM64)
- **Memory**: 32 GB RAM
- **Storage**: 500 GB SSD
- **Network**: 1 Gbps connection
- **OS**: Ubuntu 20.04+, CentOS 8+, RHEL 8+, or Amazon Linux 2

### Recommended Requirements
- **CPU**: 16+ cores (Intel Xeon or AMD EPYC)
- **Memory**: 128 GB RAM
- **Storage**: 2 TB NVMe SSD
- **Network**: 10 Gbps connection
- **OS**: Ubuntu 22.04 LTS or RHEL 9

### Production Requirements
- **CPU**: 32+ cores across multiple nodes
- **Memory**: 256+ GB RAM per node
- **Storage**: 10+ TB distributed storage
- **Network**: 25+ Gbps with redundancy
- **High Availability**: Multi-zone deployment

### Software Dependencies
```bash
# Required software versions
- Docker: 24.0+
- Kubernetes: 1.28+
- PostgreSQL: 15+
- Redis: 7.0+
- Python: 3.9+
- Node.js: 18+
- Java: 17+
```

## Pre-Installation Checklist

### Infrastructure Preparation
- [ ] Hardware specifications verified
- [ ] Operating system updated and configured
- [ ] Network connectivity tested
- [ ] DNS resolution configured
- [ ] NTP synchronization enabled
- [ ] Firewall rules configured
- [ ] SSL certificates obtained
- [ ] Backup storage allocated

### Account and Access Setup
- [ ] Service accounts created
- [ ] SSH keys generated and distributed
- [ ] Database credentials prepared
- [ ] Cloud provider access configured
- [ ] Container registry access verified
- [ ] Monitoring tools access configured

### Security Preparation
- [ ] Security policies reviewed
- [ ] Encryption keys generated
- [ ] Vulnerability scanning completed
- [ ] Compliance requirements verified
- [ ] Audit logging configured

## Installation Methods

### Method 1: Automated Installer (Recommended)
```bash
# Download the TrustStram installer
curl -fsSL https://install.truststram.com/v4.4/install.sh -o install.sh
chmod +x install.sh

# Run automated installation
sudo ./install.sh --version=4.4.0 --environment=production

# Follow interactive prompts for:
# - Installation path
# - Database configuration
# - Network settings
# - Security configuration
# - Initial admin account
```

### Method 2: Package Manager Installation
```bash
# Add TrustStram repository
curl -fsSL https://packages.truststram.com/GPG-KEY-truststram | sudo apt-key add -
echo "deb https://packages.truststram.com/ubuntu focal main" | sudo tee /etc/apt/sources.list.d/truststram.list

# Update package index
sudo apt update

# Install TrustStram
sudo apt install truststram=4.4.0

# Configure and start services
sudo truststram-setup --interactive
sudo systemctl enable --now truststram
```

### Method 3: Manual Installation
```bash
# Create installation directory
sudo mkdir -p /opt/truststram
cd /opt/truststram

# Download and extract TrustStram
wget https://releases.truststram.com/v4.4.0/truststram-4.4.0-linux-amd64.tar.gz
tar -xzf truststram-4.4.0-linux-amd64.tar.gz

# Set permissions
sudo chown -R truststram:truststram /opt/truststram
sudo chmod +x /opt/truststram/bin/*

# Create systemd service
sudo cp config/systemd/truststram.service /etc/systemd/system/
sudo systemctl daemon-reload
```

## Docker Deployment

### Single Node Docker Setup
```bash
# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  truststram-api:
    image: truststram/api:4.4.0
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/truststram
      - REDIS_URL=redis://redis:6379
      - ENVIRONMENT=production
    volumes:
      - truststram-data:/var/lib/truststram
      - ./config:/etc/truststram
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  truststram-worker:
    image: truststram/worker:4.4.0
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/truststram
      - REDIS_URL=redis://redis:6379
    volumes:
      - truststram-data:/var/lib/truststram
      - ./config:/etc/truststram
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    deploy:
      replicas: 3

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=truststram
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=secure_password
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - truststram-api
    restart: unless-stopped

volumes:
  truststram-data:
  postgres-data:
  redis-data:
EOF

# Start services
docker-compose up -d

# Verify deployment
docker-compose ps
docker-compose logs truststram-api
```

### Docker Swarm Setup
```bash
# Initialize Docker Swarm
docker swarm init

# Create overlay network
docker network create -d overlay truststram-network

# Deploy stack
docker stack deploy -c docker-compose.yml truststram

# Scale services
docker service scale truststram_truststram-worker=5
```

## Kubernetes Deployment

### Prerequisites
```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm
curl https://get.helm.sh/helm-v3.13.0-linux-amd64.tar.gz | tar -xz
sudo mv linux-amd64/helm /usr/local/bin/helm

# Add TrustStram Helm repository
helm repo add truststram https://charts.truststram.com
helm repo update
```

### Kubernetes Manifests
```yaml
# truststram-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: truststram
  labels:
    name: truststram

---
# truststram-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: truststram-config
  namespace: truststram
data:
  DATABASE_URL: "postgresql://user:password@postgres:5432/truststram"
  REDIS_URL: "redis://redis:6379"
  ENVIRONMENT: "production"
  LOG_LEVEL: "info"

---
# truststram-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: truststram-secrets
  namespace: truststram
type: Opaque
data:
  database-password: <base64-encoded-password>
  jwt-secret: <base64-encoded-jwt-secret>
  encryption-key: <base64-encoded-encryption-key>

---
# truststram-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: truststram-api
  namespace: truststram
spec:
  replicas: 3
  selector:
    matchLabels:
      app: truststram-api
  template:
    metadata:
      labels:
        app: truststram-api
    spec:
      containers:
      - name: truststram-api
        image: truststram/api:4.4.0
        ports:
        - containerPort: 8080
        envFrom:
        - configMapRef:
            name: truststram-config
        - secretRef:
            name: truststram-secrets
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5

---
# truststram-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: truststram-api-service
  namespace: truststram
spec:
  selector:
    app: truststram-api
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP

---
# truststram-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: truststram-ingress
  namespace: truststram
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - api.truststram.com
    secretName: truststram-tls
  rules:
  - host: api.truststram.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: truststram-api-service
            port:
              number: 80
```

### Deploy to Kubernetes
```bash
# Apply manifests
kubectl apply -f truststram-namespace.yaml
kubectl apply -f truststram-configmap.yaml
kubectl apply -f truststram-secret.yaml
kubectl apply -f truststram-deployment.yaml
kubectl apply -f truststram-service.yaml
kubectl apply -f truststram-ingress.yaml

# Or use Helm chart
helm install truststram truststram/truststram \
  --namespace truststram \
  --create-namespace \
  --set image.tag=4.4.0 \
  --set replicaCount=3 \
  --set database.host=postgres.truststram.svc.cluster.local

# Verify deployment
kubectl get pods -n truststram
kubectl get services -n truststram
kubectl get ingress -n truststram
```

## Cloud Provider Setup

### AWS Deployment
```bash
# Create EKS cluster
eksctl create cluster --name truststram-cluster \
  --version 1.28 \
  --region us-west-2 \
  --nodegroup-name standard-workers \
  --node-type m5.xlarge \
  --nodes 3 \
  --nodes-min 1 \
  --nodes-max 10 \
  --managed

# Configure RDS database
aws rds create-db-instance \
  --db-instance-identifier truststram-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.4 \
  --allocated-storage 100 \
  --storage-type gp2 \
  --db-name truststram \
  --master-username truststram \
  --master-user-password SecurePassword123

# Create ElastiCache Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id truststram-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1

# Deploy using Terraform
cat > main.tf << 'EOF'
provider "aws" {
  region = "us-west-2"
}

module "truststram" {
  source = "github.com/truststram/terraform-aws-truststram"
  
  cluster_name = "truststram-production"
  environment  = "production"
  
  # EKS Configuration
  kubernetes_version = "1.28"
  node_groups = {
    main = {
      instance_types = ["m5.xlarge"]
      min_size      = 3
      max_size      = 10
      desired_size  = 3
    }
  }
  
  # Database Configuration
  database_instance_class = "db.t3.medium"
  database_allocated_storage = 100
  
  # Redis Configuration
  redis_node_type = "cache.t3.micro"
  
  tags = {
    Environment = "production"
    Project     = "truststram"
  }
}
EOF

terraform init
terraform plan
terraform apply
```

### Azure Deployment
```bash
# Create AKS cluster
az aks create \
  --resource-group truststram-rg \
  --name truststram-cluster \
  --kubernetes-version 1.28.0 \
  --node-count 3 \
  --node-vm-size Standard_D4s_v3 \
  --enable-addons monitoring \
  --enable-managed-identity

# Create Azure Database for PostgreSQL
az postgres server create \
  --resource-group truststram-rg \
  --name truststram-db-server \
  --location westus2 \
  --admin-user truststram \
  --admin-password SecurePassword123 \
  --sku-name GP_Gen5_2 \
  --version 15

# Create Azure Cache for Redis
az redis create \
  --resource-group truststram-rg \
  --name truststram-redis \
  --location westus2 \
  --sku Basic \
  --vm-size c0
```

### GCP Deployment
```bash
# Create GKE cluster
gcloud container clusters create truststram-cluster \
  --zone us-central1-a \
  --machine-type n1-standard-4 \
  --num-nodes 3 \
  --enable-autorepair \
  --enable-autoupgrade \
  --enable-autoscaling \
  --min-nodes 1 \
  --max-nodes 10

# Create Cloud SQL instance
gcloud sql instances create truststram-db \
  --database-version POSTGRES_15 \
  --tier db-custom-2-7680 \
  --region us-central1

# Create Memorystore Redis instance
gcloud redis instances create truststram-redis \
  --size 1 \
  --region us-central1 \
  --tier basic
```

## Database Configuration

### PostgreSQL Setup
```sql
-- Create database and user
CREATE DATABASE truststram;
CREATE USER truststram WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE truststram TO truststram;

-- Connect to truststram database
\c truststram;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Configure database settings
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '4GB';
ALTER SYSTEM SET effective_cache_size = '12GB';
ALTER SYSTEM SET work_mem = '64MB';
ALTER SYSTEM SET maintenance_work_mem = '512MB';

-- Reload configuration
SELECT pg_reload_conf();
```

### Database Migration
```bash
# Run database migrations
docker run --rm \
  -e DATABASE_URL=postgresql://user:pass@host:5432/truststram \
  truststram/migrations:4.4.0 \
  migrate up

# Or using the CLI tool
truststram-migrate \
  --database-url postgresql://user:pass@host:5432/truststram \
  --migrations-path /opt/truststram/migrations \
  up
```

### Redis Configuration
```bash
# Redis configuration file
cat > /etc/redis/redis.conf << 'EOF'
# Network
bind 127.0.0.1
port 6379
timeout 300
tcp-keepalive 60

# Memory
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Security
requirepass secure_redis_password

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Performance
tcp-backlog 511
databases 16
EOF

# Start Redis
systemctl restart redis
systemctl enable redis
```

## Security Configuration

### SSL/TLS Certificate Setup
```bash
# Using Let's Encrypt with Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly --nginx \
  -d api.truststram.com \
  -d admin.truststram.com \
  --email admin@truststram.com \
  --agree-tos \
  --non-interactive

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Firewall Configuration
```bash
# Configure UFW firewall
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow TrustStram API
sudo ufw allow 8080/tcp

# Allow database connections (restrict to specific IPs)
sudo ufw allow from 10.0.1.0/24 to any port 5432

# Enable firewall
sudo ufw --force enable
```

### Security Hardening
```bash
# Disable root login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# Configure fail2ban
sudo apt install fail2ban
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log

[truststram-api]
enabled = true
port = 8080
filter = truststram-api
logpath = /var/log/truststram/api.log
maxretry = 5
EOF

# Start fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## Network Configuration

### Load Balancer Setup
```nginx
# /etc/nginx/sites-available/truststram
upstream truststram_backend {
    least_conn;
    server 10.0.1.10:8080 max_fails=3 fail_timeout=30s;
    server 10.0.1.11:8080 max_fails=3 fail_timeout=30s;
    server 10.0.1.12:8080 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name api.truststram.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.truststram.com;

    ssl_certificate /etc/letsencrypt/live/api.truststram.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.truststram.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    location / {
        proxy_pass http://truststram_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /health {
        access_log off;
        proxy_pass http://truststram_backend;
    }
}
```

### DNS Configuration
```bash
# Add DNS records
# A record: api.truststram.com -> Load Balancer IP
# A record: admin.truststram.com -> Load Balancer IP
# CNAME record: www.truststram.com -> api.truststram.com

# Verify DNS propagation
dig api.truststram.com
nslookup api.truststram.com
```

## Initial Configuration

### Environment Configuration
```bash
# Create configuration file
cat > /etc/truststram/config.yaml << 'EOF'
# TrustStram v4.4 Configuration

# Server Configuration
server:
  host: "0.0.0.0"
  port: 8080
  workers: 4
  max_request_size: "100MB"
  request_timeout: 300

# Database Configuration
database:
  url: "postgresql://truststram:password@localhost:5432/truststram"
  pool_size: 20
  max_overflow: 30
  pool_timeout: 30
  pool_recycle: 3600

# Redis Configuration
redis:
  url: "redis://localhost:6379/0"
  pool_size: 10
  timeout: 5

# Security Configuration
security:
  jwt_secret: "your-jwt-secret-key"
  encryption_key: "your-encryption-key"
  session_timeout: 3600
  mfa_enabled: true

# Logging Configuration
logging:
  level: "INFO"
  file: "/var/log/truststram/app.log"
  max_size: "100MB"
  backup_count: 10
  format: "json"

# Monitoring Configuration
monitoring:
  metrics_enabled: true
  metrics_port: 9090
  health_check_interval: 30
  
# Federated Learning Configuration
federated_learning:
  coordinator_port: 8081
  client_timeout: 300
  max_clients: 100
  aggregation_algorithm: "federated_averaging"

# Multi-Cloud Configuration
multi_cloud:
  enabled: true
  primary_provider: "aws"
  backup_providers: ["azure", "gcp"]
  sync_interval: 3600
EOF

# Set proper permissions
sudo chown truststram:truststram /etc/truststram/config.yaml
sudo chmod 640 /etc/truststram/config.yaml
```

### Initial Admin Setup
```bash
# Create initial admin user
truststram-admin create-user \
  --username admin \
  --email admin@truststram.com \
  --password SecureAdminPassword123 \
  --role admin \
  --force-password-change

# Generate API keys
truststram-admin generate-api-key \
  --name "Initial API Key" \
  --user admin \
  --scopes "read,write,admin"

# Set up initial organizations
truststram-admin create-organization \
  --name "Default Organization" \
  --admin admin
```

## Verification and Testing

### Health Checks
```bash
# API health check
curl -f http://localhost:8080/health
curl -f https://api.truststram.com/health

# Database connectivity
truststram-check database

# Redis connectivity
truststram-check redis

# Comprehensive system check
truststram-check all
```

### Load Testing
```bash
# Install Apache Bench
sudo apt install apache2-utils

# Basic load test
ab -n 1000 -c 10 http://localhost:8080/api/v1/models

# Install wrk for advanced testing
sudo apt install wrk

# Advanced load test
wrk -t12 -c400 -d30s --script=test.lua http://localhost:8080/api/v1/predict
```

### Integration Testing
```bash
# Run integration test suite
docker run --rm \
  -e API_URL=https://api.truststram.com \
  -e API_KEY=your-api-key \
  truststram/integration-tests:4.4.0

# Custom test scenarios
truststram-test \
  --config test-config.yaml \
  --scenarios authentication,model-training,federated-learning
```

## Troubleshooting

### Common Issues

#### Issue 1: Service Won't Start
```bash
# Check service status
systemctl status truststram

# Check logs
journalctl -u truststram -f

# Check configuration
truststram-config validate

# Common solutions:
# 1. Check database connectivity
# 2. Verify configuration file syntax
# 3. Ensure proper file permissions
# 4. Check port availability
```

#### Issue 2: Database Connection Failed
```bash
# Test database connection
pg_isready -h localhost -p 5432 -U truststram

# Check PostgreSQL status
systemctl status postgresql

# Verify credentials
psql -h localhost -U truststram -d truststram

# Check firewall rules
sudo ufw status | grep 5432
```

#### Issue 3: High Memory Usage
```bash
# Check memory usage
free -h
top -p $(pgrep truststram)

# Analyze memory usage
truststram-debug memory-profile

# Potential solutions:
# 1. Adjust worker processes
# 2. Increase available memory
# 3. Optimize database queries
# 4. Configure garbage collection
```

#### Issue 4: SSL Certificate Issues
```bash
# Verify certificate
openssl x509 -in /etc/letsencrypt/live/api.truststram.com/fullchain.pem -text -noout

# Test SSL configuration
openssl s_client -connect api.truststram.com:443

# Renew certificate
certbot renew --dry-run
```

### Diagnostic Commands
```bash
# System information
truststram-info system

# Configuration dump
truststram-config dump

# Performance metrics
truststram-metrics export

# Log analysis
truststram-logs analyze --since "1 hour ago"

# Network diagnostics
truststram-network test

# Database diagnostics
truststram-database analyze
```

### Log Locations
```bash
# Application logs
/var/log/truststram/app.log
/var/log/truststram/error.log
/var/log/truststram/audit.log

# System logs
/var/log/syslog
/var/log/auth.log

# Database logs
/var/log/postgresql/postgresql-15-main.log

# Nginx logs
/var/log/nginx/access.log
/var/log/nginx/error.log

# Docker logs (if using containers)
docker logs truststram-api
docker logs truststram-worker
```

### Support Resources
- **Installation Support**: install-support@truststram.com
- **Documentation**: https://docs.truststram.com/installation
- **Community Forum**: https://community.truststram.com
- **Emergency Support**: +1-800-TRUSTSTRAM

---

**Next Steps**: After successful installation, proceed to the [Monitoring and Maintenance Guide](monitoring_maintenance_guide.md) to set up ongoing operations and monitoring.