/**
 * Base Database Provider
 * Abstract base class for all database providers
 */

import { 
  IDatabaseService,
  DatabaseConfig,
  QueryOptions,
  WhereCondition,
  TransactionOperation,
  TableSchema,
  TableModification,
  IndexOptions,
  QueryAnalysis,
  DatabaseStats,
  DatabaseError,
  ConnectionError,
  QueryError,
  TransactionError
} from '../../../shared-utils/database-interface';
import { DatabaseConnectionPool, PoolConnection } from '../connection-pool/DatabaseConnectionPool';
import { EventEmitter } from 'events';

export abstract class BaseDatabaseProvider extends EventEmitter implements IDatabaseService {
  protected config: DatabaseConfig;
  protected connectionPool: DatabaseConnectionPool | null = null;
  protected isConnectedFlag = false;
  protected stats: DatabaseStats;

  constructor(config: DatabaseConfig) {
    super();
    this.config = config;
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      queryCount: 0,
      averageQueryTime: 0,
      errorCount: 0
    };
  }

  // Abstract methods to be implemented by providers
  abstract createRawConnection(): Promise<any>;
  abstract validateConnection(connection: any): Promise<boolean>;
  abstract closeRawConnection(connection: any): Promise<void>;
  abstract executeRawQuery(connection: any, query: string, params?: any[]): Promise<any>;
  abstract beginRawTransaction(connection: any): Promise<any>;
  abstract commitRawTransaction(connection: any, transaction: any): Promise<void>;
  abstract rollbackRawTransaction(connection: any, transaction: any): Promise<void>;

  // Connection Management
  async connect(config: DatabaseConfig): Promise<void> {
    this.config = { ...this.config, ...config };
    
    if (!this.connectionPool) {
      this.connectionPool = new DatabaseConnectionPool(
        this.config,
        () => this.createRawConnection(),
        (connection) => this.validateConnection(connection),
        (connection) => this.closeRawConnection(connection),
        {
          minConnections: 2,
          maxConnections: this.config.options?.maxConnections || 10,
          acquireTimeout: this.config.options?.timeout || 30000,
          idleTimeout: 600000, // 10 minutes
          maxLifetime: 3600000, // 1 hour
          healthCheckInterval: 30000 // 30 seconds
        }
      );

      await this.connectionPool.initialize();
    }

    this.isConnectedFlag = true;
    this.emit('connected');
  }

  async disconnect(): Promise<void> {
    if (this.connectionPool) {
      await this.connectionPool.shutdown();
      this.connectionPool = null;
    }
    this.isConnectedFlag = false;
    this.emit('disconnected');
  }

  isConnected(): boolean {
    return this.isConnectedFlag && this.connectionPool !== null;
  }

  getStats(): DatabaseStats {
    if (this.connectionPool) {
      const poolStats = this.connectionPool.getStats();
      this.stats.totalConnections = poolStats.totalConnections;
      this.stats.activeConnections = poolStats.activeConnections;
    }
    return { ...this.stats };
  }

  // CRUD Operations
  async create<T>(table: string, data: Partial<T>): Promise<T> {
    this.ensureConnected();
    const startTime = Date.now();

    try {
      const result = await this.connectionPool!.execute(async (connection) => {
        return await this.executeCreate(connection, table, data);
      });

      this.updateStats(Date.now() - startTime);
      return result;
    } catch (error) {
      this.stats.errorCount++;
      throw new QueryError(`Failed to create record in ${table}`, '', error);
    }
  }

  async read<T>(table: string, query?: QueryOptions): Promise<T[]> {
    this.ensureConnected();
    const startTime = Date.now();

    try {
      const result = await this.connectionPool!.execute(async (connection) => {
        return await this.executeRead(connection, table, query);
      });

      this.updateStats(Date.now() - startTime);
      return result;
    } catch (error) {
      this.stats.errorCount++;
      throw new QueryError(`Failed to read from ${table}`, '', error);
    }
  }

  async readOne<T>(table: string, query: QueryOptions): Promise<T | null> {
    const results = await this.read<T>(table, { ...query, limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  async update<T>(table: string, id: string, data: Partial<T>): Promise<T> {
    this.ensureConnected();
    const startTime = Date.now();

    try {
      const result = await this.connectionPool!.execute(async (connection) => {
        return await this.executeUpdate(connection, table, id, data);
      });

      this.updateStats(Date.now() - startTime);
      return result;
    } catch (error) {
      this.stats.errorCount++;
      throw new QueryError(`Failed to update record in ${table}`, '', error);
    }
  }

  async delete(table: string, id: string): Promise<boolean> {
    this.ensureConnected();
    const startTime = Date.now();

    try {
      const result = await this.connectionPool!.execute(async (connection) => {
        return await this.executeDelete(connection, table, id);
      });

      this.updateStats(Date.now() - startTime);
      return result;
    } catch (error) {
      this.stats.errorCount++;
      throw new QueryError(`Failed to delete record from ${table}`, '', error);
    }
  }

  // Batch Operations
  async createMany<T>(table: string, data: Partial<T>[]): Promise<T[]> {
    this.ensureConnected();
    const startTime = Date.now();

    try {
      const result = await this.connectionPool!.execute(async (connection) => {
        return await this.executeCreateMany(connection, table, data);
      });

      this.updateStats(Date.now() - startTime);
      return result;
    } catch (error) {
      this.stats.errorCount++;
      throw new QueryError(`Failed to create multiple records in ${table}`, '', error);
    }
  }

  async updateMany<T>(table: string, query: QueryOptions, data: Partial<T>): Promise<T[]> {
    this.ensureConnected();
    const startTime = Date.now();

    try {
      const result = await this.connectionPool!.execute(async (connection) => {
        return await this.executeUpdateMany(connection, table, query, data);
      });

      this.updateStats(Date.now() - startTime);
      return result;
    } catch (error) {
      this.stats.errorCount++;
      throw new QueryError(`Failed to update multiple records in ${table}`, '', error);
    }
  }

  async deleteMany(table: string, query: QueryOptions): Promise<number> {
    this.ensureConnected();
    const startTime = Date.now();

    try {
      const result = await this.connectionPool!.execute(async (connection) => {
        return await this.executeDeleteMany(connection, table, query);
      });

      this.updateStats(Date.now() - startTime);
      return result;
    } catch (error) {
      this.stats.errorCount++;
      throw new QueryError(`Failed to delete multiple records from ${table}`, '', error);
    }
  }

  // Advanced Queries
  async rawQuery<T>(query: string, params?: any[]): Promise<T[]> {
    this.ensureConnected();
    const startTime = Date.now();

    try {
      const result = await this.connectionPool!.execute(async (connection) => {
        return await this.executeRawQuery(connection, query, params);
      });

      this.updateStats(Date.now() - startTime);
      return result;
    } catch (error) {
      this.stats.errorCount++;
      throw new QueryError(`Failed to execute raw query`, query, error);
    }
  }

  async transaction<T>(operations: TransactionOperation[]): Promise<T> {
    this.ensureConnected();
    const startTime = Date.now();

    try {
      const result = await this.connectionPool!.execute(async (connection) => {
        return await this.executeTransaction(connection, operations);
      });

      this.updateStats(Date.now() - startTime);
      return result;
    } catch (error) {
      this.stats.errorCount++;
      throw new TransactionError(`Transaction failed`, error);
    }
  }

  async count(table: string, query?: QueryOptions): Promise<number> {
    this.ensureConnected();
    const startTime = Date.now();

    try {
      const result = await this.connectionPool!.execute(async (connection) => {
        return await this.executeCount(connection, table, query);
      });

      this.updateStats(Date.now() - startTime);
      return result;
    } catch (error) {
      this.stats.errorCount++;
      throw new QueryError(`Failed to count records in ${table}`, '', error);
    }
  }

  async exists(table: string, query: QueryOptions): Promise<boolean> {
    const count = await this.count(table, { ...query, limit: 1 });
    return count > 0;
  }

  // Schema Management (default implementations)
  async createTable(schema: TableSchema): Promise<void> {
    throw new DatabaseError(`createTable not implemented by ${this.constructor.name}`);
  }

  async dropTable(tableName: string): Promise<void> {
    throw new DatabaseError(`dropTable not implemented by ${this.constructor.name}`);
  }

  async alterTable(tableName: string, modifications: TableModification[]): Promise<void> {
    throw new DatabaseError(`alterTable not implemented by ${this.constructor.name}`);
  }

  async getTableSchema(tableName: string): Promise<TableSchema> {
    throw new DatabaseError(`getTableSchema not implemented by ${this.constructor.name}`);
  }

  async listTables(): Promise<string[]> {
    throw new DatabaseError(`listTables not implemented by ${this.constructor.name}`);
  }

  // Indexing and Performance
  async createIndex(tableName: string, columns: string[], options?: IndexOptions): Promise<void> {
    throw new DatabaseError(`createIndex not implemented by ${this.constructor.name}`);
  }

  async dropIndex(indexName: string): Promise<void> {
    throw new DatabaseError(`dropIndex not implemented by ${this.constructor.name}`);
  }

  async analyzeQuery(query: string): Promise<QueryAnalysis> {
    throw new DatabaseError(`analyzeQuery not implemented by ${this.constructor.name}`);
  }

  async optimizeTable(tableName: string): Promise<void> {
    throw new DatabaseError(`optimizeTable not implemented by ${this.constructor.name}`);
  }

  // Utility Methods
  async ping(): Promise<boolean> {
    try {
      await this.rawQuery('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async vacuum(): Promise<void> {
    throw new DatabaseError(`vacuum not implemented by ${this.constructor.name}`);
  }

  async backup(path: string): Promise<void> {
    throw new DatabaseError(`backup not implemented by ${this.constructor.name}`);
  }

  async restore(path: string): Promise<void> {
    throw new DatabaseError(`restore not implemented by ${this.constructor.name}`);
  }

  // Abstract methods for providers to implement
  protected abstract executeCreate(connection: any, table: string, data: any): Promise<any>;
  protected abstract executeRead(connection: any, table: string, query?: QueryOptions): Promise<any[]>;
  protected abstract executeUpdate(connection: any, table: string, id: string, data: any): Promise<any>;
  protected abstract executeDelete(connection: any, table: string, id: string): Promise<boolean>;
  protected abstract executeCreateMany(connection: any, table: string, data: any[]): Promise<any[]>;
  protected abstract executeUpdateMany(connection: any, table: string, query: QueryOptions, data: any): Promise<any[]>;
  protected abstract executeDeleteMany(connection: any, table: string, query: QueryOptions): Promise<number>;
  protected abstract executeCount(connection: any, table: string, query?: QueryOptions): Promise<number>;
  protected abstract executeTransaction(connection: any, operations: TransactionOperation[]): Promise<any>;

  // Helper methods
  protected ensureConnected(): void {
    if (!this.isConnected()) {
      throw new ConnectionError('Database is not connected');
    }
  }

  protected updateStats(queryTime: number): void {
    this.stats.queryCount++;
    this.stats.averageQueryTime = 
      (this.stats.averageQueryTime * (this.stats.queryCount - 1) + queryTime) / this.stats.queryCount;
  }

  protected buildWhereClause(conditions: WhereCondition[]): { clause: string; params: any[] } {
    if (!conditions || conditions.length === 0) {
      return { clause: '', params: [] };
    }

    const clauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    for (const condition of conditions) {
      const { column, operator, value, values } = condition;
      
      switch (operator) {
        case 'eq':
          clauses.push(`${column} = $${paramIndex}`);
          params.push(value);
          paramIndex++;
          break;
        case 'neq':
          clauses.push(`${column} != $${paramIndex}`);
          params.push(value);
          paramIndex++;
          break;
        case 'gt':
          clauses.push(`${column} > $${paramIndex}`);
          params.push(value);
          paramIndex++;
          break;
        case 'gte':
          clauses.push(`${column} >= $${paramIndex}`);
          params.push(value);
          paramIndex++;
          break;
        case 'lt':
          clauses.push(`${column} < $${paramIndex}`);
          params.push(value);
          paramIndex++;
          break;
        case 'lte':
          clauses.push(`${column} <= $${paramIndex}`);
          params.push(value);
          paramIndex++;
          break;
        case 'like':
          clauses.push(`${column} LIKE $${paramIndex}`);
          params.push(value);
          paramIndex++;
          break;
        case 'ilike':
          clauses.push(`${column} ILIKE $${paramIndex}`);
          params.push(value);
          paramIndex++;
          break;
        case 'in':
          if (values && values.length > 0) {
            const placeholders = values.map(() => `$${paramIndex++}`).join(', ');
            clauses.push(`${column} IN (${placeholders})`);
            params.push(...values);
          }
          break;
        case 'not_in':
          if (values && values.length > 0) {
            const placeholders = values.map(() => `$${paramIndex++}`).join(', ');
            clauses.push(`${column} NOT IN (${placeholders})`);
            params.push(...values);
          }
          break;
        case 'is_null':
          clauses.push(`${column} IS NULL`);
          break;
        case 'not_null':
          clauses.push(`${column} IS NOT NULL`);
          break;
      }
    }

    return {
      clause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
      params
    };
  }

  protected buildOrderClause(orderBy?: { column: string; direction: 'ASC' | 'DESC' }): string {
    if (!orderBy) return '';
    return `ORDER BY ${orderBy.column} ${orderBy.direction}`;
  }

  protected buildLimitClause(limit?: number, offset?: number): string {
    let clause = '';
    if (limit) {
      clause += `LIMIT ${limit}`;
    }
    if (offset) {
      clause += ` OFFSET ${offset}`;
    }
    return clause;
  }
}