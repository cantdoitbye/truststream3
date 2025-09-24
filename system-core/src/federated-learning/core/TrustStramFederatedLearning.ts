/**
 * TrustStram v4.4 Federated Learning Core Framework
 * Implements hybrid Flower + TensorFlow Federated architecture
 * Based on research findings for optimal scalability and enterprise deployment
 */

import { EventEmitter } from 'events';
import {
  FederatedLearningConfig,
  FederatedTrainingJob,
  FederatedClient,
  ModelUpdate,
  AggregationResult,
  FederatedLearningEvent,
  TrainingJobStatus,
  FlowerClientConfig,
  TensorFlowFederatedConfig
} from '../types';
import { PrivacyManager } from '../privacy/PrivacyManager';
import { SecurityManager } from '../security/SecurityManager';
import { PerformanceOptimizer } from '../optimization/PerformanceOptimizer';
import { FederatedOrchestrator } from '../orchestration/FederatedOrchestrator';
import { FlowerFramework } from './FlowerFramework';
import { TensorFlowFederatedFramework } from './TensorFlowFederatedFramework';
import { UnifiedDatabaseService } from '../../abstractions/database';
import { UnifiedStorageService } from '../../abstractions/storage';

/**
 * Main Federated Learning Framework implementing hybrid architecture
 * Combines Flower (cross-device) and TensorFlow Federated (cross-silo) frameworks
 */
export class TrustStramFederatedLearning extends EventEmitter {
  private static instance: TrustStramFederatedLearning;
  private config: FederatedLearningConfig;
  private privacyManager: PrivacyManager;
  private securityManager: SecurityManager;
  private performanceOptimizer: PerformanceOptimizer;
  private orchestrator: FederatedOrchestrator;
  private flowerFramework?: FlowerFramework;
  private tffFramework?: TensorFlowFederatedFramework;
  private dbService: UnifiedDatabaseService;
  private storageService: UnifiedStorageService;
  private activeJobs: Map<string, FederatedTrainingJob> = new Map();
  private registeredClients: Map<string, FederatedClient> = new Map();
  private isInitialized = false;

  private constructor(
    config: FederatedLearningConfig,
    dbService: UnifiedDatabaseService,
    storageService: UnifiedStorageService
  ) {
    super();
    this.config = config;
    this.dbService = dbService;
    this.storageService = storageService;
    
    // Initialize core components
    this.privacyManager = new PrivacyManager(config.privacy);
    this.securityManager = new SecurityManager(config.security);
    this.performanceOptimizer = new PerformanceOptimizer(config.performance);
    this.orchestrator = new FederatedOrchestrator(this);
  }

  public static getInstance(
    config?: FederatedLearningConfig,
    dbService?: UnifiedDatabaseService,
    storageService?: UnifiedStorageService
  ): TrustStramFederatedLearning {
    if (!TrustStramFederatedLearning.instance) {
      if (!config || !dbService || !storageService) {
        throw new Error('First instantiation requires all parameters');
      }
      TrustStramFederatedLearning.instance = new TrustStramFederatedLearning(
        config,
        dbService,
        storageService
      );
    }
    return TrustStramFederatedLearning.instance;
  }

  /**
   * Initialize the federated learning framework
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize database schema for federated learning
      await this.initializeDatabaseSchema();
      
      // Initialize frameworks based on configuration
      await this.initializeFrameworks();
      
      // Start monitoring and orchestration
      await this.orchestrator.initialize();
      this.performanceOptimizer.startMonitoring();
      
      // Load existing clients and jobs
      await this.loadExistingState();
      
      this.isInitialized = true;
      this.emit('framework_initialized', { timestamp: new Date().toISOString() });
      
      console.log('TrustStram Federated Learning Framework initialized successfully');
    } catch (error) {
      console.error('Failed to initialize federated learning framework:', error);
      throw error;
    }
  }

  /**
   * Initialize appropriate federated learning frameworks
   */
  private async initializeFrameworks(): Promise<void> {
    if (this.config.framework === 'flower' || this.config.framework === 'hybrid') {
      this.flowerFramework = new FlowerFramework({
        client_id: 'truststram-coordinator',
        server_address: process.env.FLOWER_SERVER_ADDRESS || 'localhost:8080',
        max_message_size: 100 * 1024 * 1024, // 100MB
        keepalive_timeout: 30000
      });
      await this.flowerFramework.initialize();
    }

    if (this.config.framework === 'tensorflow_federated' || this.config.framework === 'hybrid') {
      this.tffFramework = new TensorFlowFederatedFramework({
        executor_type: 'kubernetes',
        num_executor_threads: 4,
        server_computation: null, // Will be set during training
        client_computation: null  // Will be set during training
      });
      await this.tffFramework.initialize();
    }
  }

