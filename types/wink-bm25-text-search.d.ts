declare module 'wink-bm25-text-search' {
  interface BM25Config {
    fldWeights?: { [key: string]: number };
  }

  interface Document {
    id: string;
    text: string;
  }

  interface SearchResult {
    id: string;
    score: number;
  }

  interface BM25Index {
    reset(): void;
    defineConfig(config: BM25Config): void;
    addDoc(doc: Document): void;
    consolidate(): void;
    search(query: string, topK: number): SearchResult[];
  }

  function BM25(): BM25Index;
  export = BM25;
}
