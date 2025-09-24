/**
 * Unified Edge Function Service
 * Provides unified edge function interface across different providers
 */

import { EventEmitter } from 'events';
import { EdgeFunctionConfig } from '../backend-manager/types';

export interface EdgeFunction {
  name: string;
  slug: string;
  runtime: 'deno' | 'node' | 'python' | 'go';
  code: string;
  environment?: Record<string, string>;
  timeout?: number;
  memory?: number;
  triggers?: EdgeFunctionTrigger[];
}

export interface EdgeFunctionTrigger {
  type: 'http' | 'webhook' | 'schedule' | 'database';
  config: any;
}

export interface EdgeFunctionExecution {
  id: string;
  functionName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'running' | 'success' | 'error' | 'timeout';
  result?: any;
  error?: string;
  logs: string[];
  metrics: {
    memoryUsed: number;
    cpuTime: number;
    invocations: number;
  };
}

export interface EdgeFunctionInvocation {
  method: string;
  headers: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
  context?: Record<string, any>;
}

export interface EdgeFunctionResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  duration: number;
}

export interface UnifiedEdgeFunctionServiceOptions {
  autoConnect?: boolean;
  enableEvents?: boolean;
  enableLogging?: boolean;
  enableMetrics?: boolean;
  retryAttempts?: number;
  defaultTimeout?: number;
  defaultMemory?: number;
}

export interface IEdgeFunctionProvider {
  connect(config: EdgeFunctionConfig): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  // Function management
  deployFunction(func: EdgeFunction): Promise<string>;
  updateFunction(name: string, func: Partial<EdgeFunction>): Promise<void>;
  deleteFunction(name: string): Promise<void>;
  listFunctions(): Promise<EdgeFunction[]>;
  getFunction(name: string): Promise<EdgeFunction>;
  
  // Execution
  invokeFunction(name: string, invocation: EdgeFunctionInvocation): Promise<EdgeFunctionResponse>;
  
  // Monitoring
  getExecutionLogs(name: string, limit?: number): Promise<EdgeFunctionExecution[]>;
  getMetrics(name: string, timeRange?: { start: Date; end: Date }): Promise<any>;
}

export class UnifiedEdgeFunctionService extends EventEmitter {
  private provider: IEdgeFunctionProvider | null = null;
  private config: EdgeFunctionConfig | null = null;
  private options: Required<UnifiedEdgeFunctionServiceOptions>;
  private isConnectedFlag = false;
  private deployedFunctions = new Map<string, EdgeFunction>();
  private executionHistory = new Map<string, EdgeFunctionExecution[]>();
  
  // Metrics
  private metrics = {
    totalInvocations: 0,
    totalExecutionTime: 0,
    totalErrors: 0,
    functionsDeployed: 0
  };

  constructor(options: UnifiedEdgeFunctionServiceOptions = {}) {
    super();
    
    this.options = {
      autoConnect: options.autoConnect ?? true,
      enableEvents: options.enableEvents ?? true,
      enableLogging: options.enableLogging ?? true,
      enableMetrics: options.enableMetrics ?? true,
      retryAttempts: options.retryAttempts ?? 3,
      defaultTimeout: options.defaultTimeout ?? 30000,
      defaultMemory: options.defaultMemory ?? 128
    };
  }

  /**
   * Connect to edge function provider
   */
  async connect(config: EdgeFunctionConfig): Promise<void> {
    try {
      this.config = config;
      
      // Create provider instance
      this.provider = this.createProvider(config);
      
      // Connect to provider
      await this.provider.connect(config);
      
      this.isConnectedFlag = true;
      
      // Load existing functions
      await this.loadExistingFunctions();
      
      this.emit('connected', { provider: config.type });
      
    } catch (error) {
      this.emit('connection:failed', { error });
      throw error;
    }
  }

