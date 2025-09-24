#!/bin/bash
# CAPI Provider Validation Script
# This script validates CAPI provider configurations and cluster templates

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[VALIDATE] $1${NC}"
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

# Validation counters
ERROR_COUNT=0
WARNING_COUNT=0

# Function to increment error count
add_error() {
    ERROR_COUNT=$((ERROR_COUNT + 1))
    error "$1"
}

# Function to increment warning count
add_warning() {
    WARNING_COUNT=$((WARNING_COUNT + 1))
    warn "$1"
}

# Validate YAML syntax
validate_yaml_syntax() {
    local file="$1"
    log "Validating YAML syntax for $file"
    
    if ! command -v yq &> /dev/null; then
        add_warning "yq not installed, skipping YAML syntax validation"
        return 0
    fi
    
    if ! yq eval '.' "$file" > /dev/null 2>&1; then
        add_error "Invalid YAML syntax in $file"
        return 1
    fi
    
    success "YAML syntax valid for $file"
    return 0
}

# Validate Kubernetes resource definitions
validate_k8s_resources() {
    local file="$1"
    log "Validating Kubernetes resources in $file"
    
    if ! command -v kubectl &> /dev/null; then
        add_warning "kubectl not installed, skipping Kubernetes resource validation"
        return 0
    fi
    
    # Dry-run validation
    if ! kubectl apply --dry-run=client -f "$file" > /dev/null 2>&1; then
        add_error "Invalid Kubernetes resources in $file"
        return 1
    fi
    
    success "Kubernetes resources valid for $file"
    return 0
}

# Validate AWS configuration
validate_aws_config() {
    log "Validating AWS CAPI configuration"
    
    local aws_dir="providers/aws"
    
    # Check if AWS provider files exist
    if [ ! -f "$aws_dir/infrastructure-provider.yaml" ]; then
        add_error "AWS infrastructure provider file not found"
        return 1
    fi
    
    if [ ! -f "$aws_dir/cluster-template.yaml" ]; then
        add_error "AWS cluster template file not found"
        return 1
    fi
    
    # Validate YAML syntax
    validate_yaml_syntax "$aws_dir/infrastructure-provider.yaml"
    validate_yaml_syntax "$aws_dir/cluster-template.yaml"
    
    # Validate Kubernetes resources
    validate_k8s_resources "$aws_dir/infrastructure-provider.yaml"
    validate_k8s_resources "$aws_dir/cluster-template.yaml"
    
    # Check for required AWS-specific configurations
    if ! grep -q "AWSClusterTemplate" "$aws_dir/infrastructure-provider.yaml"; then
        add_error "AWSClusterTemplate not found in AWS infrastructure provider"
    fi
    
    if ! grep -q "AWSMachineTemplate" "$aws_dir/infrastructure-provider.yaml"; then
        add_error "AWSMachineTemplate not found in AWS infrastructure provider"
    fi
    
    # Check for security configurations
    if ! grep -q "encrypted: true" "$aws_dir/infrastructure-provider.yaml"; then
        add_warning "EBS encryption not explicitly enabled in AWS configuration"
    fi
    
    # Check for cost optimization
    if ! grep -q "spotMarketOptions" "$aws_dir/infrastructure-provider.yaml"; then
        add_warning "Spot instances not configured for cost optimization"
    fi
    
    success "AWS configuration validation completed"
}

# Validate Azure configuration
validate_azure_config() {
    log "Validating Azure CAPI configuration"
    
    local azure_dir="providers/azure"
    
    # Check if Azure provider files exist
    if [ ! -f "$azure_dir/infrastructure-provider.yaml" ]; then
        add_error "Azure infrastructure provider file not found"
        return 1
    fi
    
    if [ ! -f "$azure_dir/cluster-template.yaml" ]; then
        add_error "Azure cluster template file not found"
        return 1
    fi
    
    # Validate YAML syntax
    validate_yaml_syntax "$azure_dir/infrastructure-provider.yaml"
    validate_yaml_syntax "$azure_dir/cluster-template.yaml"
    
    # Validate Kubernetes resources
    validate_k8s_resources "$azure_dir/infrastructure-provider.yaml"
    validate_k8s_resources "$azure_dir/cluster-template.yaml"
    
    # Check for required Azure-specific configurations
    if ! grep -q "AzureClusterTemplate" "$azure_dir/infrastructure-provider.yaml"; then
        add_error "AzureClusterTemplate not found in Azure infrastructure provider"
    fi
    
    if ! grep -q "AzureMachineTemplate" "$azure_dir/infrastructure-provider.yaml"; then
        add_error "AzureMachineTemplate not found in Azure infrastructure provider"
    fi
    
    # Check for security configurations
    if ! grep -q "encryptionAtHost: true" "$azure_dir/infrastructure-provider.yaml"; then
        add_warning "Host encryption not explicitly enabled in Azure configuration"
    fi
    
    # Check for cost optimization
    if ! grep -q "spotVMOptions" "$azure_dir/infrastructure-provider.yaml"; then
        add_warning "Spot VMs not configured for cost optimization"
    fi
    
    success "Azure configuration validation completed"
}

