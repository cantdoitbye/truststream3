/**
 * TrustStram v4.4 Quantum Encryption Service
 * 
 * Main orchestrator for quantum-safe cryptographic operations implementing
 * NIST-standardized post-quantum algorithms with hybrid classical+PQC support.
 * 
 * Features:
 * - ML-KEM-768 key encapsulation (20,500x faster than RSA)
 * - ML-DSA-65 digital signatures (2-36x faster verification)
 * - Hybrid encryption systems for seamless migration
 * - Cryptographic agility for future algorithm transitions
 * - Performance monitoring and benchmarking
 * 
 * @version 4.4.0
 */

import {
  QuantumAlgorithmType,
  QuantumKeyPair,
  EncapsulationResult,
  DecapsulationResult,
  SignatureResult,
  VerificationResult,
  QuantumConfig,
  PerformanceMetrics,
  CryptographicOperation,
  QuantumCryptographicError
} from './types';

import { defaultQuantumConfig } from './config';
import { MLKEMService } from './algorithms/MLKEMService';
import { MLDSAService } from './algorithms/MLDSAService';
import { FALCONService } from './algorithms/FALCONService';
import { SPHINCSPlusService } from './algorithms/SPHINCSPlusService';
import { HybridKEMService } from './hybrid-systems/HybridKEMService';
import { HybridSignatureService } from './hybrid-systems/HybridSignatureService';
import { QuantumSafeKeyManager } from './key-management/QuantumSafeKeyManager';
import { PerformanceBenchmark } from './performance-monitoring/PerformanceBenchmark';
import { QuantumMetricsCollector } from './performance-monitoring/QuantumMetricsCollector';

/**
 * Main Quantum Encryption Service providing unified interface for all
 * quantum-safe cryptographic operations with performance monitoring and
 * migration support.
 */
export class QuantumEncryptionService {
  private config: QuantumConfig;
  private mlkemService: MLKEMService;
  private mldsaService: MLDSAService;
  private falconService: FALCONService;
  private sphincsService: SPHINCSPlusService;
  private hybridKEMService: HybridKEMService;
  private hybridSignatureService: HybridSignatureService;
  private keyManager: QuantumSafeKeyManager;
  private performanceBenchmark: PerformanceBenchmark;
  private metricsCollector: QuantumMetricsCollector;
  private initialized: boolean = false;

  constructor(config: QuantumConfig = defaultQuantumConfig) {
    this.config = config;
    this.mlkemService = new MLKEMService(config);
    this.mldsaService = new MLDSAService(config);
    this.falconService = new FALCONService(config);
    this.sphincsService = new SPHINCSPlusService(config);
    this.hybridKEMService = new HybridKEMService(config);
    this.hybridSignatureService = new HybridSignatureService(config);
    this.keyManager = new QuantumSafeKeyManager(config);
    this.performanceBenchmark = new PerformanceBenchmark(config);
    this.metricsCollector = new QuantumMetricsCollector(config);
  }

