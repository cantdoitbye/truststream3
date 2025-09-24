#!/bin/bash

# =============================================================================
# TrustStream v4.2 Component Migration Tool
# =============================================================================
# Description: Migrates individual components to use abstraction layers
# Supports progressive component-by-component migration
# =============================================================================

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SRC_DIR="$PROJECT_ROOT/src"
ABSTRACTION_DIR="$SRC_DIR/shared-utils/abstractions"
BACKUP_DIR="$PROJECT_ROOT/migration-backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Help function
show_help() {
    cat << EOF
TrustStream v4.2 Component Migration Tool

Usage: $0 [OPTIONS] COMPONENT_PATH

Options:
    -h, --help          Show this help message
    -t, --type TYPE     Component type: edge-function|frontend|api|all
    -s, --service SVC   Target service: database|auth|storage|realtime|all
    -b, --backup        Create backup before migration (default: true)
    --no-backup         Skip backup creation
    --dry-run           Show what would be migrated without making changes
    --rollback ID       Rollback a previous migration using backup ID
    --validate          Validate migration after completion
    -f, --force         Force migration even if validation fails

Component Types:
    edge-function  - Supabase edge functions
    frontend       - React/Next.js frontend applications
    api            - API route handlers
    all            - Migrate all components

Services:
    database       - Database operations (Supabase -> abstraction)
    auth           - Authentication operations
    storage        - File storage operations
    realtime       - Real-time communication
    all            - All service dependencies

Examples:
    $0 supabase/functions/community-ai-leader-enhanced
    $0 --type frontend --service auth admin-interfaces/ai-dashboard-frontend
    $0 --service database --validate src/api/rag-agents
    $0 --rollback 20250920_143022 src/api/users

EOF
}

# Parse command line arguments
COMPONENT_TYPE="auto"
TARGET_SERVICE="all"
CREATE_BACKUP=true
DRY_RUN=false
ROLLBACK_ID=""
VALIDATE=false
FORCE=false
COMPONENT_PATH=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -t|--type)
            COMPONENT_TYPE="$2"
            shift 2
            ;;
        -s|--service)
            TARGET_SERVICE="$2"
            shift 2
            ;;
        -b|--backup)
            CREATE_BACKUP=true
            shift
            ;;
        --no-backup)
            CREATE_BACKUP=false
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --rollback)
            ROLLBACK_ID="$2"
            shift 2
            ;;
        --validate)
            VALIDATE=true
            shift
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -*)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
        *)
            if [[ -z "$COMPONENT_PATH" ]]; then
                COMPONENT_PATH="$1"
            else
                log_error "Multiple component paths specified"
                exit 1
            fi
            shift
            ;;
    esac
done

# Validate arguments
if [[ -z "$ROLLBACK_ID" && -z "$COMPONENT_PATH" ]]; then
    log_error "Component path is required"
    show_help
    exit 1
fi

# Auto-detect component type
detect_component_type() {
    local path="$1"
    
    if [[ "$path" == *"supabase/functions"* ]]; then
        echo "edge-function"
    elif [[ "$path" == *"admin-interfaces"* ]] || [[ "$path" == *"frontend"* ]]; then
        echo "frontend"
    elif [[ "$path" == *"src/api"* ]]; then
        echo "api"
    else
        echo "unknown"
    fi
}

# Create backup
create_backup() {
    local component_path="$1"
    local backup_id="$TIMESTAMP"
    local backup_path="$BACKUP_DIR/$backup_id"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would create backup: $backup_path"
        return 0
    fi
    
    mkdir -p "$backup_path"
    
    if [[ -d "$component_path" ]]; then
        cp -r "$component_path" "$backup_path/"
    elif [[ -f "$component_path" ]]; then
        cp "$component_path" "$backup_path/"
    else
        log_error "Component path does not exist: $component_path"
        return 1
    fi
    
    # Create backup metadata
    cat > "$backup_path/backup-info.json" << EOF
{
  "backup_id": "$backup_id",
  "timestamp": "$(date -Iseconds)",
  "original_path": "$component_path",
  "component_type": "$COMPONENT_TYPE",
  "target_service": "$TARGET_SERVICE",
  "migration_script_version": "1.0.0"
}
EOF
    
    log_success "Backup created: $backup_path"
    echo "$backup_id"
}

