#!/usr/bin/env python3
"""
TrustStram v4.4 Load Testing Utilities

Utility functions and helpers for load testing operations.

Author: TrustStram Load Testing Team
Version: 4.4.0
Date: 2025-09-22
"""

import asyncio
import aiohttp
import time
import json
import logging
import statistics
import random
import yaml
import csv
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Union
import subprocess
import psutil
from dataclasses import dataclass, asdict
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from jinja2 import Template

logger = logging.getLogger(__name__)

class LoadTestingUtils:
    """Utility functions for load testing"""
    
    @staticmethod
    def load_config(config_path: str) -> Dict[str, Any]:
        """Load configuration from YAML file"""
        try:
            with open(config_path, 'r') as f:
                config = yaml.safe_load(f)
                return config
        except FileNotFoundError:
            logger.error(f"Configuration file not found: {config_path}")
            raise
        except yaml.YAMLError as e:
            logger.error(f"Error parsing YAML configuration: {e}")
            raise
    
    @staticmethod
    def validate_config(config: Dict[str, Any]) -> bool:
        """Validate configuration structure"""
        required_sections = ['target_system', 'execution', 'scenarios', 'thresholds']
        
        for section in required_sections:
            if section not in config:
                logger.error(f"Missing required configuration section: {section}")
                return False
        
        # Validate target system
        if 'base_url' not in config['target_system']:
            logger.error("Missing base_url in target_system configuration")
            return False
        
        # Validate execution parameters
        execution = config['execution']
        required_execution_params = ['total_duration_seconds', 'max_concurrent_users']
        for param in required_execution_params:
            if param not in execution:
                logger.error(f"Missing required execution parameter: {param}")
                return False
        
        return True
    
    @staticmethod
    def generate_realistic_payload(endpoint: str, scenario: str = "default") -> Dict[str, Any]:
        """Generate realistic test payloads for different endpoints"""
        payloads = {
            '/federated-learning/train': {
                'default': {
                    'model_config': {
                        'architecture': random.choice(['neural_network', 'decision_tree', 'linear_model']),
                        'layers': [random.choice([32, 64, 128]), random.choice([16, 32, 64]), random.choice([8, 16, 32])],
                        'activation': random.choice(['relu', 'sigmoid', 'tanh']),
                        'optimizer': random.choice(['adam', 'sgd', 'rmsprop'])
                    },
                    'data_config': {
                        'dataset_type': random.choice(['horizontal', 'vertical']),
                        'feature_schema': {'features': random.randint(50, 500)},
                        'validation_split': random.uniform(0.1, 0.3)
                    },
                    'num_clients': random.randint(5, 50),
                    'num_rounds': random.randint(10, 50),
                    'privacy_budget': random.uniform(1.0, 8.0),
                    'scenario_type': random.choice(['horizontal', 'vertical', 'cross_device', 'cross_silo'])
                },
                'large_scale': {
                    'model_config': {
                        'architecture': 'neural_network',
                        'layers': [256, 128, 64, 32],
                        'activation': 'relu',
                        'optimizer': 'adam'
                    },
                    'data_config': {
                        'dataset_type': 'horizontal',
                        'feature_schema': {'features': 1000},
                        'validation_split': 0.2
                    },
                    'num_clients': random.randint(100, 1000),
                    'num_rounds': random.randint(20, 100),
                    'privacy_budget': 4.0,
                    'scenario_type': 'cross_device'
                }
            },
            '/agents/{agent_id}/query': {
                'efficiency': {
                    'type': 'performance_optimization',
                    'query': f'Analyze system performance for optimization at {datetime.now().isoformat()}',
                    'context': {
                        'system_load': random.choice(['low', 'medium', 'high']),
                        'response_time_threshold': random.randint(50, 500),
                        'priority': random.choice(['low', 'medium', 'high', 'critical'])
                    }
                },
                'quality': {
                    'type': 'quality_assessment',
                    'query': f'Evaluate quality metrics for session {random.randint(1000, 9999)}',
                    'context': {
                        'quality_metrics': random.sample(['accuracy', 'relevance', 'completeness', 'timeliness', 'consistency'], 3),
                        'threshold': random.uniform(0.7, 0.95),
                        'evaluation_period': random.choice(['1h', '4h', '24h'])
                    }
                },
                'transparency': {
                    'type': 'transparency_analysis',
                    'query': f'Generate transparency report for decisions made in the last hour',
                    'context': {
                        'decision_ids': [f'dec_{random.randint(100, 999)}' for _ in range(random.randint(1, 5))],
                        'report_type': random.choice(['summary', 'detailed', 'audit']),
                        'stakeholder_level': random.choice(['technical', 'business', 'regulatory'])
                    }
                }
            }
        }
        
        endpoint_payloads = payloads.get(endpoint, {})
        return endpoint_payloads.get(scenario, {})
    
    @staticmethod
    def calculate_percentiles(values: List[float], percentiles: List[int] = [50, 95, 99]) -> Dict[int, float]:
        """Calculate percentiles for a list of values"""
        if not values:
            return {p: 0.0 for p in percentiles}
        
        sorted_values = sorted(values)
        n = len(sorted_values)
        
        result = {}
        for p in percentiles:
            if p == 50:
                result[p] = statistics.median(sorted_values)
            else:
                index = int((p / 100.0) * n)
                if index >= n:
                    index = n - 1
                result[p] = sorted_values[index]
        
        return result
    
    @staticmethod
    def format_duration(seconds: float) -> str:
        """Format duration in human-readable format"""
        if seconds < 60:
            return f"{seconds:.1f} seconds"
        elif seconds < 3600:
            minutes = seconds / 60
            return f"{minutes:.1f} minutes"
        else:
            hours = seconds / 3600
            return f"{hours:.1f} hours"
    
    @staticmethod
    def format_throughput(rps: float) -> str:
        """Format throughput in human-readable format"""
        if rps < 1:
            return f"{rps:.3f} RPS"
        elif rps < 1000:
            return f"{rps:.1f} RPS"
        else:
            return f"{rps/1000:.1f}K RPS"
    
    @staticmethod
    def format_bytes(bytes_count: int) -> str:
        """Format bytes in human-readable format"""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if bytes_count < 1024.0:
                return f"{bytes_count:.1f} {unit}"
            bytes_count /= 1024.0
        return f"{bytes_count:.1f} PB"
    
    @staticmethod
    def get_system_info() -> Dict[str, Any]:
        """Get system information for test environment documentation"""
        try:
            cpu_count = psutil.cpu_count(logical=True)
            cpu_freq = psutil.cpu_freq()
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            return {
                'cpu': {
                    'count': cpu_count,
                    'frequency_mhz': cpu_freq.current if cpu_freq else None
                },
                'memory': {
                    'total_gb': memory.total / (1024**3),
                    'available_gb': memory.available / (1024**3)
                },
                'disk': {
                    'total_gb': disk.total / (1024**3),
                    'free_gb': disk.free / (1024**3)
                },
                'platform': {
                    'system': os.uname().sysname,
                    'release': os.uname().release,
                    'machine': os.uname().machine
                }
            }
        except Exception as e:
            logger.warning(f"Could not gather system info: {e}")
            return {}
    
    @staticmethod
    def check_prerequisites() -> Dict[str, bool]:
        """Check if all prerequisites for load testing are available"""
        checks = {
            'python_version': True,  # Already running Python
            'aiohttp': False,
            'psutil': False,
            'matplotlib': False,
            'jinja2': False,
            'yaml': False,
            'jmeter': False
        }
        
        # Check Python packages
        try:
            import aiohttp
            checks['aiohttp'] = True
        except ImportError:
            pass
        
        try:
            import psutil
            checks['psutil'] = True
        except ImportError:
            pass
        
        try:
            import matplotlib
            checks['matplotlib'] = True
        except ImportError:
            pass
        
        try:
            import jinja2
            checks['jinja2'] = True
        except ImportError:
            pass
        
        try:
            import yaml
            checks['yaml'] = True
        except ImportError:
            pass
        
        # Check JMeter
        try:
            result = subprocess.run(['jmeter', '--version'], 
                                  capture_output=True, text=True, timeout=10)
            checks['jmeter'] = result.returncode == 0
        except (subprocess.TimeoutExpired, FileNotFoundError):
            checks['jmeter'] = False
        
        return checks
    
    @staticmethod
    def install_missing_packages() -> bool:
        """Attempt to install missing Python packages"""
        try:
            missing_packages = []
            
            try:
                import aiohttp
            except ImportError:
                missing_packages.append('aiohttp')
            
            try:
                import psutil
            except ImportError:
                missing_packages.append('psutil')
            
            try:
                import matplotlib
            except ImportError:
                missing_packages.append('matplotlib')
            
            try:
                import jinja2
            except ImportError:
                missing_packages.append('jinja2')
            
            try:
                import yaml
            except ImportError:
                missing_packages.append('pyyaml')
            
            if missing_packages:
                logger.info(f"Installing missing packages: {', '.join(missing_packages)}")
                result = subprocess.run([
                    'pip', 'install'] + missing_packages,
                    capture_output=True, text=True
                )
                
                if result.returncode == 0:
                    logger.info("Successfully installed missing packages")
                    return True
                else:
                    logger.error(f"Failed to install packages: {result.stderr}")
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error installing packages: {e}")
            return False
    
    @staticmethod
    def create_directory_structure(base_dir: str = "tests/load_stress_testing"):
        """Create the directory structure for load testing"""
        directories = [
            f"{base_dir}/results",
            f"{base_dir}/reports",
            f"{base_dir}/configs",
            f"{base_dir}/logs",
            f"{base_dir}/data",
            f"{base_dir}/scripts"
        ]
        
        for directory in directories:
            Path(directory).mkdir(parents=True, exist_ok=True)
            logger.info(f"Created directory: {directory}")
    
    @staticmethod
    def setup_logging(log_level: str = "INFO", log_file: Optional[str] = None) -> logging.Logger:
        """Setup logging configuration"""
        level = getattr(logging, log_level.upper(), logging.INFO)
        
        # Create formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        
        # Setup root logger
        root_logger = logging.getLogger()
        root_logger.setLevel(level)
        
        # Clear existing handlers
        root_logger.handlers.clear()
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(level)
        console_handler.setFormatter(formatter)
        root_logger.addHandler(console_handler)
        
        # File handler if specified
        if log_file:
            file_handler = logging.FileHandler(log_file)
            file_handler.setLevel(level)
            file_handler.setFormatter(formatter)
            root_logger.addHandler(file_handler)
        
        return root_logger

