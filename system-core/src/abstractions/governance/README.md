# Governance Database Abstraction Layer

A comprehensive TypeScript database abstraction layer for governance operations in TrustStream v4.2.

## Overview

This abstraction layer provides a robust, type-safe interface for managing governance data operations including:

- **Repository Pattern Implementation**: Clean separation of data access logic
- **Transaction Management**: Complex governance operations with ACID guarantees
- **Query Builders**: Fluent API for building complex governance queries
- **Migration Utilities**: Schema evolution and version control

## Features

### 🏗️ Repository Pattern
- Type-safe entity operations (CRUD)
- Bulk operations support
- Custom query execution
- Automatic mapping between database rows and TypeScript entities

### 🔄 Transaction Management
- Nested transaction support with savepoints
- Automatic rollback on errors
- Transactional repository instances
- Batch operations within transactions

### 🔍 Query Builder
- Fluent API for complex queries
- Support for joins, aggregations, and pagination
- SQL generation with parameterized queries
- Type-safe query construction

### 📦 Migration System
- Version-controlled schema changes
- Dependency management between migrations
- Automatic rollback capabilities
- Migration status tracking

## Quick Start

### Installation

```typescript
import {
  createGovernanceDatabase,
  IGovernanceDatabaseConfig
} from './abstractions/governance';

// Configuration
const config: IGovernanceDatabaseConfig = {
  host: 'localhost',
  port: 5432,
  database: 'governance',
  username: 'user',
  password: 'password',
  poolSize: 10,
  ssl: false
};

// Initialize database
const database = await createGovernanceDatabase(config);
```

### Basic Usage

```typescript
// Get repositories
const proposalRepo = database.getRepository<GovernanceProposal>('governance_proposal');
const voteRepo = database.getRepository<GovernanceVote>('governance_vote');

// Create a new proposal
const proposal = await proposalRepo.create({
  title: 'Budget Allocation for Q4',
  description: 'Proposal to allocate budget for Q4 initiatives',
  proposer_id: 'user-123',
  type: 'budget',
  voting_start_date: new Date(),
  voting_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  required_quorum: 50,
  required_majority: 60
});

// Cast a vote
const vote = await voteRepo.create({
  proposal_id: proposal.id,
  voter_id: 'voter-456',
  vote: 'yes',
  weight: 1.0,
  reasoning: 'This budget allocation will improve our infrastructure'
});
```

### Transaction Example

```typescript
// Complex operation with transaction
const result = await database.transaction(async (tx) => {
  const proposalRepo = tx.getRepository<GovernanceProposal>('governance_proposal');
  const auditRepo = tx.getRepository<GovernanceAuditLog>('governance_audit_log');
  
  // Create proposal
  const proposal = await proposalRepo.create({
    title: 'New Policy Implementation',
    description: 'Implementation of new governance policy',
    proposer_id: 'user-789',
    type: 'policy',
    voting_start_date: new Date(),
    voting_end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    required_quorum: 75,
    required_majority: 66
  });
  
  // Log audit trail
  await auditRepo.create({
    action: 'proposal_created',
    entity_type: 'governance_proposal',
    entity_id: proposal.id,
    actor_id: 'user-789',
    new_values: proposal
  });
  
  return proposal;
});
```

### Query Builder Example

```typescript
// Complex query with joins and filtering
const activeProposals = await database
  .createQueryBuilder<GovernanceProposal>('governance_proposal')
  .select(['id', 'title', 'description', 'status'])
  .where('status = ?', 'active')
  .where('voting_end_date > ?', new Date())
  .leftJoin('governance_votes', 'governance_votes.proposal_id = governance_proposals.id')
  .groupBy(['governance_proposals.id'])
  .orderBy('created_at', 'DESC')
  .limit(10)
  .execute();
```

### Migration Example

```typescript
// Run all pending migrations
await database.runMigrations();

// Check migration status
const status = await database.getMigrationStatus();
console.log('Applied migrations:', status);

// Rollback specific migration (if needed)
await database.rollbackMigration('20250920000003');
```

## Architecture

### Entity Types

- **GovernanceProposal**: Governance proposals and initiatives
- **GovernanceVote**: Individual votes on proposals
- **GovernancePolicy**: Active governance policies
- **GovernanceParticipant**: Governance participants and their roles
- **GovernanceCommittee**: Governance committees and working groups
- **GovernanceDecision**: Final decisions on proposals
- **GovernanceAuditLog**: Audit trail for governance actions
- **GovernanceAnalytics**: Governance metrics and analytics
- **GovernanceNotification**: Governance-related notifications

### Key Components

