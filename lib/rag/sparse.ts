/**
 * Sparse Search (BM25) Module
 * 
 * Lightweight BM25 search using wink-bm25-text-search as a fallback
 * until we wire a hosted sparse engine.
 */
import { prisma } from "../prisma";
import BM25 from "wink-bm25-text-search";

// Simple LRU cache for BM25 indexes
interface BM25Cache {
  index: any;
  timestamp: number;
  ttl: number;
}

const bm25Cache = new Map<string, BM25Cache>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export interface BM25SearchResult {
  id: string;
  score: number;
}

export async function bm25Search(
  query: string, 
  opts: { orgId: string; datasetIds?: string[]; topK?: number }
): Promise<BM25SearchResult[]> {
  const { orgId, datasetIds, topK = 30 } = opts;
  
  try {
    // Check cache first
    const cacheKey = `${orgId}:${(datasetIds || []).sort().join(',')}`;
    const cached = bm25Cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      // Use cached index
      const results = cached.index.search(query, topK);
      return results.map((r: any) => ({ id: r.id, score: r.score }));
    }
    
    // Build new index
    const index = await buildBM25Index(orgId, datasetIds);
    
    // Cache the index
    bm25Cache.set(cacheKey, {
      index,
      timestamp: Date.now(),
      ttl: CACHE_TTL
    });
    
    // Search
    const results = index.search(query, topK);
    return results.map((r: any) => ({ id: r.id, score: r.score }));
    
  } catch (error) {
    console.error("BM25 search failed:", error);
    return [];
  }
}

async function buildBM25Index(orgId: string, datasetIds?: string[]): Promise<any> {
  // Load chunks from database
  const whereClause: any = {
    organizationId: orgId
  };
  
  if (datasetIds && datasetIds.length > 0) {
    whereClause.document = {
      datasetId: { in: datasetIds }
    };
  }
  
  const chunks = await prisma.documentChunk.findMany({
    where: whereClause,
    include: {
      document: {
        select: {
          id: true,
          title: true,
          datasetId: true
        }
      }
    },
    take: 10000 // Limit to prevent memory issues
  });
  
  // Documents are now processed directly in the loop below
  
  // Create BM25 index
  const bm25 = BM25();
  
  // Reset to ensure clean slate when (re)building
  bm25.reset();
  
  // Configure the index
  bm25.defineConfig({
    fldWeights: { text: 1 }
  });
  
  // Track seen IDs to prevent duplicates
  const seen = new Set<string>();
  
  // Add documents to index with unique IDs
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    // Generate truly unique ID using chunk ID + index + random
    const baseId = chunk.id || `chunk_${i}`;
    const id = `${baseId}_${i}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (seen.has(id)) {
      console.warn('⚠️  Duplicate BM25 ID detected, skipping:', id);
      continue;
    }
    seen.add(id);

    const text = (chunk.content || "").trim();
    if (!text || text.length < 10) continue; // Skip very short chunks

    try {
      // addDoc requires a document object with text field
      bm25.addDoc({ id, text });
    } catch (error) {
      console.warn('⚠️  BM25 addDoc failed for chunk:', id, error);
      continue;
    }
  }
  
  // Prepare the index
  bm25.consolidate();
  
  return bm25;
}

/**
 * Clear cache for an organization (useful when documents are updated)
 */
export function clearBM25Cache(orgId: string): void {
  const keysToDelete: string[] = [];
  for (const key of bm25Cache.keys()) {
    if (key.startsWith(`${orgId}:`)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => bm25Cache.delete(key));
}

/**
 * Clear all cache (useful for testing or memory management)
 */
export function clearAllBM25Cache(): void {
  bm25Cache.clear();
}
