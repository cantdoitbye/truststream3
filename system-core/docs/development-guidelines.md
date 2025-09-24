# TrustStream v4.2 Development Guidelines

## Table of Contents
1. [Introduction & Philosophy](#introduction--philosophy)
2. [Coding Standards](#coding-standards)
3. [Architecture Patterns](#architecture-patterns)
4. [Dependency Management](#dependency-management)
5. [Error Handling](#error-handling)
6. [Performance Guidelines](#performance-guidelines)
7. [Security Standards](#security-standards)
8. [Code Review Process](#code-review-process)

---

## Introduction & Philosophy

### Core Development Principles

TrustStream v4.2 follows a **minimal dependency architecture** designed to reduce vendor lock-in and increase system flexibility. Our development approach prioritizes:

- **Abstraction-First Design**: All external services must be accessed through well-defined interfaces
- **Provider Agnostic Code**: Business logic should never directly depend on specific backend implementations
- **Graceful Degradation**: Systems should continue operating with reduced functionality when dependencies fail
- **Testability**: Every component must be unit testable in isolation
- **Maintainability**: Code should be self-documenting and follow consistent patterns

### Development Mindset

```typescript
// ❌ BAD: Direct Supabase dependency
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(url, key)
const data = await supabase.from('agents').select('*')

// ✅ GOOD: Interface-based abstraction
import { IAgentRepository } from '@/interfaces'
import { container } from '@/di'
const agentRepo = container.resolve<IAgentRepository>('AgentRepository')
const data = await agentRepo.findAll()
```

---

## Coding Standards

### TypeScript Configuration

**Required tsconfig.json settings:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Interface Design Standards

**1. Interface Naming Convention**
```typescript
// Service interfaces start with 'I'
interface IAgentService {
  createAgent(spec: AgentSpec): Promise<Agent>
  findAgent(id: string): Promise<Agent | null>
}

// Data transfer objects end with appropriate suffix
interface AgentCreateRequest {
  name: string
  type: AgentType
  capabilities: string[]
}

interface AgentResponse {
  id: string
  name: string
  status: AgentStatus
  createdAt: Date
}
```

**2. Error-First Design**
```typescript
// All async operations must handle errors explicitly
interface IAgentService {
  createAgent(spec: AgentSpec): Promise<Result<Agent, AgentError>>
}

// Result type for explicit error handling
type Result<T, E> = Success<T> | Failure<E>
type Success<T> = { success: true; data: T }
type Failure<E> = { success: false; error: E }
```

### Function Design Patterns

**1. Single Responsibility Functions**
```typescript
// ❌ BAD: Function does too many things
async function processAgent(agentData: any) {
  // Validation
  if (!agentData.name) throw new Error('Name required')
  
  // Database operation
  const agent = await supabase.from('agents').insert(agentData)
  
  // Notification
  await sendEmail(agent.email, 'Welcome!')
  
  // Logging
  console.log('Agent created:', agent.id)
  
  return agent
}

// ✅ GOOD: Separated concerns with clear interfaces
async function createAgent(
  agentData: AgentCreateRequest,
  agentService: IAgentService,
  notificationService: INotificationService,
  logger: ILogger
): Promise<Result<Agent, CreateAgentError>> {
  
  const validation = validateAgentData(agentData)
  if (!validation.success) {
    return { success: false, error: validation.error }
  }
  
  const result = await agentService.create(agentData)
  if (!result.success) {
    return result
  }
  
  // Side effects handled separately
  await notificationService.sendWelcome(result.data)
  logger.info('Agent created', { agentId: result.data.id })
  
  return result
}
```

**2. Configuration-Driven Behavior**
```typescript
// Use configuration objects for complex behaviors
interface AgentCreationConfig {
  enableNotifications: boolean
  autoActivate: boolean
  defaultCapabilities: string[]
  validationLevel: 'strict' | 'permissive'
}

class AgentCreationService {
  constructor(
    private config: AgentCreationConfig,
    private agentRepo: IAgentRepository,
    private notificationService: INotificationService
  ) {}
  
  async createAgent(spec: AgentSpec): Promise<Result<Agent, AgentError>> {
    // Behavior driven by configuration
    const validation = this.config.validationLevel === 'strict' 
      ? this.strictValidation(spec)
      : this.permissiveValidation(spec)
    
    if (!validation.success) {
      return validation
    }
    
    // ... rest of creation logic
  }
}
```

### File Organization Standards

**1. Directory Structure**
```
src/
├── interfaces/              # All service interfaces
│   ├── database/
│   ├── auth/
│   ├── storage/
│   └── realtime/
├── implementations/         # Concrete implementations
│   ├── supabase/
│   ├── postgresql/
│   └── mock/
├── services/               # Business logic services
│   ├── agent/
│   ├── trust/
│   └── governance/
├── di/                     # Dependency injection
│   ├── container.ts
│   └── bindings.ts
├── types/                  # Shared types and DTOs
└── utils/                  # Pure utility functions
```

**2. Import Standards**
```typescript
// Use path aliases for clean imports
import { IAgentService } from '@/interfaces/agent'
import { AgentSpec } from '@/types/agent'
import { container } from '@/di'
import { Result } from '@/utils/result'

// Group imports by type
// 1. Node modules
// 2. Internal interfaces
// 3. Internal implementations
// 4. Types
// 5. Utils
```

---

## Architecture Patterns

### Repository Pattern Implementation

**Interface Definition:**
```typescript
interface IAgentRepository {
  // Basic CRUD operations
  create(agent: AgentCreateData): Promise<Result<Agent, DatabaseError>>
  findById(id: string): Promise<Result<Agent | null, DatabaseError>>
  findMany(query: AgentQuery): Promise<Result<Agent[], DatabaseError>>
  update(id: string, updates: Partial<Agent>): Promise<Result<Agent, DatabaseError>>
  delete(id: string): Promise<Result<boolean, DatabaseError>>
  
  // Complex operations
  findByCapability(capability: string): Promise<Result<Agent[], DatabaseError>>
  updateStatus(id: string, status: AgentStatus): Promise<Result<void, DatabaseError>>
  getMetrics(id: string): Promise<Result<AgentMetrics, DatabaseError>>
}
```

**Implementation Example:**
```typescript
import { IAgentRepository } from '@/interfaces'
import { IDatabaseService } from '@/interfaces/database'

export class AgentRepository implements IAgentRepository {
  constructor(private db: IDatabaseService) {}
  
  async create(agentData: AgentCreateData): Promise<Result<Agent, DatabaseError>> {
    try {
      const result = await this.db.create<Agent>('agents', agentData)
      return { success: true, data: result }
    } catch (error) {
      return {
        success: false,
        error: new DatabaseError('Failed to create agent', error)
      }
    }
  }
  
  async findByCapability(capability: string): Promise<Result<Agent[], DatabaseError>> {
    const query = {
      where: {
        capabilities: { contains: [capability] }
      }
    }
    
    return this.findMany(query)
  }
}
```

### Service Layer Pattern

**Service Interface:**
```typescript
interface IAgentOrchestrationService {
  // High-level business operations
  deployAgent(spec: AgentDeploymentSpec): Promise<Result<DeployedAgent, OrchestrationError>>
  coordinateTask(task: AgentTask): Promise<Result<TaskResult, OrchestrationError>>
  optimizePerformance(agentId: string): Promise<Result<OptimizationResult, OrchestrationError>>
  
  // Health and monitoring
  getAgentHealth(agentId: string): Promise<Result<HealthStatus, OrchestrationError>>
  getSystemMetrics(): Promise<Result<SystemMetrics, OrchestrationError>>
}
```

**Service Implementation:**
```typescript
export class AgentOrchestrationService implements IAgentOrchestrationService {
  constructor(
    private agentRepo: IAgentRepository,
    private taskQueue: ITaskQueue,
    private metrics: IMetricsService,
    private logger: ILogger
  ) {}
  
  async deployAgent(spec: AgentDeploymentSpec): Promise<Result<DeployedAgent, OrchestrationError>> {
    // Complex orchestration logic
    const validation = await this.validateDeploymentSpec(spec)
    if (!validation.success) {
      return validation
    }
    
    const resources = await this.allocateResources(spec.requirements)
    if (!resources.success) {
      return {
        success: false,
        error: new OrchestrationError('Resource allocation failed', resources.error)
      }
    }
    
    // Deploy with monitoring
    const deployment = await this.performDeployment(spec, resources.data)
    if (deployment.success) {
      await this.metrics.recordDeployment(deployment.data)
      this.logger.info('Agent deployed successfully', { agentId: deployment.data.id })
    }
    
    return deployment
  }
}
```

### Command Pattern for Complex Operations

**Command Interface:**
```typescript
interface ICommand<T> {
  execute(): Promise<Result<T, CommandError>>
  undo(): Promise<Result<void, CommandError>>
  validate(): Promise<Result<void, ValidationError>>
}

interface ICommandHandler {
  handle<T>(command: ICommand<T>): Promise<Result<T, CommandError>>
}
```

**Example Implementation:**
```typescript
class CreateAgentCommand implements ICommand<Agent> {
  constructor(
    private spec: AgentSpec,
    private agentService: IAgentService,
    private resourceManager: IResourceManager
  ) {}
  
  async validate(): Promise<Result<void, ValidationError>> {
    // Validation logic
    if (!this.spec.name?.trim()) {
      return {
        success: false,
        error: new ValidationError('Agent name is required')
      }
    }
    
    return { success: true, data: undefined }
  }
  
  async execute(): Promise<Result<Agent, CommandError>> {
    const validation = await this.validate()
    if (!validation.success) {
      return {
        success: false,
        error: new CommandError('Validation failed', validation.error)
      }
    }
    
    // Resource allocation
    const resources = await this.resourceManager.allocate(this.spec.requirements)
    if (!resources.success) {
      return {
        success: false,
        error: new CommandError('Resource allocation failed', resources.error)
      }
    }
    
    // Agent creation
    return this.agentService.create(this.spec)
  }
  
  async undo(): Promise<Result<void, CommandError>> {
    // Cleanup logic for rollback
    await this.resourceManager.deallocate(this.spec.requirements)
    return { success: true, data: undefined }
  }
}
```

---

## Dependency Management

### Dependency Injection Container

**Container Configuration:**
```typescript
// di/container.ts
import { Container, injectable, inject } from 'inversify'
import { IAgentService, IAgentRepository } from '@/interfaces'

const container = new Container()

// Register interfaces to implementations
container.bind<IDatabaseService>('DatabaseService')
  .to(SupabaseDatabaseService)
  .inSingletonScope()

container.bind<IAgentRepository>('AgentRepository')
  .to(AgentRepository)
  .inSingletonScope()

container.bind<IAgentService>('AgentService')
  .to(AgentOrchestrationService)
  .inTransientScope()

export { container }
```

**Service Registration with Factory Functions:**
```typescript
// di/bindings.ts
export function configureDependencies(config: AppConfig) {
  // Database service selection based on config
  if (config.database.type === 'supabase') {
    container.bind<IDatabaseService>('DatabaseService')
      .toFactory(() => new SupabaseDatabaseService(config.database.supabase))
  } else if (config.database.type === 'postgresql') {
    container.bind<IDatabaseService>('DatabaseService')
      .toFactory(() => new PostgreSQLDatabaseService(config.database.postgresql))
  } else {
    container.bind<IDatabaseService>('DatabaseService')
      .toFactory(() => new MockDatabaseService())
  }
  
  // Authentication service selection
  if (config.auth.type === 'supabase') {
    container.bind<IAuthService>('AuthService')
      .toFactory(() => new SupabaseAuthService(config.auth.supabase))
  } else {
    container.bind<IAuthService>('AuthService')
      .toFactory(() => new MockAuthService())
  }
}
```

### Environment-Based Configuration

**Configuration Schema:**
```typescript
interface AppConfig {
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
    }
  }
  
  auth: {
    type: 'supabase' | 'auth0' | 'mock'
    supabase?: {
      url: string
      anonKey: string
    }
    auth0?: {
      domain: string
      clientId: string
      clientSecret: string
    }
  }
  
  features: {
    enableRealtime: boolean
    enableAdvancedAnalytics: boolean
    enableExperimentalFeatures: boolean
  }
}
```

**Configuration Loading:**
```typescript
// config/loader.ts
export function loadConfig(): AppConfig {
  const env = process.env.NODE_ENV || 'development'
  
  const baseConfig: AppConfig = {
    environment: env as any,
    database: {
      type: (process.env.DATABASE_TYPE as any) || 'mock'
    },
    auth: {
      type: (process.env.AUTH_TYPE as any) || 'mock'
    },
    features: {
      enableRealtime: process.env.ENABLE_REALTIME === 'true',
      enableAdvancedAnalytics: process.env.ENABLE_ANALYTICS === 'true',
      enableExperimentalFeatures: env === 'development'
    }
  }
  
  // Load provider-specific configuration
  if (baseConfig.database.type === 'supabase') {
    baseConfig.database.supabase = {
      url: requireEnv('SUPABASE_URL'),
      anonKey: requireEnv('SUPABASE_ANON_KEY'),
      serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY')
    }
  }
  
  return baseConfig
}

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`)
  }
  return value
}
```

---

## Error Handling

### Structured Error Types

**Base Error Classes:**
```typescript
// errors/base.ts
abstract class TrustStreamError extends Error {
  abstract readonly code: string
  abstract readonly category: ErrorCategory
  readonly timestamp: Date
  readonly context?: Record<string, any>
  
  constructor(
    message: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(message)
    this.name = this.constructor.name
    this.timestamp = new Date()
    this.context = context
    this.cause = cause
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack
    }
  }
}

type ErrorCategory = 
  | 'VALIDATION'
  | 'DATABASE'
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'NETWORK'
  | 'BUSINESS_LOGIC'
  | 'CONFIGURATION'
  | 'EXTERNAL_SERVICE'
```

**Specific Error Types:**
```typescript
// errors/database.ts
export class DatabaseError extends TrustStreamError {
  readonly code = 'DATABASE_ERROR'
  readonly category = 'DATABASE'
}

export class DatabaseConnectionError extends DatabaseError {
  readonly code = 'DATABASE_CONNECTION_ERROR'
}

export class DatabaseQueryError extends DatabaseError {
  readonly code = 'DATABASE_QUERY_ERROR'
}

// errors/agent.ts
export class AgentError extends TrustStreamError {
  readonly category = 'BUSINESS_LOGIC'
}

export class AgentNotFoundError extends AgentError {
  readonly code = 'AGENT_NOT_FOUND'
}

export class AgentDeploymentError extends AgentError {
  readonly code = 'AGENT_DEPLOYMENT_ERROR'
}
```

### Error Handling Patterns

**Result Pattern for Error Handling:**
```typescript
// utils/result.ts
export type Result<T, E extends Error = Error> = Success<T> | Failure<E>

export interface Success<T> {
  success: true
  data: T
}

export interface Failure<E extends Error> {
  success: false
  error: E
}

export const Result = {
  success: <T>(data: T): Success<T> => ({ success: true, data }),
  failure: <E extends Error>(error: E): Failure<E> => ({ success: false, error }),
  
  // Utility methods
  map: <T, U, E extends Error>(
    result: Result<T, E>,
    fn: (data: T) => U
  ): Result<U, E> => {
    if (result.success) {
      return Result.success(fn(result.data))
    }
    return result
  },
  
  flatMap: <T, U, E extends Error>(
    result: Result<T, E>,
    fn: (data: T) => Result<U, E>
  ): Result<U, E> => {
    if (result.success) {
      return fn(result.data)
    }
    return result
  }
}
```

**Try-Catch Wrapper:**
```typescript
// utils/safe.ts
export async function safe<T>(
  operation: () => Promise<T>
): Promise<Result<T, Error>> {
  try {
    const data = await operation()
    return Result.success(data)
  } catch (error) {
    return Result.failure(error instanceof Error ? error : new Error(String(error)))
  }
}

// Usage example
const result = await safe(async () => {
  return await agentService.createAgent(spec)
})

if (!result.success) {
  logger.error('Agent creation failed', result.error)
  return
}

console.log('Agent created:', result.data.id)
```

### Global Error Handling

**Error Boundary for React Components:**
```typescript
// components/ErrorBoundary.tsx
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<
  PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: PropsWithChildren<{}>) {
    super(props)
    this.state = { hasError: false }
  }
  
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    }
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service
    const errorLogger = container.resolve<ILogger>('Logger')
    errorLogger.error('React error boundary caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    })
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.stack}</pre>
          </details>
        </div>
      )
    }
    
    return this.props.children
  }
}
```

---

## Performance Guidelines

### Async Operations Best Practices

**1. Concurrent Execution:**
```typescript
// ❌ BAD: Sequential execution
async function loadAgentData(agentIds: string[]) {
  const agents = []
  for (const id of agentIds) {
    const agent = await agentService.findById(id)
    if (agent.success) {
      agents.push(agent.data)
    }
  }
  return agents
}

