/**
 * Firebase Storage Provider
 * Implementation of storage abstraction for Firebase Storage
 */

import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import {
  getStorage,
  FirebaseStorage,
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
  updateMetadata
} from 'firebase/storage';
import {
  StorageConfig,
  StorageProvider,
  FileUploadOptions,
  FileDownloadOptions,
  FileInfo,
  UploadProgress,
  StorageError,
  FileNotFoundError,
  PermissionError,
  QuotaExceededError
} from '../../../shared-utils/storage-interface';
import { BaseStorageProvider } from '../storage.interface';

export class FirebaseStorageProvider extends BaseStorageProvider {
  private app: FirebaseApp | null = null;
  private storage: FirebaseStorage | null = null;

  public getProviderName(): string {
    return 'firebase';
  }

  public async initialize(config: StorageConfig): Promise<void> {
    if (config.type !== 'firebase' || !config.firebase) {
      throw new Error('Invalid Firebase configuration');
    }

    // Initialize Firebase app if not already initialized
    const existingApp = getApps().find(app => app.name === config.firebase?.projectId);
    
    if (existingApp) {
      this.app = existingApp;
    } else {
      this.app = initializeApp({
        apiKey: config.firebase.apiKey,
        authDomain: config.firebase.authDomain,
        projectId: config.firebase.projectId,
        storageBucket: config.firebase.storageBucket,
        messagingSenderId: config.firebase.messagingSenderId,
        appId: config.firebase.appId
      }, config.firebase.projectId);
    }

    this.storage = getStorage(this.app);
    this.config = config;
  }

  public async connect(): Promise<void> {
    if (!this.storage) {
      throw new Error('Firebase storage not initialized');
    }

    try {
      // Test connection by attempting to list root
      await listAll(ref(this.storage, '/'));
      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw new StorageError('Failed to connect to Firebase Storage', 'CONNECTION_FAILED', 500, error);
    }
  }

  public async disconnect(): Promise<void> {
    // Firebase Storage doesn't require explicit disconnection
    this.connected = false;
  }

