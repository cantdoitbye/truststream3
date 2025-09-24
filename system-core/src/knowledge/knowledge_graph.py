from typing import Dict, List, Any, Optional, Union, Tuple
from dataclasses import dataclass
from abc import ABC, abstractmethod
from datetime import datetime
from enum import Enum
import json
import math
import numpy as np
from collections import defaultdict, Counter
import re
import asyncio
import logging

class KnowledgeType(Enum):
    FACTUAL = "factual"
    PROCEDURAL = "procedural"
    CONCEPTUAL = "conceptual"
    CONTEXTUAL = "contextual"
    TEMPORAL = "temporal"

@dataclass
class KnowledgeEntity:
    id: str
    type: KnowledgeType
    content: str
    metadata: Dict[str, Any]
    relationships: List[str]  # IDs of related entities
    confidence: float = 1.0
    source: str = ""
    created_at: datetime = None
    updated_at: datetime = None
    tags: List[str] = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.updated_at is None:
            self.updated_at = self.created_at
        if self.tags is None:
            self.tags = []

@dataclass
class Relationship:
    id: str
    source_id: str
    target_id: str
    relation_type: str
    strength: float = 1.0
    bidirectional: bool = True
    metadata: Dict[str, Any] = None
    created_at: datetime = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.metadata is None:
            self.metadata = {}

class VectorEmbedding:
    """Handles vector embeddings for semantic search"""
    
    def __init__(self, dimensions: int = 384):
        self.dimensions = dimensions
        self.embeddings: Dict[str, np.ndarray] = {}
        self.index_mapping: Dict[int, str] = {}
        self.reverse_mapping: Dict[str, int] = {}
    
    def add_embedding(self, entity_id: str, vector: np.ndarray):
        """Add vector embedding for an entity"""
        if len(vector) != self.dimensions:
            raise ValueError(f"Vector dimension mismatch: expected {self.dimensions}, got {len(vector)}")
        
        self.embeddings[entity_id] = vector.astype(np.float32)
        
        # Update index mappings
        if entity_id not in self.reverse_mapping:
            index = len(self.index_mapping)
            self.index_mapping[index] = entity_id
            self.reverse_mapping[entity_id] = index
    
    def compute_similarity(self, entity_id1: str, entity_id2: str) -> float:
        """Compute cosine similarity between two entities"""
        if entity_id1 not in self.embeddings or entity_id2 not in self.embeddings:
            return 0.0
        
        vec1 = self.embeddings[entity_id1]
        vec2 = self.embeddings[entity_id2]
        
        # Cosine similarity
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return dot_product / (norm1 * norm2)
    
    def find_similar(self, entity_id: str, top_k: int = 10, threshold: float = 0.5) -> List[Tuple[str, float]]:
        """Find most similar entities to given entity"""
        if entity_id not in self.embeddings:
            return []
        
        similarities = []
        target_vector = self.embeddings[entity_id]
        
        for other_id, other_vector in self.embeddings.items():
            if other_id == entity_id:
                continue
            
            similarity = self._cosine_similarity(target_vector, other_vector)
            if similarity >= threshold:
                similarities.append((other_id, similarity))
        
        # Sort by similarity (descending) and return top_k
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:top_k]
    
    def search_by_vector(self, query_vector: np.ndarray, top_k: int = 10) -> List[Tuple[str, float]]:
        """Search entities by query vector"""
        if len(query_vector) != self.dimensions:
            raise ValueError(f"Query vector dimension mismatch: expected {self.dimensions}, got {len(query_vector)}")
        
        similarities = []
        
        for entity_id, entity_vector in self.embeddings.items():
            similarity = self._cosine_similarity(query_vector, entity_vector)
            similarities.append((entity_id, similarity))
        
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:top_k]
    
    def _cosine_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """Compute cosine similarity between two vectors"""
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return dot_product / (norm1 * norm2)

