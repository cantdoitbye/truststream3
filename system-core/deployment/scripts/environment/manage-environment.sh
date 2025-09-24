#!/bin/bash

# TrustStream v4.2 Environment Management Framework
# Author: MiniMax Agent
# Version: 1.0.0

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Load common utilities
source "$SCRIPT_DIR/common/utils.sh"
source "$SCRIPT_DIR/common/logging.sh"
source "$SCRIPT_DIR/common/config.sh"

# Environment management functions

# Create environment
create_environment() {
    local environment="$1"
    local config_file="$2"
    local dry_run="${3:-false}"
    
    log_info "Creating environment: $environment"
    
    # Load configuration
    load_config "$config_file" "$environment"
    
    # Get Azure configuration
    local resource_group
    resource_group="$(get_azure_config "resourceGroup")"
    local location
    location="$(get_azure_config "location")"
    
    log_info "Resource Group: $resource_group"
    log_info "Location: $location"
    
    if [[ "$dry_run" == "true" ]]; then
        log_info "[DRY RUN] Would create environment: $environment"
        return 0
    fi
    
    # Create resource group
    log_step "Creating Azure resource group..."
    az group create \
        --name "$resource_group" \
        --location "$location" \
        --output none
    
    # Create container registry
    create_container_registry "$environment" "$config_file"
    
    # Create key vault
    create_key_vault "$environment" "$config_file"
    
    # Create storage account
    create_storage_account "$environment" "$config_file"
    
    # Create monitoring resources
    if [[ "$environment" == "production" || "$environment" == "staging" ]]; then
        create_monitoring_resources "$environment" "$config_file"
    fi
    
    # Setup environment secrets
    setup_environment_secrets "$environment" "$config_file"
    
    log_success "Environment '$environment' created successfully"
}

# Delete environment
delete_environment() {
    local environment="$1"
    local config_file="$2"
    local force="${3:-false}"
    local dry_run="${4:-false}"
    
    log_warn "Deleting environment: $environment"
    
    # Safety check for production
    if [[ "$environment" == "production" && "$force" != "true" ]]; then
        log_error "Cannot delete production environment without --force flag"
        return 1
    fi
    
    # Load configuration
    load_config "$config_file" "$environment"
    
    # Get Azure configuration
    local resource_group
    resource_group="$(get_azure_config "resourceGroup")"
    
    if [[ "$dry_run" == "true" ]]; then
        log_info "[DRY RUN] Would delete environment: $environment"
        log_info "[DRY RUN] Would delete resource group: $resource_group"
        return 0
    fi
    
    # Confirm deletion
    if [[ "$force" != "true" ]]; then
        echo -n "Are you sure you want to delete environment '$environment'? (yes/no): "
        read -r confirmation
        if [[ "$confirmation" != "yes" ]]; then
            log_info "Environment deletion cancelled"
            return 0
        fi
    fi
    
    # Create backup before deletion
    if [[ "$environment" == "production" ]]; then
        log_info "Creating backup before deletion..."
        "$SCRIPT_DIR/backup/create-backup.sh" \
            --environment "$environment" \
            --type "pre-deletion" \
            --config "$config_file"
    fi
    
    # Delete resource group (this deletes all resources in it)
    log_step "Deleting Azure resource group: $resource_group"
    az group delete \
        --name "$resource_group" \
        --yes \
        --no-wait
    
    log_success "Environment '$environment' deletion initiated"
    log_info "Note: Deletion is running in background. Check Azure portal for status."
}

# List environments
list_environments() {
    local config_file="$1"
    
    log_info "Available environments:"
    
    # Get environments from config file
    local environments
    environments=($(yq eval '.environments | keys | .[]' "$config_file" 2>/dev/null))
    
    for env in "${environments[@]}"; do
        # Check if environment exists in Azure
        local resource_group
        resource_group="$(yq eval ".azure.resourceGroup" "$config_file" | sed "s/{ENVIRONMENT}/$env/g")"
        
        local status="Unknown"
        if az group show --name "$resource_group" >/dev/null 2>&1; then
            status="Active"
        else
            status="Not Deployed"
        fi
        
        echo "  $env: $status"
    done
}

