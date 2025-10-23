# UDoc Pipeline Sanity Tests

## Overview
Quick validation tests for the Universal Document Processing (UDoc) pipeline to ensure all document types and processing paths work correctly.

## Test Categories

### 1. Text PDF (with real text layer)
**Expected Results:**
- `extractor="pdf-text"`
- `hasTextLayer=true`
- `coverage ≥ 80%`
- `ocrUsed=false`
- No warnings

**Test File:** `test-documents/text-pdf.pdf`
**Validation:** PDF with embedded text layer should be processed using text extraction, not OCR.

### 2. Scanned PDF
**Expected Results:**
- `extractor="pdf-ocr"`
- `suspectedScanned=true`
- `ocrUsed=true`
- Warnings present
- OCR fallback triggered

**Test File:** `test-documents/scanned-pdf.pdf`
**Validation:** Image-based PDF should trigger OCR processing with appropriate warnings.

### 3. DOCX
**Expected Results:**
- `extractor="docx"`
- Proper headings preserved (`#`, `##`, etc.)
- Lists formatted correctly
- No base64 junk or binary data
- Clean markdown output

**Test File:** `test-documents/test-document.docx`
**Validation:** Word document should convert to clean markdown with preserved structure.

### 4. TXT
**Expected Results:**
- `extractor="txt"`
- Content preserved exactly
- Direct pass-through
- No processing overhead

**Test File:** `test-documents/test-document.txt`
**Validation:** Plain text should be passed through without modification.

### 5. Markdown
**Expected Results:**
- `extractor="txt"`
- Headings preserved (`# Test Document`)
- Code blocks intact (```javascript)
- Tables preserved
- All markdown syntax maintained

**Test File:** `test-documents/test-document.md`
**Validation:** Markdown should be passed through with all formatting preserved.

### 6. OpenAPI
**Expected Results:**
- `extractor="openapi"`
- Endpoints rendered (`GET`, `POST`, etc.)
- Headings present (`## GET /users`)
- API title included
- Proper markdown structure

**Test File:** `test-documents/test-api.yaml`
**Validation:** OpenAPI spec should be converted to readable markdown documentation.

### 7. Chat Retrieval
**Expected Results:**
- Chunks generated successfully
- Headings preserved in chunks
- Code blocks intact (not split)
- Tables intact (not split)
- No split code fences

**Test Content:** Sample markdown with code blocks and tables
**Validation:** Chunking should preserve document structure and never split code blocks or tables.

## Running the Tests

### Prerequisites
- Node.js installed
- Development server running (`npm run dev`)
- All UDoc pipeline files present

### Quick Test
```bash
# Run all sanity tests
./scripts/run-udoc-tests.sh
```

### Manual Test
```bash
# Run individual test file
node scripts/udoc-sanity-tests.js
```

### Test Environment
```bash
# Set custom test server URL
export TEST_BASE_URL="https://your-server.com"
./scripts/run-udoc-tests.sh
```

## Test Results

### Success Criteria
- All tests pass (100% success rate)
- No processing errors
- Quality metrics meet expectations
- Document structure preserved
- Chunking works correctly

### Failure Indicators
- Extractor mismatch
- Missing quality metrics
- Broken document structure
- Split code blocks or tables
- Processing errors

## Test Files

### Sample Documents
The test suite creates sample documents if they don't exist:

- **TXT**: Simple text document
- **Markdown**: Document with headings, code blocks, and tables
- **OpenAPI**: YAML specification with endpoints

### Custom Test Files
You can add your own test files to the `test-documents/` directory:

- `text-pdf.pdf` - PDF with text layer
- `scanned-pdf.pdf` - Scanned PDF for OCR testing
- `test-document.docx` - Word document for conversion testing

## Test Output

### Console Output
```
🧪 UDoc Pipeline Sanity Tests
==============================

📄 Testing Text PDF...
📋 Text PDF Results:
  ✅ Text PDF - Extractor: pdf-text (expected: pdf-text)
  ✅ Text PDF - Has Text Layer: true (expected: true)
  ✅ Text PDF - Coverage ≥ 80%: 0.95 (expected: ≥ 0.8)
  ✅ Text PDF - No OCR Used: false (expected: false)

📄 Testing Scanned PDF...
📋 Scanned PDF Results:
  ✅ Scanned PDF - Extractor: pdf-ocr (expected: pdf-ocr)
  ✅ Scanned PDF - OCR Used: true (expected: true)
  ✅ Scanned PDF - Suspected Scanned: true (expected: true)
  ✅ Scanned PDF - Has Warnings: Has warnings (expected: Array with items)

...

==================================================
🧪 UDoc Pipeline Sanity Test Report
==================================================
Total Tests: 28
Passed: 28
Failed: 0
Success Rate: 100.0%
==================================================
🎉 All tests passed! UDoc pipeline is working correctly.
```

### Detailed Reports
Test results are saved to `test-results/udoc-sanity-test-[timestamp].json` with:
- Individual test results
- Pass/fail status
- Expected vs actual values
- Timestamps
- Summary statistics

## Troubleshooting

### Common Issues

**1. Development Server Not Running**
```
❌ Error: No server available for testing
```
**Solution:** Start the development server with `npm run dev`

**2. Missing UDoc Files**
```
❌ Error: Missing required UDoc pipeline files
```
**Solution:** Ensure all UDoc pipeline files are present

**3. Test Failures**
```
❌ Some tests failed. Please review the output above.
```
**Solution:** Check the detailed report in `test-results/` directory

### Debug Mode
```bash
# Run with verbose output
DEBUG=1 ./scripts/run-udoc-tests.sh
```

### Individual Test Debugging
```bash
# Test specific document type
node -e "
const tests = require('./scripts/udoc-sanity-tests.js');
const t = new tests();
t.testTextPDF().then(() => console.log('Done'));
"
```

## Integration with CI/CD

### GitHub Actions
```yaml
name: UDoc Sanity Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - run: npm start &
      - run: sleep 10
      - run: ./scripts/run-udoc-tests.sh
```

### Pre-commit Hook
```bash
#!/bin/sh
# .git/hooks/pre-commit
./scripts/run-udoc-tests.sh
```

## Performance Benchmarks

### Expected Processing Times
- **TXT**: < 100ms
- **Markdown**: < 100ms
- **DOCX**: < 500ms
- **OpenAPI**: < 300ms
- **Text PDF**: < 1000ms
- **Scanned PDF**: < 5000ms

### Quality Thresholds
- **Text PDF Coverage**: ≥ 80%
- **OCR Accuracy**: ≥ 60%
- **Chunking Success**: 100%
- **Structure Preservation**: 100%

## Maintenance

### Regular Testing
- Run tests before each deployment
- Test with new document types
- Validate quality metrics
- Check performance benchmarks

### Test Updates
- Add new document types as needed
- Update quality thresholds
- Enhance validation criteria
- Improve error reporting

## Support

For issues with the sanity tests:
1. Check the test results in `test-results/`
2. Review the console output
3. Verify UDoc pipeline files are present
4. Ensure development server is running
5. Check environment variables
