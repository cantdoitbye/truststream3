# Migration Procedures for TrustStream v4.2

## Table of Contents
1. [Migration Overview](#migration-overview)
2. [Pre-Migration Assessment](#pre-migration-assessment)
3. [Phase 1: Infrastructure Setup](#phase-1-infrastructure-setup)
4. [Phase 2: Service Abstraction](#phase-2-service-abstraction)
5. [Phase 3: Component Migration](#phase-3-component-migration)
6. [Phase 4: Testing and Validation](#phase-4-testing-and-validation)
7. [Phase 5: Production Deployment](#phase-5-production-deployment)
8. [Rollback Procedures](#rollback-procedures)
9. [Post-Migration Optimization](#post-migration-optimization)

---

## Migration Overview

### Migration Strategy

The migration from TrustStream v4.1's tightly-coupled Supabase architecture to v4.2's abstracted architecture follows a **progressive, risk-minimized approach** with the ability to rollback at each phase.

```
v4.1 (Supabase Coupled)     →     v4.2 (Provider Agnostic)

┌─────────────────────┐         ┌─────────────────────┐
│  Direct Supabase      │   →   │  Abstraction Layer   │
│  Dependencies        │         │  ┌─────────────────┐  │
│                     │         │  │ Supabase Impl  │  │
│  ┌────────────────┐ │         │  ├─────────────────┤  │
│  │ Business Logic │ │         │  │ PostgreSQL     │  │
│  └────────────────┘ │         │  ├─────────────────┤  │
│           │           │         │  │ Mock/File      │  │
│  ┌────────────────┐ │         │  └─────────────────┘  │
│  │ Supabase Client│ │         └─────────────────────┘
│  └────────────────┘ │
└─────────────────────┘
```

### Migration Principles

1. **Zero Downtime**: Production system remains operational throughout migration
2. **Incremental Changes**: Small, testable changes with immediate validation
3. **Rollback Ready**: Each phase can be reversed without data loss
4. **Data Integrity**: All data transformations are validated and reversible
5. **Performance Monitoring**: Continuous monitoring to detect regressions

### Migration Phases Overview

| Phase | Duration | Risk Level | Rollback Window |
|-------|----------|------------|-----------------|
| Infrastructure Setup | 1-2 days | Low | Immediate |
| Service Abstraction | 3-5 days | Medium | 24 hours |
| Component Migration | 5-10 days | Medium | 48 hours |
| Testing & Validation | 3-5 days | Low | 24 hours |
| Production Deployment | 1-2 days | High | 72 hours |

---

## Pre-Migration Assessment

### Current System Analysis

#### 1. Dependency Audit

```bash
# Run dependency analysis script
./scripts/analyze-dependencies.sh

# Expected output:
# - 169 edge functions identified
# - 55 database tables mapped
# - 79 migration files catalogued
# - 25 frontend integration points
```

**Critical Dependencies Identified:**

```typescript
// Generate dependency report
import { DependencyAnalyzer } from '@/migration-tools'

const analyzer = new DependencyAnalyzer()
const report = await analyzer.generateReport()

console.log('Migration Complexity Score:', report.complexityScore)
console.log('Critical Dependencies:', report.criticalDependencies)
console.log('Estimated Migration Time:', report.estimatedDuration)
```

#### 2. Data Assessment

```sql
-- Assess data volume and complexity
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_stat_get_tuples_returned(c.oid) as row_count
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check for complex data types
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND data_type IN ('jsonb', 'json', 'array');
```

#### 3. Performance Baseline

```typescript
// Establish performance baseline
import { PerformanceProfiler } from '@/migration-tools'

const profiler = new PerformanceProfiler()

// Profile critical operations
const baseline = await profiler.profileOperations([
  'agent_creation',
  'trust_score_calculation',
  'task_coordination',
  'real_time_updates'
])

// Save baseline for comparison
await profiler.saveBaseline('v4.1_baseline.json', baseline)
```

### Migration Readiness Checklist

- [ ] **Code Repository**: All v4.1 code committed and tagged
- [ ] **Database Backup**: Complete backup of production database
- [ ] **Environment Preparation**: Staging environment ready for testing
- [ ] **Team Training**: Development team trained on new architecture patterns
- [ ] **Monitoring Setup**: Enhanced monitoring for migration tracking
- [ ] **Rollback Plan**: Detailed rollback procedures documented and tested
- [ ] **Stakeholder Communication**: Migration schedule communicated to all stakeholders

---

## Phase 1: Infrastructure Setup

### 1.1 Abstraction Layer Implementation

#### Create Core Interfaces

```bash
# Create interface directories
mkdir -p src/interfaces/{database,auth,storage,realtime}
mkdir -p src/implementations/{supabase,postgresql,mock}
mkdir -p src/di
```

```typescript
// src/interfaces/database/index.ts
export interface IDatabaseService {
  connect(config: DatabaseConfig): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean
  
  create<T>(table: string, data: Partial<T>): Promise<Result<T, DatabaseError>>
  read<T>(table: string, query: QueryOptions): Promise<Result<T[], DatabaseError>>
  update<T>(table: string, id: string, data: Partial<T>): Promise<Result<T, DatabaseError>>
  delete(table: string, id: string): Promise<Result<boolean, DatabaseError>>
  
  createMany<T>(table: string, data: Partial<T>[]): Promise<Result<T[], DatabaseError>>
  updateMany<T>(table: string, query: QueryOptions, data: Partial<T>): Promise<Result<T[], DatabaseError>>
  deleteMany(table: string, query: QueryOptions): Promise<Result<number, DatabaseError>>
  
  rawQuery<T>(query: string, params?: any[]): Promise<Result<T[], DatabaseError>>
  transaction<T>(operations: TransactionOperation[]): Promise<Result<T, DatabaseError>>
}
```

#### Implement Supabase Adapter

```typescript
// src/implementations/supabase/database.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { IDatabaseService } from '@/interfaces/database'
import { Result } from '@/utils/result'

export class SupabaseDatabaseService implements IDatabaseService {
  private client: SupabaseClient | null = null
  private config: SupabaseConfig
  
  constructor(config: SupabaseConfig) {
    this.config = config
  }
  
  async connect(): Promise<void> {
    this.client = createClient(this.config.url, this.config.serviceRoleKey)
    
    // Test connection
    const { error } = await this.client.from('agents').select('id').limit(1)
    if (error) {
      throw new DatabaseConnectionError('Failed to connect to Supabase', error)
    }
  }
  
  async create<T>(table: string, data: Partial<T>): Promise<Result<T, DatabaseError>> {
    if (!this.client) {
      return Result.failure(new DatabaseConnectionError('Not connected'))
    }
    
    try {
      const { data: result, error } = await this.client
        .from(table)
        .insert(data)
        .select()
        .single()
      
      if (error) {
        return Result.failure(new DatabaseError('Create operation failed', error))
      }
      
      return Result.success(result as T)
    } catch (error) {
      return Result.failure(new DatabaseError('Unexpected error during create', error))
    }
  }
  
  async read<T>(table: string, query: QueryOptions): Promise<Result<T[], DatabaseError>> {
    if (!this.client) {
      return Result.failure(new DatabaseConnectionError('Not connected'))
    }
    
    try {
      let supabaseQuery = this.client.from(table).select(query.select?.join(',') || '*')
      
      // Apply where conditions
      if (query.where) {
        supabaseQuery = this.applyWhereConditions(supabaseQuery, query.where)
      }
      
      // Apply ordering
      if (query.orderBy) {
        for (const [column, direction] of Object.entries(query.orderBy)) {
          supabaseQuery = supabaseQuery.order(column, { ascending: direction === 'asc' })
        }
      }
      
      // Apply pagination
      if (query.limit) {
        supabaseQuery = supabaseQuery.limit(query.limit)
      }
      if (query.offset) {
        supabaseQuery = supabaseQuery.range(query.offset, query.offset + (query.limit || 1000))
      }
      
      const { data, error } = await supabaseQuery
      
      if (error) {
        return Result.failure(new DatabaseError('Read operation failed', error))
      }
      
      return Result.success(data as T[])
    } catch (error) {
      return Result.failure(new DatabaseError('Unexpected error during read', error))
    }
  }
  
  private applyWhereConditions(query: any, conditions: any): any {
    for (const [field, value] of Object.entries(conditions)) {
      if (typeof value === 'object' && value !== null) {
        // Handle operators
        if ('eq' in value) query = query.eq(field, value.eq)
        if ('gt' in value) query = query.gt(field, value.gt)
        if ('gte' in value) query = query.gte(field, value.gte)
        if ('lt' in value) query = query.lt(field, value.lt)
        if ('lte' in value) query = query.lte(field, value.lte)
        if ('in' in value) query = query.in(field, value.in)
        if ('neq' in value) query = query.neq(field, value.neq)
      } else {
        query = query.eq(field, value)
      }
    }
    return query
  }
}
```

### 1.2 Dependency Injection Setup

```typescript
// src/di/container.ts
import { Container } from 'inversify'
import { IDatabaseService, IAuthService, IStorageService } from '@/interfaces'
import { AppConfig } from '@/config'

export function createContainer(config: AppConfig): Container {
  const container = new Container()
  
  // Register services based on configuration
  registerDatabaseService(container, config.database)
  registerAuthService(container, config.auth)
  registerStorageService(container, config.storage)
  
  // Register business services
  registerBusinessServices(container)
  
  return container
}

function registerDatabaseService(container: Container, config: DatabaseConfig): void {
  switch (config.type) {
    case 'supabase':
      container.bind<IDatabaseService>('DatabaseService')
        .toDynamicValue(() => new SupabaseDatabaseService(config.supabase!))
        .inSingletonScope()
      break
    
    case 'postgresql':
      container.bind<IDatabaseService>('DatabaseService')
        .toDynamicValue(() => new PostgreSQLDatabaseService(config.postgresql!))
        .inSingletonScope()
      break
    
    case 'mock':
      container.bind<IDatabaseService>('DatabaseService')
        .toDynamicValue(() => new MockDatabaseService())
        .inSingletonScope()
      break
    
    default:
      throw new Error(`Unknown database provider: ${config.type}`)
  }
}
```

### 1.3 Configuration Management

```typescript
// src/config/app-config.ts
export interface AppConfig {
  environment: 'development' | 'staging' | 'production'
  
  database: {
    type: 'supabase' | 'postgresql' | 'mock'
    supabase?: {
      url: string
      anonKey: string
      serviceRoleKey: string
    }
    postgresql?: {
      host: string
      port: number
      database: string
      username: string
      password: string
      ssl: boolean
    }
  }
  
  migration: {
    phase: 'setup' | 'abstraction' | 'migration' | 'validation' | 'production'
    enableFallback: boolean
    performanceMonitoring: boolean
  }
}

export function loadConfig(): AppConfig {
  const env = process.env.NODE_ENV || 'development'
  
  return {
    environment: env as any,
    
    database: {
      type: (process.env.DATABASE_TYPE as any) || 'supabase',
      supabase: {
        url: process.env.SUPABASE_URL!,
        anonKey: process.env.SUPABASE_ANON_KEY!,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!
      }
    },
    
    migration: {
      phase: (process.env.MIGRATION_PHASE as any) || 'setup',
      enableFallback: process.env.ENABLE_FALLBACK === 'true',
      performanceMonitoring: process.env.PERFORMANCE_MONITORING === 'true'
    }
  }
}
```

### 1.4 Migration Tooling

```typescript
// src/migration-tools/migration-tracker.ts
export class MigrationTracker {
  private db: IDatabaseService
  private logger: ILogger
  
  constructor(db: IDatabaseService, logger: ILogger) {
    this.db = db
    this.logger = logger
  }
  
  async recordMigrationStart(component: string, phase: string): Promise<void> {
    await this.db.create('migration_log', {
      component,
      phase,
      status: 'started',
      started_at: new Date(),
      metadata: {
        version: '4.2.0',
        node_version: process.version,
        timestamp: Date.now()
      }
    })
    
    this.logger.info('Migration started', { component, phase })
  }
  
  async recordMigrationComplete(component: string, phase: string, metrics?: any): Promise<void> {
    const result = await this.db.read('migration_log', {
      where: {
        component,
        phase,
        status: 'started'
      },
      orderBy: { started_at: 'desc' },
      limit: 1
    })
    
    if (result.success && result.data.length > 0) {
      const logEntry = result.data[0]
      await this.db.update('migration_log', logEntry.id, {
        status: 'completed',
        completed_at: new Date(),
        duration: Date.now() - new Date(logEntry.started_at).getTime(),
        metrics
      })
    }
    
    this.logger.info('Migration completed', { component, phase, metrics })
  }
  
  async recordMigrationError(component: string, phase: string, error: Error): Promise<void> {
    const result = await this.db.read('migration_log', {
      where: {
        component,
        phase,
        status: 'started'
      },
      orderBy: { started_at: 'desc' },
      limit: 1
    })
    
    if (result.success && result.data.length > 0) {
      const logEntry = result.data[0]
      await this.db.update('migration_log', logEntry.id, {
        status: 'failed',
        failed_at: new Date(),
        error_message: error.message,
        error_stack: error.stack
      })
    }
    
    this.logger.error('Migration failed', { component, phase, error: error.message })
  }
}
```

---

## Phase 2: Service Abstraction

### 2.1 Repository Pattern Implementation

#### Agent Repository Migration

```typescript
// src/repositories/agent-repository.ts - NEW
import { IDatabaseService } from '@/interfaces/database'
import { Agent, AgentCreateData, AgentQuery } from '@/types/agent'
import { Result } from '@/utils/result'

export interface IAgentRepository {
  create(data: AgentCreateData): Promise<Result<Agent, DatabaseError>>
  findById(id: string): Promise<Result<Agent | null, DatabaseError>>
  findMany(query: AgentQuery): Promise<Result<Agent[], DatabaseError>>
  update(id: string, data: Partial<Agent>): Promise<Result<Agent, DatabaseError>>
  delete(id: string): Promise<Result<boolean, DatabaseError>>
  
  // Complex queries
  findByCapability(capability: string): Promise<Result<Agent[], DatabaseError>>
  findActiveAgents(): Promise<Result<Agent[], DatabaseError>>
  getAgentMetrics(id: string): Promise<Result<AgentMetrics, DatabaseError>>
}

export class AgentRepository implements IAgentRepository {
  constructor(private db: IDatabaseService) {}
  
  async create(data: AgentCreateData): Promise<Result<Agent, DatabaseError>> {
    return this.db.create<Agent>('agents', {
      ...data,
      id: generateUUID(),
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    })
  }
  
  async findById(id: string): Promise<Result<Agent | null, DatabaseError>> {
    const result = await this.db.read<Agent>('agents', {
      where: { id },
      limit: 1
    })
    
    if (!result.success) {
      return result
    }
    
    return Result.success(result.data[0] || null)
  }
  
  async findByCapability(capability: string): Promise<Result<Agent[], DatabaseError>> {
    return this.db.read<Agent>('agents', {
      where: {
        capabilities: { contains: [capability] },
        status: 'active'
      },
      orderBy: { created_at: 'desc' }
    })
  }
  
  async getAgentMetrics(id: string): Promise<Result<AgentMetrics, DatabaseError>> {
    const query = `
      SELECT 
        a.id,
        a.name,
        a.type,
        a.status,
        COUNT(t.id) as task_count,
        AVG(CASE WHEN t.status = 'completed' THEN 1.0 ELSE 0.0 END) as success_rate,
        AVG(t.duration) as avg_duration
      FROM agents a
      LEFT JOIN tasks t ON a.id = t.agent_id
      WHERE a.id = :agent_id
      GROUP BY a.id, a.name, a.type, a.status
    `
    
    const result = await this.db.rawQuery<AgentMetrics>(query, { agent_id: id })
    return Result.map(result, metrics => metrics[0])
  }
}
```

#### Migrate Existing Agent Service

```typescript
// src/services/agent-service.ts - UPDATED
// Before: Direct Supabase usage
/*
import { createClient } from '@supabase/supabase-js'

export class AgentService {
  private supabase = createClient(url, key)
  
  async createAgent(data: AgentCreateData): Promise<Agent> {
    const { data: agent, error } = await this.supabase
      .from('agents')
      .insert(data)
      .select()
      .single()
    
    if (error) throw error
    return agent
  }
}
*/

// After: Repository pattern with abstraction
import { IAgentRepository } from '@/repositories/agent-repository'
import { ILogger } from '@/interfaces/logger'
import { Result } from '@/utils/result'

export class AgentService {
  constructor(
    private agentRepo: IAgentRepository,
    private logger: ILogger
  ) {}
  
  async createAgent(data: AgentCreateData): Promise<Result<Agent, AgentError>> {
    // Validation
    const validation = this.validateAgentData(data)
    if (!validation.success) {
      return Result.failure(new AgentValidationError('Invalid agent data', validation.error))
    }
    
    // Create agent
    const result = await this.agentRepo.create(data)
    
    if (result.success) {
      this.logger.info('Agent created successfully', {
        agentId: result.data.id,
        name: result.data.name
      })
    } else {
      this.logger.error('Agent creation failed', {
        error: result.error.message,
        data
      })
    }
    
    return result
  }
  
  private validateAgentData(data: AgentCreateData): Result<void, ValidationError> {
    if (!data.name?.trim()) {
      return Result.failure(new ValidationError('Agent name is required'))
    }
    
    if (!data.type) {
      return Result.failure(new ValidationError('Agent type is required'))
    }
    
    if (!data.capabilities || data.capabilities.length === 0) {
      return Result.failure(new ValidationError('At least one capability is required'))
    }
    
    return Result.success(undefined)
  }
}
```

### 2.2 Progressive Component Migration

#### Migration Script for Services

```typescript
// migration-tools/component-migrator.ts
export class ComponentMigrator {
  private tracker: MigrationTracker
  private container: Container
  
  constructor(tracker: MigrationTracker, container: Container) {
    this.tracker = tracker
    this.container = container
  }
  
  async migrateComponent(componentName: string): Promise<void> {
    await this.tracker.recordMigrationStart(componentName, 'abstraction')
    
    try {
      switch (componentName) {
        case 'agent-service':
          await this.migrateAgentService()
          break
        case 'trust-service':
          await this.migrateTrustService()
          break
        case 'task-service':
          await this.migrateTaskService()
          break
        default:
          throw new Error(`Unknown component: ${componentName}`)
      }
      
      await this.tracker.recordMigrationComplete(componentName, 'abstraction')
    } catch (error) {
      await this.tracker.recordMigrationError(componentName, 'abstraction', error)
      throw error
    }
  }
  
  private async migrateAgentService(): Promise<void> {
    // 1. Create new repository
    const db = this.container.get<IDatabaseService>('DatabaseService')
    const logger = this.container.get<ILogger>('Logger')
    const agentRepo = new AgentRepository(db)
    
    // 2. Test repository functionality
    const testResult = await this.testRepository(agentRepo)
    if (!testResult.success) {
      throw new Error(`Repository test failed: ${testResult.error}`)
    }
    
    // 3. Register new service
    this.container.bind<IAgentRepository>('AgentRepository')
      .toConstantValue(agentRepo)
    
    const newAgentService = new AgentService(agentRepo, logger)
    
    // 4. Test new service
    const serviceTestResult = await this.testAgentService(newAgentService)
    if (!serviceTestResult.success) {
      throw new Error(`Service test failed: ${serviceTestResult.error}`)
    }
    
    // 5. Replace old service registration
    this.container.rebind<AgentService>('AgentService')
      .toConstantValue(newAgentService)
  }
  
  private async testRepository(repo: IAgentRepository): Promise<Result<void, Error>> {
    try {
      // Test create
      const createResult = await repo.create({
        name: 'Migration Test Agent',
        type: 'AI_LEADER',
        capabilities: ['testing']
      })
      
      if (!createResult.success) {
        return Result.failure(createResult.error)
      }
      
      // Test read
      const readResult = await repo.findById(createResult.data.id)
      if (!readResult.success || !readResult.data) {
        return Result.failure(new Error('Failed to read created agent'))
      }
      
      // Cleanup
      await repo.delete(createResult.data.id)
      
      return Result.success(undefined)
    } catch (error) {
      return Result.failure(error)
    }
  }
}
```

### 2.3 Gradual Frontend Migration

#### Service Layer Abstraction for Frontend

```typescript
// src/services/api-client.ts - NEW
export interface IApiClient {
  get<T>(endpoint: string, params?: any): Promise<Result<T, ApiError>>
  post<T>(endpoint: string, data?: any): Promise<Result<T, ApiError>>
  put<T>(endpoint: string, data?: any): Promise<Result<T, ApiError>>
  delete(endpoint: string): Promise<Result<void, ApiError>>
}

export class ApiClient implements IApiClient {
  private baseUrl: string
  private authToken: string | null = null
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }
  
  setAuthToken(token: string): void {
    this.authToken = token
  }
  
  async get<T>(endpoint: string, params?: any): Promise<Result<T, ApiError>> {
    const url = new URL(endpoint, this.baseUrl)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value))
      })
    }
    
    return this.makeRequest<T>('GET', url.toString())
  }
  
  async post<T>(endpoint: string, data?: any): Promise<Result<T, ApiError>> {
    const url = new URL(endpoint, this.baseUrl).toString()
    return this.makeRequest<T>('POST', url, data)
  }
  
  private async makeRequest<T>(
    method: string, 
    url: string, 
    data?: any
  ): Promise<Result<T, ApiError>> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      
      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`
      }
      
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return Result.failure(new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData
        ))
      }
      
      const responseData = await response.json()
      return Result.success(responseData)
    } catch (error) {
      return Result.failure(new ApiError('Network error', 0, error))
    }
  }
}
```

#### Update Frontend Agent Service

```typescript
// src/services/frontend-agent-service.ts - UPDATED
// Before: Direct Supabase client usage
/*
import { supabase } from '@/lib/supabase'

export const agentService = {
  async createAgent(data: AgentCreateData): Promise<Agent> {
    const { data: agent, error } = await supabase
      .from('agents')
      .insert(data)
      .select()
      .single()
    
    if (error) throw error
    return agent
  }
}
*/

// After: API client abstraction
import { IApiClient } from '@/services/api-client'
import { Result } from '@/utils/result'

export class FrontendAgentService {
  constructor(private apiClient: IApiClient) {}
  
  async createAgent(data: AgentCreateData): Promise<Result<Agent, AgentError>> {
    const result = await this.apiClient.post<{ data: Agent }>('/agents', data)
    
    if (!result.success) {
      return Result.failure(new AgentError('Failed to create agent', result.error))
    }
    
    return Result.success(result.data.data)
  }
  
  async getAgents(params?: AgentListParams): Promise<Result<Agent[], AgentError>> {
    const result = await this.apiClient.get<{ data: { items: Agent[] } }>('/agents', params)
    
    if (!result.success) {
      return Result.failure(new AgentError('Failed to fetch agents', result.error))
    }
    
    return Result.success(result.data.data.items)
  }
  
  async updateAgent(id: string, data: Partial<Agent>): Promise<Result<Agent, AgentError>> {
    const result = await this.apiClient.put<{ data: Agent }>(`/agents/${id}`, data)
    
    if (!result.success) {
      return Result.failure(new AgentError('Failed to update agent', result.error))
    }
    
    return Result.success(result.data.data)
  }
}

// Create service instance with dependency injection
const apiClient = new ApiClient(process.env.NEXT_PUBLIC_API_URL!)
export const frontendAgentService = new FrontendAgentService(apiClient)
```

---

## Phase 3: Component Migration

### 3.1 Edge Function Migration Strategy

#### Migration Wrapper Pattern

```typescript
// migration-tools/edge-function-migrator.ts
export class EdgeFunctionMigrator {
  private originalFunction: Function
  private migratedFunction: Function
  private migrationConfig: MigrationConfig
  
  constructor(
    originalFunction: Function,
    migratedFunction: Function,
    config: MigrationConfig
  ) {
    this.originalFunction = originalFunction
    this.migratedFunction = migratedFunction
    this.migrationConfig = config
  }
  
  async execute(request: Request): Promise<Response> {
    const startTime = Date.now()
    const requestId = generateRequestId()
    
    try {
      // Determine which function to use
      const useNewFunction = this.shouldUseMigratedFunction(request)
      
      let response: Response
      if (useNewFunction) {
        response = await this.executeMigratedFunction(request, requestId)
        
        // If enabled, also run original for comparison
        if (this.migrationConfig.enableComparison) {
          this.compareResults(request, requestId).catch(error => {
            console.warn('Comparison failed:', error.message)
          })
        }
      } else {
        response = await this.executeOriginalFunction(request, requestId)
      }
      
      // Record metrics
      await this.recordMetrics({
        requestId,
        usedMigratedFunction: useNewFunction,
        duration: Date.now() - startTime,
        success: true
      })
      
      return response
    } catch (error) {
      await this.recordMetrics({
        requestId,
        usedMigratedFunction: false, // Fallback to original on error
        duration: Date.now() - startTime,
        success: false,
        error: error.message
      })
      
      // Fallback to original function on error
      if (this.migrationConfig.enableFallback) {
        return this.executeOriginalFunction(request, requestId)
      }
      
      throw error
    }
  }
  
  private shouldUseMigratedFunction(request: Request): boolean {
    // Gradual rollout based on configuration
    if (this.migrationConfig.rolloutPercentage === 100) {
      return true
    }
    
    if (this.migrationConfig.rolloutPercentage === 0) {
      return false
    }
    
    // Use request ID for deterministic rollout
    const hash = this.hashString(request.url)
    return (hash % 100) < this.migrationConfig.rolloutPercentage
  }
  
  private async executeOriginalFunction(request: Request, requestId: string): Promise<Response> {
    console.log(`[${requestId}] Using original function`)
    return this.originalFunction(request)
  }
  
  private async executeMigratedFunction(request: Request, requestId: string): Promise<Response> {
    console.log(`[${requestId}] Using migrated function`)
    return this.migratedFunction(request)
  }
  
  private async compareResults(request: Request, requestId: string): Promise<void> {
    try {
      const [originalResponse, migratedResponse] = await Promise.all([
        this.originalFunction(request.clone()),
        this.migratedFunction(request.clone())
      ])
      
      const originalData = await originalResponse.json()
      const migratedData = await migratedResponse.json()
      
      const isEquivalent = this.compareResponses(originalData, migratedData)
      
      await this.recordComparison({
        requestId,
        isEquivalent,
        originalResponse: originalData,
        migratedResponse: migratedData
      })
    } catch (error) {
      console.warn(`[${requestId}] Comparison failed:`, error.message)
    }
  }
  
  private compareResponses(original: any, migrated: any): boolean {
    // Implement deep comparison logic
    return JSON.stringify(this.normalizeResponse(original)) === 
           JSON.stringify(this.normalizeResponse(migrated))
  }
  
  private normalizeResponse(response: any): any {
    // Remove timestamp fields and other non-deterministic data
    const normalized = { ...response }
    delete normalized.timestamp
    delete normalized.processing_time
    delete normalized.request_id
    return normalized
  }
}
```

#### Example: Migrate Agent Coordinator Function

```typescript
// supabase/functions/agent-coordinator-v4/index.ts - MIGRATED
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createContainer } from '../_shared/di-container.ts'
import { MigrationConfig } from '../_shared/migration-config.ts'

// Original function (preserved)
async function originalCoordinatorFunction(req: Request): Promise<Response> {
  // Original Supabase-coupled implementation
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  const { task_id, strategy } = await req.json()
  
  // Direct database operations
  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .eq('status', 'active')
  
  // ... rest of original implementation
  
  return new Response(JSON.stringify({ success: true, data: result }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Migrated function (new abstracted implementation)
async function migratedCoordinatorFunction(req: Request): Promise<Response> {
  const container = createContainer()
  const coordinationService = container.get('CoordinationService')
  const logger = container.get('Logger')
  
  try {
    const { task_id, strategy } = await req.json()
    
    // Use abstracted service
    const result = await coordinationService.coordinateTask(task_id, {
      strategy,
      timeout: 30000,
      retryAttempts: 3
    })
    
    if (!result.success) {
      logger.error('Task coordination failed', {
        taskId: task_id,
        error: result.error.message
      })
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.error.message 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    logger.info('Task coordination completed', {
      taskId: task_id,
      agentsUsed: result.data.agentsUsed.length
    })
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: result.data 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    logger.error('Unexpected error in task coordination', {
      error: error.message,
      stack: error.stack
    })
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}

// Migration wrapper
const migrationConfig: MigrationConfig = {
  rolloutPercentage: parseInt(Deno.env.get('MIGRATION_ROLLOUT_PERCENTAGE') || '10'),
  enableFallback: Deno.env.get('MIGRATION_ENABLE_FALLBACK') === 'true',
  enableComparison: Deno.env.get('MIGRATION_ENABLE_COMPARISON') === 'true'
}

const migrator = new EdgeFunctionMigrator(
  originalCoordinatorFunction,
  migratedCoordinatorFunction,
  migrationConfig
)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  return migrator.execute(req)
})
```

### 3.2 Database Schema Compatibility

#### Schema Migration Script

```sql
-- Migration: Add compatibility layer for abstracted components
-- File: supabase/migrations/20240101000000_add_migration_support.sql

-- Create migration tracking table
CREATE TABLE IF NOT EXISTS migration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component VARCHAR(100) NOT NULL,
  phase VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- milliseconds
  error_message TEXT,
  error_stack TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component VARCHAR(100) NOT NULL,
  operation VARCHAR(100) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  duration INTEGER NOT NULL, -- milliseconds
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_migration_log_component_phase ON migration_log(component, phase);
CREATE INDEX idx_migration_log_status ON migration_log(status);
CREATE INDEX idx_performance_metrics_component ON performance_metrics(component, operation);
CREATE INDEX idx_performance_metrics_recorded_at ON performance_metrics(recorded_at);

-- Create view for migration status
CREATE OR REPLACE VIEW migration_status AS
SELECT 
  component,
  phase,
  status,
  started_at,
  completed_at,
  duration,
  error_message
FROM migration_log
WHERE id IN (
  SELECT DISTINCT ON (component, phase) id
  FROM migration_log
  ORDER BY component, phase, started_at DESC
);

-- Create function for performance monitoring
CREATE OR REPLACE FUNCTION record_performance_metric(
  p_component VARCHAR(100),
  p_operation VARCHAR(100),
  p_provider VARCHAR(50),
  p_duration INTEGER,
  p_success BOOLEAN DEFAULT true,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  metric_id UUID;
BEGIN
  INSERT INTO performance_metrics (
    component, operation, provider, duration, success, error_message, metadata
  ) VALUES (
    p_component, p_operation, p_provider, p_duration, p_success, p_error_message, p_metadata
  ) RETURNING id INTO metric_id;
  
  RETURN metric_id;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT ALL ON migration_log TO authenticated;
GRANT ALL ON performance_metrics TO authenticated;
GRANT SELECT ON migration_status TO authenticated;
```

### 3.3 Component-by-Component Migration

#### Migration Execution Script

```typescript
// scripts/migrate-components.ts
import { createContainer } from '../src/di/container'
import { ComponentMigrator } from '../src/migration-tools/component-migrator'
import { MigrationTracker } from '../src/migration-tools/migration-tracker'
import { loadConfig } from '../src/config/app-config'

interface ComponentMigrationPlan {
  name: string
  dependencies: string[]
  estimatedDuration: number // minutes
  riskLevel: 'low' | 'medium' | 'high'
  rollbackComplexity: 'simple' | 'moderate' | 'complex'
}

const migrationPlan: ComponentMigrationPlan[] = [
  {
    name: 'agent-repository',
    dependencies: [],
    estimatedDuration: 30,
    riskLevel: 'low',
    rollbackComplexity: 'simple'
  },
  {
    name: 'agent-service',
    dependencies: ['agent-repository'],
    estimatedDuration: 45,
    riskLevel: 'medium',
    rollbackComplexity: 'moderate'
  },
  {
    name: 'trust-service',
    dependencies: ['agent-repository'],
    estimatedDuration: 60,
    riskLevel: 'medium',
    rollbackComplexity: 'moderate'
  },
  {
    name: 'coordination-service',
    dependencies: ['agent-service', 'trust-service'],
    estimatedDuration: 90,
    riskLevel: 'high',
    rollbackComplexity: 'complex'
  },
  {
    name: 'edge-functions',
    dependencies: ['coordination-service'],
    estimatedDuration: 120,
    riskLevel: 'high',
    rollbackComplexity: 'complex'
  }
]

async function executeComponentMigration(): Promise<void> {
  const config = loadConfig()
  const container = createContainer(config)
  const tracker = container.get<MigrationTracker>('MigrationTracker')
  const migrator = new ComponentMigrator(tracker, container)
  
  console.log('Starting component migration...')
  console.log(`Total components to migrate: ${migrationPlan.length}`)
  
  for (const component of migrationPlan) {
    console.log(`\n🔄 Migrating component: ${component.name}`)
    console.log(`   Dependencies: ${component.dependencies.join(', ') || 'None'}`)
    console.log(`   Estimated duration: ${component.estimatedDuration} minutes`)
    console.log(`   Risk level: ${component.riskLevel}`)
    
    try {
      // Check dependencies
      const dependenciesReady = await checkDependencies(component.dependencies, tracker)
      if (!dependenciesReady) {
        throw new Error(`Dependencies not ready for ${component.name}`)
      }
      
      // Execute migration
      const startTime = Date.now()
      await migrator.migrateComponent(component.name)
      const duration = Date.now() - startTime
      
      console.log(`   ✅ Migration completed in ${Math.round(duration / 1000)}s`)
      
      // Run post-migration validation
      const validationResult = await validateComponent(component.name, container)
      if (!validationResult.success) {
        throw new Error(`Validation failed: ${validationResult.error}`)
      }
      
      console.log(`   ✅ Validation passed`)
      
    } catch (error) {
      console.error(`   ❌ Migration failed: ${error.message}`)
      
      // Decide whether to continue or abort
      if (component.riskLevel === 'high') {
        console.error('High-risk component failed. Aborting migration.')
        await rollbackComponent(component.name, migrator)
        throw error
      } else {
        console.warn('Low/medium-risk component failed. Continuing with migration.')
        await rollbackComponent(component.name, migrator)
      }
    }
  }
  
  console.log('\n✅ All components migrated successfully!')
}

async function checkDependencies(
  dependencies: string[], 
  tracker: MigrationTracker
): Promise<boolean> {
  for (const dependency of dependencies) {
    const status = await tracker.getComponentStatus(dependency)
    if (status !== 'completed') {
      console.log(`   ⚠️  Dependency ${dependency} not ready (status: ${status})`)
      return false
    }
  }
  return true
}

async function validateComponent(
  componentName: string, 
  container: Container
): Promise<{ success: boolean; error?: string }> {
  try {
    switch (componentName) {
      case 'agent-repository':
        return await validateAgentRepository(container)
      case 'agent-service':
        return await validateAgentService(container)
      // Add other component validations
      default:
        return { success: true }
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function validateAgentRepository(container: Container): Promise<{ success: boolean; error?: string }> {
  const repo = container.get<IAgentRepository>('AgentRepository')
  
  // Test basic CRUD operations
  const testAgent = {
    name: 'Validation Test Agent',
    type: 'AI_LEADER' as AgentType,
    capabilities: ['validation']
  }
  
  const createResult = await repo.create(testAgent)
  if (!createResult.success) {
    return { success: false, error: `Create failed: ${createResult.error.message}` }
  }
  
  const readResult = await repo.findById(createResult.data.id)
  if (!readResult.success || !readResult.data) {
    return { success: false, error: `Read failed: ${readResult.error?.message || 'Not found'}` }
  }
  
  const deleteResult = await repo.delete(createResult.data.id)
  if (!deleteResult.success) {
    return { success: false, error: `Delete failed: ${deleteResult.error.message}` }
  }
  
  return { success: true }
}

async function rollbackComponent(componentName: string, migrator: ComponentMigrator): Promise<void> {
  console.log(`   ⏪ Rolling back component: ${componentName}`)
  try {
    await migrator.rollbackComponent(componentName)
    console.log(`   ✅ Rollback completed for ${componentName}`)
  } catch (rollbackError) {
    console.error(`   ❌ Rollback failed for ${componentName}: ${rollbackError.message}`)
  }
}

// Execute migration
executeComponentMigration()
  .then(() => {
    console.log('Migration completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration failed:', error.message)
    process.exit(1)
  })
```

---

## Phase 4: Testing and Validation

### 4.1 Comprehensive Testing Strategy

#### Integration Test Suite

```typescript
// tests/integration/migration-validation.test.ts
import { createContainer } from '@/di/container'
import { loadConfig } from '@/config/app-config'
import { TestDataManager } from '@/tests/utils/test-data-manager'

describe('Migration Validation Tests', () => {
  let container: Container
  let testDataManager: TestDataManager
  
  beforeAll(async () => {
    // Use the actual configuration to test real migrations
    const config = loadConfig()
    container = createContainer(config)
    testDataManager = new TestDataManager(container)
    
    // Seed test data
    await testDataManager.seedMinimalDataset()
  })
  
  afterAll(async () => {
    await testDataManager.cleanupAll()
  })
  
  describe('Agent Management Flow', () => {
    test('should handle complete agent lifecycle', async () => {
      const agentService = container.get<IAgentService>('AgentService')
      
      // Create agent
      const createResult = await agentService.createAgent({
        name: 'Migration Test Agent',
        type: 'AI_LEADER',
        capabilities: ['analysis', 'coordination']
      })
      
      expect(createResult.success).toBe(true)
      expect(createResult.data.id).toBeDefined()
      
      const agentId = createResult.data.id
      
      // Read agent
      const readResult = await agentService.getAgent(agentId)
      expect(readResult.success).toBe(true)
      expect(readResult.data?.name).toBe('Migration Test Agent')
      
      // Update agent
      const updateResult = await agentService.updateAgent(agentId, {
        status: 'inactive'
      })
      expect(updateResult.success).toBe(true)
      expect(updateResult.data.status).toBe('inactive')
      
      // Delete agent
      const deleteResult = await agentService.deleteAgent(agentId)
      expect(deleteResult.success).toBe(true)
      
      // Verify deletion
      const verifyResult = await agentService.getAgent(agentId)
      expect(verifyResult.success).toBe(false)
    })
  })
  
  describe('Cross-Service Integration', () => {
    test('should coordinate between agent and trust services', async () => {
      const agentService = container.get<IAgentService>('AgentService')
      const trustService = container.get<ITrustService>('TrustService')
      
      // Create agent
      const agent = await agentService.createAgent({
        name: 'Trust Test Agent',
        type: 'AI_LEADER',
        capabilities: ['trust_analysis']
      })
      
      expect(agent.success).toBe(true)
      
      // Calculate trust score
      const trustResult = await trustService.calculateTrustScore(agent.data.id)
      expect(trustResult.success).toBe(true)
      expect(trustResult.data.score).toBeGreaterThanOrEqual(0)
      expect(trustResult.data.score).toBeLessThanOrEqual(5)
      
      // Update trust score
      const updateResult = await trustService.updateTrustScore(agent.data.id, {
        score: 4.5,
        reason: 'High performance in test'
      })
      
      expect(updateResult.success).toBe(true)
      
      // Verify agent reflects new trust score
      const updatedAgent = await agentService.getAgent(agent.data.id)
      expect(updatedAgent.success).toBe(true)
      expect(updatedAgent.data?.trustScore).toBe(4.5)
    })
  })
  
  describe('Performance Validation', () => {
    test('should maintain acceptable performance standards', async () => {
      const agentService = container.get<IAgentService>('AgentService')
      
      // Baseline performance test
      const operations = 50
      const startTime = Date.now()
      
      const promises = Array.from({ length: operations }, (_, i) => 
        agentService.createAgent({
          name: `Performance Test Agent ${i}`,
          type: 'AI_LEADER',
          capabilities: ['performance_testing']
        })
      )
      
      const results = await Promise.all(promises)
      const duration = Date.now() - startTime
      
      // All operations should succeed
      expect(results.every(r => r.success)).toBe(true)
      
      // Performance should be reasonable (adjust based on baseline)
      const avgDuration = duration / operations
      expect(avgDuration).toBeLessThan(1000) // Less than 1 second per operation
      
      console.log(`Performance test: ${operations} operations in ${duration}ms (${avgDuration}ms avg)`)
    })
  })
})
```

### 4.2 Provider Compatibility Testing

```typescript
// tests/integration/provider-compatibility.test.ts
const providers = [
  { name: 'Supabase', type: 'supabase' },
  { name: 'PostgreSQL', type: 'postgresql' },
  { name: 'Mock', type: 'mock' }
]

providers.forEach(({ name, type }) => {
  describe(`${name} Provider Compatibility`, () => {
    let container: Container
    
    beforeEach(async () => {
      const config = {
        ...loadConfig(),
        database: { type: type as any, ...getProviderConfig(type) }
      }
      container = createContainer(config)
    })
    
    test('should support all database operations', async () => {
      const db = container.get<IDatabaseService>('DatabaseService')
      await db.connect()
      
      // Test CRUD operations
      const createResult = await db.create('test_table', {
        name: 'Test Item',
        value: 42
      })
      
      expect(createResult.success).toBe(true)
      
      const readResult = await db.read('test_table', {
        where: { id: createResult.data.id }
      })
      
      expect(readResult.success).toBe(true)
      expect(readResult.data[0]?.name).toBe('Test Item')
      
      await db.disconnect()
    })
    
    test('should handle complex queries consistently', async () => {
      const db = container.get<IDatabaseService>('DatabaseService')
      await db.connect()
      
      // Seed test data
      await db.createMany('test_table', [
        { name: 'Item A', category: 'alpha', value: 10 },
        { name: 'Item B', category: 'beta', value: 20 },
        { name: 'Item C', category: 'alpha', value: 30 }
      ])
      
      // Complex query
      const result = await db.read('test_table', {
        where: {
          category: 'alpha',
          value: { gte: 15 }
        },
        orderBy: { value: 'desc' },
        limit: 10
      })
      
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('Item C')
      
      await db.disconnect()
    })
  })
})
```

### 4.3 Data Integrity Validation

```typescript
// tests/integration/data-integrity.test.ts
describe('Data Integrity Validation', () => {
  test('should maintain data consistency across migrations', async () => {
    // Create test data using old interface
    const legacyData = await createLegacyTestData()
    
    // Verify data using new interface
    const migratedContainer = createContainer(loadConfig())
    const agentService = migratedContainer.get<IAgentService>('AgentService')
    
    for (const legacyAgent of legacyData.agents) {
      const result = await agentService.getAgent(legacyAgent.id)
      
      expect(result.success).toBe(true)
      expect(result.data?.name).toBe(legacyAgent.name)
      expect(result.data?.type).toBe(legacyAgent.type)
      expect(result.data?.capabilities).toEqual(legacyAgent.capabilities)
    }
  })
  
  test('should preserve complex relationships', async () => {
    // Test agent-task relationships
    const agentService = container.get<IAgentService>('AgentService')
    const taskService = container.get<ITaskService>('TaskService')
    
    const agent = await agentService.createAgent({
      name: 'Relationship Test Agent',
      type: 'AI_LEADER',
      capabilities: ['task_management']
    })
    
    const task = await taskService.createTask({
      name: 'Relationship Test Task',
      assignedAgentId: agent.data.id,
      type: 'ANALYSIS'
    })
    
    // Verify relationship integrity
    const agentTasks = await taskService.getTasksByAgent(agent.data.id)
    expect(agentTasks.success).toBe(true)
    expect(agentTasks.data).toHaveLength(1)
    expect(agentTasks.data[0].id).toBe(task.data.id)
  })
})
```

---

## Phase 5: Production Deployment

### 5.1 Blue-Green Deployment Strategy

```yaml
# deployment/blue-green-deployment.yml
apiVersion: v1
kind: ConfigMap
metadata:
  name: deployment-config
data:
  DEPLOYMENT_STRATEGY: "blue-green"
  MIGRATION_PHASE: "production"
  ROLLOUT_PERCENTAGE: "10"
  ENABLE_FALLBACK: "true"
  ENABLE_MONITORING: "true"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: truststream-v42-green
  labels:
    app: truststream
    version: v4.2
    slot: green
spec:
  replicas: 3
  selector:
    matchLabels:
      app: truststream
      version: v4.2
      slot: green
  template:
    metadata:
      labels:
        app: truststream
        version: v4.2
        slot: green
    spec:
      containers:
      - name: app
        image: truststream:v4.2-latest
        env:
        - name: DATABASE_TYPE
          value: "supabase"
        - name: MIGRATION_PHASE
          value: "production"
        - name: ROLLOUT_PERCENTAGE
          value: "10"
        - name: ENABLE_FALLBACK
          value: "true"
        ports:
        - containerPort: 3000
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
```

### 5.2 Gradual Traffic Shifting

```typescript
// deployment/traffic-manager.ts
export class TrafficManager {
  private currentRolloutPercentage: number = 0
  private maxRolloutPercentage: number
  private rolloutStep: number
  private rolloutInterval: number
  
  constructor(config: TrafficManagerConfig) {
    this.maxRolloutPercentage = config.maxRolloutPercentage || 100
    this.rolloutStep = config.rolloutStep || 10
    this.rolloutInterval = config.rolloutInterval || 300000 // 5 minutes
  }
  
  async startGradualRollout(): Promise<void> {
    console.log('Starting gradual rollout...')
    
    while (this.currentRolloutPercentage < this.maxRolloutPercentage) {
      // Increase rollout percentage
      this.currentRolloutPercentage = Math.min(
        this.currentRolloutPercentage + this.rolloutStep,
        this.maxRolloutPercentage
      )
      
      console.log(`Increasing rollout to ${this.currentRolloutPercentage}%`)
      
      // Update configuration
      await this.updateRolloutConfiguration(this.currentRolloutPercentage)
      
      // Wait for rollout interval
      await this.waitForInterval()
      
      // Check health metrics
      const healthCheck = await this.checkSystemHealth()
      if (!healthCheck.healthy) {
        console.error('Health check failed. Rolling back...')
        await this.emergencyRollback()
        throw new Error(`Rollout failed: ${healthCheck.reason}`)
      }
      
      console.log(`Rollout to ${this.currentRolloutPercentage}% successful`)
    }
    
    console.log('Gradual rollout completed successfully!')
  }
  
  private async updateRolloutConfiguration(percentage: number): Promise<void> {
    // Update environment variables or configuration
    process.env.MIGRATION_ROLLOUT_PERCENTAGE = percentage.toString()
    
    // Update load balancer or service mesh configuration
    await this.updateLoadBalancer({
      blueWeight: 100 - percentage,
      greenWeight: percentage
    })
  }
  
  private async checkSystemHealth(): Promise<{ healthy: boolean; reason?: string }> {
    try {
      // Check error rates
      const errorRate = await this.getErrorRate()
      if (errorRate > 0.05) { // 5% error rate threshold
        return { healthy: false, reason: `High error rate: ${errorRate * 100}%` }
      }
      
      // Check response times
      const avgResponseTime = await this.getAverageResponseTime()
      if (avgResponseTime > 2000) { // 2 second threshold
        return { healthy: false, reason: `High response time: ${avgResponseTime}ms` }
      }
      
      // Check database performance
      const dbHealth = await this.checkDatabaseHealth()
      if (!dbHealth.healthy) {
        return { healthy: false, reason: `Database issues: ${dbHealth.reason}` }
      }
      
      return { healthy: true }
    } catch (error) {
      return { healthy: false, reason: `Health check error: ${error.message}` }
    }
  }
  
  private async emergencyRollback(): Promise<void> {
    console.log('Initiating emergency rollback...')
    
    // Immediately route all traffic to blue (stable) deployment
    await this.updateLoadBalancer({
      blueWeight: 100,
      greenWeight: 0
    })
    
    // Reset rollout percentage
    this.currentRolloutPercentage = 0
    await this.updateRolloutConfiguration(0)
    
    console.log('Emergency rollback completed')
  }
}
```

### 5.3 Monitoring and Alerting

```typescript
// monitoring/migration-monitor.ts
export class MigrationMonitor {
  private metricsCollector: MetricsCollector
  private alertManager: AlertManager
  
  constructor(
    metricsCollector: MetricsCollector,
    alertManager: AlertManager
  ) {
    this.metricsCollector = metricsCollector
    this.alertManager = alertManager
  }
  
  async startMonitoring(): Promise<void> {
    // Monitor key metrics every 30 seconds
    setInterval(async () => {
      await this.collectAndAnalyzeMetrics()
    }, 30000)
    
    console.log('Migration monitoring started')
  }
  
  private async collectAndAnalyzeMetrics(): Promise<void> {
    const metrics = await this.metricsCollector.collect()
    
    // Analyze error rates
    if (metrics.errorRate > 0.05) {
      await this.alertManager.sendAlert({
        level: 'critical',
        message: `High error rate detected: ${metrics.errorRate * 100}%`,
        metrics
      })
    }
    
    // Analyze response times
    if (metrics.p95ResponseTime > 3000) {
      await this.alertManager.sendAlert({
        level: 'warning',
        message: `High response times: P95 = ${metrics.p95ResponseTime}ms`,
        metrics
      })
    }
    
    // Analyze provider performance differences
    const providerDiff = this.analyzeProviderPerformance(metrics)
    if (providerDiff.significantDifference) {
      await this.alertManager.sendAlert({
        level: 'info',
        message: `Provider performance difference detected`,
        metrics: providerDiff
      })
    }
    
    // Store metrics for historical analysis
    await this.metricsCollector.store(metrics)
  }
  
  private analyzeProviderPerformance(metrics: SystemMetrics): ProviderComparison {
    const supabaseMetrics = metrics.providers.supabase
    const abstractedMetrics = metrics.providers.abstracted
    
    const responseTimeDiff = Math.abs(
      supabaseMetrics.avgResponseTime - abstractedMetrics.avgResponseTime
    )
    
    const errorRateDiff = Math.abs(
      supabaseMetrics.errorRate - abstractedMetrics.errorRate
    )
    
    return {
      significantDifference: responseTimeDiff > 500 || errorRateDiff > 0.02,
      responseTimeDifference: responseTimeDiff,
      errorRateDifference: errorRateDiff,
      recommendation: this.generateRecommendation(responseTimeDiff, errorRateDiff)
    }
  }
}
```

---

## Rollback Procedures

### 6.1 Immediate Rollback (Emergency)

```typescript
// scripts/emergency-rollback.ts
export class EmergencyRollback {
  private container: Container
  private logger: ILogger
  
  constructor() {
    this.container = createContainer(loadConfig())
    this.logger = this.container.get<ILogger>('Logger')
  }
  
  async executeEmergencyRollback(): Promise<void> {
    this.logger.error('EMERGENCY ROLLBACK INITIATED')
    
    try {
      // 1. Immediately disable new abstracted code
      await this.disableAbstractedComponents()
      
      // 2. Route all traffic to original implementation
      await this.routeToOriginalImplementation()
      
      // 3. Verify system stability
      await this.verifySystemStability()
      
      // 4. Notify stakeholders
      await this.notifyStakeholders('emergency_rollback_complete')
      
      this.logger.info('Emergency rollback completed successfully')
    } catch (error) {
      this.logger.error('Emergency rollback failed', { error: error.message })
      throw error
    }
  }
  
  private async disableAbstractedComponents(): Promise<void> {
    // Update environment variables
    process.env.MIGRATION_ROLLOUT_PERCENTAGE = '0'
    process.env.ENABLE_FALLBACK = 'true'
    process.env.FORCE_ORIGINAL_IMPLEMENTATION = 'true'
    
    // Update database configuration
    const db = this.container.get<IDatabaseService>('DatabaseService')
    await db.rawQuery(`
      UPDATE system_config 
      SET value = '0' 
      WHERE key = 'migration_rollout_percentage'
    `)
    
    this.logger.info('Abstracted components disabled')
  }
  
  private async routeToOriginalImplementation(): Promise<void> {
    // Force all requests to use original Supabase implementation
    const migrationFlags = {
      force_original: true,
      disable_abstraction: true,
      rollout_percentage: 0
    }
    
    await this.updateMigrationFlags(migrationFlags)
    this.logger.info('Traffic routed to original implementation')
  }
  
  private async verifySystemStability(): Promise<void> {
    const maxAttempts = 10
    const delayMs = 5000
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Test critical operations
        await this.testCriticalOperations()
        this.logger.info(`System stability check ${attempt}/${maxAttempts} passed`)
        
        if (attempt >= 3) {
          // System is stable after 3 consecutive successful checks
          this.logger.info('System stability verified')
          return
        }
        
        await new Promise(resolve => setTimeout(resolve, delayMs))
      } catch (error) {
        this.logger.error(`Stability check ${attempt} failed`, { error: error.message })
        
        if (attempt === maxAttempts) {
          throw new Error('System stability could not be verified after rollback')
        }
      }
    }
  }
  
  private async testCriticalOperations(): Promise<void> {
    // Test agent creation (should use original Supabase implementation)
    const testAgentData = {
      name: 'Rollback Test Agent',
      type: 'AI_LEADER',
      capabilities: ['testing']
    }
    
    // This should now use the original implementation
    const response = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testAgentData)
    })
    
    if (!response.ok) {
      throw new Error(`Critical operation failed: ${response.status}`)
    }
    
    const result = await response.json()
    
    // Cleanup test data
    await fetch(`/api/agents/${result.data.id}`, { method: 'DELETE' })
  }
}

// Script execution
const rollback = new EmergencyRollback()
rollback.executeEmergencyRollback()
  .then(() => {
    console.log('Emergency rollback completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Emergency rollback failed:', error.message)
    process.exit(1)
  })
```

### 6.2 Planned Rollback

```typescript
// scripts/planned-rollback.ts
export class PlannedRollback {
  async executePlannedRollback(componentName: string): Promise<void> {
    console.log(`Starting planned rollback for component: ${componentName}`)
    
    // 1. Gradually reduce traffic to new implementation
    await this.gradualTrafficReduction(componentName)
    
    // 2. Verify data consistency
    await this.verifyDataConsistency(componentName)
    
    // 3. Remove abstracted implementation
    await this.removeAbstractedImplementation(componentName)
    
    // 4. Update documentation and notifications
    await this.updateDocumentationAndNotify(componentName)
    
    console.log(`Planned rollback completed for component: ${componentName}`)
  }
  
  private async gradualTrafficReduction(componentName: string): Promise<void> {
    const steps = [75, 50, 25, 10, 0]
    
    for (const percentage of steps) {
      console.log(`Reducing traffic to ${percentage}% for ${componentName}`)
      
      await this.updateRolloutPercentage(componentName, percentage)
      await new Promise(resolve => setTimeout(resolve, 60000)) // Wait 1 minute
      
      // Monitor for issues
      const healthCheck = await this.performHealthCheck(componentName)
      if (!healthCheck.healthy) {
        console.warn(`Health check warning at ${percentage}%: ${healthCheck.warning}`)
      }
    }
  }
  
  private async verifyDataConsistency(componentName: string): Promise<void> {
    // Run data consistency checks
    const consistencyReport = await this.generateConsistencyReport(componentName)
    
    if (consistencyReport.hasInconsistencies) {
      throw new Error(`Data inconsistencies found: ${consistencyReport.issues.join(', ')}`)
    }
    
    console.log('Data consistency verified')
  }
}
```

---

## Post-Migration Optimization

### 7.1 Performance Analysis

```typescript
// analysis/performance-analyzer.ts
export class PostMigrationAnalyzer {
  async generateMigrationReport(): Promise<MigrationReport> {
    const report: MigrationReport = {
      overview: await this.generateOverview(),
      performance: await this.analyzePerformance(),
      reliability: await this.analyzeReliability(),
      costs: await this.analyzeCosts(),
      recommendations: await this.generateRecommendations()
    }
    
    return report
  }
  
  private async analyzePerformance(): Promise<PerformanceAnalysis> {
    const beforeMetrics = await this.loadBaselineMetrics()
    const afterMetrics = await this.collectCurrentMetrics()
    
    return {
      responseTimeImprovement: this.calculateImprovement(
        beforeMetrics.avgResponseTime,
        afterMetrics.avgResponseTime
      ),
      throughputImprovement: this.calculateImprovement(
        beforeMetrics.throughput,
        afterMetrics.throughput
      ),
      errorRateChange: this.calculateChange(
        beforeMetrics.errorRate,
        afterMetrics.errorRate
      ),
      resourceUtilization: await this.analyzeResourceUtilization()
    }
  }
  
  private async generateRecommendations(): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = []
    
    // Analyze provider performance
    const providerMetrics = await this.getProviderMetrics()
    if (providerMetrics.postgresql.performance > providerMetrics.supabase.performance) {
      recommendations.push({
        category: 'Performance',
        priority: 'High',
        description: 'Consider migrating primary workload to PostgreSQL provider',
        impact: 'Could improve performance by 15-20%',
        effort: 'Medium'
      })
    }
    
    // Analyze cost optimization opportunities
    const costAnalysis = await this.analyzeCostOptimization()
    if (costAnalysis.savings > 1000) {
      recommendations.push({
        category: 'Cost',
        priority: 'Medium',
        description: 'Optimize database connection pooling',
        impact: `Potential monthly savings: $${costAnalysis.savings}`,
        effort: 'Low'
      })
    }
    
    return recommendations
  }
}
```

### 7.2 Continuous Monitoring Setup

```typescript
// monitoring/continuous-monitor.ts
export class ContinuousMonitor {
  private metrics: MetricsCollector
  private alerts: AlertManager
  
  constructor() {
    this.metrics = new MetricsCollector()
    this.alerts = new AlertManager()
  }
  
  async setupContinuousMonitoring(): Promise<void> {
    // Set up performance monitoring
    this.setupPerformanceMonitoring()
    
    // Set up error monitoring
    this.setupErrorMonitoring()
    
    // Set up capacity monitoring
    this.setupCapacityMonitoring()
    
    // Set up cost monitoring
    this.setupCostMonitoring()
    
    console.log('Continuous monitoring setup completed')
  }
  
  private setupPerformanceMonitoring(): void {
    // Monitor response times every minute
    setInterval(async () => {
      const metrics = await this.metrics.collectPerformanceMetrics()
      
      if (metrics.p95ResponseTime > 2000) {
        await this.alerts.sendAlert({
          level: 'warning',
          message: `High response times detected: P95 = ${metrics.p95ResponseTime}ms`
        })
      }
    }, 60000)
  }
  
  private setupErrorMonitoring(): void {
    // Monitor error rates every 30 seconds
    setInterval(async () => {
      const errorRate = await this.metrics.getErrorRate()
      
      if (errorRate > 0.05) {
        await this.alerts.sendAlert({
          level: 'critical',
          message: `High error rate: ${errorRate * 100}%`
        })
      }
    }, 30000)
  }
}
```

---

## Conclusion

This comprehensive migration procedure provides a structured, risk-minimized approach to transitioning TrustStream from v4.1's tightly-coupled architecture to v4.2's provider-agnostic design. The key benefits include:

**Migration Benefits:**
- **Zero Downtime**: Production system remains operational throughout migration
- **Gradual Rollout**: Risk is minimized through incremental changes
- **Comprehensive Testing**: Each phase is thoroughly validated before proceeding
- **Rollback Capability**: Any phase can be reversed without data loss
- **Performance Monitoring**: Continuous validation ensures no regressions

**Post-Migration Advantages:**
- **Vendor Independence**: Freedom to switch between providers based on needs
- **Cost Optimization**: Ability to choose cost-effective providers for different workloads
- **Development Efficiency**: Faster development with mock providers and better testing
- **Scalability**: Enhanced ability to scale different components independently
- **Risk Mitigation**: Reduced dependency on single vendors

**Success Metrics:**
- Migration completed with < 0.1% error rate increase
- Performance maintained within 5% of baseline
- All functionality preserved and validated
- Development team trained and productive with new architecture
- Rollback procedures tested and documented

This migration strategy ensures TrustStream v4.2 achieves its architectural goals while maintaining system reliability and user experience throughout the transition process.

For additional guidance, refer to:
- [Development Guidelines](./development-guidelines.md)
- [Abstraction Layer Usage](./abstraction-layer-usage.md)
- [Testing Framework](./testing-framework.md)