# Rollback migration
rollback_migration() {
    local rollback_id="$1"
    local backup_path="$BACKUP_DIR/$rollback_id"
    
    if [[ ! -d "$backup_path" ]]; then
        log_error "Backup not found: $backup_path"
        return 1
    fi
    
    # Read backup metadata
    if [[ ! -f "$backup_path/backup-info.json" ]]; then
        log_error "Backup metadata not found: $backup_path/backup-info.json"
        return 1
    fi
    
    local original_path=$(jq -r '.original_path' "$backup_path/backup-info.json")
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would rollback to: $original_path"
        return 0
    fi
    
    log_info "Rolling back migration: $rollback_id"
    
    # Remove current version
    if [[ -e "$original_path" ]]; then
        rm -rf "$original_path"
    fi
    
    # Restore from backup
    local backup_content=$(find "$backup_path" -mindepth 1 -maxdepth 1 ! -name "backup-info.json")
    if [[ -n "$backup_content" ]]; then
        cp -r $backup_content "$(dirname "$original_path")/"
    fi
    
    log_success "Rollback completed: $original_path"
}

# Migrate edge function
migrate_edge_function() {
    local func_path="$1"
    local service="$2"
    
    log_info "Migrating edge function: $func_path"
    
    if [[ ! -f "$func_path/index.ts" ]]; then
        log_error "Edge function index.ts not found: $func_path/index.ts"
        return 1
    fi
    
    local index_file="$func_path/index.ts"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would migrate edge function: $index_file"
        return 0
    fi
    
    # Backup original content
    local original_content=$(cat "$index_file")
    
    # Database migration
    if [[ "$service" == "all" || "$service" == "database" ]]; then
        log_info "Migrating database operations..."
        
        # Replace Supabase client imports
        sed -i.bak 's/import { createClient } from .*@supabase\/supabase-js.*/import { SERVICE_TOKENS } from "..\/..\/src\/shared-utils\/abstractions\/container\/ServiceContainer";\
import { IDatabaseService } from "..\/..\/src\/shared-utils\/abstractions\/interfaces\/IDatabase";/' "$index_file"
        
        # Replace client initialization
        sed -i 's/const supabase = createClient.*/\/\/ Database service will be injected/' "$index_file"
        
        # Add service injection at function start
        sed -i '/Deno.serve(async (req) => {/a\
  \/\/ Get database service from container\
  const container = globalThis.serviceContainer;\
  const db = await container.resolve<IDatabaseService>(SERVICE_TOKENS.DATABASE);' "$index_file"
        
        # Replace common Supabase operations
        sed -i 's/supabase\.from(\([^)]*\))\.insert(\([^)]*\))/await db.create(\1, \2)/g' "$index_file"
        sed -i 's/supabase\.from(\([^)]*\))\.select(\([^)]*\))/await db.read(\1, { select: [\2] })/g' "$index_file"
        sed -i 's/supabase\.from(\([^)]*\))\.update(\([^)]*\))\.eq(\([^)]*\))/await db.update(\1, \3, \2)/g' "$index_file"
        
        log_success "Database operations migrated"
    fi
    
    # Authentication migration
    if [[ "$service" == "all" || "$service" == "auth" ]]; then
        log_info "Migrating authentication operations..."
        
        # Add auth service import
        sed -i '/import { SERVICE_TOKENS }/a\
import { IAuthService } from "..\/..\/src\/shared-utils\/abstractions\/interfaces\/IAuth";' "$index_file"
        
        # Add auth service injection
        sed -i '/const db = await container.resolve/a\
  const auth = await container.resolve<IAuthService>(SERVICE_TOKENS.AUTH);' "$index_file"
        
        # Replace auth operations
        sed -i 's/supabase\.auth\.getUser()/await auth.getCurrentUser()/g' "$index_file"
        sed -i 's/supabase\.auth\.signInWithPassword(\([^)]*\))/await auth.signIn(\1)/g' "$index_file"
        
        log_success "Authentication operations migrated"
    fi
    
    # Storage migration
    if [[ "$service" == "all" || "$service" == "storage" ]]; then
        log_info "Migrating storage operations..."
        
        # Add storage service import
        sed -i '/import { IAuthService }/a\
import { IStorageService } from "..\/..\/src\/shared-utils\/abstractions\/interfaces\/IStorage";' "$index_file"
        
        # Add storage service injection
        sed -i '/const auth = await container.resolve/a\
  const storage = await container.resolve<IStorageService>(SERVICE_TOKENS.STORAGE);' "$index_file"
        
        # Replace storage operations
        sed -i 's/supabase\.storage\.from(\([^)]*\))\.upload(\([^)]*\))/await storage.upload(\2)/g' "$index_file"
        sed -i 's/supabase\.storage\.from(\([^)]*\))\.download(\([^)]*\))/await storage.download(\2)/g' "$index_file"
        
        log_success "Storage operations migrated"
    fi
    
    # Clean up temporary files
    rm -f "$index_file.bak"
    
    log_success "Edge function migration completed: $func_path"
}

