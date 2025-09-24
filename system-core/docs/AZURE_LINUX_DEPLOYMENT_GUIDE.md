# TrustStream v4.1 Azure Linux Deployment Guide

**Version**: 4.1.0  
**Target Platform**: Azure Linux (Ubuntu 20.04/22.04 LTS)  
**Author**: MiniMax Agent  
**Date**: 2025-09-19

## Overview

This guide provides step-by-step instructions for deploying TrustStream v4.1 on Azure Linux environment. TrustStream v4.1 is a production-ready, security-hardened version with comprehensive bug fixes and performance optimizations.

## Prerequisites

### System Requirements
- **OS**: Ubuntu 20.04 LTS or 22.04 LTS
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: Minimum 20GB free space
- **CPU**: 2+ cores recommended
- **Network**: Open ports 80, 443, 3000

### Required Azure Services
- **Azure Virtual Machine** (Standard_B2s or higher)
- **Azure Database for PostgreSQL** (optional, if not using Supabase)
- **Azure Container Registry** (for Docker deployment)
- **Azure Application Gateway** (for load balancing)
- **Azure Key Vault** (for secrets management)

### Software Dependencies
- Node.js 18.x or higher
- npm 8.x or higher
- Docker 20.x or higher
- Git
- curl
- unzip

## Pre-Deployment Setup

### 1. Create Azure Virtual Machine

```bash
# Create resource group
az group create --name truststream-rg --location "East US"

# Create VM with Ubuntu 22.04 LTS
az vm create \
  --resource-group truststream-rg \
  --name truststream-vm \
  --image Ubuntu2204 \
  --size Standard_B2ms \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-sku Standard

# Open required ports
az vm open-port --port 80 --resource-group truststream-rg --name truststream-vm
az vm open-port --port 443 --resource-group truststream-rg --name truststream-vm
az vm open-port --port 3000 --resource-group truststream-rg --name truststream-vm
```

### 2. Connect to VM and Update System

```bash
# SSH into the VM (replace with your public IP)
ssh azureuser@YOUR_VM_PUBLIC_IP

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip build-essential
```

### 3. Install Node.js and npm

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 8.x.x or higher
```

### 4. Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Verify Docker installation
docker --version
```

## Deployment Methods

### Method 1: Direct Node.js Deployment (Recommended for Development)

#### Step 1: Upload and Extract Package

```bash
# Create application directory
sudo mkdir -p /opt/truststream
sudo chown $USER:$USER /opt/truststream
cd /opt/truststream

# Upload the package (replace with your method)
# Option A: SCP from local machine
# scp truststream-v4.1-production.tar.gz azureuser@YOUR_VM_IP:/opt/truststream/

# Option B: Download from storage
# wget "YOUR_DOWNLOAD_URL" -O truststream-v4.1-production.tar.gz

# Extract the package
tar -xzf truststream-v4.1-production.tar.gz
cd truststream-v4.1-production
```

#### Step 2: Environment Configuration

```bash
# Copy environment template
cp environment/.env.example .env

# Edit environment variables
nano .env
```

**Required Environment Variables:**
```bash
# Application Settings
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Security Settings
JWT_SECRET=your_secure_jwt_secret_256_bits_minimum
API_KEY=your_secure_api_key_for_edge_functions
ENCRYPTION_KEY=your_32_character_encryption_key

# Azure Specific (Optional)
AZURE_STORAGE_CONNECTION_STRING=your_azure_storage_connection
AZURE_KEY_VAULT_URL=https://your-keyvault.vault.azure.net/

# Monitoring (Optional)
AZURE_APPLICATION_INSIGHTS_CONNECTION_STRING=your_insights_connection

# Database (if using external PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/database

# Redis (Optional, for caching)
REDIS_URL=redis://localhost:6379
```

#### Step 3: Install Dependencies and Build

```bash
# Install dependencies
npm install --production

# Build admin interfaces
npm run build

# Run tests (optional)
npm test
```

#### Step 4: Configure Supabase

