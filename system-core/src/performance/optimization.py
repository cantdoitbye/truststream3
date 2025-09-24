from typing import Dict, List, Any, Optional, Callable, Union
from dataclasses import dataclass
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from functools import wraps
import asyncio
import time
import hashlib
import json
import threading
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor

@dataclass
class CacheEntry:
    key: str
    value: Any
    created_at: datetime
    access_count: int = 0
    last_accessed: Optional[datetime] = None
    ttl: Optional[int] = None  # Time to live in seconds
    
    def is_expired(self) -> bool:
        if self.ttl is None:
            return False
        return (datetime.now() - self.created_at).total_seconds() > self.ttl
    
    def access(self):
        self.access_count += 1
        self.last_accessed = datetime.now()

class CacheEvictionPolicy(ABC):
    @abstractmethod
    def should_evict(self, entries: List[CacheEntry], max_size: int) -> List[str]:
        """Return keys to evict"""
        pass

class LRUEviction(CacheEvictionPolicy):
    def should_evict(self, entries: List[CacheEntry], max_size: int) -> List[str]:
        if len(entries) <= max_size:
            return []
        
        # Sort by last accessed time (oldest first)
        sorted_entries = sorted(entries, key=lambda e: e.last_accessed or e.created_at)
        return [e.key for e in sorted_entries[:len(entries) - max_size]]

class LFUEviction(CacheEvictionPolicy):
    def should_evict(self, entries: List[CacheEntry], max_size: int) -> List[str]:
        if len(entries) <= max_size:
            return []
        
        # Sort by access count (least accessed first)
        sorted_entries = sorted(entries, key=lambda e: e.access_count)
        return [e.key for e in sorted_entries[:len(entries) - max_size]]

class InMemoryCache:
    """High-performance in-memory cache with configurable eviction policies"""
    
    def __init__(self, 
                 max_size: int = 1000,
                 default_ttl: Optional[int] = None,
                 eviction_policy: CacheEvictionPolicy = None):
        self.max_size = max_size
        self.default_ttl = default_ttl
        self.eviction_policy = eviction_policy or LRUEviction()
        self.cache: Dict[str, CacheEntry] = {}
        self._lock = threading.RLock()
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        with self._lock:
            if key not in self.cache:
                return None
            
            entry = self.cache[key]
            
            # Check if expired
            if entry.is_expired():
                del self.cache[key]
                return None
            
            entry.access()
            return entry.value
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set value in cache"""
        with self._lock:
            # Use default TTL if not specified
            if ttl is None:
                ttl = self.default_ttl
            
            entry = CacheEntry(
                key=key,
                value=value,
                created_at=datetime.now(),
                ttl=ttl
            )
            entry.access()
            
            self.cache[key] = entry
            
            # Evict if necessary
            self._evict_if_needed()
    
    def delete(self, key: str) -> bool:
        """Delete key from cache"""
        with self._lock:
            if key in self.cache:
                del self.cache[key]
                return True
            return False
    
    def clear(self) -> None:
        """Clear all cache entries"""
        with self._lock:
            self.cache.clear()
    
    def size(self) -> int:
        """Get current cache size"""
        return len(self.cache)
    
    def stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        with self._lock:
            total_accesses = sum(entry.access_count for entry in self.cache.values())
            return {
                "size": len(self.cache),
                "max_size": self.max_size,
                "total_accesses": total_accesses,
                "average_accesses": total_accesses / len(self.cache) if self.cache else 0
            }
    
    def _evict_if_needed(self):
        """Evict entries if cache is full"""
        if len(self.cache) <= self.max_size:
            return
        
        entries = list(self.cache.values())
        keys_to_evict = self.eviction_policy.should_evict(entries, self.max_size)
        
        for key in keys_to_evict:
            if key in self.cache:
                del self.cache[key]

def cache_result(cache: InMemoryCache, ttl: Optional[int] = None, key_func: Optional[Callable] = None):
    """Decorator to cache function results"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                key_data = {
                    'func': func.__name__,
                    'args': str(args),
                    'kwargs': str(sorted(kwargs.items()))
                }
                cache_key = hashlib.md5(json.dumps(key_data, sort_keys=True).encode()).hexdigest()
            
            # Try to get from cache
            result = cache.get(cache_key)
            if result is not None:
                return result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache.set(cache_key, result, ttl)
            return result
        
        return wrapper
    return decorator

