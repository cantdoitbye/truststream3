/**
 * Test for AI Leader Quality Agent Configuration Fixes
 * Verifies that the configuration issues have been resolved
 */

import { QualityAgent } from '../src/agents/ai-leader-quality-agent/index';
import { EnhancedQualityAgent } from '../src/agents/ai-leader-quality-agent/enhanced-index';
import { QualityAgentConfig } from '../src/agents/ai-leader-quality-agent/config';
import { QUALITY_AGENT_CONFIG } from '../src/agents/config/default-config';
import { 
  calculateQualityScore,
  identifyQualityIssues,
  generateQualityRecommendations,
  validateQualityMetrics
} from '../src/agents/ai-leader-quality-agent/utils';

describe('AI Leader Quality Agent Configuration Tests', () => {
  
  describe('Configuration Object Tests', () => {
    
    test('QUALITY_AGENT_CONFIG should have all required properties', () => {
      expect(QUALITY_AGENT_CONFIG).toBeDefined();
      expect(QUALITY_AGENT_CONFIG.monitoring).toBeDefined();
      expect(QUALITY_AGENT_CONFIG.thresholds).toBeDefined();
      expect(QUALITY_AGENT_CONFIG.compliance).toBeDefined();
      expect(QUALITY_AGENT_CONFIG.analysis).toBeDefined();
      expect(QUALITY_AGENT_CONFIG.improvements).toBeDefined();
      expect(QUALITY_AGENT_CONFIG.retention).toBeDefined();
      expect(QUALITY_AGENT_CONFIG.reporting).toBeDefined();
      expect(QUALITY_AGENT_CONFIG.enforcement).toBeDefined();
      expect(QUALITY_AGENT_CONFIG.benchmarking).toBeDefined();
    });

    test('Should have maxResponseTime in monitoring config', () => {
      expect(QUALITY_AGENT_CONFIG.monitoring.maxResponseTime).toBeDefined();
      expect(typeof QUALITY_AGENT_CONFIG.monitoring.maxResponseTime).toBe('number');
      expect(QUALITY_AGENT_CONFIG.monitoring.maxResponseTime).toBeGreaterThan(0);
    });

    test('Should have complianceHistoryRetention in retention config', () => {
      expect(QUALITY_AGENT_CONFIG.retention.complianceHistoryRetention).toBeDefined();
      expect(typeof QUALITY_AGENT_CONFIG.retention.complianceHistoryRetention).toBe('number');
      expect(QUALITY_AGENT_CONFIG.retention.complianceHistoryRetention).toBeGreaterThan(0);
    });

    test('Should have period in reporting config', () => {
      expect(QUALITY_AGENT_CONFIG.reporting.period).toBeDefined();
      expect(typeof QUALITY_AGENT_CONFIG.reporting.period).toBe('number');
      expect(QUALITY_AGENT_CONFIG.reporting.period).toBeGreaterThan(0);
    });
  });

  describe('QualityAgentConfig Class Tests', () => {
    
    test('Should initialize with default config', () => {
      const config = new QualityAgentConfig();
      expect(config).toBeDefined();
      expect(config.monitoring).toBeDefined();
      expect(config.thresholds).toBeDefined();
      expect(config.compliance).toBeDefined();
      expect(config.analysis).toBeDefined();
      expect(config.improvements).toBeDefined();
    });

    test('Should handle invalid config gracefully', () => {
      const config = new QualityAgentConfig(null as any);
      expect(config).toBeDefined();
      expect(config.monitoring).toBeDefined();
    });

    test('Should provide safe accessor methods', () => {
      const config = new QualityAgentConfig();
      
      expect(typeof config.getMonitoringInterval()).toBe('number');
      expect(typeof config.getMaxResponseTime()).toBe('number');
      expect(typeof config.getComplianceAuditPeriod()).toBe('number');
      expect(typeof config.getComplianceHistoryRetention()).toBe('number');
      expect(typeof config.getReportingPeriod()).toBe('number');
      expect(typeof config.getTrendWindow()).toBe('number');
      expect(typeof config.getDeviationWindow()).toBe('number');
      expect(typeof config.getMaxRecommendations()).toBe('number');
      
      // All should return positive numbers
      expect(config.getMonitoringInterval()).toBeGreaterThan(0);
      expect(config.getMaxResponseTime()).toBeGreaterThan(0);
      expect(config.getComplianceAuditPeriod()).toBeGreaterThan(0);
      expect(config.getComplianceHistoryRetention()).toBeGreaterThan(0);
      expect(config.getReportingPeriod()).toBeGreaterThan(0);
      expect(config.getTrendWindow()).toBeGreaterThan(0);
      expect(config.getDeviationWindow()).toBeGreaterThan(0);
      expect(config.getMaxRecommendations()).toBeGreaterThan(0);
    });

    test('Should validate config correctly', () => {
      const config = new QualityAgentConfig();
      expect(config.validateConfig()).toBe(true);
    });
  });

  describe('Utility Functions Tests', () => {
    
    test('calculateQualityScore should handle invalid input gracefully', () => {
      // Test with null input
      const score1 = calculateQualityScore(null as any);
      expect(typeof score1).toBe('number');
      expect(score1).toBeGreaterThanOrEqual(0);
      expect(score1).toBeLessThanOrEqual(1);

      // Test with undefined input
      const score2 = calculateQualityScore(undefined as any);
      expect(typeof score2).toBe('number');
      expect(score2).toBeGreaterThanOrEqual(0);
      expect(score2).toBeLessThanOrEqual(1);

      // Test with invalid metrics
      const score3 = calculateQualityScore({
        accuracy: 'invalid' as any,
        relevance: NaN,
        completeness: -1,
        clarity: 2,
        consistency: null as any,
        timeliness: undefined as any
      });
      expect(typeof score3).toBe('number');
      expect(score3).toBeGreaterThanOrEqual(0);
      expect(score3).toBeLessThanOrEqual(1);
    });

    test('identifyQualityIssues should handle invalid input gracefully', async () => {
      // Test with null inputs
      const issues1 = await identifyQualityIssues(null as any, null as any);
      expect(Array.isArray(issues1)).toBe(true);

      // Test with invalid quality score
      const issues2 = await identifyQualityIssues({} as any, {});
      expect(Array.isArray(issues2)).toBe(true);
    });

    test('generateQualityRecommendations should handle invalid input gracefully', async () => {
      // Test with null input
      const recommendations1 = await generateQualityRecommendations(null as any);
      expect(Array.isArray(recommendations1)).toBe(true);

      // Test with invalid quality score
      const recommendations2 = await generateQualityRecommendations({} as any);
      expect(Array.isArray(recommendations2)).toBe(true);
    });

    test('validateQualityMetrics should handle invalid input gracefully', () => {
      expect(validateQualityMetrics(null as any)).toBe(false);
      expect(validateQualityMetrics(undefined as any)).toBe(false);
      expect(validateQualityMetrics({} as any)).toBe(true); // Empty object is technically valid
      expect(validateQualityMetrics('invalid' as any)).toBe(false);
    });
  });

  describe('Agent Initialization Tests', () => {
    
    test('QualityAgent should initialize without errors', async () => {
      const config = {
        environment: 'development' as const,
        logLevel: 'info' as const,
        database: {
          type: 'postgresql' as const,
          connectionString: 'test://localhost',
          poolSize: 10,
          retryAttempts: 3
        },
        orchestrator: {
          endpoint: 'http://localhost:3000',
          authToken: 'test-token',
          heartbeatInterval: 30000,
          maxRetries: 3
        },
        monitoring: {
          metricsEndpoint: 'http://localhost:9090',
          alertingEndpoint: 'http://localhost:9093',
          logAggregationEndpoint: 'http://localhost:5000',
          enableTracing: false
        }
      };

      const agent = new QualityAgent(config);
      expect(agent).toBeDefined();
      expect(agent.agentId).toBe('ai-leader-quality-agent');
      expect(agent.agentType).toBe('quality');
      
      // Should not throw during construction
      expect(() => new QualityAgent(config)).not.toThrow();
    });

    test('EnhancedQualityAgent should initialize without errors', async () => {
      const config = {
        environment: 'development' as const,
        logLevel: 'info' as const,
        database: {
          type: 'postgresql' as const,
          connectionString: 'test://localhost',
          poolSize: 10,
          retryAttempts: 3
        },
        orchestrator: {
          endpoint: 'http://localhost:3000',
          authToken: 'test-token',
          heartbeatInterval: 30000,
          maxRetries: 3
        },
        monitoring: {
          metricsEndpoint: 'http://localhost:9090',
          alertingEndpoint: 'http://localhost:9093',
          logAggregationEndpoint: 'http://localhost:5000',
          enableTracing: false
        }
      };

      const agent = new EnhancedQualityAgent(config);
      expect(agent).toBeDefined();
      expect(agent.agentId).toBe('ai-leader-quality-agent-enhanced');
      expect(agent.agentType).toBe('quality');
      
      // Should not throw during construction
      expect(() => new EnhancedQualityAgent(config)).not.toThrow();
    });
  });
});
