/**
 * Transaction Manager
 * Manages database transactions across all providers
 */

import { 
  TransactionOperation,
  DatabaseError,
  TransactionError
} from '../../../shared-utils/database-interface';
import { BaseDatabaseProvider } from '../providers/BaseDatabaseProvider';
import { EventEmitter } from 'events';

export interface TransactionContext {
  id: string;
  provider: BaseDatabaseProvider;
  startTime: Date;
  operations: TransactionOperation[];
  status: 'pending' | 'committed' | 'rolled_back' | 'failed';
  metadata?: Record<string, any>;
}

export interface TransactionOptions {
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
}

export interface TransactionStats {
  totalTransactions: number;
  committedTransactions: number;
  rolledBackTransactions: number;
  failedTransactions: number;
  averageTransactionTime: number;
  activeTransactions: number;
}

export class DatabaseTransactionManager extends EventEmitter {
  private activeTransactions = new Map<string, TransactionContext>();
  private transactionCounter = 0;
  private stats: TransactionStats = {
    totalTransactions: 0,
    committedTransactions: 0,
    rolledBackTransactions: 0,
    failedTransactions: 0,
    averageTransactionTime: 0,
    activeTransactions: 0
  };

  /**
   * Begin a new transaction
   */
  async beginTransaction(
    provider: BaseDatabaseProvider, 
    options: TransactionOptions = {}
  ): Promise<string> {
    const transactionId = this.generateTransactionId();
    const context: TransactionContext = {
      id: transactionId,
      provider,
      startTime: new Date(),
      operations: [],
      status: 'pending',
      metadata: {
        options,
        timeout: options.timeout || 30000
      }
    };

    this.activeTransactions.set(transactionId, context);
    this.stats.totalTransactions++;
    this.stats.activeTransactions++;

    // Set timeout
    if (options.timeout) {
      setTimeout(() => {
        this.timeoutTransaction(transactionId);
      }, options.timeout);
    }

    this.emit('transactionStarted', { transactionId, context });
    return transactionId;
  }

  /**
   * Add operation to transaction
   */
  addOperation(transactionId: string, operation: TransactionOperation): void {
    const context = this.activeTransactions.get(transactionId);
    if (!context) {
      throw new TransactionError(`Transaction ${transactionId} not found`);
    }

    if (context.status !== 'pending') {
      throw new TransactionError(`Cannot add operation to ${context.status} transaction`);
    }

    context.operations.push(operation);
    this.emit('operationAdded', { transactionId, operation });
  }

  /**
   * Execute transaction with all operations
   */
  async executeTransaction<T>(
    provider: BaseDatabaseProvider,
    operations: TransactionOperation[],
    options: TransactionOptions = {}
  ): Promise<T> {
    const transactionId = await this.beginTransaction(provider, options);
    const context = this.activeTransactions.get(transactionId)!;

    try {
      // Add all operations
      for (const operation of operations) {
        this.addOperation(transactionId, operation);
      }

      // Execute transaction
      const result = await this.executeWithRetry(context, options);
      
      // Commit transaction
      await this.commitTransaction(transactionId);
      
      return result;
    } catch (error) {
      await this.rollbackTransaction(transactionId);
      throw error;
    }
  }

  /**
   * Commit transaction
   */
  async commitTransaction(transactionId: string): Promise<void> {
    const context = this.activeTransactions.get(transactionId);
    if (!context) {
      throw new TransactionError(`Transaction ${transactionId} not found`);
    }

    if (context.status !== 'pending') {
      throw new TransactionError(`Cannot commit ${context.status} transaction`);
    }

    const startTime = Date.now();

    try {
      context.status = 'committed';
      this.updateStats(context, Date.now() - startTime);
      this.activeTransactions.delete(transactionId);
      
      this.emit('transactionCommitted', { transactionId, context });
    } catch (error) {
      context.status = 'failed';
      this.stats.failedTransactions++;
      this.stats.activeTransactions--;
      throw new TransactionError(`Failed to commit transaction: ${error}`);
    }
  }

  /**
   * Rollback transaction
   */
  async rollbackTransaction(transactionId: string): Promise<void> {
    const context = this.activeTransactions.get(transactionId);
    if (!context) {
      throw new TransactionError(`Transaction ${transactionId} not found`);
    }

    const startTime = Date.now();

    try {
      context.status = 'rolled_back';
      this.stats.rolledBackTransactions++;
      this.stats.activeTransactions--;
      this.activeTransactions.delete(transactionId);
      
      this.emit('transactionRolledBack', { transactionId, context });
    } catch (error) {
      context.status = 'failed';
      this.stats.failedTransactions++;
      this.stats.activeTransactions--;
      throw new TransactionError(`Failed to rollback transaction: ${error}`);
    }
  }

  /**
   * Get transaction status
   */
  getTransactionStatus(transactionId: string): TransactionContext | null {
    return this.activeTransactions.get(transactionId) || null;
  }

  /**
   * List active transactions
   */
  getActiveTransactions(): TransactionContext[] {
    return Array.from(this.activeTransactions.values());
  }

  /**
   * Get transaction statistics
   */
  getStats(): TransactionStats {
    return { ...this.stats };
  }

  /**
   * Cancel transaction
   */
  async cancelTransaction(transactionId: string): Promise<void> {
    const context = this.activeTransactions.get(transactionId);
    if (!context) {
      return; // Already completed or doesn't exist
    }

    if (context.status === 'pending') {
      await this.rollbackTransaction(transactionId);
    }
  }

  /**
   * Cancel all active transactions
   */
  async cancelAllTransactions(): Promise<void> {
    const activeIds = Array.from(this.activeTransactions.keys());
    
    await Promise.allSettled(
      activeIds.map(id => this.cancelTransaction(id))
    );
  }

  /**
   * Clean up expired transactions
   */
  async cleanup(maxAge: number = 3600000): Promise<number> { // 1 hour default
    const now = Date.now();
    let cleanedCount = 0;

    for (const [id, context] of this.activeTransactions) {
      const age = now - context.startTime.getTime();
      
      if (age > maxAge) {
        try {
          await this.cancelTransaction(id);
          cleanedCount++;
        } catch (error) {
          console.warn(`Failed to cleanup transaction ${id}:`, error);
        }
      }
    }

    return cleanedCount;
  }

  private async executeWithRetry(
    context: TransactionContext, 
    options: TransactionOptions
  ): Promise<any> {
    const maxRetries = options.retryAttempts || 0;
    const retryDelay = options.retryDelay || 1000;
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await context.provider.transaction(context.operations);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          this.emit('transactionRetry', { 
            transactionId: context.id, 
            attempt: attempt + 1, 
            error 
          });
          
          await this.delay(retryDelay * (attempt + 1));
        }
      }
    }

    throw lastError!;
  }

  private async timeoutTransaction(transactionId: string): Promise<void> {
    const context = this.activeTransactions.get(transactionId);
    if (context && context.status === 'pending') {
      this.emit('transactionTimeout', { transactionId, context });
      await this.rollbackTransaction(transactionId);
    }
  }

  private generateTransactionId(): string {
    return `tx_${Date.now()}_${++this.transactionCounter}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateStats(context: TransactionContext, executionTime: number): void {
    this.stats.committedTransactions++;
    this.stats.activeTransactions--;
    
    // Update average transaction time
    const totalTime = this.stats.averageTransactionTime * (this.stats.committedTransactions - 1) + executionTime;
    this.stats.averageTransactionTime = totalTime / this.stats.committedTransactions;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}