#!/bin/bash
# TrustStream v4.2 Version Control & Backup Infrastructure Setup
# Usage: ./setup-version-control.sh [--full-setup]

set -e

# Configuration
FULL_SETUP=${1:-"--basic"}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."
    
    # Check if git is installed
    if ! command -v git &> /dev/null; then
        log_error "Git is not installed. Please install Git first."
        exit 1
    fi
    
    # Check if Azure CLI is installed
    if ! command -v az &> /dev/null; then
        log_error "Azure CLI is not installed. Please install Azure CLI first."
        exit 1
    fi
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    # Check if Supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
        log_warn "Supabase CLI is not installed. Installing..."
        npm install -g supabase
    fi
    
    log_info "Prerequisites check completed"
}

# Setup Git configuration
setup_git_config() {
    log_step "Setting up Git configuration..."
    
    # Configure Git hooks directory
    mkdir -p "$PROJECT_ROOT/.githooks"
    git config core.hooksPath "$PROJECT_ROOT/.githooks"
    
    # Create pre-commit hook
    cat > "$PROJECT_ROOT/.githooks/pre-commit" << 'EOF'
#!/bin/bash
# TrustStream pre-commit hook

set -e

echo "Running pre-commit checks..."

# Check for secrets
if grep -r "sk-" --include="*.js" --include="*.ts" --include="*.json" . 2>/dev/null; then
    echo "ERROR: Potential API key found in commit"
    exit 1
fi

# Run linting
npm run lint || {
    echo "ERROR: Linting failed"
    exit 1
}

# Run tests
npm run test || {
    echo "ERROR: Tests failed"
    exit 1
}

echo "Pre-commit checks passed"
EOF

    chmod +x "$PROJECT_ROOT/.githooks/pre-commit"
    
    # Create commit-msg hook for conventional commits
    cat > "$PROJECT_ROOT/.githooks/commit-msg" << 'EOF'
#!/bin/bash
# Conventional commits validation

commit_regex='^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .{1,50}'

if ! grep -qE "$commit_regex" "$1"; then
    echo "Invalid commit message format!"
    echo "Format: type(scope): description"
    echo "Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert"
    exit 1
fi
EOF

    chmod +x "$PROJECT_ROOT/.githooks/commit-msg"
    
    # Configure Git attributes for LFS if needed
    cat > "$PROJECT_ROOT/.gitattributes" << 'EOF'
*.zip filter=lfs diff=lfs merge=lfs -text
*.tar.gz filter=lfs diff=lfs merge=lfs -text
*.sql.gz filter=lfs diff=lfs merge=lfs -text
*.backup filter=lfs diff=lfs merge=lfs -text
EOF

    log_info "Git configuration completed"
}

# Setup backup infrastructure
setup_backup_infrastructure() {
    log_step "Setting up backup infrastructure..."
    
    # Create backup directories
    mkdir -p "$PROJECT_ROOT/backups"/{database,repository,storage,manifests,safety-backups}
    
    # Create backup configuration
    cat > "$PROJECT_ROOT/config/backup-config.json" << EOF
{
  "azure": {
    "storageAccount": "${AZURE_STORAGE_ACCOUNT:-truststream-backups}",
    "containerName": "truststream-backups",
    "resourceGroup": "${AZURE_RESOURCE_GROUP:-truststream-v4-rg}"
  },
  "schedules": {
    "database": {
      "tier1": "0 */4 * * *",
      "tier2": "0 2 * * *",
      "tier3": "0 3 * * 0",
      "tier4": "0 4 * * *"
    },
    "repository": "0 1 * * *",
    "storage": "0 5 * * *"
  },
  "retention": {
    "tier1": "72h",
    "tier2": "30d",
    "tier3": "365d",
    "tier4": "90d"
  }
}
EOF

    # Create Azure storage container if it doesn't exist
    if command -v az &> /dev/null && az account show &> /dev/null; then
        log_info "Creating Azure storage container..."
        az storage container create \
            --name "truststream-backups" \
            --account-name "${AZURE_STORAGE_ACCOUNT:-truststream-backups}" \
            --public-access off || log_warn "Storage container may already exist"
    else
        log_warn "Azure CLI not authenticated. Please run 'az login' and configure storage manually."
    fi
    
    log_info "Backup infrastructure setup completed"
}

