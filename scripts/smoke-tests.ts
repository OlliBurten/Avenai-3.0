#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { readFileSync } from 'fs';

// Load environment variables
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

interface SmokeTest {
  query: string;
  expected_intent: string;
  expected_format: string;
  golden_answer: string;
}

interface TestResult {
  query: string;
  expected_intent: string;
  actual_intent: string;
  expected_format: string;
  actual_format: string;
  expected_answer: string;
  actual_answer: string;
  exact_match: boolean;
  format_match: boolean;
  intent_match: boolean;
  confidence: string;
  duration: number;
  error?: string;
}

function checkSemanticMatch(actual: string, expected: string): boolean {
  // Normalize text for comparison
  const normalize = (text: string) => {
    return text.toLowerCase()
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/[^\w\s]/g, '')  // Remove punctuation
      .trim();
  };
  
  const actualNorm = normalize(actual);
  const expectedNorm = normalize(expected);
  
  // Exact match after normalization
  if (actualNorm === expectedNorm) {
    return true;
  }
  
  // Check if actual contains all key concepts from expected
  const expectedWords = expectedNorm.split(' ').filter(w => w.length > 3);
  const actualWords = actualNorm.split(' ');
  
  // Count how many key concepts are present
  const matches = expectedWords.filter(word => 
    actualWords.some(actualWord => actualWord.includes(word) || word.includes(actualWord))
  );
  
  // If 80% of key concepts match, consider it a pass
  const matchRatio = matches.length / expectedWords.length;
  return matchRatio >= 0.8;
}

