/**
 * Storage Interface - Core storage abstraction layer
 * Provides unified interface for different storage implementations
 */

// Core Types and Interfaces
export interface FileInfo {
  path: string;
  name: string;
  size: number;
  mimeType: string;
  lastModified: Date;
  etag?: string;
  metadata?: Record<string, any>;
  isDirectory: boolean;
  publicUrl?: string;
}

export interface FileMetadata {
  size: number;
  mimeType: string;
  lastModified: Date;
  etag?: string;
  cacheControl?: string;
  contentEncoding?: string;
  customMetadata?: Record<string, any>;
}

export interface UploadOptions {
  contentType?: string;
  cacheControl?: string;
  contentEncoding?: string;
  metadata?: Record<string, any>;
  acl?: 'private' | 'public-read' | 'public-read-write';
  overwrite?: boolean;
  onProgress?: (progress: UploadProgress) => void;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  path: string;
  url: string;
  size: number;
  etag?: string;
  versionId?: string;
}

export interface FileUpload {
  path: string;
  file: File | Buffer;
  options?: UploadOptions;
}

export interface ListOptions {
  limit?: number;
  offset?: number;
  prefix?: string;
  delimiter?: string;
  recursive?: boolean;
  sortBy?: 'name' | 'size' | 'modified';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchOptions {
  mimeType?: string;
  sizeRange?: { min?: number; max?: number };
  dateRange?: { from?: Date; to?: Date };
  limit?: number;
  offset?: number;
}

export interface BucketInfo {
  name: string;
  createdAt: Date;
  isPublic: boolean;
  region?: string;
  size?: number;
  fileCount?: number;
}

export interface BucketOptions {
  public?: boolean;
  versioning?: boolean;
  region?: string;
  lifecycle?: LifecycleRule[];
  corsRules?: CORSRule[];
}

export interface LifecycleRule {
  id: string;
  status: 'Enabled' | 'Disabled';
  filter?: {
    prefix?: string;
    tags?: Record<string, string>;
  };
  expiration?: {
    days?: number;
    date?: Date;
  };
  transitions?: Array<{
    days: number;
    storageClass: string;
  }>;
}

export interface CORSRule {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  maxAgeSeconds?: number;
}

export interface StorageConfig {
  type: 'supabase' | 'aws-s3' | 'google-cloud' | 'azure-blob' | 'filesystem' | 'mock';
  supabase?: {
    url: string;
    key: string;
    bucket: string;
  };
  aws?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
  };
  googleCloud?: {
    projectId: string;
    keyFilename: string;
    bucket: string;
  };
  azure?: {
    connectionString: string;
    containerName: string;
  };
  filesystem?: {
    basePath: string;
    permissions?: string;
    createDirectories?: boolean;
  };
  options?: {
    maxFileSize?: number;
    allowedTypes?: string[];
    encryption?: boolean;
    enableVersioning?: boolean;
    defaultCacheControl?: string;
  };
}

export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  buckets: number;
  bandwidth: {
    uploaded: number;
    downloaded: number;
  };
  operations: {
    uploads: number;
    downloads: number;
    deletes: number;
  };
}

export interface SignedUrlOptions {
  expiresIn: number; // seconds
  method?: 'GET' | 'PUT' | 'POST' | 'DELETE';
  contentType?: string;
  responseHeaders?: Record<string, string>;
}

export interface TransferOptions {
  onProgress?: (progress: TransferProgress) => void;
  checksum?: boolean;
  overwrite?: boolean;
  preserveMetadata?: boolean;
}

export interface TransferProgress {
  transferred: number;
  total: number;
  percentage: number;
  speed: number; // bytes per second
  remaining: number; // seconds
}

// Core Storage Service Interface
export interface IStorageService {
  // Connection Management
  connect(config: StorageConfig): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getStats(): Promise<StorageStats>;

  // File Operations
  upload(path: string, file: File | Buffer, options?: UploadOptions): Promise<UploadResult>;
  download(path: string): Promise<ArrayBuffer>;
  downloadStream(path: string): Promise<ReadableStream>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  
  // Batch Operations
  uploadMultiple(files: FileUpload[]): Promise<UploadResult[]>;
  downloadMultiple(paths: string[]): Promise<ArrayBuffer[]>;
  deleteMultiple(paths: string[]): Promise<void>;
  