// ✅ GOOD: Concurrent execution
async function loadAgentData(agentIds: string[]) {
  const agentPromises = agentIds.map(id => agentService.findById(id))
  const results = await Promise.allSettled(agentPromises)
  
  return results
    .filter(result => result.status === 'fulfilled' && result.value.success)
    .map(result => (result as PromiseFulfilledResult<Success<Agent>>).value.data)
}
```

**2. Timeout and Cancellation:**
```typescript
// utils/timeout.ts
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timed out'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
  })
  
  return Promise.race([promise, timeoutPromise])
}

// Usage
const result = await withTimeout(
  agentService.performComplexOperation(data),
  5000, // 5 second timeout
  'Agent operation timed out'
)
```

**3. Caching Strategy:**
```typescript
// services/cache.ts
interface ICacheService {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
}

class AgentCacheService {
  constructor(
    private cache: ICacheService,
    private agentRepo: IAgentRepository
  ) {}
  
  async getAgent(id: string): Promise<Result<Agent, AgentError>> {
    // Try cache first
    const cached = await this.cache.get<Agent>(`agent:${id}`)
    if (cached) {
      return Result.success(cached)
    }
    
    // Fallback to repository
    const result = await this.agentRepo.findById(id)
    if (result.success && result.data) {
      // Cache for 5 minutes
      await this.cache.set(`agent:${id}`, result.data, 300)
    }
    
    return result
  }
}
```

### Memory Management

**1. Resource Cleanup:**
```typescript
// services/cleanup.ts
interface IDisposable {
  dispose(): Promise<void>
}

