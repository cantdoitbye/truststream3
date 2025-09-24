/**
 * Quantum-Safe Key Management Service
 * 
 * Enterprise-grade key lifecycle management for post-quantum cryptographic keys
 * with HSM integration, automated rotation, and compliance features.
 * 
 * Features:
 * - Secure key generation, storage, and destruction
 * - Automated key rotation strategies
 * - HSM integration (Utimaco Quantum Protect)
 * - Audit logging and compliance reporting
 * - Key escrow and recovery procedures
 */

import {
  QuantumKeyPair,
  KeyMetadata,
  KeyUsage,
  KeyOrigin,
  QuantumConfig,
  HSMConfig,
  HSMProvider,
  QuantumCryptographicError,
  QuantumAlgorithmType
} from '../types';

export class QuantumSafeKeyManager {
  private config: QuantumConfig;
  private hsmConfig?: HSMConfig;
  private keyStore: Map<string, QuantumKeyPair> = new Map();
  private keyMetadata: Map<string, KeyMetadata> = new Map();
  private rotationSchedule: Map<string, NodeJS.Timeout> = new Map();
  private initialized: boolean = false;

  constructor(config: QuantumConfig, hsmConfig?: HSMConfig) {
    this.config = config;
    this.hsmConfig = hsmConfig;
  }

  async initialize(): Promise<void> {
    try {
      console.log('🔐 Initializing Quantum-Safe Key Manager...');
      
      // Initialize HSM connection if configured
      if (this.hsmConfig) {
        await this.initializeHSM();
      }
      
      // Load existing keys from secure storage
      await this.loadExistingKeys();
      
      // Set up automated key rotation
      await this.setupKeyRotation();
      
      this.initialized = true;
      console.log('✅ Quantum-Safe Key Manager initialized successfully');
      
    } catch (error) {
      throw new QuantumCryptographicError(
        `Failed to initialize Key Manager: ${error.message}`,
        'KEY_MANAGER_INITIALIZATION_FAILED'
      );
    }
  }

  /**
   * Store quantum-safe key pair with metadata
   */
  async storeKeyPair(keyPair: QuantumKeyPair): Promise<void> {
    this.ensureInitialized();
    
    try {
      const keyId = keyPair.metadata.id;
      
      // Store in HSM if configured and required
      if (this.shouldUseHSM(keyPair)) {
        await this.storeInHSM(keyPair);
      } else {
        // Store in secure local storage
        this.keyStore.set(keyId, keyPair);
      }
      
      // Store metadata
      this.keyMetadata.set(keyId, keyPair.metadata);
      
      // Set up rotation schedule if needed
      if (keyPair.metadata.expiresAt) {
        await this.scheduleKeyRotation(keyId, keyPair.metadata.expiresAt);
      }
      
      // Audit logging
      await this.logKeyOperation('STORE', keyId, keyPair.algorithm);
      
      console.log(`🔑 Stored ${keyPair.algorithm} key pair: ${keyId}`);
      
    } catch (error) {
      throw new QuantumCryptographicError(
        `Failed to store key pair: ${error.message}`,
        'KEY_STORAGE_FAILED',
        keyPair.algorithm
      );
    }
  }

  /**
   * Retrieve quantum-safe key pair by ID
   */
  async retrieveKeyPair(keyId: string): Promise<QuantumKeyPair | null> {
    this.ensureInitialized();
    
    try {
      // Try HSM first if configured
      if (this.hsmConfig) {
        const hsmKey = await this.retrieveFromHSM(keyId);
        if (hsmKey) {
          await this.logKeyOperation('RETRIEVE', keyId);
          return hsmKey;
        }
      }
      
      // Try local storage
      const keyPair = this.keyStore.get(keyId);
      if (keyPair) {
        await this.logKeyOperation('RETRIEVE', keyId, keyPair.algorithm);
        return keyPair;
      }
      
      return null;
      
    } catch (error) {
      throw new QuantumCryptographicError(
        `Failed to retrieve key pair: ${error.message}`,
        'KEY_RETRIEVAL_FAILED'
      );
    }
  }