  /**
   * Disconnect from edge function provider
   */
  async disconnect(): Promise<void> {
    try {
      if (this.provider) {
        await this.provider.disconnect();
      }
      
      this.isConnectedFlag = false;
      this.provider = null;
      this.config = null;
      
      // Clear caches
      this.deployedFunctions.clear();
      this.executionHistory.clear();
      
      this.emit('disconnected');
      
    } catch (error) {
      this.emit('disconnection:failed', { error });
      throw error;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.isConnectedFlag && this.provider?.isConnected() === true;
  }

  // Function Management
  
  async deployFunction(func: EdgeFunction): Promise<string> {
    this.ensureConnected();
    
    try {
      // Validate function
      this.validateFunction(func);
      
      // Set defaults
      const functionWithDefaults = {
        ...func,
        timeout: func.timeout || this.options.defaultTimeout,
        memory: func.memory || this.options.defaultMemory
      };
      
      const functionId = await this.executeWithRetry(() => 
        this.provider!.deployFunction(functionWithDefaults)
      );
      
      // Cache the function
      this.deployedFunctions.set(func.name, functionWithDefaults);
      
      // Update metrics
      if (this.options.enableMetrics) {
        this.metrics.functionsDeployed++;
      }
      
      // Emit event
      if (this.options.enableEvents) {
        this.emit('function:deployed', { function: func, functionId });
      }
      
      return functionId;
      
    } catch (error) {
      if (this.options.enableEvents) {
        this.emit('function:deploy:failed', { function: func, error });
      }
      throw error;
    }
  }

  async updateFunction(name: string, updates: Partial<EdgeFunction>): Promise<void> {
    this.ensureConnected();
    
    try {
      const existingFunction = this.deployedFunctions.get(name);
      if (!existingFunction) {
        throw new Error(`Function '${name}' not found`);
      }
      
      const updatedFunction = { ...existingFunction, ...updates };
      this.validateFunction(updatedFunction);
      
      await this.executeWithRetry(() => 
        this.provider!.updateFunction(name, updates)
      );
      
      // Update cache
      this.deployedFunctions.set(name, updatedFunction);
      
      // Emit event
      if (this.options.enableEvents) {
        this.emit('function:updated', { name, updates });
      }
      
    } catch (error) {
      if (this.options.enableEvents) {
        this.emit('function:update:failed', { name, error });
      }
      throw error;
    }
  }

  async deleteFunction(name: string): Promise<void> {
    this.ensureConnected();
    
    try {
      await this.executeWithRetry(() => 
        this.provider!.deleteFunction(name)
      );
      
      // Remove from cache
      this.deployedFunctions.delete(name);
      this.executionHistory.delete(name);
      
      // Emit event
      if (this.options.enableEvents) {
        this.emit('function:deleted', { name });
      }
      
    } catch (error) {
      if (this.options.enableEvents) {
        this.emit('function:delete:failed', { name, error });
      }
      throw error;
    }
  }

  async listFunctions(): Promise<EdgeFunction[]> {
    this.ensureConnected();
    
    try {
      const functions = await this.executeWithRetry(() => 
        this.provider!.listFunctions()
      );
      
      // Update cache
      functions.forEach(func => {
        this.deployedFunctions.set(func.name, func);
      });
      
      return functions;
      
    } catch (error) {
      if (this.options.enableEvents) {
        this.emit('functions:list:failed', { error });
      }
      throw error;
    }
  }

  async getFunction(name: string): Promise<EdgeFunction> {
    this.ensureConnected();
    
    // Check cache first
    const cached = this.deployedFunctions.get(name);
    if (cached) {
      return cached;
    }
    
    try {
      const func = await this.executeWithRetry(() => 
        this.provider!.getFunction(name)
      );
      
      // Cache the result
      this.deployedFunctions.set(name, func);
      
      return func;
      
    } catch (error) {
      if (this.options.enableEvents) {
        this.emit('function:get:failed', { name, error });
      }
      throw error;
    }
  }

  // Function Execution
  
  async invokeFunction(
    name: string, 
    invocation: EdgeFunctionInvocation
  ): Promise<EdgeFunctionResponse> {
    this.ensureConnected();
    
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    // Create execution record
    const execution: EdgeFunctionExecution = {
      id: executionId,
      functionName: name,
      startTime: new Date(),
      status: 'running',
      logs: [],
      metrics: {
        memoryUsed: 0,
        cpuTime: 0,
        invocations: 1
      }
    };
    
    try {
      // Add to execution history
      this.addExecutionToHistory(name, execution);
      
      const response = await this.executeWithRetry(() => 
        this.provider!.invokeFunction(name, invocation)
      );
      
      const duration = Date.now() - startTime;
      
      // Update execution record
      execution.endTime = new Date();
      execution.duration = duration;
      execution.status = 'success';
      execution.result = response;
      
      // Update metrics
      if (this.options.enableMetrics) {
        this.metrics.totalInvocations++;
        this.metrics.totalExecutionTime += duration;
      }
      
      // Emit event
      if (this.options.enableEvents) {
        this.emit('function:invoked', {
          name,
          execution,
          response,
          duration
        });
      }
      
      return {
        ...response,
        duration
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Update execution record
      execution.endTime = new Date();
      execution.duration = duration;
      execution.status = 'error';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      
      // Update metrics
      if (this.options.enableMetrics) {
        this.metrics.totalInvocations++;
        this.metrics.totalErrors++;
        this.metrics.totalExecutionTime += duration;
      }
      
      // Emit event
      if (this.options.enableEvents) {
        this.emit('function:invoke:failed', {
          name,
          execution,
          error,
          duration
        });
      }
      
      throw error;
    }
  }

  // Monitoring and Analytics
  
  async getExecutionLogs(name: string, limit = 50): Promise<EdgeFunctionExecution[]> {
    this.ensureConnected();
    
    try {
      // Get logs from provider
      const providerLogs = await this.executeWithRetry(() => 
        this.provider!.getExecutionLogs(name, limit)
      );
      
      // Merge with local history
      const localHistory = this.executionHistory.get(name) || [];
      const mergedLogs = this.mergeExecutionLogs(providerLogs, localHistory);
      
      return mergedLogs.slice(0, limit);
      
    } catch (error) {
      if (this.options.enableEvents) {
        this.emit('logs:get:failed', { name, error });
      }
      throw error;
    }
  }

  async getMetrics(
    name: string, 
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    invocations: number;
    averageExecutionTime: number;
    errorRate: number;
    memoryUsage: number;
    providerMetrics?: any;
  }> {
    this.ensureConnected();
    
    try {
      // Get provider-specific metrics
      const providerMetrics = await this.executeWithRetry(() => 
        this.provider!.getMetrics(name, timeRange)
      );
      
      // Calculate local metrics
      const executions = this.executionHistory.get(name) || [];
      const filteredExecutions = timeRange 
        ? executions.filter(e => 
            e.startTime >= timeRange.start && e.startTime <= timeRange.end
          )
        : executions;
      
      const totalExecutions = filteredExecutions.length;
      const errors = filteredExecutions.filter(e => e.status === 'error').length;
      const totalTime = filteredExecutions.reduce((sum, e) => sum + (e.duration || 0), 0);
      const totalMemory = filteredExecutions.reduce((sum, e) => sum + e.metrics.memoryUsed, 0);
      
      return {
        invocations: totalExecutions,
        averageExecutionTime: totalExecutions > 0 ? totalTime / totalExecutions : 0,
        errorRate: totalExecutions > 0 ? errors / totalExecutions : 0,
        memoryUsage: totalExecutions > 0 ? totalMemory / totalExecutions : 0,
        providerMetrics
      };
      
    } catch (error) {
      if (this.options.enableEvents) {
        this.emit('metrics:get:failed', { name, error });
      }
      throw error;
    }
  }

  // Batch Operations
  
  async deployMultipleFunctions(functions: EdgeFunction[]): Promise<string[]> {
    const results: string[] = [];
    const errors: Array<{ function: EdgeFunction; error: Error }> = [];
    
    for (const func of functions) {
      try {
        const functionId = await this.deployFunction(func);
        results.push(functionId);
      } catch (error) {
        errors.push({ function: func, error: error as Error });
      }
    }
    
    if (errors.length > 0) {
      this.emit('functions:deploy:partial_failure', { 
        successful: results.length, 
        failed: errors.length, 
        errors 
      });
    }
    
    return results;
  }

  async invokeMultipleFunctions(
    invocations: Array<{ name: string; invocation: EdgeFunctionInvocation }>
  ): Promise<EdgeFunctionResponse[]> {
    const promises = invocations.map(({ name, invocation }) => 
      this.invokeFunction(name, invocation).catch(error => ({ error, name }))
    );
    
    const results = await Promise.all(promises);
    
    return results.filter(result => !('error' in result)) as EdgeFunctionResponse[];
  }

  // Utility Methods
  
  getDeployedFunctions(): string[] {
    return Array.from(this.deployedFunctions.keys());
  }

  getFunctionCount(): number {
    return this.deployedFunctions.size;
  }

  getServiceMetrics() {
    return {
      ...this.metrics,
      functionsCount: this.deployedFunctions.size,
      averageExecutionTime: this.metrics.totalInvocations > 0 
        ? this.metrics.totalExecutionTime / this.metrics.totalInvocations 
        : 0,
      errorRate: this.metrics.totalInvocations > 0 
        ? this.metrics.totalErrors / this.metrics.totalInvocations 
        : 0
    };
  }

  private ensureConnected(): void {
    if (!this.isConnected()) {
      throw new Error('Edge Function service is not connected');
    }
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.options.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === this.options.retryAttempts) {
          throw lastError;
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    
    throw lastError!;
  }

  private createProvider(config: EdgeFunctionConfig): IEdgeFunctionProvider {
    switch (config.type) {
      case 'supabase':
        return new SupabaseEdgeFunctionProvider();
      case 'vercel':
        return new VercelEdgeFunctionProvider();
      case 'cloudflare':
        return new CloudflareEdgeFunctionProvider();
      case 'aws-lambda':
        return new AWSLambdaProvider();
      case 'azure-functions':
        return new AzureFunctionsProvider();
      default:
        throw new Error(`Unsupported edge function provider: ${config.type}`);
    }
  }

  private validateFunction(func: EdgeFunction): void {
    if (!func.name) {
      throw new Error('Function name is required');
    }
    
    if (!func.slug) {
      throw new Error('Function slug is required');
    }
    
    if (!func.code) {
      throw new Error('Function code is required');
    }
    
    if (!['deno', 'node', 'python', 'go'].includes(func.runtime)) {
      throw new Error('Invalid function runtime');
    }
  }

  private async loadExistingFunctions(): Promise<void> {
    try {
      const functions = await this.listFunctions();
      functions.forEach(func => {
        this.deployedFunctions.set(func.name, func);
      });
    } catch (error) {
      // Ignore errors during initial load
    }
  }

  private addExecutionToHistory(name: string, execution: EdgeFunctionExecution): void {
    const history = this.executionHistory.get(name) || [];
    history.push(execution);
    
    // Keep only the latest 100 executions
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    this.executionHistory.set(name, history);
  }

  private mergeExecutionLogs(
    providerLogs: EdgeFunctionExecution[], 
    localHistory: EdgeFunctionExecution[]
  ): EdgeFunctionExecution[] {
    // Merge and deduplicate logs based on execution ID
    const merged = new Map<string, EdgeFunctionExecution>();
    
    [...providerLogs, ...localHistory].forEach(log => {
      if (!merged.has(log.id) || log.endTime) {
        merged.set(log.id, log);
      }
    });
    
    return Array.from(merged.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }
}

// Placeholder provider implementations

class SupabaseEdgeFunctionProvider implements IEdgeFunctionProvider {
  async connect(config: EdgeFunctionConfig): Promise<void> {
    // Implementation for Supabase edge functions
    throw new Error('Not implemented');
  }
  
  async disconnect(): Promise<void> {
    throw new Error('Not implemented');
  }
  
  isConnected(): boolean {
    return false;
  }
  
  async deployFunction(func: EdgeFunction): Promise<string> {
    throw new Error('Not implemented');
  }
  
  async updateFunction(name: string, func: Partial<EdgeFunction>): Promise<void> {
    throw new Error('Not implemented');
  }
  
  async deleteFunction(name: string): Promise<void> {
    throw new Error('Not implemented');
  }
  
  async listFunctions(): Promise<EdgeFunction[]> {
    throw new Error('Not implemented');
  }
  
  async getFunction(name: string): Promise<EdgeFunction> {
    throw new Error('Not implemented');
  }
  
  async invokeFunction(name: string, invocation: EdgeFunctionInvocation): Promise<EdgeFunctionResponse> {
    throw new Error('Not implemented');
  }
  
  async getExecutionLogs(name: string, limit?: number): Promise<EdgeFunctionExecution[]> {
    throw new Error('Not implemented');
  }
  
  async getMetrics(name: string, timeRange?: { start: Date; end: Date }): Promise<any> {
    throw new Error('Not implemented');
  }
}

class VercelEdgeFunctionProvider implements IEdgeFunctionProvider {
  // Similar implementation for Vercel
  async connect(config: EdgeFunctionConfig): Promise<void> { throw new Error('Not implemented'); }
  async disconnect(): Promise<void> { throw new Error('Not implemented'); }
  isConnected(): boolean { return false; }
  async deployFunction(func: EdgeFunction): Promise<string> { throw new Error('Not implemented'); }
  async updateFunction(name: string, func: Partial<EdgeFunction>): Promise<void> { throw new Error('Not implemented'); }
  async deleteFunction(name: string): Promise<void> { throw new Error('Not implemented'); }
  async listFunctions(): Promise<EdgeFunction[]> { throw new Error('Not implemented'); }
  async getFunction(name: string): Promise<EdgeFunction> { throw new Error('Not implemented'); }
  async invokeFunction(name: string, invocation: EdgeFunctionInvocation): Promise<EdgeFunctionResponse> { throw new Error('Not implemented'); }
  async getExecutionLogs(name: string, limit?: number): Promise<EdgeFunctionExecution[]> { throw new Error('Not implemented'); }
  async getMetrics(name: string, timeRange?: { start: Date; end: Date }): Promise<any> { throw new Error('Not implemented'); }
}

class CloudflareEdgeFunctionProvider implements IEdgeFunctionProvider {
  // Implementation for Cloudflare Workers
  async connect(config: EdgeFunctionConfig): Promise<void> { throw new Error('Not implemented'); }
  async disconnect(): Promise<void> { throw new Error('Not implemented'); }
  isConnected(): boolean { return false; }
  async deployFunction(func: EdgeFunction): Promise<string> { throw new Error('Not implemented'); }
  async updateFunction(name: string, func: Partial<EdgeFunction>): Promise<void> { throw new Error('Not implemented'); }
  async deleteFunction(name: string): Promise<void> { throw new Error('Not implemented'); }
  async listFunctions(): Promise<EdgeFunction[]> { throw new Error('Not implemented'); }
  async getFunction(name: string): Promise<EdgeFunction> { throw new Error('Not implemented'); }
  async invokeFunction(name: string, invocation: EdgeFunctionInvocation): Promise<EdgeFunctionResponse> { throw new Error('Not implemented'); }
  async getExecutionLogs(name: string, limit?: number): Promise<EdgeFunctionExecution[]> { throw new Error('Not implemented'); }
  async getMetrics(name: string, timeRange?: { start: Date; end: Date }): Promise<any> { throw new Error('Not implemented'); }
}

class AWSLambdaProvider implements IEdgeFunctionProvider {
  // Implementation for AWS Lambda
  async connect(config: EdgeFunctionConfig): Promise<void> { throw new Error('Not implemented'); }
  async disconnect(): Promise<void> { throw new Error('Not implemented'); }
  isConnected(): boolean { return false; }
  async deployFunction(func: EdgeFunction): Promise<string> { throw new Error('Not implemented'); }
  async updateFunction(name: string, func: Partial<EdgeFunction>): Promise<void> { throw new Error('Not implemented'); }
  async deleteFunction(name: string): Promise<void> { throw new Error('Not implemented'); }
  async listFunctions(): Promise<EdgeFunction[]> { throw new Error('Not implemented'); }
  async getFunction(name: string): Promise<EdgeFunction> { throw new Error('Not implemented'); }
  async invokeFunction(name: string, invocation: EdgeFunctionInvocation): Promise<EdgeFunctionResponse> { throw new Error('Not implemented'); }
  async getExecutionLogs(name: string, limit?: number): Promise<EdgeFunctionExecution[]> { throw new Error('Not implemented'); }
  async getMetrics(name: string, timeRange?: { start: Date; end: Date }): Promise<any> { throw new Error('Not implemented'); }
}

class AzureFunctionsProvider implements IEdgeFunctionProvider {
  // Implementation for Azure Functions
  async connect(config: EdgeFunctionConfig): Promise<void> { throw new Error('Not implemented'); }
  async disconnect(): Promise<void> { throw new Error('Not implemented'); }
  isConnected(): boolean { return false; }
  async deployFunction(func: EdgeFunction): Promise<string> { throw new Error('Not implemented'); }
  async updateFunction(name: string, func: Partial<EdgeFunction>): Promise<void> { throw new Error('Not implemented'); }
  async deleteFunction(name: string): Promise<void> { throw new Error('Not implemented'); }
  async listFunctions(): Promise<EdgeFunction[]> { throw new Error('Not implemented'); }
  async getFunction(name: string): Promise<EdgeFunction> { throw new Error('Not implemented'); }
  async invokeFunction(name: string, invocation: EdgeFunctionInvocation): Promise<EdgeFunctionResponse> { throw new Error('Not implemented'); }
  async getExecutionLogs(name: string, limit?: number): Promise<EdgeFunctionExecution[]> { throw new Error('Not implemented'); }
  async getMetrics(name: string, timeRange?: { start: Date; end: Date }): Promise<any> { throw new Error('Not implemented'); }
}
