// lib/cache/redis-cache.ts
// Redis caching layer for RAG retrieval results
// Dramatically speeds up repeated queries

import { createHash } from 'crypto';

/**
 * Redis Cache Interface
 * Can be implemented with Upstash Redis or any Redis provider
 */
export interface CacheResult {
  hit: boolean;
  data?: any;
  age?: number; // Age in seconds
}

/**
 * Simple in-memory cache fallback (when Redis is not available)
 * In production, replace with actual Redis (Upstash recommended)
 */
class InMemoryCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private TTL_MS: number;
  private MAX_SIZE = 1000; // Limit memory usage

  constructor(ttlSeconds: number = 300) {
    this.TTL_MS = ttlSeconds * 1000;
  }

  get(key: string): CacheResult {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return { hit: false };
    }

    const age = Date.now() - cached.timestamp;
    
    // Check if expired
    if (age > this.TTL_MS) {
      this.cache.delete(key);
      return { hit: false };
    }

    return {
      hit: true,
      data: cached.data,
      age: Math.floor(age / 1000)
    };
  }

  set(key: string, data: any): void {
    // Implement simple LRU: remove oldest if at capacity
    if (this.cache.size >= this.MAX_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * RAG Cache Manager
 * Caches retrieval results to speed up repeated queries
 */
export class RAGCache {
  private cache: InMemoryCache;
  private enabled: boolean;
  private hitCount = 0;
  private missCount = 0;

  constructor(ttlSeconds: number = 300) {
    this.cache = new InMemoryCache(ttlSeconds);
    this.enabled = true;
    
    // TODO: In production, replace with Upstash Redis
    // this.redis = new Redis(process.env.UPSTASH_REDIS_URL);
  }

  /**
   * Generate cache key from query + context + retrieval parameters
   * CRITICAL: Include all retrieval parameters to prevent cross-query contamination
   */
  private getCacheKey(
    query: string,
    organizationId: string,
    datasetId?: string | string[],
    options?: Record<string, any>
  ): string {
    const datasetKey = Array.isArray(datasetId) 
      ? datasetId.sort().join(',') 
      : datasetId || 'all';
    
    // Include all retrieval parameters in cache key
    const optionsKey = options 
      ? JSON.stringify(options, Object.keys(options).sort()) // Sort keys for consistency
      : '';

    // Include query hash to ensure different queries get different cache entries
    const queryHash = createHash('sha256').update(query).digest('hex').substring(0, 8);
    
    // Include retrieval config (top_k, minScore, etc.) in key
    const retrievalConfig = options?.topK || options?.k || 10;
    const minScore = options?.minScore || 0.08;
    
    const keyString = `${organizationId}:${datasetKey}:${queryHash}:${retrievalConfig}:${minScore}:${optionsKey}`;
    
    // Hash to keep key size reasonable
    return `rag:${createHash('sha256').update(keyString).digest('hex').substring(0, 16)}`;
  }

  /**
   * Get cached retrieval results
   */
  async get(
    query: string,
    organizationId: string,
    datasetId?: string | string[],
    options?: Record<string, any>
  ): Promise<CacheResult> {
    if (!this.enabled) {
      return { hit: false };
    }

    const key = this.getCacheKey(query, organizationId, datasetId, options);
    const result = this.cache.get(key);

    if (result.hit) {
      this.hitCount++;
      console.log(`💾 Cache HIT for query: "${query.substring(0, 50)}..." (age: ${result.age}s)`);
    } else {
      this.missCount++;
      console.log(`❌ Cache MISS for query: "${query.substring(0, 50)}..."`);
    }

    return result;
  }

  /**
   * Store retrieval results in cache
   */
  async set(
    query: string,
    organizationId: string,
    data: any,
    datasetId?: string | string[],
    options?: Record<string, any>
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const key = this.getCacheKey(query, organizationId, datasetId, options);
    this.cache.set(key, data);
    
    console.log(`✅ Cached results for query: "${query.substring(0, 50)}..."`);
  }

  /**
   * Invalidate cache for a dataset
   * Call this when documents are uploaded/deleted
   */
  async invalidateDataset(datasetId: string): Promise<void> {
    // With in-memory cache, we just clear all
    // With Redis, you'd use key pattern matching
    console.log(`🗑️  Invalidating cache for dataset: ${datasetId}`);
    this.cache.clear();
  }

  /**
   * Invalidate cache for an organization
   */
  async invalidateOrganization(organizationId: string): Promise<void> {
    console.log(`🗑️  Invalidating cache for organization: ${organizationId}`);
    this.cache.clear();
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    console.log('🗑️  Clearing all cache');
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    hitCount: number;
    missCount: number;
    hitRate: number;
    size: number;
  } {
    const total = this.hitCount + this.missCount;
    const hitRate = total > 0 ? (this.hitCount / total) * 100 : 0;

    return {
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: Math.round(hitRate * 100) / 100,
      size: this.cache.size()
    };
  }

  /**
   * Enable/disable caching
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    console.log(`Cache ${enabled ? 'enabled' : 'disabled'}`);
  }
}

/**
 * Singleton instance
 * TTL: 5 minutes (300 seconds)
 */
export const ragCache = new RAGCache(300);

/**
 * Helper function to wrap retrieval with caching
 */
export async function withCache<T>(
  cacheKey: {
    query: string;
    organizationId: string;
    datasetId?: string | string[];
    options?: Record<string, any>;
  },
  retrievalFn: () => Promise<T>
): Promise<T> {
  // Try to get from cache
  const cached = await ragCache.get(
    cacheKey.query,
    cacheKey.organizationId,
    cacheKey.datasetId,
    cacheKey.options
  );

  if (cached.hit) {
    return cached.data as T;
  }

  // Cache miss - execute retrieval
  const result = await retrievalFn();

  // Store in cache
  await ragCache.set(
    cacheKey.query,
    cacheKey.organizationId,
    result,
    cacheKey.datasetId,
    cacheKey.options
  );

  return result;
}

