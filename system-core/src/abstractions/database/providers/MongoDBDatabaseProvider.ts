/**
 * MongoDB Database Provider
 * Implementation of database abstraction for MongoDB
 */

import { 
  DatabaseConfig,
  QueryOptions,
  TransactionOperation,
  TableSchema,
  TableModification,
  IndexOptions,
  QueryAnalysis,
  DatabaseStats,
  DatabaseError,
  ConnectionError,
  QueryError
} from '../../../shared-utils/database-interface';
import { BaseDatabaseProvider } from './BaseDatabaseProvider';
import { DatabaseProviderCapabilities, DatabaseProviderFactory } from './DatabaseProviderFactory';

export interface MongoDBConfig {
  connectionString: string;
  database: string;
  options?: {
    authSource?: string;
    ssl?: boolean;
    replicaSet?: string;
    readPreference?: 'primary' | 'secondary' | 'primaryPreferred' | 'secondaryPreferred' | 'nearest';
    maxPoolSize?: number;
    minPoolSize?: number;
    maxIdleTimeMS?: number;
    serverSelectionTimeoutMS?: number;
  };
}

export class MongoDBDatabaseProvider extends BaseDatabaseProvider {
  private mongoClient: any = null;
  private database: any = null;
  private mongoConfig: MongoDBConfig;

  constructor(config: DatabaseConfig) {
    super(config);
    
    if (!config.mongodb) {
      throw new DatabaseError('MongoDB configuration is required');
    }
    
    this.mongoConfig = config.mongodb;
  }

  async createRawConnection(): Promise<any> {
    try {
      // Import MongoDB driver dynamically
      const { MongoClient } = await import('mongodb');
      
      const client = new MongoClient(this.mongoConfig.connectionString, {
        ...this.mongoConfig.options,
        maxPoolSize: this.mongoConfig.options?.maxPoolSize || 10,
        minPoolSize: this.mongoConfig.options?.minPoolSize || 2,
        serverSelectionTimeoutMS: this.mongoConfig.options?.serverSelectionTimeoutMS || 5000
      });
      
      await client.connect();
      
      return {
        client,
        database: client.db(this.mongoConfig.database)
      };
      
    } catch (error) {
      throw new ConnectionError(
        `Failed to connect to MongoDB: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  async validateConnection(connection: any): Promise<boolean> {
    try {
      await connection.database.admin().ping();
      return true;
    } catch {
      return false;
    }
  }

  async closeRawConnection(connection: any): Promise<void> {
    if (connection && connection.client) {
      await connection.client.close();
    }
  }

  async executeRawQuery(connection: any, query: string, params?: any[]): Promise<any> {
    try {
      // Parse MongoDB query from string format
      const queryObj = this.parseQuery(query, params);
      
      const collection = connection.database.collection(queryObj.collection);
      
      switch (queryObj.operation) {
        case 'find':
          return await collection.find(queryObj.filter, queryObj.options).toArray();
        case 'findOne':
          return await collection.findOne(queryObj.filter, queryObj.options);
        case 'insertOne':
          return await collection.insertOne(queryObj.document);
        case 'insertMany':
          return await collection.insertMany(queryObj.documents);
        case 'updateOne':
          return await collection.updateOne(queryObj.filter, queryObj.update, queryObj.options);
        case 'updateMany':
          return await collection.updateMany(queryObj.filter, queryObj.update, queryObj.options);
        case 'deleteOne':
          return await collection.deleteOne(queryObj.filter);
        case 'deleteMany':
          return await collection.deleteMany(queryObj.filter);
        case 'aggregate':
          return await collection.aggregate(queryObj.pipeline).toArray();
        case 'count':
          return await collection.countDocuments(queryObj.filter);
        default:
          throw new QueryError(`Unsupported MongoDB operation: ${queryObj.operation}`);
      }
    } catch (error) {
      throw new QueryError(
        `MongoDB query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        query,
        error
      );
    }
  }

  async beginRawTransaction(connection: any): Promise<any> {
    const session = connection.client.startSession();
    session.startTransaction();
    return session;
  }

  async commitRawTransaction(connection: any, transaction: any): Promise<void> {
    await transaction.commitTransaction();
    await transaction.endSession();
  }

  async rollbackRawTransaction(connection: any, transaction: any): Promise<void> {
    await transaction.abortTransaction();
    await transaction.endSession();
  }

  // CRUD Operations Implementation
  
  protected async executeCreate(connection: any, table: string, data: any): Promise<any> {
    const collection = connection.database.collection(table);
    const result = await collection.insertOne({
      ...data,
      _id: data.id || undefined, // Use provided ID or let MongoDB generate
      created_at: new Date(),
      updated_at: new Date()
    });
    
    return {
      ...data,
      id: result.insertedId,
      created_at: new Date(),
      updated_at: new Date()
    };
  }

