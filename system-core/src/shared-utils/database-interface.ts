/**
 * Database Interface - Core database abstraction layer
 * Provides unified interface for different database implementations
 */

// Core Types and Interfaces
export interface QueryOptions {
  select?: string[];
  where?: WhereCondition[];
  orderBy?: OrderByClause;
  limit?: number;
  offset?: number;
  joins?: JoinClause[];
}

export interface WhereCondition {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'not_in' | 'is_null' | 'not_null';
  value?: any;
  values?: any[];
}

export interface OrderByClause {
  column: string;
  direction: 'ASC' | 'DESC';
}

export interface JoinClause {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  table: string;
  condition: string;
}

export interface TransactionOperation {
  type: 'create' | 'update' | 'delete' | 'query';
  table: string;
  data?: any;
  query?: QueryOptions;
  sql?: string;
  params?: any[];
}

export interface TableSchema {
  name: string;
  columns: ColumnDefinition[];
  constraints?: TableConstraint[];
  indexes?: IndexDefinition[];
}

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable?: boolean;
  defaultValue?: any;
  primaryKey?: boolean;
  unique?: boolean;
}

export interface TableConstraint {
  type: 'PRIMARY_KEY' | 'FOREIGN_KEY' | 'UNIQUE' | 'CHECK';
  columns: string[];
  referencedTable?: string;
  referencedColumns?: string[];
  checkCondition?: string;
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  unique?: boolean;
  type?: 'BTREE' | 'HASH' | 'GIN' | 'GIST';
}

export interface TableModification {
  type: 'ADD_COLUMN' | 'DROP_COLUMN' | 'MODIFY_COLUMN' | 'ADD_CONSTRAINT' | 'DROP_CONSTRAINT';
  column?: ColumnDefinition;
  columnName?: string;
  constraint?: TableConstraint;
  constraintName?: string;
}

export interface IndexOptions {
  unique?: boolean;
  type?: string;
  where?: string;
}

export interface QueryAnalysis {
  executionTime: number;
  rowsAffected: number;
  indexesUsed: string[];
  suggestions: string[];
}

export interface DatabaseConfig {
  type: 'supabase' | 'postgresql' | 'mock';
  connection?: {
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
    maxConnections?: number;
  };
}

export interface DatabaseStats {
  totalConnections: number;
  activeConnections: number;
  queryCount: number;
  averageQueryTime: number;
  errorCount: number;
}

// Core Database Service Interface
export interface IDatabaseService {
  // Connection Management
  connect(config: DatabaseConfig): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getStats(): DatabaseStats;

  // CRUD Operations
  create<T>(table: string, data: Partial<T>): Promise<T>;
  read<T>(table: string, query?: QueryOptions): Promise<T[]>;
  readOne<T>(table: string, query: QueryOptions): Promise<T | null>;
  update<T>(table: string, id: string, data: Partial<T>): Promise<T>;
  delete(table: string, id: string): Promise<boolean>;

  // Batch Operations
  createMany<T>(table: string, data: Partial<T>[]): Promise<T[]>;
  updateMany<T>(table: string, query: QueryOptions, data: Partial<T>): Promise<T[]>;
  deleteMany(table: string, query: QueryOptions): Promise<number>;

  // Advanced Queries
  rawQuery<T>(query: string, params?: any[]): Promise<T[]>;
  transaction<T>(operations: TransactionOperation[]): Promise<T>;
  count(table: string, query?: QueryOptions): Promise<number>;
  exists(table: string, query: QueryOptions): Promise<boolean>;

  // Schema Management
  createTable(schema: TableSchema): Promise<void>;
  dropTable(tableName: string): Promise<void>;
  alterTable(tableName: string, modifications: TableModification[]): Promise<void>;
  getTableSchema(tableName: string): Promise<TableSchema>;
  listTables(): Promise<string[]>;

  // Indexing and Performance
  createIndex(tableName: string, columns: string[], options?: IndexOptions): Promise<void>;
  dropIndex(indexName: string): Promise<void>;
  analyzeQuery(query: string): Promise<QueryAnalysis>;
  optimizeTable(tableName: string): Promise<void>;

  // Utility Methods
  ping(): Promise<boolean>;
  vacuum(): Promise<void>;
  backup(path: string): Promise<void>;
  restore(path: string): Promise<void>;
}

// Query Builder Interface
export interface IQueryBuilder {
  select(columns: string[]): IQueryBuilder;
  from(table: string): IQueryBuilder;
  where(condition: WhereCondition): IQueryBuilder;
  whereAnd(conditions: WhereCondition[]): IQueryBuilder;
  whereOr(conditions: WhereCondition[]): IQueryBuilder;
  join(type: JoinClause['type'], table: string, condition: string): IQueryBuilder;
  orderBy(column: string, direction: 'ASC' | 'DESC'): IQueryBuilder;
  groupBy(columns: string[]): IQueryBuilder;
  having(condition: WhereCondition): IQueryBuilder;
  limit(count: number): IQueryBuilder;
  offset(count: number): IQueryBuilder;
  distinct(): IQueryBuilder;
  build(): QueryOptions;
  toSQL(): { sql: string; params: any[] };
}

// Database Event Interface
export interface IDatabaseEventService {
  onConnection(callback: (connected: boolean) => void): () => void;
  onQuery(callback: (query: string, duration: number) => void): () => void;
  onError(callback: (error: Error) => void): () => void;
  onTransaction(callback: (operations: TransactionOperation[], result: any) => void): () => void;
}

