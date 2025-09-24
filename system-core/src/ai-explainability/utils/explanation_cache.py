"""
Explanation Cache for TrustStram v4.4 AI Explainability

Redis-based caching system for explanation results with performance optimization.
"""

import asyncio
import hashlib
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union

import redis.asyncio as aioredis
import numpy as np

logger = logging.getLogger(__name__)

class ExplanationCache:
    """
    High-performance Redis-based cache for explanation results.
    """
    
    def __init__(self, redis_client: aioredis.Redis):
        """
        Initialize explanation cache.
        
        Args:
            redis_client: Async Redis client
        """
        self.redis_client = redis_client
        self.cache_prefix = "trustram:explanation:"
        self.stats_prefix = "trustram:cache_stats:"
        self.default_ttl = 3600  # 1 hour default TTL
        
        # Performance tracking
        self.hit_count = 0
        self.miss_count = 0
        self.total_requests = 0
        
        logger.info("Explanation cache initialized")
    
    async def generate_cache_key(
        self,
        model_id: str,
        instance_data: Dict[str, Any],
        explanation_type: str,
        stakeholder_type: str,
        additional_params: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate a unique cache key for explanation request.
        
        Args:
            model_id: Model identifier
            instance_data: Input instance data
            explanation_type: Type of explanation
            stakeholder_type: Target stakeholder
            additional_params: Additional parameters that affect explanation
            
        Returns:
            Unique cache key
        """
        # Create deterministic representation of instance data
        instance_str = json.dumps(instance_data, sort_keys=True, default=str)
        
        # Include additional parameters if provided
        params_str = ""
        if additional_params:
            params_str = json.dumps(additional_params, sort_keys=True, default=str)
        
        # Create hash input
        hash_input = f"{model_id}:{instance_str}:{explanation_type}:{stakeholder_type}:{params_str}"
        
        # Generate hash
        cache_key_hash = hashlib.sha256(hash_input.encode()).hexdigest()[:16]
        
        return f"{self.cache_prefix}{explanation_type}:{cache_key_hash}"
    
    async def get(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """
        Get explanation from cache.
        
        Args:
            cache_key: Cache key
            
        Returns:
            Cached explanation data or None if not found
        """
        try:
            self.total_requests += 1
            
            # Get from Redis
            cached_data = await self.redis_client.get(cache_key)
            
            if cached_data:
                self.hit_count += 1
                explanation_data = json.loads(cached_data)
                
                # Update access metadata
                explanation_data['cache_metadata'] = {
                    'cache_hit': True,
                    'last_accessed': datetime.now().isoformat(),
                    'access_count': explanation_data.get('cache_metadata', {}).get('access_count', 0) + 1
                }
                
                # Update access count in cache (fire and forget)
                asyncio.create_task(self._update_access_count(cache_key, explanation_data))
                
                logger.debug(f"Cache hit for key: {cache_key}")
                return explanation_data
            else:
                self.miss_count += 1
                logger.debug(f"Cache miss for key: {cache_key}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting from cache: {str(e)}")
            self.miss_count += 1
            return None
    
    async def set(
        self,
        cache_key: str,
        explanation_data: Dict[str, Any],
        ttl: Optional[int] = None
    ) -> bool:
        """
        Store explanation in cache.
        
        Args:
            cache_key: Cache key
            explanation_data: Explanation data to cache
            ttl: Time to live in seconds
            
        Returns:
            True if stored successfully
        """
        try:
            if ttl is None:
                ttl = self.default_ttl
            
            # Add cache metadata
            explanation_data['cache_metadata'] = {
                'cached_at': datetime.now().isoformat(),
                'cache_key': cache_key,
                'ttl': ttl,
                'access_count': 0
            }
            
            # Serialize and store
            serialized_data = json.dumps(explanation_data, default=self._json_serializer)
            
            # Store with TTL
            await self.redis_client.setex(cache_key, ttl, serialized_data)
            
            # Update cache statistics
            await self._update_cache_stats(cache_key, len(serialized_data))
            
            logger.debug(f"Cached explanation with key: {cache_key}")
            return True
            
        except Exception as e:
            logger.error(f"Error storing in cache: {str(e)}")
            return False
    
    async def delete(self, cache_key: str) -> bool:
        """
        Delete explanation from cache.
        
        Args:
            cache_key: Cache key to delete
            
        Returns:
            True if deleted successfully
        """
        try:
            result = await self.redis_client.delete(cache_key)
            return bool(result)
            
        except Exception as e:
            logger.error(f"Error deleting from cache: {str(e)}")
            return False
    
    async def clear_model_cache(self, model_id: str) -> int:
        """
        Clear all cached explanations for a specific model.
        
        Args:
            model_id: Model identifier
            
        Returns:
            Number of keys deleted
        """
        try:
            # Find all keys for this model
            pattern = f"{self.cache_prefix}*"
            keys = await self.redis_client.keys(pattern)
            
            deleted_count = 0
            
            # Check each key to see if it belongs to this model
            for key in keys:
                try:
                    # Get the cached data to check model_id
                    cached_data = await self.redis_client.get(key)
                    if cached_data:
                        explanation_data = json.loads(cached_data)
                        if explanation_data.get('model_id') == model_id:
                            await self.redis_client.delete(key)
                            deleted_count += 1
                            
                except Exception as e:
                    logger.warning(f"Error checking key {key}: {str(e)}")
                    continue
            
            logger.info(f"Cleared {deleted_count} cached explanations for model {model_id}")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error clearing model cache: {str(e)}")
            return 0
    
    async def get_cache_stats(self) -> Dict[str, Any]:
        """
        Get cache performance statistics.
        
        Returns:
            Cache statistics dictionary
        """
        try:
            # Calculate hit rate
            hit_rate = (self.hit_count / self.total_requests) if self.total_requests > 0 else 0
            
            # Get Redis info
            redis_info = await self.redis_client.info('memory')
            
            # Get cache size
            pattern = f"{self.cache_prefix}*"
            cache_keys = await self.redis_client.keys(pattern)
            cache_size = len(cache_keys)
            
            # Get additional statistics from Redis
            stats_key = f"{self.stats_prefix}global"
            stats_data = await self.redis_client.get(stats_key)
            
            additional_stats = {}
            if stats_data:
                try:
                    additional_stats = json.loads(stats_data)
                except:
                    pass
            
            return {
                'hit_rate': hit_rate,
                'hit_count': self.hit_count,
                'miss_count': self.miss_count,
                'total_requests': self.total_requests,
                'cache_size': cache_size,
                'memory_usage_mb': redis_info.get('used_memory', 0) / (1024 * 1024),
                'memory_peak_mb': redis_info.get('used_memory_peak', 0) / (1024 * 1024),
                'uptime_seconds': redis_info.get('uptime_in_seconds', 0),
                'total_cache_hits_session': additional_stats.get('total_hits', 0),
                'total_cache_misses_session': additional_stats.get('total_misses', 0),
                'average_explanation_size_bytes': additional_stats.get('avg_size', 0),
                'cache_efficiency_score': self._calculate_efficiency_score(hit_rate, cache_size)
            }
            
        except Exception as e:
            logger.error(f"Error getting cache stats: {str(e)}")
            return {
                'hit_rate': 0.0,
                'hit_count': self.hit_count,
                'miss_count': self.miss_count,
                'total_requests': self.total_requests,
                'error': str(e)
            }
    
    async def _update_access_count(
        self,
        cache_key: str,
        explanation_data: Dict[str, Any]
    ) -> None:
        """
        Update access count for cached explanation (background task).
        
        Args:
            cache_key: Cache key
            explanation_data: Current explanation data
        """
        try:
            # Get current TTL
            ttl = await self.redis_client.ttl(cache_key)
            
            if ttl > 0:  # Key exists and has TTL
                # Update the cached data with new access count
                serialized_data = json.dumps(explanation_data, default=self._json_serializer)
                await self.redis_client.setex(cache_key, ttl, serialized_data)
                
        except Exception as e:
            logger.warning(f"Error updating access count: {str(e)}")
    
    async def _update_cache_stats(
        self,
        cache_key: str,
        data_size: int
    ) -> None:
        """
        Update global cache statistics.
        
        Args:
            cache_key: Cache key
            data_size: Size of cached data in bytes
        """
        try:
            stats_key = f"{self.stats_prefix}global"
            
            # Get current stats
            current_stats = await self.redis_client.get(stats_key)
            
            if current_stats:
                stats = json.loads(current_stats)
            else:
                stats = {
                    'total_hits': 0,
                    'total_misses': 0,
                    'total_sets': 0,
                    'total_size': 0,
                    'avg_size': 0
                }
            
            # Update stats
            stats['total_sets'] += 1
            stats['total_size'] += data_size
            stats['avg_size'] = stats['total_size'] / stats['total_sets']
            
            # Store updated stats (with 24 hour TTL)
            await self.redis_client.setex(
                stats_key,
                86400,  # 24 hours
                json.dumps(stats)
            )
            
        except Exception as e:
            logger.warning(f"Error updating cache stats: {str(e)}")
    
    def _calculate_efficiency_score(
        self,
        hit_rate: float,
        cache_size: int
    ) -> float:
        """
        Calculate cache efficiency score.
        
        Args:
            hit_rate: Cache hit rate (0-1)
            cache_size: Number of items in cache
            
        Returns:
            Efficiency score (0-1)
        """
        # Base score from hit rate
        base_score = hit_rate
        
        # Bonus for having reasonable cache size (not too small, not too large)
        if cache_size < 10:
            size_factor = 0.8  # Too small
        elif cache_size > 10000:
            size_factor = 0.9  # Large but manageable
        else:
            size_factor = 1.0  # Good size
        
        return base_score * size_factor
    
    def _json_serializer(self, obj: Any) -> Any:
        """
        Custom JSON serializer for NumPy types and other objects.
        
        Args:
            obj: Object to serialize
            
        Returns:
            Serializable representation
        """
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, (datetime, )):
            return obj.isoformat()
        elif hasattr(obj, '__dict__'):
            return str(obj)
        else:
            return str(obj)
    
    async def preload_popular_explanations(
        self,
        model_id: str,
        popular_instances: List[Dict[str, Any]],
        explanation_types: List[str] = None
    ) -> int:
        """
        Preload explanations for popular instances to improve cache hit rate.
        
        Args:
            model_id: Model to preload explanations for
            popular_instances: List of frequently requested instances
            explanation_types: Types of explanations to preload
            
        Returns:
            Number of explanations preloaded
        """
        if explanation_types is None:
            explanation_types = ['shap', 'interpretml']
        
        preloaded_count = 0
        
        for instance in popular_instances:
            for explanation_type in explanation_types:
                for stakeholder_type in ['end_user', 'technical_user']:
                    try:
                        # Generate cache key
                        cache_key = await self.generate_cache_key(
                            model_id,
                            instance,
                            explanation_type,
                            stakeholder_type
                        )
                        
                        # Check if already cached
                        if not await self.redis_client.exists(cache_key):
                            # This would trigger explanation generation
                            # In practice, you'd call the explainer service here
                            logger.info(f"Would preload: {cache_key}")
                            preloaded_count += 1
                            
                    except Exception as e:
                        logger.warning(f"Error preloading explanation: {str(e)}")
                        continue
        
        return preloaded_count
    
    async def cleanup_expired_cache(self) -> int:
        """
        Clean up expired cache entries (Redis should handle this automatically,
        but this provides manual cleanup if needed).
        
        Returns:
            Number of entries cleaned up
        """
        try:
            pattern = f"{self.cache_prefix}*"
            keys = await self.redis_client.keys(pattern)
            
            cleaned_count = 0
            
            for key in keys:
                ttl = await self.redis_client.ttl(key)
                if ttl == -2:  # Key doesn't exist
                    cleaned_count += 1
                elif ttl == -1:  # Key exists but has no expiration
                    # Set default expiration
                    await self.redis_client.expire(key, self.default_ttl)
            
            logger.info(f"Cleaned up {cleaned_count} expired cache entries")
            return cleaned_count
            
        except Exception as e:
            logger.error(f"Error cleaning up cache: {str(e)}")
            return 0
    
    async def get_cache_health(self) -> Dict[str, Any]:
        """
        Get cache health status.
        
        Returns:
            Health status dictionary
        """
        try:
            # Test Redis connection
            await self.redis_client.ping()
            redis_healthy = True
            
            # Get basic stats
            stats = await self.get_cache_stats()
            hit_rate = stats.get('hit_rate', 0)
            
            # Determine health status
            if hit_rate >= 0.8:
                health_status = 'excellent'
            elif hit_rate >= 0.6:
                health_status = 'good'
            elif hit_rate >= 0.4:
                health_status = 'fair'
            else:
                health_status = 'poor'
            
            return {
                'status': 'healthy' if redis_healthy else 'unhealthy',
                'redis_connection': 'ok' if redis_healthy else 'failed',
                'cache_performance': health_status,
                'hit_rate': hit_rate,
                'recommendations': self._get_health_recommendations(hit_rate, stats)
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'redis_connection': 'failed',
                'error': str(e),
                'recommendations': ['Check Redis server connection']
            }
    
    def _get_health_recommendations(
        self,
        hit_rate: float,
        stats: Dict[str, Any]
    ) -> List[str]:
        """
        Get recommendations for improving cache performance.
        
        Args:
            hit_rate: Current cache hit rate
            stats: Cache statistics
            
        Returns:
            List of recommendations
        """
        recommendations = []
        
        if hit_rate < 0.6:
            recommendations.append("Cache hit rate is low. Consider preloading popular explanations.")
        
        if hit_rate < 0.4:
            recommendations.append("Very low hit rate. Check if explanation parameters are consistent.")
        
        cache_size = stats.get('cache_size', 0)
        if cache_size > 50000:
            recommendations.append("Large cache size. Consider reducing TTL or clearing old entries.")
        
        if cache_size < 10:
            recommendations.append("Very small cache. Increase TTL or check if explanations are being cached.")
        
        memory_usage = stats.get('memory_usage_mb', 0)
        if memory_usage > 1000:  # 1GB
            recommendations.append("High memory usage. Consider reducing cache TTL or explanation data size.")
        
        if not recommendations:
            recommendations.append("Cache performance is optimal.")
        
        return recommendations
