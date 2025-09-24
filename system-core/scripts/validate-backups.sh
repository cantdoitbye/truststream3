#!/bin/bash
# TrustStream v4.2 Backup Validation Script
# Usage: ./validate-backups.sh [backup_date] [backup_type]

set -e

BACKUP_DATE=${1:-$(date +%Y%m%d)}
BACKUP_TYPE=${2:-"all"}
TEMP_DIR="/tmp/backup_validation_$$"
AZURE_CONTAINER="truststream-backups"

# Source environment variables
if [ -f "$(dirname "$0")/../.env" ]; then
    source "$(dirname "$0")/../.env"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== TrustStream Backup Validation ==="
echo "Date: $BACKUP_DATE"
echo "Type: $BACKUP_TYPE"
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Create temporary directory
mkdir -p "$TEMP_DIR"

# Function to validate database backup
validate_database_backup() {
    local backup_file=$1
    local backup_name=$(basename "$backup_file")
    
    echo "Validating database backup: $backup_name"
    
    # Download backup
    if ! az storage blob download \
        --account-name "$AZURE_STORAGE_ACCOUNT" \
        --container-name "$AZURE_CONTAINER" \
        --name "$backup_file" \
        --file "$TEMP_DIR/$backup_name" > /dev/null 2>&1; then
        echo -e "${RED}✗${NC} Failed to download backup: $backup_name"
        return 1
    fi
    
    # Check file size (should be > 0)
    local file_size=$(stat -c%s "$TEMP_DIR/$backup_name" 2>/dev/null || stat -f%z "$TEMP_DIR/$backup_name" 2>/dev/null)
    if [ "$file_size" -eq 0 ]; then
        echo -e "${RED}✗${NC} Backup file is empty: $backup_name"
        return 1
    fi
    
    # Validate compression (if .gz file)
    if [[ "$backup_name" == *.gz ]]; then
        if ! gunzip -t "$TEMP_DIR/$backup_name" 2>/dev/null; then
            echo -e "${RED}✗${NC} Backup compression is corrupted: $backup_name"
            return 1
        fi
        
        # Extract for SQL validation
        gunzip "$TEMP_DIR/$backup_name"
        backup_name="${backup_name%.gz}"
    fi
    
    # Validate SQL syntax (basic check)
    if grep -q "CREATE TABLE\|INSERT INTO\|COPY\|PostgreSQL database dump" "$TEMP_DIR/$backup_name" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Database backup validation passed: $backup_name"
        return 0
    else
        echo -e "${RED}✗${NC} Backup does not contain valid SQL: $backup_name"
        return 1
    fi
}

# Function to validate repository backup
validate_repository_backup() {
    local backup_file=$1
    local backup_name=$(basename "$backup_file")
    
    echo "Validating repository backup: $backup_name"
    
    # Download backup
    if ! az storage blob download \
        --account-name "$AZURE_STORAGE_ACCOUNT" \
        --container-name "$AZURE_CONTAINER" \
        --name "$backup_file" \
        --file "$TEMP_DIR/$backup_name" > /dev/null 2>&1; then
        echo -e "${RED}✗${NC} Failed to download backup: $backup_name"
        return 1
    fi
    
    # Validate git bundle
    if [[ "$backup_name" == *.bundle ]]; then
        if git bundle verify "$TEMP_DIR/$backup_name" > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} Repository backup validation passed: $backup_name"
            return 0
        else
            echo -e "${RED}✗${NC} Git bundle validation failed: $backup_name"
            return 1
        fi
    fi
    
    # Validate tar.gz archive
    if [[ "$backup_name" == *.tar.gz ]]; then
        if tar -tzf "$TEMP_DIR/$backup_name" > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} Repository archive validation passed: $backup_name"
            return 0
        else
            echo -e "${RED}✗${NC} Archive validation failed: $backup_name"
            return 1
        fi
    fi
    
    echo -e "${YELLOW}⚠${NC} Unknown repository backup format: $backup_name"
    return 1
}

# Function to validate backup manifest
validate_backup_manifest() {
    local manifest_file=$1
    local manifest_name=$(basename "$manifest_file")
    
    echo "Validating backup manifest: $manifest_name"
    
    # Download manifest
    if ! az storage blob download \
        --account-name "$AZURE_STORAGE_ACCOUNT" \
        --container-name "$AZURE_CONTAINER" \
        --name "$manifest_file" \
        --file "$TEMP_DIR/$manifest_name" > /dev/null 2>&1; then
        echo -e "${RED}✗${NC} Failed to download manifest: $manifest_name"
        return 1
    fi
    
    # Validate JSON format
    if ! jq . "$TEMP_DIR/$manifest_name" > /dev/null 2>&1; then
        echo -e "${RED}✗${NC} Manifest is not valid JSON: $manifest_name"
        return 1
    fi
    
    # Check required fields
    local required_fields=("backup_id" "timestamp" "status" "components")
    for field in "${required_fields[@]}"; do
        if ! jq -e ".$field" "$TEMP_DIR/$manifest_name" > /dev/null 2>&1; then
            echo -e "${RED}✗${NC} Manifest missing required field '$field': $manifest_name"
            return 1
        fi
    done
    
    # Check backup status
    local status=$(jq -r '.status' "$TEMP_DIR/$manifest_name")
    if [ "$status" != "completed" ]; then
        echo -e "${YELLOW}⚠${NC} Backup status is '$status': $manifest_name"
        return 1
    fi
    
    echo -e "${GREEN}✓${NC} Backup manifest validation passed: $manifest_name"
    return 0
}

