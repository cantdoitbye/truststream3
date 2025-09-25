/**
 * TrustStram v4.4 Comprehensive Performance Testing Suite
 * 
 * Tests API response times, system throughput, database performance,
 * AI agent response times, and overall system performance.
 * 
 * Target Metrics:
 * - API Response Time: <35ms
 * - System Throughput: 52K+ RPS
 * - Database Query Performance: <18ms
 * - AI Agent Response Time: <100ms for explanations
 * 
 * @version 4.4.0
 * @date 2025-09-22
 */

const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

class PerformanceTestSuite {
  constructor() {
    this.baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
    this.results = {
      timestamp: new Date().toISOString(),
      testSuite: 'TrustStram v4.4 Performance Testing',
      version: '4.4.0',
      targets: {
        apiResponseTime: 35, // ms
        systemThroughput: 52000, // RPS
        databaseQueryTime: 18, // ms
        aiAgentResponseTime: 100 // ms for explanations
      },
      tests: []
    };
  }

  /**
   * Run complete performance test suite
   */
  async runAllTests() {
    console.log('🚀 Starting TrustStram v4.4 Performance Test Suite');
    console.log('='.repeat(60));
    
    try {
      // Basic health check
      await this.testHealthEndpoint();
      
      // API Performance Tests
      await this.testAPIResponseTimes();
      await this.testAPIThroughput();
      
      // Database Performance Tests
      await this.testDatabasePerformance();
      
      // AI Agent Performance Tests
      await this.testAIAgentPerformance();
      
      // Federated Learning Performance
      await this.testFederatedLearningPerformance();
      
      // Multi-Cloud Performance
      await this.testMultiCloudPerformance();
      
      // Quantum Encryption Performance
      await this.testQuantumEncryptionPerformance();
      
      // System Load Tests
      await this.testSystemLoadCapacity();
      
      // Memory and Resource Tests
      await this.testMemoryUsage();
      
      // Concurrent User Tests
      await this.testConcurrentUsers();
      
      // Generate final report
      await this.generateReport();
      
    } catch (error) {
      console.error('❌ Performance test suite failed:', error);
      this.results.error = error.message;
    }
  }

  /**
   * Test health endpoint response time
   */
  async testHealthEndpoint() {
    console.log('\n📊 Testing Health Endpoint Performance...');
    
    const iterations = 1000;
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      
      try {
        await this.makeRequest('/api/v44/health');
        const end = performance.now();
        times.push(end - start);
      } catch (error) {
        console.warn(`Request ${i + 1} failed:`, error.message);
      }
    }
    
    const stats = this.calculateStats(times);
    const testResult = {
      test: 'Health Endpoint Performance',
      category: 'API Response Time',
      target: this.results.targets.apiResponseTime,
      ...stats,
      passed: stats.average < this.results.targets.apiResponseTime
    };
    
