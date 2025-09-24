# Abstraction Layer Foundation

This directory contains the foundational abstraction layer components for TrustStream v4.2, implementing Phase 1 of the abstraction layers design to reduce Supabase dependencies and enable flexible backend switching.

## Overview

The abstraction layer provides a unified interface for backend services, allowing the application to switch between different service providers (Supabase, PostgreSQL, AWS, etc.) without changing application code.

## Core Components

### 1. Service Container (`service-container.ts`)

Dependency injection framework that manages service lifecycle and provides type-safe service resolution.

```typescript
import { getContainer, SERVICE_TOKENS, Inject } from './service-container';

// Register a service
const container = getContainer();
container.registerSingleton(SERVICE_TOKENS.DATABASE, () => new MockDatabaseService());

// Resolve a service
const database = container.resolve(SERVICE_TOKENS.DATABASE);

// Use property injection
class UserService {
  @Inject(SERVICE_TOKENS.DATABASE)
  private database: IDatabaseService;
}
```

### 2. Database Interface (`database-interface.ts`)

Unified database abstraction supporting CRUD operations, transactions, schema management, and query building.

```typescript
import { IDatabaseService, createQueryBuilder } from './database-interface';

// Basic CRUD operations
const user = await database.create('users', { name: 'John', email: 'john@example.com' });
const users = await database.read('users', { where: [{ column: 'active', operator: 'eq', value: true }] });

// Query builder
const query = createQueryBuilder()
  .select(['id', 'name', 'email'])
  .from('users')
  .where({ column: 'active', operator: 'eq', value: true })
  .orderBy('name', 'ASC')
  .limit(10)
  .build();

const results = await database.read('users', query);
```

### 3. Authentication Interface (`auth-interface.ts`)

Comprehensive authentication system supporting various auth methods, MFA, role-based access control, and social login.

```typescript
import { IAuthService, SignUpCredentials } from './auth-interface';

// User authentication
const result = await auth.signUp({
  email: 'user@example.com',
  password: 'securePassword123',
  metadata: { firstName: 'John', lastName: 'Doe' }
});

// Session management
const session = await auth.getSession();
const user = await auth.getCurrentUser();

// Role-based access
const hasPermission = await auth.hasPermission('posts:create');
```

### 4. Storage Interface (`storage-interface.ts`)

File storage abstraction supporting multiple storage backends with features like file upload, metadata management, and bucket operations.

```typescript
import { IStorageService, UploadOptions } from './storage-interface';

// File upload
const result = await storage.upload('avatars/user123.jpg', fileBuffer, {
  contentType: 'image/jpeg',
  metadata: { userId: '123', uploadedBy: 'user' }
});

// File operations
const files = await storage.listFiles('documents/', { limit: 20 });
const metadata = await storage.getMetadata('documents/report.pdf');
const publicUrl = storage.getPublicUrl('images/logo.png');
```

### 5. Configuration Manager (`config-manager.ts`)

Centralized configuration management with environment-specific overrides, feature flags, and type-safe configuration access.

```typescript
import { loadConfiguration, getConfig, isFeatureEnabled } from './config-manager';

// Load configuration
await loadConfiguration({
  environment: 'development',
  configPaths: ['./config/default.json', './config/development.json'],
  validateSchema: true
});

// Access configuration
const dbConfig = getConfig('database.config');
const appName = getConfig('app.name', 'TrustStream');

// Feature flags
if (isFeatureEnabled('newUserInterface')) {
  // Enable new UI features
}
```

## Service Registration and Usage

### Setting Up Services

