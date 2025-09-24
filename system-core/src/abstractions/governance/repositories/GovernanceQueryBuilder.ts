/**
 * Governance Query Builder Implementation
 * Provides fluent API for building complex database queries
 */

import { IGovernanceQueryBuilder } from '../interfaces/IGovernanceRepository';
import { IGovernanceConnectionPool } from '../interfaces/IGovernanceDatabase';

export class GovernanceQueryBuilder<T> implements IGovernanceQueryBuilder<T> {
  private tableName: string;
  private connectionPool: IGovernanceConnectionPool;
  private selectColumns: string[] = ['*'];
  private whereConditions: { condition: string; value?: any }[] = [];
  private joinClauses: string[] = [];
  private orderByClause: string = '';
  private groupByColumns: string[] = [];
  private havingConditions: string[] = [];
  private limitCount?: number;
  private offsetCount?: number;
  private paramCounter: number = 1;
  private parameters: any[] = [];

  constructor(tableName: string, connectionPool: IGovernanceConnectionPool) {
    this.tableName = tableName;
    this.connectionPool = connectionPool;
  }

  select(columns: string[] | string): IGovernanceQueryBuilder<T> {
    this.selectColumns = Array.isArray(columns) ? columns : [columns];
    return this;
  }

  where(condition: string, value?: any): IGovernanceQueryBuilder<T> {
    if (value !== undefined) {
      const paramPlaceholder = `$${this.paramCounter++}`;
      this.whereConditions.push({
        condition: condition.replace('?', paramPlaceholder),
        value
      });
      this.parameters.push(value);
    } else {
      this.whereConditions.push({ condition });
    }
    return this;
  }

  whereIn(column: string, values: any[]): IGovernanceQueryBuilder<T> {
    if (values.length === 0) {
      this.whereConditions.push({ condition: '1=0' }); // No matches
      return this;
    }

    const placeholders = values.map(() => `$${this.paramCounter++}`).join(', ');
    this.whereConditions.push({
      condition: `${column} IN (${placeholders})`
    });
    this.parameters.push(...values);
    return this;
  }

  whereBetween(column: string, min: any, max: any): IGovernanceQueryBuilder<T> {
    const minPlaceholder = `$${this.paramCounter++}`;
    const maxPlaceholder = `$${this.paramCounter++}`;
    this.whereConditions.push({
      condition: `${column} BETWEEN ${minPlaceholder} AND ${maxPlaceholder}`
    });
    this.parameters.push(min, max);
    return this;
  }

  whereNull(column: string): IGovernanceQueryBuilder<T> {
    this.whereConditions.push({ condition: `${column} IS NULL` });
    return this;
  }

  whereNotNull(column: string): IGovernanceQueryBuilder<T> {
    this.whereConditions.push({ condition: `${column} IS NOT NULL` });
    return this;
  }

  join(table: string, on: string): IGovernanceQueryBuilder<T> {
    this.joinClauses.push(`JOIN ${table} ON ${on}`);
    return this;
  }

  leftJoin(table: string, on: string): IGovernanceQueryBuilder<T> {
    this.joinClauses.push(`LEFT JOIN ${table} ON ${on}`);
    return this;
  }