```bash
# Install Supabase CLI
npm install -g @supabase/cli

# Login to Supabase (follow prompts)
supabase login

# Deploy edge functions
npm run supabase:functions:deploy

# Push database migrations
npm run supabase:db:push
```

#### Step 5: Start Application

```bash
# Start application
npm start

# Or use PM2 for production
npm install -g pm2
pm2 start server.js --name "truststream-v4.1"
pm2 startup
pm2 save
```

### Method 2: Docker Deployment (Recommended for Production)

#### Step 1: Prepare Docker Environment

```bash
cd /opt/truststream/truststream-v4.1-production

# Build Docker image
docker build -t truststream-v4.1:latest .

# Verify image
docker images | grep truststream
```

#### Step 2: Configure Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  app:
    image: truststream-v4.1:latest
    container_name: truststream-app
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    volumes:
      - ./logs:/app/logs
      - ./uploads:/app/uploads
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    container_name: truststream-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: truststream-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:
```

#### Step 3: Configure Nginx

Create `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    upstream app {
        server app:3000;
    }

    server {
        listen 80;
        server_name _;

        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name _;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

        # API routes with rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static content
        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check
        location /health {
            proxy_pass http://app/health;
            access_log off;
        }
    }
}
```

#### Step 4: Generate SSL Certificates

```bash
# Create SSL directory
mkdir -p ssl

# Option A: Self-signed certificates (development)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ssl/key.pem \
    -out ssl/cert.pem \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Option B: Let's Encrypt (production with domain)
# sudo apt install certbot python3-certbot-nginx
# sudo certbot --nginx -d your-domain.com
```

#### Step 5: Deploy with Docker Compose

```bash
# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f app
```

## Post-Deployment Configuration

### 1. Configure Azure Application Gateway (Load Balancer)

```bash
# Create Application Gateway
az network application-gateway create \
    --name truststream-agw \
    --location "East US" \
    --resource-group truststream-rg \
    --sku Standard_v2 \
    --capacity 2 \
    --vnet-name truststream-vnet \
    --subnet truststream-subnet \
    --public-ip-address truststream-pip \
    --servers YOUR_VM_PRIVATE_IP
```

### 2. Set Up Monitoring

```bash
# Install Azure Monitor agent
wget https://aka.ms/azcmagent -O ~/azcmagent.sh
bash ~/azcmagent.sh

# Configure Application Insights (add to .env)
echo "AZURE_APPLICATION_INSIGHTS_CONNECTION_STRING=your_connection_string" >> .env
```

### 3. Configure Backup

```bash
# Create backup script
cat > /opt/truststream/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/truststream"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup application
tar -czf $BACKUP_DIR/truststream_$DATE.tar.gz -C /opt/truststream .

# Backup database (if using local PostgreSQL)
# pg_dump database_name > $BACKUP_DIR/database_$DATE.sql

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -name "truststream_*.tar.gz" -mtime +7 -delete

echo "Backup completed: truststream_$DATE.tar.gz"
EOF

chmod +x /opt/truststream/backup.sh

# Add to crontab (daily backup at 2 AM)
echo "0 2 * * * /opt/truststream/backup.sh" | crontab -
```

## Health Checks and Monitoring

### 1. Application Health Check

```bash
# Manual health check
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","timestamp":"2025-09-19T17:03:23.000Z","version":"4.1.0"}
```

### 2. Service Status Check

```bash
# Check application status
pm2 status  # For PM2 deployment
# OR
docker-compose -f docker-compose.prod.yml ps  # For Docker deployment

# Check system resources
htop
df -h
free -h
```

### 3. Log Monitoring

```bash
# Application logs
tail -f /opt/truststream/truststream-v4.1-production/logs/app.log

# Docker logs
docker logs -f truststream-app

# System logs
sudo journalctl -u docker -f
```

## Security Hardening

### 1. Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

### 2. Security Updates

```bash
# Enable automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# Configure automatic updates
echo 'Unattended-Upgrade::Automatic-Reboot "false";' | sudo tee -a /etc/apt/apt.conf.d/50unattended-upgrades
```

### 3. Fail2ban Configuration

```bash
# Install fail2ban
sudo apt install fail2ban

