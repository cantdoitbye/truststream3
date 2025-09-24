# Abstraction Layer Usage Guide

## Table of Contents
1. [Overview & Architecture](#overview--architecture)
2. [Service Interface Usage](#service-interface-usage)
3. [Implementation Switching](#implementation-switching)
4. [Advanced Patterns](#advanced-patterns)
5. [Performance Optimization](#performance-optimization)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

---

## Overview & Architecture

### Abstraction Layer Structure

The TrustStream v4.2 abstraction layer provides a clean separation between business logic and infrastructure concerns. This architecture enables seamless switching between different backend providers while maintaining consistent application behavior.

```
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Agent Services  │  │ Trust Services  │  │   Gov Services│ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                   Abstraction Layer                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   IDatabase     │  │     IAuth       │  │   IStorage   │ │
│  │   Interface     │  │   Interface     │  │  Interface   │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                Implementation Layer                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Supabase      │  │   PostgreSQL    │  │     Mock     │ │
│  │ Implementation  │  │ Implementation  │  │Implementation│ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Key Benefits

1. **Vendor Independence**: Switch backend providers without code changes
2. **Testing Flexibility**: Use mock implementations for unit testing
3. **Development Efficiency**: Work offline with file-based implementations
4. **Deployment Options**: Different providers for different environments
5. **Risk Mitigation**: Reduce dependency on single vendors

---

## Service Interface Usage

### Database Service Interface

#### Basic CRUD Operations

```typescript
import { container } from '@/di'
import { IDatabaseService } from '@/interfaces/database'
import { AgentCreateData, Agent } from '@/types/agent'

// Get database service from container
const db = container.resolve<IDatabaseService>('DatabaseService')

// Create operation
const createAgent = async (agentData: AgentCreateData): Promise<Result<Agent, DatabaseError>> => {
  return await db.create<Agent>('agents', agentData)
}

// Read operation with query
const findActiveAgents = async (): Promise<Result<Agent[], DatabaseError>> => {
  const query: QueryOptions = {
    where: {
      status: 'active',
      deleted_at: null
    },
    orderBy: {
      created_at: 'desc'
    },
    limit: 50
  }
  
  return await db.read<Agent>('agents', query)
}

// Update operation
const updateAgentStatus = async (
  agentId: string, 
  status: AgentStatus
): Promise<Result<Agent, DatabaseError>> => {
  return await db.update<Agent>('agents', agentId, {
    status,
    updated_at: new Date()
  })
}

// Delete operation (soft delete)
const softDeleteAgent = async (agentId: string): Promise<Result<boolean, DatabaseError>> => {
  const result = await db.update<Agent>('agents', agentId, {
    deleted_at: new Date()
  })
  
  return Result.map(result, () => true)
}
```

#### Advanced Query Patterns

```typescript
// Complex queries with joins
const getAgentWithMetrics = async (agentId: string): Promise<Result<AgentWithMetrics, DatabaseError>> => {
  const query: QueryOptions = {
    select: [
      'agents.*',
      'agent_metrics.performance_score',
      'agent_metrics.task_count',
      'agent_metrics.success_rate'
    ],
    joins: [{
      type: 'LEFT',
      table: 'agent_metrics',
      condition: 'agents.id = agent_metrics.agent_id'
    }],
    where: {
      'agents.id': agentId
    }
  }
  
  const result = await db.read<AgentWithMetrics>('agents', query)
  return Result.map(result, agents => agents[0] || null)
}

// Aggregation queries
const getAgentStatistics = async (): Promise<Result<AgentStats, DatabaseError>> => {
  const query = `
    SELECT 
      COUNT(*) as total_agents,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active_agents,
      AVG(performance_score) as avg_performance,
      MAX(created_at) as latest_creation
    FROM agents 
    WHERE deleted_at IS NULL
  `
  
  const result = await db.rawQuery<AgentStats>(query)
  return Result.map(result, stats => stats[0])
}

// Batch operations
const createMultipleAgents = async (
  agentsData: AgentCreateData[]
): Promise<Result<Agent[], DatabaseError>> => {
  return await db.createMany<Agent>('agents', agentsData)
}

// Transaction example
const deployAgentWithResources = async (
  agentData: AgentCreateData,
  resourceData: ResourceAllocation
): Promise<Result<{ agent: Agent, resources: ResourceAllocation }, DatabaseError>> => {
  const operations: TransactionOperation[] = [
    {
      type: 'CREATE',
      table: 'agents',
      data: agentData
    },
    {
      type: 'CREATE', 
      table: 'resource_allocations',
      data: resourceData
    }
  ]
  
  return await db.transaction(operations)
}
```

### Authentication Service Interface

#### User Authentication Flow

```typescript
import { IAuthService } from '@/interfaces/auth'
import { SignUpCredentials, SignInCredentials } from '@/types/auth'

const auth = container.resolve<IAuthService>('AuthService')

// Sign up new user
const signUpUser = async (credentials: SignUpCredentials): Promise<Result<AuthResult, AuthError>> => {
  const validation = validateSignUpCredentials(credentials)
  if (!validation.success) {
    return Result.failure(new AuthError('Invalid credentials', validation.error))
  }
  
  return await auth.signUp(credentials)
}

// Sign in existing user
const signInUser = async (credentials: SignInCredentials): Promise<Result<AuthResult, AuthError>> => {
  const result = await auth.signIn(credentials)
  
  if (result.success) {
    // Log successful authentication
    const logger = container.resolve<ILogger>('Logger')
    logger.info('User signed in', {
      userId: result.data.user.id,
      timestamp: new Date()
    })
  }
  
  return result
}

// Get current user with error handling
const getCurrentUser = async (): Promise<Result<User | null, AuthError>> => {
  return await safe(async () => {
    return await auth.getCurrentUser()
  })
}

// Session management
const refreshUserSession = async (): Promise<Result<Session, AuthError>> => {
  const currentSession = await auth.getSession()
  if (!currentSession) {
    return Result.failure(new AuthError('No active session'))
  }
  
  return await auth.refreshSession()
}
```

#### Role-Based Authorization

```typescript
// Permission checking
const checkUserPermission = async (
  action: string,
  resource: string
): Promise<Result<boolean, AuthError>> => {
  const user = await auth.getCurrentUser()
  if (!user) {
    return Result.failure(new AuthError('User not authenticated'))
  }
  
  const roles = await auth.getUserRoles()
  const hasPermission = await auth.hasPermission(`${action}:${resource}`)
  
  return Result.success(hasPermission)
}

// Middleware for protected routes
const requireAuth = (requiredPermission?: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    
    const validation = await auth.validateToken(token)
    if (!validation.success) {
      return res.status(401).json({ error: 'Invalid token' })
    }
    
    if (requiredPermission) {
      const hasPermission = await auth.hasPermission(requiredPermission)
      if (!hasPermission) {
        return res.status(403).json({ error: 'Insufficient permissions' })
      }
    }
    
    req.user = validation.data.user
    next()
  }
}
```

### Storage Service Interface

#### File Upload and Management

```typescript
import { IStorageService } from '@/interfaces/storage'
import { UploadOptions, FileMetadata } from '@/types/storage'

const storage = container.resolve<IStorageService>('StorageService')

// Upload file with validation
const uploadAgentAvatar = async (
  agentId: string,
  file: File
): Promise<Result<UploadResult, StorageError>> => {
  // Validate file type and size
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return Result.failure(new StorageError('Invalid file type'))
  }
  
  if (file.size > 5 * 1024 * 1024) { // 5MB limit
    return Result.failure(new StorageError('File too large'))
  }
  
  const options: UploadOptions = {
    contentType: file.type,
    metadata: {
      agentId,
      uploadedBy: await getCurrentUserId(),
      uploadedAt: new Date().toISOString()
    },
    public: true
  }
  
  const path = `agent-avatars/${agentId}/${Date.now()}-${file.name}`
  return await storage.upload(path, file, options)
}

// Download file with error handling
const downloadAgentData = async (agentId: string): Promise<Result<ArrayBuffer, StorageError>> => {
  const path = `agent-exports/${agentId}/data.json`
  
  // Check if file exists first
  const metadata = await storage.getMetadata(path)
  if (!metadata) {
    return Result.failure(new StorageError('File not found'))
  }
  
  return await storage.download(path)
}

// Batch file operations
const uploadAgentDocuments = async (
  agentId: string,
  files: File[]
): Promise<Result<UploadResult[], StorageError>> => {
  const uploads: FileUpload[] = files.map((file, index) => ({
    path: `agent-documents/${agentId}/${Date.now()}-${index}-${file.name}`,
    file,
    options: {
      contentType: file.type,
      metadata: { agentId }
    }
  }))
  
  return await storage.uploadMultiple(uploads)
}

// Generate signed URLs for secure access
const getSecureFileUrl = async (
  filePath: string,
  expiresInHours: number = 24
): Promise<Result<string, StorageError>> => {
  const expiresIn = expiresInHours * 60 * 60 // Convert to seconds
  return await storage.getSignedUrl(filePath, expiresIn)
}
```

### Real-time Service Interface

#### Channel Management and Events

```typescript
import { IRealtimeService, IChannel } from '@/interfaces/realtime'
import { RealtimePayload, PresencePayload } from '@/types/realtime'

const realtime = container.resolve<IRealtimeService>('RealtimeService')

// Agent status monitoring
const monitorAgentStatus = async (agentId: string): Promise<void> => {
  // Subscribe to database changes
  const unsubscribe = realtime.subscribeToRow(
    'agents',
    agentId,
    (payload: RealtimePayload) => {
      console.log('Agent status changed:', payload)
      
      // Emit to connected clients
      const channel = realtime.createChannel(`agent:${agentId}`)
      channel.send('status_update', {
        agentId,
        status: payload.new.status,
        timestamp: new Date()
      })
    }
  )
  
  // Store cleanup function
  cleanupFunctions.push(unsubscribe)
}

// Real-time collaboration
const setupCollaborativeEditing = async (documentId: string): Promise<IChannel> => {
  const channel = realtime.createChannel(`document:${documentId}`)
  
  // Join channel
  await channel.join()
  
  // Handle incoming edits
  channel.on('edit', (payload: { userId: string, changes: any }) => {
    applyEditsToDocument(documentId, payload.changes)
    
    // Broadcast to other users
    channel.send('edit_applied', {
      documentId,
      userId: payload.userId,
      timestamp: new Date()
    })
  })
  
  // Track user presence
  const user = await auth.getCurrentUser()
  if (user) {
    await realtime.trackPresence(`document:${documentId}`, {
      userId: user.id,
      userName: user.name,
      avatar: user.avatar,
      cursor: null
    })
  }
  
  return channel
}

// Real-time notifications
const setupNotificationSystem = async (userId: string): Promise<void> => {
  const channel = realtime.createChannel(`user:${userId}:notifications`)
  await channel.join()
  
  channel.on('notification', (payload: NotificationPayload) => {
    // Show notification to user
    showNotification({
      title: payload.title,
      message: payload.message,
      type: payload.type,
      timestamp: payload.timestamp
    })
    
    // Mark as received
    channel.send('notification_received', {
      notificationId: payload.id,
      receivedAt: new Date()
    })
  })
}
```

---

## Implementation Switching

### Configuration-Based Provider Selection

#### Environment Configuration

```typescript
// config/providers.ts
interface ProviderConfig {
  database: {
    type: 'supabase' | 'postgresql' | 'mock'
    config: Record<string, any>
  }
  auth: {
    type: 'supabase' | 'auth0' | 'cognito' | 'mock'
    config: Record<string, any>
  }
  storage: {
    type: 'supabase' | 'aws-s3' | 'filesystem' | 'mock'
    config: Record<string, any>
  }
  realtime: {
    type: 'supabase' | 'socket-io' | 'mock'
    config: Record<string, any>
  }
}

const loadProviderConfig = (): ProviderConfig => {
  const env = process.env.NODE_ENV || 'development'
  
  // Default configuration
  const config: ProviderConfig = {
    database: {
      type: 'mock',
      config: {}
    },
    auth: {
      type: 'mock',
      config: {}
    },
    storage: {
      type: 'mock',
      config: {}
    },
    realtime: {
      type: 'mock',
      config: {}
    }
  }
  
  // Environment-specific overrides
  if (env === 'production') {
    config.database = {
      type: 'supabase',
      config: {
        url: requireEnv('SUPABASE_URL'),
        anonKey: requireEnv('SUPABASE_ANON_KEY'),
        serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY')
      }
    }
    
    config.auth = {
      type: 'supabase',
      config: {
        url: requireEnv('SUPABASE_URL'),
        anonKey: requireEnv('SUPABASE_ANON_KEY')
      }
    }
  } else if (env === 'staging') {
    config.database = {
      type: 'postgresql',
      config: {
        host: requireEnv('DATABASE_HOST'),
        port: parseInt(requireEnv('DATABASE_PORT')),
        database: requireEnv('DATABASE_NAME'),
        username: requireEnv('DATABASE_USERNAME'),
        password: requireEnv('DATABASE_PASSWORD')
      }
    }
  }
  
  return config
}
```

#### Dynamic Provider Registration

```typescript
// di/provider-factory.ts
import { Container } from 'inversify'
import { ProviderConfig } from '@/config/providers'

// Database providers
import { SupabaseDatabaseService } from '@/implementations/supabase/database'
import { PostgreSQLDatabaseService } from '@/implementations/postgresql/database'
import { MockDatabaseService } from '@/implementations/mock/database'

// Auth providers
import { SupabaseAuthService } from '@/implementations/supabase/auth'
import { Auth0AuthService } from '@/implementations/auth0/auth'
import { MockAuthService } from '@/implementations/mock/auth'

export function registerProviders(container: Container, config: ProviderConfig): void {
  // Register database service
  switch (config.database.type) {
    case 'supabase':
      container.bind<IDatabaseService>('DatabaseService')
        .toDynamicValue(() => new SupabaseDatabaseService(config.database.config))
        .inSingletonScope()
      break
      
    case 'postgresql':
      container.bind<IDatabaseService>('DatabaseService')
        .toDynamicValue(() => new PostgreSQLDatabaseService(config.database.config))
        .inSingletonScope()
      break
      
    case 'mock':
      container.bind<IDatabaseService>('DatabaseService')
        .toDynamicValue(() => new MockDatabaseService())
        .inSingletonScope()
      break
      
    default:
      throw new Error(`Unknown database provider: ${config.database.type}`)
  }
  
  // Register auth service
  switch (config.auth.type) {
    case 'supabase':
      container.bind<IAuthService>('AuthService')
        .toDynamicValue(() => new SupabaseAuthService(config.auth.config))
        .inSingletonScope()
      break
      
    case 'auth0':
      container.bind<IAuthService>('AuthService')
        .toDynamicValue(() => new Auth0AuthService(config.auth.config))
        .inSingletonScope()
      break
      
    case 'mock':
      container.bind<IAuthService>('AuthService')
        .toDynamicValue(() => new MockAuthService())
        .inSingletonScope()
      break
      
    default:
      throw new Error(`Unknown auth provider: ${config.auth.type}`)
  }
  
  // Register other services...
}
```

#### Runtime Provider Switching

```typescript
// services/provider-manager.ts
export class ProviderManager {
  private container: Container
  private currentConfig: ProviderConfig
  
  constructor(container: Container, initialConfig: ProviderConfig) {
    this.container = container
    this.currentConfig = initialConfig
    this.registerProviders()
  }
  
  async switchProvider(
    serviceType: keyof ProviderConfig,
    newProviderType: string,
    newConfig: Record<string, any>
  ): Promise<void> {
    const logger = this.container.get<ILogger>('Logger')
    
    try {
      // Update configuration
      this.currentConfig[serviceType] = {
        type: newProviderType as any,
        config: newConfig
      }
      
      // Unbind current service
      const serviceToken = this.getServiceToken(serviceType)
      if (this.container.isBound(serviceToken)) {
        this.container.unbind(serviceToken)
      }
      
      // Register new provider
      this.registerSingleProvider(serviceType)
      
      logger.info('Provider switched successfully', {
        serviceType,
        newProviderType,
        timestamp: new Date()
      })
      
    } catch (error) {
      logger.error('Failed to switch provider', {
        serviceType,
        newProviderType,
        error: error.message
      })
      throw error
    }
  }
  
  private getServiceToken(serviceType: keyof ProviderConfig): string {
    const tokenMap = {
      database: 'DatabaseService',
      auth: 'AuthService',
      storage: 'StorageService',
      realtime: 'RealtimeService'
    }
    
    return tokenMap[serviceType]
  }
}
```

### Testing with Different Providers

```typescript
// tests/provider-integration.test.ts
describe('Provider Integration Tests', () => {
  let container: Container
  
  beforeEach(() => {
    container = new Container()
  })
  
  test('should work with Supabase provider', async () => {
    const config: ProviderConfig = {
      database: {
        type: 'supabase',
        config: {
          url: 'http://localhost:54321',
          anonKey: 'test-key',
          serviceRoleKey: 'test-service-key'
        }
      },
      // ... other configs
    }
    
    registerProviders(container, config)
    const db = container.get<IDatabaseService>('DatabaseService')
    
    const result = await db.create('agents', {
      name: 'Test Agent',
      type: 'AI_LEADER'
    })
    
    expect(result.success).toBe(true)
  })
  
  test('should work with PostgreSQL provider', async () => {
    const config: ProviderConfig = {
      database: {
        type: 'postgresql',
        config: {
          host: 'localhost',
          port: 5432,
          database: 'truststream_test',
          username: 'test',
          password: 'test'
        }
      },
      // ... other configs
    }
    
    registerProviders(container, config)
    const db = container.get<IDatabaseService>('DatabaseService')
    
    const result = await db.create('agents', {
      name: 'Test Agent',
      type: 'AI_LEADER'
    })
    
    expect(result.success).toBe(true)
  })
  
  test('should work with Mock provider', async () => {
    const config: ProviderConfig = {
      database: {
        type: 'mock',
        config: {}
      },
      // ... other configs
    }
    
    registerProviders(container, config)
    const db = container.get<IDatabaseService>('DatabaseService')
    
    const result = await db.create('agents', {
      name: 'Test Agent',
      type: 'AI_LEADER'
    })
    
    expect(result.success).toBe(true)
  })
})
```

---

## Advanced Patterns

### Composite Service Pattern

```typescript
// services/composite-database.ts
export class CompositeDatabaseService implements IDatabaseService {
  private primaryDb: IDatabaseService
  private secondaryDb: IDatabaseService
  private logger: ILogger
  
  constructor(
    primary: IDatabaseService,
    secondary: IDatabaseService,
    logger: ILogger
  ) {
    this.primaryDb = primary
    this.secondaryDb = secondary
    this.logger = logger
  }
  
  async create<T>(table: string, data: Partial<T>): Promise<Result<T, DatabaseError>> {
    // Write to primary database
    const primaryResult = await this.primaryDb.create<T>(table, data)
    
    if (primaryResult.success) {
      // Async replication to secondary
      this.replicateToSecondary(table, 'CREATE', primaryResult.data)
        .catch(error => {
          this.logger.error('Secondary replication failed', { error, table, operation: 'CREATE' })
        })
    }
    
    return primaryResult
  }
  
  async read<T>(table: string, query: QueryOptions): Promise<Result<T[], DatabaseError>> {
    // Try primary first
    const primaryResult = await this.primaryDb.read<T>(table, query)
    
    if (primaryResult.success) {
      return primaryResult
    }
    
    // Fallback to secondary
    this.logger.warn('Primary database read failed, trying secondary', {
      table,
      error: primaryResult.error.message
    })
    
    return await this.secondaryDb.read<T>(table, query)
  }
  
  private async replicateToSecondary(
    table: string,
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    data: any
  ): Promise<void> {
    try {
      switch (operation) {
        case 'CREATE':
          await this.secondaryDb.create(table, data)
          break
        case 'UPDATE':
          await this.secondaryDb.update(table, data.id, data)
          break
        case 'DELETE':
          await this.secondaryDb.delete(table, data.id)
          break
      }
    } catch (error) {
      // Log but don't throw - replication is best effort
      this.logger.error('Secondary replication error', { error, table, operation })
    }
  }
}
```

### Circuit Breaker Pattern

```typescript
// utils/circuit-breaker.ts
interface CircuitBreakerConfig {
  failureThreshold: number
  resetTimeout: number
  monitoringPeriod: number
}

class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
  private failureCount = 0
  private lastFailureTime?: Date
  private config: CircuitBreakerConfig
  
  constructor(config: CircuitBreakerConfig) {
    this.config = config
  }
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN'
      } else {
        throw new Error('Circuit breaker is OPEN')
      }
    }
    
    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }
  
  private onSuccess(): void {
    this.failureCount = 0
    this.state = 'CLOSED'
  }
  
  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = new Date()
    
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN'
    }
  }
  
  private shouldAttemptReset(): boolean {
    return this.lastFailureTime &&
      Date.now() - this.lastFailureTime.getTime() >= this.config.resetTimeout
  }
}

