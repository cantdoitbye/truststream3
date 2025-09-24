#!/bin/bash

# TrustStram v4.4 Multi-Cloud Orchestration Deployment Automation
# Prerequisites Setup Script

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install required tools
install_prerequisites() {
    log_info "Installing prerequisites..."
    
    # Update package lists
    if command_exists apt-get; then
        sudo apt-get update
    elif command_exists yum; then
        sudo yum update -y
    elif command_exists brew; then
        brew update
    fi
    
    # Install kubectl
    if ! command_exists kubectl; then
        log_info "Installing kubectl..."
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
            sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
            rm kubectl
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            brew install kubectl
        fi
        log_success "kubectl installed"
    fi
    
    # Install helm
    if ! command_exists helm; then
        log_info "Installing Helm..."
        curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
        log_success "Helm installed"
    fi
    
    # Install istioctl
    if ! command_exists istioctl; then
        log_info "Installing istioctl..."
        curl -L https://istio.io/downloadIstio | sh -
        sudo mv istio-*/bin/istioctl /usr/local/bin/
        rm -rf istio-*
        log_success "istioctl installed"
    fi
    
    # Install clusterctl
    if ! command_exists clusterctl; then
        log_info "Installing clusterctl..."
        curl -L https://github.com/kubernetes-sigs/cluster-api/releases/latest/download/clusterctl-linux-amd64 -o clusterctl
        sudo install -o root -g root -m 0755 clusterctl /usr/local/bin/clusterctl
        rm clusterctl
        log_success "clusterctl installed"
    fi
    
    # Install terraform
    if ! command_exists terraform; then
        log_info "Installing Terraform..."
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
            echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
            sudo apt update && sudo apt install terraform
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            brew tap hashicorp/tap
            brew install hashicorp/tap/terraform
        fi
        log_success "Terraform installed"
    fi
    
    # Install cloud CLIs
    install_cloud_clis
}

install_cloud_clis() {
    # AWS CLI
    if ! command_exists aws; then
        log_info "Installing AWS CLI..."
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
            unzip awscliv2.zip
            sudo ./aws/install
            rm -rf aws awscliv2.zip
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            brew install awscli
        fi
        log_success "AWS CLI installed"
    fi
    
    # Azure CLI
    if ! command_exists az; then
        log_info "Installing Azure CLI..."
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            brew install azure-cli
        fi
        log_success "Azure CLI installed"
    fi
    
    # Google Cloud CLI
    if ! command_exists gcloud; then
        log_info "Installing Google Cloud CLI..."
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
            curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
            sudo apt-get update && sudo apt-get install google-cloud-cli
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            brew install --cask google-cloud-sdk
        fi
        log_success "Google Cloud CLI installed"
    fi
}

