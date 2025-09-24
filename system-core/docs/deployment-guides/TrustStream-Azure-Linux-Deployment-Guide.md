# TrustStream AI Agent Builder - Azure Linux Deployment Guide

**Version:** v3.2.0  
**Target Environment:** Linux + Azure Cloud  
**Author:** MiniMax Agent  
**Date:** 2025-09-18  

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Azure Services Setup](#azure-services-setup)
4. [Environment Preparation](#environment-preparation)
5. [Deployment Process](#deployment-process)
6. [Configuration Management](#configuration-management)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)
10. [Scaling & Performance](#scaling--performance)

---

## Overview

This guide provides step-by-step instructions for deploying the TrustStream AI Agent Builder platform on Azure using Linux-based services. The deployment includes:

- **Frontend Applications**: Next.js applications hosted on Azure App Service
- **Backend Services**: Supabase integration with Azure PostgreSQL
- **Edge Functions**: Serverless functions for AI processing
- **Storage**: Azure Blob Storage for file management
- **Monitoring**: Azure Application Insights integration

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Azure App     │    │   Azure         │    │   Supabase      │
│   Service       │◄──►│   PostgreSQL    │◄──►│   Functions     │
│   (Frontend)    │    │   (Database)    │    │   (Backend)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                       │                       │
          ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Azure Blob    │    │   Azure App     │    │   Azure         │
│   Storage       │    │   Insights      │    │   Key Vault     │
│   (Files)       │    │   (Monitoring)  │    │   (Secrets)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## Prerequisites

### System Requirements

#### Linux Environment
- **OS**: Ubuntu 20.04 LTS or later / CentOS 8+ / Amazon Linux 2
- **Memory**: Minimum 4GB RAM (8GB recommended)
- **Storage**: 20GB available disk space
- **Network**: Stable internet connection with outbound HTTPS access

#### Required Software
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install additional dependencies
sudo apt-get install -y git curl wget unzip build-essential
```

#### Azure Prerequisites
- **Azure Subscription**: Active Azure subscription with billing enabled
- **Azure CLI**: Latest version installed and configured
- **Permissions**: Contributor role or higher on target resource group

### Azure CLI Setup
```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login to Azure
az login

# Set subscription (replace with your subscription ID)
az account set --subscription "your-subscription-id"

# Verify login
az account show
```

---

## Azure Services Setup

### 1. Resource Group Creation

```bash
# Set variables
RESOURCE_GROUP="truststream-rg"
LOCATION="eastus"
APP_NAME="truststream-app"

# Create resource group
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION
```

### 2. Azure App Service Plan

```bash
# Create App Service Plan (Linux-based)
az appservice plan create \
  --name "${APP_NAME}-plan" \
  --resource-group $RESOURCE_GROUP \
  --sku P1V2 \
  --is-linux \
  --location $LOCATION
```

### 3. Azure PostgreSQL Database

```bash
# Create PostgreSQL Flexible Server
az postgres flexible-server create \
  --name "${APP_NAME}-db" \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --admin-user truststream_admin \
  --admin-password "YourSecurePassword123!" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 14
```

### 4. Azure Blob Storage

```bash
# Create Storage Account
az storage account create \
  --name "${APP_NAME}storage" \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2

# Create container for uploads
az storage container create \
  --name uploads \
  --account-name "${APP_NAME}storage" \
  --public-access blob
```

### 5. Azure Key Vault

```bash
# Create Key Vault for secrets management
az keyvault create \
  --name "${APP_NAME}-keyvault" \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION
```

### 6. Azure Application Insights

```bash
# Create Application Insights
az monitor app-insights component create \
  --app "${APP_NAME}-insights" \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP \
  --application-type web
```

---

## Environment Preparation

### 1. Download and Extract TrustStream Package

```bash
# Create deployment directory
mkdir -p ~/truststream-deployment
cd ~/truststream-deployment

# Extract the TrustStream package
unzip TrustStream-v3.2.0-Production-Complete.zip
cd TrustStream-v3.2.0-Production-Complete
```

### 2. Install Dependencies

```bash
# Install frontend dependencies
cd frontend
npm install --production

# Install backend dependencies (if any)
cd ../backend
npm install --production

# Return to root
cd ..
```

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env.production

# Edit environment variables
nano .env.production
```

#### Required Environment Variables

```bash
# Database Configuration
DATABASE_URL="postgresql://truststream_admin:YourSecurePassword123!@truststream-app-db.postgres.database.azure.com:5432/postgres"

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="your-supabase-project-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# Azure Storage
AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=truststreamappstorage;AccountKey=your-key;EndpointSuffix=core.windows.net"

# Application Insights
NEXT_PUBLIC_APPINSIGHTS_CONNECTION_STRING="InstrumentationKey=your-instrumentation-key"

# Security
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="https://your-app-name.azurewebsites.net"
```

---

## Deployment Process

### 1. Frontend Application Deployment

#### Option A: Azure App Service (Recommended)

```bash
# Build the application
cd frontend
npm run build

# Create Web App
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan "${APP_NAME}-plan" \
  --name "${APP_NAME}-frontend" \
  --runtime "NODE|18-lts"

# Configure Node.js settings
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name "${APP_NAME}-frontend" \
  --settings \
    SCM_DO_BUILD_DURING_DEPLOYMENT=true \
    WEBSITE_NODE_DEFAULT_VERSION=18.17.0

# Deploy using ZIP
zip -r ../deployment.zip . -x "node_modules/*" ".next/*"
az webapp deployment source config-zip \
  --resource-group $RESOURCE_GROUP \
  --name "${APP_NAME}-frontend" \
  --src ../deployment.zip
```

#### Option B: Azure Container Instances

```bash
# Create Dockerfile (if not present)
cat > Dockerfile << EOF
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
EOF

# Build and push to Azure Container Registry
az acr create --resource-group $RESOURCE_GROUP --name "${APP_NAME}acr" --sku Basic
az acr build --registry "${APP_NAME}acr" --image truststream:latest .

# Deploy to Container Instances
az container create \
  --resource-group $RESOURCE_GROUP \
  --name "${APP_NAME}-container" \
  --image "${APP_NAME}acr.azurecr.io/truststream:latest" \
  --ports 3000 \
  --dns-name-label "${APP_NAME}" \
  --environment-variables \
    NODE_ENV=production
```

### 2. Database Migration

```bash
# Connect to Azure PostgreSQL
psql "postgresql://truststream_admin:YourSecurePassword123!@truststream-app-db.postgres.database.azure.com:5432/postgres"

# Run migration scripts
\i database/migrations/001_initial_schema.sql
\i database/migrations/002_add_ai_agents.sql
\i database/migrations/003_add_workflows.sql

# Verify tables
\dt
```

### 3. Supabase Edge Functions Deployment

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Deploy edge functions
cd supabase/functions
supabase functions deploy ai-agent-processor
supabase functions deploy workflow-executor
supabase functions deploy data-transformer
```

### 4. Configure Azure Services Integration

#### Storage Account Integration

```bash
# Get storage account connection string
STORAGE_CONNECTION=$(az storage account show-connection-string \
  --name "${APP_NAME}storage" \
  --resource-group $RESOURCE_GROUP \
  --output tsv)

# Update app settings
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name "${APP_NAME}-frontend" \
  --settings AZURE_STORAGE_CONNECTION_STRING="$STORAGE_CONNECTION"
```

#### Application Insights Integration

```bash
# Get instrumentation key
INSIGHTS_KEY=$(az monitor app-insights component show \
  --app "${APP_NAME}-insights" \
  --resource-group $RESOURCE_GROUP \
  --query instrumentationKey \
  --output tsv)

# Update app settings
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name "${APP_NAME}-frontend" \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY="$INSIGHTS_KEY"
```

---

## Configuration Management

### 1. SSL Certificate Setup

```bash
# Enable HTTPS-only
az webapp update \
  --resource-group $RESOURCE_GROUP \
  --name "${APP_NAME}-frontend" \
  --https-only true

# Configure custom domain (optional)
az webapp config hostname add \
  --resource-group $RESOURCE_GROUP \
  --webapp-name "${APP_NAME}-frontend" \
  --hostname your-custom-domain.com
```

### 2. Scaling Configuration

```bash
# Configure auto-scaling
az monitor autoscale create \
  --resource-group $RESOURCE_GROUP \
  --resource "${APP_NAME}-frontend" \
  --resource-type Microsoft.Web/sites \
  --name "${APP_NAME}-autoscale" \
  --min-count 1 \
  --max-count 5 \
  --count 2

# Add scale-out rule
az monitor autoscale rule create \
  --resource-group $RESOURCE_GROUP \
  --autoscale-name "${APP_NAME}-autoscale" \
  --condition "Percentage CPU > 70 avg 5m" \
  --scale out 1
```

### 3. Backup Configuration

```bash
# Configure automated backups
az webapp config backup create \
  --resource-group $RESOURCE_GROUP \
  --webapp-name "${APP_NAME}-frontend" \
  --backup-name daily-backup \
  --container-url "https://${APP_NAME}storage.blob.core.windows.net/backups" \
  --frequency 1440  # Daily
```

---

## Post-Deployment Verification

### 1. Health Check Script

```bash
#!/bin/bash
# health-check.sh

APP_URL="https://${APP_NAME}-frontend.azurewebsites.net"

echo "Performing health checks..."

# Check frontend availability
if curl -f -s "$APP_URL/health" > /dev/null; then
    echo "✅ Frontend is accessible"
else
    echo "❌ Frontend health check failed"
fi

# Check database connectivity
if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Database is accessible"
else
    echo "❌ Database connection failed"
fi

# Check Supabase functions
if curl -f -s "$NEXT_PUBLIC_SUPABASE_URL/functions/v1/ai-agent-processor" > /dev/null; then
    echo "✅ Supabase functions are accessible"
else
    echo "❌ Supabase functions check failed"
fi

echo "Health check completed"
```

### 2. Performance Testing

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Run performance test
ab -n 100 -c 10 "https://${APP_NAME}-frontend.azurewebsites.net/"
```

### 3. Security Verification

```bash
# Check SSL configuration
openssl s_client -connect "${APP_NAME}-frontend.azurewebsites.net:443" -servername "${APP_NAME}-frontend.azurewebsites.net"

# Verify security headers
curl -I "https://${APP_NAME}-frontend.azurewebsites.net/"
```

---

## Monitoring & Maintenance

### 1. Log Management

```bash
# Enable diagnostic logging
az webapp log config \
  --resource-group $RESOURCE_GROUP \
  --name "${APP_NAME}-frontend" \
  --web-server-logging filesystem \
  --detailed-error-messages true \
  --failed-request-tracing true

# Stream logs
az webapp log tail \
  --resource-group $RESOURCE_GROUP \
  --name "${APP_NAME}-frontend"
```

### 2. Monitoring Setup

```bash
# Create alert rules
az monitor metrics alert create \
  --name "High CPU Usage" \
  --resource-group $RESOURCE_GROUP \
  --scopes "/subscriptions/your-subscription-id/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/${APP_NAME}-frontend" \
  --condition "avg Percentage CPU > 80" \
  --description "Alert when CPU usage exceeds 80%"
```

### 3. Backup and Maintenance

```bash
# Database backup script
#!/bin/bash
# backup-database.sh

BACKUP_FILE="truststream-backup-$(date +%Y%m%d-%H%M%S).sql"
pg_dump "$DATABASE_URL" > "$BACKUP_FILE"

# Upload to Azure Storage
az storage blob upload \
  --account-name "${APP_NAME}storage" \
  --container-name backups \
  --name "$BACKUP_FILE" \
  --file "$BACKUP_FILE"

echo "Database backup completed: $BACKUP_FILE"
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Application Won't Start

**Problem**: App Service shows "Application Error"

**Solution**:
```bash
# Check application logs
az webapp log download \
  --resource-group $RESOURCE_GROUP \
  --name "${APP_NAME}-frontend"

# Verify environment variables
az webapp config appsettings list \
  --resource-group $RESOURCE_GROUP \
  --name "${APP_NAME}-frontend"

# Restart the application
az webapp restart \
  --resource-group $RESOURCE_GROUP \
  --name "${APP_NAME}-frontend"
```

#### 2. Database Connection Issues

**Problem**: Cannot connect to PostgreSQL database

**Solution**:
```bash
# Check firewall rules
az postgres flexible-server firewall-rule list \
  --resource-group $RESOURCE_GROUP \
  --name "${APP_NAME}-db"

# Add Azure services to firewall
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name "${APP_NAME}-db" \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

#### 3. Supabase Function Errors

**Problem**: Edge functions returning errors

**Solution**:
```bash
# Check function logs
supabase functions logs ai-agent-processor

# Redeploy functions
supabase functions deploy ai-agent-processor --verify-jwt false
```

#### 4. Storage Access Issues

**Problem**: File uploads failing

**Solution**:
```bash
# Verify storage account access
az storage account show \
  --name "${APP_NAME}storage" \
  --resource-group $RESOURCE_GROUP

# Check CORS settings
az storage cors add \
  --account-name "${APP_NAME}storage" \
  --origins "*" \
  --methods GET POST PUT DELETE \
  --headers "*" \
  --exposed-headers "*" \
  --max-age 3600 \
  --services blob
```

### Debug Commands

```bash
# View all resources
az resource list --resource-group $RESOURCE_GROUP --output table

# Check App Service metrics
az monitor metrics list \
  --resource "/subscriptions/your-subscription-id/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/${APP_NAME}-frontend" \
  --metric "CpuTime" \
  --start-time 2025-09-18T00:00:00Z \
  --end-time 2025-09-18T23:59:59Z

# Test network connectivity
az network vnet list --resource-group $RESOURCE_GROUP
```

---

## Scaling & Performance

### 1. Horizontal Scaling

```bash
# Scale out manually
az webapp scale \
  --resource-group $RESOURCE_GROUP \
  --name "${APP_NAME}-frontend" \
  --instance-count 3

# Configure auto-scaling rules
az monitor autoscale rule create \
  --resource-group $RESOURCE_GROUP \
  --autoscale-name "${APP_NAME}-autoscale" \
  --condition "Http Queue Length > 100 avg 5m" \
  --scale out 2
```

### 2. Performance Optimization

```bash
# Enable compression
az webapp config set \
  --resource-group $RESOURCE_GROUP \
  --name "${APP_NAME}-frontend" \
  --use-32bit-worker-process false \
  --web-sockets-enabled true

# Configure caching
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name "${APP_NAME}-frontend" \
  --settings \
    WEBSITE_DYNAMIC_CACHE=1 \
    WEBSITE_LOCAL_CACHE_OPTION=Always
```

### 3. Database Performance

```bash
# Upgrade database tier for better performance
az postgres flexible-server update \
  --resource-group $RESOURCE_GROUP \
  --name "${APP_NAME}-db" \
  --sku-name Standard_D2s_v3 \
  --tier GeneralPurpose
```

---

## Security Best Practices

### 1. Network Security

```bash
# Configure virtual network integration
az network vnet create \
  --resource-group $RESOURCE_GROUP \
  --name "${APP_NAME}-vnet" \
  --address-prefix 10.0.0.0/16

# Create subnet for App Service
az network vnet subnet create \
  --resource-group $RESOURCE_GROUP \
  --vnet-name "${APP_NAME}-vnet" \
  --name app-subnet \
  --address-prefix 10.0.1.0/24
```

### 2. Identity and Access Management

```bash
# Enable managed identity
az webapp identity assign \
  --resource-group $RESOURCE_GROUP \
  --name "${APP_NAME}-frontend"

# Grant Key Vault access
az keyvault set-policy \
  --name "${APP_NAME}-keyvault" \
  --object-id $(az webapp identity show --resource-group $RESOURCE_GROUP --name "${APP_NAME}-frontend" --query principalId --output tsv) \
  --secret-permissions get list
```

### 3. Data Protection

```bash
# Enable encryption in transit
az postgres flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name "${APP_NAME}-db" \
  --name ssl \
  --value on

# Configure backup encryption
az webapp config backup update \
  --resource-group $RESOURCE_GROUP \
  --webapp-name "${APP_NAME}-frontend" \
  --backup-name daily-backup \
  --retain-one true
```

---

## Cost Optimization

### 1. Resource Right-Sizing

```bash
# Monitor costs
az consumption usage list \
  --start-date 2025-09-01 \
  --end-date 2025-09-18 \
  --resource-group $RESOURCE_GROUP

# Scale down during off-hours
az webapp scale \
  --resource-group $RESOURCE_GROUP \
  --name "${APP_NAME}-frontend" \
  --instance-count 1
```

### 2. Storage Optimization

```bash
# Configure lifecycle management
az storage account management-policy create \
  --account-name "${APP_NAME}storage" \
  --policy @storage-lifecycle-policy.json
```

---

## Conclusion

This deployment guide provides a comprehensive approach to deploying TrustStream AI Agent Builder on Azure using Linux-based services. The deployment includes:

- ✅ Scalable frontend hosting on Azure App Service
- ✅ Managed PostgreSQL database with backup
- ✅ Integrated blob storage for file management
- ✅ Application monitoring and logging
- ✅ Security best practices implementation
- ✅ Automated scaling and maintenance

### Next Steps

1. **Monitor Performance**: Set up alerts and dashboards
2. **Implement CI/CD**: Use Azure DevOps or GitHub Actions
3. **Security Hardening**: Regular security assessments
4. **Cost Optimization**: Regular cost reviews and optimization

### Support Resources

- **Azure Documentation**: https://docs.microsoft.com/azure/
- **Supabase Documentation**: https://supabase.com/docs
- **TrustStream Support**: Available through the platform

---

**Document Version**: 1.0  
**Last Updated**: 2025-09-18  
**Review Date**: 2025-12-18  

For technical support or questions about this deployment guide, please refer to the troubleshooting section or contact the development team.