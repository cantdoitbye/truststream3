#!/bin/bash

# TrustStream v4.2 - Enhanced Environment Setup Script
# Author: MiniMax Agent
# Version: 1.0
# Date: 2025-09-20

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Configuration
PROJECT_NAME="truststream-v42"
ENVIRONMENT="${ENVIRONMENT:-staging}"
AZURE_LOCATION="${AZURE_LOCATION:-eastus}"
RESOURCE_GROUP="${PROJECT_NAME}-${ENVIRONMENT}-rg"
AKS_CLUSTER_NAME="${PROJECT_NAME}-${ENVIRONMENT}-aks"
ACR_NAME="${PROJECT_NAME}${ENVIRONMENT}acr"
KEYVAULT_NAME="${PROJECT_NAME}-${ENVIRONMENT}-kv"
POSTGRES_SERVER_NAME="${PROJECT_NAME}-${ENVIRONMENT}-postgres"

# Environment-specific configurations
case $ENVIRONMENT in
    "development"|"dev")
        NODE_COUNT=1
        VM_SIZE="Standard_B2s"
        POSTGRES_SKU="B_Gen5_1"
        ;;
    "staging")
        NODE_COUNT=2
        VM_SIZE="Standard_D2s_v3"
        POSTGRES_SKU="GP_Gen5_2"
        ;;
    "production"|"prod")
        NODE_COUNT=3
        VM_SIZE="Standard_D4s_v3"
        POSTGRES_SKU="GP_Gen5_4"
        ;;
    *)
        error "Invalid environment: $ENVIRONMENT. Must be one of: development, staging, production"
        ;;
esac

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if running on Azure Linux
    if ! grep -q "Azure Linux" /etc/os-release 2>/dev/null; then
        warning "Not running on Azure Linux. Some features may not work as expected."
    fi
    
    # Check required tools
    local tools=("az" "kubectl" "helm" "docker" "jq")
    for tool in "${tools[@]}"; do
        if ! command -v $tool &> /dev/null; then
            error "$tool is not installed. Please install it first."
        fi
    done
    
    # Check Azure CLI login status
    if ! az account show &> /dev/null; then
        log "Azure CLI not logged in. Please run 'az login' first."
        az login
    fi
    
    success "Prerequisites check completed"
}

# Set up Azure subscription and resource group
setup_azure_basics() {
    log "Setting up Azure basics..."
    
    # Get current subscription
    SUBSCRIPTION_ID=$(az account show --query id -o tsv)
    log "Using Azure subscription: $SUBSCRIPTION_ID"
    
    # Create resource group if it doesn't exist
    if ! az group show --name $RESOURCE_GROUP &> /dev/null; then
        log "Creating resource group: $RESOURCE_GROUP"
        az group create --name $RESOURCE_GROUP --location $AZURE_LOCATION
    else
        log "Resource group $RESOURCE_GROUP already exists"
    fi
    
    success "Azure basics setup completed"
}

# Set up Azure Container Registry
setup_acr() {
    log "Setting up Azure Container Registry..."
    
    if ! az acr show --name $ACR_NAME --resource-group $RESOURCE_GROUP &> /dev/null; then
        log "Creating Azure Container Registry: $ACR_NAME"
        az acr create \
            --resource-group $RESOURCE_GROUP \
            --name $ACR_NAME \
            --sku Standard \
            --admin-enabled true
        
        # Enable vulnerability scanning
        az acr task create \
            --registry $ACR_NAME \
            --name security-scan \
            --context /dev/null \
            --file - <<EOF
version: v1.1.0
steps:
  - cmd: az acr check-health --name $ACR_NAME
EOF
    else
        log "Azure Container Registry $ACR_NAME already exists"
    fi
    
    # Login to ACR
    az acr login --name $ACR_NAME
    
    success "ACR setup completed"
}

# Set up Azure Key Vault
setup_keyvault() {
    log "Setting up Azure Key Vault..."
    
    if ! az keyvault show --name $KEYVAULT_NAME --resource-group $RESOURCE_GROUP &> /dev/null; then
        log "Creating Azure Key Vault: $KEYVAULT_NAME"
        az keyvault create \
            --name $KEYVAULT_NAME \
            --resource-group $RESOURCE_GROUP \
            --location $AZURE_LOCATION \
            --enable-rbac-authorization true
        
        # Set up secrets
        log "Creating initial secrets..."
        az keyvault secret set --vault-name $KEYVAULT_NAME --name "postgres-password" --value "$(openssl rand -base64 32)"
        az keyvault secret set --vault-name $KEYVAULT_NAME --name "jwt-secret" --value "$(openssl rand -base64 64)"
        az keyvault secret set --vault-name $KEYVAULT_NAME --name "encryption-key" --value "$(openssl rand -base64 32)"
    else
        log "Azure Key Vault $KEYVAULT_NAME already exists"
    fi
    
    success "Key Vault setup completed"
}

