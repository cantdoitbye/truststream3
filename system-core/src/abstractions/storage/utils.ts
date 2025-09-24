/**
 * Storage Utilities
 * Helper functions for storage operations and validation
 */

import {
  FileInfo,
  FileMetadata,
  StorageError,
  getMimeType,
  formatFileSize,
  validateFileName,
  generateUniqueFileName,
  calculateChecksum,
  isImageFile,
  isVideoFile,
  isAudioFile,
  isDocumentFile,
  StoragePath
} from '../../shared-utils/storage-interface';

// Re-export utilities from shared-utils
export {
  getMimeType,
  formatFileSize,
  validateFileName,
  generateUniqueFileName,
  calculateChecksum,
  isImageFile,
  isVideoFile,
  isAudioFile,
  isDocumentFile,
  StoragePath
} from '../../shared-utils/storage-interface';

/**
 * Validates upload options
 */
export function validateUploadOptions(options: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (options.contentType && typeof options.contentType !== 'string') {
    errors.push('Content type must be a string');
  }

  if (options.cacheControl && typeof options.cacheControl !== 'string') {
    errors.push('Cache control must be a string');
  }

  if (options.metadata && typeof options.metadata !== 'object') {
    errors.push('Metadata must be an object');
  }

  if (options.acl && !['private', 'public-read', 'public-read-write'].includes(options.acl)) {
    errors.push('ACL must be one of: private, public-read, public-read-write');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Generates a safe filename by removing invalid characters
 */
export function sanitizeFileName(filename: string): string {
  // Remove or replace invalid characters
  const sanitized = filename
    .replace(/[<>:"|?*\\]/g, '_')
    .replace(/\.\./g, '_')
    .replace(/^\./, '_')
    .trim();

  // Ensure filename is not too long
  if (sanitized.length > 255) {
    const ext = sanitized.substring(sanitized.lastIndexOf('.'));
    const name = sanitized.substring(0, 255 - ext.length);
    return name + ext;
  }

  return sanitized || 'unnamed_file';
}

/**
 * Generates a timestamped filename
 */
export function generateTimestampedFilename(originalName: string, includeRandom: boolean = true): string {
  const timestamp = Date.now();
  const sanitized = sanitizeFileName(originalName);
  const extension = sanitized.substring(sanitized.lastIndexOf('.'));
  const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));
  
  let filename = `${timestamp}_${nameWithoutExt}`;
  
  if (includeRandom) {
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    filename += `_${randomSuffix}`;
  }
  
  return filename + extension;
}

/**
 * Creates a directory-like path structure
 */
export function createDirectoryPath(basePath: string, ...segments: string[]): string {
  const cleanSegments = segments
    .map(segment => segment.replace(/[<>:"|?*\\]/g, '_'))
    .filter(segment => segment.length > 0);
  
  return StoragePath.join(basePath, ...cleanSegments);
}

/**
 * Organizes files by date (year/month/day structure)
 */
export function createDatePath(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}/${month}/${day}`;
}

/**
 * Creates a user-specific path
 */
export function createUserPath(userId: string, subPath?: string): string {
  const cleanUserId = userId.replace(/[<>:"|?*\\]/g, '_');
  return subPath ? StoragePath.join(cleanUserId, subPath) : cleanUserId;
}

/**
 * Validates file size against limits
 */
export function validateFileSize(size: number, maxSize?: number, minSize?: number): { valid: boolean; error?: string } {
  if (minSize && size < minSize) {
    return {
      valid: false,
      error: `File size ${formatFileSize(size)} is below minimum ${formatFileSize(minSize)}`
    };
  }

  if (maxSize && size > maxSize) {
    return {
      valid: false,
      error: `File size ${formatFileSize(size)} exceeds maximum ${formatFileSize(maxSize)}`
    };
  }

  return { valid: true };
}

/**
 * Validates file type against allowed types
 */
export function validateFileType(mimeType: string, allowedTypes?: string[]): { valid: boolean; error?: string } {
  if (!allowedTypes || allowedTypes.length === 0) {
    return { valid: true };
  }

  if (!allowedTypes.includes(mimeType)) {
    return {
      valid: false,
      error: `File type ${mimeType} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * Generates a content hash for duplicate detection
 */
export function generateContentHash(data: ArrayBuffer | Buffer): string {
  // Simple hash function - in production, use crypto APIs
  let hash = 0;
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  
  for (let i = 0; i < bytes.length; i++) {
    const char = bytes[i];
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(16);
}

/**
 * Detects duplicate files based on content hash
 */
export function findDuplicateFiles(files: Array<{ path: string; hash?: string }>): Array<string[]> {
  const hashGroups = new Map<string, string[]>();
  
  for (const file of files) {
    if (file.hash) {
      const group = hashGroups.get(file.hash) || [];
      group.push(file.path);
      hashGroups.set(file.hash, group);
    }
  }
  
  return Array.from(hashGroups.values()).filter(group => group.length > 1);
}

/**
 * Calculates storage space usage
 */
export function calculateStorageUsage(files: FileInfo[]): {
  totalFiles: number;
  totalSize: number;
  sizeByType: Record<string, { count: number; size: number }>;
  largestFiles: FileInfo[];
} {
  const sizeByType: Record<string, { count: number; size: number }> = {};
  let totalSize = 0;
  
  for (const file of files) {
    totalSize += file.size;
    
    const category = getFileCategory(file.mimeType);
    if (!sizeByType[category]) {
      sizeByType[category] = { count: 0, size: 0 };
    }
    sizeByType[category].count++;
    sizeByType[category].size += file.size;
  }
  
  const largestFiles = [...files]
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);
  
  return {
    totalFiles: files.length,
    totalSize,
    sizeByType,
    largestFiles
  };
}

/**
 * Categorizes files by type
 */
export function getFileCategory(mimeType: string): string {
  if (isImageFile(mimeType)) return 'images';
  if (isVideoFile(mimeType)) return 'videos';
  if (isAudioFile(mimeType)) return 'audio';
  if (isDocumentFile(mimeType)) return 'documents';
  if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('rar')) return 'archives';
  return 'other';
}

/**
 * Filters files based on criteria
 */
export function filterFiles(files: FileInfo[], criteria: {
  mimeTypes?: string[];
  sizeRange?: { min?: number; max?: number };
  dateRange?: { from?: Date; to?: Date };
  namePattern?: RegExp;
}): FileInfo[] {
  return files.filter(file => {
    if (criteria.mimeTypes && !criteria.mimeTypes.includes(file.mimeType)) {
      return false;
    }
    
    if (criteria.sizeRange) {
      if (criteria.sizeRange.min && file.size < criteria.sizeRange.min) return false;
      if (criteria.sizeRange.max && file.size > criteria.sizeRange.max) return false;
    }
    
    if (criteria.dateRange) {
      if (criteria.dateRange.from && file.lastModified < criteria.dateRange.from) return false;
      if (criteria.dateRange.to && file.lastModified > criteria.dateRange.to) return false;
    }
    
    if (criteria.namePattern && !criteria.namePattern.test(file.name)) {
      return false;
    }
    
    return true;
  });
}

/**
 * Sorts files by various criteria
 */
export function sortFiles(files: FileInfo[], sortBy: 'name' | 'size' | 'modified' | 'type', order: 'asc' | 'desc' = 'asc'): FileInfo[] {
  const sorted = [...files].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'size':
        comparison = a.size - b.size;
        break;
      case 'modified':
        comparison = a.lastModified.getTime() - b.lastModified.getTime();
        break;
      case 'type':
        comparison = a.mimeType.localeCompare(b.mimeType);
        break;
    }
    
    return order === 'desc' ? -comparison : comparison;
  });
  
  return sorted;
}

/**
 * Creates a progress tracker for batch operations
 */
export function createProgressTracker(total: number, onProgress?: (progress: { completed: number; total: number; percentage: number }) => void) {
  let completed = 0;
  
  return {
    increment() {
      completed++;
      if (onProgress) {
        onProgress({
          completed,
          total,
          percentage: (completed / total) * 100
        });
      }
    },
    
    setCompleted(count: number) {
      completed = count;
      if (onProgress) {
        onProgress({
          completed,
          total,
          percentage: (completed / total) * 100
        });
      }
    },
    
    getProgress() {
      return {
        completed,
        total,
        percentage: (completed / total) * 100
      };
    }
  };
}

/**
 * Debounce function for storage operations
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for storage operations
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === maxRetries) {
        break;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Creates a timeout wrapper for async operations
 */
export function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new StorageError(errorMessage || 'Operation timed out', 'TIMEOUT', 408)),
        timeoutMs
      )
    )
  ]);
}