// Decorator for circuit breaker
export function withCircuitBreaker(config: CircuitBreakerConfig) {
  const breaker = new CircuitBreaker(config)
  
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      return breaker.execute(() => method.apply(this, args))
    }
  }
}

// Usage
class ResilientDatabaseService implements IDatabaseService {
  constructor(private baseService: IDatabaseService) {}
  
  @withCircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 60000, // 1 minute
    monitoringPeriod: 10000 // 10 seconds
  })
  async create<T>(table: string, data: Partial<T>): Promise<Result<T, DatabaseError>> {
    return this.baseService.create(table, data)
  }
}
```

### Caching Layer Pattern

```typescript
// services/cached-database.ts
export class CachedDatabaseService implements IDatabaseService {
  private baseService: IDatabaseService
  private cache: ICacheService
  private logger: ILogger
  
  constructor(
    baseService: IDatabaseService,
    cache: ICacheService,
    logger: ILogger
  ) {
    this.baseService = baseService
    this.cache = cache
    this.logger = logger
  }
  
  async read<T>(table: string, query: QueryOptions): Promise<Result<T[], DatabaseError>> {
    const cacheKey = this.generateCacheKey(table, query)
    
    // Try cache first
    const cached = await this.cache.get<T[]>(cacheKey)
    if (cached) {
      this.logger.debug('Cache hit', { table, cacheKey })
      return Result.success(cached)
    }
    
    // Fallback to database
    this.logger.debug('Cache miss', { table, cacheKey })
    const result = await this.baseService.read<T>(table, query)
    
    // Cache successful results
    if (result.success) {
      const ttl = this.getTTL(table)
      await this.cache.set(cacheKey, result.data, ttl)
    }
    
    return result
  }
  