# Set up PostgreSQL database
setup_database() {
    log "Setting up PostgreSQL database..."
    
    if ! az postgres server show --name $POSTGRES_SERVER_NAME --resource-group $RESOURCE_GROUP &> /dev/null; then
        log "Creating PostgreSQL server: $POSTGRES_SERVER_NAME"
        
        POSTGRES_PASSWORD=$(az keyvault secret show --vault-name $KEYVAULT_NAME --name "postgres-password" --query value -o tsv)
        
        az postgres server create \
            --resource-group $RESOURCE_GROUP \
            --name $POSTGRES_SERVER_NAME \
            --location $AZURE_LOCATION \
            --admin-user truststream_admin \
            --admin-password $POSTGRES_PASSWORD \
            --sku-name $POSTGRES_SKU \
            --version 11 \
            --storage-size 51200 \
            --backup-retention 7 \
            --geo-redundant-backup Enabled
        
        # Configure firewall rules
        az postgres server firewall-rule create \
            --resource-group $RESOURCE_GROUP \
            --server $POSTGRES_SERVER_NAME \
            --name AllowAzureServices \
            --start-ip-address 0.0.0.0 \
            --end-ip-address 0.0.0.0
        
        # Create database
        az postgres db create \
            --resource-group $RESOURCE_GROUP \
            --server-name $POSTGRES_SERVER_NAME \
            --name truststream
    else
        log "PostgreSQL server $POSTGRES_SERVER_NAME already exists"
    fi
    
    success "Database setup completed"
}

# Set up AKS cluster
setup_aks() {
    log "Setting up AKS cluster..."
    
    if ! az aks show --name $AKS_CLUSTER_NAME --resource-group $RESOURCE_GROUP &> /dev/null; then
        log "Creating AKS cluster: $AKS_CLUSTER_NAME"
        
        az aks create \
            --resource-group $RESOURCE_GROUP \
            --name $AKS_CLUSTER_NAME \
            --node-count $NODE_COUNT \
            --node-vm-size $VM_SIZE \
            --generate-ssh-keys \
            --attach-acr $ACR_NAME \
            --enable-addons monitoring \
            --enable-managed-identity \
            --enable-cluster-autoscaler \
            --min-count 1 \
            --max-count 5 \
            --zones 1 2 3
        
        # Enable Azure AD integration
        az aks update \
            --resource-group $RESOURCE_GROUP \
            --name $AKS_CLUSTER_NAME \
            --enable-aad \
            --enable-azure-rbac
    else
        log "AKS cluster $AKS_CLUSTER_NAME already exists"
    fi
    
    # Get AKS credentials
    az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER_NAME --overwrite-existing
    
    success "AKS setup completed"
}

# Set up Kubernetes tools and configs
setup_kubernetes() {
    log "Setting up Kubernetes configurations..."
    
    # Create namespace
    kubectl create namespace truststream-$ENVIRONMENT --dry-run=client -o yaml | kubectl apply -f -
    
    # Set default namespace
    kubectl config set-context --current --namespace=truststream-$ENVIRONMENT
    
    # Install Helm charts
    log "Installing Helm charts..."
    
    # Add Helm repositories
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
    helm repo add cert-manager https://charts.jetstack.io
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update
    
    # Install ingress controller
    if ! helm list -n ingress-nginx | grep -q nginx-ingress; then
        log "Installing NGINX Ingress Controller..."
        kubectl create namespace ingress-nginx --dry-run=client -o yaml | kubectl apply -f -
        helm install nginx-ingress ingress-nginx/ingress-nginx \
            --namespace ingress-nginx \
            --set controller.replicaCount=2 \
            --set controller.nodeSelector."kubernetes\.io/os"=linux \
            --set defaultBackend.nodeSelector."kubernetes\.io/os"=linux
    fi
    
    # Install cert-manager
    if ! helm list -n cert-manager | grep -q cert-manager; then
        log "Installing cert-manager..."
        kubectl create namespace cert-manager --dry-run=client -o yaml | kubectl apply -f -
        helm install cert-manager cert-manager/cert-manager \
            --namespace cert-manager \
            --set installCRDs=true
    fi
    
    # Install monitoring stack for production
    if [[ $ENVIRONMENT == "production" ]]; then
        if ! helm list -n monitoring | grep -q prometheus; then
            log "Installing Prometheus monitoring stack..."
            kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
            helm install prometheus prometheus-community/kube-prometheus-stack \
                --namespace monitoring \
                --set prometheus.prometheusSpec.retention=30d
        fi
    fi
    
    success "Kubernetes setup completed"
}

