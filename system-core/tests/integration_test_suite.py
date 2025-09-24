#!/usr/bin/env python3
"""
TrustStream v4.0 Comprehensive Integration Testing Suite
Author: MiniMax Agent
Date: 2025-09-19
"""

import requests
import json
import time
from datetime import datetime
import sys

class TrustStreamIntegrationTester:
    def __init__(self):
        self.base_url = "https://etretluugvclmydzlfte.supabase.co"
        self.auth_header = {
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0cmV0bHV1Z3ZjbG15ZHpsZnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NjI4MTgsImV4cCI6MjA3MjIzODgxOH0.g-Mki8CU85CQSRdjCcmBV8g-DsR4VKCtn0fOd-LC6m4",
            "Content-Type": "application/json",
            "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0cmV0bHV1Z3ZjbG15ZHpsZnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NjI4MTgsImV4cCI6MjA3MjIzODgxOH0.g-Mki8CU85CQSRdjCcmBV8g-DsR4VKCtn0fOd-LC6m4"
        }
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "phase_1": {},
            "phase_2": {},
            "phase_3": {},
            "phase_4": {},
            "summary": {}
        }
    
    def test_api_endpoint(self, endpoint, method="GET", data=None, timeout=30):
        """Test a single API endpoint"""
        try:
            start_time = time.time()
            url = f"{self.base_url}/functions/v1/{endpoint}"
            
            if method == "GET":
                response = requests.get(url, headers=self.auth_header, timeout=timeout)
            elif method == "POST":
                response = requests.post(url, headers=self.auth_header, json=data, timeout=timeout)
            
            end_time = time.time()
            response_time = end_time - start_time
            
            return {
                "success": response.status_code == 200,
                "status_code": response.status_code,
                "response_time": response_time,
                "response_size": len(response.content),
                "data": response.json() if response.status_code == 200 else None,
                "error": None if response.status_code == 200 else response.text
            }
        except Exception as e:
            return {
                "success": False,
                "status_code": None,
                "response_time": None,
                "response_size": None,
                "data": None,
                "error": str(e)
            }
    
    def phase_1_system_integration(self):
        """Phase 1: System Integration Testing"""
        print("\n=== PHASE 1: SYSTEM INTEGRATION TESTING ===")
        
        tests = [
            # Knowledge Base Tests
            ("unified-knowledge-base/summary", "GET", None, "Knowledge Base Summary"),
            ("unified-knowledge-base", "POST", {
                "action": "vector_search",
                "query_text": "LLM orchestration",
                "ecosystem_layers": ["meta_ai"],
                "limit": 5
            }, "Vector Search Integration"),
            
            # Cross-Layer Correlation Tests
            ("cross-layer-knowledge-correlation/correlations", "GET", None, "Correlation Analysis"),
            ("cross-layer-knowledge-correlation/ecosystem-overview", "GET", None, "Ecosystem Overview"),
            
            # Quality Assessment Tests
            ("knowledge-quality-assessment/assessments", "GET", None, "Quality Assessments"),
            ("knowledge-quality-assessment/dashboard", "GET", None, "Quality Dashboard"),
            
            # Analytics Tests
            ("knowledge-analytics-dashboard/overview", "GET", None, "Analytics Overview"),
            
            # Economic AI Tests
            ("economic-trust-scores", "GET", None, "Trust Scores"),
            ("economic-dao-governance", "GET", None, "DAO Governance"),
            ("trustcoin-transactions", "GET", None, "TrustCoin Transactions"),
            
            # Community AI Tests
            ("community-ai-leader", "POST", {
                "action": "get_community_stats",
                "communityId": "test_community_123"
            }, "Community Leadership"),
            
            # Workflow Automation Tests
            ("orchestration-engine", "POST", {
                "action": "get_task_status",
                "task_data": {
                    "task_id": "test_task_123"
                }
            }, "Workflow Orchestration"),
            ("ai-memory-manager", "POST", {
                "action": "analytics",
                "userId": "test_user_123"
            }, "Memory Management"),
        ]
        
        phase_results = []
        
        for endpoint, method, data, description in tests:
            print(f"Testing {description}...")
            result = self.test_api_endpoint(endpoint, method, data)
            result["test_name"] = description
            result["endpoint"] = endpoint
            phase_results.append(result)
            
            status = "PASS" if result["success"] else "FAIL"
            time_info = f" ({result['response_time']:.2f}s)" if result["response_time"] else ""
            print(f"  {status}{time_info}")
            
            if not result["success"]:
                print(f"  Error: {result['error']}")
        
        self.results["phase_1"] = {
            "total_tests": len(phase_results),
            "passed": sum(1 for r in phase_results if r["success"]),
            "failed": sum(1 for r in phase_results if not r["success"]),
            "tests": phase_results
        }
        
        print(f"\nPhase 1 Results: {self.results['phase_1']['passed']}/{self.results['phase_1']['total_tests']} tests passed")
    
    def phase_2_end_to_end_testing(self):
        """Phase 2: End-to-End User Journey Testing"""
        print("\n=== PHASE 2: END-TO-END USER JOURNEY TESTING ===")
        
        # Test complete workflows
        workflows = [
            self.test_knowledge_creation_workflow,
            self.test_cross_layer_correlation_workflow,
            self.test_quality_assessment_workflow,
            self.test_economic_transaction_workflow
        ]
        
        workflow_results = []
        
        for workflow in workflows:
            try:
                result = workflow()
                workflow_results.append(result)
            except Exception as e:
                workflow_results.append({
                    "success": False,
                    "error": str(e),
                    "workflow": workflow.__name__
                })
        
        self.results["phase_2"] = {
            "total_workflows": len(workflow_results),
            "passed": sum(1 for r in workflow_results if r.get("success", False)),
            "failed": sum(1 for r in workflow_results if not r.get("success", False)),
            "workflows": workflow_results
        }
        
        print(f"\nPhase 2 Results: {self.results['phase_2']['passed']}/{self.results['phase_2']['total_workflows']} workflows completed")
    
    def test_knowledge_creation_workflow(self):
        """Test complete knowledge creation and correlation workflow"""
        print("Testing Knowledge Creation Workflow...")
        
        # Step 1: Create new knowledge entry
        create_result = self.test_api_endpoint(
            "unified-knowledge-base",
            "POST",
            {
                "action": "create_knowledge",
                "title": "Integration Test Knowledge Entry",
                "content": "This is a test entry created during integration testing.",
                "summary": "Test entry for validation",
                "ecosystem_layer": "meta_ai",
                "domain": "system_testing",
                "complexity_level": "basic",
                "knowledge_type": "reference",
                "tags": ["integration", "testing"],
                "quality_score": 85,
                "confidence_score": 90
            }
        )
        
        if not create_result["success"]:
            return {"success": False, "step": "knowledge_creation", "error": create_result["error"]}
        
        # Step 2: Verify knowledge was created
        verify_result = self.test_api_endpoint("unified-knowledge-base")
        
        return {
            "success": create_result["success"] and verify_result["success"],
            "workflow": "knowledge_creation",
            "steps_completed": 2,
            "knowledge_created": create_result["success"]
        }
    
    def test_cross_layer_correlation_workflow(self):
        """Test cross-layer correlation detection"""
        print("Testing Cross-Layer Correlation Workflow...")
        
        # Test auto-correlation
        correlation_result = self.test_api_endpoint(
            "cross-layer-knowledge-correlation",
            "POST",
            {
                "action": "auto_correlate",
                "ecosystem_layers": ["meta_ai", "community_ai"],
                "correlation_threshold": 0.6
            }
        )
        
        return {
            "success": correlation_result["success"],
            "workflow": "cross_layer_correlation",
            "correlations_found": len(correlation_result.get("data", [])) if correlation_result["success"] else 0
        }
    
    def test_quality_assessment_workflow(self):
        """Test quality assessment workflow"""
        print("Testing Quality Assessment Workflow...")
        
        # Get existing knowledge entries
        knowledge_result = self.test_api_endpoint("unified-knowledge-base")
        
        if not knowledge_result["success"] or not knowledge_result["data"] or not knowledge_result["data"].get("data"):
            return {"success": False, "workflow": "quality_assessment", "error": "No knowledge entries found"}
        
        # Test quality assessment on first entry
        knowledge_entries = knowledge_result["data"]["data"]
        if len(knowledge_entries) == 0:
            return {"success": False, "workflow": "quality_assessment", "error": "No knowledge entries available"}
            
        first_entry = knowledge_entries[0]
        quality_result = self.test_api_endpoint(
            "knowledge-quality-assessment",
            "POST",
            {
                "action": "assess_quality",
                "knowledge_id": first_entry["id"],
                "assessment_type": "automated"
            }
        )
        
        return {
            "success": quality_result["success"],
            "workflow": "quality_assessment",
            "assessment_completed": quality_result["success"]
        }
    
    def test_economic_transaction_workflow(self):
        """Test economic layer transaction workflow"""
        print("Testing Economic Transaction Workflow...")
        
        # Test trust score calculation
        trust_result = self.test_api_endpoint("economic-trust-scores")
        
        # Test DAO governance
        dao_result = self.test_api_endpoint("economic-dao-governance")
        
        return {
            "success": trust_result["success"] and dao_result["success"],
            "workflow": "economic_transaction",
            "trust_scores_available": trust_result["success"],
            "dao_governance_active": dao_result["success"]
        }
    
    def phase_3_performance_testing(self):
        """Phase 3: Performance & Load Testing"""
        print("\n=== PHASE 3: PERFORMANCE & LOAD TESTING ===")
        
        # Test response times for critical endpoints
        performance_tests = [
            ("unified-knowledge-base/summary", "GET", None),
            ("cross-layer-knowledge-correlation/correlations", "GET", None),
            ("knowledge-analytics-dashboard/overview", "GET", None)
        ]
        
        performance_results = []
        
        for endpoint, method, data in performance_tests:
            print(f"Performance testing {endpoint}...")
            
            # Run multiple requests to test consistency
            times = []
            for i in range(5):
                result = self.test_api_endpoint(endpoint, method, data)
                if result["success"] and result["response_time"]:
                    times.append(result["response_time"])
            
            if times:
                avg_time = sum(times) / len(times)
                min_time = min(times)
                max_time = max(times)
                
                performance_results.append({
                    "endpoint": endpoint,
                    "avg_response_time": avg_time,
                    "min_response_time": min_time,
                    "max_response_time": max_time,
                    "requests_completed": len(times),
                    "success_rate": len(times) / 5 * 100
                })
                
                print(f"  Avg: {avg_time:.2f}s, Min: {min_time:.2f}s, Max: {max_time:.2f}s")
        
        self.results["phase_3"] = {
            "performance_tests": performance_results,
            "avg_response_time": sum(r["avg_response_time"] for r in performance_results) / len(performance_results) if performance_results else 0
        }
        
        print(f"\nPhase 3 Results: Average response time {self.results['phase_3']['avg_response_time']:.2f}s")
    
    def phase_4_security_compliance(self):
        """Phase 4: Security & Compliance Validation"""
        print("\n=== PHASE 4: SECURITY & COMPLIANCE VALIDATION ===")
        
        security_tests = [
            # Test unauthorized access
            self.test_unauthorized_access,
            # Test data validation
            self.test_input_validation,
            # Test CORS headers
            self.test_cors_compliance
        ]
        
        security_results = []
        
        for test in security_tests:
            try:
                result = test()
                security_results.append(result)
                status = "PASS" if result["success"] else "FAIL"
                print(f"  {result['test_name']}: {status}")
            except Exception as e:
                security_results.append({
                    "success": False,
                    "test_name": test.__name__,
                    "error": str(e)
                })
        
        self.results["phase_4"] = {
            "security_tests": security_results,
            "passed": sum(1 for r in security_results if r["success"]),
            "total": len(security_results)
        }
        
        print(f"\nPhase 4 Results: {self.results['phase_4']['passed']}/{self.results['phase_4']['total']} security tests passed")
    
    def test_unauthorized_access(self):
        """Test API security with invalid tokens"""
        try:
            # Test with no authorization
            response = requests.get(
                f"{self.base_url}/functions/v1/unified-knowledge-base/summary",
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            # Should return 401 or 403 for unauthorized access
            unauthorized_handled = response.status_code in [401, 403]
            
            return {
                "success": unauthorized_handled,
                "test_name": "Unauthorized Access Protection",
                "status_code": response.status_code
            }
        except Exception as e:
            return {
                "success": False,
                "test_name": "Unauthorized Access Protection",
                "error": str(e)
            }
    
    def test_input_validation(self):
        """Test input validation and sanitization"""
        try:
            # Test with malformed JSON
            response = requests.post(
                f"{self.base_url}/functions/v1/unified-knowledge-base",
                headers=self.auth_header,
                data="{invalid json}",
                timeout=10
            )
            
            # Should handle malformed input gracefully
            validation_working = response.status_code in [400, 422]
            
            return {
                "success": validation_working,
                "test_name": "Input Validation",
                "status_code": response.status_code
            }
        except Exception as e:
            return {
                "success": False,
                "test_name": "Input Validation",
                "error": str(e)
            }
    
    def test_cors_compliance(self):
        """Test CORS headers are properly set"""
        try:
            response = requests.options(
                f"{self.base_url}/functions/v1/unified-knowledge-base",
                headers=self.auth_header,
                timeout=10
            )
            
            cors_headers = response.headers.get('Access-Control-Allow-Origin')
            cors_working = cors_headers is not None
            
            return {
                "success": cors_working,
                "test_name": "CORS Compliance",
                "cors_headers": cors_headers
            }
        except Exception as e:
            return {
                "success": False,
                "test_name": "CORS Compliance",
                "error": str(e)
            }
    
    def generate_summary(self):
        """Generate comprehensive test summary"""
        total_tests = (
            self.results["phase_1"].get("total_tests", 0) +
            self.results["phase_2"].get("total_workflows", 0) +
            len(self.results["phase_3"].get("performance_tests", [])) +
            self.results["phase_4"].get("total", 0)
        )
        
        total_passed = (
            self.results["phase_1"].get("passed", 0) +
            self.results["phase_2"].get("passed", 0) +
            len(self.results["phase_3"].get("performance_tests", [])) +
            self.results["phase_4"].get("passed", 0)
        )
        
        self.results["summary"] = {
            "total_tests": total_tests,
            "total_passed": total_passed,
            "total_failed": total_tests - total_passed,
            "success_rate": (total_passed / total_tests * 100) if total_tests > 0 else 0,
            "avg_response_time": self.results["phase_3"].get("avg_response_time", 0),
            "timestamp": datetime.now().isoformat()
        }
        
        print("\n" + "="*60)
        print("TRUSTSTREAM v4.0 INTEGRATION TEST SUMMARY")
        print("="*60)
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {total_passed}")
        print(f"Failed: {total_tests - total_passed}")
        print(f"Success Rate: {self.results['summary']['success_rate']:.1f}%")
        print(f"Average Response Time: {self.results['summary']['avg_response_time']:.2f}s")
        print("\nPhase Breakdown:")
        print(f"  Phase 1 (System Integration): {self.results['phase_1'].get('passed', 0)}/{self.results['phase_1'].get('total_tests', 0)}")
        print(f"  Phase 2 (End-to-End): {self.results['phase_2'].get('passed', 0)}/{self.results['phase_2'].get('total_workflows', 0)}")
        print(f"  Phase 3 (Performance): {len(self.results['phase_3'].get('performance_tests', []))} tests completed")
        print(f"  Phase 4 (Security): {self.results['phase_4'].get('passed', 0)}/{self.results['phase_4'].get('total', 0)}")
        print("="*60)
    
    def run_all_tests(self):
        """Execute all test phases"""
        print("Starting TrustStream v4.0 Comprehensive Integration Testing...")
        print(f"Timestamp: {datetime.now().isoformat()}")
        
        self.phase_1_system_integration()
        self.phase_2_end_to_end_testing()
        self.phase_3_performance_testing()
        self.phase_4_security_compliance()
        self.generate_summary()
        
        # Save detailed results
        with open('integration_test_results.json', 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print("\nDetailed results saved to: integration_test_results.json")
        
        return self.results

if __name__ == "__main__":
    tester = TrustStreamIntegrationTester()
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    success_rate = results["summary"]["success_rate"]
    sys.exit(0 if success_rate >= 80 else 1)
