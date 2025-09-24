#!/bin/bash

# =============================================================================
# TrustStream v4.2 Abstraction Layer Generator
# =============================================================================
# Description: Generates abstraction layer code based on dependency analysis
# Creates interfaces, implementations, and dependency injection framework
# =============================================================================

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SRC_DIR="$PROJECT_ROOT/src"
ABSTRACTION_DIR="$SRC_DIR/shared-utils/abstractions"
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
TrustStream v4.2 Abstraction Layer Generator

Usage: $0 [OPTIONS]

Options:
    -h, --help          Show this help message
    -l, --layer LAYER   Generate specific layer: db|auth|storage|realtime|all (default: all)
    -o, --output DIR    Output directory (default: $ABSTRACTION_DIR)
    -t, --template DIR  Template directory
    --impl TYPE         Include implementation: supabase|postgres|mock|all (default: all)
    --typescript        Generate TypeScript interfaces (default)
    --javascript        Generate JavaScript implementations
    --overwrite         Overwrite existing files
    --dry-run           Show what would be generated without creating files

Layers:
    db       - Database abstraction layer
    auth     - Authentication abstraction layer
    storage  - Storage abstraction layer
    realtime - Real-time communication layer
    all      - Generate all abstraction layers

Implementations:
    supabase - Supabase-specific implementations
    postgres - Direct PostgreSQL implementations
    mock     - Mock implementations for testing
    all      - Generate all implementations

Examples:
    $0                              # Generate all layers and implementations
    $0 --layer db --impl supabase   # Generate only database layer with Supabase impl
    $0 --overwrite                  # Regenerate all, overwriting existing files

EOF
}

# Parse command line arguments
LAYER="all"
IMPL_TYPE="all"
LANGUAGE="typescript"
OVERWRITE=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -l|--layer)
            LAYER="$2"
            shift 2
            ;;
        -o|--output)
            ABSTRACTION_DIR="$2"
            shift 2
            ;;
        --impl)
            IMPL_TYPE="$2"
            shift 2
            ;;
        --typescript)
            LANGUAGE="typescript"
            shift
            ;;
        --javascript)
            LANGUAGE="javascript"
            shift
            ;;
        --overwrite)
            OVERWRITE=true
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

# Create output directories
create_directories() {
    local dirs=(
        "$ABSTRACTION_DIR/interfaces"
        "$ABSTRACTION_DIR/implementations/supabase"
        "$ABSTRACTION_DIR/implementations/postgres"
        "$ABSTRACTION_DIR/implementations/mock"
        "$ABSTRACTION_DIR/container"
        "$ABSTRACTION_DIR/types"
        "$ABSTRACTION_DIR/utils"
    )
    
    for dir in "${dirs[@]}"; do
        if [[ "$DRY_RUN" == "false" ]]; then
            mkdir -p "$dir"
        fi
        log_info "Created directory: $dir"
    done
}

# Generate database abstraction layer
generate_database_layer() {
    log_info "Generating database abstraction layer..."
    
    # Database interface
    local db_interface_file="$ABSTRACTION_DIR/interfaces/IDatabase.ts"
    if [[ "$DRY_RUN" == "false" && ("$OVERWRITE" == "true" || ! -f "$db_interface_file") ]]; then
        cat > "$db_interface_file" << 'EOF'
/**
 * Database Service Interface
 * Provides abstract database operations independent of backend implementation
 */

export interface QueryOptions {
  where?: Record<string, any>;
  select?: string[];
  orderBy?: { column: string; ascending: boolean }[];
  limit?: number;
  offset?: number;
}

export interface TransactionOperation {
  type: 'create' | 'update' | 'delete';
  table: string;
  data?: any;
  where?: Record<string, any>;
}

export interface DatabaseConfig {
  type: 'supabase' | 'postgresql' | 'mock';
  connection: {
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    ssl?: boolean;
  };
  supabase?: {
    url: string;
    anonKey: string;
    serviceRoleKey?: string;
  };
  options?: {
    poolSize?: number;
    timeout?: number;
    retryAttempts?: number;
  };
}

export interface IDatabaseService {
  // Connection Management
  connect(config: DatabaseConfig): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // CRUD Operations
  create<T>(table: string, data: Partial<T>): Promise<T>;
  read<T>(table: string, query?: QueryOptions): Promise<T[]>;
  update<T>(table: string, id: string, data: Partial<T>): Promise<T>;
  delete(table: string, id: string): Promise<boolean>;

  // Batch Operations
  createMany<T>(table: string, data: Partial<T>[]): Promise<T[]>;
  updateMany<T>(table: string, query: QueryOptions, data: Partial<T>): Promise<T[]>;
  deleteMany(table: string, query: QueryOptions): Promise<number>;

  // Advanced Operations
  rawQuery<T>(query: string, params?: any[]): Promise<T[]>;
  transaction<T>(operations: TransactionOperation[]): Promise<T>;
  
  // Schema Operations
  tableExists(tableName: string): Promise<boolean>;
  getTableSchema(tableName: string): Promise<any>;
}
EOF
        log_success "Generated database interface: $db_interface_file"
    fi
    
    # Supabase implementation
    if [[ "$IMPL_TYPE" == "all" || "$IMPL_TYPE" == "supabase" ]]; then
        local supabase_impl_file="$ABSTRACTION_DIR/implementations/supabase/SupabaseDatabase.ts"
        if [[ "$DRY_RUN" == "false" && ("$OVERWRITE" == "true" || ! -f "$supabase_impl_file") ]]; then
            cat > "$supabase_impl_file" << 'EOF'
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IDatabaseService, QueryOptions, TransactionOperation, DatabaseConfig } from '../../interfaces/IDatabase';