  rightJoin(table: string, on: string): IGovernanceQueryBuilder<T> {
    this.joinClauses.push(`RIGHT JOIN ${table} ON ${on}`);
    return this;
  }

  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): IGovernanceQueryBuilder<T> {
    if (this.orderByClause) {
      this.orderByClause += `, ${column} ${direction}`;
    } else {
      this.orderByClause = `ORDER BY ${column} ${direction}`;
    }
    return this;
  }

  groupBy(columns: string[] | string): IGovernanceQueryBuilder<T> {
    const columnList = Array.isArray(columns) ? columns : [columns];
    this.groupByColumns.push(...columnList);
    return this;
  }

  having(condition: string, value?: any): IGovernanceQueryBuilder<T> {
    if (value !== undefined) {
      const paramPlaceholder = `$${this.paramCounter++}`;
      this.havingConditions.push(condition.replace('?', paramPlaceholder));
      this.parameters.push(value);
    } else {
      this.havingConditions.push(condition);
    }
    return this;
  }

  limit(count: number): IGovernanceQueryBuilder<T> {
    this.limitCount = count;
    return this;
  }

  offset(count: number): IGovernanceQueryBuilder<T> {
    this.offsetCount = count;
    return this;
  }

  async execute(): Promise<T[]> {
    const { sql, params } = this.toSQL();
    const connection = await this.connectionPool.getConnection();
    try {
      const result = await connection.query(sql, params);
      return result.rows;
    } finally {
      await this.connectionPool.releaseConnection(connection);
    }
  }

  async first(): Promise<T | null> {
    this.limit(1);
    const results = await this.execute();
    return results.length > 0 ? results[0] : null;
  }

  async count(): Promise<number> {
    // Create a copy for count query
    const countBuilder = new GovernanceQueryBuilder<T>(this.tableName, this.connectionPool);
    countBuilder.selectColumns = ['COUNT(*) as count'];
    countBuilder.whereConditions = [...this.whereConditions];
    countBuilder.joinClauses = [...this.joinClauses];
    countBuilder.groupByColumns = [...this.groupByColumns];
    countBuilder.havingConditions = [...this.havingConditions];
    countBuilder.parameters = [...this.parameters];
    countBuilder.paramCounter = this.paramCounter;

    const { sql, params } = countBuilder.toSQL();
    const connection = await this.connectionPool.getConnection();
    try {
      const result = await connection.query(sql, params);
      return parseInt(result.rows[0].count);
    } finally {
      await this.connectionPool.releaseConnection(connection);
    }
  }

  toSQL(): { sql: string; params: any[] } {
    let sql = `SELECT ${this.selectColumns.join(', ')} FROM ${this.tableName}`;

    // Add joins
    if (this.joinClauses.length > 0) {
      sql += ` ${this.joinClauses.join(' ')}`;
    }

    // Add where conditions
    if (this.whereConditions.length > 0) {
      const conditions = this.whereConditions.map(w => w.condition);
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add group by
    if (this.groupByColumns.length > 0) {
      sql += ` GROUP BY ${this.groupByColumns.join(', ')}`;
    }

    // Add having
    if (this.havingConditions.length > 0) {
      sql += ` HAVING ${this.havingConditions.join(' AND ')}`;
    }

    // Add order by
    if (this.orderByClause) {
      sql += ` ${this.orderByClause}`;
    }

    // Add limit and offset
    if (this.limitCount !== undefined) {
      sql += ` LIMIT ${this.limitCount}`;
    }

    if (this.offsetCount !== undefined) {
      sql += ` OFFSET ${this.offsetCount}`;
    }

    return {
      sql,
      params: this.parameters
    };
  }

  /**
   * Reset the query builder for reuse
   */
  reset(): IGovernanceQueryBuilder<T> {
    this.selectColumns = ['*'];
    this.whereConditions = [];
    this.joinClauses = [];
    this.orderByClause = '';
    this.groupByColumns = [];
    this.havingConditions = [];
    this.limitCount = undefined;
    this.offsetCount = undefined;
    this.paramCounter = 1;
    this.parameters = [];
    return this;
  }

  /**
   * Clone the query builder
   */
  clone(): IGovernanceQueryBuilder<T> {
    const cloned = new GovernanceQueryBuilder<T>(this.tableName, this.connectionPool);
    cloned.selectColumns = [...this.selectColumns];
    cloned.whereConditions = [...this.whereConditions];
    cloned.joinClauses = [...this.joinClauses];
    cloned.orderByClause = this.orderByClause;
    cloned.groupByColumns = [...this.groupByColumns];
    cloned.havingConditions = [...this.havingConditions];
    cloned.limitCount = this.limitCount;
    cloned.offsetCount = this.offsetCount;
    cloned.paramCounter = this.paramCounter;
    cloned.parameters = [...this.parameters];
    return cloned;
  }
}
