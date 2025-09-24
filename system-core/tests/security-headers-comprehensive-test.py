#!/usr/bin/env python3
"""
Comprehensive Security Headers Test Suite
Validates 100% security headers coverage for TrustStream v4.2
Author: MiniMax Agent
Created: 2025-09-21
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import time

class SecurityHeadersValidator:
    """Comprehensive security headers validation with 100% coverage checking"""
    
    # Critical security headers for 100% coverage
    CRITICAL_SECURITY_HEADERS = {
        'x-frame-options': {
            'description': 'Prevents clickjacking attacks',
            'expected_values': ['DENY', 'SAMEORIGIN'],
            'required': True
        },
        'x-content-type-options': {
            'description': 'Prevents MIME type sniffing',
            'expected_values': ['nosniff'],
            'required': True
        },
        'x-xss-protection': {
            'description': 'XSS protection for legacy browsers',
            'expected_values': ['1; mode=block', '0'],
            'required': True
        },
        'strict-transport-security': {
            'description': 'Enforces HTTPS usage',
            'expected_pattern': r'max-age=\d+',
            'required': True
        },
        'content-security-policy': {
            'description': 'Controls resource loading',
            'expected_pattern': r"default-src\s+'self'",
            'required': True
        },
        'referrer-policy': {
            'description': 'Controls referrer information',
            'expected_values': ['strict-origin-when-cross-origin', 'no-referrer', 'same-origin'],
            'required': True
        },
        'permissions-policy': {
            'description': 'Controls browser features',
            'expected_pattern': r'camera=\(\)',
            'required': True
        },
        'cross-origin-embedder-policy': {
            'description': 'Cross-origin isolation',
            'expected_values': ['require-corp', 'unsafe-none'],
            'required': True
        },
        'cross-origin-opener-policy': {
            'description': 'Cross-origin window isolation',
            'expected_values': ['same-origin', 'same-origin-allow-popups'],
            'required': True
        },
        'cross-origin-resource-policy': {
            'description': 'Cross-origin resource sharing control',
            'expected_values': ['same-origin', 'same-site', 'cross-origin'],
            'required': True
        },
        'x-permitted-cross-domain-policies': {
            'description': 'Adobe Flash/PDF cross-domain policies',
            'expected_values': ['none', 'master-only'],
            'required': True
        },
        'expect-ct': {
            'description': 'Certificate Transparency',
            'expected_pattern': r'max-age=\d+',
            'required': True
        },
        'cache-control': {
            'description': 'Cache control for sensitive data',
            'expected_pattern': r'(no-cache|no-store|private)',
            'required': True
        }
    }
    
    # Additional security headers for enhanced protection
    ENHANCED_SECURITY_HEADERS = {
        'x-security-level': {
            'description': 'Security level indicator',
            'expected_values': ['PRODUCTION'],
            'required': False
        },
        'x-request-id': {
            'description': 'Request tracking',
            'expected_pattern': r'[a-f0-9\-]{36}',
            'required': False
        }
    }

    def __init__(self, base_url: str = "http://localhost"):
        self.base_url = base_url.rstrip('/')
        self.test_results = []
        self.coverage_score = 0.0
        
    def test_endpoint_headers(self, endpoint: str = "/") -> Dict:
        """Test security headers for a specific endpoint"""
        full_url = f"{self.base_url}{endpoint}"
        test_start = time.time()
        
        try:
            # Test GET request
            response = requests.get(full_url, timeout=10, allow_redirects=False)
            headers = {k.lower(): v for k, v in response.headers.items()}
            
            # Validate headers
            validation_results = self._validate_headers(headers)
            
            test_result = {
                'endpoint': endpoint,
                'url': full_url,
                'status_code': response.status_code,
                'response_time_ms': round((time.time() - test_start) * 1000, 2),
                'headers_present': list(headers.keys()),
                'security_validation': validation_results,
                'timestamp': datetime.now().isoformat()
            }
            
            self.test_results.append(test_result)
            return test_result
            
        except requests.RequestException as e:
            error_result = {
                'endpoint': endpoint,
                'url': full_url,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
            self.test_results.append(error_result)
            return error_result

    def _validate_headers(self, headers: Dict[str, str]) -> Dict:
        """Validate security headers against requirements"""
        import re
        
        critical_results = {}
        enhanced_results = {}
        
        # Check critical security headers
        for header_name, requirements in self.CRITICAL_SECURITY_HEADERS.items():
            header_value = headers.get(header_name)
            
            if header_value is None:
                critical_results[header_name] = {
                    'present': False,
                    'valid': False,
                    'description': requirements['description'],
                    'error': 'Header not present'
                }
            else:
                # Check if header value is valid
                is_valid = False
                
                if 'expected_values' in requirements:
                    is_valid = header_value in requirements['expected_values']
                elif 'expected_pattern' in requirements:
                    is_valid = bool(re.search(requirements['expected_pattern'], header_value))
                
                critical_results[header_name] = {
                    'present': True,
                    'valid': is_valid,
                    'value': header_value,
                    'description': requirements['description'],
                    'error': None if is_valid else f'Invalid value: {header_value}'
                }
        
        # Check enhanced security headers
        for header_name, requirements in self.ENHANCED_SECURITY_HEADERS.items():
            header_value = headers.get(header_name)
            
            if header_value is not None:
                is_valid = False
                
                if 'expected_values' in requirements:
                    is_valid = header_value in requirements['expected_values']
                elif 'expected_pattern' in requirements:
                    is_valid = bool(re.search(requirements['expected_pattern'], header_value))
                    
                enhanced_results[header_name] = {
                    'present': True,
                    'valid': is_valid,
                    'value': header_value,
                    'description': requirements['description']
                }
        
        # Calculate coverage score
        total_critical = len(self.CRITICAL_SECURITY_HEADERS)
        present_and_valid = sum(1 for result in critical_results.values() 
                               if result['present'] and result['valid'])
        
        coverage_score = (present_and_valid / total_critical) * 100 if total_critical > 0 else 0
        
        return {
            'critical_headers': critical_results,
            'enhanced_headers': enhanced_results,
            'coverage_score': round(coverage_score, 2),
            'total_critical': total_critical,
            'present_and_valid': present_and_valid,
            'missing_headers': [name for name, result in critical_results.items() 
                              if not result['present']],
            'invalid_headers': [name for name, result in critical_results.items() 
                              if result['present'] and not result['valid']]
        }

    def test_multiple_endpoints(self, endpoints: List[str]) -> Dict:
        """Test security headers across multiple endpoints"""
        print(f"Testing security headers across {len(endpoints)} endpoints...")
        
        all_results = []
        total_coverage = 0
        
        for endpoint in endpoints:
            print(f"Testing endpoint: {endpoint}")
            result = self.test_endpoint_headers(endpoint)
            
            if 'security_validation' in result:
                all_results.append(result)
                total_coverage += result['security_validation']['coverage_score']
        
        # Calculate overall metrics
        average_coverage = total_coverage / len(all_results) if all_results else 0
        
        # Find common missing headers
        all_missing = []
        for result in all_results:
            if 'security_validation' in result:
                all_missing.extend(result['security_validation']['missing_headers'])
        
        from collections import Counter
        common_missing = Counter(all_missing).most_common()
        
        summary = {
            'test_summary': {
                'total_endpoints_tested': len(endpoints),
                'successful_tests': len(all_results),
                'average_coverage_score': round(average_coverage, 2),
                'coverage_status': 'EXCELLENT' if average_coverage >= 95 else 'GOOD' if average_coverage >= 80 else 'NEEDS_IMPROVEMENT',
                'test_timestamp': datetime.now().isoformat()
            },
            'common_issues': {
                'missing_headers': common_missing,
                'recommendations': self._generate_recommendations(all_results)
            },
            'detailed_results': all_results
        }
        
        return summary

    def _generate_recommendations(self, results: List[Dict]) -> List[str]:
        """Generate recommendations based on test results"""
        recommendations = []
        
        # Analyze common issues
        all_missing = []
        all_invalid = []
        
        for result in results:
            if 'security_validation' in result:
                all_missing.extend(result['security_validation']['missing_headers'])
                all_invalid.extend(result['security_validation']['invalid_headers'])
        
        from collections import Counter
        missing_counts = Counter(all_missing)
        invalid_counts = Counter(all_invalid)
        
        # Generate specific recommendations
        if missing_counts:
            recommendations.append(f"Implement missing headers: {', '.join(missing_counts.keys())}")
            
        if invalid_counts:
            recommendations.append(f"Fix invalid header values for: {', '.join(invalid_counts.keys())}")
            
        if not any('strict-transport-security' in result.get('headers_present', []) for result in results):
            recommendations.append("Enable HTTPS and implement HSTS header")
            
        return recommendations

    def generate_security_report(self, output_file: str = None) -> str:
        """Generate comprehensive security report"""
        
        # Test critical endpoints
        critical_endpoints = [
            '/',
            '/health',
            '/api',
            '/admin',
            '/api/auth/',
        ]
        
        print("🔒 Starting Comprehensive Security Headers Test")
        print("=" * 60)
        
        test_results = self.test_multiple_endpoints(critical_endpoints)
        
        # Generate report
        report = self._format_security_report(test_results)
        
        if output_file:
            with open(output_file, 'w') as f:
                f.write(report)
            print(f"\n📄 Detailed report saved to: {output_file}")
        
        return report

    def _format_security_report(self, results: Dict) -> str:
        """Format security test results into a comprehensive report"""
        
        summary = results['test_summary']
        
        report = f"""
