-- Add Full-Text Search (FTS) support to document_chunks
-- This enables hybrid semantic + keyword retrieval

ALTER TABLE document_chunks
  ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(content,'') || ' ' ||
      coalesce(metadata->>'endpoint','') || ' ' ||
      coalesce(section_path,'')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_chunks_fts ON document_chunks USING GIN (fts);