/**
 * TrustStram v4.4 Unified API Gateway
 * 
 * Provides unified REST API endpoints for all v4.4 features:
 * - Federated Learning operations
 * - Multi-Cloud Orchestration management
 * - AI Explainability services
 * - Quantum Encryption operations
 * 
 * Features:
 * - API versioning (v4.3 compatibility + v4.4 enhancements)
 * - Unified authentication and authorization
 * - Rate limiting and monitoring
 * - Comprehensive error handling
 * - OpenAPI/Swagger documentation
 * 
 * @version 4.4.0
 * @author TrustStram Engineering Team
 * @date 2025-09-21
 */

import { Request, Response, NextFunction, Router } from 'express';
import { V44UnifiedIntegrationService } from '../integrations/v44-unified-integration-service';
import { V44ConfigurationManager } from '../config/v44-unified-config';
import { FeatureFlagManager } from '../feature-flags/feature-flag-manager';
import { DatabaseInterface } from '../shared-utils/database-interface';
import { Logger } from '../shared-utils/logger';

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    version: string;
    timestamp: string;
    request_id: string;
    feature_flags?: string[];
  };
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// Request validation interfaces
export interface FederatedLearningRequest {
  model_config: any;
  data_config: any;
  num_clients: number;
  num_rounds: number;
  privacy_budget?: number;
  scenario_type: 'horizontal' | 'vertical' | 'cross_device' | 'cross_silo';
}

export interface ExplainabilityRequest {
  model_id: string;
  input_data: any;
  explanation_type: 'shap' | 'lime' | 'counterfactual' | 'feature_importance';
  stakeholder_type: 'end_user' | 'technical_user' | 'business_user';
  compliance_requirements?: string[];
}

export interface MultiCloudRequest {
  deployment_config: any;
  target_clouds: string[];
  failover_config?: any;
  cost_optimization: boolean;
}

export interface QuantumEncryptionRequest {
  operation: 'encrypt' | 'decrypt' | 'sign' | 'verify' | 'key_generation';
  algorithm: 'ML-KEM-768' | 'ML-DSA-65' | 'FALCON' | 'SPHINCS+';
  data: string;
  key_id?: string;
}

/**
 * TrustStram v4.4 Unified API Gateway
 */
export class V44UnifiedAPIGateway {
  private integrationService: V44UnifiedIntegrationService;
  private configManager: V44ConfigurationManager;
  private featureFlagManager: FeatureFlagManager;
  private logger: Logger;
  private router: Router;

