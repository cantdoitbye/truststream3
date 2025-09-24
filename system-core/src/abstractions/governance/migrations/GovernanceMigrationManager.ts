/**
 * Migration Management System
 * Handles database schema changes and version control
 */

import { IGovernanceMigration } from '../interfaces/IGovernanceRepository';
import { IGovernanceConnectionPool } from '../interfaces/IGovernanceDatabase';

/**
 * Base Migration Class
 */
export abstract class BaseGovernanceMigration implements IGovernanceMigration {
  abstract name: string;
  abstract version: string;
  abstract description: string;

  protected connectionPool: IGovernanceConnectionPool;

  constructor(connectionPool: IGovernanceConnectionPool) {
    this.connectionPool = connectionPool;
  }

  abstract up(): Promise<void>;
  abstract down(): Promise<void>;

  canRollback(): boolean {
    return true; // Override in specific migrations if needed
  }

  getDependencies(): string[] {
    return []; // Override in specific migrations if needed
  }

  protected async executeSQL(sql: string, params?: any[]): Promise<void> {
    const connection = await this.connectionPool.getConnection();
    try {
      await connection.query(sql, params);
    } finally {
      await this.connectionPool.releaseConnection(connection);
    }
  }

  protected async executeSQLBatch(queries: string[]): Promise<void> {
    const connection = await this.connectionPool.getConnection();
    try {
      await connection.query('BEGIN');
      
      for (const query of queries) {
        await connection.query(query);
      }
      
      await connection.query('COMMIT');
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      await this.connectionPool.releaseConnection(connection);
    }
  }
}

/**
 * Migration Manager
 */
export class GovernanceMigrationManager {
  private connectionPool: IGovernanceConnectionPool;
  private migrations: Map<string, IGovernanceMigration> = new Map();
  private appliedMigrations: Set<string> = new Set();

  constructor(connectionPool: IGovernanceConnectionPool) {
    this.connectionPool = connectionPool;
  }

  /**
   * Initialize migration system
   */
  async initialize(): Promise<void> {
    await this.createMigrationTable();
    await this.loadAppliedMigrations();
  }