/**
 * Validates storage configuration
 */
export function validateStorageConfig(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!config || typeof config !== 'object') {
    errors.push('Configuration must be an object');
    return { valid: false, errors };
  }
  
  if (!config.type) {
    errors.push('Provider type is required');
  }
  
  const validProviders = ['supabase', 'aws-s3', 'google-cloud', 'azure-blob', 'filesystem', 'mock'];
  if (config.type && !validProviders.includes(config.type)) {
    errors.push(`Invalid provider type. Must be one of: ${validProviders.join(', ')}`);
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Creates a rate limiter for storage operations
 */
export function createRateLimiter(maxRequests: number, windowMs: number) {
  const requests = new Map<string, number[]>();
  
  return (identifier: string): { allowed: boolean; resetTime: number } => {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old requests
    const userRequests = requests.get(identifier) || [];
    const validRequests = userRequests.filter(time => time > windowStart);
    
    if (validRequests.length >= maxRequests) {
      return {
        allowed: false,
        resetTime: validRequests[0] + windowMs
      };
    }
    
    validRequests.push(now);
    requests.set(identifier, validRequests);
    
    return {
      allowed: true,
      resetTime: now + windowMs
    };
  };
}

/**
 * Converts bytes to human-readable format with precision
 */
export function formatBytesWithPrecision(bytes: number, precision: number = 2): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(precision)) + ' ' + sizes[i];
}

