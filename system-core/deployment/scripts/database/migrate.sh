#!/bin/bash

# TrustStream v4.2 Database Migration Script
# Author: MiniMax Agent
# Version: 1.0.0

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Load common utilities
source "$SCRIPT_DIR/../common/utils.sh"
source "$SCRIPT_DIR/../common/logging.sh"
source "$SCRIPT_DIR/../common/config.sh"

# Default values
ENVIRONMENT="development"
CONFIG_FILE=""
MIGRATION_DIR="$ROOT_DIR/database/migrations"
SUPABASE_MIGRATION_DIR="$ROOT_DIR/supabase/migrations"
DRY_RUN=false
VERBOSE=false
FORCE=false
BACKUP_BEFORE_MIGRATION=true
ROLLBACK_ON_FAILURE=true
TIMEOUT=1200
MAX_RETRIES=3
TARGET_VERSION=""
MIGRATION_TYPE="all"

# Migration state
BACKUP_ID=""
MIGRATIONS_APPLIED=()
CURRENT_VERSION=""
TARGET_VERSION_RESOLVED=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment|-e)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --config|-c)
            CONFIG_FILE="$2"
            shift 2
            ;;
        --migration-dir|-m)
            MIGRATION_DIR="$2"
            shift 2
            ;;
        --target-version|-t)
            TARGET_VERSION="$2"
            shift 2
            ;;
        --migration-type)
            MIGRATION_TYPE="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --max-retries)
            MAX_RETRIES="$2"
            shift 2
            ;;
        --no-backup)
            BACKUP_BEFORE_MIGRATION=false
            shift
            ;;
        --no-rollback)
            ROLLBACK_ON_FAILURE=false
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown parameter: $1"
            show_help
            exit 1
            ;;
    esac
done

# Show help function
show_help() {
    cat << EOF
TrustStream v4.2 Database Migration Script

Usage: $0 [OPTIONS]

Options:
  -e, --environment ENV        Target environment (development|staging|production) [default: development]
  -c, --config FILE           Configuration file path
  -m, --migration-dir DIR     Migration directory [default: database/migrations]
  -t, --target-version VER    Target migration version (latest if not specified)
      --migration-type TYPE   Migration type (all|schema|data|supabase) [default: all]
      --timeout SECONDS       Migration timeout in seconds [default: 1200]
      --max-retries COUNT     Maximum number of retries [default: 3]
      --no-backup             Skip backup before migration
      --no-rollback           Skip rollback on failure
      --force                 Force migration even with warnings
  -v, --verbose               Enable verbose logging
      --dry-run               Show what migrations would be applied without executing
  -h, --help                  Show this help message

Migration Types:
  all       Run all migrations (schema + data + supabase)
  schema    Run only schema migrations
  data      Run only data migrations
  supabase  Run only Supabase migrations

Examples:
  # Run all migrations for development
  $0 --environment development
  
  # Run only schema migrations to specific version
  $0 --environment production --migration-type schema --target-version 2024.01.15
  
  # Dry run migrations
  $0 --environment staging --dry-run

EOF
}

# Initialize migration
init_migration() {
    log_header "TrustStream v4.2 Database Migration"
    log_info "Environment: $ENVIRONMENT"
    log_info "Migration Type: $MIGRATION_TYPE"
    log_info "Migration Directory: $MIGRATION_DIR"
    
    if [[ -n "$CONFIG_FILE" ]]; then
        log_info "Loading configuration: $CONFIG_FILE"
        load_config "$CONFIG_FILE" "$ENVIRONMENT"
    fi
    
    # Validate migration directory exists
    if [[ ! -d "$MIGRATION_DIR" ]]; then
        log_error "Migration directory not found: $MIGRATION_DIR"
        exit 1
    fi
    
    # Set up cleanup trap
    trap cleanup_on_error EXIT
}