  // File Metadata
  getMetadata(path: string): Promise<FileMetadata>;
  updateMetadata(path: string, metadata: Record<string, any>): Promise<void>;
  listFiles(directory: string, options?: ListOptions): Promise<FileInfo[]>;
  
  // URL Generation
  getPublicUrl(path: string): string;
  getSignedUrl(path: string, options: SignedUrlOptions): Promise<string>;
  
  // File Operations
  moveFile(fromPath: string, toPath: string): Promise<void>;
  copyFile(fromPath: string, toPath: string, options?: TransferOptions): Promise<void>;
  renameFile(oldPath: string, newPath: string): Promise<void>;
  
  // Directory Operations
  createDirectory(path: string): Promise<void>;
  deleteDirectory(path: string, recursive?: boolean): Promise<void>;
  listDirectories(path: string): Promise<string[]>;
  
  // Search and Organization
  searchFiles(query: string, options?: SearchOptions): Promise<FileInfo[]>;
  findFilesByType(mimeType: string, directory?: string): Promise<FileInfo[]>;
  findFilesBySize(minSize: number, maxSize?: number, directory?: string): Promise<FileInfo[]>;
  
  // Versioning (if supported)
  listVersions(path: string): Promise<FileVersion[]>;
  restoreVersion(path: string, versionId: string): Promise<void>;
  deleteVersion(path: string, versionId: string): Promise<void>;
  
  // Compression and Archiving
  compressFile(path: string, algorithm?: 'gzip' | 'brotli'): Promise<string>;
  decompressFile(path: string): Promise<string>;
  createArchive(paths: string[], archivePath: string, format?: 'zip' | 'tar'): Promise<void>;
  extractArchive(archivePath: string, extractPath: string): Promise<string[]>;
}

// Bucket Management Interface
export interface IBucketService {
  // Bucket Operations
  createBucket(name: string, options?: BucketOptions): Promise<void>;
  deleteBucket(name: string, force?: boolean): Promise<void>;
  listBuckets(): Promise<BucketInfo[]>;
  getBucket(name: string): Promise<BucketInfo | null>;
  bucketExists(name: string): Promise<boolean>;
  
  // Bucket Configuration
  setBucketPolicy(name: string, policy: string): Promise<void>;
  getBucketPolicy(name: string): Promise<string>;
  setBucketCORS(name: string, rules: CORSRule[]): Promise<void>;
  getBucketCORS(name: string): Promise<CORSRule[]>;
  
  // Bucket Lifecycle
  setBucketLifecycle(name: string, rules: LifecycleRule[]): Promise<void>;
  getBucketLifecycle(name: string): Promise<LifecycleRule[]>;
  
  // Bucket Analytics
  getBucketUsage(name: string): Promise<BucketUsage>;
  getBucketStats(name: string, period?: string): Promise<BucketStats>;
}

// Event Interface for Storage Operations
export interface IStorageEventService {
  // Event Listeners
  onUpload(callback: (event: StorageEvent) => void): () => void;
  onDownload(callback: (event: StorageEvent) => void): () => void;
  onDelete(callback: (event: StorageEvent) => void): () => void;
  onError(callback: (error: StorageError) => void): () => void;
  
  // Event Broadcasting
  broadcastEvent(event: StorageEvent): Promise<void>;
}

// Additional Types
export interface FileVersion {
  versionId: string;
  lastModified: Date;
  size: number;
  etag: string;
  isLatest: boolean;
}

export interface BucketUsage {
  size: number;
  fileCount: number;
  lastModified: Date;
}

export interface BucketStats {
  uploads: number;
  downloads: number;
  bandwidth: number;
  requests: number;
  errors: number;
}

export interface StorageEvent {
  type: 'UPLOAD' | 'DOWNLOAD' | 'DELETE' | 'MOVE' | 'COPY';
  path: string;
  bucket?: string;
  size?: number;
  timestamp: Date;
  userId?: string;
  metadata?: Record<string, any>;
}

// Error Classes
export class StorageError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

export class FileNotFoundError extends StorageError {
  constructor(path: string) {
    super(`File not found: ${path}`, 'FILE_NOT_FOUND', 404);
    this.name = 'FileNotFoundError';
  }
}

export class BucketNotFoundError extends StorageError {
  constructor(bucket: string) {
    super(`Bucket not found: ${bucket}`, 'BUCKET_NOT_FOUND', 404);
    this.name = 'BucketNotFoundError';
  }
}

export class InsufficientStorageError extends StorageError {
  constructor(message: string = 'Insufficient storage space') {
    super(message, 'INSUFFICIENT_STORAGE', 507);
    this.name = 'InsufficientStorageError';
  }
}

