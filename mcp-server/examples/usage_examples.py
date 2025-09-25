#!/usr/bin/env python3
"""
Chat-to-RAG Agent Creator MCP Server - Usage Examples
Demonstrates how to use the conversational RAG agent creation tools.
"""

import asyncio
import json
from typing import Dict, Any

# Mock MCP client for demonstration
class MockMCPClient:
    """Mock MCP client for testing tool calls"""
    
    def __init__(self):
        self.conversations = {}
    
    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Simulate tool calls"""
        print(f"\n🔧 Calling tool: {tool_name}")
        print(f"📝 Arguments: {json.dumps(arguments, indent=2)}")
        
        # Mock responses based on tool name
        if tool_name == "start_rag_conversation":
            return {
                'success': True,
                'conversation_id': 'conv_123',
                'analysis': {
                    'domain': 'customer_support',
                    'use_case': 'customer_support',
                    'complexity_level': 'medium'
                },
                'template_suggestions': [
                    {
                        'template_id': 'customer_support',
                        'score': 1.2,
                        'match_reasons': ['Detected customer service requirements']
                    }
                ],
                'next_steps': [
                    'Review suggested templates',
                    'Provide knowledge base sources',
                    'Specify additional requirements'
                ]
            }
        
        elif tool_name == "process_documents":
            return {
                'success': True,
                'processed_count': 5,
                'total_chunks': 150,
                'total_tokens': 25000,
                'knowledge_base_id': 'kb_456',
                'embedding_config': {
                    'model': 'text-embedding-ada-002',
                    'dimensions': 1536
                }
            }
        
        elif tool_name == "generate_rag_agent":
            return {
                'success': True,
                'agent_id': 'agent_789',
                'tools_generated': 6,
                'deployment_ready': True,
                'agent_config': {
                    'name': 'Customer Support RAG Agent',
                    'template': 'customer_support'
                }
            }
        
        elif tool_name == "deploy_rag_agent":
            return {
                'success': True,
                'agent_id': 'agent_789',
                'deployment_url': 'https://agent-789.truststream.app',
                'status': 'deployed'
            }
        
        else:
            return {
                'success': True,
                'message': f'Mock response for {tool_name}',
                'data': arguments
            }

async def example_customer_support_rag():
    """
    Example: Creating a customer support RAG agent
    """
    print("\n" + "="*60)
    print("🎯 EXAMPLE: Customer Support RAG Agent Creation")
    print("="*60)
    
    client = MockMCPClient()
    
    # Step 1: Start conversation
    print("\n📋 Step 1: Starting conversation with requirements")
    result = await client.call_tool("start_rag_conversation", {
        "user_description": "I need a customer support chatbot for my SaaS product that can answer questions from our help documentation and create support tickets when needed",
        "user_id": "user_123"
    })
    
    conversation_id = result['conversation_id']
    print(f"✅ Conversation started: {conversation_id}")
    print(f"🎯 Detected domain: {result['analysis']['domain']}")
    
    # Step 2: Process knowledge base documents
    print("\n📚 Step 2: Processing knowledge base documents")
    result = await client.call_tool("process_documents", {
        "conversation_id": conversation_id,
        "document_sources": [
            "/docs/help_center/",
            "/docs/troubleshooting.pdf",
            "/docs/api_documentation.md"
        ],
        "processing_options": {
            "chunk_size": 1000,
            "overlap": 100
        }
    })
    
    print(f"✅ Processed {result['processed_count']} documents")
    print(f"📊 Generated {result['total_chunks']} chunks ({result['total_tokens']} tokens)")
    
    # Step 3: Generate RAG agent
    print("\n🤖 Step 3: Generating RAG agent")
    result = await client.call_tool("generate_rag_agent", {
        "conversation_id": conversation_id,
        "template": "customer_support",
        "customizations": {
            "name": "SaaS Support Assistant",
            "rag_config": {
                "similarity_top_k": 3,
                "similarity_threshold": 0.8,
                "reranking": True
            }
        }
    })
    
    print(f"✅ Agent generated: {result['agent_id']}")
    print(f"🛠️ Tools generated: {result['tools_generated']}")
    
    # Step 4: Deploy agent
    print("\n🚀 Step 4: Deploying RAG agent")
    result = await client.call_tool("deploy_rag_agent", {
        "conversation_id": conversation_id,
        "deployment_config": {
            "type": "container",
            "auto_start": True
        }
    })
    
    print(f"✅ Agent deployed successfully!")
    print(f"🌐 Deployment URL: {result['deployment_url']}")
    print(f"📈 Status: {result['status']}")

async def example_documentation_qa_rag():
    """
    Example: Creating a documentation Q&A RAG agent
    """
    print("\n" + "="*60)
    print("📖 EXAMPLE: Documentation Q&A RAG Agent Creation")
    print("="*60)
    
    client = MockMCPClient()
    
    # Step 1: Start conversation
    print("\n📋 Step 1: Starting conversation")
    result = await client.call_tool("start_rag_conversation", {
        "user_description": "I want to create a documentation assistant for our API docs that can help developers find code examples and understand our endpoints"
    })
    
    conversation_id = result['conversation_id']
    print(f"✅ Conversation started: {conversation_id}")
    
    # Step 2: Analyze requirements in detail
    print("\n🔍 Step 2: Analyzing requirements")
    result = await client.call_tool("analyze_requirements", {
        "conversation_id": conversation_id,
        "requirements": "Need code search, API reference lookup, supports multiple programming languages, integration with GitHub",
        "domain": "documentation"
    })
    
    print("✅ Requirements analyzed")
    
    # Step 3: Get template suggestions
    print("\n🎨 Step 3: Getting template suggestions")
    result = await client.call_tool("suggest_rag_templates", {
        "conversation_id": conversation_id
    })
    
    print("✅ Template suggestions received")
    
    # Step 4: Estimate costs
    print("\n💰 Step 4: Estimating costs")
    result = await client.call_tool("estimate_rag_costs", {
        "conversation_id": conversation_id,
        "template_selection": "documentation_qa",
        "knowledge_base_size": {
            "total_size_mb": 50,
            "estimated_tokens": 100000
        }
    })
    
    print("✅ Cost estimation complete")

async def example_research_assistant_rag():
    """
    Example: Creating a research assistant RAG agent
    """
    print("\n" + "="*60)
    print("🔬 EXAMPLE: Research Assistant RAG Agent Creation")
    print("="*60)
    
    client = MockMCPClient()
    
    # Complete workflow for research assistant
    print("\n📋 Creating research assistant for academic literature review")
    
    # Start conversation
    result = await client.call_tool("start_rag_conversation", {
        "user_description": "I need a research assistant that can analyze academic papers, provide summaries, and help with literature reviews in the field of machine learning"
    })
    
    conversation_id = result['conversation_id']
    
    # Continue conversation with more details
    await client.call_tool("continue_conversation", {
        "conversation_id": conversation_id,
        "user_message": "I want it to handle citation formats, fact-checking, and finding related papers",
        "message_type": "requirement"
    })
    
    # Process research papers
    await client.call_tool("process_documents", {
        "conversation_id": conversation_id,
        "document_sources": [
            "/research_papers/machine_learning/",
            "/literature_reviews/",
            "/conference_proceedings/"
        ]
    })
    
    # Create knowledge base with academic configuration
    await client.call_tool("create_knowledge_base", {
        "conversation_id": conversation_id,
        "knowledge_base_config": {
            "vector_store_type": "chromadb",
            "embedding_model": "text-embedding-3-large",
            "distance_metric": "cosine"
        }
    })
    
    # Test retrieval with academic queries
    await client.call_tool("test_retrieval", {
        "conversation_id": conversation_id,
        "test_queries": [
            "What are the latest developments in transformer architectures?",
            "How does attention mechanism work in neural networks?",
            "Comparison of CNN vs RNN for sequence processing"
        ]
    })
    
    # Generate and deploy
    await client.call_tool("generate_rag_agent", {
        "conversation_id": conversation_id,
        "template": "research_assistant"
    })
    
    print("✅ Research assistant RAG agent created and ready for deployment!")

async def example_cost_management():
    """
    Example: Cost estimation and credit management
    """
    print("\n" + "="*60)
    print("💰 EXAMPLE: Cost Management and Credit Integration")
    print("="*60)
    
    client = MockMCPClient()
    
    # Create a conversation for cost demo
    result = await client.call_tool("start_rag_conversation", {
        "user_description": "Complex enterprise RAG system with multiple integrations",
        "user_id": "enterprise_user_456"
    })
    
    conversation_id = result['conversation_id']
    
    # Check user credits
    print("\n💳 Checking user credits")
    await client.call_tool("check_user_credits", {
        "conversation_id": conversation_id
    })
    
    # Calculate deployment costs
    print("\n📊 Calculating deployment costs")
    await client.call_tool("calculate_deployment_cost", {
        "conversation_id": conversation_id,
        "deployment_options": {
            "type": "container",
            "scaling": "auto",
            "resources": {
                "cpu_cores": 2,
                "memory_mb": 4096
            }
        }
    })
    
    print("✅ Cost analysis complete with TrustStream integration!")

async def main():
    """
    Run all examples
    """
    print("🚀 Chat-to-RAG Agent Creator MCP Server - Usage Examples")
    print("" + "="*80)
    
    try:
        await example_customer_support_rag()
        await example_documentation_qa_rag()
        await example_research_assistant_rag()
        await example_cost_management()
        
        print("\n" + "="*80)
        print("✅ All examples completed successfully!")
        print("\n🎯 Key Features Demonstrated:")
        print("   • Conversational RAG agent creation")
        print("   • Multi-template support")
        print("   • Knowledge base processing")
        print("   • Cost estimation & credit integration")
        print("   • TrustStream deployment integration")
        print("   • Comprehensive testing workflows")
        
    except Exception as e:
        print(f"\n❌ Example failed: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main())
