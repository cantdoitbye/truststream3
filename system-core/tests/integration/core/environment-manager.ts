/**
 * TrustStream v4.2 Test Environment Manager
 * 
 * Manages isolated test environments, database states, and infrastructure
 * setup for comprehensive integration testing.
 * 
 * Author: MiniMax Agent
 * Date: 2025-09-20
 * Version: 1.0.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../../../src/shared-utils/logger';
import { DatabaseInterface } from '../../../src/shared-utils/database-interface';

export interface TestEnvironment {
  id: string;
  name: string;
  type: 'unit' | 'integration' | 'e2e' | 'performance';
  isolated: boolean;
  databaseUrl?: string;
  supabaseClient?: SupabaseClient;
  databaseInterface?: DatabaseInterface;
  status: 'initializing' | 'ready' | 'in-use' | 'cleanup' | 'destroyed';
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface EnvironmentConfig {
  maxConcurrentEnvironments: number;
  cleanupTimeoutMs: number;
  isolationLevel: 'shared' | 'isolated' | 'strict';
  retainDataBetweenSuites: boolean;
  enablePerformanceMonitoring: boolean;
}

export class TestEnvironmentManager {
  private logger: Logger;
  private config: EnvironmentConfig;
  private environments: Map<string, TestEnvironment> = new Map();
  private environmentPool: TestEnvironment[] = [];
  private cleanupTasks: Set<Promise<void>> = new Set();
  
  constructor(logger: Logger, config: EnvironmentConfig) {
    this.logger = logger;
    this.config = config;
  }

  /**
   * Initialize test environments for all registered test suites
   */
  async initializeTestEnvironments(): Promise<void> {
    this.logger.info('Initializing test environments');
    
    try {
      // Create environment pool based on configuration
      await this.createEnvironmentPool();
      
      // Setup shared infrastructure
      await this.setupSharedInfrastructure();
      
      // Validate environment readiness
      await this.validateEnvironments();
      
      this.logger.info('Test environments initialized successfully');
      
    } catch (error) {
      this.logger.error('Failed to initialize test environments:', error);
      throw error;
    }
  }

  /**
   * Prepare a clean environment for a specific test suite
   */
  async prepareCleanEnvironment(suiteId: string): Promise<TestEnvironment> {
    this.logger.info(`Preparing clean environment for suite: ${suiteId}`);
    
    let environment: TestEnvironment;
    
    if (this.config.isolationLevel === 'shared') {
      // Use shared environment with data cleanup
      environment = await this.getSharedEnvironment();
      await this.cleanEnvironmentData(environment);
    } else {
      // Create isolated environment
      environment = await this.createIsolatedEnvironment(suiteId);
    }
    
    environment.status = 'in-use';
    this.environments.set(suiteId, environment);
    
    return environment;
  }

  /**
   * Get environment for a specific test suite
   */
  getEnvironment(suiteId: string): TestEnvironment | undefined {
    return this.environments.get(suiteId);
  }

  /**
   * Cleanup environment after test suite completion
   */
  async cleanupEnvironment(suiteId: string): Promise<void> {
    const environment = this.environments.get(suiteId);
    if (!environment) {
      this.logger.warn(`No environment found for suite: ${suiteId}`);
      return;
    }
    
    this.logger.info(`Cleaning up environment for suite: ${suiteId}`);
    
    try {
      environment.status = 'cleanup';
      
      if (this.config.isolationLevel === 'isolated' || this.config.isolationLevel === 'strict') {
        // Destroy isolated environment
        await this.destroyEnvironment(environment);
      } else {
        // Clean shared environment data
        if (!this.config.retainDataBetweenSuites) {
          await this.cleanEnvironmentData(environment);
        }
        environment.status = 'ready';
      }
      
      this.environments.delete(suiteId);
      
    } catch (error) {
      this.logger.error(`Failed to cleanup environment for suite ${suiteId}:`, error);
      throw error;
    }
  }

  /**
   * Cleanup all environments and resources
   */
  async cleanupAllEnvironments(): Promise<void> {
    this.logger.info('Cleaning up all test environments');
    
    const cleanupPromises = Array.from(this.environments.keys()).map(suiteId => 
      this.cleanupEnvironment(suiteId)
    );
    
    await Promise.all(cleanupPromises);
    
    // Cleanup environment pool
    const poolCleanupPromises = this.environmentPool.map(env => 
      this.destroyEnvironment(env)
    );
    
    await Promise.all(poolCleanupPromises);
    this.environmentPool = [];
    
    // Wait for all cleanup tasks to complete
    await Promise.all(Array.from(this.cleanupTasks));
    this.cleanupTasks.clear();
    
    this.logger.info('All test environments cleaned up successfully');
  }

  /**
   * Create environment pool for efficient test execution
   */
  private async createEnvironmentPool(): Promise<void> {
    const poolSize = Math.min(this.config.maxConcurrentEnvironments, 5);
    
    for (let i = 0; i < poolSize; i++) {
      const environment = await this.createEnvironment(`pool-env-${i}`, 'integration');
      this.environmentPool.push(environment);
    }
    
    this.logger.info(`Created environment pool with ${poolSize} environments`);
  }

  /**
   * Create a new test environment
   */
  private async createEnvironment(id: string, type: TestEnvironment['type']): Promise<TestEnvironment> {
    this.logger.info(`Creating test environment: ${id}`);
    
    const environment: TestEnvironment = {
      id,
      name: `test-env-${id}`,
      type,
      isolated: this.config.isolationLevel !== 'shared',
      status: 'initializing',
      createdAt: new Date()
    };
    
    try {
      // Create Supabase client for test environment
      const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';
      
      environment.supabaseClient = createClient(supabaseUrl, supabaseKey);
      environment.databaseInterface = new DatabaseInterface(environment.supabaseClient);
      environment.databaseUrl = supabaseUrl;
      
      // Initialize database schema for isolated environments
      if (environment.isolated) {
        await this.initializeEnvironmentSchema(environment);
      }
      
      // Seed test data
      await this.seedTestData(environment);
      
      environment.status = 'ready';
      
      this.logger.info(`Test environment ${id} created successfully`);
      return environment;
      
    } catch (error) {
      this.logger.error(`Failed to create test environment ${id}:`, error);
      environment.status = 'destroyed';
      throw error;
    }
  }

  /**
   * Create isolated environment for a specific test suite
   */
  private async createIsolatedEnvironment(suiteId: string): Promise<TestEnvironment> {
    return this.createEnvironment(`isolated-${suiteId}-${Date.now()}`, 'integration');
  }

  /**
   * Get shared environment from pool
   */
  private async getSharedEnvironment(): Promise<TestEnvironment> {
    const availableEnv = this.environmentPool.find(env => env.status === 'ready');
    
    if (availableEnv) {
      return availableEnv;
    }
    
    // If no available environment, create a new one
    const newEnv = await this.createEnvironment(`shared-${Date.now()}`, 'integration');
    this.environmentPool.push(newEnv);
    return newEnv;
  }

  /**
   * Initialize database schema for environment
   */
  private async initializeEnvironmentSchema(environment: TestEnvironment): Promise<void> {
    if (!environment.databaseInterface) {
      throw new Error('Database interface not available for environment');
    }
    
    this.logger.info(`Initializing schema for environment: ${environment.id}`);
    
    // Core TrustStream tables
    const schemaSql = `
      -- Create test schema if not exists
      CREATE SCHEMA IF NOT EXISTS test_${environment.id.replace(/-/g, '_')};
      
      -- Memory objects table
      CREATE TABLE IF NOT EXISTS vectorgraph_memory_objects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        memory_id TEXT UNIQUE NOT NULL,
        trust_score_4d JSONB,
        enhanced_trust_score_4d JSONB,
        vibe_score NUMERIC,
        governance_score JSONB,
        memory_status TEXT DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Trust scoring sessions
      CREATE TABLE IF NOT EXISTS trust_scoring_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id TEXT UNIQUE NOT NULL,
        memory_object_id UUID REFERENCES vectorgraph_memory_objects(id),
        session_status TEXT DEFAULT 'active',
        scoring_config JSONB,
        results JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Governance agents
      CREATE TABLE IF NOT EXISTS governance_agents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id TEXT UNIQUE NOT NULL,
        agent_type TEXT NOT NULL,
        capabilities JSONB,
        trust_scores JSONB,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Test feature flags
      CREATE TABLE IF NOT EXISTS trust_scoring_feature_flags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        flag_name TEXT UNIQUE NOT NULL,
        enabled BOOLEAN DEFAULT false,
        config JSONB,
        environment TEXT DEFAULT 'test',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    await environment.databaseInterface.query(schemaSql);
  }

  /**
   * Seed test data in environment
   */
  private async seedTestData(environment: TestEnvironment): Promise<void> {
    if (!environment.databaseInterface) {
      throw new Error('Database interface not available for environment');
    }
    
    this.logger.info(`Seeding test data for environment: ${environment.id}`);
    
    // Seed basic test data
    const seedSql = `
      -- Insert test memory objects
      INSERT INTO vectorgraph_memory_objects (memory_id, trust_score_4d, vibe_score) VALUES
        ('test-memory-001', '{"iq": 0.8, "appeal": 0.7, "social": 0.9, "humanity": 0.85}', 0.8),
        ('test-memory-002', '{"iq": 0.9, "appeal": 0.8, "social": 0.7, "humanity": 0.75}', 0.85),
        ('test-memory-003', '{"iq": 0.7, "appeal": 0.9, "social": 0.8, "humanity": 0.9}', 0.9)
      ON CONFLICT (memory_id) DO NOTHING;
      
      -- Insert test governance agents
      INSERT INTO governance_agents (agent_id, agent_type, capabilities, trust_scores) VALUES
        ('gov-agent-1', 'efficiency', '{"governance": true, "coordination": true}', '{"composite": 0.9}'),
        ('gov-agent-2', 'quality', '{"governance": true, "quality_control": true}', '{"composite": 0.85}'),
        ('gov-agent-3', 'transparency', '{"governance": true, "transparency": true}', '{"composite": 0.88}')
      ON CONFLICT (agent_id) DO NOTHING;
      
      -- Insert test feature flags
      INSERT INTO trust_scoring_feature_flags (flag_name, enabled, config) VALUES
        ('enhanced_governance_scoring', true, '{"version": "4.2"}'),
        ('trust_pyramid_calculation', true, '{"layers": 4}'),
        ('performance_optimization', true, '{"cache_enabled": true}')
      ON CONFLICT (flag_name) DO NOTHING;
    `;
    
    await environment.databaseInterface.query(seedSql);
  }

  /**
   * Clean environment data without destroying structure
   */
  private async cleanEnvironmentData(environment: TestEnvironment): Promise<void> {
    if (!environment.databaseInterface) {
      throw new Error('Database interface not available for environment');
    }
    
    this.logger.info(`Cleaning data for environment: ${environment.id}`);
    
    const cleanupSql = `
      -- Clean test data but preserve structure
      DELETE FROM trust_scoring_sessions WHERE session_id LIKE 'test-%';
      DELETE FROM vectorgraph_memory_objects WHERE memory_id LIKE 'test-%';
      DELETE FROM governance_agents WHERE agent_id LIKE 'test-%';
      
      -- Reset sequence counters if needed
      SELECT setval(pg_get_serial_sequence('vectorgraph_memory_objects', 'id'), 1, false);
    `;
    
    await environment.databaseInterface.query(cleanupSql);
  }

  /**
   * Destroy environment and clean up all resources
   */
  private async destroyEnvironment(environment: TestEnvironment): Promise<void> {
    this.logger.info(`Destroying environment: ${environment.id}`);
    
    try {
      environment.status = 'destroyed';
      
      // Clean up database connections
      if (environment.supabaseClient) {
        // Note: Supabase client doesn't have explicit cleanup method
        // Connection pooling handles cleanup automatically
      }
      
      // Mark for garbage collection
      environment.supabaseClient = undefined;
      environment.databaseInterface = undefined;
      
    } catch (error) {
      this.logger.error(`Error destroying environment ${environment.id}:`, error);
    }
  }

  /**
   * Setup shared infrastructure components
   */
  private async setupSharedInfrastructure(): Promise<void> {
    this.logger.info('Setting up shared infrastructure');
    
    // Setup shared monitoring, logging, etc.
    // This can be extended based on specific infrastructure needs
  }

  /**
   * Validate all environments are ready
   */
  private async validateEnvironments(): Promise<void> {
    this.logger.info('Validating environment readiness');
    
    for (const environment of this.environmentPool) {
      if (!environment.databaseInterface) {
        throw new Error(`Environment ${environment.id} missing database interface`);
      }
      
      // Test database connectivity
      try {
        await environment.databaseInterface.query('SELECT 1 as test');
      } catch (error) {
        throw new Error(`Environment ${environment.id} database connectivity failed: ${error.message}`);
      }
    }
    
    this.logger.info('All environments validated successfully');
  }

  /**
   * Get environment statistics
   */
  getEnvironmentStats(): any {
    return {
      totalEnvironments: this.environments.size + this.environmentPool.length,
      activeEnvironments: Array.from(this.environments.values()).filter(e => e.status === 'in-use').length,
      availableEnvironments: this.environmentPool.filter(e => e.status === 'ready').length,
      config: this.config
    };
  }
}