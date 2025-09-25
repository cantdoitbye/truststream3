#!/usr/bin/env python3
"""
TrustStram v4.4 Load & Stress Testing - Main Execution Script

This script executes the comprehensive load and stress testing suite for TrustStram v4.4,
including all components: API Gateway, AI Agents, Database, Federated Learning,
Auto-scaling, and Failover testing.

Usage:
    python run_comprehensive_tests.py [options]

Author: TrustStram Load Testing Team
Version: 4.4.0
Date: 2025-09-22
"""

import asyncio
import argparse
import json
import logging
import sys
import time
from datetime import datetime
from pathlib import Path

# Import our load testing modules
from test_orchestrator import TrustStramLoadTestOrchestrator
from auto_scaling_failover_tester import AutoScalingTester, FailoverTester
from load_testing_utils import LoadTestingUtils, ResultsAnalyzer

def setup_argument_parser() -> argparse.ArgumentParser:
    """Setup command line argument parser"""
    parser = argparse.ArgumentParser(
        description='TrustStram v4.4 Comprehensive Load & Stress Testing Suite',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Quick test (5 minutes)
  python run_comprehensive_tests.py --quick
  
  # Full enterprise test (1 hour)
  python run_comprehensive_tests.py --config load_test_config.yaml
  
  # Custom configuration
  python run_comprehensive_tests.py --base-url https://api.truststram.com --duration 3600 --max-users 1000
  
  # Specific test suites only
  python run_comprehensive_tests.py --tests api,agents --duration 1800
"""
    )
    
    # Basic configuration
    parser.add_argument('--config', '-c', 
                       help='Configuration file path (YAML)')
    parser.add_argument('--base-url', '-u', 
                       default='http://localhost:3000',
                       help='Base URL for TrustStram API (default: http://localhost:3000)')
    parser.add_argument('--auth-token', '-t',
                       help='Authentication token for API requests')
    
    # Test execution parameters
    parser.add_argument('--duration', '-d', type=int, default=1800,
                       help='Test duration in seconds (default: 1800)')
    parser.add_argument('--max-users', '-m', type=int, default=500,
                       help='Maximum concurrent users (default: 500)')
    parser.add_argument('--ramp-up', '-r', type=int, default=300,
                       help='Ramp-up time in seconds (default: 300)')
    
    # Test suite selection
    parser.add_argument('--tests', 
                       choices=['all', 'api', 'agents', 'database', 'federated', 'scaling', 'failover'],
                       nargs='+',
                       default=['all'],
                       help='Test suites to run (default: all)')
    
    # Test modes
    parser.add_argument('--quick', action='store_true',
                       help='Quick test mode (5 minutes, reduced load)')
    parser.add_argument('--stress', action='store_true',
                       help='Stress test mode (maximum load, longer duration)')
    parser.add_argument('--smoke', action='store_true',
                       help='Smoke test mode (basic functionality, 2 minutes)')
    
    # Output options
    parser.add_argument('--output-dir', '-o', default='tests/load_stress_testing/results',
                       help='Output directory for results')
    parser.add_argument('--report-format', choices=['markdown', 'json', 'html'], 
                       default='markdown',
                       help='Report format (default: markdown)')
    parser.add_argument('--no-plots', action='store_true',
                       help='Skip generating performance plots')
    
    # Logging and debugging
    parser.add_argument('--log-level', choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
                       default='INFO',
                       help='Logging level (default: INFO)')
    parser.add_argument('--log-file',
                       help='Log file path (default: console only)')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Verbose output')
    
    # Environment setup
    parser.add_argument('--setup', action='store_true',
                       help='Setup environment and install dependencies')
    parser.add_argument('--check-prereqs', action='store_true',
                       help='Check prerequisites and exit')
    
    return parser

async def run_comprehensive_testing(args) -> dict:
    """Run comprehensive load testing based on arguments"""
    logger = logging.getLogger(__name__)
    
    # Adjust parameters based on test mode
    if args.quick:
        args.duration = 300  # 5 minutes
        args.max_users = 100
        args.ramp_up = 60
        logger.info("Quick test mode: 5 minutes, 100 users")
    elif args.stress:
        args.duration = 7200  # 2 hours
        args.max_users = 2000
        args.ramp_up = 600
        logger.info("Stress test mode: 2 hours, 2000 users")
    elif args.smoke:
        args.duration = 120  # 2 minutes
        args.max_users = 20
        args.ramp_up = 30
        logger.info("Smoke test mode: 2 minutes, 20 users")
    
    # Create configuration if not provided
    if not args.config:
        config_data = {
            'name': f'TrustStram v4.4 Load Test - {datetime.now().strftime("%Y-%m-%d %H:%M")}',
            'description': f'Load test executed with {" ".join(sys.argv)}',
            'base_url': args.base_url,
            'auth_token': args.auth_token,
            'duration_seconds': args.duration,
            'max_concurrent_users': args.max_users,
            'ramp_up_seconds': args.ramp_up,
            'scenarios': {
                'api_endpoints': {
                    'health_check': {'users': max(10, args.max_users // 20), 'duration': args.duration // 6},
                    'status_check': {'users': max(20, args.max_users // 10), 'duration': args.duration // 3},
                    'features': {'users': max(15, args.max_users // 15), 'duration': args.duration // 4},
                    'metrics': {'users': max(16, args.max_users // 12), 'duration': args.duration // 3}
                },
                'ai_agents': {
                    'concurrent_requests': max(20, args.max_users // 5),
                    'duration': args.duration // 2,
                    'stress_test': True
                },
                'federated_learning': {
                    'cross_device': {'clients': max(100, args.max_users * 2), 'rounds': max(3, args.duration // 120)},
                    'cross_silo': {'silos': max(10, args.max_users // 10), 'rounds': max(5, args.duration // 120)},
                    'massive_scale': {'clients': max(1000, args.max_users * 10)}
                },
                'database': {
                    'connection_string': 'postgresql://localhost:5432/trustram',
                    'pool_size': 100,
                    'concurrent_connections': max(50, args.max_users)
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
        
        # Save temporary config
        import tempfile
        import yaml
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            yaml.dump(config_data, f)
            args.config = f.name
    
    # Initialize orchestrator
    orchestrator = TrustStramLoadTestOrchestrator(args.config)
    
    # Run selected tests
    all_results = {}
    
    if 'all' in args.tests or any(test in args.tests for test in ['api', 'agents', 'database', 'federated']):
        logger.info("Running core load testing suite...")
        core_results = await orchestrator.run_comprehensive_load_test()
        all_results['core_tests'] = core_results
    
    if 'all' in args.tests or 'scaling' in args.tests:
        logger.info("Running auto-scaling tests...")
        scaling_tester = AutoScalingTester(args.base_url, args.auth_token)
        scaling_result = await scaling_tester.test_load_based_auto_scaling(
            duration_minutes=max(10, args.duration // 180)
        )
        all_results['scaling_tests'] = scaling_result
    
    if 'all' in args.tests or 'failover' in args.tests:
        logger.info("Running failover tests...")
        failover_tester = FailoverTester(args.base_url, args.auth_token)
        
        failover_results = {
            'database_failover': await failover_tester.test_database_failover(),
            'api_gateway_failover': await failover_tester.test_api_gateway_failover(),
            'ai_agent_failover': await failover_tester.test_ai_agent_failover()
        }
        all_results['failover_tests'] = failover_results
    
    return all_results

def print_test_summary(results: dict):
    """Print a summary of test results"""
    print(f"\n{'='*80}")
    print("TRUSTSTRAM v4.4 COMPREHENSIVE LOAD TESTING RESULTS")
    print(f"{'='*80}")
    
    # Core tests summary
    if 'core_tests' in results:
        core = results['core_tests']
        print(f"\n📊 CORE LOAD TESTS")
        print(f"   Duration: {(core.end_time - core.start_time).total_seconds() / 60:.1f} minutes")
        print(f"   Tests Passed: {core.passed_tests}/{core.total_tests} ({core.passed_tests/core.total_tests*100:.1f}%)")
        
        if core.performance_summary:
            if 'api' in core.performance_summary:
                api = core.performance_summary['api']
                print(f"   API Performance: {api.get('performance_grade', 'N/A')} grade")
                print(f"   Peak Throughput: {api.get('peak_rps', 0):.0f} RPS")
            
            if 'agents' in core.performance_summary:
                agents = core.performance_summary['agents']
                print(f"   AI Agents: {agents.get('performance_grade', 'N/A')} grade")
                print(f"   Agent Success Rate: {agents.get('agent_success_rate', 0):.1f}%")
        
        if core.alerts:
            print(f"   ⚠️  Alerts: {len(core.alerts)} issues detected")
    
    # Scaling tests summary
    if 'scaling_tests' in results:
        scaling = results['scaling_tests']
        print(f"\n🔄 AUTO-SCALING TESTS")
        print(f"   Scaling Events: {len(scaling.scaling_events)}")
        print(f"   Scaling Effectiveness: {scaling.scaling_effectiveness:.1f}%")
        print(f"   Average Scaling Latency: {scaling.scaling_latency:.1f}s")
        if scaling.errors_during_scaling:
            print(f"   ⚠️  Scaling Errors: {len(scaling.errors_during_scaling)}")
    
    # Failover tests summary
    if 'failover_tests' in results:
        failover = results['failover_tests']
        print(f"\n🛡️  FAILOVER TESTS")
        
        for test_name, test_result in failover.items():
            availability_impact = test_result.availability_impact
            status = "✅ PASS" if availability_impact < 0.1 else "⚠️  WARNING" if availability_impact < 1.0 else "❌ FAIL"
            print(f"   {test_name}: {status}")
            print(f"     Failover Time: {test_result.failover_time:.1f}s")
            print(f"     Availability Impact: {availability_impact:.2f}%")
    
    print(f"\n📈 RECOMMENDATIONS")
    if 'core_tests' in results and results['core_tests'].capacity_recommendations:
        recs = results['core_tests'].capacity_recommendations
        
        if 'api_gateway' in recs:
            api_rec = recs['api_gateway']
            if api_rec.get('recommended_instances', 0) > 2:
                print(f"   • Scale API Gateway to {api_rec['recommended_instances']} instances")
            if api_rec.get('load_balancer_required'):
                print(f"   • Implement load balancer for high availability")
        
        if 'ai_agents' in recs:
            agent_rec = recs['ai_agents']
            if agent_rec.get('gpu_acceleration_recommended'):
                print(f"   • Consider GPU acceleration for AI agents")
            if agent_rec.get('queue_system_recommended'):
                print(f"   • Implement queue system for agent requests")
    
    print(f"\n💾 RESULTS SAVED TO:")
    print(f"   📄 Report: tests/load_stress_testing/results/load_test_report_*.md")
    print(f"   📊 Data: tests/load_stress_testing/results/load_test_results_*.json")
    if 'core_tests' in results:
        print(f"   📈 Charts: tests/load_stress_testing/results/performance_plots_*.png")
    
    print(f"\n{'='*80}")

async def main():
    """Main execution function"""
    parser = setup_argument_parser()
    args = parser.parse_args()
    
    # Setup logging
    utils = LoadTestingUtils()
    logger = utils.setup_logging(args.log_level, args.log_file)
    
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    logger.info("TrustStram v4.4 Load Testing Suite Starting...")
    
    # Check prerequisites
    if args.check_prereqs:
        prereqs = utils.check_prerequisites()
        print("\nPrerequisite Check:")
        for check, status in prereqs.items():
            print(f"  {check}: {'✅' if status else '❌'}")
        
        missing = [k for k, v in prereqs.items() if not v]
        if missing:
            print(f"\nMissing: {', '.join(missing)}")
            if args.setup:
                print("\nAttempting to install missing packages...")
                if utils.install_missing_packages():
                    print("✅ Installation successful")
                else:
                    print("❌ Installation failed")
            else:
                print("\nRun with --setup to install missing packages")
        return
    
    # Setup environment
    if args.setup:
        logger.info("Setting up environment...")
        utils.create_directory_structure()
        if utils.install_missing_packages():
            logger.info("Environment setup completed successfully")
        else:
            logger.error("Environment setup failed")
            return
    
    # Create output directory
    Path(args.output_dir).mkdir(parents=True, exist_ok=True)
    
    try:
        # Run tests
        start_time = time.time()
        logger.info(f"Starting comprehensive load testing with configuration:")
        logger.info(f"  Base URL: {args.base_url}")
        logger.info(f"  Duration: {args.duration}s")
        logger.info(f"  Max Users: {args.max_users}")
        logger.info(f"  Test Suites: {', '.join(args.tests)}")
        
        results = await run_comprehensive_testing(args)
        
        end_time = time.time()
        total_duration = end_time - start_time
        
        # Print summary
        print_test_summary(results)
        
        logger.info(f"Load testing completed in {total_duration/60:.1f} minutes")
        
    except KeyboardInterrupt:
        logger.info("Load testing interrupted by user")
    except Exception as e:
        logger.error(f"Load testing failed: {e}")
        raise

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nLoad testing interrupted. Partial results may be available.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nFatal error: {e}")
        sys.exit(1)