class ResourceManager implements IDisposable {
  private resources: IDisposable[] = []
  
  register<T extends IDisposable>(resource: T): T {
    this.resources.push(resource)
    return resource
  }
  
  async dispose(): Promise<void> {
    await Promise.all(
      this.resources.map(resource => resource.dispose())
    )
    this.resources = []
  }
}

// Example service with cleanup
class AgentMonitoringService implements IDisposable {
  private intervals: NodeJS.Timeout[] = []
  private eventListeners: (() => void)[] = []
  
  startMonitoring(agentId: string) {
    const interval = setInterval(() => {
      this.checkAgentHealth(agentId)
    }, 30000)
    
    this.intervals.push(interval)
  }
  
  async dispose(): Promise<void> {
    // Clear intervals
    this.intervals.forEach(interval => clearInterval(interval))
    this.intervals = []
    
    // Remove event listeners
    this.eventListeners.forEach(cleanup => cleanup())
    this.eventListeners = []
  }
}
```

---

## Security Standards

### Input Validation and Sanitization

**1. Schema-Based Validation:**
```typescript
// validation/schemas.ts
import { z } from 'zod'

export const AgentSpecSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-zA-Z0-9\s\-_]+$/),
  type: z.enum(['AI_LEADER', 'MARKETING', 'COMPLIANCE', 'OPPORTUNITY']),
  capabilities: z.array(z.string()).min(1).max(20),
  configuration: z.object({
    maxMemory: z.number().min(1).max(1024),
    timeout: z.number().min(1000).max(60000),
    retryAttempts: z.number().min(0).max(5)
  })
})

