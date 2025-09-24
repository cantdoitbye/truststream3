/**
 * Governance Repository Interface
 * Defines the contract for governance data access layer
 */

export interface IGovernanceRepository<T> {
  /**
   * Find entity by ID
   */
  findById(id: string): Promise<T | null>;

  /**
   * Find entities by criteria
   */
  findBy(criteria: Partial<T>): Promise<T[]>;

  /**
   * Find all entities with optional pagination
   */
  findAll(pagination?: { offset: number; limit: number }): Promise<T[]>;

  /**
   * Create new entity
   */
  create(entity: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T>;

  /**
   * Update entity by ID
   */
  update(id: string, updates: Partial<T>): Promise<T | null>;

  /**
   * Delete entity by ID
   */
  delete(id: string): Promise<boolean>;

  /**
   * Bulk operations
   */
  bulkCreate(entities: Omit<T, 'id' | 'created_at' | 'updated_at'>[]): Promise<T[]>;
  bulkUpdate(updates: { id: string; data: Partial<T> }[]): Promise<T[]>;
  bulkDelete(ids: string[]): Promise<number>;

  /**
   * Count entities by criteria
   */
  count(criteria?: Partial<T>): Promise<number>;

  /**
   * Execute custom query
   */
  query(sql: string, params?: any[]): Promise<any[]>;
}

/**
 * Governance Transaction Interface
 * Defines the contract for transaction management
 */
export interface IGovernanceTransaction {
  /**
   * Begin transaction
   */
  begin(): Promise<void>;

  /**
   * Commit transaction
   */
  commit(): Promise<void>;

  /**
   * Rollback transaction
   */
  rollback(): Promise<void>;

  /**
   * Execute operation within transaction
   */
  execute<T>(operation: (tx: IGovernanceTransaction) => Promise<T>): Promise<T>;

  /**
   * Get repository within transaction context
   */
  getRepository<T>(entityType: string): IGovernanceRepository<T>;
}

/**
 * Query Builder Interface
 * Provides fluent API for building complex queries
 */
export interface IGovernanceQueryBuilder<T> {
  /**
   * Select columns
   */
  select(columns: string[] | string): IGovernanceQueryBuilder<T>;

  /**
   * Where conditions
   */
  where(condition: string, value?: any): IGovernanceQueryBuilder<T>;
  whereIn(column: string, values: any[]): IGovernanceQueryBuilder<T>;
  whereBetween(column: string, min: any, max: any): IGovernanceQueryBuilder<T>;
  whereNull(column: string): IGovernanceQueryBuilder<T>;
  whereNotNull(column: string): IGovernanceQueryBuilder<T>;

  /**
   * Joins
   */
  join(table: string, on: string): IGovernanceQueryBuilder<T>;
  leftJoin(table: string, on: string): IGovernanceQueryBuilder<T>;
  rightJoin(table: string, on: string): IGovernanceQueryBuilder<T>;

  /**
   * Ordering
   */
  orderBy(column: string, direction?: 'ASC' | 'DESC'): IGovernanceQueryBuilder<T>;

  /**
   * Grouping
   */
  groupBy(columns: string[] | string): IGovernanceQueryBuilder<T>;
  having(condition: string, value?: any): IGovernanceQueryBuilder<T>;

  /**
   * Pagination
   */
  limit(count: number): IGovernanceQueryBuilder<T>;
  offset(count: number): IGovernanceQueryBuilder<T>;

  /**
   * Execute query
   */
  execute(): Promise<T[]>;
  first(): Promise<T | null>;
  count(): Promise<number>;

  /**
   * Get generated SQL
   */
  toSQL(): { sql: string; params: any[] };
}

/**
 * Migration Interface
 * Defines contract for database migrations
 */
export interface IGovernanceMigration {
  /**
   * Migration name
   */
  name: string;

  /**
   * Migration version
   */
  version: string;

  /**
   * Migration description
   */
  description: string;

  /**
   * Execute migration up
   */
  up(): Promise<void>;

  /**
   * Execute migration down
   */
  down(): Promise<void>;

  /**
   * Check if migration can be rolled back
   */
  canRollback(): boolean;

  /**
   * Get migration dependencies
   */
  getDependencies(): string[];
}