export class SupabaseDatabase implements IDatabaseService {
  private client: SupabaseClient | null = null;
  private config: DatabaseConfig | null = null;

  async connect(config: DatabaseConfig): Promise<void> {
    if (!config.supabase) {
      throw new Error('Supabase configuration is required');
    }

    this.config = config;
    this.client = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey || config.supabase.anonKey
    );
  }

  async disconnect(): Promise<void> {
    this.client = null;
    this.config = null;
  }

  isConnected(): boolean {
    return this.client !== null;
  }

  async create<T>(table: string, data: Partial<T>): Promise<T> {
    if (!this.client) throw new Error('Database not connected');
    
    const { data: result, error } = await this.client
      .from(table)
      .insert(data)
      .select()
      .single();
    
    if (error) throw new Error(`Create failed: ${error.message}`);
    return result as T;
  }

  async read<T>(table: string, query?: QueryOptions): Promise<T[]> {
    if (!this.client) throw new Error('Database not connected');
    
    let queryBuilder = this.client.from(table);
    
    if (query?.select) {
      queryBuilder = queryBuilder.select(query.select.join(','));
    } else {
      queryBuilder = queryBuilder.select('*');
    }
    
    if (query?.where) {
      Object.entries(query.where).forEach(([key, value]) => {
        queryBuilder = queryBuilder.eq(key, value);
      });
    }
    
    if (query?.orderBy) {
      query.orderBy.forEach(({ column, ascending }) => {
        queryBuilder = queryBuilder.order(column, { ascending });
      });
    }
    
    if (query?.limit) {
      queryBuilder = queryBuilder.limit(query.limit);
    }
    
    if (query?.offset) {
      queryBuilder = queryBuilder.range(query.offset, query.offset + (query.limit || 10) - 1);
    }
    
    const { data, error } = await queryBuilder;
    
    if (error) throw new Error(`Read failed: ${error.message}`);
    return data as T[];
  }

  async update<T>(table: string, id: string, data: Partial<T>): Promise<T> {
    if (!this.client) throw new Error('Database not connected');
    
    const { data: result, error } = await this.client
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`Update failed: ${error.message}`);
    return result as T;
  }

  async delete(table: string, id: string): Promise<boolean> {
    if (!this.client) throw new Error('Database not connected');
    
    const { error } = await this.client
      .from(table)
      .delete()
      .eq('id', id);
    
    if (error) throw new Error(`Delete failed: ${error.message}`);
    return true;
  }

  async createMany<T>(table: string, data: Partial<T>[]): Promise<T[]> {
    if (!this.client) throw new Error('Database not connected');
    
    const { data: result, error } = await this.client
      .from(table)
      .insert(data)
      .select();
    
    if (error) throw new Error(`Batch create failed: ${error.message}`);
    return result as T[];
  }

  async updateMany<T>(table: string, query: QueryOptions, data: Partial<T>): Promise<T[]> {
    if (!this.client) throw new Error('Database not connected');
    
    let queryBuilder = this.client.from(table);
    
    if (query.where) {
      Object.entries(query.where).forEach(([key, value]) => {
        queryBuilder = queryBuilder.eq(key, value);
      });
    }
    
    const { data: result, error } = await queryBuilder
      .update(data)
      .select();
    
    if (error) throw new Error(`Batch update failed: ${error.message}`);
    return result as T[];
  }

  async deleteMany(table: string, query: QueryOptions): Promise<number> {
    if (!this.client) throw new Error('Database not connected');
    
    let queryBuilder = this.client.from(table);
    
    if (query.where) {
      Object.entries(query.where).forEach(([key, value]) => {
        queryBuilder = queryBuilder.eq(key, value);
      });
    }
    
    const { count, error } = await queryBuilder
      .delete()
      .select('*', { count: 'exact', head: true });
    
    if (error) throw new Error(`Batch delete failed: ${error.message}`);
    return count || 0;
  }

  async rawQuery<T>(query: string, params?: any[]): Promise<T[]> {
    if (!this.client) throw new Error('Database not connected');
    
    const { data, error } = await this.client.rpc('execute_sql', {
      query,
      params: params || []
    });
    
    if (error) throw new Error(`Raw query failed: ${error.message}`);
    return data as T[];
  }

  async transaction<T>(operations: TransactionOperation[]): Promise<T> {
    if (!this.client) throw new Error('Database not connected');
    
    // Supabase doesn't support explicit transactions via client
    // This is a simplified implementation
    const results = [];
    
    for (const op of operations) {
      switch (op.type) {
        case 'create':
          results.push(await this.create(op.table, op.data));
          break;
        case 'update':
          if (op.where?.id) {
            results.push(await this.update(op.table, op.where.id, op.data));
          }
          break;
        case 'delete':
          if (op.where?.id) {
            results.push(await this.delete(op.table, op.where.id));
          }
          break;
      }
    }
    
    return results as T;
  }

  async tableExists(tableName: string): Promise<boolean> {
    if (!this.client) throw new Error('Database not connected');
    
    try {
      const { error } = await this.client
        .from(tableName)
        .select('*')
        .limit(1);
      
      return !error;
    } catch {
      return false;
    }
  }

  async getTableSchema(tableName: string): Promise<any> {
    if (!this.client) throw new Error('Database not connected');
    
    // This would need to be implemented with a custom RPC function
    throw new Error('Schema introspection not implemented');
  }
}
EOF
            log_success "Generated Supabase database implementation: $supabase_impl_file"
        fi
    fi
    
    # Mock implementation
    if [[ "$IMPL_TYPE" == "all" || "$IMPL_TYPE" == "mock" ]]; then
        local mock_impl_file="$ABSTRACTION_DIR/implementations/mock/MockDatabase.ts"
        if [[ "$DRY_RUN" == "false" && ("$OVERWRITE" == "true" || ! -f "$mock_impl_file") ]]; then
            cat > "$mock_impl_file" << 'EOF'
