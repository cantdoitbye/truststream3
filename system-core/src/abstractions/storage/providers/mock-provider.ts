/**
 * Mock Storage Provider
 * Implements the storage abstraction layer for testing and development
 */

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
  StorageError,
  FileNotFoundError,
  BucketNotFoundError,
  getMimeType,
  StoragePath
} from '../../../shared-utils/storage-interface';
import {
  BaseStorageProvider,
  ProviderHealthStatus,
  BatchProgress,
  BatchResult,
  SyncOptions,
  SyncResult,
  FileAnalysis,
  ThumbnailOptions,
  ExtractedMetadata,
  ScanResult,
  RetentionPolicy,
  BackupInfo
} from '../storage.interface';

interface MockFile {
  path: string;
  name: string;
  data: ArrayBuffer;
  metadata: FileMetadata;
  versions: Array<{ id: string; data: ArrayBuffer; timestamp: Date }>;
  retention?: RetentionPolicy;
}

interface MockBucket {
  name: string;
  createdAt: Date;
  isPublic: boolean;
  files: Map<string, MockFile>;
  options: BucketOptions;
  policy?: string;
  corsRules: CORSRule[];
  lifecycleRules: LifecycleRule[];
}

export class MockStorageProvider extends BaseStorageProvider {
  private buckets: Map<string, MockBucket> = new Map();
  private currentBucket: string = 'default';
  private eventListeners: Map<string, Function[]> = new Map();
  private stats: StorageStats = {
    totalFiles: 0,
    totalSize: 0,
    buckets: 0,
    bandwidth: { uploaded: 0, downloaded: 0 },
    operations: { uploads: 0, downloads: 0, deletes: 0 }
  };
  private backups: Map<string, BackupInfo> = new Map();

  public getProviderName(): string {
    return 'mock';
  }

  public async initialize(config: StorageConfig): Promise<void> {
    this.config = config;
    this.setupDefaultBucket();
  }

  public async connect(): Promise<void> {
    this.connected = true;
  }

  public async disconnect(): Promise<void> {
    this.connected = false;
  }

  protected async performHealthCheck(): Promise<void> {
    if (!this.connected) {
      throw new Error('Mock provider not connected');
    }
  }

  // File Operations
  public async upload(path: string, file: File | Buffer, options?: UploadOptions): Promise<UploadResult> {
    const normalizedPath = StoragePath.normalize(path);
    const bucket = this.getCurrentBucket();
    
    // Validate file size
    const fileSize = file instanceof File ? file.size : file.length;
    const maxSize = this.config?.options?.maxFileSize;
    if (maxSize && fileSize > maxSize) {
      throw new StorageError(`File size exceeds maximum: ${fileSize} > ${maxSize}`, 'FILE_TOO_LARGE', 413);
    }

    // Convert to ArrayBuffer
    let data: ArrayBuffer;
    if (file instanceof File) {
      data = await file.arrayBuffer();
    } else {
      data = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
    }

    const mimeType = options?.contentType || getMimeType(normalizedPath);
    const now = new Date();
    
    const mockFile: MockFile = {
      path: normalizedPath,
      name: StoragePath.basename(normalizedPath),
      data,
      metadata: {
        size: fileSize,
        mimeType,
        lastModified: now,
        etag: this.generateETag(),
        cacheControl: options?.cacheControl,
        customMetadata: options?.metadata || {}
      },
      versions: [{ id: this.generateId(), data, timestamp: now }]
    };

    bucket.files.set(normalizedPath, mockFile);
    
    // Update stats
    this.stats.totalFiles++;
    this.stats.totalSize += fileSize;
    this.stats.operations.uploads++;
    this.stats.bandwidth.uploaded += fileSize;

    // Emit event
    await this.broadcastEvent({
      type: 'UPLOAD',
      path: normalizedPath,
      bucket: this.currentBucket,
      size: fileSize,
      timestamp: now
    });

    return {
      path: normalizedPath,
      url: this.getPublicUrl(normalizedPath),
      size: fileSize,
      etag: mockFile.metadata.etag
    };
  }