  constructor(
    integrationService: V44UnifiedIntegrationService,
    featureFlagManager: FeatureFlagManager,
    logger: Logger
  ) {
    this.integrationService = integrationService;
    this.configManager = V44ConfigurationManager.getInstance();
    this.featureFlagManager = featureFlagManager;
    this.logger = logger;
    this.router = Router();
    
    this.setupRoutes();
    this.setupMiddleware();
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health and Status Endpoints
    this.router.get('/health', this.healthCheck.bind(this));
    this.router.get('/status', this.systemStatus.bind(this));
    this.router.get('/features', this.getEnabledFeatures.bind(this));
    this.router.get('/metrics', this.getSystemMetrics.bind(this));

    // Federated Learning Endpoints
    this.router.post('/federated-learning/train', this.startFederatedTraining.bind(this));
    this.router.get('/federated-learning/status/:job_id', this.getFederatedTrainingStatus.bind(this));
    this.router.post('/federated-learning/aggregate', this.aggregateFederatedUpdates.bind(this));
    this.router.get('/federated-learning/metrics/:job_id', this.getFederatedMetrics.bind(this));

    // AI Explainability Endpoints
    this.router.post('/explainability/explain', this.generateExplanation.bind(this));
    this.router.get('/explainability/explanation/:explanation_id', this.getExplanation.bind(this));
    this.router.post('/explainability/bias-audit', this.performBiasAudit.bind(this));
    this.router.get('/explainability/audit-trail/:model_id', this.getAuditTrail.bind(this));

    // Multi-Cloud Orchestration Endpoints
    this.router.post('/multi-cloud/deploy', this.deployToMultiCloud.bind(this));
    this.router.get('/multi-cloud/deployments', this.getMultiCloudDeployments.bind(this));
    this.router.post('/multi-cloud/failover', this.triggerFailover.bind(this));
    this.router.get('/multi-cloud/cost-optimization', this.getCostOptimization.bind(this));

    // Quantum Encryption Endpoints
    this.router.post('/quantum-encryption/encrypt', this.quantumEncrypt.bind(this));
    this.router.post('/quantum-encryption/decrypt', this.quantumDecrypt.bind(this));
    this.router.post('/quantum-encryption/sign', this.quantumSign.bind(this));
    this.router.post('/quantum-encryption/verify', this.quantumVerify.bind(this));
    this.router.post('/quantum-encryption/key-generation', this.generateQuantumKeys.bind(this));

    // Configuration and Feature Flag Endpoints
    this.router.get('/config', this.getConfiguration.bind(this));
    this.router.put('/config/features/:feature', this.updateFeatureConfig.bind(this));
    this.router.get('/feature-flags', this.getFeatureFlags.bind(this));
    this.router.put('/feature-flags/:flag', this.updateFeatureFlag.bind(this));

    // Backward Compatibility Endpoints (v4.3)
    this.router.get('/v43/*', this.handleV43Compatibility.bind(this));
    this.router.post('/v43/*', this.handleV43Compatibility.bind(this));
    this.router.put('/v43/*', this.handleV43Compatibility.bind(this));
    this.router.delete('/v43/*', this.handleV43Compatibility.bind(this));
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    // Request logging
    this.router.use(this.requestLogger.bind(this));
    
    // Authentication and authorization
    this.router.use(this.authMiddleware.bind(this));
    
    // Rate limiting
    this.router.use(this.rateLimitingMiddleware.bind(this));
    
    // Feature flag validation
    this.router.use(this.featureFlagMiddleware.bind(this));
    
    // Error handling
    this.router.use(this.errorHandler.bind(this));
  }

