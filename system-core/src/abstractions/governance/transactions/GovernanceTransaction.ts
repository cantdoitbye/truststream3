/**
 * Governance Transaction Implementation
 * Provides transaction management for complex governance operations
 */

import { IGovernanceTransaction, IGovernanceRepository } from '../interfaces/IGovernanceRepository';
import { IGovernanceConnectionPool } from '../interfaces/IGovernanceDatabase';
import { GovernanceRepositoryFactory } from './GovernanceRepositoryFactory';

export class GovernanceTransaction implements IGovernanceTransaction {
  private connection: any;
  private connectionPool: IGovernanceConnectionPool;
  private isActive: boolean = false;
  private repositoryFactory: GovernanceRepositoryFactory;
  private repositories: Map<string, IGovernanceRepository<any>> = new Map();

  constructor(connectionPool: IGovernanceConnectionPool) {
    this.connectionPool = connectionPool;
    this.repositoryFactory = new GovernanceRepositoryFactory(connectionPool);
  }

  async begin(): Promise<void> {
    if (this.isActive) {
      throw new Error('Transaction is already active');
    }

    this.connection = await this.connectionPool.getConnection();
    await this.connection.query('BEGIN');
    this.isActive = true;
  }

  async commit(): Promise<void> {
    if (!this.isActive) {
      throw new Error('No active transaction to commit');
    }

    try {
      await this.connection.query('COMMIT');
    } finally {
      this.isActive = false;
      await this.connectionPool.releaseConnection(this.connection);
      this.connection = null;
      this.repositories.clear();
    }
  }

  async rollback(): Promise<void> {
    if (!this.isActive) {
      throw new Error('No active transaction to rollback');
    }

    try {
      await this.connection.query('ROLLBACK');
    } finally {
      this.isActive = false;
      await this.connectionPool.releaseConnection(this.connection);
      this.connection = null;
      this.repositories.clear();
    }
  }

  async execute<T>(operation: (tx: IGovernanceTransaction) => Promise<T>): Promise<T> {
    await this.begin();
    try {
      const result = await operation(this);
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }

  getRepository<T>(entityType: string): IGovernanceRepository<T> {
    if (!this.isActive) {
      throw new Error('Transaction is not active');
    }

    // Return cached repository if exists
    if (this.repositories.has(entityType)) {
      return this.repositories.get(entityType);
    }

    // Create new transactional repository
    const repository = this.repositoryFactory.createTransactionalRepository<T>(
      entityType,
      this.connection
    );
    
    this.repositories.set(entityType, repository);
    return repository;
  }

  /**
   * Execute raw SQL within transaction
   */
  async query(sql: string, params?: any[]): Promise<any[]> {
    if (!this.isActive) {
      throw new Error('Transaction is not active');
    }

    const result = await this.connection.query(sql, params);
    return result.rows;
  }

  /**
   * Create savepoint for nested transactions
   */
  async savepoint(name: string): Promise<void> {
    if (!this.isActive) {
      throw new Error('Transaction is not active');
    }

    await this.connection.query(`SAVEPOINT ${name}`);
  }

  /**
   * Rollback to savepoint
   */
  async rollbackToSavepoint(name: string): Promise<void> {
    if (!this.isActive) {
      throw new Error('Transaction is not active');
    }

    await this.connection.query(`ROLLBACK TO SAVEPOINT ${name}`);
  }

  /**
   * Release savepoint
   */
  async releaseSavepoint(name: string): Promise<void> {
    if (!this.isActive) {
      throw new Error('Transaction is not active');
    }

    await this.connection.query(`RELEASE SAVEPOINT ${name}`);
  }

  /**
   * Check if transaction is active
   */
  get active(): boolean {
    return this.isActive;
  }

  /**
   * Get connection (for internal use)
   */
  getConnection(): any {
    if (!this.isActive) {
      throw new Error('Transaction is not active');
    }
    return this.connection;
  }
}

/**
 * Transactional Repository Wrapper
 * Wraps repository to use transaction connection
 */
export class TransactionalRepository<T> implements IGovernanceRepository<T> {
  private baseRepository: IGovernanceRepository<T>;
  private connection: any;

  constructor(baseRepository: IGovernanceRepository<T>, connection: any) {
    this.baseRepository = baseRepository;
    this.connection = connection;
  }

  async findById(id: string): Promise<T | null> {
    const result = await this.connection.query(
      `SELECT * FROM ${this.getTableName()} WHERE id = $1`,
      [id]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async findBy(criteria: Partial<T>): Promise<T[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(criteria)) {
      if (value !== undefined) {
        conditions.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await this.connection.query(
      `SELECT * FROM ${this.getTableName()} ${whereClause}`,
      values
    );
    return result.rows;
  }

  async findAll(pagination?: { offset: number; limit: number }): Promise<T[]> {
    let query = `SELECT * FROM ${this.getTableName()}`;
    const values: any[] = [];

    if (pagination) {
      query += ` OFFSET $1 LIMIT $2`;
      values.push(pagination.offset, pagination.limit);
    }

    const result = await this.connection.query(query, values);
    return result.rows;
  }

  async create(entity: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    const columns = Object.keys(entity);
    const values = Object.values(entity);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    
    const result = await this.connection.query(
      `INSERT INTO ${this.getTableName()} (${columns.join(', ')}, created_at, updated_at)
       VALUES (${placeholders}, NOW(), NOW())
       RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async update(id: string, updates: Partial<T>): Promise<T | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && key !== 'id' && key !== 'created_at') {
        setClauses.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      return await this.findById(id);
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const result = await this.connection.query(
      `UPDATE ${this.getTableName()}
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.connection.query(
      `DELETE FROM ${this.getTableName()} WHERE id = $1`,
      [id]
    );
    return result.rowCount > 0;
  }

  async bulkCreate(entities: Omit<T, 'id' | 'created_at' | 'updated_at'>[]): Promise<T[]> {
    const results: T[] = [];
    for (const entity of entities) {
      const created = await this.create(entity);
      results.push(created);
    }
    return results;
  }

  async bulkUpdate(updates: { id: string; data: Partial<T> }[]): Promise<T[]> {
    const results: T[] = [];
    for (const update of updates) {
      const updated = await this.update(update.id, update.data);
      if (updated) results.push(updated);
    }
    return results;
  }

  async bulkDelete(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
    const result = await this.connection.query(
      `DELETE FROM ${this.getTableName()} WHERE id IN (${placeholders})`,
      ids
    );
    return result.rowCount;
  }

  async count(criteria?: Partial<T>): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM ${this.getTableName()}`;
    const values: any[] = [];

    if (criteria && Object.keys(criteria).length > 0) {
      const conditions: string[] = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(criteria)) {
        if (value !== undefined) {
          conditions.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
    }

    const result = await this.connection.query(query, values);
    return parseInt(result.rows[0].count);
  }

  async query(sql: string, params?: any[]): Promise<any[]> {
    const result = await this.connection.query(sql, params);
    return result.rows;
  }

  private getTableName(): string {
    // This should be implemented based on the entity type
    // For now, return a generic table name
    return 'governance_entities';
  }
}
