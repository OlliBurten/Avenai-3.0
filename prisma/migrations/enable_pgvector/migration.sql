-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable full-text search extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Add embedding column to document_chunks
ALTER TABLE document_chunks 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create vector similarity index (ivfflat for faster cosine similarity)
-- lists parameter: sqrt(row_count) is a good starting point
-- For 100k chunks: lists=316, for 1M chunks: lists=1000
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create trigram index for fuzzy text search
CREATE INDEX IF NOT EXISTS document_chunks_content_trgm_idx 
ON document_chunks 
USING gin (content gin_trgm_ops);

-- Create full-text search column and index
ALTER TABLE document_chunks 
ADD COLUMN IF NOT EXISTS content_tsv tsvector 
GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX IF NOT EXISTS document_chunks_content_tsv_idx 
ON document_chunks 
USING gin (content_tsv);

-- Create composite index for organization + dataset filtering
CREATE INDEX IF NOT EXISTS document_chunks_org_dataset_idx 
ON document_chunks (organization_id, document_id);

-- Add audit/telemetry table for query logging
CREATE TABLE IF NOT EXISTS retrieval_logs (
  id BIGSERIAL PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dataset_id TEXT,
  query_text TEXT NOT NULL,
  query_embedding vector(1536),
  retrieval_method TEXT, -- 'semantic', 'keyword', 'hybrid'
  results_count INT,
  top_result_score FLOAT,
  latency_ms INT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS retrieval_logs_org_created_idx 
ON retrieval_logs (organization_id, created_at DESC);

-- Create materialized view for hybrid search scoring (optional, for performance)
-- This can be refreshed periodically
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_document_chunks_hybrid AS
SELECT 
  id,
  document_id,
  organization_id,
  content,
  embedding,
  content_tsv,
  chunk_index,
  created_at
FROM document_chunks
WHERE embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS mv_chunks_embedding_idx 
ON mv_document_chunks_hybrid 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS mv_chunks_tsv_idx 
ON mv_document_chunks_hybrid 
USING gin (content_tsv);

-- Function to refresh materialized view (call periodically or on demand)
CREATE OR REPLACE FUNCTION refresh_hybrid_search_view()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_document_chunks_hybrid;
END;
$$ LANGUAGE plpgsql;

-- Comment on key tables
COMMENT ON COLUMN document_chunks.embedding IS 'OpenAI text-embedding-3-large vector (1536 dimensions)';
COMMENT ON INDEX document_chunks_embedding_idx IS 'IVFFlat index for fast cosine similarity search on embeddings';
COMMENT ON TABLE retrieval_logs IS 'Audit log for RAG retrieval queries and performance metrics';

