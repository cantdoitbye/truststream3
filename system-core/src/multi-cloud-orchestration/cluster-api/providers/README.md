# Multi-Cloud Cluster API Providers README

This directory contains Kubernetes Cluster API (CAPI) provider configurations for AWS, Azure, and GCP, enabling cloud-agnostic cluster management as part of TrustStram v4.4's multi-cloud orchestration capabilities.

## Overview

The Multi-Cloud Orchestration system uses Cluster API to provide:

- **Cloud-Agnostic Architecture**: Consistent cluster management across AWS, Azure, and GCP
- **Automated Provisioning**: Declarative cluster lifecycle management
- **Cost Optimization**: Spot/preemptible instances and intelligent resource allocation
- **High Availability**: Multi-zone deployments with automated failover
- **Security**: Encryption at rest and in transit, RBAC, and network policies

## Directory Structure

```
providers/
├── aws/
│   ├── infrastructure-provider.yaml  # AWS CAPI provider configuration
│   └── cluster-template.yaml         # AWS cluster template
├── azure/
│   ├── infrastructure-provider.yaml  # Azure CAPI provider configuration
│   └── cluster-template.yaml         # Azure cluster template
├── gcp/
│   ├── infrastructure-provider.yaml  # GCP CAPI provider configuration
│   └── cluster-template.yaml         # GCP cluster template
├── setup-providers.sh               # Automated setup script
├── config.env                       # Environment configuration
└── README.md                        # This file
```

## Prerequisites

### Required Tools

1. **kubectl** (v1.28+)
2. **clusterctl** (v1.5.3+)
3. **kind** (v0.20.0+) - for management cluster
4. **Docker** - for kind

### Cloud Provider Credentials

#### AWS
```bash
export AWS_ACCESS_KEY_ID="your-access-key-id"
export AWS_SECRET_ACCESS_KEY="your-secret-access-key"
export AWS_REGION="us-west-2"
```

#### Azure
```bash
export AZURE_SUBSCRIPTION_ID="your-subscription-id"
export AZURE_TENANT_ID="your-tenant-id"
export AZURE_CLIENT_ID="your-client-id"
export AZURE_CLIENT_SECRET="your-client-secret"
```

#### GCP
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-west1"
```

## Quick Start

### 1. Setup Environment

```bash
# Source the configuration
source config.env

# Validate configuration
validate_all_configs

# Make setup script executable
chmod +x setup-providers.sh
```

### 2. Initialize CAPI Management Cluster

```bash
# Setup management cluster and CAPI providers
./setup-providers.sh setup
```

This will:
- Install prerequisites (clusterctl, kind)
- Create a kind management cluster
- Initialize Cluster API with AWS, Azure, and GCP providers
- Configure cloud provider credentials
- Apply provider configurations

### 3. Deploy Workload Clusters

```bash
# Deploy clusters to all configured cloud providers
./setup-providers.sh deploy
```

### 4. Monitor Cluster Status

```bash
# Monitor cluster creation progress
./setup-providers.sh monitor

# Watch specific cluster
kubectl get cluster trustram-aws-cluster -w
kubectl get cluster trustram-azure-cluster -w
kubectl get cluster trustram-gcp-cluster -w
```

### 5. Get Cluster Credentials

```bash
# Get kubeconfig for specific cluster
./setup-providers.sh credentials trustram-aws-cluster
./setup-providers.sh credentials trustram-azure-cluster
./setup-providers.sh credentials trustram-gcp-cluster

# Use the cluster
export KUBECONFIG=./trustram-aws-cluster-kubeconfig.yaml
kubectl get nodes
```

## Architecture Details

### AWS Configuration

- **Instance Types**: m5.xlarge (control plane), m5.large (workers)
- **Networking**: Custom VPC with public/private subnets across 3 AZs
- **Security**: IAM roles, security groups, encrypted EBS volumes
- **Cost Optimization**: Spot instances for workers
- **Storage**: EBS CSI driver with gp3 volumes

### Azure Configuration

- **Instance Types**: Standard_D4s_v3 (control plane), Standard_D2s_v3 (workers)
- **Networking**: Custom VNet with subnets and NSGs
- **Security**: Managed identity, encryption at host
- **Cost Optimization**: Spot VMs for workers
- **Storage**: Azure Disk and File CSI drivers

### GCP Configuration

- **Instance Types**: n2-standard-4 (control plane), n2-standard-2 (workers)
- **Networking**: Custom VPC with subnets and firewall rules
- **Security**: Service accounts, IAM roles
- **Cost Optimization**: Preemptible instances for workers
- **Storage**: GCP Compute Persistent Disk CSI driver

## Advanced Configuration

### Custom Machine Types

Modify the machine templates in each provider's configuration:

```yaml
# For AWS
spec:
  template:
    spec:
      instanceType: "m5.2xlarge"  # Customize as needed
```

### Networking Customization

Update CIDR blocks and subnets in the cluster templates:

```yaml
# Example for AWS
network:
  vpc:
    cidrBlock: "10.0.0.0/16"  # Customize as needed