export type AgentSpec = z.infer<typeof AgentSpecSchema>

// validation/validator.ts
export function validateAgentSpec(data: unknown): Result<AgentSpec, ValidationError> {
  try {
    const validData = AgentSpecSchema.parse(data)
    return Result.success(validData)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return Result.failure(new ValidationError(message))
    }
    return Result.failure(new ValidationError('Unknown validation error'))
  }
}
```

**2. SQL Injection Prevention:**
```typescript
// ❌ BAD: String concatenation
const query = `SELECT * FROM agents WHERE name = '${name}'`

// ✅ GOOD: Parameterized queries
interface IDatabaseService {
  query<T>(
    sql: string,
    parameters: Record<string, any>
  ): Promise<Result<T[], DatabaseError>>
}

const result = await db.query<Agent>(
  'SELECT * FROM agents WHERE name = :name AND type = :type',
  { name, type }
)
```

**3. Authorization Checks:**
```typescript
// auth/permissions.ts
interface IPermissionService {
  hasPermission(user: User, resource: string, action: string): Promise<boolean>
  checkPermission(user: User, resource: string, action: string): Promise<Result<void, AuthorizationError>>
}

// Decorator for automatic permission checking
function requiresPermission(resource: string, action: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    
    descriptor.value = async function (this: any, ...args: any[]) {
      const user = this.getCurrentUser()
      const permissionService = container.resolve<IPermissionService>('PermissionService')
      
      const permissionCheck = await permissionService.checkPermission(user, resource, action)
      if (!permissionCheck.success) {
        throw permissionCheck.error
      }
      
      return method.apply(this, args)
    }
  }
}