  /**
   * Initialize the quantum encryption service and all dependencies
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔐 Initializing TrustStram v4.4 Quantum Encryption Service...');
      
      // Initialize core algorithm services
      await this.mlkemService.initialize();
      await this.mldsaService.initialize();
      await this.falconService.initialize();
      await this.sphincsService.initialize();
      
      // Initialize hybrid systems
      await this.hybridKEMService.initialize();
      await this.hybridSignatureService.initialize();
      
      // Initialize key management
      await this.keyManager.initialize();
      
      // Initialize monitoring
      if (this.config.performance.enableBenchmarking) {
        await this.performanceBenchmark.initialize();
      }
      
      if (this.config.performance.metricsCollection) {
        await this.metricsCollector.initialize();
      }
      
      this.initialized = true;
      console.log('✅ Quantum Encryption Service initialized successfully');
      
      // Log algorithm capabilities
      this.logAlgorithmCapabilities();
      
    } catch (error) {
      const message = `Failed to initialize Quantum Encryption Service: ${error.message}`;
      console.error('❌', message);
      throw new QuantumCryptographicError(
        message,
        'INITIALIZATION_FAILED',
        undefined,
        undefined,
        { originalError: error }
      );
    }
  }

  /**
   * Generate a quantum-safe key pair for the specified algorithm
   */
  async generateKeyPair(algorithm: QuantumAlgorithmType): Promise<QuantumKeyPair> {
    this.ensureInitialized();
    
    const startTime = Date.now();
    
    try {
      let keyPair: QuantumKeyPair;
      
      switch (algorithm) {
        case QuantumAlgorithmType.ML_KEM_512:
        case QuantumAlgorithmType.ML_KEM_768:
        case QuantumAlgorithmType.ML_KEM_1024:
          keyPair = await this.mlkemService.generateKeyPair(algorithm);
          break;
          
        case QuantumAlgorithmType.ML_DSA_44:
        case QuantumAlgorithmType.ML_DSA_65:
        case QuantumAlgorithmType.ML_DSA_87:
          keyPair = await this.mldsaService.generateKeyPair(algorithm);
          break;
          
        case QuantumAlgorithmType.FALCON_512:
        case QuantumAlgorithmType.FALCON_1024:
          keyPair = await this.falconService.generateKeyPair(algorithm);
          break;
          
        case QuantumAlgorithmType.SPHINCS_PLUS_SHA2_128S:
        case QuantumAlgorithmType.SPHINCS_PLUS_SHA2_192S:
        case QuantumAlgorithmType.SPHINCS_PLUS_SHA2_256S:
          keyPair = await this.sphincsService.generateKeyPair(algorithm);
          break;
          
        default:
          throw new QuantumCryptographicError(
            `Unsupported algorithm: ${algorithm}`,
            'UNSUPPORTED_ALGORITHM',
            algorithm,
            CryptographicOperation.KEY_GENERATION
          );
      }
      
      // Store key pair in key manager
      await this.keyManager.storeKeyPair(keyPair);
      
      // Record performance metrics
      if (this.config.performance.metricsCollection) {
        const duration = Date.now() - startTime;
        await this.metricsCollector.recordMetric({
          operation: CryptographicOperation.KEY_GENERATION,
          algorithm,
          duration: duration * 1000, // convert to microseconds
          memoryUsage: this.estimateMemoryUsage(keyPair),
          timestamp: new Date()
        });
      }
      
      return keyPair;
      
    } catch (error) {
      throw new QuantumCryptographicError(
        `Key generation failed for ${algorithm}: ${error.message}`,
        'KEY_GENERATION_FAILED',
        algorithm,
        CryptographicOperation.KEY_GENERATION,
        { originalError: error }
      );
    }
  }

  /**
   * Encapsulate a shared secret using quantum-safe KEM
   */
  async encapsulate(publicKey: Uint8Array, algorithm: QuantumAlgorithmType): Promise<EncapsulationResult> {
    this.ensureInitialized();
    
    const startTime = Date.now();
    
    try {
      let result: EncapsulationResult;
      
      // Use hybrid KEM if enabled
      if (this.config.algorithms.hybridMode && this.isKEMAlgorithm(algorithm)) {
        result = await this.hybridKEMService.encapsulate(publicKey, algorithm);
      } else {
        switch (algorithm) {
          case QuantumAlgorithmType.ML_KEM_512:
          case QuantumAlgorithmType.ML_KEM_768:
          case QuantumAlgorithmType.ML_KEM_1024:
            result = await this.mlkemService.encapsulate(publicKey, algorithm);
            break;
            
          default:
            throw new QuantumCryptographicError(
              `Unsupported KEM algorithm: ${algorithm}`,
              'UNSUPPORTED_KEM_ALGORITHM',
              algorithm,
              CryptographicOperation.ENCAPSULATION
            );
        }
      }
      
      // Record performance metrics
      if (this.config.performance.metricsCollection) {
        const duration = Date.now() - startTime;
        await this.metricsCollector.recordMetric({
          operation: CryptographicOperation.ENCAPSULATION,
          algorithm,
          duration: duration * 1000,
          memoryUsage: result.ciphertext.length + result.sharedSecret.length,
          timestamp: new Date()
        });
      }
      
      return result;
      
    } catch (error) {
      throw new QuantumCryptographicError(
        `Encapsulation failed for ${algorithm}: ${error.message}`,
        'ENCAPSULATION_FAILED',
        algorithm,
        CryptographicOperation.ENCAPSULATION,
        { originalError: error }
      );
    }
  }