```

### Cost Optimization Settings

```bash
# Enable spot instances
export ENABLE_SPOT_INSTANCES="true"
export AWS_SPOT_MAX_PRICE="0.10"
export AZURE_SPOT_MAX_PRICE="-1"
export GCP_PREEMPTIBLE_INSTANCES="true"
```

### Auto-scaling Configuration

```bash
# Configure auto-scaling
export MIN_WORKER_NODES="3"
export MAX_WORKER_NODES="10"
export AUTO_SCALE_ENABLED="true"
```

## Security Considerations

### Encryption

- **At Rest**: All storage volumes are encrypted
- **In Transit**: TLS for all communications
- **Secrets**: Kubernetes secrets for credentials

### Network Security

- **Firewalls**: Restrictive security groups/NSGs/firewall rules
- **Private Networking**: Worker nodes in private subnets
- **Network Policies**: Calico CNI with network policies

### RBAC

- **Admission Controllers**: NodeRestriction, MutatingAdmissionWebhook, ValidatingAdmissionWebhook
- **Service Accounts**: Least privilege access
- **Pod Security**: Pod security policies enabled

## Monitoring and Observability

### Cluster API Monitoring

```bash
# Check CAPI controller status
kubectl get pods -n capi-system
kubectl get pods -n capa-system  # AWS
kubectl get pods -n capz-system  # Azure
kubectl get pods -n capg-system  # GCP

# View CAPI resources
kubectl get clusters
kubectl get machines
kubectl get machinedeployments
kubectl get machinepools
```

### Logs

```bash
# CAPI controller logs
kubectl logs -n capi-system -l cluster.x-k8s.io/provider=cluster-api

# Provider-specific logs
kubectl logs -n capa-system -l cluster.x-k8s.io/provider=infrastructure-aws
kubectl logs -n capz-system -l cluster.x-k8s.io/provider=infrastructure-azure
kubectl logs -n capg-system -l cluster.x-k8s.io/provider=infrastructure-gcp
```

## Troubleshooting

### Common Issues

1. **Credentials Not Found**
   ```bash
   # Verify credentials are set
   source config.env
   validate_all_configs
   ```

2. **Cluster Creation Stuck**
   ```bash
   # Check machine status
   kubectl get machines -o wide
   kubectl describe machine <machine-name>
   ```

3. **Network Connectivity Issues**
   ```bash
   # Check cloud provider logs
   kubectl logs -n <provider-namespace> -l cluster.x-k8s.io/provider=infrastructure-<provider>
   ```

4. **API Server Unreachable**
   ```bash
   # Check control plane machines
   kubectl get kubeadmcontrolplane
   kubectl describe kubeadmcontrolplane <name>
   ```

### Recovery Procedures

1. **Delete and Recreate Cluster**
   ```bash
   kubectl delete cluster <cluster-name>
   # Wait for deletion to complete
   kubectl apply -f providers/<provider>/cluster-template.yaml
   ```

2. **Scale Control Plane**
   ```bash
   kubectl patch kubeadmcontrolplane <name> --type merge --patch '{"spec":{"replicas":3}}'
   ```

3. **Force Delete Stuck Resources**
   ```bash
   kubectl patch machine <machine-name> --type merge --patch '{"metadata":{"finalizers":[]}}'
   ```

## Cost Optimization

### Spot/Preemptible Instances

- **AWS**: Spot instances with configurable max price
- **Azure**: Spot VMs with eviction policies
- **GCP**: Preemptible instances for 60-91% cost savings

### Right-sizing

- **Control Plane**: High-performance instances for etcd and API server
- **Workers**: Standard instances with auto-scaling
- **Storage**: GP3 (AWS), Standard LRS (Azure), pd-standard (GCP)

### Resource Management

- **Auto-scaling**: Horizontal Pod Autoscaler and Cluster Autoscaler
- **Resource Limits**: CPU and memory limits on all workloads
- **Monitoring**: Cost tracking through cloud provider billing APIs

## Disaster Recovery

### Backup Strategy

- **etcd Backups**: Automated daily backups
- **Application Data**: Velero for application backup
- **Configuration**: Git-based configuration management

### Recovery Procedures

- **RTO Target**: < 1 minute for automated failover
- **RPO Target**: < 5 seconds for data synchronization
- **Multi-Region**: Deploy across multiple regions for disaster recovery

## Contributing

When modifying CAPI configurations:

1. Update provider-specific templates
2. Test with development clusters first
3. Update documentation
4. Validate with `validate_all_configs`
5. Test deployment with `./setup-providers.sh`

## Support

For issues related to multi-cloud orchestration:

1. Check troubleshooting section
2. Review CAPI provider documentation
3. Check cloud provider-specific requirements
4. Contact TrustStram support team

---

**Note**: This configuration is part of TrustStram v4.4's multi-cloud orchestration capabilities. Ensure compliance with your organization's security and governance policies before deploying to production environments.
