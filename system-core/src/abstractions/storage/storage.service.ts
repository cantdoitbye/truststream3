/**
 * Storage Service - Main storage service orchestrator
 * Manages storage providers and provides unified access to storage functionality
 */

import { EventEmitter } from 'events';
import {
  StorageConfig,
  FileInfo,
  FileMetadata,
  UploadOptions,
  UploadResult,
  FileUpload,
  ListOptions,
  SearchOptions,
  BucketInfo,
  BucketOptions,
  StorageStats,
  SignedUrlOptions,
  TransferOptions,
  FileVersion,
  BucketUsage,
  BucketStats,
  StorageEvent,
  LifecycleRule,
  CORSRule,
  StorageError
} from '../../shared-utils/storage-interface';
import { IStorageProvider, StorageProviderEvent, StorageMetrics } from './storage.interface';
import { StorageConfigManager } from './config';
import { StorageProviderFactory } from './providers/provider-factory';

export interface StorageServiceOptions {
  enableMetrics?: boolean;
  enableHealthChecks?: boolean;
  healthCheckInterval?: number;
  retryAttempts?: number;
  retryDelay?: number;
  enableAutoReconnect?: boolean;
  autoReconnectInterval?: number;
}

export class StorageService extends EventEmitter {
  private static instance: StorageService;
  private provider: IStorageProvider | null = null;
  private configManager: StorageConfigManager;
  private providerFactory: StorageProviderFactory;
  private options: StorageServiceOptions;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private metrics: StorageMetrics | null = null;
  private isInitialized = false;

  private constructor(options: StorageServiceOptions = {}) {
    super();
    this.configManager = StorageConfigManager.getInstance();
    this.providerFactory = StorageProviderFactory.getInstance();
    this.options = {
      enableMetrics: true,
      enableHealthChecks: true,
      healthCheckInterval: 30000, // 30 seconds
      retryAttempts: 3,
      retryDelay: 1000,
      enableAutoReconnect: true,
      autoReconnectInterval: 5000,
      ...options
    };
  }

