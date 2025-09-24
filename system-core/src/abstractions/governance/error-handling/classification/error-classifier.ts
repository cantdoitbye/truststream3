/**
 * TrustStream v4.2 - Error Classification System
 * Advanced error classification with ML-enhanced pattern recognition
 */

import { 
  IErrorClassifier, 
  ErrorContext, 
  ErrorClassification, 
  ClassificationRule,
  ErrorType,
  ErrorSeverity,
  ErrorCategory,
  ImpactScope
} from '../core/interfaces';
import { ErrorRegistry } from '../core/error-registry';
import { Logger } from '../../../shared-utils/logger';
import { DatabaseInterface } from '../../../shared-utils/database-interface';

/**
 * Enhanced error classifier with machine learning capabilities
 */
export class ErrorClassifier implements IErrorClassifier {
  private registry: ErrorRegistry;
  private db: DatabaseInterface;
  private logger: Logger;
  private classificationCache: Map<string, ErrorClassification> = new Map();
  private patternLearning: PatternLearningEngine;

  constructor(
    db: DatabaseInterface,
    logger: Logger
  ) {
    this.registry = ErrorRegistry.getInstance();
    this.db = db;
    this.logger = logger;
    this.patternLearning = new PatternLearningEngine();
  }

  /**
   * Classify an error using multiple classification strategies
   */
  async classifyError(
    error: Error, 
    context: ErrorContext
  ): Promise<ErrorClassification> {
    const startTime = Date.now();
    
    try {
      this.logger.debug(`Classifying error: ${context.error_id}`, {
        agent_id: context.agent_id,
        error_message: error.message
      });

      // Check cache first
      const cacheKey = this.generateCacheKey(error, context);
      const cachedClassification = this.classificationCache.get(cacheKey);
      if (cachedClassification) {
        this.logger.debug(`Using cached classification for error: ${context.error_id}`);
        return cachedClassification;
      }

      // Multi-strategy classification
      const strategies = [
        this.classifyByRules(error, context),
        this.classifyByPatterns(error, context),
        this.classifyByContext(error, context),
        this.classifyByHistoricalData(error, context)
      ];

      const classifications = await Promise.allSettled(strategies);
      const validClassifications = classifications
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<Partial<ErrorClassification>>).value);

      // Combine classifications using weighted voting
      const finalClassification = this.combineClassifications(
        validClassifications,
        error,
        context
      );

      // Learn from this classification
      await this.patternLearning.learnFromClassification(
        error,
        context,
        finalClassification
      );

      // Cache the result
      this.classificationCache.set(cacheKey, finalClassification);

      // Store classification in database
      await this.storeClassification(context.error_id, finalClassification);

      const duration = Date.now() - startTime;
      this.logger.info(`Error classified successfully: ${context.error_id}`, {
        classification: finalClassification,
        duration_ms: duration
      });

