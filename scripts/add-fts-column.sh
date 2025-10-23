#!/bin/bash

# Add Full-Text Search column to document_chunks table
# This enables hybrid semantic + keyword retrieval

set -e

echo "🔧 Adding FTS column to document_chunks table..."

# Source environment variables
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | grep -v '^$' | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set. Please set it in .env.local"
  exit 1
fi

echo "📊 Database: ${DATABASE_URL%%\?*}" # Show DB URL without query params

# Run the migration
psql "$DATABASE_URL" -f prisma/migrations/add_fts_column.sql

echo "✅ FTS column added successfully!"
echo ""
echo "📝 Next steps:"
echo "1. The 'fts' column is now populated automatically for all new chunks"
echo "2. For existing chunks, the column will be populated on next update"
echo "3. The GIN index 'idx_chunks_fts' enables fast text search"
echo ""
echo "🧪 Test FTS query:"
echo "psql \"\$DATABASE_URL\" -c \"SELECT id, ts_rank_cd(fts, plainto_tsquery('simple', 'authentication')) as rank FROM document_chunks WHERE fts @@ plainto_tsquery('simple', 'authentication') ORDER BY rank DESC LIMIT 5;\""