# 🔒 Comprehensive Security Headers Test Report
**Generated:** {summary['test_timestamp']}

## 📊 Executive Summary
- **Total Endpoints Tested:** {summary['total_endpoints_tested']}
- **Successful Tests:** {summary['successful_tests']}
- **Average Coverage Score:** {summary['average_coverage_score']}%
- **Coverage Status:** {summary['coverage_status']}

## 🎯 Coverage Analysis

### Critical Security Headers Status
"""
        
        # Analyze first successful test for header details
        if results['detailed_results']:
            first_result = next((r for r in results['detailed_results'] if 'security_validation' in r), None)
            
            if first_result:
                validation = first_result['security_validation']
                
                report += f"""
**Coverage Score:** {validation['coverage_score']}%
**Headers Present & Valid:** {validation['present_and_valid']}/{validation['total_critical']}

### ✅ Implemented Headers
"""
                
                for header, details in validation['critical_headers'].items():
                    if details['present'] and details['valid']:
                        report += f"- **{header.upper()}:** {details['description']}\n"
                        report += f"  - Value: `{details.get('value', 'N/A')}`\n"
                
                if validation['missing_headers']:
                    report += f"\n### ❌ Missing Headers\n"
                    for header in validation['missing_headers']:
                        header_info = self.CRITICAL_SECURITY_HEADERS[header]
                        report += f"- **{header.upper()}:** {header_info['description']}\n"
                
                if validation['invalid_headers']:
                    report += f"\n### ⚠️ Invalid Headers\n"
                    for header in validation['invalid_headers']:
                        header_details = validation['critical_headers'][header]
                        report += f"- **{header.upper()}:** {header_details.get('error', 'Invalid value')}\n"
        
        # Add recommendations
        if results['common_issues']['recommendations']:
            report += f"\n## 💡 Recommendations\n"
            for i, rec in enumerate(results['common_issues']['recommendations'], 1):
                report += f"{i}. {rec}\n"
        
        # Add detailed endpoint results
        report += f"\n## 📋 Detailed Endpoint Results\n"
        
        for result in results['detailed_results']:
            if 'security_validation' in result:
                validation = result['security_validation']
                status_emoji = "✅" if validation['coverage_score'] >= 95 else "⚠️" if validation['coverage_score'] >= 80 else "❌"
                
                report += f"""
