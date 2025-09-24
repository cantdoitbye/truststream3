/**
 * Main Governance Database Implementation
 * Orchestrates all database operations for governance system
 */

import {
  IGovernanceDatabase,
  IGovernanceDatabaseConfig,
  IGovernanceConnectionPool
} from '../interfaces/IGovernanceDatabase';
import {
  IGovernanceRepository,
  IGovernanceTransaction,
  IGovernanceQueryBuilder,
  IGovernanceMigration
} from '../interfaces/IGovernanceRepository';
import { GovernanceEntityType } from '../entities/GovernanceEntities';
import { GovernanceConnectionPool } from '../connections/GovernanceConnectionPool';
import { GovernanceRepositoryFactory } from '../repositories/GovernanceRepositoryFactory';
import { GovernanceTransaction } from '../transactions/GovernanceTransaction';
import { GovernanceQueryBuilder } from '../repositories/GovernanceQueryBuilder';
import { GovernanceMigrationManager } from '../migrations/GovernanceMigrationManager';

/**
 * Governance Database Implementation
 */
export class GovernanceDatabase implements IGovernanceDatabase {
  private config: IGovernanceDatabaseConfig;
  private connectionPool: IGovernanceConnectionPool;
  private repositoryFactory: GovernanceRepositoryFactory;
  private migrationManager: GovernanceMigrationManager;
  private isInitialized = false;

  constructor(config: IGovernanceDatabaseConfig) {
    this.config = config;
    this.connectionPool = new GovernanceConnectionPool(config);
    this.repositoryFactory = new GovernanceRepositoryFactory(this.connectionPool);
    this.migrationManager = new GovernanceMigrationManager(this.connectionPool);
  }

  /**
   * Initialize the database system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize migration system
      await this.migrationManager.initialize();

      // Register default migrations
      await this.registerDefaultMigrations();

      this.isInitialized = true;
      console.log('Governance database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize governance database:', error);
      throw error;
    }
  }

  getRepository<T>(entityType: string): IGovernanceRepository<T> {
    this.ensureInitialized();
    return this.repositoryFactory.createRepository<T>(entityType as GovernanceEntityType);
  }

  createQueryBuilder<T>(entityType: string): IGovernanceQueryBuilder<T> {
    this.ensureInitialized();
    const tableName = this.getTableName(entityType as GovernanceEntityType);
    return new GovernanceQueryBuilder<T>(tableName, this.connectionPool);
  }

  async beginTransaction(): Promise<IGovernanceTransaction> {
    this.ensureInitialized();
    const transaction = new GovernanceTransaction(this.connectionPool);
    await transaction.begin();
    return transaction;
  }

  async transaction<T>(operation: (tx: IGovernanceTransaction) => Promise<T>): Promise<T> {
    this.ensureInitialized();
    const transaction = new GovernanceTransaction(this.connectionPool);
    return await transaction.execute(operation);
  }

  async query(sql: string, params?: any[]): Promise<any[]> {
    this.ensureInitialized();
    const connection = await this.connectionPool.getConnection();
    try {
      const result = await connection.query(sql, params);
      return result.rows;
    } finally {
      await this.connectionPool.releaseConnection(connection);
    }
  }

  async health(): Promise<{ status: 'healthy' | 'unhealthy'; latency: number }> {
    const startTime = Date.now();
    
    try {
      await this.query('SELECT 1');
      const latency = Date.now() - startTime;
      
      // Check connection pool health
      const poolHealth = await this.connectionPool.healthCheck();
      const status = poolHealth.unhealthy === 0 ? 'healthy' : 'unhealthy';
      
      return { status, latency };
    } catch (error) {
      const latency = Date.now() - startTime;
      console.error('Database health check failed:', error);
      return { status: 'unhealthy', latency };
    }
  }

  async close(): Promise<void> {
    if (this.connectionPool) {
      await this.connectionPool.close();
    }
    this.isInitialized = false;
    console.log('Governance database closed');
  }

  async runMigrations(): Promise<void> {
    this.ensureInitialized();
    await this.migrationManager.runMigrations();
  }

  async rollbackMigration(version: string): Promise<void> {
    this.ensureInitialized();
    await this.migrationManager.rollbackMigration(version);
  }

  async getMigrationStatus(): Promise<{ version: string; applied_at: Date }[]> {
    this.ensureInitialized();
    return await this.migrationManager.getMigrationStatus();
  }

  addMigration(migration: IGovernanceMigration): void {
    this.migrationManager.addMigration(migration);
  }

  /**
   * Get connection pool statistics
   */
  getConnectionStats(): {
    total: number;
    active: number;
    idle: number;
    waiting: number;
  } {
    return this.connectionPool.getStats();
  }