// Usage
class AgentService {
  @requiresPermission('agents', 'create')
  async createAgent(spec: AgentSpec): Promise<Result<Agent, AgentError>> {
    // Implementation
  }
  
  @requiresPermission('agents', 'delete')
  async deleteAgent(id: string): Promise<Result<void, AgentError>> {
    // Implementation
  }
}
```

### Secrets Management

**1. Environment Variable Encryption:**
```typescript
// config/secrets.ts
interface ISecretsManager {
  getSecret(key: string): Promise<string | null>
  setSecret(key: string, value: string): Promise<void>
  rotateSecret(key: string): Promise<string>
}

class EnvironmentSecretsManager implements ISecretsManager {
  private encryptionKey: string
  
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || this.generateKey()
  }
  
  async getSecret(key: string): Promise<string | null> {
    const encrypted = process.env[key]
    if (!encrypted) return null
    
    return this.decrypt(encrypted)
  }
  
  private decrypt(encryptedValue: string): string {
    // Implement decryption logic
    return encryptedValue // Placeholder
  }
  
  private generateKey(): string {
    // Generate encryption key if not provided
    return 'generated-key' // Placeholder
  }
}
```

---

## Code Review Process

### Review Checklist

**1. Architecture Compliance:**
- [ ] No direct dependencies on Supabase or other external services
- [ ] All external services accessed through interfaces
- [ ] Proper dependency injection usage
- [ ] Configuration-driven behavior

**2. Error Handling:**
- [ ] All async operations use Result pattern
- [ ] Specific error types for different failure scenarios
- [ ] Proper error logging and context
- [ ] No unhandled promise rejections

**3. Performance:**
- [ ] Concurrent execution where applicable
- [ ] Appropriate caching strategies
- [ ] Resource cleanup in finally blocks or disposable pattern
- [ ] Timeout handling for external calls

**4. Security:**
- [ ] Input validation using schemas
- [ ] Parameterized database queries
- [ ] Authorization checks for sensitive operations
- [ ] No secrets in code

**5. Testing:**
- [ ] Unit tests for all public methods
- [ ] Integration tests for complex workflows
- [ ] Mock implementations for external dependencies
- [ ] Edge case coverage

### Review Template

```markdown
## Code Review Template

