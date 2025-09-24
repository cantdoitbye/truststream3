# Azure CI/CD Setup Guide

Comprehensive guide for setting up Enterprise Azure DevOps CI/CD pipelines for the Agentic Ecosystem.

## Overview

This guide covers the complete setup of a multi-stage CI/CD pipeline with:
- Development, Staging, and Production environments
- Automated build, test, and deployment processes
- Infrastructure as Code (IaC) with ARM templates
- Security scanning and compliance checks
- Blue-green and canary deployment strategies
- Automated rollback capabilities

## Prerequisites

### Azure Services Required
- Azure DevOps organization and project
- Azure subscription with appropriate permissions
- Azure Key Vault for secret management
- Azure Static Web Apps for frontend hosting
- Azure Application Insights for monitoring

### Service Connections
1. **Azure Resource Manager** - For deploying Azure resources
2. **GitHub/Azure Repos** - For source code access
3. **Supabase** - For backend deployment (via access tokens in Key Vault)

## Initial Setup

### 1. Create Azure DevOps Project

```bash
# Create new project in Azure DevOps
az devops project create --name "agentic-ecosystem" --description "Enterprise Agentic Ecosystem CI/CD"
```

### 2. Configure Variable Groups

Create variable groups for each environment:

#### Development Environment
```bash
az pipelines variable-group create \
  --name "development-environment" \
  --variables \
    ENVIRONMENT_NAME=development \
    AZURE_SUBSCRIPTION="azure-service-connection" \
    RESOURCE_GROUP_NAME="agentic-ecosystem-development-rg" \
    KEY_VAULT_NAME="agentic-ecosystem-dev-kv"
```

#### Staging Environment
```bash
az pipelines variable-group create \
  --name "staging-environment" \
  --variables \
    ENVIRONMENT_NAME=staging \
    AZURE_SUBSCRIPTION="azure-service-connection" \
    RESOURCE_GROUP_NAME="agentic-ecosystem-staging-rg" \
    KEY_VAULT_NAME="agentic-ecosystem-staging-kv"
```

#### Production Environment
```bash
az pipelines variable-group create \
  --name "production-environment" \
  --variables \
    ENVIRONMENT_NAME=production \
    AZURE_SUBSCRIPTION="azure-service-connection" \
    RESOURCE_GROUP_NAME="agentic-ecosystem-production-rg" \
    KEY_VAULT_NAME="agentic-ecosystem-prod-kv"
```

### 3. Deploy Infrastructure

#### Deploy Development Environment
```powershell
./.azure/scripts/deployment-scripts.ps1 `
  -Environment "development" `
  -SubscriptionId "your-subscription-id" `
  -ResourceGroupName "agentic-ecosystem-development-rg" `
  -Location "East US"
```

#### Deploy Staging Environment
```powershell
./.azure/scripts/deployment-scripts.ps1 `
  -Environment "staging" `
  -SubscriptionId "your-subscription-id" `
  -ResourceGroupName "agentic-ecosystem-staging-rg" `
  -Location "East US"
```

#### Deploy Production Environment
```powershell
./.azure/scripts/deployment-scripts.ps1 `
  -Environment "production" `
  -SubscriptionId "your-subscription-id" `
  -ResourceGroupName "agentic-ecosystem-production-rg" `
  -Location "East US"
```

### 4. Configure Key Vault Secrets

For each environment, configure the following secrets in Azure Key Vault:

```bash
# Supabase secrets
az keyvault secret set --vault-name "agentic-ecosystem-dev-kv" --name "SUPABASE-URL" --value "your-supabase-url"
az keyvault secret set --vault-name "agentic-ecosystem-dev-kv" --name "SUPABASE-ANON-KEY" --value "your-supabase-anon-key"
az keyvault secret set --vault-name "agentic-ecosystem-dev-kv" --name "SUPABASE-SERVICE-ROLE-KEY" --value "your-supabase-service-role-key"
az keyvault secret set --vault-name "agentic-ecosystem-dev-kv" --name "SUPABASE-ACCESS-TOKEN" --value "your-supabase-access-token"
az keyvault secret set --vault-name "agentic-ecosystem-dev-kv" --name "SUPABASE-PROJECT-REF" --value "your-project-ref"

# OpenAI secrets
az keyvault secret set --vault-name "agentic-ecosystem-dev-kv" --name "OPENAI-API-KEY" --value "your-openai-api-key"

# Other API keys as needed
az keyvault secret set --vault-name "agentic-ecosystem-dev-kv" --name "QDRANT-URL" --value "your-qdrant-url"
az keyvault secret set --vault-name "agentic-ecosystem-dev-kv" --name "QDRANT-API-KEY" --value "your-qdrant-api-key"
```

### 5. Create Pipeline

```bash
# Create the main pipeline
az pipelines create \
  --name "agentic-ecosystem-cicd" \
  --description "Multi-stage CI/CD pipeline for Agentic Ecosystem" \
  --yaml-path "azure-pipelines.yml" \
  --repository "https://github.com/your-org/agentic-ecosystem" \
  --branch "main"
```

## Pipeline Stages

### Stage 1: Build and Test
- **Frontend Build**: React/TypeScript compilation, linting, unit tests
- **Backend Build**: Deno Edge Functions type checking and linting  
- **Security Scan**: Security vulnerability scanning and compliance checks
- **Artifact Publishing**: Build artifacts for deployment

### Stage 2: Development Deployment
- **Triggers**: Feature branches and develop branch
- **Deployment**: Automated deployment to development environment
- **Testing**: Smoke tests and basic functionality validation

