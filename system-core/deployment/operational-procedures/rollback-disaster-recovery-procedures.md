# TrustStram v4.4 Rollback & Disaster Recovery Procedures

**Version**: 4.4.0  
**Last Updated**: September 21, 2025  
**Classification**: Critical Operations Manual  
**RTO Target**: 15 minutes  
**RPO Target**: 5 minutes  

---

## 🎯 **Emergency Response Overview**

This document provides comprehensive procedures for emergency rollback and disaster recovery scenarios for TrustStram v4.4 enterprise deployment.

### **Emergency Contact Information**
| Role | Contact | Phone | Email |
|------|---------|-------|-------|
| **On-Call Engineer** | [Name] | [Phone] | [Email] |
| **Technical Lead** | [Name] | [Phone] | [Email] |
| **DevOps Manager** | [Name] | [Phone] | [Email] |
| **Security Officer** | [Name] | [Phone] | [Email] |
| **Business Continuity** | [Name] | [Phone] | [Email] |

### **Severity Levels**
- **P0 (Critical)**: Complete service outage, data loss risk
- **P1 (High)**: Major functionality impaired, performance degraded
- **P2 (Medium)**: Minor functionality impaired, workarounds available
- **P3 (Low)**: Cosmetic issues, no business impact

---

## 🚨 **Emergency Rollback Procedures**

### **Immediate Response (0-5 minutes)**

#### **Step 1: Incident Assessment**
```bash
# Quick health check
curl -f https://truststream.yourdomain.com/health || echo "SERVICE DOWN"

# Check critical services
kubectl get pods -n truststream-production | grep -v Running

# Check recent deployments
kubectl rollout history deployment/truststream-api -n truststream-production
```

**Decision Matrix:**
- **All services down** → Execute immediate rollback
- **Partial outage** → Assess impact, consider targeted rollback
- **Performance issues** → Monitor for 5 minutes, then decide
- **Security breach** → Immediate rollback + security protocol

#### **Step 2: Stakeholder Notification**
```bash
# Send immediate alert
./scripts/notifications/send-emergency-alert.sh \
  --severity P0 \
  --message "Initiating emergency rollback for TrustStram v4.4" \
  --incident-id "$(date +%Y%m%d-%H%M%S)"
```

### **Rollback Execution (5-15 minutes)**

#### **Option 1: Kubernetes Rolling Rollback**
```bash
# Rollback to previous version
kubectl rollout undo deployment/truststream-api -n truststream-production
kubectl rollout undo deployment/truststream-worker -n truststream-production
kubectl rollout undo deployment/truststream-scheduler -n truststream-production

# Monitor rollback progress
kubectl rollout status deployment/truststream-api -n truststream-production --timeout=300s

# Verify rollback
kubectl get pods -n truststream-production -o wide
```

#### **Option 2: Blue-Green Instant Switch**
```bash
# Switch traffic to green environment
kubectl patch service truststream-api -n truststream-production \
  -p '{"spec":{"selector":{"version":"green"}}}'

# Verify traffic switch
kubectl get service truststream-api -n truststream-production -o yaml | grep selector

# Monitor green environment
watch kubectl get pods -l version=green -n truststream-production
```

#### **Option 3: DNS Failover (Multi-Region)**
```bash
# Switch DNS to backup region
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch file://dns-failover.json

# Verify DNS propagation
dig truststream.yourdomain.com +short
```

### **Database Rollback (If Required)**

#### **Schema Rollback**
```bash
# Check migration status
kubectl exec -it deployment/truststream-api -n truststream-production -- \
  npm run migrate:status

# Rollback database migrations
kubectl exec -it deployment/truststream-api -n truststream-production -- \
  npm run migrate:rollback --to-version=v4.3.9

# Verify schema state
kubectl exec -it deployment/truststream-api -n truststream-production -- \
  npm run migrate:current
```

#### **Data Restoration (Critical)**
```bash
# List available backups
aws s3 ls s3://truststream-backups/production/daily/

# Restore from backup (CAUTION: DATA LOSS)
./scripts/database/restore-from-backup.sh \
  --backup-id "backup-20250921-120000" \
  --confirm-data-loss

# Verify data integrity
./scripts/database/verify-data-integrity.sh
```

