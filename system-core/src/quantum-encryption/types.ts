/**
 * Type definitions for TrustStram v4.4 Quantum-Ready Encryption
 * 
 * Comprehensive type system supporting NIST-standardized post-quantum algorithms,
 * hybrid encryption systems, and cryptographic agility framework.
 */

// Core Algorithm Types
export enum QuantumAlgorithmType {
  ML_KEM_512 = 'ML-KEM-512',
  ML_KEM_768 = 'ML-KEM-768',
  ML_KEM_1024 = 'ML-KEM-1024',
  ML_DSA_44 = 'ML-DSA-44',
  ML_DSA_65 = 'ML-DSA-65',
  ML_DSA_87 = 'ML-DSA-87',
  FALCON_512 = 'FALCON-512',
  FALCON_1024 = 'FALCON-1024',
  SPHINCS_PLUS_SHA2_128S = 'SPHINCS+-SHA2-128S',
  SPHINCS_PLUS_SHA2_192S = 'SPHINCS+-SHA2-192S',
  SPHINCS_PLUS_SHA2_256S = 'SPHINCS+-SHA2-256S'
}

export enum SecurityLevel {
  LEVEL_I = 1,    // 128-bit equivalent
  LEVEL_III = 3,  // 192-bit equivalent
  LEVEL_V = 5     // 256-bit equivalent
}

export enum CryptographicOperation {
  KEY_GENERATION = 'key_generation',
  ENCAPSULATION = 'encapsulation',
  DECAPSULATION = 'decapsulation',
  SIGNATURE_GENERATION = 'signature_generation',
  SIGNATURE_VERIFICATION = 'signature_verification',
  ENCRYPTION = 'encryption',
  DECRYPTION = 'decryption'
}

// Key Material Types
export interface QuantumKeyPair {
  algorithm: QuantumAlgorithmType;
  securityLevel: SecurityLevel;
  publicKey: Uint8Array;
  privateKey: Uint8Array;
  metadata: KeyMetadata;
}

export interface KeyMetadata {
  id: string;
  createdAt: Date;
  expiresAt?: Date;
  usage: KeyUsage[];
  origin: KeyOrigin;
  securityLevel: SecurityLevel;
  algorithm: QuantumAlgorithmType;
  version: string;
}

export enum KeyUsage {
  KEY_ENCAPSULATION = 'key_encapsulation',
  DIGITAL_SIGNATURE = 'digital_signature',
  DATA_ENCRYPTION = 'data_encryption',
  KEY_AGREEMENT = 'key_agreement'
}

export enum KeyOrigin {
  GENERATED = 'generated',
  IMPORTED = 'imported',
  DERIVED = 'derived',
  HSM_GENERATED = 'hsm_generated'
}

// Hybrid System Types
export interface HybridKeyPair {
  classical: ClassicalKeyPair;
  quantum: QuantumKeyPair;
  combinerAlgorithm: string;
}

export interface ClassicalKeyPair {
  algorithm: ClassicalAlgorithmType;
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export enum ClassicalAlgorithmType {
  X25519 = 'X25519',
  ECDH_P256 = 'ECDH-P256',
  ECDH_P384 = 'ECDH-P384',
  ECDSA_P256 = 'ECDSA-P256',
  ECDSA_P384 = 'ECDSA-P384',
  RSA_2048 = 'RSA-2048',
  RSA_3072 = 'RSA-3072'
}

// Cryptographic Operations
export interface EncapsulationResult {
  ciphertext: Uint8Array;
  sharedSecret: Uint8Array;
  algorithm: QuantumAlgorithmType;
  timestamp: Date;
}

export interface DecapsulationResult {
  sharedSecret: Uint8Array;
  success: boolean;
  algorithm: QuantumAlgorithmType;
  timestamp: Date;
}

export interface SignatureResult {
  signature: Uint8Array;
  algorithm: QuantumAlgorithmType;
  message: Uint8Array;
  timestamp: Date;
}

export interface VerificationResult {
  valid: boolean;
  algorithm: QuantumAlgorithmType;
  message: Uint8Array;
  signature: Uint8Array;
  timestamp: Date;
}

// Performance Metrics
export interface PerformanceMetrics {
  operation: CryptographicOperation;
  algorithm: QuantumAlgorithmType;
  duration: number; // microseconds
  cpuCycles?: number;
  memoryUsage: number; // bytes
  throughput?: number; // operations per second
  timestamp: Date;
}

export interface BenchmarkResult {
  algorithm: QuantumAlgorithmType;
  operation: CryptographicOperation;
  iterations: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  standardDeviation: number;
  operationsPerSecond: number;
  memoryFootprint: number;
  cpuUtilization: number;
}

// Migration Types
export interface MigrationPlan {
  id: string;
  name: string;
  description: string;
  phases: MigrationPhase[];
  timeline: MigrationTimeline;
  riskAssessment: RiskAssessment;
  stakeholders: string[];
}

export interface MigrationPhase {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  deliverables: string[];
  dependencies: string[];
  status: MigrationPhaseStatus;
  progress: number; // 0-100
}

export enum MigrationPhaseStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  BLOCKED = 'blocked',
  CANCELLED = 'cancelled'
}

