#!/usr/bin/env python3
"""
TrustStram v4.4 Load & Stress Testing Orchestrator

This orchestrator coordinates comprehensive load and stress testing across all
TrustStram v4.4 components and generates detailed capacity recommendations.

Author: TrustStram Load Testing Team
Version: 4.4.0
Date: 2025-09-22
"""

import asyncio
import json
import logging
import subprocess
import time
import statistics
import psutil
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional
import yaml
import csv
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from jinja2 import Template

# Import our custom load testing modules
from load_testing_framework import (
    APILoadTester, AIAgentLoadTester, DatabaseLoadTester, 
    SystemMonitor, LoadTestResult
)
from federated_learning_load_tester import (
    FederatedLearningLoadTester, FLLoadTestResult
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class TestConfiguration:
    """Configuration for load testing scenarios"""
    name: str
    description: str
    base_url: str
    auth_token: Optional[str]
    scenarios: Dict[str, Any]
    thresholds: Dict[str, float]
    duration_seconds: int
    max_concurrent_users: int
    ramp_up_seconds: int

@dataclass
class ComprehensiveTestResults:
    """Comprehensive test results across all components"""
    test_session_id: str
    start_time: datetime
    end_time: datetime
    configuration: TestConfiguration
    api_results: List[LoadTestResult]
    agent_results: List[LoadTestResult]
    database_results: List[LoadTestResult]
    federated_learning_results: List[FLLoadTestResult]
    jmeter_results: Optional[Dict[str, Any]]
    system_metrics: Dict[str, Any]
    capacity_recommendations: Dict[str, Any]
    performance_summary: Dict[str, Any]
    alerts: List[str]
    passed_tests: int
    failed_tests: int
    total_tests: int

class TrustStramLoadTestOrchestrator:
    """Main orchestrator for TrustStram v4.4 load testing"""
    
    def __init__(self, config_file: str = None):
        self.test_session_id = f"trustram_load_test_{int(time.time())}"
        self.results_dir = Path("tests/load_stress_testing/results")
        self.results_dir.mkdir(exist_ok=True)
        
        # Load configuration
        self.config = self._load_configuration(config_file)
        
        # Initialize system monitor
        self.system_monitor = SystemMonitor()
        
        # Initialize test components
        self.api_tester = APILoadTester(self.config.base_url, self.config.auth_token)
        self.agent_tester = AIAgentLoadTester(self.config.base_url, self.config.auth_token)
        self.db_tester = DatabaseLoadTester(self.config.scenarios.get('database', {}))
        self.fl_tester = FederatedLearningLoadTester(self.config.base_url, self.config.auth_token)
        
        # Results storage
        self.all_results = ComprehensiveTestResults(
            test_session_id=self.test_session_id,
            start_time=datetime.now(),
            end_time=datetime.now(),
            configuration=self.config,
            api_results=[],
            agent_results=[],
            database_results=[],
            federated_learning_results=[],
            jmeter_results=None,
            system_metrics={},
            capacity_recommendations={},
            performance_summary={},
            alerts=[],
            passed_tests=0,
            failed_tests=0,
            total_tests=0
        )
    
    def _load_configuration(self, config_file: str) -> TestConfiguration:
        """Load test configuration from file or use defaults"""
        if config_file and Path(config_file).exists():
            with open(config_file, 'r') as f:
                config_data = yaml.safe_load(f)
        else:
            # Default configuration
            config_data = {
                'name': 'TrustStram v4.4 Comprehensive Load Test',
                'description': 'Complete load and stress testing suite for TrustStram v4.4',
                'base_url': 'http://localhost:3000',
                'auth_token': None,
                'duration_seconds': 1800,  # 30 minutes
                'max_concurrent_users': 500,
                'ramp_up_seconds': 300,  # 5 minutes
                'scenarios': {
                    'api_endpoints': {
                        'health_check': {'users': 50, 'duration': 300},
                        'status_check': {'users': 100, 'duration': 600},
                        'features': {'users': 75, 'duration': 400},
                        'metrics': {'users': 80, 'duration': 500}
                    },
                    'ai_agents': {
                        'concurrent_requests': 100,
                        'duration': 900,
                        'stress_test': True
                    },
                    'federated_learning': {
                        'cross_device': {'clients': 1000, 'rounds': 10},
                        'cross_silo': {'silos': 50, 'rounds': 20},
                        'massive_scale': {'clients': 10000}
                    },
                    'database': {
                        'connection_string': 'postgresql://localhost:5432/trustram',
                        'pool_size': 100,
                        'concurrent_connections': 200
                    }
                },
                'thresholds': {
                    'max_response_time': 5.0,  # seconds
                    'max_error_rate': 5.0,  # percentage
                    'min_throughput': 100.0,  # requests/second
                    'max_cpu_usage': 80.0,  # percentage
                    'max_memory_usage': 85.0  # percentage
                }
            }
        
        return TestConfiguration(**config_data)
    
    async def run_api_endpoint_tests(self) -> List[LoadTestResult]:
        """Run comprehensive API endpoint load tests"""
        logger.info("Starting API endpoint load tests")
        results = []
        
        api_scenarios = self.config.scenarios.get('api_endpoints', {})
        
        # Test core API endpoints
        endpoints_to_test = [
            {'path': '/health', 'method': 'GET', 'name': 'health_check'},
            {'path': '/status', 'method': 'GET', 'name': 'status_check'},
            {'path': '/features', 'method': 'GET', 'name': 'features'},
            {'path': '/metrics', 'method': 'GET', 'name': 'metrics'}
        ]
        
        # Run tests in parallel
        tasks = []
        for endpoint in endpoints_to_test:
            scenario_config = api_scenarios.get(endpoint['name'], {'users': 50, 'duration': 300})
            task = self.api_tester.load_test_endpoint(
                endpoint['path'],
                method=endpoint['method'],
                concurrent_users=scenario_config['users'],
                duration_seconds=scenario_config['duration']
            )
            tasks.append(task)
        
        results = await asyncio.gather(*tasks)
        
        logger.info(f"Completed {len(results)} API endpoint tests")
        return results
    
    async def run_ai_agent_tests(self) -> List[LoadTestResult]:
        """Run AI agent stress tests"""
        logger.info("Starting AI agent load tests")
        
        agent_config = self.config.scenarios.get('ai_agents', {})
        
        result = await self.agent_tester.stress_test_agents(
            concurrent_requests=agent_config.get('concurrent_requests', 100),
            duration_seconds=agent_config.get('duration', 900)
        )
        
        logger.info("Completed AI agent stress test")
        return [result]
    
    async def run_database_tests(self) -> List[LoadTestResult]:
        """Run database connection and performance tests"""
        logger.info("Starting database load tests")
        
        db_config = self.config.scenarios.get('database', {})
        
        result = await self.db_tester.test_connection_pool(
            concurrent_connections=db_config.get('concurrent_connections', 200),
            duration_seconds=600
        )
        
        logger.info("Completed database load test")
        return [result]
    
    async def run_federated_learning_tests(self) -> List[FLLoadTestResult]:
        """Run federated learning load tests"""
        logger.info("Starting federated learning load tests")
        results = []
        
        fl_config = self.config.scenarios.get('federated_learning', {})
        
        # Cross-device scenario
        if 'cross_device' in fl_config:
            cd_config = fl_config['cross_device']
            result = await self.fl_tester.load_test_cross_device_scenario(
                num_clients=cd_config.get('clients', 1000),
                num_rounds=cd_config.get('rounds', 10)
            )
            results.append(result)
        
        # Cross-silo scenario
        if 'cross_silo' in fl_config:
            cs_config = fl_config['cross_silo']
            result = await self.fl_tester.load_test_cross_silo_scenario(
                num_silos=cs_config.get('silos', 50),
                num_rounds=cs_config.get('rounds', 20)
            )
            results.append(result)
        
        # Massive scale stress test
        if 'massive_scale' in fl_config:
            ms_config = fl_config['massive_scale']
            result = await self.fl_tester.stress_test_massive_scale(
                num_clients=ms_config.get('clients', 10000)
            )
            results.append(result)
        
        logger.info(f"Completed {len(results)} federated learning tests")
        return results
    
    def run_jmeter_tests(self) -> Optional[Dict[str, Any]]:
        """Run JMeter load tests"""
        logger.info("Starting JMeter load tests")
        
        jmeter_script = "tests/load_stress_testing/trustram_v44_load_test.jmx"
        results_file = "tests/load_stress_testing/jmeter_results.jtl"
        
        try:
            # Build JMeter command
            cmd = [
                'jmeter',
                '-n',  # Non-GUI mode
                '-t', jmeter_script,  # Test plan
                '-l', results_file,  # Results file
                '-Jbase_url=' + self.config.base_url,
                '-Jauth_token=' + (self.config.auth_token or ''),
                '-Jramp_up=' + str(self.config.ramp_up_seconds),
                '-Jduration=' + str(self.config.duration_seconds)
            ]
            
            logger.info(f"Running JMeter command: {' '.join(cmd)}")
            
            # Run JMeter
            process = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)
            
            if process.returncode == 0:
                # Parse JMeter results
                return self._parse_jmeter_results(results_file)
            else:
                logger.error(f"JMeter failed: {process.stderr}")
                return None
                
        except subprocess.TimeoutExpired:
            logger.error("JMeter test timed out")
            return None
        except FileNotFoundError:
            logger.warning("JMeter not found in PATH, skipping JMeter tests")
            return None
        except Exception as e:
            logger.error(f"JMeter test error: {e}")
            return None
    
    def _parse_jmeter_results(self, results_file: str) -> Dict[str, Any]:
        """Parse JMeter results file"""
        try:
            results = {
                'total_samples': 0,
                'successful_samples': 0,
                'failed_samples': 0,
                'average_response_time': 0,
                'min_response_time': float('inf'),
                'max_response_time': 0,
                'throughput': 0,
                'error_rate': 0,
                'response_times': [],
                'endpoints': {}
            }
            
            with open(results_file, 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    results['total_samples'] += 1
                    
                    success = row.get('success', 'true').lower() == 'true'
                    if success:
                        results['successful_samples'] += 1
                    else:
                        results['failed_samples'] += 1
                    
                    elapsed = int(row.get('elapsed', 0))
                    results['response_times'].append(elapsed)
                    results['min_response_time'] = min(results['min_response_time'], elapsed)
                    results['max_response_time'] = max(results['max_response_time'], elapsed)
                    
                    # Track by endpoint
                    label = row.get('label', 'unknown')
                    if label not in results['endpoints']:
                        results['endpoints'][label] = {
                            'samples': 0,
                            'successful': 0,
                            'failed': 0,
                            'avg_response_time': 0,
                            'response_times': []
                        }
                    
                    results['endpoints'][label]['samples'] += 1
                    results['endpoints'][label]['response_times'].append(elapsed)
                    if success:
                        results['endpoints'][label]['successful'] += 1
                    else:
                        results['endpoints'][label]['failed'] += 1
            
            # Calculate averages
            if results['response_times']:
                results['average_response_time'] = statistics.mean(results['response_times'])
            
            for endpoint in results['endpoints'].values():
                if endpoint['response_times']:
                    endpoint['avg_response_time'] = statistics.mean(endpoint['response_times'])
            
            results['error_rate'] = (results['failed_samples'] / results['total_samples']) * 100 if results['total_samples'] > 0 else 0
            
            return results
            
        except Exception as e:
            logger.error(f"Error parsing JMeter results: {e}")
            return {}
    
    def analyze_performance_and_capacity(self) -> Dict[str, Any]:
        """Analyze test results and generate capacity recommendations"""
        logger.info("Analyzing performance and generating capacity recommendations")
        
        analysis = {
            'performance_summary': {},
            'capacity_recommendations': {},
            'scaling_analysis': {},
            'bottleneck_identification': {},
            'cost_optimization': {},
            'sla_compliance': {}
        }
        
        # Analyze API performance
        if self.all_results.api_results:
            api_analysis = self._analyze_api_performance(self.all_results.api_results)
            analysis['performance_summary']['api'] = api_analysis
        
        # Analyze AI Agent performance
        if self.all_results.agent_results:
            agent_analysis = self._analyze_agent_performance(self.all_results.agent_results)
            analysis['performance_summary']['agents'] = agent_analysis
        
        # Analyze Federated Learning performance
        if self.all_results.federated_learning_results:
            fl_analysis = self._analyze_fl_performance(self.all_results.federated_learning_results)
            analysis['performance_summary']['federated_learning'] = fl_analysis
        
        # Generate capacity recommendations
        analysis['capacity_recommendations'] = self._generate_capacity_recommendations()
        
        # Identify bottlenecks
        analysis['bottleneck_identification'] = self._identify_bottlenecks()
        
        # SLA compliance analysis
        analysis['sla_compliance'] = self._analyze_sla_compliance()
        
        return analysis
    
    def _analyze_api_performance(self, results: List[LoadTestResult]) -> Dict[str, Any]:
        """Analyze API performance results"""
        total_requests = sum(r.total_requests for r in results)
        successful_requests = sum(r.successful_requests for r in results)
        avg_response_time = statistics.mean([r.average_response_time for r in results])
        max_response_time = max([r.max_response_time for r in results])
        avg_rps = statistics.mean([r.requests_per_second for r in results])
        avg_error_rate = statistics.mean([r.error_rate for r in results])
        
        return {
            'total_requests': total_requests,
            'successful_requests': successful_requests,
            'success_rate': (successful_requests / total_requests * 100) if total_requests > 0 else 0,
            'average_response_time': avg_response_time,
            'max_response_time': max_response_time,
            'average_rps': avg_rps,
            'peak_rps': max([r.requests_per_second for r in results]),
            'average_error_rate': avg_error_rate,
            'endpoints_tested': len(results),
            'performance_grade': self._calculate_performance_grade(avg_response_time, avg_error_rate, avg_rps)
        }
    
    def _analyze_agent_performance(self, results: List[LoadTestResult]) -> Dict[str, Any]:
        """Analyze AI agent performance results"""
        if not results:
            return {}
        
        result = results[0]  # Single agent stress test result
        
        return {
            'total_agent_requests': result.total_requests,
            'successful_requests': result.successful_requests,
            'agent_success_rate': (result.successful_requests / result.total_requests * 100) if result.total_requests > 0 else 0,
            'average_response_time': result.average_response_time,
            'max_response_time': result.max_response_time,
            'requests_per_second': result.requests_per_second,
            'error_rate': result.error_rate,
            'agent_distribution': result.custom_metrics.get('agent_distribution', {}),
            'performance_grade': self._calculate_performance_grade(result.average_response_time, result.error_rate, result.requests_per_second)
        }
    
    def _analyze_fl_performance(self, results: List[FLLoadTestResult]) -> Dict[str, Any]:
        """Analyze federated learning performance results"""
        total_clients = sum(r.total_clients for r in results)
        total_rounds = sum(r.completed_rounds for r in results)
        avg_round_time = statistics.mean([r.average_round_time for r in results if r.average_round_time > 0])
        convergence_rate = sum(1 for r in results if r.convergence_achieved) / len(results) * 100
        avg_communication_overhead = statistics.mean([r.communication_overhead_mb for r in results])
        avg_dropout_rate = statistics.mean([r.client_dropout_rate for r in results])
        
        return {
            'total_clients_tested': total_clients,
            'total_rounds_completed': total_rounds,
            'average_round_time': avg_round_time,
            'convergence_achievement_rate': convergence_rate,
            'average_communication_overhead_mb': avg_communication_overhead,
            'average_client_dropout_rate': avg_dropout_rate,
            'scenarios_tested': len(results),
            'scalability_score': self._calculate_fl_scalability_score(results)
        }
    
    def _calculate_performance_grade(self, response_time: float, error_rate: float, rps: float) -> str:
        """Calculate performance grade based on metrics"""
        score = 0
        
        # Response time scoring (40% weight)
        if response_time < 0.1:
            score += 40
        elif response_time < 0.5:
            score += 35
        elif response_time < 1.0:
            score += 30
        elif response_time < 2.0:
            score += 20
        elif response_time < 5.0:
            score += 10
        
        # Error rate scoring (35% weight)
        if error_rate < 0.1:
            score += 35
        elif error_rate < 1.0:
            score += 30
        elif error_rate < 2.0:
            score += 25
        elif error_rate < 5.0:
            score += 15
        elif error_rate < 10.0:
            score += 5
        
        # RPS scoring (25% weight)
        if rps > 1000:
            score += 25
        elif rps > 500:
            score += 20
        elif rps > 200:
            score += 15
        elif rps > 100:
            score += 10
        elif rps > 50:
            score += 5
        
        # Convert to letter grade
        if score >= 90:
            return "A+"
        elif score >= 85:
            return "A"
        elif score >= 80:
            return "A-"
        elif score >= 75:
            return "B+"
        elif score >= 70:
            return "B"
        elif score >= 65:
            return "B-"
        elif score >= 60:
            return "C+"
        elif score >= 55:
            return "C"
        elif score >= 50:
            return "C-"
        else:
            return "F"
    
    def _calculate_fl_scalability_score(self, results: List[FLLoadTestResult]) -> float:
        """Calculate federated learning scalability score"""
        if not results:
            return 0.0
        
        score = 0.0
        total_weight = 0.0
        
        for result in results:
            weight = result.total_clients / 1000  # Weight by scale
            
            # Convergence achievement (40%)
            if result.convergence_achieved:
                score += weight * 40
            
            # Completion rate (30%)
            completion_rate = result.completed_rounds / result.total_rounds if result.total_rounds > 0 else 0
            score += weight * 30 * completion_rate
            
            # Communication efficiency (20%)
            if result.communication_overhead_mb > 0:
                efficiency = min(1.0, 1000 / result.communication_overhead_mb)  # Inverse relationship
                score += weight * 20 * efficiency
            
            # Client retention (10%)
            retention_rate = (100 - result.client_dropout_rate) / 100
            score += weight * 10 * retention_rate
            
            total_weight += weight
        
        return score / total_weight if total_weight > 0 else 0.0
    
    def _generate_capacity_recommendations(self) -> Dict[str, Any]:
        """Generate capacity and scaling recommendations"""
        recommendations = {
            'api_gateway': {},
            'ai_agents': {},
            'database': {},
            'federated_learning': {},
            'infrastructure': {},
            'estimated_costs': {}
        }
        
        # API Gateway recommendations
        if self.all_results.api_results:
            api_peak_rps = max([r.requests_per_second for r in self.all_results.api_results])
            api_avg_response_time = statistics.mean([r.average_response_time for r in self.all_results.api_results])
            
            recommendations['api_gateway'] = {
                'current_peak_rps': api_peak_rps,
                'recommended_instances': max(2, int(api_peak_rps / 500)),  # 500 RPS per instance
                'auto_scaling_trigger': api_peak_rps * 0.8,
                'load_balancer_required': api_peak_rps > 1000,
                'cdn_recommended': api_avg_response_time > 0.5,
                'caching_strategy': 'Redis cluster' if api_peak_rps > 2000 else 'Single Redis instance'
            }
        
        # AI Agents recommendations
        if self.all_results.agent_results:
            agent_result = self.all_results.agent_results[0]
            
            recommendations['ai_agents'] = {
                'current_agent_rps': agent_result.requests_per_second,
                'recommended_agent_instances': max(1, int(agent_result.requests_per_second / 50)),  # 50 RPS per agent
                'gpu_acceleration_recommended': agent_result.average_response_time > 2.0,
                'memory_optimization_required': agent_result.average_response_time > 1.0,
                'queue_system_recommended': agent_result.error_rate > 5.0
            }
        
        # Database recommendations
        if self.all_results.database_results:
            db_result = self.all_results.database_results[0]
            
            recommendations['database'] = {
                'connection_pool_size': max(100, int(db_result.requests_per_second * 2)),
                'read_replicas_recommended': db_result.requests_per_second > 500,
                'sharding_consideration': db_result.requests_per_second > 2000,
                'backup_strategy': 'Continuous' if db_result.requests_per_second > 1000 else 'Hourly',
                'monitoring_enhanced': db_result.average_response_time > 0.1
            }
        
        # Federated Learning recommendations
        if self.all_results.federated_learning_results:
            fl_total_clients = sum(r.total_clients for r in self.all_results.federated_learning_results)
            
            recommendations['federated_learning'] = {
                'aggregation_servers': max(1, int(fl_total_clients / 5000)),
                'bandwidth_requirements_gbps': fl_total_clients / 1000,  # Rough estimate
                'storage_requirements_tb': fl_total_clients / 100000,  # Model storage
                'geographic_distribution': fl_total_clients > 10000,
                'edge_computing_recommended': fl_total_clients > 50000
            }
        
        return recommendations
    
    def _identify_bottlenecks(self) -> Dict[str, Any]:
        """Identify system bottlenecks"""
        bottlenecks = {
            'critical': [],
            'warning': [],
            'information': []
        }
        
        # Check API response times
        if self.all_results.api_results:
            avg_response_time = statistics.mean([r.average_response_time for r in self.all_results.api_results])
            if avg_response_time > self.config.thresholds['max_response_time']:
                bottlenecks['critical'].append({
                    'component': 'API Gateway',
                    'issue': f'Average response time {avg_response_time:.2f}s exceeds threshold {self.config.thresholds["max_response_time"]}s',
                    'recommendation': 'Scale API gateway instances, implement caching, optimize database queries'
                })
        
        # Check error rates
        all_error_rates = []
        if self.all_results.api_results:
            all_error_rates.extend([r.error_rate for r in self.all_results.api_results])
        if self.all_results.agent_results:
            all_error_rates.extend([r.error_rate for r in self.all_results.agent_results])
        
        if all_error_rates:
            avg_error_rate = statistics.mean(all_error_rates)
            if avg_error_rate > self.config.thresholds['max_error_rate']:
                bottlenecks['critical'].append({
                    'component': 'System Wide',
                    'issue': f'Average error rate {avg_error_rate:.2f}% exceeds threshold {self.config.thresholds["max_error_rate"]}%',
                    'recommendation': 'Investigate error causes, implement circuit breakers, improve error handling'
                })
        
        # Check system resources
        system_metrics = self.all_results.system_metrics
        if system_metrics.get('max_cpu', 0) > self.config.thresholds['max_cpu_usage']:
            bottlenecks['warning'].append({
                'component': 'System Resources',
                'issue': f'Peak CPU usage {system_metrics["max_cpu"]:.1f}% exceeds threshold {self.config.thresholds["max_cpu_usage"]}%',
                'recommendation': 'Scale compute resources, optimize CPU-intensive operations'
            })
        
        return bottlenecks
    
    def _analyze_sla_compliance(self) -> Dict[str, Any]:
        """Analyze SLA compliance"""
        sla_targets = {
            'availability': 99.9,  # 99.9% uptime
            'response_time_95th': 2.0,  # 95th percentile < 2s
            'error_rate': 1.0,  # < 1% error rate
            'throughput': 1000  # > 1000 RPS
        }
        
        compliance = {}
        
        # Calculate actual metrics
        if self.all_results.api_results:
            total_requests = sum(r.total_requests for r in self.all_results.api_results)
            successful_requests = sum(r.successful_requests for r in self.all_results.api_results)
            availability = (successful_requests / total_requests * 100) if total_requests > 0 else 0
            
            avg_p95 = statistics.mean([r.p95_response_time for r in self.all_results.api_results])
            avg_error_rate = statistics.mean([r.error_rate for r in self.all_results.api_results])
            peak_throughput = max([r.requests_per_second for r in self.all_results.api_results])
            
            compliance = {
                'availability': {
                    'target': sla_targets['availability'],
                    'actual': availability,
                    'compliant': availability >= sla_targets['availability']
                },
                'response_time_95th': {
                    'target': sla_targets['response_time_95th'],
                    'actual': avg_p95,
                    'compliant': avg_p95 <= sla_targets['response_time_95th']
                },
                'error_rate': {
                    'target': sla_targets['error_rate'],
                    'actual': avg_error_rate,
                    'compliant': avg_error_rate <= sla_targets['error_rate']
                },
                'throughput': {
                    'target': sla_targets['throughput'],
                    'actual': peak_throughput,
                    'compliant': peak_throughput >= sla_targets['throughput']
                }
            }
        
        # Calculate overall compliance score
        compliant_count = sum(1 for metric in compliance.values() if metric['compliant'])
        compliance['overall_score'] = (compliant_count / len(compliance) * 100) if compliance else 0
        compliance['overall_compliant'] = compliance['overall_score'] >= 75  # 75% of SLAs must be met
        
        return compliance
    
    async def run_comprehensive_load_test(self) -> ComprehensiveTestResults:
        """Run comprehensive load testing across all components"""
        logger.info(f"Starting comprehensive load test session: {self.test_session_id}")
        
        self.all_results.start_time = datetime.now()
        
        try:
            # Start system monitoring
            self.system_monitor.start_monitoring()
            
            # Run all test suites in parallel where possible
            logger.info("Running parallel test suites...")
            
            # Create tasks for parallel execution
            tasks = [
                self.run_api_endpoint_tests(),
                self.run_ai_agent_tests(),
                self.run_database_tests(),
                self.run_federated_learning_tests()
            ]
            
            # Wait for all async tests to complete
            api_results, agent_results, db_results, fl_results = await asyncio.gather(*tasks)
            
            # Store results
            self.all_results.api_results = api_results
            self.all_results.agent_results = agent_results
            self.all_results.database_results = db_results
            self.all_results.federated_learning_results = fl_results
            
            # Run JMeter tests (sequential)
            logger.info("Running JMeter tests...")
            self.all_results.jmeter_results = self.run_jmeter_tests()
            
            # Stop monitoring and collect metrics
            self.system_monitor.stop_monitoring()
            self.all_results.system_metrics = self.system_monitor.get_averages()
            
            # Analyze results
            logger.info("Analyzing results and generating recommendations...")
            analysis = self.analyze_performance_and_capacity()
            self.all_results.capacity_recommendations = analysis['capacity_recommendations']
            self.all_results.performance_summary = analysis['performance_summary']
            
            # Calculate test statistics
            total_tests = len(api_results) + len(agent_results) + len(db_results) + len(fl_results)
            passed_tests = sum(1 for r in api_results + agent_results + db_results if r.error_rate < 10.0)
            passed_tests += sum(1 for r in fl_results if r.aggregation_success_rate > 80.0)
            
            self.all_results.total_tests = total_tests
            self.all_results.passed_tests = passed_tests
            self.all_results.failed_tests = total_tests - passed_tests
            
            # Identify issues and alerts
            bottlenecks = analysis['bottleneck_identification']
            self.all_results.alerts = (
                bottlenecks.get('critical', []) + 
                bottlenecks.get('warning', [])
            )
            
        except Exception as e:
            logger.error(f"Test execution error: {e}")
            self.all_results.alerts.append(f"Test execution error: {str(e)}")
        finally:
            self.all_results.end_time = datetime.now()
            # Ensure monitoring is stopped
            if self.system_monitor.monitoring:
                self.system_monitor.stop_monitoring()
        
        # Save results
        await self.save_results()
        
        logger.info(f"Comprehensive load test completed. Session: {self.test_session_id}")
        return self.all_results
    
    async def save_results(self):
        """Save test results to files"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save JSON results
        json_file = self.results_dir / f"load_test_results_{timestamp}.json"
        with open(json_file, 'w') as f:
            json.dump(asdict(self.all_results), f, indent=2, default=str)
        
        # Generate and save markdown report
        report_file = self.results_dir / f"load_test_report_{timestamp}.md"
        await self.generate_markdown_report(report_file)
        
        # Generate plots
        await self.generate_performance_plots(timestamp)
        
        logger.info(f"Results saved to {self.results_dir}")
    
    async def generate_markdown_report(self, output_file: Path):
        """Generate comprehensive markdown report"""
        template_content = '''
# TrustStram v4.4 Load & Stress Testing Report

**Test Session ID:** {{ results.test_session_id }}  
**Test Date:** {{ results.start_time.strftime("%Y-%m-%d %H:%M:%S") }}  
**Duration:** {{ "%.2f"|format((results.end_time - results.start_time).total_seconds() / 60) }} minutes  
**Configuration:** {{ results.configuration.name }}  

## Executive Summary

{% set total_requests = (results.api_results|sum(attribute='total_requests') or 0) + (results.agent_results|sum(attribute='total_requests') or 0) %}
{% set successful_requests = (results.api_results|sum(attribute='successful_requests') or 0) + (results.agent_results|sum(attribute='successful_requests') or 0) %}
{% set overall_success_rate = (successful_requests / total_requests * 100) if total_requests > 0 else 0 %}

- **Total Tests Executed:** {{ results.total_tests }}
- **Tests Passed:** {{ results.passed_tests }} ({{ "%.1f"|format(results.passed_tests / results.total_tests * 100) }}%)
- **Tests Failed:** {{ results.failed_tests }}
- **Total Requests:** {{ total_requests:,d }}
- **Overall Success Rate:** {{ "%.2f"|format(overall_success_rate) }}%
- **Peak System CPU:** {{ "%.1f"|format(results.system_metrics.get('max_cpu', 0)) }}%
- **Peak System Memory:** {{ "%.1f"|format(results.system_metrics.get('max_memory', 0)) }}%

{% if results.alerts %}
### 🚨 Critical Alerts
{% for alert in results.alerts[:5] %}
- **{{ alert.component if alert.component is defined else 'System' }}:** {{ alert.issue if alert.issue is defined else alert }}
{% endfor %}
{% endif %}

## Test Results Summary

### API Gateway Performance
{% if results.performance_summary.api %}
{% set api = results.performance_summary.api %}
- **Total Requests:** {{ api.total_requests:,d }}
- **Success Rate:** {{ "%.2f"|format(api.success_rate) }}%
- **Average Response Time:** {{ "%.3f"|format(api.average_response_time) }}s
- **Peak Throughput:** {{ "%.0f"|format(api.peak_rps) }} RPS
- **Performance Grade:** {{ api.performance_grade }}
{% else %}
*No API tests were executed.*
{% endif %}

### AI Agents Performance
{% if results.performance_summary.agents %}
{% set agents = results.performance_summary.agents %}
- **Total Agent Requests:** {{ agents.total_agent_requests:,d }}
- **Agent Success Rate:** {{ "%.2f"|format(agents.agent_success_rate) }}%
- **Average Response Time:** {{ "%.3f"|format(agents.average_response_time) }}s
- **Requests per Second:** {{ "%.0f"|format(agents.requests_per_second) }}
- **Performance Grade:** {{ agents.performance_grade }}
{% else %}
*No AI agent tests were executed.*
{% endif %}

### Federated Learning Performance
{% if results.performance_summary.federated_learning %}
{% set fl = results.performance_summary.federated_learning %}
- **Total Clients Tested:** {{ fl.total_clients_tested:,d }}
- **Convergence Rate:** {{ "%.1f"|format(fl.convergence_achievement_rate) }}%
- **Average Round Time:** {{ "%.2f"|format(fl.average_round_time) }}s
- **Communication Overhead:** {{ "%.1f"|format(fl.average_communication_overhead_mb) }} MB
- **Scalability Score:** {{ "%.1f"|format(fl.scalability_score) }}/100
{% else %}
*No federated learning tests were executed.*
{% endif %}

## Detailed Test Results

### API Endpoint Tests
{% for result in results.api_results %}
#### {{ result.test_name }}
- **Duration:** {{ "%.1f"|format((result.end_time - result.start_time).total_seconds()) }}s
- **Total Requests:** {{ result.total_requests:,d }}
- **Success Rate:** {{ "%.2f"|format((result.successful_requests / result.total_requests * 100) if result.total_requests > 0 else 0) }}%
- **Average Response Time:** {{ "%.3f"|format(result.average_response_time) }}s
- **95th Percentile:** {{ "%.3f"|format(result.p95_response_time) }}s
- **Throughput:** {{ "%.0f"|format(result.requests_per_second) }} RPS
- **Error Rate:** {{ "%.2f"|format(result.error_rate) }}%

{% endfor %}

### Federated Learning Tests
{% for result in results.federated_learning_results %}
#### {{ result.test_name }}
- **Scenario:** {{ result.scenario_type }}
- **Duration:** {{ "%.1f"|format((result.end_time - result.start_time).total_seconds() / 60) }} minutes
- **Total Clients:** {{ result.total_clients:,d }}
- **Active Clients:** {{ result.active_clients:,d }}
- **Completed Rounds:** {{ result.completed_rounds }}/{{ result.total_rounds }}
- **Convergence Achieved:** {{ "Yes" if result.convergence_achieved else "No" }}
- **Average Round Time:** {{ "%.2f"|format(result.average_round_time) }}s
- **Communication Overhead:** {{ "%.1f"|format(result.communication_overhead_mb) }} MB
- **Client Dropout Rate:** {{ "%.2f"|format(result.client_dropout_rate) }}%

{% endfor %}

## Capacity Recommendations

### Infrastructure Scaling
{% if results.capacity_recommendations.api_gateway %}
{% set api_rec = results.capacity_recommendations.api_gateway %}
#### API Gateway
- **Recommended Instances:** {{ api_rec.recommended_instances }}
- **Auto-scaling Trigger:** {{ "%.0f"|format(api_rec.auto_scaling_trigger) }} RPS
- **Load Balancer Required:** {{ "Yes" if api_rec.load_balancer_required else "No" }}
- **CDN Recommended:** {{ "Yes" if api_rec.cdn_recommended else "No" }}
- **Caching Strategy:** {{ api_rec.caching_strategy }}
{% endif %}

{% if results.capacity_recommendations.ai_agents %}
{% set agent_rec = results.capacity_recommendations.ai_agents %}
#### AI Agents
- **Recommended Agent Instances:** {{ agent_rec.recommended_agent_instances }}
- **GPU Acceleration:** {{ "Recommended" if agent_rec.gpu_acceleration_recommended else "Not Required" }}
- **Memory Optimization:** {{ "Required" if agent_rec.memory_optimization_required else "Not Required" }}
- **Queue System:** {{ "Recommended" if agent_rec.queue_system_recommended else "Not Required" }}
{% endif %}

{% if results.capacity_recommendations.database %}
{% set db_rec = results.capacity_recommendations.database %}
#### Database
- **Connection Pool Size:** {{ db_rec.connection_pool_size }}
- **Read Replicas:** {{ "Recommended" if db_rec.read_replicas_recommended else "Not Required" }}
- **Sharding Consideration:** {{ "Required" if db_rec.sharding_consideration else "Not Required" }}
- **Backup Strategy:** {{ db_rec.backup_strategy }}
{% endif %}

{% if results.capacity_recommendations.federated_learning %}
{% set fl_rec = results.capacity_recommendations.federated_learning %}
#### Federated Learning
- **Aggregation Servers:** {{ fl_rec.aggregation_servers }}
- **Bandwidth Requirements:** {{ "%.1f"|format(fl_rec.bandwidth_requirements_gbps) }} Gbps
- **Storage Requirements:** {{ "%.1f"|format(fl_rec.storage_requirements_tb) }} TB
- **Geographic Distribution:** {{ "Required" if fl_rec.geographic_distribution else "Not Required" }}
- **Edge Computing:** {{ "Recommended" if fl_rec.edge_computing_recommended else "Not Required" }}
{% endif %}

## Performance Analysis

### Bottleneck Identification
{% if results.alerts %}
{% for alert in results.alerts %}
- **Component:** {{ alert.component if alert.component is defined else 'Unknown' }}
- **Issue:** {{ alert.issue if alert.issue is defined else alert }}
- **Recommendation:** {{ alert.recommendation if alert.recommendation is defined else 'See detailed analysis' }}

{% endfor %}
{% else %}
*No critical bottlenecks identified.*
{% endif %}

### System Resource Utilization
- **Average CPU Usage:** {{ "%.1f"|format(results.system_metrics.get('avg_cpu', 0)) }}%
- **Peak CPU Usage:** {{ "%.1f"|format(results.system_metrics.get('max_cpu', 0)) }}%
- **Average Memory Usage:** {{ "%.1f"|format(results.system_metrics.get('avg_memory', 0)) }}%
- **Peak Memory Usage:** {{ "%.1f"|format(results.system_metrics.get('max_memory', 0)) }}%
- **Sample Count:** {{ results.system_metrics.get('sample_count', 0) }}

## Conclusions and Next Steps

### Performance Summary
{% if results.passed_tests / results.total_tests > 0.8 %}
✅ **Overall Assessment:** The system demonstrates good performance under load with {{ "%.1f"|format(results.passed_tests / results.total_tests * 100) }}% of tests passing.
{% elif results.passed_tests / results.total_tests > 0.6 %}
⚠️ **Overall Assessment:** The system shows acceptable performance but has areas for improvement with {{ "%.1f"|format(results.passed_tests / results.total_tests * 100) }}% of tests passing.
{% else %}
❌ **Overall Assessment:** The system requires significant optimization with only {{ "%.1f"|format(results.passed_tests / results.total_tests * 100) }}% of tests passing.
{% endif %}

### Recommended Actions
1. **Immediate:** Address critical bottlenecks identified in the analysis
2. **Short-term:** Implement recommended infrastructure scaling
3. **Medium-term:** Optimize components with poor performance grades
4. **Long-term:** Plan for future capacity based on growth projections

### Test Environment
- **Base URL:** {{ results.configuration.base_url }}
- **Max Concurrent Users:** {{ results.configuration.max_concurrent_users }}
- **Test Duration:** {{ results.configuration.duration_seconds }} seconds
- **Ramp-up Time:** {{ results.configuration.ramp_up_seconds }} seconds

---
*Report generated on {{ datetime.now().strftime("%Y-%m-%d %H:%M:%S") }} by TrustStram Load Testing Framework v4.4.0*
'''
        
        template = Template(template_content)
        
        # Make datetime available in template
        import datetime as dt
        
        report_content = template.render(
            results=self.all_results,
            datetime=dt
        )
        
        with open(output_file, 'w') as f:
            f.write(report_content)
        
        logger.info(f"Markdown report generated: {output_file}")
    
    async def generate_performance_plots(self, timestamp: str):
        """Generate performance visualization plots"""
        try:
            import matplotlib.pyplot as plt
            import matplotlib.dates as mdates
            
            # Set up the plotting style
            plt.style.use('default')
            fig, axes = plt.subplots(2, 2, figsize=(15, 10))
            fig.suptitle('TrustStram v4.4 Load Testing Performance Analysis', fontsize=16)
            
            # Plot 1: API Response Times
            if self.all_results.api_results:
                ax1 = axes[0, 0]
                endpoints = [r.test_name.replace('GET ', '').replace('POST ', '') for r in self.all_results.api_results]
                response_times = [r.average_response_time for r in self.all_results.api_results]
                
                bars = ax1.bar(range(len(endpoints)), response_times, color='skyblue')
                ax1.set_title('API Endpoint Response Times')
                ax1.set_xlabel('Endpoints')
                ax1.set_ylabel('Response Time (seconds)')
                ax1.set_xticks(range(len(endpoints)))
                ax1.set_xticklabels(endpoints, rotation=45, ha='right')
                
                # Add value labels on bars
                for bar, value in zip(bars, response_times):
                    height = bar.get_height()
                    ax1.text(bar.get_x() + bar.get_width()/2., height + 0.01,
                            f'{value:.3f}s', ha='center', va='bottom')
            
            # Plot 2: Throughput Comparison
            if self.all_results.api_results:
                ax2 = axes[0, 1]
                endpoints = [r.test_name.replace('GET ', '').replace('POST ', '') for r in self.all_results.api_results]
                throughput = [r.requests_per_second for r in self.all_results.api_results]
                
                bars = ax2.bar(range(len(endpoints)), throughput, color='lightgreen')
                ax2.set_title('API Endpoint Throughput')
                ax2.set_xlabel('Endpoints')
                ax2.set_ylabel('Requests per Second')
                ax2.set_xticks(range(len(endpoints)))
                ax2.set_xticklabels(endpoints, rotation=45, ha='right')
                
                # Add value labels on bars
                for bar, value in zip(bars, throughput):
                    height = bar.get_height()
                    ax2.text(bar.get_x() + bar.get_width()/2., height + 1,
                            f'{value:.0f}', ha='center', va='bottom')
            
            # Plot 3: Error Rates
            if self.all_results.api_results:
                ax3 = axes[1, 0]
                endpoints = [r.test_name.replace('GET ', '').replace('POST ', '') for r in self.all_results.api_results]
                error_rates = [r.error_rate for r in self.all_results.api_results]
                
                colors = ['red' if er > 5 else 'orange' if er > 1 else 'green' for er in error_rates]
                bars = ax3.bar(range(len(endpoints)), error_rates, color=colors)
                ax3.set_title('API Endpoint Error Rates')
                ax3.set_xlabel('Endpoints')
                ax3.set_ylabel('Error Rate (%)')
                ax3.set_xticks(range(len(endpoints)))
                ax3.set_xticklabels(endpoints, rotation=45, ha='right')
                
                # Add value labels on bars
                for bar, value in zip(bars, error_rates):
                    height = bar.get_height()
                    ax3.text(bar.get_x() + bar.get_width()/2., height + 0.1,
                            f'{value:.1f}%', ha='center', va='bottom')
            
            # Plot 4: System Resource Usage
            ax4 = axes[1, 1]
            if self.all_results.system_metrics:
                categories = ['Avg CPU', 'Max CPU', 'Avg Memory', 'Max Memory']
                values = [
                    self.all_results.system_metrics.get('avg_cpu', 0),
                    self.all_results.system_metrics.get('max_cpu', 0),
                    self.all_results.system_metrics.get('avg_memory', 0),
                    self.all_results.system_metrics.get('max_memory', 0)
                ]
                
                colors = ['blue', 'red', 'green', 'orange']
                bars = ax4.bar(categories, values, color=colors)
                ax4.set_title('System Resource Usage')
                ax4.set_ylabel('Usage (%)')
                ax4.set_ylim(0, 100)
                
                # Add value labels on bars
                for bar, value in zip(bars, values):
                    height = bar.get_height()
                    ax4.text(bar.get_x() + bar.get_width()/2., height + 1,
                            f'{value:.1f}%', ha='center', va='bottom')
            
            plt.tight_layout()
            
            # Save the plot
            plot_file = self.results_dir / f"performance_plots_{timestamp}.png"
            plt.savefig(plot_file, dpi=300, bbox_inches='tight')
            plt.close()
            
            logger.info(f"Performance plots saved: {plot_file}")
            
        except ImportError:
            logger.warning("Matplotlib not available, skipping plot generation")
        except Exception as e:
            logger.error(f"Error generating plots: {e}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='TrustStram v4.4 Load Testing Orchestrator')
    parser.add_argument('--config', help='Configuration file path')
    parser.add_argument('--base-url', default='http://localhost:3000', help='Base URL for testing')
    parser.add_argument('--auth-token', help='Authentication token')
    parser.add_argument('--duration', type=int, default=1800, help='Test duration in seconds')
    parser.add_argument('--max-users', type=int, default=500, help='Maximum concurrent users')
    
    args = parser.parse_args()
    
    # Override config with command line arguments
    if not args.config:
        config_data = {
            'name': 'TrustStram v4.4 CLI Load Test',
            'description': 'Load test executed via command line',
            'base_url': args.base_url,
            'auth_token': args.auth_token,
            'duration_seconds': args.duration,
            'max_concurrent_users': args.max_users,
            'ramp_up_seconds': min(300, args.duration // 6),
            'scenarios': {
                'api_endpoints': {
                    'health_check': {'users': 50, 'duration': args.duration // 6},
                    'status_check': {'users': 100, 'duration': args.duration // 3},
                    'features': {'users': 75, 'duration': args.duration // 4},
                    'metrics': {'users': 80, 'duration': args.duration // 3}
                },
                'ai_agents': {
                    'concurrent_requests': min(100, args.max_users // 5),
                    'duration': args.duration // 2,
                    'stress_test': True
                },
                'federated_learning': {
                    'cross_device': {'clients': 500, 'rounds': 5},
                    'cross_silo': {'silos': 20, 'rounds': 10},
                    'massive_scale': {'clients': 5000}
                },
                'database': {
                    'connection_string': 'postgresql://localhost:5432/trustram',
                    'pool_size': 100,
                    'concurrent_connections': min(200, args.max_users)
                }
            },
            'thresholds': {
                'max_response_time': 5.0,
                'max_error_rate': 5.0,
                'min_throughput': 100.0,
                'max_cpu_usage': 80.0,
                'max_memory_usage': 85.0
            }
        }
        
        import tempfile
        import yaml
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            yaml.dump(config_data, f)
            temp_config = f.name
        
        args.config = temp_config
    
    async def main():
        orchestrator = TrustStramLoadTestOrchestrator(args.config)
        results = await orchestrator.run_comprehensive_load_test()
        
        print(f"\n{'='*80}")
        print("TRUSTSTRAM v4.4 LOAD TESTING RESULTS")
        print(f"{'='*80}")
        print(f"Test Session: {results.test_session_id}")
        print(f"Duration: {(results.end_time - results.start_time).total_seconds() / 60:.1f} minutes")
        print(f"Tests Passed: {results.passed_tests}/{results.total_tests} ({results.passed_tests/results.total_tests*100:.1f}%)")
        
        if results.alerts:
            print(f"\n⚠️  ALERTS ({len(results.alerts)}):")
            for alert in results.alerts[:3]:
                issue = alert.get('issue', str(alert)) if isinstance(alert, dict) else str(alert)
                print(f"  • {issue}")
        
        print(f"\n📊 Results saved to: tests/load_stress_testing/results/")
        print(f"📄 Report: load_test_report_*.md")
        print(f"📈 Data: load_test_results_*.json")
    
    asyncio.run(main())