  async create<T>(table: string, data: Partial<T>): Promise<Result<T, DatabaseError>> {
    const result = await this.baseService.create<T>(table, data)
    
    if (result.success) {
      // Invalidate related cache entries
      await this.invalidateTableCache(table)
    }
    
    return result
  }
  
  async update<T>(table: string, id: string, data: Partial<T>): Promise<Result<T, DatabaseError>> {
    const result = await this.baseService.update<T>(table, id, data)
    
    if (result.success) {
      // Invalidate specific item and table cache
      await this.cache.delete(`${table}:${id}`)
      await this.invalidateTableCache(table)
    }
    
    return result
  }
  
  private generateCacheKey(table: string, query: QueryOptions): string {
    const queryStr = JSON.stringify(query)
    const hash = createHash('md5').update(queryStr).digest('hex')
    return `${table}:query:${hash}`
  }
  
  private getTTL(table: string): number {
    // Different TTL for different tables
    const ttlMap: Record<string, number> = {
      agents: 300, // 5 minutes
      trust_scores: 60, // 1 minute
      agent_metrics: 180, // 3 minutes
      system_config: 3600 // 1 hour
    }
    
    return ttlMap[table] || 300 // Default 5 minutes
  }
  
  private async invalidateTableCache(table: string): Promise<void> {
    const pattern = `${table}:*`
    await this.cache.deletePattern(pattern)
  }
}
```

---

## Performance Optimization

### Connection Pooling

```typescript
// services/pooled-database.ts
export class PooledDatabaseService implements IDatabaseService {
  private pool: ConnectionPool
  private config: PoolConfig
  
