/**
 * Storage Abstraction Layer - Main Export
 * Provides unified access to all storage functionality
 */

// Core service and configuration
export { StorageService, storageService } from './storage.service';
export { StorageConfigManager, storageConfig } from './config';

// Interfaces and types
export * from './storage.interface';

// Providers
export { StorageProviderFactory, storageProviderFactory } from './providers/provider-factory';
export { SupabaseStorageProvider } from './providers/supabase-provider';
export { MockStorageProvider } from './providers/mock-provider';

// Events system
export { StorageEventEmitter, storageEvents } from './events';
export type { StorageEventHandler, StorageEventSubscription } from './events';

// Utilities
export * from './utils';

// Re-export shared storage interfaces
export * from '../../shared-utils/storage-interface';

// Default configuration for quick setup
export const createStorageService = async (config: any) => {
  const service = StorageService.getInstance();
  await service.initialize(config);
  return service;
};

// Quick setup for common providers
export const setupSupabaseStorage = async (url: string, key: string, bucket: string, options?: any) => {
  return createStorageService({
    type: 'supabase',
    supabase: { url, key, bucket },
    options
  });
};

export const setupMockStorage = async (options?: any) => {
  return createStorageService({
    type: 'mock',
    options
  });
};

// Storage middleware helper for file uploads
export const createUploadMiddleware = (storageService: StorageService, options?: {
  maxFileSize?: number;
  allowedTypes?: string[];
  uploadPath?: string;
}) => {
  return async (req: any, res: any, next: any) => {
    try {
      if (!req.file && !req.files) {
        return next();
      }

      const files = req.files || [req.file];
      const uploadPath = options?.uploadPath || 'uploads';
      
      for (const file of files) {
        // Validate file size
        if (options?.maxFileSize && file.size > options.maxFileSize) {
          return res.status(413).json({ 
            error: `File size exceeds maximum allowed: ${file.size} > ${options.maxFileSize}` 
          });
        }

        // Validate file type
        if (options?.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
          return res.status(415).json({ 
            error: `File type not allowed: ${file.mimetype}` 
          });
        }

        // Upload file
        const fileName = `${Date.now()}-${file.originalname}`;
        const filePath = `${uploadPath}/${fileName}`;
        
        const result = await storageService.upload(filePath, file.buffer, {
          contentType: file.mimetype,
          metadata: {
            originalName: file.originalname,
            uploadedBy: req.user?.id || 'anonymous',
            uploadedAt: new Date().toISOString()
          }
        });

        // Add upload result to request
        req.uploadResult = req.uploadResult || [];
        req.uploadResult.push(result);
      }

      next();
    } catch (error) {
      return res.status(500).json({ 
        error: 'File upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
};

// File serving helper
export const createFileServeMiddleware = (storageService: StorageService) => {
  return async (req: any, res: any) => {
    try {
      const filePath = req.params.filePath || req.query.path;
      
      if (!filePath) {
        return res.status(400).json({ error: 'File path is required' });
      }

      const exists = await storageService.exists(filePath);
      if (!exists) {
        return res.status(404).json({ error: 'File not found' });
      }

      const metadata = await storageService.getMetadata(filePath);
      const data = await storageService.download(filePath);

      res.set({
        'Content-Type': metadata.mimeType,
        'Content-Length': metadata.size.toString(),
        'Cache-Control': metadata.cacheControl || 'public, max-age=3600',
        'ETag': metadata.etag || ''
      });

      res.send(Buffer.from(data));
    } catch (error) {
      return res.status(500).json({ 
        error: 'File serving failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
};

// Batch operation helpers
export const uploadFiles = async (storageService: StorageService, files: Array<{
  path: string;
  file: File | Buffer;
  options?: any;
}>) => {
  return storageService.uploadMultiple(files);
};

export const downloadFiles = async (storageService: StorageService, paths: string[]) => {
  return storageService.downloadMultiple(paths);
};

export const deleteFiles = async (storageService: StorageService, paths: string[]) => {
  return storageService.deleteMultiple(paths);
};

// URL helpers
export const getPublicUrl = (storageService: StorageService, path: string) => {
  return storageService.getPublicUrl(path);
};

export const getSignedUrl = async (storageService: StorageService, path: string, expiresIn: number = 3600) => {
  return storageService.getSignedUrl(path, { expiresIn });
};

// File organization helpers
export const organizeFilesByType = (files: import('./storage.interface').FileInfo[]) => {
  const organized: Record<string, import('./storage.interface').FileInfo[]> = {};
  
  for (const file of files) {
    const category = getFileCategory(file.mimeType);
    if (!organized[category]) {
      organized[category] = [];
    }
    organized[category].push(file);
  }
  
  return organized;
};

export const getFileCategory = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'images';
  if (mimeType.startsWith('video/')) return 'videos';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf')) return 'documents';
  if (mimeType.includes('text/') || mimeType.includes('document')) return 'documents';
  if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('rar')) return 'archives';
  return 'other';
};

// Search helpers
export const searchFiles = async (
  storageService: StorageService, 
  query: string, 
  filters?: {
    directory?: string;
    mimeType?: string;
    sizeRange?: { min?: number; max?: number };
    dateRange?: { from?: Date; to?: Date };
  }
) => {
  return storageService.searchFiles(query, {
    limit: 100,
    ...filters
  });
};

// Type guards
export const isStorageError = (error: any): error is import('../../shared-utils/storage-interface').StorageError => {
  return error && error.name && error.name.includes('StorageError');
};

export const isUploadResult = (result: any): result is import('../../shared-utils/storage-interface').UploadResult => {
  return result && typeof result === 'object' && 'path' in result && 'url' in result && 'size' in result;
};

export const isFileInfo = (info: any): info is import('../../shared-utils/storage-interface').FileInfo => {
  return info && typeof info === 'object' && 'path' in info && 'name' in info && 'size' in info;
};

// Constants
export const STORAGE_EVENTS = {
  UPLOAD: 'UPLOAD',
  DOWNLOAD: 'DOWNLOAD',
  DELETE: 'DELETE',
  MOVE: 'MOVE',
  COPY: 'COPY'
} as const;

export const STORAGE_PROVIDERS = {
  SUPABASE: 'supabase',
  AWS_S3: 'aws-s3',
  GOOGLE_CLOUD: 'google-cloud',
  AZURE_BLOB: 'azure-blob',
  FILESYSTEM: 'filesystem',
  MOCK: 'mock'
} as const;

export const FILE_CATEGORIES = {
  IMAGES: 'images',
  VIDEOS: 'videos',
  AUDIO: 'audio',
  DOCUMENTS: 'documents',
  ARCHIVES: 'archives',
  OTHER: 'other'
} as const;

export const DEFAULT_UPLOAD_OPTIONS = {
  cacheControl: 'public, max-age=3600',
  overwrite: false
} as const;

export const DEFAULT_SIGNED_URL_EXPIRES = 3600; // 1 hour

// Configuration presets
export const STORAGE_PRESETS = {
  IMAGE_UPLOAD: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    defaultCacheControl: 'public, max-age=86400' // 24 hours
  },
  DOCUMENT_UPLOAD: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    defaultCacheControl: 'private, max-age=3600'
  },
  GENERAL_UPLOAD: {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: [], // All types allowed
    defaultCacheControl: 'public, max-age=3600'
  }
} as const;