export interface MigrationTimeline {
  preparation: DateRange;
  assessment: DateRange;
  implementation: DateRange;
  monitoring: DateRange;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface RiskAssessment {
  overall: RiskLevel;
  technical: RiskLevel;
  operational: RiskLevel;
  financial: RiskLevel;
  regulatory: RiskLevel;
  mitigations: RiskMitigation[];
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface RiskMitigation {
  risk: string;
  mitigation: string;
  responsible: string;
  deadline: Date;
  status: string;
}

// Configuration Types
export interface QuantumConfig {
  algorithms: AlgorithmConfig;
  performance: PerformanceConfig;
  security: SecurityConfig;
  migration: MigrationConfig;
  monitoring: MonitoringConfig;
}

export interface AlgorithmConfig {
  primaryKEM: QuantumAlgorithmType;
  primarySignature: QuantumAlgorithmType;
  fallbackKEM: QuantumAlgorithmType;
  fallbackSignature: QuantumAlgorithmType;
  hybridMode: boolean;
  classicalFallback: boolean;
}

export interface PerformanceConfig {
  enableBenchmarking: boolean;
  metricsCollection: boolean;
  performanceThresholds: PerformanceThresholds;
  optimization: OptimizationSettings;
}

export interface PerformanceThresholds {
  maxKeyGenerationTime: number; // milliseconds
  maxEncapsulationTime: number;
  maxSignatureTime: number;
  maxVerificationTime: number;
  maxMemoryUsage: number; // bytes
}

export interface OptimizationSettings {
  enableHardwareAcceleration: boolean;
  enableCaching: boolean;
  connectionPooling: boolean;
  batchOperations: boolean;
}

export interface SecurityConfig {
  enforceQuantumSafe: boolean;
  allowClassicalFallback: boolean;
  requireHSM: boolean;
  auditLogging: boolean;
  complianceMode: ComplianceMode;
}

export enum ComplianceMode {
  FIPS_140_2 = 'FIPS-140-2',
  COMMON_CRITERIA = 'Common-Criteria',
  NIST_SP_800_56C = 'NIST-SP-800-56C',
  ISO_27001 = 'ISO-27001'
}

export interface MigrationConfig {
  enableAutomaticMigration: boolean;
  migrationMode: MigrationMode;
  rollbackSupport: boolean;
  testingRequired: boolean;
}

export enum MigrationMode {
  IMMEDIATE = 'immediate',
  GRADUAL = 'gradual',
  ON_DEMAND = 'on_demand',
  SCHEDULED = 'scheduled'
}

export interface MonitoringConfig {
  enableRealTimeMonitoring: boolean;
  metricsRetention: number; // days
  alertThresholds: AlertThresholds;
  reportingInterval: number; // minutes
}

export interface AlertThresholds {
  performanceDegradation: number; // percentage
  errorRate: number; // percentage
  securityViolations: number; // count per hour
  systemLoad: number; // percentage
}

// HSM Integration Types
export interface HSMConfig {
  provider: HSMProvider;
  connectionString: string;
  credentials: HSMCredentials;
  algorithms: QuantumAlgorithmType[];
  features: HSMFeatures;
}

export enum HSMProvider {
  UTIMACO_QUANTUM_PROTECT = 'utimaco_quantum_protect',
  THALES_LUNA = 'thales_luna',
  AWS_CLOUD_HSM = 'aws_cloud_hsm',
  AZURE_DEDICATED_HSM = 'azure_dedicated_hsm',
  GOOGLE_CLOUD_HSM = 'google_cloud_hsm'
}

export interface HSMCredentials {
  username?: string;
  password?: string;
  certificate?: Uint8Array;
  token?: string;
  keyFile?: string;
}

export interface HSMFeatures {
  quantumSafeAlgorithms: boolean;
  hardwareRNG: boolean;
  keyGeneration: boolean;
  keyStorage: boolean;
  cryptographicOperations: boolean;
  auditLogging: boolean;
}

// Cryptographic Inventory Types
export interface CryptographicAsset {
  id: string;
  name: string;
  type: AssetType;
  location: string;
  algorithm: string;
  keySize: number;
  usage: string[];
  owner: string;
  criticality: CriticalityLevel;
  migrationPriority: number;
  lastUpdated: Date;
}

export enum AssetType {
  APPLICATION = 'application',
  SERVICE = 'service',
  DATABASE = 'database',
  CERTIFICATE = 'certificate',
  API_KEY = 'api_key',
  ENCRYPTION_KEY = 'encryption_key',
  SIGNING_KEY = 'signing_key'
}

export enum CriticalityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error Types
export interface QuantumError extends Error {
  code: string;
  algorithm?: QuantumAlgorithmType;
  operation?: CryptographicOperation;
  details?: Record<string, any>;
}

export class QuantumCryptographicError extends Error implements QuantumError {
  constructor(
    message: string,
    public code: string,
    public algorithm?: QuantumAlgorithmType,
    public operation?: CryptographicOperation,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'QuantumCryptographicError';
  }
}

// Event Types
export interface QuantumEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  source: string;
  algorithm?: QuantumAlgorithmType;
  operation?: CryptographicOperation;
  data: Record<string, any>;
}

export enum EventType {
  KEY_GENERATED = 'key_generated',
  ENCRYPTION_PERFORMED = 'encryption_performed',
  SIGNATURE_CREATED = 'signature_created',
  VERIFICATION_COMPLETED = 'verification_completed',
  MIGRATION_STARTED = 'migration_started',
  MIGRATION_COMPLETED = 'migration_completed',
  PERFORMANCE_THRESHOLD_EXCEEDED = 'performance_threshold_exceeded',
  SECURITY_VIOLATION = 'security_violation',
  ALGORITHM_DEPRECATED = 'algorithm_deprecated'
}
