# Kubernetes Deployment Guide

**Version**: TrustStram v4.4  
**Updated**: 2025-09-22  
**Recommended For**: Production environments  
**Estimated Time**: 4-8 hours  

## 🎯 **Overview**

This guide provides step-by-step instructions for deploying TrustStram v4.4 on Kubernetes, including all AI/ML components, federated learning infrastructure, and multi-cloud orchestration capabilities.

## 📋 **Prerequisites**

### 🔧 **Cluster Requirements**
- **Kubernetes Version**: 1.24+ (1.26+ recommended)
- **Node Count**: Minimum 3 nodes (6+ recommended for production)
- **Node Resources**: 8 CPU cores, 32GB RAM per node minimum
- **Storage**: Dynamic volume provisioning (CSI drivers)
- **Network**: CNI plugin (Calico, Flannel, or Cilium)
- **Ingress Controller**: NGINX, Traefik, or cloud provider ingress

### 🔐 **Security Requirements**
- **RBAC**: Enabled and configured
- **Pod Security Standards**: Baseline or Restricted profile
- **Network Policies**: Support for network segmentation
- **Secret Management**: External secrets operator (recommended)
- **Image Security**: Container image scanning and signing

### 💾 **Software Tools**
```bash
# Required tools
kubectl >= 1.24.0
helm >= 3.8.0
yq >= 4.0.0
jq >= 1.6

# Optional but recommended
kustomize >= 4.5.0
istio >= 1.16.0  # For service mesh
prometheus-operator >= 0.60.0
```

## 🚀 **Quick Start Deployment**

### 📚 **1. Prepare Namespace and RBAC**

```bash
# Create namespace
kubectl create namespace truststream-v44

# Set default namespace
kubectl config set-context --current --namespace=truststream-v44

# Apply RBAC configurations
kubectl apply -f deployment/kubernetes/rbac/
```

### 🗺️ **2. Deploy Infrastructure Components**

```bash
# Deploy PostgreSQL
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install postgresql bitnami/postgresql \
  --version 12.1.9 \
  --values deployment/kubernetes/values/postgresql-values.yaml

# Deploy Redis
helm install redis bitnami/redis \
  --version 17.4.3 \
  --values deployment/kubernetes/values/redis-values.yaml

# Deploy Neo4j (for knowledge graphs)
helm repo add neo4j https://helm.neo4j.com/neo4j
helm install neo4j neo4j/neo4j \
  --version 5.3.0 \
  --values deployment/kubernetes/values/neo4j-values.yaml

# Wait for databases to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=postgresql --timeout=300s
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=redis --timeout=300s
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=neo4j --timeout=300s
```

### 🔐 **3. Configure Secrets and ConfigMaps**

```bash
# Create secrets from environment file
kubectl create secret generic truststream-secrets \
  --from-env-file=config/production.env

# Create TLS secrets
kubectl create secret tls truststream-tls \
  --cert=certs/truststream.crt \
  --key=certs/truststream.key

# Apply ConfigMaps
kubectl apply -f deployment/kubernetes/configmaps/
```

### 🌐 **4. Deploy Core Application**

```bash
# Deploy main application
kubectl apply -f deployment/kubernetes/deployments/app-deployment.yaml

# Deploy worker processes
kubectl apply -f deployment/kubernetes/deployments/worker-deployment.yaml

# Deploy nginx reverse proxy
kubectl apply -f deployment/kubernetes/deployments/nginx-deployment.yaml

# Deploy services
kubectl apply -f deployment/kubernetes/services/

# Wait for deployments
kubectl wait --for=condition=available deployment/truststream-app --timeout=600s
kubectl wait --for=condition=available deployment/truststream-worker --timeout=600s
kubectl wait --for=condition=available deployment/truststream-nginx --timeout=300s
```

### 🤖 **5. Deploy AI/ML Components**

```bash
# Deploy Federated Learning aggregation servers
kubectl apply -f deployment/kubernetes/ai-ml/federated-learning/

# Deploy AI Explainability service
kubectl apply -f deployment/kubernetes/ai-ml/ai-explainability/

# Deploy Quantum Encryption service
kubectl apply -f deployment/kubernetes/ai-ml/quantum-encryption/

# Deploy Multi-Cloud Orchestration
kubectl apply -f deployment/kubernetes/ai-ml/multi-cloud/

# Wait for AI services
kubectl wait --for=condition=available deployment -l component=ai-ml --timeout=600s
```

