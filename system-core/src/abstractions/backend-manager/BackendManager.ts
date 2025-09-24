/**
 * Backend Manager - Central orchestrator for all backend services
 * Provides unified interface for switching between different backend providers
 */

import { EventEmitter } from 'events';
import { DatabaseConfig, AuthConfig, StorageConfig } from '../../../shared-utils/index';
import { UnifiedDatabaseService } from '../database/UnifiedDatabaseService';
import { UnifiedAuthService } from '../auth/UnifiedAuthService';
import { UnifiedStorageService } from '../storage/UnifiedStorageService';
import { UnifiedRealTimeService } from '../realtime/UnifiedRealTimeService';
import { UnifiedEdgeFunctionService } from '../edge-functions/UnifiedEdgeFunctionService';
import { BackendConfiguration, BackendProvider, BackendSwitchOptions, BackendStatus, BackendHealthStatus } from './types';
import { BackendConfigurationManager } from './BackendConfigurationManager';
import { BackendMigrationManager } from './BackendMigrationManager';
import { BackendHealthMonitor } from './BackendHealthMonitor';

export interface BackendManagerOptions {
  enableHealthMonitoring?: boolean;
  healthCheckInterval?: number;
  enableFailover?: boolean;
  enableMetrics?: boolean;
  migrationTimeout?: number;
  rollbackOnFailure?: boolean;
}

export class BackendManager extends EventEmitter {
  private static instance: BackendManager;
  private currentProvider: BackendProvider | null = null;
  private configuration: BackendConfiguration | null = null;
  private configManager: BackendConfigurationManager;
  private migrationManager: BackendMigrationManager;
  private healthMonitor: BackendHealthMonitor;
  private options: Required<BackendManagerOptions>;
  
  // Service instances
  private databaseService: UnifiedDatabaseService | null = null;
  private authService: UnifiedAuthService | null = null;
  private storageService: UnifiedStorageService | null = null;
  private realTimeService: UnifiedRealTimeService | null = null;
  private edgeFunctionService: UnifiedEdgeFunctionService | null = null;
  
  private isInitialized = false;
  private isSwitching = false;
  private switchQueue: Array<() => Promise<void>> = [];

  private constructor(options: BackendManagerOptions = {}) {
    super();
    
    this.options = {
      enableHealthMonitoring: options.enableHealthMonitoring ?? true,
      healthCheckInterval: options.healthCheckInterval ?? 30000,
      enableFailover: options.enableFailover ?? true,
      enableMetrics: options.enableMetrics ?? true,
      migrationTimeout: options.migrationTimeout ?? 300000, // 5 minutes
      rollbackOnFailure: options.rollbackOnFailure ?? true
    };
    
    this.configManager = new BackendConfigurationManager();
    this.migrationManager = new BackendMigrationManager();
    this.healthMonitor = new BackendHealthMonitor({
      interval: this.options.healthCheckInterval,
      enabled: this.options.enableHealthMonitoring
    });
    
    this.setupEventListeners();
  }

  static getInstance(options?: BackendManagerOptions): BackendManager {
    if (!BackendManager.instance) {
      BackendManager.instance = new BackendManager(options);
    }
    return BackendManager.instance;
  }

  /**
   * Initialize the backend manager with a configuration
   */
  async initialize(config: BackendConfiguration): Promise<void> {
    try {
      this.emit('initialization:started', { config });
      
      // Validate configuration
      const validation = await this.configManager.validateConfiguration(config);
      if (!validation.valid) {
        throw new Error(`Invalid backend configuration: ${validation.errors.join(', ')}`);
      }
      
      this.configuration = config;
      this.currentProvider = config.providers[config.activeProvider];
      
      if (!this.currentProvider) {
        throw new Error(`Active provider '${config.activeProvider}' not found in configuration`);
      }
      
      // Initialize services
      await this.initializeServices();
      
      // Start health monitoring
      if (this.options.enableHealthMonitoring) {
        await this.healthMonitor.start(this.getAllServices());
      }
      
      this.isInitialized = true;
      this.emit('initialization:completed', { provider: this.currentProvider.name });
      
    } catch (error) {
      this.emit('initialization:failed', { error });
      throw error;
    }
  }

