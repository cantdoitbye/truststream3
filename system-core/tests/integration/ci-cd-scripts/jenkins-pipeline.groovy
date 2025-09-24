/**
 * TrustStream v4.2 Jenkins CI/CD Pipeline
 * Comprehensive integration testing pipeline for Jenkins
 * 
 * Author: MiniMax Agent
 * Date: 2025-09-20
 * Version: 1.0.0
 */

pipeline {
    agent {
        label 'docker'
    }
    
    parameters {
        choice(
            name: 'TEST_SUITE',
            choices: ['all', 'integration', 'performance', 'regression', 'security'],
            description: 'Test suite to execute'
        )
        choice(
            name: 'ENVIRONMENT',
            choices: ['staging', 'production', 'isolated'],
            description: 'Target test environment'
        )
        booleanParam(
            name: 'SKIP_PERFORMANCE',
            defaultValue: false,
            description: 'Skip performance tests'
        )
        booleanParam(
            name: 'FORCE_BASELINE_UPDATE',
            defaultValue: false,
            description: 'Force update regression baselines'
        )
        booleanParam(
            name: 'PARALLEL_EXECUTION',
            defaultValue: true,
            description: 'Enable parallel test execution'
        )
    }
    
    environment {
        NODE_VERSION = '18'
        SUPABASE_URL = credentials('supabase-url')
        SUPABASE_SERVICE_ROLE_KEY = credentials('supabase-service-key')
        DATABASE_URL = credentials('database-url')
        REDIS_URL = credentials('redis-url')
        DOCKER_REGISTRY = 'truststream-registry'
        
        // Build metadata
        BUILD_TIMESTAMP = sh(script: 'date -u +%Y%m%d-%H%M%S', returnStdout: true).trim()
        BUILD_TAG = "build-${BUILD_NUMBER}-${BUILD_TIMESTAMP}"
        
        // Test configuration
        TEST_RESULTS_DIR = 'test-results'
        ARTIFACTS_DIR = 'artifacts'
        REPORTS_DIR = 'reports'
    }
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '50'))
        timeout(time: 120, unit: 'MINUTES')
        skipStagesAfterUnstable()
        skipDefaultCheckout()
        ansiColor('xterm')
    }
    
    stages {
        // ================================================================
        // PREPARATION AND SETUP
        // ================================================================
        
        stage('🚀 Preparation') {
            parallel {
                stage('📥 Checkout & Setup') {
                    steps {
                        script {
                            // Clean workspace and checkout
                            cleanWs()
                            checkout scm
                            
                            // Setup build metadata
                            env.GIT_COMMIT_SHORT = sh(
                                script: 'git rev-parse --short HEAD',
                                returnStdout: true
                            ).trim()
                            
                            env.GIT_BRANCH_CLEAN = env.BRANCH_NAME.replaceAll(/[^a-zA-Z0-9\-]/, '-')
                            
                            // Display build information
                            echo """
                            🎯 TrustStream v4.2 Integration Testing Pipeline
                            ================================================
                            Build: ${BUILD_NUMBER}
                            Commit: ${env.GIT_COMMIT_SHORT}
                            Branch: ${BRANCH_NAME}
                            Test Suite: ${params.TEST_SUITE}
                            Environment: ${params.ENVIRONMENT}
                            Parallel Execution: ${params.PARALLEL_EXECUTION}
                            ================================================
                            """.stripIndent()
                        }
                    }
                }
                
                stage('🔍 Change Detection') {
                    steps {
                        script {
                            // Detect changes in different areas
                            def changes = [:]
                            
                            changes.core = sh(
                                script: 'git diff --name-only HEAD~1 HEAD | grep -E "(src/|supabase/|package\\.json)" || true',
                                returnStdout: true
                            ).trim() != ''
                            
                            changes.performance = sh(
                                script: 'git diff --name-only HEAD~1 HEAD | grep -E "(src/trust-pyramid/|src/orchestrator/)" || true',
                                returnStdout: true
                            ).trim() != ''
                            
                            changes.governance = sh(
                                script: 'git diff --name-only HEAD~1 HEAD | grep -E "(src/orchestrator/governance|src/agents/)" || true',
                                returnStdout: true
                            ).trim() != ''
                            
                            changes.tests = sh(
                                script: 'git diff --name-only HEAD~1 HEAD | grep -E "(tests/|jest\\.config\\.js)" || true',
                                returnStdout: true
                            ).trim() != ''
                            
                            // Store changes in environment
                            env.CHANGES_CORE = changes.core.toString()
                            env.CHANGES_PERFORMANCE = changes.performance.toString()
                            env.CHANGES_GOVERNANCE = changes.governance.toString()
                            env.CHANGES_TESTS = changes.tests.toString()
                            
                            echo "Change Detection Results:"
                            echo "- Core Changes: ${changes.core}"
                            echo "- Performance Changes: ${changes.performance}"
                            echo "- Governance Changes: ${changes.governance}"
                            echo "- Test Changes: ${changes.tests}"
                        }
                    }
                }
            }
        }
        
        stage('🛠️ Environment Setup') {
            parallel {
                stage('📦 Dependencies') {
                    agent {
                        docker {
                            image 'node:18-alpine'
                            reuseNode true
                        }
                    }
                    steps {
                        script {
                            // Install dependencies with caching
                            sh '''
                                echo "Installing Node.js dependencies..."
                                npm ci --cache /tmp/npm-cache --prefer-offline
                                npm run build
                                
                                # Verify build artifacts
                                ls -la dist/
                                
                                echo "✅ Dependencies installed and build completed"
                            '''
                        }
                    }
                }
                
                stage('🗄️ Test Infrastructure') {
                    steps {
                        script {
                            // Setup test infrastructure using Docker Compose
                            sh '''
                                echo "Setting up test infrastructure..."
                                
                                # Create docker-compose for test services
                                cat > docker-compose.test.yml << 'EOF'
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: truststream_test
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
  
  supabase:
    image: supabase/supabase:latest
    environment:
      POSTGRES_DB: truststream_test
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "54321:54321"
    depends_on:
      - postgres
EOF
                                
                                # Start test infrastructure
                                docker-compose -f docker-compose.test.yml up -d
                                
                                # Wait for services to be healthy
                                echo "Waiting for services to be ready..."
                                timeout 120 bash -c 'until docker-compose -f docker-compose.test.yml ps | grep -q "healthy"; do sleep 5; done'
                                
                                echo "✅ Test infrastructure ready"
                            '''
                        }
                    }
                }
            }
        }
        
        stage('🔧 Test Configuration') {
            steps {
                script {
                    // Create test configuration
                    sh '''
                        echo "Configuring test environment..."
                        
                        # Create test directories
                        mkdir -p ${TEST_RESULTS_DIR}
                        mkdir -p ${ARTIFACTS_DIR}
                        mkdir -p ${REPORTS_DIR}
                        
                        # Create test environment configuration
                        cat > .env.test << EOF
NODE_ENV=test
TEST_SUITE=${TEST_SUITE}
ENVIRONMENT=${ENVIRONMENT}
PARALLEL_EXECUTION=${PARALLEL_EXECUTION}
SKIP_PERFORMANCE=${SKIP_PERFORMANCE}
FORCE_BASELINE_UPDATE=${FORCE_BASELINE_UPDATE}

# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/truststream_test
REDIS_URL=redis://localhost:6379

# Supabase Configuration
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}

# Build Information
BUILD_NUMBER=${BUILD_NUMBER}
BUILD_TAG=${BUILD_TAG}
GIT_COMMIT=${GIT_COMMIT_SHORT}
GIT_BRANCH=${BRANCH_NAME}

# Test Configuration
TEST_TIMEOUT=30000
TEST_RETRIES=2
TEST_PARALLEL_WORKERS=4
PERFORMANCE_TEST_DURATION=300
REGRESSION_THRESHOLD=5.0
EOF
                        
                        # Setup test database schema
                        echo "Setting up test database..."
                        export PGPASSWORD=postgres
                        psql -h localhost -U postgres -d truststream_test -f tests/fixtures/test-schema.sql
                        
                        # Seed test data
                        npm run test:seed
                        
                        echo "✅ Test configuration completed"
                    '''
                }
            }
        }
        
        // ================================================================
        // INTEGRATION TESTS
        // ================================================================
        
        stage('🧪 Integration Tests') {
            when {
                anyOf {
                    expression { params.TEST_SUITE == 'all' }
                    expression { params.TEST_SUITE == 'integration' }
                    expression { env.CHANGES_CORE == 'true' }
                    expression { env.CHANGES_TESTS == 'true' }
                }
            }
            
            parallel {
                stage('Basic Integration') {
                    steps {
                        script {
                            try {
                                sh '''
                                    echo "🏃 Running basic integration tests..."
                                    npm run test:integration:basic -- \
                                        --outputFile=${TEST_RESULTS_DIR}/integration-basic.json \
                                        --coverage \
                                        --coverageDirectory=${TEST_RESULTS_DIR}/coverage-basic
                                '''
                                
                                // Parse and display results
                                def testResults = readJSON file: "${TEST_RESULTS_DIR}/integration-basic.json"
                                echo "Basic Integration Results: ${testResults.numPassedTests}/${testResults.numTotalTests} passed"
                                
                            } catch (Exception e) {
                                currentBuild.result = 'UNSTABLE'
                                echo "❌ Basic integration tests failed: ${e.message}"
                            }
                        }
                    }
                    post {
                        always {
                            archiveArtifacts artifacts: "${TEST_RESULTS_DIR}/integration-basic.*", allowEmptyArchive: true
                            publishHTML([
                                allowMissing: false,
                                alwaysLinkToLastBuild: true,
                                keepAll: true,
                                reportDir: "${TEST_RESULTS_DIR}/coverage-basic",
                                reportFiles: 'index.html',
                                reportName: 'Basic Integration Coverage'
                            ])
                        }
                    }
                }
                
                stage('v4.1 Compatibility') {
                    steps {
                        script {
                            try {
                                sh '''
                                    echo "🔄 Running v4.1 compatibility tests..."
                                    npm run test:compatibility:v4.1 -- \
                                        --outputFile=${TEST_RESULTS_DIR}/compatibility-v41.json
                                '''
                                
                                def testResults = readJSON file: "${TEST_RESULTS_DIR}/compatibility-v41.json"
                                echo "v4.1 Compatibility Results: ${testResults.numPassedTests}/${testResults.numTotalTests} passed"
                                
                            } catch (Exception e) {
                                currentBuild.result = 'UNSTABLE'
                                echo "❌ v4.1 compatibility tests failed: ${e.message}"
                            }
                        }
                    }
                    post {
                        always {
                            archiveArtifacts artifacts: "${TEST_RESULTS_DIR}/compatibility-v41.*", allowEmptyArchive: true
                        }
                    }
                }
                
                stage('Governance Workflows') {
                    when {
                        anyOf {
                            expression { params.TEST_SUITE == 'all' }
                            expression { env.CHANGES_GOVERNANCE == 'true' }
                        }
                    }
                    steps {
                        script {
                            try {
                                sh '''
                                    echo "🏛️ Running governance workflow tests..."
                                    npm run test:governance:workflows -- \
                                        --outputFile=${TEST_RESULTS_DIR}/governance-workflows.json
                                '''
                                
                                def testResults = readJSON file: "${TEST_RESULTS_DIR}/governance-workflows.json"
                                echo "Governance Workflows Results: ${testResults.numPassedTests}/${testResults.numTotalTests} passed"
                                
                            } catch (Exception e) {
                                currentBuild.result = 'UNSTABLE'
                                echo "❌ Governance workflow tests failed: ${e.message}"
                            }
                        }
                    }
                    post {
                        always {
                            archiveArtifacts artifacts: "${TEST_RESULTS_DIR}/governance-workflows.*", allowEmptyArchive: true
                        }
                    }
                }
                
                stage('Security Tests') {
                    steps {
                        script {
                            try {
                                sh '''
                                    echo "🔒 Running security tests..."
                                    npm run test:security:baseline -- \
                                        --outputFile=${TEST_RESULTS_DIR}/security-baseline.json
                                '''
                                
                                def testResults = readJSON file: "${TEST_RESULTS_DIR}/security-baseline.json"
                                echo "Security Tests Results: ${testResults.numPassedTests}/${testResults.numTotalTests} passed"
                                
                            } catch (Exception e) {
                                currentBuild.result = 'UNSTABLE'
                                echo "❌ Security tests failed: ${e.message}"
                            }
                        }
                    }
                    post {
                        always {
                            archiveArtifacts artifacts: "${TEST_RESULTS_DIR}/security-baseline.*", allowEmptyArchive: true
                        }
                    }
                }
            }
        }
        
        // ================================================================
        // PERFORMANCE TESTS
        // ================================================================
        
        stage('⚡ Performance Tests') {
            when {
                allOf {
                    not { params.SKIP_PERFORMANCE }
                    anyOf {
                        expression { params.TEST_SUITE == 'all' }
                        expression { params.TEST_SUITE == 'performance' }
                        expression { env.CHANGES_PERFORMANCE == 'true' }
                    }
                }
            }
            
            parallel {
                stage('Governance Scoring Performance') {
                    steps {
                        script {
                            try {
                                sh '''
                                    echo "⚡ Running governance scoring performance tests..."
                                    npm run test:performance -- \
                                        --scenario=governance-scoring \
                                        --users=50 \
                                        --duration=300 \
                                        --output=${TEST_RESULTS_DIR}/perf-governance-scoring.json
                                '''
                                
                                // Analyze performance results
                                sh '''
                                    npm run analyze:performance -- \
                                        --input=${TEST_RESULTS_DIR}/perf-governance-scoring.json \
                                        --baseline=performance-baselines/governance-scoring.json \
                                        --output=${TEST_RESULTS_DIR}/perf-analysis-governance-scoring.json
                                '''
                                
                                def perfResults = readJSON file: "${TEST_RESULTS_DIR}/perf-analysis-governance-scoring.json"
                                echo "Governance Scoring Performance: ${perfResults.metrics.response_times.average_ms}ms avg, ${perfResults.metrics.throughput.requests_per_second} req/s"
                                
                                // Check for regressions
                                if (perfResults.regression_analysis.has_regression) {
                                    currentBuild.result = 'UNSTABLE'
                                    echo "⚠️ Performance regression detected in governance scoring"
                                }
                                
                            } catch (Exception e) {
                                currentBuild.result = 'UNSTABLE'
                                echo "❌ Governance scoring performance tests failed: ${e.message}"
                            }
                        }
                    }
                }
                
                stage('Trust Calculation Performance') {
                    steps {
                        script {
                            try {
                                sh '''
                                    echo "⚡ Running trust calculation performance tests..."
                                    npm run test:performance -- \
                                        --scenario=trust-calculation \
                                        --users=100 \
                                        --duration=180 \
                                        --output=${TEST_RESULTS_DIR}/perf-trust-calculation.json
                                '''
                                
                                sh '''
                                    npm run analyze:performance -- \
                                        --input=${TEST_RESULTS_DIR}/perf-trust-calculation.json \
                                        --baseline=performance-baselines/trust-calculation.json \
                                        --output=${TEST_RESULTS_DIR}/perf-analysis-trust-calculation.json
                                '''
                                
                                def perfResults = readJSON file: "${TEST_RESULTS_DIR}/perf-analysis-trust-calculation.json"
                                echo "Trust Calculation Performance: ${perfResults.metrics.response_times.average_ms}ms avg, ${perfResults.metrics.throughput.requests_per_second} req/s"
                                
                            } catch (Exception e) {
                                currentBuild.result = 'UNSTABLE'
                                echo "❌ Trust calculation performance tests failed: ${e.message}"
                            }
                        }
                    }
                }
            }
            
            post {
                always {
                    archiveArtifacts artifacts: "${TEST_RESULTS_DIR}/perf-*", allowEmptyArchive: true
                }
            }
        }
        
        // ================================================================
        // REGRESSION TESTS
        // ================================================================
        
        stage('🔄 Regression Tests') {
            when {
                anyOf {
                    expression { params.TEST_SUITE == 'all' }
                    expression { params.TEST_SUITE == 'regression' }
                    expression { env.CHANGES_CORE == 'true' }
                    triggeredBy 'TimerTrigger'
                }
            }
            
            steps {
                script {
                    try {
                        // Download existing baselines
                        sh '''
                            echo "📥 Downloading regression baselines..."
                            mkdir -p regression-baselines
                            
                            # Try to download from artifact repository
                            curl -f -o regression-baselines.tar.gz \
                                "${JENKINS_URL}/job/${JOB_NAME}/lastSuccessfulBuild/artifact/regression-baselines.tar.gz" || \
                                echo "No existing baselines found, will create new ones"
                            
                            if [ -f regression-baselines.tar.gz ]; then
                                tar -xzf regression-baselines.tar.gz -C regression-baselines/
                            fi
                        '''
                        
                        // Run regression tests
                        sh '''
                            echo "🔄 Running regression tests..."
                            npm run test:regression -- \
                                --suite=comprehensive \
                                --baseline-path=regression-baselines \
                                --output=${TEST_RESULTS_DIR}/regression-results.json \
                                --generate-new-baselines=${FORCE_BASELINE_UPDATE}
                        '''
                        
                        // Analyze regression results
                        sh '''
                            npm run analyze:regression -- \
                                --input=${TEST_RESULTS_DIR}/regression-results.json \
                                --output=${TEST_RESULTS_DIR}/regression-analysis.json \
                                --threshold=5.0
                        '''
                        
                        def regressionResults = readJSON file: "${TEST_RESULTS_DIR}/regression-analysis.json"
                        echo "Regression Test Results: ${regressionResults.summary.total_tests} tests, ${regressionResults.summary.regressions_detected} regressions"
                        
                        if (regressionResults.summary.critical_regressions > 0) {
                            currentBuild.result = 'FAILURE'
                            error("🚨 Critical regressions detected: ${regressionResults.summary.critical_regressions}")
                        } else if (regressionResults.summary.regressions_detected > 0) {
                            currentBuild.result = 'UNSTABLE'
                            echo "⚠️ Regressions detected: ${regressionResults.summary.regressions_detected}"
                        }
                        
                    } catch (Exception e) {
                        currentBuild.result = 'FAILURE'
                        echo "❌ Regression tests failed: ${e.message}"
                        throw e
                    }
                }
            }
            
            post {
                always {
                    archiveArtifacts artifacts: "${TEST_RESULTS_DIR}/regression-*", allowEmptyArchive: true
                    
                    // Archive regression baselines for future runs
                    sh '''
                        if [ -d regression-baselines ]; then
                            tar -czf regression-baselines.tar.gz regression-baselines/
                        fi
                    '''
                    archiveArtifacts artifacts: "regression-baselines.tar.gz", allowEmptyArchive: true
                }
            }
        }
        
        // ================================================================
        // RESULTS AGGREGATION AND REPORTING
        // ================================================================
        
        stage('📊 Aggregate Results') {
            steps {
                script {
                    try {
                        // Aggregate all test results
                        sh '''
                            echo "📊 Aggregating test results..."
                            npm run aggregate:test-results -- \
                                --input-dir=${TEST_RESULTS_DIR} \
                                --output=${REPORTS_DIR}/comprehensive-test-report.json \
                                --format=jenkins
                        '''
                        
                        // Calculate quality metrics
                        sh '''
                            npm run calculate:quality-metrics -- \
                                --test-results=${REPORTS_DIR}/comprehensive-test-report.json \
                                --output=${REPORTS_DIR}/quality-metrics.json
                        '''
                        
                        // Generate HTML report
                        sh '''
                            npm run generate:html-report -- \
                                --test-results=${REPORTS_DIR}/comprehensive-test-report.json \
                                --quality-metrics=${REPORTS_DIR}/quality-metrics.json \
                                --output=${REPORTS_DIR}/test-report.html
                        '''
                        
                        // Display summary
                        def testReport = readJSON file: "${REPORTS_DIR}/comprehensive-test-report.json"
                        def qualityMetrics = readJSON file: "${REPORTS_DIR}/quality-metrics.json"
                        
                        echo """
                        📊 Final Test Results Summary
                        =============================
                        Total Tests: ${testReport.summary.total_tests}
                        Passed: ${testReport.summary.passed_tests}
                        Failed: ${testReport.summary.failed_tests}
                        Success Rate: ${testReport.summary.success_rate_percentage}%
                        Overall Quality Score: ${qualityMetrics.overall_quality_score}/100
                        Performance Score: ${qualityMetrics.performance_score}/100
                        Reliability Score: ${qualityMetrics.reliability_score}/100
                        =============================
                        """.stripIndent()
                        
                        // Set build description
                        currentBuild.description = "Tests: ${testReport.summary.passed_tests}/${testReport.summary.total_tests} | Quality: ${qualityMetrics.overall_quality_score}/100"
                        
                    } catch (Exception e) {
                        echo "❌ Failed to aggregate results: ${e.message}"
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
            
            post {
                always {
                    // Archive all reports and artifacts
                    archiveArtifacts artifacts: "${REPORTS_DIR}/**/*", allowEmptyArchive: true
                    archiveArtifacts artifacts: "${TEST_RESULTS_DIR}/**/*", allowEmptyArchive: true
                    
                    // Publish HTML reports
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: REPORTS_DIR,
                        reportFiles: 'test-report.html',
                        reportName: 'Comprehensive Test Report'
                    ])
                    
                    // Publish test results to Jenkins
                    script {
                        if (fileExists("${TEST_RESULTS_DIR}/junit-results.xml")) {
                            junit "${TEST_RESULTS_DIR}/junit-results.xml"
                        }
                    }
                }
            }
        }
        
        // ================================================================
        // DEPLOYMENT READINESS CHECK
        // ================================================================
        
        stage('🚀 Deployment Readiness') {
            when {
                allOf {
                    branch 'main'
                    expression { currentBuild.result != 'FAILURE' }
                }
            }
            
            steps {
                script {
                    try {
                        // Check deployment readiness criteria
                        def testReport = readJSON file: "${REPORTS_DIR}/comprehensive-test-report.json"
                        def qualityMetrics = readJSON file: "${REPORTS_DIR}/quality-metrics.json"
                        
                        def successRate = testReport.summary.success_rate_percentage
                        def qualityScore = qualityMetrics.overall_quality_score
                        
                        def deploymentReady = (successRate >= 95 && qualityScore >= 80)
                        
                        if (deploymentReady) {
                            echo "✅ System ready for deployment"
                            
                            // Create deployment tag
                            sh '''
                                git config user.name "Jenkins CI"
                                git config user.email "jenkins@truststream.ai"
                                git tag -a "deployment-${BUILD_TAG}" -m "Deployment ready - All tests passed"
                                git push origin "deployment-${BUILD_TAG}"
                            '''
                            
                            // Generate deployment manifest
                            sh '''
                                cat > ${ARTIFACTS_DIR}/deployment-manifest.json << EOF
{
  "deployment_tag": "deployment-${BUILD_TAG}",
  "build_number": "${BUILD_NUMBER}",
  "commit_sha": "${GIT_COMMIT}",
  "branch": "${BRANCH_NAME}",
  "test_results": {
    "success_rate": ${successRate},
    "quality_score": ${qualityScore},
    "deployment_ready": true,
    "validation_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  }
}
EOF
                            '''
                            
                            env.DEPLOYMENT_READY = 'true'
                            env.DEPLOYMENT_TAG = "deployment-${BUILD_TAG}"
                            
                        } else {
                            echo "❌ System not ready for deployment"
                            echo "Success Rate: ${successRate}% (required: ≥95%)"
                            echo "Quality Score: ${qualityScore}/100 (required: ≥80)"
                            
                            env.DEPLOYMENT_READY = 'false'
                        }
                        
                    } catch (Exception e) {
                        echo "❌ Deployment readiness check failed: ${e.message}"
                        env.DEPLOYMENT_READY = 'false'
                    }
                }
            }
            
            post {
                always {
                    archiveArtifacts artifacts: "${ARTIFACTS_DIR}/**/*", allowEmptyArchive: true
                }
            }
        }
    }
    
    // ================================================================
    // POST-BUILD ACTIONS
    // ================================================================
    
    post {
        always {
            script {
                // Cleanup test infrastructure
                sh '''
                    echo "🧹 Cleaning up test infrastructure..."
                    docker-compose -f docker-compose.test.yml down -v || true
                    docker system prune -f || true
                '''
                
                // Send notifications
                def buildStatus = currentBuild.result ?: 'SUCCESS'
                def buildColor = buildStatus == 'SUCCESS' ? 'good' : buildStatus == 'UNSTABLE' ? 'warning' : 'danger'
                
                // Slack notification
                slackSend(
                    channel: '#ci-cd',
                    color: buildColor,
                    message: """
                    🎯 TrustStream v4.2 Pipeline: *${buildStatus}*
                    Build: #${BUILD_NUMBER} | Branch: ${BRANCH_NAME}
                    Test Suite: ${params.TEST_SUITE} | Environment: ${params.ENVIRONMENT}
                    Deployment Ready: ${env.DEPLOYMENT_READY ?: 'false'}
                    
                    <${BUILD_URL}|View Build> | <${BUILD_URL}Comprehensive_Test_Report/|View Report>
                    """.stripIndent()
                )
                
                // Email notification for failures
                if (buildStatus == 'FAILURE') {
                    emailext(
                        subject: "🚨 TrustStream v4.2 Pipeline Failed - Build #${BUILD_NUMBER}",
                        body: """
                        The TrustStream v4.2 integration testing pipeline has failed.
                        
                        Build: #${BUILD_NUMBER}
                        Branch: ${BRANCH_NAME}
                        Commit: ${env.GIT_COMMIT_SHORT}
                        Test Suite: ${params.TEST_SUITE}
                        
                        Please check the build logs and test reports for details.
                        
                        Build URL: ${BUILD_URL}
                        Test Report: ${BUILD_URL}Comprehensive_Test_Report/
                        """.stripIndent(),
                        to: '${DEFAULT_RECIPIENTS}',
                        replyTo: 'noreply@truststream.ai'
                    )
                }
            }
        }
        
        success {
            echo "✅ Pipeline completed successfully!"
            
            script {
                if (env.DEPLOYMENT_READY == 'true') {
                    echo "🚀 System is ready for deployment with tag: ${env.DEPLOYMENT_TAG}"
                    
                    // Trigger deployment pipeline if configured
                    if (params.ENVIRONMENT == 'production' && BRANCH_NAME == 'main') {
                        build job: 'truststream-deployment-pipeline',
                              parameters: [
                                  string(name: 'DEPLOYMENT_TAG', value: env.DEPLOYMENT_TAG),
                                  string(name: 'BUILD_NUMBER', value: BUILD_NUMBER)
                              ],
                              wait: false
                    }
                }
            }
        }
        
        failure {
            echo "❌ Pipeline failed!"
        }
        
        unstable {
            echo "⚠️ Pipeline completed with warnings!"
        }
    }
}