class ConnectionPool:
    """Generic connection pool for resource management"""
    
    def __init__(self, 
                 create_connection: Callable,
                 max_size: int = 10,
                 min_size: int = 1,
                 max_idle_time: int = 300):
        self.create_connection = create_connection
        self.max_size = max_size
        self.min_size = min_size
        self.max_idle_time = max_idle_time
        
        self.pool: List[Dict[str, Any]] = []
        self.active_connections: int = 0
        self._lock = threading.Lock()
        
        # Initialize minimum connections
        for _ in range(min_size):
            self._add_connection()
    
    def get_connection(self):
        """Get a connection from the pool"""
        with self._lock:
            # Clean up expired connections
            self._cleanup_expired()
            
            # Try to get an available connection
            for conn_data in self.pool:
                if not conn_data['in_use']:
                    conn_data['in_use'] = True
                    conn_data['last_used'] = datetime.now()
                    return conn_data['connection']
            
            # Create new connection if under limit
            if self.active_connections < self.max_size:
                conn_data = self._add_connection()
                conn_data['in_use'] = True
                conn_data['last_used'] = datetime.now()
                return conn_data['connection']
            
            raise RuntimeError("Connection pool exhausted")
    
    def return_connection(self, connection):
        """Return a connection to the pool"""
        with self._lock:
            for conn_data in self.pool:
                if conn_data['connection'] == connection:
                    conn_data['in_use'] = False
                    conn_data['last_used'] = datetime.now()
                    break
    
    def close_all(self):
        """Close all connections in the pool"""
        with self._lock:
            for conn_data in self.pool:
                try:
                    if hasattr(conn_data['connection'], 'close'):
                        conn_data['connection'].close()
                except Exception:
                    pass
            
            self.pool.clear()
            self.active_connections = 0
    
    def _add_connection(self) -> Dict[str, Any]:
        """Add a new connection to the pool"""
        connection = self.create_connection()
        conn_data = {
            'connection': connection,
            'created_at': datetime.now(),
            'last_used': datetime.now(),
            'in_use': False
        }
        
        self.pool.append(conn_data)
        self.active_connections += 1
        return conn_data
    
    def _cleanup_expired(self):
        """Remove expired idle connections"""
        now = datetime.now()
        expired = []
        
        for i, conn_data in enumerate(self.pool):
            if (not conn_data['in_use'] and 
                (now - conn_data['last_used']).total_seconds() > self.max_idle_time and
                len(self.pool) > self.min_size):
                expired.append(i)
        
        # Remove expired connections (in reverse order to maintain indices)
        for i in reversed(expired):
            conn_data = self.pool.pop(i)
            try:
                if hasattr(conn_data['connection'], 'close'):
                    conn_data['connection'].close()
            except Exception:
                pass
            self.active_connections -= 1

class BatchProcessor:
    """Process items in batches for improved performance"""
    
    def __init__(self, 
                 batch_size: int = 100,
                 max_wait_time: float = 1.0,
                 processor_func: Optional[Callable] = None):
        self.batch_size = batch_size
        self.max_wait_time = max_wait_time
        self.processor_func = processor_func
        
        self.pending_items: List[Any] = []
        self.last_batch_time = time.time()
        self._lock = threading.Lock()
        self._processing = False
    
    def add_item(self, item: Any) -> None:
        """Add item to batch for processing"""
        with self._lock:
            self.pending_items.append(item)
            
            # Process if batch is full or max wait time exceeded
            if (len(self.pending_items) >= self.batch_size or 
                time.time() - self.last_batch_time >= self.max_wait_time):
                self._process_batch()
    
    def flush(self) -> None:
        """Process all pending items immediately"""
        with self._lock:
            if self.pending_items:
                self._process_batch()
    
    def _process_batch(self):
        """Process current batch of items"""
        if self._processing or not self.pending_items:
            return
        
        self._processing = True
        items_to_process = self.pending_items.copy()
        self.pending_items.clear()
        self.last_batch_time = time.time()
        
        try:
            if self.processor_func:
                self.processor_func(items_to_process)
        finally:
            self._processing = False

