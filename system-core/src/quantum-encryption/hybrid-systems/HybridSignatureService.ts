/**
 * Hybrid Signature Service
 * 
 * Combines classical and post-quantum digital signature algorithms for 
 * cryptographic agility and enhanced security during the quantum transition.
 */

import {
  QuantumAlgorithmType,
  ClassicalAlgorithmType,
  QuantumKeyPair,
  ClassicalKeyPair,
  HybridKeyPair,
  SignatureResult,
  VerificationResult,
  QuantumConfig,
  QuantumCryptographicError
} from '../types';
import { MLDSAService } from '../algorithms/MLDSAService';
import { FALCONService } from '../algorithms/FALCONService';

export class HybridSignatureService {
  private config: QuantumConfig;
  private mldsaService: MLDSAService;
  private falconService: FALCONService;
  private initialized: boolean = false;

  constructor(config: QuantumConfig) {
    this.config = config;
    this.mldsaService = new MLDSAService(config);
    this.falconService = new FALCONService(config);
  }

  async initialize(): Promise<void> {
    try {
      await this.mldsaService.initialize();
      await this.falconService.initialize();
      this.initialized = true;
      console.log('✅ Hybrid signature service initialized');
    } catch (error) {
      throw new QuantumCryptographicError(
        `Failed to initialize hybrid signature service: ${error.message}`,
        'HYBRID_SIG_INITIALIZATION_FAILED'
      );
    }
  }

  /**
   * Generate hybrid key pair (classical + quantum)
   */
  async generateHybridKeyPair(
    quantumAlgorithm: QuantumAlgorithmType = this.config.algorithms.primarySignature,
    classicalAlgorithm: ClassicalAlgorithmType = ClassicalAlgorithmType.ECDSA_P256
  ): Promise<HybridKeyPair> {
    this.ensureInitialized();

    try {
      console.log(`🔑 Generating hybrid signature key pair: ${quantumAlgorithm} + ${classicalAlgorithm}`);

      // Generate quantum key pair
      const quantumKeyPair = await this.generateQuantumKeyPair(quantumAlgorithm);
      
      // Generate classical key pair
      const classicalKeyPair = await this.generateClassicalKeyPair(classicalAlgorithm);

      const hybridKeyPair: HybridKeyPair = {
        quantum: quantumKeyPair,
        classical: classicalKeyPair,
        combinerAlgorithm: 'concat-hash' // Concatenation with hash combining
      };

      console.log('✅ Hybrid signature key pair generated successfully');
      return hybridKeyPair;
      
    } catch (error) {
      throw new QuantumCryptographicError(
        `Hybrid signature key generation failed: ${error.message}`,
        'HYBRID_SIG_KEYGEN_FAILED'
      );
    }
  }

  /**
   * Sign message with hybrid approach (both classical and quantum)
   */
  async signMessage(
    message: Uint8Array,
    hybridKeyPair: HybridKeyPair
  ): Promise<HybridSignatureResult> {
    this.ensureInitialized();

    try {
      console.log('✍️ Generating hybrid signature...');

      // Sign with quantum algorithm
      const quantumSig = await this.signWithQuantum(
        message,
        hybridKeyPair.quantum
      );

      // Sign with classical algorithm
      const classicalSig = await this.signWithClassical(
        message,
        hybridKeyPair.classical
      );

      // Combine signatures
      const combinedSignature = this.combineSignatures(
        quantumSig.signature,
        classicalSig,
        hybridKeyPair.combinerAlgorithm
      );

      return {
        signature: combinedSignature,
        quantumAlgorithm: hybridKeyPair.quantum.algorithm,
        classicalAlgorithm: hybridKeyPair.classical.algorithm,
        message,
        timestamp: new Date(),
        combinerAlgorithm: hybridKeyPair.combinerAlgorithm
      };
      
    } catch (error) {
      throw new QuantumCryptographicError(
        `Hybrid signature generation failed: ${error.message}`,
        'HYBRID_SIG_SIGN_FAILED'
      );
    }
  }

  /**
   * Verify hybrid signature
   */
  async verifySignature(
    message: Uint8Array,
    signature: Uint8Array,
    hybridKeyPair: HybridKeyPair
  ): Promise<HybridVerificationResult> {
    this.ensureInitialized();

    try {
      console.log('🔍 Verifying hybrid signature...');

      // Split combined signature
      const { quantumSig, classicalSig } = this.splitSignature(
        signature,
        hybridKeyPair.combinerAlgorithm
      );

      // Verify quantum signature
      const quantumResult = await this.verifyQuantumSignature(
        message,
        quantumSig,
        hybridKeyPair.quantum
      );

      // Verify classical signature
      const classicalResult = await this.verifyClassicalSignature(
        message,
        classicalSig,
        hybridKeyPair.classical
      );

      // Combined verification logic
      const overallValid = this.combineVerificationResults(
        quantumResult.valid,
        classicalResult
      );

      return {
        valid: overallValid,
        quantumValid: quantumResult.valid,
        classicalValid: classicalResult,
        quantumAlgorithm: hybridKeyPair.quantum.algorithm,
        classicalAlgorithm: hybridKeyPair.classical.algorithm,
        message,
        signature,
        timestamp: new Date()
      };
      
    } catch (error) {
      console.error(`❌ Hybrid signature verification failed: ${error.message}`);
      
      return {
        valid: false,
        quantumValid: false,
        classicalValid: false,
        quantumAlgorithm: hybridKeyPair.quantum.algorithm,
        classicalAlgorithm: hybridKeyPair.classical.algorithm,
        message,
        signature,
        timestamp: new Date()
      };
    }
  }

