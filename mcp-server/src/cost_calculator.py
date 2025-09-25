"""
Cost Calculator
Calculates costs for RAG agent creation, deployment, and operation.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

class CostCalculator:
    """Calculates costs for RAG operations and deployments."""
    
    def __init__(self):
        # Base cost rates (in ooumph coins)
        self.rates = {
            # Document processing
            'document_processing_per_mb': 0.01,
            'embedding_generation_per_1k_tokens': 0.0001,
            
            # Knowledge base
            'vector_storage_per_mb_per_day': 0.001,
            'knowledge_base_creation': 0.02,
            
            # Agent operations
            'agent_generation': 0.05,
            'template_customization': 0.02,
            'deployment_setup': 0.03,
            
            # Runtime costs
            'container_per_hour': 0.1,
            'serverless_per_request': 0.001,
            'edge_per_hour': 0.05,
            
            # Query costs
            'rag_query_base': 0.001,
            'rag_query_complex': 0.005,
            'retrieval_per_document': 0.0001,
            
            # Conversation management
            'conversation_message': 0.0005,
            'requirements_analysis': 0.01,
            'cost_estimation': 0.005
        }
        
        # Template-specific multipliers
        self.template_multipliers = {
            'customer_support': 1.2,  # Higher due to integrations
            'documentation_qa': 1.0,
            'research_assistant': 1.5,  # Higher due to complexity
            'product_expert': 1.1,
            'general': 1.0
        }
        
        # Complexity multipliers
        self.complexity_multipliers = {
            'low': 0.8,
            'medium': 1.0,
            'high': 1.5
        }
    
    async def calculate_rag_costs(
        self,
        conversation: Dict[str, Any],
        template_selection: Optional[str] = None,
        knowledge_base_size: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Calculate comprehensive RAG agent costs."""
        
        # Get conversation metadata
        metadata = conversation.get('metadata', {})
        requirements = metadata.get('requirements_analysis', {})
        
        # Determine template and complexity
        template = template_selection or 'general'
        complexity = requirements.get('complexity_assessment', {}).get('overall_complexity', 'medium')
        
        # Calculate individual cost components
        setup_costs = await self._calculate_setup_costs(
            template, complexity, knowledge_base_size
        )
        
        deployment_costs = await self._calculate_deployment_costs(
            template, complexity, requirements
        )
        
        operating_costs = await self._calculate_operating_costs(
            template, complexity, requirements
        )
        
        # Total costs
        total_setup = sum(setup_costs.values())
        total_deployment = sum(deployment_costs.values())
        monthly_operating = sum(operating_costs['monthly'].values())
        per_query_cost = operating_costs['per_query']
        
        # Apply multipliers
        template_multiplier = self.template_multipliers.get(template, 1.0)
        complexity_multiplier = self.complexity_multipliers.get(complexity, 1.0)
        
        total_multiplier = template_multiplier * complexity_multiplier
        
        final_setup_cost = total_setup * total_multiplier
        final_deployment_cost = total_deployment * total_multiplier
        final_monthly_cost = monthly_operating * total_multiplier
        final_per_query_cost = per_query_cost * total_multiplier
        
        # Generate optimization tips
        optimization_tips = self._generate_optimization_tips(
            template, complexity, setup_costs, operating_costs
        )
        
        return {
            'breakdown': {
                'setup': setup_costs,
                'deployment': deployment_costs,
                'monthly_operating': operating_costs['monthly'],
                'multipliers': {
                    'template': template_multiplier,
                    'complexity': complexity_multiplier,
                    'total': total_multiplier
                }
            },
            'setup_cost': final_setup_cost,
            'deployment_cost': final_deployment_cost,
            'monthly_cost': final_monthly_cost,
            'per_query_cost': final_per_query_cost,
            'optimization_tips': optimization_tips
        }
    
    async def _calculate_setup_costs(
        self,
        template: str,
        complexity: str,
        knowledge_base_size: Optional[Dict[str, Any]]
    ) -> Dict[str, float]:
        """Calculate one-time setup costs."""
        
        costs = {
            'requirements_analysis': self.rates['requirements_analysis'],
            'agent_generation': self.rates['agent_generation'],
            'knowledge_base_creation': self.rates['knowledge_base_creation']
        }
        
        # Document processing costs
        if knowledge_base_size:
            doc_size_mb = knowledge_base_size.get('total_size_mb', 10)
            token_count = knowledge_base_size.get('estimated_tokens', 10000)
            
            costs['document_processing'] = doc_size_mb * self.rates['document_processing_per_mb']
            costs['embedding_generation'] = (token_count / 1000) * self.rates['embedding_generation_per_1k_tokens']
        else:
            # Default estimates
            costs['document_processing'] = 10 * self.rates['document_processing_per_mb']
            costs['embedding_generation'] = 10 * self.rates['embedding_generation_per_1k_tokens']
        
        # Template customization
        if template != 'general':
            costs['template_customization'] = self.rates['template_customization']
        
        return costs
    
    async def _calculate_deployment_costs(
        self,
        template: str,
        complexity: str,
        requirements: Dict[str, Any]
    ) -> Dict[str, float]:
        """Calculate deployment-related costs."""
        
        costs = {
            'deployment_setup': self.rates['deployment_setup']
        }
        
        # Integration costs
        integrations = requirements.get('integration_requirements', [])
        if integrations:
            costs['integration_setup'] = len(integrations) * 0.01
        
        # Security setup
        security_req = requirements.get('security_requirements', {})
        if security_req.get('authentication') == 'required':
            costs['security_setup'] = 0.02
        
        return costs
    
    async def _calculate_operating_costs(
        self,
        template: str,
        complexity: str,
        requirements: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate ongoing operating costs."""
        
        monthly_costs = {
            'base_hosting': 1.0,  # Base hosting cost
            'vector_storage': 0.1,  # Vector database storage
            'monitoring': 0.05  # Monitoring and logging
        }
        
        # Deployment type costs
        deployment_type = requirements.get('deployment_preferences', {}).get('type', 'container')
        
        if deployment_type == 'container':
            monthly_costs['container_runtime'] = 24 * 30 * self.rates['container_per_hour']  # 24/7
        elif deployment_type == 'serverless':
            # Estimate based on query volume
            estimated_queries_per_month = 1000
            monthly_costs['serverless_runtime'] = estimated_queries_per_month * self.rates['serverless_per_request']
        elif deployment_type == 'edge':
            monthly_costs['edge_runtime'] = 24 * 30 * self.rates['edge_per_hour']  # 24/7
        
        # Scaling costs
        scaling = requirements.get('scalability_needs', {})
        if scaling.get('expected_growth') == 'high':
            monthly_costs['scaling_buffer'] = 0.5
        
        # Per-query costs
        query_complexity = self._assess_query_complexity(template, requirements)
        if query_complexity == 'complex':
            per_query_cost = self.rates['rag_query_complex']
        else:
            per_query_cost = self.rates['rag_query_base']
        
        return {
            'monthly': monthly_costs,
            'per_query': per_query_cost
        }
    
    def _assess_query_complexity(self, template: str, requirements: Dict[str, Any]) -> str:
        """Assess the complexity of typical queries for this agent."""
        
        # Template-based complexity
        template_complexity = {
            'customer_support': 'medium',
            'documentation_qa': 'medium',
            'research_assistant': 'complex',
            'product_expert': 'medium',
            'general': 'simple'
        }
        
        base_complexity = template_complexity.get(template, 'simple')
        
        # Adjust based on requirements
        if requirements.get('knowledge_base_needs', {}).get('search_complexity') == 'high':
            return 'complex'
        
        if len(requirements.get('integration_requirements', [])) > 2:
            return 'complex'
        
        return base_complexity
    
    def _generate_optimization_tips(
        self,
        template: str,
        complexity: str,
        setup_costs: Dict[str, float],
        operating_costs: Dict[str, Any]
    ) -> List[str]:
        """Generate cost optimization suggestions."""
        
        tips = []
        
        # High setup costs
        if sum(setup_costs.values()) > 0.15:
            tips.append("Consider starting with a simpler template and adding features incrementally")
        
        # High embedding costs
        if setup_costs.get('embedding_generation', 0) > 0.01:
            tips.append("Use text-embedding-3-small model for lower embedding costs")
            tips.append("Optimize document chunking to reduce total token count")
        
        # High operating costs
        monthly_total = sum(operating_costs['monthly'].values())
        if monthly_total > 3.0:
            tips.append("Consider serverless deployment for lower fixed costs")
            tips.append("Implement query caching to reduce per-query costs")
        
        # Template-specific tips
        if template == 'research_assistant':
            tips.append("Research assistants have higher costs due to complex queries - consider limiting scope")
        elif template == 'customer_support':
            tips.append("Use automated escalation to reduce human intervention costs")
        
        # Complexity-specific tips
        if complexity == 'high':
            tips.append("High complexity increases costs by 50% - review requirements for simplification")
        
        # General tips
        tips.extend([
            "Monitor usage patterns and optimize based on actual query volume",
            "Consider knowledge base updates frequency to balance accuracy and costs",
            "Use query preprocessing to improve retrieval efficiency"
        ])
        
        return tips[:5]  # Return top 5 tips
    
    async def calculate_conversation_cost(
        self,
        conversation_id: str,
        message_count: int
    ) -> Dict[str, Any]:
        """Calculate cost for conversation management."""
        
        cost_breakdown = {
            'conversation_messages': message_count * self.rates['conversation_message'],
            'requirements_analysis': self.rates['requirements_analysis'],
            'cost_estimation': self.rates['cost_estimation']
        }
        
        total_cost = sum(cost_breakdown.values())
        
        return {
            'conversation_id': conversation_id,
            'breakdown': cost_breakdown,
            'total_cost': total_cost,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
    
    async def estimate_knowledge_base_cost(
        self,
        document_count: int,
        total_size_mb: float,
        estimated_tokens: int,
        update_frequency: str = 'weekly'
    ) -> Dict[str, Any]:
        """Estimate knowledge base creation and maintenance costs."""
        
        # One-time costs
        setup_costs = {
            'document_processing': total_size_mb * self.rates['document_processing_per_mb'],
            'embedding_generation': (estimated_tokens / 1000) * self.rates['embedding_generation_per_1k_tokens'],
            'knowledge_base_creation': self.rates['knowledge_base_creation']
        }
        
        # Ongoing costs
        daily_storage_cost = (estimated_tokens / 1000) * 0.1 * self.rates['vector_storage_per_mb_per_day']
        monthly_storage_cost = daily_storage_cost * 30
        
        # Update costs
        update_multipliers = {
            'daily': 30,
            'weekly': 4,
            'monthly': 1,
            'quarterly': 0.25
        }
        
        update_cost_per_cycle = setup_costs['document_processing'] * 0.2  # 20% of initial processing
        monthly_update_cost = update_cost_per_cycle * update_multipliers.get(update_frequency, 4)
        
        return {
            'setup_costs': setup_costs,
            'total_setup_cost': sum(setup_costs.values()),
            'monthly_storage_cost': monthly_storage_cost,
            'monthly_update_cost': monthly_update_cost,
            'total_monthly_cost': monthly_storage_cost + monthly_update_cost,
            'document_count': document_count,
            'total_size_mb': total_size_mb,
            'estimated_tokens': estimated_tokens,
            'update_frequency': update_frequency
        }
