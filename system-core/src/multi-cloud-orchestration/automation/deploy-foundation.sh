#!/bin/bash

# TrustStram v4.4 Multi-Cloud Orchestration
# Foundation Infrastructure Deployment Script

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

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CLUSTER_API_DIR="$ROOT_DIR/cluster-api"

# Deploy Cluster API clusters
deploy_clusters() {
    log_info "Deploying multi-cloud clusters..."
    
    # Deploy AWS cluster
    log_info "Deploying AWS cluster..."
    envsubst < "$CLUSTER_API_DIR/aws-cluster.yaml" | kubectl apply -f -
    
    # Deploy Azure cluster
    log_info "Deploying Azure cluster..."
    envsubst < "$CLUSTER_API_DIR/azure-cluster.yaml" | kubectl apply -f -
    
    # Deploy GCP cluster
    log_info "Deploying GCP cluster..."
    envsubst < "$CLUSTER_API_DIR/gcp-cluster.yaml" | kubectl apply -f -
    
    log_success "Cluster deployment initiated"
}

# Wait for clusters to be ready
wait_for_clusters() {
    log_info "Waiting for clusters to be ready..."
    
    local clusters=("trustram-aws-cluster" "trustram-azure-cluster" "trustram-gcp-cluster")
    
    for cluster in "${clusters[@]}"; do
        log_info "Waiting for cluster $cluster..."
        kubectl wait --for=condition=Ready --timeout=1800s cluster "$cluster" -n multi-cloud-system
        log_success "Cluster $cluster is ready"
    done
}

# Setup cluster federation
setup_cluster_federation() {
    log_info "Setting up cluster federation..."
    
    # Apply cluster federation configuration
    kubectl apply -f "$CLUSTER_API_DIR/cluster-federation.yaml"
    
    # Wait for cluster manager to be ready
    kubectl wait --for=condition=Available --timeout=300s deployment/cluster-manager -n multi-cloud-system
    
    log_success "Cluster federation configured"
}

# Get cluster kubeconfigs
get_cluster_kubeconfigs() {
    log_info "Retrieving cluster kubeconfigs..."
    
    local clusters=("trustram-aws-cluster" "trustram-azure-cluster" "trustram-gcp-cluster")
    
    for cluster in "${clusters[@]}"; do
        log_info "Getting kubeconfig for $cluster..."
        
        # Get the kubeconfig secret
        kubectl get secret "$cluster-kubeconfig" -n multi-cloud-system -o jsonpath='{.data.value}' | base64 -d > "/tmp/$cluster-kubeconfig"
        
        # Test connectivity
        if kubectl --kubeconfig="/tmp/$cluster-kubeconfig" cluster-info >/dev/null 2>&1; then
            log_success "Successfully connected to $cluster"
        else
            log_warning "Unable to connect to $cluster - it may still be provisioning"
        fi
    done
}

# Deploy networking components
deploy_networking() {
    log_info "Deploying networking components..."
    
    # Apply networking configuration
    kubectl apply -f "$ROOT_DIR/networking/cross-cloud-networking.yaml"
    
    # Wait for VPN gateways to be ready
    kubectl wait --for=condition=Available --timeout=300s deployment/aws-vpn-gateway -n networking
    kubectl wait --for=condition=Available --timeout=300s deployment/azure-vpn-gateway -n networking
    kubectl wait --for=condition=Available --timeout=300s deployment/gcp-vpn-gateway -n networking
    
    log_success "Networking components deployed"
}

# Deploy compliance infrastructure
deploy_compliance() {
    log_info "Deploying compliance infrastructure..."
    
    # Apply compliance controller
    kubectl apply -f "$ROOT_DIR/compliance/compliance-controller.yaml"
    
    # Apply data classification system
    kubectl apply -f "$ROOT_DIR/compliance/data-classification.yaml"
    
    # Apply audit logging
    kubectl apply -f "$ROOT_DIR/compliance/audit-logging.yaml"
    
    # Wait for compliance controller to be ready
    kubectl wait --for=condition=Available --timeout=300s deployment/compliance-controller -n compliance
    
    log_success "Compliance infrastructure deployed"
}

