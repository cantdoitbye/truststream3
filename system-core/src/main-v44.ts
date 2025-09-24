/**
 * TrustStram v4.4 Main Entry Point
 * 
 * Initializes and coordinates all v4.4 features with existing v4.3 infrastructure.
 * Provides a single entry point for the complete TrustStram system.
 * 
 * @version 4.4.0
 * @author TrustStram Engineering Team
 * @date 2025-09-21
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Logger } from './shared-utils/logger';
import { DatabaseInterface } from './shared-utils/database-interface';

// v4.3 Core Systems
import { UnifiedOrchestrator } from './orchestrator/unified-orchestrator';
import { BackendManager } from './abstractions/backend-manager/BackendManager';
import { AIModelManagementService } from './ai-model-management/AIModelManagementService';

// v4.4 Integration Components
import { V44UnifiedIntegrationService } from './integrations/v44-unified-integration-service';
import { V44UnifiedAPIGateway } from './api/v44-unified-api-gateway';
import { V44ConfigurationManager } from './config/v44-unified-config';
import { FeatureFlagManager } from './feature-flags/feature-flag-manager';

// Environment and Configuration
import dotenv from 'dotenv';
dotenv.config();

/**
 * TrustStram v4.4 Application Class
 * Main application orchestrator that brings together all components
 */
export class TrustStramV44Application {
  private app: Application;
  private server: any;
  private logger: Logger;
  private db: DatabaseInterface;
  
  // Core v4.3 Systems
  private orchestrator: UnifiedOrchestrator;
  private backendManager: BackendManager;
  private aiModelManager: AIModelManagementService;
  
  // v4.4 Integration Systems
  private integrationService: V44UnifiedIntegrationService;
  private apiGateway: V44UnifiedAPIGateway;
  private configManager: V44ConfigurationManager;
  private featureFlagManager: FeatureFlagManager;
  
  private initialized: boolean = false;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3000');
    this.logger = new Logger('TrustStramV44');
    