  protected async executeRead(connection: any, table: string, query?: QueryOptions): Promise<any[]> {
    const collection = connection.database.collection(table);
    
    const filter = this.buildMongoFilter(query?.where);
    const options: any = {};
    
    if (query?.select) {
      options.projection = this.buildProjection(query.select);
    }
    
    if (query?.orderBy) {
      options.sort = { [query.orderBy.column]: query.orderBy.direction === 'ASC' ? 1 : -1 };
    }
    
    if (query?.limit) {
      options.limit = query.limit;
    }
    
    if (query?.offset) {
      options.skip = query.offset;
    }
    
    const results = await collection.find(filter, options).toArray();
    
    // Convert MongoDB documents to standard format
    return results.map(doc => this.convertFromMongoDB(doc));
  }

  protected async executeUpdate(connection: any, table: string, id: string, data: any): Promise<any> {
    const collection = connection.database.collection(table);
    
    const updateData = {
      ...data,
      updated_at: new Date()
    };
    
    delete updateData.id; // Don't update the ID
    
    const result = await collection.findOneAndUpdate(
      { _id: this.convertToMongoId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    
    if (!result.value) {
      throw new QueryError(`Document with id ${id} not found in collection ${table}`);
    }
    
    return this.convertFromMongoDB(result.value);
  }

  protected async executeDelete(connection: any, table: string, id: string): Promise<boolean> {
    const collection = connection.database.collection(table);
    
    const result = await collection.deleteOne({ _id: this.convertToMongoId(id) });
    
    return result.deletedCount > 0;
  }

  protected async executeCreateMany(connection: any, table: string, data: any[]): Promise<any[]> {
    const collection = connection.database.collection(table);
    
    const documents = data.map(item => ({
      ...item,
      _id: item.id || undefined,
      created_at: new Date(),
      updated_at: new Date()
    }));
    
    const result = await collection.insertMany(documents);
    
    return data.map((item, index) => ({
      ...item,
      id: result.insertedIds[index],
      created_at: new Date(),
      updated_at: new Date()
    }));
  }

  protected async executeUpdateMany(connection: any, table: string, query: QueryOptions, data: any): Promise<any[]> {
    const collection = connection.database.collection(table);
    
    const filter = this.buildMongoFilter(query.where);
    const updateData = {
      ...data,
      updated_at: new Date()
    };
    
    delete updateData.id;
    
    await collection.updateMany(filter, { $set: updateData });
    
    // Return updated documents
    return this.executeRead(connection, table, query);
  }

  protected async executeDeleteMany(connection: any, table: string, query: QueryOptions): Promise<number> {
    const collection = connection.database.collection(table);
    
    const filter = this.buildMongoFilter(query.where);
    const result = await collection.deleteMany(filter);
    
    return result.deletedCount;
  }

  protected async executeCount(connection: any, table: string, query?: QueryOptions): Promise<number> {
    const collection = connection.database.collection(table);
    
    const filter = this.buildMongoFilter(query?.where);
    
    return await collection.countDocuments(filter);
  }

  protected async executeTransaction(connection: any, operations: TransactionOperation[]): Promise<any> {
    const session = await this.beginRawTransaction(connection);
    
    try {
      const results: any[] = [];
      
      for (const operation of operations) {
        let result;
        
        switch (operation.type) {
          case 'create':
            result = await this.executeCreate(connection, operation.table, operation.data);
            break;
          case 'update':
            if (operation.data && operation.data.id) {
              result = await this.executeUpdate(connection, operation.table, operation.data.id, operation.data);
            } else {
              throw new QueryError('Update operation requires data with id');
            }
            break;
          case 'delete':
            if (operation.data && operation.data.id) {
              result = await this.executeDelete(connection, operation.table, operation.data.id);
            } else {
              throw new QueryError('Delete operation requires data with id');
            }
            break;
          case 'query':
            result = await this.executeRead(connection, operation.table, operation.query);
            break;
          default:
            throw new QueryError(`Unsupported transaction operation: ${operation.type}`);
        }
        
        results.push(result);
      }
      
      await this.commitRawTransaction(connection, session);
      
      return results;
      
    } catch (error) {
      await this.rollbackRawTransaction(connection, session);
      throw error;
    }
  }

  // Schema Management (MongoDB collections)
  
  async createTable(schema: TableSchema): Promise<void> {
    this.ensureConnected();
    
    await this.connectionPool!.execute(async (connection) => {
      const collection = connection.database.collection(schema.name);
      
      // Create collection (MongoDB creates collections automatically, but we can set options)
      await connection.database.createCollection(schema.name);
      
      // Create indexes if specified
      if (schema.indexes) {
        for (const index of schema.indexes) {
          const indexSpec: any = {};
          index.columns.forEach(col => {
            indexSpec[col] = 1; // Default to ascending
          });
          
          await collection.createIndex(indexSpec, {
            unique: index.unique,
            name: index.name
          });
        }
      }
    });
  }

  async dropTable(tableName: string): Promise<void> {
    this.ensureConnected();
    
    await this.connectionPool!.execute(async (connection) => {
      await connection.database.collection(tableName).drop();
    });
  }

  async listTables(): Promise<string[]> {
    this.ensureConnected();
    
    return this.connectionPool!.execute(async (connection) => {
      const collections = await connection.database.listCollections().toArray();
      return collections.map((col: any) => col.name);
    });
  }

  // Utility Methods
  
  private parseQuery(query: string, params?: any[]): any {
    try {
      // Simple query parser - in production, this would be more sophisticated
      const parsed = JSON.parse(query);
      
      // Replace parameter placeholders if params provided
      if (params && params.length > 0) {
        let paramIndex = 0;
        const replaceParams = (obj: any): any => {
          if (typeof obj === 'string' && obj.startsWith('$')) {
            return params[paramIndex++];
          }
          if (Array.isArray(obj)) {
            return obj.map(replaceParams);
          }
          if (obj && typeof obj === 'object') {
            const result: any = {};
            for (const [key, value] of Object.entries(obj)) {
              result[key] = replaceParams(value);
            }
            return result;
          }
          return obj;
        };
        
        return replaceParams(parsed);
      }
      
      return parsed;
    } catch (error) {
      throw new QueryError(`Invalid MongoDB query format: ${query}`);
    }
  }

  private buildMongoFilter(conditions?: any[]): any {
    if (!conditions || conditions.length === 0) {
      return {};
    }
    
    const filter: any = {};
    
    for (const condition of conditions) {
      const { column, operator, value, values } = condition;
      
      switch (operator) {
        case 'eq':
          filter[column] = value;
          break;
        case 'neq':
          filter[column] = { $ne: value };
          break;
        case 'gt':
          filter[column] = { $gt: value };
          break;
        case 'gte':
          filter[column] = { $gte: value };
          break;
        case 'lt':
          filter[column] = { $lt: value };
          break;
        case 'lte':
          filter[column] = { $lte: value };
          break;
        case 'like':
        case 'ilike':
          filter[column] = { $regex: value, $options: operator === 'ilike' ? 'i' : '' };
          break;
        case 'in':
          filter[column] = { $in: values };
          break;
        case 'not_in':
          filter[column] = { $nin: values };
          break;
        case 'is_null':
          filter[column] = null;
          break;
        case 'not_null':
          filter[column] = { $ne: null };
          break;
      }
    }
    
    return filter;
  }

  private buildProjection(columns: string[]): any {
    const projection: any = {};
    columns.forEach(col => {
      projection[col] = 1;
    });
    return projection;
  }

  private convertFromMongoDB(doc: any): any {
    if (!doc) return doc;
    
    const converted = { ...doc };
    
    // Convert MongoDB _id to id
    if (doc._id) {
      converted.id = doc._id.toString();
      delete converted._id;
    }
    
    return converted;
  }

  private convertToMongoId(id: string): any {
    try {
      // Try to create ObjectId, fallback to string if not valid ObjectId format
      const { ObjectId } = require('mongodb');
      return ObjectId.isValid(id) ? new ObjectId(id) : id;
    } catch {
      return id;
    }
  }
}

// Factory implementation
export class MongoDBDatabaseProviderFactory implements DatabaseProviderFactory {
  create(config: DatabaseConfig): MongoDBDatabaseProvider {
    return new MongoDBDatabaseProvider(config);
  }

  validateConfig(config: DatabaseConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!config.mongodb) {
      errors.push('MongoDB configuration is required');
      return { valid: false, errors };
    }
    
    if (!config.mongodb.connectionString) {
      errors.push('MongoDB connection string is required');
    }
    
    if (!config.mongodb.database) {
      errors.push('MongoDB database name is required');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  getCapabilities(): DatabaseProviderCapabilities {
    return {
      supportsTransactions: true,
      supportsNestedTransactions: false,
      supportsJsonQueries: true,
      supportsFullTextSearch: true,
      supportsReplication: true,
      supportsBackup: true,
      maxConnections: 1000,
      supportedFeatures: [
        'CRUD',
        'Aggregation',
        'Indexing',
        'Transactions',
        'GridFS',
        'Full-text Search',
        'Geospatial Queries'
      ]
    };
  }
}