import { IDatabaseService, QueryOptions, TransactionOperation, DatabaseConfig } from '../../interfaces/IDatabase';

export class MockDatabase implements IDatabaseService {
  private connected = false;
  private data: Map<string, any[]> = new Map();
  private nextId = 1;

  async connect(config: DatabaseConfig): Promise<void> {
    this.connected = true;
    // Initialize with some mock tables
    this.data.set('users', []);
    this.data.set('rag_agents', []);
    this.data.set('communities', []);
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.data.clear();
  }

  isConnected(): boolean {
    return this.connected;
  }

  async create<T>(table: string, data: Partial<T>): Promise<T> {
    if (!this.connected) throw new Error('Database not connected');
    
    const tableData = this.data.get(table) || [];
    const record = { 
      id: this.nextId++, 
      ...data, 
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    tableData.push(record);
    this.data.set(table, tableData);
    
    return record as T;
  }

  async read<T>(table: string, query?: QueryOptions): Promise<T[]> {
    if (!this.connected) throw new Error('Database not connected');
    
    let tableData = this.data.get(table) || [];
    
    // Apply where clause
    if (query?.where) {
      tableData = tableData.filter(record => {
        return Object.entries(query.where!).every(([key, value]) => {
          return record[key] === value;
        });
      });
    }
    
    // Apply ordering
    if (query?.orderBy) {
      query.orderBy.forEach(({ column, ascending }) => {
        tableData.sort((a, b) => {
          const aVal = a[column];
          const bVal = b[column];
          const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          return ascending ? comparison : -comparison;
        });
      });
    }
    
    // Apply pagination
    if (query?.offset || query?.limit) {
      const start = query.offset || 0;
      const end = query.limit ? start + query.limit : undefined;
      tableData = tableData.slice(start, end);
    }
    
    // Apply select
    if (query?.select) {
      tableData = tableData.map(record => {
        const selected: any = {};
        query.select!.forEach(field => {
          selected[field] = record[field];
        });
        return selected;
      });
    }
    
    return tableData as T[];
  }

  async update<T>(table: string, id: string, data: Partial<T>): Promise<T> {
    if (!this.connected) throw new Error('Database not connected');
    
    const tableData = this.data.get(table) || [];
    const recordIndex = tableData.findIndex(record => record.id.toString() === id);
    
    if (recordIndex === -1) {
      throw new Error(`Record with id ${id} not found in table ${table}`);
    }
    
    const updatedRecord = {
      ...tableData[recordIndex],
      ...data,
      updated_at: new Date().toISOString()
    };
    
    tableData[recordIndex] = updatedRecord;
    this.data.set(table, tableData);
    
    return updatedRecord as T;
  }

  async delete(table: string, id: string): Promise<boolean> {
    if (!this.connected) throw new Error('Database not connected');
    
    const tableData = this.data.get(table) || [];
    const recordIndex = tableData.findIndex(record => record.id.toString() === id);
    
    if (recordIndex === -1) {
      return false;
    }
    
    tableData.splice(recordIndex, 1);
    this.data.set(table, tableData);
    
    return true;
  }

  async createMany<T>(table: string, data: Partial<T>[]): Promise<T[]> {
    if (!this.connected) throw new Error('Database not connected');
    
    const results = [];
    for (const item of data) {
      results.push(await this.create(table, item));
    }
    return results;
  }

  async updateMany<T>(table: string, query: QueryOptions, data: Partial<T>): Promise<T[]> {
    if (!this.connected) throw new Error('Database not connected');
    
    const records = await this.read<any>(table, query);
    const results = [];
    
    for (const record of records) {
      results.push(await this.update(table, record.id, data));
    }
    
    return results;
  }

  async deleteMany(table: string, query: QueryOptions): Promise<number> {
    if (!this.connected) throw new Error('Database not connected');
    
    const records = await this.read<any>(table, query);
    let deletedCount = 0;
    
    for (const record of records) {
      if (await this.delete(table, record.id)) {
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  async rawQuery<T>(query: string, params?: any[]): Promise<T[]> {
    if (!this.connected) throw new Error('Database not connected');
    
    // Mock implementation - just return empty array
    console.warn('Mock database: Raw queries not supported, returning empty array');
    return [];
  }

  async transaction<T>(operations: TransactionOperation[]): Promise<T> {
    if (!this.connected) throw new Error('Database not connected');
    
    // Mock transaction - just execute operations sequentially
    const results = [];
    
    for (const op of operations) {
      switch (op.type) {
        case 'create':
          results.push(await this.create(op.table, op.data));
          break;
        case 'update':
          if (op.where?.id) {
            results.push(await this.update(op.table, op.where.id, op.data));
          }
          break;
        case 'delete':
          if (op.where?.id) {
            results.push(await this.delete(op.table, op.where.id));
          }
          break;
      }
    }
    
    return results as T;
  }

  async tableExists(tableName: string): Promise<boolean> {
    return this.data.has(tableName);
  }

  async getTableSchema(tableName: string): Promise<any> {
    if (!this.data.has(tableName)) {
      throw new Error(`Table ${tableName} does not exist`);
    }
    
    // Return mock schema
    return {
      table_name: tableName,
      columns: [
        { name: 'id', type: 'integer', nullable: false },
        { name: 'created_at', type: 'timestamp', nullable: false },
        { name: 'updated_at', type: 'timestamp', nullable: false }
      ]
    };
  }
}
EOF
            log_success "Generated mock database implementation: $mock_impl_file"
        fi
    fi
}

# Generate authentication abstraction layer
generate_auth_layer() {
    log_info "Generating authentication abstraction layer..."
    
    # Auth interface
    local auth_interface_file="$ABSTRACTION_DIR/interfaces/IAuth.ts"
    if [[ "$DRY_RUN" == "false" && ("$OVERWRITE" == "true" || ! -f "$auth_interface_file") ]]; then
        cat > "$auth_interface_file" << 'EOF'
/**
 * Authentication Service Interface
 * Provides abstract authentication operations independent of backend implementation
 */

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Session {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  user: User;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  name?: string;
  metadata?: Record<string, any>;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  user: User | null;
  session: Session | null;
  error?: string;
}

export interface AuthConfig {
  type: 'supabase' | 'custom' | 'mock';
  supabase?: {
    url: string;
    anonKey: string;
  };
  custom?: {
    endpoint: string;
    apiKey: string;
  };
  options?: {
    sessionTimeout?: number;
    autoRefresh?: boolean;
  };
}

export type AuthEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED';

export interface IAuthService {
  // Initialization
  initialize(config: AuthConfig): Promise<void>;
  
  // User Authentication
  signUp(credentials: SignUpCredentials): Promise<AuthResult>;
  signIn(credentials: SignInCredentials): Promise<AuthResult>;
  signOut(): Promise<void>;
  
  // Session Management
  getCurrentUser(): Promise<User | null>;
  getSession(): Promise<Session | null>;
  refreshSession(): Promise<Session>;
  
  // Password Management
  resetPassword(email: string): Promise<void>;
  updatePassword(currentPassword: string, newPassword: string): Promise<void>;
  
  // User Profile
  updateProfile(updates: Partial<User>): Promise<User>;
  
  // Token Management
  getAccessToken(): Promise<string | null>;
  validateToken(token: string): Promise<boolean>;
  
  // Event Handling
  onAuthStateChange(callback: (event: AuthEvent, session: Session | null) => void): () => void;
}
EOF
        log_success "Generated authentication interface: $auth_interface_file"
    fi
}

# Generate storage abstraction layer
generate_storage_layer() {
    log_info "Generating storage abstraction layer..."
    
    local storage_interface_file="$ABSTRACTION_DIR/interfaces/IStorage.ts"
    if [[ "$DRY_RUN" == "false" && ("$OVERWRITE" == "true" || ! -f "$storage_interface_file") ]]; then
        cat > "$storage_interface_file" << 'EOF'
/**
 * Storage Service Interface
 * Provides abstract file storage operations independent of backend implementation
 */

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: Date;
  path: string;
  url?: string;
}

export interface UploadOptions {
  contentType?: string;
  cacheControl?: string;
  upsert?: boolean;
  metadata?: Record<string, any>;
}

export interface UploadResult {
  path: string;
  url: string;
  metadata: FileMetadata;
}

export interface StorageConfig {
  type: 'supabase' | 'filesystem' | 'mock';
  supabase?: {
    url: string;
    key: string;
    bucket: string;
  };
  filesystem?: {
    basePath: string;
    baseUrl: string;
  };
}

export interface IStorageService {
  // Initialization
  initialize(config: StorageConfig): Promise<void>;
  
  // File Operations
  upload(path: string, file: File | Buffer, options?: UploadOptions): Promise<UploadResult>;
  download(path: string): Promise<ArrayBuffer>;
  delete(path: string): Promise<void>;
  
  // File Metadata
  getMetadata(path: string): Promise<FileMetadata>;
  exists(path: string): Promise<boolean>;
  
  // URL Generation
  getPublicUrl(path: string): string;
  getSignedUrl(path: string, expiresIn: number): Promise<string>;
  
  // Directory Operations
  listFiles(directory: string): Promise<FileMetadata[]>;
  createDirectory(path: string): Promise<void>;
  deleteDirectory(path: string): Promise<void>;
}
EOF
        log_success "Generated storage interface: $storage_interface_file"
    fi
}

# Generate dependency injection container
generate_di_container() {
    log_info "Generating dependency injection container..."
    
    local container_file="$ABSTRACTION_DIR/container/ServiceContainer.ts"
    if [[ "$DRY_RUN" == "false" && ("$OVERWRITE" == "true" || ! -f "$container_file") ]]; then
        cat > "$container_file" << 'EOF'
/**
 * Dependency Injection Container
 * Manages service registration and resolution
 */

export type ServiceToken<T = any> = symbol | string;
export type ServiceFactory<T> = (container: IServiceContainer) => T | Promise<T>;
export type ServiceScope = 'singleton' | 'transient';

export interface ServiceRegistration<T = any> {
  token: ServiceToken<T>;
  factory: ServiceFactory<T>;
  scope: ServiceScope;
  instance?: T;
}

export interface IServiceContainer {
  // Service Registration
  register<T>(token: ServiceToken<T>, factory: ServiceFactory<T>, scope?: ServiceScope): void;
  registerSingleton<T>(token: ServiceToken<T>, factory: ServiceFactory<T>): void;
  registerTransient<T>(token: ServiceToken<T>, factory: ServiceFactory<T>): void;
  
  // Service Resolution
  resolve<T>(token: ServiceToken<T>): Promise<T>;
  tryResolve<T>(token: ServiceToken<T>): Promise<T | null>;
  
  // Container Management
  dispose(): Promise<void>;
  isRegistered<T>(token: ServiceToken<T>): boolean;
}

export class ServiceContainer implements IServiceContainer {
  private registrations = new Map<ServiceToken, ServiceRegistration>();
  private disposed = false;

  register<T>(token: ServiceToken<T>, factory: ServiceFactory<T>, scope: ServiceScope = 'singleton'): void {
    if (this.disposed) {
      throw new Error('Container has been disposed');
    }

    this.registrations.set(token, {
      token,
      factory,
      scope
    });
  }

  registerSingleton<T>(token: ServiceToken<T>, factory: ServiceFactory<T>): void {
    this.register(token, factory, 'singleton');
  }

  registerTransient<T>(token: ServiceToken<T>, factory: ServiceFactory<T>): void {
    this.register(token, factory, 'transient');
  }

  async resolve<T>(token: ServiceToken<T>): Promise<T> {
    if (this.disposed) {
      throw new Error('Container has been disposed');
    }

    const registration = this.registrations.get(token);
    if (!registration) {
      throw new Error(`Service not registered: ${String(token)}`);
    }

    if (registration.scope === 'singleton' && registration.instance) {
      return registration.instance as T;
    }

    const instance = await registration.factory(this);

    if (registration.scope === 'singleton') {
      registration.instance = instance;
    }

    return instance as T;
  }

  async tryResolve<T>(token: ServiceToken<T>): Promise<T | null> {
    try {
      return await this.resolve(token);
    } catch {
      return null;
    }
  }

  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }

    // Dispose singleton instances
    for (const registration of this.registrations.values()) {
      if (registration.instance && typeof registration.instance === 'object') {
        const disposable = registration.instance as any;
        if (typeof disposable.dispose === 'function') {
          await disposable.dispose();
        }
      }
    }

    this.registrations.clear();
    this.disposed = true;
  }

  isRegistered<T>(token: ServiceToken<T>): boolean {
    return this.registrations.has(token);
  }
}

// Service Tokens
export const SERVICE_TOKENS = {
  DATABASE: Symbol('IDatabase'),
  AUTH: Symbol('IAuth'),
  STORAGE: Symbol('IStorage'),
  REALTIME: Symbol('IRealtime'),
} as const;
EOF
        log_success "Generated DI container: $container_file"
    fi
    
