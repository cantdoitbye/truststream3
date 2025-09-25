"""
RAG Templates Manager
Manages RAG agent templates and configurations for different use cases.
"""

from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

class RAGTemplateManager:
    """Manages RAG templates for different use cases."""
    
    def __init__(self):
        self.templates = self._initialize_templates()
    
    def _initialize_templates(self) -> Dict[str, Dict[str, Any]]:
        """Initialize predefined RAG templates."""
        
        return {
            'customer_support': {
                'name': 'Customer Support Assistant',
                'description': 'RAG agent for customer support with ticket integration',
                'use_cases': [
                    'Answer customer questions from help docs',
                    'Create support tickets for complex issues',
                    'Escalate to human agents when needed',
                    'Provide troubleshooting guidance'
                ],
                'knowledge_sources': [
                    'Help documentation',
                    'FAQ databases',
                    'Troubleshooting guides',
                    'Product manuals',
                    'Support ticket history'
                ],
                'recommended_tools': [
                    'semantic_search',
                    'document_qa',
                    'ticket_creation',
                    'escalation_handler',
                    'source_citation'
                ],
                'rag_config': {
                    'similarity_top_k': 3,
                    'similarity_threshold': 0.8,
                    'reranking': True,
                    'response_style': 'helpful_and_professional',
                    'max_context_length': 3000
                },
                'integrations': ['support_system', 'ticketing', 'chat_platform'],
                'complexity': 'medium',
                'estimated_setup_time': '2-4 hours',
                'target_users': ['customers', 'support_agents']
            },
            
            'documentation_qa': {
                'name': 'Documentation Q&A Assistant',
                'description': 'RAG agent for technical documentation and API questions',
                'use_cases': [
                    'Answer questions about API documentation',
                    'Provide code examples and snippets',
                    'Explain technical concepts',
                    'Guide users through setup processes'
                ],
                'knowledge_sources': [
                    'API documentation',
                    'Technical guides',
                    'Code repositories',
                    'Tutorials and examples',
                    'Architecture documents'
                ],
                'recommended_tools': [
                    'semantic_search',
                    'document_qa',
                    'code_search',
                    'api_reference',
                    'source_citation'
                ],
                'rag_config': {
                    'similarity_top_k': 7,
                    'similarity_threshold': 0.75,
                    'multi_query': True,
                    'code_extraction': True,
                    'max_context_length': 5000
                },
                'integrations': ['documentation_site', 'code_repository', 'api_gateway'],
                'complexity': 'medium',
                'estimated_setup_time': '1-3 hours',
                'target_users': ['developers', 'technical_users']
            },
            
            'research_assistant': {
                'name': 'Research Assistant',
                'description': 'RAG agent for research and academic literature analysis',
                'use_cases': [
                    'Find relevant research papers',
                    'Summarize academic literature',
                    'Answer research questions with citations',
                    'Identify research gaps and opportunities'
                ],
                'knowledge_sources': [
                    'Research papers and publications',
                    'Academic databases',
                    'Conference proceedings',
                    'Technical reports',
                    'Literature reviews'
                ],
                'recommended_tools': [
                    'semantic_search',
                    'document_qa',
                    'literature_search',
                    'fact_checker',
                    'source_citation'
                ],
                'rag_config': {
                    'similarity_top_k': 10,
                    'similarity_threshold': 0.65,
                    'multi_hop_reasoning': True,
                    'citation_style': 'academic',
                    'max_context_length': 6000
                },
                'integrations': ['academic_databases', 'reference_manager', 'citation_tools'],
                'complexity': 'high',
                'estimated_setup_time': '4-8 hours',
                'target_users': ['researchers', 'academics', 'analysts']
            },
            
            'product_expert': {
                'name': 'Product Expert Assistant',
                'description': 'RAG agent for product information and recommendations',
                'use_cases': [
                    'Answer product-related questions',
                    'Provide product recommendations',
                    'Compare products and features',
                    'Assist with product selection'
                ],
                'knowledge_sources': [
                    'Product catalogs',
                    'Product specifications',
                    'User manuals',
                    'Feature comparisons',
                    'Customer reviews'
                ],
                'recommended_tools': [
                    'semantic_search',
                    'document_qa',
                    'product_recommender',
                    'comparison_analyzer',
                    'source_citation'
                ],
                'rag_config': {
                    'similarity_top_k': 5,
                    'similarity_threshold': 0.8,
                    'recommendation_engine': True,
                    'comparison_analysis': True,
                    'max_context_length': 4000
                },
                'integrations': ['product_database', 'e_commerce', 'inventory_system'],
                'complexity': 'medium',
                'estimated_setup_time': '2-4 hours',
                'target_users': ['customers', 'sales_team', 'product_managers']
            },
            
            'general_qa': {
                'name': 'General Q&A Assistant',
                'description': 'General purpose RAG agent for knowledge base queries',
                'use_cases': [
                    'Answer general questions from knowledge base',
                    'Provide information on various topics',
                    'Search and retrieve relevant documents',
                    'Summarize information from multiple sources'
                ],
                'knowledge_sources': [
                    'Document collections',
                    'Knowledge bases',
                    'Information databases',
                    'Content repositories'
                ],
                'recommended_tools': [
                    'semantic_search',
                    'document_qa',
                    'context_summarization',
                    'source_citation'
                ],
                'rag_config': {
                    'similarity_top_k': 5,
                    'similarity_threshold': 0.7,
                    'reranking': False,
                    'max_context_length': 4000
                },
                'integrations': ['knowledge_base', 'document_storage'],
                'complexity': 'low',
                'estimated_setup_time': '1-2 hours',
                'target_users': ['general_users']
            }
        }
    
    async def suggest_templates(
        self,
        user_description: str,
        requirements_analysis: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Suggest suitable templates based on user description and analysis."""
        
        description_lower = user_description.lower()
        suggestions = []
        
        # Score templates based on keyword matching
        for template_id, template in self.templates.items():
            score = self._calculate_template_score(
                template_id, template, description_lower, requirements_analysis
            )
            
            if score > 0:
                suggestions.append({
                    'template_id': template_id,
                    'template': template,
                    'score': score,
                    'match_reasons': self._get_match_reasons(
                        template_id, template, description_lower
                    ),
                    'customization_suggestions': self._get_customization_suggestions(
                        template_id, requirements_analysis
                    )
                })
        
        # Sort by score descending
        suggestions.sort(key=lambda x: x['score'], reverse=True)
        
        # Return top 3 suggestions
        return suggestions[:3]
    
    def _calculate_template_score(
        self,
        template_id: str,
        template: Dict[str, Any],
        description_lower: str,
        requirements_analysis: Optional[Dict[str, Any]] = None
    ) -> float:
        """Calculate relevance score for a template."""
        
        score = 0.0
        
        # Keyword matching in use cases
        use_cases = ' '.join(template['use_cases']).lower()
        common_words = set(description_lower.split()) & set(use_cases.split())
        score += len(common_words) * 0.2
        
        # Direct template name matching
        template_keywords = {
            'customer_support': ['customer', 'support', 'help', 'ticket', 'service'],
            'documentation_qa': ['documentation', 'docs', 'api', 'technical', 'guide'],
            'research_assistant': ['research', 'academic', 'paper', 'literature', 'study'],
            'product_expert': ['product', 'recommend', 'catalog', 'feature', 'compare'],
            'general_qa': ['question', 'answer', 'general', 'knowledge']
        }
        
        if template_id in template_keywords:
            keyword_matches = sum(
                1 for keyword in template_keywords[template_id]
                if keyword in description_lower
            )
            score += keyword_matches * 0.3
        
        # Requirements analysis matching
        if requirements_analysis:
            domain = requirements_analysis.get('domain', '')
            use_case = requirements_analysis.get('use_case', '')
            
            # Domain matching
            domain_mapping = {
                'customer_support': 'customer_support',
                'documentation': 'documentation_qa',
                'research': 'research_assistant',
                'product': 'product_expert'
            }
            
            if domain in domain_mapping and domain_mapping[domain] == template_id:
                score += 0.5
            
            # Use case matching
            if use_case and template_id in use_case:
                score += 0.4
        
        return score
    
    def _get_match_reasons(
        self,
        template_id: str,
        template: Dict[str, Any],
        description_lower: str
    ) -> List[str]:
        """Get reasons why this template matches the requirements."""
        
        reasons = []
        
        # Check for specific keyword matches
        keyword_reasons = {
            'customer_support': {
                'customer': 'Detected customer service requirements',
                'support': 'Matches support functionality needs',
                'help': 'Aligns with help desk use case',
                'ticket': 'Includes ticket management features'
            },
            'documentation_qa': {
                'documentation': 'Perfect for documentation queries',
                'api': 'Specialized for API documentation',
                'technical': 'Handles technical questions well',
                'code': 'Includes code search capabilities'
            },
            'research_assistant': {
                'research': 'Designed for research tasks',
                'academic': 'Supports academic workflows',
                'paper': 'Handles research papers effectively',
                'analysis': 'Provides analytical capabilities'
            },
            'product_expert': {
                'product': 'Specialized for product information',
                'recommend': 'Includes recommendation engine',
                'catalog': 'Works with product catalogs',
                'compare': 'Supports product comparisons'
            }
        }
        
        if template_id in keyword_reasons:
            for keyword, reason in keyword_reasons[template_id].items():
                if keyword in description_lower:
                    reasons.append(reason)
        
        # Add general template benefits
        if template['complexity'] == 'low':
            reasons.append('Simple setup and maintenance')
        elif template['complexity'] == 'high':
            reasons.append('Advanced features for complex requirements')
        
        return reasons[:3]  # Return top 3 reasons
    
    def _get_customization_suggestions(
        self,
        template_id: str,
        requirements_analysis: Optional[Dict[str, Any]] = None
    ) -> List[str]:
        """Get customization suggestions for the template."""
        
        suggestions = []
        
        if not requirements_analysis:
            return [f'Customize {template_id} template based on your specific needs']
        
        # Performance requirements
        perf_req = requirements_analysis.get('performance_requirements', {})
        if perf_req.get('response_time') and '1' in str(perf_req['response_time']):
            suggestions.append('Optimize for fast response times with smaller context windows')
        
        # Integration requirements
        integrations = requirements_analysis.get('integration_requirements', [])
        if integrations:
            suggestions.append(f'Add integrations for: {", ".join(integrations[:3])}')
        
        # Security requirements
        security = requirements_analysis.get('security_requirements', {})
        if security.get('authentication') == 'required':
            suggestions.append('Enable authentication and access control')
        
        # Scalability needs
        scalability = requirements_analysis.get('scalability_needs', {})
        if scalability.get('expected_growth') == 'high':
            suggestions.append('Configure for high scalability with load balancing')
        
        # Template-specific suggestions
        template_suggestions = {
            'customer_support': [
                'Configure escalation rules based on issue complexity',
                'Set up automatic ticket categorization',
                'Integrate with your support ticket system'
            ],
            'documentation_qa': [
                'Enable code syntax highlighting in responses',
                'Set up automatic documentation updates',
                'Configure API endpoint testing'
            ],
            'research_assistant': [
                'Configure academic citation formats',
                'Set up literature database connections',
                'Enable advanced search with filters'
            ],
            'product_expert': [
                'Configure product recommendation algorithms',
                'Set up inventory integration',
                'Enable price comparison features'
            ]
        }
        
        if template_id in template_suggestions:
            suggestions.extend(template_suggestions[template_id][:2])
        
        return suggestions[:4]  # Return top 4 suggestions
    
    def get_template(self, template_id: str) -> Optional[Dict[str, Any]]:
        """Get template by ID."""
        return self.templates.get(template_id)
    
    def get_all_templates(self) -> Dict[str, Dict[str, Any]]:
        """Get all available templates."""
        return self.templates
    
    def get_template_recommendations(self, suggestions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Get recommendations based on template suggestions."""
        
        if not suggestions:
            return {
                'primary_recommendation': 'general_qa',
                'reasoning': 'No specific requirements detected - general Q&A is most versatile',
                'alternatives': ['customer_support', 'documentation_qa']
            }
        
        primary = suggestions[0]
        
        recommendations = {
            'primary_recommendation': primary['template_id'],
            'reasoning': f'Best match with score {primary["score"]:.1f} - {primary["match_reasons"][0] if primary["match_reasons"] else "good keyword matching"}',
            'alternatives': [s['template_id'] for s in suggestions[1:3]],
            'customization_priority': primary.get('customization_suggestions', [])[:2]
        }
        
        # Add confidence level
        if primary['score'] >= 1.0:
            recommendations['confidence'] = 'high'
        elif primary['score'] >= 0.5:
            recommendations['confidence'] = 'medium'
        else:
            recommendations['confidence'] = 'low'
        
        return recommendations
    
    def get_customization_options(self) -> Dict[str, Any]:
        """Get available customization options for templates."""
        
        return {
            'rag_config': {
                'similarity_top_k': {
                    'description': 'Number of similar documents to retrieve',
                    'range': [1, 20],
                    'default': 5
                },
                'similarity_threshold': {
                    'description': 'Minimum similarity score for relevance',
                    'range': [0.3, 1.0],
                    'default': 0.7
                },
                'max_context_length': {
                    'description': 'Maximum context length for responses',
                    'range': [1000, 8000],
                    'default': 4000
                },
                'reranking': {
                    'description': 'Enable result reranking for better relevance',
                    'type': 'boolean',
                    'default': False
                }
            },
            'deployment': {
                'type': {
                    'description': 'Deployment type',
                    'options': ['container', 'serverless', 'edge'],
                    'default': 'container'
                },
                'scaling': {
                    'description': 'Auto-scaling configuration',
                    'options': ['manual', 'auto', 'predictive'],
                    'default': 'auto'
                }
            },
            'integrations': {
                'available': [
                    'slack', 'teams', 'discord', 'email',
                    'jira', 'zendesk', 'freshdesk',
                    'api_gateway', 'webhook', 'database'
                ],
                'configuration_required': True
            },
            'security': {
                'authentication': {
                    'options': ['none', 'api_key', 'oauth', 'saml'],
                    'default': 'api_key'
                },
                'encryption': {
                    'description': 'Data encryption settings',
                    'default': 'enabled'
                }
            }
        }
    
    def validate_template_selection(
        self,
        template_id: str,
        requirements: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate if selected template meets requirements."""
        
        template = self.get_template(template_id)
        if not template:
            return {
                'valid': False,
                'issues': ['Template not found'],
                'warnings': []
            }
        
        issues = []
        warnings = []
        
        # Check complexity match
        req_complexity = requirements.get('complexity_assessment', {}).get('overall_complexity', 'medium')
        template_complexity = template['complexity']
        
        complexity_levels = {'low': 1, 'medium': 2, 'high': 3}
        
        if complexity_levels[req_complexity] > complexity_levels[template_complexity] + 1:
            issues.append(f'Template complexity ({template_complexity}) may not meet requirements ({req_complexity})')
        elif complexity_levels[req_complexity] < complexity_levels[template_complexity] - 1:
            warnings.append(f'Template may be over-engineered for requirements (template: {template_complexity}, need: {req_complexity})')
        
        # Check integration requirements
        req_integrations = set(requirements.get('integration_requirements', []))
        template_integrations = set(template.get('integrations', []))
        
        missing_integrations = req_integrations - template_integrations
        if missing_integrations:
            warnings.append(f'Template missing integrations: {", ".join(missing_integrations)}')
        
        return {
            'valid': len(issues) == 0,
            'issues': issues,
            'warnings': warnings,
            'recommendations': self._get_template_fix_recommendations(template_id, issues, warnings)
        }
    
    def _get_template_fix_recommendations(
        self,
        template_id: str,
        issues: List[str],
        warnings: List[str]
    ) -> List[str]:
        """Get recommendations to fix template validation issues."""
        
        recommendations = []
        
        if issues:
            if 'complexity' in ' '.join(issues).lower():
                recommendations.append('Consider a more advanced template or custom tools')
        
        if warnings:
            if 'over-engineered' in ' '.join(warnings).lower():
                recommendations.append('You can simplify the configuration to reduce costs')
            if 'missing integrations' in ' '.join(warnings).lower():
                recommendations.append('Additional integrations can be added during customization')
        
        return recommendations
