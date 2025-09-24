/**
 * Unified Storage Service
 * Provides unified storage interface across different providers
 */

import { EventEmitter } from 'events';
import {
  IStorageService,
  StorageConfig,
  FileInfo,
  FileMetadata,
  UploadOptions,
  UploadResult,
  FileUpload,
  ListOptions,
  SearchOptions,
  SignedUrlOptions,
  TransferOptions,
  StorageStats
} from '../../../shared-utils/storage-interface';
import { StorageProviderFactory } from '../storage/providers/StorageProviderFactory';
import { IStorageProvider } from '../storage/storage.interface';

export interface UnifiedStorageServiceOptions {
  autoConnect?: boolean;
  enableEvents?: boolean;
  enableCaching?: boolean;
  cacheTimeout?: number;
  enableMetrics?: boolean;
  retryAttempts?: number;
  chunkSize?: number;
}

export class UnifiedStorageService extends EventEmitter implements IStorageService {
  private provider: IStorageProvider | null = null;
  private config: StorageConfig | null = null;
  private options: Required<UnifiedStorageServiceOptions>;
  private isConnectedFlag = false;
  
  // Caching
  private metadataCache = new Map<string, { metadata: FileMetadata; expiry: number }>();
  private urlCache = new Map<string, { url: string; expiry: number }>();
  
  // Metrics
  private metrics = {
    uploadsCount: 0,
    downloadsCount: 0,
    deletesCount: 0,
    totalBytesUploaded: 0,
    totalBytesDownloaded: 0,
    errorsCount: 0
  };

  constructor(options: UnifiedStorageServiceOptions = {}) {
    super();
    
    this.options = {
      autoConnect: options.autoConnect ?? true,
      enableEvents: options.enableEvents ?? true,
      enableCaching: options.enableCaching ?? true,
      cacheTimeout: options.cacheTimeout ?? 300000, // 5 minutes
      enableMetrics: options.enableMetrics ?? true,
      retryAttempts: options.retryAttempts ?? 3,
      chunkSize: options.chunkSize ?? 5 * 1024 * 1024 // 5MB
    };
  }

  /**
   * Connect to storage provider
   */
  async connect(config: StorageConfig): Promise<void> {
    try {
      this.config = config;
      
      // Create provider instance
      this.provider = StorageProviderFactory.create(config) as IStorageProvider;
      
      // Initialize provider
      await this.provider.initialize(config);
      await this.provider.connect();
      
      this.isConnectedFlag = true;
      
      // Setup event forwarding
      if (this.options.enableEvents) {
        this.setupEventForwarding();
      }
      
      this.emit('connected', { provider: config.type });
      
    } catch (error) {
      this.emit('connection:failed', { error });
      throw error;
    }
  }

  /**
   * Disconnect from storage provider
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
      this.metadataCache.clear();
      this.urlCache.clear();
      
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

  /**
   * Get storage stats
   */
  async getStats(): Promise<StorageStats> {
    this.ensureConnected();
    
    const providerStats = await this.provider!.getStats();
    
    return {
      ...providerStats,
      metrics: this.options.enableMetrics ? this.metrics : undefined
    };
  }

  // File Operations
  
  async upload(path: string, file: File | Buffer, options?: UploadOptions): Promise<UploadResult> {
    this.ensureConnected();
    
    try {
      const startTime = Date.now();
      
      // Add retry logic and chunking for large files
      const result = await this.executeWithRetry(async () => {
        if (this.shouldChunkUpload(file, options)) {
          return this.uploadChunked(path, file, options);
        } else {
          return this.provider!.upload(path, file, options);
        }
      });
      
      // Update metrics
      if (this.options.enableMetrics) {
        this.metrics.uploadsCount++;
        this.metrics.totalBytesUploaded += this.getFileSize(file);
      }
      
      // Clear related caches
      this.invalidateFileCache(path);
      
      // Emit event
      if (this.options.enableEvents) {
        this.emit('file:uploaded', {
          path,
          size: this.getFileSize(file),
          duration: Date.now() - startTime,
          result
        });
      }
      
      return result;
      
    } catch (error) {
      if (this.options.enableMetrics) {
        this.metrics.errorsCount++;
      }
      
      if (this.options.enableEvents) {
        this.emit('file:upload:failed', { path, error });
      }
      
      throw error;
    }
  }