  public async download(path: string): Promise<ArrayBuffer> {
    const normalizedPath = StoragePath.normalize(path);
    const bucket = this.getCurrentBucket();
    const file = bucket.files.get(normalizedPath);
    
    if (!file) {
      throw new FileNotFoundError(normalizedPath);
    }

    // Update stats
    this.stats.operations.downloads++;
    this.stats.bandwidth.downloaded += file.metadata.size;

    // Emit event
    await this.broadcastEvent({
      type: 'DOWNLOAD',
      path: normalizedPath,
      bucket: this.currentBucket,
      size: file.metadata.size,
      timestamp: new Date()
    });

    return file.data.slice(0);
  }

  public async downloadStream(path: string): Promise<ReadableStream> {
    const data = await this.download(path);
    return new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(data));
        controller.close();
      }
    });
  }

  public async delete(path: string): Promise<void> {
    const normalizedPath = StoragePath.normalize(path);
    const bucket = this.getCurrentBucket();
    const file = bucket.files.get(normalizedPath);
    
    if (!file) {
      throw new FileNotFoundError(normalizedPath);
    }

    bucket.files.delete(normalizedPath);
    
    // Update stats
    this.stats.totalFiles--;
    this.stats.totalSize -= file.metadata.size;
    this.stats.operations.deletes++;

    // Emit event
    await this.broadcastEvent({
      type: 'DELETE',
      path: normalizedPath,
      bucket: this.currentBucket,
      timestamp: new Date()
    });
  }

  public async exists(path: string): Promise<boolean> {
    const normalizedPath = StoragePath.normalize(path);
    const bucket = this.getCurrentBucket();
    return bucket.files.has(normalizedPath);
  }

  // Batch Operations
  public async uploadMultiple(files: FileUpload[]): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    for (const fileUpload of files) {
      try {
        const result = await this.upload(fileUpload.path, fileUpload.file, fileUpload.options);
        results.push(result);
      } catch (error) {
        console.error(`Failed to upload ${fileUpload.path}:`, error);
      }
    }
    return results;
  }

  public async downloadMultiple(paths: string[]): Promise<ArrayBuffer[]> {
    const results: ArrayBuffer[] = [];
    for (const path of paths) {
      try {
        const data = await this.download(path);
        results.push(data);
      } catch (error) {
        console.error(`Failed to download ${path}:`, error);
      }
    }
    return results;
  }

  public async deleteMultiple(paths: string[]): Promise<void> {
    for (const path of paths) {
      try {
        await this.delete(path);
      } catch (error) {
        console.error(`Failed to delete ${path}:`, error);
      }
    }
  }

  // Metadata Operations
  public async getMetadata(path: string): Promise<FileMetadata> {
    const normalizedPath = StoragePath.normalize(path);
    const bucket = this.getCurrentBucket();
    const file = bucket.files.get(normalizedPath);
    
    if (!file) {
      throw new FileNotFoundError(normalizedPath);
    }

    return { ...file.metadata };
  }

  public async updateMetadata(path: string, metadata: Record<string, any>): Promise<void> {
    const normalizedPath = StoragePath.normalize(path);
    const bucket = this.getCurrentBucket();
    const file = bucket.files.get(normalizedPath);
    
    if (!file) {
      throw new FileNotFoundError(normalizedPath);
    }

    file.metadata.customMetadata = { ...file.metadata.customMetadata, ...metadata };
    file.metadata.lastModified = new Date();
  }

  public async listFiles(directory: string, options?: ListOptions): Promise<FileInfo[]> {
    const normalizedDir = StoragePath.normalize(directory || '');
    const bucket = this.getCurrentBucket();
    
    let files = Array.from(bucket.files.values())
      .filter(file => {
        if (normalizedDir && !file.path.startsWith(normalizedDir)) {
          return false;
        }
        if (options?.prefix && !file.name.startsWith(options.prefix)) {
          return false;
        }
        return true;
      })
      .map(file => ({
        path: file.path,
        name: file.name,
        size: file.metadata.size,
        mimeType: file.metadata.mimeType,
        lastModified: file.metadata.lastModified,
        etag: file.metadata.etag,
        metadata: file.metadata.customMetadata,
        isDirectory: false,
        publicUrl: this.getPublicUrl(file.path)
      }));

    // Apply sorting
    if (options?.sortBy) {
      files.sort((a, b) => {
        let comparison = 0;
        switch (options.sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'size':
            comparison = a.size - b.size;
            break;
          case 'modified':
            comparison = a.lastModified.getTime() - b.lastModified.getTime();
            break;
        }
        return options.sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    // Apply pagination
    const start = options?.offset || 0;
    const end = start + (options?.limit || files.length);
    
    return files.slice(start, end);
  }

  // URL Generation
  public getPublicUrl(path: string): string {
    const normalizedPath = StoragePath.normalize(path);
    return `https://mock-storage.example.com/${this.currentBucket}/${normalizedPath}`;
  }

  public async getSignedUrl(path: string, options: SignedUrlOptions): Promise<string> {
    const normalizedPath = StoragePath.normalize(path);
    const expires = new Date(Date.now() + options.expiresIn * 1000);
    return `${this.getPublicUrl(normalizedPath)}?signature=mock-signature&expires=${expires.getTime()}`;
  }

  // File Operations
  public async moveFile(fromPath: string, toPath: string): Promise<void> {
    await this.copyFile(fromPath, toPath);
    await this.delete(fromPath);
  }

  public async copyFile(fromPath: string, toPath: string, options?: TransferOptions): Promise<void> {
    const normalizedFromPath = StoragePath.normalize(fromPath);
    const normalizedToPath = StoragePath.normalize(toPath);
    const bucket = this.getCurrentBucket();
    const sourceFile = bucket.files.get(normalizedFromPath);
    
    if (!sourceFile) {
      throw new FileNotFoundError(normalizedFromPath);
    }

    const copyFile: MockFile = {
      path: normalizedToPath,
      name: StoragePath.basename(normalizedToPath),
      data: sourceFile.data.slice(0),
      metadata: { ...sourceFile.metadata, lastModified: new Date() },
      versions: sourceFile.versions.map(v => ({ ...v, data: v.data.slice(0) }))
    };

    bucket.files.set(normalizedToPath, copyFile);
    this.stats.totalFiles++;
    this.stats.totalSize += sourceFile.metadata.size;
  }

  public async renameFile(oldPath: string, newPath: string): Promise<void> {
    await this.moveFile(oldPath, newPath);
  }

  // Directory Operations
  public async createDirectory(path: string): Promise<void> {
    // Mock implementation - directories are created implicitly
  }

  public async deleteDirectory(path: string, recursive?: boolean): Promise<void> {
    const normalizedPath = StoragePath.normalize(path);
    const bucket = this.getCurrentBucket();
    
    const filesToDelete = Array.from(bucket.files.keys())
      .filter(filePath => filePath.startsWith(normalizedPath + '/'));
    
    for (const filePath of filesToDelete) {
      await this.delete(filePath);
    }
  }

  public async listDirectories(path: string): Promise<string[]> {
    const normalizedPath = StoragePath.normalize(path);
    const bucket = this.getCurrentBucket();
    const directories = new Set<string>();
    
    for (const filePath of bucket.files.keys()) {
      if (filePath.startsWith(normalizedPath)) {
        const relativePath = filePath.substring(normalizedPath.length + 1);
        const parts = relativePath.split('/');
        if (parts.length > 1) {
          directories.add(parts[0]);
        }
      }
    }
    
    return Array.from(directories);
  }

  // Search Operations
  public async searchFiles(query: string, options?: SearchOptions): Promise<FileInfo[]> {
    const allFiles = await this.listFiles('');
    return allFiles.filter(file => {
      if (!file.name.toLowerCase().includes(query.toLowerCase())) {
        return false;
      }
      
      if (options?.mimeType && file.mimeType !== options.mimeType) {
        return false;
      }
      
      if (options?.sizeRange) {
        if (options.sizeRange.min && file.size < options.sizeRange.min) return false;
        if (options.sizeRange.max && file.size > options.sizeRange.max) return false;
      }
      
      if (options?.dateRange) {
        if (options.dateRange.from && file.lastModified < options.dateRange.from) return false;
        if (options.dateRange.to && file.lastModified > options.dateRange.to) return false;
      }
      
      return true;
    }).slice(options?.offset || 0, (options?.offset || 0) + (options?.limit || 100));
  }

  public async findFilesByType(mimeType: string, directory?: string): Promise<FileInfo[]> {
    const files = await this.listFiles(directory || '');
    return files.filter(file => file.mimeType === mimeType);
  }

  public async findFilesBySize(minSize: number, maxSize?: number, directory?: string): Promise<FileInfo[]> {
    const files = await this.listFiles(directory || '');
    return files.filter(file => 
      file.size >= minSize && (maxSize === undefined || file.size <= maxSize)
    );
  }

  // Versioning
  public async listVersions(path: string): Promise<FileVersion[]> {
    const normalizedPath = StoragePath.normalize(path);
    const bucket = this.getCurrentBucket();
    const file = bucket.files.get(normalizedPath);
    
    if (!file) {
      throw new FileNotFoundError(normalizedPath);
    }

    return file.versions.map((version, index) => ({
      versionId: version.id,
      lastModified: version.timestamp,
      size: version.data.byteLength,
      etag: this.generateETag(),
      isLatest: index === file.versions.length - 1
    }));
  }

  public async restoreVersion(path: string, versionId: string): Promise<void> {
    const normalizedPath = StoragePath.normalize(path);
    const bucket = this.getCurrentBucket();
    const file = bucket.files.get(normalizedPath);
    
    if (!file) {
      throw new FileNotFoundError(normalizedPath);
    }

    const version = file.versions.find(v => v.id === versionId);
    if (!version) {
      throw new StorageError('Version not found', 'VERSION_NOT_FOUND', 404);
    }

    file.data = version.data.slice(0);
    file.metadata.lastModified = new Date();
    file.metadata.size = version.data.byteLength;
  }

  public async deleteVersion(path: string, versionId: string): Promise<void> {
    const normalizedPath = StoragePath.normalize(path);
    const bucket = this.getCurrentBucket();
    const file = bucket.files.get(normalizedPath);
    
    if (!file) {
      throw new FileNotFoundError(normalizedPath);
    }

    const versionIndex = file.versions.findIndex(v => v.id === versionId);
    if (versionIndex === -1) {
      throw new StorageError('Version not found', 'VERSION_NOT_FOUND', 404);
    }

    file.versions.splice(versionIndex, 1);
  }

  // Compression and Archiving (placeholder implementations)
  public async compressFile(path: string, algorithm?: 'gzip' | 'brotli'): Promise<string> {
    const compressedPath = `${path}.${algorithm || 'gz'}`;
    await this.copyFile(path, compressedPath);
    return compressedPath;
  }

  public async decompressFile(path: string): Promise<string> {
    const decompressedPath = path.replace(/\.(gz|brotli)$/, '');
    await this.copyFile(path, decompressedPath);
    return decompressedPath;
  }

  public async createArchive(paths: string[], archivePath: string, format?: 'zip' | 'tar'): Promise<void> {
    // Mock implementation - create empty archive file
    const archiveData = new ArrayBuffer(1024); // Mock archive data
    await this.upload(archivePath, Buffer.from(archiveData), {
      contentType: format === 'zip' ? 'application/zip' : 'application/x-tar'
    });
  }

  public async extractArchive(archivePath: string, extractPath: string): Promise<string[]> {
    // Mock implementation - return mock extracted files
    return [`${extractPath}/file1.txt`, `${extractPath}/file2.txt`];
  }

  // Bucket Management
  public async createBucket(name: string, options?: BucketOptions): Promise<void> {
    if (this.buckets.has(name)) {
      throw new StorageError('Bucket already exists', 'BUCKET_EXISTS', 409);
    }

    const bucket: MockBucket = {
      name,
      createdAt: new Date(),
      isPublic: options?.public || false,
      files: new Map(),
      options: options || {},
      corsRules: options?.corsRules || [],
      lifecycleRules: options?.lifecycle || []
    };

    this.buckets.set(name, bucket);
    this.stats.buckets++;
  }

  public async deleteBucket(name: string, force?: boolean): Promise<void> {
    const bucket = this.buckets.get(name);
    if (!bucket) {
      throw new BucketNotFoundError(name);
    }

    if (bucket.files.size > 0 && !force) {
      throw new StorageError('Bucket not empty', 'BUCKET_NOT_EMPTY', 409);
    }

    // Delete all files if force is true
    if (force) {
      for (const file of bucket.files.values()) {
        this.stats.totalFiles--;
        this.stats.totalSize -= file.metadata.size;
      }
    }

    this.buckets.delete(name);
    this.stats.buckets--;
  }

  public async listBuckets(): Promise<BucketInfo[]> {
    return Array.from(this.buckets.values()).map(bucket => ({
      name: bucket.name,
      createdAt: bucket.createdAt,
      isPublic: bucket.isPublic,
      size: Array.from(bucket.files.values()).reduce((sum, file) => sum + file.metadata.size, 0),
      fileCount: bucket.files.size
    }));
  }

  public async getBucket(name: string): Promise<BucketInfo | null> {
    const bucket = this.buckets.get(name);
    if (!bucket) {
      return null;
    }

    return {
      name: bucket.name,
      createdAt: bucket.createdAt,
      isPublic: bucket.isPublic,
      size: Array.from(bucket.files.values()).reduce((sum, file) => sum + file.metadata.size, 0),
      fileCount: bucket.files.size
    };
  }

  public async bucketExists(name: string): Promise<boolean> {
    return this.buckets.has(name);
  }

  // Bucket Configuration
  public async setBucketPolicy(name: string, policy: string): Promise<void> {
    const bucket = this.buckets.get(name);
    if (!bucket) {
      throw new BucketNotFoundError(name);
    }
    bucket.policy = policy;
  }

  public async getBucketPolicy(name: string): Promise<string> {
    const bucket = this.buckets.get(name);
    if (!bucket) {
      throw new BucketNotFoundError(name);
    }
    return bucket.policy || '';
  }

  public async setBucketCORS(name: string, rules: CORSRule[]): Promise<void> {
    const bucket = this.buckets.get(name);
    if (!bucket) {
      throw new BucketNotFoundError(name);
    }
    bucket.corsRules = rules;
  }

  public async getBucketCORS(name: string): Promise<CORSRule[]> {
    const bucket = this.buckets.get(name);
    if (!bucket) {
      throw new BucketNotFoundError(name);
    }
    return bucket.corsRules;
  }

  public async setBucketLifecycle(name: string, rules: LifecycleRule[]): Promise<void> {
    const bucket = this.buckets.get(name);
    if (!bucket) {
      throw new BucketNotFoundError(name);
    }
    bucket.lifecycleRules = rules;
  }

  public async getBucketLifecycle(name: string): Promise<LifecycleRule[]> {
    const bucket = this.buckets.get(name);
    if (!bucket) {
      throw new BucketNotFoundError(name);
    }
    return bucket.lifecycleRules;
  }

  public async getBucketUsage(name: string): Promise<BucketUsage> {
    const bucket = this.buckets.get(name);
    if (!bucket) {
      throw new BucketNotFoundError(name);
    }

    const size = Array.from(bucket.files.values()).reduce((sum, file) => sum + file.metadata.size, 0);
    const fileCount = bucket.files.size;
    const lastModified = Array.from(bucket.files.values())
      .reduce((latest, file) => file.metadata.lastModified > latest ? file.metadata.lastModified : latest, new Date(0));

    return { size, fileCount, lastModified };
  }

  public async getBucketStats(name: string, period?: string): Promise<BucketStats> {
    return {
      uploads: Math.floor(Math.random() * 100),
      downloads: Math.floor(Math.random() * 200),
      bandwidth: Math.floor(Math.random() * 1024 * 1024),
      requests: Math.floor(Math.random() * 500),
      errors: Math.floor(Math.random() * 5)
    };
  }

  // Event methods
  public onUpload(callback: (event: StorageEvent) => void): () => void {
    return this.addEventListener('upload', callback);
  }

  public onDownload(callback: (event: StorageEvent) => void): () => void {
    return this.addEventListener('download', callback);
  }

  public onDelete(callback: (event: StorageEvent) => void): () => void {
    return this.addEventListener('delete', callback);
  }

  public onError(callback: (error: StorageError) => void): () => void {
    return this.addEventListener('error', callback);
  }

  public async broadcastEvent(event: StorageEvent): Promise<void> {
    const listeners = this.eventListeners.get(event.type.toLowerCase()) || [];
    listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in storage event listener:', error);
      }
    });
  }

  public async getStats(): Promise<StorageStats> {
    return { ...this.stats };
  }

  // Extended methods (simplified implementations)
  public async duplicateFile(fromPath: string, toPath: string): Promise<void> {
    await this.copyFile(fromPath, toPath);
  }

  public async hardLinkFile(fromPath: string, toPath: string): Promise<void> {
    await this.copyFile(fromPath, toPath);
  }

  public async symlinkFile(fromPath: string, toPath: string): Promise<void> {
    await this.copyFile(fromPath, toPath);
  }

  public async uploadBatch(files: FileUpload[], onProgress?: (progress: BatchProgress) => void): Promise<BatchResult<UploadResult>> {
    const results: BatchResult<UploadResult> = {
      successful: [],
      failed: [],
      totalProcessed: files.length,
      successCount: 0,
      failureCount: 0,
      duration: 0
    };

    const startTime = Date.now();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (onProgress) {
        onProgress({
          total: files.length,
          completed: i,
          failed: results.failureCount,
          inProgress: 1,
          percentage: (i / files.length) * 100,
          currentItem: file.path
        });
      }

      try {
        const result = await this.upload(file.path, file.file, file.options);
        results.successful.push({ path: file.path, result });
        results.successCount++;
      } catch (error) {
        results.failed.push({
          path: file.path,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        results.failureCount++;
      }
    }

    results.duration = Date.now() - startTime;
    return results;
  }

  public async downloadBatch(paths: string[], onProgress?: (progress: BatchProgress) => void): Promise<BatchResult<ArrayBuffer>> {
    const results: BatchResult<ArrayBuffer> = {
      successful: [],
      failed: [],
      totalProcessed: paths.length,
      successCount: 0,
      failureCount: 0,
      duration: 0
    };

    const startTime = Date.now();

    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      
      if (onProgress) {
        onProgress({
          total: paths.length,
          completed: i,
          failed: results.failureCount,
          inProgress: 1,
          percentage: (i / paths.length) * 100,
          currentItem: path
        });
      }

      try {
        const result = await this.download(path);
        results.successful.push({ path, result });
        results.successCount++;
      } catch (error) {
        results.failed.push({
          path,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        results.failureCount++;
      }
    }

    results.duration = Date.now() - startTime;
    return results;
  }

  public async deleteBatch(paths: string[], onProgress?: (progress: BatchProgress) => void): Promise<BatchResult<void>> {
    const results: BatchResult<void> = {
      successful: [],
      failed: [],
      totalProcessed: paths.length,
      successCount: 0,
      failureCount: 0,
      duration: 0
    };

    const startTime = Date.now();

    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      
      if (onProgress) {
        onProgress({
          total: paths.length,
          completed: i,
          failed: results.failureCount,
          inProgress: 1,
          percentage: (i / paths.length) * 100,
          currentItem: path
        });
      }

      try {
        await this.delete(path);
        results.successful.push({ path, result: undefined });
        results.successCount++;
      } catch (error) {
        results.failed.push({
          path,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        results.failureCount++;
      }
    }

    results.duration = Date.now() - startTime;
    return results;
  }

  public async setBulkMetadata(updates: Array<{ path: string; metadata: Record<string, any> }>): Promise<void> {
    for (const update of updates) {
      try {
        await this.updateMetadata(update.path, update.metadata);
      } catch (error) {
        console.error(`Failed to update metadata for ${update.path}:`, error);
      }
    }
  }

  public async searchByMetadata(query: Record<string, any>, directory?: string): Promise<FileInfo[]> {
    const files = await this.listFiles(directory || '');
    return files.filter(file => {
      if (!file.metadata) return false;
      
      return Object.entries(query).every(([key, value]) => {
        return file.metadata![key] === value;
      });
    });
  }

  public async syncDirectory(localPath: string, remotePath: string, options?: SyncOptions): Promise<SyncResult> {
    return {
      uploaded: [],
      downloaded: [],
      deleted: [],
      skipped: [],
      conflicts: [],
      summary: {
        totalFiles: 0,
        bytesTransferred: 0,
        duration: 0
      }
    };
  }

  public async syncFile(localPath: string, remotePath: string, options?: SyncOptions): Promise<boolean> {
    return true;
  }

  public async analyzeFile(path: string): Promise<FileAnalysis> {
    const metadata = await this.getMetadata(path);
    return {
      path,
      mimeType: metadata.mimeType
    };
  }

  public async generateThumbnail(path: string, options?: ThumbnailOptions): Promise<string> {
    return `${path}_thumbnail_${options?.width || 200}x${options?.height || 200}.jpg`;
  }

  public async extractMetadata(path: string): Promise<ExtractedMetadata> {
    const metadata = await this.getMetadata(path);
    return {
      customProperties: metadata.customMetadata || {}
    };
  }

  public async scanFile(path: string, scanType?: 'virus' | 'malware' | 'content'): Promise<ScanResult> {
    return {
      clean: true,
      threats: [],
      scanTime: new Date(),
      scanDuration: 100
    };
  }

  public async applyRetentionPolicy(path: string, policy: RetentionPolicy): Promise<void> {
    const normalizedPath = StoragePath.normalize(path);
    const bucket = this.getCurrentBucket();
    const file = bucket.files.get(normalizedPath);
    
    if (!file) {
      throw new FileNotFoundError(normalizedPath);
    }

    file.retention = policy;
  }

  public async createBackup(paths: string[], backupName: string): Promise<string> {
    const backupId = this.generateId();
    const backup: BackupInfo = {
      id: backupId,
      name: backupName,
      createdAt: new Date(),
      size: 0,
      fileCount: paths.length,
      paths: [...paths]
    };

    // Calculate total size
    for (const path of paths) {
      try {
        const metadata = await this.getMetadata(path);
        backup.size += metadata.size;
      } catch {
        // Ignore missing files
      }
    }

    this.backups.set(backupId, backup);
    return backupId;
  }

  public async restoreBackup(backupId: string, targetPath: string): Promise<string[]> {
    const backup = this.backups.get(backupId);
    if (!backup) {
      throw new StorageError('Backup not found', 'BACKUP_NOT_FOUND', 404);
    }

    return backup.paths.map(path => StoragePath.join(targetPath, StoragePath.basename(path)));
  }

  public async listBackups(): Promise<BackupInfo[]> {
    return Array.from(this.backups.values());
  }

  public async deleteBackup(backupId: string): Promise<void> {
    if (!this.backups.has(backupId)) {
      throw new StorageError('Backup not found', 'BACKUP_NOT_FOUND', 404);
    }
    this.backups.delete(backupId);
  }

  // Utility methods
  private setupDefaultBucket(): void {
    const defaultBucket: MockBucket = {
      name: 'default',
      createdAt: new Date(),
      isPublic: false,
      files: new Map(),
      options: {},
      corsRules: [],
      lifecycleRules: []
    };

    this.buckets.set('default', defaultBucket);
    this.stats.buckets = 1;
  }

  private getCurrentBucket(): MockBucket {
    const bucket = this.buckets.get(this.currentBucket);
    if (!bucket) {
      throw new BucketNotFoundError(this.currentBucket);
    }
    return bucket;
  }

  private generateId(): string {
    return `mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateETag(): string {
    return `"${Math.random().toString(36).substring(2, 15)}"`;
  }

  private addEventListener(eventType: string, callback: Function): () => void {
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.push(callback);
    this.eventListeners.set(eventType, listeners);

    return () => {
      const currentListeners = this.eventListeners.get(eventType) || [];
      const index = currentListeners.indexOf(callback);
      if (index > -1) {
        currentListeners.splice(index, 1);
      }
    };
  }
}
