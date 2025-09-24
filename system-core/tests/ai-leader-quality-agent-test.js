/**
 * AI Leader Quality Agent - Comprehensive Test Suite
 * Tests all quality agent capabilities and integration points
 */

const QUALITY_AGENT_URL = 'https://etretluugvclmydzlfte.supabase.co/functions/v1/ai-leader-quality-agent';

// Test helper function
async function testQualityAgent(action, data = {}) {
  const requestData = { action, ...data };
  
  try {
    const response = await fetch(QUALITY_AGENT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    const result = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Test suite
async function runQualityAgentTests() {
  console.log('🧪 Starting AI Leader Quality Agent Test Suite...');
  
  const testResults = [];
  
  // Test 1: Quality Assessment
  console.log('\n📊 Testing quality assessment...');
  const qualityAssessmentTest = await testQualityAgent('assess_output_quality', {
    content: {
      text: 'This is a comprehensive response that provides detailed information about the requested topic with supporting examples and clear explanations.',
      type: 'text',
      metadata: {
        agent_id: 'test-rag-agent',
        request_id: 'test-quality-001',
        generation_time: 1500
      }
    },
    quality_context: {
      sourceAgent: 'test-rag-agent',
      requestType: 'information_query',
      userContext: {
        userId: 'test-user-123',
        userType: 'authenticated',
        preferences: {
          language: 'en',
          detail_level: 'detailed',
          format: 'structured'
        }
      },
      requirements: {
        accuracy: 0.9,
        relevance: 0.85,
        completeness: 0.8,
        clarity: 0.85,
        timeliness: 0.9
      },
      constraints: {
        maxResponseTime: 2000,
        maxLength: 1000,
        format: 'text',
        language: 'en'
      },
      domain: 'technology',
      priority: 'high'
    },
    target_agent_type: 'test-rag-agent'
  });
  
  testResults.push({
    test: 'Quality Assessment',
    success: qualityAssessmentTest.success && qualityAssessmentTest.data.data?.success,
    details: qualityAssessmentTest.data.data || qualityAssessmentTest.error
  });
  
  if (qualityAssessmentTest.success) {
    console.log('✅ Quality assessment successful');
    console.log(`   Overall Score: ${qualityAssessmentTest.data.data.overall_score}`);
    console.log(`   Issues Found: ${qualityAssessmentTest.data.data.issues.length}`);
    console.log(`   Requires Attention: ${qualityAssessmentTest.data.data.requires_attention}`);
  } else {
    console.log('❌ Quality assessment failed:', qualityAssessmentTest.error);
  }
  
  // Test 2: Compliance Standards Validation
  console.log('\n📋 Testing compliance standards validation...');
  const complianceTest = await testQualityAgent('validate_compliance_standards', {
    target_agent_type: 'test-rag-agent',
    compliance_standards: ['iso_9001', 'gdpr', 'accessibility', 'security']
  });
  
  testResults.push({
    test: 'Compliance Validation',
    success: complianceTest.success && complianceTest.data.data?.success,
    details: complianceTest.data.data || complianceTest.error
  });
  
  if (complianceTest.success) {
    console.log('✅ Compliance validation successful');
    console.log(`   Compliance Score: ${complianceTest.data.data.compliance_score}`);
    console.log(`   Status: ${complianceTest.data.data.compliance_report.status}`);
    console.log(`   Violations: ${complianceTest.data.data.violations.length}`);
  } else {
    console.log('❌ Compliance validation failed:', complianceTest.error);
  }
  
  // Test 3: Quality Trends Monitoring
  console.log('\n📈 Testing quality trends monitoring...');
  const trendsTest = await testQualityAgent('monitor_quality_trends', {
    target_agent_type: 'test-rag-agent'
  });
  
  testResults.push({
    test: 'Quality Trends Monitoring',
    success: trendsTest.success && trendsTest.data.data?.success,
    details: trendsTest.data.data || trendsTest.error
  });
  
  if (trendsTest.success) {
    console.log('✅ Quality trends monitoring successful');
    console.log(`   Trend Direction: ${trendsTest.data.data.trend_analysis.direction}`);
    console.log(`   Confidence: ${trendsTest.data.data.trend_analysis.confidence}`);
    console.log(`   Scores Analyzed: ${trendsTest.data.data.scores_analyzed}`);
  } else {
    console.log('❌ Quality trends monitoring failed:', trendsTest.error);
  }
  
  // Test 4: Quality Deviations Identification
  console.log('\n🔍 Testing quality deviations identification...');
  const deviationsTest = await testQualityAgent('identify_quality_deviations', {
    target_agent_type: 'test-rag-agent'
  });
  
  testResults.push({
    test: 'Quality Deviations Identification',
    success: deviationsTest.success && deviationsTest.data.data?.success,
    details: deviationsTest.data.data || deviationsTest.error
  });
  
  if (deviationsTest.success) {
    console.log('✅ Quality deviations identification successful');
    console.log(`   Deviations Found: ${deviationsTest.data.data.deviations_found}`);
  } else {
    console.log('❌ Quality deviations identification failed:', deviationsTest.error);
  }
  
  // Test 5: Quality Improvements Recommendations
  console.log('\n💡 Testing quality improvements recommendations...');
  const improvementsTest = await testQualityAgent('recommend_quality_improvements', {
    target_agent_type: 'test-rag-agent',
    context: {
      current_issues: ['accuracy_concerns', 'response_time'],
      priority_areas: ['user_satisfaction', 'compliance']
    }
  });
  
  testResults.push({
    test: 'Quality Improvements Recommendations',
    success: improvementsTest.success && improvementsTest.data.data?.success,
    details: improvementsTest.data.data || improvementsTest.error
  });
  
  if (improvementsTest.success) {
    console.log('✅ Quality improvements recommendations successful');
  } else {
    console.log('❌ Quality improvements recommendations failed:', improvementsTest.error);
  }
  
  // Test 6: Quality Standards Enforcement
  console.log('\n⚖️ Testing quality standards enforcement...');
  const enforcementTest = await testQualityAgent('enforce_quality_standards', {
    target_agent_type: 'test-rag-agent',
    threshold_values: {
      accuracy: 0.8,
      relevance: 0.75,
      completeness: 0.7,
      clarity: 0.75
    }
  });
  
  testResults.push({
    test: 'Quality Standards Enforcement',
    success: enforcementTest.success && enforcementTest.data.data?.success,
    details: enforcementTest.data.data || enforcementTest.error
  });
  
  if (enforcementTest.success) {
    console.log('✅ Quality standards enforcement successful');
    console.log(`   Enforcement ID: ${enforcementTest.data.data.enforcement_id}`);
    console.log(`   Violations Found: ${enforcementTest.data.data.violations_found}`);
    console.log(`   Actions Taken: ${enforcementTest.data.data.actions_taken}`);
  } else {
    console.log('❌ Quality standards enforcement failed:', enforcementTest.error);
  }
  
  // Test 7: Industry Standards Benchmarking
  console.log('\n📊 Testing industry standards benchmarking...');
  const benchmarkingTest = await testQualityAgent('benchmark_against_industry_standards', {
    target_agent_type: 'test-rag-agent'
  });
  
  testResults.push({
    test: 'Industry Standards Benchmarking',
    success: benchmarkingTest.success && benchmarkingTest.data.data?.success,
    details: benchmarkingTest.data.data || benchmarkingTest.error
  });
  
  if (benchmarkingTest.success) {
    console.log('✅ Industry standards benchmarking successful');
    console.log(`   Industry Position: ${benchmarkingTest.data.data.industry_position}`);
    console.log(`   Benchmark ID: ${benchmarkingTest.data.data.benchmark_id}`);
  } else {
    console.log('❌ Industry standards benchmarking failed:', benchmarkingTest.error);
  }
  
  // Test 8: Quality Report Generation
  console.log('\n📄 Testing quality report generation...');
  const reportTest = await testQualityAgent('generate_quality_report');
  
  testResults.push({
    test: 'Quality Report Generation',
    success: reportTest.success && reportTest.data.data?.success,
    details: reportTest.data.data || reportTest.error
  });
  
  if (reportTest.success) {
    console.log('✅ Quality report generation successful');
    console.log(`   Report ID: ${reportTest.data.data.report.report_id}`);
    console.log(`   Executive Summary: ${reportTest.data.data.summary}`);
  } else {
    console.log('❌ Quality report generation failed:', reportTest.error);
  }
  
  // Test 9: Quality Thresholds Setting
  console.log('\n⚙️ Testing quality thresholds setting...');
  const thresholdsTest = await testQualityAgent('set_quality_thresholds', {
    target_agent_type: 'test-rag-agent',
    threshold_values: {
      accuracy: 0.85,
      relevance: 0.8,
      completeness: 0.75,
      clarity: 0.8,
      consistency: 0.8,
      timeliness: 0.9
    }
  });
  
  testResults.push({
    test: 'Quality Thresholds Setting',
    success: thresholdsTest.success && thresholdsTest.data.data?.success,
    details: thresholdsTest.data.data || thresholdsTest.error
  });
  
  if (thresholdsTest.success) {
    console.log('✅ Quality thresholds setting successful');
    console.log(`   Agent Type: ${thresholdsTest.data.data.agent_type}`);
    console.log(`   Enforcement Enabled: ${thresholdsTest.data.data.enforcement_enabled}`);
  } else {
    console.log('❌ Quality thresholds setting failed:', thresholdsTest.error);
  }
  
  // Test 10: Error Handling
  console.log('\n❌ Testing error handling...');
  const errorTest = await testQualityAgent('invalid_action');
  
  testResults.push({
    test: 'Error Handling',
    success: !errorTest.success || errorTest.data.error, // Should fail gracefully
    details: errorTest.data || errorTest.error
  });
  
  if (!errorTest.success || errorTest.data.error) {
    console.log('✅ Error handling working correctly');
  } else {
    console.log('❌ Error handling not working properly');
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('🧪 AI Leader Quality Agent Test Results Summary');
  console.log('='.repeat(60));
  
  const passedTests = testResults.filter(result => result.success).length;
  const totalTests = testResults.length;
  
  testResults.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.test}`);
  });
  
  console.log('\n' + '-'.repeat(60));
  console.log(`Tests Passed: ${passedTests}/${totalTests} (${((passedTests/totalTests) * 100).toFixed(1)}%)`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! AI Leader Quality Agent is fully functional.');
  } else {
    console.log(`⚠️  ${totalTests - passedTests} test(s) failed. Please review the implementation.`);
  }
  
  return {
    total: totalTests,
    passed: passedTests,
    failed: totalTests - passedTests,
    results: testResults
  };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runQualityAgentTests, testQualityAgent };
}

// Auto-run if this file is executed directly
if (typeof window === 'undefined' && require.main === module) {
  runQualityAgentTests().catch(console.error);
}
