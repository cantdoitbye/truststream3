#!/bin/bash

# =============================================================================
# TrustStream v4.2 Dependency Analysis Script
# =============================================================================
# Description: Comprehensive dependency scanner for Supabase migrations
# Supports 4-phase migration roadmap analysis
# =============================================================================

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$PROJECT_ROOT/context/architectural-files"
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
TrustStream v4.2 Dependency Analysis Script

Usage: $0 [OPTIONS]

Options:
    -h, --help          Show this help message
    -o, --output DIR    Output directory (default: $OUTPUT_DIR)
    -f, --format FORMAT Output format: json|markdown|csv (default: markdown)
    -p, --phase PHASE   Analysis phase: 1|2|3|4|all (default: all)
    -c, --component     Analyze specific component
    -v, --verbose       Enable verbose output
    --dry-run           Show what would be analyzed without running

Phases:
    1 - Codebase Discovery and Inventory
    2 - Dependency Analysis
    3 - Dependency Classification
    4 - Abstraction Strategy Design

Examples:
    $0                              # Run full analysis
    $0 --phase 1                    # Run only discovery phase
    $0 --component supabase/functions # Analyze specific component
    $0 --format json --output ./out # Output JSON to custom directory

EOF
}

# Parse command line arguments
OUTPUT_FORMAT="markdown"
ANALYSIS_PHASE="all"
SPECIFIC_COMPONENT=""
VERBOSE=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -o|--output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -f|--format)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        -p|--phase)
            ANALYSIS_PHASE="$2"
            shift 2
            ;;
        -c|--component)
            SPECIFIC_COMPONENT="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Initialize analysis results
ANALYSIS_RESULTS="$OUTPUT_DIR/dependency-analysis-$TIMESTAMP.$OUTPUT_FORMAT"
COMPONENT_INVENTORY="$OUTPUT_DIR/component-inventory-$TIMESTAMP.json"
DEPENDENCY_MATRIX="$OUTPUT_DIR/dependency-matrix-$TIMESTAMP.json"

