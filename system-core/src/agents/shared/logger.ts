/**
 * Agent Logger Implementation
 * Provides structured logging for governance agents
 */

import { AgentLogger } from './types';

export class GovernanceAgentLogger implements AgentLogger {
  private level: 'debug' | 'info' | 'warn' | 'error' = 'info';
  private context: Record<string, any> = {};

  constructor(
    private agentId: string,
    private agentType: string,
    initialLevel: 'debug' | 'info' | 'warn' | 'error' = 'info'
  ) {
    this.level = initialLevel;
    this.context = {
      agentId,
      agentType,
      timestamp: new Date().toISOString()
    };
  }

  setLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
    this.level = level;
  }

  setContext(context: Record<string, any>): void {
    this.context = { ...this.context, ...context };
  }

  debug(message: string, metadata?: Record<string, any>): void {
    if (this.shouldLog('debug')) {
      this.log('debug', message, metadata);
    }
  }

  info(message: string, metadata?: Record<string, any>): void {
    if (this.shouldLog('info')) {
      this.log('info', message, metadata);
    }
  }

  warn(message: string, metadata?: Record<string, any>): void {
    if (this.shouldLog('warn')) {
      this.log('warn', message, metadata);
    }
  }

  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    if (this.shouldLog('error')) {
      const errorData = error ? {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      } : {};
      
      this.log('error', message, { ...errorData, ...metadata });
    }
  }

  private shouldLog(messageLevel: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(messageLevel);
    return messageLevelIndex >= currentLevelIndex;
  }

  private log(level: string, message: string, metadata?: Record<string, any>): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      ...this.context,
      ...metadata
    };

    // In a production environment, you might want to send logs to a centralized logging service
    // For now, we'll use console with structured output
    const output = JSON.stringify(logEntry, null, 2);
    
    switch (level) {
      case 'debug':
        console.debug(`[${this.agentId}] ${output}`);
        break;
      case 'info':
        console.info(`[${this.agentId}] ${output}`);
        break;
      case 'warn':
        console.warn(`[${this.agentId}] ${output}`);
        break;
      case 'error':
        console.error(`[${this.agentId}] ${output}`);
        break;
    }
  }

  // Utility method for creating child loggers with additional context
  createChildLogger(additionalContext: Record<string, any>): GovernanceAgentLogger {
    const childLogger = new GovernanceAgentLogger(this.agentId, this.context.agentType, this.level);
    childLogger.setContext({ ...this.context, ...additionalContext });
    return childLogger;
  }

  // Method to create performance logging
  time(label: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.info(`Performance: ${label}`, { 
        durationMs: Math.round(duration * 100) / 100,
        label 
      });
    };
  }

  // Method for logging agent state changes
  logStateChange(
    from: string, 
    to: string, 
    reason?: string, 
    metadata?: Record<string, any>
  ): void {
    this.info('Agent state change', {
      stateChange: {
        from,
        to,
        reason
      },
      ...metadata
    });
  }

  // Method for logging task execution
  logTaskExecution(
    taskId: string,
    action: 'started' | 'completed' | 'failed',
    metadata?: Record<string, any>
  ): void {
    const level = action === 'failed' ? 'error' : 'info';
    this[level](`Task ${action}: ${taskId}`, {
      taskExecution: {
        taskId,
        action
      },
      ...metadata
    });
  }

  // Method for logging communication events
  logCommunication(
    type: 'sent' | 'received',
    targetAgentId: string,
    eventType: string,
    metadata?: Record<string, any>
  ): void {
    this.debug(`Communication ${type}`, {
      communication: {
        type,
        targetAgentId,
        eventType
      },
      ...metadata
    });
  }
}

// Factory function for creating loggers
export function createAgentLogger(
  agentId: string,
  agentType: string,
  level: 'debug' | 'info' | 'warn' | 'error' = 'info'
): GovernanceAgentLogger {
  return new GovernanceAgentLogger(agentId, agentType, level);
}

// Utility for structured error logging
export function logAgentError(
  logger: AgentLogger,
  error: Error,
  context: {
    operation: string;
    agentId: string;
    [key: string]: any;
  }
): void {
  logger.error(`Error in ${context.operation}`, error, {
    errorContext: context,
    errorDetails: {
      name: error.name,
      message: error.message,
      stack: error.stack
    }
  });
}

// Utility for performance monitoring
export function withPerformanceLogging<T>(
  logger: AgentLogger,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  
  return fn()
    .then(result => {
      const duration = performance.now() - startTime;
      logger.info(`Operation completed: ${operation}`, {
        performance: {
          operation,
          durationMs: Math.round(duration * 100) / 100,
          status: 'success'
        }
      });
      return result;
    })
    .catch(error => {
      const duration = performance.now() - startTime;
      logger.error(`Operation failed: ${operation}`, error, {
        performance: {
          operation,
          durationMs: Math.round(duration * 100) / 100,
          status: 'error'
        }
      });
      throw error;
    });
}