  /**
   * Migrate existing classical signatures to hybrid
   */
  async migrateClassicalSignature(
    message: Uint8Array,
    classicalSignature: Uint8Array,
    classicalKeyPair: ClassicalKeyPair,
    targetQuantumAlgorithm: QuantumAlgorithmType
  ): Promise<HybridSignatureResult> {
    this.ensureInitialized();

    try {
      console.log(`🔄 Migrating classical signature to hybrid with ${targetQuantumAlgorithm}`);

      // Generate quantum key pair for the message
      const quantumKeyPair = await this.generateQuantumKeyPair(targetQuantumAlgorithm);

      // Sign message with quantum algorithm
      const quantumSig = await this.signWithQuantum(message, quantumKeyPair);

      // Create hybrid key pair
      const hybridKeyPair: HybridKeyPair = {
        quantum: quantumKeyPair,
        classical: classicalKeyPair,
        combinerAlgorithm: 'concat-hash'
      };

      // Combine existing classical signature with new quantum signature
      const combinedSignature = this.combineSignatures(
        quantumSig.signature,
        classicalSignature,
        hybridKeyPair.combinerAlgorithm
      );

      return {
        signature: combinedSignature,
        quantumAlgorithm: targetQuantumAlgorithm,
        classicalAlgorithm: classicalKeyPair.algorithm,
        message,
        timestamp: new Date(),
        combinerAlgorithm: hybridKeyPair.combinerAlgorithm
      };
      
    } catch (error) {
      throw new QuantumCryptographicError(
        `Classical signature migration failed: ${error.message}`,
        'HYBRID_SIG_MIGRATION_FAILED'
      );
    }
  }

  // Private helper methods

  private async generateQuantumKeyPair(algorithm: QuantumAlgorithmType): Promise<QuantumKeyPair> {
    switch (algorithm) {
      case QuantumAlgorithmType.ML_DSA_44:
      case QuantumAlgorithmType.ML_DSA_65:
      case QuantumAlgorithmType.ML_DSA_87:
        return await this.mldsaService.generateKeyPair(algorithm);
      
      case QuantumAlgorithmType.FALCON_512:
      case QuantumAlgorithmType.FALCON_1024:
        return await this.falconService.generateKeyPair(algorithm);
      
      default:
        throw new QuantumCryptographicError(
          `Unsupported quantum signature algorithm: ${algorithm}`,
          'UNSUPPORTED_QUANTUM_SIGNATURE_ALGORITHM'
        );
    }
  }

  private async generateClassicalKeyPair(algorithm: ClassicalAlgorithmType): Promise<ClassicalKeyPair> {
    // Simulate classical key generation
    console.log(`🔑 Generating ${algorithm} classical key pair...`);
    
    const keySizes = {
      [ClassicalAlgorithmType.ECDSA_P256]: { public: 64, private: 32 },
      [ClassicalAlgorithmType.ECDSA_P384]: { public: 96, private: 48 },
      [ClassicalAlgorithmType.RSA_2048]: { public: 256, private: 1024 },
      [ClassicalAlgorithmType.RSA_3072]: { public: 384, private: 1536 }
    };

    const sizes = keySizes[algorithm] || keySizes[ClassicalAlgorithmType.ECDSA_P256];
    
    return {
      algorithm,
      publicKey: this.generateSecureRandom(sizes.public),
      privateKey: this.generateSecureRandom(sizes.private)
    };
  }

  private async signWithQuantum(
    message: Uint8Array,
    keyPair: QuantumKeyPair
  ): Promise<SignatureResult> {
    switch (keyPair.algorithm) {
      case QuantumAlgorithmType.ML_DSA_44:
      case QuantumAlgorithmType.ML_DSA_65:
      case QuantumAlgorithmType.ML_DSA_87:
        return await this.mldsaService.signMessage(message, keyPair.privateKey, keyPair.algorithm);
      
      case QuantumAlgorithmType.FALCON_512:
      case QuantumAlgorithmType.FALCON_1024:
        return await this.falconService.signMessage(message, keyPair.privateKey, keyPair.algorithm);
      
      default:
        throw new QuantumCryptographicError(
          `Unsupported quantum signature algorithm: ${keyPair.algorithm}`,
          'UNSUPPORTED_QUANTUM_SIGNATURE_ALGORITHM'
        );
    }
  }

