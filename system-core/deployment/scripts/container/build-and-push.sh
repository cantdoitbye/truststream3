#!/bin/bash

# TrustStream v4.2 Container Build and Push Script
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
IMAGE_NAME=""
BUILD_NUMBER=""
PUSH_IMAGE=true
NO_CACHE=false
VERBOSE=false
DRY_RUN=false
PLATFORM="linux/amd64"
DOCKERFILE="Dockerfile"
CONTEXT_DIR="$ROOT_DIR"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment|-e)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --image|-i)
            IMAGE_NAME="$2"
            shift 2
            ;;
        --build-number|-b)
            BUILD_NUMBER="$2"
            shift 2
            ;;
        --platform|-p)
            PLATFORM="$2"
            shift 2
            ;;
        --dockerfile|-f)
            DOCKERFILE="$2"
            shift 2
            ;;
        --context|-c)
            CONTEXT_DIR="$2"
            shift 2
            ;;
        --no-push)
            PUSH_IMAGE=false
            shift
            ;;
        --no-cache)
            NO_CACHE=true
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
TrustStream v4.2 Container Build and Push Script

Usage: $0 [OPTIONS]

Options:
  -e, --environment ENV    Target environment (development|staging|production) [default: development]
  -i, --image IMAGE        Container image name (required)
  -b, --build-number NUM   Build number for tagging (required)
  -p, --platform PLATFORM Build platform [default: linux/amd64]
  -f, --dockerfile FILE    Dockerfile path [default: Dockerfile]
  -c, --context DIR        Build context directory [default: project root]
      --no-push            Skip pushing image to registry
      --no-cache           Build without using cache
  -v, --verbose            Enable verbose logging
      --dry-run            Show what would be done without executing
  -h, --help               Show this help message

Examples:
  # Build and push image for development
  $0 --environment development --image truststream42acr.azurecr.io/truststream-v4.2 --build-number 20250920-1234
  
  # Build without cache for production
  $0 --environment production --image myregistry/app --build-number v1.0.0 --no-cache
  
  # Dry run build
  $0 --environment staging --image app:latest --build-number test --dry-run

EOF
}

# Validate inputs
validate_inputs() {
    if [[ -z "$IMAGE_NAME" ]]; then
        log_error "Image name is required (--image)"
        exit 1
    fi
    
    if [[ -z "$BUILD_NUMBER" ]]; then
        log_error "Build number is required (--build-number)"
        exit 1
    fi
    
    if [[ ! -f "$CONTEXT_DIR/$DOCKERFILE" ]]; then
        log_error "Dockerfile not found: $CONTEXT_DIR/$DOCKERFILE"
        exit 1
    fi
    
    if [[ ! -d "$CONTEXT_DIR" ]]; then
        log_error "Context directory not found: $CONTEXT_DIR"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command_exists docker; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    # Check Docker daemon
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    # Check buildx for multi-platform builds
    if [[ "$PLATFORM" != "linux/amd64" ]]; then
        if ! docker buildx version >/dev/null 2>&1; then
            log_error "Docker buildx is required for multi-platform builds"
            exit 1
        fi
    fi
    
    log_success "Prerequisites check passed"
}

# Get registry from image name
get_registry() {
    local image="$1"
    echo "$image" | cut -d'/' -f1
}

# Login to container registry
login_to_registry() {
    local image="$1"
    local registry
    registry="$(get_registry "$image")"
    
    log_info "Logging in to container registry: $registry"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would login to registry: $registry"
        return 0
    fi
    
    # Handle different registry types
    case "$registry" in
        *.azurecr.io)
            # Azure Container Registry
            local acr_name
            acr_name="$(echo "$registry" | cut -d'.' -f1)"
            
            if ! az acr login --name "$acr_name" >/dev/null 2>&1; then
                log_error "Failed to login to Azure Container Registry: $acr_name"
                log_error "Make sure you are logged in to Azure CLI (az login)"
                exit 1
            fi
            ;;
        docker.io|registry-1.docker.io)
            # Docker Hub
            if [[ -n "${DOCKER_USERNAME:-}" && -n "${DOCKER_PASSWORD:-}" ]]; then
                echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin
            else
                log_warn "Docker Hub credentials not found. Assuming already logged in."
            fi
            ;;
        gcr.io|*.gcr.io)
            # Google Container Registry
            if [[ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]]; then
                gcloud auth configure-docker
            else
                log_warn "Google Cloud credentials not found. Assuming already logged in."
            fi
            ;;
        *)
            log_warn "Unknown registry type: $registry. Assuming already logged in."
            ;;
    esac
    
    log_success "Registry login completed"
}