/**
 * Estimates storage costs based on usage
 */
export function estimateStorageCosts(
  storageGB: number,
  transferGB: number,
  requests: number,
  provider: string = 'supabase'
): { storage: number; transfer: number; requests: number; total: number; currency: string } {
  const costTables: Record<string, any> = {
    supabase: {
      storagePerGB: 0.021,
      transferPerGB: 0.09,
      requestsPer1000: 0.0004,
      currency: 'USD'
    },
    'aws-s3': {
      storagePerGB: 0.023,
      transferPerGB: 0.09,
      requestsPer1000: 0.0004,
      currency: 'USD'
    },
    'google-cloud': {
      storagePerGB: 0.020,
      transferPerGB: 0.12,
      requestsPer1000: 0.0004,
      currency: 'USD'
    },
    'azure-blob': {
      storagePerGB: 0.0184,
      transferPerGB: 0.087,
      requestsPer1000: 0.0004,
      currency: 'USD'
    }
  };

  const costs = costTables[provider] || costTables['supabase'];
  
  const storage = storageGB * costs.storagePerGB;
  const transfer = transferGB * costs.transferPerGB;
  const requestCost = (requests / 1000) * costs.requestsPer1000;
  
  return {
    storage,
    transfer,
    requests: requestCost,
    total: storage + transfer + requestCost,
    currency: costs.currency
  };
}

/**
 * Creates a simple compression utility
 */
export const createCompression = () => {
  const compress = async (data: ArrayBuffer): Promise<ArrayBuffer> => {
    // Simplified compression - in production use proper compression libraries
    const compressed = new Uint8Array(data.byteLength);
    const original = new Uint8Array(data);
    
    // Simple run-length encoding simulation
    let compressedIndex = 0;
    for (let i = 0; i < original.length && compressedIndex < compressed.length; i++) {
      compressed[compressedIndex++] = original[i];
    }
    
    return compressed.buffer.slice(0, compressedIndex);
  };
  
  const decompress = async (compressedData: ArrayBuffer): Promise<ArrayBuffer> => {
    // Simple decompression
    return compressedData.slice(0);
  };
  
  return { compress, decompress };
};

/**
 * Formats storage error for display
 */
export function formatStorageError(error: any): string {
  if (error instanceof StorageError) {
    switch (error.code) {
      case 'FILE_NOT_FOUND':
        return 'File not found';
      case 'BUCKET_NOT_FOUND':
        return 'Bucket not found';
      case 'FILE_TOO_LARGE':
        return 'File size exceeds maximum allowed';
      case 'INVALID_FILE_TYPE':
        return 'File type not allowed';
      case 'UPLOAD_FAILED':
        return 'Upload failed';
      case 'DOWNLOAD_FAILED':
        return 'Download failed';
      case 'INSUFFICIENT_STORAGE':
        return 'Insufficient storage space';
      default:
        return error.message || 'Storage operation failed';
    }
  }
  
  return error?.message || 'An unexpected error occurred';
}

/**
 * Creates a file storage helper
 */
export const createFileStorage = (storageKey: string = 'file_metadata') => {
  const isClient = typeof window !== 'undefined';
  
  const saveFileMetadata = (metadata: FileMetadata[]): void => {
    if (!isClient) return;
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(metadata));
    } catch (error) {
      console.warn('Failed to save file metadata:', error);
    }
  };
  
  const loadFileMetadata = (): FileMetadata[] => {
    if (!isClient) return [];
    
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return [];
      
      const metadata = JSON.parse(stored);
      return Array.isArray(metadata) ? metadata : [];
    } catch {
      return [];
    }
  };
  
  const clearFileMetadata = (): void => {
    if (!isClient) return;
    
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('Failed to clear file metadata:', error);
    }
  };
  
  return { saveFileMetadata, loadFileMetadata, clearFileMetadata };
};
