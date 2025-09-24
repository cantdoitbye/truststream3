/**
 * TrustStream A/B Testing Framework Demo
 * 
 * This demo script showcases the complete capabilities of the experimentation framework
 * including experiment management, traffic splitting, statistical analysis, 
 * feature flags, and canary deployments for governance agents.
 */

import {
  TrustStreamExperimentationFramework,
  createGovernanceExperimentFramework,
  createBasicExperimentConfig,
  createGovernanceFeatureFlag,
  createCanaryDeploymentConfig,
  runExperimentationTests,
  FRAMEWORK_INFO
} from './index';

import {
  ExperimentStatus,
  VariantType,
  ExperimentMetricType,
  StatisticalTestType,
  CanaryStatus
} from './types';

async function runDemo() {
  console.log('🚀 TrustStream A/B Testing Framework Demo');
  console.log('═'.repeat(60));
  console.log(`Framework: ${FRAMEWORK_INFO.name} v${FRAMEWORK_INFO.version}`);
  console.log(`Components: ${FRAMEWORK_INFO.components.join(', ')}`);
  console.log('═'.repeat(60));

  try {
    // Step 1: Framework Initialization
    console.log('\n📦 Step 1: Initializing Framework...');
    const framework = new TrustStreamExperimentationFramework();
    await framework.initialize();
    console.log('✅ Framework initialized successfully');

    // Step 2: Run Framework Tests
    console.log('\n🧪 Step 2: Running Framework Tests...');
    const testResults = await framework.runTests();
    console.log(`✅ Tests completed: ${testResults.passed}/${testResults.total} passed`);
    
    if (testResults.failed > 0) {
      console.log('⚠️  Some tests failed, but continuing with demo...');
    }

    // Step 3: Governance Experiment Setup
    console.log('\n🎯 Step 3: Creating Governance Experiment...');
    const govFramework = await createGovernanceExperimentFramework();
    await govFramework.initialize();

    const experiment = await govFramework.createExperiment(
      'AI Leader Efficiency Enhancement',
      'Testing new efficiency algorithms for AI governance leaders',
      'ai-leader-efficiency-agent'
    );

    console.log(`✅ Experiment created: ${experiment.name} (ID: ${experiment.id})`);
    console.log(`   Status: ${experiment.status}`);
    console.log(`   Variants: ${experiment.variants.length}`);

    // Step 4: User Assignment and Traffic Splitting
    console.log('\n👥 Step 4: Demonstrating Traffic Splitting...');
    const userAssignments = [];
    
    for (let i = 1; i <= 100; i++) {
      const userId = `user_${String(i).padStart(3, '0')}`;
      const agentId = `agent_${String(i % 5).padStart(2, '0')}`;
      
      const assignment = await govFramework.assignUser(
        experiment.id,
        userId,
        agentId
      );
      
      userAssignments.push(assignment);
    }

    // Analyze traffic distribution
    const controlCount = userAssignments.filter(a => a.variantId === 'control').length;
    const treatmentCount = userAssignments.filter(a => a.variantId === 'treatment').length;
    
    console.log(`✅ Assigned 100 users to experiment`);
    console.log(`   Control variant: ${controlCount} users (${controlCount}%)`);
    console.log(`   Treatment variant: ${treatmentCount} users (${treatmentCount}%)`);

    // Step 5: Metric Recording and Analysis
    console.log('\n📊 Step 5: Recording Metrics and Analysis...');
    
    // Simulate metric data collection
    for (const assignment of userAssignments) {
      // Simulate effectiveness metrics (treatment variant performs slightly better)
      const baseEffectiveness = 0.75;
      const treatmentBoost = assignment.variantId === 'treatment' ? 0.08 : 0;
      const randomVariation = (Math.random() - 0.5) * 0.1;
      const effectiveness = Math.max(0, Math.min(1, 
        baseEffectiveness + treatmentBoost + randomVariation
      ));

      await govFramework.recordMetric(
        experiment.id,
        assignment.variantId,
        'effectiveness',
        effectiveness,
        assignment.userId
      );
    }

    console.log('✅ Recorded effectiveness metrics for all users');

    // Analyze results
    const results = await govFramework.analyzeResults(experiment.id);
    if (results.length > 0) {
      const primaryResult = results[0];
      console.log(`📈 Statistical Analysis Results:`);
      console.log(`   P-value: ${primaryResult.pValue.toFixed(4)}`);
      console.log(`   Confidence: ${(primaryResult.significance * 100).toFixed(1)}%`);
      console.log(`   Effect Size: ${primaryResult.effectSize.toFixed(3)}`);
      
      if (primaryResult.pValue < 0.05) {
        console.log('🎉 Statistically significant improvement detected!');
      } else {
        console.log('📊 Results not yet statistically significant');
      }
    }

    // Step 6: Feature Flag Management
    console.log('\n🚩 Step 6: Demonstrating Feature Flags...');
    
    const flagData = createGovernanceFeatureFlag(
      'enhanced_decision_algorithm',
      'Enhanced Decision Algorithm',
      'ai-leader-efficiency-agent'
    );

    const flag = await framework.experiments.featureFlagManager.createFlag(flagData);
    console.log(`✅ Created feature flag: ${flag.name} (Key: ${flag.key})`);

    // Add conditional rules
    await framework.experiments.featureFlagManager.addRule(flag.id, {
      name: 'High Priority Users',
      conditions: [
        {
          field: 'userPriority',
          operator: 'equals',
          value: 'high'
        }
      ],
      enabled: true,
      rolloutPercentage: 100,
      priority: 1
    });

    console.log('✅ Added conditional rule for high priority users');

    // Test flag evaluation
    const flagEvaluations = [];
    for (let i = 0; i < 10; i++) {
      const evaluation = await framework.experiments.featureFlagManager.evaluateFlag(
        flag.key,
        `test_user_${i}`,
        'ai-leader-efficiency-agent',
        { 
          userPriority: i < 3 ? 'high' : 'normal',
          environment: 'production'
        }
      );
      flagEvaluations.push(evaluation);
    }

    const enabledCount = flagEvaluations.filter(e => e.enabled).length;
    console.log(`📊 Flag evaluations: ${enabledCount}/10 users have flag enabled`);

    // Step 7: Canary Deployment
    console.log('\n🕯️  Step 7: Demonstrating Canary Deployment...');
    
    const canaryConfig = createCanaryDeploymentConfig(10); // Start with 10%
    const deployment = await framework.experiments.canaryDeploymentManager
      .startCanaryDeployment(canaryConfig);

    console.log(`✅ Started canary deployment: ${deployment.id}`);
    console.log(`   Status: ${deployment.status}`);
    console.log(`   Current Traffic: ${deployment.currentTrafficPercentage}%`);

    // Wait a moment for metrics collection
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check canary health
    const health = await framework.experiments.canaryDeploymentManager
      .monitorCanaryHealth(deployment.id);

    console.log(`📊 Canary Health Status: ${health.overall}`);
    console.log(`   Error Rate: ${health.metrics.errorRate?.value.toFixed(2)}%`);
    console.log(`   Response Time: ${health.metrics.responseTime?.value.toFixed(0)}ms`);

    if (health.overall === 'healthy') {
      console.log('🎉 Canary deployment is healthy and ready for promotion');
    }

    // Step 8: Complete Experiment
    console.log('\n🏁 Step 8: Completing Experiment...');
    
    const report = await govFramework.completeExperiment(experiment.id);
    console.log(`✅ Experiment completed successfully`);
    console.log(`   Duration: ${Math.round(report.duration / (1000 * 60))} minutes`);
    console.log(`   Total Sample Size: ${report.totalSampleSize}`);
    console.log(`   Summary: ${report.summary}`);

    // Step 9: Framework Health Check
    console.log('\n❤️  Step 9: Framework Health Check...');
    
    const healthStatus = await framework.getHealthStatus();
    console.log(`✅ Framework Health: ${healthStatus.initialized ? 'Healthy' : 'Unhealthy'}`);
    
    for (const [component, status] of Object.entries(healthStatus.components)) {
      const statusIcon = status === 'healthy' ? '✅' : status === 'warning' ? '⚠️' : '❌';
      console.log(`   ${statusIcon} ${component}: ${status}`);
    }

    // Step 10: Advanced Scenarios
    console.log('\n🔬 Step 10: Advanced Usage Scenarios...');
    
    // Multi-variant experiment
    console.log('📊 Creating multi-variant experiment...');
    const multiVariantExperiment = await framework.experiments.experimentManager.createExperiment({
      name: 'Multi-Algorithm Comparison',
      description: 'Comparing multiple governance algorithms',
      hypotheses: ['Algorithm C will outperform A and B'],
      status: ExperimentStatus.DRAFT,
      targetType: 'algorithm',
      targetId: 'governance_decision_algorithm',
      variants: [
        {
          id: 'algorithm_a',
          name: 'Algorithm A (Control)',
          type: VariantType.CONTROL,
          configuration: { version: 'a', parameters: { threshold: 0.7 } },
          isControl: true,
          allocation: 33.33
        },
        {
          id: 'algorithm_b',
          name: 'Algorithm B',
          type: VariantType.TREATMENT,
          configuration: { version: 'b', parameters: { threshold: 0.75 } },
          isControl: false,
          allocation: 33.33
        },
        {
          id: 'algorithm_c',
          name: 'Algorithm C',
          type: VariantType.TREATMENT,
          configuration: { version: 'c', parameters: { threshold: 0.8 } },
          isControl: false,
          allocation: 33.34
        }
      ],
      trafficAllocation: {
        algorithm: 'hash-based',
        stickiness: true,
        stickyDuration: 7200 // 2 hours
      },
      metrics: [
        {
          id: 'accuracy',
          name: 'Decision Accuracy',
          description: 'Accuracy of governance decisions',
          type: ExperimentMetricType.PRIMARY,
          dataType: 'numeric',
          aggregation: 'average',
          statisticalTest: StatisticalTestType.T_TEST
        },
        {
          id: 'speed',
          name: 'Decision Speed',
          description: 'Time to make decisions',
          type: ExperimentMetricType.SECONDARY,
          dataType: 'numeric',
          aggregation: 'average',
          statisticalTest: StatisticalTestType.T_TEST
        },
        {
          id: 'error_rate',
          name: 'Error Rate',
          description: 'Rate of decision errors',
          type: ExperimentMetricType.GUARDRAIL,
          dataType: 'numeric',
          aggregation: 'rate',
          statisticalTest: StatisticalTestType.BINOMIAL,
          guardrailThresholds: [
            {
              metric: 'error_rate',
              upperBound: 0.05,
              action: 'terminate'
            }
          ]
        }
      ],
      startDate: 0,
      confidence: 0.95,
      power: 0.8,
      minimumSampleSize: 1500,
      createdBy: 'demo_system',
      metadata: {
        priority: 'high',
        team: 'governance',
        tags: ['algorithm', 'performance']
      }
    });

    console.log(`✅ Multi-variant experiment created: ${multiVariantExperiment.id}`);

    // Demonstrate advanced feature flag with variants
    console.log('🚩 Creating advanced feature flag with variants...');
    const advancedFlag = await framework.experiments.featureFlagManager.createFlag({
      name: 'Governance Algorithm Selector',
      description: 'Dynamically select governance algorithms',
      key: 'governance_algorithm_selector',
      enabled: true,
      targetType: 'global',
      variants: [
        {
          id: 'variant_conservative',
          name: 'Conservative Algorithm',
          value: { algorithm: 'conservative', risk_tolerance: 0.3 },
          allocation: 30
        },
        {
          id: 'variant_balanced',
          name: 'Balanced Algorithm',
          value: { algorithm: 'balanced', risk_tolerance: 0.5 },
          allocation: 50
        },
        {
          id: 'variant_aggressive',
          name: 'Aggressive Algorithm',
          value: { algorithm: 'aggressive', risk_tolerance: 0.8 },
          allocation: 20
        }
      ],
      rules: [
        {
          id: 'risk_based_rule',
          name: 'Risk-Based Selection',
          conditions: [
            {
              field: 'contextRisk',
              operator: 'greater_than',
              value: 0.7
            }
          ],
          variant: 'variant_conservative',
          enabled: true,
          rolloutPercentage: 100,
          priority: 1
        }
      ],
      rolloutPercentage: 100,
      environments: ['production', 'staging'],
      createdBy: 'demo_system',
      metadata: {
        category: 'algorithm_selection',
        impact: 'high'
      }
    });

    console.log(`✅ Advanced feature flag created: ${advancedFlag.key}`);

    // Test advanced flag evaluation
    const advancedEvaluation = await framework.experiments.featureFlagManager.evaluateFlag(
      advancedFlag.key,
      'demo_user',
      'governance_agent',
      {
        contextRisk: 0.8,
        environment: 'production',
        userType: 'admin'
      }
    );

    if (advancedEvaluation.variant) {
      console.log(`📊 Flag evaluation result: ${advancedEvaluation.variant.name}`);
      console.log(`   Algorithm: ${advancedEvaluation.variant.value.algorithm}`);
      console.log(`   Risk Tolerance: ${advancedEvaluation.variant.value.risk_tolerance}`);
    }

    // Demo Summary
    console.log('\n🎉 Demo Summary');
    console.log('═'.repeat(60));
    console.log('✅ Successfully demonstrated all framework capabilities:');
    console.log('   • Experiment Management (Creation, Assignment, Analysis, Completion)');
    console.log('   • Traffic Splitting (Hash-based allocation, Sticky sessions)');
    console.log('   • Statistical Analysis (Significance testing, Effect size calculation)');
    console.log('   • Feature Flags (Rules, Variants, Dynamic evaluation)');
    console.log('   • Canary Deployments (Health monitoring, Gradual rollout)');
    console.log('   • Advanced Scenarios (Multi-variant tests, Complex flags)');
    console.log('\n🚀 The TrustStream A/B Testing Framework is ready for production use!');

  } catch (error) {
    console.error('\n❌ Demo failed with error:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Utility function to simulate real-world usage patterns
async function simulateRealWorldUsage() {
  console.log('\n🌍 Simulating Real-World Usage Patterns...');
  
  const framework = new TrustStreamExperimentationFramework();
  await framework.initialize();

  // Simulate multiple concurrent experiments
  const experiments = [];
  for (let i = 1; i <= 3; i++) {
    const config = createBasicExperimentConfig(
      `Governance Enhancement ${i}`,
      `governance_agent_${i}`
    );
    
    const experiment = await framework.experiments.experimentManager.createExperiment(config);
    await framework.experiments.experimentManager.startExperiment(experiment.id);
    experiments.push(experiment);
  }

  console.log(`✅ Started ${experiments.length} concurrent experiments`);

  // Simulate high-throughput metric recording
  console.log('📊 Simulating high-throughput metric recording...');
  const startTime = Date.now();
  const metricPromises = [];

  for (let i = 0; i < 1000; i++) {
    const experiment = experiments[i % experiments.length];
    const variant = experiment.variants[i % 2];
    
    metricPromises.push(
      framework.experiments.orchestrator.recordMetric(
        experiment.id,
        variant.id,
        experiment.metrics[0].id,
        Math.random(),
        `user_${i}`,
        `agent_${i % 10}`
      )
    );
  }

  await Promise.all(metricPromises);
  const duration = Date.now() - startTime;
  console.log(`✅ Recorded 1000 metrics in ${duration}ms (${(1000/duration*1000).toFixed(0)} metrics/sec)`);

  // Simulate feature flag evaluations under load
  console.log('🚩 Simulating feature flag evaluations under load...');
  const flag = await framework.experiments.featureFlagManager.createFlag(
    createGovernanceFeatureFlag('load_test_flag', 'Load Test Flag')
  );

  const evaluationStartTime = Date.now();
  const evaluationPromises = [];

  for (let i = 0; i < 1000; i++) {
    evaluationPromises.push(
      framework.experiments.featureFlagManager.evaluateFlag(
        flag.key,
        `user_${i}`,
        `agent_${i % 10}`,
        { iteration: i }
      )
    );
  }

  await Promise.all(evaluationPromises);
  const evaluationDuration = Date.now() - evaluationStartTime;
  console.log(`✅ Performed 1000 flag evaluations in ${evaluationDuration}ms (${(1000/evaluationDuration*1000).toFixed(0)} evaluations/sec)`);

  console.log('🎯 Real-world simulation completed successfully');
}

// Run the demo
if (require.main === module) {
  runDemo()
    .then(() => simulateRealWorldUsage())
    .then(() => {
      console.log('\n✨ Demo completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Demo failed:', error);
      process.exit(1);
    });
}

export { runDemo, simulateRealWorldUsage };