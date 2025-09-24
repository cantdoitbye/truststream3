/**
 * Storage Abstraction Layer Interface
 * Extends the core storage interfaces with provider-specific functionality
 */

import {
  IStorageService,
  IBucketService,
  IStorageEventService,
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
  UploadProgress,
  TransferProgress
} from '../../shared-utils/storage-interface';

// Provider-specific interfaces
export interface IStorageProvider extends IStorageService, IBucketService, IStorageEventService {
  // Provider lifecycle
  initialize(config: StorageConfig): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getProviderName(): string;
  
  // Health and monitoring
  healthCheck(): Promise<ProviderHealthStatus>;
  getStats(): Promise<StorageStats>;
  
  // Advanced file operations
  duplicateFile(fromPath: string, toPath: string): Promise<void>;
  hardLinkFile(fromPath: string, toPath: string): Promise<void>;
  symlinkFile(fromPath: string, toPath: string): Promise<void>;
  
  // Batch operations with progress tracking
  uploadBatch(files: FileUpload[], onProgress?: (progress: BatchProgress) => void): Promise<BatchResult<UploadResult>>;
  downloadBatch(paths: string[], onProgress?: (progress: BatchProgress) => void): Promise<BatchResult<ArrayBuffer>>;
  deleteBatch(paths: string[], onProgress?: (progress: BatchProgress) => void): Promise<BatchResult<void>>;
  
  // Advanced metadata operations
  setBulkMetadata(updates: Array<{ path: string; metadata: Record<string, any> }>): Promise<void>;
  searchByMetadata(query: Record<string, any>, directory?: string): Promise<FileInfo[]>;
  
  // Synchronization
  syncDirectory(localPath: string, remotePath: string, options?: SyncOptions): Promise<SyncResult>;
  syncFile(localPath: string, remotePath: string, options?: SyncOptions): Promise<boolean>;
  
  // Content analysis
  analyzeFile(path: string): Promise<FileAnalysis>;
  generateThumbnail(path: string, options?: ThumbnailOptions): Promise<string>;
  extractMetadata(path: string): Promise<ExtractedMetadata>;
  
  // Security and compliance
  scanFile(path: string, scanType?: 'virus' | 'malware' | 'content'): Promise<ScanResult>;
  applyRetentionPolicy(path: string, policy: RetentionPolicy): Promise<void>;
  
  // Backup and restore
  createBackup(paths: string[], backupName: string): Promise<string>;
  restoreBackup(backupId: string, targetPath: string): Promise<string[]>;
  listBackups(): Promise<BackupInfo[]>;
  deleteBackup(backupId: string): Promise<void>;
}

export interface ProviderHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastChecked: Date;
  responseTime?: number;
  errors?: string[];
  metrics?: {
    uptime: number;
    diskUsage: number;
    bandwidth: number;
    errorRate: number;
    avgResponseTime: number;
  };
}

export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
  percentage: number;
  currentItem?: string;
}

export interface BatchResult<T> {
  successful: Array<{ path: string; result: T }>;
  failed: Array<{ path: string; error: string }>;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  duration: number;
}

export interface SyncOptions {
  deleteExtraFiles?: boolean;
  preserveTimestamps?: boolean;
  dryRun?: boolean;
  excludePatterns?: string[];
  includePatterns?: string[];
  onProgress?: (progress: SyncProgress) => void;
}

export interface SyncProgress {
  phase: 'scanning' | 'comparing' | 'uploading' | 'downloading' | 'deleting';
  current: number;
  total: number;
  currentFile?: string;
}

export interface SyncResult {
  uploaded: string[];
  downloaded: string[];
  deleted: string[];
  skipped: string[];
  conflicts: Array<{ path: string; reason: string }>;
  summary: {
    totalFiles: number;
    bytesTransferred: number;
    duration: number;
  };
}

export interface FileAnalysis {
  path: string;
  mimeType: string;
  encoding?: string;
  language?: string;
  readability?: number;
  wordCount?: number;
  imageProperties?: {
    width: number;
    height: number;
    colorDepth: number;
    hasAlpha: boolean;
    format: string;
  };
  videoProperties?: {
    duration: number;
    width: number;
    height: number;
    framerate: number;
    codec: string;
  };
  audioProperties?: {
    duration: number;
    bitrate: number;
    sampleRate: number;
    channels: number;
    codec: string;
  };
}

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpg' | 'png' | 'webp';
  crop?: boolean;
}

export interface ExtractedMetadata {
  exif?: Record<string, any>;
  iptc?: Record<string, any>;
  xmp?: Record<string, any>;
  fileInfo?: {
    created: Date;
    modified: Date;
    accessed: Date;
    permissions: string;
  };
  customProperties?: Record<string, any>;
}