# Create build context
create_build_context() {
    log_info "Preparing build context..."
    
    # Copy .dockerignore if it doesn't exist
    if [[ ! -f "$CONTEXT_DIR/.dockerignore" ]]; then
        log_info "Creating .dockerignore file..."
        cat > "$CONTEXT_DIR/.dockerignore" << 'EOF'
# Git
.git
.gitignore
.gitattributes

# Documentation
*.md
README*
CHANGELOG*
LICENSE*
docs/

# Development files
.env*
*.local
.vscode/
.idea/
*.swp
*.swo
*~

# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Testing
coverage/
*.test.js
*.spec.js
test/
tests/
__tests__/

# Build artifacts
build/
dist/
*.tgz
*.tar.gz

# Logs
logs/
*.log

# Temporary files
tmp/
temp/
*.tmp
*.temp

# OS files
.DS_Store
Thumbs.db

# Deployment files
deployment/
kubernetes/
*.yaml
*.yml
!docker-compose*.yml

# Backup files
*.backup
*.bak
EOF
    fi
    
    log_success "Build context prepared"
}

# Build container image
build_image() {
    local image_with_tag="$IMAGE_NAME:$BUILD_NUMBER"
    local latest_tag="$IMAGE_NAME:latest"
    
    log_info "Building container image: $image_with_tag"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would build image: $image_with_tag"
        log_info "[DRY RUN] Platform: $PLATFORM"
        log_info "[DRY RUN] Dockerfile: $DOCKERFILE"
        log_info "[DRY RUN] Context: $CONTEXT_DIR"
        return 0
    fi
    
    # Build arguments
    local build_args=()
    build_args+=("--file" "$CONTEXT_DIR/$DOCKERFILE")
    build_args+=("--tag" "$image_with_tag")
    build_args+=("--tag" "$latest_tag")
    build_args+=("--platform" "$PLATFORM")
    build_args+=("--build-arg" "BUILD_NUMBER=$BUILD_NUMBER")
    build_args+=("--build-arg" "BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')")
    build_args+=("--build-arg" "ENVIRONMENT=$ENVIRONMENT")
    
    # Add cache options
    if [[ "$NO_CACHE" == "true" ]]; then
        build_args+=("--no-cache")
    fi
    
    # Add context
    build_args+=("$CONTEXT_DIR")
    
    # Execute build
    local start_time
    start_time="$(date +%s)"
    
    if [[ "$PLATFORM" == "linux/amd64" ]]; then
        # Use regular docker build for single platform
        if [[ "$VERBOSE" == "true" ]]; then
            docker build "${build_args[@]}"
        else
            docker build "${build_args[@]}" >/dev/null
        fi
    else
        # Use buildx for multi-platform builds
        if [[ "$VERBOSE" == "true" ]]; then
            docker buildx build "${build_args[@]}"
        else
            docker buildx build "${build_args[@]}" >/dev/null
        fi
    fi
    
    local end_time
    end_time="$(date +%s)"
    local duration=$((end_time - start_time))
    
    log_success "Image built successfully in ${duration}s: $image_with_tag"
    
    # Get image size
    local image_size
    image_size="$(docker images --format "table {{.Size}}" "$IMAGE_NAME:$BUILD_NUMBER" | tail -n1)"
    log_info "Image size: $image_size"
}

# Scan image for vulnerabilities
scan_image() {
    local image_with_tag="$IMAGE_NAME:$BUILD_NUMBER"
    
    log_info "Scanning image for vulnerabilities..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would scan image: $image_with_tag"
        return 0
    fi
    
    # Check if Trivy is available
    if command_exists trivy; then
        log_info "Running Trivy security scan..."
        
        # Run Trivy scan
        local scan_result=0
        trivy image --exit-code 1 --severity HIGH,CRITICAL "$image_with_tag" || scan_result=$?
        
        if [[ $scan_result -eq 0 ]]; then
            log_success "Security scan passed - no high/critical vulnerabilities found"
        else
            log_warn "Security scan found vulnerabilities. Check the output above."
            
            # Don't fail the build for vulnerabilities in non-production environments
            if [[ "$ENVIRONMENT" != "production" ]]; then
                log_warn "Continuing build despite vulnerabilities (non-production environment)"
            else
                log_error "Build failed due to security vulnerabilities in production environment"
                exit 1
            fi
        fi
    else
        log_warn "Trivy not found. Skipping vulnerability scan."
        log_info "Install Trivy for security scanning: https://aquasecurity.github.io/trivy/"
    fi
}

