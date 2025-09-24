/**
 * TrustStram v4.4 Quantum-Ready Encryption Configuration
 * 
 * Centralized configuration for quantum-safe cryptographic operations based on
 * NIST standards and performance benchmarks from research findings.
 */

import {
  QuantumConfig,
  QuantumAlgorithmType,
  SecurityLevel,
  ComplianceMode,
  MigrationMode,
  HSMProvider
} from './types';

/**
 * Default configuration based on research recommendations:
 * - ML-KEM-768 for general encryption (20,500x faster than RSA)
 * - ML-DSA-65 for digital signatures (2-36x faster verification)
 * - Hybrid mode enabled for smooth transition
 * - Performance thresholds based on benchmark data
 */
export const defaultQuantumConfig: QuantumConfig = {
  algorithms: {
    primaryKEM: QuantumAlgorithmType.ML_KEM_768,
    primarySignature: QuantumAlgorithmType.ML_DSA_65,
    fallbackKEM: QuantumAlgorithmType.ML_KEM_512,
    fallbackSignature: QuantumAlgorithmType.FALCON_512,
    hybridMode: true,
    classicalFallback: true
  },
  
  performance: {
    enableBenchmarking: true,
    metricsCollection: true,
    performanceThresholds: {
      maxKeyGenerationTime: 10, // milliseconds (ML-KEM-768 avg: 7.4ms)
      maxEncapsulationTime: 1,   // milliseconds
      maxSignatureTime: 5,       // milliseconds
      maxVerificationTime: 2,    // milliseconds
      maxMemoryUsage: 10485760   // 10MB
    },
    optimization: {
      enableHardwareAcceleration: true,
      enableCaching: true,
      connectionPooling: true,
      batchOperations: true
    }
  },
  
  security: {
    enforceQuantumSafe: false, // Gradual migration approach
    allowClassicalFallback: true,
    requireHSM: false,
    auditLogging: true,
    complianceMode: ComplianceMode.NIST_SP_800_56C
  },
  
  migration: {
    enableAutomaticMigration: false,
    migrationMode: MigrationMode.GRADUAL,
    rollbackSupport: true,
    testingRequired: true
  },
  
  monitoring: {
    enableRealTimeMonitoring: true,
    metricsRetention: 90, // days
    alertThresholds: {
      performanceDegradation: 25, // percentage
      errorRate: 1, // percentage
      securityViolations: 5, // count per hour
      systemLoad: 80 // percentage
    },
    reportingInterval: 5 // minutes
  }
};

/**
 * High-security configuration for defense/financial sectors
 */
export const highSecurityConfig: QuantumConfig = {
  ...defaultQuantumConfig,
  algorithms: {
    primaryKEM: QuantumAlgorithmType.ML_KEM_1024,
    primarySignature: QuantumAlgorithmType.ML_DSA_87,
    fallbackKEM: QuantumAlgorithmType.ML_KEM_768,
    fallbackSignature: QuantumAlgorithmType.SPHINCS_PLUS_SHA2_256S,
    hybridMode: true,
    classicalFallback: false
  },
  security: {
    enforceQuantumSafe: true,
    allowClassicalFallback: false,
    requireHSM: true,
    auditLogging: true,
    complianceMode: ComplianceMode.FIPS_140_2
  },
  monitoring: {
    enableRealTimeMonitoring: true,
    metricsRetention: 365, // 1 year
    alertThresholds: {
      performanceDegradation: 10,
      errorRate: 0.1,
      securityViolations: 1,
      systemLoad: 70
    },
    reportingInterval: 1 // minute
  }
};

/**
 * Performance-optimized configuration for high-throughput applications
 */