export interface ScanResult {
  clean: boolean;
  threats: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    location?: string;
  }>;
  scanTime: Date;
  scanDuration: number;
}

export interface RetentionPolicy {
  retainUntil: Date;
  legalHold?: boolean;
  retentionMode?: 'governance' | 'compliance';
  description?: string;
}

export interface BackupInfo {
  id: string;
  name: string;
  createdAt: Date;
  size: number;
  fileCount: number;
  paths: string[];
  metadata?: Record<string, any>;
}

// Storage configuration with provider-specific options
export interface StorageProviderConfig extends StorageConfig {
  connectionPool?: {
    min?: number;
    max?: number;
    acquireTimeoutMillis?: number;
    createTimeoutMillis?: number;
    destroyTimeoutMillis?: number;
    idleTimeoutMillis?: number;
    reapIntervalMillis?: number;
  };
  cache?: {
    enabled: boolean;
    ttl?: number;
    maxSize?: number;
    strategy?: 'memory' | 'redis' | 'filesystem';
  };
  security?: {
    enableEncryption?: boolean;
    enableIntegrityCheck?: boolean;
    enableVirusScanning?: boolean;
    allowedOrigins?: string[];
  };
  performance?: {
    enableCompression?: boolean;
    chunkSize?: number;
    maxConcurrentUploads?: number;
    maxConcurrentDownloads?: number;
  };
  monitoring?: {
    enableMetrics?: boolean;
    enableHealthChecks?: boolean;
    healthCheckInterval?: number;
    enableEventLogging?: boolean;
  };
}

// Event types for the storage abstraction layer
export interface StorageProviderEvent {
  type: 'PROVIDER_CONNECTED' | 'PROVIDER_DISCONNECTED' | 'PROVIDER_ERROR' | 'PROVIDER_HEALTH_CHANGED';
  timestamp: Date;
  providerId: string;
  data?: any;
  error?: Error;
}

export interface StorageMetrics {
  providerName: string;
  timestamp: Date;
  metrics: {
    totalFiles: number;
    totalSize: number;
    bandwidth: {
      uploaded: number;
      downloaded: number;
    };
    operations: {
      uploads: number;
      downloads: number;
      deletes: number;
    };
    performance: {
      avgUploadTime: number;
      avgDownloadTime: number;
      errorRate: number;
    };
    cache?: {
      hitRate: number;
      size: number;
    };
  };
}

// Abstract base class for storage providers
export abstract class BaseStorageProvider implements IStorageProvider {
  protected config: StorageProviderConfig | null = null;
  protected connected = false;
  protected healthStatus: ProviderHealthStatus = {
    status: 'unhealthy',
    lastChecked: new Date()
  };

  abstract getProviderName(): string;
  abstract initialize(config: StorageConfig): Promise<void>;
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;

  public isConnected(): boolean {
    return this.connected;
  }