  /**
   * Cleanup idle connections
   */
  cleanupConnections(maxIdleTime?: number): void {
    if (this.connectionPool instanceof GovernanceConnectionPool) {
      this.connectionPool.cleanupIdleConnections(maxIdleTime);
    }
  }

  /**
   * Execute multiple operations in a single transaction
   */
  async batch<T>(
    operations: Array<(tx: IGovernanceTransaction) => Promise<T>>
  ): Promise<T[]> {
    return await this.transaction(async (tx) => {
      const results: T[] = [];
      for (const operation of operations) {
        const result = await operation(tx);
        results.push(result);
      }
      return results;
    });
  }

  /**
   * Execute operations with retry logic
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    retryDelay = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          console.warn(`Operation attempt ${attempt} failed, retrying...`, error);
          await this.delay(retryDelay * attempt);
        }
      }
    }
    
    throw lastError!;
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Governance database is not initialized. Call initialize() first.');
    }
  }

  private getTableName(entityType: GovernanceEntityType): string {
    const tableMap: Record<GovernanceEntityType, string> = {
      governance_proposal: 'governance_proposals',
      governance_vote: 'governance_votes',
      governance_policy: 'governance_policies',
      governance_participant: 'governance_participants',
      governance_committee: 'governance_committees',
      governance_decision: 'governance_decisions',
      governance_audit_log: 'governance_audit_logs',
      governance_analytics: 'governance_analytics',
      governance_notification: 'governance_notifications'
    };

    return tableMap[entityType] || entityType;
  }

  private async registerDefaultMigrations(): Promise<void> {
    // Import and register default migrations
    const { CreateGovernanceTablesInitialMigration } = await import(
      '../migrations/001_create_governance_tables_initial'
    );
    const { CreateGovernanceIndexesMigration } = await import(
      '../migrations/002_create_governance_indexes'
    );
    const { CreateGovernanceConstraintsMigration } = await import(
      '../migrations/003_create_governance_constraints'
    );

    this.migrationManager.addMigration(
      new CreateGovernanceTablesInitialMigration(this.connectionPool)
    );
    this.migrationManager.addMigration(
      new CreateGovernanceIndexesMigration(this.connectionPool)
    );
    this.migrationManager.addMigration(
      new CreateGovernanceConstraintsMigration(this.connectionPool)
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Database Factory
 */
export class GovernanceDatabaseFactory {
  /**
   * Create database instance from configuration
   */
  static create(config: IGovernanceDatabaseConfig): GovernanceDatabase {
    return new GovernanceDatabase(config);
  }

  /**
   * Create database instance from environment variables
   */
  static createFromEnv(): GovernanceDatabase {
    const config: IGovernanceDatabaseConfig = {
      host: process.env.GOVERNANCE_DB_HOST || 'localhost',
      port: parseInt(process.env.GOVERNANCE_DB_PORT || '5432'),
      database: process.env.GOVERNANCE_DB_NAME || 'governance',
      username: process.env.GOVERNANCE_DB_USER || 'postgres',
      password: process.env.GOVERNANCE_DB_PASSWORD || '',
      ssl: process.env.GOVERNANCE_DB_SSL === 'true',
      poolSize: parseInt(process.env.GOVERNANCE_DB_POOL_SIZE || '10'),
      connectionTimeout: parseInt(process.env.GOVERNANCE_DB_CONNECTION_TIMEOUT || '30000'),
      queryTimeout: parseInt(process.env.GOVERNANCE_DB_QUERY_TIMEOUT || '30000'),
      retryAttempts: parseInt(process.env.GOVERNANCE_DB_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.GOVERNANCE_DB_RETRY_DELAY || '1000')
    };

    return new GovernanceDatabase(config);
  }

  /**
   * Create database instance for testing with in-memory/mock setup
   */
  static createForTesting(): GovernanceDatabase {
    const config: IGovernanceDatabaseConfig = {
      host: 'localhost',
      port: 5432,
      database: 'governance_test',
      username: 'test',
      password: 'test',
      poolSize: 5,
      connectionTimeout: 5000,
      queryTimeout: 5000,
      retryAttempts: 1,
      retryDelay: 100
    };

    return new GovernanceDatabase(config);
  }
}
