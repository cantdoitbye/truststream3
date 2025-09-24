from typing import Dict, List, Any, Optional, Callable, Tuple
from dataclasses import dataclass
from datetime import datetime
import asyncio
import time
import threading
from collections import defaultdict, deque
import json
import gzip
import pickle
from concurrent.futures import ThreadPoolExecutor

@dataclass 
class CompressionConfig:
    algorithm: str = "gzip"  # gzip, lz4, zstd
    level: int = 6
    threshold_size: int = 1024  # Compress if data > threshold bytes

class DataCompressor:
    """Handles data compression for storage and transfer optimization"""
    
    def __init__(self, config: CompressionConfig = None):
        self.config = config or CompressionConfig()
    
    def compress(self, data: Any) -> Tuple[bytes, Dict[str, Any]]:
        """Compress data and return compressed bytes with metadata"""
        # Serialize data
        if isinstance(data, (str, bytes)):
            serialized = data.encode() if isinstance(data, str) else data
        else:
            serialized = pickle.dumps(data)
        
        # Check if compression is beneficial
        if len(serialized) < self.config.threshold_size:
            return serialized, {'compressed': False, 'original_size': len(serialized)}
        
        # Compress based on algorithm
        if self.config.algorithm == "gzip":
            compressed = gzip.compress(serialized, compresslevel=self.config.level)
        else:
            # Default to gzip if algorithm not supported
            compressed = gzip.compress(serialized, compresslevel=self.config.level)
        
        metadata = {
            'compressed': True,
            'algorithm': self.config.algorithm,
            'original_size': len(serialized),
            'compressed_size': len(compressed),
            'compression_ratio': len(compressed) / len(serialized)
        }
        
        return compressed, metadata
    
    def decompress(self, compressed_data: bytes, metadata: Dict[str, Any]) -> Any:
        """Decompress data using metadata"""
        if not metadata.get('compressed', False):
            return compressed_data
        
        algorithm = metadata.get('algorithm', 'gzip')
        
        if algorithm == "gzip":
            decompressed = gzip.decompress(compressed_data)
        else:
            decompressed = gzip.decompress(compressed_data)
        
        # Try to deserialize if it was pickled
        try:
            return pickle.loads(decompressed)
        except (pickle.PickleError, TypeError):
            return decompressed

class LazyLoader:
    """Lazy loading mechanism for expensive resources"""
    
    def __init__(self, loader_func: Callable, *args, **kwargs):
        self.loader_func = loader_func
        self.args = args
        self.kwargs = kwargs
        self._value = None
        self._loaded = False
        self._lock = threading.Lock()
    
    @property
    def value(self):
        if not self._loaded:
            with self._lock:
                if not self._loaded:  # Double-check locking
                    self._value = self.loader_func(*self.args, **self.kwargs)
                    self._loaded = True
        return self._value
    
    def is_loaded(self) -> bool:
        return self._loaded
    
    def reset(self):
        """Reset the lazy loader to reload on next access"""
        with self._lock:
            self._loaded = False
            self._value = None

class ResourcePool:
    """Generic resource pool with lifecycle management"""
    
    def __init__(self, 
                 resource_factory: Callable,
                 max_size: int = 10,
                 min_size: int = 1,
                 max_idle_time: int = 300,
                 health_check: Optional[Callable] = None):
        self.resource_factory = resource_factory
        self.max_size = max_size
        self.min_size = min_size
        self.max_idle_time = max_idle_time
        self.health_check = health_check
        
        self.available: deque = deque()
        self.in_use: set = set()
        self.resource_metadata: Dict[Any, Dict[str, Any]] = {}
        self._lock = threading.Lock()
        
        # Pre-populate minimum resources
        for _ in range(min_size):
            resource = self._create_resource()
            self.available.append(resource)
    
    def acquire(self, timeout: float = 10.0):
        """Acquire a resource from the pool"""
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            with self._lock:
                # Clean up unhealthy resources
                self._cleanup_unhealthy()
                
                # Try to get available resource
                if self.available:
                    resource = self.available.popleft()
                    self.in_use.add(resource)
                    self.resource_metadata[resource]['last_acquired'] = datetime.now()
                    return resource
                
                # Create new resource if under limit
                if len(self.in_use) + len(self.available) < self.max_size:
                    resource = self._create_resource()
                    self.in_use.add(resource)
                    self.resource_metadata[resource]['last_acquired'] = datetime.now()
                    return resource
            
            # Wait and retry
            time.sleep(0.1)
        
        raise TimeoutError("Could not acquire resource within timeout")
    
    def release(self, resource):
        """Release a resource back to the pool"""
        with self._lock:
            if resource in self.in_use:
                self.in_use.remove(resource)
                
                # Check resource health before returning to pool
                if self._is_healthy(resource):
                    self.available.append(resource)
                    self.resource_metadata[resource]['last_released'] = datetime.now()
                else:
                    self._destroy_resource(resource)
    
    def close_all(self):
        """Close all resources in the pool"""
        with self._lock:
            all_resources = list(self.available) + list(self.in_use)
            
            for resource in all_resources:
                self._destroy_resource(resource)
            
            self.available.clear()
            self.in_use.clear()
            self.resource_metadata.clear()
    
    def stats(self) -> Dict[str, Any]:
        """Get pool statistics"""
        with self._lock:
            return {
                'available': len(self.available),
                'in_use': len(self.in_use),
                'total': len(self.available) + len(self.in_use),
                'max_size': self.max_size,
                'min_size': self.min_size
            }
    
    def _create_resource(self):
        """Create a new resource"""
        resource = self.resource_factory()
        self.resource_metadata[resource] = {
            'created_at': datetime.now(),
            'last_acquired': None,
            'last_released': None,
            'acquire_count': 0
        }
        return resource
    
    def _destroy_resource(self, resource):
        """Destroy a resource"""
        try:
            if hasattr(resource, 'close'):
                resource.close()
            elif hasattr(resource, 'cleanup'):
                resource.cleanup()
        except Exception:
            pass
        
        if resource in self.resource_metadata:
            del self.resource_metadata[resource]
    
    def _is_healthy(self, resource) -> bool:
        """Check if resource is healthy"""
        if self.health_check:
            try:
                return self.health_check(resource)
            except Exception:
                return False
        return True
    
    def _cleanup_unhealthy(self):
        """Remove unhealthy and expired resources"""
        now = datetime.now()
        to_remove = []
        
        # Check available resources
        for resource in list(self.available):
            metadata = self.resource_metadata.get(resource, {})
            last_released = metadata.get('last_released')
            
            # Check if expired
            if (last_released and 
                (now - last_released).total_seconds() > self.max_idle_time and
                len(self.available) > self.min_size):
                to_remove.append(resource)
            # Check health
            elif not self._is_healthy(resource):
                to_remove.append(resource)
        
        for resource in to_remove:
            if resource in self.available:
                self.available.remove(resource)
            self._destroy_resource(resource)

