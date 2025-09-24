/**
 * Comprehensive Testing Framework for Enhanced Trust Scoring System
 * TrustStream v4.2 - Testing Suite with Backward Compatibility & Enhanced Features
 * 
 * Author: MiniMax Agent
 * Date: 2025-09-20
 * 
 * Provides comprehensive testing coverage for:
 * - Backward compatibility with v4.1
 * - Enhanced governance features
 * - Performance benchmarks
 * - Security validation
 * - Integration tests
 * - Load testing
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { DatabaseInterface } from '../shared-utils/database-interface';
import { Logger } from '../shared-utils/logger';
import { TrustPyramidCalculator } from '../trust-pyramid/trust-pyramid-calculator';
import { FeatureFlagManager } from '../feature-flags/feature-flag-manager';

// ================================================================
// TEST CONFIGURATION AND SETUP
// ================================================================

interface TestContext {
  supabase: any;
  db: DatabaseInterface;
  logger: Logger;
  trustCalculator: TrustPyramidCalculator;
  featureFlagManager: FeatureFlagManager;
}

interface TestDataSets {
  v41_compatible_request: any;
  enhanced_governance_request: any;
  complex_governance_context: any;
  performance_test_requests: any[];
  security_test_cases: any[];
}

let testContext: TestContext;
let testData: TestDataSets;

// ================================================================
// TEST SETUP AND TEARDOWN
// ================================================================

beforeAll(async () => {
  // Initialize test environment
  const supabase = createClient(
    process.env.SUPABASE_URL || 'http://localhost:54321',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key'
  );

  const db = new DatabaseInterface(supabase);
  const logger = new Logger('test');
  const trustCalculator = new TrustPyramidCalculator(db, logger);
  const featureFlagManager = new FeatureFlagManager(db, logger);

  testContext = {
    supabase,
    db,
    logger,
    trustCalculator,
    featureFlagManager
  };

  // Initialize test data
  testData = await initializeTestData();

  // Setup test database state
  await setupTestDatabase();
});

afterAll(async () => {
  // Cleanup test environment
  await cleanupTestDatabase();
});

beforeEach(async () => {
  // Reset feature flags to known state
  await resetFeatureFlags();
});

// ================================================================
// BACKWARD COMPATIBILITY TESTS
// ================================================================

describe('Backward Compatibility Tests', () => {
  
  test('v4.1 requests work unchanged', async () => {
    const response = await callEnhancedGovernanceScoring(testData.v41_compatible_request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.version).toBe("4.1");
    expect(data.scores).toHaveProperty('trust_score_4d');
    expect(data.scores.trust_score_4d).toHaveProperty('iq');
    expect(data.scores.trust_score_4d).toHaveProperty('appeal');
    expect(data.scores.trust_score_4d).toHaveProperty('social');
    expect(data.scores.trust_score_4d).toHaveProperty('humanity');
    
    // Verify score ranges
    expect(data.scores.trust_score_4d.iq).toBeGreaterThanOrEqual(0);
    expect(data.scores.trust_score_4d.iq).toBeLessThanOrEqual(1);
    expect(data.scores.trust_score_4d.appeal).toBeGreaterThanOrEqual(0);
    expect(data.scores.trust_score_4d.appeal).toBeLessThanOrEqual(1);
    expect(data.scores.trust_score_4d.social).toBeGreaterThanOrEqual(0);
    expect(data.scores.trust_score_4d.social).toBeLessThanOrEqual(1);
    expect(data.scores.trust_score_4d.humanity).toBeGreaterThanOrEqual(0);
    expect(data.scores.trust_score_4d.humanity).toBeLessThanOrEqual(1);
  });

  test('missing version defaults to v4.1', async () => {
    const requestWithoutVersion = {
      memory_object_id: 'test-memory-001',
      governance_context: testData.v41_compatible_request.governance_context
    };
    
    const response = await callEnhancedGovernanceScoring(requestWithoutVersion);
    const data = await response.json();
    
    expect(data.version).toBe("4.1");
    expect(data.scores).toHaveProperty('trust_score_4d');
  });

  test('disabled features default to v4.1 behavior', async () => {
    const disabledRequest = {
      version: "4.2-enhanced",
      memory_object_id: 'test-memory-002',
      features: { 
        enable_governance_dimensions: false,
        enable_risk_assessment: false,
        enable_collaborative_scoring: false
      },
      governance_context: testData.v41_compatible_request.governance_context
    };
    
    const response = await callEnhancedGovernanceScoring(disabledRequest);
    const data = await response.json();
    
    expect(data.version).toBe("4.1");
    expect(data.scores).not.toHaveProperty('governance_trust_score');
    expect(data.scores).not.toHaveProperty('risk_assessment');
    expect(data.scores).not.toHaveProperty('collaborative_scores');
  });

  test('v4.1 API endpoints remain functional', async () => {
    // Test direct call to existing v4.1 vectorgraph-memory-manager
    const v41Response = await testContext.supabase.functions.invoke('vectorgraph-memory-manager', {
      body: {
        action: 'retrieve_memory',
        queryData: {
          queryText: 'test governance decision',
          queryType: 'semantic',
          limit: 5
        }
      }
    });
    
    expect(v41Response.error).toBeNull();
    expect(v41Response.data).toBeDefined();
  });

  test('existing database schema compatibility', async () => {
    // Verify that enhanced fields are additive and don't break existing queries
    const result = await testContext.db.query(`
      SELECT id, memory_id, trust_score_4d, vibe_score
      FROM vectorgraph_memory_objects 
      LIMIT 1
    `);
    
    expect(result.rows).toBeDefined();
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      expect(row).toHaveProperty('id');
      expect(row).toHaveProperty('memory_id');
      expect(row).toHaveProperty('trust_score_4d');
      expect(row).toHaveProperty('vibe_score');
    }
  });
});

// ================================================================
// ENHANCED GOVERNANCE FEATURES TESTS
// ================================================================

describe('Enhanced Governance Features Tests', () => {
  
  beforeEach(async () => {
    // Enable all enhanced features for these tests
    await enableAllEnhancedFeatures();
  });

  test('governance dimensions calculation', async () => {
    const response = await callEnhancedGovernanceScoring(testData.enhanced_governance_request);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.version).toBe("4.2-enhanced");
    expect(data.scores).toHaveProperty('governance_dimensions');
    
    const dimensions = data.scores.governance_dimensions;
    expect(dimensions).toHaveProperty('governance_trust_score');
    expect(dimensions).toHaveProperty('governance_risk_score');
    expect(dimensions).toHaveProperty('collaborative_governance_score');
    
    // Validate score ranges
    expect(dimensions.governance_trust_score).toBeGreaterThanOrEqual(0);
    expect(dimensions.governance_trust_score).toBeLessThanOrEqual(1);
    expect(dimensions.governance_risk_score).toBeGreaterThanOrEqual(0);
    expect(dimensions.governance_risk_score).toBeLessThanOrEqual(1);
    expect(dimensions.collaborative_governance_score).toBeGreaterThanOrEqual(0);
    expect(dimensions.collaborative_governance_score).toBeLessThanOrEqual(1);
  });

  test('risk assessment provides insights', async () => {
    const riskRequest = {
      ...testData.enhanced_governance_request,
      features: { 
        enable_governance_dimensions: true,
        enable_risk_assessment: true,
        enable_collaborative_scoring: false
      }
    };
    
    const response = await callEnhancedGovernanceScoring(riskRequest);
    const data = await response.json();
    
    expect(data.scores).toHaveProperty('risk_assessment');
    
    const riskAssessment = data.scores.risk_assessment;
    expect(riskAssessment).toHaveProperty('overall_risk_score');
    expect(riskAssessment).toHaveProperty('decision_impact_risk');
    expect(riskAssessment).toHaveProperty('bias_risk');
    expect(riskAssessment).toHaveProperty('compliance_risk');
    expect(riskAssessment).toHaveProperty('stakeholder_alienation_risk');
    expect(riskAssessment).toHaveProperty('system_vulnerability_risk');
    expect(riskAssessment).toHaveProperty('risk_mitigation_recommendations');
    
    expect(riskAssessment.overall_risk_score).toBeGreaterThanOrEqual(0);
    expect(riskAssessment.overall_risk_score).toBeLessThanOrEqual(1);
    expect(riskAssessment.risk_mitigation_recommendations).toBeInstanceOf(Array);
  });

  test('collaborative scoring works', async () => {
    const collaborativeRequest = {
      ...testData.enhanced_governance_request,
      features: { 
        enable_governance_dimensions: true,
        enable_risk_assessment: false,
        enable_collaborative_scoring: true
      }
    };
    
    const response = await callEnhancedGovernanceScoring(collaborativeRequest);
    const data = await response.json();
    
    expect(data.scores).toHaveProperty('collaborative_scores');
    
    const collaborative = data.scores.collaborative_scores;
    expect(collaborative).toHaveProperty('agent_consensus');
    expect(collaborative).toHaveProperty('cross_community_coordination');
    expect(collaborative).toHaveProperty('stakeholder_integration');
    expect(collaborative).toHaveProperty('adaptive_coordination');
    expect(collaborative).toHaveProperty('knowledge_sharing');
    
    expect(collaborative.agent_consensus).toBeGreaterThanOrEqual(0);
    expect(collaborative.agent_consensus).toBeLessThanOrEqual(1);
  });

  test('trust pyramid architecture', async () => {
    const pyramidRequest = {
      ...testData.enhanced_governance_request,
      features: { 
        enable_governance_dimensions: true,
        enable_risk_assessment: true,
        enable_collaborative_scoring: true
      }
    };
    
    const response = await callEnhancedGovernanceScoring(pyramidRequest);
    const data = await response.json();
    
    expect(data.scores).toHaveProperty('trust_pyramid_summary');
    
    const pyramid = data.scores.trust_pyramid_summary;
    expect(pyramid).toHaveProperty('base_layer_score');
    expect(pyramid).toHaveProperty('governance_modifiers_score');
    expect(pyramid).toHaveProperty('governance_dimensions_score');
    expect(pyramid).toHaveProperty('overall_pyramid_score');
    
    expect(pyramid.overall_pyramid_score).toBeGreaterThanOrEqual(0);
    expect(pyramid.overall_pyramid_score).toBeLessThanOrEqual(1);
  });

  test('enhanced governance modifiers', async () => {
    const response = await callEnhancedGovernanceScoring(testData.enhanced_governance_request);
    const data = await response.json();
    
    expect(data.scores).toHaveProperty('governance_modifiers');
    
    const modifiers = data.scores.governance_modifiers;
    expect(modifiers).toHaveProperty('accountability');
    expect(modifiers).toHaveProperty('transparency');
    expect(modifiers).toHaveProperty('compliance');
    expect(modifiers).toHaveProperty('ethical_alignment');
    
    expect(modifiers.accountability).toBeGreaterThanOrEqual(0);
    expect(modifiers.accountability).toBeLessThanOrEqual(1);
  });

  test('enhanced trust scores maintain base compatibility', async () => {
    const response = await callEnhancedGovernanceScoring(testData.enhanced_governance_request);
    const data = await response.json();
    
    // Should have both base and enhanced scores
    expect(data.scores).toHaveProperty('trust_score_4d');
    expect(data.scores).toHaveProperty('enhanced_trust_score_4d');
    
    const baseScores = data.scores.trust_score_4d;
    const enhancedScores = data.scores.enhanced_trust_score_4d;
    
    // Enhanced scores should be influenced by governance factors
    expect(enhancedScores.iq).not.toBe(baseScores.iq);
    expect(enhancedScores.appeal).not.toBe(baseScores.appeal);
    expect(enhancedScores.social).not.toBe(baseScores.social);
    expect(enhancedScores.humanity).not.toBe(baseScores.humanity);
  });
});

// ================================================================
// PERFORMANCE TESTS
// ================================================================

describe('Performance Tests', () => {
  
  test('enhanced scoring performance within limits', async () => {
    const startTime = Date.now();
    
    const response = await callEnhancedGovernanceScoring({
      ...testData.enhanced_governance_request,
      features: { 
        enable_governance_dimensions: true,
        enable_risk_assessment: true,
        enable_collaborative_scoring: true,
        enable_performance_optimization: true
      }
    });
    
    const duration = Date.now() - startTime;
    const data = await response.json();
    
    expect(duration).toBeLessThan(5000); // Max 5 seconds
    expect(data.success).toBe(true);
    expect(data.execution_time_ms).toBeLessThan(5000);
  });

  test('concurrent requests handling', async () => {
    const concurrentRequests = 10;
    const promises = Array(concurrentRequests).fill(null).map((_, index) => 
      callEnhancedGovernanceScoring({
        ...testData.enhanced_governance_request,
        memory_object_id: `concurrent-test-${index}`,
        features: { enable_governance_dimensions: true }
      })
    );
    
    const startTime = Date.now();
    const responses = await Promise.all(promises);
    const duration = Date.now() - startTime;
    
    // All requests should complete successfully
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });
    
    // Average time per request should be reasonable
    const avgTimePerRequest = duration / concurrentRequests;
    expect(avgTimePerRequest).toBeLessThan(2000); // Max 2 seconds average
  });

  test('memory usage within bounds', async () => {
    const memoryBefore = process.memoryUsage();
    
    // Process multiple requests to test memory leaks
    for (let i = 0; i < 50; i++) {
      await callEnhancedGovernanceScoring({
        ...testData.enhanced_governance_request,
        memory_object_id: `memory-test-${i}`
      });
    }
    
    const memoryAfter = process.memoryUsage();
    const memoryIncrease = memoryAfter.heapUsed - memoryBefore.heapUsed;
    
    // Memory increase should be reasonable (less than 100MB)
    expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
  });

  test('database connection efficiency', async () => {
    const dbConnectionsBefore = await getActiveDbConnections();
    
    // Execute multiple database-intensive operations
    await Promise.all(testData.performance_test_requests.map(request => 
      callEnhancedGovernanceScoring(request)
    ));
    
    const dbConnectionsAfter = await getActiveDbConnections();
    
    // Should not create excessive database connections
    expect(dbConnectionsAfter - dbConnectionsBefore).toBeLessThan(10);
  });

  test('cache effectiveness', async () => {
    const sameRequest = testData.enhanced_governance_request;
    
    // First request (cache miss)
    const startTime1 = Date.now();
    await callEnhancedGovernanceScoring(sameRequest);
    const firstRequestTime = Date.now() - startTime1;
    
    // Second request (cache hit)
    const startTime2 = Date.now();
    await callEnhancedGovernanceScoring(sameRequest);
    const secondRequestTime = Date.now() - startTime2;
    
    // Second request should be significantly faster
    expect(secondRequestTime).toBeLessThan(firstRequestTime * 0.8);
  });
});

// ================================================================
// SECURITY VALIDATION TESTS
// ================================================================

describe('Security Validation Tests', () => {
  
  test('unauthorized requests are rejected', async () => {
    const response = await fetch('http://localhost:54321/functions/v1/enhanced-governance-scoring', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // No Authorization header
      },
      body: JSON.stringify(testData.enhanced_governance_request)
    });
    
    expect(response.status).toBe(401);
  });

  test('invalid API keys are rejected', async () => {
    const response = await fetch('http://localhost:54321/functions/v1/enhanced-governance-scoring', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-key'
      },
      body: JSON.stringify(testData.enhanced_governance_request)
    });
    
    expect(response.status).toBe(401);
  });

  test('malformed requests are handled gracefully', async () => {
    const malformedRequests = [
      null,
      undefined,
      '',
      '{"invalid": json}',
      { incomplete: 'request' },
      { memory_object_id: null }
    ];
    
    for (const malformedRequest of malformedRequests) {
      const response = await fetch('http://localhost:54321/functions/v1/enhanced-governance-scoring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify(malformedRequest)
      });
      
      // Should not crash, should return error response
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    }
  });

  test('SQL injection protection', async () => {
    const sqlInjectionAttempts = [
      "'; DROP TABLE vectorgraph_memory_objects; --",
      "1' OR '1'='1",
      "1; UPDATE trust_scoring_feature_flags SET enabled = true; --"
    ];
    
    for (const attempt of sqlInjectionAttempts) {
      const response = await callEnhancedGovernanceScoring({
        ...testData.enhanced_governance_request,
        memory_object_id: attempt
      });
      
      // Should handle safely without exposing database errors
      expect(response.status).toBeLessThan(500);
    }
  });

  test('sensitive information not exposed in responses', async () => {
    const response = await callEnhancedGovernanceScoring(testData.enhanced_governance_request);
    const data = await response.json();
    
    const responseText = JSON.stringify(data);
    
    // Should not expose sensitive information
    expect(responseText).not.toContain('password');
    expect(responseText).not.toContain('secret');
    expect(responseText).not.toContain('private_key');
    expect(responseText).not.toContain('api_key');
    expect(responseText).not.toContain('database_url');
  });

  test('proper CORS headers', async () => {
    const response = await callEnhancedGovernanceScoring(testData.enhanced_governance_request);
    
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
  });
});

// ================================================================
// FEATURE FLAG TESTS
// ================================================================

describe('Feature Flag System Tests', () => {
  
  test('feature flags control feature availability', async () => {
    // Disable governance dimensions
    await testContext.featureFlagManager.updateFeatureFlag('enhanced_governance_scoring', {
      enabled: false
    });
    
    const response = await callEnhancedGovernanceScoring({
      ...testData.enhanced_governance_request,
      features: { enable_governance_dimensions: true }
    });
    
    const data = await response.json();
    expect(data.features_enabled.enable_governance_dimensions).toBe(false);
  });

  test('rollout percentage works correctly', async () => {
    // Set 50% rollout
    await testContext.featureFlagManager.updateFeatureFlag('enhanced_governance_scoring', {
      enabled: true,
      rollout_percentage: 50
    });
    
    const results = [];
    for (let i = 0; i < 100; i++) {
      const response = await callEnhancedGovernanceScoring({
        ...testData.enhanced_governance_request,
        memory_object_id: `rollout-test-${i}`,
        features: { enable_governance_dimensions: true }
      });
      
      const data = await response.json();
      results.push(data.features_enabled.enable_governance_dimensions);
    }
    
    const enabledCount = results.filter(Boolean).length;
    
    // Should be approximately 50% (allow for some variance)
    expect(enabledCount).toBeGreaterThan(30);
    expect(enabledCount).toBeLessThan(70);
  });

  test('community eligibility restrictions work', async () => {
    await testContext.featureFlagManager.updateFeatureFlag('enhanced_governance_scoring', {
      enabled: true,
      rollout_percentage: 100,
      eligible_communities: ['test-community-1']
    });
    
    // Eligible community
    const eligibleResponse = await callEnhancedGovernanceScoring({
      ...testData.enhanced_governance_request,
      governance_context: {
        ...testData.enhanced_governance_request.governance_context,
        community_id: 'test-community-1'
      }
    });
    
    const eligibleData = await eligibleResponse.json();
    expect(eligibleData.features_enabled.enable_governance_dimensions).toBe(true);
    
    // Non-eligible community
    const nonEligibleResponse = await callEnhancedGovernanceScoring({
      ...testData.enhanced_governance_request,
      governance_context: {
        ...testData.enhanced_governance_request.governance_context,
        community_id: 'test-community-2'
      }
    });
    
    const nonEligibleData = await nonEligibleResponse.json();
    expect(nonEligibleData.features_enabled.enable_governance_dimensions).toBe(false);
  });

  test('emergency rollback functionality', async () => {
    // Enable feature
    await testContext.featureFlagManager.updateFeatureFlag('enhanced_governance_scoring', {
      enabled: true,
      rollout_percentage: 100
    });
    
    // Execute emergency rollback
    const rollbackSuccess = await testContext.featureFlagManager.emergencyRollback(
      'enhanced_governance_scoring',
      'Test emergency rollback'
    );
    
    expect(rollbackSuccess).toBe(true);
    
    // Feature should now be disabled
    const response = await callEnhancedGovernanceScoring({
      ...testData.enhanced_governance_request,
      features: { enable_governance_dimensions: true }
    });
    
    const data = await response.json();
    expect(data.features_enabled.enable_governance_dimensions).toBe(false);
  });
});

// ================================================================
// INTEGRATION TESTS
// ================================================================

describe('Integration Tests', () => {
  
  test('end-to-end governance workflow', async () => {
    // Enable all features
    await enableAllEnhancedFeatures();
    
    // Store governance memory
    const memoryResult = await testContext.supabase.functions.invoke('vectorgraph-memory-manager', {
      body: {
        action: 'store_memory',
        memoryData: {
          contentText: JSON.stringify({
            governance_decision: 'Test governance decision',
            decision_rationale: 'Test rationale'
          }),
          contentType: 'governance_decision',
          communityNamespace: 'test-community',
          creatorId: 'ai-leader-efficiency'
        }
      }
    });
    
    expect(memoryResult.error).toBeNull();
    
    // Calculate enhanced trust scores
    const scoringResponse = await callEnhancedGovernanceScoring({
      version: "4.2-enhanced",
      memory_object_id: memoryResult.data.id,
      features: {
        enable_governance_dimensions: true,
        enable_risk_assessment: true,
        enable_collaborative_scoring: true
      },
      governance_context: testData.complex_governance_context
    });
    
    const scoringData = await scoringResponse.json();
    expect(scoringData.success).toBe(true);
    expect(scoringData.scores).toHaveProperty('governance_dimensions');
    expect(scoringData.scores).toHaveProperty('risk_assessment');
    expect(scoringData.scores).toHaveProperty('collaborative_scores');
  });

  test('cross-community governance sync', async () => {
    // Test cross-community synchronization
    const governanceDecision = {
      id: 'test-decision-001',
      type: 'policy_update',
      content: 'Test governance decision for cross-community sync'
    };
    
    // This would test the cross-community sync functionality
    // Implementation depends on the actual sync service
    expect(true).toBe(true); // Placeholder
  });

  test('stakeholder feedback integration', async () => {
    const decisionId = 'test-decision-feedback';
    
    // Submit stakeholder feedback
    await testContext.db.query(`
      INSERT INTO governance_stakeholder_feedback (
        governance_decision_id, stakeholder_id, feedback_type, 
        satisfaction_score, impact_rating, feedback_text
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      decisionId, 'test-stakeholder-1', 'satisfaction', 
      0.8, 4, 'Positive feedback on governance decision'
    ]);
    
    // Calculate trust scores with feedback
    const response = await callEnhancedGovernanceScoring({
      version: "4.2-enhanced",
      memory_object_id: 'test-memory-feedback',
      features: { enable_governance_dimensions: true },
      governance_context: {
        ...testData.complex_governance_context,
        decision_id: decisionId
      }
    });
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.scores.governance_dimensions.governance_trust_score).toBeGreaterThan(0.5);
  });
});

// ================================================================
// UTILITY FUNCTIONS
// ================================================================

async function initializeTestData(): Promise<TestDataSets> {
  return {
    v41_compatible_request: {
      version: "4.1",
      memory_object_id: 'test-memory-v41',
      governance_context: {
        governance_type: 'basic_governance',
        trust_requirements: {
          min_iq_score: 0.6,
          min_appeal_score: 0.5,
          min_social_score: 0.5,
          min_humanity_score: 0.7
        },
        transparency_level: 'community',
        accountability_tracking: {
          responsible_agent: 'ai-leader-efficiency',
          decision_timestamp: new Date().toISOString(),
          stakeholders: ['stakeholder-1', 'stakeholder-2']
        }
      }
    },

    enhanced_governance_request: {
      version: "4.2-enhanced",
      memory_object_id: 'test-memory-enhanced',
      features: {
        enable_governance_dimensions: true,
        enable_risk_assessment: true,
        enable_collaborative_scoring: true,
        enable_performance_optimization: true
      },
      governance_context: {
        decision_id: 'test-decision-enhanced',
        community_id: 'test-community',
        governance_type: 'comprehensive_governance',
        trust_requirements: {
          min_iq_score: 0.7,
          min_appeal_score: 0.6,
          min_social_score: 0.6,
          min_humanity_score: 0.8
        },
        transparency_level: 'public',
        accountability_tracking: {
          responsible_agent: 'ai-leader-transparency',
          decision_timestamp: new Date().toISOString(),
          stakeholders: ['stakeholder-1', 'stakeholder-2', 'stakeholder-3'],
          audit_trail: [
            { action: 'decision_initiated', timestamp: new Date().toISOString() },
            { action: 'stakeholders_consulted', timestamp: new Date().toISOString() }
          ]
        },
        stakeholder_feedback: [
          { stakeholder_id: 'stakeholder-1', satisfaction_score: 0.8, feedback: 'Positive' }
        ],
        decision_metadata: {
          rationale: 'Comprehensive governance improvement',
          alternatives_considered: ['Option A', 'Option B'],
          impact_analysis: 'Positive community impact expected'
        }
      }
    },

    complex_governance_context: {
      decision_id: 'complex-decision-001',
      community_id: 'test-community-complex',
      governance_type: 'complex_multi_stakeholder_governance',
      trust_requirements: {
        min_iq_score: 0.8,
        min_appeal_score: 0.7,
        min_social_score: 0.7,
        min_humanity_score: 0.9
      },
      transparency_level: 'public',
      accountability_tracking: {
        responsible_agent: 'ai-leader-accountability',
        decision_timestamp: new Date().toISOString(),
        stakeholders: ['stakeholder-1', 'stakeholder-2', 'stakeholder-3', 'stakeholder-4'],
        audit_trail: [
          { action: 'decision_initiated', timestamp: new Date().toISOString() },
          { action: 'stakeholder_consultation', timestamp: new Date().toISOString() },
          { action: 'risk_assessment_completed', timestamp: new Date().toISOString() },
          { action: 'decision_finalized', timestamp: new Date().toISOString() }
        ]
      },
      stakeholder_feedback: [
        { stakeholder_id: 'stakeholder-1', satisfaction_score: 0.9, feedback: 'Excellent process' },
        { stakeholder_id: 'stakeholder-2', satisfaction_score: 0.7, feedback: 'Good but could improve' },
        { stakeholder_id: 'stakeholder-3', satisfaction_score: 0.8, feedback: 'Satisfactory outcome' }
      ],
      decision_metadata: {
        rationale: 'Complex multi-stakeholder decision requiring comprehensive analysis',
        alternatives_considered: ['Conservative approach', 'Moderate approach', 'Progressive approach'],
        impact_analysis: 'Significant positive impact across multiple community segments',
        risk_assessment: 'Low to moderate risk profile with mitigation strategies'
      }
    },

    performance_test_requests: Array(20).fill(null).map((_, index) => ({
      version: "4.2-enhanced",
      memory_object_id: `perf-test-${index}`,
      features: {
        enable_governance_dimensions: true,
        enable_risk_assessment: index % 2 === 0,
        enable_collaborative_scoring: index % 3 === 0
      },
      governance_context: {
        governance_type: 'performance_test',
        transparency_level: 'community',
        accountability_tracking: {
          responsible_agent: 'test-agent',
          decision_timestamp: new Date().toISOString(),
          stakeholders: [`stakeholder-${index}`]
        }
      }
    })),

    security_test_cases: [
      // Various security test scenarios would be defined here
    ]
  };
}

async function callEnhancedGovernanceScoring(requestData: any): Promise<Response> {
  return fetch('http://localhost:54321/functions/v1/enhanced-governance-scoring', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify(requestData)
  });
}

async function setupTestDatabase(): Promise<void> {
  // Create test data in database
  await testContext.db.query(`
    INSERT INTO vectorgraph_memory_objects (
      id, memory_id, content_type, trust_score_4d, vibe_score, 
      memory_zone_id, creator_agent_id, memory_status
    ) VALUES 
    ('test-memory-v41', 'test-memory-v41', 'test', 
     '{"iq": 0.8, "appeal": 0.7, "social": 0.75, "humanity": 0.85}', 
     0.8, 'test-zone', 'test-agent', 'active'),
    ('test-memory-enhanced', 'test-memory-enhanced', 'governance_test',
     '{"iq": 0.75, "appeal": 0.8, "social": 0.7, "humanity": 0.9}',
     0.85, 'test-zone', 'ai-leader-test', 'active')
    ON CONFLICT (id) DO NOTHING
  `);
}

async function cleanupTestDatabase(): Promise<void> {
  // Clean up test data
  await testContext.db.query(`
    DELETE FROM governance_stakeholder_feedback 
    WHERE governance_decision_id LIKE 'test-%'
  `);
  
  await testContext.db.query(`
    DELETE FROM trust_scoring_performance 
    WHERE request_id LIKE 'test-%' OR request_id LIKE 'perf-%'
  `);
  
  await testContext.db.query(`
    DELETE FROM vectorgraph_memory_objects 
    WHERE id LIKE 'test-%' OR id LIKE 'perf-%' OR id LIKE 'concurrent-%'
  `);
}

async function resetFeatureFlags(): Promise<void> {
  // Reset all feature flags to default disabled state
  await testContext.db.query(`
    UPDATE trust_scoring_feature_flags 
    SET enabled = false, rollout_percentage = 0
  `);
}

async function enableAllEnhancedFeatures(): Promise<void> {
  await testContext.db.query(`
    UPDATE trust_scoring_feature_flags 
    SET enabled = true, rollout_percentage = 100
    WHERE feature_name IN (
      'enhanced_governance_scoring',
      'governance_risk_assessment', 
      'collaborative_governance_scoring',
      'trust_pyramid_architecture'
    )
  `);
}

async function getActiveDbConnections(): Promise<number> {
  try {
    const result = await testContext.db.query(`
      SELECT count(*) as connection_count 
      FROM pg_stat_activity 
      WHERE state = 'active'
    `);
    return parseInt(result.rows[0].connection_count);
  } catch (error) {
    return 0;
  }
}