### {status_emoji} {result['endpoint']}
- **URL:** {result['url']}
- **Status Code:** {result['status_code']}
- **Coverage:** {validation['coverage_score']}%
- **Response Time:** {result['response_time_ms']}ms
"""
        
        return report


def main():
    """Main test execution"""
    
    # Configuration
    BASE_URL = "http://localhost:3000"  # Update as needed
    OUTPUT_FILE = "security_headers_test_report.md"
    
    try:
        # Initialize validator
        validator = SecurityHeadersValidator(BASE_URL)
        
        # Generate comprehensive report
        report = validator.generate_security_report(OUTPUT_FILE)
        
        # Print summary to console
        print("\n" + "=" * 60)
        print("🔒 SECURITY HEADERS TEST COMPLETED")
        print("=" * 60)
        
        # Get overall coverage from the last test
        if validator.test_results:
            latest_result = validator.test_results[-1]
            if 'security_validation' in latest_result:
                coverage = latest_result['security_validation']['coverage_score']
                
                print(f"📊 Overall Coverage: {coverage}%")
                
                if coverage >= 95:
                    print("✅ EXCELLENT: Security headers coverage meets production standards!")
                    sys.exit(0)
                elif coverage >= 80:
                    print("⚠️  GOOD: Security headers mostly implemented, minor improvements needed")
                    sys.exit(1)
                else:
                    print("❌ NEEDS IMPROVEMENT: Critical security headers missing")
                    sys.exit(2)
        
        print("⚠️  Unable to determine coverage score")
        sys.exit(3)
        
    except Exception as e:
        print(f"❌ Test execution failed: {str(e)}")
        sys.exit(4)


if __name__ == "__main__":
    main()