```typescript
import { 
  getContainer, 
  SERVICE_TOKENS, 
  loadConfiguration,
  getConfigurationManager 
} from './shared-utils';

// Load configuration
await loadConfiguration();
const configManager = getConfigurationManager();

// Get service configurations
const dbConfig = configManager.getDatabaseConfig();
const authConfig = configManager.getAuthConfig();
const storageConfig = configManager.getStorageConfig();

// Register services based on configuration
const container = getContainer();

// Database service
container.registerSingleton(SERVICE_TOKENS.DATABASE, () => {
  switch (dbConfig.type) {
    case 'supabase':
      return new SupabaseDatabaseService(dbConfig);
    case 'postgresql':
      return new PostgreSQLDatabaseService(dbConfig);
    case 'mock':
      return new MockDatabaseService(dbConfig);
    default:
      throw new Error(`Unknown database type: ${dbConfig.type}`);
  }
});

// Auth service
container.registerSingleton(SERVICE_TOKENS.AUTH, () => {
  switch (authConfig.type) {
    case 'supabase':
      return new SupabaseAuthService(authConfig);
    case 'firebase':
      return new FirebaseAuthService(authConfig);
    case 'mock':
      return new MockAuthService(authConfig);
    default:
      throw new Error(`Unknown auth type: ${authConfig.type}`);
  }
});

// Storage service
container.registerSingleton(SERVICE_TOKENS.STORAGE, () => {
  switch (storageConfig.type) {
    case 'supabase':
      return new SupabaseStorageService(storageConfig);
    case 'aws-s3':
      return new S3StorageService(storageConfig);
    case 'filesystem':
      return new FileSystemStorageService(storageConfig);
    case 'mock':
      return new MockStorageService(storageConfig);
    default:
      throw new Error(`Unknown storage type: ${storageConfig.type}`);
  }
});
```

### Using Services in Application Code

```typescript
import { resolve, SERVICE_TOKENS, Inject } from './shared-utils';

// Direct resolution
const database = resolve(SERVICE_TOKENS.DATABASE);
const auth = resolve(SERVICE_TOKENS.AUTH);
const storage = resolve(SERVICE_TOKENS.STORAGE);

// Property injection in classes
class PostService {
  @Inject(SERVICE_TOKENS.DATABASE)
  private database: IDatabaseService;
  
  @Inject(SERVICE_TOKENS.AUTH)
  private auth: IAuthService;
  
  @Inject(SERVICE_TOKENS.STORAGE)
  private storage: IStorageService;
  
  async createPost(data: CreatePostData): Promise<Post> {
    // Verify user authentication
    const user = await this.auth.getCurrentUser();
    if (!user) {
      throw new AuthenticationError('User not authenticated');
    }
    
    // Check permissions
    const canCreate = await this.auth.hasPermission('posts:create');
    if (!canCreate) {
      throw new AuthorizationError('Insufficient permissions');
    }
    
    // Upload featured image if provided
    let featuredImageUrl;
    if (data.featuredImage) {
      const uploadResult = await this.storage.upload(
        `posts/${data.slug}/featured.jpg`,
        data.featuredImage
      );
      featuredImageUrl = uploadResult.url;
    }
    
    // Create post in database
    const post = await this.database.create('posts', {
      ...data,
      authorId: user.id,
      featuredImageUrl,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return post;
  }
}
```

## Configuration Examples

### Development Configuration

```json
{
  "app": {
    "name": "TrustStream",
    "version": "4.2.0",
    "environment": "development",
    "debug": true,
    "port": 3000
  },
  "database": {
    "provider": "mock",
    "config": {
      "type": "mock"
    }
  },
  "auth": {
    "provider": "mock",
    "config": {
      "type": "mock"
    }
  },
  "storage": {
    "provider": "filesystem",
    "config": {
      "type": "filesystem",
      "filesystem": {
        "basePath": "./uploads",
        "createDirectories": true
      }
    }
  },
  "features": {
    "newUserInterface": true,
    "advancedAnalytics": false
  }
}
```

### Production Configuration

