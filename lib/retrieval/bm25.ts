/**
 * BM25 (Best Matching 25) - Keyword-based ranking algorithm
 * Used for exact term matching alongside semantic vector search
 */

export interface BM25Document {
  id: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface BM25Score {
  id: string;
  score: number;
  matches: string[]; // Which terms matched
}

/**
 * Simple BM25 implementation for hybrid retrieval
 * Parameters:
 * - k1: term frequency saturation (default: 1.5)
 * - b: length normalization (default: 0.75)
 */
export class BM25Ranker {
  private k1: number;
  private b: number;
  private documents: BM25Document[];
  private avgDocLength: number;
  private idf: Map<string, number>; // Inverse document frequency
  private docTermFreqs: Map<string, Map<string, number>>; // Document -> Term -> Frequency

  constructor(documents: BM25Document[], k1: number = 1.5, b: number = 0.75) {
    this.k1 = k1;
    this.b = b;
    this.documents = documents;
    this.idf = new Map();
    this.docTermFreqs = new Map();
    
    // Calculate average document length
    const totalLength = documents.reduce((sum, doc) => sum + this.tokenize(doc.content).length, 0);
    this.avgDocLength = documents.length > 0 ? totalLength / documents.length : 0;
    
    // Build index
    this.buildIndex();
  }

  /**
   * Tokenize text into terms (lowercased, alphanumeric only)
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2); // Remove very short terms
  }

  /**
   * Build BM25 index (IDF and term frequencies)
   */
  private buildIndex(): void {
    const docFreq = new Map<string, number>(); // How many docs contain each term
    
    // Calculate term frequencies and document frequencies
    for (const doc of this.documents) {
      const terms = this.tokenize(doc.content);
      const termFreq = new Map<string, number>();
      const uniqueTerms = new Set<string>();
      
      for (const term of terms) {
        termFreq.set(term, (termFreq.get(term) || 0) + 1);
        uniqueTerms.add(term);
      }
      
      this.docTermFreqs.set(doc.id, termFreq);
      
      // Count document frequency
      for (const term of uniqueTerms) {
        docFreq.set(term, (docFreq.get(term) || 0) + 1);
      }
    }
    
    // Calculate IDF for each term
    const N = this.documents.length;
    for (const [term, df] of docFreq) {
      // IDF = log((N - df + 0.5) / (df + 0.5) + 1)
      this.idf.set(term, Math.log((N - df + 0.5) / (df + 0.5) + 1));
    }
  }

  /**
   * Score a single document for a query
   */
  private scoreDocument(docId: string, queryTerms: string[]): { score: number; matches: string[] } {
    const doc = this.documents.find(d => d.id === docId);
    if (!doc) return { score: 0, matches: [] };
    
    const docLength = this.tokenize(doc.content).length;
    const termFreqs = this.docTermFreqs.get(docId) || new Map();
    
    let score = 0;
    const matches: string[] = [];
    
    for (const term of queryTerms) {
      const tf = termFreqs.get(term) || 0;
      if (tf === 0) continue;
      
      matches.push(term);
      const idf = this.idf.get(term) || 0;
      
      // BM25 formula: IDF * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLength / avgDocLength)))
      const numerator = tf * (this.k1 + 1);
      const denominator = tf + this.k1 * (1 - this.b + this.b * (docLength / this.avgDocLength));
      
      score += idf * (numerator / denominator);
    }
    
    return { score, matches };
  }

  /**
   * Rank all documents by relevance to the query
   */
  public rank(query: string, topK: number = 10): BM25Score[] {
    const queryTerms = this.tokenize(query);
    
    const scores: BM25Score[] = [];
    for (const doc of this.documents) {
      const { score, matches } = this.scoreDocument(doc.id, queryTerms);
      if (score > 0) {
        scores.push({ id: doc.id, score, matches });
      }
    }
    
    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);
    
    return scores.slice(0, topK);
  }

  /**
   * Get top-k documents with scores
   */
  public search(query: string, topK: number = 10): Array<BM25Document & { score: number; matches: string[] }> {
    const rankings = this.rank(query, topK);
    
    return rankings.map(r => {
      const doc = this.documents.find(d => d.id === r.id)!;
      return {
        ...doc,
        score: r.score,
        matches: r.matches
      };
    });
  }
}

/**
 * Fuse BM25 and vector search results using Reciprocal Rank Fusion (RRF)
 * RRF score = sum(1 / (k + rank_i)) for each ranker i
 */
export function fuseRankings<T extends { id: string }>(
  vectorResults: Array<T & { score: number }>,
  bm25Results: Array<T & { score: number }>,
  options: {
    vectorWeight?: number;
    bm25Weight?: number;
    k?: number; // RRF constant (default: 60)
  } = {}
): Array<T & { fusedScore: number; vectorScore: number; bm25Score: number }> {
  const { vectorWeight = 0.7, bm25Weight = 0.3, k = 60 } = options;
  
  // Build rank maps
  const vectorRanks = new Map<string, number>();
  const bm25Ranks = new Map<string, number>();
  
  vectorResults.forEach((r, idx) => vectorRanks.set(r.id, idx + 1));
  bm25Results.forEach((r, idx) => bm25Ranks.set(r.id, idx + 1));
  
  // Get all unique IDs
  const allIds = new Set([
    ...vectorResults.map(r => r.id),
    ...bm25Results.map(r => r.id)
  ]);
  
  // Calculate fused scores
  const fused: Array<T & { fusedScore: number; vectorScore: number; bm25Score: number }> = [];
  
  for (const id of allIds) {
    const vectorRank = vectorRanks.get(id) || Infinity;
    const bm25Rank = bm25Ranks.get(id) || Infinity;
    
    // RRF score
    const vectorRRF = vectorRank === Infinity ? 0 : 1 / (k + vectorRank);
    const bm25RRF = bm25Rank === Infinity ? 0 : 1 / (k + bm25Rank);
    
    const fusedScore = vectorWeight * vectorRRF + bm25Weight * bm25RRF;
    
    // Get original document
    const doc = vectorResults.find(r => r.id === id) || bm25Results.find(r => r.id === id);
    if (!doc) continue;
    
    const vectorScore = vectorResults.find(r => r.id === id)?.score || 0;
    const bm25Score = bm25Results.find(r => r.id === id)?.score || 0;
    
    fused.push({
      ...doc,
      fusedScore,
      vectorScore,
      bm25Score
    });
  }
  
  // Sort by fused score descending
  fused.sort((a, b) => b.fusedScore - a.fusedScore);
  
  return fused;
}