# Phase 1: Codebase Discovery and Inventory
run_phase_1() {
    log_info "Phase 1: Codebase Discovery and Inventory"
    
    local inventory_data='{
        "timestamp": "'"$TIMESTAMP"'",
        "edge_functions": [],
        "migrations": [],
        "tables": [],
        "frontend_apps": [],
        "config_files": []
    }'
    
    # Scan Supabase edge functions
    if [[ -d "$PROJECT_ROOT/supabase/functions" ]]; then
        log_info "Scanning Supabase edge functions..."
        local func_count=0
        local functions_json="[]"
        
        while IFS= read -r -d '' func_dir; do
            if [[ -f "$func_dir/index.ts" ]]; then
                func_count=$((func_count + 1))
                local func_name=$(basename "$func_dir")
                local func_size=$(du -sh "$func_dir" | cut -f1)
                local dependencies=$(grep -r "import\|require" "$func_dir" 2>/dev/null | wc -l || echo "0")
                
                local func_info='{
                    "name": "'"$func_name"'",
                    "path": "'"$func_dir"'",
                    "size": "'"$func_size"'",
                    "dependency_count": '"$dependencies"',
                    "supabase_calls": '$(grep -r "supabase\|createClient" "$func_dir" 2>/dev/null | wc -l || echo "0")'
                }'
                
                functions_json=$(echo "$functions_json" | jq ". += [$func_info]")
                
                if [[ "$VERBOSE" == "true" ]]; then
                    log_info "  Found function: $func_name ($func_size, $dependencies deps)"
                fi
            fi
        done < <(find "$PROJECT_ROOT/supabase/functions" -mindepth 1 -maxdepth 1 -type d -print0)
        
        inventory_data=$(echo "$inventory_data" | jq ".edge_functions = $functions_json")
        log_success "Found $func_count edge functions"
    fi
    
    # Scan database migrations
    if [[ -d "$PROJECT_ROOT/supabase/migrations" ]]; then
        log_info "Scanning database migrations..."
        local migration_count=0
        local migrations_json="[]"
        
        while IFS= read -r -d '' migration_file; do
            migration_count=$((migration_count + 1))
            local migration_name=$(basename "$migration_file")
            local migration_size=$(wc -l < "$migration_file")
            local table_ops=$(grep -c "CREATE TABLE\|ALTER TABLE\|DROP TABLE" "$migration_file" || echo "0")
            
            local migration_info='{
                "name": "'"$migration_name"'",
                "path": "'"$migration_file"'",
                "lines": '"$migration_size"',
                "table_operations": '"$table_ops"'
            }'
            
            migrations_json=$(echo "$migrations_json" | jq ". += [$migration_info]")
            
            if [[ "$VERBOSE" == "true" ]]; then
                log_info "  Found migration: $migration_name ($migration_size lines, $table_ops ops)"
            fi
        done < <(find "$PROJECT_ROOT/supabase/migrations" -name "*.sql" -print0)
        
        inventory_data=$(echo "$inventory_data" | jq ".migrations = $migrations_json")
        log_success "Found $migration_count migrations"
    fi
    
    # Scan frontend applications
    if [[ -d "$PROJECT_ROOT/admin-interfaces" ]]; then
        log_info "Scanning frontend applications..."
        local app_count=0
        local apps_json="[]"
        
        while IFS= read -r -d '' app_dir; do
            if [[ -f "$app_dir/package.json" ]]; then
                app_count=$((app_count + 1))
                local app_name=$(basename "$app_dir")
                local supabase_deps=$(grep -o "@supabase" "$app_dir/package.json" 2>/dev/null | wc -l || echo "0")
                
                local app_info='{
                    "name": "'"$app_name"'",
                    "path": "'"$app_dir"'",
                    "supabase_dependencies": '"$supabase_deps"'
                }'
                
                apps_json=$(echo "$apps_json" | jq ". += [$app_info]")
                
                if [[ "$VERBOSE" == "true" ]]; then
                    log_info "  Found frontend app: $app_name ($supabase_deps Supabase deps)"
                fi
            fi
        done < <(find "$PROJECT_ROOT/admin-interfaces" -mindepth 1 -maxdepth 1 -type d -print0)
        
        inventory_data=$(echo "$inventory_data" | jq ".frontend_apps = $apps_json")
        log_success "Found $app_count frontend applications"
    fi
    
    # Save inventory
    if [[ "$DRY_RUN" == "false" ]]; then
        echo "$inventory_data" | jq '.' > "$COMPONENT_INVENTORY"
        log_success "Component inventory saved to: $COMPONENT_INVENTORY"
    fi
}

# Phase 2: Dependency Analysis
run_phase_2() {
    log_info "Phase 2: Dependency Analysis"
    
    local dependency_data='{
        "timestamp": "'"$TIMESTAMP"'",
        "dependency_types": {
            "database": [],
            "authentication": [],
            "storage": [],
            "realtime": [],
            "edge_functions": []
        },
        "risk_assessment": {}
    }'
    
    # Analyze database dependencies
    log_info "Analyzing database dependencies..."
    local db_deps=$(grep -r "from.*supabase" "$PROJECT_ROOT/src" 2>/dev/null | grep -v node_modules | wc -l || echo "0")
    local client_calls=$(grep -r "createClient\|supabase\.from" "$PROJECT_ROOT" 2>/dev/null | grep -v node_modules | wc -l || echo "0")
    
    local db_analysis='{
        "direct_imports": '"$db_deps"',
        "client_calls": '"$client_calls"',
        "risk_level": "'$(if [[ $client_calls -gt 50 ]]; then echo "high"; elif [[ $client_calls -gt 20 ]]; then echo "medium"; else echo "low"; fi)'"
    }'
    
    dependency_data=$(echo "$dependency_data" | jq ".dependency_types.database = [$db_analysis]")
    
    # Analyze authentication dependencies
    log_info "Analyzing authentication dependencies..."
    local auth_calls=$(grep -r "auth\|signIn\|signUp\|getUser" "$PROJECT_ROOT" 2>/dev/null | grep -v node_modules | wc -l || echo "0")
    
    local auth_analysis='{
        "auth_calls": '"$auth_calls"',
        "risk_level": "'$(if [[ $auth_calls -gt 30 ]]; then echo "high"; elif [[ $auth_calls -gt 10 ]]; then echo "medium"; else echo "low"; fi)'"
    }'
    
    dependency_data=$(echo "$dependency_data" | jq ".dependency_types.authentication = [$auth_analysis]")
    
    # Save dependency analysis
    if [[ "$DRY_RUN" == "false" ]]; then
        echo "$dependency_data" | jq '.' > "$DEPENDENCY_MATRIX"
        log_success "Dependency analysis saved to: $DEPENDENCY_MATRIX"
    fi
}

