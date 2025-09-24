#!/usr/bin/env python3
"""
RAG Primary Request Analysis Agent - Comprehensive Test Suite
Validates all RAG agent capabilities and integration points
Author: MiniMax Agent
Created: 2025-09-20 08:53:50
"""

import json
import requests
import time
import uuid
from typing import Dict, Any, List

class RAGAgentTester:
    def __init__(self, supabase_url: str, supabase_key: str):
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        self.headers = {
            'Authorization': f'Bearer {supabase_key}',
            'Content-Type': 'application/json',
            'apikey': supabase_key
        }
        self.rag_agent_url = f"{supabase_url}/functions/v1/rag-primary-request-analysis-agent"
        self.agent_spawner_url = f"{supabase_url}/functions/v1/agent-spawner"
        
        # Test data
        self.test_user_id = str(uuid.uuid4())
        self.test_community_id = str(uuid.uuid4())
        self.test_requests = [
            "Help me create a comprehensive marketing campaign for my new SaaS product launch",
            "I need to build a data analytics dashboard for customer insights and business intelligence",
            "Create a research project to analyze market trends in the renewable energy sector",
            "Develop a content strategy for social media engagement and brand awareness",
            "Build a customer support system with AI-powered chatbots and ticketing"
        ]
        
        self.results = []
    
    def log_test(self, test_name: str, success: bool, details: Dict[Any, Any] = None):
        """Log test results"""
        result = {
            'test_name': test_name,
            'success': success,
            'timestamp': time.time(),
            'details': details or {}
        }
        self.results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"     Details: {details}")
    
    def test_agent_initialization(self) -> bool:
        """Test RAG agent initialization"""
        try:
            response = requests.post(
                self.rag_agent_url,
                headers=self.headers,
                json={
                    'action': 'initialize',
                    'agent_instance_id': f'test_pra_{int(time.time())}'
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json().get('data', {})
                success = (
                    data.get('status') == 'initialized' and
                    'knowledge_base_id' in data and
                    data.get('learning_enabled') == True
                )
                self.log_test('Agent Initialization', success, {
                    'agent_type': data.get('agent_type'),
                    'status': data.get('status'),
                    'capabilities_count': len(data.get('capabilities', []))
                })
                return success
            else:
                self.log_test('Agent Initialization', False, {
                    'status_code': response.status_code,
                    'error': response.text
                })
                return False
                
        except Exception as e:
            self.log_test('Agent Initialization', False, {'error': str(e)})
            return False
    
    def test_request_analysis(self) -> bool:
        """Test RAG-enhanced request analysis"""
        success_count = 0
        
        for i, request in enumerate(self.test_requests):
            try:
                response = requests.post(
                    self.rag_agent_url,
                    headers=self.headers,
                    json={
                        'action': 'analyze_request',
                        'user_request': request,
                        'user_id': self.test_user_id,
                        'learning_mode': True
                    },
                    timeout=45
                )
                
                if response.status_code == 200:
                    data = response.json().get('data', {})
                    analysis_result = data.get('analysis_result', {})
                    
                    test_success = (
                        'analysis_id' in data and
                        'complexity_assessment' in data and
                        analysis_result.get('confidence', 0) > 0.5 and
                        len(analysis_result.get('domain_areas', [])) > 0
                    )
                    
                    if test_success:
                        success_count += 1
                    
                    self.log_test(f'Request Analysis {i+1}', test_success, {
                        'confidence': analysis_result.get('confidence'),
                        'complexity_level': analysis_result.get('complexity_level'),
                        'domain_areas': analysis_result.get('domain_areas'),
                        'knowledge_applied': data.get('learning_applied', {}).get('knowledge_chunks_used', 0),
                        'patterns_matched': data.get('learning_applied', {}).get('patterns_matched', 0),
                        'processing_time_ms': data.get('processing_time_ms')
                    })
                else:
                    self.log_test(f'Request Analysis {i+1}', False, {
                        'status_code': response.status_code,
                        'error': response.text[:200]
                    })
                    
            except Exception as e:
                self.log_test(f'Request Analysis {i+1}', False, {'error': str(e)})
        
        overall_success = success_count >= len(self.test_requests) * 0.8  # 80% success rate
        self.log_test('Overall Request Analysis', overall_success, {
            'success_rate': f'{success_count}/{len(self.test_requests)}',
            'percentage': f'{(success_count/len(self.test_requests)*100):.1f}%'
        })
        
        return overall_success
    
    def test_knowledge_query(self) -> bool:
        """Test knowledge base querying"""
        try:
            response = requests.post(
                self.rag_agent_url,
                headers=self.headers,
                json={
                    'action': 'query_knowledge',
                    'query': 'marketing campaign',
                    'limit': 5
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json().get('data', {})
                success = (
                    'entries' in data and
                    'total_count' in data and
                    'search_metadata' in data
                )
                
                self.log_test('Knowledge Query', success, {
                    'total_results': data.get('total_count'),
                    'search_type': data.get('search_metadata', {}).get('search_type')
                })
                return success
            else:
                self.log_test('Knowledge Query', False, {
                    'status_code': response.status_code,
                    'error': response.text
                })
                return False
                
        except Exception as e:
            self.log_test('Knowledge Query', False, {'error': str(e)})
            return False
    
    def test_learning_stats(self) -> bool:
        """Test learning statistics retrieval"""
        try:
            response = requests.post(
                self.rag_agent_url,
                headers=self.headers,
                json={
                    'action': 'get_learning_stats',
                    'agent_instance_id': f'test_pra_{int(time.time())}'
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json().get('data', {})
                success = (
                    'total_sessions' in data and
                    'successful_sessions' in data and
                    'success_rate' in data
                )
                
                self.log_test('Learning Statistics', success, {
                    'total_sessions': data.get('total_sessions'),
                    'success_rate': data.get('success_rate')
                })
                return success
            else:
                self.log_test('Learning Statistics', False, {
                    'status_code': response.status_code,
                    'error': response.text
                })
                return False
                
        except Exception as e:
            self.log_test('Learning Statistics', False, {'error': str(e)})
            return False
    
    def test_agent_spawner_integration(self) -> bool:
        """Test integration with agent spawner"""
        try:
            response = requests.post(
                self.agent_spawner_url,
                headers=self.headers,
                json={
                    'action': 'deploy_agent',
                    'community_id': self.test_community_id,
                    'agent_type': 'primary_request_analysis_agent',
                    'user_id': self.test_user_id,
                    'agent_config': {'learning_enabled': True}
                },
                timeout=45
            )
            
            if response.status_code == 200:
                data = response.json().get('data', {})
                success = (
                    'agent_id' in data and
                    data.get('agent_type') == 'primary_request_analysis_agent' and
                    data.get('status') in ['deployed', 'already_exists']
                )
                
                self.log_test('Agent Spawner Integration', success, {
                    'agent_id': data.get('agent_id'),
                    'status': data.get('status'),
                    'message': data.get('message')
                })
                return success
            else:
                self.log_test('Agent Spawner Integration', False, {
                    'status_code': response.status_code,
                    'error': response.text
                })
                return False
                
        except Exception as e:
            self.log_test('Agent Spawner Integration', False, {'error': str(e)})
            return False
    
    def test_pattern_learning(self) -> bool:
        """Test pattern learning and matching"""
        try:
            # Test multiple similar requests to see if patterns are learned
            marketing_requests = [
                "Create a marketing strategy for social media",
                "Develop a marketing campaign for brand awareness",
                "Build a marketing plan for product launch"
            ]
            
            pattern_matches = 0
            confidence_improvements = []
            
            for request in marketing_requests:
                response = requests.post(
                    self.rag_agent_url,
                    headers=self.headers,
                    json={
                        'action': 'analyze_request',
                        'user_request': request,
                        'user_id': self.test_user_id,
                        'learning_mode': True
                    },
                    timeout=45
                )
                
                if response.status_code == 200:
                    data = response.json().get('data', {})
                    analysis = data.get('analysis_result', {})
                    learning = data.get('learning_applied', {})
                    
                    if learning.get('patterns_matched', 0) > 0:
                        pattern_matches += 1
                    
                    confidence_improvements.append(analysis.get('confidence', 0))
            
            success = pattern_matches > 0  # At least one pattern match
            
            self.log_test('Pattern Learning', success, {
                'pattern_matches': pattern_matches,
                'total_requests': len(marketing_requests),
                'avg_confidence': sum(confidence_improvements) / len(confidence_improvements) if confidence_improvements else 0
            })
            
            return success
            
        except Exception as e:
            self.log_test('Pattern Learning', False, {'error': str(e)})
            return False
    
    def test_feedback_learning(self) -> bool:
        """Test feedback learning capability"""
        try:
            # First, perform an analysis
            analysis_response = requests.post(
                self.rag_agent_url,
                headers=self.headers,
                json={
                    'action': 'analyze_request',
                    'user_request': 'Create a customer support system',
                    'user_id': self.test_user_id,
                    'learning_mode': True
                },
                timeout=45
            )
            
            if analysis_response.status_code != 200:
                self.log_test('Feedback Learning', False, {
                    'error': 'Failed to perform initial analysis'
                })
                return False
            
            analysis_data = analysis_response.json().get('data', {})
            analysis_id = analysis_data.get('analysis_id')
            
            if not analysis_id:
                self.log_test('Feedback Learning', False, {
                    'error': 'No analysis_id returned'
                })
                return False
            
            # Then, provide feedback
            feedback_response = requests.post(
                self.rag_agent_url,
                headers=self.headers,
                json={
                    'action': 'learn_from_feedback',
                    'analysis_id': analysis_id,
                    'feedback': {
                        'satisfaction_score': 0.9,
                        'accuracy_rating': 4,
                        'comment': 'Excellent analysis'
                    },
                    'outcome': {
                        'success': True,
                        'implementation_quality': 0.85
                    }
                },
                timeout=30
            )
            
            if feedback_response.status_code == 200:
                data = feedback_response.json().get('data', {})
                success = data.get('feedback_learned', False)
                
                self.log_test('Feedback Learning', success, {
                    'analysis_id': analysis_id,
                    'feedback_learned': success
                })
                return success
            else:
                self.log_test('Feedback Learning', False, {
                    'status_code': feedback_response.status_code,
                    'error': feedback_response.text
                })
                return False
                
        except Exception as e:
            self.log_test('Feedback Learning', False, {'error': str(e)})
            return False
    
    def run_comprehensive_test(self) -> Dict[str, Any]:
        """Run all tests and return comprehensive results"""
        print("\n" + "="*60)
        print("RAG PRIMARY REQUEST ANALYSIS AGENT - COMPREHENSIVE TESTS")
        print("="*60)
        
        start_time = time.time()
        
        # Run all tests
        test_methods = [
            self.test_agent_initialization,
            self.test_request_analysis,
            self.test_knowledge_query,
            self.test_learning_stats,
            self.test_agent_spawner_integration,
            self.test_pattern_learning,
            self.test_feedback_learning
        ]
        
        for test_method in test_methods:
            test_method()
            time.sleep(1)  # Brief pause between tests
        
        end_time = time.time()
        
        # Calculate results
        total_tests = len(self.results)
        passed_tests = sum(1 for result in self.results if result['success'])
        success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        
        summary = {
            'total_tests': total_tests,
            'passed_tests': passed_tests,
            'failed_tests': total_tests - passed_tests,
            'success_rate': success_rate,
            'execution_time': end_time - start_time,
            'status': 'PASS' if success_rate >= 80 else 'FAIL',
            'details': self.results
        }
        
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        print(f"Execution Time: {end_time - start_time:.2f} seconds")
        print(f"Overall Status: {summary['status']}")
        
        if summary['status'] == 'PASS':
            print("\n✅ RAG Primary Request Analysis Agent is PRODUCTION READY!")
        else:
            print("\n❌ RAG Primary Request Analysis Agent needs attention")
        
        return summary

def main():
    """Main test execution"""
    # Configuration (replace with actual values)
    SUPABASE_URL = "https://etretluugvclmydzlfte.supabase.co"
    SUPABASE_KEY = "your_supabase_service_role_key_here"
    
    if SUPABASE_KEY == "your_supabase_service_role_key_here":
        print("⚠️ Please update SUPABASE_KEY with your actual service role key")
        return
    
    tester = RAGAgentTester(SUPABASE_URL, SUPABASE_KEY)
    results = tester.run_comprehensive_test()
    
    # Save results to file
    with open('/workspace/truststream-v4.1-production/tests/rag_agent_test_results.json', 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\nDetailed results saved to: rag_agent_test_results.json")
    
    return results['status'] == 'PASS'

if __name__ == "__main__":
    main()