---

## 🔥 **Disaster Recovery Scenarios**

### **Scenario 1: Complete Data Center Outage**

#### **Immediate Actions (0-5 minutes)**
```bash
# Activate disaster recovery site
./scripts/dr/activate-dr-site.sh \
  --primary-region us-west-2 \
  --dr-region us-east-1 \
  --automatic-failover

# Update DNS to point to DR site
./scripts/dr/update-dns-for-dr.sh \
  --dr-region us-east-1

# Notify stakeholders
./scripts/notifications/send-dr-activation-alert.sh
```

#### **Verification Steps**
```bash
# Check DR site health
curl -f https://dr.truststream.yourdomain.com/health

# Verify database connectivity
./scripts/dr/verify-dr-database.sh

# Test application functionality
./scripts/dr/functional-test-suite.sh --environment dr
```

### **Scenario 2: Database Corruption**

#### **Immediate Response**
```bash
# Stop write operations
kubectl scale deployment truststream-api --replicas=0 -n truststream-production

# Enable read-only mode on remaining replicas
kubectl patch configmap truststream-config -n truststream-production \
  --patch '{"data":{"READ_ONLY_MODE":"true"}}'

# Restart read-only instances
kubectl rollout restart deployment/truststream-reader -n truststream-production
```

#### **Data Recovery**
```bash
# Identify corruption extent
./scripts/database/analyze-corruption.sh

# Restore from point-in-time backup
./scripts/database/point-in-time-restore.sh \
  --restore-time "2025-09-21 12:00:00" \
  --new-instance truststream-db-recovered

# Verify restored data
./scripts/database/verify-data-integrity.sh --instance truststream-db-recovered
```

### **Scenario 3: Security Breach**

#### **Immediate Containment**
```bash
# Isolate affected systems
./scripts/security/isolate-compromised-nodes.sh

# Revoke all API tokens
./scripts/security/revoke-all-tokens.sh --emergency

# Enable emergency access controls
./scripts/security/enable-emergency-access.sh

# Activate security incident response
./scripts/security/activate-incident-response.sh --breach-type unknown
```

#### **Forensic Preservation**
```bash
# Capture memory dumps
./scripts/security/capture-memory-dumps.sh

# Preserve log evidence
./scripts/security/preserve-audit-logs.sh --time-range "last 24 hours"

# Create forensic snapshots
./scripts/security/create-forensic-snapshots.sh
```

---

## 🔍 **Monitoring & Alerting During Recovery**

### **Critical Metrics to Monitor**

#### **Application Health**
```bash
# Monitor response times
watch -n 5 'curl -w "@curl-format.txt" -s -o /dev/null https://truststream.yourdomain.com/health'

# Monitor error rates
kubectl logs -f deployment/truststream-api -n truststream-production | grep ERROR

# Monitor resource utilization
watch kubectl top pods -n truststream-production
```

#### **Database Performance**
```bash
# Monitor database connections
watch 'kubectl exec deployment/truststream-api -n truststream-production -- \
  psql "$DATABASE_URL" -c "SELECT count(*) FROM pg_stat_activity;"'

# Monitor replication lag
watch './scripts/database/check-replication-lag.sh'
```

### **Automated Monitoring Scripts**

#### **Health Check Loop**
```bash
#!/bin/bash
# scripts/monitoring/recovery-health-check.sh

while true; do
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Check API health
    if curl -f -s https://truststream.yourdomain.com/health > /dev/null; then
        echo "[$timestamp] API: HEALTHY"
    else
        echo "[$timestamp] API: UNHEALTHY" >&2
        ./scripts/notifications/send-health-alert.sh --service api --status unhealthy
    fi
    
    # Check database connectivity
    if kubectl exec deployment/truststream-api -n truststream-production -- \
       psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        echo "[$timestamp] DATABASE: HEALTHY"
    else
        echo "[$timestamp] DATABASE: UNHEALTHY" >&2
        ./scripts/notifications/send-health-alert.sh --service database --status unhealthy
    fi
    
    sleep 30
done
```

