/**
 * TrustStram v4.4 Quantum-Ready Encryption Module
 * 
 * Main entry point for quantum-safe cryptographic operations based on NIST-standardized
 * post-quantum algorithms. Implements ML-KEM-768, ML-DSA-65, FALCON, and SPHINCS+
 * with hybrid classical+PQC support for seamless migration.
 * 
 * Performance: ML-KEM shows 20,500x faster than RSA, ML-DSA provides 2-36x faster
 * signature verification than classical algorithms.
 * 
 * @version 4.4.0
 * @author TrustStram Quantum Security Team
 * @date 2025-09-21
 */

export * from './algorithms';
export * from './hybrid-systems';
export * from './key-management';
export * from './migration-tools';
export * from './performance-monitoring';
export * from './integration';

// Main Quantum Encryption Service
export { QuantumEncryptionService } from './QuantumEncryptionService';

// Core Algorithm Implementations
export { MLKEMService } from './algorithms/MLKEMService';
export { MLDSAService } from './algorithms/MLDSAService';
export { FALCONService } from './algorithms/FALCONService';
export { SPHINCSPlusService } from './algorithms/SPHINCSPlusService';

// Hybrid Systems
export { HybridKEMService } from './hybrid-systems/HybridKEMService';
export { HybridSignatureService } from './hybrid-systems/HybridSignatureService';

// Key Management
export { QuantumSafeKeyManager } from './key-management/QuantumSafeKeyManager';
export { HSMIntegration } from './key-management/HSMIntegration';

// Migration Tools
export { MigrationOrchestrator } from './migration-tools/MigrationOrchestrator';
export { CryptographicInventory } from './migration-tools/CryptographicInventory';

// Performance Monitoring
export { PerformanceBenchmark } from './performance-monitoring/PerformanceBenchmark';
export { QuantumMetricsCollector } from './performance-monitoring/QuantumMetricsCollector';

// Types and Interfaces
export * from './types';

// Configuration
export { QuantumConfig } from './config';