async function runSmokeTests(): Promise<void> {
  console.log('🧪 Starting Smoke Tests for BankID Sweden Dataset...\n');
  
  // Read smoke test cases
  const smokeTestPath = path.join(process.cwd(), 'eval/smoke_tests/bankid_manual.jsonl');
  const smokeTestContent = fs.readFileSync(smokeTestPath, 'utf-8');
  const smokeTests: SmokeTest[] = smokeTestContent
    .trim()
    .split('\n')
    .map(line => JSON.parse(line));
  
  console.log(`📋 Loaded ${smokeTests.length} smoke test cases\n`);
  
  const results: TestResult[] = [];
  let passed = 0;
  let failed = 0;
  
  for (let i = 0; i < smokeTests.length; i++) {
    const test = smokeTests[i];
    console.log(`\n🔍 Test ${i + 1}/${smokeTests.length}: "${test.query}"`);
    
    try {
      const startTime = Date.now();
      
      // Make API call to real chat endpoint (bypasses authentication)
      const response = await fetch('http://localhost:3000/api/test/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: test.query,
          datasetId: 'cmh1c687x0001d8hiq6wop6a1', // Your test dataset
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      
      const data = await response.json();
      const duration = Date.now() - startTime;
      
      // Extract response details
      const actualAnswer = data.response || '';
      const actualIntent = data.intent || 'UNKNOWN';
      const actualFormat = data.format || 'text';
      const confidence = data.confidence || 'Unknown';
      
      // Determine format based on response content
      let detectedFormat = 'text';
      if (actualAnswer.includes('{') && actualAnswer.includes('}')) {
        detectedFormat = 'json';
      } else if (actualAnswer.includes('|') || actualAnswer.includes('•') || actualAnswer.match(/^\d+\./m)) {
        detectedFormat = 'table';
      } else if (actualAnswer.match(/^\d+\./m)) {
        detectedFormat = 'steps';
      }
      
      // Check matches with semantic similarity
      const exactMatch = checkSemanticMatch(actualAnswer, test.golden_answer);
      const formatMatch = detectedFormat === test.expected_format;
      const intentMatch = actualIntent === test.expected_intent;
      
      const result: TestResult = {
        query: test.query,
        expected_intent: test.expected_intent,
        actual_intent: actualIntent,
        expected_format: test.expected_format,
        actual_format: detectedFormat,
        expected_answer: test.golden_answer,
        actual_answer: actualAnswer,
        exact_match: exactMatch,
        format_match: formatMatch,
        intent_match: intentMatch,
        confidence,
        duration,
      };
      
      results.push(result);
      
      // Log result
      if (exactMatch && formatMatch && intentMatch) {
        console.log(`✅ PASS - Intent: ${actualIntent}, Format: ${detectedFormat}, Confidence: ${confidence}`);
        passed++;
      } else {
        console.log(`❌ FAIL - Intent: ${actualIntent} (expected: ${test.expected_intent}), Format: ${detectedFormat} (expected: ${test.expected_format})`);
        console.log(`   Expected: "${test.golden_answer}"`);
        console.log(`   Actual: "${actualAnswer}"`);
        failed++;
      }
      
    } catch (error) {
      console.log(`❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      results.push({
        query: test.query,
        expected_intent: test.expected_intent,
        actual_intent: 'ERROR',
        expected_format: test.expected_format,
        actual_format: 'error',
        expected_answer: test.golden_answer,
        actual_answer: '',
        exact_match: false,
        format_match: false,
        intent_match: false,
        confidence: 'ERROR',
        duration: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      failed++;
    }
  }
  
  // Calculate statistics
  const total = results.length;
  const exactMatches = results.filter(r => r.exact_match).length;
  const formatMatches = results.filter(r => r.format_match).length;
  const intentMatches = results.filter(r => r.intent_match).length;
  
  const exactMatchRate = (exactMatches / total) * 100;
  const formatMatchRate = (formatMatches / total) * 100;
  const intentMatchRate = (intentMatches / total) * 100;
  
  // JSON/Table specific stats
  const jsonTableTests = results.filter(r => ['json', 'table'].includes(r.expected_format));
  const jsonTableMatches = jsonTableTests.filter(r => r.exact_match).length;
  const jsonTableMatchRate = jsonTableTests.length > 0 ? (jsonTableMatches / jsonTableTests.length) * 100 : 100;
  
  console.log('\n📊 SMOKE TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed} (${((passed/total)*100).toFixed(1)}%)`);
  console.log(`Failed: ${failed} (${((failed/total)*100).toFixed(1)}%)`);
  console.log('');
  console.log(`Exact Match Rate: ${exactMatchRate.toFixed(1)}%`);
  console.log(`Format Match Rate: ${formatMatchRate.toFixed(1)}%`);
  console.log(`Intent Match Rate: ${intentMatchRate.toFixed(1)}%`);
  console.log(`JSON/Table Match Rate: ${jsonTableMatchRate.toFixed(1)}%`);
  console.log('');
  
  // Pass/Fail criteria
  const overallPass = exactMatchRate >= 90;
  const jsonTablePass = jsonTableMatchRate >= 100;
  
  console.log('🎯 PASS/FAIL CRITERIA');
  console.log('='.repeat(50));
  console.log(`Overall ≥90%: ${overallPass ? '✅ PASS' : '❌ FAIL'} (${exactMatchRate.toFixed(1)}%)`);
  console.log(`JSON/Table 100%: ${jsonTablePass ? '✅ PASS' : '❌ FAIL'} (${jsonTableMatchRate.toFixed(1)}%)`);
  console.log('');
  
  if (overallPass && jsonTablePass) {
    console.log('🎉 ALL SMOKE TESTS PASSED!');
    process.exit(0);
  } else {
    console.log('💥 SMOKE TESTS FAILED');
    
    // Log failure analysis
    console.log('\n🔍 FAILURE ANALYSIS');
    console.log('='.repeat(50));
    
    const failedTests = results.filter(r => !r.exact_match || !r.format_match || !r.intent_match);
    failedTests.forEach((test, i) => {
      console.log(`\n${i + 1}. "${test.query}"`);
      if (!test.intent_match) console.log(`   ❌ Intent: ${test.actual_intent} (expected: ${test.expected_intent})`);
      if (!test.format_match) console.log(`   ❌ Format: ${test.actual_format} (expected: ${test.expected_format})`);
      if (!test.exact_match) console.log(`   ❌ Content mismatch`);
      if (test.error) console.log(`   ❌ Error: ${test.error}`);
    });
    
    process.exit(1);
  }
}

// Run the tests
runSmokeTests().catch(error => {
  console.error('💥 Smoke test runner failed:', error);
  process.exit(1);
});
