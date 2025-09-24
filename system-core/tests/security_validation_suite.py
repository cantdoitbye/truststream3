#!/usr/bin/env python3
"""
Security Validation Suite for TrustStream v4.2.1
Comprehensive security, compliance, and GDPR validation
"""
import requests
import json
import os
import re
from datetime import datetime
from typing import Dict, List, Any

class SecurityValidationSuite:
    def __init__(self):
        self.base_url = "https://etretluugvclmydzlfte.supabase.co/functions/v1"
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {os.getenv("SUPABASE_ANON_KEY", "")}',
            'apikey': os.getenv("SUPABASE_ANON_KEY", "")
        }
        self.results = {
            'timestamp': datetime.now().isoformat(),
            'security_tests': {},
            'compliance_tests': {},
            'gdpr_tests': {},
            'overall_score': 0
        }

    def test_cors_headers(self, endpoint: str) -> Dict[str, Any]:
        """Test CORS headers configuration"""
        try:
            response = requests.options(f"{self.base_url}/{endpoint}", timeout=10)
            cors_headers = {
                'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
                'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
                'access-control-allow-headers': response.headers.get('access-control-allow-headers'),
                'access-control-max-age': response.headers.get('access-control-max-age')
            }
            
            # Check for proper CORS configuration
            has_origin = cors_headers['access-control-allow-origin'] is not None
            has_methods = cors_headers['access-control-allow-methods'] is not None
            has_headers = cors_headers['access-control-allow-headers'] is not None
            
            return {
                'cors_configured': has_origin and has_methods and has_headers,
                'cors_headers': cors_headers,
                'status_code': response.status_code
            }
        except Exception as e:
            return {'cors_configured': False, 'error': str(e)}

    def test_authentication_enforcement(self, endpoint: str) -> Dict[str, Any]:
        """Test authentication enforcement"""
        try:
            # Test without auth
            response_no_auth = requests.post(
                f"{self.base_url}/{endpoint}",
                json={'action': 'test'},
                timeout=10
            )
            
            # Test with invalid auth
            response_invalid_auth = requests.post(
                f"{self.base_url}/{endpoint}",
                headers={'Authorization': 'Bearer invalid_token'},
                json={'action': 'test'},
                timeout=10
            )
            
            # Authentication is properly enforced if unauthorized requests are rejected
            auth_enforced = response_no_auth.status_code in [401, 403] or response_invalid_auth.status_code in [401, 403]
            
            return {
                'auth_enforced': auth_enforced,
                'no_auth_status': response_no_auth.status_code,
                'invalid_auth_status': response_invalid_auth.status_code
            }
        except Exception as e:
            return {'auth_enforced': False, 'error': str(e)}

    def test_input_sanitization(self, endpoint: str) -> Dict[str, Any]:
        """Test input sanitization and injection protection"""
        malicious_payloads = [
            {'action': '<script>alert("xss")</script>'},
            {'action': '"; DROP TABLE users; --'},
            {'action': '../../../etc/passwd'},
            {'action': '{{7*7}}'},  # Template injection
            {'action': '${7*7}'}    # Expression injection
        ]
        
        injection_attempts = []
        for payload in malicious_payloads:
            try:
                response = requests.post(
                    f"{self.base_url}/{endpoint}",
                    headers=self.headers,
                    json=payload,
                    timeout=10
                )
                
                # Check if malicious payload is reflected in response
                response_text = response.text.lower()
                is_reflected = any(
                    dangerous in response_text 
                    for dangerous in ['<script>', 'drop table', '/etc/passwd', '49']  # 7*7=49
                )
                
                injection_attempts.append({
                    'payload': payload,
                    'status_code': response.status_code,
                    'reflected': is_reflected
                })
            except Exception as e:
                injection_attempts.append({
                    'payload': payload,
                    'error': str(e)
                })
        
        # Input sanitization is working if no malicious payloads are reflected
        sanitization_working = not any(attempt.get('reflected', False) for attempt in injection_attempts)
        
        return {
            'sanitization_working': sanitization_working,
            'injection_attempts': injection_attempts
        }

    def test_security_headers(self, endpoint: str) -> Dict[str, Any]:
        """Test security headers"""
        try:
            response = requests.post(f"{self.base_url}/{endpoint}", headers=self.headers, json={'action': 'test'}, timeout=10)
            
            security_headers = {
                'x-content-type-options': response.headers.get('x-content-type-options'),
                'x-frame-options': response.headers.get('x-frame-options'),
                'x-xss-protection': response.headers.get('x-xss-protection'),
                'strict-transport-security': response.headers.get('strict-transport-security'),
                'content-security-policy': response.headers.get('content-security-policy')
            }
            
            # Count how many security headers are present
            headers_present = sum(1 for v in security_headers.values() if v is not None)
            security_score = (headers_present / len(security_headers)) * 100
            
            return {
                'security_headers': security_headers,
                'headers_present': headers_present,
                'security_score': security_score
            }
        except Exception as e:
            return {'security_score': 0, 'error': str(e)}

    def test_rate_limiting(self, endpoint: str) -> Dict[str, Any]:
        """Test rate limiting implementation"""
        try:
            # Send multiple requests rapidly
            responses = []
            for i in range(10):
                response = requests.post(
                    f"{self.base_url}/{endpoint}",
                    headers=self.headers,
                    json={'action': 'test'},
                    timeout=5
                )
                responses.append(response.status_code)
            
            # Rate limiting is working if we get 429 status codes
            rate_limited = 429 in responses
            
            return {
                'rate_limiting_active': rate_limited,
                'response_codes': responses
            }
        except Exception as e:
            return {'rate_limiting_active': False, 'error': str(e)}

    def test_gdpr_compliance(self) -> Dict[str, Any]:
        """Test GDPR compliance features"""
        gdpr_features = {
            'data_processing_transparency': False,
            'user_consent_management': False,
            'data_portability': False,
            'right_to_deletion': False,
            'privacy_by_design': False
        }
        
        # Check for GDPR-related endpoints or documentation
        gdpr_endpoints = [
            'gdpr-data-export',
            'gdpr-data-deletion',
            'user-consent-management',
            'privacy-policy-service'
        ]
        
        for endpoint in gdpr_endpoints:
            try:
                response = requests.get(f"{self.base_url}/{endpoint}", timeout=5)
                if response.status_code != 404:
                    if 'data-export' in endpoint:
                        gdpr_features['data_portability'] = True
                    elif 'data-deletion' in endpoint:
                        gdpr_features['right_to_deletion'] = True
                    elif 'consent' in endpoint:
                        gdpr_features['user_consent_management'] = True
            except:
                pass
        
        # Check for privacy documentation
        try:
            privacy_docs = ['README.md', 'PRIVACY.md', 'docs/privacy-policy.md']
            for doc in privacy_docs:
                if os.path.exists(doc):
                    with open(doc, 'r') as f:
                        content = f.read().lower()
                        if 'gdpr' in content or 'privacy' in content:
                            gdpr_features['privacy_by_design'] = True
                            gdpr_features['data_processing_transparency'] = True
                            break
        except:
            pass
        
        compliance_score = (sum(gdpr_features.values()) / len(gdpr_features)) * 100
        
        return {
            'gdpr_features': gdpr_features,
            'compliance_score': compliance_score
        }

    def run_comprehensive_security_validation(self) -> Dict[str, Any]:
        """Run complete security validation suite"""
        print("🔒 Starting Comprehensive Security Validation...")
        
        # Test endpoints to validate
        test_endpoints = [
            'ai-leader-quality-agent',
            'ai-leader-transparency-agent',
            'daughter-community-rag-agent',
            'agent-coordination'
        ]
        
        for endpoint in test_endpoints:
            print(f"  Testing {endpoint}...")
            
            endpoint_results = {
                'cors': self.test_cors_headers(endpoint),
                'authentication': self.test_authentication_enforcement(endpoint),
                'input_sanitization': self.test_input_sanitization(endpoint),
                'security_headers': self.test_security_headers(endpoint),
                'rate_limiting': self.test_rate_limiting(endpoint)
            }
            
            self.results['security_tests'][endpoint] = endpoint_results
        
        # GDPR compliance testing
        print("  Testing GDPR compliance...")
        self.results['gdpr_tests'] = self.test_gdpr_compliance()
        
        # Calculate overall security score
        security_scores = []
        for endpoint, tests in self.results['security_tests'].items():
            endpoint_score = 0
            total_tests = 0
            
            if tests['cors'].get('cors_configured', False):
                endpoint_score += 20
            if tests['authentication'].get('auth_enforced', False):
                endpoint_score += 30
            if tests['input_sanitization'].get('sanitization_working', False):
                endpoint_score += 25
            endpoint_score += tests['security_headers'].get('security_score', 0) * 0.2
            if tests['rate_limiting'].get('rate_limiting_active', False):
                endpoint_score += 5
            
            security_scores.append(min(100, endpoint_score))
        
        gdpr_score = self.results['gdpr_tests'].get('compliance_score', 0)
        overall_score = (sum(security_scores) / len(security_scores) + gdpr_score) / 2 if security_scores else gdpr_score
        
        self.results['overall_score'] = overall_score
        
        print(f"\n📊 Security Validation Results:")
        print(f"   Overall Security Score: {overall_score:.1f}%")
        print(f"   GDPR Compliance Score: {gdpr_score:.1f}%")
        print(f"   Endpoints Tested: {len(test_endpoints)}")
        
        # Save results
        with open('security_validation_results.json', 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"   Results saved to security_validation_results.json")
        
        return self.results

if __name__ == "__main__":
    suite = SecurityValidationSuite()
    results = suite.run_comprehensive_security_validation()