    # Service factory helper
    local factory_file="$ABSTRACTION_DIR/container/ServiceFactory.ts"
    if [[ "$DRY_RUN" == "false" && ("$OVERWRITE" == "true" || ! -f "$factory_file") ]]; then
        cat > "$factory_file" << 'EOF'
/**
 * Service Factory
 * Creates service instances based on configuration
 */

import { IServiceContainer, SERVICE_TOKENS } from './ServiceContainer';
import { IDatabaseService, DatabaseConfig } from '../interfaces/IDatabase';
import { IAuthService, AuthConfig } from '../interfaces/IAuth';
import { IStorageService, StorageConfig } from '../interfaces/IStorage';

// Implementation imports
import { SupabaseDatabase } from '../implementations/supabase/SupabaseDatabase';
import { MockDatabase } from '../implementations/mock/MockDatabase';

export interface ServiceConfigs {
  database: DatabaseConfig;
  auth: AuthConfig;
  storage: StorageConfig;
}

export class ServiceFactory {
  static registerServices(container: IServiceContainer, configs: ServiceConfigs): void {
    // Register Database Service
    container.registerSingleton(SERVICE_TOKENS.DATABASE, async () => {
      const service = ServiceFactory.createDatabaseService(configs.database);
      await service.connect(configs.database);
      return service;
    });

    // Register Auth Service
    container.registerSingleton(SERVICE_TOKENS.AUTH, async () => {
      const service = ServiceFactory.createAuthService(configs.auth);
      await service.initialize(configs.auth);
      return service;
    });

    // Register Storage Service
    container.registerSingleton(SERVICE_TOKENS.STORAGE, async () => {
      const service = ServiceFactory.createStorageService(configs.storage);
      await service.initialize(configs.storage);
      return service;
    });
  }