# Validate deployment
validate_deployment() {
    log_info "Validating deployment..."
    
    local validation_passed=true
    
    # Check cluster status
    local clusters=("trustram-aws-cluster" "trustram-azure-cluster" "trustram-gcp-cluster")
    for cluster in "${clusters[@]}"; do
        if kubectl get cluster "$cluster" -n multi-cloud-system -o jsonpath='{.status.phase}' | grep -q "Provisioned"; then
            log_success "Cluster $cluster is provisioned"
        else
            log_error "Cluster $cluster is not ready"
            validation_passed=false
        fi
    done
    
    # Check networking
    if kubectl get pods -n networking --field-selector=status.phase=Running | grep -q "vpn-gateway"; then
        log_success "VPN gateways are running"
    else
        log_error "VPN gateways are not running"
        validation_passed=false
    fi
    
    # Check compliance
    if kubectl get pods -n compliance --field-selector=status.phase=Running | grep -q "compliance-controller"; then
        log_success "Compliance controller is running"
    else
        log_error "Compliance controller is not running"
        validation_passed=false
    fi
    
    if $validation_passed; then
        log_success "Foundation deployment validation passed"
        return 0
    else
        log_error "Foundation deployment validation failed"
        return 1
    fi
}

# Display deployment status
display_status() {
    log_info "Foundation Infrastructure Deployment Status"
    echo "=========================================="
    
    # Cluster status
    echo "\nCluster Status:"
    kubectl get clusters -n multi-cloud-system -o custom-columns=NAME:.metadata.name,PHASE:.status.phase,READY:.status.conditions[?(@.type==\"Ready\")].status
    
    # Networking status
    echo "\nNetworking Status:"
    kubectl get pods -n networking -o wide
    
    # Compliance status
    echo "\nCompliance Status:"
    kubectl get pods -n compliance -o wide
    
    # Services status
    echo "\nServices Status:"
    kubectl get services -A | grep -E "(networking|compliance|multi-cloud-system)"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files..."
    rm -f /tmp/trustram-*-cluster-kubeconfig
}

# Error handling
error_handler() {
    log_error "An error occurred during deployment. Checking status..."
    display_status
    cleanup
    exit 1
}

# Set up error handling
trap error_handler ERR
trap cleanup EXIT

# Main execution
main() {
    log_info "Starting TrustStram v4.4 Foundation Infrastructure Deployment"
    
    # Check prerequisites
    if ! command -v kubectl >/dev/null 2>&1; then
        log_error "kubectl not found. Please run setup-prerequisites.sh first."
        exit 1
    fi
    
    if ! kubectl get namespace multi-cloud-system >/dev/null 2>&1; then
        log_error "multi-cloud-system namespace not found. Please run setup-prerequisites.sh first."
        exit 1
    fi
    
    # Deploy infrastructure components
    deploy_clusters
    
    # Wait for clusters to be ready (this may take 20-30 minutes)
    wait_for_clusters
    
    # Setup cluster federation
    setup_cluster_federation
    
    # Get cluster kubeconfigs
    get_cluster_kubeconfigs
    
    # Deploy networking
    deploy_networking
    
    # Deploy compliance
    deploy_compliance
    
    # Validate deployment
    if validate_deployment; then
        log_success "Foundation infrastructure deployment completed successfully!"
    else
        log_error "Foundation infrastructure deployment validation failed."
        display_status
        exit 1
    fi
    
    # Display final status
    display_status
    
    log_info "Next steps:"
    log_info "1. Run ./deploy-service-mesh.sh to configure Istio service mesh"
    log_info "2. Run ./deploy-monitoring.sh to setup monitoring and observability"
    log_info "3. Run ./deploy-cost-optimization.sh to enable AI-driven cost optimization"
    
    log_success "Foundation deployment completed!"
}

# Execute main function
main "$@"