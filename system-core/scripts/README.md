# TrustStream v4.2 Scripts Collection

This directory contains all the scripts necessary for implementing and maintaining TrustStream v4.2, including:
- Migration automation for progressive Supabase abstraction
- Version control and backup strategy implementation
- Deployment and monitoring utilities

## Script Categories

### Migration Automation Scripts
Progressive migration automation for moving away from Supabase dependencies to abstraction layers:
- `analyze-dependencies.sh` - Comprehensive dependency analysis and mapping
- `create-abstractions.sh` - Abstraction layer code generation
- `migrate-component.sh` - Component-by-component migration tool
- `validate-migration.sh` - Migration validation and testing

### Version Control & Backup Scripts
Comprehensive backup and version control infrastructure:
- `setup-version-control.sh` - Initial system setup
- `backup-database.sh` - Multi-tier database backup automation
- `validate-backups.sh` - Backup integrity validation
- `health-check.sh` - System health monitoring

### Deployment Scripts
Production deployment and rollback capabilities:
- `azure-deploy.sh` - Azure deployment automation
- `verify-deployment.sh` - Deployment verification
- `setup-environment.sh` - Environment configuration

## Quick Start

### For Migration Projects

1. **Analyze Current Dependencies**
   ```bash
   # Run dependency analysis
   ./scripts/analyze-dependencies.sh
   
   # Generate dependency report
   ./scripts/analyze-dependencies.sh --format json --output ./reports
   ```

2. **Create Abstraction Layers**
   ```bash
   # Generate all abstraction layers
   ./scripts/create-abstractions.sh
   
   # Generate specific layer
   ./scripts/create-abstractions.sh --layer database --impl supabase
   ```

3. **Migrate Components**
   ```bash
   # Migrate an edge function
   ./scripts/migrate-component.sh supabase/functions/example-function
   
   # Migrate frontend with validation
   ./scripts/migrate-component.sh --type frontend --validate admin-interfaces/ai-dashboard
   ```

4. **Validate Migration**
   ```bash
   # Full validation with performance benchmarks
   ./scripts/validate-migration.sh --test all --benchmark --report html
   
   # CI-friendly validation
   ./scripts/validate-migration.sh --ci --fix
   ```

### For Version Control & Backup

1. **Initial Setup**
   ```bash
   # Make all scripts executable
   chmod +x scripts/*.sh
   
   # Run the setup script
   ./scripts/setup-version-control.sh --full-setup
   
   # Configure environment variables
   cp .env.template .env
   # Edit .env with your configuration
   ```

2. **Test the System**
   ```bash
   # Run health check
   ./scripts/health-check.sh
   
   # Test backup creation
   ./scripts/backup-database.sh tier1 test-backup
   
   # Validate the backup
   ./scripts/validate-backups.sh $(date +%Y%m%d)
   ```

## Script Documentation

### Core Setup Scripts

#### `setup-version-control.sh`
Comprehensive setup script that configures the entire version control and backup infrastructure.

**Usage:**
```bash
./setup-version-control.sh [--full-setup]
```

**Features:**
- Git configuration with hooks and conventional commits
- Backup infrastructure setup with Azure integration
- Monitoring and alerting configuration
- Supabase schema versioning setup
- Automated cron job scheduling

**Parameters:**
- `--full-setup`: Installs additional packages and sets up complete development environment

## Migration Automation Scripts

### `analyze-dependencies.sh`
Comprehensive dependency scanner for progressive migration away from Supabase dependencies.

**Usage:**
```bash
./analyze-dependencies.sh [OPTIONS]
```

**Options:**
- `-o, --output DIR`: Output directory (default: context/architectural-files)
- `-f, --format FORMAT`: Output format: json|markdown|csv (default: markdown)
- `-p, --phase PHASE`: Analysis phase: 1|2|3|4|all (default: all)
- `-c, --component`: Analyze specific component
- `-v, --verbose`: Enable verbose output
- `--dry-run`: Show what would be analyzed without running

**Analysis Phases:**
1. **Codebase Discovery and Inventory** - Catalogs all Supabase components
2. **Dependency Analysis** - Maps dependencies and data flows
3. **Dependency Classification** - Categorizes as Critical, Important, or Optional
4. **Abstraction Strategy Design** - Creates migration roadmap

**Examples:**
```bash
# Run full analysis
./analyze-dependencies.sh

# Analyze specific component with JSON output
./analyze-dependencies.sh --component supabase/functions --format json

# Run only discovery phase
./analyze-dependencies.sh --phase 1 --verbose
```

