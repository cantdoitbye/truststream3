from typing import Dict, List, Any, Optional, Callable, Tuple, Union
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
import json
import re
import math
from collections import defaultdict, deque
import logging
import asyncio

class LearningMode(Enum):
    PASSIVE = "passive"  # Learn from observations
    ACTIVE = "active"    # Actively seek information
    SUPERVISED = "supervised"  # Learn with feedback
    REINFORCEMENT = "reinforcement"  # Learn from rewards

@dataclass
class LearningEvent:
    event_id: str
    timestamp: datetime
    source: str
    content: str
    event_type: str
    confidence: float = 1.0
    metadata: Dict[str, Any] = None
    processed: bool = False
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}

@dataclass
class LearningPattern:
    pattern_id: str
    pattern_type: str
    trigger_conditions: List[str]
    action_template: str
    confidence: float = 1.0
    usage_count: int = 0
    success_rate: float = 0.0
    last_used: Optional[datetime] = None
    
    def apply(self, context: Dict[str, Any]) -> Optional[str]:
        """Apply pattern to generate action"""
        try:
            # Simple template substitution
            action = self.action_template
            for key, value in context.items():
                action = action.replace(f"{{{key}}}", str(value))
            
            self.usage_count += 1
            self.last_used = datetime.now()
            return action
        except Exception:
            return None