### Stage 3: Staging Deployment  
- **Triggers**: Develop branch only
- **Deployment**: Automated deployment to staging environment
- **Testing**: Integration tests, performance tests, security tests
- **Approval**: Optional manual approval gate

### Stage 4: Production Deployment
- **Triggers**: Main branch only
- **Strategy**: Canary deployment with gradual rollout (25% → 50% → 100%)
- **Deployment**: Blue-green deployment with automatic rollback
- **Monitoring**: Real-time health checks and performance monitoring
- **Approval**: Required manual approval gate

## Environment Configuration

### Development Environment
- **Purpose**: Feature development and initial testing
- **Auto-deployment**: Yes (on feature/* and develop branches)
- **Testing**: Basic smoke tests
- **Monitoring**: Basic health checks

### Staging Environment  
- **Purpose**: Pre-production testing and validation
- **Auto-deployment**: Yes (on develop branch)
- **Testing**: Full integration and performance testing
- **Monitoring**: Comprehensive monitoring with alerts

### Production Environment
- **Purpose**: Live production system
- **Auto-deployment**: Yes (with approval on main branch)
- **Testing**: Production health checks and monitoring
- **Monitoring**: Full observability stack with real-time alerts

## Security Configuration

### Secret Management
- All secrets stored in Azure Key Vault
- Environment-specific Key Vaults for isolation
- Managed identities for secure access
- Secret rotation policies configured

### Security Scanning
- **Dependency Scanning**: npm audit for known vulnerabilities
- **Code Scanning**: ESLint security rules and static analysis
- **Container Scanning**: Security scanning of deployment artifacts
- **Compliance Checks**: Automated compliance validation

### Access Control
- **Service Connections**: Least privilege access to Azure resources
- **Environment Approvals**: Required approvals for production deployments
- **Branch Policies**: Protected branches with required reviews
- **Audit Logging**: Complete audit trail of all deployments

## Monitoring and Alerting

### Application Insights Integration
- Real-time application performance monitoring
- Custom metrics and telemetry collection
- Automated alert rules for critical issues
- Performance baseline monitoring

### Pipeline Monitoring
- Build and deployment success/failure alerts
- Performance metrics for pipeline execution
- Failed deployment notifications
- Capacity and resource utilization monitoring

## Disaster Recovery and Rollback

### Automated Rollback
- Health check failures trigger automatic rollback
- Manual rollback capabilities via Azure DevOps
- Database migration rollback procedures
- Complete environment restoration

### Rollback Procedures
```bash
# Manual rollback to previous version
./.azure/scripts/rollback-scripts.ps1 `
  -Environment "production" `
  -RollbackTarget "previous-deployment-id" `
  -ResourceGroupName "agentic-ecosystem-production-rg"

# Dry run rollback (testing)
./.azure/scripts/rollback-scripts.ps1 `
  -Environment "staging" `
  -RollbackTarget "target-version" `
  -DryRun
```

## Best Practices

### Development Workflow
1. **Feature Development**: Create feature branches for new development
2. **Pull Requests**: All changes go through PR review process
3. **Integration Testing**: Automatic testing in development environment
4. **Staging Validation**: Comprehensive testing in staging environment
5. **Production Deployment**: Controlled deployment with monitoring

### Security Best Practices
1. **Least Privilege**: Minimal required permissions for service accounts
2. **Secret Rotation**: Regular rotation of API keys and secrets
3. **Audit Logging**: Complete audit trail of all access and changes
4. **Compliance Monitoring**: Automated compliance validation
5. **Vulnerability Management**: Regular security scanning and updates

### Performance Optimization
1. **Parallel Execution**: Parallel build and test execution where possible
2. **Caching**: Aggressive caching of dependencies and artifacts
3. **Incremental Builds**: Only build changed components
4. **Resource Optimization**: Right-sized Azure resources for each environment

## Troubleshooting

### Common Issues

#### Pipeline Failures
- Check build logs in Azure DevOps
- Verify service connection permissions
- Validate variable group configurations
- Check Azure resource availability

#### Deployment Failures
- Review deployment logs and error messages
- Verify Key Vault access and secret availability
- Check Supabase project configuration
- Validate Azure resource dependencies

#### Health Check Failures
- Review application logs in Azure Application Insights
- Check database connectivity and performance
- Verify API endpoint availability
- Monitor resource utilization

### Support and Escalation
- **Level 1**: Development team troubleshooting
- **Level 2**: DevOps team intervention
- **Level 3**: Azure support escalation
- **Emergency**: Critical production issue escalation

## Maintenance

### Regular Tasks
- Weekly pipeline performance review
- Monthly security scanning and updates
- Quarterly disaster recovery testing
- Annual architecture and security review

### Updates and Upgrades
- Pipeline template updates
- Azure DevOps extension updates
- Security patch management
- Performance optimization reviews

---

## Quick Reference

### Key Commands
```bash
# Deploy infrastructure
./.azure/scripts/deployment-scripts.ps1 -Environment production

# Run rollback
./.azure/scripts/rollback-scripts.ps1 -Environment production -RollbackTarget version

# Manual pipeline trigger
az pipelines run --name "agentic-ecosystem-cicd"

# Check pipeline status
az pipelines show --name "agentic-ecosystem-cicd"
```

### Key Resources
- **Pipeline Definition**: `azure-pipelines.yml`
- **Infrastructure Templates**: `.azure/azure-resource-templates/`
- **Environment Configs**: `.azure/environments/`
- **Deployment Scripts**: `.azure/scripts/`

---

*This setup guide provides a complete enterprise-grade CI/CD implementation for the Agentic Ecosystem. Follow the steps sequentially for optimal results.*