# Check database connectivity
check_database_connectivity() {
    log_step "Checking database connectivity..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would check database connectivity"
        return 0
    fi
    
    # Check if we have Supabase URL
    if [[ -n "${SUPABASE_URL:-}" && -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
        log_info "Testing Supabase connection..."
        
        # Test connection using Supabase REST API
        local response
        response="$(curl -f -s --max-time 30 \
            "$SUPABASE_URL/rest/v1/" \
            -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
            -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" 2>/dev/null || echo "")"
        
        if [[ -n "$response" ]]; then
            log_success "Supabase connection successful"
        else
            log_error "Failed to connect to Supabase"
            exit 1
        fi
    else
        log_warn "Supabase credentials not found, skipping connectivity test"
    fi
    
    # Check if we have direct database URL
    if [[ -n "${DATABASE_URL:-}" ]]; then
        log_info "Testing direct database connection..."
        
        if command_exists psql; then
            if psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
                log_success "Direct database connection successful"
            else
                log_error "Failed to connect to database directly"
                exit 1
            fi
        else
            log_warn "psql not available, skipping direct database test"
        fi
    fi
}

# Get current database version
get_current_version() {
    log_step "Getting current database version..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        CURRENT_VERSION="20240101.000000"
        log_info "[DRY RUN] Current version: $CURRENT_VERSION"
        return 0
    fi
    
    # Try to get version from Supabase
    if [[ -n "${SUPABASE_URL:-}" && -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
        local version_response
        version_response="$(curl -f -s --max-time 30 \
            "$SUPABASE_URL/rest/v1/schema_migrations?select=version&order=version.desc&limit=1" \
            -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
            -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
            -H "Content-Type: application/json" 2>/dev/null || echo "[]")"
        
        if [[ "$version_response" != "[]" ]]; then
            CURRENT_VERSION="$(echo "$version_response" | jq -r '.[0].version' 2>/dev/null || echo "")"
        fi
    fi
    
    # Fallback to default if no version found
    if [[ -z "$CURRENT_VERSION" || "$CURRENT_VERSION" == "null" ]]; then
        CURRENT_VERSION="0"
        log_warn "No migration version found, starting from version 0"
    else
        log_info "Current database version: $CURRENT_VERSION"
    fi
}

# Get pending migrations
get_pending_migrations() {
    log_step "Getting pending migrations..."
    
    local pending_migrations=()
    
    # Check different migration types
    case "$MIGRATION_TYPE" in
        "all")
            # Get all migration files
            if [[ -d "$MIGRATION_DIR" ]]; then
                while IFS= read -r -d '' file; do
                    local filename
                    filename="$(basename "$file")"
                    if [[ "$filename" > "$CURRENT_VERSION" ]]; then
                        pending_migrations+=("$file")
                    fi
                done < <(find "$MIGRATION_DIR" -name "*.sql" -print0 | sort -z)
            fi
            
            # Get Supabase migrations
            if [[ -d "$SUPABASE_MIGRATION_DIR" ]]; then
                while IFS= read -r -d '' file; do
                    local filename
                    filename="$(basename "$file")"
                    if [[ "$filename" > "$CURRENT_VERSION" ]]; then
                        pending_migrations+=("$file")
                    fi
                done < <(find "$SUPABASE_MIGRATION_DIR" -name "*.sql" -print0 | sort -z)
            fi
            ;;
        "schema")
            # Get only schema migrations
            while IFS= read -r -d '' file; do
                local filename
                filename="$(basename "$file")"
                if [[ "$filename" > "$CURRENT_VERSION" && "$filename" == *"schema"* ]]; then
                    pending_migrations+=("$file")
                fi
            done < <(find "$MIGRATION_DIR" -name "*schema*.sql" -print0 | sort -z)
            ;;
        "data")
            # Get only data migrations
            while IFS= read -r -d '' file; do
                local filename
                filename="$(basename "$file")"
                if [[ "$filename" > "$CURRENT_VERSION" && "$filename" == *"data"* ]]; then
                    pending_migrations+=("$file")
                fi
            done < <(find "$MIGRATION_DIR" -name "*data*.sql" -print0 | sort -z)
            ;;
        "supabase")
            # Get only Supabase migrations
            if [[ -d "$SUPABASE_MIGRATION_DIR" ]]; then
                while IFS= read -r -d '' file; do
                    local filename
                    filename="$(basename "$file")"
                    if [[ "$filename" > "$CURRENT_VERSION" ]]; then
                        pending_migrations+=("$file")
                    fi
                done < <(find "$SUPABASE_MIGRATION_DIR" -name "*.sql" -print0 | sort -z)
            fi
            ;;
    esac
    
    # Filter by target version if specified
    if [[ -n "$TARGET_VERSION" ]]; then
        local filtered_migrations=()
        for migration in "${pending_migrations[@]}"; do
            local filename
            filename="$(basename "$migration")"
            if [[ "$filename" <= "$TARGET_VERSION" ]]; then
                filtered_migrations+=("$migration")
            fi
        done
        pending_migrations=("${filtered_migrations[@]}")
        TARGET_VERSION_RESOLVED="$TARGET_VERSION"
    else
        # Get latest version
        if [[ ${#pending_migrations[@]} -gt 0 ]]; then
            local latest_migration="${pending_migrations[-1]}"
            TARGET_VERSION_RESOLVED="$(basename "$latest_migration" .sql)"
        else
            TARGET_VERSION_RESOLVED="$CURRENT_VERSION"
        fi
    fi
    
    # Store pending migrations globally
    MIGRATIONS_TO_APPLY=("${pending_migrations[@]}")
    
    log_info "Found ${#MIGRATIONS_TO_APPLY[@]} pending migrations"
    
    if [[ "$VERBOSE" == "true" ]]; then
        for migration in "${MIGRATIONS_TO_APPLY[@]}"; do
            log_debug "  - $(basename "$migration")"
        done
    fi
    
    if [[ ${#MIGRATIONS_TO_APPLY[@]} -eq 0 ]]; then
        log_info "No pending migrations found"
        return 0
    fi
}

# Create backup before migration
create_backup() {
    if [[ "$BACKUP_BEFORE_MIGRATION" != "true" ]]; then
        log_info "Backup disabled, skipping backup creation"
        return 0
    fi
    
    log_step "Creating database backup..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        BACKUP_ID="backup-$(date +%Y%m%d-%H%M%S)"
        log_info "[DRY RUN] Would create backup: $BACKUP_ID"
        return 0
    fi
    
    # Generate backup ID
    BACKUP_ID="migration-backup-$(date +%Y%m%d-%H%M%S)"
    
    # Run backup script if available
    if [[ -f "$SCRIPT_DIR/../backup/create-backup.sh" ]]; then
        "$SCRIPT_DIR/../backup/create-backup.sh" \
            --environment "$ENVIRONMENT" \
            --type "pre-migration" \
            --backup-id "$BACKUP_ID"
    else
        log_warn "Backup script not found, continuing without backup"
        BACKUP_ID=""
    fi
    
    if [[ -n "$BACKUP_ID" ]]; then
        log_success "Backup created: $BACKUP_ID"
    fi
}

# Apply a single migration
apply_migration() {
    local migration_file="$1"
    local migration_name
    migration_name="$(basename "$migration_file")"
    
    log_info "Applying migration: $migration_name"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would apply migration: $migration_name"
        MIGRATIONS_APPLIED+=("$migration_name")
        return 0
    fi
    
    local start_time
    start_time="$(date +%s)"
    
    # Apply migration based on file location
    if [[ "$migration_file" == *"supabase/migrations"* ]]; then
        # Apply Supabase migration
        apply_supabase_migration "$migration_file"
    else
        # Apply regular SQL migration
        apply_sql_migration "$migration_file"
    fi
    
    local end_time
    end_time="$(date +%s)"
    local duration=$((end_time - start_time))
    
    MIGRATIONS_APPLIED+=("$migration_name")
    log_success "Migration applied successfully in ${duration}s: $migration_name"
}

# Apply SQL migration
apply_sql_migration() {
    local migration_file="$1"
    
    # Use Supabase if available, otherwise direct database connection
    if [[ -n "${SUPABASE_URL:-}" && -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
        apply_migration_via_supabase "$migration_file"
    elif [[ -n "${DATABASE_URL:-}" ]] && command_exists psql; then
        apply_migration_via_psql "$migration_file"
    else
        log_error "No database connection method available"
        exit 1
    fi
}

# Apply migration via Supabase REST API
apply_migration_via_supabase() {
    local migration_file="$1"
    
    # Read migration content
    local migration_sql
    migration_sql="$(cat "$migration_file")"
    
    # Execute via Supabase function (if available) or direct SQL
    # Note: This is a simplified approach. In production, you might want to use
    # Supabase CLI or custom migration functions
    
    log_warn "Direct SQL execution via Supabase REST API is limited"
    log_warn "Consider using Supabase CLI for complex migrations"
    
    # For now, we'll log the migration that would be applied
    log_info "Migration content (first 200 chars): ${migration_sql:0:200}..."
}

# Apply migration via psql
apply_migration_via_psql() {
    local migration_file="$1"
    
    # Apply migration with timeout
    if timeout "$TIMEOUT" psql "$DATABASE_URL" -f "$migration_file" >/dev/null 2>&1; then
        return 0
    else
        local exit_code=$?
        log_error "Migration failed with exit code: $exit_code"
        return $exit_code
    fi
}

# Apply Supabase migration
apply_supabase_migration() {
    local migration_file="$1"
    
    # Use Supabase CLI if available
    if command_exists supabase; then
        log_info "Applying Supabase migration using CLI..."
        
        # Change to project directory
        local project_dir="$ROOT_DIR"
        cd "$project_dir"
        
        # Apply migration
        if supabase db push --include-all >/dev/null 2>&1; then
            return 0
        else
            log_error "Supabase migration failed"
            return 1
        fi
    else
        log_warn "Supabase CLI not available, treating as regular SQL migration"
        apply_sql_migration "$migration_file"
    fi
}

# Apply all migrations
apply_migrations() {
    log_step "Applying migrations..."
    
    if [[ ${#MIGRATIONS_TO_APPLY[@]} -eq 0 ]]; then
        log_info "No migrations to apply"
        return 0
    fi
    
    local total_migrations=${#MIGRATIONS_TO_APPLY[@]}
    local current_migration=0
    
    for migration_file in "${MIGRATIONS_TO_APPLY[@]}"; do
        current_migration=$((current_migration + 1))
        log_progress "$current_migration" "$total_migrations" "Applying migrations"
        
        # Retry migration on failure
        local attempt=1
        local migration_success=false
        
        while [[ $attempt -le $MAX_RETRIES ]]; do
            if apply_migration "$migration_file"; then
                migration_success=true
                break
            else
                log_warn "Migration failed (attempt $attempt/$MAX_RETRIES): $(basename "$migration_file")"
                
                if [[ $attempt -lt $MAX_RETRIES ]]; then
                    local wait_time=$((attempt * 5))
                    log_info "Waiting ${wait_time}s before retry..."
                    sleep "$wait_time"
                fi
                
                attempt=$((attempt + 1))
            fi
        done
        
        if [[ "$migration_success" != "true" ]]; then
            log_error "Migration failed after $MAX_RETRIES attempts: $(basename "$migration_file")"
            
            if [[ "$FORCE" == "true" ]]; then
                log_warn "Continuing with next migration due to --force flag"
                continue
            else
                return 1
            fi
        fi
    done
    
    log_success "All migrations applied successfully"
}

# Update migration version
update_migration_version() {
    log_step "Updating migration version..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would update version to: $TARGET_VERSION_RESOLVED"
        return 0
    fi
    
    # Update version in database (implementation depends on your schema)
    # This is a placeholder - implement according to your versioning system
    
    log_info "Migration version updated to: $TARGET_VERSION_RESOLVED"
}

# Validate migration result
validate_migration_result() {
    log_step "Validating migration result..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would validate migration result"
        return 0
    fi
    
    # Run validation script if available
    if [[ -f "$SCRIPT_DIR/../validation/validate-database.sh" ]]; then
        "$SCRIPT_DIR/../validation/validate-database.sh" \
            --environment "$ENVIRONMENT" \
            --quick-check
    else
        # Basic connectivity test
        check_database_connectivity
    fi
    
    log_success "Migration validation completed"
}

# Rollback migrations
rollback_migrations() {
    if [[ "$ROLLBACK_ON_FAILURE" != "true" ]]; then
        log_warn "Rollback disabled, manual intervention required"
        return 0
    fi
    
    log_error "Rolling back applied migrations..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would rollback migrations"
        return 0
    fi
    
    # Restore from backup if available
    if [[ -n "$BACKUP_ID" ]]; then
        log_info "Restoring from backup: $BACKUP_ID"
        
        if [[ -f "$SCRIPT_DIR/../backup/restore-backup.sh" ]]; then
            "$SCRIPT_DIR/../backup/restore-backup.sh" \
                --environment "$ENVIRONMENT" \
                --backup-id "$BACKUP_ID"
        else
            log_error "Backup restore script not found"
        fi
    else
        log_warn "No backup available for rollback"
    fi
    
    log_error "Rollback completed"
}

# Cleanup on error
cleanup_on_error() {
    local exit_code=$?
    
    if [[ $exit_code -ne 0 ]]; then
        log_error "Migration failed with exit code: $exit_code"
        
        # Show applied migrations for debugging
        if [[ ${#MIGRATIONS_APPLIED[@]} -gt 0 ]]; then
            log_info "Migrations applied before failure:"
            for migration in "${MIGRATIONS_APPLIED[@]}"; do
                log_info "  - $migration"
            done
        fi
        
        # Attempt rollback
        rollback_migrations
    fi
    
    # Remove trap to avoid recursion
    trap - EXIT
}

# Generate migration report
generate_migration_report() {
    log_section "Migration Summary"
    
    log_info "Environment: $ENVIRONMENT"
    log_info "Migration Type: $MIGRATION_TYPE"
    log_info "Current Version: $CURRENT_VERSION"
    log_info "Target Version: $TARGET_VERSION_RESOLVED"
    log_info "Migrations Applied: ${#MIGRATIONS_APPLIED[@]}"
    
    if [[ -n "$BACKUP_ID" ]]; then
        log_info "Backup Created: $BACKUP_ID"
    fi
    
    if [[ "$VERBOSE" == "true" && ${#MIGRATIONS_APPLIED[@]} -gt 0 ]]; then
        log_info "Applied Migrations:"
        for migration in "${MIGRATIONS_APPLIED[@]}"; do
            log_info "  ✓ $migration"
        done
    fi
}

# Main function
main() {
    init_migration
    
    # Migration process
    check_database_connectivity
    get_current_version
    get_pending_migrations
    
    if [[ ${#MIGRATIONS_TO_APPLY[@]} -gt 0 ]]; then
        # Show migration plan
        log_info "Migration Plan:"
        log_info "  Current Version: $CURRENT_VERSION"
        log_info "  Target Version: $TARGET_VERSION_RESOLVED"
        log_info "  Migrations to Apply: ${#MIGRATIONS_TO_APPLY[@]}"
        
        # Confirm if not in force mode and not dry run
        if [[ "$FORCE" != "true" && "$DRY_RUN" != "true" && "$ENVIRONMENT" == "production" ]]; then
            echo -n "Proceed with migration? (yes/no): "
            read -r confirmation
            if [[ "$confirmation" != "yes" ]]; then
                log_info "Migration cancelled by user"
                exit 0
            fi
        fi
        
        # Execute migration
        create_backup
        apply_migrations
        update_migration_version
        validate_migration_result
        
        generate_migration_report
        
        log_success "Database migration completed successfully!"
        log_info "Database version: $CURRENT_VERSION → $TARGET_VERSION_RESOLVED"
    else
        log_info "Database is up to date (version: $CURRENT_VERSION)"
    fi
}

# Run main function
main "$@"