class KnowledgeGraph:
    """Core knowledge graph implementation"""
    
    def __init__(self):
        self.entities: Dict[str, KnowledgeEntity] = {}
        self.relationships: Dict[str, Relationship] = {}
        self.entity_relationships: Dict[str, List[str]] = defaultdict(list)
        self.type_index: Dict[KnowledgeType, List[str]] = defaultdict(list)
        self.tag_index: Dict[str, List[str]] = defaultdict(list)
        self.embeddings = VectorEmbedding()
        self.logger = logging.getLogger("knowledge_graph")
    
    def add_entity(self, entity: KnowledgeEntity) -> str:
        """Add entity to knowledge graph"""
        if entity.id in self.entities:
            self.logger.warning(f"Entity {entity.id} already exists, updating")
        
        self.entities[entity.id] = entity
        
        # Update indices
        self.type_index[entity.type].append(entity.id)
        for tag in entity.tags:
            self.tag_index[tag].append(entity.id)
        
        return entity.id
    
    def add_relationship(self, relationship: Relationship) -> str:
        """Add relationship between entities"""
        # Verify entities exist
        if relationship.source_id not in self.entities:
            raise ValueError(f"Source entity {relationship.source_id} not found")
        if relationship.target_id not in self.entities:
            raise ValueError(f"Target entity {relationship.target_id} not found")
        
        self.relationships[relationship.id] = relationship
        
        # Update entity relationship index
        self.entity_relationships[relationship.source_id].append(relationship.id)
        if relationship.bidirectional:
            self.entity_relationships[relationship.target_id].append(relationship.id)
        
        return relationship.id
    
    def get_entity(self, entity_id: str) -> Optional[KnowledgeEntity]:
        """Get entity by ID"""
        return self.entities.get(entity_id)
    
    def get_related_entities(self, entity_id: str, max_depth: int = 1) -> List[KnowledgeEntity]:
        """Get entities related to given entity"""
        if entity_id not in self.entities:
            return []
        
        related_ids = set()
        queue = [(entity_id, 0)]
        visited = {entity_id}
        
        while queue:
            current_id, depth = queue.pop(0)
            
            if depth >= max_depth:
                continue
            
            # Get relationships for current entity
            for rel_id in self.entity_relationships.get(current_id, []):
                relationship = self.relationships[rel_id]
                
                # Determine the related entity
                if relationship.source_id == current_id:
                    related_id = relationship.target_id
                else:
                    related_id = relationship.source_id
                
                if related_id not in visited:
                    related_ids.add(related_id)
                    visited.add(related_id)
                    queue.append((related_id, depth + 1))
        
        return [self.entities[eid] for eid in related_ids]
    
    def search_entities(self, 
                       query: str = None,
                       entity_type: KnowledgeType = None,
                       tags: List[str] = None,
                       confidence_threshold: float = 0.0) -> List[KnowledgeEntity]:
        """Search entities with various filters"""
        candidates = set(self.entities.keys())
        
        # Filter by type
        if entity_type:
            type_entities = set(self.type_index.get(entity_type, []))
            candidates = candidates.intersection(type_entities)
        
        # Filter by tags
        if tags:
            for tag in tags:
                tag_entities = set(self.tag_index.get(tag, []))
                candidates = candidates.intersection(tag_entities)
        
        # Filter by confidence
        if confidence_threshold > 0:
            candidates = {
                eid for eid in candidates 
                if self.entities[eid].confidence >= confidence_threshold
            }
        
        # Filter by text query
        if query:
            query_lower = query.lower()
            candidates = {
                eid for eid in candidates
                if query_lower in self.entities[eid].content.lower()
            }
        
        return [self.entities[eid] for eid in candidates]
    
    def semantic_search(self, query_vector: np.ndarray, top_k: int = 10) -> List[Tuple[KnowledgeEntity, float]]:
        """Perform semantic search using vector embeddings"""
        similar_entities = self.embeddings.search_by_vector(query_vector, top_k)
        
        results = []
        for entity_id, score in similar_entities:
            if entity_id in self.entities:
                results.append((self.entities[entity_id], score))
        
        return results
    
    def get_entity_path(self, source_id: str, target_id: str, max_depth: int = 5) -> Optional[List[str]]:
        """Find shortest path between two entities"""
        if source_id not in self.entities or target_id not in self.entities:
            return None
        
        if source_id == target_id:
            return [source_id]
        
        # BFS to find shortest path
        queue = [(source_id, [source_id])]
        visited = {source_id}
        
        while queue:
            current_id, path = queue.pop(0)
            
            if len(path) > max_depth:
                continue
            
            # Get connected entities
            for rel_id in self.entity_relationships.get(current_id, []):
                relationship = self.relationships[rel_id]
                
                # Determine the connected entity
                if relationship.source_id == current_id:
                    next_id = relationship.target_id
                else:
                    next_id = relationship.source_id
                
                if next_id == target_id:
                    return path + [next_id]
                
                if next_id not in visited:
                    visited.add(next_id)
                    queue.append((next_id, path + [next_id]))
        
        return None
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get knowledge graph statistics"""
        type_counts = {ktype.value: len(entities) for ktype, entities in self.type_index.items()}
        
        return {
            'total_entities': len(self.entities),
            'total_relationships': len(self.relationships),
            'entity_types': type_counts,
            'total_tags': len(self.tag_index),
            'avg_relationships_per_entity': len(self.relationships) / len(self.entities) if self.entities else 0
        }

class ContextManager:
    """Manages contextual information and sessions"""
    
    def __init__(self, knowledge_graph: KnowledgeGraph):
        self.knowledge_graph = knowledge_graph
        self.contexts: Dict[str, Dict[str, Any]] = {}
        self.active_context: Optional[str] = None
        self.context_history: List[str] = []
    
    def create_context(self, context_id: str, 
                      initial_entities: List[str] = None,
                      metadata: Dict[str, Any] = None) -> str:
        """Create a new context"""
        context = {
            'id': context_id,
            'created_at': datetime.now(),
            'entities': initial_entities or [],
            'relationships': [],
            'focus_entity': None,
            'metadata': metadata or {},
            'interaction_history': []
        }
        
        self.contexts[context_id] = context
        return context_id
    
    def activate_context(self, context_id: str):
        """Set active context"""
        if context_id not in self.contexts:
            raise ValueError(f"Context {context_id} not found")
        
        if self.active_context:
            self.context_history.append(self.active_context)
        
        self.active_context = context_id
    
    def add_to_context(self, entity_id: str, context_id: str = None):
        """Add entity to context"""
        target_context = context_id or self.active_context
        
        if not target_context or target_context not in self.contexts:
            raise ValueError(f"Invalid context: {target_context}")
        
        context = self.contexts[target_context]
        if entity_id not in context['entities']:
            context['entities'].append(entity_id)
    
    def get_context_entities(self, context_id: str = None) -> List[KnowledgeEntity]:
        """Get all entities in context"""
        target_context = context_id or self.active_context
        
        if not target_context or target_context not in self.contexts:
            return []
        
        context = self.contexts[target_context]
        entities = []
        
        for entity_id in context['entities']:
            entity = self.knowledge_graph.get_entity(entity_id)
            if entity:
                entities.append(entity)
        
        return entities
    
    def get_relevant_context(self, query: str, max_entities: int = 10) -> List[KnowledgeEntity]:
        """Get contextually relevant entities for a query"""
        if not self.active_context:
            return []
        
        context_entities = self.get_context_entities()
        
        # Simple relevance scoring based on content similarity
        scored_entities = []
        query_lower = query.lower()
        
        for entity in context_entities:
            content_lower = entity.content.lower()
            
            # Basic text similarity score
            common_words = set(query_lower.split()) & set(content_lower.split())
            score = len(common_words) / max(len(query_lower.split()), 1)
            
            scored_entities.append((entity, score))
        
        # Sort by score and return top entities
        scored_entities.sort(key=lambda x: x[1], reverse=True)
        return [entity for entity, score in scored_entities[:max_entities]]

class ReasoningEngine:
    """Handles reasoning and inference over knowledge"""
    
    def __init__(self, knowledge_graph: KnowledgeGraph):
        self.knowledge_graph = knowledge_graph
        self.inference_rules: List[Callable] = []
        self.reasoning_cache: Dict[str, Any] = {}
    
    def add_inference_rule(self, rule: Callable):
        """Add an inference rule"""
        self.inference_rules.append(rule)
    
    def infer_relationships(self, entity_id: str) -> List[Relationship]:
        """Infer new relationships for an entity"""
        entity = self.knowledge_graph.get_entity(entity_id)
        if not entity:
            return []
        
        inferred_relationships = []
        
        # Apply inference rules
        for rule in self.inference_rules:
            try:
                new_relationships = rule(entity, self.knowledge_graph)
                if new_relationships:
                    inferred_relationships.extend(new_relationships)
            except Exception as e:
                self.logger.error(f"Inference rule failed: {e}")
        
        return inferred_relationships
    
    def answer_question(self, question: str, context_entities: List[str] = None) -> Dict[str, Any]:
        """Answer a question using knowledge graph reasoning"""
        # Simple question answering implementation
        question_lower = question.lower()
        
        # Extract potential entity mentions from question
        entity_candidates = []
        for entity_id, entity in self.knowledge_graph.entities.items():
            if entity.content.lower() in question_lower or any(tag.lower() in question_lower for tag in entity.tags):
                entity_candidates.append(entity)
        
        # Filter by context if provided
        if context_entities:
            entity_candidates = [e for e in entity_candidates if e.id in context_entities]
        
        # Simple pattern matching for question types
        if any(word in question_lower for word in ['what', 'define', 'explain']):
            # Definitional question
            best_entity = max(entity_candidates, key=lambda e: e.confidence) if entity_candidates else None
            return {
                'type': 'definition',
                'answer': best_entity.content if best_entity else "I don't have information about that.",
                'entity': best_entity.id if best_entity else None,
                'confidence': best_entity.confidence if best_entity else 0.0
            }
        
        elif any(word in question_lower for word in ['how', 'why', 'when']):
            # Procedural/causal question
            procedural_entities = [e for e in entity_candidates if e.type == KnowledgeType.PROCEDURAL]
            best_entity = max(procedural_entities, key=lambda e: e.confidence) if procedural_entities else None
            
            return {
                'type': 'procedural',
                'answer': best_entity.content if best_entity else "I don't have procedural information about that.",
                'entity': best_entity.id if best_entity else None,
                'confidence': best_entity.confidence if best_entity else 0.0
            }
        
        else:
            # General question
            return {
                'type': 'general',
                'answer': "I need more specific information to answer that question.",
                'entity': None,
                'confidence': 0.0
            }
    
    def find_contradictions(self) -> List[Tuple[str, str, str]]:
        """Find potential contradictions in the knowledge graph"""
        contradictions = []
        
        # Simple contradiction detection based on negation relationships
        for rel_id, relationship in self.knowledge_graph.relationships.items():
            if relationship.relation_type == "contradicts":
                source_entity = self.knowledge_graph.get_entity(relationship.source_id)
                target_entity = self.knowledge_graph.get_entity(relationship.target_id)
                
                if source_entity and target_entity:
                    contradictions.append((
                        source_entity.content,
                        target_entity.content,
                        "explicit_contradiction"
                    ))
        
        return contradictions