### `create-abstractions.sh`
Abstraction layer generator that creates interfaces, implementations, and dependency injection framework.

**Usage:**
```bash
./create-abstractions.sh [OPTIONS]
```

**Options:**
- `-l, --layer LAYER`: Generate specific layer: db|auth|storage|realtime|all
- `-o, --output DIR`: Output directory (default: src/shared-utils/abstractions)
- `--impl TYPE`: Include implementation: supabase|postgres|mock|all
- `--typescript`: Generate TypeScript interfaces (default)
- `--overwrite`: Overwrite existing files
- `--dry-run`: Show what would be generated

**Generated Components:**
- **Interfaces**: TypeScript interfaces for each service
- **Implementations**: Concrete implementations (Supabase, PostgreSQL, Mock)
- **DI Container**: Dependency injection framework
- **Configuration**: Service configuration management
- **Examples**: Usage examples and patterns

**Examples:**
```bash
# Generate all layers and implementations
./create-abstractions.sh

# Generate only database layer with Supabase implementation
./create-abstractions.sh --layer db --impl supabase

# Regenerate everything, overwriting existing files
./create-abstractions.sh --overwrite
```

### `migrate-component.sh`
Component migration tool for progressive migration to abstraction layers.

**Usage:**
```bash
./migrate-component.sh [OPTIONS] COMPONENT_PATH
```

**Options:**
- `-t, --type TYPE`: Component type: edge-function|frontend|api|all
- `-s, --service SVC`: Target service: database|auth|storage|realtime|all
- `-b, --backup`: Create backup before migration (default: true)
- `--no-backup`: Skip backup creation
- `--dry-run`: Show what would be migrated
- `--rollback ID`: Rollback a previous migration
- `--validate`: Validate migration after completion
- `-f, --force`: Force migration even if validation fails

**Component Types:**
- **edge-function**: Supabase edge functions
- **frontend**: React/Next.js frontend applications
- **api**: API route handlers
- **all**: Migrate all component types

**Migration Features:**
- Automatic backup creation with unique IDs
- Service-specific migration patterns
- Validation and rollback capabilities
- Progressive migration support

**Examples:**
```bash
# Migrate an edge function
./migrate-component.sh supabase/functions/community-ai-leader-enhanced

# Migrate frontend with auth services only
./migrate-component.sh --type frontend --service auth admin-interfaces/ai-dashboard

# Migrate with validation
./migrate-component.sh --service database --validate src/api/rag-agents

# Rollback a migration
./migrate-component.sh --rollback 20250920_143022 src/api/users
```

### `validate-migration.sh`
Comprehensive migration validation tool with performance benchmarking and integrity testing.

**Usage:**
```bash
./validate-migration.sh [OPTIONS] [COMPONENT_PATH]
```

**Options:**
- `-t, --test TYPE`: Test type: syntax|dependency|performance|integration|all
- `-c, --component DIR`: Component to validate (default: entire project)
- `-r, --report FORMAT`: Report format: json|html|markdown
- `-o, --output DIR`: Output directory for reports
- `--fix`: Attempt to fix common issues automatically
- `--benchmark`: Run performance benchmarks
- `--coverage`: Generate test coverage report
- `--ci`: CI mode - fail fast with appropriate exit codes

**Validation Tests:**
1. **Syntax Validation**
   - TypeScript/JavaScript syntax checking
   - ESLint validation
   - Common code quality issues

2. **Dependency Validation**
   - Remaining Supabase dependencies
   - Abstraction layer adoption
   - Import/export consistency

3. **Performance Validation**
   - Abstraction layer overhead measurement
   - Bundle size impact analysis
   - Memory usage estimation

4. **Integration Validation**
   - Service container instantiation
   - Interface compatibility
   - End-to-end testing

**Examples:**
```bash
# Validate entire project
./validate-migration.sh

# Run only dependency validation
./validate-migration.sh --test dependency

# Performance benchmarks with HTML report
./validate-migration.sh --benchmark --report html

# CI mode with auto-fix
./validate-migration.sh --fix --ci

# Validate specific component
./validate-migration.sh --component supabase/functions/example
```

### Migration Workflow

The complete migration workflow follows this sequence:

```bash
# Step 1: Analyze current state
./analyze-dependencies.sh --format json --output ./migration-reports

# Step 2: Create abstraction layers
./create-abstractions.sh --overwrite

# Step 3: Migrate components progressively
./migrate-component.sh --type edge-function --service database supabase/functions/critical-function
./migrate-component.sh --type frontend --service auth admin-interfaces/main-app

# Step 4: Validate each migration
./validate-migration.sh --component supabase/functions/critical-function --benchmark
./validate-migration.sh --component admin-interfaces/main-app --test integration

# Step 5: Final validation
./validate-migration.sh --test all --report html --ci
```

