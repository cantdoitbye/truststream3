"""
RAG Processor
Handles requirements analysis and processing for RAG agent creation.
"""

import json
import re
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

class RAGProcessor:
    """Processes and analyzes requirements for RAG agents."""
    
    def __init__(self):
        self.domain_keywords = {
            'customer_support': ['support', 'help', 'customer', 'ticket', 'issue', 'problem'],
            'documentation': ['docs', 'documentation', 'guide', 'manual', 'api', 'reference'],
            'research': ['research', 'analysis', 'study', 'paper', 'academic', 'scientific'],
            'product': ['product', 'feature', 'specification', 'catalog', 'inventory'],
            'legal': ['legal', 'contract', 'compliance', 'regulation', 'policy'],
            'medical': ['medical', 'health', 'clinical', 'patient', 'diagnosis'],
            'financial': ['financial', 'finance', 'accounting', 'budget', 'investment']
        }
    
    async def analyze_initial_requirements(self, user_description: str) -> Dict[str, Any]:
        """Perform initial analysis of user requirements."""
        
        analysis = {
            'domain': self._detect_domain(user_description),
            'use_case': self._extract_use_case(user_description),
            'complexity_level': self._assess_complexity(user_description),
            'knowledge_sources': self._identify_knowledge_sources(user_description),
            'user_types': self._identify_user_types(user_description),
            'key_features': self._extract_key_features(user_description),
            'integration_needs': self._identify_integrations(user_description)
        }
        
        return analysis
    
    async def analyze_requirements(
        self,
        requirements: str,
        domain: Optional[str] = None
    ) -> Dict[str, Any]:
        """Detailed analysis of user requirements."""
        
        analysis = {
            'structured_requirements': await self._structure_requirements(requirements, domain),
            'knowledge_base_needs': await self._analyze_knowledge_base_needs(requirements),
            'suggested_tools': await self._suggest_rag_tools(requirements),
            'complexity_assessment': await self._detailed_complexity_assessment(requirements),
            'performance_requirements': await self._extract_performance_requirements(requirements),
            'security_requirements': await self._extract_security_requirements(requirements),
            'scalability_needs': await self._assess_scalability_needs(requirements)
        }
        
        return analysis
    
    async def process_conversation_message(
        self,
        conversation: Dict[str, Any],
        user_message: str,
        message_type: str
    ) -> Dict[str, Any]:
        """Process a conversation message and generate appropriate response."""
        
        current_state = conversation.get('state', 'started')
        
        if current_state == 'started' or current_state == 'gathering_requirements':
            return await self._handle_requirements_gathering(conversation, user_message)
        elif current_state == 'template_selection':
            return await self._handle_template_selection(conversation, user_message)
        elif current_state == 'knowledge_base_config':
            return await self._handle_knowledge_base_config(conversation, user_message)
        elif current_state == 'agent_configuration':
            return await self._handle_agent_configuration(conversation, user_message)
        else:
            return await self._handle_general_question(conversation, user_message)
    
    def _detect_domain(self, description: str) -> str:
        """Detect the domain/industry from description."""
        description_lower = description.lower()
        domain_scores = {}
        
        for domain, keywords in self.domain_keywords.items():
            score = sum(1 for keyword in keywords if keyword in description_lower)
            if score > 0:
                domain_scores[domain] = score
        
        if domain_scores:
            return max(domain_scores.items(), key=lambda x: x[1])[0]
        return 'general'
    
    def _extract_use_case(self, description: str) -> str:
        """Extract the primary use case from description."""
        use_cases = {
            'customer_support': ['customer support', 'help desk', 'support bot'],
            'documentation_qa': ['documentation', 'docs qa', 'api questions'],
            'research_assistant': ['research', 'analysis', 'literature review'],
            'product_advisor': ['product recommendation', 'product info', 'catalog'],
            'general_qa': ['questions', 'answers', 'information']
        }
        
        description_lower = description.lower()
        for use_case, patterns in use_cases.items():
            if any(pattern in description_lower for pattern in patterns):
                return use_case
        
        return 'general_qa'
    
    def _assess_complexity(self, description: str) -> str:
        """Assess the complexity level of the requirements."""
        complexity_indicators = {
            'high': ['integration', 'multiple systems', 'complex workflow', 'enterprise'],
            'medium': ['customization', 'specific format', 'multiple sources'],
            'low': ['simple', 'basic', 'straightforward', 'single source']
        }
        
        description_lower = description.lower()
        for level, indicators in complexity_indicators.items():
            if any(indicator in description_lower for indicator in indicators):
                return level
        
        return 'medium'
    
    def _identify_knowledge_sources(self, description: str) -> List[str]:
        """Identify potential knowledge sources mentioned."""
        sources = []
        source_patterns = {
            'documents': ['documents', 'pdfs', 'files', 'docs'],
            'website': ['website', 'web content', 'web pages'],
            'database': ['database', 'db', 'records'],
            'api': ['api', 'rest api', 'endpoint'],
            'wiki': ['wiki', 'confluence', 'knowledge base'],
            'help_desk': ['tickets', 'support tickets', 'issues']
        }
        
        description_lower = description.lower()
        for source_type, patterns in source_patterns.items():
            if any(pattern in description_lower for pattern in patterns):
                sources.append(source_type)
        
        return sources or ['documents']
    
    def _identify_user_types(self, description: str) -> List[str]:
        """Identify target user types."""
        user_types = []
        user_patterns = {
            'customers': ['customer', 'client', 'user'],
            'employees': ['employee', 'staff', 'team member'],
            'developers': ['developer', 'programmer', 'engineer'],
            'administrators': ['admin', 'administrator', 'manager']
        }
        
        description_lower = description.lower()
        for user_type, patterns in user_patterns.items():
            if any(pattern in description_lower for pattern in patterns):
                user_types.append(user_type)
        
        return user_types or ['general_users']
    
    def _extract_key_features(self, description: str) -> List[str]:
        """Extract key features mentioned in description."""
        features = []
        feature_patterns = {
            'multilingual': ['multilingual', 'multiple languages', 'translation'],
            'real_time': ['real time', 'instant', 'live'],
            'personalization': ['personalized', 'customized', 'tailored'],
            'integration': ['integrate', 'connect', 'sync'],
            'analytics': ['analytics', 'reporting', 'metrics'],
            'mobile': ['mobile', 'mobile app', 'smartphone']
        }
        
        description_lower = description.lower()
        for feature, patterns in feature_patterns.items():
            if any(pattern in description_lower for pattern in patterns):
                features.append(feature)
        
        return features
    
    def _identify_integrations(self, description: str) -> List[str]:
        """Identify integration requirements."""
        integrations = []
        integration_patterns = {
            'slack': ['slack'],
            'teams': ['microsoft teams', 'teams'],
            'email': ['email', 'smtp'],
            'crm': ['crm', 'salesforce', 'hubspot'],
            'ticketing': ['jira', 'zendesk', 'freshdesk'],
            'database': ['database', 'sql', 'mongodb'],
            'api': ['api', 'rest api', 'webhook']
        }
        
        description_lower = description.lower()
        for integration, patterns in integration_patterns.items():
            if any(pattern in description_lower for pattern in patterns):
                integrations.append(integration)
        
        return integrations
    
    async def _structure_requirements(self, requirements: str, domain: Optional[str]) -> Dict[str, Any]:
        """Structure raw requirements into organized format."""
        return {
            'functional_requirements': self._extract_functional_requirements(requirements),
            'non_functional_requirements': self._extract_non_functional_requirements(requirements),
            'data_requirements': self._extract_data_requirements(requirements),
            'user_interface_requirements': self._extract_ui_requirements(requirements),
            'integration_requirements': self._extract_integration_requirements(requirements)
        }
    
    async def _analyze_knowledge_base_needs(self, requirements: str) -> Dict[str, Any]:
        """Analyze knowledge base requirements."""
        return {
            'estimated_documents': self._estimate_document_count(requirements),
            'document_types': self._identify_document_types(requirements),
            'update_frequency': self._determine_update_frequency(requirements),
            'search_complexity': self._assess_search_complexity(requirements),
            'storage_requirements': self._estimate_storage_needs(requirements)
        }
    
    async def _suggest_rag_tools(self, requirements: str) -> List[Dict[str, Any]]:
        """Suggest RAG-specific tools based on requirements."""
        tools = [
            {
                'name': 'semantic_search',
                'description': 'Search knowledge base using semantic similarity',
                'priority': 'high',
                'complexity': 'medium'
            },
            {
                'name': 'document_qa',
                'description': 'Answer questions based on retrieved documents',
                'priority': 'high',
                'complexity': 'medium'
            },
            {
                'name': 'source_citation',
                'description': 'Provide citations for retrieved information',
                'priority': 'medium',
                'complexity': 'low'
            }
        ]
        
        # Add domain-specific tools based on requirements
        if 'customer' in requirements.lower():
            tools.append({
                'name': 'ticket_creation',
                'description': 'Create support tickets when needed',
                'priority': 'medium',
                'complexity': 'high'
            })
        
        return tools
    
    async def _detailed_complexity_assessment(self, requirements: str) -> Dict[str, Any]:
        """Perform detailed complexity assessment."""
        return {
            'overall_complexity': self._assess_complexity(requirements),
            'knowledge_base_complexity': 'medium',
            'retrieval_complexity': 'medium',
            'integration_complexity': 'low' if not self._identify_integrations(requirements) else 'high',
            'deployment_complexity': 'medium',
            'maintenance_complexity': 'low'
        }
    
    async def _extract_performance_requirements(self, requirements: str) -> Dict[str, Any]:
        """Extract performance requirements."""
        return {
            'response_time': '< 2 seconds',
            'concurrent_users': 100,
            'availability': '99.9%',
            'throughput': '100 queries/minute'
        }
    
    async def _extract_security_requirements(self, requirements: str) -> Dict[str, Any]:
        """Extract security requirements."""
        return {
            'authentication': 'required' if 'auth' in requirements.lower() else 'optional',
            'data_encryption': True,
            'access_control': 'role_based' if 'role' in requirements.lower() else 'basic',
            'audit_logging': True
        }
    
    async def _assess_scalability_needs(self, requirements: str) -> Dict[str, Any]:
        """Assess scalability needs."""
        return {
            'expected_growth': 'moderate',
            'scaling_type': 'horizontal',
            'peak_load_multiplier': 3,
            'geographic_distribution': 'single_region'
        }
    
    # Message handling methods
    async def _handle_requirements_gathering(self, conversation: Dict, message: str) -> Dict[str, Any]:
        """Handle requirements gathering phase."""
        return {
            'message': 'Thank you for the additional requirements. Let me analyze what you need and suggest some templates.',
            'state': 'template_selection',
            'state_update': {'state': 'template_selection'},
            'actions': ['review_templates', 'provide_more_details', 'estimate_costs'],
            'progress': {'requirements_gathered': True}
        }
    
    async def _handle_template_selection(self, conversation: Dict, message: str) -> Dict[str, Any]:
        """Handle template selection phase."""
        return {
            'message': 'Great template choice! Now let\'s configure your knowledge base. What documents or data sources do you want to include?',
            'state': 'knowledge_base_config',
            'state_update': {'state': 'knowledge_base_config'},
            'actions': ['upload_documents', 'configure_sources', 'test_retrieval'],
            'progress': {'template_selected': True}
        }
    
    async def _handle_knowledge_base_config(self, conversation: Dict, message: str) -> Dict[str, Any]:
        """Handle knowledge base configuration phase."""
        return {
            'message': 'Knowledge base configuration looks good. Let\'s finalize your agent configuration and prepare for deployment.',
            'state': 'agent_configuration',
            'state_update': {'state': 'agent_configuration'},
            'actions': ['configure_agent', 'estimate_costs', 'deploy'],
            'progress': {'knowledge_base_configured': True}
        }
    
    async def _handle_agent_configuration(self, conversation: Dict, message: str) -> Dict[str, Any]:
        """Handle agent configuration phase."""
        return {
            'message': 'Agent configuration is complete! Your RAG agent is ready for deployment.',
            'state': 'ready_for_deployment',
            'state_update': {'state': 'ready_for_deployment'},
            'actions': ['deploy_agent', 'preview_agent', 'modify_config'],
            'progress': {'agent_generated': True}
        }
    
    async def _handle_general_question(self, conversation: Dict, message: str) -> Dict[str, Any]:
        """Handle general questions or clarifications."""
        return {
            'message': 'I understand your question. Let me provide some clarification and guidance.',
            'actions': ['continue_conversation', 'get_help', 'restart_process']
        }
    
    # Helper methods for requirements analysis
    def _extract_functional_requirements(self, requirements: str) -> List[str]:
        return ['Answer user questions', 'Search knowledge base', 'Provide relevant responses']
    
    def _extract_non_functional_requirements(self, requirements: str) -> List[str]:
        return ['Fast response time', 'High availability', 'Secure data handling']
    
    def _extract_data_requirements(self, requirements: str) -> List[str]:
        return ['Document storage', 'Vector embeddings', 'Search indices']
    
    def _extract_ui_requirements(self, requirements: str) -> List[str]:
        return ['Chat interface', 'File upload', 'Search results display']
    
    def _extract_integration_requirements(self, requirements: str) -> List[str]:
        return self._identify_integrations(requirements)
    
    def _estimate_document_count(self, requirements: str) -> int:
        return 100  # Default estimate
    
    def _identify_document_types(self, requirements: str) -> List[str]:
        return ['PDF', 'DOCX', 'TXT', 'HTML']
    
    def _determine_update_frequency(self, requirements: str) -> str:
        return 'weekly'
    
    def _assess_search_complexity(self, requirements: str) -> str:
        return 'medium'
    
    def _estimate_storage_needs(self, requirements: str) -> Dict[str, Any]:
        return {'documents': '1GB', 'embeddings': '500MB', 'metadata': '100MB'}
