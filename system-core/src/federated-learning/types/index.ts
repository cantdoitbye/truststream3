/**
 * TrustStram v4.4 Federated Learning Type Definitions
 * Based on research findings in docs/v4_4_federated_learning_research.md
 */

export interface FederatedLearningConfig {
  framework: 'flower' | 'tensorflow_federated' | 'hybrid';
  scenario: 'cross_device' | 'cross_silo';
  privacy: PrivacyConfig;
  security: SecurityConfig;
  performance: PerformanceConfig;
  monitoring: MonitoringConfig;
}

export interface PrivacyConfig {
  differential_privacy: {
    enabled: boolean;
    epsilon: number;
    delta: number;
    mechanism: 'staircase' | 'gaussian' | 'laplace';
  };
  homomorphic_encryption: {
    enabled: boolean;
    scheme: 'CKKS' | 'BFV' | 'BGV';
    key_size: number;
    performance_overhead_threshold: number;
  };
  secure_aggregation: {
    enabled: boolean;
    threshold: number;
    max_clients: number;
  };
}

export interface SecurityConfig {
  byzantine_robust: boolean;
  aggregation_algorithm: 'wfagg' | 'krum' | 'trimmed_mean' | 'median';
  anomaly_detection: boolean;
  threat_monitoring: boolean;
  max_byzantine_clients: number;
}

export interface PerformanceConfig {
  compression: {
    enabled: boolean;
    algorithm: 'top_k_sparsification' | 'quantization' | 'gradient_clipping';
    ratio: number;
    error_tolerance: number;
  };
  scheduling: {
    bandwidth_aware: boolean;
    adaptive_frequency: boolean;
    load_balancing: boolean;
  };
  optimization: {
    adaptive_learning_rate: boolean;
    convergence_acceleration: boolean;
    resource_allocation: boolean;
  };
}

export interface MonitoringConfig {
  performance_metrics: boolean;
  security_metrics: boolean;
  privacy_budget_tracking: boolean;
  real_time_alerts: boolean;
  dashboard_enabled: boolean;
}

// Client Types
export interface FederatedClient {
  client_id: string;
  client_type: 'device' | 'organization' | 'agent';
  capabilities: ClientCapabilities;
  data_schema: DataSchema;
  communication_config: CommunicationConfig;
  privacy_preferences: PrivacyPreferences;
  status: ClientStatus;
}

export interface ClientCapabilities {
  compute_power: 'low' | 'medium' | 'high';
  memory_available: number;
  storage_capacity: number;
  network_bandwidth: number;
  supported_frameworks: string[];
  privacy_level: 'basic' | 'enhanced' | 'maximum';
}

export interface DataSchema {
  schema_version: string;
  data_type: 'tabular' | 'image' | 'text' | 'audio' | 'video' | 'multimodal';
  feature_count: number;
  sample_count: number;
  data_quality: number;
  privacy_sensitivity: 'low' | 'medium' | 'high' | 'critical';
}

export interface CommunicationConfig {
  protocol: 'grpc' | 'http' | 'websocket';
  encryption: 'tls' | 'mtls' | 'end_to_end';
  compression: boolean;
  batch_size: number;
  timeout_ms: number;
}

export interface PrivacyPreferences {
  max_epsilon: number;
  allow_homomorphic_encryption: boolean;
  secure_aggregation_required: boolean;
  audit_trail_required: boolean;
}

export type ClientStatus = 'available' | 'training' | 'updating' | 'offline' | 'error';

// Training Types
export interface FederatedTrainingJob {
  job_id: string;
  job_name: string;
  model_id: string;
  training_config: TrainingConfig;
  client_selection: ClientSelectionConfig;
  aggregation_config: AggregationConfig;
  status: TrainingJobStatus;
  rounds_completed: number;
  target_rounds: number;
  convergence_criteria: ConvergenceCriteria;
  privacy_budget_used: number;
  security_events: SecurityEvent[];
  performance_metrics: TrainingMetrics;
  created_at: string;
  updated_at: string;
}

export interface TrainingConfig {
  learning_rate: number;
  batch_size: number;
  local_epochs: number;
  model_architecture: ModelArchitecture;
  optimizer: OptimizerConfig;
  loss_function: string;
  regularization: RegularizationConfig;
}

export interface ClientSelectionConfig {
  selection_strategy: 'random' | 'performance_based' | 'data_quality' | 'hybrid';
  min_clients: number;
  max_clients: number;
  selection_criteria: SelectionCriteria;
}

export interface AggregationConfig {
  algorithm: 'fedavg' | 'wfagg' | 'fed_nova' | 'scaffold';
  weighting_strategy: 'uniform' | 'data_size' | 'performance';
  byzantine_tolerance: number;
  convergence_threshold: number;
}

export type TrainingJobStatus = 'created' | 'initializing' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface ConvergenceCriteria {
  loss_threshold: number;
  accuracy_threshold: number;
  max_rounds: number;
  patience: number;
  early_stopping: boolean;
}

export interface SecurityEvent {
  event_id: string;
  event_type: 'byzantine_detected' | 'anomaly_detected' | 'privacy_violation' | 'communication_failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  client_id: string;
  description: string;
  detected_at: string;
  mitigation_action: string;
}

export interface TrainingMetrics {
  global_loss: number;
  global_accuracy: number;
  convergence_rate: number;
  communication_rounds: number;
  total_training_time: number;
  average_round_time: number;
  client_participation_rate: number;
  data_efficiency: number;
  privacy_budget_efficiency: number;
}