  constructor(config: DatabaseConfig & PoolConfig) {
    this.config = {
      minConnections: config.minConnections || 2,
      maxConnections: config.maxConnections || 10,
      acquireTimeout: config.acquireTimeout || 30000,
      idleTimeout: config.idleTimeout || 300000
    }
    
    this.pool = new ConnectionPool(config)
  }
  
  async create<T>(table: string, data: Partial<T>): Promise<Result<T, DatabaseError>> {
    return this.withConnection(async (connection) => {
      return connection.create<T>(table, data)
    })
  }
  
  private async withConnection<T>(
    operation: (connection: DatabaseConnection) => Promise<Result<T, DatabaseError>>
  ): Promise<Result<T, DatabaseError>> {
    let connection: DatabaseConnection | null = null
    
    try {
      connection = await this.pool.acquire()
      return await operation(connection)
    } catch (error) {
      return Result.failure(new DatabaseError('Connection operation failed', error))
    } finally {
      if (connection) {
        await this.pool.release(connection)
      }
    }
  }
  
  async dispose(): Promise<void> {
    await this.pool.close()
  }
}
```

### Query Optimization

```typescript
// services/optimized-queries.ts
export class OptimizedQueryService {
  constructor(private db: IDatabaseService) {}
  
  // Batch loading to reduce N+1 queries
  async loadAgentsWithMetrics(agentIds: string[]): Promise<Result<AgentWithMetrics[], DatabaseError>> {
    if (agentIds.length === 0) {
      return Result.success([])
    }
    
    // Single query instead of N queries
    const query: QueryOptions = {
      select: [
        'a.id',
        'a.name',
        'a.type',
        'a.status',
        'am.performance_score',
        'am.task_count',
        'am.success_rate'
      ],
      from: 'agents a',
      joins: [{
        type: 'LEFT',
        table: 'agent_metrics am',
        condition: 'a.id = am.agent_id'
      }],
      where: {
        'a.id': { in: agentIds }
      }
    }
    
    return this.db.read<AgentWithMetrics>('', query)
  }
  