class MemoryOptimizer:
    """Optimizes memory usage through various techniques"""
    
    def __init__(self):
        self.object_pools: Dict[str, List[Any]] = defaultdict(list)
        self.weak_refs: Dict[str, Any] = {}
        self._lock = threading.Lock()
    
    def get_pooled_object(self, object_type: str, factory: Callable) -> Any:
        """Get object from pool or create new one"""
        with self._lock:
            pool = self.object_pools[object_type]
            
            if pool:
                obj = pool.pop()
                # Reset object if it has a reset method
                if hasattr(obj, 'reset'):
                    obj.reset()
                return obj
            else:
                return factory()
    
    def return_to_pool(self, object_type: str, obj: Any, max_pool_size: int = 100):
        """Return object to pool for reuse"""
        with self._lock:
            pool = self.object_pools[object_type]
            
            if len(pool) < max_pool_size:
                pool.append(obj)
    
    def clear_pools(self):
        """Clear all object pools"""
        with self._lock:
            for pool in self.object_pools.values():
                pool.clear()
            self.object_pools.clear()

class QueryOptimizer:
    """Optimizes database/API queries"""
    
    def __init__(self):
        self.query_cache: Dict[str, Any] = {}
        self.query_stats: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
            'count': 0, 'total_time': 0, 'avg_time': 0, 'last_executed': None
        })
        self._lock = threading.Lock()
    
    def batch_queries(self, queries: List[Dict[str, Any]], 
                     batch_executor: Callable) -> List[Any]:
        """Execute multiple queries in batches"""
        # Group similar queries
        query_groups = self._group_similar_queries(queries)
        
        results = []
        for group in query_groups:
            batch_result = batch_executor(group)
            results.extend(batch_result)
        
        return results
    
    def optimize_query(self, query: str, params: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
        """Optimize a single query"""
        # Add query hints or optimizations
        optimized_query = self._add_query_hints(query)
        optimized_params = self._optimize_parameters(params)
        
        return optimized_query, optimized_params
    
    def record_query_execution(self, query_id: str, execution_time: float):
        """Record query execution statistics"""
        with self._lock:
            stats = self.query_stats[query_id]
            stats['count'] += 1
            stats['total_time'] += execution_time
            stats['avg_time'] = stats['total_time'] / stats['count']
            stats['last_executed'] = datetime.now()
    
    def get_slow_queries(self, threshold: float = 1.0) -> List[Tuple[str, Dict[str, Any]]]:
        """Get queries with average execution time above threshold"""
        with self._lock:
            return [
                (query_id, stats) 
                for query_id, stats in self.query_stats.items()
                if stats['avg_time'] > threshold
            ]
    
    def _group_similar_queries(self, queries: List[Dict[str, Any]]) -> List[List[Dict[str, Any]]]:
        """Group similar queries for batch execution"""
        groups = defaultdict(list)
        
        for query in queries:
            # Simple grouping by query type/table
            group_key = query.get('type', 'default')
            groups[group_key].append(query)
        
        return list(groups.values())
    
    def _add_query_hints(self, query: str) -> str:
        """Add database-specific optimization hints"""
        # This would be database-specific
        # For now, just return the original query
        return query
    
    def _optimize_parameters(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Optimize query parameters"""
        # Convert lists to tuples for better caching
        optimized = {}
        for key, value in params.items():
            if isinstance(value, list):
                optimized[key] = tuple(value)
            else:
                optimized[key] = value
        
        return optimized

# Global instances
compressor = DataCompressor()
memory_optimizer = MemoryOptimizer()
query_optimizer = QueryOptimizer()