# Setup monitoring and alerting
setup_monitoring() {
    log_step "Setting up monitoring and alerting..."
    
    # Create monitoring configuration
    mkdir -p "$PROJECT_ROOT/config/monitoring"
    
    cat > "$PROJECT_ROOT/config/monitoring/alerts.json" << EOF
{
  "email": {
    "enabled": true,
    "recipients": ["admin@truststream.ai"],
    "smtp": {
      "host": "${SMTP_HOST:-smtp.gmail.com}",
      "port": "${SMTP_PORT:-587}",
      "secure": false
    }
  },
  "webhook": {
    "enabled": true,
    "url": "${MONITORING_WEBHOOK_URL:-}",
    "timeout": 10000
  },
  "thresholds": {
    "backup_age_hours": 6,
    "disk_usage_percent": 85,
    "memory_usage_percent": 90,
    "response_time_ms": 5000
  }
}
EOF

    # Create health check script
    cat > "$PROJECT_ROOT/scripts/health-check.sh" << 'EOF'
#!/bin/bash
# TrustStream health check script

set -e

HEALTH_URL="${1:-http://localhost:3000/health}"
TIMEOUT="${2:-10}"

# Check application health
if curl -f --max-time "$TIMEOUT" "$HEALTH_URL" > /dev/null 2>&1; then
    echo "✓ Application health check passed"
    exit 0
else
    echo "✗ Application health check failed"
    exit 1
fi
EOF

    chmod +x "$PROJECT_ROOT/scripts/health-check.sh"
    
    log_info "Monitoring setup completed"
}

# Setup Supabase schema versioning
setup_supabase_versioning() {
    log_step "Setting up Supabase schema versioning..."
    
    # Create versioning system
    cat > "$PROJECT_ROOT/supabase/migrations/$(date +%Y%m%d%H%M%S)_create_version_control_system.sql" << 'EOF'
-- Create version control system for TrustStream
CREATE TABLE IF NOT EXISTS version_control.schema_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(50) NOT NULL UNIQUE,
    migration_file VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    applied_by VARCHAR(100),
    rollback_file VARCHAR(255),
    description TEXT,
    checksum VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS version_control.function_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    function_name VARCHAR(100) NOT NULL,
    version VARCHAR(50) NOT NULL,
    deployed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deployed_by VARCHAR(100),
    source_hash VARCHAR(64),
    dependencies JSONB DEFAULT '[]',
    rollback_target VARCHAR(50),
    UNIQUE(function_name, version)
);

CREATE TABLE IF NOT EXISTS version_control.backup_manifests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_id VARCHAR(100) NOT NULL UNIQUE,
    backup_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    components JSONB NOT NULL,
    storage_location VARCHAR(500),
    size_bytes BIGINT,
    checksum VARCHAR(64),
    validated_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE version_control.schema_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE version_control.function_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE version_control.backup_manifests ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_schema_versions_version ON version_control.schema_versions(version);
CREATE INDEX idx_function_versions_name ON version_control.function_versions(function_name);
CREATE INDEX idx_backup_manifests_type ON version_control.backup_manifests(backup_type);
CREATE INDEX idx_backup_manifests_created ON version_control.backup_manifests(created_at);
EOF

    # Create function versioning manifest
    cat > "$PROJECT_ROOT/supabase/function-manifest.json" << EOF
{
  "version": "4.2.0",
  "last_updated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "functions": {}
}
EOF

    log_info "Supabase versioning setup completed"
}

