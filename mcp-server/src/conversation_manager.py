"""
Conversation Manager
Handles conversational flow and state management for RAG agent creation.
"""

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

class ConversationManager:
    """Manages conversations for RAG agent creation."""
    
    def __init__(self):
        self.conversations: Dict[str, Dict] = {}
    
    async def start_conversation(
        self,
        user_description: str,
        user_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Start a new conversation."""
        conversation_id = str(uuid.uuid4())
        
        conversation = {
            'id': conversation_id,
            'user_id': user_id,
            'initial_description': user_description,
            'state': 'started',
            'messages': [],
            'metadata': {
                'context': context or {},
                'progress': {
                    'requirements_gathered': False,
                    'template_selected': False,
                    'knowledge_base_configured': False,
                    'agent_generated': False,
                    'deployed': False
                }
            },
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        
        self.conversations[conversation_id] = conversation
        
        # Add initial message
        await self.add_message(
            conversation_id,
            'user',
            user_description,
            metadata={'type': 'initial_description'}
        )
        
        return conversation
    
    async def get_conversation(self, conversation_id: str) -> Dict[str, Any]:
        """Get conversation by ID."""
        if conversation_id not in self.conversations:
            raise ValueError(f"Conversation {conversation_id} not found")
        return self.conversations[conversation_id]
    
    async def add_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Add message to conversation."""
        conversation = await self.get_conversation(conversation_id)
        
        message = {
            'id': str(uuid.uuid4()),
            'role': role,
            'content': content,
            'metadata': metadata or {},
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        conversation['messages'].append(message)
        conversation['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    async def update_conversation_state(
        self,
        conversation_id: str,
        state_updates: Dict[str, Any]
    ) -> None:
        """Update conversation state and metadata."""
        conversation = await self.get_conversation(conversation_id)
        
        # Update state
        if 'state' in state_updates:
            conversation['state'] = state_updates['state']
        
        # Update metadata
        for key, value in state_updates.items():
            if key != 'state':
                if key in conversation['metadata']:
                    conversation['metadata'][key].update(value if isinstance(value, dict) else {key: value})
                else:
                    conversation['metadata'][key] = value
        
        conversation['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    async def generate_summary(self, conversation_id: str) -> Dict[str, Any]:
        """Generate conversation summary."""
        conversation = await self.get_conversation(conversation_id)
        
        summary = {
            'conversation_id': conversation_id,
            'initial_description': conversation['initial_description'],
            'current_state': conversation['state'],
            'message_count': len(conversation['messages']),
            'progress': conversation['metadata']['progress'],
            'key_decisions': self._extract_key_decisions(conversation),
            'requirements': self._extract_requirements(conversation),
            'duration_minutes': self._calculate_duration(conversation)
        }
        
        return summary
    
    def _extract_key_decisions(self, conversation: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract key decisions from conversation messages."""
        decisions = []
        
        for message in conversation['messages']:
            if message.get('metadata', {}).get('type') in ['template_selection', 'configuration', 'deployment']:
                decisions.append({
                    'timestamp': message['timestamp'],
                    'type': message['metadata']['type'],
                    'decision': message['content'][:200] + '...' if len(message['content']) > 200 else message['content']
                })
        
        return decisions
    
    def _extract_requirements(self, conversation: Dict[str, Any]) -> Dict[str, Any]:
        """Extract structured requirements from conversation."""
        requirements = {
            'use_case': '',
            'knowledge_sources': [],
            'target_users': '',
            'integration_requirements': [],
            'performance_requirements': {},
            'deployment_preferences': {}
        }
        
        # Extract from metadata if available
        if 'requirements_analysis' in conversation['metadata']:
            requirements.update(conversation['metadata']['requirements_analysis'])
        
        return requirements
    
    def _calculate_duration(self, conversation: Dict[str, Any]) -> float:
        """Calculate conversation duration in minutes."""
        if not conversation['messages']:
            return 0
        
        start_time = datetime.fromisoformat(conversation['created_at'].replace('Z', '+00:00'))
        end_time = datetime.fromisoformat(conversation['updated_at'].replace('Z', '+00:00'))
        
        return (end_time - start_time).total_seconds() / 60