# Function to check backup completeness
check_backup_completeness() {
    local date=$1
    echo "Checking backup completeness for date: $date"
    
    # Expected backup types for a complete backup set
    local expected_types=("incremental" "full")
    local found_types=()
    
    # List all backups for the date
    local backups=$(az storage blob list \
        --account-name "$AZURE_STORAGE_ACCOUNT" \
        --container-name "$AZURE_CONTAINER" \
        --prefix "database/" \
        --query "[?contains(name, '$date')].name" \
        --output tsv)
    
    # Check which types we found
    for backup in $backups; do
        if [[ "$backup" == *"incremental"* ]]; then
            found_types+=("incremental")
        elif [[ "$backup" == *"full"* ]]; then
            found_types+=("full")
        fi
    done
    
    # Remove duplicates
    found_types=($(printf "%s\n" "${found_types[@]}" | sort -u))
    
    # Check completeness
    local missing_types=()
    for expected in "${expected_types[@]}"; do
        if [[ ! " ${found_types[@]} " =~ " ${expected} " ]]; then
            missing_types+=("$expected")
        fi
    done
    
    if [ ${#missing_types[@]} -eq 0 ]; then
        echo -e "${GREEN}✓${NC} Backup set is complete for $date"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} Missing backup types for $date: ${missing_types[*]}"
        return 1
    fi
}

# Main validation logic
main() {
    local validation_errors=0
    local validation_warnings=0
    
    # Get list of backups to validate
    local backup_pattern=""
    case $BACKUP_TYPE in
        "database")
            backup_pattern="database/"
            ;;
        "repository")
            backup_pattern="repository/"
            ;;
        "manifests")
            backup_pattern="manifests/"
            ;;
        "all")
            backup_pattern=""
            ;;
        *)
            echo "Invalid backup type: $BACKUP_TYPE"
            echo "Valid types: database, repository, manifests, all"
            exit 1
            ;;
    esac
    
    # List backups for the specified date
    local backups=$(az storage blob list \
        --account-name "$AZURE_STORAGE_ACCOUNT" \
        --container-name "$AZURE_CONTAINER" \
        --prefix "$backup_pattern" \
        --query "[?contains(name, '$BACKUP_DATE')].name" \
        --output tsv)
    
    if [ -z "$backups" ]; then
        echo -e "${YELLOW}⚠${NC} No backups found for date: $BACKUP_DATE"
        exit 1
    fi
    
    echo "Found $(echo "$backups" | wc -l) backup files to validate"
    echo ""
    
    # Validate each backup
    for backup in $backups; do
        if [[ "$backup" == database/* ]]; then
            if ! validate_database_backup "$backup"; then
                validation_errors=$((validation_errors + 1))
            fi
        elif [[ "$backup" == repository/* ]]; then
            if ! validate_repository_backup "$backup"; then
                validation_errors=$((validation_errors + 1))
            fi
        elif [[ "$backup" == manifests/* ]]; then
            if ! validate_backup_manifest "$backup"; then
                validation_errors=$((validation_errors + 1))
            fi
        fi
        echo ""
    done
    
    # Check backup completeness if validating all backups
    if [ "$BACKUP_TYPE" = "all" ] || [ "$BACKUP_TYPE" = "database" ]; then
        if ! check_backup_completeness "$BACKUP_DATE"; then
            validation_warnings=$((validation_warnings + 1))
        fi
        echo ""
    fi
    
    # Summary
    echo "=== Validation Summary ==="
    echo "Date: $BACKUP_DATE"
    echo "Type: $BACKUP_TYPE"
    echo "Files validated: $(echo "$backups" | wc -l)"
    echo "Errors: $validation_errors"
    echo "Warnings: $validation_warnings"
    
    if [ $validation_errors -eq 0 ]; then
        if [ $validation_warnings -eq 0 ]; then
            echo -e "${GREEN}✓${NC} All validations passed"
        else
            echo -e "${YELLOW}⚠${NC} Validations passed with warnings"
        fi
    else
        echo -e "${RED}✗${NC} Validation failed with $validation_errors errors"
    fi
    
    # Cleanup
    rm -rf "$TEMP_DIR"
    
    # Exit with appropriate code
    if [ $validation_errors -gt 0 ]; then
        exit 1
    elif [ $validation_warnings -gt 0 ]; then
        exit 2
    else
        exit 0
    fi
}

# Run main function
main "$@"