# Validate GCP configuration
validate_gcp_config() {
    log "Validating GCP CAPI configuration"
    
    local gcp_dir="providers/gcp"
    
    # Check if GCP provider files exist
    if [ ! -f "$gcp_dir/infrastructure-provider.yaml" ]; then
        add_error "GCP infrastructure provider file not found"
        return 1
    fi
    
    if [ ! -f "$gcp_dir/cluster-template.yaml" ]; then
        add_error "GCP cluster template file not found"
        return 1
    fi
    
    # Validate YAML syntax
    validate_yaml_syntax "$gcp_dir/infrastructure-provider.yaml"
    validate_yaml_syntax "$gcp_dir/cluster-template.yaml"
    
    # Validate Kubernetes resources
    validate_k8s_resources "$gcp_dir/infrastructure-provider.yaml"
    validate_k8s_resources "$gcp_dir/cluster-template.yaml"
    
    # Check for required GCP-specific configurations
    if ! grep -q "GCPClusterTemplate" "$gcp_dir/infrastructure-provider.yaml"; then
        add_error "GCPClusterTemplate not found in GCP infrastructure provider"
    fi
    
    if ! grep -q "GCPMachineTemplate" "$gcp_dir/infrastructure-provider.yaml"; then
        add_error "GCPMachineTemplate not found in GCP infrastructure provider"
    fi
    
    # Check for security configurations
    if ! grep -q "encrypted: true" "$gcp_dir/infrastructure-provider.yaml"; then
        add_warning "Disk encryption not explicitly enabled in GCP configuration"
    fi
    
    # Check for cost optimization
    if ! grep -q "preemptible: true" "$gcp_dir/infrastructure-provider.yaml"; then
        add_warning "Preemptible instances not configured for cost optimization"
    fi
    
    success "GCP configuration validation completed"
}