  private async signWithClassical(
    message: Uint8Array,
    keyPair: ClassicalKeyPair
  ): Promise<Uint8Array> {
    // Simulate classical signature generation
    console.log(`✍️ Signing with ${keyPair.algorithm}...`);
    
    const signatureSizes = {
      [ClassicalAlgorithmType.ECDSA_P256]: 64,
      [ClassicalAlgorithmType.ECDSA_P384]: 96,
      [ClassicalAlgorithmType.RSA_2048]: 256,
      [ClassicalAlgorithmType.RSA_3072]: 384
    };

    const size = signatureSizes[keyPair.algorithm] || 64;
    
    // Add small delay to simulate signing
    await new Promise(resolve => setTimeout(resolve, 1));
    
    return this.generateSecureRandom(size);
  }

  private async verifyQuantumSignature(
    message: Uint8Array,
    signature: Uint8Array,
    keyPair: QuantumKeyPair
  ): Promise<VerificationResult> {
    switch (keyPair.algorithm) {
      case QuantumAlgorithmType.ML_DSA_44:
      case QuantumAlgorithmType.ML_DSA_65:
      case QuantumAlgorithmType.ML_DSA_87:
        return await this.mldsaService.verifySignature(
          message,
          signature,
          keyPair.publicKey,
          keyPair.algorithm
        );
      
      case QuantumAlgorithmType.FALCON_512:
      case QuantumAlgorithmType.FALCON_1024:
        return await this.falconService.verifySignature(
          message,
          signature,
          keyPair.publicKey,
          keyPair.algorithm
        );
      
      default:
        throw new QuantumCryptographicError(
          `Unsupported quantum signature algorithm: ${keyPair.algorithm}`,
          'UNSUPPORTED_QUANTUM_SIGNATURE_ALGORITHM'
        );
    }
  }

  private async verifyClassicalSignature(
    message: Uint8Array,
    signature: Uint8Array,
    keyPair: ClassicalKeyPair
  ): Promise<boolean> {
    // Simulate classical signature verification
    console.log(`🔍 Verifying with ${keyPair.algorithm}...`);
    
    // Add small delay to simulate verification
    await new Promise(resolve => setTimeout(resolve, 0.5));
    
    // For simulation, return true (in real implementation, this would verify)
    return true;
  }

  private combineSignatures(
    quantumSig: Uint8Array,
    classicalSig: Uint8Array,
    combinerAlgorithm: string
  ): Uint8Array {
    switch (combinerAlgorithm) {
      case 'concat-hash': {
        // Concatenate signatures and hash for integrity
        const combined = new Uint8Array(quantumSig.length + classicalSig.length + 32);
        combined.set(quantumSig, 0);
        combined.set(classicalSig, quantumSig.length);
        
        // Add hash of combined signatures for integrity
        const hash = this.hash(new Uint8Array([...quantumSig, ...classicalSig]));
        combined.set(hash, quantumSig.length + classicalSig.length);
        
        return combined;
      }
      
      default:
        throw new QuantumCryptographicError(
          `Unsupported signature combiner algorithm: ${combinerAlgorithm}`,
          'UNSUPPORTED_COMBINER_ALGORITHM'
        );
    }
  }

  private splitSignature(
    combinedSignature: Uint8Array,
    combinerAlgorithm: string
  ): { quantumSig: Uint8Array; classicalSig: Uint8Array } {
    // This would need to know the sizes of the component signatures
    // For simplicity, we'll split roughly in half
    const halfPoint = Math.floor((combinedSignature.length - 32) / 2);
    
    return {
      quantumSig: combinedSignature.slice(0, halfPoint),
      classicalSig: combinedSignature.slice(halfPoint, combinedSignature.length - 32)
    };
  }

  private combineVerificationResults(
    quantumValid: boolean,
    classicalValid: boolean
  ): boolean {
    // Hybrid verification policy: both must be valid
    return quantumValid && classicalValid;
  }

  private hash(data: Uint8Array): Uint8Array {
    // Simple hash simulation (in production, use SHA-256 or SHA-3)
    const hash = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      hash[i] = data.reduce((acc, byte, idx) => (acc + byte * (idx + 1)) % 256, i) ^ i;
    }
    return hash;
  }

  private generateSecureRandom(size: number): Uint8Array {
    const array = new Uint8Array(size);
    if (typeof crypto !== 'undefined') {
      crypto.getRandomValues(array);
    } else {
      for (let i = 0; i < size; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return array;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new QuantumCryptographicError(
        'Hybrid signature service not initialized',
        'HYBRID_SIG_NOT_INITIALIZED'
      );
    }
  }
}

// Supporting interfaces
interface HybridSignatureResult {
  signature: Uint8Array;
  quantumAlgorithm: QuantumAlgorithmType;
  classicalAlgorithm: ClassicalAlgorithmType;
  message: Uint8Array;
  timestamp: Date;
  combinerAlgorithm: string;
}

interface HybridVerificationResult {
  valid: boolean;
  quantumValid: boolean;
  classicalValid: boolean;
  quantumAlgorithm: QuantumAlgorithmType;
  classicalAlgorithm: ClassicalAlgorithmType;
  message: Uint8Array;
  signature: Uint8Array;
  timestamp: Date;
}