  /**
   * Register a new federated learning client
   */
  async registerClient(client: FederatedClient): Promise<void> {
    try {
      // Validate client capabilities
      await this.validateClientCapabilities(client);
      
      // Security screening
      const securityClearance = await this.securityManager.screenClient(client);
      if (!securityClearance.approved) {
        throw new Error(`Client security screening failed: ${securityClearance.reason}`);
      }
      
      // Store client in database
      await this.dbService.create('federated_clients', {
        ...client,
        registered_at: new Date().toISOString(),
        security_clearance: securityClearance
      });
      
      // Register with appropriate framework
      if (client.client_type === 'device' && this.flowerFramework) {
        await this.flowerFramework.registerClient(client);
      } else if (client.client_type === 'organization' && this.tffFramework) {
        await this.tffFramework.registerClient(client);
      }
      
      this.registeredClients.set(client.client_id, client);
      
      this.emit('client_registered', {
        client_id: client.client_id,
        client_type: client.client_type,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Client ${client.client_id} registered successfully`);
    } catch (error) {
      console.error(`Failed to register client ${client.client_id}:`, error);
      throw error;
    }
  }

  /**
   * Start a new federated training job
   */
  async startTrainingJob(job: FederatedTrainingJob): Promise<string> {
    try {
      // Validate job configuration
      await this.validateJobConfiguration(job);
      
      // Select participating clients
      const selectedClients = await this.selectClients(job.client_selection);
      if (selectedClients.length < job.client_selection.min_clients) {
        throw new Error(`Insufficient clients available. Required: ${job.client_selection.min_clients}, Available: ${selectedClients.length}`);
      }
      
      // Initialize privacy budget
      await this.privacyManager.initializePrivacyBudget(job.job_id, selectedClients);
      
      // Store job in database
      const jobRecord = {
        ...job,
        status: 'initializing' as TrainingJobStatus,
        selected_clients: selectedClients.map(c => c.client_id),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      await this.dbService.create('federated_training_jobs', jobRecord);
      this.activeJobs.set(job.job_id, job);
      
      // Start training based on scenario and framework
      if (job.training_config.model_architecture && this.shouldUseFlower(selectedClients)) {
        await this.startFlowerTraining(job, selectedClients);
      } else if (this.tffFramework) {
        await this.startTFFTraining(job, selectedClients);
      } else {
        throw new Error('No suitable framework available for this training job');
      }
      
      await this.updateJobStatus(job.job_id, 'running');
      
      this.emit('training_started', {
        job_id: job.job_id,
        participant_count: selectedClients.length,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Training job ${job.job_id} started with ${selectedClients.length} clients`);
      return job.job_id;
    } catch (error) {
      console.error(`Failed to start training job ${job.job_id}:`, error);
      await this.updateJobStatus(job.job_id, 'failed');
      throw error;
    }
  }

  /**
   * Process client model update
   */
  async processClientUpdate(
    jobId: string,
    clientUpdate: ModelUpdate
  ): Promise<void> {
    try {
      const job = this.activeJobs.get(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }
      
      // Security validation
      const securityValidation = await this.securityManager.validateUpdate(clientUpdate);
      if (!securityValidation.isValid) {
        await this.handleSecurityThreat(jobId, clientUpdate.client_id, securityValidation.threats);
        return;
      }
      
      // Privacy validation
      const privacyValidation = await this.privacyManager.validateUpdate(clientUpdate);
      if (!privacyValidation.isValid) {
        throw new Error(`Privacy validation failed: ${privacyValidation.reason}`);
      }
      
      // Apply privacy-preserving techniques
      const protectedUpdate = await this.privacyManager.applyPrivacyProtection(clientUpdate);
      
      // Performance optimization
      const optimizedUpdate = await this.performanceOptimizer.optimizeUpdate(protectedUpdate);
      
      // Store update
      await this.dbService.create('federated_model_updates', {
        job_id: jobId,
        client_id: clientUpdate.client_id,
        round_number: clientUpdate.round_number,
        update_data: optimizedUpdate,
        privacy_proof: clientUpdate.privacy_proof,
        received_at: new Date().toISOString()
      });
      
      this.emit('client_update_received', {
        job_id: jobId,
        client_id: clientUpdate.client_id,
        round_number: clientUpdate.round_number,
        timestamp: new Date().toISOString()
      });
      
      // Check if ready for aggregation
      await this.checkAggregationReadiness(jobId, clientUpdate.round_number);
      
    } catch (error) {
      console.error(`Failed to process client update from ${clientUpdate.client_id}:`, error);
      throw error;
    }
  }

  /**
   * Aggregate model updates using Byzantine-robust algorithms
   */
  async aggregateModelUpdates(
    jobId: string,
    roundNumber: number
  ): Promise<AggregationResult> {
    try {
      const job = this.activeJobs.get(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }
      
      // Retrieve all updates for this round
      const updates = await this.dbService.findMany('federated_model_updates', {
        where: { job_id: jobId, round_number: roundNumber }
      });
      
      if (updates.length === 0) {
        throw new Error(`No updates found for job ${jobId}, round ${roundNumber}`);
      }
      
      // Apply Byzantine-robust aggregation
      const aggregationResult = await this.securityManager.aggregateWithByzantineRobustness(
        updates.map(u => u.update_data),
        job.aggregation_config
      );
      
      // Validate aggregation result
      const validationResult = await this.securityManager.validateAggregation(aggregationResult);
      if (!validationResult.valid) {
        throw new Error(`Aggregation validation failed: ${validationResult.reason}`);
      }
      
      // Apply performance optimizations to aggregated model
      const optimizedModel = await this.performanceOptimizer.optimizeAggregatedModel(
        aggregationResult.aggregated_parameters
      );
      
      const finalResult: AggregationResult = {
        ...aggregationResult,
        aggregated_parameters: optimizedModel,
        round_number: roundNumber
      };
      
      // Store aggregation result
      await this.dbService.create('federated_aggregation_results', {
        job_id: jobId,
        round_number: roundNumber,
        aggregation_result: finalResult,
        created_at: new Date().toISOString()
      });
      
      this.emit('aggregation_completed', {
        job_id: jobId,
        round_number: roundNumber,
        participant_count: aggregationResult.participating_clients.length,
        byzantine_detected: aggregationResult.byzantine_clients_detected.length,
        timestamp: new Date().toISOString()
      });
      
      // Check convergence
      const hasConverged = await this.checkConvergence(jobId, finalResult);
      if (hasConverged) {
        await this.completeTrainingJob(jobId);
      } else {
        await this.startNextRound(jobId, roundNumber + 1, finalResult);
      }
      
      return finalResult;
    } catch (error) {
      console.error(`Failed to aggregate updates for job ${jobId}, round ${roundNumber}:`, error);
      throw error;
    }
  }

  /**
   * Get training job status and metrics
   */
  async getJobStatus(jobId: string): Promise<FederatedTrainingJob | null> {
    try {
      const jobRecord = await this.dbService.findFirst('federated_training_jobs', {
        where: { job_id: jobId }
      });
      
      if (!jobRecord) {
        return null;
      }
      
      // Get latest metrics
      const metrics = await this.dbService.findMany('federated_training_metrics', {
        where: { job_id: jobId },
        orderBy: { round_number: 'desc' },
        take: 1
      });
      
      const latestMetrics = metrics[0];
      if (latestMetrics) {
        jobRecord.performance_metrics = latestMetrics.metrics;
      }
      
      return jobRecord as FederatedTrainingJob;
    } catch (error) {
      console.error(`Failed to get job status for ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Stop a running training job
   */
  async stopTrainingJob(jobId: string, reason: string): Promise<void> {
    try {
      const job = this.activeJobs.get(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }
      
      // Stop training in appropriate framework
      if (this.flowerFramework) {
        await this.flowerFramework.stopTraining(jobId);
      }
      if (this.tffFramework) {
        await this.tffFramework.stopTraining(jobId);
      }
      
      // Update job status
      await this.updateJobStatus(jobId, 'cancelled');
      
      // Clean up resources
      await this.privacyManager.cleanupPrivacyBudget(jobId);
      this.activeJobs.delete(jobId);
      
      this.emit('training_stopped', {
        job_id: jobId,
        reason,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Training job ${jobId} stopped: ${reason}`);
    } catch (error) {
      console.error(`Failed to stop training job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Get system-wide federated learning metrics
   */
  async getSystemMetrics(): Promise<any> {
    try {
      const activeJobCount = this.activeJobs.size;
      const totalClientCount = this.registeredClients.size;
      const activeClientCount = Array.from(this.registeredClients.values())
        .filter(c => c.status === 'available' || c.status === 'training').length;
      
      const recentMetrics = await this.dbService.findMany('federated_training_metrics', {
        where: {
          created_at: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Last 24 hours
          }
        }
      });
      
      const securityEvents = await this.securityManager.getRecentSecurityEvents();
      const privacyMetrics = await this.privacyManager.getPrivacyMetrics();
      const performanceMetrics = await this.performanceOptimizer.getSystemMetrics();
      
      return {
        active_jobs: activeJobCount,
        total_clients: totalClientCount,
        active_clients: activeClientCount,
        recent_training_rounds: recentMetrics.length,
        security_events: securityEvents.length,
        privacy_budget_utilization: privacyMetrics.budget_utilization,
        system_performance: performanceMetrics,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get system metrics:', error);
      throw error;
    }
  }

  // Private helper methods
  private async initializeDatabaseSchema(): Promise<void> {
    // Create federated learning tables if they don't exist
    const tables = [
      'federated_clients',
      'federated_training_jobs',
      'federated_model_updates',
      'federated_aggregation_results',
      'federated_training_metrics',
      'federated_security_events',
      'federated_privacy_budget'
    ];
    
    for (const table of tables) {
      try {
        await this.dbService.query(`SELECT 1 FROM ${table} LIMIT 1`);
      } catch {
        // Table doesn't exist, create it
        await this.createTable(table);
      }
    }
  }

  private async createTable(tableName: string): Promise<void> {
    // Implementation would create appropriate SQL schema for each table
    // This is a placeholder - actual implementation would have proper SQL DDL
    console.log(`Creating table: ${tableName}`);
  }

  private async loadExistingState(): Promise<void> {
    // Load existing clients
    const clients = await this.dbService.findMany('federated_clients', {
      where: { status: { not: 'offline' } }
    });
    
    for (const client of clients) {
      this.registeredClients.set(client.client_id, client as FederatedClient);
    }
    
    // Load active jobs
    const activeJobs = await this.dbService.findMany('federated_training_jobs', {
      where: { status: { in: ['running', 'initializing'] } }
    });
    
    for (const job of activeJobs) {
      this.activeJobs.set(job.job_id, job as FederatedTrainingJob);
    }
  }

  private async validateClientCapabilities(client: FederatedClient): Promise<void> {
    // Validate client meets minimum requirements
    if (client.capabilities.compute_power === 'low' && 
        this.config.scenario === 'cross_silo') {
      throw new Error('Insufficient compute power for cross-silo federated learning');
    }
    
    if (client.capabilities.memory_available < 1024 * 1024 * 1024) { // 1GB minimum
      throw new Error('Insufficient memory for federated learning participation');
    }
  }

  private async validateJobConfiguration(job: FederatedTrainingJob): Promise<void> {
    // Validate training configuration
    if (job.target_rounds <= 0) {
      throw new Error('Target rounds must be positive');
    }
    
    if (job.client_selection.min_clients < 2) {
      throw new Error('Minimum 2 clients required for federated learning');
    }
  }

  private async selectClients(config: any): Promise<FederatedClient[]> {
    const availableClients = Array.from(this.registeredClients.values())
      .filter(c => c.status === 'available');
    
    // Apply selection strategy
    switch (config.selection_strategy) {
      case 'random':
        return this.randomSelection(availableClients, config.max_clients);
      case 'performance_based':
        return this.performanceBasedSelection(availableClients, config);
      default:
        return this.randomSelection(availableClients, config.max_clients);
    }
  }

  private randomSelection(clients: FederatedClient[], maxClients: number): FederatedClient[] {
    const shuffled = [...clients].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(maxClients, clients.length));
  }

  private async performanceBasedSelection(clients: FederatedClient[], config: any): Promise<FederatedClient[]> {
    // Sort by performance criteria and select top performers
    const scored = clients.map(client => ({
      client,
      score: this.calculateClientScore(client)
    }));
    
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, config.max_clients).map(s => s.client);
  }

  private calculateClientScore(client: FederatedClient): number {
    let score = 0;
    score += client.capabilities.compute_power === 'high' ? 3 : 
             client.capabilities.compute_power === 'medium' ? 2 : 1;
    score += Math.min(client.capabilities.network_bandwidth / 1000000, 10); // Max 10 points for bandwidth
    score += Math.min(client.data_schema.data_quality * 10, 10);
    return score;
  }

  private shouldUseFlower(clients: FederatedClient[]): boolean {
    const deviceClientCount = clients.filter(c => c.client_type === 'device').length;
    const orgClientCount = clients.filter(c => c.client_type === 'organization').length;
    
    // Use Flower if majority are device clients
    return deviceClientCount > orgClientCount;
  }

  private async startFlowerTraining(job: FederatedTrainingJob, clients: FederatedClient[]): Promise<void> {
    if (!this.flowerFramework) {
      throw new Error('Flower framework not initialized');
    }
    await this.flowerFramework.startTraining(job, clients);
  }

  private async startTFFTraining(job: FederatedTrainingJob, clients: FederatedClient[]): Promise<void> {
    if (!this.tffFramework) {
      throw new Error('TensorFlow Federated framework not initialized');
    }
    await this.tffFramework.startTraining(job, clients);
  }

  private async updateJobStatus(jobId: string, status: TrainingJobStatus): Promise<void> {
    await this.dbService.update('federated_training_jobs', jobId, {
      status,
      updated_at: new Date().toISOString()
    });
    
    const job = this.activeJobs.get(jobId);
    if (job) {
      job.status = status;
    }
  }

  private async checkAggregationReadiness(jobId: string, roundNumber: number): Promise<void> {
    // Check if enough updates received for aggregation
    const job = this.activeJobs.get(jobId);
    if (!job) return;
    
    const updates = await this.dbService.findMany('federated_model_updates', {
      where: { job_id: jobId, round_number: roundNumber }
    });
    
    if (updates.length >= job.client_selection.min_clients) {
      // Trigger aggregation
      setTimeout(() => this.aggregateModelUpdates(jobId, roundNumber), 1000);
    }
  }

  private async handleSecurityThreat(
    jobId: string,
    clientId: string,
    threats: string[]
  ): Promise<void> {
    await this.dbService.create('federated_security_events', {
      job_id: jobId,
      client_id: clientId,
      event_type: 'security_threat',
      threats,
      detected_at: new Date().toISOString()
    });
    
    this.emit('security_threat_detected', {
      job_id: jobId,
      client_id: clientId,
      threats,
      timestamp: new Date().toISOString()
    });
  }

  private async checkConvergence(jobId: string, result: AggregationResult): Promise<boolean> {
    const job = this.activeJobs.get(jobId);
    if (!job) return false;
    
    // Check convergence criteria
    return result.convergence_metrics.loss_improvement < job.convergence_criteria.loss_threshold ||
           job.rounds_completed >= job.target_rounds;
  }

  private async completeTrainingJob(jobId: string): Promise<void> {
    await this.updateJobStatus(jobId, 'completed');
    this.activeJobs.delete(jobId);
    
    this.emit('training_completed', {
      job_id: jobId,
      timestamp: new Date().toISOString()
    });
  }

  private async startNextRound(
    jobId: string,
    roundNumber: number,
    previousResult: AggregationResult
  ): Promise<void> {
    // Distribute updated model to clients for next round
    const job = this.activeJobs.get(jobId);
    if (!job) return;
    
    job.rounds_completed = roundNumber - 1;
    
    this.emit('round_started', {
      job_id: jobId,
      round_number: roundNumber,
      timestamp: new Date().toISOString()
    });
  }
}

export default TrustStramFederatedLearning;