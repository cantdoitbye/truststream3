#!/usr/bin/env python3
"""
Quick AI Agent Test - Check current success rate after fixes
"""
import requests
import json
from datetime import datetime

def test_agent(endpoint, payload):
    """Test a specific agent endpoint"""
    try:
        url = f"https://etretluugvclmydzlfte.supabase.co/functions/v1/{endpoint}"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0cmV0bHV1Z3ZjbG15ZHpsZnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NjI4MTgsImV4cCI6MjA3MjIzODgxOH0.g-Mki8CU85CQSRdjCcmBV8g-DsR4VKCtn0fOd-LC6m4',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0cmV0bHV1Z3ZjbG15ZHpsZnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NjI4MTgsImV4cCI6MjA3MjIzODgxOH0.g-Mki8CU85CQSRdjCcmBV8g-DsR4VKCtn0fOd-LC6m4'
        }
        
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        return {
            'success': response.status_code == 200,
            'status_code': response.status_code,
            'agent': endpoint
        }
    except Exception as e:
        return {
            'success': False,
            'status_code': None,
            'agent': endpoint,
            'error': str(e)
        }

def main():
    """Test key agents that were fixed"""
    test_cases = [
        # AI Leader agents
        ('ai-leader-quality-agent', {'action': 'assess_output_quality', 'content': 'test content'}),
        ('ai-leader-transparency-agent', {'action': 'get_transparency_metrics'}),
        ('ai-leader-efficiency-agent', {'action': 'status'}),
        ('ai-leader-innovation-agent', {'action': 'identify_opportunities'}),
        ('ai-leader-accountability-agent', {'action': 'track_decisions'}),
        
        # RAG agents
        ('daughter-community-rag-agent', {'action': 'analyze_hierarchical_structure', 'community_id': 'test-123'}),
        ('rag-primary-request-analysis-agent', {'action': 'analyze_request', 'request_text': 'test request'}),
        
        # Core agents
        ('agent-coordination', {'action': 'coordinate_agents'}),
    ]
    
    results = []
    print("🧪 Testing key AI agents after fixes...")
    
    for endpoint, payload in test_cases:
        print(f"  Testing {endpoint}...")
        result = test_agent(endpoint, payload)
        results.append(result)
    
    # Calculate success rate
    total_tests = len(results)
    successful_tests = sum(1 for r in results if r['success'])
    success_rate = (successful_tests / total_tests) * 100
    
    print(f"\n📊 Quick Test Results:")
    print(f"   Total Tests: {total_tests}")
    print(f"   Successful: {successful_tests}")
    print(f"   Failed: {total_tests - successful_tests}")
    print(f"   Success Rate: {success_rate:.1f}%")
    
    print(f"\n📋 Test Details:")
    for result in results:
        status = "✅ PASS" if result['success'] else "❌ FAIL"
        print(f"   {status} {result['agent']} (Status: {result['status_code']})")
        if not result['success'] and 'error' in result:
            print(f"      Error: {result['error']}")
    
    # Save results
    with open('quick_test_results.json', 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'total_tests': total_tests,
            'successful_tests': successful_tests,
            'success_rate': success_rate,
            'results': results
        }, f, indent=2)
    
    print(f"\n✅ Results saved to quick_test_results.json")
    return success_rate

if __name__ == "__main__":
    main()
