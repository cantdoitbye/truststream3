/**
 * Governance Database Interface
 * Main interface for database operations
 */

import { IGovernanceRepository, IGovernanceTransaction, IGovernanceQueryBuilder, IGovernanceMigration } from './IGovernanceRepository';

export interface IGovernanceDatabase {
  /**
   * Get repository for entity type
   */
  getRepository<T>(entityType: string): IGovernanceRepository<T>;

  /**
   * Create query builder for entity
   */
  createQueryBuilder<T>(entityType: string): IGovernanceQueryBuilder<T>;

  /**
   * Begin transaction
   */
  beginTransaction(): Promise<IGovernanceTransaction>;

  /**
   * Execute operation within transaction
   */
  transaction<T>(operation: (tx: IGovernanceTransaction) => Promise<T>): Promise<T>;

  /**
   * Execute raw SQL query
   */
  query(sql: string, params?: any[]): Promise<any[]>;

  /**
   * Get database connection health
   */
  health(): Promise<{ status: 'healthy' | 'unhealthy'; latency: number }>;

  /**
   * Close database connection
   */
  close(): Promise<void>;

  /**
   * Migration operations
   */
  runMigrations(): Promise<void>;
  rollbackMigration(version: string): Promise<void>;
  getMigrationStatus(): Promise<{ version: string; applied_at: Date }[]>;
  addMigration(migration: IGovernanceMigration): void;
}

/**
 * Database Configuration
 */
export interface IGovernanceDatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  poolSize?: number;
  connectionTimeout?: number;
  queryTimeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * Connection Pool Interface
 */
export interface IGovernanceConnectionPool {
  /**
   * Get connection from pool
   */
  getConnection(): Promise<any>;

  /**
   * Release connection back to pool
   */
  releaseConnection(connection: any): Promise<void>;

  /**
   * Get pool statistics
   */
  getStats(): {
    total: number;
    active: number;
    idle: number;
    waiting: number;
  };

  /**
   * Close all connections
   */
  close(): Promise<void>;
}