// Model Update Types
export interface ModelUpdate {
  client_id: string;
  round_number: number;
  update_id: string;
  parameters: ModelParameters;
  gradients?: ModelGradients;
  metadata: UpdateMetadata;
  privacy_proof: PrivacyProof;
  integrity_hash: string;
  timestamp: string;
}

export interface ModelParameters {
  layer_weights: Record<string, number[]>;
  bias_weights: Record<string, number[]>;
  parameter_count: number;
  compression_info: CompressionInfo;
}

export interface ModelGradients {
  gradient_vectors: Record<string, number[]>;
  gradient_norms: Record<string, number>;
  clipping_applied: boolean;
  noise_added: boolean;
}

export interface UpdateMetadata {
  local_epochs: number;
  local_data_size: number;
  training_loss: number;
  training_accuracy: number;
  computation_time: number;
  communication_cost: number;
  resource_usage: ResourceUsage;
}

export interface PrivacyProof {
  epsilon_used: number;
  delta_used: number;
  mechanism_applied: string;
  noise_magnitude: number;
  privacy_accountant_state: any;
}

export interface CompressionInfo {
  algorithm: string;
  compression_ratio: number;
  original_size: number;
  compressed_size: number;
  quality_loss: number;
}

export interface ResourceUsage {
  cpu_usage: number;
  memory_usage: number;
  network_bandwidth: number;
  storage_usage: number;
  energy_consumption: number;
}

// Aggregation Types
export interface AggregationResult {
  round_number: number;
  aggregated_parameters: ModelParameters;
  participating_clients: string[];
  aggregation_weights: Record<string, number>;
  byzantine_clients_detected: string[];
  aggregation_quality: AggregationQuality;
  convergence_metrics: ConvergenceMetrics;
  security_validation: SecurityValidation;
}

export interface AggregationQuality {
  consensus_score: number;
  quality_score: number;
  stability_score: number;
  improvement_score: number;
}

export interface ConvergenceMetrics {
  loss_improvement: number;
  accuracy_improvement: number;
  parameter_stability: number;
  convergence_rate: number;
  estimated_rounds_to_convergence: number;
}

export interface SecurityValidation {
  byzantine_check_passed: boolean;
  anomaly_check_passed: boolean;
  integrity_check_passed: boolean;
  privacy_check_passed: boolean;
  threats_detected: string[];
}

// Framework Integration Types
export interface FlowerClientConfig {
  client_id: string;
  server_address: string;
  max_message_size: number;
  keepalive_timeout: number;
  root_certificates?: string;
}

export interface TensorFlowFederatedConfig {
  executor_type: 'local' | 'remote' | 'kubernetes';
  num_executor_threads: number;
  server_computation: any;
  client_computation: any;
}

// Utility Types
export interface ModelArchitecture {
  architecture_type: 'sequential' | 'functional' | 'custom';
  layers: LayerConfig[];
  input_shape: number[];
  output_shape: number[];
  parameter_count: number;
}

export interface LayerConfig {
  layer_type: string;
  layer_name: string;
  parameters: Record<string, any>;
  activation?: string;
  regularization?: RegularizationConfig;
}

export interface OptimizerConfig {
  optimizer_type: 'sgd' | 'adam' | 'rmsprop' | 'adagrad';
  learning_rate: number;
  momentum?: number;
  beta1?: number;
  beta2?: number;
  epsilon?: number;
  weight_decay?: number;
}

export interface RegularizationConfig {
  l1_regularization?: number;
  l2_regularization?: number;
  dropout_rate?: number;
  batch_normalization?: boolean;
}

export interface SelectionCriteria {
  min_data_samples: number;
  min_data_quality: number;
  max_latency: number;
  min_compute_power: 'low' | 'medium' | 'high';
  privacy_compliance: boolean;
}

// Event Types for Real-time Updates
export interface FederatedLearningEvent {
  event_id: string;
  event_type: FederatedEventType;
  job_id: string;
  timestamp: string;
  data: any;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export type FederatedEventType = 
  | 'training_started'
  | 'training_completed'
  | 'round_started'
  | 'round_completed'
  | 'client_selected'
  | 'client_update_received'
  | 'aggregation_completed'
  | 'convergence_achieved'
  | 'byzantine_detected'
  | 'privacy_violation'
  | 'performance_threshold_exceeded'
  | 'system_error';

// Integration with TrustStram AI Agents
export interface AIAgentFederatedConfig {
  agent_id: string;
  agent_type: string;
  federated_role: 'coordinator' | 'participant' | 'observer';
  capabilities: AgentCapabilities;
  communication_protocols: string[];
  security_clearance: 'basic' | 'elevated' | 'restricted';
}

export interface AgentCapabilities {
  model_types: string[];
  data_modalities: string[];
  computation_resources: ResourceCapabilities;
  privacy_techniques: string[];
  security_features: string[];
}

export interface ResourceCapabilities {
  max_model_size: number;
  max_batch_size: number;
  max_training_time: number;
  parallel_processing: boolean;
  gpu_acceleration: boolean;
}

// Performance Monitoring
export interface FederatedLearningMetrics {
  job_id: string;
  round_number: number;
  metrics: {
    training_accuracy: number;
    training_loss: number;
    validation_accuracy: number;
    validation_loss: number;
    communication_overhead: number;
    computation_time: number;
    privacy_budget_consumed: number;
    security_score: number;
    resource_utilization: number;
  };
  timestamp: string;
}

export interface SystemPerformanceMetrics {
  active_jobs: number;
  total_clients: number;
  active_clients: number;
  average_round_time: number;
  system_throughput: number;
  resource_utilization: {
    cpu: number;
    memory: number;
    network: number;
    storage: number;
  };
  security_alerts: number;
  privacy_violations: number;
}