class AdaptiveLearning:
    """Adaptive learning system that improves over time"""
    
    def __init__(self, knowledge_graph=None):
        self.knowledge_graph = knowledge_graph
        self.learning_events: List[LearningEvent] = []
        self.learning_patterns: Dict[str, LearningPattern] = {}
        self.feedback_history: List[Dict[str, Any]] = []
        self.learning_metrics: Dict[str, float] = {
            'total_events': 0,
            'processed_events': 0,
            'learning_rate': 0.0,
            'accuracy': 0.0
        }
        self.logger = logging.getLogger("adaptive_learning")
    
    def add_learning_event(self, event: LearningEvent):
        """Add a new learning event"""
        self.learning_events.append(event)
        self.learning_metrics['total_events'] += 1
        
        # Process event if not already processed
        if not event.processed:
            self._process_learning_event(event)
    
    def _process_learning_event(self, event: LearningEvent):
        """Process a learning event to extract patterns"""
        try:
            # Extract patterns from event content
            patterns = self._extract_patterns(event)
            
            for pattern in patterns:
                self._update_or_create_pattern(pattern)
            
            # Add knowledge to graph if available
            if self.knowledge_graph:
                self._add_to_knowledge_graph(event)
            
            event.processed = True
            self.learning_metrics['processed_events'] += 1
            self._update_learning_rate()
            
        except Exception as e:
            self.logger.error(f"Failed to process learning event: {e}")
    
    def _extract_patterns(self, event: LearningEvent) -> List[LearningPattern]:
        """Extract patterns from learning event"""
        patterns = []
        
        # Simple pattern extraction based on event type
        if event.event_type == "user_query":
            # Extract query patterns
            pattern = LearningPattern(
                pattern_id=f"query_pattern_{len(self.learning_patterns)}",
                pattern_type="query_response",
                trigger_conditions=[event.content.lower()],
                action_template="Respond with relevant information about {topic}",
                confidence=event.confidence
            )
            patterns.append(pattern)
        
        elif event.event_type == "error":
            # Extract error patterns
            pattern = LearningPattern(
                pattern_id=f"error_pattern_{len(self.learning_patterns)}",
                pattern_type="error_handling",
                trigger_conditions=[event.content],
                action_template="Handle error: {error_type}",
                confidence=event.confidence
            )
            patterns.append(pattern)
        
        return patterns
    
    def _update_or_create_pattern(self, pattern: LearningPattern):
        """Update existing pattern or create new one"""
        # Check for similar existing patterns
        similar_pattern = self._find_similar_pattern(pattern)
        
        if similar_pattern:
            # Update existing pattern
            similar_pattern.confidence = (similar_pattern.confidence + pattern.confidence) / 2
            similar_pattern.trigger_conditions.extend(pattern.trigger_conditions)
            # Remove duplicates
            similar_pattern.trigger_conditions = list(set(similar_pattern.trigger_conditions))
        else:
            # Create new pattern
            self.learning_patterns[pattern.pattern_id] = pattern
    
    def _find_similar_pattern(self, pattern: LearningPattern) -> Optional[LearningPattern]:
        """Find similar existing pattern"""
        for existing_pattern in self.learning_patterns.values():
            if (existing_pattern.pattern_type == pattern.pattern_type and
                self._patterns_similar(existing_pattern, pattern)):
                return existing_pattern
        return None
    
    def _patterns_similar(self, pattern1: LearningPattern, pattern2: LearningPattern) -> bool:
        """Check if two patterns are similar"""
        # Simple similarity check based on trigger conditions overlap
        overlap = set(pattern1.trigger_conditions) & set(pattern2.trigger_conditions)
        total = set(pattern1.trigger_conditions) | set(pattern2.trigger_conditions)
        
        if not total:
            return False
        
        similarity = len(overlap) / len(total)
        return similarity > 0.5
    
    def _add_to_knowledge_graph(self, event: LearningEvent):
        """Add event information to knowledge graph"""
        if not self.knowledge_graph:
            return
        
        # Create entity from learning event
        from .knowledge_graph import KnowledgeEntity, KnowledgeType
        
        entity = KnowledgeEntity(
            id=f"learned_{event.event_id}",
            type=KnowledgeType.CONTEXTUAL,
            content=event.content,
            metadata={
                'source': event.source,
                'event_type': event.event_type,
                'learned_at': event.timestamp.isoformat()
            },
            relationships=[],
            confidence=event.confidence,
            source=f"adaptive_learning:{event.source}",
            tags=['learned', event.event_type]
        )
        
        self.knowledge_graph.add_entity(entity)
    
    def _update_learning_rate(self):
        """Update learning rate metric"""
        if self.learning_metrics['total_events'] > 0:
            self.learning_metrics['learning_rate'] = (
                self.learning_metrics['processed_events'] / 
                self.learning_metrics['total_events']
            )
    
    def provide_feedback(self, action_id: str, success: bool, details: str = ""):
        """Provide feedback on learning system actions"""
        feedback = {
            'action_id': action_id,
            'success': success,
            'details': details,
            'timestamp': datetime.now()
        }
        
        self.feedback_history.append(feedback)
        
        # Update pattern success rates
        self._update_pattern_success_rates()
        
        # Update overall accuracy
        self._update_accuracy()
    
    def _update_pattern_success_rates(self):
        """Update success rates for patterns based on feedback"""
        pattern_feedback = defaultdict(list)
        
        # Group feedback by pattern
        for feedback in self.feedback_history:
            action_id = feedback['action_id']
            # Extract pattern ID from action ID (if applicable)
            pattern_id = self._extract_pattern_id(action_id)
            if pattern_id and pattern_id in self.learning_patterns:
                pattern_feedback[pattern_id].append(feedback['success'])
        
        # Update success rates
        for pattern_id, successes in pattern_feedback.items():
            if pattern_id in self.learning_patterns:
                success_rate = sum(successes) / len(successes)
                self.learning_patterns[pattern_id].success_rate = success_rate
    
    def _extract_pattern_id(self, action_id: str) -> Optional[str]:
        """Extract pattern ID from action ID"""
        # Simple extraction - assumes action_id contains pattern_id
        if "pattern_" in action_id:
            return action_id.split(":")[0] if ":" in action_id else action_id
        return None
    
    def _update_accuracy(self):
        """Update overall accuracy metric"""
        if self.feedback_history:
            total_feedback = len(self.feedback_history)
            successful_actions = sum(1 for f in self.feedback_history if f['success'])
            self.learning_metrics['accuracy'] = successful_actions / total_feedback
    
    def get_best_patterns(self, pattern_type: str = None, top_k: int = 10) -> List[LearningPattern]:
        """Get best performing patterns"""
        patterns = list(self.learning_patterns.values())
        
        if pattern_type:
            patterns = [p for p in patterns if p.pattern_type == pattern_type]
        
        # Sort by success rate and usage count
        patterns.sort(key=lambda p: (p.success_rate, p.usage_count), reverse=True)
        
        return patterns[:top_k]
    
    def suggest_action(self, context: Dict[str, Any]) -> Optional[Tuple[str, float]]:
        """Suggest action based on learned patterns"""
        best_pattern = None
        best_score = 0.0
        
        for pattern in self.learning_patterns.values():
            score = self._calculate_pattern_score(pattern, context)
            if score > best_score:
                best_score = score
                best_pattern = pattern
        
        if best_pattern and best_score > 0.5:
            action = best_pattern.apply(context)
            if action:
                return action, best_score
        
        return None
    
    def _calculate_pattern_score(self, pattern: LearningPattern, context: Dict[str, Any]) -> float:
        """Calculate how well a pattern matches the context"""
        score = 0.0
        
        # Check trigger conditions
        context_text = " ".join(str(v) for v in context.values()).lower()
        
        matching_conditions = 0
        for condition in pattern.trigger_conditions:
            if condition.lower() in context_text:
                matching_conditions += 1
        
        if pattern.trigger_conditions:
            condition_score = matching_conditions / len(pattern.trigger_conditions)
        else:
            condition_score = 0.0
        
        # Combine with pattern performance metrics
        score = (condition_score * 0.4 + 
                pattern.success_rate * 0.3 + 
                pattern.confidence * 0.3)
        
        return score
    
    def get_learning_statistics(self) -> Dict[str, Any]:
        """Get comprehensive learning statistics"""
        stats = self.learning_metrics.copy()
        
        stats.update({
            'total_patterns': len(self.learning_patterns),
            'total_feedback': len(self.feedback_history),
            'pattern_types': list(set(p.pattern_type for p in self.learning_patterns.values())),
            'recent_events': len([e for e in self.learning_events 
                                if (datetime.now() - e.timestamp).days < 7]),
            'top_patterns': [{
                'id': p.pattern_id,
                'type': p.pattern_type,
                'success_rate': p.success_rate,
                'usage_count': p.usage_count
            } for p in self.get_best_patterns(top_k=5)]
        })
        
        return stats