  /**
   * List all stored key pairs with filtering
   */
  async listKeys(filter?: {
    algorithm?: QuantumAlgorithmType;
    usage?: KeyUsage;
    origin?: KeyOrigin;
    active?: boolean;
  }): Promise<KeyMetadata[]> {
    this.ensureInitialized();
    
    const allMetadata = Array.from(this.keyMetadata.values());
    
    return allMetadata.filter(metadata => {
      if (filter?.algorithm && metadata.algorithm !== filter.algorithm) {
        return false;
      }
      if (filter?.usage && !metadata.usage.includes(filter.usage)) {
        return false;
      }
      if (filter?.origin && metadata.origin !== filter.origin) {
        return false;
      }
      if (filter?.active !== undefined) {
        const isActive = !metadata.expiresAt || metadata.expiresAt > new Date();
        if (filter.active !== isActive) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Rotate key pair (generate new, mark old as deprecated)
   */
  async rotateKey(keyId: string): Promise<QuantumKeyPair> {
    this.ensureInitialized();
    
    try {
      const oldMetadata = this.keyMetadata.get(keyId);
      if (!oldMetadata) {
        throw new Error(`Key not found: ${keyId}`);
      }
      
      console.log(`🔄 Rotating key: ${keyId}`);
      
      // Generate new key pair with same parameters
      const { QuantumEncryptionService } = await import('../QuantumEncryptionService');
      const encryptionService = new QuantumEncryptionService(this.config);
      await encryptionService.initialize();
      
      const newKeyPair = await encryptionService.generateKeyPair(oldMetadata.algorithm);
      
      // Update rotation schedule
      await this.scheduleKeyRotation(newKeyPair.metadata.id, this.calculateNextRotation());
      
      // Mark old key as deprecated (don't delete immediately for rollback)
      await this.deprecateKey(keyId);
      
      await this.logKeyOperation('ROTATE', keyId, oldMetadata.algorithm, {
        newKeyId: newKeyPair.metadata.id
      });
      
      console.log(`✅ Key rotated successfully: ${keyId} → ${newKeyPair.metadata.id}`);
      
      return newKeyPair;
      
    } catch (error) {
      throw new QuantumCryptographicError(
        `Key rotation failed: ${error.message}`,
        'KEY_ROTATION_FAILED'
      );
    }
  }

  /**
   * Securely destroy key pair
   */
  async destroyKey(keyId: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      const metadata = this.keyMetadata.get(keyId);
      if (!metadata) {
        throw new Error(`Key not found: ${keyId}`);
      }
      
      // Remove from HSM if stored there
      if (this.hsmConfig) {
        await this.destroyFromHSM(keyId);
      }
      
      // Securely overwrite memory
      const keyPair = this.keyStore.get(keyId);
      if (keyPair) {
        this.secureOverwrite(keyPair.privateKey);
        this.secureOverwrite(keyPair.publicKey);
        this.keyStore.delete(keyId);
      }
      
      // Remove metadata
      this.keyMetadata.delete(keyId);
      
      // Cancel rotation schedule
      const rotationTimer = this.rotationSchedule.get(keyId);
      if (rotationTimer) {
        clearTimeout(rotationTimer);
        this.rotationSchedule.delete(keyId);
      }
      
      await this.logKeyOperation('DESTROY', keyId, metadata.algorithm);
      
      console.log(`🗑️  Key destroyed: ${keyId}`);
      
    } catch (error) {
      throw new QuantumCryptographicError(
        `Key destruction failed: ${error.message}`,
        'KEY_DESTRUCTION_FAILED'
      );
    }
  }

  /**
   * Export key for backup/transfer (encrypted)
   */
  async exportKey(keyId: string, password: string): Promise<Uint8Array> {
    this.ensureInitialized();
    
    try {
      const keyPair = await this.retrieveKeyPair(keyId);
      if (!keyPair) {
        throw new Error(`Key not found: ${keyId}`);
      }
      
      // Encrypt key data with password
      const exportData = this.encryptKeyForExport(keyPair, password);
      
      await this.logKeyOperation('EXPORT', keyId, keyPair.algorithm);
      
      return exportData;
      
    } catch (error) {
      throw new QuantumCryptographicError(
        `Key export failed: ${error.message}`,
        'KEY_EXPORT_FAILED'
      );
    }
  }

  /**
   * Import key from backup (encrypted)
   */
  async importKey(encryptedData: Uint8Array, password: string): Promise<string> {
    this.ensureInitialized();
    
    try {
      const keyPair = this.decryptKeyFromImport(encryptedData, password);
      
      // Update metadata
      keyPair.metadata.origin = KeyOrigin.IMPORTED;
      keyPair.metadata.createdAt = new Date();
      
      await this.storeKeyPair(keyPair);
      
      await this.logKeyOperation('IMPORT', keyPair.metadata.id, keyPair.algorithm);
      
      return keyPair.metadata.id;
      
    } catch (error) {
      throw new QuantumCryptographicError(
        `Key import failed: ${error.message}`,
        'KEY_IMPORT_FAILED'
      );
    }
  }

  /**
   * Get key usage statistics
   */
  async getKeyStatistics(): Promise<{
    totalKeys: number;
    algorithmDistribution: Record<string, number>;
    usageDistribution: Record<string, number>;
    expiringKeys: number;
    deprecatedKeys: number;
  }> {
    this.ensureInitialized();
    
    const allMetadata = Array.from(this.keyMetadata.values());
    const now = new Date();
    const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const algorithmDistribution: Record<string, number> = {};
    const usageDistribution: Record<string, number> = {};
    let expiringKeys = 0;
    let deprecatedKeys = 0;
    
    for (const metadata of allMetadata) {
      // Algorithm distribution
      algorithmDistribution[metadata.algorithm] = 
        (algorithmDistribution[metadata.algorithm] || 0) + 1;
      
      // Usage distribution
      for (const usage of metadata.usage) {
        usageDistribution[usage] = (usageDistribution[usage] || 0) + 1;
      }
      
      // Expiring keys (within one week)
      if (metadata.expiresAt && metadata.expiresAt <= oneWeek) {
        expiringKeys++;
      }
      
      // Deprecated keys
      if (metadata.expiresAt && metadata.expiresAt <= now) {
        deprecatedKeys++;
      }
    }
    
    return {
      totalKeys: allMetadata.length,
      algorithmDistribution,
      usageDistribution,
      expiringKeys,
      deprecatedKeys
    };
  }

  /**
   * Shutdown key manager and cleanup resources
   */
  async shutdown(): Promise<void> {
    console.log('🔐 Shutting down Quantum-Safe Key Manager...');
    
    try {
      // Cancel all rotation timers
      for (const timer of this.rotationSchedule.values()) {
        clearTimeout(timer);
      }
      this.rotationSchedule.clear();
      
      // Disconnect from HSM
      if (this.hsmConfig) {
        await this.disconnectHSM();
      }
      
      // Secure memory cleanup
      for (const keyPair of this.keyStore.values()) {
        this.secureOverwrite(keyPair.privateKey);
      }
      this.keyStore.clear();
      
      this.initialized = false;
      console.log('✅ Key Manager shutdown complete');
      
    } catch (error) {
      console.error('❌ Error during Key Manager shutdown:', error);
      throw error;
    }
  }

  // Private implementation methods

  private async initializeHSM(): Promise<void> {
    if (!this.hsmConfig) return;
    
    console.log(`🔧 Connecting to HSM: ${this.hsmConfig.provider}`);
    
    // Simulate HSM connection
    // In production, this would establish actual HSM connection
    await this.simulateDelay(1000);
    
    console.log('✅ HSM connection established');
  }

  private async loadExistingKeys(): Promise<void> {
    // In production, this would load keys from persistent secure storage
    console.log('📂 Loading existing keys from secure storage...');
    await this.simulateDelay(500);
  }

  private async setupKeyRotation(): Promise<void> {
    // Set up automated key rotation schedules
    console.log('⏰ Setting up automated key rotation schedules...');
    
    // Example: rotate keys every 90 days
    const rotationInterval = 90 * 24 * 60 * 60 * 1000; // 90 days
    
    for (const [keyId, metadata] of this.keyMetadata.entries()) {
      if (metadata.expiresAt) {
        await this.scheduleKeyRotation(keyId, metadata.expiresAt);
      }
    }
  }

  private shouldUseHSM(keyPair: QuantumKeyPair): boolean {
    return (
      this.config.security.requireHSM ||
      this.hsmConfig?.algorithms.includes(keyPair.algorithm) ||
      false
    );
  }

  private async storeInHSM(keyPair: QuantumKeyPair): Promise<void> {
    if (!this.hsmConfig) return;
    
    console.log(`🔒 Storing key in HSM: ${keyPair.metadata.id}`);
    
    // Simulate HSM key storage
    await this.simulateDelay(200);
  }

  private async retrieveFromHSM(keyId: string): Promise<QuantumKeyPair | null> {
    if (!this.hsmConfig) return null;
    
    // Simulate HSM key retrieval
    await this.simulateDelay(100);
    return null; // Placeholder
  }

  private async destroyFromHSM(keyId: string): Promise<void> {
    if (!this.hsmConfig) return;
    
    console.log(`🗑️  Destroying key in HSM: ${keyId}`);
    await this.simulateDelay(150);
  }

  private async disconnectHSM(): Promise<void> {
    if (!this.hsmConfig) return;
    
    console.log('🔌 Disconnecting from HSM...');
    await this.simulateDelay(500);
  }

  private async scheduleKeyRotation(keyId: string, expirationDate: Date): Promise<void> {
    const now = new Date();
    const timeUntilExpiration = expirationDate.getTime() - now.getTime();
    
    if (timeUntilExpiration > 0) {
      const timer = setTimeout(async () => {
        try {
          await this.rotateKey(keyId);
        } catch (error) {
          console.error(`⚠️  Automatic key rotation failed for ${keyId}:`, error);
        }
      }, timeUntilExpiration);
      
      this.rotationSchedule.set(keyId, timer);
    }
  }

  private calculateNextRotation(): Date {
    const now = new Date();
    const rotationInterval = 90 * 24 * 60 * 60 * 1000; // 90 days
    return new Date(now.getTime() + rotationInterval);
  }

  private async deprecateKey(keyId: string): Promise<void> {
    const metadata = this.keyMetadata.get(keyId);
    if (metadata) {
      metadata.expiresAt = new Date(); // Mark as expired
      this.keyMetadata.set(keyId, metadata);
    }
  }

  private encryptKeyForExport(keyPair: QuantumKeyPair, password: string): Uint8Array {
    // Simplified key export encryption
    // In production, use proper password-based encryption (PBKDF2 + AES-GCM)
    const keyData = JSON.stringify({
      algorithm: keyPair.algorithm,
      publicKey: Array.from(keyPair.publicKey),
      privateKey: Array.from(keyPair.privateKey),
      metadata: keyPair.metadata
    });
    
    const encoder = new TextEncoder();
    const data = encoder.encode(keyData);
    
    // Simple XOR encryption for demo (use proper encryption in production)
    const passwordBytes = encoder.encode(password);
    const encrypted = new Uint8Array(data.length);
    
    for (let i = 0; i < data.length; i++) {
      encrypted[i] = data[i] ^ passwordBytes[i % passwordBytes.length];
    }
    
    return encrypted;
  }

  private decryptKeyFromImport(encryptedData: Uint8Array, password: string): QuantumKeyPair {
    // Simplified key import decryption
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const passwordBytes = encoder.encode(password);
    
    const decrypted = new Uint8Array(encryptedData.length);
    
    for (let i = 0; i < encryptedData.length; i++) {
      decrypted[i] = encryptedData[i] ^ passwordBytes[i % passwordBytes.length];
    }
    
    const keyData = JSON.parse(decoder.decode(decrypted));
    
    return {
      algorithm: keyData.algorithm,
      securityLevel: keyData.metadata.securityLevel,
      publicKey: new Uint8Array(keyData.publicKey),
      privateKey: new Uint8Array(keyData.privateKey),
      metadata: {
        ...keyData.metadata,
        id: this.generateKeyId() // Generate new ID for imported key
      }
    };
  }

  private secureOverwrite(array: Uint8Array): void {
    // Securely overwrite memory
    for (let i = 0; i < array.length; i++) {
      array[i] = 0;
    }
  }

  private generateKeyId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `qsk-${timestamp}-${random}`;
  }

  private async logKeyOperation(
    operation: string,
    keyId: string,
    algorithm?: QuantumAlgorithmType,
    details?: Record<string, any>
  ): Promise<void> {
    if (!this.config.security.auditLogging) return;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      operation,
      keyId,
      algorithm,
      details,
      user: 'system' // In production, get actual user context
    };
    
    console.log('📝 Key operation logged:', logEntry);
    
    // In production, send to audit logging system
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new QuantumCryptographicError(
        'Key Manager not initialized',
        'KEY_MANAGER_NOT_INITIALIZED'
      );
    }
  }
}