  public async healthCheck(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();
    
    try {
      await this.performHealthCheck();
      const responseTime = Date.now() - startTime;
      
      this.healthStatus = {
        status: 'healthy',
        lastChecked: new Date(),
        responseTime
      };
    } catch (error) {
      this.healthStatus = {
        status: 'unhealthy',
        lastChecked: new Date(),
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
    
    return this.healthStatus;
  }

  protected abstract performHealthCheck(): Promise<void>;

  // Abstract methods that must be implemented by concrete providers
  abstract upload(path: string, file: File | Buffer, options?: UploadOptions): Promise<UploadResult>;
  abstract download(path: string): Promise<ArrayBuffer>;
  abstract downloadStream(path: string): Promise<ReadableStream>;
  abstract delete(path: string): Promise<void>;
  abstract exists(path: string): Promise<boolean>;
  abstract uploadMultiple(files: FileUpload[]): Promise<UploadResult[]>;
  abstract downloadMultiple(paths: string[]): Promise<ArrayBuffer[]>;
  abstract deleteMultiple(paths: string[]): Promise<void>;
  abstract getMetadata(path: string): Promise<FileMetadata>;
  abstract updateMetadata(path: string, metadata: Record<string, any>): Promise<void>;
  abstract listFiles(directory: string, options?: ListOptions): Promise<FileInfo[]>;
  abstract getPublicUrl(path: string): string;
  abstract getSignedUrl(path: string, options: SignedUrlOptions): Promise<string>;
  abstract moveFile(fromPath: string, toPath: string): Promise<void>;
  abstract copyFile(fromPath: string, toPath: string, options?: TransferOptions): Promise<void>;
  abstract renameFile(oldPath: string, newPath: string): Promise<void>;
  abstract createDirectory(path: string): Promise<void>;
  abstract deleteDirectory(path: string, recursive?: boolean): Promise<void>;
  abstract listDirectories(path: string): Promise<string[]>;
  abstract searchFiles(query: string, options?: SearchOptions): Promise<FileInfo[]>;
  abstract findFilesByType(mimeType: string, directory?: string): Promise<FileInfo[]>;
  abstract findFilesBySize(minSize: number, maxSize?: number, directory?: string): Promise<FileInfo[]>;
  abstract listVersions(path: string): Promise<FileVersion[]>;
  abstract restoreVersion(path: string, versionId: string): Promise<void>;
  abstract deleteVersion(path: string, versionId: string): Promise<void>;
  abstract compressFile(path: string, algorithm?: 'gzip' | 'brotli'): Promise<string>;
  abstract decompressFile(path: string): Promise<string>;
  abstract createArchive(paths: string[], archivePath: string, format?: 'zip' | 'tar'): Promise<void>;
  abstract extractArchive(archivePath: string, extractPath: string): Promise<string[]>;
  abstract createBucket(name: string, options?: BucketOptions): Promise<void>;
  abstract deleteBucket(name: string, force?: boolean): Promise<void>;
  abstract listBuckets(): Promise<BucketInfo[]>;
  abstract getBucket(name: string): Promise<BucketInfo | null>;
  abstract bucketExists(name: string): Promise<boolean>;
  abstract setBucketPolicy(name: string, policy: string): Promise<void>;
  abstract getBucketPolicy(name: string): Promise<string>;
  abstract setBucketCORS(name: string, rules: CORSRule[]): Promise<void>;
  abstract getBucketCORS(name: string): Promise<CORSRule[]>;
  abstract setBucketLifecycle(name: string, rules: LifecycleRule[]): Promise<void>;
  abstract getBucketLifecycle(name: string): Promise<LifecycleRule[]>;
  abstract getBucketUsage(name: string): Promise<BucketUsage>;
  abstract getBucketStats(name: string, period?: string): Promise<BucketStats>;
  abstract onUpload(callback: (event: StorageEvent) => void): () => void;
  abstract onDownload(callback: (event: StorageEvent) => void): () => void;
  abstract onDelete(callback: (event: StorageEvent) => void): () => void;
  abstract onError(callback: (error: import('../../shared-utils/storage-interface').StorageError) => void): () => void;
  abstract broadcastEvent(event: StorageEvent): Promise<void>;
  abstract getStats(): Promise<StorageStats>;
  abstract duplicateFile(fromPath: string, toPath: string): Promise<void>;
  abstract hardLinkFile(fromPath: string, toPath: string): Promise<void>;
  abstract symlinkFile(fromPath: string, toPath: string): Promise<void>;
  abstract uploadBatch(files: FileUpload[], onProgress?: (progress: BatchProgress) => void): Promise<BatchResult<UploadResult>>;
  abstract downloadBatch(paths: string[], onProgress?: (progress: BatchProgress) => void): Promise<BatchResult<ArrayBuffer>>;
  abstract deleteBatch(paths: string[], onProgress?: (progress: BatchProgress) => void): Promise<BatchResult<void>>;
  abstract setBulkMetadata(updates: Array<{ path: string; metadata: Record<string, any> }>): Promise<void>;
  abstract searchByMetadata(query: Record<string, any>, directory?: string): Promise<FileInfo[]>;
  abstract syncDirectory(localPath: string, remotePath: string, options?: SyncOptions): Promise<SyncResult>;
  abstract syncFile(localPath: string, remotePath: string, options?: SyncOptions): Promise<boolean>;
  abstract analyzeFile(path: string): Promise<FileAnalysis>;
  abstract generateThumbnail(path: string, options?: ThumbnailOptions): Promise<string>;
  abstract extractMetadata(path: string): Promise<ExtractedMetadata>;
  abstract scanFile(path: string, scanType?: 'virus' | 'malware' | 'content'): Promise<ScanResult>;
  abstract applyRetentionPolicy(path: string, policy: RetentionPolicy): Promise<void>;
  abstract createBackup(paths: string[], backupName: string): Promise<string>;
  abstract restoreBackup(backupId: string, targetPath: string): Promise<string[]>;
  abstract listBackups(): Promise<BackupInfo[]>;
  abstract deleteBackup(backupId: string): Promise<void>;
}

// Re-export all types from shared-utils for convenience
export * from '../../shared-utils/storage-interface';