  // Pagination with cursors for better performance
  async getPaginatedAgents(
    cursor?: string,
    limit: number = 20
  ): Promise<Result<PaginatedResult<Agent>, DatabaseError>> {
    const query: QueryOptions = {
      where: cursor ? {
        created_at: { lt: cursor }
      } : {},
      orderBy: {
        created_at: 'desc'
      },
      limit: limit + 1 // Fetch one extra to determine if there are more
    }
    
    const result = await this.db.read<Agent>('agents', query)
    
    if (!result.success) {
      return result
    }
    
    const agents = result.data
    const hasMore = agents.length > limit
    const items = hasMore ? agents.slice(0, -1) : agents
    const nextCursor = hasMore ? agents[agents.length - 2].created_at : null
    
    return Result.success({
      items,
      hasMore,
      nextCursor
    })
  }
  
  // Aggregate queries for analytics
  async getAgentAnalytics(timeRange: TimeRange): Promise<Result<AgentAnalytics, DatabaseError>> {
    const query = `
      SELECT 
        COUNT(*) as total_agents,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_agents,
        COUNT(CASE WHEN created_at >= :start_date THEN 1 END) as new_agents,
        AVG(CASE WHEN am.performance_score IS NOT NULL THEN am.performance_score END) as avg_performance,
        SUM(am.task_count) as total_tasks
      FROM agents a
      LEFT JOIN agent_metrics am ON a.id = am.agent_id
      WHERE a.created_at >= :start_date AND a.created_at <= :end_date
    `
    
    const result = await this.db.rawQuery<AgentAnalytics>(query, {
      start_date: timeRange.start,
      end_date: timeRange.end
    })
    
    return Result.map(result, analytics => analytics[0])
  }
}
```

### Background Job Processing

```typescript
// services/background-processor.ts
export class BackgroundJobProcessor {
  private queue: JobQueue
  private workers: Worker[] = []
  private isRunning = false
  
