#!/bin/bash
# Multi-Cloud CAPI Provider Setup Script
# This script installs and configures Cluster API providers for AWS, Azure, and GCP

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

# Configuration
MANAGEMENT_CLUSTER_NAME="trustram-management"
KUBECONFIG_PATH="${HOME}/.kube/config"
CAPI_VERSION="v1.5.3"
CAPA_VERSION="v2.2.1"  # AWS
CAPZ_VERSION="v1.11.3"  # Azure
CAPG_VERSION="v1.5.1"  # GCP

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi
    
    # Check if clusterctl is installed
    if ! command -v clusterctl &> /dev/null; then
        warn "clusterctl is not installed. Installing clusterctl..."
        install_clusterctl
    fi
    
    # Check if kind is installed (for management cluster)
    if ! command -v kind &> /dev/null; then
        warn "kind is not installed. Installing kind..."
        install_kind
    fi
    
    success "Prerequisites check completed"
}

# Install clusterctl
install_clusterctl() {
    log "Installing clusterctl..."
    curl -L https://github.com/kubernetes-sigs/cluster-api/releases/download/${CAPI_VERSION}/clusterctl-linux-amd64 -o clusterctl
    chmod +x clusterctl
    sudo mv clusterctl /usr/local/bin/
    success "clusterctl installed successfully"
}

# Install kind
install_kind() {
    log "Installing kind..."
    curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
    chmod +x ./kind
    sudo mv ./kind /usr/local/bin/
    success "kind installed successfully"
}

# Create management cluster
create_management_cluster() {
    log "Creating management cluster with kind..."
    
    if kind get clusters | grep -q "${MANAGEMENT_CLUSTER_NAME}"; then
        warn "Management cluster '${MANAGEMENT_CLUSTER_NAME}' already exists"
    else
        # Create kind cluster configuration
        cat > management-cluster-config.yaml <<EOF
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: ${MANAGEMENT_CLUSTER_NAME}
nodes:
- role: control-plane
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
EOF
        
        kind create cluster --config management-cluster-config.yaml --name ${MANAGEMENT_CLUSTER_NAME}
        kubectl cluster-info --context kind-${MANAGEMENT_CLUSTER_NAME}
        rm management-cluster-config.yaml
    fi
    
    success "Management cluster is ready"
}

# Initialize Cluster API
init_cluster_api() {
    log "Initializing Cluster API..."
    
    # Set the kubectl context
    kubectl config use-context kind-${MANAGEMENT_CLUSTER_NAME}
    
    # Initialize CAPI
    clusterctl init --infrastructure aws,azure,gcp
    
    # Wait for CAPI components to be ready
    log "Waiting for CAPI components to be ready..."
    kubectl wait --for=condition=Available --timeout=300s deployment -n capi-system capi-controller-manager
    kubectl wait --for=condition=Available --timeout=300s deployment -n capa-system capa-controller-manager
    kubectl wait --for=condition=Available --timeout=300s deployment -n capz-system capz-controller-manager
    kubectl wait --for=condition=Available --timeout=300s deployment -n capg-system capg-controller-manager
    
    success "Cluster API initialized successfully"
}

# Setup AWS credentials
setup_aws_credentials() {
    log "Setting up AWS credentials..."
    
    if [ -z "${AWS_ACCESS_KEY_ID}" ] || [ -z "${AWS_SECRET_ACCESS_KEY}" ]; then
        warn "AWS credentials not found in environment variables"
        warn "Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY"
        return 1
    fi
    
    # Create AWS credentials secret
    kubectl create secret generic aws-credentials \
        --from-literal=AccessKeyId="${AWS_ACCESS_KEY_ID}" \
        --from-literal=SecretAccessKey="${AWS_SECRET_ACCESS_KEY}" \
        --namespace=default
    
    # Create cluster identity
    cat > aws-cluster-identity.yaml <<EOF
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: AWSClusterRoleIdentity
metadata:
  name: default
spec:
  allowedNamespaces:
    list:
    - default
    - kube-system
  roleARN: "arn:aws:iam::ACCOUNT-ID:role/nodes.cluster-api-provider-aws.sigs.k8s.io"
  sessionName: "CAPA-Management-Session"
EOF
    
    kubectl apply -f aws-cluster-identity.yaml
    rm aws-cluster-identity.yaml
    
    success "AWS credentials configured"
}

# Setup Azure credentials
setup_azure_credentials() {
    log "Setting up Azure credentials..."
    
    if [ -z "${AZURE_CLIENT_ID}" ] || [ -z "${AZURE_CLIENT_SECRET}" ] || [ -z "${AZURE_TENANT_ID}" ]; then
        warn "Azure credentials not found in environment variables"
        warn "Please set AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_TENANT_ID"
        return 1
    fi
    
    # Create Azure credentials secret
    kubectl create secret generic azure-cluster-identity-secret \
        --from-literal=clientSecret="${AZURE_CLIENT_SECRET}" \
        --namespace=default
    
    # Update the cluster identity with actual values
    sed -i "s/YOUR_TENANT_ID/${AZURE_TENANT_ID}/g" providers/azure/infrastructure-provider.yaml
    sed -i "s/YOUR_CLIENT_ID/${AZURE_CLIENT_ID}/g" providers/azure/infrastructure-provider.yaml
    
    success "Azure credentials configured"
}