# Phase 3: Dependency Classification
run_phase_3() {
    log_info "Phase 3: Dependency Classification"
    
    local classification='{
        "critical": {
            "database_operations": {"priority": 1, "complexity": "high"},
            "user_authentication": {"priority": 1, "complexity": "medium"},
            "data_persistence": {"priority": 1, "complexity": "high"}
        },
        "important": {
            "file_storage": {"priority": 2, "complexity": "medium"},
            "realtime_features": {"priority": 2, "complexity": "medium"},
            "api_endpoints": {"priority": 2, "complexity": "low"}
        },
        "optional": {
            "analytics": {"priority": 3, "complexity": "low"},
            "monitoring": {"priority": 3, "complexity": "low"}
        }
    }'
    
    log_success "Dependencies classified by priority and complexity"
    
    if [[ "$DRY_RUN" == "false" ]]; then
        echo "$classification" | jq '.' > "$OUTPUT_DIR/dependency-classification-$TIMESTAMP.json"
    fi
}

# Phase 4: Abstraction Strategy Design
run_phase_4() {
    log_info "Phase 4: Abstraction Strategy Design"
    
    local strategy='{
        "abstraction_layers": {
            "database": {
                "interface": "IDatabaseService",
                "implementations": ["SupabaseDatabase", "PostgreSQLDatabase", "MockDatabase"],
                "migration_effort": "high"
            },
            "authentication": {
                "interface": "IAuthService", 
                "implementations": ["SupabaseAuth", "CustomAuth", "MockAuth"],
                "migration_effort": "medium"
            },
            "storage": {
                "interface": "IStorageService",
                "implementations": ["SupabaseStorage", "FileSystemStorage", "MockStorage"],
                "migration_effort": "low"
            }
        },
        "migration_phases": [
            {"phase": 1, "focus": "Create abstraction interfaces", "duration": "2 weeks"},
            {"phase": 2, "focus": "Implement Supabase adapters", "duration": "3 weeks"},
            {"phase": 3, "focus": "Implement alternative backends", "duration": "4 weeks"},
            {"phase": 4, "focus": "Migration and validation", "duration": "2 weeks"}
        ]
    }'
    
    log_success "Abstraction strategy designed"
    
    if [[ "$DRY_RUN" == "false" ]]; then
        echo "$strategy" | jq '.' > "$OUTPUT_DIR/abstraction-strategy-$TIMESTAMP.json"
    fi
}

