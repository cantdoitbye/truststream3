#!/usr/bin/env python3
"""
Performance Monitoring Suite for TrustStream v4.2.1
Comprehensive performance testing and monitoring implementation
"""
import requests
import json
import time
import statistics
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Any

class PerformanceMonitoringSuite:
    def __init__(self):
        self.base_url = "https://etretluugvclmydzlfte.supabase.co/functions/v1"
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0cmV0bHV1Z3ZjbG15ZHpsZnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NjI4MTgsImV4cCI6MjA3MjIzODgxOH0.g-Mki8CU85CQSRdjCcmBV8g-DsR4VKCtn0fOd-LC6m4',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0cmV0bHV1Z3ZjbG15ZHpsZnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NjI4MTgsImV4cCI6MjA3MjIzODgxOH0.g-Mki8CU85CQSRdjCcmBV8g-DsR4VKCtn0fOd-LC6m4'
        }
        self.results = {
            'timestamp': datetime.now().isoformat(),
            'performance_metrics': {},
            'load_test_results': {},
            'response_time_analysis': {},
            'availability_metrics': {},
            'resource_utilization': {},
            'performance_score': 0,
            'uptime_percentage': 0
        }

    def test_single_request(self, endpoint: str, payload: Dict) -> Dict[str, Any]:
        """Test a single request and measure performance"""
        start_time = time.time()
        
        try:
            response = requests.post(
                f"{self.base_url}/{endpoint}",
                headers=self.headers,
                json=payload,
                timeout=30
            )
            
            response_time = time.time() - start_time
            
            return {
                'success': response.status_code == 200,
                'status_code': response.status_code,
                'response_time': response_time,
                'response_size': len(response.content),
                'endpoint': endpoint
            }
            
        except Exception as e:
            response_time = time.time() - start_time
            return {
                'success': False,
                'status_code': None,
                'response_time': response_time,
                'error': str(e),
                'endpoint': endpoint
            }

    def load_test_endpoint(self, endpoint: str, payload: Dict, concurrent_users: int = 10, requests_per_user: int = 5) -> Dict[str, Any]:
        """Perform load testing on an endpoint"""
        print(f"    Load testing {endpoint} with {concurrent_users} concurrent users...")
        
        results = []
        
        def user_simulation():
            user_results = []
            for _ in range(requests_per_user):
                result = self.test_single_request(endpoint, payload)
                user_results.append(result)
                time.sleep(0.1)  # Small delay between requests
            return user_results
        
        # Execute concurrent load test
        with ThreadPoolExecutor(max_workers=concurrent_users) as executor:
            future_to_user = {executor.submit(user_simulation): i for i in range(concurrent_users)}
            
            for future in as_completed(future_to_user):
                user_results = future.result()
                results.extend(user_results)
        
        # Analyze results
        successful_requests = [r for r in results if r['success']]
        failed_requests = [r for r in results if not r['success']]
        
        response_times = [r['response_time'] for r in successful_requests]
        
        if response_times:
            avg_response_time = statistics.mean(response_times)
            median_response_time = statistics.median(response_times)
            p95_response_time = sorted(response_times)[int(len(response_times) * 0.95)] if len(response_times) > 0 else 0
            p99_response_time = sorted(response_times)[int(len(response_times) * 0.99)] if len(response_times) > 0 else 0
        else:
            avg_response_time = median_response_time = p95_response_time = p99_response_time = 0
        
        success_rate = (len(successful_requests) / len(results)) * 100 if results else 0
        
        return {
            'endpoint': endpoint,
            'total_requests': len(results),
            'successful_requests': len(successful_requests),
            'failed_requests': len(failed_requests),
            'success_rate': success_rate,
            'avg_response_time': avg_response_time,
            'median_response_time': median_response_time,
            'p95_response_time': p95_response_time,
            'p99_response_time': p99_response_time,
            'max_response_time': max(response_times) if response_times else 0,
            'min_response_time': min(response_times) if response_times else 0,
            'concurrent_users': concurrent_users,
            'requests_per_user': requests_per_user
        }

    def test_availability(self, endpoints: List[str], test_duration: int = 60) -> Dict[str, Any]:
        """Test availability over a period of time"""
        print(f"  Testing availability for {test_duration} seconds...")
        
        start_time = time.time()
        availability_results = {endpoint: {'up': 0, 'down': 0} for endpoint in endpoints}
        
        while time.time() - start_time < test_duration:
            for endpoint in endpoints:
                try:
                    response = requests.get(f"{self.base_url}/{endpoint}", timeout=10)
                    if response.status_code == 200 or response.status_code == 401:  # 401 is expected for auth endpoints
                        availability_results[endpoint]['up'] += 1
                    else:
                        availability_results[endpoint]['down'] += 1
                except:
                    availability_results[endpoint]['down'] += 1
            
            time.sleep(5)  # Check every 5 seconds
        
        # Calculate availability percentages
        availability_metrics = {}
        for endpoint, results in availability_results.items():
            total_checks = results['up'] + results['down']
            if total_checks > 0:
                uptime_percentage = (results['up'] / total_checks) * 100
            else:
                uptime_percentage = 0
            
            availability_metrics[endpoint] = {
                'uptime_percentage': uptime_percentage,
                'total_checks': total_checks,
                'successful_checks': results['up'],
                'failed_checks': results['down']
            }
        
        overall_uptime = statistics.mean([metrics['uptime_percentage'] for metrics in availability_metrics.values()])
        
        return {
            'overall_uptime': overall_uptime,
            'endpoint_availability': availability_metrics,
            'test_duration': test_duration
        }

    def analyze_response_time_patterns(self, endpoint: str, payload: Dict, sample_size: int = 50) -> Dict[str, Any]:
        """Analyze response time patterns and consistency"""
        print(f"    Analyzing response time patterns for {endpoint}...")
        
        response_times = []
        status_codes = []
        
        for i in range(sample_size):
            result = self.test_single_request(endpoint, payload)
            response_times.append(result['response_time'])
            status_codes.append(result.get('status_code', 0))
            
            if i % 10 == 0:
                time.sleep(0.5)  # Brief pause every 10 requests
        
        # Statistical analysis
        avg_time = statistics.mean(response_times)
        median_time = statistics.median(response_times)
        std_dev = statistics.stdev(response_times) if len(response_times) > 1 else 0
        
        # Performance consistency score (lower std deviation = higher consistency)
        consistency_score = max(0, 100 - (std_dev * 100))
        
        # Response time distribution
        fast_responses = len([t for t in response_times if t < 1.0])  # Under 1 second
        medium_responses = len([t for t in response_times if 1.0 <= t < 3.0])  # 1-3 seconds
        slow_responses = len([t for t in response_times if t >= 3.0])  # Over 3 seconds
        
        return {
            'avg_response_time': avg_time,
            'median_response_time': median_time,
            'std_deviation': std_dev,
            'consistency_score': consistency_score,
            'min_response_time': min(response_times),
            'max_response_time': max(response_times),
            'fast_responses_count': fast_responses,
            'medium_responses_count': medium_responses,
            'slow_responses_count': slow_responses,
            'sample_size': sample_size
        }

    def calculate_performance_score(self) -> float:
        """Calculate overall performance score based on various metrics"""
        scores = []
        
        # Response time score (target: < 2 seconds average)
        for endpoint, metrics in self.results['response_time_analysis'].items():
            avg_time = metrics.get('avg_response_time', 10)
            if avg_time < 1.0:
                scores.append(100)
            elif avg_time < 2.0:
                scores.append(80)
            elif avg_time < 3.0:
                scores.append(60)
            else:
                scores.append(30)
        
        # Load test success rate score
        for endpoint, metrics in self.results['load_test_results'].items():
            success_rate = metrics.get('success_rate', 0)
            scores.append(success_rate)
        
        # Availability score (target: 99.9% uptime)
        uptime = self.results['availability_metrics'].get('overall_uptime', 0)
        if uptime >= 99.9:
            scores.append(100)
        elif uptime >= 99.0:
            scores.append(85)
        elif uptime >= 95.0:
            scores.append(70)
        else:
            scores.append(40)
        
        return statistics.mean(scores) if scores else 0

    def run_comprehensive_performance_testing(self) -> Dict[str, Any]:
        """Run complete performance testing suite"""
        print("⚡ Starting Comprehensive Performance Testing...")
        
        # Test endpoints and their payloads
        test_endpoints = [
            ('ai-leader-quality-agent', {'action': 'assess_output_quality', 'content': 'test content'}),
            ('ai-leader-transparency-agent', {'action': 'get_transparency_metrics'}),
            ('ai-leader-efficiency-agent', {'action': 'status'}),
            ('daughter-community-rag-agent', {'action': 'analyze_hierarchical_structure', 'community_id': 'test-123'}),
        ]
        
        # 1. Response Time Analysis
        print("  Phase 1: Response Time Analysis...")
        for endpoint, payload in test_endpoints:
            print(f"    Analyzing {endpoint}...")
            self.results['response_time_analysis'][endpoint] = self.analyze_response_time_patterns(endpoint, payload)
        
        # 2. Load Testing
        print("  Phase 2: Load Testing...")
        for endpoint, payload in test_endpoints:
            self.results['load_test_results'][endpoint] = self.load_test_endpoint(endpoint, payload, concurrent_users=5, requests_per_user=3)
        
        # 3. Availability Testing
        print("  Phase 3: Availability Testing...")
        endpoints = [ep[0] for ep in test_endpoints]
        self.results['availability_metrics'] = self.test_availability(endpoints, test_duration=30)
        
        # 4. Calculate Performance Score
        self.results['performance_score'] = self.calculate_performance_score()
        self.results['uptime_percentage'] = self.results['availability_metrics'].get('overall_uptime', 0)
        
        # Display Results
        print(f"\n📊 Performance Testing Results:")
        print(f"   Overall Performance Score: {self.results['performance_score']:.1f}%")
        print(f"   System Uptime: {self.results['uptime_percentage']:.2f}%")
        
        avg_response_times = [
            metrics['avg_response_time'] 
            for metrics in self.results['response_time_analysis'].values()
        ]
        if avg_response_times:
            overall_avg_response = statistics.mean(avg_response_times)
            print(f"   Average Response Time: {overall_avg_response:.3f}s")
        
        # Load test summary
        load_success_rates = [
            metrics['success_rate']
            for metrics in self.results['load_test_results'].values()
        ]
        if load_success_rates:
            overall_load_success = statistics.mean(load_success_rates)
            print(f"   Load Test Success Rate: {overall_load_success:.1f}%")
        
        # Performance targets check
        print(f"\n🎯 Performance Targets:")
        performance_score = self.results['performance_score']
        uptime = self.results['uptime_percentage']
        
        if performance_score >= 90 and uptime >= 99.9:
            print("   ✅ EXCELLENT - All performance targets exceeded")
        elif performance_score >= 80 and uptime >= 99.0:
            print("   ✅ GOOD - Performance targets met")
        elif performance_score >= 70 and uptime >= 95.0:
            print("   ⚠️  ACCEPTABLE - Some optimization needed")
        else:
            print("   ❌ NEEDS IMPROVEMENT - Performance optimization required")
        
        # Save results
        with open('performance_monitoring_results.json', 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"   Results saved to performance_monitoring_results.json")
        
        return self.results

if __name__ == "__main__":
    suite = PerformanceMonitoringSuite()
    results = suite.run_comprehensive_performance_testing()