---

## 📊 **Recovery Validation**

### **Post-Recovery Testing**

#### **Smoke Tests**
```bash
# Basic functionality test
./tests/smoke/basic-functionality.sh

# User journey tests
./tests/smoke/user-journey-tests.sh

# Integration tests
./tests/smoke/integration-tests.sh
```

#### **Performance Validation**
```bash
# Load test to verify capacity
ab -n 1000 -c 10 https://truststream.yourdomain.com/health

# Response time verification
./scripts/performance/measure-response-times.sh --baseline

# Database performance check
./scripts/database/performance-benchmark.sh
```

### **Data Integrity Verification**

#### **Data Consistency Checks**
```bash
# Check record counts
./scripts/database/verify-record-counts.sh --compare-with-backup

# Verify data relationships
./scripts/database/verify-referential-integrity.sh

# Check for data corruption
./scripts/database/corruption-scan.sh
```

---

## 📝 **Documentation & Communication**

### **Incident Documentation**

#### **Required Information**
- **Incident Start Time**: [Timestamp]
- **Detection Method**: [Monitoring/User Report/Other]
- **Initial Assessment**: [Severity/Impact]
- **Root Cause**: [Technical Details]
- **Recovery Actions**: [Steps Taken]
- **Resolution Time**: [Duration]
- **Lessons Learned**: [Improvements]

#### **Post-Incident Report Template**
```markdown
# Incident Report: [Incident ID]

## Executive Summary
- **Duration**: [X hours Y minutes]
- **Impact**: [Users affected, revenue impact]
- **Root Cause**: [Brief description]
- **Resolution**: [High-level actions taken]

## Timeline
- **[Time]**: Incident detected
- **[Time]**: Response team notified
- **[Time]**: Rollback initiated
- **[Time]**: Service restored
- **[Time]**: Full resolution confirmed

## Root Cause Analysis
[Detailed technical analysis]

## Action Items
1. [Immediate fixes]
2. [Process improvements]
3. [Monitoring enhancements]
4. [Training requirements]

## Prevention Measures
[How to prevent similar incidents]
```

### **Communication Templates**

#### **Initial Alert**
```
SUBJECT: [URGENT] TrustStram Service Incident - [Severity]

We are currently experiencing a service incident affecting TrustStram.

STATUS: [Investigating/Mitigating/Resolved]
IMPACT: [Description of impact]
ETA: [Expected resolution time]

We are actively working to resolve this issue and will provide updates every 15 minutes.

Incident ID: [ID]
Next Update: [Time]
```

#### **Resolution Notice**
```
SUBJECT: [RESOLVED] TrustStram Service Incident - [Incident ID]

The TrustStram service incident has been resolved.

RESOLUTION TIME: [Duration]
ROOT CAUSE: [Brief description]
ACTIONS TAKEN: [Summary of resolution]

All services are now operating normally. We will continue monitoring for the next 2 hours.

A detailed post-incident report will be published within 24 hours.
```

---

## 🔄 **Recovery Procedures by Component**

### **Kubernetes Components**

#### **Control Plane Recovery**
```bash
# Check control plane status
kubectl cluster-info

# Restart control plane components (managed clusters)
aws eks update-cluster-version --name truststream-v44-production --version 1.28

# Verify control plane health
kubectl get componentstatuses
```

#### **Node Recovery**
```bash
# Identify unhealthy nodes
kubectl get nodes | grep NotReady

# Drain and replace unhealthy nodes
kubectl drain NODE_NAME --delete-emptydir-data --force --ignore-daemonsets
kubectl delete node NODE_NAME

# Scale node group to replace nodes
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name truststream-nodes \
  --desired-capacity 4
```

### **Database Recovery**

#### **Primary Database Failure**
```bash
# Promote read replica to primary
aws rds promote-read-replica --db-instance-identifier truststream-replica-1

# Update application connection strings
kubectl patch secret truststream-db-credentials -n truststream-production \
  --patch '{"data":{"DATABASE_URL":"[new-primary-url-base64]"}}'

# Restart application pods
kubectl rollout restart deployment/truststream-api -n truststream-production
```