# Setup cron jobs for automated backups
setup_cron_jobs() {
    log_step "Setting up automated backup cron jobs..."
    
    # Create cron job entries
    cat > "$PROJECT_ROOT/scripts/crontab-entries.txt" << EOF
# TrustStream v4.2 Automated Backups
# Database backups - every 4 hours
0 */4 * * * cd $PROJECT_ROOT && ./scripts/backup-database.sh tier1 >> /var/log/truststream-backup.log 2>&1

# Full daily backup - 2 AM UTC
0 2 * * * cd $PROJECT_ROOT && ./scripts/backup-database.sh tier2 >> /var/log/truststream-backup.log 2>&1

# Repository backup - 1 AM UTC
0 1 * * * cd $PROJECT_ROOT && ./scripts/backup-repository.sh >> /var/log/truststream-backup.log 2>&1

# Weekly archive backup - Sunday 3 AM UTC
0 3 * * 0 cd $PROJECT_ROOT && ./scripts/backup-database.sh tier3 >> /var/log/truststream-backup.log 2>&1

# Backup validation - every 6 hours
0 */6 * * * cd $PROJECT_ROOT && ./scripts/validate-backups.sh >> /var/log/truststream-validation.log 2>&1

# Monitoring check - every hour
0 * * * * cd $PROJECT_ROOT && ./scripts/backup-monitor.sh >> /var/log/truststream-monitor.log 2>&1
EOF

    log_info "Cron job entries created. To activate, run:"
    log_info "crontab $PROJECT_ROOT/scripts/crontab-entries.txt"
}

# Setup environment files
setup_environment_files() {
    log_step "Setting up environment configuration..."
    
    # Create environment template
    cat > "$PROJECT_ROOT/.env.template" << 'EOF'
# TrustStream v4.2 Environment Configuration

# Application
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_PROJECT_REF=your_project_ref

# Azure Configuration
AZURE_SUBSCRIPTION_ID=your_subscription_id
AZURE_RESOURCE_GROUP=truststream-v4-rg
AZURE_STORAGE_ACCOUNT=truststreambackups
AZURE_STORAGE_CONNECTION_STRING=your_connection_string
AZURE_WEBAPP_NAME=truststream-v4
AZURE_APP_SERVICE_PLAN=truststream-plan

# Backup Configuration
BACKUP_ENCRYPTION_KEY=your_encryption_key
BACKUP_RETENTION_DAYS=30

# Monitoring
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
MONITORING_WEBHOOK_URL=your_monitoring_webhook

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key
EOF

    # Create production environment defaults
    cat > "$PROJECT_ROOT/config/production.json" << 'EOF'
{
  "app": {
    "name": "TrustStream v4.2",
    "version": "4.2.0",
    "environment": "production",
    "port": 8080,
    "host": "0.0.0.0"
  },
  "backup": {
    "enabled": true,
    "encryptionEnabled": true,
    "compressionEnabled": true,
    "retentionDays": 30
  },
  "monitoring": {
    "logLevel": "info",
    "enableMetrics": true,
    "enableTracing": true,
    "healthCheckInterval": 30000
  },
  "security": {
    "corsEnabled": true,
    "corsOrigins": ["https://truststream-v4.azurewebsites.net"],
    "rateLimitEnabled": true,
    "rateLimitMax": 100
  }
}
EOF

    log_info "Environment configuration completed"
}

# Main setup function
main() {
    echo "=========================================="
    echo "TrustStream v4.2 Version Control & Backup Setup"
    echo "=========================================="
    
    check_prerequisites
    setup_git_config
    setup_backup_infrastructure
    setup_monitoring
    setup_supabase_versioning
    setup_cron_jobs
    setup_environment_files
    
    if [ "$FULL_SETUP" = "--full-setup" ]; then
        log_step "Running full setup including package installation..."
        
        # Install additional monitoring packages
        npm install --save-dev nodemailer @types/nodemailer
        npm install --save-dev husky lint-staged
        
        # Setup Husky for Git hooks
        npx husky install
        npx husky add .husky/pre-commit "npm run lint"
        npx husky add .husky/commit-msg "npm run validate-commit"
    fi
    
    echo "=========================================="
    log_info "Setup completed successfully!"
    echo "=========================================="
    
    echo ""
    echo "Next steps:"
    echo "1. Configure environment variables in .env file"
    echo "2. Set up Azure storage and authentication"
    echo "3. Install cron jobs: crontab scripts/crontab-entries.txt"
    echo "4. Test backup system: ./scripts/backup-database.sh tier1"
    echo "5. Validate setup: ./scripts/health-check.sh"
    echo ""
    echo "Documentation: docs/version-control-backup-strategy.md"
}

# Run main function
main "$@"