class AsyncExecutor:
    """Async task executor with configurable concurrency"""
    
    def __init__(self, max_workers: int = 10):
        self.max_workers = max_workers
        self.thread_executor = ThreadPoolExecutor(max_workers=max_workers)
        self.process_executor = ProcessPoolExecutor(max_workers=max_workers)
    
    async def run_in_thread(self, func: Callable, *args, **kwargs) -> Any:
        """Run function in thread pool"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self.thread_executor, lambda: func(*args, **kwargs))
    
    async def run_in_process(self, func: Callable, *args, **kwargs) -> Any:
        """Run function in process pool"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self.process_executor, lambda: func(*args, **kwargs))
    
    async def run_concurrent(self, tasks: List[Callable], use_processes: bool = False) -> List[Any]:
        """Run multiple tasks concurrently"""
        if use_processes:
            executor_func = self.run_in_process
        else:
            executor_func = self.run_in_thread
        
        return await asyncio.gather(*[executor_func(task) for task in tasks])
    
    def shutdown(self):
        """Shutdown executors"""
        self.thread_executor.shutdown(wait=True)
        self.process_executor.shutdown(wait=True)

class PerformanceProfiler:
    """Profile function performance and resource usage"""
    
    def __init__(self):
        self.profiles: Dict[str, List[Dict[str, Any]]] = {}
        self._lock = threading.Lock()
    
    def profile(self, name: str = None):
        """Decorator to profile function performance"""
        def decorator(func):
            profile_name = name or f"{func.__module__}.{func.__name__}"
            
            @wraps(func)
            def wrapper(*args, **kwargs):
                start_time = time.time()
                start_memory = self._get_memory_usage()
                
                try:
                    result = func(*args, **kwargs)
                    success = True
                    error = None
                except Exception as e:
                    result = None
                    success = False
                    error = str(e)
                    raise
                finally:
                    end_time = time.time()
                    end_memory = self._get_memory_usage()
                    
                    profile_data = {
                        'timestamp': datetime.now(),
                        'duration': end_time - start_time,
                        'memory_start': start_memory,
                        'memory_end': end_memory,
                        'memory_delta': end_memory - start_memory,
                        'success': success,
                        'error': error,
                        'args_count': len(args),
                        'kwargs_count': len(kwargs)
                    }
                    
                    with self._lock:
                        if profile_name not in self.profiles:
                            self.profiles[profile_name] = []
                        self.profiles[profile_name].append(profile_data)
                
                return result
            
            return wrapper
        return decorator
    
    def get_stats(self, name: str) -> Dict[str, Any]:
        """Get performance statistics for a function"""
        with self._lock:
            if name not in self.profiles:
                return {}
            
            profiles = self.profiles[name]
            durations = [p['duration'] for p in profiles]
            memory_deltas = [p['memory_delta'] for p in profiles]
            
            return {
                'call_count': len(profiles),
                'avg_duration': sum(durations) / len(durations),
                'min_duration': min(durations),
                'max_duration': max(durations),
                'avg_memory_delta': sum(memory_deltas) / len(memory_deltas),
                'success_rate': sum(1 for p in profiles if p['success']) / len(profiles),
                'last_called': profiles[-1]['timestamp'].isoformat() if profiles else None
            }
    
    def _get_memory_usage(self) -> float:
        """Get current memory usage in MB"""
        try:
            import psutil
            import os
            process = psutil.Process(os.getpid())
            return process.memory_info().rss / 1024 / 1024
        except ImportError:
            return 0.0

# Global instances for easy access
cache = InMemoryCache(max_size=10000, default_ttl=3600)
profiler = PerformanceProfiler()
executor = AsyncExecutor(max_workers=20)