# Get environment status
get_environment_status() {
    local environment="$1"
    local config_file="$2"
    
    log_info "Checking status for environment: $environment"
    
    # Load configuration
    load_config "$config_file" "$environment"
    
    # Get Azure configuration
    local resource_group
    resource_group="$(get_azure_config "resourceGroup")"
    
    echo "Environment: $environment"
    echo "Resource Group: $resource_group"
    
    # Check resource group
    if az group show --name "$resource_group" >/dev/null 2>&1; then
        echo "Status: Active"
        
        # List resources in the group
        echo "\nResources:"
        az resource list --resource-group "$resource_group" --output table
        
        # Check app service status
        local app_name
        app_name="$(get_azure_config "appService")"
        
        if az webapp show --name "$app_name" --resource-group "$resource_group" >/dev/null 2>&1; then
            local app_status
            app_status="$(az webapp show --name "$app_name" --resource-group "$resource_group" --query state -o tsv)"
            echo "\nApp Service Status: $app_status"
            
            if [[ "$app_status" == "Running" ]]; then
                local app_url="https://${app_name}.azurewebsites.net"
                echo "App URL: $app_url"
                
                # Check health endpoint
                if check_url "$app_url/health" 200 10; then
                    echo "Health Check: ✓ Healthy"
                else
                    echo "Health Check: ✗ Unhealthy"
                fi
            fi
        fi
    else
        echo "Status: Not Deployed"
    fi
}

# Create container registry
create_container_registry() {
    local environment="$1"
    local config_file="$2"
    
    log_step "Creating Azure Container Registry..."
    
    local resource_group
    resource_group="$(get_azure_config "resourceGroup")"
    local registry_name
    registry_name="$(get_azure_config "containerRegistry")"
    
    # ACR names must be unique globally and can't contain hyphens
    registry_name="$(echo "$registry_name" | tr '-' '' | tr '[:upper:]' '[:lower:]')"
    
    # Create container registry
    az acr create \
        --resource-group "$resource_group" \
        --name "$registry_name" \
        --sku Standard \
        --admin-enabled true \
        --output none
    
    log_success "Container registry created: $registry_name"
}

# Create key vault
create_key_vault() {
    local environment="$1"
    local config_file="$2"
    
    log_step "Creating Azure Key Vault..."
    
    local resource_group
    resource_group="$(get_azure_config "resourceGroup")"
    local key_vault_name
    key_vault_name="$(get_azure_config "keyVault")"
    
    # Key Vault names must be unique globally
    key_vault_name="$(echo "$key_vault_name" | tr '[:upper:]' '[:lower:]')"
    
    # Create key vault
    az keyvault create \
        --name "$key_vault_name" \
        --resource-group "$resource_group" \
        --location "$(get_azure_config "location")" \
        --sku standard \
        --output none
    
    # Set access policy for current user
    local user_principal_id
    user_principal_id="$(az ad signed-in-user show --query id -o tsv)"
    
    az keyvault set-policy \
        --name "$key_vault_name" \
        --object-id "$user_principal_id" \
        --secret-permissions all \
        --output none
    
    log_success "Key Vault created: $key_vault_name"
}

# Create storage account
create_storage_account() {
    local environment="$1"
    local config_file="$2"
    
    log_step "Creating Azure Storage Account..."
    
    local resource_group
    resource_group="$(get_azure_config "resourceGroup")"
    local storage_account_name
    storage_account_name="$(get_azure_config "storageAccount")"
    
    # Storage account names must be unique globally and lowercase
    storage_account_name="$(echo "$storage_account_name" | tr '[:upper:]' '[:lower:]' | tr -d '-')"
    
    # Create storage account
    az storage account create \
        --name "$storage_account_name" \
        --resource-group "$resource_group" \
        --location "$(get_azure_config "location")" \
        --sku Standard_LRS \
        --kind StorageV2 \
        --access-tier Hot \
        --output none
    
    # Create container for backups
    az storage container create \
        --name "truststream-backups" \
        --account-name "$storage_account_name" \
        --output none
    
    log_success "Storage account created: $storage_account_name"
}

# Create monitoring resources
create_monitoring_resources() {
    local environment="$1"
    local config_file="$2"
    
    log_step "Creating monitoring resources..."
    
    local resource_group
    resource_group="$(get_azure_config "resourceGroup")"
    local location
    location="$(get_azure_config "location")"
    
    # Create Application Insights
    local app_insights_name="truststream-${environment}-insights"
    
    az monitor app-insights component create \
        --app "$app_insights_name" \
        --location "$location" \
        --resource-group "$resource_group" \
        --application-type web \
        --output none
    
    # Create Log Analytics Workspace
    local workspace_name="truststream-${environment}-workspace"
    
    az monitor log-analytics workspace create \
        --workspace-name "$workspace_name" \
        --resource-group "$resource_group" \
        --location "$location" \
        --output none
    
    log_success "Monitoring resources created"
}

