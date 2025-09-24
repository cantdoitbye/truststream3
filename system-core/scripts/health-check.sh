#!/bin/bash
# TrustStream v4.2 Health Check Script
# Usage: ./health-check.sh [url] [timeout]

set -e

URL=${1:-"http://localhost:3000"}
TIMEOUT=${2:-30}
VERBOSE=${3:-false}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log_info() {
    if [ "$VERBOSE" = "true" ]; then
        echo -e "${BLUE}[INFO]${NC} $1"
    fi
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# Health check functions
check_basic_health() {
    log_info "Checking basic health endpoint..."
    
    local start_time=$(date +%s.%N)
    
    if curl -f --max-time "$TIMEOUT" --silent "$URL/health" > /dev/null 2>&1; then
        local end_time=$(date +%s.%N)
        local duration=$(echo "$end_time - $start_time" | bc -l)
        local duration_ms=$(echo "$duration * 1000" | bc -l | cut -d'.' -f1)
        
        if [ "$duration_ms" -lt 1000 ]; then
            log_success "Health check passed (${duration_ms}ms)"
            return 0
        else
            log_warning "Health check slow (${duration_ms}ms)"
            return 1
        fi
    else
        log_error "Health check failed"
        return 1
    fi
}

check_api_endpoints() {
    log_info "Checking critical API endpoints..."
    
    local endpoints=(
        "/api/health"
        "/api/version"
        "/api/status"
    )
    
    local failed_endpoints=0
    
    for endpoint in "${endpoints[@]}"; do
        if curl -f --max-time 10 --silent "$URL$endpoint" > /dev/null 2>&1; then
            log_success "API endpoint accessible: $endpoint"
        else
            log_error "API endpoint failed: $endpoint"
            failed_endpoints=$((failed_endpoints + 1))
        fi
    done
    
    if [ $failed_endpoints -eq 0 ]; then
        return 0
    else
        return 1
    fi
}

check_database_connectivity() {
    log_info "Checking database connectivity..."
    
    if [ -z "$SUPABASE_DB_HOST" ]; then
        log_warning "Database host not configured, skipping database check"
        return 0
    fi
    
    # Test database connection
    if timeout 10 bash -c "echo > /dev/tcp/$SUPABASE_DB_HOST/${SUPABASE_DB_PORT:-5432}" 2>/dev/null; then
        log_success "Database port accessible"
        
        # Test actual database query if credentials available
        if [ -n "$SUPABASE_DB_USER" ] && [ -n "$SUPABASE_DB_NAME" ]; then
            if echo "SELECT 1;" | psql -h "$SUPABASE_DB_HOST" -p "${SUPABASE_DB_PORT:-5432}" -U "$SUPABASE_DB_USER" -d "$SUPABASE_DB_NAME" -t > /dev/null 2>&1; then
                log_success "Database query successful"
                return 0
            else
                log_error "Database query failed"
                return 1
            fi
        else
            log_warning "Database credentials not available for full test"
            return 0
        fi
    else
        log_error "Database port not accessible"
        return 1
    fi
}

check_storage_connectivity() {
    log_info "Checking Azure storage connectivity..."
    
    if [ -z "$AZURE_STORAGE_ACCOUNT" ]; then
        log_warning "Azure storage not configured, skipping storage check"
        return 0
    fi
    
    # Test Azure storage connection
    if az storage container show --account-name "$AZURE_STORAGE_ACCOUNT" --name "truststream-backups" > /dev/null 2>&1; then
        log_success "Azure storage accessible"
        return 0
    else
        log_error "Azure storage not accessible"
        return 1
    fi
}

check_disk_space() {
    log_info "Checking disk space..."
    
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -lt 80 ]; then
        log_success "Disk usage normal (${disk_usage}%)"
        return 0
    elif [ "$disk_usage" -lt 90 ]; then
        log_warning "Disk usage high (${disk_usage}%)"
        return 1
    else
        log_error "Disk usage critical (${disk_usage}%)"
        return 1
    fi
}

check_memory_usage() {
    log_info "Checking memory usage..."
    
    if command -v free >/dev/null 2>&1; then
        local memory_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
        
        if [ "$memory_usage" -lt 80 ]; then
            log_success "Memory usage normal (${memory_usage}%)"
            return 0
        elif [ "$memory_usage" -lt 90 ]; then
            log_warning "Memory usage high (${memory_usage}%)"
            return 1
        else
            log_error "Memory usage critical (${memory_usage}%)"
            return 1
        fi
    else
        log_warning "Memory check not available on this system"
        return 0
    fi
}