      return finalClassification;

    } catch (classificationError) {
      this.logger.error('Error classification failed', {
        error_id: context.error_id,
        classification_error: classificationError.message
      });

      // Return default classification
      return this.getDefaultClassification(error, context);
    }
  }

  /**
   * Classify error using predefined rules
   */
  private async classifyByRules(
    error: Error, 
    context: ErrorContext
  ): Promise<Partial<ErrorClassification>> {
    const matchingRules = this.registry.findMatchingRules(error.message);
    
    if (matchingRules.length === 0) {
      return {};
    }

    // Use the highest priority rule
    const topRule = matchingRules[0];
    
    return {
      error_type: topRule.error_type,
      severity: topRule.severity,
      category: topRule.category,
      confidence_score: topRule.confidence * 0.8, // Rule-based confidence
      is_retryable: this.registry.isRetryable(topRule.error_type, error.message),
      is_transient: this.registry.isTransient(topRule.error_type, error.message),
      estimated_recovery_time: this.registry.estimateRecoveryTime(
        topRule.error_type, 
        topRule.severity
      )
    };
  }

  /**
   * Classify error using pattern matching
   */
  private async classifyByPatterns(
    error: Error, 
    context: ErrorContext
  ): Promise<Partial<ErrorClassification>> {
    const detectedType = this.registry.detectErrorType(error.message);
    
    if (!detectedType) {
      return {};
    }

    const severity = this.registry.determineSeverity(error.message, detectedType);
    const impactScope = this.registry.determineImpactScope(
      detectedType,
      context.agent_type,
      error.message
    );

    return {
      error_type: detectedType,
      severity,
      impact_scope: impactScope,
      confidence_score: 0.7, // Pattern-based confidence
      is_retryable: this.registry.isRetryable(detectedType, error.message),
      is_transient: this.registry.isTransient(detectedType, error.message)
    };
  }

  /**
   * Classify error using execution context
   */
  private async classifyByContext(
    error: Error, 
    context: ErrorContext
  ): Promise<Partial<ErrorClassification>> {
    const classification: Partial<ErrorClassification> = {
      confidence_score: 0.6 // Context-based confidence
    };

    // Analyze stack trace for additional insights
    if (context.stack_trace) {
      const stackAnalysis = this.analyzeStackTrace(context.stack_trace);
      Object.assign(classification, stackAnalysis);
    }

    // Analyze environment metrics
    const envAnalysis = this.analyzeEnvironment(context.environment);
    Object.assign(classification, envAnalysis);

    // Determine if immediate attention is required
    classification.requires_immediate_attention = this.requiresImmediateAttention(
      classification.severity || 'medium',
      classification.impact_scope || 'single_request',
      context
    );

    return classification;
  }

  /**
   * Classify error using historical data and patterns
   */
  private async classifyByHistoricalData(
    error: Error, 
    context: ErrorContext
  ): Promise<Partial<ErrorClassification>> {
    try {
      // Look for similar errors in the past
      const similarErrors = await this.findSimilarErrors(error, context);
      
      if (similarErrors.length === 0) {
        return { confidence_score: 0.3 };
      }

      // Calculate classification based on historical patterns
      const historicalClassification = this.analyzeHistoricalPatterns(similarErrors);
      historicalClassification.confidence_score = 0.8; // High confidence for historical data

      return historicalClassification;

    } catch (dbError) {
      this.logger.warn('Failed to analyze historical data', { error: dbError.message });
      return { confidence_score: 0.1 };
    }
  }

  /**
   * Combine multiple classification results using weighted voting
   */
  private combineClassifications(
    classifications: Partial<ErrorClassification>[],
    error: Error,
    context: ErrorContext
  ): ErrorClassification {
    if (classifications.length === 0) {
      return this.getDefaultClassification(error, context);
    }

    // Weighted voting for each field
    const errorTypes = this.weightedVote(
      classifications,
      'error_type',
      (c) => c.confidence_score || 0.5
    );
    
    const severities = this.weightedVote(
      classifications,
      'severity',
      (c) => c.confidence_score || 0.5
    );
    
    const categories = this.weightedVote(
      classifications,
      'category',
      (c) => c.confidence_score || 0.5
    );

    // Calculate combined confidence
    const totalConfidence = classifications.reduce(
      (sum, c) => sum + (c.confidence_score || 0),
      0
    ) / classifications.length;

    // Determine final values
    const finalClassification: ErrorClassification = {
      error_type: errorTypes[0]?.value || 'system_error',
      severity: severities[0]?.value || 'medium',
      category: categories[0]?.value || 'application',
      subcategory: this.determineSubcategory(errorTypes[0]?.value, error.message),
      is_retryable: this.determineRetryability(classifications),
      is_transient: this.determineTransience(classifications),
      requires_immediate_attention: this.determineUrgency(severities[0]?.value || 'medium'),
      estimated_recovery_time: this.determineRecoveryTime(classifications),
      impact_scope: this.determineImpactScope(classifications, context),
      confidence_score: Math.min(totalConfidence, 1.0)
    };

    return finalClassification;
  }

  /**
   * Weighted voting for classification fields
   */
  private weightedVote<T>(
    classifications: Partial<ErrorClassification>[],
    field: keyof ErrorClassification,
    weightFn: (c: Partial<ErrorClassification>) => number
  ): Array<{ value: T; weight: number }> {
    const votes = new Map<T, number>();
    
    classifications.forEach(classification => {
      const value = classification[field] as T;
      if (value !== undefined) {
        const weight = weightFn(classification);
        votes.set(value, (votes.get(value) || 0) + weight);
      }
    });
    
    return Array.from(votes.entries())
      .map(([value, weight]) => ({ value, weight }))
      .sort((a, b) => b.weight - a.weight);
  }

  /**
   * Generate cache key for error classification
   */
  private generateCacheKey(error: Error, context: ErrorContext): string {
    const keyComponents = [
      error.name,
      error.message.substring(0, 100), // First 100 chars
      context.agent_type,
      context.environment.memory_usage > 90 ? 'high_memory' : 'normal_memory',
      context.environment.cpu_usage > 90 ? 'high_cpu' : 'normal_cpu'
    ];
    
    return keyComponents.join('|');
  }

  /**
   * Analyze stack trace for classification insights
   */
  private analyzeStackTrace(stackTrace: string): Partial<ErrorClassification> {
    const analysis: Partial<ErrorClassification> = {};
    
    // Database-related stack traces
    if (stackTrace.includes('postgresql') || stackTrace.includes('mysql') || 
        stackTrace.includes('database') || stackTrace.includes('sql')) {
      analysis.category = 'infrastructure';
      analysis.error_type = 'database_error';
    }
    
    // Network-related stack traces
    if (stackTrace.includes('fetch') || stackTrace.includes('axios') || 
        stackTrace.includes('request') || stackTrace.includes('http')) {
      analysis.category = 'infrastructure';
      analysis.error_type = 'network_error';
    }
    
    // Memory-related stack traces
    if (stackTrace.includes('OutOfMemoryError') || stackTrace.includes('heap')) {
      analysis.category = 'infrastructure';
      analysis.error_type = 'resource_exhaustion';
      analysis.severity = 'critical';
    }
    
    // Validation-related stack traces
    if (stackTrace.includes('validation') || stackTrace.includes('schema') || 
        stackTrace.includes('joi') || stackTrace.includes('yup')) {
      analysis.category = 'application';
      analysis.error_type = 'validation_error';
    }
    
    return analysis;
  }

  /**
   * Analyze environment metrics for classification
   */
  private analyzeEnvironment(environment: ErrorContext['environment']): Partial<ErrorClassification> {
    const analysis: Partial<ErrorClassification> = {};
    
    // High memory usage suggests resource exhaustion
    if (environment.memory_usage > 90) {
      analysis.error_type = 'resource_exhaustion';
      analysis.severity = 'high';
      analysis.category = 'infrastructure';
    }
    
    // High CPU usage suggests performance issues
    if (environment.cpu_usage > 95) {
      analysis.error_type = 'resource_exhaustion';
      analysis.severity = 'high';
      analysis.category = 'infrastructure';
    }
    
    // High connection count suggests network issues
    if (environment.active_connections > 1000) {
      analysis.error_type = 'network_error';
      analysis.severity = 'medium';
      analysis.category = 'infrastructure';
    }
    
    return analysis;
  }

  /**
   * Check if error requires immediate attention
   */
  private requiresImmediateAttention(
    severity: ErrorSeverity,
    impactScope: ImpactScope,
    context: ErrorContext
  ): boolean {
    // Critical and emergency errors always require immediate attention
    if (severity === 'critical' || severity === 'emergency') {
      return true;
    }
    
    // System-wide or cross-system errors require immediate attention
    if (impactScope === 'system_wide' || impactScope === 'cross_system') {
      return true;
    }
    
    // High severity errors affecting agent clusters
    if (severity === 'high' && impactScope === 'agent_cluster') {
      return true;
    }
    
    // Security-related errors
    if (context.metadata.security_related) {
      return true;
    }
    
    return false;
  }

  /**
   * Find similar errors from historical data
   */
  private async findSimilarErrors(
    error: Error, 
    context: ErrorContext
  ): Promise<ErrorClassification[]> {
    try {
      const query = `
        SELECT ec.* FROM error_classifications ec
        JOIN error_contexts e ON ec.error_id = e.error_id
        WHERE 
          e.agent_type = $1
          AND (
            similarity(e.error_message, $2) > 0.7
            OR e.error_message ILIKE $3
          )
          AND e.timestamp > NOW() - INTERVAL '30 days'
        ORDER BY e.timestamp DESC
        LIMIT 10
      `;
      
      const params = [
        context.agent_type,
        error.message,
        `%${error.message.substring(0, 50)}%`
      ];
      
      const result = await this.db.query(query, params);
      return result.rows || [];
      
    } catch (dbError) {
      this.logger.warn('Failed to query historical errors', { error: dbError.message });
      return [];
    }
  }

  /**
   * Analyze historical patterns to determine classification
   */
  private analyzeHistoricalPatterns(
    similarErrors: ErrorClassification[]
  ): Partial<ErrorClassification> {
    if (similarErrors.length === 0) {
      return {};
    }

    // Calculate mode (most common value) for each field
    const errorTypes = this.calculateMode(similarErrors.map(e => e.error_type));
    const severities = this.calculateMode(similarErrors.map(e => e.severity));
    const categories = this.calculateMode(similarErrors.map(e => e.category));
    
    // Calculate average recovery time
    const avgRecoveryTime = similarErrors.reduce(
      (sum, e) => sum + e.estimated_recovery_time, 0
    ) / similarErrors.length;
    
    // Determine retryability based on historical success
    const retryableCount = similarErrors.filter(e => e.is_retryable).length;
    const isRetryable = retryableCount / similarErrors.length > 0.5;
    
    return {
      error_type: errorTypes,
      severity: severities,
      category: categories,
      estimated_recovery_time: Math.round(avgRecoveryTime),
      is_retryable: isRetryable,
      is_transient: similarErrors.some(e => e.is_transient)
    };
  }

  /**
   * Calculate the mode (most frequent value) in an array
   */
  private calculateMode<T>(values: T[]): T | undefined {
    const frequency = new Map<T, number>();
    
    values.forEach(value => {
      frequency.set(value, (frequency.get(value) || 0) + 1);
    });
    
    let maxCount = 0;
    let mode: T | undefined;
    
    frequency.forEach((count, value) => {
      if (count > maxCount) {
        maxCount = count;
        mode = value;
      }
    });
    
    return mode;
  }

  /**
   * Determine final retryability from multiple classifications
   */
  private determineRetryability(
    classifications: Partial<ErrorClassification>[]
  ): boolean {
    const retryableVotes = classifications.filter(c => c.is_retryable !== undefined);
    if (retryableVotes.length === 0) return true;
    
    const positiveVotes = retryableVotes.filter(c => c.is_retryable).length;
    return positiveVotes / retryableVotes.length > 0.5;
  }

  /**
   * Determine final transience from multiple classifications
   */
  private determineTransience(
    classifications: Partial<ErrorClassification>[]
  ): boolean {
    const transientVotes = classifications.filter(c => c.is_transient !== undefined);
    if (transientVotes.length === 0) return false;
    
    const positiveVotes = transientVotes.filter(c => c.is_transient).length;
    return positiveVotes / transientVotes.length > 0.5;
  }

  /**
   * Determine if error is urgent based on severity
   */
  private determineUrgency(severity: ErrorSeverity): boolean {
    return severity === 'critical' || severity === 'emergency' || severity === 'high';
  }

  /**
   * Determine recovery time from multiple estimates
   */
  private determineRecoveryTime(
    classifications: Partial<ErrorClassification>[]
  ): number {
    const timeEstimates = classifications
      .map(c => c.estimated_recovery_time)
      .filter(t => t !== undefined) as number[];
    
    if (timeEstimates.length === 0) return 60000; // Default 1 minute
    
    // Use median to avoid outliers
    timeEstimates.sort((a, b) => a - b);
    const middle = Math.floor(timeEstimates.length / 2);
    
    return timeEstimates.length % 2 === 0
      ? (timeEstimates[middle - 1] + timeEstimates[middle]) / 2
      : timeEstimates[middle];
  }

  /**
   * Determine impact scope from classifications
   */
  private determineImpactScope(
    classifications: Partial<ErrorClassification>[],
    context: ErrorContext
  ): ImpactScope {
    const scopes = classifications
      .map(c => c.impact_scope)
      .filter(s => s !== undefined) as ImpactScope[];
    
    if (scopes.length === 0) {
      return 'single_request';
    }
    
    // Priority order: system_wide > cross_system > agent_cluster > single_agent > single_request
    const priorityOrder: ImpactScope[] = [
      'system_wide',
      'cross_system', 
      'agent_cluster',
      'single_agent',
      'single_request'
    ];
    
    for (const scope of priorityOrder) {
      if (scopes.includes(scope)) {
        return scope;
      }
    }
    
    return 'single_request';
  }

  /**
   * Determine subcategory based on error type and message
   */
  private determineSubcategory(errorType: ErrorType | undefined, errorMessage: string): string {
    if (!errorType) return 'unknown';
    
    const subcategoryMappings: Record<ErrorType, string[]> = {
      'system_error': ['memory', 'cpu', 'disk', 'process'],
      'database_error': ['connection', 'query', 'constraint', 'deadlock'],
      'network_error': ['timeout', 'connection_reset', 'dns', 'ssl'],
      'validation_error': ['schema', 'format', 'range', 'required'],
      'authentication_error': ['token', 'credentials', 'session', 'oauth'],
      'authorization_error': ['permissions', 'role', 'resource', 'policy'],
      'rate_limit_error': ['api_limit', 'request_limit', 'bandwidth', 'quota'],
      'timeout_error': ['request_timeout', 'operation_timeout', 'connection_timeout'],
      'dependency_error': ['service_unavailable', 'version_mismatch', 'api_change'],
      'configuration_error': ['missing_config', 'invalid_value', 'environment'],
      'resource_exhaustion': ['memory', 'cpu', 'disk', 'connections'],
      'business_logic_error': ['workflow', 'state', 'constraint', 'rule'],
      'data_corruption_error': ['checksum', 'format', 'integrity', 'encoding'],
      'protocol_error': ['http', 'websocket', 'grpc', 'message_format'],
      'agent_coordination_error': ['consensus', 'communication', 'synchronization', 'leadership']
    };
    
    const possibleSubcategories = subcategoryMappings[errorType] || ['unknown'];
    
    // Find matching subcategory based on error message
    for (const subcategory of possibleSubcategories) {
      if (errorMessage.toLowerCase().includes(subcategory)) {
        return subcategory;
      }
    }
    
    return possibleSubcategories[0];
  }

  /**
   * Get default classification when all strategies fail
   */
  private getDefaultClassification(
    error: Error,
    context: ErrorContext
  ): ErrorClassification {
    return {
      error_type: 'system_error',
      severity: 'medium',
      category: 'application',
      subcategory: 'unknown',
      is_retryable: true,
      is_transient: false,
      requires_immediate_attention: false,
      estimated_recovery_time: 60000, // 1 minute
      impact_scope: 'single_request',
      confidence_score: 0.1 // Very low confidence
    };
  }

  /**
   * Store classification in database for historical analysis
   */
  private async storeClassification(
    errorId: string,
    classification: ErrorClassification
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO error_classifications (
          error_id, error_type, severity, category, subcategory,
          is_retryable, is_transient, requires_immediate_attention,
          estimated_recovery_time, impact_scope, confidence_score,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        ON CONFLICT (error_id) DO UPDATE SET
          error_type = EXCLUDED.error_type,
          severity = EXCLUDED.severity,
          category = EXCLUDED.category,
          subcategory = EXCLUDED.subcategory,
          is_retryable = EXCLUDED.is_retryable,
          is_transient = EXCLUDED.is_transient,
          requires_immediate_attention = EXCLUDED.requires_immediate_attention,
          estimated_recovery_time = EXCLUDED.estimated_recovery_time,
          impact_scope = EXCLUDED.impact_scope,
          confidence_score = EXCLUDED.confidence_score,
          updated_at = NOW()
      `;
      
      const params = [
        errorId,
        classification.error_type,
        classification.severity,
        classification.category,
        classification.subcategory,
        classification.is_retryable,
        classification.is_transient,
        classification.requires_immediate_attention,
        classification.estimated_recovery_time,
        classification.impact_scope,
        classification.confidence_score
      ];
      
      await this.db.query(query, params);
      
    } catch (dbError) {
      this.logger.warn('Failed to store error classification', {
        error_id: errorId,
        error: dbError.message
      });
    }
  }

  /**
   * Update classification rules
   */
  async updateClassificationRules(rules: ClassificationRule[]): Promise<void> {
    this.logger.info(`Updating ${rules.length} classification rules`);
    
    for (const rule of rules) {
      this.registry.addRule(rule);
    }
    
    // Clear cache to force re-classification with new rules
    this.classificationCache.clear();
    
    this.logger.info('Classification rules updated successfully');
  }

  /**
   * Get classification history for an error
   */
  async getClassificationHistory(errorId: string): Promise<ErrorClassification[]> {
    try {
      const query = `
        SELECT * FROM error_classifications
        WHERE error_id = $1
        ORDER BY created_at DESC
      `;
      
      const result = await this.db.query(query, [errorId]);
      return result.rows || [];
      
    } catch (dbError) {
      this.logger.error('Failed to get classification history', {
        error_id: errorId,
        error: dbError.message
      });
      return [];
    }
  }
}

/**
 * Pattern learning engine for improving classification accuracy
 */
class PatternLearningEngine {
  private patterns: Map<string, LearningPattern> = new Map();
  private feedbackHistory: ClassificationFeedback[] = [];

  /**
   * Learn from a new classification
   */
  async learnFromClassification(
    error: Error,
    context: ErrorContext,
    classification: ErrorClassification
  ): Promise<void> {
    const pattern = this.extractPattern(error, context);
    const patternKey = this.generatePatternKey(pattern);
    
    const existingPattern = this.patterns.get(patternKey);
    
    if (existingPattern) {
      existingPattern.frequency++;
      existingPattern.classifications.push(classification);
      this.updatePatternMetrics(existingPattern);
    } else {
      this.patterns.set(patternKey, {
        pattern,
        frequency: 1,
        classifications: [classification],
        accuracy: 1.0,
        lastSeen: new Date()
      });
    }
  }

  /**
   * Extract learnable pattern from error and context
   */
  private extractPattern(error: Error, context: ErrorContext): ErrorPattern {
    return {
      errorName: error.name,
      messageKeywords: this.extractKeywords(error.message),
      agentType: context.agent_type,
      environmentConditions: {
        highMemory: context.environment.memory_usage > 80,
        highCpu: context.environment.cpu_usage > 80,
        highConnections: context.environment.active_connections > 500
      },
      stackTraceSignature: context.stack_trace ? 
        this.generateStackSignature(context.stack_trace) : undefined
    };
  }

  /**
   * Extract keywords from error message
   */
  private extractKeywords(message: string): string[] {
    const commonWords = new Set([
      'error', 'failed', 'exception', 'undefined', 'null', 'cannot', 'unable',
      'timeout', 'connection', 'database', 'network', 'memory', 'permission'
    ]);
    
    return message
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && commonWords.has(word))
      .slice(0, 10); // Limit to 10 keywords
  }

  /**
   * Generate stack trace signature for pattern matching
   */
  private generateStackSignature(stackTrace: string): string {
    const lines = stackTrace.split('\n').slice(0, 5); // First 5 lines
    return lines
      .map(line => line.replace(/:\d+:\d+/g, '')) // Remove line numbers
      .join('|');
  }

  /**
   * Generate pattern key for lookup
   */
  private generatePatternKey(pattern: ErrorPattern): string {
    const components = [
      pattern.errorName,
      pattern.agentType,
      pattern.messageKeywords.join(','),
      Object.values(pattern.environmentConditions).join(','),
      pattern.stackTraceSignature || ''
    ];
    
    return components.join('|');
  }

  /**
   * Update pattern metrics based on feedback
   */
  private updatePatternMetrics(pattern: LearningPattern): void {
    // Calculate accuracy based on classification consistency
    const classifications = pattern.classifications;
    if (classifications.length < 2) {
      pattern.accuracy = 1.0;
      return;
    }
    
    const mostCommonType = this.getMostCommon(
      classifications.map(c => c.error_type)
    );
    const typeAccuracy = classifications.filter(
      c => c.error_type === mostCommonType
    ).length / classifications.length;
    
    const mostCommonSeverity = this.getMostCommon(
      classifications.map(c => c.severity)
    );
    const severityAccuracy = classifications.filter(
      c => c.severity === mostCommonSeverity
    ).length / classifications.length;
    
    pattern.accuracy = (typeAccuracy + severityAccuracy) / 2;
    pattern.lastSeen = new Date();
  }

  /**
   * Get most common value in array
   */
  private getMostCommon<T>(values: T[]): T {
    const frequency = new Map<T, number>();
    
    values.forEach(value => {
      frequency.set(value, (frequency.get(value) || 0) + 1);
    });
    
    let maxCount = 0;
    let mostCommon = values[0];
    
    frequency.forEach((count, value) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = value;
      }
    });
    
    return mostCommon;
  }
}

interface ErrorPattern {
  errorName: string;
  messageKeywords: string[];
  agentType: string;
  environmentConditions: {
    highMemory: boolean;
    highCpu: boolean;
    highConnections: boolean;
  };
  stackTraceSignature?: string;
}

interface LearningPattern {
  pattern: ErrorPattern;
  frequency: number;
  classifications: ErrorClassification[];
  accuracy: number;
  lastSeen: Date;
}

interface ClassificationFeedback {
  patternKey: string;
  expectedClassification: ErrorClassification;
  actualClassification: ErrorClassification;
  feedback: 'correct' | 'incorrect' | 'partial';
  timestamp: Date;
}