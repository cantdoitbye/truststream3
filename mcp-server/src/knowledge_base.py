"""
Knowledge Base Manager
Handles document processing and vector database management for RAG.
"""

import hashlib
import json
import os
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timezone

class KnowledgeBaseManager:
    """Manages knowledge base creation and operations."""
    
    def __init__(self):
        self.knowledge_bases: Dict[str, Dict] = {}
        self.default_chunk_size = 1000
        self.default_overlap = 100
    
    async def process_documents(
        self,
        document_sources: List[str],
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Process documents and prepare them for knowledge base."""
        
        options = options or {}
        chunk_size = options.get('chunk_size', self.default_chunk_size)
        overlap = options.get('overlap', self.default_overlap)
        
        processed_documents = []
        total_chunks = 0
        total_tokens = 0
        errors = []
        
        for source in document_sources:
            try:
                doc_result = await self._process_single_document(
                    source, chunk_size, overlap
                )
                processed_documents.append(doc_result)
                total_chunks += doc_result['chunk_count']
                total_tokens += doc_result['token_count']
            except Exception as e:
                errors.append({
                    'source': source,
                    'error': str(e)
                })
        
        # Create knowledge base ID
        kb_id = str(uuid.uuid4())
        
        result = {
            'knowledge_base_id': kb_id,
            'processed_count': len(processed_documents),
            'total_chunks': total_chunks,
            'total_tokens': total_tokens,
            'processed_documents': processed_documents,
            'errors': errors,
            'embedding_config': {
                'model': 'text-embedding-ada-002',
                'dimensions': 1536,
                'chunk_size': chunk_size,
                'overlap': overlap
            }
        }
        
        return result
    
    async def create_knowledge_base(
        self,
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create vector database and configure knowledge base."""
        
        kb_id = config.get('knowledge_base_id', str(uuid.uuid4()))
        
        # Vector store configuration
        vector_store_config = {
            'type': config.get('vector_store_type', 'chromadb'),
            'persist_directory': f'./kb_storage/{kb_id}',
            'collection_name': f'kb_{kb_id}',
            'distance_metric': config.get('distance_metric', 'cosine')
        }
        
        # Embedding configuration
        embedding_config = {
            'model': config.get('embedding_model', 'text-embedding-ada-002'),
            'dimensions': config.get('dimensions', 1536),
            'batch_size': config.get('batch_size', 100)
        }
        
        # Retrieval configuration
        retrieval_config = {
            'similarity_top_k': config.get('top_k', 5),
            'similarity_threshold': config.get('threshold', 0.7),
            'retrieval_strategy': config.get('strategy', 'similarity'),
            'rerank': config.get('rerank', False)
        }
        
        # Create storage directory
        os.makedirs(vector_store_config['persist_directory'], exist_ok=True)
        
        # Store knowledge base configuration
        kb_config = {
            'id': kb_id,
            'vector_store_config': vector_store_config,
            'embedding_config': embedding_config,
            'retrieval_config': retrieval_config,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'status': 'created'
        }
        
        self.knowledge_bases[kb_id] = kb_config
        
        # Mock index stats (in real implementation, would come from vector store)
        index_stats = {
            'document_count': 0,
            'chunk_count': 0,
            'index_size': '0 MB',
            'embedding_model': embedding_config['model']
        }
        
        return {
            'knowledge_base_id': kb_id,
            'vector_store_config': vector_store_config,
            'embedding_model': embedding_config['model'],
            'index_stats': index_stats,
            'retrieval_config': retrieval_config
        }
    
    async def configure_embeddings(
        self,
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Configure embedding strategy."""
        
        model = config.get('model', 'text-embedding-ada-002')
        dimensions = config.get('dimensions', 1536)
        
        # Cost estimation
        cost_per_token = {
            'text-embedding-ada-002': 0.0001,
            'text-embedding-3-small': 0.00002,
            'text-embedding-3-large': 0.00013
        }.get(model, 0.0001)
        
        estimated_tokens = config.get('estimated_tokens', 10000)
        estimated_total_cost = estimated_tokens * cost_per_token / 1000  # Per 1K tokens
        
        result = {
            'model': model,
            'dimensions': dimensions,
            'cost_per_token': cost_per_token,
            'estimated_total_cost': estimated_total_cost,
            'config': {
                'batch_size': config.get('batch_size', 100),
                'timeout': config.get('timeout', 30),
                'retry_count': config.get('retry_count', 3)
            }
        }
        
        return result
    
    async def test_retrieval(
        self,
        knowledge_base_id: str,
        test_queries: List[str],
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Test knowledge base retrieval with sample queries."""
        
        if knowledge_base_id not in self.knowledge_bases:
            raise ValueError(f"Knowledge base {knowledge_base_id} not found")
        
        config = config or {}
        top_k = config.get('top_k', 5)
        
        # Mock retrieval results (in real implementation, would query vector store)
        test_results = []
        
        for query in test_queries:
            mock_results = [
                {
                    'content': f'Mock relevant content for query: {query}',
                    'score': 0.85,
                    'source': 'document_1.pdf',
                    'page': 1
                },
                {
                    'content': f'Additional context for: {query}',
                    'score': 0.78,
                    'source': 'document_2.pdf',
                    'page': 3
                }
            ]
            
            test_results.append({
                'query': query,
                'results': mock_results[:top_k],
                'result_count': len(mock_results[:top_k]),
                'avg_score': sum(r['score'] for r in mock_results[:top_k]) / len(mock_results[:top_k]) if mock_results[:top_k] else 0
            })
        
        # Performance metrics
        metrics = {
            'avg_response_time': 0.25,  # seconds
            'avg_relevance_score': 0.82,
            'coverage_percentage': 95.0,
            'total_queries_tested': len(test_queries)
        }
        
        # Quality assessment
        quality_score = sum(result['avg_score'] for result in test_results) / len(test_results) if test_results else 0
        
        # Optimization suggestions
        suggestions = [
            'Consider increasing chunk overlap for better context',
            'Fine-tune similarity threshold based on test results',
            'Add more diverse test queries for comprehensive evaluation'
        ]
        
        return {
            'results': test_results,
            'metrics': metrics,
            'quality_score': quality_score,
            'suggestions': suggestions
        }
    
    async def _process_single_document(
        self,
        source: str,
        chunk_size: int,
        overlap: int
    ) -> Dict[str, Any]:
        """Process a single document."""
        
        # Mock document processing (in real implementation, would handle various file types)
        if source.startswith('http'):
            # Web content
            content = f"Web content from {source}"
            source_type = 'web'
        elif Path(source).exists():
            # Local file
            content = f"File content from {Path(source).name}"
            source_type = 'file'
        else:
            # Direct content
            content = source
            source_type = 'direct'
        
        # Mock chunking
        chunks = self._chunk_text(content, chunk_size, overlap)
        token_count = len(content.split()) * 1.3  # Rough token estimate
        
        # Generate document hash
        doc_hash = hashlib.md5(content.encode()).hexdigest()
        
        return {
            'source': source,
            'source_type': source_type,
            'content_hash': doc_hash,
            'chunk_count': len(chunks),
            'token_count': int(token_count),
            'chunks': chunks,
            'processed_at': datetime.now(timezone.utc).isoformat()
        }
    
    def _chunk_text(self, text: str, chunk_size: int, overlap: int) -> List[Dict[str, Any]]:
        """Split text into chunks with overlap."""
        words = text.split()
        chunks = []
        
        for i in range(0, len(words), chunk_size - overlap):
            chunk_words = words[i:i + chunk_size]
            chunk_text = ' '.join(chunk_words)
            
            chunks.append({
                'id': str(uuid.uuid4()),
                'text': chunk_text,
                'word_count': len(chunk_words),
                'start_index': i,
                'end_index': min(i + chunk_size, len(words))
            })
            
            if i + chunk_size >= len(words):
                break
        
        return chunks
    
    async def get_knowledge_base_info(self, kb_id: str) -> Dict[str, Any]:
        """Get knowledge base information."""
        if kb_id not in self.knowledge_bases:
            raise ValueError(f"Knowledge base {kb_id} not found")
        
        return self.knowledge_bases[kb_id]
    
    async def update_knowledge_base(
        self,
        kb_id: str,
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update knowledge base configuration."""
        if kb_id not in self.knowledge_bases:
            raise ValueError(f"Knowledge base {kb_id} not found")
        
        kb_config = self.knowledge_bases[kb_id]
        kb_config.update(updates)
        kb_config['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        return kb_config
    
    async def delete_knowledge_base(self, kb_id: str) -> bool:
        """Delete knowledge base."""
        if kb_id in self.knowledge_bases:
            del self.knowledge_bases[kb_id]
            return True
        return False