### 🌐 **6. Configure Ingress and Load Balancing**

```bash
# Deploy ingress controller (if not already installed)
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace

# Deploy application ingress
kubectl apply -f deployment/kubernetes/ingress/

# Configure external DNS (optional)
kubectl apply -f deployment/kubernetes/external-dns/
```

### 📊 **7. Deploy Monitoring Stack**

```bash
# Deploy Prometheus and Grafana
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install monitoring prometheus-community/kube-prometheus-stack \
  --values deployment/kubernetes/monitoring/prometheus-values.yaml

# Deploy custom dashboards
kubectl apply -f deployment/kubernetes/monitoring/dashboards/

# Deploy alert rules
kubectl apply -f deployment/kubernetes/monitoring/alerts/
```

## 🔄 **Advanced Deployment Options**

### 🔵 **Blue-Green Deployment**

```bash
# Deploy to blue environment
export TARGET_ENV=blue
envsubst < deployment/kubernetes/deployments/app-deployment.yaml | kubectl apply -f -

# Test blue environment
./scripts/test-environment.sh blue

# Switch traffic to blue
kubectl patch service truststream-service -p '{"spec":{"selector":{"environment":"blue"}}}'

# Deploy to green environment
export TARGET_ENV=green
envsubst < deployment/kubernetes/deployments/app-deployment.yaml | kubectl apply -f -

# Switch traffic to green
kubectl patch service truststream-service -p '{"spec":{"selector":{"environment":"green"}}}'
```

### 🔄 **Canary Deployment with Istio**

```bash
# Install Istio
istioctl install --set values.defaultRevision=default

# Enable sidecar injection
kubectl label namespace truststream-v44 istio-injection=enabled

# Deploy Istio gateway and virtual service
kubectl apply -f deployment/kubernetes/istio/

# Deploy canary version
kubectl apply -f deployment/kubernetes/deployments/app-deployment-canary.yaml

# Configure traffic splitting (10% to canary)
kubectl apply -f deployment/kubernetes/istio/virtual-service-canary.yaml
```

### 📊 **Horizontal Pod Autoscaling**

```bash
# Deploy metrics server (if not installed)
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Deploy HPA configurations
kubectl apply -f deployment/kubernetes/hpa/

# Deploy Vertical Pod Autoscaler (VPA)
kubectl apply -f deployment/kubernetes/vpa/

# Deploy cluster autoscaler
kubectl apply -f deployment/kubernetes/cluster-autoscaler/
```

## 🔐 **Security Hardening**

### 🛡️ **Network Policies**

```bash
# Apply network policies for micro-segmentation
kubectl apply -f deployment/kubernetes/network-policies/

# Verify network policies
kubectl get networkpolicies
kubectl describe networkpolicy truststream-network-policy
```

### 🔒 **Pod Security Standards**

```bash
# Apply Pod Security Standards
kubectl label namespace truststream-v44 \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/warn=restricted

# Deploy security policies
kubectl apply -f deployment/kubernetes/security-policies/
```

### 🔑 **External Secrets Operator**

```bash
# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets-system \
  --create-namespace

# Configure secret stores
kubectl apply -f deployment/kubernetes/external-secrets/
```

## 📊 **Monitoring and Observability**

### 📈 **Prometheus Configuration**

```yaml
# Custom Prometheus rules for TrustStram
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: truststream-rules
spec:
  groups:
  - name: truststream.rules
    rules:
    - alert: TrustStreamHighErrorRate
      expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: High error rate detected
    
    - alert: FederatedLearningAggregationFailure
      expr: federated_learning_aggregation_failures_total > 3
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: Federated learning aggregation failures
```

### 📋 **Grafana Dashboards**

```bash
# Import TrustStram dashboards
kubectl apply -f deployment/kubernetes/monitoring/dashboards/truststream-overview.yaml
kubectl apply -f deployment/kubernetes/monitoring/dashboards/ai-ml-metrics.yaml
kubectl apply -f deployment/kubernetes/monitoring/dashboards/federated-learning.yaml
kubectl apply -f deployment/kubernetes/monitoring/dashboards/quantum-encryption.yaml
```

### 📋 **Distributed Tracing**

```bash
# Deploy Jaeger
kubectl create namespace observability
kubectl apply -f https://github.com/jaegertracing/jaeger-operator/releases/download/v1.40.0/jaeger-operator.yaml -n observability

# Deploy Jaeger instance
kubectl apply -f deployment/kubernetes/tracing/jaeger.yaml
```

