/**
 * Base Repository Implementation
 * Provides common repository functionality for governance entities
 */

import { IGovernanceRepository, IGovernanceQueryBuilder } from '../interfaces/IGovernanceRepository';
import { IGovernanceConnectionPool } from '../interfaces/IGovernanceDatabase';
import { GovernanceQueryBuilder } from './GovernanceQueryBuilder';

export abstract class BaseGovernanceRepository<T> implements IGovernanceRepository<T> {
  protected tableName: string;
  protected connectionPool: IGovernanceConnectionPool;
  protected primaryKey: string = 'id';

  constructor(tableName: string, connectionPool: IGovernanceConnectionPool) {
    this.tableName = tableName;
    this.connectionPool = connectionPool;
  }

  async findById(id: string): Promise<T | null> {
    const connection = await this.connectionPool.getConnection();
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
      const result = await connection.query(query, [id]);
      return result.rows.length > 0 ? this.mapRowToEntity(result.rows[0]) : null;
    } finally {
      await this.connectionPool.releaseConnection(connection);
    }
  }

  async findBy(criteria: Partial<T>): Promise<T[]> {
    const connection = await this.connectionPool.getConnection();
    try {
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
      const query = `SELECT * FROM ${this.tableName} ${whereClause}`;
      
      const result = await connection.query(query, values);
      return result.rows.map(row => this.mapRowToEntity(row));
    } finally {
      await this.connectionPool.releaseConnection(connection);
    }
  }

  async findAll(pagination?: { offset: number; limit: number }): Promise<T[]> {
    const connection = await this.connectionPool.getConnection();
    try {
      let query = `SELECT * FROM ${this.tableName}`;
      const values: any[] = [];

      if (pagination) {
        query += ` OFFSET $1 LIMIT $2`;
        values.push(pagination.offset, pagination.limit);
      }

      const result = await connection.query(query, values);
      return result.rows.map(row => this.mapRowToEntity(row));
    } finally {
      await this.connectionPool.releaseConnection(connection);
    }
  }

  async create(entity: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    const connection = await this.connectionPool.getConnection();
    try {
      const columns = Object.keys(entity);
      const values = Object.values(entity);
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
      
      const query = `
        INSERT INTO ${this.tableName} (${columns.join(', ')}, created_at, updated_at)
        VALUES (${placeholders}, NOW(), NOW())
        RETURNING *
      `;
      
      const result = await connection.query(query, values);
      return this.mapRowToEntity(result.rows[0]);
    } finally {
      await this.connectionPool.releaseConnection(connection);
    }
  }

  async update(id: string, updates: Partial<T>): Promise<T | null> {
    const connection = await this.connectionPool.getConnection();
    try {
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

      const query = `
        UPDATE ${this.tableName}
        SET ${setClauses.join(', ')}
        WHERE ${this.primaryKey} = $${paramIndex}
        RETURNING *
      `;

      const result = await connection.query(query, values);
      return result.rows.length > 0 ? this.mapRowToEntity(result.rows[0]) : null;
    } finally {
      await this.connectionPool.releaseConnection(connection);
    }
  }

  async delete(id: string): Promise<boolean> {
    const connection = await this.connectionPool.getConnection();
    try {
      const query = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
      const result = await connection.query(query, [id]);
      return result.rowCount > 0;
    } finally {
      await this.connectionPool.releaseConnection(connection);
    }
  }

  async bulkCreate(entities: Omit<T, 'id' | 'created_at' | 'updated_at'>[]): Promise<T[]> {
    if (entities.length === 0) return [];

    const connection = await this.connectionPool.getConnection();
    try {
      await connection.query('BEGIN');
      
      const results: T[] = [];
      for (const entity of entities) {
        const created = await this.create(entity);
        results.push(created);
      }
      
      await connection.query('COMMIT');
      return results;
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      await this.connectionPool.releaseConnection(connection);
    }
  }

  async bulkUpdate(updates: { id: string; data: Partial<T> }[]): Promise<T[]> {
    if (updates.length === 0) return [];

    const connection = await this.connectionPool.getConnection();
    try {
      await connection.query('BEGIN');
      
      const results: T[] = [];
      for (const update of updates) {
        const updated = await this.update(update.id, update.data);
        if (updated) results.push(updated);
      }
      
      await connection.query('COMMIT');
      return results;
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      await this.connectionPool.releaseConnection(connection);
    }
  }

  async bulkDelete(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;

    const connection = await this.connectionPool.getConnection();
    try {
      const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
      const query = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} IN (${placeholders})`;
      const result = await connection.query(query, ids);
      return result.rowCount;
    } finally {
      await this.connectionPool.releaseConnection(connection);
    }
  }

  async count(criteria?: Partial<T>): Promise<number> {
    const connection = await this.connectionPool.getConnection();
    try {
      let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
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

      const result = await connection.query(query, values);
      return parseInt(result.rows[0].count);
    } finally {
      await this.connectionPool.releaseConnection(connection);
    }
  }

  async query(sql: string, params?: any[]): Promise<any[]> {
    const connection = await this.connectionPool.getConnection();
    try {
      const result = await connection.query(sql, params);
      return result.rows;
    } finally {
      await this.connectionPool.releaseConnection(connection);
    }
  }

  createQueryBuilder(): IGovernanceQueryBuilder<T> {
    return new GovernanceQueryBuilder<T>(this.tableName, this.connectionPool);
  }

  /**
   * Map database row to entity - to be implemented by concrete repositories
   */
  protected abstract mapRowToEntity(row: any): T;

  /**
   * Get table columns for entity - to be implemented by concrete repositories
   */
  protected abstract getEntityColumns(): string[];
}
