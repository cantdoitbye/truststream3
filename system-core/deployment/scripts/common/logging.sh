#!/bin/bash

# TrustStream v4.2 Deployment Logging System
# Author: MiniMax Agent

# Check if script is being sourced
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    echo "Error: This script should be sourced, not executed directly"
    exit 1
fi

# Colors for output
if [[ -t 1 ]] && command -v tput >/dev/null 2>&1; then
    # Terminal supports colors
    RED="$(tput setaf 1)"
    GREEN="$(tput setaf 2)"
    YELLOW="$(tput setaf 3)"
    BLUE="$(tput setaf 4)"
    MAGENTA="$(tput setaf 5)"
    CYAN="$(tput setaf 6)"
    WHITE="$(tput setaf 7)"
    BOLD="$(tput bold)"
    NC="$(tput sgr0)"  # No Color
else
    # No color support
    RED=""
    GREEN=""
    YELLOW=""
    BLUE=""
    MAGENTA=""
    CYAN=""
    WHITE=""
    BOLD=""
    NC=""
fi

# Log levels
LOG_LEVEL_DEBUG=0
LOG_LEVEL_INFO=1
LOG_LEVEL_WARN=2
LOG_LEVEL_ERROR=3
LOG_LEVEL_FATAL=4

# Current log level (default: INFO)
CURRENT_LOG_LEVEL=${LOG_LEVEL:-$LOG_LEVEL_INFO}

# Log file
LOG_FILE="${LOG_FILE:-/tmp/truststream-deploy-$(date +%Y%m%d).log}"

# Create log directory if it doesn't exist
if [[ -n "$LOG_FILE" ]]; then
    LOG_DIR="$(dirname "$LOG_FILE")"
    mkdir -p "$LOG_DIR" 2>/dev/null || true
fi

# Get timestamp for logging
get_log_timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

# Write to log file
write_to_log() {
    local level="$1"
    local message="$2"
    local timestamp
    timestamp="$(get_log_timestamp)"
    
    if [[ -n "$LOG_FILE" ]]; then
        echo "[$timestamp] [$level] $message" >> "$LOG_FILE" 2>/dev/null || true
    fi
}

# Generic log function
log_message() {
    local level="$1"
    local level_num="$2"
    local color="$3"
    local message="$4"
    local prefix="${5:-}"
    
    # Check if we should log this level
    if [[ $level_num -lt $CURRENT_LOG_LEVEL ]]; then
        return 0
    fi
    
    # Format message
    local formatted_message
    if [[ -n "$prefix" ]]; then
        formatted_message="${prefix}${message}"
    else
        formatted_message="${color}[${level}]${NC} ${message}"
    fi
    
    # Output to console
    echo -e "$formatted_message" >&2
    
    # Write to log file
    write_to_log "$level" "$message"
}

# Debug logging
log_debug() {
    local message="$1"
    log_message "DEBUG" $LOG_LEVEL_DEBUG "$CYAN" "$message"
}

# Info logging
log_info() {
    local message="$1"
    log_message "INFO" $LOG_LEVEL_INFO "$BLUE" "$message"
}

# Warning logging
log_warn() {
    local message="$1"
    log_message "WARN" $LOG_LEVEL_WARN "$YELLOW" "$message"
}

# Error logging
log_error() {
    local message="$1"
    log_message "ERROR" $LOG_LEVEL_ERROR "$RED" "$message"
}

# Fatal logging (exits after logging)
log_fatal() {
    local message="$1"
    local exit_code="${2:-1}"
    log_message "FATAL" $LOG_LEVEL_FATAL "$RED" "$message"
    exit "$exit_code"
}

# Success logging
log_success() {
    local message="$1"
    log_message "SUCCESS" $LOG_LEVEL_INFO "$GREEN" "$message" "${GREEN}✓ ${NC}"
}

# Step logging
log_step() {
    local message="$1"
    log_message "STEP" $LOG_LEVEL_INFO "$MAGENTA" "$message" "${MAGENTA}▶ ${NC}"
}

# Header logging
log_header() {
    local message="$1"
    local border="$(printf '=%.0s' {1..80})"
    
    echo -e "\n${BOLD}${WHITE}$border${NC}" >&2
    echo -e "${BOLD}${WHITE}  $message${NC}" >&2
    echo -e "${BOLD}${WHITE}$border${NC}\n" >&2
    
    # Write to log file
    write_to_log "HEADER" "$message"
}

# Section logging
log_section() {
    local message="$1"
    local border="$(printf '-%.0s' {1..60})"
    
    echo -e "\n${BOLD}${CYAN}$border${NC}" >&2
    echo -e "${BOLD}${CYAN}  $message${NC}" >&2
    echo -e "${BOLD}${CYAN}$border${NC}" >&2
    
    # Write to log file
    write_to_log "SECTION" "$message"
}

# Progress logging
log_progress() {
    local current="$1"
    local total="$2"
    local message="${3:-Progress}"
    local percentage
    percentage=$(( (current * 100) / total ))
    
    # Create progress bar
    local bar_length=30
    local filled_length=$(( (current * bar_length) / total ))
    local bar=""
    
    for ((i=0; i<filled_length; i++)); do
        bar+="█"
    done
    
    for ((i=filled_length; i<bar_length; i++)); do
        bar+="░"
    done
    
    echo -ne "\r${BLUE}$message: ${GREEN}[$bar]${NC} ${percentage}% (${current}/${total})" >&2
    
    # If complete, add newline
    if [[ $current -eq $total ]]; then
        echo >&2
    fi
}