1. **IGovernanceDatabase**: Main database interface
2. **IGovernanceRepository**: Repository interface for entities
3. **IGovernanceTransaction**: Transaction management interface
4. **IGovernanceQueryBuilder**: Query building interface
5. **IGovernanceMigration**: Migration interface

### Database Schema

The system automatically creates and manages the following tables:

- `governance_proposals`
- `governance_votes`
- `governance_policies`
- `governance_participants`
- `governance_committees`
- `governance_decisions`
- `governance_audit_logs`
- `governance_analytics`
- `governance_notifications`
- `governance_migrations` (system table)

## Utilities

### GovernanceUtils

Helper functions for common governance operations:

```typescript
import { GovernanceUtils } from './abstractions/governance';

// Calculate total voting power including delegations
const votingPower = await GovernanceUtils.calculateTotalVotingPower(
  database,
  'participant-id'
);

// Check if proposal reached quorum
const hasQuorum = await GovernanceUtils.checkQuorum(
  database,
  'proposal-id'
);

// Calculate proposal results
const result = await GovernanceUtils.calculateProposalResult(
  database,
  'proposal-id'
);
console.log(`Proposal passed: ${result.passed}`);
console.log(`Yes votes: ${result.yesPercentage}%`);
```

## Configuration

### Environment Variables

```bash
GOVERNANCE_DB_HOST=localhost
GOVERNANCE_DB_PORT=5432
GOVERNANCE_DB_NAME=governance
GOVERNANCE_DB_USER=postgres
GOVERNANCE_DB_PASSWORD=password
GOVERNANCE_DB_SSL=false
GOVERNANCE_DB_POOL_SIZE=10
GOVERNANCE_DB_CONNECTION_TIMEOUT=30000
GOVERNANCE_DB_QUERY_TIMEOUT=30000
GOVERNANCE_DB_RETRY_ATTEMPTS=3
GOVERNANCE_DB_RETRY_DELAY=1000
```

### Create from Environment

```typescript
import { createGovernanceDatabaseFromEnv } from './abstractions/governance';

const database = await createGovernanceDatabaseFromEnv();
```

## Testing

```typescript
import { createTestGovernanceDatabase } from './abstractions/governance';

// Create test database instance
const testDatabase = await createTestGovernanceDatabase();

// Use in tests
describe('Governance Operations', () => {
  it('should create and retrieve proposals', async () => {
    const repo = testDatabase.getRepository<GovernanceProposal>('governance_proposal');
    
    const proposal = await repo.create({
      title: 'Test Proposal',
      description: 'Test Description',
      proposer_id: 'test-user',
      type: 'policy',
      voting_start_date: new Date(),
      voting_end_date: new Date(Date.now() + 86400000),
      required_quorum: 50,
      required_majority: 60
    });
    
    expect(proposal.id).toBeDefined();
    expect(proposal.title).toBe('Test Proposal');
  });
});
```

## Best Practices

1. **Always use transactions** for operations that modify multiple entities
2. **Use query builders** for complex queries instead of raw SQL
3. **Implement proper error handling** with try-catch blocks
4. **Use connection pooling** for better performance
5. **Run migrations** in a controlled manner during deployments
6. **Monitor connection pool** statistics for optimization
7. **Use type guards** to ensure entity type safety

## Performance Considerations

- Connection pooling automatically manages database connections
- Indexes are automatically created for common query patterns
- Use pagination for large result sets
- Consider using `findBy` with specific criteria instead of `findAll`
- Monitor query performance and add indexes as needed

## Error Handling

The abstraction layer provides comprehensive error handling:

```typescript
try {
  const result = await database.transaction(async (tx) => {
    // Complex operations
  });
} catch (error) {
  console.error('Transaction failed:', error);
  // Error handling logic
}
```

## Contributing

When extending the governance abstraction layer:

1. Add new entity types to `GovernanceEntities.ts`
2. Create specific repository implementations
3. Add migration files for schema changes
4. Update type definitions and exports
5. Add comprehensive tests

## Migration Management

### Creating New Migrations

```typescript
import { MigrationUtils } from './abstractions/governance';

// Generate migration template
const template = MigrationUtils.createMigrationTemplate(
  'add_governance_metrics',
  'Add new metrics table for governance analytics'
);

console.log(template);
```

### Migration Best Practices

1. Always provide both `up()` and `down()` methods
2. Use transactions for complex schema changes
3. Test migrations thoroughly in development
4. Document breaking changes
5. Consider data migration alongside schema changes

This governance database abstraction layer provides a solid foundation for building scalable governance systems with proper data management, transaction safety, and performance optimization.