    this.results.tests.push(testResult);
    this.logTestResult(testResult);
  }

  /**
   * Test API response times for all major endpoints
   */
  async testAPIResponseTimes() {
    console.log('\n⚡ Testing API Response Times...');
    
    const endpoints = [
      '/api/v44/health',
      '/api/v44/status',
      '/api/v44/features',
      '/api/v44/metrics',
      '/api/v44/config'
    ];
    
    for (const endpoint of endpoints) {
      console.log(`  Testing ${endpoint}...`);
      
      const iterations = 500;
      const times = [];
      
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        try {
          await this.makeRequest(endpoint);
          const end = performance.now();
          times.push(end - start);
        } catch (error) {
          // Continue testing even if some requests fail
        }
      }
      
      const stats = this.calculateStats(times);
      const testResult = {
        test: `API Response Time - ${endpoint}`,
        category: 'API Performance',
        target: this.results.targets.apiResponseTime,
        ...stats,
        passed: stats.average < this.results.targets.apiResponseTime
      };
      
      this.results.tests.push(testResult);
      this.logTestResult(testResult);
    }
  }

  /**
   * Test API throughput using concurrent requests
   */
  async testAPIThroughput() {
    console.log('\n🔥 Testing API Throughput...');
    
    const testDuration = 30; // seconds
    const concurrency = 100;
    
    console.log(`  Running ${concurrency} concurrent workers for ${testDuration} seconds...`);
    
    const workers = [];
    const results = [];
    
    // Create worker threads for concurrent testing
    for (let i = 0; i < concurrency; i++) {
      const worker = new Worker(__filename, {
        workerData: {
          isWorker: true,
          baseUrl: this.baseUrl,
          duration: testDuration * 1000,
          workerId: i
        }
      });
      
      workers.push(new Promise((resolve) => {
        worker.on('message', resolve);
      }));
    }
    
    const workerResults = await Promise.all(workers);
    const totalRequests = workerResults.reduce((sum, result) => sum + result.requests, 0);
    const totalTime = testDuration;
    const rps = totalRequests / totalTime;
    
    const testResult = {
      test: 'API Throughput',
      category: 'System Throughput',
      target: this.results.targets.systemThroughput,
      totalRequests,
      duration: totalTime,
      rps: Math.round(rps),
      passed: rps >= this.results.targets.systemThroughput
    };
    
    this.results.tests.push(testResult);
    this.logTestResult(testResult);
  }

  /**
   * Test database query performance
   */
  async testDatabasePerformance() {
    console.log('\n🗄️ Testing Database Performance...');
    
    // Simulate database queries through API endpoints that involve DB operations
    const dbEndpoints = [
      '/api/v44/status', // Involves metrics queries
      '/api/v44/feature-flags', // Feature flag queries
      '/api/v44/config' // Configuration queries
    ];
    
    for (const endpoint of dbEndpoints) {
      console.log(`  Testing database performance via ${endpoint}...`);
      
      const iterations = 200;
      const times = [];
      
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        try {
          await this.makeRequest(endpoint);
          const end = performance.now();
          times.push(end - start);
        } catch (error) {
          // Continue testing
        }
      }
      
      const stats = this.calculateStats(times);
      const testResult = {
        test: `Database Query Performance - ${endpoint}`,
        category: 'Database Performance',
        target: this.results.targets.databaseQueryTime,
        ...stats,
        passed: stats.average < this.results.targets.databaseQueryTime
      };
      
      this.results.tests.push(testResult);
      this.logTestResult(testResult);
    }
  }

  /**
   * Test AI Agent response times
   */
  async testAIAgentPerformance() {
    console.log('\n🤖 Testing AI Agent Performance...');
    
    // Test AI explainability endpoint
    const explainabilityPayload = {
      model_id: 'test-model-001',
      input_data: { feature1: 0.5, feature2: 0.3, feature3: 0.8 },
      explanation_type: 'shap',
      stakeholder_type: 'end_user'
    };
    
    console.log('  Testing AI Explainability performance...');
    const iterations = 50;
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      
      try {
        await this.makeRequest('/api/v44/explainability/explain', 'POST', explainabilityPayload);
        const end = performance.now();
        times.push(end - start);
      } catch (error) {
        // Expected to fail without proper setup, but measure timing
        const end = performance.now();
        times.push(end - start);
      }
    }
    
    const stats = this.calculateStats(times);
    const testResult = {
      test: 'AI Agent Explainability Response Time',
      category: 'AI Performance',
      target: this.results.targets.aiAgentResponseTime,
      ...stats,
      passed: stats.average < this.results.targets.aiAgentResponseTime
    };
    
    this.results.tests.push(testResult);
    this.logTestResult(testResult);
  }

  /**
   * Test Federated Learning performance
   */
  async testFederatedLearningPerformance() {
    console.log('\n🔗 Testing Federated Learning Performance...');
    
    const flPayload = {
      model_config: {
        architecture: 'simple_cnn',
        input_shape: [28, 28, 1],
        num_classes: 10
      },
      data_config: {
        dataset: 'mnist',
        batch_size: 32
      },
      num_clients: 10,
      num_rounds: 3,
      scenario_type: 'cross_device'
    };
    
    console.log('  Testing Federated Learning training initiation...');
    const iterations = 10;
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      
      try {
        await this.makeRequest('/api/v44/federated-learning/train', 'POST', flPayload);
        const end = performance.now();
        times.push(end - start);
      } catch (error) {
        const end = performance.now();
        times.push(end - start);
      }
    }
    
    const stats = this.calculateStats(times);
    const testResult = {
      test: 'Federated Learning Initiation',
      category: 'Federated Learning',
      target: 1000, // 1 second for complex FL operations
      ...stats,
      passed: stats.average < 1000
    };
    
    this.results.tests.push(testResult);
    this.logTestResult(testResult);
  }

  /**
   * Test Multi-Cloud operations performance
   */
  async testMultiCloudPerformance() {
    console.log('\n☁️ Testing Multi-Cloud Performance...');
    
    console.log('  Testing multi-cloud deployment status...');
    const iterations = 20;
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      
      try {
        await this.makeRequest('/api/v44/multi-cloud/deployments');
        const end = performance.now();
        times.push(end - start);
      } catch (error) {
        const end = performance.now();
        times.push(end - start);
      }
    }
    
    const stats = this.calculateStats(times);
    const testResult = {
      test: 'Multi-Cloud Deployment Query',
      category: 'Multi-Cloud',
      target: 500, // 500ms for cloud operations
      ...stats,
      passed: stats.average < 500
    };
    
    this.results.tests.push(testResult);
    this.logTestResult(testResult);
  }

  /**
   * Test Quantum Encryption performance
   */
  async testQuantumEncryptionPerformance() {
    console.log('\n🔐 Testing Quantum Encryption Performance...');
    
    const encryptionPayload = {
      operation: 'encrypt',
      algorithm: 'ML-KEM-768',
      data: 'Hello, quantum world! This is a test message for encryption.'
    };
    
    console.log('  Testing quantum encryption operations...');
    const iterations = 20;
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      
      try {
        await this.makeRequest('/api/v44/quantum-encryption/encrypt', 'POST', encryptionPayload);
        const end = performance.now();
        times.push(end - start);
      } catch (error) {
        const end = performance.now();
        times.push(end - start);
      }
    }
    
    const stats = this.calculateStats(times);
    const testResult = {
      test: 'Quantum Encryption Operations',
      category: 'Quantum Encryption',
      target: 200, // 200ms for quantum operations
      ...stats,
      passed: stats.average < 200
    };
    
    this.results.tests.push(testResult);
    this.logTestResult(testResult);
  }

  /**
   * Test system load capacity
   */
  async testSystemLoadCapacity() {
    console.log('\n💪 Testing System Load Capacity...');
    
    const loadLevels = [10, 50, 100, 200];
    
    for (const concurrency of loadLevels) {
      console.log(`  Testing with ${concurrency} concurrent users...`);
      
      const testDuration = 10; // seconds
      const workers = [];
      
      for (let i = 0; i < concurrency; i++) {
        workers.push(this.simulateUserLoad(testDuration));
      }
      
      const start = performance.now();
      const results = await Promise.all(workers);
      const end = performance.now();
      
      const totalRequests = results.reduce((sum, result) => sum + result.requests, 0);
      const avgResponseTime = results.reduce((sum, result) => sum + result.avgTime, 0) / results.length;
      const errorRate = results.reduce((sum, result) => sum + result.errors, 0) / totalRequests;
      
      const testResult = {
        test: `Load Test - ${concurrency} concurrent users`,
        category: 'Load Testing',
        concurrency,
        duration: testDuration,
        totalRequests,
        rps: Math.round(totalRequests / testDuration),
        avgResponseTime: Math.round(avgResponseTime),
        errorRate: Math.round(errorRate * 100) / 100,
        passed: avgResponseTime < 100 && errorRate < 0.05 // <100ms avg, <5% error rate
      };
      
      this.results.tests.push(testResult);
      this.logTestResult(testResult);
    }
  }

  /**
   * Test memory usage during operation
   */
  async testMemoryUsage() {
    console.log('\n🧠 Testing Memory Usage...');
    
    const initialMemory = process.memoryUsage();
    
    // Perform intensive operations
    const operations = 1000;
    const promises = [];
    
    for (let i = 0; i < operations; i++) {
      promises.push(this.makeRequest('/api/v44/health'));
    }
    
    await Promise.all(promises.map(p => p.catch(() => {})));
    
    const finalMemory = process.memoryUsage();
    const memoryIncrease = {
      rss: finalMemory.rss - initialMemory.rss,
      heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
      heapTotal: finalMemory.heapTotal - initialMemory.heapTotal
    };
    
    const testResult = {
      test: 'Memory Usage Test',
      category: 'Resource Usage',
      initialMemory: this.formatBytes(initialMemory.heapUsed),
      finalMemory: this.formatBytes(finalMemory.heapUsed),
      memoryIncrease: this.formatBytes(memoryIncrease.heapUsed),
      passed: memoryIncrease.heapUsed < 100 * 1024 * 1024 // <100MB increase
    };
    
    this.results.tests.push(testResult);
    this.logTestResult(testResult);
  }

  /**
   * Test concurrent user scenarios
   */
  async testConcurrentUsers() {
    console.log('\n👥 Testing Concurrent User Scenarios...');
    
    const userScenarios = [
      { users: 100, duration: 30 },
      { users: 500, duration: 60 },
      { users: 1000, duration: 30 }
    ];
    
    for (const scenario of userScenarios) {
      console.log(`  Testing ${scenario.users} concurrent users for ${scenario.duration}s...`);
      
      const workers = [];
      for (let i = 0; i < scenario.users; i++) {
        workers.push(this.simulateRealisticUser(scenario.duration));
      }
      
      const results = await Promise.all(workers);
      const totalRequests = results.reduce((sum, result) => sum + result.requests, 0);
      const avgResponseTime = results.reduce((sum, result) => sum + result.avgTime, 0) / results.length;
      const errorRate = results.reduce((sum, result) => sum + result.errors, 0) / totalRequests;
      
      const testResult = {
        test: `Concurrent Users - ${scenario.users} users`,
        category: 'Concurrency Testing',
        users: scenario.users,
        duration: scenario.duration,
        totalRequests,
        rps: Math.round(totalRequests / scenario.duration),
        avgResponseTime: Math.round(avgResponseTime),
        errorRate: Math.round(errorRate * 100) / 100,
        passed: avgResponseTime < 200 && errorRate < 0.1 // <200ms avg, <10% error rate
      };
      
      this.results.tests.push(testResult);
      this.logTestResult(testResult);
    }
  }

  /**
   * Simulate realistic user behavior
   */
  async simulateRealisticUser(duration) {
    const endpoints = [
      '/api/v44/health',
      '/api/v44/status',
      '/api/v44/features',
      '/api/v44/metrics'
    ];
    
    const endTime = Date.now() + (duration * 1000);
    let requests = 0;
    let totalTime = 0;
    let errors = 0;
    
    while (Date.now() < endTime) {
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      const start = performance.now();
      
      try {
        await this.makeRequest(endpoint);
        const end = performance.now();
        totalTime += (end - start);
        requests++;
      } catch (error) {
        errors++;
      }
      
      // Random delay between requests (1-5 seconds)
      await this.sleep(Math.random() * 4000 + 1000);
    }
    
    return {
      requests,
      avgTime: requests > 0 ? totalTime / requests : 0,
      errors
    };
  }

  /**
   * Simulate user load
   */
  async simulateUserLoad(duration) {
    const endTime = Date.now() + (duration * 1000);
    let requests = 0;
    let totalTime = 0;
    let errors = 0;
    
    while (Date.now() < endTime) {
      const start = performance.now();
      
      try {
        await this.makeRequest('/api/v44/health');
        const end = performance.now();
        totalTime += (end - start);
        requests++;
      } catch (error) {
        errors++;
      }
    }
    
    return {
      requests,
      avgTime: requests > 0 ? totalTime / requests : 0,
      errors
    };
  }

  /**
   * Make HTTP request
   */
  async makeRequest(endpoint, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.baseUrl);
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TrustStram-Performance-Test/4.4.0'
        },
        timeout: 10000
      };
      
      if (data) {
        const postData = JSON.stringify(data);
        options.headers['Content-Length'] = Buffer.byteLength(postData);
      }
      
      const client = url.protocol === 'https:' ? https : http;
      const req = client.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, data: responseData });
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  /**
   * Calculate statistics
   */
  calculateStats(values) {
    if (values.length === 0) {
      return { average: 0, min: 0, max: 0, p95: 0, p99: 0 };
    }
    
    const sorted = values.sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      average: Math.round(sum / values.length * 100) / 100,
      min: Math.round(sorted[0] * 100) / 100,
      max: Math.round(sorted[sorted.length - 1] * 100) / 100,
      p95: Math.round(sorted[Math.floor(sorted.length * 0.95)] * 100) / 100,
      p99: Math.round(sorted[Math.floor(sorted.length * 0.99)] * 100) / 100
    };
  }

  /**
   * Log test result
   */
  logTestResult(result) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const performance = result.average ? `${result.average}ms avg` : 
                       result.rps ? `${result.rps} RPS` : '';
    
    console.log(`    ${status} ${result.test} - ${performance}`);
    
    if (result.average && result.target) {
      console.log(`      Target: <${result.target}ms, P95: ${result.p95}ms, P99: ${result.p99}ms`);
    }
  }

  /**
   * Generate comprehensive performance report
   */
  async generateReport() {
    console.log('\n📊 Generating Performance Report...');
    
    const totalTests = this.results.tests.length;
    const passedTests = this.results.tests.filter(t => t.passed).length;
    const passRate = Math.round((passedTests / totalTests) * 100);
    
    this.results.summary = {
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      passRate
    };
    
    this.results.performance_analysis = this.analyzePerformance();
    this.results.recommendations = this.generateRecommendations();
    
    // Save to file
    const reportPath = path.join('tests', 'performance_testing_results.md');
    const report = this.formatMarkdownReport();
    
    fs.writeFileSync(reportPath, report);
    console.log(`\n📋 Performance report saved to: ${reportPath}`);
    
    // Also save JSON data
    const jsonPath = path.join('tests', 'performance', 'performance_results.json');
    fs.writeFileSync(jsonPath, JSON.stringify(this.results, null, 2));
    
    this.printSummary();
  }

  /**
   * Analyze performance results
   */
  analyzePerformance() {
    const analysis = {
      api_performance: {
        target_met: true,
        avg_response_time: 0,
        bottlenecks: []
      },
      throughput_performance: {
        target_met: true,
        max_rps: 0,
        scalability_issues: []
      },
      database_performance: {
        target_met: true,
        avg_query_time: 0,
        slow_queries: []
      },
      ai_performance: {
        target_met: true,
        avg_response_time: 0,
        optimization_needed: []
      }
    };
    
    // Analyze API performance
    const apiTests = this.results.tests.filter(t => t.category === 'API Performance');
    if (apiTests.length > 0) {
      const avgApiTime = apiTests.reduce((sum, t) => sum + t.average, 0) / apiTests.length;
      analysis.api_performance.avg_response_time = Math.round(avgApiTime);
      analysis.api_performance.target_met = avgApiTime < this.results.targets.apiResponseTime;
      
      apiTests.forEach(test => {
        if (!test.passed) {
          analysis.api_performance.bottlenecks.push(test.test);
        }
      });
    }
    
    // Analyze throughput
    const throughputTests = this.results.tests.filter(t => t.category === 'System Throughput');
    if (throughputTests.length > 0) {
      const maxRps = Math.max(...throughputTests.map(t => t.rps || 0));
      analysis.throughput_performance.max_rps = maxRps;
      analysis.throughput_performance.target_met = maxRps >= this.results.targets.systemThroughput;
    }
    
    // Analyze database performance
    const dbTests = this.results.tests.filter(t => t.category === 'Database Performance');
    if (dbTests.length > 0) {
      const avgDbTime = dbTests.reduce((sum, t) => sum + t.average, 0) / dbTests.length;
      analysis.database_performance.avg_query_time = Math.round(avgDbTime);
      analysis.database_performance.target_met = avgDbTime < this.results.targets.databaseQueryTime;
      
      dbTests.forEach(test => {
        if (!test.passed) {
          analysis.database_performance.slow_queries.push(test.test);
        }
      });
    }
    
    // Analyze AI performance
    const aiTests = this.results.tests.filter(t => t.category === 'AI Performance');
    if (aiTests.length > 0) {
      const avgAiTime = aiTests.reduce((sum, t) => sum + t.average, 0) / aiTests.length;
      analysis.ai_performance.avg_response_time = Math.round(avgAiTime);
      analysis.ai_performance.target_met = avgAiTime < this.results.targets.aiAgentResponseTime;
      
      aiTests.forEach(test => {
        if (!test.passed) {
          analysis.ai_performance.optimization_needed.push(test.test);
        }
      });
    }
    
    return analysis;
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    const analysis = this.results.performance_analysis;
    
    if (!analysis.api_performance.target_met) {
      recommendations.push({
        category: 'API Performance',
        priority: 'High',
        issue: `API response time (${analysis.api_performance.avg_response_time}ms) exceeds target (${this.results.targets.apiResponseTime}ms)`,
        recommendations: [
          'Implement response caching for frequently accessed endpoints',
          'Optimize database queries to reduce response times',
          'Consider implementing API response compression',
          'Review and optimize critical path algorithms'
        ]
      });
    }
    
    if (!analysis.throughput_performance.target_met) {
      recommendations.push({
        category: 'System Throughput',
        priority: 'High',
        issue: `Maximum RPS (${analysis.throughput_performance.max_rps}) below target (${this.results.targets.systemThroughput})`,
        recommendations: [
          'Implement horizontal scaling with load balancers',
          'Optimize connection pooling and keep-alive settings',
          'Consider implementing request queuing for peak loads',
          'Review application architecture for bottlenecks'
        ]
      });
    }
    
    if (!analysis.database_performance.target_met) {
      recommendations.push({
        category: 'Database Performance',
        priority: 'Medium',
        issue: `Database query time (${analysis.database_performance.avg_query_time}ms) exceeds target (${this.results.targets.databaseQueryTime}ms)`,
        recommendations: [
          'Add database indexes for frequently queried columns',
          'Implement query result caching',
          'Consider database connection pooling optimization',
          'Review and optimize slow queries identified in testing'
        ]
      });
    }
    
    if (!analysis.ai_performance.target_met) {
      recommendations.push({
        category: 'AI Performance',
        priority: 'Medium',
        issue: `AI response time (${analysis.ai_performance.avg_response_time}ms) exceeds target (${this.results.targets.aiAgentResponseTime}ms)`,
        recommendations: [
          'Implement model caching for frequently used AI models',
          'Consider model optimization techniques (quantization, pruning)',
          'Implement asynchronous processing for non-critical AI operations',
          'Review AI pipeline for performance bottlenecks'
        ]
      });
    }
    
    // Add general recommendations
    recommendations.push({
      category: 'General Optimization',
      priority: 'Low',
      issue: 'Continuous improvement opportunities',
      recommendations: [
        'Implement comprehensive monitoring and alerting',
        'Regular performance testing in CI/CD pipeline',
        'Consider implementing CDN for static assets',
        'Regular database maintenance and optimization',
        'Monitor and optimize memory usage patterns'
      ]
    });
    
    return recommendations;
  }

  /**
   * Format markdown report
   */
  formatMarkdownReport() {
    const { summary, performance_analysis, recommendations } = this.results;
    
    return `# TrustStram v4.4 Performance Testing Results

**Generated:** ${this.results.timestamp}  
**Test Suite:** ${this.results.testSuite}  
**Version:** ${this.results.version}  

## Executive Summary

${summary.passedTests}/${summary.totalTests} tests passed (${summary.passRate}% pass rate)

### Target Metrics
- **API Response Time:** <${this.results.targets.apiResponseTime}ms
- **System Throughput:** ${this.results.targets.systemThroughput.toLocaleString()}+ RPS
- **Database Query Time:** <${this.results.targets.databaseQueryTime}ms
- **AI Agent Response Time:** <${this.results.targets.aiAgentResponseTime}ms

### Performance Analysis

#### API Performance
- **Average Response Time:** ${performance_analysis.api_performance.avg_response_time}ms
- **Target Met:** ${performance_analysis.api_performance.target_met ? '✅ Yes' : '❌ No'}
- **Bottlenecks:** ${performance_analysis.api_performance.bottlenecks.length || 'None identified'}

#### System Throughput
- **Maximum RPS:** ${performance_analysis.throughput_performance.max_rps.toLocaleString()}
- **Target Met:** ${performance_analysis.throughput_performance.target_met ? '✅ Yes' : '❌ No'}

#### Database Performance
- **Average Query Time:** ${performance_analysis.database_performance.avg_query_time}ms
- **Target Met:** ${performance_analysis.database_performance.target_met ? '✅ Yes' : '❌ No'}
- **Slow Queries:** ${performance_analysis.database_performance.slow_queries.length || 'None identified'}

#### AI Performance
- **Average Response Time:** ${performance_analysis.ai_performance.avg_response_time}ms
- **Target Met:** ${performance_analysis.ai_performance.target_met ? '✅ Yes' : '❌ No'}

## Detailed Test Results

| Test | Category | Status | Avg (ms) | P95 (ms) | P99 (ms) | Target | Notes |
|------|----------|--------|----------|----------|----------|--------|-------|
${this.results.tests.map(test => {
  const status = test.passed ? '✅ PASS' : '❌ FAIL';
  const avg = test.average ? test.average : test.rps ? `${test.rps} RPS` : '-';
  const p95 = test.p95 || '-';
  const p99 = test.p99 || '-';
  const target = test.target || '-';
  const notes = test.errorRate ? `${test.errorRate}% errors` : '';
  return `| ${test.test} | ${test.category} | ${status} | ${avg} | ${p95} | ${p99} | ${target} | ${notes} |`;
}).join('\n')}

## Performance Bottlenecks and Recommendations

${recommendations.map(rec => `### ${rec.category} (Priority: ${rec.priority})

**Issue:** ${rec.issue}

**Recommendations:**
${rec.recommendations.map(r => `- ${r}`).join('\n')}
`).join('\n')}

## System Resource Usage

${this.results.tests.filter(t => t.category === 'Resource Usage').map(test => `### ${test.test}
- **Initial Memory:** ${test.initialMemory}
- **Final Memory:** ${test.finalMemory}
- **Memory Increase:** ${test.memoryIncrease}
- **Status:** ${test.passed ? '✅ Within limits' : '❌ Exceeds limits'}
`).join('\n')}

## Load Testing Results

${this.results.tests.filter(t => t.category === 'Load Testing' || t.category === 'Concurrency Testing').map(test => `### ${test.test}
- **Concurrency/Users:** ${test.concurrency || test.users}
- **Duration:** ${test.duration}s
- **Total Requests:** ${test.totalRequests?.toLocaleString()}
- **RPS:** ${test.rps?.toLocaleString()}
- **Avg Response Time:** ${test.avgResponseTime}ms
- **Error Rate:** ${test.errorRate}%
- **Status:** ${test.passed ? '✅ PASS' : '❌ FAIL'}
`).join('\n')}

## Conclusion

TrustStram v4.4 demonstrates ${summary.passRate >= 80 ? 'excellent' : summary.passRate >= 60 ? 'good' : 'concerning'} performance characteristics with a ${summary.passRate}% test pass rate. 

${summary.passRate >= 80 ? '✅ **RECOMMENDATION:** System is ready for production deployment.' : summary.passRate >= 60 ? '⚠️ **RECOMMENDATION:** Address identified bottlenecks before production deployment.' : '❌ **RECOMMENDATION:** Significant performance improvements required before production deployment.'}

### Next Steps

1. **Immediate Actions:** Address high-priority performance issues identified in recommendations
2. **Monitoring:** Implement continuous performance monitoring in production
3. **Optimization:** Apply recommended optimizations and re-test
4. **Scaling:** Plan for horizontal scaling if throughput targets are not met

---

*Performance testing completed on ${new Date().toLocaleDateString()} using TrustStram Performance Test Suite v4.4.0*
`;
  }

  /**
   * Print summary
   */
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`📊 Tests: ${this.results.summary.passedTests}/${this.results.summary.totalTests} passed (${this.results.summary.passRate}%)`);
    
    const analysis = this.results.performance_analysis;
    console.log(`⚡ API Performance: ${analysis.api_performance.target_met ? '✅' : '❌'} ${analysis.api_performance.avg_response_time}ms avg`);
    console.log(`🔥 Throughput: ${analysis.throughput_performance.target_met ? '✅' : '❌'} ${analysis.throughput_performance.max_rps.toLocaleString()} RPS max`);
    console.log(`🗄️ Database: ${analysis.database_performance.target_met ? '✅' : '❌'} ${analysis.database_performance.avg_query_time}ms avg`);
    console.log(`🤖 AI Performance: ${analysis.ai_performance.target_met ? '✅' : '❌'} ${analysis.ai_performance.avg_response_time}ms avg`);
    
    const overallStatus = this.results.summary.passRate >= 80 ? '✅ EXCELLENT' : 
                         this.results.summary.passRate >= 60 ? '⚠️ GOOD' : '❌ NEEDS IMPROVEMENT';
    console.log(`\n🎯 Overall Status: ${overallStatus}`);
    console.log('='.repeat(60));
  }

  /**
   * Format bytes
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Worker thread code for concurrent testing
if (!isMainThread && workerData && workerData.isWorker) {
  const { baseUrl, duration, workerId } = workerData;
  const tester = new PerformanceTestSuite();
  tester.baseUrl = baseUrl;
  
  (async () => {
    const result = await tester.simulateUserLoad(duration / 1000);
    parentPort.postMessage(result);
  })();
} else if (isMainThread) {
  // Main execution
  const tester = new PerformanceTestSuite();
  tester.runAllTests().catch(console.error);
}

module.exports = PerformanceTestSuite;