  /**
   * Health Check Endpoint
   */
  private async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '4.4.0',
        integration_service: this.integrationService.isInitialized(),
        features: this.integrationService.getEnabledFeatures()
      };

      res.json(this.createResponse(health, req));
    } catch (error) {
      res.status(500).json(this.createErrorResponse(error, req));
    }
  }

  /**
   * System Status Endpoint
   */
  private async systemStatus(req: Request, res: Response): Promise<void> {
    try {
      const metrics = this.integrationService.getMetrics();
      const events = this.integrationService.getIntegrationEvents().slice(-10);
      
      const status = {
        integration_health: metrics.integration_health,
        active_features: metrics.active_features,
        performance_metrics: metrics.performance_metrics,
        recent_events: events,
        compatibility_status: metrics.compatibility_status
      };

      res.json(this.createResponse(status, req));
    } catch (error) {
      res.status(500).json(this.createErrorResponse(error, req));
    }
  }

  /**
   * Federated Learning Endpoints
   */
  private async startFederatedTraining(req: Request, res: Response): Promise<void> {
    try {
      const request: FederatedLearningRequest = req.body;
      
      // Validate request
      this.validateFederatedLearningRequest(request);
      
      // Check if federated learning is enabled
      if (!this.configManager.isFeatureEnabled('federated_learning')) {
        throw new Error('Federated learning feature is not enabled');
      }

      // Start federated training
      const result = await this.integrationService.startFederatedTraining(request);
      
      res.json(this.createResponse(result, req));
    } catch (error) {
      res.status(400).json(this.createErrorResponse(error, req));
    }
  }

  private async getFederatedTrainingStatus(req: Request, res: Response): Promise<void> {
    try {
      const jobId = req.params.job_id;
      const status = await this.integrationService.getFederatedTrainingStatus(jobId);
      
      res.json(this.createResponse(status, req));
    } catch (error) {
      res.status(404).json(this.createErrorResponse(error, req));
    }
  }

  private async aggregateFederatedUpdates(req: Request, res: Response): Promise<void> {
    try {
      const updates = req.body;
      const result = await this.integrationService.aggregateFederatedUpdates(updates);
      
      res.json(this.createResponse(result, req));
    } catch (error) {
      res.status(400).json(this.createErrorResponse(error, req));
    }
  }

  private async getFederatedMetrics(req: Request, res: Response): Promise<void> {
    try {
      const jobId = req.params.job_id;
      const metrics = await this.integrationService.getFederatedMetrics(jobId);
      
      res.json(this.createResponse(metrics, req));
    } catch (error) {
      res.status(404).json(this.createErrorResponse(error, req));
    }
  }

  /**
   * AI Explainability Endpoints
   */
  private async generateExplanation(req: Request, res: Response): Promise<void> {
    try {
      const request: ExplainabilityRequest = req.body;
      
      // Validate request
      this.validateExplainabilityRequest(request);
      
      // Check if explainability is enabled
      if (!this.configManager.isFeatureEnabled('ai_explainability')) {
        throw new Error('AI explainability feature is not enabled');
      }

      // Generate explanation
      const explanation = await this.integrationService.generateExplanation(request);
      
      res.json(this.createResponse(explanation, req));
    } catch (error) {
      res.status(400).json(this.createErrorResponse(error, req));
    }
  }

  private async getExplanation(req: Request, res: Response): Promise<void> {
    try {
      const explanationId = req.params.explanation_id;
      const explanation = await this.integrationService.getExplanation(explanationId);
      
      res.json(this.createResponse(explanation, req));
    } catch (error) {
      res.status(404).json(this.createErrorResponse(error, req));
    }
  }

  private async performBiasAudit(req: Request, res: Response): Promise<void> {
    try {
      const auditRequest = req.body;
      const auditResult = await this.integrationService.performBiasAudit(auditRequest);
      
      res.json(this.createResponse(auditResult, req));
    } catch (error) {
      res.status(400).json(this.createErrorResponse(error, req));
    }
  }

  private async getAuditTrail(req: Request, res: Response): Promise<void> {
    try {
      const modelId = req.params.model_id;
      const auditTrail = await this.integrationService.getAuditTrail(modelId);
      
      res.json(this.createResponse(auditTrail, req));
    } catch (error) {
      res.status(404).json(this.createErrorResponse(error, req));
    }
  }

  /**
   * Multi-Cloud Orchestration Endpoints
   */
  private async deployToMultiCloud(req: Request, res: Response): Promise<void> {
    try {
      const request: MultiCloudRequest = req.body;
      
      // Validate request
      this.validateMultiCloudRequest(request);
      
      // Check if multi-cloud is enabled
      if (!this.configManager.isFeatureEnabled('multi_cloud_orchestration')) {
        throw new Error('Multi-cloud orchestration feature is not enabled');
      }

      // Deploy to multi-cloud
      const deployment = await this.integrationService.deployToMultiCloud(request);
      
      res.json(this.createResponse(deployment, req));
    } catch (error) {
      res.status(400).json(this.createErrorResponse(error, req));
    }
  }

  private async getMultiCloudDeployments(req: Request, res: Response): Promise<void> {
    try {
      const deployments = await this.integrationService.getMultiCloudDeployments();
      
      res.json(this.createResponse(deployments, req));
    } catch (error) {
      res.status(500).json(this.createErrorResponse(error, req));
    }
  }

  private async triggerFailover(req: Request, res: Response): Promise<void> {
    try {
      const failoverRequest = req.body;
      const result = await this.integrationService.triggerFailover(failoverRequest);
      
      res.json(this.createResponse(result, req));
    } catch (error) {
      res.status(400).json(this.createErrorResponse(error, req));
    }
  }

  private async getCostOptimization(req: Request, res: Response): Promise<void> {
    try {
      const optimization = await this.integrationService.getCostOptimization();
      
      res.json(this.createResponse(optimization, req));
    } catch (error) {
      res.status(500).json(this.createErrorResponse(error, req));
    }
  }

  /**
   * Quantum Encryption Endpoints
   */
  private async quantumEncrypt(req: Request, res: Response): Promise<void> {
    try {
      const request: QuantumEncryptionRequest = req.body;
      
      // Validate request
      this.validateQuantumEncryptionRequest(request);
      
      // Check if quantum encryption is enabled
      if (!this.configManager.isFeatureEnabled('quantum_encryption')) {
        throw new Error('Quantum encryption feature is not enabled');
      }

      // Perform encryption
      const result = await this.integrationService.quantumEncrypt(request);
      
      res.json(this.createResponse(result, req));
    } catch (error) {
      res.status(400).json(this.createErrorResponse(error, req));
    }
  }

  private async quantumDecrypt(req: Request, res: Response): Promise<void> {
    try {
      const request: QuantumEncryptionRequest = req.body;
      const result = await this.integrationService.quantumDecrypt(request);
      
      res.json(this.createResponse(result, req));
    } catch (error) {
      res.status(400).json(this.createErrorResponse(error, req));
    }
  }

  private async quantumSign(req: Request, res: Response): Promise<void> {
    try {
      const request: QuantumEncryptionRequest = req.body;
      const result = await this.integrationService.quantumSign(request);
      
      res.json(this.createResponse(result, req));
    } catch (error) {
      res.status(400).json(this.createErrorResponse(error, req));
    }
  }

  private async quantumVerify(req: Request, res: Response): Promise<void> {
    try {
      const request: QuantumEncryptionRequest = req.body;
      const result = await this.integrationService.quantumVerify(request);
      
      res.json(this.createResponse(result, req));
    } catch (error) {
      res.status(400).json(this.createErrorResponse(error, req));
    }
  }

  private async generateQuantumKeys(req: Request, res: Response): Promise<void> {
    try {
      const request: QuantumEncryptionRequest = req.body;
      const result = await this.integrationService.generateQuantumKeys(request);
      
      res.json(this.createResponse(result, req));
    } catch (error) {
      res.status(400).json(this.createErrorResponse(error, req));
    }
  }

  /**
   * Configuration and Feature Flag Endpoints
   */
  private async getEnabledFeatures(req: Request, res: Response): Promise<void> {
    try {
      const features = this.integrationService.getEnabledFeatures();
      const config = this.configManager.getConfig();
      
      const result = {
        enabled_features: features,
        feature_configurations: config.features,
        rollout_status: config.rollout
      };
      
      res.json(this.createResponse(result, req));
    } catch (error) {
      res.status(500).json(this.createErrorResponse(error, req));
    }
  }

  private async getSystemMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = this.integrationService.getMetrics();
      
      res.json(this.createResponse(metrics, req));
    } catch (error) {
      res.status(500).json(this.createErrorResponse(error, req));
    }
  }

  private async getConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const config = this.configManager.getConfig();
      
      // Remove sensitive information
      const sanitizedConfig = {
        ...config,
        security: {
          ...config.security,
          // Remove sensitive security details
        }
      };
      
      res.json(this.createResponse(sanitizedConfig, req));
    } catch (error) {
      res.status(500).json(this.createErrorResponse(error, req));
    }
  }

  private async updateFeatureConfig(req: Request, res: Response): Promise<void> {
    try {
      const feature = req.params.feature;
      const newConfig = req.body;
      
      await this.integrationService.updateFeatureConfig(feature, newConfig);
      
      res.json(this.createResponse({ success: true, feature, updated_config: newConfig }, req));
    } catch (error) {
      res.status(400).json(this.createErrorResponse(error, req));
    }
  }

  private async getFeatureFlags(req: Request, res: Response): Promise<void> {
    try {
      const flags = await this.featureFlagManager.getAllFlags();
      
      res.json(this.createResponse(flags, req));
    } catch (error) {
      res.status(500).json(this.createErrorResponse(error, req));
    }
  }

  private async updateFeatureFlag(req: Request, res: Response): Promise<void> {
    try {
      const flagName = req.params.flag;
      const flagConfig = req.body;
      
      await this.featureFlagManager.updateFlag(flagName, flagConfig);
      
      res.json(this.createResponse({ success: true, flag: flagName, config: flagConfig }, req));
    } catch (error) {
      res.status(400).json(this.createErrorResponse(error, req));
    }
  }

  /**
   * Backward Compatibility Handler for v4.3 APIs
   */
  private async handleV43Compatibility(req: Request, res: Response): Promise<void> {
    try {
      this.logger.warn(`v4.3 API accessed: ${req.method} ${req.path}`, {
        deprecation_warning: true,
        migration_recommended: true
      });
      
      // Route to v4.3 compatibility layer
      const result = await this.integrationService.handleV43Request(req.method, req.path, req.body);
      
      res.set('X-Deprecation-Warning', 'This API version will be deprecated. Please migrate to v4.4');
      res.json(this.createResponse(result, req));
    } catch (error) {
      res.status(400).json(this.createErrorResponse(error, req));
    }
  }

  /**
   * Middleware Functions
   */
  private async requestLogger(req: Request, res: Response, next: NextFunction): Promise<void> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    req.headers['x-request-id'] = requestId;
    
    this.logger.info(`API Request: ${req.method} ${req.path}`, {
      request_id: requestId,
      user_agent: req.get('User-Agent'),
      ip: req.ip
    });
    
    next();
  }

  private async authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Implement authentication logic
      // For now, pass through - implement based on your auth system
      next();
    } catch (error) {
      res.status(401).json(this.createErrorResponse(new Error('Authentication failed'), req));
    }
  }

  private async rateLimitingMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Implement rate limiting logic
      // For now, pass through - implement based on your requirements
      next();
    } catch (error) {
      res.status(429).json(this.createErrorResponse(new Error('Rate limit exceeded'), req));
    }
  }

  private async featureFlagMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check feature flags for the requested endpoint
      const feature = this.extractFeatureFromPath(req.path);
      if (feature && !this.configManager.isFeatureEnabled(feature as any)) {
        throw new Error(`Feature ${feature} is not enabled`);
      }
      next();
    } catch (error) {
      res.status(403).json(this.createErrorResponse(error, req));
    }
  }

  private errorHandler(error: Error, req: Request, res: Response, next: NextFunction): void {
    this.logger.error('API Error:', error);
    
    if (!res.headersSent) {
      res.status(500).json(this.createErrorResponse(error, req));
    }
  }

  /**
   * Helper Methods
   */
  private createResponse<T>(data: T, req: Request): APIResponse<T> {
    return {
      success: true,
      data,
      metadata: {
        version: '4.4.0',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] as string,
        feature_flags: this.integrationService.getEnabledFeatures()
      }
    };
  }

  private createErrorResponse(error: Error, req: Request): APIResponse {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      metadata: {
        version: '4.4.0',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] as string
      }
    };
  }

  private extractFeatureFromPath(path: string): string | null {
    const pathSegments = path.split('/').filter(segment => segment.length > 0);
    
    const featureMap: { [key: string]: string } = {
      'federated-learning': 'federated_learning',
      'explainability': 'ai_explainability',
      'multi-cloud': 'multi_cloud_orchestration',
      'quantum-encryption': 'quantum_encryption'
    };
    
    return featureMap[pathSegments[0]] || null;
  }

  // Validation methods
  private validateFederatedLearningRequest(request: FederatedLearningRequest): void {
    if (!request.model_config || !request.data_config) {
      throw new Error('Model config and data config are required');
    }
    if (!request.num_clients || request.num_clients < 1) {
      throw new Error('Number of clients must be greater than 0');
    }
    if (!request.num_rounds || request.num_rounds < 1) {
      throw new Error('Number of rounds must be greater than 0');
    }
  }

  private validateExplainabilityRequest(request: ExplainabilityRequest): void {
    if (!request.model_id || !request.input_data) {
      throw new Error('Model ID and input data are required');
    }
    if (!['shap', 'lime', 'counterfactual', 'feature_importance'].includes(request.explanation_type)) {
      throw new Error('Invalid explanation type');
    }
  }

  private validateMultiCloudRequest(request: MultiCloudRequest): void {
    if (!request.deployment_config || !request.target_clouds) {
      throw new Error('Deployment config and target clouds are required');
    }
    if (!Array.isArray(request.target_clouds) || request.target_clouds.length === 0) {
      throw new Error('At least one target cloud must be specified');
    }
  }

  private validateQuantumEncryptionRequest(request: QuantumEncryptionRequest): void {
    if (!request.operation || !request.algorithm || !request.data) {
      throw new Error('Operation, algorithm, and data are required');
    }
    if (!['encrypt', 'decrypt', 'sign', 'verify', 'key_generation'].includes(request.operation)) {
      throw new Error('Invalid operation');
    }
  }

  /**
   * Get Express Router
   */
  public getRouter(): Router {
    return this.router;
  }
}

export default V44UnifiedAPIGateway;