// Repository Pattern Interface
export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findOne(query: QueryOptions): Promise<T | null>;
  findMany(query?: QueryOptions): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
  count(query?: QueryOptions): Promise<number>;
  exists(query: QueryOptions): Promise<boolean>;
}

// Base Repository Implementation
export abstract class BaseRepository<T> implements IRepository<T> {
  protected abstract tableName: string;
  protected abstract database: IDatabaseService;

  async findById(id: string): Promise<T | null> {
    return this.database.readOne<T>(this.tableName, {
      where: [{ column: 'id', operator: 'eq', value: id }]
    });
  }

  async findOne(query: QueryOptions): Promise<T | null> {
    return this.database.readOne<T>(this.tableName, query);
  }

  async findMany(query: QueryOptions = {}): Promise<T[]> {
    return this.database.read<T>(this.tableName, query);
  }

  async create(data: Partial<T>): Promise<T> {
    return this.database.create<T>(this.tableName, data);
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    return this.database.update<T>(this.tableName, id, data);
  }

  async delete(id: string): Promise<boolean> {
    return this.database.delete(this.tableName, id);
  }

  async count(query: QueryOptions = {}): Promise<number> {
    return this.database.count(this.tableName, query);
  }

  async exists(query: QueryOptions): Promise<boolean> {
    return this.database.exists(this.tableName, query);
  }
}

// Database Error Classes
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ConnectionError extends DatabaseError {
  constructor(message: string, details?: any) {
    super(message, 'CONNECTION_ERROR', details);
    this.name = 'ConnectionError';
  }
}

export class QueryError extends DatabaseError {
  constructor(message: string, public query?: string, details?: any) {
    super(message, 'QUERY_ERROR', details);
    this.name = 'QueryError';
  }
}

export class TransactionError extends DatabaseError {
  constructor(message: string, details?: any) {
    super(message, 'TRANSACTION_ERROR', details);
    this.name = 'TransactionError';
  }
}

export class SchemaError extends DatabaseError {
  constructor(message: string, details?: any) {
    super(message, 'SCHEMA_ERROR', details);
    this.name = 'SchemaError';
  }
}

// Utility Functions
export function createQueryBuilder(): IQueryBuilder {
  return new QueryBuilder();
}

// Basic Query Builder Implementation
class QueryBuilder implements IQueryBuilder {
  private query: QueryOptions = {};

  select(columns: string[]): IQueryBuilder {
    this.query.select = columns;
    return this;
  }

  from(table: string): IQueryBuilder {
    // Store table for SQL generation
    (this.query as any).table = table;
    return this;
  }

  where(condition: WhereCondition): IQueryBuilder {
    if (!this.query.where) {
      this.query.where = [];
    }
    this.query.where.push(condition);
    return this;
  }

  whereAnd(conditions: WhereCondition[]): IQueryBuilder {
    if (!this.query.where) {
      this.query.where = [];
    }
    this.query.where.push(...conditions);
    return this;
  }

  whereOr(conditions: WhereCondition[]): IQueryBuilder {
    // For OR conditions, we'd need to extend the WhereCondition interface
    // For now, just add them as regular conditions
    return this.whereAnd(conditions);
  }

  join(type: JoinClause['type'], table: string, condition: string): IQueryBuilder {
    if (!this.query.joins) {
      this.query.joins = [];
    }
    this.query.joins.push({ type, table, condition });
    return this;
  }

  orderBy(column: string, direction: 'ASC' | 'DESC'): IQueryBuilder {
    this.query.orderBy = { column, direction };
    return this;
  }

  groupBy(columns: string[]): IQueryBuilder {
    // Would need to extend QueryOptions for GROUP BY
    return this;
  }

  having(condition: WhereCondition): IQueryBuilder {
    // Would need to extend QueryOptions for HAVING
    return this;
  }

  limit(count: number): IQueryBuilder {
    this.query.limit = count;
    return this;
  }

  offset(count: number): IQueryBuilder {
    this.query.offset = count;
    return this;
  }

  distinct(): IQueryBuilder {
    // Would need to extend QueryOptions for DISTINCT
    return this;
  }

  build(): QueryOptions {
    return { ...this.query };
  }

  toSQL(): { sql: string; params: any[] } {
    // Basic SQL generation - would need full implementation
    const table = (this.query as any).table || 'unknown';
    const columns = this.query.select?.join(', ') || '*';
    let sql = `SELECT ${columns} FROM ${table}`;
    const params: any[] = [];

    if (this.query.where && this.query.where.length > 0) {
      const whereClause = this.query.where.map((condition, index) => {
        params.push(condition.value);
        return `${condition.column} ${this.getOperatorSQL(condition.operator)} $${index + 1}`;
      }).join(' AND ');
      sql += ` WHERE ${whereClause}`;
    }

    if (this.query.orderBy) {
      sql += ` ORDER BY ${this.query.orderBy.column} ${this.query.orderBy.direction}`;
    }

    if (this.query.limit) {
      sql += ` LIMIT ${this.query.limit}`;
    }

    if (this.query.offset) {
      sql += ` OFFSET ${this.query.offset}`;
    }

    return { sql, params };
  }

  private getOperatorSQL(operator: WhereCondition['operator']): string {
    const operatorMap = {
      'eq': '=',
      'neq': '!=',
      'gt': '>',
      'gte': '>=',
      'lt': '<',
      'lte': '<=',
      'like': 'LIKE',
      'ilike': 'ILIKE',
      'in': 'IN',
      'not_in': 'NOT IN',
      'is_null': 'IS NULL',
      'not_null': 'IS NOT NULL'
    };
    return operatorMap[operator] || '=';
  }
}