  private static createDatabaseService(config: DatabaseConfig): IDatabaseService {
    switch (config.type) {
      case 'supabase':
        return new SupabaseDatabase();
      case 'mock':
        return new MockDatabase();
      default:
        throw new Error(`Unsupported database type: ${config.type}`);
    }
  }

  private static createAuthService(config: AuthConfig): IAuthService {
    switch (config.type) {
      case 'supabase':
        // Import and return SupabaseAuth implementation
        throw new Error('SupabaseAuth implementation not yet created');
      case 'mock':
        // Import and return MockAuth implementation
        throw new Error('MockAuth implementation not yet created');
      default:
        throw new Error(`Unsupported auth type: ${config.type}`);
    }
  }

  private static createStorageService(config: StorageConfig): IStorageService {
    switch (config.type) {
      case 'supabase':
        // Import and return SupabaseStorage implementation
        throw new Error('SupabaseStorage implementation not yet created');
      case 'filesystem':
        // Import and return FileSystemStorage implementation
        throw new Error('FileSystemStorage implementation not yet created');
      case 'mock':
        // Import and return MockStorage implementation
        throw new Error('MockStorage implementation not yet created');
      default:
        throw new Error(`Unsupported storage type: ${config.type}`);
    }
  }
}
EOF
        log_success "Generated service factory: $factory_file"
    fi
}