# Setup environment secrets
setup_environment_secrets() {
    local environment="$1"
    local config_file="$2"
    
    log_step "Setting up environment secrets..."
    
    local key_vault_name
    key_vault_name="$(get_azure_config "keyVault" | tr '[:upper:]' '[:lower:]')"
    
    # Check if secrets are provided via environment variables
    local secrets=("SUPABASE_URL" "SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY" "OPENAI_API_KEY" "ANTHROPIC_API_KEY")
    
    for secret in "${secrets[@]}"; do
        if [[ -n "${!secret:-}" ]]; then
            log_debug "Storing secret: $secret"
            az keyvault secret set \
                --vault-name "$key_vault_name" \
                --name "$secret" \
                --value "${!secret}" \
                --output none
        else
            log_warn "Secret not found in environment: $secret"
            log_warn "You can set it later with: az keyvault secret set --vault-name '$key_vault_name' --name '$secret' --value 'your-value'"
        fi
    done
    
    log_success "Environment secrets setup completed"
}

# Sync environments (copy from source to target)
sync_environments() {
    local source_env="$1"
    local target_env="$2"
    local config_file="$3"
    local sync_type="${4:-secrets}"  # secrets, config, both
    local dry_run="${5:-false}"
    
    log_info "Syncing from $source_env to $target_env (type: $sync_type)"
    
    if [[ "$target_env" == "production" ]]; then
        log_error "Cannot sync TO production environment for safety"
        return 1
    fi
    
    if [[ "$dry_run" == "true" ]]; then
        log_info "[DRY RUN] Would sync $sync_type from $source_env to $target_env"
        return 0
    fi
    
    # Load configurations
    load_config "$config_file" "$source_env"
    local source_key_vault
    source_key_vault="$(get_azure_config "keyVault" | tr '[:upper:]' '[:lower:]')"
    
    load_config "$config_file" "$target_env"
    local target_key_vault
    target_key_vault="$(get_azure_config "keyVault" | tr '[:upper:]' '[:lower:]')"
    
    if [[ "$sync_type" == "secrets" || "$sync_type" == "both" ]]; then
        log_step "Syncing secrets..."
        
        # Get all secrets from source vault
        local secrets
        secrets=($(az keyvault secret list --vault-name "$source_key_vault" --query '[].name' -o tsv))
        
        for secret in "${secrets[@]}"; do
            log_debug "Syncing secret: $secret"
            local secret_value
            secret_value="$(az keyvault secret show --vault-name "$source_key_vault" --name "$secret" --query value -o tsv)"
            
            az keyvault secret set \
                --vault-name "$target_key_vault" \
                --name "$secret" \
                --value "$secret_value" \
                --output none
        done
        
        log_success "Secrets synced successfully"
    fi
    
    # Note: Configuration sync would copy app settings, but we handle this through config files
    # In the future, we could sync app service configuration here
    
    log_success "Environment sync completed"
}

# Main function
main() {
    local action="$1"
    shift
    
    case "$action" in
        "create")
            create_environment "$@"
            ;;
        "delete")
            delete_environment "$@"
            ;;
        "list")
            list_environments "$@"
            ;;
        "status")
            get_environment_status "$@"
            ;;
        "sync")
            sync_environments "$@"
            ;;
        *)
            echo "Usage: $0 {create|delete|list|status|sync} [options]"
            echo ""
            echo "Commands:"
            echo "  create ENVIRONMENT CONFIG_FILE [--dry-run]        Create environment"
            echo "  delete ENVIRONMENT CONFIG_FILE [--force] [--dry-run]  Delete environment"
            echo "  list CONFIG_FILE                               List environments"
            echo "  status ENVIRONMENT CONFIG_FILE                 Get environment status"
            echo "  sync SOURCE_ENV TARGET_ENV CONFIG_FILE [TYPE] [--dry-run]  Sync environments"
            echo ""
            echo "Examples:"
            echo "  $0 create development config/pipeline-config.yaml"
            echo "  $0 delete staging config/pipeline-config.yaml --force"
            echo "  $0 list config/pipeline-config.yaml"
            echo "  $0 status production config/pipeline-config.yaml"
            echo "  $0 sync staging development config/pipeline-config.yaml secrets"
            exit 1
            ;;
    esac
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    init_logging
    main "$@"
fi