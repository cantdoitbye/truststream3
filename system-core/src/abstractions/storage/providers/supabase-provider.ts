/**
 * Supabase Storage Provider
 * Implements the storage abstraction layer using Supabase Storage
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
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
  UploadFailedError,
  DownloadFailedError,
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

export class SupabaseStorageProvider extends BaseStorageProvider {
  private client: SupabaseClient | null = null;
  private bucketName: string = '';
  private eventListeners: Map<string, Function[]> = new Map();

  public getProviderName(): string {
    return 'supabase';
  }

  public async initialize(config: StorageConfig): Promise<void> {
    if (config.type !== 'supabase' || !config.supabase) {
      throw new Error('Invalid Supabase configuration');
    }

    const { url, key, bucket } = config.supabase;
    
    this.client = createClient(url, key);
    this.bucketName = bucket;
    this.config = config;
  }

  public async connect(): Promise<void> {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      // Test the connection by checking if bucket exists
      const { data, error } = await this.client.storage.getBucket(this.bucketName);
      
      if (error && error.message !== 'Bucket not found') {
        throw new StorageError('Failed to connect to Supabase Storage', 'CONNECTION_FAILED', 500, error);
      }
      
      // If bucket doesn't exist, create it
      if (!data) {
        await this.createBucket(this.bucketName, { public: false });
      }
      
      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw error instanceof StorageError ? error : 
        new StorageError('Failed to connect to Supabase Storage', 'CONNECTION_FAILED', 500, error);
    }
  }

  public async disconnect(): Promise<void> {
    this.connected = false;
    this.client = null;
  }

  protected async performHealthCheck(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }
    
    // Test connection by listing buckets
    const { error } = await this.client.storage.listBuckets();
    if (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  }

  // File Operations
  public async upload(path: string, file: File | Buffer, options?: UploadOptions): Promise<UploadResult> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const normalizedPath = StoragePath.normalize(path);
      const mimeType = options?.contentType || getMimeType(normalizedPath);
      
      // Validate file size if configured
      const maxSize = this.config?.options?.maxFileSize;
      const fileSize = file instanceof File ? file.size : file.length;
      
      if (maxSize && fileSize > maxSize) {
        throw new StorageError(
          `File size ${fileSize} exceeds maximum allowed size ${maxSize}`,
          'FILE_TOO_LARGE',
          413
        );
      }

      // Validate file type if configured
      const allowedTypes = this.config?.options?.allowedTypes;
      if (allowedTypes && allowedTypes.length > 0 && !allowedTypes.includes(mimeType)) {
        throw new StorageError(
          `File type ${mimeType} not allowed`,
          'INVALID_FILE_TYPE',
          415
        );
      }

      const uploadOptions: any = {
        contentType: mimeType,
        cacheControl: options?.cacheControl || this.config?.options?.defaultCacheControl || 'public, max-age=3600',
        upsert: options?.overwrite || false
      };

      if (options?.metadata) {
        uploadOptions.metadata = options.metadata;
      }

      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .upload(normalizedPath, file, uploadOptions);

      if (error) {
        throw new UploadFailedError(normalizedPath, error.message);
      }

      const result: UploadResult = {
        path: normalizedPath,
        url: this.getPublicUrl(normalizedPath),
        size: fileSize,
        etag: data.id || undefined
      };

      // Emit upload event
      await this.broadcastEvent({
        type: 'UPLOAD',
        path: normalizedPath,
        bucket: this.bucketName,
        size: fileSize,
        timestamp: new Date()
      });

      return result;
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new UploadFailedError(path, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  public async download(path: string): Promise<ArrayBuffer> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const normalizedPath = StoragePath.normalize(path);
      
      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .download(normalizedPath);

      if (error) {
        if (error.message.includes('not found')) {
          throw new FileNotFoundError(normalizedPath);
        }
        throw new DownloadFailedError(normalizedPath, error.message);
      }

      // Emit download event
      await this.broadcastEvent({
        type: 'DOWNLOAD',
        path: normalizedPath,
        bucket: this.bucketName,
        size: data.size,
        timestamp: new Date()
      });

      return data.arrayBuffer();
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new DownloadFailedError(path, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  public async downloadStream(path: string): Promise<ReadableStream> {
    // Supabase doesn't support streams directly, so we'll download and create a stream
    const data = await this.download(path);
    return new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(data));
        controller.close();
      }
    });
  }

  public async delete(path: string): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const normalizedPath = StoragePath.normalize(path);
      
      const { error } = await this.client.storage
        .from(this.bucketName)
        .remove([normalizedPath]);

      if (error) {
        throw new StorageError(`Failed to delete file: ${error.message}`, 'DELETE_FAILED', 500, error);
      }

      // Emit delete event
      await this.broadcastEvent({
        type: 'DELETE',
        path: normalizedPath,
        bucket: this.bucketName,
        timestamp: new Date()
      });
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(`Failed to delete ${path}`, 'DELETE_FAILED', 500, error);
    }
  }

  public async exists(path: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const normalizedPath = StoragePath.normalize(path);
      
      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .list(StoragePath.dirname(normalizedPath), {
          search: StoragePath.basename(normalizedPath)
        });

      if (error) {
        return false;
      }

      return data.some(file => file.name === StoragePath.basename(normalizedPath));
    } catch {
      return false;
    }
  }

  // Batch Operations
  public async uploadMultiple(files: FileUpload[]): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    
    for (const fileUpload of files) {
      try {
        const result = await this.upload(fileUpload.path, fileUpload.file, fileUpload.options);
        results.push(result);
      } catch (error) {
        // Continue with other uploads but track the error
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
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const normalizedPaths = paths.map(path => StoragePath.normalize(path));
    
    const { error } = await this.client.storage
      .from(this.bucketName)
      .remove(normalizedPaths);

    if (error) {
      throw new StorageError(`Failed to delete multiple files: ${error.message}`, 'DELETE_FAILED', 500, error);
    }

    // Emit delete events
    for (const path of normalizedPaths) {
      await this.broadcastEvent({
        type: 'DELETE',
        path,
        bucket: this.bucketName,
        timestamp: new Date()
      });
    }
  }

  // File Metadata
  public async getMetadata(path: string): Promise<FileMetadata> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const normalizedPath = StoragePath.normalize(path);
      const dirname = StoragePath.dirname(normalizedPath);
      const basename = StoragePath.basename(normalizedPath);
      
      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .list(dirname, { search: basename });

      if (error) {
        throw new StorageError(`Failed to get metadata: ${error.message}`, 'METADATA_FAILED', 500, error);
      }

      const file = data.find(f => f.name === basename);
      if (!file) {
        throw new FileNotFoundError(normalizedPath);
      }

      return {
        size: file.metadata?.size || 0,
        mimeType: file.metadata?.mimetype || getMimeType(basename),
        lastModified: new Date(file.updated_at || file.created_at),
        etag: file.id,
        customMetadata: file.metadata || {}
      };
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(`Failed to get metadata for ${path}`, 'METADATA_FAILED', 500, error);
    }
  }

  public async updateMetadata(path: string, metadata: Record<string, any>): Promise<void> {
    // Supabase doesn't support updating metadata directly
    // This would need to be implemented through a custom function
    throw new StorageError('Metadata update not supported by Supabase provider', 'NOT_IMPLEMENTED', 501);
  }

  public async listFiles(directory: string, options?: ListOptions): Promise<FileInfo[]> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const normalizedDir = StoragePath.normalize(directory || '');
      
      const listOptions: any = {};
      if (options?.limit) listOptions.limit = options.limit;
      if (options?.offset) listOptions.offset = options.offset;
      if (options?.prefix) listOptions.search = options.prefix;

      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .list(normalizedDir, listOptions);

      if (error) {
        throw new StorageError(`Failed to list files: ${error.message}`, 'LIST_FAILED', 500, error);
      }

      let files: FileInfo[] = data.map(file => ({
        path: StoragePath.join(normalizedDir, file.name),
        name: file.name,
        size: file.metadata?.size || 0,
        mimeType: file.metadata?.mimetype || getMimeType(file.name),
        lastModified: new Date(file.updated_at || file.created_at),
        etag: file.id,
        metadata: file.metadata || {},
        isDirectory: false,
        publicUrl: this.getPublicUrl(StoragePath.join(normalizedDir, file.name))
      }));

      // Apply sorting if specified
      if (options?.sortBy) {
        files.sort((a, b) => {
          let aValue: any, bValue: any;
          
          switch (options.sortBy) {
            case 'name':
              aValue = a.name.toLowerCase();
              bValue = b.name.toLowerCase();
              break;
            case 'size':
              aValue = a.size;
              bValue = b.size;
              break;
            case 'modified':
              aValue = a.lastModified.getTime();
              bValue = b.lastModified.getTime();
              break;
            default:
              return 0;
          }
          
          const order = options.sortOrder === 'desc' ? -1 : 1;
          if (aValue < bValue) return -1 * order;
          if (aValue > bValue) return 1 * order;
          return 0;
        });
      }

      return files;
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(`Failed to list files in ${directory}`, 'LIST_FAILED', 500, error);
    }
  }

  // URL Generation
  public getPublicUrl(path: string): string {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const normalizedPath = StoragePath.normalize(path);
    
    const { data } = this.client.storage
      .from(this.bucketName)
      .getPublicUrl(normalizedPath);

    return data.publicUrl;
  }

  public async getSignedUrl(path: string, options: SignedUrlOptions): Promise<string> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const normalizedPath = StoragePath.normalize(path);
      
      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .createSignedUrl(normalizedPath, options.expiresIn);

      if (error) {
        throw new StorageError(`Failed to create signed URL: ${error.message}`, 'SIGNED_URL_FAILED', 500, error);
      }

      return data.signedUrl;
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(`Failed to create signed URL for ${path}`, 'SIGNED_URL_FAILED', 500, error);
    }
  }

  // File Operations
  public async moveFile(fromPath: string, toPath: string): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const normalizedFromPath = StoragePath.normalize(fromPath);
      const normalizedToPath = StoragePath.normalize(toPath);
      
      const { error } = await this.client.storage
        .from(this.bucketName)
        .move(normalizedFromPath, normalizedToPath);

      if (error) {
        throw new StorageError(`Failed to move file: ${error.message}`, 'MOVE_FAILED', 500, error);
      }

      // Emit move event
      await this.broadcastEvent({
        type: 'MOVE',
        path: normalizedFromPath,
        bucket: this.bucketName,
        timestamp: new Date(),
        metadata: { toPath: normalizedToPath }
      });
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(`Failed to move ${fromPath} to ${toPath}`, 'MOVE_FAILED', 500, error);
    }
  }

  public async copyFile(fromPath: string, toPath: string, options?: TransferOptions): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const normalizedFromPath = StoragePath.normalize(fromPath);
      const normalizedToPath = StoragePath.normalize(toPath);
      
      const { error } = await this.client.storage
        .from(this.bucketName)
        .copy(normalizedFromPath, normalizedToPath);

      if (error) {
        throw new StorageError(`Failed to copy file: ${error.message}`, 'COPY_FAILED', 500, error);
      }

      // Emit copy event
      await this.broadcastEvent({
        type: 'COPY',
        path: normalizedFromPath,
        bucket: this.bucketName,
        timestamp: new Date(),
        metadata: { toPath: normalizedToPath }
      });
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(`Failed to copy ${fromPath} to ${toPath}`, 'COPY_FAILED', 500, error);
    }
  }

  public async renameFile(oldPath: string, newPath: string): Promise<void> {
    await this.moveFile(oldPath, newPath);
  }

  // Directory Operations
  public async createDirectory(path: string): Promise<void> {
    // Supabase doesn't have explicit directory creation
    // Directories are created implicitly when files are uploaded
    const normalizedPath = StoragePath.normalize(path);
    
    // Create a placeholder file to establish the directory
    const placeholderPath = StoragePath.join(normalizedPath, '.keep');
    const placeholderContent = new Uint8Array(0);
    
    await this.upload(placeholderPath, placeholderContent);
  }

  public async deleteDirectory(path: string, recursive?: boolean): Promise<void> {
    if (!recursive) {
      throw new StorageError('Non-recursive directory deletion not supported', 'NOT_IMPLEMENTED', 501);
    }

    const files = await this.listFiles(path);
    const paths = files.map(file => file.path);
    
    if (paths.length > 0) {
      await this.deleteMultiple(paths);
    }
  }

  public async listDirectories(path: string): Promise<string[]> {
    // Supabase doesn't distinguish directories, so we need to infer them from file paths
    const files = await this.listFiles(path);
    const directories = new Set<string>();
    
    for (const file of files) {
      const relativePath = file.path.substring(path.length + 1);
      const parts = relativePath.split('/');
      if (parts.length > 1) {
        directories.add(parts[0]);
      }
    }
    
    return Array.from(directories);
  }

  // Search and Organization
  public async searchFiles(query: string, options?: SearchOptions): Promise<FileInfo[]> {
    // Basic search implementation using listFiles
    const allFiles = await this.listFiles('', { limit: 1000 });
    
    return allFiles.filter(file => {
      let matches = file.name.toLowerCase().includes(query.toLowerCase());
      
      if (options?.mimeType) {
        matches = matches && file.mimeType === options.mimeType;
      }
      
      if (options?.sizeRange) {
        if (options.sizeRange.min !== undefined) {
          matches = matches && file.size >= options.sizeRange.min;
        }
        if (options.sizeRange.max !== undefined) {
          matches = matches && file.size <= options.sizeRange.max;
        }
      }
      
      if (options?.dateRange) {
        if (options.dateRange.from) {
          matches = matches && file.lastModified >= options.dateRange.from;
        }
        if (options.dateRange.to) {
          matches = matches && file.lastModified <= options.dateRange.to;
        }
      }
      
      return matches;
    }).slice(options?.offset || 0, (options?.offset || 0) + (options?.limit || 100));
  }

  public async findFilesByType(mimeType: string, directory?: string): Promise<FileInfo[]> {
    const files = await this.listFiles(directory || '');
    return files.filter(file => file.mimeType === mimeType);
  }

  public async findFilesBySize(minSize: number, maxSize?: number, directory?: string): Promise<FileInfo[]> {
    const files = await this.listFiles(directory || '');
    return files.filter(file => {
      return file.size >= minSize && (maxSize === undefined || file.size <= maxSize);
    });
  }

  // Versioning (placeholder implementations - Supabase doesn't support versioning)
  public async listVersions(path: string): Promise<FileVersion[]> {
    return [];
  }

  public async restoreVersion(path: string, versionId: string): Promise<void> {
    throw new StorageError('Versioning not supported by Supabase provider', 'NOT_IMPLEMENTED', 501);
  }

  public async deleteVersion(path: string, versionId: string): Promise<void> {
    throw new StorageError('Versioning not supported by Supabase provider', 'NOT_IMPLEMENTED', 501);
  }

  // Compression and Archiving (placeholder implementations)
  public async compressFile(path: string, algorithm?: 'gzip' | 'brotli'): Promise<string> {
    throw new StorageError('File compression not implemented', 'NOT_IMPLEMENTED', 501);
  }

  public async decompressFile(path: string): Promise<string> {
    throw new StorageError('File decompression not implemented', 'NOT_IMPLEMENTED', 501);
  }

  public async createArchive(paths: string[], archivePath: string, format?: 'zip' | 'tar'): Promise<void> {
    throw new StorageError('Archive creation not implemented', 'NOT_IMPLEMENTED', 501);
  }

  public async extractArchive(archivePath: string, extractPath: string): Promise<string[]> {
    throw new StorageError('Archive extraction not implemented', 'NOT_IMPLEMENTED', 501);
  }

  // Bucket Management
  public async createBucket(name: string, options?: BucketOptions): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const { error } = await this.client.storage.createBucket(name, {
        public: options?.public || false
      });

      if (error) {
        throw new StorageError(`Failed to create bucket: ${error.message}`, 'BUCKET_CREATE_FAILED', 500, error);
      }
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(`Failed to create bucket ${name}`, 'BUCKET_CREATE_FAILED', 500, error);
    }
  }

  public async deleteBucket(name: string, force?: boolean): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const { error } = await this.client.storage.deleteBucket(name);

      if (error) {
        throw new StorageError(`Failed to delete bucket: ${error.message}`, 'BUCKET_DELETE_FAILED', 500, error);
      }
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(`Failed to delete bucket ${name}`, 'BUCKET_DELETE_FAILED', 500, error);
    }
  }

  public async listBuckets(): Promise<BucketInfo[]> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const { data, error } = await this.client.storage.listBuckets();

      if (error) {
        throw new StorageError(`Failed to list buckets: ${error.message}`, 'BUCKET_LIST_FAILED', 500, error);
      }

      return data.map(bucket => ({
        name: bucket.name,
        createdAt: new Date(bucket.created_at),
        isPublic: bucket.public || false
      }));
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError('Failed to list buckets', 'BUCKET_LIST_FAILED', 500, error);
    }
  }

  public async getBucket(name: string): Promise<BucketInfo | null> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const { data, error } = await this.client.storage.getBucket(name);

      if (error) {
        if (error.message.includes('not found')) {
          return null;
        }
        throw new StorageError(`Failed to get bucket: ${error.message}`, 'BUCKET_GET_FAILED', 500, error);
      }

      return {
        name: data.name,
        createdAt: new Date(data.created_at),
        isPublic: data.public || false
      };
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(`Failed to get bucket ${name}`, 'BUCKET_GET_FAILED', 500, error);
    }
  }

  public async bucketExists(name: string): Promise<boolean> {
    const bucket = await this.getBucket(name);
    return bucket !== null;
  }

  // Bucket Configuration (placeholder implementations - limited Supabase support)
  public async setBucketPolicy(name: string, policy: string): Promise<void> {
    throw new StorageError('Bucket policy management not supported by Supabase provider', 'NOT_IMPLEMENTED', 501);
  }

  public async getBucketPolicy(name: string): Promise<string> {
    throw new StorageError('Bucket policy management not supported by Supabase provider', 'NOT_IMPLEMENTED', 501);
  }

  public async setBucketCORS(name: string, rules: CORSRule[]): Promise<void> {
    throw new StorageError('CORS management not supported by Supabase provider', 'NOT_IMPLEMENTED', 501);
  }

  public async getBucketCORS(name: string): Promise<CORSRule[]> {
    return [];
  }

  public async setBucketLifecycle(name: string, rules: LifecycleRule[]): Promise<void> {
    throw new StorageError('Lifecycle management not supported by Supabase provider', 'NOT_IMPLEMENTED', 501);
  }

  public async getBucketLifecycle(name: string): Promise<LifecycleRule[]> {
    return [];
  }

  public async getBucketUsage(name: string): Promise<BucketUsage> {
    const files = await this.listFiles('');
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    
    return {
      size: totalSize,
      fileCount: files.length,
      lastModified: new Date()
    };
  }

  public async getBucketStats(name: string, period?: string): Promise<BucketStats> {
    return {
      uploads: 0,
      downloads: 0,
      bandwidth: 0,
      requests: 0,
      errors: 0
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
    const buckets = await this.listBuckets();
    const files = await this.listFiles('');
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    
    return {
      totalFiles: files.length,
      totalSize,
      buckets: buckets.length,
      bandwidth: {
        uploaded: 0,
        downloaded: 0
      },
      operations: {
        uploads: 0,
        downloads: 0,
        deletes: 0
      }
    };
  }

  // Extended methods (placeholder implementations)
  public async duplicateFile(fromPath: string, toPath: string): Promise<void> {
    await this.copyFile(fromPath, toPath);
  }

  public async hardLinkFile(fromPath: string, toPath: string): Promise<void> {
    throw new StorageError('Hard links not supported by Supabase provider', 'NOT_IMPLEMENTED', 501);
  }

  public async symlinkFile(fromPath: string, toPath: string): Promise<void> {
    throw new StorageError('Symbolic links not supported by Supabase provider', 'NOT_IMPLEMENTED', 501);
  }

  public async uploadBatch(files: FileUpload[], onProgress?: (progress: BatchProgress) => void): Promise<BatchResult<UploadResult>> {
    const startTime = Date.now();
    const results: BatchResult<UploadResult> = {
      successful: [],
      failed: [],
      totalProcessed: files.length,
      successCount: 0,
      failureCount: 0,
      duration: 0
    };

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
    const startTime = Date.now();
    const results: BatchResult<ArrayBuffer> = {
      successful: [],
      failed: [],
      totalProcessed: paths.length,
      successCount: 0,
      failureCount: 0,
      duration: 0
    };

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
    const startTime = Date.now();
    const results: BatchResult<void> = {
      successful: [],
      failed: [],
      totalProcessed: paths.length,
      successCount: 0,
      failureCount: 0,
      duration: 0
    };

    // Use Supabase's batch delete for efficiency
    try {
      await this.deleteMultiple(paths);
      
      // All successful
      paths.forEach(path => {
        results.successful.push({ path, result: undefined });
        results.successCount++;
      });
    } catch (error) {
      // All failed
      paths.forEach(path => {
        results.failed.push({
          path,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        results.failureCount++;
      });
    }

    results.duration = Date.now() - startTime;
    return results;
  }

  public async setBulkMetadata(updates: Array<{ path: string; metadata: Record<string, any> }>): Promise<void> {
    throw new StorageError('Bulk metadata update not supported by Supabase provider', 'NOT_IMPLEMENTED', 501);
  }

  public async searchByMetadata(query: Record<string, any>, directory?: string): Promise<FileInfo[]> {
    throw new StorageError('Metadata search not supported by Supabase provider', 'NOT_IMPLEMENTED', 501);
  }

  public async syncDirectory(localPath: string, remotePath: string, options?: SyncOptions): Promise<SyncResult> {
    throw new StorageError('Directory sync not implemented', 'NOT_IMPLEMENTED', 501);
  }

  public async syncFile(localPath: string, remotePath: string, options?: SyncOptions): Promise<boolean> {
    throw new StorageError('File sync not implemented', 'NOT_IMPLEMENTED', 501);
  }

  public async analyzeFile(path: string): Promise<FileAnalysis> {
    const metadata = await this.getMetadata(path);
    
    return {
      path,
      mimeType: metadata.mimeType,
      encoding: undefined,
      language: undefined,
      readability: undefined,
      wordCount: undefined
    };
  }

  public async generateThumbnail(path: string, options?: ThumbnailOptions): Promise<string> {
    throw new StorageError('Thumbnail generation not implemented', 'NOT_IMPLEMENTED', 501);
  }

  public async extractMetadata(path: string): Promise<ExtractedMetadata> {
    const metadata = await this.getMetadata(path);
    
    return {
      customProperties: metadata.customMetadata
    };
  }

  public async scanFile(path: string, scanType?: 'virus' | 'malware' | 'content'): Promise<ScanResult> {
    return {
      clean: true,
      threats: [],
      scanTime: new Date(),
      scanDuration: 0
    };
  }

  public async applyRetentionPolicy(path: string, policy: RetentionPolicy): Promise<void> {
    throw new StorageError('Retention policies not supported by Supabase provider', 'NOT_IMPLEMENTED', 501);
  }

  public async createBackup(paths: string[], backupName: string): Promise<string> {
    throw new StorageError('Backup creation not implemented', 'NOT_IMPLEMENTED', 501);
  }

  public async restoreBackup(backupId: string, targetPath: string): Promise<string[]> {
    throw new StorageError('Backup restore not implemented', 'NOT_IMPLEMENTED', 501);
  }

  public async listBackups(): Promise<BackupInfo[]> {
    return [];
  }

  public async deleteBackup(backupId: string): Promise<void> {
    throw new StorageError('Backup deletion not implemented', 'NOT_IMPLEMENTED', 501);
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