  protected async performHealthCheck(): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage not initialized');
    }
    
    // Test connection by listing root
    await listAll(ref(this.storage, '/'));
  }

  // File operations
  public async uploadFile(
    path: string,
    file: File | Buffer | Uint8Array,
    options: FileUploadOptions = {}
  ): Promise<FileInfo> {
    if (!this.storage) {
      throw new Error('Storage not initialized');
    }

    try {
      const storageRef = ref(this.storage, path);
      
      let uploadTask;
      if (options.onProgress) {
        // Use resumable upload for progress tracking
        uploadTask = uploadBytesResumable(storageRef, file as Blob, {
          contentType: options.contentType,
          customMetadata: options.metadata
        });

        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            options.onProgress!({
              loaded: snapshot.bytesTransferred,
              total: snapshot.totalBytes,
              percentage: progress
            });
          },
          (error) => {
            throw this.mapFirebaseStorageError(error);
          }
        );

        await uploadTask;
      } else {
        // Simple upload
        await uploadBytes(storageRef, file as Blob, {
          contentType: options.contentType,
          customMetadata: options.metadata
        });
      }

      // Get file metadata
      const metadata = await getMetadata(storageRef);
      const downloadUrl = await getDownloadURL(storageRef);

      return {
        id: metadata.fullPath,
        name: metadata.name,
        path: metadata.fullPath,
        size: metadata.size,
        contentType: metadata.contentType || 'application/octet-stream',
        url: downloadUrl,
        metadata: metadata.customMetadata || {},
        createdAt: new Date(metadata.timeCreated),
        updatedAt: new Date(metadata.updated),
        provider: 'firebase'
      };
    } catch (error: any) {
      throw this.mapFirebaseStorageError(error);
    }
  }

  public async downloadFile(path: string, options: FileDownloadOptions = {}): Promise<Blob> {
    if (!this.storage) {
      throw new Error('Storage not initialized');
    }

    try {
      const storageRef = ref(this.storage, path);
      const downloadUrl = await getDownloadURL(storageRef);
      
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new FileNotFoundError(`File not found: ${path}`);
      }

      return await response.blob();
    } catch (error: any) {
      throw this.mapFirebaseStorageError(error);
    }
  }

  public async getFileInfo(path: string): Promise<FileInfo> {
    if (!this.storage) {
      throw new Error('Storage not initialized');
    }

    try {
      const storageRef = ref(this.storage, path);
      const metadata = await getMetadata(storageRef);
      const downloadUrl = await getDownloadURL(storageRef);

      return {
        id: metadata.fullPath,
        name: metadata.name,
        path: metadata.fullPath,
        size: metadata.size,
        contentType: metadata.contentType || 'application/octet-stream',
        url: downloadUrl,
        metadata: metadata.customMetadata || {},
        createdAt: new Date(metadata.timeCreated),
        updatedAt: new Date(metadata.updated),
        provider: 'firebase'
      };
    } catch (error: any) {
      throw this.mapFirebaseStorageError(error);
    }
  }

  public async deleteFile(path: string): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage not initialized');
    }

    try {
      const storageRef = ref(this.storage, path);
      await deleteObject(storageRef);
    } catch (error: any) {
      throw this.mapFirebaseStorageError(error);
    }
  }

  public async listFiles(path: string = '', options: { limit?: number; prefix?: string } = {}): Promise<FileInfo[]> {
    if (!this.storage) {
      throw new Error('Storage not initialized');
    }

    try {
      const storageRef = ref(this.storage, path);
      const listResult = await listAll(storageRef);
      
      const files: FileInfo[] = [];
      
      for (const itemRef of listResult.items) {
        try {
          const metadata = await getMetadata(itemRef);
          const downloadUrl = await getDownloadURL(itemRef);
          
          files.push({
            id: metadata.fullPath,
            name: metadata.name,
            path: metadata.fullPath,
            size: metadata.size,
            contentType: metadata.contentType || 'application/octet-stream',
            url: downloadUrl,
            metadata: metadata.customMetadata || {},
            createdAt: new Date(metadata.timeCreated),
            updatedAt: new Date(metadata.updated),
            provider: 'firebase'
          });
          
          if (options.limit && files.length >= options.limit) {
            break;
          }
        } catch {
          // Skip files we can't access
          continue;
        }
      }
      
      return files;
    } catch (error: any) {
      throw this.mapFirebaseStorageError(error);
    }
  }

  public async updateFileMetadata(path: string, metadata: Record<string, string>): Promise<FileInfo> {
    if (!this.storage) {
      throw new Error('Storage not initialized');
    }

    try {
      const storageRef = ref(this.storage, path);
      await updateMetadata(storageRef, {
        customMetadata: metadata
      });
      
      return await this.getFileInfo(path);
    } catch (error: any) {
      throw this.mapFirebaseStorageError(error);
    }
  }

  public async getDownloadUrl(path: string, options: { expiresIn?: number } = {}): Promise<string> {
    if (!this.storage) {
      throw new Error('Storage not initialized');
    }

    try {
      const storageRef = ref(this.storage, path);
      return await getDownloadURL(storageRef);
    } catch (error: any) {
      throw this.mapFirebaseStorageError(error);
    }
  }

  public async createSignedUploadUrl(
    path: string,
    options: { expiresIn?: number; contentType?: string } = {}
  ): Promise<{ url: string; fields: Record<string, string> }> {
    // Firebase doesn't support signed upload URLs like AWS S3
    // Instead, we return the storage reference path for direct upload
    throw new Error('Signed upload URLs not supported by Firebase Storage');
  }

  private mapFirebaseStorageError(error: any): StorageError {
    switch (error.code) {
      case 'storage/object-not-found':
        return new FileNotFoundError(error.message);
      case 'storage/unauthorized':
        return new PermissionError(error.message);
      case 'storage/quota-exceeded':
        return new QuotaExceededError(error.message);
      case 'storage/invalid-format':
      case 'storage/invalid-argument':
        return new StorageError(error.message, 'INVALID_FORMAT', 400);
      default:
        return new StorageError(error.message || 'Storage operation failed', 'STORAGE_ERROR', 500, error);
    }
  }

  protected async getProviderStats() {
    return {
      totalFiles: 0, // Would need custom tracking
      totalSize: 0,
      bandwidth: 0,
      requests: 0,
      lastUpdated: new Date()
    };
  }
}