# Migrate frontend component
migrate_frontend() {
    local frontend_path="$1"
    local service="$2"
    
    log_info "Migrating frontend component: $frontend_path"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would migrate frontend: $frontend_path"
        return 0
    fi
    
    # Find TypeScript/JavaScript files
    local files=$(find "$frontend_path" -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | grep -v node_modules || true)
    
    if [[ -z "$files" ]]; then
        log_warning "No source files found in: $frontend_path"
        return 0
    fi
    
    while IFS= read -r file; do
        log_info "Processing file: $file"
        
        # Database migration
        if [[ "$service" == "all" || "$service" == "database" ]]; then
            # Replace Supabase imports
            sed -i.bak 's/import { createClient } from .*@supabase\/supabase-js.*/import { useDatabase } from "..\/..\/hooks\/useAbstractions";/' "$file"
            
            # Replace Supabase client usage
            sed -i 's/const supabase = createClient.*/const { db } = useDatabase();/' "$file"
            sed -i 's/supabase\.from(\([^)]*\))\.select()/db.read(\1)/g' "$file"
            sed -i 's/supabase\.from(\([^)]*\))\.insert(\([^)]*\))/db.create(\1, \2)/g' "$file"
        fi
        
        # Authentication migration
        if [[ "$service" == "all" || "$service" == "auth" ]]; then
            # Replace auth imports and usage
            sed -i 's/supabase\.auth\.getUser()/useAuth().getCurrentUser()/g' "$file"
            sed -i 's/supabase\.auth\.signInWithPassword/useAuth().signIn/g' "$file"
        fi
        
        # Clean up
        rm -f "$file.bak"
        
    done <<< "$files"
    
    # Create React hooks for abstractions if they don't exist
    local hooks_dir="$frontend_path/hooks"
    if [[ ! -d "$hooks_dir" ]]; then
        mkdir -p "$hooks_dir"
    fi
    
    if [[ ! -f "$hooks_dir/useAbstractions.ts" ]]; then
        cat > "$hooks_dir/useAbstractions.ts" << 'EOF'
import { useContext } from 'react';
import { ServiceContext } from '../contexts/ServiceContext';
import { IDatabaseService } from '../../../src/shared-utils/abstractions/interfaces/IDatabase';
import { IAuthService } from '../../../src/shared-utils/abstractions/interfaces/IAuth';
import { IStorageService } from '../../../src/shared-utils/abstractions/interfaces/IStorage';

export function useDatabase() {
  const { container } = useContext(ServiceContext);
  
  const db = container.resolve<IDatabaseService>('database');
  
  return { db };
}

export function useAuth() {
  const { container } = useContext(ServiceContext);
  
  const auth = container.resolve<IAuthService>('auth');
  
  return auth;
}

export function useStorage() {
  const { container } = useContext(ServiceContext);
  
  const storage = container.resolve<IStorageService>('storage');
  
  return { storage };
}
EOF
        log_success "Created React hooks: $hooks_dir/useAbstractions.ts"
    fi
    
    log_success "Frontend migration completed: $frontend_path"
}

# Migrate API component
migrate_api() {
    local api_path="$1"
    local service="$2"
    
    log_info "Migrating API component: $api_path"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would migrate API: $api_path"
        return 0
    fi
    
    # Similar to edge function migration but for API routes
    local files=$(find "$api_path" -name "*.ts" -o -name "*.js" | grep -v node_modules || true)
    
    while IFS= read -r file; do
        log_info "Processing API file: $file"
        
        # Add service container imports
        sed -i.bak '1i\
import { getServiceContainer } from "..\/..\/shared-utils\/abstractions\/container\/ServiceContainer";\
import { SERVICE_TOKENS } from "..\/..\/shared-utils\/abstractions\/container\/ServiceContainer";' "$file"
        
        # Replace database operations
        if [[ "$service" == "all" || "$service" == "database" ]]; then
            sed -i 's/const supabase = createClient.*/const container = await getServiceContainer();\
const db = await container.resolve(SERVICE_TOKENS.DATABASE);/' "$file"
        fi
        
        rm -f "$file.bak"
        
    done <<< "$files"
    
    log_success "API migration completed: $api_path"
}