# Verify installations
verify_installations() {
    log_info "Verifying installations..."
    
    local tools=("kubectl" "helm" "istioctl" "clusterctl" "terraform" "aws" "az" "gcloud")
    local missing_tools=()
    
    for tool in "${tools[@]}"; do
        if command_exists "$tool"; then
            log_success "$tool is installed"
        else
            missing_tools+=("$tool")
            log_error "$tool is not installed"
        fi
    done
    
    if [ ${#missing_tools[@]} -eq 0 ]; then
        log_success "All prerequisites are installed successfully!"
        return 0
    else
        log_error "Missing tools: ${missing_tools[*]}"
        return 1
    fi
}

# Setup cloud credentials
setup_cloud_credentials() {
    log_info "Setting up cloud credentials..."
    
    # AWS credentials
    if [ ! -f ~/.aws/credentials ]; then
        log_warning "AWS credentials not found. Please run 'aws configure' to set up AWS credentials."
    else
        log_success "AWS credentials found"
    fi
    
    # Azure credentials
    if ! az account show >/dev/null 2>&1; then
        log_warning "Azure credentials not found. Please run 'az login' to set up Azure credentials."
    else
        log_success "Azure credentials found"
    fi
    
    # GCP credentials
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        log_warning "GCP credentials not found. Please run 'gcloud auth login' to set up GCP credentials."
    else
        log_success "GCP credentials found"
    fi
}

# Setup management cluster
setup_management_cluster() {
    log_info "Setting up management cluster..."
    
    # Check if KIND is available for local development
    if command_exists kind; then
        log_info "Creating local management cluster with KIND..."
        
        cat <<EOF | kind create cluster --name=trustram-management --config=-
apiVersion: kind.x-k8s.io/v1alpha4
kind: Cluster
nodes:
- role: control-plane
  image: kindest/node:v1.28.0
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "ingress-ready=true"
  extraPortMappings:
  - containerPort: 80
    hostPort: 80
    protocol: TCP
  - containerPort: 443
    hostPort: 443
    protocol: TCP
- role: worker
  image: kindest/node:v1.28.0
- role: worker
  image: kindest/node:v1.28.0
EOF
        
        kubectl cluster-info --context kind-trustram-management
        log_success "Management cluster created"
    else
        log_warning "KIND not found. Please ensure you have a Kubernetes cluster available as the management cluster."
    fi
}

# Install Cluster API
install_cluster_api() {
    log_info "Installing Cluster API..."
    
    # Initialize Cluster API
    clusterctl init --infrastructure aws,azure,gcp
    
    # Wait for Cluster API to be ready
    kubectl wait --for=condition=Available --timeout=300s -n capi-system deployment/capi-controller-manager
    kubectl wait --for=condition=Available --timeout=300s -n capi-kubeadm-bootstrap-system deployment/capi-kubeadm-bootstrap-controller-manager
    kubectl wait --for=condition=Available --timeout=300s -n capi-kubeadm-control-plane-system deployment/capi-kubeadm-control-plane-controller-manager
    
    log_success "Cluster API installed and ready"
}

# Create necessary namespaces
create_namespaces() {
    log_info "Creating namespaces..."
    
    local namespaces=(
        "multi-cloud-system"
        "istio-system"
        "monitoring"
        "tracing"
        "cost-optimization"
        "failover-system"
        "compliance"
        "networking"
        "trustram-system"
    )
    
    for namespace in "${namespaces[@]}"; do
        if kubectl get namespace "$namespace" >/dev/null 2>&1; then
            log_info "Namespace $namespace already exists"
        else
            kubectl create namespace "$namespace"
            log_success "Created namespace $namespace"
        fi
    done
}

# Install cert-manager
install_cert_manager() {
    log_info "Installing cert-manager..."
    
    kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
    
    # Wait for cert-manager to be ready
    kubectl wait --for=condition=Available --timeout=300s -n cert-manager deployment/cert-manager
    kubectl wait --for=condition=Available --timeout=300s -n cert-manager deployment/cert-manager-cainjector
    kubectl wait --for=condition=Available --timeout=300s -n cert-manager deployment/cert-manager-webhook
    
    log_success "cert-manager installed and ready"
}

# Generate secrets and credentials
generate_secrets() {
    log_info "Generating secrets and credentials..."
    
    # Generate random passwords and keys
    GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 32)
    ELASTICSEARCH_PASSWORD=$(openssl rand -base64 32)
    VPN_PSK=$(openssl rand -base64 32)
    
    # Create cloud credentials secret
    kubectl create secret generic cloud-credentials \
        --namespace=multi-cloud-system \
        --from-literal=aws-access-key-id="${AWS_ACCESS_KEY_ID:-}" \
        --from-literal=aws-secret-access-key="${AWS_SECRET_ACCESS_KEY:-}" \
        --from-literal=azure-client-id="${AZURE_CLIENT_ID:-}" \
        --from-literal=azure-client-secret="${AZURE_CLIENT_SECRET:-}" \
        --from-literal=azure-tenant-id="${AZURE_TENANT_ID:-}" \
        --from-literal=azure-subscription-id="${AZURE_SUBSCRIPTION_ID:-}" \
        --from-literal=gcp-service-account-key="${GCP_SERVICE_ACCOUNT_KEY:-}" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Create VPN credentials secret
    kubectl create secret generic vpn-credentials \
        --namespace=networking \
        --from-literal=psk="$VPN_PSK" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Create monitoring credentials
    kubectl create secret generic grafana-admin-credentials \
        --namespace=monitoring \
        --from-literal=password="$GRAFANA_ADMIN_PASSWORD" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    kubectl create secret generic elasticsearch-credentials \
        --namespace=monitoring \
        --from-literal=password="$ELASTICSEARCH_PASSWORD" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    log_success "Secrets created"
    log_info "Grafana admin password: $GRAFANA_ADMIN_PASSWORD"
}

# Main execution
main() {
    log_info "Starting TrustStram v4.4 Multi-Cloud Orchestration Prerequisites Setup"
    
    # Check if running as root (not recommended)
    if [[ $EUID -eq 0 ]]; then
        log_warning "Running as root is not recommended. Consider running as a regular user with sudo access."
    fi
    
    # Install prerequisites
    install_prerequisites
    
    # Verify installations
    if ! verify_installations; then
        log_error "Prerequisites verification failed. Please install missing tools and try again."
        exit 1
    fi
    
    # Setup cloud credentials
    setup_cloud_credentials
    
    # Setup management cluster
    setup_management_cluster
    
    # Install Cluster API
    install_cluster_api
    
    # Create namespaces
    create_namespaces
    
    # Install cert-manager
    install_cert_manager
    
    # Generate secrets
    generate_secrets
    
    log_success "Prerequisites setup completed successfully!"
    log_info "Next steps:"
    log_info "1. Run ./deploy-foundation.sh to deploy the foundation infrastructure"
    log_info "2. Run ./deploy-service-mesh.sh to configure the service mesh"
    log_info "3. Run ./deploy-monitoring.sh to setup monitoring and observability"
    log_info "4. Run ./deploy-cost-optimization.sh to enable cost optimization"
}

# Execute main function
main "$@"