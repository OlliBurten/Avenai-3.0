-- Setup script for Neon EU Database
-- Run this after creating your Neon EU project
-- Connect via: psql "postgresql://user:pass@ep-xxxxx.eu-central-1.aws.neon.tech/neondb"

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Verify extensions are installed
SELECT 
  extname AS "Extension",
  extversion AS "Version",
  CASE 
    WHEN extname IN ('vector', 'pg_trgm', 'unaccent') THEN '✅ Required'
    ELSE 'ℹ️  Optional'
  END AS "Status"
FROM pg_extension 
WHERE extname IN ('vector', 'pg_trgm', 'unaccent')
ORDER BY extname;

-- 3. Show database info
SELECT 
  current_database() AS "Database",
  current_user AS "User",
  version() AS "PostgreSQL Version",
  inet_server_addr() AS "Server IP",
  inet_server_port() AS "Server Port";

-- Expected output:
-- Extension | Version | Status
-- ----------|---------|-------------
-- pg_trgm   | 1.6     | ✅ Required
-- unaccent  | 1.1     | ✅ Required
-- vector    | 0.5.0   | ✅ Required