  public static getInstance(options?: StorageServiceOptions): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService(options);
    }
    return StorageService.instance;
  }

  /**
   * Initialize the storage service with configuration
   */
  public async initialize(config: StorageConfig): Promise<void> {
    try {
      // Validate and set configuration
      this.configManager.setConfig(config);
      
      // Create provider
      this.provider = await this.providerFactory.createProvider(config);
      
      // Connect to provider
      await this.provider.connect();
      
      // Setup event listeners
      this.setupProviderEventListeners();
      
      // Start health checks if enabled
      if (this.options.enableHealthChecks) {
        this.startHealthChecks();
      }
      
      // Initialize metrics if enabled
      if (this.options.enableMetrics) {
        await this.initializeMetrics();
      }
      
      this.isInitialized = true;
      
      this.emit('initialized', {
        type: 'PROVIDER_CONNECTED',
        timestamp: new Date(),
        providerId: this.provider.getProviderName()
      } as StorageProviderEvent);
      
    } catch (error) {
      this.handleError('initialize', error);
      throw error;
    }
  }

  /**
   * Disconnect from the storage provider
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.healthCheckTimer) {
        clearInterval(this.healthCheckTimer);
        this.healthCheckTimer = null;
      }
      
      if (this.reconnectTimer) {
        clearInterval(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      
      if (this.provider && this.provider.isConnected()) {
        await this.provider.disconnect();
      }
      
      this.provider = null;
      this.isInitialized = false;
      
      this.emit('disconnected');
      
    } catch (error) {
      this.handleError('disconnect', error);
      throw error;
    }
  }

  /**
   * Check if service is connected and ready
   */
  public isConnected(): boolean {
    return this.isInitialized && !!this.provider && this.provider.isConnected();
  }

  /**
   * Get current provider information
   */
  public getProviderInfo(): { name: string; connected: boolean } | null {
    if (!this.provider) {
      return null;
    }
    
    return {
      name: this.provider.getProviderName(),
      connected: this.provider.isConnected()
    };
  }

  /**
   * Switch to a different storage provider
   */
  public async switchProvider(config: StorageConfig): Promise<void> {
    try {
      // Disconnect current provider
      if (this.provider) {
        await this.provider.disconnect();
      }
      
      // Initialize with new config
      await this.initialize(config);
      
    } catch (error) {
      this.handleError('switchProvider', error);
      throw error;
    }
  }

  /**
   * Perform health check on current provider
   */
  public async healthCheck(): Promise<{ healthy: boolean; provider: string; details?: any }> {
    if (!this.provider) {
      return { healthy: false, provider: 'none' };
    }
    
    try {
      const healthStatus = await this.provider.healthCheck();
      return {
        healthy: healthStatus.status === 'healthy',
        provider: this.provider.getProviderName(),
        details: healthStatus
      };
    } catch (error) {
      return {
        healthy: false,
        provider: this.provider.getProviderName(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Get current metrics
   */
  public getMetrics(): StorageMetrics | null {
    return this.metrics;
  }

  // Delegate all storage operations to the provider with error handling and retries

  public async upload(path: string, file: File | Buffer, options?: UploadOptions): Promise<UploadResult> {
    return this.executeWithRetry(() => this.ensureProvider().upload(path, file, options));
  }

  public async download(path: string): Promise<ArrayBuffer> {
    return this.executeWithRetry(() => this.ensureProvider().download(path));
  }

  public async downloadStream(path: string): Promise<ReadableStream> {
    return this.executeWithRetry(() => this.ensureProvider().downloadStream(path));
  }

  public async delete(path: string): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().delete(path));
  }

  public async exists(path: string): Promise<boolean> {
    return this.executeWithRetry(() => this.ensureProvider().exists(path));
  }

  public async uploadMultiple(files: FileUpload[]): Promise<UploadResult[]> {
    return this.executeWithRetry(() => this.ensureProvider().uploadMultiple(files));
  }

  public async downloadMultiple(paths: string[]): Promise<ArrayBuffer[]> {
    return this.executeWithRetry(() => this.ensureProvider().downloadMultiple(paths));
  }

  public async deleteMultiple(paths: string[]): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().deleteMultiple(paths));
  }

  public async getMetadata(path: string): Promise<FileMetadata> {
    return this.executeWithRetry(() => this.ensureProvider().getMetadata(path));
  }

  public async updateMetadata(path: string, metadata: Record<string, any>): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().updateMetadata(path, metadata));
  }

  public async listFiles(directory: string, options?: ListOptions): Promise<FileInfo[]> {
    return this.executeWithRetry(() => this.ensureProvider().listFiles(directory, options));
  }

  public getPublicUrl(path: string): string {
    return this.ensureProvider().getPublicUrl(path);
  }

  public async getSignedUrl(path: string, options: SignedUrlOptions): Promise<string> {
    return this.executeWithRetry(() => this.ensureProvider().getSignedUrl(path, options));
  }

  public async moveFile(fromPath: string, toPath: string): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().moveFile(fromPath, toPath));
  }

  public async copyFile(fromPath: string, toPath: string, options?: TransferOptions): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().copyFile(fromPath, toPath, options));
  }

  public async renameFile(oldPath: string, newPath: string): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().renameFile(oldPath, newPath));
  }

  public async createDirectory(path: string): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().createDirectory(path));
  }

  public async deleteDirectory(path: string, recursive?: boolean): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().deleteDirectory(path, recursive));
  }

  public async listDirectories(path: string): Promise<string[]> {
    return this.executeWithRetry(() => this.ensureProvider().listDirectories(path));
  }

  public async searchFiles(query: string, options?: SearchOptions): Promise<FileInfo[]> {
    return this.executeWithRetry(() => this.ensureProvider().searchFiles(query, options));
  }

  public async findFilesByType(mimeType: string, directory?: string): Promise<FileInfo[]> {
    return this.executeWithRetry(() => this.ensureProvider().findFilesByType(mimeType, directory));
  }

  public async findFilesBySize(minSize: number, maxSize?: number, directory?: string): Promise<FileInfo[]> {
    return this.executeWithRetry(() => this.ensureProvider().findFilesBySize(minSize, maxSize, directory));
  }

  public async listVersions(path: string): Promise<FileVersion[]> {
    return this.executeWithRetry(() => this.ensureProvider().listVersions(path));
  }

  public async restoreVersion(path: string, versionId: string): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().restoreVersion(path, versionId));
  }

  public async deleteVersion(path: string, versionId: string): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().deleteVersion(path, versionId));
  }

  public async compressFile(path: string, algorithm?: 'gzip' | 'brotli'): Promise<string> {
    return this.executeWithRetry(() => this.ensureProvider().compressFile(path, algorithm));
  }

  public async decompressFile(path: string): Promise<string> {
    return this.executeWithRetry(() => this.ensureProvider().decompressFile(path));
  }

  public async createArchive(paths: string[], archivePath: string, format?: 'zip' | 'tar'): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().createArchive(paths, archivePath, format));
  }

  public async extractArchive(archivePath: string, extractPath: string): Promise<string[]> {
    return this.executeWithRetry(() => this.ensureProvider().extractArchive(archivePath, extractPath));
  }

  // Bucket Management
  public async createBucket(name: string, options?: BucketOptions): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().createBucket(name, options));
  }

  public async deleteBucket(name: string, force?: boolean): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().deleteBucket(name, force));
  }

  public async listBuckets(): Promise<BucketInfo[]> {
    return this.executeWithRetry(() => this.ensureProvider().listBuckets());
  }

  public async getBucket(name: string): Promise<BucketInfo | null> {
    return this.executeWithRetry(() => this.ensureProvider().getBucket(name));
  }

  public async bucketExists(name: string): Promise<boolean> {
    return this.executeWithRetry(() => this.ensureProvider().bucketExists(name));
  }

  public async setBucketPolicy(name: string, policy: string): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().setBucketPolicy(name, policy));
  }

  public async getBucketPolicy(name: string): Promise<string> {
    return this.executeWithRetry(() => this.ensureProvider().getBucketPolicy(name));
  }

  public async setBucketCORS(name: string, rules: CORSRule[]): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().setBucketCORS(name, rules));
  }

  public async getBucketCORS(name: string): Promise<CORSRule[]> {
    return this.executeWithRetry(() => this.ensureProvider().getBucketCORS(name));
  }

  public async setBucketLifecycle(name: string, rules: LifecycleRule[]): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().setBucketLifecycle(name, rules));
  }

  public async getBucketLifecycle(name: string): Promise<LifecycleRule[]> {
    return this.executeWithRetry(() => this.ensureProvider().getBucketLifecycle(name));
  }

  public async getBucketUsage(name: string): Promise<BucketUsage> {
    return this.executeWithRetry(() => this.ensureProvider().getBucketUsage(name));
  }

  public async getBucketStats(name: string, period?: string): Promise<BucketStats> {
    return this.executeWithRetry(() => this.ensureProvider().getBucketStats(name, period));
  }

  // Event methods
  public onUpload(callback: (event: StorageEvent) => void): () => void {
    return this.ensureProvider().onUpload(callback);
  }

  public onDownload(callback: (event: StorageEvent) => void): () => void {
    return this.ensureProvider().onDownload(callback);
  }

  public onDelete(callback: (event: StorageEvent) => void): () => void {
    return this.ensureProvider().onDelete(callback);
  }

  public onError(callback: (error: StorageError) => void): () => void {
    return this.ensureProvider().onError(callback);
  }

  public async broadcastEvent(event: StorageEvent): Promise<void> {
    return this.executeWithRetry(() => this.ensureProvider().broadcastEvent(event));
  }

  public async getStats(): Promise<StorageStats> {
    return this.executeWithRetry(() => this.ensureProvider().getStats());
  }

  // Private utility methods

  private ensureProvider(): IStorageProvider {
    if (!this.provider) {
      throw new StorageError('Storage service not initialized. Call initialize() first.', 'SERVICE_NOT_INITIALIZED', 500);
    }
    
    if (!this.provider.isConnected()) {
      throw new StorageError('Storage provider not connected', 'PROVIDER_NOT_CONNECTED', 500);
    }
    
    return this.provider;
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.options.retryAttempts!; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === this.options.retryAttempts) {
          break;
        }
        
        // Check if this is a retryable error
        if (!this.isRetryableError(lastError)) {
          break;
        }
        
        // Wait before retrying
        await this.delay(this.options.retryDelay! * attempt);
        
        // Try to reconnect if provider is disconnected
        if (this.provider && !this.provider.isConnected()) {
          try {
            await this.provider.connect();
          } catch (reconnectError) {
            // Continue to next attempt
          }
        }
      }
    }
    
    throw lastError!;
  }

  private isRetryableError(error: Error): boolean {
    // Retry on connection errors, timeouts, and temporary server errors
    const retryablePatterns = [
      /connection/i,
      /timeout/i,
      /network/i,
      /temporary/i,
      /503/,
      /502/,
      /504/
    ];
    
    return retryablePatterns.some(pattern => pattern.test(error.message));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private setupProviderEventListeners(): void {
    if (!this.provider) return;

    // Listen for storage events and forward them
    this.provider.onUpload((event) => {
      this.emit('upload', event);
    });

    this.provider.onDownload((event) => {
      this.emit('download', event);
    });

    this.provider.onDelete((event) => {
      this.emit('delete', event);
    });

    this.provider.onError((error) => {
      this.emit('error', error);
    });
  }

  private startHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      try {
        const health = await this.healthCheck();
        
        if (!health.healthy && this.options.enableAutoReconnect) {
          this.attemptReconnect();
        }
        
        this.emit('healthCheck', health);
      } catch (error) {
        this.emit('healthCheckError', error);
      }
    }, this.options.healthCheckInterval);
  }

  private attemptReconnect(): void {
    if (this.reconnectTimer) {
      return; // Already attempting reconnect
    }

    this.reconnectTimer = setInterval(async () => {
      try {
        if (this.provider && !this.provider.isConnected()) {
          await this.provider.connect();
          
          if (this.provider.isConnected()) {
            clearInterval(this.reconnectTimer!);
            this.reconnectTimer = null;
            this.emit('reconnected');
          }
        }
      } catch (error) {
        this.emit('reconnectError', error);
      }
    }, this.options.autoReconnectInterval);
  }

  private async initializeMetrics(): Promise<void> {
    if (!this.provider) return;

    try {
      const stats = await this.provider.getStats();
      
      this.metrics = {
        providerName: this.provider.getProviderName(),
        timestamp: new Date(),
        metrics: {
          totalFiles: stats.totalFiles,
          totalSize: stats.totalSize,
          bandwidth: stats.bandwidth,
          operations: stats.operations,
          performance: {
            avgUploadTime: 0,
            avgDownloadTime: 0,
            errorRate: 0
          }
        }
      };
    } catch (error) {
      console.warn('Failed to initialize metrics:', error);
    }
  }

  private handleError(operation: string, error: any): void {
    const storageError = error instanceof StorageError ? error : 
      new StorageError(`Storage service ${operation} failed`, 'SERVICE_ERROR', 500, error);
    
    this.emit('error', storageError);
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  public static reset(): void {
    if (StorageService.instance) {
      StorageService.instance.removeAllListeners();
      StorageService.instance = null as any;
    }
  }
}

// Default export for easy access
export const storageService = StorageService.getInstance();