    this.setupExpress();
  }

  /**
   * Initialize the complete TrustStram v4.4 system
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('🚀 Initializing TrustStram v4.4 Application');
      
      // 1. Initialize configuration management
      await this.initializeConfiguration();
      
      // 2. Initialize database connection
      await this.initializeDatabase();
      
      // 3. Initialize core v4.3 systems
      await this.initializeCoreV43Systems();
      
      // 4. Initialize v4.4 integration service
      await this.initializeV44Integration();
      
      // 5. Setup API gateway and routes
      await this.setupAPIRoutes();
      
      // 6. Setup middleware and security
      await this.setupMiddleware();
      
      // 7. Setup monitoring and health checks
      await this.setupMonitoring();
      
      this.initialized = true;
      
      this.logger.info('✅ TrustStram v4.4 Application initialized successfully');
      
    } catch (error) {
      this.logger.error('❌ Failed to initialize TrustStram v4.4 Application:', error);
      throw error;
    }
  }

  /**
   * Start the application server
   */
  async start(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    return new Promise((resolve, reject) => {
      this.server = createServer(this.app);
      
      this.server.listen(this.port, () => {
        this.logger.info(`🌟 TrustStram v4.4 Server running on port ${this.port}`);
        
        // Log enabled features
        const enabledFeatures = this.integrationService.getEnabledFeatures();
        this.logger.info(`📋 Enabled features: ${enabledFeatures.join(', ') || 'None (all features disabled for gradual rollout)'}`);
        
        // Log API endpoints
        this.logger.info('🔗 API Endpoints:');
        this.logger.info(`   Health Check: http://localhost:${this.port}/api/v44/health`);
        this.logger.info(`   System Status: http://localhost:${this.port}/api/v44/status`);
        this.logger.info(`   Features: http://localhost:${this.port}/api/v44/features`);
        this.logger.info(`   v4.3 Compatibility: http://localhost:${this.port}/api/v43/*`);
        
        resolve();
      });
      
      this.server.on('error', (error: any) => {
        this.logger.error('Server startup error:', error);
        reject(error);
      });
    });
  }

  /**
   * Stop the application server gracefully
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.logger.info('🛑 Stopping TrustStram v4.4 Server...');
        
        this.server.close(() => {
          this.logger.info('✅ TrustStram v4.4 Server stopped gracefully');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Setup Express application
   */
  private setupExpress(): void {
    // Basic Express setup
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Enable CORS
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true
    }));
    
    // Security headers
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));
  }

  /**
   * Initialize configuration management
   */
  private async initializeConfiguration(): Promise<void> {
    this.logger.info('⚙️ Initializing configuration management');
    
    this.configManager = V44ConfigurationManager.getInstance();
    
    // Set environment-specific configuration
    const environment = process.env.NODE_ENV as 'development' | 'staging' | 'production';
    this.configManager.setEnvironment(environment || 'development');
    
    this.logger.info(`✅ Configuration initialized for environment: ${environment || 'development'}`);
  }

  /**
   * Initialize database connection
   */
  private async initializeDatabase(): Promise<void> {
    this.logger.info('🗄️ Initializing database connection');
    
    // Initialize your database connection here
    // This is a placeholder - implement based on your database setup
    try {
      // Example initialization - replace with your actual database initialization
      this.db = await this.createDatabaseConnection();
      
      this.logger.info('✅ Database connection established');
    } catch (error) {
      this.logger.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  /**
   * Initialize core v4.3 systems
   */
  private async initializeCoreV43Systems(): Promise<void> {
    this.logger.info('🔧 Initializing core v4.3 systems');
    
    try {
      // Initialize Backend Manager
      this.backendManager = BackendManager.getInstance();
      await this.backendManager.initialize();
      this.logger.info('✅ Backend Manager initialized');
      
      // Initialize Unified Orchestrator
      this.orchestrator = new UnifiedOrchestrator(this.db, this.logger);
      await this.orchestrator.initialize();
      this.logger.info('✅ Unified Orchestrator initialized');
      
      // Initialize AI Model Manager
      this.aiModelManager = new AIModelManagementService();
      await this.aiModelManager.initialize();
      this.logger.info('✅ AI Model Manager initialized');
      
      this.logger.info('✅ All core v4.3 systems initialized');
      
    } catch (error) {
      this.logger.error('❌ Failed to initialize core v4.3 systems:', error);
      throw error;
    }
  }

  /**
   * Initialize v4.4 integration service
   */
  private async initializeV44Integration(): Promise<void> {
    this.logger.info('🔗 Initializing v4.4 integration service');
    
    try {
      // Initialize Feature Flag Manager
      this.featureFlagManager = new FeatureFlagManager(this.db, this.logger);
      
      // Initialize Integration Service
      this.integrationService = V44UnifiedIntegrationService.getInstance(
        this.db,
        this.logger,
        this.orchestrator,
        this.backendManager,
        this.aiModelManager
      );
      
      await this.integrationService.initialize();
      
      this.logger.info('✅ v4.4 Integration Service initialized');
      
    } catch (error) {
      this.logger.error('❌ Failed to initialize v4.4 integration service:', error);
      throw error;
    }
  }

  /**
   * Setup API routes
   */
  private async setupAPIRoutes(): Promise<void> {
    this.logger.info('🌐 Setting up API routes');
    
    try {
      // Initialize API Gateway
      this.apiGateway = new V44UnifiedAPIGateway(
        this.integrationService,
        this.featureFlagManager,
        this.logger
      );
      
      // Mount v4.4 API routes
      this.app.use('/api/v44', this.apiGateway.getRouter());
      
      // Root endpoint
      this.app.get('/', (req, res) => {
        res.json({
          name: 'TrustStram',
          version: '4.4.0',
          description: 'Advanced AI Governance and Trust Platform',
          status: 'operational',
          features: this.integrationService.getEnabledFeatures(),
          endpoints: {
            health: '/api/v44/health',
            status: '/api/v44/status',
            features: '/api/v44/features',
            documentation: '/api/v44/docs'
          }
        });
      });
      
      // Legacy v4.3 compatibility endpoint
      this.app.all('/api/v43/*', (req, res) => {
        res.status(301).json({
          message: 'This v4.3 API endpoint has been moved to v4.4',
          deprecated: true,
          migration_guide: '/docs/migration-guide',
          new_endpoint: req.path.replace('/api/v43/', '/api/v44/'),
          sunset_date: '2026-09-21'
        });
      });
      
      this.logger.info('✅ API routes configured');
      
    } catch (error) {
      this.logger.error('❌ Failed to setup API routes:', error);
      throw error;
    }
  }

  /**
   * Setup middleware and security
   */
  private async setupMiddleware(): Promise<void> {
    this.logger.info('🔒 Setting up middleware and security');
    
    // Request logging middleware
    this.app.use((req, res, next) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      req.headers['x-request-id'] = requestId;
      
      this.logger.info(`${req.method} ${req.path}`, {
        request_id: requestId,
        user_agent: req.get('User-Agent'),
        ip: req.ip
      });
      
      next();
    });
    
    // Error handling middleware
    this.app.use((error: any, req: any, res: any, next: any) => {
      this.logger.error('Unhandled error:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An internal server error occurred',
          request_id: req.headers['x-request-id']
        },
        metadata: {
          version: '4.4.0',
          timestamp: new Date().toISOString()
        }
      });
    });
    
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'API endpoint not found',
          suggestion: 'Check /api/v44/health for available endpoints'
        },
        metadata: {
          version: '4.4.0',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    });
    
    this.logger.info('✅ Middleware and security configured');
  }

  /**
   * Setup monitoring and health checks
   */
  private async setupMonitoring(): Promise<void> {
    this.logger.info('📊 Setting up monitoring and health checks');
    
    // Periodic health checks
    setInterval(async () => {
      try {
        const metrics = this.integrationService.getMetrics();
        
        if (metrics.integration_health === 'degraded') {
          this.logger.warn('System health degraded', { metrics });
        } else if (metrics.integration_health === 'failed') {
          this.logger.error('System health failed', { metrics });
        }
        
      } catch (error) {
        this.logger.error('Health check failed:', error);
      }
    }, 60000); // Check every minute
    
    // Graceful shutdown handling
    process.on('SIGINT', async () => {
      this.logger.info('Received SIGINT, shutting down gracefully...');
      await this.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      this.logger.info('Received SIGTERM, shutting down gracefully...');
      await this.stop();
      process.exit(0);
    });
    
    this.logger.info('✅ Monitoring and health checks configured');
  }

  /**
   * Create database connection (placeholder implementation)
   */
  private async createDatabaseConnection(): Promise<DatabaseInterface> {
    // This is a placeholder implementation
    // Replace with your actual database connection logic
    return {} as DatabaseInterface;
  }

  /**
   * Get application instance
   */
  public getApp(): Application {
    return this.app;
  }

  /**
   * Get integration service
   */
  public getIntegrationService(): V44UnifiedIntegrationService {
    return this.integrationService;
  }

  /**
   * Check if application is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
}

/**
 * Main entry point function
 */
