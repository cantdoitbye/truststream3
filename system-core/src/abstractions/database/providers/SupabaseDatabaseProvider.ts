/**
 * Supabase Database Provider
 * Implementation of database abstraction for Supabase
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  DatabaseConfig,
  QueryOptions,
  TransactionOperation,
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

export class SupabaseDatabaseProvider extends BaseDatabaseProvider {
  private client: SupabaseClient | null = null;
  private transactions = new Map<string, any>();

  async createRawConnection(): Promise<SupabaseClient> {
    if (!this.config.supabase) {
      throw new ConnectionError('Supabase configuration is missing');
    }

    const client = createClient(
      this.config.supabase.url,
      this.config.supabase.serviceRoleKey || this.config.supabase.anonKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: false
        },
        db: {
          schema: 'public'
        }
      }
    );

    // Test connection
    const { error } = await client.from('_supabase_migrations').select('version').limit(1);
    if (error && !error.message.includes('relation "_supabase_migrations" does not exist')) {
      throw new ConnectionError(`Failed to connect to Supabase: ${error.message}`);
    }

    return client;
  }

  async validateConnection(client: SupabaseClient): Promise<boolean> {
    try {
      const { error } = await client.from('_supabase_migrations').select('version').limit(1);
      return !error || error.message.includes('relation "_supabase_migrations" does not exist');
    } catch {
      return false;
    }
  }

  async closeRawConnection(client: SupabaseClient): Promise<void> {
    // Supabase client doesn't need explicit closing
    // but we can clear any cached data
    if (client.auth) {
      await client.auth.signOut();
    }
  }

  async executeRawQuery(client: SupabaseClient, query: string, params?: any[]): Promise<any> {
    try {
      const { data, error } = await client.rpc('execute_sql', {
        query,
        params: params || []
      });

      if (error) {
        throw new QueryError(`Supabase query failed: ${error.message}`, query);
      }

      return data;
    } catch (error) {
      if (error instanceof QueryError) throw error;
      throw new QueryError(`Failed to execute query: ${error}`, query);
    }
  }

  async beginRawTransaction(client: SupabaseClient): Promise<string> {
    // Supabase doesn't support traditional transactions
    // We'll use a transaction ID for batching operations
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.transactions.set(transactionId, {
      operations: [],
      client,
      startTime: Date.now()
    });
    return transactionId;
  }

  async commitRawTransaction(client: SupabaseClient, transactionId: string): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new TransactionError('Transaction not found');
    }

    try {
      // Execute all operations in sequence
      // This is a limitation of Supabase - no true ACID transactions
      for (const operation of transaction.operations) {
        await operation();
      }
      
      this.transactions.delete(transactionId);
    } catch (error) {
      // Attempt rollback (limited capability)
      await this.rollbackRawTransaction(client, transactionId);
      throw new TransactionError(`Transaction commit failed: ${error}`);
    }
  }

  async rollbackRawTransaction(client: SupabaseClient, transactionId: string): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    if (transaction) {
      this.transactions.delete(transactionId);
      // Note: Supabase doesn't support true rollback
      // This is a limitation of using Supabase for complex transactions
    }
  }

  // CRUD Implementation
  protected async executeCreate(client: SupabaseClient, table: string, data: any): Promise<any> {
    const { data: result, error } = await client
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new QueryError(`Failed to create record in ${table}: ${error.message}`);
    }

    return result;
  }

  protected async executeRead(client: SupabaseClient, table: string, query?: QueryOptions): Promise<any[]> {
    let supabaseQuery = client.from(table).select(query?.select?.join(',') || '*');

    // Apply where conditions
    if (query?.where) {
      for (const condition of query.where) {
        switch (condition.operator) {
          case 'eq':
            supabaseQuery = supabaseQuery.eq(condition.column, condition.value);
            break;
          case 'neq':
            supabaseQuery = supabaseQuery.neq(condition.column, condition.value);
            break;
          case 'gt':
            supabaseQuery = supabaseQuery.gt(condition.column, condition.value);
            break;
          case 'gte':
            supabaseQuery = supabaseQuery.gte(condition.column, condition.value);
            break;
          case 'lt':
            supabaseQuery = supabaseQuery.lt(condition.column, condition.value);
            break;
          case 'lte':
            supabaseQuery = supabaseQuery.lte(condition.column, condition.value);
            break;
          case 'like':
            supabaseQuery = supabaseQuery.like(condition.column, condition.value);
            break;
          case 'ilike':
            supabaseQuery = supabaseQuery.ilike(condition.column, condition.value);
            break;
          case 'in':
            if (condition.values) {
              supabaseQuery = supabaseQuery.in(condition.column, condition.values);
            }
            break;
          case 'not_in':
            if (condition.values) {
              supabaseQuery = supabaseQuery.not(condition.column, 'in', condition.values);
            }
            break;
          case 'is_null':
            supabaseQuery = supabaseQuery.is(condition.column, null);
            break;
          case 'not_null':
            supabaseQuery = supabaseQuery.not(condition.column, 'is', null);
            break;
        }
      }
    }

    // Apply ordering
    if (query?.orderBy) {
      supabaseQuery = supabaseQuery.order(query.orderBy.column, {
        ascending: query.orderBy.direction === 'ASC'
      });
    }

    // Apply pagination
    if (query?.limit) {
      supabaseQuery = supabaseQuery.limit(query.limit);
    }
    if (query?.offset) {
      supabaseQuery = supabaseQuery.range(query.offset, (query.offset + (query?.limit || 1000)) - 1);
    }

    // Apply joins
    if (query?.joins) {
      for (const join of query.joins) {
        // Supabase uses embedded resources for joins
        // This is a simplified implementation
        console.warn('Joins are not fully supported in Supabase provider');
      }
    }

    const { data, error } = await supabaseQuery;

    if (error) {
      throw new QueryError(`Failed to read from ${table}: ${error.message}`);
    }

    return data || [];
  }

  protected async executeUpdate(client: SupabaseClient, table: string, id: string, data: any): Promise<any> {
    const { data: result, error } = await client
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new QueryError(`Failed to update record in ${table}: ${error.message}`);
    }

    return result;
  }

  protected async executeDelete(client: SupabaseClient, table: string, id: string): Promise<boolean> {
    const { error } = await client
      .from(table)
      .delete()
      .eq('id', id);

    if (error) {
      throw new QueryError(`Failed to delete record from ${table}: ${error.message}`);
    }

    return true;
  }

  protected async executeCreateMany(client: SupabaseClient, table: string, data: any[]): Promise<any[]> {
    const { data: result, error } = await client
      .from(table)
      .insert(data)
      .select();

    if (error) {
      throw new QueryError(`Failed to create multiple records in ${table}: ${error.message}`);
    }

    return result || [];
  }

  protected async executeUpdateMany(client: SupabaseClient, table: string, query: QueryOptions, data: any): Promise<any[]> {
    let supabaseQuery = client.from(table).update(data);

    // Apply where conditions
    if (query.where) {
      for (const condition of query.where) {
        switch (condition.operator) {
          case 'eq':
            supabaseQuery = supabaseQuery.eq(condition.column, condition.value);
            break;
          // Add other operators as needed
        }
      }
    }

    const { data: result, error } = await supabaseQuery.select();

    if (error) {
      throw new QueryError(`Failed to update multiple records in ${table}: ${error.message}`);
    }

    return result || [];
  }

  protected async executeDeleteMany(client: SupabaseClient, table: string, query: QueryOptions): Promise<number> {
    let supabaseQuery = client.from(table).delete();

    // Apply where conditions
    if (query.where) {
      for (const condition of query.where) {
        switch (condition.operator) {
          case 'eq':
            supabaseQuery = supabaseQuery.eq(condition.column, condition.value);
            break;
          // Add other operators as needed
        }
      }
    }

    const { error, count } = await supabaseQuery;

    if (error) {
      throw new QueryError(`Failed to delete multiple records from ${table}: ${error.message}`);
    }

    return count || 0;
  }

  protected async executeCount(client: SupabaseClient, table: string, query?: QueryOptions): Promise<number> {
    let supabaseQuery = client.from(table).select('*', { count: 'exact', head: true });

    // Apply where conditions
    if (query?.where) {
      for (const condition of query.where) {
        switch (condition.operator) {
          case 'eq':
            supabaseQuery = supabaseQuery.eq(condition.column, condition.value);
            break;
          // Add other operators as needed
        }
      }
    }

    const { count, error } = await supabaseQuery;

    if (error) {
      throw new QueryError(`Failed to count records in ${table}: ${error.message}`);
    }

    return count || 0;
  }

  protected async executeTransaction(client: SupabaseClient, operations: TransactionOperation[]): Promise<any> {
    // Supabase limitation: no true transactions
    // Execute operations sequentially
    const results: any[] = [];
    
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
    
    return results;
  }
}

/**
 * Supabase Database Provider Factory
 */
export class SupabaseDatabaseProviderFactory implements DatabaseProviderFactory {
  create(config: DatabaseConfig): SupabaseDatabaseProvider {
    return new SupabaseDatabaseProvider(config);
  }

  validateConfig(config: DatabaseConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.supabase) {
      errors.push('Supabase configuration is required');
    } else {
      if (!config.supabase.url) {
        errors.push('Supabase URL is required');
      }
      if (!config.supabase.anonKey && !config.supabase.serviceRoleKey) {
        errors.push('Either Supabase anonymous key or service role key is required');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  getCapabilities(): DatabaseProviderCapabilities {
    return {
      supportsTransactions: false, // Limited transaction support
      supportsNestedTransactions: false,
      supportsJsonQueries: true,
      supportsFullTextSearch: true,
      supportsReplication: true,
      supportsBackup: false,
      maxConnections: 100,
      supportedFeatures: [
        'real-time-subscriptions',
        'row-level-security',
        'auto-api-generation',
        'full-text-search',
        'json-queries',
        'embedded-auth'
      ]
    };
  }
}