  constructor(
    private db: IDatabaseService,
    private logger: ILogger,
    private workerCount = 3
  ) {
    this.queue = new JobQueue()
  }
  
  async start(): Promise<void> {
    if (this.isRunning) return
    
    this.isRunning = true
    
    // Start worker processes
    for (let i = 0; i < this.workerCount; i++) {
      const worker = new Worker()
      worker.on('job', this.processJob.bind(this))
      worker.start()
      this.workers.push(worker)
    }
    
    this.logger.info('Background job processor started', {
      workerCount: this.workerCount
    })
  }
  
  async stop(): Promise<void> {
    this.isRunning = false
    
    await Promise.all(
      this.workers.map(worker => worker.stop())
    )
    
    this.workers = []
    this.logger.info('Background job processor stopped')
  }
  
  async enqueueJob(job: BackgroundJob): Promise<void> {
    await this.queue.add(job)
  }
  
  private async processJob(job: BackgroundJob): Promise<void> {
    try {
      this.logger.debug('Processing job', { jobId: job.id, type: job.type })
      
      switch (job.type) {
        case 'agent_metrics_calculation':
          await this.calculateAgentMetrics(job.data)
          break
        case 'trust_score_update':
          await this.updateTrustScores(job.data)
          break
        case 'data_cleanup':
          await this.cleanupOldData(job.data)
          break
        default:
          throw new Error(`Unknown job type: ${job.type}`)
      }
      
      this.logger.info('Job completed successfully', {
        jobId: job.id,
        type: job.type,
        duration: Date.now() - job.startTime
      })
      
    } catch (error) {
      this.logger.error('Job failed', {
        jobId: job.id,
        type: job.type,
        error: error.message,
        duration: Date.now() - job.startTime
      })
      
      // Implement retry logic
      if (job.retryCount < job.maxRetries) {
        job.retryCount++
        job.scheduledAt = new Date(Date.now() + job.retryDelay)
        await this.queue.add(job)
      }
    }
  }
}
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Provider Connection Issues

