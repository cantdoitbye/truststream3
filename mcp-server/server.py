#!/usr/bin/env python3
"""
Chat-to-RAG Agent Creation MCP Server
Conversational interface for creating RAG-based AI agents with TrustStream integration

Generated on: 2025-09-25 15:50:19
Author: MiniMax Agent
"""

import asyncio
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import httpx
from fastmcp import FastMCP

# Import our custom modules
from src.conversation_manager import ConversationManager
from src.rag_processor import RAGProcessor
from src.knowledge_base import KnowledgeBaseManager
from src.agent_generator import RAGAgentGenerator
from src.truststream_integration import TrustStreamIntegrator
from src.cost_calculator import CostCalculator
from src.templates import RAGTemplateManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastMCP server
mcp = FastMCP("Chat-to-RAG Agent Creator")

# Initialize components
conversation_manager = ConversationManager()
rag_processor = RAGProcessor()
knowledge_base_manager = KnowledgeBaseManager()
agent_generator = RAGAgentGenerator()
truststream_integrator = TrustStreamIntegrator()
cost_calculator = CostCalculator()
template_manager = RAGTemplateManager()

# =============================================================================
# CONVERSATION MANAGEMENT TOOLS
# =============================================================================

@mcp.tool
async def start_rag_conversation(
    user_description: str,
    user_id: Optional[str] = None,
    conversation_context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Begin a new RAG agent creation conversation.
    
    Args:
        user_description: Initial description of what the user wants to build
        user_id: Optional user ID for TrustStream integration
        conversation_context: Optional additional context
        
    Returns:
        Conversation ID and initial analysis
    """
    try:
        logger.info(f"Starting new RAG conversation: {user_description[:100]}...")
        
        conversation = await conversation_manager.start_conversation(
            user_description=user_description,
            user_id=user_id,
            context=conversation_context or {}
        )
        
        # Perform initial analysis
        initial_analysis = await rag_processor.analyze_initial_requirements(
            user_description
        )
        
        # Get template suggestions
        template_suggestions = await template_manager.suggest_templates(
            user_description,
            initial_analysis
        )
        
        # Update conversation with analysis
        await conversation_manager.add_message(
            conversation['id'],
            'system',
            'Initial analysis complete',
            metadata={
                'analysis': initial_analysis,
                'template_suggestions': template_suggestions
            }
        )
        
        return {
            'success': True,
            'conversation_id': conversation['id'],
            'analysis': initial_analysis,
            'template_suggestions': template_suggestions,
            'next_steps': [
                'Review suggested templates',
                'Provide knowledge base sources', 
                'Specify additional requirements',
                'Configure deployment preferences'
            ],
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to start RAG conversation: {e}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }

@mcp.tool
async def continue_conversation(
    conversation_id: str,
    user_message: str,
    message_type: str = 'requirement'
) -> Dict[str, Any]:
    """
    Continue an existing RAG agent creation conversation.
    
    Args:
        conversation_id: ID of the existing conversation
        user_message: User's message or requirement
        message_type: Type of message (requirement, question, confirmation)
        
    Returns:
        Response and updated conversation state
    """
    try:
        logger.info(f"Continuing conversation {conversation_id}")
        
        # Add user message
        await conversation_manager.add_message(
            conversation_id,
            'user',
            user_message,
            metadata={'type': message_type}
        )
        
        # Get conversation context
        conversation = await conversation_manager.get_conversation(conversation_id)
        
        # Process the message based on conversation state
        response = await rag_processor.process_conversation_message(
            conversation,
            user_message,
            message_type
        )
        
        # Add system response
        await conversation_manager.add_message(
            conversation_id,
            'assistant',
            response['message'],
            metadata=response.get('metadata', {})
        )
        
        # Check if we need to update conversation state
        if response.get('state_update'):
            await conversation_manager.update_conversation_state(
                conversation_id,
                response['state_update']
            )
        
        return {
            'success': True,
            'response': response['message'],
            'conversation_state': response.get('state', 'gathering_requirements'),
            'actions_available': response.get('actions', []),
            'progress': response.get('progress', {}),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to continue conversation: {e}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }

@mcp.tool
async def get_conversation_summary(
    conversation_id: str
) -> Dict[str, Any]:
    """
    Get current state and summary of a RAG conversation.
    
    Args:
        conversation_id: ID of the conversation
        
    Returns:
        Complete conversation summary and current state
    """
    try:
        conversation = await conversation_manager.get_conversation(conversation_id)
        summary = await conversation_manager.generate_summary(conversation_id)
        
        return {
            'success': True,
            'conversation_id': conversation_id,
            'summary': summary,
            'current_state': conversation['state'],
            'progress': conversation.get('metadata', {}).get('progress', {}),
            'requirements': conversation.get('metadata', {}).get('requirements', {}),
            'message_count': len(conversation['messages']),
            'created_at': conversation['created_at'],
            'updated_at': conversation['updated_at']
        }
        
    except Exception as e:
        logger.error(f"Failed to get conversation summary: {e}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }

# =============================================================================
# REQUIREMENTS ANALYSIS TOOLS
# =============================================================================

@mcp.tool
async def analyze_requirements(
    conversation_id: str,
    requirements: str,
    domain: Optional[str] = None
) -> Dict[str, Any]:
    """
    Analyze and structure user requirements for RAG agent.
    
    Args:
        conversation_id: ID of the conversation
        requirements: Raw requirements text
        domain: Optional domain context (e.g., 'customer_support', 'documentation')
        
    Returns:
        Structured requirements analysis
    """
    try:
        logger.info(f"Analyzing requirements for conversation {conversation_id}")
        
        analysis = await rag_processor.analyze_requirements(
            requirements,
            domain=domain
        )
        
        # Update conversation with analysis
        await conversation_manager.add_message(
            conversation_id,
            'system',
            'Requirements analyzed',
            metadata={'requirements_analysis': analysis}
        )
        
        return {
            'success': True,
            'analysis': analysis,
            'structured_requirements': analysis['structured_requirements'],
            'knowledge_base_needs': analysis['knowledge_base_needs'],
            'suggested_tools': analysis['suggested_tools'],
            'complexity_assessment': analysis['complexity_assessment'],
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to analyze requirements: {e}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }

@mcp.tool
async def suggest_rag_templates(
    conversation_id: str,
    requirements_analysis: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Suggest suitable RAG templates based on requirements.
    
    Args:
        conversation_id: ID of the conversation
        requirements_analysis: Optional pre-analyzed requirements
        
    Returns:
        List of suggested templates with customization options
    """
    try:
        conversation = await conversation_manager.get_conversation(conversation_id)
        
        if not requirements_analysis:
            # Get analysis from conversation metadata
            requirements_analysis = conversation.get('metadata', {}).get('requirements_analysis', {})
        
        suggestions = await template_manager.suggest_templates(
            conversation.get('initial_description', ''),
            requirements_analysis
        )
        
        return {
            'success': True,
            'templates': suggestions,
            'recommendations': template_manager.get_template_recommendations(suggestions),
            'customization_options': template_manager.get_customization_options(),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to suggest templates: {e}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }

@mcp.tool
async def estimate_rag_costs(
    conversation_id: str,
    template_selection: Optional[str] = None,
    knowledge_base_size: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Calculate estimated costs for RAG agent creation and operation.
    
    Args:
        conversation_id: ID of the conversation
        template_selection: Selected template name
        knowledge_base_size: Estimated knowledge base size and complexity
        
    Returns:
        Detailed cost breakdown and estimates
    """
    try:
        conversation = await conversation_manager.get_conversation(conversation_id)
        
        cost_estimate = await cost_calculator.calculate_rag_costs(
            conversation=conversation,
            template_selection=template_selection,
            knowledge_base_size=knowledge_base_size
        )
        
        return {
            'success': True,
            'cost_breakdown': cost_estimate['breakdown'],
            'total_setup_cost': cost_estimate['setup_cost'],
            'monthly_operating_cost': cost_estimate['monthly_cost'],
            'per_query_cost': cost_estimate['per_query_cost'],
            'cost_optimization_tips': cost_estimate['optimization_tips'],
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to estimate costs: {e}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }

# =============================================================================
# KNOWLEDGE BASE MANAGEMENT TOOLS
# =============================================================================

@mcp.tool
async def process_documents(
    conversation_id: str,
    document_sources: List[str],
    processing_options: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Process documents for knowledge base creation.
    
    Args:
        conversation_id: ID of the conversation
        document_sources: List of document paths, URLs, or content
        processing_options: Options for document processing
        
    Returns:
        Processing results and knowledge base preparation status
    """
    try:
        logger.info(f"Processing {len(document_sources)} documents for conversation {conversation_id}")
        
        processing_result = await knowledge_base_manager.process_documents(
            document_sources,
            options=processing_options or {}
        )
        
        # Update conversation with processing results
        await conversation_manager.add_message(
            conversation_id,
            'system',
            f'Processed {processing_result["processed_count"]} documents',
            metadata={'document_processing': processing_result}
        )
        
        return {
            'success': True,
            'processed_count': processing_result['processed_count'],
            'total_chunks': processing_result['total_chunks'],
            'total_tokens': processing_result['total_tokens'],
            'processing_errors': processing_result['errors'],
            'knowledge_base_id': processing_result['knowledge_base_id'],
            'embedding_config': processing_result['embedding_config'],
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to process documents: {e}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }

@mcp.tool
async def create_knowledge_base(
    conversation_id: str,
    knowledge_base_config: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Create and configure vector database for RAG.
    
    Args:
        conversation_id: ID of the conversation
        knowledge_base_config: Configuration for knowledge base creation
        
    Returns:
        Knowledge base creation results
    """
    try:
        logger.info(f"Creating knowledge base for conversation {conversation_id}")
        
        kb_result = await knowledge_base_manager.create_knowledge_base(
            config=knowledge_base_config
        )
        
        # Update conversation
        await conversation_manager.update_conversation_state(
            conversation_id,
            {
                'knowledge_base_id': kb_result['knowledge_base_id'],
                'state': 'knowledge_base_ready'
            }
        )
        
        return {
            'success': True,
            'knowledge_base_id': kb_result['knowledge_base_id'],
            'vector_store_config': kb_result['vector_store_config'],
            'embedding_model': kb_result['embedding_model'],
            'index_stats': kb_result['index_stats'],
            'retrieval_config': kb_result['retrieval_config'],
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to create knowledge base: {e}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }

@mcp.tool
async def configure_embeddings(
    conversation_id: str,
    embedding_config: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Configure embedding strategy for knowledge base.
    
    Args:
        conversation_id: ID of the conversation
        embedding_config: Embedding configuration options
        
    Returns:
        Embedding configuration results
    """
    try:
        result = await knowledge_base_manager.configure_embeddings(
            config=embedding_config
        )
        
        return {
            'success': True,
            'embedding_model': result['model'],
            'vector_dimensions': result['dimensions'],
            'cost_per_token': result['cost_per_token'],
            'estimated_cost': result['estimated_total_cost'],
            'configuration': result['config'],
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to configure embeddings: {e}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }

@mcp.tool
async def test_retrieval(
    conversation_id: str,
    test_queries: List[str],
    retrieval_config: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Test knowledge base retrieval with sample queries.
    
    Args:
        conversation_id: ID of the conversation
        test_queries: List of test queries
        retrieval_config: Optional retrieval configuration
        
    Returns:
        Retrieval test results and performance metrics
    """
    try:
        conversation = await conversation_manager.get_conversation(conversation_id)
        kb_id = conversation.get('metadata', {}).get('knowledge_base_id')
        
        if not kb_id:
            raise ValueError("No knowledge base found for this conversation")
        
        test_results = await knowledge_base_manager.test_retrieval(
            knowledge_base_id=kb_id,
            test_queries=test_queries,
            config=retrieval_config
        )
        
        return {
            'success': True,
            'test_results': test_results['results'],
            'performance_metrics': test_results['metrics'],
            'retrieval_quality': test_results['quality_score'],
            'optimization_suggestions': test_results['suggestions'],
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to test retrieval: {e}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }

# =============================================================================
# AGENT CONFIGURATION AND GENERATION TOOLS
# =============================================================================

@mcp.tool
async def generate_rag_agent(
    conversation_id: str,
    template: str,
    customizations: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Generate a complete RAG agent based on conversation and template.
    
    Args:
        conversation_id: ID of the conversation
        template: Template name to use
        customizations: Optional customizations to apply
        
    Returns:
        Generated agent configuration and code
    """
    try:
        logger.info(f"Generating RAG agent for conversation {conversation_id} with template {template}")
        
        conversation = await conversation_manager.get_conversation(conversation_id)
        
        # Generate agent
        agent_config = await agent_generator.generate_rag_agent(
            conversation=conversation,
            template_name=template,
            customizations=customizations
        )
        
        # Update conversation with agent config
        await conversation_manager.update_conversation_state(
            conversation_id,
            {
                'agent_config': agent_config,
                'state': 'agent_generated'
            }
        )
        
        return {
            'success': True,
            'agent_config': agent_config,
            'agent_id': agent_config['agent_id'],
            'tools_generated': len(agent_config['tools']),
            'deployment_ready': True,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to generate RAG agent: {e}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }

@mcp.tool
async def customize_retrieval(
    conversation_id: str,
    retrieval_config: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Customize retrieval parameters for the RAG agent.
    
    Args:
        conversation_id: ID of the conversation
        retrieval_config: Retrieval configuration parameters
        
    Returns:
        Updated retrieval configuration
    """
    try:
        conversation = await conversation_manager.get_conversation(conversation_id)
        
        # Validate retrieval config
        valid_params = {
            'similarity_top_k', 'similarity_threshold', 'max_context_length',
            'reranking', 'multi_query', 'retrieval_strategy'
        }
        
        filtered_config = {
            k: v for k, v in retrieval_config.items()
            if k in valid_params
        }
        
        # Update conversation metadata
        await conversation_manager.update_conversation_state(
            conversation_id,
            {'retrieval_config': filtered_config}
        )
        
        return {
            'success': True,
            'retrieval_config': filtered_config,
            'updated_parameters': list(filtered_config.keys()),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to customize retrieval: {e}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }

@mcp.tool
async def validate_agent_config(
    conversation_id: str
) -> Dict[str, Any]:
    """
    Validate agent configuration before deployment.
    
    Args:
        conversation_id: ID of the conversation
        
    Returns:
        Validation results and readiness status
    """
    try:
        conversation = await conversation_manager.get_conversation(conversation_id)
        agent_config = conversation.get('metadata', {}).get('agent_config', {})
        
        if not agent_config:
            return {
                'success': False,
                'error': 'No agent configuration found',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
        
        # Validate using TrustStream integrator
        user_id = conversation.get('user_id')
        validation_result = await truststream_integrator.validate_deployment_readiness(
            agent_config, user_id
        )
        
        return {
            'success': True,
            'validation_result': validation_result,
            'ready_for_deployment': validation_result['ready'],
            'issues': validation_result['issues'],
            'warnings': validation_result['warnings'],
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to validate agent config: {e}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }

# =============================================================================
# TRUSTSTREAM INTEGRATION TOOLS
# =============================================================================

@mcp.tool
async def calculate_deployment_cost(
    conversation_id: str,
    deployment_options: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Calculate deployment costs for the RAG agent.
    
    Args:
        conversation_id: ID of the conversation
        deployment_options: Optional deployment configuration
        
    Returns:
        Detailed cost breakdown for deployment
    """
    try:
        conversation = await conversation_manager.get_conversation(conversation_id)
        agent_config = conversation.get('metadata', {}).get('agent_config', {})
        
        if not agent_config:
            return {
                'success': False,
                'error': 'No agent configuration found for cost calculation',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
        
        # Get cost estimates from TrustStream
        cost_estimates = await truststream_integrator.get_cost_estimates(agent_config)
        
        # Calculate additional deployment costs
        deployment_cost = await cost_calculator.calculate_rag_costs(
            conversation=conversation,
            template_selection=agent_config.get('template'),
            knowledge_base_size=None  # Would be derived from conversation metadata
        )
        
        return {
            'success': True,
            'deployment_costs': cost_estimates.get('estimates', {}),
            'operational_costs': deployment_cost,
            'total_setup_cost': deployment_cost['setup_cost'],
            'monthly_cost': deployment_cost['monthly_cost'],
            'per_query_cost': deployment_cost['per_query_cost'],
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to calculate deployment cost: {e}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }

@mcp.tool
async def check_user_credits(
    conversation_id: str,
    required_cost: Optional[float] = None
) -> Dict[str, Any]:
    """
    Check if user has sufficient credits for deployment.
    
    Args:
        conversation_id: ID of the conversation
        required_cost: Optional specific cost to check
        
    Returns:
        Credit balance and sufficiency status
    """
    try:
        conversation = await conversation_manager.get_conversation(conversation_id)
        user_id = conversation.get('user_id')
        
        if not user_id:
            return {
                'success': False,
                'error': 'User ID not found in conversation',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
        
        # Get estimated cost if not provided
        if required_cost is None:
            cost_result = await calculate_deployment_cost(conversation_id)
            if cost_result['success']:
                required_cost = cost_result['total_setup_cost']
            else:
                required_cost = 0.1  # Default estimate
        
        # Check credits via TrustStream
        credit_check = await truststream_integrator.check_user_credits(
            user_id, required_cost
        )
        
        return {
            'success': True,
            'credit_status': credit_check,
            'user_id': user_id,
            'required_cost': required_cost,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to check user credits: {e}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }

@mcp.tool
async def deploy_rag_agent(
    conversation_id: str,
    deployment_config: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Deploy the RAG agent to TrustStream infrastructure.
    
    Args:
        conversation_id: ID of the conversation
        deployment_config: Optional deployment configuration
        
    Returns:
        Deployment results and agent information
    """
    try:
        conversation = await conversation_manager.get_conversation(conversation_id)
        agent_config = conversation.get('metadata', {}).get('agent_config', {})
        user_id = conversation.get('user_id')
        
        if not agent_config:
            return {
                'success': False,
                'error': 'No agent configuration found',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
        
        if not user_id:
            return {
                'success': False,
                'error': 'User ID required for deployment',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
        
        # Validate before deployment
        validation = await validate_agent_config(conversation_id)
        if not validation.get('ready_for_deployment', False):
            return {
                'success': False,
                'error': 'Agent configuration validation failed',
                'validation_issues': validation.get('issues', []),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
        
        # Deploy via TrustStream
        deployment_result = await truststream_integrator.deploy_rag_agent(
            agent_config=agent_config,
            user_id=user_id,
            deployment_options=deployment_config
        )
        
        if deployment_result['success']:
            # Update conversation state
            await conversation_manager.update_conversation_state(
                conversation_id,
                {
                    'deployment': deployment_result['deployment'],
                    'state': 'deployed'
                }
            )
        
        return {
            'success': deployment_result['success'],
            'deployment': deployment_result.get('deployment', {}),
            'agent_id': agent_config['agent_id'],
            'deployment_url': deployment_result.get('deployment', {}).get('data', {}).get('deploymentUrl'),
            'status': 'deployed' if deployment_result['success'] else 'failed',
            'error': deployment_result.get('error'),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to deploy RAG agent: {e}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }

if __name__ == "__main__":
    logger.info("Starting Chat-to-RAG Agent Creation MCP Server")
    logger.info("Available tools: Conversation management, Requirements analysis, Knowledge base creation, Agent generation, TrustStream integration")
    
    # Run the MCP server
    mcp.run()