export class FileTooLargeError extends StorageError {
  constructor(size: number, maxSize: number) {
    super(`File size ${size} exceeds maximum allowed size ${maxSize}`, 'FILE_TOO_LARGE', 413);
    this.name = 'FileTooLargeError';
  }
}

export class InvalidFileTypeError extends StorageError {
  constructor(type: string, allowedTypes: string[]) {
    super(`File type ${type} not allowed. Allowed types: ${allowedTypes.join(', ')}`, 'INVALID_FILE_TYPE', 415);
    this.name = 'InvalidFileTypeError';
  }
}

export class UploadFailedError extends StorageError {
  constructor(path: string, reason?: string) {
    super(`Upload failed for ${path}${reason ? `: ${reason}` : ''}`, 'UPLOAD_FAILED', 500);
    this.name = 'UploadFailedError';
  }
}

export class DownloadFailedError extends StorageError {
  constructor(path: string, reason?: string) {
    super(`Download failed for ${path}${reason ? `: ${reason}` : ''}`, 'DOWNLOAD_FAILED', 500);
    this.name = 'DownloadFailedError';
  }
}

// Utility Functions
export function getMimeType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    
    // Text
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    xml: 'application/xml',
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    ts: 'application/typescript',
    
    // Archives
    zip: 'application/zip',
    rar: 'application/vnd.rar',
    tar: 'application/x-tar',
    gz: 'application/gzip',
    
    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    
    // Video
    mp4: 'video/mp4',
    avi: 'video/x-msvideo',
    mov: 'video/quicktime',
    wmv: 'video/x-ms-wmv'
  };
  
  return mimeTypes[extension || ''] || 'application/octet-stream';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function validateFileName(filename: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for invalid characters
  const invalidChars = /[<>:"|?*\\]/;
  if (invalidChars.test(filename)) {
    errors.push('Filename contains invalid characters: < > : " | ? * \\');
  }
  
  // Check length
  if (filename.length > 255) {
    errors.push('Filename is too long (maximum 255 characters)');
  }
  
  // Check for reserved names (Windows)
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
  const nameWithoutExtension = filename.split('.')[0].toUpperCase();
  if (reservedNames.includes(nameWithoutExtension)) {
    errors.push('Filename uses a reserved name');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export function generateUniqueFileName(originalName: string, existingNames: string[]): string {
  let baseName = originalName;
  let extension = '';
  
  const lastDotIndex = originalName.lastIndexOf('.');
  if (lastDotIndex !== -1) {
    baseName = originalName.substring(0, lastDotIndex);
    extension = originalName.substring(lastDotIndex);
  }
  
  let counter = 1;
  let newName = originalName;
  
  while (existingNames.includes(newName)) {
    newName = `${baseName} (${counter})${extension}`;
    counter++;
  }
  
  return newName;
}

export function calculateChecksum(data: ArrayBuffer): string {
  // Simple checksum calculation - in production, use crypto.subtle for proper hashing
  let checksum = 0;
  const bytes = new Uint8Array(data);
  
  for (let i = 0; i < bytes.length; i++) {
    checksum += bytes[i];
  }
  
  return checksum.toString(16);
}

export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function isVideoFile(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

export function isAudioFile(mimeType: string): boolean {
  return mimeType.startsWith('audio/');
}

export function isDocumentFile(mimeType: string): boolean {
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv'
  ];
  
  return documentTypes.includes(mimeType);
}

// Storage Path Utilities
export class StoragePath {
  static join(...parts: string[]): string {
    return parts
      .map(part => part.replace(/^\/+|\/+$/g, ''))
      .filter(part => part.length > 0)
      .join('/');
  }
  
  static dirname(path: string): string {
    const parts = path.split('/');
    return parts.slice(0, -1).join('/') || '/';
  }
  
  static basename(path: string): string {
    return path.split('/').pop() || '';
  }
  
  static extname(path: string): string {
    const basename = StoragePath.basename(path);
    const lastDotIndex = basename.lastIndexOf('.');
    return lastDotIndex !== -1 ? basename.substring(lastDotIndex) : '';
  }
  
  static normalize(path: string): string {
    return path
      .replace(/\/+/g, '/') // Replace multiple slashes with single slash
      .replace(/\/$/, '') // Remove trailing slash
      .replace(/^\//, ''); // Remove leading slash
  }
}
