/**
 * PostgreSQL Database Provider
 * Direct PostgreSQL implementation with full SQL support
 */

import { Pool, Client, PoolClient } from 'pg';
import { 
  DatabaseConfig,
  QueryOptions,
  TransactionOperation,
  TableSchema,
  TableModification,
  IndexOptions,
  QueryAnalysis,
  DatabaseError,
  ConnectionError,
  QueryError,
  TransactionError,
  SchemaError
} from '../../../shared-utils/database-interface';
import { BaseDatabaseProvider } from './BaseDatabaseProvider';
import { 
  DatabaseProviderFactory, 
  DatabaseProviderCapabilities 
} from './DatabaseProviderFactory';

export class PostgreSQLDatabaseProvider extends BaseDatabaseProvider {
  private pool: Pool | null = null;
  private activeTransactions = new Map<string, PoolClient>();

  async createRawConnection(): Promise<PoolClient> {
    if (!this.pool) {
      throw new ConnectionError('PostgreSQL pool is not initialized');
    }

    try {
      const client = await this.pool.connect();
      
      // Test the connection
      await client.query('SELECT 1');
      
      return client;
    } catch (error) {
      throw new ConnectionError(`Failed to create PostgreSQL connection: ${error}`);
    }
  }

  async validateConnection(client: PoolClient): Promise<boolean> {
    try {
      await client.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async closeRawConnection(client: PoolClient): Promise<void> {
    try {
      client.release();
    } catch (error) {
      console.warn('Error releasing PostgreSQL connection:', error);
    }
  }

  async connect(config: DatabaseConfig): Promise<void> {
    if (!config.connection) {
      throw new ConnectionError('PostgreSQL connection configuration is missing');
    }

    this.pool = new Pool({
      host: config.connection.host,
      port: config.connection.port,
      database: config.connection.database,
      user: config.connection.username,
      password: config.connection.password,
      ssl: config.connection.ssl,
      max: config.options?.maxConnections || 10,
      min: 2,
      idleTimeoutMillis: 600000, // 10 minutes
      connectionTimeoutMillis: config.options?.timeout || 30000,
      maxUses: 7500 // Rotate connections
    });

    // Test connection
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
    } catch (error) {
      throw new ConnectionError(`Failed to connect to PostgreSQL: ${error}`);
    }

    await super.connect(config);
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
    await super.disconnect();
  }

  async executeRawQuery(client: PoolClient, query: string, params?: any[]): Promise<any> {
    try {
      const result = await client.query(query, params);
      return result.rows;
    } catch (error) {
      throw new QueryError(`PostgreSQL query failed: ${error}`, query);
    }
  }

  async beginRawTransaction(client: PoolClient): Promise<string> {
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      await client.query('BEGIN');
      this.activeTransactions.set(transactionId, client);
      return transactionId;
    } catch (error) {
      throw new TransactionError(`Failed to begin transaction: ${error}`);
    }
  }

  async commitRawTransaction(client: PoolClient, transactionId: string): Promise<void> {
    try {
      await client.query('COMMIT');
      this.activeTransactions.delete(transactionId);
    } catch (error) {
      await this.rollbackRawTransaction(client, transactionId);
      throw new TransactionError(`Failed to commit transaction: ${error}`);
    }
  }

  async rollbackRawTransaction(client: PoolClient, transactionId: string): Promise<void> {
    try {
      await client.query('ROLLBACK');
      this.activeTransactions.delete(transactionId);
    } catch (error) {
      throw new TransactionError(`Failed to rollback transaction: ${error}`);
    }
  }