  /**
   * Add migration to manager
   */
  addMigration(migration: IGovernanceMigration): void {
    if (this.migrations.has(migration.version)) {
      throw new Error(`Migration with version ${migration.version} already exists`);
    }
    this.migrations.set(migration.version, migration);
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<void> {
    const pendingMigrations = this.getPendingMigrations();
    const sortedMigrations = this.sortMigrationsByDependencies(pendingMigrations);

    for (const migration of sortedMigrations) {
      await this.runMigration(migration);
    }
  }

  /**
   * Run specific migration
   */
  async runMigration(migration: IGovernanceMigration): Promise<void> {
    if (this.appliedMigrations.has(migration.version)) {
      throw new Error(`Migration ${migration.version} is already applied`);
    }

    // Check dependencies
    for (const dependency of migration.getDependencies()) {
      if (!this.appliedMigrations.has(dependency)) {
        throw new Error(
          `Migration ${migration.version} depends on ${dependency} which is not applied`
        );
      }
    }

    const connection = await this.connectionPool.getConnection();
    try {
      await connection.query('BEGIN');
      
      // Run migration
      await migration.up();
      
      // Record migration
      await connection.query(
        `INSERT INTO governance_migrations (version, name, description, applied_at) 
         VALUES ($1, $2, $3, NOW())`,
        [migration.version, migration.name, migration.description]
      );
      
      await connection.query('COMMIT');
      this.appliedMigrations.add(migration.version);
      
      console.log(`Applied migration: ${migration.version} - ${migration.name}`);
    } catch (error) {
      await connection.query('ROLLBACK');
      console.error(`Failed to apply migration ${migration.version}:`, error);
      throw error;
    } finally {
      await this.connectionPool.releaseConnection(connection);
    }
  }

  /**
   * Rollback migration
   */
  async rollbackMigration(version: string): Promise<void> {
    const migration = this.migrations.get(version);
    if (!migration) {
      throw new Error(`Migration ${version} not found`);
    }

    if (!this.appliedMigrations.has(version)) {
      throw new Error(`Migration ${version} is not applied`);
    }

    if (!migration.canRollback()) {
      throw new Error(`Migration ${version} cannot be rolled back`);
    }

    // Check if other migrations depend on this one
    const dependentMigrations = Array.from(this.appliedMigrations)
      .map(v => this.migrations.get(v)!)
      .filter(m => m.getDependencies().includes(version));

    if (dependentMigrations.length > 0) {
      const dependentVersions = dependentMigrations.map(m => m.version);
      throw new Error(
        `Cannot rollback migration ${version}. The following migrations depend on it: ${dependentVersions.join(', ')}`
      );
    }

    const connection = await this.connectionPool.getConnection();
    try {
      await connection.query('BEGIN');
      
      // Run rollback
      await migration.down();
      
      // Remove migration record
      await connection.query(
        'DELETE FROM governance_migrations WHERE version = $1',
        [version]
      );
      
      await connection.query('COMMIT');
      this.appliedMigrations.delete(version);
      
      console.log(`Rolled back migration: ${version} - ${migration.name}`);
    } catch (error) {
      await connection.query('ROLLBACK');
      console.error(`Failed to rollback migration ${version}:`, error);
      throw error;
    } finally {
      await this.connectionPool.releaseConnection(connection);
    }
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<{ version: string; applied_at: Date }[]> {
    const connection = await this.connectionPool.getConnection();
    try {
      const result = await connection.query(
        'SELECT version, applied_at FROM governance_migrations ORDER BY applied_at'
      );
      return result.rows.map(row => ({
        version: row.version,
        applied_at: new Date(row.applied_at)
      }));
    } finally {
      await this.connectionPool.releaseConnection(connection);
    }
  }

  /**
   * Get pending migrations
   */
  getPendingMigrations(): IGovernanceMigration[] {
    return Array.from(this.migrations.values())
      .filter(migration => !this.appliedMigrations.has(migration.version));
  }

  /**
   * Check if migration exists
   */
  hasMigration(version: string): boolean {
    return this.migrations.has(version);
  }

  /**
   * Check if migration is applied
   */
  isMigrationApplied(version: string): boolean {
    return this.appliedMigrations.has(version);
  }

  private async createMigrationTable(): Promise<void> {
    const connection = await this.connectionPool.getConnection();
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS governance_migrations (
          version VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          applied_at TIMESTAMP WITH TIME ZONE NOT NULL
        )
      `);
    } finally {
      await this.connectionPool.releaseConnection(connection);
    }
  }

  private async loadAppliedMigrations(): Promise<void> {
    const connection = await this.connectionPool.getConnection();
    try {
      const result = await connection.query(
        'SELECT version FROM governance_migrations'
      );
      this.appliedMigrations = new Set(result.rows.map(row => row.version));
    } finally {
      await this.connectionPool.releaseConnection(connection);
    }
  }

  private sortMigrationsByDependencies(
    migrations: IGovernanceMigration[]
  ): IGovernanceMigration[] {
    const sorted: IGovernanceMigration[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (migration: IGovernanceMigration) => {
      if (visiting.has(migration.version)) {
        throw new Error(`Circular dependency detected for migration ${migration.version}`);
      }
      
      if (visited.has(migration.version)) {
        return;
      }

      visiting.add(migration.version);
      
      // Visit dependencies first
      for (const depVersion of migration.getDependencies()) {
        const dependency = migrations.find(m => m.version === depVersion);
        if (dependency) {
          visit(dependency);
        }
      }
      
      visiting.delete(migration.version);
      visited.add(migration.version);
      sorted.push(migration);
    };

    for (const migration of migrations) {
      visit(migration);
    }

    return sorted;
  }
}

/**
 * Migration Utilities
 */
export class MigrationUtils {
  /**
   * Generate migration version (timestamp-based)
   */
  static generateVersion(): string {
    return new Date().toISOString().replace(/[-T:.Z]/g, '').substring(0, 14);
  }

  /**
   * Validate migration version format
   */
  static validateVersion(version: string): boolean {
    return /^\d{14}$/.test(version);
  }

  /**
   * Create migration template
   */
  static createMigrationTemplate(name: string, description: string): string {
    const version = this.generateVersion();
    const className = this.toCamelCase(name);
    
    return `
import { BaseGovernanceMigration } from '../migrations/GovernanceMigrationManager';
import { IGovernanceConnectionPool } from '../interfaces/IGovernanceDatabase';

export class ${className}Migration extends BaseGovernanceMigration {
  name = '${name}';
  version = '${version}';
  description = '${description}';

  constructor(connectionPool: IGovernanceConnectionPool) {
    super(connectionPool);
  }

  async up(): Promise<void> {
    // TODO: Implement migration up
    await this.executeSQL(\`
      -- Add your migration SQL here
    \`);
  }

  async down(): Promise<void> {
    // TODO: Implement migration down
    await this.executeSQL(\`
      -- Add your rollback SQL here
    \`);
  }

  getDependencies(): string[] {
    return [];
  }
}
    `.trim();
  }

  private static toCamelCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
}