class PersonalizationEngine:
    """Personalizes system behavior based on user preferences and history"""
    
    def __init__(self):
        self.user_profiles: Dict[str, Dict[str, Any]] = {}
        self.interaction_history: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        self.preference_models: Dict[str, Dict[str, float]] = defaultdict(dict)
        self.logger = logging.getLogger("personalization")
    
    def create_user_profile(self, user_id: str, 
                           preferences: Dict[str, Any] = None,
                           demographics: Dict[str, Any] = None) -> str:
        """Create a new user profile"""
        profile = {
            'user_id': user_id,
            'created_at': datetime.now(),
            'preferences': preferences or {},
            'demographics': demographics or {},
            'interaction_count': 0,
            'last_active': datetime.now(),
            'learning_style': 'adaptive',
            'expertise_level': 'beginner'
        }
        
        self.user_profiles[user_id] = profile
        return user_id
    
    def record_interaction(self, user_id: str, interaction: Dict[str, Any]):
        """Record user interaction"""
        if user_id not in self.user_profiles:
            self.create_user_profile(user_id)
        
        interaction['timestamp'] = datetime.now()
        self.interaction_history[user_id].append(interaction)
        
        # Update profile
        profile = self.user_profiles[user_id]
        profile['interaction_count'] += 1
        profile['last_active'] = datetime.now()
        
        # Update preference model
        self._update_preference_model(user_id, interaction)
    
    def _update_preference_model(self, user_id: str, interaction: Dict[str, Any]):
        """Update user preference model based on interaction"""
        preferences = self.preference_models[user_id]
        
        # Extract preferences from interaction
        if 'content_type' in interaction:
            content_type = interaction['content_type']
            current_score = preferences.get(content_type, 0.5)
            
            # Update based on satisfaction/engagement
            satisfaction = interaction.get('satisfaction', 0.5)
            new_score = current_score * 0.8 + satisfaction * 0.2
            preferences[content_type] = new_score
        
        if 'response_length' in interaction:
            length_pref = interaction['response_length']
            preferences['preferred_length'] = preferences.get('preferred_length', 0.5)
            
            # Simple preference learning
            if length_pref == 'short':
                preferences['preferred_length'] = max(0.0, preferences['preferred_length'] - 0.1)
            elif length_pref == 'long':
                preferences['preferred_length'] = min(1.0, preferences['preferred_length'] + 0.1)
    
    def get_personalized_response(self, user_id: str, 
                                base_response: str,
                                context: Dict[str, Any] = None) -> str:
        """Personalize response for specific user"""
        if user_id not in self.user_profiles:
            return base_response
        
        profile = self.user_profiles[user_id]
        preferences = self.preference_models.get(user_id, {})
        
        # Adjust response based on preferences
        personalized_response = base_response
        
        # Adjust length based on preference
        preferred_length = preferences.get('preferred_length', 0.5)
        if preferred_length < 0.3:  # User prefers short responses
            personalized_response = self._shorten_response(base_response)
        elif preferred_length > 0.7:  # User prefers detailed responses
            personalized_response = self._expand_response(base_response, context)
        
        # Adjust complexity based on expertise level
        expertise = profile.get('expertise_level', 'beginner')
        if expertise == 'beginner':
            personalized_response = self._simplify_response(personalized_response)
        elif expertise == 'expert':
            personalized_response = self._add_technical_details(personalized_response, context)
        
        return personalized_response
    
    def _shorten_response(self, response: str) -> str:
        """Shorten response by extracting key points"""
        sentences = response.split('. ')
        if len(sentences) <= 2:
            return response
        
        # Keep first and most important sentences
        shortened = sentences[0]
        if len(sentences) > 1:
            shortened += ". " + sentences[-1]
        
        return shortened
    
    def _expand_response(self, response: str, context: Dict[str, Any] = None) -> str:
        """Expand response with additional details"""
        expanded = response
        
        # Add contextual information if available
        if context:
            additional_info = []
            for key, value in context.items():
                if key.startswith('additional_'):
                    additional_info.append(f"{key.replace('additional_', '').title()}: {value}")
            
            if additional_info:
                expanded += "\n\nAdditional information:\n" + "\n".join(additional_info)
        
        return expanded
    
    def _simplify_response(self, response: str) -> str:
        """Simplify response for beginners"""
        # Replace technical terms with simpler alternatives
        simplifications = {
            'utilize': 'use',
            'facilitate': 'help',
            'implement': 'set up',
            'algorithm': 'method',
            'optimize': 'improve'
        }
        
        simplified = response
        for technical, simple in simplifications.items():
            simplified = simplified.replace(technical, simple)
        
        return simplified
    
    def _add_technical_details(self, response: str, context: Dict[str, Any] = None) -> str:
        """Add technical details for expert users"""
        technical = response
        
        # Add technical context if available
        if context and 'technical_details' in context:
            technical += "\n\nTechnical details: " + context['technical_details']
        
        return technical
    
    def get_user_insights(self, user_id: str) -> Dict[str, Any]:
        """Get insights about user behavior and preferences"""
        if user_id not in self.user_profiles:
            return {}
        
        profile = self.user_profiles[user_id]
        interactions = self.interaction_history.get(user_id, [])
        preferences = self.preference_models.get(user_id, {})
        
        # Calculate insights
        total_interactions = len(interactions)
        recent_interactions = [
            i for i in interactions 
            if (datetime.now() - i['timestamp']).days < 30
        ]
        
        avg_satisfaction = 0.0
        if interactions:
            satisfactions = [i.get('satisfaction', 0.5) for i in interactions]
            avg_satisfaction = sum(satisfactions) / len(satisfactions)
        
        return {
            'user_id': user_id,
            'total_interactions': total_interactions,
            'recent_interactions': len(recent_interactions),
            'avg_satisfaction': avg_satisfaction,
            'preferences': preferences,
            'expertise_level': profile.get('expertise_level'),
            'learning_style': profile.get('learning_style'),
            'last_active': profile.get('last_active').isoformat() if profile.get('last_active') else None,
            'engagement_trend': self._calculate_engagement_trend(interactions)
        }
    
    def _calculate_engagement_trend(self, interactions: List[Dict[str, Any]]) -> str:
        """Calculate user engagement trend"""
        if len(interactions) < 2:
            return 'insufficient_data'
        
        # Simple trend calculation based on recent vs older interactions
        recent_count = len([
            i for i in interactions 
            if (datetime.now() - i['timestamp']).days < 7
        ])
        
        older_count = len([
            i for i in interactions 
            if 7 <= (datetime.now() - i['timestamp']).days < 14
        ])
        
        if older_count == 0:
            return 'new_user'
        
        ratio = recent_count / older_count
        
        if ratio > 1.2:
            return 'increasing'
        elif ratio < 0.8:
            return 'decreasing'
        else:
            return 'stable'