# Setup GCP credentials
setup_gcp_credentials() {
    log "Setting up GCP credentials..."
    
    if [ -z "${GOOGLE_APPLICATION_CREDENTIALS}" ] || [ ! -f "${GOOGLE_APPLICATION_CREDENTIALS}" ]; then
        warn "GCP credentials not found"
        warn "Please set GOOGLE_APPLICATION_CREDENTIALS to point to your service account key file"
        return 1
    fi
    
    # Create GCP credentials secret
    kubectl create secret generic gcp-credentials \
        --from-file=key.json="${GOOGLE_APPLICATION_CREDENTIALS}" \
        --namespace=default
    
    success "GCP credentials configured"
}

# Apply provider configurations
apply_provider_configs() {
    log "Applying provider configurations..."
    
    # Apply AWS provider configs
    if kubectl get secret aws-credentials &>/dev/null; then
        log "Applying AWS provider configurations..."
        kubectl apply -f providers/aws/infrastructure-provider.yaml
        success "AWS provider configurations applied"
    else
        warn "AWS credentials not configured, skipping AWS provider"
    fi
    
    # Apply Azure provider configs
    if kubectl get secret azure-cluster-identity-secret &>/dev/null; then
        log "Applying Azure provider configurations..."
        kubectl apply -f providers/azure/infrastructure-provider.yaml
        success "Azure provider configurations applied"
    else
        warn "Azure credentials not configured, skipping Azure provider"
    fi
    
    # Apply GCP provider configs
    if kubectl get secret gcp-credentials &>/dev/null; then
        log "Applying GCP provider configurations..."
        kubectl apply -f providers/gcp/infrastructure-provider.yaml
        success "GCP provider configurations applied"
    else
        warn "GCP credentials not configured, skipping GCP provider"
    fi
}

# Create workload clusters
create_workload_clusters() {
    log "Creating workload clusters..."
    
    # AWS Cluster
    if kubectl get secret aws-credentials &>/dev/null; then
        log "Creating AWS workload cluster..."
        kubectl apply -f providers/aws/cluster-template.yaml
        log "AWS cluster creation initiated. Monitor with: kubectl get cluster trustram-aws-cluster"
    fi
    
    # Azure Cluster
    if kubectl get secret azure-cluster-identity-secret &>/dev/null; then
        log "Creating Azure workload cluster..."
        kubectl apply -f providers/azure/cluster-template.yaml
        log "Azure cluster creation initiated. Monitor with: kubectl get cluster trustram-azure-cluster"
    fi
    
    # GCP Cluster
    if kubectl get secret gcp-credentials &>/dev/null; then
        log "Creating GCP workload cluster..."
        kubectl apply -f providers/gcp/cluster-template.yaml
        log "GCP cluster creation initiated. Monitor with: kubectl get cluster trustram-gcp-cluster"
    fi
    
    success "Workload cluster creation initiated for all configured providers"
}

# Monitor cluster status
monitor_clusters() {
    log "Monitoring cluster status..."
    
    echo ""
    echo "Current cluster status:"
    kubectl get clusters -o wide
    
    echo ""
    echo "Current machines status:"
    kubectl get machines -o wide
    
    echo ""
    echo "Current machine deployments status:"
    kubectl get machinedeployments -o wide
}

# Get cluster credentials
get_cluster_credentials() {
    local cluster_name=$1
    local provider=$2
    
    log "Getting credentials for cluster: ${cluster_name}"
    
    # Wait for cluster to be ready
    kubectl wait --for=condition=Ready cluster/${cluster_name} --timeout=30m
    
    # Get the kubeconfig
    clusterctl get kubeconfig ${cluster_name} > ${cluster_name}-kubeconfig.yaml
    
    success "Kubeconfig saved to ${cluster_name}-kubeconfig.yaml"
    log "To use this cluster, run: export KUBECONFIG=${PWD}/${cluster_name}-kubeconfig.yaml"
}

# Cleanup function
cleanup() {
    log "Cleaning up resources..."
    
    # Delete workload clusters
    kubectl delete cluster --all --wait=false
    
    # Delete management cluster
    kind delete cluster --name ${MANAGEMENT_CLUSTER_NAME}
    
    success "Cleanup completed"
}

# Main function
main() {
    echo "==========================================="
    echo "TrustStram v4.4 Multi-Cloud CAPI Setup"
    echo "==========================================="
    
    case "${1:-setup}" in
        setup)
            check_prerequisites
            create_management_cluster
            init_cluster_api
            setup_aws_credentials || true
            setup_azure_credentials || true
            setup_gcp_credentials || true
            apply_provider_configs
            ;;
        deploy)
            create_workload_clusters
            ;;
        monitor)
            monitor_clusters
            ;;
        credentials)
            if [ -z "$2" ]; then
                error "Please specify cluster name: $0 credentials <cluster-name>"
                exit 1
            fi
            get_cluster_credentials "$2" "$3"
            ;;
        cleanup)
            cleanup
            ;;
        *)
            echo "Usage: $0 {setup|deploy|monitor|credentials|cleanup}"
            echo ""
            echo "Commands:"
            echo "  setup      - Install prerequisites and setup management cluster"
            echo "  deploy     - Deploy workload clusters"
            echo "  monitor    - Monitor cluster status"
            echo "  credentials <cluster-name> - Get kubeconfig for specified cluster"
            echo "  cleanup    - Cleanup all resources"
            exit 1
            ;;
    esac
    
    success "Operation completed successfully"
}

# Run main function with all arguments
main "$@"