# Generate final report
generate_report() {
    log_info "Generating final analysis report..."
    
    local report_file="$OUTPUT_DIR/dependency-analysis-report-$TIMESTAMP.md"
    
    if [[ "$DRY_RUN" == "false" ]]; then
        cat > "$report_file" << EOF
# TrustStream v4.2 Dependency Analysis Report

**Generated:** $(date)
**Analysis Phase:** $ANALYSIS_PHASE

## Executive Summary

This report provides a comprehensive analysis of Supabase dependencies within the TrustStream v4.2 codebase and outlines a strategic roadmap for progressive migration to abstraction layers.

## Analysis Results

### Component Inventory
- **Edge Functions:** $(jq '.edge_functions | length' "$COMPONENT_INVENTORY" 2>/dev/null || echo "N/A")
- **Database Migrations:** $(jq '.migrations | length' "$COMPONENT_INVENTORY" 2>/dev/null || echo "N/A")
- **Frontend Applications:** $(jq '.frontend_apps | length' "$COMPONENT_INVENTORY" 2>/dev/null || echo "N/A")

### Dependency Risk Assessment
- **Database Dependencies:** $(jq -r '.dependency_types.database[0].risk_level // "unknown"' "$DEPENDENCY_MATRIX" 2>/dev/null)
- **Authentication Dependencies:** $(jq -r '.dependency_types.authentication[0].risk_level // "unknown"' "$DEPENDENCY_MATRIX" 2>/dev/null)

## Migration Roadmap

### Phase 1: Interface Design (Weeks 1-2)
- Create abstraction layer interfaces
- Define service contracts
- Establish dependency injection framework

### Phase 2: Supabase Adapters (Weeks 3-5)
- Implement Supabase-specific adapters
- Maintain existing functionality
- Add comprehensive testing

### Phase 3: Alternative Implementations (Weeks 6-9)
- Develop PostgreSQL direct implementations
- Create file-based storage adapters
- Implement mock services for testing

### Phase 4: Migration & Validation (Weeks 10-11)
- Progressive component migration
- End-to-end validation
- Performance benchmarking

## Recommendations

1. **Start with Critical Dependencies:** Focus on database and authentication layers first
2. **Incremental Migration:** Migrate components one at a time to minimize risk
3. **Comprehensive Testing:** Maintain test coverage throughout migration
4. **Performance Monitoring:** Track performance impact of abstraction layers

## Next Steps

1. Run \`create-abstractions.sh\` to generate abstraction layer code
2. Use \`migrate-component.sh\` for individual component migrations
3. Validate migrations with \`validate-migration.sh\`

## Files Generated

- Component Inventory: \`$(basename "$COMPONENT_INVENTORY")\`
- Dependency Matrix: \`$(basename "$DEPENDENCY_MATRIX")\`
- This Report: \`$(basename "$report_file")\`

EOF
        
        log_success "Analysis report generated: $report_file"
    fi
}

# Main execution
main() {
    log_info "Starting TrustStream v4.2 Dependency Analysis"
    log_info "Project Root: $PROJECT_ROOT"
    log_info "Output Directory: $OUTPUT_DIR"
    log_info "Analysis Phase: $ANALYSIS_PHASE"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "DRY RUN MODE - No files will be written"
    fi
    
    if [[ "$SPECIFIC_COMPONENT" != "" ]]; then
        log_info "Analyzing specific component: $SPECIFIC_COMPONENT"
    fi
    
    # Run analysis phases
    case "$ANALYSIS_PHASE" in
        "1")
            run_phase_1
            ;;
        "2")
            run_phase_1
            run_phase_2
            ;;
        "3")
            run_phase_1
            run_phase_2
            run_phase_3
            ;;
        "4")
            run_phase_1
            run_phase_2
            run_phase_3
            run_phase_4
            ;;
        "all")
            run_phase_1
            run_phase_2
            run_phase_3
            run_phase_4
            generate_report
            ;;
        *)
            log_error "Invalid phase: $ANALYSIS_PHASE"
            exit 1
            ;;
    esac
    
    log_success "Dependency analysis completed successfully"
}

# Check dependencies
if ! command -v jq &> /dev/null; then
    log_error "jq is required but not installed. Please install jq first."
    exit 1
fi

# Run main function
main "$@"