  /**
   * Decapsulate a shared secret using quantum-safe KEM
   */
  async decapsulate(
    ciphertext: Uint8Array,
    privateKey: Uint8Array,
    algorithm: QuantumAlgorithmType
  ): Promise<DecapsulationResult> {
    this.ensureInitialized();
    
    const startTime = Date.now();
    
    try {
      let result: DecapsulationResult;
      
      // Use hybrid KEM if enabled
      if (this.config.algorithms.hybridMode && this.isKEMAlgorithm(algorithm)) {
        result = await this.hybridKEMService.decapsulate(ciphertext, privateKey, algorithm);
      } else {
        switch (algorithm) {
          case QuantumAlgorithmType.ML_KEM_512:
          case QuantumAlgorithmType.ML_KEM_768:
          case QuantumAlgorithmType.ML_KEM_1024:
            result = await this.mlkemService.decapsulate(ciphertext, privateKey, algorithm);
            break;
            
          default:
            throw new QuantumCryptographicError(
              `Unsupported KEM algorithm: ${algorithm}`,
              'UNSUPPORTED_KEM_ALGORITHM',
              algorithm,
              CryptographicOperation.DECAPSULATION
            );
        }
      }
      
      // Record performance metrics
      if (this.config.performance.metricsCollection) {
        const duration = Date.now() - startTime;
        await this.metricsCollector.recordMetric({
          operation: CryptographicOperation.DECAPSULATION,
          algorithm,
          duration: duration * 1000,
          memoryUsage: result.sharedSecret.length,
          timestamp: new Date()
        });
      }
      
      return result;
      
    } catch (error) {
      throw new QuantumCryptographicError(
        `Decapsulation failed for ${algorithm}: ${error.message}`,
        'DECAPSULATION_FAILED',
        algorithm,
        CryptographicOperation.DECAPSULATION,
        { originalError: error }
      );
    }
  }

  /**
   * Create a quantum-safe digital signature
   */
  async sign(
    message: Uint8Array,
    privateKey: Uint8Array,
    algorithm: QuantumAlgorithmType
  ): Promise<SignatureResult> {
    this.ensureInitialized();
    
    const startTime = Date.now();
    
    try {
      let result: SignatureResult;
      
      // Use hybrid signature if enabled
      if (this.config.algorithms.hybridMode && this.isSignatureAlgorithm(algorithm)) {
        result = await this.hybridSignatureService.sign(message, privateKey, algorithm);
      } else {
        switch (algorithm) {
          case QuantumAlgorithmType.ML_DSA_44:
          case QuantumAlgorithmType.ML_DSA_65:
          case QuantumAlgorithmType.ML_DSA_87:
            result = await this.mldsaService.sign(message, privateKey, algorithm);
            break;
            
          case QuantumAlgorithmType.FALCON_512:
          case QuantumAlgorithmType.FALCON_1024:
            result = await this.falconService.sign(message, privateKey, algorithm);
            break;
            
          case QuantumAlgorithmType.SPHINCS_PLUS_SHA2_128S:
          case QuantumAlgorithmType.SPHINCS_PLUS_SHA2_192S:
          case QuantumAlgorithmType.SPHINCS_PLUS_SHA2_256S:
            result = await this.sphincsService.sign(message, privateKey, algorithm);
            break;
            
          default:
            throw new QuantumCryptographicError(
              `Unsupported signature algorithm: ${algorithm}`,
              'UNSUPPORTED_SIGNATURE_ALGORITHM',
              algorithm,
              CryptographicOperation.SIGNATURE_GENERATION
            );
        }
      }
      
      // Record performance metrics
      if (this.config.performance.metricsCollection) {
        const duration = Date.now() - startTime;
        await this.metricsCollector.recordMetric({
          operation: CryptographicOperation.SIGNATURE_GENERATION,
          algorithm,
          duration: duration * 1000,
          memoryUsage: result.signature.length + message.length,
          timestamp: new Date()
        });
      }
      
      return result;
      
    } catch (error) {
      throw new QuantumCryptographicError(
        `Signature generation failed for ${algorithm}: ${error.message}`,
        'SIGNATURE_GENERATION_FAILED',
        algorithm,
        CryptographicOperation.SIGNATURE_GENERATION,
        { originalError: error }
      );
    }
  }

