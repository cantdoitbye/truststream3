/**
 * Mock Database Provider
 * In-memory database implementation for testing
 */

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
  TransactionError
} from '../../../shared-utils/database-interface';
import { BaseDatabaseProvider } from './BaseDatabaseProvider';
import { 
  DatabaseProviderFactory, 
  DatabaseProviderCapabilities 
} from './DatabaseProviderFactory';

interface MockTable {
  name: string;
  data: Map<string, any>;
  schema?: TableSchema;
  indexes: Map<string, string[]>;
}

interface MockConnection {
  id: string;
  database: Map<string, MockTable>;
  isInTransaction: boolean;
  transactionData?: Map<string, MockTable>;
}

interface MockTransaction {
  id: string;
  connection: MockConnection;
  operations: (() => void)[];
  rollbackOperations: (() => void)[];
}

export class MockDatabaseProvider extends BaseDatabaseProvider {
  private database = new Map<string, MockTable>();
  private nextId = 1;
  private transactions = new Map<string, MockTransaction>();
  private connectionCounter = 0;

  constructor(config: DatabaseConfig) {
    super(config);
    this.initializeDefaultTables();
  }

  async createRawConnection(): Promise<MockConnection> {
    const connection: MockConnection = {
      id: `mock_conn_${++this.connectionCounter}`,
      database: new Map(this.database),
      isInTransaction: false
    };

    return connection;
  }

  async validateConnection(connection: MockConnection): Promise<boolean> {
    return connection && typeof connection.id === 'string';
  }

  async closeRawConnection(connection: MockConnection): Promise<void> {
    // Mock connection cleanup
    connection.database.clear();
  }

  async executeRawQuery(connection: MockConnection, query: string, params?: any[]): Promise<any> {
    // Basic SQL parsing for mock implementation
    const normalizedQuery = query.trim().toLowerCase();
    
    if (normalizedQuery.startsWith('select')) {
      return this.mockSelectQuery(connection, query, params);
    } else if (normalizedQuery.startsWith('insert')) {
      return this.mockInsertQuery(connection, query, params);
    } else if (normalizedQuery.startsWith('update')) {
      return this.mockUpdateQuery(connection, query, params);
    } else if (normalizedQuery.startsWith('delete')) {
      return this.mockDeleteQuery(connection, query, params);
    } else {
      return [];
    }
  }