check_backup_health() {
    log_info "Checking backup system health..."
    
    # Check if backup scripts exist and are executable
    local backup_script="$(dirname "$0")/backup-database.sh"
    if [ -x "$backup_script" ]; then
        log_success "Backup script accessible"
        
        # Check last backup (if Azure is configured)
        if [ -n "$AZURE_STORAGE_ACCOUNT" ]; then
            local recent_backups=$(az storage blob list \
                --account-name "$AZURE_STORAGE_ACCOUNT" \
                --container-name "truststream-backups" \
                --prefix "database/" \
                --query "[?properties.lastModified >= '$(date -u -d '6 hours ago' +%Y-%m-%dT%H:%M:%SZ)']" \
                --output tsv 2>/dev/null | wc -l)
            
            if [ "$recent_backups" -gt 0 ]; then
                log_success "Recent backups found ($recent_backups in last 6 hours)"
                return 0
            else
                log_warning "No recent backups found"
                return 1
            fi
        else
            log_warning "Azure storage not configured, cannot check backup status"
            return 0
        fi
    else
        log_error "Backup script not found or not executable"
        return 1
    fi
}

check_ssl_certificate() {
    log_info "Checking SSL certificate..."
    
    # Only check HTTPS URLs
    if [[ "$URL" == https://* ]]; then
        local hostname=$(echo "$URL" | sed -e 's|^https://||' -e 's|/.*||')
        local cert_expiry=$(echo | openssl s_client -servername "$hostname" -connect "$hostname:443" 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
        
        if [ -n "$cert_expiry" ]; then
            local expiry_epoch=$(date -d "$cert_expiry" +%s 2>/dev/null || echo "0")
            local current_epoch=$(date +%s)
            local days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))
            
            if [ "$days_until_expiry" -gt 30 ]; then
                log_success "SSL certificate valid ($days_until_expiry days remaining)"
                return 0
            elif [ "$days_until_expiry" -gt 7 ]; then
                log_warning "SSL certificate expires soon ($days_until_expiry days)"
                return 1
            else
                log_error "SSL certificate expires very soon ($days_until_expiry days)"
                return 1
            fi
        else
            log_error "Could not retrieve SSL certificate information"
            return 1
        fi
    else
        log_info "HTTP URL provided, skipping SSL certificate check"
        return 0
    fi
}

# Main health check execution
main() {
    echo "=== TrustStream Health Check ==="
    echo "URL: $URL"
    echo "Timeout: ${TIMEOUT}s"
    echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo ""
    
    # Source environment variables if available
    if [ -f "$(dirname "$0")/../.env" ]; then
        source "$(dirname "$0")/../.env"
    fi
    
    local checks_passed=0
    local checks_failed=0
    local checks_warned=0
    
    # Array of health check functions
    local health_checks=(
        "check_basic_health"
        "check_api_endpoints"
        "check_database_connectivity"
        "check_storage_connectivity"
        "check_disk_space"
        "check_memory_usage"
        "check_backup_health"
        "check_ssl_certificate"
    )
    
    # Run each health check
    for check in "${health_checks[@]}"; do
        if $check; then
            checks_passed=$((checks_passed + 1))
        else
            # Check if it was a warning (exit code 1) or error (exit code > 1)
            local exit_code=$?
            if [ $exit_code -eq 1 ]; then
                checks_warned=$((checks_warned + 1))
            else
                checks_failed=$((checks_failed + 1))
            fi
        fi
        echo ""
    done
    
    # Summary
    echo "=== Health Check Summary ==="
    echo "Total checks: ${#health_checks[@]}"
    echo "Passed: $checks_passed"
    echo "Warnings: $checks_warned"
    echo "Failed: $checks_failed"
    
    # Determine overall health status
    if [ $checks_failed -eq 0 ] && [ $checks_warned -eq 0 ]; then
        echo -e "Overall status: ${GREEN}HEALTHY${NC}"
        exit 0
    elif [ $checks_failed -eq 0 ]; then
        echo -e "Overall status: ${YELLOW}WARNING${NC}"
        exit 1
    else
        echo -e "Overall status: ${RED}UNHEALTHY${NC}"
        exit 2
    fi
}

# Handle command line arguments
case "$1" in
    "-h"|"--help")
        echo "Usage: $0 [url] [timeout] [verbose]"
        echo "  url      - URL to check (default: http://localhost:3000)"
        echo "  timeout  - Timeout in seconds (default: 30)"
        echo "  verbose  - Enable verbose output (default: false)"
        echo ""
        echo "Exit codes:"
        echo "  0 - All checks passed"
        echo "  1 - Some checks have warnings"
        echo "  2 - Some checks failed"
        exit 0
        ;;
    "-v"|"--verbose")
        VERBOSE=true
        shift
        ;;
esac

# Run main function
main "$@"