### Migration Backup and Rollback

All migration operations create automatic backups:

```bash
# List available backups
ls -la migration-backups/

# Rollback a migration using backup ID
./migrate-component.sh --rollback 20250920_143022

# Validate rollback success
./validate-migration.sh --component src/api/users
```

### Backup Scripts

#### `backup-database.sh`
Automated database backup script with multi-tier support, compression, and encryption.

**Usage:**
```bash
./backup-database.sh [tier1|tier2|tier3|tier4] [custom_backup_id]
```

**Backup Tiers:**
- `tier1`: Incremental backups every 4 hours (72h retention)
- `tier2`: Full daily backups (30d retention)
- `tier3`: Weekly archive backups (1y retention)
- `tier4`: Disaster recovery backups (90d retention)

**Features:**
- Automatic compression with gzip
- Optional AES-256 encryption
- Azure Blob Storage upload with appropriate tiers
- Backup validation and integrity checks
- Comprehensive logging and error handling

**Examples:**
```bash
# Create tier1 (incremental) backup
./backup-database.sh tier1

# Create tier2 (full) backup with custom ID
./backup-database.sh tier2 manual-backup-20250920

# Create weekly archive backup
./backup-database.sh tier3
```

#### `validate-backups.sh`
Comprehensive backup validation script that verifies integrity and completeness.

**Usage:**
```bash
./validate-backups.sh [backup_date] [backup_type]
```

**Parameters:**
- `backup_date`: Date in YYYYMMDD format (default: yesterday)
- `backup_type`: database|repository|manifests|all (default: all)

**Validation Checks:**
- File download and size validation
- Compression integrity (for .gz files)
- SQL syntax validation (for database backups)
- Git bundle verification (for repository backups)
- JSON format validation (for manifests)
- Backup completeness checks

**Examples:**
```bash
# Validate all backups from yesterday
./validate-backups.sh

# Validate specific date
./validate-backups.sh 20250920

# Validate only database backups
./validate-backups.sh $(date +%Y%m%d) database
```

### Rollback Scripts

#### `rollback-application.sh`
Blue-green deployment rollback for application code with comprehensive validation.

**Usage:**
```bash
./rollback-application.sh <rollback_version> [current_slot] [target_slot]
```

**Features:**
- Azure App Service slot-based rollback
- Health checks and integration testing
- Automatic slot cleanup
- Comprehensive logging and monitoring

**Example:**
```bash
# Rollback to version 4.1.0
./rollback-application.sh v4.1.0
```

#### `rollback-database.sh`
Database rollback with migration support and safety backups.

**Usage:**
```bash
./rollback-database.sh <rollback_migration> [backup_id]
```

**Features:**
- Migration-based rollback
- Backup-based restoration
- Safety backup creation
- Database integrity validation

**Example:**
```bash
# Rollback to specific migration
./rollback-database.sh 20250920110000

# Restore from specific backup
./rollback-database.sh "" 20250920_140000
```

### Disaster Recovery Scripts

#### `disaster-recovery.sh`
Multi-level disaster recovery automation with escalation support.

**Usage:**
```bash
./disaster-recovery.sh [level1|level2|level3|level4] [recovery_region] [backup_date]
```

**Recovery Levels:**
- `level1`: Service degradation recovery (restart, scale up)
- `level2`: Service outage recovery (deploy to DR environment)
- `level3`: Data center failure recovery (full regional failover)
- `level4`: Complete system recovery (manual intervention required)

**Features:**
- Automated escalation between levels
- Comprehensive validation and health checks
- DNS failover management
- Real-time monitoring and alerting

### Monitoring Scripts

#### `health-check.sh`
Comprehensive system health validation script.

**Usage:**
```bash
./health-check.sh [url] [timeout] [verbose]
```

**Health Checks:**
- Basic application health endpoint
- Critical API endpoints
- Database connectivity
- Azure storage connectivity
- System resources (disk, memory)
- Backup system health
- SSL certificate validity

**Exit Codes:**
- `0`: All checks passed
- `1`: Some checks have warnings
- `2`: Some checks failed

**Examples:**
```bash
# Check localhost
./health-check.sh

# Check production with verbose output
./health-check.sh https://truststream-v4.azurewebsites.net 30 true

# Quick check with custom timeout
./health-check.sh http://localhost:3000 10
```

## Automation Setup

### Cron Jobs

