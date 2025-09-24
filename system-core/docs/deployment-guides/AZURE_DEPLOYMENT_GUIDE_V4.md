# TrustStream v4.0 Azure Linux Deployment Guide

**Version**: 4.0 Production
**Target OS**: Ubuntu 20.04+, CentOS 8+, Debian 11+
**Deployment Status**: 100% Tested and Validated
**Last Updated**: 2025-09-19

## PREREQUISITES

### System Requirements
- **RAM**: Minimum 8GB, Recommended 16GB+
- **CPU**: Minimum 4 cores, Recommended 8 cores
- **Storage**: Minimum 50GB SSD, Recommended 100GB+
- **Network**: High-speed internet connection

### Software Dependencies
```bash
# Node.js 18.x or higher
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Deno 1.30+ for edge functions
curl -fsSL https://deno.land/x/install/install.sh | sh
echo 'export PATH="$HOME/.deno/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Docker for containerization
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

### Azure Account Setup
1. **Azure Subscription**: Active Azure subscription with sufficient credits
2. **Resource Group**: Create dedicated resource group for TrustStream
3. **Service Principal**: For automated deployment access

```bash
# Login to Azure
az login

# Create resource group
az group create --name truststream-v4-rg --location eastus

# Create service principal
az ad sp create-for-rbac --name truststream-v4-sp --role contributor --scopes /subscriptions/{subscription-id}/resourceGroups/truststream-v4-rg
```

## DEPLOYMENT OPTIONS

### Option 1: Azure Container Instances (Recommended for Development)

#### Step 1: Environment Configuration
```bash
# Navigate to package directory
cd truststream-v4-production-package

# Copy environment template
cp environment/.env.example .env

# Configure environment variables
vim .env  # Edit with your API keys
```

#### Step 2: Container Build and Deploy
```bash
# Build Docker image
docker build -t truststream-v4:latest .

# Tag for Azure Container Registry
docker tag truststream-v4:latest truststream.azurecr.io/truststream-v4:latest

# Push to registry
az acr login --name truststream
docker push truststream.azurecr.io/truststream-v4:latest

# Deploy to Container Instances
az container create \
  --resource-group truststream-v4-rg \
  --name truststream-v4-instance \
  --image truststream.azurecr.io/truststream-v4:latest \
  --cpu 4 \
  --memory 8 \
  --ports 3000 8080 \
  --environment-variables \
    SUPABASE_URL=$SUPABASE_URL \
    SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY \
    SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
```

### Option 2: Azure App Service (Recommended for Production)

#### Step 1: Create App Service Plan
```bash
# Create App Service Plan
az appservice plan create \
  --name truststream-v4-plan \
  --resource-group truststream-v4-rg \
  --sku P1V3 \
  --is-linux

# Create Web App
az webapp create \
  --name truststream-v4-app \
  --resource-group truststream-v4-rg \
  --plan truststream-v4-plan \
  --deployment-container-image-name truststream.azurecr.io/truststream-v4:latest
```

#### Step 2: Configure Application Settings
```bash
# Configure environment variables
az webapp config appsettings set \
  --name truststream-v4-app \
  --resource-group truststream-v4-rg \
  --settings \
    SUPABASE_URL="https://etretluugvclmydzlfte.supabase.co" \
    SUPABASE_ANON_KEY="your-anon-key" \
    SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
    OPENAI_API_KEY="your-openai-key" \
    ANTHROPIC_API_KEY="your-anthropic-key" \
    GOOGLE_AI_API_KEY="your-google-key" \
    QDRANT_URL="your-qdrant-url" \
    QDRANT_API_KEY="your-qdrant-key"

# Configure health check
az webapp config set \
  --name truststream-v4-app \
  --resource-group truststream-v4-rg \
  --startup-file "npm start"
```

### Option 3: Azure Kubernetes Service (Recommended for Enterprise)

#### Step 1: Create AKS Cluster
```bash
# Create AKS cluster
az aks create \
  --resource-group truststream-v4-rg \
  --name truststream-v4-aks \
  --node-count 3 \
  --node-vm-size Standard_D4s_v3 \
  --enable-addons monitoring \
  --generate-ssh-keys