# Validate network configurations
validate_network_configs() {
    log "Validating network configurations"
    
    local cidr_blocks=()
    
    # Extract CIDR blocks from all configurations
    if [ -f "providers/aws/cluster-template.yaml" ]; then
        cidr_blocks+=($(grep -o '10\.0\.[0-9]\+\.[0-9]\+/[0-9]\+' providers/aws/cluster-template.yaml || true))
    fi
    
    if [ -f "providers/azure/cluster-template.yaml" ]; then
        cidr_blocks+=($(grep -o '10\.1\.[0-9]\+\.[0-9]\+/[0-9]\+' providers/azure/cluster-template.yaml || true))
    fi
    
    if [ -f "providers/gcp/cluster-template.yaml" ]; then
        cidr_blocks+=($(grep -o '10\.2\.[0-9]\+\.[0-9]\+/[0-9]\+' providers/gcp/cluster-template.yaml || true))
    fi
    
    # Check for CIDR conflicts
    local unique_cidrs=($(printf '%s\n' "${cidr_blocks[@]}" | sort -u))
    if [ ${#cidr_blocks[@]} -ne ${#unique_cidrs[@]} ]; then
        add_warning "Potential CIDR block conflicts detected between cloud providers"
    fi
    
    # Validate pod and service CIDRs
    local pod_cidrs=()
    local service_cidrs=()
    
    for provider_dir in providers/*/; do
        if [ -f "$provider_dir/cluster-template.yaml" ]; then
            pod_cidrs+=($(grep -A5 "pods:" "$provider_dir/cluster-template.yaml" | grep "cidrBlocks:" -A1 | grep -o '192\.168\.[0-9]\+\.[0-9]\+/[0-9]\+' || true))
            service_cidrs+=($(grep -A5 "services:" "$provider_dir/cluster-template.yaml" | grep "cidrBlocks:" -A1 | grep -o '10\.96\.[0-9]\+\.[0-9]\+/[0-9]\+' || true))
        fi
    done
    
    # Check for consistent pod and service CIDRs
    local unique_pod_cidrs=($(printf '%s\n' "${pod_cidrs[@]}" | sort -u))
    local unique_service_cidrs=($(printf '%s\n' "${service_cidrs[@]}" | sort -u))
    
    if [ ${#unique_pod_cidrs[@]} -gt 1 ]; then
        add_warning "Inconsistent pod CIDR blocks across cloud providers"
    fi
    
    if [ ${#unique_service_cidrs[@]} -gt 1 ]; then
        add_warning "Inconsistent service CIDR blocks across cloud providers"
    fi
    
    success "Network configuration validation completed"
}

# Validate security configurations
validate_security_configs() {
    log "Validating security configurations"
    
    # Check for RBAC configurations
    local rbac_found=false
    for provider_dir in providers/*/; do
        if [ -f "$provider_dir/cluster-template.yaml" ]; then
            if grep -q "enable-admission-plugins" "$provider_dir/cluster-template.yaml"; then
                rbac_found=true
                break
            fi
        fi
    done
    
    if [ "$rbac_found" = false ]; then
        add_warning "RBAC admission plugins not found in cluster configurations"
    fi
    
    # Check for audit logging
    local audit_found=false
    for provider_dir in providers/*/; do
        if [ -f "$provider_dir/cluster-template.yaml" ]; then
            if grep -q "audit-log-path" "$provider_dir/cluster-template.yaml"; then
                audit_found=true
                break
            fi
        fi
    done
    
    if [ "$audit_found" = false ]; then
        add_warning "Audit logging not configured in cluster templates"
    fi
    
    # Check for CNI network policies
    local calico_found=false
    for provider_dir in providers/*/; do
        if [ -f "$provider_dir/cluster-template.yaml" ]; then
            if grep -q "calico" "$provider_dir/cluster-template.yaml"; then
                calico_found=true
                break
            fi
        fi
    done
    
    if [ "$calico_found" = false ]; then
        add_warning "Calico CNI not found, network policies may not be available"
    fi
    
    success "Security configuration validation completed"
}

# Validate cost optimization configurations
validate_cost_optimization() {
    log "Validating cost optimization configurations"
    
    # Check AWS spot instances
    if [ -f "providers/aws/infrastructure-provider.yaml" ]; then
        if ! grep -q "spotMarketOptions" "providers/aws/infrastructure-provider.yaml"; then
            add_warning "AWS spot instances not configured for cost optimization"
        fi
    fi
    
    # Check Azure spot VMs
    if [ -f "providers/azure/infrastructure-provider.yaml" ]; then
        if ! grep -q "spotVMOptions" "providers/azure/infrastructure-provider.yaml"; then
            add_warning "Azure spot VMs not configured for cost optimization"
        fi
    fi
    
    # Check GCP preemptible instances
    if [ -f "providers/gcp/infrastructure-provider.yaml" ]; then
        if ! grep -q "preemptible: true" "providers/gcp/infrastructure-provider.yaml"; then
            add_warning "GCP preemptible instances not configured for cost optimization"
        fi
    fi
    
    # Check for auto-scaling configurations
    local autoscaling_found=false
    for provider_dir in providers/*/; do
        if [ -f "$provider_dir/cluster-template.yaml" ]; then
            if grep -q "minSize\|maxSize\|scaling" "$provider_dir/cluster-template.yaml"; then
                autoscaling_found=true
                break
            fi
        fi
    done
    
    if [ "$autoscaling_found" = false ]; then
        add_warning "Auto-scaling configurations not found"
    fi
    
    success "Cost optimization validation completed"
}

# Validate high availability configurations
validate_ha_configs() {
    log "Validating high availability configurations"
    
    # Check control plane replicas
    for provider_dir in providers/*/; do
        if [ -f "$provider_dir/cluster-template.yaml" ]; then
            local replicas=$(grep "replicas:" "$provider_dir/cluster-template.yaml" | grep -o '[0-9]\+' || echo "1")
            if [ "$replicas" -lt 3 ]; then
                add_warning "Control plane replicas less than 3 in $(basename "$provider_dir") - not highly available"
            fi
        fi
    done
    
    # Check multi-zone configurations
    for provider_dir in providers/*/; do
        if [ -f "$provider_dir/cluster-template.yaml" ]; then
            local provider_name=$(basename "$provider_dir")
            case "$provider_name" in
                aws)
                    if ! grep -q "us-west-2[abc]" "$provider_dir/cluster-template.yaml"; then
                        add_warning "AWS multi-AZ configuration not found"
                    fi
                    ;;
                azure)
                    # Azure uses implicit zones through Standard SKU load balancers
                    if ! grep -q "Standard" "$provider_dir/cluster-template.yaml"; then
                        add_warning "Azure Standard SKU not configured for zone redundancy"
                    fi
                    ;;
                gcp)
                    if ! grep -q "failureDomains" "$provider_dir/cluster-template.yaml"; then
                        add_warning "GCP failure domains not configured"
                    fi
                    ;;
            esac
        fi
    done
    
    success "High availability validation completed"
}

# Main validation function
main() {
    echo "======================================"
    echo "CAPI Provider Configuration Validation"
    echo "======================================"
    
    # Change to providers directory
    if [ ! -d "providers" ]; then
        error "Providers directory not found. Please run from the cluster-api directory."
        exit 1
    fi
    
    cd providers || exit 1
    
    # Run all validations
    validate_aws_config
    validate_azure_config
    validate_gcp_config
    validate_network_configs
    validate_security_configs
    validate_cost_optimization
    validate_ha_configs
    
    # Summary
    echo ""
    echo "======================================"
    echo "Validation Summary"
    echo "======================================"
    
    if [ $ERROR_COUNT -eq 0 ] && [ $WARNING_COUNT -eq 0 ]; then
        success "All validations passed! Configuration is ready for deployment."
        exit 0
    elif [ $ERROR_COUNT -eq 0 ]; then
        warn "Validation completed with $WARNING_COUNT warnings. Review warnings before deployment."
        exit 0
    else
        error "Validation failed with $ERROR_COUNT errors and $WARNING_COUNT warnings."
        error "Please fix all errors before proceeding with deployment."
        exit 1
    fi
}

# Run main function
main "$@"