```json
{
  "app": {
    "name": "TrustStream",
    "version": "4.2.0",
    "environment": "production",
    "debug": false,
    "port": 8080
  },
  "database": {
    "provider": "supabase",
    "config": {
      "type": "supabase",
      "supabase": {
        "url": "https://your-project.supabase.co",
        "anonKey": "your-anon-key",
        "serviceRoleKey": "your-service-role-key"
      }
    }
  },
  "auth": {
    "provider": "supabase",
    "config": {
      "type": "supabase",
      "supabase": {
        "url": "https://your-project.supabase.co",
        "anonKey": "your-anon-key"
      }
    }
  },
  "storage": {
    "provider": "supabase",
    "config": {
      "type": "supabase",
      "supabase": {
        "url": "https://your-project.supabase.co",
        "key": "your-anon-key",
        "bucket": "main-storage"
      }
    }
  },
  "features": {
    "newUserInterface": true,
    "advancedAnalytics": true
  }
}
```

## Environment Variables

Configuration can also be set via environment variables with the `TRUSTSTREAM_` prefix:

```bash
# App configuration
TRUSTSTREAM_APP_NAME=TrustStream
TRUSTSTREAM_APP_VERSION=4.2.0
TRUSTSTREAM_APP_ENVIRONMENT=production
TRUSTSTREAM_APP_PORT=8080

# Database configuration
TRUSTSTREAM_DATABASE_PROVIDER=supabase
TRUSTSTREAM_DATABASE_CONFIG_SUPABASE_URL=https://your-project.supabase.co
TRUSTSTREAM_DATABASE_CONFIG_SUPABASE_ANONKEY=your-anon-key

# Feature flags
TRUSTSTREAM_FEATURES_NEWUSERINTERFACE=true
TRUSTSTREAM_FEATURES_ADVANCEDANALYTICS=false
```

## Error Handling

The abstraction layer provides comprehensive error handling with specific error types:

```typescript
import { 
  DatabaseError, 
  ConnectionError, 
  AuthenticationError, 
  StorageError 
} from './shared-utils';

try {
  const result = await database.create('users', userData);
} catch (error) {
  if (error instanceof ConnectionError) {
    // Handle database connection issues
    console.error('Database connection failed:', error.message);
  } else if (error instanceof DatabaseError) {
    // Handle general database errors
    console.error('Database error:', error.message, error.code);
  } else {
    // Handle unexpected errors
    console.error('Unexpected error:', error);
  }
}
```

## Testing

The abstraction layer makes testing easier by allowing mock implementations:

```typescript
import { getContainer, SERVICE_TOKENS } from './shared-utils';
import { MockDatabaseService, MockAuthService } from './mocks';

// Setup test environment
beforeEach(() => {
  const container = getContainer();
  container.register(SERVICE_TOKENS.DATABASE, () => new MockDatabaseService());
  container.register(SERVICE_TOKENS.AUTH, () => new MockAuthService());
});

// Test with mock services
it('should create a user', async () => {
  const userService = new UserService();
  const user = await userService.createUser({
    email: 'test@example.com',
    password: 'password123'
  });
  
  expect(user.email).toBe('test@example.com');
});
```

## Migration Strategy

The abstraction layer enables gradual migration from Supabase to other backends:

1. **Phase 1**: Implement abstractions with Supabase implementations
2. **Phase 2**: Add alternative implementations (PostgreSQL, AWS, etc.)
3. **Phase 3**: Switch configurations to use new backends
4. **Phase 4**: Remove Supabase dependencies

## Next Steps

1. Implement concrete service implementations for each abstraction
2. Create migration tools for data transfer between backends
3. Add comprehensive testing suite
4. Implement monitoring and observability
5. Create deployment automation for service switching

## Benefits

- **Vendor Independence**: No vendor lock-in, easy to switch backends
- **Testability**: Easy mocking and testing with dependency injection
- **Maintainability**: Clear separation of concerns and consistent APIs
- **Scalability**: Can optimize backends for specific use cases
- **Flexibility**: Runtime service selection based on configuration
