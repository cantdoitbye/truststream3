#!/usr/bin/env python3
"""
Test suite for Chat-to-RAG Agent Creator MCP Server
Comprehensive testing of all tools and functionality.
"""

import asyncio
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Any, Dict, List

# Add src directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from conversation_manager import ConversationManager
from rag_processor import RAGProcessor
from knowledge_base import KnowledgeBaseManager
from agent_generator import RAGAgentGenerator
from truststream_integration import TrustStreamIntegrator
from cost_calculator import CostCalculator
from templates import RAGTemplateManager

class TestChatToRAGMCPServer(unittest.TestCase):
    """Test suite for the Chat-to-RAG MCP Server"""
    
    def setUp(self):
        """Set up test environment"""
        self.conversation_manager = ConversationManager()
        self.rag_processor = RAGProcessor()
        self.knowledge_base_manager = KnowledgeBaseManager()
        self.agent_generator = RAGAgentGenerator()
        self.truststream_integrator = TrustStreamIntegrator()
        self.cost_calculator = CostCalculator()
        self.template_manager = RAGTemplateManager()
        
        # Test data
        self.test_user_id = "test_user_123"
        self.test_description = "I need a customer support chatbot for my SaaS product"
    
    async def test_conversation_management(self):
        """Test conversation management functionality"""
        print("\n🧪 Testing conversation management...")
        
        # Start conversation
        conversation = await self.conversation_manager.start_conversation(
            user_description=self.test_description,
            user_id=self.test_user_id
        )
        
        self.assertIsNotNone(conversation['id'])
        self.assertEqual(conversation['user_id'], self.test_user_id)
        self.assertEqual(conversation['state'], 'started')
        
        conversation_id = conversation['id']
        
        # Add message
        await self.conversation_manager.add_message(
            conversation_id,
            'user',
            'I want it to handle technical questions and create tickets'
        )
        
        # Get conversation
        retrieved = await self.conversation_manager.get_conversation(conversation_id)
        self.assertEqual(len(retrieved['messages']), 2)  # Initial + added message
        
        # Update state
        await self.conversation_manager.update_conversation_state(
            conversation_id,
            {'state': 'requirements_gathered', 'template': 'customer_support'}
        )
        
        # Generate summary
        summary = await self.conversation_manager.generate_summary(conversation_id)
        self.assertIn('conversation_id', summary)
        self.assertIn('progress', summary)
        
        print("✅ Conversation management tests passed")
    
    async def test_rag_processor(self):
        """Test RAG processing functionality"""
        print("\n🧪 Testing RAG processor...")
        
        # Initial analysis
        analysis = await self.rag_processor.analyze_initial_requirements(
            self.test_description
        )
        
        self.assertIn('domain', analysis)
        self.assertIn('use_case', analysis)
        self.assertIn('complexity_level', analysis)
        
        # Detailed requirements analysis
        detailed_analysis = await self.rag_processor.analyze_requirements(
            "Customer support with ticket creation and escalation features"
        )
        
        self.assertIn('structured_requirements', detailed_analysis)
        self.assertIn('knowledge_base_needs', detailed_analysis)
        self.assertIn('suggested_tools', detailed_analysis)
        
        print("✅ RAG processor tests passed")
    
    async def test_knowledge_base_manager(self):
        """Test knowledge base management"""
        print("\n🧪 Testing knowledge base manager...")
        
        # Process documents
        result = await self.knowledge_base_manager.process_documents([
            "Test document content for customer support",
            "FAQ: How to reset password?",
            "Troubleshooting guide for common issues"
        ])
        
        self.assertGreater(result['processed_count'], 0)
        self.assertGreater(result['total_chunks'], 0)
        self.assertIn('knowledge_base_id', result)
        
        kb_id = result['knowledge_base_id']
        
        # Create knowledge base
        kb_result = await self.knowledge_base_manager.create_knowledge_base({
            'knowledge_base_id': kb_id,
            'vector_store_type': 'chromadb'
        })
        
        self.assertEqual(kb_result['knowledge_base_id'], kb_id)
        self.assertIn('vector_store_config', kb_result)
        
        # Configure embeddings
        embedding_result = await self.knowledge_base_manager.configure_embeddings({
            'model': 'text-embedding-ada-002',
            'estimated_tokens': 10000
        })
        
        self.assertIn('model', embedding_result)
        self.assertIn('estimated_total_cost', embedding_result)
        
        # Test retrieval
        test_result = await self.knowledge_base_manager.test_retrieval(
            kb_id,
            ["How to reset password?", "Common troubleshooting steps"]
        )
        
        self.assertIn('results', test_result)
        self.assertIn('metrics', test_result)
        
        print("✅ Knowledge base manager tests passed")
    
    async def test_template_manager(self):
        """Test template management"""
        print("\n🧪 Testing template manager...")
        
        # Get all templates
        templates = self.template_manager.get_all_templates()
        self.assertIn('customer_support', templates)
        self.assertIn('documentation_qa', templates)
        
        # Suggest templates
        suggestions = await self.template_manager.suggest_templates(
            self.test_description
        )
        
        self.assertGreater(len(suggestions), 0)
        self.assertIn('template_id', suggestions[0])
        self.assertIn('score', suggestions[0])
        
        # Get recommendations
        recommendations = self.template_manager.get_template_recommendations(suggestions)
        self.assertIn('primary_recommendation', recommendations)
        self.assertIn('confidence', recommendations)
        
        # Validate template selection
        validation = self.template_manager.validate_template_selection(
            'customer_support',
            {'complexity_assessment': {'overall_complexity': 'medium'}}
        )
        
        self.assertIn('valid', validation)
        
        print("✅ Template manager tests passed")
    
    async def test_agent_generator(self):
        """Test agent generation"""
        print("\n🧪 Testing agent generator...")
        
        # Create mock conversation
        conversation = {
            'id': 'test_conv',
            'user_id': self.test_user_id,
            'initial_description': self.test_description,
            'metadata': {
                'requirements_analysis': {
                    'domain': 'customer_support',
                    'complexity_assessment': {'overall_complexity': 'medium'}
                },
                'knowledge_base_id': 'test_kb_123'
            }
        }
        
        # Generate agent
        agent_config = await self.agent_generator.generate_rag_agent(
            conversation=conversation,
            template_name='customer_support'
        )
        
        self.assertIn('agent_id', agent_config)
        self.assertIn('name', agent_config)
        self.assertIn('tools', agent_config)
        self.assertIn('server_code', agent_config)
        self.assertIn('deployment_config', agent_config)
        
        # Validate server code is generated
        self.assertIn('FastMCP', agent_config['server_code'])
        self.assertIn('@mcp.tool', agent_config['server_code'])
        
        print("✅ Agent generator tests passed")
    
    async def test_cost_calculator(self):
        """Test cost calculation"""
        print("\n🧪 Testing cost calculator...")
        
        # Mock conversation
        conversation = {
            'metadata': {
                'requirements_analysis': {
                    'complexity_assessment': {'overall_complexity': 'medium'},
                    'integration_requirements': ['slack', 'ticketing']
                }
            }
        }
        
        # Calculate RAG costs
        cost_result = await self.cost_calculator.calculate_rag_costs(
            conversation=conversation,
            template_selection='customer_support',
            knowledge_base_size={'total_size_mb': 10, 'estimated_tokens': 10000}
        )
        
        self.assertIn('breakdown', cost_result)
        self.assertIn('setup_cost', cost_result)
        self.assertIn('monthly_cost', cost_result)
        self.assertIn('per_query_cost', cost_result)
        self.assertIn('optimization_tips', cost_result)
        
        # Test conversation cost
        conv_cost = await self.cost_calculator.calculate_conversation_cost(
            'test_conv', 5
        )
        
        self.assertIn('total_cost', conv_cost)
        self.assertIn('breakdown', conv_cost)
        
        print("✅ Cost calculator tests passed")
    
    async def test_truststream_integration(self):
        """Test TrustStream integration (mock mode)"""
        print("\n🧪 Testing TrustStream integration (mock mode)...")
        
        # Note: These tests will use mock data since we don't have real credentials
        
        # Test validation
        agent_config = {
            'agent_id': 'test_agent',
            'name': 'Test Agent',
            'server_code': 'mock code',
            'deployment_config': {'estimated_cost': 0.1},
            'knowledge_base_id': 'kb_123'
        }
        
        validation = await self.truststream_integrator.validate_deployment_readiness(
            agent_config, self.test_user_id
        )
        
        self.assertIn('ready', validation)
        self.assertIn('issues', validation)
        self.assertIn('warnings', validation)
        
        print("✅ TrustStream integration tests passed (mock mode)")
    
    async def test_full_workflow(self):
        """Test complete RAG agent creation workflow"""
        print("\n🧪 Testing complete workflow...")
        
        # 1. Start conversation
        conversation = await self.conversation_manager.start_conversation(
            user_description=self.test_description,
            user_id=self.test_user_id
        )
        conversation_id = conversation['id']
        
        # 2. Analyze requirements
        analysis = await self.rag_processor.analyze_requirements(
            "Customer support with technical documentation integration"
        )
        
        # 3. Suggest templates
        suggestions = await self.template_manager.suggest_templates(
            self.test_description, analysis
        )
        
        # 4. Process documents
        doc_result = await self.knowledge_base_manager.process_documents([
            "Customer support documentation",
            "Technical troubleshooting guide"
        ])
        
        # 5. Create knowledge base
        kb_result = await self.knowledge_base_manager.create_knowledge_base({
            'knowledge_base_id': doc_result['knowledge_base_id']
        })
        
        # 6. Update conversation with all data
        await self.conversation_manager.update_conversation_state(
            conversation_id,
            {
                'requirements_analysis': analysis,
                'template_suggestions': suggestions,
                'knowledge_base_id': kb_result['knowledge_base_id'],
                'state': 'ready_for_agent_generation'
            }
        )
        
        # 7. Generate agent
        updated_conversation = await self.conversation_manager.get_conversation(conversation_id)
        agent_config = await self.agent_generator.generate_rag_agent(
            conversation=updated_conversation,
            template_name='customer_support'
        )
        
        # 8. Calculate costs
        cost_result = await self.cost_calculator.calculate_rag_costs(
            conversation=updated_conversation,
            template_selection='customer_support'
        )
        
        # Verify all steps completed
        self.assertIsNotNone(conversation_id)
        self.assertIn('structured_requirements', analysis)
        self.assertGreater(len(suggestions), 0)
        self.assertGreater(doc_result['processed_count'], 0)
        self.assertIn('knowledge_base_id', kb_result)
        self.assertIn('agent_id', agent_config)
        self.assertIn('setup_cost', cost_result)
        
        print("✅ Complete workflow test passed")
    
    async def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Chat-to-RAG MCP Server Test Suite")
        print("" + "="*60)
        
        # Set up test environment
        self.setUp()
        
        tests = [
            self.test_conversation_management,
            self.test_rag_processor,
            self.test_knowledge_base_manager,
            self.test_template_manager,
            self.test_agent_generator,
            self.test_cost_calculator,
            self.test_truststream_integration,
            self.test_full_workflow
        ]
        
        passed = 0
        failed = 0
        
        for test in tests:
            try:
                await test()
                passed += 1
            except Exception as e:
                print(f"❌ {test.__name__} failed: {e}")
                failed += 1
                import traceback
                traceback.print_exc()
        
        print("\n" + "="*60)
        print(f"📊 Test Results: {passed} passed, {failed} failed")
        
        if failed == 0:
            print("🎉 All tests passed successfully!")
            return True
        else:
            print(f"⚠️  {failed} tests failed")
            return False

async def main():
    """Main test runner"""
    test_suite = TestChatToRAGMCPServer()
    success = await test_suite.run_all_tests()
    return success

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
