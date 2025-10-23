#!/bin/bash

# UDoc Pipeline Sanity Tests Runner
# Quick validation tests for the universal document processing pipeline

set -e

echo "🧪 UDoc Pipeline Sanity Tests"
echo "=============================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if the UDoc pipeline files exist
echo "🔍 Checking UDoc pipeline files..."

required_files=(
    "lib/udoc.ts"
    "lib/pipeline.ts"
    "lib/processors/pdf.ts"
    "lib/processors/docx.ts"
    "lib/processors/ocr.ts"
    "lib/processors/openapi.ts"
    "lib/rag/chunking.ts"
    "lib/rag/embeddings.ts"
    "app/api/uploads/ingest/route.ts"
    "components/UploadQuality.tsx"
)

missing_files=()
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -ne 0 ]; then
    echo "❌ Error: Missing required UDoc pipeline files:"
    for file in "${missing_files[@]}"; do
        echo "   - $file"
    done
    exit 1
fi

echo "✅ All UDoc pipeline files found"

# Check if the development server is running
echo "🔍 Checking if development server is running..."

if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Development server is running on http://localhost:3000"
    TEST_BASE_URL="http://localhost:3000"
else
    echo "⚠️  Development server not running on localhost:3000"
    echo "   Please start the development server with: npm run dev"
    echo "   Or set TEST_BASE_URL environment variable to your server URL"
    
    if [ -n "$TEST_BASE_URL" ]; then
        echo "✅ Using TEST_BASE_URL: $TEST_BASE_URL"
    else
        echo "❌ Error: No server available for testing"
        exit 1
    fi
fi

# Create test directories
echo "📁 Creating test directories..."
mkdir -p test-documents
mkdir -p test-results

# Run the sanity tests
echo "🚀 Running UDoc pipeline sanity tests..."
echo ""

# Set environment variables
export TEST_BASE_URL="${TEST_BASE_URL:-http://localhost:3000}"

# Run the tests
node scripts/udoc-sanity-tests.js

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 All tests completed successfully!"
    echo ""
    echo "📋 Test Summary:"
    echo "   - Text PDF: extractor='pdf-text', hasTextLayer=true, coverage ≥ 80%"
    echo "   - Scanned PDF: OCR path, extractor='pdf-ocr', suspectedScanned=true"
    echo "   - DOCX: proper headings, lists, no base64 junk"
    echo "   - TXT/MD: pass-through"
    echo "   - OpenAPI: endpoints render, headings present"
    echo "   - Chat: retrieval includes headings, code blocks intact"
    echo ""
    echo "✅ UDoc pipeline is ready for production!"
else
    echo ""
    echo "❌ Some tests failed. Please review the output above."
    echo ""
    echo "🔧 Troubleshooting:"
    echo "   1. Ensure all UDoc pipeline files are present"
    echo "   2. Check that the development server is running"
    echo "   3. Verify environment variables are set correctly"
    echo "   4. Check the test-results/ directory for detailed reports"
    echo ""
    exit 1
fi