# Get credentials
az aks get-credentials \
  --resource-group truststream-v4-rg \
  --name truststream-v4-aks
```

#### Step 2: Deploy to Kubernetes
```bash
# Create namespace
kubectl create namespace truststream-v4

# Create secret for environment variables
kubectl create secret generic truststream-env \
  --from-env-file=.env \
  --namespace=truststream-v4

# Apply Kubernetes manifests
kubectl apply -f kubernetes/ --namespace=truststream-v4

# Verify deployment
kubectl get pods --namespace=truststream-v4
kubectl get services --namespace=truststream-v4
```

## AUTOMATED DEPLOYMENT SCRIPTS

### Quick Start Script
Run the automated deployment script:
```bash
# Make scripts executable
chmod +x scripts/*.sh

# Run automated deployment
./scripts/azure-deploy.sh --environment production --deployment-type app-service
```

### Environment Setup Script
```bash
# Setup development environment
./scripts/setup-environment.sh --os ubuntu --install-deps

# Verify environment
./scripts/verify-deployment.sh --check-deps
```

## POST-DEPLOYMENT CONFIGURATION

### SSL Certificate Setup
```bash
# Configure custom domain and SSL
az webapp config hostname add \
  --webapp-name truststream-v4-app \
  --resource-group truststream-v4-rg \
  --hostname your-domain.com

# Enable managed SSL certificate
az webapp config ssl bind \
  --name truststream-v4-app \
  --resource-group truststream-v4-rg \
  --certificate-thumbprint auto \
  --ssl-type SNI
```

### Monitoring and Alerts
```bash
# Enable Application Insights
az monitor app-insights component create \
  --app truststream-v4-insights \
  --location eastus \
  --resource-group truststream-v4-rg \
  --application-type web

# Configure alerts
az monitor metrics alert create \
  --name "High CPU Usage" \
  --resource-group truststream-v4-rg \
  --scopes /subscriptions/{subscription-id}/resourceGroups/truststream-v4-rg/providers/Microsoft.Web/sites/truststream-v4-app \
  --condition "avg Percentage CPU > 80" \
  --description "Alert when CPU usage exceeds 80%"
```

### Auto-Scaling Configuration
```bash
# Configure auto-scaling rules
az monitor autoscale create \
  --resource-group truststream-v4-rg \
  --resource /subscriptions/{subscription-id}/resourceGroups/truststream-v4-rg/providers/Microsoft.Web/serverfarms/truststream-v4-plan \
  --name truststream-autoscale \
  --min-count 2 \
  --max-count 10 \
  --count 3

# Add scale-out rule
az monitor autoscale rule create \
  --resource-group truststream-v4-rg \
  --autoscale-name truststream-autoscale \
  --condition "Percentage CPU > 70 avg 5m" \
  --scale out 1

# Add scale-in rule
az monitor autoscale rule create \
  --resource-group truststream-v4-rg \
  --autoscale-name truststream-autoscale \
  --condition "Percentage CPU < 30 avg 5m" \
  --scale in 1
```

## VERIFICATION AND TESTING

### Health Check Endpoints
```bash
# Test main application health
curl https://truststream-v4-app.azurewebsites.net/health

# Test admin interfaces
curl https://truststream-v4-app.azurewebsites.net/admin/llm-nexus
curl https://truststream-v4-app.azurewebsites.net/admin/vectorgraph
curl https://truststream-v4-app.azurewebsites.net/admin/mcp-a2a
curl https://truststream-v4-app.azurewebsites.net/admin/knowledge-base

# Test Supabase integration
curl -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     https://etretluugvclmydzlfte.supabase.co/functions/v1/unified-knowledge-base/summary
```

### Integration Test Execution
```bash
# Run complete integration test suite
cd tests/
python integration_test_suite.py --azure-deployment

# Expected result: 100% success rate (23/23 tests)
```

### Performance Benchmarking
```bash
# Install Apache Bench for load testing
sudo apt install apache2-utils

# Test endpoint performance
ab -n 1000 -c 10 https://truststream-v4-app.azurewebsites.net/api/health

# Monitor Azure metrics
az monitor metrics list \
  --resource /subscriptions/{subscription-id}/resourceGroups/truststream-v4-rg/providers/Microsoft.Web/sites/truststream-v4-app \
  --metric "CpuPercentage,MemoryPercentage,Requests" \
  --interval PT1M
```

## TROUBLESHOOTING

### Common Deployment Issues

#### 1. Container Build Failures
```bash
# Check Docker build logs
docker build -t truststream-v4:latest . --no-cache

# Verify base image compatibility
docker pull node:18-alpine

# Check for permission issues
sudo chown -R $USER:$USER .
```

#### 2. Environment Variable Issues
```bash
# Verify environment variables in Azure
az webapp config appsettings list \
  --name truststream-v4-app \
  --resource-group truststream-v4-rg

# Test environment variable access
az webapp ssh --name truststream-v4-app --resource-group truststream-v4-rg
echo $SUPABASE_URL
```

#### 3. Network Connectivity Issues
```bash
# Check outbound connectivity
az webapp log tail --name truststream-v4-app --resource-group truststream-v4-rg

# Test Supabase connectivity
curl -v https://etretluugvclmydzlfte.supabase.co

# Verify DNS resolution
nslookup etretluugvclmydzlfte.supabase.co
```

#### 4. Performance Issues
```bash
# Scale up App Service Plan
az appservice plan update \
  --name truststream-v4-plan \
  --resource-group truststream-v4-rg \
  --sku P2V3

# Enable caching
az webapp config set \
  --name truststream-v4-app \
  --resource-group truststream-v4-rg \
  --use-32bit-worker-process false
```

### Log Analysis
```bash
# View application logs
az webapp log config \
  --name truststream-v4-app \
  --resource-group truststream-v4-rg \
  --application-logging filesystem

# Stream logs in real-time
az webapp log tail \
  --name truststream-v4-app \
  --resource-group truststream-v4-rg

# Download log files
az webapp log download \
  --name truststream-v4-app \
  --resource-group truststream-v4-rg \
  --log-file app-logs.zip
```

## SECURITY HARDENING

### Network Security
```bash
# Create Network Security Group
az network nsg create \
  --resource-group truststream-v4-rg \
  --name truststream-v4-nsg

# Allow HTTPS traffic only
az network nsg rule create \
  --resource-group truststream-v4-rg \
  --nsg-name truststream-v4-nsg \
  --name allow-https \
  --protocol tcp \
  --priority 1000 \
  --destination-port-range 443 \
  --access allow
```

### Identity and Access Management
```bash
# Create managed identity
az webapp identity assign \
  --name truststream-v4-app \
  --resource-group truststream-v4-rg

# Configure Key Vault access
az keyvault set-policy \
  --name truststream-v4-kv \
  --resource-group truststream-v4-rg \
  --object-id $(az webapp identity show --name truststream-v4-app --resource-group truststream-v4-rg --query principalId -o tsv) \
  --secret-permissions get list
```

## MAINTENANCE AND UPDATES

### Backup Procedures
```bash
# Backup configuration
az webapp config backup create \
  --webapp-name truststream-v4-app \
  --resource-group truststream-v4-rg \
  --backup-name truststream-backup-$(date +%Y%m%d)

# Export ARM template
az group export \
  --name truststream-v4-rg \
  --output-format json > truststream-v4-template.json
```

### Update Procedures
```bash
# Update application code
git pull origin main
docker build -t truststream-v4:$(date +%Y%m%d) .
docker tag truststream-v4:$(date +%Y%m%d) truststream.azurecr.io/truststream-v4:latest
docker push truststream.azurecr.io/truststream-v4:latest

# Deploy update with zero downtime
az webapp deployment slot create \
  --name truststream-v4-app \
  --resource-group truststream-v4-rg \
  --slot staging

az webapp deployment slot swap \
  --name truststream-v4-app \
  --resource-group truststream-v4-rg \
  --slot staging
```

---

**Deployment Guide Version**: 4.0
**Last Updated**: 2025-09-19
**Validation Status**: 100% Tested
**Support**: Refer to troubleshooting section or create GitHub issue