#!/usr/bin/env ts-node
/**
 * Golden-set test harness for Avenai Copilot
 * 
 * Tests retrieval + generation against a baseline of expected results
 * Reports drift > 0.05 in top1 score or wrong branch
 * 
 * Usage: npm run test:golden
 */

import { retrieveDocuments } from '../lib/chat/retrieval';
import goldenSet from '../tests/golden-set.json';

interface GoldenTest {
  q: string;
  expectedDocs: string[];
  branch: 'confident' | 'partial' | 'out_of_scope';
  minScore?: number;
  maxScore?: number;
  expectsTable?: boolean;
}

interface TestResult {
  query: string;
  passed: boolean;
  actualBranch: string;
  expectedBranch: string;
  topScore: number;
  docsCited: string[];
  expectedDocs: string[];
  drift?: number;
  errors: string[];
}

const HIGH_CONFIDENCE_FLOOR = 0.20;
const PARTIAL_CONFIDENCE_FLOOR = 0.12;
const DRIFT_THRESHOLD = 0.05;

async function runGoldenTests(organizationId: string, datasetId: string): Promise<void> {
  console.log('🧪 Running Golden-Set Tests...\n');
  
  const results: TestResult[] = [];
  
  for (const test of goldenSet as GoldenTest[]) {
    console.log(`Testing: "${test.q}"`);
    
    const errors: string[] = [];
    let passed = true;
    
    try {
      // Run retrieval
      const retrievalResult = await retrieveDocuments(test.q, organizationId, datasetId, {
        k: 12,
        minScore: 0.12,
        maxDocsPerSource: 8,
        maxDistinctDocs: 4
      });
      
      const normalized = retrievalResult.contexts;
      const topScore = normalized.length > 0 ? Math.max(...normalized.map(c => (c as any).score || 0)) : 0;
      
      // Determine actual branch
      let actualBranch: 'confident' | 'partial' | 'out_of_scope';
      if (topScore >= HIGH_CONFIDENCE_FLOOR) {
        actualBranch = 'confident';
      } else if (topScore >= PARTIAL_CONFIDENCE_FLOOR) {
        actualBranch = 'partial';
      } else {
        actualBranch = 'out_of_scope';
      }
      
      // Get cited docs
      const docsCited = Array.from(new Set(normalized.map(c => {
        const title = c.title.toLowerCase();
        if (title.includes('bankid')) return 'BankID';
        if (title.includes('sdk') || title.includes('mobile')) return 'Mobile SDK';
        if (title.includes('g2rs') || title.includes('monitoring')) return 'G2RS';
        if (title.includes('mdmx') || title.includes('g2')) return 'MDMX';
        return c.title;
      })));
      
      // Check branch
      if (actualBranch !== test.branch) {
        errors.push(`Branch mismatch: expected ${test.branch}, got ${actualBranch}`);
        passed = false;
      }
      
      // Check score thresholds
      if (test.minScore && topScore < test.minScore) {
        const drift = test.minScore - topScore;
        if (drift > DRIFT_THRESHOLD) {
          errors.push(`Score too low: ${topScore.toFixed(3)} < ${test.minScore} (drift: ${drift.toFixed(3)})`);
          passed = false;
        }
      }
      
      if (test.maxScore && topScore > test.maxScore) {
        const drift = topScore - test.maxScore;
        if (drift > DRIFT_THRESHOLD) {
          errors.push(`Score too high: ${topScore.toFixed(3)} > ${test.maxScore} (drift: ${drift.toFixed(3)})`);
          passed = false;
        }
      }
      
      // Check expected docs
      if (test.expectedDocs.length > 0) {
        const missingDocs = test.expectedDocs.filter(d => !docsCited.includes(d));
        const extraDocs = docsCited.filter(d => !test.expectedDocs.includes(d));
        
        if (missingDocs.length > 0) {
          errors.push(`Missing expected docs: ${missingDocs.join(', ')}`);
          passed = false;
        }
        
        if (extraDocs.length > 0 && test.branch === 'confident') {
          errors.push(`Extra docs cited: ${extraDocs.join(', ')}`);
          passed = false;
        }
      } else {
        // Expecting no docs (out of scope)
        if (docsCited.length > 0) {
          errors.push(`Expected no docs, but got: ${docsCited.join(', ')}`);
          passed = false;
        }
      }
      
      results.push({
        query: test.q,
        passed,
        actualBranch,
        expectedBranch: test.branch,
        topScore,
        docsCited,
        expectedDocs: test.expectedDocs,
        errors
      });
      
      console.log(passed ? '  ✅ PASS' : '  ❌ FAIL');
      if (!passed) {
        errors.forEach(e => console.log(`     - ${e}`));
      }
      console.log('');
      
    } catch (error: any) {
      console.log('  ❌ ERROR:', error.message);
      results.push({
        query: test.q,
        passed: false,
        actualBranch: 'error',
        expectedBranch: test.branch,
        topScore: 0,
        docsCited: [],
        expectedDocs: test.expectedDocs,
        errors: [error.message]
      });
      console.log('');
    }
  }
  
  // Summary
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  const passRate = (passedCount / totalCount * 100).toFixed(1);
  
  console.log('━'.repeat(60));
  console.log(`\n📊 SUMMARY: ${passedCount}/${totalCount} tests passed (${passRate}%)\n`);
  
  if (passedCount < totalCount) {
    console.log('Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`\n❌ "${r.query}"`);
      r.errors.forEach(e => console.log(`   - ${e}`));
    });
  }
  
  process.exit(passedCount === totalCount ? 0 : 1);
}

// Run tests
const organizationId = process.env.TEST_ORG_ID || 'cmg99u0vn00064zlxfq8qzfyc';
const datasetId = process.env.TEST_DATASET_ID || 'cmgfp1eqd00014spsntkfqx26';

runGoldenTests(organizationId, datasetId).catch(err => {
  console.error('Test harness error:', err);
  process.exit(1);
});



