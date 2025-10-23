-- Add indexes for metadata-based queries
-- Note: section_path and metadata columns already exist in schema

-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add trigram index for content fuzzy search
CREATE INDEX IF NOT EXISTS idx_chunks_trgm
  ON document_chunks USING gin (content gin_trgm_ops);

-- Add index for element_type filtering (stored in metadata JSONB)
CREATE INDEX IF NOT EXISTS idx_chunks_element
  ON document_chunks ((metadata->>'element_type'));

-- Ensure section_path index exists
CREATE INDEX IF NOT EXISTS idx_chunks_section 
  ON document_chunks (section_path);

-- Add composite index for organization + element_type queries
CREATE INDEX IF NOT EXISTS idx_chunks_org_element
  ON document_chunks ("organizationId", ((metadata->>'element_type')));

-- Enable Row Level Security on documents and document_chunks
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS docs_by_org ON documents;
DROP POLICY IF EXISTS chunks_by_org ON document_chunks;

-- Create RLS policy for documents
CREATE POLICY docs_by_org ON documents
  FOR ALL
  USING ("organizationId" = current_setting('app.current_org', true)::text);

-- Create RLS policy for document_chunks
CREATE POLICY chunks_by_org ON document_chunks
  FOR ALL
  USING ("organizationId" = current_setting('app.current_org', true)::text);

-- Verify indexes were created
DO $$
BEGIN
  RAISE NOTICE 'Migration complete: Added indexes and RLS policies for document_chunks';
END $$;