### Summary
- **Type**: [ ] Feature [ ] Bug Fix [ ] Refactor [ ] Documentation
- **Breaking Changes**: [ ] Yes [ ] No
- **Dependencies Updated**: [ ] Yes [ ] No

### Architecture Review
- [ ] Follows abstraction patterns
- [ ] Proper interface usage
- [ ] No vendor lock-in
- [ ] Configurable behavior

### Code Quality
- [ ] Clear naming conventions
- [ ] Appropriate comments
- [ ] No code duplication
- [ ] Proper TypeScript usage

### Performance Impact
- [ ] No performance regressions
- [ ] Appropriate async patterns
- [ ] Memory leaks prevented
- [ ] Database queries optimized

### Security Assessment
- [ ] Input validation present
- [ ] Authorization implemented
- [ ] No security vulnerabilities
- [ ] Secrets properly managed

### Testing Coverage
- [ ] Unit tests added/updated
- [ ] Integration tests where needed
- [ ] Edge cases covered
- [ ] Test coverage > 80%

### Documentation
- [ ] README updated if needed
- [ ] API documentation current
- [ ] Inline comments for complex logic
- [ ] Migration notes if applicable
```

### Pre-commit Hooks

**Setup pre-commit validation:**
```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run type checking
npm run type-check

# Run linting
npm run lint

# Run tests
npm run test:unit

# Run security audit
npm audit --audit-level moderate

# Check for todos and fixmes
if git diff --cached --name-only | xargs grep -l "TODO\|FIXME\|XXX" > /dev/null; then
  echo "⚠️  Warning: Found TODO/FIXME/XXX in staged files"
  echo "Please address these before committing:"
  git diff --cached --name-only | xargs grep -n "TODO\|FIXME\|XXX"
  exit 1
fi
```

---

## Conclusion

These development guidelines ensure that TrustStream v4.2 maintains architectural flexibility while delivering robust, secure, and performant software. The key principles of abstraction-first design, explicit error handling, and provider agnosticism will enable the system to evolve and scale effectively.

**Next Steps:**
1. Review and implement abstraction layer usage patterns
2. Set up testing framework for abstracted components
3. Plan migration procedures for existing components
4. Establish monitoring and observability for the new architecture

For specific implementation guidance, refer to:
- [Abstraction Layer Usage Guide](./abstraction-layer-usage.md)
- [Testing Framework Documentation](./testing-framework.md)
- [Migration Procedures](./migration-procedures.md)