  async download(path: string): Promise<ArrayBuffer> {
    this.ensureConnected();
    
    try {
      const startTime = Date.now();
      
      const result = await this.executeWithRetry(() => 
        this.provider!.download(path)
      );
      
      // Update metrics
      if (this.options.enableMetrics) {
        this.metrics.downloadsCount++;
        this.metrics.totalBytesDownloaded += result.byteLength;
      }
      
      // Emit event
      if (this.options.enableEvents) {
        this.emit('file:downloaded', {
          path,
          size: result.byteLength,
          duration: Date.now() - startTime
        });
      }
      
      return result;
      
    } catch (error) {
      if (this.options.enableMetrics) {
        this.metrics.errorsCount++;
      }
      
      if (this.options.enableEvents) {
        this.emit('file:download:failed', { path, error });
      }
      
      throw error;
    }
  }

  async downloadStream(path: string): Promise<ReadableStream> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.downloadStream(path));
  }

  async delete(path: string): Promise<void> {
    this.ensureConnected();
    
    try {
      await this.executeWithRetry(() => this.provider!.delete(path));
      
      // Update metrics
      if (this.options.enableMetrics) {
        this.metrics.deletesCount++;
      }
      
      // Clear caches
      this.invalidateFileCache(path);
      
      // Emit event
      if (this.options.enableEvents) {
        this.emit('file:deleted', { path });
      }
      
    } catch (error) {
      if (this.options.enableMetrics) {
        this.metrics.errorsCount++;
      }
      
      if (this.options.enableEvents) {
        this.emit('file:delete:failed', { path, error });
      }
      
      throw error;
    }
  }

  async exists(path: string): Promise<boolean> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.exists(path));
  }

  // Batch Operations
  
  async uploadMultiple(files: FileUpload[]): Promise<UploadResult[]> {
    this.ensureConnected();
    
    try {
      const results = await this.executeWithRetry(() => 
        this.provider!.uploadMultiple(files)
      );
      
      // Update metrics
      if (this.options.enableMetrics) {
        this.metrics.uploadsCount += files.length;
        this.metrics.totalBytesUploaded += files.reduce((sum, f) => 
          sum + this.getFileSize(f.file), 0
        );
      }
      
      // Clear caches for uploaded files
      files.forEach(f => this.invalidateFileCache(f.path));
      
      // Emit event
      if (this.options.enableEvents) {
        this.emit('files:uploaded', { count: files.length, results });
      }
      
      return results;
      
    } catch (error) {
      if (this.options.enableMetrics) {
        this.metrics.errorsCount++;
      }
      
      if (this.options.enableEvents) {
        this.emit('files:upload:failed', { files, error });
      }
      
      throw error;
    }
  }

  async downloadMultiple(paths: string[]): Promise<ArrayBuffer[]> {
    this.ensureConnected();
    
    try {
      const results = await this.executeWithRetry(() => 
        this.provider!.downloadMultiple(paths)
      );
      
      // Update metrics
      if (this.options.enableMetrics) {
        this.metrics.downloadsCount += paths.length;
        this.metrics.totalBytesDownloaded += results.reduce((sum, r) => 
          sum + r.byteLength, 0
        );
      }
      
      // Emit event
      if (this.options.enableEvents) {
        this.emit('files:downloaded', { count: paths.length, results });
      }
      
      return results;
      
    } catch (error) {
      if (this.options.enableMetrics) {
        this.metrics.errorsCount++;
      }
      
      if (this.options.enableEvents) {
        this.emit('files:download:failed', { paths, error });
      }
      
      throw error;
    }
  }

  async deleteMultiple(paths: string[]): Promise<void> {
    this.ensureConnected();
    
    try {
      await this.executeWithRetry(() => this.provider!.deleteMultiple(paths));
      
      // Update metrics
      if (this.options.enableMetrics) {
        this.metrics.deletesCount += paths.length;
      }
      
      // Clear caches
      paths.forEach(path => this.invalidateFileCache(path));
      
      // Emit event
      if (this.options.enableEvents) {
        this.emit('files:deleted', { count: paths.length, paths });
      }
      
    } catch (error) {
      if (this.options.enableMetrics) {
        this.metrics.errorsCount++;
      }
      
      if (this.options.enableEvents) {
        this.emit('files:delete:failed', { paths, error });
      }
      
      throw error;
    }
  }

  // Metadata Operations
  
  async getMetadata(path: string): Promise<FileMetadata> {
    this.ensureConnected();
    
    // Check cache first
    if (this.options.enableCaching) {
      const cached = this.getCachedMetadata(path);
      if (cached) {
        return cached;
      }
    }
    
    try {
      const metadata = await this.executeWithRetry(() => 
        this.provider!.getMetadata(path)
      );
      
      // Cache the result
      if (this.options.enableCaching) {
        this.cacheMetadata(path, metadata);
      }
      
      return metadata;
      
    } catch (error) {
      if (this.options.enableEvents) {
        this.emit('metadata:get:failed', { path, error });
      }
      throw error;
    }
  }

  async updateMetadata(path: string, metadata: Record<string, any>): Promise<void> {
    this.ensureConnected();
    
    try {
      await this.executeWithRetry(() => 
        this.provider!.updateMetadata(path, metadata)
      );
      
      // Invalidate cache
      this.invalidateMetadataCache(path);
      
      // Emit event
      if (this.options.enableEvents) {
        this.emit('metadata:updated', { path, metadata });
      }
      
    } catch (error) {
      if (this.options.enableEvents) {
        this.emit('metadata:update:failed', { path, error });
      }
      throw error;
    }
  }

  // Directory Operations
  
  async listFiles(directory: string, options?: ListOptions): Promise<FileInfo[]> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.listFiles(directory, options));
  }

  async createDirectory(path: string): Promise<void> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.createDirectory(path));
  }

  async deleteDirectory(path: string, recursive?: boolean): Promise<void> {
    this.ensureConnected();
    
    try {
      await this.executeWithRetry(() => 
        this.provider!.deleteDirectory(path, recursive)
      );
      
      // Clear caches for the directory
      this.invalidateDirectoryCache(path);
      
      // Emit event
      if (this.options.enableEvents) {
        this.emit('directory:deleted', { path, recursive });
      }
      
    } catch (error) {
      if (this.options.enableEvents) {
        this.emit('directory:delete:failed', { path, error });
      }
      throw error;
    }
  }

  async listDirectories(path: string): Promise<string[]> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.listDirectories(path));
  }

  // URL Operations
  
  getPublicUrl(path: string): string {
    this.ensureConnected();
    return this.provider!.getPublicUrl(path);
  }

  async getSignedUrl(path: string, options: SignedUrlOptions): Promise<string> {
    this.ensureConnected();
    
    // Check cache first (for short-lived URLs)
    if (this.options.enableCaching && options.expiresIn && options.expiresIn < 3600) {
      const cached = this.getCachedUrl(path, options);
      if (cached) {
        return cached;
      }
    }
    
    try {
      const url = await this.executeWithRetry(() => 
        this.provider!.getSignedUrl(path, options)
      );
      
      // Cache the result for short-lived URLs
      if (this.options.enableCaching && options.expiresIn && options.expiresIn < 3600) {
        this.cacheUrl(path, options, url);
      }
      
      return url;
      
    } catch (error) {
      if (this.options.enableEvents) {
        this.emit('url:get:failed', { path, error });
      }
      throw error;
    }
  }

  // File Transfer Operations
  
  async moveFile(fromPath: string, toPath: string): Promise<void> {
    this.ensureConnected();
    
    try {
      await this.executeWithRetry(() => 
        this.provider!.moveFile(fromPath, toPath)
      );
      
      // Update caches
      this.invalidateFileCache(fromPath);
      this.invalidateFileCache(toPath);
      
      // Emit event
      if (this.options.enableEvents) {
        this.emit('file:moved', { fromPath, toPath });
      }
      
    } catch (error) {
      if (this.options.enableEvents) {
        this.emit('file:move:failed', { fromPath, toPath, error });
      }
      throw error;
    }
  }

  async copyFile(fromPath: string, toPath: string, options?: TransferOptions): Promise<void> {
    this.ensureConnected();
    
    try {
      await this.executeWithRetry(() => 
        this.provider!.copyFile(fromPath, toPath, options)
      );
      
      // Invalidate destination cache
      this.invalidateFileCache(toPath);
      
      // Emit event
      if (this.options.enableEvents) {
        this.emit('file:copied', { fromPath, toPath });
      }
      
    } catch (error) {
      if (this.options.enableEvents) {
        this.emit('file:copy:failed', { fromPath, toPath, error });
      }
      throw error;
    }
  }

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    this.ensureConnected();
    return this.moveFile(oldPath, newPath);
  }

  // Search Operations
  
  async searchFiles(query: string, options?: SearchOptions): Promise<FileInfo[]> {
    this.ensureConnected();
    return this.executeWithRetry(() => this.provider!.searchFiles(query, options));
  }

  // Utility Methods
  
  private ensureConnected(): void {
    if (!this.isConnected()) {
      throw new Error('Storage service is not connected');
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

  private shouldChunkUpload(file: File | Buffer, options?: UploadOptions): boolean {
    const fileSize = this.getFileSize(file);
    const chunkThreshold = options?.chunkSize || this.options.chunkSize;
    return fileSize > chunkThreshold;
  }

  private async uploadChunked(
    path: string, 
    file: File | Buffer, 
    options?: UploadOptions
  ): Promise<UploadResult> {
    // Implementation for chunked upload
    // This would break the file into chunks and upload them separately
    // For now, fallback to regular upload
    return this.provider!.upload(path, file, options);
  }

  private getFileSize(file: File | Buffer): number {
    if (file instanceof Buffer) {
      return file.length;
    } else {
      return file.size;
    }
  }

  // Caching Methods
  
  private cacheMetadata(path: string, metadata: FileMetadata): void {
    const expiry = Date.now() + this.options.cacheTimeout;
    this.metadataCache.set(path, { metadata, expiry });
  }

  private getCachedMetadata(path: string): FileMetadata | null {
    const cached = this.metadataCache.get(path);
    if (cached && cached.expiry > Date.now()) {
      return cached.metadata;
    }
    
    // Remove expired cache entry
    if (cached) {
      this.metadataCache.delete(path);
    }
    
    return null;
  }

  private cacheUrl(path: string, options: SignedUrlOptions, url: string): void {
    const expiry = Date.now() + (options.expiresIn || 3600) * 1000;
    const key = `${path}-${JSON.stringify(options)}`;
    this.urlCache.set(key, { url, expiry });
  }

  private getCachedUrl(path: string, options: SignedUrlOptions): string | null {
    const key = `${path}-${JSON.stringify(options)}`;
    const cached = this.urlCache.get(key);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.url;
    }
    
    // Remove expired cache entry
    if (cached) {
      this.urlCache.delete(key);
    }
    
    return null;
  }

  private invalidateFileCache(path: string): void {
    this.invalidateMetadataCache(path);
    
    // Remove URL cache entries for this path
    for (const key of this.urlCache.keys()) {
      if (key.startsWith(path)) {
        this.urlCache.delete(key);
      }
    }
  }

  private invalidateMetadataCache(path: string): void {
    this.metadataCache.delete(path);
  }

  private invalidateDirectoryCache(path: string): void {
    // Remove all cache entries for files in this directory
    for (const key of this.metadataCache.keys()) {
      if (key.startsWith(path)) {
        this.metadataCache.delete(key);
      }
    }
    
    for (const key of this.urlCache.keys()) {
      if (key.startsWith(path)) {
        this.urlCache.delete(key);
      }
    }
  }

  private setupEventForwarding(): void {
    if (!this.provider) return;
    
    // Forward provider events if available
    // This would depend on the specific provider implementation
  }
}