# Configure fail2ban for SSH and nginx
sudo cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
EOF

sudo systemctl restart fail2ban
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using port 3000
sudo netstat -tulpn | grep :3000
sudo lsof -i :3000

# Kill process if needed
sudo kill -9 <PID>
```

#### 2. Permission Issues
```bash
# Fix file permissions
sudo chown -R $USER:$USER /opt/truststream
chmod +x /opt/truststream/truststream-v4.1-production/scripts/*.sh
```

#### 3. Memory Issues
```bash
# Check memory usage
free -h
top

# Increase swap if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

#### 4. Docker Issues
```bash
# Restart Docker service
sudo systemctl restart docker

# Clean Docker system
docker system prune -a

# Rebuild image
docker build --no-cache -t truststream-v4.1:latest .
```

### Log Analysis

```bash
# Application errors
grep -i error /opt/truststream/truststream-v4.1-production/logs/app.log

# Docker container logs
docker logs truststream-app 2>&1 | grep -i error

# System logs
sudo journalctl --since "1 hour ago" | grep -i error
```

## Performance Optimization

### 1. Node.js Optimization

```bash
# Set Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Add to .env file
echo "NODE_OPTIONS=--max-old-space-size=4096" >> .env
```

### 2. Database Optimization

```bash
# For PostgreSQL connection pooling
echo "DATABASE_POOL_SIZE=20" >> .env
echo "DATABASE_POOL_TIMEOUT=30000" >> .env
```

### 3. Caching Configuration

```bash
# Redis cache settings
echo "REDIS_TTL=3600" >> .env
echo "CACHE_ENABLED=true" >> .env
```

## Maintenance

### Regular Maintenance Tasks

1. **Daily**:
   - Check application health
   - Review error logs
   - Monitor system resources

2. **Weekly**:
   - Update security patches
   - Review performance metrics
   - Clean up old logs

3. **Monthly**:
   - Full system backup
   - Security audit
   - Performance optimization review

### Update Procedure

```bash
# 1. Backup current version
cp -r /opt/truststream/truststream-v4.1-production /opt/backups/truststream-v4.1-backup-$(date +%Y%m%d)

# 2. Stop application
pm2 stop truststream-v4.1
# OR
docker-compose -f docker-compose.prod.yml down

# 3. Deploy new version
# Extract new package and follow deployment steps

# 4. Test new version
npm test
curl http://localhost:3000/health

# 5. Start application
pm2 start truststream-v4.1
# OR
docker-compose -f docker-compose.prod.yml up -d
```

## Support and Documentation

### Important Files
- `/opt/truststream/truststream-v4.1-production/README.md` - Application documentation
- `/opt/truststream/truststream-v4.1-production/docs/` - Detailed documentation
- `/opt/truststream/truststream-v4.1-production/.env` - Environment configuration
- `/opt/truststream/truststream-v4.1-production/logs/` - Application logs

### Useful Commands
```bash
# Quick status check
npm run health

# View configuration
cat .env

# Test deployment
npm run verify

# View all processes
pm2 monit
```

### Additional Resources
- [TrustStream Documentation](./docs/)
- [Supabase Documentation](https://supabase.com/docs)
- [Azure Documentation](https://docs.microsoft.com/azure/)
- [Docker Documentation](https://docs.docker.com/)

---

## Conclusion

This deployment guide provides comprehensive instructions for deploying TrustStream v4.1 on Azure Linux. The application is now production-ready with security hardening, performance optimization, and proper monitoring.

For support or questions, refer to the documentation in the `docs/` directory or check the application logs for detailed error information.

**Deployment Checklist:**
- [ ] Azure VM created and configured
- [ ] Dependencies installed (Node.js, Docker)
- [ ] Application deployed
- [ ] Environment variables configured
- [ ] Supabase services deployed
- [ ] SSL certificates configured
- [ ] Monitoring enabled
- [ ] Backups configured
- [ ] Security hardening applied
- [ ] Health checks passing

**Version**: TrustStream v4.1.0  
**Status**: Production Ready  
**Last Updated**: 2025-09-19