export const performanceOptimizedConfig: QuantumConfig = {
  ...defaultQuantumConfig,
  algorithms: {
    primaryKEM: QuantumAlgorithmType.ML_KEM_512,
    primarySignature: QuantumAlgorithmType.FALCON_512,
    fallbackKEM: QuantumAlgorithmType.ML_KEM_768,
    fallbackSignature: QuantumAlgorithmType.ML_DSA_44,
    hybridMode: false, // Pure PQC for maximum performance
    classicalFallback: true
  },
  performance: {
    enableBenchmarking: true,
    metricsCollection: true,
    performanceThresholds: {
      maxKeyGenerationTime: 5,
      maxEncapsulationTime: 0.5,
      maxSignatureTime: 2,
      maxVerificationTime: 1,
      maxMemoryUsage: 5242880 // 5MB
    },
    optimization: {
      enableHardwareAcceleration: true,
      enableCaching: true,
      connectionPooling: true,
      batchOperations: true
    }
  }
};

/**
 * Development/testing configuration with comprehensive monitoring
 */
export const developmentConfig: QuantumConfig = {
  ...defaultQuantumConfig,
  performance: {
    enableBenchmarking: true,
    metricsCollection: true,
    performanceThresholds: {
      maxKeyGenerationTime: 100, // Relaxed for development
      maxEncapsulationTime: 10,
      maxSignatureTime: 50,
      maxVerificationTime: 20,
      maxMemoryUsage: 52428800 // 50MB
    },
    optimization: {
      enableHardwareAcceleration: false, // For consistency across dev environments
      enableCaching: false,
      connectionPooling: false,
      batchOperations: false
    }
  },
  monitoring: {
    enableRealTimeMonitoring: true,
    metricsRetention: 30,
    alertThresholds: {
      performanceDegradation: 50,
      errorRate: 5,
      securityViolations: 20,
      systemLoad: 90
    },
    reportingInterval: 1
  }
};

/**
 * Algorithm-specific configurations based on research performance data
 */
export const algorithmConfigs = {
  [QuantumAlgorithmType.ML_KEM_512]: {
    securityLevel: SecurityLevel.LEVEL_I,
    publicKeySize: 800,
    privateKeySize: 1632,
    ciphertextSize: 768,
    sharedSecretSize: 32,
    expectedPerformance: {
      keyGeneration: 5.2, // milliseconds (x86_64)
      encapsulation: 0.15,
      decapsulation: 0.17
    }
  },
  
  [QuantumAlgorithmType.ML_KEM_768]: {
    securityLevel: SecurityLevel.LEVEL_III,
    publicKeySize: 1184,
    privateKeySize: 2400,
    ciphertextSize: 1088,
    sharedSecretSize: 32,
    expectedPerformance: {
      keyGeneration: 7.4, // milliseconds (x86_64)
      encapsulation: 0.21,
      decapsulation: 0.24
    }
  },
  
  [QuantumAlgorithmType.ML_KEM_1024]: {
    securityLevel: SecurityLevel.LEVEL_V,
    publicKeySize: 1568,
    privateKeySize: 3168,
    ciphertextSize: 1568,
    sharedSecretSize: 32,
    expectedPerformance: {
      keyGeneration: 10.1, // milliseconds (x86_64)
      encapsulation: 0.28,
      decapsulation: 0.33
    }
  },
  
  [QuantumAlgorithmType.ML_DSA_44]: {
    securityLevel: SecurityLevel.LEVEL_I,
    publicKeySize: 1312,
    privateKeySize: 2560,
    signatureSize: 2420,
    expectedPerformance: {
      signing: 1.2, // milliseconds
      verification: 0.018 // milliseconds (552K ops/10s)
    }
  },
  
  [QuantumAlgorithmType.ML_DSA_65]: {
    securityLevel: SecurityLevel.LEVEL_III,
    publicKeySize: 1952,
    privateKeySize: 4032,
    signatureSize: 3309,
    expectedPerformance: {
      signing: 1.8, // milliseconds
      verification: 0.024 // milliseconds (412K ops/10s)
    }
  },
  
  [QuantumAlgorithmType.ML_DSA_87]: {
    securityLevel: SecurityLevel.LEVEL_V,
    publicKeySize: 2592,
    privateKeySize: 4896,
    signatureSize: 4627,
    expectedPerformance: {
      signing: 2.5, // milliseconds
      verification: 0.032 // milliseconds (308K ops/10s)
    }
  },
  
  [QuantumAlgorithmType.FALCON_512]: {
    securityLevel: SecurityLevel.LEVEL_I,
    publicKeySize: 897,
    privateKeySize: 1281,
    signatureSize: 666,
    expectedPerformance: {
      signing: 0.8, // milliseconds
      verification: 0.012 // milliseconds
    }
  },
  
  [QuantumAlgorithmType.FALCON_1024]: {
    securityLevel: SecurityLevel.LEVEL_V,
    publicKeySize: 1793,
    privateKeySize: 2305,
    signatureSize: 1280,
    expectedPerformance: {
      signing: 1.5, // milliseconds
      verification: 0.020 // milliseconds
    }
  },
  
  [QuantumAlgorithmType.SPHINCS_PLUS_SHA2_128S]: {
    securityLevel: SecurityLevel.LEVEL_I,
    publicKeySize: 32,
    privateKeySize: 64,
    signatureSize: 7856,
    expectedPerformance: {
      signing: 25, // milliseconds (slower but very secure)
      verification: 1.2 // milliseconds
    }
  },
  
  [QuantumAlgorithmType.SPHINCS_PLUS_SHA2_192S]: {
    securityLevel: SecurityLevel.LEVEL_III,
    publicKeySize: 48,
    privateKeySize: 96,
    signatureSize: 16224,
    expectedPerformance: {
      signing: 45, // milliseconds
      verification: 2.1 // milliseconds
    }
  },
  
  [QuantumAlgorithmType.SPHINCS_PLUS_SHA2_256S]: {
    securityLevel: SecurityLevel.LEVEL_V,
    publicKeySize: 64,
    privateKeySize: 128,
    signatureSize: 29792,
    expectedPerformance: {
      signing: 80, // milliseconds
      verification: 3.8 // milliseconds
    }
  }
};