# Generate configuration files
generate_config_files() {
    log_info "Generating configuration files..."
    
    # Main config file
    local config_file="$ABSTRACTION_DIR/config/services.config.ts"
    mkdir -p "$(dirname "$config_file")"
    
    if [[ "$DRY_RUN" == "false" && ("$OVERWRITE" == "true" || ! -f "$config_file") ]]; then
        cat > "$config_file" << 'EOF'
/**
 * Service Configuration
 * Defines service configurations for different environments
 */

import { ServiceConfigs } from '../container/ServiceFactory';

export const developmentConfig: ServiceConfigs = {
  database: {
    type: 'mock',
    connection: {},
    options: {
      poolSize: 10,
      timeout: 5000,
      retryAttempts: 3
    }
  },
  auth: {
    type: 'mock',
    options: {
      sessionTimeout: 3600,
      autoRefresh: true
    }
  },
  storage: {
    type: 'mock'
  }
};

export const productionConfig: ServiceConfigs = {
  database: {
    type: 'supabase',
    connection: {},
    supabase: {
      url: process.env.SUPABASE_URL || '',
      anonKey: process.env.SUPABASE_ANON_KEY || '',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
    },
    options: {
      poolSize: 20,
      timeout: 10000,
      retryAttempts: 3
    }
  },
  auth: {
    type: 'supabase',
    supabase: {
      url: process.env.SUPABASE_URL || '',
      anonKey: process.env.SUPABASE_ANON_KEY || ''
    },
    options: {
      sessionTimeout: 3600,
      autoRefresh: true
    }
  },
  storage: {
    type: 'supabase',
    supabase: {
      url: process.env.SUPABASE_URL || '',
      key: process.env.SUPABASE_ANON_KEY || '',
      bucket: 'default'
    }
  }
};

export function getConfig(environment: 'development' | 'production' = 'development'): ServiceConfigs {
  switch (environment) {
    case 'production':
      return productionConfig;
    case 'development':
    default:
      return developmentConfig;
  }
}
EOF
        log_success "Generated service configuration: $config_file"
    fi
    
    # Example usage file
    local example_file="$ABSTRACTION_DIR/examples/usage.example.ts"
    mkdir -p "$(dirname "$example_file")"
    
    if [[ "$DRY_RUN" == "false" && ("$OVERWRITE" == "true" || ! -f "$example_file") ]]; then
        cat > "$example_file" << 'EOF'
/**
 * Example Usage of Abstraction Layers
 * Demonstrates how to use the service container and abstraction layers
 */

import { ServiceContainer, SERVICE_TOKENS } from '../container/ServiceContainer';
import { ServiceFactory } from '../container/ServiceFactory';
import { getConfig } from '../config/services.config';
import { IDatabaseService } from '../interfaces/IDatabase';
import { IAuthService } from '../interfaces/IAuth';
import { IStorageService } from '../interfaces/IStorage';

// Example: Setting up the service container
export async function setupServices() {
  const container = new ServiceContainer();
  const config = getConfig(process.env.NODE_ENV === 'production' ? 'production' : 'development');
  
  // Register all services
  ServiceFactory.registerServices(container, config);
  
  return container;
}

// Example: Using the database service
export async function databaseExample() {
  const container = await setupServices();
  const db = await container.resolve<IDatabaseService>(SERVICE_TOKENS.DATABASE);
  
  // Create a new record
  const newUser = await db.create('users', {
    name: 'John Doe',
    email: 'john@example.com'
  });
  
  console.log('Created user:', newUser);
  
  // Read records
  const users = await db.read('users', {
    where: { email: 'john@example.com' },
    limit: 10
  });
  
  console.log('Found users:', users);
  
  // Update a record
  if (users.length > 0) {
    const updatedUser = await db.update('users', users[0].id, {
      name: 'John Smith'
    });
    
    console.log('Updated user:', updatedUser);
  }
  
  // Clean up
  await container.dispose();
}

// Example: Using the auth service
export async function authExample() {
  const container = await setupServices();
  const auth = await container.resolve<IAuthService>(SERVICE_TOKENS.AUTH);
  
  // Sign up a new user
  try {
    const signUpResult = await auth.signUp({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    });
    
    if (signUpResult.user) {
      console.log('User signed up:', signUpResult.user);
    }
  } catch (error) {
    console.error('Sign up failed:', error);
  }
  
  // Sign in
  try {
    const signInResult = await auth.signIn({
      email: 'test@example.com',
      password: 'password123'
    });
    
    if (signInResult.user) {
      console.log('User signed in:', signInResult.user);
    }
  } catch (error) {
    console.error('Sign in failed:', error);
  }
  
  // Get current user
  const currentUser = await auth.getCurrentUser();
  console.log('Current user:', currentUser);
  
  // Clean up
  await container.dispose();
}

// Example: Switching between implementations
export async function switchImplementationExample() {
  // Create container with mock services for testing
  const testContainer = new ServiceContainer();
  const testConfig = getConfig('development'); // Uses mock implementations
  
  ServiceFactory.registerServices(testContainer, testConfig);
  
  const mockDb = await testContainer.resolve<IDatabaseService>(SERVICE_TOKENS.DATABASE);
  console.log('Using mock database for testing');
  
  // Use mock database for testing
  await mockDb.create('test_table', { name: 'test data' });
  const testResults = await mockDb.read('test_table');
  console.log('Test results:', testResults);
  
  await testContainer.dispose();
  
  // Create container with production services
  const prodContainer = new ServiceContainer();
  const prodConfig = getConfig('production'); // Uses Supabase implementations
  
  ServiceFactory.registerServices(prodContainer, prodConfig);
  
  const supabaseDb = await prodContainer.resolve<IDatabaseService>(SERVICE_TOKENS.DATABASE);
  console.log('Using Supabase database for production');
  
  // Use real database in production
  // ... production database operations
  
  await prodContainer.dispose();
}

// Run examples
if (require.main === module) {
  Promise.all([
    databaseExample(),
    authExample(),
    switchImplementationExample()
  ]).then(() => {
    console.log('All examples completed successfully');
  }).catch(error => {
    console.error('Example failed:', error);
    process.exit(1);
  });
}
EOF
        log_success "Generated usage examples: $example_file"
    fi
}

