# TrustStram v4.4 Backup and Recovery Guide

## Table of Contents
1. [Backup Strategy Overview](#backup-strategy-overview)
2. [Database Backup](#database-backup)
3. [Application Backup](#application-backup)
4. [Model and Data Backup](#model-and-data-backup)
5. [Configuration Backup](#configuration-backup)
6. [Automated Backup Systems](#automated-backup-systems)
7. [Cloud Backup Solutions](#cloud-backup-solutions)
8. [Recovery Procedures](#recovery-procedures)
9. [Disaster Recovery](#disaster-recovery)
10. [Point-in-Time Recovery](#point-in-time-recovery)
11. [Backup Verification](#backup-verification)
12. [Security and Encryption](#security-and-encryption)
13. [Monitoring and Alerting](#monitoring-and-alerting)
14. [Best Practices](#best-practices)

## Backup Strategy Overview

TrustStram v4.4 implements a comprehensive 3-2-1 backup strategy:
- **3** copies of important data
- **2** different storage media types
- **1** offsite backup location

### Backup Components
```
┌─────────────────────────────────────────────────────┐
│                  Backup Architecture                │
├─────────────────────────────────────────────────────┤
│ Application Data                                     │
│ ├── Database (PostgreSQL)                           │
│ ├── File Storage (Models, Datasets)                 │
│ ├── Configuration Files                             │
│ └── Application Binaries                            │
├─────────────────────────────────────────────────────┤
│ System Data                                         │
│ ├── Operating System Configuration                  │
│ ├── SSL Certificates                                │
│ ├── Log Files                                       │
│ └── Docker Images/Containers                        │
├─────────────────────────────────────────────────────┤
│ Backup Destinations                                 │
│ ├── Local Storage (NAS/SAN)                        │
│ ├── Cloud Storage (S3, Azure, GCP)                 │
│ └── Offsite Cold Storage                            │
└─────────────────────────────────────────────────────┘
```

### Backup Schedule
- **Continuous**: Transaction log backup (every 15 minutes)
- **Hourly**: Incremental file backup
- **Daily**: Full database backup
- **Weekly**: Full system backup
- **Monthly**: Archive backup to cold storage

### Recovery Objectives
- **RTO (Recovery Time Objective)**: 1 hour for critical systems
- **RPO (Recovery Point Objective)**: 15 minutes maximum data loss
- **MTTR (Mean Time To Recovery)**: 30 minutes for standard issues

## Database Backup

### PostgreSQL Backup Configuration
```bash
#!/bin/bash
# postgresql_backup.sh

# Configuration
DB_NAME="truststram"
DB_USER="truststram"
DB_HOST="localhost"
DB_PORT="5432"
BACKUP_DIR="/backup/postgresql"
RETENTION_DAYS=30
S3_BUCKET="truststram-backups"

# Create backup directory
mkdir -p $BACKUP_DIR

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Full database backup
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -Fc $DB_NAME > \
    $BACKUP_DIR/truststram_full_$TIMESTAMP.dump

# Compressed SQL backup
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME | \
    gzip > $BACKUP_DIR/truststram_sql_$TIMESTAMP.sql.gz

# Schema-only backup
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -s $DB_NAME > \
    $BACKUP_DIR/truststram_schema_$TIMESTAMP.sql

# Data-only backup
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -a $DB_NAME | \
    gzip > $BACKUP_DIR/truststram_data_$TIMESTAMP.sql.gz

# Backup specific tables
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -t models -t datasets $DB_NAME | \
    gzip > $BACKUP_DIR/truststram_critical_tables_$TIMESTAMP.sql.gz

# Upload to S3
aws s3 cp $BACKUP_DIR/truststram_full_$TIMESTAMP.dump \
    s3://$S3_BUCKET/postgresql/$(date +%Y/%m/%d)/

# Verify backup integrity
pg_restore --list $BACKUP_DIR/truststram_full_$TIMESTAMP.dump > /dev/null
if [ $? -eq 0 ]; then
    echo "Backup verification successful: $TIMESTAMP"
else
    echo "Backup verification failed: $TIMESTAMP"
    exit 1
fi

# Clean old backups
find $BACKUP_DIR -name "truststram_*.dump" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "truststram_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Database backup completed: $TIMESTAMP"
```

### Continuous Transaction Log Backup
```bash
#!/bin/bash
# wal_backup.sh

# Configuration
POSTGRES_DATA_DIR="/var/lib/postgresql/15/main"
WAL_ARCHIVE_DIR="/backup/wal"
S3_BUCKET="truststram-wal-archive"

# PostgreSQL configuration for WAL archiving
# Add to postgresql.conf:
cat >> /etc/postgresql/15/main/postgresql.conf << 'EOF'
# WAL Configuration
wal_level = replica
archive_mode = on
archive_command = '/opt/truststram/scripts/archive_wal.sh %f %p'
max_wal_senders = 3
checkpoint_completion_target = 0.9
wal_compression = on
EOF

# WAL archive script
cat > /opt/truststram/scripts/archive_wal.sh << 'EOF'
#!/bin/bash
WAL_FILE=$1
WAL_PATH=$2
ARCHIVE_DIR="/backup/wal"
S3_BUCKET="truststram-wal-archive"

# Copy WAL file to local archive
cp "$WAL_PATH" "$ARCHIVE_DIR/$WAL_FILE"

# Upload to S3 with verification
aws s3 cp "$ARCHIVE_DIR/$WAL_FILE" "s3://$S3_BUCKET/wal/" --storage-class STANDARD_IA

# Verify upload
aws s3 ls "s3://$S3_BUCKET/wal/$WAL_FILE" > /dev/null
if [ $? -eq 0 ]; then
    exit 0
else
    exit 1
fi
EOF

chmod +x /opt/truststram/scripts/archive_wal.sh
```

### Hot Standby Setup
```bash
#!/bin/bash
# setup_streaming_replica.sh

# On primary server
sudo -u postgres psql -c "CREATE USER replica REPLICATION LOGIN ENCRYPTED PASSWORD 'replica_password';"

# Add to pg_hba.conf
echo "host replication replica 10.0.1.100/32 md5" >> /etc/postgresql/15/main/pg_hba.conf

# On standby server
sudo systemctl stop postgresql

# Remove old data directory
sudo rm -rf /var/lib/postgresql/15/main/*

# Base backup from primary
sudo -u postgres pg_basebackup -h 10.0.1.10 -D /var/lib/postgresql/15/main -U replica -P -W -R

# Configure standby
cat > /var/lib/postgresql/15/main/postgresql.auto.conf << 'EOF'
primary_conninfo = 'host=10.0.1.10 port=5432 user=replica password=replica_password'
restore_command = 'cp /backup/wal/%f %p'
recovery_target_timeline = 'latest'
EOF

# Start standby
sudo systemctl start postgresql

# Verify replication
sudo -u postgres psql -c "SELECT * FROM pg_stat_replication;"
```

## Application Backup

### Application Files Backup
```bash
#!/bin/bash
# application_backup.sh

# Configuration
APP_DIR="/opt/truststram"
BACKUP_DIR="/backup/application"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=14

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup application binaries
tar -czf $BACKUP_DIR/truststram_binaries_$TIMESTAMP.tar.gz \
    -C $APP_DIR bin/ lib/ plugins/

# Backup application data
tar -czf $BACKUP_DIR/truststram_data_$TIMESTAMP.tar.gz \
    -C /var/lib/truststram data/ models/ cache/

# Backup logs
tar -czf $BACKUP_DIR/truststram_logs_$TIMESTAMP.tar.gz \
    -C /var/log/truststram .

# Backup configuration
tar -czf $BACKUP_DIR/truststram_config_$TIMESTAMP.tar.gz \
    -C /etc/truststram .

# Create manifest file
cat > $BACKUP_DIR/manifest_$TIMESTAMP.txt << EOF
Backup Created: $(date)
Application Version: $(cat $APP_DIR/VERSION)
Configuration Hash: $(find /etc/truststram -type f -exec md5sum {} \; | md5sum)
Data Directory Size: $(du -sh /var/lib/truststram | cut -f1)
Backup Files:
$(ls -la $BACKUP_DIR/*_$TIMESTAMP.*)
EOF

# Upload to cloud storage
aws s3 sync $BACKUP_DIR s3://truststram-backups/application/$(date +%Y/%m/%d)/

# Clean old backups
find $BACKUP_DIR -name "*_*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Application backup completed: $TIMESTAMP"
```

### Docker Container Backup
```bash
#!/bin/bash
# docker_backup.sh

# Configuration
BACKUP_DIR="/backup/docker"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup Docker images
echo "Backing up Docker images..."
docker images --format "{{.Repository}}:{{.Tag}}" | grep truststram | \
while read image; do
    filename=$(echo $image | sed 's/[\/:]/_/g')
    docker save $image | gzip > $BACKUP_DIR/${filename}_$TIMESTAMP.tar.gz
done

# Backup Docker volumes
echo "Backing up Docker volumes..."
docker volume ls --format "{{.Name}}" | grep truststram | \
while read volume; do
    docker run --rm -v $volume:/data -v $BACKUP_DIR:/backup alpine \
        tar -czf /backup/${volume}_$TIMESTAMP.tar.gz -C /data .
done

# Backup Docker Compose files
tar -czf $BACKUP_DIR/docker_compose_$TIMESTAMP.tar.gz \
    docker-compose.yml docker-compose.override.yml

# Export container configurations
docker ps --format "{{.Names}}" | grep truststram | \
while read container; do
    docker inspect $container > $BACKUP_DIR/${container}_config_$TIMESTAMP.json
done

echo "Docker backup completed: $TIMESTAMP"
```

## Model and Data Backup

### ML Model Backup
```python
import os
import shutil
import json
import boto3
from datetime import datetime
import hashlib

class ModelBackupManager:
    def __init__(self):
        self.backup_dir = "/backup/models"
        self.s3_bucket = "truststram-model-backups"
        self.s3_client = boto3.client('s3')
        
    def backup_model(self, model_id, model_path, metadata=None):
        """Backup a trained model with metadata."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = f"{self.backup_dir}/{model_id}_{timestamp}"
        
        # Create backup directory
        os.makedirs(backup_path, exist_ok=True)
        
        # Copy model files
        if os.path.isfile(model_path):
            shutil.copy2(model_path, f"{backup_path}/model.pkl")
        else:
            shutil.copytree(model_path, f"{backup_path}/model")
        
        # Create model metadata
        model_metadata = {
            "model_id": model_id,
            "backup_timestamp": timestamp,
            "original_path": model_path,
            "model_size": self._get_size(model_path),
            "model_hash": self._calculate_hash(model_path),
            "metadata": metadata or {}
        }
        
        with open(f"{backup_path}/metadata.json", 'w') as f:
            json.dump(model_metadata, f, indent=2)
        
        # Create backup archive
        archive_path = f"{backup_path}.tar.gz"
        shutil.make_archive(backup_path, 'gztar', backup_path)
        
        # Upload to S3
        s3_key = f"models/{model_id}/{timestamp}/model_backup.tar.gz"
        self.s3_client.upload_file(archive_path, self.s3_bucket, s3_key)
        
        # Cleanup local files
        shutil.rmtree(backup_path)
        os.remove(archive_path)
        
        return {
            "backup_id": f"{model_id}_{timestamp}",
            "s3_location": f"s3://{self.s3_bucket}/{s3_key}",
            "metadata": model_metadata
        }
    
    def restore_model(self, backup_id, restore_path):
        """Restore a model from backup."""
        # Download from S3
        s3_key = f"models/{backup_id.split('_')[0]}/{backup_id.split('_', 1)[1]}/model_backup.tar.gz"
        local_archive = f"/tmp/{backup_id}.tar.gz"
        
        self.s3_client.download_file(self.s3_bucket, s3_key, local_archive)
        
        # Extract archive
        extract_dir = f"/tmp/{backup_id}"
        shutil.unpack_archive(local_archive, extract_dir)
        
        # Restore model files
        if os.path.exists(f"{extract_dir}/model.pkl"):
            shutil.copy2(f"{extract_dir}/model.pkl", restore_path)
        elif os.path.exists(f"{extract_dir}/model"):
            shutil.copytree(f"{extract_dir}/model", restore_path)
        
        # Load metadata
        with open(f"{extract_dir}/metadata.json", 'r') as f:
            metadata = json.load(f)
        
        # Cleanup
        os.remove(local_archive)
        shutil.rmtree(extract_dir)
        
        return metadata
    
    def _get_size(self, path):
        """Get size of file or directory."""
        if os.path.isfile(path):
            return os.path.getsize(path)
        else:
            total_size = 0
            for dirpath, dirnames, filenames in os.walk(path):
                for filename in filenames:
                    filepath = os.path.join(dirpath, filename)
                    total_size += os.path.getsize(filepath)
            return total_size
    
    def _calculate_hash(self, path):
        """Calculate hash of file or directory."""
        hasher = hashlib.sha256()
        
        if os.path.isfile(path):
            with open(path, 'rb') as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hasher.update(chunk)
        else:
            for root, dirs, files in os.walk(path):
                for file in sorted(files):
                    filepath = os.path.join(root, file)
                    with open(filepath, 'rb') as f:
                        for chunk in iter(lambda: f.read(4096), b""):
                            hasher.update(chunk)
        
        return hasher.hexdigest()
    
    def list_backups(self, model_id=None):
        """List available model backups."""
        prefix = f"models/{model_id}/" if model_id else "models/"
        
        response = self.s3_client.list_objects_v2(
            Bucket=self.s3_bucket,
            Prefix=prefix
        )
        
        backups = []
        for obj in response.get('Contents', []):
            if obj['Key'].endswith('model_backup.tar.gz'):
                parts = obj['Key'].split('/')
                backup_id = f"{parts[1]}_{parts[2]}"
                backups.append({
                    "backup_id": backup_id,
                    "model_id": parts[1],
                    "timestamp": parts[2],
                    "size": obj['Size'],
                    "last_modified": obj['LastModified']
                })
        
        return backups

# Usage example
backup_manager = ModelBackupManager()

# Backup a model
backup_result = backup_manager.backup_model(
    model_id="fraud_detection_v2",
    model_path="/var/lib/truststram/models/fraud_detection_v2.pkl",
    metadata={
        "algorithm": "gradient_boosting",
        "accuracy": 0.95,
        "training_data": "customer_transactions_2024"
    }
)

# Restore a model
metadata = backup_manager.restore_model(
    backup_id="fraud_detection_v2_20241201_143022",
    restore_path="/var/lib/truststram/models/restored_model.pkl"
)
```

### Dataset Backup
```python
import pandas as pd
import numpy as np
from sqlalchemy import create_engine
import boto3
import json

class DatasetBackupManager:
    def __init__(self):
        self.backup_dir = "/backup/datasets"
        self.s3_bucket = "truststram-dataset-backups"
        self.s3_client = boto3.client('s3')
        self.database_url = "postgresql://user:pass@localhost:5432/truststram"
    
    def backup_dataset(self, dataset_id, source_type="database", source_config=None):
        """Backup a dataset with versioning."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = f"{self.backup_dir}/{dataset_id}_{timestamp}"
        
        os.makedirs(backup_path, exist_ok=True)
        
        if source_type == "database":
            self._backup_database_table(dataset_id, backup_path, source_config)
        elif source_type == "file":
            self._backup_file_dataset(dataset_id, backup_path, source_config)
        elif source_type == "api":
            self._backup_api_dataset(dataset_id, backup_path, source_config)
        
        # Create dataset metadata
        dataset_metadata = {
            "dataset_id": dataset_id,
            "backup_timestamp": timestamp,
            "source_type": source_type,
            "source_config": source_config,
            "record_count": self._get_record_count(backup_path),
            "schema": self._get_schema(backup_path),
            "data_hash": self._calculate_data_hash(backup_path)
        }
        
        with open(f"{backup_path}/metadata.json", 'w') as f:
            json.dump(dataset_metadata, f, indent=2)
        
        # Compress and upload
        archive_path = f"{backup_path}.tar.gz"
        shutil.make_archive(backup_path, 'gztar', backup_path)
        
        s3_key = f"datasets/{dataset_id}/{timestamp}/dataset_backup.tar.gz"
        self.s3_client.upload_file(archive_path, self.s3_bucket, s3_key)
        
        # Cleanup
        shutil.rmtree(backup_path)
        os.remove(archive_path)
        
        return {
            "backup_id": f"{dataset_id}_{timestamp}",
            "s3_location": f"s3://{self.s3_bucket}/{s3_key}",
            "metadata": dataset_metadata
        }
    
    def _backup_database_table(self, dataset_id, backup_path, config):
        """Backup data from database table."""
        engine = create_engine(self.database_url)
        
        query = config.get('query', f"SELECT * FROM {dataset_id}")
        df = pd.read_sql(query, engine)
        
        # Save in multiple formats
        df.to_csv(f"{backup_path}/data.csv", index=False)
        df.to_parquet(f"{backup_path}/data.parquet")
        df.to_json(f"{backup_path}/data.json", orient='records')
    
    def _backup_file_dataset(self, dataset_id, backup_path, config):
        """Backup file-based dataset."""
        source_path = config.get('path')
        
        if os.path.isfile(source_path):
            shutil.copy2(source_path, f"{backup_path}/data{os.path.splitext(source_path)[1]}")
        else:
            shutil.copytree(source_path, f"{backup_path}/data")
    
    def _backup_api_dataset(self, dataset_id, backup_path, config):
        """Backup dataset from API endpoint."""
        import requests
        
        api_url = config.get('url')
        headers = config.get('headers', {})
        params = config.get('params', {})
        
        response = requests.get(api_url, headers=headers, params=params)
        response.raise_for_status()
        
        with open(f"{backup_path}/data.json", 'w') as f:
            json.dump(response.json(), f, indent=2)
    
    def restore_dataset(self, backup_id, restore_type="database", restore_config=None):
        """Restore dataset from backup."""
        # Download and extract
        parts = backup_id.split('_')
        dataset_id = '_'.join(parts[:-2])
        timestamp = '_'.join(parts[-2:])
        
        s3_key = f"datasets/{dataset_id}/{timestamp}/dataset_backup.tar.gz"
        local_archive = f"/tmp/{backup_id}.tar.gz"
        
        self.s3_client.download_file(self.s3_bucket, s3_key, local_archive)
        
        extract_dir = f"/tmp/{backup_id}"
        shutil.unpack_archive(local_archive, extract_dir)
        
        # Restore based on type
        if restore_type == "database":
            self._restore_to_database(extract_dir, restore_config)
        elif restore_type == "file":
            self._restore_to_file(extract_dir, restore_config)
        
        # Load metadata
        with open(f"{extract_dir}/metadata.json", 'r') as f:
            metadata = json.load(f)
        
        # Cleanup
        os.remove(local_archive)
        shutil.rmtree(extract_dir)
        
        return metadata
    
    def _restore_to_database(self, extract_dir, config):
        """Restore dataset to database."""
        engine = create_engine(self.database_url)
        
        # Load data
        if os.path.exists(f"{extract_dir}/data.parquet"):
            df = pd.read_parquet(f"{extract_dir}/data.parquet")
        elif os.path.exists(f"{extract_dir}/data.csv"):
            df = pd.read_csv(f"{extract_dir}/data.csv")
        else:
            with open(f"{extract_dir}/data.json", 'r') as f:
                data = json.load(f)
            df = pd.DataFrame(data)
        
        # Restore to table
        table_name = config.get('table_name')
        df.to_sql(table_name, engine, if_exists='replace', index=False)
    
    def _restore_to_file(self, extract_dir, config):
        """Restore dataset to file."""
        restore_path = config.get('path')
        
        # Find data file
        for filename in os.listdir(extract_dir):
            if filename.startswith('data.') and filename != 'data.json':
                source_file = os.path.join(extract_dir, filename)
                shutil.copy2(source_file, restore_path)
                break

# Automated dataset backup
def automated_dataset_backup():
    """Run automated dataset backups."""
    backup_manager = DatasetBackupManager()
    
    # Define datasets to backup
    datasets = [
        {
            "id": "customer_data",
            "type": "database",
            "config": {"query": "SELECT * FROM customers WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'"}
        },
        {
            "id": "training_data",
            "type": "file",
            "config": {"path": "/var/lib/truststram/datasets/training_data.parquet"}
        }
    ]
    
    for dataset in datasets:
        try:
            result = backup_manager.backup_dataset(
                dataset_id=dataset["id"],
                source_type=dataset["type"],
                source_config=dataset["config"]
            )
            print(f"Backup successful: {result['backup_id']}")
        except Exception as e:
            print(f"Backup failed for {dataset['id']}: {e}")
```

## Configuration Backup

### System Configuration Backup
```bash
#!/bin/bash
# config_backup.sh

# Configuration
BACKUP_DIR="/backup/configuration"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
HOSTNAME=$(hostname)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup TrustStram configuration
tar -czf $BACKUP_DIR/truststram_config_$TIMESTAMP.tar.gz \
    -C /etc truststram/ \
    -C /opt/truststram config/

# Backup system configuration
tar -czf $BACKUP_DIR/system_config_$TIMESTAMP.tar.gz \
    /etc/nginx/ \
    /etc/postgresql/ \
    /etc/redis/ \
    /etc/ssl/ \
    /etc/systemd/system/truststram* \
    /etc/cron.d/truststram* \
    /etc/logrotate.d/truststram*

# Backup environment variables
env | grep TRUSTSTRAM > $BACKUP_DIR/environment_$TIMESTAMP.env

# Backup network configuration
cp /etc/hosts $BACKUP_DIR/hosts_$TIMESTAMP
cp /etc/resolv.conf $BACKUP_DIR/resolv_conf_$TIMESTAMP

# Backup firewall rules
ufw status numbered > $BACKUP_DIR/ufw_rules_$TIMESTAMP.txt
iptables-save > $BACKUP_DIR/iptables_rules_$TIMESTAMP.txt

# Create configuration inventory
cat > $BACKUP_DIR/config_inventory_$TIMESTAMP.txt << EOF
Configuration Backup - $TIMESTAMP
Hostname: $HOSTNAME
Kernel: $(uname -r)
OS: $(lsb_release -d | cut -f2)
TrustStram Version: $(cat /opt/truststram/VERSION)

Configuration Files:
$(find /etc/truststram -type f -exec ls -la {} \;)

System Configuration:
Nginx Version: $(nginx -v 2>&1)
PostgreSQL Version: $(psql --version)
Redis Version: $(redis-server --version)

Network Configuration:
$(ip addr show)

Disk Usage:
$(df -h)

Running Services:
$(systemctl list-units --type=service --state=running | grep truststram)
EOF

# Upload to cloud storage
aws s3 sync $BACKUP_DIR s3://truststram-backups/configuration/$(date +%Y/%m/%d)/

echo "Configuration backup completed: $TIMESTAMP"
```

### SSL Certificate Backup
```bash
#!/bin/bash
# ssl_backup.sh

# Configuration
CERT_DIR="/etc/ssl/certs"
KEY_DIR="/etc/ssl/private"
BACKUP_DIR="/backup/ssl"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup certificates and keys
tar -czf $BACKUP_DIR/ssl_certificates_$TIMESTAMP.tar.gz \
    -C /etc/ssl certs/ private/

# Backup Let's Encrypt certificates
if [ -d "/etc/letsencrypt" ]; then
    tar -czf $BACKUP_DIR/letsencrypt_$TIMESTAMP.tar.gz \
        -C /etc/letsencrypt .
fi

# Create certificate inventory
cat > $BACKUP_DIR/certificate_inventory_$TIMESTAMP.txt << EOF
SSL Certificate Backup - $TIMESTAMP

Certificate Information:
$(for cert in /etc/ssl/certs/truststram*.crt; do
    if [ -f "$cert" ]; then
        echo "=== $cert ==="
        openssl x509 -in "$cert" -text -noout | grep -A 2 "Subject:\|Issuer:\|Not Before:\|Not After:"
        echo ""
    fi
done)

Let's Encrypt Certificates:
$(if [ -d "/etc/letsencrypt/live" ]; then
    for domain_dir in /etc/letsencrypt/live/*/; do
        domain=$(basename "$domain_dir")
        echo "Domain: $domain"
        if [ -f "$domain_dir/cert.pem" ]; then
            openssl x509 -in "$domain_dir/cert.pem" -text -noout | grep -A 1 "Not After:"
        fi
        echo ""
    done
fi)
EOF

# Encrypt backup with GPG (if key available)
if gpg --list-secret-keys | grep -q "truststram"; then
    gpg --encrypt --recipient truststram \
        --output $BACKUP_DIR/ssl_certificates_$TIMESTAMP.tar.gz.gpg \
        $BACKUP_DIR/ssl_certificates_$TIMESTAMP.tar.gz
    rm $BACKUP_DIR/ssl_certificates_$TIMESTAMP.tar.gz
fi

echo "SSL certificate backup completed: $TIMESTAMP"
```

## Automated Backup Systems

### Comprehensive Backup Script
```bash
#!/bin/bash
# comprehensive_backup.sh

# Configuration
BACKUP_ROOT="/backup"
LOG_FILE="/var/log/truststram/backup.log"
S3_BUCKET="truststram-backups"
RETENTION_DAYS=30
EMAIL_ALERTS="admin@truststram.com"

# Initialize logging
exec 1> >(tee -a $LOG_FILE)
exec 2>&1

echo "=== TrustStram Backup Started: $(date) ==="

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to send alert
send_alert() {
    local subject="$1"
    local message="$2"
    echo "$message" | mail -s "$subject" $EMAIL_ALERTS
}

# Function to upload to S3 with verification
upload_to_s3() {
    local local_file="$1"
    local s3_path="$2"
    
    aws s3 cp "$local_file" "$s3_path"
    if [ $? -eq 0 ]; then
        # Verify upload
        local_size=$(stat -c%s "$local_file")
        s3_size=$(aws s3api head-object --bucket "$S3_BUCKET" --key "${s3_path#s3://$S3_BUCKET/}" --query 'ContentLength' --output text)
        
        if [ "$local_size" = "$s3_size" ]; then
            log "Upload verified: $local_file -> $s3_path"
            return 0
        else
            log "Upload verification failed: size mismatch"
            return 1
        fi
    else
        log "Upload failed: $local_file -> $s3_path"
        return 1
    fi
}

# Start backup process
BACKUP_SUCCESS=true

# 1. Database Backup
log "Starting database backup..."
if /opt/truststram/scripts/postgresql_backup.sh; then
    log "Database backup completed successfully"
else
    log "Database backup failed"
    BACKUP_SUCCESS=false
fi

# 2. Application Backup
log "Starting application backup..."
if /opt/truststram/scripts/application_backup.sh; then
    log "Application backup completed successfully"
else
    log "Application backup failed"
    BACKUP_SUCCESS=false
fi

# 3. Configuration Backup
log "Starting configuration backup..."
if /opt/truststram/scripts/config_backup.sh; then
    log "Configuration backup completed successfully"
else
    log "Configuration backup failed"
    BACKUP_SUCCESS=false
fi

# 4. Model and Data Backup
log "Starting model and data backup..."
if python3 /opt/truststram/scripts/model_backup.py; then
    log "Model and data backup completed successfully"
else
    log "Model and data backup failed"
    BACKUP_SUCCESS=false
fi

# 5. SSL Certificate Backup
log "Starting SSL certificate backup..."
if /opt/truststram/scripts/ssl_backup.sh; then
    log "SSL certificate backup completed successfully"
else
    log "SSL certificate backup failed"
    BACKUP_SUCCESS=false
fi

# Generate backup report
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$BACKUP_ROOT/backup_report_$TIMESTAMP.txt"

cat > $REPORT_FILE << EOF
TrustStram Backup Report
========================
Date: $(date)
Status: $(if $BACKUP_SUCCESS; then echo "SUCCESS"; else echo "FAILURE"; fi)

Backup Components:
- Database: $(if grep -q "Database backup completed successfully" $LOG_FILE; then echo "✓"; else echo "✗"; fi)
- Application: $(if grep -q "Application backup completed successfully" $LOG_FILE; then echo "✓"; else echo "✗"; fi)
- Configuration: $(if grep -q "Configuration backup completed successfully" $LOG_FILE; then echo "✓"; else echo "✗"; fi)
- Models/Data: $(if grep -q "Model and data backup completed successfully" $LOG_FILE; then echo "✓"; else echo "✗"; fi)
- SSL Certificates: $(if grep -q "SSL certificate backup completed successfully" $LOG_FILE; then echo "✓"; else echo "✗"; fi)

Storage Locations:
$(find $BACKUP_ROOT -name "*_$TIMESTAMP*" -type f -exec ls -lh {} \;)

Disk Usage:
$(df -h $BACKUP_ROOT)

Recent Backups:
$(find $BACKUP_ROOT -name "*.tar.gz" -mtime -1 -exec ls -lh {} \;)
EOF

# Upload report
upload_to_s3 "$REPORT_FILE" "s3://$S3_BUCKET/reports/backup_report_$TIMESTAMP.txt"

# Cleanup old backups
log "Cleaning up old backups..."
find $BACKUP_ROOT -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_ROOT -name "*.dump" -mtime +$RETENTION_DAYS -delete
find $BACKUP_ROOT -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Send notification
if $BACKUP_SUCCESS; then
    send_alert "TrustStram Backup Success" "All backup components completed successfully. See attached report."
else
    send_alert "TrustStram Backup Failure" "One or more backup components failed. Please check the logs immediately."
fi

log "=== TrustStram Backup Completed: $(date) ==="
echo ""
```

### Cron Configuration
```bash
# Add to crontab
crontab -e

# TrustStram Backup Schedule
# WAL archive every 5 minutes
*/5 * * * * /opt/truststram/scripts/wal_backup.sh

# Incremental backup every hour
0 * * * * /opt/truststram/scripts/incremental_backup.sh

# Daily full backup at 2 AM
0 2 * * * /opt/truststram/scripts/comprehensive_backup.sh

# Weekly system backup on Sunday at 3 AM
0 3 * * 0 /opt/truststram/scripts/system_backup.sh

# Monthly archive backup on first day at 4 AM
0 4 1 * * /opt/truststram/scripts/archive_backup.sh

# Backup verification every 6 hours
0 */6 * * * /opt/truststram/scripts/verify_backups.sh
```

## Cloud Backup Solutions

### AWS S3 Backup Configuration
```bash
#!/bin/bash
# aws_s3_backup.sh

# Configuration
AWS_REGION="us-west-2"
S3_BUCKET="truststram-backups"
S3_STORAGE_CLASS="STANDARD_IA"  # or GLACIER, DEEP_ARCHIVE
KMS_KEY_ID="arn:aws:kms:us-west-2:123456789012:key/12345678-1234-1234-1234-123456789012"

# Create S3 bucket with versioning
aws s3api create-bucket \
    --bucket $S3_BUCKET \
    --region $AWS_REGION \
    --create-bucket-configuration LocationConstraint=$AWS_REGION

aws s3api put-bucket-versioning \
    --bucket $S3_BUCKET \
    --versioning-configuration Status=Enabled

# Configure lifecycle policy
cat > s3_lifecycle.json << 'EOF'
{
    "Rules": [
        {
            "ID": "TrustStramBackupLifecycle",
            "Status": "Enabled",
            "Filter": {
                "Prefix": "truststram/"
            },
            "Transitions": [
                {
                    "Days": 30,
                    "StorageClass": "STANDARD_IA"
                },
                {
                    "Days": 90,
                    "StorageClass": "GLACIER"
                },
                {
                    "Days": 365,
                    "StorageClass": "DEEP_ARCHIVE"
                }
            ],
            "Expiration": {
                "Days": 2555  # 7 years
            }
        }
    ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
    --bucket $S3_BUCKET \
    --lifecycle-configuration file://s3_lifecycle.json

# Sync backups with encryption
aws s3 sync /backup/ s3://$S3_BUCKET/truststram/ \
    --storage-class $S3_STORAGE_CLASS \
    --server-side-encryption aws:kms \
    --ssekms-key-id $KMS_KEY_ID \
    --exclude "*.tmp" \
    --exclude "*.log"
```

### Azure Blob Storage Backup
```bash
#!/bin/bash
# azure_backup.sh

# Configuration
STORAGE_ACCOUNT="truststrambackups"
CONTAINER_NAME="backups"
RESOURCE_GROUP="truststram-rg"

# Create storage account
az storage account create \
    --name $STORAGE_ACCOUNT \
    --resource-group $RESOURCE_GROUP \
    --location westus2 \
    --sku Standard_GRS \
    --encryption-services blob \
    --https-only true

# Create container
az storage container create \
    --name $CONTAINER_NAME \
    --account-name $STORAGE_ACCOUNT \
    --public-access off

# Upload backups
az storage blob upload-batch \
    --destination $CONTAINER_NAME \
    --source /backup \
    --account-name $STORAGE_ACCOUNT \
    --overwrite
```

### Google Cloud Storage Backup
```bash
#!/bin/bash
# gcs_backup.sh

# Configuration
GCS_BUCKET="truststram-backups"
PROJECT_ID="truststram-project"

# Create bucket with lifecycle policy
gsutil mb -p $PROJECT_ID -c STANDARD -l us-central1 gs://$GCS_BUCKET

# Configure lifecycle
cat > lifecycle.json << 'EOF'
{
  "rule": [
    {
      "action": {"type": "SetStorageClass", "storageClass": "NEARLINE"},
      "condition": {"age": 30}
    },
    {
      "action": {"type": "SetStorageClass", "storageClass": "COLDLINE"},
      "condition": {"age": 90}
    },
    {
      "action": {"type": "SetStorageClass", "storageClass": "ARCHIVE"},
      "condition": {"age": 365}
    },
    {
      "action": {"type": "Delete"},
      "condition": {"age": 2555}
    }
  ]
}
EOF

gsutil lifecycle set lifecycle.json gs://$GCS_BUCKET

# Sync backups
gsutil -m rsync -r -d /backup/ gs://$GCS_BUCKET/truststram/
```

## Recovery Procedures

### Database Recovery
```bash
#!/bin/bash
# database_recovery.sh

# Function for point-in-time recovery
perform_pitr() {
    local recovery_target="$1"  # timestamp or xid
    local backup_file="$2"
    
    echo "Starting Point-in-Time Recovery to: $recovery_target"
    
    # Stop PostgreSQL
    systemctl stop postgresql
    
    # Backup current data directory
    mv /var/lib/postgresql/15/main /var/lib/postgresql/15/main.backup.$(date +%Y%m%d_%H%M%S)
    
    # Restore base backup
    mkdir -p /var/lib/postgresql/15/main
    pg_restore -d postgres -C "$backup_file"
    
    # Configure recovery
    cat > /var/lib/postgresql/15/main/postgresql.auto.conf << EOF
restore_command = 'cp /backup/wal/%f %p'
recovery_target_time = '$recovery_target'
recovery_target_action = 'promote'
EOF
    
    # Set ownership
    chown -R postgres:postgres /var/lib/postgresql/15/main
    
    # Start PostgreSQL
    systemctl start postgresql
    
    # Verify recovery
    sudo -u postgres psql -c "SELECT pg_is_in_recovery();"
    
    echo "Point-in-Time Recovery completed"
}

# Function for full database restore
perform_full_restore() {
    local backup_file="$1"
    
    echo "Starting full database restore from: $backup_file"
    
    # Create new database
    sudo -u postgres createdb truststram_restored
    
    # Restore data
    pg_restore -d truststram_restored "$backup_file"
    
    # Verify restore
    sudo -u postgres psql truststram_restored -c "\dt"
    
    echo "Full database restore completed"
}

# Function for selective table restore
perform_table_restore() {
    local backup_file="$1"
    local table_name="$2"
    local target_db="$3"
    
    echo "Restoring table: $table_name"
    
    # Restore specific table
    pg_restore -d "$target_db" -t "$table_name" "$backup_file"
    
    echo "Table restore completed"
}

# Main recovery menu
case "$1" in
    "pitr")
        perform_pitr "$2" "$3"
        ;;
    "full")
        perform_full_restore "$2"
        ;;
    "table")
        perform_table_restore "$2" "$3" "$4"
        ;;
    *)
        echo "Usage: $0 {pitr|full|table} [options]"
        echo "  pitr <timestamp> <backup_file>"
        echo "  full <backup_file>"
        echo "  table <backup_file> <table_name> <target_db>"
        exit 1
        ;;
esac
```

### Application Recovery
```bash
#!/bin/bash
# application_recovery.sh

# Function to restore application from backup
restore_application() {
    local backup_file="$1"
    local restore_point="$2"
    
    echo "Starting application restore from: $backup_file"
    
    # Stop TrustStram services
    systemctl stop truststram
    systemctl stop truststram-worker
    
    # Backup current installation
    cp -r /opt/truststram /opt/truststram.backup.$(date +%Y%m%d_%H%M%S)
    
    # Extract backup
    tar -xzf "$backup_file" -C /tmp/
    
    # Restore application files
    cp -r /tmp/truststram/* /opt/truststram/
    
    # Restore configuration
    cp -r /tmp/config/* /etc/truststram/
    
    # Set permissions
    chown -R truststram:truststram /opt/truststram
    chmod +x /opt/truststram/bin/*
    
    # Restore data directory
    if [ -d "/tmp/data" ]; then
        cp -r /tmp/data/* /var/lib/truststram/
        chown -R truststram:truststram /var/lib/truststram
    fi
    
    # Update systemd services
    systemctl daemon-reload
    
    # Start services
    systemctl start truststram
    systemctl start truststram-worker
    
    # Verify restoration
    sleep 30
    curl -f http://localhost:8080/health || echo "Warning: Health check failed"
    
    echo "Application restore completed"
}

# Function for configuration-only restore
restore_configuration() {
    local config_backup="$1"
    
    echo "Restoring configuration from: $config_backup"
    
    # Backup current config
    cp -r /etc/truststram /etc/truststram.backup.$(date +%Y%m%d_%H%M%S)
    
    # Extract and restore config
    tar -xzf "$config_backup" -C /tmp/
    cp -r /tmp/truststram/* /etc/truststram/
    
    # Restart services
    systemctl restart truststram
    
    echo "Configuration restore completed"
}

# Recovery options
case "$1" in
    "app")
        restore_application "$2" "$3"
        ;;
    "config")
        restore_configuration "$2"
        ;;
    *)
        echo "Usage: $0 {app|config} <backup_file> [restore_point]"
        exit 1
        ;;
esac
```

## Disaster Recovery

### Disaster Recovery Plan
```bash
#!/bin/bash
# disaster_recovery.sh

# Configuration
DR_SITE_HOST="dr.truststram.com"
DR_DATABASE_URL="postgresql://user:pass@dr-db:5432/truststram"
PRIMARY_SITE_HOST="api.truststram.com"

# Function to check primary site status
check_primary_site() {
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" "https://$PRIMARY_SITE_HOST/health")
    if [ "$status_code" = "200" ]; then
        return 0  # Primary site is up
    else
        return 1  # Primary site is down
    fi
}

# Function to initiate disaster recovery
initiate_disaster_recovery() {
    echo "=== DISASTER RECOVERY INITIATED ==="
    echo "Timestamp: $(date)"
    
    # 1. Verify primary site is down
    if check_primary_site; then
        echo "ERROR: Primary site appears to be operational. Aborting DR procedure."
        exit 1
    fi
    
    echo "Primary site confirmed down. Proceeding with disaster recovery..."
    
    # 2. Promote standby database to primary
    echo "Promoting standby database..."
    sudo -u postgres pg_ctl promote -D /var/lib/postgresql/15/main
    
    # 3. Update DNS records to point to DR site
    echo "Updating DNS records..."
    /opt/truststram/scripts/update_dns_to_dr.sh
    
    # 4. Start TrustStram services on DR site
    echo "Starting TrustStram services..."
    systemctl start truststram
    systemctl start truststram-worker
    systemctl start nginx
    
    # 5. Verify DR site functionality
    echo "Verifying DR site..."
    sleep 60
    local dr_status=$(curl -s -o /dev/null -w "%{http_code}" "https://$DR_SITE_HOST/health")
    if [ "$dr_status" = "200" ]; then
        echo "DR site is operational"
    else
        echo "ERROR: DR site health check failed"
        exit 1
    fi
    
    # 6. Send notifications
    echo "Sending disaster recovery notifications..."
    /opt/truststram/scripts/send_dr_notifications.sh
    
    echo "=== DISASTER RECOVERY COMPLETED ==="
}

# Function to failback to primary site
initiate_failback() {
    echo "=== FAILBACK TO PRIMARY INITIATED ==="
    echo "Timestamp: $(date)"
    
    # 1. Verify primary site is ready
    echo "Verifying primary site readiness..."
    local primary_status=$(curl -s -o /dev/null -w "%{http_code}" "https://$PRIMARY_SITE_HOST/health")
    if [ "$primary_status" != "200" ]; then
        echo "ERROR: Primary site is not ready for failback"
        exit 1
    fi
    
    # 2. Sync data from DR to primary
    echo "Synchronizing data to primary site..."
    pg_dump -h localhost -U truststram truststram | \
        psql -h primary-db.truststram.com -U truststram truststram
    
    # 3. Update DNS records back to primary
    echo "Updating DNS records to primary..."
    /opt/truststram/scripts/update_dns_to_primary.sh
    
    # 4. Stop DR services
    echo "Stopping DR services..."
    systemctl stop truststram
    systemctl stop truststram-worker
    
    # 5. Verify primary site
    echo "Verifying primary site..."
    sleep 60
    primary_status=$(curl -s -o /dev/null -w "%{http_code}" "https://$PRIMARY_SITE_HOST/health")
    if [ "$primary_status" = "200" ]; then
        echo "Primary site is operational"
    else
        echo "ERROR: Primary site verification failed"
        exit 1
    fi
    
    echo "=== FAILBACK COMPLETED ==="
}

# Automated DR monitoring
monitor_and_auto_dr() {
    local failure_count=0
    local failure_threshold=3
    local check_interval=60  # seconds
    
    while true; do
        if ! check_primary_site; then
            failure_count=$((failure_count + 1))
            echo "Primary site check failed (attempt $failure_count/$failure_threshold)"
            
            if [ $failure_count -ge $failure_threshold ]; then
                echo "Failure threshold reached. Initiating automatic disaster recovery..."
                initiate_disaster_recovery
                break
            fi
        else
            failure_count=0
        fi
        
        sleep $check_interval
    done
}

# Main script logic
case "$1" in
    "initiate")
        initiate_disaster_recovery
        ;;
    "failback")
        initiate_failback
        ;;
    "monitor")
        monitor_and_auto_dr
        ;;
    *)
        echo "Usage: $0 {initiate|failback|monitor}"
        echo "  initiate - Start disaster recovery procedure"
        echo "  failback - Failback to primary site"
        echo "  monitor  - Monitor primary site and auto-initiate DR"
        exit 1
        ;;
esac
```

## Point-in-Time Recovery

### PITR Implementation
```python
import psycopg2
import subprocess
import datetime
import os
import shutil

class PointInTimeRecovery:
    def __init__(self, database_url, wal_archive_dir, backup_dir):
        self.database_url = database_url
        self.wal_archive_dir = wal_archive_dir
        self.backup_dir = backup_dir
        self.postgres_data_dir = "/var/lib/postgresql/15/main"
    
    def list_available_backups(self):
        """List available base backups for recovery."""
        backups = []
        for file in os.listdir(self.backup_dir):
            if file.endswith('.dump'):
                backup_time = self.extract_backup_time(file)
                backups.append({
                    'file': file,
                    'timestamp': backup_time,
                    'path': os.path.join(self.backup_dir, file)
                })
        
        return sorted(backups, key=lambda x: x['timestamp'], reverse=True)
    
    def extract_backup_time(self, filename):
        """Extract timestamp from backup filename."""
        # Assuming format: truststram_full_20241201_143022.dump
        parts = filename.split('_')
        if len(parts) >= 4:
            date_str = f"{parts[2]}_{parts[3].split('.')[0]}"
            return datetime.datetime.strptime(date_str, "%Y%m%d_%H%M%S")
        return datetime.datetime.min
    
    def find_suitable_backup(self, target_time):
        """Find the most suitable backup for target recovery time."""
        backups = self.list_available_backups()
        
        for backup in backups:
            if backup['timestamp'] <= target_time:
                return backup
        
        raise ValueError(f"No suitable backup found for target time: {target_time}")
    
    def prepare_recovery_environment(self):
        """Prepare the environment for recovery."""
        # Stop PostgreSQL
        subprocess.run(['systemctl', 'stop', 'postgresql'], check=True)
        
        # Backup current data directory
        backup_dir_name = f"{self.postgres_data_dir}.backup.{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"
        shutil.move(self.postgres_data_dir, backup_dir_name)
        
        # Create new data directory
        os.makedirs(self.postgres_data_dir, exist_ok=True)
        
        return backup_dir_name
    
    def restore_base_backup(self, backup_file):
        """Restore base backup."""
        # Extract backup
        subprocess.run([
            'pg_restore',
            '--clean',
            '--create',
            '--if-exists',
            '--no-owner',
            '--no-privileges',
            '--dbname', 'postgres',
            backup_file
        ], check=True)
    
    def configure_recovery(self, target_time, target_action='promote'):
        """Configure PostgreSQL for point-in-time recovery."""
        recovery_conf = f"""
restore_command = 'cp {self.wal_archive_dir}/%f %p'
recovery_target_time = '{target_time.isoformat()}'
recovery_target_action = '{target_action}'
"""
        
        with open(f"{self.postgres_data_dir}/postgresql.auto.conf", 'w') as f:
            f.write(recovery_conf)
        
        # Set proper ownership
        subprocess.run([
            'chown', '-R', 'postgres:postgres', self.postgres_data_dir
        ], check=True)
    
    def start_recovery(self):
        """Start PostgreSQL and begin recovery process."""
        subprocess.run(['systemctl', 'start', 'postgresql'], check=True)
        
        # Wait for recovery to complete
        max_wait = 300  # 5 minutes
        wait_time = 0
        
        while wait_time < max_wait:
            try:
                conn = psycopg2.connect(self.database_url)
                cursor = conn.cursor()
                cursor.execute("SELECT pg_is_in_recovery();")
                in_recovery = cursor.fetchone()[0]
                cursor.close()
                conn.close()
                
                if not in_recovery:
                    return True
                
            except psycopg2.Error:
                pass
            
            time.sleep(10)
            wait_time += 10
        
        return False
    
    def verify_recovery(self, target_time):
        """Verify that recovery was successful."""
        try:
            conn = psycopg2.connect(self.database_url)
            cursor = conn.cursor()
            
            # Check current time
            cursor.execute("SELECT now();")
            current_time = cursor.fetchone()[0]
            
            # Check for expected data
            cursor.execute("SELECT COUNT(*) FROM models WHERE created_at <= %s", (target_time,))
            model_count = cursor.fetchone()[0]
            
            cursor.close()
            conn.close()
            
            return {
                'success': True,
                'recovered_to': current_time,
                'model_count': model_count
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def perform_pitr(self, target_time_str, dry_run=False):
        """Perform complete point-in-time recovery."""
        target_time = datetime.datetime.fromisoformat(target_time_str)
        
        print(f"Starting Point-in-Time Recovery to: {target_time}")
        
        if dry_run:
            print("DRY RUN MODE - No actual changes will be made")
            return
        
        try:
            # Find suitable backup
            backup = self.find_suitable_backup(target_time)
            print(f"Using backup: {backup['file']} from {backup['timestamp']}")
            
            # Prepare environment
            backup_dir = self.prepare_recovery_environment()
            print(f"Current data backed up to: {backup_dir}")
            
            # Restore base backup
            self.restore_base_backup(backup['path'])
            print("Base backup restored")
            
            # Configure recovery
            self.configure_recovery(target_time)
            print("Recovery configuration applied")
            
            # Start recovery
            if self.start_recovery():
                print("Recovery process completed")
                
                # Verify recovery
                result = self.verify_recovery(target_time)
                if result['success']:
                    print(f"Recovery verification successful")
                    print(f"Recovered to: {result['recovered_to']}")
                    print(f"Model count: {result['model_count']}")
                else:
                    print(f"Recovery verification failed: {result['error']}")
            else:
                print("Recovery process timed out or failed")
                
        except Exception as e:
            print(f"Recovery failed: {e}")
            raise

# Usage example
pitr = PointInTimeRecovery(
    database_url="postgresql://truststram:password@localhost:5432/truststram",
    wal_archive_dir="/backup/wal",
    backup_dir="/backup/postgresql"
)

# Perform recovery to specific time
pitr.perform_pitr("2024-12-01T14:30:00")
```

## Backup Verification

### Automated Backup Verification
```bash
#!/bin/bash
# verify_backups.sh

# Configuration
BACKUP_DIR="/backup"
LOG_FILE="/var/log/truststram/backup_verification.log"
EMAIL_ALERTS="admin@truststram.com"

# Initialize logging
exec 1> >(tee -a $LOG_FILE)
exec 2>&1

echo "=== Backup Verification Started: $(date) ==="

# Function to verify database backup
verify_database_backup() {
    local backup_file="$1"
    local test_db="truststram_test_$(date +%s)"
    
    echo "Verifying database backup: $backup_file"
    
    # Create test database
    sudo -u postgres createdb "$test_db"
    
    # Restore backup to test database
    if pg_restore -d "$test_db" "$backup_file" 2>/dev/null; then
        # Verify data integrity
        local table_count=$(sudo -u postgres psql -d "$test_db" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
        local record_count=$(sudo -u postgres psql -d "$test_db" -t -c "SELECT COUNT(*) FROM models;" | xargs)
        
        echo "Database backup verification successful:"
        echo "  Tables: $table_count"
        echo "  Model records: $record_count"
        
        # Cleanup
        sudo -u postgres dropdb "$test_db"
        return 0
    else
        echo "Database backup verification failed: $backup_file"
        sudo -u postgres dropdb "$test_db" 2>/dev/null
        return 1
    fi
}

# Function to verify application backup
verify_application_backup() {
    local backup_file="$1"
    local test_dir="/tmp/app_test_$(date +%s)"
    
    echo "Verifying application backup: $backup_file"
    
    # Extract backup
    mkdir -p "$test_dir"
    if tar -xzf "$backup_file" -C "$test_dir" 2>/dev/null; then
        # Verify essential files
        local binary_exists=false
        local config_exists=false
        
        if [ -f "$test_dir/bin/truststram" ] || find "$test_dir" -name "truststram" -type f | grep -q .; then
            binary_exists=true
        fi
        
        if [ -d "$test_dir/config" ] || find "$test_dir" -name "*.yaml" -o -name "*.yml" | grep -q .; then
            config_exists=true
        fi
        
        if $binary_exists && $config_exists; then
            echo "Application backup verification successful"
            rm -rf "$test_dir"
            return 0
        else
            echo "Application backup verification failed: missing essential files"
            rm -rf "$test_dir"
            return 1
        fi
    else
        echo "Application backup verification failed: cannot extract $backup_file"
        rm -rf "$test_dir"
        return 1
    fi
}

# Function to verify file integrity
verify_file_integrity() {
    local file="$1"
    
    # Check if file exists and is readable
    if [ ! -f "$file" ]; then
        echo "File not found: $file"
        return 1
    fi
    
    if [ ! -r "$file" ]; then
        echo "File not readable: $file"
        return 1
    fi
    
    # Check file size (should be > 0)
    local size=$(stat -c%s "$file")
    if [ "$size" -eq 0 ]; then
        echo "File is empty: $file"
        return 1
    fi
    
    # Verify archive integrity for compressed files
    case "$file" in
        *.tar.gz)
            if tar -tzf "$file" >/dev/null 2>&1; then
                echo "Archive integrity verified: $file"
                return 0
            else
                echo "Archive integrity check failed: $file"
                return 1
            fi
            ;;
        *.gz)
            if gzip -t "$file" 2>/dev/null; then
                echo "Compression integrity verified: $file"
                return 0
            else
                echo "Compression integrity check failed: $file"
                return 1
            fi
            ;;
        *.dump)
            if pg_restore --list "$file" >/dev/null 2>&1; then
                echo "PostgreSQL dump integrity verified: $file"
                return 0
            else
                echo "PostgreSQL dump integrity check failed: $file"
                return 1
            fi
            ;;
        *)
            echo "File exists and readable: $file"
            return 0
            ;;
    esac
}

# Main verification process
VERIFICATION_SUCCESS=true
VERIFIED_COUNT=0
FAILED_COUNT=0

# Verify recent backups (last 24 hours)
find "$BACKUP_DIR" -name "*.dump" -o -name "*.tar.gz" -mtime -1 | while read backup_file; do
    echo "Processing: $backup_file"
    
    # Basic file integrity check
    if ! verify_file_integrity "$backup_file"; then
        VERIFICATION_SUCCESS=false
        FAILED_COUNT=$((FAILED_COUNT + 1))
        continue
    fi
    
    # Specific verification based on file type
    case "$(basename "$backup_file")" in
        truststram_full_*.dump)
            if ! verify_database_backup "$backup_file"; then
                VERIFICATION_SUCCESS=false
                FAILED_COUNT=$((FAILED_COUNT + 1))
            else
                VERIFIED_COUNT=$((VERIFIED_COUNT + 1))
            fi
            ;;
        truststram_binaries_*.tar.gz|truststram_config_*.tar.gz)
            if ! verify_application_backup "$backup_file"; then
                VERIFICATION_SUCCESS=false
                FAILED_COUNT=$((FAILED_COUNT + 1))
            else
                VERIFIED_COUNT=$((VERIFIED_COUNT + 1))
            fi
            ;;
        *)
            echo "File integrity verified: $backup_file"
            VERIFIED_COUNT=$((VERIFIED_COUNT + 1))
            ;;
    esac
done

# Generate verification report
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$BACKUP_DIR/verification_report_$TIMESTAMP.txt"

cat > "$REPORT_FILE" << EOF
Backup Verification Report
==========================
Date: $(date)
Status: $(if $VERIFICATION_SUCCESS; then echo "SUCCESS"; else echo "FAILURE"; fi)

Summary:
- Verified: $VERIFIED_COUNT backups
- Failed: $FAILED_COUNT backups

Backup Inventory:
$(find $BACKUP_DIR -name "*.dump" -o -name "*.tar.gz" -mtime -7 -exec ls -lh {} \;)

Disk Usage:
$(df -h $BACKUP_DIR)

Storage Health:
$(find $BACKUP_DIR -name "*.dump" -o -name "*.tar.gz" -mtime -1 | wc -l) recent backups found
$(find $BACKUP_DIR -name "*.dump" -o -name "*.tar.gz" | wc -l) total backups
EOF

# Upload verification report
aws s3 cp "$REPORT_FILE" "s3://truststram-backups/verification/verification_report_$TIMESTAMP.txt"

# Send alerts if verification failed
if ! $VERIFICATION_SUCCESS; then
    echo "Backup verification failures detected. Sending alert..."
    echo "Backup verification failed. $FAILED_COUNT backups failed verification. Please investigate immediately." | \
        mail -s "TrustStram Backup Verification Failure" $EMAIL_ALERTS
fi

echo "=== Backup Verification Completed: $(date) ==="
```

## Security and Encryption

### Backup Encryption
```bash
#!/bin/bash
# encrypted_backup.sh

# Configuration
GPG_RECIPIENT="truststram-backup@company.com"
ENCRYPTION_ALGORITHM="AES256"
BACKUP_DIR="/backup"
ENCRYPTED_DIR="/backup/encrypted"

# Create encrypted backup directory
mkdir -p "$ENCRYPTED_DIR"

# Function to encrypt file with GPG
encrypt_with_gpg() {
    local source_file="$1"
    local encrypted_file="$2"
    
    gpg --trust-model always \
        --cipher-algo AES256 \
        --compress-algo 2 \
        --compress-level 6 \
        --recipient "$GPG_RECIPIENT" \
        --encrypt \
        --output "$encrypted_file" \
        "$source_file"
    
    if [ $? -eq 0 ]; then
        # Verify encryption
        if gpg --list-packets "$encrypted_file" >/dev/null 2>&1; then
            echo "Encryption successful: $encrypted_file"
            return 0
        else
            echo "Encryption verification failed: $encrypted_file"
            return 1
        fi
    else
        echo "Encryption failed: $source_file"
        return 1
    fi
}

# Function to encrypt with OpenSSL
encrypt_with_openssl() {
    local source_file="$1"
    local encrypted_file="$2"
    local password="$3"
    
    openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
        -in "$source_file" \
        -out "$encrypted_file" \
        -pass pass:"$password"
    
    if [ $? -eq 0 ]; then
        echo "OpenSSL encryption successful: $encrypted_file"
        return 0
    else
        echo "OpenSSL encryption failed: $source_file"
        return 1
    fi
}

# Encrypt all recent backups
find "$BACKUP_DIR" -maxdepth 1 -name "*.dump" -o -name "*.tar.gz" -mtime -1 | while read backup_file; do
    filename=$(basename "$backup_file")
    encrypted_file="$ENCRYPTED_DIR/${filename}.gpg"
    
    if [ ! -f "$encrypted_file" ]; then
        echo "Encrypting: $backup_file"
        encrypt_with_gpg "$backup_file" "$encrypted_file"
        
        # Remove original after successful encryption
        if [ $? -eq 0 ]; then
            rm "$backup_file"
            echo "Original file removed: $backup_file"
        fi
    else
        echo "Already encrypted: $filename"
    fi
done

# Upload encrypted backups to cloud
aws s3 sync "$ENCRYPTED_DIR" s3://truststram-encrypted-backups/ \
    --storage-class STANDARD_IA \
    --server-side-encryption AES256
```

### Backup Decryption and Recovery
```bash
#!/bin/bash
# decrypt_and_recover.sh

# Function to decrypt GPG encrypted backup
decrypt_gpg_backup() {
    local encrypted_file="$1"
    local output_file="$2"
    
    gpg --decrypt --output "$output_file" "$encrypted_file"
    
    if [ $? -eq 0 ]; then
        echo "Decryption successful: $output_file"
        return 0
    else
        echo "Decryption failed: $encrypted_file"
        return 1
    fi
}

# Function to decrypt OpenSSL encrypted backup
decrypt_openssl_backup() {
    local encrypted_file="$1"
    local output_file="$2"
    local password="$3"
    
    openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
        -in "$encrypted_file" \
        -out "$output_file" \
        -pass pass:"$password"
    
    if [ $? -eq 0 ]; then
        echo "OpenSSL decryption successful: $output_file"
        return 0
    else
        echo "OpenSSL decryption failed: $encrypted_file"
        return 1
    fi
}

# Main decryption process
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <encrypted_backup_file> <output_file>"
    exit 1
fi

ENCRYPTED_FILE="$1"
OUTPUT_FILE="$2"

# Detect encryption type and decrypt
if [[ "$ENCRYPTED_FILE" == *.gpg ]]; then
    decrypt_gpg_backup "$ENCRYPTED_FILE" "$OUTPUT_FILE"
elif [[ "$ENCRYPTED_FILE" == *.enc ]]; then
    read -s -p "Enter decryption password: " password
    echo
    decrypt_openssl_backup "$ENCRYPTED_FILE" "$OUTPUT_FILE" "$password"
else
    echo "Unknown encryption format: $ENCRYPTED_FILE"
    exit 1
fi
```

---

## Support and Emergency Procedures

### Emergency Contacts
- **Backup Team Lead**: backup-lead@truststram.com
- **Database Administrator**: dba@truststram.com  
- **Emergency Hotline**: +1-800-TRUSTSTRAM
- **24/7 Operations Center**: ops@truststram.com

### Emergency Recovery Procedures
1. **Immediate Response**: Contact emergency hotline
2. **Assessment**: Determine scope of data loss
3. **Recovery Strategy**: Select appropriate recovery method
4. **Execute Recovery**: Follow documented procedures
5. **Verification**: Confirm data integrity and system functionality
6. **Post-Recovery**: Document incident and update procedures

### Documentation and Resources
- **Backup Documentation**: https://docs.truststram.com/backup
- **Recovery Runbooks**: https://runbooks.truststram.com/recovery
- **Training Materials**: https://training.truststram.com/backup-recovery

Remember: Regular testing of backup and recovery procedures is essential for ensuring reliability in actual disaster scenarios.