async function main(): Promise<void> {
  try {
    const app = new TrustStramV44Application();
    await app.start();
    
    // Log startup completion
    console.log(`
    ████████╗██████╗ ██╗   ██╗███████╗████████╗███████╗████████╗██████╗  █████╗ ███╗   ███╗
    ╚══██╔══╝██╔══██╗██║   ██║██╔════╝╚══██╔══╝██╔════╝╚══██╔══╝██╔══██╗██╔══██╗████╗ ████║
       ██║   ██████╔╝██║   ██║███████╗   ██║   ███████╗   ██║   ██████╔╝███████║██╔████╔██║
       ██║   ██╔══██╗██║   ██║╚════██║   ██║   ╚════██║   ██║   ██╔══██╗██╔══██║██║╚██╔╝██║
       ██║   ██║  ██║╚██████╔╝███████║   ██║   ███████║   ██║   ██║  ██║██║  ██║██║ ╚═╝ ██║
       ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝   ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝
    
    🌟 TrustStram v4.4 - Advanced AI Governance Platform
    🚀 Successfully started with all v4.4 features integrated
    📋 Visit http://localhost:${process.env.PORT || 3000}/api/v44/health for system status
    `);
    
  } catch (error) {
    console.error('❌ Failed to start TrustStram v4.4 Application:', error);
    process.exit(1);
  }
}

// Export the application class for use in other modules
export default TrustStramV44Application;

// Start the application if this file is run directly
if (require.main === module) {
  main().catch(console.error);
}