  /**
   * Switch to a different backend provider with zero downtime
   */
  async switchProvider(
    targetProvider: string, 
    options: BackendSwitchOptions = {}
  ): Promise<void> {
    if (this.isSwitching) {
      // Queue the switch request
      return new Promise((resolve, reject) => {
        this.switchQueue.push(async () => {
          try {
            await this.performProviderSwitch(targetProvider, options);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    }
    
    return this.performProviderSwitch(targetProvider, options);
  }

  private async performProviderSwitch(
    targetProvider: string, 
    options: BackendSwitchOptions
  ): Promise<void> {
    if (!this.isInitialized || !this.configuration) {
      throw new Error('Backend manager not initialized');
    }
    
    if (this.configuration.activeProvider === targetProvider) {
      throw new Error(`Already using provider: ${targetProvider}`);
    }
    
    const newProvider = this.configuration.providers[targetProvider];
    if (!newProvider) {
      throw new Error(`Provider '${targetProvider}' not found in configuration`);
    }
    
    this.isSwitching = true;
    const switchId = `switch-${Date.now()}`;
    
    try {
      this.emit('provider:switch:started', {
        switchId,
        from: this.currentProvider!.name,
        to: targetProvider,
        options
      });
      
      // Create migration plan
      const migrationPlan = await this.migrationManager.createMigrationPlan(
        this.currentProvider!,
        newProvider,
        options
      );
      
      this.emit('migration:plan:created', { switchId, plan: migrationPlan });
      
      // Execute migration with rollback support
      const migrationResult = await this.migrationManager.executeMigration(
        migrationPlan,
        {
          timeout: this.options.migrationTimeout,
          enableRollback: this.options.rollbackOnFailure,
          onProgress: (progress) => {
            this.emit('migration:progress', { switchId, progress });
          }
        }
      );
      
      if (!migrationResult.success) {
        throw new Error(`Migration failed: ${migrationResult.error}`);
      }
      
      // Update configuration
      const previousProvider = this.currentProvider;
      this.currentProvider = newProvider;
      this.configuration.activeProvider = targetProvider;
      
      // Reinitialize services with new provider
      await this.reinitializeServices();
      
      // Save updated configuration
      await this.configManager.saveConfiguration(this.configuration);
      
      this.emit('provider:switch:completed', {
        switchId,
        from: previousProvider!.name,
        to: targetProvider,
        migrationResult
      });
      
    } catch (error) {
      this.emit('provider:switch:failed', {
        switchId,
        error,
        targetProvider
      });
      
      if (this.options.rollbackOnFailure) {
        try {
          await this.migrationManager.rollbackMigration(switchId);
          this.emit('migration:rollback:completed', { switchId });
        } catch (rollbackError) {
          this.emit('migration:rollback:failed', { switchId, error: rollbackError });
        }
      }
      
      throw error;
    } finally {
      this.isSwitching = false;
      
      // Process queued switches
      if (this.switchQueue.length > 0) {
        const nextSwitch = this.switchQueue.shift();
        if (nextSwitch) {
          setImmediate(() => nextSwitch());
        }
      }
    }
  }

  /**
   * Get current backend status
   */
  async getBackendStatus(): Promise<BackendStatus> {
    if (!this.isInitialized || !this.currentProvider) {
      return {
        initialized: false,
        currentProvider: null,
        availableProviders: [],
        health: { status: 'unhealthy', lastChecked: new Date() },
        services: {}
      };
    }
    
    const health = await this.healthMonitor.getOverallHealth();
    const serviceStatus = await this.getServiceStatus();
    
    return {
      initialized: this.isInitialized,
      currentProvider: this.currentProvider.name,
      availableProviders: Object.keys(this.configuration!.providers),
      health,
      services: serviceStatus,
      isSwitching: this.isSwitching,
      queuedSwitches: this.switchQueue.length
    };
  }

  /**
   * Test connection to a specific provider without switching
   */
  async testProvider(providerName: string): Promise<BackendHealthStatus> {
    if (!this.configuration) {
      throw new Error('Backend manager not initialized');
    }
    
    const provider = this.configuration.providers[providerName];
    if (!provider) {
      throw new Error(`Provider '${providerName}' not found`);
    }
    
    return this.healthMonitor.testProviderHealth(provider);
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): string[] {
    return this.configuration ? Object.keys(this.configuration.providers) : [];
  }

  /**
   * Get current provider
   */
  getCurrentProvider(): BackendProvider | null {
    return this.currentProvider;
  }

  /**
   * Get service instances
   */
  getDatabaseService(): UnifiedDatabaseService {
    if (!this.databaseService) {
      throw new Error('Database service not initialized');
    }
    return this.databaseService;
  }

  getAuthService(): UnifiedAuthService {
    if (!this.authService) {
      throw new Error('Auth service not initialized');
    }
    return this.authService;
  }

  getStorageService(): UnifiedStorageService {
    if (!this.storageService) {
      throw new Error('Storage service not initialized');
    }
    return this.storageService;
  }

  getRealTimeService(): UnifiedRealTimeService {
    if (!this.realTimeService) {
      throw new Error('RealTime service not initialized');
    }
    return this.realTimeService;
  }

  getEdgeFunctionService(): UnifiedEdgeFunctionService {
    if (!this.edgeFunctionService) {
      throw new Error('Edge Function service not initialized');
    }
    return this.edgeFunctionService;
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    try {
      this.emit('shutdown:started');
      
      // Stop health monitoring
      await this.healthMonitor.stop();
      
      // Disconnect all services
      if (this.databaseService) {
        await this.databaseService.disconnect();
      }
      if (this.authService) {
        await this.authService.disconnect();
      }
      if (this.storageService) {
        await this.storageService.disconnect();
      }
      if (this.realTimeService) {
        await this.realTimeService.disconnect();
      }
      if (this.edgeFunctionService) {
        await this.edgeFunctionService.disconnect();
      }
      
      this.isInitialized = false;
      this.emit('shutdown:completed');
      
    } catch (error) {
      this.emit('shutdown:failed', { error });
      throw error;
    }
  }

  private async initializeServices(): Promise<void> {
    if (!this.currentProvider) {
      throw new Error('No current provider set');
    }
    
    // Initialize database service
    this.databaseService = new UnifiedDatabaseService({
      autoConnect: true,
      enableEvents: true,
      enablePerformanceMonitoring: true
    });
    await this.databaseService.connect(this.currentProvider.database);
    
    // Initialize auth service
    this.authService = new UnifiedAuthService({
      autoConnect: true,
      enableEvents: true
    });
    await this.authService.connect(this.currentProvider.auth);
    
    // Initialize storage service
    this.storageService = new UnifiedStorageService({
      autoConnect: true,
      enableEvents: true
    });
    await this.storageService.connect(this.currentProvider.storage);
    
    // Initialize realtime service
    this.realTimeService = new UnifiedRealTimeService({
      autoConnect: true,
      enableEvents: true
    });
    await this.realTimeService.connect(this.currentProvider.realtime);
    
    // Initialize edge function service
    this.edgeFunctionService = new UnifiedEdgeFunctionService({
      autoConnect: true,
      enableEvents: true
    });
    await this.edgeFunctionService.connect(this.currentProvider.edgeFunctions);
  }

  private async reinitializeServices(): Promise<void> {
    // Disconnect existing services
    if (this.databaseService) await this.databaseService.disconnect();
    if (this.authService) await this.authService.disconnect();
    if (this.storageService) await this.storageService.disconnect();
    if (this.realTimeService) await this.realTimeService.disconnect();
    if (this.edgeFunctionService) await this.edgeFunctionService.disconnect();
    
    // Initialize with new provider
    await this.initializeServices();
  }

  private getAllServices() {
    return {
      database: this.databaseService,
      auth: this.authService,
      storage: this.storageService,
      realtime: this.realTimeService,
      edgeFunctions: this.edgeFunctionService
    };
  }

  private async getServiceStatus() {
    const services = this.getAllServices();
    const status: any = {};
    
    for (const [name, service] of Object.entries(services)) {
      if (service) {
        status[name] = {
          connected: service.isConnected ? service.isConnected() : false,
          stats: service.getStats ? await service.getStats() : null
        };
      }
    }
    
    return status;
  }

  private setupEventListeners(): void {
    // Forward health monitor events
    this.healthMonitor.on('health:changed', (event) => {
      this.emit('health:changed', event);
    });
    
    this.healthMonitor.on('health:degraded', (event) => {
      this.emit('health:degraded', event);
      
      if (this.options.enableFailover) {
        this.handleFailover(event);
      }
    });
  }

  private async handleFailover(healthEvent: any): Promise<void> {
    try {
      this.emit('failover:started', { trigger: healthEvent });
      
      // Find the best alternative provider
      const alternatives = await this.findHealthyAlternatives();
      
      if (alternatives.length === 0) {
        this.emit('failover:failed', { reason: 'No healthy alternatives found' });
        return;
      }
      
      const targetProvider = alternatives[0]; // Choose the first healthy alternative
      
      await this.switchProvider(targetProvider, {
        reason: 'automatic_failover',
        preserveData: true,
        verifyIntegrity: true
      });
      
      this.emit('failover:completed', { newProvider: targetProvider });
      
    } catch (error) {
      this.emit('failover:failed', { error });
    }
  }

  private async findHealthyAlternatives(): Promise<string[]> {
    if (!this.configuration) return [];
    
    const alternatives: string[] = [];
    
    for (const [name, provider] of Object.entries(this.configuration.providers)) {
      if (name === this.configuration.activeProvider) continue;
      
      try {
        const health = await this.testProvider(name);
        if (health.status === 'healthy') {
          alternatives.push(name);
        }
      } catch (error) {
        // Provider not healthy, skip
      }
    }
    
    return alternatives;
  }
}

// Export singleton instance
export const backendManager = BackendManager.getInstance();