  // CRUD Implementation
  protected async executeCreate(client: PoolClient, table: string, data: any): Promise<any> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    
    const query = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await client.query(query, values);
    return result.rows[0];
  }

  protected async executeRead(client: PoolClient, table: string, query?: QueryOptions): Promise<any[]> {
    const selectClause = query?.select?.join(', ') || '*';
    let sql = `SELECT ${selectClause} FROM ${table}`;
    const params: any[] = [];
    let paramIndex = 1;

    // Build WHERE clause
    if (query?.where && query.where.length > 0) {
      const { clause, params: whereParams } = this.buildWhereClause(query.where);
      sql += ` ${clause}`;
      params.push(...whereParams);
      paramIndex += whereParams.length;
    }

    // Build JOINs
    if (query?.joins) {
      for (const join of query.joins) {
        sql += ` ${join.type} JOIN ${join.table} ON ${join.condition}`;
      }
    }

    // Build ORDER BY
    if (query?.orderBy) {
      sql += ` ${this.buildOrderClause(query.orderBy)}`;
    }

    // Build LIMIT/OFFSET
    if (query?.limit || query?.offset) {
      sql += ` ${this.buildLimitClause(query.limit, query.offset)}`;
    }

    const result = await client.query(sql, params);
    return result.rows;
  }

  protected async executeUpdate(client: PoolClient, table: string, id: string, data: any): Promise<any> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(', ');
    
    const query = `
      UPDATE ${table} 
      SET ${setClause}
      WHERE id = $${columns.length + 1}
      RETURNING *
    `;

    const result = await client.query(query, [...values, id]);
    return result.rows[0];
  }

  protected async executeDelete(client: PoolClient, table: string, id: string): Promise<boolean> {
    const query = `DELETE FROM ${table} WHERE id = $1`;
    const result = await client.query(query, [id]);
    return result.rowCount > 0;
  }

  protected async executeCreateMany(client: PoolClient, table: string, data: any[]): Promise<any[]> {
    if (data.length === 0) return [];

    const columns = Object.keys(data[0]);
    const valuesClauses = data.map((row, rowIndex) => {
      const rowValues = columns.map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`);
      return `(${rowValues.join(', ')})`;
    });
    
    const allValues = data.flatMap(row => columns.map(col => row[col]));
    
    const query = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES ${valuesClauses.join(', ')}
      RETURNING *
    `;

    const result = await client.query(query, allValues);
    return result.rows;
  }

  protected async executeUpdateMany(client: PoolClient, table: string, query: QueryOptions, data: any): Promise<any[]> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(', ');
    
    let sql = `UPDATE ${table} SET ${setClause}`;
    const params = [...values];
    let paramIndex = columns.length + 1;

    // Build WHERE clause
    if (query.where && query.where.length > 0) {
      const { clause, params: whereParams } = this.buildWhereClause(query.where);
      sql += ` ${clause.replace(/\$\d+/g, () => `$${paramIndex++}`)}`;
      params.push(...whereParams);
    }

    sql += ' RETURNING *';

    const result = await client.query(sql, params);
    return result.rows;
  }

  protected async executeDeleteMany(client: PoolClient, table: string, query: QueryOptions): Promise<number> {
    let sql = `DELETE FROM ${table}`;
    const params: any[] = [];

    // Build WHERE clause
    if (query.where && query.where.length > 0) {
      const { clause, params: whereParams } = this.buildWhereClause(query.where);
      sql += ` ${clause}`;
      params.push(...whereParams);
    }

    const result = await client.query(sql, params);
    return result.rowCount;
  }

  protected async executeCount(client: PoolClient, table: string, query?: QueryOptions): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM ${table}`;
    const params: any[] = [];

    // Build WHERE clause
    if (query?.where && query.where.length > 0) {
      const { clause, params: whereParams } = this.buildWhereClause(query.where);
      sql += ` ${clause}`;
      params.push(...whereParams);
    }

    const result = await client.query(sql, params);
    return parseInt(result.rows[0].count);
  }

  protected async executeTransaction(client: PoolClient, operations: TransactionOperation[]): Promise<any> {
    const transactionId = await this.beginRawTransaction(client);
    const results: any[] = [];

    try {
      for (const operation of operations) {
        let result;

        switch (operation.type) {
          case 'create':
            result = await this.executeCreate(client, operation.table, operation.data);
            break;
          case 'update':
            if (operation.query?.where?.[0]?.value) {
              result = await this.executeUpdate(client, operation.table, operation.query.where[0].value, operation.data);
            }
            break;
          case 'delete':
            if (operation.query?.where?.[0]?.value) {
              result = await this.executeDelete(client, operation.table, operation.query.where[0].value);
            }
            break;
          case 'query':
            if (operation.sql) {
              result = await this.executeRawQuery(client, operation.sql, operation.params);
            } else if (operation.query) {
              result = await this.executeRead(client, operation.table, operation.query);
            }
            break;
        }

        results.push(result);
      }

      await this.commitRawTransaction(client, transactionId);
      return results;
    } catch (error) {
      await this.rollbackRawTransaction(client, transactionId);
      throw error;
    }
  }

  // Schema Management
  async createTable(schema: TableSchema): Promise<void> {
    if (!this.connectionPool) {
      throw new ConnectionError('Database is not connected');
    }

    const columns = schema.columns.map(col => {
      let definition = `${col.name} ${col.type}`;
      if (!col.nullable) definition += ' NOT NULL';
      if (col.defaultValue !== undefined) definition += ` DEFAULT ${col.defaultValue}`;
      if (col.primaryKey) definition += ' PRIMARY KEY';
      if (col.unique) definition += ' UNIQUE';
      return definition;
    }).join(', ');

    const sql = `CREATE TABLE ${schema.name} (${columns})`;
    
    await this.connectionPool.execute(async (client) => {
      await client.query(sql);
    });
  }

  async dropTable(tableName: string): Promise<void> {
    if (!this.connectionPool) {
      throw new ConnectionError('Database is not connected');
    }

    const sql = `DROP TABLE IF EXISTS ${tableName}`;
    
    await this.connectionPool.execute(async (client) => {
      await client.query(sql);
    });
  }

  async listTables(): Promise<string[]> {
    if (!this.connectionPool) {
      throw new ConnectionError('Database is not connected');
    }

    const sql = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    const result = await this.connectionPool.execute(async (client) => {
      return await client.query(sql);
    });

    return result.map((row: any) => row.table_name);
  }

  async createIndex(tableName: string, columns: string[], options?: IndexOptions): Promise<void> {
    if (!this.connectionPool) {
      throw new ConnectionError('Database is not connected');
    }

    const indexName = `idx_${tableName}_${columns.join('_')}`;
    const uniqueClause = options?.unique ? 'UNIQUE' : '';
    const typeClause = options?.type ? `USING ${options.type}` : '';
    const whereClause = options?.where ? `WHERE ${options.where}` : '';
    
    const sql = `
      CREATE ${uniqueClause} INDEX ${indexName} 
      ON ${tableName} ${typeClause} (${columns.join(', ')}) 
      ${whereClause}
    `.trim();
    
    await this.connectionPool.execute(async (client) => {
      await client.query(sql);
    });
  }

  async analyzeQuery(query: string): Promise<QueryAnalysis> {
    if (!this.connectionPool) {
      throw new ConnectionError('Database is not connected');
    }

    const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
    
    const result = await this.connectionPool.execute(async (client) => {
      const startTime = Date.now();
      const explainResult = await client.query(explainQuery);
      const executionTime = Date.now() - startTime;
      
      const plan = explainResult.rows[0]['QUERY PLAN'][0];
      
      return {
        executionTime,
        rowsAffected: plan['Actual Rows'] || 0,
        indexesUsed: this.extractIndexesFromPlan(plan),
        suggestions: this.generateSuggestions(plan)
      };
    });

    return result;
  }

  private extractIndexesFromPlan(plan: any): string[] {
    const indexes: string[] = [];
    
    function traverse(node: any) {
      if (node['Index Name']) {
        indexes.push(node['Index Name']);
      }
      if (node.Plans) {
        node.Plans.forEach(traverse);
      }
    }
    
    traverse(plan);
    return indexes;
  }

  private generateSuggestions(plan: any): string[] {
    const suggestions: string[] = [];
    
    if (plan['Node Type'] === 'Seq Scan' && plan['Actual Rows'] > 1000) {
      suggestions.push('Consider adding an index for better performance');
    }
    
    if (plan['Actual Total Time'] > 1000) {
      suggestions.push('Query execution time is high, consider optimization');
    }
    
    return suggestions;
  }
}

/**
 * PostgreSQL Database Provider Factory
 */
export class PostgreSQLDatabaseProviderFactory implements DatabaseProviderFactory {
  create(config: DatabaseConfig): PostgreSQLDatabaseProvider {
    return new PostgreSQLDatabaseProvider(config);
  }

  validateConfig(config: DatabaseConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.connection) {
      errors.push('PostgreSQL connection configuration is required');
    } else {
      if (!config.connection.host) {
        errors.push('PostgreSQL host is required');
      }
      if (!config.connection.database) {
        errors.push('PostgreSQL database name is required');
      }
      if (!config.connection.username) {
        errors.push('PostgreSQL username is required');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  getCapabilities(): DatabaseProviderCapabilities {
    return {
      supportsTransactions: true,
      supportsNestedTransactions: true,
      supportsJsonQueries: true,
      supportsFullTextSearch: true,
      supportsReplication: true,
      supportsBackup: true,
      maxConnections: 1000,
      supportedFeatures: [
        'acid-transactions',
        'complex-queries',
        'stored-procedures',
        'triggers',
        'views',
        'materialized-views',
        'full-text-search',
        'json-support',
        'window-functions',
        'cte-queries'
      ]
    };
  }
}