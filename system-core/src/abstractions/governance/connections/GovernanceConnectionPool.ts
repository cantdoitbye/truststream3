/**
 * Connection Pool Implementation
 * Manages database connections for governance operations
 */

import { IGovernanceConnectionPool, IGovernanceDatabaseConfig } from '../interfaces/IGovernanceDatabase';

/**
 * Connection wrapper for tracking usage
 */
interface PoolConnection {
  connection: any;
  inUse: boolean;
  createdAt: Date;
  lastUsed: Date;
  queryCount: number;
}

/**
 * Governance Connection Pool
 */
export class GovernanceConnectionPool implements IGovernanceConnectionPool {
  private config: IGovernanceDatabaseConfig;
  private connections: PoolConnection[] = [];
  private waiting: Array<{ resolve: (connection: any) => void; reject: (error: Error) => void }> = [];
  private isClosing = false;
  private connectionId = 0;

  constructor(config: IGovernanceDatabaseConfig) {
    this.config = {
      poolSize: 10,
      connectionTimeout: 30000,
      queryTimeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };
  }

  async getConnection(): Promise<any> {
    if (this.isClosing) {
      throw new Error('Connection pool is closing');
    }

    // Find available connection
    const availableConnection = this.connections.find(conn => !conn.inUse);
    if (availableConnection) {
      availableConnection.inUse = true;
      availableConnection.lastUsed = new Date();
      availableConnection.queryCount++;
      return availableConnection.connection;
    }

    // Create new connection if under pool limit
    if (this.connections.length < this.config.poolSize!) {
      const connection = await this.createConnection();
      const poolConnection: PoolConnection = {
        connection,
        inUse: true,
        createdAt: new Date(),
        lastUsed: new Date(),
        queryCount: 1
      };
      this.connections.push(poolConnection);
      return connection;
    }

    // Wait for available connection
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waiting.findIndex(w => w.resolve === resolve);
        if (index !== -1) {
          this.waiting.splice(index, 1);
        }
        reject(new Error('Connection timeout'));
      }, this.config.connectionTimeout);

      this.waiting.push({
        resolve: (connection) => {
          clearTimeout(timeout);
          resolve(connection);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        }
      });
    });
  }

  async releaseConnection(connection: any): Promise<void> {
    const poolConnection = this.connections.find(conn => conn.connection === connection);
    if (poolConnection) {
      poolConnection.inUse = false;
      poolConnection.lastUsed = new Date();

      // Serve waiting requests
      if (this.waiting.length > 0) {
        const waiter = this.waiting.shift()!;
        poolConnection.inUse = true;
        poolConnection.queryCount++;
        waiter.resolve(connection);
      }
    }
  }

  getStats(): {
    total: number;
    active: number;
    idle: number;
    waiting: number;
  } {
    const active = this.connections.filter(conn => conn.inUse).length;
    return {
      total: this.connections.length,
      active,
      idle: this.connections.length - active,
      waiting: this.waiting.length
    };
  }

  async close(): Promise<void> {
    this.isClosing = true;

    // Reject all waiting requests
    while (this.waiting.length > 0) {
      const waiter = this.waiting.shift()!;
      waiter.reject(new Error('Connection pool is closing'));
    }

    // Close all connections
    const closePromises = this.connections.map(async (poolConnection) => {
      try {
        if (poolConnection.connection.end) {
          await poolConnection.connection.end();
        } else if (poolConnection.connection.close) {
          await poolConnection.connection.close();
        }
      } catch (error) {
        console.warn('Error closing connection:', error);
      }
    });

    await Promise.allSettled(closePromises);
    this.connections = [];
  }

  /**
   * Health check for connections
   */
  async healthCheck(): Promise<{ healthy: number; unhealthy: number }> {
    let healthy = 0;
    let unhealthy = 0;

    const healthCheckPromises = this.connections.map(async (poolConnection) => {
      try {
        // Simple query to test connection
        await poolConnection.connection.query('SELECT 1');
        healthy++;
      } catch (error) {
        unhealthy++;
        // Mark connection for removal
        const index = this.connections.indexOf(poolConnection);
        if (index !== -1) {
          this.connections.splice(index, 1);
        }
      }
    });

    await Promise.allSettled(healthCheckPromises);
    return { healthy, unhealthy };
  }

  /**
   * Cleanup idle connections
   */
  cleanupIdleConnections(maxIdleTime = 300000): void { // 5 minutes default
    const now = new Date();
    this.connections = this.connections.filter(poolConnection => {
      if (!poolConnection.inUse) {
        const idleTime = now.getTime() - poolConnection.lastUsed.getTime();
        if (idleTime > maxIdleTime) {
          // Close idle connection
          try {
            if (poolConnection.connection.end) {
              poolConnection.connection.end();
            } else if (poolConnection.connection.close) {
              poolConnection.connection.close();
            }
          } catch (error) {
            console.warn('Error closing idle connection:', error);
          }
          return false; // Remove from pool
        }
      }
      return true; // Keep in pool
    });
  }

  private async createConnection(): Promise<any> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts!; attempt++) {
      try {
        const connection = await this.establishConnection();
        
        // Setup connection monitoring
        this.setupConnectionMonitoring(connection);
        
        return connection;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Connection attempt ${attempt} failed:`, error);
        
        if (attempt < this.config.retryAttempts!) {
          await this.delay(this.config.retryDelay! * attempt);
        }
      }
    }
    
    throw lastError!;
  }

  private async establishConnection(): Promise<any> {
    // This would be implemented based on the specific database client
    // For example, using pg for PostgreSQL:
    
    const { Client } = require('pg'); // or import if using ES modules
    
    const client = new Client({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.username,
      password: this.config.password,
      ssl: this.config.ssl,
      connectionTimeoutMillis: this.config.connectionTimeout,
      query_timeout: this.config.queryTimeout,
    });

    await client.connect();
    return client;
  }

  private setupConnectionMonitoring(connection: any): void {
    // Add connection ID for tracking
    connection._poolId = ++this.connectionId;
    
    // Handle connection errors
    connection.on('error', (error: Error) => {
      console.error(`Connection ${connection._poolId} error:`, error);
      // Remove connection from pool
      const index = this.connections.findIndex(conn => conn.connection === connection);
      if (index !== -1) {
        this.connections.splice(index, 1);
      }
    });

    // Handle connection end
    connection.on('end', () => {
      console.log(`Connection ${connection._poolId} ended`);
      // Remove connection from pool
      const index = this.connections.findIndex(conn => conn.connection === connection);
      if (index !== -1) {
        this.connections.splice(index, 1);
      }
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