# Validate migration
validate_migration() {
    local component_path="$1"
    
    log_info "Validating migration: $component_path"
    
    local validation_errors=0
    
    # Check for remaining Supabase imports
    local remaining_imports=$(grep -r "from.*@supabase" "$component_path" 2>/dev/null | wc -l || echo "0")
    if [[ $remaining_imports -gt 0 ]]; then
        log_warning "Found $remaining_imports remaining Supabase imports"
        validation_errors=$((validation_errors + 1))
    fi
    
    # Check for direct Supabase client usage
    local direct_usage=$(grep -r "supabase\." "$component_path" 2>/dev/null | wc -l || echo "0")
    if [[ $direct_usage -gt 0 ]]; then
        log_warning "Found $direct_usage instances of direct Supabase usage"
        validation_errors=$((validation_errors + 1))
    fi
    
    # Check for abstraction imports
    local abstraction_imports=$(grep -r "from.*abstractions" "$component_path" 2>/dev/null | wc -l || echo "0")
    if [[ $abstraction_imports -eq 0 ]]; then
        log_warning "No abstraction layer imports found"
        validation_errors=$((validation_errors + 1))
    fi
    
    if [[ $validation_errors -eq 0 ]]; then
        log_success "Migration validation passed"
        return 0
    else
        log_error "Migration validation failed with $validation_errors errors"
        return 1
    fi
}

# Main migration function
main() {
    log_info "Starting TrustStream v4.2 Component Migration"
    
    # Handle rollback
    if [[ -n "$ROLLBACK_ID" ]]; then
        rollback_migration "$ROLLBACK_ID"
        exit $?
    fi
    
    # Validate component path
    if [[ ! -e "$PROJECT_ROOT/$COMPONENT_PATH" ]]; then
        log_error "Component path does not exist: $PROJECT_ROOT/$COMPONENT_PATH"
        exit 1
    fi
    
    local full_component_path="$PROJECT_ROOT/$COMPONENT_PATH"
    
    # Auto-detect component type if not specified
    if [[ "$COMPONENT_TYPE" == "auto" ]]; then
        COMPONENT_TYPE=$(detect_component_type "$COMPONENT_PATH")
        log_info "Auto-detected component type: $COMPONENT_TYPE"
    fi
    
    # Create backup
    local backup_id=""
    if [[ "$CREATE_BACKUP" == "true" ]]; then
        backup_id=$(create_backup "$full_component_path")
        log_info "Backup ID: $backup_id"
    fi
    
    # Perform migration based on component type
    case "$COMPONENT_TYPE" in
        "edge-function")
            migrate_edge_function "$full_component_path" "$TARGET_SERVICE"
            ;;
        "frontend")
            migrate_frontend "$full_component_path" "$TARGET_SERVICE"
            ;;
        "api")
            migrate_api "$full_component_path" "$TARGET_SERVICE"
            ;;
        "all")
            log_info "Migrating all component types in: $full_component_path"
            # Find and migrate all components
            find "$full_component_path" -type d -name "functions" -exec migrate_edge_function {} "$TARGET_SERVICE" \;
            find "$full_component_path" -type d -name "admin-interfaces" -exec migrate_frontend {} "$TARGET_SERVICE" \;
            find "$full_component_path" -type d -name "api" -exec migrate_api {} "$TARGET_SERVICE" \;
            ;;
        *)
            log_error "Unsupported component type: $COMPONENT_TYPE"
            exit 1
            ;;
    esac
    
    # Validate migration if requested
    if [[ "$VALIDATE" == "true" ]]; then
        if ! validate_migration "$full_component_path"; then
            if [[ "$FORCE" != "true" ]]; then
                log_error "Migration validation failed. Use --force to proceed anyway."
                if [[ -n "$backup_id" ]]; then
                    log_info "To rollback: $0 --rollback $backup_id"
                fi
                exit 1
            else
                log_warning "Migration validation failed but continuing due to --force"
            fi
        fi
    fi
    
    log_success "Component migration completed successfully"
    
    if [[ -n "$backup_id" ]]; then
        log_info "To rollback this migration: $0 --rollback $backup_id"
    fi
    
    log_info "Next steps:"
    log_info "1. Test the migrated component"
    log_info "2. Run 'validate-migration.sh' for comprehensive validation"
    log_info "3. Update any remaining direct dependencies manually"
}

# Check prerequisites
if [[ ! -d "$ABSTRACTION_DIR" ]]; then
    log_error "Abstraction layers not found. Run 'create-abstractions.sh' first."
    exit 1
fi

if ! command -v jq &> /dev/null; then
    log_error "jq is required but not installed. Please install jq first."
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Run main function
main "$@"