#### **Backup and Restore**
```bash
# List available automated backups
aws rds describe-db-snapshots --db-instance-identifier truststream-db

# Restore from automated backup
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier truststream-db-restored \
  --db-snapshot-identifier truststream-db-snapshot-20250921

# Update DNS to point to restored instance
./scripts/database/update-db-dns.sh --new-instance truststream-db-restored
```

---

## ⚙️ **Automated Recovery Scripts**

### **Auto-Rollback Script**
```bash
#!/bin/bash
# scripts/emergency/auto-rollback.sh

set -euo pipefail

ENVIRONMENT=${1:-production}
TIMEOUT=${2:-300}
ROLLBACK_VERSION=${3:-"previous"}

echo "[$(date)] Starting automated rollback for environment: $ENVIRONMENT"

# Health check with timeout
if ! timeout $TIMEOUT bash -c 'until curl -f https://truststream.yourdomain.com/health; do sleep 5; done'; then
    echo "[$(date)] Health check failed, initiating rollback"
    
    # Execute rollback
    kubectl rollout undo deployment/truststream-api -n truststream-$ENVIRONMENT
    kubectl rollout undo deployment/truststream-worker -n truststream-$ENVIRONMENT
    
    # Wait for rollback completion
    kubectl rollout status deployment/truststream-api -n truststream-$ENVIRONMENT --timeout=300s
    
    # Verify rollback success
    if curl -f https://truststream.yourdomain.com/health; then
        echo "[$(date)] Rollback successful"
        ./scripts/notifications/send-rollback-success.sh --environment $ENVIRONMENT
    else
        echo "[$(date)] Rollback failed, escalating"
        ./scripts/notifications/send-rollback-failure.sh --environment $ENVIRONMENT
        exit 1
    fi
else
    echo "[$(date)] Health check passed, no rollback needed"
fi
```

### **Circuit Breaker Implementation**
```bash
#!/bin/bash
# scripts/monitoring/circuit-breaker.sh

ERROR_THRESHOLD=5
TIME_WINDOW=60
ERROR_COUNT=0
START_TIME=$(date +%s)

while true; do
    CURRENT_TIME=$(date +%s)
    
    # Reset counter if time window exceeded
    if [ $((CURRENT_TIME - START_TIME)) -gt $TIME_WINDOW ]; then
        ERROR_COUNT=0
        START_TIME=$CURRENT_TIME
    fi
    
    # Health check
    if ! curl -f -s https://truststream.yourdomain.com/health > /dev/null; then
        ERROR_COUNT=$((ERROR_COUNT + 1))
        echo "[$(date)] Health check failed. Error count: $ERROR_COUNT"
        
        # Trigger circuit breaker
        if [ $ERROR_COUNT -ge $ERROR_THRESHOLD ]; then
            echo "[$(date)] Circuit breaker triggered, initiating emergency procedures"
            ./scripts/emergency/auto-rollback.sh
            break
        fi
    else
        ERROR_COUNT=0
    fi
    
    sleep 10
done
```

---

## 📚 **Additional Resources**

### **Reference Documentation**
- [Kubernetes Disaster Recovery](./kubernetes-dr-procedures.md)
- [Database Recovery Procedures](./database-recovery-procedures.md)
- [Security Incident Response](./security-incident-response.md)
- [Communication Playbook](./communication-playbook.md)

### **Emergency Contacts**
- **Primary On-Call**: [Contact Information]
- **Backup On-Call**: [Contact Information]
- **Engineering Manager**: [Contact Information]
- **VP Engineering**: [Contact Information]

### **External Vendors**
- **Cloud Provider Support**: [Contact Information]
- **Database Vendor**: [Contact Information]
- **Monitoring Service**: [Contact Information]
- **Security Service**: [Contact Information]

---

**🚨 Remember: In case of doubt, prioritize service restoration over root cause analysis. Post-mortem can happen after recovery.**

*This document is reviewed quarterly and updated after each major incident.*