# Set up Azure Functions
setup_functions() {
    log "Setting up Azure Functions..."
    
    FUNCTION_APP_NAME="${PROJECT_NAME}-${ENVIRONMENT}-functions"
    STORAGE_ACCOUNT_NAME="${PROJECT_NAME}${ENVIRONMENT}storage"
    
    # Create storage account
    if ! az storage account show --name $STORAGE_ACCOUNT_NAME --resource-group $RESOURCE_GROUP &> /dev/null; then
        log "Creating storage account: $STORAGE_ACCOUNT_NAME"
        az storage account create \
            --name $STORAGE_ACCOUNT_NAME \
            --resource-group $RESOURCE_GROUP \
            --location $AZURE_LOCATION \
            --sku Standard_LRS
    fi
    
    # Create function app
    if ! az functionapp show --name $FUNCTION_APP_NAME --resource-group $RESOURCE_GROUP &> /dev/null; then
        log "Creating Azure Function App: $FUNCTION_APP_NAME"
        az functionapp create \
            --resource-group $RESOURCE_GROUP \
            --consumption-plan-location $AZURE_LOCATION \
            --runtime node \
            --runtime-version 18 \
            --functions-version 4 \
            --name $FUNCTION_APP_NAME \
            --storage-account $STORAGE_ACCOUNT_NAME \
            --app-insights-key $(az monitor app-insights component show --app ${PROJECT_NAME}-${ENVIRONMENT}-insights --resource-group $RESOURCE_GROUP --query instrumentationKey -o tsv 2>/dev/null || echo "")
    fi
    
    success "Azure Functions setup completed"
}

# Set up monitoring and application insights
setup_monitoring() {
    log "Setting up monitoring and observability..."
    
    APP_INSIGHTS_NAME="${PROJECT_NAME}-${ENVIRONMENT}-insights"
    
    # Create Application Insights
    if ! az monitor app-insights component show --app $APP_INSIGHTS_NAME --resource-group $RESOURCE_GROUP &> /dev/null; then
        log "Creating Application Insights: $APP_INSIGHTS_NAME"
        az monitor app-insights component create \
            --app $APP_INSIGHTS_NAME \
            --location $AZURE_LOCATION \
            --resource-group $RESOURCE_GROUP \
            --kind web
    fi
    
    # Get instrumentation key and store in Key Vault
    INSTRUMENTATION_KEY=$(az monitor app-insights component show --app $APP_INSIGHTS_NAME --resource-group $RESOURCE_GROUP --query instrumentationKey -o tsv)
    az keyvault secret set --vault-name $KEYVAULT_NAME --name "app-insights-key" --value $INSTRUMENTATION_KEY
    
    success "Monitoring setup completed"
}

# Create environment configuration file
create_env_config() {
    log "Creating environment configuration..."
    
    mkdir -p /workspace/config
    
    cat > /workspace/config/${ENVIRONMENT}.env <<EOF
# TrustStream v4.2 - ${ENVIRONMENT} Environment Configuration
ENVIRONMENT=${ENVIRONMENT}
PROJECT_NAME=${PROJECT_NAME}
AZURE_LOCATION=${AZURE_LOCATION}
RESOURCE_GROUP=${RESOURCE_GROUP}
AKS_CLUSTER_NAME=${AKS_CLUSTER_NAME}
ACR_NAME=${ACR_NAME}
KEYVAULT_NAME=${KEYVAULT_NAME}
POSTGRES_SERVER_NAME=${POSTGRES_SERVER_NAME}
FUNCTION_APP_NAME=${PROJECT_NAME}-${ENVIRONMENT}-functions
STORAGE_ACCOUNT_NAME=${PROJECT_NAME}${ENVIRONMENT}storage
APP_INSIGHTS_NAME=${PROJECT_NAME}-${ENVIRONMENT}-insights

# Kubernetes
NAMESPACE=truststream-${ENVIRONMENT}

# Database
DATABASE_URL=postgresql://truststream_admin@${POSTGRES_SERVER_NAME}:password@${POSTGRES_SERVER_NAME}.postgres.database.azure.com:5432/truststream

# Container Registry
ACR_LOGIN_SERVER=${ACR_NAME}.azurecr.io

# Generated at: $(date)
EOF

    success "Environment configuration created at /workspace/config/${ENVIRONMENT}.env"
}

# Display summary
display_summary() {
    log "Environment setup completed successfully!"
    echo
    echo "======================================"
    echo "TrustStream v4.2 Environment Summary"
    echo "======================================"
    echo "Environment: $ENVIRONMENT"
    echo "Resource Group: $RESOURCE_GROUP"
    echo "AKS Cluster: $AKS_CLUSTER_NAME"
    echo "Container Registry: $ACR_NAME"
    echo "Key Vault: $KEYVAULT_NAME"
    echo "PostgreSQL Server: $POSTGRES_SERVER_NAME"
    echo "Function App: ${PROJECT_NAME}-${ENVIRONMENT}-functions"
    echo "Application Insights: ${PROJECT_NAME}-${ENVIRONMENT}-insights"
    echo "======================================"
    echo
    echo "Next steps:"
    echo "1. Run the deployment script: ./azure-deploy.sh"
    echo "2. Validate the deployment: ./validate-deployment.sh"
    echo "3. Check the monitoring dashboard in Azure Portal"
    echo
    success "Setup completed successfully!"
}

# Main execution
main() {
    log "Starting TrustStream v4.2 environment setup for $ENVIRONMENT environment..."
    
    check_prerequisites
    setup_azure_basics
    setup_keyvault
    setup_acr
    setup_database
    setup_aks
    setup_kubernetes
    setup_functions
    setup_monitoring
    create_env_config
    display_summary
}

# Handle interrupts gracefully
trap 'error "Setup interrupted by user"' INT TERM

# Run main function
main "$@"