  /**
   * Verify a quantum-safe digital signature
   */
  async verify(
    message: Uint8Array,
    signature: Uint8Array,
    publicKey: Uint8Array,
    algorithm: QuantumAlgorithmType
  ): Promise<VerificationResult> {
    this.ensureInitialized();
    
    const startTime = Date.now();
    
    try {
      let result: VerificationResult;
      
      // Use hybrid signature if enabled
      if (this.config.algorithms.hybridMode && this.isSignatureAlgorithm(algorithm)) {
        result = await this.hybridSignatureService.verify(message, signature, publicKey, algorithm);
      } else {
        switch (algorithm) {
          case QuantumAlgorithmType.ML_DSA_44:
          case QuantumAlgorithmType.ML_DSA_65:
          case QuantumAlgorithmType.ML_DSA_87:
            result = await this.mldsaService.verify(message, signature, publicKey, algorithm);
            break;
            
          case QuantumAlgorithmType.FALCON_512:
          case QuantumAlgorithmType.FALCON_1024:
            result = await this.falconService.verify(message, signature, publicKey, algorithm);
            break;
            
          case QuantumAlgorithmType.SPHINCS_PLUS_SHA2_128S:
          case QuantumAlgorithmType.SPHINCS_PLUS_SHA2_192S:
          case QuantumAlgorithmType.SPHINCS_PLUS_SHA2_256S:
            result = await this.sphincsService.verify(message, signature, publicKey, algorithm);
            break;
            
          default:
            throw new QuantumCryptographicError(
              `Unsupported signature algorithm: ${algorithm}`,
              'UNSUPPORTED_SIGNATURE_ALGORITHM',
              algorithm,
              CryptographicOperation.SIGNATURE_VERIFICATION
            );
        }
      }
      
      // Record performance metrics
      if (this.config.performance.metricsCollection) {
        const duration = Date.now() - startTime;
        await this.metricsCollector.recordMetric({
          operation: CryptographicOperation.SIGNATURE_VERIFICATION,
          algorithm,
          duration: duration * 1000,
          memoryUsage: signature.length + message.length + publicKey.length,
          timestamp: new Date()
        });
      }
      
      return result;
      
    } catch (error) {
      throw new QuantumCryptographicError(
        `Signature verification failed for ${algorithm}: ${error.message}`,
        'SIGNATURE_VERIFICATION_FAILED',
        algorithm,
        CryptographicOperation.SIGNATURE_VERIFICATION,
        { originalError: error }
      );
    }
  }

  /**
   * Run performance benchmark for specified algorithm
   */
  async benchmark(algorithm: QuantumAlgorithmType, iterations: number = 1000) {
    this.ensureInitialized();
    
    if (!this.config.performance.enableBenchmarking) {
      throw new QuantumCryptographicError(
        'Benchmarking is disabled in configuration',
        'BENCHMARKING_DISABLED'
      );
    }
    
    return await this.performanceBenchmark.runBenchmark(algorithm, iterations);
  }