/**
 * HSM provider configurations
 */
export const hsmConfigs = {
  [HSMProvider.UTIMACO_QUANTUM_PROTECT]: {
    supportedAlgorithms: [
      QuantumAlgorithmType.ML_KEM_512,
      QuantumAlgorithmType.ML_KEM_768,
      QuantumAlgorithmType.ML_KEM_1024,
      QuantumAlgorithmType.ML_DSA_44,
      QuantumAlgorithmType.ML_DSA_65,
      QuantumAlgorithmType.ML_DSA_87
    ],
    features: {
      quantumSafeAlgorithms: true,
      hardwareRNG: true,
      keyGeneration: true,
      keyStorage: true,
      cryptographicOperations: true,
      auditLogging: true
    },
    pkcs11Mechanisms: {
      'ML-KEM-768': 'CKM_ML_KEM_768',
      'ML-DSA-65': 'CKM_ML_DSA_65'
    }
  },
  
  [HSMProvider.AWS_CLOUD_HSM]: {
    supportedAlgorithms: [
      QuantumAlgorithmType.ML_KEM_768,
      QuantumAlgorithmType.ML_DSA_65
    ],
    features: {
      quantumSafeAlgorithms: true,
      hardwareRNG: true,
      keyGeneration: true,
      keyStorage: true,
      cryptographicOperations: false, // External operations
      auditLogging: true
    }
  }
};

/**
 * Export configuration factory
 */
export class QuantumConfigFactory {
  static create(environment: 'development' | 'production' | 'high-security' | 'performance'): QuantumConfig {
    switch (environment) {
      case 'development':
        return developmentConfig;
      case 'high-security':
        return highSecurityConfig;
      case 'performance':
        return performanceOptimizedConfig;
      case 'production':
      default:
        return defaultQuantumConfig;
    }
  }
  
  static merge(base: QuantumConfig, overrides: Partial<QuantumConfig>): QuantumConfig {
    return {
      algorithms: { ...base.algorithms, ...overrides.algorithms },
      performance: { ...base.performance, ...overrides.performance },
      security: { ...base.security, ...overrides.security },
      migration: { ...base.migration, ...overrides.migration },
      monitoring: { ...base.monitoring, ...overrides.monitoring }
    };
  }
}

export const QuantumConfig = QuantumConfigFactory;