# Generate package.json updates
generate_package_updates() {
    log_info "Generating package.json updates..."
    
    local package_updates_file="$ABSTRACTION_DIR/package-updates.json"
    
    if [[ "$DRY_RUN" == "false" && ("$OVERWRITE" == "true" || ! -f "$package_updates_file") ]]; then
        cat > "$package_updates_file" << 'EOF'
{
  "description": "Package.json updates needed for abstraction layers",
  "dependencies": {
    "reflect-metadata": "^0.1.13",
    "@types/node": "^18.0.0"
  },
  "devDependencies": {
    "@types/jest": "^29.0.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0"
  },
  "scripts": {
    "test:abstractions": "jest --testMatch='**/abstractions/**/*.test.ts'",
    "test:abstractions:watch": "jest --testMatch='**/abstractions/**/*.test.ts' --watch",
    "build:abstractions": "tsc --project src/shared-utils/abstractions/tsconfig.json"
  }
}
EOF
        log_success "Generated package updates: $package_updates_file"
    fi
}

# Main execution
main() {
    log_info "Starting TrustStream v4.2 Abstraction Layer Generation"
    log_info "Output Directory: $ABSTRACTION_DIR"
    log_info "Layer: $LAYER"
    log_info "Implementation Type: $IMPL_TYPE"
    log_info "Language: $LANGUAGE"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "DRY RUN MODE - No files will be created"
    fi
    
    # Create directory structure
    create_directories
    
    # Generate layers based on selection
    case "$LAYER" in
        "db")
            generate_database_layer
            ;;
        "auth")
            generate_auth_layer
            ;;
        "storage")
            generate_storage_layer
            ;;
        "all")
            generate_database_layer
            generate_auth_layer
            generate_storage_layer
            generate_di_container
            generate_config_files
            generate_package_updates
            ;;
        *)
            log_error "Invalid layer: $LAYER"
            exit 1
            ;;
    esac
    
    # Always generate DI container for individual layers
    if [[ "$LAYER" != "all" ]]; then
        generate_di_container
    fi
    
    log_success "Abstraction layer generation completed successfully"
    
    if [[ "$DRY_RUN" == "false" ]]; then
        log_info "Next steps:"
        log_info "1. Update package.json with dependencies from: $(basename "$package_updates_file")"
        log_info "2. Run 'npm install' to install new dependencies"
        log_info "3. Use 'migrate-component.sh' to migrate individual components"
        log_info "4. Run tests with 'npm run test:abstractions'"
    fi
}

# Run main function
main "$@"