  /**
   * Get performance metrics for specified algorithm and operation
   */
  async getMetrics(
    algorithm?: QuantumAlgorithmType,
    operation?: CryptographicOperation,
    timeRange?: { start: Date; end: Date }
  ): Promise<PerformanceMetrics[]> {
    this.ensureInitialized();
    
    return await this.metricsCollector.getMetrics(algorithm, operation, timeRange);
  }

  /**
   * Get supported algorithms
   */
  getSupportedAlgorithms(): QuantumAlgorithmType[] {
    return Object.values(QuantumAlgorithmType);
  }

  /**
   * Get current configuration
   */
  getConfiguration(): QuantumConfig {
    return { ...this.config }; // Return copy to prevent modification
  }

  /**
   * Update configuration (requires reinitialization)
   */
  async updateConfiguration(newConfig: Partial<QuantumConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    this.initialized = false;
    await this.initialize();
  }

  /**
   * Shutdown the service and cleanup resources
   */
  async shutdown(): Promise<void> {
    console.log('🔐 Shutting down Quantum Encryption Service...');
    
    try {
      await this.metricsCollector.shutdown();
      await this.performanceBenchmark.shutdown();
      await this.keyManager.shutdown();
      
      this.initialized = false;
      console.log('✅ Quantum Encryption Service shutdown complete');
      
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      throw error;
    }
  }

  // Private helper methods
  
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new QuantumCryptographicError(
        'Service not initialized. Call initialize() first.',
        'SERVICE_NOT_INITIALIZED'
      );
    }
  }

  private isKEMAlgorithm(algorithm: QuantumAlgorithmType): boolean {
    return [
      QuantumAlgorithmType.ML_KEM_512,
      QuantumAlgorithmType.ML_KEM_768,
      QuantumAlgorithmType.ML_KEM_1024
    ].includes(algorithm);
  }

  private isSignatureAlgorithm(algorithm: QuantumAlgorithmType): boolean {
    return [
      QuantumAlgorithmType.ML_DSA_44,
      QuantumAlgorithmType.ML_DSA_65,
      QuantumAlgorithmType.ML_DSA_87,
      QuantumAlgorithmType.FALCON_512,
      QuantumAlgorithmType.FALCON_1024,
      QuantumAlgorithmType.SPHINCS_PLUS_SHA2_128S,
      QuantumAlgorithmType.SPHINCS_PLUS_SHA2_192S,
      QuantumAlgorithmType.SPHINCS_PLUS_SHA2_256S
    ].includes(algorithm);
  }

  private estimateMemoryUsage(keyPair: QuantumKeyPair): number {
    return keyPair.publicKey.length + keyPair.privateKey.length + 1024; // Add overhead
  }

  private logAlgorithmCapabilities(): void {
    console.log('🔐 Quantum-Safe Algorithm Capabilities:');
    console.log('   📊 Key Encapsulation Mechanisms (KEM):');
    console.log('      • ML-KEM-512: Security Level I (128-bit equivalent)');
    console.log('      • ML-KEM-768: Security Level III (192-bit equivalent) [RECOMMENDED]');
    console.log('      • ML-KEM-1024: Security Level V (256-bit equivalent)');
    console.log('   ✍️  Digital Signature Algorithms:');
    console.log('      • ML-DSA-44: Security Level II (128-bit equivalent)');
    console.log('      • ML-DSA-65: Security Level III (192-bit equivalent) [RECOMMENDED]');
    console.log('      • ML-DSA-87: Security Level V (256-bit equivalent)');
    console.log('      • FALCON-512: Compact signatures, Security Level I');
    console.log('      • FALCON-1024: Compact signatures, Security Level V');
    console.log('      • SPHINCS+-SHA2: Hash-based backup signatures');
    console.log('   🔄 Hybrid Systems: Enabled for seamless migration');
    console.log('   ⚡ Performance: ML-KEM 20,500x faster than RSA, ML-DSA 2-36x faster verification');
  }
}
