-- Phase 1, Step 1: Add section_path, indexes, and RLS
-- Run this on Neon database

-- 1) Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

-- 2) Add section_path column
ALTER TABLE document_chunks
  ADD COLUMN IF NOT EXISTS section_path text;

-- 3) Add partial indexes for performance
CREATE INDEX IF NOT EXISTS idx_chunks_section 
  ON document_chunks (section_path) 
  WHERE section_path IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chunks_element_type 
  ON document_chunks ((metadata->>'element_type')) 
  WHERE metadata->>'element_type' IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chunks_page 
  ON document_chunks (((metadata->>'page')::int)) 
  WHERE metadata->>'page' IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chunks_content_trgm 
  ON document_chunks USING gin (content gin_trgm_ops);

-- 4) Enable RLS (permissive for MVP, Prisma filters are primary)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- Create permissive policies (safety net only)
DROP POLICY IF EXISTS documents_allow_all ON documents;
CREATE POLICY documents_allow_all ON documents
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS chunks_allow_all ON document_chunks;
CREATE POLICY chunks_allow_all ON document_chunks
  FOR ALL USING (true) WITH CHECK (true);

-- 5) Add comment for future strict RLS implementation
COMMENT ON POLICY chunks_allow_all ON document_chunks IS 
  'Permissive policy for MVP. For strict isolation, replace with: USING ("organizationId" = current_setting(''app.current_org_id'', true))';