  async beginRawTransaction(connection: MockConnection): Promise<string> {
    const transactionId = `mock_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create transaction backup
    connection.transactionData = new Map();
    for (const [tableName, table] of connection.database) {
      connection.transactionData.set(tableName, {
        name: table.name,
        data: new Map(table.data),
        schema: table.schema,
        indexes: new Map(table.indexes)
      });
    }
    
    connection.isInTransaction = true;
    
    const transaction: MockTransaction = {
      id: transactionId,
      connection,
      operations: [],
      rollbackOperations: []
    };
    
    this.transactions.set(transactionId, transaction);
    return transactionId;
  }

  async commitRawTransaction(connection: MockConnection, transactionId: string): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new TransactionError('Transaction not found');
    }

    // Apply all operations (they're already applied to connection.database)
    connection.isInTransaction = false;
    connection.transactionData = undefined;
    this.transactions.delete(transactionId);
  }

  async rollbackRawTransaction(connection: MockConnection, transactionId: string): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new TransactionError('Transaction not found');
    }

    // Restore from backup
    if (connection.transactionData) {
      connection.database = connection.transactionData;
    }
    
    connection.isInTransaction = false;
    connection.transactionData = undefined;
    this.transactions.delete(transactionId);
  }

  // CRUD Implementation
  protected async executeCreate(connection: MockConnection, table: string, data: any): Promise<any> {
    const mockTable = this.getOrCreateTable(connection, table);
    
    const id = data.id || this.generateId();
    const timestamp = new Date();
    
    const record = {
      id,
      ...data,
      created_at: timestamp,
      updated_at: timestamp
    };
    
    mockTable.data.set(id, record);
    return record;
  }

  protected async executeRead(connection: MockConnection, table: string, query?: QueryOptions): Promise<any[]> {
    const mockTable = this.getOrCreateTable(connection, table);
    let results = Array.from(mockTable.data.values());

    // Apply WHERE conditions
    if (query?.where) {
      results = results.filter(record => this.matchesWhereConditions(record, query.where!));
    }

    // Apply SELECT columns
    if (query?.select && query.select.length > 0) {
      results = results.map(record => {
        const selected: any = {};
        for (const column of query.select!) {
          if (column in record) {
            selected[column] = record[column];
          }
        }
        return selected;
      });
    }

    // Apply ORDER BY
    if (query?.orderBy) {
      results.sort((a, b) => {
        const aVal = a[query.orderBy!.column];
        const bVal = b[query.orderBy!.column];
        
        if (aVal < bVal) return query.orderBy!.direction === 'ASC' ? -1 : 1;
        if (aVal > bVal) return query.orderBy!.direction === 'ASC' ? 1 : -1;
        return 0;
      });
    }

    // Apply OFFSET and LIMIT
    const offset = query?.offset || 0;
    const limit = query?.limit;
    
    if (offset > 0) {
      results = results.slice(offset);
    }
    
    if (limit) {
      results = results.slice(0, limit);
    }

    return results;
  }

  protected async executeUpdate(connection: MockConnection, table: string, id: string, data: any): Promise<any> {
    const mockTable = this.getOrCreateTable(connection, table);
    
    const existing = mockTable.data.get(id);
    if (!existing) {
      throw new QueryError(`Record with id ${id} not found in table ${table}`);
    }
    
    const updated = {
      ...existing,
      ...data,
      updated_at: new Date()
    };
    
    mockTable.data.set(id, updated);
    return updated;
  }

  protected async executeDelete(connection: MockConnection, table: string, id: string): Promise<boolean> {
    const mockTable = this.getOrCreateTable(connection, table);
    return mockTable.data.delete(id);
  }

  protected async executeCreateMany(connection: MockConnection, table: string, data: any[]): Promise<any[]> {
    const results: any[] = [];
    
    for (const record of data) {
      const result = await this.executeCreate(connection, table, record);
      results.push(result);
    }
    
    return results;
  }

  protected async executeUpdateMany(connection: MockConnection, table: string, query: QueryOptions, data: any): Promise<any[]> {
    const mockTable = this.getOrCreateTable(connection, table);
    const results: any[] = [];
    
    for (const [id, record] of mockTable.data) {
      if (this.matchesWhereConditions(record, query.where || [])) {
        const updated = await this.executeUpdate(connection, table, id, data);
        results.push(updated);
      }
    }
    
    return results;
  }

  protected async executeDeleteMany(connection: MockConnection, table: string, query: QueryOptions): Promise<number> {
    const mockTable = this.getOrCreateTable(connection, table);
    let deletedCount = 0;
    
    const toDelete: string[] = [];
    for (const [id, record] of mockTable.data) {
      if (this.matchesWhereConditions(record, query.where || [])) {
        toDelete.push(id);
      }
    }
    
    for (const id of toDelete) {
      if (mockTable.data.delete(id)) {
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  protected async executeCount(connection: MockConnection, table: string, query?: QueryOptions): Promise<number> {
    const results = await this.executeRead(connection, table, query);
    return results.length;
  }

  protected async executeTransaction(connection: MockConnection, operations: TransactionOperation[]): Promise<any> {
    const transactionId = await this.beginRawTransaction(connection);
    const results: any[] = [];

    try {
      for (const operation of operations) {
        let result;

        switch (operation.type) {
          case 'create':
            result = await this.executeCreate(connection, operation.table, operation.data);
            break;
          case 'update':
            if (operation.query?.where?.[0]?.value) {
              result = await this.executeUpdate(connection, operation.table, operation.query.where[0].value, operation.data);
            }
            break;
          case 'delete':
            if (operation.query?.where?.[0]?.value) {
              result = await this.executeDelete(connection, operation.table, operation.query.where[0].value);
            }
            break;
          case 'query':
            if (operation.sql) {
              result = await this.executeRawQuery(connection, operation.sql, operation.params);
            } else if (operation.query) {
              result = await this.executeRead(connection, operation.table, operation.query);
            }
            break;
        }

        results.push(result);
      }

      await this.commitRawTransaction(connection, transactionId);
      return results;
    } catch (error) {
      await this.rollbackRawTransaction(connection, transactionId);
      throw error;
    }
  }

  // Schema Management
  async createTable(schema: TableSchema): Promise<void> {
    if (!this.connectionPool) {
      throw new ConnectionError('Database is not connected');
    }

    await this.connectionPool.execute(async (connection: MockConnection) => {
      const mockTable: MockTable = {
        name: schema.name,
        data: new Map(),
        schema,
        indexes: new Map()
      };
      
      connection.database.set(schema.name, mockTable);
    });
  }

  async dropTable(tableName: string): Promise<void> {
    if (!this.connectionPool) {
      throw new ConnectionError('Database is not connected');
    }

    await this.connectionPool.execute(async (connection: MockConnection) => {
      connection.database.delete(tableName);
    });
  }

  async listTables(): Promise<string[]> {
    if (!this.connectionPool) {
      throw new ConnectionError('Database is not connected');
    }

    return await this.connectionPool.execute(async (connection: MockConnection) => {
      return Array.from(connection.database.keys());
    });
  }

  async createIndex(tableName: string, columns: string[], options?: IndexOptions): Promise<void> {
    if (!this.connectionPool) {
      throw new ConnectionError('Database is not connected');
    }

    await this.connectionPool.execute(async (connection: MockConnection) => {
      const mockTable = this.getOrCreateTable(connection, tableName);
      const indexName = `idx_${tableName}_${columns.join('_')}`;
      mockTable.indexes.set(indexName, columns);
    });
  }

  async analyzeQuery(query: string): Promise<QueryAnalysis> {
    // Mock query analysis
    return {
      executionTime: Math.random() * 100, // Random time between 0-100ms
      rowsAffected: Math.floor(Math.random() * 1000),
      indexesUsed: ['mock_index_1', 'mock_index_2'],
      suggestions: ['Mock suggestion: Consider adding an index']
    };
  }

  // Helper methods
  private getOrCreateTable(connection: MockConnection, tableName: string): MockTable {
    let table = connection.database.get(tableName);
    
    if (!table) {
      table = {
        name: tableName,
        data: new Map(),
        indexes: new Map()
      };
      connection.database.set(tableName, table);
    }
    
    return table;
  }

  private matchesWhereConditions(record: any, conditions: any[]): boolean {
    for (const condition of conditions) {
      const { column, operator, value, values } = condition;
      const recordValue = record[column];
      
      switch (operator) {
        case 'eq':
          if (recordValue !== value) return false;
          break;
        case 'neq':
          if (recordValue === value) return false;
          break;
        case 'gt':
          if (recordValue <= value) return false;
          break;
        case 'gte':
          if (recordValue < value) return false;
          break;
        case 'lt':
          if (recordValue >= value) return false;
          break;
        case 'lte':
          if (recordValue > value) return false;
          break;
        case 'like':
          if (!recordValue || !recordValue.toString().includes(value)) return false;
          break;
        case 'ilike':
          if (!recordValue || !recordValue.toString().toLowerCase().includes(value.toLowerCase())) return false;
          break;
        case 'in':
          if (!values || !values.includes(recordValue)) return false;
          break;
        case 'not_in':
          if (values && values.includes(recordValue)) return false;
          break;
        case 'is_null':
          if (recordValue !== null && recordValue !== undefined) return false;
          break;
        case 'not_null':
          if (recordValue === null || recordValue === undefined) return false;
          break;
      }
    }
    
    return true;
  }

  private generateId(): string {
    return `mock_${this.nextId++}`;
  }

  private initializeDefaultTables(): void {
    // Initialize some default tables for testing
    const defaultTables = ['users', 'posts', 'comments'];
    
    for (const tableName of defaultTables) {
      this.database.set(tableName, {
        name: tableName,
        data: new Map(),
        indexes: new Map()
      });
    }
  }

  private mockSelectQuery(connection: MockConnection, query: string, params?: any[]): any[] {
    // Basic mock implementation
    return [];
  }

  private mockInsertQuery(connection: MockConnection, query: string, params?: any[]): any[] {
    // Basic mock implementation
    return [];
  }

  private mockUpdateQuery(connection: MockConnection, query: string, params?: any[]): any[] {
    // Basic mock implementation
    return [];
  }

  private mockDeleteQuery(connection: MockConnection, query: string, params?: any[]): any[] {
    // Basic mock implementation
    return [];
  }

  // Additional testing utilities
  public addTestData(tableName: string, data: any[]): void {
    const table = this.database.get(tableName);
    if (table) {
      for (const record of data) {
        const id = record.id || this.generateId();
        table.data.set(id, { id, ...record });
      }
    }
  }

  public clearTestData(tableName?: string): void {
    if (tableName) {
      const table = this.database.get(tableName);
      if (table) {
        table.data.clear();
      }
    } else {
      for (const table of this.database.values()) {
        table.data.clear();
      }
    }
  }

  public getTestData(tableName: string): any[] {
    const table = this.database.get(tableName);
    return table ? Array.from(table.data.values()) : [];
  }
}

/**
 * Mock Database Provider Factory
 */
export class MockDatabaseProviderFactory implements DatabaseProviderFactory {
  create(config: DatabaseConfig): MockDatabaseProvider {
    return new MockDatabaseProvider(config);
  }

  validateConfig(config: DatabaseConfig): { valid: boolean; errors: string[] } {
    // Mock provider accepts any configuration
    return {
      valid: true,
      errors: []
    };
  }

  getCapabilities(): DatabaseProviderCapabilities {
    return {
      supportsTransactions: true,
      supportsNestedTransactions: true,
      supportsJsonQueries: false,
      supportsFullTextSearch: false,
      supportsReplication: false,
      supportsBackup: false,
      maxConnections: 100,
      supportedFeatures: [
        'basic-crud',
        'in-memory-storage',
        'transaction-simulation',
        'schema-management',
        'testing-utilities'
      ]
    };
  }
}