# Command execution with logging
log_execute() {
    local command="$1"
    local description="${2:-Executing command}"
    local log_output="${3:-true}"
    
    log_debug "$description: $command"
    
    local temp_file
    temp_file="$(mktemp)"
    
    if [[ "$log_output" == "true" ]]; then
        # Execute command and capture output
        if eval "$command" > "$temp_file" 2>&1; then
            log_success "$description completed successfully"
            if [[ $CURRENT_LOG_LEVEL -le $LOG_LEVEL_DEBUG ]]; then
                while IFS= read -r line; do
                    log_debug "  $line"
                done < "$temp_file"
            fi
            rm -f "$temp_file"
            return 0
        else
            local exit_code=$?
            log_error "$description failed with exit code: $exit_code"
            while IFS= read -r line; do
                log_error "  $line"
            done < "$temp_file"
            rm -f "$temp_file"
            return $exit_code
        fi
    else
        # Execute command without logging output
        if eval "$command" >/dev/null 2>&1; then
            log_success "$description completed successfully"
            return 0
        else
            local exit_code=$?
            log_error "$description failed with exit code: $exit_code"
            return $exit_code
        fi
    fi
}

# Timed execution
log_timed() {
    local command="$1"
    local description="${2:-Executing timed command}"
    
    local start_time
    start_time="$(date +%s)"
    
    log_info "Starting: $description"
    
    if eval "$command"; then
        local end_time
        end_time="$(date +%s)"
        local duration=$((end_time - start_time))
        log_success "$description completed in ${duration}s"
        return 0
    else
        local exit_code=$?
        local end_time
        end_time="$(date +%s)"
        local duration=$((end_time - start_time))
        log_error "$description failed after ${duration}s (exit code: $exit_code)"
        return $exit_code
    fi
}

# Spinner for long-running operations
log_spinner() {
    local pid="$1"
    local message="${2:-Processing...}"
    local delay=0.1
    local spinstr='|/-\\'
    
    while kill -0 "$pid" 2>/dev/null; do
        local temp=${spinstr#?}
        printf "\r${BLUE}%s [%c]${NC}" "$message" "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
    done
    
    printf "\r%*s\r" ${#message} ""
}

# Log rotation
rotate_log() {
    local max_size="${1:-10485760}"  # 10MB default
    local max_files="${2:-5}"
    
    if [[ -f "$LOG_FILE" ]]; then
        local file_size
        file_size="$(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null || echo 0)"
        
        if [[ $file_size -gt $max_size ]]; then
            # Rotate logs
            for ((i=max_files-1; i>=1; i--)); do
                if [[ -f "${LOG_FILE}.$i" ]]; then
                    mv "${LOG_FILE}.$i" "${LOG_FILE}.$((i+1))"
                fi
            done
            
            mv "$LOG_FILE" "${LOG_FILE}.1"
            touch "$LOG_FILE"
            
            # Remove old logs
            if [[ -f "${LOG_FILE}.$((max_files+1))" ]]; then
                rm -f "${LOG_FILE}.$((max_files+1))"
            fi
            
            log_info "Log file rotated (size: ${file_size} bytes)"
        fi
    fi
}

# Set log level from environment or parameter
set_log_level() {
    local level="${1:-$LOG_LEVEL}"
    
    case "${level,,}" in  # Convert to lowercase
        "debug"|"0")
            CURRENT_LOG_LEVEL=$LOG_LEVEL_DEBUG
            log_debug "Log level set to DEBUG"
            ;;
        "info"|"1")
            CURRENT_LOG_LEVEL=$LOG_LEVEL_INFO
            log_debug "Log level set to INFO"
            ;;
        "warn"|"warning"|"2")
            CURRENT_LOG_LEVEL=$LOG_LEVEL_WARN
            log_debug "Log level set to WARN"
            ;;
        "error"|"3")
            CURRENT_LOG_LEVEL=$LOG_LEVEL_ERROR
            log_debug "Log level set to ERROR"
            ;;
        "fatal"|"4")
            CURRENT_LOG_LEVEL=$LOG_LEVEL_FATAL
            log_debug "Log level set to FATAL"
            ;;
        *)
            log_warn "Unknown log level: $level, using INFO"
            CURRENT_LOG_LEVEL=$LOG_LEVEL_INFO
            ;;
    esac
}

# Get current log level name
get_log_level_name() {
    case $CURRENT_LOG_LEVEL in
        $LOG_LEVEL_DEBUG) echo "DEBUG" ;;
        $LOG_LEVEL_INFO) echo "INFO" ;;
        $LOG_LEVEL_WARN) echo "WARN" ;;
        $LOG_LEVEL_ERROR) echo "ERROR" ;;
        $LOG_LEVEL_FATAL) echo "FATAL" ;;
        *) echo "UNKNOWN" ;;
    esac
}

# Initialize logging
init_logging() {
    local log_file="${1:-}"
    local log_level="${2:-}"
    
    if [[ -n "$log_file" ]]; then
        LOG_FILE="$log_file"
        # Create log directory if needed
        local log_dir
        log_dir="$(dirname "$LOG_FILE")"
        mkdir -p "$log_dir" 2>/dev/null || true
    fi
    
    if [[ -n "$log_level" ]]; then
        set_log_level "$log_level"
    fi
    
    # Rotate log if needed
    rotate_log
    
    log_info "Logging initialized (level: $(get_log_level_name), file: ${LOG_FILE:-none})"
}

# Export functions
export -f log_debug log_info log_warn log_error log_fatal log_success
export -f log_step log_header log_section log_progress log_execute
export -f log_timed log_spinner rotate_log set_log_level get_log_level_name
export -f init_logging

# Set initial log level
set_log_level