class ResultsAnalyzer:
    """Analyze and process load testing results"""
    
    def __init__(self, results_data: Dict[str, Any]):
        self.results = results_data
    
    def calculate_sla_compliance(self, sla_targets: Dict[str, float]) -> Dict[str, Any]:
        """Calculate SLA compliance metrics"""
        compliance = {
            'overall_score': 0.0,
            'compliant_metrics': 0,
            'total_metrics': 0,
            'details': {}
        }
        
        # Check response time SLA
        if 'response_time_p95' in sla_targets and 'api_results' in self.results:
            api_results = self.results['api_results']
            if api_results:
                avg_p95 = statistics.mean([r.get('p95_response_time', 0) for r in api_results])
                target_p95 = sla_targets['response_time_p95']
                
                compliance['details']['response_time_p95'] = {
                    'target': target_p95,
                    'actual': avg_p95,
                    'compliant': avg_p95 <= target_p95,
                    'deviation_percent': ((avg_p95 - target_p95) / target_p95) * 100 if target_p95 > 0 else 0
                }
                
                compliance['total_metrics'] += 1
                if avg_p95 <= target_p95:
                    compliance['compliant_metrics'] += 1
        
        # Check availability SLA
        if 'availability' in sla_targets and 'api_results' in self.results:
            api_results = self.results['api_results']
            if api_results:
                total_requests = sum(r.get('total_requests', 0) for r in api_results)
                successful_requests = sum(r.get('successful_requests', 0) for r in api_results)
                
                actual_availability = (successful_requests / total_requests * 100) if total_requests > 0 else 0
                target_availability = sla_targets['availability']
                
                compliance['details']['availability'] = {
                    'target': target_availability,
                    'actual': actual_availability,
                    'compliant': actual_availability >= target_availability,
                    'deviation_percent': ((actual_availability - target_availability) / target_availability) * 100
                }
                
                compliance['total_metrics'] += 1
                if actual_availability >= target_availability:
                    compliance['compliant_metrics'] += 1
        
        # Calculate overall score
        if compliance['total_metrics'] > 0:
            compliance['overall_score'] = (compliance['compliant_metrics'] / compliance['total_metrics']) * 100
        
        return compliance
    
    def identify_performance_trends(self) -> Dict[str, Any]:
        """Identify performance trends from test results"""
        trends = {
            'response_time_trend': 'stable',
            'throughput_trend': 'stable',
            'error_rate_trend': 'stable',
            'resource_utilization_trend': 'stable',
            'recommendations': []
        }
        
        # Analyze API response time trends
        if 'api_results' in self.results:
            api_results = self.results['api_results']
            if len(api_results) > 1:
                response_times = [r.get('average_response_time', 0) for r in api_results]
                
                # Simple trend analysis
                if len(response_times) >= 3:
                    recent_avg = statistics.mean(response_times[-3:])
                    earlier_avg = statistics.mean(response_times[:-3]) if len(response_times) > 3 else response_times[0]
                    
                    if recent_avg > earlier_avg * 1.2:
                        trends['response_time_trend'] = 'deteriorating'
                        trends['recommendations'].append(
                            "Response times are increasing - investigate system load and optimize bottlenecks"
                        )
                    elif recent_avg < earlier_avg * 0.8:
                        trends['response_time_trend'] = 'improving'
        
        return trends
    
    def generate_capacity_forecast(self, growth_rate: float = 0.2, forecast_months: int = 12) -> Dict[str, Any]:
        """Generate capacity forecast based on test results"""
        forecast = {
            'current_capacity': {},
            'projected_capacity': {},
            'recommendations': [],
            'cost_estimates': {}
        }
        
        # Current capacity analysis
        if 'api_results' in self.results:
            api_results = self.results['api_results']
            if api_results:
                current_peak_rps = max(r.get('requests_per_second', 0) for r in api_results)
                current_avg_response_time = statistics.mean(r.get('average_response_time', 0) for r in api_results)
                
                forecast['current_capacity'] = {
                    'peak_rps': current_peak_rps,
                    'average_response_time': current_avg_response_time,
                    'utilization_estimate': min(100, (current_peak_rps / 5000) * 100)  # Assume 5K RPS max capacity
                }
                
                # Project future capacity needs
                monthly_growth = (1 + growth_rate) ** (1/12)
                projected_rps = current_peak_rps
                
                for month in range(1, forecast_months + 1):
                    projected_rps *= monthly_growth
                
                forecast['projected_capacity'] = {
                    'peak_rps': projected_rps,
                    'growth_factor': projected_rps / current_peak_rps,
                    'additional_instances_needed': max(0, int((projected_rps - current_peak_rps) / 500))  # 500 RPS per instance
                }
                
                # Generate recommendations
                if projected_rps > current_peak_rps * 1.5:
                    forecast['recommendations'].append(
                        f"Significant capacity increase needed - plan for {forecast['projected_capacity']['additional_instances_needed']} additional instances"
                    )
                
                if forecast['current_capacity']['utilization_estimate'] > 70:
                    forecast['recommendations'].append(
                        "Current utilization is high - consider scaling proactively"
                    )
        
        return forecast

if __name__ == "__main__":
    # Test utilities
    utils = LoadTestingUtils()
    
    print("System Information:")
    print(json.dumps(utils.get_system_info(), indent=2))
    
    print("\nPrerequisite Check:")
    prereqs = utils.check_prerequisites()
    for check, status in prereqs.items():
        print(f"  {check}: {'✓' if status else '✗'}")
    
    print("\nGenerating sample payload:")
    payload = utils.generate_realistic_payload('/federated-learning/train', 'large_scale')
    print(json.dumps(payload, indent=2))
    
    print("\nCreating directory structure...")
    utils.create_directory_structure()
    
    print("\nLoad testing utilities ready!")