# Test image
test_image() {
    local image_with_tag="$IMAGE_NAME:$BUILD_NUMBER"
    
    log_info "Testing container image..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would test image: $image_with_tag"
        return 0
    fi
    
    # Get a random available port
    local test_port
    test_port="$(get_available_port 8000 8999)"
    
    if [[ -z "$test_port" ]]; then
        log_warn "No available ports found for testing. Skipping container test."
        return 0
    fi
    
    log_info "Starting test container on port $test_port..."
    
    # Start container for testing
    local container_id
    container_id="$(docker run -d -p "$test_port:3000" "$image_with_tag")"
    
    # Wait for container to start
    log_info "Waiting for container to start..."
    local max_wait=60
    local wait_count=0
    
    while [[ $wait_count -lt $max_wait ]]; do
        if docker ps --filter "id=$container_id" --filter "status=running" | grep -q "$container_id"; then
            if check_url "http://localhost:$test_port/health" 200 5; then
                log_success "Container is healthy and responding"
                break
            fi
        fi
        
        sleep 2
        wait_count=$((wait_count + 2))
    done
    
    # Check if test succeeded
    if [[ $wait_count -ge $max_wait ]]; then
        log_error "Container failed to start or respond to health checks"
        
        # Show container logs for debugging
        log_error "Container logs:"
        docker logs "$container_id" 2>&1 | while IFS= read -r line; do
            log_error "  $line"
        done
        
        # Cleanup
        docker stop "$container_id" >/dev/null 2>&1 || true
        docker rm "$container_id" >/dev/null 2>&1 || true
        
        exit 1
    fi
    
    # Cleanup test container
    log_info "Stopping test container..."
    docker stop "$container_id" >/dev/null 2>&1 || true
    docker rm "$container_id" >/dev/null 2>&1 || true
    
    log_success "Container test completed successfully"
}

# Push image to registry
push_image() {
    local image_with_tag="$IMAGE_NAME:$BUILD_NUMBER"
    local latest_tag="$IMAGE_NAME:latest"
    
    if [[ "$PUSH_IMAGE" != "true" ]]; then
        log_info "Skipping image push (--no-push flag set)"
        return 0
    fi
    
    log_info "Pushing image to registry..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would push images:"
        log_info "[DRY RUN]   $image_with_tag"
        log_info "[DRY RUN]   $latest_tag"
        return 0
    fi
    
    # Push versioned tag
    log_info "Pushing versioned tag: $image_with_tag"
    
    local start_time
    start_time="$(date +%s)"
    
    if [[ "$VERBOSE" == "true" ]]; then
        docker push "$image_with_tag"
    else
        docker push "$image_with_tag" >/dev/null
    fi
    
    # Push latest tag
    log_info "Pushing latest tag: $latest_tag"
    
    if [[ "$VERBOSE" == "true" ]]; then
        docker push "$latest_tag"
    else
        docker push "$latest_tag" >/dev/null
    fi
    
    local end_time
    end_time="$(date +%s)"
    local duration=$((end_time - start_time))
    
    log_success "Images pushed successfully in ${duration}s"
    
    # Show pushed images
    log_info "Pushed images:"
    log_info "  $image_with_tag"
    log_info "  $latest_tag"
}

# Cleanup local images (optional)
cleanup_local_images() {
    local keep_latest="${1:-true}"
    
    log_info "Cleaning up local images..."
    
    # Remove dangling images
    local dangling_images
    dangling_images="$(docker images -f "dangling=true" -q)"
    
    if [[ -n "$dangling_images" ]]; then
        log_info "Removing dangling images..."
        docker rmi $dangling_images >/dev/null 2>&1 || true
    fi
    
    # Remove old versions of this image (keep latest 3)
    local old_images
    old_images="$(docker images "$IMAGE_NAME" --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}" | tail -n +2 | sort -k2 -r | tail -n +4 | cut -f1)"
    
    if [[ -n "$old_images" ]]; then
        log_info "Removing old image versions..."
        echo "$old_images" | while IFS= read -r image; do
            if [[ "$keep_latest" == "false" || "$image" != *":latest" ]]; then
                docker rmi "$image" >/dev/null 2>&1 || true
            fi
        done
    fi
    
    log_success "Local image cleanup completed"
}

# Main function
main() {
    log_header "TrustStream v4.2 Container Build and Push"
    log_info "Starting container build process..."
    log_info "Environment: $ENVIRONMENT"
    log_info "Image: $IMAGE_NAME:$BUILD_NUMBER"
    log_info "Platform: $PLATFORM"
    
    # Validation
    validate_inputs
    check_prerequisites
    
    # Preparation
    login_to_registry "$IMAGE_NAME"
    create_build_context
    
    # Build process
    build_image
    
    # Testing and security
    scan_image
    test_image
    
    # Push to registry
    push_image
    
    # Cleanup
    if [[ "$ENVIRONMENT" != "development" ]]; then
        cleanup_local_images "true"
    fi
    
    log_success "Container build and push completed successfully!"
    log_info "Image: $IMAGE_NAME:$BUILD_NUMBER"
    
    if [[ "$PUSH_IMAGE" == "true" && "$DRY_RUN" != "true" ]]; then
        log_info "Registry: $(get_registry "$IMAGE_NAME")"
        log_info "Use this image in your deployment configuration."
    fi
}

# Run main function
main "$@"