The setup script creates cron job entries in `scripts/crontab-entries.txt`. To activate:

```bash
# Install cron jobs
crontab scripts/crontab-entries.txt

# View active cron jobs
crontab -l

# Edit cron jobs
crontab -e
```

### Automated Schedule

| Task | Schedule | Script |
|------|----------|---------|
| Incremental backup | Every 4 hours | `backup-database.sh tier1` |
| Daily full backup | 2 AM UTC | `backup-database.sh tier2` |
| Weekly archive | Sunday 3 AM | `backup-database.sh tier3` |
| Repository backup | 1 AM UTC | `backup-repository.sh` |
| Backup validation | Every 6 hours | `validate-backups.sh` |
| Health monitoring | Every hour | `health-check.sh` |
| Migration validation | Daily 6 AM | `validate-migration.sh --ci` |

### Migration Integration

For CI/CD pipelines, integrate migration validation:

```yaml
# GitHub Actions / Azure DevOps example
- name: Validate Migration
  run: |
    ./scripts/validate-migration.sh --ci --test all
    
- name: Generate Migration Report  
  run: |
    ./scripts/validate-migration.sh --report html --output ./reports
```

## Configuration

### Environment Variables

Copy `.env.template` to `.env` and configure:

```bash
# Required for all operations
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
AZURE_STORAGE_ACCOUNT=your_storage_account
AZURE_STORAGE_CONNECTION_STRING=your_connection_string

# Required for database operations
SUPABASE_DB_HOST=db.your-project.supabase.co
SUPABASE_DB_USER=postgres
SUPABASE_DB_NAME=postgres

# Optional security features
BACKUP_ENCRYPTION_ENABLED=true
BACKUP_ENCRYPTION_KEY=your_32_character_encryption_key

# Optional monitoring
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email
SMTP_PASS=your_password
MONITORING_WEBHOOK_URL=your_webhook_url
```

### Azure Prerequisites

1. **Storage Account**: Create dedicated storage account for backups
2. **Authentication**: Configure Azure CLI or service principal
3. **Permissions**: Ensure proper RBAC roles assigned
4. **Network**: Configure firewall rules if needed

## Testing

### Unit Tests

```bash
# Run backup system tests
npm test -- tests/backup-tests.js

# Run rollback mechanism tests
npm test -- tests/rollback-tests.js

# Run disaster recovery tests
npm test -- tests/dr-tests.js
```

### Load Testing

```bash
# Test backup system under load
./tests/load-test-backups.sh 3 300

# Test concurrent operations
./tests/stress-test.sh
```

### Security Testing

```bash
# Run security validation
./tests/security-test.sh

# Check for secrets in codebase
./tests/secret-scan.sh
```

## Troubleshooting

### Common Issues

1. **Permission Denied**
   ```bash
   chmod +x scripts/*.sh
   ```

2. **Azure Authentication Failed**
   ```bash
   az login
   az account set --subscription your-subscription-id
   ```

3. **Database Connection Failed**
   - Check network connectivity
   - Verify credentials in .env
   - Check Supabase dashboard for connection limits

4. **Backup Upload Failed**
   - Verify Azure storage account exists
   - Check storage account permissions
   - Ensure sufficient storage quota

### Log Files

All scripts log to standardized locations:

- Backup logs: `/var/log/truststream-backup-YYYYMMDD.log`
- Validation logs: `/var/log/truststream-validation.log`
- Health check logs: `/var/log/truststream-health.log`
- DR logs: `/var/log/truststream-dr-YYYYMMDD_HHMMSS.log`

### Support

For issues and support:

1. Check the comprehensive documentation: `docs/version-control-backup-strategy.md`
2. Review script logs for specific error messages
3. Run health checks to identify system issues
4. Contact system administrators for infrastructure issues

## Security Notes

- All backup files are stored encrypted in Azure Blob Storage
- Scripts use secure credential management via environment variables
- Database connections use SSL/TLS encryption
- Backup validation includes integrity checks
- Access logs are maintained for audit purposes

## Performance Considerations

- Backup operations are optimized for minimal database impact
- Incremental backups reduce storage and transfer requirements
- Compression reduces storage costs by 60-80%
- Parallel operations where possible to reduce total time
- Storage tiering optimizes costs based on access patterns

## Compliance

The backup system supports:

- **SOC 2 Type II**: Comprehensive audit logging
- **GDPR**: Data retention and erasure capabilities
- **ISO 27001**: Security controls and procedures
- **HIPAA**: Encryption and access controls (if applicable)

---

For complete documentation, see: `docs/version-control-backup-strategy.md`
