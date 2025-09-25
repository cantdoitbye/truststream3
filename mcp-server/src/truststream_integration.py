"""
TrustStream Integration
Handles integration with existing TrustStream infrastructure.
"""

import json
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx

class TrustStreamIntegrator:
    """Integrates with TrustStream backend services."""
    
    def __init__(self):
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        self.backend_url = os.getenv('TRUSTSTREAM_BACKEND_URL')
        
    async def check_user_credits(
        self,
        user_id: str,
        required_credits: float
    ) -> Dict[str, Any]:
        """Check if user has sufficient credits."""
        
        if not self.supabase_url or not self.service_role_key:
            return {'success': False, 'error': 'Supabase configuration missing'}
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f'{self.supabase_url}/rest/v1/user_credits?user_id=eq.{user_id}',
                    headers={
                        'Authorization': f'Bearer {self.service_role_key}',
                        'apikey': self.service_role_key,
                        'Content-Type': 'application/json'
                    }
                )
                
                if response.status_code != 200:
                    return {'success': False, 'error': 'Failed to fetch user credits'}
                
                credits_data = response.json()
                if not credits_data:
                    return {'success': False, 'error': 'User credits not found'}
                
                user_credit = credits_data[0]
                current_balance = float(user_credit.get('current_balance', 0))
                
                return {
                    'success': True,
                    'current_balance': current_balance,
                    'required_credits': required_credits,
                    'sufficient': current_balance >= required_credits,
                    'shortfall': max(0, required_credits - current_balance)
                }
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def deduct_credits(
        self,
        user_id: str,
        amount: float,
        description: str,
        reference_id: str
    ) -> Dict[str, Any]:
        """Deduct credits from user account."""
        
        if not self.supabase_url or not self.service_role_key:
            return {'success': False, 'error': 'Supabase configuration missing'}
        
        try:
            # Use existing credit-deduction edge function
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f'{self.supabase_url}/functions/v1/credit-deduction',
                    headers={
                        'Authorization': f'Bearer {self.service_role_key}',
                        'Content-Type': 'application/json'
                    },
                    json={
                        'workflowId': reference_id,
                        'workflowRunId': reference_id,
                        'workflowName': description,
                        'estimatedCost': amount
                    }
                )
                
                if response.status_code == 200:
                    return {'success': True, 'data': response.json()}
                else:
                    return {'success': False, 'error': response.text}
                    
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def deploy_rag_agent(
        self,
        agent_config: Dict[str, Any],
        user_id: str,
        deployment_options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Deploy RAG agent using TrustStream infrastructure."""
        
        deployment_options = deployment_options or {}
        
        try:
            # Prepare agent deployment data
            deployment_data = {
                'workflowId': agent_config['agent_id'],
                'agentCode': {
                    'agent_id': agent_config['agent_id'],
                    'name': agent_config['name'],
                    'server_code': agent_config['server_code'],
                    'requirements': self._extract_requirements(agent_config),
                    'environment_vars': agent_config['environment_vars'],
                    'deployment_config': agent_config['deployment_config'],
                    'tools': [{'name': t['name'], 'description': t['description']} for t in agent_config['tools']]
                },
                'deploymentType': deployment_options.get('type', 'container'),
                'instanceConfig': deployment_options.get('instance_config', {}),
                'autoStart': deployment_options.get('auto_start', True)
            }
            
            # Use existing agent-deploy edge function
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f'{self.supabase_url}/functions/v1/agent-deploy',
                    headers={
                        'Authorization': f'Bearer {self.service_role_key}',
                        'Content-Type': 'application/json'
                    },
                    json=deployment_data
                )
                
                if response.status_code == 200:
                    return {'success': True, 'deployment': response.json()}
                else:
                    return {'success': False, 'error': response.text}
                    
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def get_agent_status(
        self,
        deployment_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """Get agent deployment status."""
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f'{self.supabase_url}/rest/v1/agent_deployments?id=eq.{deployment_id}&user_id=eq.{user_id}',
                    headers={
                        'Authorization': f'Bearer {self.service_role_key}',
                        'apikey': self.service_role_key,
                        'Content-Type': 'application/json'
                    }
                )
                
                if response.status_code == 200:
                    deployments = response.json()
                    if deployments:
                        return {'success': True, 'status': deployments[0]}
                    else:
                        return {'success': False, 'error': 'Deployment not found'}
                else:
                    return {'success': False, 'error': response.text}
                    
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def update_agent_config(
        self,
        deployment_id: str,
        user_id: str,
        config_updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update agent configuration."""
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f'{self.supabase_url}/rest/v1/agent_deployments?id=eq.{deployment_id}&user_id=eq.{user_id}',
                    headers={
                        'Authorization': f'Bearer {self.service_role_key}',
                        'apikey': self.service_role_key,
                        'Content-Type': 'application/json'
                    },
                    json={
                        **config_updates,
                        'updated_at': datetime.now(timezone.utc).isoformat()
                    }
                )
                
                if response.status_code == 200:
                    return {'success': True, 'updated': True}
                else:
                    return {'success': False, 'error': response.text}
                    
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def track_usage(
        self,
        agent_id: str,
        user_id: str,
        usage_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Track agent usage and costs."""
        
        try:
            # Create usage tracking record
            usage_record = {
                'user_id': user_id,
                'workflow_id': agent_id,
                'usage_type': 'rag_query',
                'usage_data': usage_data,
                'cost': usage_data.get('cost', 0),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f'{self.supabase_url}/rest/v1/usage_tracking',
                    headers={
                        'Authorization': f'Bearer {self.service_role_key}',
                        'apikey': self.service_role_key,
                        'Content-Type': 'application/json'
                    },
                    json=usage_record
                )
                
                if response.status_code == 201:
                    return {'success': True, 'tracked': True}
                else:
                    return {'success': False, 'error': response.text}
                    
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def get_cost_estimates(
        self,
        agent_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Get cost estimates for agent deployment and operation."""
        
        try:
            # Use existing workflow cost estimation if available
            if self.backend_url:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f'{self.backend_url}/api/workflow/cost-estimate',
                        json={
                            'workflow_config': agent_config,
                            'agent_type': 'rag_agent'
                        }
                    )
                    
                    if response.status_code == 200:
                        return {'success': True, 'estimates': response.json()}
            
            # Fallback to local estimation
            estimates = {
                'setup_cost': 0.05,  # Base setup cost
                'monthly_cost': 2.0,  # Base monthly cost
                'per_query_cost': 0.001,  # Per query cost
                'storage_cost': 0.01 * agent_config.get('storage_gb', 1),
                'deployment_cost': 0.02
            }
            
            return {'success': True, 'estimates': estimates}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _extract_requirements(self, agent_config: Dict[str, Any]) -> List[str]:
        """Extract Python requirements from agent config."""
        base_requirements = [
            'fastmcp>=0.4.0',
            'httpx>=0.25.0',
            'pydantic>=2.0.0',
            'openai>=1.0.0',
            'chromadb>=0.4.0'
        ]
        
        # Add template-specific requirements
        template = agent_config.get('template', '')
        if template == 'customer_support':
            base_requirements.extend([
                'requests>=2.28.0',
                'python-dotenv>=1.0.0'
            ])
        elif template == 'documentation_qa':
            base_requirements.extend([
                'beautifulsoup4>=4.12.0',
                'markdown>=3.4.0'
            ])
        
        return base_requirements
    
    async def validate_deployment_readiness(
        self,
        agent_config: Dict[str, Any],
        user_id: str
    ) -> Dict[str, Any]:
        """Validate that everything is ready for deployment."""
        
        validation_results = {
            'ready': True,
            'issues': [],
            'warnings': []
        }
        
        # Check required fields
        required_fields = ['agent_id', 'name', 'server_code', 'deployment_config']
        for field in required_fields:
            if not agent_config.get(field):
                validation_results['issues'].append(f'Missing required field: {field}')
                validation_results['ready'] = False
        
        # Check knowledge base
        if not agent_config.get('knowledge_base_id'):
            validation_results['issues'].append('Knowledge base not configured')
            validation_results['ready'] = False
        
        # Check environment variables
        if not agent_config.get('environment_vars', {}).get('OPENAI_API_KEY'):
            validation_results['warnings'].append('OpenAI API key not configured')
        
        # Check user credits if possible
        if user_id:
            deployment_config = agent_config.get('deployment_config', {})
            estimated_cost = deployment_config.get('estimated_cost', 0.1)
            
            credit_check = await self.check_user_credits(user_id, estimated_cost)
            if credit_check['success'] and not credit_check['sufficient']:
                validation_results['issues'].append(
                    f'Insufficient credits: {credit_check["current_balance"]} available, {estimated_cost} required'
                )
                validation_results['ready'] = False
        
        return validation_results