```typescript
// utils/health-check.ts
export class HealthCheckService {
  constructor(
    private db: IDatabaseService,
    private auth: IAuthService,
    private storage: IStorageService,
    private logger: ILogger
  ) {}
  
  async checkSystemHealth(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabaseHealth(),
      this.checkAuthHealth(),
      this.checkStorageHealth()
    ])
    
    const results = checks.map((check, index) => {
      const service = ['database', 'auth', 'storage'][index]
      if (check.status === 'fulfilled') {
        return { service, status: 'healthy', details: check.value }
      } else {
        return { service, status: 'unhealthy', error: check.reason.message }
      }
    })
    
    const overallStatus = results.every(r => r.status === 'healthy') ? 'healthy' : 'degraded'
    
    return {
      status: overallStatus,
      timestamp: new Date(),
      services: results
    }
  }
  
  private async checkDatabaseHealth(): Promise<any> {
    const startTime = Date.now()
    
    // Simple query to test connectivity
    const result = await this.db.rawQuery('SELECT 1 as test')
    
    if (!result.success) {
      throw new Error(`Database health check failed: ${result.error.message}`)
    }
    
    return {
      responseTime: Date.now() - startTime,
      connection: 'active'
    }
  }
  
  private async checkAuthHealth(): Promise<any> {
    const startTime = Date.now()
    
    // Test auth service availability
    const session = await this.auth.getSession()
    
    return {
      responseTime: Date.now() - startTime,
      service: 'available'
    }
  }
  
  private async checkStorageHealth(): Promise<any> {
    const startTime = Date.now()
    
    // Test storage connectivity
    const buckets = await this.storage.listBuckets()
    
    return {
      responseTime: Date.now() - startTime,
      buckets: buckets.length
    }
  }
}
```

#### 2. Interface Compatibility Issues

```typescript
// utils/compatibility-checker.ts
export class CompatibilityChecker {
  static checkDatabaseCompatibility(service: IDatabaseService): CompatibilityReport {
    const report: CompatibilityReport = {
      compatible: true,
      issues: [],
      recommendations: []
    }
    
    // Check if service implements all required methods
    const requiredMethods = [
      'connect', 'disconnect', 'create', 'read', 'update', 'delete',
      'createMany', 'updateMany', 'deleteMany', 'rawQuery', 'transaction'
    ]
    
    for (const method of requiredMethods) {
      if (typeof (service as any)[method] !== 'function') {
        report.compatible = false
        report.issues.push(`Missing required method: ${method}`)
      }
    }
    
    // Check for optional advanced features
    const optionalMethods = ['createTable', 'dropTable', 'alterTable', 'createIndex']
    const missingOptional = optionalMethods.filter(method => 
      typeof (service as any)[method] !== 'function'
    )
    
    if (missingOptional.length > 0) {
      report.recommendations.push(
        `Consider implementing optional methods: ${missingOptional.join(', ')}`
      )
    }
    
    return report
  }
}

interface CompatibilityReport {
  compatible: boolean
  issues: string[]
  recommendations: string[]
}
```

#### 3. Performance Monitoring

```typescript
// utils/performance-monitor.ts
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map()
  
  startOperation(operationName: string): PerformanceTracker {
    return new PerformanceTracker(operationName, this)
  }
  
  recordMetric(operationName: string, metric: PerformanceMetric): void {
    if (!this.metrics.has(operationName)) {
      this.metrics.set(operationName, [])
    }
    
    const metrics = this.metrics.get(operationName)!
    metrics.push(metric)
    
    // Keep only last 100 metrics per operation
    if (metrics.length > 100) {
      metrics.shift()
    }
  }
  
  getMetrics(operationName?: string): Map<string, PerformanceStats> {
    const result = new Map<string, PerformanceStats>()
    
    const operations = operationName 
      ? [operationName] 
      : Array.from(this.metrics.keys())
    
    for (const op of operations) {
      const metrics = this.metrics.get(op) || []
      if (metrics.length === 0) continue
      
      const durations = metrics.map(m => m.duration)
      const successRate = metrics.filter(m => m.success).length / metrics.length
      
      result.set(op, {
        totalCalls: metrics.length,
        successRate,
        avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        p95Duration: this.percentile(durations, 95),
        p99Duration: this.percentile(durations, 99)
      })
    }
    
    return result
  }
  
  private percentile(values: number[], p: number): number {
    const sorted = values.slice().sort((a, b) => a - b)
    const index = Math.ceil((p / 100) * sorted.length) - 1
    return sorted[index] || 0
  }
}

class PerformanceTracker {
  private startTime = Date.now()
  
  constructor(
    private operationName: string,
    private monitor: PerformanceMonitor
  ) {}
  
  end(success: boolean = true, metadata?: Record<string, any>): void {
    const duration = Date.now() - this.startTime
    
    this.monitor.recordMetric(this.operationName, {
      duration,
      success,
      timestamp: new Date(),
      metadata
    })
  }
}

// Usage with decorator
export function monitored(operationName?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    const name = operationName || `${target.constructor.name}.${propertyName}`
    
    descriptor.value = async function (...args: any[]) {
      const monitor = container.get<PerformanceMonitor>('PerformanceMonitor')
      const tracker = monitor.startOperation(name)
      
      try {
        const result = await method.apply(this, args)
        tracker.end(true)
        return result
      } catch (error) {
        tracker.end(false, { error: error.message })
        throw error
      }
    }
  }
}
```

