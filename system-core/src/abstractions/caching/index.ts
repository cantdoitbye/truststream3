/**
 * Caching Abstractions Index
 * TrustStream v4.2 - Enhanced Caching Systems
 * 
 * Exports all caching-related components including advanced multi-layer caching,
 * AI model caching, and Supabase-optimized connection pooling.
 */

// Core caching system
export { 
  AdvancedCacheManager,
  CacheConfiguration,
  CacheEntry,
  CacheMetrics,
  LayerMetrics,
  CacheStrategy
} from './AdvancedCacheManager';

// AI-specific caching
export {
  AIModelCacheManager,
  AIModelCacheConfig,
  AIModelMetrics,
  ModelCacheEntry,
  EmbeddingCacheEntry,
  InferenceCacheEntry
} from './AIModelCacheManager';

// Supabase-optimized connection pooling
export {
  SupabaseOptimizedConnectionPool,
  SupabasePoolConfig,
  SupabasePoolMetrics,
  QueryCacheEntry,
  BatchedQuery,
  ConnectionInfo
} from './SupabaseOptimizedConnectionPool';
