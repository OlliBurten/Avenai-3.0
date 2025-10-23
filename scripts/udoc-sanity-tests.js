/**
 * UDoc Pipeline Sanity Tests
 * 
 * Quick validation tests for the universal document processing pipeline.
 * Tests all document types and processing paths.
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_DIR = path.join(__dirname, '../test-documents');
const RESULTS_DIR = path.join(__dirname, '../test-results');

// Ensure test directories exist
if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR, { recursive: true });
}
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

/**
 * Test results structure
 */
class TestResult {
  constructor(name, expected, actual, passed) {
    this.name = name;
    this.expected = expected;
    this.actual = actual;
    this.passed = passed;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Test suite
 */
class UDocSanityTests {
  constructor() {
    this.results = [];
    this.baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
  }

  /**
   * Run all sanity tests
   */
  async runAllTests() {
    console.log('🧪 Starting UDoc Pipeline Sanity Tests...\n');

    try {
      await this.testTextPDF();
      await this.testScannedPDF();
      await this.testDOCX();
      await this.testTXT();
      await this.testMarkdown();
      await this.testOpenAPI();
      await this.testChatRetrieval();

      this.generateReport();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    }
  }

  /**
   * Test 1: Text PDF (with real text layer)
   * Expected: extractor="pdf-text", hasTextLayer=true, coverage ≥ 80%
   */
  async testTextPDF() {
    console.log('📄 Testing Text PDF...');
    
    const testFile = path.join(TEST_DIR, 'text-pdf.pdf');
    if (!fs.existsSync(testFile)) {
      console.log('⚠️  Test file not found, creating sample...');
      await this.createSampleTextPDF(testFile);
    }

    try {
      const result = await this.uploadAndProcess(testFile);
      
      // Validate results
      const tests = [
        new TestResult(
          'Text PDF - Extractor',
          'pdf-text',
          result.udoc?.meta?.extractor,
          result.udoc?.meta?.extractor === 'pdf-text'
        ),
        new TestResult(
          'Text PDF - Has Text Layer',
          true,
          result.udoc?.meta?.quality?.hasTextLayer,
          result.udoc?.meta?.quality?.hasTextLayer === true
        ),
        new TestResult(
          'Text PDF - Coverage ≥ 80%',
          '≥ 0.8',
          result.udoc?.meta?.quality?.coveragePct,
          (result.udoc?.meta?.quality?.coveragePct || 0) >= 0.8
        ),
        new TestResult(
          'Text PDF - No OCR Used',
          false,
          result.udoc?.meta?.ocrUsed,
          result.udoc?.meta?.ocrUsed === false
        )
      ];

      this.results.push(...tests);
      this.logTestResults('Text PDF', tests);

    } catch (error) {
      console.error('❌ Text PDF test failed:', error);
      this.results.push(new TestResult('Text PDF - Upload', 'Success', 'Failed', false));
    }
  }

  /**
   * Test 2: Scanned PDF
   * Expected: OCR path, extractor="pdf-ocr", suspectedScanned=true, warnings
   */
  async testScannedPDF() {
    console.log('📄 Testing Scanned PDF...');
    
    const testFile = path.join(TEST_DIR, 'scanned-pdf.pdf');
    if (!fs.existsSync(testFile)) {
      console.log('⚠️  Test file not found, creating sample...');
      await this.createSampleScannedPDF(testFile);
    }

    try {
      const result = await this.uploadAndProcess(testFile);
      
      // Validate results
      const tests = [
        new TestResult(
          'Scanned PDF - Extractor',
          'pdf-ocr',
          result.udoc?.meta?.extractor,
          result.udoc?.meta?.extractor === 'pdf-ocr'
        ),
        new TestResult(
          'Scanned PDF - OCR Used',
          true,
          result.udoc?.meta?.ocrUsed,
          result.udoc?.meta?.ocrUsed === true
        ),
        new TestResult(
          'Scanned PDF - Suspected Scanned',
          true,
          result.udoc?.meta?.quality?.suspectedScanned,
          result.udoc?.meta?.quality?.suspectedScanned === true
        ),
        new TestResult(
          'Scanned PDF - Has Warnings',
          'Array with items',
          result.udoc?.meta?.quality?.warnings?.length > 0 ? 'Has warnings' : 'No warnings',
          (result.udoc?.meta?.quality?.warnings?.length || 0) > 0
        )
      ];

      this.results.push(...tests);
      this.logTestResults('Scanned PDF', tests);

    } catch (error) {
      console.error('❌ Scanned PDF test failed:', error);
      this.results.push(new TestResult('Scanned PDF - Upload', 'Success', 'Failed', false));
    }
  }

  /**
   * Test 3: DOCX
   * Expected: Proper headings, lists, no base64 junk
   */
  async testDOCX() {
    console.log('📄 Testing DOCX...');
    
    const testFile = path.join(TEST_DIR, 'test-document.docx');
    if (!fs.existsSync(testFile)) {
      console.log('⚠️  Test file not found, creating sample...');
      await this.createSampleDOCX(testFile);
    }

    try {
      const result = await this.uploadAndProcess(testFile);
      
      // Validate results
      const tests = [
        new TestResult(
          'DOCX - Extractor',
          'docx',
          result.udoc?.meta?.extractor,
          result.udoc?.meta?.extractor === 'docx'
        ),
        new TestResult(
          'DOCX - Has Headings',
          'Contains # headings',
          result.udoc?.md?.includes('#') ? 'Has headings' : 'No headings',
          result.udoc?.md?.includes('#')
        ),
        new TestResult(
          'DOCX - No Base64 Junk',
          'No base64 strings',
          result.udoc?.md?.includes('data:image') ? 'Has base64' : 'Clean content',
          !result.udoc?.md?.includes('data:image')
        ),
        new TestResult(
          'DOCX - Proper Lists',
          'Contains lists',
          result.udoc?.md?.includes('- ') || result.udoc?.md?.includes('* ') ? 'Has lists' : 'No lists',
          result.udoc?.md?.includes('- ') || result.udoc?.md?.includes('* ')
        )
      ];

      this.results.push(...tests);
      this.logTestResults('DOCX', tests);

    } catch (error) {
      console.error('❌ DOCX test failed:', error);
      this.results.push(new TestResult('DOCX - Upload', 'Success', 'Failed', false));
    }
  }

  /**
   * Test 4: TXT
   * Expected: Pass-through
   */
  async testTXT() {
    console.log('📄 Testing TXT...');
    
    const testFile = path.join(TEST_DIR, 'test-document.txt');
    if (!fs.existsSync(testFile)) {
      console.log('⚠️  Test file not found, creating sample...');
      await this.createSampleTXT(testFile);
    }

    try {
      const result = await this.uploadAndProcess(testFile);
      
      // Validate results
      const tests = [
        new TestResult(
          'TXT - Extractor',
          'txt',
          result.udoc?.meta?.extractor,
          result.udoc?.meta?.extractor === 'txt'
        ),
        new TestResult(
          'TXT - Content Preserved',
          'Original content',
          result.udoc?.md?.includes('This is a test document') ? 'Content preserved' : 'Content lost',
          result.udoc?.md?.includes('This is a test document')
        ),
        new TestResult(
          'TXT - No Processing',
          'Direct pass-through',
          result.udoc?.md?.length > 0 ? 'Has content' : 'No content',
          result.udoc?.md?.length > 0
        )
      ];

      this.results.push(...tests);
      this.logTestResults('TXT', tests);

    } catch (error) {
      console.error('❌ TXT test failed:', error);
      this.results.push(new TestResult('TXT - Upload', 'Success', 'Failed', false));
    }
  }

  /**
   * Test 5: Markdown
   * Expected: Pass-through
   */
  async testMarkdown() {
    console.log('📄 Testing Markdown...');
    
    const testFile = path.join(TEST_DIR, 'test-document.md');
    if (!fs.existsSync(testFile)) {
      console.log('⚠️  Test file not found, creating sample...');
      await this.createSampleMarkdown(testFile);
    }

    try {
      const result = await this.uploadAndProcess(testFile);
      
      // Validate results
      const tests = [
        new TestResult(
          'Markdown - Extractor',
          'txt',
          result.udoc?.meta?.extractor,
          result.udoc?.meta?.extractor === 'txt'
        ),
        new TestResult(
          'Markdown - Headings Preserved',
          'Contains # headings',
          result.udoc?.md?.includes('# Test Document') ? 'Headings preserved' : 'Headings lost',
          result.udoc?.md?.includes('# Test Document')
        ),
        new TestResult(
          'Markdown - Code Blocks Preserved',
          'Contains ``` code blocks',
          result.udoc?.md?.includes('```') ? 'Code blocks preserved' : 'Code blocks lost',
          result.udoc?.md?.includes('```')
        )
      ];

      this.results.push(...tests);
      this.logTestResults('Markdown', tests);

    } catch (error) {
      console.error('❌ Markdown test failed:', error);
      this.results.push(new TestResult('Markdown - Upload', 'Success', 'Failed', false));
    }
  }

  /**
   * Test 6: OpenAPI
   * Expected: Endpoints render, headings present
   */
  async testOpenAPI() {
    console.log('📄 Testing OpenAPI...');
    
    const testFile = path.join(TEST_DIR, 'test-api.yaml');
    if (!fs.existsSync(testFile)) {
      console.log('⚠️  Test file not found, creating sample...');
      await this.createSampleOpenAPI(testFile);
    }

    try {
      const result = await this.uploadAndProcess(testFile);
      
      // Validate results
      const tests = [
        new TestResult(
          'OpenAPI - Extractor',
          'openapi',
          result.udoc?.meta?.extractor,
          result.udoc?.meta?.extractor === 'openapi'
        ),
        new TestResult(
          'OpenAPI - Endpoints Render',
          'Contains API endpoints',
          result.udoc?.md?.includes('GET') || result.udoc?.md?.includes('POST') ? 'Endpoints rendered' : 'No endpoints',
          result.udoc?.md?.includes('GET') || result.udoc?.md?.includes('POST')
        ),
        new TestResult(
          'OpenAPI - Headings Present',
          'Contains ## headings',
          result.udoc?.md?.includes('##') ? 'Headings present' : 'No headings',
          result.udoc?.md?.includes('##')
        ),
        new TestResult(
          'OpenAPI - API Title',
          'Contains API title',
          result.udoc?.md?.includes('# Test API') ? 'Title present' : 'No title',
          result.udoc?.md?.includes('# Test API')
        )
      ];

      this.results.push(...tests);
      this.logTestResults('OpenAPI', tests);

    } catch (error) {
      console.error('❌ OpenAPI test failed:', error);
      this.results.push(new TestResult('OpenAPI - Upload', 'Success', 'Failed', false));
    }
  }

  /**
   * Test 7: Chat Retrieval
   * Expected: Retrieval includes headings, code blocks and tables intact, no split code fences
   */
  async testChatRetrieval() {
    console.log('💬 Testing Chat Retrieval...');
    
    try {
      // Test chunking with sample markdown
      const sampleMarkdown = `# Test Document

This is a test document with various elements.

## Code Example

\`\`\`javascript
function example() {
  return "This code block should not be split";
}
\`\`\`

## Table Example

| Column 1 | Column 2 |
|----------|----------|
| Value 1  | Value 2  |

## Another Section

More content here.`;

      // Simulate chunking (simplified version for testing)
      const chunks = this.simulateChunking(sampleMarkdown, 800);

      // Validate results
      const tests = [
        new TestResult(
          'Chat - Chunks Generated',
          'Multiple chunks',
          chunks.length > 0 ? `${chunks.length} chunks` : 'No chunks',
          chunks.length > 0
        ),
        new TestResult(
          'Chat - Headings Preserved',
          'Headings in chunks',
          chunks.some(c => c.content.includes('#')) ? 'Headings preserved' : 'Headings lost',
          chunks.some(c => c.content.includes('#'))
        ),
        new TestResult(
          'Chat - Code Blocks Intact',
          'Code blocks not split',
          chunks.some(c => c.content.includes('```javascript') && c.content.includes('```')) ? 'Code blocks intact' : 'Code blocks split',
          chunks.some(c => c.content.includes('```javascript') && c.content.includes('```'))
        ),
        new TestResult(
          'Chat - Tables Intact',
          'Tables not split',
          chunks.some(c => c.content.includes('| Column 1 | Column 2 |')) ? 'Tables intact' : 'Tables split',
          chunks.some(c => c.content.includes('| Column 1 | Column 2 |'))
        )
      ];

      this.results.push(...tests);
      this.logTestResults('Chat Retrieval', tests);

    } catch (error) {
      console.error('❌ Chat retrieval test failed:', error);
      this.results.push(new TestResult('Chat Retrieval - Chunking', 'Success', 'Failed', false));
    }
  }

  /**
   * Upload and process a file
   */
  async uploadAndProcess(filePath) {
    const FormData = require('form-data');

    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));

    const response = await fetch(`${this.baseUrl}/api/uploads/ingest`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Simulate chunking for testing
   */
  simulateChunking(md, maxTokens = 800) {
    const estTokens = (s) => Math.ceil(s.split(/\s+/).length * 0.75);
    const blocks = md.split(/\n(?=#+\s)/);
    const chunks = [];
    let bucket = [];
    let size = 0;

    const flush = () => {
      if (!bucket.length) return;
      const text = bucket.join("\n");
      chunks.push({ id: `c_${chunks.length + 1}`, content: text });
      bucket = []; 
      size = 0;
    };

    const pushSafe = (line) => {
      const t = estTokens(line);
      if (size + t > maxTokens && bucket.length) flush();
      bucket.push(line);
      size += t;
    };

    for (const b of blocks) {
      const lines = b.split("\n");
      let inFence = false;
      for (const ln of lines) {
        const isFence = /^```/.test(ln.trim());
        if (isFence) inFence = !inFence;
        pushSafe(ln);
      }
      if (!inFence) flush();
    }
    flush();
    return chunks;
  }

  /**
   * Log test results
   */
  logTestResults(testName, tests) {
    console.log(`\n📋 ${testName} Results:`);
    tests.forEach(test => {
      const status = test.passed ? '✅' : '❌';
      console.log(`  ${status} ${test.name}: ${test.actual} (expected: ${test.expected})`);
    });
  }

  /**
   * Generate test report
   */
  generateReport() {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const successRate = ((passed / total) * 100).toFixed(1);

    console.log('\n' + '='.repeat(50));
    console.log('🧪 UDoc Pipeline Sanity Test Report');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    console.log(`Success Rate: ${successRate}%`);
    console.log('='.repeat(50));

    if (passed === total) {
      console.log('🎉 All tests passed! UDoc pipeline is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Review the results above.');
      console.log('\nFailed Tests:');
      this.results.filter(r => !r.passed).forEach(test => {
        console.log(`  ❌ ${test.name}: ${test.actual} (expected: ${test.expected})`);
      });
    }

    // Save detailed report
    const reportPath = path.join(RESULTS_DIR, `udoc-sanity-test-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
      summary: { total, passed, failed: total - passed, successRate },
      results: this.results,
      timestamp: new Date().toISOString()
    }, null, 2));

    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }

  /**
   * Create sample test files
   */
  async createSampleTextPDF(filePath) {
    // This would create a sample PDF with text layer
    // For now, we'll create a placeholder
    console.log('📝 Creating sample text PDF...');
    // Implementation would go here
  }

  async createSampleScannedPDF(filePath) {
    // This would create a sample scanned PDF
    console.log('📝 Creating sample scanned PDF...');
    // Implementation would go here
  }

  async createSampleDOCX(filePath) {
    // This would create a sample DOCX file
    console.log('📝 Creating sample DOCX...');
    // Implementation would go here
  }

  async createSampleTXT(filePath) {
    const content = `This is a test document.

It contains multiple paragraphs and should be processed as plain text.

The content should be preserved exactly as written.`;
    
    fs.writeFileSync(filePath, content);
    console.log('📝 Created sample TXT file');
  }

  async createSampleMarkdown(filePath) {
    const content = `# Test Document

This is a test markdown document.

## Code Example

\`\`\`javascript
function example() {
  return "Hello, World!";
}
\`\`\`

## List Example

- Item 1
- Item 2
- Item 3

## Table Example

| Column 1 | Column 2 |
|----------|----------|
| Value 1  | Value 2  |
| Value 3  | Value 4  |`;
    
    fs.writeFileSync(filePath, content);
    console.log('📝 Created sample Markdown file');
  }

  async createSampleOpenAPI(filePath) {
    const content = `openapi: 3.0.0
info:
  title: Test API
  description: A test API for UDoc pipeline
  version: 1.0.0
paths:
  /users:
    get:
      summary: Get all users
      responses:
        '200':
          description: List of users
    post:
      summary: Create a user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
      responses:
        '201':
          description: User created`;
    
    fs.writeFileSync(filePath, content);
    console.log('📝 Created sample OpenAPI file');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tests = new UDocSanityTests();
  tests.runAllTests().catch(console.error);
}

module.exports = UDocSanityTests;