---

## Best Practices

### 1. Always Use Interfaces

```typescript
// ❌ BAD: Direct dependency
import { SupabaseDatabaseService } from '@/implementations/supabase'

class AgentService {
  constructor(private db: SupabaseDatabaseService) {}
}

// ✅ GOOD: Interface dependency
import { IDatabaseService } from '@/interfaces'

class AgentService {
  constructor(private db: IDatabaseService) {}
}
```

### 2. Handle Errors Explicitly

```typescript
// ❌ BAD: Throwing exceptions
async function createAgent(data: AgentData): Promise<Agent> {
  const agent = await db.create('agents', data)
  return agent
}

// ✅ GOOD: Explicit error handling
async function createAgent(data: AgentData): Promise<Result<Agent, AgentError>> {
  const result = await db.create<Agent>('agents', data)
  if (!result.success) {
    return Result.failure(new AgentError('Failed to create agent', result.error))
  }
  return result
}
```

### 3. Use Configuration for Behavior

```typescript
// ❌ BAD: Hardcoded behavior
class AgentService {
  async createAgent(data: AgentData): Promise<Agent> {
    // Always use Supabase
    return supabase.from('agents').insert(data)
  }
}

// ✅ GOOD: Configurable behavior
class AgentService {
  constructor(
    private db: IDatabaseService,
    private config: AgentServiceConfig
  ) {}
  
  async createAgent(data: AgentData): Promise<Result<Agent, AgentError>> {
    if (this.config.validateOnCreate) {
      const validation = this.validateAgentData(data)
      if (!validation.success) {
        return validation
      }
    }
    
    return this.db.create<Agent>('agents', data)
  }
}
```

### 4. Test with Multiple Providers

```typescript
// test/agent-service.test.ts
describe('AgentService', () => {
  const testCases = [
    { name: 'Supabase', provider: 'supabase' },
    { name: 'PostgreSQL', provider: 'postgresql' },
    { name: 'Mock', provider: 'mock' }
  ]
  
  testCases.forEach(({ name, provider }) => {
    describe(`with ${name} provider`, () => {
      let agentService: AgentService
      
      beforeEach(() => {
        const container = createTestContainer(provider)
        agentService = container.get<AgentService>('AgentService')
      })
      
      test('should create agent successfully', async () => {
        const agentData = createTestAgentData()
        const result = await agentService.createAgent(agentData)
        
        expect(result.success).toBe(true)
        expect(result.data.name).toBe(agentData.name)
      })
    })
  })
})
```

### 5. Monitor Provider Performance

```typescript
// services/monitored-service.ts
export class MonitoredAgentService extends AgentService {
  constructor(
    db: IDatabaseService,
    private monitor: IMetricsService,
    private logger: ILogger
  ) {
    super(db)
  }
  
  async createAgent(data: AgentData): Promise<Result<Agent, AgentError>> {
    const startTime = Date.now()
    const result = await super.createAgent(data)
    const duration = Date.now() - startTime
    
    // Record metrics
    this.monitor.recordOperationMetric('agent.create', {
      duration,
      success: result.success,
      provider: this.getProviderType()
    })
    
    // Log operations
    if (result.success) {
      this.logger.info('Agent created', {
        agentId: result.data.id,
        duration,
        provider: this.getProviderType()
      })
    } else {
      this.logger.error('Agent creation failed', {
        error: result.error.message,
        duration,
        provider: this.getProviderType()
      })
    }
    
    return result
  }
  
  private getProviderType(): string {
    return this.db.constructor.name
  }
}
```

---

## Conclusion

The abstraction layer provides a robust foundation for building provider-agnostic applications. By following these usage patterns and best practices, you can:

- Build applications that are not locked into specific vendors
- Switch between different implementations based on requirements
- Test more effectively with mock implementations
- Deploy flexibly across different environments
- Scale and adapt to changing business needs

**Key Takeaways:**
1. Always program against interfaces, never implementations
2. Use dependency injection for flexible provider selection
3. Handle errors explicitly with the Result pattern
4. Monitor performance across different providers
5. Test with multiple implementations to ensure compatibility

For implementation details and migration guidance, refer to:
- [Development Guidelines](./development-guidelines.md)
- [Testing Framework](./testing-framework.md)
- [Migration Procedures](./migration-procedures.md)