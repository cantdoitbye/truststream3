#!/usr/bin/env python3
"""
Economic AI Integration Test Suite
Tests the integration between governance agents and economic systems
"""

import asyncio
import json
import time
import requests
from typing import Dict, List, Any
from datetime import datetime, timedelta
import unittest

class EconomicAIIntegrationTest(unittest.TestCase):
    """Test suite for Economic AI Integration functionality"""
    
    def setUp(self):
        """Set up test environment"""
        self.base_url = "http://localhost:54321"  # Supabase local development
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": "Bearer test-token",
            "apikey": "test-api-key"
        }
        self.test_agent_id = "test-agent-123"
        self.test_decision_id = "test-decision-456"
        
    def test_economic_impact_analysis(self):
        """Test economic impact analysis functionality"""
        print("\n=== Testing Economic Impact Analysis ===")
        
        # Test data for economic impact analysis
        test_data = {
            "action": "analyze_economic_impact",
            "decision_type": "proposal_approval",
            "decision_data": {
                "proposal_id": "prop_123",
                "estimated_cost": 5000.0,
                "estimated_benefit": 8000.0,
                "affected_agents": ["agent1", "agent2", "agent3"],
                "implementation_timeline": "60d"
            },
            "analysis_type": "comprehensive"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/functions/v1/economic-ai-integration",
                headers=self.headers,
                json=test_data,
                timeout=30
            )
            
            print(f"Response Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print("✅ Economic impact analysis successful")
                print(f"Cost-Benefit Ratio: {result.get('data', {}).get('impact_analysis', {}).get('cost_benefit_ratio', 'N/A')}")
                print(f"ROI Estimate: {result.get('data', {}).get('impact_analysis', {}).get('roi_estimate', 'N/A')}")
                print(f"Risk Level: {result.get('data', {}).get('impact_analysis', {}).get('risk_level', 'N/A')}")
                return True
            else:
                print(f"❌ Economic impact analysis failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Economic impact analysis error: {str(e)}")
            return False
    
    def test_governance_transaction_creation(self):
        """Test governance transaction creation"""
        print("\n=== Testing Governance Transaction Creation ===")
        
        test_data = {
            "action": "create_governance_transaction",
            "transaction_type": "fee",
            "from_agent_id": self.test_agent_id,
            "to_agent_id": None,
            "amount": 100.0,
            "governance_context": {
                "decision_id": self.test_decision_id,
                "fee_type": "proposal_submission",
                "description": "Proposal submission fee",
                "impact_level": "medium"
            }
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/functions/v1/economic-ai-integration",
                headers=self.headers,
                json=test_data,
                timeout=30
            )
            
            print(f"Response Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print("✅ Governance transaction created successfully")
                print(f"Transaction ID: {result.get('data', {}).get('transaction_id', 'N/A')}")
                print(f"Status: {result.get('data', {}).get('status', 'N/A')}")
                return True
            else:
                print(f"❌ Governance transaction creation failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Governance transaction error: {str(e)}")
            return False
    
    def test_governance_fee_processing(self):
        """Test governance fee processing"""
        print("\n=== Testing Governance Fee Processing ===")
        
        test_data = {
            "action": "process_governance_fee",
            "fee_type": "proposal_submission",
            "amount": 50.0,
            "currency": "usd",
            "agent_id": self.test_agent_id,
            "governance_context": {
                "proposal_id": "prop_456",
                "urgency": "standard",
                "agent_email": "test@truststream.ai"
            }
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/functions/v1/economic-ai-integration",
                headers=self.headers,
                json=test_data,
                timeout=30
            )
            
            print(f"Response Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print("✅ Governance fee processing successful")
                print(f"Fee ID: {result.get('data', {}).get('fee_id', 'N/A')}")
                print(f"Payment Intent ID: {result.get('data', {}).get('payment_intent_id', 'N/A')}")
                print(f"Amount: ${result.get('data', {}).get('amount', 'N/A')}")
                return True
            else:
                print(f"❌ Governance fee processing failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Governance fee processing error: {str(e)}")
            return False
    
    def test_economic_report_generation(self):
        """Test economic report generation"""
        print("\n=== Testing Economic Report Generation ===")
        
        test_data = {
            "action": "generate_economic_report",
            "time_range": "30d",
            "report_type": "governance_impact",
            "filters": {
                "include_governance": True,
                "include_transactions": True
            },
            "format": "comprehensive"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/functions/v1/economic-ai-integration",
                headers=self.headers,
                json=test_data,
                timeout=30
            )
            
            print(f"Response Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print("✅ Economic report generation successful")
                print(f"Report ID: {result.get('data', {}).get('report_id', 'N/A')}")
                print(f"Report Type: {result.get('data', {}).get('report_type', 'N/A')}")
                print(f"Data Completeness: {result.get('data', {}).get('data_completeness', 'N/A')}")
                return True
            else:
                print(f"❌ Economic report generation failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Economic report generation error: {str(e)}")
            return False
    
    def test_decision_impact_tracking(self):
        """Test decision impact tracking"""
        print("\n=== Testing Decision Impact Tracking ===")
        
        test_data = {
            "action": "track_decision_impact",
            "decision_id": self.test_decision_id,
            "decision_type": "proposal_approval",
            "tracking_period": "90d",
            "metrics_to_track": [
                "trust_score_changes",
                "transaction_volume_impact",
                "dao_participation_changes",
                "economic_health_indicators"
            ]
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/functions/v1/economic-ai-integration",
                headers=self.headers,
                json=test_data,
                timeout=30
            )
            
            print(f"Response Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print("✅ Decision impact tracking setup successful")
                print(f"Tracking ID: {result.get('data', {}).get('tracking_id', 'N/A')}")
                print(f"Status: {result.get('data', {}).get('status', 'N/A')}")
                print(f"Next Measurement: {result.get('data', {}).get('next_measurement', 'N/A')}")
                return True
            else:
                print(f"❌ Decision impact tracking failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Decision impact tracking error: {str(e)}")
            return False
    
    def test_cost_benefit_calculation(self):
        """Test cost-benefit calculation"""
        print("\n=== Testing Cost-Benefit Calculation ===")
        
        test_data = {
            "action": "calculate_cost_benefit",
            "proposal_data": {
                "implementation_cost": 10000,
                "operational_cost_annual": 2000,
                "expected_benefits": {
                    "efficiency_gains": 15000,
                    "quality_improvements": 8000,
                    "risk_reduction": 5000
                },
                "timeline": "24m"
            },
            "time_horizon": "24m",
            "discount_rate": 0.08
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/functions/v1/economic-ai-integration",
                headers=self.headers,
                json=test_data,
                timeout=30
            )
            
            print(f"Response Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print("✅ Cost-benefit calculation successful")
                data = result.get('data', {})
                print(f"Total Costs: ${data.get('cost_breakdown', {}).get('total_costs', 'N/A')}")
                print(f"Simple ROI: {data.get('roi_metrics', {}).get('simple_roi', 'N/A')}%")
                print(f"Payback Period: {data.get('roi_metrics', {}).get('payback_period', 'N/A')}")
                print(f"Recommendation: {data.get('recommendation', 'N/A')}")
                return True
            else:
                print(f"❌ Cost-benefit calculation failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Cost-benefit calculation error: {str(e)}")
            return False
    
    def test_economic_dashboard(self):
        """Test economic dashboard functionality"""
        print("\n=== Testing Economic Dashboard ===")
        
        test_data = {
            "action": "get_economic_dashboard",
            "dashboard_type": "governance",
            "real_time": True
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/functions/v1/economic-ai-integration",
                headers=self.headers,
                json=test_data,
                timeout=30
            )
            
            print(f"Response Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print("✅ Economic dashboard data retrieved successfully")
                data = result.get('data', {})
                print(f"Dashboard Type: {data.get('dashboard_type', 'N/A')}")
                print(f"Last Updated: {data.get('last_updated', 'N/A')}")
                print(f"Refresh Interval: {data.get('refresh_interval', 'N/A')}ms")
                
                # Print key metrics if available
                metrics = data.get('real_time_metrics', {})
                if metrics:
                    print("Key Metrics:")
                    for key, value in metrics.items():
                        if isinstance(value, (int, float)):
                            print(f"  {key}: {value}")
                
                return True
            else:
                print(f"❌ Economic dashboard retrieval failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Economic dashboard error: {str(e)}")
            return False
    
    def test_incentive_distribution(self):
        """Test economic incentive distribution"""
        print("\n=== Testing Economic Incentive Distribution ===")
        
        test_data = {
            "action": "distribute_economic_incentives",
            "distribution_type": "performance_reward",
            "recipients": [
                {"agent_id": "agent1", "score": 85},
                {"agent_id": "agent2", "score": 92},
                {"agent_id": "agent3", "score": 78}
            ],
            "total_amount": 1000.0,
            "distribution_criteria": {
                "weight_by_score": True,
                "minimum_score": 70,
                "bonus_threshold": 90
            },
            "governance_context": {
                "reason": "Q4 performance rewards",
                "approved_by": "governance_committee"
            }
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/functions/v1/economic-ai-integration",
                headers=self.headers,
                json=test_data,
                timeout=30
            )
            
            print(f"Response Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print("✅ Economic incentive distribution successful")
                data = result.get('data', {})
                print(f"Distribution ID: {data.get('distribution_id', 'N/A')}")
                print(f"Total Distributed: ${data.get('total_distributed', 'N/A')}")
                print(f"Successful Recipients: {data.get('successful_recipients', 'N/A')}")
                print(f"Failed Distributions: {data.get('failed_distributions', 'N/A')}")
                return True
            else:
                print(f"❌ Economic incentive distribution failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Economic incentive distribution error: {str(e)}")
            return False

class GovernanceEconomicIntegrationTest(unittest.TestCase):
    """Test suite for Governance-Economic Integration example"""
    
    def setUp(self):
        """Set up test environment"""
        self.base_url = "http://localhost:54321"
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": "Bearer test-token",
            "apikey": "test-api-key"
        }
    
    def test_proposal_evaluation_with_economics(self):
        """Test proposal evaluation with economic analysis"""
        print("\n=== Testing Proposal Evaluation with Economics ===")
        
        test_data = {
            "action": "evaluate_proposal_with_economics",
            "proposal_id": "prop_789",
            "proposal_data": {
                "id": "prop_789",
                "title": "System Optimization Proposal",
                "estimated_cost": 15000,
                "estimated_benefit": 25000,
                "complexity": "high",
                "urgency": "standard",
                "proposal_type": "system_upgrade",
                "timeline": "90d",
                "affected_agents": ["agent1", "agent2", "agent3", "agent4"],
                "community_benefit_score": 0.85
            },
            "evaluation_criteria": {
                "min_roi_threshold": 50,
                "max_risk_level": "medium",
                "required_confidence": 0.7
            }
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/functions/v1/governance-economic-integration-example",
                headers=self.headers,
                json=test_data,
                timeout=30
            )
            
            print(f"Response Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print("✅ Proposal evaluation with economics successful")
                data = result.get('data', {})
                print(f"Evaluation ID: {data.get('evaluation_id', 'N/A')}")
                print(f"Governance Score: {data.get('governance_score', 'N/A')}")
                
                recommendation = data.get('recommendation', {})
                print(f"Recommendation: {recommendation.get('recommendation', 'N/A')}")
                print(f"Confidence: {recommendation.get('confidence', 'N/A')}")
                print(f"Economic Score: {recommendation.get('economic_score', 'N/A')}")
                
                return True
            else:
                print(f"❌ Proposal evaluation failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Proposal evaluation error: {str(e)}")
            return False
    
    def test_governance_decision_processing(self):
        """Test governance decision processing with economic integration"""
        print("\n=== Testing Governance Decision Processing ===")
        
        test_data = {
            "action": "process_governance_decision",
            "decision_id": "decision_123",
            "decision_type": "proposal_approval",
            "decision_data": {
                "agent_id": "agent_456",
                "proposal_id": "prop_789",
                "approved_amount": 15000,
                "implementation_timeline": "90d"
            },
            "economic_requirements": {
                "fees_required": True,
                "fees": [
                    {"type": "implementation_cost", "amount": 100.0}
                ],
                "transactions_required": True,
                "transactions": [
                    {"type": "escrow", "amount": 5000.0}
                ],
                "trust_score_impact": True,
                "budget_limit": 20000
            }
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/functions/v1/governance-economic-integration-example",
                headers=self.headers,
                json=test_data,
                timeout=30
            )
            
            print(f"Response Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print("✅ Governance decision processing successful")
                data = result.get('data', {})
                print(f"Decision ID: {data.get('decision_id', 'N/A')}")
                print(f"Processing Status: {data.get('processing_status', 'N/A')}")
                
                validation = data.get('economic_validation', {})
                print(f"Economic Validation: {'Valid' if validation.get('is_valid') else 'Invalid'}")
                
                return True
            else:
                print(f"❌ Governance decision processing failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Governance decision processing error: {str(e)}")
            return False

def run_comprehensive_test():
    """Run all economic AI integration tests"""
    print("=" * 60)
    print("ECONOMIC AI INTEGRATION COMPREHENSIVE TEST SUITE")
    print("=" * 60)
    print(f"Test Started: {datetime.now()}")
    
    # Track test results
    test_results = {
        "total_tests": 0,
        "passed_tests": 0,
        "failed_tests": 0,
        "start_time": time.time()
    }
    
    # Economic AI Integration Tests
    economic_tests = EconomicAIIntegrationTest()
    economic_tests.setUp()
    
    test_methods = [
        economic_tests.test_economic_impact_analysis,
        economic_tests.test_governance_transaction_creation,
        economic_tests.test_governance_fee_processing,
        economic_tests.test_economic_report_generation,
        economic_tests.test_decision_impact_tracking,
        economic_tests.test_cost_benefit_calculation,
        economic_tests.test_economic_dashboard,
        economic_tests.test_incentive_distribution
    ]
    
    # Governance Integration Tests
    governance_tests = GovernanceEconomicIntegrationTest()
    governance_tests.setUp()
    
    governance_test_methods = [
        governance_tests.test_proposal_evaluation_with_economics,
        governance_tests.test_governance_decision_processing
    ]
    
    all_test_methods = test_methods + governance_test_methods
    
    # Run all tests
    for test_method in all_test_methods:
        test_results["total_tests"] += 1
        try:
            if test_method():
                test_results["passed_tests"] += 1
            else:
                test_results["failed_tests"] += 1
        except Exception as e:
            print(f"❌ Test {test_method.__name__} failed with exception: {str(e)}")
            test_results["failed_tests"] += 1
        
        # Add delay between tests
        time.sleep(1)
    
    # Calculate test duration
    test_duration = time.time() - test_results["start_time"]
    
    # Print final results
    print("\n" + "=" * 60)
    print("ECONOMIC AI INTEGRATION TEST RESULTS")
    print("=" * 60)
    print(f"Total Tests: {test_results['total_tests']}")
    print(f"Passed: {test_results['passed_tests']} ✅")
    print(f"Failed: {test_results['failed_tests']} ❌")
    print(f"Success Rate: {(test_results['passed_tests'] / test_results['total_tests'] * 100):.1f}%")
    print(f"Test Duration: {test_duration:.2f} seconds")
    print(f"Test Completed: {datetime.now()}")
    
    # Determine overall result
    if test_results["failed_tests"] == 0:
        print("\n🎉 ALL TESTS PASSED! Economic AI Integration is working correctly.")
        return True
    else:
        print(f"\n⚠️  {test_results['failed_tests']} tests failed. Please review the errors above.")
        return False

if __name__ == "__main__":
    """Run the comprehensive test suite"""
    success = run_comprehensive_test()
    exit(0 if success else 1)