## 💾 **Storage Configuration**

### 🗚️ **Persistent Volume Claims**

```yaml
# PostgreSQL storage
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgresql-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 100Gi
---
# Redis storage
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 50Gi
```

### 🗜️ **Backup Configuration**

```bash
# Deploy Velero for cluster backups
helm repo add vmware-tanzu https://vmware-tanzu.github.io/helm-charts/
helm install velero vmware-tanzu/velero \
  --namespace velero \
  --create-namespace \
  --values deployment/kubernetes/backup/velero-values.yaml

# Create backup schedules
kubectl apply -f deployment/kubernetes/backup/schedules/
```

## 🔧 **Maintenance Operations**

### 🔄 **Rolling Updates**

```bash
# Update application image
kubectl set image deployment/truststream-app \
  app=truststream:v4.4.1 \
  --record

# Monitor rollout
kubectl rollout status deployment/truststream-app

# Rollback if needed
kubectl rollout undo deployment/truststream-app
```

### 📊 **Scaling Operations**

```bash
# Manual scaling
kubectl scale deployment truststream-app --replicas=10

# Check HPA status
kubectl get hpa

# Force HPA recalculation
kubectl annotate hpa truststream-app-hpa \
  autoscaling.alpha.kubernetes.io/metrics='[{"type":"Resource","resource":{"name":"cpu","targetAverageUtilization":70}}]'
```

### 🔍 **Debugging and Troubleshooting**

```bash
# Check pod logs
kubectl logs -f deployment/truststream-app

# Execute into pod
kubectl exec -it deployment/truststream-app -- bash

# Check resource usage
kubectl top pods
kubectl top nodes

# Describe problematic resources
kubectl describe pod <pod-name>
kubectl describe node <node-name>

# Check events
kubectl get events --sort-by=.metadata.creationTimestamp
```

## 🚑 **Disaster Recovery**

### 🔄 **Backup and Restore Procedures**

```bash
# Create on-demand backup
velero backup create truststream-backup-$(date +%Y%m%d-%H%M%S) \
  --include-namespaces truststream-v44

# Restore from backup
velero restore create --from-backup truststream-backup-20250922-140000

# Database point-in-time recovery
./scripts/restore-database-pit.sh "2025-09-22 14:00:00"
```

### 🌍 **Multi-Region Failover**

```bash
# Switch to secondary region
./scripts/failover-to-region.sh us-west-2

# Monitor cross-region replication
kubectl get pods -l app=cross-region-replicator

# Test connectivity to failed region
./scripts/test-region-connectivity.sh us-east-1
```

## ✅ **Post-Deployment Validation**

### 🔍 **Health Checks**

```bash
# Check all pods are running
kubectl get pods -A

# Verify services are accessible
kubectl get services

# Test ingress connectivity
curl -k https://truststream.yourdomain.com/health

# Run comprehensive health check
./scripts/kubernetes-health-check.sh
```

### 📊 **Performance Validation**

```bash
# Run performance tests
./scripts/k8s-performance-test.sh

# Check resource utilization
kubectl top pods --containers

# Validate autoscaling
./scripts/test-autoscaling.sh
```

### 🔐 **Security Validation**

```bash
# Scan for security issues
kubectl apply -f deployment/kubernetes/security-scans/

# Check RBAC permissions
kubectl auth can-i --list --as=system:serviceaccount:truststream-v44:default

# Validate network policies
./scripts/test-network-policies.sh
```

## 📞 **Support and Resources**

### 🆘 **Emergency Support**
- **Kubernetes Emergency**: +1-800-TRUSTSTREAM ext. 1
- **Technical Support**: k8s-support@truststream.ai
- **Slack Channel**: #kubernetes-deployment

### 📋 **Additional Resources**
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
- [TrustStram Kubernetes Troubleshooting](troubleshooting/kubernetes-issues.md)
- [Performance Tuning Guide](../04-monitoring-operations/performance-tuning.md)
- [Security Hardening Guide](../03-configuration-management/security-configuration.md)

---

**Deployment Status**: ✅ Production Ready  
**Estimated Deployment Time**: 4-8 hours  
**Next Step**: Configure [Monitoring and Operations](../04-monitoring-operations/README.md)  
**Last Updated**: 2025-09-22  
